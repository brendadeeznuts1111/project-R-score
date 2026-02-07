# Unified Cloudflare Service

A comprehensive integration of Cloudflare services with Bun v1.3.7+ features:
- **S3 Client (α)** - R2 storage operations
- **Worker API (α)** - Edge computing deployment
- **Profile Capture** - Performance analysis
- **Presigned URLs** - Secure resource sharing
- **Header Case Preservation** - HTTP standard compliance

## Overview

The `UnifiedCloudflareService` combines domain management, R2 storage, and Workers into a single cohesive interface with automatic feature detection.

```typescript
import { unifiedCloudflare } from './lib/cloudflare';

// Deploy complete stack
await unifiedCloudflare.deployStack({
  domain: 'factory-wager.com',
  workerScript: workerCode,
  r2Assets: [{ key: 'config.json', data: configData }],
});
```

## Features

### Bun v1.3.7+ Alpha Features

| Feature | Status | Description |
|---------|--------|-------------|
| `Bun.S3` | α | S3-compatible client for R2 |
| `Bun.Worker` | α | Edge worker deployment |
| `Bun.profile` | α | CPU/Memory profiling |
| Header Case | ✓ | Preserved in fetch() |

### Unified Operations

```typescript
// Single import for all services
import { unifiedCloudflare } from './lib/cloudflare';

// Domain + R2 + Workers work together
const result = await unifiedCloudflare.deployStack({
  domain: 'api.factory-wager.com',
  workerScript: `
    export default {
      async fetch(req, env) {
        return new Response('Hello from Worker!');
      }
    };
  `,
  r2Assets: [
    { key: 'assets/logo.png', data: logoBlob },
    { key: 'config.json', data: configJson },
  ],
  bindings: {
    API_KEY: process.env.API_KEY,
  },
});
```

## CLI Usage

### Status Check

```bash
# Check all services and Bun features
bun run cf:unified:status

# Themed output
bun run cf:unified dark status
```

### R2 Operations

```bash
# Upload file with profiling
bun run cf:unified r2-upload ./file.txt assets/file.txt

# List objects
bun run cf:unified:r2-list
bun run cf:unified r2-list assets/

# Generate presigned URL (1 hour default)
bun run cf:unified r2-presign assets/file.txt

# Generate presigned URL (24 hours)
bun run cf:unified r2-presign assets/file.txt 86400
```

### Worker Operations

```bash
# Deploy worker script
bun run cf:unified worker-deploy ./worker.ts api-worker
```

### Performance Profiling

```bash
# Capture profile for 5 seconds
bun run cf:unified profile 5000

# View operation statistics
bun run cf:unified:stats
```

### Full Stack Deployment

```bash
# Deploy domain + R2 + Worker
bun run cf:unified:deploy-stack
```

## API Reference

### UnifiedCloudflareService

#### Domain Management

```typescript
// List zones
const zones = await unifiedCloudflare.listZones();

// Get DNS records
const records = await unifiedCloudflare.listDNSRecords(zoneId);
```

#### R2 Storage

```typescript
// Upload
await unifiedCloudflare.uploadToR2('key', data, {
  contentType: 'application/json',
  metadata: { version: '1.0' },
});

// Download
const response = await unifiedCloudflare.downloadFromR2('key');

// List
const objects = await unifiedCloudflare.listR2Objects({
  prefix: 'assets/',
  maxKeys: 100,
});

// Presigned URL
const url = await unifiedCloudflare.presignR2Url('key', {
  expiresIn: 3600,
  method: 'GET',
});
```

#### Workers

```typescript
// Deploy
const worker = await unifiedCloudflare.deployWorker('name', script, {
  R2_BUCKET: 'my-bucket',
});

// Invoke
const response = await unifiedCloudflare.invokeWorker('name', request);

// Reload
await unifiedCloudflare.reloadWorker('name');

// Remove
await unifiedCloudflare.removeWorker('name');
```

#### Profiling

```typescript
// Start profiling
unifiedCloudflare.startProfiling('operation-name');

// ... perform operations ...

// Stop and get results
const profile = await unifiedCloudflare.stopProfiling('operation-name');
console.log(`Peak CPU: ${profile.summary.peakCpu}%`);
console.log(`Peak Memory: ${profile.summary.peakMemory} bytes`);
```

#### Header Case Preservation

```bash
# Bun v1.3.7+ automatically preserves header case in fetch()
# No special configuration needed
```

```typescript
// Headers maintain their case
const response = await unifiedCloudflare.fetchWithPreservedHeaders(
  'https://api.example.com',
  {
    headers: {
      'X-Custom-Header': 'value',  // Preserved as "X-Custom-Header"
      'Authorization': 'Bearer token',
    },
  }
);
```

## Configuration

Environment variables:

```bash
# Cloudflare API
CLOUDFLARE_API_TOKEN=your_token
CLOUDFLARE_ACCOUNT_ID=your_account_id

# R2 Storage
R2_ACCOUNT_ID=your_r2_account
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=factory-wager
```

Or use Bun.secrets:

```bash
bun run cf:secrets:setup <token> <account_id>
```

## Performance

The unified service includes automatic profiling:

```typescript
// All operations are logged
const stats = unifiedCloudflare.getOperationStats();
console.log(`Average latency: ${stats.averageDuration}ms`);

// By operation type
for (const [type, data] of Object.entries(stats.byType)) {
  console.log(`${type}: ${data.count} ops, ${data.avgDuration}ms avg`);
}
```

## Graceful Degradation

When Bun v1.3.7+ alpha features are unavailable:

- **S3 Client**: Falls back to standard fetch with AWS signatures
- **Worker API**: Warns and skips worker operations
- **Profile API**: Logs warnings, continues without profiling
- **Header Case**: Works in all Bun v1.3.7+ versions

## Theme Integration

The unified CLI supports FactoryWager themes:

```bash
# Use dark theme
bun run cf:unified dark status

# Use light theme
bun run cf:unified light r2-list

# Use professional theme (default)
bun run cf:unified professional deploy-stack
```

Colors are automatically applied to:
- Status indicators
- DNS record types
- SSL modes
- Operation results

## Examples

### Upload with Presigned URL

```typescript
import { unifiedCloudflare } from './lib/cloudflare';

// Upload
await unifiedCloudflare.uploadToR2('reports/2024.pdf', pdfData, {
  contentType: 'application/pdf',
  metadata: { department: 'finance' },
});

// Generate shareable URL
const shareUrl = await unifiedCloudflare.presignR2Url('reports/2024.pdf', {
  expiresIn: 7 * 24 * 60 * 60, // 7 days
});

console.log(`Share: ${shareUrl}`);
```

### Deploy Worker with R2 Binding

```typescript
const script = `
  export default {
    async fetch(request, env) {
      const obj = await env.R2_BUCKET.get('data.json');
      return new Response(obj.body);
    }
  };
`;

await unifiedCloudflare.deployWorker('data-api', script, {
  R2_BUCKET: unifiedCloudflare.getR2Bucket(),
});
```

### Profiled Stack Deployment

```typescript
// Profile the entire deployment
unifiedCloudflare.startProfiling('deploy');
const start = performance.now();

try {
  const result = await unifiedCloudflare.deployStack({
    domain: 'api.factory-wager.com',
    workerScript: apiWorker,
    r2Assets: assets,
  });
  
  const profile = await unifiedCloudflare.stopProfiling('deploy');
  
  console.log(`Deployed in ${performance.now() - start}ms`);
  console.log(`Peak CPU: ${profile.summary.peakCpu}%`);
  console.log(`Peak Memory: ${profile.summary.peakMemory / 1024 / 1024}MB`);
} catch (error) {
  await unifiedCloudflare.stopProfiling('deploy');
  throw error;
}
```

## Package.json Scripts

```json
{
  "cf:unified": "bun run scripts/domain/cf-unified-cli.ts",
  "cf:unified:status": "bun run scripts/domain/cf-unified-cli.ts status",
  "cf:unified:r2-list": "bun run scripts/domain/cf-unified-cli.ts r2-list",
  "cf:unified:deploy-stack": "bun run scripts/domain/cf-unified-cli.ts deploy-stack",
  "cf:unified:stats": "bun run scripts/domain/cf-unified-cli.ts stats"
}
```

## Future Enhancements

When Bun alpha features stabilize:

- **S3 Client**: Full multipart upload, automatic retries
- **Worker API**: Hot reload, local development server
- **Profile API**: Flame graphs, heap snapshots
- **Streaming**: R2 streaming uploads/downloads
