// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
import { describe, expect, test } from 'bun:test';
import {
  OPS_SNAPSHOT_CRON_TITLE,
  OPS_SNAPSHOT_SCHEDULE,
  registerOpsSnapshotCron,
  runOpsSnapshotCycle,
} from '../lib/operations/snapshot-cron.ts';
import { scheduleInProcess } from '../lib/harness/cron.ts';
import { tenantById } from '../spine/tenants.ts';

describe('ops-snapshot in-process Bun.cron', () => {
  test('schedule is a 5-field cron expression (UTC complement)', () => {
    expect(OPS_SNAPSHOT_SCHEDULE.split(/\s+/).length).toBe(5);
    expect(OPS_SNAPSHOT_CRON_TITLE).toBe('ops-snapshot');
  });

  test('registerOpsSnapshotCron uses injectable scheduler (no real timer leak)', () => {
    const calls: string[] = [];
    const job = registerOpsSnapshotCron((schedule, handler) => {
      calls.push(schedule);
      expect(typeof handler).toBe('function');
      return { stop() {}, ref() {}, unref() {}, cron: schedule };
    });
    expect(calls).toEqual([OPS_SNAPSHOT_SCHEDULE]);
    expect(job).toBeDefined();
  });

  test('scheduleInProcess returns Disposable CronJob', () => {
    using job = scheduleInProcess('@hourly', () => {});
    expect(job.cron).toBe('@hourly');
    job.stop();
  });

  test('spine tenant ops-snapshot is registered', () => {
    const t = tenantById('ops-snapshot');
    expect(t).toBeDefined();
    expect(t!.schedule).toBe('*/10 * * * *');
  });

  test('runOpsSnapshotCycle --no-routing writes artifacts', async () => {
    const result = await runOpsSnapshotCycle({
      withRouting: false,
      withReport: false,
      withWebView: false,
      withStatic: true,
    });
    expect(result.code).toBe(0);
    expect(result.summary?.out).toBe('public/registry/ops-summary.json');
    expect(await Bun.file('public/registry/ops-summary.json').exists()).toBe(true);
    expect(await Bun.file('public/registry/static.json').exists()).toBe(true);
  }, 60_000);
});
