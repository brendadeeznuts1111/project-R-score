// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  ensureAccountLimitsSchema,
  seedAccountLimitsDemo,
} from '../lib/account-limits-repo.ts';
import { predictLimitRaise } from '../lib/prediction/limit-prediction.ts';
import {
  LIMIT_PREDICTION_TABLE_PROPERTIES,
  LimitPredictionReport,
} from '../lib/prediction/limit-prediction-report.ts';
import { inspectCustom } from '../lib/console-depth.ts';

describe('LimitPredictionReport · Bun.inspect.table + custom', () => {
  test('inspect.custom renders prediction tables with properties', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const dim = {
      node_id: nodeId,
      sportsbook: 'draftkings',
      sport_id: 'nba',
      market_id: 'totals',
      bet_type: 'straight',
    };
    const prediction = predictLimitRaise(db, dim, { nowSec: now });
    const report = new LimitPredictionReport([{ dimension: dim, prediction }], {
      nodeId,
    });

    const text = report[inspectCustom](undefined, { colors: false });
    expect(text).toContain('LimitPredictionReport');
    expect(text).toContain('PREDICTIONS');
    expect(text).toContain('Bun.inspect.table');
    expect(text).toContain('draftkings');
    expect(text).toContain('DRIVERS');
    expect(text).toContain('DEEP');

    const proof = report.tableProof();
    expect(proof.predictions.properties).toEqual([...LIMIT_PREDICTION_TABLE_PROPERTIES]);
    expect(proof.predictions.renderIdempotent).toBe(true);

    const deep = report.deepPayload() as Array<Record<string, unknown>>;
    expect(Array.isArray(deep[0]!.topDrivers)).toBe(true);
    expect(Array.isArray(deep[0]!.prob_bar)).toBe(true);
    expect((deep[0]!.prob_bar as number[]).length).toBe(10);

    const viaInspect = Bun.inspect(report, { colors: false });
    expect(viaInspect).toContain('┌');
    db.close();
  });
});
