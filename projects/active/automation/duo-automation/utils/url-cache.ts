// utils/url-cache.ts - Caching pattern for URL performance

export interface CacheEntry<T> {
  value: T;
  expiry: number;
  hits: number;
  lastAccessed: number;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export class URLCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 1000,
      cleanupInterval: 60 * 1000, // 1 minute cleanup
      ...config
    };

    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.expiry < now) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = now;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiry = now + (ttl || this.config.ttl);

    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      value,
      expiry,
      hits: 0,
      lastAccessed: now
    });
  }

  /**
   * Get or set value using factory function
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get or set value using synchronous factory function
   */
  getOrSetSync<T>(key: string, factory: () => T, ttl?: number): T {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let totalHits = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        expiredEntries++;
      } else {
        validEntries++;
        totalHits += entry.hits;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      totalHits,
      hitRate: validEntries > 0 ? totalHits / validEntries : 0,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }
}

/**
 * Cached URL helper with performance optimization
 */
export class CachedURLHelper {
  private static cache = new URLCache({
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 500,
    cleanupInterval: 5 * 60 * 1000 // 5 minutes
  });

  /**
   * Get registry URL with caching
   */
  static getRegistryUrl(packageName: string, version?: string): string {
    const key = `registry:${packageName}:${version || 'latest'}`;
    
    return this.cache.getOrSetSync(key, () => {
      return version 
        ? `https://registry.factory-wager.com/@duoplus/${packageName}/${version}`
        : `https://registry.factory-wager.com/@duoplus/${packageName}`;
    });
  }

  /**
   * Get search URL with caching
   */
  static getSearchUrl(query: string): string {
    const key = `search:${encodeURIComponent(query)}`;
    
    return this.cache.getOrSetSync(key, () => {
      return `https://registry.factory-wager.com/-/v1/search?text=${encodeURIComponent(query)}`;
    });
  }

  /**
   * Get package URLs with caching
   */
  static getPackageUrls(packageName: string, version: string) {
    const key = `package:${packageName}:${version}`;
    
    return this.cache.getOrSetSync(key, () => {
      const filename = `${packageName}-${version}.tgz`;
      return {
        metadata: this.getRegistryUrl(packageName, version),
        download: `https://registry.factory-wager.com/@duoplus/${packageName}/-/${filename}`,
        latest: this.getRegistryUrl(packageName),
        search: this.getSearchUrl(packageName)
      };
    });
  }

  /**
   * Get API URL with caching
   */
  static getApiUrl(endpoint: string, version: string = 'v1', baseUrl?: string): string {
    const base = baseUrl || 'http://localhost:3000';
    const key = `api:${base}:${version}:${endpoint}`;
    
    return this.cache.getOrSetSync(key, () => {
      return `${base}/api/${version}/${endpoint}`;
    });
  }

  /**
   * Get WebSocket URL with caching
   */
  static getWebSocketUrl(service: string, environment: string = 'development'): string {
    const key = `ws:${environment}:${service}`;
    
    return this.cache.getOrSetSync(key, () => {
      const baseUrl = environment === 'production' ? 'wss://api.duoplus.com' : 'ws://localhost:3000';
      return `${baseUrl}/${service}`;
    });
  }

  /**
   * Get database URL with caching
   */
  static getDatabaseUrl(type: 'postgres' | 'redis', environment: string = 'development'): string {
    const key = `db:${environment}:${type}`;
    
    return this.cache.getOrSetSync(key, () => {
      switch (environment) {
        case 'production':
          return type === 'postgres' 
            ? 'postgresql://username:password@prod-db:5432/duoplus'
            : 'redis://prod-redis:6379';
        case 'staging':
          return type === 'postgres'
            ? 'postgresql://staging:password@staging-db:5432/duoplus'
            : 'redis://staging-redis:6379';
        default:
          return type === 'postgres'
            ? 'postgresql://localhost:5432/duoplus'
            : 'redis://localhost:6379';
      }
    });
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Warm up cache with common URLs
   */
  static async warmupCache(): Promise<void> {
    const commonPackages = ['core', 'disputes', 'monitoring'];
    const commonVersion = '1.0.0';

    // Pre-load common package URLs
    for (const pkg of commonPackages) {
      this.getRegistryUrl(pkg);
      this.getRegistryUrl(pkg, commonVersion);
      this.getPackageUrls(pkg, commonVersion);
    }

    // Pre-load common search URLs
    this.getSearchUrl('@duoplus/core');
    this.getSearchUrl('@duoplus/disputes');

    // Pre-load common API URLs
    this.getApiUrl('health');
    this.getApiUrl('metrics');
    this.getApiUrl('status');
  }
}

/**
 * Global cache instance for direct access
 */
export const urlCache = new URLCache();
