#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @updated Bun.deepEquals · changed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.deepEquals · fixed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.deepEquals · fixed v1.1.13 · 2024-06-05 · https://bun.com/blog/bun-v1.1.13
// @updated Bun.deepEquals · changed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.deepEquals · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.deepEquals · changed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @updated Bun.deepEquals · changed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.deepEquals · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.deepEquals · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.deepEquals · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/utils#bun-deepequals
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/environment-variables
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @updated Bun.spawnSync · changed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.spawnSync · changed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.spawnSync · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.spawnSync · changed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawnSync · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawnSync · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.spawnSync · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @verified Bun.spawnSync · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync
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
import { resolveBunExecutable } from '../lib/bun-executable.ts';
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

/** Proof → (artifact path, save arg, stable keys to diff). */
const PROOF_ARTIFACTS: Record<
  Exclude<ProofName, 'all'>,
  { path: string; save: string[]; diffKeys: string[] }
> = {
  api: {
    path: 'tools/bun-api-coverage-proof.json',
    save: ['--write'],
    // apis = declarative per-API surface (ok/inTypes/runtime); demos carry
    // timing + output hashes → noise across runs, excluded from the diff.
    diffKeys: ['apis'],
  },
  runtime: {
    path: 'public/registry/bun-runtime-nits-proof.json',
    save: ['--save'],
    diffKeys: ['results'],
  },
  release: {
    path: 'public/registry/release-features.json',
    save: ['--save'],
    diffKeys: ['releaseNotes'],
  },
};

function parseArgs(argv: string[]): { pr: string; proof: ProofName; json: boolean; diff: boolean } {
  const guarded = applyUnknownLongOptionGuardFor('bun:pr:verify', argv, { onFail: 'throw' });
  const pr = guarded.find(a => /^\d+$/.test(a));
  if (!pr)
    throw new Error(
      'usage: bun tools/bun-pr-verify.ts <pr-number> [--proof api|runtime|release|all] [--json] [--diff]'
    );
  const proofArg = guarded.find(a => a.startsWith('--proof='))?.split('=')[1];
  const proof = (proofArg ?? 'all') as ProofName;
  if (!['api', 'runtime', 'release', 'all'].includes(proof)) {
    throw new Error(`unknown --proof=${proof} (api|runtime|release|all)`);
  }
  return { pr, proof, json: guarded.includes('--json'), diff: guarded.includes('--diff') };
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

/**
 * Deep-diff a proof's stable fields between the installed and PR runtimes.
 * Ignores volatile keys (timestamp, generatedAt, bunVersion) and reports only
 * changed leaf paths. Returns [] when artifacts are identical or unreadable.
 */
export function parseProofArtifactDiff(
  proof: Exclude<ProofName, 'all'>,
  installedJson: unknown,
  prJson: unknown
): Array<{ path: string; installed: unknown; pr: unknown }> {
  const { diffKeys } = PROOF_ARTIFACTS[proof];
  const diffs: Array<{ path: string; installed: unknown; pr: unknown }> = [];
  const parseDiff = (base: string, a: unknown, b: unknown, depth: number): void => {
    if (depth > 8) return;
    if (Bun.deepEquals(a, b, true)) return;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
      diffs.push({ path: base || '(root)', installed: a, pr: b });
      return;
    }
    const aKeys = new Set(Object.keys(a as Record<string, unknown>));
    const bKeys = new Set(Object.keys(b as Record<string, unknown>));
    for (const k of new Set([...aKeys, ...bKeys])) {
      const pa = (a as Record<string, unknown>)[k];
      const pb = (b as Record<string, unknown>)[k];
      const key = base ? `${base}.${k}` : k;
      // ignore volatile metadata fields
      if (
        ['timestamp', 'generatedAt', 'bunVersion', 'bunRevision', 'reportPath', 'sha256'].includes(
          k
        )
      )
        continue;
      parseDiff(key, pa, pb, depth + 1);
    }
  };
  for (const k of diffKeys) {
    parseDiff(
      k,
      (installedJson as Record<string, unknown>)?.[k],
      (prJson as Record<string, unknown>)?.[k],
      0
    );
  }
  return diffs;
}

/** Run a proof under a given bun binary with its save flag, then read the artifact. */
async function runProofWithSave(
  bunBin: string,
  proof: Exclude<ProofName, 'all'>
): Promise<{ exit: number; artifact: unknown }> {
  const { path, save } = PROOF_ARTIFACTS[proof];
  const cmd = [...PROOFS[proof]];
  cmd[0] = bunBin;
  const proc = Bun.spawn([...cmd, ...save], {
    cwd: import.meta.dir ? joinPath(import.meta.dir, '..') : process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, PATH: `${dirname(bunBin)}:${Bun.env.PATH ?? ''}` },
  });
  await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const abs = joinPath(import.meta.dir ? joinPath(import.meta.dir, '..') : process.cwd(), path);
  try {
    return { exit: 0, artifact: JSON.parse(await Bun.file(abs).text()) };
  } catch {
    return { exit: 1, artifact: null };
  }
}

async function main(): Promise<void> {
  const { pr, proof, json, diff } = parseArgs(Bun.argv.slice(2));
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

  // --diff: run each proof with its save flag under BOTH runtimes and deep-compare.
  const diffs: Record<string, Array<{ path: string; installed: unknown; pr: unknown }>> = {};
  if (diff) {
    for (const n of names) {
      const installedSave = await runProofWithSave(resolveBunExecutable(), n);
      const prSave = await runProofWithSave(prBun, n);
      const found = parseProofArtifactDiff(n, installedSave.artifact, prSave.artifact);
      if (found.length > 0) diffs[n] = found;
    }
    payload.diffs = diffs;
    payload.healthy = payload.healthy && Object.keys(diffs).length === 0;
  }

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
  const diffEntries = Object.entries(payload.diffs ?? {});
  if (diffEntries.length > 0) {
    console.log('\n⚠️  behavior diffs between installed and PR build:');
    for (const [proof, entries] of diffEntries) {
      console.log(`  [${proof}] ${entries.length} changed path(s):`);
      for (const e of entries.slice(0, 12)) {
        console.log(
          `    ${e.path}: installed=${JSON.stringify(e.installed)} · pr=${JSON.stringify(e.pr)}`
        );
      }
      if (entries.length > 12) console.log(`    … +${entries.length - 12} more`);
    }
  } else if (payload.diffs) {
    console.log('✅ no behavioral diffs in proof artifacts');
  }
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
