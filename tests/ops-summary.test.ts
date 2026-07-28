// @see https://bun.com/docs/test/index#run-tests
/**
 * Portal ops summary includes experiments + prediction for live + snapshot.
 */
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { FactorialEngine } from '../lib/experiments/index.ts';
import { runCoverageBacktest } from '../lib/prediction/index.ts';
import { asTreeNodeId, unbrand } from '../lib/types/branded.ts';
import { seedAccountLimitsDemo } from '../lib/account-limits-repo.ts';
import { PartnerAnalyticsRepository } from '../lib/operations/partner-analytics-repo.ts';

describe('buildOpsSummary', () => {
  test('live and snapshot use the same top-level contract keys', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const live = buildOpsSummary(db, 'live');
    const snap = buildOpsSummary(db, 'snapshot');
    expect(Object.keys(live).sort()).toEqual(Object.keys(snap).sort());
    expect(live.source).toBe('live');
    expect(snap.source).toBe('snapshot');
    expect(live.prediction).toHaveProperty('coverage');
    expect(live.experiments).toHaveProperty('recent');
    db.close();
  });

  test('includes empty experiments and prediction on fresh db', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const s = buildOpsSummary(db, 'live');
    expect(s.source).toBe('live');
    expect(s.experiments.active).toBe(0);
    expect(s.experiments.recent).toEqual([]);
    expect(s.prediction.coverage.n).toBe(0);
    expect(s.liquidity.total).toBe(0);
    expect(s.growth.playsReceived).toBe(0);
    expect(s.growth.top).toEqual([]);
    expect(s.bunUtils.total).toBeGreaterThan(0);
    expect(s.bunUtils.passed).toBe(s.bunUtils.total);
    expect(s.bunUtils.proofHash).toMatch(/^[a-f0-9]{64}$/);
    expect(s.registryClient).toHaveProperty('available');
    expect(s.registryClient.path).toBe('/registry/registry-client-proof.json');
    expect(s.cloudflareTokenScope).toHaveProperty('available');
    expect(s.cloudflareTokenScope.path).toBe('/registry/cloudflare-token-scope-proof.json');
    expect(s.cloudflarePages).toHaveProperty('available');
    expect(s.cloudflarePages.path).toBe('/registry/cloudflare-pages-preflight.json');
    expect(s.proofTaxonomy).toHaveProperty('available');
    expect(s.proofTaxonomy.path).toBe('/registry/proof-taxonomy-audit.json');
    expect(s.monorepoHealth).toHaveProperty('available');
    expect(s.monorepoHealth.path).toBe('/registry/monorepo-health.json');
    expect(s.monorepoHealth.portal).toBe('/portal/packages/');
    expect(s.monorepoHealth.claim).toBe('monorepo-health-score');
    if (s.proofTaxonomy.available) {
      expect(s.proofTaxonomy.contracts).toBeGreaterThan(0);
      expect(s.proofTaxonomy.proofHash).toMatch(/^[a-f0-9]{64}$/);
      if (s.proofTaxonomy.audits?.length) {
        expect(s.proofTaxonomy.audits.length).toBe(s.proofTaxonomy.contracts);
      }
    }
    expect(s.channelMeta).toHaveProperty('available');
    expect(s.channelMeta.path).toBe('/registry/release-features.json');
    expect(s.channelMeta.bakePath).toBe('/registry/channel-meta-bake.json');
    expect(s.partners).toHaveProperty('bound');
    expect(s.channels).toHaveProperty('pending');
    if (s.channelMeta.available) {
      expect(s.channelMeta.total).toBeGreaterThan(0);
      expect(s.channelMeta.proofHash).toMatch(/^[a-f0-9]{64}$/);
    }
    if (s.registryClient.available) {
      expect(s.registryClient.total).toBeGreaterThan(0);
      expect(s.registryClient.proofHash).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(s.routing).toHaveProperty('available');
    // Slice present when artifact exists on disk (repo may ship latest.json)
    if (s.routing.available) {
      expect(s.routing.total).toBeGreaterThan(0);
      expect(s.routing.proofHash).toMatch(/^[a-f0-9]{64}$/);
    }
    // Identity lane (partner profile bridge)
    expect(s.partners).toEqual({
      bound: 0,
      unboundAgents: 0,
      byLifecycle: {},
      recent: [],
    });
    expect(s.channels).toMatchObject({ pending: 0, failed: 0, sent: 0 });
    // MA/NJ compliance board (baked registry; available when compliance:bake present)
    expect(s.compliance).toHaveProperty('available');
    expect(s.compliance.path).toBe('/registry/compliance-board.json');
    expect(s.compliance.portal).toBe('/portal/compliance/');
    if (s.compliance.available) {
      expect(s.compliance.enhancements).toMatch(/^\d+\/\d+$/);
      expect(typeof s.compliance.ok).toBe('boolean');
      expect(typeof s.compliance.shadowMismatches).toBe('number');
      expect(Array.isArray(s.compliance.states)).toBe(true);
    }
    expect(s.loop).toMatchObject({
      dispatched: 0,
      loopCompletionRate: 0,
      manualStepsPerCycle: 0,
      capitalEfficiencyProxy: null,
      processReturnProxy: null,
    });
    expect(s.loop.projectorBackend === 'r2' || s.loop.projectorBackend === 'memory').toBe(true);
    expect(typeof s.loop.projectorDurable).toBe('boolean');
    expect(s.telegramHandshake).toHaveProperty('available');
    expect(s.telegramHandshake.path).toBe('/registry/telegram-handshake.json');
    expect(s.telegramHandshake.catalogPath).toBe('/registry/telegram-handshake-catalog.json');
    if (s.telegramHandshake.available) {
      expect(s.telegramHandshake.partners).toBeGreaterThan(0);
      expect(s.telegramHandshake.rows.length).toBe(s.telegramHandshake.partners);
      expect(s.telegramHandshake.forumReady).toBeGreaterThanOrEqual(0);
      expect(s.telegramHandshake.designated).toBeGreaterThanOrEqual(0);
      expect(s.telegramHandshake.verifyFailPartners).toBeGreaterThanOrEqual(0);
      expect(s.telegramHandshake.laneFailPartners).toBeGreaterThanOrEqual(0);
      for (const row of s.telegramHandshake.rows) {
        expect(row).toHaveProperty('verifyPassed');
        expect(row).toHaveProperty('lanesOk');
        expect(row).toHaveProperty('nextSteps');
        expect(row).toHaveProperty('verifyFails');
        expect(row).toHaveProperty('laneFails');
      }
    } else {
      expect(s.telegramHandshake.rows).toEqual([]);
    }
    expect(s.seatCapitalDesk).toHaveProperty('available');
    expect(s.seatCapitalDesk.path).toBe('/registry/seat-capital-desk.json');
    if (s.seatCapitalDesk.available) {
      expect(s.seatCapitalDesk.rows.length).toBe(s.seatCapitalDesk.desks);
    } else {
      expect(s.seatCapitalDesk.rows).toEqual([]);
    }
    db.close();
  });

  test('surfaces growth_metrics for current period', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const period = now.slice(0, 7);
    const nodeId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, telegram_id, active, status, created_at)
       VALUES ($id, 'agent', 'A1', 'tg', 1, 'active', $n)`,
      { $id: nodeId, $n: now }
    );
    db.run(
      `INSERT INTO growth_metrics (node_id, period, plays_received, plays_placed, volume, pnl)
       VALUES ($id, $p, 3, 2, 1500, 120)`,
      { $id: nodeId, $p: period }
    );
    const s = buildOpsSummary(db, 'live');
    expect(s.growth.period).toBe(period);
    expect(s.growth.playsReceived).toBe(3);
    expect(s.growth.playsPlaced).toBe(2);
    expect(s.growth.volume).toBe(1500);
    expect(s.growth.pnl).toBe(120);
    expect(s.growth.nodes).toBe(1);
    expect(s.growth.top[0]?.nodeId).toBe(nodeId);
    db.close();
  });

  test('surfaces active experiment and prediction accuracy', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();

    // Enough partners for 2-cell design under sandbox policy
    for (let i = 0; i < 2; i++) {
      const id = asTreeNodeId(Bun.randomUUIDv7());
      db.run(
        `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
         VALUES ($id, 'partner', $n, 1, 'partner', $t)`,
        { $id: unbrand(id), $n: `P${i}`, $t: now }
      );
    }

    const engine = new FactorialEngine(db);
    const exp = engine.createExperiment({
      name: 'portal-exp',
      factors: [{ name: 'routing', levels: ['static', 'dynamic'] }],
      policy: { minPartnersPerVariant: 1, minDurationDays: 0 },
    });
    engine.setStatus(exp.id, 'active');

    db.run(
      `INSERT INTO platforms (id, name, category, launch_date, active, status, created_at)
       VALUES ('a', 'A', 'sportsbook', '2024-01-01', 1, 'active', $n),
              ('b', 'B', 'sportsbook', '2024-01-01', 1, 'active', $n)`,
      { $n: now }
    );
    const partnerId = unbrand(asTreeNodeId(Bun.randomUUIDv7()));
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'partner', 'Px', 1, 'partner', $n)`,
      { $id: partnerId, $n: now }
    );
    db.run(
      `INSERT INTO partner_platform_accounts
         (id, platform_id, partner_id, account_identifier, balance, status, is_test, opened_at, created_at)
       VALUES ($id, 'a', $p, 'x', 1, 'active', 0, '2024-06-01T00:00:00.000Z', $n)`,
      { $id: Bun.randomUUIDv7(), $p: partnerId, $n: now }
    );
    db.run(
      `INSERT INTO coverage_snapshots
         (snapshot_date, total_platforms, covered_platforms, coverage_percentage, by_category, created_at)
       VALUES ('2024-07-01', 2, 1, 80, '[]', $n)`,
      { $n: now }
    );
    runCoverageBacktest(db, '2024-01-01', '2024-12-31');

    const s = buildOpsSummary(db, 'live');
    expect(s.experiments.active).toBe(1);
    expect(s.experiments.recent[0]?.name).toBe('portal-exp');
    expect(s.experiments.recent[0]?.variants).toBe(2);
    expect(s.prediction.coverage.n).toBe(1);
    expect(s.prediction.coverage.mae).toBe(30);
    expect(s.prediction.coverage.quality).toBe('poor');
    expect(s.prediction.coverage.within5Target).toBe(65);
    expect(s.prediction.coverage.report).toBe('/registry/prediction/report/');
    expect(s.prediction.coverage.stripTone).toBeDefined();

    db.close();
  });

  test('projects multi-factor limit influence and proof state for the portal', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const repository = new PartnerAnalyticsRepository(db, nodeId);
    expect(repository.sealMissingRaiseContextProofs(now - 86400).sealed).toBe(1);

    const summary = buildOpsSummary(db, 'live');
    const raise = summary.limitChanges[0];
    expect(raise?.node_id).toBe(nodeId);
    expect(raise?.context_available).toBe(true);
    expect(raise?.multi_factor_score).toBeGreaterThan(0);
    expect(raise?.top_contributing_factors).toHaveLength(3);
    expect(raise?.context_proof?.valid).toBe(true);
    db.close();
  });
});
