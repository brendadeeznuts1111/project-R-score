// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  getPredictionAccuracy,
  runCoverageBacktest,
  runDailyCoveragePredictionCycle,
  simulateCoveragePrediction,
} from '../lib/prediction/tester.ts';

function seedPlatformsAndAccount(db: ReturnType<typeof openOperationsDb>) {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO platforms (id, name, category, launch_date, active, status, created_at)
     VALUES ('a', 'A', 'sportsbook', '2024-01-01', 1, 'active', $n),
            ('b', 'B', 'sportsbook', '2024-01-01', 1, 'active', $n)`,
    { $n: now }
  );
  const partnerId = Bun.randomUUIDv7();
  db.run(
    `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
     VALUES ($id, 'partner', 'P', 1, 'partner', $n)`,
    { $id: partnerId, $n: now }
  );
  db.run(
    `INSERT INTO partner_platform_accounts
       (id, platform_id, partner_id, account_identifier, balance, status, is_test, opened_at, created_at)
     VALUES ($id, 'a', $p, 'x', 1, 'active', 0, '2024-06-01T00:00:00.000Z', $n)`,
    { $id: Bun.randomUUIDv7(), $p: partnerId, $n: now }
  );
  return now;
}

describe('prediction coverage backtest', () => {
  test('backtest vs synthetic snapshots yields known error stats', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = seedPlatformsAndAccount(db);

    // Actual snapshot says 80%; predictor at that date = 50% (1/2)
    db.run(
      `INSERT INTO coverage_snapshots
         (snapshot_date, total_platforms, covered_platforms, coverage_percentage, by_category, created_at)
       VALUES ('2024-07-01', 2, 1, 80, '[]', $n)`,
      { $n: now }
    );

    const predicted = simulateCoveragePrediction(db, '2024-07-01');
    expect(predicted).toBe(50);

    const rows = runCoverageBacktest(db, '2024-01-01', '2024-12-31');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.error).toBe(30);

    // Second run is idempotent (no duplicate rows)
    const again = runCoverageBacktest(db, '2024-01-01', '2024-12-31');
    expect(again).toHaveLength(0);

    const acc = getPredictionAccuracy(db, 'coverage');
    expect(acc.n).toBe(1);
    expect(acc.mae).toBe(30);
    expect(acc.rmse).toBe(30);
    expect(acc.bias).toBe(-30); // predicted 50 - actual 80

    db.close();
  });

  test('daily cycle snapshots and scores today once', () => {
    const db = openOperationsDb({ path: ':memory:' });
    seedPlatformsAndAccount(db);

    const first = runDailyCoveragePredictionCycle(db, { lookbackDays: 7 });
    expect(first.snapshot.total).toBe(2);
    expect(first.snapshot.covered).toBe(1);
    expect(first.snapshot.pct).toBeCloseTo(50, 0);
    expect(first.backtest.length).toBe(1);
    expect(first.accuracy.n).toBe(1);

    const second = runDailyCoveragePredictionCycle(db, { lookbackDays: 7 });
    expect(second.backtest.length).toBe(0); // already scored today
    expect(second.accuracy.n).toBe(1);

    db.close();
  });
});
