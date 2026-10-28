import { describe, expect, test } from 'bun:test';
import { runManagedProcess } from '../lib/harness/managed-process.ts';
import { monotonicDuration } from '../lib/harness/managed-process-support.ts';

const bun = process.execPath;

describe('runManagedProcess', () => {
  test('captures successful output and structured evidence', async () => {
    const result = await runManagedProcess({
      command: [bun, '-e', 'console.log("ready"); console.error("trace")'],
      timeoutMs: 2_000,
    });

    expect(result.ok).toBe(true);
    expect(result.attempts).toHaveLength(1);
    expect(result.final).toMatchObject({
      attempt: 1,
      status: 'succeeded',
      exitCode: 0,
      terminationRequested: false,
      hardKillRequested: false,
      clockSource: 'bun.nanoseconds',
      stdout: 'ready\n',
      stderr: 'trace\n',
    });
    expect(result.final.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.final.endedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.final.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.clockSource).toBe('bun.nanoseconds');
    expect(result.durationMs).toBe(result.durationNs / 1_000_000);
    expect(result.durationMs).toBeGreaterThanOrEqual(result.final.durationMs);
  });

  test('converts monotonic nanoseconds without consulting wall time', () => {
    expect(monotonicDuration(8_000_000, 9_250_000)).toEqual({
      durationNs: 1_250_000,
      durationMs: 1.25,
      clockSource: 'bun.nanoseconds',
    });
    expect(monotonicDuration(9_250_000, 8_000_000).durationNs).toBe(0);
  });

  test('keeps attempt duration monotonic when the wall clock moves backward', async () => {
    const originalDateNow = Date.now;
    let wallTime = 2_000_000_000_000;
    Date.now = () => (wallTime -= 60_000);
    try {
      const result = await runManagedProcess({
        command: [bun, '-e', 'await Bun.sleep(20)'],
        timeoutMs: 2_000,
      });
      expect(result.clockSource).toBe('bun.nanoseconds');
      expect(result.durationMs).toBeGreaterThanOrEqual(20);
      expect(result.durationMs).toBeLessThan(2_000);
    } finally {
      Date.now = originalDateNow;
    }
  });

  test('terminates a hung child and escalates after the grace window', async () => {
    const result = await runManagedProcess({
      command: [
        bun,
        '-e',
        'process.on("SIGTERM", () => {}); setInterval(() => {}, 1_000);',
      ],
      timeoutMs: 80,
      terminateGraceMs: 40,
    });

    expect(result.ok).toBe(false);
    expect(result.final.status).toBe('timed-out');
    expect(result.final.terminationRequested).toBe(true);
    expect(result.final.hardKillRequested).toBe(true);
    expect(result.final.signalCode).toBe('SIGKILL');
  });

  test('retries only explicitly selected failure classes', async () => {
    const noRetry = await runManagedProcess({
      command: [bun, '-e', 'process.exit(7)'],
      timeoutMs: 2_000,
      retries: 2,
    });
    expect(noRetry.attempts).toHaveLength(1);
    expect(noRetry.final.status).toBe('failed');

    const retried = await runManagedProcess({
      command: [bun, '-e', 'process.exit(7)'],
      timeoutMs: 2_000,
      retries: 2,
      retryOn: ['exit'],
      retryBackoffMs: 15,
    });
    expect(retried.attempts).toHaveLength(3);
    expect(retried.attempts.map(attempt => attempt.attempt)).toEqual([1, 2, 3]);
    const attemptDurationNs = retried.attempts.reduce(
      (total, attempt) => total + attempt.durationNs,
      0
    );
    expect(retried.durationNs - attemptDurationNs).toBeGreaterThanOrEqual(35_000_000);
  });

  test('records spawn failures without losing retry evidence', async () => {
    const result = await runManagedProcess({
      command: ['/definitely/not/a/project-r-executable'],
      timeoutMs: 1_000,
      retries: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.attempts).toHaveLength(2);
    expect(result.final.status).toBe('spawn-error');
    expect(result.final.error).not.toBeNull();
  });

  test('drains output while retaining only the configured prefix', async () => {
    const result = await runManagedProcess({
      command: [bun, '-e', 'console.log("abcdefghij")'],
      timeoutMs: 2_000,
      outputLimitBytes: 5,
    });

    expect(result.ok).toBe(true);
    expect(result.final.stdout).toBe('abcde');
    expect(result.final.stdoutTruncated).toBe(true);
  });

  test('rejects unsafe lifecycle configuration before spawning', async () => {
    await expect(runManagedProcess({ command: [], timeoutMs: 1_000 })).rejects.toThrow(
      'non-empty argv'
    );
    await expect(
      runManagedProcess({ command: [bun], timeoutMs: 0 })
    ).rejects.toThrow('positive integer');
    await expect(
      runManagedProcess({ command: [bun], timeoutMs: 1_000, retries: 6 })
    ).rejects.toThrow('at most 5');
  });
});
