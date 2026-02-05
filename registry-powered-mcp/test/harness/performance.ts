/**
 * Performance Test Kit
 * Reusable harness for performance testing using Bun.nanoseconds()
 *
 * P1 Priority: Centralizes timing patterns across test suites
 * APIs Used: Bun.nanoseconds(), Bun.gc()
 *
 * @example
 * ```typescript
 * import { measure, assertSLA, PerformanceStats } from "test/harness/performance";
 *
 * test("operation meets SLA", async () => {
 *   const result = await measure(() => myOperation());
 *   assertSLA(result.durationMs, SLA_TARGETS.DISPATCH_MS);
 * });
 * ```
 */

// Re-export core types from benchmarks package
export {
  BenchmarkStats,
  compareBenchmarks,
} from "../../packages/benchmarks/src/stats";

// Import for internal use
import {
  getPerformanceTier as _getPerformanceTier,
} from "../../packages/benchmarks/src/constants";

export {
  PERFORMANCE_TARGETS,
  PERFORMANCE_TIERS,
  BENCHMARK_CONFIG,
  getPerformanceTier,
  type PerformanceTarget,
  type PerformanceTier,
} from "../../packages/benchmarks/src/constants";

// Internal reference to getPerformanceTier
const getPerformanceTier = _getPerformanceTier;

/**
 * SLA Targets - Commonly used performance thresholds
 * Re-exported from PERFORMANCE_TARGETS for convenience
 */
export const SLA_TARGETS = {
  // Routing (microsecond precision)
  DISPATCH_MS: 0.03,
  ROUTE_TEST_MS: 0.01,
  PARAMETER_EXTRACTION_MS: 0.01,

  // HTTP Cycle
  REQUEST_CYCLE_P99_MS: 10.8,
  HEALTH_CHECK_MS: 5,

  // Parsing
  TOML_PARSE_MS: 0.05,
  COOKIE_PARSE_MS: 0.01,

  // Security
  SECURITY_VALIDATION_MS: 1,
  DNS_LOOKUP_MS: 50,

  // Build
  TRANSPILE_MS: 10,
  BUILD_COLD_MS: 5000,
  BUILD_WARM_MS: 2000,
} as const;

/**
 * Timing result from measure/measureAsync
 */
export interface TimingResult<T> {
  value: T;
  durationNs: number;
  durationMs: number;
  durationUs: number;
}

/**
 * Performance statistics summary
 */
export interface PerformanceStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  stdDev: number;
  cv: number; // Coefficient of variation
}

/**
 * Measure synchronous operation with nanosecond precision
 *
 * @example
 * const result = measure(() => router.match("/api/users/123"));
 * expect(result.durationMs).toBeLessThan(SLA_TARGETS.DISPATCH_MS);
 */
export function measure<T>(fn: () => T): TimingResult<T> {
  const start = Bun.nanoseconds();
  const value = fn();
  const end = Bun.nanoseconds();

  const durationNs = end - start;
  return {
    value,
    durationNs,
    durationMs: durationNs / 1_000_000,
    durationUs: durationNs / 1_000,
  };
}

/**
 * Measure async operation with nanosecond precision
 *
 * @example
 * const result = await measureAsync(() => fetch("/health"));
 * expect(result.durationMs).toBeLessThan(SLA_TARGETS.HEALTH_CHECK_MS);
 */
export async function measureAsync<T>(fn: () => Promise<T>): Promise<TimingResult<T>> {
  const start = Bun.nanoseconds();
  const value = await fn();
  const end = Bun.nanoseconds();

  const durationNs = end - start;
  return {
    value,
    durationNs,
    durationMs: durationNs / 1_000_000,
    durationUs: durationNs / 1_000,
  };
}

/**
 * Run multiple iterations and collect statistics
 *
 * @example
 * const stats = await collectStats(() => router.match(url), 1000);
 * expect(stats.p99).toBeLessThan(SLA_TARGETS.DISPATCH_MS);
 */
export function collectStats(
  fn: () => unknown,
  iterations: number = 1000,
  options: { warmup?: number; gcBetween?: boolean } = {}
): PerformanceStats {
  const { warmup = 100, gcBetween = false } = options;
  const samples: number[] = [];

  // Warmup phase (JIT optimization)
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  // Optional GC before measurement
  if (gcBetween) {
    Bun.gc(true);
  }

  // Measurement phase
  for (let i = 0; i < iterations; i++) {
    const start = Bun.nanoseconds();
    fn();
    const end = Bun.nanoseconds();
    samples.push((end - start) / 1_000_000); // Convert to ms
  }

  return calculateStats(samples);
}

/**
 * Async version of collectStats
 */
export async function collectStatsAsync(
  fn: () => Promise<unknown>,
  iterations: number = 100,
  options: { warmup?: number; gcBetween?: boolean } = {}
): Promise<PerformanceStats> {
  const { warmup = 10, gcBetween = false } = options;
  const samples: number[] = [];

  // Warmup phase
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // Optional GC before measurement
  if (gcBetween) {
    Bun.gc(true);
  }

  // Measurement phase
  for (let i = 0; i < iterations; i++) {
    const start = Bun.nanoseconds();
    await fn();
    const end = Bun.nanoseconds();
    samples.push((end - start) / 1_000_000);
  }

  return calculateStats(samples);
}

/**
 * Calculate statistics from samples
 */
export function calculateStats(samples: number[]): PerformanceStats {
  if (samples.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0, stdDev: 0, cv: 0 };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const count = sorted.length;
  const min = sorted[0];
  const max = sorted[count - 1];
  const mean = samples.reduce((a, b) => a + b, 0) / count;

  // Percentiles
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);

  // Standard deviation
  const variance = samples.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (lower is more consistent)
  const cv = mean === 0 ? 0 : (stdDev / mean) * 100;

  return { count, min, max, mean, p50, p95, p99, stdDev, cv };
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Assert that a duration meets SLA target
 * Throws with detailed message if SLA is violated
 *
 * @example
 * assertSLA(result.durationMs, SLA_TARGETS.DISPATCH_MS, "Route dispatch");
 */
export function assertSLA(
  actualMs: number,
  targetMs: number,
  operation: string = "Operation"
): void {
  const tier = getPerformanceTier(actualMs, targetMs);

  if (tier.label === "POOR") {
    throw new Error(
      `SLA VIOLATION: ${operation} took ${formatTime(actualMs)} ` +
      `(target: ${formatTime(targetMs)}, ${((actualMs / targetMs) * 100).toFixed(1)}% of target)`
    );
  }
}

/**
 * Assert statistics meet SLA (p99 must be under target)
 * NOTE: Use assertMeanSLA for micro-benchmarks where P99 is inherently noisy
 *
 * @example
 * const stats = collectStats(() => myOp(), 1000);
 * assertStatsSLA(stats, SLA_TARGETS.DISPATCH_MS, "Route dispatch");
 */
export function assertStatsSLA(
  stats: PerformanceStats,
  targetMs: number,
  operation: string = "Operation"
): void {
  if (stats.p99 > targetMs) {
    throw new Error(
      `SLA VIOLATION: ${operation} p99=${formatTime(stats.p99)} ` +
      `exceeds target ${formatTime(targetMs)}\n` +
      `  mean=${formatTime(stats.mean)}, p50=${formatTime(stats.p50)}, ` +
      `p95=${formatTime(stats.p95)}, stdDev=${formatTime(stats.stdDev)}`
    );
  }
}

/**
 * Assert mean meets SLA (production SLA is about mean, not P99)
 * Use this for micro-benchmarks where P99 is affected by JIT, GC, and system noise
 *
 * @example
 * const stats = collectStats(() => myOp(), 1000);
 * assertMeanSLA(stats, SLA_TARGETS.DISPATCH_MS, "Route dispatch");
 */
export function assertMeanSLA(
  stats: PerformanceStats,
  targetMs: number,
  operation: string = "Operation"
): void {
  if (stats.mean > targetMs) {
    throw new Error(
      `SLA VIOLATION: ${operation} mean=${formatTime(stats.mean)} ` +
      `exceeds target ${formatTime(targetMs)}\n` +
      `  p50=${formatTime(stats.p50)}, p95=${formatTime(stats.p95)}, ` +
      `p99=${formatTime(stats.p99)}, stdDev=${formatTime(stats.stdDev)}`
    );
  }
}

/**
 * Get performance tier classification
 *
 * @example
 * const tier = getTier(result.durationMs, SLA_TARGETS.DISPATCH_MS);
 * expect(tier.label).not.toBe("POOR");
 */
export function getTier(actualMs: number, targetMs: number) {
  return getPerformanceTier(actualMs, targetMs);
}

/**
 * Format time for display
 */
export function formatTime(ms: number): string {
  if (ms < 0.001) return `${(ms * 1_000_000).toFixed(0)}ns`;
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format statistics for logging
 */
export function formatStats(stats: PerformanceStats, label: string = "Stats"): string {
  return [
    `${label}:`,
    `  samples: ${stats.count}`,
    `  min: ${formatTime(stats.min)}`,
    `  max: ${formatTime(stats.max)}`,
    `  mean: ${formatTime(stats.mean)}`,
    `  p50: ${formatTime(stats.p50)}`,
    `  p95: ${formatTime(stats.p95)}`,
    `  p99: ${formatTime(stats.p99)}`,
    `  stdDev: ${formatTime(stats.stdDev)}`,
    `  cv: ${stats.cv.toFixed(1)}%`,
  ].join("\n");
}

/**
 * Create a timer for manual start/stop timing
 *
 * @example
 * const timer = createTimer();
 * timer.start();
 * await complexOperation();
 * timer.stop();
 * expect(timer.durationMs).toBeLessThan(100);
 */
export function createTimer() {
  let startTime = 0;
  let endTime = 0;

  return {
    start() {
      startTime = Bun.nanoseconds();
    },
    stop() {
      endTime = Bun.nanoseconds();
    },
    get durationNs() {
      return endTime - startTime;
    },
    get durationMs() {
      return (endTime - startTime) / 1_000_000;
    },
    get durationUs() {
      return (endTime - startTime) / 1_000;
    },
    reset() {
      startTime = 0;
      endTime = 0;
    },
  };
}

/**
 * Measure memory usage delta during operation
 *
 * @example
 * const memory = measureMemory(() => {
 *   const largeArray = new Array(1000000).fill(0);
 * });
 * expect(memory.heapDeltaBytes).toBeLessThan(10_000_000);
 */
export function measureMemory(fn: () => unknown) {
  // Force GC before measurement
  Bun.gc(true);

  const before = process.memoryUsage();
  fn();

  // Force GC after to measure retained memory
  Bun.gc(true);
  const after = process.memoryUsage();

  return {
    heapDeltaBytes: after.heapUsed - before.heapUsed,
    heapDeltaKB: (after.heapUsed - before.heapUsed) / 1024,
    heapDeltaMB: (after.heapUsed - before.heapUsed) / 1024 / 1024,
    externalDeltaBytes: after.external - before.external,
    before,
    after,
  };
}

/**
 * Run operation with timeout
 *
 * @example
 * const result = await withTimeout(() => slowOperation(), 5000);
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Benchmark helper for test assertions
 * Returns a function that can be used directly in expect()
 *
 * @example
 * test("meets performance target", () => {
 *   const benchmark = createBenchmark(() => router.match(url), {
 *     iterations: 1000,
 *     target: SLA_TARGETS.DISPATCH_MS,
 *   });
 *
 *   expect(benchmark.p99).toBeLessThan(SLA_TARGETS.DISPATCH_MS);
 *   expect(benchmark.tier.label).not.toBe("POOR");
 * });
 */
export function createBenchmark(
  fn: () => unknown,
  options: {
    iterations?: number;
    warmup?: number;
    target?: number;
  } = {}
) {
  const { iterations = 1000, warmup = 100, target } = options;

  const stats = collectStats(fn, iterations, { warmup });
  const tier = target ? getPerformanceTier(stats.p99, target) : null;

  return {
    ...stats,
    tier,
    formatted: formatStats(stats),
    meetsTarget: tier ? tier.label !== "POOR" : null,
  };
}
