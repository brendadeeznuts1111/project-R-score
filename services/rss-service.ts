/**
 * RSS Service - Bun Native Feed Management
 * 
 * Leverages Bun's native fetch and file operations for high-performance
 * RSS/Atom feed fetching, parsing, and generation.
 * 
 * @see {@link https://bun.sh/docs/api/fetch} Native fetch API
 * @see {@link https://bun.sh/docs/api/file} File operations
 * @see {@link https://bun.sh/docs/api/utils} String utilities
 */

import { config, getEnvConfig, getCachePath } from '../utils/doc-urls-config.ts';

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category?: string[];
  guid?: string;
  author?: string;
}

export interface RSSFeed {
  title: string;
  link: string;
  description: string;
  language?: string;
  lastBuildDate: string;
  items: RSSItem[];
}

export interface RSSServiceConfig {
  feedUrl?: string;
  cacheFile?: string;
  updateInterval?: number;
  maxItems?: number;
  userAgent?: string;
}

/**
 * High-performance RSS service using Bun's native features
 */
export class RSSService {
  private cacheFile: string;
  private lastFetch = 0;
  private cache: RSSItem[] = [];
  private config: RSSServiceConfig;
  private env = getEnvConfig();
  
  constructor(serviceConfig: RSSServiceConfig = {}) {
    this.config = {
      feedUrl: serviceConfig.feedUrl || this.env.feedUrl,
      cacheFile: serviceConfig.cacheFile || getCachePath(config.CACHE.RSS_FILE),
      updateInterval: serviceConfig.updateInterval || config.RSS.UPDATE_INTERVAL,
      maxItems: serviceConfig.maxItems || config.RSS.MAX_ITEMS,
      userAgent: serviceConfig.userAgent || `Bun-RSS-Service/1.0 (${Bun.version})`
    };
    
    this.cacheFile = this.config.cacheFile!;
    this.loadCache();
  }
  
  /**
   * Load cache from file using Bun.File
   */
  private async loadCache(): Promise<void> {
    try {
      const file = Bun.file(this.cacheFile);
      if (await file.exists()) {
        const content = await file.text();
        const data = JSON.parse(content);
        
        // Validate cache structure
        if (Array.isArray(data)) {
          this.cache = data;
          this.lastFetch = Date.now();
          console.log(`✅ Loaded ${this.cache.length} RSS items from cache`);
        } else if (data.items && Array.isArray(data.items)) {
          this.cache = data.items;
          this.lastFetch = data.timestamp || Date.now();
          console.log(`✅ Loaded ${this.cache.length} RSS items from structured cache`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load RSS cache:', error);
      this.cache = [];
    }
  }
  
  /**
   * Fetch and parse RSS feed using Bun's native fetch
   */
  async fetchFeed(feedUrl?: string): Promise<RSSItem[]> {
    const url = feedUrl || this.config.feedUrl!;
    
    // Use cache if recent
    if (Date.now() - this.lastFetch < this.config.updateInterval! && this.cache.length > 0) {
      console.log(`📦 Using cached RSS feed (${this.cache.length} items)`);
      return this.cache;
    }
    
    console.log(`🌐 Fetching RSS feed from: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent!,
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const xml = await response.text();
      
      // Parse RSS/Atom feed
      const items = this.parseRSS(xml);
      
      // Limit items if specified
      const limitedItems = items.slice(0, this.config.maxItems);
      
      // Cache results
      this.cache = limitedItems;
      this.lastFetch = Date.now();
      
      // Save to file with metadata
      const cacheData = {
        timestamp: this.lastFetch,
        source: url,
        items: limitedItems,
        total: limitedItems.length
      };
      
      await Bun.write(this.cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`✅ Cached ${limitedItems.length} RSS items to ${this.cacheFile}`);
      
      return limitedItems;
      
    } catch (error) {
      console.error('❌ Failed to fetch RSS feed:', error);
      
      // Return stale cache if available
      if (this.cache.length > 0) {
        console.log(`📦 Using stale cache (${this.cache.length} items)`);
        return this.cache;
      }
      
      throw error;
    }
  }
  
  /**
   * Parse RSS/Atom feed (enhanced parsing)
   */
  private parseRSS(xml: string): RSSItem[] {
    const items: RSSItem[] = [];
    
    // Try RSS 2.0 format first
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const matches = xml.matchAll(itemRegex);
    
    for (const match of matches) {
      const itemXml = match[1];
      const item = this.parseRSSItem(itemXml);
      
      if (item.title && item.link) {
        items.push(item);
      }
    }
    
    // If no RSS items found, try Atom format
    if (items.length === 0) {
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      const entryMatches = xml.matchAll(entryRegex);
      
      for (const match of entryMatches) {
        const entryXml = match[1];
        const item = this.parseAtomEntry(entryXml);
        
        if (item.title && item.link) {
          items.push(item);
        }
      }
    }
    
    // Sort by publication date (newest first)
    items.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });
    
    return items;
  }
  
  /**
   * Parse individual RSS item
   */
  private parseRSSItem(itemXml: string): RSSItem {
    const title = this.extractTag(itemXml, 'title') || this.extractTag(itemXml, 'title', 'content:encoded');
    const link = this.extractTag(itemXml, 'link');
    const description = this.extractTag(itemXml, 'description') || this.extractTag(itemXml, 'description', 'content:encoded');
    const pubDate = this.extractTag(itemXml, 'pubDate') || this.extractTag(itemXml, 'dc:date');
    const guid = this.extractTag(itemXml, 'guid');
    const author = this.extractTag(itemXml, 'author') || this.extractTag(itemXml, 'dc:creator');
    
    // Extract categories
    const categories: string[] = [];
    const categoryRegex = /<category[^>]*>([^<]*)<\/category>/g;
    const categoryMatches = itemXml.matchAll(categoryRegex);
    for (const match of categoryMatches) {
      const category = match[1]?.trim();
      if (category) {
        categories.push(category);
      }
    }
    
    return {
      title: this.cleanText(title),
      link: link.trim(),
      description: this.cleanText(description),
      pubDate: pubDate || new Date().toISOString(),
      category: categories.length > 0 ? categories : undefined,
      guid: guid || link,
      author: author ? this.cleanText(author) : undefined
    };
  }
  
  /**
   * Parse Atom entry
   */
  private parseAtomEntry(entryXml: string): RSSItem {
    const title = this.extractTag(entryXml, 'title');
    const link = this.extractAtomLink(entryXml);
    const description = this.extractTag(entryXml, 'summary') || this.extractTag(entryXml, 'content');
    const pubDate = this.extractTag(entryXml, 'published') || this.extractTag(entryXml, 'updated');
    const author = this.extractAtomAuthor(entryXml);
    
    return {
      title: this.cleanText(title),
      link,
      description: this.cleanText(description),
      pubDate: pubDate || new Date().toISOString(),
      author: author ? this.cleanText(author) : undefined
    };
  }
  
  /**
   * Extract tag content with namespace support
   */
  private extractTag(xml: string, tag: string, fallback?: string): string {
    // Try primary tag
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'i');
    let match = xml.match(regex);
    
    if (!match && fallback) {
      // Try fallback tag
      const fallbackRegex = new RegExp(`<${fallback}[^>]*>([\\s\\S]*?)<\/${fallback}>`, 'i');
      match = xml.match(fallbackRegex);
    }
    
    if (!match) return '';
    
    // Clean up CDATA and HTML entities
    let content = match[1];
    content = content.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
    content = this.unescapeHtmlEntities(content);
    
    return content.trim();
  }
  
  /**
   * Extract Atom link
   */
  private extractAtomLink(entryXml: string): string {
    const linkRegex = /<link[^>]*href=["']([^"']+)["'][^>]*>/i;
    const match = entryXml.match(linkRegex);
    return match ? match[1] : '';
  }
  
  /**
   * Extract Atom author
   */
  private extractAtomAuthor(entryXml: string): string {
    const authorRegex = /<author[^>]*>([\\s\\S]*?)<\/author>/i;
    const authorMatch = entryXml.match(authorRegex);
    
    if (authorMatch) {
      const nameRegex = /<name[^>]*>([^<]*)<\/name>/i;
      const nameMatch = authorMatch[1].match(nameRegex);
      return nameMatch ? nameMatch[1] : '';
    }
    
    return '';
  }
  
  /**
   * Clean text content
   */
  private cleanText(text: string): string {
    return text
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
  
  /**
   * Unescape HTML entities
   */
  private unescapeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
  
  /**
   * Generate documentation RSS feed
   */
  async generateDocsFeed(customItems?: RSSItem[]): Promise<string> {
    const items = customItems || await this.fetchFeed();
    const now = new Date().toISOString();
    
    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Bun Documentation Updates</title>
  <link>${this.env.baseUrl}</link>
  <description>Latest updates to Bun documentation and releases</description>
  <language>en-us</language>
  <lastBuildDate>${now}</lastBuildDate>
  <generator>Bun RSS Service v1.0</generator>
  <atom:link href="${this.env.feedUrl}" rel="self" type="application/rss+xml" />
  
  ${items.map(item => `
  <item>
    <title>${this.escapeXml(item.title)}</title>
    <link>${this.escapeXml(item.link)}</link>
    <description>${this.escapeXml(item.description)}</description>
    <pubDate>${item.pubDate}</pubDate>
    <guid>${this.escapeXml(item.guid || item.link)}</guid>
    ${item.author ? `<author>${this.escapeXml(item.author)}</author>` : ''}
    ${item.category ? item.category.map(cat => `<category>${this.escapeXml(cat)}</category>`).join('\n    ') : ''}
  </item>`).join('')}
</channel>
</rss>`;
    
    return feed;
  }
  
  /**
   * Escape XML entities
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * Serve RSS feed via HTTP
   */
  async serveFeed(customItems?: RSSItem[]): Promise<Response> {
    const feed = await this.generateDocsFeed(customItems);
    
    return new Response(feed, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': `max-age=${Math.floor(this.config.updateInterval! / 1000)}`,
        'Last-Modified': new Date().toUTCString(),
        'ETag': `"${Bun.hash(feed).toString(36)}"`,
        'X-RSS-Items': this.cache.length.toString(),
        'X-RSS-Last-Update': new Date(this.lastFetch).toISOString()
      }
    });
  }
  
  /**
   * Get feed statistics
   */
  getStats() {
    return {
      totalItems: this.cache.length,
      lastFetch: new Date(this.lastFetch).toISOString(),
      nextUpdate: new Date(this.lastFetch + this.config.updateInterval!).toISOString(),
      cacheFile: this.cacheFile,
      feedUrl: this.config.feedUrl,
      updateInterval: this.config.updateInterval,
      stale: Date.now() - this.lastFetch > this.config.updateInterval!
    };
  }
  
  /**
   * Force refresh the feed
   */
  async refreshFeed(): Promise<RSSItem[]> {
    console.log('🔄 Forcing RSS feed refresh...');
    this.lastFetch = 0; // Force refresh
    return await this.fetchFeed();
  }
  
  /**
   * Search items by title or description
   */
  searchItems(query: string): RSSItem[] {
    const lowerQuery = query.toLowerCase();
    return this.cache.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.category?.some(cat => cat.toLowerCase().includes(lowerQuery))
    );
  }
  
  /**
   * Get items by category
   */
  getItemsByCategory(category: string): RSSItem[] {
    return this.cache.filter(item => 
      item.category?.some(cat => cat.toLowerCase() === category.toLowerCase())
    );
  }
}

// Singleton instance
export const rssService = new RSSService();

// Convenience functions
export const fetchRSSFeed = (feedUrl?: string) => rssService.fetchFeed(feedUrl);
export const serveRSSFeed = (customItems?: RSSItem[]) => rssService.serveFeed(customItems);
export const getRSSStats = () => rssService.getStats();
export const searchRSS = (query: string) => rssService.searchItems(query);
