#!/usr/bin/env bun

/**
 * [CLI][RSS][ANALYZER]{BUN-NATIVE}
 * RSS feed scraper and content analyzer CLI
 * Fetches, parses, and analyzes RSS feeds with token matching
 */

import { RSSScraper, type RSSFeed } from "../networking/rss-scraper";
import { TokenMatcher } from "../utils/token-matcher";
import { parseArgs } from "util";

/**
 * [1.0.0.0] CLI Options Interface
 * Command-line argument configuration
 *
 * @tags cli,options,config
 */
interface CLIOptions {
  help?: boolean;
  url?: string;
  format?: "json" | "table" | "summary";
  maxItems?: number;
  timeout?: number;
  analyze?: boolean;
  patterns?: boolean;
  compare?: string;
  output?: string;
  watch?: boolean;
  interval?: number;
}

/**
 * [1.1.0.0] Parse CLI arguments
 * @private
 */
function parseCliArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    format: "summary",
    maxItems: 20,
    timeout: 10000,
    analyze: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--url" && args[i + 1]) {
      options.url = args[++i];
    } else if (arg === "--format" && args[i + 1]) {
      options.format = args[++i] as "json" | "table" | "summary";
    } else if (arg === "--max-items" && args[i + 1]) {
      options.maxItems = parseInt(args[++i], 10);
    } else if (arg === "--timeout" && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === "--analyze") {
      options.analyze = true;
    } else if (arg === "--patterns") {
      options.patterns = true;
    } else if (arg === "--compare" && args[i + 1]) {
      options.compare = args[++i];
    } else if (arg === "--output" && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === "--watch") {
      options.watch = true;
    } else if (arg === "--interval" && args[i + 1]) {
      options.interval = parseInt(args[++i], 10);
    }
  }

  return options;
}

/**
 * [1.2.0.0] Print help message
 * @private
 */
function printHelp(): void {
  console.log(`
📡 bun rss-analyzer - RSS Feed Scraper & Analyzer

Usage:
  bun rss-analyzer --url <url> [options]

Options:
  --help, -h              Show this help message
  --url <url>             RSS feed URL (required)
  --format <format>       Output format: json, table, summary (default: summary)
  --max-items <n>         Maximum items to fetch (default: 20)
  --timeout <ms>          Request timeout in ms (default: 10000)
  --analyze               Analyze content tokens (default: true)
  --patterns              Show keyword patterns
  --compare <text>        Compare feed content with text
  --output <file>         Save output to file
  --watch                 Watch feed for updates
  --interval <ms>         Watch interval in ms (default: 300000)

Examples:
  bun rss-analyzer --url https://bun.com/rss.xml
  bun rss-analyzer --url https://bun.com/rss.xml --format json
  bun rss-analyzer --url https://bun.com/rss.xml --analyze --patterns
  bun rss-analyzer --url https://bun.com/rss.xml --watch --interval 60000
`);
}

/**
 * [1.3.0.0] Format output as JSON
 * @private
 */
function formatJson(feed: RSSFeed): string {
  return JSON.stringify(feed, null, 2);
}

/**
 * [1.4.0.0] Format output as table
 * @private
 */
function formatTable(feed: RSSFeed): string {
  let output = `\n📰 ${feed.title}\n`;
  output += `${feed.description}\n`;
  output += `🔗 ${feed.link}\n`;
  output += `📅 ${feed.lastBuildDate || "N/A"}\n\n`;

  output += "Items:\n";
  output += "─".repeat(80) + "\n";

  for (const item of feed.items) {
    output += `\n📌 ${item.title}\n`;
    output += `   🔗 ${item.link}\n`;
    output += `   📅 ${item.pubDate}\n`;
    if (item.author) output += `   ✍️  ${item.author}\n`;
    if (item.category) output += `   🏷️  ${item.category.join(", ")}\n`;
    output += `   📝 ${item.description.substring(0, 100)}...\n`;
  }

  return output;
}

/**
 * [1.5.0.0] Format output as summary
 * @private
 */
function formatSummary(feed: RSSFeed): string {
  let output = `\n📡 RSS Feed Summary\n`;
  output += `${"─".repeat(50)}\n`;
  output += `Title:       ${feed.title}\n`;
  output += `Link:        ${feed.link}\n`;
  output += `Items:       ${feed.items.length}\n`;
  output += `Last Build:  ${feed.lastBuildDate || "N/A"}\n`;
  output += `Fetched:     ${feed.fetchedAt}\n`;
  output += `${"─".repeat(50)}\n`;

  output += `\nRecent Items:\n`;
  for (let i = 0; i < Math.min(5, feed.items.length); i++) {
    const item = feed.items[i];
    output += `\n${i + 1}. ${item.title}\n`;
    output += `   ${item.pubDate}\n`;
  }

  return output;
}

/**
 * [1.5.5.0] Extract combined content from feed items
 * @private
 */
function extractFeedContent(feedItems: typeof RSSFeed.prototype.items): string {
  return feedItems.map((item) => `${item.title} ${item.description}`).join(" ");
}

/**
 * [1.5.6.0] Get top tokens from frequency map
 * @private
 */
function getTopTokens(
  frequencyMap: Map<string, number>,
  limit: number = 10
): Array<[string, number]> {
  return Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

/**
 * [1.5.7.0] Display token analysis results
 * @private
 */
function displayTokenAnalysis(
  totalTokens: number,
  uniqueCount: number,
  topTokens: Array<[string, number]>
): void {
  console.log(`\n🔍 Content Analysis`);
  console.log(`${"─".repeat(50)}`);
  console.log(`Total Tokens:    ${totalTokens}`);
  console.log(`Unique Tokens:   ${uniqueCount}`);
  console.log(`Avg Token Freq:  ${(totalTokens / uniqueCount).toFixed(2)}`);

  console.log(`\nTop Keywords:`);
  for (const [token, freq] of topTokens) {
    console.log(`  • ${token}: ${freq}`);
  }
}

/**
 * [1.6.0.0] Analyze feed content
 * @private
 */
function analyzeFeed(feed: RSSFeed): void {
  const matcher = new TokenMatcher();
  const feedContent = extractFeedContent(feed.items);
  const analysis = matcher.extract(feedContent);
  const topTokens = getTopTokens(analysis.frequency, 10);

  displayTokenAnalysis(analysis.totalTokens, analysis.uniqueCount, topTokens);
}

/**
 * [1.7.0.0] Main CLI entry point
 */
async function main(): Promise<void> {
  const options = parseCliArgs();

  if (options.help || !options.url) {
    printHelp();
    return;
  }

  try {
    console.log(`\n📡 Fetching RSS feed: ${options.url}`);

    const scraper = new RSSScraper({
      maxItems: options.maxItems,
      timeout: options.timeout,
    });

    const feed = await scraper.fetch(options.url);

    // Format output
    let output = "";
    if (options.format === "json") {
      output = formatJson(feed);
    } else if (options.format === "table") {
      output = formatTable(feed);
    } else {
      output = formatSummary(feed);
    }

    console.log(output);

    // Analyze if requested
    if (options.analyze) {
      analyzeFeed(feed);
    }

    // Save to file if requested
    if (options.output) {
      await Bun.write(options.output, output);
      console.log(`\n✅ Output saved to ${options.output}`);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
