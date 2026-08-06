/**
 * SQLite account-limits history for research agent max-stake observations.
 * Creates `limits.db` on first use (path overridable).
 *
 * @see https://bun.com/docs/runtime/sqlite
 */

// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { Database } from 'bun:sqlite';
import { ensureParentDirSync } from '../bun-fs-utils.ts';
import { joinPath } from '../path-bun.ts';

export type LimitObservation = {
  // brand-ok — opaque research/wire id
  partnerId: string; // brand-ok — opaque research/wire id
  accountId?: string; // brand-ok — opaque research/wire id
  marketId: string; // brand-ok — opaque research/wire id
  sport: string;
  league: string;
  marketType: string;
  maxStakeUsd: number;
  currency: string;
  source: string;
  observedAt?: string;
};

export type LimitHistoryRow = {
  id: number; // brand-ok — opaque research/wire id
  partnerId: string; // brand-ok — opaque research/wire id
  accountId: string; // brand-ok — opaque research/wire id
  marketId: string; // brand-ok — opaque research/wire id
  sport: string;
  league: string;
  marketType: string;
  maxStakeUsd: number;
  currency: string;
  source: string;
  observedAt: string;
};

const DEFAULT_DB = joinPath(import.meta.dir, '../../data/research/limits.db');

let db: Database | null = null;
let dbPath = DEFAULT_DB;

export function getLimitsDbPath(): string {
  return dbPath;
}

export function closeLimitsDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function openLimitsDb(path = DEFAULT_DB): Database {
  if (db && dbPath === path) return db;
  if (db) {
    db.close();
    db = null;
  }
  dbPath = path;
  ensureParentDirSync(path);
  db = new Database(path, { create: true });
  db.run('PRAGMA journal_mode = WAL');
  db.run(`
    CREATE TABLE IF NOT EXISTS account_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id TEXT NOT NULL,
      account_id TEXT NOT NULL DEFAULT '',
      market_id TEXT NOT NULL,
      sport TEXT NOT NULL,
      league TEXT NOT NULL,
      market_type TEXT NOT NULL,
      max_stake_usd REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      source TEXT NOT NULL DEFAULT 'research',
      observed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_account_limits_partner_time
      ON account_limits(partner_id, observed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_account_limits_market
      ON account_limits(partner_id, market_id, observed_at DESC);
  `);
  // Migrate older DBs that predate account_id.
  try {
    const cols = db.query(`PRAGMA table_info(account_limits)`).all() as Array<{ name: string }>;
    if (!cols.some(c => c.name === 'account_id')) {
      db.run(`ALTER TABLE account_limits ADD COLUMN account_id TEXT NOT NULL DEFAULT ''`);
    }
  } catch {
    /* ignore */
  }
  return db;
}

export function recordLimit(observation: LimitObservation, path?: string): LimitHistoryRow {
  const database = openLimitsDb(path ?? dbPath);
  const observedAt = observation.observedAt ?? new Date().toISOString();
  const result = database
    .query(
      `INSERT INTO account_limits
        (partner_id, account_id, market_id, sport, league, market_type, max_stake_usd, currency, source, observed_at)
       VALUES ($partnerId, $accountId, $marketId, $sport, $league, $marketType, $maxStakeUsd, $currency, $source, $observedAt)
       RETURNING id, partner_id as partnerId, account_id as accountId, market_id as marketId, sport, league,
                 market_type as marketType, max_stake_usd as maxStakeUsd, currency, source, observed_at as observedAt`
    )
    .get({
      $partnerId: observation.partnerId,
      $accountId: observation.accountId ?? '',
      $marketId: observation.marketId,
      $sport: observation.sport,
      $league: observation.league,
      $marketType: observation.marketType,
      $maxStakeUsd: observation.maxStakeUsd,
      $currency: observation.currency || 'USD',
      $source: observation.source || 'research',
      $observedAt: observedAt,
    }) as LimitHistoryRow;
  return result;
}

export function getLimitsHistory( // brand-ok — opaque research/wire id
  partnerId: string, // brand-ok — opaque research/wire id
  opts: { limit?: number; path?: string } = {}
): LimitHistoryRow[] {
  const database = openLimitsDb(opts.path ?? dbPath);
  const limit = Math.max(1, Math.min(opts.limit ?? 100, 1000));
  return database
    .query(
      `SELECT id,
              partner_id as partnerId,
              COALESCE(account_id, '') as accountId,
              market_id as marketId,
              sport,
              league,
              market_type as marketType,
              max_stake_usd as maxStakeUsd,
              currency,
              source,
              observed_at as observedAt
         FROM account_limits
        WHERE partner_id = $partnerId
        ORDER BY observed_at DESC, id DESC
        LIMIT $limit`
    )
    .all({ $partnerId: partnerId, $limit: limit }) as LimitHistoryRow[];
}

export type ResearchCoverageRow = {
  sport: string;
  league: string; // brand-ok — opaque research/wire id
  partnerId: string; // brand-ok — opaque research/wire id
  marketCount: number;
  lastObservedAt: string | null;
};

export function getResearchCoverage(opts: { path?: string } = {}): ResearchCoverageRow[] {
  const database = openLimitsDb(opts.path ?? dbPath);
  return database
    .query(
      `SELECT sport,
              league,
              partner_id as partnerId,
              COUNT(DISTINCT market_id) as marketCount,
              MAX(observed_at) as lastObservedAt
         FROM account_limits
        GROUP BY sport, league, partner_id
        ORDER BY marketCount DESC, sport, league, partner_id`
    )
    .all() as ResearchCoverageRow[];
}
