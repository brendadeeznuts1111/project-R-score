#!/usr/bin/env bun
/**
 * RSS Feed Reader CLI
 * 
 * View RSS feeds in the terminal with support for:
 * - Bun.sh official feed
 * - Dashboard updates feed
 * - Custom RSS feeds
 * - Auto-refresh/watch mode
 */

import { parseArgs } from "util";

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid?: string;
  author?: string;
  category?: string[];
}

interface RSSFeed {
  title: string;
  link: string;
  description: string;
  language?: string;
  lastBuildDate?: string;
  items: RSSItem[];
}

function parseRSSXML(xml: string): RSSFeed {
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

async function fetchFeed(url: string): Promise<RSSFeed> {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/rss+xml, application/xml, text/xml',
      'User-Agent': 'DuoPlus-RSS-Reader/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseRSSXML(xml);
}

function displayFeed(feed: RSSFeed, maxItems: number = 10): void {
  console.clear();
  console.log('\n📰 ' + '='.repeat(70));
  console.log(`📰 ${feed.title}`);
  console.log('📰 ' + '='.repeat(70));
  console.log(`\n📝 ${feed.description}`);
  console.log(`🔗 ${feed.link}`);
  console.log(`⏰ Last updated: ${feed.lastBuildDate || 'Unknown'}\n`);

  const items = feed.items.slice(0, maxItems);
  items.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.title}`);
    console.log(`   🔗 ${item.link}`);
    console.log(`   📅 ${new Date(item.pubDate).toLocaleString()}`);
    if (item.author) console.log(`   ✍️  ${item.author}`);
    if (item.category?.length) console.log(`   🏷️  ${item.category.join(', ')}`);
    console.log(`   📄 ${item.description.substring(0, 150)}${item.description.length > 150 ? '...' : ''}`);
  });

  console.log('\n' + '='.repeat(72) + '\n');
}

async function main() {
  const args = parseArgs({
    options: {
      feed: { type: 'string', short: 'f', default: 'dashboard' },
      watch: { type: 'boolean', short: 'w', default: false },
      items: { type: 'string', short: 'i', default: '10' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (args.values.help) {
    console.log(`
📰 DuoPlus RSS Feed Reader

Usage: bun run rss-reader [options]

Options:
  -f, --feed <name>     Feed to display (default: dashboard)
                        - 'dashboard': Dashboard updates
                        - 'bun': Bun.sh official feed
                        - URL: Custom RSS feed URL
  -w, --watch           Auto-refresh feed every 5 minutes
  -i, --items <count>   Number of items to display (default: 10)
  -h, --help            Show this help message

Examples:
  bun run rss-reader --feed dashboard
  bun run rss-reader --feed bun --watch
  bun run rss-reader --feed https://example.com/feed.xml
    `);
    process.exit(0);
  }

  const feedName = args.values.feed as string;
  const watch = args.values.watch as boolean;
  const maxItems = parseInt(args.values.items as string, 10) || 10;

  let feedUrl: string;
  switch (feedName) {
    case 'dashboard':
      feedUrl = 'http://localhost:3000/api/rss';
      break;
    case 'bun':
      feedUrl = 'http://localhost:3000/api/rss/bun';
      break;
    default:
      feedUrl = feedName;
  }

  const displayFeedWithError = async () => {
    try {
      console.log(`\n⏳ Fetching feed from ${feedUrl}...`);
      const feed = await fetchFeed(feedUrl);
      displayFeed(feed, maxItems);
    } catch (error) {
      console.clear();
      console.log(`\n❌ Error fetching feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log(`\n💡 Make sure the server is running: bun run web-app/server.js\n`);
    }
  };

  await displayFeedWithError();

  if (watch) {
    console.log('👀 Watching for updates (refreshing every 5 minutes)...');
    console.log('Press Ctrl+C to stop\n');
    setInterval(displayFeedWithError, 5 * 60 * 1000);
  }
}

main().catch(console.error);

