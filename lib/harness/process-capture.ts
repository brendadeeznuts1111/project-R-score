// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
/**
 * Drain both child output streams concurrently so a full pipe cannot deadlock
 * the parent while it waits for the other stream or the exit status.
 */

export interface CaptureProcessOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
}

export interface CapturedProcess {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export async function captureProcess(
  command: readonly string[],
  options: CaptureProcessOptions = {}
): Promise<CapturedProcess> {
  const timeoutSignal =
    options.timeoutMs === undefined ? undefined : AbortSignal.timeout(options.timeoutMs);
  const proc = Bun.spawn([...command], {
    stdout: 'pipe',
    stderr: 'pipe',
    ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
    ...(options.env !== undefined ? { env: options.env } : {}),
    ...(timeoutSignal !== undefined ? { signal: timeoutSignal } : {}),
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, stdout, stderr, timedOut: timeoutSignal?.aborted === true };
}

export function lastOutputLine(text: string): string {
  return text.trim().split('\n').filter(Boolean).pop() ?? '';
}

/** Select actionable, ANSI-free evidence instead of a generic final status line. */
export function summarizeProcessOutput(result: CapturedProcess, maxLength = 160): string {
  const lines = Bun.stripANSI(`${result.stdout}\n${result.stderr}`)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^[┌┬┐├┼┤└┴┘─│\s]+$/.test(line));

  if (result.exitCode === 0) {
    const success = lines.filter(line => /^(?:✅|✓)\s|\b(?:passed|current)\b/i.test(line));
    return (success.at(-1) ?? lines.at(-1) ?? '').slice(0, maxLength);
  }

  const marked = lines.filter(line => /^(?:❌|✗)\s/.test(line));
  const specific = marked.filter(line => !/\d+\s+\w+\s+check\(s\) failed/i.test(line));
  const diagnostic = lines.filter(line =>
    /\b(?:error|failed|failure|missing|required|not ready|timed out)\b/i.test(line)
  );
  return (specific.at(-1) ?? marked.at(-1) ?? diagnostic.at(-1) ?? lines.at(-1) ?? '').slice(
    0,
    maxLength
  );
}
