/**
 * Cloudflare Analytics Integration - Enhanced support for Cloudflare Workers, KV, R2, D1
 */

import { CacheMonitor, CacheType } from './cache-monitor';
import { AdvancedAnalyticsLogger } from './advanced-analytics-logger';
import { LogLevel, LogContext } from './types';

// Cloudflare-specific cache types
export type CloudflareCacheType =
  | 'CF_KV'
  | 'CF_R2'
  | 'CF_D1'
  | 'CF_CACHE_API'
  | 'CF_DURABLE_OBJECTS'
  | 'CF_WORKERS_AI'
  | 'CF_VECTORIZE'
  | 'CF_IMAGES'
  | 'CF_STREAM';

// Cloudflare Analytics Event
export interface CloudflareAnalyticsEvent {
  timestamp: Date;
  eventType:
    | 'WORKER_INVOCATION'
    | 'KV_OPERATION'
    | 'R2_OPERATION'
    | 'D1_QUERY'
    | 'CACHE_HIT'
    | 'CACHE_MISS'
    | 'AI_INFERENCE'
    | 'DURABLE_OBJECT_CALL';
  workerId: string;
  requestId?: string;
  colo: string; // Cloudflare data center
  country: string;
  city?: string;
  userAgent?: string;
  performance: {
    cpuTime: number; // microseconds
    wallTime: number; // milliseconds
    memoryUsage?: number;
  };
  billing: {
    requests: number;
    cpuTime: number;
    kvOperations?: number;
    r2Operations?: number;
    d1Queries?: number;
  };
  errors?: Array<{
    name: string;
    message: string;
    stack?: string;
  }>;
}

// Cloudflare Analytics Configuration
export interface CloudflareAnalyticsConfig {
  accountId: string;
  apiToken?: string;
  zoneId?: string;
  enableGraphQLAnalytics: boolean;
  enableLogpush: boolean;
  enableRealTimeStats: boolean;
  datacenters: string[]; // Specific colos to monitor
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    cpuTime: number;
    kvLatency: number;
    r2Latency: number;
    d1QueryTime: number;
  };
}

// Cloudflare Performance Metrics
export interface CloudflarePerformanceMetrics {
  workers: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    averageCpuTime: number;
    errorsByType: Map<string, number>;
    requestsByCountry: Map<string, number>;
    requestsByColo: Map<string, number>;
  };
  kv: {
    operations: number;
    hits: number;
    misses: number;
    latency: {
      p50: number;
      p95: number;
      p99: number;
    };
    dataTransfer: number;
  };
  r2: {
    operations: number;
    gets: number;
    puts: number;
    deletes: number;
    dataTransfer: number;
    latency: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  d1: {
    queries: number;
    reads: number;
    writes: number;
    averageQueryTime: number;
    rowsRead: number;
    rowsWritten: number;
  };
  analytics: {
    graphqlQueries: number;
    logpushMessages: number;
    realTimeEvents: number;
  };
}

export class CloudflareAnalyticsIntegration {
  private cacheMonitor: CacheMonitor;
  private analyticsLogger: AdvancedAnalyticsLogger;
  private config: CloudflareAnalyticsConfig;
  private performanceMetrics: CloudflarePerformanceMetrics;
  private eventBuffer: CloudflareAnalyticsEvent[] = [];

  constructor(
    cacheMonitor: CacheMonitor,
    analyticsLogger: AdvancedAnalyticsLogger,
    config: CloudflareAnalyticsConfig
  ) {
    this.cacheMonitor = cacheMonitor;
    this.analyticsLogger = analyticsLogger;
    this.config = config;
    this.performanceMetrics = this.initializeMetrics();

    this.startCloudflareMonitoring();
  }

  /**
   * Log Cloudflare Worker invocation with comprehensive metrics
   */
  public logWorkerInvocation(
    workerId: string,
    requestId: string,
    colo: string,
    country: string,
    performance: CloudflareAnalyticsEvent['performance'],
    context: LogContext = {}
  ): void {
    const event: CloudflareAnalyticsEvent = {
      timestamp: new Date(),
      eventType: 'WORKER_INVOCATION',
      workerId,
      requestId,
      colo,
      country,
      performance,
      billing: {
        requests: 1,
        cpuTime: performance.cpuTime,
      },
    };

    this.eventBuffer.push(event);
    this.updatePerformanceMetrics(event);

    // Log to analytics system
    this.analyticsLogger.logWithAnalytics(
      LogLevel.INFO,
      `🟠 CF Worker Invocation: ${workerId}`,
      {
        ...context,
        component: 'cloudflare-worker',
        entityId: requestId,
      },
      {
        entityType: 'CLOUDFLARE_WORKER',
        action: 'WORKER_INVOCATION',
        performanceMetrics: {
          cpuUsage: performance.cpuTime / 1000, // Convert to ms
          memoryUsage: performance.memoryUsage || 0,
          diskIO: 0,
          networkIO: performance.wallTime,
        },
      },
      {
        workerId,
        colo,
        country,
        cpuTime: performance.cpuTime,
        wallTime: performance.wallTime,
      }
    );

    // Check performance thresholds
    this.checkCloudflareThresholds(event);
  }

  /**
   * Log Cloudflare KV operation with detailed metrics
   */
  public logKVOperation(
    operation: 'GET' | 'PUT' | 'DELETE' | 'LIST',
    key: string,
    hit: boolean,
    latency: number,
    size?: number,
    colo?: string,
    context: LogContext = {}
  ): void {
    // Use enhanced cache monitor for KV operations
    this.cacheMonitor.recordCacheOperation(
      'KV' as CacheType,
      operation,
      key,
      hit,
      latency,
      size,
      colo,
      hit ? undefined : 'KEY_NOT_FOUND',
      {
        ...context,
        component: 'cloudflare-kv',
      }
    );

    // Log Cloudflare-specific event
    const event: CloudflareAnalyticsEvent = {
      timestamp: new Date(),
      eventType: 'KV_OPERATION',
      workerId: context.component || 'unknown',
      colo: colo || 'unknown',
      country: 'unknown',
      performance: {
        cpuTime: latency * 10, // Estimate CPU time
        wallTime: latency,
      },
      billing: {
        requests: 1,
        cpuTime: latency * 10,
        kvOperations: 1,
      },
    };

    this.eventBuffer.push(event);
    this.updateKVMetrics(operation, hit, latency, size || 0);
  }

  /**
   * Log Cloudflare R2 operation
   */
  public logR2Operation(
    operation: 'GET' | 'PUT' | 'DELETE' | 'HEAD' | 'LIST',
    key: string,
    success: boolean,
    latency: number,
    size?: number,
    colo?: string,
    context: LogContext = {}
  ): void {
    this.cacheMonitor.recordCacheOperation(
      'R2' as CacheType,
      operation,
      key,
      success,
      latency,
      size,
      colo,
      success ? undefined : 'KEY_NOT_FOUND',
      {
        ...context,
        component: 'cloudflare-r2',
      }
    );

    const event: CloudflareAnalyticsEvent = {
      timestamp: new Date(),
      eventType: 'R2_OPERATION',
      workerId: context.component || 'unknown',
      colo: colo || 'unknown',
      country: 'unknown',
      performance: {
        cpuTime: latency * 5,
        wallTime: latency,
      },
      billing: {
        requests: 1,
        cpuTime: latency * 5,
        r2Operations: 1,
      },
    };

    this.eventBuffer.push(event);
    this.updateR2Metrics(operation, success, latency, size || 0);
  }

  /**
   * Log Cloudflare D1 database query
   */
  public logD1Query(
    query: string,
    queryType: 'READ' | 'WRITE',
    success: boolean,
    duration: number,
    rowsAffected?: number,
    context: LogContext = {}
  ): void {
    this.analyticsLogger.logWithAnalytics(
      success ? LogLevel.DEBUG : LogLevel.WARN,
      `🗄️ CF D1 Query: ${queryType}`,
      {
        ...context,
        component: 'cloudflare-d1',
      },
      {
        entityType: 'DATABASE_QUERY',
        action: `D1_${queryType}`,
        recoveryTime: duration,
        performanceMetrics: {
          cpuUsage: duration / 10,
          memoryUsage: 0,
          diskIO: duration,
          networkIO: 0,
        },
      },
      {
        query: query.substring(0, 100) + '...', // Truncate for privacy
        queryType,
        success,
        duration,
        rowsAffected,
      }
    );

    const event: CloudflareAnalyticsEvent = {
      timestamp: new Date(),
      eventType: 'D1_QUERY',
      workerId: context.component || 'unknown',
      colo: 'unknown',
      country: 'unknown',
      performance: {
        cpuTime: duration * 100,
        wallTime: duration,
      },
      billing: {
        requests: 1,
        cpuTime: duration * 100,
        d1Queries: 1,
      },
    };

    this.eventBuffer.push(event);
    this.updateD1Metrics(queryType, success, duration, rowsAffected || 0);
  }

  /**
   * Generate Cloudflare-specific optimization recommendations
   */
  public getCloudflareOptimizations(): Array<{
    service: 'WORKERS' | 'KV' | 'R2' | 'D1' | 'CACHE_API';
    issue: string;
    recommendation: string;
    expectedImpact: string;
    implementation: string[];
    estimatedCostSavings: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }> {
    const optimizations = [];
    const metrics = this.performanceMetrics;

    // Workers optimization
    if (metrics.workers.averageCpuTime > 50000) {
      // 50ms CPU time
      optimizations.push({
        service: 'WORKERS' as const,
        issue: `High CPU time: ${(metrics.workers.averageCpuTime / 1000).toFixed(1)}ms avg`,
        recommendation: 'Optimize Worker code and reduce computational overhead',
        expectedImpact: '40-60% reduction in CPU time and billing costs',
        implementation: [
          'Profile Worker execution with Performance API',
          'Optimize hot code paths and algorithms',
          'Implement caching for expensive computations',
          'Use WebAssembly for CPU-intensive tasks',
          'Optimize JSON parsing and serialization',
        ],
        estimatedCostSavings: `$${(metrics.workers.totalRequests * 0.0001).toFixed(2)}/month`,
        priority: 'HIGH',
      });
    }

    // KV optimization
    if (metrics.kv.latency.p95 > 100) {
      optimizations.push({
        service: 'KV' as const,
        issue: `High KV latency: ${metrics.kv.latency.p95.toFixed(1)}ms P95`,
        recommendation: 'Optimize KV key patterns and implement regional caching',
        expectedImpact: '50-70% latency reduction, improved cache hit rates',
        implementation: [
          'Optimize key naming patterns for better locality',
          'Implement key prefixing by region/user',
          'Use batch operations where possible',
          'Implement TTL-based cache warming',
          'Monitor and optimize hot keys',
        ],
        estimatedCostSavings: `$${(metrics.kv.operations * 0.0005).toFixed(2)}/month`,
        priority: 'MEDIUM',
      });
    }

    // R2 optimization
    if (metrics.r2.latency.p95 > 200) {
      optimizations.push({
        service: 'R2' as const,
        issue: `High R2 latency: ${metrics.r2.latency.p95.toFixed(1)}ms P95`,
        recommendation: 'Optimize R2 object access patterns and implement CDN caching',
        expectedImpact: '30-50% latency reduction, 20-40% cost savings',
        implementation: [
          'Implement object prefixing for better organization',
          'Use multipart uploads for large objects',
          'Enable R2 custom domains with Cloudflare CDN',
          'Implement intelligent prefetching',
          'Optimize object metadata usage',
        ],
        estimatedCostSavings: `$${(metrics.r2.dataTransfer * 0.09 * 0.3).toFixed(2)}/month`,
        priority: 'MEDIUM',
      });
    }

    // D1 optimization
    if (metrics.d1.averageQueryTime > 50) {
      optimizations.push({
        service: 'D1' as const,
        issue: `Slow D1 queries: ${metrics.d1.averageQueryTime.toFixed(1)}ms avg`,
        recommendation: 'Optimize D1 queries and implement connection pooling',
        expectedImpact: '60-80% query time reduction, improved throughput',
        implementation: [
          'Add database indexes for frequent queries',
          'Optimize JOIN operations and query structure',
          'Implement query result caching',
          'Use prepared statements for repeated queries',
          'Implement connection pooling and reuse',
        ],
        estimatedCostSavings: `$${(metrics.d1.queries * 0.001).toFixed(2)}/month`,
        priority: 'HIGH',
      });
    }

    return optimizations.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate comprehensive Cloudflare dashboard data
   */
  public getCloudflareAnalytics(): {
    overview: {
      totalRequests: number;
      successRate: number;
      averageResponseTime: number;
      totalCpuTime: number;
      totalCosts: {
        workers: number;
        kv: number;
        r2: number;
        d1: number;
        total: number;
      };
    };
    performance: {
      workers: CloudflarePerformanceMetrics['workers'];
      kv: CloudflarePerformanceMetrics['kv'];
      r2: CloudflarePerformanceMetrics['r2'];
      d1: CloudflarePerformanceMetrics['d1'];
    };
    geographic: {
      topCountries: Array<{ country: string; requests: number; percentage: number }>;
      topColos: Array<{ colo: string; requests: number; latency: number }>;
    };
    alerts: Array<{
      service: string;
      severity: 'WARNING' | 'CRITICAL';
      message: string;
      threshold: number;
      current: number;
    }>;
    optimizations: ReturnType<typeof this.getCloudflareOptimizations>;
  } {
    const totalRequests = this.performanceMetrics.workers.totalRequests;
    const totalCpuTime = (totalRequests * this.performanceMetrics.workers.averageCpuTime) / 1000000; // Convert to seconds

    // Calculate costs (simplified pricing)
    const costs = {
      workers: totalRequests * 0.0001, // $0.0001 per request after free tier
      kv: this.performanceMetrics.kv.operations * 0.0005, // $0.50 per million operations
      r2: this.performanceMetrics.r2.dataTransfer * 0.09, // $0.09 per GB
      d1: this.performanceMetrics.d1.queries * 0.001, // $1 per million queries
      get total() {
        return this.workers + this.kv + this.r2 + this.d1;
      },
    };

    // Generate geographic data
    const topCountries = Array.from(this.performanceMetrics.workers.requestsByCountry.entries())
      .map(([country, requests]) => ({
        country,
        requests,
        percentage: (requests / totalRequests) * 100,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    const topColos = Array.from(this.performanceMetrics.workers.requestsByColo.entries())
      .map(([colo, requests]) => ({
        colo,
        requests,
        latency: this.estimateColoLatency(colo), // This would come from real data
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    // Generate alerts
    const alerts = [];
    if (this.performanceMetrics.workers.successRate < 0.99) {
      alerts.push({
        service: 'Workers',
        severity: 'CRITICAL' as const,
        message: 'High error rate detected',
        threshold: 99,
        current: this.performanceMetrics.workers.successRate * 100,
      });
    }

    if (this.performanceMetrics.kv.latency.p95 > this.config.alertThresholds.kvLatency) {
      alerts.push({
        service: 'KV',
        severity: 'WARNING' as const,
        message: 'High KV latency detected',
        threshold: this.config.alertThresholds.kvLatency,
        current: this.performanceMetrics.kv.latency.p95,
      });
    }

    return {
      overview: {
        totalRequests,
        successRate: this.performanceMetrics.workers.successRate,
        averageResponseTime: this.performanceMetrics.workers.averageResponseTime,
        totalCpuTime,
        totalCosts: costs,
      },
      performance: {
        workers: this.performanceMetrics.workers,
        kv: this.performanceMetrics.kv,
        r2: this.performanceMetrics.r2,
        d1: this.performanceMetrics.d1,
      },
      geographic: {
        topCountries,
        topColos,
      },
      alerts,
      optimizations: this.getCloudflareOptimizations(),
    };
  }

  // Private implementation methods

  private initializeMetrics(): CloudflarePerformanceMetrics {
    return {
      workers: {
        totalRequests: 0,
        successRate: 1.0,
        averageResponseTime: 0,
        averageCpuTime: 0,
        errorsByType: new Map(),
        requestsByCountry: new Map(),
        requestsByColo: new Map(),
      },
      kv: {
        operations: 0,
        hits: 0,
        misses: 0,
        latency: { p50: 0, p95: 0, p99: 0 },
        dataTransfer: 0,
      },
      r2: {
        operations: 0,
        gets: 0,
        puts: 0,
        deletes: 0,
        dataTransfer: 0,
        latency: { p50: 0, p95: 0, p99: 0 },
      },
      d1: {
        queries: 0,
        reads: 0,
        writes: 0,
        averageQueryTime: 0,
        rowsRead: 0,
        rowsWritten: 0,
      },
      analytics: {
        graphqlQueries: 0,
        logpushMessages: 0,
        realTimeEvents: 0,
      },
    };
  }

  private updatePerformanceMetrics(event: CloudflareAnalyticsEvent): void {
    const workers = this.performanceMetrics.workers;

    workers.totalRequests++;
    workers.averageResponseTime =
      (workers.averageResponseTime * (workers.totalRequests - 1) + event.performance.wallTime) /
      workers.totalRequests;
    workers.averageCpuTime =
      (workers.averageCpuTime * (workers.totalRequests - 1) + event.performance.cpuTime) /
      workers.totalRequests;

    // Update geographic data
    const currentCountryRequests = workers.requestsByCountry.get(event.country) || 0;
    workers.requestsByCountry.set(event.country, currentCountryRequests + 1);

    const currentColoRequests = workers.requestsByColo.get(event.colo) || 0;
    workers.requestsByColo.set(event.colo, currentColoRequests + 1);

    // Update error tracking
    if (event.errors && event.errors.length > 0) {
      event.errors.forEach(error => {
        const currentErrors = workers.errorsByType.get(error.name) || 0;
        workers.errorsByType.set(error.name, currentErrors + 1);
      });

      // Recalculate success rate
      const totalErrors = Array.from(workers.errorsByType.values()).reduce(
        (sum, count) => sum + count,
        0
      );
      workers.successRate = (workers.totalRequests - totalErrors) / workers.totalRequests;
    }
  }

  private updateKVMetrics(operation: string, hit: boolean, latency: number, size: number): void {
    const kv = this.performanceMetrics.kv;

    kv.operations++;
    if (hit) kv.hits++;
    else kv.misses++;

    kv.dataTransfer += size;

    // Update latency percentiles (simplified)
    kv.latency.p50 = kv.latency.p50 * 0.9 + latency * 0.1;
    kv.latency.p95 = Math.max(kv.latency.p95 * 0.95, latency);
    kv.latency.p99 = Math.max(kv.latency.p99 * 0.99, latency);
  }

  private updateR2Metrics(
    operation: string,
    success: boolean,
    latency: number,
    size: number
  ): void {
    const r2 = this.performanceMetrics.r2;

    r2.operations++;
    switch (operation) {
      case 'GET':
        r2.gets++;
        break;
      case 'PUT':
        r2.puts++;
        break;
      case 'DELETE':
        r2.deletes++;
        break;
    }

    r2.dataTransfer += size;

    // Update latency percentiles
    r2.latency.p50 = r2.latency.p50 * 0.9 + latency * 0.1;
    r2.latency.p95 = Math.max(r2.latency.p95 * 0.95, latency);
    r2.latency.p99 = Math.max(r2.latency.p99 * 0.99, latency);
  }

  private updateD1Metrics(
    queryType: string,
    success: boolean,
    duration: number,
    rowsAffected: number
  ): void {
    const d1 = this.performanceMetrics.d1;

    d1.queries++;
    d1.averageQueryTime = (d1.averageQueryTime * (d1.queries - 1) + duration) / d1.queries;

    if (queryType === 'READ') {
      d1.reads++;
      d1.rowsRead += rowsAffected;
    } else {
      d1.writes++;
      d1.rowsWritten += rowsAffected;
    }
  }

  private checkCloudflareThresholds(event: CloudflareAnalyticsEvent): void {
    const thresholds = this.config.alertThresholds;

    // Check CPU time threshold
    if (event.performance.cpuTime > thresholds.cpuTime * 1000) {
      // Convert ms to microseconds
      this.analyticsLogger.logWithAnalytics(
        LogLevel.WARN,
        '⚠️ CF High CPU Time Alert',
        { component: 'cloudflare-monitor' },
        {
          entityType: 'CLOUDFLARE_ALERT',
          action: 'CPU_THRESHOLD_BREACH',
          affectedUsers: 1,
          performanceMetrics: {
            cpuUsage: event.performance.cpuTime / 1000,
            memoryUsage: 0,
            diskIO: 0,
            networkIO: event.performance.wallTime,
          },
        },
        {
          threshold: thresholds.cpuTime,
          actual: event.performance.cpuTime / 1000,
          workerId: event.workerId,
          colo: event.colo,
        }
      );
    }
  }

  private estimateColoLatency(colo: string): number {
    // This would come from real latency data
    const coloLatencies: Record<string, number> = {
      LAX: 15,
      DFW: 25,
      ORD: 20,
      ATL: 18,
      LHR: 30,
      CDG: 35,
      NRT: 45,
      SIN: 50,
    };
    return coloLatencies[colo] || 40;
  }

  private startCloudflareMonitoring(): void {
    // Flush events every 30 seconds
    setInterval(() => {
      this.flushEventBuffer();
    }, 30000);

    // Generate alerts every minute
    setInterval(() => {
      this.checkAllThresholds();
    }, 60000);
  }

  private flushEventBuffer(): void {
    if (this.eventBuffer.length === 0) return;

    // In a real implementation, this would send events to Cloudflare Analytics API
    console.log(`📊 Flushing ${this.eventBuffer.length} Cloudflare events to analytics`);

    // Clear buffer
    this.eventBuffer = [];
  }

  private checkAllThresholds(): void {
    const analytics = this.getCloudflareAnalytics();

    // Check for any critical alerts
    const criticalAlerts = analytics.alerts.filter(alert => alert.severity === 'CRITICAL');
    if (criticalAlerts.length > 0) {
      criticalAlerts.forEach(alert => {
        this.analyticsLogger.logWithAnalytics(
          LogLevel.ERROR,
          `🚨 CF Critical Alert: ${alert.message}`,
          { component: 'cloudflare-monitor' },
          {
            entityType: 'CLOUDFLARE_CRITICAL_ALERT',
            action: 'CRITICAL_THRESHOLD_BREACH',
            affectedUsers: Math.floor(analytics.overview.totalRequests * 0.1),
          },
          alert
        );
      });
    }
  }
}

export default CloudflareAnalyticsIntegration;
