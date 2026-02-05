---
title: Bun server metrics
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Server Metrics
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
# Bun Server Metrics

> Monitor server activity with built-in metrics

## Overview

Bun provides built-in server metrics that allow you to monitor server activity in real-time without external monitoring tools. These metrics are available directly on the server instance returned by `Bun.serve()`.

## Available Metrics

### `server.pendingRequests`

Monitor the number of active HTTP requests currently being processed by the server.

**Type**: `number`

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

### `server.pendingWebSockets`

Monitor the number of active WebSocket connections currently open.

**Type**: `number`

**Example**:
```typescript
const server = Bun.serve({
  fetch(req, server) {
    return new Response(
      `Active requests: ${server.pendingRequests}\n` + 
      `Active WebSockets: ${server.pendingWebSockets}`,
    );
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

### `server.subscriberCount(topic)`

Get the count of WebSocket subscribers for a specific topic.

**Type**: `(topic: string) => number`

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

## Integration Examples

### Health Check Endpoint

```typescript
const server = Bun.serve({
  fetch(req, server) {
    const url = new URL(req.url);
    
    if (url.pathname === "/health") {
      return Response.json({
        status: "healthy",
        metrics: {
          pendingRequests: server.pendingRequests,
          pendingWebSockets: server.pendingWebSockets,
          chatSubscribers: server.subscriberCount("chat"),
          notificationsSubscribers: server.subscriberCount("notifications"),
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    message(ws, message) {
      // Handle WebSocket messages
    },
  },
});
```

### Metrics Dashboard

```typescript
const server = Bun.serve({
  fetch(req, server) {
    const url = new URL(req.url);
    
    if (url.pathname === "/metrics") {
      const metrics = {
        requests: {
          pending: server.pendingRequests,
        },
        websockets: {
          pending: server.pendingWebSockets,
          topics: {
            chat: server.subscriberCount("chat"),
            notifications: server.subscriberCount("notifications"),
            updates: server.subscriberCount("updates"),
          },
        },
      };
      
      return Response.json(metrics, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
    
    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    message(ws, message) {
      const data = JSON.parse(message.toString());
      
      if (data.action === "subscribe") {
        ws.subscribe(data.topic);
      } else if (data.action === "unsubscribe") {
        ws.unsubscribe(data.topic);
      }
    },
  },
});
```

### Rate Limiting Based on Metrics

```typescript
const MAX_CONCURRENT_REQUESTS = 100;

const server = Bun.serve({
  fetch(req, server) {
    // Check if server is overloaded
    if (server.pendingRequests > MAX_CONCURRENT_REQUESTS) {
      return new Response("Server overloaded", { 
        status: 503,
        headers: {
          "Retry-After": "5",
        },
      });
    }
    
    // Process request normally
    return new Response("OK");
  },
});
```

## Best Practices

1. **Monitor Regularly**: Set up periodic checks of these metrics
2. **Set Thresholds**: Define acceptable limits for each metric
3. **Alert on Anomalies**: Trigger alerts when metrics exceed thresholds
4. **Log Metrics**: Store metrics for historical analysis
5. **Combine with External Monitoring**: Use these alongside tools like Prometheus, Grafana, or SigNoz

## Related Documentation

- [Bun Server API](https://bun.sh/docs/api/http-server)
- [WebSocket API](https://bun.sh/docs/api/websockets)
- [Performance Monitoring](./OPERATIONAL_RUNBOOK.md)

