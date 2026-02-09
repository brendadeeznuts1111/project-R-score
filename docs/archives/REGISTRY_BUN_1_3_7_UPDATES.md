# 📦 Registry System - Bun v1.3.7 Integration

## ✅ Bun v1.3.7 Features Integrated

### 1. S3/R2 contentEncoding Support
**File**: `lib/registry/r2-storage.ts`

```typescript
// Bun v1.3.7: Store tarballs with compression
await storage.storeTarball(pkg, version, data, {
  compress: true,
  contentEncoding: 'gzip', // or 'br' (brotli), 'deflate'
});
```

**Benefits**:
- Reduced storage costs
- Faster downloads
- Automatic decompression on client

### 2. S3 presigned URL contentDisposition
**File**: `lib/registry/r2-storage.ts`

```typescript
// Bun v1.3.7: Force browser download with custom filename
const url = await storage.getTarballUrl(pkg, version, {
  expiresIn: 3600,
  responseContentDisposition: 'attachment; filename="custom-name.tgz"',
  responseContentType: 'application/octet-stream',
});
```

**Benefits**:
- Custom download filenames
- Force attachment vs inline display
- Better UX for package downloads

### 3. Bun.JSON5 & Bun.JSONL Config Support
**File**: `lib/registry/config-loader.ts`

```typescript
// Load JSON5 config with comments
const config = await loadRegistryConfig({ path: './registry.config.json5' });

// Example registry.config.json5:
{
  // Registry name
  name: "My Registry",
  
  // R2 storage with Bun v1.3.7 compression
  storage: {
    type: "r2",
    bucket: "npm-registry",
    compression: "gzip", // Bun v1.3.7 feature!
  },
}
```

**Benefits**:
- Human-readable configs with comments
- Trailing commas allowed
- Streaming JSONL for config updates

### 4. Bun.wrapAnsi() for CLI Output
**File**: `lib/registry/cli.ts`

```typescript
// Bun v1.3.7: 33-88x faster ANSI text wrapping
function wrapText(text: string, columns: number = 80): string {
  return Bun.wrapAnsi(text, columns, {
    hard: false,
    wordWrap: true,
    trim: true,
  });
}
```

**Benefits**:
- 37x faster for short text
- 88x faster for long text
- Preserves ANSI colors/styles
- Unicode-aware (emoji, CJK)

### 5. Fetch Header Casing Preservation
**File**: `lib/registry/server.ts`

```typescript
// Bun v1.3.7: Headers preserve original casing
const response = await fetch(url, {
  headers: {
    'Authorization': token,     // Sent as "Authorization"
    'Content-Type': 'json',     // Sent as "Content-Type"
    'X-Custom-Header': 'value', // Sent as "X-Custom-Header"
  },
});
```

**Benefits**:
- Better npm registry compatibility
- Some APIs require exact header casing
- Matches Node.js behavior

### 6. Increased HTTP Header Limit (200)
**File**: `lib/registry/server.ts`

Bun v1.3.7 increases max HTTP headers from 100 to 200.

**Benefits**:
- Support for complex registry responses
- Better proxy compatibility
- More metadata headers

### 7. Performance Improvements

#### 35% Faster async/await
Registry server handles concurrent requests faster.

#### 3x Faster array.flat()
Package list operations are faster.

#### 50% Faster Buffer.from(array)
Tarball creation is optimized.

## 🆕 New Commands

### Config Management
```bash
# Initialize JSON5 config
bun run registry:config:init

# Load and validate config
bun run registry:config:load

# Save config
bun run registry:config:save
```

## 📁 Updated Files

| File | Changes |
|------|---------|
| `r2-storage.ts` | contentEncoding, signed URL options |
| `config-loader.ts` | NEW - JSON5/JSONL config support |
| `cli.ts` | Bun.wrapAnsi integration |
| `server.ts` | Header casing preservation |
| `index.ts` | Export new modules |
| `package.json` | New config commands |

## 🚀 Quick Start with Bun v1.3.7

```bash
# 1. Upgrade to Bun v1.3.7
bun upgrade

# 2. Create JSON5 config
bun run registry:config:init

# 3. Edit config with comments
# registry.config.json5:
{
  name: "My Registry",
  storage: {
    type: "r2",
    bucket: "npm-registry",
    compression: "gzip", // Bun v1.3.7!
  },
}

# 4. Start registry
bun run registry:start

# 5. Publish with compression
bun run registry:publish ./my-package
```

## 🔧 Environment Variables

```bash
# Bun v1.3.7: Enable compression
R2_COMPRESSION=gzip  # or 'br', 'deflate'

# Bun v1.3.7: Config path
REGISTRY_CONFIG_PATH=./registry.config.json5

# Standard variables
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_REGISTRY_BUCKET=npm-registry
```

## 📊 Performance Comparison

| Feature | Before | Bun v1.3.7 | Improvement |
|---------|--------|------------|-------------|
| Config parsing | JSON only | JSON5/JSONL | Human-readable |
| Text wrapping | wrap-ansi npm | Bun.wrapAnsi | 33-88x faster |
| Header handling | Lowercased | Preserved | Better compat |
| Compression | None | gzip/br/deflate | Smaller storage |
| Signed URLs | Basic | +contentDisposition | Better UX |
| async/await | Baseline | 35% faster | Better concurrency |

## 📝 Example: Complete Bun v1.3.7 Setup

```typescript
// registry.config.json5
{
  // Bun v1.3.7: Comments in config!
  name: "FactoryWager Registry",
  url: "https://registry.factory-wager.com",
  
  storage: {
    type: "r2",
    bucket: "npm-registry",
    prefix: "packages/",
    // Bun v1.3.7: Enable compression
    compression: "gzip",
  },
  
  cdn: {
    enabled: true,
    url: "https://registry.factory-wager.com",
    // Bun v1.3.7: Signed URLs with custom disposition
    signedUrls: true,
    expirySeconds: 3600,
  },
  
  // Bun v1.3.7: Trailing comma allowed
  auth: {
    type: "jwt",
    tokenExpiry: "7d",
  },
}
```

```typescript
// server.ts
import { NPMRegistryServer } from './lib/registry/index.ts';
import { loadRegistryConfig } from './lib/registry/index.ts';

// Load JSON5 config
const config = await loadRegistryConfig({
  path: './registry.config.json5'
});

// Start server with Bun v1.3.7 optimizations
const server = new NPMRegistryServer({
  ...config,
  storage: {
    ...config.storage,
    compression: 'gzip', // Bun v1.3.7
  },
});

await server.start();
```

## ✅ Verification

```bash
# Check Bun version (should be 1.3.7+)
bun --version

# Test config loading
bun run registry:config:load

# Test with compression
R2_COMPRESSION=gzip bun run registry:start

# Verify headers are preserved
curl -I http://localhost:4873/lodash
```
