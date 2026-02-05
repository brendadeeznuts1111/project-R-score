---
title: Bun server lifecycle
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Server Lifecycle
acceptEncoding: ""
acceptLanguage: ""
author: Sports Analytics Team
browser: ""
cacheControl: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
os: ""
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
# Bun Server Lifecycle Methods & Configuration

> Control server lifecycle, graceful shutdown, process management, and connection timeouts

**Reference**: 
- [Bun Server Lifecycle Methods](https://bun.com/docs/runtime/http/server#server-lifecycle-methods)
- [idleTimeout Configuration](https://bun.com/docs/runtime/http/server#idletimeout)

---

## Overview

Bun provides several lifecycle methods to control server behavior, manage graceful shutdowns, and control process lifecycle. These methods are available on the `Server` instance returned by `Bun.serve()`.

---

## Server Configuration

### `idleTimeout`

Configure the maximum amount of time a connection is allowed to be idle before the server closes it.

**Type**: `number` (seconds)

**Default**: Not set (connections stay open indefinitely)

**Example**:
```typescript
Bun.serve({
  // 10 seconds idle timeout
  idleTimeout: 10,
  
  fetch(req) {
    return new Response("Bun!");
  },
});
```

**Use Cases**:
- Prevent resource exhaustion from idle connections
- Force clients to reconnect periodically
- Clean up stale connections
- Reduce memory usage in long-running servers

**Note**: A connection is considered idle if there is no data sent or received.

---

### Example: Configuring Idle Timeout

```typescript
const server = Bun.serve({
  port: 3000,
  
  // Close idle connections after 30 seconds
  idleTimeout: 30,
  
  fetch(req) {
    return new Response("Hello!");
  },
  
  websocket: {
    // WebSocket connections have separate idleTimeout
    idleTimeout: 120, // 2 minutes for WebSocket connections
    message(ws) {
      ws.send("Hello!");
    },
  },
});
```

---

### Example: Different Timeouts for Different Use Cases

```typescript
// API server with short timeout for quick requests
const apiServer = Bun.serve({
  port: 3000,
  idleTimeout: 10, // 10 seconds - quick API responses
  
  fetch(req) {
    return Response.json({ data: "api" });
  },
});

// Long-polling server with longer timeout
const pollingServer = Bun.serve({
  port: 3001,
  idleTimeout: 300, // 5 minutes - for long-polling
  
  fetch(req) {
    return new Response("Polling...");
  },
});
```

---

### Example: Dynamic Timeout Based on Request

```typescript
const server = Bun.serve({
  port: 3000,
  idleTimeout: 60, // Default 60 seconds
  
  fetch(req, server) {
    const url = new URL(req.url);
    
    // Set custom timeout for specific endpoints
    if (url.pathname === "/api/long-task") {
      server.timeout(req, 300); // 5 minutes for long tasks
    } else if (url.pathname === "/api/quick") {
      server.timeout(req, 5); // 5 seconds for quick endpoints
    }
    
    return new Response("OK");
  },
});
```

**Note**: `server.timeout(request, seconds)` allows setting custom idle timeout per request. Set to `0` to disable timeout for that request.

---

## Server Lifecycle Methods

### `server.stop(closeActiveConnections?)`

Stop the server from accepting new connections.

**Signature**:
```typescript
stop(closeActiveConnections?: boolean): Promise<void>
```

**Parameters**:
- `closeActiveConnections` (optional): If `true`, immediately terminates all connections. Default: `false` (waits for in-flight requests)

**Example**:
```typescript
const server = Bun.serve({
  fetch(req) {
    return new Response("Hello!");
  },
});

// Graceful shutdown (waits for in-flight requests)
await server.stop();

// Force stop (immediately terminates all connections)
await server.stop(true);
```

**Use Cases**:
- Graceful shutdown on SIGINT/SIGTERM
- Zero-downtime deployments
- Testing cleanup
- Process management

---

### `server.ref()` and `server.unref()`

Control whether the server keeps the Bun process alive.

**Signature**:
```typescript
ref(): void;
unref(): void;
```

**Example**:
```typescript
const server = Bun.serve({
  fetch(req) {
    return new Response("Hello!");
  },
});

// Allow process to exit if server is only thing running
server.unref();

// Keep process alive while server is running (default)
server.ref();
```

**Use Cases**:
- Background services that shouldn't block process exit
- Testing scenarios
- Process management in containerized environments

---

## Server Metrics

### `server.pendingRequests`

Number of in-flight HTTP requests currently being processed.

**Type**: `number` (readonly)

**Example**:
```typescript
const server = Bun.serve({
  fetch(req, server) {
    return new Response(
      `Active requests: ${server.pendingRequests}\n` + 
      `Active WebSockets: ${server.pendingWebSockets}`,
    );
  },
});
```

**Use Cases**:
- Health check endpoints
- Load monitoring
- Rate limiting decisions
- Performance dashboards

---

### `server.pendingWebSockets`

Number of active WebSocket connections currently open.

**Type**: `number` (readonly)

**Example**:
```typescript
const server = Bun.serve({
  fetch(req, server) {
    return Response.json({
      requests: server.pendingRequests,
      websockets: server.pendingWebSockets,
    });
  },
  websocket: {
    message(ws) {
      // WebSocket handling
    },
  },
});
```

**Use Cases**:
- Real-time connection monitoring
- Capacity planning
- WebSocket health checks
- Connection limit enforcement

---

### `server.subscriberCount(topic)`

Get count of subscribers for a WebSocket topic.

**Signature**:
```typescript
subscriberCount(topic: string): number
```

**Example**:
```typescript
const server = Bun.serve({
  fetch(req, server) {
    const chatUsers = server.subscriberCount("chat");
    return new Response(`${chatUsers} users in chat`);
  },
  websocket: {
    message(ws) {
      ws.subscribe("chat");
    },
  },
});
```

**Use Cases**:
- Topic-based user counts
- Chat room monitoring
- Pub/sub metrics
- Real-time analytics

---

## Graceful Shutdown Pattern

### Basic Pattern

```typescript
const server = Bun.serve({
  fetch(req) {
    return new Response("Hello!");
  },
});

// Handle shutdown signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  console.log(`   Active requests: ${server.pendingRequests}`);
  console.log(`   Active WebSockets: ${server.pendingWebSockets}`);
  
  // Stop accepting new connections, wait for in-flight requests
  await server.stop();
  
  console.log('✅ Server stopped');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});
```

---

### Advanced Pattern with Cleanup

```typescript
const server = Bun.serve({
  fetch(req) {
    return new Response("Hello!");
  },
});

// Graceful shutdown with cleanup
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  // Log current server state
  console.log(`   Active requests: ${server.pendingRequests}`);
  console.log(`   Active WebSockets: ${server.pendingWebSockets}`);
  
  // Stop accepting new connections
  // By default, waits for in-flight requests and WebSocket connections
  await server.stop();
  
  // Additional cleanup (close database connections, flush logs, etc.)
  // await closeDatabase();
  // await flushLogs();
  
  console.log('✅ Server stopped gracefully');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});
```

---

### Force Stop Pattern

```typescript
const server = Bun.serve({
  fetch(req) {
    return new Response("Hello!");
  },
});

// Force stop after timeout
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down...');
  
  // Try graceful shutdown first
  const shutdownPromise = server.stop();
  
  // Force stop after 10 seconds
  const forceStopPromise = new Promise(resolve => setTimeout(resolve, 10000))
    .then(() => {
      console.log('⏱️  Timeout reached, forcing stop...');
      return server.stop(true);
    });
  
  await Promise.race([shutdownPromise, forceStopPromise]);
  process.exit(0);
});
```

---

## Integration with Health Checks

### Health Check with Metrics

```typescript
const server = Bun.serve({
  fetch(req, server) {
    const url = new URL(req.url);
    
    if (url.pathname === "/api/health") {
      return Response.json({
        status: "healthy",
        server: {
          pendingRequests: server.pendingRequests,
          pendingWebSockets: server.pendingWebSockets,
          uptime: process.uptime(),
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    return new Response("Not Found", { status: 404 });
  },
});
```

---

## Best Practices

1. **Always Use Graceful Shutdown**: Handle SIGINT/SIGTERM signals
2. **Log Server State**: Include `pendingRequests` and `pendingWebSockets` in shutdown logs
3. **Set Timeouts**: Use force stop as fallback if graceful shutdown takes too long
4. **Clean Up Resources**: Close database connections, flush logs, etc. before exit
5. **Monitor Metrics**: Use `pendingRequests` and `pendingWebSockets` for health checks
6. **Handle Errors**: Catch uncaught exceptions and unhandled rejections

---

## Related Documentation

- [Bun Server API](https://bun.com/docs/runtime/http/server)
- [Server Metrics](./BUN_SERVER_METRICS.md)
- [Server Reload](./BUN_FEATURES_IMPLEMENTATION_GUIDE.md#server-reload-without-restart)

---

**Last Updated**: 2025-11-14  
**Status**: ✅ Documented  
**Reference**: [Bun Server Lifecycle Methods](https://bun.com/docs/runtime/http/server#server-lifecycle-methods)

