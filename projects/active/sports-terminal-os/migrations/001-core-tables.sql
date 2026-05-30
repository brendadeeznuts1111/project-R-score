-- Migration 001: Core Terminal Infrastructure Tables
-- Zone: Core
-- Tables: buckeye_sessions, raw_players, raw_wagers, raw_agent_performance, tokens, request_log

-- UP

-- Enable foreign keys and WAL mode
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ---------------------------------------------------------------------------
-- buckeye_sessions: Active session records from Buckeye upstream
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buckeye_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT    NOT NULL UNIQUE,
  token       TEXT    NOT NULL,
  expires_at  INTEGER NOT NULL,
  is_active   INTEGER DEFAULT 1,
  cf_token    TEXT,
  user_agent  TEXT,
  ip_address  TEXT,
  metadata_json TEXT,
  created_at  INTEGER DEFAULT (strftime('%s','now')),
  updated_at  INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_buckeye_sessions_active ON buckeye_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_buckeye_sessions_expires ON buckeye_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_buckeye_sessions_created ON buckeye_sessions(created_at DESC);

-- ---------------------------------------------------------------------------
-- raw_players: Player roster ingested from Buckeye /players endpoint
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_players (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id       TEXT    NOT NULL,
  session_id      TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL,
  name            TEXT,
  email           TEXT,
  phone           TEXT,
  balance         REAL    DEFAULT 0,
  status          TEXT    DEFAULT 'active',
  risk_tier       TEXT    DEFAULT 'GREEN',
  archetype       TEXT,
  last_wager_at   INTEGER,
  wager_count     INTEGER DEFAULT 0,
  win_rate        REAL,
  pnl_lifetime    REAL    DEFAULT 0,
  metadata_json   TEXT,
  ingested_at     INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(player_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_players_agent ON raw_players(agent_login);
CREATE INDEX IF NOT EXISTS idx_raw_players_tier ON raw_players(risk_tier);
CREATE INDEX IF NOT EXISTS idx_raw_players_archetype ON raw_players(archetype);
CREATE INDEX IF NOT EXISTS idx_raw_players_ingested ON raw_players(ingested_at DESC);

-- ---------------------------------------------------------------------------
-- raw_wagers: Individual wagers ingested from Buckeye /wagers endpoint
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_wagers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  wager_id        TEXT    NOT NULL,
  session_id      TEXT    NOT NULL,
  player_id       TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL,
  wager_number    TEXT,
  sport           TEXT,
  event_id        TEXT,
  event_name      TEXT,
  market          TEXT,
  selection       TEXT,
  odds            REAL,
  stake           REAL    NOT NULL,
  potential_payout REAL,
  status          TEXT    DEFAULT 'pending',
  result          TEXT,
  settled_at      INTEGER,
  placed_at       INTEGER NOT NULL,
  ip_address      TEXT,
  device_fingerprint TEXT,
  metadata_json   TEXT,
  ingested_at     INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_raw_wagers_player ON raw_wagers(player_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_wagers_agent ON raw_wagers(agent_login, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_wagers_status ON raw_wagers(status, settled_at);
CREATE INDEX IF NOT EXISTS idx_raw_wagers_event ON raw_wagers(event_id, sport);
CREATE INDEX IF NOT EXISTS idx_raw_wagers_session ON raw_wagers(session_id, ingested_at);
CREATE INDEX IF NOT EXISTS idx_raw_wagers_ip ON raw_wagers(ip_address);

-- ---------------------------------------------------------------------------
-- raw_agent_performance: Agent performance metrics from Buckeye
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_agent_performance (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_login         TEXT    NOT NULL,
  session_id          TEXT    NOT NULL,
  report_date         TEXT    NOT NULL,
  period              TEXT    DEFAULT 'daily',
  total_wagers        INTEGER DEFAULT 0,
  total_stake         REAL    DEFAULT 0,
  total_payout        REAL    DEFAULT 0,
  net_pnl             REAL    DEFAULT 0,
  hold_percentage     REAL,
  active_players      INTEGER DEFAULT 0,
  new_players         INTEGER DEFAULT 0,
  avg_wager_size      REAL,
  unique_sports       INTEGER DEFAULT 0,
  parlay_count        INTEGER DEFAULT 0,
  straight_count      INTEGER DEFAULT 0,
  teaser_count        INTEGER DEFAULT 0,
  metadata_json       TEXT,
  ingested_at         INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(agent_login, report_date, period)
);

CREATE INDEX IF NOT EXISTS idx_raw_agent_perf_agent ON raw_agent_performance(agent_login, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_raw_agent_perf_session ON raw_agent_performance(session_id);
CREATE INDEX IF NOT EXISTS idx_raw_agent_perf_ingested ON raw_agent_performance(ingested_at DESC);

-- ---------------------------------------------------------------------------
-- tokens: API tokens and JWT secrets vault
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id    TEXT    NOT NULL UNIQUE,
  token_type  TEXT    NOT NULL,
  token_hash  TEXT    NOT NULL,
  scope       TEXT    DEFAULT 'read',
  description TEXT,
  expires_at  INTEGER,
  is_active   INTEGER DEFAULT 1,
  last_used_at INTEGER,
  created_by  TEXT,
  metadata_json TEXT,
  created_at  INTEGER DEFAULT (strftime('%s','now')),
  updated_at  INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_tokens_type ON tokens(token_type, is_active);
CREATE INDEX IF NOT EXISTS idx_tokens_scope ON tokens(scope, is_active);

-- ---------------------------------------------------------------------------
-- request_log: HTTP request/response audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS request_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id      TEXT    NOT NULL,
  method          TEXT    NOT NULL,
  path            TEXT    NOT NULL,
  query_params_json TEXT,
  request_headers_json TEXT,
  request_body_json TEXT,
  response_status INTEGER,
  response_body_json TEXT,
  duration_ms     INTEGER,
  client_ip       TEXT,
  user_agent      TEXT,
  auth_method     TEXT,
  auth_subject    TEXT,
  error_message   TEXT,
  error_code      TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_request_log_path ON request_log(path, method, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_log_status ON request_log(response_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_log_auth ON request_log(auth_subject, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_log_created ON request_log(created_at DESC);

-- DOWN

-- DROP TABLE IF EXISTS request_log;
-- DROP TABLE IF EXISTS tokens;
-- DROP TABLE IF EXISTS raw_agent_performance;
-- DROP TABLE IF EXISTS raw_wagers;
-- DROP TABLE IF EXISTS raw_players;
-- DROP TABLE IF EXISTS buckeye_sessions;
