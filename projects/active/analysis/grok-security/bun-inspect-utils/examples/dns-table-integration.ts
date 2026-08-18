/**
 * [EXAMPLE][DNS-TABLE][INTEGRATION]{BUN-NATIVE}
 * DNS resolution results displayed with table-utils
 * Run with: bun examples/dns-table-integration.ts
 */
// @see https://bun.com/docs/runtime/nodejs-compat#nodetty — process.stdout.isTTY

import { enforceTable } from "../src/utils/table-utils";
import {
  validateDNSResult,
  detectIPFamily,
  type DNSResolutionResult,
} from "../src/networking/dns-resolver";

console.info("\n🌐 [1.0.0.0] DNS Results with Table Display\n");

// [1.1.0.0] Sample DNS Resolution Results
const dnsResults: DNSResolutionResult[] = [
  { address: "127.0.0.1", family: 4, ttl: 0 },
  { address: "8.8.8.8", family: 4, ttl: 3600 },
  { address: "1.1.1.1", family: 4, ttl: 3600 },
  { address: "::1", family: 6, ttl: 0 },
  { address: "2001:4860:4860::8888", family: 6, ttl: 3600 },
  { address: "2606:4700:4700::1111", family: 6, ttl: 3600 },
];

// [1.2.0.0] Validate all results
console.info("📋 [1.2.0.0] Validating DNS Results");
console.info("─".repeat(50));

const validResults: DNSResolutionResult[] = [];
for (const result of dnsResults) {
  try {
    validateDNSResult(result);
    validResults.push(result);
    console.info(`  ✅ ${result.address} (family: ${result.family})`);
  } catch (error) {
    console.info(`  ❌ ${result.address}: ${(error as Error).message}`);
  }
}

// [1.3.0.0] Display as table
console.info("\n📊 [1.3.0.0] DNS Results Table");
console.info("─".repeat(50));

// Extend results with additional metadata for table display
interface DNSTableRow extends DNSResolutionResult {
  protocol: string;
  cacheHint: string;
  status: string;
}

const tableData: DNSTableRow[] = validResults.map((result) => ({
  ...result,
  protocol: result.family === 4 ? "IPv4" : "IPv6",
  cacheHint: result.ttl === 0 ? "No cache" : `${result.ttl}s`,
  status: "✅ Valid",
}));

// Display with enforceTable (requires ≥6 columns)
const columns = [
  "address",
  "family",
  "protocol",
  "ttl",
  "cacheHint",
  "status",
];

try {
  const table = enforceTable(tableData, columns, {
    colors: process.stdout.isTTY === true,
    sortByWidth: true,
  });
  console.info(table);
} catch (error) {
  console.info(`  Note: ${(error as Error).message}`);
  console.info("  (enforceTable requires ≥6 columns for enterprise mode)");
}

// [1.4.0.0] Statistics
console.info("\n📈 [1.4.0.0] DNS Resolution Statistics");
console.info("─".repeat(50));

const ipv4Count = validResults.filter((r) => r.family === 4).length;
const ipv6Count = validResults.filter((r) => r.family === 6).length;
const cachedCount = validResults.filter((r) => r.ttl > 0).length;
const avgTTL =
  validResults.reduce((sum, r) => sum + r.ttl, 0) / validResults.length;

console.info(`  Total results: ${validResults.length}`);
console.info(`  IPv4 addresses: ${ipv4Count}`);
console.info(`  IPv6 addresses: ${ipv6Count}`);
console.info(`  Cacheable (TTL > 0): ${cachedCount}`);
console.info(`  Average TTL: ${avgTTL.toFixed(0)}s`);

// [1.5.0.0] Family Distribution
console.info("\n🔄 [1.5.0.0] Protocol Distribution");
console.info("─".repeat(50));

const familyStats = new Map<number, number>();
for (const result of validResults) {
  familyStats.set(result.family, (familyStats.get(result.family) ?? 0) + 1);
}

for (const [family, count] of familyStats) {
  const percentage = ((count / validResults.length) * 100).toFixed(1);
  const bar = "█".repeat(Math.round(count * 2));
  console.info(`  IPv${family}: ${count} (${percentage}%) ${bar}`);
}

// [1.6.0.0] Cache Efficiency Analysis
console.info("\n💾 [1.6.0.0] Cache Efficiency Analysis");
console.info("─".repeat(50));

const cacheableResults = validResults.filter((r) => r.ttl > 0);
const totalCacheTTL = cacheableResults.reduce((sum, r) => sum + r.ttl, 0);

console.info(`  Cacheable results: ${cacheableResults.length}/${validResults.length}`);
console.info(`  Total cache time: ${totalCacheTTL}s`);
console.info(`  Average cache duration: ${(totalCacheTTL / cacheableResults.length).toFixed(0)}s`);

// [1.7.0.0] Performance Metrics
console.info("\n⏱️  [1.7.0.0] Performance Metrics");
console.info("─".repeat(50));

const start = performance.now();
for (let i = 0; i < 1000; i++) {
  for (const result of validResults) {
    validateDNSResult(result);
  }
}
const end = performance.now();
const duration = end - start;

console.info(`  Validations: ${validResults.length * 1000}`);
console.info(`  Duration: ${duration.toFixed(2)}ms`);
console.info(`  Per-validation: ${(duration / (validResults.length * 1000)).toFixed(4)}ms`);
console.info(`  Throughput: ${((validResults.length * 1000) / (duration / 1000)).toFixed(0)} ops/sec`);

console.info("\n✅ DNS table integration complete!\n");
