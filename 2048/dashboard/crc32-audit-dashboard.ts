import type { SQLTemplateHelper } from "bun:sql";

interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  originalCRC32: number;
  computedCRC32: number;
  status: "valid" | "invalid" | "pending";
  confidenceScore: number;
  method: "hardware" | "software" | "simd";
  processingTime: number;
  bytesProcessed: number;
  hardwareUtilized: boolean;
  throughput: number;
  simdInstructions?: number;
  batchId?: string;
  retryCount?: number;
  errorDetails?: string;
  timestamp: string;
}

interface AuditSummary {
  total_audits: number;
  integrity_rate: number;
  avg_throughput: number;
  hardware_utilization: number;
  avg_confidence: number;
}

interface PerformanceTrend {
  hour: string;
  avg_throughput: number;
  avg_latency: number;
  integrity_rate: number;
  hardware_utilization_rate: number;
}

interface RecentFailure {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  confidence_score: number;
  error_details: string;
  created_at: Date;
}

interface AuditDashboardData {
  summary: {
    totalAudits: number;
    integrityRate: number;
    avgThroughput: number;
    hardwareUtilization: number;
    avgConfidence: number;
  };
  trends: Array<{
    timestamp: string;
    throughput: number;
    latency: number;
    integrityRate: number;
    hardwareRate: number;
  }>;
  recentFailures: Array<{
    id: string;
    entityType: string;
    entityId: string;
    status: string;
    confidenceScore: number;
    errorDetails: string;
    timestamp: Date;
  }>;
}

export class CRC32AuditDashboard {
  private readonly sql: SQLTemplateHelper;
  private readonly websocket: WebSocket | null = null;
  private readonly eventListeners: Map<string, Function[]> = new Map();

  constructor(
    sql: SQLTemplateHelper,
    websocketUrl: string = "ws://localhost:3000/crc32/audit/stream"
  ) {
    this.sql = sql;

    // Setup WebSocket for real-time updates if available
    try {
      this.websocket = new WebSocket(websocketUrl);
      this.setupRealTimeUpdates();
    } catch (error) {
      console.log("WebSocket not available, using polling mode");
    }
  }

  private setupRealTimeUpdates(): void {
    if (!this.websocket) return;

    this.websocket.onmessage = async (event) => {
      try {
        const auditEvent: AuditEvent = JSON.parse(event.data);

        // Enhanced SQL with undefined handling for optional fields
        await this.sql`
          INSERT INTO crc32_audit_realtime ${this.sql({
            id: auditEvent.id,
            entity_type: auditEvent.entityType,
            entity_id: auditEvent.entityId,
            original_crc32: auditEvent.originalCRC32,
            computed_crc32: auditEvent.computedCRC32,
            status: auditEvent.status,
            confidence_score: auditEvent.confidenceScore,
            verification_method: auditEvent.method,
            processing_time_ms: auditEvent.processingTime,
            bytes_processed: auditEvent.bytesProcessed,
            hardware_utilized: auditEvent.hardwareUtilized,
            throughput_mbps: auditEvent.throughput,
            simd_instructions: auditEvent.simdInstructions || undefined, // Use DEFAULT if undefined
            batch_id: auditEvent.batchId || undefined, // Use DEFAULT if undefined
            retry_count: auditEvent.retryCount || 0, // Default to 0 if undefined
            error_details: auditEvent.errorDetails || undefined, // Let DB use DEFAULT if undefined
            created_at: new Date(auditEvent.timestamp),
          })}
        `;

        // Emit real-time event to listeners
        this.emit("auditEvent", auditEvent);
      } catch (error) {
        console.error("Failed to process real-time audit event:", error);
      }
    };

    this.websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.emit("connectionError", error);
    };

    this.websocket.onopen = () => {
      console.log("Real-time audit dashboard connected");
      this.emit("connected");
    };
  }

  // Event system for real-time updates
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((callback) => callback(data));
  }

  async getAuditDashboard(
    timeRange: string = "1h"
  ): Promise<AuditDashboardData> {
    const [summary, trends, recentFailures] = await Promise.all([
      this.getAuditSummary(timeRange),
      this.getPerformanceTrends(timeRange),
      this.getRecentFailures(timeRange),
    ]);

    return {
      summary: {
        totalAudits: summary.total_audits,
        integrityRate: summary.integrity_rate,
        avgThroughput: summary.avg_throughput,
        hardwareUtilization: summary.hardware_utilization,
        avgConfidence: summary.avg_confidence,
      },
      trends: trends.map((t) => ({
        timestamp: t.hour,
        throughput: t.avg_throughput,
        latency: t.avg_latency,
        integrityRate: t.integrity_rate,
        hardwareRate: t.hardware_utilization_rate,
      })),
      recentFailures: recentFailures.map((f) => ({
        id: f.id,
        entityType: f.entity_type,
        entityId: f.entity_id,
        status: f.status,
        confidenceScore: f.confidence_score,
        errorDetails: f.error_details,
        timestamp: f.created_at,
      })),
    };
  }

  private async getAuditSummary(
    timeRange: string = "1h"
  ): Promise<AuditSummary> {
    const interval = this.parseTimeRange(timeRange);

    return await this.sql`
      SELECT
        COUNT(*) as total_audits,
        SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END)::float / COUNT(*) as integrity_rate,
        AVG(throughput_mbps) as avg_throughput,
        AVG(CASE WHEN hardware_utilized THEN 1 ELSE 0 END) as hardware_utilization,
        AVG(confidence_score) as avg_confidence
      FROM crc32_audit
      WHERE created_at >= NOW() - INTERVAL ${interval}
    `.then(
      (rows) =>
        rows[0] || {
          total_audits: 0,
          integrity_rate: 0,
          avg_throughput: 0,
          hardware_utilization: 0,
          avg_confidence: 0,
        }
    );
  }

  private async getPerformanceTrends(
    timeRange: string = "1h"
  ): Promise<PerformanceTrend[]> {
    const interval = this.parseTimeRange(timeRange);

    return await this.sql`
      SELECT
        DATE_TRUNC('hour', created_at) as hour,
        AVG(throughput_mbps) as avg_throughput,
        AVG(processing_time_ms) as avg_latency,
        SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END)::float / COUNT(*) as integrity_rate,
        AVG(CASE WHEN hardware_utilized THEN 1 ELSE 0 END) as hardware_utilization_rate
      FROM crc32_audit
      WHERE created_at >= NOW() - INTERVAL ${interval}
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC
      LIMIT 24
    `;
  }

  private async getRecentFailures(
    timeRange: string = "1h",
    limit: number = 10
  ): Promise<RecentFailure[]> {
    const interval = this.parseTimeRange(timeRange);

    return await this.sql`
      SELECT
        id,
        entity_type,
        entity_id,
        status,
        confidence_score,
        error_details,
        created_at
      FROM crc32_audit
      WHERE created_at >= NOW() - INTERVAL ${interval}
        AND status != 'valid'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  async getBatchAnalytics(batchId: string): Promise<any> {
    const [batchSummary, batchItems] = await Promise.all([
      this.sql`
        SELECT
          COUNT(*) as total_items,
          SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as valid_items,
          AVG(throughput_mbps) as avg_throughput,
          AVG(processing_time_ms) as avg_processing_time,
          MIN(created_at) as started_at,
          MAX(created_at) as completed_at
        FROM crc32_audit
        WHERE batch_id = ${batchId}
      `.then((rows) => rows[0]),

      this.sql`
        SELECT
          entity_type,
          entity_id,
          status,
          confidence_score,
          throughput_mbps,
          hardware_utilized,
          created_at
        FROM crc32_audit
        WHERE batch_id = ${batchId}
        ORDER BY created_at ASC
      `,
    ]);

    return {
      batchId,
      summary: batchSummary,
      items: batchItems,
      duration:
        batchSummary.completed_at && batchSummary.started_at
          ? new Date(batchSummary.completed_at).getTime() -
            new Date(batchSummary.started_at).getTime()
          : 0,
    };
  }

  async getEntityHistory(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<any[]> {
    return await this.sql`
      SELECT
        id,
        original_crc32,
        computed_crc32,
        status,
        confidence_score,
        verification_method,
        processing_time_ms,
        throughput_mbps,
        hardware_utilized,
        batch_id,
        error_details,
        created_at
      FROM crc32_audit
      WHERE entity_type = ${entityType}
        AND entity_id = ${entityId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  async getPerformanceMetrics(timeRange: string = "1h"): Promise<any> {
    const interval = this.parseTimeRange(timeRange);

    const [metrics, percentiles] = await Promise.all([
      this.sql`
        SELECT
          COUNT(*) as total_operations,
          AVG(throughput_mbps) as avg_throughput,
          MAX(throughput_mbps) as max_throughput,
          AVG(processing_time_ms) as avg_latency,
          MIN(processing_time_ms) as min_latency,
          MAX(processing_time_ms) as max_latency,
          AVG(bytes_processed) as avg_bytes_processed,
          SUM(bytes_processed) as total_bytes_processed,
          AVG(CASE WHEN hardware_utilized THEN 1 ELSE 0 END) as hardware_utilization_rate,
          AVG(confidence_score) as avg_confidence_score,
          SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
        FROM crc32_audit
        WHERE created_at >= NOW() - INTERVAL ${interval}
      `.then((rows) => rows[0]),

      this.sql`
        SELECT
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY throughput_mbps) as p50_throughput,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY throughput_mbps) as p95_throughput,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY throughput_mbps) as p99_throughput,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY processing_time_ms) as p50_latency,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_time_ms) as p95_latency,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY processing_time_ms) as p99_latency
        FROM crc32_audit
        WHERE created_at >= NOW() - INTERVAL ${interval}
      `.then((rows) => rows[0]),
    ]);

    return {
      ...metrics,
      percentiles: {
        throughput: {
          p50: percentiles.p50_throughput,
          p95: percentiles.p95_throughput,
          p99: percentiles.p99_throughput,
        },
        latency: {
          p50: percentiles.p50_latency,
          p95: percentiles.p95_latency,
          p99: percentiles.p99_latency,
        },
      },
    };
  }

  async exportAuditData(
    format: "json" | "csv" = "json",
    filters: any = {}
  ): Promise<string> {
    let query = this.sql`
      SELECT
        id,
        entity_type,
        entity_id,
        original_crc32,
        computed_crc32,
        status,
        confidence_score,
        verification_method,
        processing_time_ms,
        bytes_processed,
        hardware_utilized,
        throughput_mbps,
        batch_id,
        error_details,
        created_at
      FROM crc32_audit
      WHERE 1=1
    `;

    // Apply filters
    if (filters.entityType) {
      query = query.concat(this.sql` AND entity_type = ${filters.entityType}`);
    }
    if (filters.status) {
      query = query.concat(this.sql` AND status = ${filters.status}`);
    }
    if (filters.startDate) {
      query = query.concat(this.sql` AND created_at >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      query = query.concat(this.sql` AND created_at <= ${filters.endDate}`);
    }
    if (filters.batchId) {
      query = query.concat(this.sql` AND batch_id = ${filters.batchId}`);
    }

    query = query.concat(this.sql` ORDER BY created_at DESC`);

    if (filters.limit) {
      query = query.concat(this.sql` LIMIT ${filters.limit}`);
    }

    const data = await query;

    if (format === "csv") {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        return typeof value === "string" && value.includes(",")
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      });
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  }

  private parseTimeRange(timeRange: string): string {
    // Convert simple time ranges to PostgreSQL intervals
    const match = timeRange.match(/^(\d+)([smhd])$/);
    if (!match) return "1 hour";

    const [, amount, unit] = match;
    const unitMap: Record<string, string> = {
      s: "second",
      m: "minute",
      h: "hour",
      d: "day",
    };

    return `${amount} ${unitMap[unit]}`;
  }

  // Real-time monitoring
  async startRealTimeMonitoring(
    callback: (data: AuditDashboardData) => void
  ): Promise<void> {
    const updateDashboard = async () => {
      try {
        const data = await this.getAuditDashboard("5m");
        callback(data);
      } catch (error) {
        console.error("Failed to update dashboard:", error);
      }
    };

    // Initial update
    await updateDashboard();

    // Set up real-time listener
    this.on("auditEvent", updateDashboard);

    // Fallback polling if WebSocket is not available
    if (!this.websocket) {
      setInterval(updateDashboard, 5000); // Update every 5 seconds
    }
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
    }
    this.eventListeners.clear();
  }
}

// CLI interface for dashboard
export async function startDashboard(
  sql: SQLTemplateHelper,
  port: number = 3001
): Promise<void> {
  const dashboard = new CRC32AuditDashboard(sql);

  console.log(`🚀 CRC32 Audit Dashboard starting on port ${port}`);
  console.log("===========================================");

  // Start real-time monitoring
  await dashboard.startRealTimeMonitoring((data) => {
    console.clear();
    console.log("📊 CRC32 Audit Dashboard - Real-time");
    console.log("=====================================");
    console.log(`Total Audits: ${data.summary.totalAudits}`);
    console.log(
      `Integrity Rate: ${(data.summary.integrityRate * 100).toFixed(1)}%`
    );
    console.log(
      `Avg Throughput: ${data.summary.avgThroughput.toFixed(1)} MB/s`
    );
    console.log(
      `Hardware Utilization: ${(data.summary.hardwareUtilization * 100).toFixed(
        1
      )}%`
    );
    console.log(
      `Avg Confidence: ${(data.summary.avgConfidence * 100).toFixed(1)}%`
    );

    if (data.recentFailures.length > 0) {
      console.log("\n⚠️  Recent Failures:");
      data.recentFailures.slice(0, 5).forEach((failure) => {
        console.log(
          `  ${failure.entityType}:${failure.entityId} - ${
            failure.status
          } (${failure.confidenceScore.toFixed(2)})`
        );
      });
    }

    console.log(`\nLast updated: ${new Date().toLocaleTimeString()}`);
  });

  console.log("Dashboard monitoring started. Press Ctrl+C to stop.");

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down dashboard...");
    dashboard.disconnect();
    process.exit(0);
  });
}
