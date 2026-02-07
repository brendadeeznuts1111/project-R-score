/**
 * Cached Cloudflare Client
 *
 * Enhances the unified Cloudflare client with:
 * - Intelligent caching layer
 * - Request deduplication
 * - Batch operations
 * - Cache warming
 * - Invalidation strategies
 */

import { unifiedCloudflare, UnifiedCloudflareService } from './unified-client';
import type { CFZone, CFDNSRecord } from './client';

// ==================== Cache Types ====================

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
  etag?: string;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export type CacheStrategy = 'lru' | 'ttl' | 'etags';
export type InvalidationPattern = string | RegExp | ((key: string) => boolean);

export interface CachedClientConfig {
  enabled: boolean;
  defaultTtl: number; // milliseconds
  maxSize: number;
  strategy: CacheStrategy;
  warmOnStart: boolean;
  deduplicateRequests: boolean;
}

export const DEFAULT_CACHE_CONFIG: CachedClientConfig = {
  enabled: true,
  defaultTtl: 60000, // 1 minute
  maxSize: 1000,
  strategy: 'lru',
  warmOnStart: false,
  deduplicateRequests: true,
};

// ==================== Cache Implementation ====================

class ResponseCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats = { hits: 0, misses: 0, evictions: 0 };
  private config: CachedClientConfig;

  constructor(config: Partial<CachedClientConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  get<T>(key: string): T | undefined {
    if (!this.config.enabled) return undefined;

    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update hit count for LRU
    entry.hits++;
    this.stats.hits++;

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl?: number, etag?: string): void {
    if (!this.config.enabled) return;

    // Evict oldest if at capacity (LRU)
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      createdAt: now,
      expiresAt: now + (ttl || this.config.defaultTtl),
      etag,
      hits: 1,
    });
  }

  has(key: string): boolean {
    if (!this.config.enabled) return false;

    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidate(pattern: InvalidationPattern): number {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (typeof pattern === 'string') {
        if (key.startsWith(pattern) || key === pattern) {
          keysToDelete.push(key);
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(key)) {
          keysToDelete.push(key);
        }
      } else if (typeof pattern === 'function') {
        if (pattern(key)) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      size: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
    };
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < oldestHits) {
        oldestHits = entry.hits;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }
}

// ==================== Request Deduplication ====================

class RequestDeduplicator {
  private pending = new Map<string, Promise<unknown>>();

  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  isPending(key: string): boolean {
    return this.pending.has(key);
  }

  cancel(key: string): boolean {
    return this.pending.delete(key);
  }
}

// ==================== Cached Cloudflare Client ====================

export class CachedCloudflareClient {
  private cache: ResponseCache;
  private deduplicator: RequestDeduplicator;
  private service: UnifiedCloudflareService;

  constructor(
    service: UnifiedCloudflareService = unifiedCloudflare,
    cacheConfig: Partial<CachedClientConfig> = {}
  ) {
    this.service = service;
    this.cache = new ResponseCache(cacheConfig);
    this.deduplicator = new RequestDeduplicator();
  }

  // ==================== Cached Domain Operations ====================

  async listZones(forceRefresh = false): Promise<CFZone[]> {
    const cacheKey = 'zones:all';

    if (!forceRefresh) {
      const cached = this.cache.get<CFZone[]>(cacheKey);
      if (cached) return cached;
    }

    const zones = await this.deduplicator.dedupe(cacheKey, () => this.service.listZones());

    this.cache.set(cacheKey, zones, 30000); // 30s TTL
    return zones;
  }

  async getZone(zoneId: string, forceRefresh = false): Promise<CFZone | null> {
    const cacheKey = `zone:${zoneId}`;

    if (!forceRefresh) {
      const cached = this.cache.get<CFZone>(cacheKey);
      if (cached) return cached;
    }

    const zones = await this.listZones();
    const zone = zones.find(z => z.id === zoneId) || null;

    if (zone) {
      this.cache.set(cacheKey, zone, 60000); // 1m TTL
    }

    return zone;
  }

  async findZoneByName(name: string, forceRefresh = false): Promise<CFZone | null> {
    const cacheKey = `zone:name:${name}`;

    if (!forceRefresh) {
      const cached = this.cache.get<CFZone>(cacheKey);
      if (cached) return cached;
    }

    const zones = await this.listZones();
    const zone = zones.find(z => z.name === name) || null;

    if (zone) {
      this.cache.set(cacheKey, zone, 60000);
      // Also cache by ID
      this.cache.set(`zone:${zone.id}`, zone, 60000);
    }

    return zone;
  }

  async listDNSRecords(zoneId: string, forceRefresh = false): Promise<CFDNSRecord[]> {
    const cacheKey = `dns:${zoneId}:all`;

    if (!forceRefresh) {
      const cached = this.cache.get<CFDNSRecord[]>(cacheKey);
      if (cached) return cached;
    }

    const records = await this.deduplicator.dedupe(cacheKey, () =>
      this.service.listDNSRecords(zoneId)
    );

    this.cache.set(cacheKey, records, 60000); // 1m TTL
    return records;
  }

  async findDNSRecord(zoneId: string, name: string, type?: string): Promise<CFDNSRecord | null> {
    const records = await this.listDNSRecords(zoneId);
    return records.find(r => r.name === name && (type ? r.type === type : true)) || null;
  }

  // ==================== Cached R2 Operations ====================

  async listR2Objects(
    prefix?: string,
    forceRefresh = false
  ): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    const cacheKey = `r2:list:${prefix || 'all'}`;

    if (!forceRefresh) {
      const cached =
        this.cache.get<Array<{ key: string; size: number; lastModified: Date }>>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.deduplicator.dedupe(cacheKey, () =>
      this.service.listR2Objects({ prefix })
    );

    const objects = result.objects.map(o => ({
      key: o.key,
      size: o.size,
      lastModified: o.lastModified,
    }));

    this.cache.set(cacheKey, objects, 15000); // 15s TTL for R2
    return objects;
  }

  async getR2Object(key: string): Promise<Response | null> {
    // Don't cache R2 object contents, just metadata
    return this.service.downloadFromR2(key);
  }

  // ==================== Batch Operations ====================

  async batchGetZones(zoneIds: string[]): Promise<Map<string, CFZone | null>> {
    const results = new Map<string, CFZone | null>();
    const toFetch: string[] = [];

    // Check cache first
    for (const id of zoneIds) {
      const cached = this.cache.get<CFZone>(`zone:${id}`);
      if (cached) {
        results.set(id, cached);
      } else {
        toFetch.push(id);
      }
    }

    // Fetch remaining in parallel
    if (toFetch.length > 0) {
      const zones = await this.listZones();
      for (const id of toFetch) {
        const zone = zones.find(z => z.id === id) || null;
        results.set(id, zone);
        if (zone) {
          this.cache.set(`zone:${id}`, zone, 60000);
        }
      }
    }

    return results;
  }

  async batchGetDNSRecords(
    requests: Array<{ zoneId: string; name?: string; type?: string }>
  ): Promise<Map<string, CFDNSRecord[]>> {
    const results = new Map<string, CFDNSRecord[]>();

    // Group by zoneId for efficiency
    const byZone = new Map<string, Array<{ name?: string; type?: string }>>();
    for (const req of requests) {
      const existing = byZone.get(req.zoneId) || [];
      existing.push({ name: req.name, type: req.type });
      byZone.set(req.zoneId, existing);
    }

    // Fetch for each zone
    for (const [zoneId, filters] of byZone.entries()) {
      const records = await this.listDNSRecords(zoneId);

      for (const filter of filters) {
        const cacheKey = `dns:${zoneId}:${filter.name || 'all'}:${filter.type || 'all'}`;
        const filtered = records.filter(
          r =>
            (filter.name ? r.name === filter.name : true) &&
            (filter.type ? r.type === filter.type : true)
        );

        results.set(cacheKey, filtered);
        this.cache.set(cacheKey, filtered, 60000);
      }
    }

    return results;
  }

  // ==================== Cache Management ====================

  invalidateZones(): number {
    return this.cache.invalidate('zones:');
  }

  invalidateZone(zoneId: string): number {
    this.cache.invalidate(`zone:${zoneId}`);
    return this.cache.invalidate(`dns:${zoneId}:`);
  }

  invalidateDNS(zoneId?: string): number {
    if (zoneId) {
      return this.cache.invalidate(`dns:${zoneId}:`);
    }
    return this.cache.invalidate('dns:');
  }

  invalidateR2(): number {
    return this.cache.invalidate('r2:');
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  // ==================== Cache Warming ====================

  async warmCache(): Promise<{ zones: number; dnsRecords: number }> {
    const stats = { zones: 0, dnsRecords: 0 };

    try {
      // Warm zones
      const zones = await this.listZones(true); // force refresh
      stats.zones = zones.length;

      // Warm DNS records for each zone
      for (const zone of zones.slice(0, 5)) {
        // Limit to first 5 zones
        try {
          const records = await this.listDNSRecords(zone.id, true);
          stats.dnsRecords += records.length;
        } catch (err) {
          console.warn(`Failed to warm DNS cache for zone ${zone.id}:`, err);
        }
      }
    } catch (err) {
      console.warn('Failed to warm cache:', err);
    }

    return stats;
  }

  // ==================== Stats & Monitoring ====================

  getStats(): {
    cache: CacheStats;
    pendingRequests: number;
  } {
    return {
      cache: this.cache.getStats(),
      pendingRequests: this.cache.keys().length, // Approximation
    };
  }

  printStats(): void {
    const stats = this.getStats();
    console.log('\n📊 Cached Cloudflare Client Stats');
    console.log('═══════════════════════════════════════');
    console.log(`Cache Hit Rate:    ${stats.cache.hitRate.toFixed(1)}%`);
    console.log(`Cache Hits:        ${stats.cache.hits}`);
    console.log(`Cache Misses:      ${stats.cache.misses}`);
    console.log(`Cache Size:        ${stats.cache.size} entries`);
    console.log(`Cache Evictions:   ${stats.cache.evictions}`);
    console.log('═══════════════════════════════════════\n');
  }
}

// ==================== Singleton Instance ====================

export const cachedCloudflare = new CachedCloudflareClient();

export default CachedCloudflareClient;
