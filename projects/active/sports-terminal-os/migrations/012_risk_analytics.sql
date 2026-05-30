-- Migration 012: Risk & Analytics Domain
-- Tables: risk_positions, enforcement_queue, limit_enforcement_log,
--         wager_violations, risk_config, risk_analytics_snapshots,
--         ai_risk_flags, customer_features

-- ---------------------------------------------------------------------------
-- UP
-- ---------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-- risk_positions: Open risk positions per agent/player/market
CREATE TABLE IF NOT EXISTS risk_positions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  position_id     TEXT    NOT NULL UNIQUE,
  agent_login     TEXT    NOT NULL,
  player_id       TEXT,
  sport           TEXT    NOT NULL,
  event_id        TEXT    NOT NULL,
  event_name      TEXT,
  market          TEXT    NOT NULL,
  position_type   TEXT    NOT NULL DEFAULT 'exposure',
  side            TEXT,
  total_stake     REAL    DEFAULT 0,
  total_exposure  REAL    DEFAULT 0,
  max_payout      REAL    DEFAULT 0,
  player_count    INTEGER DEFAULT 0,
  wager_count     INTEGER DEFAULT 0,
  risk_score      REAL,
  risk_tier       TEXT,
  concentration_pct REAL,
  status          TEXT    DEFAULT 'open',
  expires_at      INTEGER NOT NULL,
  closed_at       INTEGER,
  close_reason    TEXT,
  breakdown_json  TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_risk_positions_agent ON risk_positions(agent_login, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_positions_player ON risk_positions(player_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_positions_event ON risk_positions(event_id, sport, market);
CREATE INDEX IF NOT EXISTS idx_risk_positions_expires ON risk_positions(expires_at, status);
CREATE INDEX IF NOT EXISTS idx_risk_positions_tier ON risk_positions(risk_tier, status);
CREATE INDEX IF NOT EXISTS idx_risk_positions_status ON risk_positions(status, created_at DESC);

-- enforcement_queue: Pending enforcement actions
CREATE TABLE IF NOT EXISTS enforcement_queue (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_id        TEXT    NOT NULL UNIQUE,
  action_type     TEXT    NOT NULL,
  entity_type     TEXT    NOT NULL DEFAULT 'player',
  entity_id       TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL,
  params_json     TEXT    NOT NULL DEFAULT '{}',
  status          TEXT    DEFAULT 'pending',
  priority        INTEGER DEFAULT 100,
  scheduled_at    INTEGER,
  processed_at    INTEGER,
  processed_by    TEXT,
  result_json     TEXT,
  error_message   TEXT,
  attempts        INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 3,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_enforcement_queue_status ON enforcement_queue(status, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_enforcement_queue_agent ON enforcement_queue(agent_login, status);
CREATE INDEX IF NOT EXISTS idx_enforcement_queue_entity ON enforcement_queue(entity_type, entity_id, status);

-- limit_enforcement_log: Immutable audit log of enforcement actions
CREATE TABLE IF NOT EXISTS limit_enforcement_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  enforcement_id  TEXT    NOT NULL,
  action_type     TEXT    NOT NULL,
  entity_type     TEXT    NOT NULL DEFAULT 'player',
  entity_id       TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL,
  old_value_json  TEXT,
  new_value_json  TEXT,
  params_json     TEXT,
  executed_by     TEXT,
  result          TEXT    NOT NULL,
  result_message  TEXT,
  wager_id        TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_limit_enf_entity ON limit_enforcement_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_limit_enf_agent ON limit_enforcement_log(agent_login, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_limit_enf_action ON limit_enforcement_log(action_type, created_at DESC);

-- wager_violations: Wagers that triggered risk violations
CREATE TABLE IF NOT EXISTS wager_violations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  violation_id    TEXT    NOT NULL UNIQUE,
  wager_id        TEXT    NOT NULL,
  player_id       TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL,
  rule_id         TEXT,
  violation_type  TEXT    NOT NULL,
  severity        TEXT    NOT NULL,
  description     TEXT    NOT NULL,
  wager_snapshot_json TEXT NOT NULL DEFAULT '{}',
  action_taken    TEXT,
  action_params_json TEXT,
  enforced_by     TEXT,
  status          TEXT    DEFAULT 'open',
  reviewed_by     TEXT,
  reviewed_at     INTEGER,
  review_notes    TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_wager_violations_wager ON wager_violations(wager_id);
CREATE INDEX IF NOT EXISTS idx_wager_violations_player ON wager_violations(player_id, status);
CREATE INDEX IF NOT EXISTS idx_wager_violations_agent ON wager_violations(agent_login, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wager_violations_severity ON wager_violations(severity, status);
CREATE INDEX IF NOT EXISTS idx_wager_violations_created ON wager_violations(created_at DESC);

-- risk_config: Risk tier configuration and parameters
CREATE TABLE IF NOT EXISTS risk_config (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key      TEXT    NOT NULL UNIQUE,
  config_value    TEXT    NOT NULL,
  config_type     TEXT    DEFAULT 'string',
  description     TEXT,
  category        TEXT    DEFAULT 'general',
  is_active       INTEGER DEFAULT 1,
  updated_by      TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_risk_config_category ON risk_config(category, is_active);
CREATE INDEX IF NOT EXISTS idx_risk_config_key ON risk_config(config_key);

-- risk_analytics_snapshots: Aggregated risk metrics snapshots
CREATE TABLE IF NOT EXISTS risk_analytics_snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id     TEXT    NOT NULL UNIQUE,
  snapshot_type   TEXT    NOT NULL,
  entity_type     TEXT,
  entity_id       TEXT,
  agent_login     TEXT,
  total_wagers    INTEGER DEFAULT 0,
  total_stake     REAL    DEFAULT 0,
  total_exposure  REAL    DEFAULT 0,
  total_payout    REAL    DEFAULT 0,
  net_pnl         REAL    DEFAULT 0,
  hold_pct        REAL,
  active_positions INTEGER DEFAULT 0,
  open_violations INTEGER DEFAULT 0,
  player_count    INTEGER DEFAULT 0,
  avg_risk_score  REAL,
  risk_breakdown_json TEXT,
  top_exposures_json  TEXT,
  metrics_json    TEXT,
  period_start    INTEGER NOT NULL,
  period_end      INTEGER NOT NULL,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_risk_snapshots_entity ON risk_analytics_snapshots(entity_type, entity_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_agent ON risk_analytics_snapshots(agent_login, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_type ON risk_analytics_snapshots(snapshot_type, period_end DESC);

-- ai_risk_flags: AI-generated risk flags
CREATE TABLE IF NOT EXISTS ai_risk_flags (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_id         TEXT    NOT NULL UNIQUE,
  customer_id     TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL DEFAULT 'system',
  flag_type       TEXT    NOT NULL,
  severity        TEXT    NOT NULL,
  model_name      TEXT,
  model_version   TEXT,
  prompt_hash     TEXT,
  financial_risk  REAL,
  behavioral_risk REAL,
  compliance_risk REAL,
  overall_score   REAL,
  explanation     TEXT,
  evidence_json   TEXT,
  recommended_action TEXT,
  status          TEXT    DEFAULT 'open',
  reviewed_by     TEXT,
  reviewed_at     INTEGER,
  review_notes    TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_risk_customer ON ai_risk_flags(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_risk_agent ON ai_risk_flags(agent_login, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_risk_severity ON ai_risk_flags(severity, status);
CREATE INDEX IF NOT EXISTS idx_ai_risk_score ON ai_risk_flags(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_risk_created ON ai_risk_flags(created_at DESC);

-- customer_features: ML feature vectors per customer
CREATE TABLE IF NOT EXISTS customer_features (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id     TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL DEFAULT 'system',
  feature_version TEXT    DEFAULT '1.0',
  wager_count_7d  INTEGER DEFAULT 0,
  wager_count_30d INTEGER DEFAULT 0,
  wager_count_90d INTEGER DEFAULT 0,
  avg_stake_7d    REAL    DEFAULT 0,
  avg_stake_30d   REAL    DEFAULT 0,
  avg_odds_30d    REAL    DEFAULT 0,
  total_stake_30d REAL    DEFAULT 0,
  total_stake_90d REAL    DEFAULT 0,
  win_rate_30d    REAL,
  win_rate_90d    REAL,
  pnl_30d         REAL    DEFAULT 0,
  pnl_90d         REAL    DEFAULT 0,
  pnl_lifetime    REAL    DEFAULT 0,
  roi_30d         REAL,
  roi_90d         REAL,
  daily_wager_count REAL  DEFAULT 0,
  max_daily_stake REAL    DEFAULT 0,
  stake_variance  REAL    DEFAULT 0,
  parlay_pct      REAL    DEFAULT 0,
  teaser_pct      REAL    DEFAULT 0,
  live_bet_pct    REAL    DEFAULT 0,
  favorite_pct    REAL    DEFAULT 0,
  archetype       TEXT,
  archetype_confidence REAL DEFAULT 0,
  risk_signals_json TEXT,
  features_json   TEXT,
  calculated_at   INTEGER NOT NULL,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(customer_id, feature_version)
);

CREATE INDEX IF NOT EXISTS idx_customer_features_customer ON customer_features(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_features_agent ON customer_features(agent_login, archetype);
CREATE INDEX IF NOT EXISTS idx_customer_features_archetype ON customer_features(archetype, archetype_confidence);

-- ---------------------------------------------------------------------------
-- Seed: Risk Tier Configuration (16 rows)
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO risk_config (config_key, config_value, config_type, description, category)
VALUES
  ('tier_black_max_wager',      '0',         'number',  'Maximum wager for BLACK tier (cents)',          'tier'),
  ('tier_black_max_payout',     '0',         'number',  'Maximum payout for BLACK tier (cents)',         'tier'),
  ('tier_red_max_wager',        '5000',      'number',  'Maximum wager for RED tier: $50 (cents)',       'tier'),
  ('tier_red_max_payout',       '10000',     'number',  'Maximum payout for RED tier: $100 (cents)',     'tier'),
  ('tier_yellow_action',        'monitor',   'string',  'Action for YELLOW tier',                        'tier'),
  ('tier_green_action',         'normal',    'string',  'Action for GREEN tier',                         'tier'),
  ('velocity_check_window_min', '60',        'number',  'Velocity check window in minutes',              'threshold'),
  ('max_wagers_per_hour',       '20',        'number',  'Max wagers per hour before flag',               'threshold'),
  ('pattern_min_sample_size',   '10',        'number',  'Minimum wagers for pattern detection',          'threshold'),
  ('sharp_win_rate_threshold',  '0.55',      'number',  'Win rate threshold for sharp classification',   'threshold'),
  ('chase_loss_rate_threshold', '0.35',      'number',  'Loss rate threshold for chase gambler',         'threshold'),
  ('new_player_wager_limit',    '100',       'number',  'Max wager count for "new" archetype',           'threshold'),
  ('position_expiry_hours',     '24',        'number',  'Risk position auto-expiry in hours',            'threshold'),
  ('alert_cleanup_days',        '90',        'number',  'Alert retention before cleanup',                'threshold'),
  ('ai_model_name',             'kimi',      'string',  'AI model for risk analysis',                    'model'),
  ('feature_extract_interval',  '600',       'number',  'Feature extraction interval in seconds',        'model');

-- ---------------------------------------------------------------------------
-- Seed: Sample Risk Positions (5 rows)
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO risk_positions (
  position_id, agent_login, player_id, sport, event_id, event_name,
  market, position_type, total_stake, total_exposure, max_payout,
  player_count, wager_count, risk_score, risk_tier, status, expires_at, created_at, updated_at
)
VALUES
  ('pos_demo_001', 'PINNACLE', NULL, 'NBA', 'evt_lal_bos_001', 'Lakers vs Celtics',
   'spread', 'exposure', 450000, 405000, 855000, 12, 15, 72.5, 'RED', 'open',
   (strftime('%s','now') + 86400), (strftime('%s','now')), (strftime('%s','now'))),

  ('pos_demo_002', 'DRAFTKINGS', NULL, 'NFL', 'evt_kc_sf_002', 'Chiefs vs 49ers',
   'ml', 'exposure', 320000, 280000, 600000, 8, 10, 45.0, 'YELLOW', 'open',
   (strftime('%s','now') + 86400), (strftime('%s','now')), (strftime('%s','now'))),

  ('pos_demo_003', 'FANDUEL', NULL, 'MLB', 'evt_nyy_bos_003', 'Yankees vs Red Sox',
   'total', 'exposure', 180000, 160000, 340000, 5, 6, 25.0, 'GREEN', 'open',
   (strftime('%s','now') + 86400), (strftime('%s','now')), (strftime('%s','now'))),

  ('pos_demo_004', 'PINNACLE', NULL, 'NBA', 'evt_mia_den_004', 'Heat vs Nuggets',
   'parlay', 'exposure', 890000, 820000, 1710000, 18, 22, 88.0, 'BLACK', 'warning',
   (strftime('%s','now') + 43200), (strftime('%s','now')), (strftime('%s','now'))),

  ('pos_demo_005', 'BET365', NULL, 'SOCCER', 'evt_mci_ars_005', 'Man City vs Arsenal',
   'ml', 'exposure', 210000, 195000, 405000, 9, 11, 52.0, 'YELLOW', 'open',
   (strftime('%s','now') + 86400), (strftime('%s','now')), (strftime('%s','now')));

-- ---------------------------------------------------------------------------
-- Seed: Sample Wager Violations (3 rows)
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO wager_violations (
  violation_id, wager_id, player_id, agent_login, rule_id, violation_type,
  severity, description, wager_snapshot_json, action_taken, status, created_at
)
VALUES
  ('vlt_demo_001', 'wgr_001', 'player_sharp_01', 'PINNACLE', NULL, 'limit_exceeded',
   'high', 'Stake $500 exceeds RED tier limit of $50 for player_sharp_01',
   '{"wagerId":"wgr_001","stake":50000,"playerId":"player_sharp_01","sport":"NBA"}',
   'limited', 'open', (strftime('%s','now') - 3600)),

  ('vlt_demo_002', 'wgr_002', 'player_whale_02', 'DRAFTKINGS', NULL, 'velocity',
   'medium', 'Player placed 35 wagers in 1 hour (limit: 20)',
   '{"wagerId":"wgr_002","stake":100000,"playerId":"player_whale_02","sport":"NFL"}',
   'escalated', 'open', (strftime('%s','now') - 7200)),

  ('vlt_demo_003', 'wgr_003', 'player_new_03', 'FANDUEL', NULL, 'tier_breach',
   'critical', 'BLACK tier player attempted wager - auto blocked',
   '{"wagerId":"wgr_003","stake":25000,"playerId":"player_new_03","sport":"MLB"}',
   'blocked', 'confirmed', (strftime('%s','now') - 1800));

-- ---------------------------------------------------------------------------
-- Seed: Sample Enforcement Queue (2 rows)
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO enforcement_queue (
  queue_id, action_type, entity_type, entity_id, agent_login,
  params_json, status, priority, processed_at, processed_by, created_at, updated_at
)
VALUES
  ('enf_demo_001', 'apply_limit', 'player', 'player_sharp_01', 'PINNACLE',
   '{"reason":"RED tier limit enforcement","limit_type":"wager","amount":5000,"applied_by":"system"}',
   'completed', 10, (strftime('%s','now') - 3600), 'system', (strftime('%s','now') - 7200), (strftime('%s','now'))),

  ('enf_demo_002', 'block_wager', 'player', 'player_new_03', 'FANDUEL',
   '{"reason":"BLACK tier - wagering suspended"}',
   'pending', 5, NULL, NULL, (strftime('%s','now') - 1800), (strftime('%s','now')));

-- ---------------------------------------------------------------------------
-- Seed: Sample AI Risk Flags (2 rows)
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO ai_risk_flags (
  flag_id, customer_id, agent_login, flag_type, severity, model_name, model_version,
  overall_score, explanation, recommended_action, status, created_at, updated_at
)
VALUES
  ('flag_demo_001', 'player_sharp_01', 'PINNACLE', 'model_prediction', 'high', 'kimi', 'v1',
   0.82, 'Sharp betting patterns detected: 62% win rate over 85 wagers, consistent stake sizing. Recommend tier reduction to RED.',
   'limit', 'open', (strftime('%s','now') - 86400), (strftime('%s','now'))),

  ('flag_demo_002', 'player_whale_02', 'DRAFTKINGS', 'pattern_match', 'medium', 'kimi', 'v1',
   0.45, 'High-velocity betting with moderate win rate. Pattern suggests recreational whale behavior.',
   'monitor', 'acknowledged', (strftime('%s','now') - 172800), (strftime('%s','now')));

-- ---------------------------------------------------------------------------
-- DOWN
-- ---------------------------------------------------------------------------

-- DROP TABLE IF EXISTS customer_features;
-- DROP TABLE IF EXISTS ai_risk_flags;
-- DROP TABLE IF EXISTS risk_analytics_snapshots;
-- DROP TABLE IF EXISTS risk_config;
-- DROP TABLE IF EXISTS wager_violations;
-- DROP TABLE IF EXISTS limit_enforcement_log;
-- DROP TABLE IF EXISTS enforcement_queue;
-- DROP TABLE IF EXISTS risk_positions;
