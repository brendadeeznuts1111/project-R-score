// lib/docs/services/cache.ts — Documentation cache service

export interface CacheEntry {
  value: string;
  createdAt: Date;
  lastAccessed: Date;
  ttl?: number; // Time to live in milliseconds
  accessCount: number;
  size: number; // Size in bytes
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRatio: number;
  totalRequests: number;
  memoryUsage: number; // Estimated memory usage in bytes
  oldestEntry?: Date;
  newestEntry?: Date;
  averageTTL?: number;
}

export interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of entries
  maxMemory?: number; // Maximum memory usage in bytes
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

export class DocumentationCache {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private cleanupTimer?: Timer;

  private readonly defaultOptions: Required<CacheOptions> = {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000,
    maxMemory: 50 * 1024 * 1024, // 50MB
    cleanupInterval: 60 * 1000, // 1 minute
  };

  private options: Required<CacheOptions>;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...this.defaultOptions, ...options };

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Get value from cache with TTL support
   */
  static get(key: string): string | null {
    return this.getInstance().get(key);
  }

  /**
   * Set value in cache with optional TTL
   */
  static set(key: string, value: string, ttl?: number): void {
    this.getInstance().set(key, value, ttl);
  }

  /**
   * Check if key exists and is not expired
   */
  static has(key: string): boolean {
    return this.getInstance().has(key);
  }

  /**
   * Delete specific key from cache
   */
  static delete(key: string): boolean {
    return this.getInstance().delete(key);
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    this.getInstance().clear();
  }

  /**
   * Get cache performance statistics
   */
  static getStats(): CacheStats {
    return this.getInstance().getStats();
  }

  // Instance methods for singleton pattern
  private static instance?: DocumentationCache;

  private static getInstance(): DocumentationCache {
    if (!this.instance) {
      this.instance = new DocumentationCache();
    }
    return this.instance;
  }

  /**
   * Get value from cache with TTL support
   */
  get(key: string): string | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.createdAt.getTime() > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access information
    entry.lastAccessed = new Date();
    entry.accessCount++;

    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache with optional TTL
   */
  set(key: string, value: string, ttl?: number): void {
    const now = new Date();
    const size = this.calculateSize(value);

    // Check memory limits
    if (this.getCurrentMemoryUsage() + size > this.options.maxMemory) {
      this.evictLRU(size);
    }

    // Check size limits
    if (this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      value,
      createdAt: now,
      lastAccessed: now,
      ttl: ttl || this.options.ttl,
      accessCount: 1,
      size,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Atomic TTL check - delete if expired
    if (entry.ttl && Date.now() - entry.createdAt.getTime() > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache performance statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.hits + this.misses;

    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;
    let totalTTL = 0;
    let ttlCount = 0;

    entries.forEach(entry => {
      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
      if (!newestEntry || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }

      if (entry.ttl) {
        totalTTL += entry.ttl;
        ttlCount++;
      }
    });

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRatio: totalRequests > 0 ? this.hits / totalRequests : 0,
      totalRequests,
      memoryUsage: this.getCurrentMemoryUsage(),
      oldestEntry,
      newestEntry,
      averageTTL: ttlCount > 0 ? totalTTL / ttlCount : undefined,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && now - entry.createdAt.getTime() > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(requiredSpace?: number): void {
    // Sort entries by last accessed time
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime()
    );

    let freedSpace = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of entries) {
      keysToDelete.push(key);
      freedSpace += entry.size;

      // Stop if we've freed enough space or removed enough entries
      if (!requiredSpace || freedSpace >= requiredSpace) {
        break;
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Calculate approximate size of a string in bytes
   */
  private calculateSize(value: string): number {
    // Use Buffer.byteLength for accurate UTF-8 byte calculation
    const valueSize = Buffer.byteLength(value, 'utf8');
    // Add overhead for object properties (estimated)
    const overhead = 100;
    return valueSize + overhead;
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  /**
   * Get entries by access frequency
   */
  getEntriesByAccessCount(): Array<{ key: string; accessCount: number; lastAccessed: Date }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
      }))
      .sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Get expired entries count
   */
  getExpiredEntriesCount(): number {
    const now = Date.now();
    let count = 0;

    for (const entry of this.cache.values()) {
      if (entry.ttl && now - entry.createdAt.getTime() > entry.ttl) {
        count++;
      }
    }

    return count;
  }

  /**
   * Force cleanup and return statistics
   */
  forceCleanup(): { cleanedEntries: number; memoryFreed: number } {
    const beforeStats = this.getStats();
    this.cleanup();
    const afterStats = this.getStats();

    return {
      cleanedEntries: beforeStats.size - afterStats.size,
      memoryFreed: beforeStats.memoryUsage - afterStats.memoryUsage,
    };
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  /**
   * Export cache contents for debugging
   */
  exportContents(): Array<{ key: string; entry: CacheEntry }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry: { ...entry },
    }));
  }
}

// Create default instance
export const documentationCache = new DocumentationCache();

export default DocumentationCache;
