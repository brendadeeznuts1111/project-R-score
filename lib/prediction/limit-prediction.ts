// @see https://bun.com/docs/runtime/sqlite
/**
 * Limit change prediction — forecast limit raise probability and magnitude
 * using multi-factor scores, historical frequency, and window patterns.
 *
 * Follows the prediction pattern from tester.ts (coverage prediction).
 */
import type { Database } from 'bun:sqlite';
import { getPredictionAccuracy, type AccuracySummary } from './tester.ts';
import { AccountLimitsRepository } from '../account-limits-repo.ts';
import { PartnerAnalyticsRepository } from '../operations/partner-analytics-repo.ts';
import { asTreeNodeId } from '../types/branded.ts';
import {
  getLimitForecastEvidenceSummary,
  issueLimitForecast,
  matureLimitForecasts,
  type LimitForecastEvidenceSummary,
  type LimitForecastFeatureSnapshot,
  type LimitForecastIssue,
} from './limit-forecast-evidence.ts';

export const LIMIT_PREDICTION_MODEL = 'bun-1.4.0-limit-v2-evidence';

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
  predictionDate: string;
  predictedRaiseProb: number; // 0-1 probability
  predictedMagnitudePct: number; // expected % increase
  confidence: 'low' | 'medium' | 'high';
  topDrivers: string[];
  windowHint: string;
  features: LimitForecastFeatureSnapshot;
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
  const analytics = new PartnerAnalyticsRepository(db, input.node_id);
  const enriched = analytics.getEnrichedRaisesWithContext(now - 48 * 3600);
  const match = enriched.find(e => e.sportsbook === input.sportsbook);
  if (match?.multi_factor_score != null) multiScore = match.multi_factor_score;

  // Window analysis
  const hour = new Date(now * 1000).getUTCHours();
  const dow = new Date(now * 1000).getUTCDay();

  // Probability model: P(raise) = clamp(5%, 95%, 0.30F + 0.25T + 0.30I + 0.15W).
  const frequencySignal = Math.min(1, recentRaises / 10);
  const trendSignal = Math.min(1, Math.max(0, trend / 1000));
  const windowSignal = hour >= 6 && hour <= 14 ? 1 : 0;
  const prob = Math.min(
    0.95,
    Math.max(
      0.05,
      frequencySignal * 0.3 + trendSignal * 0.25 + multiScore * 0.3 + windowSignal * 0.15
    )
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
  const features: LimitForecastFeatureSnapshot = {
    currentLimit: currentMax,
    recentObservationCount: recent.length,
    raiseFrequency7d: recentRaises,
    dailyLimitTrend: Number(trend.toFixed(6)),
    multiFactorInfluence: Number(multiScore.toFixed(6)),
    utcWindowSignal: windowSignal,
    utcHour: hour,
    utcDay: dow,
  };

  return {
    predictionDate: new Date(now * 1000).toISOString(),
    predictedRaiseProb: Number(prob.toFixed(4)),
    predictedMagnitudePct: Number((avgRaisePct * 100).toFixed(1)),
    confidence,
    topDrivers: [
      recentRaises > 0 ? `📊 ${recentRaises} raises in 7d` : '📊 No recent raises',
      multiScore > 0.5 ? `🧮 Score ${(multiScore * 100).toFixed(0)}%` : '🧮 Score building',
      trend > 0 ? `📈 Trend +$${trend.toFixed(0)}/day` : '📈 Stable trend',
    ],
    windowHint,
    features,
  };
}

/** Issue an immutable forecast. Accuracy is written only after explicit maturity. */
export function recordLimitPrediction(
  db: Database,
  input: LimitPredictionInput,
  prediction: LimitPrediction
): LimitForecastIssue {
  const issuedAt = Math.floor(new Date(prediction.predictionDate).getTime() / 1000);
  return issueLimitForecast(db, {
    dimension: {
      nodeId: asTreeNodeId(input.node_id),
      sportsbook: input.sportsbook,
      sportKey: input.sport_id,
      marketKey: input.market_id,
      betType: input.bet_type,
    },
    modelVersion: LIMIT_PREDICTION_MODEL,
    predictedRaiseProbability: prediction.predictedRaiseProb,
    predictedMagnitudePct: prediction.predictedMagnitudePct,
    features: prediction.features,
    issuedAt,
  });
}

/** Mature due forecasts only when a terminal observation proves horizon coverage. */
export function backfillLimitPredictions(
  db: Database,
  options?: { nowSec?: number; observationGraceSeconds?: number }
): number {
  return matureLimitForecasts(db, options).matured;
}

/** Run full prediction cycle: predict, record, backfill, return accuracy. */
export function runLimitPredictionCycle(db: Database): {
  predictions: number;
  backfilled: number;
  accuracy: AccuracySummary | null;
  evidence: LimitForecastEvidenceSummary;
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
  `
    )
    .all(now - 7 * 86400) as LimitPredictionInput[];

  let count = 0;
  for (const dim of dimensions) {
    const prediction = predictLimitRaise(db, dim, { nowSec: now });
    recordLimitPrediction(db, dim, prediction);
    count++;
  }

  const accuracy = getPredictionAccuracy(db, 'limit_raise');
  const evidence = getLimitForecastEvidenceSummary(db, now);
  return { predictions: count, backfilled, accuracy, evidence };
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
