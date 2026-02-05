# Geelark Quick Reference - Types, Properties & Bun API

**Last Updated**: 2026-01-08
**Version**: 1.0.0

---

## Table of Contents

1. [TypeScript Types & Interfaces](#typescript-types--interfaces)
2. [Component Props Reference](#component-props-reference)
3. [Bun API Quick Reference](#bun-api-quick-reference)
4. [Common Patterns](#common-patterns)
5. [Server Constants](#server-constants)
6. [Feature Flags](#feature-flags)
7. [API Endpoints](#api-endpoints)
8. [WebSocket Messages](#websocket-messages)

---

## TypeScript Types & Interfaces

### Upload Types

```typescript
// Upload Configuration
interface UploadConfig {
  provider: "s3" | "r2" | "local";
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  endpoint?: string;
  localDir?: string;
}

// Upload Options
interface UploadOptions {
  filename: string;
  contentType: string;
  contentDisposition?: "inline" | "attachment";
  metadata?: Record<string, string>;
}

// Upload Progress
interface UploadProgress {
  uploadId: string;
  filename: string;
  totalBytes: number;
  uploadedBytes: number;
  progress: number;           // 0-100
  status: "initiated" | "uploading" | "completed" | "failed" | "cancelled";
  startedAt: number;
  completedAt?: number;
  error?: string;
  url?: string;
}

// Upload Result
interface UploadResult {
  uploadId: string;
  filename: string;
  url: string;
  size: number;
  duration: number;
  provider: "s3" | "r2" | "local";
}
```

### Monitoring Types

```typescript
// Metrics
interface Metrics {
  timestamp: number;
  metric_type: string;
  value: number;
  labels?: Record<string, string>;
}

// System Health
interface SystemHealth {
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
  services: ServiceHealth[];
}

// Service Health
interface ServiceHealth {
  name: string;
  status: "healthy" | "unhealthy";
  latency?: number;
  error?: string;
}
```

### Telemetry Types

```typescript
// Alert
interface Alert {
  id: number;
  timestamp: number;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  source: string;
  metric: string;
  value: number;
  threshold: number;
  unit?: string;
  message: string;
  environment: string;
  resolved: boolean;
  notified: boolean;
}

// Upload Telemetry
interface UploadTelemetry {
  uploadId: string;
  filename: string;
  fileSize: number;
  duration: number;
  status: "success" | "failure";
  provider: "s3" | "r2" | "local";
  timestamp: number;
}
```

### Feature Flag Types

```typescript
// Feature Registry (from env.d.ts)
declare module "bun:bundle" {
  interface Registry {
    features:
      | "ENV_DEVELOPMENT"
      | "ENV_PRODUCTION"
      | "ENV_TEST"
      | "FEAT_CLOUD_UPLOAD"
      | "FEAT_UPLOAD_PROGRESS"
      | "FEAT_MULTIPART_UPLOAD"
      | "FEAT_UPLOAD_ANALYTICS"
      | "FEAT_CUSTOM_METADATA"
      | "FEAT_PREMIUM"
      | "FEAT_AUTO_HEAL"
      | "FEAT_NOTIFICATIONS"
      | "FEAT_ENCRYPTION"
      | "FEAT_MOCK_API"
      | "FEAT_EXTENDED_LOGGING"
      | "FEAT_ADVANCED_MONITORING"
      | "FEAT_BATCH_PROCESSING"
      | "FEAT_VALIDATION_STRICT";
  }
}

// Feature Metadata
interface FeatureMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  critical?: boolean;
  badge?: {
    enabled: string;
    disabled: string;
  };
  impact?: {
    bundleSize: string;
    performance: string;
    security: string;
  };
  default?: boolean;
}
```

---

## Component Props Reference

### UploadPanel Component

```typescript
interface UploadPanelProps {
  /** API base URL (default: '/api') */
  apiBaseUrl?: string;

  /** WebSocket URL (default: 'ws://localhost:3000') */
  wsUrl?: string;

  /** Upload complete callback */
  onUploadComplete?: (result: UploadProgress) => void;

  /** Upload error callback */
  onUploadError?: (error: string) => void;
}

// Usage
<UploadPanel
  apiBaseUrl="/api"
  wsUrl="ws://localhost:3000"
  onUploadComplete={(result) => console.log('Uploaded:', result.url)}
  onUploadError={(error) => console.error('Error:', error)}
/>
```

### MonitoringDashboard Component

```typescript
interface MonitoringDashboardProps {
  /** API base URL */
  apiBaseUrl?: string;

  /** WebSocket URL */
  wsUrl?: string;

  /** Auto-refresh interval (ms) */
  refreshInterval?: number;

  /** Show/hide components */
  showCPU?: boolean;
  showMemory?: boolean;
  showUptime?: boolean;
}

// Usage
<MonitoringDashboard
  apiBaseUrl="/api"
  refreshInterval={5000}
  showCPU={true}
  showMemory={true}
/>
```

### TelemetryPanel Component

```typescript
interface TelemetryPanelProps {
  /** API base URL */
  apiBaseUrl?: string;

  /** Default time range */
  defaultTimeRange?: "1h" | "24h" | "7d" | "30d";

  /** Available metrics */
  metrics?: string[];

  /** Export functionality */
  enableExport?: boolean;
}

// Usage
<TelemetryPanel
  defaultTimeRange="24h"
  metrics={["cpu", "memory", "response_time"]}
  enableExport={true}
/>
```

---

## Bun API Quick Reference

### File I/O

```typescript
// Read file as text
const text = await Bun.file("path.txt").text();

// Read file as JSON
const json = await Bun.file("config.json").json();

// Read file as ArrayBuffer
const buffer = await Bun.file("data.bin").arrayBuffer();

// Get file info
const file = Bun.file("path.txt");
console.log(file.size);      // File size in bytes
console.log(file.type);      // MIME type

// Write file
await Bun.write("output.txt", "Hello, World!");

// Write ArrayBuffer
await Bun.write("output.bin", arrayBuffer);

// Write with stream
await Bun.write("large.txt", Bun.file("input.txt").stream());
```

### String Width (Unicode-Aware)

```typescript
// Get display width (accounts for emojis, ZWJ, ANSI codes)
Bun.stringWidth("Hello");              // 5
Bun.stringWidth("🇺🇸");                // 2 (flag emoji)
Bun.stringWidth("👋🏽");                // 2 (emoji + skin tone)
Bun.stringWidth("👨‍👩‍👧");              // 2 (ZWJ sequence)
Bun.stringWidth("\u2060");             // 0 (zero-width)
Bun.stringWidth("\x1b[31mRed\x1b[0m"); // 3 (ANSI excluded)
```

### Hashing

```typescript
// Hash string
Bun.hash("hello");  // Returns bigint

// Hash to number
Number(Bun.hash("data"));
```

### Deep Equals

```typescript
// Compare objects/arrays
Bun.deepEquals({ a: 1 }, { a: 1 });  // true
Bun.deepEquals([1, 2], [1, 2]);      // true
Bun.deepEquals({ a: 1 }, { a: 2 });  // false
```

### Sleep/Delay

```typescript
// Sleep for milliseconds
await Bun.sleep(1000);  // Sleep 1 second

// Sleep with nanoseconds
await Bun.sleep(500_000_000);  // Sleep 0.5 seconds
```

### Color (ANSI)

```typescript
// Get ANSI color codes
Bun.color("red", "ansi");          // \x1b[31m
Bun.color("bgRed", "ansi");        // \x1b[41m
Bun.color("bold", "ansi");         // \x1b[1m

// Usage
console.log(`${Bun.color("red", "ansi")}Error text${Bun.color("reset", "ansi")}`);
```

### Inspect

```typescript
// Inspect with formatting
Bun.inspect(object);

// Table format
Bun.inspect.table({
  columns: [
    { key: "name", header: "Name" },
    { key: "value", header: "Value" }
  ],
  rows: [
    { name: "Item 1", value: 100 },
    { name: "Item 2", value: 200 }
  ]
});

// With options
Bun.inspect(object, {
  depth: 2,
  colors: true,
  showHidden: false
});
```

### Password

```typescript
// Hash password
const hash = await Bun.password.hash("plaintext");
// => $2a$10$...

// Verify password
const matches = await Bun.password.verify("plaintext", hash);
// => true or false

// Hash with specific algorithm
const hash = await Bun.password.hash("plaintext", {
  algorithm: "bcrypt",
  cost: 12  // Work factor
});
```

### SQLite Database

```typescript
// Create database
import { Database } from "bun:sqlite";
const db = new Database("app.db");

// Enable WAL mode
db.exec("PRAGMA journal_mode = WAL");

// Execute SQL
db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");

// Insert
db.run("INSERT INTO users (name) VALUES (?)", "Alice");

// Query one
const user = db.get("SELECT * FROM users WHERE id = ?", 1);

// Query all
const users = db.all("SELECT * FROM users");

// Prepared statement
const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
console.log(stmt.get(1));
console.log(stmt.all());

// Transaction
db.transaction(() => {
  stmt.run("Bob");
  stmt.run("Charlie");
})();
```

### HTTP Server

```typescript
// Simple server
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello!");
  }
});

// With routes
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok" });
    }

    return new Response("Not found", { status: 404 });
  }
});

// WebSocket
Bun.serve({
  port: 3000,
  fetch(req, server) {
    if (req.headers.get("upgrade") === "websocket") {
      server.upgrade(req);
    }
    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      ws.subscribe("channel");
    },
    message(ws, msg) {
      ws.publish("channel", msg);
    },
    close(ws) {
      // Cleanup
    }
  }
});
```

### HTTP Client

```typescript
// GET request
const response = await fetch("https://api.example.com/data");
const data = await response.json();

// POST request
await fetch("https://api.example.com/data", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "value" })
});

// FormData
const formData = new FormData();
formData.append("file", new Blob(["data"]), "file.txt");
formData.append("filename", "test.txt");

await fetch("/api/upload", {
  method: "POST",
  body: formData
});
```

### Build & Feature Flags

```typescript
// Import feature function
import { feature } from "bun:bundle";

// Use in conditional (compile-time)
if (feature("FEAT_CLOUD_UPLOAD")) {
  // This code only included if feature enabled
  console.log("Cloud upload enabled");
}

// Ternary expression
const value = feature("DEBUG") ? "yes" : "no";

// Multiple flags
const HAS_UPLOAD = feature("FEAT_CLOUD_UPLOAD");
const HAS_PROGRESS = feature("FEAT_UPLOAD_PROGRESS");

if (HAS_UPLOAD && HAS_PROGRESS) {
  // Both features enabled
}
```

### Glob

```typescript
// Scan directory
for await (const file of new Bun.Glob("**/*.ts").scan(".")) {
  console.log(file);
}

// Get all matches
const files = Array.from(new Bun.Glob("**/*.test.ts").scan("."));
```

### Spawn

```typescript
// Spawn process
const proc = Bun.spawn(["bun", "run", "script.ts"]);

// Wait for exit
await proc.exited;

// Get exit code
console.log(proc.exitCode);

// Get output
const stdout = await Bun.file(proc.stdout).text();
const stderr = await Bun.file(proc.stderr).text();

// Pipe output
proc.stdout.pipe(process.stdout);
```

### Environment

```typescript
// Get env var
const value = process.env.MY_VAR;

// Get all env
console.log(process.env);

// Platform info
console.log(process.platform);  // "darwin", "linux", "win32"
console.log(process.arch);      // "x64", "arm64"

// Bun version
console.log(Bun.version);
```

---

## Common Patterns

### Upload File Pattern

```typescript
// 1. Create file object
const file = new Blob(["content"], { type: "text/plain" });

// 2. Create FormData
const formData = new FormData();
formData.append("file", file, "filename.txt");
formData.append("contentType", "text/plain");

// 3. Upload
const response = await fetch("/api/upload/initiate", {
  method: "POST",
  body: formData
});

// 4. Get result
const result = await response.json();
console.log(result.uploadId, result.url);
```

### Config Loading Pattern

```typescript
// Load JSON config
const config = await Bun.file("config.json").json() as UploadConfig;

// Validate
if (!config.provider || !config.bucket) {
  throw new Error("Invalid config");
}

// Use
console.log(`Provider: ${config.provider}`);
```

### Progress Tracking Pattern

```typescript
// Poll for progress
const pollProgress = async (uploadId: string) => {
  while (true) {
    const response = await fetch(`/api/upload/status/${uploadId}`);
    const progress = await response.json();

    console.log(`${progress.progress.toFixed(1)}%`);

    if (progress.status === "completed" || progress.status === "failed") {
      break;
    }

    await Bun.sleep(1000);
  }
};
```

### WebSocket Pattern

```typescript
// Connect and subscribe
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "subscribe",
    channel: "dashboard"
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "upload-progress") {
    console.log(`${message.data.filename}: ${message.data.progress}%`);
  }
};
```

---

## Server Constants

### Upload Constants

```typescript
import { UPLOAD } from "./src/server/ServerConstants.js";

// File sizes
UPLOAD.MAX_SIMPLE_SIZE         // 5 * 1024 * 1024 (5MB)
UPLOAD.MAX_MULTIPART_SIZE      // 5 * 1024 * 1024 * 1024 * 1024 (5TB)
UPLOAD.CHUNK_SIZE              // 5 * 1024 * 1024 (5MB)

// Timeouts
UPLOAD.TIMEOUT                 // 300000 (5 minutes)
UPLOAD.PROGRESS_INTERVAL       // 500 (500ms)

// Limits
UPLOAD.MAX_CONCURRENT           // 10

// Providers
UPLOAD.PROVIDERS.AWS_S3         // "s3"
UPLOAD.PROVIDERS.CLOUDFLARE_R2  // "r2"
UPLOAD.PROVIDERS.LOCAL_DEV      // "local"

// Content Disposition
UPLOAD.DISPOSITION.INLINE       // "inline"
UPLOAD.DISPOSITION.ATTACHMENT   // "attachment"

// Status
UPLOAD.STATUS.INITIATED         // "initiated"
UPLOAD.STATUS.UPLOADING         // "uploading"
UPLOAD.STATUS.COMPLETED         // "completed"
UPLOAD.STATUS.FAILED            // "failed"
UPLOAD.STATUS.CANCELLED         // "cancelled"

// Content Types
UPLOAD.CONTENT_TYPES.TEXT_PLAIN           // "text/plain"
UPLOAD.CONTENT_TYPES.IMAGE_PNG            // "image/png"
UPLOAD.CONTENT_TYPES.APPLICATION_JSON     // "application/json"

// Metadata Keys
UPLOAD.METADATA_KEYS.ORIGINAL_FILENAME    // "original_filename"
UPLOAD.METADATA_KEYS.CONTENT_TYPE         // "content_type"
UPLOAD.METADATA_KEYS.FILE_SIZE            // "file_size"
UPLOAD.METADATA_KEYS.UPLOADED_AT          // "uploaded_at"
```

---

## Feature Flags

### Upload Flags

```typescript
import { feature } from "bun:bundle";

// Cloud upload (required for S3/R2)
if (feature("FEAT_CLOUD_UPLOAD")) {
  // Initialize S3 client
}

// Progress tracking (required for real-time updates)
if (feature("FEAT_UPLOAD_PROGRESS")) {
  // Enable WebSocket progress
}

// Multipart upload (required for files >5MB)
if (feature("FEAT_MULTIPART_UPLOAD")) {
  // Use multipart upload strategy
}

// Upload analytics (required for metrics)
if (feature("FEAT_UPLOAD_ANALYTICS")) {
  // Record telemetry
}

// Custom metadata (required for S3 custom metadata)
if (feature("FEAT_CUSTOM_METADATA")) {
  // Allow custom metadata
}
```

### Build Flags

```typescript
// Environment
feature("ENV_DEVELOPMENT")   // Dev mode
feature("ENV_PRODUCTION")     // Production mode
feature("ENV_TEST")           // Test mode

// Features
feature("FEAT_PREMIUM")              // Premium features
feature("FEAT_AUTO_HEAL")            // Auto-healing
feature("FEAT_NOTIFICATIONS")        // Notifications
feature("FEAT_ENCRYPTION")           // Encryption
feature("FEAT_MOCK_API")             // Mock API
feature("FEAT_EXTENDED_LOGGING")     // Verbose logging
feature("FEAT_ADVANCED_MONITORING")  // Advanced metrics
feature("FEAT_BATCH_PROCESSING")     // Batch operations
feature("FEAT_VALIDATION_STRICT")    // Strict validation
```

---

## API Endpoints

### Upload Endpoints

```typescript
// POST /api/upload/initiate
// Initiate file upload
Request: FormData {
  file: File,
  filename?: string,
  contentType?: string,
  contentDisposition?: "inline" | "attachment",
  metadata?: string (JSON)
}
Response: {
  success: true,
  uploadId: string,
  filename: string,
  url: string,
  size: number,
  duration: number,
  provider: "s3" | "r2" | "local"
}

// GET /api/upload/status/:id
// Get upload progress
Response: UploadProgress

// GET /api/uploads/active
// List active uploads
Response: UploadProgress[]

// POST /api/upload/cancel/:id
// Cancel upload
Response: { success: true }

// GET /api/uploads/telemetry
// Get upload metrics (requires FEAT_UPLOAD_ANALYTICS)
Response: {
  total: number,
  success: number,
  failure: number,
  avgDuration: number,
  totalBytes: number
}
```

### Monitoring Endpoints

```typescript
// GET /api/health
// Health check
Response: {
  status: "healthy" | "degraded" | "unhealthy",
  uptime: number,
  version: string,
  timestamp: string
}

// GET /api/metrics
// System metrics
Response: Metrics

// GET /api/dashboard/health
// Dashboard health
Response: {
  status: string,
  uptime: number,
  version: string,
  features: Record<string, boolean>
}

// GET /api/dashboard/metrics
// Dashboard metrics
Response: {
  cpu: number,
  memory: number,
  activeUploads: number,
  totalUploads: number,
  successRate: number
}
```

---

## WebSocket Messages

### Client → Server

```typescript
// Subscribe to channel
{
  type: "subscribe",
  channel: "dashboard" | "uploads" | "telemetry"
}

// Unsubscribe from channel
{
  type: "unsubscribe",
  channel: "dashboard"
}
```

### Server → Client

```typescript
// Upload progress
{
  type: "upload-progress",
  data: UploadProgress
}

// Upload complete
{
  type: "upload-complete",
  data: {
    uploadId: string,
    filename: string,
    url: string,
    duration: number
  }
}

// Upload error
{
  type: "upload-error",
  data: {
    uploadId: string,
    filename: string,
    error: string
  }
}

// Metrics update
{
  type: "metrics",
  data: {
    cpu: number,
    memory: number,
    uptime: number
  }
}

// Alert
{
  type: "alert",
  data: {
    severity: "info" | "warning" | "error" | "critical",
    message: string,
    timestamp: number
  }
}
```

---

## Utility Functions

### Format Bytes

```typescript
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Usage
formatBytes(1024);        // "1 KB"
formatBytes(1048576);     // "1 MB"
formatBytes(1073741824);  // "1 GB"
```

### Format Duration

```typescript
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Usage
formatDuration(1000);      // "1s"
formatDuration(65000);     // "1m 5s"
formatDuration(3665000);   // "61m 5s"
```

### Format Percentage

```typescript
function formatPercentage(value: number, total: number): string {
  return ((value / total) * 100).toFixed(1) + "%";
}

// Usage
formatPercentage(512, 1024);  // "50.0%"
formatPercentage(768, 1024);  // "75.0%"
```

---

## Environment Variables

```bash
# Upload Configuration
UPLOAD_PROVIDER=s3              # s3, r2, or local
S3_ACCESS_KEY_ID=your_key
S3_SECRET_ACCESS_KEY=your_secret
S3_BUCKET=my-bucket
S3_REGION=us-east-1
S3_ENDPOINT=https://...
UPLOAD_LOCAL_DIR=./uploads

# Feature Flags (Build-time)
ENABLE_CLOUD_UPLOAD=true
ENABLE_UPLOAD_PROGRESS=true
ENABLE_MULTIPART_UPLOAD=false

# Server Configuration
PORT=3000
HOST=0.0.0.0
ENVIRONMENT=production

# Database
DB_PATH=./monitoring.db

# Dashboard (Vite)
VITE_WS_BASE=ws://localhost:3000
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## Common Commands

### Development

```bash
# Run dev server
bun run dev

# Run with hot reload
bun --watch src/index.ts

# Run with specific features
bun --feature=FEAT_CLOUD_UPLOAD src/index.ts

# Type check
bun type-check

# Lint
bun lint
```

### Testing

```bash
# Run all tests
bun test

# Run specific test
bun test tests/unit/server/upload-service.test.ts

# Watch mode
bun test --watch

# Coverage
bun test --coverage

# Verbose
bun test --verbose
```

### Build

```bash
# Build for production
bun run build

# Build with features
bun build --feature=FEAT_CLOUD_UPLOAD,FEAT_UPLOAD_PROGRESS src/index.ts

# Build with minify
bun build --minify src/index.ts

# Build to directory
bun build src/index.ts --outdir=./dist
```

### Dashboard

```bash
# Dashboard dev server
cd dashboard-react
bun run dev

# Build dashboard
bun run build

# Preview dashboard
bun run preview
```

---

**Generated**: 2026-01-08
**Version**: 1.0.0
**Maintainer**: Geelark Development Team
