# Geelark API Reference

**Last Updated**: 2026-01-08
**Version**: 1.0.0

---

## Table of Contents

1. [UploadService API](#uploadservice-api)
2. [HTTP API Endpoints](#http-api-endpoints)
3. [WebSocket API](#websocket-api)
4. [TelemetrySystem API](#telemetrysystem-api)
5. [MonitoringSystem API](#monitoringsystem-api)
6. [DashboardAPI](#dashboardapi)
7. [Feature Flag API](#feature-flag-api)
8. [Error Responses](#error-responses)
9. [Rate Limiting](#rate-limiting)
10. [Authentication](#authentication)

---

## UploadService API

### Class: UploadService

#### Constructor

```typescript
new UploadService(config: UploadConfig)
```

Creates a new upload service instance.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | `"s3" \| "r2" \| "local"` | Yes | Storage provider |
| `accessKeyId` | `string` | Yes* | AWS access key ID (for S3/R2) |
| `secretAccessKey` | `string` | Yes* | AWS secret access key (for S3/R2) |
| `bucket` | `string` | Yes* | S3 bucket name |
| `region?` | `string` | No | AWS region (for S3) |
| `endpoint?` | `string` | No | Custom endpoint (for R2) |
| `localDir?` | `string` | No | Local upload directory |

**Required for cloud providers (s3, r2)**

**Example**:

```typescript
const uploadService = new UploadService({
  provider: "s3",
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  bucket: "my-bucket",
  region: "us-east-1"
});
```

---

#### Methods

##### `initiateUpload(file, options)`

Initiates a file upload.

**Signature**:
```typescript
async initiateUpload(
  file: File | Blob,
  options: UploadOptions
): Promise<UploadResult>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | `File \| Blob` | Yes | File to upload |
| `options.filename` | `string` | Yes | Original filename |
| `options.contentType` | `string` | Yes | MIME type |
| `options.contentDisposition?` | `"inline" \| "attachment"` | No | Content disposition |
| `options.metadata?` | `Record<string, string>` | No | Custom metadata (requires `FEAT_CUSTOM_METADATA`) |

**Returns**: `Promise<UploadResult>`

```typescript
interface UploadResult {
  uploadId: string;          // Unique upload identifier
  filename: string;          // Original filename
  url: string;               // Public URL
  size: number;              // File size in bytes
  duration: number;          // Upload duration in ms
  provider: "s3" | "r2" | "local";  // Storage provider
}
```

**Example**:

```typescript
const file = new Blob(["Hello, World!"], { type: "text/plain" });
const result = await uploadService.initiateUpload(file, {
  filename: "hello.txt",
  contentType: "text/plain",
  contentDisposition: "attachment"
});

console.log(`Uploaded: ${result.url}`);
```

---

##### `getProgress(uploadId)`

Gets upload progress.

**Signature**:
```typescript
getProgress(uploadId: string): UploadProgress | null
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uploadId` | `string` | Yes | Upload ID |

**Returns**: `UploadProgress | null`

```typescript
interface UploadProgress {
  uploadId: string;
  filename: string;
  totalBytes: number;
  uploadedBytes: number;
  progress: number;        // 0-100
  status: "initiated" | "uploading" | "completed" | "failed" | "cancelled";
  startedAt: number;
  completedAt?: number;
  error?: string;
  url?: string;
}
```

**Example**:

```typescript
const progress = uploadService.getProgress(uploadId);
if (progress) {
  console.log(`${progress.progress.toFixed(1)}% complete`);
}
```

---

##### `getActiveUploads()`

Gets all active uploads.

**Signature**:
```typescript
getActiveUploads(): UploadProgress[]
```

**Returns**: Array of active uploads

**Example**:

```typescript
const activeUploads = uploadService.getActiveUploads();
console.log(`Active uploads: ${activeUploads.length}`);
```

---

##### `cancelUpload(uploadId)`

Cancels an active upload.

**Signature**:
```typescript
cancelUpload(uploadId: string): boolean
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uploadId` | `string` | Yes | Upload ID |

**Returns**: `boolean` - `true` if cancelled, `false` if not found

**Example**:

```typescript
const cancelled = uploadService.cancelUpload(uploadId);
if (cancelled) {
  console.log("Upload cancelled");
}
```

---

##### `cleanup(maxAge?)`

Cleans up completed uploads.

**Signature**:
```typescript
cleanup(maxAge?: number): void
```

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `maxAge` | `number` | No | `3600000` | Maximum age in ms (1 hour) |

**Example**:

```typescript
// Clean up uploads older than 1 hour
uploadService.cleanup();

// Clean up uploads older than 30 minutes
uploadService.cleanup(1800000);
```

---

## HTTP API Endpoints

### Base URL

```
http://localhost:3000/api
```

### Authentication

All endpoints require authentication:

```http
Authorization: Bearer <token>
```

### Endpoints

#### POST /upload/initiate

Initiates a new file upload.

**Request**:

```http
POST /api/upload/initiate
Content-Type: multipart/form-data

file: <binary data>
filename: "document.pdf"
contentType: "application/pdf"
contentDisposition: "attachment"
metadata: {"author":"John","category":"reports"}
```

**Response** (`200 OK`):

```json
{
  "success": true,
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "document.pdf",
  "url": "https://my-bucket.s3.us-east-1.amazonaws.com/uploads/1234567890-abc/document.pdf",
  "size": 1048576,
  "duration": 1234,
  "provider": "s3"
}
```

**Error Responses**:

| Code | Description |
|------|-------------|
| `400` | No file provided |
| `500` | Upload failed |

**Example**:

```bash
curl -X POST http://localhost:3000/api/upload/initiate \
  -F "file=@document.pdf" \
  -F "filename=document.pdf" \
  -F "contentType=application/pdf"
```

---

#### GET /upload/status/:id

Gets upload status.

**Request**:

```http
GET /api/upload/status/550e8400-e29b-41d4-a716-446655440000
```

**Response** (`200 OK`):

```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "document.pdf",
  "totalBytes": 1048576,
  "uploadedBytes": 524288,
  "progress": 50.0,
  "status": "uploading",
  "startedAt": 1234567890000
}
```

**Error Responses**:

| Code | Description |
|------|-------------|
| `404` | Upload not found |

---

#### GET /uploads/active

Lists all active uploads.

**Request**:

```http
GET /api/uploads/active
```

**Response** (`200 OK`):

```json
[
  {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "document.pdf",
    "progress": 50.0,
    "status": "uploading"
  },
  {
    "uploadId": "660e8400-e29b-41d4-a716-446655440001",
    "filename": "image.png",
    "progress": 75.5,
    "status": "uploading"
  }
]
```

---

#### POST /upload/cancel/:id

Cancels an upload.

**Request**:

```http
POST /api/upload/cancel/550e8400-e29b-41d4-a716-446655440000
```

**Response** (`200 OK`):

```json
{
  "success": true
}
```

**Error Responses**:

| Code | Description |
|------|-------------|
| `404` | Upload not found |

---

#### GET /uploads/telemetry

Gets upload metrics (requires `FEAT_UPLOAD_ANALYTICS` feature flag).

**Request**:

```http
GET /api/uploads/telemetry
```

**Response** (`200 OK`):

```json
{
  "total": 1000,
  "success": 950,
  "failure": 50,
  "avgDuration": 2345,
  "totalBytes": 10737418240
}
```

**Error Responses**:

| Code | Description |
|------|-------------|
| `403` | Upload analytics not enabled |

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket("ws://localhost:3000/ws");
```

### Protocol

#### Client → Server

**Subscribe to channel**:

```json
{
  "type": "subscribe",
  "channel": "uploads"
}
```

**Unsubscribe from channel**:

```json
{
  "type": "unsubscribe",
  "channel": "uploads"
}
```

#### Server → Client

**Upload progress update** (requires `FEAT_UPLOAD_PROGRESS`):

```json
{
  "type": "upload-progress",
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "document.pdf",
    "totalBytes": 1048576,
    "uploadedBytes": 786432,
    "progress": 75.0,
    "status": "uploading"
  }
}
```

**Upload completed**:

```json
{
  "type": "upload-complete",
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "document.pdf",
    "url": "https://my-bucket.s3.us-east-1.amazonaws.com/uploads/1234567890-abc/document.pdf",
    "duration": 2345
  }
}
```

**Upload failed**:

```json
{
  "type": "upload-error",
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "document.pdf",
    "error": "S3 connection timeout"
  }
}
```

### Channels

| Channel | Description |
|---------|-------------|
| `dashboard` | General dashboard updates |
| `uploads` | Upload progress updates |
| `telemetry` | Performance metrics |

### Example

```javascript
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = () => {
  // Subscribe to upload progress
  ws.send(JSON.stringify({
    type: "subscribe",
    channel: "uploads"
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case "upload-progress":
      console.log(`${message.data.filename}: ${message.data.progress.toFixed(1)}%`);
      break;
    case "upload-complete":
      console.log(`${message.data.filename} uploaded to ${message.data.url}`);
      break;
    case "upload-error":
      console.error(`${message.data.filename}: ${message.data.error}`);
      break;
  }
};

ws.onclose = () => {
  console.log("WebSocket connection closed");
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
```

---

## TelemetrySystem API

### Class: TelemetrySystem

#### Constructor

```typescript
new TelemetrySystem(dbPath?: string)
```

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `dbPath` | `string` | No | `"./monitoring.db"` | Database file path |

---

#### Methods

##### `recordMetric(metric)`

Records a performance metric.

**Signature**:
```typescript
recordMetric(metric: {
  name: string;
  value: number;
  unit?: string;
  labels?: Record<string, string>;
}): void
```

**Example**:

```typescript
telemetry.recordMetric({
  name: "upload_duration",
  value: 1234,
  unit: "ms",
  labels: {
    provider: "s3",
    file_size: "1048576"
  }
});
```

---

##### `recordUpload(upload)`

Records upload completion (requires `FEAT_UPLOAD_ANALYTICS`).

**Signature**:
```typescript
recordUpload(upload: {
  uploadId: string;
  filename: string;
  fileSize: number;
  duration: number;
  status: "success" | "failure";
  provider: "s3" | "r2" | "local";
  timestamp: number;
}): void
```

**Example**:

```typescript
telemetry.recordUpload({
  uploadId: "uuid",
  filename: "document.pdf",
  fileSize: 1048576,
  duration: 2345,
  status: "success",
  provider: "s3",
  timestamp: Date.now()
});
```

---

##### `getUploadStats()`

Gets upload statistics.

**Signature**:
```typescript
getUploadStats(): {
  total: number;
  success: number;
  failure: number;
  avgDuration: number;
  totalBytes: number;
}
```

**Example**:

```typescript
const stats = telemetry.getUploadStats();
console.log(`Total uploads: ${stats.total}`);
console.log(`Success rate: ${(stats.success / stats.total * 100).toFixed(1)}%`);
```

---

##### `createAlert(alert)`

Creates an alert.

**Signature**:
```typescript
createAlert(alert: {
  timestamp: number;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  source: string;
  metric: string;
  value: number;
  threshold: number;
  unit?: string;
  message: string;
  environment?: string;
}): void
```

**Example**:

```typescript
telemetry.createAlert({
  timestamp: Date.now(),
  type: "upload",
  severity: "warning",
  source: "upload-service",
  metric: "upload_duration",
  value: 35000,
  threshold: 30000,
  unit: "ms",
  message: "Upload took longer than expected",
  environment: "production"
});
```

---

## MonitoringSystem API

### Class: MonitoringSystem

#### Methods

##### `getSystemHealth()`

Gets overall system health.

**Signature**:
```typescript
getSystemHealth(): {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  services: {
    name: string;
    status: string;
    latency?: number;
  }[];
}
```

**Example**:

```typescript
const health = monitoring.getSystemHealth();
console.log(`System status: ${health.status}`);
console.log(`Memory usage: ${health.memory.percentage.toFixed(1)}%`);
```

---

##### `checkServiceHealth(name)`

Checks health of a specific service.

**Signature**:
```typescript
async checkServiceHealth(name: string): Promise<{
  name: string;
  status: "healthy" | "unhealthy";
  latency: number;
  error?: string;
}>
```

**Example**:

```typescript
const serviceHealth = await monitoring.checkServiceHealth("s3");
console.log(`S3 status: ${serviceHealth.status}`);
console.log(`Latency: ${serviceHealth.latency}ms`);
```

---

## DashboardAPI

### Endpoints

#### GET /dashboard/health

Gets dashboard health status.

**Response** (`200 OK`):

```json
{
  "status": "healthy",
  "uptime": 86400,
  "version": "1.0.0",
  "features": {
    "FEAT_CLOUD_UPLOAD": true,
    "FEAT_UPLOAD_PROGRESS": true
  }
}
```

---

#### GET /dashboard/metrics

Gets dashboard metrics.

**Response** (`200 OK`):

```json
{
  "cpu": 45.2,
  "memory": 68.5,
  "activeUploads": 3,
  "totalUploads": 1250,
  "successRate": 98.2
}
```

---

## Feature Flag API

### Compile-Time Flags

Feature flags are configured at build time:

```bash
bun build --feature=FEAT_CLOUD_UPLOAD,FEAT_UPLOAD_PROGRESS src/index.ts
```

### Runtime Checks

```typescript
import { feature } from "bun:bundle";

if (feature("FEAT_CLOUD_UPLOAD")) {
  // Cloud upload code (only included if feature enabled)
}

const value = feature("FEAT_CUSTOM_METADATA") ? "enabled" : "disabled";
```

### Available Flags

| Flag | Type | Default | Bundle Impact |
|------|------|---------|---------------|
| `FEAT_CLOUD_UPLOAD` | Boolean | `false` | +8% |
| `FEAT_UPLOAD_PROGRESS` | Boolean | `false` | +3% |
| `FEAT_MULTIPART_UPLOAD` | Boolean | `false` | +12% |
| `FEAT_UPLOAD_ANALYTICS` | Boolean | `false` | +5% |
| `FEAT_CUSTOM_METADATA` | Boolean | `false` | +2% |
| `ENV_PRODUCTION` | Boolean | `false` | -25% |
| `ENV_DEVELOPMENT` | Boolean | `true` | +15% |

---

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | `400` | Invalid request parameters |
| `UNAUTHORIZED` | `401` | Missing or invalid authentication |
| `FORBIDDEN` | `403` | Feature not enabled |
| `NOT_FOUND` | `404` | Resource not found |
| `FILE_TOO_LARGE` | `413` | File exceeds maximum size |
| `UNSUPPORTED_MEDIA_TYPE` | `415` | Invalid file type |
| `RATE_LIMIT_EXCEEDED` | `429` | Too many requests |
| `INTERNAL_ERROR` | `500` | Internal server error |
| `SERVICE_UNAVAILABLE` | `503` | Service temporarily unavailable |

### Example Error Response

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum of 5368709120 bytes",
    "details": {
      "fileSize": 6442450944,
      "maxSize": 5368709120
    }
  }
}
```

---

## Rate Limiting

### Default Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /upload/initiate` | 100 requests | 1 hour |
| `GET /upload/status/:id` | 1000 requests | 1 hour |
| `GET /uploads/active` | 100 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Error

**Response** (`429 Too Many Requests`):

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "window": "1h",
      "retryAfter": 3600
    }
  }
}
```

---

## Authentication

### Bearer Token

```http
Authorization: Bearer your_token_here
```

### API Key

```http
X-API-Key: your_api_key_here
```

### Environment Variables

```bash
# Upload credentials
UPLOAD_PROVIDER=s3
S3_ACCESS_KEY_ID=your_key
S3_SECRET_ACCESS_KEY=your_secret
S3_BUCKET=my-bucket
S3_REGION=us-east-1

# API authentication
API_KEY=your_api_key
BEARER_TOKEN=your_bearer_token
```

---

**Generated**: 2026-01-08
**Version**: 1.0.0
**Maintainer**: Geelark Development Team
