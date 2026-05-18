#!/usr/bin/env bun
/**
 * Demo: --cpu-prof-interval flag
 * 
 * Demonstrates configurable CPU profiler sampling interval
 */

console.info("📊 Bun v1.3.9: CPU Profiling Interval\n");
console.info("=".repeat(70));

console.info("\n📝 New Feature: --cpu-prof-interval");
console.info("  • Configures CPU profiler's sampling interval in microseconds");
console.info("  • Matches Node.js's flag of the same name");
console.info("  • Default interval: 1000μs (1ms)");

console.info("\n🔍 Usage Examples:");
console.info("-".repeat(70));

console.info("\n1. Default interval (1000μs):");
console.info("   bun --cpu-prof index.js");

console.info("\n2. Higher resolution (500μs):");
console.info("   bun --cpu-prof --cpu-prof-interval 500 index.js");

console.info("\n3. Very high resolution (250μs):");
console.info("   bun --cpu-prof --cpu-prof-interval 250 index.js");

console.info("\n⚠️  Note:");
console.info("   If used without --cpu-prof or --cpu-prof-md,");
console.info("   Bun will emit a warning.");

console.info("\n💡 Use Cases:");
console.info("  • High-resolution performance profiling");
console.info("  • Identifying micro-optimization opportunities");
console.info("  • Comparing performance across different intervals");

console.info("\n📊 Example: Profiling a function");
console.info("-".repeat(70));

function heavyComputation() {
  let sum = 0;
  for (let i = 0; i < 1_000_000; i++) {
    sum += Math.sqrt(i);
  }
  return sum;
}

console.info("Running heavy computation...");
const start = performance.now();
heavyComputation();
const end = performance.now();

console.info(`Computation took: ${(end - start).toFixed(2)}ms`);
console.info("\nTo profile this with custom interval:");
console.info("  bun --cpu-prof --cpu-prof-interval 500 cpu-profiling.ts");

console.info("\n✅ Demo complete!");
console.info("\nKey Features:");
console.info("  • Configurable sampling interval");
console.info("  • Higher resolution = more detailed profiling");
console.info("  • Matches Node.js behavior");
