-- Fire22 Agent Management Schema - Simplified Version
-- No foreign key constraints for better D1 compatibility

-- Agents table - Core agent information
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT UNIQUE NOT NULL,
  master_agent_id TEXT,
  agent_name TEXT NOT NULL,
  agent_type TEXT DEFAULT 'agent',
  status TEXT DEFAULT 'active',
  
  -- Betting configuration
  can_place_bet INTEGER DEFAULT 1,
  can_create_subagents INTEGER DEFAULT 0,
  max_bet_amount DECIMAL(15,2) DEFAULT 10000,
  min_bet_amount DECIMAL(15,2) DEFAULT 10,
  
  -- Commission rates
  internet_rate DECIMAL(5,2) DEFAULT 2.50,
  casino_rate DECIMAL(5,2) DEFAULT 2.00,
  sports_rate DECIMAL(5,2) DEFAULT 3.00,
  lottery_rate DECIMAL(5,2) DEFAULT 1.50,
  
  -- Credit limits
  credit_limit DECIMAL(15,2) DEFAULT 50000,
  outstanding_credit DECIMAL(15,2) DEFAULT 0,
  available_credit DECIMAL(15,2) DEFAULT 50000,
  
  -- Contact information
  email TEXT,
  phone TEXT,
  telegram_id TEXT,
  
  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  activated_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- Agent permissions
CREATE TABLE IF NOT EXISTS agent_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  permission_value INTEGER DEFAULT 1,
  granted_by TEXT DEFAULT 'system',
  granted_at TEXT DEFAULT (datetime('now'))
);

-- Agent configuration history
CREATE TABLE IF NOT EXISTS agent_config_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  changed_at TEXT DEFAULT (datetime('now'))
);

-- Insert or update agents with proper configuration
INSERT OR REPLACE INTO agents (
  agent_id, agent_name, agent_type, status, can_place_bet, 
  internet_rate, casino_rate, sports_rate, credit_limit,
  created_at, updated_at, activated_at
) VALUES 
('BLAKE', 'Blake Agent', 'agent', 'active', 1, 2.50, 2.00, 3.00, 50000.00, datetime('now'), datetime('now'), datetime('now')),
('DAKO', 'Dako Agent', 'agent', 'active', 1, 2.25, 1.75, 2.75, 40000.00, datetime('now'), datetime('now'), datetime('now')),
('SCRAM', 'Scram Agent', 'agent', 'active', 1, 2.00, 1.50, 2.50, 35000.00, datetime('now'), datetime('now'), datetime('now')),
('SPEN', 'Spen Agent', 'agent', 'active', 1, 2.75, 2.25, 3.25, 60000.00, datetime('now'), datetime('now'), datetime('now'));

-- Insert default permissions for each agent
INSERT OR REPLACE INTO agent_permissions (agent_id, permission_name, permission_value) VALUES
('BLAKE', 'place_bet', 1),
('BLAKE', 'view_reports', 1),
('BLAKE', 'manage_players', 1),
('DAKO', 'place_bet', 1),
('DAKO', 'view_reports', 1),
('DAKO', 'manage_players', 1),
('SCRAM', 'place_bet', 1),
('SCRAM', 'view_reports', 1),
('SCRAM', 'manage_players', 1),
('SPEN', 'place_bet', 1),
('SPEN', 'view_reports', 1),
('SPEN', 'manage_players', 1);

-- Create view for agent summary
CREATE VIEW IF NOT EXISTS agent_summary AS
SELECT 
  a.agent_id,
  a.agent_name,
  a.master_agent_id,
  a.status,
  a.can_place_bet,
  a.internet_rate,
  a.casino_rate,
  a.sports_rate,
  a.credit_limit,
  a.outstanding_credit,
  a.available_credit,
  a.last_login_at,
  a.created_at,
  a.updated_at,
  a.activated_at,
  0 as sub_agent_count
FROM agents a;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_master ON agents(master_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_updated ON agents(updated_at);
CREATE INDEX IF NOT EXISTS idx_permissions_agent ON agent_permissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_config_history_agent ON agent_config_history(agent_id);