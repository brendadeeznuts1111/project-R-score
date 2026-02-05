
# Bun v1.3.7+ API Documentation

## API Categories

- [BUN API FEATURE](#bun-api-feature)
- [NODE API PERF](#node-api-perf)


## Overview

Bun v1.3.7 introduces significant performance improvements and new APIs:

- **88x faster ANSI text wrapping** with `Bun.wrapAnsi()`
- **Native JSON5 support** with comments and trailing commas
- **HTTP header preservation** for exact casing
- **ETag caching** for conditional requests
- **@profile decorators** for function profiling
- **Bucket storage** with S3-compatible operations
- **Enhanced Buffer operations** with CPU intrinsics

## Quick Start

```typescript
import { wrapText, loadJSON5, BucketClient } from 'bun137-features';

// ANSI text wrapping
const wrapped = wrapText(coloredText, 80);

// JSON5 parsing
const config = loadJSON5(configString);

// Bucket storage
const bucket = new BucketClient({ bucket: 'my-app' });
await bucket.uploadFile('data.json', content);
```

## Featured APIs

### Core APIs

- **`Bun.wrapAnsi`** - 88x faster ANSI text wrapping
- **`Bun.JSON5`** - Native JSON5 with comments
- **`SimpleHTTPClient.get`** - FEATURE operation
- **`SimpleHTTPClient.getWithETag`** - FEATURE operation
- **`BucketClient.uploadFile`** - FEATURE operation
- **`profile.decorator`** - FEATURE operation
- **`Buffer.from`** - PERF operation
- **`Buffer.swap16`** - PERF operation
- **`Buffer.swap64`** - PERF operation


## Migration Guide

### From v1.3.6 to v1.3.7

**Breaking Changes:**
- None - fully backward compatible

**New Features:**
- Add `Bun.wrapAnsi()` for text wrapping
- Add `Bun.JSON5` for configuration parsing
- Add HTTP header preservation
- Add ETag caching support
- Add `@profile` decorator
- Add bucket storage APIs

**Performance Improvements:**
- Buffer operations 50% faster
- ANSI wrapping 88x faster
- Reduced memory usage
			