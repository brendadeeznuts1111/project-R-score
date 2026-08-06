// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import { Database } from 'bun:sqlite';
import { ODDS_DB_PATH, openOddsDb, ensureOddsStore } from '../odds/odds-store.ts';

/**
 * Relational normalization schema (lives in odds.db alongside blob snapshots).
 * Blob table `odds_snapshots` is unchanged; normalized lines go to `odds_normalized`.
 */
export const NORMALIZATION_SCHEMA = `
CREATE TABLE IF NOT EXISTS leagues (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  sport TEXT NOT NULL,
  country TEXT,
  season TEXT,
  aliases TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  sport TEXT,
  league_id INTEGER REFERENCES leagues(id),
  aliases TEXT,
  country TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(name, sport)
);

CREATE TABLE IF NOT EXISTS market_types (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  label TEXT,
  sport TEXT,
  format TEXT,
  keywords TEXT,
  normalization_rules TEXT
);

CREATE TABLE IF NOT EXISTS bookmakers (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  host TEXT UNIQUE,
  active INTEGER DEFAULT 1,
  config TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  league_id INTEGER REFERENCES leagues(id),
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  start_time INTEGER,
  status TEXT,
  external_id TEXT,
  metadata TEXT,
  UNIQUE(external_id)
);

CREATE TABLE IF NOT EXISTS odds_normalized (
  id INTEGER PRIMARY KEY,
  bookmaker_id INTEGER REFERENCES bookmakers(id),
  event_id INTEGER REFERENCES events(id),
  market_type_id INTEGER REFERENCES market_types(id),
  selection TEXT NOT NULL,
  odds_original TEXT,
  odds_decimal REAL,
  odds_american REAL,
  odds_handicap REAL,
  timestamp INTEGER,
  session TEXT CHECK(session IN ('pregame', 'live')),
  snapshot_blob_id TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_odds_norm_timestamp ON odds_normalized(timestamp);
CREATE INDEX IF NOT EXISTS idx_odds_norm_bookmaker ON odds_normalized(bookmaker_id);
CREATE INDEX IF NOT EXISTS idx_odds_norm_event ON odds_normalized(event_id);
CREATE INDEX IF NOT EXISTS idx_odds_norm_market ON odds_normalized(market_type_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_short ON teams(short_name);
CREATE INDEX IF NOT EXISTS idx_bookmakers_host ON bookmakers(host);
`;

export function ensureNormalizationSchema(db: Database = openOddsDb()): Database {
  db.exec(NORMALIZATION_SCHEMA);
  return db;
}

export async function openNormalizedDb(path = ODDS_DB_PATH): Promise<Database> {
  await ensureOddsStore(path);
  const db = openOddsDb(path);
  return ensureNormalizationSchema(db);
}
