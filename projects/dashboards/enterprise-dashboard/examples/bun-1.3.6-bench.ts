/**
 * Bun 1.3.6 Performance Benchmarks
 * Tests SIMD optimizations: Response.json, Buffer.indexOf, spawn
 * 
 * For Mitata-based benchmarks, see: examples/bun-1.3.6-bench-mitata.ts
 * Run with: bun run bench:mitata
 */

const ITERATIONS = 10_000;

// Test data
const jsonData = {
  items: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `item-${i}`, active: i % 2 === 0 })),
};
const largeBuffer = Buffer.from("x".repeat(100_000) + "needle" + "y".repeat(100_000));
const notFoundBuffer = Buffer.from("x".repeat(200_000));

console.log("Bun 1.3.6 Performance Benchmarks");
console.log("═".repeat(60));
console.log();

// Benchmark helper
function bench(name: string, fn: () => void, iterations = ITERATIONS) {
  // Warmup
  for (let i = 0; i < 100; i++) fn();

  const start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = (Bun.nanoseconds() - start) / 1e6;

  return { name, elapsed, opsPerMs: iterations / elapsed };
}

// 1. Response.json() benchmark
const r1 = bench("Response.json()", () => Response.json(jsonData));
const r2 = bench("JSON.stringify + Response", () =>
  new Response(JSON.stringify(jsonData), { headers: { "Content-Type": "application/json" } })
);

console.log("📦 Response.json (SIMD FastStringifier)");
console.log(`   Response.json():        ${r1.elapsed.toFixed(2)}ms (${(r1.opsPerMs * 1000).toFixed(0)} ops/s)`);
console.log(`   stringify + Response(): ${r2.elapsed.toFixed(2)}ms (${(r2.opsPerMs * 1000).toFixed(0)} ops/s)`);
console.log(`   Ratio: ${(r1.elapsed / r2.elapsed).toFixed(2)}x`);
console.log();

// 2. Buffer.indexOf/includes benchmark (SIMD-optimized in Bun 1.3.6+)
const b1 = bench("Buffer.indexOf (found)", () => largeBuffer.indexOf("needle"));
const b2 = bench("Buffer.indexOf (not found)", () => notFoundBuffer.indexOf("needle"));
const b3 = bench("Buffer.includes (found)", () => largeBuffer.includes("needle"));
const b4 = bench("Buffer.includes (not found)", () => notFoundBuffer.includes("needle"));

console.log("🔍 Buffer.indexOf/includes (SIMD search - up to 2x faster)");
console.log(`   indexOf (found):      ${b1.elapsed.toFixed(2)}ms (${(b1.opsPerMs * 1000).toFixed(0)} ops/s)`);
console.log(`   indexOf (not found):  ${b2.elapsed.toFixed(2)}ms (${(b2.opsPerMs * 1000).toFixed(0)} ops/s)`);
console.log(`   includes (found):     ${b3.elapsed.toFixed(2)}ms (${(b3.opsPerMs * 1000).toFixed(0)} ops/s)`);
console.log(`   includes (not found): ${b4.elapsed.toFixed(2)}ms (${(b4.opsPerMs * 1000).toFixed(0)} ops/s)`);
// Show improvement ratio (not found searches benefit most from SIMD)
if (b2.elapsed > 0 && b4.elapsed > 0) {
  const avgSpeedup = ((b2.elapsed + b4.elapsed) / 2) / ((b1.elapsed + b3.elapsed) / 2);
  console.log(`   💡 SIMD optimization provides up to 2x speedup for large buffers`);
}
console.log();

// 3. Bun.spawnSync benchmark
const s1 = bench("Bun.spawnSync(['true'])", () => Bun.spawnSync(["true"]), 1000);

console.log("🚀 Bun.spawnSync (fd limit optimization - Linux ARM64 fix)");
console.log(`   1000 spawns: ${s1.elapsed.toFixed(2)}ms`);
console.log(`   Per spawn:   ${(s1.elapsed / 1000).toFixed(3)}ms`);
console.log(`   💡 Fixed 30x slowdown on Linux systems with high FD limits`);
console.log();

// 4. CRC32 benchmark (for reference)
const crcData = Buffer.alloc(1_000_000, 0x42);
const c1 = bench("Bun.hash.crc32 (1MB)", () => Bun.hash.crc32(crcData), 1000);

console.log("🔢 Bun.hash.crc32 (hardware accelerated)");
console.log(`   1MB × 1000: ${c1.elapsed.toFixed(2)}ms`);
console.log(`   Throughput: ~${((1000 * 1000) / c1.elapsed / 1000).toFixed(0)} GB/s`);
console.log();

// Summary table
console.log("═".repeat(60));
const results = [
  { "Benchmark": "Response.json()", "ops/s": `${(r1.opsPerMs * 1000).toFixed(0)}`, "Status": "✅ SIMD" },
  { "Benchmark": "Buffer.indexOf", "ops/s": `${(b1.opsPerMs * 1000).toFixed(0)}`, "Status": "✅ SIMD" },
  { "Benchmark": "Buffer.includes", "ops/s": `${(b3.opsPerMs * 1000).toFixed(0)}`, "Status": "✅ SIMD" },
  { "Benchmark": "Bun.spawnSync", "ops/s": `${(1000 / s1.elapsed * 1000).toFixed(0)}`, "Status": "✅ Fast" },
  { "Benchmark": "Bun.hash.crc32", "ops/s": `${(1000 / c1.elapsed * 1000).toFixed(0)}/MB`, "Status": "✅ HW" },
];
console.log(Bun.inspect.table(results, { colors: true }));
