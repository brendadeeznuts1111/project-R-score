-- Migration 011: Agent Domain — Sunset Boulevard
-- Tables: agents, agent_hierarchy, player_agent_map, agent_supergroups, agent_supergroup_topics
-- Theme: #e76f51 (Sunset Boulevard)
--
-- UP

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- 1. agents — Canonical agent records with tier system
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agents (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_login     TEXT    NOT NULL UNIQUE,    -- Agent identifier (e.g., "agent_001")
  display_name    TEXT    NOT NULL,            -- Human-readable name
  email           TEXT,
  phone           TEXT,
  tier            TEXT    DEFAULT 'bronze',   -- platinum | gold | silver | bronze
  status          TEXT    DEFAULT 'active',   -- active | inactive | suspended
  parent_login    TEXT,                       -- Upline agent (NULL = root)
  balance         REAL    DEFAULT 0,          -- Current balance in cents
  commission_rate REAL    DEFAULT 25.0,       -- Commission percentage
  total_players   INTEGER DEFAULT 0,          -- Cached player count
  total_wagers    INTEGER DEFAULT 0,          -- Cached wager count
  total_pnl       REAL    DEFAULT 0,          -- Net P&L in cents
  lifetime_ggr    REAL    DEFAULT 0,          -- Gross gaming revenue in cents
  avatar_url      TEXT,                       -- Optional avatar
  settings_json   TEXT,                       -- Agent-specific settings
  metadata_json   TEXT,                       -- Extra data
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_agents_tier ON agents(tier, status);
CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_login, status);
CREATE INDEX IF NOT EXISTS idx_agents_login ON agents(agent_login, status);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created ON agents(created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. agent_hierarchy — Materialized path for fast tree queries
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_hierarchy (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_login     TEXT    NOT NULL,           -- FK to agents.agent_login
  parent_login    TEXT,                       -- FK to agents.agent_login (NULL = root)
  level           INTEGER DEFAULT 0,          -- Depth in tree (0 = root)
  path            TEXT    NOT NULL,           -- Materialized path (e.g., "/root/child/grandchild")
  commission_pct  REAL    DEFAULT 0,          -- Override commission % for this relationship
  is_active       INTEGER DEFAULT 1,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(agent_login, parent_login)
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_agent ON agent_hierarchy(agent_login, is_active);
CREATE INDEX IF NOT EXISTS idx_hierarchy_parent ON agent_hierarchy(parent_login, is_active);
CREATE INDEX IF NOT EXISTS idx_hierarchy_path ON agent_hierarchy(path);
CREATE INDEX IF NOT EXISTS idx_hierarchy_level ON agent_hierarchy(level, is_active);

-- ---------------------------------------------------------------------------
-- 3. player_agent_map — Junction: players assigned to agents
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS player_agent_map (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id       TEXT    NOT NULL,           -- FK to customers.customer_id
  agent_login     TEXT    NOT NULL,           -- FK to agents.agent_login
  assigned_at     INTEGER NOT NULL,           -- When assignment was made
  assigned_by     TEXT,                       -- Who created this mapping
  status          TEXT    DEFAULT 'active',   -- active | transferred | removed
  is_primary      INTEGER DEFAULT 1,          -- 1 = primary agent for player
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(player_id, agent_login)
);

CREATE INDEX IF NOT EXISTS idx_player_agent_map_player ON player_agent_map(player_id, status);
CREATE INDEX IF NOT EXISTS idx_player_agent_map_agent ON player_agent_map(agent_login, status);
CREATE INDEX IF NOT EXISTS idx_player_agent_map_assigned ON player_agent_map(assigned_at DESC);

-- ---------------------------------------------------------------------------
-- 4. agent_supergroups — Telegram supergroup assignments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_supergroups (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_login     TEXT    NOT NULL,           -- FK to agents.agent_login
  group_name      TEXT    NOT NULL,
  chat_id         TEXT    NOT NULL,           -- Telegram chat ID
  bot_id          TEXT,                       -- Assigned bot (risk_bot, payment_bot, agent_bot)
  purpose         TEXT    DEFAULT 'general',  -- general | riskAlerts | settlements | steam | arb | compliance
  status          TEXT    DEFAULT 'active',   -- active | inactive | archived
  is_forum        INTEGER DEFAULT 0,          -- 1 = supergroup with topics
  settings_json   TEXT,                       -- Telegram group settings
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_supergroups_agent ON agent_supergroups(agent_login, status);
CREATE INDEX IF NOT EXISTS idx_agent_supergroups_chat ON agent_supergroups(chat_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_supergroups_bot ON agent_supergroups(bot_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_supergroups_purpose ON agent_supergroups(purpose, status);

-- ---------------------------------------------------------------------------
-- 5. agent_supergroup_topics — Topics within agent supergroups
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_supergroup_topics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  supergroup_id   INTEGER NOT NULL,           -- FK to agent_supergroups.id
  topic_name      TEXT    NOT NULL,
  thread_id       TEXT    NOT NULL,           -- Telegram thread/topic ID
  purpose         TEXT    DEFAULT 'general',  -- riskAlerts | general | settlements | steam | arb | compliance
  status          TEXT    DEFAULT 'active',   -- active | inactive | archived
  settings_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (supergroup_id) REFERENCES agent_supergroups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_supergroup_topics_supergroup ON agent_supergroup_topics(supergroup_id, status);
CREATE INDEX IF NOT EXISTS idx_supergroup_topics_purpose ON agent_supergroup_topics(purpose, status);

-- ---------------------------------------------------------------------------
-- 6. agent_billing — Commission and billing snapshot
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_billing (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_login     TEXT    NOT NULL,           -- FK to agents.agent_login
  period          TEXT    NOT NULL,           -- today | week | month | quarter | year
  period_start    INTEGER NOT NULL,           -- Unix epoch
  period_end      INTEGER NOT NULL,           -- Unix epoch
  total_players   INTEGER DEFAULT 0,
  active_players  INTEGER DEFAULT 0,
  total_wagers    INTEGER DEFAULT 0,
  total_wagered   REAL    DEFAULT 0,          -- In cents
  total_payouts   REAL    DEFAULT 0,          -- In cents
  gross_profit    REAL    DEFAULT 0,          -- GGR in cents
  net_profit      REAL    DEFAULT 0,          -- NGR in cents
  commission_due  REAL    DEFAULT 0,          -- Commission owed in cents
  commission_rate REAL    DEFAULT 25.0,
  hold_pct        REAL,                       -- Hold percentage
  new_players     INTEGER DEFAULT 0,
  metadata_json   TEXT,
  created_at      INTEGER DEFAULT (strftime('%s','now')),
  updated_at      INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(agent_login, period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_agent_billing_agent ON agent_billing(agent_login, period);
CREATE INDEX IF NOT EXISTS idx_agent_billing_period ON agent_billing(period_start DESC, period_end DESC);

-- ---------------------------------------------------------------------------
-- Seed Data: 1 root agent + 4 sub-agents with hierarchy
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO agents (agent_login, display_name, email, phone, tier, status, parent_login, balance, commission_rate, total_players, total_wagers, total_pnl, metadata_json)
VALUES
  ('root_agent',   'Root Agent',     'root@sunset.com',  '+1-555-0100', 'platinum', 'active', NULL,       5000000, 35.0, 100, 5000, 250000,  '{"isRoot": true}'),
  ('agent_gold_1', 'Gold Agent One', 'gold1@sunset.com', '+1-555-0101', 'gold',     'active', 'root_agent', 2500000, 30.0, 50,  2500, 125000,  '{"region": "east"}'),
  ('agent_gold_2', 'Gold Agent Two', 'gold2@sunset.com', '+1-555-0102', 'gold',     'active', 'root_agent', 2000000, 30.0, 40,  2000, 100000,  '{"region": "west"}'),
  ('agent_silver', 'Silver Agent',   'silver@sunset.com','+1-555-0103', 'silver',   'active', 'agent_gold_1', 800000, 25.0, 20, 800,  40000,  '{"region": "northeast"}'),
  ('agent_bronze', 'Bronze Agent',   'bronze@sunset.com','+1-555-0104', 'bronze',   'active', 'agent_gold_2', 300000, 20.0, 10, 300,  15000,  '{"region": "southwest"}');

-- Hierarchy records with materialized paths

INSERT OR IGNORE INTO agent_hierarchy (agent_login, parent_login, level, path, commission_pct, is_active)
VALUES
  ('root_agent',   NULL,           0, '/root_agent',                      35.0, 1),
  ('agent_gold_1', 'root_agent',   1, '/root_agent/agent_gold_1',         30.0, 1),
  ('agent_gold_2', 'root_agent',   1, '/root_agent/agent_gold_2',         30.0, 1),
  ('agent_silver', 'agent_gold_1', 2, '/root_agent/agent_gold_1/agent_silver', 25.0, 1),
  ('agent_bronze', 'agent_gold_2', 2, '/root_agent/agent_gold_2/agent_bronze', 20.0, 1);

-- Seed: 10 player mappings

INSERT OR IGNORE INTO player_agent_map (player_id, agent_login, assigned_at, assigned_by, status, is_primary)
VALUES
  ('player_001', 'root_agent',   (strftime('%s','now')), 'system', 'active', 1),
  ('player_002', 'root_agent',   (strftime('%s','now')), 'system', 'active', 1),
  ('player_003', 'agent_gold_1', (strftime('%s','now')), 'system', 'active', 1),
  ('player_004', 'agent_gold_1', (strftime('%s','now')), 'system', 'active', 1),
  ('player_005', 'agent_gold_1', (strftime('%s','now')), 'system', 'active', 1),
  ('player_006', 'agent_gold_2', (strftime('%s','now')), 'system', 'active', 1),
  ('player_007', 'agent_gold_2', (strftime('%s','now')), 'system', 'active', 1),
  ('player_008', 'agent_silver', (strftime('%s','now')), 'system', 'active', 1),
  ('player_009', 'agent_silver', (strftime('%s','now')), 'system', 'active', 1),
  ('player_010', 'agent_bronze', (strftime('%s','now')), 'system', 'active', 1);

-- Seed: Supergroups for agents

INSERT OR IGNORE INTO agent_supergroups (agent_login, group_name, chat_id, bot_id, purpose, status, is_forum)
VALUES
  ('root_agent',   'Root Alerts',    '-1002010000001', 'agent_bot',   'riskAlerts',  'active', 1),
  ('root_agent',   'Root General',   '-1002010000002', 'agent_bot',   'general',     'active', 1),
  ('agent_gold_1', 'Gold1 Settlements', '-1002010000003', 'payment_bot', 'settlements', 'active', 1),
  ('agent_gold_2', 'Gold2 Settlements', '-1002010000004', 'payment_bot', 'settlements', 'active', 1),
  ('agent_silver', 'Silver HQ',      '-1002010000005', 'agent_bot',   'general',     'active', 0),
  ('agent_bronze', 'Bronze HQ',      '-1002010000006', 'agent_bot',   'general',     'active', 0);

-- Seed: Topics for forum supergroups

INSERT OR IGNORE INTO agent_supergroup_topics (supergroup_id, topic_name, thread_id, purpose, status)
SELECT id, 'Risk Alerts',    '1', 'riskAlerts',  'active' FROM agent_supergroups WHERE group_name = 'Root Alerts'
UNION ALL
SELECT id, 'General Chat',   '2', 'general',     'active' FROM agent_supergroups WHERE group_name = 'Root Alerts'
UNION ALL
SELECT id, 'Weekly Reports', '3', 'reports',     'active' FROM agent_supergroups WHERE group_name = 'Root Alerts'
UNION ALL
SELECT id, 'Settlements',    '1', 'settlements', 'active' FROM agent_supergroups WHERE group_name = 'Gold1 Settlements'
UNION ALL
SELECT id, 'Disputes',       '2', 'compliance',  'active' FROM agent_supergroups WHERE group_name = 'Gold1 Settlements';

-- ---------------------------------------------------------------------------
-- DOWN
-- ---------------------------------------------------------------------------

-- DROP TABLE IF EXISTS agent_billing;
-- DROP TABLE IF EXISTS agent_supergroup_topics;
-- DROP TABLE IF EXISTS agent_supergroups;
-- DROP TABLE IF EXISTS player_agent_map;
-- DROP TABLE IF EXISTS agent_hierarchy;
-- DROP TABLE IF EXISTS agents;
