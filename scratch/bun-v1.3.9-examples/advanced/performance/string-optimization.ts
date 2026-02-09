#!/usr/bin/env bun
/**
 * String Optimization Patterns
 * 
 * Demonstrates String#startsWith, String#trim, String#replace optimizations,
 * and best practices for leveraging Bun v1.3.9 improvements.
 */

import { performance } from "perf_hooks";

console.log("📝 String Optimization Patterns\n");
console.log("=".repeat(70));

// ============================================================================
// String#startsWith Optimization
// ============================================================================

console.log("\n🔍 String#startsWith Optimization");
console.log("-".repeat(70));

console.log(`
Bun v1.3.9: String#startsWith optimized in DFG/FTL

// ✅ Optimized: Simple startsWith
const result = str.startsWith("prefix");

// ✅ Optimized: With position
const result = str.startsWith("prefix", 0);

// ✅ Optimized: Multiple checks
if (str.startsWith("http://") || str.startsWith("https://")) {
  // Fast path
}

// Best practices:
// • Use startsWith instead of indexOf for prefix checks
// • Prefer startsWith over regex for simple prefix matching
// • Multiple startsWith calls are optimized
`);

// ============================================================================
// String#trim Optimization
// ============================================================================

console.log("\n✂️  String#trim Optimization");
console.log("-".repeat(70));

console.log(`
Bun v1.3.9: String#trim optimized

// ✅ Optimized: Simple trim
const trimmed = str.trim();

// ✅ Optimized: Chained operations
const result = str.trim().toLowerCase();

// Best practices:
// • Use trim() instead of regex /^\\s+|\\s+$/g
// • Chain trim with other string operations
// • Trim early in processing pipeline
`);

// ============================================================================
// String#replace Optimization (Ropes)
// ============================================================================

console.log("\n🔄 String#replace Optimization (Ropes)");
console.log("-".repeat(70));

console.log(`
Bun v1.3.9: String.prototype.replace returns ropes

// ✅ Optimized: Simple replace
const result = str.replace("old", "new");

// ✅ Optimized: Global replace
const result = str.replace(/pattern/g, "replacement");

// ✅ Optimized: Function replacement
const result = str.replace(/pattern/g, (match) => transform(match));

// Ropes benefit:
// • More efficient memory usage
// • Faster string operations
// • Better performance for large strings
`);

// ============================================================================
// Performance Benchmarks
// ============================================================================

async function benchmarkStringOperations(iterations: number = 1000000): Promise<{
  startsWith: number;
  trim: number;
  replace: number;
}> {
  const testString = "  https://example.com/path  ";
  
  // Benchmark startsWith
  const startsWithStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    testString.startsWith("https://");
  }
  const startsWithTime = performance.now() - startsWithStart;
  
  // Benchmark trim
  const trimStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    testString.trim();
  }
  const trimTime = performance.now() - trimStart;
  
  // Benchmark replace
  const replaceStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    testString.replace(/\s+/g, "");
  }
  const replaceTime = performance.now() - replaceStart;
  
  return {
    startsWith: startsWithTime,
    trim: trimTime,
    replace: replaceTime,
  };
}

console.log("\n📊 Performance Benchmarks");
console.log("-".repeat(70));

console.log(`
async function benchmarkStringOperations(iterations) {
  // Benchmark string operations
  // Returns: timing for each operation
}
`);

// ============================================================================
// Best Practices
// ============================================================================

console.log("\n📚 Best Practices");
console.log("-".repeat(70));

const bestPractices = [
  {
    practice: "Use startsWith for prefix checks",
    before: "str.indexOf('prefix') === 0",
    after: "str.startsWith('prefix')",
  },
  {
    practice: "Use trim instead of regex",
    before: "str.replace(/^\\s+|\\s+$/g, '')",
    after: "str.trim()",
  },
  {
    practice: "Chain string operations",
    before: "const a = str.trim(); const b = a.toLowerCase();",
    after: "const result = str.trim().toLowerCase();",
  },
  {
    practice: "Use replace with ropes",
    before: "Manual string building",
    after: "str.replace(pattern, replacement)",
  },
];

bestPractices.forEach(({ practice, before, after }) => {
  console.log(`\n✅ ${practice}:`);
  console.log(`   Before: ${before}`);
  console.log(`   After:  ${after}`);
});

console.log("\n✅ String Optimization Complete!");
console.log("\nKey Benefits (Bun v1.3.9):");
console.log("  • Faster String#startsWith (DFG/FTL optimized)");
console.log("  • Faster String#trim");
console.log("  • String#replace returns ropes (more efficient)");
console.log("  • Better memory usage");
