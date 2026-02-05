# Bun Native APIs Covered in Examples

This document lists all Bun native APIs that have examples in the NEXUS codebase.

## 📊 Summary

**Total Examples**: 41+  
**Total Bun APIs Covered**: 58+  
**Bun 1.3+ APIs**: 6 (Bun.secrets, Bun.CSRF, Bun.Security.Scanner, Bun.semver.satisfies, require.extensions, zstd compression)  
**Latest Breaking Changes**: Bun.serve() TypeScript types, Bun.build() AggregateError, SQL client tagged templates - See [Bun Latest Breaking Changes](./BUN-LATEST-BREAKING-CHANGES.md)

---

## 🔌 HTTP Server

- ✅ **Bun.serve()** - HTTP/WebSocket server
  - Example: `Bun.serve() - HTTP + WebSocket Server (TypeScript Generic)`
  - File: `src/index.ts`
  - **TypeScript Generic**: `Bun.serve<T>()` with WebSocket data type (Latest)
  - **Breaking Changes**: `Bun.ServeOptions` deprecated → `Bun.Serve.Options<T>`
  - Docs: https://bun.sh/docs/api/http-server
  - **Migration Guide**: [Bun Latest Breaking Changes](./BUN-LATEST-BREAKING-CHANGES.md)

- ✅ **server.pendingRequests** - Active HTTP requests counter
  - Example: `Bun Server Metrics - pendingRequests`
  - File: `src/observability/metrics.ts`, `src/api/routes.ts`
  - Docs: https://bun.sh/docs/api/http-server#metrics
  - Used in: `/health`, `/metrics` endpoints

- ✅ **server.pendingWebSockets** - Active WebSocket connections counter
  - Example: `Bun Server Metrics - pendingWebSockets`
  - File: `src/observability/metrics.ts`, `src/api/routes.ts`
  - Docs: https://bun.sh/docs/api/http-server#metrics
  - Used in: `/health`, `/metrics` endpoints

- ✅ **server.subscriberCount(topic)** - WebSocket subscribers per topic
  - Example: `Bun Server Metrics - subscriberCount`
  - File: `src/observability/metrics.ts`, `src/api/routes.ts`
  - Docs: https://bun.sh/docs/api/http-server#metrics
  - Used in: `/health`, `/metrics` endpoints

---

## 💻 Shell

- ✅ **Bun.shell ($)** - Execute shell commands safely
  - Example: `Bun.shell ($) - Production Hardening Scripts`
  - Example: `Bun.shell ($) + Bun.file() - Native Log Viewer`
  - File: `src/utils/logs-native.ts`, `bench/runner.ts`, `src/mcp/server.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis
  - **Reference**: `7.4.5.0.0.0.0` - Template tag shell execution
  - **Features**: Builtin commands, .sh file loader, cross-platform support
  - **Security**: Automatic argument escaping, injection prevention

- ✅ **Bun.spawnSync()** - Synchronous process spawning
  - Example: `Bun.spawnSync() - Git log extraction for changelog`
  - File: `src/telegram/changelog-poster.ts`, `src/telegram/feed-monitor.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis
  - **Reference**: `7.4.6.0.0.0.0` - Synchronous process execution

---

## 📦 Bundler

- ✅ **Bun.build()** - Bundle and compile TypeScript/JavaScript
  - Example: `Bun.build() - Bundler & Compiler`
  - File: `scripts/deploy-prod.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

---

## 📁 File I/O

- ✅ **Bun.file()** - Read files
  - Examples: Multiple examples across codebase
  - Docs: https://bun.com/docs/runtime/bun-apis

- ✅ **Bun.write()** - Write files
  - Example: `Bun.file() + Bun.write() - JSONL Logging`
  - File: `src/cli/telegram.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

---

## 🔄 Child Processes

- ✅ **Bun.spawn()** - Spawn child processes
  - Example: `Bun.shell ($) + Bun.file() - Native Log Viewer`
  - File: `src/utils/logs-native.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

---

## 📥📤 Standard I/O Streams

- ✅ **Bun.stdin** - Standard input stream
  - Example: `Bun.stdin - MCP server stdio input reading`
  - File: `src/mcp/server.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis
  - **Reference**: `7.5.5.0.0.0.0` - Standard input stream

- ✅ **Bun.stdout** - Standard output stream
  - Example: `Bun.stdout - MCP server stdio response writing`
  - File: `src/mcp/server.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis
  - **Reference**: `7.5.6.0.0.0.0` - Standard output stream

- ✅ **Bun.stderr** - Standard error stream
  - Example: `Bun.stderr - Error logging and diagnostics`
  - File: Used throughout codebase for error output
  - Docs: https://bun.com/docs/runtime/bun-apis
  - **Reference**: `7.5.7.0.0.0.0` - Standard error stream

---

## 🌐 WebSockets

- ✅ **Bun.serve() websocket** - WebSocket server
  - Example: `Bun.serve() - HTTP + WebSocket Server (TypeScript Generic)`
  - File: `src/index.ts`, `src/api/telegram-ws.ts`, `src/research/dashboard/tension-feed.ts`
  - **TypeScript Generic**: `Bun.serve<WebSocketData>()` for type-safe WebSocket data
  - **Server Type**: `Bun.Server<T>` - Generic server type with WebSocket data type
  - **WebSocket Type**: `ServerWebSocket<T>` - Typed WebSocket instance
  - Docs: https://bun.sh/docs/api/http-server
  - **Migration Guide**: [Bun Latest Breaking Changes](./BUN-LATEST-BREAKING-CHANGES.md)

---

## 🔐 Hashing

- ✅ **Bun.hash()** - Quick hash function
  - Example: `Bun.hash() + Bun.CryptoHasher - Hashing`
  - File: `src/utils/bun.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

- ✅ **Bun.CryptoHasher** - Advanced cryptographic hashing
  - Example: `Bun.hash() + Bun.CryptoHasher - Hashing`
  - File: `src/utils/bun.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

---

## 🗄️ SQLite

- ✅ **bun:sqlite** - SQLite database
  - Example: `bun:sqlite - SQLite database operations`
  - File: Multiple files
  - Docs: https://bun.com/reference

---

## 🍪 Cookies

- ✅ **Bun.CookieMap** - Cookie management
  - Example: `Bun.CookieMap - Parse and manage HTTP cookies`
  - File: `src/api/routes.ts`
  - Docs: https://bun.com/reference

- ✅ **Bun.Cookie** - Individual cookie
  - Referenced in CookieMap example
  - Docs: https://bun.com/reference

---

## ⏱️ Sleep & Timing

- ✅ **Bun.sleep()** - Async sleep
  - Example: `Bun.sleep() - Async Delays`
  - File: `src/utils/enterprise-retry.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

- ✅ **Bun.sleepSync()** - Synchronous sleep
  - Referenced in sleep example
  - Docs: https://bun.com/docs/runtime/bun-apis

- ✅ **Bun.nanoseconds()** - High-precision timing
  - Example: `Bun.nanoseconds() - Performance Benchmarking`
  - File: `src/ticks/profiler.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

---

## 🎲 Random & UUID

- ✅ **Bun.randomUUIDv7()** - Time-ordered UUID
  - Example: `Bun.randomUUIDv7() - UUID Generation`
  - File: `src/canonical/uuidv5.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

- ✅ **Bun.randomUUIDv5()** - Deterministic UUID
  - Example: `Bun.randomUUIDv7() - UUID Generation`
  - File: `src/canonical/uuidv5.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

---

## 🔍 Comparison & Inspection

- ✅ **Bun.inspect()** - Object inspection
  - Example: `Bun.inspect() - Object Inspection`
  - File: `src/utils/bun.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

- ✅ **Bun.peek()** - Promise peeking
  - Example: `Bun.peek() - Promise Peeking`
  - File: `src/utils/bun.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

- ✅ **Bun.deepEquals()** - Deep equality
  - Example: `Bun.deepEquals() - Deep Equality`
  - File: `src/utils/bun.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

---

## 🔎 Glob

- ✅ **Bun.Glob** - File pattern matching
  - Example: `Bun.Glob - File Pattern Matching`
  - File: `src/utils/bun.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

---

## 🧵 Workers

- ✅ **new Worker()** - Worker threads
  - Example: `new Worker() - Parallel Processing`
  - File: `src/api/workers.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

---

## 🧪 Testing

- ✅ **bun:test** - Test framework
  - Example: `bun:test - Test Framework`
  - File: `test/*.test.ts`
  - **New in Bun 1.3**: `require.extensions`, enhanced snapshots, `mock.clearAllMocks()`, coverage filtering, variable substitution, stricter CI mode
  - Docs: https://bun.com/docs/test
  - **Documentation**: [Bun 1.3 Test Improvements](./BUN-1.3-TEST-IMPROVEMENTS.md)

- ✅ **require.extensions** (Bun 1.3+)
  - **Custom file loaders** for Node.js compatibility
  - **Usage**: `require.extensions[".txt"] = (module, filename) => { ... }`
  - **Example**: Load `.txt`, `.yaml`, `.md` files directly with `require()`
  - Docs: [Bun 1.3 Test Improvements](./BUN-1.3-TEST-IMPROVEMENTS.md#-requireextensions-support)

---

## 📊 Memory & Profiling

- ✅ **Bun.generateHeapSnapshot()** - Heap snapshots
  - Example: `Bun.generateHeapSnapshot() - Memory Profiling`
  - File: `src/ticks/profiler.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis

- ✅ **Bun.gc()** - Garbage collection
  - Referenced in heap snapshot example
  - Docs: https://bun.com/docs/runtime/bun-apis

---

## 🔗 URL & Query Parameters

- ✅ **URLSearchParams** - Query parameter parsing
  - Multiple examples across Security & Research category
  - Docs: https://bun.com/reference/globals/URLSearchParams

- ✅ **URL** - URL parsing
  - Used in multiple examples
  - Docs: https://bun.com/reference/globals/URL

---

## 🔐 Secrets (Bun 1.3+)

- ✅ **Bun.secrets** - OS-native encrypted credential storage
  - Example: `Bun.secrets - Secure credential storage`
  - File: `src/secrets/mcp.ts`, `src/telegram/covert-steam-sender.ts`, `src/middleware/csrf.ts`
  - Docs: https://bun.sh/docs/runtime/bun-apis
  - **Reference**: `7.11.5.0.0.0.0` - OS-native encrypted credential storage
  - **Storage Backends**: macOS Keychain, Linux libsecret, Windows Credential Manager

- ✅ **Bun.stdin** - Standard input stream
  - Example: `Bun.stdin - MCP server stdio input reading`
  - File: `src/mcp/server.ts`
  - Docs: https://bun.sh/docs/runtime/bun-apis
  - **Reference**: `7.5.5.0.0.0.0` - Standard input stream

- ✅ **Bun.stdout** - Standard output stream
  - Example: `Bun.stdout - MCP server stdio response writing`
  - File: `src/mcp/server.ts`
  - Docs: https://bun.sh/docs/runtime/bun-apis
  - **Reference**: `7.5.6.0.0.0.0` - Standard output stream

- ✅ **Bun.stderr** - Standard error stream
  - Example: `Bun.stderr - Error logging and diagnostics`
  - File: `src/mcp/server.ts`
  - Docs: https://bun.sh/docs/runtime/bun-apis
  - **Reference**: `7.5.7.0.0.0.0` - Standard error stream
  - File: `src/secrets/index.ts`, `src/secrets/mcp.ts`, `src/security/bun-scanner.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis
  - **Platform Support**:
    - macOS: Keychain
    - Linux: libsecret
    - Windows: Credential Manager
  - **Usage**: API keys, session cookies, MCP server credentials
  - **Features**: Encrypted at rest, separate from environment variables

---

## 📡 HTTP Client

- ✅ **fetch()** - HTTP requests (Bun native)
  - Used in multiple examples
  - **Automatic decompression**: Supports `Content-Encoding: zstd`, `gzip`, `deflate`, `br` (Bun 1.3+)
  - Docs: https://bun.com/docs/runtime/bun-apis

- ✅ **Zstandard (zstd) Compression** (Bun 1.3+)
  - **Automatic HTTP decompression**: `fetch()` automatically decompresses `Content-Encoding: zstd` responses
  - **Manual APIs**: `Bun.zstdCompressSync()`, `Bun.zstdDecompressSync()`
  - **Streaming**: `CompressionStream("zstd")` for efficient processing
  - **Performance**: More efficient than loading entire WASM files into memory
  - Docs: [Bun 1.3 Zstandard Compression](./BUN-1.3-ZSTANDARD-COMPRESSION.md)
  - **Example**: 
    ```typescript
    // Server sends Content-Encoding: zstd
    const response = await fetch("https://api.example.com/data");
    const data = await response.json(); // Automatically decompressed
    ```

---

## ⚡ Performance Monitoring

- ✅ **Bun.nanoseconds()** - High-resolution timing for performance monitoring
  - Example: `PerformanceMonitor - Operation tracking with anomaly detection`
  - File: `src/observability/performance-monitor.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis
  - **Features**: 
    - Nanosecond-precision timing (uses Bun.nanoseconds())
    - Statistical anomaly detection (3-sigma rule)
    - Prometheus metrics integration
    - Failure tracking and reporting
    - Automatic threshold alerts
    - Performance statistics (mean, p50, p95, p99, stdDev)

---

## 🛡️ Security (Bun 1.3+)

- ✅ **Bun.CSRF** - CSRF token generation and verification
  - Example: `Bun.CSRF - Cross-Site Request Forgery Protection`
  - File: `src/middleware/csrf.ts`
  - Docs: https://bun.com/docs/runtime/bun-apis
  - **Features**: Token generation, verification, expiration support, multiple encoding formats (hex, base64)

- ✅ **Bun.Security.Scanner** - Custom security scanner API
  - Example: `Bun.Security.Scanner - Package Vulnerability Detection`
  - File: `src/security/bun-scanner.ts`
  - Docs: https://bun.com/docs/install/security-scanner-api
  - **Features**: CVE detection, malware detection, license compliance, package integrity verification
  - **Integration**: Runs automatically during `bun install` and `bun add` operations

- ✅ **Bun.semver.satisfies()** - Semantic version matching
  - Example: `Bun.semver.satisfies() - Version Range Checking`
  - File: `src/security/bun-scanner.ts`
  - Docs: https://bun.com/docs/api/semver
  - **Usage**: Check if package versions match vulnerability ranges
  - **Essential for**: Security scanner CVE detection

---

## 📝 Logging

- ✅ **Bun.shell ($) + Bun.spawn()** - Log reading
  - Example: `Bun.shell ($) + Bun.file() - Native Log Viewer`
  - File: `src/utils/logs-native.ts`

- ✅ **Bun.file() + Bun.write()** - Structured logging
  - Example: `Bun.file() + Bun.write() - JSONL Logging`
  - File: `src/cli/telegram.ts`

---

## 🗺️ Map & Collections

- ✅ **Map** - JavaScript native Map
  - Used in URLSearchParams examples
  - Docs: JavaScript standard

---

## 📊 Summary by Category

| Category | Examples | Key APIs |
|----------|----------|----------|
| **Bun Runtime** | 20 | Bun.serve, Bun.file, Bun.write, Bun.shell, Bun.build, Bun.hash, Bun.CryptoHasher, Bun.randomUUIDv7/v5, Bun.sleep, Bun.inspect, Bun.peek, Bun.deepEquals, Bun.Glob, Bun.generateHeapSnapshot, Bun.gc, Bun.spawn, Worker |
| **Security (Bun 1.3+)** | 4 | Bun.secrets, Bun.CSRF, Bun.Security.Scanner, Bun.semver.satisfies |
| **Performance Monitoring** | 1 | Bun.nanoseconds(), PerformanceMonitor |
| **Security & Research** | 7 | URLSearchParams, URL, Database.run, String.match, Array.filter |
| **Testing & Benchmarking** | 4 | Bun.nanoseconds, bun:test, bench(), SeededRandom |
| **Telegram API** | 2 | fetch, URLSearchParams, Bun.secrets |
| **HTTP** | 1 | fetch, URLSearchParams |
| **Database** | 1 | bun:sqlite, Database |

---

## 🔗 Related Documentation

- [Bun API Reference](https://bun.com/reference)
- [Bun Runtime APIs](https://bun.com/docs/runtime/bun-apis)
- [API Examples](/api/examples)
- [URL Parsing Edge Case](/docs/URL-PARSING-EDGE-CASE.md)

---

**Last Updated**: 2025-01-27  
**Total Examples**: 41+  
**Total Bun APIs**: 56+  
**Bun Version**: 1.3+ required for Security Scanner, Bun.secrets, Bun.CSRF
