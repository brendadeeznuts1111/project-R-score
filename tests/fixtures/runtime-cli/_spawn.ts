/** Shared spawn helper for runtime-cli fixture tests. */

export async function runBun(
  args: string[],
  cwd: string,
  opts?: { killAfterMs?: number }
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(['bun', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1' },
  });

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
