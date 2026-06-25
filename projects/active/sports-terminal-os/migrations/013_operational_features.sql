-- Migration: 013 — Operational Features
-- Zone: Operational Features (Midnight Galaxy #2b1e3e)
-- Tables: ip_tracking, ip_denylist, ip_flags, ip_reputation_log,
--         sandbox_scenarios_v2, sandbox_customers, sandbox_snapshots,
--         sandbox_ab_tests_v2, sandbox_summary_queue_v2

-- ---------------------------------------------------------------------------
-- UP
-- ---------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- IP Surveillance Tables
-- ---------------------------------------------------------------------------

-- IP tracking: per-player IP usage with geo data
CREATE TABLE IF NOT EXISTS ip_tracking (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address      TEXT    NOT NULL,
  player_id       TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL,
  wager_id        TEXT,
  first_seen_at   INTEGER NOT NULL,
  last_seen_at    INTEGER NOT NULL,
  sighting_count  INTEGER DEFAULT 1,
  country_code    TEXT,
  region_code     TEXT,
  city            TEXT,
  isp             TEXT,
  is_vpn          INTEGER DEFAULT 0,
  is_proxy        INTEGER DEFAULT 0,
  is_tor          INTEGER DEFAULT 0,
  is_mobile       INTEGER DEFAULT 0,
  risk_score      INTEGER DEFAULT 0,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(ip_address, player_id)
);

CREATE INDEX IF NOT EXISTS idx_ip_tracking_ip ON ip_tracking(ip_address, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_player ON ip_tracking(player_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_agent ON ip_tracking(agent_login, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_risk ON ip_tracking(risk_score, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_tracking_vpn ON ip_tracking(is_vpn, is_proxy, is_tor);

-- IP denylist: blocked IP addresses (checked at middleware level)
CREATE TABLE IF NOT EXISTS ip_denylist (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address      TEXT    NOT NULL UNIQUE,
  ip_range_start  INTEGER,
  ip_range_end    INTEGER,
  list_type       TEXT    DEFAULT 'manual',
  reason          TEXT    NOT NULL,
  source          TEXT,
  blocked_by      TEXT,
  expiry_at       INTEGER,
  is_active       INTEGER DEFAULT 1,
  hit_count       INTEGER DEFAULT 0,
  last_hit_at     INTEGER,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_ip_denylist_active ON ip_denylist(is_active, ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_denylist_type ON ip_denylist(list_type, is_active);
CREATE INDEX IF NOT EXISTS idx_ip_denylist_expiry ON ip_denylist(expiry_at);
CREATE INDEX IF NOT EXISTS idx_ip_denylist_range ON ip_denylist(ip_range_start, ip_range_end) WHERE ip_range_start IS NOT NULL;

-- IP flags: automated analysis results from IP surveillance cron (*/15 min)
CREATE TABLE IF NOT EXISTS ip_flags (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address      TEXT    NOT NULL,
  player_id       TEXT    NOT NULL,
  agent_login     TEXT    NOT NULL,
  flag_type       TEXT    NOT NULL,
  severity        TEXT    DEFAULT 'medium',
  description     TEXT    NOT NULL,
  evidence_json   TEXT,
  resolution      TEXT,
  resolved_by     TEXT,
  resolved_at     INTEGER,
  is_active       INTEGER DEFAULT 1,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_ip_flags_ip ON ip_flags(ip_address, is_active);
CREATE INDEX IF NOT EXISTS idx_ip_flags_player ON ip_flags(player_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ip_flags_type ON ip_flags(flag_type, severity, is_active);
CREATE INDEX IF NOT EXISTS idx_ip_flags_agent ON ip_flags(agent_login, is_active, created_at DESC);

-- IP reputation log: immutable audit log of reputation changes
CREATE TABLE IF NOT EXISTS ip_reputation_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address      TEXT    NOT NULL,
  player_id       TEXT,
  old_score       INTEGER,
  new_score       INTEGER NOT NULL,
  score_delta     INTEGER NOT NULL,
  reason          TEXT    NOT NULL,
  source          TEXT,
  triggered_by    TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_ip_rep_log_ip ON ip_reputation_log(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_rep_log_player ON ip_reputation_log(player_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Sandbox Tables (v2)
-- ---------------------------------------------------------------------------

-- Sandbox scenarios: test configurations for A/B testing
CREATE TABLE IF NOT EXISTS sandbox_scenarios_v2 (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario_id     TEXT    NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  description     TEXT,
  scenario_type   TEXT    NOT NULL,
  config_json     TEXT    NOT NULL,
  is_active       INTEGER DEFAULT 1,
  run_count       INTEGER DEFAULT 0,
  last_run_at     INTEGER,
  last_result_json TEXT,
  created_by      TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_sandbox_scenarios_type ON sandbox_scenarios_v2(scenario_type, is_active);
CREATE INDEX IF NOT EXISTS idx_sandbox_scenarios_active ON sandbox_scenarios_v2(is_active);

-- Sandbox customers: simulated customer records (isolated from production)
CREATE TABLE IF NOT EXISTS sandbox_customers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id     TEXT    NOT NULL,
  scenario_id     TEXT    NOT NULL,
  name            TEXT,
  email           TEXT,
  archetype       TEXT    DEFAULT 'recreational',
  balance         REAL    DEFAULT 100000,
  risk_tier       TEXT    DEFAULT 'GREEN',
  config_json     TEXT,
  is_active       INTEGER DEFAULT 1,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(customer_id, scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_sandbox_customers_scenario ON sandbox_customers(scenario_id, is_active);

-- Sandbox snapshots: point-in-time state capture
CREATE TABLE IF NOT EXISTS sandbox_snapshots (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id     TEXT    NOT NULL UNIQUE,
  scenario_id     TEXT    NOT NULL,
  customer_id     TEXT,
  snapshot_type   TEXT    DEFAULT 'manual',
  label           TEXT,
  state_json      TEXT    NOT NULL,
  metrics_json    TEXT,
  created_by      TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_sandbox_snapshots_scenario ON sandbox_snapshots(scenario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sandbox_snapshots_customer ON sandbox_snapshots(customer_id, created_at DESC);

-- A/B tests (v2): variant testing within sandbox
CREATE TABLE IF NOT EXISTS sandbox_ab_tests_v2 (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id         TEXT    NOT NULL UNIQUE,
  scenario_id     TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  description     TEXT,
  variant_a_json  TEXT    NOT NULL,
  variant_b_json  TEXT    NOT NULL,
  status          TEXT    DEFAULT 'draft',
  winner          TEXT,
  sample_size_a   INTEGER DEFAULT 0,
  sample_size_b   INTEGER DEFAULT 0,
  metric_name     TEXT,
  results_json    TEXT,
  started_at      INTEGER,
  ended_at        INTEGER,
  created_by      TEXT,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_sandbox_ab_scenario ON sandbox_ab_tests_v2(scenario_id, status);
CREATE INDEX IF NOT EXISTS idx_sandbox_ab_status ON sandbox_ab_tests_v2(status, created_at DESC);

-- Summary queue (v2): AI-generated summaries of test results
CREATE TABLE IF NOT EXISTS sandbox_summary_queue_v2 (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id         TEXT    NOT NULL,
  scenario_id     TEXT    NOT NULL,
  status          TEXT    DEFAULT 'pending',
  priority        INTEGER DEFAULT 100,
  prompt_text     TEXT,
  summary_text    TEXT,
  model_used      TEXT,
  tokens_used     INTEGER,
  error_message   TEXT,
  attempts        INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 3,
  processed_at    INTEGER,
  created_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_sandbox_queue_status ON sandbox_summary_queue_v2(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_sandbox_queue_test ON sandbox_summary_queue_v2(test_id);

-- ---------------------------------------------------------------------------
-- Seed Data
-- ---------------------------------------------------------------------------

-- 2 sample scenarios
INSERT OR IGNORE INTO sandbox_scenarios_v2 (scenario_id, name, description, scenario_type, config_json, created_by, created_at, updated_at)
VALUES
  ('scn_q1_risk_2025', 'Q1 Risk Model Baseline', 'Baseline simulation for Q1 2025 risk assessment with 500 simulated customers across all archetypes', 'simulation', '{"customerCount": 500, "archetypeDistribution": {"recreational": 0.4, "sharp": 0.15, "whale": 0.1, "chase_gambler": 0.2, "new": 0.15}}', 'system', strftime('%s','now'), strftime('%s','now')),
  ('scn_limit_ab_test', 'Wager Limit A/B Test Scenario', 'Compare $5K vs $10K wager limits on sharp player retention and GGR', 'a_b_test', '{"customerCount": 1000, "controlLimit": 5000, "treatmentLimit": 10000, "targetArchetype": "sharp"}', 'system', strftime('%s','now'), strftime('%s','now'));

-- 1 sample A/B test
INSERT OR IGNORE INTO sandbox_ab_tests_v2 (test_id, scenario_id, name, description, variant_a_json, variant_b_json, status, metric_name, sample_size_a, sample_size_b, created_by, created_at, updated_at)
VALUES
  ('abt_wager_limit_001', 'scn_limit_ab_test', 'Wager Limit Impact — $5K vs $10K', 'Testing the impact of doubling wager limits on sharp player behavior and overall GGR. Variant A = $5K limit (control), Variant B = $10K limit (treatment).', '{"wagerLimit": 5000, "playerSegment": "sharp", "holdPercentage": 0.055}', '{"wagerLimit": 10000, "playerSegment": "sharp", "holdPercentage": 0.045}', 'draft', 'conversion_rate', 500, 500, 'system', strftime('%s','now'), strftime('%s','now'));

-- 3 denylist entries
INSERT OR IGNORE INTO ip_denylist (ip_address, reason, list_type, source, blocked_by, is_active, created_at, updated_at)
VALUES
  ('185.220.101.42', 'Known Tor exit node — multiple suspicious wagers detected', 'threat_intel', 'tor_exit_list', 'system', 1, strftime('%s','now'), strftime('%s','now')),
  ('103.253.145.88', 'VPN endpoint used for coordinated multi-account betting', 'auto', 'ip_surveillance', 'system', 1, strftime('%s','now'), strftime('%s','now')),
  ('192.168.999.1', 'Manual block — test entry for compliance validation', 'manual', 'admin_panel', 'admin', 1, strftime('%s','now'), strftime('%s','now'));

-- ---------------------------------------------------------------------------
-- DOWN
-- ---------------------------------------------------------------------------

-- DOWN: Operational features migration rollback
-- DROP TABLE IF EXISTS sandbox_summary_queue_v2;
-- DROP TABLE IF EXISTS sandbox_ab_tests_v2;
-- DROP TABLE IF EXISTS sandbox_snapshots;
-- DROP TABLE IF EXISTS sandbox_customers;
-- DROP TABLE IF EXISTS sandbox_scenarios_v2;
-- DROP TABLE IF EXISTS ip_reputation_log;
-- DROP TABLE IF EXISTS ip_flags;
-- DROP TABLE IF EXISTS ip_denylist;
-- DROP TABLE IF EXISTS ip_tracking;
