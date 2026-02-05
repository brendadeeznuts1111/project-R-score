/**
 * [EXAMPLE][RSS][MONITOR]{BUN-NATIVE}
 * RSS feed monitoring with continuous updates
 * Run with: bun examples/rss-monitor-example.ts
 */

import { RSSScraper, type RSSFeed } from "../src/networking/rss-scraper";
import { TokenMatcher } from "../src/utils/token-matcher";

/**
 * [1.0.0.0] RSS Feed Monitor
 * Tracks feed updates and content changes
 *
 * @tags rss,monitor,tracking
 */
class RSSFeedMonitor {
  private scraper: RSSScraper;
  private matcher: TokenMatcher;
  private previousFeed: RSSFeed | null = null;
  private updateCount = 0;

  constructor(private url: string, private interval: number = 60000) {
    this.scraper = new RSSScraper({ maxItems: 10 });
    this.matcher = new TokenMatcher();
  }

  /**
   * [1.1.0.0] Start monitoring
   */
  async start(): Promise<void> {
    console.log(`\n📡 Starting RSS Monitor`);
    console.log(`   URL: ${this.url}`);
    console.log(`   Interval: ${this.interval}ms`);
    console.log(`${"─".repeat(50)}\n`);

    // Initial fetch
    await this.checkFeed();

    // Set up interval
    setInterval(() => this.checkFeed(), this.interval);
  }

  /**
   * [1.2.0.0] Check feed for updates
   * @private
   */
  private async checkFeed(): Promise<void> {
    try {
      const feed = await this.scraper.fetch(this.url);
      this.updateCount++;

      const timestamp = new Date().toLocaleTimeString();
      console.log(`\n[${timestamp}] Check #${this.updateCount}`);

      if (!this.previousFeed) {
        // First fetch
        this.reportNewFeed(feed);
      } else {
        // Compare with previous
        this.reportChanges(this.previousFeed, feed);
      }

      this.previousFeed = feed;
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
    }
  }

  /**
   * [1.3.0.0] Report new feed
   * @private
   */
  private reportNewFeed(feed: RSSFeed): void {
    console.log(`✅ Feed loaded: ${feed.title}`);
    console.log(`   Items: ${feed.items.length}`);

    // Show first 3 items
    for (let i = 0; i < Math.min(3, feed.items.length); i++) {
      const item = feed.items[i];
      console.log(`   • ${item.title}`);
    }
  }

  /**
   * [1.4.0.0] Report changes
   * @private
   */
  private reportChanges(prev: RSSFeed, current: RSSFeed): void {
    const prevIds = new Set(prev.items.map((i) => i.guid || i.link));
    const currentIds = new Set(current.items.map((i) => i.guid || i.link));

    // Find new items
    const newItems = current.items.filter(
      (i) => !prevIds.has(i.guid || i.link),
    );

    // Find removed items
    const removedCount = prev.items.filter(
      (i) => !currentIds.has(i.guid || i.link),
    ).length;

    if (newItems.length > 0) {
      console.log(`✨ New items: ${newItems.length}`);
      for (const item of newItems.slice(0, 3)) {
        console.log(`   • ${item.title}`);
      }
    }

    if (removedCount > 0) {
      console.log(`🗑️  Removed items: ${removedCount}`);
    }

    if (newItems.length === 0 && removedCount === 0) {
      console.log(`ℹ️  No changes`);
    }

    // Analyze content changes
    this.analyzeContentChanges(prev, current);
  }

  /**
   * [1.5.0.0] Analyze content changes
   * @private
   */
  private analyzeContentChanges(prev: RSSFeed, current: RSSFeed): void {
    const prevContent = prev.items
      .map((i) => `${i.title} ${i.description}`)
      .join(" ");

    const currentContent = current.items
      .map((i) => `${i.title} ${i.description}`)
      .join(" ");

    const comparison = this.matcher.compare(prevContent, currentContent);

    if (comparison.commonTokens.length > 0) {
      const topCommon = comparison.commonTokens.slice(0, 5);
      console.log(`   Common keywords: ${topCommon.join(", ")}`);
    }

    console.log(
      `   Similarity: ${(comparison.jaccardSimilarity * 100).toFixed(1)}%`,
    );
  }
}

/**
 * [2.0.0.0] Batch Analysis Example
 * Analyze multiple feeds simultaneously
 */
async function batchAnalysis(): Promise<void> {
  console.log("\n📊 [2.0.0.0] Batch Feed Analysis");
  console.log("─".repeat(50));

  const feeds = [
    "https://bun.com/rss.xml",
    // Add more feeds as needed
  ];

  const scraper = new RSSScraper({ maxItems: 5 });
  const matcher = new TokenMatcher();

  for (const feedUrl of feeds) {
    try {
      console.log(`\n📡 Analyzing: ${feedUrl}`);

      const feed = await scraper.fetch(feedUrl);
      const content = feed.items
        .map((i) => `${i.title} ${i.description}`)
        .join(" ");

      const analysis = matcher.extract(content);
      const patterns = matcher.findPatterns(
        feed.items.map((i) => `${i.title} ${i.description}`),
        5,
      );

      console.log(`   Items: ${feed.items.length}`);
      console.log(`   Unique Tokens: ${analysis.uniqueCount}`);
      console.log(`   Top Patterns: ${patterns.join(", ")}`);
    } catch (error) {
      console.error(`   ❌ Error: ${(error as Error).message}`);
    }
  }
}

/**
 * [3.0.0.0] Trend Detection Example
 * Detect trending topics over time
 */
async function trendDetection(): Promise<void> {
  console.log("\n📈 [3.0.0.0] Trend Detection");
  console.log("─".repeat(50));

  const scraper = new RSSScraper({ maxItems: 20 });
  const matcher = new TokenMatcher();

  try {
    const feed = await scraper.fetch("https://bun.com/rss.xml");

    // Group items by date
    const itemsByDate = new Map<string, string[]>();

    for (const item of feed.items) {
      const date = item.pubDate.split(",")[0]; // Get day of week
      const content = `${item.title} ${item.description}`;

      if (!itemsByDate.has(date)) {
        itemsByDate.set(date, []);
      }
      itemsByDate.get(date)!.push(content);
    }

    console.log(`✅ Trend Analysis:`);

    for (const [date, contents] of itemsByDate) {
      const patterns = matcher.findPatterns(contents, 3);
      console.log(`\n   ${date}:`);
      console.log(`   Topics: ${patterns.join(", ")}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

/**
 * [4.0.0.0] Main execution
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || "batch";

  if (command === "monitor") {
    // Start monitoring mode
    const monitor = new RSSFeedMonitor("https://bun.com/rss.xml", 30000);
    await monitor.start();

    // Keep process alive
    await new Promise(() => {});
  } else if (command === "trends") {
    // Trend detection
    await trendDetection();
  } else {
    // Default: batch analysis
    await batchAnalysis();
  }
}

main().catch(console.error);

