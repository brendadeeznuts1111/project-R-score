#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/bundler/executables#code-signing-on-macos — --verify
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/reference/node/util/parseArgs — parseArgs
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
import { parseArgs } from 'util';

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
const POLL_MS = 15_000;
const MAX_POLLS = 12;

export type PagesDeployArgs = {
  branch: string;
  wait: boolean;
  verify: boolean;
  taxonomy: boolean;
};

/** Parse deploy flags strictly so malformed preview requests never fall back to production. */
export function parsePagesDeployArgs(argv: readonly string[]): PagesDeployArgs {
  const { values, tokens } = parseArgs({
    args: [...argv],
    options: {
      branch: { type: 'string' },
      wait: { type: 'boolean' },
      verify: { type: 'boolean' },
      taxonomy: { type: 'boolean' },
    },
    strict: true,
    allowPositionals: false,
    tokens: true,
  });
  if (tokens.filter(token => token.kind === 'option' && token.name === 'branch').length > 1) {
    throw new Error('--branch may be specified only once');
  }
  const branch = (values.branch ?? CLOUDFLARE_DEFAULTS.pages.productionBranch).trim();
  if (!branch) throw new Error('--branch requires a non-empty branch name');
  const verify = values.verify === true;
  if (verify && branch !== CLOUDFLARE_DEFAULTS.pages.productionBranch) {
    throw new Error('--verify targets the production hostname and cannot verify a preview branch');
  }
  return {
    branch,
    wait: values.wait === true || verify,
    verify,
    taxonomy: values.taxonomy === true || Bun.env.PAGES_VERIFY_TAXONOMY === '1',
  };
}

export type CfResponse<T> = {
  success: boolean;
  result?: T;
  errors?: Array<{ message: string }>;
  /** Synthetic operator signal: Cloudflare accepted the request but public content is unchanged. */
  notModified?: boolean;
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
  if (status === 304 && !text.trim()) {
    return { success: true, notModified: true };
  }
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

/** Apply HTTP status policy after envelope parsing; 304 is a verified no-op, not a failure. */
export function ensureCloudflareHttpSuccess<T>(
  body: CfResponse<T>,
  status: number,
  requestLabel: string
): CfResponse<T> {
  if (body.notModified) return body;
  if (status < 200 || status >= 300) {
    const detail = body.errors?.map(error => error.message).join('; ') || 'request failed';
    throw new Error(`Cloudflare API ${requestLabel} HTTP ${status}: ${detail}`);
  }
  return body;
}

type DeployStage = { name: string; status: string };
export type PagesDeployment = {
  id: string; // brand-ok — Cloudflare Pages deployment UUID
  url?: string;
  environment?: 'preview' | 'production';
  latest_stage?: DeployStage;
  stages?: DeployStage[];
  deployment_trigger?: { metadata?: { branch?: string; commit_hash?: string } };
};

/** Build the Cloudflare request body without manually setting its multipart boundary. */
export function createPagesDeploymentForm(branch: string): FormData {
  const form = new FormData();
  form.set('branch', branch);
  return form;
}

/** Prove Cloudflare accepted the requested branch/environment before treating a deploy as valid. */
export function assertPagesDeploymentTarget(
  deployment: PagesDeployment,
  requestedBranch: string,
  productionBranch = CLOUDFLARE_DEFAULTS.pages.productionBranch
): void {
  const actualBranch = deployment.deployment_trigger?.metadata?.branch;
  if (actualBranch !== requestedBranch) {
    throw new Error(
      `Cloudflare deployed branch ${actualBranch ?? '(missing)'}; expected ${requestedBranch}`
    );
  }
  const expectedEnvironment = requestedBranch === productionBranch ? 'production' : 'preview';
  if (deployment.environment !== expectedEnvironment) {
    throw new Error(
      `Cloudflare deployed environment ${deployment.environment ?? '(missing)'}; expected ${expectedEnvironment}`
    );
  }
}

/** A metadata-free 304 can prove only the pinned production target, never a preview. */
export function assertPagesNotModifiedTarget(
  requestedBranch: string,
  productionBranch = CLOUDFLARE_DEFAULTS.pages.productionBranch
): void {
  if (requestedBranch !== productionBranch) {
    throw new Error('Cloudflare returned 304 without metadata for a preview deployment');
  }
}

async function cf<T>(path: string, init?: RequestInit): Promise<CfResponse<T>> {
  const token = Bun.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) {
    throw new Error('CLOUDFLARE_API_TOKEN not set (~/.reasonix/.env)');
  }
  const method = init?.method ?? 'GET';
  const requestLabel = `${method} ${path}`;
  const headers = new Headers(init?.headers);
  headers.set('authorization', `Bearer ${token}`);
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers,
  });
  const body = parseCloudflareApiResponse<T>(await res.text(), res.status, requestLabel);
  return ensureCloudflareHttpSuccess(body, res.status, requestLabel);
}

async function triggerDeploy(branch: string): Promise<string | null> {
  console.log(`🚀 Triggering Pages deploy → ${PROJECT} (${branch})`);
  const body = await cf<PagesDeployment>(
    `/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/deployments`,
    { method: 'POST', body: createPagesDeploymentForm(branch) }
  );
  if (body.notModified) {
    assertPagesNotModifiedTarget(branch);
    console.log('ℹ️  Pages content unchanged (HTTP 304) — verifying current production');
    return null;
  }
  if (!body.success || !body.result?.id) {
    throw new Error(body.errors?.map(e => e.message).join('; ') || 'deploy trigger failed');
  }
  assertPagesDeploymentTarget(body.result, branch);
  console.log(`   deploy id: ${body.result.id}`);
  console.log(`   preview:   ${body.result.url ?? '—'}`);
  return body.result.id;
}

async function fetchDeploy(
  deployId: string // brand-ok — Cloudflare Pages deployment UUID (wire/API)
): Promise<PagesDeployment> {
  const body = await cf<PagesDeployment>(
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
  deployId: string, // brand-ok — Cloudflare Pages deployment UUID (wire/API)
  branch: string
): Promise<void> {
  for (let i = 1; i <= MAX_POLLS; i++) {
    const d = await fetchDeploy(deployId);
    assertPagesDeploymentTarget(d, branch);
    const stage = d.latest_stage;
    const label = stage ? `${stage.name}:${stage.status}` : 'unknown';
    console.log(`   [${i}/${MAX_POLLS}] ${label}`);
    if (stage?.status === 'success' && stage.name === 'deploy') {
      console.log('✅ Deploy succeeded');
      console.log(`   ${d.url ?? `https://${CLOUDFLARE_DEFAULTS.pages.subdomain}`}`);
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
  const args = parsePagesDeployArgs(Bun.argv.slice(2));
  await loadReasonixEnv();
  const deployId = await triggerDeploy(args.branch);
  if (args.wait && deployId) await waitForDeploy(deployId, args.branch);
  if (args.verify) {
    await runEdgeVerify(args.taxonomy);
    await runTennisSsotReleaseVerify();
  } else if (!args.wait) {
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
