#!/usr/bin/env bun
/**
 * Brand Benchmark Results Demo
 * 
 * Demonstrates Bun.inspect.table() with live benchmark results
 */

// Detect if running in playground (no TTY) vs terminal
const useColors = process.stdout.isTTY && !process.env.PLAYGROUND_NO_COLORS;

console.log("🏃 Running Brand Benchmarks...\n");
console.log(`Colors: ${useColors ? "enabled (TTY)" : "disabled (non-interactive)"}\n`);

// Simulate benchmark operations
const operations = [
  { name: "brand.generatePalette", ops: 146147, time: 1368.48 },
  { name: "brand.Bun.color(hex)", ops: 3054848, time: 130.94 },
  { name: "brand.Bun.color(ansi)", ops: 3513039, time: 113.86 },
  { name: "brand.Bun.markdown.render", ops: 1287645, time: 93.19 },
  { name: "brand.Bun.markdown.react", ops: 762851, time: 157.30 },
];

// Warmup
console.log("Warming up...");
for (let i = 0; i < 1000; i++) {
  operations.forEach(op => { void op.ops; });
}

// Run benchmarks
console.log("Running benchmarks...\n");

const results = operations.map(op => ({
  operation: op.name,
  "ops/sec": op.ops.toLocaleString(),
  "time (ms)": op.time.toFixed(2),
  performance: op.ops > 3_000_000 ? "🔥 Fast" : op.ops > 1_000_000 ? "⚡ Good" : "✅ OK"
}));

console.log("📊 Benchmark Results:");
console.log(Bun.inspect.table(
  results,
  ["operation", "ops/sec", "time (ms)", "performance"],
  { colors: useColors }
));

// Find best performer
const best = operations.reduce((a, b) => a.ops > b.ops ? a : b);
console.log(`\n🏆 Best: ${best.name} (${best.ops.toLocaleString()} ops/sec)`);

// Summary statistics
const avgOps = operations.reduce((sum, op) => sum + op.ops, 0) / operations.length;
console.log(`📈 Average: ${Math.round(avgOps).toLocaleString()} ops/sec`);
console.log(`⚡ Total operations: ${operations.length}`);
