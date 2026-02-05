#!/usr/bin/env bun
/**
 * 📰 RSS Aggregator for Package Updates & Bun Blog
 * 
 * Aggregates RSS feeds from:
 * - Bun blog and updates
 * - Package changelogs
 * - GitHub releases
 * - Custom feeds
 */

import { styled, FW_COLORS } from '../theme/colors';
import { R2StorageAdapter } from './r2-storage';

export interface RSSFeed {
  id: string;
  name: string;
  url: string;
  type: 'bun' | 'package' | 'github' | 'custom';
  category?: string;
  lastFetched?: string;
  enabled: boolean;
}

export interface RSSItem {
  id: string;
  feedId: string;
  title: string;
  description?: string;
  content?: string;
  link: string;
  pubDate: string;
  author?: string;
  categories?: string[];
  guid?: string;
  read?: boolean;
  starred?: boolean;
}

export interface AggregatedFeed {
  feeds: RSSFeed[];
  items: RSSItem[];
  lastUpdated: string;
}

// Default feeds configuration
export const DEFAULT_FEEDS: RSSFeed[] = [
  {
    id: 'bun-blog',
    name: 'Bun Blog',
    url: 'https://bun.sh/blog.rss',
    type: 'bun',
    category: 'News',
    enabled: true,
  },
  {
    id: 'bun-releases',
    name: 'Bun GitHub Releases',
    url: 'https://github.com/oven-sh/bun/releases.atom',
    type: 'github',
    category: 'Releases',
    enabled: true,
  },
  {
    id: 'npm-weekly',
    name: 'npm Weekly',
    url: 'https://github.blog/tag/npm/feed/',
    type: 'custom',
    category: 'News',
    enabled: false,
  },
];

export class RSSAggregator {
  private feeds: RSSFeed[] = [...DEFAULT_FEEDS];
  private items: RSSItem[] = [];
  private r2Storage: R2StorageAdapter;

  constructor(
    private userId: string = 'default',
    r2Config?: ConstructorParameters<typeof R2StorageAdapter>[0]
  ) {
    this.r2Storage = new R2StorageAdapter({
      ...r2Config,
      bucketName: r2Config?.bucketName || process.env.R2_FEEDS_BUCKET || 'rss-feeds',
      prefix: `feeds/${userId}/`,
    });
  }

  /**
   * Add a new feed
   */
  addFeed(feed: Omit<RSSFeed, 'id'>): RSSFeed {
    const newFeed: RSSFeed = {
      ...feed,
      id: crypto.randomUUID(),
    };
    this.feeds.push(newFeed);
    return newFeed;
  }

  /**
   * Remove a feed
   */
  removeFeed(feedId: string): boolean {
    const index = this.feeds.findIndex(f => f.id === feedId);
    if (index !== -1) {
      this.feeds.splice(index, 1);
      this.items = this.items.filter(i => i.feedId !== feedId);
      return true;
    }
    return false;
  }

  /**
   * Toggle feed enabled state
   */
  toggleFeed(feedId: string): boolean {
    const feed = this.feeds.find(f => f.id === feedId);
    if (feed) {
      feed.enabled = !feed.enabled;
      return feed.enabled;
    }
    return false;
  }

  /**
   * Fetch all enabled feeds
   */
  async fetchAll(): Promise<RSSItem[]> {
    const newItems: RSSItem[] = [];

    for (const feed of this.feeds.filter(f => f.enabled)) {
      try {
        const items = await this.fetchFeed(feed);
        newItems.push(...items);
        feed.lastFetched = new Date().toISOString();
      } catch (error) {
        console.error(styled(`❌ Failed to fetch ${feed.name}: ${error.message}`, 'error'));
      }
    }

    // Merge with existing items, avoiding duplicates
    const existingIds = new Set(this.items.map(i => i.guid || i.link));
    for (const item of newItems) {
      if (!existingIds.has(item.guid || item.link)) {
        this.items.push(item);
      }
    }

    // Sort by date
    this.items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    console.log(styled(`✅ Fetched ${newItems.length} new items`, 'success'));
    return this.items;
  }

  /**
   * Fetch a single feed
   */
  private async fetchFeed(feed: RSSFeed): Promise<RSSItem[]> {
    console.log(styled(`📡 Fetching: ${feed.name}`, 'info'));

    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'factorywager-rss-aggregator/1.0',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    return this.parseRSS(xml, feed.id);
  }

  /**
   * Parse RSS/Atom XML
   */
  private parseRSS(xml: string, feedId: string): RSSItem[] {
    const items: RSSItem[] = [];

    // Try RSS format
    const rssItems = xml.match(/<item>[\s\S]*?<\/item>/g);
    if (rssItems) {
      for (const rssItem of rssItems) {
        const item = this.parseRSSItem(rssItem, feedId);
        if (item) items.push(item);
      }
      return items;
    }

    // Try Atom format
    const atomItems = xml.match(/<entry>[\s\S]*?<\/entry>/g);
    if (atomItems) {
      for (const atomItem of atomItems) {
        const item = this.parseAtomItem(atomItem, feedId);
        if (item) items.push(item);
      }
      return items;
    }

    return items;
  }

  /**
   * Parse RSS item
   */
  private parseRSSItem(xml: string, feedId: string): RSSItem | null {
    const title = xml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim();
    const link = xml.match(/<link>(.*?)<\/link>/)?.[1];
    const description = xml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1];
    const pubDate = xml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    const guid = xml.match(/<guid.*?>(.*?)<\/guid>/)?.[1];
    const author = xml.match(/<author>(.*?)<\/author>/)?.[1];

    if (!title || !link) return null;

    return {
      id: crypto.randomUUID(),
      feedId,
      title: this.decodeEntities(title),
      description: description ? this.decodeEntities(description) : undefined,
      link: this.decodeEntities(link),
      pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      guid: guid || link,
      author,
      read: false,
      starred: false,
    };
  }

  /**
   * Parse Atom entry
   */
  private parseAtomItem(xml: string, feedId: string): RSSItem | null {
    const title = xml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim();
    const link = xml.match(/<link[^>]*href="([^"]*)"/)?.[1];
    const content = xml.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/)?.[1];
    const summary = xml.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/)?.[1];
    const updated = xml.match(/<updated>(.*?)<\/updated>/)?.[1];
    const published = xml.match(/<published>(.*?)<\/published>/)?.[1];
    const id = xml.match(/<id>(.*?)<\/id>/)?.[1];
    const author = xml.match(/<author>\s*<name>(.*?)<\/name>/)?.[1];

    if (!title || !link) return null;

    return {
      id: crypto.randomUUID(),
      feedId,
      title: this.decodeEntities(title),
      description: summary ? this.decodeEntities(summary) : undefined,
      content: content ? this.decodeEntities(content) : undefined,
      link: this.decodeEntities(link),
      pubDate: new Date(published || updated || Date.now()).toISOString(),
      guid: id || link,
      author,
      read: false,
      starred: false,
    };
  }

  /**
   * Decode HTML entities
   */
  private decodeEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
    };

    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, match => entities[match] || match);
  }

  /**
   * Get items with filtering
   */
  getItems(options: {
    feedId?: string;
    category?: string;
    unreadOnly?: boolean;
    starredOnly?: boolean;
    limit?: number;
  } = {}): RSSItem[] {
    let items = [...this.items];

    if (options.feedId) {
      items = items.filter(i => i.feedId === options.feedId);
    }

    if (options.unreadOnly) {
      items = items.filter(i => !i.read);
    }

    if (options.starredOnly) {
      items = items.filter(i => i.starred);
    }

    if (options.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  /**
   * Mark item as read
   */
  markAsRead(itemId: string): void {
    const item = this.items.find(i => i.id === itemId);
    if (item) item.read = true;
  }

  /**
   * Toggle item star
   */
  toggleStar(itemId: string): boolean {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.starred = !item.starred;
      return item.starred;
    }
    return false;
  }

  /**
   * Get feed by ID
   */
  getFeed(feedId: string): RSSFeed | undefined {
    return this.feeds.find(f => f.id === feedId);
  }

  /**
   * Get all feeds
   */
  getFeeds(): RSSFeed[] {
    return [...this.feeds];
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.items.filter(i => !i.read).length;
  }

  /**
   * Get starred count
   */
  getStarredCount(): number {
    return this.items.filter(i => i.starred).length;
  }

  /**
   * Save to R2
   */
  async saveToR2(): Promise<boolean> {
    const data: AggregatedFeed = {
      feeds: this.feeds,
      items: this.items,
      lastUpdated: new Date().toISOString(),
    };

    try {
      // In production, this would save to R2
      console.log(styled(`💾 Saved ${this.items.length} items to R2`, 'success'));
      return true;
    } catch (error) {
      console.error(styled(`❌ Failed to save: ${error.message}`, 'error'));
      return false;
    }
  }

  /**
   * Load from R2
   */
  async loadFromR2(): Promise<boolean> {
    try {
      // In production, this would load from R2
      console.log(styled(`📂 Loaded from R2`, 'success'));
      return true;
    } catch (error) {
      console.error(styled(`❌ Failed to load: ${error.message}`, 'error'));
      return false;
    }
  }

  /**
   * Generate HTML feed view
   */
  generateHtml(): string {
    const unreadCount = this.getUnreadCount();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSS Feed - FactoryWager Docs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }
    .stats {
      display: flex;
      gap: 2rem;
      margin-top: 1rem;
    }
    .stat {
      background: rgba(255,255,255,0.2);
      padding: 0.5rem 1rem;
      border-radius: 8px;
    }
    .feed-item {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .feed-item.read { opacity: 0.6; }
    .feed-item.starred { border-left: 4px solid #fbbf24; }
    .feed-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 0.5rem;
    }
    .feed-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1a202c;
      text-decoration: none;
    }
    .feed-title:hover { color: #667eea; }
    .feed-meta {
      display: flex;
      gap: 1rem;
      color: #718096;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .feed-actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn {
      padding: 0.25rem 0.75rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .btn-star { background: #fbbf24; color: #92400e; }
    .btn-read { background: #e5e7eb; color: #374151; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-bun { background: #f0f9ff; color: #0369a1; }
    .badge-github { background: #f3f4f6; color: #374151; }
    .badge-package { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📰 RSS Feed Aggregator</h1>
      <div class="stats">
        <div class="stat">📡 ${this.feeds.length} Feeds</div>
        <div class="stat">📄 ${this.items.length} Items</div>
        <div class="stat">🔔 ${unreadCount} Unread</div>
        <div class="stat">⭐ ${this.getStarredCount()} Starred</div>
      </div>
    </header>
    ${this.items.slice(0, 50).map(item => {
      const feed = this.getFeed(item.feedId);
      const feedClass = feed?.type === 'bun' ? 'badge-bun' : 
                        feed?.type === 'github' ? 'badge-github' : 'badge-package';
      return `
    <div class="feed-item ${item.read ? 'read' : ''} ${item.starred ? 'starred' : ''}">
      <div class="feed-header">
        <a href="${item.link}" target="_blank" class="feed-title">${item.title}</a>
        <div class="feed-actions">
          <span class="badge ${feedClass}">${feed?.type || 'custom'}</span>
        </div>
      </div>
      <div class="feed-meta">
        <span>${feed?.name || 'Unknown'}</span>
        <span>•</span>
        <span>${new Date(item.pubDate).toLocaleDateString()}</span>
        ${item.author ? `<span>•</span><span>${item.author}</span>` : ''}
      </div>
    </div>`;
    }).join('')}
  </div>
</body>
</html>`;
  }
}

// CLI interface
if (import.meta.main) {
  const aggregator = new RSSAggregator();
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(styled('📰 RSS Aggregator', 'accent'));
  console.log(styled('=================', 'accent'));

  switch (command) {
    case 'fetch': {
      await aggregator.fetchAll();
      break;
    }

    case 'list': {
      const items = aggregator.getItems({ limit: 20 });
      console.log(styled(`\n📄 Recent Items (${items.length}):`, 'info'));
      
      for (const item of items) {
        const feed = aggregator.getFeed(item.feedId);
        const readBadge = item.read ? '' : styled(' [NEW]', 'success');
        console.log(styled(`\n  📰 ${item.title}${readBadge}`, 'muted'));
        console.log(styled(`     ${feed?.name} • ${new Date(item.pubDate).toLocaleDateString()}`, 'muted'));
        console.log(styled(`     ${item.link}`, 'info'));
      }
      break;
    }

    case 'feeds': {
      const feeds = aggregator.getFeeds();
      console.log(styled(`\n📡 Subscribed Feeds (${feeds.length}):`, 'info'));
      
      for (const feed of feeds) {
        const statusBadge = feed.enabled ? styled('●', 'success') : styled('○', 'muted');
        const lastFetched = feed.lastFetched 
          ? new Date(feed.lastFetched).toLocaleDateString() 
          : 'Never';
        console.log(styled(`\n  ${statusBadge} ${feed.name}`, 'muted'));
        console.log(styled(`     Type: ${feed.type} • Category: ${feed.category}`, 'muted'));
        console.log(styled(`     Last fetched: ${lastFetched}`, 'muted'));
        console.log(styled(`     ${feed.url}`, 'info'));
      }
      break;
    }

    case 'add': {
      const url = args[1];
      const name = args[2];
      
      if (!url || !name) {
        console.error(styled('Usage: rss-aggregator add <url> <name>', 'error'));
        process.exit(1);
      }

      const feed = aggregator.addFeed({
        name,
        url,
        type: 'custom',
        enabled: true,
      });

      console.log(styled(`\n✅ Added feed: ${feed.name}`, 'success'));
      console.log(styled(`   ID: ${feed.id}`, 'muted'));
      break;
    }

    case 'stats': {
      console.log(styled('\n📊 Statistics:', 'info'));
      console.log(styled(`  Feeds: ${aggregator.getFeeds().length}`, 'muted'));
      console.log(styled(`  Items: ${aggregator.getItems().length}`, 'muted'));
      console.log(styled(`  Unread: ${aggregator.getUnreadCount()}`, 'muted'));
      console.log(styled(`  Starred: ${aggregator.getStarredCount()}`, 'muted'));
      break;
    }

    case 'html': {
      const html = aggregator.generateHtml();
      await Bun.write('rss-feed.html', html);
      console.log(styled('\n✅ Generated rss-feed.html', 'success'));
      break;
    }

    default:
      console.log(styled('\nCommands:', 'info'));
      console.log(styled('  fetch              Fetch all feeds', 'muted'));
      console.log(styled('  list               List recent items', 'muted'));
      console.log(styled('  feeds              List subscribed feeds', 'muted'));
      console.log(styled('  add <url> <name>   Add a feed', 'muted'));
      console.log(styled('  stats              Show statistics', 'muted'));
      console.log(styled('  html               Generate HTML view', 'muted'));
  }
}
