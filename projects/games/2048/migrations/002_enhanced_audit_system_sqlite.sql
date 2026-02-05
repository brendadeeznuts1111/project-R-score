-- Enhanced CRC32 Audit Trail System Schema for SQLite
-- Supports self-healing, ML analytics, and real-time monitoring

-- Enhanced CRC32 Audit Table with additional ML and self-healing fields
CREATE TABLE IF NOT EXISTS crc32_audit_enhanced (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    original_crc32 INTEGER NOT NULL,
    computed_crc32 INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'pending', 'error')),
    confidence_score REAL DEFAULT 0.8000,
    verification_method TEXT DEFAULT 'software' CHECK (verification_method IN ('hardware', 'software', 'simd')),
    processing_time_ms REAL DEFAULT 0.000,
    bytes_processed INTEGER DEFAULT 0,
    hardware_utilized INTEGER DEFAULT 0 CHECK (hardware_utilized IN (0, 1)),
    throughput_mbps REAL DEFAULT 0.000000,
    simd_instructions INTEGER DEFAULT NULL, -- NULL for non-SIMD operations
    batch_id TEXT DEFAULT NULL,
    chunk_index INTEGER DEFAULT NULL,
    retry_count INTEGER DEFAULT 0,
    error_details TEXT DEFAULT NULL,
    prediction_confidence REAL DEFAULT NULL, -- ML prediction confidence
    anomaly_score REAL DEFAULT NULL, -- ML anomaly detection score
    self_healing_applied INTEGER DEFAULT 0 CHECK (self_healing_applied IN (0, 1)),
    healing_correction TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Real-time Audit Table for streaming data
CREATE TABLE IF NOT EXISTS crc32_audit_realtime (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    original_crc32 INTEGER NOT NULL,
    computed_crc32 INTEGER NOT NULL,
    status TEXT NOT NULL,
    confidence_score REAL DEFAULT 0.8000,
    verification_method TEXT DEFAULT 'software',
    processing_time_ms REAL DEFAULT 0.000,
    bytes_processed INTEGER DEFAULT 0,
    hardware_utilized INTEGER DEFAULT 0,
    throughput_mbps REAL DEFAULT 0.000000,
    simd_instructions INTEGER DEFAULT NULL,
    batch_id TEXT DEFAULT NULL,
    retry_count INTEGER DEFAULT 0,
    error_details TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Batch Processing Table
CREATE TABLE IF NOT EXISTS crc32_batches_enhanced (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    total_items INTEGER NOT NULL,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress_percent INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    estimated_duration_ms INTEGER DEFAULT NULL,
    actual_duration_ms INTEGER DEFAULT NULL,
    hardware_detected INTEGER DEFAULT 0 CHECK (hardware_detected IN (0, 1)),
    simd_supported INTEGER DEFAULT 0 CHECK (simd_supported IN (0, 1)),
    optimal_chunk_size INTEGER DEFAULT 100,
    optimal_concurrency INTEGER DEFAULT 4,
    avg_throughput_mbps REAL DEFAULT 0.000000,
    total_bytes_processed INTEGER DEFAULT 0,
    avg_confidence_score REAL DEFAULT 0.8000,
    hardware_utilization_rate REAL DEFAULT 0.0000,
    ml_predictions TEXT DEFAULT NULL, -- Store ML model predictions as JSON
    self_healing_enabled INTEGER DEFAULT 0 CHECK (self_healing_enabled IN (0, 1)),
    healing_attempts INTEGER DEFAULT 0,
    healing_successes INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System Configuration Table for self-healing
CREATE TABLE IF NOT EXISTS system_configurations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT DEFAULT NULL,
    updated_by TEXT DEFAULT 'system'
);

-- Healing Logs Table
CREATE TABLE IF NOT EXISTS healing_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    healing_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    issues_detected INTEGER DEFAULT 0,
    issues_resolved INTEGER DEFAULT 0,
    system_health_score REAL DEFAULT 0.0000,
    corrections_applied TEXT DEFAULT NULL,
    healing_duration_ms INTEGER DEFAULT NULL,
    auto_healing INTEGER DEFAULT 1 CHECK (auto_healing IN (0, 1)),
    success_rate REAL DEFAULT 0.0000
);

-- ML Model Performance Tracking
CREATE TABLE IF NOT EXISTS ml_model_performance (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    model_name TEXT NOT NULL,
    model_type TEXT NOT NULL,
    accuracy REAL DEFAULT 0.0000,
    precision_score REAL DEFAULT 0.0000,
    recall_score REAL DEFAULT 0.0000,
    f1_score REAL DEFAULT 0.0000,
    training_samples INTEGER DEFAULT 0,
    validation_samples INTEGER DEFAULT 0,
    last_trained DATETIME DEFAULT CURRENT_TIMESTAMP,
    model_version TEXT DEFAULT '1.0',
    features TEXT DEFAULT NULL, -- JSON array
    hyperparameters TEXT DEFAULT NULL -- JSON object
);

-- Anomaly Detection Results
CREATE TABLE IF NOT EXISTS anomaly_detection_results (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    detection_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metric_name TEXT NOT NULL,
    observed_value REAL NOT NULL,
    expected_range TEXT NOT NULL, -- JSON [min, max]
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    anomaly_score REAL NOT NULL,
    confidence REAL DEFAULT 0.8000,
    recommendation TEXT DEFAULT NULL,
    entity_type TEXT DEFAULT NULL,
    entity_id TEXT DEFAULT NULL,
    resolved INTEGER DEFAULT 0 CHECK (resolved IN (0, 1)),
    resolution_method TEXT DEFAULT NULL,
    resolved_at DATETIME DEFAULT NULL
);

-- Performance Metrics Aggregation Table
CREATE TABLE IF NOT EXISTS performance_metrics_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour_timestamp DATETIME NOT NULL,
    entity_type TEXT DEFAULT 'all',
    total_operations INTEGER DEFAULT 0,
    successful_operations INTEGER DEFAULT 0,
    failed_operations INTEGER DEFAULT 0,
    avg_throughput_mbps REAL DEFAULT 0.000000,
    max_throughput_mbps REAL DEFAULT 0.000000,
    min_throughput_mbps REAL DEFAULT 0.000000,
    avg_latency_ms REAL DEFAULT 0.000,
    max_latency_ms REAL DEFAULT 0.000,
    min_latency_ms REAL DEFAULT 0.000,
    hardware_utilization_rate REAL DEFAULT 0.0000,
    avg_confidence_score REAL DEFAULT 0.8000,
    total_bytes_processed INTEGER DEFAULT 0,
    unique_entities INTEGER DEFAULT 0,
    batch_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hour_timestamp, entity_type)
);

-- Reprocessing Queue for failed items
CREATE TABLE IF NOT EXISTS reprocessing_queue (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    original_data TEXT DEFAULT NULL, -- JSON
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    reason TEXT DEFAULT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    queued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processing_started_at DATETIME DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    enhanced_validation INTEGER DEFAULT 0 CHECK (enhanced_validation IN (0, 1)),
    healing_correlation_id TEXT DEFAULT NULL
);

-- Real-time Metrics for Dashboard
CREATE TABLE IF NOT EXISTS realtime_metrics (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    metric_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    current_throughput_mbps REAL DEFAULT 0.000000,
    current_latency_ms REAL DEFAULT 0.000,
    active_batches INTEGER DEFAULT 0,
    queue_size INTEGER DEFAULT 0,
    error_rate REAL DEFAULT 0.0000,
    hardware_utilization REAL DEFAULT 0.0000,
    system_health_score REAL DEFAULT 0.0000,
    alerts_active INTEGER DEFAULT 0,
    healing_in_progress INTEGER DEFAULT 0 CHECK (healing_in_progress IN (0, 1))
);

-- Indexes for Performance Optimization

-- Enhanced audit table indexes
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_entity ON crc32_audit_enhanced(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_batch ON crc32_audit_enhanced(batch_id);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_status ON crc32_audit_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_created_at ON crc32_audit_enhanced(created_at);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_throughput ON crc32_audit_enhanced(throughput_mbps);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_anomaly ON crc32_audit_enhanced(anomaly_score) WHERE anomaly_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_healing ON crc32_audit_enhanced(self_healing_applied) WHERE self_healing_applied = 1;

-- Real-time audit table indexes
CREATE INDEX IF NOT EXISTS idx_crc32_audit_realtime_created_at ON crc32_audit_realtime(created_at);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_realtime_entity ON crc32_audit_realtime(entity_type, entity_id);

-- Enhanced batches table indexes
CREATE INDEX IF NOT EXISTS idx_crc32_batches_enhanced_status ON crc32_batches_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_crc32_batches_enhanced_created_at ON crc32_batches_enhanced(started_at);
CREATE INDEX IF NOT EXISTS idx_crc32_batches_enhanced_healing ON crc32_batches_enhanced(self_healing_enabled) WHERE self_healing_enabled = 1;

-- System configurations index
CREATE INDEX IF NOT EXISTS idx_system_configurations_key ON system_configurations(key);

-- Healing logs indexes
CREATE INDEX IF NOT EXISTS idx_healing_logs_timestamp ON healing_logs(healing_timestamp);
CREATE INDEX IF NOT EXISTS idx_healing_logs_success_rate ON healing_logs(success_rate);

-- ML model performance indexes
CREATE INDEX IF NOT EXISTS idx_ml_model_performance_name ON ml_model_performance(model_name);
CREATE INDEX IF NOT EXISTS idx_ml_model_performance_trained ON ml_model_performance(last_trained);

-- Anomaly detection indexes
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_timestamp ON anomaly_detection_results(detection_timestamp);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_severity ON anomaly_detection_results(severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_resolved ON anomaly_detection_results(resolved) WHERE resolved = 0;

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_hourly_timestamp ON performance_metrics_hourly(hour_timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_hourly_entity ON performance_metrics_hourly(entity_type);

-- Reprocessing queue indexes
CREATE INDEX IF NOT EXISTS idx_reprocessing_queue_status ON reprocessing_queue(status);
CREATE INDEX IF NOT EXISTS idx_reprocessing_queue_priority ON reprocessing_queue(priority);
CREATE INDEX IF NOT EXISTS idx_reprocessing_queue_queued_at ON reprocessing_queue(queued_at);

-- Real-time metrics indexes
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_timestamp ON realtime_metrics(metric_timestamp);

-- Triggers for Automatic Updates (SQLite compatible)

-- Update updated_at timestamp for enhanced audit table
CREATE TRIGGER IF NOT EXISTS update_crc32_audit_enhanced_updated_at
    AFTER UPDATE ON crc32_audit_enhanced
    FOR EACH ROW
    BEGIN
        UPDATE crc32_audit_enhanced SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_crc32_batches_enhanced_updated_at
    AFTER UPDATE ON crc32_batches_enhanced
    FOR EACH ROW
    BEGIN
        UPDATE crc32_batches_enhanced SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Trigger to update batch progress automatically
CREATE TRIGGER IF NOT EXISTS update_batch_progress_on_audit_insert
    AFTER INSERT ON crc32_audit_enhanced
    FOR EACH ROW
    WHEN NEW.batch_id IS NOT NULL
    BEGIN
        UPDATE crc32_batches_enhanced
        SET
            processed_items = (
                SELECT COUNT(*) FROM crc32_audit_enhanced
                WHERE batch_id = NEW.batch_id
            ),
            successful_items = (
                SELECT COUNT(*) FROM crc32_audit_enhanced
                WHERE batch_id = NEW.batch_id AND status = 'valid'
            ),
            failed_items = (
                SELECT COUNT(*) FROM crc32_audit_enhanced
                WHERE batch_id = NEW.batch_id AND status != 'valid'
            ),
            progress_percent = CASE
                WHEN (SELECT COUNT(*) FROM crc32_audit_enhanced WHERE batch_id = NEW.batch_id) > 0
                THEN CAST((SELECT COUNT(*) FROM crc32_audit_enhanced WHERE batch_id = NEW.batch_id) AS REAL) * 100 /
                     (SELECT total_items FROM crc32_batches_enhanced WHERE id = NEW.batch_id)
                ELSE 0
            END
        WHERE id = NEW.batch_id;
    END;

-- Views for Common Queries (SQLite compatible)

-- Enhanced performance dashboard view
CREATE VIEW IF NOT EXISTS v_performance_dashboard AS
SELECT
    datetime(created_at, 'start of hour') as hour,
    entity_type,
    COUNT(*) as total_operations,
    SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as successful_operations,
    SUM(CASE WHEN status != 'valid' THEN 1 ELSE 0 END) as failed_operations,
    AVG(throughput_mbps) as avg_throughput_mbps,
    MAX(throughput_mbps) as max_throughput_mbps,
    AVG(processing_time_ms) as avg_latency_ms,
    AVG(CASE WHEN hardware_utilized = 1 THEN 1 ELSE 0 END) as hardware_utilization_rate,
    AVG(confidence_score) as avg_confidence_score,
    SUM(bytes_processed) as total_bytes_processed,
    COUNT(DISTINCT entity_id) as unique_entities
FROM crc32_audit_enhanced
WHERE created_at >= datetime('now', '-24 hours')
GROUP BY datetime(created_at, 'start of hour'), entity_type
ORDER BY hour DESC, entity_type;

-- System health overview view
CREATE VIEW IF NOT EXISTS v_system_health AS
SELECT
    (SELECT COUNT(*) FROM crc32_audit_enhanced WHERE created_at >= datetime('now', '-5 minutes')) as recent_operations,
    (SELECT AVG(throughput_mbps) FROM crc32_audit_enhanced WHERE created_at >= datetime('now', '-5 minutes') AND throughput_mbps IS NOT NULL) as current_throughput,
    (SELECT AVG(processing_time_ms) FROM crc32_audit_enhanced WHERE created_at >= datetime('now', '-5 minutes') AND processing_time_ms IS NOT NULL) as current_latency,
    (SELECT CAST(SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) FROM crc32_audit_enhanced WHERE created_at >= datetime('now', '-5 minutes')) as integrity_rate,
    (SELECT COUNT(*) FROM anomaly_detection_results WHERE resolved = 0) as active_anomalies,
    (SELECT COUNT(*) FROM reprocessing_queue WHERE status = 'pending') as queue_size,
    (SELECT COUNT(*) FROM crc32_batches_enhanced WHERE status = 'processing') as active_batches,
    (SELECT success_rate FROM healing_logs ORDER BY healing_timestamp DESC LIMIT 1) as last_healing_success_rate;

-- Initialize default system configurations
INSERT OR IGNORE INTO system_configurations (key, value, reason) VALUES
    ('hardware_acceleration', 'true', 'Default: Enable hardware acceleration for performance'),
    ('simd_processing', 'true', 'Default: Enable SIMD processing when available'),
    ('optimal_batch_size', '1000', 'Default: Optimal batch size for processing'),
    ('self_healing_enabled', 'true', 'Default: Enable automatic self-healing'),
    ('anomaly_detection_threshold', '3.0', 'Default: Z-score threshold for anomaly detection'),
    ('ml_prediction_enabled', 'true', 'Default: Enable ML-based predictions'),
    ('real_time_monitoring', 'true', 'Default: Enable real-time monitoring');

-- Initialize ML model records
INSERT OR IGNORE INTO ml_model_performance (model_name, model_type, accuracy, features) VALUES
    ('throughput_prediction', 'linear_regression', 0.8700, '["entity_size", "hardware_acceleration", "simd_enabled", "chunk_size"]'),
    ('optimal_chunk_size', 'random_forest', 0.9200, '["entity_size", "entity_type", "hardware_capability", "latency_requirement"]'),
    ('anomaly_detection', 'neural_network', 0.9400, '["throughput", "latency", "cpu_usage", "memory_usage", "error_rate"]');
