-- Matrix Health System Database Schema
-- This file creates all necessary tables for the permissions matrix health monitoring

-- Agent Configs Table
CREATE TABLE IF NOT EXISTS agent_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL UNIQUE,
  permissions JSON NOT NULL,
  commission_rates JSON NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Customer Configs Table
CREATE TABLE IF NOT EXISTS customer_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL UNIQUE,
  agent_id TEXT NOT NULL,
  permissions JSON NOT NULL,
  betting_limits JSON NOT NULL,
  account_settings JSON NOT NULL,
  vip_status JSON NOT NULL,
  risk_profile JSON NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  FOREIGN KEY (agent_id) REFERENCES agent_configs(agent_id)
);

-- Matrix Health Logs Table
CREATE TABLE IF NOT EXISTS matrix_health_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  health_score INTEGER NOT NULL,
  total_agents INTEGER NOT NULL,
  total_permissions INTEGER NOT NULL,
  valid_matrix_cells INTEGER NOT NULL,
  data_completeness REAL NOT NULL,
  permission_coverage REAL NOT NULL,
  agent_data_quality REAL NOT NULL,
  issues_found TEXT,
  recommendations TEXT
);

-- Insert sample agent config data
INSERT OR REPLACE INTO agent_configs (agent_id, permissions, commission_rates, status) VALUES
('AGENT_001', 
 '{"can_place_bets": true, "can_modify_info": true, "can_withdraw": true, "can_deposit": true, "can_view_history": true, "can_use_telegram": true, "can_use_mobile": true, "can_use_desktop": true}',
 '{"standard": 0.05, "vip": 0.08, "premium": 0.10}',
 'active'
),
('AGENT_002', 
 '{"can_place_bets": true, "can_modify_info": false, "can_withdraw": true, "can_deposit": true, "can_view_history": true, "can_use_telegram": true, "can_use_mobile": true, "can_use_desktop": false}',
 '{"standard": 0.04, "vip": 0.07, "premium": 0.09}',
 'active'
),
('AGENT_003', 
 '{"can_place_bets": true, "can_modify_info": true, "can_withdraw": false, "can_deposit": true, "can_view_history": true, "can_use_telegram": false, "can_use_mobile": true, "can_use_desktop": true}',
 '{"standard": 0.06, "vip": 0.09, "premium": 0.12}',
 'active'
);

-- Insert sample customer config data
INSERT OR REPLACE INTO customer_configs (customer_id, agent_id, permissions, betting_limits, account_settings, vip_status, risk_profile, created_by, updated_by) VALUES
('CUSTOMER_001', 'AGENT_001',
 '{"can_place_bets": true, "can_modify_info": false, "can_withdraw": true, "can_deposit": true, "can_view_history": true, "can_use_telegram": true, "can_use_mobile": true, "can_use_desktop": true}',
 '{"max_single_bet": 1000, "max_daily_bet": 5000, "max_weekly_bet": 25000, "max_monthly_bet": 100000, "min_bet": 10}',
 '{"auto_logout_minutes": 30, "session_timeout_hours": 24, "require_2fa": false, "allow_remember_me": true, "notification_preferences": {"email": true, "sms": false, "telegram": true, "push": true}}',
 '{"level": "silver", "benefits": ["priority_support", "special_rates"], "special_rates": 0.05, "priority_support": true}',
 '{"risk_level": "medium", "max_exposure": 5000, "daily_loss_limit": 1000, "weekly_loss_limit": 5000, "monthly_loss_limit": 20000}',
 'SYSTEM', 'SYSTEM'
),
('CUSTOMER_002', 'AGENT_002',
 '{"can_place_bets": true, "can_modify_info": false, "can_withdraw": true, "can_deposit": true, "can_view_history": true, "can_use_telegram": true, "can_use_mobile": true, "can_use_desktop": false}',
 '{"max_single_bet": 500, "max_daily_bet": 2500, "max_weekly_bet": 12500, "max_monthly_bet": 50000, "min_bet": 5}',
 '{"auto_logout_minutes": 15, "session_timeout_hours": 12, "require_2fa": true, "allow_remember_me": false, "notification_preferences": {"email": true, "sms": true, "telegram": false, "push": false}}',
 '{"level": "bronze", "benefits": ["basic_support"], "special_rates": 0.04, "priority_support": false}',
 '{"risk_level": "low", "max_exposure": 2500, "daily_loss_limit": 500, "weekly_loss_limit": 2500, "monthly_loss_limit": 10000}',
 'SYSTEM', 'SYSTEM'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_configs_agent_id ON agent_configs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_configs_status ON agent_configs(status);
CREATE INDEX IF NOT EXISTS idx_customer_configs_customer_id ON customer_configs(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_configs_agent_id ON customer_configs(agent_id);
CREATE INDEX IF NOT EXISTS idx_matrix_health_logs_timestamp ON matrix_health_logs(check_timestamp);

-- Create views for easier querying
CREATE VIEW IF NOT EXISTS v_matrix_health_summary AS
SELECT 
  MAX(check_timestamp) as last_check,
  AVG(health_score) as avg_health_score,
  AVG(data_completeness) as avg_data_completeness,
  AVG(permission_coverage) as avg_permission_coverage,
  AVG(agent_data_quality) as avg_agent_data_quality
FROM matrix_health_logs;

CREATE VIEW IF NOT EXISTS v_agent_permissions_matrix AS
SELECT 
  ac.agent_id,
  ac.status as agent_status,
  ac.permissions,
  ac.commission_rates,
  COUNT(cc.customer_id) as total_customers,
  SUM(CASE WHEN cc.status = 'active' THEN 1 ELSE 0 END) as active_customers
FROM agent_configs ac
LEFT JOIN customer_configs cc ON ac.agent_id = cc.agent_id
GROUP BY ac.agent_id, ac.status, ac.permissions, ac.commission_rates;
