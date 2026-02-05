# Bun Runtime API Arsenal - Complete Reference

## Overview

Complete showcase of all Bun runtime APIs demonstrated in `bun-runtime-arsenal.ts`.

## API Categories

### 1. Version & Environment

- **Bun.version** - Current Bun version
- **Bun.revision** - Git revision hash
- **Bun.env** - Environment variables (read-only)
- **Bun.main** - Path to main entry file
  - Absolute path to the entrypoint of the current program
  - Useful for detecting if script is directly executed vs imported
  - Example: `if (import.meta.path === Bun.main) { /* directly executed */ }`

### 2. Random & Timing

- **Bun.randomUUIDv7(encoding?, timestamp?)** - Generate UUIDv7
  - `encoding`: `"hex"` (default), `"base64"`, `"base64url"`, or `"buffer"`
  - `timestamp`: Optional timestamp (default: `Date.now()`)
  - Returns: String (hex/base64/base64url) or Buffer (buffer encoding)
- **Bun.nanoseconds()** - High-precision timestamp
- **Bun.sleep(ms | Date)** - Async sleep
  - Accepts milliseconds (number) or Date object
  - Returns Promise that resolves after duration or at specified time
- **Bun.sleepSync(ms)** - Sync sleep
  - Blocking synchronous version
  - Blocks thread for specified milliseconds

### 3. Path Utilities

- **Bun.fileURLToPath(url)** - Convert file:// URL to path
  - Accepts: URL string or URL object
- **Bun.pathToFileURL(path)** - Convert path to file:// URL
  - Returns: URL object
- **Bun.resolveSync(path, from)** - Resolve module paths
- **Bun.which(command, options?)** - Find executable in PATH
  - `options.PATH` - Custom PATH environment variable (default: uses current PATH)
  - `options.cwd` - Current working directory for resolution
  - Returns: Path string or `null` if not found

### 4. String Utilities

- **Bun.escapeHTML(value)** - Escape HTML entities
  - Accepts: `string | object | number | boolean`
  - Optimized: 480 MB/s - 20 GB/s on M1X
- **Bun.stripANSI(str)** - Remove ANSI escape codes
- **Bun.stringWidth(str, options?)** - Calculate display width (Unicode-aware)
  - `options.countAnsiEscapeCodes` - Count ANSI codes in width (default: false)
  - `options.ambiguousIsNarrow` - Count emoji as 1 wide (default: true)
  - Performance: ~6,756x faster than string-width npm package

### 5. Compression

- **Bun.gzipSync(data, options?)** / **Bun.gunzipSync(data)** - Gzip compression
  - `options.level` - Compression level (1-9, default: 6)
- **Bun.deflateSync(data, options?)** / **Bun.inflateSync(data)** - Deflate compression
  - `options.level` - Compression level (1-9, default: 6)
- **Bun.zstdCompress(data, options?)** / **Bun.zstdCompressSync(data, options?)** - Zstd compression
  - `options.level` - Compression level (1-22, default: 3)
  - Async and sync versions available
- **Bun.zstdDecompress(data)** / **Bun.zstdDecompressSync(data)** - Zstd decompression
  - Async and sync versions available

### 6. Inspection & Debugging

- **Bun.inspect(value, options?)** - Deep object inspection
- **Bun.inspect.custom** - Custom inspect symbol
- **Bun.inspect.table(data, properties?, options?)** - Table formatting
  - `options.colors` - Enable ANSI colors (default: false)
- **Bun.deepEquals(a, b, strict?)** - Deep equality comparison
  - `strict` - Boolean for strict mode (default: false)
  - Strict mode: undefined values, sparse arrays, object types matter
- **Bun.openInEditor(path)** - Open file in editor

### 7. Stream Conversion

- **Bun.readableStreamToArrayBuffer(stream)** - Convert to ArrayBuffer
- **Bun.readableStreamToBlob(stream)** - Convert to Blob
- **Bun.readableStreamToJSON(stream)** - Parse as JSON
- **Bun.readableStreamToText(stream)** - Convert to text
- **Bun.readableStreamToBytes(stream)** - Convert to Uint8Array

### 8. Advanced Features

- **Bun.peek(promise)** - Peek at promise value without consuming
  - Returns value if fulfilled, promise if pending, error if rejected
  - Works with non-promise values (returns value directly)
- **Bun.peek.status(promise)** - Get promise status without resolving
  - Returns: `"fulfilled"`, `"pending"`, or `"rejected"`
- **Bun.openInEditor(path)** - Open file in default editor
  - Auto-detects editor from `$VISUAL` or `$EDITOR`
  - Accepts file paths or URLs
- **serialize(value)** / **deserialize(buffer)** - Fast serialization (bun:jsc)
- **estimateShallowMemoryUsageOf(value)** - Memory estimation (bun:jsc)

## Usage Examples

### Version Check

```typescript
console.log(`Bun ${Bun.version} (${Bun.revision})`);
```

### Direct Execution Detection

```typescript
// Check if script is directly executed vs imported
if (import.meta.path === Bun.main) {
  console.log('This script is being directly executed');
} else {
  console.log('This file is being imported from another script');
}
```

### Sleep Functions

```typescript
// Sleep with milliseconds
await Bun.sleep(1000); // 1 second

// Sleep until specific time
const futureDate = new Date(Date.now() + 1000);
await Bun.sleep(futureDate);

// Synchronous sleep (blocks thread)
Bun.sleepSync(1000); // 1 second blocking
```

### UUID Generation

```typescript
// Default hex encoding
const sessionId = Bun.randomUUIDv7();

// Different encodings
const hexUUID = Bun.randomUUIDv7('hex');
const base64UUID = Bun.randomUUIDv7('base64');
const base64UrlUUID = Bun.randomUUIDv7('base64url');
const bufferUUID = Bun.randomUUIDv7('buffer'); // Returns Buffer

// With custom timestamp
const pastUUID = Bun.randomUUIDv7(Date.now() - 86400000); // Yesterday

// Encoding + timestamp
const customUUID = Bun.randomUUIDv7('base64', Date.now());
```

### Path Resolution

```typescript
const dbPath = Bun.resolveSync('./data/db.sqlite', import.meta.dir);
```

### Executable Finding

```typescript
// Default PATH
const bunPath = Bun.which('bun');

// Custom PATH
const lsPath = Bun.which('ls', {
  PATH: '/usr/local/bin:/usr/bin:/bin'
});

// With cwd
const result = Bun.which('ls', {
  cwd: '/tmp',
  PATH: ''
});
```

### Compression

```typescript
const compressed = Bun.zstdCompressSync(oddsData);
const decompressed = Bun.zstdDecompressSync(compressed);
```

### Stream Processing

```typescript
const json = await Bun.readableStreamToJSON(stream);
const text = await Bun.readableStreamToText(stream);
const bytes = await Bun.readableStreamToBytes(stream);
```

### Custom Inspect

```typescript
const obj = {
  [Bun.inspect.custom]: () => 'Custom Format'
};
console.log(Bun.inspect(obj)); // "Custom Format"
```

### Memory Estimation

```typescript
const estimate = estimateShallowMemoryUsageOf(largeObject);
console.log(`Estimated: ${estimate} bytes`);
```

### Promise Peeking

```typescript
// Peek at fulfilled promise
const promise = Promise.resolve({ data: 'test' });
const value = Bun.peek(promise); // { data: 'test' }

// Check promise status
const status = Bun.peek.status(promise); // "fulfilled"
const pendingStatus = Bun.peek.status(new Promise(() => {})); // "pending"
const rejectedStatus = Bun.peek.status(Promise.reject(new Error())); // "rejected"

// Peek non-promise
const num = Bun.peek(42); // 42
```

### Open in Editor

```typescript
// Open current file
Bun.openInEditor(import.meta.url);

// Open specific file
Bun.openInEditor('./package.json');
```

## Performance

- **Compression**: Zstd > Gzip > Deflate
- **Stream Conversion**: Zero-copy operations
- **Serialization**: Faster than JSON.stringify
- **Memory Estimation**: O(1) shallow estimate

## Related Documentation

- [Bun Runtime APIs](https://docs.bun.sh/runtime/bun-apis)
- [Stream Debug Engine](./STREAM-DEBUG.md)
- [Ultimate Debug Dashboard](./ULTIMATE-DEBUG.md)

