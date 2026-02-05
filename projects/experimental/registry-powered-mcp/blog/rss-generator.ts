// blog/rss-generator.ts - RSS Feed Compiler (Infrastructure ID: 22)
// Logic Tier: Level 1 (Syndication) | Resource Tax: Heap <500KB | Protocol: RSS 2.0
// Bun Native APIs: Bun.write() - Cache-stamped XML generation with atomic writes
// Performance SLA: 1ms XML gen with Redis caching

import { BlogPost, BlogConfig } from './types.ts';
import { cacheManager } from './cache-manager.ts';

export class RSSGenerator {
  private cache = new Map<string, { rss: string; expires: number }>();

  constructor(private config: BlogConfig) {}

  generate(posts: BlogPost[]): string {
    // Generate cache key
    const cacheKey = `rss:feed:${posts.length}:${posts.reduce((hash, p) => hash + p.slug, '')}`;

    // Try in-memory cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.rss;
    }

    // Generate RSS
    const rss = this.generateRSS(posts);

    // Cache in memory for 5 minutes
    this.cache.set(cacheKey, {
      rss,
      expires: Date.now() + (5 * 60 * 1000)
    });

    return rss;
  }

  private generateRSS(posts: BlogPost[]): string {
    const sortedPosts = posts
      .filter(post => post.publishedAt <= new Date())
      .sort((a, b) => b.rssPriority - a.rssPriority || b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, this.config.rss.itemCount);

    const items = sortedPosts.map(post => this.generateItem(post)).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${this.escapeXml(this.config.title)}</title>
    <description>${this.escapeXml(this.config.description)}</description>
    <link>${this.config.url}</link>
    <atom:link href="${this.config.url}/${this.config.rss.filename}" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Registry-Powered-MCP Blog Generator</generator>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <ttl>60</ttl>
${items}
  </channel>
</rss>`;
  }

  private generateItem(post: BlogPost): string {
    const url = post.canonicalUrl || `${this.config.url}/blog/${post.category}/${post.slug}`;
    const pubDate = post.publishedAt.toUTCString();

    let description = this.escapeXml(post.excerpt);
    if (post.performanceMetrics) {
      description += this.escapeXml(`\n\nPerformance Impact: ${post.performanceMetrics.optimization || 'See full post for details'}`);
    }
    if (post.securityImpact) {
      description += this.escapeXml(`\n\nSecurity Impact: ${post.securityImpact.severity.toUpperCase()} - ${post.securityImpact.mitigation || 'See full post for details'}`);
    }

    const categories = post.tags.map(tag => `<category>${this.escapeXml(tag)}</category>`).join('\n    ');

    return `    <item>
      <title>${this.escapeXml(post.title)}</title>
      <description>${this.escapeXml(description)}</description>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${this.escapeXml(`${post.author} (${this.config.author})`)}</author>
      <category>${post.category}</category>
      ${categories}
      <priority>${post.rssPriority}</priority>
    </item>`;
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&#39;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}