#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
import { applyHarnessUnknownLongOptionGuardFor } from '../lib/docs/flags/harness.ts';
/**
 * One local/CI envelope after `bun ci`: install proof + hygiene + ci:harness.
 * Avoids a second GHA job that re-installs for hygiene alone.
 *
 * Extra args after `--` forward to ci:harness.
 */
import {
  runCoreStep,
  writeCoreTimingReport,
  type CoreStep,
  type CoreStepResult,
  type GateTiming,
} from './lib/ci-core-runner';
import { CORE_STEPS } from './lib/ci-core-steps.ts';

const repoRoot = `${import.meta.dir}/..`;
const TIMING_PATH = `${repoRoot}/reports/ci-core-timing.json`;

const harnessArgs = import.meta.main
  ? applyHarnessUnknownLongOptionGuardFor('ci:core', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const verbose = harnessArgs.includes('--verbose');
const timings: GateTiming[] = [];
const coreStartedAt = performance.now();

async function writeTimingReport(): Promise<void> {
  await writeCoreTimingReport({ path: TIMING_PATH, startedAt: coreStartedAt, timings });
}

async function acceptResult(step: CoreStep, result: CoreStepResult): Promise<void> {
  const { code, ms, out } = result;
  timings.push({ name: step.name, ms, ok: code === 0 });
  if (step.writeOut && code === 0) {
    await Bun.write(`${repoRoot}/${step.writeOut}`, out);
  }
}

const [installPrecheck, ...parallelCoreSteps] = CORE_STEPS;
if (!installPrecheck) throw new Error('ci:core requires an install precheck');

// Validate machine/project install policy before fan-out. The remaining gates
// are read-only or write only their declared ignored report, so Bun can overlap
// their repository scans with the single global-cache traversal.
const installResult = await runCoreStep(installPrecheck.cmd, {
  cwd: repoRoot,
  inherit: verbose && !installPrecheck.writeOut,
  logId: installPrecheck.name,
});
await acceptResult(installPrecheck, installResult);
if (installResult.code !== 0) {
  if (!verbose && installResult.out.trim()) console.error(installResult.out.trimEnd());
  console.error(`❌ ${installPrecheck.name} failed`);
  await writeTimingReport();
  process.exit(installResult.code);
}

const parallelStartedAt = performance.now();
const parallelResults = await Promise.all(
  parallelCoreSteps.map(async step => ({
    step,
    result: await runCoreStep(step.cmd, {
      cwd: repoRoot,
      inherit: verbose && !step.writeOut,
      logId: step.name,
    }),
  }))
);

for (const { step, result } of parallelResults) {
  await acceptResult(step, result);
}
if (!verbose) {
  console.info(
    `∥ core×${parallelCoreSteps.length} (${Math.round(performance.now() - parallelStartedAt)}ms wall)`
  );
}

const failed = parallelResults.find(({ result }) => result.code !== 0);
if (failed) {
  const { step, result } = failed;
  if (!verbose && result.out.trim()) console.error(result.out.trimEnd());
  console.error(`❌ ${step.name} failed`);
  await writeTimingReport();
  process.exit(result.code);
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

const totalMs = timings.reduce((s, t) => s + t.ms, 0);
await writeTimingReport();

if (harnessCode !== 0) process.exit(harnessCode);
console.info(
  `✅ ci:core ${Math.round(performance.now() - coreStartedAt)}ms wall · ${totalMs}ms step-sum`
);
