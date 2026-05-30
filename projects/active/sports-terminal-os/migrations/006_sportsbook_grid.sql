-- Migration 006: Sportsbook Grid (Zone 1 - Ocean Depths)
-- Tables: sportsbook_odds, sportsbook_health, line_movements
-- Dependencies: Zone 4 (WS, auth)

-- ---------------------------------------------------------------------------
-- UP
-- ---------------------------------------------------------------------------

-- Sportsbook odds table: stores odds from each book for each market
CREATE TABLE IF NOT EXISTS sportsbook_odds (
    id            TEXT PRIMARY KEY,
    book_id       TEXT NOT NULL,
    sport         TEXT NOT NULL,
    event_id      TEXT NOT NULL,
    market        TEXT NOT NULL,      -- spread | ml | total | parlay | teaser | prop
    odds          INTEGER NOT NULL,   -- American odds (-110, +150, etc)
    line          REAL,               -- Point spread or total line
    over_under    TEXT,               -- 'over' | 'under' | NULL for non-totals
    timestamp     INTEGER NOT NULL,   -- Unix ms
    source        TEXT NOT NULL,      -- 'api' | 'scraper' | 'manual'
    is_best_line  INTEGER DEFAULT 0,  -- 1 if this is the best line
    vig           REAL,               -- Calculated vig percentage
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
);

-- Book health status table: tracks connectivity/quality per sportsbook
CREATE TABLE IF NOT EXISTS sportsbook_health (
    book_id       TEXT PRIMARY KEY,
    status        TEXT NOT NULL DEFAULT 'healthy',  -- healthy | degraded | down
    last_check    INTEGER NOT NULL,                 -- Unix ms
    latency_ms    INTEGER DEFAULT 0,
    error_rate    REAL DEFAULT 0.0,                 -- 0.0 to 1.0
    uptime_pct    REAL DEFAULT 100.0,               -- Percentage
    avg_latency_ms INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_error    TEXT,
    updated_at    INTEGER NOT NULL
);

-- Line movements table: tracks odds/line changes over time
CREATE TABLE IF NOT EXISTS line_movements (
    id            TEXT PRIMARY KEY,
    book_id       TEXT NOT NULL,
    sport         TEXT NOT NULL,
    event_id      TEXT NOT NULL,
    market        TEXT NOT NULL,
    old_odds      INTEGER NOT NULL,
    new_odds      INTEGER NOT NULL,
    old_line      REAL,
    new_line      REAL,
    direction     TEXT NOT NULL,      -- up | down | steady
    movement_pct  REAL,               -- Percentage change
    timestamp     INTEGER NOT NULL,   -- Unix ms
    created_at    INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Query odds by book + sport + event + market (best lines lookup)
CREATE INDEX IF NOT EXISTS idx_odds_lookup
    ON sportsbook_odds (book_id, sport, event_id, market);

-- Query all odds for a sport
CREATE INDEX IF NOT EXISTS idx_odds_sport
    ON sportsbook_odds (sport, timestamp DESC);

-- Query all odds for an event
CREATE INDEX IF NOT EXISTS idx_odds_event
    ON sportsbook_odds (event_id, timestamp DESC);

-- Query best lines
CREATE INDEX IF NOT EXISTS idx_odds_best_line
    ON sportsbook_odds (is_best_line, sport, market);

-- Query line movements by book
CREATE INDEX IF NOT EXISTS idx_movements_book
    ON line_movements (book_id, timestamp DESC);

-- Query line movements by event
CREATE INDEX IF NOT EXISTS idx_movements_event
    ON line_movements (event_id, timestamp DESC);

-- Query line movements by sport for sidebar
CREATE INDEX IF NOT EXISTS idx_movements_sport
    ON line_movements (sport, timestamp DESC);

-- Query recent movements
CREATE INDEX IF NOT EXISTS idx_movements_recent
    ON line_movements (timestamp DESC);

-- Query health status
CREATE INDEX IF NOT EXISTS idx_health_status
    ON sportsbook_health (status, updated_at DESC);

-- ---------------------------------------------------------------------------
-- DOWN
-- ---------------------------------------------------------------------------
-- DROP TABLE IF EXISTS line_movements;
-- DROP TABLE IF EXISTS sportsbook_health;
-- DROP TABLE IF EXISTS sportsbook_odds;
