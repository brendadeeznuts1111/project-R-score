/**
 * Metrics Collector Service
 * 
 * Singleton service for centralized tracking and collection of:
 * - API call metrics
 * - Performance measurements
 * - Error occurrences
 * - System health metrics
 * 
 * @see METRICS_TRACKING_GUIDE.md for implementation details
 */

import { EventEmitter } from 'node:events';
import { Logger } from '../Logger';
import {
  METRIC_NAMES,
  TIME_WINDOWS,
  HEALTH_WEIGHTS,
  PERCENTILES,
  type ErrorCode
} from '../constants/api-metrics';

// =============================================================================
// Type Definitions
// =============================================================================

export interface APIMetric {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  timestamp: number;
  duration: number;
  status: number;
  requestSize?: number;
  responseSize?: number;
  success: boolean;
  errors?: string[];
  requestId?: string;
}

export interface PerformanceMetric {
  label: string;
  timestamp: number;
  duration: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface ErrorMetric {
  code: string;
  message: string;
  timestamp: number;
  severity: 'warn' | 'error' | 'critical';
  context?: Record<string, any>;
  stackTrace?: string;
  count: number;
}

export interface HealthMetric {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
  requestsPerSecond: number;
  errorRate: number;
  avgLatency: number;
  status: 'healthy' | 'degraded' | 'impaired' | 'critical';
}

export interface MetricsFilter {
  endpoint?: string;
  method?: string;
  timeRange?: number;
  groupBy?: 'endpoint' | 'method' | 'status' | 'hour' | 'day';
  metric?: keyof typeof METRIC_NAMES;
}

export interface MetricsSnapshot {
  timestamp: number;
  apiMetrics: {
    totalRequests: number;
    successRequests: number;
    failedRequests: number;
    avgDuration: number;
    p50Duration?: number;
    p95Duration?: number;
    p99Duration?: number;
    totalRequestSize: number;
    totalResponseSize: number;
    errorsByStatus: Record<number, number>;
  };
  performanceMetrics: {
    labels: string[];
    avgDurations: Record<string, number>;
  };
  errorMetrics: {
    totalErrors: number;
    errorsBySeverity: Record<string, number>;
    errorsByCode: Record<string, number>;
  };
  healthMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
    requestsPerSecond: number;
    errorRate: number;
    avgLatency: number;
    healthScore: number;
    status: string;
  };
}

// =============================================================================
// Metrics Collector Singleton
// =============================================================================

export class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector | null = null;
  private apiMetrics: APIMetric[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private errorMetrics: ErrorMetric[] = [];
  private healthMetrics: HealthMetric[] = [];
  private startTime: number;
  private logger?: Logger;
  private maxMetrics: number = 10000;

  private constructor(logger?: Logger) {
    super();
    this.startTime = Date.now();
    this.logger = logger;
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(logger?: Logger): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector(logger);
    }
    return MetricsCollector.instance;
  }

  /**
   * Reset the singleton (for testing)
   */
  static reset(): void {
    MetricsCollector.instance = null;
  }

  // =========================================================================
  // API Metrics Recording
  // =========================================================================

  /**
   * Record an API call
   */
  recordAPICall(metric: Omit<APIMetric, 'timestamp' | 'success'>): void {
    const apiMetric: APIMetric = {
      ...metric,
      timestamp: Date.now(),
      success: metric.status < 400
    };

    this.apiMetrics.push(apiMetric);
    this.pruneMetrics('api');

    if (this.logger) {
      this.logger.performanceMetric(`API call recorded: ${metric.method} ${metric.endpoint}`, {
        status: metric.status,
        duration: metric.duration,
        endpoint: metric.endpoint
      });
    }

    this.emitMetricEvent('api-call-recorded', apiMetric);
  }

  /**
   * Record multiple API calls (batch)
   */
  recordAPICallBatch(metrics: Omit<APIMetric, 'timestamp' | 'success'>[]): void {
    metrics.forEach(metric => this.recordAPICall(metric));
  }

  // =========================================================================
  // Performance Metrics Recording
  // =========================================================================

  /**
   * Record a performance measurement
   */
  recordPerformance(label: string, duration: number, options?: {
    tags?: Record<string, string>;
    metadata?: Record<string, any>;
  }): void {
    const perfMetric: PerformanceMetric = {
      label,
      timestamp: Date.now(),
      duration,
      tags: options?.tags,
      metadata: options?.metadata
    };

    this.performanceMetrics.push(perfMetric);
    this.pruneMetrics('performance');

    if (this.logger) {
      this.logger.performanceMetric(`Performance recorded: ${label}`, {
        duration,
        tags: options?.tags
      });
    }

    this.emitMetricEvent('performance-recorded', perfMetric);
  }

  // =========================================================================
  // Error Metrics Recording
  // =========================================================================

  /**
   * Record an error occurrence
   */
  recordError(errorData: {
    code: string;
    message: string;
    severity: 'warn' | 'error' | 'critical';
    context?: Record<string, any>;
    stackTrace?: string;
  }): void {
    // Check if error already exists and increment count
    const existing = this.errorMetrics.find(
      e => e.code === errorData.code && 
           new Date().getTime() - e.timestamp < 60000 // Within last minute
    );

    if (existing) {
      existing.count++;
      existing.timestamp = Date.now();
    } else {
      const errorMetric: ErrorMetric = {
        code: errorData.code,
        message: errorData.message,
        timestamp: Date.now(),
        severity: errorData.severity,
        context: errorData.context,
        stackTrace: errorData.stackTrace,
        count: 1
      };

      this.errorMetrics.push(errorMetric);
    }

    this.pruneMetrics('error');

    if (this.logger) {
      this.logger.error(`Error recorded: ${errorData.code}`, {
        code: errorData.code,
        message: errorData.message,
        severity: errorData.severity,
        context: errorData.context
      });
    }

    this.emitMetricEvent('error-recorded', errorData);
  }

  // =========================================================================
  // Health Metrics Recording
  // =========================================================================

  /**
   * Record system health metrics
   */
  recordHealth(metrics: Omit<HealthMetric, 'timestamp'>): void {
    const healthMetric: HealthMetric = {
      ...metrics,
      timestamp: Date.now()
    };

    this.healthMetrics.push(healthMetric);
    this.pruneMetrics('health');

    this.emitMetricEvent('health-recorded', healthMetric);
  }

  // =========================================================================
  // Metrics Querying
  // =========================================================================

  /**
   * Get metrics snapshot with optional filtering
   */
  getMetrics(filter?: MetricsFilter): MetricsSnapshot {
    const snapshot: MetricsSnapshot = {
      timestamp: Date.now(),
      apiMetrics: this.aggregateAPIMetrics(filter),
      performanceMetrics: this.aggregatePerformanceMetrics(filter),
      errorMetrics: this.aggregateErrorMetrics(filter),
      healthMetrics: this.aggregateHealthMetrics()
    };

    return snapshot;
  }

  /**
   * Get API metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint: string, method?: string): MetricsSnapshot {
    return this.getMetrics({ endpoint, method });
  }

  /**
   * Get recent metrics within time range
   */
  getRecentMetrics(timeRangeMs: number = TIME_WINDOWS.LONG): MetricsSnapshot {
    return this.getMetrics({ timeRange: timeRangeMs });
  }

  /**
   * Get error rate (errors / total requests)
   */
  getErrorRate(timeRangeMs: number = TIME_WINDOWS.MEDIUM): number {
    const now = Date.now();
    const recentAPI = this.apiMetrics.filter(m => now - m.timestamp < timeRangeMs);
    
    if (recentAPI.length === 0) return 0;
    
    const failedRequests = recentAPI.filter(m => !m.success).length;
    return failedRequests / recentAPI.length;
  }

  /**
   * Get average latency
   */
  getAverageLatency(timeRangeMs: number = TIME_WINDOWS.MEDIUM): number {
    const now = Date.now();
    const recentAPI = this.apiMetrics.filter(m => now - m.timestamp < timeRangeMs);
    
    if (recentAPI.length === 0) return 0;
    
    const sum = recentAPI.reduce((acc, m) => acc + m.duration, 0);
    return sum / recentAPI.length;
  }

  /**
   * Get percentile latency
   */
  getLatencyPercentile(percentile: number, timeRangeMs: number = TIME_WINDOWS.MEDIUM): number {
    const now = Date.now();
    const recentAPI = this.apiMetrics
      .filter(m => now - m.timestamp < timeRangeMs)
      .map(m => m.duration)
      .sort((a, b) => a - b);
    
    if (recentAPI.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * recentAPI.length) - 1;
    return recentAPI[Math.max(0, index)];
  }

  /**
   * Get throughput (requests per second)
   */
  getThroughput(timeRangeMs: number = TIME_WINDOWS.MEDIUM): number {
    const now = Date.now();
    const recentAPI = this.apiMetrics.filter(m => now - m.timestamp < timeRangeMs);
    
    if (recentAPI.length === 0) return 0;
    
    return (recentAPI.length / timeRangeMs) * 1000;
  }

  /**
   * Calculate health score (0-100)
   */
  calculateHealthScore(timeRangeMs: number = TIME_WINDOWS.MEDIUM): number {
    const errorRate = this.getErrorRate(timeRangeMs);
    const latency = this.getAverageLatency(timeRangeMs);
    
    const uptime = Date.now() - this.startTime;
    const cpuUsage = this.getLatestHealthMetric()?.cpuUsage ?? 0;
    const memoryUsage = this.getLatestHealthMetric()?.memoryUsage ?? 0;
    
    const scores = {
      errorRate: Math.max(0, 100 - (errorRate * 100)),
      latency: Math.max(0, 100 - (latency / 10)),
      uptime: Math.min(100, (uptime / 86400000) * 100),
      cpuUsage: Math.max(0, 100 - cpuUsage),
      memoryUsage: Math.max(0, 100 - memoryUsage)
    };

    const healthScore = (
      (scores.errorRate * HEALTH_WEIGHTS.errorRate) +
      (scores.latency * HEALTH_WEIGHTS.latency) +
      (scores.uptime * HEALTH_WEIGHTS.uptime) +
      (scores.cpuUsage * HEALTH_WEIGHTS.cpuUsage) +
      (scores.memoryUsage * HEALTH_WEIGHTS.memoryUsage)
    );

    return Math.round(healthScore);
  }

  /**
   * Get health status based on score
   */
  getHealthStatus(score: number = this.calculateHealthScore()): 'healthy' | 'degraded' | 'impaired' | 'critical' {
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'degraded';
    if (score >= 40) return 'impaired';
    return 'critical';
  }

  // =========================================================================
  // Events & Subscriptions
  // =========================================================================

  /**
   * Subscribe to metric events (inherits from EventEmitter)
   */
  onMetricEvent(event: 'api-call-recorded' | 'performance-recorded' | 'error-recorded' | 'health-recorded' | 'metrics-updated', 
     callback: (data: any) => void): this {
    return this.on(event, callback);
  }

  /**
   * Unsubscribe from metric events (inherits from EventEmitter)
   */
  offMetricEvent(event: string, callback: (data: any) => void): this {
    return this.off(event, callback);
  }

  private emitMetricEvent(event: string, data: any): void {
    this.emit(event, data);
  }

  // =========================================================================
  // Data Management
  // =========================================================================

  /**
   * Reset all metrics
   */
  reset(): void {
    this.apiMetrics = [];
    this.performanceMetrics = [];
    this.errorMetrics = [];
    this.healthMetrics = [];
    this.startTime = Date.now();
    this.emitMetricEvent('metrics-reset', {});
  }

  /**
   * Clear metrics older than specified age
   */
  pruneOldMetrics(ageMs: number): void {
    const cutoff = Date.now() - ageMs;
    this.apiMetrics = this.apiMetrics.filter(m => m.timestamp > cutoff);
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoff);
    this.errorMetrics = this.errorMetrics.filter(m => m.timestamp > cutoff);
    this.healthMetrics = this.healthMetrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Get statistics about metric collections
   */
  getStats(): {
    apiMetricsCount: number;
    performanceMetricsCount: number;
    errorMetricsCount: number;
    healthMetricsCount: number;
    uptime: number;
    totalMemory: number;
  } {
    const apiSize = this.apiMetrics.length * 200; // Approximate bytes
    const perfSize = this.performanceMetrics.length * 150;
    const errorSize = this.errorMetrics.length * 250;
    const healthSize = this.healthMetrics.length * 200;

    return {
      apiMetricsCount: this.apiMetrics.length,
      performanceMetricsCount: this.performanceMetrics.length,
      errorMetricsCount: this.errorMetrics.length,
      healthMetricsCount: this.healthMetrics.length,
      uptime: Date.now() - this.startTime,
      totalMemory: apiSize + perfSize + errorSize + healthSize
    };
  }

  // =========================================================================
  // Private Aggregation Methods
  // =========================================================================

  private aggregateAPIMetrics(filter?: MetricsFilter) {
    let metrics = this.apiMetrics;

    if (filter?.timeRange) {
      const cutoff = Date.now() - filter.timeRange;
      metrics = metrics.filter(m => m.timestamp > cutoff);
    }

    if (filter?.endpoint) {
      metrics = metrics.filter(m => m.endpoint === filter.endpoint);
    }

    if (filter?.method) {
      metrics = metrics.filter(m => m.method === filter.method);
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const errorsByStatus: Record<number, number> = {};

    metrics.forEach(m => {
      errorsByStatus[m.status] = (errorsByStatus[m.status] || 0) + 1;
    });

    return {
      totalRequests: metrics.length,
      successRequests: metrics.filter(m => m.success).length,
      failedRequests: metrics.filter(m => !m.success).length,
      avgDuration: metrics.length > 0 ? metrics.reduce((a, m) => a + m.duration, 0) / metrics.length : 0,
      p50Duration: durations[Math.floor(durations.length * 0.5)],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
      totalRequestSize: metrics.reduce((a, m) => a + (m.requestSize || 0), 0),
      totalResponseSize: metrics.reduce((a, m) => a + (m.responseSize || 0), 0),
      errorsByStatus
    };
  }

  private aggregatePerformanceMetrics(filter?: MetricsFilter) {
    let metrics = this.performanceMetrics;

    if (filter?.timeRange) {
      const cutoff = Date.now() - filter.timeRange;
      metrics = metrics.filter(m => m.timestamp > cutoff);
    }

    const labels = [...new Set(metrics.map(m => m.label))];
    const avgDurations: Record<string, number> = {};

    labels.forEach(label => {
      const durations = metrics
        .filter(m => m.label === label)
        .map(m => m.duration);
      avgDurations[label] = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;
    });

    return { labels, avgDurations };
  }

  private aggregateErrorMetrics(filter?: MetricsFilter) {
    let metrics = this.errorMetrics;

    if (filter?.timeRange) {
      const cutoff = Date.now() - filter.timeRange;
      metrics = metrics.filter(m => m.timestamp > cutoff);
    }

    const errorsBySeverity: Record<string, number> = {};
    const errorsByCode: Record<string, number> = {};

    metrics.forEach(m => {
      errorsBySeverity[m.severity] = (errorsBySeverity[m.severity] || 0) + m.count;
      errorsByCode[m.code] = (errorsByCode[m.code] || 0) + m.count;
    });

    return {
      totalErrors: metrics.reduce((a, m) => a + m.count, 0),
      errorsBySeverity,
      errorsByCode
    };
  }

  private aggregateHealthMetrics() {
    const latest = this.getLatestHealthMetric();

    return {
      cpuUsage: latest?.cpuUsage ?? 0,
      memoryUsage: latest?.memoryUsage ?? 0,
      uptime: Date.now() - this.startTime,
      requestsPerSecond: this.getThroughput(),
      errorRate: this.getErrorRate(),
      avgLatency: this.getAverageLatency(),
      healthScore: this.calculateHealthScore(),
      status: this.getHealthStatus()
    };
  }

  private getLatestHealthMetric(): HealthMetric | undefined {
    return this.healthMetrics[this.healthMetrics.length - 1];
  }

  private pruneMetrics(type: 'api' | 'performance' | 'error' | 'health'): void {
    if (type === 'api' && this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetrics);
    } else if (type === 'performance' && this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetrics);
    } else if (type === 'error' && this.errorMetrics.length > (this.maxMetrics / 2)) {
      this.errorMetrics = this.errorMetrics.slice(-(this.maxMetrics / 2));
    } else if (type === 'health' && this.healthMetrics.length > (this.maxMetrics / 4)) {
      this.healthMetrics = this.healthMetrics.slice(-(this.maxMetrics / 4));
    }
  }
}
