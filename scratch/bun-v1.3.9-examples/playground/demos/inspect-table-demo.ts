#!/usr/bin/env bun
/**
 * Demo: Bun.inspect.table() - Formatted Output
 * 
 * https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
 */

// Detect if running in playground (no TTY) vs terminal
const useColors = process.stdout.isTTY && !process.env.PLAYGROUND_NO_COLORS;

console.log("📊 Bun.inspect.table() Demo\n");
console.log("=".repeat(70));
console.log(`Colors: ${useColors ? "enabled (TTY detected)" : "disabled (non-interactive)"}`);

// Demo 1: Simple data
console.log("\n1️⃣ Simple Benchmark Results");
console.log("-".repeat(70));

const benchmarkResults = [
  { operation: "generatePalette", opsPerSec: 146147, ms: 1368.5 },
  { operation: "Bun.color(hex)", opsPerSec: 3054848, ms: 130.9 },
  { operation: "Bun.color(ansi)", opsPerSec: 3513039, ms: 113.9 },
];

console.log(Bun.inspect.table(
  benchmarkResults,
  ["operation", "opsPerSec", "ms"],
  { colors: useColors }
));

// Demo 2: With ratings
console.log("\n2️⃣ With Performance Ratings");
console.log("-".repeat(70));

const ratedResults = benchmarkResults.map(r => ({
  ...r,
  rating: r.opsPerSec > 3_000_000 ? "🔥 Fast" : r.opsPerSec > 1_000_000 ? "⚡ Good" : "✅ OK"
}));

console.log(Bun.inspect.table(
  ratedResults,
  ["operation", "opsPerSec", "ms", "rating"],
  { colors: useColors }
));

// Demo 3: Configuration comparison
console.log("\n3️⃣ Configuration Comparison");
console.log("-".repeat(70));

const configDiff = [
  { property: "port", actual: 3000, expected: 3001, match: false },
  { property: "host", actual: "localhost", expected: "localhost", match: true },
  { property: "ssl", actual: true, expected: true, match: true },
];

console.log(Bun.inspect.table(
  configDiff,
  ["property", "actual", "expected", "match"],
  { colors: useColors }
));

console.log("\n✅ Bun.inspect.table() demo complete!");
console.log("\n💡 Use cases:");
console.log("   • Benchmark results");
console.log("   • Configuration diffs");
console.log("   • Data comparison");
console.log("   • Debug output");
