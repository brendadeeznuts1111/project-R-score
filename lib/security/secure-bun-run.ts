// lib/security/secure-bun-run.ts — Secure Bun.spawn wrapper with command validation and timeout

export interface SecureRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
}

const SHELL_META_RE = /[;&|`]|\$\(|\)\s/;
const PATH_TRAVERSAL_RE = /\.\./;

/**
 * Run a Bun script securely with command validation, timeout, and structured result.
 *
 * Rejects shell metacharacters, path traversal, and non-existent scripts.
 * Kills the process on timeout and always cleans up.
 */
export async function secureBunRun(
  script: string,
  opts: {
    args?: string[];
    timeout?: number;
    cwd?: string;
    env?: Record<string, string>;
  } = {}
): Promise<SecureRunResult> {
  const { args = [], timeout = 30_000, cwd, env } = opts;

  // Validate script path
  if (SHELL_META_RE.test(script)) {
    throw new Error('Script path contains shell metacharacters');
  }
  if (PATH_TRAVERSAL_RE.test(script)) {
    throw new Error('Script path contains path traversal');
  }

  // Validate args
  for (const arg of args) {
    if (typeof arg !== 'string') {
      throw new Error('All arguments must be strings');
    }
    if (SHELL_META_RE.test(arg)) {
      throw new Error(`Argument contains shell metacharacters: ${arg}`);
    }
  }

  // Verify script exists
  const exists = await Bun.file(script).exists();
  if (!exists) {
    throw new Error(`Script not found: ${script}`);
  }

  const start = performance.now();
  let timedOut = false;

  const proc = Bun.spawn(['bun', script, ...args], {
    cwd,
    env: env ? { ...process.env, ...env } : undefined,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Race the process against a timeout
  const timer = timeout > 0
    ? setTimeout(() => {
        timedOut = true;
        proc.kill();
      }, timeout)
    : null;

  try {
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    await proc.exited;

    return {
      stdout,
      stderr,
      exitCode: proc.exitCode ?? 1,
      timedOut,
      durationMs: Math.round(performance.now() - start),
    };
  } finally {
    if (timer !== null) clearTimeout(timer);
    // Ensure cleanup if process is still running
    try { proc.kill(); } catch { /* already exited */ }
  }
}
