#!/usr/bin/env bun
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * CI / agent harness envelope — quiet success; noise only on failure.
 *
 * Cheap ratchets run in parallel. ESLint defaults to changed-files
 * (`lint:bun-native:changed`); full tree only with --full-lint /
 * HARNESS_FULL_LINT=1 (main push).
 *
 *   bun run ci:harness
 *   bun run ci:harness:fast
 *   bun scripts/ci-harness.ts --full-lint
 *   bun scripts/ci-harness.ts --verbose
 *   bun scripts/ci-harness.ts --fail-json
 */
import { hasFlag } from './lib/cli-args';
import { ensureDir, writeJson } from './lib/fs-bun';

const repoRoot = `${import.meta.dir}/..`;
const TIMING_PATH = `${repoRoot}/reports/ci-harness-timing.json`;

type Step = { name: string; cmd: string[]; owner: string; repair: string };
type GateTiming = { name: string; ms: number; ok: boolean };

const CHEAP: Step[] = [
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
    name: 'brands-smart',
    cmd: ['bun', 'tools/branded-id-check.ts', '--smart', '--strict', '--quiet'],
    owner: 'lib/types/branded.ts · branded-ids skill',
    repair: 'bun tools/branded-id-check.ts --smart --strict',
  },
];

function eslintStep(fullLint: boolean): Step {
  return {
    name: fullLint ? 'eslint-full' : 'eslint-changed',
    cmd: fullLint
      ? ['bun', 'run', 'lint:bun-native:rollout']
      : ['bun', 'run', 'lint:bun-native:changed'],
    owner: 'eslint.bun-native.config.ts · scripts/lint-bun-native-changed.ts',
    repair: fullLint ? 'bun run lint:bun-native:rollout' : 'bun run lint:bun-native:changed',
  };
}

function testStep(mainHead: boolean): Step {
  return {
    name: 'test-changed',
    cmd: mainHead
      ? ['bun', 'run', 'test:changed', '--', '--main-head']
      : ['bun', 'run', 'test:changed'],
    owner: 'scripts/bun-test-changed.ts · --changed / --main-head',
    repair: mainHead ? 'bun run test:changed:main' : 'bun run test:changed',
  };
}

async function run(
  step: Step,
  verbose: boolean
): Promise<{ code: number; ms: number; out: string }> {
  const t0 = performance.now();
  if (verbose) {
    console.info(`→ ${step.name}`);
    const proc = Bun.spawn(step.cmd, {
      cwd: repoRoot,
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    const code = (await proc.exited) ?? 1;
    return { code, ms: Math.round(performance.now() - t0), out: '' };
  }

  const proc = Bun.spawn(step.cmd, {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = (await proc.exited) ?? 1;
  const ms = Math.round(performance.now() - t0);
  console.info(`${code === 0 ? '✓' : '✗'} ${step.name} (${ms}ms)`);
  return { code, ms, out: `${stdout}${stderr}` };
}

async function writeTimings(timings: GateTiming[], mode: string): Promise<void> {
  await ensureDir(`${repoRoot}/reports`);
  await writeJson(TIMING_PATH, {
    generatedAt: new Date().toISOString(),
    full: mode === 'full',
    mode,
    totalMs: timings.reduce((s, t) => s + t.ms, 0),
    gates: timings,
  });
}

function failJson(step: Step, code: number): void {
  console.error(
    JSON.stringify({
      ok: false,
      step: step.name,
      code,
      owner: step.owner,
      repair: step.repair,
      invariant: 'harness gate must exit 0',
    })
  );
}

async function runSerial(
  steps: Step[],
  verbose: boolean,
  timings: GateTiming[],
  wantFailJson: boolean,
  mode: string
): Promise<void> {
  for (const step of steps) {
    const { code, ms, out } = await run(step, verbose);
    timings.push({ name: step.name, ms, ok: code === 0 });
    if (code !== 0) {
      if (!verbose && out.trim()) console.error(out.trimEnd());
      console.error(`❌ ${step.name} failed · repair: ${step.repair}`);
      if (wantFailJson) failJson(step, code);
      await writeTimings(timings, mode);
      process.exit(code);
    }
  }
}

const fast = hasFlag('fast');
const verbose = hasFlag('verbose');
const wantFailJson = hasFlag('fail-json');
const fullLint =
  hasFlag('full-lint') || Bun.env.HARNESS_FULL_LINT === '1' || Bun.env.HARNESS_FULL_LINT === 'true';
const mode = fast ? 'fast' : fullLint ? 'full-lint' : 'full';
const timings: GateTiming[] = [];

if (verbose) console.info(`ci:harness (${mode})`);

// Parallel cheap ratchets (path-bun ‖ bun-env ‖ brands)
{
  const t0 = performance.now();
  const results = await Promise.all(CHEAP.map(s => run(s, verbose)));
  const parallelMs = Math.round(performance.now() - t0);
  for (let i = 0; i < CHEAP.length; i++) {
    const step = CHEAP[i]!;
    const r = results[i]!;
    timings.push({ name: step.name, ms: r.ms, ok: r.code === 0 });
    if (r.code !== 0) {
      if (!verbose && r.out.trim()) console.error(r.out.trimEnd());
      console.error(`❌ ${step.name} failed · repair: ${step.repair}`);
      if (wantFailJson) failJson(step, r.code);
      await writeTimings(timings, mode);
      process.exit(r.code);
    }
  }
  if (!verbose) console.info(`∥ cheap×${CHEAP.length} (${parallelMs}ms wall)`);
}

if (!fast) {
  await runSerial([eslintStep(fullLint)], verbose, timings, wantFailJson, mode);
}

await runSerial([testStep(!fast)], verbose, timings, wantFailJson, mode);

const stepSum = timings.reduce((s, t) => s + t.ms, 0);
await writeTimings(timings, mode);
console.info(`✅ ci:harness (${mode}) ${stepSum}ms step-sum`);
