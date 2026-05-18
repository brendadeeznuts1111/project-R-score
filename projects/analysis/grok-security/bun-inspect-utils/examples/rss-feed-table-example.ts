/**
 * [EXAMPLE][RSS][FEED][TABLE]{BUN-NATIVE}
 * Bun RSS feed table rendering with enriched metadata
 * Run with: bun examples/rss-feed-table-example.ts
 */

import { RSSTableUtils, RSSTableRenderer } from "../src/core/rss-table-integration";
import { RSSFeedTableValidator, RSSFeedTableEnricher } from "../src/core/rss-feed-schema";
import type { RSSFeedEntry } from "../src/core/rss-feed-schema";

/**
 * [1.0.0.0] Sample Bun RSS feed entries
 * From https://bun.com/rss.xml (simulated)
 */
const BUN_RSS_ENTRIES: RSSFeedEntry[] = [
  {
    title: "Bun v1.3.5: Terminal API, Feature Flags, stringWidth Unicode",
    feedType: "Blog Release",
    entryDate: "2025-12-17T00:00:00Z",
    authorRef: "Jarred Sumner",
    summaryLength: "1200 chars",
    tags: "release,terminal,features,stringwidth",
    timestamp: "2026-01-18T06:58:00Z",
    owner: "maintainer.author.name",
    metrics: "PTY for interactive TensionTCPServer, dead-code elim",
  },
  {
    title: "Bun v1.3.4: Custom Proxy Headers, http.Agent Reuse, Standalone Config Skip",
    feedType: "Blog Release",
    entryDate: "2025-12-10T00:00:00Z",
    authorRef: "Jarred Sumner",
    summaryLength: "1100 chars",
    tags: "release,proxy,agent,compile,autoload",
    timestamp: "2026-01-18T06:58:00Z",
    owner: "maintainer.author.name",
    metrics: "Proxy auth for odds APIs, -20ms startup in bundles",
  },
  {
    title: "Bun v1.3.3: SQLite 3.50, WebSocket Improvements, FFI Stability",
    feedType: "Blog Release",
    entryDate: "2025-11-25T00:00:00Z",
    authorRef: "Jarred Sumner",
    summaryLength: "950 chars",
    tags: "release,sqlite,websocket,ffi",
    timestamp: "2026-01-18T06:58:00Z",
    owner: "maintainer.author.name",
    metrics: "Query opt +10% in odds caching, stable WS channels",
  },
  {
    title: "How Bun Achieves 400x Faster JSON Parsing",
    feedType: "Blog Tutorial",
    entryDate: "2025-11-15T00:00:00Z",
    authorRef: "Jarred Sumner",
    summaryLength: "800 chars",
    tags: "tutorial,json,perf",
    timestamp: "2026-01-18T06:58:00Z",
    owner: "maintainer.author.name",
    metrics: "Zig-core secrets for Factory Wager log parsing",
  },
  {
    title: "Bun v1.3.2: FFI Pointer Fixes, Security Hardening, Windows Parity",
    feedType: "Blog Release",
    entryDate: "2025-11-05T00:00:00Z",
    authorRef: "Jarred Sumner",
    summaryLength: "700 chars",
    tags: "release,ffi,security,windows",
    timestamp: "2026-01-18T06:58:00Z",
    owner: "maintainer.author.name",
    metrics: "Native interop reliability, cross-platform deploys",
  },
];

/**
 * [1.1.0.0] Display ASCII table
 */
function displayASCIITable(): void {
  console.info("\n📊 [1.1.0.0] Bun RSS Feed - ASCII Table");
  console.info("─".repeat(80));

  const output = RSSTableUtils.render(BUN_RSS_ENTRIES, "ascii");
  console.info(output);
}

/**
 * [1.2.0.0] Display JSON output
 */
function displayJSON(): void {
  console.info("\n📋 [1.2.0.0] Bun RSS Feed - JSON Output");
  console.info("─".repeat(80));

  const output = RSSTableUtils.render(BUN_RSS_ENTRIES, "json");
  console.info(output);
}

/**
 * [1.3.0.0] Display CSV output
 */
function displayCSV(): void {
  console.info("\n📄 [1.3.0.0] Bun RSS Feed - CSV Output");
  console.info("─".repeat(80));

  const output = RSSTableUtils.render(BUN_RSS_ENTRIES, "csv");
  console.info(output);
}

/**
 * [1.4.0.0] Validate entries
 */
function validateEntries(): void {
  console.info("\n✅ [1.4.0.0] Entry Validation");
  console.info("─".repeat(80));

  const validator = new RSSFeedTableValidator();
  const result = validator.validateEntries(BUN_RSS_ENTRIES);

  console.info(`Total Entries: ${result.totalEntries}`);
  console.info(`Valid Entries: ${result.validEntries}`);
  console.info(`Invalid Entries: ${result.invalidEntries.length}`);

  if (result.valid) {
    console.info("✅ All entries are valid!");
  } else {
    console.info("❌ Some entries have errors:");
    for (const invalid of result.invalidEntries) {
      console.info(`  Entry ${invalid.index}:`);
      for (const error of invalid.errors) {
        console.info(`    - ${error}`);
      }
    }
  }
}

/**
 * [1.5.0.0] Enrich entries
 */
function enrichEntries(): void {
  console.info("\n🎯 [1.5.0.0] Entry Enrichment");
  console.info("─".repeat(80));

  const enricher = new RSSFeedTableEnricher();
  const enriched = enricher.enrichEntries(BUN_RSS_ENTRIES);

  for (let i = 0; i < Math.min(3, enriched.length); i++) {
    const entry = enriched[i];
    console.info(`\n${i + 1}. ${entry.title}`);
    console.info(`   Type: ${entry.feedType}`);
    console.info(`   Author: ${entry.authorRef}`);
    console.info(`   Summary: ${entry.summaryLength}`);
    console.info(`   Metrics: ${entry.metrics}`);
  }
}

/**
 * [1.6.0.0] Filter by feed type
 */
function filterByFeedType(): void {
  console.info("\n🔍 [1.6.0.0] Filter by Feed Type");
  console.info("─".repeat(80));

  const releases = BUN_RSS_ENTRIES.filter((e) => e.feedType === "Blog Release");
  const tutorials = BUN_RSS_ENTRIES.filter((e) => e.feedType === "Blog Tutorial");

  console.info(`\nReleases (${releases.length}):`);
  for (const entry of releases) {
    console.info(`  • ${entry.title}`);
  }

  console.info(`\nTutorials (${tutorials.length}):`);
  for (const entry of tutorials) {
    console.info(`  • ${entry.title}`);
  }
}

/**
 * [1.7.0.0] Analyze tags
 */
function analyzeTags(): void {
  console.info("\n🏷️  [1.7.0.0] Tag Analysis");
  console.info("─".repeat(80));

  const tagFrequency = new Map<string, number>();

  for (const entry of BUN_RSS_ENTRIES) {
    const tags = entry.tags.split(",").map((t) => t.trim());
    for (const tag of tags) {
      tagFrequency.set(tag, (tagFrequency.get(tag) ?? 0) + 1);
    }
  }

  const sorted = Array.from(tagFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.info("\nTop Tags:");
  for (const [tag, count] of sorted) {
    const bar = "█".repeat(count);
    console.info(`  ${tag.padEnd(15)} ${bar} ${count}`);
  }
}

/**
 * [1.8.0.0] Performance metrics
 */
function performanceMetrics(): void {
  console.info("\n⚡ [1.8.0.0] Performance Metrics");
  console.info("─".repeat(80));

  const renderer = new RSSTableRenderer();

  // ASCII rendering
  const asciiStart = performance.now();
  renderer.renderASCII(BUN_RSS_ENTRIES);
  const asciiTime = performance.now() - asciiStart;

  // JSON rendering
  const jsonStart = performance.now();
  renderer.renderJSON(BUN_RSS_ENTRIES);
  const jsonTime = performance.now() - jsonStart;

  // CSV rendering
  const csvStart = performance.now();
  renderer.renderCSV(BUN_RSS_ENTRIES);
  const csvTime = performance.now() - csvStart;

  // HTML rendering
  const htmlStart = performance.now();
  renderer.renderHTML(BUN_RSS_ENTRIES);
  const htmlTime = performance.now() - htmlStart;

  console.info(`\nRendering Times (${BUN_RSS_ENTRIES.length} entries):`);
  console.info(`  ASCII: ${asciiTime.toFixed(2)}ms`);
  console.info(`  JSON:  ${jsonTime.toFixed(2)}ms`);
  console.info(`  CSV:   ${csvTime.toFixed(2)}ms`);
  console.info(`  HTML:  ${htmlTime.toFixed(2)}ms`);
}

/**
 * [1.9.0.0] Main execution
 */
async function main(): Promise<void> {
  console.info("\n🌐 [1.0.0.0] Bun RSS Feed Table Examples\n");

  displayASCIITable();
  validateEntries();
  enrichEntries();
  filterByFeedType();
  analyzeTags();
  performanceMetrics();

  console.info("\n✅ Examples completed\n");
}

main().catch(console.error);

