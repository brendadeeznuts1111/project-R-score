---
title: Bun features implementation guide
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Features Implementation Guide
acceptEncoding: ""
acceptLanguage: ""
asn: ""
author: Sports Analytics Team
browser: ""
browserName: ""
browserVersion: ""
cacheControl: ""
city: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
countryCode: ""
countryName: ""
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
isGeoBlocked: false
isMobile: false
isp: ""
latitude: ""
longitude: ""
os: ""
osName: ""
osVersion: ""
referer: ""
referrer: ""
regionCode: ""
regionName: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags: []
timezone: ""
usage: ""
user_agent: ""
userAgentRaw: ""
xff: []
xForwardedFor: []
zipCode: ""
---
# Bun Features Implementation Guide

**Date**: 2025-11-14  
**Based on**: Bun Official Documentation via MCP

---

## 🎯 Overview

This guide provides implementation recommendations for leveraging Bun's advanced features in our codebase, based on official documentation review.

---

## ✅ Already Implemented

### 1. ReadableStream Methods
**Status**: ✅ Implemented  
**Files**: `scripts/check-obsidian-connection.ts`, `packages/engine/hft-sim.ts`

```typescript
// ✅ Using Bun v1.2.16 direct methods
const stderr = await curlResult.stderr.text();
const data = await stdout.json();
```

### 2. HTML Imports & Routes
**Status**: ✅ Implemented  
**Files**: `server/api/dashboard-registry.ts`

```typescript
import dashboardRegistryHTML from "../../dashboards/sports/dashboard-registry.html";

serve({
  routes: {
    "/": dashboardRegistryHTML, // Bun automatically bundles JS/CSS
  },
  development: {
    hmr: true,
  },
});
```

### 3. Hot Reload
**Status**: ✅ Implemented  
**Files**: `scripts/start-dashboard-hot.ts`

```typescript
spawn(["bun", "--watch", "server/api/obsidian-proxy.ts"]);
```

### 4. Server Metrics
**Status**: ✅ Documented  
**Files**: `docs/BUN_SERVER_METRICS.md`

```typescript
server.pendingRequests;
server.pendingWebSockets;
server.subscriberCount(topic);
```

---

## 🚀 Recommended Implementations

### 1. Type-Safe Route Parameters

**Current**:
```typescript
if (url.pathname.startsWith('/api/dashboards/')) {
  const id = url.pathname.split('/').pop();
}
```

**Recommended**:
```typescript
Bun.serve({
  routes: {
    "/api/dashboards/:id": (req) => {
      const { id } = req.params; // TypeScript knows the type!
      return Response.json({ dashboard: getDashboardById(id) });
    },
  },
});
```

**Benefits**:
- TypeScript autocomplete
- Type safety
- Cleaner code
- Better performance (zero-allocation dispatch)

**Files to Update**:
- `server/api/dashboard-registry.ts`
- `server/api/obsidian-proxy.ts`
- `server/api/obsidian-status.ts`

---

### 2. Server Reload Without Restart

**Feature**: `server.reload()` - Update handlers without restarting

**Use Case**: Deploy new routes without downtime

**Implementation**:
```typescript
const server = Bun.serve({
  routes: {
    "/api/version": () => Response.json({ version: "1.0.0" }),
  },
});

// Later, update routes without restart
server.reload({
  routes: {
    "/api/version": () => Response.json({ version: "2.0.0" }),
  },
});
```

**Benefits**:
- Zero-downtime deployments
- Hot route updates
- Better development experience

**Files to Update**:
- `server/api-server.ts`
- `server/api/dashboard-registry.ts`

---

### 3. Development Console Echo

**Feature**: Echo browser console logs to terminal

**Implementation**:
```typescript
Bun.serve({
  development: {
    hmr: true,
    console: true, // Echo browser logs to terminal
  },
  routes: {
    "/": dashboardHTML,
  },
});
```

**Benefits**:
- See browser logs in terminal
- Better debugging experience
- Unified logging

**Files to Update**:
- `server/api/dashboard-registry.ts`

---

### 4. DNS Cache Monitoring

**Feature**: `Bun.dns.getCacheStats()`

**Implementation**:
```typescript
// Add to health check endpoint
const dnsStats = Bun.dns.getCacheStats();
console.log(`DNS Cache: ${dnsStats.hits} hits, ${dnsStats.misses} misses`);

return Response.json({
  status: "healthy",
  dns: {
    hits: dnsStats.hits,
    misses: dnsStats.misses,
  },
});
```

**Benefits**:
- Monitor DNS performance
- Identify DNS issues
- Optimize connection reuse

**Files to Update**:
- `server/api-server.ts` (health endpoint)
- `server/api/obsidian-status.ts` (status endpoint)

---

### 5. Static Route Optimization

**Feature**: Static responses for health checks

**Current**:
```typescript
if (url.pathname === '/health') {
  return new Response("OK");
}
```

**Recommended**:
```typescript
Bun.serve({
  routes: {
    "/health": new Response("OK"),
    "/api/health": Response.json({ status: "healthy" }),
  },
});
```

**Benefits**:
- Zero-allocation dispatch
- Better performance
- Cleaner code

**Files to Update**:
- `server/api-server.ts`
- `server/api/obsidian-proxy.ts`

---

### 6. WebSocket Pub-Sub Enhancement

**Feature**: Native pub-sub API with full configuration options

**Current**: Basic WebSocket handling  
**Opportunity**: Use topic-based broadcasting with compression and backpressure handling

**Complete Implementation**:
```typescript
Bun.serve({
  websocket: {
    // Event handlers
    open(ws) {
      ws.subscribe("dashboard-updates");
      ws.subscribe("odds-updates");
    },
    
    message(ws, message) {
      const data = JSON.parse(message.toString());
      
      // Handle different message types
      if (data.type === "subscribe") {
        ws.subscribe(data.topic);
      } else if (data.type === "unsubscribe") {
        ws.unsubscribe(data.topic);
      } else {
        // Broadcast to all subscribers
        server.publish("dashboard-updates", message, true); // compress
      }
    },
    
    close(ws, code, reason) {
      console.log(`WebSocket closed: ${code} - ${reason}`);
    },
    
    error(ws, error) {
      console.error("WebSocket error:", error);
    },
    
    drain(ws) {
      // Socket buffer drained, ready for more data
    },
    
    // Configuration
    maxPayloadLength: 16 * 1024 * 1024, // 16MB
    idleTimeout: 120, // seconds
    backpressureLimit: 1024 * 1024, // 1MB
    closeOnBackpressureLimit: false,
    sendPings: true,
    publishToSelf: false,
    
    // Compression
    perMessageDeflate: {
      compress: "16KB", // Size-based compressor
      decompress: true,  // Enable decompression
    },
  },
  
  fetch(req) {
    // Upgrade to WebSocket
    if (req.url.endsWith("/ws")) {
      const upgraded = server.upgrade(req, {
        headers: { "X-Connection-ID": "abc123" },
        data: { userId: "user-123" },
      });
      return upgraded ? undefined : new Response("Upgrade failed", { status: 400 });
    }
    return new Response("Not found", { status: 404 });
  },
});

// Publish from anywhere
server.publish("dashboard-updates", JSON.stringify({ type: "odds-updated", data }), true);

// Use cork for batching sends
ws.cork((ws) => {
  ws.send("message1");
  ws.send("message2");
  ws.send("message3");
  // All sent in one batch
});
```

**WebSocket Methods**:
- `ws.subscribe(topic)` - Subscribe to topic
- `ws.unsubscribe(topic)` - Unsubscribe from topic
- `ws.publish(topic, message)` - Publish to topic
- `ws.isSubscribed(topic)` - Check subscription
- `ws.cork(cb)` - Batch multiple sends
- `ws.send(message, compress?)` - Send with optional compression
- `ws.close(code?, reason?)` - Close connection

**Benefits**:
- Native pub-sub (no Redis needed)
- Better performance with compression
- Backpressure handling
- Cork for batching sends
- Automatic idle timeout
- Configurable payload limits

**Files to Update**:
- `server/api-server.ts` (if WebSocket support needed)
- `src/websocket-server.ts` (enhance existing implementation)

---

### 7. Worker Threads for Heavy Processing

**Feature**: Worker threads with fast postMessage

**Use Case**: Dashboard data processing

**Implementation**:
```typescript
// dashboard-worker.ts
self.postMessage({ type: "PROCESS_DATA", data }); // Fast path!

// main.ts
const worker = new Worker("./dashboard-worker.ts");
worker.postMessage({ type: "PROCESS_DATA", data }); // 2-241x faster!
```

**Benefits**:
- 2-241x faster postMessage
- Offload heavy processing
- Better main thread performance

**Files to Create**:
- `workers/dashboard-processor.ts`

---

### 8. Bytecode Caching

**Feature**: Pre-compile JavaScript to bytecode

**Implementation**:
```bash
bun build --target=bun --minify --sourcemap
```

**Benefits**:
- 2x startup time improvement
- Faster execution
- Production-ready

**Files to Update**:
- `package.json` (build scripts)

---

### 9. Enhanced WebSocket Compression

**Feature**: Per-message deflate compression

**Current**: Utilities available  
**Opportunity**: Enable in servers

**Implementation**:
```typescript
Bun.serve({
  websocket: {
    perMessageDeflate: true, // Enable compression
    message(ws, message) {
      ws.send(message, true); // Send compressed
    },
  },
});
```

**Benefits**:
- 30-70% bandwidth reduction
- Better performance
- Lower costs

**Files to Update**:
- `server/api-server.ts` (if WebSocket support needed)

---

### 10. Bun.listen (TCP/Unix Socket Server)

**Feature**: Low-level TCP and Unix socket server API

**Use Case**: Custom protocols, IPC, binary data streaming

**Implementation**:
```typescript
import { listen } from "bun";

// TCP Socket Server
const tcpServer = listen({
  hostname: "localhost",
  port: 8080,
  socket: {
    open(socket) {
      console.log("✅ Socket opened:", socket.remoteAddress);
    },
    data(socket, data) {
      // Handle binary or text data
      const message = data.toString();
      socket.write(`Echo: ${message}`);
    },
    drain(socket) {
      // Socket buffer is drained, ready for more writes
    },
    close(socket, error) {
      console.log("👋 Socket closed", error ? `with error: ${error}` : "");
    },
    error(socket, error) {
      console.error("❌ Socket error:", error);
    },
  },
});

// Unix Socket Server (IPC)
const unixServer = listen({
  unix: "/tmp/my-app.sock",
  socket: {
    open(socket) {},
    data(socket, data) {
      socket.write(data);
    },
    close(socket) {},
  },
});
```

**Benefits**:
- Lower-level control than HTTP
- No HTTP parsing overhead
- Custom protocol support
- Unix sockets for IPC
- Binary data handling

**When to Use**:
- Custom protocols (not HTTP/WebSocket)
- Inter-process communication
- Database connections
- Real-time binary streaming
- High-performance data transfer

**Server Reload (Zero-Downtime Updates)**:
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
      // New handler - applies to all active connections immediately
    },
  },
});
```

**Benefits of Reload**:
- Zero-downtime updates
- Hot reload for socket handlers
- Update protocol logic without disconnecting clients
- Better development experience

**Buffering Best Practices**:
- **Data is NOT buffered by default** in Bun's TCP implementation
- Multiple small `socket.write()` calls cause performance issues
- Use `ArrayBufferSink` with `{stream: true}` for efficient buffering
- Prefer single large writes over multiple small writes

**Buffering Example**:
```typescript
import { ArrayBufferSink } from "bun";

const sink = new ArrayBufferSink();
sink.start({
  stream: true,
  highWaterMark: 1024, // Buffer up to 1KB
});

// Accumulate multiple small writes
sink.write("h");
sink.write("e");
sink.write("l");
sink.write("l");
sink.write("o");

// Flush in larger chunks
queueMicrotask(() => {
  const data = sink.flush();
  const wrote = socket.write(data);
  
  // Handle backpressure - re-buffer if socket is full
  if (wrote < data.byteLength) {
    sink.write(data.subarray(wrote));
  }
});
```

**Performance Tip**:
- ❌ Bad: `socket.write("h"); socket.write("e"); socket.write("l");` (3 system calls)
- ✅ Good: `socket.write("hel");` (1 system call)
- ✅ Best: Use `ArrayBufferSink` for accumulating writes

**Documentation Links**:
- [TCP Buffering](https://bun.com/docs/runtime/networking/tcp#buffering)

**Files to Create** (if needed):
- `server/tcp-server.ts` - TCP socket server
- `server/tcp-server-buffered.ts` - TCP socket server with buffering
- `server/unix-server.ts` - Unix socket server for IPC

---

### 11. Bun.file() Optimization

**Feature**: Lazy file reading with efficient JSON parsing

**Current**: ✅ Using `Bun.file()` in most places  
**Status**: Optimized for JSON files

**Implementation**:
```typescript
// ✅ Best: Use Bun.file().json() for JSON files
const file = Bun.file("./config/dashboards.json");
const data = await file.json(); // Efficient JSON parsing, lazy reading

// ✅ Good: For text files
const file = Bun.file("./template.html");
const content = await file.text(); // Lazy reading

// ❌ Avoid: Manual JSON.parse after text()
const text = await file.text();
const data = JSON.parse(text); // Less efficient
```

**Real-World Example** (`config/dashboards.json`):
```typescript
// ✅ Current implementation (optimized)
export async function loadDashboardsConfig(): Promise<DashboardConfig> {
  const file = Bun.file("config/dashboards.json");
  return await file.json() as DashboardConfig;
}

// Used in:
// - server/api/dashboard-registry.ts (with caching)
// - macros/dashboard-config.ts (build-time)
// - server/local-server.ts (MCP tools)
```

**Benefits**:
- Lazy evaluation (only reads when needed)
- Efficient JSON parsing (no manual `JSON.parse()`)
- Better memory usage
- Cleaner API
- Type-safe with TypeScript

**Files Using Bun.file()**:
- ✅ `src/lib/dashboard-registry.utils.ts` - Uses `Bun.file().json()`
- ✅ `server/local-server.ts` - Uses `Bun.file().json()`
- ✅ `macros/dashboard-config.ts` - Uses `Bun.readFileSync()` (build-time)
- ✅ `config/validators/json-config-validator.ts` - Uses `Bun.file().json()`

---

## 📊 Priority Matrix

### High Priority (Immediate Impact)
1. ✅ **Type-Safe Routes** - Better TypeScript support
2. ✅ **Static Route Optimization** - Better performance
3. ✅ **Development Console Echo** - Better debugging

### Medium Priority (Good ROI)
4. ⚠️ **Server Reload** - Zero-downtime deployments
5. ⚠️ **DNS Cache Monitoring** - Performance insights
6. ⚠️ **WebSocket Pub-Sub** - If WebSocket support needed

### Low Priority (Nice to Have)
7. ⚠️ **Worker Threads** - For heavy processing
8. ⚠️ **Bytecode Caching** - For production builds
9. ⚠️ **Bun.file() Optimization** - Code cleanup

---

## 🔧 Implementation Steps

### Step 1: Type-Safe Routes
1. Update `server/api/dashboard-registry.ts`
2. Convert path-based routing to `routes` option
3. Add TypeScript types for route parameters

### Step 2: Static Routes
1. Move health checks to `routes` option
2. Use `Response.json()` for API responses
3. Remove manual path checking

### Step 3: Development Features
1. Add `console: true` to development config
2. Enable HMR if not already enabled
3. Test browser log echoing

### Step 4: Monitoring
1. Add DNS cache stats to health endpoint
2. Add server metrics to status endpoint
3. Create monitoring dashboard

---

## 📝 Code Examples

### Complete Example: Optimized API Server

```typescript
import { serve } from "bun";
import dashboardHTML from "./dashboard.html";

const server = serve({
  port: 3000,
  
  // Type-safe routes
  routes: {
    // Static responses
    "/health": new Response("OK"),
    "/api/health": Response.json({ status: "healthy" }),
    
    // Type-safe parameters
    "/api/dashboards/:id": (req) => {
      const { id } = req.params; // TypeScript knows the type!
      return Response.json({ dashboard: getDashboardById(id) });
    },
    
    // HTML import
    "/": dashboardHTML,
  },
  
  // Development features
  development: {
    hmr: true,
    console: true, // Echo browser logs
  },
  
  // WebSocket with compression
  websocket: {
    perMessageDeflate: true,
    message(ws, message) {
      ws.subscribe("updates");
      server.publish("updates", message);
    },
  },
  
  // Fetch handler for dynamic routes
  async fetch(req) {
    const url = new URL(req.url);
    
    // Health check with DNS stats
    if (url.pathname === "/api/metrics") {
      const dnsStats = Bun.dns.getCacheStats();
      return Response.json({
        requests: server.pendingRequests,
        websockets: server.pendingWebSockets,
        dns: dnsStats,
      });
    }
    
    return new Response("Not found", { status: 404 });
  },
});

// Reload routes without restart
function updateRoutes() {
  server.reload({
    routes: {
      "/api/version": () => Response.json({ version: "2.0.0" }),
    },
  });
}
```

---

## 🔗 Documentation References

- [Bun.serve Routes](https://bun.com/docs/runtime/http/routing)
- [Server Reload](https://bun.com/docs/runtime/http/server)
- [Development Mode](https://bun.com/docs/bundler/fullstack)
- [WebSocket Compression](https://bun.com/docs/guides/websocket/compression)
- [DNS Caching](https://bun.com/docs/runtime/networking/dns)
- [Worker Performance](https://bun.com/docs/runtime/workers)

---

**Last Updated**: 2025-11-14  
**Status**: Ready for Implementation

