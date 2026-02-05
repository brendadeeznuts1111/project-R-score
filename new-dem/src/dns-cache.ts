#!/usr/bin/env bun

// Advanced DNS Prefetching & Caching System
// Integrated throughout T3-Lattice Registry for optimal performance

import { LATTICE_REGISTRY } from "./constants";

// Default DNS configuration
const DEFAULT_DNS_CONFIG: DNSConfig = {
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  prefetchInterval: 30 * 1000, // 30 seconds
  maxPrefetchHosts: 10,
  minHitsForPrefetch: 3,
  enablePeriodicPrefetch: true,
  additionalHosts: [
    'api.npmjs.org',
    'registry.yarnpkg.com',
    'cdn.jsdelivr.net'
  ]
};

// DNS Cache Manager with intelligent prefetching
export class DNSCacheManager {
  private cache = new Map<string, DNSCacheEntry>();
  private prefetchQueue = new Set<string>();
  private isPrefetching = false;

  constructor(private config: DNSConfig = DEFAULT_DNS_CONFIG) {
    // Initialize prefetch hosts asynchronously (non-blocking)
    this.initializePrefetchHosts().catch(err =>
      console.warn('DNS prefetch initialization failed:', err.message)
    );
    this.startPeriodicPrefetch();
  }

  // Smart DNS resolution with caching
  async resolveWithCache(hostname: string): Promise<string[]> {
    const cached = this.cache.get(hostname);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.config.cacheTTL) {
      return cached.addresses;
    }

    try {
      // Use Bun's native DNS resolution
      const addresses = await Bun.dns.lookup(hostname);

      this.cache.set(hostname, {
        hostname,
        addresses,
        timestamp: now,
        hits: (cached?.hits || 0) + 1
      });

      return addresses;
    } catch (error) {
      console.warn(`DNS resolution failed for ${hostname}:`, error);
      // Return cached data if available, even if expired
      return cached?.addresses || [];
    }
  }

  // Aggressive prefetching for known hosts
  async prefetchHosts(hosts: string[]): Promise<void> {
    if (this.isPrefetching) return;

    this.isPrefetching = true;
    const promises = hosts.map(async (host) => {
      try {
        await Bun.dns.prefetch(host);
        this.prefetchQueue.add(host);

        // Also resolve and cache (but don't fail if this doesn't work)
        await this.resolveWithCache(host).catch(() => {
          // Silently ignore resolution failures during prefetch
        });
      } catch (error) {
        // Silently ignore prefetch failures for individual hosts
      }
    });

    await Promise.allSettled(promises);
    this.isPrefetching = false;
  }

  // Prefetch critical registry endpoints
  private async initializePrefetchHosts(): Promise<void> {
    const criticalHosts = [
      'registry.npmjs.org',
      'api.github.com',
      'bun.sh',
      'localhost', // Registry will be on localhost
    ];

    // Add any additional hosts from config
    if (this.config.additionalHosts) {
      criticalHosts.push(...this.config.additionalHosts);
    }

    // Prefetch hosts but don't fail if some don't resolve
    await this.prefetchHosts([...new Set(criticalHosts)]).catch(err => {
      console.warn('Some DNS prefetch hosts failed:', err.message);
    });
  }

  // Periodic prefetching for frequently accessed hosts
  private startPeriodicPrefetch(): void {
    if (!this.config.enablePeriodicPrefetch) return;

    setInterval(async () => {
      const hostsToPrefetch = this.getFrequentlyAccessedHosts();
      if (hostsToPrefetch.length > 0) {
        await this.prefetchHosts(hostsToPrefetch);
      }
    }, this.config.prefetchInterval);
  }

  // Get hosts that should be prefetched based on access patterns
  private getFrequentlyAccessedHosts(): string[] {
    return Array.from(this.cache.entries())
      .filter(([_, entry]) => entry.hits > this.config.minHitsForPrefetch)
      .sort((a, b) => b[1].hits - a[1].hits)
      .slice(0, this.config.maxPrefetchHosts)
      .map(([hostname]) => hostname);
  }

  // Warm up connections for critical endpoints
  async warmupConnections(): Promise<void> {
    const warmupPromises = Array.from(this.prefetchQueue).map(async (host) => {
      try {
        // Attempt a lightweight connection to warm up TCP
        const response = await fetch(`https://${host}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(1000)
        });
        return { host, success: response.ok };
      } catch {
        return { host, success: false };
      }
    });

    const results = await Promise.allSettled(warmupPromises);
    const successful = results.filter(r =>
      r.status === 'fulfilled' && r.value.success
    ).length;

    console.log(`DNS warmup: ${successful}/${results.length} connections established`);
  }

  // Get cache statistics
  getStats(): DNSCacheStats {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const avgAge = entries.length > 0 ?
      entries.reduce((sum, entry) => sum + (Date.now() - entry.timestamp), 0) / entries.length : 0;

    return {
      totalEntries: entries.length,
      totalHits,
      prefetchQueueSize: this.prefetchQueue.size,
      averageCacheAge: Math.round(avgAge / 1000), // seconds
      cacheHitRate: totalHits > 0 ? (totalHits / (totalHits + entries.length)) * 100 : 0
    };
  }

  // Clear expired entries
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [hostname, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.cacheTTL) {
        this.cache.delete(hostname);
        cleared++;
      }
    }

    return cleared;
  }
}

// Global DNS manager instance
export const dnsCacheManager = new DNSCacheManager();

// Enhanced fetch with DNS optimization
export async function fetchWithDNSCache(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const { hostname } = new URL(url);

  // Ensure DNS is prefetched for this host
  await dnsCacheManager.resolveWithCache(hostname);

  return fetch(url, {
    ...options,
    // Bun-specific DNS optimizations
    ...(process.env.NODE_ENV === 'production' && {
      keepalive: true,
      dnsPrefetch: true
    })
  });
}

// Types and interfaces
interface DNSCacheEntry {
  hostname: string;
  addresses: string[];
  timestamp: number;
  hits: number;
}

interface DNSConfig {
  cacheTTL: number; // milliseconds
  prefetchInterval: number; // milliseconds
  maxPrefetchHosts: number;
  minHitsForPrefetch: number;
  enablePeriodicPrefetch: boolean;
  additionalHosts?: string[];
}

interface DNSCacheStats {
  totalEntries: number;
  totalHits: number;
  prefetchQueueSize: number;
  averageCacheAge: number; // seconds
  cacheHitRate: number; // percentage
}