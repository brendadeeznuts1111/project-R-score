#!/usr/bin/env bun
/**
 * Bun v1.3.9: RegExp JIT Benchmark
 * 
 * Comprehensive benchmark for RegExp JIT optimizations
 */

import { performance } from "node:perf_hooks";

console.info("⚡ Bun v1.3.9: RegExp JIT Benchmark\n");
console.info("=" .repeat(70));

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

interface Pattern {
  name: string;
  pattern: RegExp;
  testString: string;
  description: string;
}

const JIT_PATTERNS: Pattern[] = [
  { name: "Fixed non-capturing", pattern: /(?:abc){3}/, testString: "abcabcabc", description: "Fixed-count group" },
  { name: "Fixed capturing", pattern: /(a+){2}b/, testString: "aaab", description: "Fixed with capture" },
  { name: "Alternatives", pattern: /aaaa|bbbb/, testString: "aaaaxxxx", description: "Known prefixes" },
  { name: "Exact repeat", pattern: /\d{4}/, testString: "1234", description: "Exact count" },
  { name: "Hex color", pattern: /^#(?:[a-f0-9]{3}|[a-f0-9]{6})$/i, testString: "#aabbcc", description: "Real-world example" },
  { name: "UUID-like", pattern: /(?:[0-9a-f]{8}-[0-9a-f]{4})/i, testString: "12345678-1234", description: "Partial UUID" },
];

const INTERPRETER_PATTERNS: Pattern[] = [
  { name: "Variable +", pattern: /(?:abc)+/, testString: "abcabcabc", description: "One or more" },
  { name: "Variable *", pattern: /(a+)*b/, testString: "aaab", description: "Zero or more" },
  { name: "Lazy +?", pattern: /(?:abc)+?/, testString: "abcabcabc", description: "Lazy match" },
  { name: "Range {2,4}", pattern: /\d{2,4}/, testString: "123", description: "Variable range" },
  { name: "Optional ?", pattern: /(abc)?/, testString: "abc", description: "Optional" },
];

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

function formatOpsPerSec(ms: number, iterations: number): string {
  const opsPerSec = (iterations / ms) * 1000;
  if (opsPerSec >= 1e9) {
    return `${(opsPerSec / 1e9).toFixed(2)}B ops/s`;
  } else if (opsPerSec >= 1e6) {
    return `${(opsPerSec / 1e6).toFixed(2)}M ops/s`;
  } else if (opsPerSec >= 1e3) {
    return `${(opsPerSec / 1e3).toFixed(2)}K ops/s`;
  }
  return `${opsPerSec.toFixed(2)} ops/s`;
}

async function runBenchmark() {
  const ITERATIONS = 10_000_000;
  
  console.info(`Bun version: ${Bun.version}`);
  console.info(`Platform: ${process.platform} ${process.arch}`);
  console.info(`Iterations: ${ITERATIONS.toLocaleString()} per pattern\n`);
  
  const jitResults: Array<{ pattern: Pattern; time: number }> = [];
  const interpResults: Array<{ pattern: Pattern; time: number }> = [];
  
  // JIT patterns
  console.info(`${GREEN}✓ JIT-OPTIMIZED PATTERNS${RESET}`);
  console.info("-".repeat(70));
  
  for (const p of JIT_PATTERNS) {
    const time = benchmark(p.pattern, p.testString, ITERATIONS);
    jitResults.push({ pattern: p, time });
    const ops = formatOpsPerSec(time, ITERATIONS);
    console.info(`${formatTime(time).padStart(12)} | ${ops.padStart(14)} | ${p.pattern.toString().padEnd(35)} | ${p.name}`);
  }
  
  // Interpreter patterns
  console.info(`\n${YELLOW}⚠ INTERPRETER PATTERNS${RESET}`);
  console.info("-".repeat(70));
  
  for (const p of INTERPRETER_PATTERNS) {
    const time = benchmark(p.pattern, p.testString, ITERATIONS);
    interpResults.push({ pattern: p, time });
    const ops = formatOpsPerSec(time, ITERATIONS);
    console.info(`${formatTime(time).padStart(12)} | ${ops.padStart(14)} | ${p.pattern.toString().padEnd(35)} | ${p.name}`);
  }
  
  // Summary
  console.info("\n" + "=".repeat(70));
  console.info("📊 SUMMARY");
  console.info("=".repeat(70));
  
  const avgJit = jitResults.reduce((a, b) => a + b.time, 0) / jitResults.length;
  const avgInterp = interpResults.reduce((a, b) => a + b.time, 0) / interpResults.length;
  const speedup = avgInterp / avgJit;
  
  console.info(`Average JIT time:      ${formatTime(avgJit)}`);
  console.info(`Average Interpreter:   ${formatTime(avgInterp)}`);
  console.info(`${CYAN}Overall speedup:       ${speedup.toFixed(2)}x${RESET}`);
  console.info(`Expected (v1.3.9):     ~3.9x for fixed-count patterns`);
  
  // Per-pattern comparison
  console.info("\n" + "=".repeat(70));
  console.info("🔄 JIT vs INTERPRETER COMPARISONS");
  console.info("=".repeat(70));
  
  const comparisons = [
    { jit: 0, interp: 0, label: "Fixed vs Variable (non-capturing)" },
    { jit: 1, interp: 1, label: "Fixed vs Variable (capturing)" },
    { jit: 3, interp: 2, label: "Exact vs Variable range" },
  ];
  
  for (const comp of comparisons) {
    const jit = jitResults[comp.jit];
    const interp = interpResults[comp.interp];
    if (jit && interp) {
      const ratio = interp.time / jit.time;
      console.info(`\n${comp.label}:`);
      console.info(`  JIT:      ${jit.pattern.pattern.toString()} (${formatTime(jit.time)})`);
      console.info(`  Interpreter: ${interp.pattern.pattern.toString()} (${formatTime(interp.time)})`);
      console.info(`  ${GREEN}Speedup:  ${ratio.toFixed(2)}x${RESET}`);
    }
  }
  
  // Best practices
  console.info("\n" + "=".repeat(70));
  console.info("💡 OPTIMIZATION RECOMMENDATIONS");
  console.info("=".repeat(70));
  console.info(`
${GREEN}✓ Use fixed-count quantifiers:${RESET}
  /(?:abc){3}/  →  3.9x faster than /(?:abc)+/
  
${GREEN}✓ Use non-capturing groups:${RESET}
  /(?:pattern)/  →  Faster than /(pattern)/ when capture not needed
  
${GREEN}✓ Prefer exact counts:${RESET}
  /\\d{4}/  →  JIT optimized
  /\\d{2,4}/  →  Interpreter (variable range)
  
${YELLOW}✗ Avoid in hot paths:${RESET}
  /pattern+/, /pattern*/, /pattern+?/  →  Variable quantifiers
  /(a+)*b/, /(b+)+/  →  Nested quantifiers
`);
}

if (import.meta.main) {
  runBenchmark();
}

export { runBenchmark, JIT_PATTERNS, INTERPRETER_PATTERNS };
