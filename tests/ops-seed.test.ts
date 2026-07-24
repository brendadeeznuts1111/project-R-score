// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { isOperationsDbEmpty, seedOperationsDemo } from '../lib/operations/ops-seed.ts';

describe('lib/operations/ops-seed', () => {
  test('seeds empty db with experts, plays, and liquidity', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    expect(isOperationsDbEmpty(db)).toBe(true);

    const result = await seedOperationsDemo(db);
    expect(result.seeded).toBe(true);
    expect(result.experts).toBe(3);
    expect(result.plays).toBe(4);
    expect((result.liquidity ?? 0) > 0).toBe(true);

    const summary = buildOpsSummary(db, 'live');
    expect(summary.experts.length).toBe(3);
    expect(summary.plays.length).toBeGreaterThan(0);
    expect(summary.liquidity.total).toBeGreaterThan(0);
    expect(summary.experiments.active).toBeGreaterThan(0);
    expect(summary.growth.playsReceived).toBeGreaterThan(0);
    expect(summary.tree.partners).toBeGreaterThan(0);

    db.close();
  });

  test('skips when experts already exist', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    await seedOperationsDemo(db);
    const again = await seedOperationsDemo(db);
    expect(again.seeded).toBe(false);
    db.close();
  });
});
