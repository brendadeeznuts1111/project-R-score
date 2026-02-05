-- Phase 3: Critical Operations Schema
-- Withdrawals, Manual Wagers, Risk Dashboard, Customer Service

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL DEFAULT 'bank_transfer', -- bank_transfer, venmo, paypal, cashapp, cash, transfer
  payment_type TEXT NOT NULL DEFAULT 'bank_transfer', -- Specific payment method
  payment_details TEXT, -- Payment-specific details (username, account, etc.)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  requested_by TEXT NOT NULL, -- User ID who requested
  approved_by TEXT, -- User ID who approved
  notes TEXT,
  approval_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES players(customer_id),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Customer notes table for service history
CREATE TABLE IF NOT EXISTS customer_notes (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  note TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- general, account, limits, complaint, etc.
  agent_id TEXT NOT NULL, -- User ID who created the note
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES players(customer_id),
  FOREIGN KEY (agent_id) REFERENCES users(id)
);

-- Enhanced transactions table (if not exists)
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  transaction_type TEXT NOT NULL, -- deposit, withdrawal, wager, payout, adjustment
  agent_id TEXT,
  notes TEXT,
  reference_id TEXT, -- Link to wager, withdrawal, etc.
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES players(customer_id),
  FOREIGN KEY (agent_id) REFERENCES users(id)
);

-- Add missing columns to existing tables if they don't exist
-- Note: These may fail if columns already exist, which is fine

-- Add withdrawal tracking to players
ALTER TABLE players ADD COLUMN total_withdrawals REAL DEFAULT 0;
ALTER TABLE players ADD COLUMN last_withdrawal TEXT;

-- Add telegram integration fields
ALTER TABLE players ADD COLUMN telegram_username TEXT;
ALTER TABLE players ADD COLUMN telegram_id TEXT;
ALTER TABLE players ADD COLUMN telegram_group_id TEXT;
ALTER TABLE players ADD COLUMN telegram_chat_id TEXT;

-- Add risk management fields to wagers
ALTER TABLE wagers ADD COLUMN risk_category TEXT DEFAULT 'normal'; -- normal, high, alert
ALTER TABLE wagers ADD COLUMN manual_entry INTEGER DEFAULT 0; -- 1 if manually created

-- Add customer service fields to players
ALTER TABLE players ADD COLUMN account_status TEXT DEFAULT 'active'; -- active, suspended, closed
ALTER TABLE players ADD COLUMN last_note_date TEXT;
ALTER TABLE players ADD COLUMN service_level TEXT DEFAULT 'standard'; -- standard, vip, restricted

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_withdrawals_customer_id ON withdrawals(customer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_at ON customer_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_notes_category ON customer_notes(category);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wagers_risk_category ON wagers(risk_category);
CREATE INDEX IF NOT EXISTS idx_wagers_manual_entry ON wagers(manual_entry);
CREATE INDEX IF NOT EXISTS idx_players_account_status ON players(account_status);

-- Sample data for testing (optional)
-- INSERT INTO customer_notes (id, customer_id, note, category, agent_id)
-- VALUES 
--   ('note1', 'BBS112', 'Customer called about withdrawal delay', 'account', 'admin'),
--   ('note2', 'BBS113', 'Increased wager limit per request', 'limits', 'admin'),
--   ('note3', 'BBS114', 'VIP customer - expedite all requests', 'general', 'admin');

-- Business rules documentation:
-- 
-- WITHDRAWAL WORKFLOW:
-- 1. Customer/Agent requests withdrawal (pending)
-- 2. Manager approves/rejects (approved/rejected)
-- 3. Finance completes payment (completed)
-- 
-- MANUAL WAGER RULES:
-- - Only agents can create manual wagers
-- - Must verify customer limits before creation
-- - Automatically marked as phone bet
-- 
-- RISK CATEGORIES:
-- - normal: Standard wagers under limits
-- - high: Large wagers or unusual patterns
-- - alert: Requires immediate attention
-- 
-- CUSTOMER SERVICE LEVELS:
-- - standard: Regular customers
-- - vip: High-value customers
-- - restricted: Limited account access
