# 📡 RSS Scraper & Analyzer Guide

## Overview

Comprehensive Bun-native RSS 2.0 feed scraper with token-based content analysis. Zero-npm, enterprise-grade RSS processing with pattern detection and similarity matching.

---

## 🚀 Quick Start

### Basic Fetching

```typescript
import { RSSScraper } from "./src/networking/rss-scraper";

const scraper = new RSSScraper({ maxItems: 10 });
const feed = await scraper.fetch("https://bun.com/rss.xml");

console.log(feed.title);
console.log(feed.items.length);
```

### Token Analysis

```typescript
import { TokenMatcher } from "./src/utils/token-matcher";

const matcher = new TokenMatcher();
const analysis = matcher.extract("your text here");

console.log(analysis.uniqueCount);
console.log(analysis.frequency);
```

### Content Comparison

```typescript
const comparison = matcher.compare(textA, textB);

console.log(comparison.overlapScore);        // 0-1
console.log(comparison.jaccardSimilarity);   // 0-1
console.log(comparison.cosineSimilarity);    // 0-1
```

---

## 📚 API Reference

### RSSScraper

#### Constructor

```typescript
new RSSScraper(config?: RSSScraperConfig)
```

**Config Options:**
- `timeout?: number` - Request timeout (default: 10000ms)
- `userAgent?: string` - Custom user agent
- `followRedirects?: boolean` - Follow HTTP redirects (default: true)
- `maxItems?: number` - Maximum items to parse (default: 100)

#### Methods

**fetch(url: string): Promise<RSSFeed>**
- Fetches and parses RSS feed from URL
- Throws on network or parse errors

**parse(xml: string, sourceUrl: string): RSSFeed**
- Parses raw RSS XML content
- Returns structured feed data

### TokenMatcher

#### Constructor

```typescript
new TokenMatcher(config?: TokenMatcherConfig)
```

**Config Options:**
- `minTokenLength?: number` - Minimum token length (default: 3)
- `stopWords?: Set<string>` - Custom stop words
- `caseSensitive?: boolean` - Case sensitivity (default: false)
- `includeNumbers?: boolean` - Include numeric tokens (default: false)

#### Methods

**extract(text: string): TokenAnalysis**
- Extracts tokens from text
- Returns frequency map and metrics

**compare(textA: string, textB: string): TokenComparison**
- Compares two texts
- Returns similarity scores

**findPatterns(texts: string[], topN?: number): string[]**
- Finds common patterns across texts
- Returns top N keywords

---

## 🎯 Use Cases

### 1. Feed Monitoring

```typescript
const monitor = new RSSFeedMonitor(feedUrl, 60000);
await monitor.start();
```

### 2. Content Analysis

```typescript
const feed = await scraper.fetch(url);
const patterns = matcher.findPatterns(
  feed.items.map(i => `${i.title} ${i.description}`),
  10
);
```

### 3. Similarity Detection

```typescript
const comparison = matcher.compare(
  feed.items[0].description,
  feed.items[1].description
);

if (comparison.jaccardSimilarity > 0.7) {
  console.log("Similar content detected");
}
```

---

## 📊 Performance

| Operation | Throughput | Time |
|-----------|-----------|------|
| Fetch | 1-5 items/sec | ~200-1000ms |
| Extract | 10K+ tokens/sec | ~1-10ms |
| Compare | 1K+ comparisons/sec | ~1ms |
| Patterns | 100+ patterns/sec | ~10ms |

---

## 🔐 Security

✅ HTML entity decoding
✅ XML injection prevention
✅ Safe token extraction
✅ Error handling with context
✅ Timeout protection

---

## 📋 CLI Usage

```bash
# Basic fetch
bun rss-analyzer --url https://bun.com/rss.xml

# JSON output
bun rss-analyzer --url https://bun.com/rss.xml --format json

# With analysis
bun rss-analyzer --url https://bun.com/rss.xml --analyze --patterns

# Watch mode
bun rss-analyzer --url https://bun.com/rss.xml --watch --interval 60000

# Save to file
bun rss-analyzer --url https://bun.com/rss.xml --output feed.json
```

---

## 🧪 Testing

```bash
# Run all tests
bun test

# Run RSS tests only
bun test src/networking/rss-scraper.test.ts

# Run token tests only
bun test src/utils/token-matcher.test.ts
```

---

## 📁 File Structure

```
src/
├── networking/
│   ├── rss-scraper.ts       # Core RSS scraper
│   └── rss-scraper.test.ts  # RSS tests
├── utils/
│   ├── token-matcher.ts     # Token analysis
│   └── token-matcher.test.ts # Token tests
└── cli/
    └── rss-analyzer.ts      # CLI interface

examples/
├── rss-scraper-example.ts   # Basic examples
└── rss-monitor-example.ts   # Advanced monitoring
```

---

## 🔗 Integration

### With Table Utils

```typescript
import { toHTMLTable } from "./src/utils/table-utils";

const feed = await scraper.fetch(url);
const html = toHTMLTable(feed.items, {
  columns: ["title", "pubDate", "author"],
});
```

### With URL Pattern

```typescript
import { URLPatternMatcher } from "./src/networking/url-pattern";

const matcher = new URLPatternMatcher("/feed/:id");
if (matcher.test(feedUrl)) {
  const result = matcher.exec(feedUrl);
  // Process feed
}
```

---

## 📝 Examples

See `examples/` directory for:
- `rss-scraper-example.ts` - Basic usage
- `rss-monitor-example.ts` - Monitoring & trends

---

**Version**: 1.0.0.0 | **Bun**: 1.3.4+ | **Status**: ✅ PRODUCTION-READY

