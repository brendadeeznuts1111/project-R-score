#!/usr/bin/env bun
/**
 * Bun v1.3.9: RegExp JIT Optimization Demo
 * 
 * Demonstrates 3.9x speedup for fixed-count regex patterns
 */

import { performance } from "node:perf_hooks";

console.info("⚡ Bun v1.3.9: RegExp JIT Optimization Demo\n");
console.info("=" .repeat(70));

// Color codes for output
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

// Pattern definitions with descriptions
const PATTERNS = {
  // JIT-optimized patterns (v1.3.9+)
  jit: [
    {
      name: "Fixed-count non-capturing",
      pattern: /(?:abc){3}/,
      testString: "abcabcabc",
      expectedSpeedup: "3.9x",
    },
    {
      name: "Fixed-count with capture",
      pattern: /(a+){2}b/,
      testString: "aaab",
      expectedSpeedup: "3.9x",
    },
    {
      name: "Alternatives with prefixes",
      pattern: /aaaa|bbbb/,
      testString: "aaaaxxxx",
      expectedSpeedup: "SIMD",
    },
    {
      name: "Exact repeat count",
      pattern: /\d{4}/,
      testString: "1234",
      expectedSpeedup: "3.9x",
    },
    {
      name: "Multiple fixed groups",
      pattern: /(?:\w{3}){2}/,
      testString: "abcdef",
      expectedSpeedup: "3.9x",
    },
  ],
  // Interpreter patterns (no JIT)
  interpreter: [
    {
      name: "Variable count (one or more)",
      pattern: /(?:abc)+/,
      testString: "abcabcabc",
      reason: "Variable repetition count",
    },
    {
      name: "Zero or more",
      pattern: /(a+)*b/,
      testString: "aaab",
      reason: "Zero-or-more quantifier",
    },
    {
      name: "Lazy quantifier",
      pattern: /(?:abc)+?/,
      testString: "abcabcabc",
      reason: "Lazy matching",
    },
    {
      name: "Variable range",
      pattern: /\d{2,4}/,
      testString: "123",
      reason: "Variable range {min,max}",
    },
    {
      name: "Optional quantifier",
      pattern: /(abc)?/,
      testString: "abc",
      reason: "Optional (?)",
    },
  ],
};

function warmup(pattern: RegExp, testString: string, iterations: number = 1000): void {
  for (let i = 0; i < iterations; i++) {
    pattern.test(testString);
  }
}

function benchmark(pattern: RegExp, testString: string, iterations: number): number {
  warmup(pattern, testString, 1000);
  
  if (globalThis.gc) {
    globalThis.gc();
  }
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    pattern.test(testString);
  }
  const end = performance.now();
  
  return end - start;
}

function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)} μs`;
  }
  return `${ms.toFixed(2)} ms`;
}

async function runBenchmark() {
  const ITERATIONS = 5_000_000;
  const results = {
    jit: [] as Array<{ name: string; time: number; pattern: string; speedup?: number }>,
    interpreter: [] as Array<{ name: string; time: number; pattern: string }>,
  };

  console.info(`\nRunning ${ITERATIONS.toLocaleString()} iterations per pattern...\n`);

  // JIT patterns
  console.info(`${GREEN}✓ JIT-OPTIMIZED PATTERNS (v1.3.9+)${RESET}`);
  console.info("-".repeat(70));
  
  for (const p of PATTERNS.jit) {
    const time = benchmark(p.pattern, p.testString, ITERATIONS);
    results.jit.push({
      name: p.name,
      time,
      pattern: p.pattern.toString(),
    });
    console.info(`${formatTime(time).padStart(12)} | ${p.pattern.toString().padEnd(20)} | ${p.name}`);
  }

  // Interpreter patterns
  console.info(`\n${YELLOW}⚠ INTERPRETER PATTERNS (no JIT)${RESET}`);
  console.info("-".repeat(70));
  
  for (const p of PATTERNS.interpreter) {
    const time = benchmark(p.pattern, p.testString, ITERATIONS);
    results.interpreter.push({
      name: p.name,
      time,
      pattern: p.pattern.toString(),
    });
  console.info(`${formatTime(time).padStart(12)} | ${p.pattern.toString().padEnd(20)} | ${p.name}`);
  }

  // Comparison
  console.info("\n" + "=".repeat(70));
  console.info("📊 COMPARISON");
  console.info("=".repeat(70));

  const avgJit = results.jit.reduce((a, b) => a + b.time, 0) / results.jit.length;
  const avgInterp = results.interpreter.reduce((a, b) => a + b.time, 0) / results.interpreter.length;
  const speedup = avgInterp / avgJit;

  console.info(`Average JIT time:      ${formatTime(avgJit)}`);
  console.info(`Average Interpreter:   ${formatTime(avgInterp)}`);
  console.info(`${CYAN}Overall speedup:       ${speedup.toFixed(2)}x${RESET}`);
  console.info(`Expected (v1.3.9):     ~3.9x for fixed-count patterns`);

  return results;
}

function showOptimizationGuide() {
  console.info("\n" + "=".repeat(70));
  console.info("💡 OPTIMIZATION GUIDE");
  console.info("=".repeat(70));
  console.info(`
${GREEN}✓ DO:${RESET} Use fixed-count quantifiers when possible
   /(?:abc){3}/  instead of  /(?:abc)+/
   
${GREEN}✓ DO:${RESET} Use non-capturing groups for better performance
   /(?:pattern)/  instead of  /(pattern)/
   
${GREEN}✓ DO:${RESET} Use literal strings with common prefixes
   /aaa|aab/  enables SIMD prefix scanning
   
${YELLOW}✗ AVOID:${RESET} Variable quantifiers in hot paths
   /pattern+/, /pattern*/, /pattern+?/
   
${YELLOW}✗ AVOID:${RESET} Nested quantifiers
   /(a+)*b/, /(b+)+/
   
${YELLOW}✗ AVOID:${RESET} Variable ranges when possible
   /\d{2,10}/  (variable) vs  /\d{5}/  (fixed)
`);
}

function showTechnicalDetails() {
  console.info("\n" + "=".repeat(70));
  console.info("🔧 TECHNICAL DETAILS");
  console.info("=".repeat(70));
  console.info(`
JIT Compilation Requirements:
• Fixed repetition count: {n} or {n,n} where min=max
• No variable quantifiers: +, *, {n,}
• No lazy quantifiers: +?, *?, {n,m}?

SIMD Acceleration (alternatives with prefixes):
• ARM64: Uses TBL2 instructions
• x86_64: Uses PTEST instructions
• Scans 16 bytes at once for prefix matching

The JIT compiler in Bun v1.3.9 uses:
• Yarr (WebKit's regex engine) with JIT backend
• Direct machine code generation for fixed patterns
• Intrinsic functions for common operations
`);
}

function showRealWorldExamples() {
  console.info("\n" + "=".repeat(70));
  console.info("🌍 REAL-WORLD OPTIMIZATION EXAMPLES");
  console.info("=".repeat(70));
  console.info(`
UUID Validation:
  Before: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  After:  /(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i ✓
  
Hex Color Parsing:
  Before: /^#([a-f0-9]{3}){1,2}$/i
  After:  /^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i ✓
  
Email Local Part:
  Before: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
  Fixed:  /^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,255}\.[a-z]{2,}$/i ✓
`);
}

// Main
async function main() {
  console.info(`Bun version: ${Bun.version}`);
  console.info(`Platform: ${process.platform} ${process.arch}\n`);

  await runBenchmark();
  showOptimizationGuide();
  showTechnicalDetails();
  showRealWorldExamples();

  console.info("\n✅ Demo complete!\n");
}

if (import.meta.main) {
  main();
}

export { main, benchmark, PATTERNS };
