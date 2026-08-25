// @see https://bun.com/docs/runtime/child-process — Bun.spawn
import { ensureDir, writeJson } from './fs-bun';

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
  options: { cwd: string; inherit: boolean }
): Promise<CoreStepResult> {
  const startedAt = performance.now();
  const proc = Bun.spawn(cmd, {
    cwd: options.cwd,
    stdout: options.inherit ? 'inherit' : 'pipe',
    stderr: options.inherit ? 'inherit' : 'pipe',
    stdin: 'ignore',
  });
  let out = '';
  if (!options.inherit) {
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    out = `${stdout}${stderr}`;
  }
  const code = (await proc.exited) ?? 1;
  return { code, ms: Math.round(performance.now() - startedAt), out };
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
