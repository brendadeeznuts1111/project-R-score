-- Profile Engine History Table
-- Migration: 006_create_profile_history.sql

CREATE TABLE IF NOT EXISTS profile_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Operation types
    operation TEXT NOT NULL CHECK(operation IN (
        'create', 'query', 'update', 'progress_save', 
        'xgboost_train', 'xgboost_predict', 'xgboost_personalize',
        'redis_hll_add', 'redis_hll_count', 'redis_hll_merge',
        'r2_snapshot', 'r2_restore',
        'gnn_propagate', 'gnn_train', 'gnn_infer',
        'feature_extract', 'model_update', 'cache_invalidate',
        'create_batch'
    )),
    
    -- Timing metrics
    duration_ms REAL NOT NULL,
    cpu_time_ms REAL,
    memory_delta_bytes INTEGER,
    
    -- Success metrics
    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    
    -- Resource usage
    thread_count INTEGER,
    peak_memory_mb REAL,
    
    -- Model-specific metrics
    model_accuracy REAL,
    model_loss REAL,
    training_samples INTEGER,
    inference_latency_ms REAL,
    
    -- Personalization metrics
    personalization_score REAL,
    feature_count INTEGER,
    embedding_dimension INTEGER,
    
    -- Redis HLL metrics
    hll_cardinality_estimate INTEGER,
    hll_merge_time_ms REAL,
    
    -- R2 metrics
    r2_object_size_bytes INTEGER,
    r2_upload_time_ms REAL,
    r2_download_time_ms REAL,
    
    -- GNN metrics
    gnn_nodes INTEGER,
    gnn_edges INTEGER,
    gnn_propagation_time_ms REAL,
    
    -- Metadata
    metadata TEXT, -- JSON stored as TEXT
    tags TEXT, -- JSON array stored as TEXT
    
    -- Foreign keys
    benchmark_id INTEGER REFERENCES benchmark_history(id),
    p2p_gateway_id INTEGER REFERENCES p2p_gateway_history(id),
    
    -- Legacy fields for compatibility
    time REAL, -- Duration in ms (same as duration_ms)
    target REAL, -- Target duration
    status TEXT, -- 'pass', 'fail', 'warning'
    timestamp INTEGER, -- Unix timestamp
    category TEXT, -- 'core', 'xgboost', 'redis_hll', 'r2_snapshot', 'propagation', 'gnn', 'features'
    
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for profile operations
CREATE INDEX IF NOT EXISTS idx_profile_operation ON profile_history(operation);
CREATE INDEX IF NOT EXISTS idx_profile_created_at ON profile_history(created_at);
CREATE INDEX IF NOT EXISTS idx_profile_success ON profile_history(success);
CREATE INDEX IF NOT EXISTS idx_profile_benchmark_id ON profile_history(benchmark_id);
CREATE INDEX IF NOT EXISTS idx_profile_p2p_gateway_id ON profile_history(p2p_gateway_id);
CREATE INDEX IF NOT EXISTS idx_profile_category ON profile_history(category);
CREATE INDEX IF NOT EXISTS idx_profile_operation_timestamp ON profile_history(operation, timestamp);

-- Index for personalization score queries
CREATE INDEX IF NOT EXISTS idx_profile_personalization ON profile_history(personalization_score) WHERE personalization_score IS NOT NULL;

-- View for aggregated profile metrics
CREATE VIEW IF NOT EXISTS profile_engine_metrics AS
SELECT 
    operation,
    COUNT(*) as total_operations,
    AVG(duration_ms) as avg_duration_ms,
    AVG(personalization_score) as avg_personalization_score,
    AVG(model_accuracy) as avg_model_accuracy,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_ops,
    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_ops,
    (SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate,
    AVG(cpu_time_ms) as avg_cpu_time_ms,
    AVG(peak_memory_mb) as avg_peak_memory_mb
FROM profile_history
GROUP BY operation;

-- Table for profile engine configurations
CREATE TABLE IF NOT EXISTS profile_engine_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- XGBoost configurations
    xgboost_max_depth INTEGER DEFAULT 6,
    xgboost_learning_rate REAL DEFAULT 0.3,
    xgboost_n_estimators INTEGER DEFAULT 100,
    xgboost_objective TEXT DEFAULT 'reg:squarederror',
    
    -- Redis HLL configurations
    redis_hll_precision INTEGER DEFAULT 14,
    redis_hll_auto_merge INTEGER DEFAULT 1,
    redis_hll_merge_threshold INTEGER DEFAULT 1000,
    
    -- R2 configurations
    r2_bucket_name TEXT,
    r2_snapshot_interval_minutes INTEGER DEFAULT 60,
    r2_retention_days INTEGER DEFAULT 30,
    
    -- GNN configurations
    gnn_hidden_dim INTEGER DEFAULT 128,
    gnn_num_layers INTEGER DEFAULT 2,
    gnn_dropout_rate REAL DEFAULT 0.5,
    gnn_propagation_steps INTEGER DEFAULT 3,
    
    -- Feature configurations
    feature_cache_ttl_seconds INTEGER DEFAULT 3600,
    feature_vector_size INTEGER DEFAULT 256,
    
    -- Performance configurations
    batch_size INTEGER DEFAULT 32,
    max_concurrent_operations INTEGER DEFAULT 10,
    circuit_breaker_enabled INTEGER DEFAULT 1,
    
    config_json TEXT, -- JSON stored as TEXT
    enabled INTEGER DEFAULT 1,
    
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Insert default profile engine configuration
INSERT OR IGNORE INTO profile_engine_configs (
    xgboost_max_depth, 
    xgboost_learning_rate, 
    redis_hll_precision,
    r2_snapshot_interval_minutes,
    gnn_hidden_dim,
    enabled
) VALUES (
    6, 0.3, 14, 60, 128, 1
);
