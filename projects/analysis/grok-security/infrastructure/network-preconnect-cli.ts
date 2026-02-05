#!/usr/bin/env bun
/**
 * [NETWORK][PRECONNECT][CLI]{BUN-NATIVE}
 * CLI wrapper for network preconnection using Bun's native APIs:
 * - dns.prefetch() for DNS warm-up
 * - fetch.preconnect() for TCP+TLS warm-up
 * - dns.getCacheStats() for cache monitoring
 * Usage: bun network-preconnect-cli.ts [options]
 */

import {
  preconnectHost,
  preconnectAll,
  getPreconnectStats,
  getDNSCacheStats,
  dnsPrefetch,
  DEFAULT_PRECONNECT_TARGETS,
  type PreconnectTarget,
} from "./network-preconnect";

// Parse CLI arguments
const args = process.argv.slice(2);
const flags = {
  all: args.includes("--all"),
  host: args.find((a) => a.startsWith("--host="))?.split("=")[1],
  port: parseInt(
    args.find((a) => a.startsWith("--port="))?.split("=")[1] || "443"
  ),
  protocol: (args.find((a) => a.startsWith("--protocol="))?.split("=")[1] ||
    "https") as "http" | "https",
  parallel:
    args.find((a) => a.startsWith("--parallel="))?.split("=")[1] !== "false",
  dnsPrefetch: args.includes("--dns-prefetch"),
  dnsOnly: args.includes("--dns-only"),
  dnsCache: args.includes("--dns-cache"),
  poolInfo: args.includes("--pool-info"),
  verbose: args.includes("--verbose"),
  stats: args.includes("--stats"),
  help: args.includes("--help") || args.includes("-h"),
};

async function main() {
  if (flags.help) {
    console.log(`
🌐 Network Preconnection CLI (Bun Native)

Uses Bun's native APIs:
  - dns.prefetch() for DNS warm-up
  - fetch.preconnect() for TCP+TLS warm-up
  - dns.getCacheStats() for cache monitoring

Usage: bun network-preconnect-cli.ts [options]

Options:
  --all                    Preconnect to all default targets
  --host=<host>           Preconnect to specific host
  --port=<port>           Port number (default: 443)
  --protocol=<http|https> Protocol (default: https)
  --parallel=<true|false> Parallel execution (default: true)
  --dns-prefetch          Also do DNS prefetch before TCP+TLS
  --dns-only              Only do DNS prefetch (no TCP+TLS)
  --dns-cache             Show DNS cache statistics
  --pool-info             Show connection pool configuration
  --verbose               Show detailed output
  --stats                 Show statistics
  --help, -h              Show this help message

Examples:
  # Preconnect to all targets with DNS prefetch
  bun network-preconnect-cli.ts --all --dns-prefetch --verbose

  # DNS prefetch only (faster, no TCP/TLS)
  bun network-preconnect-cli.ts --all --dns-only --verbose

  # Show DNS cache stats
  bun network-preconnect-cli.ts --dns-cache

  # Test single host
  bun network-preconnect-cli.ts --host=localhost --port=8080 --protocol=http --verbose

  # Warm up with stats
  bun network-preconnect-cli.ts --all --parallel=true --verbose --stats

Bun CLI Preconnect Flags:
  # Preconnect at startup via Bun CLI
  bun --fetch-preconnect=https://api.example.com ./app.ts

  # Raise connection pool limit (default: 256)
  BUN_CONFIG_MAX_HTTP_REQUESTS=2048 bun ./server.ts

  # Debug fetch operations
  BUN_DEBUG=fetch* bun ./server.ts | grep "pool.*reuse"

  # Benchmark cold vs preconnected (requires hyperfine)
  hyperfine 'bun cold.ts' 'bun --fetch-preconnect=https://... warm.ts'
    `);
    process.exit(0);
  }

  try {
    // Show DNS cache stats
    if (flags.dnsCache) {
      const s = getDNSCacheStats();
      const hitRatio =
        s.totalCount > 0
          ? (
              ((s.cacheHitsCompleted + s.cacheHitsInflight) / s.totalCount) *
              100
            ).toFixed(1)
          : "0.0";
      console.log("\n📊 DNS Cache Statistics:");
      console.log(`   Hit Ratio:    ${hitRatio}%`);
      console.log(
        `   Hits:         ${s.cacheHitsCompleted} completed + ${s.cacheHitsInflight} in-flight`
      );
      console.log(`   Misses:       ${s.cacheMisses}`);
      console.log(`   Errors:       ${s.errors}`);
      console.log(`   Cache Size:   ${s.size}/255`);
      console.log(`   Total Reqs:   ${s.totalCount}\n`);
      process.exit(0);
    }

    // Show connection pool info
    if (flags.poolInfo) {
      const maxReqs = process.env.BUN_CONFIG_MAX_HTTP_REQUESTS ?? "256";
      const dnsTTL = process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS ?? "30";
      console.log("\n🔌 Connection Pool Configuration:");
      console.log(
        `   Max HTTP Requests:  ${maxReqs} (BUN_CONFIG_MAX_HTTP_REQUESTS)`
      );
      console.log(
        `   DNS TTL:            ${dnsTTL}s (BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS)`
      );
      console.log(`\n💡 To increase pool size:`);
      console.log(`   BUN_CONFIG_MAX_HTTP_REQUESTS=2048 bun ./server.ts`);
      console.log(`\n💡 To reduce DNS TTL:`);
      console.log(`   BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun ./server.ts\n`);
      process.exit(0);
    }

    // DNS prefetch only mode
    if (flags.dnsOnly) {
      if (flags.all) {
        console.log("\n🔍 DNS Prefetch Only Mode\n");
        for (const target of DEFAULT_PRECONNECT_TARGETS) {
          dnsPrefetch(target.host, target.port || 443, flags.verbose);
        }
        console.log("\n✅ DNS prefetch complete\n");
      } else if (flags.host) {
        dnsPrefetch(flags.host, flags.port, flags.verbose);
        console.log("\n✅ DNS prefetch complete\n");
      } else {
        console.error(
          "❌ Please specify --all or --host=<host> with --dns-only"
        );
        process.exit(1);
      }
      process.exit(0);
    }

    if (flags.all) {
      // Preconnect to all default targets
      if (flags.verbose) {
        console.log(
          "\n📍 Preconnecting to default infrastructure targets...\n"
        );
      }

      const results = await preconnectAll({
        targets: DEFAULT_PRECONNECT_TARGETS,
        parallel: flags.parallel,
        verbose: flags.verbose,
        dnsPrefetch: flags.dnsPrefetch,
      });

      if (flags.stats) {
        const stats = getPreconnectStats(results);
        const d = stats.dnsCache;
        const hitRatio =
          d.totalCount > 0
            ? (
                ((d.cacheHitsCompleted + d.cacheHitsInflight) / d.totalCount) *
                100
              ).toFixed(1)
            : "0.0";
        console.log("\n📊 Preconnection Statistics:");
        console.log(`   Total:      ${stats.total}`);
        console.log(`   Successful: ${stats.successful}`);
        console.log(`   Failed:     ${stats.failed}`);
        console.log(`   Avg Latency: ${stats.avgLatency}ms`);
        console.log(`   Min Latency: ${stats.minLatency}ms`);
        console.log(`   Max Latency: ${stats.maxLatency}ms`);
        console.log(`\n📦 DNS Cache (${hitRatio}% hit ratio):`);
        console.log(
          `   Hits:   ${d.cacheHitsCompleted} completed + ${d.cacheHitsInflight} in-flight`
        );
        console.log(`   Misses: ${d.cacheMisses} | Errors: ${d.errors}`);
        console.log(`   Size:   ${d.size}/255 | Total: ${d.totalCount}\n`);
      }

      const allSuccess = results.every((r) => r.success);
      process.exit(allSuccess ? 0 : 1);
    } else if (flags.host) {
      // Preconnect to single host
      const target: PreconnectTarget = {
        host: flags.host,
        port: flags.port,
        protocol: flags.protocol,
      };

      const result = await preconnectHost(target, flags.verbose);

      if (flags.stats) {
        const d = getDNSCacheStats();
        const hitRatio =
          d.totalCount > 0
            ? (
                ((d.cacheHitsCompleted + d.cacheHitsInflight) / d.totalCount) *
                100
              ).toFixed(1)
            : "0.0";
        console.log(`\n📊 Connection Statistics:`);
        console.log(`   Host:    ${result.host}`);
        console.log(`   Port:    ${result.port}`);
        console.log(`   Protocol: ${result.protocol}`);
        console.log(`   Latency: ${result.latency.toFixed(2)}ms`);
        console.log(
          `   Status:  ${result.success ? "✅ Success" : "❌ Failed"}`
        );
        console.log(`\n📦 DNS Cache (${hitRatio}% hit ratio):`);
        console.log(
          `   Hits:   ${d.cacheHitsCompleted} completed + ${d.cacheHitsInflight} in-flight`
        );
        console.log(`   Misses: ${d.cacheMisses} | Errors: ${d.errors}`);
        console.log(`   Size:   ${d.size}/255 | Total: ${d.totalCount}\n`);
      }

      process.exit(result.success ? 0 : 1);
    } else {
      console.error("❌ Please specify --all or --host=<host>");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
