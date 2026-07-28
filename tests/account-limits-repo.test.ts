// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  AccountLimitsRepository,
  ensureAccountLimitsSchema,
  formatEnrichedLimitRaises,
  seedAccountLimitsDemo,
} from '../lib/account-limits-repo.ts';

describe('account-limits-repo', () => {
  test('seed + detectRaises finds draftkings raise', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const repo = new AccountLimitsRepository(db);
    const raises = repo.detectRaises(nodeId, now - 86400);
    expect(raises.length).toBe(1);
    expect(raises[0]!.sportsbook).toBe('draftkings');
    expect(raises[0]!.previous_max).toBe(500);
    expect(raises[0]!.new_limit).toBe(1500);
    db.close();
  });

  test('detectRaisesEnriched adds CLV and line move', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const repo = new AccountLimitsRepository(db);
    const rows = repo.detectRaisesEnriched(nodeId, now - 86400);
    expect(rows.length).toBe(1);
    expect(rows[0]!.line_move_5m).toBeGreaterThan(0);
    expect(rows[0]!.top_clv.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]!.top_clv[0]!.player_name).toBe('Jayson Tatum');
    const text = formatEnrichedLimitRaises(rows);
    expect(text).toContain('$500 → $1500');
    expect(text).toContain('Jayson Tatum');
    db.close();
  });

  test('seed is idempotent without force', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    expect(seedAccountLimitsDemo(db).seeded).toBe(true);
    expect(seedAccountLimitsDemo(db).seeded).toBe(false);
    db.close();
  });
});
