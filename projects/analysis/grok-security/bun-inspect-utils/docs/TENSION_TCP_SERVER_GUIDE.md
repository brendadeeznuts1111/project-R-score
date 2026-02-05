# [64.0.0.0] TensionTCPServer Log Archiving Guide

Enterprise-grade log management with Bun.Archive, KV storage, and S3 integration. Zero-npm, production-ready, Bun v1.3.5+ native.

---

## [64.1.0.0] Quick Start

### Basic Archiving

```typescript
import TensionTCPServerArchiver from "./src/networking/tension-tcp-server";

const archiver = new TensionTCPServerArchiver();
const blob = await archiver.archiveLogs("/var/log/app");

console.log(archiver.getMetadata());
// {
//   archiveId: "archive-1705600000000-abc123",
//   fileCount: 5,
//   originalSize: 1048576,
//   compressedSize: 102400,
//   compressionRatio: 9.77,
//   format: "gzip",
//   level: 9,
//   status: "completed"
// }
```

### Upload to KV

```typescript
const kvKey = await archiver.uploadToKV(blob, env.LOGS_KV, {
  expirationTtl: 2592000, // 30 days
});

console.log(`Uploaded to KV: ${kvKey}`);
```

### Upload to S3

```typescript
const s3Key = await archiver.uploadToS3(blob, "logs/archive");
console.log(`Uploaded to S3: ${s3Key}`);
```

---

## [64.2.0.0] API Reference

### TensionTCPServerArchiver

| Method | Parameters | Returns | Purpose |
|--------|-----------|---------|---------|
| archiveLogs | dir, options | Promise<Blob> | Archive logs with compression |
| uploadToKV | blob, kvNamespace, options | Promise<string> | Upload to Cloudflare KV |
| uploadToS3 | blob, bucketKey, options | Promise<string> | Upload to S3 |
| getMetadata | - | ArchiveMetadata \| null | Get archive metadata |
| clear | - | void | Clear archive state |

---

## [64.3.0.0] Compression Options

| Format | Level | Ratio | Speed | Use Case |
|--------|-------|-------|-------|----------|
| gzip | 1-9 | 5-15% | Fast | Default, balanced |
| deflate | 1-9 | 5-15% | Faster | Legacy systems |
| brotli | 1-11 | 3-20% | Slower | Maximum compression |

---

## [64.4.0.0] Metadata Structure

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| archiveId | string | "archive-1705600000000-abc123" | Unique identifier |
| timestamp | number | 1705600000000 | Creation time |
| fileCount | number | 5 | Number of archived files |
| originalSize | number | 1048576 | Total uncompressed size |
| compressedSize | number | 102400 | Compressed size |
| compressionRatio | number | 9.77 | Compression percentage |
| format | string | "gzip" | Compression format |
| level | number | 9 | Compression level |
| kvKey | string | "logs:archive-..." | KV storage key |
| s3Key | string | "logs/archive/..." | S3 storage key |
| status | string | "completed" | Archive status |

---

## [64.5.0.0] Integration Examples

### With Cloudflare Workers

```typescript
export default {
  async fetch(request: Request, env: any) {
    const archiver = new TensionTCPServerArchiver();
    const blob = await archiver.archiveLogs("/var/log");
    const kvKey = await archiver.uploadToKV(blob, env.LOGS_KV);
    
    return new Response(JSON.stringify({ kvKey }));
  }
};
```

### With Durable Objects

```typescript
export class LogArchiver {
  async archive(dir: string) {
    const archiver = new TensionTCPServerArchiver();
    const blob = await archiver.archiveLogs(dir);
    const metadata = archiver.getMetadata();
    
    await this.state.storage.put("latest-archive", metadata);
    return metadata;
  }
}
```

---

## [64.6.0.0] Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| archiveLogs (100 files) | 50-200ms | Depends on file size |
| uploadToKV | 100-500ms | Network dependent |
| uploadToS3 | 200-1000ms | Network dependent |
| Compression (gzip-9) | 10-50ms | Per MB of data |

---

## [64.7.0.0] Error Handling

```typescript
try {
  const blob = await archiver.archiveLogs("/var/log");
  const kvKey = await archiver.uploadToKV(blob, env.LOGS_KV);
} catch (error) {
  console.error("Archive failed:", error.message);
  // Handle error appropriately
}
```

---

**Version**: 1.0.0.0 | **Bun**: 1.3.5+ | **Date**: 2026-01-18

