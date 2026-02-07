/**
 * Enhanced Cache Manager with TTL, LRU, and advanced features
 * This could replace the manual Map management in MCPWikiGenerator
 */

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  enableMetrics?: boolean;
  cleanupInterval?: number;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
}

export class AdvancedCacheManager<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  private metrics: CacheMetrics = { hits: 0, misses: 0, size: 0, hitRate: 0, evictions: 0 };
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(private options: CacheOptions = {}) {
    this.options = {
      maxSize: 1000,
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      enableMetrics: true,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      ...options
    };

    if (this.options.cleanupInterval && this.options.cleanupInterval > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * Set a value in the cache with optional TTL
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      ttl: ttl || this.options.defaultTTL,
      accessCount: 0,
      lastAccessed: now
    };

    // Check if we need to evict (LRU)
    if (this.cache.size >= this.options.maxSize! && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    this.updateMetrics();
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.options.enableMetrics) this.metrics.misses++;
      return undefined;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.delete(key);
      if (this.options.enableMetrics) this.metrics.misses++;
      return undefined;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.accessOrder.set(key, ++this.accessCounter);
    
    if (this.options.enableMetrics) this.metrics.hits++;
    return entry.value;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    this.accessOrder.delete(key);
    const deleted = this.cache.delete(key);
    this.updateMetrics();
    return deleted;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
    this.metrics = { hits: 0, misses: 0, size: 0, hitRate: 0, evictions: 0 };
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values in the cache (excluding expired entries)
   */
  values(): T[] {
    const values: T[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        values.push(entry.value);
      }
    }
    return values;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Destroy the cache and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestAccess = Infinity;
    
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      if (this.options.enableMetrics) this.metrics.evictions++;
    }
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    if (!this.options.enableMetrics) return;
    
    this.metrics.size = this.cache.size;
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }
}

/**
 * Factory function for creating specialized cache instances
 */
export function createCache<T>(options?: CacheOptions): AdvancedCacheManager<T> {
  return new AdvancedCacheManager<T>(options);
}

/**
 * Template-specific cache with pre-configured options
 */
export function createTemplateCache(): AdvancedCacheManager<any> {
  return createCache({
    maxSize: 500,
    defaultTTL: 60 * 60 * 1000, // 1 hour
    enableMetrics: true,
    cleanupInterval: 10 * 60 * 1000 // 10 minutes
  });
}

/**
 * Metrics-specific cache with different configuration
 */
export function createMetricsCache(): AdvancedCacheManager<any> {
  return createCache({
    maxSize: 1000,
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    enableMetrics: true,
    cleanupInterval: 30 * 60 * 1000 // 30 minutes
  });
}
