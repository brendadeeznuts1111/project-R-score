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
import { createTestWorkspace } from './harness.ts';

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

  test('runOpsSnapshotCycle delegates isolated artifact writes', async () => {
    await using workspace = await createTestWorkspace('factorywager-ops-snapshot-');
    const outPath = workspace.resolve('ops-summary.json');
    const staticPath = workspace.resolve('static.json');
    const calls: Array<Record<string, unknown>> = [];

    const result = await runOpsSnapshotCycle(
      {
        withRouting: false,
        withReport: false,
        withWebView: false,
        withStatic: true,
        prepareState: false,
        withLoopAutomation: false,
      },
      {
        buildSnapshot: async options => {
          calls.push({ ...options });
          await Bun.write(outPath, `${JSON.stringify({ source: 'test' })}\n`);
          await Bun.write(staticPath, `${JSON.stringify({ source: 'test' })}\n`);
          return { out: outPath, static: staticPath };
        },
      }
    );

    expect(result.code).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      withRouting: false,
      withReport: false,
      withWebView: false,
      withStatic: true,
    });
    expect(result.summary).toMatchObject({ out: outPath, static: staticPath });
    expect(await Bun.file(outPath).json()).toEqual({ source: 'test' });
    expect(await Bun.file(staticPath).json()).toEqual({ source: 'test' });
  });
});
