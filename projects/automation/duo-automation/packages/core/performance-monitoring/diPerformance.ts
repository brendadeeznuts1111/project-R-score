// src/monitoring/diPerformance.ts
import { performance } from 'perf_hooks';

export interface DiMetric {
  function: string;
  resolutionMs: number;
  isMock: boolean;
  timestamp: string;
  error?: string;
  stackTrace?: string;
}

interface FunctionAggregate {
  count: number;
  totalMs: number;
  errors: number;
  lastUpdated: number;
}

class DiPerformanceMonitor {
  private readonly MAX_METRICS = 10000;
  private metrics: DiMetric[] = [];
  private aggregations = new Map<string, FunctionAggregate>();
  private cleanupScheduled = false;

  record(functionName: string, startTime: number, error?: Error) {
    const metric: DiMetric = {
      function: functionName,
      resolutionMs: Math.round(performance.now() - startTime),
      isMock: global.__isDiTestEnvironment === true,
      timestamp: new Date().toISOString(),
      error: error?.message,
      stackTrace: error?.stack,
    };

    // Circular buffer - prevent memory leaks
    if (this.metrics.length >= this.MAX_METRICS) {
      this.metrics.shift(); // Remove oldest
    }
    this.metrics.push(metric);

    // Aggregate by function (sliding window)
    const agg = this.aggregations.get(functionName) || { 
      count: 0, 
      totalMs: 0, 
      errors: 0,
      lastUpdated: Date.now()
    };
    agg.count++;
    agg.totalMs += metric.resolutionMs;
    agg.lastUpdated = Date.now();
    if (error) agg.errors++;
    this.aggregations.set(functionName, agg);

    // Auto-cleanup old aggregations every hour
    this.scheduleCleanup();

    // Production logging (structured)
    if (process.env.NODE_ENV === 'production') {
      this.logMetric(metric);
    }
  }

  private logMetric(metric: DiMetric) {
    // Structured JSON logging for log aggregation systems
    const logEntry = {
      level: metric.error ? 'error' : 'info',
      type: 'di_performance',
      function: metric.function,
      resolutionMs: metric.resolutionMs,
      isMock: metric.isMock,
      timestamp: metric.timestamp,
      ...(metric.error && { error: metric.error }),
    };

    // Use console.log with structured JSON (compatible with DataDog/Splunk)
    console.log(JSON.stringify(logEntry));
  }

  getSummary() {
    const oneHourAgo = Date.now() - 3600000;
    
    return Array.from(this.aggregations.entries())
      .filter(([, agg]) => agg.lastUpdated > oneHourAgo)
      .map(([fn, agg]) => ({
        function: fn,
        avgResolutionMs: agg.count > 0 ? Math.round(agg.totalMs / agg.count) : 0,
        callCount: agg.count,
        errorRate: agg.count > 0 ? ((agg.errors / agg.count) * 100).toFixed(2) + '%' : '0%',
        isHealthy: agg.count > 0 && agg.errors / agg.count < 0.01, // <1% error rate
        lastUpdated: new Date(agg.lastUpdated).toISOString(),
      }));
  }

  getRecentMetrics(limit: number = 100): DiMetric[] {
    return this.metrics.slice(-limit);
  }

  getHealthStatus() {
    const summary = this.getSummary();
    const allHealthy = summary.length === 0 || summary.every(s => s.isHealthy);
    const mockLeakDetected = this.metrics.some(m => m.isMock) && process.env.NODE_ENV === 'production';
    
    return {
      status: allHealthy && !mockLeakDetected ? 'ok' : 'degraded',
      functions: summary,
      memoryUsage: {
        metricsCount: this.metrics.length,
        maxMetrics: this.MAX_METRICS,
        memoryUtilization: `${((this.metrics.length / this.MAX_METRICS) * 100).toFixed(1)}%`,
      },
      alerts: {
        mockLeakDetected,
        errorRateHigh: summary.some(s => !s.isHealthy),
        slowFunctions: summary.filter(s => s.avgResolutionMs > 50).map(s => s.function),
      },
      timestamp: new Date().toISOString(),
    };
  }

  private scheduleCleanup() {
    if (this.cleanupScheduled) return;
    this.cleanupScheduled = true;
    
    setTimeout(() => {
      const oneHourAgo = Date.now() - 3600000;
      
      // Clean old aggregations
      for (const [key, agg] of this.aggregations.entries()) {
        if (agg.lastUpdated < oneHourAgo) {
          this.aggregations.delete(key);
        }
      }
      
      this.cleanupScheduled = false;
    }, 60000); // Run every minute
  }

  reset() {
    this.metrics = [];
    this.aggregations.clear();
    this.cleanupScheduled = false;
  }

  // Export metrics for external monitoring systems
  exportMetrics() {
    return {
      recent: this.getRecentMetrics(1000),
      summary: this.getSummary(),
      health: this.getHealthStatus(),
    };
  }
}

export const diMonitor = new DiPerformanceMonitor();

// Global test marker declaration
declare global {
  var __isDiTestEnvironment: boolean;
}
