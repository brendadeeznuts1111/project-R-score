// lib/core/error-metrics.ts — Error metrics collection and alerting system

import {
  BaseEnterpriseError,
  EnterpriseErrorCode,
  SecurityRiskLevel,
} from './core-errors';

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Alert channel types
 */
export enum AlertChannel {
  CONSOLE = 'console',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  EMAIL = 'email',
  CUSTOM = 'custom',
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  /** Minimum severity to trigger this alert */
  minSeverity: AlertSeverity;
  /** Error codes to watch (empty = all) */
  errorCodes?: EnterpriseErrorCode[];
  /** Channel type */
  channel: AlertChannel;
  /** Channel-specific configuration */
  config: Record<string, any>;
  /** Cooldown between alerts (ms) */
  cooldownMs: number;
  /** Rate limit: max alerts per window */
  rateLimit: {
    maxAlerts: number;
    windowMs: number;
  };
}

/**
 * Error metric data point
 */
export interface ErrorMetric {
  timestamp: number;
  code: EnterpriseErrorCode;
  severity: SecurityRiskLevel;
  message: string;
  context?: Record<string, any>;
  service?: string;
  endpoint?: string;
  userId?: string;
  requestId?: string;
}

/**
 * Aggregated error statistics
 */
export interface ErrorAggregation {
  period: {
    start: number;
    end: number;
  };
  total: number;
  byCode: Record<EnterpriseErrorCode, number>;
  bySeverity: Record<SecurityRiskLevel, number>;
  byService: Record<string, number>;
  byEndpoint: Record<string, number>;
  topErrors: Array<{
    code: EnterpriseErrorCode;
    message: string;
    count: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  errorRate: number; // errors per minute
}

/**
 * Metrics export format
 */
export interface MetricsExport {
  timestamp: number;
  windowMs: number;
  aggregations: ErrorAggregation[];
  alerts: Alert[];
}

/**
 * Alert instance
 */
interface Alert {
  id: string;
  timestamp: number;
  severity: AlertSeverity;
  title: string;
  message: string;
  error: ErrorMetric;
  channel: AlertChannel;
  sent: boolean;
}

/**
 * Alert handler function type
 */
type AlertHandler = (alert: Alert) => Promise<void>;

/**
 * Error Metrics Collector
 * 
 * Collects, aggregates, and alerts on error patterns in real-time.
 * Supports multiple alert channels with rate limiting and cooldowns.
 * 
 * @example
 * ```typescript
 * const metrics = new ErrorMetricsCollector({
 *   retentionMs: 24 * 60 * 60 * 1000, // 24 hours
 *   aggregationWindowMs: 5 * 60 * 1000, // 5 minutes
 * });
 * 
 * // Record errors
 * metrics.record(error);
 * 
 * // Configure alerts
 * metrics.addAlert({
 *   minSeverity: AlertSeverity.CRITICAL,
 *   channel: AlertChannel.SLACK,
 *   config: { webhookUrl: 'https://hooks.slack.com/...' },
 *   cooldownMs: 5 * 60 * 1000, // 5 minutes
 *   rateLimit: { maxAlerts: 10, windowMs: 60 * 60 * 1000 },
 * });
 * 
 * // Get aggregations
 * const stats = metrics.getAggregation({
 *   start: Date.now() - 60 * 60 * 1000, // last hour
 *   end: Date.now(),
 * });
 * ```
 */
export class ErrorMetricsCollector {
  private metrics: ErrorMetric[] = [];
  private alerts: Alert[] = [];
  private alertConfigs: AlertConfig[] = [];
  private alertHandlers = new Map<AlertChannel, AlertHandler>();
  private lastAlertTime = new Map<string, number>();
  private alertCount = new Map<string, { count: number; windowStart: number }>();
  private cleanupInterval: Timer | null = null;

  constructor(
    private config: {
      /** How long to keep metrics (default: 24h) */
      retentionMs?: number;
      /** Aggregation window size (default: 5m) */
      aggregationWindowMs?: number;
    } = {}
  ) {
    this.config = {
      retentionMs: 24 * 60 * 60 * 1000,
      aggregationWindowMs: 5 * 60 * 1000,
      ...config,
    };

    this.registerDefaultHandlers();
    this.startCleanup();
  }

  /**
   * Record an error metric
   */
  record(error: Error | BaseEnterpriseError, context?: {
    service?: string;
    endpoint?: string;
    userId?: string;
    requestId?: string;
  }): void {
    const metric: ErrorMetric = {
      timestamp: Date.now(),
      code: this.extractErrorCode(error),
      severity: this.extractSeverity(error),
      message: error.message,
      context: this.extractContext(error),
      ...context,
    };

    this.metrics.push(metric);

    // Check for alerts
    this.checkAlerts(metric);
  }

  /**
   * Add an alert configuration
   */
  addAlert(alertConfig: AlertConfig): void {
    this.alertConfigs.push(alertConfig);
  }

  /**
   * Register a custom alert handler
   */
  registerAlertHandler(channel: AlertChannel, handler: AlertHandler): void {
    this.alertHandlers.set(channel, handler);
  }

  /**
   * Get error aggregation for a time period
   */
  getAggregation(period: { start: number; end: number }): ErrorAggregation {
    const metrics = this.metrics.filter(
      m => m.timestamp >= period.start && m.timestamp <= period.end
    );

    const byCode: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byService: Record<string, number> = {};
    const byEndpoint: Record<string, number> = {};
    const errorCounts = new Map<string, { code: string; message: string; count: number }>();

    for (const metric of metrics) {
      // Count by code
      byCode[metric.code] = (byCode[metric.code] || 0) + 1;

      // Count by severity
      bySeverity[metric.severity] = (bySeverity[metric.severity] || 0) + 1;

      // Count by service
      if (metric.service) {
        byService[metric.service] = (byService[metric.service] || 0) + 1;
      }

      // Count by endpoint
      if (metric.endpoint) {
        byEndpoint[metric.endpoint] = (byEndpoint[metric.endpoint] || 0) + 1;
      }

      // Track top errors
      const key = `${metric.code}:${metric.message}`;
      const existing = errorCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        errorCounts.set(key, {
          code: metric.code,
          message: metric.message,
          count: 1,
        });
      }
    }

    // Calculate trend
    const trend = this.calculateTrend(metrics, period);

    // Calculate error rate (per minute)
    const durationMinutes = (period.end - period.start) / (60 * 1000);
    const errorRate = durationMinutes > 0 ? metrics.length / durationMinutes : 0;

    // Get top errors
    const topErrors = Array.from(errorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      period,
      total: metrics.length,
      byCode: byCode as Record<EnterpriseErrorCode, number>,
      bySeverity: bySeverity as Record<SecurityRiskLevel, number>,
      byService,
      byEndpoint,
      topErrors,
      trend,
      errorRate,
    };
  }

  /**
   * Get current error rate
   */
  getCurrentErrorRate(windowMs: number = 5 * 60 * 1000): number {
    const now = Date.now();
    const recent = this.metrics.filter(m => m.timestamp >= now - windowMs);
    const windowMinutes = windowMs / (60 * 1000);
    return windowMinutes > 0 ? recent.length / windowMinutes : 0;
  }

  /**
   * Export metrics
   */
  exportMetrics(windowMs: number = 60 * 60 * 1000): MetricsExport {
    const now = Date.now();
    const windows: ErrorAggregation[] = [];

    // Generate aggregations for each window
    for (let t = now - windowMs; t < now; t += this.config.aggregationWindowMs!) {
      windows.push(
        this.getAggregation({
          start: t,
          end: Math.min(t + this.config.aggregationWindowMs!, now),
        })
      );
    }

    return {
      timestamp: now,
      windowMs,
      aggregations: windows,
      alerts: this.alerts.filter(a => a.timestamp >= now - windowMs),
    };
  }

  /**
   * Get all alerts
   */
  getAlerts(filter?: {
    severity?: AlertSeverity;
    channel?: AlertChannel;
    since?: number;
  }): Alert[] {
    let filtered = this.alerts;

    if (filter?.severity) {
      filtered = filtered.filter(a => a.severity === filter.severity);
    }

    if (filter?.channel) {
      filtered = filtered.filter(a => a.channel === filter.channel);
    }

    if (filter?.since) {
      filtered = filtered.filter(a => a.timestamp >= filter.since);
    }

    return filtered;
  }

  /**
   * Get statistics summary
   */
  getStats(): {
    totalMetrics: number;
    totalAlerts: number;
    alertConfigs: number;
    currentErrorRate: number;
    retentionMs: number;
  } {
    return {
      totalMetrics: this.metrics.length,
      totalAlerts: this.alerts.length,
      alertConfigs: this.alertConfigs.length,
      currentErrorRate: this.getCurrentErrorRate(),
      retentionMs: this.config.retentionMs!,
    };
  }

  /**
   * Clear all metrics and alerts
   */
  clear(): void {
    this.metrics = [];
    this.alerts = [];
    this.lastAlertTime.clear();
    this.alertCount.clear();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private extractErrorCode(error: Error | BaseEnterpriseError): EnterpriseErrorCode {
    if (error instanceof BaseEnterpriseError) {
      return error.code;
    }
    return EnterpriseErrorCode.SYSTEM_INITIALIZATION_FAILED;
  }

  private extractSeverity(error: Error | BaseEnterpriseError): SecurityRiskLevel {
    if (error instanceof BaseEnterpriseError) {
      return error.severity;
    }
    return SecurityRiskLevel.MEDIUM;
  }

  private extractContext(error: Error | BaseEnterpriseError): Record<string, any> {
    if (error instanceof BaseEnterpriseError && error.context) {
      return error.context;
    }
    return { stack: error.stack };
  }

  private checkAlerts(metric: ErrorMetric): void {
    for (const config of this.alertConfigs) {
      if (this.shouldTriggerAlert(metric, config)) {
        this.triggerAlert(metric, config);
      }
    }
  }

  private shouldTriggerAlert(metric: ErrorMetric, config: AlertConfig): boolean {
    // Check severity
    if (!this.meetsSeverityThreshold(metric.severity, config.minSeverity)) {
      return false;
    }

    // Check error codes
    if (config.errorCodes && config.errorCodes.length > 0) {
      if (!config.errorCodes.includes(metric.code)) {
        return false;
      }
    }

    // Check cooldown
    const key = `${config.channel}:${config.minSeverity}`;
    const lastTime = this.lastAlertTime.get(key) || 0;
    if (Date.now() - lastTime < config.cooldownMs) {
      return false;
    }

    // Check rate limit
    const countInfo = this.alertCount.get(key);
    if (countInfo) {
      if (Date.now() - countInfo.windowStart < config.rateLimit.windowMs) {
        if (countInfo.count >= config.rateLimit.maxAlerts) {
          return false;
        }
      }
    }

    return true;
  }

  private meetsSeverityThreshold(
    metricSeverity: SecurityRiskLevel,
    alertSeverity: AlertSeverity
  ): boolean {
    const severityOrder = {
      [SecurityRiskLevel.MINIMAL]: 0,
      [SecurityRiskLevel.LOW]: 1,
      [SecurityRiskLevel.MEDIUM]: 2,
      [SecurityRiskLevel.HIGH]: 3,
      [SecurityRiskLevel.CRITICAL]: 4,
    };

    const alertOrder = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 2,
      [AlertSeverity.CRITICAL]: 4,
    };

    return severityOrder[metricSeverity] >= alertOrder[alertSeverity];
  }

  private async triggerAlert(metric: ErrorMetric, config: AlertConfig): Promise<void> {
    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      severity: this.mapSeverity(metric.severity),
      title: `Error Alert: ${metric.code}`,
      message: metric.message,
      error: metric,
      channel: config.channel,
      sent: false,
    };

    this.alerts.push(alert);

    // Update rate limiting
    const key = `${config.channel}:${config.minSeverity}`;
    this.lastAlertTime.set(key, alert.timestamp);

    const countInfo = this.alertCount.get(key);
    if (countInfo && Date.now() - countInfo.windowStart < config.rateLimit.windowMs) {
      countInfo.count++;
    } else {
      this.alertCount.set(key, { count: 1, windowStart: alert.timestamp });
    }

    // Send alert
    try {
      const handler = this.alertHandlers.get(config.channel);
      if (handler) {
        await handler(alert);
        alert.sent = true;
      }
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  private mapSeverity(severity: SecurityRiskLevel): AlertSeverity {
    switch (severity) {
      case SecurityRiskLevel.CRITICAL:
        return AlertSeverity.CRITICAL;
      case SecurityRiskLevel.HIGH:
        return AlertSeverity.WARNING;
      default:
        return AlertSeverity.INFO;
    }
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateTrend(
    metrics: ErrorMetric[],
    period: { start: number; end: number }
  ): 'increasing' | 'decreasing' | 'stable' {
    if (metrics.length < 10) return 'stable';

    const midPoint = (period.start + period.end) / 2;
    const firstHalf = metrics.filter(m => m.timestamp < midPoint).length;
    const secondHalf = metrics.filter(m => m.timestamp >= midPoint).length;

    const ratio = secondHalf / (firstHalf || 1);

    if (ratio > 1.5) return 'increasing';
    if (ratio < 0.67) return 'decreasing';
    return 'stable';
  }

  private registerDefaultHandlers(): void {
    // Console handler
    this.alertHandlers.set(AlertChannel.CONSOLE, async (alert) => {
      const icon = alert.severity === AlertSeverity.CRITICAL ? '🚨' :
                   alert.severity === AlertSeverity.WARNING ? '⚠️' : 'ℹ️';
      console.log(`${icon} [${alert.severity.toUpperCase()}] ${alert.title}`);
      console.log(`   ${alert.message}`);
      console.log(`   Service: ${alert.error.service || 'unknown'}`);
      console.log(`   Code: ${alert.error.code}`);
    });

    // Webhook handler
    this.alertHandlers.set(AlertChannel.WEBHOOK, async (alert) => {
      const config = alert.error.context?.webhookConfig;
      if (!config?.url) return;

      try {
        await fetch(config.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: {
              id: alert.id,
              severity: alert.severity,
              title: alert.title,
              message: alert.message,
              timestamp: alert.timestamp,
              service: alert.error.service,
              code: alert.error.code,
            },
          }),
        });
      } catch (error) {
        console.error('Webhook alert failed:', error);
      }
    });

    // Slack handler
    this.alertHandlers.set(AlertChannel.SLACK, async (alert) => {
      const config = alert.error.context?.slackConfig;
      if (!config?.webhookUrl) return;

      const color = alert.severity === AlertSeverity.CRITICAL ? '#FF0000' :
                    alert.severity === AlertSeverity.WARNING ? '#FFA500' : '#36A64F';

      try {
        await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attachments: [{
              color,
              title: alert.title,
              text: alert.message,
              fields: [
                { title: 'Service', value: alert.error.service || 'unknown', short: true },
                { title: 'Code', value: alert.error.code, short: true },
                { title: 'Severity', value: alert.severity, short: true },
                { title: 'Endpoint', value: alert.error.endpoint || 'N/A', short: true },
              ],
              ts: Math.floor(alert.timestamp / 1000),
            }],
          }),
        });
      } catch (error) {
        console.error('Slack alert failed:', error);
      }
    });
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - this.config.retentionMs!;
      this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
      this.alerts = this.alerts.filter(a => a.timestamp >= cutoff);
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }
}

/**
 * Global metrics collector instance
 */
let globalCollector: ErrorMetricsCollector | null = null;

/**
 * Get or create global metrics collector
 */
export function getErrorMetricsCollector(config?: ConstructorParameters<
  typeof ErrorMetricsCollector
>[0]): ErrorMetricsCollector {
  if (!globalCollector) {
    globalCollector = new ErrorMetricsCollector(config);
  }
  return globalCollector;
}

/**
 * Record error to global collector
 */
export function recordError(
  error: Error | BaseEnterpriseError,
  context?: Parameters<ErrorMetricsCollector['record']>[1]
): void {
  getErrorMetricsCollector().record(error, context);
}

/**
 * Configure alert in global collector
 */
export function configureAlert(config: AlertConfig): void {
  getErrorMetricsCollector().addAlert(config);
}

/**
 * Get current error aggregation
 */
export function getErrorAggregation(
  period: Parameters<ErrorMetricsCollector['getAggregation']>[0]
): ReturnType<ErrorMetricsCollector['getAggregation']> {
  return getErrorMetricsCollector().getAggregation(period);
}

// Entry guard for testing
if (import.meta.main) {
  console.log('📊 Error Metrics Demo\n');

  const metrics = new ErrorMetricsCollector({
    retentionMs: 60 * 60 * 1000,
    aggregationWindowMs: 5 * 60 * 1000,
  });

  // Configure console alerts
  metrics.addAlert({
    minSeverity: AlertSeverity.WARNING,
    channel: AlertChannel.CONSOLE,
    config: {},
    cooldownMs: 1000,
    rateLimit: { maxAlerts: 5, windowMs: 60 * 1000 },
  });

  // Record some errors
  console.log('Recording errors...\n');

  metrics.record(
    new Error('Database connection failed'),
    { service: 'user-service', endpoint: '/api/users' }
  );

  metrics.record(
    new Error('API rate limit exceeded'),
    { service: 'payment-service', endpoint: '/api/payments' }
  );

  // Get aggregation
  const aggregation = metrics.getAggregation({
    start: Date.now() - 5 * 60 * 1000,
    end: Date.now(),
  });

  console.log('\n📈 Aggregation Results:');
  console.log(`Total errors: ${aggregation.total}`);
  console.log(`Error rate: ${aggregation.errorRate.toFixed(2)}/min`);
  console.log(`Trend: ${aggregation.trend}`);
  console.log('By service:', aggregation.byService);

  console.log('\n📊 Collector Stats:', metrics.getStats());

  metrics.destroy();
  console.log('\n✅ Demo complete!');
}
