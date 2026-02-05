# 🔗 Batch ID Tracing in CRC32 Audit Trail

## How `batchId` Enables Data Integrity Operations

### 📋 What is `batchId`?

`batchId` is a **UUID v4** that groups multiple CRC32 validation operations from a single bulk insert into a logical unit. It provides end-to-end traceability for data integrity operations.

### 🔄 How It Works

```typescript
// 1. Generate unique batch ID once per bulk operation
const batchId = crypto.randomUUID();

// 2. Pass batchId to each individual insert
for (const data of dataArray) {
  await crc32Helper.insertWithCRC32Validation(table, data, {
    auditTrail: true,
    batchId  // ← Same ID for all items in batch
  });
}

// 3. Each audit entry gets the same batch_id
INSERT INTO crc32_audit (
  entity_id, computed_crc32, batch_id, ...
) VALUES (
  'file-001', 0x12345678, 'a1b2c3d4-e5f6-...', ...
);
```

### 🎯 Real-World Tracing Scenarios

#### **1. Data Import Monitoring**
```sql
-- Find all files from a specific import batch
SELECT * FROM crc32_audit
WHERE batch_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ORDER BY created_at;

-- Check batch integrity
SELECT
  COUNT(*) as total_files,
  SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as valid_files,
  SUM(CASE WHEN status = 'invalid' THEN 1 ELSE 0 END) as invalid_files
FROM crc32_audit
WHERE batch_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
```

#### **2. Performance Analysis**
```sql
-- Compare throughput across batches
SELECT
  batch_id,
  COUNT(*) as file_count,
  AVG(throughput_mbps) as avg_throughput,
  AVG(processing_time_ms) as avg_latency,
  SUM(bytes_processed) as total_bytes
FROM crc32_audit
GROUP BY batch_id
ORDER BY avg_throughput DESC;
```

#### **3. Incident Response**
```sql
-- Quickly isolate problematic batch
SELECT DISTINCT batch_id, COUNT(*) as error_count
FROM crc32_audit
WHERE status = 'invalid'
GROUP BY batch_id
ORDER BY error_count DESC;

-- Get details for failed batch
SELECT entity_id, computed_crc32, error_details
FROM crc32_audit
WHERE batch_id = 'problematic-batch-id' AND status = 'invalid';
```

#### **4. Compliance Auditing**
```sql
-- Generate batch compliance report
SELECT
  batch_id,
  entity_type,
  MIN(created_at) as batch_start,
  MAX(created_at) as batch_end,
  COUNT(*) as total_validations,
  SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as valid_count,
  ROUND(
    SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END)::float /
    COUNT(*) * 100, 2
  ) as success_rate
FROM crc32_audit
WHERE created_at >= '2024-01-01'
GROUP BY batch_id, entity_type
ORDER BY batch_start DESC;
```

### 📊 Database Schema Support

```sql
-- Index for fast batch lookups
CREATE INDEX idx_crc32_batch ON crc32_audit(batch_id, created_at);

-- Constraint ensures batch tracking
ALTER TABLE crc32_audit
ADD CONSTRAINT chk_batch_not_null
CHECK (batch_id IS NOT NULL OR retry_count > 0);
```

### 🔍 Example Audit Trail

| batch_id | entity_id | status | computed_crc32 | throughput_mbps | created_at |
|----------|-----------|--------|----------------|-----------------|------------|
| `abc-123` | file-001 | valid | 0x8F7D3E2A | 245.67 | 2024-01-19 12:00:01 |
| `abc-123` | file-002 | valid | 0x4B9C1F6D | 238.91 | 2024-01-19 12:00:02 |
| `abc-123` | file-003 | invalid | 0x00000000 | 0.00 | 2024-01-19 12:00:03 |
| `def-456` | file-004 | valid | 0x7A2B9C5E | 312.45 | 2024-01-19 12:05:15 |

### 🎯 Key Benefits

1. **Complete Traceability**: Track every file from source to validation
2. **Batch Isolation**: Quickly identify which imports had issues
3. **Performance Insights**: Compare efficiency across different batches
4. **Compliance Support**: Prove data integrity for specific operations
5. **Incident Response**: Roll back or reprocess specific batches

### 🚀 Advanced Usage

#### **Batch-Level Metrics**
```sql
-- Get comprehensive batch statistics
WITH batch_stats AS (
  SELECT
    batch_id,
    COUNT(*) as total_operations,
    SUM(bytes_processed) as total_bytes,
    AVG(throughput_mbps) as avg_throughput,
    SUM(CASE WHEN hardware_utilized THEN 1 ELSE 0 END)::float / COUNT(*) as hw_utilization,
    SUM(simd_instructions) as total_simd_ops
  FROM crc32_audit
  GROUP BY batch_id
)
SELECT
  batch_id,
  total_operations,
  ROUND(total_bytes / 1024 / 1024, 2) as total_mb,
  ROUND(avg_throughput, 2) as avg_throughput_mbps,
  ROUND(hw_utilization * 100, 1) as hw_utilization_pct,
  total_simd_ops
FROM batch_stats
ORDER BY total_bytes DESC;
```

#### **Time-Series Analysis**
```sql
-- Track batch performance over time
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(DISTINCT batch_id) as batches_per_hour,
  AVG(CASE WHEN status = 'valid' THEN 1.0 ELSE 0.0 END) as success_rate,
  AVG(throughput_mbps) as avg_throughput
FROM crc32_audit
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

### 📝 Best Practices

1. **Always use batchId** for bulk operations
2. **Include meaningful entity_type** for categorization
3. **Monitor batch success rates** in real-time
4. **Set up alerts** for batch failure thresholds
5. **Archive old batch data** to maintain performance

The `batchId` transforms individual CRC32 validations into a comprehensive, traceable audit system that enables enterprise-grade data integrity management.
