# HTML Headers Bun Fetch Enhancements

## Overview
Enhanced the reusable HTML headers module (`cli/html-headers.ts`) to leverage Bun's native fetch capabilities for improved performance optimization.

## Key Improvements

### 1. **Bun Native DNS Prefetch**
- Uses `Bun.dns.prefetch()` to pre-resolve hostnames at HTML generation time
- Reduces DNS lookup latency for subsequent browser requests
- Automatically deduplicates hostnames to avoid redundant prefetch operations

### 2. **Bun Native Preconnect**
- Uses `fetch.preconnect()` to establish TCP connections before requests
- Pre-resolves DNS and establishes connections for critical resources
- Configurable for HTTP/HTTPS/TCP connections

### 3. **Resource Hint Optimization**
- New `optimizeResourceHints()` function that uses Bun's native capabilities
- Automatically optimizes all resource hints (preconnect, dns-prefetch, preload, prefetch)
- Gracefully handles errors without breaking HTML generation

### 4. **Enhanced Resource Management**
- New `ResourceHint` interface for type-safe resource hint definitions
- New `generateResourceHints()` function for generating optimized HTML link tags
- Support for additional custom resources via `additionalResources` option

## API Changes

### New Functions

#### `optimizeResourceHints(resources: ResourceHint[]): Promise<void>`
Pre-optimizes resource hints using Bun's native fetch capabilities.

```typescript
await optimizeResourceHints([
  { url: 'https://cdn.jsdelivr.net', type: 'preconnect', crossorigin: true },
  { url: 'https://example.com', type: 'dns-prefetch' }
]);
```

#### `generateResourceHints(resources: ResourceHint[]): string`
Generates HTML `<link>` tags for resource hints.

### Updated Functions

#### `generateHTMLHead()` → `async generateHTMLHead()`
Now async and uses Bun's native optimizations:
- Automatically optimizes Chart.js CDN resources when `includeChartJS: true`
- Accepts `additionalResources` parameter for custom resource hints
- Pre-resolves DNS and establishes connections before HTML generation

#### `generateHTMLDocument()` → `async generateHTMLDocument()`
Now async to support the async `generateHTMLHead()` function.

## Updated Files

1. **`cli/html-headers.ts`**
   - Added `ResourceHint` interface
   - Added `optimizeResourceHints()` function
   - Added `generateResourceHints()` function
   - Made `generateHTMLHead()` async
   - Made `generateHTMLDocument()` async
   - Enhanced resource hint generation with Bun optimizations

2. **`cli/analyze.ts`**
   - Updated `formatClassesHTML()` to be async
   - Updated call site to await `generateHTMLHead()`

3. **`cli/diagnose.ts`**
   - Updated `formatHTML()` to be async
   - Updated call site to await `generateHTMLHead()`

4. **`src/server/kyc/__tests__/generate-html-report.ts`**
   - Updated `generateHTML()` to be async
   - Updated call site to await `generateHTMLHead()`

## Performance Benefits

1. **Faster DNS Resolution**: DNS is pre-resolved at HTML generation time, reducing browser DNS lookup latency
2. **Pre-established Connections**: TCP connections are established before the browser makes requests
3. **Reduced Latency**: Critical resources (like Chart.js CDN) load faster due to pre-optimization
4. **Better Resource Prioritization**: Resource hints are optimized based on actual resource discovery

## Usage Example

```typescript
import { generateHTMLHead, ResourceHint } from './html-headers';

// With Chart.js (automatically optimized)
const head = await generateHTMLHead({
  title: "My Report",
  includeChartJS: true,
  includeDarkMode: true
});

// With custom resources
const customResources: ResourceHint[] = [
  { url: 'https://fonts.googleapis.com', type: 'preconnect', crossorigin: true },
  { url: 'https://fonts.gstatic.com', type: 'dns-prefetch' }
];

const head = await generateHTMLHead({
  title: "My Report",
  additionalResources: customResources
});
```

## Backward Compatibility

- All existing code continues to work (functions are now async but maintain the same interface)
- Resource hints are still generated as HTML `<link>` tags for browser compatibility
- Bun optimizations are additive - if Bun APIs aren't available, HTML generation still works

## Technical Details

### DNS Prefetch
- Uses `Bun.dns.prefetch(hostname, port?)` to pre-resolve DNS
- Deduplicates hostnames to avoid redundant operations
- Works for both IPv4 and IPv6 (port helps distinguish)

### Preconnect
- Uses `fetch.preconnect(url, options)` to establish connections
- Configurable for DNS, HTTP, HTTPS, and TCP
- Only applied to resources marked as `type: 'preconnect'`

### Error Handling
- Optimizations fail gracefully - errors are logged but don't break HTML generation
- HTML resource hints are always generated regardless of optimization success
- Ensures reports are always generated even if network optimizations fail
