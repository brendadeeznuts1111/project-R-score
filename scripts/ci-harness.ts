#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * CI / agent-visible harness gate envelope.
 * Quiet success; on failure prints invariant · owner · repair command.
 *
 *   bun run ci:harness           # full (matches harness-gates.yml)
 *   bun run ci:harness:fast      # install · path-bun · bun-env · brands (skip eslint + spine)
 *   bun scripts/ci-harness.ts --fail-json   # machine-readable failure line on stderr
 */
import { CI_SPINE_SMOKE_TESTS, CRITICAL_PROOF_PATHS } from '../lib/harness/proof';
import { hasFlag } from './lib/cli-args';
import { ensureDir, writeJson } from './lib/fs-bun';

const repoRoot = `${import.meta.dir}/..`;
const TIMING_PATH = `${repoRoot}/reports/ci-harness-timing.json`;

type Step = { name: string; cmd: string[]; owner: string; repair: string };
type GateTiming = { name: string; ms: number; ok: boolean };

const ALL_STEPS: Step[] = [
  {
    name: 'proof:install',
    cmd: ['bun', 'run', 'proof:install'],
    owner: 'docs/harness/PROOF.md · install-verify',
    repair: 'bun run proof:install',
  },
  {
    name: 'path-bun',
    cmd: ['bun', 'run', 'check:path-bun'],
    owner: 'lib/path-bun.ts · scripts/check-path-bun.ts',
    repair: 'bun run check:path-bun',
  },
  {
    name: 'bun-env',
    cmd: ['bun', 'run', 'check:bun-env'],
    owner: 'scripts/check-bun-env.ts',
    repair: 'bun run check:bun-env',
  },
  {
    name: 'eslint-bun-native',
    cmd: ['bun', 'run', 'lint:bun-native:rollout'],
    owner: 'eslint.bun-native.config.ts · --max-warnings 0 (pre-commit)',
    repair: 'bun run lint:bun-native:rollout',
  },
  {
    name: 'brands-smart',
    cmd: ['bun', 'tools/branded-id-check.ts', '--smart', '--strict'],
    owner: 'lib/types/branded.ts · branded-ids skill',
    repair: 'bun tools/branded-id-check.ts --smart --strict',
  },
  {
    name: 'spine-smokes',
    cmd: ['bun', 'test', ...CI_SPINE_SMOKE_TESTS],
    owner: 'lib/harness/proof.ts · CI_SPINE_SMOKE_TESTS · docs/BUN_NATIVE_CAPABILITIES.md',
    repair: `bun test ${CI_SPINE_SMOKE_TESTS.join(' ')}`,
  },
];

/** Fast local parity: install + ratchets + brands (eslint/spine stay in full + pre-commit). */
const FAST_STEP_NAMES = new Set(['proof:install', 'path-bun', 'bun-env', 'brands-smart']);

async function run(step: Step): Promise<{ code: number; ms: number }> {
  console.info(`→ ${step.name}`);
  const t0 = performance.now();
  const proc = Bun.spawn(step.cmd, { stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' });
  const code = (await proc.exited) ?? 1;
  return { code, ms: Math.round(performance.now() - t0) };
}

async function writeTimings(timings: GateTiming[], mode: 'full' | 'fast'): Promise<void> {
  await ensureDir(`${repoRoot}/reports`);
  const payload = {
    generatedAt: new Date().toISOString(),
    full: mode === 'full',
    mode,
    totalMs: timings.reduce((s, t) => s + t.ms, 0),
    gates: timings,
  };
  await writeJson(TIMING_PATH, payload);
  console.info(`⏱  gate timings → reports/ci-harness-timing.json (${payload.totalMs}ms total)`);
}

function failJson(step: Step, code: number): void {
  const line = JSON.stringify({
    ok: false,
    step: step.name,
    code,
    owner: step.owner,
    repair: step.repair,
    invariant: 'harness gate must exit 0',
  });
  console.error(line);
}

const fast = hasFlag('fast');
const wantFailJson = hasFlag('fail-json');
const mode = fast ? 'fast' : 'full';
const steps = fast ? ALL_STEPS.filter(s => FAST_STEP_NAMES.has(s.name)) : ALL_STEPS;
const timings: GateTiming[] = [];

console.info(`FactoryWager ci:harness (${mode})`);
console.info(`Proof catalog: ${CRITICAL_PROOF_PATHS.length} named paths (lib/harness/proof.ts)`);
console.info('');

for (const step of steps) {
  const { code, ms } = await run(step);
  timings.push({ name: step.name, ms, ok: code === 0 });
  if (code !== 0) {
    console.error('');
    console.error(`❌ ${step.name} failed`);
    console.error(`   invariant: harness gate must exit 0`);
    console.error(`   owner: ${step.owner}`);
    console.error(`   repair: ${step.repair}`);
    if (wantFailJson) failJson(step, code);
    await writeTimings(timings, mode);
    process.exit(code);
  }
}

await writeTimings(timings, mode);
console.info('');
console.info(`✅ ci:harness (${mode}) passed`);
