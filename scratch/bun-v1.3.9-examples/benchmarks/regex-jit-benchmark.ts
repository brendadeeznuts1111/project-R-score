/**
 * Bun v1.3.9 RegExp JIT Benchmark
 * 
 * Demonstrates the 3.9x speedup for fixed-count regex patterns
 * vs variable-count patterns (which remain in interpreter mode)
 * 
 * JIT-OPTIMIZED patterns (v1.3.9+):
 *   - /(?:abc){3}/     Fixed-count non-capturing groups
 *   - /(a+){2}b/       Fixed-count with captures
 *   - /aaaa|bbbb/      Alternatives with known prefixes
 * 
 * INTERPRETER patterns (no JIT):
 *   - /(?:abc)+/       Variable count
 *   - /(a+)*b/         Zero-or-more quantifiers
 */

import { performance } from "perf_hooks";

// Test patterns
const PATTERNS = {
  // JIT-optimized (fixed-count)
  jit_noncapturing: {
    pattern: /(?:abc){3}/,
    testString: "abcabcabc",
    description: "Fixed-count non-capturing group",
  },
  jit_capturing: {
    pattern: /(a+){2}b/,
    testString: "aaab",
    description: "Fixed-count with captures",
  },
  jit_alternatives: {
    pattern: /aaaa|bbbb/,
    testString: "aaaaxxxx",
    description: "Alternatives with known prefixes",
  },
  // Interpreter (variable-count)
  interpreter_plus: {
    pattern: /(?:abc)+/,
    testString: "abcabcabc",
    description: "Variable count (one or more)",
  },
  interpreter_star: {
    pattern: /(a+)*b/,
    testString: "aaab",
    description: "Zero-or-more quantifiers",
  },
  interpreter_lazy: {
    pattern: /(?:abc)+?/,
    testString: "abcabcabc",
    description: "Lazy variable count",
  },
};

// Warmup function to trigger JIT compilation
function warmup(pattern: RegExp, testString: string, iterations: number = 1000): void {
  for (let i = 0; i < iterations; i++) {
    pattern.test(testString);
  }
}

// Benchmark function
function benchmark(name: string, pattern: RegExp, testString: string, iterations: number): number {
  // Warmup
  warmup(pattern, testString, 1000);
  
  // Force garbage collection if available
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

// Format milliseconds
function formatMs(ms: number): string {
  return ms.toFixed(3).padStart(10) + " ms";
}

// Main benchmark
async function runBenchmark() {
  console.log("=".repeat(70));
  console.log("Bun v1.3.9 RegExp JIT Benchmark");
  console.log("=".repeat(70));
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log("");
  
  const ITERATIONS = 10_000_000;
  const results: Array<{
    name: string;
    description: string;
    time: number;
    type: "jit" | "interpreter";
  }> = [];
  
  console.log(`Running ${ITERATIONS.toLocaleString()} iterations per pattern...\n`);
  
  // JIT-optimized patterns
  console.log("⚡ JIT-OPTIMIZED PATTERNS (v1.3.9+)");
  console.log("-".repeat(70));
  
  for (const [name, config] of Object.entries(PATTERNS)) {
    if (!name.startsWith("jit_")) continue;
    
    const time = benchmark(name, config.pattern, config.testString, ITERATIONS);
    results.push({ name, description: config.description, time, type: "jit" });
    console.log(`${formatMs(time)} | ${config.pattern.toString().padEnd(20)} | ${config.description}`);
  }
  
  console.log("");
  console.log("🐢 INTERPRETER PATTERNS (no JIT)");
  console.log("-".repeat(70));
  
  for (const [name, config] of Object.entries(PATTERNS)) {
    if (!name.startsWith("interpreter_")) continue;
    
    const time = benchmark(name, config.pattern, config.testString, ITERATIONS);
    results.push({ name, description: config.description, time, type: "interpreter" });
    console.log(`${formatMs(time)} | ${config.pattern.toString().padEnd(20)} | ${config.description}`);
  }
  
  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  
  const jitResults = results.filter(r => r.type === "jit");
  const interpreterResults = results.filter(r => r.type === "interpreter");
  
  const avgJit = jitResults.reduce((a, b) => a + b.time, 0) / jitResults.length;
  const avgInterpreter = interpreterResults.reduce((a, b) => a + b.time, 0) / interpreterResults.length;
  const speedup = avgInterpreter / avgJit;
  
  console.log(`Average JIT time:      ${formatMs(avgJit)}`);
  console.log(`Average Interpreter:   ${formatMs(avgInterpreter)}`);
  console.log(`Speedup factor:        ${speedup.toFixed(2)}x`);
  console.log(`Expected (v1.3.9):     ~3.9x for fixed-count patterns`);
  console.log("");
  
  // Per-pattern comparison
  console.log("PATTERN COMPARISONS:");
  console.log("-".repeat(70));
  
  const comparisons = [
    { jit: "jit_noncapturing", interp: "interpreter_plus", label: "Fixed vs Variable count" },
  ];
  
  for (const comp of comparisons) {
    const jitResult = results.find(r => r.name === comp.jit);
    const interpResult = results.find(r => r.name === comp.interp);
    if (jitResult && interpResult) {
      const ratio = interpResult.time / jitResult.time;
      console.log(`${comp.label}:`);
      console.log(`  ${PATTERNS[comp.jit as keyof typeof PATTERNS].pattern.toString()} vs`);
      console.log(`  ${PATTERNS[comp.interp as keyof typeof PATTERNS].pattern.toString()}`);
      console.log(`  Speedup: ${ratio.toFixed(2)}x\n`);
    }
  }
  
  // Regex optimization tips
  console.log("=".repeat(70));
  console.log("REGEX OPTIMIZATION TIPS (v1.3.9+)");
  console.log("=".repeat(70));
  console.log("✓ USE fixed-count quantifiers: {3}, {2,5} (when max=min)");
  console.log("✓ USE non-capturing groups: (?:...) when capture not needed");
  console.log("✓ USE literal alternatives: /abc|def/ with common prefixes");
  console.log("✗ AVOID variable quantifiers: +, *, +?, *? in hot paths");
  console.log("✗ AVOID nested quantifiers: (a+)*, (b+)+");
  console.log("");
}

runBenchmark().catch(console.error);
