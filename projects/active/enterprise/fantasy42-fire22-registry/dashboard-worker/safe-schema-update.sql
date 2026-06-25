-- Safe schema update - only add missing columns

-- Add missing columns to players table (skip agent_id as it exists)
ALTER TABLE players ADD COLUMN credit_limit INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN wager_limit INTEGER DEFAULT 100000;
ALTER TABLE players ADD COLUMN casino_balance INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN freeplay_balance INTEGER DEFAULT 0;
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
