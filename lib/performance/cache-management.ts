/**
 * Advanced Cache Management with Eviction Policies
 *
 * Implements LRU, TTL-based, and size-limited caching with automatic cleanup
 */

// ============================================================================
// CACHE INTERFACES
// ============================================================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface CacheOptions {
  maxSize?: number; // Maximum number of entries
  maxMemorySize?: number; // Maximum memory usage in bytes
  ttl?: number; // Time to live in milliseconds
  cleanupInterval?: number; // Cleanup interval in milliseconds
  evictionPolicy?: 'lru' | 'lfu' | 'ttl' | 'size';
}

interface CacheStats {
  size: number;
  memoryUsage: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictions: number;
}

// ============================================================================
// ADVANCED CACHE IMPLEMENTATION
// ============================================================================

export class AdvancedCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = []; // For LRU
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;
  private cleanupInterval?: ReturnType<typeof setInterval>;
  private memoryUsage = 0;

  private readonly options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: 1000,
      maxMemorySize: 50 * 1024 * 1024, // 50MB default
      ttl: 5 * 60 * 1000, // 5 minutes default
      cleanupInterval: 60 * 1000, // 1 minute default
      evictionPolicy: 'lru',
      ...options,
    };

    // Start periodic cleanup
    this.startCleanupInterval();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.missCount++;
      return undefined;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);

    this.hitCount++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    const now = Date.now();
    const size = this.calculateSize(value);

    // Check if we need to evict entries
    this.ensureCapacity(size);

    // Update existing entry
    if (this.cache.has(key)) {
      const existingEntry = this.cache.get(key)!;
      this.memoryUsage -= existingEntry.size;
    }

    // Create new entry
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      size,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.memoryUsage += size;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.memoryUsage -= entry.size;
    this.removeFromAccessOrder(key);
    return this.cache.delete(key);
  }

  /**
   * Check if key exists and is not expired
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
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.memoryUsage = 0;
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      memoryUsage: this.memoryUsage,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      evictions: this.evictionCount,
    };
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Force cleanup of expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.clear();
    console.log('🗑️ Cache destroyed and resources cleaned up');
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Check if entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.options.ttl;
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    if (this.options.evictionPolicy === 'lru') {
      this.removeFromAccessOrder(key);
      this.accessOrder.push(key);
    }
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private ensureCapacity(requiredSize: number): void {
    // Evict based on size limits
    while (
      (this.options.maxSize > 0 && this.cache.size >= this.options.maxSize) ||
      (this.options.maxMemorySize > 0 &&
        this.memoryUsage + requiredSize > this.options.maxMemorySize)
    ) {
      this.evictEntry();
    }
  }

  /**
   * Evict entry based on policy
   */
  private evictEntry(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string | undefined;

    switch (this.options.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder[0];
        break;

      case 'lfu':
        keyToEvict = this.findLeastFrequentlyUsed();
        break;

      case 'ttl':
        keyToEvict = this.findOldestEntry();
        break;

      case 'size':
        keyToEvict = this.findLargestEntry();
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
      this.evictionCount++;
    }
  }

  /**
   * Find least frequently used entry
   */
  private findLeastFrequentlyUsed(): string | undefined {
    let minCount = Infinity;
    let keyToEvict: string | undefined;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < minCount) {
        minCount = entry.accessCount;
        keyToEvict = key;
      }
    }

    return keyToEvict;
  }

  /**
   * Find oldest entry
   */
  private findOldestEntry(): string | undefined {
    let oldestTime = Date.now();
    let keyToEvict: string | undefined;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        keyToEvict = key;
      }
    }

    return keyToEvict;
  }

  /**
   * Find largest entry
   */
  private findLargestEntry(): string | undefined {
    let maxSize = 0;
    let keyToEvict: string | undefined;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.size > maxSize) {
        maxSize = entry.size;
        keyToEvict = key;
      }
    }

    return keyToEvict;
  }

  /**
   * Calculate approximate size of value
   */
  private calculateSize(value: T): number {
    if (value === null || value === undefined) return 0;

    if (typeof value === 'string') {
      return value.length * 2; // UTF-16 characters
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).length * 2;
      } catch {
        return 1024; // Fallback size
      }
    }

    return 8; // Primitive types
  }

  /**
   * Start periodic cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
      }
    }, this.options.cleanupInterval);
  }
}

// ============================================================================
// CACHE FACTORY AND PRESETS
// ============================================================================

export class CacheFactory {
  /**
   * Create cache for API responses
   */
  static createApiCache(): AdvancedCache<Response> {
    return new AdvancedCache<Response>({
      maxSize: 500,
      maxMemorySize: 100 * 1024 * 1024, // 100MB
      ttl: 5 * 60 * 1000, // 5 minutes
      evictionPolicy: 'lru',
    });
  }

  /**
   * Create cache for documentation
   */
  static createDocsCache(): AdvancedCache<string> {
    return new AdvancedCache<string>({
      maxSize: 1000,
      maxMemorySize: 50 * 1024 * 1024, // 50MB
      ttl: 30 * 60 * 1000, // 30 minutes
      evictionPolicy: 'lfu',
    });
  }

  /**
   * Create cache for DNS lookups
   */
  static createDnsCache(): AdvancedCache<string> {
    return new AdvancedCache<string>({
      maxSize: 10000,
      maxMemorySize: 10 * 1024 * 1024, // 10MB
      ttl: 10 * 60 * 1000, // 10 minutes
      evictionPolicy: 'ttl',
    });
  }

  /**
   * Create small cache for frequently accessed data
   */
  static createHotCache<T>(): AdvancedCache<T> {
    return new AdvancedCache<T>({
      maxSize: 100,
      maxMemorySize: 10 * 1024 * 1024, // 10MB
      ttl: 60 * 1000, // 1 minute
      evictionPolicy: 'lru',
    });
  }
}

// ============================================================================
// CACHE MIDDLEWARE
// ============================================================================

export class CacheMiddleware {
  /**
   * Create response caching middleware
   */
  static createResponseCache(cache: AdvancedCache<Response>) {
    return (key: string, fetcher: () => Promise<Response>): Promise<Response> => {
      const cached = cache.get(key);
      if (cached) {
        return Promise.resolve(cached.clone());
      }

      return fetcher().then(response => {
        cache.set(key, response.clone());
        return response;
      });
    };
  }

  /**
   * Create data caching middleware
   */
  static createDataCache<T>(cache: AdvancedCache<T>) {
    return (key: string, fetcher: () => Promise<T>): Promise<T> => {
      const cached = cache.get(key);
      if (cached !== undefined) {
        return Promise.resolve(cached);
      }

      return fetcher().then(data => {
        cache.set(key, data);
        return data;
      });
    };
  }
}
