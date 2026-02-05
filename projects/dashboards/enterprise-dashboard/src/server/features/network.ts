/**
 * 🛰️ NETWORK DOMINION ENGINE
 * Bun 1.3.6 - Native TOML + SIMD CRC32 + fetch.preconnect
 *
 * Features:
 * - Native TOML import (0.2ms parse)
 * - Hardware-accelerated CRC32 integrity (~9.5 GB/s)
 * - DNS prefetch warming
 * - TCP+TLS preconnect pooling
 */

// ⚡ NATIVE TOML LOADER (0.2ms)
import matrix from "../../../config/network-matrix.toml" with { type: "toml" };
import preconnectConfig from "../../../config/fetch-preconnect.toml" with { type: "toml" };

// Type definitions for TOML imports
interface Host {
  id: string;
  label: string;
  env: string;
  color_hex: string;
  color_hsl: string;
}

interface NetworkMatrix {
  meta: { version: string; date: string; description: string };
  hosts: Record<string, Host>;
  status_types: Record<string, string>;
  dns_prefetch: {
    default_hosts: string[];
    ttl_seconds: number;
    max_cache_entries: number;
  };
  monitoring: {
    probe_endpoint: string;
    optimizations_endpoint: string;
    refresh_method: string;
  };
}

// Cast imported TOML to typed interface
const networkMatrix = matrix as unknown as NetworkMatrix;

// Connection status tracking
const connectionStatus = new Map<string, "connected" | "prefetched" | "failed" | "unconfigured">();

/**
 * Calculate CRC32 integrity hash for config
 */
function getMatrixIntegrity(): string {
  const data = JSON.stringify(networkMatrix);
  return Bun.hash.crc32(data).toString(16).padStart(8, "0");
}

/**
 * 🚀 Initialize network connections
 * Warms DNS cache and establishes TCP+TLS preconnects
 */
export async function initializeNetwork(): Promise<{
  integrity: string;
  preconnected: number;
  prefetched: number;
  failed: string[];
}> {
  const startTime = performance.now();
  console.log("🚀 Warming Network Matrix...");

  const failed: string[] = [];
  let preconnected = 0;
  let prefetched = 0;

  // 1. DNS PREFETCH - Warm registry caches
  const { dns_prefetch } = networkMatrix;
  for (const host of dns_prefetch.default_hosts) {
    try {
      await Bun.dns.lookup(host);
      prefetched++;
      console.log(`📡 DNS prefetched: ${host}`);
    } catch {
      console.log(`⚠️  DNS prefetch failed: ${host}`);
    }
  }

  // 2. TCP+TLS PRECONNECT - Warm connection pool
  const hostEntries = Object.values(networkMatrix.hosts);
  for (const host of hostEntries) {
    const url = process.env[host.env];

    if (!url) {
      connectionStatus.set(host.id, "unconfigured");
      continue;
    }

    try {
      // Use fetch.preconnect for TCP+TLS warmup (Bun 1.3+)
      if (typeof fetch.preconnect === "function") {
        await fetch.preconnect(url);
        connectionStatus.set(host.id, "connected");
        preconnected++;
        console.log(`🔗 Preconnected: ${host.label} → ${url}`);
      } else {
        // Fallback: HEAD request to establish connection
        await fetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(2000),
        });
        connectionStatus.set(host.id, "connected");
        preconnected++;
        console.log(`🔗 Connected (HEAD): ${host.label} → ${url}`);
      }
    } catch (err) {
      connectionStatus.set(host.id, "failed");
      failed.push(host.id);
      console.log(`❌ Failed: ${host.label} - ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  // 3. INTEGRITY CHECK - SIMD CRC32
  const integrity = getMatrixIntegrity();
  const elapsed = (performance.now() - startTime).toFixed(2);

  console.log(`\n✅ Network Matrix Initialized [${elapsed}ms]`);
  console.log(`   Integrity: ${integrity}`);
  console.log(`   Preconnected: ${preconnected}/${hostEntries.length}`);
  console.log(`   DNS Prefetched: ${prefetched}/${dns_prefetch.default_hosts.length}`);

  return { integrity, preconnected, prefetched, failed };
}

/**
 * Get current connection status for all hosts
 */
export function getNetworkStatus(): {
  hosts: Array<Host & { status: string; url?: string }>;
  integrity: string;
  ceiling: number;
} {
  const hosts = Object.values(networkMatrix.hosts).map((host) => ({
    ...host,
    status: connectionStatus.get(host.id) ?? "unconfigured",
    url: process.env[host.env],
  }));

  return {
    hosts,
    integrity: getMatrixIntegrity(),
    ceiling: parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS ?? "256", 10),
  };
}

/**
 * Probe a specific host's connectivity
 */
export async function probeHost(hostId: string): Promise<{
  host: string;
  latency: number;
  status: "ok" | "error";
  error?: string;
}> {
  const host = networkMatrix.hosts[hostId];
  if (!host) {
    return { host: hostId, latency: 0, status: "error", error: "Host not found" };
  }

  const url = process.env[host.env];
  if (!url) {
    return { host: hostId, latency: 0, status: "error", error: "URL not configured" };
  }

  const start = performance.now();
  try {
    await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    const latency = performance.now() - start;
    connectionStatus.set(hostId, "connected");
    return { host: hostId, latency, status: "ok" };
  } catch (err) {
    connectionStatus.set(hostId, "failed");
    return {
      host: hostId,
      latency: performance.now() - start,
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Print network matrix table to console
 */
export function printNetworkTable(): void {
  const hosts = Object.values(networkMatrix.hosts).map((h) => ({
    ID: h.id,
    Label: h.label,
    Hex: h.color_hex,
    Env: h.env,
    Status: connectionStatus.get(h.id) ?? "unconfigured",
  }));

  console.log("\n📊 Network Matrix:");
  console.log(Bun.inspect.table(hosts, { colors: true }));
}

// Export matrix for direct access
export { networkMatrix, preconnectConfig };
export type { Host, NetworkMatrix };
