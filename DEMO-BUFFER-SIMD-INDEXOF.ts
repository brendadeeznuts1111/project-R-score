#!/usr/bin/env bun
/**
 * Bun Buffer.indexOf/includes SIMD Optimization Demo
 * 
 * Bun 1.3.6+ uses SIMD-optimized search functions for Buffer.indexOf() and 
 * Buffer.includes(), providing up to 2x performance improvement when searching 
 * for patterns in large buffers.
 * 
 * Run: bun DEMO-BUFFER-SIMD-INDEXOF.ts
 */

console.log("🔍 Bun Buffer.indexOf/includes SIMD Optimization Demo");
console.log("═".repeat(60));
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════
const ITERATIONS = 99_999;
const WARMUP = 1_000;

// ═══════════════════════════════════════════════════════════════════════════════
// Benchmark Helper
// ═══════════════════════════════════════════════════════════════════════════════
function bench(name: string, fn: () => void, iterations = ITERATIONS) {
  // Warmup
  for (let i = 0; i < WARMUP; i++) fn();
  
  // Force GC if available for consistent measurements
  if (globalThis.gc) globalThis.gc();
  
  const start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = (Bun.nanoseconds() - start) / 1e6;
  
  return { name, elapsed, perOp: elapsed / iterations * 1000 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Data - Recreating the official benchmark scenario
// ═══════════════════════════════════════════════════════════════════════════════
console.log("📊 Creating test buffers...");

// 44,500 bytes buffer with needle at the end (as in official benchmark)
const bufferWithNeedle = Buffer.from("a".repeat(44_500 - 6) + "needle");
const bufferWithoutNeedle = Buffer.from("a".repeat(44_500));

// Large 1MB+ buffer
const largeBuffer = Buffer.from("x".repeat(1_000_000) + "TARGET" + "y".repeat(100_000));
const largeBufferNoMatch = Buffer.from("z".repeat(1_100_000));

console.log(`   Buffer (with pattern): ${bufferWithNeedle.length.toLocaleString()} bytes`);
console.log(`   Buffer (no pattern):   ${bufferWithoutNeedle.length.toLocaleString()} bytes`);
console.log(`   Large buffer:          ${largeBuffer.length.toLocaleString()} bytes`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Official Benchmark Recreation (44,500 bytes)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("🚀 Official Benchmark Recreation (44,500 bytes × 99,999 iterations)");
console.log("─".repeat(60));

const r1 = bench("44,500 bytes .includes (true)", () => bufferWithNeedle.includes("needle"));
const r2 = bench("44,500 bytes .includes (false)", () => bufferWithoutNeedle.includes("needle"));
const r3 = bench("44,500 bytes .indexOf (true)", () => bufferWithNeedle.indexOf("needle"));
const r4 = bench("44,500 bytes .indexOf (false)", () => bufferWithoutNeedle.indexOf("needle"));

console.log(`   [${r1.elapsed.toFixed(2)}ms] 44,500 bytes .includes true`);
console.log(`   [${r2.elapsed.toFixed(2)}ms] 44,500 bytes .includes false`);
console.log(`   [${r3.elapsed.toFixed(2)}ms] 44,500 bytes .indexOf true`);
console.log(`   [${r4.elapsed.toFixed(2)}ms] 44,500 bytes .indexOf false`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Large Buffer Benchmarks
// ═══════════════════════════════════════════════════════════════════════════════
console.log("🚀 Large Buffer Benchmarks (1.1MB × 10,000 iterations)");
console.log("─".repeat(60));

const l1 = bench("1.1MB .includes (found)", () => largeBuffer.includes("TARGET"), 10_000);
const l2 = bench("1.1MB .includes (not found)", () => largeBufferNoMatch.includes("TARGET"), 10_000);
const l3 = bench("1.1MB .indexOf (found)", () => largeBuffer.indexOf("TARGET"), 10_000);
const l4 = bench("1.1MB .indexOf (not found)", () => largeBufferNoMatch.indexOf("TARGET"), 10_000);

console.log(`   [${l1.elapsed.toFixed(2)}ms] 1.1MB .includes (found)`);
console.log(`   [${l2.elapsed.toFixed(2)}ms] 1.1MB .includes (not found)`);
console.log(`   [${l3.elapsed.toFixed(2)}ms] 1.1MB .indexOf (found)`);
console.log(`   [${l4.elapsed.toFixed(2)}ms] 1.1MB .indexOf (not found)`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Performance by Buffer Size
// ═══════════════════════════════════════════════════════════════════════════════
console.log("📈 Performance by Buffer Size (includes, not found - worst case)");
console.log("─".repeat(60));

const sizes = [1_024, 10_240, 102_400, 512_000, 1_024_000];
const sizeResults = [];

for (const size of sizes) {
  const buf = Buffer.from("x".repeat(size));
  const result = bench(`${size.toLocaleString()} bytes`, () => buf.includes("needle"), 10_000);
  sizeResults.push({ size: size.toLocaleString(), ms: result.elapsed.toFixed(2) });
  console.log(`   [${result.elapsed.toFixed(2)}ms] ${size.toLocaleString().padStart(9)} bytes`);
}
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Multi-byte Pattern Performance
// ═══════════════════════════════════════════════════════════════════════════════
console.log("🔤 Multi-byte Pattern Performance");
console.log("─".repeat(60));

const multiBuf = Buffer.from("data ".repeat(200_000));

const m1 = bench("1 byte pattern", () => multiBuf.includes("x"), 10_000);
const m2 = bench("4 byte pattern", () => multiBuf.includes("data"), 10_000);
const m3 = bench("8 byte pattern", () => multiBuf.includes("data dat"), 10_000);
const m4 = bench("16 byte pattern", () => multiBuf.includes("data data data d"), 10_000);

console.log(`   [${m1.elapsed.toFixed(2)}ms] 1 byte pattern search`);
console.log(`   [${m2.elapsed.toFixed(2)}ms] 4 byte pattern search`);
console.log(`   [${m3.elapsed.toFixed(2)}ms] 8 byte pattern search`);
console.log(`   [${m4.elapsed.toFixed(2)}ms] 16 byte pattern search`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Practical Use Cases
// ═══════════════════════════════════════════════════════════════════════════════
console.log("💡 Practical Use Case Examples");
console.log("─".repeat(60));

// HTTP Header Parsing
const httpRequest = Buffer.from(
  "GET /api/data HTTP/1.1\r\n" +
  "Host: example.com\r\n" +
  "Content-Type: application/json\r\n" +
  "Authorization: Bearer token123\r\n" +
  "X-Custom-Header: value\r\n" +
  "\r\n"
);

console.log("   1️⃣  HTTP Header Parsing");
const h1 = bench("Check Content-Type", () => httpRequest.includes("Content-Type"), 100_000);
const h2 = bench("Find body start", () => httpRequest.indexOf("\r\n\r\n"), 100_000);
console.log(`       Content-Type check: ${h1.perOp.toFixed(3)} μs/op`);
console.log(`       Body separator find: ${h2.perOp.toFixed(3)} μs/op`);
console.log();

// Binary File Format Detection
const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const jpegSignature = Buffer.from([0xFF, 0xD8, 0xFF]);
const fileBuffer = Buffer.concat([pngSignature, Buffer.from("image data".repeat(10000))]);

console.log("   2️⃣  Binary File Format Detection");
const f1 = bench("Detect PNG signature", () => fileBuffer.includes(pngSignature), 50_000);
const f2 = bench("Detect JPEG signature", () => fileBuffer.includes(jpegSignature), 50_000);
console.log(`       PNG signature check: ${f1.perOp.toFixed(3)} μs/op`);
console.log(`       JPEG signature check: ${f2.perOp.toFixed(3)} μs/op`);
console.log();

// Log Analysis
const logEntry = Buffer.from("[2024-01-15T10:30:00Z] ERROR Connection failed to database server".repeat(1000));

console.log("   3️⃣  Log Pattern Matching");
const p1 = bench("Find ERROR entries", () => logEntry.includes("ERROR"), 50_000);
console.log(`       ERROR pattern match: ${p1.perOp.toFixed(3)} μs/op`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Offset-based Sequential Search
// ═══════════════════════════════════════════════════════════════════════════════
console.log("🔄 Sequential Search with Offset Parameter");
console.log("─".repeat(60));

const seqBuffer = Buffer.from("needle " + "data ".repeat(5000) + "needle " + "more ".repeat(5000) + "needle");

function countOccurrences(buffer: Buffer, pattern: string): number {
  let count = 0;
  let offset = 0;
  while ((offset = buffer.indexOf(pattern, offset)) !== -1) {
    count++;
    offset += pattern.length;
  }
  return count;
}

const seqResult = bench("Count 3 occurrences", () => countOccurrences(seqBuffer, "needle"), 10_000);
console.log(`   Found ${countOccurrences(seqBuffer, "needle")} occurrences in ${seqResult.elapsed.toFixed(2)}ms (10k runs)`);
console.log(`   Per operation: ${seqResult.perOp.toFixed(3)} μs/op`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
console.log("═".repeat(60));
console.log("📊 SUMMARY: Buffer.indexOf/includes SIMD Optimization");
console.log("═".repeat(60));

const summary = [
  { 
    Scenario: "44.5KB includes (true)", 
    Time: `${r1.elapsed.toFixed(2)}ms`, 
    PerOp: `${r1.perOp.toFixed(3)}μs`,
    Note: "✅ SIMD accelerated" 
  },
  { 
    Scenario: "44.5KB includes (false)", 
    Time: `${r2.elapsed.toFixed(2)}ms`, 
    PerOp: `${r2.perOp.toFixed(3)}μs`,
    Note: "✅ SIMD (up to 2x faster)" 
  },
  { 
    Scenario: "1.1MB includes (true)", 
    Time: `${l1.elapsed.toFixed(2)}ms`, 
    PerOp: `${l1.perOp.toFixed(3)}μs`,
    Note: "✅ SIMD accelerated" 
  },
  { 
    Scenario: "1.1MB includes (false)", 
    Time: `${l2.elapsed.toFixed(2)}ms`, 
    PerOp: `${l2.perOp.toFixed(3)}μs`,
    Note: "✅ SIMD (biggest gain)" 
  },
];

console.log(Bun.inspect.table(summary, { colors: true }));
console.log();

console.log("🎯 Key Takeaways:");
console.log("   • SIMD optimization provides up to 2x speedup for large buffers");
console.log("   • Most effective when pattern is NOT found (full scan)");
console.log("   • Works with single and multi-byte patterns");
console.log("   • Zero API changes - existing code automatically benefits");
console.log("   • Best for: protocol parsing, file analysis, security scanning");
console.log();

console.log("📝 Usage Example:");
console.log(`   const buffer = Buffer.from("a".repeat(1_000_000) + "needle");`);
console.log(`   buffer.indexOf("needle");   // Returns position`);
console.log(`   buffer.includes("needle");  // Returns boolean`);
console.log();
