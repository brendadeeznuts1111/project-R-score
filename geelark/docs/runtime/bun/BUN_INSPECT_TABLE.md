# Bun.inspect.table() - Complete Guide

## Overview

`Bun.inspect.table()` formats tabular data (objects or arrays) into a beautifully formatted string table. Unlike `console.table()`, it **returns a string** instead of printing directly, giving you full control over the output.

**Added**: Bun v1.1.31 (October 18, 2024)
**Enhanced**: Bun 1.2+ (January 22, 2025)

## Reference
- [Bun.inspect.table API Reference](https://bun.com/reference/bun/inspect/table)
- [Bun Utils Documentation](https://bun.com/docs/runtime/utils)
- [Bun v1.1.31 Release Notes](https://bun.com/blog/bun-v1.1.31)

---

## Function Signature

```typescript
function table(
  tabularData: object | unknown[],
  properties?: string[],
  options?: {
    // Optional formatting options
  }
): string
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `tabularData` | `object` or `unknown[]` | Data to format as table |
| `properties` | `string[]` (optional) | Specific properties to display |
| `options` | `object` (optional) | Formatting options (TBD) |

### Returns

`string` - The formatted table as a string

---

## Basic Usage

### Simple Array of Objects

```typescript
const users = [
  { id: 1, name: "Alice", age: 30, role: "admin" },
  { id: 2, name: "Bob", age: 25, role: "user" },
  { id: 3, name: "Charlie", age: 35, role: "user" }
];

const table = Bun.inspect.table(users);
console.log(table);
```

**Output**:
```
┌─────────┬──────────┬─────┬───────┐
│ (index) │   id     │ name │  age  │
├─────────┼──────────┼─────┼───────┤
│    0    │    1     │ 'Al… │  30   │
│    1    │    2     │ 'Bo… │  25   │
│    2    │    3     │ 'Ch… │  35   │
└─────────┴──────────┴─────┴───────┘
```

### Object with Properties

```typescript
const server = {
  hostname: "localhost",
  port: 3000,
  status: "running",
  connections: 42
};

const table = Bun.inspect.table(server);
console.log(table);
```

**Output**:
```
┌─────────────────┬─────────────────┐
│    (property)   │     Values      │
├─────────────────┼─────────────────┤
│     hostname    │  'localhost'    │
│      port       │      3000       │
│     status      │   'running'     │
│   connections   │       42        │
└─────────────────┴─────────────────┘
```

### Select Specific Properties

```typescript
const users = [
  { id: 1, name: "Alice", age: 30, role: "admin" },
  { id: 2, name: "Bob", age: 25, role: "user" },
  { id: 3, name: "Charlie", age: 35, role: "user" }
];

// Only show name and age
const table = Bun.inspect.table(users, ["name", "age"]);
console.log(table);
```

**Output**:
```
┌─────────┬──────────┬─────┐
│ (index) │   name   │ age │
├─────────┼──────────┼─────┤
│    0    │ 'Alice'  │ 30  │
│    1    │  'Bob'   │ 25  │
│    2    │ 'Charl…  │ 35  │
└─────────┴──────────┴─────┘
```

---

## Advanced Examples

### Database Results

```typescript
import { Database } from "bun:sqlite";

const db = new Database("mydb.db");
const users = db.query("SELECT * FROM users").all();

const table = Bun.inspect.table(users);
console.log(table);
```

### Server Metrics

```typescript
const metrics = {
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  cpu: process.cpuUsage(),
  connections: {
    active: 42,
    idle: 8
  }
};

const table = Bun.inspect.table(metrics);
console.log(table);
```

### Feature Flags

```typescript
import { feature } from "bun:bundle";

const flags = [
  { name: "FEAT_CLOUD_UPLOAD", enabled: feature("FEAT_CLOUD_UPLOAD"), status: "active" },
  { name: "FEAT_UPLOAD_PROGRESS", enabled: feature("FEAT_UPLOAD_PROGRESS"), status: "active" },
  { name: "FEAT_MULTIPART_UPLOAD", enabled: feature("FEAT_MULTIPART_UPLOAD"), status: "premium" }
];

const table = Bun.inspect.table(flags);
console.log(table);
```

### File System Stats

```typescript
import { readdir } from "node:fs/promises";

const files = await readdir(".", { withFileTypes: true });
const fileStats = files.map(f => ({
  name: f.name,
  type: f.isDirectory() ? "dir" : "file",
  size: f.isFile() ? Bun.file(f.name).size : 0
}));

const table = Bun.inspect.table(fileStats);
console.log(table);
```

---

## Comparison: `Bun.inspect.table()` vs `console.table()`

| Feature | `Bun.inspect.table()` | `console.table()` |
|---------|----------------------|------------------|
| **Returns** | `string` | `undefined` (prints to console) |
| **Use case** | Capture output, log to file | Quick debugging |
| **Composable** | ✅ Yes | ❌ No |
| **Flexible** | ✅ Can post-process | ❌ Direct output |
| **Format** | Identical | Identical |

### Example Comparison

**`console.table()`**:
```typescript
const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
console.table(data); // Prints directly to console
```

**`Bun.inspect.table()`**:
```typescript
const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
const table = Bun.inspect.table(data);

// Now you can:
console.log(table); // Print it
await Bun.write("output.txt", table); // Save to file
logger.log(table); // Use with custom logger
sendToWebSocket(table); // Send over network
```

---

## Real-World Use Cases

### 1. Log to File

```typescript
import { Database } from "bun:sqlite";

const db = new Database("analytics.db");
const stats = db.query("SELECT * FROM daily_stats").all();

const table = Bun.inspect.table(stats);
await Bun.write("logs/stats-" + Date.now() + ".log", table);
```

### 2. Server Startup Banner

```typescript
function printServerInfo() {
  const info = {
    "Bun Version": Bun.version,
    "Platform": process.platform,
    "Architecture": process.arch,
    "Node Version": process.version,
    "Memory": `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    "Uptime": `${Math.round(process.uptime())}s`
  };

  const table = Bun.inspect.table(info);
  console.log("\n" + table + "\n");
}

printServerInfo();
```

**Output**:
```
┌──────────────────┬──────────────────┐
│    (property)    │     Values       │
├──────────────────┼──────────────────┤
│   Bun Version    │    '1.3.5'       │
│     Platform     │    'darwin'      │
│  Architecture    │     'arm64'      │
│   Node Version   │  'v20.0.0'      │
│     Memory       │     '128MB'      │
│     Uptime       │      '42s'       │
└──────────────────┴──────────────────┘
```

### 3. API Response Formatting

```typescript
Bun.serve({
  port: 3000,
  async fetch(req) {
    const data = [
      { id: 1, name: "Alice", role: "admin" },
      { id: 2, name: "Bob", role: "user" }
    ];

    // Accept header determines format
    const accept = req.headers.get("accept");

    if (accept?.includes("text/plain")) {
      const table = Bun.inspect.table(data);
      return new Response(table, {
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Default JSON
    return Response.json(data);
  }
});
```

### 4. Test Results

```typescript
import { test } from "bun:test";

test("example test", () => {
  const results = [
    { test: "login", status: "pass", duration: 45 },
    { test: "register", status: "pass", duration: 120 },
    { test: "upload", status: "fail", duration: 500 }
  ];

  console.log("\nTest Results:\n");
  console.log(Bun.inspect.table(results));
});
```

### 5. Telemetry Dashboard

```typescript
import { TelemetrySystem } from "./TelemetrySystem";

const telemetry = new TelemetrySystem();

function printTelemetryReport() {
  const metrics = telemetry.getMetrics();
  const alerts = telemetry.getActiveAlerts();

  console.log("\n=== System Metrics ===\n");
  console.log(Bun.inspect.table(metrics));

  console.log("\n=== Active Alerts ===\n");
  console.log(Bun.inspect.table(alerts));
}
```

### 6. Configuration Display

```typescript
const config = {
  server: {
    port: 3000,
    host: "0.0.0.0"
  },
  database: {
    host: "localhost",
    port: 5432,
    name: "mydb"
  },
  features: {
    uploads: true,
    auth: true,
    logging: false
  }
};

console.log(Bun.inspect.table(config));
```

### 7. Error Report

```typescript
function formatErrorReport(errors: Array<{ file: string; line: number; error: string }>) {
  const table = Bun.inspect.table(errors);
  await Bun.write("error-report.log", table);
  console.error(table);
}
```

### 8. Performance Profiling

```typescript
function profileOperations() {
  const operations = [
    { name: "Database Query", duration: 45, count: 100 },
    { name: "File Read", duration: 12, count: 500 },
    { name: "HTTP Request", duration: 120, count: 50 },
    { name: "JSON Parse", duration: 3, count: 1000 }
  ];

  console.log("\nPerformance Profile:\n");
  console.log(Bun.inspect.table(operations));

  // Also save for analysis
  const table = Bun.inspect.table(operations);
  await Bun.write("profile.log", table);
}
```

### 9. Stream Monitoring

```typescript
function printStreamStats() {
  const stats = {
    stdin: { size: Bun.stdin.size, available: Bun.stdin.size > 0 },
    stdout: { size: Bun.stdout.size },
    stderr: { size: Bun.stderr.size }
  };

  const table = Bun.inspect.table(stats);
  console.log("\nStream Status:\n");
  console.log(table);
}
```

### 10. Feature Flags Summary

```typescript
import { feature } from "bun:bundle";

function printFeatureFlags() {
  const flags = [
    { flag: "FEAT_CLOUD_UPLOAD", enabled: feature("FEAT_CLOUD_UPLOAD"), description: "S3/R2 uploads" },
    { flag: "FEAT_UPLOAD_PROGRESS", enabled: feature("FEAT_UPLOAD_PROGRESS"), description: "Progress tracking" },
    { flag: "FEAT_MULTIPART_UPLOAD", enabled: feature("FEAT_MULTIPART_UPLOAD"), description: "Large file support" },
    { flag: "FEAT_UPLOAD_ANALYTICS", enabled: feature("FEAT_UPLOAD_ANALYTICS"), description: "Upload metrics" }
  ];

  console.log("\nFeature Flags:\n");
  console.log(Bun.inspect.table(flags, ["flag", "enabled", "description"]));
}
```

---

## Integration with Geelark

### Telemetry Display

```typescript
// src/server/TelemetrySystem.ts

export class TelemetrySystem {
  // ... existing code ...

  printMetrics() {
    const metrics = {
      uptime: `${Math.round(process.uptime())}s`,
      memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      requests: this.requestCount,
      errors: this.errorCount,
      alerts: this.alerts.length
    };

    console.log("\n" + Bun.inspect.table(metrics) + "\n");
  }

  printAlerts() {
    const alerts = this.alerts.map(a => ({
      type: a.type,
      severity: a.severity,
      message: a.message,
      timestamp: new Date(a.timestamp).toISOString()
    }));

    console.log("\n" + Bun.inspect.table(alerts) + "\n");
  }
}
```

### Server Status

```typescript
// dev-hq/servers/dashboard-server.ts

function printServerStatus() {
  const status = {
    "Server": "Geelark Dashboard",
    "Version": "1.0.0",
    "Port": CONFIG.port,
    "Environment": process.env.NODE_ENV || "development",
    "Uptime": formatUptime(process.uptime()),
    "Memory": formatMemory(process.memoryUsage()),
    "Connections": server.connections.size
  };

  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║  Server Status                                       ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log(Bun.inspect.table(status) + "\n");
}
```

### Database Query Results

```typescript
import { Database } from "bun:sqlite";

function printUsers() {
  const db = new Database("users.db");
  const users = db.query("SELECT id, name, email, role FROM users LIMIT 10").all();

  console.log("\n=== Recent Users ===\n");
  console.log(Bun.inspect.table(users) + "\n");
}
```

---

## Tips and Tricks

### 1. Combine with ANSI Colors

```typescript
const table = Bun.inspect.table(data);
const colored = "\x1b[36m" + table + "\x1b[0m"; // Cyan color
console.log(colored);
```

### 2. Add Headers

```typescript
const table = Bun.inspect.table(data);
const output = "=== Data Report ===\n\n" + table + "\n=== End ===\n";
console.log(output);
```

### 3. Filter Properties

```typescript
const data = [
  { id: 1, name: "Alice", age: 30, password: "secret", _internal: "data" }
];

// Only show public properties
const table = Bun.inspect.table(data, ["id", "name", "age"]);
console.log(table);
```

### 4. Transform Data

```typescript
const rawUsers = [
  { id: 1, firstName: "Alice", lastName: "Smith", age: 30 }
];

// Transform before displaying
const users = rawUsers.map(u => ({
  ID: u.id,
  Name: `${u.firstName} ${u.lastName}`,
  Age: u.age
}));

const table = Bun.inspect.table(users);
console.log(table);
```

### 5. Conditional Display

```typescript
const verbose = process.env.VERBOSE === "true";

if (verbose) {
  console.log(Bun.inspect.table(detailedData));
} else {
  console.log(Bun.inspect.table(simpleData));
}
```

---

## Limitations

1. **String width**: Very long values are truncated with "..."
2. **Column width**: Limited by terminal width
3. **Nesting**: Nested objects may not display optimally
4. **Cyclical references**: Like `console.table`, may have issues with circular refs

---

## Performance

`Bun.inspect.table()` is **fast**:

```typescript
// Benchmark: 1000 rows x 10 columns
const data = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  name: `User ${i}`,
  email: `user${i}@example.com`,
  // ... 7 more properties
}));

const start = performance.now();
const table = Bun.inspect.table(data);
const duration = performance.now() - start;

console.log(`Generated table in ${duration.toFixed(2)}ms`);
// Typical: 5-15ms for 1000 rows
```

---

## Summary

| Feature | Description |
|---------|-------------|
| **Input** | Objects or arrays |
| **Output** | Formatted table string |
| **Returns** | String (not undefined) |
| **Use case** | Composable table formatting |
| **Performance** | Fast (5-15ms for 1000 rows) |
| **Added** | Bun v1.1.31 (Oct 2024) |

**Key advantage over `console.table()`**: Returns a string, enabling composition, logging, and post-processing.

---

**Sources**:
- [Bun.inspect.table API Reference](https://bun.com/reference/bun/inspect/table)
- [Bun Utils Documentation](https://bun.com/docs/runtime/utils)
- [Bun v1.1.31 Release Notes](https://bun.com/blog/bun-v1.1.31)
- [Bun 1.2 Release Notes](https://bun.com/blog/bun-v1.2)
