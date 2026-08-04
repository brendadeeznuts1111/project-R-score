#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/bundler/executables#code-signing-on-macos — --verify
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Trigger Cloudflare Pages deploy, optionally wait for completion, then smoke-verify.
 *
 *   bun tools/cloudflare-pages-deploy.ts
 *   bun tools/cloudflare-pages-deploy.ts --wait
 *   bun tools/cloudflare-pages-deploy.ts --wait --verify
 *
 * @see docs/harness/tenants/cloudflare-pages.md
 * @see scripts/cloudflare-pages-deploy.sh — thin wrapper
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { CLOUDFLARE_DEFAULTS } from '../config/r2-env.ts';
import { PROOF_TAXONOMY_CONTRACT_COUNT } from '../lib/verification/proof-taxonomy.ts';

/** Load Reasonix global env when token not already set (matches setup script). */
async function loadReasonixEnv(): Promise<void> {
  if (Bun.env.CLOUDFLARE_API_TOKEN?.trim()) return;
  const path = `${Bun.env.HOME}/.reasonix/.env`;
  try {
    const text = await Bun.file(path).text();
    for (const line of text.split('\n')) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
      if (m && !Bun.env[m[1]]) Bun.env[m[1]] = m[2];
    }
  } catch {
    /* optional */
  }
}

const ACCOUNT_ID = Bun.env.CLOUDFLARE_ACCOUNT_ID?.trim() || CLOUDFLARE_DEFAULTS.accountId;
const PROJECT = Bun.env.PAGES_PROJECT?.trim() || CLOUDFLARE_DEFAULTS.pages.project;
const BRANCH = Bun.argv.find((a, i) => Bun.argv[i - 1] === '--branch') ?? 'main';
const WAIT = Bun.argv.includes('--wait') || Bun.argv.includes('--verify');
const VERIFY = Bun.argv.includes('--verify');
const VERIFY_TAXONOMY = Bun.argv.includes('--taxonomy') || Bun.env.PAGES_VERIFY_TAXONOMY === '1';
const POLL_MS = 15_000;
const MAX_POLLS = 12;

export type CfResponse<T> = {
  success: boolean;
  result?: T;
  errors?: Array<{ message: string }>;
};

function responseExcerpt(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '(empty body)';
  return compact.length <= 160 ? compact : `${compact.slice(0, 157)}…`;
}

/** Decode the Cloudflare envelope without assuming every HTTP response is JSON object-shaped. */
export function parseCloudflareApiResponse<T>(
  text: string,
  status: number,
  requestLabel: string
): CfResponse<T> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      `Cloudflare API ${requestLabel} returned non-JSON (HTTP ${status}): ${responseExcerpt(text)}`
    );
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      `Cloudflare API ${requestLabel} returned an invalid envelope (HTTP ${status}): ${responseExcerpt(text)}`
    );
  }
  const envelope = value as Partial<CfResponse<T>>;
  if (typeof envelope.success !== 'boolean') {
    throw new Error(
      `Cloudflare API ${requestLabel} omitted success (HTTP ${status}): ${responseExcerpt(text)}`
    );
  }
  return envelope as CfResponse<T>;
}

type DeployStage = { name: string; status: string };
type Deployment = {
  id: string; // brand-ok — Cloudflare Pages deployment UUID
  url?: string;
  latest_stage?: DeployStage;
  stages?: DeployStage[];
  deployment_trigger?: { metadata?: { commit_hash?: string } };
};

async function cf<T>(path: string, init?: RequestInit): Promise<CfResponse<T>> {
  const token = Bun.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) {
    throw new Error('CLOUDFLARE_API_TOKEN not set (~/.reasonix/.env)');
  }
  const method = init?.method ?? 'GET';
  const requestLabel = `${method} ${path}`;
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = parseCloudflareApiResponse<T>(await res.text(), res.status, requestLabel);
  if (!res.ok) {
    const detail = body.errors?.map(error => error.message).join('; ') || 'request failed';
    throw new Error(`Cloudflare API ${requestLabel} HTTP ${res.status}: ${detail}`);
  }
  return body;
}

async function triggerDeploy(): Promise<string> {
  console.log(`🚀 Triggering Pages deploy → ${PROJECT} (${BRANCH})`);
  const body = await cf<Deployment>(
    `/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/deployments`,
    { method: 'POST', body: JSON.stringify({ branch: BRANCH }) }
  );
  if (!body.success || !body.result?.id) {
    throw new Error(body.errors?.map(e => e.message).join('; ') || 'deploy trigger failed');
  }
  console.log(`   deploy id: ${body.result.id}`);
  console.log(`   preview:   ${body.result.url ?? '—'}`);
  return body.result.id;
}

async function fetchDeploy(
  deployId: string // brand-ok — Cloudflare Pages deployment UUID (wire/API)
): Promise<Deployment> {
  const body = await cf<Deployment>(
    `/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/deployments/${deployId}`
  );
  if (!body.success || !body.result) {
    throw new Error(body.errors?.map(e => e.message).join('; ') || 'deploy fetch failed');
  }
  return body.result;
}

async function deployLogTail(
  deployId: string // brand-ok — Cloudflare Pages deployment UUID (wire/API)
): Promise<string[]> {
  const body = await cf<{ data?: Array<{ line?: string }> }>(
    `/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/deployments/${deployId}/history/logs`
  );
  return (body.result?.data ?? []).map(r => r.line).filter((l): l is string => Boolean(l));
}

async function waitForDeploy(
  deployId: string // brand-ok — Cloudflare Pages deployment UUID (wire/API)
): Promise<void> {
  for (let i = 1; i <= MAX_POLLS; i++) {
    const d = await fetchDeploy(deployId);
    const stage = d.latest_stage;
    const label = stage ? `${stage.name}:${stage.status}` : 'unknown';
    console.log(`   [${i}/${MAX_POLLS}] ${label}`);
    if (stage?.status === 'success' && stage.name === 'deploy') {
      console.log('✅ Deploy succeeded');
      console.log(`   https://${CLOUDFLARE_DEFAULTS.pages.subdomain}`);
      return;
    }
    if (stage?.status === 'failure') {
      const tail = (await deployLogTail(deployId)).slice(-15);
      console.error('❌ Deploy failed — log tail:');
      for (const line of tail) console.error(`   ${line}`);
      process.exit(1);
    }
    await Bun.sleep(POLL_MS);
  }
  console.error('❌ Deploy poll timeout — check Cloudflare dashboard');
  process.exit(1);
}

async function runEdgeVerify(taxonomy = false): Promise<void> {
  const base = `https://${CLOUDFLARE_DEFAULTS.pages.subdomain}`;
  console.log(`\n🔍 Pages edge verify → ${base}${taxonomy ? ' (--taxonomy)' : ''}`);
  const args = ['bun', 'tools/verify-pages-edge.ts'];
  if (taxonomy) args.push('--taxonomy');
  const proc = Bun.spawn({
    cmd: args,
    cwd: `${import.meta.dir}/..`,
    env: { ...Bun.env, PAGES_VERIFY_BASE: base },
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await proc.exited) !== 0) process.exit(1);
}

async function runTennisSsotReleaseVerify(): Promise<void> {
  console.log('\n🔍 Tennis SSOT live release parity');
  const proc = Bun.spawn({
    cmd: ['bun', 'tools/verify-tennis-ssot-release.ts', '--live'],
    cwd: `${import.meta.dir}/..`,
    env: { ...Bun.env },
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if ((await proc.exited) !== 0) process.exit(1);
}

async function main() {
  await loadReasonixEnv();
  const deployId = await triggerDeploy();
  if (WAIT) await waitForDeploy(deployId);
  if (VERIFY) {
    await runEdgeVerify(VERIFY_TAXONOMY);
    await runTennisSsotReleaseVerify();
  } else if (!WAIT) {
    console.log('   tip: bun run cloudflare:deploy:wait — poll until live');
    console.log('   tip: bun run cloudflare:deploy:verify — wait + edge smoke');
    console.log(
      `   tip: bun run cloudflare:deploy:verify:taxonomy — full taxonomy edge gate (${PROOF_TAXONOMY_CONTRACT_COUNT} contracts)`
    );
  }
}

if (isModuleEntrypoint(import.meta)) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
