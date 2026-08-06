import { describe, expect, test } from 'bun:test';
import {
  calculateNetDrift,
  calculateVariance,
  checkAnchorStability,
  groupByMarket,
  listPartnersWithHistory,
  scanStaleAnchors,
  scanStaleAnchorsFromDb,
  splitWindows,
  type StaleAnchorSignal,
} from '../lib/operations/anchor-stability.ts';
import { recordLimit } from '../lib/research/limit-tracker.ts';
import type { LimitHistoryRow } from '../lib/research/limit-tracker.ts';

function tmpLimitsDb(): string {
  return `/tmp/anchor-stability-test-${Date.now()}-${Math.floor(Math.random() * 1e9)}.db`;
}

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

  test('listPartnersWithHistory enumerates distinct partners from the limits db', () => {
    const dbPath = tmpLimitsDb();
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 100, currency: 'USD', source: 'test', observedAt: '2026-08-06T00:00:00.000Z' }, dbPath);
    recordLimit({ partnerId: 'pinnacle', marketId: 'm1', sport: 'tennis', league: 'ATP', marketType: 'moneyline', maxStakeUsd: 200, currency: 'USD', source: 'test', observedAt: '2026-08-06T00:00:00.000Z' }, dbPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm2', sport: 'basketball', league: 'NBA', marketType: 'spread', maxStakeUsd: 150, currency: 'USD', source: 'test', observedAt: '2026-08-06T00:00:00.000Z' }, dbPath);
    const partners = listPartnersWithHistory({ path: dbPath });
    expect(partners.sort()).toEqual(['parlay21-com', 'pinnacle']);
  });

  test('scanStaleAnchorsFromDb reads live history and is safe on an empty db', () => {
    const empty = scanStaleAnchorsFromDb({ path: tmpLimitsDb() });
    expect(empty.ok).toBe(true);
    expect(empty.scanned).toBe(0);
    expect(empty.signals).toEqual([]);
    expect(empty.generatedAt).toBeTruthy();

    const dbPath = tmpLimitsDb();
    // newest-first: stable at 100 after drifting down from 200
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 100, currency: 'USD', source: 'test', observedAt: '2026-08-06T04:00:00.000Z' }, dbPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 100, currency: 'USD', source: 'test', observedAt: '2026-08-06T03:00:00.000Z' }, dbPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 100, currency: 'USD', source: 'test', observedAt: '2026-08-06T02:00:00.000Z' }, dbPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 150, currency: 'USD', source: 'test', observedAt: '2026-08-06T01:00:00.000Z' }, dbPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 200, currency: 'USD', source: 'test', observedAt: '2026-08-06T00:00:00.000Z' }, dbPath);
    const scan = scanStaleAnchorsFromDb({ path: dbPath, minDriftUsd: 50 });
    expect(scan.scanned).toBe(1);
    expect(scan.signals).toHaveLength(1);
    expect(scan.signals[0].driftUsd).toBe(-50);
    expect(scan.signals[0].currentMaxStakeUsd).toBe(100);
  });

  test('runBookReconciliation appends stale_anchor mismatches when anchorScan is on', async () => {
    const { openOperationsDb } = await import('../lib/operations/db.ts');
    const { initSchema } = await import('../lib/operations/schema.ts');
    const { runBookReconciliation } = await import('../lib/operations/book-reconcile.ts');

    const db = openOperationsDb({ path: ':memory:' });
    initSchema(db);
    // one active account whose reported balance matches (no book_balance mismatch)
    db.run(
      `INSERT INTO tree_nodes (id, type, name, created_at) VALUES ('agent-1', 'agent', 'agent-1', '2026-08-06T00:00:00.000Z')`
    );
    db.run(
      `INSERT INTO sb_accounts (id, agent_id, book, username, balance, status, login_method, created_at)
       VALUES ('acct-1', 'agent-1', 'draftkings', 'u1', 1000, 'active', 'webview', '2026-08-06T00:00:00.000Z')`
    );

    // seed a stale anchor in a temp limits db
    const limitsPath = tmpLimitsDb();
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 100, currency: 'USD', source: 'test', observedAt: '2026-08-06T04:00:00.000Z' }, limitsPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 100, currency: 'USD', source: 'test', observedAt: '2026-08-06T03:00:00.000Z' }, limitsPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 100, currency: 'USD', source: 'test', observedAt: '2026-08-06T02:00:00.000Z' }, limitsPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 150, currency: 'USD', source: 'test', observedAt: '2026-08-06T01:00:00.000Z' }, limitsPath);
    recordLimit({ partnerId: 'parlay21-com', marketId: 'm1', sport: 'basketball', league: 'NBA', marketType: 'moneyline', maxStakeUsd: 200, currency: 'USD', source: 'test', observedAt: '2026-08-06T00:00:00.000Z' }, limitsPath);

    const result = await runBookReconciliation(db, {
      anchorScan: true,
      anchorScanPath: limitsPath,
      anchorScanOpts: { minDriftUsd: 50 },
    });

    const stale = result.mismatches.filter(m => m.kind === 'stale_anchor');
    expect(stale).toHaveLength(1);
    expect(stale[0].diff).toBe(-50);
    expect(stale[0].detail).toContain('parlay21-com');

    // anchorScan off → no stale_anchor entries
    const plain = await runBookReconciliation(db);
    expect(plain.mismatches.filter(m => m.kind === 'stale_anchor')).toHaveLength(0);
    db.close();
  });
});
