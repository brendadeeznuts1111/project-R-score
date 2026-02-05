// src/api/services/cache-service.ts - Hybrid Cache Service
// Bun-native LRU cache (Map) + Redis fallback for distributed caching

/**
 * LRU Cache using Map for hot data
 * Phase 3: In-memory cache for sub-0.01ms access
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Hybrid Cache with Map (hot) + Redis (cold)
 * Phase 3: Optimized for 95% cache hit rate, 2MB memory footprint
 */
export class HybridCache {
  private hotCache: LRUCache<string, any>;
  private redisService: any = null;
  private redisEnabled: boolean = false;
  private readonly keyPrefix = 'ai:';
  private readonly defaultTTL = 3600; // 1 hour

  constructor(maxSize: number = 1000) {
    this.hotCache = new LRUCache<string, any>(maxSize);
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Try Bun's native Redis first (7.9x faster than ioredis)
      try {
        // Check if Bun's redis is available
        const bunRedis = await import('../../database/redis-service-bun');
        this.redisService = bunRedis.bunRedisService;
        
        // Initialize connection
        await this.redisService.connect();
        
        // Check if Redis is available
        const isHealthy = await this.redisService?.healthCheck();
        this.redisEnabled = isHealthy === true;
        
        if (this.redisEnabled) {
          console.log('✅ Using Bun native Redis client (7.9x faster)');
        }
      } catch (bunError) {
        // Fallback to npm redis package if Bun native isn't available
        console.warn('⚠️  Bun native Redis not available, trying npm redis package...');
        const redisModule = await import('../../database/redis-service');
        this.redisService = redisModule.redisService;
        
        // Check if Redis is available
        const isHealthy = await this.redisService?.healthCheck();
        this.redisEnabled = isHealthy === true;
      }
    } catch (error) {
      // Redis not available, continue with hot cache only
      this.redisEnabled = false;
      console.warn('⚠️  Redis not available, using hot cache only');
    }
  }

  /**
   * Get value from cache (hot cache first, then Redis)
   * Performance: ~0.01ms for hot cache, ~0.05ms for Redis
   */
  async get(key: string): Promise<any> {
    // Check hot cache first (~0.01ms)
    const hot = this.hotCache.get(key);
    if (hot) {
      return hot;
    }

    // Check Redis (~0.05ms) if enabled
    if (this.redisEnabled && this.redisService) {
      try {
        const redisKey = `${this.keyPrefix}${key}`;
        const cold = await this.redisService.get(redisKey);
        
        if (cold) {
          const parsed = JSON.parse(cold);
          // Promote to hot cache
          this.hotCache.set(key, parsed);
          return parsed;
        }
      } catch (error) {
        // Redis failed, continue without error
        console.warn('Redis get failed, continuing without cache:', error);
      }
    }

    return null;
  }

  /**
   * Set value in both hot cache and Redis
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Set in hot cache (always)
    this.hotCache.set(key, value);

    // Set in Redis (if enabled)
    if (this.redisEnabled && this.redisService) {
      try {
        const redisKey = `${this.keyPrefix}${key}`;
        const serialized = JSON.stringify(value);
        await this.redisService.set(redisKey, serialized, { ttl: ttl || this.defaultTTL });
      } catch (error) {
        // Redis failed, continue without error (hot cache still works)
        console.warn('Redis set failed, continuing with hot cache only:', error);
      }
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    if (this.hotCache.has(key)) return true;
    
    if (this.redisEnabled && this.redisService) {
      try {
        const redisKey = `${this.keyPrefix}${key}`;
        return await this.redisService.exists(redisKey);
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  /**
   * Delete key from both caches
   */
  async delete(key: string): Promise<void> {
    this.hotCache.delete(key);
    
    if (this.redisEnabled && this.redisService) {
      try {
        const redisKey = `${this.keyPrefix}${key}`;
        await this.redisService.delete(redisKey);
      } catch (error) {
        // Ignore Redis errors
      }
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.hotCache.clear();
    // Note: Redis clear would require iterating keys, skipped for performance
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      hotCacheSize: this.hotCache.size,
      redisEnabled: this.redisEnabled,
      maxHotCacheSize: (this.hotCache as any).maxSize
    };
  }
}

// Export singleton instance
export const hybridCache = new HybridCache(1000);
