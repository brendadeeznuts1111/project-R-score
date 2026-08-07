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
export function diffProofArtifact(
  proof: Exclude<ProofName, 'all'>,
  installedJson: unknown,
  prJson: unknown
): Array<{ path: string; installed: unknown; pr: unknown }> {
  const { diffKeys } = PROOF_ARTIFACTS[proof];
  const diffs: Array<{ path: string; installed: unknown; pr: unknown }> = [];
  const walk = (base: string, a: unknown, b: unknown, depth: number): void => {
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
      walk(key, pa, pb, depth + 1);
    }
  };
  for (const k of diffKeys) {
    walk(
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
      const found = diffProofArtifact(n, installedSave.artifact, prSave.artifact);
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
