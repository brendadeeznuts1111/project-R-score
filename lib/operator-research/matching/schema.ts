// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import type { Database } from 'bun:sqlite';
import { ensureNormalizationSchema } from '../normalization/schema.ts';
import { openOddsDb } from '../odds/odds-store.ts';

/**
 * Provenance / cross-book matching schema extensions on odds.db.
 */
export const MATCHING_SCHEMA = `
CREATE TABLE IF NOT EXISTS bookmaker_event_mapping (
  id INTEGER PRIMARY KEY,
  bookmaker_id INTEGER NOT NULL REFERENCES bookmakers(id),
  event_id INTEGER NOT NULL REFERENCES events(id),
  bookmaker_event_id TEXT NOT NULL,
  bookmaker_event_name TEXT,
  last_synced INTEGER,
  UNIQUE(bookmaker_id, bookmaker_event_id)
);

CREATE TABLE IF NOT EXISTS odds_history (
  id INTEGER PRIMARY KEY,
  bookmaker_event_mapping_id INTEGER NOT NULL REFERENCES bookmaker_event_mapping(id),
  market_type_id INTEGER REFERENCES market_types(id),
  selection TEXT,
  odds_decimal REAL,
  odds_american REAL,
  odds_handicap REAL,
  timestamp INTEGER NOT NULL,
  session TEXT CHECK(session IN ('pregame', 'live')),
  raw_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_bem_event ON bookmaker_event_mapping(event_id);
CREATE INDEX IF NOT EXISTS idx_bem_bookmaker ON bookmaker_event_mapping(bookmaker_id);
CREATE INDEX IF NOT EXISTS idx_odds_history_timestamp ON odds_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_odds_history_event_market
  ON odds_history(bookmaker_event_mapping_id, market_type_id, selection);
`;

function tableHasColumn(db: Database, table: string, column: string): boolean {
  const cols = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some(c => c.name === column);
}

/** Idempotent migrations for columns added after first normalize pass. */
export function migrateMatchingColumns(db: Database): void {
  if (!tableHasColumn(db, 'bookmakers', 'tier')) {
    db.exec(`ALTER TABLE bookmakers ADD COLUMN tier INTEGER DEFAULT 3`);
  }
  if (!tableHasColumn(db, 'events', 'sport')) {
    db.exec(`ALTER TABLE events ADD COLUMN sport TEXT`);
  }
  if (!tableHasColumn(db, 'events', 'league_name')) {
    db.exec(`ALTER TABLE events ADD COLUMN league_name TEXT`);
  }
  if (!tableHasColumn(db, 'events', 'external_ids')) {
    db.exec(`ALTER TABLE events ADD COLUMN external_ids TEXT`);
  }
}

export function ensureMatchingSchema(db: Database = openOddsDb()): Database {
  ensureNormalizationSchema(db);
  migrateMatchingColumns(db);
  db.exec(MATCHING_SCHEMA);
  return db;
}
