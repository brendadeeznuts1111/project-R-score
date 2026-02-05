/**
 * [EXAMPLE][DNS-RESOLVER][USAGE]{BUN-NATIVE}
 * Comprehensive examples of DNS resolution with validation
 * Run with: bun examples/dns-resolver-example.ts
 */

import {
  isValidIPv4,
  isValidIPv6,
  validateDNSResult,
  detectIPFamily,
  type DNSResolutionResult,
} from "../src/networking/dns-resolver";

console.log("\n🌐 [1.0.0.0] DNS Resolution Examples\n");

// [1.1.0.0] IPv4 Validation Examples
console.log("📋 [1.1.0.0] IPv4 Address Validation");
console.log("─".repeat(50));

const ipv4Examples = [
  { address: "127.0.0.1", expected: true, desc: "Localhost" },
  { address: "192.168.1.1", expected: true, desc: "Private network" },
  { address: "8.8.8.8", expected: true, desc: "Google DNS" },
  { address: "256.1.1.1", expected: false, desc: "Out of range" },
  { address: "1.1.1", expected: false, desc: "Incomplete" },
];

for (const { address, expected, desc } of ipv4Examples) {
  const result = isValidIPv4(address);
  const status = result === expected ? "✅" : "❌";
  console.log(`  ${status} "${address}" → ${result} (${desc})`);
}

// [1.2.0.0] IPv6 Validation Examples
console.log("\n📋 [1.2.0.0] IPv6 Address Validation");
console.log("─".repeat(50));

const ipv6Examples = [
  { address: "::1", expected: true, desc: "Localhost" },
  { address: "2001:db8::1", expected: true, desc: "Documentation prefix" },
  { address: "::", expected: true, desc: "All zeros" },
  { address: "gggg::1", expected: false, desc: "Invalid hex" },
  { address: "127.0.0.1", expected: false, desc: "IPv4 address" },
];

for (const { address, expected, desc } of ipv6Examples) {
  const result = isValidIPv6(address);
  const status = result === expected ? "✅" : "❌";
  console.log(`  ${status} "${address}" → ${result} (${desc})`);
}

// [1.3.0.0] Family Detection Examples
console.log("\n📋 [1.3.0.0] Automatic IP Family Detection");
console.log("─".repeat(50));

const detectionExamples = [
  { address: "127.0.0.1", expected: 4 },
  { address: "192.168.1.1", expected: 4 },
  { address: "::1", expected: 6 },
  { address: "2001:db8::1", expected: 6 },
];

for (const { address, expected } of detectionExamples) {
  try {
    const family = detectIPFamily(address);
    const status = family === expected ? "✅" : "❌";
    console.log(`  ${status} "${address}" → family ${family}`);
  } catch (error) {
    console.log(`  ❌ "${address}" → Error: ${(error as Error).message}`);
  }
}

// [1.4.0.0] DNS Result Validation Examples
console.log("\n📋 [1.4.0.0] DNS Resolution Result Validation");
console.log("─".repeat(50));

const validResults: DNSResolutionResult[] = [
  { address: "127.0.0.1", family: 4, ttl: 300 },
  { address: "8.8.8.8", family: 4, ttl: 3600 },
  { address: "::1", family: 6, ttl: 0 },
  { address: "2001:db8::1", family: 6, ttl: 7200 },
];

console.log("\n✅ Valid Results:");
for (const result of validResults) {
  try {
    validateDNSResult(result);
    console.log(
      `  ✅ ${result.address} (family: ${result.family}, ttl: ${result.ttl}s)`
    );
  } catch (error) {
    console.log(`  ❌ Error: ${(error as Error).message}`);
  }
}

// [1.5.0.0] Invalid Results (Error Handling)
console.log("\n❌ Invalid Results (Error Handling):");

const invalidResults = [
  {
    result: { address: "127.0.0.1", family: 6, ttl: 300 },
    desc: "IPv4 address with family 6",
  },
  {
    result: { address: "::1", family: 4, ttl: 300 },
    desc: "IPv6 address with family 4",
  },
  {
    result: { address: "127.0.0.1", family: 4, ttl: -1 },
    desc: "Negative TTL",
  },
];

for (const { result, desc } of invalidResults) {
  try {
    validateDNSResult(result as DNSResolutionResult);
    console.log(`  ❌ Should have thrown: ${desc}`);
  } catch (error) {
    console.log(`  ✅ ${desc}`);
    console.log(`     Error: ${(error as Error).message}`);
  }
}

// [1.6.0.0] Performance Metrics
console.log("\n📊 [1.6.0.0] Performance Metrics");
console.log("─".repeat(50));

const iterations = 10000;
const addresses = [
  "127.0.0.1",
  "192.168.1.1",
  "::1",
  "2001:db8::1",
];

const start = performance.now();
for (let i = 0; i < iterations; i++) {
  for (const addr of addresses) {
    detectIPFamily(addr);
  }
}
const end = performance.now();
const duration = end - start;
const opsPerSecond = (iterations * addresses.length) / (duration / 1000);

console.log(`  Iterations: ${iterations * addresses.length}`);
console.log(`  Duration: ${duration.toFixed(2)}ms`);
console.log(`  Ops/sec: ${opsPerSecond.toFixed(0)}`);
console.log(`  Per-op: ${(duration / (iterations * addresses.length)).toFixed(3)}ms`);

console.log("\n✅ DNS Resolution examples complete!\n");

