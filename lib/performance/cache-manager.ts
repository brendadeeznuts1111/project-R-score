#!/usr/bin/env bun

/**
 * ⚡ Cache Manager
 *
 * High-performance caching system with LRU eviction, TTL support,
 * and comprehensive monitoring capabilities.
 */

import { ConcurrencyManagers } from '../core/safe-concurrency';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  currentSize: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
}

interface CacheOptions {
  maxSize?: number;
  defaultTtl?: number;
  maxSizeBytes?: number;
  cleanupInterval?: number;
  enableMetrics?: boolean;
}

export class CacheManager<K = string, V = any> {
  private cache = new Map<K, CacheEntry<V>>();
  private accessOrder: K[] = [];
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    currentSize: 0,
    maxSize: 0,
    hitRate: 0,
    memoryUsage: 0,
  };

  private options: Required<CacheOptions>;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private currentMemoryUsage = 0;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 1000,
      defaultTtl: options.defaultTtl ?? 300000, // 5 minutes
      maxSizeBytes: options.maxSizeBytes ?? 100 * 1024 * 1024, // 100MB
      cleanupInterval: options.cleanupInterval ?? 60000, // 1 minute
      enableMetrics: options.enableMetrics ?? true,
    };

    this.stats.maxSize = this.options.maxSize;

    if (this.options.cleanupInterval > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * Get value from cache
   */
  async get(key: K): Promise<V | undefined> {
    return await ConcurrencyManagers.fileOperations.withLock(async () => {
      const entry = this.cache.get(key);

      if (!entry) {
        if (this.options.enableMetrics) {
          this.stats.misses++;
          this.updateHitRate();
        }
        return undefined;
      }

      // Check TTL
      if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.updateMemoryUsage(-entry.size);

        if (this.options.enableMetrics) {
          this.stats.misses++;
          this.stats.evictions++;
          this.updateHitRate();
        }
        return undefined;
      }

      // Update access information
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.updateAccessOrder(key);

      if (this.options.enableMetrics) {
        this.stats.hits++;
        this.updateHitRate();
      }

      return entry.value;
    });
  }

  /**
   * Set value in cache
   */
  async set(key: K, value: V, ttl?: number): Promise<void> {
    return await ConcurrencyManagers.fileOperations.withLock(async () => {
      const size = this.calculateSize(value);
      const now = Date.now();

      // Check if we need to evict entries
      await this.ensureCapacity(size);

      const entry: CacheEntry<V> = {
        value,
        timestamp: now,
        ttl: ttl ?? this.options.defaultTtl,
        accessCount: 1,
        lastAccessed: now,
        size,
      };

      // Remove old entry if exists
      const oldEntry = this.cache.get(key);
      if (oldEntry) {
        this.updateMemoryUsage(-oldEntry.size);
        this.removeFromAccessOrder(key);
      }

      this.cache.set(key, entry);
      this.updateAccessOrder(key);
      this.updateMemoryUsage(size);

      if (this.options.enableMetrics) {
        this.stats.sets++;
      }
    });
  }

  /**
   * Delete value from cache
   */
  async delete(key: K): Promise<boolean> {
    return await ConcurrencyManagers.fileOperations.withLock(async () => {
      const entry = this.cache.get(key);
      if (!entry) {
        return false;
      }

      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.updateMemoryUsage(-entry.size);

      if (this.options.enableMetrics) {
        this.stats.deletes++;
      }

      return true;
    });
  }

  /**
   * Check if key exists in cache
   */
  async has(key: K): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    return await ConcurrencyManagers.fileOperations.withLock(async () => {
      this.cache.clear();
      this.accessOrder = [];
      this.currentMemoryUsage = 0;

      if (this.options.enableMetrics) {
        this.stats.currentSize = 0;
        this.stats.memoryUsage = 0;
      }
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache keys
   */
  getKeys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size (number of entries)
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get memory usage in bytes
   */
  getMemoryUsage(): number {
    return this.currentMemoryUsage;
  }

  /**
   * Force cleanup of expired entries
   */
  async cleanup(): Promise<number> {
    return await ConcurrencyManagers.fileOperations.withLock(async () => {
      const now = Date.now();
      const expiredKeys: K[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (entry.ttl && now - entry.timestamp > entry.ttl) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        const entry = this.cache.get(key)!;
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.updateMemoryUsage(-entry.size);

        if (this.options.enableMetrics) {
          this.stats.evictions++;
        }
      }

      return expiredKeys.length;
    });
  }

  /**
   * Get detailed information about cache entries
   */
  getCacheInfo(): Array<{
    key: K;
    size: number;
    accessCount: number;
    age: number;
    ttl?: number;
    remainingTtl?: number;
  }> {
    const now = Date.now();

    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      size: entry.size,
      accessCount: entry.accessCount,
      age: now - entry.timestamp,
      ttl: entry.ttl,
      remainingTtl: entry.ttl ? Math.max(0, entry.ttl - (now - entry.timestamp)) : undefined,
    }));
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private async ensureCapacity(requiredSize: number): Promise<void> {
    // Check memory limit
    while (
      this.currentMemoryUsage + requiredSize > this.options.maxSizeBytes &&
      this.cache.size > 0
    ) {
      await this.evictLRU();
    }

    // Check entry count limit
    while (this.cache.size >= this.options.maxSize && this.cache.size > 0) {
      await this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  private async evictLRU(): Promise<void> {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder[0];
    const entry = this.cache.get(lruKey);

    if (entry) {
      this.cache.delete(lruKey);
      this.updateMemoryUsage(-entry.size);

      if (this.options.enableMetrics) {
        this.stats.evictions++;
      }
    }

    this.accessOrder.shift();
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: K): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Update memory usage
   */
  private updateMemoryUsage(delta: number): void {
    this.currentMemoryUsage += delta;
    if (this.options.enableMetrics) {
      this.stats.currentSize = this.cache.size;
      this.stats.memoryUsage = this.currentMemoryUsage;
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Calculate approximate size of value
   */
  private calculateSize(value: V): number {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    } else if (typeof value === 'number') {
      return 8; // 64-bit number
    } else if (typeof value === 'boolean') {
      return 4;
    } else if (value === null || value === undefined) {
      return 0;
    } else if (typeof value === 'object') {
      return JSON.stringify(value).length * 2;
    } else {
      return 64; // Default estimate
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(console.error);
    }, this.options.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  async destroy(): Promise<void> {
    this.stop();
    await this.clear();
  }
}

// Global cache instances for common use cases
export const globalCaches = {
  secrets: new CacheManager<string, any>({
    maxSize: 500,
    defaultTtl: 300000, // 5 minutes
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
  }),
  config: new CacheManager<string, any>({
    maxSize: 100,
    defaultTtl: 600000, // 10 minutes
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  }),
  apiResponses: new CacheManager<string, any>({
    maxSize: 1000,
    defaultTtl: 60000, // 1 minute
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
  }),
};
