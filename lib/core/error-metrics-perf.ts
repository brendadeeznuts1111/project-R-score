// lib/core/error-metrics-perf.ts — Performance-optimized error metrics
// Optimizations: O(n) export, in-place cleanup, cached error rates

import {
  ErrorMetricsCollector,
  AlertSeverity,
  AlertChannel,
  type AlertConfig,
  type ErrorMetric,
  type ErrorAggregation,
  type MetricsExport,
} from './error-metrics';

/**
 * Optimized error metrics collector with performance improvements:
 * - O(n) single-pass exportMetrics (was O(n²))
 * - In-place array filtering (no new allocations)
 * - Cached error rate calculations with TTL
 * - Pre-sorted metric iteration
 */
export class OptimizedErrorMetricsCollector extends ErrorMetricsCollector {
  private rateCache = new Map<number, { value: number; timestamp: number }>();
  private readonly RATE_CACHE_TTL_MS = 1000;
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

  constructor(config?: ConstructorParameters<typeof ErrorMetricsCollector>[0]) {
    super(config);
    // Override cleanup with optimized version
    this.startOptimizedCleanup();
  }

  /**
   * O(n) single-pass export using bucket-based aggregation
   * Replaces O(n²) nested loop approach
   */
  exportMetricsOptimized(windowMs: number = 60 * 60 * 1000): MetricsExport {
    const now = Date.now();
    const startTime = now - windowMs;
    const windowSize = 5 * 60 * 1000; // 5 minute buckets
    
    // Single-pass bucketing
    const buckets = new Map<number, BucketData>();
    
    // Access metrics array directly (it's protected in parent)
    const metrics = (this as any).metrics as ErrorMetric[];
    
    for (const metric of metrics) {
      if (metric.timestamp < startTime) continue;
      
      const windowIndex = Math.floor((metric.timestamp - startTime) / windowSize);
      const windowStart = startTime + (windowIndex * windowSize);
      
      let bucket = buckets.get(windowStart);
      if (!bucket) {
        bucket = {
          byCode: {},
          bySeverity: {},
          byService: {},
          byEndpoint: {},
          errorCounts: new Map(),
          count: 0,
          firstHalfCount: 0,
          secondHalfCount: 0,
        };
        buckets.set(windowStart, bucket);
      }
      
      // Aggregate in-place
      bucket.count++;
      bucket.byCode[metric.code] = (bucket.byCode[metric.code] || 0) + 1;
      bucket.bySeverity[metric.severity] = (bucket.bySeverity[metric.severity] || 0) + 1;
      
      if (metric.service) {
        bucket.byService[metric.service] = (bucket.byService[metric.service] || 0) + 1;
      }
      if (metric.endpoint) {
        bucket.byEndpoint[metric.endpoint] = (bucket.byEndpoint[metric.endpoint] || 0) + 1;
      }
      
      const key = `${metric.code}:${metric.message}`;
      const existing = bucket.errorCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        bucket.errorCounts.set(key, { code: metric.code, message: metric.message, count: 1 });
      }
      
      // Track trend data
      const midPoint = windowStart + (windowSize / 2);
      if (metric.timestamp < midPoint) {
        bucket.firstHalfCount++;
      } else {
        bucket.secondHalfCount++;
      }
    }
    
    // Build aggregations from buckets
    const aggregations: ErrorAggregation[] = [];
    for (let t = startTime; t < now; t += windowSize) {
      const bucket = buckets.get(t);
      const period = { start: t, end: Math.min(t + windowSize, now) };
      const durationMinutes = (period.end - period.start) / (60 * 1000);
      
      aggregations.push({
        period,
        total: bucket?.count || 0,
        byCode: bucket?.byCode || {},
        bySeverity: bucket?.bySeverity || {},
        byService: bucket?.byService || {},
        byEndpoint: bucket?.byEndpoint || {},
        topErrors: bucket 
          ? Array.from(bucket.errorCounts.values())
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
          : [],
        trend: bucket 
          ? this.calculateTrendFromCounts(bucket.firstHalfCount, bucket.secondHalfCount)
          : 'stable',
        errorRate: durationMinutes > 0 ? (bucket?.count || 0) / durationMinutes : 0,
      });
    }

    return {
      timestamp: now,
      windowMs,
      aggregations,
      alerts: (this as any).alerts.filter((a: any) => a.timestamp >= startTime),
    };
  }

  /**
   * Cached error rate with TTL
   */
  getCurrentErrorRateCached(windowMs: number = 5 * 60 * 1000): number {
    const now = Date.now();
    const cached = this.rateCache.get(windowMs);
    
    if (cached && (now - cached.timestamp) < this.RATE_CACHE_TTL_MS) {
      return cached.value;
    }
    
    // Calculate from parent
    const rate = super.getCurrentErrorRate(windowMs);
    
    // Cache result
    this.rateCache.set(windowMs, { value: rate, timestamp: now });
    
    // Cleanup old cache entries
    if (this.rateCache.size > 10) {
      const cutoff = now - this.RATE_CACHE_TTL_MS;
      for (const [key, entry] of this.rateCache) {
        if (entry.timestamp < cutoff) {
          this.rateCache.delete(key);
        }
      }
    }
    
    return rate;
  }

  /**
   * In-place cleanup filter (no new array allocation)
   */
  private startOptimizedCleanup(): void {
    // Clear parent's cleanup interval
    const existingInterval = (this as any).cleanupInterval;
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    
    // Set up optimized cleanup
    setInterval(() => {
      const cutoff = Date.now() - ((this as any).config.retentionMs || 24 * 60 * 60 * 1000);
      
      // In-place filter for metrics
      const metrics = (this as any).metrics as ErrorMetric[];
      this.inPlaceTimeFilter(metrics, cutoff);
      
      // In-place filter for alerts
      const alerts = (this as any).alerts as any[];
      this.inPlaceTimeFilter(alerts, cutoff);
      
      // Invalidate rate cache
      this.rateCache.clear();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * In-place filter that mutates array instead of creating new one
   */
  private inPlaceTimeFilter<T extends { timestamp: number }>(
    arr: T[], 
    cutoff: number
  ): void {
    let writeIndex = 0;
    
    for (let readIndex = 0; readIndex < arr.length; readIndex++) {
      if (arr[readIndex].timestamp >= cutoff) {
        arr[writeIndex++] = arr[readIndex];
      }
    }
    
    arr.length = writeIndex;
  }

  private calculateTrendFromCounts(
    firstHalf: number, 
    secondHalf: number
  ): 'increasing' | 'decreasing' | 'stable' {
    if (firstHalf + secondHalf < 10) return 'stable';
    
    const ratio = secondHalf / (firstHalf || 1);
    if (ratio > 1.5) return 'increasing';
    if (ratio < 0.67) return 'decreasing';
    return 'stable';
  }
}

interface BucketData {
  byCode: Record<string, number>;
  bySeverity: Record<string, number>;
  byService: Record<string, number>;
  byEndpoint: Record<string, number>;
  errorCounts: Map<string, { code: string; message: string; count: number }>;
  count: number;
  firstHalfCount: number;
  secondHalfCount: number;
}

// Performance comparison utility
export function comparePerformance(): void {
  console.log('🔬 Performance Comparison: Original vs Optimized\n');
  
  // Simulate high load
  const metrics = new ErrorMetricsCollector();
  const optimized = new OptimizedErrorMetricsCollector();
  
  // Add test data
  for (let i = 0; i < 10000; i++) {
    const error = new Error(`Test error ${i}`);
    (metrics as any).record(error, { service: 'test' });
    (optimized as any).record(error, { service: 'test' });
  }
  
  // Benchmark original
  const start1 = performance.now();
  (metrics as any).exportMetrics(60 * 60 * 1000);
  const time1 = performance.now() - start1;
  
  // Benchmark optimized
  const start2 = performance.now();
  optimized.exportMetricsOptimized(60 * 60 * 1000);
  const time2 = performance.now() - start2;
  
  console.log(`Original exportMetrics:  ${time1.toFixed(2)}ms`);
  console.log(`Optimized exportMetrics: ${time2.toFixed(2)}ms`);
  console.log(`Speedup: ${(time1 / time2).toFixed(1)}x`);
  
  metrics.destroy();
  optimized.destroy();
}

// Entry guard
if (import.meta.main) {
  comparePerformance();
}
