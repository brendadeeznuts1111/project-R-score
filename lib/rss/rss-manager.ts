#!/usr/bin/env bun

/**
 * 📰 RSS Feed Integration with Caching
 * 
 * Manages RSS feeds for packages, with caching, R2 storage integration,
 * and package-specific feed generation.
 */

import type { PackageInfo } from '../package/package-manager.ts';

export interface RSSFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
  category?: string[];
  guid: string;
}

export interface RSSFeed {
  title: string;
  link: string;
  description: string;
  items: RSSFeedItem[];
  lastBuildDate: string;
  ttl: number;
}

export interface FeedSubscription {
  url: string;
  name: string;
  category: string;
  lastFetched: Date;
  updateFrequency: number; // minutes
}

export class RSSManager {
  private feeds: Map<string, RSSFeed>;
  private subscriptions: FeedSubscription[];
  private cache: Map<string, {feed: RSSFeed, timestamp: number}>;
  private r2Storage?: any; // R2Storage type

  constructor(r2Storage?: any) {
    this.feeds = new Map();
    this.subscriptions = [];
    this.cache = new Map();
    this.r2Storage = r2Storage;
    this.loadSubscriptions();
  }

  async subscribe(feedUrl: string, name: string, category: string = 'general'): Promise<void> {
    const subscription: FeedSubscription = {
      url: feedUrl,
      name,
      category,
      lastFetched: new Date(),
      updateFrequency: 60 // 1 hour default
    };

    this.subscriptions.push(subscription);
    await this.saveSubscriptions();
    
    // Fetch immediately
    await this.fetchFeed(feedUrl);
  }

  async fetchFeed(feedUrl: string): Promise<RSSFeed> {
    // Check cache first
    const cached = this.cache.get(feedUrl);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.feed;
    }

    try {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Bun-Docs-RSS/1.0'
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const xml = await response.text();
      const feed = this.parseRSS(xml);
      
      // Cache for 5 minutes
      this.cache.set(feedUrl, { feed, timestamp: Date.now() });
      
      // Store in R2 if available
      if (this.r2Storage) {
        await this.r2Storage.putJson(`rss/${feedUrl.replace(/[^a-zA-Z0-9]/g, '-')}.json`, feed);
      }
      
      return feed;
    } catch (error) {
      console.error(`Failed to fetch RSS feed ${feedUrl}:`, error);
      
      // Try to get from R2 cache
      if (this.r2Storage) {
        const cachedFeed = await this.r2Storage.getJson(`rss/${feedUrl.replace(/[^a-zA-Z0-9]/g, '-')}.json`);
        if (cachedFeed) return cachedFeed;
      }
      
      throw error;
    }
  }

  async fetchAll(): Promise<Map<string, RSSFeed>> {
    const results = new Map();
    
    for (const subscription of this.subscriptions) {
      try {
        const feed = await this.fetchFeed(subscription.url);
        results.set(subscription.name, feed);
        subscription.lastFetched = new Date();
      } catch (error) {
        console.error(`Failed to fetch ${subscription.name}:`, error);
      }
    }
    
    await this.saveSubscriptions();
    return results;
  }

  async getPackageFeeds(packageName: string): Promise<RSSFeed[]> {
    const feeds: RSSFeed[] = [];
    
    // Common RSS feeds for packages
    const potentialFeeds = [
      `https://www.npmjs.com/package/${packageName}/rss`,
      `https://github.com/${packageName}/releases.atom`,
      `https://github.com/${packageName}/commits.atom`
    ];
    
    for (const feedUrl of potentialFeeds) {
      try {
        const feed = await this.fetchFeed(feedUrl);
        feeds.push(feed);
      } catch {
        // Ignore failed feeds
      }
    }
    
    return feeds;
  }

  async generatePackageFeed(packageName: string, packageInfo: PackageInfo): Promise<RSSFeed> {
    const feed: RSSFeed = {
      title: `${packageName} - Bun Documentation`,
      link: `https://bun.com/docs/packages/${packageName}`,
      description: `Documentation updates for ${packageName}`,
      items: [],
      lastBuildDate: new Date().toISOString(),
      ttl: 1440 // 24 hours
    };

    // Add Bun API documentation as feed items
    if (packageInfo.bunDocs) {
      for (const doc of packageInfo.bunDocs) {
        feed.items.push({
          title: `${doc.api} - ${packageName}`,
          link: doc.url,
          description: `Documentation for ${doc.api} API used in ${packageName}`,
          pubDate: new Date().toISOString(),
          category: [doc.category],
          guid: `bun:${packageName}:${doc.api}`
        });
      }
    }

    // Add dependency updates
    for (const [dep, version] of Object.entries(packageInfo.dependencies || {})) {
      feed.items.push({
        title: `Dependency: ${dep}@${version}`,
        link: `https://www.npmjs.com/package/${dep}`,
        description: `Package depends on ${dep} version ${version}`,
        pubDate: new Date().toISOString(),
        category: ['dependencies'],
        guid: `dep:${packageName}:${dep}:${version}`
      });
    }

    return feed;
  }

  async publishPackageFeed(packageName: string, feed: RSSFeed): Promise<string> {
    if (!this.r2Storage) {
      throw new Error('R2 storage required for publishing feeds');
    }

    const xml = this.generateRSS(feed);
    const bucket = await this.r2Storage.getOrCreateBucket(packageName);
    
    await this.r2Storage.put(bucket, `feeds/${packageName}.rss`, Buffer.from(xml));
    
    return `https://${bucket}.${this.r2Storage['config'].accountId}.r2.dev/feeds/${packageName}.rss`;
  }

  private parseRSS(xml: string): RSSFeed {
    // Simplified RSS parsing
    const title = xml.match(/<title>([^<]+)<\/title>/)?.[1] || 'Untitled';
    const link = xml.match(/<link>([^<]+)<\/link>/)?.[1] || '';
    const description = xml.match(/<description>([^<]+)<\/description>/)?.[1] || '';
    
    const items: RSSFeedItem[] = [];
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    for (const item of itemMatches) {
      const itemTitle = item.match(/<title>([^<]+)<\/title>/)?.[1];
      const itemLink = item.match(/<link>([^<]+)<\/link>/)?.[1];
      const itemDesc = item.match(/<description>([^<]+)<\/description>/)?.[1];
      const itemDate = item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1];
      
      if (itemTitle && itemLink) {
        items.push({
          title: itemTitle,
          link: itemLink,
          description: itemDesc || '',
          pubDate: itemDate || new Date().toISOString(),
          guid: itemLink
        });
      }
    }
    
    return {
      title,
      link,
      description,
      items,
      lastBuildDate: new Date().toISOString(),
      ttl: 60
    };
  }

  private generateRSS(feed: RSSFeed): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${feed.title}</title>
    <link>${feed.link}</link>
    <description>${feed.description}</description>
    <lastBuildDate>${feed.lastBuildDate}</lastBuildDate>
    <ttl>${feed.ttl}</ttl>
    
    ${feed.items.map(item => `
    <item>
      <title>${item.title}</title>
      <link>${item.link}</link>
      <description>${item.description}</description>
      <pubDate>${item.pubDate}</pubDate>
      <guid>${item.guid}</guid>
      ${item.category ? `<category>${item.category.join(', ')}</category>` : ''}
    </item>
    `).join('')}
  </channel>
</rss>`;
  }

  private async loadSubscriptions(): Promise<void> {
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
      const subscriptionsFile = Bun.file(`${homeDir}/.config/bun-docs/subscriptions.json`);
      if (await subscriptionsFile.exists()) {
        this.subscriptions = await subscriptionsFile.json() as FeedSubscription[];
      }
    } catch (error) {
      console.warn('Failed to load subscriptions:', error);
    }
  }

  private async saveSubscriptions(): Promise<void> {
    try {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
      await Bun.write(
        `${homeDir}/.config/bun-docs/subscriptions.json`,
        JSON.stringify(this.subscriptions, null, 2)
      );
    } catch (error) {
      console.warn('Failed to save subscriptions:', error);
    }
  }
}
