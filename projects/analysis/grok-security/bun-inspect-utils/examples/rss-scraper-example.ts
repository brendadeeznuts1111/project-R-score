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
  console.log("\n📡 [1.0.0.0] Basic RSS Fetching");
  console.log("─".repeat(50));

  const scraper = new RSSScraper({ maxItems: 5 });

  try {
    const feed = await scraper.fetch("https://bun.com/rss.xml");

    console.log(`✅ Feed: ${feed.title}`);
    console.log(`   Items: ${feed.items.length}`);
    console.log(`   Last Build: ${feed.lastBuildDate}`);

    // Show first 3 items
    console.log("\n   Recent Items:");
    for (let i = 0; i < Math.min(3, feed.items.length); i++) {
      const item = feed.items[i];
      console.log(`   ${i + 1}. ${item.title}`);
      console.log(`      📅 ${item.pubDate}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

/**
 * [1.1.0.0] Token Analysis
 */
async function tokenAnalysis(): Promise<void> {
  console.log("\n🔍 [1.1.0.0] Token Analysis");
  console.log("─".repeat(50));

  const scraper = new RSSScraper({ maxItems: 10 });
  const matcher = new TokenMatcher();

  try {
    const feed = await scraper.fetch("https://bun.com/rss.xml");

    // Combine all content
    const allContent = feed.items
      .map((item) => `${item.title} ${item.description}`)
      .join(" ");

    const analysis = matcher.extract(allContent);

    console.log(`✅ Analysis Results:`);
    console.log(`   Total Tokens: ${analysis.totalTokens}`);
    console.log(`   Unique Tokens: ${analysis.uniqueCount}`);
    console.log(`   Avg Frequency: ${(analysis.totalTokens / analysis.uniqueCount).toFixed(2)}`);

    // Top 10 keywords
    const topTokens = Array.from(analysis.frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log(`\n   Top Keywords:`);
    for (const [token, freq] of topTokens) {
      const bar = "█".repeat(Math.min(freq, 20));
      console.log(`   ${token.padEnd(15)} ${bar} ${freq}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

/**
 * [1.2.0.0] Content Comparison
 */
async function contentComparison(): Promise<void> {
  console.log("\n⚖️  [1.2.0.0] Content Comparison");
  console.log("─".repeat(50));

  const scraper = new RSSScraper({ maxItems: 5 });
  const matcher = new TokenMatcher();

  try {
    const feed = await scraper.fetch("https://bun.com/rss.xml");

    if (feed.items.length < 2) {
      console.log("⚠️  Not enough items for comparison");
      return;
    }

    const item1 = feed.items[0];
    const item2 = feed.items[1];

    const comparison = matcher.compare(
      `${item1.title} ${item1.description}`,
      `${item2.title} ${item2.description}`,
    );

    console.log(`✅ Comparing:`);
    console.log(`   Item 1: ${item1.title.substring(0, 40)}...`);
    console.log(`   Item 2: ${item2.title.substring(0, 40)}...`);

    console.log(`\n   Metrics:`);
    console.log(`   Common Tokens: ${comparison.commonTokens.length}`);
    console.log(`   Unique to Item 1: ${comparison.uniqueToA.length}`);
    console.log(`   Unique to Item 2: ${comparison.uniqueToB.length}`);
    console.log(`   Overlap Score: ${(comparison.overlapScore * 100).toFixed(1)}%`);
    console.log(`   Jaccard Similarity: ${(comparison.jaccardSimilarity * 100).toFixed(1)}%`);
    console.log(`   Cosine Similarity: ${(comparison.cosineSimilarity * 100).toFixed(1)}%`);

    if (comparison.commonTokens.length > 0) {
      console.log(`\n   Common Keywords:`);
      console.log(`   ${comparison.commonTokens.slice(0, 5).join(", ")}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

/**
 * [1.3.0.0] Pattern Detection
 */
async function patternDetection(): Promise<void> {
  console.log("\n🎯 [1.3.0.0] Pattern Detection");
  console.log("─".repeat(50));

  const scraper = new RSSScraper({ maxItems: 15 });
  const matcher = new TokenMatcher();

  try {
    const feed = await scraper.fetch("https://bun.com/rss.xml");

    const contents = feed.items.map(
      (item) => `${item.title} ${item.description}`,
    );

    const patterns = matcher.findPatterns(contents, 15);

    console.log(`✅ Detected Patterns (Top 15):`);
    for (let i = 0; i < patterns.length; i++) {
      console.log(`   ${i + 1}. ${patterns[i]}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

/**
 * [1.4.0.0] Performance Benchmarks
 */
async function performanceBenchmarks(): Promise<void> {
  console.log("\n⚡ [1.4.0.0] Performance Benchmarks");
  console.log("─".repeat(50));

  const scraper = new RSSScraper({ maxItems: 20 });
  const matcher = new TokenMatcher();

  try {
    // Benchmark fetch
    const fetchStart = performance.now();
    const feed = await scraper.fetch("https://bun.com/rss.xml");
    const fetchTime = performance.now() - fetchStart;

    console.log(`✅ Fetch Performance:`);
    console.log(`   Time: ${fetchTime.toFixed(2)}ms`);
    console.log(`   Items: ${feed.items.length}`);
    console.log(`   Rate: ${(feed.items.length / (fetchTime / 1000)).toFixed(0)} items/sec`);

    // Benchmark token extraction
    const allContent = feed.items
      .map((item) => `${item.title} ${item.description}`)
      .join(" ");

    const extractStart = performance.now();
    const analysis = matcher.extract(allContent);
    const extractTime = performance.now() - extractStart;

    console.log(`\n   Token Extraction:`);
    console.log(`   Time: ${extractTime.toFixed(2)}ms`);
    console.log(`   Tokens: ${analysis.totalTokens}`);
    console.log(`   Rate: ${(analysis.totalTokens / (extractTime / 1000)).toFixed(0)} tokens/sec`);

    // Benchmark comparison
    if (feed.items.length >= 2) {
      const compareStart = performance.now();
      matcher.compare(
        `${feed.items[0].title} ${feed.items[0].description}`,
        `${feed.items[1].title} ${feed.items[1].description}`,
      );
      const compareTime = performance.now() - compareStart;

      console.log(`\n   Token Comparison:`);
      console.log(`   Time: ${compareTime.toFixed(2)}ms`);
    }
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
  }
}

/**
 * [1.5.0.0] Main execution
 */
async function main(): Promise<void> {
  console.log("\n🌐 [1.0.0.0] RSS Scraper Examples\n");

  await basicFetching();
  await tokenAnalysis();
  await contentComparison();
  await patternDetection();
  await performanceBenchmarks();

  console.log("\n✅ Examples completed\n");
}

main().catch(console.error);

