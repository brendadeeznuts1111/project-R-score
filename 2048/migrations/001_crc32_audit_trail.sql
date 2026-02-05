-- CRC32 Audit Trail Schema
-- Enhanced with proper defaults and constraints

CREATE TABLE IF NOT EXISTS crc32_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  original_crc32 BIGINT NOT NULL,
  computed_crc32 BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'invalid', 'corrupted')),
  confidence_score DECIMAL(5,4) DEFAULT 1.0000,
  verification_method VARCHAR(50) DEFAULT 'hardware',
  processing_time_ms INTEGER,
  bytes_processed BIGINT NOT NULL,
  error_details JSONB,

  -- Audit fields with defaults
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by VARCHAR(100) DEFAULT current_user,
  batch_id UUID DEFAULT gen_random_uuid(),
  retry_count INTEGER DEFAULT 0,

  -- Performance metrics
  throughput_mbps DECIMAL(10,2) DEFAULT 0.00,
  hardware_utilized BOOLEAN DEFAULT true,
  simd_instructions INTEGER DEFAULT 0,

  -- Constraints
  CONSTRAINT crc32_no_null_values CHECK (
    original_crc32 IS NOT NULL AND
    computed_crc32 IS NOT NULL AND
    bytes_processed IS NOT NULL
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crc32_entity ON crc32_audit(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crc32_status ON crc32_audit(status, created_at);
CREATE INDEX IF NOT EXISTS idx_crc32_batch ON crc32_audit(batch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_crc32_performance ON crc32_audit(throughput_mbps DESC, processing_time_ms ASC);

-- Sample data for testing
INSERT INTO crc32_audit (
  entity_type,
  entity_id,
  original_crc32,
  computed_crc32,
  status,
  confidence_score,
  verification_method,
  processing_time_ms,
  bytes_processed,
  throughput_mbps,
  hardware_utilized,
  simd_instructions
) VALUES
(
  'dataset',
  'test-001',
  2898234923,
  2898234923,
  'valid',
  1.0000,
  'hardware',
  12,
  1048576,
  87.38,
  true,
  1024
),
(
  'archive',
  'benchmark-001',
  1234567890,
  1234567890,
  'valid',
  0.9999,
  'hardware',
  45,
  5242880,
  116.51,
  true,
  4096
);
