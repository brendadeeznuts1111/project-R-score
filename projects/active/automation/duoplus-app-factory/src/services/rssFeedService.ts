/**
 * RSS Feed Service
 * 
 * Supports:
 * - Fetching and parsing external RSS feeds (e.g., https://bun.sh/rss.xml)
 * - Generating our own RSS feed for dashboard updates
 * - Caching to reduce external API calls
 */

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid?: string;
  author?: string;
  category?: string[];
}

export interface RSSFeed {
  title: string;
  link: string;
  description: string;
  language?: string;
  lastBuildDate?: string;
  items: RSSItem[];
}

interface CacheEntry {
  feed: RSSFeed;
  fetchedAt: number;
  expiresAt: number;
}

// Cache for external feeds (5 minute TTL by default)
const feedCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Dashboard news items for our own RSS feed
const dashboardNews: RSSItem[] = [];

/**
 * Parse RSS XML into structured feed object
 */
export function parseRSSXML(xml: string): RSSFeed {
  // Simple XML parsing using regex (works for standard RSS 2.0)
  const getTag = (content: string, tag: string): string => {
    const match = content.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? match[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') : '';
  };

  const getAllTags = (content: string, tag: string): string[] => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'));
    }
    return matches;
  };

  const channel = getTag(xml, 'channel');
  
  // Parse items
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const items: RSSItem[] = [];
  let itemMatch;
  
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemContent = itemMatch[1];
    items.push({
      title: getTag(itemContent, 'title'),
      link: getTag(itemContent, 'link'),
      description: getTag(itemContent, 'description'),
      pubDate: getTag(itemContent, 'pubDate'),
      guid: getTag(itemContent, 'guid') || undefined,
      author: getTag(itemContent, 'author') || getTag(itemContent, 'dc:creator') || undefined,
      category: getAllTags(itemContent, 'category').filter(Boolean),
    });
  }

  return {
    title: getTag(channel, 'title'),
    link: getTag(channel, 'link'),
    description: getTag(channel, 'description'),
    language: getTag(channel, 'language') || undefined,
    lastBuildDate: getTag(channel, 'lastBuildDate') || undefined,
    items,
  };
}

/**
 * Fetch and parse an external RSS feed
 */
export async function fetchRSSFeed(
  url: string, 
  options: { cacheTTL?: number; forceRefresh?: boolean } = {}
): Promise<RSSFeed> {
  const { cacheTTL = DEFAULT_CACHE_TTL, forceRefresh = false } = options;
  
  // Check cache
  if (!forceRefresh) {
    const cached = feedCache.get(url);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.feed;
    }
  }

  // Fetch fresh feed
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/rss+xml, application/xml, text/xml',
      'User-Agent': 'DuoPlus-Dashboard/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const feed = parseRSSXML(xml);

  // Cache the result
  feedCache.set(url, {
    feed,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + cacheTTL,
  });

  return feed;
}

/**
 * Fetch Bun.sh RSS feed
 */
export async function fetchBunFeed(forceRefresh = false): Promise<RSSFeed> {
  return fetchRSSFeed('https://bun.sh/rss.xml', { forceRefresh });
}

/**
 * Add a news item to our dashboard RSS feed
 */
export function addDashboardNewsItem(item: Omit<RSSItem, 'pubDate' | 'guid'>): void {
  dashboardNews.unshift({
    ...item,
    pubDate: new Date().toUTCString(),
    guid: `dashboard-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
  // Keep only last 50 items
  if (dashboardNews.length > 50) {
    dashboardNews.pop();
  }
}

/**
 * Generate our own RSS XML feed
 */
export function generateDashboardRSS(): string {
  const items = dashboardNews.map(item => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate}</pubDate>
      ${item.guid ? `<guid isPermaLink="false">${item.guid}</guid>` : ''}
      ${item.author ? `<author>${item.author}</author>` : ''}
      ${item.category?.map(c => `<category>${c}</category>`).join('') || ''}
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DuoPlus Dashboard Updates</title>
    <link>http://localhost:3000</link>
    <description>Lightning Network Testing Dashboard - Updates and Announcements</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="http://localhost:3000/api/rss" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}

