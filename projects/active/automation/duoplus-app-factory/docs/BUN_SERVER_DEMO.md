# Bun Server API Demo - Complete Guide

## Overview

This demo showcases the latest Bun server APIs with working examples on macOS:

✅ **Unix Socket Support** - Filesystem-based sockets (macOS compatible)  
✅ **Idle Timeout** - 10-second idle timeout configuration  
✅ **Export Default Syntax** - Modern Bun.serve() pattern  
✅ **Hot Reload** - Dynamic route updates without restart  
✅ **Type Safety** - Full TypeScript support  

## Files

### 1. `abstract-hot-reload.ts`
Basic demo with Unix socket and hot reload functionality.

**Features:**
- Unix socket at `./my-socket.sock`
- 10-second idle timeout
- `/reload` endpoint for hot reload
- `/api/version` endpoint
- `/health` endpoint

**Run:**
```bash
bun abstract-hot-reload.ts
```

**Test:**
```bash
curl --unix-socket ./my-socket.sock http://localhost/api/version
curl --unix-socket ./my-socket.sock http://localhost/reload
curl --unix-socket ./my-socket.sock http://localhost/health
```

### 2. `bun-server-showcase.ts`
Comprehensive showcase of all Bun server APIs.

**Features:**
- Full TypeScript typing
- Request counting
- Server statistics
- Memory usage tracking
- Uptime monitoring
- Hot reload simulation

**Run:**
```bash
bun bun-server-showcase.ts
```

**Test:**
```bash
curl --unix-socket ./my-socket.sock http://localhost/api/stats
curl --unix-socket ./my-socket.sock http://localhost/health
```

## API Features Explained

### 1. Unix Socket (`unix: './my-socket.sock'`)

**What it does:**
- Creates a Unix domain socket instead of TCP
- No network overhead
- Perfect for local IPC (inter-process communication)
- macOS uses filesystem-based sockets (not abstract namespace)

**Benefits:**
- Faster than TCP for local communication
- More secure (filesystem permissions)
- No port conflicts
- Lower latency

**Usage:**
```typescript
export default {
  unix: './my-socket.sock',
  fetch(req) { /* ... */ }
}
```

### 2. Idle Timeout (`idleTimeout: 10`)

**What it does:**
- Closes connections idle for 10 seconds
- Prevents resource leaks
- Measured in seconds

**Benefits:**
- Automatic cleanup
- Prevents zombie connections
- Reduces memory usage
- Improves server stability

**Usage:**
```typescript
export default {
  idleTimeout: 10, // 10 seconds
  fetch(req) { /* ... */ }
}
```

### 3. Export Default Syntax

**What it does:**
- Modern ES module pattern
- Bun automatically calls `Bun.serve()` with the exported object
- Cleaner, more readable code

**Benefits:**
- No boilerplate
- Type-safe with `satisfies`
- Works with hot reload
- Standard JavaScript pattern

**Usage:**
```typescript
export default {
  unix: './socket.sock',
  idleTimeout: 10,
  fetch(req, server) { /* ... */ }
} satisfies Parameters<typeof Bun.serve>[0];
```

### 4. Hot Reload Pattern

**What it does:**
- Update application state without restarting
- Simulated via state mutation in this demo
- Can be extended with file watching

**Benefits:**
- Zero-downtime updates
- Faster development
- Better user experience
- Maintains connections

**Usage:**
```typescript
let version = '1.0.0';

fetch(req) {
  if (req.url.includes('/reload')) {
    version = '2.0.0'; // Hot reload
    return Response.json({ version });
  }
}
```

## Test Results

### Test 1: Version Endpoint
```bash
$ curl --unix-socket ./my-socket.sock http://localhost/api/version
{"version":"1.0.0","timestamp":"2026-01-22T00:02:24.091Z"}
```

### Test 2: Hot Reload
```bash
$ curl --unix-socket ./my-socket.sock http://localhost/reload
{"reloaded":true,"version":"2.0.0","requestCount":3}
```

### Test 3: Version After Reload
```bash
$ curl --unix-socket ./my-socket.sock http://localhost/api/version
{"version":"2.0.0","timestamp":"2026-01-22T00:02:24.114Z"}
```

### Test 4: Health Check
```bash
$ curl --unix-socket ./my-socket.sock http://localhost/health
{
  "status":"healthy",
  "uptime":2.040459666,
  "memory":{
    "rss":21430272,
    "heapTotal":694272,
    "heapUsed":276972
  }
}
```

## Key Takeaways

1. **Unix Sockets** - Use for local IPC, faster than TCP
2. **Idle Timeout** - Prevents resource leaks, improves stability
3. **Export Default** - Modern, clean syntax with type safety
4. **Hot Reload** - Update state without restarting server
5. **Type Safety** - Full TypeScript support with `satisfies`

## Production Considerations

- Use Unix sockets for microservices communication
- Set appropriate idle timeouts based on workload
- Implement proper error handling
- Monitor memory usage
- Use health checks for load balancers
- Consider graceful shutdown

## Next Steps

- Integrate with your existing services
- Add file watching for true hot reload
- Implement graceful shutdown
- Add metrics and monitoring
- Deploy to production

