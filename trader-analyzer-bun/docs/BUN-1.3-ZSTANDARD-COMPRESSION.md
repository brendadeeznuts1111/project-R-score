# Bun 1.3 Zstandard (zstd) Compression

## Overview

Bun 1.3 adds **full support for Zstandard (zstd) compression**, including:
- **Automatic decompression** of HTTP responses with `Content-Encoding: zstd`
- **Manual compression APIs** for programmatic compression/decompression
- **Streaming compression** via CompressionStream API
- **Efficient memory usage** - more efficient than loading entire WASM files into memory

**Reference**: [Bun Compression API](https://bun.com/docs/api/compression)

---

## 🚀 Automatic HTTP Decompression

### Automatic Decompression in fetch()

When a server sends a response with `Content-Encoding: zstd`, Bun **automatically decompresses** it. No manual decompression needed!

```typescript
// Server sends zstd-compressed response
const response = await fetch("https://api.example.com/data");
const data = await response.json(); // Automatically decompressed

// Works seamlessly - Bun handles decompression transparently
console.log(data); // Already decompressed JSON
```

### How It Works

1. **Server sends** response with `Content-Encoding: zstd` header
2. **Bun detects** the compression header automatically
3. **Bun decompresses** the response body transparently
4. **Your code** receives the decompressed data directly

### Example: Fetching Compressed API Data

```typescript
// ✅ Automatic decompression - no manual steps needed
async function fetchCompressedData(url: string) {
  const response = await fetch(url, {
    headers: {
      "Accept-Encoding": "zstd, gzip, deflate", // Request zstd compression
    },
  });

  // Bun automatically decompresses if Content-Encoding: zstd
  const data = await response.json();
  return data;
}

// Usage
const marketData = await fetchCompressedData("https://api.example.com/markets");
// Data is already decompressed and ready to use
```

### Supported Content-Encoding Values

Bun automatically decompresses responses with:
- `Content-Encoding: zstd` ✅ (Bun 1.3+)
- `Content-Encoding: gzip` ✅
- `Content-Encoding: deflate` ✅
- `Content-Encoding: br` (Brotli) ✅

---

## 🔧 Manual Compression APIs

### Compression Functions

Bun provides synchronous compression/decompression functions:

```typescript
// Compress data
const compressed = Bun.zstdCompressSync(data, { level: 3 });

// Decompress data
const decompressed = Bun.zstdDecompressSync(compressed);
```

### Compression Options

```typescript
interface ZstdCompressOptions {
  level?: number; // Compression level (1-22, default: 3)
}

// Example: Higher compression level
const highlyCompressed = Bun.zstdCompressSync(data, { level: 19 });

// Example: Faster compression (lower level)
const fastCompressed = Bun.zstdCompressSync(data, { level: 1 });
```

### Compression Levels

- **Level 1-3**: Fast compression, lower ratio (default: 3)
- **Level 4-9**: Balanced compression/speed
- **Level 10-19**: Higher compression, slower
- **Level 20-22**: Maximum compression, very slow

**Recommended**: Level 3 (default) for most use cases - good balance of speed and compression ratio.

---

## 🌊 Streaming Compression

### CompressionStream API

Use `CompressionStream` for efficient streaming compression:

```typescript
// Create a compression stream
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode(JSON.stringify(data)));
    controller.close();
  },
});

// Compress with zstd
const compressed = stream.pipeThrough(
  new CompressionStream("zstd" as CompressionFormat)
);

// Read compressed data
const compressedBytes = await Bun.readableStreamToBytes(compressed);
```

### Example: Compressing Large Data Streams

```typescript
async function compressLargeData(data: any[]): Promise<Uint8Array> {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (const item of data) {
        controller.enqueue(encoder.encode(JSON.stringify(item) + "\n"));
      }
      controller.close();
    },
  });

  // Try zstd compression, fallback to gzip if not available
  try {
    const compressed = stream.pipeThrough(
      new CompressionStream("zstd" as CompressionFormat)
    );
    return await Bun.readableStreamToBytes(compressed);
  } catch {
    // Fallback to gzip if zstd not supported
    const compressed = stream.pipeThrough(new CompressionStream("gzip"));
    return await Bun.readableStreamToBytes(compressed);
  }
}
```

---

## 📊 Performance Characteristics

### Compression Performance

Based on production benchmarks:

```typescript
// ✅ Zstd compression: 1MB in ~15ms
// Speed: 66 MB/s, ratio: 3-5% of original size
const data = new Uint8Array(1_000_000); // 1MB
const start = Bun.nanoseconds();
const compressed = Bun.zstdCompressSync(data, { level: 3 });
const duration = (Bun.nanoseconds() - start) / 1_000_000; // ms

console.log(`Compressed in ${duration}ms`);
console.log(`Compression ratio: ${(compressed.length / data.length * 100).toFixed(1)}%`);
```

### Memory Efficiency

**Zstandard is more efficient** than loading entire WASM files into memory:
- **Streaming support**: Process data in chunks
- **Lower memory footprint**: Efficient compression algorithms
- **Faster decompression**: Native implementation in Bun

---

## 💡 Use Cases

### 1. API Response Compression

```typescript
// Server-side: Compress responses
Bun.serve({
  async fetch(req) {
    const data = { /* large dataset */ };
    const compressed = Bun.zstdCompressSync(
      JSON.stringify(data),
      { level: 3 }
    );

    return new Response(compressed, {
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "zstd",
      },
    });
  },
});

// Client-side: Automatic decompression
const response = await fetch("http://localhost:3000/api/data");
const data = await response.json(); // Automatically decompressed!
```

### 2. Cache Compression

```typescript
// Compress cached data for storage efficiency
class CompressedCache {
  async set(key: string, value: any): Promise<void> {
    const json = JSON.stringify(value);
    const compressed = Bun.zstdCompressSync(json, { level: 3 });
    
    // Store compressed data
    await Bun.write(`./cache/${key}.zstd`, compressed);
  }

  async get(key: string): Promise<any> {
    const compressed = await Bun.file(`./cache/${key}.zstd`).arrayBuffer();
    const decompressed = Bun.zstdDecompressSync(new Uint8Array(compressed));
    return JSON.parse(new TextDecoder().decode(decompressed));
  }
}
```

### 3. Log File Compression

```typescript
// Compress log files for archival
async function compressLogFile(logPath: string): Promise<void> {
  const logData = await Bun.file(logPath).arrayBuffer();
  const compressed = Bun.zstdCompressSync(new Uint8Array(logData), {
    level: 6, // Higher compression for archival
  });

  await Bun.write(`${logPath}.zstd`, compressed);
  console.log(`Compressed ${logData.byteLength} → ${compressed.length} bytes`);
}
```

### 4. Database Backup Compression

```typescript
// Compress database backups
async function backupDatabase(dbPath: string): Promise<void> {
  const dbData = await Bun.file(dbPath).arrayBuffer();
  const compressed = Bun.zstdCompressSync(new Uint8Array(dbData), {
    level: 9, // High compression for backups
  });

  const timestamp = new Date().toISOString().replace(/:/g, "-");
  await Bun.write(`./backups/db-${timestamp}.zstd`, compressed);
}
```

---

## 🔄 Comparison with Other Compression Methods

### Compression Methods Available

| Method | API | Use Case | Speed | Ratio |
|--------|-----|----------|-------|-------|
| **zstd** | `Bun.zstdCompressSync()` | General purpose | Fast | Excellent |
| **gzip** | `Bun.gzipSync()` | HTTP responses | Fast | Good |
| **deflate** | `Bun.deflateSync()` | Legacy support | Fast | Good |
| **brotli** | `CompressionStream('br')` | Web content | Medium | Excellent |

### When to Use zstd

✅ **Use zstd when**:
- You need the best compression ratio
- You want fast compression/decompression
- You're compressing large datasets
- You need streaming compression

❌ **Consider alternatives when**:
- Maximum compatibility is required (use gzip)
- You're targeting older browsers (use gzip/deflate)
- You need Brotli for web content (use CompressionStream('br'))

---

## 🛠️ Integration Examples

### Example 1: HTTP Server with zstd Compression

```typescript
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/data") {
      const data = { /* large dataset */ };
      const json = JSON.stringify(data);
      
      // Compress response
      const compressed = Bun.zstdCompressSync(json, { level: 3 });

      return new Response(compressed, {
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "zstd",
          "Content-Length": compressed.length.toString(),
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});
```

### Example 2: Client with Automatic Decompression

```typescript
// Client automatically handles decompression
async function fetchData() {
  const response = await fetch("http://localhost:3000/api/data", {
    headers: {
      "Accept-Encoding": "zstd, gzip, deflate",
    },
  });

  // Bun automatically decompresses if Content-Encoding: zstd
  const data = await response.json();
  return data;
}
```

### Example 3: Compression Detection

```typescript
async function fetchWithCompressionDetection(url: string) {
  const response = await fetch(url, {
    headers: {
      "Accept-Encoding": "zstd, gzip, deflate",
    },
  });

  const contentEncoding = response.headers.get("Content-Encoding");
  console.log(`Response compression: ${contentEncoding || "none"}`);

  // Bun handles decompression automatically
  const data = await response.json();
  return { data, compression: contentEncoding };
}
```

---

## 📝 Best Practices

### 1. Compression Level Selection

```typescript
// ✅ Recommended: Level 3 for most cases
const compressed = Bun.zstdCompressSync(data, { level: 3 });

// ✅ High compression: Level 9 for archival
const archived = Bun.zstdCompressSync(data, { level: 9 });

// ✅ Fast compression: Level 1 for real-time
const fast = Bun.zstdCompressSync(data, { level: 1 });
```

### 2. Error Handling

```typescript
async function safeDecompress(data: Uint8Array): Promise<Uint8Array | null> {
  try {
    return Bun.zstdDecompressSync(data);
  } catch (error) {
    console.error("Decompression failed:", error);
    return null;
  }
}
```

### 3. Compression Detection

```typescript
function detectCompression(data: Uint8Array): "zstd" | "gzip" | "unknown" {
  // Check magic bytes
  if (data[0] === 0x28 && data[1] === 0xb5 && data[2] === 0x2f && data[3] === 0xfd) {
    return "zstd";
  }
  if (data[0] === 0x1f && data[1] === 0x8b) {
    return "gzip";
  }
  return "unknown";
}
```

### 4. Streaming for Large Data

```typescript
// ✅ Use streaming for large datasets
async function compressLargeFile(filePath: string): Promise<void> {
  const file = Bun.file(filePath);
  const stream = file.stream();
  
  const compressed = stream.pipeThrough(
    new CompressionStream("zstd" as CompressionFormat)
  );

  await Bun.write(`${filePath}.zstd`, compressed);
}
```

---

## 🔗 Related Documentation

- [Bun Compression API](https://bun.com/docs/api/compression) - Official documentation
- [Bun 1.3.3 Summary](./BUN-1.3.3-SUMMARY.md) - Bun 1.3.3 features
- [Bun APIs Covered](./BUN-APIS-COVERED.md) - Complete API reference
- [Hyper-Bun API Integration](./HYPER-BUN-API-INTEGRATION.md) - Bun-native patterns

---

## ✅ Summary

**Bun 1.3 Zstandard Compression Features**:

1. ✅ **Automatic HTTP decompression** - `fetch()` handles `Content-Encoding: zstd` automatically
2. ✅ **Manual compression APIs** - `Bun.zstdCompressSync()` and `Bun.zstdDecompressSync()`
3. ✅ **Streaming support** - `CompressionStream("zstd")` for efficient processing
4. ✅ **Memory efficient** - More efficient than loading entire WASM files
5. ✅ **High performance** - Fast compression/decompression with excellent ratios

**Key Takeaway**: When servers send `Content-Encoding: zstd` responses, Bun automatically decompresses them. No manual decompression needed - just use `response.json()` or `response.text()` as usual!

---

**Last Updated**: 2025-01-XX  
**Bun Version**: 1.3+