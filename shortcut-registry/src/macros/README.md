# Bun Macros for ShortcutRegistry

This directory contains Bun macros that execute at bundle-time to provide build-time functionality for the ShortcutRegistry system.

## What are Bun Macros?

Bun macros are JavaScript functions that run during the bundling process. Their return values are directly inlined into your bundle, allowing you to:

- Generate code at build time
- Validate configurations before runtime
- Embed data from external sources
- Perform build-time computations

## Available Macros

### `getDefaultShortcuts.ts`

Get default shortcuts at bundle-time.

```ts
import { getDefaultShortcuts, getShortcutsByCategory, getShortcutIds } 
  from './macros/getDefaultShortcuts.ts' with { type: 'macro' };

// Get all default shortcuts
const shortcuts = getDefaultShortcuts();

// Get shortcuts by category
const generalShortcuts = getShortcutsByCategory('general');

// Get just the IDs
const ids = getShortcutIds();
```

### `getGitCommitHash.ts`

Get Git commit information at bundle-time using `Bun.spawnSync`.

```ts
import { getGitCommitHash, getShortCommitHash, getCommitInfo } 
  from './macros/getGitCommitHash.ts' with { type: 'macro' };

// Full commit hash (synchronous)
const hash = getGitCommitHash(); // "3ee3259104e4507cf62c160f0ff5357ec4c7a7f8"

// Short hash (7 chars)
const short = getShortCommitHash(); // "3ee3259"

// Complete commit info
const info = getCommitInfo();
// { hash: "...", shortHash: "...", timestamp: "..." }
```

### `validateShortcuts.ts`

Validate shortcut configurations at build-time to catch errors early.

```ts
import { validateShortcuts, getShortcutStats } 
  from './macros/validateShortcuts.ts' with { type: 'macro' };

// This will fail the build if shortcuts are invalid
const result = validateShortcuts();

// Get statistics about shortcuts
const stats = getShortcutStats();
// { total: 10, byCategory: {...}, byScope: {...} }
```

### `getBuildInfo.ts`

Get comprehensive build information.

```ts
import { getBuildInfo, getBuildVersion } 
  from './macros/getBuildInfo.ts' with { type: 'macro' };

// Complete build info (synchronous)
const info = getBuildInfo();
// { version: "1.0.0", buildTime: "...", gitCommit: "...", ... }

// Simple version string
const version = getBuildVersion(); // "1.0.0-3ee3259"
```

### `fetchShortcuts.ts`

Fetch data from HTTP APIs at bundle-time using `fetch()`.

```ts
import { fetchShortcutsFromAPI, fetchAPIMetadata, fetchShortcutStats } 
  from './macros/fetchShortcuts.ts' with { type: 'macro' };

// Fetch shortcuts from API (async - Bun awaits automatically)
const shortcuts = await fetchShortcutsFromAPI('http://localhost:3000/api/shortcuts');

// Fetch API metadata
const metadata = await fetchAPIMetadata('http://localhost:3000');

// Fetch usage statistics
const stats = await fetchShortcutStats('http://localhost:3000', 30);
```

**Note:** The URL must be statically known (string literal or result of another macro). If the API is unavailable at build-time, these macros return safe defaults to allow the build to continue.

### `extractMetaTags.ts`

Extract meta tags from HTML pages at bundle-time using `fetch()` and `HTMLRewriter`.

```ts
import { extractMetaTags, extractOpenGraphTags, extractStructuredData } 
  from './macros/extractMetaTags.ts' with { type: 'macro' };

// Extract all meta tags (async - Bun awaits automatically)
const meta = await extractMetaTags('https://example.com');
// { title: "Example Domain", description: "...", viewport: "...", ... }

// Extract Open Graph tags specifically
const ogTags = await extractOpenGraphTags('https://example.com');
// { title: "...", description: "...", image: "...", ... }

// Extract structured data (JSON-LD)
const structuredData = await extractStructuredData('https://example.com');
// [{ "@context": "https://schema.org", "@type": "WebSite", ... }]
```

This macro demonstrates the same pattern as shown in Bun's documentation - making HTTP requests and parsing HTML during bundling, with the results inlined into your bundle.

## Usage Examples

### Embed shortcuts in your bundle

```ts
import { getDefaultShortcuts } from './macros/getDefaultShortcuts.ts' with { type: 'macro' };

// These shortcuts are embedded at build time
const shortcuts = getDefaultShortcuts();

export function initializeShortcuts() {
  // Use the embedded shortcuts
  shortcuts.forEach(shortcut => {
    console.log(`Shortcut: ${shortcut.id} -> ${shortcut.default.primary}`);
  });
}
```

### Validate shortcuts during build

```ts
import { validateShortcuts } from './macros/validateShortcuts.ts' with { type: 'macro' };

// This runs at build time - if shortcuts are invalid, the build fails
validateShortcuts();

// Your code continues...
```

### Display build information

```ts
import { getBuildInfo } from './macros/getBuildInfo.ts' with { type: 'macro' };

const buildInfo = getBuildInfo();

export function displayVersion() {
  console.log(`ShortcutRegistry v${buildInfo.version}`);
  console.log(`Built: ${buildInfo.buildTime}`);
  console.log(`Commit: ${buildInfo.shortCommit}`);
}
```

## Building with Macros

When you build your project, macros are executed and their results are inlined:

```bash
# Build with macros (default)
bun build src/index.ts --outdir dist

# Build without macros
bun build src/index.ts --outdir dist --no-macros
```

## Security

- Macros cannot be invoked from `node_modules/**/*` for security reasons
- Your application code can import macros from `node_modules` and invoke them
- Macros must be explicitly imported with `{ type: "macro" }` to execute at bundle-time

## Serialization

Macros can return:
- ✅ JSON-compatible data structures (objects, arrays, primitives)
- ✅ Promises (automatically awaited)
- ✅ `Response` objects (automatically parsed)
- ✅ `Blob` objects (serialized based on type)
- ✅ `TypedArray` (base64-encoded)

Macros cannot return:
- ❌ Functions
- ❌ Most class instances
- ❌ Non-serializable objects

## See Also

- [Bun Macros Documentation](https://bun.sh/docs/bundler/macros)
- [ShortcutRegistry README](../README.md)
