// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Partner analytics — multi-factor context around account limit raises.
 *
 * Scoped by node_id. Stores a freeze-shape snapshot at raise time and scores
 * volume / CLV / compliance / market / profitability drivers.
 *
 * @see lib/account-limits-repo.ts
 */
import type { Database } from 'bun:sqlite';
import {
  AccountLimitsRepository,
  ensureAccountLimitsSchema,
  type EnrichedLimitRaise,
  type LimitRaise,
} from '../account-limits-repo.ts';

export type RaiseContextMetrics = {
  active_players_7d: number;
  new_players_7d: number;
  total_handle_7d: number;
  avg_clv_7d: number;
  top_tier_player_count: number;
  violation_count_30d: number;
  chargeback_count_30d: number;
  kyc_pass_rate: number;
  market_volatility_index: number;
  /** JSON array of hour ints, e.g. "[18,19,20]" */
  peak_betting_hours: string;
  sportsbook_share: number;
  partner_profit_30d: number;
  partner_roi_30d: number;
};

export type RaiseContextRow = RaiseContextMetrics & {
  id?: number; // brand-ok — context row pk
  node_id: string; // brand-ok — partner slug
  limit_record_id: number; // brand-ok — partner_account_limits.id
  snapshot_at?: number;
};

export type MultiFactorScore = {
  score: number;
  topFactors: string[];
  factorScores: Record<string, number>;
};

export type MultiFactorEnrichedRaise = EnrichedLimitRaise & {
  limit_id: number;
  context: RaiseContextRow | null;
  multi_factor_score: number;
  top_contributing_factors: string[];
  factor_scores: Record<string, number>;
};

type FactorRange = { min: number; max: number; invert?: boolean };

/** Fixed normalization ranges (historical min/max stand-in until live calibration). */
export const MULTI_FACTOR_RANGES: Record<keyof RaiseContextMetrics, FactorRange> = {
  active_players_7d: { min: 0, max: 200 },
  new_players_7d: { min: 0, max: 50 },
  total_handle_7d: { min: 0, max: 500_000 },
  avg_clv_7d: { min: -100, max: 500 },
  top_tier_player_count: { min: 0, max: 20 },
  violation_count_30d: { min: 0, max: 10, invert: true },
  chargeback_count_30d: { min: 0, max: 10, invert: true },
  kyc_pass_rate: { min: 0, max: 1 },
  market_volatility_index: { min: 0, max: 5, invert: true },
  peak_betting_hours: { min: 0, max: 1 }, // not scored directly
  sportsbook_share: { min: 0, max: 1 },
  partner_profit_30d: { min: -50_000, max: 200_000 },
  partner_roi_30d: { min: -0.2, max: 0.3 },
};

/**
 * Positive weights; risk metrics inverted via ranges so high violations lower score.
 * Sum of absolute weights ≈ 1.0.
 */
export const MULTI_FACTOR_WEIGHTS: Partial<Record<keyof RaiseContextMetrics, number>> = {
  total_handle_7d: 0.2,
  avg_clv_7d: 0.15,
  violation_count_30d: 0.12,
  chargeback_count_30d: 0.12,
  kyc_pass_rate: 0.1,
  market_volatility_index: 0.08,
  sportsbook_share: 0.05,
  partner_profit_30d: 0.1,
  top_tier_player_count: 0.04,
  active_players_7d: 0.04,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function normalize(raw: number, range: FactorRange): number {
  const span = range.max - range.min;
  if (span <= 0) return 0;
  let n = (raw - range.min) / span;
  if (range.invert) n = 1 - n;
  return clamp01(n);
}

/** Pure multi-factor score (no DB). */
export function computeMultiFactorScore(context: RaiseContextMetrics): MultiFactorScore {
  let totalScore = 0;
  let weightSum = 0;
  const factorScores: Record<string, number> = {};

  for (const [factor, weight] of Object.entries(MULTI_FACTOR_WEIGHTS) as Array<
    [keyof RaiseContextMetrics, number]
  >) {
    if (factor === 'peak_betting_hours') continue;
    const range = MULTI_FACTOR_RANGES[factor];
    if (!range || weight == null) continue;
    const raw = Number(context[factor] ?? 0);
    const normalized = normalize(raw, range);
    const contribution = normalized * weight;
    totalScore += contribution;
    weightSum += weight;
    factorScores[factor] = contribution;
  }

  const score = weightSum > 0 ? clamp01(totalScore / weightSum) : 0;
  const topFactors = Object.entries(factorScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  return { score, topFactors, factorScores };
}

export class PartnerAnalyticsRepository {
  private limits: AccountLimitsRepository;

  constructor(
    private db: Database,
    private nodeId: string // brand-ok — partner tree node slug
  ) {
    ensureAccountLimitsSchema(db);
    this.limits = new AccountLimitsRepository(db);
  }

  get node(): string {
    return this.nodeId;
  }

  detectRaises(sinceTimestamp = 0): LimitRaise[] {
    return this.limits.detectRaises(this.nodeId, sinceTimestamp);
  }

  detectRaisesEnriched(sinceTimestamp = 0): EnrichedLimitRaise[] {
    return this.limits.detectRaisesEnriched(this.nodeId, sinceTimestamp);
  }

  /** Insert freeze-shape multi-factor snapshot for a limit history row. */
  recordRaiseContext(
    limitRecordId: number,
    metrics: RaiseContextMetrics,
    snapshotAt?: number
  ): void {
    // brand-ok — limit_record_id is partner_account_limits.id
    const at = snapshotAt ?? Math.floor(Date.now() / 1000);
    this.db.run(
      `INSERT INTO limit_raise_context (
         node_id, limit_record_id, active_players_7d, new_players_7d, total_handle_7d,
         avg_clv_7d, top_tier_player_count, violation_count_30d, chargeback_count_30d,
         kyc_pass_rate, market_volatility_index, peak_betting_hours, sportsbook_share,
         partner_profit_30d, partner_roi_30d, snapshot_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.nodeId,
        limitRecordId,
        metrics.active_players_7d,
        metrics.new_players_7d,
        metrics.total_handle_7d,
        metrics.avg_clv_7d,
        metrics.top_tier_player_count,
        metrics.violation_count_30d,
        metrics.chargeback_count_30d,
        metrics.kyc_pass_rate,
        metrics.market_volatility_index,
        metrics.peak_betting_hours,
        metrics.sportsbook_share,
        metrics.partner_profit_30d,
        metrics.partner_roi_30d,
        at,
      ]
    );
  }

  getRaiseContext(limitRecordId: number): RaiseContextRow | null {
    const row = this.db
      .query(
        `SELECT * FROM limit_raise_context
         WHERE node_id = ? AND limit_record_id = ?
         ORDER BY snapshot_at DESC
         LIMIT 1`
      )
      .get(this.nodeId, limitRecordId) as RaiseContextRow | null;
    return row ?? null;
  }

  /**
   * Derive a best-effort snapshot from tables we already have
   * (players, CLV, line move). Missing analytics fall back to zeros / defaults.
   */
  deriveContextMetrics(raise: LimitRaise): RaiseContextMetrics {
    const players = this.db
      .query(`SELECT COUNT(*) AS c FROM partner_players WHERE node_id = ?`)
      .get(this.nodeId) as { c: number };
    const topTier = this.db
      .query(
        `SELECT COUNT(*) AS c FROM partner_players
         WHERE node_id = ? AND tier IN ('gold', 'platinum')`
      )
      .get(this.nodeId) as { c: number };

    const avgClv = this.db
      .query(
        `SELECT AVG(expected_value) AS a FROM player_clv_snapshots
         WHERE node_id = ? AND recorded_at > ?`
      )
      .get(this.nodeId, raise.increased_at - 7 * 86400) as { a: number | null };

    const vol = this.db
      .query(
        `SELECT AVG(ABS(move_delta)) AS v FROM market_line_movement
         WHERE node_id = ? AND sportsbook = ? AND sport_id = ? AND market_id = ?
           AND bet_type = ? AND recorded_at BETWEEN ? AND ?`
      )
      .get(
        this.nodeId,
        raise.sportsbook,
        raise.sport_id,
        raise.market_id,
        raise.bet_type,
        raise.increased_at,
        raise.increased_at + 300
      ) as { v: number | null };

    // Optional regulatory tables when present on operations.db
    let violations = 0;
    try {
      const v = this.db
        .query(
          `SELECT COUNT(*) AS c FROM regulatory_violations
           WHERE node_id = ? AND created_at > ?`
        )
        .get(this.nodeId, raise.increased_at - 30 * 86400) as { c: number } | null;
      violations = v?.c ?? 0;
    } catch {
      /* table may not exist in :memory: fixtures */
    }

    return {
      active_players_7d: players?.c ?? 0,
      new_players_7d: 0,
      total_handle_7d: 0,
      avg_clv_7d: avgClv?.a ?? 0,
      top_tier_player_count: topTier?.c ?? 0,
      violation_count_30d: violations,
      chargeback_count_30d: 0,
      kyc_pass_rate: 1,
      market_volatility_index: vol?.v ?? 0,
      peak_betting_hours: JSON.stringify([18, 19, 20]),
      sportsbook_share: 0.5,
      partner_profit_30d: 0,
      partner_roi_30d: 0,
    };
  }

  /**
   * For each raise in the lookback without a context row, derive + insert snapshot.
   * Returns number of contexts written.
   */
  captureMissingRaiseContexts(sinceTimestamp = 0): number {
    const raises = this.detectRaises(sinceTimestamp);
    let written = 0;
    for (const r of raises) {
      if (this.getRaiseContext(r.limit_id)) continue;
      const metrics = this.deriveContextMetrics(r);
      this.recordRaiseContext(r.limit_id, metrics, r.increased_at);
      written++;
    }
    return written;
  }

  /** CLV + line + multi-factor context + score. */
  getEnrichedRaisesWithContext(sinceTimestamp = 0): MultiFactorEnrichedRaise[] {
    const enriched = this.detectRaisesEnriched(sinceTimestamp);
    return enriched.map(r => {
      const context = this.getRaiseContext(r.limit_id);
      const multi = context
        ? computeMultiFactorScore(context)
        : { score: 0, topFactors: [] as string[], factorScores: {} as Record<string, number> };
      return {
        ...r,
        context,
        multi_factor_score: multi.score,
        top_contributing_factors: multi.topFactors,
        factor_scores: multi.factorScores,
      };
    });
  }
}

/** Format multi-factor enriched raises for terminal. */
export function formatMultiFactorRaises(raises: MultiFactorEnrichedRaise[]): string {
  if (raises.length === 0) return '  No limit raises found.';
  const out: string[] = [];
  for (const r of raises) {
    const clv =
      r.top_clv.length === 0
        ? '—'
        : r.top_clv.map(p => `${p.player_name}(+$${p.delta.toFixed(0)})`).join(', ');
    const line =
      r.line_move_5m != null && Number.isFinite(r.line_move_5m) ? r.line_move_5m.toFixed(2) : 'N/A';
    out.push(
      `🚀 ${r.sportsbook} ${r.sport_id}/${r.market_id} ${r.bet_type}: $${r.previous_max} → $${r.new_limit}`
    );
    out.push(
      `   multi ${r.multi_factor_score.toFixed(2)} · drivers: ${r.top_contributing_factors.join(', ') || '—'}`
    );
    out.push(`   📈 Line 5m: ${line}  |  🎯 Top CLV: ${clv}`);
    if (r.context) {
      out.push(
        `   📊 handle7d=$${Math.round(r.context.total_handle_7d)} · clv7d=${r.context.avg_clv_7d.toFixed(1)}` +
          ` · kyc=${(r.context.kyc_pass_rate * 100).toFixed(0)}%` +
          ` · viol=${r.context.violation_count_30d} · cb=${r.context.chargeback_count_30d}`
      );
    }
  }
  return out.join('\n');
}
