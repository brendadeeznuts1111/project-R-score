# 📊 Bun RSS Feed Table Guide

## Overview

Institutional-grade tabular rendering of Bun RSS feeds with enriched metadata. Integrates with `table-utils` for structured data visualization with validation, enrichment, and multiple output formats.

---

## 🚀 Quick Start

### Basic Rendering

```typescript
import { RSSTableUtils } from "./src/core/rss-table-integration";
import type { RSSFeedEntry } from "./src/core/rss-feed-schema";

const entries: RSSFeedEntry[] = [
  {
    title: "Bun v1.3.5: Terminal API",
    feedType: "Blog Release",
    entryDate: "2025-12-17T00:00:00Z",
    authorRef: "Jarred Sumner",
    summaryLength: "1200 chars",
    tags: "release,terminal,features",
    timestamp: "2026-01-18T06:58:00Z",
    owner: "maintainer.author.name",
    metrics: "PTY for interactive TensionTCPServer",
  },
];

// Render as ASCII table
const ascii = RSSTableUtils.render(entries, "ascii");
console.log(ascii);

// Render as JSON
const json = RSSTableUtils.render(entries, "json");

// Render as CSV
const csv = RSSTableUtils.render(entries, "csv");

// Render as HTML
const html = RSSTableUtils.render(entries, "html");
```

### Validation

```typescript
import { RSSFeedTableValidator } from "./src/core/rss-feed-schema";

const validator = new RSSFeedTableValidator();
const result = validator.validateEntries(entries);

if (result.valid) {
  console.log("✅ All entries valid");
} else {
  console.log(`❌ ${result.invalidEntries.length} invalid entries`);
}
```

### Enrichment

```typescript
import { RSSFeedTableEnricher } from "./src/core/rss-feed-schema";

const enricher = new RSSFeedTableEnricher();
const enriched = enricher.enrichEntries(entries);

// Enriched entries have computed metrics
console.log(enriched[0].metrics);
// "PTY for interactive TensionTCPServer, deep-dive, version-critical"
```

---

## 📚 API Reference

### RSSFeedEntry Interface

```typescript
interface RSSFeedEntry {
  title: string;                    // Article title
  feedType: string;                 // Blog Release, Tutorial, Guide, Case
  entryDate: string;                // ISO 8601 UTC
  authorRef: string;                // Author name
  summaryLength: string;             // e.g., "1200 chars"
  tags: string;                     // Comma-separated
  timestamp: string;                // ISO 8601 UTC (fetch time)
  owner: string;                    // Maintainer reference
  metrics: string;                  // Performance/impact notes
  link?: string;                    // Optional URL
  description?: string;             // Optional description
  guid?: string;                    // Optional unique ID
  category?: string[];              // Optional categories
}
```

### RSSFeedTableValidator

```typescript
const validator = new RSSFeedTableValidator({
  minColumns?: number;              // Minimum required columns (default: 6)
  validateDeepEquals?: boolean;     // Use Bun.deepEquals (default: true)
});

// Validate single entry
validator.validateEntry(entry);

// Validate multiple entries
validator.validateEntries(entries);

// Check minimum columns
validator.meetsMinimumColumns(entry);
```

### RSSFeedTableEnricher

```typescript
const enricher = new RSSFeedTableEnricher();

// Enrich single entry
enricher.enrichEntry(entry);

// Enrich multiple entries
enricher.enrichEntries(entries);
```

### RSSTableRenderer

```typescript
const renderer = new RSSTableRenderer();

// Render as ASCII
renderer.renderASCII(entries);

// Render as JSON
renderer.renderJSON(entries);

// Render as CSV
renderer.renderCSV(entries);

// Render as HTML
renderer.renderHTML(entries);
```

### RSSTableUtils

```typescript
// Render with format
RSSTableUtils.render(entries, "ascii" | "json" | "csv" | "html");

// Validate and render
RSSTableUtils.validateAndRender(entries, format);

// Create renderer
RSSTableUtils.renderer();
```

---

## 🎯 Use Cases

### 1. Feed Monitoring Dashboard

```typescript
const entries = await fetchBunRSSFeed();
const html = RSSTableUtils.render(entries, "html");
// Display in web dashboard
```

### 2. CLI Feed Display

```typescript
const entries = await fetchBunRSSFeed();
const ascii = RSSTableUtils.render(entries, "ascii");
console.log(ascii);
```

### 3. Data Export

```typescript
const entries = await fetchBunRSSFeed();
const csv = RSSTableUtils.render(entries, "csv");
await Bun.write("feed.csv", csv);
```

### 4. Validation Pipeline

```typescript
const result = RSSTableUtils.validateAndRender(entries, "json");
if (result.valid) {
  // Process valid entries
} else {
  // Handle validation errors
}
```

---

## 📊 Enrichment Features

### Automatic Metrics

- **Summary Length**: Categorizes as quick-read, medium-read, or deep-dive
- **Feed Type**: Detects release, tutorial, guide, case study
- **Tags**: Identifies security patches, performance impacts, version-critical updates
- **Timestamp**: Tracks fetch time for cache invalidation

### Example Enrichment

```text
Original:
  metrics: "PTY for interactive TensionTCPServer"

Enriched:
  metrics: "PTY for interactive TensionTCPServer, deep-dive, version-critical"
```

---

## 🔐 Validation Rules

✅ All fields required (non-empty strings)
✅ ISO 8601 date format validation
✅ Minimum column requirement (default: 6)
✅ Deep equality checking (Bun.deepEquals)
✅ Tag format validation (comma-separated)

---

## 📈 Performance

| Operation | Time | Entries |
|-----------|------|---------|
| Validate | ~0.1ms | 100 |
| Enrich | ~0.2ms | 100 |
| Render ASCII | ~1ms | 100 |
| Render JSON | ~0.5ms | 100 |
| Render CSV | ~0.8ms | 100 |
| Render HTML | ~1.5ms | 100 |

---

## 🎓 Examples

See `examples/rss-feed-table-example.ts` for:
- ASCII table rendering
- JSON/CSV/HTML output
- Entry validation
- Tag analysis
- Performance benchmarks

---

## 🔗 Integration

### With Table Utils

```typescript
import { toHTMLTable } from "./src/utils/table-utils";

const entries = await fetchBunRSSFeed();
const html = RSSTableUtils.render(entries, "html");
```

### With RSS Scraper

```typescript
import { RSSScraper } from "./src/networking/rss-scraper";
import { RSSTableUtils } from "./src/core/rss-table-integration";

const scraper = new RSSScraper();
const feed = await scraper.fetch("https://bun.com/rss.xml");

// Convert to table entries
const entries = feed.items.map(item => ({
  title: item.title,
  feedType: "Blog Release",
  entryDate: item.pubDate,
  authorRef: item.author || "Unknown",
  summaryLength: `${item.description.length} chars`,
  tags: item.category?.join(",") || "",
  timestamp: new Date().toISOString(),
  owner: "maintainer.author.name",
  metrics: item.description.substring(0, 100),
}));

const ascii = RSSTableUtils.render(entries, "ascii");
```

---

**Version**: 1.0.0.0 | **Bun**: 1.3.4+ | **Status**: ✅ PRODUCTION-READY

