#!/usr/bin/env bun

/**
 * 💾 Advanced Cache Management System
 * 
 * Intelligent caching with versioning, invalidation, and performance optimization
 */

import { CacheError, handleError } from './error-handling';

/**
 * Cache entry interface
 */
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  tags: string[];
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  enableStats: boolean;
  enableCompression: boolean;
}

/**
 * Cache invalidation strategy
 */
export enum InvalidationStrategy {
  TTL = 'ttl',
  LRU = 'lru',
  LFU = 'lfu',
  MANUAL = 'manual'
}

/**
 * Advanced cache manager
 */
export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private stats: CacheStats = {
    totalEntries: 0,
    hitCount: 0,
    missCount: 0,
    hitRate: 0,
    memoryUsage: 0,
    oldestEntry: 0,
    newestEntry: 0
  };
  
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private version: string = '1.0.0';

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 300000, // 5 minutes
      cleanupInterval: 60000, // 1 minute
      enableStats: true,
      enableCompression: false,
      ...config
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.updateMissStats();
        return null;
      }

      // Check TTL
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.updateTagIndex(key, entry.tags, false);
        this.updateMissStats();
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      this.updateHitStats();
      return entry.data as T;

    } catch (error) {
      handleError(error, 'CacheManager.get', 'medium');
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T = any>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      tags?: string[];
      version?: string;
    } = {}
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.config.defaultTTL;
      const tags = options.tags || [];
      const version = options.version || this.version;

      // Check if we need to evict entries
      if (this.cache.size >= this.config.maxSize) {
        this.evictEntries();
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version,
        tags,
        accessCount: 0,
        lastAccessed: Date.now()
      };

      this.cache.set(key, entry);
      this.updateTagIndex(key, tags, true);
      this.updateStats();

    } catch (error) {
      handleError(error, 'CacheManager.set', 'medium');
    }
  }

  /**
   * Delete entry from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        return false;
      }

      this.cache.delete(key);
      this.updateTagIndex(key, entry.tags, false);
      this.updateStats();
      return true;

    } catch (error) {
      handleError(error, 'CacheManager.delete', 'medium');
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      this.cache.clear();
      this.tagIndex.clear();
      this.resetStats();
    } catch (error) {
      handleError(error, 'CacheManager.clear', 'medium');
    }
  }

  /**
   * Invalidate entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let invalidated = 0;
      const keysToDelete = new Set<string>();

      for (const tag of tags) {
        const taggedKeys = this.tagIndex.get(tag);
        if (taggedKeys) {
          for (const key of taggedKeys) {
            keysToDelete.add(key);
          }
        }
      }

      for (const key of keysToDelete) {
        if (await this.delete(key)) {
          invalidated++;
        }
      }

      return invalidated;

    } catch (error) {
      handleError(error, 'CacheManager.invalidateByTags', 'medium');
      return 0;
    }
  }

  /**
   * Invalidate entries by pattern
   */
  async invalidateByPattern(pattern: RegExp): Promise<number> {
    try {
      let invalidated = 0;
      const keysToDelete: string[] = [];

      for (const [key] of this.cache) {
        if (pattern.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        if (await this.delete(key)) {
          invalidated++;
        }
      }

      return invalidated;

    } catch (error) {
      handleError(error, 'CacheManager.invalidateByPattern', 'medium');
      return 0;
    }
  }

  /**
   * Get or set pattern (get-then-set if not exists)
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
      version?: string;
    } = {}
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Generate new value
      const value = await factory();
      
      // Store in cache
      await this.set(key, value, options);
      
      return value;

    } catch (error) {
      handleError(error, 'CacheManager.getOrSet', 'medium');
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache entries information
   */
  getEntriesInfo(): Array<{ key: string; entry: CacheEntry }> {
    const entries: Array<{ key: string; entry: CacheEntry }> = [];
    
    for (const [key, entry] of this.cache) {
      entries.push({ key, entry: { ...entry } });
    }
    
    return entries;
  }

  /**
   * Check if entry exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        return false;
      }

      if (this.isExpired(entry)) {
        await this.delete(key);
        return false;
      }

      return true;

    } catch (error) {
      handleError(error, 'CacheManager.has', 'medium');
      return false;
    }
  }

  /**
   * Warm up cache with multiple entries
   */
  async warmUp<T = any>(
    entries: Array<{
      key: string;
      factory: () => Promise<T>;
      options?: { ttl?: number; tags?: string[]; version?: string };
    }>
  ): Promise<void> {
    try {
      const promises = entries.map(async ({ key, factory, options }) => {
        try {
          const value = await factory();
          await this.set(key, value, options);
        } catch (error) {
          // Continue with other entries even if one fails
          handleError(error, `CacheManager.warmUp.${key}`, 'low');
        }
      });

      await Promise.allSettled(promises);

    } catch (error) {
      handleError(error, 'CacheManager.warmUp', 'medium');
    }
  }

  /**
   * Export cache data (for persistence)
   */
  async export(): Promise<{ entries: Array<{ key: string; entry: CacheEntry }>; version: string }> {
    try {
      const entries = this.getEntriesInfo();
      return { entries, version: this.version };
    } catch (error) {
      handleError(error, 'CacheManager.export', 'medium');
      return { entries: [], version: this.version };
    }
  }

  /**
   * Import cache data (for restoration)
   */
  async import(data: { entries: Array<{ key: string; entry: CacheEntry }>; version: string }): Promise<void> {
    try {
      await this.clear();
      
      for (const { key, entry } of data.entries) {
        if (!this.isExpired(entry)) {
          this.cache.set(key, entry);
          this.updateTagIndex(key, entry.tags, true);
        }
      }
      
      this.version = data.version;
      this.updateStats();

    } catch (error) {
      handleError(error, 'CacheManager.import', 'medium');
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict entries based on strategy
   */
  private evictEntries(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by last accessed time (LRU)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Evict oldest 25% of entries
    const evictCount = Math.floor(this.config.maxSize * 0.25);
    
    for (let i = 0; i < evictCount && i < entries.length; i++) {
      const [key, entry] = entries[i];
      this.cache.delete(key);
      this.updateTagIndex(key, entry.tags, false);
    }
  }

  /**
   * Update tag index
   */
  private updateTagIndex(key: string, tags: string[], add: boolean): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      
      const taggedKeys = this.tagIndex.get(tag)!;
      
      if (add) {
        taggedKeys.add(key);
      } else {
        taggedKeys.delete(key);
        
        // Clean up empty tag sets
        if (taggedKeys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    if (!this.config.enableStats) return;

    this.stats.totalEntries = this.cache.size;
    
    // Calculate memory usage (rough estimate)
    this.stats.memoryUsage = this.cache.size * 1024; // Estimate 1KB per entry
    
    // Find oldest and newest entries
    let oldest = Date.now();
    let newest = 0;
    
    for (const entry of this.cache.values()) {
      oldest = Math.min(oldest, entry.timestamp);
      newest = Math.max(newest, entry.timestamp);
    }
    
    this.stats.oldestEntry = oldest;
    this.stats.newestEntry = newest;
  }

  /**
   * Update hit statistics
   */
  private updateHitStats(): void {
    if (!this.config.enableStats) return;
    
    this.stats.hitCount++;
    this.stats.hitRate = this.stats.hitCount / (this.stats.hitCount + this.stats.missCount);
  }

  /**
   * Update miss statistics
   */
  private updateMissStats(): void {
    if (!this.config.enableStats) return;
    
    this.stats.missCount++;
    this.stats.hitRate = this.stats.hitCount / (this.stats.hitCount + this.stats.missCount);
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      totalEntries: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      memoryUsage: 0,
      oldestEntry: 0,
      newestEntry: 0
    };
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(key);
    }
  }

  /**
   * Destroy cache manager
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cache.clear();
    this.tagIndex.clear();
  }
}

/**
 * Global cache instance
 */
export const globalCache = new CacheManager({
  maxSize: 500,
  defaultTTL: 300000, // 5 minutes
  cleanupInterval: 60000, // 1 minute
  enableStats: true,
  enableCompression: false
});

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  options: {
    ttl?: number;
    tags?: string[];
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>) {
      const key = options.keyGenerator 
        ? options.keyGenerator(...args)
        : `${target.constructor.name}.${propertyName}.${JSON.stringify(args)}`;

      return globalCache.getOrSet(
        key,
        () => method.apply(this, args),
        {
          ttl: options.ttl,
          tags: options.tags
        }
      );
    };

    return descriptor;
  };
}
