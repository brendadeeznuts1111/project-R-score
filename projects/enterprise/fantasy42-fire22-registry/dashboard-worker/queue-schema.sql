-- Queue System Database Schema
-- This schema supports peer-to-peer matching between withdrawals and deposits

-- Queue items table (withdrawals and deposits waiting for matching)
CREATE TABLE IF NOT EXISTS queue_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('withdrawal', 'deposit')),
  customer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_type TEXT NOT NULL,
  payment_details TEXT,
  priority INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'processing', 'completed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  matched_with TEXT,
  notes TEXT,
  FOREIGN KEY (customer_id) REFERENCES players(customer_id)
);

-- Queue matches table (records of successful matches)
CREATE TABLE IF NOT EXISTS queue_matches (
  id TEXT PRIMARY KEY,
  withdrawal_id TEXT NOT NULL,
  deposit_id TEXT NOT NULL,
  amount REAL NOT NULL,
  match_score INTEGER NOT NULL,
  processing_time INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  notes TEXT,
  FOREIGN KEY (withdrawal_id) REFERENCES queue_items(id),
  FOREIGN KEY (deposit_id) REFERENCES queue_items(id)
);

-- Queue processing history table
CREATE TABLE IF NOT EXISTS queue_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_item_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status_from TEXT,
  status_to TEXT,
  processed_by TEXT,
  processed_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT,
  FOREIGN KEY (queue_item_id) REFERENCES queue_items(id),
  FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- Queue performance metrics table
CREATE TABLE IF NOT EXISTS queue_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  total_items INTEGER DEFAULT 0,
  matched_pairs INTEGER DEFAULT 0,
  average_wait_time REAL DEFAULT 0,
  processing_rate REAL DEFAULT 0,
  success_rate REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_items_type ON queue_items(type);
CREATE INDEX IF NOT EXISTS idx_queue_items_status ON queue_items(status);
CREATE INDEX IF NOT EXISTS idx_queue_items_payment_type ON queue_items(payment_type);
CREATE INDEX IF NOT EXISTS idx_queue_items_amount ON queue_items(amount);
CREATE INDEX IF NOT EXISTS idx_queue_items_created_at ON queue_items(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_items_customer_id ON queue_items(customer_id);

CREATE INDEX IF NOT EXISTS idx_queue_matches_withdrawal_id ON queue_matches(withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_queue_matches_deposit_id ON queue_matches(deposit_id);
CREATE INDEX IF NOT EXISTS idx_queue_matches_status ON queue_matches(status);
CREATE INDEX IF NOT EXISTS idx_queue_matches_created_at ON queue_matches(created_at);

CREATE INDEX IF NOT EXISTS idx_queue_history_item_id ON queue_history(queue_item_id);
CREATE INDEX IF NOT EXISTS idx_queue_history_date ON queue_history(processed_at);

CREATE INDEX IF NOT EXISTS idx_queue_metrics_date ON queue_metrics(date);

-- Views for common queries
CREATE VIEW IF NOT EXISTS v_queue_summary AS
SELECT 
  type,
  status,
  payment_type,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(created_at) as oldest_item,
  MAX(created_at) as newest_item
FROM queue_items 
GROUP BY type, status, payment_type;

CREATE VIEW IF NOT EXISTS v_matching_opportunities AS
SELECT 
  w.id as withdrawal_id,
  w.customer_id as withdrawal_customer,
  w.amount as withdrawal_amount,
  w.payment_type as withdrawal_payment_type,
  w.created_at as withdrawal_created,
  d.id as deposit_id,
  d.customer_id as deposit_customer,
  d.amount as deposit_amount,
  d.payment_type as deposit_payment_type,
  d.created_at as deposit_created,
  CASE 
    WHEN w.payment_type = d.payment_type THEN 20
    ELSE 0
  END + 
  CASE 
    WHEN ABS(w.amount - d.amount) < 10 THEN 30
    WHEN ABS(w.amount - d.amount) < 50 THEN 20
    WHEN ABS(w.amount - d.amount) < 100 THEN 10
    ELSE 0
  END +
  CASE 
    WHEN w.amount <= d.amount THEN 25
    ELSE 0
  END as match_score
FROM queue_items w
CROSS JOIN queue_items d
WHERE w.type = 'withdrawal' 
  AND d.type = 'deposit'
  AND w.status = 'pending'
  AND d.status = 'pending'
  AND w.amount <= d.amount
  AND w.payment_type = d.payment_type
ORDER BY match_score DESC, w.created_at ASC;

-- Triggers for automatic updates
CREATE TRIGGER IF NOT EXISTS tr_queue_items_status_change
AFTER UPDATE ON queue_items
WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO queue_history (queue_item_id, action, status_from, status_to, processed_at, notes)
  VALUES (NEW.id, 'status_change', OLD.status, NEW.status, datetime('now'), 
          CASE 
            WHEN NEW.matched_with IS NOT NULL THEN 'Matched with ' || NEW.matched_with
            ELSE 'Status updated'
          END);
END;

CREATE TRIGGER IF NOT EXISTS tr_queue_matches_completed
AFTER UPDATE ON queue_matches
WHEN OLD.status != 'completed' AND NEW.status = 'completed'
BEGIN
  UPDATE queue_items 
  SET status = 'completed' 
  WHERE id IN (NEW.withdrawal_id, NEW.deposit_id);
  
  INSERT INTO queue_history (queue_item_id, action, status_from, status_to, processed_at, notes)
  VALUES (NEW.withdrawal_id, 'match_completed', 'processing', 'completed', datetime('now'), 'P2P match completed');
  
  INSERT INTO queue_history (queue_item_id, action, status_from, status_to, processed_at, notes)
  VALUES (NEW.deposit_id, 'match_completed', 'processing', 'completed', datetime('now'), 'P2P match completed');
END;

-- Sample data for testing
INSERT OR IGNORE INTO queue_metrics (date, total_items, matched_pairs, average_wait_time, processing_rate, success_rate)
VALUES (date('now'), 0, 0, 0, 0, 100);

-- Business rules documentation:
-- 
-- QUEUE PRIORITY SYSTEM:
-- 1. Payment type match (highest priority)
-- 2. Amount compatibility (withdrawal <= deposit)
-- 3. Wait time (FIFO for same priority items)
-- 4. Customer verification level
-- 
-- MATCHING ALGORITHM:
-- - Perfect payment type matches get +20 points
-- - Amount differences < $10 get +30 points
-- - Amount differences < $50 get +20 points  
-- - Amount differences < $100 get +10 points
-- - Withdrawal amount <= deposit amount gets +25 points
-- - Wait time priority (older items get slight boost)
-- 
-- PROCESSING FLOW:
-- 1. Item added to queue
-- 2. Immediate matching attempt
-- 3. If matched, status changes to 'matched'
-- 4. Processing begins automatically
-- 5. Completion updates all related records
-- 6. History tracking for audit trail
