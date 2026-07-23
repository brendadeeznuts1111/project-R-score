// @see https://bun.com/docs/test/index#run-tests
/**
 * Settlement → experiment metrics + coverage reserve gate.
 */
import { describe, expect, test } from 'bun:test';
import {
  FactorialEngine,
  canOfferStakeForNode,
  resolveExperimentSubject,
  winRateFromResult,
} from '../lib/experiments/index.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { ensurePosition, reservePlay } from '../lib/operations/liquidity.ts';
import { settlePlay } from '../lib/operations/play-settlement.ts';
import { asTreeNodeId, unbrand } from '../lib/types/branded.ts';

/** Launch policy for unit tests (prod default is 10 partners/cell + 28 days). */
const TEST_POLICY = { minPartnersPerVariant: 1, minDurationDays: 0 } as const;

function seedTree(
  db: ReturnType<typeof openOperationsDb>,
  /** Extra active partners so launch readiness (1 per design cell) can pass. */
  extraPartnerCount = 0
) {
  const now = new Date().toISOString();
  const partner = asTreeNodeId(Bun.randomUUIDv7());
  const agent = asTreeNodeId(Bun.randomUUIDv7());
  db.run(
    `INSERT INTO tree_nodes (id, type, name, active, status, cut_percentage, created_at)
     VALUES ($id, 'partner', 'Partner', 1, 'partner', 10, $n)`,
    { $id: unbrand(partner), $n: now }
  );
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, name, active, status, cut_percentage, created_at)
     VALUES ($id, 'agent', $p, 'Agent', 1, 'active', 0, $n)`,
    { $id: unbrand(agent), $p: unbrand(partner), $n: now }
  );
  for (let i = 0; i < extraPartnerCount; i++) {
    const id = asTreeNodeId(Bun.randomUUIDv7());
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, cut_percentage, created_at)
       VALUES ($id, 'partner', $n, 1, 'partner', 0, $t)`,
      { $id: unbrand(id), $n: `P-extra-${i}`, $t: now }
    );
  }
  db.run(
    `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
     VALUES ('exp1', 'E', 'NBA', 'spread', 0.7, 1, $n)`,
    { $n: now }
  );
  return { partner, agent, now };
}

describe('experiment outcomes', () => {
  test('winRateFromResult maps decisive results only', () => {
    expect(winRateFromResult('win')).toBe(1);
    expect(winRateFromResult('loss')).toBe(0);
    expect(winRateFromResult('push')).toBeUndefined();
    expect(winRateFromResult('void')).toBeUndefined();
  });

  test('resolveExperimentSubject prefers partner ancestor', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const { partner, agent } = seedTree(db);
    expect(unbrand(resolveExperimentSubject(db, unbrand(agent)))).toBe(unbrand(partner));
    expect(unbrand(resolveExperimentSubject(db, unbrand(partner)))).toBe(unbrand(partner));
    db.close();
  });

  test('settlePlay records win_rate on partner for active experiment', () => {
    const db = openOperationsDb({ path: ':memory:' });
    // 4 design cells → need 4 active partners under TEST_POLICY
    const { partner, agent, now } = seedTree(db, 3);
    const engine = new FactorialEngine(db);

    const exp = engine.createExperiment({
      name: 'routing-cut',
      factors: [
        { name: 'routing', levels: ['static', 'dynamic'] },
        { name: 'cut', levels: [0.1, 0.15] },
      ],
      metricName: 'win_rate',
      policy: TEST_POLICY,
    });
    engine.setStatus(exp.id, 'active');

    ensurePosition(db, unbrand(agent), '_all', 50_000);
    db.run(
      `UPDATE positions SET available = 49000, in_play = 1000 WHERE node_id = $n AND book = '_all'`,
      { $n: unbrand(agent) }
    );
    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, signed_hash, sent_at)
       VALUES ('play1', 'exp1', 'NBA', 'spread', 'LAL vs BOS', 'LAL', -110, 1000, 'hash', $now)`,
      { $now: now }
    );

    const settled = settlePlay(db, {
      playId: 'play1',
      result: 'win',
      pnl: 900,
      leafNodeId: unbrand(agent),
      stakeReserved: 1000,
    });

    expect(settled.experimentOutcomes.length).toBe(1);
    expect(unbrand(settled.experimentOutcomes[0]!.partnerId)).toBe(unbrand(partner));
    expect(settled.experimentOutcomes[0]!.metrics.some(m => m.name === 'win_rate' && m.value === 1)).toBe(
      true
    );
    expect(settled.experimentOutcomes[0]!.metrics.some(m => m.name === 'pnl' && m.value === 900)).toBe(
      true
    );

    // Partner was auto-assigned
    const assignment = engine.getAssignment(exp.id, partner);
    expect(assignment).not.toBeNull();

    const analysis = engine.analyze(exp.id);
    expect(analysis.nPartners).toBe(1);
    expect(analysis.grandMean).toBe(1);

    db.close();
  });

  test('push does not write win_rate; settle still succeeds', () => {
    const db = openOperationsDb({ path: ':memory:' });
    // 2 cells → +1 extra partner
    const { agent, now } = seedTree(db, 1);
    const engine = new FactorialEngine(db);
    const exp = engine.createExperiment({
      name: 'x',
      factors: [{ name: 'a', levels: ['lo', 'hi'] }],
      policy: TEST_POLICY,
    });
    engine.setStatus(exp.id, 'active');

    ensurePosition(db, unbrand(agent), '_all', 10_000);
    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, signed_hash, sent_at)
       VALUES ('play2', 'exp1', 'NBA', 'spread', 'X', 'Y', -110, 100, 'h', $now)`,
      { $now: now }
    );

    const settled = settlePlay(db, {
      playId: 'play2',
      result: 'push',
      pnl: 0,
      leafNodeId: unbrand(agent),
      stakeReserved: 100,
    });

    expect(settled.result).toBe('push');
    expect(settled.experimentOutcomes[0]!.metrics).toHaveLength(0);
    expect(engine.analyze(exp.id).nPartners).toBe(0);
    db.close();
  });

  test('reservePlay checkCoverage uses experiment floor via canOfferStakeForNode', () => {
    const db = openOperationsDb({ path: ':memory:' });
    // 2 cells + second active agent for coverage denominator
    const { partner, agent, now } = seedTree(db, 1);
    const other = asTreeNodeId(Bun.randomUUIDv7());
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'agent', 'Other', 1, 'active', $n)`,
      { $id: unbrand(other), $n: now }
    );

    db.run(
      `INSERT INTO platforms (id, name, category, url, active, status, created_at)
       VALUES ('draftkings', 'DraftKings', 'sportsbook', 'https://dk.com', 1, 'active', $n)`,
      { $n: now }
    );
    db.run(
      `INSERT INTO partner_platform_accounts
         (id, platform_id, partner_id, account_identifier, balance, status, opened_at, created_at)
       VALUES ($id, 'draftkings', $p, 'dk', 1000, 'active', $n, $n)`,
      { $id: Bun.randomUUIDv7(), $p: unbrand(partner), $n: now }
    );
    ensurePosition(db, unbrand(partner), 'draftkings', 5000);
    db.run(
      `UPDATE positions SET available = 5000, deposited = 5000 WHERE node_id = $n AND book = 'draftkings'`,
      { $n: unbrand(partner) }
    );

    // 1 of several active tree nodes on platform → coverageScore < 90
    const engine = new FactorialEngine(db);
    const exp = engine.createExperiment({
      name: 'cov',
      factors: [{ name: 'min_coverage_pct', levels: [10, 90] }],
      policy: TEST_POLICY,
    });
    engine.setStatus(exp.id, 'active');
    engine.assignToConfig(exp.id, partner, { min_coverage_pct: 90 });

    expect(canOfferStakeForNode(db, 'draftkings', 100, unbrand(agent), 10)).toBe(false);

    const blocked = reservePlay(db, unbrand(partner), 100, 'draftkings', {
      checkCoverage: true,
      minCoveragePct: 10,
    });
    expect(blocked.ok).toBe(false);

    // Without checkCoverage, reserve still works on liquidity alone
    const ok = reservePlay(db, unbrand(partner), 100, 'draftkings');
    expect(ok.ok).toBe(true);

    db.close();
  });
});
