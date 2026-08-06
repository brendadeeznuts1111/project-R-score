import { describe, expect, test } from 'bun:test';
import { recordLimit } from '../lib/research/limit-tracker.ts';
import { buildStaleAnchorsBake } from '../tools/bake-stale-anchors.ts';
import { ANCHOR_SCAN_CRON_SCHEDULE, ANCHOR_SCAN_CRON_TITLE } from '../tools/ops-anchor-scan-cron.ts';
import { parseCron } from '../lib/harness/cron.ts';

function tmpLimitsDb(): string {
  return `/tmp/anchor-bake-test-${Date.now()}-${Math.floor(Math.random() * 1e9)}.db`;
}

describe('stale-anchors bake', () => {
  test('empty db bakes a zero-signal artifact with schema', () => {
    const payload = buildStaleAnchorsBake({ path: tmpLimitsDb() });
    expect(payload.schema).toBe('stale-anchors.v1');
    expect(payload.ok).toBe(true);
    expect(payload.scanned).toBe(0);
    expect(payload.signalCount).toBe(0);
    expect(payload.signals).toEqual([]);
    expect(payload.generatedAt).toBeTruthy();
  });

  test('bake surfaces signals from seeded drift-then-flat history', () => {
    const dbPath = tmpLimitsDb();
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 100, currency: 'USD', source: 'test', observedAt: '2026-08-06T04:00:00.000Z' }, dbPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 100, currency: 'USD', source: 'test', observedAt: '2026-08-06T03:00:00.000Z' }, dbPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 100, currency: 'USD', source: 'test', observedAt: '2026-08-06T02:00:00.000Z' }, dbPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 150, currency: 'USD', source: 'test', observedAt: '2026-08-06T01:00:00.000Z' }, dbPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 200, currency: 'USD', source: 'test', observedAt: '2026-08-06T00:00:00.000Z' }, dbPath);

    const payload = buildStaleAnchorsBake({ path: dbPath, minDriftUsd: 50 });
    expect(payload.scanned).toBe(1);
    expect(payload.signalCount).toBe(1);
    expect(payload.signals[0].kind).toBe('stale_anchor');
    expect(payload.signals[0].driftUsd).toBe(-50);
  });
});

describe('anchor-scan cron', () => {
  test('schedule is every 15 minutes and parses to a future time', () => {
    expect(ANCHOR_SCAN_CRON_SCHEDULE).toBe('*/15 * * * *');
    expect(ANCHOR_SCAN_CRON_TITLE).toBe('anchor-scan');
    const next = parseCron(ANCHOR_SCAN_CRON_SCHEDULE, new Date());
    expect(next).not.toBeNull();
    if (next) expect(next.getTime()).toBeGreaterThan(Date.now() - 1000);
  });
});
