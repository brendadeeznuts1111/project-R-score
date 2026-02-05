/**
 * Runtime Optimization Utilities
 *
 * Utilities for working with Bun's runtime optimization flags:
 * - --smol: Memory-optimized mode
 * - --expose-gc: Expose garbage collector
 * - --console-depth: Control console.log depth
 *
 * Reference: https://bun.com/docs/runtime#runtime-%26-process-control
 */

export interface RuntimeConfig {
  smol?: boolean;
  exposeGc?: boolean;
  consoleDepth?: number;
}

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

/**
 * Runtime Optimization Manager
 * Helps manage and monitor Bun runtime optimization features
 */
export class RuntimeOptimization {
  private consoleDepth: number = 2;
  private gcExposed: boolean = false;

  constructor(config?: RuntimeConfig) {
    // Check if --console-depth was set via CLI
    // Note: This would need to be passed from CLI args in real usage
    this.consoleDepth = config?.consoleDepth ?? 2;
    this.gcExposed = config?.exposeGc ?? false;
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    };
  }

  /**
   * Format memory stats for display
   */
  formatMemoryStats(stats?: MemoryStats): string {
    const mem = stats || this.getMemoryStats();
    const formatBytes = (bytes: number) => {
      const mb = bytes / 1024 / 1024;
      return `${mb.toFixed(2)} MB`;
    };

    return [
      `Heap Used: ${formatBytes(mem.heapUsed)}`,
      `Heap Total: ${formatBytes(mem.heapTotal)}`,
      `External: ${formatBytes(mem.external)}`,
      `RSS: ${formatBytes(mem.rss)}`,
    ].join(' | ');
  }

  /**
   * Force garbage collection
   * Works with --expose-gc flag or Bun.gc() (always available)
   */
  forceGC(blocking: boolean = true): void {
    // Bun.gc() is always available, prefer it over global gc()
    Bun.gc(blocking);
  }

  /**
   * Use global gc() if --expose-gc was provided
   * Falls back to Bun.gc() which is always available
   */
  gc(blocking: boolean = true): void {
    if (this.gcExposed && typeof globalThis.gc === 'function') {
      // Use Node.js compatible gc() if available via --expose-gc
      globalThis.gc();
    } else {
      // Always use Bun.gc() - it's always available
      Bun.gc(blocking);
    }
  }

  /**
   * Get current console depth setting
   */
  getConsoleDepth(): number {
    return this.consoleDepth;
  }

  /**
   * Log with controlled depth
   * Simulates --console-depth behavior
   */
  logWithDepth(data: any, depth?: number): void {
    const maxDepth = depth ?? this.consoleDepth;
    console.log(JSON.stringify(data, null, 2, (key, value) => {
      // Simple depth limiting
      if (key && this.getDepth(key, value) > maxDepth) {
        return '[Object]';
      }
      return value;
    }));
  }

  /**
   * Calculate object depth
   */
  private getDepth(key: string, value: any, currentDepth: number = 0): number {
    if (value === null || typeof value !== 'object') {
      return currentDepth;
    }
    if (Array.isArray(value)) {
      return Math.max(...value.map(item => this.getDepth('', item, currentDepth + 1)));
    }
    return Math.max(...Object.values(value).map(val =>
      this.getDepth('', val, currentDepth + 1)
    ));
  }

  /**
   * Memory-optimized operation wrapper
   * Useful when --smol flag is used
   */
  async withMemoryOptimization<T>(
    operation: () => Promise<T> | T,
    cleanupAfter: boolean = true
  ): Promise<T> {
    const memBefore = this.getMemoryStats();

    try {
      const result = await operation();

      if (cleanupAfter) {
        // Force GC after operation in memory-optimized mode
        Bun.gc(false); // Non-blocking GC
      }

      const memAfter = this.getMemoryStats();
      const memoryDelta = memAfter.heapUsed - memBefore.heapUsed;

      return result;
    } catch (error) {
      // Always cleanup on error
      Bun.gc(false);
      throw error;
    }
  }

  /**
   * Compare memory usage before and after operation
   */
  async measureMemoryUsage<T>(
    operation: () => Promise<T> | T
  ): Promise<{ result: T; memoryDelta: number; before: MemoryStats; after: MemoryStats }> {
    const before = this.getMemoryStats();
    Bun.gc(true); // Clean state before measurement

    const result = await operation();

    Bun.gc(true); // Clean state after operation
    const after = this.getMemoryStats();

    const memoryDelta = after.heapUsed - before.heapUsed;

    return {
      result,
      memoryDelta,
      before,
      after,
    };
  }

  /**
   * Display runtime configuration
   */
  displayConfig(): void {
    console.log('🔧 Runtime Configuration:');
    console.log(`  Console Depth: ${this.consoleDepth}`);
    console.log(`  GC Exposed: ${this.gcExposed ? '✅' : '❌ (using Bun.gc())'}`);
    console.log(`  Memory: ${this.formatMemoryStats()}`);
  }

  /**
   * Check if running in --smol mode
   * Note: This is a heuristic - actual detection would require checking process.argv
   */
  isSmolMode(): boolean {
    // Check if --smol is in process arguments
    return process.argv.includes('--smol');
  }
}

/**
 * Convenience function to get memory stats
 */
export function getMemoryStats(): MemoryStats {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rss: usage.rss,
  };
}

/**
 * Convenience function to force GC
 */
export function forceGC(blocking: boolean = true): void {
  Bun.gc(blocking);
}

/**
 * Example usage patterns
 */
export const RuntimeExamples = {
  /**
   * Example: Memory-optimized data processing
   */
  async processLargeDataset() {
    const optimizer = new RuntimeOptimization({ exposeGc: true, consoleDepth: 3 });

    return await optimizer.withMemoryOptimization(async () => {
      // Process large dataset
      const data = Array.from({ length: 100000 }, (_, i) => ({ id: i, value: Math.random() }));

      // Process in batches
      const results = [];
      for (let i = 0; i < data.length; i += 1000) {
        const batch = data.slice(i, i + 1000);
        results.push(...batch.map(item => ({ ...item, processed: true })));

        // Periodic GC in memory-optimized mode
        if (i % 10000 === 0) {
          Bun.gc(false);
        }
      }

      return results;
    });
  },

  /**
   * Example: Measuring memory impact of operations
   */
  async measureMemoryImpact() {
    const optimizer = new RuntimeOptimization();

    const { memoryDelta, before, after } = await optimizer.measureMemoryUsage(() => {
      // Create temporary objects
      const temp = Array.from({ length: 10000 }, () => ({ data: 'x'.repeat(100) }));
      return temp.length;
    });

    console.log(`Memory delta: ${(memoryDelta / 1024 / 1024).toFixed(2)} MB`);
    return { memoryDelta, before, after };
  },
};


