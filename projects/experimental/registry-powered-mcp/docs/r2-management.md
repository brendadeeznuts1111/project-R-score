# R2 Object Storage Management

> **Reference**: [Bun S3Client with Cloudflare R2](https://bun.sh/docs/runtime/s3#using-bun%E2%80%99s-s3client-with-cloudflare-r2)

## Configuration

### Environment Variables

```bash
# .env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET=registry-mcp-prod
```

### S3Client Setup

```typescript
import { S3Client } from "bun";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  bucket: R2_BUCKET,
});
```

## API Reference

### List Objects

```typescript
const result = await s3.list({ prefix: "blog/" });

for (const obj of result.contents || []) {
  console.log(obj.key, obj.size, obj.lastModified);
}
```

### Write Object

```typescript
// Write string content
await s3.write("path/to/file.html", "<html>...</html>", {
  type: "text/html",
});

// Write from Bun.file()
const file = Bun.file("./local/file.txt");
await s3.write("remote/file.txt", file);

// Write with headers
await s3.write("assets/style.css", cssContent, {
  type: "text/css",
  cacheControl: "public, max-age=31536000",
});
```

### Delete Object

```typescript
await s3.delete("path/to/file.txt");
```

### Check Existence

```typescript
const exists = await s3.exists("path/to/file.txt");
```

### Read Object

```typescript
// As Response
const response = await s3.fetch("path/to/file.txt");
const text = await response.text();

// Direct file reference
const file = s3.file("path/to/file.txt");
const content = await file.text();
```

## Management Scripts

### List Bucket Contents

```bash
bun run r2:list              # List all objects
bun run r2:list blog/        # List with prefix
```

### Cleanup Objects

```bash
bun run r2:cleanup blog/old/           # Preview deletion
bun run r2:cleanup blog/old/ --confirm # Execute deletion
```

### Sync Blog to R2

```bash
bun run sync:r2
```

## Infrastructure Constants

Import from centralized registry:

```typescript
import { R2_BUCKETS, R2_ASSETS } from "@registry-mcp/core/infra";

// Bucket configuration
const bucket = R2_BUCKETS.REGISTRY_PROD;
console.log(bucket.name);      // "registry-mcp-prod"
console.log(bucket.publicUrl); // "https://pub-..."

// Asset definitions
const blogAssets = R2_ASSETS.BLOG;
console.log(blogAssets.prefix); // "blog/"
```

## Content Types

| Extension | Content-Type |
|:----------|:-------------|
| `.html` | `text/html` |
| `.css` | `text/css` |
| `.js` | `application/javascript` |
| `.json` | `application/json` |
| `.xml` | `application/xml` |
| `.txt` | `text/plain` |
| `.png` | `image/png` |
| `.jpg` | `image/jpeg` |
| `.svg` | `image/svg+xml` |
| `.woff2` | `font/woff2` |

## Cache Control

```typescript
const CACHE_CONTROL = {
  // Immutable assets (hashed filenames)
  immutable: "public, max-age=31536000, immutable",

  // HTML pages (revalidate)
  html: "public, max-age=0, must-revalidate",

  // RSS feeds (short cache)
  feed: "public, max-age=3600",
};
```

## Error Handling

```typescript
try {
  await s3.write(key, content);
} catch (error) {
  if (error.code === "InvalidAccessKeyId") {
    console.error("Invalid R2 credentials");
  } else if (error.code === "NoSuchBucket") {
    console.error("Bucket does not exist");
  } else {
    throw error;
  }
}
```

## Performance Notes

- **Native Protocol**: Bun's S3Client uses native bindings, not AWS SDK
- **Zero-Copy**: File uploads stream directly without buffering
- **Lazy I/O**: Objects are fetched on-demand, not preloaded
- **Connection Pooling**: Automatic HTTP/2 connection reuse

## Related Files

| File | Purpose |
|:-----|:--------|
| `scripts/sync-blog-to-r2.ts` | Blog deployment |
| `scripts/r2-manage.ts` | Bucket management |
| `packages/core/src/infra/constants.ts` | Infrastructure IDs |
| `workers/mcp-blog-gateway/` | R2 proxy worker |
