/**
 * Ops loop capital-return proxy slice — null-safe on empty DB + shape checks.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { openOperationsDb } from '../lib/operations/db.ts';
import { queryLoopMetricsSlice } from '../lib/operations/ops-loop-metrics.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { postTocSoftBalance } from '../lib/operations/toc-soft-balance.ts';
import { ensurePosition } from '../lib/operations/liquidity.ts';

describe('ops loop capital proxies', () => {
  test('empty DB returns null CE/RP; LE from baked fixture when present', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const slice = queryLoopMetricsSlice(db);
    expect(slice.dispatched).toBe(0);
    expect(slice.loopCompletionRate).toBe(0);
    expect(slice.capitalEfficiencyProxy).toBeNull();
    expect(slice.processReturnProxy).toBeNull();
    if (slice.limitEfficiencyProxy != null) {
      expect(slice.limitEfficiencyProxy).toBeGreaterThan(0);
    }
    db.close();
  });

  test('buildOpsSummary passes capital proxy fields through loop slice', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const summary = buildOpsSummary(db, 'live');
    expect(summary.loop).toHaveProperty('capitalEfficiencyProxy');
    expect(summary.loop).toHaveProperty('limitEfficiencyProxy');
    expect(summary.loop).toHaveProperty('processReturnProxy');
    expect(summary.loop).toHaveProperty('projectorBackend');
    expect(summary.loop).toHaveProperty('projectorDurable');
    expect(summary.loop.capitalEfficiencyProxy).toBeNull();
    expect(summary.loop.processReturnProxy).toBeNull();
    expect(
      summary.loop.projectorBackend === 'r2' || summary.loop.projectorBackend === 'memory'
    ).toBe(true);
    db.close();
  });

  test('CE from toc_soft_entries ProfitSplit / peak deployed capital', () => {
    const db = openOperationsDb({ path: ':memory:' });
    db.run(
      `INSERT INTO play_distribution (play_id, node_id, channel, received_at)
       VALUES ('p1', 'n1', 'telegram', $now)`,
      { $now: new Date().toISOString() }
    );
    postTocSoftBalance(db, {
      entryType: 'CapitalDeployment',
      stakeholder: 'House',
      amount: 5000,
      callSign: 'ASH-001',
      partnerCode: 'ASH',
      taskId: 'FUND-ASH-001',
    });
    postTocSoftBalance(db, {
      entryType: 'ProfitSplit',
      stakeholder: 'House',
      amount: 500,
      callSign: 'ASH-001',
      partnerCode: 'ASH',
      taskId: 'PLAY-ASH-001',
    });

    const slice = queryLoopMetricsSlice(db);
    expect(slice.capitalEfficiencyProxy).toBeCloseTo(0.1, 5);
    db.close();
  });

  test('RP from settled plays.pnl / (exposure + OE)', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const playId = randomUUIDv7();
    const nodeId = randomUUIDv7();

    db.run(
      `INSERT INTO play_distribution (play_id, node_id, channel, received_at)
       VALUES ($pid, $nid, 'telegram', $now)`,
      { $pid: playId, $nid: nodeId, $now: now }
    );
    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, confidence, signed_hash, sent_at, result, pnl)
       VALUES ($id, $eid, 'NBA', 'totals', 'Game', 'over', -110, 500, 0.8, 'hash', $now, 'win', 90)`,
      { $id: playId, $eid: randomUUIDv7(), $now: now }
    );
    db.run(`UPDATE operations SET total_exposure = 250 WHERE id = 'main'`);
    ensurePosition(db, nodeId, '_all', 5000);
    db.run(
      `UPDATE positions SET in_play = 250, available = available - 250 WHERE node_id = $nid AND book = '_all'`,
      { $nid: nodeId }
    );
    postTocSoftBalance(db, {
      entryType: 'CostOfPriming',
      stakeholder: 'House',
      amount: 10,
      callSign: 'ASH-001',
      partnerCode: 'ASH',
      taskId: 'WARM-ASH-001',
    });

    const slice = queryLoopMetricsSlice(db);
    expect(slice.processReturnProxy).toBeCloseTo(90 / (250 + 10), 5);
    db.close();
  });

  test('LE is populated when baked toc-ops fixture is on disk', () => {
    const db = openOperationsDb({ path: ':memory:' });
    db.run(
      `INSERT INTO play_distribution (play_id, node_id, channel, received_at)
       VALUES ('p1', 'n1', 'telegram', $now)`,
      { $now: new Date().toISOString() }
    );
    const slice = queryLoopMetricsSlice(db);
    if (slice.limitEfficiencyProxy != null) {
      expect(slice.limitEfficiencyProxy).toBeGreaterThan(0);
      expect(slice.limitEfficiencyProxy).toBeLessThan(2);
    }
    db.close();
  });
});
