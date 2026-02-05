// Startup network optimizations for enterprise dashboard
// Cross-platform compatible (Windows fallback for CLI flags)
//
// Key environment variables:
//   BUN_CONFIG_MAX_HTTP_REQUESTS=2048  - Concurrent request ceiling (default 256, max ~65k)
//   BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=30 - DNS cache TTL
//   STARTUP_PRECONNECT_HOSTS=https://api1,https://api2 - Custom preconnect hosts
//   STARTUP_DNS_PREFETCH_HOSTS=host1,host2 - Custom DNS prefetch hosts
//
// CLI preconnect (fastest - happens before code runs):
//   bun --fetch-preconnect https://s3.amazonaws.com ./server.ts

import { dns } from "bun";
import { config } from "../config";

// Host status type with color info
type HostStatus = {
  id: string;
  label: string;
  url: string;
  status: "connected" | "prefetched" | "failed" | "unconfigured";
  color: { hex: string; hsl: string };
};

// Connection pool stats
type PoolStats = {
  maxConcurrent: number;
  currentCeiling: number;
  poolHitRate: number;
  preconnectSavingsMs: number;
};

// Track optimization results for monitoring
let _optimizationResults: {
  applied: boolean;
  timestamp: string | null;
  preconnectedHosts: string[];
  prefetchedHosts: string[];
  hostMatrix: HostStatus[];
  errors: string[];
  platform: string;
  method: "cli" | "programmatic";
  poolStats: PoolStats;
} = {
  applied: false,
  timestamp: null,
  preconnectedHosts: [],
  prefetchedHosts: [],
  hostMatrix: [],
  errors: [],
  platform: process.platform,
  method: "programmatic",
  poolStats: {
    maxConcurrent: 256,
    currentCeiling: parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256"),
    poolHitRate: 0,
    preconnectSavingsMs: 0,
  },
};

/**
 * Get host URL from config by id
 */
function getHostUrl(id: string): string {
  switch (id) {
    case "primary": return config.API.PRIMARY;
    case "analytics": return config.API.ANALYTICS;
    case "auth": return config.API.AUTH;
    case "cdn": return config.API.CDN;
    case "proxy": return config.PROXY.URL;
    case "s3": return config.S3.ENDPOINT || "";
    default: return "";
  }
}

/**
 * Build host matrix with status and colors from config
 * Only includes hosts that are configured with valid URLs
 */
function buildHostMatrix(): HostStatus[] {
  return config.API.HOSTS
    .map((host) => {
      const url = getHostUrl(host.id);
      return {
        id: host.id,
        label: host.label,
        url: url,
        status: "unconfigured" as HostStatus["status"],
        color: { hex: host.color.hex, hsl: host.color.hsl },
      };
    })
    .filter((host) => host.url.length > 0);
}

/**
 * Get startup preconnect hosts from environment or config
 * Priority: env var > config API hosts > config infrastructure hosts
 */
function getPreconnectHosts(): string[] {
  // Environment variable takes priority (comma-separated URLs)
  if (process.env.STARTUP_PRECONNECT_HOSTS) {
    return process.env.STARTUP_PRECONNECT_HOSTS.split(",")
      .map((h) => h.trim())
      .filter((h) => h.length > 0);
  }

  // Collect configured hosts from the matrix (only non-empty URLs)
  return config.API.HOSTS
    .map((host) => getHostUrl(host.id))
    .filter((url) => url.length > 0 && url.startsWith("http"));
}

/**
 * Get DNS prefetch hosts from environment or defaults
 */
function getPrefetchHosts(): string[] {
  if (process.env.STARTUP_DNS_PREFETCH_HOSTS) {
    return process.env.STARTUP_DNS_PREFETCH_HOSTS.split(",")
      .map((h) => h.trim())
      .filter(Boolean);
  }

  // Common hosts for development dashboards
  return [
    "api.github.com",
    "github.com",
    "registry.npmjs.org",
    "bun.sh",
    "example.com", // Route heatmap demo
    "raw.githubusercontent.com", // For fetching remote configs
    "registry.bun.sh", // Bun package registry
    "cdn.jsdelivr.net", // Common CDN for demos
  ];
}

/**
 * Apply startup network optimizations
 * Call this early in server initialization, before heavy network usage
 */
export async function applyStartupOptimizations(): Promise<typeof _optimizationResults> {
  const isWindows = process.platform === "win32";
  const preconnectHosts = getPreconnectHosts();
  const prefetchHosts = getPrefetchHosts();

  // Initialize host matrix
  _optimizationResults.hostMatrix = buildHostMatrix();

  console.log("Applying startup network optimizations...");

  // Method 1: Check if CLI flag was used (Unix/macOS only)
  if (!isWindows && process.env.BUN_FETCH_PRECONNECT) {
    console.log("Using CLI --fetch-preconnect flag");
    _optimizationResults.method = "cli";
    // CLI preconnect handles the actual preconnection, we just track what we would have done
    _optimizationResults.preconnectedHosts = preconnectHosts;
  } else if (preconnectHosts.length > 0) {
    // Method 2: Programmatic preconnect (Windows compatible)
    console.log(`Using programmatic preconnect (${isWindows ? "Windows" : "cross-platform"})`);
    _optimizationResults.method = "programmatic";

    // Pre-connect in parallel
    // Note: Bun bug #21633 - preconnect fails on default ports without explicit :443
    // Strategy: Try with explicit port first, then DNS prefetch fallback
    const results = await Promise.allSettled(
      preconnectHosts.map(async (host) => {
        const start = Bun.nanoseconds();
        try {
          const urlObj = new URL(host.startsWith("http") ? host : `https://${host}`);
          // Add explicit port to work around Bun bug #21633
          const port = urlObj.port || (urlObj.protocol === "https:" ? "443" : "80");
          const preconnectUrl = `${urlObj.protocol}//${urlObj.hostname}:${port}`;

          await fetch.preconnect(preconnectUrl);
          const savingsMs = (Bun.nanoseconds() - start) / 1_000_000;
          _optimizationResults.poolStats.preconnectSavingsMs += savingsMs;
          console.log(`  Pre-connected to ${preconnectUrl} (${savingsMs.toFixed(1)}ms)`);

          // Update host matrix status
          const matrixEntry = _optimizationResults.hostMatrix.find((h) => h.url === host);
          if (matrixEntry) matrixEntry.status = "connected";

          return { host: preconnectUrl, success: true, savingsMs };
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";

          // Fall back to DNS prefetch if preconnect fails
          try {
            const urlObj = new URL(host.startsWith("http") ? host : `https://${host}`);
            dns.prefetch(urlObj.hostname, 443);
            const savingsMs = (Bun.nanoseconds() - start) / 1_000_000;
            console.log(`  DNS prefetched ${urlObj.hostname}:443 (${savingsMs.toFixed(1)}ms, preconnect: ${msg})`);

            // Mark as prefetched instead of failed
            const matrixEntry = _optimizationResults.hostMatrix.find((h) => h.url === host);
            if (matrixEntry) matrixEntry.status = "prefetched";

            return { host, success: true, fallback: true, savingsMs };
          } catch {
            console.warn(`  Failed to pre-connect to ${host}: ${msg}`);
            _optimizationResults.errors.push(`${host}: ${msg}`);

            const matrixEntry = _optimizationResults.hostMatrix.find((h) => h.url === host);
            if (matrixEntry) matrixEntry.status = "failed";

            return { host, success: false };
          }
        }
      })
    );

    _optimizationResults.preconnectedHosts = results
      .filter((r) => r.status === "fulfilled" && r.value.success && !r.value.fallback)
      .map((r) => (r as PromiseFulfilledResult<{ host: string; success: boolean; fallback?: boolean }>).value.host);

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const fallbacks = results.filter((r) => r.status === "fulfilled" && r.value.fallback).length;
    console.log(`  Pre-connected: ${_optimizationResults.preconnectedHosts.length}, DNS fallback: ${fallbacks}, failed: ${preconnectHosts.length - successful}`);
  }

  // Method 3: DNS prefetch (always works, cross-platform)
  if (prefetchHosts.length > 0) {
    console.log("Prefetching DNS for common hosts...");

    const prefetchResults = await Promise.allSettled(
      prefetchHosts.map(async (host) => {
        try {
          // Extract hostname if full URL provided
          const hostname = host.includes("://") ? new URL(host).hostname : host;
          dns.prefetch(hostname, 443);
          return { host: hostname, success: true };
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          _optimizationResults.errors.push(`DNS ${host}: ${msg}`);
          return { host, success: false };
        }
      })
    );

    _optimizationResults.prefetchedHosts = prefetchResults
      .filter((r) => r.status === "fulfilled" && r.value.success)
      .map((r) => (r as PromiseFulfilledResult<{ host: string; success: boolean }>).value.host);

    console.log(`  Prefetched DNS for ${_optimizationResults.prefetchedHosts.length}/${prefetchHosts.length} hosts`);
  }

  _optimizationResults.applied = true;
  _optimizationResults.timestamp = new Date().toISOString();

  console.log("Startup optimizations complete");

  return _optimizationResults;
}

/**
 * Get optimization results for monitoring/API endpoints
 */
export function getOptimizationStatus() {
  // Rebuild host matrix with current URLs for fresh status
  const currentMatrix = buildHostMatrix().map((host) => {
    const existing = _optimizationResults.hostMatrix.find((h) => h.id === host.id);
    return {
      ...host,
      status: host.url ? (existing?.status || "unconfigured") : "unconfigured",
    };
  });

  const maxRequests = parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256");

  return {
    ..._optimizationResults,
    hostMatrix: currentMatrix,
    config: {
      dnsTtl: parseInt(process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS || "30"),
      maxHttpRequests: maxRequests,
      ceilingScaled: maxRequests > 256,
      maxPossible: 65535,
    },
    poolStats: {
      ..._optimizationResults.poolStats,
      currentCeiling: maxRequests,
      utilizationPercent: Math.round((_optimizationResults.poolStats.maxConcurrent / maxRequests) * 100),
    },
  };
}

/**
 * Probe connection timing for a host (measures first-byte latency)
 * Useful for verifying connection pool reuse
 */
export async function probeHostTiming(url: string): Promise<{
  url: string;
  dnsMs: number;
  connectMs: number;
  ttfbMs: number;
  totalMs: number;
  status: number;
  reused: boolean;
}> {
  const start = Bun.nanoseconds();

  // DNS lookup timing
  const hostname = new URL(url).hostname;
  const dnsStart = Bun.nanoseconds();
  try {
    await Bun.dns.lookup(hostname);
  } catch {
    // DNS lookup failed, continue anyway
  }
  const dnsMs = (Bun.nanoseconds() - dnsStart) / 1_000_000;

  // Connection + TTFB timing
  const connectStart = Bun.nanoseconds();
  try {
    const res = await fetch(url, { method: "HEAD" });
    const ttfbMs = (Bun.nanoseconds() - connectStart) / 1_000_000;
    const totalMs = (Bun.nanoseconds() - start) / 1_000_000;

    // Connection reuse heuristic: DNS cache hit (<10ms) OR fast TTFB (<100ms after warm-up)
    // Pool reuse typically shows as: dnsMs ≈ 0-3ms (cached), ttfbMs significantly lower than cold start
    const reused = dnsMs < 10 || ttfbMs < 100;

    return {
      url,
      dnsMs: Math.round(dnsMs * 100) / 100,
      connectMs: Math.round((ttfbMs - dnsMs) * 100) / 100,
      ttfbMs: Math.round(ttfbMs * 100) / 100,
      totalMs: Math.round(totalMs * 100) / 100,
      status: res.status,
      reused,
    };
  } catch (error) {
    const totalMs = (Bun.nanoseconds() - start) / 1_000_000;
    return {
      url,
      dnsMs: Math.round(dnsMs * 100) / 100,
      connectMs: 0,
      ttfbMs: 0,
      totalMs: Math.round(totalMs * 100) / 100,
      status: 0,
      reused: false,
    };
  }
}

/**
 * Probe all configured hosts and return timing data
 * Also updates pool stats based on results
 */
export async function probeAllHosts(): Promise<Array<ReturnType<typeof probeHostTiming> extends Promise<infer T> ? T : never>> {
  const hosts = [
    ...getPrefetchHosts().map(h => h.includes("://") ? h : `https://${h}`),
  ];

  const results = await Promise.all(hosts.map(probeHostTiming));

  // Update pool stats based on probe results
  const reusedCount = results.filter(r => r.reused).length;
  updatePoolStats(reusedCount, results.length);

  return results;
}

/**
 * Re-apply optimizations (useful for runtime refresh)
 */
export async function refreshOptimizations(): Promise<typeof _optimizationResults> {
  // Reset state
  _optimizationResults = {
    applied: false,
    timestamp: null,
    preconnectedHosts: [],
    prefetchedHosts: [],
    hostMatrix: [],
    errors: [],
    platform: process.platform,
    method: "programmatic",
    poolStats: {
      maxConcurrent: 256,
      currentCeiling: parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256"),
      poolHitRate: 0,
      preconnectSavingsMs: 0,
    },
  };

  return applyStartupOptimizations();
}

/**
 * Update pool hit rate based on probe results
 */
export function updatePoolStats(reusedCount: number, totalCount: number) {
  if (totalCount > 0) {
    _optimizationResults.poolStats.poolHitRate = Math.round((reusedCount / totalCount) * 100);
  }
  if (reusedCount > _optimizationResults.poolStats.maxConcurrent) {
    _optimizationResults.poolStats.maxConcurrent = reusedCount;
  }
}
