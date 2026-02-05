-- Update database schema to match Fire22 structure

-- Add new columns to players table to match Fire22 data
ALTER TABLE players ADD COLUMN credit_limit INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN wager_limit INTEGER DEFAULT 100000;
ALTER TABLE players ADD COLUMN casino_balance INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN freeplay_balance INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN agent_id TEXT DEFAULT '';
ALTER TABLE players ADD COLUMN master_agent TEXT DEFAULT '';
ALTER TABLE players ADD COLUMN casino_active INTEGER DEFAULT 1;
ALTER TABLE players ADD COLUMN sportsbook_active INTEGER DEFAULT 1;
ALTER TABLE players ADD COLUMN notes TEXT DEFAULT '';
ALTER TABLE players ADD COLUMN email TEXT DEFAULT '';

-- Create agents table for hierarchy management
CREATE TABLE IF NOT EXISTS agents (
  agent_id TEXT PRIMARY KEY,
  agent_name TEXT,
  agent_type TEXT, -- 'M' for Master, 'A' for Agent
  parent_agent TEXT,
  master_agent TEXT,
  active INTEGER DEFAULT 1,
  created_date TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert agent hierarchy data
INSERT OR REPLACE INTO agents (agent_id, agent_name, agent_type, parent_agent, master_agent) VALUES
('CSCALVIN', 'Master Agent Calvin', 'M', NULL, 'CSCALVIN'),
('CSMIYUKI', 'Agent Miyuki', 'A', 'CSCALVIN', 'CSCALVIN'),
('CSMARIANA', 'Agent Mariana', 'A', 'CSMIYUKI', 'CSCALVIN'),
('CSMARCUS', 'Agent Marcus', 'A', 'CSMARIANA', 'CSCALVIN'),
('BLAKEPPH2', 'Agent Blake PPH2', 'A', 'CSMARCUS', 'CSCALVIN'),
('VALL', 'Agent Vall', 'A', 'BLAKEPPH2', 'CSCALVIN'),
('BLAKEPPH', 'Agent Blake PPH', 'A', 'CSMARCUS', 'CSCALVIN');

-- Create customer_activity table for tracking
CREATE TABLE IF NOT EXISTS customer_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT,
  activity_type TEXT, -- 'login', 'wager', 'deposit', 'withdrawal'
  activity_date TEXT DEFAULT CURRENT_TIMESTAMP,
  amount INTEGER DEFAULT 0,
  description TEXT,
  ip_address TEXT
);

-- Create wager_limits table
CREATE TABLE IF NOT EXISTS wager_limits (
  customer_id TEXT PRIMARY KEY,
  parlay_max_bet INTEGER DEFAULT 0,
  parlay_max_payout INTEGER DEFAULT 2500000,
  teaser_max_bet INTEGER DEFAULT 0,
  contest_max_bet INTEGER DEFAULT 0,
  max_contest_price INTEGER DEFAULT 10000,
  max_prop_payout INTEGER DEFAULT 10000,
  max_soccer_bet INTEGER DEFAULT 0,
  max_money_line INTEGER DEFAULT 0
);

-- Insert wager limits for imported customers
INSERT OR REPLACE INTO wager_limits (customer_id, parlay_max_payout, max_contest_price, max_prop_payout) 
SELECT customer_id, 2500000, 10000, 10000 FROM players WHERE customer_id LIKE 'BBS%' OR customer_id LIKE 'DD%';
