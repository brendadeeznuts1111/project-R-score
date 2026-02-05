---
title: Bun mcp documentation review
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Mcp Documentation Review
acceptEncoding: ""
acceptLanguage: ""
author: Sports Analytics Team
browser: ""
browserName: ""
browserVersion: ""
cacheControl: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
deprecated: false
deviceBrand: ""
deviceModel: ""
deviceType: ""
dns: ""
e_tag: ""
etag: ""
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
isBot: false
isMobile: false
os: ""
osName: ""
osVersion: ""
referer: ""
referrer: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags: []
usage: ""
user_agent: ""
userAgentRaw: ""
xff: []
xForwardedFor: []
---
# Bun Documentation Review via MCP

**Date**: 2025-11-14  
**MCP Servers**: Bun-Official, Bun-Docs-Local  
**Focus**: Bun v1.2.16+ features and performance optimizations

---

## 📚 Documentation Sources

### MCP Servers
- **Bun-Official** ✅ - Active and responding
- **Bun-Docs-Local** ⚠️ - Not connected

---

## 🔍 Key Findings

### 1. ReadableStream Methods (Bun v1.2.16)

**Direct Methods Available**:
- `ReadableStream.text()` - Consume stream as text
- `ReadableStream.json()` - Parse stream as JSON  
- `ReadableStream.bytes()` - Get stream as byte array
- `ReadableStream.blob()` - Create Blob from stream

**Usage**:
```typescript
const { stdout } = Bun.spawn({
  cmd: ["echo", '{"hello": "world"}'],
  stdout: "pipe",
});

// ✅ Direct method - no Response wrapper needed
const data = await stdout.json();
```

**Documentation Links**:
- [Convert ReadableStream to JSON](https://bun.com/docs/guides/streams/to-json)
- [Read a JSON file](https://bun.com/docs/guides/read-file/json)
- [Read a file as a string](https://bun.com/docs/guides/read-file/string)

**Status**: ✅ Already implemented in our codebase

---

### 2. WebSocket Server API

**Complete WebSocket Configuration**:
```typescript
Bun.serve({
  websocket: {
    // Event handlers
    message: (ws, message) => void,
    open?: (ws) => void,
    close?: (ws, code, reason) => void,
    error?: (ws, error) => void,
    drain?: (ws) => void,
    
    // Configuration options
    maxPayloadLength?: number,        // default: 16MB
    idleTimeout?: number,              // default: 120 seconds
    backpressureLimit?: number,       // default: 1MB
    closeOnBackpressureLimit?: boolean, // default: false
    sendPings?: boolean,              // default: true
    publishToSelf?: boolean,          // default: false
    
    // Compression (permessage-deflate)
    perMessageDeflate?: boolean | {
      compress?: boolean | Compressor,
      decompress?: boolean | Compressor,
    },
  },
});
```

**Compressor Options**:
- `"disable"`, `"shared"`, `"dedicated"`
- Size-based: `"3KB"`, `"4KB"`, `"8KB"`, `"16KB"`, `"32KB"`, `"64KB"`, `"128KB"`, `"256KB"`

**Server Methods**:
```typescript
interface Server {
  pendingWebSockets: number;
  publish(topic: string, data: string | ArrayBufferView | ArrayBuffer, compress?: boolean): number;
  upgrade(req: Request, options?: { headers?: HeadersInit; data?: any }): boolean;
}
```

**ServerWebSocket Methods**:
```typescript
interface ServerWebSocket {
  readonly data: any;
  readonly readyState: number;
  readonly remoteAddress: string;
  readonly subscriptions: string[];
  
  send(message: string | ArrayBuffer | Uint8Array, compress?: boolean): number;
  close(code?: number, reason?: string): void;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  publish(topic: string, message: string | ArrayBuffer | Uint8Array): void;
  isSubscribed(topic: string): boolean;
  cork(cb: (ws: ServerWebSocket) => void): void; // Batch multiple sends
}
```

**Key Features**:
- **Compression**: `permessage-deflate` extension (30-70% bandwidth reduction)
- **Pub-Sub**: Native topic-based broadcasting (`subscribe`, `publish`)
- **Backpressure**: Configurable limits with automatic handling
- **Corking**: Batch multiple sends for better performance
- **Idle Timeout**: Automatic connection cleanup
- **Ping/Pong**: Automatic keepalive (configurable)

**Documentation Links**:
- [Enable compression for WebSocket messages](https://bun.com/docs/guides/websocket/compression)
- [WebSockets](https://bun.com/docs/runtime/http/websockets)
- [Pub-Sub](https://bun.com/docs/guides/websocket/pubsub)

**Status**: ✅ Available in `src/lib/stream-utils.ts` and `src/websocket-server.ts`

---

### 3. Bun.serve Fullstack Features

**HTML Imports**:
```typescript
import dashboardHTML from "./dashboard.html";

Bun.serve({
  routes: {
    "/": dashboardHTML, // Bun automatically bundles JS/CSS
  },
  development: {
    hmr: true, // Hot module reloading
  },
});
```

**Features**:
- Automatic JS/CSS bundling from HTML
- Hot module reloading in development (`bun --hot`)
- Optimized production builds (`bun build`)
- Zero runtime bundling overhead in production

**Documentation Links**:
- [Fullstack dev server](https://bun.com/docs/bundler/fullstack)
- [HTML imports](https://bun.com/docs/runtime/http/server)

**Status**: ✅ Already implemented in `server/api/dashboard-registry.ts`

---

### 4. Server Metrics

**Built-in Metrics**:
- `server.pendingRequests` - Number of in-flight HTTP requests
- `server.pendingWebSockets` - Number of active WebSocket connections
- `server.subscriberCount(topic)` - Count of subscribers for a WebSocket topic

**Usage**:
```typescript
const server = Bun.serve({
  fetch(req, server) {
    return new Response(
      `Active requests: ${server.pendingRequests}\n` +
      `Active WebSockets: ${server.pendingWebSockets}`
    );
  },
  websocket: {
    message(ws) {
      ws.subscribe("chat");
    },
  },
});

// Get subscriber count
const chatUsers = server.subscriberCount("chat");
```

**Documentation Links**:
- [server.subscriberCount(topic)](https://bun.com/docs/runtime/http/server)

**Status**: ✅ Documented in `docs/BUN_SERVER_METRICS.md`

---

### 5. Performance Optimizations

**DNS Caching**:
- Automatic DNS caching (30 seconds TTL, configurable)
- Deduplication of simultaneous DNS queries
- `Bun.dns.getCacheStats()` for cache statistics
- `dns.prefetch(hostname, port)` for proactive DNS resolution
- Configurable TTL via `BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS` env var
- **Technical Note**: Uses `getaddrinfo` system API underneath, which doesn't provide DNS TTL values, so Bun uses a fixed 30-second default (configurable)

**Connection Pooling**:
- Enabled by default
- Can be disabled per-request with `keepalive: false`

**Large File Uploads**:
- Optimized using `sendfile` syscall (>32KB files)
- Automatic fallback for streaming uploads

**Worker Performance**:
- String fast path - 2-241x faster `postMessage`
- Simple object fast path for primitives
- Bypasses structured clone algorithm

**Documentation Links**:
- [DNS caching in Bun](https://bun.com/docs/runtime/networking/dns)
- [Performance optimizations](https://bun.com/docs/runtime/workers)

**Status**: ⚠️ Could be better utilized in our codebase

---

### 6. Bun.listen (TCP/Unix Socket Server)

**Feature**: Low-level TCP and Unix socket server API

**Use Cases**:
- Custom protocols (not HTTP/WebSocket)
- Database connections
- Inter-process communication (IPC)
- Binary protocols
- Real-time data streaming

**Basic Example**:
```typescript
import { listen } from "bun";

const server = listen({
  hostname: "localhost",
  port: 8080,
  socket: {
    open(socket) {
      console.log("✅ Socket opened");
    },
    data(socket, data) {
      // Handle incoming data
      socket.write(data); // Echo back
    },
    drain(socket) {
      // Socket is ready for more data
    },
    close(socket, error) {
      console.log("👋 Socket closed", error ? `with error: ${error}` : "");
    },
    error(socket, error) {
      console.error("❌ Socket error:", error);
    },
  },
});
```

**Unix Socket Example**:
```typescript
const unixServer = listen({
  unix: "/tmp/my-socket.sock",
  socket: {
    open(socket) {},
    data(socket, data) {
      socket.write(data);
    },
    close(socket) {},
  },
});
```

**Server Reload**:
```typescript
const server = listen({
  socket: {
    data(socket, data) {
      // Original handler
    },
  },
});

// Reload handlers for all active sockets without restarting
server.reload({
  socket: {
    data(socket, data) {
      // New handler - applies to all active connections
    },
  },
});
```

**Buffering**:
- Data is **not buffered by default** in Bun's TCP implementation
- Multiple small `socket.write()` calls can cause performance issues
- Use `ArrayBufferSink` with `{stream: true}` for efficient buffering
- Prefer single large writes over multiple small writes
- Use `socket.flush()` to manually flush buffered data (OS usually handles this)

**Example - Efficient Buffering**:
```typescript
import { ArrayBufferSink } from "bun";

const sink = new ArrayBufferSink();
sink.start({ stream: true, highWaterMark: 1024 });

// Accumulate data
sink.write("h");
sink.write("e");
sink.write("l");
sink.write("l");
sink.write("o");

// Write in larger chunks
queueMicrotask(() => {
  const data = sink.flush();
  const wrote = socket.write(data);
  if (wrote < data.byteLength) {
    // Re-buffer remaining data if socket is full
    sink.write(data.subarray(wrote));
  }
});
```

**Documentation Links**:
- [TCP Buffering](https://bun.com/docs/runtime/networking/tcp#buffering)

**Key Differences from Bun.serve**:
- `Bun.serve`: HTTP/HTTPS/WebSocket servers
- `Bun.listen`: Raw TCP/Unix socket servers
- Lower-level control over data handling
- No HTTP parsing overhead
- Better for custom protocols
- Both support `server.reload()` for zero-downtime updates

**Documentation Links**:
- [Bun.listen API](https://bun.com/docs/runtime/networking/tcp)

**Status**: ⚠️ Not currently used (using Bun.serve for HTTP/WebSocket)

---

### 7. Bun.serve Routes

**Static Responses**:
```typescript
Bun.serve({
  routes: {
    "/health": new Response("OK"),
    "/api/config": Response.json({ version: "1.0.0" }),
  },
});
```

**Type-Safe Route Parameters**:
```typescript
Bun.serve({
  routes: {
    "/orgs/:orgId/repos/:repoId": req => {
      const { orgId, repoId } = req.params; // TypeScript knows types!
      return Response.json({ orgId, repoId });
    },
  },
});
```

**Documentation Links**:
- [Static responses](https://bun.com/docs/runtime/http/routing)

**Status**: ✅ Could enhance our API routes

---

### 7. Development Mode Features

**Hot Module Reloading**:
- `bun --hot` - Enables HMR
- `bun --watch` - File watching with auto-reload
- Automatic browser updates without page reload

**Debugging**:
- `bun --inspect` - WebKit Inspector Protocol
- Web-based debugger at `debug.bun.sh`
- Full debugging capabilities (breakpoints, console, etc.)

**Documentation Links**:
- [Debugging Bun with the web debugger](https://bun.com/docs/guides/runtime/web-debugger)

**Status**: ✅ Already using `--watch` in our scripts

---

### 8. Build Features

**Bytecode Caching**:
- Pre-compiles JavaScript to bytecode
- 2x startup time improvement
- Works with lazy parsing optimization

**NODE_PATH Support**:
- `bun build` supports `$NODE_PATH` environment variable
- Custom module resolution directories
- Useful for absolute-like import paths

**Full-Stack Executables**:
- `bun --compile` creates standalone executables
- Includes server + client code
- No dependencies needed

**Documentation Links**:
- [Bytecode Caching](https://bun.com/docs/bundler/bytecode)
- [Full-stack executables](https://bun.com/docs/bundler/executables)

**Status**: ⚠️ Could be utilized more

---

## ✅ Already Implemented

1. ✅ **ReadableStream Methods** - Used in scripts
2. ✅ **HTML Imports** - Used in dashboard-registry.ts
3. ✅ **Server Metrics** - Documented and available
4. ✅ **WebSocket Compression** - Utilities created
5. ✅ **Hot Reload** - Using `--watch` flags

---

## 🚀 Opportunities for Improvement

### 1. Enhanced Route Types
**Current**: Basic route handling  
**Opportunity**: Use type-safe route parameters

```typescript
// Current
if (url.pathname.startsWith('/api/dashboards/')) {
  const id = url.pathname.split('/').pop();
}

// Better
Bun.serve({
  routes: {
    "/api/dashboards/:id": (req) => {
      const { id } = req.params; // TypeScript knows the type!
      return Response.json({ dashboard: getDashboardById(id) });
    },
  },
});
```

### 2. DNS Cache Statistics
**Current**: ✅ Implemented in `/api/health` endpoint  
**Status**: Monitoring DNS cache with full statistics

```typescript
// Already implemented in api-server.ts
const dnsStats = dns.getCacheStats();
// Returns: cacheHitsCompleted, cacheHitsInflight, cacheMisses, size, errors, totalCount
```

**DNS Prefetching**:
**Current**: ✅ Implemented at server startup  
**Status**: Automatically prefetches DNS for external hosts

```typescript
// Already implemented in api-server.ts
dns.prefetch(hostname, port); // Prefetches at startup
```

**DNS Cache TTL Configuration**:
**Current**: ✅ Documented  
**Status**: Can be configured via environment variable

```bash
# Configure DNS cache TTL (default: 30 seconds)
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun run server/api-server.ts
```

### 3. Worker Performance
**Current**: Not using workers  
**Opportunity**: Use workers for heavy processing

```typescript
// For dashboard data processing
const worker = new Worker('./dashboard-worker.ts');
worker.postMessage({ type: 'PROCESS_DATA', data }); // Fast path!
```

### 4. Bytecode Caching
**Current**: Not using bytecode caching  
**Opportunity**: Enable for faster startup

```bash
bun build --target=bun --minify --sourcemap
```

### 5. Static Route Optimization
**Current**: Manual route handling  
**Opportunity**: Use static responses for health checks

```typescript
Bun.serve({
  routes: {
    "/health": new Response("OK"),
    "/api/health": Response.json({ status: "healthy" }),
  },
});
```

---

## 📊 Performance Comparison

### ReadableStream Methods
- **Before**: `new Response(stream).json()` - Response wrapper overhead
- **After**: `stream.json()` - Direct method call
- **Impact**: Faster, cleaner code

### WebSocket Compression
- **Before**: No compression
- **After**: `permessage-deflate` enabled
- **Impact**: 30-70% bandwidth reduction

### HTML Imports
- **Before**: Manual bundling
- **After**: Automatic bundling with HMR
- **Impact**: Faster development, zero runtime overhead in production

### DNS Caching
- **Before**: DNS lookup on every request
- **After**: 30-second cache with deduplication
- **Impact**: Faster connection establishment

---

## 🔗 Documentation Links

### Core Features
- [Bun APIs](https://bun.com/docs/runtime/bun-apis)
- [Web APIs](https://bun.com/docs/runtime/web-apis)
- [HTTP Server](https://bun.com/docs/runtime/http/server)

### Performance
- [DNS caching](https://bun.com/docs/runtime/networking/dns)
- [Worker performance](https://bun.com/docs/runtime/workers)
- [Bytecode caching](https://bun.com/docs/bundler/bytecode)

### Development
- [Fullstack dev server](https://bun.com/docs/bundler/fullstack)
- [Debugging](https://bun.com/docs/guides/runtime/web-debugger)
- [HTML imports](https://bun.com/docs/runtime/http/server)

### WebSockets
- [WebSocket compression](https://bun.com/docs/guides/websocket/compression)
- [WebSocket server](https://bun.com/docs/runtime/http/websockets)
- [Pub-sub](https://bun.com/docs/guides/websocket/pubsub)

---

## 📝 Recommendations

### Immediate Actions
1. ✅ **Continue using ReadableStream methods** - Already implemented
2. ✅ **Continue using HTML imports** - Already implemented
3. ⚠️ **Add DNS cache monitoring** - New opportunity
4. ⚠️ **Use type-safe routes** - Better TypeScript support
5. ⚠️ **Enable bytecode caching** - Faster startup

### Future Considerations
1. **Worker threads** - For heavy dashboard processing
2. **Static route optimization** - For health checks
3. **Enhanced WebSocket features** - Pub-sub, compression
4. **Full-stack executables** - For deployment

---

## ✅ Summary

**Status**: Our codebase is already using many Bun v1.2.16+ features correctly:
- ✅ ReadableStream methods
- ✅ HTML imports with routes
- ✅ Hot reload with `--watch`
- ✅ WebSocket compression utilities

**Opportunities**: Several areas could benefit from additional Bun features:
- ⚠️ Type-safe route parameters
- ⚠️ DNS cache monitoring
- ⚠️ Worker threads for processing
- ⚠️ Bytecode caching for builds

**Documentation**: Comprehensive Bun documentation available via MCP, covering all major features and performance optimizations.

---

**Last Updated**: 2025-11-14  
**MCP Server**: Bun-Official ✅  
**Review Status**: Complete

