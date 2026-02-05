-- Fire22 Agent Management Schema
-- Comprehensive agent configuration and management system

-- Agents table - Core agent information
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT UNIQUE NOT NULL,
  master_agent_id TEXT,
  agent_name TEXT NOT NULL,
  agent_type TEXT CHECK(agent_type IN ('super', 'master', 'agent', 'player')) DEFAULT 'agent',
  status TEXT CHECK(status IN ('active', 'inactive', 'suspended', 'pending')) DEFAULT 'pending',
  
  -- Betting configuration
  can_place_bet BOOLEAN DEFAULT 0,
  can_create_subagents BOOLEAN DEFAULT 0,
  max_bet_amount DECIMAL(15,2) DEFAULT 0,
  min_bet_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Commission rates
  internet_rate DECIMAL(5,2) DEFAULT 0.00,
  casino_rate DECIMAL(5,2) DEFAULT 0.00,
  sports_rate DECIMAL(5,2) DEFAULT 0.00,
  lottery_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- Credit limits
  credit_limit DECIMAL(15,2) DEFAULT 0,
  outstanding_credit DECIMAL(15,2) DEFAULT 0,
  available_credit DECIMAL(15,2) DEFAULT 0,
  
  -- Contact information
  email TEXT,
  phone TEXT,
  telegram_id TEXT,
  
  -- Security
  password_hash TEXT NOT NULL,
  secret_key TEXT,
  last_login_at TEXT,
  login_attempts INTEGER DEFAULT 0,
  locked_until TEXT,
  
  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  activated_at TEXT,
  
  FOREIGN KEY (master_agent_id) REFERENCES agents (agent_id) ON DELETE SET NULL
);

-- Agent permissions - Granular permission management
CREATE TABLE IF NOT EXISTS agent_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  permission_name TEXT NOT NULL,
  permission_value BOOLEAN DEFAULT 0,
  granted_by TEXT,
  granted_at TEXT DEFAULT (datetime('now')),
  
  UNIQUE(agent_id, permission_name),
  FOREIGN KEY (agent_id) REFERENCES agents (agent_id) ON DELETE CASCADE
);

-- Agent configuration history - Track configuration changes
CREATE TABLE IF NOT EXISTS agent_config_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  changed_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (agent_id) REFERENCES agents (agent_id) ON DELETE CASCADE
);

-- Agent sessions - Track active sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  
  FOREIGN KEY (agent_id) REFERENCES agents (agent_id) ON DELETE CASCADE
);

-- Agent financial transactions
CREATE TABLE IF NOT EXISTS agent_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT UNIQUE NOT NULL,
  agent_id TEXT NOT NULL,
  transaction_type TEXT CHECK(transaction_type IN ('credit', 'debit', 'commission', 'bonus', 'penalty')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_id TEXT,
  processed_by TEXT,
  status TEXT CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT,
  
  FOREIGN KEY (agent_id) REFERENCES agents (agent_id) ON DELETE CASCADE
);

-- Insert default permissions for BLAKE
INSERT OR IGNORE INTO agent_permissions (agent_id, permission_name, permission_value) VALUES
('BLAKE', 'place_bet', 1),
('BLAKE', 'view_reports', 1),
('BLAKE', 'manage_players', 1);

-- Insert default permissions for DAKO
INSERT OR IGNORE INTO agent_permissions (agent_id, permission_name, permission_value) VALUES
('DAKO', 'place_bet', 1),
('DAKO', 'view_reports', 1),
('DAKO', 'manage_players', 1);

-- Insert default permissions for SCRAM
INSERT OR IGNORE INTO agent_permissions (agent_id, permission_name, permission_value) VALUES
('SCRAM', 'place_bet', 1),
('SCRAM', 'view_reports', 1),
('SCRAM', 'manage_players', 1);

-- Insert default permissions for SPEN
INSERT OR IGNORE INTO agent_permissions (agent_id, permission_name, permission_value) VALUES
('SPEN', 'place_bet', 1),
('SPEN', 'view_reports', 1),
('SPEN', 'manage_players', 1);

-- Update or insert agents with proper configuration
INSERT OR REPLACE INTO agents (
  agent_id, agent_name, agent_type, status, can_place_bet, 
  internet_rate, casino_rate, sports_rate, credit_limit,
  password_hash, created_at, updated_at, activated_at
) VALUES 
('BLAKE', 'Blake Agent', 'agent', 'active', 1, 2.50, 2.00, 3.00, 50000.00, '$2b$12$example-hash', datetime('now'), datetime('now'), datetime('now')),
('DAKO', 'Dako Agent', 'agent', 'active', 1, 2.25, 1.75, 2.75, 40000.00, '$2b$12$example-hash', datetime('now'), datetime('now'), datetime('now')),
('SCRAM', 'Scram Agent', 'agent', 'active', 1, 2.00, 1.50, 2.50, 35000.00, '$2b$12$example-hash', datetime('now'), datetime('now'), datetime('now')),
('SPEN', 'Spen Agent', 'agent', 'active', 1, 2.75, 2.25, 3.25, 60000.00, '$2b$12$example-hash', datetime('now'), datetime('now'), datetime('now'));

-- Create views for easier querying
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
  COUNT(sub.agent_id) as sub_agent_count
FROM agents a
LEFT JOIN agents sub ON a.agent_id = sub.master_agent_id
GROUP BY a.agent_id;

-- Agent performance view
CREATE VIEW IF NOT EXISTS agent_performance AS
SELECT 
  a.agent_id,
  a.agent_name,
  COUNT(t.id) as total_transactions,
  SUM(CASE WHEN t.transaction_type = 'commission' THEN t.amount ELSE 0 END) as total_commission,
  SUM(CASE WHEN t.transaction_type = 'credit' THEN t.amount ELSE 0 END) as total_credits,
  SUM(CASE WHEN t.transaction_type = 'debit' THEN t.amount ELSE 0 END) as total_debits,
  MAX(t.created_at) as last_transaction_at
FROM agents a
LEFT JOIN agent_transactions t ON a.agent_id = t.agent_id
WHERE t.status = 'completed'
GROUP BY a.agent_id;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_master ON agents(master_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_updated ON agents(updated_at);
CREATE INDEX IF NOT EXISTS idx_permissions_agent ON agent_permissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_config_history_agent ON agent_config_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_config_history_date ON agent_config_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON agent_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_transactions_agent ON agent_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON agent_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON agent_transactions(created_at);

-- Triggers for maintaining updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_agents_timestamp 
  AFTER UPDATE ON agents
  FOR EACH ROW
BEGIN
  UPDATE agents SET updated_at = datetime('now') WHERE agent_id = NEW.agent_id;
END;