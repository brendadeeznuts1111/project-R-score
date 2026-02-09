// regexp-jit-bench.ts — Fixed-count JIT + SIMD prefix benchmarks
// Features #10-11 — PR #26769 — Enhancement in Bun 1.3.9
//
// Bun's JSC upgrade brings:
// - SIMD fast prefix search (ARM64 TBL2 / x86_64 PTEST)
// - Fixed-count parentheses JIT (~3.9x speedup)
//
// Run: bun run examples/regexp-jit-bench.ts

const ITERATIONS = 1_000_000;

// --- JIT-optimized patterns (fixed-count) ---
const fixedCount = /(?:abc){3}/;
const fixedCountCapture = /(a+){2}b/;

// --- SIMD-optimized patterns (known prefixes) ---
const simdPrefix = /aaaa|bbbb/;

// --- Non-optimized patterns (still interpreter) ---
const variableCount = /(?:abc)+/;
const zeroOrMore = /(a+)*b/;

function bench(label: string, pattern: RegExp, input: string, n: number): number {
  const start = Bun.nanoseconds();
  for (let i = 0; i < n; i++) {
    pattern.test(input);
  }
  const elapsed = (Bun.nanoseconds() - start) / 1e6;
  console.log(`${label.padEnd(32)} ${n.toLocaleString()} ops in ${elapsed.toFixed(1)}ms`);
  return elapsed;
}

console.log("=== RegExp JIT & SIMD Benchmarks ===\n");

console.log("JIT-optimized (fixed-count):");
bench("  (?:abc){3}", fixedCount, "abcabcabc", ITERATIONS);
bench("  (a+){2}b", fixedCountCapture, "aaab", ITERATIONS);

console.log("\nSIMD-optimized (prefix scan):");
bench("  aaaa|bbbb", simdPrefix, "xxxxaaaaxxx", ITERATIONS);

console.log("\nNon-optimized (interpreter):");
bench("  (?:abc)+ variable", variableCount, "abcabcabc", ITERATIONS);
bench("  (a+)*b zero-or-more", zeroOrMore, "aaab", ITERATIONS);

console.log("\nCompare JIT vs interpreter times to see the ~3.9x speedup.");
