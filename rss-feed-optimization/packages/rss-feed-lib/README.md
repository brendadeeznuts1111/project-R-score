# @rss-feed/optimization

High-performance RSS feed optimization library for Bun.js v1.3.7+

## Features

- **RSS Parser** - High-performance RSS/Atom feed parsing with caching
- **RSS Generator** - Generate RSS XML and JSON feeds with Bun-native APIs
- **Bun-native APIs** - Uses Bun.JSONL, Bun.JSON5, Bun.wrapAnsi, Bun.stringWidth
- **Streaming** - JSONL streaming with backpressure handling
- **Resilience** - Circuit breakers and exponential backoff retry
- **DNS Optimization** - Prefetch and preconnect for reduced latency
- **Performance Monitoring** - Built-in performance tracking and metrics
- **R2 Storage** - Cloudflare R2 integration via Bun S3 API

## Installation

```bash
bun add @rss-feed/optimization
```

## Quick Start

### RSS Parser

```typescript
import { RSSParser, PerformanceMonitor } from '@rss-feed/optimization'

const parser = new RSSParser({
  streaming: true,
  cache: 'memory',
  maxAge: 3600,
  timeout: 30000
})

const monitor = new PerformanceMonitor()

const feed = await monitor.track('parse-feed', async () => {
  return await parser.parse('https://example.com/feed.xml')
})

console.log(`Parsed ${feed.items.length} items in ${feed.title}`)
console.log(`Performance: ${JSON.stringify(monitor.getStats('parse-feed'))}`)
```

### RSS Generator

```typescript
import { RSSGenerator } from '@rss-feed/optimization'

const generator = new RSSGenerator({
  title: 'My Blog Feed',
  link: 'https://myblog.com',
  description: 'Latest posts from my blog'
})

generator.addItem({
  title: 'My First Post',
  link: 'https://myblog.com/post1',
  description: 'This is my first blog post',
  pubDate: new Date(),
  guid: 'post1'
})

// Generate RSS XML
const rssXML = generator.generate()

// Generate JSON Feed
const jsonFeed = generator.generateJSON()
```

## Exports

### Core
```typescript
import { RSSParser, RSSGenerator, PerformanceMonitor } from '@rss-feed/optimization'
```

### Config
```typescript
import { ConfigManager, initConfig, getConfig } from '@rss-feed/optimization/config'
```

### Resilience
```typescript
import { CircuitBreaker, RetryWithBackoff, RetryConfigs } from '@rss-feed/optimization/resilience'
```

### Streaming
```typescript
import { EnhancedJSONLStreamer } from '@rss-feed/optimization/streaming'
```

### DNS
```typescript
import { DNSOptimizer, ConnectionOptimizer } from '@rss-feed/optimization/dns'
```

### Parser
```typescript
import { RSSParser } from '@rss-feed/optimization/parser'
```

### Generator
```typescript
import { RSSGenerator } from '@rss-feed/optimization/generator'
```

### Performance
```typescript
import { PerformanceMonitor } from '@rss-feed/optimization/performance'
```

## CLI Usage

Parse and analyze RSS feeds from command line:

```bash
# Parse a feed and output RSS XML
bun run src/cli.js --url https://example.com/feed.xml --output rss

# Parse a feed and output JSON
bun run src/cli.js --url https://example.com/feed.xml --output json

# Parse with streaming disabled
bun run src/cli.js --url https://example.com/feed.xml --streaming false

# Parse without caching
bun run src/cli.js --url https://example.com/feed.xml --cache false

# Show help
bun run src/cli.js --help
```

## Parser Options

```typescript
interface ParserOptions {
  streaming: boolean;           // Use streaming parser (default: true)
  cache: 'memory' | 'redis' | 'r2' | 'none';  // Cache strategy
  maxAge?: number;              // Cache max age in seconds (default: 3600)
  timeout: number;              // Request timeout in ms (default: 30000)
  retries: number;              // Number of retry attempts (default: 3)
}
```

## Performance Features

- **DNS Prefetching**: Sub-millisecond DNS resolution
- **Connection Preconnect**: Warm TCP/TLS connections
- **Streaming Parser**: Memory-efficient for large feeds
- **Caching**: In-memory cache with TTL
- **Performance Monitoring**: Track parse times and metrics
- **Circuit Breaker**: Prevent cascading failures
- **Retry Logic**: Exponential backoff with jitter

## Bun v1.3.7 Features Used

- `Bun.JSONL` - Native JSONL parsing with `parseChunk()` for streaming
- `Bun.JSON5` - Lenient JSON parsing with native `.json5` file imports
- `Bun.wrapAnsi` - ANSI text wrapping
- `Bun.stringWidth` - String width calculation
- `Bun.s3` - S3/R2 storage API with browser download control
- `dns.prefetch()` - DNS optimization
- `fetch.preconnect()` - Connection warming

## Production Features (Bun v1.3.7+)

### S3/R2 Browser Download Control

Fixed browser download behavior with `contentDisposition` in presigned URLs:

```typescript
import { s3 } from "bun";

// Generate presigned URL with browser download control
const file = s3.file("report.pdf");
const url = await file.presign({
  contentDisposition: 'attachment; filename="Q4-Report.pdf"',
  type: "application/pdf",
  expiresIn: 3600
});

// Browser will download as "Q4-Report.pdf" instead of opening
```

The R2 client automatically uses this for image uploads:

```typescript
const result = await storage.uploadImage(buffer, "report.pdf", "application/pdf");
// result.url includes proper contentDisposition for browser downloads
```

### Clean Package Publishing

Use `bun pm pack` with automatic `devDependencies` removal:

```bash
# Package automatically removes devDependencies
bun pm pack

# Or use npm prepack script
npm pack
```

The `prepack` script automatically cleans `devDependencies` before packaging, ensuring production packages only include runtime dependencies.

### Chrome DevTools Profiling

Profile your application with Chrome DevTools integration:

```typescript
import inspector from "node:inspector/promises";

// Start profiling
await inspector.start();

// Your code here
await processRSSFeeds();

// Stop and save profile
await inspector.stop();
// profile.cpuprofile ? Load in Chrome DevTools!
```

### Binary Processing Speedups

Bun v1.3.7 includes optimized buffer operations:

```typescript
// 1.8x faster Buffer.swap16()
const buffer = Buffer.from([0x12, 0x34, 0x56, 0x78]);
buffer.swap16(); // Faster endian conversion

// 3.6x faster Buffer.swap64()
buffer.swap64(); // Optimized for large buffers
```

### Global Text Support

Enhanced Unicode support for international text:

```typescript
Bun.stringWidth("???")  // Devanagari conjuncts ? width: 2
Bun.stringWidth("??") // Chinese characters ? proper width
```

### Next.js 16 Compatibility

Full compatibility with Next.js 16 caching:

```typescript
const timer = setTimeout(() => {}, 1000);
timer._idleStart  // Cache Components work!
```

### Custom REPLs

Create Node.js-compatible REPLs:

```typescript
const transpiler = new Bun.Transpiler({ replMode: true });
// Node.js-compatible REPL environment
```

## Profiling & Performance Analysis

Bun provides built-in profiling tools for analyzing performance and memory usage:

### CPU Profiling

Generate CPU profiles in Markdown format for easy sharing and LLM analysis:

```bash
# Generate markdown profile only
bun --cpu-prof-md src/main.js

# Generate both Chrome DevTools JSON and markdown formats
bun --cpu-prof --cpu-prof-md src/main.js

# Custom output location
bun --cpu-prof-md --cpu-prof-dir ./profiles --cpu-prof-name my-profile.md src/main.js
```

The markdown output includes:
- Summary table with duration, sample count, and interval
- Hot functions ranked by self-time percentage
- Call tree showing total time including children
- Function details with caller/callee relationships
- File breakdown showing time spent per source file

### Heap Profiling

Diagnose memory leaks and analyze memory usage:

```bash
# Generate V8-compatible heap snapshot (opens in Chrome DevTools)
bun --heap-prof src/main.js

# Generate markdown heap profile (for CLI analysis)
bun --heap-prof-md src/main.js

# Specify output location
bun --heap-prof --heap-prof-dir ./profiles --heap-prof-name my-snapshot.heapsnapshot src/main.js
```

The `--heap-prof` flag generates `.heapsnapshot` files that can be loaded directly into Chrome DevTools. The `--heap-prof-md` flag generates a markdown report optimized for command-line analysis with grep/sed/awk.

### JSON5 Configuration Files

Bun now supports native `.json5` file imports, making configuration files more readable:

```typescript
// config.json5
{
  // Database configuration
  database: {
    host: 'localhost',
    port: 5432,
    ssl: true,  // Trailing commas allowed
  },
  // API settings
  api: {
    timeout: 5000,
    retries: 3,
  },
}

// Import directly
import config from './config.json5'
```

Use `Bun.JSON5.parse()` and `Bun.JSON5.stringify()` for programmatic JSON5 handling.

## Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/rss-parser.test.js

# Run with coverage
bun test --coverage
```

## Bun Template Creation

The RSS Feed Library includes a Bun template for quickly starting new RSS feed projects.

### Creating a New Project

```bash
# Create a new RSS feed project using the template
bun create rss-starter my-rss-app
cd my-rss-app
bun install

# Start development
bun dev
```

### Template Features

The template includes:
- **Complete Example Application**: Working RSS parser and generator
- **Advanced Examples**: Multi-feed aggregation, caching, error handling
- **Performance Monitoring**: Built-in metrics and monitoring
- **Best Practices**: Proper error handling and configuration
- **Documentation**: Comprehensive README with usage examples

### Template Structure

```
my-rss-app/
   index.js              # Main application with basic examples
   examples/             # Advanced usage patterns
      advanced-usage.js # Multi-feed aggregation, caching, resilience
   package.json          # Project config with bun-create setup
   README.md            # Project documentation
```

### Customizing Templates

You can customize the template by modifying the files in `.bun-create/rss-starter/`:

- **Global Templates**: `$HOME/.bun-create/<name>`
- **Project Templates**: `<project-root>/.bun-create/<name>`
- **Custom Directory**: Set `BUN_CREATE_DIR` environment variable

### Setup Scripts

The template supports custom setup scripts in `package.json`:

```json
{
  "bun-create": {
    "preinstall": "echo 'Setting up RSS Feed Library starter project...'",
    "postinstall": [
      "echo ' RSS Feed Library starter project created successfully!'",
      "echo '=? Next steps:'",
      "echo '  1. Run \"bun dev\" to start the development server'",
      "echo '  2. Run \"bun test\" to run tests'",
      "echo '  3. Check out examples/ for usage examples'"
    ],
    "start": "bun run index.js"
  }
}
```

### CLI Flags

```bash
bun create rss-starter my-app --force     # Overwrite existing files
bun create rss-starter my-app --no-install # Skip dependency installation
bun create rss-starter my-app --no-git    # Don't initialize git repo
bun create rss-starter my-app --open      # Open in browser after finish
```

### Environment Variables

- `GITHUB_API_DOMAIN`: Customize GitHub domain for template downloads
- `GITHUB_TOKEN` or `GITHUB_ACCESS_TOKEN`: Use for private repositories or to avoid rate limiting

## License

MIT
