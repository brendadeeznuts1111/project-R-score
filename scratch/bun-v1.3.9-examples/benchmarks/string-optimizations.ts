/**
 * Bun v1.3.9 String Optimization Benchmarks
 * 
 * Demonstrates the performance improvements in JavaScriptCore:
 * - String#startsWith: 1.42x faster (5.76x with constant folding)
 * - String#trim: 1.17x faster
 * - String#trimStart: 1.10x faster
 * - String#trimEnd: 1.42x faster
 * - String#replace: Returns ropes (lazy concatenation)
 * - Set#size: 2.24x faster
 * - Map#size: 2.74x faster
 */

import { performance } from "perf_hooks";

// Test data
const TEST_STRINGS = {
  short: "Hello World",
  medium: "The quick brown fox jumps over the lazy dog. ".repeat(10),
  long: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(100),
};

const TEST_PREFIXES = {
  short: "Hello",
  medium: "The quick",
  long: "Lorem ipsum",
};

// Benchmark function
function benchmark(name: string, fn: () => void, iterations: number): number {
  // Warmup
  for (let i = 0; i < 1000; i++) {
    fn();
  }
  
  // Force garbage collection if available
  if (globalThis.gc) {
    globalThis.gc();
  }
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  
  return end - start;
}

// Format time
function formatTime(ms: number): string {
  if (ms < 0.001) {
    return `${(ms * 1_000_000).toFixed(2)} ns`;
  }
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)} µs`;
  }
  return `${ms.toFixed(3)} ms`;
}

async function runBenchmark() {
  console.info("=".repeat(70));
  console.info("Bun v1.3.9 String & Collection Optimization Benchmarks");
  console.info("=".repeat(70));
  console.info(`Bun version: ${Bun.version}`);
  console.info(`Platform: ${process.platform} ${process.arch}`);
  console.info("");
  
  const ITERATIONS = 10_000_000;
  
  // String#startsWith benchmarks
  console.info("🔍 String.prototype.startsWith");
  console.info("-".repeat(70));
  
  for (const [size, str] of Object.entries(TEST_STRINGS)) {
    const prefix = TEST_PREFIXES[size as keyof typeof TEST_PREFIXES];
    
    // Basic startsWith
    const basicTime = benchmark(
      `startsWith-${size}`,
      () => str.startsWith(prefix),
      ITERATIONS
    );
    
    // startsWith with index
    const indexTime = benchmark(
      `startsWith-index-${size}`,
      () => str.startsWith(prefix, 0),
      ITERATIONS
    );
    
    // Constant folding (both string and prefix are known at compile time)
    const constantTime = benchmark(
      `startsWith-constant-${size}`,
      () => {
        const s = "Hello World";
        return s.startsWith("Hello");
      },
      ITERATIONS
    );
    
    console.info(`${size.padEnd(8)} | Basic: ${formatTime(basicTime / ITERATIONS).padEnd(12)} | With index: ${formatTime(indexTime / ITERATIONS).padEnd(12)} | Constant: ${formatTime(constantTime / ITERATIONS).padEnd(12)}`);
  }
  
  console.info("");
  console.info("Expected improvements:");
  console.info("  • Basic startsWith:      ~1.42x faster");
  console.info("  • startsWith with index: ~1.22x faster");
  console.info("  • Constant folding:     ~5.76x faster");
  console.info("");
  
  // String#trim benchmarks
  console.info("✂️  String.prototype.trim / trimStart / trimEnd");
  console.info("-".repeat(70));
  
  const trimTestStrings = {
    short: "  Hello World  ",
    medium: "  " + TEST_STRINGS.medium + "  ",
    long: "  " + TEST_STRINGS.long + "  ",
  };
  
  for (const [size, str] of Object.entries(trimTestStrings)) {
    const trimTime = benchmark(
      `trim-${size}`,
      () => str.trim(),
      ITERATIONS
    );
    
    const trimStartTime = benchmark(
      `trimStart-${size}`,
      () => str.trimStart(),
      ITERATIONS
    );
    
    const trimEndTime = benchmark(
      `trimEnd-${size}`,
      () => str.trimEnd(),
      ITERATIONS
    );
    
    console.info(`${size.padEnd(8)} | trim: ${formatTime(trimTime / ITERATIONS).padEnd(12)} | trimStart: ${formatTime(trimStartTime / ITERATIONS).padEnd(12)} | trimEnd: ${formatTime(trimEndTime / ITERATIONS).padEnd(12)}`);
  }
  
  console.info("");
  console.info("Expected improvements:");
  console.info("  • trim:      ~1.17x faster");
  console.info("  • trimStart: ~1.10x faster");
  console.info("  • trimEnd:   ~1.42x faster");
  console.info("");
  
  // String#replace (rope optimization)
  console.info("🔄 String.prototype.replace (Rope Optimization)");
  console.info("-".repeat(70));
  
  const replaceTest = TEST_STRINGS.medium;
  const replaceIterations = 1_000_000;
  
  const replaceTime = benchmark(
    "replace",
    () => replaceTest.replace("fox", "cat"),
    replaceIterations
  );
  
  console.info(`Average time: ${formatTime(replaceTime / replaceIterations)}`);
  console.info("Note: Returns rope (lazy concatenation) instead of eager copy");
  console.info("      This avoids unnecessary allocations for short-lived results");
  console.info("");
  
  // Set#size and Map#size benchmarks
  console.info("📊 Set#size and Map#size");
  console.info("-".repeat(70));
  
  const setSize = 1000;
  const mapSize = 1000;
  
  const testSet = new Set(Array.from({ length: setSize }, (_, i) => i));
  const testMap = new Map(Array.from({ length: mapSize }, (_, i) => [i, i]));
  
  const setSizeTime = benchmark(
    "set-size",
    () => testSet.size,
    ITERATIONS
  );
  
  const mapSizeTime = benchmark(
    "map-size",
    () => testMap.size,
    ITERATIONS
  );
  
  // Compare with property access overhead
  const setSizeGetterTime = benchmark(
    "set-size-getter",
    () => {
      const obj = { size: testSet.size };
      return obj.size;
    },
    ITERATIONS
  );
  
  console.info(`Set#size:  ${formatTime(setSizeTime / ITERATIONS).padEnd(12)} | Expected: ~2.24x faster`);
  console.info(`Map#size:  ${formatTime(mapSizeTime / ITERATIONS).padEnd(12)} | Expected: ~2.74x faster`);
  console.info("");
  
  // AbortSignal.abort() benchmark
  console.info("🚫 AbortSignal.abort() (No Listeners)");
  console.info("-".repeat(70));
  
  const abortIterations = 1_000_000;
  
  // AbortSignal with no listeners (optimized path)
  const abortNoListenersTime = benchmark(
    "abort-no-listeners",
    () => {
      const signal = AbortSignal.abort();
      return signal.aborted;
    },
    abortIterations
  );
  
  // AbortSignal with listeners (normal path)
  const abortWithListenersTime = benchmark(
    "abort-with-listeners",
    () => {
      const signal = AbortSignal.abort();
      signal.addEventListener("abort", () => {});
      return signal.aborted;
    },
    abortIterations
  );
  
  console.info(`No listeners:    ${formatTime(abortNoListenersTime / abortIterations).padEnd(12)} | Expected: ~6% faster`);
  console.info(`With listeners:  ${formatTime(abortWithListenersTime / abortIterations).padEnd(12)} | (same as before)`);
  console.info("");
  console.info("Note: AbortSignal.abort() skips Event creation when no listeners");
  console.info("      Saves ~16ms per 1M calls");
  console.info("");
  
  console.info("=".repeat(70));
  console.info("SUMMARY");
  console.info("=".repeat(70));
  console.info("All optimizations are in JavaScriptCore (JSC) and apply automatically.");
  console.info("No code changes required - just upgrade to Bun v1.3.9!");
  console.info("");
}

runBenchmark().catch(console.error);
