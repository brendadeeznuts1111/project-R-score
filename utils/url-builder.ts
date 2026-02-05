/**
 * Bun Documentation URL Builder
 * 
 * Sophisticated URL building utility with caching, sitemap generation,
 * and deep integration with our documentation reference system.
 * 
 * @see {@link https://bun.sh/docs/api/file} Bun file operations
 * @see {@link https://bun.sh/docs/api/utils} URL utilities
 */

import { config, ApiEndpoint, GuideName, CliCommand, TypedArrayFragment, ApiFragment } from './doc-urls-config.ts';
import { docs as docsRef, validateDocUrl } from '../lib/docs-reference.ts';

export interface CacheEntry {
  url: string;
  timestamp: number;
  fragment?: string;
}

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  priority: number;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

export class BunDocUrlBuilder {
  private baseUrl: URL;
  private cache = new Map<string, CacheEntry>();
  private cacheExpiry = 3600000; // 1 hour in ms
  
  constructor(baseUrl?: string) {
    this.baseUrl = new URL(baseUrl || config.BASE_URL);
  }
  
  /**
   * Build typed array URL with optional fragment
   */
  typedArray(section?: TypedArrayFragment): string {
    const cacheKey = `typedArray:${section || 'base'}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.url;
      }
    }
    
    const url = new URL(config.PATHS.TYPED_ARRAY, this.baseUrl);
    if (section) url.hash = config.FRAGMENTS.TYPED_ARRAY[section];
    
    const urlString = url.toString();
    this.cache.set(cacheKey, { 
      url: urlString, 
      timestamp: Date.now(),
      fragment: section 
    });
    
    return urlString;
  }
  
  /**
   * Build API URL with optional fragment
   */
  api(endpoint: ApiEndpoint, fragment?: ApiFragment): string {
    const cacheKey = `api:${endpoint}:${fragment || 'base'}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.url;
      }
    }
    
    const url = new URL(config.PATHS.API[endpoint], this.baseUrl);
    if (fragment) url.hash = config.FRAGMENTS.API[fragment];
    
    const urlString = url.toString();
    this.cache.set(cacheKey, { 
      url: urlString, 
      timestamp: Date.now(),
      fragment: fragment 
    });
    
    return urlString;
  }
  
  /**
   * Build guide URL with optional subpath
   */
  guide(name: GuideName, subpath?: string): string {
    const cacheKey = `guide:${name}:${subpath || 'base'}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.url;
      }
    }
    
    const base = config.PATHS.GUIDES[name];
    const path = subpath ? `${base}/${subpath}` : base;
    const url = new URL(path, this.baseUrl);
    
    const urlString = url.toString();
    this.cache.set(cacheKey, { 
      url: urlString, 
      timestamp: Date.now()
    });
    
    return urlString;
  }
  
  /**
   * Build CLI URL
   */
  cli(command: CliCommand, fragment?: string): string {
    const cacheKey = `cli:${command}:${fragment || 'base'}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.url;
      }
    }
    
    const url = new URL(config.PATHS.CLI[command], this.baseUrl);
    if (fragment) url.hash = fragment;
    
    const urlString = url.toString();
    this.cache.set(cacheKey, { 
      url: urlString, 
      timestamp: Date.now(),
      fragment: fragment 
    });
    
    return urlString;
  }
  
  /**
   * Validate a URL using our reference system
   */
  validateUrl(url: string): { valid: boolean; pattern?: string } {
    const isValid = validateDocUrl(url);
    const parsed = docsRef.parseUrl(url);
    
    return {
      valid: isValid,
      pattern: parsed.valid ? parsed.pattern : undefined
    };
  }
  
  /**
   * Get all typed array URLs
   */
  getTypedArrayUrls(): Record<TypedArrayFragment | 'base', string> {
    return {
      base: this.typedArray(),
      overview: this.typedArray('OVERVIEW'),
      methods: this.typedArray('METHODS'),
      conversion: this.typedArray('CONVERSION'),
      performance: this.typedArray('PERFORMANCE'),
      zero_copy: this.typedArray('ZERO_COPY'),
      shared_array_buffer: this.typedArray('SHARED_ARRAY_BUFFER')
    };
  }
  
  /**
   * Get all API URLs
   */
  getApiUrls(): Record<ApiEndpoint, string> {
    const urls = {} as Record<ApiEndpoint, string>;
    
    for (const endpoint of Object.keys(config.PATHS.API) as ApiEndpoint[]) {
      urls[endpoint] = this.api(endpoint);
    }
    
    return urls;
  }
  
  /**
   * Cache URLs to filesystem using Bun's native file operations
   */
  async cacheUrls(): Promise<void> {
    const urls = {
      metadata: {
        generated: new Date().toISOString(),
        baseUrl: this.baseUrl.toString(),
        cacheExpiry: this.cacheExpiry,
        totalUrls: this.cache.size
      },
      typedArray: this.getTypedArrayUrls(),
      api: this.getApiUrls(),
      guides: {
        readFile: this.guide('READ_FILE'),
        writeFile: this.guide('WRITE_FILE'),
        performance: this.guide('PERFORMANCE'),
        deployment: this.guide('DEPLOYMENT')
      },
      cli: {
        bunx: this.cli('BUNX'),
        pm: this.cli('PM'),
        build: this.cli('BUILD')
      },
      validation: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        url: entry.url,
        valid: this.validateUrl(entry.url),
        timestamp: new Date(entry.timestamp).toISOString()
      }))
    };
    
    // Ensure cache directory exists
    await Bun.write('.cache/urls.json', JSON.stringify(urls, null, 2));
    console.log(`✅ Cached ${this.cache.size} URLs to .cache/urls.json`);
  }
  
  /**
   * Generate comprehensive sitemap using Bun's native file operations
   */
  async generateSitemap(): Promise<string> {
    const entries: SitemapEntry[] = [
      // Typed array documentation
      {
        loc: this.typedArray(),
        lastmod: new Date().toISOString(),
        priority: 1.0,
        changefreq: 'weekly'
      },
      {
        loc: this.typedArray('METHODS'),
        lastmod: new Date().toISOString(),
        priority: 0.9,
        changefreq: 'weekly'
      },
      {
        loc: this.typedArray('PERFORMANCE'),
        lastmod: new Date().toISOString(),
        priority: 0.8,
        changefreq: 'monthly'
      },
      
      // API documentation
      {
        loc: this.api('UTILS'),
        lastmod: new Date().toISOString(),
        priority: 0.9,
        changefreq: 'weekly'
      },
      {
        loc: this.api('STREAMS'),
        lastmod: new Date().toISOString(),
        priority: 0.8,
        changefreq: 'monthly'
      },
      {
        loc: this.api('FETCH'),
        lastmod: new Date().toISOString(),
        priority: 0.8,
        changefreq: 'monthly'
      },
      
      // Guides
      {
        loc: this.guide('READ_FILE'),
        lastmod: new Date().toISOString(),
        priority: 0.7,
        changefreq: 'monthly'
      },
      {
        loc: this.guide('PERFORMANCE'),
        lastmod: new Date().toISOString(),
        priority: 0.8,
        changefreq: 'weekly'
      },
      
      // CLI documentation
      {
        loc: this.cli('BUNX'),
        lastmod: new Date().toISOString(),
        priority: 0.7,
        changefreq: 'monthly'
      }
    ];
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entry => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <priority>${entry.priority}</priority>${entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : ''}
  </url>`).join('\n')}
</urlset>`;
    
    // Ensure public directory exists
    await Bun.write('public/sitemap.xml', sitemap);
    console.log(`✅ Generated sitemap with ${entries.length} entries`);
    
    return sitemap;
  }
  
  /**
   * Generate markdown reference table
   */
  generateMarkdownTable(): string {
    const typedArrayUrls = this.getTypedArrayUrls();
    const apiUrls = this.getApiUrls();
    
    let markdown = '# Bun Documentation URLs\n\n';
    
    markdown += '## Typed Array Documentation\n\n';
    markdown += '| Name | URL | Fragment |\n';
    markdown += '|------|-----|----------|\n';
    
    Object.entries(typedArrayUrls).forEach(([name, url]) => {
      const fragment = url.includes('#') ? url.split('#')[1] : '';
      markdown += `| ${name} | [${url}](${url}) | ${fragment} |\n`;
    });
    
    markdown += '\n## API Documentation\n\n';
    markdown += '| Endpoint | URL |\n';
    markdown += '|----------|-----|\n';
    
    Object.entries(apiUrls).forEach(([endpoint, url]) => {
      markdown += `| ${endpoint} | [${url}](${url}) |\n`;
    });
    
    return markdown;
  }
  
  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const expired = Array.from(this.cache.values()).filter(
      entry => now - entry.timestamp > this.cacheExpiry
    ).length;
    
    return {
      total: this.cache.size,
      expired,
      valid: this.cache.size - expired,
      expiryTime: this.cacheExpiry,
      baseUrl: this.baseUrl.toString()
    };
  }
}

// Singleton instance
export const docs = new BunDocUrlBuilder();

// Export convenience functions
export const buildTypedArrayUrl = (section?: TypedArrayFragment) => docs.typedArray(section);
export const buildApiUrl = (endpoint: ApiEndpoint, fragment?: ApiFragment) => docs.api(endpoint, fragment);
export const buildGuideUrl = (name: GuideName, subpath?: string) => docs.guide(name, subpath);
export const buildCliUrl = (command: CliCommand, fragment?: string) => docs.cli(command, fragment);
