/**
 * @registry-mcp/benchmarks - Benchmark Harness
 * Custom benchmark implementation using Bun.nanoseconds() for precision
 */

import { BenchmarkStats } from './stats';
import { BENCHMARK_CONFIG, PERFORMANCE_TARGETS, getPerformanceTier } from './constants';
import type { BenchmarkCategory } from './constants';

/**
 * Benchmark options
 */
export interface BenchOptions {
  /** Target time in milliseconds (for assertion) */
  target?: number;

  /** Minimum iterations to run */
  iterations?: number;

  /** Warmup iterations before actual benchmark */
  warmup?: number;

  /** Category for organization */
  category?: BenchmarkCategory;

  /** Skip this benchmark */
  skip?: boolean;

  /** Only run this benchmark */
  only?: boolean;
}

/**
 * Benchmark result
 */
export interface BenchResult {
  name: string;
  stats: ReturnType<BenchmarkStats['summary']>;
  target?: number;
  passed: boolean;
  tier: ReturnType<typeof getPerformanceTier>;
  category?: BenchmarkCategory;
}

/**
 * Global benchmark results registry
 */
const benchmarkResults: BenchResult[] = [];

/**
 * Get all benchmark results
 */
export function getBenchmarkResults(): BenchResult[] {
  return [...benchmarkResults];
}

/**
 * Clear all benchmark results
 */
export function clearBenchmarkResults() {
  benchmarkResults.length = 0;
}

/**
 * Benchmark wrapper with Bun.bench() integration
 *
 * @example
 * ```ts
 * bench('route matching', () => {
 *   router.match('/test');
 * }, {
 *   target: PERFORMANCE_TARGETS.DISPATCH_MS,
 *   iterations: 1000
 * });
 * ```
 */
export function bench(name: string, fn: () => void | Promise<void>, options: BenchOptions = {}) {
  const {
    target,
    iterations = BENCHMARK_CONFIG.MIN_ITERATIONS,
    warmup = BENCHMARK_CONFIG.WARMUP_ITERATIONS,
    category,
    skip = false,
    only = false,
  } = options;

  if (skip) {
    return;
  }

  // Warmup phase - let JSC JIT compile and optimize
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  // Force GC before benchmark if enabled
  if (BENCHMARK_CONFIG.GC_BETWEEN_RUNS) {
    Bun.gc(true);
  }

  // Run actual benchmark using Bun.nanoseconds() for precision
  const stats = new BenchmarkStats();

  for (let i = 0; i < iterations; i++) {
    stats.start();
    fn();
    stats.end();
  }

  // Store results for reporting
  const summary = stats.summary();
  const tier = target ? getPerformanceTier(summary.mean, target) : undefined;
  const passed = target ? summary.mean <= target : true;

  const result: BenchResult = {
    name,
    stats: summary,
    target,
    passed,
    tier: tier || { label: 'N/A', color: '#666', threshold: Infinity },
    category,
  };

  benchmarkResults.push(result);

  return result;
}

/**
 * Async benchmark wrapper
 *
 * @example
 * ```ts
 * benchAsync('load config', async () => {
 *   await loadConfig();
 * }, {
 *   target: PERFORMANCE_TARGETS.CONFIG_LOAD_MS
 * });
 * ```
 */
export async function benchAsync(
  name: string,
  fn: () => Promise<void>,
  options: BenchOptions = {}
) {
  const {
    target,
    iterations = BENCHMARK_CONFIG.MIN_ITERATIONS,
    warmup = BENCHMARK_CONFIG.WARMUP_ITERATIONS,
    category,
    skip = false,
  } = options;

  if (skip) {
    return;
  }

  // Warmup phase
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // Force GC
  if (BENCHMARK_CONFIG.GC_BETWEEN_RUNS) {
    Bun.gc(true);
  }

  // Run benchmark
  const stats = new BenchmarkStats();

  for (let i = 0; i < iterations; i++) {
    stats.start();
    await fn();
    stats.end();
  }

  // Store results
  const summary = stats.summary();
  const tier = target ? getPerformanceTier(summary.mean, target) : undefined;
  const passed = target ? summary.mean <= target : true;

  const result: BenchResult = {
    name,
    stats: summary,
    target,
    passed,
    tier: tier || { label: 'N/A', color: '#666', threshold: Infinity },
    category,
  };

  benchmarkResults.push(result);

  return result;
}

/**
 * Suite wrapper for organizing benchmarks
 *
 * @example
 * ```ts
 * suite('Routing', () => {
 *   bench('match simple route', ...);
 *   bench('match param route', ...);
 * });
 * ```
 */
export function suite(name: string, fn: () => void | Promise<void>) {
  console.log(`\n📊 Benchmark Suite: ${name}`);
  console.log('─'.repeat(60));
  fn();
}

/**
 * Benchmark with memory profiling
 * Measures heap usage before and after
 */
export function benchMemory(
  name: string,
  fn: () => void,
  options: BenchOptions = {}
) {
  const {
    iterations = BENCHMARK_CONFIG.MIN_ITERATIONS,
    warmup = BENCHMARK_CONFIG.WARMUP_ITERATIONS,
  } = options;

  // Warmup
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  // Force GC to get baseline
  Bun.gc(true);

  const memBefore = process.memoryUsage();

  // Run benchmark
  for (let i = 0; i < iterations; i++) {
    fn();
  }

  // Force GC to see retained memory
  Bun.gc(true);

  const memAfter = process.memoryUsage();

  const heapDelta = memAfter.heapUsed - memBefore.heapUsed;
  const heapDeltaMB = heapDelta / 1024 / 1024;

  console.log(`\n💾 Memory: ${name}`);
  console.log(`   Heap Δ: ${heapDeltaMB.toFixed(2)} MB`);
  console.log(`   Per op: ${(heapDelta / iterations).toFixed(0)} bytes`);

  return {
    name,
    heapDelta,
    heapDeltaMB,
    perOperation: heapDelta / iterations,
  };
}

/**
 * Assert that benchmark passes target
 */
export function assertBenchmark(result: BenchResult) {
  if (!result.passed) {
    throw new Error(
      `Benchmark "${result.name}" failed: ${result.stats.mean.toFixed(3)}ms > ${result.target}ms (target)`
    );
  }
}
