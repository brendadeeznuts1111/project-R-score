/**
 * Bun Native URL Builder
 * 
 * Leverages Bun's native features: environment variables, URLPattern,
 * and optimized file operations for high-performance URL management.
 * 
 * @see {@link https://bun.sh/docs/api/env} Environment variables
 * @see {@link https://bun.sh/docs/api/utils#urlpattern} URLPattern API
 * @see {@link https://bun.sh/docs/api/file} File operations
 */

import { 
  config, 
  URL_PATTERNS, 
  validateAndParseUrl, 
  buildValidatedUrl, 
  getEnvConfig,
  getCachePath,
  type ApiEndpoint,
  type GuideName,
  type RuntimeFeature,
  type CliCommand,
  type PatternName
} from './doc-urls-config.ts';

export interface CacheEntry {
  url: string;
  pattern?: PatternName;
  groups?: Record<string, string>;
  timestamp: number;
  expires: number;
}

export interface BuildOptions {
  fragment?: string;
  searchParams?: Record<string, string>;
  validate?: boolean;
  cache?: boolean;
}

/**
 * High-performance URL builder using Bun's native features
 */
export class BunNativeUrlBuilder {
  private cache = new Map<string, CacheEntry>();
  private env = getEnvConfig();
  
  constructor() {
    // Initialize cache with expiry
    this.loadCacheFromDisk();
  }
  
  /**
   * Build typed array URL with native validation
   */
  typedArray(options: BuildOptions = {}): string {
    const cacheKey = `typedArray:${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() < cached.expires) {
        return cached.url;
      }
    }
    
    let url = this.env.baseUrl + config.PATHS.TYPED_ARRAY;
    
    // Add search params
    if (options.searchParams) {
      const urlObj = new URL(url);
      Object.entries(options.searchParams).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value);
      });
      url = urlObj.toString();
    }
    
    // Add fragment
    if (options.fragment) {
      url += '#' + options.fragment;
    }
    
    // Validate if requested
    if (options.validate !== false) {
      const validation = validateAndParseUrl(url);
      if (!validation.valid) {
        console.warn(`⚠️ Typed array URL may not match known patterns: ${url}`);
      }
    }
    
    // Cache if requested
    if (options.cache !== false) {
      this.cache.set(cacheKey, {
        url,
        timestamp: Date.now(),
        expires: Date.now() + config.CACHE.EXPIRY,
        ...validateAndParseUrl(url)
      });
    }
    
    return url;
  }
  
  /**
   * Build API URL with native pattern matching
   */
  api(endpoint: ApiEndpoint, options: BuildOptions = {}): string {
    const cacheKey = `api:${endpoint}:${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() < cached.expires) {
        return cached.url;
      }
    }
    
    let url = this.env.baseUrl + config.PATHS.API[endpoint];
    
    // Add search params
    if (options.searchParams) {
      const urlObj = new URL(url);
      Object.entries(options.searchParams).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value);
      });
      url = urlObj.toString();
    }
    
    // Add fragment
    if (options.fragment) {
      url += '#' + options.fragment;
    }
    
    // Validate using API pattern
    const validation = validateAndParseUrl(url);
    if (options.validate !== false) {
      if (!validation.valid || validation.pattern !== 'API') {
        console.warn(`⚠️ API URL may not match API pattern: ${url}`);
      }
    }
    
    // Cache if requested
    if (options.cache !== false) {
      this.cache.set(cacheKey, {
        url,
        timestamp: Date.now(),
        expires: Date.now() + config.CACHE.EXPIRY,
        ...validation
      });
    }
    
    return url;
  }
  
  /**
   * Build guide URL with native validation
   */
  guide(name: GuideName, subpath?: string, options: BuildOptions = {}): string {
    const cacheKey = `guide:${name}:${subpath || ''}:${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() < cached.expires) {
        return cached.url;
      }
    }
    
    const basePath = config.PATHS.GUIDES[name];
    const fullPath = subpath ? `${basePath}/${subpath}` : basePath;
    let url = this.env.baseUrl + fullPath;
    
    // Add search params
    if (options.searchParams) {
      const urlObj = new URL(url);
      Object.entries(options.searchParams).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value);
      });
      url = urlObj.toString();
    }
    
    // Add fragment
    if (options.fragment) {
      url += '#' + options.fragment;
    }
    
    // Validate using GUIDES pattern
    const validation = validateAndParseUrl(url);
    if (options.validate !== false) {
      if (!validation.valid || validation.pattern !== 'GUIDES') {
        console.warn(`⚠️ Guide URL may not match GUIDES pattern: ${url}`);
      }
    }
    
    // Cache if requested
    if (options.cache !== false) {
      this.cache.set(cacheKey, {
        url,
        timestamp: Date.now(),
        expires: Date.now() + config.CACHE.EXPIRY,
        ...validation
      });
    }
    
    return url;
  }
  
  /**
   * Build CLI URL with native validation
   */
  cli(command: CliCommand, options: BuildOptions = {}): string {
    const cacheKey = `cli:${command}:${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() < cached.expires) {
        return cached.url;
      }
    }
    
    let url = this.env.baseUrl + config.PATHS.CLI[command];
    
    // Add search params
    if (options.searchParams) {
      const urlObj = new URL(url);
      Object.entries(options.searchParams).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value);
      });
      url = urlObj.toString();
    }
    
    // Add fragment
    if (options.fragment) {
      url += '#' + options.fragment;
    }
    
    // Validate using CLI pattern
    const validation = validateAndParseUrl(url);
    if (options.validate !== false) {
      if (!validation.valid || validation.pattern !== 'CLI') {
        console.warn(`⚠️ CLI URL may not match CLI pattern: ${url}`);
      }
    }
    
    // Cache if requested
    if (options.cache !== false) {
      this.cache.set(cacheKey, {
        url,
        timestamp: Date.now(),
        expires: Date.now() + config.CACHE.EXPIRY,
        ...validation
      });
    }
    
    return url;
  }
  
  /**
   * Get RSS feed URL with native validation
   */
  rssUrl(): string {
    return this.env.feedUrl;
  }
  
  /**
   * Validate any URL against all patterns
   */
  validateUrl(url: string): ReturnType<typeof validateAndParseUrl> {
    return validateAndParseUrl(url);
  }
  
  /**
   * Get all URLs for a category with caching
   */
  getAllApiUrls(): Record<ApiEndpoint, string> {
    const urls = {} as Record<ApiEndpoint, string>;
    
    for (const endpoint of Object.keys(config.PATHS.API) as ApiEndpoint[]) {
      urls[endpoint] = this.api(endpoint, { cache: true });
    }
    
    return urls;
  }
  
  /**
   * Save cache to disk using Bun's native file operations
   */
  async saveCacheToDisk(): Promise<void> {
    const cacheData = {
      metadata: {
        timestamp: Date.now(),
        expires: Date.now() + config.CACHE.EXPIRY,
        total: this.cache.size,
        env: this.env
      },
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        ...value
      }))
    };
    
    const cacheFile = getCachePath(config.CACHE.URLS_FILE);
    await Bun.write(cacheFile, JSON.stringify(cacheData, null, 2));
    
    console.log(`✅ Saved ${this.cache.size} cached URLs to ${cacheFile}`);
  }
  
  /**
   * Load cache from disk using Bun's native file operations
   */
  private async loadCacheFromDisk(): Promise<void> {
    try {
      const cacheFile = getCachePath(config.CACHE.URLS_FILE);
      const file = Bun.file(cacheFile);
      
      if (!await file.exists()) {
        return; // No cache file exists
      }
      
      const cacheData = await file.json();
      const now = Date.now();
      
      // Validate cache data structure
      if (!this.isValidCacheData(cacheData)) {
        console.warn('⚠️ Invalid cache file format - cache will be rebuilt');
        return;
      }
      
      let loadedCount = 0;
      let skippedCount = 0;
      
      // Load only valid, non-expired entries
      for (const entry of cacheData.entries) {
        if (this.isValidCacheEntry(entry)) {
          if (now < entry.expires) {
            this.cache.set(entry.key, {
              url: entry.url,
              pattern: entry.pattern,
              groups: entry.groups,
              timestamp: entry.timestamp,
              expires: entry.expires
            });
            loadedCount++;
          } else {
            skippedCount++;
          }
        } else {
          console.warn(`⚠️ Skipping invalid cache entry: ${entry.key || 'unknown'}`);
          skippedCount++;
        }
      }
      
      console.log(`✅ Loaded ${loadedCount} cached URLs from disk (${skippedCount} skipped/expired)`);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.warn('⚠️ Failed to load cache from disk:', errorMessage);
      // Clear any partially loaded cache
      this.cache.clear();
    }
  }
  
  /**
   * Validate cache data structure
   */
  private isValidCacheData(data: any): data is { entries: any[]; metadata?: any } {
    return (
      data &&
      typeof data === 'object' &&
      Array.isArray(data.entries) &&
      data.entries.length >= 0
    );
  }
  
  /**
   * Validate individual cache entry
   */
  private isValidCacheEntry(entry: any): entry is CacheEntry & { key: string } {
    return (
      entry &&
      typeof entry === 'object' &&
      typeof entry.key === 'string' &&
      entry.key.length > 0 &&
      typeof entry.url === 'string' &&
      entry.url.length > 0 &&
      typeof entry.timestamp === 'number' &&
      entry.timestamp > 0 &&
      typeof entry.expires === 'number' &&
      entry.expires > 0 &&
      (entry.pattern === undefined || typeof entry.pattern === 'string') &&
      (entry.groups === undefined || typeof entry.groups === 'object')
    );
  }
  
  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expires) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    total: number;
    expired: number;
    valid: number;
    env: ReturnType<typeof getEnvConfig>;
    patterns: number;
  } {
    const now = Date.now();
    const expired = Array.from(this.cache.values()).filter(
      entry => now >= entry.expires
    ).length;
    
    return {
      total: this.cache.size,
      expired,
      valid: this.cache.size - expired,
      env: this.env,
      patterns: Object.keys(URL_PATTERNS).length
    };
  }
  
  /**
   * Generate sitemap using Bun's native file operations
   */
  async generateSitemap(): Promise<string> {
    const urls = [
      // Main documentation
      { loc: this.env.baseUrl, priority: 1.0, changefreq: 'daily' },
      
      // Typed array documentation
      { loc: this.typedArray(), priority: 0.9, changefreq: 'weekly' },
      
      // API documentation
      ...Object.values(this.getAllApiUrls()).map(url => ({
        loc: url,
        priority: 0.8,
        changefreq: 'weekly' as const
      })),
      
      // RSS feed
      { loc: this.rssUrl(), priority: 0.7, changefreq: 'hourly' as const }
    ];
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(entry => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>${entry.priority}</priority>
    <changefreq>${entry.changefreq}</changefreq>
  </url>`).join('\n')}
</urlset>`;
    
    await Bun.write(config.SITEMAP.FILE, sitemap);
    console.log(`✅ Generated sitemap with ${urls.length} entries`);
    
    return sitemap;
  }
}

// Singleton instance
export const docs = new BunNativeUrlBuilder();

// Convenience functions
export const buildTypedArrayUrl = (options?: BuildOptions) => docs.typedArray(options);
export const buildApiUrl = (endpoint: ApiEndpoint, options?: BuildOptions) => docs.api(endpoint, options);
export const buildGuideUrl = (name: GuideName, subpath?: string, options?: BuildOptions) => docs.guide(name, subpath, options);
export const buildCliUrl = (command: CliCommand, options?: BuildOptions) => docs.cli(command, options);
