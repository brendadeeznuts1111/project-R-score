import { PerformanceMetrics, SecurityEvent, HealthStatus } from '../types/enhanced-types';
import { MonitoringUtils } from '../utils/monitoring-utils';

/**
 * Metrics Collector for collecting and aggregating system metrics
 */
export class MetricsCollector {
  private metrics: PerformanceMetrics[] = [];
  private securityEvents: SecurityEvent[] = [];
  private healthStatuses: HealthStatus[] = [];
  private retentionPeriod: number = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Records performance metrics
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push({
      ...metrics,
      timestamp: new Date().toISOString(),
    });

    // Clean up old metrics
    this.cleanupMetrics();
  }

  /**
   * Records a security event
   */
  recordSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push({
      ...event,
      timestamp: new Date().toISOString(),
    });

    // Clean up old events
    this.cleanupSecurityEvents();
  }

  /**
   * Records health status
   */
  recordHealthStatus(status: HealthStatus): void {
    this.healthStatuses.push({
      ...status,
      lastUpdated: new Date().toISOString(),
    });

    // Keep only recent health statuses
    if (this.healthStatuses.length > 100) {
      this.healthStatuses = this.healthStatuses.slice(-100);
    }
  }

  /**
   * Gets aggregated performance metrics
   */
  getAggregatedMetrics(period: number = 3600000): AggregatedMetrics {
    const cutoff = Date.now() - period;
    const recentMetrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);

    if (recentMetrics.length === 0) {
      return {
        count: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        averageCPUUsage: 0,
        averageMemoryUsage: 0,
        averageActiveConnections: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    const totalCPUUsage = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0);
    const totalMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0);
    const totalActiveConnections = recentMetrics.reduce((sum, m) => sum + m.activeConnections, 0);

    return {
      count: recentMetrics.length,
      averageResponseTime: totalResponseTime / recentMetrics.length,
      minResponseTime: Math.min(...recentMetrics.map(m => m.responseTime)),
      maxResponseTime: Math.max(...recentMetrics.map(m => m.responseTime)),
      averageCPUUsage: totalCPUUsage / recentMetrics.length,
      averageMemoryUsage: totalMemoryUsage / recentMetrics.length,
      averageActiveConnections: totalActiveConnections / recentMetrics.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Gets security event statistics
   */
  getSecurityEventStats(period: number = 86400000): SecurityEventStats {
    const cutoff = Date.now() - period;
    const recentEvents = this.securityEvents.filter(e => new Date(e.timestamp).getTime() > cutoff);

    const byType = recentEvents.reduce(
      (acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const bySeverity = recentEvents.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalEvents: recentEvents.length,
      byType,
      bySeverity,
      recentEvents: recentEvents.slice(-20), // Last 20 events
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Gets health status history
   */
  getHealthStatusHistory(limit: number = 50): HealthStatus[] {
    return this.healthStatuses.slice(-limit);
  }

  /**
   * Gets system health summary
   */
  getHealthSummary(): HealthSummary {
    if (this.healthStatuses.length === 0) {
      return {
        currentStatus: 'unknown',
        lastUpdated: new Date().toISOString(),
        componentStatus: {},
        trend: 'stable',
      };
    }

    const latestStatus = this.healthStatuses[this.healthStatuses.length - 1];
    const previousStatus =
      this.healthStatuses.length > 1 ? this.healthStatuses[this.healthStatuses.length - 2] : null;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';

    if (previousStatus) {
      const currentHealthyCount = Object.values(latestStatus.components).filter(
        c => c.status === 'healthy'
      ).length;
      const previousHealthyCount = Object.values(previousStatus.components).filter(
        c => c.status === 'healthy'
      ).length;

      if (currentHealthyCount > previousHealthyCount) {
        trend = 'improving';
      } else if (currentHealthyCount < previousHealthyCount) {
        trend = 'declining';
      }
    }

    return {
      currentStatus: latestStatus.status,
      lastUpdated: latestStatus.lastUpdated,
      componentStatus: latestStatus.components,
      trend,
    };
  }

  /**
   * Gets metrics for export
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(
        {
          performance: this.metrics.slice(-1000),
          security: this.securityEvents.slice(-1000),
          health: this.healthStatuses.slice(-100),
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      );
    } else {
      // CSV format
      const headers = ['timestamp', 'type', 'metric', 'value'];
      const rows = [];

      // Performance metrics
      this.metrics.slice(-100).forEach(m => {
        rows.push([m.timestamp, 'performance', 'responseTime', m.responseTime.toString()]);
        rows.push([m.timestamp, 'performance', 'cpuUsage', m.cpuUsage.toString()]);
        rows.push([m.timestamp, 'performance', 'memoryUsage', m.memoryUsage.toString()]);
        rows.push([
          m.timestamp,
          'performance',
          'activeConnections',
          m.activeConnections.toString(),
        ]);
      });

      // Security events
      this.securityEvents.slice(-100).forEach(e => {
        rows.push([e.timestamp, 'security', 'type', e.type]);
        rows.push([e.timestamp, 'security', 'severity', e.severity]);
      });

      return [headers, ...rows.map(row => row.join(','))].join('\n');
    }
  }

  /**
   * Cleans up old metrics
   */
  private cleanupMetrics(): void {
    const cutoff = Date.now() - this.retentionPeriod;
    this.metrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
  }

  /**
   * Cleans up old security events
   */
  private cleanupSecurityEvents(): void {
    const cutoff = Date.now() - this.retentionPeriod;
    this.securityEvents = this.securityEvents.filter(e => new Date(e.timestamp).getTime() > cutoff);
  }

  /**
   * Resets all collected metrics
   */
  reset(): void {
    this.metrics = [];
    this.securityEvents = [];
    this.healthStatuses = [];
  }

  /**
   * Sets retention period
   */
  setRetentionPeriod(period: number): void {
    this.retentionPeriod = period;
    this.cleanupMetrics();
    this.cleanupSecurityEvents();
  }
}

/**
 * Aggregated metrics interface
 */
export interface AggregatedMetrics {
  count: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  averageCPUUsage: number;
  averageMemoryUsage: number;
  averageActiveConnections: number;
  timestamp: string;
}

/**
 * Security event statistics interface
 */
export interface SecurityEventStats {
  totalEvents: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentEvents: SecurityEvent[];
  timestamp: string;
}

/**
 * Health summary interface
 */
export interface HealthSummary {
  currentStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastUpdated: string;
  componentStatus: Record<string, any>;
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * Metrics collector instance
 */
let metricsCollectorInstance: MetricsCollector | null = null;

/**
 * Gets or creates the metrics collector instance
 */
export function getMetricsCollector(): MetricsCollector {
  if (!metricsCollectorInstance) {
    metricsCollectorInstance = new MetricsCollector();
  }
  return metricsCollectorInstance;
}

/**
 * Sets the metrics collector instance
 */
export function setMetricsCollector(collector: MetricsCollector): void {
  metricsCollectorInstance = collector;
}

/**
 * Middleware for automatic metrics collection
 */
export function withMetricsCollection(
  collector: MetricsCollector,
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const startTime = Date.now();
    const requestId =
      MonitoringUtils.extractCorrelationId(request) || MonitoringUtils.createCorrelationId();

    try {
      const response = await handler(request);

      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Record metrics
      collector.recordMetrics({
        responseTime,
        cpuUsage: 0, // Will be populated by performance monitor
        memoryUsage: 0, // Will be populated by performance monitor
        activeConnections: 0, // Will be populated by performance monitor
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (error) {
      // Record error metrics
      const responseTime = Date.now() - startTime;

      collector.recordMetrics({
        responseTime,
        cpuUsage: 0,
        memoryUsage: 0,
        activeConnections: 0,
        timestamp: new Date().toISOString(),
      });

      // Record security event for error
      collector.recordSecurityEvent({
        type: 'validation',
        severity: 'medium',
        details: {
          method: request.method,
          url: request.url,
          error: error instanceof Error ? error.message : String(error),
          requestId,
        },
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  };
}
