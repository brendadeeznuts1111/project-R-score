-- Enhanced CRC32 Audit Trail System Schema
-- Supports self-healing, ML analytics, and real-time monitoring

-- Enhanced CRC32 Audit Table with additional ML and self-healing fields
CREATE TABLE IF NOT EXISTS crc32_audit_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    original_crc32 BIGINT NOT NULL,
    computed_crc32 BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('valid', 'invalid', 'pending', 'error')),
    confidence_score DECIMAL(5,4) DEFAULT 0.8000,
    verification_method VARCHAR(20) DEFAULT 'software' CHECK (verification_method IN ('hardware', 'software', 'simd')),
    processing_time_ms DECIMAL(10,3) DEFAULT 0.000,
    bytes_processed BIGINT DEFAULT 0,
    hardware_utilized BOOLEAN DEFAULT FALSE,
    throughput_mbps DECIMAL(12,6) DEFAULT 0.000000,
    simd_instructions INTEGER DEFAULT NULL, -- NULL for non-SIMD operations
    batch_id UUID DEFAULT NULL,
    chunk_index INTEGER DEFAULT NULL,
    retry_count INTEGER DEFAULT 0,
    error_details TEXT DEFAULT NULL,
    prediction_confidence DECIMAL(5,4) DEFAULT NULL, -- ML prediction confidence
    anomaly_score DECIMAL(5,4) DEFAULT NULL, -- ML anomaly detection score
    self_healing_applied BOOLEAN DEFAULT FALSE,
    healing_correction TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time Audit Table for streaming data
CREATE TABLE IF NOT EXISTS crc32_audit_realtime (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    original_crc32 BIGINT NOT NULL,
    computed_crc32 BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    confidence_score DECIMAL(5,4) DEFAULT 0.8000,
    verification_method VARCHAR(20) DEFAULT 'software',
    processing_time_ms DECIMAL(10,3) DEFAULT 0.000,
    bytes_processed BIGINT DEFAULT 0,
    hardware_utilized BOOLEAN DEFAULT FALSE,
    throughput_mbps DECIMAL(12,6) DEFAULT 0.000000,
    simd_instructions INTEGER DEFAULT NULL,
    batch_id UUID DEFAULT NULL,
    retry_count INTEGER DEFAULT 0,
    error_details TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Batch Processing Table
CREATE TABLE IF NOT EXISTS crc32_batches_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_items INTEGER NOT NULL,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress_percent INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    estimated_duration_ms INTEGER DEFAULT NULL,
    actual_duration_ms INTEGER DEFAULT NULL,
    hardware_detected BOOLEAN DEFAULT FALSE,
    simd_supported BOOLEAN DEFAULT FALSE,
    optimal_chunk_size INTEGER DEFAULT 100,
    optimal_concurrency INTEGER DEFAULT 4,
    avg_throughput_mbps DECIMAL(12,6) DEFAULT 0.000000,
    total_bytes_processed BIGINT DEFAULT 0,
    avg_confidence_score DECIMAL(5,4) DEFAULT 0.8000,
    hardware_utilization_rate DECIMAL(5,4) DEFAULT 0.0000,
    ml_predictions JSONB DEFAULT NULL, -- Store ML model predictions
    self_healing_enabled BOOLEAN DEFAULT FALSE,
    healing_attempts INTEGER DEFAULT 0,
    healing_successes INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Configuration Table for self-healing
CREATE TABLE IF NOT EXISTS system_configurations (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT DEFAULT NULL,
    updated_by VARCHAR(100) DEFAULT 'system'
);

-- Healing Logs Table
CREATE TABLE IF NOT EXISTS healing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    healing_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    issues_detected INTEGER DEFAULT 0,
    issues_resolved INTEGER DEFAULT 0,
    system_health_score DECIMAL(5,4) DEFAULT 0.0000,
    corrections_applied TEXT DEFAULT NULL,
    healing_duration_ms INTEGER DEFAULT NULL,
    auto_healing BOOLEAN DEFAULT TRUE,
    success_rate DECIMAL(5,4) DEFAULT 0.0000
);

-- ML Model Performance Tracking
CREATE TABLE IF NOT EXISTS ml_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    accuracy DECIMAL(5,4) DEFAULT 0.0000,
    precision_score DECIMAL(5,4) DEFAULT 0.0000,
    recall_score DECIMAL(5,4) DEFAULT 0.0000,
    f1_score DECIMAL(5,4) DEFAULT 0.0000,
    training_samples INTEGER DEFAULT 0,
    validation_samples INTEGER DEFAULT 0,
    last_trained TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    model_version VARCHAR(20) DEFAULT '1.0',
    features JSONB DEFAULT NULL,
    hyperparameters JSONB DEFAULT NULL
);

-- Anomaly Detection Results
CREATE TABLE IF NOT EXISTS anomaly_detection_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detection_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metric_name VARCHAR(100) NOT NULL,
    observed_value DECIMAL(15,6) NOT NULL,
    expected_range JSONB NOT NULL, -- [min, max]
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    anomaly_score DECIMAL(5,4) NOT NULL,
    confidence DECIMAL(5,4) DEFAULT 0.8000,
    recommendation TEXT DEFAULT NULL,
    entity_type VARCHAR(100) DEFAULT NULL,
    entity_id VARCHAR(255) DEFAULT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolution_method TEXT DEFAULT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Performance Metrics Aggregation Table
CREATE TABLE IF NOT EXISTS performance_metrics_hourly (
    id SERIAL PRIMARY KEY,
    hour_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    entity_type VARCHAR(100) DEFAULT 'all',
    total_operations INTEGER DEFAULT 0,
    successful_operations INTEGER DEFAULT 0,
    failed_operations INTEGER DEFAULT 0,
    avg_throughput_mbps DECIMAL(12,6) DEFAULT 0.000000,
    max_throughput_mbps DECIMAL(12,6) DEFAULT 0.000000,
    min_throughput_mbps DECIMAL(12,6) DEFAULT 0.000000,
    avg_latency_ms DECIMAL(10,3) DEFAULT 0.000,
    max_latency_ms DECIMAL(10,3) DEFAULT 0.000,
    min_latency_ms DECIMAL(10,3) DEFAULT 0.000,
    hardware_utilization_rate DECIMAL(5,4) DEFAULT 0.0000,
    avg_confidence_score DECIMAL(5,4) DEFAULT 0.8000,
    total_bytes_processed BIGINT DEFAULT 0,
    unique_entities INTEGER DEFAULT 0,
    batch_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hour_timestamp, entity_type)
);

-- Reprocessing Queue for failed items
CREATE TABLE IF NOT EXISTS reprocessing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    original_data JSONB DEFAULT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    reason TEXT DEFAULT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    enhanced_validation BOOLEAN DEFAULT FALSE,
    healing_correlation_id UUID DEFAULT NULL
);

-- Real-time Metrics for Dashboard
CREATE TABLE IF NOT EXISTS realtime_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_throughput_mbps DECIMAL(12,6) DEFAULT 0.000000,
    current_latency_ms DECIMAL(10,3) DEFAULT 0.000,
    active_batches INTEGER DEFAULT 0,
    queue_size INTEGER DEFAULT 0,
    error_rate DECIMAL(5,4) DEFAULT 0.0000,
    hardware_utilization DECIMAL(5,4) DEFAULT 0.0000,
    system_health_score DECIMAL(5,4) DEFAULT 0.0000,
    alerts_active INTEGER DEFAULT 0,
    healing_in_progress BOOLEAN DEFAULT FALSE
);

-- Indexes for Performance Optimization

-- Enhanced audit table indexes
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_entity ON crc32_audit_enhanced(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_batch ON crc32_audit_enhanced(batch_id);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_status ON crc32_audit_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_created_at ON crc32_audit_enhanced(created_at);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_throughput ON crc32_audit_enhanced(throughput_mbps);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_anomaly ON crc32_audit_enhanced(anomaly_score) WHERE anomaly_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crc32_audit_enhanced_healing ON crc32_audit_enhanced(self_healing_applied) WHERE self_healing_applied = TRUE;

-- Real-time audit table indexes
CREATE INDEX IF NOT EXISTS idx_crc32_audit_realtime_created_at ON crc32_audit_realtime(created_at);
CREATE INDEX IF NOT EXISTS idx_crc32_audit_realtime_entity ON crc32_audit_realtime(entity_type, entity_id);

-- Enhanced batches table indexes
CREATE INDEX IF NOT EXISTS idx_crc32_batches_enhanced_status ON crc32_batches_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_crc32_batches_enhanced_created_at ON crc32_batches_enhanced(started_at);
CREATE INDEX IF NOT EXISTS idx_crc32_batches_enhanced_healing ON crc32_batches_enhanced(self_healing_enabled) WHERE self_healing_enabled = TRUE;

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
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_resolved ON anomaly_detection_results(resolved) WHERE resolved = FALSE;

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_hourly_timestamp ON performance_metrics_hourly(hour_timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_hourly_entity ON performance_metrics_hourly(entity_type);

-- Reprocessing queue indexes
CREATE INDEX IF NOT EXISTS idx_reprocessing_queue_status ON reprocessing_queue(status);
CREATE INDEX IF NOT EXISTS idx_reprocessing_queue_priority ON reprocessing_queue(priority);
CREATE INDEX IF NOT EXISTS idx_reprocessing_queue_queued_at ON reprocessing_queue(queued_at);

-- Real-time metrics indexes
CREATE INDEX IF NOT EXISTS idx_realtime_metrics_timestamp ON realtime_metrics(metric_timestamp);

-- Triggers for Automatic Updates

-- Update updated_at timestamp for enhanced audit table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crc32_audit_enhanced_updated_at
    BEFORE UPDATE ON crc32_audit_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crc32_batches_enhanced_updated_at
    BEFORE UPDATE ON crc32_batches_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update batch progress automatically
CREATE OR REPLACE FUNCTION update_batch_progress_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE crc32_batches_enhanced
        SET
            processed_items = (SELECT COUNT(*) FROM crc32_audit_enhanced WHERE batch_id = NEW.batch_id),
            successful_items = (SELECT COUNT(*) FROM crc32_audit_enhanced WHERE batch_id = NEW.batch_id AND status = 'valid'),
            failed_items = (SELECT COUNT(*) FROM crc32_audit_enhanced WHERE batch_id = NEW.batch_id AND status != 'valid'),
            progress_percent = CASE
                WHEN (SELECT COUNT(*) FROM crc32_audit_enhanced WHERE batch_id = NEW.batch_id) > 0
                THEN (SELECT COUNT(*) FROM crc32_audit_enhanced WHERE batch_id = NEW.batch_id) * 100 /
                     (SELECT total_items FROM crc32_batches_enhanced WHERE id = NEW.batch_id)
                ELSE 0
            END
        WHERE id = NEW.batch_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_batch_progress_on_audit_insert
    AFTER INSERT ON crc32_audit_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_progress_trigger();

-- Trigger for automatic anomaly detection
CREATE OR REPLACE FUNCTION detect_anomalies_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple anomaly detection for throughput
    IF NEW.throughput_mbps IS NOT NULL THEN
        -- Get recent average throughput
        DECLARE
            avg_throughput DECIMAL;
            std_throughput DECIMAL;
            z_score DECIMAL;
        BEGIN
            SELECT AVG(throughput_mbps), STDDEV(throughput_mbps)
            INTO avg_throughput, std_throughput
            FROM crc32_audit_enhanced
            WHERE created_at >= NOW() - INTERVAL '1 hour'
              AND throughput_mbps IS NOT NULL;

            IF avg_throughput IS NOT NULL AND std_throughput IS NOT NULL AND std_throughput > 0 THEN
                z_score := ABS(NEW.throughput_mbps - avg_throughput) / std_throughput;

                IF z_score > 3 THEN
                    INSERT INTO anomaly_detection_results (
                        metric_name, observed_value, expected_range, severity, anomaly_score, confidence, recommendation
                    ) VALUES (
                        'throughput',
                        NEW.throughput_mbps,
                        JSONB_BUILD_ARRAY(avg_throughput - 2 * std_throughput, avg_throughput + 2 * std_throughput),
                        CASE WHEN z_score > 5 THEN 'critical' WHEN z_score > 4 THEN 'high' ELSE 'medium' END,
                        z_score::DECIMAL(5,4),
                        0.9000,
                        CASE WHEN NEW.throughput_mbps < avg_throughput
                             THEN 'Consider enabling hardware acceleration'
                             ELSE 'Verify measurement accuracy'
                        END
                    );
                END IF;
            END IF;
        END;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER detect_anomalies_on_audit_insert
    AFTER INSERT ON crc32_audit_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION detect_anomalies_trigger();

-- Views for Common Queries

-- Enhanced performance dashboard view
CREATE OR REPLACE VIEW v_performance_dashboard AS
SELECT
    DATE_TRUNC('hour', created_at) as hour,
    entity_type,
    COUNT(*) as total_operations,
    SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as successful_operations,
    SUM(CASE WHEN status != 'valid' THEN 1 ELSE 0 END) as failed_operations,
    AVG(throughput_mbps) as avg_throughput_mbps,
    MAX(throughput_mbps) as max_throughput_mbps,
    AVG(processing_time_ms) as avg_latency_ms,
    AVG(CASE WHEN hardware_utilized THEN 1 ELSE 0 END) as hardware_utilization_rate,
    AVG(confidence_score) as avg_confidence_score,
    SUM(bytes_processed) as total_bytes_processed,
    COUNT(DISTINCT entity_id) as unique_entities
FROM crc32_audit_enhanced
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), entity_type
ORDER BY hour DESC, entity_type;

-- System health overview view
CREATE OR REPLACE VIEW v_system_health AS
SELECT
    (SELECT COUNT(*) FROM crc32_audit_enhanced WHERE created_at >= NOW() - INTERVAL '5 minutes') as recent_operations,
    (SELECT AVG(throughput_mbps) FROM crc32_audit_enhanced WHERE created_at >= NOW() - INTERVAL '5 minutes' AND throughput_mbps IS NOT NULL) as current_throughput,
    (SELECT AVG(processing_time_ms) FROM crc32_audit_enhanced WHERE created_at >= NOW() - INTERVAL '5 minutes' AND processing_time_ms IS NOT NULL) as current_latency,
    (SELECT SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END)::float / COUNT(*) FROM crc32_audit_enhanced WHERE created_at >= NOW() - INTERVAL '5 minutes') as integrity_rate,
    (SELECT COUNT(*) FROM anomaly_detection_results WHERE resolved = FALSE) as active_anomalies,
    (SELECT COUNT(*) FROM reprocessing_queue WHERE status = 'pending') as queue_size,
    (SELECT COUNT(*) FROM crc32_batches_enhanced WHERE status = 'processing') as active_batches,
    (SELECT success_rate FROM healing_logs ORDER BY healing_timestamp DESC LIMIT 1) as last_healing_success_rate;

-- Initialize default system configurations
INSERT INTO system_configurations (key, value, reason) VALUES
    ('hardware_acceleration', 'true', 'Default: Enable hardware acceleration for performance'),
    ('simd_processing', 'true', 'Default: Enable SIMD processing when available'),
    ('optimal_batch_size', '1000', 'Default: Optimal batch size for processing'),
    ('self_healing_enabled', 'true', 'Default: Enable automatic self-healing'),
    ('anomaly_detection_threshold', '3.0', 'Default: Z-score threshold for anomaly detection'),
    ('ml_prediction_enabled', 'true', 'Default: Enable ML-based predictions'),
    ('real_time_monitoring', 'true', 'Default: Enable real-time monitoring')
ON CONFLICT (key) DO NOTHING;

-- Initialize ML model records
INSERT INTO ml_model_performance (model_name, model_type, accuracy, features) VALUES
    ('throughput_prediction', 'linear_regression', 0.8700, '["entity_size", "hardware_acceleration", "simd_enabled", "chunk_size"]'),
    ('optimal_chunk_size', 'random_forest', 0.9200, '["entity_size", "entity_type", "hardware_capability", "latency_requirement"]'),
    ('anomaly_detection', 'neural_network', 0.9400, '["throughput", "latency", "cpu_usage", "memory_usage", "error_rate"]')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE crc32_audit_enhanced IS 'Enhanced CRC32 audit trail with ML and self-healing support';
COMMENT ON TABLE crc32_audit_realtime IS 'Real-time audit data for streaming analytics';
COMMENT ON TABLE crc32_batches_enhanced IS 'Enhanced batch processing with ML optimization';
COMMENT ON TABLE system_configurations IS 'Dynamic system configuration for self-healing';
COMMENT ON TABLE healing_logs IS 'Audit trail for self-healing operations';
COMMENT ON TABLE ml_model_performance IS 'ML model performance tracking';
COMMENT ON TABLE anomaly_detection_results IS 'Anomaly detection results and resolutions';
COMMENT ON TABLE reprocessing_queue IS 'Queue for reprocessing failed items with enhanced validation';
