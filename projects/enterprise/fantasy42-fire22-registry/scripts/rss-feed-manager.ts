#!/usr/bin/env bun

/**
 * 📡 RSS Feed Manager
 *
 * Automated RSS feed generation and management system
 * for Fantasy42-Fire22 department communications
 */

import * as fs from 'fs';
import { join, basename } from 'path';
import { Database } from 'bun:sqlite';

interface RSSItem {
  id: string;
  title: string;
  description: string;
  link: string;
  author: string;
  category: string;
  pubDate: string;
  guid: string;
}

interface FeedConfig {
  department: string;
  title: string;
  description: string;
  link: string;
  language: string;
  managingEditor: string;
  webMaster: string;
  lastBuildDate: string;
  ttl: number;
}

class RSSFeedManager {
  private db: Database;
  private feedConfigs: Record<string, FeedConfig> = {};

  constructor() {
    this.db = new Database(':memory:');
    this.initializeDatabase();
    this.initializeFeedConfigs();
  }

  private initializeDatabase(): void {
    this.db.run(`
      CREATE TABLE rss_items (
        id TEXT PRIMARY KEY,
        department TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        link TEXT,
        author TEXT,
        category TEXT,
        pub_date TEXT NOT NULL,
        guid TEXT UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE feed_metadata (
        department TEXT PRIMARY KEY,
        item_count INTEGER DEFAULT 0,
        last_updated TEXT,
        last_item_date TEXT
      )
    `);
  }

  private initializeFeedConfigs(): void {
    const baseConfig = {
      description: 'Department updates and announcements',
      link: 'https://fire22.com',
      language: 'en-us',
      managingEditor: 'enterprise@fire22.com',
      webMaster: 'admin@fire22.com',
      ttl: 60
    };

    this.feedConfigs = {
      technology: {
        ...baseConfig,
        department: 'technology',
        title: 'Technology Department Updates',
        managingEditor: 'tech@fire22.com'
      },
      operations: {
        ...baseConfig,
        department: 'operations',
        title: 'Operations Department Updates',
        managingEditor: 'ops@fire22.com'
      },
      marketing: {
        ...baseConfig,
        department: 'marketing',
        title: 'Marketing Department Updates',
        managingEditor: 'marketing@fire22.com'
      },
      management: {
        ...baseConfig,
        department: 'management',
        title: 'Management Department Updates',
        managingEditor: 'mgmt@fire22.com'
      },
      finance: {
        ...baseConfig,
        department: 'finance',
        title: 'Finance Department Updates',
        managingEditor: 'finance@fire22.com'
      },
      design: {
        ...baseConfig,
        department: 'design',
        title: 'Design Department Updates',
        managingEditor: 'design@fire22.com'
      },
      contributors: {
        ...baseConfig,
        department: 'contributors',
        title: 'Team Contributors Updates',
        managingEditor: 'contributors@fire22.com'
      },
      compliance: {
        ...baseConfig,
        department: 'compliance',
        title: 'Compliance Department Updates',
        managingEditor: 'compliance@fire22.com'
      },
      communications: {
        ...baseConfig,
        department: 'communications',
        title: 'Communications Department Updates',
        managingEditor: 'comm@fire22.com'
      },
      support: {
        ...baseConfig,
        department: 'support',
        title: 'Support Department Updates',
        managingEditor: 'support@fire22.com'
      }
    };
  }

  async addItem(department: string, item: Omit<RSSItem, 'id' | 'guid'>): Promise<void> {
    const id = `${department}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const guid = `https://fire22.com/feeds/${department}/${id}`;

    this.db.run(
      `INSERT INTO rss_items (id, department, title, description, link, author, category, pub_date, guid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, department, item.title, item.description, item.link, item.author,
       item.category, item.pubDate, guid]
    );

    // Update feed metadata
    this.updateFeedMetadata(department);
  }

  async generateFeed(department: string, format: 'rss' | 'atom' = 'rss'): Promise<string> {
    const config = this.feedConfigs[department];
    if (!config) {
      throw new Error(`Unknown department: ${department}`);
    }

    const items = this.getItems(department, 50); // Get latest 50 items
    const lastBuildDate = new Date().toUTCString();

    if (format === 'atom') {
      return this.generateAtomFeed(config, items, lastBuildDate);
    } else {
      return this.generateRSSFeed(config, items, lastBuildDate);
    }
  }

  private generateRSSFeed(config: FeedConfig, items: RSSItem[], lastBuildDate: string): string {
    let feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${config.title}</title>
    <description>${config.description}</description>
    <link>${config.link}</link>
    <language>${config.language}</language>
    <managingEditor>${config.managingEditor}</managingEditor>
    <webMaster>${config.webMaster}</webMaster>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>${config.ttl}</ttl>
    <atom:link href="${config.link}/feeds/${config.department}.rss" rel="self" type="application/rss+xml" />
`;

    for (const item of items) {
      feed += `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <description><![CDATA[${item.description || ''}]]></description>
      <link>${item.link}</link>
      <author>${item.author}</author>
      <category>${item.category}</category>
      <pubDate>${item.pubDate}</pubDate>
      <guid>${item.guid}</guid>
    </item>`;
    }

    feed += `
  </channel>
</rss>`;

    return feed;
  }

  private generateAtomFeed(config: FeedConfig, items: RSSItem[], lastBuildDate: string): string {
    const atomDate = new Date().toISOString();

    let feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${config.title}</title>
  <subtitle>${config.description}</subtitle>
  <link href="${config.link}/feeds/${config.department}.atom" rel="self" />
  <link href="${config.link}" />
  <id>urn:fire22:${config.department}</id>
  <updated>${atomDate}</updated>
  <author>
    <name>Fire22 Enterprise</name>
    <email>${config.managingEditor}</email>
  </author>
`;

    for (const item of items) {
      const itemDate = new Date(item.pubDate).toISOString();
      feed += `
  <entry>
    <title>${item.title}</title>
    <summary>${item.description || ''}</summary>
    <link href="${item.link}" />
    <id>${item.guid}</id>
    <updated>${itemDate}</updated>
    <published>${itemDate}</published>
    <author>
      <name>${item.author}</name>
    </author>
    <category term="${item.category}" />
  </entry>`;
    }

    feed += `
</feed>`;

    return feed;
  }

  private getItems(department: string, limit: number = 50): RSSItem[] {
    const results = this.db.query(
      'SELECT * FROM rss_items WHERE department = ? ORDER BY pub_date DESC LIMIT ?'
    ).all(department, limit);

    return results as RSSItem[];
  }

  private updateFeedMetadata(department: string): void {
    const itemCount = this.db.query(
      'SELECT COUNT(*) as count FROM rss_items WHERE department = ?'
    ).get(department) as { count: number };

    const lastItem = this.db.query(
      'SELECT pub_date FROM rss_items WHERE department = ? ORDER BY pub_date DESC LIMIT 1'
    ).get(department) as { pub_date: string };

    this.db.run(
      `INSERT OR REPLACE INTO feed_metadata (department, item_count, last_updated, last_item_date)
       VALUES (?, ?, ?, ?)`,
      [department, itemCount.count, new Date().toISOString(), lastItem?.pub_date || null]
    );
  }

  async saveFeeds(): Promise<void> {
    console.log('💾 Saving RSS feeds...');

    for (const department of Object.keys(this.feedConfigs)) {
      try {
        // Generate RSS feed
        const rssContent = await this.generateFeed(department, 'rss');
        const rssPath = join(process.cwd(), 'feeds', `${department}.rss`);
        await Bun.write(rssPath, rssContent);

        // Generate Atom feed
        const atomContent = await this.generateFeed(department, 'atom');
        const atomPath = join(process.cwd(), 'feeds', `${department}.atom`);
        await Bun.write(atomPath, atomContent);

        console.log(`✅ Generated feeds for ${department}`);
      } catch (error) {
        console.error(`❌ Failed to generate feeds for ${department}:`, error);
      }
    }
  }

  async addSampleData(): Promise<void> {
    console.log('📝 Adding sample RSS data...');

    const sampleItems = [
      {
        department: 'technology',
        title: 'Bun 1.1.X Performance Improvements',
        description: 'Major performance enhancements in the latest Bun runtime',
        link: 'https://fire22.com/tech/bun-performance',
        author: 'Tech Team',
        category: 'performance'
      },
      {
        department: 'operations',
        title: 'Infrastructure Scaling Complete',
        description: 'Successfully scaled infrastructure to handle 10x traffic',
        link: 'https://fire22.com/ops/scaling-complete',
        author: 'Ops Team',
        category: 'infrastructure'
      },
      {
        department: 'compliance',
        title: 'SOC 2 Type II Certification Achieved',
        description: 'Platform now fully compliant with SOC 2 Type II standards',
        link: 'https://fire22.com/compliance/soc2-certified',
        author: 'Compliance Team',
        category: 'certification'
      }
    ];

    for (const item of sampleItems) {
      await this.addItem(item.department, {
        ...item,
        pubDate: new Date().toUTCString()
      });
    }

    console.log('✅ Added sample RSS items');
  }

  getFeedStats(): Record<string, { itemCount: number; lastUpdated: string }> {
    const stats: Record<string, { itemCount: number; lastUpdated: string }> = {};

    for (const department of Object.keys(this.feedConfigs)) {
      const metadata = this.db.query(
        'SELECT * FROM feed_metadata WHERE department = ?'
      ).get(department) as { item_count: number; last_updated: string } | undefined;

      stats[department] = {
        itemCount: metadata?.item_count || 0,
        lastUpdated: metadata?.last_updated || 'Never'
      };
    }

    return stats;
  }

  close(): void {
    this.db.close();
  }
}

// CLI Interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  const feedManager = new RSSFeedManager();

  switch (command) {
    case 'generate':
      await feedManager.saveFeeds();
      console.log('✅ RSS feeds generated successfully');
      break;

    case 'sample':
      await feedManager.addSampleData();
      await feedManager.saveFeeds();
      console.log('✅ Sample data added and feeds generated');
      break;

    case 'add-item':
      const department = args[1];
      const title = args[2];
      if (!department || !title) {
        console.error('Usage: bun run scripts/rss-feed-manager.ts add-item <department> <title>');
        process.exit(1);
      }

      await feedManager.addItem(department, {
        title,
        description: args[3] || 'No description provided',
        link: args[4] || `https://fire22.com/${department}/${Date.now()}`,
        author: args[5] || 'Fire22 Team',
        category: args[6] || 'general',
        pubDate: new Date().toUTCString()
      });

      await feedManager.saveFeeds();
      console.log('✅ RSS item added successfully');
      break;

    case 'status':
      const stats = feedManager.getFeedStats();
      console.log('📊 RSS Feed Status:');
      console.log('');

      for (const [department, data] of Object.entries(stats)) {
        console.log(`${department.padEnd(12)}: ${data.itemCount.toString().padStart(3)} items, updated ${data.lastUpdated}`);
      }
      break;

    default:
      console.log('Usage: bun run scripts/rss-feed-manager.ts [generate|sample|add-item|status]');
      console.log('');
      console.log('Commands:');
      console.log('  generate    - Generate all RSS/Atom feeds');
      console.log('  sample      - Add sample data and generate feeds');
      console.log('  add-item    - Add a new RSS item');
      console.log('  status      - Show feed statistics');
      break;
  }

  feedManager.close();
}

export { RSSFeedManager };
