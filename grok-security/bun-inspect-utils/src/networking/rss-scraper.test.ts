/**
 * [TEST][RSS][SCRAPER]{BUN-NATIVE}
 * Unit tests for RSS scraper and parser
 */

import { describe, it, expect } from "bun:test";
import { RSSScraper, type RSSFeed, type RSSItem } from "./rss-scraper";

/**
 * [1.0.0.0] Sample RSS XML for testing
 * @private
 */
const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>A test RSS feed</description>
    <link>https://example.com</link>
    <language>en-us</language>
    <lastBuildDate>Mon, 18 Jan 2026 10:00:00 GMT</lastBuildDate>
    <item>
      <title>First Article</title>
      <description>This is the first article description</description>
      <link>https://example.com/article1</link>
      <pubDate>Mon, 18 Jan 2026 09:00:00 GMT</pubDate>
      <author>John Doe</author>
      <category>Technology</category>
      <category>News</category>
      <guid>article-1</guid>
    </item>
    <item>
      <title>Second Article</title>
      <description>This is the second article description</description>
      <link>https://example.com/article2</link>
      <pubDate>Sun, 17 Jan 2026 09:00:00 GMT</pubDate>
      <category>Technology</category>
    </item>
  </channel>
</rss>`;

describe("[1.0.0.0] RSSScraper", () => {
  describe("[1.1.0.0] Parser", () => {
    it("[1.1.1.0] should parse valid RSS XML", () => {
      const scraper = new RSSScraper();
      const feed = scraper.parse(SAMPLE_RSS, "https://example.com/rss.xml");

      expect(feed.title).toBe("Test Feed");
      expect(feed.description).toBe("A test RSS feed");
      expect(feed.link).toBe("https://example.com");
      expect(feed.language).toBe("en-us");
      expect(feed.items.length).toBe(2);
    });

    it("[1.1.2.0] should extract item properties", () => {
      const scraper = new RSSScraper();
      const feed = scraper.parse(SAMPLE_RSS, "https://example.com/rss.xml");
      const item = feed.items[0];

      expect(item.title).toBe("First Article");
      expect(item.description).toBe("This is the first article description");
      expect(item.link).toBe("https://example.com/article1");
      expect(item.author).toBe("John Doe");
      expect(item.guid).toBe("article-1");
    });

    it("[1.1.3.0] should extract categories", () => {
      const scraper = new RSSScraper();
      const feed = scraper.parse(SAMPLE_RSS, "https://example.com/rss.xml");
      const item = feed.items[0];

      expect(item.category).toBeDefined();
      expect(item.category?.length).toBe(2);
      expect(item.category).toContain("Technology");
      expect(item.category).toContain("News");
    });

    it("[1.1.4.0] should respect maxItems config", () => {
      const scraper = new RSSScraper({ maxItems: 1 });
      const feed = scraper.parse(SAMPLE_RSS, "https://example.com/rss.xml");

      expect(feed.items.length).toBe(1);
    });

    it("[1.1.5.0] should decode HTML entities", () => {
      const xmlWithEntities = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Test &amp; Demo</title>
            <description>Less &lt;than&gt; and &quot;quotes&quot;</description>
            <link>https://example.com</link>
            <item>
              <title>Article &apos;Title&apos;</title>
              <description>Content here</description>
              <link>https://example.com/1</link>
              <pubDate>Mon, 18 Jan 2026 09:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`;

      const scraper = new RSSScraper();
      const feed = scraper.parse(xmlWithEntities, "https://example.com/rss.xml");

      expect(feed.title).toBe("Test & Demo");
      expect(feed.description).toContain("<than>");
      expect(feed.items[0].title).toContain("'Title'");
    });

    it("[1.1.6.0] should handle missing optional fields", () => {
      const minimalRss = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Minimal Feed</title>
            <description>Minimal description</description>
            <link>https://example.com</link>
            <item>
              <title>Article</title>
              <description>Description</description>
              <link>https://example.com/1</link>
              <pubDate>Mon, 18 Jan 2026 09:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`;

      const scraper = new RSSScraper();
      const feed = scraper.parse(minimalRss, "https://example.com/rss.xml");
      const item = feed.items[0];

      expect(item.author).toBe("");
      expect(item.category).toBeUndefined();
      expect(item.guid).toBe("");
    });

    it("[1.1.7.0] should throw on invalid XML", () => {
      const scraper = new RSSScraper();
      const invalidXml = "<invalid>xml</invalid>";

      expect(() => {
        scraper.parse(invalidXml, "https://example.com/rss.xml");
      }).toThrow();
    });

    it("[1.1.8.0] should set fetchedAt timestamp", () => {
      const scraper = new RSSScraper();
      const before = new Date();
      const feed = scraper.parse(SAMPLE_RSS, "https://example.com/rss.xml");
      const after = new Date();

      const fetchedAt = new Date(feed.fetchedAt);
      expect(fetchedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(fetchedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("[1.1.9.0] should preserve sourceUrl", () => {
      const scraper = new RSSScraper();
      const sourceUrl = "https://example.com/rss.xml";
      const feed = scraper.parse(SAMPLE_RSS, sourceUrl);

      expect(feed.sourceUrl).toBe(sourceUrl);
    });
  });

  describe("[1.2.0.0] Configuration", () => {
    it("[1.2.1.0] should use default config values", () => {
      const scraper = new RSSScraper();
      const feed = scraper.parse(SAMPLE_RSS, "https://example.com/rss.xml");

      expect(feed.items.length).toBe(2); // Default maxItems is 100
    });

    it("[1.2.2.0] should apply custom maxItems", () => {
      const scraper = new RSSScraper({ maxItems: 1 });
      const feed = scraper.parse(SAMPLE_RSS, "https://example.com/rss.xml");

      expect(feed.items.length).toBe(1);
    });
  });
});

