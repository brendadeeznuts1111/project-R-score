// @see https://bun.com/docs/test/index#run-tests
/**
 * Factorial design + engine + coverage-floor hook.
 */
import { describe, expect, test } from 'bun:test';
import {
  configKey,
  fullFactorial,
  generateDesign,
  FactorialEngine,
  analyzeFactorial,
  predictFromEffects,
  classifyFactor,
  type Factor,
} from '../lib/experiments/index.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { canOfferOnPlatform } from '../lib/operations/platform-coverage.ts';
import { ensurePosition } from '../lib/operations/liquidity.ts';
import {
  asExperimentId,
  asTreeNodeId,
  unbrand,
} from '../lib/types/branded.ts';
import { parseFactorsSpec } from '../tools/ops-experiments.ts';

describe('factorial design (pure)', () => {
  test('2×2 full factorial has 4 cells', () => {
    const factors: Factor[] = [
      { name: 'routing', levels: ['static', 'dynamic'] },
      { name: 'cut', levels: [0.1, 0.15] },
    ];
    const full = fullFactorial(factors);
    expect(full).toHaveLength(4);
    expect(new Set(full.map(configKey)).size).toBe(4);

    const design = generateDesign(factors, 1);
    expect(design.method).toBe('full');
    expect(design.variants).toHaveLength(4);
  });

  test('2×2×2 half-fraction uses regular-2level (4 runs)', () => {
    const factors: Factor[] = [
      { name: 'a', levels: ['lo', 'hi'] },
      { name: 'b', levels: ['lo', 'hi'] },
      { name: 'c', levels: ['lo', 'hi'] },
    ];
    const design = generateDesign(factors, 2);
    expect(design.method).toBe('regular-2level');
    expect(design.variants).toHaveLength(4);
    expect(design.fullRuns).toBe(8);
    expect(design.aliases.length).toBeGreaterThan(0);
    expect(design.resolution).toBe(3);
  });

  test('mixed levels fraction uses balanced-subset', () => {
    const factors: Factor[] = [
      { name: 'routing', levels: ['static', 'dynamic'] },
      { name: 'cut', levels: [0.1, 0.15, 0.2] },
    ];
    const design = generateDesign(factors, 2);
    expect(design.method).toBe('balanced-subset');
    expect(design.variants.length).toBe(3); // ceil(6/2)
    expect(design.fullRuns).toBe(6);
  });

  test('parseFactorsSpec parses numeric levels', () => {
    const f = parseFactorsSpec('routing:static,dynamic;cut:0.10,0.15');
    expect(f).toHaveLength(2);
    expect(f[0]!.levels).toEqual(['static', 'dynamic']);
    expect(f[1]!.levels).toEqual([0.1, 0.15]);
  });

  test('classifies infrastructure controls as system-scoped', () => {
    expect(classifyFactor({ name: 'automation_frequency', levels: ['realtime', '5m'] })).toBe(
      'system'
    );
    expect(classifyFactor({ name: 'routing', levels: ['static', 'dynamic'] })).toBe('partner');
  });
});

describe('factorial analysis', () => {
  test('detects main effect and interaction on synthetic 2×2', () => {
    const factors: Factor[] = [
      { name: 'routing', levels: ['static', 'dynamic'] },
      { name: 'cut', levels: [0.1, 0.15] },
    ];
    // baseline 0.50; routing +0.04; cut +0.02; interaction +0.03 at dynamic×0.15
    const rows = [
      { partnerId: 'p1', config: { routing: 'static', cut: 0.1 }, metric: 0.5 },
      { partnerId: 'p2', config: { routing: 'static', cut: 0.15 }, metric: 0.52 },
      { partnerId: 'p3', config: { routing: 'dynamic', cut: 0.1 }, metric: 0.54 },
      { partnerId: 'p4', config: { routing: 'dynamic', cut: 0.15 }, metric: 0.59 },
    ];
    const analysis = analyzeFactorial(factors, rows);
    const routing = analysis.mainEffects.find(e => e.name === 'routing')!;
    const cut = analysis.mainEffects.find(e => e.name === 'cut')!;
    const ix = analysis.interactions.find(e => e.name === 'routing×cut')!;

    expect(routing.effect).toBeCloseTo(0.055, 2); // (0.54+0.59)/2 - (0.5+0.52)/2
    expect(cut.effect).toBeCloseTo(0.035, 2);
    expect(ix.effect).toBeCloseTo(0.03, 2); // (0.59-0.52) - (0.54-0.5)

    const withIx = predictFromEffects(
      analysis,
      factors,
      { routing: 'dynamic', cut: 0.15 },
      true
    );
    const mainOnly = predictFromEffects(
      analysis,
      factors,
      { routing: 'dynamic', cut: 0.15 },
      false
    );
    expect(withIx).not.toBe(mainOnly);
  });
});

describe('FactorialEngine + coverage hook', () => {
  test('create, sticky assign, metrics, analyze', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const engine = new FactorialEngine(db);
    const now = new Date().toISOString();

    const partners = [0, 1, 2, 3].map(() => asTreeNodeId(Bun.randomUUIDv7()));
    for (const p of partners) {
      db.run(
        `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
         VALUES ($id, 'partner', $n, 1, 'partner', $t)`,
        { $id: unbrand(p), $n: unbrand(p).slice(0, 8), $t: now }
      );
    }

    const exp = engine.createExperiment({
      name: 'routing-cut',
      factors: [
        { name: 'routing', levels: ['static', 'dynamic'] },
        { name: 'cut', levels: [0.1, 0.15] },
      ],
      fractionDenom: 1,
      metricName: 'win_rate',
      policy: { minPartnersPerVariant: 1, minDurationDays: 0 },
    });
    expect(exp.design.variants).toHaveLength(4);
    engine.setStatus(exp.id, 'active');

    const configs = new Set<string>();
    for (const p of partners) {
      const a = engine.assignBalanced(exp.id, p);
      expect(a.created).toBe(true);
      configs.add(configKey(a.config));
      // sticky
      const again = engine.assignBalanced(exp.id, p);
      expect(again.created).toBe(false);
      expect(configKey(again.config)).toBe(configKey(a.config));
    }
    // balanced across 4 partners → 4 distinct cells preferred
    expect(configs.size).toBe(4);

    // synthetic metrics
    const metricByConfig: Record<string, number> = {
      [configKey({ routing: 'static', cut: 0.1 })]: 0.5,
      [configKey({ routing: 'static', cut: 0.15 })]: 0.52,
      [configKey({ routing: 'dynamic', cut: 0.1 })]: 0.54,
      [configKey({ routing: 'dynamic', cut: 0.15 })]: 0.59,
    };
    for (const p of partners) {
      const a = engine.getAssignment(exp.id, p)!;
      engine.recordMetric({
        experimentId: exp.id,
        partnerId: p,
        value: metricByConfig[configKey(a.config)]!,
      });
    }

    const analysis = engine.analyze(exp.id);
    expect(analysis.nPartners).toBe(4);
    expect(analysis.mainEffects.find(e => e.name === 'routing')!.effect).toBeGreaterThan(0.04);

    db.close();
  });

  test('canOfferOnPlatform uses experiment coverage_floor for partner', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const engine = new FactorialEngine(db);
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO platforms (id, name, category, url, active, status, created_at)
       VALUES ('draftkings', 'DraftKings', 'sportsbook', 'https://draftkings.com', 1, 'active', $n)`,
      { $n: now }
    );
    // status column is added by ensurePlatformCoverageSchema during openOperationsDb/migrate

    // Launch readiness requires ≥1 active partner per design cell (2 variants here).
    // Coverage score still uses all active/partner tree nodes as denominator.
    const partner = asTreeNodeId(Bun.randomUUIDv7());
    const other = asTreeNodeId(Bun.randomUUIDv7());
    for (const [id, name] of [
      [partner, 'P'],
      [other, 'P2'],
    ] as const) {
      db.run(
        `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
         VALUES ($id, 'partner', $n, 1, 'partner', $at)`,
        {
          $id: unbrand(id),
          $n: name,
          $at: now,
        }
      );
    }
    db.run(
      `INSERT INTO partner_platform_accounts
         (id, platform_id, partner_id, account_identifier, balance, status, opened_at, created_at)
       VALUES ($id, 'draftkings', $p, 'dk-1', 1000, 'active', $n, $n)`,
      { $id: Bun.randomUUIDv7(), $p: unbrand(partner), $n: now }
    );
    ensurePosition(db, unbrand(partner), 'draftkings', 5000);
    db.run(
      `UPDATE positions SET available = 5000, deposited = 5000 WHERE node_id = $n AND book = 'draftkings'`,
      { $n: unbrand(partner) }
    );

    // 1 of 2 active agents on draftkings → coverageScore 50
    const exp = engine.createExperiment({
      name: 'coverage-floor',
      factors: [{ name: 'min_coverage_pct', levels: [10, 90] }],
      fractionDenom: 1,
      policy: { minPartnersPerVariant: 1, minDurationDays: 0 },
    });
    engine.setStatus(exp.id, 'active');
    engine.assignToConfig(exp.id, partner, { min_coverage_pct: 90 });

    expect(canOfferOnPlatform(db, 'draftkings', 100, 10)).toBe(true);
    expect(canOfferOnPlatform(db, 'draftkings', 100, 10, unbrand(partner))).toBe(false);

    db.close();
  });

  test('design CLI helpers stay pure for empty-safe factory', () => {
    expect(() => generateDesign([], 1).variants).not.toThrow();
    expect(generateDesign([], 1).variants).toHaveLength(0);
    // mint id shape
    const id = asExperimentId(Bun.randomUUIDv7());
    expect(unbrand(id).length).toBeGreaterThan(8);
  });

  test('blocks unsafe fractions and underpowered activation until policy is explicit', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const engine = new FactorialEngine(db);

    expect(() =>
      engine.createExperiment({
        name: 'unsafe-half',
        factors: [
          { name: 'routing', levels: ['static', 'dynamic'] },
          { name: 'cut', levels: [0.1, 0.15] },
          { name: 'stake', levels: ['fixed', 'kelly'] },
        ],
        fractionDenom: 2,
      })
    ).toThrow('resolution 3');

    const experiment = engine.createExperiment({
      name: 'needs-sample',
      factors: [{ name: 'routing', levels: ['static', 'dynamic'] }],
    });
    expect(engine.launchReadiness(experiment).ready).toBe(false);
    expect(engine.analysisReadiness(experiment).mature).toBe(false);
    expect(() => engine.setStatus(experiment.id, 'active')).toThrow('Need 20 active partners');
    expect(() =>
      engine.createExperiment({
        name: 'system-factor',
        factors: [{ name: 'model_type', levels: ['linear', 'rf'] }],
      })
    ).toThrow('system-scoped');
    db.close();
  });
});
