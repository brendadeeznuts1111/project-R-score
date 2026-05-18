# 🚀 Bun-Native Integration Guide

Complete guide for integrating Bun-native APIs into your projects for maximum performance and security.

## 📋 Overview

This guide covers the three core components of the Bun-native codebase:

1. **TOML Secrets Editor** - Secure configuration management
2. **DuoPlus CLI** - Cloud phone device management  
3. **Project Scaffolding** - Modern project initialization

## 🎯 Quick Start

### 1. TOML Secrets Management

```typescript
import { TomlSecretsEditor } from "./src/services/toml-secrets-editor";

// Initialize editor
const editor = new TomlSecretsEditor("config/secrets.toml", {
  syncWithBunSecrets: true,
  cacheDb: ":memory:",
});

// Edit secrets with security validation
const result = await editor.edit({
  "database.password": {
    value: "${DB_PASSWORD:default123}",
    metadata: { riskLevel: "high" },
  },
});

console.log(`Risk Score: ${result.riskScore}/100`);
```

### 2. DuoPlus Device Management

```typescript
import { DuoPlusNativeClient } from "./src/cli/duoplus-cli-native";

// Initialize with API key
const client = new DuoPlusNativeClient({
  baseUrl: "https://www.duoplus.cloud",
});

await client.login("your-api-key");

// List devices
const devices = await client.listDevices();
console.log(`Found ${devices.length} devices`);

// Execute ADB command
const output = await client.executeAdb("device-id", "shell getprop ro.product.model");
console.log(output);
```

### 3. Project Scaffolding

```typescript
import { BunProjectCreator } from "./src/cli/bun-init-cli";

const creator = new BunProjectCreator();

// Create CLI project
await creator.create("cli", "my-awesome-cli");

// Create API server
await creator.create("api", "my-api-server");

// Create WebSocket server
await creator.create("websocket", "my-ws-server");
```

## 🔌 Connection Management

### HTTP Client with Connection Pooling

```typescript
import { Connections } from "./src/utils/bun-connections";

// Create HTTP client with Bun.fetch
const http = Connections.http("https://api.example.com", {
  maxConnections: 20,
  keepAliveMs: 60000,
  enableHttp2: true,
  compression: true,
});

// Make requests with automatic retry
const response = await http.get("/data", {
  retry: { maxRetries: 3, initialDelayMs: 100 },
  timeoutMs: 10000,
});
```

### TCP Socket Connections

```typescript
import { BunTcpClient } from "./src/utils/bun-connections";

const tcp = new BunTcpClient({
  hostname: "api.example.com",
  port: 443,
  tls: true,
  timeoutMs: 5000,
});

await tcp.connect();
const response = await tcp.send("Hello Server");
console.log(response.toString());
```

### WebSocket with Real-time Updates

```typescript
import { BunWebSocketClient } from "./src/utils/bun-connections";

const ws = new BunWebSocketClient("wss://api.example.com/ws", {
  autoReconnect: true,
  heartbeatMs: 30000,
});

await ws.connect();

// Listen for messages
ws.on("message", (data) => {
  console.log("Received:", data);
});

// Send message
ws.send({ type: "ping", timestamp: Date.now() });
```

## 🔐 Security Patterns

### Secure Credential Storage

```typescript
import { BunSecretsManager } from "./src/cli/duoplus-cli-native";

const secrets = new BunSecretsManager();

// Store API key securely
await secrets.storeApiKey("your-api-key");

// Retrieve securely
const apiKey = await secrets.getApiKey();
```

### Password Hashing

```typescript
// Hash password with Argon2
const hash = await Bun.password.hash("user-password", {
  algorithm: "argon2id",
  memoryCost: 65536,
  timeCost: 3,
});

// Verify password
const isValid = await Bun.password.verify("user-password", hash);
```

### Secret Validation

```typescript
import { SecurityValidator } from "./src/services/security-validator";

const validator = new SecurityValidator();

// Validate TOML secrets
const result = validator.validateToml(tomlData, "config/secrets.toml");
console.log(`Risk Score: ${result.riskScore}/100`);

// SIMD-accelerated dangerous secret detection
const dangerous = validator.scanDangerousSecrets(secrets);
```

## 📁 File Operations

### Fast File Reading/Writing

```typescript
// Read file efficiently
const file = Bun.file("config/secrets.toml");
const content = await file.text();

// Write with compression
await Bun.write("backup.tar.gz", Bun.gzipSync(content));

// Stream large files
for await (const chunk of file.stream()) {
  // Process chunk
}
```

### Project File Creation

```typescript
// Create project files
await Bun.write("package.json", JSON.stringify({
  name: "my-project",
  version: "1.0.0",
  scripts: {
    start: "bun run index.ts",
  },
}));

// Create directories
await Bun.$`mkdir -p src dist`;
```

## 🔄 Process Management

### Subprocess Execution

```typescript
import { ProcessManager } from "./src/utils/process-manager";

const pm = new ProcessManager();

// Spawn process with streaming
const proc = await pm.spawn(["node", "script.js"], {
  stdout: "pipe",
  stderr: "pipe",
});

// Stream output
for await (const chunk of proc.stdout) {
  console.log(Buffer.from(chunk).toString());
}

// Wait for completion
const exitCode = await proc.exited;
```

### Shell Command Execution

```typescript
// Execute shell commands
const result = await Bun.$`git status`.text();
console.log(result);

// With environment variables
const build = await Bun.$`npm run build`.env({
  NODE_ENV: "production",
});
```

## 📊 Performance Optimization

### Connection Pooling

```typescript
// HTTP client with connection pooling
const http = Connections.http("https://api.example.com", {
  maxConnections: 50,        // Max concurrent connections
  keepAliveMs: 120000,       // Keep connections alive
  enableHttp2: true,         // Use HTTP/2
  compression: true,         // Enable compression
});
```

### SIMD-Accelerated Processing

```typescript
// Fast pattern matching with CRC32
const patternHashes = new Set([
  Bun.hash.crc32("PASSWORD"),
  Bun.hash.crc32("TOKEN"),
  Bun.hash.crc32("SECRET"),
]);

const dangerousSecrets = secrets.filter(s => 
  patternHashes.has(Bun.hash.crc32(s.name))
);
```

### Memory-Efficient File Operations

```typescript
// Lazy file reading
const file = Bun.file("large-file.json");
const json = await file.json(); // Only loads when accessed

// Streaming for large files
for await (const chunk of file.stream()) {
  // Process in chunks
}
```

## 🚀 Deployment & Build

### Compile to Binary

```bash
# Build CLI tool as binary
bun build ./src/cli/duoplus-cli-native.ts --compile --outfile duoplus

# Build with features
bun build ./src/main.ts --compile --feature INTERACTIVE --outfile app

# Cross-platform builds
bun build ./src/main.ts --compile --target bun --outfile app
```

### Docker Integration

```dockerfile
FROM oven/bun:1.3.7

WORKDIR /app
COPY . .
RUN bun install

# Build for production
RUN bun build ./src/main.ts --compile --outfile app

EXPOSE 3000
CMD ["./app"]
```

### CI/CD Integration

```yaml
# .github/workflows/build.yml
name: Build & Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      - run: bun build ./src/main.ts --compile --outfile app
```

## 🔧 Configuration

### Environment Variables

```bash
# TOML Secrets
DUOPLUS_API_TOKEN=your-api-key
DUOPLUS_ENV=production
LOG_LEVEL=info

# Connection Settings
HTTP_TIMEOUT_MS=30000
MAX_CONNECTIONS=50
ENABLE_HTTP2=true

# Security
SECRET_ROTATION_DAYS=90
ENFORCE_HTTPS=true
```

### TOML Configuration

```toml
# config/secrets.toml
[database]
host = "${DB_HOST:localhost}"
port = "${DB_PORT:5432}"
password = "${DB_PASSWORD:}"  # Required secret

[api]
token = "${API_TOKEN:}"       # Required secret
timeout = 30000

[monitoring]
enabled = true
interval = 60000
```

## 🐛 Troubleshooting

### Common Issues

1. **Bun.secrets not available**
   ```typescript
   // Check availability
   if (typeof Bun !== "undefined" && "secrets" in Bun) {
     // Use Bun.secrets
   } else {
     // Fallback to environment variables
   }
   ```

2. **Connection timeouts**
   ```typescript
   const http = Connections.http("https://api.example.com", {
     connectTimeoutMs: 10000,
     requestTimeoutMs: 30000,
   });
   ```

3. **File permission errors**
   ```typescript
   // Ensure directory exists
   await Bun.$`mkdir -p ${dirname(filePath)}`;
   await Bun.write(filePath, content);
   ```

### Debug Mode

```typescript
// Enable debug logging
Bun.env.DEBUG = "true";

// Connection metrics
const metrics = http.getMetrics();
console.log("Connection stats:", metrics);
```

## 📚 API Reference

### Core Classes

- `TomlSecretsEditor` - TOML secrets management
- `DuoPlusNativeClient` - DuoPlus API client
- `BunProjectCreator` - Project scaffolding
- `SecurityValidator` - Security validation
- `BunHttpClient` - HTTP client with pooling
- `BunTcpClient` - TCP socket client
- `BunWebSocketClient` - WebSocket client

### Utility Classes

- `ProcessManager` - Process management
- `ProgressIndicator` - CLI progress display
- `TableFormatter` - Tabular output formatting
- `AuditLogger` - Security audit logging

### Bun-Native APIs

- `Bun.fetch()` - HTTP client with pooling
- `Bun.connect()` - TCP socket connections
- `Bun.serve()` - HTTP/WebSocket server
- `Bun.secrets` - Secure credential storage
- `Bun.password` - Password hashing
- `Bun.file()` - Efficient file operations
- `Bun.write()` - Fast file writing
- `Bun.spawn()` - Subprocess management

## 🎯 Best Practices

1. **Use connection pooling** for HTTP clients
2. **Enable keepalive** for persistent connections
3. **Use Bun.secrets** for credential storage when available
4. **Implement retry logic** for network operations
5. **Validate secrets** before processing
6. **Monitor connection metrics** for performance
7. **Use streaming** for large file operations
8. **Compile to binary** for production deployment

## 🔄 Migration Guide

### From Node.js to Bun

```typescript
// Node.js
import fs from "fs/promises";
import fetch from "node-fetch";

// Bun-native
const file = Bun.file("data.json");
const content = await file.text();

const response = await fetch("https://api.example.com/data");
```

### From Express to Bun.serve

```typescript
// Express
import express from "express";
const app = express();
app.get("/", (req, res) => res.json({ hello: "world" }));

// Bun-native
Bun.serve({
  port: 3000,
  fetch(req) {
    return Response.json({ hello: "world" });
  },
});
```

## 📈 Performance Benchmarks

- **HTTP requests**: 2-3x faster than Node.js
- **File I/O**: 5-10x faster than fs/promises
- **Password hashing**: Hardware-accelerated
- **Connection pooling**: Automatic with keepalive
- **Memory usage**: 50% less than Node.js

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure Bun-native APIs are used
5. Update documentation
6. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This guide assumes Bun 1.3.7+ for full feature support. Some APIs may not be available in earlier versions.