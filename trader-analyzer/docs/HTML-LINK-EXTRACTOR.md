# HTML Link Extractor

**Version:** 1.0.0  
**Module:** `src/utils/html-link-extractor.ts`

## Overview

HTML link extraction utility using Bun's HTMLRewriter API, following the official Bun documentation pattern for extracting links from webpages.

**Reference:** [Bun HTMLRewriter - Extract Links Guide](https://bun.sh/docs/guides/html-rewriter/extract-links)

## Features

- ✅ Extract all links from HTML content
- ✅ Filter by link type (external, internal, anchor, mailto, tel)
- ✅ Filter by URL pattern (regex)
- ✅ Filter by rel attribute
- ✅ Extract unique domains
- ✅ Group links by domain
- ✅ Support multiple input types (string, Response, ArrayBuffer, File)
- ✅ Limit number of extracted links

## API

### `extractLinks(html, options?)`

Extract links from HTML content (async, supports Response/File).

```typescript
const links = await extractLinks(htmlString, {
  externalOnly: true,
  maxLinks: 10
});
```

### `extractLinksSync(html, options?)`

Extract links from HTML string synchronously.

```typescript
const links = extractLinksSync(htmlString, {
  internalOnly: true
});
```

### `extractDomains(links)`

Extract unique domains from extracted links.

```typescript
const domains = extractDomains(links);
// Returns: Set<string>
```

### `groupLinksByDomain(links)`

Group links by their domain.

```typescript
const grouped = groupLinksByDomain(links);
// Returns: Map<string, ExtractedLink[]>
```

## ExtractedLink Interface

```typescript
interface ExtractedLink {
  url: string;              // Link URL (href attribute)
  text: string;             // Link text content
  title?: string;           // Link title attribute
  target?: string;          // Link target attribute
  rel?: string;             // Link rel attribute
  isExternal: boolean;      // Whether link is external
  isAnchor: boolean;        // Whether link is an anchor (#)
  isMailto: boolean;        // Whether link is mailto:
  isTel: boolean;           // Whether link is tel:
  attributes: Record<string, string>; // All link attributes
}
```

## Options

```typescript
interface LinkExtractionOptions {
  externalOnly?: boolean;      // Include only external links
  internalOnly?: boolean;      // Include only internal links
  urlPattern?: RegExp;        // Filter by URL pattern
  relFilter?: string[];       // Filter by rel attribute values
  includeAnchors?: boolean;   // Include anchor links (default: true)
  includeMailto?: boolean;    // Include mailto links (default: true)
  includeTel?: boolean;       // Include tel links (default: true)
  maxLinks?: number;          // Maximum number of links to extract
}
```

## Usage Examples

### Basic Link Extraction

```typescript
import { extractLinksSync } from "./src/utils/html-link-extractor";

const html = '<a href="https://example.com">Example</a>';
const links = extractLinksSync(html);
// Returns: [{ url: 'https://example.com', text: 'Example', ... }]
```

### Extract External Links Only

```typescript
const externalLinks = extractLinksSync(html, {
  externalOnly: true
});
```

### Filter by URL Pattern

```typescript
const exampleLinks = extractLinksSync(html, {
  urlPattern: /example\.com/i
});
```

### Extract Domains

```typescript
import { extractLinksSync, extractDomains } from "./src/utils/html-link-extractor";

const links = extractLinksSync(html);
const domains = extractDomains(links);
// Returns: Set(['example.com', 'github.com', ...])
```

### Group by Domain

```typescript
import { extractLinksSync, groupLinksByDomain } from "./src/utils/html-link-extractor";

const links = extractLinksSync(html);
const grouped = groupLinksByDomain(links);
// Returns: Map([
//   ['example.com', [link1, link2]],
//   ['github.com', [link3]],
//   ['internal', [link4]]
// ])
```

### Extract from Response

```typescript
import { extractLinks } from "./src/utils/html-link-extractor";

const response = await fetch('https://example.com');
const links = await extractLinks(response, {
  externalOnly: true,
  maxLinks: 50
});
```

## Implementation Details

The implementation follows Bun's HTMLRewriter pattern:

1. **Element Handler**: Captures `<a>` elements and extracts attributes
2. **Text Handler**: Accumulates text content within anchor tags
3. **State Tracking**: Tracks current link being processed
4. **Filtering**: Applies filters before adding links to results

### Key Implementation Pattern

```typescript
let currentLink: Partial<ExtractedLink> | null = null;
let currentText = "";

const rewriter = new HTMLRewriter()
  .on("a", {
    element: (element) => {
      // Save previous link
      if (currentLink && currentLink.url) {
        // Process and add link
      }
      
      // Start new link
      const href = element.getAttribute("href");
      currentLink = { url: href, ... };
      currentText = "";
    },
  })
  .on("a", {
    text: (textChunk) => {
      if (currentLink) {
        currentText += textChunk.text;
      }
    },
  });
```

## Demo

Run the demo to see all features:

```bash
bun run examples/demos/demo-link-extractor.ts
```

## Integration

The link extractor can be integrated into:

- **Web Scraping**: Extract links from crawled pages
- **Content Analysis**: Analyze link patterns in HTML
- **Security Scanning**: Check for suspicious external links
- **SEO Tools**: Extract and analyze internal/external link structure
- **Documentation Tools**: Extract links from documentation HTML

## Requirements

- Bun 1.4+ (or use `--compat` flag)
- HTMLRewriter API available

## Related Documentation

- [Bun HTMLRewriter Guide](https://bun.sh/docs/guides/html-rewriter/extract-links)
- [HTMLRewriter API Reference](https://bun.sh/docs/runtime/html-rewriter)
- [UIContextRewriter Service](./6.1.1.2.2.0.0-HTMLREWRITER-UNIFIED-DEPLOYMENT.md)
