/**
 * @registry-mcp/benchmarks - Performance Targets
 * v2.4.1 Hardened Baseline SLA Definitions
 *
 * These constants define the performance targets that ALL
 * MCP implementations must meet for v2.4.1 compliance.
 */

/**
 * Performance Targets (SLA)
 * Based on v2.4.1 Hardened Baseline Specification
 */
export const PERFORMANCE_TARGETS = {
  // Routing Performance Targets
  DISPATCH_MS: 0.03,
  ROUTE_TEST_MS: 0.01,
  REQUEST_CYCLE_P99_MS: 10.8,
  COLD_START_MS: 0,
  HEAP_REDUCTION_PCT: 14,
  BUNDLE_SIZE_KB: 9.64,
  TOML_PARSE_MS: 0.05,
  COOKIE_PARSE_MS: 0.01,

  // Enhanced Performance Targets
  URL_PATTERN_COMPLEXITY_MAX: 100,
  HEALTH_CHECK_RESPONSE_MS: 5,
  CONNECTION_POOL_EFFICIENCY_PCT: 80,
  CACHE_HIT_RATIO_MIN: 70,
  SECURITY_VALIDATION_MS: 1,
  MEMORY_POOL_OVERHEAD_PCT: 5,

  // Advanced Routing Targets
  COMPLEX_ROUTE_DISPATCH_MS: 0.05,
  CONCURRENT_ROUTING_MAX: 1000,
  ROUTE_CACHE_HIT_RATIO: 95,
  PARAMETER_EXTRACTION_MS: 0.01,
  WILDCARD_MATCH_MS: 0.02,
  REGEX_PATTERN_MS: 0.03,
  ROUTING_MEMORY_OVERHEAD_KB: 50,
   ROUTE_TABLE_LOOKUP_NS: 50,

   // UI Component Performance Targets
   COMPONENT_RENDER_MS: 16.67,     // Target 60fps (16.67ms per frame)
   INTERACTION_RESPONSE_MS: 100,   // Target responsive interactions
   SEARCH_FILTER_MS: 50,           // Search/filter operations
   TAB_SWITCH_MS: 50,              // Tab switching performance
   TABLE_RENDER_MS: 100,           // Table rendering performance
   STATE_UPDATE_MS: 10,            // React state update performance

   // Propagation Half-Life Framework Targets
   PROPAGATION_UPDATE_MS: 1.0,            // <1ms per update processing
   PROPAGATION_UPDATE_US: 100,            // ~100μs target (hot path)
   PATTERN_DETECTION_MS: 0.5,             // O(20) pattern detection
   HALFLIFE_CALCULATION_MS: 0.1,          // EMA/decay calculation
   HEATMAP_GENERATION_MS: 5.0,            // Full heatmap regeneration
   PROPAGATION_MEMORY_MB: 8,              // <8MB total memory
   RING_BUFFER_INSERT_NS: 100,            // O(1) ring buffer insert
   TIER_LOOKUP_NS: 50,                    // O(1) tier lookup
} as const;

/**
 * Benchmark Configuration
 * Controls how benchmarks are executed
 */
export const BENCHMARK_CONFIG = {
  // Iterations
  WARMUP_ITERATIONS: 100,         // JIT warm-up iterations
  MIN_ITERATIONS: 1000,           // Minimum sample size for accuracy
  MAX_ITERATIONS: 100000,         // Maximum iterations per benchmark

  // Timing
  MAX_TIME_MS: 5000,              // Maximum time per benchmark
  MIN_TIME_MS: 100,               // Minimum time to gather samples

  // Statistical Analysis
  CONFIDENCE_LEVEL: 0.95,         // 95% confidence interval
  OUTLIER_THRESHOLD: 3.0,         // Z-score for outlier detection

  // Memory
  GC_BETWEEN_RUNS: true,          // Force GC between benchmarks
  HEAP_SNAPSHOT_ENABLED: false,   // Capture heap snapshots (slow)
} as const;

/**
 * Benchmark Categories
 * Used for organizing and filtering benchmarks
 */
export const BENCHMARK_CATEGORIES = {
  ROUTING: 'routing',
  HTTP: 'http',
  CONFIG: 'config',
  COOKIE: 'cookie',
  MEMORY: 'memory',
  BUNDLE: 'bundle',
  INTEGRATION: 'integration',
  UI: 'ui',
  PROPAGATION: 'propagation',
} as const;

/**
 * Performance Tiers
 * Classification of performance levels
 */
export const PERFORMANCE_TIERS = {
  EXCELLENT: { label: 'EXCELLENT', color: '#10b981', threshold: 0.8 },  // < 80% of target
  GOOD: { label: 'GOOD', color: '#3b82f6', threshold: 1.0 },            // < 100% of target
  ACCEPTABLE: { label: 'ACCEPTABLE', color: '#f59e0b', threshold: 1.2 }, // < 120% of target
  POOR: { label: 'POOR', color: '#ef4444', threshold: Infinity },       // > 120% of target
} as const;

/**
 * Helper function to get performance tier
 */
export function getPerformanceTier(actual: number, target: number) {
  const ratio = actual / target;

  if (ratio < PERFORMANCE_TIERS.EXCELLENT.threshold) {
    return PERFORMANCE_TIERS.EXCELLENT;
  } else if (ratio < PERFORMANCE_TIERS.GOOD.threshold) {
    return PERFORMANCE_TIERS.GOOD;
  } else if (ratio < PERFORMANCE_TIERS.ACCEPTABLE.threshold) {
    return PERFORMANCE_TIERS.ACCEPTABLE;
  } else {
    return PERFORMANCE_TIERS.POOR;
  }
}

/**
 * Type definitions for type safety
 */
export type PerformanceTarget = keyof typeof PERFORMANCE_TARGETS;
export type BenchmarkCategory = typeof BENCHMARK_CATEGORIES[keyof typeof BENCHMARK_CATEGORIES];
export type PerformanceTier = typeof PERFORMANCE_TIERS[keyof typeof PERFORMANCE_TIERS];
