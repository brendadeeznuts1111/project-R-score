// lib/docs/cache-manager.ts — Documentation cache management
import { createHash } from 'node:crypto';

export interface CacheConfig {
  ttl: number; // milliseconds
  maxSize: number;
  offlineMode: boolean;
  compression?: boolean;
  encryption?: boolean;
  priority?: 'speed' | 'size' | 'balanced';
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  ttl: number;
  compressed?: boolean;
  checksum?: string;
}

export class EnhancedDocsCacheManager {
  private cache: Map<string, CacheEntry>;
  private config: Required<CacheConfig>;
  private cacheDir: string;
  private accessLog: Array<{ key: string; timestamp: number; hit: boolean }> = [];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000,
      offlineMode: false,
      compression: true,
      encryption: false,
      priority: 'balanced',
      ...config,
    };

    this.cache = new Map();
    this.cacheDir = this.getCacheDir();
    this.initCacheStorage();
    this.startMaintenanceTimer();
  }

  private getCacheDir(): string {
    const home = process.env.HOME || process.env.USERPROFILE;
    const baseDir = home ? `${home}/.cache/bun-docs` : '/tmp/bun-docs';

    // Create directory if it doesn't exist
    try {
      Bun.$`mkdir -p ${baseDir}`.quiet();
    } catch {}

    return baseDir;
  }

  private async initCacheStorage() {
    try {
      const cacheFile = Bun.file(`${this.cacheDir}/cache.json`);
      if (await cacheFile.exists()) {
        const content = await cacheFile.json();
        Object.entries(content).forEach(([key, value]: [string, any]) => {
          this.cache.set(key, value);
        });
      }
    } catch (error) {
      console.warn('Failed to load cache:', error.message);
    }
  }

  async saveCache() {
    try {
      const cacheData = Object.fromEntries(this.cache.entries());

      let dataToSave: Record<string, unknown> = cacheData;

      // Compress if enabled
      if (this.config.compression) {
        const jsonString = JSON.stringify(cacheData);
        const compressed = Bun.gzipSync(Buffer.from(jsonString));
        dataToSave = { _compressed: true, data: Buffer.from(compressed).toString('base64') };
      }

      await Bun.write(`${this.cacheDir}/cache.json`, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      console.warn('Failed to save cache:', error.message);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    const now = Date.now();

    // Log access
    this.accessLog.push({
      key,
      timestamp: now,
      hit: !!entry,
    });

    // Keep log manageable
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-500);
    }

    if (!entry) {
      return null;
    }

    // Check TTL
    const effectiveTTL = entry.ttl || this.config.ttl;
    if (now - entry.timestamp > effectiveTTL) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.data;
  }

  async set(key: string, data: any, options: Partial<CacheEntry> = {}): Promise<void> {
    const now = Date.now();
    const size = this.calculateSize(data);

    // Enforce max size with different strategies
    if (this.cache.size >= this.config.maxSize) {
      await this.evictEntries(size);
    }

    const entry: CacheEntry = {
      data,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
      size,
      ttl: options.ttl || this.config.ttl,
      compressed: options.compressed || false,
      checksum: options.checksum || this.calculateChecksum(data),
    };

    this.cache.set(key, entry);
    await this.saveCache();
  }

  async fetchWithCache<T>(url: string, options?: RequestInit): Promise<T> {
    const cacheKey = `fetch:${url}`;

    // Try cache first
    if (!this.config.offlineMode) {
      const cached = await this.get<T>(cacheKey);
      if (cached) return cached;
    }

    // Rate limiting protection
    await this.rateLimitProtection();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Bun-Docs-Indexer/1.0',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache successful response
      await this.set(cacheKey, data);

      return data;
    } catch (error) {
      // Fallback to cache even if expired
      const cached = await this.get<T>(cacheKey);
      if (cached) {
        console.warn(`Using cached data for ${url}:`, error.message);
        return cached;
      }

      throw error;
    }
  }

  private async rateLimitProtection(): Promise<void> {
    const lastRequestKey = 'last_request';
    const lastRequest = await this.get<number>(lastRequestKey);

    if (lastRequest) {
      const timeSinceLast = Date.now() - lastRequest;
      const minDelay = 1000; // 1 second between requests

      if (timeSinceLast < minDelay) {
        await Bun.sleep(minDelay - timeSinceLast);
      }
    }

    await this.set(lastRequestKey, Date.now());
  }

  private calculateSize(data: any): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  private calculateChecksum(data: any): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
  }

  private async evictEntries(newEntrySize: number): Promise<void> {
    const entries = Array.from(this.cache.entries());

    switch (this.config.priority) {
      case 'speed':
        // LRU: Least Recently Used
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        break;
      case 'size':
        // Largest first
        entries.sort(([, a], [, b]) => b.size - a.size);
        break;
      case 'balanced':
      default:
        // Balance recency and size
        entries.sort(([, a], [, b]) => {
          const scoreA = (Date.now() - a.lastAccessed) / a.size;
          const scoreB = (Date.now() - b.lastAccessed) / b.size;
          return scoreA - scoreB;
        });
        break;
    }

    // Remove entries until we have space
    let freedSpace = 0;
    const toRemove: string[] = [];

    for (const [key, entry] of entries) {
      if (
        freedSpace >= newEntrySize &&
        this.cache.size - toRemove.length < this.config.maxSize * 0.9
      ) {
        break;
      }
      toRemove.push(key);
      freedSpace += entry.size;
    }

    toRemove.forEach(key => this.cache.delete(key));
  }

  private startMaintenanceTimer() {
    // Run maintenance every hour
    setInterval(() => this.maintenance(), 60 * 60 * 1000);
  }

  private async maintenance() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      const effectiveTTL = entry.ttl || this.config.ttl;
      if (now - entry.timestamp > effectiveTTL) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache maintenance: cleaned ${cleaned} expired entries`);
      await this.saveCache();
    }
  }

  getAccessStats() {
    const total = this.accessLog.length;
    const hits = this.accessLog.filter(log => log.hit).length;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : '0';

    return {
      totalRequests: total,
      cacheHits: hits,
      cacheMisses: total - hits,
      hitRate: `${hitRate}%`,
      recentRequests: this.accessLog.slice(-10),
    };
  }

  getTopAccessed(limit = 10) {
    return Array.from(this.cache.entries())
      .sort(([, a], [, b]) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        size: entry.size,
      }));
  }

  clear(): void {
    this.cache.clear();
    this.accessLog = [];
    Bun.$`rm -f ${this.cacheDir}/cache.json`.quiet();
  }

  async preload(urls: string[]): Promise<void> {
    console.log(`🔄 Preloading ${urls.length} URLs...`);

    for (const url of urls) {
      try {
        await this.fetchWithCache(url);
        await Bun.sleep(100); // Rate limiting
      } catch (error) {
        console.warn(`Failed to preload ${url}:`, error.message);
      }
    }

    console.log('✅ Preload complete');
  }

  getStats() {
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);

    const avgSize = this.cache.size > 0 ? Math.round(totalSize / this.cache.size) : 0;

    return {
      entries: this.cache.size,
      maxEntries: this.config.maxSize,
      totalSize: `${(totalSize / 1024).toFixed(1)} KB`,
      avgSize: `${avgSize} bytes`,
      ttl: `${Math.round(this.config.ttl / (60 * 1000))} minutes`,
      offlineMode: this.config.offlineMode,
      compression: this.config.compression,
      priority: this.config.priority,
      cacheDir: this.cacheDir,
      accessStats: this.getAccessStats(),
    };
  }
}
