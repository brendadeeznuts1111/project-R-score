// @see https://bun.com/docs/test/writing-tests#type-testing — expectTypeOf via tsc
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process
// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  registerPortalSnapshotCron,
  runPortalSnapshotCycle,
} from '../lib/operations/portal-snapshot-cron.ts';
import {
  PORTAL_SNAPSHOT_CRON_TITLE,
  PORTAL_SNAPSHOT_INPROCESS_SCHEDULE,
  PORTAL_SNAPSHOT_OS_SCHEDULE,
  resolvePortalSnapshotScopes,
} from '../tools/portal-snapshot-cron-constants.ts';
import { parseCron } from '../lib/harness/cron.ts';

describe('portal-snapshot-cron constants', () => {
  test('default schedules are non-empty cron expressions', () => {
    expect(PORTAL_SNAPSHOT_OS_SCHEDULE.length).toBeGreaterThan(0);
    expect(PORTAL_SNAPSHOT_INPROCESS_SCHEDULE.length).toBeGreaterThan(0);
    expect(PORTAL_SNAPSHOT_CRON_TITLE).toBe('portal-snapshot');
  });

  test('resolvePortalSnapshotScopes defaults to prediction', () => {
    const prev = Bun.env.PORTAL_SNAPSHOT_SCOPES;
    const prevScope = Bun.env.PORTAL_SCOPE;
    delete Bun.env.PORTAL_SNAPSHOT_SCOPES;
    delete Bun.env.PORTAL_SCOPE;
    try {
      expect(resolvePortalSnapshotScopes()).toEqual(['prediction']);
    } finally {
      if (prev !== undefined) Bun.env.PORTAL_SNAPSHOT_SCOPES = prev;
      else delete Bun.env.PORTAL_SNAPSHOT_SCOPES;
      if (prevScope !== undefined) Bun.env.PORTAL_SCOPE = prevScope;
      else delete Bun.env.PORTAL_SCOPE;
    }
  });

  test('resolvePortalSnapshotScopes parses comma list', () => {
    const prev = Bun.env.PORTAL_SNAPSHOT_SCOPES;
    Bun.env.PORTAL_SNAPSHOT_SCOPES = 'prediction, portal, gaps, bad';
    try {
      expect(resolvePortalSnapshotScopes()).toEqual(['prediction', 'portal', 'gaps']);
    } finally {
      if (prev !== undefined) Bun.env.PORTAL_SNAPSHOT_SCOPES = prev;
      else delete Bun.env.PORTAL_SNAPSHOT_SCOPES;
    }
  });

  test('in-process schedule parses in UTC via Bun.cron.parse', () => {
    const from = new Date(Date.UTC(2026, 6, 28, 5, 0, 0));
    const next = parseCron(PORTAL_SNAPSHOT_INPROCESS_SCHEDULE, from);
    expect(next).toBeInstanceOf(Date);
    expect(next!.getTime()).toBeGreaterThan(from.getTime());
  });
});

describe('portal-snapshot-cron cycle', () => {
  test('runPortalSnapshotCycle dry-run succeeds for prediction', async () => {
    const result = await runPortalSnapshotCycle({
      dryRun: true,
      scopes: ['prediction'],
    });
    expect(result.code).toBe(0);
    expect(result.scopes).toHaveLength(1);
    expect(result.scopes[0]!.scope).toBe('prediction');
    expect(result.scopes[0]!.ok).toBe(true);
  });

  test('registerPortalSnapshotCron returns Disposable CronJob', () => {
    const ticks: string[] = [];
    const mockScheduler = (schedule: string, handler: () => void | Promise<void>) => {
      ticks.push(schedule);
      return {
        cron: schedule,
        [Symbol.dispose]: () => {},
        ref: () => mockScheduler as unknown as Bun.CronJob,
        unref: () => mockScheduler as unknown as Bun.CronJob,
        stop: () => {},
      } as unknown as Bun.CronJob;
    };
    {
      using _job = registerPortalSnapshotCron(mockScheduler, { dryRun: true }) as Bun.CronJob;
      expect(ticks[0]).toBe(PORTAL_SNAPSHOT_INPROCESS_SCHEDULE);
    }
  });
});
