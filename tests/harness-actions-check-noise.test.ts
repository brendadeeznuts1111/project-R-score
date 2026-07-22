/**
 * Pure classifier fixtures for GHA billing/offline noise (no network).
 */
import { describe, expect, test } from 'bun:test';
import {
  OFFLINE_FAIL_MS,
  actionsNoiseSummaryLine,
  actionableActionsChecks,
  classifyActionsCheck,
  classifyActionsChecks,
  durationMsBetween,
  nonNoiseActionsChecks,
  normalizeCheckOutcome,
  parseGhCheckRunRow,
  parseGhPrCheckRow,
  summarizeActionsChecks,
  type ActionsCheckSignals,
} from '../lib/harness/actions-check-noise';

describe('durationMsBetween', () => {
  test('computes ms from ISO timestamps', () => {
    expect(
      durationMsBetween('2026-07-22T01:14:54Z', '2026-07-22T01:14:56Z')
    ).toBe(2000);
  });

  test('ignores GitHub zero-dates', () => {
    expect(durationMsBetween('0001-01-01T00:00:00Z', '0001-01-01T00:00:00Z')).toBe(null);
  });
});

describe('normalizeCheckOutcome', () => {
  test('prefers bucket from gh pr checks', () => {
    expect(normalizeCheckOutcome({ name: 'x', bucket: 'fail', state: 'SUCCESS' })).toBe(
      'failure'
    );
    expect(normalizeCheckOutcome({ name: 'x', bucket: 'pass' })).toBe('success');
    expect(normalizeCheckOutcome({ name: 'x', bucket: 'pending' })).toBe('pending');
  });

  test('maps check-run conclusions', () => {
    expect(normalizeCheckOutcome({ name: 'x', conclusion: 'startup_failure' })).toBe(
      'failure'
    );
    expect(normalizeCheckOutcome({ name: 'x', conclusion: 'success' })).toBe('success');
  });
});

describe('classifyActionsCheck', () => {
  test('short failure from gh pr checks → known-offline', () => {
    const row: ActionsCheckSignals = {
      name: 'Harness',
      state: 'FAILURE',
      bucket: 'fail',
      startedAt: '2026-07-22T01:14:54Z',
      completedAt: '2026-07-22T01:14:56Z',
    };
    expect(classifyActionsCheck(row)).toBe('known-offline');
    expect(durationMsBetween(row.startedAt, row.completedAt)).toBeLessThan(OFFLINE_FAIL_MS);
  });

  test('empty steps + failure → known-offline', () => {
    expect(
      classifyActionsCheck({
        name: 'Type Check',
        conclusion: 'failure',
        stepCount: 0,
        durationMs: 60_000,
      })
    ).toBe('known-offline');
  });

  test('missing runner (null or 0) + failure → known-offline', () => {
    expect(
      classifyActionsCheck({
        name: 'hygiene',
        conclusion: 'failure',
        runnerId: null,
        durationMs: 60_000,
      })
    ).toBe('known-offline');
    expect(
      classifyActionsCheck({
        name: 'hygiene',
        conclusion: 'failure',
        runnerId: 0,
        durationMs: 60_000,
      })
    ).toBe('known-offline');
  });

  test('long failure without offline signals → real', () => {
    expect(
      classifyActionsCheck({
        name: 'Harness',
        conclusion: 'failure',
        durationMs: 45_000,
        stepCount: 12,
        runnerId: 42,
      })
    ).toBe('real');
  });

  test('omitted stepCount/runnerId do not forge offline by themselves', () => {
    expect(
      classifyActionsCheck({
        name: 'Harness',
        conclusion: 'failure',
        durationMs: 45_000,
      })
    ).toBe('real');
  });

  test('success / cancelled / skipped → pass', () => {
    expect(classifyActionsCheck({ name: 'a', conclusion: 'success' })).toBe('pass');
    expect(classifyActionsCheck({ name: 'b', bucket: 'pass', state: 'SUCCESS' })).toBe('pass');
    expect(classifyActionsCheck({ name: 'c', conclusion: 'cancelled' })).toBe('pass');
    expect(classifyActionsCheck({ name: 'd', conclusion: 'skipped' })).toBe('pass');
  });

  test('pending → pending', () => {
    expect(classifyActionsCheck({ name: 'e', bucket: 'pending', state: 'PENDING' })).toBe(
      'pending'
    );
    expect(classifyActionsCheck({ name: 'f', state: 'in_progress' })).toBe('pending');
  });
});

describe('boundary parsers', () => {
  test('parseGhPrCheckRow', () => {
    const row = parseGhPrCheckRow({
      name: 'polish',
      state: 'FAILURE',
      bucket: 'fail',
      link: 'https://example.com',
      startedAt: '2026-07-22T01:14:54Z',
      completedAt: '2026-07-22T01:14:56Z',
    });
    expect(row?.name).toBe('polish');
    expect(classifyActionsCheck(row!)).toBe('known-offline');
  });

  test('parseGhCheckRunRow observes runner_id + steps', () => {
    const offline = parseGhCheckRunRow({
      name: 'Type Check',
      conclusion: 'failure',
      status: 'completed',
      started_at: '2026-07-22T01:14:54Z',
      completed_at: '2026-07-22T01:14:56Z',
      steps: [],
      runner_id: 0,
      html_url: 'https://example.com/job',
    });
    expect(offline?.stepCount).toBe(0);
    expect(offline?.runnerId).toBe(0);
    expect(classifyActionsCheck(offline!)).toBe('known-offline');

    const real = parseGhCheckRunRow({
      name: 'Harness',
      conclusion: 'failure',
      status: 'completed',
      started_at: '2026-07-22T01:00:00Z',
      completed_at: '2026-07-22T01:05:00Z',
      steps: [{ name: 'Checkout' }, { name: 'Test' }],
      runner_id: 7,
    });
    expect(real?.stepCount).toBe(2);
    expect(classifyActionsCheck(real!)).toBe('real');
  });

  test('steps:null on list endpoint does not count as empty steps', () => {
    const row = parseGhCheckRunRow({
      name: 'Harness',
      conclusion: 'failure',
      status: 'completed',
      started_at: '2026-07-22T01:00:00Z',
      completed_at: '2026-07-22T01:05:00Z',
      steps: null,
    });
    expect(row?.stepCount).toBeUndefined();
    expect(classifyActionsCheck(row!)).toBe('real');
  });
});

describe('summaries', () => {
  test('aggregates classes and summary line', () => {
    const classified = classifyActionsChecks([
      {
        name: 'offline',
        state: 'FAILURE',
        bucket: 'fail',
        durationMs: 2000,
      },
      {
        name: 'real',
        conclusion: 'failure',
        durationMs: 30_000,
        stepCount: 3,
        runnerId: 1,
      },
      { name: 'ok', conclusion: 'success' },
      { name: 'wait', bucket: 'pending' },
    ]);
    const summary = summarizeActionsChecks(classified);
    expect(summary).toEqual({
      knownOffline: 1,
      real: 1,
      pass: 1,
      pending: 1,
      total: 4,
    });
    expect(actionsNoiseSummaryLine(summary.knownOffline)).toContain('1 checks ignored');
    expect(nonNoiseActionsChecks(classified).map(r => r.name).sort()).toEqual([
      'ok',
      'real',
      'wait',
    ]);
    expect(actionableActionsChecks(classified).map(r => r.name).sort()).toEqual([
      'real',
      'wait',
    ]);
  });
});
