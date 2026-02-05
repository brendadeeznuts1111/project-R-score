---
title: Bun quick reference
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Quick Reference
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
# Bun Server Quick Reference

> Quick reference guide for Bun server features and best practices

**Last Updated**: 2025-11-14

---

## 🚀 Server Setup

### Basic Server

```typescript
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello!");
  },
});
```

### With Routes

```typescript
const server = Bun.serve({
  port: 3000,
  routes: {
    "/api/health": () => Response.json({ status: "ok" }),
    "/api/users/:id": (req) => {
      const { id } = req.params; // Type-safe!
      return Response.json({ id });
    },
  },
});
```

---

## 📝 Type-Safe Routes

```typescript
routes: {
  "/users/:id": (req) => {
    const { id } = req.params; // TypeScript knows id is string!
    return Response.json({ userId: id });
  },
  
  "/posts/:postId/comments/:commentId": (req) => {
    const { postId, commentId } = req.params; // Both type-safe!
    return Response.json({ postId, commentId });
  },
}
```

---

## 🔥 Development Mode

```typescript
development: {
  hmr: true,        // Hot module reloading
  console: true,    // Echo browser console logs
}
```

---

## ⚠️ Error Handling

```typescript
error(error: Error, request: Request): Response {
  return Response.json({ error: error.message }, { status: 500 });
}
```

---

## 📊 Server Metrics

```typescript
fetch(req, server) {
  return Response.json({
    requests: server.pendingRequests,
    websockets: server.pendingWebSockets,
    chatUsers: server.subscriberCount("chat"),
  });
}
```

---

## 🔄 Hot Route Reloading

```typescript
server.reload({
  routes: {
    "/api/version": () => Response.json({ version: "2.0.0" }),
  },
});
```

---

## 🛑 Graceful Shutdown

```typescript
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});
```

---

## ⏱️ Idle Timeout

```typescript
Bun.serve({
  idleTimeout: 30, // seconds
  fetch(req) {
    return new Response("Hello!");
  },
});
```

---

## 🔒 TLS Configuration

```typescript
Bun.serve({
  tls: {
    cert: Bun.file("./cert.pem"),
    key: Bun.file("./key.pem"),
    serverName: "my-server.com", // SNI
  },
});
```

---

## 🌐 HTML Imports

```typescript
import dashboardHTML from "./dashboard.html";

Bun.serve({
  routes: {
    "/": dashboardHTML, // Auto-bundles JS/CSS
  },
});
```

---

## 🔌 WebSocket Setup

```typescript
Bun.serve({
  websocket: {
    message(ws, message) {
      ws.send(`Echo: ${message}`);
    },
    open(ws) {
      ws.subscribe("updates");
    },
  },
  
  fetch(req) {
    const upgraded = server.upgrade(req);
    return upgraded ? undefined : new Response("Upgrade failed", { status: 400 });
  },
});
```

---

## 📡 WebSocket Pub-Sub

```typescript
// Server publishes
server.publish("updates", "New data!");

// Client subscribes
ws.subscribe("updates");

// Get subscriber count
const count = server.subscriberCount("updates");
```

---

## 🎯 Common Patterns

### JSON API Response

```typescript
return Response.json({ data: "value" }, {
  headers: {
    "Cache-Control": "public, max-age=60",
  },
});
```

### CORS Headers

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
```

### OPTIONS Preflight

```typescript
if (req.method === "OPTIONS") {
  return new Response(null, { status: 204, headers: corsHeaders });
}
```

---

## 📚 Documentation Links

- [Server API](https://bun.com/docs/runtime/http/server)
- [Routes](https://bun.com/docs/runtime/http/routing)
- [WebSocket](https://bun.com/docs/guides/websocket)
- [Fullstack](https://bun.com/docs/bundler/fullstack)

---

## 🔗 Related Docs

- [Server Metrics](./BUN_SERVER_METRICS.md)
- [Lifecycle Methods](./BUN_SERVER_LIFECYCLE.md)
- [Error Handling](./BUN_ERROR_HANDLING.md)
- [Hot Reloading](./BUN_HOT_ROUTE_RELOADING.md)
- [TLS Configuration](./BUN_TLS_CONFIGURATION.md)

---

**Quick Reference** | **Last Updated**: 2025-11-14

