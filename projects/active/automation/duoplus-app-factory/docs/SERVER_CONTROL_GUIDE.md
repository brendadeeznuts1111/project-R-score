# 🚀 Bun Server Control Features Guide

Advanced server control methods for `Bun.serve()`: `ref()`, `unref()`, and `reload()`

## Overview

Bun provides three powerful methods to control server behavior:

1. **`server.ref()`** - Keep the process alive
2. **`server.unref()`** - Allow the process to exit
3. **`server.reload()`** - Hot reload handlers without restart

## 1. server.ref() and server.unref()

### What They Do

- **`server.ref()`** - Makes the server a reason to keep the Node/Bun process alive
- **`server.unref()`** - Removes the server as a reason to keep the process alive

### Use Cases

**`server.unref()`** is useful for:
- Graceful shutdown when server is the only task
- Cleanup and resource management
- Allowing process to exit when other tasks complete
- Development environments with auto-reload

**`server.ref()`** is useful for:
- Ensuring server stays alive during operation
- Restoring default behavior after unref()
- Production deployments

### Example

```typescript
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello!");
  },
});

// Don't keep process alive if server is the only thing running
server.unref();

// Later, restore default behavior
server.ref();
```

### Practical Example

```typescript
// Start server
const server = Bun.serve({ port: 3000, fetch(req) { /* ... */ } });

// If using with other async tasks
const task = setTimeout(() => {
  console.log("Task complete");
  process.exit(0);
}, 5000);

// Allow process to exit when task completes
server.unref();

// If task is cancelled, keep server alive
clearTimeout(task);
server.ref();
```

## 2. server.reload()

### What It Does

Updates the server's handlers without restarting the server. Useful for:
- Hot reloading during development
- Zero-downtime updates
- Dynamic configuration changes
- Testing handler updates

### Limitations

Only these can be updated:
- ✅ `fetch` - Request handler
- ✅ `error` - Error handler
- ✅ `routes` - Route definitions

Cannot be updated:
- ❌ `port` - Port number
- ❌ `hostname` - Hostname
- ❌ `websocket` - WebSocket handlers
- ❌ `tls` - TLS configuration

### Example

```typescript
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return Response.json({ version: "v1" });
  },
});

// Update to new handler
server.reload({
  fetch(req) {
    return Response.json({ version: "v2" });
  },
});
```

### Advanced Example

```typescript
let version = "1.0.0";

const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/api/version") {
      return Response.json({ version });
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

// Reload with new version
function updateVersion(newVersion: string) {
  version = newVersion;
  
  server.reload({
    fetch(req) {
      const url = new URL(req.url);
      
      if (url.pathname === "/api/version") {
        return Response.json({ version });
      }
      
      return new Response("Not Found", { status: 404 });
    },
  });
  
  console.log(`✅ Server reloaded with version ${newVersion}`);
}

// Update version without restart
updateVersion("2.0.0");
```

## 3. Complete Example

```typescript
import type { Server } from 'bun';

interface AppState {
  version: string;
  requestCount: number;
}

const state: AppState = {
  version: '1.0.0',
  requestCount: 0,
};

const server = Bun.serve({
  port: 3000,
  fetch(req: Request, server: Server) {
    state.requestCount++;
    const url = new URL(req.url);

    // Version endpoint
    if (url.pathname === '/api/version') {
      return Response.json({
        version: state.version,
        requestCount: state.requestCount,
      });
    }

    // Reload endpoint
    if (url.pathname === '/api/reload' && req.method === 'POST') {
      state.version = '2.0.0';
      
      server.reload({
        fetch(req: Request) {
          state.requestCount++;
          
          if (new URL(req.url).pathname === '/api/version') {
            return Response.json({
              version: state.version,
              requestCount: state.requestCount,
            });
          }
          
          return new Response('Not Found', { status: 404 });
        },
      });

      return Response.json({ reloaded: true, version: state.version });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log('✅ Server running on http://localhost:3000');
```

## Testing

### Test server.reload()

```bash
# Terminal 1: Start server
bun server-control-demo.ts

# Terminal 2: Test endpoints
curl http://localhost:3001/api/version
# {"version":"1.0.0","requestCount":1,"reloadCount":0,"uptime":0}

curl -X POST http://localhost:3001/api/reload
# {"reloaded":true,"version":"2.0.0","reloadCount":1}

curl http://localhost:3001/api/version
# {"version":"2.0.0","requestCount":3,"reloadCount":1,"uptime":1}
```

### Test server.unref() / server.ref()

```bash
# Start server
bun server-control-demo.ts

# Call unref endpoint
curl -X POST http://localhost:3001/api/unref
# Process will exit when no other tasks remain

# Call ref endpoint
curl -X POST http://localhost:3001/api/ref
# Process will stay alive
```

## Integration with Nebula-Flow™

The web-app server now includes:

```typescript
// In web-app/server.js
export { server, disableServerRef, enableServerRef, reloadServerHandlers, getServerStatus };

// Usage
import { server, reloadServerHandlers } from './web-app/server.js';

// Hot reload handlers
reloadServerHandlers({
  fetch(req) {
    // New handler logic
  },
});

// Control process lifecycle
server.unref();  // Allow graceful shutdown
server.ref();    // Keep process alive
```

## Best Practices

1. **Use `server.unref()` for:**
   - Development environments with auto-reload
   - Graceful shutdown scenarios
   - Cleanup and resource management

2. **Use `server.ref()` for:**
   - Production deployments
   - Long-running services
   - Ensuring server stays alive

3. **Use `server.reload()` for:**
   - Development hot reloading
   - Configuration updates
   - Handler updates without restart
   - Testing new logic

4. **Avoid:**
   - Reloading WebSocket handlers (not supported)
   - Changing port/hostname (not supported)
   - Frequent reloads in production (use with caution)

## Performance Considerations

- `server.reload()` is fast (no restart needed)
- `server.ref()` / `server.unref()` are instant
- No downtime during reload
- Existing connections are maintained
- New requests use updated handlers

## See Also

- [Bun Server Documentation](https://bun.com/docs/runtime/http/server)
- [server-control-demo.ts](./server-control-demo.ts)
- [web-app/server.js](./web-app/server.js)

