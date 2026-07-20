/**
 * services/rss-integration.ts
 *
 * Stub replacement for the missing RSS integration module referenced by
 * server/base-server.ts. The original module did not exist; this stub
 * implements the surface area the server expects so the RSS endpoints
 * can start without crashing.
 *
 * The endpoints return empty feeds. Re-implement with real feed sources
 * when RSS integration is needed in production.
 */

export interface RSSFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid?: string;
  category?: string[];
  author?: string;
}

const EMPTY_FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Bun Documentation Updates</title>
    <link>https://bun.com/reference</link>
    <description>Latest updates from Bun documentation sources</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  </channel>
</rss>`;

export class RSSIntegrationService {
  async fetchBunComRSS(_feedType: 'main' | 'blog' | 'releases'): Promise<RSSFeedItem[]> {
    return [];
  }

  async getCombinedRSSFeed(_limit: number): Promise<RSSFeedItem[]> {
    return [];
  }

  async generateDocumentationRSSFeed(): Promise<string> {
    return EMPTY_FEED_XML.replace(
      '<lastBuildDate>',
      `<lastBuildDate>${new Date().toUTCString()}`
    );
  }
}

export default RSSIntegrationService;
