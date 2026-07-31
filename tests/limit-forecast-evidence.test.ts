// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { ensureAccountLimitsSchema } from '../lib/account-limits-repo.ts';
import {
  getLimitForecastEvidenceSummary,
  issueLimitForecast,
  matureLimitForecasts,
  type LimitForecastFeatureSnapshot,
} from '../lib/prediction/limit-forecast-evidence.ts';
import { ensurePredictionSchema } from '../lib/prediction/schema.ts';
import { asTreeNodeId } from '../lib/types/branded.ts';

const DIMENSION = {
  nodeId: asTreeNodeId('forecast-test-partner'),
  sportsbook: 'draftkings',
  sportKey: 'nba',
  marketKey: 'spread',
  betType: 'pregame',
} as const;

const FEATURES: LimitForecastFeatureSnapshot = {
  currentLimit: 1_000,
  recentObservationCount: 4,
  raiseFrequency7d: 1,
  dailyLimitTrend: 100,
  multiFactorInfluence: 0.6,
  utcWindowSignal: 1,
  utcHour: 10,
  utcDay: 2,
};

function createDb(): Database {
  const db = new Database(':memory:');
  ensureAccountLimitsSchema(db);
  ensurePredictionSchema(db);
  return db;
}

function insertObservation(
  db: Database,
  options: { sportsbook?: string; maxWager: number; recordedAt: number }
): void {
  db.query(
    `INSERT INTO partner_account_limits (
       node_id, sportsbook, sport_id, market_id, bet_type,
       max_wager, effective_from, recorded_at
     ) VALUES (
       $nodeId, $sportsbook, $sportKey, $marketKey, $betType,
       $maxWager, $recordedAt, $recordedAt
     )`
  ).run({
    $nodeId: DIMENSION.nodeId,
    $sportsbook: options.sportsbook ?? DIMENSION.sportsbook,
    $sportKey: DIMENSION.sportKey,
    $marketKey: DIMENSION.marketKey,
    $betType: DIMENSION.betType,
    $maxWager: options.maxWager,
    $recordedAt: options.recordedAt,
  });
}

describe('limit forecast evidence lifecycle', () => {
  test('issuance is idempotent and immutable without creating a false negative', () => {
    const db = createDb();
    const input = {
      dimension: DIMENSION,
      modelVersion: 'test-model-v1',
      predictedRaiseProbability: 0.8,
      predictedMagnitudePct: 20,
      features: FEATURES,
      issuedAt: 1_000,
      horizonSeconds: 100,
    };
    const first = issueLimitForecast(db, input);
    const duplicate = issueLimitForecast(db, { ...input, issuedAt: 1_001 });

    expect(duplicate.id).toBe(first.id);
    expect(
      (
        db.query(`SELECT COUNT(*) AS n FROM limit_forecast_issues`).get() as {
          n: number;
        }
      ).n
    ).toBe(1);
    expect(
      (
        db.query(`SELECT COUNT(*) AS n FROM prediction_accuracy`).get() as {
          n: number;
        }
      ).n
    ).toBe(0);
    expect(() =>
      db.query(`UPDATE limit_forecast_issues SET current_limit = 999 WHERE id = ?`).run(first.id)
    ).toThrow(/immutable/);
    db.close();
  });

  test('due forecast stays pending without a terminal horizon observation', () => {
    const db = createDb();
    issueLimitForecast(db, {
      dimension: DIMENSION,
      modelVersion: 'test-model-v1',
      predictedRaiseProbability: 0.8,
      predictedMagnitudePct: 20,
      features: FEATURES,
      issuedAt: 1_000,
      horizonSeconds: 100,
    });
    insertObservation(db, { maxWager: 1_200, recordedAt: 1_050 });

    const maturity = matureLimitForecasts(db, {
      nowSec: 1_120,
      observationGraceSeconds: 20,
    });
    expect(maturity).toMatchObject({ due: 1, matured: 0, awaitingObservation: 1 });
    expect(getLimitForecastEvidenceSummary(db, 1_120)).toMatchObject({
      issues: 1,
      matured: 0,
      dueAwaitingObservation: 1,
      negatives: 0,
    });
    db.close();
  });

  test('matures observed raise and no-raise windows into scored outcomes', () => {
    const db = createDb();
    issueLimitForecast(db, {
      dimension: DIMENSION,
      modelVersion: 'test-model-v1',
      predictedRaiseProbability: 0.8,
      predictedMagnitudePct: 20,
      features: FEATURES,
      issuedAt: 1_000,
      horizonSeconds: 100,
    });
    issueLimitForecast(db, {
      dimension: { ...DIMENSION, sportsbook: 'fanduel' },
      modelVersion: 'test-model-v1',
      predictedRaiseProbability: 0.2,
      predictedMagnitudePct: 0,
      features: FEATURES,
      issuedAt: 1_000,
      horizonSeconds: 100,
    });
    insertObservation(db, { maxWager: 1_200, recordedAt: 1_050 });
    insertObservation(db, { maxWager: 1_200, recordedAt: 1_100 });
    insertObservation(db, { sportsbook: 'fanduel', maxWager: 1_000, recordedAt: 1_100 });

    const maturity = matureLimitForecasts(db, {
      nowSec: 1_110,
      observationGraceSeconds: 20,
    });
    expect(maturity.matured).toBe(2);
    expect(maturity.awaitingObservation).toBe(0);
    expect(maturity.outcomes.map(outcome => outcome.actualRaise)).toEqual([true, false]);
    expect(maturity.outcomes[0]).toMatchObject({
      actualMagnitudePct: 20,
      brierScore: 0.04,
    });
    expect(maturity.outcomes[1]).toMatchObject({
      actualMagnitudePct: 0,
      brierScore: 0.04,
    });

    const summary = getLimitForecastEvidenceSummary(db, 1_110);
    expect(summary).toMatchObject({
      issues: 2,
      pending: 0,
      matured: 2,
      positives: 1,
      negatives: 1,
      meanBrierScore: 0.04,
    });
    expect(
      (
        db
          .query(
            `SELECT COUNT(*) AS n
             FROM prediction_accuracy
             WHERE prediction_type = 'limit_raise'`
          )
          .get() as { n: number }
      ).n
    ).toBe(2);
    db.close();
  });
});
