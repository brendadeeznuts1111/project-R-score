#!/usr/bin/env bun
/**
 * Demo: Bun.inspect.table() - Formatted Output
 * 
 * https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
 */

// Detect if running in playground (no TTY) vs terminal
const useColors = process.stdout.isTTY && !process.env.PLAYGROUND_NO_COLORS;

console.info("📊 Bun.inspect.table() Demo\n");
console.info("=".repeat(70));
console.info(`Colors: ${useColors ? "enabled (TTY detected)" : "disabled (non-interactive)"}`);

// Demo 1: Simple data
console.info("\n1️⃣ Simple Benchmark Results");
console.info("-".repeat(70));

const benchmarkResults = [
  { operation: "generatePalette", opsPerSec: 146147, ms: 1368.5 },
  { operation: "Bun.color(hex)", opsPerSec: 3054848, ms: 130.9 },
  { operation: "Bun.color(ansi)", opsPerSec: 3513039, ms: 113.9 },
];

console.info(Bun.inspect.table(
  benchmarkResults,
  ["operation", "opsPerSec", "ms"],
  { colors: useColors }
));

// Demo 2: With ratings
console.info("\n2️⃣ With Performance Ratings");
console.info("-".repeat(70));

const ratedResults = benchmarkResults.map(r => ({
  ...r,
  rating: r.opsPerSec > 3_000_000 ? "🔥 Fast" : r.opsPerSec > 1_000_000 ? "⚡ Good" : "✅ OK"
}));

console.info(Bun.inspect.table(
  ratedResults,
  ["operation", "opsPerSec", "ms", "rating"],
  { colors: useColors }
));

// Demo 3: Configuration comparison
console.info("\n3️⃣ Configuration Comparison");
console.info("-".repeat(70));

const configDiff = [
  { property: "port", actual: 3000, expected: 3001, match: false },
  { property: "host", actual: "localhost", expected: "localhost", match: true },
  { property: "ssl", actual: true, expected: true, match: true },
];

console.info(Bun.inspect.table(
  configDiff,
  ["property", "actual", "expected", "match"],
  { colors: useColors }
));

console.info("\n✅ Bun.inspect.table() demo complete!");
console.info("\n💡 Use cases:");
console.info("   • Benchmark results");
console.info("   • Configuration diffs");
console.info("   • Data comparison");
console.info("   • Debug output");
