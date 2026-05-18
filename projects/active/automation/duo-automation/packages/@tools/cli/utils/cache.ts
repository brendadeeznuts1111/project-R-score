/**
 * packages/cli/utils/cache.ts
 * In-memory caching with TTL support and Bun-native persistence
 * Optimizes repeated API calls and configuration reads
 */

import type { Logger } from './logger';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttlMs: number;
  hits: number;
}

export interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  evictions: number;
  activeEntries: number;
}

export interface CacheConfig {
  maxEntries?: number;
  defaultTtlMs?: number;
  persistPath?: string;
  logger?: Logger;
}

/**
 * Cache - In-memory cache with TTL and optional persistence
 * Compliant with .clinerules Bun-native performance optimization
 */
export class Cache<T = unknown> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private stats: CacheStats = {
    totalEntries: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    activeEntries: 0
  };

  private config: Required<Omit<CacheConfig, 'logger'>> & { logger?: Logger };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 1000,
      defaultTtlMs: config.defaultTtlMs ?? 60000, // 1 minute default
      persistPath: config.persistPath ?? '',
      logger: config.logger
    };

    // Start periodic cleanup of expired entries
    this.startCleanupTask();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if entry has expired
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttlMs) {
      this.store.delete(key);
      this.stats.evictions++;
      this.stats.misses++;
      this.config.logger?.debug(`Cache entry expired: ${key}`);
      return undefined;
    }

    // Update stats
    entry.hits++;
    this.stats.hits++;
    
    this.config.logger?.debug(`Cache hit: ${key} (age: ${age}ms, hits: ${entry.hits})`);
    return entry.value;
  }

  /**
   * Set value in cache with optional TTL override
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Check size limit
    if (this.store.size >= this.config.maxEntries && !this.store.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttlMs: ttlMs ?? this.config.defaultTtlMs,
      hits: 0
    };

    this.store.set(key, entry);
    this.stats.totalEntries++;
    
    this.config.logger?.debug(`Cache set: ${key} (TTL: ${entry.ttlMs}ms)`);
  }

  /**
   * Get or compute value (compute-on-miss pattern)
   */
  async getOrCompute(
    key: string,
    compute: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const value = await compute();
      this.set(key, value, ttlMs);
      return value;
    } catch (error) {
      this.config.logger?.error(`Failed to compute cache value for ${key}`, { error });
      throw error;
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttlMs) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.store.delete(key);
    if (deleted) {
      this.stats.evictions++;
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.store.size;
    this.store.clear();
    this.stats.evictions += size;
    this.config.logger?.info(`Cache cleared (${size} entries removed)`);
  }

  /**
   * Get list of all keys
   */
  keys(): string[] {
    return Array.from(this.store.keys()).filter(key => this.has(key));
  }

  /**
   * Get list of expired keys
   */
  expiredKeys(): string[] {
    const expired: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttlMs) {
        expired.push(key);
      }
    }

    return expired;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const expired = this.expiredKeys();
    let cleaned = 0;

    for (const key of expired) {
      if (this.delete(key)) {
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.config.logger?.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }

    return cleaned;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      activeEntries: this.store.size
    };
  }

  /**
   * Reset statistics (keep cache data)
   */
  resetStats(): void {
    this.stats = {
      totalEntries: this.stats.totalEntries,
      hits: 0,
      misses: 0,
      evictions: 0,
      activeEntries: this.store.size
    };
  }

  /**
   * Get cache hit rate percentage
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return (this.stats.hits / total) * 100;
  }

  /**
   * Persist cache to file (Bun-native)
   */
  async persist(): Promise<void> {
    if (!this.config.persistPath) {
      return; // Persistence disabled
    }

    try {
      const data = this.serialize();
      await Bun.write(this.config.persistPath, JSON.stringify(data));
      this.config.logger?.debug(`Cache persisted to ${this.config.persistPath}`);
    } catch (error) {
      this.config.logger?.error(`Failed to persist cache: ${error}`);
    }
  }

  /**
   * Load cache from file (Bun-native)
   */
  async YAML.parse(): Promise<void> {
    if (!this.config.persistPath) {
      return; // Persistence disabled
    }

    try {
      const file = Bun.file(this.config.persistPath);
      const exists = await file.exists?.();
      
      if (!exists) {
        this.config.logger?.debug(`Cache file not found: ${this.config.persistPath}`);
        return;
      }

      const json = await file.json();
      this.deserialize(json);
      this.config.logger?.debug(`Cache loaded from ${this.config.persistPath}`);
    } catch (error) {
      this.config.logger?.error(`Failed to load cache: ${error}`);
    }
  }

  /**
   * Serialize cache to JSON-compatible format
   */
  private serialize(): Record<string, unknown> {
    const entries: Record<string, unknown> = {};

    for (const [key, entry] of this.store.entries()) {
      entries[key] = {
        value: entry.value,
        timestamp: entry.timestamp,
        ttlMs: entry.ttlMs
      };
    }

    return {
      entries,
      version: '1.0',
      timestamp: Date.now()
    };
  }

  /**
   * Deserialize cache from JSON format
   */
  private deserialize(data: unknown): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid cache data format');
    }

    const obj = data as Record<string, unknown>;
    const entries = obj.entries as Record<string, Record<string, unknown>>;

    if (!entries || typeof entries !== 'object') {
      throw new Error('Missing or invalid entries in cache data');
    }

    for (const [key, entry] of Object.entries(entries)) {
      if (entry && typeof entry === 'object') {
        const castedEntry = entry as Record<string, unknown>;
        
        if (castedEntry.value !== undefined && typeof castedEntry.timestamp === 'number') {
          this.store.set(key, {
            value: castedEntry.value as T,
            timestamp: castedEntry.timestamp,
            ttlMs: (castedEntry.ttlMs as number) ?? this.config.defaultTtlMs,
            hits: 0
          });
        }
      }
    }

    this.config.logger?.debug(`Cache deserialized: ${this.store.size} entries loaded`);
  }

  /**
   * Evict oldest (least recently used) entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.store.delete(oldestKey);
      this.stats.evictions++;
      this.config.logger?.debug(`Cache eviction: removed oldest entry (${oldestKey})`);
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupTask(): void {
    // Run cleanup every 30 seconds (can be adjusted)
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 30000) as unknown as NodeJS.Timeout;

    // Unref timer so it doesn't prevent process exit
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop cleanup task
   */
  stopCleanupTask(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanupTask();
    this.clear();
  }
}

/**
 * Global cache instance
 */
let globalCache: Cache;

export function getGlobalCache(): Cache {
  if (!globalCache) {
    globalCache = new Cache();
  }
  return globalCache;
}

export function setGlobalCache(cache: Cache): void {
  globalCache = cache;
}

export function resetGlobalCache(): void {
  globalCache = new Cache();
}