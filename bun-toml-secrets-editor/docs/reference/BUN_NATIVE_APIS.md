# 🚀 Bun-Native APIs Reference

Complete guide to Bun's native APIs for building high-performance CLI tools and servers.

## Table of Contents

- [Connection APIs](#connection-apis)
- [Security APIs](#security-apis)
- [File System APIs](#file-system-apis)
- [Process APIs](#process-apis)
- [Crypto APIs](#crypto-apis)
- [Utilities](#utilities)

---

## Connection APIs

### Bun.fetch() - HTTP Client

Bun's native `fetch()` implementation with enhanced features:

```typescript
// Basic request
const response = await fetch("https://api.example.com/data");
const data = await response.json();

// With all Bun-native options
const response = await fetch("https://api.example.com/data", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ key: "value" }),
  
  // Bun-specific options
  keepalive: true,           // Connection pooling
  compress: true,            // Request compression
});

// Timeout with AbortController
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

const response = await fetch(url, {
  signal: controller.signal,
});
```

### Bun.connect() - TCP Sockets

High-performance TCP socket connections:

```typescript
const socket = await Bun.connect({
  hostname: "api.example.com",
  port: 443,
  tls: true,  // Enable TLS
  
  socket: {
    data(socket, data) {
      // Handle incoming data (Uint8Array)
      console.log("Received:", Buffer.from(data).toString());
    },
    open(socket) {
      console.log("Connected!");
      socket.write("Hello Server!");
    },
    close(socket) {
      console.log("Disconnected");
    },
    error(socket, error) {
      console.error("Socket error:", error);
    },
    drain(socket) {
      // Socket is ready for more data
    },
  },
});

// Write data
socket.write(Buffer.from("Hello"));

// Close connection
socket.end();
```

### Bun.listen() - TCP Server

Create TCP servers:

```typescript
const server = Bun.listen({
  hostname: "0.0.0.0",
  port: 3000,
  
  socket: {
    data(socket, data) {
      // Echo server
      socket.write(data);
    },
    open(socket) {
      console.log("Client connected:", socket.remoteAddress);
    },
    close(socket) {
      console.log("Client disconnected");
    },
  },
});

// Stop server
server.stop();
```

### WebSocket Server (Bun.serve)

Native WebSocket upgrade in HTTP server:

```typescript
const server = Bun.serve<{ authToken: string }>({
  port: 3000,
  
  fetch(req, server) {
    const url = new URL(req.url);
    
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: { 
          authToken: url.searchParams.get("token") || "" 
        },
      });
      
      return upgraded 
        ? undefined  // Upgraded successfully
        : new Response("Upgrade failed", { status: 400 });
    }
    
    return new Response("Hello");
  },
  
  websocket: {
    open(ws) {
      console.log("Connected:", ws.data.authToken);
      ws.subscribe("room-1");
    },
    message(ws, message) {
      // Broadcast to all subscribers
      server.publish("room-1", message);
    },
    close(ws) {
      ws.unsubscribe("room-1");
    },
  },
});
```

---

## Security APIs

### Bun.password - Password Hashing

Secure password hashing with Argon2, bcrypt:

```typescript
// Hash password (uses Argon2id by default)
const hash = await Bun.password.hash("my-password", {
  algorithm: "argon2id",  // or "bcrypt"
  memoryCost: 65536,      // KB
  timeCost: 3,            // iterations
});

// Verify password
const isValid = await Bun.password.verify("my-password", hash);

// Use bcrypt instead
const bcryptHash = await Bun.password.hash("password", {
  algorithm: "bcrypt",
  cost: 10,
});
```

### Bun.serve() TLS

Built-in HTTPS support:

```typescript
Bun.serve({
  port: 443,
  tls: {
    key: Bun.file("/path/to/key.pem"),
    cert: Bun.file("/path/to/cert.pem"),
    // Or as strings
    key: await Bun.file("key.pem").text(),
    cert: await Bun.file("cert.pem").text(),
  },
  fetch(req) {
    return new Response("Secure!");
  },
});
```

### Bun.sha - Hashing

Fast hashing with hardware acceleration:

```typescript
const data = Buffer.from("Hello World");

// SHA-256
const hash256 = Bun.sha(data, "sha256");

// SHA-512
const hash512 = Bun.sha(data, "sha512");

// SHA-1
const hash1 = Bun.sha(data, "sha1");

// Blake2b
const hashBlake = Bun.sha(data, "blake2b256");
```

---

## File System APIs

### Bun.file() - File Operations

Lazy file reading with efficient memory usage:

```typescript
const file = Bun.file("/path/to/file.txt");

// Get file info
console.log(file.size);      // File size in bytes
console.log(file.type);      // MIME type
console.log(file.name);      // File name
console.log(file.lastModified); // Timestamp

// Read as text
const text = await file.text();

// Read as JSON
const json = await file.json();

// Read as ArrayBuffer
const buffer = await file.arrayBuffer();

// Read as bytes (Uint8Array)
const bytes = await file.bytes();

// Stream reading
for await (const chunk of file.stream()) {
  console.log(chunk); // Uint8Array
}
```

### Bun.write() - Fast File Writing

Write files efficiently:

```typescript
// Write string
await Bun.write("file.txt", "Hello World");

// Write Buffer
await Bun.write("file.bin", Buffer.from([1, 2, 3]));

// Write from Response
const response = await fetch("https://example.com/data");
await Bun.write("data.json", response);

// Write from another file
await Bun.write("copy.txt", Bun.file("original.txt"));

// Append to file
await Bun.write("log.txt", "New log entry\n", { append: true });

// Create parent directories
await Bun.write("dir/file.txt", "content", { createPath: true });
```

### Directory Operations

```typescript
// Scan directory
for await (const entry of Bun.file("./").stream()) {
  // Each entry is a file in the directory
}

// Using Bun.$ for shell operations
const files = await Bun.$`ls -la`.text();

// Check if file exists
const exists = await Bun.file("config.json").exists();
```

---

## Process APIs

### Bun.spawn() - Subprocess

Spawn processes with streaming:

```typescript
// Simple spawn
const proc = Bun.spawn(["ls", "-la"]);
await proc.exited;

// With options
const proc = Bun.spawn({
  cmd: ["node", "script.js"],
  cwd: "/project",
  env: { NODE_ENV: "production" },
  stdio: ["inherit", "pipe", "pipe"],
  onExit: (code, signal) => {
    console.log(`Process exited: ${code}`);
  },
});

// Capture output
const proc = Bun.spawn(["echo", "Hello"], {
  stdout: "pipe",
});
const output = await new Response(proc.stdout).text();

// Stream output
const proc = Bun.spawn(["tail", "-f", "log.txt"]);
for await (const chunk of proc.stdout) {
  console.log(Buffer.from(chunk).toString());
}
```

### Bun.which() - Find Executables

```typescript
// Find in PATH
const nodePath = Bun.which("node");
// => "/usr/local/bin/node"

// Find with custom PATH
const customPath = Bun.which("my-tool", {
  PATH: "/custom/bin:/usr/bin",
});
```

### Bun.argv - Command Line Arguments

```typescript
// Get CLI arguments
const args = Bun.argv;
// ["bun", "script.ts", "--flag", "value"]

// Using util.parseArgs
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

### Bun.env - Environment Variables

```typescript
// Access environment variables
const port = Bun.env.PORT || "3000";

// Set for current process
Bun.env.DEBUG = "true";

// Check if exists
if (Bun.env.API_KEY) {
  // Use API key
}
```

---

## Crypto APIs

### Random Values

```typescript
// Cryptographically secure random bytes
const bytes = new Uint8Array(32);
crypto.getRandomValues(bytes);

// Or using Bun APIs
const randomHex = Array.from(bytes, b => 
  b.toString(16).padStart(2, "0")
).join("");
```

### WebCrypto

```typescript
// Encrypt/Decrypt
const key = await crypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  true,
  ["encrypt", "decrypt"]
);

const iv = crypto.getRandomValues(new Uint8Array(12));
const encrypted = await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  key,
  new TextEncoder().encode("Secret message")
);
```

### JWT (with jose library)

```typescript
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode("your-secret");

// Sign
const token = await new SignJWT({ user: "admin" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("2h")
  .sign(secret);

// Verify
const { payload } = await jwtVerify(token, secret);
```

---

## Utilities

### Bun.sleep() - Async Delays

```typescript
// Sleep for milliseconds
await Bun.sleep(1000);  // 1 second

// Sleep until condition
while (!isReady()) {
  await Bun.sleep(100);
}
```

### Bun.CryptoHasher

```typescript
// Incremental hashing
const hasher = new Bun.CryptoHasher("sha256");
hasher.update("Hello ");
hasher.update("World");
const hash = hasher.digest("hex");
```

### Bun.deflate / Bun.gzip

```typescript
const data = Buffer.from("Large text content...");

// Compress
const compressed = Bun.gzipSync(data);
const deflated = Bun.deflateSync(data);

// Decompress
const decompressed = Bun.gunzipSync(compressed);
const inflated = Bun.inflateSync(deflated);
```

### Bun.peek - Synchronous Promise Check

```typescript
const promise = fetchData();

// Check if resolved without awaiting
const result = Bun.peek(promise);

if (result !== promise) {
  // Already resolved
  console.log("Result:", result);
} else {
  // Still pending
  console.log("Still loading...");
}
```

### Bun.version

```typescript
console.log(Bun.version);  // "1.0.x"
console.log(Bun.revision); // Git commit hash
```

---

## Bundling & Compilation

### Bun.build()

```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "bun",        // or "node", "browser"
  format: "esm",        // or "cjs"
  splitting: true,
  sourcemap: "external",
  minify: true,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
```

### Compile to Binary

```bash
# Single executable
bun build ./index.ts --compile --outfile myapp

# With features
bun build ./index.ts --compile --feature INTERACTIVE --outfile myapp
```

---

## Testing (bun:test)

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";

describe("My Tests", () => {
  beforeAll(() => {
    // Setup
  });

  it("should work", () => {
    expect(1 + 1).toBe(2);
  });

  it("async test", async () => {
    const result = await fetchData();
    expect(result).toBeDefined();
  });

  afterAll(() => {
    // Cleanup
  });
});
```

---

## Performance Tips

1. **Use `Bun.write()` for files** - Faster than Node.js fs
2. **Use `Bun.file()` for reading** - Lazy and memory-efficient
3. **Enable `keepalive`** in fetch for connection pooling
4. **Use `Bun.sha`** instead of crypto module for hashing
5. **Use `Bun.password`** for secure password hashing
6. **Use `Bun.spawn`** with streaming for large outputs
7. **Use `Bun.sleep`** instead of setTimeout for promises

---

## Examples

### HTTP Client with Retry

```typescript
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { keepalive: true });
      if (response.ok) return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await Bun.sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  throw new Error("Max retries exceeded");
}
```

### File Watcher

```typescript
const watcher = Bun.watch("./src", { recursive: true });

for await (const event of watcher) {
  console.log(`File changed: ${event.filename}`);
  // Reload or rebuild
}
```

### Stream Processing

```typescript
const file = Bun.file("large-file.txt");

for await (const chunk of file.stream()) {
  const text = Buffer.from(chunk).toString();
  // Process chunk
}
```

---

## Resources

- [Bun Documentation](https://bun.com/docs)
- [Bun GitHub](https://github.com/oven-sh/bun)
- [API Reference](https://bun.com/docs/api/http)
