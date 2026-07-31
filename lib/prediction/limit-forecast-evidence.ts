// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Immutable issuance and explicit maturity for limit-raise forecasts.
 *
 * An issue row is never updated. A separate outcome row is written only after
 * the horizon has elapsed and a terminal observation proves coverage through
 * that horizon. Pending is therefore never represented as an actual value of 0.
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import {
  asLimitForecastIssueId,
  asTreeNodeId,
  type LimitForecastIssueId,
  type TreeNodeId,
} from '../types/branded.ts';
import { ensurePredictionSchema } from './schema.ts';

export const LIMIT_FORECAST_HORIZON_SECONDS = 48 * 60 * 60;
export const LIMIT_FORECAST_OBSERVATION_GRACE_SECONDS = 6 * 60 * 60;
export const LIMIT_FORECAST_ISSUANCE_CADENCE_SECONDS = 24 * 60 * 60;
export const LIMIT_FORECAST_FEATURE_VERSION = 'limit-features-v1';

export type LimitForecastDimension = {
  nodeId: TreeNodeId;
  sportsbook: string;
  sportKey: string;
  marketKey: string;
  betType: string;
};

export type LimitForecastFeatureSnapshot = {
  currentLimit: number;
  recentObservationCount: number;
  raiseFrequency7d: number;
  dailyLimitTrend: number;
  multiFactorInfluence: number;
  utcWindowSignal: number;
  utcHour: number;
  utcDay: number;
};

export type LimitForecastIssue = {
  id: LimitForecastIssueId;
  dimension: LimitForecastDimension;
  modelVersion: string;
  featureVersion: string;
  predictedRaiseProbability: number;
  predictedMagnitudePct: number;
  features: LimitForecastFeatureSnapshot;
  issuedAt: number;
  horizonSeconds: number;
  evaluationAt: number;
};

export type LimitForecastOutcome = {
  issueId: LimitForecastIssueId;
  actualRaise: boolean;
  actualMagnitudePct: number;
  observationCount: number;
  observedThroughAt: number;
  firstRaiseAt: number | null;
  brierScore: number;
  logLoss: number;
  maturedAt: number;
};

export type LimitForecastMaturityResult = {
  due: number;
  matured: number;
  awaitingObservation: number;
  outcomes: LimitForecastOutcome[];
};

export type LimitForecastEvidenceSummary = {
  issues: number;
  pending: number;
  dueAwaitingObservation: number;
  matured: number;
  positives: number;
  negatives: number;
  meanBrierScore: number | null;
  meanLogLoss: number | null;
};

type WireIssueRow = {
  id: string; // brand-ok — parsed as LimitForecastIssueId at SQLite boundary
  node_id: string; // brand-ok — parsed as TreeNodeId at SQLite boundary
  sportsbook: string;
  sport_id: string; // brand-ok — source dimension key
  market_id: string; // brand-ok — source dimension key
  bet_type: string;
  model_version: string;
  feature_version: string;
  predicted_raise_probability: number;
  predicted_magnitude_pct: number;
  current_limit: number;
  feature_json: string;
  issued_at: number;
  horizon_seconds: number;
  evaluation_at: number;
};

type ObservationRow = {
  max_wager: number;
  recorded_at: number;
};

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function assertProbability(value: number): void {
  assertFinite('predictedRaiseProbability', value);
  if (value < 0 || value > 1) {
    throw new RangeError('predictedRaiseProbability must be between 0 and 1');
  }
}

function clampProbability(value: number): number {
  return Math.min(1 - 1e-9, Math.max(1e-9, value));
}

function round(value: number, places = 8): number {
  return Number(value.toFixed(places));
}

function parseFeatureSnapshot(json: string): LimitForecastFeatureSnapshot {
  const value = JSON.parse(json) as LimitForecastFeatureSnapshot;
  return value;
}

function issueFromRow(row: WireIssueRow): LimitForecastIssue {
  return {
    id: asLimitForecastIssueId(row.id),
    dimension: {
      nodeId: asTreeNodeId(row.node_id),
      sportsbook: row.sportsbook,
      sportKey: row.sport_id,
      marketKey: row.market_id,
      betType: row.bet_type,
    },
    modelVersion: row.model_version,
    featureVersion: row.feature_version,
    predictedRaiseProbability: row.predicted_raise_probability,
    predictedMagnitudePct: row.predicted_magnitude_pct,
    features: parseFeatureSnapshot(row.feature_json),
    issuedAt: row.issued_at,
    horizonSeconds: row.horizon_seconds,
    evaluationAt: row.evaluation_at,
  };
}

export function issueLimitForecast(
  db: Database,
  input: {
    dimension: LimitForecastDimension;
    modelVersion: string;
    predictedRaiseProbability: number;
    predictedMagnitudePct: number;
    features: LimitForecastFeatureSnapshot;
    issuedAt?: number;
    horizonSeconds?: number;
  }
): LimitForecastIssue {
  ensurePredictionSchema(db);
  assertProbability(input.predictedRaiseProbability);
  assertFinite('predictedMagnitudePct', input.predictedMagnitudePct);
  assertFinite('currentLimit', input.features.currentLimit);
  if (input.features.currentLimit < 0) throw new RangeError('currentLimit must be non-negative');

  const issuedAt = input.issuedAt ?? Math.floor(Date.now() / 1000);
  const horizonSeconds = input.horizonSeconds ?? LIMIT_FORECAST_HORIZON_SECONDS;
  if (!Number.isInteger(issuedAt) || issuedAt <= 0) {
    throw new RangeError('issuedAt must be a positive epoch second');
  }
  if (!Number.isInteger(horizonSeconds) || horizonSeconds <= 0) {
    throw new RangeError('horizonSeconds must be a positive integer');
  }

  const issue: LimitForecastIssue = {
    id: asLimitForecastIssueId(randomUUIDv7()),
    dimension: input.dimension,
    modelVersion: input.modelVersion,
    featureVersion: LIMIT_FORECAST_FEATURE_VERSION,
    predictedRaiseProbability: input.predictedRaiseProbability,
    predictedMagnitudePct: input.predictedMagnitudePct,
    features: input.features,
    issuedAt,
    horizonSeconds,
    evaluationAt: issuedAt + horizonSeconds,
  };

  const inserted = db
    .query(
      `INSERT INTO limit_forecast_issues (
         id, node_id, sportsbook, sport_id, market_id, bet_type,
         model_version, feature_version, predicted_raise_probability,
         predicted_magnitude_pct, current_limit, feature_json,
         issued_at, horizon_seconds, evaluation_at, created_at
       ) VALUES (
         $id, $nodeId, $sportsbook, $sportKey, $marketKey, $betType,
         $modelVersion, $featureVersion, $probability,
         $magnitude, $currentLimit, $features,
         $issuedAt, $horizonSeconds, $evaluationAt, $createdAt
       )
       ON CONFLICT DO NOTHING`
    )
    .run({
      $id: issue.id,
      $nodeId: issue.dimension.nodeId,
      $sportsbook: issue.dimension.sportsbook,
      $sportKey: issue.dimension.sportKey,
      $marketKey: issue.dimension.marketKey,
      $betType: issue.dimension.betType,
      $modelVersion: issue.modelVersion,
      $featureVersion: issue.featureVersion,
      $probability: issue.predictedRaiseProbability,
      $magnitude: issue.predictedMagnitudePct,
      $currentLimit: issue.features.currentLimit,
      $features: JSON.stringify(issue.features),
      $issuedAt: issue.issuedAt,
      $horizonSeconds: issue.horizonSeconds,
      $evaluationAt: issue.evaluationAt,
      $createdAt: new Date(issue.issuedAt * 1000).toISOString(),
    });

  if (inserted.changes > 0) return issue;

  const cadenceStart =
    Math.floor(issue.issuedAt / LIMIT_FORECAST_ISSUANCE_CADENCE_SECONDS) *
    LIMIT_FORECAST_ISSUANCE_CADENCE_SECONDS;
  const existing = db
    .query(
      `SELECT * FROM limit_forecast_issues
       WHERE node_id = $nodeId
         AND sportsbook = $sportsbook
         AND sport_id = $sportKey
         AND market_id = $marketKey
         AND bet_type = $betType
         AND model_version = $modelVersion
         AND issued_at >= $cadenceStart
         AND issued_at < $cadenceEnd
       ORDER BY issued_at
       LIMIT 1`
    )
    .get({
      $nodeId: issue.dimension.nodeId,
      $sportsbook: issue.dimension.sportsbook,
      $sportKey: issue.dimension.sportKey,
      $marketKey: issue.dimension.marketKey,
      $betType: issue.dimension.betType,
      $modelVersion: issue.modelVersion,
      $cadenceStart: cadenceStart,
      $cadenceEnd: cadenceStart + LIMIT_FORECAST_ISSUANCE_CADENCE_SECONDS,
    }) as WireIssueRow | null;
  if (!existing) throw new Error('Limit forecast issue conflict could not be resolved');
  return issueFromRow(existing);
}

function terminalObservation(
  db: Database,
  issue: WireIssueRow,
  graceSeconds: number
): ObservationRow | null {
  return db
    .query(
      `SELECT max_wager, recorded_at
       FROM partner_account_limits
       WHERE node_id = $nodeId
         AND sportsbook = $sportsbook
         AND sport_id = $sportKey
         AND market_id = $marketKey
         AND bet_type = $betType
         AND recorded_at >= $evaluationAt
         AND recorded_at <= $graceEnd
       ORDER BY recorded_at ASC, id ASC
       LIMIT 1`
    )
    .get({
      $nodeId: issue.node_id,
      $sportsbook: issue.sportsbook,
      $sportKey: issue.sport_id,
      $marketKey: issue.market_id,
      $betType: issue.bet_type,
      $evaluationAt: issue.evaluation_at,
      $graceEnd: issue.evaluation_at + graceSeconds,
    }) as ObservationRow | null;
}

function windowObservations(db: Database, issue: WireIssueRow): ObservationRow[] {
  return db
    .query(
      `SELECT max_wager, recorded_at
       FROM partner_account_limits
       WHERE node_id = $nodeId
         AND sportsbook = $sportsbook
         AND sport_id = $sportKey
         AND market_id = $marketKey
         AND bet_type = $betType
         AND recorded_at > $issuedAt
         AND recorded_at <= $evaluationAt
       ORDER BY recorded_at ASC, id ASC`
    )
    .all({
      $nodeId: issue.node_id,
      $sportsbook: issue.sportsbook,
      $sportKey: issue.sport_id,
      $marketKey: issue.market_id,
      $betType: issue.bet_type,
      $issuedAt: issue.issued_at,
      $evaluationAt: issue.evaluation_at,
    }) as ObservationRow[];
}

export function matureLimitForecasts(
  db: Database,
  options?: { nowSec?: number; observationGraceSeconds?: number }
): LimitForecastMaturityResult {
  ensurePredictionSchema(db);
  const nowSec = options?.nowSec ?? Math.floor(Date.now() / 1000);
  const graceSeconds = options?.observationGraceSeconds ?? LIMIT_FORECAST_OBSERVATION_GRACE_SECONDS;
  const due = db
    .query(
      `SELECT issue.*
       FROM limit_forecast_issues issue
       LEFT JOIN limit_forecast_outcomes outcome ON outcome.issue_id = issue.id
       WHERE outcome.issue_id IS NULL
         AND issue.evaluation_at <= $now
       ORDER BY issue.evaluation_at, issue.id`
    )
    .all({ $now: nowSec }) as WireIssueRow[];

  const outcomes: LimitForecastOutcome[] = [];
  let awaitingObservation = 0;

  for (const row of due) {
    const terminal = terminalObservation(db, row, graceSeconds);
    if (!terminal) {
      awaitingObservation++;
      continue;
    }

    const observations = windowObservations(db, row);
    const raisedRows = observations.filter(
      observation => observation.max_wager > row.current_limit
    );
    const firstRaise = raisedRows[0] ?? null;
    const maximumLimit = observations.reduce(
      (maximum, observation) => Math.max(maximum, observation.max_wager),
      row.current_limit
    );
    const actualRaise = firstRaise != null;
    const actualMagnitudePct =
      actualRaise && row.current_limit > 0
        ? ((maximumLimit - row.current_limit) / row.current_limit) * 100
        : 0;
    const actual = actualRaise ? 1 : 0;
    const probability = clampProbability(row.predicted_raise_probability);
    const brierScore = (probability - actual) ** 2;
    const logLoss = -(actual * Math.log(probability) + (1 - actual) * Math.log(1 - probability));
    const outcome: LimitForecastOutcome = {
      issueId: asLimitForecastIssueId(row.id),
      actualRaise,
      actualMagnitudePct: round(actualMagnitudePct),
      observationCount: observations.length,
      observedThroughAt: terminal.recorded_at,
      firstRaiseAt: firstRaise?.recorded_at ?? null,
      brierScore: round(brierScore),
      logLoss: round(logLoss),
      maturedAt: nowSec,
    };

    db.transaction(() => {
      db.query(
        `INSERT OR IGNORE INTO limit_forecast_outcomes (
           issue_id, actual_raise, actual_magnitude_pct, observation_count,
           observed_through_at, first_raise_at, brier_score, log_loss,
           evidence_json, matured_at, created_at
         ) VALUES (
           $issueId, $actualRaise, $actualMagnitude, $observationCount,
           $observedThroughAt, $firstRaiseAt, $brier, $logLoss,
           $evidence, $maturedAt, $createdAt
         )`
      ).run({
        $issueId: outcome.issueId,
        $actualRaise: outcome.actualRaise ? 1 : 0,
        $actualMagnitude: outcome.actualMagnitudePct,
        $observationCount: outcome.observationCount,
        $observedThroughAt: outcome.observedThroughAt,
        $firstRaiseAt: outcome.firstRaiseAt,
        $brier: outcome.brierScore,
        $logLoss: outcome.logLoss,
        $evidence: JSON.stringify({
          terminalLimit: terminal.max_wager,
          terminalRecordedAt: terminal.recorded_at,
          maximumLimit,
          horizonStart: row.issued_at,
          horizonEnd: row.evaluation_at,
        }),
        $maturedAt: outcome.maturedAt,
        $createdAt: new Date(outcome.maturedAt * 1000).toISOString(),
      });
      db.query(
        `INSERT OR IGNORE INTO prediction_accuracy (
           id, prediction_type, predicted_value, actual_value, error,
           prediction_date, actual_date, model_version, context, created_at
         ) VALUES (
           $id, 'limit_raise', $predicted, $actual, $error,
           $predictionDate, $actualDate, $modelVersion, $context, $createdAt
         )`
      ).run({
        $id: outcome.issueId,
        $predicted: row.predicted_raise_probability,
        $actual: actual,
        $error: Math.abs(row.predicted_raise_probability - actual),
        $predictionDate: new Date(row.issued_at * 1000).toISOString(),
        $actualDate: new Date(row.evaluation_at * 1000).toISOString(),
        $modelVersion: row.model_version,
        $context: JSON.stringify({
          node_id: row.node_id,
          sportsbook: row.sportsbook,
          sport_id: row.sport_id,
          market_id: row.market_id,
          bet_type: row.bet_type,
          forecastIssueId: row.id,
          horizonSeconds: row.horizon_seconds,
        }),
        $createdAt: new Date(outcome.maturedAt * 1000).toISOString(),
      });
    })();
    outcomes.push(outcome);
  }

  return {
    due: due.length,
    matured: outcomes.length,
    awaitingObservation,
    outcomes,
  };
}

export function getLimitForecastEvidenceSummary(
  db: Database,
  nowSec = Math.floor(Date.now() / 1000)
): LimitForecastEvidenceSummary {
  ensurePredictionSchema(db);
  return readLimitForecastEvidenceSummary(db, nowSec);
}

function tableExists(db: Database, name: string): boolean {
  return (
    db.query(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name) != null
  );
}

/** Read-only projection for lab bakes; returns an empty slice before migration. */
export function readLimitForecastEvidenceSummary(
  db: Database,
  nowSec = Math.floor(Date.now() / 1000)
): LimitForecastEvidenceSummary {
  if (!tableExists(db, 'limit_forecast_issues') || !tableExists(db, 'limit_forecast_outcomes')) {
    return {
      issues: 0,
      pending: 0,
      dueAwaitingObservation: 0,
      matured: 0,
      positives: 0,
      negatives: 0,
      meanBrierScore: null,
      meanLogLoss: null,
    };
  }
  const row = db
    .query(
      `SELECT
         COUNT(issue.id) AS issues,
         SUM(CASE WHEN outcome.issue_id IS NULL AND issue.evaluation_at > $now THEN 1 ELSE 0 END)
           AS pending,
         SUM(CASE WHEN outcome.issue_id IS NULL AND issue.evaluation_at <= $now THEN 1 ELSE 0 END)
           AS due_awaiting,
         COUNT(outcome.issue_id) AS matured,
         SUM(CASE WHEN outcome.actual_raise = 1 THEN 1 ELSE 0 END) AS positives,
         SUM(CASE WHEN outcome.actual_raise = 0 THEN 1 ELSE 0 END) AS negatives,
         AVG(outcome.brier_score) AS mean_brier,
         AVG(outcome.log_loss) AS mean_log_loss
       FROM limit_forecast_issues issue
       LEFT JOIN limit_forecast_outcomes outcome ON outcome.issue_id = issue.id`
    )
    .get({ $now: nowSec }) as {
    issues: number;
    pending: number | null;
    due_awaiting: number | null;
    matured: number;
    positives: number | null;
    negatives: number | null;
    mean_brier: number | null;
    mean_log_loss: number | null;
  };

  return {
    issues: row.issues,
    pending: row.pending ?? 0,
    dueAwaitingObservation: row.due_awaiting ?? 0,
    matured: row.matured,
    positives: row.positives ?? 0,
    negatives: row.negatives ?? 0,
    meanBrierScore: row.mean_brier == null ? null : round(row.mean_brier),
    meanLogLoss: row.mean_log_loss == null ? null : round(row.mean_log_loss),
  };
}
