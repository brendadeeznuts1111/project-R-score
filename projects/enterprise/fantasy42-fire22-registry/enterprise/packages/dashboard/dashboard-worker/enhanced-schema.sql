-- Enhanced Fire22 Agent Management Schema
-- This schema adds monitoring, alerts, and performance tracking

-- Alert definitions table
CREATE TABLE IF NOT EXISTS alert_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  alert_type TEXT NOT NULL, -- 'credit_limit', 'betting_disabled', 'performance', 'system'
  severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
  conditions TEXT NOT NULL, -- JSON object defining alert conditions
  enabled INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active alerts table
CREATE TABLE IF NOT EXISTS active_alerts (
  id TEXT PRIMARY KEY, -- UUID or generated ID
  alert_definition_id INTEGER,
  agent_id TEXT,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT, -- JSON object with additional details
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMP
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS agent_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_bets INTEGER DEFAULT 0,
  total_volume DECIMAL(15,2) DEFAULT 0.00,
  total_commission DECIMAL(15,2) DEFAULT 0.00,
  win_rate DECIMAL(5,4) DEFAULT 0.0000,
  average_bet DECIMAL(15,2) DEFAULT 0.00,
  active_players INTEGER DEFAULT 0,
  performance_score INTEGER DEFAULT 0, -- 0-100 scale
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, date)
);

-- System health checks table
CREATE TABLE IF NOT EXISTS health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_type TEXT NOT NULL, -- 'database', 'api', 'agent_config', 'performance'
  status TEXT NOT NULL, -- 'healthy', 'warning', 'critical'
  details TEXT, -- JSON object with check results
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fire22 API sync logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL, -- 'agents', 'performance', 'customers'
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  records_processed INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER
);

-- Extend existing agent_config_history with more fields
CREATE TABLE IF NOT EXISTS agent_config_history_enhanced (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  parameters TEXT, -- JSON object
  previous_values TEXT, -- JSON object with values before change
  new_values TEXT, -- JSON object with values after change
  changed_by TEXT DEFAULT 'system',
  change_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  correlation_id TEXT, -- For tracking related changes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default alert definitions
INSERT OR IGNORE INTO alert_definitions (name, description, alert_type, severity, conditions) VALUES
('High Credit Utilization', 'Alert when agent credit utilization exceeds 80%', 'credit_limit', 'warning', '{"threshold": 0.8}'),
('Critical Credit Utilization', 'Alert when agent credit utilization exceeds 95%', 'credit_limit', 'critical', '{"threshold": 0.95}'),
('Betting Disabled for Active Agent', 'Alert when an active agent has betting disabled', 'betting_disabled', 'warning', '{"status": "active", "betting": false}'),
('Low Performance Score', 'Alert when agent performance score drops below 60', 'performance', 'warning', '{"score_threshold": 60}'),
('No Recent Activity', 'Alert when agent has no activity for 7+ days', 'performance', 'info', '{"days_inactive": 7}'),
('System Database Error', 'Alert for database connectivity issues', 'system', 'critical', '{"component": "database"}'),
('Fire22 API Sync Failure', 'Alert when Fire22 API sync fails', 'system', 'critical', '{"component": "fire22_sync"}');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_active_alerts_agent ON active_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_active_alerts_status ON active_alerts(status);
CREATE INDEX IF NOT EXISTS idx_active_alerts_created ON active_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_agent_date ON agent_performance(agent_id, date);
CREATE INDEX IF NOT EXISTS idx_performance_date ON agent_performance(date);
CREATE INDEX IF NOT EXISTS idx_health_checks_type ON health_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_health_checks_created ON health_checks(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_config_history_agent ON agent_config_history_enhanced(agent_id);
CREATE INDEX IF NOT EXISTS idx_config_history_created ON agent_config_history_enhanced(created_at);

-- Views for common queries
CREATE VIEW IF NOT EXISTS agent_summary AS
SELECT 
  a.agent_id,
  a.agent_name,
  a.status,
  a.can_place_bet,
  a.internet_rate,
  a.casino_rate,
  a.sports_rate,
  a.credit_limit,
  a.outstanding_credit,
  a.available_credit,
  CASE 
    WHEN a.credit_limit > 0 THEN (a.outstanding_credit / a.credit_limit) * 100 
    ELSE 0 
  END as credit_utilization,
  COUNT(aa.id) as active_alerts,
  ap.total_volume as today_volume,
  ap.total_commission as today_commission,
  ap.performance_score,
  a.updated_at
FROM agents a
LEFT JOIN active_alerts aa ON a.agent_id = aa.agent_id AND aa.status = 'active'
LEFT JOIN agent_performance ap ON a.agent_id = ap.agent_id AND ap.date = DATE('now')
GROUP BY a.agent_id;

CREATE VIEW IF NOT EXISTS alert_summary AS
SELECT 
  alert_type,
  severity,
  COUNT(*) as alert_count,
  COUNT(DISTINCT agent_id) as affected_agents,
  MIN(created_at) as oldest_alert,
  MAX(created_at) as newest_alert
FROM active_alerts 
WHERE status = 'active'
GROUP BY alert_type, severity;

-- Sample data for testing (remove in production)
INSERT OR IGNORE INTO agent_performance (agent_id, date, total_bets, total_volume, total_commission, win_rate, performance_score) VALUES
('BLAKEPPH', DATE('now'), 150, 325000.00, 16250.00, 0.6200, 85),
('DAKOMA', DATE('now'), 120, 240000.00, 12000.00, 0.5800, 78),
('SCRAMPOST', DATE('now'), 180, 360000.00, 18000.00, 0.6500, 92),
('SPEN', DATE('now'), 160, 320000.00, 16000.00, 0.6000, 82);