#!/usr/bin/env bun
/**
 * Demo: Performance Optimizations
 * 
 * Showcases RegExp JIT, Markdown, String optimizations
 */

import { performance } from "perf_hooks";

console.info("⚡ Bun v1.3.9: Performance Optimizations\n");
console.info("=".repeat(70));

// RegExp JIT Demo
console.info("\n🔍 1. RegExp JIT Optimization (3.9x speedup)");
console.info("-".repeat(70));

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

console.info(`JIT-optimized pattern:     ${jitTime.toFixed(2)}ms`);
console.info(`Interpreter pattern:       ${interpTime.toFixed(2)}ms`);
console.info(`Speedup:                   ${speedup.toFixed(2)}x`);
console.info(`Expected (v1.3.9):         ~3.9x`);

// Markdown Demo
console.info("\n📝 2. Markdown Performance (SIMD-Accelerated)");
console.info("-".repeat(70));

const smallMarkdown = "# Hello\n\nThis is **bold** text.";
const mediumMarkdown = `# Document

This is a paragraph with **bold** and *italic* text.

## Section 1
- Item 1
- Item 2
- Item 3

\`\`\`javascript
const x = 1;
console.info(x);
\`\`\`
`;

console.info("Bun.markdown.html() - SIMD-accelerated HTML escaping");
console.info("(&, <, >, \" characters)");

const smallIterations = 100_000;
const smallStart = performance.now();
for (let i = 0; i < smallIterations; i++) {
  Bun.markdown.html(smallMarkdown);
}
const smallEnd = performance.now();
const smallAvg = (smallEnd - smallStart) / smallIterations;

console.info(`Small doc (${smallMarkdown.length} chars):  ${(smallAvg * 1000).toFixed(2)} µs`);
console.info(`Expected: ~28% faster for small documents`);

// React markdown
console.info("\nBun.markdown.react() - Cached HTML tag strings");
const reactIterations = 50_000;
const reactStart = performance.now();
for (let i = 0; i < reactIterations; i++) {
  Bun.markdown.react(smallMarkdown);
}
const reactEnd = performance.now();
const reactAvg = (reactEnd - reactStart) / reactIterations;

console.info(`React render: ${(reactAvg * 1000).toFixed(2)} µs`);
console.info(`Improvements: 28% faster (small), 7% faster (medium/large)`);
console.info(`Memory: 40% fewer string objects, 6% less heap`);

// String optimizations
console.info("\n🔤 3. String Optimizations");
console.info("-".repeat(70));

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

console.info(`String#startsWith:         ${(startsWithTime / strIterations * 1_000_000).toFixed(2)} ns/op`);
console.info(`Expected improvement:      1.42x faster`);
console.info(`String#trim:               ${(trimTime / strIterations * 1_000_000).toFixed(2)} ns/op`);
console.info(`Expected improvement:      1.17x faster`);

// Set/Map size
console.info("\n📊 4. Set/Map Size Optimization");
console.info("-".repeat(70));

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

console.info(`Set#size:                  ${(setSizeTime / sizeIterations * 1_000_000).toFixed(2)} ns/op`);
console.info(`Expected improvement:      2.24x faster`);
console.info(`Map#size:                  ${(mapSizeTime / sizeIterations * 1_000_000).toFixed(2)} ns/op`);
console.info(`Expected improvement:      2.74x faster`);

// AbortSignal
console.info("\n🚫 5. AbortSignal Optimization");
console.info("-".repeat(70));

const abortIterations = 1_000_000;

const abortStart = performance.now();
for (let i = 0; i < abortIterations; i++) {
  AbortSignal.abort();
}
const abortEnd = performance.now();
const abortTime = abortEnd - abortStart;

console.info(`AbortSignal.abort():       ${(abortTime / abortIterations * 1_000_000).toFixed(2)} ns/op`);
console.info(`Expected improvement:      ~6% faster (no listeners)`);
console.info(`Saves:                    ~16ms per 1M calls`);

console.info("\n✅ Demo complete!");
console.info("\nKey Optimizations:");
console.info("  • RegExp JIT: 3.9x faster for fixed-count patterns");
console.info("  • Markdown: 3-15% faster (SIMD-accelerated)");
console.info("  • String methods: 1.1-1.4x faster");
console.info("  • Set/Map size: 2.2-2.7x faster");
console.info("  • AbortSignal: ~6% faster (no listeners)");
console.info("\nAll optimizations are automatic - no code changes needed!");
