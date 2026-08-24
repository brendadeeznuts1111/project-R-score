/** Shared spawn helper for runtime-cli fixture tests. */

export async function runBun(
  args: string[],
  cwd: string,
  opts?: { killAfterMs?: number; stdin?: string | Uint8Array }
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(['bun', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: opts?.stdin != null ? 'pipe' : 'ignore',
    env: { ...Bun.env, NO_COLOR: '1' },
  });

  if (opts?.stdin != null && proc.stdin) {
    const bytes =
      typeof opts.stdin === 'string' ? new TextEncoder().encode(opts.stdin) : opts.stdin;
    proc.stdin.write(bytes);
    proc.stdin.end();
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  if (opts?.killAfterMs != null) {
    timer = setTimeout(() => proc.kill(), opts.killAfterMs);
  }

  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    Bun.readableStreamToText(proc.stdout),
    Bun.readableStreamToText(proc.stderr),
  ]);
  if (timer) clearTimeout(timer);
  return { exitCode: exitCode ?? 1, stdout, stderr };
}
