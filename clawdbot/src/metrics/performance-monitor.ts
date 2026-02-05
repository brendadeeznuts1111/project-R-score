/**
 * PerformanceMonitor - Track performance metrics using Bun's optimized APIs.
 */

import type { PerformanceMeasurement, PerformanceSnapshot } from "./types.js";

export class PerformanceMonitor {
  private measurements = new Map<string, number[]>();
  private maxSamples: number;

  constructor(opts?: { maxSamples?: number }) {
    this.maxSamples = opts?.maxSamples ?? 1000;
  }

  /**
   * Record a measurement for a named operation.
   */
  record(name: string, duration: number): void {
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    const samples = this.measurements.get(name)!;
    samples.push(duration);

    // Trim old samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  /**
   * Measure buffer search performance (SIMD-accelerated in Bun).
   */
  measureBufferSearch(
    name: string,
    buffer: Buffer,
    search: string | Buffer,
  ): { found: number; duration: number } {
    const start = performance.now();
    const found = buffer.indexOf(search);
    const duration = performance.now() - start;
    this.record(name, duration);
    return { found, duration };
  }

  /**
   * Measure JSON serialization performance (3x faster in Bun).
   */
  measureJsonSerialization(name: string, data: unknown): { json: string; duration: number } {
    const start = performance.now();
    const json = JSON.stringify(data);
    const duration = performance.now() - start;
    this.record(name, duration);
    return { json, duration };
  }

  /**
   * Measure JSON parsing performance.
   */
  measureJsonParse<T>(name: string, json: string): { data: T; duration: number } {
    const start = performance.now();
    const data = JSON.parse(json) as T;
    const duration = performance.now() - start;
    this.record(name, duration);
    return { data, duration };
  }

  /**
   * Measure async operation duration.
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    this.record(name, duration);
    return { result, duration };
  }

  /**
   * Measure sync operation duration.
   */
  measureSync<T>(name: string, operation: () => T): { result: T; duration: number } {
    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;
    this.record(name, duration);
    return { result, duration };
  }

  /**
   * Measure process spawn time (faster on Linux ARM64 in Bun).
   */
  async measureProcessSpawn(
    name: string,
    command: string[],
    options?: { cwd?: string; env?: Record<string, string> },
  ): Promise<{ exitCode: number; duration: number }> {
    const start = performance.now();
    const proc = Bun.spawn(command, {
      ...options,
      stdout: "ignore",
      stderr: "ignore",
    });
    const exitCode = await proc.exited;
    const duration = performance.now() - start;
    this.record(name, duration);
    return { exitCode, duration };
  }

  /**
   * Get stats for a named measurement.
   */
  getStats(name: string): PerformanceMeasurement {
    const samples = this.measurements.get(name);
    if (!samples || samples.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const sum = samples.reduce((a, b) => a + b, 0);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      count: samples.length,
      avg: sum / samples.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Index] ?? sorted[sorted.length - 1],
    };
  }

  /**
   * Get stats for all measurements.
   */
  getAllStats(): Record<string, PerformanceMeasurement> {
    const stats: Record<string, PerformanceMeasurement> = {};
    for (const name of this.measurements.keys()) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  /**
   * Get a snapshot of all performance data.
   */
  getSnapshot(): PerformanceSnapshot {
    return {
      measurements: this.getAllStats(),
    };
  }

  /**
   * Generate a report string for CLI display.
   */
  generateReport(): string {
    const lines: string[] = [];
    lines.push("Performance Monitor Report");
    lines.push("=".repeat(50));

    for (const [name, _samples] of this.measurements.entries()) {
      const stats = this.getStats(name);
      lines.push("");
      lines.push(`${name}:`);
      lines.push(`  Count:   ${stats.count}`);
      lines.push(`  Average: ${stats.avg.toFixed(2)}ms`);
      lines.push(`  Min:     ${stats.min.toFixed(2)}ms`);
      lines.push(`  Max:     ${stats.max.toFixed(2)}ms`);
      lines.push(`  P95:     ${stats.p95.toFixed(2)}ms`);
    }

    return lines.join("\n");
  }

  /**
   * Get table-friendly data for Bun.inspect.table().
   */
  getTableData(): Array<{
    Operation: string;
    Count: number;
    "Avg (ms)": string;
    "Min (ms)": string;
    "Max (ms)": string;
    "P95 (ms)": string;
  }> {
    return Array.from(this.measurements.keys())
      .map((name) => {
        const stats = this.getStats(name);
        return {
          Operation: name,
          Count: stats.count,
          "Avg (ms)": stats.avg.toFixed(2),
          "Min (ms)": stats.min.toFixed(2),
          "Max (ms)": stats.max.toFixed(2),
          "P95 (ms)": stats.p95.toFixed(2),
        };
      })
      .sort((a, b) => b.Count - a.Count);
  }

  /**
   * Clear all measurements.
   */
  clear(): void {
    this.measurements.clear();
  }

  /**
   * Clear measurements for a specific operation.
   */
  clearOperation(name: string): void {
    this.measurements.delete(name);
  }
}

// Singleton instance for global performance tracking
export const performanceMonitor = new PerformanceMonitor();
