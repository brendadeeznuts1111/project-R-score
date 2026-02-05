// packages/odds-core/src/utils/performance.ts - Performance benchmarks and monitoring

/**
 * Performance monitoring and benchmarking utilities for the metadata system
 * 
 * This module provides tools to measure, track, and optimize the performance
 * of metadata operations including creation, validation, and processing.
 */

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage?: number;
  itemCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Performance benchmark results
 */
export interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  p99Time: number;
  throughput: number; // operations per second
  memoryUsage?: number;
  timestamp: number;
}

/**
 * Performance monitor for tracking operation metrics
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static maxMetrics = 1000;
  private static operationCounts = new Map<string, number>();

  /**
   * Starts timing an operation
   */
  static startTimer(operationName: string, metadata?: Record<string, any>): () => PerformanceMetrics {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    return (): PerformanceMetrics => {
      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();
      const duration = endTime - startTime;

      const metrics: PerformanceMetrics = {
        operationName,
        startTime,
        endTime,
        duration,
        memoryUsage: startMemory && endMemory ? endMemory - startMemory : undefined,
        metadata
      };

      this.recordMetrics(metrics);
      return metrics;
    };
  }

  /**
   * Records metrics for an operation
   */
  static recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    this.operationCounts.set(metrics.operationName, (this.operationCounts.get(metrics.operationName) || 0) + 1);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Gets performance statistics for an operation
   */
  static getStats(operationName: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    p99Duration: number;
    totalDuration: number;
  } | null {
    const operationMetrics = this.metrics.filter(m => m.operationName === operationName);
    
    if (operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      count,
      averageDuration: totalDuration / count,
      minDuration: durations[0],
      maxDuration: durations[count - 1],
      p95Duration: durations[Math.floor(count * 0.95)],
      p99Duration: durations[Math.floor(count * 0.99)],
      totalDuration
    };
  }

  /**
   * Gets all performance statistics
   */
  static getAllStats(): Record<string, ReturnType<typeof PerformanceMonitor.getStats>> {
    const stats: Record<string, ReturnType<typeof PerformanceMonitor.getStats>> = {};
    
    for (const operationName of this.operationCounts.keys()) {
      stats[operationName] = this.getStats(operationName);
    }

    return stats;
  }

  /**
   * Clears all recorded metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
    this.operationCounts.clear();
  }

  /**
   * Gets current memory usage in bytes (if available)
   */
  private static getMemoryUsage(): number | null {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return null;
  }

  /**
   * Gets memory statistics
   */
  static getMemoryStats(): {
    used: number | null;
    total: number | null;
    limit: number | null;
  } {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return { used: null, total: null, limit: null };
  }
}

/**
 * Performance benchmark runner
 */
export class PerformanceBenchmark {
  /**
   * Benchmarks a function with multiple iterations
   */
  static async benchmark<T>(
    operationName: string,
    fn: () => T | Promise<T>,
    options: {
      iterations?: number;
      warmupIterations?: number;
      timeout?: number;
    } = {}
  ): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmupIterations = 10,
      timeout = 30000 // 30 seconds
    } = options;

    // Warmup runs to allow JIT optimization
    for (let i = 0; i < warmupIterations; i++) {
      await fn();
    }

    const durations: number[] = [];
    const startTime = performance.now();
    let memoryBefore = PerformanceMonitor.getMemoryUsage();

    // Run benchmark
    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      
      try {
        await Promise.race([
          fn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Benchmark timeout')), timeout)
          )
        ]);
      } catch (error) {
        console.error(`Benchmark iteration ${i} failed:`, error);
        continue;
      }

      const iterationEnd = performance.now();
      durations.push(iterationEnd - iterationStart);
    }

    const endTime = performance.now();
    const memoryAfter = PerformanceMonitor.getMemoryUsage();

    // Calculate statistics
    const totalTime = endTime - startTime;
    const sortedDurations = durations.sort((a, b) => a - b);
    
    const result: BenchmarkResult = {
      operation: operationName,
      iterations: durations.length,
      totalTime,
      averageTime: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
      minTime: durations.length > 0 ? sortedDurations[0] : 0,
      maxTime: durations.length > 0 ? sortedDurations[durations.length - 1] : 0,
      p95Time: durations.length > 0 ? sortedDurations[Math.floor(durations.length * 0.95)] : 0,
      p99Time: durations.length > 0 ? sortedDurations[Math.floor(durations.length * 0.99)] : 0,
      throughput: durations.length > 0 ? (durations.length / totalTime) * 1000 : 0, // ops per second
      memoryUsage: memoryBefore && memoryAfter ? memoryAfter - memoryBefore : undefined,
      timestamp: Date.now()
    };

    // Record in performance monitor
    PerformanceMonitor.recordMetrics({
      operationName: `benchmark_${operationName}`,
      startTime,
      endTime,
      duration: totalTime,
      itemCount: iterations,
      metadata: result
    });

    return result;
  }

  /**
   * Compares performance of multiple functions
   */
  static async compare<T>(
    operations: Array<{
      name: string;
      fn: () => T | Promise<T>;
    }>,
    options: {
      iterations?: number;
      warmupIterations?: number;
    } = {}
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const operation of operations) {
      console.log(`Benchmarking ${operation.name}...`);
      const result = await this.benchmark(operation.name, operation.fn, options);
      results.push(result);
    }

    // Sort by average time (fastest first)
    results.sort((a, b) => a.averageTime - b.averageTime);

    return results;
  }
}

/**
 * Performance decorator for functions
 */
export function performanceMonitor(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = function (...args: any[]) {
      const endTimer = PerformanceMonitor.startTimer(name, { 
        className: target.constructor.name,
        methodName: propertyName,
        argCount: args.length 
      });

      try {
        const result = method.apply(this, args);
        
        if (result && typeof result.then === 'function') {
          // Handle async functions
          return result
            .then((value: any) => {
              endTimer();
              return value;
            })
            .catch((error: any) => {
              endTimer();
              throw error;
            });
        } else {
          // Handle sync functions
          endTimer();
          return result;
        }
      } catch (error) {
        endTimer();
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Performance-aware cache with LRU eviction and size limits
 */
export class PerformanceCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number; accessCount: number }>();
  private maxSize: number;
  private ttl: number; // time to live in milliseconds

  constructor(maxSize: number = 100, ttl: number = 5 * 60 * 1000) { // 5 minutes default
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Gets a value from cache with performance tracking
   */
  get(key: K): V | undefined {
    const endTimer = PerformanceMonitor.startTimer('cache_get');
    
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        return undefined;
      }

      // Check TTL
      if (Date.now() - item.timestamp > this.ttl) {
        this.cache.delete(key);
        return undefined;
      }

      // Update access statistics
      item.accessCount++;
      return item.value;
    } finally {
      endTimer();
    }
  }

  /**
   * Sets a value in cache with performance tracking
   */
  set(key: K, value: V): void {
    const endTimer = PerformanceMonitor.startTimer('cache_set');
    
    try {
      // Evict if at capacity
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        this.evictLeastRecentlyUsed();
      }

      this.cache.set(key, {
        value,
        timestamp: Date.now(),
        accessCount: 1
      });
    } finally {
      endTimer();
    }
  }

  /**
   * Checks if key exists in cache
   */
  has(key: K): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Deletes a key from cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const stats = PerformanceMonitor.getStats('cache_get');
    const hitCount = stats?.count || 0;
    const missCount = this.cache.size - hitCount;
    const hitRate = hitCount > 0 ? hitCount / (hitCount + missCount) : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      memoryUsage: this.cache.size * 100 // Rough estimate
    };
  }

  /**
   * Evicts least recently used items
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) {
      return;
    }

    // Find item with lowest access count and oldest timestamp
    let lruKey: K | null = null;
    let lruScore = Infinity;

    for (const [key, item] of this.cache.entries()) {
      const score = item.accessCount / (Date.now() - item.timestamp);
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
}

/**
 * Performance utilities for common operations
 */
export class PerformanceUtils {
  /**
   * Measures function execution time
   */
  static async measureTime<T>(
    fn: () => T | Promise<T>,
    operationName: string = 'unknown'
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const endTimer = PerformanceMonitor.startTimer(operationName);
    
    try {
      const result = await fn();
      const metrics = endTimer();
      return { result, metrics };
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  /**
   * Creates a performance-aware wrapper for any function
   */
  static wrapWithPerformance<T extends any[], R>(
    fn: (...args: T) => R | Promise<R>,
    operationName: string
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const { result } = await this.measureTime(() => fn(...args), operationName);
      return result;
    };
  }

  /**
   * Throttles function calls based on performance metrics
   */
  static createThrottledFunction<T extends any[], R>(
    fn: (...args: T) => R | Promise<R>,
    maxCallsPerSecond: number,
    operationName: string = 'throttled'
  ): (...args: T) => Promise<R> {
    const calls: Array<{ time: number; resolve: (value: R) => void; reject: (error: any) => void }> = [];
    let processing = false;

    const processCalls = async () => {
      if (processing) return;
      processing = true;

      while (calls.length > 0) {
        const now = Date.now();
        const recentCalls = calls.filter(call => now - call.time < 1000);
        
        if (recentCalls.length >= maxCallsPerSecond) {
          // Wait until next second
          await new Promise(resolve => setTimeout(resolve, 1000 - (now - recentCalls[0].time)));
          continue;
        }

        const call = calls.shift();
        if (!call) break;

        try {
          const result = await fn(...(call as any).args);
          call.resolve(result);
        } catch (error) {
          call.reject(error);
        }
      }

      processing = false;
    };

    return (...args: T): Promise<R> => {
      return new Promise<R>((resolve, reject) => {
        calls.push({ time: Date.now(), resolve, reject });
        processCalls();
      });
    };
  }

  /**
   * Gets performance report
   */
  static getPerformanceReport(): {
    timestamp: number;
    memory: ReturnType<typeof PerformanceMonitor.getMemoryStats>;
    operations: Record<string, ReturnType<typeof PerformanceMonitor.getStats>>;
    summary: {
      totalOperations: number;
      averageOperationTime: number;
      slowestOperation: string;
      fastestOperation: string;
    };
  } {
    const stats = PerformanceMonitor.getAllStats();
    const operationNames = Object.keys(stats);
    const totalOperations = operationNames.reduce((sum, name) => sum + (stats[name]?.count || 0), 0);
    
    const averageTimes = operationNames.map(name => stats[name]?.averageDuration || 0);
    const averageOperationTime = averageTimes.length > 0 
      ? averageTimes.reduce((sum, time) => sum + time, 0) / averageTimes.length 
      : 0;

    const sortedByAverage = operationNames
      .filter(name => stats[name] !== null)
      .sort((a, b) => (stats[a]?.averageDuration || 0) - (stats[b]?.averageDuration || 0));

    return {
      timestamp: Date.now(),
      memory: PerformanceMonitor.getMemoryStats(),
      operations: stats,
      summary: {
        totalOperations,
        averageOperationTime,
        slowestOperation: sortedByAverage[sortedByAverage.length - 1] || 'none',
        fastestOperation: sortedByAverage[0] || 'none'
      }
    };
  }

  /**
   * Runs a comprehensive performance suite
   */
  static async runPerformanceSuite(): Promise<{
    metadataCreation: BenchmarkResult;
    topicAnalysis: BenchmarkResult;
    qualityAssessment: BenchmarkResult;
    validation: BenchmarkResult;
    comparison: BenchmarkResult[];
  }> {
    // Import here to avoid circular dependencies
    const { MetadataBuilder } = await import('./metadata');
    const { TopicAnalyzer } = await import('./metadata');
    const { QualityAssessor } = await import('./metadata');
    const { MetadataValidator } = await import('./metadata');
    const { MarketTopic, DataCategory } = await import('../types/topics');

    console.log('🚀 Running performance suite...');

    // Benchmark metadata creation
    const metadataCreation = await PerformanceBenchmark.benchmark(
      'metadata_creation',
      () => {
        return new MetadataBuilder(`test_${Math.random()}`)
          .setTopics([MarketTopic.CRYPTO_SPOT])
          .setCategory(DataCategory.MARKET_DATA)
          .build();
      },
      { iterations: 1000 }
    );

    // Benchmark topic analysis
    const topicAnalysis = await PerformanceBenchmark.benchmark(
      'topic_analysis',
      () => {
        return TopicAnalyzer.analyzeTopics({
          symbol: 'BTC/USD',
          exchange: 'binance',
          assetClass: 'crypto'
        });
      },
      { iterations: 1000 }
    );

    // Benchmark quality assessment
    const qualityAssessment = await PerformanceBenchmark.benchmark(
      'quality_assessment',
      () => {
        return QualityAssessor.assessQuality({
          symbol: 'ETH/USD',
          price: 3000,
          size: 2.5,
          exchange: 'coinbase',
          timestamp: Date.now(),
          volume: 1500000
        });
      },
      { iterations: 1000 }
    );

    // Benchmark validation
    const validation = await PerformanceBenchmark.benchmark(
      'validation',
      () => {
        const metadata = new MetadataBuilder(`test_${Math.random()}`)
          .setTopics([MarketTopic.CRYPTO_SPOT])
          .setCategory(DataCategory.MARKET_DATA)
          .build();
        return MetadataValidator.validate(metadata);
      },
      { iterations: 1000 }
    );

    // Compare different approaches
    const comparison = await PerformanceBenchmark.compare([
      {
        name: 'enhanced_metadata',
        fn: () => new MetadataBuilder(`test_${Math.random()}`)
          .setTopics([MarketTopic.CRYPTO_SPOT])
          .setCategory(DataCategory.MARKET_DATA)
          .build()
      },
      {
        name: 'lightweight_metadata',
        fn: () => ({
          id: `test_${Math.random()}`,
          timestamp: Date.now(),
          topic: MarketTopic.CRYPTO_SPOT,
          category: DataCategory.MARKET_DATA,
          source: 'binance',
          quality: 0.95
        })
      }
    ], { iterations: 2000 });

    return {
      metadataCreation,
      topicAnalysis,
      qualityAssessment,
      validation,
      comparison
    };
  }
}
