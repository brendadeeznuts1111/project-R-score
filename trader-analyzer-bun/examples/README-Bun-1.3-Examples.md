# Bun 1.3 Performance Features Examples

This directory contains comprehensive examples demonstrating Bun 1.3's high-performance utilities and features.

## 🚀 Featured Examples

### `bun-1.3-performance-features.ts`
Complete demonstration of all major Bun 1.3 performance features:

- **Bun.stripANSI()** - SIMD-accelerated ANSI escape code removal (6-57x faster)
- **Bun.hash** - Ultra-fast non-cryptographic hashing (rapidhash, wyhash, crc32)
- **postMessage optimization** - 500x faster worker communication for strings

**Run it:**
```bash
bun run examples/bun-1.3-performance-features.ts
```

### `bun-hash-examples.ts`
Practical examples of using Bun.hash for real-world applications:

- **Cache key generation** - Fast, consistent cache keys for APIs and databases
- **Data integrity checking** - Checksums and content validation
- **ID generation & deduplication** - Short IDs and duplicate detection
- **Performance comparison** - Benchmarking different hash algorithms
- **URL shortener** - Real-world application using hash for URL shortening

**Run it:**
```bash
bun run examples/bun-hash-examples.ts
```

### `bun-strip-ansi-examples.ts`
Comprehensive examples of Bun.stripANSI for text processing:

- **Log file processing** - Cleaning colored server logs
- **CLI output sanitization** - Removing colors from command-line tools
- **Terminal recording cleanup** - Processing terminal session recordings
- **Performance benchmarking** - Comparing with traditional regex approaches
- **File processing integration** - Reading, cleaning, and writing log files

**Run it:**
```bash
bun run examples/bun-strip-ansi-examples.ts
```

## 🎯 Key Features Demonstrated

### Bun.stripANSI()
- **6-57x faster** than traditional `strip-ansi` npm package
- **SIMD-accelerated** for maximum performance
- **XTerm sequence support** - Handles complex terminal escape sequences
- **Zero dependencies** - Built into Bun

### Bun.hash
- **Ultra-fast algorithms**: rapidhash, wyhash, crc32
- **Millions of operations/second** performance
- **Multiple output sizes**: 32-bit and 64-bit variants
- **Perfect for**: caching, IDs, integrity checking, deduplication

### postMessage Optimizations
- **500x faster** for string data between workers
- **240x faster** for simple objects
- **22x less memory** usage
- **Automatic optimization** - No code changes required

## 📊 Performance Highlights

| Feature | Performance | Use Case |
|---------|-------------|----------|
| `stripANSI()` | 6-57x faster | Log processing, CLI output |
| `hash.rapidhash()` | 14M ops/sec | Caching, IDs, checksums |
| `postMessage` | 500x faster | Worker communication |

## 🛠️ Usage Examples

### Replace strip-ansi npm package
```typescript
// Before (npm package)
import { stripANSI } from "strip-ansi";

// After (Bun native)
import { stripANSI } from "bun";
```

### Fast hashing for cache keys
```typescript
import { hash } from "bun";

const cacheKey = hash.rapidhash(JSON.stringify(request)).toString(36);
```

### Worker communication (automatic optimization)
```typescript
// Main thread
worker.postMessage(largeJsonString); // Now 500x faster!

// Worker thread
self.onmessage = (event) => {
  const data = event.data; // Optimized transfer
};
```

## 🎉 Why Bun 1.3?

- **Enterprise-grade performance** - Native implementations beat npm packages
- **Zero external dependencies** - Everything built-in
- **Future-proof** - SIMD acceleration and native optimizations
- **Developer experience** - Drop-in replacements for existing tools

## 🚀 Running the Examples

All examples can be run directly with Bun:

```bash
# Run all performance features demo
bun run examples/bun-1.3-performance-features.ts

# Run hash utilities examples
bun run examples/bun-hash-examples.ts

# Run ANSI stripping examples
bun run examples/bun-strip-ansi-examples.ts
```

Each example includes detailed output, performance benchmarks, and practical use cases to help you understand and leverage Bun 1.3's capabilities in your applications.</content>
<parameter name="filePath">examples/README-Bun-1.3-Examples.md