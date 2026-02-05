# 🚀 Bun New Features Guide

Complete guide to new Bun features: Fake Timers, SQL improvements, CRC32 acceleration, S3 Requester Pays, and WebSocket proxies.

## 📋 Quick Reference

| Feature | Benefit | Implementation |
|---------|---------|-----------------|
| Fake Timers | Works with @testing-library/react | `jest.useFakeTimers()` |
| SQL undefined | Respects DEFAULT values | Filter undefined in INSERT |
| CRC32 20x faster | Hardware acceleration | `Bun.hash.crc32()` |
| S3 Requester Pays | Access public S3 buckets | `requestPayer: true` |
| WebSocket Proxy | Corporate proxy support | `proxy` option |
| SQLite 3.51.2 | Bug fixes and improvements | Auto-updated |

## 🧪 Fake Timers with @testing-library/react

### Setup

```javascript
import { jest } from "bun:test";
import { setupFakeTimers, restoreRealTimers } from "./src/testing-utilities.js";

it("works with fake timers", async () => {
  const timers = setupFakeTimers();
  
  // Your test code here
  // setTimeout.clock is now true
  
  restoreRealTimers();
});
```

### Key Features

- ✅ `setTimeout.clock = true` detection
- ✅ `advanceTimersByTime(0)` fires immediate timers
- ✅ Microtask queue draining
- ✅ Works with @testing-library/user-event

### Example: User Interaction Test

```javascript
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupFakeTimers, restoreRealTimers } from "./src/testing-utilities.js";

it("handles user clicks with fake timers", async () => {
  setupFakeTimers();
  
  const { getByRole } = render(<button>Click me</button>);
  const user = userEvent.setup();
  
  // This no longer hangs!
  await user.click(getByRole("button"));
  
  restoreRealTimers();
});
```

## 💾 SQL Improvements

### Undefined Value Handling

```javascript
import { insertRecord, bulkInsert } from "./src/database-utilities.js";

// Before: Would fail with "null value violates not-null constraint"
// After: Omits undefined, lets DEFAULT work
const record = await insertRecord("MyTable", {
  foo: undefined,  // Omitted, uses DEFAULT
  id: Bun.randomUUIDv7(),
});
```

### Bulk Insert with Column Detection

```javascript
// Now works correctly - 'bar' column is included
// even though it's undefined in the first object
await bulkInsert("MyTable", [
  { foo: "a" },
  { foo: "b", bar: "c" }
]);
```

### Upsert with Undefined Handling

```javascript
const record = await upsertRecord("MyTable", {
  id: "123",
  name: "John",
  email: undefined,  // Omitted, preserves existing value
});
```

## ⚡ CRC32 20x Faster

### Hardware-Accelerated Hashing

```javascript
import { fastCrc32, crc32String, crc32File } from "./src/database-utilities.js";

// 20x faster with hardware acceleration
const data = Buffer.alloc(1024 * 1024);
const checksum = fastCrc32(data);  // ~124 µs (was 2,644 µs)

// String hashing
const strChecksum = crc32String("hello world");

// File hashing
const fileChecksum = await crc32File("./data.bin");

// Batch hashing
const checksums = batchCrc32([data1, data2, data3]);

// Verification
const verified = verifyCrc32(data, expectedChecksum);
```

### Benchmark

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| 1MB buffer | 2,644 µs | 124 µs | **20x faster** |

## 🪣 S3 Requester Pays

### Basic Usage

```javascript
import { RequesterPaysS3 } from "./src/cloud-utilities.js";

const s3 = new RequesterPaysS3("requester-pays-bucket");

// Read file
const content = await s3.read("data.csv");

// Read as JSON
const data = await s3.readJSON("config.json");

// Write file
await s3.write("output.json", JSON.stringify(data));

// Get metadata
const stat = await s3.stat("data.csv");

// List files
const files = await s3.list("prefix/");

// Delete file
await s3.delete("old-file.txt");
```

### With Custom Options

```javascript
const s3 = new RequesterPaysS3("bucket", {
  region: "us-west-2",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
```

## 🔌 WebSocket Proxy Support

### HTTP Proxy

```javascript
import { ProxiedWebSocket } from "./src/cloud-utilities.js";

const ws = new ProxiedWebSocket("wss://example.com");
await ws.connectHttpProxy("http://proxy:8080");

ws.on("open", () => ws.send("Hello"));
ws.on("message", (event) => console.log(event.data));
```

### HTTPS Proxy with TLS

```javascript
const ws = new ProxiedWebSocket("wss://example.com");
await ws.connectHttpsProxy("https://proxy:8443", {
  rejectUnauthorized: false,
});
```

### Proxy Authentication

```javascript
const ws = new ProxiedWebSocket("wss://example.com");
await ws.connectWithAuth("http://proxy:8080", "user", "pass");
```

### Custom Proxy Headers

```javascript
const ws = new ProxiedWebSocket("wss://example.com");
await ws.connectWithHeaders("http://proxy:8080", {
  "Proxy-Authorization": "Bearer token",
  "X-Custom-Header": "value",
});
```

### WebSocket Pool

```javascript
import { WebSocketPool } from "./src/cloud-utilities.js";

const pool = new WebSocketPool(
  "wss://example.com",
  "http://proxy:8080"
);

// Get or create connection
const ws1 = await pool.getConnection("client-1");
const ws2 = await pool.getConnection("client-2");

// Close specific connection
pool.closeConnection("client-1");

// Close all connections
pool.closeAll();

// Get pool size
console.log(pool.size());  // 1
```

## 📊 SQLite 3.51.2 Updates

### Improvements

- ✅ DISTINCT clause edge case fixes
- ✅ OFFSET clause improvements
- ✅ WAL mode locking behavior
- ✅ Cursor renumbering fixes

### Usage

```javascript
import { Database } from "bun:sqlite";

const db = new Database(":memory:");

// All improvements are automatic
db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");
db.exec("INSERT INTO users VALUES (1, 'Alice')");

const result = db.query("SELECT DISTINCT name FROM users").all();
```

## 🎯 Integration Examples

### Complete Testing Setup

```javascript
import { jest } from "bun:test";
import { setupFakeTimers, restoreRealTimers } from "./src/testing-utilities.js";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("Component with timers", () => {
  it("handles user interactions", async () => {
    setupFakeTimers();
    
    const { getByRole } = render(<MyComponent />);
    const user = userEvent.setup();
    
    await user.click(getByRole("button"));
    
    restoreRealTimers();
  });
});
```

### Database with CRC32 Verification

```javascript
import { bulkInsert, batchCrc32, verifyCrc32 } from "./src/database-utilities.js";

async function importDataWithVerification(records, expectedChecksum) {
  // Insert records
  const inserted = await bulkInsert("data", records);
  
  // Verify with CRC32
  const data = JSON.stringify(inserted);
  const verified = verifyCrc32(Buffer.from(data), expectedChecksum);
  
  return { inserted, verified };
}
```

### S3 with WebSocket Notifications

```javascript
import { RequesterPaysS3 } from "./src/cloud-utilities.js";
import { ProxiedWebSocket } from "./src/cloud-utilities.js";

async function uploadAndNotify(bucket, key, data, wsUrl, proxyUrl) {
  // Upload to S3
  const s3 = new RequesterPaysS3(bucket);
  await s3.write(key, data);
  
  // Notify via WebSocket
  const ws = new ProxiedWebSocket(wsUrl);
  await ws.connectHttpProxy(proxyUrl);
  ws.send(JSON.stringify({ event: "upload", key }));
}
```

## ✅ Implementation Checklist

- ✅ Fake timers with @testing-library/react
- ✅ SQL undefined value handling
- ✅ Bulk insert column detection
- ✅ CRC32 hardware acceleration
- ✅ S3 Requester Pays support
- ✅ WebSocket HTTP proxy
- ✅ WebSocket HTTPS proxy
- ✅ WebSocket authentication
- ✅ SQLite 3.51.2 support

## 📚 References

- [Bun Testing Guide](https://bun.sh/docs/test/overview)
- [Bun SQL Guide](https://bun.sh/docs/api/sql)
- [Bun S3 Guide](https://bun.sh/docs/api/s3)
- [Bun WebSocket Guide](https://bun.sh/docs/api/websockets)

---

**Status**: Ready for implementation  
**Estimated Impact**: Improved testing, faster hashing, cloud integration

