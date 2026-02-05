/**
 * Template Cache System
 * Domain-Driven Design Implementation
 *
 * Implements LRU (Least Recently Used) caching for HTML templates
 * with performance monitoring and cache invalidation strategies.
 */

import { HTMLTemplate } from './html-templates';

export interface CacheEntry {
  template: HTMLTemplate;
  lastAccessed: number;
  accessCount: number;
  size: number; // Estimated memory size in bytes
  compiled?: string; // Pre-compiled template
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  hitRate: number;
  entries: number;
  maxSize: number;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  ttl: number; // Time to live in milliseconds (0 = no expiry)
  enablePrecompile: boolean; // Pre-compile templates
  enableCompression: boolean; // Compress cached templates
}

export class TemplateCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = []; // For LRU tracking
  private config: CacheConfig;
  private stats: CacheStats;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 50 * 1024 * 1024, // 50MB default
      maxEntries: config.maxEntries || 100,
      ttl: config.ttl || 30 * 60 * 1000, // 30 minutes default
      enablePrecompile: config.enablePrecompile ?? true,
      enableCompression: config.enableCompression ?? false,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      hitRate: 0,
      entries: 0,
      maxSize: this.config.maxSize,
    };

    // Start cleanup interval
    if (this.config.ttl > 0) {
      setInterval(() => this.cleanup(), this.config.ttl / 4);
    }
  }

  /**
   * Get template from cache
   */
  get(key: string): HTMLTemplate | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (this.config.ttl > 0 && Date.now() - entry.lastAccessed > this.config.ttl) {
      this.evict(key);
      this.stats.misses++;
      return null;
    }

    // Update LRU order
    this.updateAccessOrder(key);
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    this.stats.hits++;
    return entry.template;
  }

  /**
   * Put template in cache
   */
  put(key: string, template: HTMLTemplate, data?: any): void {
    const existingEntry = this.cache.get(key);

    if (existingEntry) {
      // Update existing entry
      existingEntry.template = template;
      existingEntry.lastAccessed = Date.now();
      this.updateAccessOrder(key);
      return;
    }

    // Pre-compile template if enabled
    let compiled: string | undefined;
    let size = this.estimateSize(template);

    if (this.config.enablePrecompile && data) {
      try {
        compiled = template.render(data);
        size += compiled.length * 2; // Rough estimate for compiled template
      } catch (error) {
        console.warn(`Failed to pre-compile template ${key}:`, error);
      }
    }

    const entry: CacheEntry = {
      template,
      lastAccessed: Date.now(),
      accessCount: 0,
      size,
      compiled,
    };

    // Check if we need to evict entries
    this.ensureCapacity(entry.size);

    // Add to cache
    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.stats.totalSize += entry.size;
    this.stats.entries++;
  }

  /**
   * Check if template exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (this.config.ttl > 0 && Date.now() - entry.lastAccessed > this.config.ttl) {
      this.evict(key);
      return false;
    }

    return true;
  }

  /**
   * Remove template from cache
   */
  evict(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.entries--;

      // Remove from access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }

      this.stats.evictions++;
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.length = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      hitRate: 0,
      entries: 0,
      maxSize: this.config.maxSize,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return { ...this.stats };
  }

  /**
   * Get cache entries sorted by access frequency
   */
  getMostAccessed(limit = 10): Array<{ key: string; accessCount: number; lastAccessed: number }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Pre-warm cache with frequently used templates
   */
  async warmup(
    templates: Array<{ key: string; template: HTMLTemplate; data?: any }>
  ): Promise<void> {
    console.log(`🔄 Warming up cache with ${templates.length} templates...`);

    for (const { key, template, data } of templates) {
      this.put(key, template, data);
    }

    console.log(`✅ Cache warmed up. Stats:`, this.getStats());
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private ensureCapacity(requiredSize: number): void {
    // Remove expired entries first
    this.cleanup();

    // Check size limit
    while (this.stats.totalSize + requiredSize > this.config.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Check entry count limit
    while (this.cache.size >= this.config.maxEntries && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const keyToEvict = this.accessOrder.shift();
    if (keyToEvict) {
      this.evict(keyToEvict);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    if (this.config.ttl === 0) return;

    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccessed > this.config.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.evict(key));
  }

  /**
   * Estimate memory size of template
   */
  private estimateSize(template: HTMLTemplate): number {
    // Rough estimation: template name + HTML content
    const htmlSize = template.html.length * 2; // UTF-16 characters
    const nameSize = template.name.length * 2;
    return htmlSize + nameSize + 100; // Overhead
  }
}

/**
 * Template Cache Manager
 * Singleton for global template caching
 */
export class TemplateCacheManager {
  private static instance: TemplateCacheManager;
  private cache: TemplateCache;
  private preloadQueue: Array<{
    key: string;
    template: HTMLTemplate;
    data?: any;
  }> = [];

  private constructor() {
    this.cache = new TemplateCache({
      maxSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 200,
      ttl: 60 * 60 * 1000, // 1 hour
      enablePrecompile: true,
      enableCompression: false,
    });
  }

  static getInstance(): TemplateCacheManager {
    if (!TemplateCacheManager.instance) {
      TemplateCacheManager.instance = new TemplateCacheManager();
    }
    return TemplateCacheManager.instance;
  }

  /**
   * Get cached template
   */
  get(key: string): HTMLTemplate | null {
    return this.cache.get(key);
  }

  /**
   * Cache template
   */
  put(key: string, template: HTMLTemplate, data?: any): void {
    this.cache.put(key, template, data);
  }

  /**
   * Check if template is cached
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Add template to preload queue
   */
  queueForPreload(key: string, template: HTMLTemplate, data?: any): void {
    this.preloadQueue.push({ key, template, data });
  }

  /**
   * Preload queued templates
   */
  async preload(): Promise<void> {
    if (this.preloadQueue.length > 0) {
      await this.cache.warmup(this.preloadQueue);
      this.preloadQueue.length = 0; // Clear queue
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Get most accessed templates
   */
  getMostAccessed(limit = 10): Array<{ key: string; accessCount: number; lastAccessed: number }> {
    return this.cache.getMostAccessed(limit);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }
}

// Global instance
export const templateCacheManager = TemplateCacheManager.getInstance();
