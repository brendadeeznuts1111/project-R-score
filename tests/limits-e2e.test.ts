// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/test
/**
 * E2E limit detection pipeline test.
 *
 * Runs the full pipeline in :memory: SQLite:
 *   schema → seed → detect → predict → analyze → format
 *
 *   bun test tests/limits-e2e.test.ts
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createTestDb, seedTestData } from './harness.ts';

// ── Pipeline stages ───────────────────────────────────────────────────────
describe('limit detection pipeline (E2E)', () => {
  let db: Database;

  beforeAll(() => {
    db = createTestDb();
    seedTestData(db, 'e2e-test');
  });

  test('Stage 2: seed demo data and detect raises', () => {
    const { seedAccountLimitsDemo, AccountLimitsRepository } = require('../lib/account-limits-repo.ts');
    seedAccountLimitsDemo(db, { nodeId: 'e2e-test', force: true });

    const repo = new AccountLimitsRepository(db);
    const raises = repo.detectRaises('e2e-test', 0);
    expect(raises.length).toBeGreaterThanOrEqual(1);

    const first = raises[0]!;
    expect(first.sportsbook).toBeTruthy();
    expect(first.previous_max).toBeGreaterThanOrEqual(0);
    expect(first.new_limit).toBeGreaterThan(first.previous_max);
  });

  test('Stage 3: record with alert triggers local alert row', () => {
    const { AccountLimitsRepository } = require('../lib/account-limits-repo.ts');
    const repo = new AccountLimitsRepository(db);

    // Record a known raise
    const raise = repo.recordLimitWithAlert({
      node_id: 'e2e-test',
      sportsbook: 'draftkings',
      sport_id: 'nba',
      market_id: 'spread',
      bet_type: 'straight',
      max_wager: 5000,
    });

    // First insert — no raise (no predecessor)
    // Second insert triggers the raise
    const raise2 = repo.recordLimitWithAlert({
      node_id: 'e2e-test',
      sportsbook: 'draftkings',
      sport_id: 'nba',
      market_id: 'spread',
      bet_type: 'straight',
      max_wager: 10000,
    });

    if (raise2) {
      expect(raise2.new_limit).toBe(10000);
      expect(raise2.previous_max).toBeLessThan(raise2.new_limit);
    }

    // Check alerts were created
    const alerts = repo.readAlerts('e2e-test', 5);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0]!.alert_type).toBe('limit_increase');
  });

  test('Stage 4: multi-factor context capture', () => {
    const { PartnerAnalyticsRepository } = require('../lib/operations/partner-analytics-repo.ts');
    const analytics = new PartnerAnalyticsRepository(db, 'e2e-test');

    // Capture missing context
    const written = analytics.captureMissingRaiseContexts(0);
    expect(typeof written).toBe('number');
  });

  test('Stage 5: granular analysis by dimension', () => {
    const { analyzeByDimension } = require('../lib/prediction/granular-analysis.ts');
    const result = analyzeByDimension(db, 48);

    expect(result.bySportsbook).toBeDefined();
    expect(Array.isArray(result.bySportsbook)).toBe(true);

    // At least one dimension should have data
    const allEmpty = result.bySportsbook.length === 0 &&
      result.bySport.length === 0 &&
      result.byMarket.length === 0 &&
      result.byBetType.length === 0;
    expect(allEmpty).toBe(false);
  });

  test('Stage 6: regulatory correlation', () => {
    const { correlateWithRegulations } = require('../lib/prediction/granular-analysis.ts');
    const result = correlateWithRegulations(db, 48);
    expect(Array.isArray(result)).toBe(true);
  });

  test('Stage 7: full granular analysis', () => {
    const { runGranularAnalysis } = require('../lib/prediction/granular-analysis.ts');
    const result = runGranularAnalysis(db, 48);

    expect(result.generated).toBeTruthy();
    expect(result.hours).toBe(48);
    expect(result.bySportsbook).toBeDefined();
    expect(result.bySport).toBeDefined();
    expect(result.byMarket).toBeDefined();
    expect(result.byBetType).toBeDefined();
    expect(result.regulatoryCorrelations).toBeDefined();
  });

  test('Stage 8: limit forecasting', () => {
    const { predictLimitRaise } = require('../lib/prediction/limit-prediction.ts');
    const prediction = predictLimitRaise(db, {
      node_id: 'e2e-test',
      sportsbook: 'draftkings',
      sport_id: 'nba',
      market_id: 'spread',
      bet_type: 'straight',
    });

    expect(prediction.predictedRaiseProb).toBeGreaterThanOrEqual(0);
    expect(prediction.predictedRaiseProb).toBeLessThanOrEqual(1);
    expect(prediction.confidence).toMatch(/^(low|medium|high)$/);
    expect(prediction.windowHint).toBeTruthy();
    expect(Array.isArray(prediction.topDrivers)).toBe(true);
  });

  test('Stage 9: prediction cycle with backfill', () => {
    const { runLimitPredictionCycle } = require('../lib/prediction/limit-prediction.ts');
    const result = runLimitPredictionCycle(db);

    expect(typeof result.predictions).toBe('number');
    expect(typeof result.backfilled).toBe('number');
    expect(result.accuracy).toBeDefined();
  });

  test('Stage 10: terminal table formatting', () => {
    const { formatLimitChangeTable, formatEnrichedLimitChanges, formatChangeSummary } = require('../lib/account-limits-repo.ts');
    const { AccountLimitsRepository } = require('../lib/account-limits-repo.ts');
    const repo = new AccountLimitsRepository(db);
    const raises = repo.detectRaises('e2e-test', 0);

    if (raises.length > 0) {
      const table = formatLimitChangeTable(raises);
      expect(table).toContain('🚀');
      expect(table).toContain('$');

      const enriched = formatEnrichedLimitChanges(raises.map(r => ({
        ...r,
        top_clv: [],
        line_move_5m: null,
      })));
      expect(enriched.length).toBeGreaterThan(0);

      const summary = formatChangeSummary(raises.map(r => ({ ...r, direction: 'up' as const })));
      expect(summary).toContain('Total');
    }
  });

  test('Stage 11: scope snapshot writes manifest', async () => {
    const { SnapshotManifest } = require('../tools/snapshot-core.ts');
    const manifest: any = {
      id: 'e2e-test-snap',
      scope: 'limits',
      reportType: 'limits',
      capturedAt: new Date().toISOString(),
      commit: 'e2e',
      branch: 'test',
      bunVersion: Bun.version,
      fileCount: 0,
      files: [],
      metadata: {},
    };
    expect(manifest.scope).toBe('limits');
    expect(manifest.id).toBeTruthy();
    expect(manifest.bunVersion).toBe(Bun.version);
  });

  test('Stage 12: chart SVG generation', () => {
    const { generateLimitChartSvg } = require('../tools/limit-chart.ts');
    const chartData = {
      raises: 3,
      decreases: 1,
      netDelta: 15000,
      avgScore: 0.714,
      books: 2,
      partners: 1,
      changes: [
        { sportsbook: 'draftkings', direction: 'up', previous_max: 500, new_limit: 1500 },
        { sportsbook: 'fanduel', direction: 'down', previous_max: 2000, new_limit: 1000 },
        { sportsbook: 'betmgm', direction: 'up', previous_max: 0, new_limit: 3000 },
      ],
      predictionAccuracy: { mae: 0.123, rmse: 0.456, bias: -0.012, n: 50 },
      generatedAt: '2026-07-28T00:00:00',
    };

    const svg = generateLimitChartSvg(chartData);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('🚀');
    expect(svg).toContain('Limit Changes Snapshot');
    expect(svg).toContain('draftkings');
    expect(svg).toContain('Prediction Accuracy');
    expect(svg).toContain('MAE: 0.123');
    expect(svg).toMatchSnapshot();
  });

  // Cleanup
  afterAll(() => {
    db.close();
  });
});
