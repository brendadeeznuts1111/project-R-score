-- UP
-- Zone 8: Webhook Alerts — Webhook configs, delivery log, and alert log

-- Webhook configurations table
CREATE TABLE IF NOT EXISTS webhook_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  headers_json TEXT DEFAULT '{}',
  body_template TEXT,
  event_types_json TEXT DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 3,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  secret TEXT,
  circuit_state TEXT DEFAULT 'closed',
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Webhook delivery log table
CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id TEXT NOT NULL UNIQUE,
  webhook_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  http_status INTEGER,
  response_body TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  duration_ms INTEGER,
  signature TEXT,
  timestamp INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (webhook_id) REFERENCES webhook_configs(webhook_id)
);

-- Alert log table
CREATE TABLE IF NOT EXISTS alert_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT,
  related_entity_type TEXT,
  related_entity_id TEXT,
  metadata_json TEXT DEFAULT '{}',
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_by TEXT,
  acknowledged_at INTEGER,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolved_by TEXT,
  resolved_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_configs_enabled ON webhook_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_event_types ON webhook_configs(event_types_json);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_circuit ON webhook_configs(circuit_state);

CREATE INDEX IF NOT EXISTS idx_delivery_log_webhook_id ON webhook_delivery_log(webhook_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_status ON webhook_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_delivery_log_event_type ON webhook_delivery_log(event_type);
CREATE INDEX IF NOT EXISTS idx_delivery_log_timestamp ON webhook_delivery_log(timestamp);

CREATE INDEX IF NOT EXISTS idx_alert_log_severity ON alert_log(severity);
CREATE INDEX IF NOT EXISTS idx_alert_log_type ON alert_log(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_log_acknowledged ON alert_log(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alert_log_resolved ON alert_log(resolved);
CREATE INDEX IF NOT EXISTS idx_alert_log_created_at ON alert_log(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_log_entity ON alert_log(related_entity_type, related_entity_id);

-- Seed: 1 default webhook config (disabled)
INSERT OR IGNORE INTO webhook_configs (webhook_id, name, url, method, headers_json, event_types_json, enabled, description)
VALUES (
  'wh_default_001',
  'Default System Webhook',
  'https://example.com/webhook',
  'POST',
  '{"Content-Type": "application/json"}',
  '["risk_alert", "system_alert"]',
  0,
  'Default webhook configuration template. Update URL and enable to activate.'
);

-- DOWN
DROP INDEX IF EXISTS idx_alert_log_entity;
DROP INDEX IF EXISTS idx_alert_log_created_at;
DROP INDEX IF EXISTS idx_alert_log_resolved;
DROP INDEX IF EXISTS idx_alert_log_acknowledged;
DROP INDEX IF EXISTS idx_alert_log_type;
DROP INDEX IF EXISTS idx_alert_log_severity;
DROP INDEX IF EXISTS idx_delivery_log_timestamp;
DROP INDEX IF EXISTS idx_delivery_log_event_type;
DROP INDEX IF EXISTS idx_delivery_log_status;
DROP INDEX IF EXISTS idx_delivery_log_webhook_id;
DROP INDEX IF EXISTS idx_webhook_configs_circuit;
DROP INDEX IF EXISTS idx_webhook_configs_event_types;
DROP INDEX IF EXISTS idx_webhook_configs_enabled;
DROP TABLE IF EXISTS alert_log;
DROP TABLE IF EXISTS webhook_delivery_log;
DROP TABLE IF EXISTS webhook_configs;
