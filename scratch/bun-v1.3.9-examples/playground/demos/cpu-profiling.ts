#!/usr/bin/env bun
/**
 * Demo: --cpu-prof-interval flag
 * 
 * Demonstrates configurable CPU profiler sampling interval
 */

console.log("📊 Bun v1.3.9: CPU Profiling Interval\n");
console.log("=".repeat(70));

console.log("\n📝 New Feature: --cpu-prof-interval");
console.log("  • Configures CPU profiler's sampling interval in microseconds");
console.log("  • Matches Node.js's flag of the same name");
console.log("  • Default interval: 1000μs (1ms)");

console.log("\n🔍 Usage Examples:");
console.log("-".repeat(70));

console.log("\n1. Default interval (1000μs):");
console.log("   bun --cpu-prof index.js");

console.log("\n2. Higher resolution (500μs):");
console.log("   bun --cpu-prof --cpu-prof-interval 500 index.js");

console.log("\n3. Very high resolution (250μs):");
console.log("   bun --cpu-prof --cpu-prof-interval 250 index.js");

console.log("\n⚠️  Note:");
console.log("   If used without --cpu-prof or --cpu-prof-md,");
console.log("   Bun will emit a warning.");

console.log("\n💡 Use Cases:");
console.log("  • High-resolution performance profiling");
console.log("  • Identifying micro-optimization opportunities");
console.log("  • Comparing performance across different intervals");

console.log("\n📊 Example: Profiling a function");
console.log("-".repeat(70));

function heavyComputation() {
  let sum = 0;
  for (let i = 0; i < 1_000_000; i++) {
    sum += Math.sqrt(i);
  }
  return sum;
}

console.log("Running heavy computation...");
const start = performance.now();
heavyComputation();
const end = performance.now();

console.log(`Computation took: ${(end - start).toFixed(2)}ms`);
console.log("\nTo profile this with custom interval:");
console.log("  bun --cpu-prof --cpu-prof-interval 500 cpu-profiling.ts");

console.log("\n✅ Demo complete!");
console.log("\nKey Features:");
console.log("  • Configurable sampling interval");
console.log("  • Higher resolution = more detailed profiling");
console.log("  • Matches Node.js behavior");
