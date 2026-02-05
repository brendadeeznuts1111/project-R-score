// packages/odds-core/src/performance.ts - Bun runtime optimizations
import { heapStats } from 'bun:jsc';
import { BunUtils, OddsProtocolUtils } from './bun-utils';

export class BunPerformanceMonitor {
  private samples: number[] = [];
  private memorySnapshots: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = [];
  private nanosecondSamples: number[] = [];
  
  // Use Bun's microsecond precision timing
  measureExecution<T>(fn: () => T): { result: T; duration: number; nanoseconds: number } {
    const start = performance.now();
    const startNanos = BunUtils.getNanoseconds();
    const result = fn();
    const duration = performance.now() - start;
    const nanoseconds = BunUtils.getNanoseconds() - startNanos;
    
    this.samples.push(duration);
    this.nanosecondSamples.push(nanoseconds);
    
    if (this.samples.length > 1000) {
      this.samples = this.samples.slice(-1000);
      this.nanosecondSamples = this.nanosecondSamples.slice(-1000);
    }
    
    return { result, duration, nanoseconds };
  }
  
  // Async version with Bun's scheduler
  async measureExecutionAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number; nanoseconds: number }> {
    const start = performance.now();
    const startNanos = BunUtils.getNanoseconds();
    const result = await fn();
    const duration = performance.now() - start;
    const nanoseconds = BunUtils.getNanoseconds() - startNanos;
    
    this.samples.push(duration);
    this.nanosecondSamples.push(nanoseconds);
    
    if (this.samples.length > 1000) {
      this.samples = this.samples.slice(-1000);
      this.nanosecondSamples = this.nanosecondSamples.slice(-1000);
    }
    
    return { result, duration, nanoseconds };
  }
  
  // Enhanced memory monitoring with Bun utilities
  getMemoryStats() {
    const stats = heapStats();
    const nodeStats = process.memoryUsage();
    
    return {
      heapSize: stats.heapSize,
      heapUsed: stats.heapUsed,
      externalMemory: stats.externalMemory,
      nodeMemory: nodeStats,
      heapUtilization: stats.heapUsed / stats.heapSize,
      bunInfo: BunUtils.getBunInfo()
    };
  }
  
  // Memory tracking with enhanced metrics
  trackMemoryUsage<T>(data: T): { data: T; memoryUsage: number; sizeEstimate: string; detailed: any } {
    const memoryUsage = BunUtils.estimateMemoryUsage(data);
    const sizeEstimate = memoryUsage > 1024 * 1024 
      ? `${(memoryUsage / 1024 / 1024).toFixed(2)} MB`
      : memoryUsage > 1024 
        ? `${(memoryUsage / 1024).toFixed(2)} KB`
        : `${memoryUsage} bytes`;
    
    return {
      data,
      memoryUsage,
      sizeEstimate,
      detailed: {
        type: typeof data,
        isBuffer: Buffer.isBuffer(data),
        isArray: Array.isArray(data),
        keys: typeof data === 'object' && data !== null ? Object.keys(data).length : 0,
        timestamp: Date.now()
      }
    };
  }
  
  // Memory tracking over time
  trackMemoryUsage(): void {
    const snapshot = {
      timestamp: Date.now(),
      usage: process.memoryUsage()
    };
    
    this.memorySnapshots.push(snapshot);
    
    // Keep only last 100 snapshots
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots = this.memorySnapshots.slice(-100);
    }
  }
  
  getMemoryTrends() {
    if (this.memorySnapshots.length < 2) {
      return { trend: 'insufficient_data', rate: 0 };
    }
    
    const recent = this.memorySnapshots.slice(-10);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    
    const timeDelta = newest.timestamp - oldest.timestamp;
    const memoryDelta = newest.usage.heapUsed - oldest.usage.heapUsed;
    const rate = memoryDelta / timeDelta; // bytes per millisecond
    
    return {
      trend: rate > 1000 ? 'increasing' : rate < -1000 ? 'decreasing' : 'stable',
      rate: rate,
      samples: recent.length,
      memoryDelta: memoryDelta,
      timeDelta: timeDelta
    };
  }
  
  // Enhanced async batch processing with Bun utilities
  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 100
  ): Promise<{ results: R[]; metrics: any }> {
    const timer = OddsProtocolUtils.createTimer();
    const results: R[] = [];
    const batchMetrics: Array<{ batchSize: number; duration: number; memoryUsage: number }> = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchStart = performance.now();
      const batchMemoryBefore = process.memoryUsage().heapUsed;
      
      // Use Bun's scheduler for optimal batch timing
      await scheduler.postTask(async () => {
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);
      }, { priority: 'user-visible' });
      
      const batchDuration = performance.now() - batchStart;
      const batchMemoryAfter = process.memoryUsage().heapUsed;
      
      batchMetrics.push({
        batchSize: batch.length,
        duration: batchDuration,
        memoryUsage: batchMemoryAfter - batchMemoryBefore
      });
      
      // Yield to Bun's event loop
      await BunUtils.sleep(0);
    }
    
    return {
      results,
      metrics: {
        totalDuration: timer.elapsed(),
        totalNanoseconds: timer.elapsedNanos(),
        batchCount: batchMetrics.length,
        averageBatchDuration: batchMetrics.reduce((sum, m) => sum + m.duration, 0) / batchMetrics.length,
        totalMemoryDelta: batchMetrics.reduce((sum, m) => sum + m.memoryUsage, 0),
        batches: batchMetrics
      }
    };
  }
  
  // Enhanced performance statistics with nanosecond precision
  getPerformanceStats() {
    if (this.samples.length === 0) {
      return {
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        p95: 0,
        p99: 0,
        avgNanoseconds: 0,
        minNanoseconds: 0,
        maxNanoseconds: 0
      };
    }
    
    const sorted = [...this.samples].sort((a, b) => a - b);
    const sortedNanos = [...this.nanosecondSamples].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const sumNanos = sortedNanos.reduce((a, b) => a + b, 0);
    
    return {
      count,
      avg: sum / count,
      min: sorted[0],
      max: sorted[count - 1],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
      avgNanoseconds: sumNanos / count,
      minNanoseconds: sortedNanos[0],
      maxNanoseconds: sortedNanos[count - 1]
    };
  }
  
  // Reset all metrics
  reset(): void {
    this.samples = [];
    this.nanosecondSamples = [];
    this.memorySnapshots = [];
  }
  
  // Export enhanced metrics for monitoring
  exportMetrics() {
    return {
      performance: this.getPerformanceStats(),
      memory: this.getMemoryStats(),
      memoryTrends: this.getMemoryTrends(),
      bun: BunUtils.getBunInfo(),
      timestamp: Date.now(),
      nanoseconds: BunUtils.getNanoseconds()
    };
  }
  
  // Create performance report
  generateReport(): string {
    const stats = this.getPerformanceStats();
    const memoryStats = this.getMemoryStats();
    const trends = this.getMemoryTrends();
    
    return `
📊 Performance Report (Bun v${memoryStats.bunInfo.version})
════════════════════════════════════════════════════════════

⏱️  Execution Statistics:
   Samples: ${stats.count}
   Average: ${stats.avg.toFixed(2)}ms (${stats.avgNanoseconds.toFixed(0)}ns)
   Range: ${stats.min.toFixed(2)}ms - ${stats.max.toFixed(2)}ms
   P95: ${stats.p95.toFixed(2)}ms | P99: ${stats.p99.toFixed(2)}ms

💾 Memory Statistics:
   Heap Used: ${(memoryStats.nodeMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
   Heap Total: ${(memoryStats.nodeMemory.heapTotal / 1024 / 1024).toFixed(2)} MB
   External: ${(memoryStats.nodeMemory.external / 1024 / 1024).toFixed(2)} MB
   Utilization: ${(memoryStats.heapUtilization * 100).toFixed(1)}%

📈 Memory Trends:
   Trend: ${trends.trend}
   Rate: ${(trends.rate / 1024).toFixed(2)} KB/s
   Samples: ${trends.samples}

🔧 Runtime Info:
   Bun Version: ${memoryStats.bunInfo.version}
   Revision: ${memoryStats.bunInfo.revision.substring(0, 7)}
   Uptime: ${(process.uptime() / 60).toFixed(1)} minutes

Generated: ${new Date().toISOString()}
════════════════════════════════════════════════════════════
    `.trim();
  }
}

// Singleton instance
export const performanceMonitor = new BunPerformanceMonitor();

// Enhanced decorator with Bun utilities
export function measurePerformance<T extends (...args: any[]) => any>(
  target: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
) {
  const originalMethod = descriptor.value!;
  
  descriptor.value = function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const { result, duration, nanoseconds } = performanceMonitor.measureExecution(() => 
      originalMethod.apply(this, args)
    );
    
    if (Bun.env.NODE_ENV === 'development') {
      console.log(`⏱️  ${propertyKey}: ${duration.toFixed(2)}ms (${nanoseconds}ns)`);
    }
    
    return result;
  } as T;
  
  return descriptor;
}

// Enhanced async decorator
export function measurePerformanceAsync<T extends (...args: any[]) => Promise<any>>(
  target: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>
) {
  const originalMethod = descriptor.value!;
  
  descriptor.value = async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const { result, duration, nanoseconds } = await performanceMonitor.measureExecutionAsync(() => 
      originalMethod.apply(this, args)
    );
    
    if (Bun.env.NODE_ENV === 'development') {
      console.log(`⏱️  ${propertyKey}: ${duration.toFixed(2)}ms (${nanoseconds}ns) (async)`);
    }
    
    return result;
  } as T;
  
  return descriptor;
}

// Enhanced utility functions with Bun utilities
export function createPerformanceTimer() {
  const start = performance.now();
  const startNanos = BunUtils.getNanoseconds();
  
  return {
    elapsed: () => performance.now() - start,
    elapsedNanos: () => BunUtils.getNanoseconds() - startNanos,
    log: (label: string) => {
      const duration = performance.now() - start;
      const nanos = BunUtils.getNanoseconds() - startNanos;
      console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms (${nanos}ns)`);
    }
  };
}

export async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number,
  timeoutError: Error = new Error('Operation timed out')
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(timeoutError), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

// Enhanced compression utilities for performance monitoring
export function compressForBenchmark(data: any): { compressed: Uint8Array; originalSize: number; compressionRatio: number; compressionTime: number } {
  const timer = OddsProtocolUtils.createTimer();
  const jsonString = JSON.stringify(data);
  const originalBuffer = Buffer.from(jsonString);
  const compressed = BunUtils.compressData(originalBuffer, 'zstd');
  const compressionTime = timer.elapsed();
  
  return {
    compressed,
    originalSize: originalBuffer.length,
    compressionRatio: compressed.length / originalBuffer.length,
    compressionTime
  };
}

export default performanceMonitor;
