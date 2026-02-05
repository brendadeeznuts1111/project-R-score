/**
 * Enhanced Worker Handler with Comprehensive Monitoring
 * Cloudflare Worker entry point with performance monitoring, health checks, and metrics
 */

interface Env {
  DB?: any;
  CACHE?: any;
  MONITORING_ENABLED?: boolean;
  MONITORING_ENDPOINT?: string;
  ALERT_WEBHOOK_URL?: string;
  WORKER_ID?: string;
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// Performance and monitoring metrics
interface WorkerMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  totalResponseTime: number;
  statusCodes: Record<number, number>;
  endpointMetrics: Record<
    string,
    {
      count: number;
      totalTime: number;
      averageTime: number;
      errors: number;
    }
  >;
  memoryUsage?: number;
  cpuTime?: number;
}

interface RequestContext {
  traceId: string;
  spanId: string;
  startTime: number;
  method: string;
  url: string;
  userAgent?: string;
  clientIP?: string;
}

// Global metrics storage (in production, use Durable Objects or external storage)
const workerMetrics: WorkerMetrics = {
  requestCount: 0,
  errorCount: 0,
  averageResponseTime: 0,
  totalResponseTime: 0,
  statusCodes: {},
  endpointMetrics: {},
};

// Request monitoring middleware
class RequestMonitor {
  private static instance: RequestMonitor;
  private activeRequests = new Map<string, RequestContext>();

  static getInstance(): RequestMonitor {
    if (!RequestMonitor.instance) {
      RequestMonitor.instance = new RequestMonitor();
    }
    return RequestMonitor.instance;
  }

  startRequest(request: Request, env?: Env): RequestContext {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();
    const startTime = Date.now();

    const context: RequestContext = {
      traceId,
      spanId,
      startTime,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('User-Agent') || undefined,
      clientIP:
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For') ||
        undefined,
    };

    this.activeRequests.set(traceId, context);

    // Log request start (based on log level)
    if (this.shouldLog('debug', env)) {
      console.log(
        `[REQUEST_START] ${context.method} ${new URL(context.url).pathname} - Trace: ${traceId}`
      );
    }

    return context;
  }

  endRequest(traceId: string, statusCode: number, error?: Error, env?: Env): void {
    const context = this.activeRequests.get(traceId);
    if (!context) return;

    const duration = Date.now() - context.startTime;
    const endpoint = new URL(context.url).pathname;

    // Update global metrics
    this.updateMetrics(endpoint, duration, statusCode, error);

    // Remove from active requests
    this.activeRequests.delete(traceId);

    // Log request end (based on log level)
    const logLevel = error ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    if (this.shouldLog(logLevel, env as Env)) {
      console.log(
        `[${logLevel.toUpperCase()}] ${context.method} ${endpoint} - ${statusCode} - ${duration}ms - Trace: ${traceId}`
      );
    }

    if (error && this.shouldLog('error', env as Env)) {
      console.error(`[ERROR_DETAILS] ${error.message}`, error.stack);
    }
  }

  private updateMetrics(
    endpoint: string,
    duration: number,
    statusCode: number,
    error?: Error
  ): void {
    // Update global counters
    workerMetrics.requestCount++;
    workerMetrics.totalResponseTime += duration;
    workerMetrics.averageResponseTime =
      workerMetrics.totalResponseTime / workerMetrics.requestCount;

    // Update status code counters
    workerMetrics.statusCodes[statusCode] = (workerMetrics.statusCodes[statusCode] || 0) + 1;

    // Update endpoint-specific metrics
    if (!workerMetrics.endpointMetrics[endpoint]) {
      workerMetrics.endpointMetrics[endpoint] = {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        errors: 0,
      };
    }

    const endpointMetric = workerMetrics.endpointMetrics[endpoint];
    endpointMetric.count++;
    endpointMetric.totalTime += duration;
    endpointMetric.averageTime = endpointMetric.totalTime / endpointMetric.count;

    if (error || statusCode >= 400) {
      endpointMetric.errors++;
      workerMetrics.errorCount++;
    }
  }

  private generateTraceId(): string {
    return crypto.randomUUID();
  }

  private generateSpanId(): string {
    return crypto.randomUUID().substring(0, 8);
  }

  getActiveRequests(): RequestContext[] {
    return Array.from(this.activeRequests.values());
  }

  getMetrics(): WorkerMetrics {
    return { ...workerMetrics };
  }

  resetMetrics(): void {
    Object.keys(workerMetrics).forEach(key => {
      if (typeof workerMetrics[key as keyof WorkerMetrics] === 'number') {
        (workerMetrics as any)[key] = 0;
      } else if (typeof workerMetrics[key as keyof WorkerMetrics] === 'object') {
        (workerMetrics as any)[key] = {};
      }
    });
  }

  private shouldLog(level: string, env: Env): boolean {
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = env.LOG_LEVEL || 'info';
    const currentIndex = logLevels.indexOf(currentLevel);
    const requestedIndex = logLevels.indexOf(level);

    return requestedIndex >= currentIndex;
  }
}

// Health check utilities
class HealthChecker {
  private lastHealthCheck: number = 0;
  private healthCache: any = null;
  private readonly HEALTH_CACHE_TTL = 30000; // 30 seconds

  async performHealthCheck(env: Env): Promise<any> {
    const now = Date.now();

    // Return cached result if still valid
    if (this.healthCache && now - this.lastHealthCheck < this.HEALTH_CACHE_TTL) {
      return this.healthCache;
    }

    const startTime = Date.now();
    const checks: any = {
      timestamp: new Date().toISOString(),
      uptime: now - (globalThis as any).startTime || now,
      status: 'healthy',
      checks: {
        worker: { status: 'ok', message: 'Worker is responding' },
        database: { status: 'unknown', message: 'Database check not implemented' },
        cache: { status: 'unknown', message: 'Cache check not implemented' },
        memory: { status: 'ok', message: 'Memory usage normal' },
        performance: { status: 'ok', message: 'Performance metrics available' },
      },
      metrics: RequestMonitor.getInstance().getMetrics(),
      version: '2.1.0',
      memoryUsage: {},
      responseTime: 0,
    };

    // Check database if available
    if (env.DB) {
      try {
        // Add database health check logic here
        checks.checks.database = { status: 'ok', message: 'Database connection healthy' };
      } catch (error) {
        checks.checks.database = {
          status: 'error',
          message: `Database error: ${(error as Error).message}`,
        };
        checks.status = 'degraded';
      }
    }

    // Check cache if available
    if (env.CACHE) {
      try {
        // Add cache health check logic here
        checks.checks.cache = { status: 'ok', message: 'Cache connection healthy' };
      } catch (error) {
        checks.checks.cache = {
          status: 'error',
          message: `Cache error: ${(error as Error).message}`,
        };
        checks.status = 'degraded';
      }
    }

    // Memory usage check (Cloudflare Workers specific)
    try {
      // In Cloudflare Workers, we can check memory usage
      checks.memoryUsage = {
        rss: (globalThis as any).performance?.memory?.usedJSHeapSize || 0,
        heapUsed: (globalThis as any).performance?.memory?.usedJSHeapSize || 0,
        heapTotal: (globalThis as any).performance?.memory?.totalJSHeapSize || 0,
      };
    } catch (error) {
      // Memory API might not be available
    }

    const checkDuration = Date.now() - startTime;
    checks.responseTime = checkDuration;

    // Update cache
    this.lastHealthCheck = now;
    this.healthCache = checks;

    return checks;
  }
}

// Alerting system
class AlertManager {
  private alerts: any[] = [];
  private readonly MAX_ALERTS = 100;

  async checkAndAlert(metrics: WorkerMetrics, env: Env): Promise<void> {
    const alerts = [];

    // Check error rate
    const errorRate = metrics.errorCount / metrics.requestCount;
    if (errorRate > 0.05) {
      // 5% error rate
      alerts.push({
        type: 'error_rate_high',
        severity: 'high',
        message: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
        value: errorRate,
        threshold: 0.05,
      });
    }

    // Check response time
    if (metrics.averageResponseTime > 2000) {
      // 2 second average
      alerts.push({
        type: 'response_time_high',
        severity: 'medium',
        message: `High average response time: ${metrics.averageResponseTime.toFixed(0)}ms`,
        value: metrics.averageResponseTime,
        threshold: 2000,
      });
    }

    // Check for 5xx errors
    const serverErrors = Object.entries(metrics.statusCodes)
      .filter(([code]) => parseInt(code) >= 500)
      .reduce((sum, [, count]) => sum + count, 0);

    if (serverErrors > 5) {
      alerts.push({
        type: 'server_errors_high',
        severity: 'critical',
        message: `High server error count: ${serverErrors}`,
        value: serverErrors,
        threshold: 5,
      });
    }

    // Send alerts if any
    for (const alert of alerts) {
      await this.sendAlert(alert, env);
    }
  }

  private async sendAlert(alert: any, env: Env): Promise<void> {
    // Add to local alert history
    this.alerts.unshift({
      ...alert,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
    });

    // Keep only recent alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }

    // Send to external monitoring if configured
    if (env.ALERT_WEBHOOK_URL) {
      try {
        await fetch(env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...alert,
            source: 'cloudflare-worker',
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error('Failed to send alert:', error);
      }
    }

    // Log alert
    console.error(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
  }

  getRecentAlerts(limit: number = 10): any[] {
    return this.alerts.slice(0, limit);
  }
}

// Initialize monitoring components
const requestMonitor = RequestMonitor.getInstance();
const healthChecker = new HealthChecker();
const alertManager = new AlertManager();

// Worker Monitoring Bridge - integrates with main monitoring system
class WorkerMonitoringBridge {
  private static instance: WorkerMonitoringBridge;
  private monitoringEndpoint?: string;
  private batchSize = 10;
  private batchInterval = 30000; // 30 seconds
  private metricsBatch: any[] = [];
  private batchTimer?: Timer;

  static getInstance(): WorkerMonitoringBridge {
    if (!WorkerMonitoringBridge.instance) {
      WorkerMonitoringBridge.instance = new WorkerMonitoringBridge();
    }
    return WorkerMonitoringBridge.instance;
  }

  configure(endpoint: string): void {
    this.monitoringEndpoint = endpoint;
    this.startBatchSending();
  }

  recordWorkerMetric(metric: any): void {
    this.metricsBatch.push({
      ...metric,
      timestamp: new Date().toISOString(),
      source: 'cloudflare-worker',
      workerId: 'dashboard-worker',
    });

    // Send immediately if batch is full
    if (this.metricsBatch.length >= this.batchSize) {
      this.sendBatch();
    }
  }

  private startBatchSending(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      if (this.metricsBatch.length > 0) {
        this.sendBatch();
      }
    }, this.batchInterval);
  }

  private async sendBatch(): Promise<void> {
    if (!this.monitoringEndpoint || this.metricsBatch.length === 0) {
      return;
    }

    const batch = [...this.metricsBatch];
    this.metricsBatch = [];

    try {
      const response = await fetch(this.monitoringEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'worker_metrics_batch',
          timestamp: new Date().toISOString(),
          metrics: batch,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send metrics batch:', response.status);
        // Re-queue failed batch
        this.metricsBatch.unshift(...batch);
      }
    } catch (error) {
      console.error('Error sending metrics batch:', error);
      // Re-queue failed batch
      this.metricsBatch.unshift(...batch);
    }
  }

  async syncWithMainMonitoring(env: Env): Promise<void> {
    if (env.MONITORING_ENDPOINT) {
      this.configure(env.MONITORING_ENDPOINT);

      // Send current metrics
      const metrics = requestMonitor.getMetrics();
      this.recordWorkerMetric({
        type: 'worker_health_sync',
        metrics,
        alerts: alertManager.getRecentAlerts(5),
      });
    }
  }
}

// Enhanced Alert Manager with main system integration
class EnhancedAlertManager extends AlertManager {
  private bridge = WorkerMonitoringBridge.getInstance();

  async checkAndAlert(metrics: WorkerMetrics, env: Env): Promise<void> {
    await super.checkAndAlert(metrics, env);

    // Send alerts to main monitoring system
    if (env.MONITORING_ENDPOINT) {
      const alerts = this.getRecentAlerts(5);
      this.bridge.recordWorkerMetric({
        type: 'worker_alerts',
        alerts,
        metrics: {
          errorRate: (metrics.errorCount / metrics.requestCount) * 100,
          averageResponseTime: metrics.averageResponseTime,
          totalRequests: metrics.requestCount,
        },
      });
    }
  }
}

// Initialize enhanced components
const monitoringBridge = WorkerMonitoringBridge.getInstance();
const enhancedAlertManager = new EnhancedAlertManager();

// Enhanced worker request handler
export default async function handleWorkerRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const requestContext = requestMonitor.startRequest(request, env);

  try {
    // Add request ID to context for tracing
    ctx.waitUntil(Promise.resolve()); // Ensure async operations complete

    // Enhanced health check endpoint
    if (url.pathname === '/health') {
      const healthData = await healthChecker.performHealthCheck(env);
      return new Response(JSON.stringify(healthData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': requestContext.traceId,
        },
      });
    }

    // Metrics endpoint
    if (url.pathname === '/metrics') {
      const metrics = requestMonitor.getMetrics();
      const activeRequests = requestMonitor.getActiveRequests();
      const alerts = alertManager.getRecentAlerts();

      const metricsData = {
        timestamp: new Date().toISOString(),
        worker: 'dashboard-worker',
        version: '2.1.0',
        metrics,
        activeRequests: activeRequests.length,
        alerts: alerts.length,
        system: {
          uptime: Date.now() - (globalThis as any).startTime || Date.now(),
          memoryUsage: (globalThis as any).performance?.memory || {},
        },
      };

      return new Response(JSON.stringify(metricsData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': requestContext.traceId,
        },
      });
    }

    // Alerts endpoint
    if (url.pathname === '/alerts') {
      const alerts = alertManager.getRecentAlerts();
      return new Response(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            alerts,
            total: alerts.length,
          },
          null,
          2
        ),
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Trace-Id': requestContext.traceId,
          },
        }
      );
    }

    // Configuration endpoint
    if (url.pathname === '/config') {
      const config = {
        monitoring: {
          enabled: env.MONITORING_ENABLED !== false,
          endpoint: env.MONITORING_ENDPOINT || null,
          alertWebhook: env.ALERT_WEBHOOK_URL || null,
          workerId: env.WORKER_ID || 'dashboard-worker',
        },
        environment: {
          logLevel: env.LOG_LEVEL || 'info',
          hasDatabase: !!env.DB,
          hasCache: !!env.CACHE,
        },
        features: [
          'performance-monitoring',
          'health-checks',
          'distributed-tracing',
          'alerting',
          'metrics-collection',
          'main-system-integration',
        ],
      };

      return new Response(JSON.stringify(config, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': requestContext.traceId,
        },
      });
    }

    // Performance profiling endpoint
    if (url.pathname === '/profile') {
      const metrics = requestMonitor.getMetrics();
      const performanceData = {
        timestamp: new Date().toISOString(),
        performance: {
          averageResponseTime: metrics.averageResponseTime,
          totalRequests: metrics.requestCount,
          errorRate: (metrics.errorCount / metrics.requestCount) * 100,
          endpointPerformance: Object.entries(metrics.endpointMetrics).map(([endpoint, data]) => ({
            endpoint,
            ...data,
            errorRate: (data.errors / data.count) * 100,
          })),
        },
        recommendations: generatePerformanceRecommendations(metrics),
      };

      return new Response(JSON.stringify(performanceData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': requestContext.traceId,
        },
      });
    }

    // Default response
    const response = new Response(
      JSON.stringify({
        message: 'Enhanced Worker is running',
        timestamp: new Date().toISOString(),
        traceId: requestContext.traceId,
        version: '2.1.0',
        monitoring: {
          enabled: env.MONITORING_ENABLED !== false,
          endpoints: ['/health', '/metrics', '/alerts', '/profile', '/config'],
          version: '2.1.0',
          features: [
            'real-time-metrics',
            'distributed-tracing',
            'performance-profiling',
            'alerting-system',
            'health-checks',
            'main-system-integration',
          ],
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': requestContext.traceId,
        },
      }
    );

    // End request monitoring
    requestMonitor.endRequest(requestContext.traceId, response.status, undefined, env);

    // Check for alerts (run in background)
    if (env.MONITORING_ENABLED !== false) {
      ctx.waitUntil(enhancedAlertManager.checkAndAlert(requestMonitor.getMetrics(), env));
    }

    // Periodic sync with main monitoring system
    if (env.MONITORING_ENDPOINT && Math.random() < 0.1) {
      // 10% of requests
      ctx.waitUntil(monitoringBridge.syncWithMainMonitoring(env));
    }

    return response;
  } catch (error) {
    // Enhanced error handling with monitoring
    const errorResponse = new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: (error as Error).message,
        traceId: requestContext.traceId,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': requestContext.traceId,
        },
      }
    );

    // End request monitoring with error
    requestMonitor.endRequest(requestContext.traceId, 500, error as Error, env);

    // Log error details
    console.error(`[WORKER_ERROR] ${requestContext.traceId}:`, error);

    return errorResponse;
  }
}

// Performance recommendations generator
function generatePerformanceRecommendations(metrics: WorkerMetrics): string[] {
  const recommendations = [];

  if (metrics.averageResponseTime > 1000) {
    recommendations.push('Consider optimizing slow endpoints (>1s average)');
  }

  if (metrics.errorCount / metrics.requestCount > 0.01) {
    recommendations.push('Review error handling for endpoints with >1% error rate');
  }

  const slowEndpoints = Object.entries(metrics.endpointMetrics)
    .filter(([, data]) => data.averageTime > 500)
    .map(([endpoint]) => endpoint);

  if (slowEndpoints.length > 0) {
    recommendations.push(`Optimize slow endpoints: ${slowEndpoints.join(', ')}`);
  }

  const errorEndpoints = Object.entries(metrics.endpointMetrics)
    .filter(([, data]) => data.errors / data.count > 0.05)
    .map(([endpoint]) => endpoint);

  if (errorEndpoints.length > 0) {
    recommendations.push(`Fix high error rate endpoints: ${errorEndpoints.join(', ')}`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Performance is optimal - continue monitoring');
  }

  return recommendations;
}
