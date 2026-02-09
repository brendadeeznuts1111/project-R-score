#!/usr/bin/env bun
/**
 * Demo: Performance Optimizations
 * 
 * Showcases RegExp JIT, Markdown, String optimizations
 */

import { performance } from "perf_hooks";

console.log("⚡ Bun v1.3.9: Performance Optimizations\n");
console.log("=".repeat(70));

// RegExp JIT Demo
console.log("\n🔍 1. RegExp JIT Optimization (3.9x speedup)");
console.log("-".repeat(70));

const jitPattern = /(?:abc){3}/;  // Fixed-count (JIT-optimized)
const interpPattern = /(?:abc)+/;  // Variable count (interpreter)

const testString = "abcabcabc";

function benchmarkRegex(pattern: RegExp, str: string, iterations: number): number {
  // Warmup
  for (let i = 0; i < 1000; i++) {
    pattern.test(str);
  }
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    pattern.test(str);
  }
  const end = performance.now();
  
  return end - start;
}

const iterations = 1_000_000;
const jitTime = benchmarkRegex(jitPattern, testString, iterations);
const interpTime = benchmarkRegex(interpPattern, testString, iterations);
const speedup = interpTime / jitTime;

console.log(`JIT-optimized pattern:     ${jitTime.toFixed(2)}ms`);
console.log(`Interpreter pattern:       ${interpTime.toFixed(2)}ms`);
console.log(`Speedup:                   ${speedup.toFixed(2)}x`);
console.log(`Expected (v1.3.9):         ~3.9x`);

// Markdown Demo
console.log("\n📝 2. Markdown Performance");
console.log("-".repeat(70));

const markdown = `# Hello World

This is **bold** and *italic* text.

- Item 1
- Item 2
- Item 3

\`\`\`javascript
console.log("Hello");
\`\`\`
`;

const markdownIterations = 10_000;
const markdownStart = performance.now();
for (let i = 0; i < markdownIterations; i++) {
  Bun.markdown.html(markdown);
}
const markdownEnd = performance.now();
const markdownAvg = (markdownEnd - markdownStart) / markdownIterations;

console.log(`Average render time:       ${(markdownAvg * 1000).toFixed(2)} µs`);
console.log(`Expected improvement:      3-15% faster (SIMD-accelerated)`);

// String optimizations
console.log("\n🔤 3. String Optimizations");
console.log("-".repeat(70));

const str = "  Hello World  ";
const strIterations = 10_000_000;

// startsWith
const startsWithStart = performance.now();
for (let i = 0; i < strIterations; i++) {
  str.startsWith("Hello");
}
const startsWithEnd = performance.now();
const startsWithTime = startsWithEnd - startsWithStart;

// trim
const trimStart = performance.now();
for (let i = 0; i < strIterations; i++) {
  str.trim();
}
const trimEnd = performance.now();
const trimTime = trimEnd - trimStart;

console.log(`String#startsWith:         ${(startsWithTime / strIterations * 1_000_000).toFixed(2)} ns/op`);
console.log(`Expected improvement:      1.42x faster`);
console.log(`String#trim:               ${(trimTime / strIterations * 1_000_000).toFixed(2)} ns/op`);
console.log(`Expected improvement:      1.17x faster`);

// Set/Map size
console.log("\n📊 4. Set/Map Size Optimization");
console.log("-".repeat(70));

const testSet = new Set([1, 2, 3, 4, 5]);
const testMap = new Map([[1, "a"], [2, "b"], [3, "c"]]);

const sizeIterations = 100_000_000;

const setSizeStart = performance.now();
for (let i = 0; i < sizeIterations; i++) {
  testSet.size;
}
const setSizeEnd = performance.now();
const setSizeTime = setSizeEnd - setSizeStart;

const mapSizeStart = performance.now();
for (let i = 0; i < sizeIterations; i++) {
  testMap.size;
}
const mapSizeEnd = performance.now();
const mapSizeTime = mapSizeEnd - mapSizeStart;

console.log(`Set#size:                  ${(setSizeTime / sizeIterations * 1_000_000).toFixed(2)} ns/op`);
console.log(`Expected improvement:      2.24x faster`);
console.log(`Map#size:                  ${(mapSizeTime / sizeIterations * 1_000_000).toFixed(2)} ns/op`);
console.log(`Expected improvement:      2.74x faster`);

// AbortSignal
console.log("\n🚫 5. AbortSignal Optimization");
console.log("-".repeat(70));

const abortIterations = 1_000_000;

const abortStart = performance.now();
for (let i = 0; i < abortIterations; i++) {
  AbortSignal.abort();
}
const abortEnd = performance.now();
const abortTime = abortEnd - abortStart;

console.log(`AbortSignal.abort():       ${(abortTime / abortIterations * 1_000_000).toFixed(2)} ns/op`);
console.log(`Expected improvement:      ~6% faster (no listeners)`);
console.log(`Saves:                    ~16ms per 1M calls`);

console.log("\n✅ Demo complete!");
console.log("\nKey Optimizations:");
console.log("  • RegExp JIT: 3.9x faster for fixed-count patterns");
console.log("  • Markdown: 3-15% faster (SIMD-accelerated)");
console.log("  • String methods: 1.1-1.4x faster");
console.log("  • Set/Map size: 2.2-2.7x faster");
console.log("  • AbortSignal: ~6% faster (no listeners)");
console.log("\nAll optimizations are automatic - no code changes needed!");
