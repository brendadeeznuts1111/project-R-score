-- P2P Queue System Telegram Integration Schema
-- This schema extends the existing queue system with Telegram-specific data

-- Telegram data table for queue items
CREATE TABLE IF NOT EXISTS telegram_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_item_id TEXT NOT NULL,
  telegram_group_id TEXT,
  telegram_chat_id TEXT,
  telegram_channel TEXT,
  telegram_username TEXT,
  telegram_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (queue_item_id) REFERENCES queue_items(id) ON DELETE CASCADE
);

-- Telegram notifications log
CREATE TABLE IF NOT EXISTS telegram_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_item_id TEXT,
  match_id TEXT,
  notification_type TEXT NOT NULL, -- 'item_added', 'match_approved', 'status_update', etc.
  telegram_chat_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  FOREIGN KEY (queue_item_id) REFERENCES queue_items(id) ON DELETE SET NULL,
  FOREIGN KEY (match_id) REFERENCES queue_matches(id) ON DELETE SET NULL
);

-- Telegram bot configuration
CREATE TABLE IF NOT EXISTS telegram_bot_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_token TEXT NOT NULL,
  bot_username TEXT,
  webhook_url TEXT,
  allowed_groups TEXT, -- JSON array of allowed group IDs
  allowed_channels TEXT, -- JSON array of allowed channel IDs
  notification_settings TEXT, -- JSON object with notification preferences
  is_active BOOLEAN DEFAULT true,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Telegram user sessions for P2P operations
CREATE TABLE IF NOT EXISTS telegram_user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL,
  telegram_username TEXT,
  telegram_chat_id TEXT NOT NULL,
  session_data TEXT, -- JSON object with session state
  last_activity TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(telegram_user_id, telegram_chat_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_telegram_data_queue_item ON telegram_data(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_telegram_data_group_id ON telegram_data(telegram_group_id);
CREATE INDEX IF NOT EXISTS idx_telegram_data_chat_id ON telegram_data(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_data_channel ON telegram_data(telegram_channel);
CREATE INDEX IF NOT EXISTS idx_telegram_data_username ON telegram_data(telegram_username);

CREATE INDEX IF NOT EXISTS idx_telegram_notifications_item_id ON telegram_notifications(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_telegram_notifications_match_id ON telegram_notifications(match_id);
CREATE INDEX IF NOT EXISTS idx_telegram_notifications_chat_id ON telegram_notifications(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_notifications_type ON telegram_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_telegram_notifications_sent_at ON telegram_notifications(sent_at);

CREATE INDEX IF NOT EXISTS idx_telegram_user_sessions_user_id ON telegram_user_sessions(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_user_sessions_chat_id ON telegram_user_sessions(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_user_sessions_last_activity ON telegram_user_sessions(last_activity);

-- Views for common queries
CREATE VIEW IF NOT EXISTS v_telegram_queue_summary AS
SELECT 
  td.telegram_group_id,
  td.telegram_chat_id,
  td.telegram_channel,
  qi.type,
  qi.status,
  COUNT(*) as item_count,
  SUM(qi.amount) as total_amount,
  AVG(qi.amount) as avg_amount
FROM queue_items qi
JOIN telegram_data td ON qi.id = td.queue_item_id
GROUP BY td.telegram_group_id, td.telegram_chat_id, td.telegram_channel, qi.type, qi.status;

CREATE VIEW IF NOT EXISTS v_telegram_matching_opportunities AS
SELECT 
  m.id as match_id,
  m.match_score,
  w.amount as withdrawal_amount,
  d.amount as deposit_amount,
  w.payment_type,
  td.telegram_group_id,
  td.telegram_chat_id,
  td.telegram_channel,
  td.telegram_username,
  m.created_at as match_created,
  w.created_at as withdrawal_created,
  d.created_at as deposit_created
FROM queue_matches m
JOIN queue_items w ON m.withdrawal_id = w.id
JOIN queue_items d ON m.deposit_id = d.id
LEFT JOIN telegram_data td ON w.id = td.queue_item_id
WHERE m.status = 'pending'
ORDER BY m.match_score DESC, m.created_at ASC;

-- Triggers for automatic updates
CREATE TRIGGER IF NOT EXISTS tr_telegram_data_updated
AFTER UPDATE ON telegram_data
BEGIN
  UPDATE telegram_data SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS tr_telegram_bot_config_updated
AFTER UPDATE ON telegram_bot_config
BEGIN
  UPDATE telegram_bot_config SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS tr_telegram_user_sessions_activity
AFTER UPDATE ON telegram_user_sessions
BEGIN
  UPDATE telegram_user_sessions SET last_activity = datetime('now') WHERE id = NEW.id;
END;

-- Sample data for testing
INSERT OR IGNORE INTO telegram_bot_config (bot_token, bot_username, allowed_groups, allowed_channels, notification_settings) VALUES
('YOUR_BOT_TOKEN_HERE', 'fire22_p2p_bot', '["TG_GROUP_001", "TG_GROUP_002"]', '["CHANNEL_MAIN", "CHANNEL_VIP"]', '{"withdrawals": true, "deposits": true, "matches": true, "status_updates": true}');

-- Business rules documentation:
-- 
-- TELEGRAM INTEGRATION RULES:
-- 1. Each queue item can have associated Telegram data (group, chat, channel, username)
-- 2. Notifications are sent to the appropriate Telegram destination
-- 3. User sessions maintain state for interactive P2P operations
-- 4. Bot configuration controls which groups/channels are allowed
-- 
-- NOTIFICATION TYPES:
-- - item_added: When withdrawal/deposit is added to queue
-- - match_approved: When P2P match is approved
-- - status_update: When item status changes
-- - match_rejected: When P2P match is rejected
-- - item_cancelled: When item is cancelled
-- 
-- SECURITY FEATURES:
-- - Only allowed groups/channels receive notifications
-- - User sessions expire after inactivity
-- - Bot token is stored securely
-- - Audit trail of all notifications sent
