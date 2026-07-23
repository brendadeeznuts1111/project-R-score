// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process
import { describe, expect, test } from 'bun:test';
import {
  BUN_DEFAULTS_CRON_SCHEDULE,
  BUN_DEFAULTS_CRON_TITLE,
  registerDefaultsVerifyCron,
  runDefaultsVerification,
} from '../lib/http/defaults-cron.ts';

describe('defaults-verify in-process Bun.cron', () => {
  test('schedule and title constants', () => {
    expect(BUN_DEFAULTS_CRON_TITLE).toBe('defaults-verify');
    expect(BUN_DEFAULTS_CRON_SCHEDULE).toMatch(/^\S+(\s+\S+){4}$/); // 5-field cron
  });

  test('registerDefaultsVerifyCron uses injectable scheduler (no real timer leak)', () => {
    const calls: string[] = [];
    const job = registerDefaultsVerifyCron(schedule => {
      calls.push(schedule);
      return { stop() {} };
    });
    expect(calls).toEqual([BUN_DEFAULTS_CRON_SCHEDULE]);
    expect(job).toBeDefined();
  });

  test('runDefaultsVerification writes proof and passes on this Bun', async () => {
    const path = `${process.env.TMPDIR || '/tmp'}/bun-defaults-cron-test-${Date.now()}.json`;
    const result = await runDefaultsVerification({ savePath: path, quiet: true });
    expect(result.code).toBe(0);
    expect(result.proof?.summary.failed).toBe(0);
    expect(result.proof?.cases.length).toBe(12);
    const disk = await Bun.file(path).json();
    expect(disk.proofHash).toMatch(/^[a-f0-9]{64}$/);
    expect(disk.summary.total).toBe(12);
  });
});
