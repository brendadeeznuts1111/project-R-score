-- Settlement tables only (safe to run multiple times)

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_settlement_log_wager_number ON settlement_log(wager_number);
CREATE INDEX IF NOT EXISTS idx_settlement_log_customer_id ON settlement_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_settlement_log_settled_by ON settlement_log(settled_by);
CREATE INDEX IF NOT EXISTS idx_settlement_log_settled_at ON settlement_log(settled_at);
CREATE INDEX IF NOT EXISTS idx_settlement_log_batch_id ON settlement_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_created_by ON settlement_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_created_at ON settlement_batches(created_at);
