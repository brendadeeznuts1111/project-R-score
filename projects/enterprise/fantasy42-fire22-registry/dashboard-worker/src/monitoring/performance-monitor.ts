import { PerformanceMetrics, MonitoringConfig } from '../types/enhanced-types';

/**
 * Performance Monitor class for tracking system metrics
 */
export class PerformanceMonitor {
  private config: MonitoringConfig;
  private activeRequests: Map<string, number> = new Map();
  private metrics: PerformanceMetrics[] = [];
  private metricsIntervalId?: number;
  private startTime: number = Date.now();

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  /**
   * Starts monitoring a request
   * @param requestId Unique identifier for the request
   */
  startRequest(requestId: string): void {
    this.activeRequests.set(requestId, Date.now());
  }

  /**
   * Ends monitoring a request and records metrics
   * @param requestId Unique identifier for the request
   * @returns Performance metrics for the completed request
   */
  endRequest(requestId: string): PerformanceMetrics | null {
    const startTime = this.activeRequests.get(requestId);
    this.activeRequests.delete(requestId);

    if (!startTime) {
      return null;
    }

    const responseTime = Date.now() - startTime;
    const metrics = this.collectMetrics(responseTime);

    this.metrics.push(metrics);

    // Keep only recent metrics based on retention policy
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    return metrics;
  }

  /**
   * Collects current performance metrics
   * @param responseTime Optional response time to include in metrics
   * @returns PerformanceMetrics object
   */
  collectMetrics(responseTime: number = 0): PerformanceMetrics {
    // Simulated metrics for Cloudflare Workers environment
    const cpuUsage = this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();
    const activeConnections = this.activeRequests.size;

    return {
      responseTime,
      cpuUsage,
      memoryUsage,
      activeConnections,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Gets current performance metrics
   * @returns Current PerformanceMetrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    return this.collectMetrics();
  }

  /**
   * Gets historical metrics
   * @param limit Number of recent metrics to return
   * @returns Array of PerformanceMetrics
   */
  getMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Gets average response time over a time period
   * @param period Time period in milliseconds
   * @returns Average response time
   */
  getAverageResponseTime(period: number = 60000): number {
    const cutoff = Date.now() - period;
    const recentMetrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);

    if (recentMetrics.length === 0) {
      return 0;
    }

    const total = recentMetrics.reduce((sum, metric) => sum + metric.responseTime, 0);
    return total / recentMetrics.length;
  }

  /**
   * Gets request rate (requests per second)
   * @param period Time period in milliseconds
   * @returns Request rate
   */
  getRequestRate(period: number = 60000): number {
    const cutoff = Date.now() - period;
    const recentMetrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);

    return recentMetrics.length / (period / 1000);
  }

  /**
   * Starts periodic metrics collection
   */
  startPeriodicCollection(): void {
    if (this.metricsIntervalId) {
      return; // Already running
    }

    this.metricsIntervalId = setInterval(() => {
      const metrics = this.collectMetrics();
      this.metrics.push(metrics);

      // Keep only recent metrics
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }
    }, this.config.metricsInterval) as unknown as number;
  }

  /**
   * Stops periodic metrics collection
   */
  stopPeriodicCollection(): void {
    if (this.metricsIntervalId) {
      clearInterval(this.metricsIntervalId);
      this.metricsIntervalId = undefined;
    }
  }

  /**
   * Gets system uptime
   * @returns Uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Resets all metrics
   */
  reset(): void {
    this.metrics = [];
    this.activeRequests.clear();
    this.startTime = Date.now();
  }

  /**
   * Simulates CPU usage calculation
   * @returns Simulated CPU usage percentage
   */
  private getCPUUsage(): number {
    // In a real implementation, this would use actual performance monitoring APIs
    // For Cloudflare Workers, we simulate based on request activity
    const baseUsage = 5; // Base CPU usage
    const requestFactor = this.activeRequests.size * 2; // Each request adds 2%
    return Math.min(baseUsage + requestFactor, 100);
  }

  /**
   * Simulates memory usage calculation
   * @returns Simulated memory usage percentage
   */
  private getMemoryUsage(): number {
    // In a real implementation, this would use actual memory monitoring APIs
    // For Cloudflare Workers, we simulate based on metrics history
    const baseMemory = 30; // Base memory usage
    const metricsFactor = Math.min(this.metrics.length * 0.1, 50); // Metrics add memory
    return Math.min(baseMemory + metricsFactor, 100);
  }
}

/**
 * Request tracker for monitoring HTTP requests
 */
export class RequestTracker {
  private performanceMonitor: PerformanceMonitor;
  private activeRequests: Map<string, RequestInfo> = new Map();

  constructor(performanceMonitor: PerformanceMonitor) {
    this.performanceMonitor = performanceMonitor;
  }

  /**
   * Starts tracking a request
   * @param request HTTP request object
   * @param userId Optional user ID
   * @returns Request ID
   */
  startTracking(request: Request, userId?: string): string {
    const requestId = generateRequestId();
    const startTime = Date.now();

    const requestInfo: RequestInfo = {
      id: requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('User-Agent') || '',
      ip: this.getClientIP(request),
      startTime,
      userId,
    };

    this.activeRequests.set(requestId, requestInfo);
    this.performanceMonitor.startRequest(requestId);

    return requestId;
  }

  /**
   * Ends tracking a request
   * @param requestId Request ID to stop tracking
   * @returns Request tracking information
   */
  endTracking(requestId: string): RequestInfo | null {
    const requestInfo = this.activeRequests.get(requestId);
    this.activeRequests.delete(requestId);

    const metrics = this.performanceMonitor.endRequest(requestId);

    if (requestInfo && metrics) {
      return {
        ...requestInfo,
        responseTime: metrics.responseTime,
      };
    }

    return null;
  }

  /**
   * Gets currently active requests
   * @returns Array of active request information
   */
  getActiveRequests(): RequestInfo[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Gets client IP from request
   * @param request HTTP request
   * @returns Client IP address
   */
  private getClientIP(request: Request): string {
    // Try to get IP from various headers
    const cfConnectingIP = request.headers.get('CF-Connecting-IP');
    const xForwardedFor = request.headers.get('X-Forwarded-For');
    const xRealIP = request.headers.get('X-Real-IP');

    return cfConnectingIP || xForwardedFor?.split(',')[0] || xRealIP || 'unknown';
  }
}

/**
 * Request information interface
 */
interface RequestInfo {
  id: string;
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  startTime: number;
  userId?: string;
  responseTime?: number;
}

/**
 * Generates a unique request ID
 * @returns Unique request ID string
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware for request tracking
 * @param performanceMonitor PerformanceMonitor instance
 * @param requestHandler Request handler function
 * @returns Wrapped request handler with tracking
 */
export function withRequestTracking(
  performanceMonitor: PerformanceMonitor,
  requestHandler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  const requestTracker = new RequestTracker(performanceMonitor);

  return async (request: Request): Promise<Response> => {
    const requestId = requestTracker.startTracking(request);

    try {
      const response = await requestHandler(request);

      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId);

      return response;
    } catch (error) {
      // Ensure tracking is completed even if error occurs
      requestTracker.endTracking(requestId);
      throw error;
    }
  };
}
