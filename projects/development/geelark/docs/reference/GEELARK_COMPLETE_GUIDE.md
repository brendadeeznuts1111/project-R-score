# Geelark - Complete Feature Guide & Testing Documentation

**Last Updated**: 2026-01-08
**Version**: 1.0.0
**Bun Version**: 1.3.6+

---

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Upload System](#upload-system)
4. [Feature Flags](#feature-flags)
5. [Server Architecture](#server-architecture)
6. [Testing Suite](#testing-suite)
7. [Performance Benchmarks](#performance-benchmarks)
8. [API Reference](#api-reference)
9. [Development Workflow](#development-workflow)
10. [Deployment](#deployment)

---

## Overview

Geelark is an advanced developer toolkit built on **Bun** 1.3.6+, featuring:

- **S3/R2 Upload System** with feature-flagged architecture
- **Real-time Dashboard** with WebSocket support
- **Comprehensive Monitoring** with telemetry and alerts
- **Codebase Analysis** with multi-language support
- **Dead Code Elimination** via compile-time feature flags
- **84 Test Files** covering unit, integration, and E2E scenarios
- **20 Documentation Files** with complete API reference

### Technology Stack

```typescript
// Runtime & Build
Bun 1.3.6+        // Ultra-fast JavaScript runtime
TypeScript 5.0     // Static type checking

// Server & Networking
Bun.serve()        // HTTP/WebSocket server
Bun.file()         // Lazy file handles
Bun.write()        // Efficient file I/O
Bun.stringWidth()  // Unicode-aware width

// Database
bun:sqlite         // Embedded SQLite database

// Testing
bun:test           // Built-in test framework

// Build System
bun:bundle         // Feature flags & DCE
bun build          // Optimized bundling
```

---

## Core Features

### 1. S3/R2 Upload System

**Location**: `src/server/UploadService.ts` (614 lines)

**Capabilities**:
- ☁️ Cloud uploads to AWS S3 or Cloudflare R2
- 💾 Local filesystem fallback for development
- 🧩 Multipart upload for files >5MB (premium feature)
- 📊 Real-time progress tracking via WebSocket
- 🏷️ Custom S3 metadata support
- ⚡ Compile-time feature elimination (0% overhead when disabled)

**Feature Flags**:
```typescript
FEAT_CLOUD_UPLOAD        // Enable S3/R2 uploads (+8% bundle)
FEAT_UPLOAD_PROGRESS     // Real-time progress tracking (+3% bundle)
FEAT_MULTIPART_UPLOAD    // Large file support (+12% bundle)
FEAT_UPLOAD_ANALYTICS    // Upload metrics (+5% bundle)
FEAT_CUSTOM_METADATA     // Custom S3 metadata (+2% bundle)
```

**API Endpoints**:
```
POST /api/upload/initiate       # Start new upload
GET  /api/upload/status/:id     # Get upload progress
GET  /api/uploads/active        # List active uploads
POST /api/upload/cancel/:id     # Cancel upload
GET  /api/uploads/telemetry     # Upload metrics (premium)
```

**Usage Example**:
```typescript
import { UploadService } from "./src/server/UploadService.js";

// Create upload service
const uploadService = new UploadService({
  provider: "s3",
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  bucket: "my-bucket",
  region: "us-east-1"
});

// Upload file
const file = new Blob(["Hello, World!"], { type: "text/plain" });
const result = await uploadService.initiateUpload(file, {
  filename: "hello.txt",
  contentType: "text/plain",
  contentDisposition: "attachment"
});

console.log(`Uploaded: ${result.url}`);
// Output: Uploaded: https://my-bucket.s3.us-east-1.amazonaws.com/uploads/1234567890-abc/hello.txt
```

### 2. Dashboard System

**Location**: `dev-hq/servers/dashboard-server.ts` (2,443 lines)

**Features**:
- 📊 Real-time monitoring dashboard
- 🔌 WebSocket integration for live updates
- 📈 Performance metrics (CPU, memory, response times)
- 🚨 Alert system with configurable thresholds
- 🌍 Geo-location tracking
- 🔐 Authentication system

**WebSocket Channels**:
```typescript
// Subscribe to dashboard updates
ws.send(JSON.stringify({
  type: "subscribe",
  channel: "dashboard"
}));

// Receive real-time updates
{
  type: "upload-progress",
  data: {
    uploadId: "uuid",
    filename: "file.txt",
    progress: 45.2,
    status: "uploading"
  }
}
```

**React Dashboard**: `dashboard-react/src/`

### 3. Monitoring & Telemetry

**Location**: `src/server/TelemetrySystem.ts` (1,105 lines)

**Capabilities**:
- 📊 Performance metrics tracking
- 🚨 Alert generation with severity levels
- 📈 Anomaly detection
- 🔍 Query builder for custom metrics
- 💾 SQLite database with WAL mode
- 🔄 Real-time data aggregation

**Database Schema**:
```sql
-- Performance metrics
CREATE TABLE metrics (
  timestamp INTEGER,
  metric_type TEXT,
  value REAL,
  labels TEXT
);

-- Alerts
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY,
  timestamp INTEGER,
  type TEXT,
  severity TEXT,
  source TEXT,
  message TEXT,
  resolved BOOLEAN
);
```

### 4. Feature Flag System

**Location**: `env.d.ts` (type definitions), `meta.json` (configuration)

**How It Works**:
```typescript
// Source code
import { feature } from "bun:bundle";

const enabled = feature("FEAT_CLOUD_UPLOAD") ? "YES" : "NO";
console.log("Cloud upload:", enabled);

// Build with feature enabled
bun build --feature=FEAT_CLOUD_UPLOAD src/index.ts
// Output: console.log("Cloud upload:", "YES");

// Build without feature
bun build src/index.ts
// Output: console.log("Cloud upload:", "NO");
// Entire feature code eliminated at compile time!
```

**Compile-Time Elimination**:
- ✅ Zero runtime overhead when disabled
- ✅ Smaller bundle sizes
- ✅ Type-safe feature flags
- ✅ Dead code elimination via tree-shaking

---

## Upload System

### Architecture

```
┌─────────────────┐
│   React UI      │
│  (UploadPanel)  │
└────────┬────────┘
         │ WebSocket / HTTP
         ▼
┌─────────────────┐
│  Dashboard API  │
│  /api/upload/*  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UploadService   │
│  - Simple Upload│
│  - Multipart    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Local  │ │  S3/R2   │
│ Disk   │ │  Cloud   │
└────────┘ └──────────┘
```

### File Size Handling

| File Size | Strategy | Feature Required |
|-----------|----------|------------------|
| ≤5MB | Simple upload | None (default) |
| >5MB | Multipart upload | `FEAT_MULTIPART_UPLOAD` |
| >5TB | Rejected | - |

### Bun File API Patterns

```typescript
// 1. Config Loading
const config = await Bun.file("./config.json").json();
console.log(config.provider); // "s3"

// 2. Binary Upload
const file = new Blob(["data"]);
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
await s3Client.write(key, arrayBuffer);

// 3. Local Storage
await Bun.write(filePath, buffer);

// 4. File Size Check
const file = Bun.file(path);
if (file.size > MAX_SIZE) {
  throw new Error("File too large");
}
```

### Progress Tracking

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

// Get progress
const progress = uploadService.getProgress(uploadId);
console.log(`${progress.progress.toFixed(1)}% complete`);

// WebSocket updates (if FEAT_UPLOAD_PROGRESS enabled)
server.publish("dashboard", JSON.stringify({
  type: "upload-progress",
  data: progress
}));
```

---

## Feature Flags

### Available Flags

| Flag | Category | Default | Bundle Impact |
|------|----------|---------|---------------|
| `FEAT_CLOUD_UPLOAD` | Upload | `false` | +8% |
| `FEAT_UPLOAD_PROGRESS` | Upload | `false` | +3% |
| `FEAT_MULTIPART_UPLOAD` | Upload | `false` | +12% |
| `FEAT_UPLOAD_ANALYTICS` | Upload | `false` | +5% |
| `FEAT_CUSTOM_METADATA` | Upload | `false` | +2% |
| `ENV_PRODUCTION` | Environment | `false` | +0% |
| `ENV_DEVELOPMENT` | Environment | `true` | +0% |
| `ENV_TEST` | Environment | `false` | +0% |

### Build Configurations

```bash
# Lite build (cloud upload only)
bun build --feature=FEAT_CLOUD_UPLOAD src/index.ts

# Premium build (all upload features)
bun build --feature=FEAT_CLOUD_UPLOAD,FEAT_UPLOAD_PROGRESS,FEAT_MULTIPART_UPLOAD,FEAT_UPLOAD_ANALYTICS src/index.ts

# Production build
bun build --feature=ENV_PRODUCTION,FEAT_CLOUD_UPLOAD,FEAT_UPLOAD_PROGRESS src/index.ts --outdir=./dist/prod
```

### Dead Code Elimination Verification

```bash
# Test with feature enabled
bun build --feature=DEBUG test.ts --outdir=./out-debug
cat ./out-debug/test.js
# Output: console.log("DEBUG:","YES");

# Test without feature
bun build test.ts --outdir=./out-no-debug
cat ./out-no-debug/test.js
# Output: console.log("DEBUG:","NO");

# Different outputs = DCE working ✅
```

---

## Server Architecture

### Core Components

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| UploadService | `src/server/UploadService.ts` | 614 | S3/R2 cloud uploads |
| TelemetrySystem | `src/server/TelemetrySystem.ts` | 1,105 | Performance monitoring |
| MonitoringSystem | `src/server/MonitoringSystem.ts` | 406 | System health checks |
| AlertsSystem | `src/server/AlertsSystem.ts` | 528 | Alert generation |
| AnomalyDetection | `src/server/AnomalyDetection.ts` | 599 | Anomaly detection |
| BunServe | `src/server/BunServe.ts` | 642 | HTTP/WebSocket server |
| DashboardAPI | `src/server/DashboardAPI.ts` | 358 | REST API endpoints |
| ServerConstants | `src/server/ServerConstants.ts` | 410 | Configuration constants |

### Request Flow

```
Client Request
    │
    ▼
┌─────────────────┐
│   BunServe      │
│  (HTTP Server)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DashboardAPI   │
│  (Router)       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│ Upload │ │  Telemetry   │
│Service │ │    System    │
└────────┘ └──────────────┘
    │             │
    ▼             ▼
┌────────┐ ┌──────────────┐
│ S3/R2  │ │   Database   │
│ Local  │ │  (SQLite)    │
└────────┘ └──────────────┘
```

### WebSocket Integration

```typescript
Bun.serve({
  fetch(req, server) {
    // Upgrade to WebSocket
    if (req.headers.get("upgrade") === "websocket") {
      server.upgrade(req);
    }
  },
  websocket: {
    open(ws) {
      ws.subscribe("dashboard");
      ws.subscribe("uploads");
    },
    message(ws, message) {
      // Handle incoming messages
    },
    close(ws) {
      // Cleanup
    }
  }
});
```

---

## Testing Suite

### Test Coverage

**Total Test Files**: 84 (excluding node_modules)

#### Breakdown by Category

| Category | Count | Location |
|----------|-------|----------|
| Unit Tests | 60+ | `tests/unit/` |
| Integration Tests | 8 | `tests/integration/` |
| E2E Tests | 2 | `tests/e2e/` |
| Performance Tests | 8 | `tests/performance/` |
| CLI Tests | 6 | `tests/cli/` |

### Key Test Files

#### Upload System Tests

**Unit Tests**: `tests/unit/server/upload-service.test.ts` (124 lines)

```typescript
describe("UploadService", () => {
  test("should upload small file successfully", async () => {
    const testFile = new Blob(["test content"], { type: "text/plain" });
    const result = await uploadService.initiateUpload(testFile, {
      filename: "test.txt",
      contentType: "text/plain"
    });
    expect(result.success).toBe(true);
  });

  test("should track upload progress", async () => {
    const testFile = new Blob(["test content"], { type: "text/plain" });
    const result = await uploadService.initiateUpload(testFile, {
      filename: "test.txt",
      contentType: "text/plain"
    });
    const progress = uploadService.getProgress(result.uploadId);
    expect(progress?.progress).toBe(100);
  });
});
```

**Integration Tests**: `tests/integration/upload.test.ts` (282 lines)

```typescript
describe("Upload API Integration", () => {
  test("should complete full upload workflow", async () => {
    // Step 1: Initiate upload
    const formData = new FormData();
    formData.append("file", testFile, "test.txt");

    const response = await fetch(`${baseUrl}/api/upload/initiate`, {
      method: "POST",
      body: formData
    });

    // Step 2: Check status
    const status = await fetch(`${baseUrl}/api/upload/status/${uploadId}`);

    // Step 3: Verify completion
    expect(status.status).toBe("completed");
  });
});
```

#### Feature Flag Tests

**File**: `tests/unit/feature-elimination/feature-elimination.test.ts`

```typescript
test("feature flag should eliminate dead code", () => {
  const source = `
    import { feature } from "bun:bundle";
    const value = feature("TEST") ? "yes" : "no";
  `;

  // Build with feature
  const withFeature = Bun.build({
    entrypoints: ["test.ts"],
    feature: "TEST"
  });

  // Build without feature
  const withoutFeature = Bun.build({
    entrypoints: ["test.ts"]
  });

  expect(withFeature.output).not.toEqual(withoutFeature.output);
});
```

#### Performance Tests

**File**: `tests/performance/networking/networking-performance.test.ts`

```typescript
test("HTTP server should handle 10k requests/sec", async () => {
  const server = Bun.serve({
    port: 0,
    fetch: () => new Response("OK")
  });

  const start = performance.now();
  const requests = [];

  for (let i = 0; i < 10000; i++) {
    requests.push(fetch(`http://localhost:${server.port}`));
  }

  await Promise.all(requests);
  const duration = performance.now() - start;
  const rps = (10000 / duration) * 1000;

  expect(rps).toBeGreaterThan(10000);
  server.stop();
});
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/server/upload-service.test.ts

# Run with coverage
bun test --coverage

# Run only unit tests
bun test tests/unit/

# Run only integration tests
bun test tests/integration/

# Watch mode
bun test --watch

# Verbose output
bun test --verbose
```

### Test Utilities

```typescript
import { test, expect, mock, beforeAll, afterAll } from "bun:test";

// Mock function
const mockFn = mock(() => "test");
mockFn();
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveReturnedWith("test");

// Setup/Teardown
beforeAll(async () => {
  // Start test server
});

afterAll(async () => {
  // Cleanup
});

// Async tests
test("async operation", async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});
```

---

## Performance Benchmarks

### Stress Test Results

**File**: `docs/BUN_PERFORMANCE_STRESS_TEST.md`

**Test Command**:
```bash
bun -e "console.log('stringWidth tests:', Bun.stringWidth('🇺🇸')===2...); await Bun.write('test.ts','import {feature} from \"bun:bundle\"; const enabled = feature(\"DEBUG\") ? \"YES\" : \"NO\"; console.log(\"DEBUG:\", enabled);'); await Bun.build({entrypoints:['test.ts'], outdir:'./out', minify:true, feature:\"DEBUG\"}); await Bun.spawn(['bun', './out/test.js']).exited;"
```

### Results Summary

| Phase | Operation | Predicted | Measured | Speedup |
|-------|-----------|-----------|----------|---------|
| 1 | `Bun.stringWidth()` (6 tests) | 252ns | 290ns | Within 15% |
| 2 | `Bun.write()` (117 bytes) | 1.06µs | 103ns | **10x faster** |
| 3 | `Bun.build()` + DCE | 3.17µs | 1,040ns | **3x faster** |
| 4 | `Bun.spawn()` + exec | 20.44µs | 9,675ns | **2x faster** |
| **Total** | **All phases** | **25.29µs** | **11.11µs** | **2.3x faster** |

### Platform-Specific Performance

| Platform | Total Time | Notes |
|----------|------------|-------|
| Apple Silicon M1/M2 | 11.11µs | NVMe SSD optimization |
| AMD64 Linux | ~15µs | Varies by disk I/O |
| Intel macOS | ~18µs | Slower disk I/O |

### Memory Usage

| Phase | Memory Allocation |
|-------|------------------|
| stringWidth | 0 bytes (stack-only) |
| Bun.write | 117 bytes (buffer) |
| Bun.build | ~3.5KB (AST + buffers) |
| Bun.spawn | ~2MB (new process) |

### Bundle Size Impact

| Build Configuration | Size | Notes |
|---------------------|------|-------|
| No features | 100% | Baseline |
| +FEAT_CLOUD_UPLOAD | +8% | S3/R2 support |
| +All upload features | +30% | Full upload system |
| DCE elimination | 0% | Features completely removed |

---

## API Reference

### UploadService API

#### Constructor

```typescript
new UploadService(config: UploadConfig)
```

**Parameters**:
- `provider`: `"s3" | "r2" | "local"` - Storage provider
- `accessKeyId`: `string` - AWS access key
- `secretAccessKey`: `string` - AWS secret key
- `bucket`: `string` - S3 bucket name
- `region?`: `string` - AWS region (for S3)
- `endpoint?`: `string` - Custom endpoint (for R2)
- `localDir?`: `string` - Local upload directory

#### Methods

**`initiateUpload(file, options)`**

Initiates a file upload.

**Parameters**:
- `file`: `File | Blob` - File to upload
- `options`: `UploadOptions`
  - `filename`: `string` - Original filename
  - `contentType`: `string` - MIME type
  - `contentDisposition?`: `"inline" | "attachment"` - Content disposition
  - `metadata?`: `Record<string, string>` - Custom metadata (requires `FEAT_CUSTOM_METADATA`)

**Returns**: `Promise<UploadResult>`

```typescript
interface UploadResult {
  uploadId: string;
  filename: string;
  url: string;
  size: number;
  duration: number;
  provider: "s3" | "r2" | "local";
}
```

**`getProgress(uploadId)`**

Gets upload progress.

**Parameters**:
- `uploadId`: `string` - Upload ID

**Returns**: `UploadProgress | null`

**`getActiveUploads()`**

Gets all active uploads.

**Returns**: `UploadProgress[]`

**`cancelUpload(uploadId)`**

Cancels an active upload.

**Parameters**:
- `uploadId`: `string` - Upload ID

**Returns**: `boolean`

### HTTP API Endpoints

#### POST /api/upload/initiate

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

**Response**:
```json
{
  "success": true,
  "uploadId": "uuid",
  "filename": "document.pdf",
  "url": "https://bucket.s3.us-east-1.amazonaws.com/uploads/1234567890-abc/document.pdf",
  "size": 1048576,
  "duration": 1234,
  "provider": "s3"
}
```

#### GET /api/upload/status/:id

Gets upload status.

**Response**:
```json
{
  "uploadId": "uuid",
  "filename": "document.pdf",
  "totalBytes": 1048576,
  "uploadedBytes": 524288,
  "progress": 50.0,
  "status": "uploading",
  "startedAt": 1234567890000
}
```

#### GET /api/uploads/active

Lists all active uploads.

**Response**:
```json
[
  {
    "uploadId": "uuid",
    "filename": "document.pdf",
    "progress": 50.0,
    "status": "uploading"
  }
]
```

#### POST /api/upload/cancel/:id

Cancels an upload.

**Response**:
```json
{
  "success": true
}
```

#### GET /api/uploads/telemetry

Gets upload metrics (requires `FEAT_UPLOAD_ANALYTICS`).

**Response**:
```json
{
  "total": 1000,
  "success": 950,
  "failure": 50,
  "avgDuration": 2345,
  "totalBytes": 10737418240
}
```

### WebSocket Events

#### Client → Server

```json
{
  "type": "subscribe",
  "channel": "uploads"
}
```

#### Server → Client

```json
{
  "type": "upload-progress",
  "data": {
    "uploadId": "uuid",
    "filename": "document.pdf",
    "progress": 75.5,
    "status": "uploading",
    "uploadedBytes": 786432,
    "totalBytes": 1048576
  }
}
```

---

## Development Workflow

### Environment Setup

```bash
# Clone repository
git clone https://github.com/brendadeeznuts1111/geelark.git
cd geelark

# Install dependencies
bun install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Verify installation
bun --version  # Should be >= 1.3.6
```

### Development Commands

```bash
# Start development server
bun run dev

# Start with specific features
bun run dev:upload

# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Build for production
bun run build

# Build with specific features
bun run build:upload-lite

# Run linting
bun run lint

# Format code
bun run format
```

### NPM Scripts

```json
{
  "dev": "bun --watch src/index.ts",
  "dev:upload": "bun --feature=FEAT_CLOUD_UPLOAD src/index.ts",
  "build": "bun build src/index.ts --outdir=./dist",
  "build:upload-lite": "bun build --feature=FEAT_CLOUD_UPLOAD src/index.ts",
  "build:upload-premium": "bun build --feature=FEAT_CLOUD_UPLOAD,FEAT_MULTIPART_UPLOAD,FEAT_UPLOAD_ANALYTICS src/index.ts",
  "test": "bun test",
  "test:watch": "bun test --watch",
  "test:coverage": "bun test --coverage",
  "lint": "eslint src/",
  "format": "prettier --write src/"
}
```

### File Watching

```bash
# Watch mode with auto-reload
bun --watch src/index.ts

# Watch specific files
bun --watch src/server/*.ts

# Hot reload
bun --hot src/index.ts
```

### Debugging

```bash
# Enable debug logging
DEBUG=* bun run dev

# Inspect Bun process
bun --inspect src/index.ts

# Heap snapshot
bun --heap-snapshot src/index.ts
```

---

## Deployment

### Build Configurations

#### Lite Build (Cloud Upload Only)

```bash
bun build \
  --feature=FEAT_CLOUD_UPLOAD \
  --minify \
  src/index.ts \
  --outdir=./dist/lite
```

**Bundle Size**: +8%
**Features**: S3/R2 uploads, local storage fallback

#### Premium Build (All Upload Features)

```bash
bun build \
  --feature=FEAT_CLOUD_UPLOAD,FEAT_UPLOAD_PROGRESS,FEAT_MULTIPART_UPLOAD,FEAT_UPLOAD_ANALYTICS,FEAT_CUSTOM_METADATA \
  --minify \
  src/index.ts \
  --outdir=./dist/premium
```

**Bundle Size**: +30%
**Features**: All upload features including multipart, analytics, custom metadata

#### Production Build

```bash
bun build \
  --feature=ENV_PRODUCTION,FEAT_CLOUD_UPLOAD,FEAT_UPLOAD_PROGRESS \
  --minify \
  --sourcemap \
  src/index.ts \
  --outdir=./dist/prod
```

**Bundle Size**: +11%
**Features**: Production optimizations, cloud uploads, progress tracking

### Environment Variables

```bash
# Upload Configuration
UPLOAD_PROVIDER=s3              # s3, r2, or local
S3_ACCESS_KEY_ID=your_key
S3_SECRET_ACCESS_KEY=your_secret
S3_BUCKET=my-bucket
S3_REGION=us-east-1
S3_ENDPOINT=https://...
UPLOAD_LOCAL_DIR=./uploads

# Feature Flags
ENABLE_CLOUD_UPLOAD=true
ENABLE_UPLOAD_PROGRESS=true
ENABLE_MULTIPART_UPLOAD=false

# Server Configuration
PORT=3000
HOST=0.0.0.0
ENVIRONMENT=production

# Database
DB_PATH=./monitoring.db
```

### Deployment Checklist

- [ ] Set environment variables
- [ ] Configure S3/R2 credentials
- [ ] Set appropriate bucket permissions
- [ ] Enable required feature flags
- [ ] Run database migrations
- [ ] Build with correct features
- [ ] Test upload functionality
- [ ] Configure CORS for dashboard
- [ ] Set up monitoring alerts
- [ ] Configure SSL/TLS certificates

### Docker Deployment

```dockerfile
FROM oven/bun:1.3.6

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source
COPY . .

# Build application
RUN bun build --feature=FEAT_CLOUD_UPLOAD --minify src/index.ts --outdir=./dist

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Run
CMD ["bun", "dist/index.js"]
```

### Monitoring

```typescript
// Health check endpoint
app.get("/health", (req) => {
  return Response.json({
    status: "ok",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    uploads: uploadService.getActiveUploads().length
  });
});

// Metrics endpoint
app.get("/metrics", (req) => {
  const metrics = telemetry.getMetrics();
  return Response.json(metrics);
});
```

---

## Troubleshooting

### Common Issues

#### Upload Fails with "S3 client not initialized"

**Cause**: `FEAT_CLOUD_UPLOAD` feature not enabled

**Solution**:
```bash
bun build --feature=FEAT_CLOUD_UPLOAD src/index.ts
```

#### Feature Flag Always Returns `false`

**Cause**: Feature not passed to build command

**Solution**:
```bash
# Correct
bun build --feature=MY_FEATURE src/index.ts

# Incorrect (singular, not plural)
bun build --features=MY_FEATURE src/index.ts
```

#### Dead Code Not Eliminated

**Cause**: Using `feature()` incorrectly

**Solution**:
```typescript
// ✅ Correct
const value = feature("DEBUG") ? "yes" : "no";
if (feature("DEBUG")) {
  console.log("enabled");
}

// ❌ Wrong
console.log(feature("DEBUG"));  // Can't use as expression
const flag = feature("DEBUG");  // Can't assign to variable
```

#### Module Not Found

**Cause**: Missing dependencies

**Solution**:
```bash
bun install
```

#### Test Failures

**Cause**: Missing test setup or environment

**Solution**:
```bash
# Setup test environment
cp .env.test .env.local

# Run specific test with verbose output
bun test tests/unit/server/upload-service.test.ts --verbose
```

---

## Contributing

### Development Workflow

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Update documentation
6. Submit pull request

### Code Style

```bash
# Format code
bun run format

# Lint code
bun run lint

# Run tests
bun test
```

### Test Requirements

- All tests must pass
- New features require tests
- Maintain >80% code coverage
- Use TypeScript strict mode

---

## License

MIT License - See LICENSE file for details

---

## Additional Resources

### Documentation

- [Bun Documentation](https://bun.sh/docs)
- [Feature Flags Guide](./FEATURE_FLAGS_VERIFICATION.md)
- [DCE Annotations](./BUN_DCE_ANNOTATIONS.md)
- [Performance Stress Test](./BUN_PERFORMANCE_STRESS_TEST.md)
- [File I/O Guide](./BUN_FILE_IO.md)
- [Environment Cheatsheet](./ENV_CHEATSHEET.md)

### GitHub Repository

- [Issues](https://github.com/brendadeeznuts1111/geelark/issues)
- [Pull Requests](https://github.com/brendadeeznuts1111/geelark/pulls)
- [Wiki](https://github.com/brendadeeznuts1111/geelark/wiki)

### Community

- [Discord](https://bun.sh/discord)
- [GitHub Discussions](https://github.com/brendadeeznuts1111/geelark/discussions)

---

**Generated**: 2026-01-08
**Version**: 1.0.0
**Maintainer**: Geelark Development Team
