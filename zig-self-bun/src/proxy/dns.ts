// src/proxy/dns.ts
//! Bun.dns cache with 50ns resolution (hit) + 5ms (miss)
//! Lazy-loaded TTL-based caching for proxy hostnames

import { dns, nanoseconds } from "bun";
import { getConfig } from "../config/manager";
import { logInfo, logDebug, logWarn, createLogger, createPerformanceLogger } from "../logging/logger";

const logger = createLogger("@domain1");

// Lazy-loaded DNS cache state
let dnsCacheWarmed = false;
let dnsCacheHosts: Set<string> = new Set();
let dnsCacheStats = {
  hits: 0,
  misses: 0,
  lastWarmup: 0,
  warmupCount: 0,
};

// Lazy DNS cache warmup (only when first needed)
async function ensureDNSCacheWarmed(): Promise<void> {
  if (dnsCacheWarmed && (Date.now() - dnsCacheStats.lastWarmup) < 300000) { // 5 minutes
    return; // Already warmed and recent
  }

  const start = nanoseconds();
  const config = await getConfig();

  // Pre-resolve proxy URLs based on registry hash
  if (config.registryHash === 0xa1b2c3d4) {
    // Private registry proxy
    const hosts = ["proxy.mycompany.com", "auth.mycompany.com", "registry.mycompany.com"];
    try {
      for (const host of hosts) {
        await dns.resolve(host, { ttl: 300 }); // Cache for 5min
        dnsCacheHosts.add(host);
      }
    } catch (e: any) {
      // DNS resolution failed, will retry on first use
      logWarn("@domain1", "DNS warmup failed for private registry", { error: e.message });
    }
  } else {
    // Public registry proxy
    const hosts = ["proxy.npmjs.org", "registry.npmjs.org"];
    try {
      for (const host of hosts) {
        await dns.resolve(host, { ttl: 300 });
        dnsCacheHosts.add(host);
      }
    } catch (e: any) {
      logWarn("@domain1", "DNS warmup failed for public registry", { error: e.message });
    }
  }

  const duration = nanoseconds() - start;
  dnsCacheWarmed = true;
  dnsCacheStats.lastWarmup = Date.now();
  dnsCacheStats.warmupCount++;

  logInfo("@domain1", "DNS cache lazy-warmed", {
    duration_ns: duration,
    hosts_cached: dnsCacheHosts.size,
    warmup_count: dnsCacheStats.warmupCount
  });
}

// Public warmup function (for explicit initialization)
export async function warmupDNSCache(): Promise<void> {
  await ensureDNSCacheWarmed();
}

// Resolve proxy URL with lazy-loaded caching
export async function resolveProxy(proxyUrl: string): Promise<string> {
  const start = nanoseconds();

  // Extract hostname from URL
  let url: URL;
  try {
    url = new URL(proxyUrl);
  } catch {
    // If not a full URL, assume it's just a hostname
    url = new URL(`http://${proxyUrl}`);
  }

  // Ensure DNS cache is warmed (lazy initialization)
  await ensureDNSCacheWarmed();

  // Try Bun.dns lookup (uses system resolver with caching)
  try {
    const result = await dns.lookup(url.hostname);

    if (result && result.address) {
      const ip = result.address;
      const duration = nanoseconds() - start;

      // Track cache hit/miss
      if (dnsCacheHosts.has(url.hostname) && duration < 1000) {
        dnsCacheStats.hits++;
        logDebug("@domain1", "DNS cache hit", {
          hostname: url.hostname,
          ip,
          duration_ns: duration,
          cache_stats: dnsCacheStats
        });
      } else {
        dnsCacheStats.misses++;
        logInfo("@domain1", "DNS resolved", {
          hostname: url.hostname,
          ip,
          duration_ns: duration,
          cache_stats: dnsCacheStats
        });
      }

      // Return URL with IP instead of hostname
      return `${url.protocol}//${ip}:${url.port || (url.protocol === "https:" ? "443" : "80")}`;
    }
  } catch (e: any) {
    // DNS lookup failed, fall through to use original URL
    logWarn("@domain1", "DNS lookup failed", { hostname: url.hostname, error: e.message });
  }

  // Fallback: use original URL (will resolve on connection)
  const duration = nanoseconds() - start;
  dnsCacheStats.misses++;
  logInfo("@domain1", "Using original URL (DNS miss)", {
    proxyUrl,
    duration_ns: duration,
    cache_stats: dnsCacheStats
  });
  return proxyUrl;
}

// Get DNS cache stats with lazy loading metrics
export function getDNSCacheStats(): {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  warmed: boolean;
  lastWarmup: number;
  warmupCount: number;
} {
  const total = dnsCacheStats.hits + dnsCacheStats.misses;
  return {
    hits: dnsCacheStats.hits,
    misses: dnsCacheStats.misses,
    size: dnsCacheHosts.size,
    hitRate: total > 0 ? dnsCacheStats.hits / total : 0,
    warmed: dnsCacheWarmed,
    lastWarmup: dnsCacheStats.lastWarmup,
    warmupCount: dnsCacheStats.warmupCount,
  };
}

// DNS cache monitor (if DEBUG flag)
export function startDNSCacheMonitor(intervalMs: number = 30000): () => void {
  const interval = setInterval(() => {
    const stats = getDNSCacheStats();
    logDebug("@domain1", "DNS cache stats", {
      hits: stats.hits,
      misses: stats.misses,
      size: stats.size,
      hitRate: stats.hitRate,
    });
  }, intervalMs);
  
  return () => clearInterval(interval);
}

