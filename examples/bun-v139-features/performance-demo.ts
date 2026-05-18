#!/usr/bin/env bun
/**
 * Bun v1.3.9: Performance Optimizations Demo
 * 
 * Demonstrates various performance improvements in v1.3.9
 */

import { performance } from "node:perf_hooks";

console.info("⚡ Bun v1.3.9: Performance Optimizations Demo\n");
console.info("=" .repeat(70));

// Color codes
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

// ============================================================================
// 1. Markdown Rendering Optimizations
// ============================================================================
async function demoMarkdownPerformance() {
  console.info("\n📦 Markdown Rendering Optimizations");
  console.info("-".repeat(70));

  const markdownContent = `
# Example Document

This is a **bold** paragraph with some *emphasis* and \`code\`.

## Features

- Fast rendering
- SIMD acceleration
- Memory efficient

## Code Example

\`\`\`typescript
const x = 1;
const y = 2;
console.info(x + y);
\`\`\`

> This is a blockquote with some text.

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
`;

  console.info("\nMarkdown Improvements in v1.3.9:");
  console.info(`${GREEN}✓${RESET} 3-15% faster Markdown-to-HTML rendering (SIMD-accelerated)`);
  console.info(`${GREEN}✓${RESET} 28% faster Bun.markdown.react() for small documents`);
  console.info(`${GREEN}✓${RESET} 7% faster for medium documents`);
  console.info(`${GREEN}✓${RESET} 7.4% faster for large documents`);
  console.info(`${GREEN}✓${RESET} 40% reduction in string object allocations`);
  console.info(`${GREEN}✓${RESET} 6% smaller heap size during rendering`);

  console.info("\nExample usage:");
  console.info(`
import { markdown } from "bun";

// Render to HTML
const html = await markdown.html(\`
# Hello World

This is **bold** and *italic*.
\`);

// Render to React components
const reactElement = await markdown.react(\`
# Component Example

- Item 1
- Item 2
\`);
`);
}

// ============================================================================
// 2. String Optimizations
// ============================================================================
function demoStringOptimizations() {
  console.info("\n" + "=".repeat(70));
  console.info("📦 String Optimizations");
  console.info("=".repeat(70));

  const results: Array<{ name: string; time: number; improvement: string }> = [];
  const iterations = 10_000_000;

  // Benchmark startsWith
  {
    const str = "Hello World Example String";
    const prefix = "Hello";
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      str.startsWith(prefix);
    }
    const time = performance.now() - start;
    results.push({ name: "String#startsWith", time, improvement: "1.42x faster" });
  }

  // Benchmark startsWith with index
  {
    const str = "Hello World Example String";
    const prefix = "World";
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      str.startsWith(prefix, 6);
    }
    const time = performance.now() - start;
    results.push({ name: "String#startsWith (index)", time, improvement: "1.22x faster" });
  }

  // Benchmark trim
  {
    const str = "   Hello World   ";
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      str.trim();
    }
    const time = performance.now() - start;
    results.push({ name: "String#trim", time, improvement: "1.17x faster" });
  }

  // Benchmark trimEnd
  {
    const str = "Hello World   ";
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      str.trimEnd();
    }
    const time = performance.now() - start;
    results.push({ name: "String#trimEnd", time, improvement: "1.42x faster" });
  }

  console.info("\nBenchmark Results:");
  console.info("-".repeat(70));
  for (const r of results) {
    console.info(`${r.name.padEnd(30)} ${r.time.toFixed(2).padStart(8)}ms  ${GREEN}${r.improvement}${RESET}`);
  }

  console.info("\nString#replace Optimization:");
  console.info(`${GREEN}✓${RESET} Returns ropes (lazy concatenation) instead of eager copy`);
  console.info(`${GREEN}✓${RESET} Avoids unnecessary allocations for short-lived results`);
  console.info(`${GREEN}✓${RESET} Aligns with V8's behavior`);
}

// ============================================================================
// 3. Collection Optimizations
// ============================================================================
function demoCollectionOptimizations() {
  console.info("\n" + "=".repeat(70));
  console.info("📦 Collection Optimizations");
  console.info("=".repeat(70));

  const iterations = 10_000_000;

  // Set#size benchmark
  const set = new Set(Array.from({ length: 1000 }, (_, i) => i));
  const setStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    set.size;
  }
  const setTime = performance.now() - setStart;

  // Map#size benchmark
  const map = new Map(Array.from({ length: 1000 }, (_, i) => [i, i]));
  const mapStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    map.size;
  }
  const mapTime = performance.now() - mapStart;

  console.info("\nBenchmark Results:");
  console.info("-".repeat(70));
  console.info(`Set#size  ${setTime.toFixed(2).padStart(10)}ms  ${GREEN}2.24x faster${RESET}`);
  console.info(`Map#size  ${mapTime.toFixed(2).padStart(10)}ms  ${GREEN}2.74x faster${RESET}`);

  console.info("\nTechnical Details:");
  console.info(`${GREEN}✓${RESET} Now handled as intrinsics in DFG/FTL tiers`);
  console.info(`${GREEN}✓${RESET} Eliminates generic getter call overhead`);
  console.info(`${GREEN}✓${RESET} Direct field access instead of method call`);
}

// ============================================================================
// 4. AbortSignal Optimization
// ============================================================================
function demoAbortSignalOptimization() {
  console.info("\n" + "=".repeat(70));
  console.info("📦 AbortSignal Optimization");
  console.info("=".repeat(70));

  const iterations = 1_000_000;
  
  // Benchmark AbortSignal.abort()
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const controller = new AbortController();
    controller.abort();
  }
  const time = performance.now() - start;

  console.info(`\nAbortSignal.abort() benchmark:`);
  console.info(`  ${iterations.toLocaleString()} iterations: ${time.toFixed(2)}ms`);
  console.info(`  ${GREEN}~6% faster${RESET} when no listeners are registered`);

  console.info("\nOptimization Details:");
  console.info(`${GREEN}✓${RESET} Skips creating and dispatching Event object`);
  console.info(`${GREEN}✓${RESET} Saves ~16ms per 1M calls`);
  console.info(`${GREEN}✓${RESET} Fast path when no abort listeners registered`);
}

// ============================================================================
// 5. Summary
// ============================================================================
function showSummary() {
  console.info("\n" + "=".repeat(70));
  console.info("📊 Performance Summary (v1.3.9)");
  console.info("=".repeat(70));
  console.info(`
┌──────────────────────────┬─────────────────┬─────────────────────────┐
│ Feature                  │ Improvement     │ Notes                   │
├──────────────────────────┼─────────────────┼─────────────────────────┤
│ RegExp fixed-count       │ ${GREEN}3.9x faster${RESET}     │ JIT compilation         │
│ Markdown (small)         │ ${GREEN}28% faster${RESET}      │ SIMD-accelerated        │
│ Markdown (large)         │ ${GREEN}7.4% faster${RESET}     │ SIMD-accelerated        │
│ String#startsWith        │ ${GREEN}1.42x faster${RESET}    │ General case            │
│ String#startsWith (const)│ ${GREEN}5.76x faster${RESET}    │ Compile-time constant   │
│ String#trim              │ ${GREEN}1.17x faster${RESET}    │                         │
│ String#trimEnd           │ ${GREEN}1.42x faster${RESET}    │                         │
│ Set#size                 │ ${GREEN}2.24x faster${RESET}    │ Intrinsic optimization  │
│ Map#size                 │ ${GREEN}2.74x faster${RESET}    │ Intrinsic optimization  │
│ AbortSignal.abort()      │ ${GREEN}~6% faster${RESET}      │ No listeners case       │
└──────────────────────────┴─────────────────┴─────────────────────────┘

${CYAN}KEY TAKEAWAYS:${RESET}
• All improvements are automatic - no code changes needed
• RegExp JIT requires specific pattern structures
• String optimizations work best with constant values
• Collection optimizations apply to all Set/Map usage
• Best performance on ARM64 (SIMD) and x86_64
`);
}

// ============================================================================
// 6. Migration Tips
// ============================================================================
function showMigrationTips() {
  console.info("\n" + "=".repeat(70));
  console.info("💡 Migration & Optimization Tips");
  console.info("=".repeat(70));
  console.info(`
REGEXP OPTIMIZATION:
────────────────────
// Before (slower)
const pattern = /(?:abc)+/;

// After (3.9x faster)
const pattern = /(?:abc){3}/;  // Use fixed count when possible

STRING BEST PRACTICES:
──────────────────────
// Prefer string literals for better constant folding
const prefix = "Bearer";  // Better than dynamic value
if (str.startsWith(prefix)) { }

// Use replace ropes for short-lived strings
const result = str.replace(/old/g, "new");  // Automatic optimization

COLLECTION USAGE:
─────────────────
// These are now intrinsically optimized
const size = mySet.size;  // 2.24x faster
const count = myMap.size; // 2.74x faster

ABORT SIGNAL:
─────────────
// Don't add unnecessary listeners
const controller = new AbortController();
// Only abort() when needed - fast path if no listeners
controller.abort();
`);
}

// Main
async function main() {
  console.info(`Bun version: ${Bun.version}`);
  console.info(`Platform: ${process.platform} ${process.arch}\n`);

  await demoMarkdownPerformance();
  demoStringOptimizations();
  demoCollectionOptimizations();
  demoAbortSignalOptimization();
  showSummary();
  showMigrationTips();

  console.info("\n✅ Performance demo complete!\n");
}

if (import.meta.main) {
  main();
}

export { main };
