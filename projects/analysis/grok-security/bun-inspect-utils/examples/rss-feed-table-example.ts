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
  console.log("\n📊 [1.1.0.0] Bun RSS Feed - ASCII Table");
  console.log("─".repeat(80));

  const output = RSSTableUtils.render(BUN_RSS_ENTRIES, "ascii");
  console.log(output);
}

/**
 * [1.2.0.0] Display JSON output
 */
function displayJSON(): void {
  console.log("\n📋 [1.2.0.0] Bun RSS Feed - JSON Output");
  console.log("─".repeat(80));

  const output = RSSTableUtils.render(BUN_RSS_ENTRIES, "json");
  console.log(output);
}

/**
 * [1.3.0.0] Display CSV output
 */
function displayCSV(): void {
  console.log("\n📄 [1.3.0.0] Bun RSS Feed - CSV Output");
  console.log("─".repeat(80));

  const output = RSSTableUtils.render(BUN_RSS_ENTRIES, "csv");
  console.log(output);
}

/**
 * [1.4.0.0] Validate entries
 */
function validateEntries(): void {
  console.log("\n✅ [1.4.0.0] Entry Validation");
  console.log("─".repeat(80));

  const validator = new RSSFeedTableValidator();
  const result = validator.validateEntries(BUN_RSS_ENTRIES);

  console.log(`Total Entries: ${result.totalEntries}`);
  console.log(`Valid Entries: ${result.validEntries}`);
  console.log(`Invalid Entries: ${result.invalidEntries.length}`);

  if (result.valid) {
    console.log("✅ All entries are valid!");
  } else {
    console.log("❌ Some entries have errors:");
    for (const invalid of result.invalidEntries) {
      console.log(`  Entry ${invalid.index}:`);
      for (const error of invalid.errors) {
        console.log(`    - ${error}`);
      }
    }
  }
}

/**
 * [1.5.0.0] Enrich entries
 */
function enrichEntries(): void {
  console.log("\n🎯 [1.5.0.0] Entry Enrichment");
  console.log("─".repeat(80));

  const enricher = new RSSFeedTableEnricher();
  const enriched = enricher.enrichEntries(BUN_RSS_ENTRIES);

  for (let i = 0; i < Math.min(3, enriched.length); i++) {
    const entry = enriched[i];
    console.log(`\n${i + 1}. ${entry.title}`);
    console.log(`   Type: ${entry.feedType}`);
    console.log(`   Author: ${entry.authorRef}`);
    console.log(`   Summary: ${entry.summaryLength}`);
    console.log(`   Metrics: ${entry.metrics}`);
  }
}

/**
 * [1.6.0.0] Filter by feed type
 */
function filterByFeedType(): void {
  console.log("\n🔍 [1.6.0.0] Filter by Feed Type");
  console.log("─".repeat(80));

  const releases = BUN_RSS_ENTRIES.filter((e) => e.feedType === "Blog Release");
  const tutorials = BUN_RSS_ENTRIES.filter((e) => e.feedType === "Blog Tutorial");

  console.log(`\nReleases (${releases.length}):`);
  for (const entry of releases) {
    console.log(`  • ${entry.title}`);
  }

  console.log(`\nTutorials (${tutorials.length}):`);
  for (const entry of tutorials) {
    console.log(`  • ${entry.title}`);
  }
}

/**
 * [1.7.0.0] Analyze tags
 */
function analyzeTags(): void {
  console.log("\n🏷️  [1.7.0.0] Tag Analysis");
  console.log("─".repeat(80));

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

  console.log("\nTop Tags:");
  for (const [tag, count] of sorted) {
    const bar = "█".repeat(count);
    console.log(`  ${tag.padEnd(15)} ${bar} ${count}`);
  }
}

/**
 * [1.8.0.0] Performance metrics
 */
function performanceMetrics(): void {
  console.log("\n⚡ [1.8.0.0] Performance Metrics");
  console.log("─".repeat(80));

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

  console.log(`\nRendering Times (${BUN_RSS_ENTRIES.length} entries):`);
  console.log(`  ASCII: ${asciiTime.toFixed(2)}ms`);
  console.log(`  JSON:  ${jsonTime.toFixed(2)}ms`);
  console.log(`  CSV:   ${csvTime.toFixed(2)}ms`);
  console.log(`  HTML:  ${htmlTime.toFixed(2)}ms`);
}

/**
 * [1.9.0.0] Main execution
 */
async function main(): Promise<void> {
  console.log("\n🌐 [1.0.0.0] Bun RSS Feed Table Examples\n");

  displayASCIITable();
  validateEntries();
  enrichEntries();
  filterByFeedType();
  analyzeTags();
  performanceMetrics();

  console.log("\n✅ Examples completed\n");
}

main().catch(console.error);

