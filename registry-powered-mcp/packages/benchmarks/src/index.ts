/**
 * @registry-mcp/benchmarks v1.0.0
 * Standalone benchmark suite for MCP implementations
 *
 * Built on Bun-native APIs for maximum performance:
 * - Bun.bench() for benchmarking
 * - Bun.nanoseconds() for precision timing
 * - Bun.gc() for memory profiling
 *
 * @example
 * ```typescript
 * import { bench, suite, PERFORMANCE_TARGETS } from '@registry-mcp/benchmarks';
 *
 * suite('My Benchmarks', () => {
 *   bench('fast operation', () => {
 *     // your code
 *   }, {
 *     target: PERFORMANCE_TARGETS.DISPATCH_MS
 *   });
 * });
 * ```
 */

// Core harness
export {
  bench,
  benchAsync,
  benchMemory,
  suite,
  assertBenchmark,
  getBenchmarkResults,
  clearBenchmarkResults,
} from './harness';

export type { BenchOptions, BenchResult } from './harness';

// Constants and targets
export {
  PERFORMANCE_TARGETS,
  BENCHMARK_CONFIG,
  BENCHMARK_CATEGORIES,
  PERFORMANCE_TIERS,
  getPerformanceTier,
} from './constants';

export type {
  PerformanceTarget,
  BenchmarkCategory,
  PerformanceTier,
} from './constants';

// Statistics
export { BenchmarkStats, compareBenchmarks } from './stats';

// Reporters
export { reportToConsole, printBenchmarkDetail } from './reporters/console';

// Version
export const VERSION = '1.0.0';
