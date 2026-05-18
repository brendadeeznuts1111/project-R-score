/**
 * [EXAMPLE][RSS][SCRAPER]{BUN-NATIVE}
 * RSS feed scraping and analysis examples
 * Run with: bun examples/rss-scraper-example.ts
 */

import { RSSScraper } from "../src/networking/rss-scraper";
import { TokenMatcher } from "../src/utils/token-matcher";

/**
 * [1.0.0.0] Basic RSS Fetching
 */
async function basicFetching(): Promise<void> {
  console.info("\n📡 [1.0.0.0] Basic RSS Fetching");
  console.info("─".repeat(50));

  const scraper = new RSSScraper({ maxItems: 5 });

  try {
    const feed = await scraper.fetch("https://bun.com/rss.xml");

    console.info(`✅ Feed: ${feed.title}`);
    console.info(`   Items: ${feed.items.length}`);
    console.info(`   Last Build: ${feed.lastBuildDate}`);

    // Show first 3 items
    console.info("\n   Recent Items:");
    for (let i = 0; i < Math.min(3, feed.items.length); i++) {
      const item = feed.items[i];
      console.info(`   ${i + 1}. ${item.title}`);
      console.info(`      📅 ${item.pubDate}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

/**
 * [1.1.0.0] Token Analysis
 */
async function tokenAnalysis(): Promise<void> {
  console.info("\n🔍 [1.1.0.0] Token Analysis");
  console.info("─".repeat(50));

  const scraper = new RSSScraper({ maxItems: 10 });
  const matcher = new TokenMatcher();

  try {
    const feed = await scraper.fetch("https://bun.com/rss.xml");

    // Combine all content
    const allContent = feed.items
      .map((item) => `${item.title} ${item.description}`)
      .join(" ");

    const analysis = matcher.extract(allContent);

    console.info(`✅ Analysis Results:`);
    console.info(`   Total Tokens: ${analysis.totalTokens}`);
    console.info(`   Unique Tokens: ${analysis.uniqueCount}`);
    console.info(`   Avg Frequency: ${(analysis.totalTokens / analysis.uniqueCount).toFixed(2)}`);

    // Top 10 keywords
    const topTokens = Array.from(analysis.frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.info(`\n   Top Keywords:`);
    for (const [token, freq] of topTokens) {
      const bar = "█".repeat(Math.min(freq, 20));
      console.info(`   ${token.padEnd(15)} ${bar} ${freq}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

/**
 * [1.2.0.0] Content Comparison
 */
async function contentComparison(): Promise<void> {
  console.info("\n⚖️  [1.2.0.0] Content Comparison");
  console.info("─".repeat(50));

  const scraper = new RSSScraper({ maxItems: 5 });
  const matcher = new TokenMatcher();

  try {
    const feed = await scraper.fetch("https://bun.com/rss.xml");

    if (feed.items.length < 2) {
      console.info("⚠️  Not enough items for comparison");
      return;
    }

    const item1 = feed.items[0];
    const item2 = feed.items[1];

    const comparison = matcher.compare(
      `${item1.title} ${item1.description}`,
      `${item2.title} ${item2.description}`,
    );

    console.info(`✅ Comparing:`);
    console.info(`   Item 1: ${item1.title.substring(0, 40)}...`);
    console.info(`   Item 2: ${item2.title.substring(0, 40)}...`);

    console.info(`\n   Metrics:`);
    console.info(`   Common Tokens: ${comparison.commonTokens.length}`);
    console.info(`   Unique to Item 1: ${comparison.uniqueToA.length}`);
    console.info(`   Unique to Item 2: ${comparison.uniqueToB.length}`);
    console.info(`   Overlap Score: ${(comparison.overlapScore * 100).toFixed(1)}%`);
    console.info(`   Jaccard Similarity: ${(comparison.jaccardSimilarity * 100).toFixed(1)}%`);
    console.info(`   Cosine Similarity: ${(comparison.cosineSimilarity * 100).toFixed(1)}%`);

    if (comparison.commonTokens.length > 0) {
      console.info(`\n   Common Keywords:`);
      console.info(`   ${comparison.commonTokens.slice(0, 5).join(", ")}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

/**
 * [1.3.0.0] Pattern Detection
 */
async function patternDetection(): Promise<void> {
  console.info("\n🎯 [1.3.0.0] Pattern Detection");
  console.info("─".repeat(50));

  const scraper = new RSSScraper({ maxItems: 15 });
  const matcher = new TokenMatcher();

  try {
    const feed = await scraper.fetch("https://bun.com/rss.xml");

    const contents = feed.items.map(
      (item) => `${item.title} ${item.description}`,
    );

    const patterns = matcher.findPatterns(contents, 15);

    console.info(`✅ Detected Patterns (Top 15):`);
    for (let i = 0; i < patterns.length; i++) {
      console.info(`   ${i + 1}. ${patterns[i]}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

/**
 * [1.4.0.0] Performance Benchmarks
 */
async function performanceBenchmarks(): Promise<void> {
  console.info("\n⚡ [1.4.0.0] Performance Benchmarks");
  console.info("─".repeat(50));

  const scraper = new RSSScraper({ maxItems: 20 });
  const matcher = new TokenMatcher();

  try {
    // Benchmark fetch
    const fetchStart = performance.now();
    const feed = await scraper.fetch("https://bun.com/rss.xml");
    const fetchTime = performance.now() - fetchStart;

    console.info(`✅ Fetch Performance:`);
    console.info(`   Time: ${fetchTime.toFixed(2)}ms`);
    console.info(`   Items: ${feed.items.length}`);
    console.info(`   Rate: ${(feed.items.length / (fetchTime / 1000)).toFixed(0)} items/sec`);

    // Benchmark token extraction
    const allContent = feed.items
      .map((item) => `${item.title} ${item.description}`)
      .join(" ");

    const extractStart = performance.now();
    const analysis = matcher.extract(allContent);
    const extractTime = performance.now() - extractStart;

    console.info(`\n   Token Extraction:`);
    console.info(`   Time: ${extractTime.toFixed(2)}ms`);
    console.info(`   Tokens: ${analysis.totalTokens}`);
    console.info(`   Rate: ${(analysis.totalTokens / (extractTime / 1000)).toFixed(0)} tokens/sec`);

    // Benchmark comparison
    if (feed.items.length >= 2) {
      const compareStart = performance.now();
      matcher.compare(
        `${feed.items[0].title} ${feed.items[0].description}`,
        `${feed.items[1].title} ${feed.items[1].description}`,
      );
      const compareTime = performance.now() - compareStart;

      console.info(`\n   Token Comparison:`);
      console.info(`   Time: ${compareTime.toFixed(2)}ms`);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

/**
 * [1.5.0.0] Main execution
 */
async function main(): Promise<void> {
  console.info("\n🌐 [1.0.0.0] RSS Scraper Examples\n");

  await basicFetching();
  await tokenAnalysis();
  await contentComparison();
  await patternDetection();
  await performanceBenchmarks();

  console.info("\n✅ Examples completed\n");
}

main().catch(console.error);

