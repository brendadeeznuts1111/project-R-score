#!/usr/bin/env bun
/**
 * Collection Optimization Patterns
 * 
 * Demonstrates Set#size and Map#size optimizations,
 * inline cache benefits, and best practices.
 */

import { performance } from "perf_hooks";

console.log("📦 Collection Optimization Patterns\n");
console.log("=".repeat(70));

// ============================================================================
// Set#size Optimization
// ============================================================================

console.log("\n🔢 Set#size Optimization");
console.log("-".repeat(70));

console.log(`
Bun v1.3.9: Set#size optimized in DFG/FTL and inline caches

// ✅ Optimized: Simple size check
const size = mySet.size;

// ✅ Optimized: Conditional based on size
if (mySet.size > 0) {
  // Process set
}

// ✅ Optimized: Multiple size checks
const isEmpty = mySet.size === 0;
const isLarge = mySet.size > 1000;

// Best practices:
// • Use .size instead of iterating to count
// • Cache size if checking multiple times
// • Leverage inline cache benefits
`);

// ============================================================================
// Map#size Optimization
// ============================================================================

console.log("\n🗺️  Map#size Optimization");
console.log("-".repeat(70));

console.log(`
Bun v1.3.9: Map#size optimized in DFG/FTL and inline caches

// ✅ Optimized: Simple size check
const size = myMap.size;

// ✅ Optimized: Conditional based on size
if (myMap.size === 0) {
  // Handle empty map
}

// ✅ Optimized: Size-based logic
const needsCleanup = myMap.size > MAX_SIZE;

// Best practices:
// • Use .size instead of Object.keys(map).length
// • Leverage inline cache for repeated access
// • Size checks are now very fast
`);

// ============================================================================
// Inline Cache Benefits
// ============================================================================

console.log("\n💾 Inline Cache Benefits");
console.log("-".repeat(70));

console.log(`
Inline cache benefits:

• Faster property access: Cached property lookups
• Type specialization: Optimized for specific types
• Reduced overhead: Less runtime type checking
• Better JIT: More optimization opportunities

Example:
  // First access: Cache miss, slower
  const size1 = mySet.size;
  
  // Subsequent accesses: Cache hit, faster
  const size2 = mySet.size;
  const size3 = mySet.size;
`);

// ============================================================================
// Performance Benchmarks
// ============================================================================

async function benchmarkCollectionSize(iterations: number = 10000000): Promise<{
  setSize: number;
  mapSize: number;
}> {
  const mySet = new Set(Array.from({ length: 100 }, (_, i) => i));
  const myMap = new Map(Array.from({ length: 100 }, (_, i) => [i, i]));
  
  // Benchmark Set.size
  const setStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const size = mySet.size;
  }
  const setTime = performance.now() - setStart;
  
  // Benchmark Map.size
  const mapStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    const size = myMap.size;
  }
  const mapTime = performance.now() - mapStart;
  
  return {
    setSize: setTime,
    mapSize: mapTime,
  };
}

console.log("\n📊 Performance Benchmarks");
console.log("-".repeat(70));

console.log(`
async function benchmarkCollectionSize(iterations) {
  // Benchmark Set.size and Map.size
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
    practice: "Use .size instead of counting",
    before: "let count = 0; for (const item of set) count++;",
    after: "const count = set.size;",
  },
  {
    practice: "Cache size for multiple checks",
    before: "if (set.size > 0 && set.size < 100) { }",
    after: "const size = set.size; if (size > 0 && size < 100) { }",
  },
  {
    practice: "Use size for empty checks",
    before: "set.size === 0 ? 'empty' : 'not empty'",
    after: "set.size === 0 ? 'empty' : 'not empty'", // Already optimal
  },
];

bestPractices.forEach(({ practice, before, after }) => {
  console.log(`\n✅ ${practice}:`);
  console.log(`   Before: ${before}`);
  console.log(`   After:  ${after}`);
});

console.log("\n✅ Collection Optimization Complete!");
console.log("\nKey Benefits (Bun v1.3.9):");
console.log("  • Faster Set#size (DFG/FTL optimized)");
console.log("  • Faster Map#size (DFG/FTL optimized)");
console.log("  • Inline cache benefits");
console.log("  • Better performance for size checks");
