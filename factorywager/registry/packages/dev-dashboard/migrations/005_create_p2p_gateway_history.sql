-- P2P Gateway History Table
-- Migration: 005_create_p2p_gateway_history.sql

CREATE TABLE IF NOT EXISTS p2p_gateway_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gateway TEXT NOT NULL CHECK(gateway IN ('venmo', 'cashapp', 'paypal', 'zelle', 'wise', 'revolut')),
    operation TEXT NOT NULL CHECK(operation IN ('create', 'query', 'switch', 'dry-run', 'full', 'webhook', 'refund', 'dispute')),
    duration_ms REAL NOT NULL,
    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    request_size INTEGER,
    response_size INTEGER,
    endpoint TEXT,
    status_code INTEGER,
    
    -- Gateway-specific metadata
    metadata TEXT, -- JSON stored as TEXT in SQLite
    
    -- Foreign key to benchmark_history if needed
    benchmark_id INTEGER REFERENCES benchmark_history(id),
    
    -- Legacy fields for compatibility
    time REAL, -- Duration in ms (same as duration_ms)
    target REAL, -- Target duration
    status TEXT, -- 'pass', 'fail', 'warning'
    timestamp INTEGER, -- Unix timestamp
    dry_run INTEGER, -- Boolean flag
    
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_p2p_gateway ON p2p_gateway_history(gateway);
CREATE INDEX IF NOT EXISTS idx_p2p_operation ON p2p_gateway_history(operation);
CREATE INDEX IF NOT EXISTS idx_p2p_created_at ON p2p_gateway_history(created_at);
CREATE INDEX IF NOT EXISTS idx_p2p_success ON p2p_gateway_history(success);
CREATE INDEX IF NOT EXISTS idx_p2p_benchmark_id ON p2p_gateway_history(benchmark_id);

-- For gateway-specific metrics
CREATE INDEX IF NOT EXISTS idx_p2p_gateway_operation ON p2p_gateway_history(gateway, operation);
CREATE INDEX IF NOT EXISTS idx_p2p_gateway_timestamp ON p2p_gateway_history(gateway, timestamp);

-- View for aggregated P2P metrics
CREATE VIEW IF NOT EXISTS p2p_gateway_metrics AS
SELECT 
    gateway,
    operation,
    COUNT(*) as total_operations,
    AVG(duration_ms) as avg_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_ops,
    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_ops,
    (SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate
FROM p2p_gateway_history
GROUP BY gateway, operation;

-- Table for P2P gateway configurations
CREATE TABLE IF NOT EXISTS p2p_gateway_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gateway TEXT NOT NULL UNIQUE,
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    webhook_url TEXT,
    webhook_secret_encrypted TEXT,
    sandbox_mode INTEGER DEFAULT 1,
    rate_limit_per_minute INTEGER DEFAULT 60,
    
    -- Performance tuning
    timeout_ms INTEGER DEFAULT 30000,
    retry_count INTEGER DEFAULT 3,
    circuit_breaker_threshold INTEGER DEFAULT 5,
    
    config_json TEXT, -- JSON stored as TEXT
    enabled INTEGER DEFAULT 1,
    
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Insert default configurations
INSERT OR IGNORE INTO p2p_gateway_configs (gateway, sandbox_mode, enabled) VALUES
('venmo', 1, 1),
('cashapp', 1, 1),
('paypal', 1, 1),
('zelle', 1, 0),
('wise', 1, 0),
('revolut', 1, 0);
