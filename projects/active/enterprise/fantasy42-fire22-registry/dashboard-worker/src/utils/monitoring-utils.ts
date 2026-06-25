import {
  type PerformanceMetrics,
  type SecurityEvent,
  type HealthStatus,
  type MonitoringConfig,
  type SecurityConfig,
} from '../types/enhanced-types';

/**
 * Utility functions for monitoring and observability
 */
export class MonitoringUtils {
  /**
   * Creates a monitoring configuration object.
   * @param config Configuration options.
   * @returns MonitoringConfig object.
   */
  static createMonitoringConfig(config: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error' | 'verbose';
  }): MonitoringConfig {
    return {
      enabled: config.enabled,
      logLevel: config.logLevel,
      metricsInterval: 5000, // Default interval
      retentionDays: 7, // Default retention
      securityEventRetention: 30, // Default value
      healthCheckInterval: 10000, // Default value
    };
  }

  /**
   * Creates a security configuration object.
   * @param config Configuration options.
   * @returns SecurityConfig object.
   */
  static createSecurityConfig(config: {
    enableSecurityMonitoring: boolean;
    suspiciousActivityThreshold: number;
  }): SecurityConfig {
    return {
      enableSecurityMonitoring: config.enableSecurityMonitoring,
      suspiciousActivityThreshold: config.suspiciousActivityThreshold,
      alertChannels: ['email', 'slack'], // Default channels
      securityEventRetention: 90, // Default value
      enableRateLimiting: true, // Default value
    };
  }

  /**
   * Formats a timestamp for display
   * @param timestamp ISO timestamp string
   * @returns Formatted timestamp string
   */
  static formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Formats duration in milliseconds to human-readable format
   * @param ms Duration in milliseconds
   * @returns Formatted duration string
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }

    const seconds = ms / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }

    const minutes = seconds / 60;
    if (minutes < 60) {
      return `${minutes.toFixed(1)}m`;
    }

    const hours = minutes / 60;
    return `${hours.toFixed(1)}h`;
  }

  /**
   * Formats bytes to human-readable format
   * @param bytes Number of bytes
   * @returns Formatted bytes string
   */
  static formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  }

  /**
   * Formats percentage with proper decimal places
   * @param value Percentage value (0-100)
   * @param decimals Number of decimal places
   * @returns Formatted percentage string
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Validates a security event
   * @param event Security event to validate
   * @returns Whether the event is valid
   */
  static validateSecurityEvent(event: SecurityEvent): boolean {
    const requiredFields = ['type', 'severity', 'details', 'timestamp'];

    for (const field of requiredFields) {
      if (!(field in event)) {
        return false;
      }
    }

    const validTypes = ['authentication', 'authorization', 'validation'];
    const validSeverities = ['low', 'medium', 'high'];

    return validTypes.includes(event.type) && validSeverities.includes(event.severity);
  }

  /**
   * Sanitizes sensitive data from logs and metrics
   * @param data Data to sanitize
   * @param sensitiveFields Array of field names to sanitize
   * @returns Sanitized data
   */
  static sanitizeData(
    data: Record<string, any>,
    sensitiveFields: string[] = ['password', 'token', 'secret', 'key', 'authorization']
  ): Record<string, any> {
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Calculates rate limit information
   * @param requestCount Number of requests
   * @param timeWindow Time window in milliseconds
   * @param limit Rate limit
   * @returns Rate limit information
   */
  static calculateRateLimit(
    requestCount: number,
    timeWindow: number,
    limit: number
  ): {
    current: number;
    remaining: number;
    reset: number;
    isLimited: boolean;
  } {
    const now = Date.now();
    const resetTime = now + (timeWindow - (now % timeWindow));
    const remaining = Math.max(0, limit - requestCount);

    return {
      current: requestCount,
      remaining,
      reset: resetTime,
      isLimited: requestCount >= limit,
    };
  }

  /**
   * Debounces a function to limit how often it can be called
   * @param func Function to debounce
   * @param wait Wait time in milliseconds
   * @returns Debounced function
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: number | undefined;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait) as unknown as number;
    };
  }

  /**
   * Throttles a function to limit how often it can be called
   * @param func Function to throttle
   * @param limit Time limit in milliseconds
   * @returns Throttled function
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Creates a simple exponential moving average
   * @param values Array of values
   * @param alpha Smoothing factor (0-1)
   * @returns EMA value
   */
  static calculateEMA(values: number[], alpha: number = 0.3): number {
    if (values.length === 0) return 0;

    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i] + (1 - alpha) * ema;
    }

    return ema;
  }

  /**
   * Calculates percentiles from an array of values
   * @param values Array of numeric values
   * @param percentile Percentile to calculate (0-100)
   * @returns Percentile value
   */
  static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;

    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Creates a simple histogram from values
   * @param values Array of numeric values
   * @param buckets Number of buckets
   * @returns Histogram data
   */
  static createHistogram(
    values: number[],
    buckets: number = 10
  ): {
    min: number;
    max: number;
    bucketSize: number;
    counts: number[];
    ranges: string[];
  } {
    if (values.length === 0) {
      return {
        min: 0,
        max: 0,
        bucketSize: 0,
        counts: Array(buckets).fill(0),
        ranges: Array(buckets).fill(''),
      };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const bucketSize = (max - min) / buckets;

    const counts = Array(buckets).fill(0);
    const ranges: string[] = [];

    for (let i = 0; i < buckets; i++) {
      const rangeStart = min + i * bucketSize;
      const rangeEnd = min + (i + 1) * bucketSize;
      ranges.push(`${rangeStart.toFixed(1)}-${rangeEnd.toFixed(1)}`);
    }

    values.forEach(value => {
      const bucketIndex = Math.min(Math.floor((value - min) / bucketSize), buckets - 1);
      counts[bucketIndex]++;
    });

    return {
      min,
      max,
      bucketSize,
      counts,
      ranges,
    };
  }

  /**
   * Validates monitoring configuration
   * @param config Monitoring configuration
   * @returns Whether configuration is valid
   */
  static validateMonitoringConfig(config: MonitoringConfig): boolean {
    const requiredFields = ['enabled', 'logLevel', 'metricsInterval'];

    for (const field of requiredFields) {
      if (!(field in config)) {
        return false;
      }
    }

    const validLogLevels = ['debug', 'info', 'warn', 'error'];

    return (
      typeof config.enabled === 'boolean' &&
      validLogLevels.includes(config.logLevel) &&
      typeof config.metricsInterval === 'number' &&
      config.metricsInterval > 0
    );
  }

  /**
   * Creates a standardized metrics payload
   * @param metrics Performance metrics
   * @param tags Optional tags to include
   * @returns Formatted metrics payload
   */
  static createMetricsPayload(
    metrics: PerformanceMetrics,
    tags: Record<string, string> = {}
  ): {
    timestamp: string;
    metrics: PerformanceMetrics;
    tags: Record<string, string>;
  } {
    return {
      timestamp: new Date().toISOString(),
      metrics,
      tags,
    };
  }

  /**
   * Formats health status for alerts
   * @param health Health status
   * @returns Formatted alert message
   */
  static formatHealthAlert(health: HealthStatus): string {
    const statusEmoji = {
      healthy: '✅',
      degraded: '⚠️',
      unhealthy: '❌',
    };

    const emoji = statusEmoji[health.status];
    const timestamp = this.formatTimestamp(health.lastUpdated);

    let message = `${emoji} System health: ${health.status.toUpperCase()} (${timestamp})\n\n`;

    for (const [component, componentHealth] of Object.entries(health.components)) {
      const componentEmoji = statusEmoji[componentHealth.status];
      message += `  ${componentEmoji} ${component}: ${componentHealth.status.toUpperCase()}`;

      if (componentHealth.message) {
        message += ` - ${componentHealth.message}`;
      }

      message += '\n';
    }

    return message;
  }

  /**
   * Creates a correlation ID for tracing requests
   * @returns Correlation ID string
   */
  static createCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extracts correlation ID from request headers
   * @param request HTTP request
   * @returns Correlation ID or undefined
   */
  static extractCorrelationId(request: Request): string | undefined {
    return request.headers.get('X-Correlation-ID') || undefined;
  }

  /**
   * Adds correlation ID to response headers
   * @param response Response object
   * @param correlationId Correlation ID
   * @returns Response with correlation ID header
   */
  static addCorrelationId(response: Response, correlationId: string): Response {
    response.headers.set('X-Correlation-ID', correlationId);
    return response;
  }

  /**
   * Creates a standardized request log entry
   * @param request HTTP request
   * @param responseTime Response time in milliseconds
   * @param userId Optional user ID
   * @param correlationId Optional correlation ID
   * @returns Request log entry
   */
  static createRequestLog(
    request: Request,
    responseTime: number,
    userId?: string,
    correlationId?: string
  ): {
    method: string;
    url: string;
    userAgent: string;
    ip: string;
    responseTime: number;
    userId?: string;
    correlationId?: string;
    timestamp: string;
  } {
    return {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('User-Agent') || '',
      ip: this.getClientIP(request),
      responseTime,
      userId,
      correlationId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Gets client IP from request
   * @param request HTTP request
   * @returns Client IP address
   */
  private static getClientIP(request: Request): string {
    const cfConnectingIP = request.headers.get('CF-Connecting-IP');
    const xForwardedFor = request.headers.get('X-Forwarded-For');
    const xRealIP = request.headers.get('X-Real-IP');

    return cfConnectingIP || xForwardedFor?.split(',')[0] || xRealIP || 'unknown';
  }
}

/**
 * Metrics aggregation utilities
 */
export class MetricsAggregator {
  private data: Map<string, number[]> = new Map();
  private maxDataPoints: number;

  constructor(maxDataPoints: number = 1000) {
    this.maxDataPoints = maxDataPoints;
  }

  /**
   * Adds a data point to the aggregator
   * @param key Metric key
   * @param value Metric value
   */
  addDataPoint(key: string, value: number): void {
    if (!this.data.has(key)) {
      this.data.set(key, []);
    }

    const points = this.data.get(key)!;
    points.push(value);

    // Keep only recent data points
    if (points.length > this.maxDataPoints) {
      points.splice(0, points.length - this.maxDataPoints);
    }
  }

  /**
   * Gets aggregated metrics for a key
   * @param key Metric key
   * @returns Aggregated metrics
   */
  getAggregatedMetrics(key: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const points = this.data.get(key);

    if (!points || points.length === 0) {
      return null;
    }

    const sorted = [...points].sort((a, b) => a - b);

    return {
      count: points.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: points.reduce((sum, val) => sum + val, 0) / points.length,
      p50: MonitoringUtils.calculatePercentile(sorted, 50),
      p95: MonitoringUtils.calculatePercentile(sorted, 95),
      p99: MonitoringUtils.calculatePercentile(sorted, 99),
    };
  }

  /**
   * Gets all aggregated metrics
   * @returns All aggregated metrics
   */
  getAllMetrics(): Record<string, ReturnType<MetricsAggregator['getAggregatedMetrics']>> {
    const result: Record<string, ReturnType<MetricsAggregator['getAggregatedMetrics']>> = {};

    for (const key of this.data.keys()) {
      result[key] = this.getAggregatedMetrics(key);
    }

    return result;
  }

  /**
   * Clears all data
   */
  clear(): void {
    this.data.clear();
  }
}
