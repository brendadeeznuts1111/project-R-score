import type { SQLTemplateHelper } from "bun";

export interface PerformanceTrend {
  hour: Date;
  avg_throughput: number;
  avg_latency: number;
  total_validations: number;
  hardware_utilization_rate: number;
  avg_simd_usage: number;
}

export interface IntegritySummary {
  entity_type: string;
  total_checks: number;
  valid_count: number;
  invalid_count: number;
  avg_confidence: number;
  avg_throughput: number;
}

export interface CorruptionAlert {
  id: string;
  entity_type: string;
  entity_id: string;
  original_crc32: number;
  computed_crc32: number;
  confidence_score: number;
  error_details: any;
  created_at: Date;
}

export const crc32Analytics = {
  // Performance trends with hardware utilization
  performanceTrends: async (
    sql: SQLTemplateHelper,
    days: number = 7
  ): Promise<PerformanceTrend[]> => {
    const result = await sql`
      SELECT
        DATE_TRUNC('hour', created_at) as hour,
        AVG(throughput_mbps) as avg_throughput,
        AVG(processing_time_ms) as avg_latency,
        COUNT(*) as total_validations,
        SUM(CASE WHEN hardware_utilized THEN 1 ELSE 0 END)::float / COUNT(*) as hardware_utilization_rate,
        AVG(simd_instructions) as avg_simd_usage
      FROM crc32_audit
      WHERE created_at >= NOW() - INTERVAL ${days} days
        AND status = 'valid'
      GROUP BY hour
      ORDER BY hour DESC
      LIMIT 168
    `;

    return result as PerformanceTrend[];
  },

  // Integrity validation summary
  integritySummary: async (
    sql: SQLTemplateHelper
  ): Promise<IntegritySummary[]> => {
    const result = await sql`
      SELECT
        entity_type,
        COUNT(*) as total_checks,
        SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as valid_count,
        SUM(CASE WHEN status = 'invalid' THEN 1 ELSE 0 END) as invalid_count,
        AVG(confidence_score) as avg_confidence,
        AVG(throughput_mbps) as avg_throughput
      FROM crc32_audit
      GROUP BY entity_type
      ORDER BY total_checks DESC
    `;

    return result as IntegritySummary[];
  },

  // Corruption detection with confidence scoring
  corruptionDetection: async (
    sql: SQLTemplateHelper,
    confidenceThreshold: number = 0.95
  ): Promise<CorruptionAlert[]> => {
    const result = await sql`
      SELECT
        id,
        entity_type,
        entity_id,
        original_crc32,
        computed_crc32,
        confidence_score,
        error_details,
        created_at
      FROM crc32_audit
      WHERE status = 'invalid'
        AND confidence_score < ${confidenceThreshold}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return result as CorruptionAlert[];
  },

  // Hardware utilization metrics
  hardwareMetrics: async (
    sql: SQLTemplateHelper,
    timeRange: string = "24h"
  ): Promise<any[]> => {
    const result = await sql`
      SELECT
        DATE_TRUNC('minute', created_at) as minute,
        AVG(throughput_mbps) as avg_throughput,
        MAX(throughput_mbps) as max_throughput,
        SUM(CASE WHEN hardware_utilized THEN 1 ELSE 0 END)::float / COUNT(*) as hardware_utilization,
        AVG(simd_instructions) as avg_simd_instructions,
        COUNT(*) as total_operations
      FROM crc32_audit
      WHERE created_at >= NOW() - INTERVAL ${timeRange}
      GROUP BY minute
      ORDER BY minute DESC
      LIMIT 1440
    `;

    return result;
  },

  // Batch performance analysis
  batchAnalysis: async (sql: SQLTemplateHelper): Promise<any[]> => {
    const result = await sql`
      SELECT
        batch_id,
        COUNT(*) as operations_in_batch,
        AVG(throughput_mbps) as avg_throughput,
        AVG(processing_time_ms) as avg_processing_time,
        SUM(bytes_processed) as total_bytes,
        SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate,
        MIN(created_at) as batch_start,
        MAX(created_at) as batch_end
      FROM crc32_audit
      WHERE batch_id IS NOT NULL
      GROUP BY batch_id
      ORDER BY batch_start DESC
      LIMIT 100
    `;

    return result;
  },

  // Error pattern analysis
  errorPatterns: async (sql: SQLTemplateHelper): Promise<any[]> => {
    const result = await sql`
      SELECT
        entity_type,
        verification_method,
        status,
        COUNT(*) as occurrence_count,
        AVG(confidence_score) as avg_confidence,
        AVG(processing_time_ms) as avg_processing_time,
        error_details->>'type' as error_type
      FROM crc32_audit
      WHERE status != 'valid'
      GROUP BY entity_type, verification_method, status, error_type
      ORDER BY occurrence_count DESC
      LIMIT 50
    `;

    return result;
  },

  // Top performing entities
  topPerformers: async (
    sql: SQLTemplateHelper,
    limit: number = 10
  ): Promise<any[]> => {
    const result = await sql`
      SELECT
        entity_type,
        entity_id,
        COUNT(*) as validation_count,
        AVG(throughput_mbps) as avg_throughput,
        AVG(processing_time_ms) as avg_latency,
        AVG(confidence_score) as avg_confidence,
        SUM(bytes_processed) as total_bytes_processed,
        MAX(created_at) as last_validation
      FROM crc32_audit
      WHERE status = 'valid'
      GROUP BY entity_type, entity_id
      ORDER BY avg_throughput DESC, validation_count DESC
      LIMIT ${limit}
    `;

    return result;
  },

  // Confidence score distribution
  confidenceDistribution: async (sql: SQLTemplateHelper): Promise<any[]> => {
    const result = await sql`
      SELECT
        CASE
          WHEN confidence_score >= 0.99 THEN 'Excellent (≥99%)'
          WHEN confidence_score >= 0.95 THEN 'Good (95-98%)'
          WHEN confidence_score >= 0.90 THEN 'Fair (90-94%)'
          WHEN confidence_score >= 0.80 THEN 'Poor (80-89%)'
          ELSE 'Very Poor (<80%)'
        END as confidence_range,
        COUNT(*) as count,
        COUNT(*)::float / (SELECT COUNT(*) FROM crc32_audit) * 100 as percentage
      FROM crc32_audit
      GROUP BY confidence_range
      ORDER BY
        CASE confidence_range
          WHEN 'Excellent (≥99%)' THEN 1
          WHEN 'Good (95-98%)' THEN 2
          WHEN 'Fair (90-94%)' THEN 3
          WHEN 'Poor (80-89%)' THEN 4
          WHEN 'Very Poor (<80%)' THEN 5
        END
    `;

    return result;
  },

  // Real-time metrics summary
  realtimeSummary: async (sql: SQLTemplateHelper): Promise<any> => {
    const [lastMinute, lastHour, today] = await Promise.all([
      sql`
        SELECT
          COUNT(*) as operations,
          AVG(throughput_mbps) as avg_throughput,
          AVG(processing_time_ms) as avg_latency,
          SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
        FROM crc32_audit
        WHERE created_at >= NOW() - INTERVAL '1 minute'
      `,
      sql`
        SELECT
          COUNT(*) as operations,
          AVG(throughput_mbps) as avg_throughput,
          AVG(processing_time_ms) as avg_latency,
          SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
        FROM crc32_audit
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `,
      sql`
        SELECT
          COUNT(*) as operations,
          AVG(throughput_mbps) as avg_throughput,
          AVG(processing_time_ms) as avg_latency,
          SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
        FROM crc32_audit
        WHERE DATE(created_at) = CURRENT_DATE
      `,
    ]);

    return {
      lastMinute: lastMinute[0],
      lastHour: lastHour[0],
      today: today[0],
    };
  },
};
