-- Wager Settlement System Schema for Fire22 Dashboard
-- Run this to add settlement functionality to your D1 database

-- Update wagers table with settlement fields (safe migration)
-- Check if columns exist before adding them

-- Add settlement_status if it doesn't exist
ALTER TABLE wagers ADD COLUMN settlement_status TEXT DEFAULT 'pending';

-- Add other settlement columns if they don't exist
ALTER TABLE wagers ADD COLUMN settled_by TEXT;
ALTER TABLE wagers ADD COLUMN settlement_amount REAL DEFAULT 0;
ALTER TABLE wagers ADD COLUMN settlement_notes TEXT;
ALTER TABLE wagers ADD COLUMN original_status TEXT;

-- Settlement log table for audit trail
CREATE TABLE IF NOT EXISTS settlement_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wager_number INTEGER NOT NULL,
  customer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  settlement_type TEXT NOT NULL CHECK (settlement_type IN ('win', 'loss', 'push', 'void')),
  original_amount REAL NOT NULL,
  settlement_amount REAL NOT NULL,
  balance_before REAL,
  balance_after REAL,
  settled_by TEXT NOT NULL, -- User ID who performed settlement
  settled_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT,
  ip_address TEXT,
  batch_id TEXT, -- For bulk settlements
  FOREIGN KEY (settled_by) REFERENCES users(id)
);

-- Settlement batches table for bulk operations
CREATE TABLE IF NOT EXISTS settlement_batches (
  id TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  total_wagers INTEGER NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  completed_at TEXT,
  notes TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Update user permissions for settlement operations
-- Add settlement permissions to existing roles
UPDATE users SET permissions = json_insert(permissions, '$.settlements', json_array('read', 'settle', 'void')) 
WHERE role IN ('admin', 'manager');

UPDATE users SET permissions = json_insert(permissions, '$.settlements', json_array('read')) 
WHERE role = 'agent';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wagers_settlement_status ON wagers(settlement_status);
CREATE INDEX IF NOT EXISTS idx_wagers_settled_at ON wagers(settled_at);
CREATE INDEX IF NOT EXISTS idx_wagers_settled_by ON wagers(settled_by);
CREATE INDEX IF NOT EXISTS idx_settlement_log_wager_number ON settlement_log(wager_number);
CREATE INDEX IF NOT EXISTS idx_settlement_log_customer_id ON settlement_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_settlement_log_settled_by ON settlement_log(settled_by);
CREATE INDEX IF NOT EXISTS idx_settlement_log_settled_at ON settlement_log(settled_at);
CREATE INDEX IF NOT EXISTS idx_settlement_log_batch_id ON settlement_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_created_by ON settlement_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_created_at ON settlement_batches(created_at);

-- Sample settlement data for testing (optional)
-- INSERT INTO wagers (wager_number, customer_id, agent_id, amount_wagered, to_win_amount, description, status, created_at)
-- VALUES 
--   (999001, 'TEST001', 'BLAKEPPH', 100, 190, 'Test Straight Bet - Lakers +5', 'pending', datetime('now')),
--   (999002, 'TEST001', 'BLAKEPPH', 50, 150, 'Test Parlay - 3 Team', 'pending', datetime('now')),
--   (999003, 'TEST002', 'BLAKEPPH', 200, 200, 'Test Even Money Bet', 'pending', datetime('now'));

-- Settlement business rules (documented in comments):
-- WIN: Customer receives original stake + winnings (settlement_amount = to_win_amount)
-- LOSS: Customer loses stake, no payout (settlement_amount = 0)
-- PUSH: Customer gets stake back (settlement_amount = amount_wagered)
-- VOID: Wager cancelled, stake returned (settlement_amount = amount_wagered)

-- Settlement permissions by role:
-- ADMIN: Can settle any wager, view all settlement history, perform bulk operations
-- MANAGER: Can settle wagers for their agents, view settlement history, perform bulk operations
-- AGENT: Can view settlement status of their own wagers only (read-only)
