#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/environment-variables — --env-file · Bun.env
// @see https://bun.com/docs/bundler/macros — macros inline only under bun build
/**
 * Local-only merge proof. GitHub Actions is intentionally disabled.
 *
 * Env: package.json loads `~/.reasonix/.env` via `--env-file`. Non-secret
 * `R2_BUCKET_NAME` defaults here when unset (same as config/r2-env.ts).
 * Git identity uses lib/macros helpers at runtime (not `type: "macro"`).
 *
 * Soft bun-types report (tip-diff + changelog + usage):
 *   - Always runs after hard steps unless `BUN_TYPES_CI=0` / `SKIP_BUN_TYPES_CI=1`
 *   - Default soft: tip-diff **warn** still exits 0 (does not fail bun:ci)
 *   - Hard gate: `BUN_TYPES_CI_STRICT=1` → `bun run bun:types-ci:strict`
 *   - Manual: `bun run bun:types-ci` · reports under `.cache/bun-types-*`
 */
import { getGitBranch, getGitCommitHash } from '../lib/macros/git-commit.ts';
import { checkBunPin } from '../lib/verification/bun-runtime-pin.ts';
import { resolveVerificationBunBinary } from '../lib/verification/resolve-bun-binary.ts';

const DEFAULT_R2_BUCKET_NAME = 'factory-wager-wiki';

if (!Bun.env.R2_BUCKET_NAME?.trim()) {
  Bun.env.R2_BUCKET_NAME = DEFAULT_R2_BUCKET_NAME;
}

const repoRoot = `${import.meta.dir}/..`;
const sha = getGitCommitHash();
const branch = getGitBranch();
const shortSha = sha ? sha.slice(0, 8) : 'unknown';
const ciNote = Bun.env.CI === 'true' || Bun.env.CI === '1' ? ' · CI=1' : '';
const pin = await checkBunPin();

if (!pin.ok) {
  console.error(`bun:ci refused to start · ${pin.message}`);
  process.exit(1);
}

const resolvedBun = resolveVerificationBunBinary();
if (!resolvedBun.matchesRuntime) {
  console.error(
    `bun:ci refused to start · child executable ${resolvedBun.path} reports ${resolvedBun.spawnedVersion ?? 'an unknown version'}, expected ${resolvedBun.runtimeVersion}`
  );
  process.exit(1);
}
const bunExecutable = resolvedBun.path;

console.info(
  `bun:ci · ${shortSha} · ${branch || 'unknown'}${ciNote} · Bun ${Bun.version} (${Bun.revision}) · ${bunExecutable} · R2_BUCKET_NAME=${Bun.env.R2_BUCKET_NAME}`
);

type CiStep = {
  name: string;
  command: string[];
  cwd: string;
  /** When true, non-zero exit logs a warning and does not fail bun:ci */
  soft?: boolean;
};

const steps: CiStep[] = [
  {
    name: 'nested-registry-install',
    command: ['bun', 'install', '--frozen-lockfile'],
    cwd: `${repoRoot}/projects/active/factorywager/registry`,
  },
  { name: 'core', command: ['bun', 'run', 'ci:core'], cwd: repoRoot },
  {
    name: 'snapshot-api',
    command: ['bun', 'run', 'test:partner-cli:snapshots'],
    cwd: repoRoot,
  },
  { name: 'types', command: ['bun', 'run', 'ci:types'], cwd: repoRoot },
  { name: 'security', command: ['bun', 'run', 'ci:security'], cwd: repoRoot },
  {
    name: 'portal-registry',
    command: ['bun', 'run', 'ci:portal-registry'],
    cwd: repoRoot,
  },
];

const skipTypesCi =
  Bun.env.BUN_TYPES_CI === '0' ||
  Bun.env.BUN_TYPES_CI === 'false' ||
  Bun.env.SKIP_BUN_TYPES_CI === '1' ||
  Bun.env.SKIP_BUN_TYPES_CI === 'true';
const typesCiStrict = Bun.env.BUN_TYPES_CI_STRICT === '1' || Bun.env.BUN_TYPES_CI_STRICT === 'true';

if (!skipTypesCi) {
  steps.push({
    name: typesCiStrict ? 'bun-types-report (strict)' : 'bun-types-report (soft)',
    command: ['bun', 'run', typesCiStrict ? 'bun:types-ci:strict' : 'bun:types-ci'],
    cwd: repoRoot,
    // Soft by default: tip-diff warn exits 0; still soft-wrap if tool fails (missing tip, etc.)
    soft: !typesCiStrict,
  });
} else {
  console.info('\nbun:ci · bun-types-report skipped (BUN_TYPES_CI=0 or SKIP_BUN_TYPES_CI=1)');
}

for (const step of steps) {
  console.info(`\n== bun:ci · ${step.name} ==`);
  const [, ...args] = step.command;
  const proc = Bun.spawn([bunExecutable, ...args], {
    cwd: step.cwd,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...Bun.env },
  });
  const exitCode = (await proc.exited) ?? 1;
  if (exitCode !== 0) {
    if (step.soft) {
      console.warn(
        `bun:ci · ${step.name} exited ${exitCode} (soft — not failing merge proof; set BUN_TYPES_CI_STRICT=1 to enforce)`
      );
      continue;
    }
    console.error(`bun:ci failed at ${step.name}`);
    process.exit(exitCode);
  }
}

console.info('\n✅ bun:ci local merge proof passed');
