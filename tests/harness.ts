// @see https://bun.com/docs/runtime/sqlite
// @see https://github.com/oven-sh/bun/blob/b5036bc6a11be1389b5cb50549c407f956df76d3/test/harness.ts
/**
 * Shared test utilities — following Bun's test/harness.ts pattern.
 *
 * Import explicitly in test files:
 *   import { createTestDb, seedTestData } from '../test/harness.ts';
 */
import { Database } from 'bun:sqlite';

// ── Terminal detection (cached) ───────────────────────────────────────────
let _hasTerminal: boolean | undefined;
export function getHasTerminal(): boolean {
  if (_hasTerminal !== undefined) return _hasTerminal;
  try {
    const T = (Bun as any).Terminal;
    if (typeof T === 'function') {
      const t = new T(Bun.stdout);
      _hasTerminal = t.isTTY === true;
      return _hasTerminal;
    }
  } catch {}
  _hasTerminal = false;
  return _hasTerminal;
}

let _isNonTTY: boolean | undefined;
export function getIsNonTTY(): boolean {
  if (_isNonTTY !== undefined) return _isNonTTY;
  _isNonTTY = !getHasTerminal();
  return _isNonTTY;
}

// ── Shared test DB factory ───────────────────────────────────────────────
/**
 * Create an in-memory SQLite database with all limit-related schemas.
 */
export function createTestDb(): Database {
  const db = new Database(':memory:');
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA busy_timeout = 5000');

  const { ensureAccountLimitsSchema } = require('../lib/account-limits-repo.ts');
  ensureAccountLimitsSchema(db);
  const { ensureStateRegulationSchema } = require('../lib/operations/state-regulation.ts');
  ensureStateRegulationSchema(db);
  const { ensurePredictionSchema } = require('../lib/prediction/schema.ts');
  ensurePredictionSchema(db);
  const { ensureLimitPredictionSchema } = require('../lib/prediction/limit-prediction.ts');
  ensureLimitPredictionSchema(db);
  try {
    const { ensureLimitPatternsSchema } = require('../lib/operations/limit-patterns.ts');
    ensureLimitPatternsSchema(db);
  } catch {}

  return db;
}

/**
 * Seed demo data into a test DB. Returns the repository for further queries.
 */
export function seedTestData(db: Database, nodeId = 'e2e-test') {
  const { seedAccountLimitsDemo, AccountLimitsRepository } = require('../lib/account-limits-repo.ts');
  seedAccountLimitsDemo(db, { nodeId, force: true });
  return new AccountLimitsRepository(db);
}

// ── Shared test constants ────────────────────────────────────────────────
export const TEST_NODE_ID = 'e2e-test';
export const TEST_BOOK = 'draftkings';
export const TEST_SPORT = 'nba';
export const TEST_MARKET = 'spread';
export const TEST_BET_TYPE = 'straight';

// ── Conditional test helpers ─────────────────────────────────────────────
export const isNonTTY = getIsNonTTY();
export const hasTerminal = getHasTerminal();
export const isMacOS = process.platform === 'darwin';
