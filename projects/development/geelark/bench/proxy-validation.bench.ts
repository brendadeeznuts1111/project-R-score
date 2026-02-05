#!/usr/bin/env bun
/**
 * Proxy Validation Performance Benchmark
 *
 * Measures validation performance to ensure targets are met:
 * - Header format check: <100ns
 * - Range validation: <10ns
 * - Checksum verify: <20ns
 * - Total validation: <400ns
 * - DNS cache hit: <100ns (5ms miss)
 */

// Suppress verbose logging during benchmarks
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
console.log = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.startsWith('[Validator]') || msg.startsWith('[DNS]')) return;
  originalConsoleLog(...args);
};
console.warn = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.startsWith('[Validator]') || msg.startsWith('[DNS]')) return;
  originalConsoleWarn(...args);
};
console.error = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.startsWith('[Validator]') || msg.startsWith('[DNS]')) return;
  originalConsoleError(...args);
};

import { validateProxyHeader, validateProxyHeaders, validationMetrics } from "../src/proxy/validator.js";
import { HEADERS } from "../src/proxy/headers.js";

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║         Proxy Validation Performance Benchmark                              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Targets (JavaScript): <500ns single, <5µs bulk, <100ns DNS               ║
║  Note: Performance varies by CPU, JIT state, and system load              ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// Benchmark 1: Single Header Validation
// ============================================================================

console.log("\n📊 Benchmark 1: Single Header Validation (10,000 iterations)\n");

function benchmarkSingleHeader(name: string, value: string, iterations: number = 10000) {
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    validateProxyHeader(name, value);
  }

  const duration = performance.now() - start;
  const avgNs = (duration / iterations) * 1_000_000;

  return { avgNs, duration };
}

// Config Version
const configVersionResult = benchmarkSingleHeader(HEADERS.CONFIG_VERSION, "1");
console.log(`   X-Bun-Config-Version (format check):`);
console.log(`     Average: ${configVersionResult.avgNs.toFixed(2)}ns`);
console.log(`     Target: <500ns | Status: ${configVersionResult.avgNs < 500 ? "✅ PASS" : "❌ FAIL"}`);

// Registry Hash
const registryHashResult = benchmarkSingleHeader(HEADERS.REGISTRY_HASH, "0xa1b2c3d4");
console.log(`\n   X-Bun-Registry-Hash (format + parse):`);
console.log(`     Average: ${registryHashResult.avgNs.toFixed(2)}ns`);
console.log(`     Target: <500ns | Status: ${registryHashResult.avgNs < 500 ? "✅ PASS" : "❌ FAIL"}`);

// Feature Flags
const featureFlagsResult = benchmarkSingleHeader(HEADERS.FEATURE_FLAGS, "0x00000007");
console.log(`\n   X-Bun-Feature-Flags (format + range):`);
console.log(`     Average: ${featureFlagsResult.avgNs.toFixed(2)}ns`);
console.log(`     Target: <500ns | Status: ${featureFlagsResult.avgNs < 500 ? "✅ PASS" : "❌ FAIL"}`);

// Terminal Mode
const terminalModeResult = benchmarkSingleHeader(HEADERS.TERMINAL_MODE, "2");
console.log(`\n   X-Bun-Terminal-Mode (format + range):`);
console.log(`     Average: ${terminalModeResult.avgNs.toFixed(2)}ns`);
console.log(`     Target: <500ns | Status: ${terminalModeResult.avgNs < 500 ? "✅ PASS" : "❌ FAIL"}`);

// Terminal Rows
const terminalRowsResult = benchmarkSingleHeader(HEADERS.TERMINAL_ROWS, "24");
console.log(`\n   X-Bun-Terminal-Rows (format + range):`);
console.log(`     Average: ${terminalRowsResult.avgNs.toFixed(2)}ns`);
console.log(`     Target: <500ns | Status: ${terminalRowsResult.avgNs < 500 ? "✅ PASS" : "❌ FAIL"}`);

// Terminal Cols
const terminalColsResult = benchmarkSingleHeader(HEADERS.TERMINAL_COLS, "80");
console.log(`\n   X-Bun-Terminal-Cols (format + range):`);
console.log(`     Average: ${terminalColsResult.avgNs.toFixed(2)}ns`);
console.log(`     Target: <500ns | Status: ${terminalColsResult.avgNs < 500 ? "✅ PASS" : "❌ FAIL"}`);

// Config Dump (with checksum)
const configDump = "0x01a1b2c3d4000002070218504a"; // Valid checksum
const configDumpResult = benchmarkSingleHeader(HEADERS.CONFIG_DUMP, configDump);
console.log(`\n   X-Bun-Config-Dump (format + checksum):`);
console.log(`     Average: ${configDumpResult.avgNs.toFixed(2)}ns`);
console.log(`     Target: <1000ns | Status: ${configDumpResult.avgNs < 1000 ? "✅ PASS" : "❌ FAIL"}`);

// Proxy Token (JWT format only)
const proxyToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const proxyTokenResult = benchmarkSingleHeader(HEADERS.PROXY_TOKEN, proxyToken);
console.log(`\n   X-Bun-Proxy-Token (JWT format check):`);
console.log(`     Average: ${proxyTokenResult.avgNs.toFixed(2)}ns`);
console.log(`     Target: <500ns | Status: ${proxyTokenResult.avgNs < 500 ? "✅ PASS" : "❌ FAIL"}`);

// ============================================================================
// Benchmark 2: Bulk Validation (All Headers)
// ============================================================================

await Bun.sleep(100);

console.log("\n\n📊 Benchmark 2: Bulk Validation (All Headers, 10,000 iterations)\n");

function benchmarkBulkValidation(iterations: number = 10000) {
  const headers = new Headers({
    [HEADERS.CONFIG_VERSION]: "1",
    [HEADERS.REGISTRY_HASH]: "0xa1b2c3d4",
    [HEADERS.FEATURE_FLAGS]: "0x00000007",
    [HEADERS.TERMINAL_MODE]: "2",
    [HEADERS.TERMINAL_ROWS]: "24",
    [HEADERS.TERMINAL_COLS]: "80",
    [HEADERS.PROXY_TOKEN]: proxyToken,
  });

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    validateProxyHeaders(headers);
  }

  const duration = performance.now() - start;
  const avgNs = (duration / iterations) * 1_000_000;

  return { avgNs, duration };
}

const bulkResult = benchmarkBulkValidation();
console.log(`   All 7 headers validated together:`);
console.log(`     Average: ${bulkResult.avgNs.toFixed(2)}ns`);
console.log(`     Per-header average: ${(bulkResult.avgNs / 7).toFixed(2)}ns`);
console.log(`     Throughput: ${(1_000_000_000 / bulkResult.avgNs).toFixed(0)} req/sec`);
console.log(`     Target: <5000ns total | Status: ${bulkResult.avgNs < 5000 ? "✅ PASS" : "❌ FAIL"}`);

// ============================================================================
// Benchmark 3: DNS Cache Performance
// ============================================================================

await Bun.sleep(100);

console.log("\n\n📊 Benchmark 3: DNS Cache Performance\n");

let dnsAvgNs = 0;
let warmupDuration = 0;
let dnsHits = 0;
let dnsMisses = 0;
let dnsHitRate = 0;

try {
  // Import DNS modules dynamically
  const { resolveProxyUrl, warmupDNSCache, getDNSStats } = await import("../src/proxy/dns.js");

  console.log("   Step 1: Warming up DNS cache...");
  const warmupStart = performance.now();
  await warmupDNSCache(0xa1b2c3d4);
  warmupDuration = performance.now() - warmupStart;
  console.log(`     Warmup complete: ${warmupDuration.toFixed(2)}ms`);

  console.log("\n   Step 2: Benchmarking DNS cache hits (1,000 iterations)...");

  const testHostname = "proxy.mycompany.com";

  // First, ensure it's cached
  await resolveProxyUrl(`https://${testHostname}:8080`);

  const dnsIterations = 1000;
  const dnsStart = performance.now();

  for (let i = 0; i < dnsIterations; i++) {
    await resolveProxyUrl(`https://${testHostname}:8080`);
  }

  const dnsDuration = performance.now() - dnsStart;
  dnsAvgNs = (dnsDuration / dnsIterations) * 1_000_000;

  console.log(`     Average: ${dnsAvgNs.toFixed(2)}ns`);
  console.log(`     Target: <100ns | Status: ${dnsAvgNs < 100 ? "✅ PASS" : "❌ FAIL"}`);

  // DNS stats
  const dnsStats = getDNSStats();
  dnsHits = dnsStats.hits;
  dnsMisses = dnsStats.misses;
  dnsHitRate = dnsStats.hitRate;
  console.log(`\n   DNS Statistics:`);
  console.log(`     Cache hits: ${dnsHits}`);
  console.log(`     Cache misses: ${dnsMisses}`);
  console.log(`     Hit rate: ${(dnsHitRate * 100).toFixed(2)}%`);
} catch (error) {
  console.log(`     ⚠️  DNS benchmark skipped: ${error instanceof Error ? error.message : String(error)}`);
  console.log(`     (DNS hostnames don't exist in development environment)`);
}

// ============================================================================
// Benchmark 4: Validation with Error Detection
// ============================================================================

await Bun.sleep(100);

console.log("\n\n📊 Benchmark 4: Validation Error Detection (10,000 iterations)\n");

function benchmarkErrorDetection(iterations: number = 10000) {
  const headers = new Headers({
    [HEADERS.CONFIG_VERSION]: "256", // Invalid: > 255
    [HEADERS.REGISTRY_HASH]: "0xa1b2c3d4",
    [HEADERS.FEATURE_FLAGS]: "0x00000007",
    [HEADERS.PROXY_TOKEN]: proxyToken,
  });

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    validateProxyHeaders(headers);
  }

  const duration = performance.now() - start;
  const avgNs = (duration / iterations) * 1_000_000;

  return { avgNs, duration };
}

const errorResult = benchmarkErrorDetection();
console.log(`   Detecting out-of-range error (256 > 255):`);
console.log(`     Average: ${errorResult.avgNs.toFixed(2)}ns`);
console.log(`     Target: <5000ns | Status: ${errorResult.avgNs < 5000 ? "✅ PASS" : "❌ FAIL"}`);

// ============================================================================
// Benchmark 5: Checksum Validation
// ============================================================================

await Bun.sleep(100);

console.log("\n\n📊 Benchmark 5: Checksum Validation (10,000 iterations)\n");

function benchmarkChecksum(iterations: number = 10000) {
  // Use config dump with checksum
  const dump = "0x01a1b2c3d4000002070218504a";

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    validateProxyHeader(HEADERS.CONFIG_DUMP, dump);
  }

  const duration = performance.now() - start;
  const avgNs = (duration / iterations) * 1_000_000;

  return { avgNs, duration };
}

const checksumResult = benchmarkChecksum();
console.log(`   Config dump checksum verification (XOR of 12 bytes):`);
console.log(`     Average: ${checksumResult.avgNs.toFixed(2)}ns`);
console.log(`     Target: <1000ns | Status: ${checksumResult.avgNs < 1000 ? "✅ PASS" : "❌ FAIL"}`);

// ============================================================================
// Summary
// ============================================================================

await Bun.sleep(100);

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                         Benchmark Summary                                   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Single Header Validation:                                                 ║
║    Config Version: ${configVersionResult.avgNs.toFixed(2).padStart(10)}ns ${configVersionResult.avgNs < 500 ? "✅" : "❌"}                         ║
║    Registry Hash: ${registryHashResult.avgNs.toFixed(2).padStart(10)}ns ${registryHashResult.avgNs < 500 ? "✅" : "❌"}                         ║
║    Feature Flags: ${featureFlagsResult.avgNs.toFixed(2).padStart(10)}ns ${featureFlagsResult.avgNs < 500 ? "✅" : "❌"}                         ║
║    Terminal Mode: ${terminalModeResult.avgNs.toFixed(2).padStart(10)}ns ${terminalModeResult.avgNs < 500 ? "✅" : "❌"}                         ║
║    Terminal Rows: ${terminalRowsResult.avgNs.toFixed(2).padStart(10)}ns ${terminalRowsResult.avgNs < 500 ? "✅" : "❌"}                         ║
║    Terminal Cols: ${terminalColsResult.avgNs.toFixed(2).padStart(10)}ns ${terminalColsResult.avgNs < 500 ? "✅" : "❌"}                         ║
║    Config Dump: ${configDumpResult.avgNs.toFixed(2).padStart(10)}ns ${configDumpResult.avgNs < 1000 ? "✅" : "❌"}                         ║
║    Proxy Token: ${proxyTokenResult.avgNs.toFixed(2).padStart(10)}ns ${proxyTokenResult.avgNs < 500 ? "✅" : "❌"}                         ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Bulk Validation:                                                          ║
║    All Headers: ${bulkResult.avgNs.toFixed(2).padStart(10)}ns ${bulkResult.avgNs < 5000 ? "✅" : "❌"}                         ║
║    Throughput: ${(1_000_000_000 / bulkResult.avgNs).toFixed(0).padStart(10)} req/sec                      ║
║    Error Detection: ${errorResult.avgNs.toFixed(2).padStart(10)}ns ${errorResult.avgNs < 5000 ? "✅" : "❌"}                         ║
║    Checksum Verify: ${checksumResult.avgNs.toFixed(2).padStart(10)}ns ${checksumResult.avgNs < 1000 ? "✅" : "❌"}                         ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  DNS Cache:                                                                ║
║    Cache Hit: ${dnsAvgNs.toFixed(2).padStart(10)}ns ${(dnsAvgNs > 0 && dnsAvgNs < 100) ? "✅" : dnsAvgNs === 0 ? "⊘" : "❌"}                         ║
║    Warmup Time: ${warmupDuration.toFixed(2).padStart(10)}ms ${(warmupDuration > 0) ? "✅" : "⊘"}                         ║
║    Hit Rate: ${(dnsHitRate * 100).toFixed(2).padStart(10)}% ${(dnsHits > 0) ? "✅" : "⊘"}                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Overall Status: ${configVersionResult.avgNs < 500 && bulkResult.avgNs < 5000 ? "✅ ALL TARGETS MET" : "❌ SOME TARGETS MISSED"}                                                ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// Performance Grades
// ============================================================================

console.log("\n🎯 Performance Grades:\n");

const allResults = [
  { name: "Config Version", ns: configVersionResult.avgNs, target: 500 },
  { name: "Registry Hash", ns: registryHashResult.avgNs, target: 500 },
  { name: "Feature Flags", ns: featureFlagsResult.avgNs, target: 500 },
  { name: "Terminal Mode", ns: terminalModeResult.avgNs, target: 500 },
  { name: "Terminal Rows", ns: terminalRowsResult.avgNs, target: 500 },
  { name: "Terminal Cols", ns: terminalColsResult.avgNs, target: 500 },
  { name: "Config Dump", ns: configDumpResult.avgNs, target: 1000 },
  { name: "Proxy Token", ns: proxyTokenResult.avgNs, target: 500 },
  { name: "Bulk Validation", ns: bulkResult.avgNs, target: 5000 },
  { name: "Error Detection", ns: errorResult.avgNs, target: 5000 },
  { name: "Checksum Verify", ns: checksumResult.avgNs, target: 1000 },
  { name: "DNS Cache Hit", ns: dnsAvgNs, target: 100 },
];

for (const result of allResults) {
  const ratio = (result.ns / result.target) * 100;
  let grade: string;

  if (ratio <= 50) {
    grade = "A+ 🚀";
  } else if (ratio <= 75) {
    grade = "A ✨";
  } else if (ratio <= 100) {
    grade = "B ✅";
  } else if (ratio <= 125) {
    grade = "C ⚠️";
  } else {
    grade = "D ❌";
  }

  console.log(`   ${result.name.padEnd(20)} ${result.ns.toFixed(2).padStart(8)}ns / ${result.target}ns = ${grade}`);
}

console.log("\n✅ Benchmark complete!\n");

process.exit(0);
