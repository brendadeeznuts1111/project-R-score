#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * One local/CI envelope after `bun ci`: install proof + hygiene + ci:harness.
 * Avoids a second GHA job that re-installs for hygiene alone.
 *
 *   bun run ci:core
 *   bun run ci:core -- --fast
 *   bun run ci:core -- --full-lint --verbose
 *
 * Extra args after `--` forward to ci:harness.
 */
import { ensureDir, writeJson } from './lib/fs-bun';

const repoRoot = `${import.meta.dir}/..`;
const TIMING_PATH = `${repoRoot}/reports/ci-core-timing.json`;

type GateTiming = { name: string; ms: number; ok: boolean };

const CORE_STEPS: Array<{ name: string; cmd: string[] }> = [
  {
    name: 'install-verify',
    cmd: ['bun', 'scripts/verify-install-cache.ts', '--strict', '--quiet'],
  },
  {
    name: 'cache-lifecycle',
    cmd: ['bun', 'run', 'install:cache:lifecycle'],
  },
  {
    name: 'hygiene',
    cmd: ['bun', 'run', 'hygiene'],
  },
  {
    name: 'import-graph',
    cmd: ['bun', 'scripts/check-import-graph.ts'],
  },
];

async function run(
  cmd: string[],
  inherit: boolean
): Promise<{ code: number; ms: number; out: string }> {
  const t0 = performance.now();
  const proc = Bun.spawn(cmd, {
    cwd: repoRoot,
    stdout: inherit ? 'inherit' : 'pipe',
    stderr: inherit ? 'inherit' : 'pipe',
    stdin: 'ignore',
  });
  let out = '';
  if (!inherit) {
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    out = `${stdout}${stderr}`;
  }
  const code = (await proc.exited) ?? 1;
  return { code, ms: Math.round(performance.now() - t0), out };
}

const harnessArgs = Bun.argv.slice(2);
const verbose = harnessArgs.includes('--verbose');
const timings: GateTiming[] = [];

for (const step of CORE_STEPS) {
  const { code, ms, out } = await run(step.cmd, verbose);
  timings.push({ name: step.name, ms, ok: code === 0 });
  if (!verbose) console.info(`${code === 0 ? '✓' : '✗'} ${step.name} (${ms}ms)`);
  if (code !== 0) {
    if (!verbose && out.trim()) console.error(out.trimEnd());
    console.error(`❌ ${step.name} failed`);
    await ensureDir(`${repoRoot}/reports`);
    await writeJson(TIMING_PATH, {
      generatedAt: new Date().toISOString(),
      totalMs: timings.reduce((s, t) => s + t.ms, 0),
      gates: timings,
    });
    process.exit(code);
  }
}

const harnessCmd = ['bun', 'scripts/ci-harness.ts', ...harnessArgs];
const t0 = performance.now();
const harness = Bun.spawn(harnessCmd, {
  cwd: repoRoot,
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit',
});
const harnessCode = (await harness.exited) ?? 1;
timings.push({
  name: 'ci-harness',
  ms: Math.round(performance.now() - t0),
  ok: harnessCode === 0,
});

await ensureDir(`${repoRoot}/reports`);
const totalMs = timings.reduce((s, t) => s + t.ms, 0);
await writeJson(TIMING_PATH, {
  generatedAt: new Date().toISOString(),
  totalMs,
  gates: timings,
});

if (harnessCode !== 0) process.exit(harnessCode);
console.info(`✅ ci:core ${totalMs}ms step-sum`);
