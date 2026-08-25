import { ensureDir, writeJson } from './fs-bun';
import { runGroupCommand } from './harness-group-runner';

export type GateTiming = { name: string; ms: number; ok: boolean };

export type CoreStep = {
  name: string;
  cmd: string[];
  /** Write captured stdout to this repo-relative artifact on success. */
  writeOut?: string;
};

export type CoreStepResult = { code: number; ms: number; out: string };

export async function runCoreStep(
  cmd: string[],
  options: { cwd: string; inherit: boolean; logId?: string } // brand-ok — filesystem log label.
): Promise<CoreStepResult> {
  return runGroupCommand(cmd, {
    cwd: options.cwd,
    verbose: options.inherit,
    reportDir: `${options.cwd}/reports/ci/core`,
    logId: options.logId,
  });
}

export async function writeCoreTimingReport(options: {
  path: string;
  startedAt: number;
  timings: GateTiming[];
}): Promise<void> {
  await ensureDir(options.path.slice(0, options.path.lastIndexOf('/')));
  await writeJson(options.path, {
    generatedAt: new Date().toISOString(),
    totalMs: options.timings.reduce((sum, timing) => sum + timing.ms, 0),
    wallMs: Math.round(performance.now() - options.startedAt),
    gates: options.timings,
  });
}
