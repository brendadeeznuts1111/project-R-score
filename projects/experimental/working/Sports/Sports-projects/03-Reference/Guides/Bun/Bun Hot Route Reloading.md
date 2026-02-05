---
title: Bun hot route reloading
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Hot Route Reloading
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
# Bun Hot Route Reloading

> Update routes without server restarts using `server.reload()`

**Reference**: [Bun Hot Route Reloading](https://bun.com/docs/runtime/http/server#hot-route-reloading)

---

## Overview

Bun's `server.reload()` method allows you to update route handlers and error handlers without restarting the server. This enables zero-downtime deployments and hot updates in production.

**Key Benefits**:
- ✅ Zero-downtime deployments
- ✅ Hot route updates
- ✅ Better development experience
- ✅ No connection interruption

---

## Basic Usage

### Simple Route Reload

```typescript
const server = Bun.serve({
  routes: {
    "/api/version": () => Response.json({ version: "1.0.0" }),
  },
});

// Deploy new routes without downtime
server.reload({
  routes: {
    "/api/version": () => Response.json({ version: "2.0.0" }),
  },
});
```

---

## Advanced Patterns

### Reload Multiple Routes

```typescript
const server = Bun.serve({
  routes: {
    "/api/health": () => Response.json({ status: "ok" }),
    "/api/users/:id": (req) => {
      return Response.json({ id: req.params.id, name: "User" });
    },
  },
});

// Reload multiple routes at once
server.reload({
  routes: {
    "/api/health": () => Response.json({ 
      status: "ok", 
      timestamp: Date.now() 
    }),
    "/api/users/:id": (req) => {
      return Response.json({ 
        id: req.params.id, 
        name: "Updated User",
        version: "2.0"
      });
    },
  },
});
```

---

### Reload with Fetch Handler

```typescript
const server = Bun.serve({
  routes: {
    "/api/data": () => Response.json({ data: "old" }),
  },
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

// Reload both routes and fetch handler
server.reload({
  routes: {
    "/api/data": () => Response.json({ data: "new" }),
  },
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api/status") {
      return Response.json({ status: "updated" });
    }
    return new Response("Not Found", { status: 404 });
  },
});
```

---

### Reload with Error Handler

```typescript
const server = Bun.serve({
  routes: {
    "/api/test": () => {
      throw new Error("Test error");
    },
  },
  error(error) {
    return new Response("Error occurred", { status: 500 });
  },
});

// Update error handler
server.reload({
  error(error) {
    console.error("Updated error handler:", error);
    return Response.json({ 
      error: error.message,
      timestamp: Date.now()
    }, { status: 500 });
  },
});
```

---

## Practical Examples

### Dashboard Registry Server

```typescript
// server/api/dashboard-registry.ts
const server = serve({
  port: REGISTRY_PORT,
  
  routes: {
    "/": dashboardRegistryHTML,
    [`${ENDPOINTS.DASHBOARD_BY_ID}/:id`]: async (req) => {
      const { id } = req.params;
      // ... handler logic
    },
  },
});

// Example: Reload server routes without restarting
server.reload({
  routes: {
    "/": dashboardRegistryHTML,
    [`${ENDPOINTS.DASHBOARD_BY_ID}/:id`]: async (req) => {
      const { id } = req.params;
      // Updated handler logic
      const dashboard = await getCachedDashboardById(id, /* ... */);
      return Response.json(dashboard, {
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "public, max-age=600", // Updated cache time
        },
      });
    },
  },
});
```

---

### Version-Based Route Updates

```typescript
const server = Bun.serve({
  routes: {
    "/api/version": () => Response.json({ version: "1.0.0" }),
  },
});

// Update version endpoint without restart
function updateVersion(newVersion: string) {
  server.reload({
    routes: {
      "/api/version": () => Response.json({ 
        version: newVersion,
        updated: new Date().toISOString()
      }),
    },
  });
}

// Call when version changes
updateVersion("2.0.0");
```

---

### Feature Flag-Based Routes

```typescript
const server = Bun.serve({
  routes: {
    "/api/feature": () => Response.json({ enabled: false }),
  },
});

// Enable/disable features without restart
function toggleFeature(enabled: boolean) {
  server.reload({
    routes: {
      "/api/feature": () => Response.json({ 
        enabled,
        timestamp: Date.now()
      }),
    },
  });
}

// Toggle feature
toggleFeature(true);
```

---

### Configuration-Based Reload

```typescript
interface ServerConfig {
  cacheTimeout: number;
  enableMetrics: boolean;
}

let config: ServerConfig = {
  cacheTimeout: 60,
  enableMetrics: false,
};

const server = Bun.serve({
  routes: {
    "/api/config": () => Response.json(config),
  },
});

// Reload routes when config changes
function updateConfig(newConfig: ServerConfig) {
  config = newConfig;
  
  server.reload({
    routes: {
      "/api/config": () => Response.json(config),
      "/api/metrics": config.enableMetrics
        ? () => Response.json({ metrics: "enabled" })
        : undefined, // Remove route if disabled
    },
  });
}
```

---

## File Watch Pattern

### Auto-Reload on File Changes

```typescript
import { watch } from "fs/promises";

const server = Bun.serve({
  routes: {
    "/api/data": async () => {
      const data = await Bun.file("./data.json").json();
      return Response.json(data);
    },
  },
});

// Watch for file changes and reload routes
async function watchAndReload() {
  const watcher = watch("./data.json", { recursive: false });
  
  for await (const event of watcher) {
    if (event.eventType === "change") {
      console.log("📝 Data file changed, reloading routes...");
      
      server.reload({
        routes: {
          "/api/data": async () => {
            const data = await Bun.file("./data.json").json();
            return Response.json({
              ...data,
              reloadedAt: new Date().toISOString(),
            });
          },
        },
      });
    }
  }
}

// Start watching (non-blocking)
watchAndReload().catch(console.error);
```

---

## Signal-Based Reload

### Reload on SIGHUP

```typescript
const server = Bun.serve({
  routes: {
    "/api/status": () => Response.json({ status: "running" }),
  },
});

// Reload routes on SIGHUP (common for zero-downtime deployments)
process.on("SIGHUP", () => {
  console.log("🔄 Received SIGHUP, reloading routes...");
  
  server.reload({
    routes: {
      "/api/status": () => Response.json({ 
        status: "reloaded",
        timestamp: Date.now()
      }),
    },
  });
});
```

---

## Limitations

### What Can Be Reloaded

✅ **Can be reloaded**:
- `routes` - Route handlers
- `fetch` - Fallback fetch handler
- `error` - Error handler

❌ **Cannot be reloaded**:
- `websocket` - WebSocket handlers
- `port` - Server port
- `hostname` - Server hostname
- `tls` - TLS configuration
- `development` - Development mode settings

---

## Best Practices

1. **Test Reloads**: Test route reloads in development before production
2. **Version Tracking**: Log when routes are reloaded for debugging
3. **Graceful Degradation**: Handle errors during reload gracefully
4. **Backward Compatibility**: Ensure new routes are backward compatible
5. **Monitor Metrics**: Check `server.pendingRequests` before reloading
6. **Atomic Updates**: Reload all related routes together

---

## Integration with Deployment

### Zero-Downtime Deployment Pattern

```typescript
const server = Bun.serve({
  routes: {
    "/api/version": () => Response.json({ version: "1.0.0" }),
  },
});

// Deployment script
async function deployNewVersion() {
  console.log("🚀 Deploying new version...");
  
  // Wait for in-flight requests to complete
  while (server.pendingRequests > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Reload routes
  server.reload({
    routes: {
      "/api/version": () => Response.json({ version: "2.0.0" }),
    },
  });
  
  console.log("✅ Deployment complete");
}
```

---

## Related Documentation

- [Bun Server API](https://bun.com/docs/runtime/http/server)
- [Server Lifecycle Methods](./BUN_SERVER_LIFECYCLE.md)
- [Server Reload Without Restart](./BUN_FEATURES_IMPLEMENTATION_GUIDE.md#server-reload-without-restart)

---

**Last Updated**: 2025-11-14  
**Status**: ✅ Documented  
**Reference**: [Bun Hot Route Reloading](https://bun.com/docs/runtime/http/server#hot-route-reloading)

