// lib/utils/advanced-cache-manager.ts - Advanced caching strategies with LRU, TTL, and distributed cache

import { EventEmitter } from 'events';

export interface CacheConfig {
  maxSize: number; // Maximum number of items in cache
  ttl: number; // Time to live in milliseconds
  enableLRU: boolean; // Enable Least Recently Used eviction
  enableDistributed: boolean; // Enable distributed caching
  distributedNodes: string[]; // List of distributed node URLs
  compressionThreshold: number; // Compress items larger than this size (bytes)
  enableMetrics: boolean; // Enable performance metrics
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export interface CacheItem<T = any> {
  key: string;
  value: T;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  size: number;
  ttl?: number;
  compressed: boolean;
  checksum: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalSize: number;
  itemCount: number;
  hitRate: number;
  averageAccessTime: number;
  memoryUsage: number;
}

export interface CacheStats {
  metrics: CacheMetrics;
  topKeys: Array<{ key: string; accessCount: number; size: number }>;
  sizeDistribution: { small: number; medium: number; large: number };
  ttlDistribution: { expired: number; active: number; permanent: number };
}

/**
 * Advanced Cache Manager with LRU, TTL, compression, and distributed support
 */
export class AdvancedCacheManager extends EventEmitter {
  private cache = new Map<string, CacheItem>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private accessTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private accessTimes: number[] = [];
  private compressionWorker?: Worker;

  constructor(config: Partial<CacheConfig> = {}) {
    super();
    
    this.config = {
      maxSize: 1000,
      ttl: 30 * 60 * 1000, // 30 minutes
      enableLRU: true,
      enableDistributed: false,
      distributedNodes: [],
      compressionThreshold: 1024, // 1KB
      enableMetrics: true,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalSize: 0,
      itemCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      memoryUsage: 0
    };

    this.startCleanupTimer();
    this.initializeCompressionWorker();
  }

  /**
   * Get an item from cache
   */
  public async get<T = any>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      // Check local cache first
      const item = this.cache.get(key);
      
      if (item) {
        // Check if item is expired
        if (this.isExpired(item)) {
          this.cache.delete(key);
          this.accessOrder.delete(key);
          this.metrics.misses++;
          this.metrics.itemCount = this.cache.size;
          this.emit('miss', key);
          return null;
        }

        // Update access information
        item.lastAccessed = Date.now();
        item.accessCount++;
        
        if (this.config.enableLRU) {
          this.updateAccessOrder(key);
        }

        // Update metrics
        this.metrics.hits++;
        this.updateHitRate();
        this.recordAccessTime(startTime);
        this.emit('hit', key, item);

        // Decompress if needed
        let value = item.value;
        if (item.compressed) {
          value = await this.decompressValue(value);
        }

        return value;
      }

      // Check distributed cache if enabled
      if (this.config.enableDistributed) {
        const distributedValue = await this.getFromDistributedCache(key);
        if (distributedValue !== null) {
          // Store in local cache for future access
          await this.set(key, distributedValue);
          this.metrics.hits++;
          this.updateHitRate();
          this.recordAccessTime(startTime);
          this.emit('hit', key, { value: distributedValue, fromDistributed: true });
          return distributedValue;
        }
      }

      this.metrics.misses++;
      this.metrics.itemCount = this.cache.size;
      this.recordAccessTime(startTime);
      this.emit('miss', key);
      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set an item in cache
   */
  public async set<T = any>(
    key: string, 
    value: T, 
    options: { ttl?: number; compress?: boolean; priority?: 'low' | 'medium' | 'high' } = {}
  ): Promise<void> {
    try {
      const now = Date.now();
      const ttl = options.ttl || this.config.ttl;
      
      // Check if we need to evict items
      await this.ensureCapacity();

      // Compress value if needed
      let compressedValue = value;
      let compressed = false;
      const serializedValue = JSON.stringify(value);
      const size = new Blob([serializedValue]).size;

      if ((options.compress !== false) && size > this.config.compressionThreshold) {
        compressedValue = await this.compressValue(serializedValue);
        compressed = true;
      }

      const item: CacheItem<T> = {
        key,
        value: compressedValue,
        createdAt: now,
        lastAccessed: now,
        accessCount: 1,
        size: compressed ? new Blob([compressedValue as string]).size : size,
        ttl: ttl > 0 ? now + ttl : undefined,
        compressed,
        checksum: this.calculateChecksum(serializedValue)
      };

      // Store in local cache
      this.cache.set(key, item);
      
      if (this.config.enableLRU) {
        this.updateAccessOrder(key);
      }

      // Update metrics
      this.metrics.sets++;
      this.metrics.totalSize += item.size;
      this.metrics.itemCount = this.cache.size;
      this.updateMemoryUsage();

      // Store in distributed cache if enabled
      if (this.config.enableDistributed) {
        await this.setToDistributedCache(key, value, ttl);
      }

      this.emit('set', key, item);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete an item from cache
   */
  public async delete(key: string): Promise<boolean> {
    try {
      const item = this.cache.get(key);
      if (!item) return false;

      this.cache.delete(key);
      this.accessOrder.delete(key);
      
      // Update metrics
      this.metrics.deletes++;
      this.metrics.totalSize -= item.size;
      this.metrics.itemCount = this.cache.size;
      this.updateMemoryUsage();

      // Delete from distributed cache if enabled
      if (this.config.enableDistributed) {
        await this.deleteFromDistributedCache(key);
      }

      this.emit('delete', key, item);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  public async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (this.isExpired(item)) {
      await this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all items from cache
   */
  public async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder.clear();
    
    // Reset metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalSize: 0,
      itemCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      memoryUsage: 0
    };

    // Clear distributed cache if enabled
    if (this.config.enableDistributed) {
      await this.clearDistributedCache();
    }

    this.emit('clear');
  }

  /**
   * Get multiple items in batch
   */
  public async mget<T = any>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    // Process in parallel for better performance
    const promises = keys.map(async (key) => {
      const value = await this.get<T>(key);
      return [key, value] as [string, T | null];
    });

    const settled = await Promise.allSettled(promises);
    
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const [key, value] = result.value;
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Set multiple items in batch
   */
  public async mset<T = any>(items: Map<string, T>): Promise<void> {
    const promises = Array.from(items.entries()).map(([key, value]) => 
      this.set(key, value)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const topKeys = Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(item => ({
        key: item.key,
        accessCount: item.accessCount,
        size: item.size
      }));

    const sizeDistribution = this.calculateSizeDistribution();
    const ttlDistribution = this.calculateTTLDistribution();

    return {
      metrics: { ...this.metrics },
      topKeys,
      sizeDistribution,
      ttlDistribution
    };
  }

  /**
   * Force cleanup of expired items
   */
  public async cleanup(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        await this.delete(key);
        cleanedCount++;
      }
    }

    this.emit('cleanup', cleanedCount);
    return cleanedCount;
  }

  /**
   * Ensure cache capacity by evicting items if needed
   */
  private async ensureCapacity(): Promise<void> {
    if (this.cache.size < this.config.maxSize) return;

    const itemsToEvict = this.cache.size - this.config.maxSize + 1;
    
    if (this.config.enableLRU) {
      // Evict least recently used items
      const sortedKeys = Array.from(this.accessOrder.entries())
        .sort(([, a], [, b]) => a - b)
        .slice(0, itemsToEvict)
        .map(([key]) => key);

      for (const key of sortedKeys) {
        await this.evictKey(key);
      }
    } else {
      // Evict random items
      const keys = Array.from(this.cache.keys()).slice(0, itemsToEvict);
      for (const key of keys) {
        await this.evictKey(key);
      }
    }
  }

  /**
   * Evict a specific key
   */
  private async evictKey(key: string): Promise<void> {
    const item = this.cache.get(key);
    if (item) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      
      this.metrics.evictions++;
      this.metrics.totalSize -= item.size;
      this.metrics.itemCount = this.cache.size;
      
      this.emit('evict', key, item);
    }
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    this.accessOrder.set(key, Date.now());
    
    // Limit access order map size
    if (this.accessOrder.size > this.config.maxSize * 2) {
      const sortedEntries = Array.from(this.accessOrder.entries())
        .sort(([, a], [, b]) => a - b)
        .slice(0, this.config.maxSize);
      
      this.accessOrder.clear();
      for (const [key, time] of sortedEntries) {
        this.accessOrder.set(key, time);
      }
    }
  }

  /**
   * Check if item is expired
   */
  private isExpired(item: CacheItem): boolean {
    if (!item.ttl) return false;
    return Date.now() > item.ttl;
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  /**
   * Record access time for metrics
   */
  private recordAccessTime(startTime: number): void {
    const accessTime = performance.now() - startTime;
    this.accessTimes.push(accessTime);
    
    // Keep only last 100 access times
    if (this.accessTimes.length > 100) {
      this.accessTimes = this.accessTimes.slice(-100);
    }
    
    this.metrics.averageAccessTime = 
      this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length;
  }

  /**
   * Update memory usage calculation
   */
  private updateMemoryUsage(): void {
    // Rough estimation of memory usage
    this.metrics.memoryUsage = this.metrics.totalSize + (this.cache.size * 200); // Add overhead
  }

  /**
   * Calculate size distribution
   */
  private calculateSizeDistribution(): { small: number; medium: number; large: number } {
    let small = 0, medium = 0, large = 0;
    
    for (const item of this.cache.values()) {
      if (item.size < 1024) small++; // < 1KB
      else if (item.size < 10240) medium++; // < 10KB
      else large++; // >= 10KB
    }
    
    return { small, medium, large };
  }

  /**
   * Calculate TTL distribution
   */
  private calculateTTLDistribution(): { expired: number; active: number; permanent: number } {
    let expired = 0, active = 0, permanent = 0;
    const now = Date.now();
    
    for (const item of this.cache.values()) {
      if (!item.ttl) permanent++;
      else if (now > item.ttl) expired++;
      else active++;
    }
    
    return { expired, active, permanent };
  }

  /**
   * Compress value using gzip
   */
  private async compressValue(value: string): Promise<string> {
    const compressed = Bun.gzipSync(value);
    return compressed.toString('base64');
  }

  /**
   * Decompress value
   */
  private async decompressValue(compressedValue: string): Promise<any> {
    const compressed = Buffer.from(compressedValue, 'base64');
    const decompressed = Bun.gunzipSync(compressed);
    return JSON.parse(decompressed.toString());
  }

  /**
   * Calculate checksum for integrity verification
   */
  private calculateChecksum(value: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = Bun.CryptoHasher('sha256').update(data).digest();
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Distributed cache operations
   */
  private async getFromDistributedCache(key: string): Promise<any | null> {
    if (!this.config.enableDistributed) return null;
    
    try {
      // Try each distributed node
      for (const nodeUrl of this.config.distributedNodes) {
        const response = await fetch(`${nodeUrl}/cache/${key}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.value !== null) {
            return data.value;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Distributed cache get error:', error);
      return null;
    }
  }

  private async setToDistributedCache(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.config.enableDistributed) return;
    
    try {
      const data = {
        key,
        value,
        ttl: ttl || this.config.ttl
      };
      
      // Set on all distributed nodes
      const promises = this.config.distributedNodes.map(async (nodeUrl) => {
        try {
          await fetch(`${nodeUrl}/cache/${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } catch (error) {
          console.error(`Failed to set on node ${nodeUrl}:`, error);
        }
      });
      
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Distributed cache set error:', error);
    }
  }

  private async deleteFromDistributedCache(key: string): Promise<void> {
    if (!this.config.enableDistributed) return;
    
    try {
      const promises = this.config.distributedNodes.map(async (nodeUrl) => {
        try {
          await fetch(`${nodeUrl}/cache/${key}`, {
            method: 'DELETE'
          });
        } catch (error) {
          console.error(`Failed to delete from node ${nodeUrl}:`, error);
        }
      });
      
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Distributed cache delete error:', error);
    }
  }

  private async clearDistributedCache(): Promise<void> {
    if (!this.config.enableDistributed) return;
    
    try {
      const promises = this.config.distributedNodes.map(async (nodeUrl) => {
        try {
          await fetch(`${nodeUrl}/cache`, {
            method: 'DELETE'
          });
        } catch (error) {
          console.error(`Failed to clear node ${nodeUrl}:`, error);
        }
      });
      
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Distributed cache clear error:', error);
    }
  }

  /**
   * Initialize compression worker for async operations
   */
  private initializeCompressionWorker(): void {
    // Initialize Web Worker for compression operations
    // This would move CPU-intensive compression off the main thread
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    if (this.accessTimer) {
      clearInterval(this.accessTimer);
      this.accessTimer = undefined;
    }
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = undefined;
    }
    
    await this.clear();
    this.removeAllListeners();
  }
}

export default AdvancedCacheManager;
