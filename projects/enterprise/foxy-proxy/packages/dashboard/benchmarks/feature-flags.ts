/**
 * Feature Flags Runtime Performance Benchmark
 * Tests the performance of feature flag checking operations
 */
import {
  COMPILE_TIME_FEATURES,
  RUNTIME_FEATURES,
  isFeatureEnabled,
  isTierFeature,
  getCurrentTier,
  getEnabledFeatures,
  isPerformanceProfilingEnabled,
  validateFeature
} from "../src/utils/feature-flags";

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  opsPerSec: number;
}

function benchmark(name: string, fn: () => void, iterations: number = 10000): BenchmarkResult {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const totalTime = performance.now() - start;
  const avgTime = totalTime / iterations;
  const opsPerSec = 1000 / avgTime;

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    opsPerSec
  };
}

function printResult(result: BenchmarkResult): void {
  console.log(`
${result.name}:
  Iterations: ${result.iterations.toLocaleString()}
  Total Time: ${result.totalTime.toFixed(2)}ms
  Avg Time: ${result.avgTime.toFixed(4)}ms
  Ops/sec: ${result.opsPerSec.toFixed(0).toLocaleString()}
  `);
}

console.log("🚀 Feature Flags Performance Benchmark\n");
console.log("=".repeat(60));

// Benchmark 1: Direct compile-time feature access
const result1 = benchmark("Direct Compile-Time Feature Access", () => {
  const _ = COMPILE_TIME_FEATURES.DEBUG;
});
printResult(result1);

// Benchmark 2: Direct runtime feature access
const result2 = benchmark("Direct Runtime Feature Access", () => {
  const _ = RUNTIME_FEATURES.DARK_MODE;
});
printResult(result2);

// Benchmark 3: isFeatureEnabled() function
const result3 = benchmark("isFeatureEnabled() - Compile-Time Feature", () => {
  isFeatureEnabled("DEBUG");
});
printResult(result3);

// Benchmark 4: isFeatureEnabled() - Runtime Feature
const result4 = benchmark("isFeatureEnabled() - Runtime Feature", () => {
  isFeatureEnabled("DARK_MODE");
});
printResult(result4);

// Benchmark 5: isTierFeature() function
const result5 = benchmark("isTierFeature() Check", () => {
  isTierFeature("premium", "ADVANCED_PROXY_CONFIG");
});
printResult(result5);

// Benchmark 6: getCurrentTier() function
const result6 = benchmark("getCurrentTier() Check", () => {
  getCurrentTier();
});
printResult(result6);

// Benchmark 7: validateFeature() function
const result7 = benchmark("validateFeature() Check", () => {
  validateFeature("DEBUG");
});
printResult(result7);

// Benchmark 8: getEnabledFeatures() function
const result8 = benchmark(
  "getEnabledFeatures() Array",
  () => {
    getEnabledFeatures();
  },
  1000 // Lower iterations since this is more expensive
);
printResult(result8);

// Benchmark 9: Multiple sequential checks
const result9 = benchmark("Multiple Sequential Checks (5 features)", () => {
  isFeatureEnabled("DEBUG");
  isFeatureEnabled("DARK_MODE");
  isFeatureEnabled("PREMIUM_TIER");
  isFeatureEnabled("ANALYTICS_DASHBOARD");
  isFeatureEnabled("DUOPLUS_INTEGRATION");
});
printResult(result9);

// Benchmark 10: Performance profiling check
const result10 = benchmark("isPerformanceProfilingEnabled() Check", () => {
  isPerformanceProfilingEnabled();
});
printResult(result10);

console.log("=".repeat(60));
console.log("\n📊 Summary:");
console.log(
  `  Fastest: ${[result1, result2, result3, result4, result5, result6, result7, result8, result9, result10].reduce((a, b) => (a.avgTime < b.avgTime ? a : b)).name}`
);
console.log(
  `  Slowest: ${[result1, result2, result3, result4, result5, result6, result7, result8, result9, result10].reduce((a, b) => (a.avgTime > b.avgTime ? a : b)).name}`
);

const avgTime =
  [
    result1,
    result2,
    result3,
    result4,
    result5,
    result6,
    result7,
    result8,
    result9,
    result10
  ].reduce((sum, r) => sum + r.avgTime, 0) / 10;
console.log(`  Average operation time: ${avgTime.toFixed(4)}ms`);
console.log("\n✅ Benchmark complete!");
