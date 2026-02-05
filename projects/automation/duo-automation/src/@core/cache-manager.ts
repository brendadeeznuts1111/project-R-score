export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
  metadata?: Record<string, any>;
}

export class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    memorySize: 0
  };

  constructor(
    private readonly options: {
      defaultTTL: number; // ms
      maxMemoryEntries: number;
      cleanupInterval: number;
      enableRedis?: boolean;
      redisUrl?: string;
      enableR2?: boolean;
      r2Bucket?: string;
    } = {
      defaultTTL: 3600000, // 1 hour
      maxMemoryEntries: 10000,
      cleanupInterval: 60000, // 1 minute
    }
  ) {
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.options.cleanupInterval);
  }

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const entry = this.memoryCache.get(key);
    
    if (entry) {
      if (Date.now() - entry.timestamp < entry.ttl) {
        entry.hits++;
        this.stats.hits++;
        return entry.value;
      } else {
        // Expired, remove it
        this.memoryCache.delete(key);
        this.stats.evictions++;
      }
    }

    this.stats.misses++;
    
    // Try Redis if enabled
    if (this.options.enableRedis) {
      try {
        const redisValue = await this.getFromRedis(key);
        if (redisValue) {
          this.setMemory(key, redisValue, this.options.defaultTTL);
          return redisValue;
        }
      } catch (error) {
        console.error('Redis cache error:', error);
      }
    }

    // Try R2 if enabled
    if (this.options.enableR2) {
      try {
        const r2Value = await this.getFromR2(key);
        if (r2Value) {
          this.setMemory(key, r2Value, this.options.defaultTTL);
          return r2Value;
        }
      } catch (error) {
        console.error('R2 cache error:', error);
      }
    }

    return null;
  }

  async set<T>(
    key: string, 
    value: T, 
    ttl?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTTL,
      hits: 0,
      metadata
    };

    // Set in memory cache
    this.setMemory(key, entry, entry.ttl);

    // Async set in Redis if enabled
    if (this.options.enableRedis) {
      this.setInRedis(key, entry).catch(console.error);
    }

    // Async set in R2 if enabled
    if (this.options.enableR2) {
      this.setInR2(key, entry).catch(console.error);
    }
  }

  private setMemory<T>(key: string, value: T, ttl: number): void {
    // Check if we need to evict
    if (this.memoryCache.size >= this.options.maxMemoryEntries) {
      this.evictLRU();
    }

    this.memoryCache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      hits: 0
    });
  }

  private evictLRU(): void {
    let lruKey = '';
    let lruHits = Infinity;
    let lruTimestamp = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      // Score based on hits and age
      const score = entry.hits * 0.3 + (Date.now() - entry.timestamp) * 0.7;
      
      if (score < lruHits) {
        lruHits = score;
        lruKey = key;
        lruTimestamp = entry.timestamp;
      }
    }

    if (lruKey) {
      this.memoryCache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  private async getFromRedis(key: string): Promise<any> {
    // Implement Redis client
    // For now, return null
    return null;
  }

  private async setInRedis(key: string, entry: CacheEntry<any>): Promise<void> {
    // Implement Redis set
  }

  private async getFromR2(key: string): Promise<any> {
    // Implement R2 client
    // For now, return null
    return null;
  }

  private async setInR2(key: string, entry: CacheEntry<any>): Promise<void> {
    // Implement R2 set
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.stats.evictions += removed;
      console.log(`Cache cleanup removed ${removed} expired entries`);
    }
  }

  clear(): void {
    this.memoryCache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memorySize: 0
    };
  }

  getStats() {
    return {
      ...this.stats,
      memorySize: this.memoryCache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  async invalidate(pattern: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.memoryCache.delete(key);
    }

    console.log(`Invalidated ${keysToDelete.length} cache entries matching ${pattern}`);
  }
}
