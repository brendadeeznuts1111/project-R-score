#!/usr/bin/env bun
/**
 * 🚀 STARTUP OPTIMIZATIONS SCRIPT
 * Automates DNS warming and connection preconnect on boot
 *
 * Bun 1.3.6 Features Used:
 * - Native TOML import (0.2ms)
 * - Bun.dns.lookup() for DNS prefetch
 * - fetch.preconnect() for TCP+TLS warmup
 * - Bun.hash.crc32() for integrity verification
 * - Bun.inspect.table() for formatted output
 *
 * Usage:
 *   bun scripts/startup-optimizations.ts
 *   bun scripts/startup-optimizations.ts --verbose
 *   bun scripts/startup-optimizations.ts --dry-run
 */

import matrix from "../config/network-matrix.toml" with { type: "toml" };
import preconnect from "../config/fetch-preconnect.toml" with { type: "toml" };

// Parse CLI flags
const args = new Set(Bun.argv.slice(2));
const VERBOSE = args.has("--verbose") || args.has("-v");
const DRY_RUN = args.has("--dry-run") || args.has("-n");

// Types
interface Host {
  id: string;
  label: string;
  env: string;
  color_hex: string;
}

interface Result {
  Host: string;
  Type: string;
  Status: string;
  Latency: string;
  URL: string;
}

const networkMatrix = matrix as {
  hosts: Record<string, Host>;
  dns_prefetch: { default_hosts: string[] };
  meta: { version: string };
};

const preconnectConfig = preconnect as {
  ceiling: { default_limit: number };
  meta: { version: string };
};

// ============================================
// Main Optimization Pipeline
// ============================================

async function main() {
  const startTime = performance.now();
  const results: Result[] = [];

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║  🚀 STARTUP OPTIMIZATION ENGINE                            ║");
  console.log("║  Bun v" + Bun.version.padEnd(10) + " │ Network Matrix v" + networkMatrix.meta.version.padEnd(10) + "║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No connections will be made\n");
  }

  // ────────────────────────────────────────────
  // Phase 1: DNS Prefetch
  // ────────────────────────────────────────────
  console.log("📡 Phase 1: DNS Prefetch");
  console.log("─".repeat(60));

  for (const host of networkMatrix.dns_prefetch.default_hosts) {
    const start = performance.now();
    try {
      if (!DRY_RUN) {
        const records = await Bun.dns.lookup(host);
        const elapsed = (performance.now() - start).toFixed(2);
        results.push({
          Host: host,
          Type: "DNS",
          Status: "✓ RESOLVED",
          Latency: `${elapsed}ms`,
          URL: records[0]?.address ?? "N/A",
        });
        if (VERBOSE) {
          console.log(`  ✓ ${host} → ${records[0]?.address} (${elapsed}ms)`);
        }
      } else {
        results.push({
          Host: host,
          Type: "DNS",
          Status: "○ DRY RUN",
          Latency: "N/A",
          URL: "—",
        });
      }
    } catch (err) {
      const elapsed = (performance.now() - start).toFixed(2);
      results.push({
        Host: host,
        Type: "DNS",
        Status: "✗ FAILED",
        Latency: `${elapsed}ms`,
        URL: err instanceof Error ? err.message : "Unknown",
      });
      if (VERBOSE) {
        console.log(`  ✗ ${host} - ${err instanceof Error ? err.message : "Failed"}`);
      }
    }
  }

  // ────────────────────────────────────────────
  // Phase 2: TCP+TLS Preconnect
  // ────────────────────────────────────────────
  console.log("\n🔗 Phase 2: TCP+TLS Preconnect");
  console.log("─".repeat(60));

  const hosts = Object.values(networkMatrix.hosts);
  for (const host of hosts) {
    const url = process.env[host.env];

    if (!url) {
      results.push({
        Host: host.label,
        Type: "TCP+TLS",
        Status: "○ NO ENV",
        Latency: "N/A",
        URL: `\$${host.env}`,
      });
      if (VERBOSE) {
        console.log(`  ○ ${host.label} - ${host.env} not set`);
      }
      continue;
    }

    const start = performance.now();
    try {
      if (!DRY_RUN) {
        // Use fetch.preconnect if available (Bun 1.3+)
        if (typeof fetch.preconnect === "function") {
          await fetch.preconnect(url);
        } else {
          // Fallback to HEAD request
          await fetch(url, {
            method: "HEAD",
            signal: AbortSignal.timeout(3000),
          });
        }
        const elapsed = (performance.now() - start).toFixed(2);
        results.push({
          Host: host.label,
          Type: "TCP+TLS",
          Status: "✓ WARM",
          Latency: `${elapsed}ms`,
          URL: new URL(url).hostname,
        });
        if (VERBOSE) {
          console.log(`  ✓ ${host.label} → ${new URL(url).hostname} (${elapsed}ms)`);
        }
      } else {
        results.push({
          Host: host.label,
          Type: "TCP+TLS",
          Status: "○ DRY RUN",
          Latency: "N/A",
          URL: new URL(url).hostname,
        });
      }
    } catch (err) {
      const elapsed = (performance.now() - start).toFixed(2);
      results.push({
        Host: host.label,
        Type: "TCP+TLS",
        Status: "✗ FAILED",
        Latency: `${elapsed}ms`,
        URL: err instanceof Error ? err.message.slice(0, 30) : "Unknown",
      });
      if (VERBOSE) {
        console.log(`  ✗ ${host.label} - ${err instanceof Error ? err.message : "Failed"}`);
      }
    }
  }

  // ────────────────────────────────────────────
  // Phase 3: Integrity Verification
  // ────────────────────────────────────────────
  console.log("\n🔐 Phase 3: Integrity Verification");
  console.log("─".repeat(60));

  const matrixCrc = Bun.hash.crc32(JSON.stringify(networkMatrix)).toString(16).padStart(8, "0");
  const preconnectCrc = Bun.hash.crc32(JSON.stringify(preconnectConfig)).toString(16).padStart(8, "0");

  console.log(`  Network Matrix CRC32: ${matrixCrc}`);
  console.log(`  Preconnect Config CRC32: ${preconnectCrc}`);

  // ────────────────────────────────────────────
  // Summary Table
  // ────────────────────────────────────────────
  const elapsed = (performance.now() - startTime).toFixed(2);
  const succeeded = results.filter((r) => r.Status.includes("✓")).length;
  const failed = results.filter((r) => r.Status.includes("✗")).length;
  const skipped = results.filter((r) => r.Status.includes("○")).length;

  console.log("\n📊 Results Summary");
  console.log("─".repeat(60));
  console.log(Bun.inspect.table(results, ["Host", "Type", "Status", "Latency"], { colors: true }));

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log(`║  ✓ Succeeded: ${String(succeeded).padEnd(4)} │ ✗ Failed: ${String(failed).padEnd(4)} │ ○ Skipped: ${String(skipped).padEnd(4)}  ║`);
  console.log(`║  Total Time: ${elapsed.padEnd(8)}ms │ Ceiling: ${String(preconnectConfig.ceiling?.default_limit ?? 256).padEnd(5)} connections   ║`);
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Exit with error if any critical connections failed
  if (failed > 0 && !DRY_RUN) {
    console.log("⚠️  Some connections failed. Check environment variables.\n");
    process.exit(1);
  }
}

// ============================================
// Entry Point
// ============================================
main().catch((err) => {
  console.error("❌ Startup optimization failed:", err);
  process.exit(1);
});
