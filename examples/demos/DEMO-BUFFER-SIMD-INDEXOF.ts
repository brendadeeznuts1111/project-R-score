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

console.info("🔍 Bun Buffer.indexOf/includes SIMD Optimization Demo");
console.info("═".repeat(60));
console.info();

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
console.info("📊 Creating test buffers...");

// 44,500 bytes buffer with needle at the end (as in official benchmark)
const bufferWithNeedle = Buffer.from("a".repeat(44_500 - 6) + "needle");
const bufferWithoutNeedle = Buffer.from("a".repeat(44_500));

// Large 1MB+ buffer
const largeBuffer = Buffer.from("x".repeat(1_000_000) + "TARGET" + "y".repeat(100_000));
const largeBufferNoMatch = Buffer.from("z".repeat(1_100_000));

console.info(`   Buffer (with pattern): ${bufferWithNeedle.length.toLocaleString()} bytes`);
console.info(`   Buffer (no pattern):   ${bufferWithoutNeedle.length.toLocaleString()} bytes`);
console.info(`   Large buffer:          ${largeBuffer.length.toLocaleString()} bytes`);
console.info();

// ═══════════════════════════════════════════════════════════════════════════════
// Official Benchmark Recreation (44,500 bytes)
// ═══════════════════════════════════════════════════════════════════════════════
console.info("🚀 Official Benchmark Recreation (44,500 bytes × 99,999 iterations)");
console.info("─".repeat(60));

const r1 = bench("44,500 bytes .includes (true)", () => bufferWithNeedle.includes("needle"));
const r2 = bench("44,500 bytes .includes (false)", () => bufferWithoutNeedle.includes("needle"));
const r3 = bench("44,500 bytes .indexOf (true)", () => bufferWithNeedle.indexOf("needle"));
const r4 = bench("44,500 bytes .indexOf (false)", () => bufferWithoutNeedle.indexOf("needle"));

console.info(`   [${r1.elapsed.toFixed(2)}ms] 44,500 bytes .includes true`);
console.info(`   [${r2.elapsed.toFixed(2)}ms] 44,500 bytes .includes false`);
console.info(`   [${r3.elapsed.toFixed(2)}ms] 44,500 bytes .indexOf true`);
console.info(`   [${r4.elapsed.toFixed(2)}ms] 44,500 bytes .indexOf false`);
console.info();

// ═══════════════════════════════════════════════════════════════════════════════
// Large Buffer Benchmarks
// ═══════════════════════════════════════════════════════════════════════════════
console.info("🚀 Large Buffer Benchmarks (1.1MB × 10,000 iterations)");
console.info("─".repeat(60));

const l1 = bench("1.1MB .includes (found)", () => largeBuffer.includes("TARGET"), 10_000);
const l2 = bench("1.1MB .includes (not found)", () => largeBufferNoMatch.includes("TARGET"), 10_000);
const l3 = bench("1.1MB .indexOf (found)", () => largeBuffer.indexOf("TARGET"), 10_000);
const l4 = bench("1.1MB .indexOf (not found)", () => largeBufferNoMatch.indexOf("TARGET"), 10_000);

console.info(`   [${l1.elapsed.toFixed(2)}ms] 1.1MB .includes (found)`);
console.info(`   [${l2.elapsed.toFixed(2)}ms] 1.1MB .includes (not found)`);
console.info(`   [${l3.elapsed.toFixed(2)}ms] 1.1MB .indexOf (found)`);
console.info(`   [${l4.elapsed.toFixed(2)}ms] 1.1MB .indexOf (not found)`);
console.info();

// ═══════════════════════════════════════════════════════════════════════════════
// Performance by Buffer Size
// ═══════════════════════════════════════════════════════════════════════════════
console.info("📈 Performance by Buffer Size (includes, not found - worst case)");
console.info("─".repeat(60));

const sizes = [1_024, 10_240, 102_400, 512_000, 1_024_000];
const sizeResults = [];

for (const size of sizes) {
  const buf = Buffer.from("x".repeat(size));
  const result = bench(`${size.toLocaleString()} bytes`, () => buf.includes("needle"), 10_000);
  sizeResults.push({ size: size.toLocaleString(), ms: result.elapsed.toFixed(2) });
  console.info(`   [${result.elapsed.toFixed(2)}ms] ${size.toLocaleString().padStart(9)} bytes`);
}
console.info();

// ═══════════════════════════════════════════════════════════════════════════════
// Multi-byte Pattern Performance
// ═══════════════════════════════════════════════════════════════════════════════
console.info("🔤 Multi-byte Pattern Performance");
console.info("─".repeat(60));

const multiBuf = Buffer.from("data ".repeat(200_000));

const m1 = bench("1 byte pattern", () => multiBuf.includes("x"), 10_000);
const m2 = bench("4 byte pattern", () => multiBuf.includes("data"), 10_000);
const m3 = bench("8 byte pattern", () => multiBuf.includes("data dat"), 10_000);
const m4 = bench("16 byte pattern", () => multiBuf.includes("data data data d"), 10_000);

console.info(`   [${m1.elapsed.toFixed(2)}ms] 1 byte pattern search`);
console.info(`   [${m2.elapsed.toFixed(2)}ms] 4 byte pattern search`);
console.info(`   [${m3.elapsed.toFixed(2)}ms] 8 byte pattern search`);
console.info(`   [${m4.elapsed.toFixed(2)}ms] 16 byte pattern search`);
console.info();

// ═══════════════════════════════════════════════════════════════════════════════
// Practical Use Cases
// ═══════════════════════════════════════════════════════════════════════════════
console.info("💡 Practical Use Case Examples");
console.info("─".repeat(60));

// HTTP Header Parsing
const httpRequest = Buffer.from(
  "GET /api/data HTTP/1.1\r\n" +
  "Host: example.com\r\n" +
  "Content-Type: application/json\r\n" +
  "Authorization: Bearer token123\r\n" +
  "X-Custom-Header: value\r\n" +
  "\r\n"
);

console.info("   1️⃣  HTTP Header Parsing");
const h1 = bench("Check Content-Type", () => httpRequest.includes("Content-Type"), 100_000);
const h2 = bench("Find body start", () => httpRequest.indexOf("\r\n\r\n"), 100_000);
console.info(`       Content-Type check: ${h1.perOp.toFixed(3)} μs/op`);
console.info(`       Body separator find: ${h2.perOp.toFixed(3)} μs/op`);
console.info();

// Binary File Format Detection
const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const jpegSignature = Buffer.from([0xFF, 0xD8, 0xFF]);
const fileBuffer = Buffer.concat([pngSignature, Buffer.from("image data".repeat(10000))]);

console.info("   2️⃣  Binary File Format Detection");
const f1 = bench("Detect PNG signature", () => fileBuffer.includes(pngSignature), 50_000);
const f2 = bench("Detect JPEG signature", () => fileBuffer.includes(jpegSignature), 50_000);
console.info(`       PNG signature check: ${f1.perOp.toFixed(3)} μs/op`);
console.info(`       JPEG signature check: ${f2.perOp.toFixed(3)} μs/op`);
console.info();

// Log Analysis
const logEntry = Buffer.from("[2024-01-15T10:30:00Z] ERROR Connection failed to database server".repeat(1000));

console.info("   3️⃣  Log Pattern Matching");
const p1 = bench("Find ERROR entries", () => logEntry.includes("ERROR"), 50_000);
console.info(`       ERROR pattern match: ${p1.perOp.toFixed(3)} μs/op`);
console.info();

// ═══════════════════════════════════════════════════════════════════════════════
// Offset-based Sequential Search
// ═══════════════════════════════════════════════════════════════════════════════
console.info("🔄 Sequential Search with Offset Parameter");
console.info("─".repeat(60));

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
console.info(`   Found ${countOccurrences(seqBuffer, "needle")} occurrences in ${seqResult.elapsed.toFixed(2)}ms (10k runs)`);
console.info(`   Per operation: ${seqResult.perOp.toFixed(3)} μs/op`);
console.info();

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
console.info("═".repeat(60));
console.info("📊 SUMMARY: Buffer.indexOf/includes SIMD Optimization");
console.info("═".repeat(60));

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

console.info(Bun.inspect.table(summary, { colors: true }));
console.info();

console.info("🎯 Key Takeaways:");
console.info("   • SIMD optimization provides up to 2x speedup for large buffers");
console.info("   • Most effective when pattern is NOT found (full scan)");
console.info("   • Works with single and multi-byte patterns");
console.info("   • Zero API changes - existing code automatically benefits");
console.info("   • Best for: protocol parsing, file analysis, security scanning");
console.info();

console.info("📝 Usage Example:");
console.info(`   const buffer = Buffer.from("a".repeat(1_000_000) + "needle");`);
console.info(`   buffer.indexOf("needle");   // Returns position`);
console.info(`   buffer.includes("needle");  // Returns boolean`);
console.info();
