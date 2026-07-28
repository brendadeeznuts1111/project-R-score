// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  ensureAccountLimitsSchema,
  seedAccountLimitsDemo,
} from '../lib/account-limits-repo.ts';
import {
  computeMultiFactorScore,
  PartnerAnalyticsRepository,
} from '../lib/operations/partner-analytics-repo.ts';

describe('multi-factor limit raise context', () => {
  test('context is stored and retrieved; score ranks drivers', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const repo = new PartnerAnalyticsRepository(db, nodeId);

    const raises = repo.detectRaises(now - 86400);
    expect(raises.length).toBe(1);
    const limitId = raises[0]!.limit_id;
    expect(limitId).toBeGreaterThan(0);

    const ctx = repo.getRaiseContext(limitId);
    expect(ctx).not.toBeNull();
    expect(ctx!.active_players_7d).toBe(42);
    expect(ctx!.total_handle_7d).toBe(380_000);
    expect(ctx!.kyc_pass_rate).toBeGreaterThan(0.9);

    const score = computeMultiFactorScore(ctx!);
    expect(score.score).toBeGreaterThan(0.5);
    expect(score.topFactors.length).toBe(3);
    // High handle + clean compliance should surface among top drivers
    expect(
      score.topFactors.some(f =>
        ['total_handle_7d', 'avg_clv_7d', 'kyc_pass_rate', 'partner_profit_30d'].includes(f)
      )
    ).toBe(true);
  });

  test('getEnrichedRaisesWithContext includes multi score + CLV', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const repo = new PartnerAnalyticsRepository(db, nodeId);
    const rows = repo.getEnrichedRaisesWithContext(now - 86400);
    expect(rows.length).toBe(1);
    expect(rows[0]!.multi_factor_score).toBeGreaterThan(0.5);
    expect(rows[0]!.top_contributing_factors.length).toBe(3);
    expect(rows[0]!.top_clv.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]!.context?.partner_roi_30d).toBe(0.18);
  });

  test('captureMissingRaiseContexts writes when context absent', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    // Minimal raise without seed context
    db.run(
      `INSERT INTO partner_account_limits
        (node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at, effective_from)
       VALUES ('n1', 'dk', 'nba', 'totals', 'straight', 100, ?, ?)`,
      [now - 4000, now - 4000]
    );
    db.run(
      `INSERT INTO partner_account_limits
        (node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at, effective_from)
       VALUES ('n1', 'dk', 'nba', 'totals', 'straight', 400, ?, ?)`,
      [now - 100, now - 100]
    );
    const repo = new PartnerAnalyticsRepository(db, 'n1');
    expect(repo.getEnrichedRaisesWithContext(now - 86400)[0]!.context).toBeNull();
    const written = repo.captureMissingRaiseContexts(now - 86400);
    expect(written).toBe(1);
    expect(repo.getEnrichedRaisesWithContext(now - 86400)[0]!.context).not.toBeNull();
    expect(repo.captureMissingRaiseContexts(now - 86400)).toBe(0);
  });

  test('computeMultiFactorScore penalizes violations/chargebacks', () => {
    const healthy = computeMultiFactorScore({
      active_players_7d: 100,
      new_players_7d: 10,
      total_handle_7d: 200_000,
      avg_clv_7d: 40,
      top_tier_player_count: 10,
      violation_count_30d: 0,
      chargeback_count_30d: 0,
      kyc_pass_rate: 0.99,
      market_volatility_index: 0.5,
      peak_betting_hours: '[]',
      sportsbook_share: 0.4,
      partner_profit_30d: 40_000,
      partner_roi_30d: 0.15,
    });
    const toxic = computeMultiFactorScore({
      active_players_7d: 100,
      new_players_7d: 10,
      total_handle_7d: 200_000,
      avg_clv_7d: 40,
      top_tier_player_count: 10,
      violation_count_30d: 10,
      chargeback_count_30d: 10,
      kyc_pass_rate: 0.4,
      market_volatility_index: 4.5,
      peak_betting_hours: '[]',
      sportsbook_share: 0.4,
      partner_profit_30d: 40_000,
      partner_roi_30d: 0.15,
    });
    expect(healthy.score).toBeGreaterThan(toxic.score);
  });
});
