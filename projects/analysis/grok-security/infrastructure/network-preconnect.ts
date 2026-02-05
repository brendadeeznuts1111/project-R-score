#!/usr/bin/env bun
/**
 * [NETWORK][PRECONNECT][BUN-NATIVE]{PERFORMANCE}
 * Bun-native network preconnection system using native APIs:
 * - dns.prefetch() for DNS warm-up
 * - fetch.preconnect() for TCP+TLS warm-up
 * - dns.getCacheStats() for cache monitoring
 * - dns.promises.resolve4() for DNS latency testing
 * https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host
 */

import { dns } from "bun";
// Note: performance is a global in Bun (like browsers)

export interface PreconnectTarget {
  host: string;
  port?: number;
  protocol?: "http" | "https";
  timeout?: number;
}

export interface PreconnectConfig {
  targets: PreconnectTarget[];
  parallel?: boolean;
  timeout?: number;
  verbose?: boolean;
  dnsPrefetch?: boolean; // Also do DNS prefetch
}

export interface PreconnectResult {
  host: string;
  port: number;
  protocol: string;
  success: boolean;
  latency: number;
  error?: string;
  dnsPrefetched?: boolean;
}

export interface DNSCacheStats {
  cacheHitsCompleted: number;
  cacheHitsInflight: number;
  cacheMisses: number;
  size: number;
  errors: number;
  totalCount: number;
}

/**
 * Test DNS resolution latency for a given host
 * Returns latency in milliseconds or -1 on error
 */
export async function testDNSLatency(
  host: string
): Promise<{ host: string; latency: number; error?: string }> {
  try {
    const start = performance.now();
    await dns.promises.resolve4(host);
    const latency = performance.now() - start;
    return { host, latency };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { host, latency: -1, error: errorMsg };
  }
}

/**
 * DNS prefetch only (no TCP/TLS)
 * Use when you know the host but aren't ready to call fetch
 * Note: dns.prefetch(hostname, port) requires both arguments
 */
export function dnsPrefetch(host: string, port = 443, verbose = false): void {
  if (verbose) console.log(`🔍 DNS prefetching ${host}:${port}...`);
  dns.prefetch(host, port);
  if (verbose) console.log(`✅ DNS prefetch issued for ${host}:${port}`);
}

/**
 * Get DNS cache statistics
 */
export function getDNSCacheStats(): DNSCacheStats {
  return dns.getCacheStats() as DNSCacheStats;
}

/**
 * Preconnect to a single host using Bun's native fetch.preconnect()
 * This warms up DNS + TCP + TLS in one call
 */
export async function preconnectHost(
  target: PreconnectTarget,
  verbose = false
): Promise<PreconnectResult> {
  const host = target.host;
  const port = target.port || 443;
  const protocol = target.protocol || "https";
  const url = `${protocol}://${host}:${port}`;

  const startTime = performance.now();

  try {
    if (verbose) console.log(`🔗 Preconnecting to ${url}...`);

    // Use Bun's native fetch.preconnect() for TCP+TLS warm-up
    await fetch.preconnect(url);

    const latency = performance.now() - startTime;

    if (verbose)
      console.log(`✅ Preconnected to ${url} (${latency.toFixed(2)}ms)`);
    return { host, port, protocol, success: true, latency };
  } catch (error) {
    const latency = performance.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (verbose) console.log(`⚠️  Failed to preconnect to ${url}: ${errorMsg}`);
    return { host, port, protocol, success: false, latency, error: errorMsg };
  }
}

/**
 * Preconnect to multiple hosts using Bun's native APIs
 * Optionally also performs DNS prefetch before TCP+TLS
 */
export async function preconnectAll(
  config: PreconnectConfig
): Promise<PreconnectResult[]> {
  const {
    targets,
    parallel = true,
    verbose = false,
    dnsPrefetch: doDnsPrefetch = false,
  } = config;

  if (verbose) {
    console.log(
      `\n🌐 Network Preconnection (${parallel ? "parallel" : "sequential"})`
    );
    console.log(`📍 Targets: ${targets.length}`);
    if (doDnsPrefetch) console.log(`🔍 DNS prefetch: enabled`);
  }

  // Optional: DNS prefetch first (async, non-blocking)
  if (doDnsPrefetch) {
    for (const target of targets) {
      dnsPrefetch(target.host, target.port || 443, verbose);
    }
  }

  if (parallel) {
    return Promise.all(targets.map((t) => preconnectHost(t, verbose)));
  } else {
    const results: PreconnectResult[] = [];
    for (const target of targets) {
      results.push(await preconnectHost(target, verbose));
    }
    return results;
  }
}

/**
 * Get preconnection statistics including DNS cache info
 */
export function getPreconnectStats(results: PreconnectResult[]) {
  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;
  const avgLatency =
    results.reduce((sum, r) => sum + r.latency, 0) / results.length;
  const maxLatency = Math.max(...results.map((r) => r.latency));
  const minLatency = Math.min(...results.map((r) => r.latency));
  const dnsCache = getDNSCacheStats();

  return {
    total: results.length,
    successful,
    failed,
    avgLatency: avgLatency.toFixed(2),
    maxLatency: maxLatency.toFixed(2),
    minLatency: minLatency.toFixed(2),
    dnsCache,
  };
}

/**
 * Verbose fetch with debugging enabled
 * Use { verbose: true } to see exact headers Bun sends/receives
 */
export async function verboseFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, { ...options, verbose: true } as RequestInit);
}

/**
 * Zero-copy file download - writes response directly to disk
 * Optimal for large file downloads
 */
export async function downloadFile(
  url: string,
  outputPath: string,
  verbose = false
): Promise<void> {
  if (verbose) console.log(`📥 Downloading ${url} → ${outputPath}`);
  const response = await fetch(url);
  await Bun.write(outputPath, response); // Zero-copy when possible
  if (verbose) console.log(`✅ Downloaded to ${outputPath}`);
}

/**
 * Zero-copy file upload - sends file directly via sendfile
 * Optimal for large files (≥32 KB) on macOS/Linux without proxy
 */
export async function uploadFile(
  url: string,
  filePath: string,
  method: "POST" | "PUT" = "POST",
  verbose = false
): Promise<Response> {
  if (verbose) console.log(`📤 Uploading ${filePath} → ${url}`);
  const response = await fetch(url, {
    method,
    body: Bun.file(filePath), // Uses sendfile for ≥32 KB files
  });
  if (verbose) console.log(`✅ Uploaded (status: ${response.status})`);
  return response;
}

/**
 * Default preconnect targets for grok-security infrastructure
 */
export const DEFAULT_PRECONNECT_TARGETS: PreconnectTarget[] = [
  { host: "localhost", port: 8080, protocol: "http" }, // Headscale API
  { host: "localhost", port: 9090, protocol: "http" }, // Metrics
  { host: "localhost", port: 3000, protocol: "http" }, // Headplane UI
  { host: "localhost", port: 4000, protocol: "http" }, // API Proxy
  { host: "api.example.com", port: 443, protocol: "https" }, // Production API
  { host: "100.64.0.10", port: 8080, protocol: "http" }, // Tailscale Headscale
];
