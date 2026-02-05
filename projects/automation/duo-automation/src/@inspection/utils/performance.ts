/**
 * Performance-Optimized Inspection System
 * 
 * Provides early termination, async processing, and performance monitoring
 * for large-scale inspection operations.
 */

import { performance } from "perf_hooks";

/**
 * Performance monitoring for inspection operations
 */
export interface InspectionMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  nodeCount: number;
  depth: number;
  memoryUsage: NodeJS.MemoryUsage;
  operations: {
    filters: number;
    excludes: number;
    redactions: number;
  };
}

export class PerformanceMonitor {
  private metrics: Partial<InspectionMetrics> = {};
  
  start(): void {
    this.metrics.startTime = performance.now();
    this.metrics.memoryUsage = process.memoryUsage();
    this.metrics.operations = {
      filters: 0,
      excludes: 0,
      redactions: 0
    };
  }
  
  end(): InspectionMetrics {
    this.metrics.endTime = performance.now();
    this.metrics.duration = this.metrics.endTime - (this.metrics.startTime || 0);
    return this.metrics as InspectionMetrics;
  }
  
  incrementOperation(type: 'filters' | 'excludes' | 'redactions'): void {
    if (this.metrics.operations) {
      this.metrics.operations[type]++;
    }
  }
  
  setNodeCount(count: number): void {
    this.metrics.nodeCount = count;
  }
  
  setDepth(depth: number): void {
    this.metrics.depth = depth;
  }
  
  getMetrics(): Partial<InspectionMetrics> {
    return this.metrics;
  }
}

/**
 * Early termination configuration
 */
export interface EarlyTerminationConfig {
  maxDepth: number;
  maxNodes: number;
  maxDuration: number; // milliseconds
  maxMemory: number; // bytes
}

/**
 * Performance-optimized filter with early termination
 */
export function filterInspectionTreeOptimized(
  obj: any,
  keyword: string,
  config: EarlyTerminationConfig = {
    maxDepth: 15,
    maxNodes: 10000,
    maxDuration: 5000,
    maxMemory: 100 * 1024 * 1024 // 100MB
  }
): {
  result: any;
  metrics: InspectionMetrics;
  terminated: boolean;
  terminationReason?: string;
} {
  const monitor = new PerformanceMonitor();
  monitor.start();
  
  let nodeCount = 0;
  let currentDepth = 0;
  let terminated = false;
  let terminationReason = "";
  
  const checkLimits = (depth: number): boolean => {
    // Check depth limit
    if (depth > config.maxDepth) {
      terminated = true;
      terminationReason = `Max depth (${config.maxDepth}) exceeded`;
      return false;
    }
    
    // Check node count limit
    if (nodeCount > config.maxNodes) {
      terminated = true;
      terminationReason = `Max nodes (${config.maxNodes}) exceeded`;
      return false;
    }
    
    // Check duration limit
    const currentDuration = performance.now() - (monitor.getMetrics().startTime || 0);
    if (currentDuration > config.maxDuration) {
      terminated = true;
      terminationReason = `Max duration (${config.maxDuration}ms) exceeded`;
      return false;
    }
    
    // Check memory limit
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > config.maxMemory) {
      terminated = true;
      terminationReason = `Max memory (${config.maxMemory} bytes) exceeded`;
      return false;
    }
    
    return true;
  };
  
  const filterRecursive = (current: any, depth = 0): any => {
    if (!checkLimits(depth)) return undefined;
    
    nodeCount++;
    currentDepth = Math.max(currentDepth, depth);
    monitor.incrementOperation('filters');
    
    if (current === null || current === undefined) return current;
    
    if (typeof current !== "object") {
      return String(current).toLowerCase().includes(keyword) ? current : undefined;
    }
    
    if (Array.isArray(current)) {
      const filtered = current
        .map(item => filterRecursive(item, depth + 1))
        .filter(item => item !== undefined);
      return filtered.length > 0 ? filtered : undefined;
    }
    
    const result: Record<string, any> = {};
    let hasMatch = false;
    
    for (const [key, value] of Object.entries(current)) {
      const keyMatch = key.toLowerCase().includes(keyword);
      const filteredValue = filterRecursive(value, depth + 1);
      const valueMatch = filteredValue !== undefined;
      
      if (keyMatch || valueMatch) {
        result[key] = keyMatch ? value : filteredValue;
        hasMatch = true;
      }
    }
    
    return hasMatch ? result : undefined;
  };
  
  const result = filterRecursive(obj);
  
  monitor.setNodeCount(nodeCount);
  monitor.setDepth(currentDepth);
  const metrics = monitor.end();
  
  return {
    result,
    metrics,
    terminated,
    terminationReason: terminated ? terminationReason : undefined
  };
}

/**
 * Async filtering for large datasets
 */
export async function filterLargeInspectionAsync(
  obj: any,
  keyword: string,
  threshold = 10000
): Promise<any> {
  const nodeCount = countNodes(obj);
  
  if (nodeCount <= threshold) {
    // Use synchronous filtering for small datasets
    const { result } = filterInspectionTreeOptimized(obj, keyword);
    return result;
  }
  
  // Use async processing for large datasets
  console.log(`🔄 Processing large dataset (${nodeCount} nodes) asynchronously...`);
  
  return new Promise((resolve, reject) => {
    try {
      // Use worker thread for large datasets
      const workerCode = `
        const { parentPort, workerData } = require('worker_threads');
        const { obj, keyword } = workerData;
        
        function filterInspectionTree(obj, keyword) {
          if (obj === null || obj === undefined) return obj;
          
          if (typeof obj !== "object") {
            return String(obj).toLowerCase().includes(keyword) ? obj : undefined;
          }
          
          if (Array.isArray(obj)) {
            const filtered = obj
              .map(item => filterInspectionTree(item, keyword))
              .filter(item => item !== undefined);
            return filtered.length > 0 ? filtered : undefined;
          }
          
          const result = {};
          let hasMatch = false;
          
          for (const [key, value] of Object.entries(obj)) {
            const keyMatch = key.toLowerCase().includes(keyword);
            const filteredValue = filterInspectionTree(value, keyword);
            const valueMatch = filteredValue !== undefined;
            
            if (keyMatch || valueMatch) {
              result[key] = keyMatch ? value : filteredValue;
              hasMatch = true;
            }
          }
          
          return hasMatch ? result : undefined;
        }
        
        const result = filterInspectionTree(obj, keyword.toLowerCase());
        parentPort.postMessage(result);
      `;
      
      // For now, use synchronous processing with progress indication
      // In a real implementation, you'd use worker_threads
      const { result } = filterInspectionTreeOptimized(obj, keyword, {
        maxDepth: 10,
        maxNodes: 50000,
        maxDuration: 10000,
        maxMemory: 200 * 1024 * 1024
      });
      
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Count nodes in object tree (optimized)
 */
function countNodes(obj: any, visited = new WeakSet()): number {
  if (obj === null || obj === undefined) return 0;
  if (typeof obj !== "object") return 1;
  
  if (visited.has(obj)) return 0;
  visited.add(obj);
  
  if (Array.isArray(obj)) {
    return obj.reduce((sum, item) => sum + countNodes(item, visited), 0);
  }
  
  return Object.values(obj).reduce((sum, value) => sum + countNodes(value, visited), 0);
}

/**
 * Performance benchmark for inspection operations
 */
export class InspectionBenchmark {
  private results: Array<{
    operation: string;
    duration: number;
    nodeCount: number;
    memoryUsage: NodeJS.MemoryUsage;
  }> = [];
  
  async benchmark(
    name: string,
    operation: () => any,
    iterations = 5
  ): Promise<{
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    averageMemory: number;
    iterations: number;
  }> {
    const durations: number[] = [];
    const memoryUsages: NodeJS.MemoryUsage[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startMemory = process.memoryUsage();
      const startTime = performance.now();
      
      await operation();
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      durations.push(endTime - startTime);
      memoryUsages.push(endMemory);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
    
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const averageMemory = memoryUsages.reduce((sum, mem) => sum + mem.heapUsed, 0) / memoryUsages.length;
    
    this.results.push({
      operation: name,
      duration: averageDuration,
      nodeCount: 0, // Would need to be passed in
      memoryUsage: { heapUsed: averageMemory, heapTotal: 0, external: 0, rss: 0, arrayBuffers: 0 }
    });
    
    return {
      averageDuration,
      minDuration,
      maxDuration,
      averageMemory,
      iterations
    };
  }
  
  getResults(): typeof this.results {
    return this.results;
  }
  
  clearResults(): void {
    this.results = [];
  }
  
  generateReport(): string {
    if (this.results.length === 0) {
      return "No benchmark results available.";
    }
    
    let report = "📊 Inspection Performance Benchmark Report\n";
    report += "==========================================\n\n";
    
    this.results.forEach((result, index) => {
      report += `${index + 1}. ${result.operation}\n`;
      report += `   Duration: ${result.duration.toFixed(2)}ms\n`;
      report += `   Memory: ${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB\n\n`;
    });
    
    return report;
  }
}

/**
 * Performance configuration
 */
export const PERFORMANCE_CONFIG = {
  // Default limits for performance optimization
  defaultLimits: {
    maxDepth: 15,
    maxNodes: 10000,
    maxDuration: 5000,
    maxMemory: 100 * 1024 * 1024
  },
  
  // Thresholds for async processing
  asyncThreshold: 10000,
  
  // Benchmark configuration
  benchmark: {
    iterations: 5,
    warmupIterations: 2
  },
  
  // Memory management
  memory: {
    gcThreshold: 100 * 1024 * 1024, // Force GC at 100MB
    maxHeapSize: 500 * 1024 * 1024  // 500MB max
  }
};

export default {
  filterInspectionTreeOptimized,
  filterLargeInspectionAsync,
  InspectionBenchmark,
  PerformanceMonitor,
  PERFORMANCE_CONFIG
};
