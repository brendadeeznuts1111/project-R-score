// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @updated Bun.env · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated Bun.env · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.env · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.env · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.env · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/environment-variables
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { ensureDir } from './fs-bun';

export type GroupCommandResult = {
  code: number;
  ms: number;
  out: string;
  logPath: string | undefined;
};

export type RunGroupCommandOptions = {
  cwd: string;
  /** Stream child output for diagnosis instead of buffering it. */
  verbose?: boolean;
  /** Gitignored directory retaining buffered child output. */
  reportDir?: string;
  /** Stable group/step identifier used as the log filename. */
  logId?: string; // brand-ok — filesystem log label, not a domain identity.
  env?: Record<string, string | undefined>;
};

function safeLogName(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._-]+/g, '-');
}

/**
 * Execute a child command with quiet-success semantics. Buffered output is
 * retained locally so failures have complete evidence without flooding green
 * CI or hook logs.
 */
export async function runGroupCommand(
  command: string[],
  options: RunGroupCommandOptions
): Promise<GroupCommandResult> {
  const startedAt = performance.now();
  const verbose = options.verbose === true;
  const proc = Bun.spawn(command, {
    cwd: options.cwd,
    stdout: verbose ? 'inherit' : 'pipe',
    stderr: verbose ? 'inherit' : 'pipe',
    stdin: 'ignore',
    env: options.env ?? Bun.env,
  });

  let out = '';
  if (!verbose) {
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    out = `${stdout}${stderr}`;
  }

  const code = (await proc.exited) ?? 1;
  const ms = Math.round(performance.now() - startedAt);
  let logPath: string | undefined;
  if (!verbose && options.reportDir && options.logId) {
    await ensureDir(options.reportDir);
    logPath = `${options.reportDir}/${safeLogName(options.logId)}.log`;
    await Bun.write(logPath, out);
  }
  return { code, ms, out, logPath };
}
