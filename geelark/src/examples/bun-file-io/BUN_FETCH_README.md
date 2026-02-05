# Bun Fetch API - Enhanced Features

This directory contains comprehensive examples demonstrating Bun's enhanced fetch API capabilities that go beyond the standard Web fetch API, including automatic Content-Type handling, verbose debugging, and extended URL protocol support.

## 📁 Files Overview

### Core Examples

- **`bun-fetch-enhanced.ts`** - Comprehensive fetch API enhancements with verbose debugging
- **`bun-fetch-content-type.ts`** - Focused examples of automatic Content-Type detection
- **`bun-fetch-options.ts`** - Advanced fetch options (decompression, keep-alive, verbose)
- **`bun-fetch-performance.ts`** - Performance optimization (DNS prefetch, preconnect, pooling)
- **`bun-extended-urls.ts`** - Extended URL protocol support (S3, file://, data:, blob:)
- **`bun-s3-examples.ts`** - Comprehensive S3 protocol examples with authentication and uploads

## 🚀 Enhanced Features

### 1. Automatic Content-Type Detection

Bun automatically sets appropriate Content-Type headers for different body types:

```typescript
// String body - defaults to text/plain
await fetch(url, { body: "Hello, World!" });

// JSON object - requires explicit Content-Type
await fetch(url, {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
});

// Blob object - uses blob's type
const blob = new Blob(["<xml>data</xml>"], { type: "application/xml" });
await fetch(url, { body: blob });

// FormData - automatic multipart boundary
const formData = new FormData();
formData.append("file", fileBlob, "test.txt");
await fetch(url, { body: formData });
```

### 2. Verbose Debugging

Bun-specific `verbose: true` option for detailed request/response debugging:

```typescript
const response = await fetch("https://example.com", {
  verbose: true
});

// Output:
// [fetch] > HTTP/1.1 GET https://example.com/
// [fetch] > Connection: keep-alive
// [fetch] > User-Agent: Bun/1.3.5
// [fetch] > Accept: */*
// [fetch] > Host: example.com
//
// [fetch] < 200 OK
// [fetch] < Content-Type: text/html; charset=UTF-8
// [fetch] < Content-Length: 1256
```

### 3. Extended URL Protocol Support

#### S3 URLs

```typescript
// Using environment variables
await fetch("s3://my-bucket/path/to/object");

// Explicit credentials
await fetch("s3://my-bucket/path/to/object", {
  s3: {
    accessKeyId: "YOUR_ACCESS_KEY",
    secretAccessKey: "YOUR_SECRET_KEY",
    region: "us-east-1"
  }
});

// Upload with streaming (automatic multipart)
await fetch("s3://my-bucket/large-file.zip", {
  method: "PUT",
  body: largeBlob
});
```

#### File URLs

```typescript
// Local file access
const response = await fetch("file:///path/to/file.txt");
const text = await response.text();

// Windows path normalization
await fetch("file:///C:/path/to/file.txt");
await fetch("file:///c:/path\\to\\file.txt");
```

#### Data URLs

```typescript
// Base64 encoded data
await fetch("data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==");

// Plain text data
await fetch("data:text/plain,Hello%20World!");

// JSON data
const jsonData = JSON.stringify({ message: "Hello" });
await fetch(`data:application/json;base64,${btoa(jsonData)}`);
```

#### Blob URLs

```typescript
const blob = new Blob(["Hello, World!"], { type: "text/plain" });
const url = URL.createObjectURL(blob);
const response = await fetch(url);
URL.revokeObjectURL(url); // Clean up
```

## 🏃‍♂️ Running Examples

### Individual Examples

```bash
# Enhanced fetch features with verbose debugging
bun run examples/bun-file-io/bun-fetch-enhanced.ts

# Content-Type auto-detection examples
bun run examples/bun-file-io/bun-fetch-content-type.ts

# Advanced fetch options (decompression, keep-alive, verbose)
bun run examples/bun-file-io/bun-fetch-options.ts

# Performance optimization (DNS prefetch, preconnect, pooling)
bun run examples/bun-file-io/bun-fetch-performance.ts

# Extended URL protocol support
bun run examples/bun-file-io/bun-extended-urls.ts

# Comprehensive S3 examples
bun run examples/bun-file-io/bun-s3-examples.ts
```

### Programmatic Usage

```typescript
import {
  automaticContentTypeDemo,
  advancedFetchOptions,
  dnsPrefetchingExamples,
  s3UrlExamples
} from './bun-fetch-enhanced';

await automaticContentTypeDemo();
await advancedFetchOptions();
await dnsPrefetchingExamples();
await s3UrlExamples();
```

## 🔧 Key Features Demonstrated

### Content-Type Handling

- **Automatic Detection** - String, Blob, FormData, ArrayBuffer types
- **Override Support** - Explicit Content-Type headers take precedence
- **Multipart Boundaries** - Automatic generation for FormData
- **Binary Data** - Proper handling of ArrayBuffer and TypedArray

### Verbose Debugging

- **Request Headers** - Complete outgoing request information
- **Response Headers** - Full server response details
- **Timing Information** - Request/response timing data
- **Bun-Specific** - Not part of standard Web fetch API

### Advanced Fetch Options

- **Decompression Control** - Manual control over gzip, deflate, brotli, zstd
- **Connection Keep-Alive** - Fine-grained connection reuse management
- **Verbose Levels** - Standard and curl-style debugging output
- **Performance Tuning** - Combined optimization configurations

### Performance Optimization

- **DNS Prefetching** - Eliminate DNS lookup delays
- **Preconnect** - Establish connections early (DNS + TCP + TLS)
- **Connection Pooling** - Automatic connection reuse
- **Timing Analysis** - Performance monitoring and breakdown

### URL Protocol Extensions

- **S3 Integration** - Direct S3 bucket access with authentication
- **File System** - Local file access with path normalization
- **Inline Data** - Data URLs for small payloads
- **Temporary Objects** - Blob URLs for in-memory data

## 📊 Performance Insights

### Content-Type Detection

- **Zero Overhead** - Automatic detection adds no performance cost
- **Type Safety** - Proper MIME types for different data formats
- **Standards Compliant** - Follows Web platform conventions

### Verbose Debugging

- **Development Tool** - Minimal impact in production (when disabled)
- **Comprehensive** - Complete request/response cycle visibility
- **Real-time** - Live debugging during development

### Protocol Extensions

- **Native Performance** - Direct protocol implementation in Bun
- **Memory Efficient** - Streaming support for large files
- **Cross-Platform** - Consistent behavior across operating systems

## 🌐 Real-World Use Cases

### API Development

```typescript
// Automatic JSON handling
app.post("/api/data", async (req) => {
  const response = await fetch("https://external-api.com/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
    verbose: process.env.NODE_ENV === "development"
  });
  return response.json();
});
```

### File Processing

```typescript
// Local file processing
async function processConfig() {
  const response = await fetch("file:///app/config.json");
  return response.json();
}

// S3 backup
async function backupToS3(data) {
  return await fetch("s3://backups/daily.json", {
    method: "PUT",
    body: JSON.stringify(data)
  });
}
```

### Data Streaming

```typescript
// Large file upload with streaming
async function uploadLargeFile(file) {
  const response = await fetch("s3://uploads/large-file.zip", {
    method: "PUT",
    body: file, // Automatic multipart upload
    verbose: true
  });
  return response.ok;
}
```

### Advanced Options Usage

```typescript
// Optimized request with all options
const response = await fetch("https://api.example.com/data", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
  decompress: true,        // Handle compression
  keepalive: true,         // Reuse connections
  verbose: "curl"          // Detailed debugging
});
```

### Performance Optimization

```typescript
import { dns, fetch } from "bun";

// DNS prefetching for multiple hosts
dns.prefetch("api.example.com");
dns.prefetch("cdn.example.com");

// Preconnect to establish connections early
fetch.preconnect("https://api.example.com");

// Make optimized requests
const response = await fetch("https://api.example.com/data");
```

## ⚠️ Error Handling

### Bun-Specific Errors

```typescript
// GET/HEAD with body (throws error)
try {
  await fetch(url, { method: "GET", body: "data" });
} catch (error) {
  console.error("GET with body not allowed:", error.message);
}

// S3 authentication errors
try {
  await fetch("s3://private/file.txt", {
    s3: { accessKeyId: "invalid" }
  });
} catch (error) {
  console.error("S3 auth failed:", error.message);
}

// File not found
try {
  await fetch("file:///nonexistent.txt");
} catch (error) {
  console.error("File not found:", error.message);
}
```

## 💡 Best Practices

### Content-Type Management

1. **Let Bun handle** simple cases (strings, blobs)
2. **Be explicit** for JSON and custom formats
3. **Use appropriate** MIME types for binary data
4. **Validate** Content-Type in responses

### Verbose Debugging

1. **Enable in development** for debugging
2. **Disable in production** to avoid noise
3. **Use with environment** variables for control
4. **Combine with logging** for complete visibility

### URL Protocol Usage

1. **S3 for cloud storage** with proper IAM roles
2. **File URLs for local** configuration and assets
3. **Data URLs for small** inline resources
4. **Blob URLs for temporary** in-memory data

## 🎯 Key Advantages

### Over Standard Fetch

- **Automatic Content-Type** - No manual header management
- **Verbose Debugging** - Built-in request/response tracing
- **Extended Protocols** - S3, file, data, blob URL support
- **Performance** - Native implementation optimizations

### Production Ready

- **Error Handling** - Comprehensive error scenarios
- **Memory Efficient** - Streaming and proper cleanup
- **Cross-Platform** - Consistent behavior everywhere
- **Standards Compliant** - Web API compatibility

## 🧪 Testing the Examples

After running any example, you'll see:

```bash
# Verbose debugging output
[fetch] > HTTP/1.1 POST https://httpbin.org/post
[fetch] > content-type: application/json
[fetch] > Connection: keep-alive
[fetch] > User-Agent: Bun/1.3.5

# Content-Type auto-detection
✅ String body sent with automatic Content-Type
✅ Blob sent with Content-Type: application/xml
✅ FormData sent with automatic multipart boundary

# Extended protocol support
✅ File content read successfully
✅ Data URL decoded correctly
✅ Blob URL processed and cleaned up

# Performance optimization
⚡ DNS prefetch completed in 2.3ms
⚡ Preconnect established in 45.2ms
⚡ Connection pooling: 3.2x faster than new connections
✅ All optimizations applied successfully

# Advanced options
🗜️ Decompression: gzip, deflate, brotli, zstd supported
🔗 Keep-alive: Connection reuse working
🐛 Verbose: Standard and curl formats available
```

## 🚀 Advanced Features

### S3 Advanced Usage

- **Multipart Uploads** - Automatic for large files
- **IAM Integration** - Environment variable support
- **Region Configuration** - Flexible AWS region setup
- **Error Recovery** - Comprehensive S3 error handling

### Performance Optimization

- **DNS Caching** - 30-second in-memory cache with statistics
- **Connection Pooling** - Automatic reuse with performance monitoring
- **Preconnect Strategy** - Early connection establishment
- **Timing Analysis** - Detailed performance breakdown

### Advanced Configuration

- **Decompression Control** - Manual gzip/deflate/brotli/zstd handling
- **Connection Management** - Fine-grained keep-alive control
- **Debugging Levels** - Standard and curl-style verbose output
- **Error Recovery** - Comprehensive error handling patterns

### Security Considerations

- **Credential Management** - Secure S3 authentication
- **File Access** - Local file system permissions
- **Data Validation** - Input sanitization for data URLs
- **Cleanup** - Proper blob URL revocation

This comprehensive implementation showcases Bun's enhanced fetch API capabilities, providing developers with powerful tools for HTTP requests, file operations, and cloud storage integration while maintaining Web API compatibility.
