import { describe, expect, test } from 'bun:test';
import {
  calculateNetDrift,
  calculateVariance,
  checkAnchorStability,
  groupByMarket,
  scanStaleAnchors,
  splitWindows,
  type StaleAnchorSignal,
} from '../lib/operations/anchor-stability.ts';
import type { LimitHistoryRow } from '../lib/research/limit-tracker.ts';

function row(partial: Partial<LimitHistoryRow> & { maxStakeUsd: number }): LimitHistoryRow {
  return {
    id: partial.id ?? 1, // brand-ok — opaque research/wire id
    partnerId: partial.partnerId ?? 'parlay21-com',
    accountId: partial.accountId ?? 'acct-1', // brand-ok
    marketId: partial.marketId ?? 'nba-bucks-celtics', // brand-ok
    sport: partial.sport ?? 'basketball',
    league: partial.league ?? 'NBA',
    marketType: partial.marketType ?? 'moneyline',
    maxStakeUsd: partial.maxStakeUsd,
    currency: partial.currency ?? 'USD',
    source: partial.source ?? 'agent',
    observedAt: partial.observedAt ?? '2026-08-06T00:00:00.000Z',
  };
}

/** Newest-first history, oldest→newest = 300,200,100,100,100,100 (|drift|≥100). */
function staleFixture(): LimitHistoryRow[] {
  return [
    row({ observedAt: '2026-08-06T05:00:00.000Z', maxStakeUsd: 100 }),
    row({ observedAt: '2026-08-06T04:00:00.000Z', maxStakeUsd: 100 }),
    row({ observedAt: '2026-08-06T03:00:00.000Z', maxStakeUsd: 100 }),
    row({ observedAt: '2026-08-06T02:00:00.000Z', maxStakeUsd: 100 }),
    row({ observedAt: '2026-08-06T01:00:00.000Z', maxStakeUsd: 200 }),
    row({ observedAt: '2026-08-06T00:00:00.000Z', maxStakeUsd: 300 }),
  ];
}

describe('anchor stability analysis', () => {
  test('splitWindows halves newest-first history into oldest→newest windows', () => {
    const { drift, stability } = splitWindows(staleFixture());
    expect(drift.map(r => r.maxStakeUsd)).toEqual([300, 200, 100]);
    expect(stability.map(r => r.maxStakeUsd)).toEqual([100, 100, 100]);
  });

  test('calculateNetDrift is last - first across the window', () => {
    const { drift } = splitWindows(staleFixture());
    expect(calculateNetDrift(drift)).toBe(-200); // 100 - 300
    expect(calculateNetDrift([])).toBe(0);
    expect(calculateNetDrift([row({ maxStakeUsd: 100 })])).toBe(0);
  });

  test('calculateVariance is zero for a flat window, positive for drift', () => {
    expect(calculateVariance([row({ maxStakeUsd: 100 }), row({ maxStakeUsd: 100 })])).toBe(0);
    expect(calculateVariance([row({ maxStakeUsd: 0 }), row({ maxStakeUsd: 100 })])).toBe(2500);
  });

  test('stale anchor: drifted then stable emits a signal', () => {
    const signal = checkAnchorStability(staleFixture());
    expect(signal).not.toBeNull();
    if (!signal) return;
    expect(signal.kind).toBe('stale_anchor');
    expect(signal.driftUsd).toBe(-200);
    expect(signal.varianceUsd).toBe(0);
    expect(signal.currentMaxStakeUsd).toBe(100);
    expect(signal.windows).toEqual([3, 3]);
    expect(signal.detail).toContain('parlay21-com');
  });

  test('no signal when the stability window still moves (not equilibrated)', () => {
    const moving = [
      row({ observedAt: '2026-08-06T04:00:00.000Z', maxStakeUsd: 180 }),
      row({ observedAt: '2026-08-06T03:00:00.000Z', maxStakeUsd: 140 }),
      row({ observedAt: '2026-08-06T02:00:00.000Z', maxStakeUsd: 100 }),
      row({ observedAt: '2026-08-06T01:00:00.000Z', maxStakeUsd: 150 }),
      row({ observedAt: '2026-08-06T00:00:00.000Z', maxStakeUsd: 200 }),
    ];
    expect(checkAnchorStability(moving)).toBeNull();
  });

  test('no signal when drift is below minDriftUsd', () => {
    const signal = checkAnchorStability(staleFixture(), { minDriftUsd: 500 });
    expect(signal).toBeNull();
  });

  test('no signal when either window is too small', () => {
    expect(checkAnchorStability([row({ maxStakeUsd: 100 }), row({ maxStakeUsd: 100 })])).toBeNull();
  });

  test('groupByMarket separates partner/market keys', () => {
    const rows = [
      row({ partnerId: 'p1', marketId: 'm1', maxStakeUsd: 100 }),
      row({ partnerId: 'p1', marketId: 'm2', maxStakeUsd: 100 }),
      row({ partnerId: 'p2', marketId: 'm1', maxStakeUsd: 100 }),
    ];
    expect(groupByMarket(rows).size).toBe(3);
  });

  test('scanStaleAnchors aggregates signals across partners/markets', () => {
    const signals = scanStaleAnchors(
      {
        'parlay21-com': staleFixture(),
        'pinnacle': [
          row({ partnerId: 'pinnacle', maxStakeUsd: 100 }),
          row({ partnerId: 'pinnacle', maxStakeUsd: 100 }),
          row({ partnerId: 'pinnacle', maxStakeUsd: 100 }),
          row({ partnerId: 'pinnacle', maxStakeUsd: 200 }),
          row({ partnerId: 'pinnacle', maxStakeUsd: 200 }),
        ],
      },
      { minDriftUsd: 50 }
    );
    expect(signals).toHaveLength(1);
    expect(signals[0].partnerId).toBe('parlay21-com');
    expect((signals[0] as StaleAnchorSignal).kind).toBe('stale_anchor');
  });
});
