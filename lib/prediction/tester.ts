// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Coverage prediction backtest against coverage_snapshots.
 */
import type { Database } from 'bun:sqlite';
import { ensurePlatformCoverageSchema } from '../operations/platform-coverage.ts';
import { ensurePredictionSchema } from './schema.ts';

export type PredictionType = 'coverage' | 'arbitrage' | 'routing';

export type PredictionContext = {
  predictionWindow?: number;
  note?: string;
};

export type PredictionTest = {
  id: string; // brand-ok — prediction_accuracy PK
  type: PredictionType;
  predictedValue: number;
  actualValue: number;
  error: number;
  date: string;
  modelVersion: string;
  context: PredictionContext;
};

export type AccuracySummary = {
  mae: number;
  rmse: number;
  bias: number;
  n: number;
};

/** Naive predictor: covered/total among platforms launched by asOfDate (prod accounts only). */
export function simulateCoveragePrediction(db: Database, asOfDate: string): number {
  ensurePlatformCoverageSchema(db);
  const total = db
    .query(
      `SELECT COUNT(*) AS c FROM platforms
       WHERE (status = 'active' OR (status IS NULL AND COALESCE(active, 1) = 1))
         AND (launch_date IS NULL OR launch_date <= $d)`
    )
    .get({ $d: asOfDate }) as { c: number };
  const covered = db
    .query(
      `SELECT COUNT(DISTINCT a.platform_id) AS c
       FROM partner_platform_accounts a
       JOIN platforms p ON p.id = a.platform_id
       WHERE a.status = 'active' AND COALESCE(a.is_test, 0) = 0
         AND (p.launch_date IS NULL OR p.launch_date <= $d)
         AND a.opened_at <= $d`
    )
    .get({ $d: asOfDate }) as { c: number };
  return total.c > 0 ? Math.round((10000 * covered.c) / total.c) / 100 : 0;
}

export function runCoverageBacktest(
  db: Database,
  startDate: string,
  endDate: string
): PredictionTest[] {
  ensurePredictionSchema(db);
  ensurePlatformCoverageSchema(db);

  const snapshots = db
    .query(
      `SELECT snapshot_date, coverage_percentage FROM coverage_snapshots
       WHERE snapshot_date >= $s AND snapshot_date <= $e
       ORDER BY snapshot_date`
    )
    .all({ $s: startDate, $e: endDate }) as {
    snapshot_date: string;
    coverage_percentage: number;
  }[];

  const results: PredictionTest[] = [];
  const modelVersion = `bun-${Bun.version}-coverage-v1`;
  const now = new Date().toISOString();

  for (const snap of snapshots) {
    const predicted = simulateCoveragePrediction(db, snap.snapshot_date);
    const actual = snap.coverage_percentage;
    const error = Math.abs(predicted - actual);
    const id = Bun.randomUUIDv7();
    const ctx = { predictionWindow: 30 };
    db.run(
      `INSERT INTO prediction_accuracy
         (id, prediction_type, predicted_value, actual_value, error,
          prediction_date, actual_date, model_version, context, created_at)
       VALUES ($id, 'coverage', $pred, $act, $err, $d, $d, $mv, $ctx, $now)`,
      {
        $id: id,
        $pred: predicted,
        $act: actual,
        $err: error,
        $d: snap.snapshot_date,
        $mv: modelVersion,
        $ctx: JSON.stringify(ctx),
        $now: now,
      }
    );
    results.push({
      id,
      type: 'coverage',
      predictedValue: predicted,
      actualValue: actual,
      error,
      date: snap.snapshot_date,
      modelVersion,
      context: ctx,
    });
  }
  return results;
}

export function getPredictionAccuracy(
  db: Database,
  predictionType: PredictionType | string
): AccuracySummary {
  ensurePredictionSchema(db);
  const rows = db
    .query(
      `SELECT predicted_value, actual_value, error FROM prediction_accuracy
       WHERE prediction_type = $t`
    )
    .all({ $t: predictionType }) as {
    predicted_value: number;
    actual_value: number;
    error: number;
  }[];
  if (!rows.length) return { mae: 0, rmse: 0, bias: 0, n: 0 };
  const n = rows.length;
  const mae = rows.reduce((s, r) => s + r.error, 0) / n;
  const rmse = Math.sqrt(rows.reduce((s, r) => s + r.error * r.error, 0) / n);
  const bias = rows.reduce((s, r) => s + (r.predicted_value - r.actual_value), 0) / n;
  return { mae, rmse, bias, n };
}
