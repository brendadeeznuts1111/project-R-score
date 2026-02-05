# 🚀 Bun-Native API Cheat Sheet

Quick reference for the most important Bun-native APIs used in this codebase.

## 🔌 Connection APIs

### HTTP Client (Bun.fetch)
```typescript
// Basic request with connection pooling
const response = await fetch("https://api.example.com/data", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
  keepalive: true,           // Connection pooling
  compress: true,            // Request compression
});

// With timeout and retry
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000);

const response = await fetch(url, {
  signal: controller.signal,
  keepalive: true,
});
```

### TCP Sockets (Bun.connect)
```typescript
const socket = await Bun.connect({
  hostname: "api.example.com",
  port: 443,
  tls: true,
  
  socket: {
    data(socket, data) {
      console.log("Received:", Buffer.from(data).toString());
    },
    open(socket) {
      socket.write("Hello Server!");
    },
    close(socket) {
      console.log("Disconnected");
    },
  },
});
```

### WebSocket Server (Bun.serve)
```typescript
const server = Bun.serve({
  port: 3000,
  
  fetch(req, server) {
    if (req.url.endsWith("/ws")) {
      const upgraded = server.upgrade(req, {
        data: { user: "authenticated" },
      });
      return upgraded ? undefined : new Response("Upgrade failed", { status: 400 });
    }
    return new Response("Hello");
  },
  
  websocket: {
    open(ws) {
      ws.subscribe("room-1");
    },
    message(ws, message) {
      server.publish("room-1", message);
    },
  },
});
```

## 🔐 Security APIs

### Password Hashing (Bun.password)
```typescript
// Hash with Argon2id
const hash = await Bun.password.hash("password", {
  algorithm: "argon2id",
  memoryCost: 65536,
  timeCost: 3,
});

// Verify password
const isValid = await Bun.password.verify("password", hash);
```

### Secure Storage (Bun.secrets)
```typescript
// Store secret
await Bun.secrets.set("service:api_key", "secret-value");

// Retrieve secret
const apiKey = await Bun.secrets.get("service:api_key");
```

### Hashing (Bun.sha)
```typescript
const data = Buffer.from("Hello World");

// SHA-256
const hash = Bun.sha(data, "sha256");

// SHA-512
const hash512 = Bun.sha(data, "sha512");
```

## 📁 File System APIs

### Fast File Reading (Bun.file)
```typescript
const file = Bun.file("config/secrets.toml");

// Read as text
const content = await file.text();

// Read as JSON
const json = await file.json();

// Stream large files
for await (const chunk of file.stream()) {
  // Process chunk
}
```

### Fast File Writing (Bun.write)
```typescript
// Write string
await Bun.write("output.txt", "Hello World");

// Write with compression
await Bun.write("backup.tar.gz", Bun.gzipSync(content));

// Append to file
await Bun.write("log.txt", "New entry\n", { append: true });
```

### Directory Operations
```typescript
// Create directories
await Bun.$`mkdir -p src dist`;

// List files
const files = await Bun.$`ls -la`.text();

// Check if file exists
const exists = await Bun.file("config.json").exists();
```

## 🔄 Process APIs

### Subprocess (Bun.spawn)
```typescript
// Simple spawn
const proc = Bun.spawn(["node", "script.js"]);

// With options
const proc = Bun.spawn({
  cmd: ["npm", "run", "build"],
  stdout: "pipe",
  stderr: "pipe",
  onExit: (code) => console.log(`Exit: ${code}`),
});

// Capture output
const output = await new Response(proc.stdout).text();
```

### Shell Commands (Bun.$)
```typescript
// Execute command
const result = await Bun.$`git status`.text();

// With environment
const build = await Bun.$`npm run build`.env({
  NODE_ENV: "production",
});

// Check executable
const nodePath = Bun.which("node");
```

## 🎯 Performance Patterns

### SIMD-Accelerated Pattern Matching
```typescript
// Fast pattern detection with CRC32
const dangerousHashes = new Set([
  Bun.hash.crc32("PASSWORD"),
  Bun.hash.crc32("TOKEN"),
  Bun.hash.crc32("SECRET"),
]);

const dangerousSecrets = secrets.filter(s => 
  dangerousHashes.has(Bun.hash.crc32(s.name))
);
```

### Connection Pooling
```typescript
const http = Connections.http("https://api.example.com", {
  maxConnections: 50,
  keepAliveMs: 120000,
  enableHttp2: true,
  compression: true,
});
```

### Memory-Efficient Operations
```typescript
// Lazy file reading
const file = Bun.file("large-file.json");
const json = await file.json(); // Only loads when accessed

// Streaming for large data
for await (const chunk of file.stream()) {
  // Process in chunks
}
```

## 🛠️ Utilities

### Async Delays (Bun.sleep)
```typescript
// Sleep for milliseconds
await Bun.sleep(1000);

// Wait for condition
while (!isReady()) {
  await Bun.sleep(100);
}
```

### Command Line Args (util.parseArgs)
```typescript
import { parseArgs } from "util";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    port: { type: "string", short: "p" },
    verbose: { type: "boolean", short: "v" },
  },
  allowPositionals: true,
});
```

### Environment Variables (Bun.env)
```typescript
// Access environment
const port = Bun.env.PORT || "3000";

// Set environment
Bun.env.DEBUG = "true";

// Check availability
if (Bun.env.API_KEY) {
  // Use API key
}
```

## 🚀 Build & Deployment

### Compile to Binary
```bash
# Single executable
bun build ./index.ts --compile --outfile myapp

# With features
bun build ./index.ts --compile --feature INTERACTIVE --outfile myapp

# Cross-platform
bun build ./index.ts --compile --target bun --outfile app
```

### Bundle Configuration
```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "bun",
  format: "esm",
  splitting: true,
  sourcemap: "external",
  minify: true,
});
```

## 📊 Monitoring & Metrics

### Connection Metrics
```typescript
const metrics = http.getMetrics();
console.log({
  requestsTotal: metrics.requestsTotal,
  avgLatencyMs: metrics.avgLatencyMs,
  retryCount: metrics.retryCount,
});
```

### Performance Timing
```typescript
const start = performance.now();
// ... operation
const duration = performance.now() - start;
console.log(`Operation took ${duration.toFixed(2)}ms`);
```

## 🔧 Error Handling

### Network Errors with Retry
```typescript
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, { keepalive: true });
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await Bun.sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

### File Operation Errors
```typescript
try {
  const content = await Bun.file("config.json").text();
} catch (error) {
  if (error instanceof Error && error.message.includes("ENOENT")) {
    console.log("File not found");
  }
}
```

## 🎯 Quick Commands

```bash
# Run TypeScript directly
bun run script.ts

# Development with hot reload
bun --watch server.ts

# Test with Bun
bun test

# Build for production
bun build ./src/main.ts --compile --outfile app

# Install dependencies
bun install

# Run with environment
bun run --env NODE_ENV=production server.ts
```

---

**Tip**: Use `Bun.version` to check your Bun version and ensure API compatibility.