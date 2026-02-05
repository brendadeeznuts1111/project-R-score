# HTTP Agent Connection Pool Improvements

**Status**: ✅ Fixed in Bun v1.3.4+  
**Bun Version**: v1.3.4+  
**Last Updated**: 2025-12-08

**📊 Related Dashboards**:
- [MLGS Developer Dashboard](./../dashboard/mlgs-developer-dashboard.html) - Monitor connection pool metrics
- [Multi-Layer Graph Dashboard](./../dashboard/multi-layer-graph.html) - View proxy connection reuse stats
- [Main Dashboard](./../dashboard/index.html) - System-wide connection health

## Overview

Bun v1.3.4 fixes a critical bug where `http.Agent` with `keepAlive: true` was not properly reusing connections in certain cases. This fix improves performance for applications making multiple HTTP requests to the same host.

---

## The Problem

### Before Fix

`http.Agent` with `keepAlive: true` was not reliably reusing connections, leading to:

- ❌ Unnecessary connection establishment overhead
- ❌ Higher latency for repeated requests
- ❌ Increased resource usage
- ❌ Slower API response times

**Example**:
```typescript
import http from "node:http";

const agent = new http.Agent({ keepAlive: true });

// Connections were not properly reused
http.request({
  hostname: "example.com",
  port: 80,
  path: "/",
  agent: agent,
}, (res) => {
  // Connection reuse was unreliable
});
```

---

## The Fix

### After Fix

`http.Agent` now properly reuses connections when `keepAlive: true` is enabled:

- ✅ Connections are properly reused
- ✅ Reduced connection establishment overhead
- ✅ Lower latency for repeated requests
- ✅ Better resource utilization

**Example**:
```typescript
import http from "node:http";

const agent = new http.Agent({ keepAlive: true });

// Connections are now properly reused
http.request({
  hostname: "example.com",
  port: 80,
  path: "/",
  agent: agent,
}, (res) => {
  // Connection reuse works reliably
});
```

---

## Performance Impact

### Connection Reuse Benefits

**Before Fix**:
- Each request: New connection establishment (~50-100ms overhead)
- No connection reuse
- Higher latency

**After Fix**:
- First request: Connection establishment (~50-100ms)
- Subsequent requests: Connection reuse (~1-5ms overhead)
- **80-95% reduction** in connection overhead for repeated requests

### Real-World Impact

For applications making multiple requests to the same host:

- **API Clients**: Faster response times
- **Web Scraping**: Improved throughput
- **Microservices**: Better inter-service communication
- **Data Fetching**: Reduced latency

---

## Usage Examples

### Basic HTTP Agent Usage

```typescript
import http from "node:http";

// Create agent with keepAlive enabled
const agent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,  // Keep connections alive for 1 second
  maxSockets: 50,        // Maximum 50 sockets per host
  maxFreeSockets: 10,    // Keep 10 free sockets
});

// Make multiple requests
const makeRequest = (path: string) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "api.example.com",
      port: 443,
      path: path,
      agent: agent,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(data));
    });
    
    req.on("error", reject);
    req.end();
  });
};

// First request establishes connection
await makeRequest("/api/users");

// Subsequent requests reuse the connection
await makeRequest("/api/posts");
await makeRequest("/api/comments");
```

### HTTPS Agent Usage

```typescript
import https from "node:https";

const agent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
});

const req = https.request({
  hostname: "api.example.com",
  port: 443,
  path: "/api/data",
  agent: agent,
}, (res) => {
  // Connection reused for subsequent requests
});
```

### With Fetch API

While `fetch()` doesn't directly use `http.Agent`, Bun's internal HTTP client benefits from the same connection pooling improvements:

```typescript
// Bun's fetch() automatically benefits from improved connection pooling
const response1 = await fetch("https://api.example.com/users");
const response2 = await fetch("https://api.example.com/posts");
// Connection is automatically reused
```

---

## Integration with NEXUS Platform

### API Clients

All HTTP clients in the NEXUS platform benefit from improved connection pooling:

**WorkersAPIClient** (`src/api/workers-client.ts`):
```typescript
// Multiple requests to the same base URL benefit from connection reuse
const client = new WorkersAPIClient("https://api.example.com");
await client.getMarkets();
await client.getEvents();
// Connection is reused
```

**MarketProbeService** (`src/hyper-bun/market-probe-service.ts`):
```typescript
// Repeated requests to bookmaker APIs benefit from connection reuse
await this.probeDarkPoolMarket("bookmaker1", "market1");
await this.probeDarkPoolMarket("bookmaker1", "market2");
// Connection to bookmaker1 is reused
```

### Fetch Wrapper

The `fetchWithErrorHandling` utility (`src/utils/fetch-wrapper.ts`) automatically benefits:

```typescript
// All fetch calls benefit from improved connection pooling
const data1 = await fetchWithErrorHandling("https://api.example.com/data1");
const data2 = await fetchWithErrorHandling("https://api.example.com/data2");
// Connection is reused
```

---

## Best Practices

### 1. Use KeepAlive for Repeated Requests

```typescript
// ✅ Good - Use keepAlive for multiple requests
const agent = new http.Agent({ keepAlive: true });
for (const url of urls) {
  http.request({ hostname: url, agent }, callback);
}

// ❌ Avoid - Creating new agent for each request
for (const url of urls) {
  const agent = new http.Agent({ keepAlive: true });
  http.request({ hostname: url, agent }, callback);
}
```

### 2. Configure Agent Limits

```typescript
// ✅ Good - Configure appropriate limits
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,        // Maximum concurrent connections
  maxFreeSockets: 10,   // Keep free sockets for reuse
  keepAliveMsecs: 1000, // Keep connections alive for 1 second
});

// ❌ Avoid - Using default limits without consideration
const agent = new http.Agent({ keepAlive: true });
```

### 3. Reuse Agent Instances

```typescript
// ✅ Good - Reuse agent instance
const agent = new http.Agent({ keepAlive: true });
const client = new APIClient(agent);

// ❌ Avoid - Creating new agent for each client
class APIClient {
  constructor() {
    this.agent = new http.Agent({ keepAlive: true }); // Created per instance
  }
}
```

---

## Troubleshooting

### Connection Not Being Reused

**Symptom**: Connections are still being established for each request

**Possible Causes**:
1. `keepAlive: true` not set
2. Different hosts/ports (connections are per host:port)
3. Agent instance not reused

**Solution**:
```typescript
// Ensure keepAlive is enabled
const agent = new http.Agent({ keepAlive: true });

// Reuse the same agent instance
http.request({ hostname: "example.com", agent }, callback);
```

### Too Many Connections

**Symptom**: Too many connections open

**Solution**: Configure `maxSockets` and `maxFreeSockets`
```typescript
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,        // Limit concurrent connections
  maxFreeSockets: 5,    // Limit free sockets
});
```

---

## Migration Notes

### No Code Changes Required

This fix is **backward compatible**. Existing code automatically benefits:

- ✅ No code changes needed
- ✅ Existing `http.Agent` usage works better
- ✅ No breaking changes

### Verification

To verify connection reuse is working:

1. Monitor network connections (e.g., `netstat`, `lsof`)
2. Check connection establishment times
3. Verify reduced latency for repeated requests

---

## References

- **Bun Release Notes**: https://bun.com/blog/bun-v1.3.4#http-agent-connection-pool-now-properly-reuses-connections
- **Node.js http.Agent**: https://nodejs.org/api/http.html#class-httpagent
- **HTTP Keep-Alive**: RFC 7230

---

## Status

✅ **Bug fixed in Bun v1.3.4+**  
✅ **Backward compatible**  
✅ **Performance improvements verified**  
✅ **No migration required**
