/**
 * @fileoverview Bun 1.3 Performance Features Demo
 * @description Comprehensive examples of Bun 1.3's high-performance utilities
 * @module examples/bun-1.3-performance-features
 */

import { stripANSI, hash } from "bun";

/**
 * Demo 1: Bun.stripANSI() - SIMD-accelerated ANSI escape code removal
 * 6-57x faster than traditional strip-ansi npm package
 */
export function demoStripANSI() {
  console.info("=== Bun.stripANSI() Demo ===\n");

  // Basic ANSI escape codes
  const basicANSI = "\x1b[31mRed text\x1b[0m\x1b[32mGreen text\x1b[0m\x1b[1mBold\x1b[0m";
  console.info("Input:", JSON.stringify(basicANSI));
  console.info("Output:", JSON.stringify(stripANSI(basicANSI)));
  console.info("Plain text:", stripANSI(basicANSI));

  // Complex ANSI with XTerm OSC sequences (fails in strip-ansi)
  const complexANSI = "\x1b]0;My Window Title\x1b\\\x1b[31mRed\x1b[0m\x1b[1;32mGreen Bold\x1b[0m";
  console.info("\nComplex ANSI (XTerm OSC):", JSON.stringify(complexANSI));
  console.info("Bun.stripANSI() handles it:", JSON.stringify(stripANSI(complexANSI)));

  // Performance comparison
  const testString = "\x1b[31m\x1b[1m\x1b[4mComplex\x1b[0m \x1b[32mANSI\x1b[0m \x1b[33m\x1b[2mtext\x1b[0m".repeat(1000);

  console.info("\n=== Performance Comparison ===");
  console.info("Test string length:", testString.length, "characters");

  // Bun.stripANSI()
  const bunStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    stripANSI(testString);
  }
  const bunTime = performance.now() - bunStart;

  // Traditional regex approach
  const traditionalStrip = (str: string) => str.replace(/\x1b\[[0-9;]*[mG]/g, '');
  const traditionalStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    traditionalStrip(testString);
  }
  const traditionalTime = performance.now() - traditionalStart;

  console.info(`Bun.stripANSI(): ${bunTime.toFixed(2)}ms`);
  console.info(`Traditional regex: ${traditionalTime.toFixed(2)}ms`);
  console.info(`Speedup: ${(traditionalTime / bunTime).toFixed(1)}x faster`);
  console.info("✅ SIMD-accelerated performance\n");
}

/**
 * Demo 2: Bun.hash - Ultra-fast non-cryptographic hashing
 * Multiple algorithms: rapidhash, wyhash, crc32
 */
export function demoHash() {
  console.info("=== Bun.hash Demo ===\n");

  const testData = "Hello, Bun 1.3!";

  console.info("Input string:", testData);
  console.info("rapidhash:", hash.rapidhash(testData), "(64-bit BigInt)");
  console.info("wyhash:", hash.wyhash(testData), "(64-bit BigInt)");
  console.info("crc32:", hash.crc32(testData), "(32-bit number)");

  // Consistency check
  console.info("\nConsistency check:");
  console.info("Same input, same hash:", hash.rapidhash(testData) === hash.rapidhash(testData));

  // Performance test
  console.info("\n=== Hash Performance Test ===");
  const iterations = 100000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    hash.rapidhash(`performance-test-${i}`);
  }

  const end = performance.now();
  const totalTime = end - start;
  const rate = iterations / (totalTime / 1000);

  console.info(`${iterations.toLocaleString()} hashes in ${totalTime.toFixed(2)}ms`);
  console.info(`Rate: ${rate.toLocaleString()} hashes/second`);
  console.info("✅ Ultra-fast hashing\n");
}

/**
 * Demo 3: Real-world use case - Processing server logs
 * Combines stripANSI and hash for log processing pipeline
 */
export function demoLogProcessing() {
  console.info("=== Real-World Log Processing Demo ===\n");

  // Simulate colored server logs
  const rawLogs = [
    "[INFO] \x1b[32m2024-01-01 12:00:00\x1b[0m User login successful",
    "[WARN] \x1b[33m2024-01-01 12:01:00\x1b[0m High memory usage detected",
    "[ERROR] \x1b[31m2024-01-01 12:02:00\x1b[0m Database connection failed",
    "[DEBUG] \x1b[36m2024-01-01 12:03:00\x1b[0m Processing request ID: 12345",
  ].join("\n").repeat(100); // Scale up for performance testing

  console.info("Raw logs sample:");
  console.info(rawLogs.slice(0, 200) + "...");
  console.info(`Total size: ${(rawLogs.length / 1024).toFixed(1)} KB\n`);

  // Process logs: strip ANSI, hash for integrity
  const start = performance.now();

  const cleanLogs = stripANSI(rawLogs);
  const contentHash = hash.rapidhash(cleanLogs);

  const end = performance.now();

  console.info("Processed logs sample:");
  console.info(cleanLogs.slice(0, 200) + "...");
  console.info(`Clean size: ${(cleanLogs.length / 1024).toFixed(1)} KB`);
  console.info(`Processing time: ${(end - start).toFixed(3)}ms`);
  console.info(`Content hash: ${contentHash.toString().slice(-16)}... (for integrity checking)`);
  console.info("✅ Fast log processing pipeline\n");
}

/**
 * Demo 4: Worker communication with postMessage optimization
 * Shows the 500x performance improvement for string data
 */
export function demoWorkerCommunication() {
  console.info("=== Worker Communication Demo ===\n");

  // Note: This demo shows the API usage. Actual performance measurement
  // requires running in a worker context with proper benchmarking setup.

  console.info("Bun 1.3 automatically optimizes postMessage for strings:");
  console.info("- Strings: Up to 500x faster");
  console.info("- Simple objects: 240x faster");
  console.info("- Uses ~22x less peak memory");
  console.info("- No code changes required - optimization is automatic");

  // Example usage (would be in a worker context)
  console.info("\nExample usage:");
  console.info("```typescript");
  console.info("// In main thread");
  console.info("const worker = new Worker('./my-worker.ts');");
  console.info("worker.postMessage(largeJsonString); // Now 500x faster!");
  console.info("");
  console.info("// In worker");
  console.info("self.onmessage = (event) => {");
  console.info("  const data = event.data; // Fast string transfer");
  console.info("  // Process data...");
  console.info("};");
  console.info("```");

  console.info("\n✅ Optimized inter-thread communication\n");
}

/**
 * Run all demos
 */
export function runAllDemos() {
  console.info("🚀 Bun 1.3 Performance Features - Complete Demo\n");

  demoStripANSI();
  demoHash();
  demoLogProcessing();
  demoWorkerCommunication();

  console.info("🎯 Bun 1.3 delivers enterprise-grade performance!");
  console.info("   • SIMD-accelerated ANSI processing");
  console.info("   • Ultra-fast non-cryptographic hashing");
  console.info("   • Optimized worker communication");
  console.info("   • Zero external dependencies");
}

// Allow running as standalone script
if (import.meta.main) {
  runAllDemos();
}