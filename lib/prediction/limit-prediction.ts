// @see https://bun.com/docs/runtime/sqlite
/**
 * Limit change prediction — forecast limit raise probability and magnitude
 * using multi-factor scores, historical frequency, and window patterns.
 *
 * Follows the prediction pattern from tester.ts (coverage prediction).
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import { getPredictionAccuracy, type AccuracySummary } from './tester.ts';
import { AccountLimitsRepository } from '../account-limits-repo.ts';

export const LIMIT_PREDICTION_MODEL = 'bun-1.4.0-limit-v1';

/** Ensure prediction schema if table doesn't exist (reuses prediction_accuracy). */
export function ensureLimitPredictionSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS limit_prediction_state (
      node_id TEXT NOT NULL,
      dimension_key TEXT NOT NULL,
      last_predicted_at INTEGER DEFAULT 0,
      last_recorded_at INTEGER DEFAULT 0,
      max_wager_trend REAL DEFAULT 0,
      raise_frequency_7d REAL DEFAULT 0,
      avg_multi_score REAL DEFAULT 0,
      consecutive_raises INTEGER DEFAULT 0,
      window_hour INTEGER DEFAULT 0,
      window_dow INTEGER DEFAULT 0,
      PRIMARY KEY (node_id, dimension_key)
    );
    CREATE INDEX IF NOT EXISTS idx_lps_node ON limit_prediction_state(node_id);
  `);
}

export type LimitPredictionInput = {
  node_id: string; // brand-ok — TreeNodeId wire
  sportsbook: string;
  sport_id: string; // brand-ok — SportId wire
  market_id: string; // brand-ok — MarketId wire
  bet_type: string;
};

export type LimitPrediction = {
  id?: string; // brand-ok — opaque prediction row pk
  predictionDate: string;
  predictedRaiseProb: number; // 0-1 probability
  predictedMagnitudePct: number; // expected % increase
  confidence: 'low' | 'medium' | 'high';
  topDrivers: string[];
  windowHint: string;
};

/** Predict probability and magnitude of a limit raise for a given dimension. */
export function predictLimitRaise(
  db: Database,
  input: LimitPredictionInput,
  opts?: { nowSec?: number }
): LimitPrediction {
  ensureLimitPredictionSchema(db);
  const now = opts?.nowSec ?? Math.floor(Date.now() / 1000);
  const repo = new AccountLimitsRepository(db);

  // Get recent history for this dimension
  const recent = db
    .query(
      `
    SELECT max_wager, recorded_at FROM partner_account_limits
    WHERE node_id = ? AND sportsbook = ? AND sport_id = ? AND market_id = ? AND bet_type = ?
    ORDER BY recorded_at DESC LIMIT 14
  `
    )
    .all(
      input.node_id,
      input.sportsbook,
      input.sport_id,
      input.market_id,
      input.bet_type
    ) as Array<{ max_wager: number; recorded_at: number }>;

  // Compute features from history
  const raises = repo
    .detectRaises(input.node_id, now - 7 * 86400)
    .filter(r => r.sportsbook === input.sportsbook);
  const recentRaises = raises.length;
  const recentVolume = raises.reduce((s, r) => s + (r.new_limit - r.previous_max), 0);

  // Trend: slope of recent limits
  let trend = 0;
  if (recent.length >= 2) {
    const first = recent[recent.length - 1]!;
    const last = recent[0]!;
    const span = Math.max(1, last.recorded_at - first.recorded_at);
    trend = ((last.max_wager - first.max_wager) / span) * 86400; // daily trend
  }

  // Multi-factor score — try to get from context
  let multiScore = 0.5;
  try {
    const { PartnerAnalyticsRepository, computeMultiFactorScore } =
      require('./partner-analytics-repo.ts') as typeof import('../operations/partner-analytics-repo.ts');
    const analytics = new PartnerAnalyticsRepository(db, input.node_id);
    const enriched = analytics.getEnrichedRaisesWithContext(now - 48 * 3600);
    const match = enriched.find(e => e.sportsbook === input.sportsbook);
    if (match?.multi_factor_score != null) multiScore = match.multi_factor_score;
  } catch {}

  // Window analysis
  const hour = new Date(now * 1000).getHours();
  const dow = new Date(now * 1000).getDay();

  // Probability model: weighted combination of factors
  const freqFactor = Math.min(1, recentRaises / 10) * 0.3;
  const trendFactor = Math.min(1, Math.max(0, trend / 1000)) * 0.25;
  const scoreFactor = multiScore * 0.3;
  const windowFactor = (hour >= 6 && hour <= 14 ? 0.1 : 0.05) * 0.15;
  const prob = Math.min(
    0.95,
    Math.max(0.05, freqFactor + trendFactor + scoreFactor + windowFactor)
  );

  // Magnitude prediction: mean recent raise amount / current max
  const currentMax = recent[0]?.max_wager ?? 1000;
  const avgRaisePct =
    recentVolume > 0 && currentMax > 0 ? recentVolume / recentRaises / currentMax : 0.1;

  // Confidence
  const confidence: 'low' | 'medium' | 'high' =
    recentRaises >= 3 && multiScore > 0.3 ? 'high' : recentRaises >= 1 ? 'medium' : 'low';

  // Window hint
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const windowHint = `Best window: ${dayNames[dow]} ${hour}:00-${Math.min(23, hour + 4)}:00 UTC`;

  return {
    predictionDate: new Date(now * 1000).toISOString().slice(0, 10),
    predictedRaiseProb: Number(prob.toFixed(4)),
    predictedMagnitudePct: Number((avgRaisePct * 100).toFixed(1)),
    confidence,
    topDrivers: [
      recentRaises > 0 ? `📊 ${recentRaises} raises in 7d` : '📊 No recent raises',
      multiScore > 0.5 ? `🧮 Score ${(multiScore * 100).toFixed(0)}%` : '🧮 Score building',
      trend > 0 ? `📈 Trend +$${trend.toFixed(0)}/day` : '📈 Stable trend',
    ],
    windowHint,
  };
}

/** Record a prediction in prediction_accuracy for backtesting. */
export function recordLimitPrediction(
  db: Database,
  input: LimitPredictionInput,
  prediction: LimitPrediction
): void {
  db.run(
    `
    INSERT OR IGNORE INTO prediction_accuracy
      (id, prediction_type, predicted_value, actual_value, error, prediction_date, actual_date, model_version, context, created_at)
    VALUES (?, ?, ?, 0, 0, ?, ?, ?, ?, ?)
  `,
    [
      randomUUIDv7(),
      'limit_raise',
      prediction.predictedRaiseProb,
      prediction.predictionDate,
      prediction.predictionDate,
      LIMIT_PREDICTION_MODEL,
      JSON.stringify({
        sportsbook: input.sportsbook,
        sport_id: input.sport_id,
        market_id: input.market_id,
        bet_type: input.bet_type,
        confidence: prediction.confidence,
        predictedMagnitudePct: prediction.predictedMagnitudePct,
        topDrivers: prediction.topDrivers,
      }),
      new Date().toISOString(),
    ]
  );
}

/** Backfill actual_value + error for past predictions once real data arrives. */
export function backfillLimitPredictions(db: Database): number {
  const pending = db
    .query(
      `
    SELECT pa.id, pa.prediction_date, pa.context
    FROM prediction_accuracy pa
    WHERE pa.prediction_type = 'limit_raise' AND pa.actual_value = 0
  `
    )
    .all() as Array<{ id: string; prediction_date: string; context: string }>; // brand-ok ×2 — opaque PK + date

  let count = 0;
  for (const row of pending) {
    const ctx = JSON.parse(row.context) as Record<string, string>;
    const dayStart = Math.floor(new Date(row.prediction_date).getTime() / 1000);
    const dayEnd = dayStart + 86400;

    // Check if a raise occurred in the 48h after prediction
    const actual = db
      .query(
        `
      SELECT COUNT(*) as n FROM partner_account_limits a
      WHERE a.node_id = ? AND a.sportsbook = ? AND a.sport_id = ? AND a.market_id = ? AND a.bet_type = ?
        AND a.recorded_at BETWEEN ? AND ?
        AND EXISTS (
          SELECT 1 FROM partner_account_limits b
          WHERE b.node_id = a.node_id AND b.sportsbook = a.sportsbook
            AND b.sport_id = a.sport_id AND b.market_id = a.market_id
            AND b.bet_type = a.bet_type AND b.id < a.id
            AND a.max_wager > b.max_wager
        )
    `
      )
      .get(
        ctx.node_id ?? '',
        ctx.sportsbook ?? '',
        ctx.sport_id ?? '',
        ctx.market_id ?? '',
        ctx.bet_type ?? '',
        dayStart,
        dayEnd + 86400
      ) as { n: number } | null;

    const actualValue = (actual?.n ?? 0) > 0 ? 1 : 0;
    const predicted = db
      .query(`SELECT predicted_value FROM prediction_accuracy WHERE id = ?`)
      .get(row.id) as { predicted_value: number } | null;

    if (predicted != null) {
      const error = Math.abs(predicted.predicted_value - actualValue);
      db.run(`UPDATE prediction_accuracy SET actual_value = ?, error = ? WHERE id = ?`, [
        actualValue,
        error,
        row.id,
      ]);
      count++;
    }
  }
  return count;
}

/** Run full prediction cycle: predict, record, backfill, return accuracy. */
export function runLimitPredictionCycle(db: Database): {
  predictions: number;
  backfilled: number;
  accuracy: AccuracySummary | null;
} {
  ensureLimitPredictionSchema(db);
  const now = Math.floor(Date.now() / 1000);

  // Backfill past predictions first
  const backfilled = backfillLimitPredictions(db);

  // Get all unique dimension keys with recent activity
  const dimensions = db
    .query(
      `
    SELECT DISTINCT node_id, sportsbook, sport_id, market_id, bet_type
    FROM partner_account_limits
    WHERE recorded_at > ?
  `,
      [now - 7 * 86400]
    )
    .all() as LimitPredictionInput[];

  let count = 0;
  for (const dim of dimensions) {
    const prediction = predictLimitRaise(db, dim, { nowSec: now });
    recordLimitPrediction(db, dim, prediction);
    count++;
  }

  const accuracy = getPredictionAccuracy(db, 'limit_raise');
  return { predictions: count, backfilled, accuracy };
}

/** Format limit prediction as terminal-friendly string. */
export function formatLimitPrediction(prediction: LimitPrediction): string {
  const bar =
    '█'.repeat(Math.max(1, Math.round(prediction.predictedRaiseProb * 20))) +
    '░'.repeat(Math.max(0, 20 - Math.round(prediction.predictedRaiseProb * 20)));
  const confEmoji =
    prediction.confidence === 'high' ? '🟢' : prediction.confidence === 'medium' ? '🟡' : '🔴';
  return [
    `${confEmoji} Raise probability: ${bar} ${(prediction.predictedRaiseProb * 100).toFixed(0)}%`,
    `   Expected magnitude: +${prediction.predictedMagnitudePct}%`,
    `   Confidence: ${prediction.confidence}`,
    `   Drivers: ${prediction.topDrivers.join(' · ')}`,
    `   ${prediction.windowHint}`,
  ].join('\n');
}
