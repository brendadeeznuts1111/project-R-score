#!/usr/bin/env bun
/**
 * Bun.hash.crc32() Hardware-Accelerated Demo
 * 
 * Bun's CRC32 implementation is now hardware-accelerated using SIMD instructions,
 * providing ~20x performance improvement for hashing large buffers.
 * 
 * Run: bun DEMO-BUN-HASH-CRC32.ts
 */

console.log("🔢 Bun.hash.crc32() Hardware-Accelerated Demo");
console.log("═".repeat(60));
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════
const ITERATIONS = 10_000;
const WARMUP = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// Benchmark Helper
// ═══════════════════════════════════════════════════════════════════════════════
function bench(name: string, fn: () => void, iterations = ITERATIONS) {
  // Warmup
  for (let i = 0; i < WARMUP; i++) fn();
  
  const start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = (Bun.nanoseconds() - start) / 1e6;
  
  return { name, elapsed, perOp: elapsed / iterations * 1000, opsPerSec: iterations / (elapsed / 1000) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Data
// ═══════════════════════════════════════════════════════════════════════════════
console.log("📊 Creating test buffers...");

const sizes = [
  { name: "1KB",   bytes: 1024 },
  { name: "10KB",  bytes: 10 * 1024 },
  { name: "100KB", bytes: 100 * 1024 },
  { name: "1MB",   bytes: 1024 * 1024 },
  { name: "10MB",  bytes: 10 * 1024 * 1024 },
];

const buffers = sizes.map(({ name, bytes }) => ({
  name,
  bytes,
  buffer: Buffer.alloc(bytes, 0x42), // Fill with pattern
}));

for (const { name, bytes } of buffers) {
  console.log(`   ${name.padStart(5)}: ${bytes.toLocaleString().padStart(12)} bytes`);
}
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Hardware-Accelerated CRC32 Benchmarks
// ═══════════════════════════════════════════════════════════════════════════════
console.log("🚀 Bun.hash.crc32() Hardware-Accelerated Performance");
console.log("─".repeat(60));

const results = [];

for (const { name, bytes, buffer } of buffers) {
  const iterations = bytes >= 1024 * 1024 ? 1000 : ITERATIONS;
  const result = bench(`${name} CRC32`, () => Bun.hash.crc32(buffer), iterations);
  
  const throughputMB = (bytes * iterations) / (result.elapsed / 1000) / (1024 * 1024);
  const throughputGB = throughputMB / 1024;
  
  results.push({
    Size: name,
    "Time (ms)": result.elapsed.toFixed(2),
    "Per Op (μs)": result.perOp.toFixed(3),
    "Throughput": throughputGB >= 1 ? `${throughputGB.toFixed(2)} GB/s` : `${throughputMB.toFixed(0)} MB/s`
  });
  
  console.log(`   [${result.elapsed.toFixed(2).padStart(8)}ms] ${name} - ${throughputGB >= 1 ? throughputGB.toFixed(2) + ' GB/s' : throughputMB.toFixed(0) + ' MB/s'}`);
}
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Comparison: Hardware vs Software CRC32
// ═══════════════════════════════════════════════════════════════════════════════
console.log("📊 Hardware-Accelerated vs Software Implementation");
console.log("─".repeat(60));

// Pure JavaScript CRC32 for comparison (software implementation)
function crc32Software(data: Buffer): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = (table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const testBuffer = Buffer.alloc(1024 * 1024, 0x42);

const hwResult = bench("Hardware CRC32 (1MB)", () => Bun.hash.crc32(testBuffer), 1000);
const swResult = bench("Software CRC32 (1MB)", () => crc32Software(testBuffer), 10);

const speedup = swResult.perOp / hwResult.perOp;

console.log(`   Hardware (Bun.hash.crc32): ${hwResult.perOp.toFixed(3)} μs/op`);
console.log(`   Software (JS implementation): ${swResult.perOp.toFixed(3)} μs/op`);
console.log(`   Speedup: ${speedup.toFixed(1)}x faster 🚀`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Practical Use Cases
// ═══════════════════════════════════════════════════════════════════════════════
console.log("💡 Practical Use Case Examples");
console.log("─".repeat(60));

// 1. File Integrity Checking
console.log("   1️⃣  File Integrity Checking");
const fileBuffer = Buffer.from("Important document content ".repeat(10000));
const hashBench = bench("Calculate file checksum", () => Bun.hash.crc32(fileBuffer), 50_000);
console.log(`       ${fileBuffer.length.toLocaleString()} bytes: ${hashBench.perOp.toFixed(3)} μs/op`);
console.log(`       Hash: ${Bun.hash.crc32(fileBuffer).toString(16).toUpperCase()}`);
console.log();

// 2. Network Packet Validation
console.log("   2️⃣  Network Packet Validation");
const packetSizes = [64, 512, 1500, 8192]; // Common packet sizes
for (const size of packetSizes) {
  const packet = Buffer.alloc(size, 0xAB);
  const pktBench = bench(`${size}B packet CRC`, () => Bun.hash.crc32(packet), 100_000);
  console.log(`       ${size.toString().padStart(4)}B packet: ${pktBench.perOp.toFixed(3)} μs/op`);
}
console.log();

// 3. Streaming Data Validation
console.log("   3️⃣  Streaming Chunk Validation");
const chunkSizes = [4 * 1024, 16 * 1024, 64 * 1024]; // Common chunk sizes
for (const size of chunkSizes) {
  const chunk = Buffer.alloc(size, 0xCD);
  const iterations = size > 16384 ? 10_000 : 50_000;
  const chunkBench = bench(`${size / 1024}KB chunk`, () => Bun.hash.crc32(chunk), iterations);
  const throughputMB = (size * iterations) / (chunkBench.elapsed / 1000) / (1024 * 1024);
  console.log(`       ${(size / 1024).toString().padStart(2)}KB chunk: ${chunkBench.perOp.toFixed(3)} μs/op (${throughputMB.toFixed(0)} MB/s)`);
}
console.log();

// 4. ZIP/GZIP Compatibility
console.log("   4️⃣  ZIP/GZIP Archive Validation");
const zipEntry = Buffer.from("Compressed file data simulation ".repeat(5000));
const zipBench = bench("ZIP entry checksum", () => Bun.hash.crc32(zipEntry), 10_000);
const zipThroughput = (zipEntry.length * 10_000) / (zipBench.elapsed / 1000) / (1024 * 1024);
console.log(`       ${zipEntry.length.toLocaleString()} byte entry: ${zipBench.perOp.toFixed(3)} μs/op`);
console.log(`       Throughput: ${zipThroughput.toFixed(0)} MB/s`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Incremental/Partial Hashing
// ═══════════════════════════════════════════════════════════════════════════════
console.log("🔄 Partial/Incremental Hashing Support");
console.log("─".repeat(60));

const part1 = Buffer.from("First part of data ".repeat(100));
const part2 = Buffer.from("Second part of data ".repeat(100));
const part3 = Buffer.from("Final part of data ".repeat(100));

// CRC32 with seed for incremental hashing
const hash1 = Bun.hash.crc32(part1);
const hash2 = Bun.hash.crc32(part2, hash1); // Continue from previous
const hash3 = Bun.hash.crc32(part3, hash2); // Continue from previous

const fullBuffer = Buffer.concat([part1, part2, part3]);
const fullHash = Bun.hash.crc32(fullBuffer);

console.log(`   Part 1 hash: ${hash1.toString(16).toUpperCase()}`);
console.log(`   Part 2 hash: ${hash2.toString(16).toUpperCase()}`);
console.log(`   Part 3 hash: ${hash3.toString(16).toUpperCase()}`);
console.log(`   Full hash:   ${fullHash.toString(16).toUpperCase()}`);
console.log(`   Match: ${hash3 === fullHash ? '✅ Yes' : '❌ No'}`);
console.log();

// Benchmark incremental vs full
const incBench = bench("Incremental (3 parts)", () => {
  let h = Bun.hash.crc32(part1);
  h = Bun.hash.crc32(part2, h);
  h = Bun.hash.crc32(part3, h);
  return h;
}, 100_000);

const fullBench = bench("Full buffer", () => Bun.hash.crc32(fullBuffer), 100_000);

console.log(`   Incremental: ${incBench.perOp.toFixed(3)} μs/op`);
console.log(`   Full buffer: ${fullBench.perOp.toFixed(3)} μs/op`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Different Input Types
// ═══════════════════════════════════════════════════════════════════════════════
console.log("📦 Different Input Type Support");
console.log("─".repeat(60));

const testData = "Test data for hashing";
const testBuffer2 = Buffer.from(testData);
const testArrayBuffer = testBuffer2.buffer.slice(testBuffer2.byteOffset, testBuffer2.byteOffset + testBuffer2.byteLength);
const testUint8Array = new Uint8Array(testBuffer2);

const bufBench = bench("Buffer input", () => Bun.hash.crc32(testBuffer2), 1_000_000);
const abBench = bench("ArrayBuffer input", () => Bun.hash.crc32(testArrayBuffer), 1_000_000);
const u8Bench = bench("Uint8Array input", () => Bun.hash.crc32(testUint8Array), 1_000_000);
const strBench = bench("String input", () => Bun.hash.crc32(testData), 1_000_000);

console.log(`   Buffer:     ${bufBench.perOp.toFixed(3)} μs/op`);
console.log(`   ArrayBuffer: ${abBench.perOp.toFixed(3)} μs/op`);
console.log(`   Uint8Array: ${u8Bench.perOp.toFixed(3)} μs/op`);
console.log(`   String:     ${strBench.perOp.toFixed(3)} μs/op`);
console.log();

// Verify all produce same result
console.log("   Hash results (all should match):");
console.log(`   Buffer:      ${Bun.hash.crc32(testBuffer2).toString(16).toUpperCase()}`);
console.log(`   ArrayBuffer: ${Bun.hash.crc32(testArrayBuffer).toString(16).toUpperCase()}`);
console.log(`   Uint8Array:  ${Bun.hash.crc32(testUint8Array).toString(16).toUpperCase()}`);
console.log(`   String:      ${Bun.hash.crc32(testData).toString(16).toUpperCase()}`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
console.log("═".repeat(60));
console.log("📊 SUMMARY: Bun.hash.crc32() Hardware Acceleration");
console.log("═".repeat(60));

console.log(Bun.inspect.table(results, { colors: true }));
console.log();

console.log("🎯 Key Takeaways:");
console.log(`   • Hardware acceleration provides ~${speedup.toFixed(0)}x speedup vs software`);
console.log(`   • Throughput: Up to ${results[results.length - 1].Throughput} for large buffers`);
console.log(`   • Perfect for: File integrity, network packets, ZIP/GZIP archives`);
console.log(`   • Supports incremental hashing with seed parameter`);
console.log(`   • Works with Buffer, ArrayBuffer, Uint8Array, and String inputs`);
console.log();

console.log("📝 Usage Examples:");
console.log(`   // Basic hashing`);
console.log(`   const data = Buffer.alloc(1024 * 1024); // 1MB buffer`);
console.log(`   const hash = Bun.hash.crc32(data); // ~${speedup.toFixed(0)}x faster`);
console.log();
console.log(`   // Incremental hashing`);
console.log(`   let hash = Bun.hash.crc32(part1);`);
console.log(`   hash = Bun.hash.crc32(part2, hash); // Continue from part1`);
console.log(`   hash = Bun.hash.crc32(part3, hash); // Continue from part2`);
console.log();
console.log(`   // String input`);
console.log(`   const textHash = Bun.hash.crc32("Hello World");`);
console.log();
