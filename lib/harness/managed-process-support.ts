export type ManagedProcessFailure = 'exit' | 'spawn-error' | 'timeout';

export interface ManagedProcessOptions {
  command: readonly string[];
  timeoutMs: number;
  cwd?: string;
  env?: Record<string, string | undefined>;
  terminateGraceMs?: number;
  retries?: number;
  retryBackoffMs?: number;
  retryOn?: readonly ManagedProcessFailure[];
  outputLimitBytes?: number;
}

export interface MonotonicDuration {
  durationNs: number;
  durationMs: number;
  clockSource: 'bun.nanoseconds';
}

export interface ManagedProcessAttempt extends MonotonicDuration {
  attempt: number;
  status: 'failed' | 'spawn-error' | 'succeeded' | 'timed-out';
  startedAt: string;
  endedAt: string;
  pid: number | null;
  exitCode: number | null;
  signalCode: NodeJS.Signals | null;
  terminationRequested: boolean;
  hardKillRequested: boolean;
  stdout: string;
  stderr: string;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  error: string | null;
}

export function monotonicDuration(startedNs: number, endedNs: number): MonotonicDuration {
  const durationNs = Math.max(0, Math.round(endedNs - startedNs));
  return {
    durationNs,
    durationMs: durationNs / 1_000_000,
    clockSource: 'bun.nanoseconds',
  };
}

export interface ManagedProcessResult extends MonotonicDuration {
  ok: boolean;
  command: string[];
  startedAt: string;
  endedAt: string;
  attempts: ManagedProcessAttempt[];
  final: ManagedProcessAttempt;
}

export interface LimitedOutput {
  text: string;
  truncated: boolean;
}

export async function drainLimited(
  stream: ReadableStream<Uint8Array>,
  limitBytes: number
): Promise<LimitedOutput> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let retainedBytes = 0;
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      const remaining = limitBytes - retainedBytes;
      if (remaining > 0) {
        const retained = value.byteLength <= remaining ? value : value.subarray(0, remaining);
        chunks.push(retained);
        retainedBytes += retained.byteLength;
      }
    }
  } finally {
    reader.releaseLock();
  }

  const joined = new Uint8Array(retainedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {
    text: new TextDecoder().decode(joined),
    truncated: totalBytes > retainedBytes,
  };
}

export function failureOf(attempt: ManagedProcessAttempt): ManagedProcessFailure | null {
  if (attempt.status === 'spawn-error') return 'spawn-error';
  if (attempt.status === 'timed-out') return 'timeout';
  if (attempt.status === 'failed') return 'exit';
  return null;
}
