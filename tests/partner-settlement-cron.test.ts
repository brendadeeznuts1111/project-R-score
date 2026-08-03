// partner-settlement-cron.test.ts — weekly settlement OS-cron wiring.

import { describe, expect, test } from 'bun:test';
import { parseCron } from '../lib/harness/cron';
import worker from '../lib/partner-profile/settlement-cron-worker';
import {
  SETTLEMENT_CRON_SCHEDULE,
  startOfWeek,
} from '../lib/partner-profile/settlement-runner';
import {
  SETTLEMENT_CRON_TITLE,
  SETTLEMENT_CRON_WORKER,
} from '../tools/partner-settlement-cron';

describe('settlement cron wiring', () => {
  test('schedule parses and fires weekly (Sunday midnight)', () => {
    expect(SETTLEMENT_CRON_SCHEDULE).toBe('0 0 * * 0');
    const next = parseCron(SETTLEMENT_CRON_SCHEDULE, new Date('2026-08-03T00:00:00Z'));
    expect(next).not.toBeNull();
    expect(next!.getUTCDay()).toBe(0); // Sunday
    expect(next!.getUTCHours()).toBe(0);
  });

  test('worker module exposes the scheduled handler', () => {
    expect(typeof (worker as { scheduled: unknown }).scheduled).toBe('function');
  });

  test('register metadata points at the runner worker with a stable title', () => {
    expect(SETTLEMENT_CRON_WORKER).toContain('settlement-cron-worker.ts');
    expect(SETTLEMENT_CRON_TITLE).toBe('partner-settlement');
  });

  test('the default period is the ISO week start (stable period-<weekStart> reference)', () => {
    const monday = startOfWeek(new Date('2026-08-05T12:00:00Z')); // Wednesday
    expect(monday.toISOString().slice(0, 10)).toBe('2026-08-03'); // Monday
  });
});

void 0;
