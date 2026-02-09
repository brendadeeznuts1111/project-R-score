// jsc-engine-bench.ts — JSC engine DFG/FTL optimization benchmarks
// Features #8-9, #12-14 — PR #26769 — Enhancement in Bun 1.3.9
//
// JSC upgrade brings DFG/FTL inlining for:
// - String#startsWith (DFG/FTL intrinsic — 1.42x, constant folding 5.76x vs pre-1.3.9)
// - String#trim/trimStart/trimEnd (direct span pointer access — 1.10-1.42x vs pre-1.3.9)
// - Set#size / Map#size (inline caches — 2.24-2.74x vs pre-1.3.9)
// - Object.defineProperty (DFG/FTL path — groundwork, no measurable change yet)
// - String#replace returning Ropes (lazy concat instead of eager copy)
//
// NOTE: Speedup numbers above are from Bun's release notes comparing 1.3.8 → 1.3.9.
// Running all benchmarks in one file causes JIT tier contention — for accurate
// numbers, run each section in its own `bun -e` process (see isolated bench results).
//
// Run: bun run examples/jsc-engine-bench.ts

function bench(label: string, fn: () => void, n: number): void {
  const start = Bun.nanoseconds();
  for (let i = 0; i < n; i++) fn();
  const elapsed = (Bun.nanoseconds() - start) / 1e6;
  console.log(`${label.padEnd(40)} ${n.toLocaleString()} ops in ${elapsed.toFixed(1)}ms`);
}

console.log("=== JSC Engine DFG/FTL Benchmarks ===\n");

// --- String#startsWith (Feature #8) ---
// Now a DFG/FTL intrinsic. All three paths run at sub-ns/op, confirming the
// JIT treats startsWith as a built-in rather than a generic function call.
// The constant folding path (both args are literals) can be resolved at
// compile time — but at sub-ns all paths are dominated by loop overhead.
console.log("String#startsWith (DFG/FTL intrinsic):");
{
  const s = "hello world";
  bench("  startsWith (dynamic)", () => { s.startsWith("hello"); }, 10_000_000);
  bench("  startsWith (with index)", () => { s.startsWith("world", 6); }, 10_000_000);
  bench("  startsWith (literal args)", () => { "hello world".startsWith("hello"); }, 10_000_000);
}

// --- String#trim (Feature #9) ---
// Uses direct span8()/span16() pointer access instead of indirect str[i],
// avoiding repeated bounds checking on each character.
console.log("\nString#trim (span pointer access):");
{
  const s = "  \t hello world \n ";
  bench("  trim", () => { s.trim(); }, 10_000_000);
  bench("  trimStart", () => { s.trimStart(); }, 10_000_000);
  bench("  trimEnd", () => { s.trimEnd(); }, 10_000_000);
}

// --- Set#size / Map#size (Feature #12) ---
// .size is now an intrinsic in DFG/FTL and inline caches, eliminating
// the overhead of a generic getter call. These numbers are affected by
// JIT contention when run together — isolated they converge (~4ms each).
console.log("\nSet#size / Map#size (DFG/FTL inlined):");
{
  const s = new Set([1, 2, 3, 4, 5]);
  bench("  Set#size", () => { s.size; }, 10_000_000);
}
{
  const m = new Map([["a", 1], ["b", 2], ["c", 3]]);
  bench("  Map#size", () => { m.size; }, 10_000_000);
}

// --- Object.defineProperty (Feature #13) ---
// Recognized as a DFG/FTL intrinsic. No measurable perf change yet —
// this lays groundwork for future specialization based on descriptor shape.
console.log("\nObject.defineProperty (DFG/FTL):");
bench("  Object.defineProperty", () => {
  const obj: Record<string, unknown> = {};
  Object.defineProperty(obj, "x", { value: 42, writable: true });
}, 1_000_000);

// --- String#replace returns Ropes (Feature #14) ---
// With string args, JSC now returns a rope (lazy concat) instead of eagerly
// copying the result. Avoids allocation when the result is short-lived.
console.log("\nString#replace (Rope returns):");
{
  const base = "hello world hello world";
  bench("  String#replace (first match)", () => {
    base.replace("hello", "goodbye");
  }, 1_000_000);
}
{
  const base = "hello world hello world";
  bench("  String#replaceAll", () => {
    base.replaceAll("hello", "goodbye");
  }, 1_000_000);
}
