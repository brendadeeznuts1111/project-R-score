#!/usr/bin/env bun
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * CI / agent harness envelope — quiet success; noise only on failure.
 *
 * Install journey is NOT here (owned by repo-hygiene + pre-push).
 * Spine list is NOT here (owned by `test:changed --main-head`).
 *
 *   bun run ci:harness              # full → harness-gates.yml
 *   bun run ci:harness:fast         # path-bun · bun-env · brands · test:changed (dirty)
 *   bun scripts/ci-harness.ts --verbose
 *   bun scripts/ci-harness.ts --fail-json
 */
import { hasFlag } from './lib/cli-args';
import { ensureDir, writeJson } from './lib/fs-bun';

const repoRoot = `${import.meta.dir}/..`;
const TIMING_PATH = `${repoRoot}/reports/ci-harness-timing.json`;

type Step = { name: string; cmd: string[]; owner: string; repair: string };
type GateTiming = { name: string; ms: number; ok: boolean };

const ALL_STEPS: Step[] = [
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
    cmd: ['bun', 'tools/branded-id-check.ts', '--smart', '--strict', '--quiet'],
    owner: 'lib/types/branded.ts · branded-ids skill',
    repair: 'bun tools/branded-id-check.ts --smart --strict',
  },
  {
    name: 'test-changed',
    cmd: ['bun', 'run', 'test:changed', '--', '--main-head'],
    owner: 'scripts/bun-test-changed.ts · --changed / --main-head',
    repair: 'bun run test:changed:main',
  },
];

/** Fast: ratchets + brands + dirty-tree tests (no eslint; no main-head graph). */
const FAST_STEPS: Step[] = [
  ...ALL_STEPS.filter(
    s => s.name === 'path-bun' || s.name === 'bun-env' || s.name === 'brands-smart'
  ),
  {
    name: 'test-changed',
    cmd: ['bun', 'run', 'test:changed'],
    owner: 'scripts/bun-test-changed.ts · --changed (dirty tree)',
    repair: 'bun run test:changed',
  },
];

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
  const mark = code === 0 ? '✓' : '✗';
  console.info(`${mark} ${step.name} (${ms}ms)`);
  return { code, ms, out: `${stdout}${stderr}` };
}

async function writeTimings(timings: GateTiming[], mode: 'full' | 'fast'): Promise<void> {
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

const fast = hasFlag('fast');
const verbose = hasFlag('verbose');
const wantFailJson = hasFlag('fail-json');
const mode = fast ? 'fast' : 'full';
const steps = fast ? FAST_STEPS : ALL_STEPS;
const timings: GateTiming[] = [];

if (verbose) console.info(`ci:harness (${mode})`);

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

const total = timings.reduce((s, t) => s + t.ms, 0);
await writeTimings(timings, mode);
console.info(`✅ ci:harness (${mode}) ${total}ms`);
