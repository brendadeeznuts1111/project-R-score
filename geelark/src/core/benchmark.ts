#!/usr/bin/env bun

/**
 * Dev HQ Performance Benchmarking Suite
 * Core benchmarking utilities for timing, memory analysis, and performance tracking
 *
 * Reference: docs/BENCHMARKING.md
 */

// @ts-ignore - Bun types are available at runtime
import { heapStats } from "bun:jsc";

export class PerformanceTracker {
  static measure<T>(fn: () => T, label: string): T {
    const start = performance.now();
    // @ts-ignore - Bun.nanoseconds is available at runtime
    const startNs = Bun.nanoseconds();

    try {
      return fn();
    } finally {
      const end = performance.now();
      // @ts-ignore - Bun.nanoseconds is available at runtime
      const endNs = Bun.nanoseconds();

      console.log(`⏱️ ${label}:`);
      console.log(`  Time: ${(end - start).toFixed(2)}ms`);
      console.log(`  Precision: ${((endNs - startNs) / 1_000_000).toFixed(3)}ms`);
    }
  }

  static async measureAsync<T>(fn: () => Promise<T>, label: string): Promise<T> {
    const start = performance.now();

    try {
      return await fn();
    } finally {
      const end = performance.now();
      console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
    }
  }

  static measureNanoseconds<T>(fn: () => T, label: string): T {
    // @ts-ignore - Bun.nanoseconds is available at runtime
    const start = Bun.nanoseconds();

    try {
      return fn();
    } finally {
      // @ts-ignore - Bun.nanoseconds is available at runtime
      const end = Bun.nanoseconds();
      console.log(`🔬 ${label}: ${((end - start) / 1_000_000).toFixed(3)}ms (${end - start}ns)`);
    }
  }
}

export class MemoryAnalyzer {
  static snapshot(label: string) {
    const stats = heapStats();

    console.log(`🧠 ${label} - Heap Stats`);
    console.log(`  Size: ${(stats.heapSize / 1024).toFixed(2)}KB`);
    console.log(`  Capacity: ${(stats.heapCapacity / 1024).toFixed(2)}KB`);
    console.log(`  Objects: ${stats.objectCount}`);

    // Track specific object types
    const interestingTypes = ['Array', 'Object', 'Function', 'String'];
    for (const type of interestingTypes) {
      const count = stats.objectTypeCounts[type] || 0;
      if (count > 0) {
        console.log(`  ${type}: ${count}`);
      }
    }

    return stats;
  }

  static compare(before: any, after: any) {
    const diff = after.heapSize - before.heapSize;
    console.log(`📈 Memory change: ${diff > 0 ? '+' : ''}${(diff / 1024).toFixed(2)}KB`);
  }

  static analyzeGrowth(label: string, fn: () => void) {
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);

    const before = this.snapshot(`Before ${label}`);
    fn();
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);

    const after = this.snapshot(`After ${label}`);
    this.compare(before, after);
  }
}

export function measureWithGC<T>(fn: () => T, label: string): T {
  // @ts-ignore - Bun.gc is available at runtime
  Bun.gc(true);

  const before = MemoryAnalyzer.snapshot(`Before ${label}`);
  const result = fn();

  // @ts-ignore - Bun.gc is available at runtime
  Bun.gc(true); // Collect any immediate garbage
  const after = MemoryAnalyzer.snapshot(`After ${label}`);

  MemoryAnalyzer.compare(before, after);
  return result;
}

export class BenchmarkHistory {
  private history: Array<{ timestamp: number; metrics: any }> = [];

  track(label: string, fn: () => any) {
    const start = performance.now();
    const startMemory = heapStats();

    const result = fn();

    const end = performance.now();
    const endMemory = heapStats();

    this.history.push({
      timestamp: Date.now(),
      metrics: {
        label,
        duration: end - start,
        memoryDelta: endMemory.heapSize - startMemory.heapSize,
        objectCount: endMemory.objectCount
      }
    });

    // Keep only last 100 runs
    if (this.history.length > 100) {
      this.history.shift();
    }

    return result;
  }

  getTrends() {
    // Calculate performance trends over time
    return this.history;
  }

  getAverageTime(label: string): number {
    const runs = this.history.filter(h => h.metrics.label === label);
    if (runs.length === 0) return 0;

    const total = runs.reduce((sum, run) => sum + run.metrics.duration, 0);
    return total / runs.length;
  }
}

export class PerformanceDashboard {
  private metrics = new Map<string, number[]>();

  record(metric: string, value: number) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }

    const values = this.metrics.get(metric)!;
    values.push(value);

    // Keep rolling window
    if (values.length > 1000) values.shift();
  }

  getReport() {
    const report: any = {};

    // Use Array.from() to avoid downlevel iteration issues
    for (const [metric, values] of Array.from(this.metrics.entries())) {
      if (values.length === 0) continue;

      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      report[metric] = { avg, min, max, samples: values.length };
    }

    return report;
  }
}

export function runConditionalBenchmarks() {
  const isCI = process.env.CI === 'true';
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isCI) {
    // Run lightweight benchmarks in CI
    console.log("🚀 Running CI benchmarks...");
    runSmokeTests();
  } else if (isDevelopment) {
    // Run comprehensive benchmarks
    console.log("🔬 Running development benchmarks...");
    runFullBenchmarkSuite();
  } else {
    // Production: minimal benchmarks
    console.log("⚡ Running production benchmarks...");
    runCriticalPathBenchmarks();
  }
}

function runSmokeTests() {
  console.log("💨 Smoke Tests");
  PerformanceTracker.measure(() => {
    // Quick performance check
    return Array.from({ length: 1000 }, (_, i) => i * i).reduce((a, b) => a + b, 0);
  }, "Array operations");
}

function runFullBenchmarkSuite() {
  console.log("🔬 Full Benchmark Suite");
  // Comprehensive testing would go here
}

function runCriticalPathBenchmarks() {
  console.log("⚡ Critical Path Benchmarks");
  // Essential performance checks only
}

// Export for use in tests
export const BENCHMARK_UTILS = {
  PerformanceTracker,
  MemoryAnalyzer,
  measureWithGC,
  BenchmarkHistory,
  PerformanceDashboard,
  runConditionalBenchmarks
};
