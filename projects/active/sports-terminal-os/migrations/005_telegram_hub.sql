-- Migration 005: Telegram Hub Tables
-- Run: bun run migrate
--
-- Tables:
--   bot_heartbeat        — Worker health tracking
--   telegram_dispatch_log — Delivery audit log
--
-- Modifications:
--   agent_supergroups.bot_id       — Link supergroups to bot workers
--   agent_supergroup_topics.created_by — Track topic creation source
--
-- Indexes for fast lookups.
-- Seed: 3 default bot_heartbeat entries.

-- ============================================================================
-- 1. Bot heartbeat table
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_heartbeat (
  bot_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'stopped',
  last_heartbeat DATETIME NOT NULL,
  messages_delivered INTEGER NOT NULL DEFAULT 0,
  messages_failed INTEGER NOT NULL DEFAULT 0,
  topics_managed INTEGER NOT NULL DEFAULT 0,
  uptime_seconds INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update updated_at trigger
CREATE TRIGGER IF NOT EXISTS bot_heartbeat_updated
AFTER UPDATE ON bot_heartbeat
BEGIN
  UPDATE bot_heartbeat SET updated_at = CURRENT_TIMESTAMP WHERE bot_id = NEW.bot_id;
END;

-- ============================================================================
-- 2. Telegram dispatch log (delivery audit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS telegram_dispatch_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  agent_login TEXT,
  chat_id INTEGER,
  thread_id INTEGER,
  purpose TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'deduped')),
  latency_ms INTEGER,
  telegram_message_id INTEGER,
  error TEXT,
  payload_preview TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. Add bot_id to agent_supergroups (if not exists)
-- ============================================================================

SELECT CASE
  WHEN NOT EXISTS (
    SELECT 1 FROM pragma_table_info('agent_supergroups') WHERE name = 'bot_id'
  )
  THEN (
    ALTER TABLE agent_supergroups ADD COLUMN bot_id TEXT
  )
END;

-- ============================================================================
-- 4. Add created_by to agent_supergroup_topics (if not exists)
-- ============================================================================

SELECT CASE
  WHEN NOT EXISTS (
    SELECT 1 FROM pragma_table_info('agent_supergroup_topics') WHERE name = 'created_by'
  )
  THEN (
    ALTER TABLE agent_supergroup_topics ADD COLUMN created_by TEXT DEFAULT 'manual'
  )
END;

-- ============================================================================
-- 5. Indexes
-- ============================================================================

-- Fast dispatch log queries
CREATE INDEX IF NOT EXISTS idx_dispatch_time ON telegram_dispatch_log(created_at);
CREATE INDEX IF NOT EXISTS idx_dispatch_bot ON telegram_dispatch_log(bot_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dispatch_status ON telegram_dispatch_log(status, created_at);
CREATE INDEX IF NOT EXISTS idx_dispatch_agent ON telegram_dispatch_log(agent_login, created_at);

-- Fast heartbeat lookup
CREATE INDEX IF NOT EXISTS idx_heartbeat_time ON bot_heartbeat(last_heartbeat);

-- Fast supergroup bot lookup
CREATE INDEX IF NOT EXISTS idx_agent_supergroups_bot_id ON agent_supergroups(bot_id);

-- ============================================================================
-- 6. Seed bot assignments (default: all existing supergroups -> agent_bot)
-- ============================================================================

UPDATE OR IGNORE agent_supergroups SET bot_id = 'agent_bot' WHERE bot_id IS NULL;

-- ============================================================================
-- 7. Seed heartbeat rows for default bots
-- ============================================================================

INSERT OR IGNORE INTO bot_heartbeat
  (bot_id, status, last_heartbeat, messages_delivered, messages_failed, topics_managed, uptime_seconds, error_count)
VALUES
  ('risk_bot', 'stopped', datetime('now'), 0, 0, 0, 0, 0),
  ('payment_bot', 'stopped', datetime('now'), 0, 0, 0, 0, 0),
  ('agent_bot', 'stopped', datetime('now'), 0, 0, 0, 0, 0);
