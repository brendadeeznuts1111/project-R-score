// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/child-process#exit-handling — exited and signalCode

import {
  drainLimited,
  monotonicDuration,
  failureOf,
  type ManagedProcessAttempt,
  type ManagedProcessOptions,
  type ManagedProcessResult,
} from './managed-process-support.ts';

export type {
  ManagedProcessAttempt,
  ManagedProcessFailure,
  ManagedProcessOptions,
  ManagedProcessResult,
} from './managed-process-support.ts';

const DEFAULT_TERMINATE_GRACE_MS = 1_000;
const DEFAULT_OUTPUT_LIMIT_BYTES = 1_048_576;
const MAX_RETRIES = 5;

function requireNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
}

function validateOptions(options: ManagedProcessOptions): void {
  if (options.command.length === 0 || options.command.some(part => part.length === 0)) {
    throw new TypeError('managed process command must contain non-empty argv entries');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new RangeError('managed process timeoutMs must be a positive integer');
  }

  const terminateGraceMs = options.terminateGraceMs ?? DEFAULT_TERMINATE_GRACE_MS;
  const retries = options.retries ?? 0;
  const retryBackoffMs = options.retryBackoffMs ?? 0;
  const outputLimitBytes = options.outputLimitBytes ?? DEFAULT_OUTPUT_LIMIT_BYTES;
  requireNonNegativeInteger(terminateGraceMs, 'managed process terminateGraceMs');
  requireNonNegativeInteger(retries, 'managed process retries');
  requireNonNegativeInteger(retryBackoffMs, 'managed process retryBackoffMs');
  requireNonNegativeInteger(outputLimitBytes, 'managed process outputLimitBytes');
  if (retries > MAX_RETRIES) {
    throw new RangeError(`managed process retries must be at most ${MAX_RETRIES}`);
  }
}

async function runAttempt(
  options: ManagedProcessOptions,
  attempt: number
): Promise<ManagedProcessAttempt> {
  const startedNs = Bun.nanoseconds();
  const startedAt = new Date().toISOString();
  const terminateGraceMs = options.terminateGraceMs ?? DEFAULT_TERMINATE_GRACE_MS;
  const outputLimitBytes = options.outputLimitBytes ?? DEFAULT_OUTPUT_LIMIT_BYTES;

  let proc: Bun.Subprocess<'ignore', 'pipe', 'pipe'>;
  try {
    proc = Bun.spawn([...options.command], {
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
      ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
      ...(options.env !== undefined ? { env: options.env } : {}),
    });
  } catch (error) {
    const endedNs = Bun.nanoseconds();
    return {
      attempt,
      status: 'spawn-error',
      startedAt,
      endedAt: new Date().toISOString(),
      ...monotonicDuration(startedNs, endedNs),
      pid: null,
      exitCode: null,
      signalCode: null,
      terminationRequested: false,
      hardKillRequested: false,
      stdout: '',
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  let terminationRequested = false;
  let hardKillRequested = false;
  let lifecycleError: string | null = null;
  let hardKillTimer: ReturnType<typeof setTimeout> | undefined;
  const timeoutTimer = setTimeout(() => {
    if (proc.exitCode !== null) return;
    terminationRequested = true;
    try {
      proc.kill('SIGTERM');
    } catch (error) {
      lifecycleError = `SIGTERM failed: ${error instanceof Error ? error.message : String(error)}`;
    }
    hardKillTimer = setTimeout(() => {
      if (proc.exitCode !== null) return;
      hardKillRequested = true;
      try {
        proc.kill('SIGKILL');
      } catch (error) {
        lifecycleError = `SIGKILL failed: ${error instanceof Error ? error.message : String(error)}`;
      }
    }, terminateGraceMs);
  }, options.timeoutMs);

  const stdoutPromise = drainLimited(proc.stdout, outputLimitBytes);
  const stderrPromise = drainLimited(proc.stderr, outputLimitBytes);
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    stdoutPromise,
    stderrPromise,
  ]).finally(() => {
    clearTimeout(timeoutTimer);
    if (hardKillTimer !== undefined) clearTimeout(hardKillTimer);
  });
  const endedNs = Bun.nanoseconds();

  return {
    attempt,
    status: terminationRequested ? 'timed-out' : exitCode === 0 ? 'succeeded' : 'failed',
    startedAt,
    endedAt: new Date().toISOString(),
    ...monotonicDuration(startedNs, endedNs),
    pid: proc.pid,
    exitCode,
    signalCode: proc.signalCode,
    terminationRequested,
    hardKillRequested,
    stdout: stdout.text,
    stderr: stderr.text,
    stdoutTruncated: stdout.truncated,
    stderrTruncated: stderr.truncated,
    error: lifecycleError,
  };
}

export async function runManagedProcess(
  options: ManagedProcessOptions
): Promise<ManagedProcessResult> {
  validateOptions(options);
  const startedNs = Bun.nanoseconds();
  const startedAt = new Date().toISOString();
  const retries = options.retries ?? 0;
  const retryOn = new Set(options.retryOn ?? ['spawn-error', 'timeout']);
  const attempts: ManagedProcessAttempt[] = [];

  for (let attemptNumber = 1; attemptNumber <= retries + 1; attemptNumber += 1) {
    const attempt = await runAttempt(options, attemptNumber);
    attempts.push(attempt);
    const failure = failureOf(attempt);
    if (failure === null || attemptNumber > retries || !retryOn.has(failure)) break;

    const baseDelayMs = options.retryBackoffMs ?? 0;
    const delayMs = baseDelayMs * 2 ** (attemptNumber - 1);
    if (delayMs > 0) await Bun.sleep(delayMs);
  }

  const final = attempts.at(-1);
  if (final === undefined) throw new Error('managed process produced no attempts');
  const endedNs = Bun.nanoseconds();
  return {
    ok: final.status === 'succeeded',
    command: [...options.command],
    startedAt,
    endedAt: new Date().toISOString(),
    ...monotonicDuration(startedNs, endedNs),
    attempts,
    final,
  };
}
