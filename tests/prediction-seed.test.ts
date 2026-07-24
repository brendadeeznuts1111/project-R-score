// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import { seedOperationsDemo } from '../lib/operations/ops-seed.ts';
import {
  isPredictionDataEmpty,
  seedPredictionDemo,
} from '../lib/operations/prediction-seed.ts';
import { getPredictionAccuracy } from '../lib/prediction/tester.ts';

describe('prediction demo seed', () => {
  test('seeds snapshots and backtest rows when ops demo present', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    await seedOperationsDemo(db, { force: true, ifEmpty: false });
    expect(isPredictionDataEmpty(db)).toBe(true);

    const result = seedPredictionDemo(db, { ifEmpty: true, days: 14 });
    expect(result.seeded).toBe(true);
    expect(result.snapshots).toBe(14);
    expect(result.backtestRows).toBeGreaterThan(0);

    const acc = getPredictionAccuracy(db, 'coverage');
    expect(acc.n).toBeGreaterThan(0);
    expect(acc.mae).toBeGreaterThan(0);

    const again = seedPredictionDemo(db, { ifEmpty: true });
    expect(again.seeded).toBe(false);

    db.close();
  });

  test('force re-seeds when snapshots exist', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    await seedOperationsDemo(db, { force: true, ifEmpty: false });
    seedPredictionDemo(db, { days: 7 });

    const forced = seedPredictionDemo(db, { force: true, days: 7 });
    expect(forced.seeded).toBe(true);
    expect(forced.snapshots).toBe(7);

    db.close();
  });
});
