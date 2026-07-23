// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import { canOfferOnPlatform, ensurePosition } from '../lib/operations/liquidity.ts';
import {
  activateExperiment,
  assignVariant,
  createExperiment,
  getResults,
  logMetric,
} from '../lib/experiments/engine.ts';

describe('config experiments', () => {
  test('sticky assign + metric upsert + coverage gate override', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const partnerId = Bun.randomUUIDv7();

    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'partner', 'P', 1, 'partner', $n)`,
      { $id: partnerId, $n: now }
    );
    db.run(
      `INSERT INTO platforms (id, name, category, active, status, created_at)
       VALUES ('draftkings', 'DraftKings', 'sportsbook', 1, 'active', $n)`,
      { $n: now }
    );
    db.run(
      `INSERT INTO partner_platform_accounts
         (id, platform_id, partner_id, account_identifier, balance, status, is_test, opened_at, created_at)
       VALUES ($id, 'draftkings', $p, 'x', 100, 'active', 0, $n, $n)`,
      { $id: Bun.randomUUIDv7(), $p: partnerId, $n: now }
    );
    ensurePosition(db, partnerId, 'draftkings', 1000);
    db.run(
      `UPDATE positions SET available = 1000, deposited = 1000 WHERE node_id = $n AND book = 'draftkings'`,
      { $n: partnerId }
    );

    const exp = createExperiment(db, {
      name: 'coverage floor',
      hypothesis: 'lower floor increases offers',
      targetMetric: 'offer_rate',
      variants: [
        { name: 'strict', config: { minPlatformCoverage: 90 }, weight: 1 },
        { name: 'loose', config: { minPlatformCoverage: 1 }, weight: 0 },
      ],
    });
    activateExperiment(db, exp.id);

    const v1 = assignVariant(db, exp.id, partnerId);
    const v2 = assignVariant(db, exp.id, partnerId);
    expect(v1).toBe(v2);
    expect(v1).toBe(exp.variants[0]!.id); // weight 1 on strict

    // coverageScore = 100% (1/1 agents) but floor 90 still passes; use floor 200 via reassignment
    // With strict floor 90 and coverage 100 → offer ok
    expect(canOfferOnPlatform(db, 'draftkings', 100, 30, partnerId)).toBe(true);

    // Force loose by inserting assignment manually with min 1 — already sticky to strict.
    // Create second partner on loose-only experiment
    const exp2 = createExperiment(db, {
      name: 'loose only',
      hypothesis: 'h',
      targetMetric: 'x',
      variants: [{ name: 'loose', config: { minPlatformCoverage: 1 }, weight: 1 }],
    });
    activateExperiment(db, exp2.id);
    const p2 = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'agent', 'A2', 1, 'active', $n)`,
      { $id: p2, $n: now }
    );
    // No account → coverageScore 0 for draftkings agents among 2 active nodes?
    // agent_count for draftkings still 1, totalAgents 2 → coverage 50%
    // With minPlatformCoverage 1 → can offer if liquidity; p2 has no position
    assignVariant(db, exp2.id, p2);
    expect(canOfferOnPlatform(db, 'draftkings', 100, 30, p2)).toBe(true); // floor 1, coverage ~50, avail 1000

    logMetric(db, exp.id, v1!, 0.5, 2);
    logMetric(db, exp.id, v1!, 1.0, 2);
    const results = getResults(db, exp.id);
    expect(results).toHaveLength(1);
    expect(results[0]!.totalSamples).toBe(4);
    expect(results[0]!.avgMetric).toBeCloseTo(0.75, 5);

    db.close();
  });
});
