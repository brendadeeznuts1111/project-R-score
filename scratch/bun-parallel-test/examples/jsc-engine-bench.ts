// jsc-engine-bench.ts — JSC engine DFG/FTL optimization benchmarks
// Features #8-9, #12-14 — PR #26769 — Enhancement in Bun 1.3.9
//
// JSC upgrade brings DFG/FTL inlining for:
// - String#startsWith (DFG/FTL intrinsic, up to 5.76x with constant folding)
// - String#trim/trimStart/trimEnd (direct pointer access, 1.10-1.42x)
// - Set#size / Map#size (inline caches, 2.24-2.74x)
// - Object.defineProperty (DFG/FTL path)
// - String#replace returning Ropes (lazy concat)
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
console.log("String#startsWith (DFG/FTL intrinsic):");
{
  const s = "hello world";
  bench("  startsWith (dynamic)", () => { s.startsWith("hello"); }, 10_000_000);
  bench("  startsWith (with index)", () => { s.startsWith("world", 6); }, 10_000_000);
  // Constant folding path — both string and search known at compile time
  bench("  startsWith (constant fold)", () => { "hello world".startsWith("hello"); }, 10_000_000);
}

// --- String#trim (Feature #9) ---
console.log("\nString#trim (span pointer access):");
{
  const s = "  \t hello world \n ";
  bench("  trim", () => { s.trim(); }, 10_000_000);
  bench("  trimStart", () => { s.trimStart(); }, 10_000_000);
  bench("  trimEnd", () => { s.trimEnd(); }, 10_000_000);
}

// --- Set#size / Map#size (Feature #12) ---
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
console.log("\nObject.defineProperty (DFG/FTL):");
bench("  Object.defineProperty", () => {
  const obj: Record<string, unknown> = {};
  Object.defineProperty(obj, "x", { value: 42, writable: true });
}, 1_000_000);

// --- String#replace returns Ropes (Feature #14) ---
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
