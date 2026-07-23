// @see https://bun.com/docs/test/index#run-tests
/**
 * C4 extensions: launch policy, cluster assignment, switchback schedules.
 */
import { describe, expect, test } from 'bun:test';
import {
  FactorialEngine,
  assignClustered,
  analyzeSwitchback,
  classifyFactor,
  createSwitchbackSchedule,
  currentSwitchbackPeriod,
  factorLaunchErrors,
  normalizeExperimentPolicy,
  recordSwitchbackMetric,
} from '../lib/experiments/index.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { asTreeNodeId, unbrand } from '../lib/types/branded.ts';

const TEST_POLICY = { minPartnersPerVariant: 1, minDurationDays: 0 } as const;

function insertPartner(db: ReturnType<typeof openOperationsDb>, name: string) {
  const id = asTreeNodeId(Bun.randomUUIDv7());
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
     VALUES ($id, 'partner', $n, 1, 'partner', $t)`,
    { $id: unbrand(id), $n: name, $t: now }
  );
  return id;
}

describe('experiment policy', () => {
  test('classifyFactor marks known system names', () => {
    expect(classifyFactor({ name: 'routing' })).toBe('partner');
    expect(classifyFactor({ name: 'model_type' })).toBe('system');
    expect(classifyFactor({ name: 'Model-Type' })).toBe('system');
    expect(classifyFactor({ name: 'routing', scope: 'system' })).toBe('system');
  });

  test('factorLaunchErrors and normalizeExperimentPolicy', () => {
    expect(factorLaunchErrors([{ name: 'cut', levels: [0.1, 0.15] }])).toHaveLength(0);
    expect(factorLaunchErrors([{ name: 'infrastructure', levels: ['a', 'b'] }])[0]).toMatch(
      /system-scoped/
    );
    expect(() => normalizeExperimentPolicy({ minPartnersPerVariant: 0 })).toThrow();
    const p = normalizeExperimentPolicy({ minPartnersPerVariant: 2, minDurationDays: 7 });
    expect(p.minPartnersPerVariant).toBe(2);
    expect(p.minimumResolution).toBe(4);
  });
});

describe('assignClustered', () => {
  test('partners in the same cluster share one design cell', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const engine = new FactorialEngine(db);
    // 2×2 = 4 cells → need 4 active partners under TEST_POLICY
    const p1 = insertPartner(db, 'P1');
    const p2 = insertPartner(db, 'P2');
    insertPartner(db, 'P-fill-3');
    insertPartner(db, 'P-fill-4');

    const exp = engine.createExperiment({
      name: 'clustered',
      factors: [
        { name: 'routing', levels: ['static', 'dynamic'] },
        { name: 'cut', levels: [0.1, 0.15] },
      ],
      policy: TEST_POLICY,
    });
    engine.setStatus(exp.id, 'active');

    const a1 = assignClustered(db, engine, {
      experimentId: exp.id,
      partnerId: p1,
      clusterKey: 'region:east',
    });
    const a2 = assignClustered(db, engine, {
      experimentId: exp.id,
      partnerId: p2,
      clusterKey: 'region:east',
    });

    expect(unbrand(a1.variantId)).toBe(unbrand(a2.variantId));
    expect(JSON.stringify(a1.config)).toBe(JSON.stringify(a2.config));
    const a1b = assignClustered(db, engine, {
      experimentId: exp.id,
      partnerId: p1,
      clusterKey: 'region:east',
    });
    expect(a1b.created).toBe(false);
    expect(unbrand(a1b.variantId)).toBe(unbrand(a1.variantId));
    db.close();
  });

  test('rejects empty clusterKey', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const engine = new FactorialEngine(db);
    const p = insertPartner(db, 'P');
    insertPartner(db, 'P2'); // 2 cells for 2-level factor
    const exp = engine.createExperiment({
      name: 'c',
      factors: [{ name: 'a', levels: ['lo', 'hi'] }],
      policy: TEST_POLICY,
    });
    engine.setStatus(exp.id, 'active');
    expect(() =>
      assignClustered(db, engine, { experimentId: exp.id, partnerId: p, clusterKey: '  ' })
    ).toThrow('clusterKey');
    db.close();
  });
});

describe('switchback', () => {
  test('createSwitchbackSchedule persists washoutDays and periods', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const engine = new FactorialEngine(db);
    const partner = insertPartner(db, 'SB');
    insertPartner(db, 'SB-fill'); // 2 variants → 2 partners
    const exp = engine.createExperiment({
      name: 'sb',
      factors: [{ name: 'routing', levels: ['static', 'dynamic'] }],
      policy: TEST_POLICY,
    });
    engine.setStatus(exp.id, 'active');

    const starts = new Date('2024-06-01T00:00:00.000Z');
    const periods = createSwitchbackSchedule(db, engine, {
      experimentId: exp.id,
      partnerId: partner,
      periodDays: 7,
      washoutDays: 2,
      cycles: 1,
      startsAt: starts,
    });

    expect(periods.length).toBe(2); // one cycle × 2 variants
    expect(periods.every(p => p.washoutDays === 2)).toBe(true);
    // SQLite row also bound (regression for $washoutDays)
    const row = db
      .query(
        `SELECT washout_days FROM experiment_switchback_periods
         WHERE experiment_id = $e AND partner_id = $p LIMIT 1`
      )
      .get({ $e: unbrand(exp.id), $p: unbrand(partner) }) as { washout_days: number };
    expect(row.washout_days).toBe(2);

    // Gap: ends_at of period0 + washout = starts of period1
    const e0 = new Date(periods[0]!.endsAt).getTime();
    const s1 = new Date(periods[1]!.startsAt).getTime();
    expect(s1 - e0).toBe(2 * 86_400_000);

    expect(() =>
      createSwitchbackSchedule(db, engine, {
        experimentId: exp.id,
        partnerId: partner,
        periodDays: 7,
      })
    ).toThrow('already exists');

    const mid = new Date(new Date(periods[0]!.startsAt).getTime() + 3 * 86_400_000);
    const current = currentSwitchbackPeriod(db, exp.id, partner, mid);
    expect(current?.periodIndex).toBe(0);

    recordSwitchbackMetric(db, {
      experimentId: exp.id,
      partnerId: partner,
      metricName: 'win_rate',
      value: 0.55,
      recordedAt: mid,
    });
    const analysis = analyzeSwitchback(db, engine, exp.id);
    expect(analysis.nObservations).toBeGreaterThanOrEqual(1);
    expect(analysis.effects.length).toBeGreaterThanOrEqual(1);

    db.close();
  });
});
