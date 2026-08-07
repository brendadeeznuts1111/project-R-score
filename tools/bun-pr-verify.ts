#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/project/contributing#download-release-build-from-pull-requests — bunx bun-pr
/**
 * bun-pr-verify.ts — run the repo's Bun API/runtime proofs against an
 * unreleased Bun build from a GitHub PR.
 *
 * Uses `bunx bun-pr <pr>` (downloads the PR's release build from its GitHub
 * Actions artifacts and exposes it as `bun-<pr>` on PATH):
 *   https://bun.com/docs/project/contributing#download-release-build-from-pull-requests
 *
 *   bun tools/bun-pr-verify.ts <pr-number> [--proof api|runtime|release|all] [--json]
 *   bun run bun:pr:verify -- <pr>
 *
 * Flow: resolve the PR build path → prepend to PATH → run the selected proofs
 * with that Bun → dual-mode table/json summary vs the installed baseline.
 *
 * Unknown long options: ALLOWED_LONG_REGISTRY['bun:pr:verify'] · BUN_STRIP_UNKNOWN.
 */
import { joinPath } from '../lib/path-bun.ts';
import { cliOut, logTable } from '../lib/console/index.ts';
import {
  applyUnknownLongOptionGuardFor,
  BUN_PR_VERIFY_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';

export { BUN_PR_VERIFY_ALLOWED_LONG };

type ProofName = 'api' | 'runtime' | 'release' | 'all';
const PROOFS: Record<Exclude<ProofName, 'all'>, string[]> = {
  api: ['bun', 'tools/bun-api-verify.ts'],
  runtime: ['bun', 'tools/verify-bun-runtime-nits.ts'],
  release: ['bun', 'tools/verify-bun-release.ts'],
};

function parseArgs(argv: string[]): { pr: string; proof: ProofName; json: boolean } {
  const guarded = applyUnknownLongOptionGuardFor('bun:pr:verify', argv, { onFail: 'throw' });
  const pr = guarded.find(a => /^\d+$/.test(a));
  if (!pr)
    throw new Error(
      'usage: bun tools/bun-pr-verify.ts <pr-number> [--proof api|runtime|release|all] [--json]'
    );
  const proofArg = guarded.find(a => a.startsWith('--proof='))?.split('=')[1];
  const proof = (proofArg ?? 'all') as ProofName;
  if (!['api', 'runtime', 'release', 'all'].includes(proof)) {
    throw new Error(`unknown --proof=${proof} (api|runtime|release|all)`);
  }
  return { pr, proof, json: guarded.includes('--json') };
}

/** Resolve the bun-<pr> binary installed by `bunx bun-pr` (throws when absent). */
function resolvePrBun(pr: string): string {
  const found = Bun.which(`bun-${pr}`);
  if (!found) {
    throw new Error(
      `bun-${pr} not on PATH — run: bunx bun-pr ${pr} (needs gh CLI to authenticate with GitHub)`
    );
  }
  return found;
}

async function runProof(
  pr: string,
  proof: Exclude<ProofName, 'all'>,
  prBun: string
): Promise<{ proof: string; exit: number; summary: string }> {
  const cmd = PROOFS[proof];
  const args = [...cmd];
  args[0] = prBun; // replace `bun` with the PR build
  const proc = Bun.spawn(args, {
    cwd: import.meta.dir ? joinPath(import.meta.dir, '..') : process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, PATH: `${dirname(prBun)}:${Bun.env.PATH ?? ''}` },
  });
  const [stdout, stderr, exit] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const tail = (stdout + stderr).trim().split('\n').slice(-3).join(' | ');
  return { proof, exit, summary: tail || `exit ${exit}` };
}

function dirname(p: string): string {
  return p.slice(0, p.lastIndexOf('/'));
}

async function main(): Promise<void> {
  const { pr, proof, json } = parseArgs(Bun.argv.slice(2));
  const installed = Bun.version;
  const prBun = resolvePrBun(pr);

  // version probe against the PR build
  const ver = Bun.spawnSync([prBun, '--version'], { stdout: 'pipe' });
  const prVersion = ver.stdout.toString().trim();

  const names: Exclude<ProofName, 'all'>[] =
    proof === 'all' ? ['api', 'runtime', 'release'] : [proof];
  const rows: Array<{ proof: string; exit: number; summary: string }> = [];
  for (const n of names) {
    rows.push(await runProof(pr, n, prBun));
  }

  const payload = {
    pr,
    installed,
    prVersion,
    prBun,
    results: rows,
    healthy: rows.every(r => r.exit === 0),
  };

  if (json) {
    cliOut(payload, { json: true });
    process.exit(payload.healthy ? 0 : 1);
  }

  console.log(`bun-pr verify #${pr}`);
  console.log(`  installed ${installed} · PR build ${prVersion} (${prBun})`);
  logTable(
    rows.map(r => ({
      proof: r.proof,
      exit: r.exit === 0 ? 'pass' : `FAIL ${r.exit}`,
      tail: r.summary,
    })),
    ['proof', 'exit', 'tail']
  );
  console.log(
    payload.healthy ? '✅ all proofs pass on the PR build' : '❌ some proofs failed on the PR build'
  );
  process.exit(payload.healthy ? 0 : 1);
}

if (import.meta.main) {
  try {
    await main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
