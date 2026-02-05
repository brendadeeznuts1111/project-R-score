# 🐰 BUN-NATIVE PATTERNS GUIDE

This project strictly follows Bun-native principles. Always prefer built-in Bun APIs over external packages.

## Core Principles

### 1. **HTTP Requests** - Use `fetch` (built-in)
```typescript
// ✅ GOOD - Native Bun fetch
const response = await fetch('https://api.example.com/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
const data = await response.json();

// ❌ BAD - axios (external dependency)
const response = await axios.post('https://api.example.com/endpoint', data);
```

### 2. **Environment Secrets** - Use `.env` + `process.env`
```typescript
// ✅ GOOD - Bun auto-loads .env
const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;

// ❌ BAD - Manual dotenv loading
import dotenv from 'dotenv';
dotenv.config();
```

### 3. **File Uploads & FormData** - Use Bun's native FormData
```typescript
// ✅ GOOD - Bun FormData API
const formData = new FormData();
formData.append('file', await Bun.file('path/to/file').blob());
formData.append('media_data', buffer);

// ❌ BAD - form-data package
import FormData from 'form-data';
const form = new FormData();
```

### 4. **File System Operations** - Use `Bun.file()` and `Bun.write()`
```typescript
// ✅ GOOD - Bun file API
const file = Bun.file('path/to/file.json');
const content = await file.text();
await Bun.write('output.json', JSON.stringify(data));

// ❌ BAD - Node fs module
import fs from 'fs/promises';
const content = await fs.readFile('path/to/file.json', 'utf-8');
```

### 5. **Task Scheduling** - Use `Bun.Env` with native setTimeout/setInterval
```typescript
// ✅ GOOD - Native scheduling
setInterval(() => {
  checkRateLimit();
}, 60000); // Every minute

// For cron-like tasks, use Bun shell or custom scheduler

// ❌ BAD - node-cron package
import cron from 'node-cron';
cron.schedule('* * * * *', () => {});
```

### 6. **JSON Parsing** - Use native JSON
```typescript
// ✅ GOOD - Native JSON
const parsed = JSON.parse(jsonString);
const stringified = JSON.stringify(obj);

// ✅ ALSO GOOD - Bun bunFile to auto-parse
const config = await import('./config.json').default;
```

### 7. **HTTP Server** - Use Bun's native server
```typescript
// ✅ GOOD - Bun server
const server = Bun.serve({
  port: 3000,
  fetch(request) {
    return new Response('Hello!');
  },
});

// ❌ BAD - Express/Fastify
import express from 'express';
const app = express();
```

### 8. **Testing** - Use Bun's native test runner
```typescript
// ✅ GOOD - Bun test
import { describe, it, expect } from 'bun:test';

describe('MyFeature', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});

// ❌ BAD - Jest, Vitest
import { describe, it, expect } from 'vitest';
```

## Authentication: OAuth 1.0a for Twitter

Since we can't use the oauth-1.0a package, implement OAuth signing natively:

```typescript
// Use built-in crypto for HMAC-SHA1 signing
import { createHmac } from 'crypto';

function signOAuth1Request(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(new URLSearchParams(params).toString()),
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  return createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
}
```

## Project-Specific APIs

### Twitter/X API
- Use `fetch` with OAuth 1.0a signing (implement natively)
- Use Bun FormData for media uploads
- Store credentials in `.env`

### Email Service
- Use native fetch to call email API endpoints
- No external email packages needed

### SMS Gateway
- Use native fetch for API calls
- Validate credentials from `.env`

## Performance Tips

1. **Use Bun's fast startup** - Keep module imports minimal
2. **Leverage Bun's bundler** - Use `bun build` for production
3. **Stream large files** - Use Bun's stream API instead of loading in memory
4. **Web Socket support** - Bun has native WebSocket support

## Advanced Bun-Native Patterns

### 🍪 Cookie-Based Context Resolution
```typescript
import { parseCookies, getSetCookie } from "bun:cookie";

// Parse incoming cookies
const cookies = parseCookies(request.headers.get("cookie") || "");
const override = cookies["context-override"];

// Set response cookie
const setCookie = getSetCookie({
  name: "context-key",
  value: "value",
  maxAge: 3600,
  httpOnly: true,
  secure: Bun.env.NODE_ENV === "production"
});
```

### 🌐 WebSocket with Server Context
```typescript
const server = Bun.serve<{ context: Context }>({
  fetch: (request, server) => {
    // Attach context to server
    server.upgrade({ data: { context } });
  },
  websocket: {
    open(ws) {
      // Access attached context
      console.log(ws.data.context);
    },
    message(ws, message) {
      ws.send(JSON.stringify({ data: ws.data.context }));
    }
  }
});
```

### 📦 Bun.LRU Cache with TTL
```typescript
const cache = new Bun.LRU<string, CacheValue>({
  max: 100,        // Max entries
  ttl: 300_000     // 5 minute TTL in milliseconds
});

cache.set("key", value);
const cached = cache.get("key");
cache.delete("key");
```

### 🧪 Bun.test() with Mock
```typescript
import { describe, it, expect, mock } from "bun:test";

describe("Feature", () => {
  it("test with mock", () => {
    const fn = mock(() => "result");
    expect(fn()).toBe("result");
    expect(fn).toHaveBeenCalled();
  });
});
```

### 🔍 Bun.inspect() for Debugging
```typescript
// Rich inspect output in debug routes
const data = {
  memory: Bun.memoryUsage(),
  features: Bun.features,
  uptime: process.uptime(),
  gc: Bun.gc(true)
};

return Response.json(data);
```

### ⚙️ Bun.features for Feature Detection
```typescript
if (Bun.features.feature_name) {
  // Use feature-specific code
}
```

### 🎯 Bun.match() for Pattern Matching
```typescript
// Faster than Array.find() for large datasets
const result = Bun.match(largeArray, item => 
  item.condition === target
);
```

### 📁 File Streaming with Bun.file()
```typescript
// Stream large files without loading in memory
const file = Bun.file('large-file.bin');
const stream = file.stream();

return new Response(stream, {
  headers: { 'Content-Type': file.type }
});
```

### 🔐 Crypto for OAuth Signing
```typescript
import { createHmac } from 'crypto';

function signOAuth1(method: string, url: string, params: Record<string, string>) {
  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(new URLSearchParams(params).toString())
  ].join('&');

  const key = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  return createHmac('sha1', key)
    .update(baseString)
    .digest('base64');
}
```

## Advanced Architecture Patterns

### Environment-Based Configuration
- Use `Bun.env` to load `.env` files automatically
- No dotenv package needed
- Access via `process.env.VARIABLE_NAME`

### Real-time Updates with Server.publish()
```typescript
// Publish message to all clients subscribed to topic
server.publish("topic", JSON.stringify(data));

// Client-side
ws.subscribe("topic");
```

### Memory Management
```typescript
// Manual GC when needed for high-throughput operations
const stats = Bun.gc(true);  // Force GC and return stats
console.log(`Memory used: ${stats.heapUsed / 1024 / 1024}MB`);
```

### Production Builds
```bash
bun build src/main.ts --target bun --minify --outdir dist
```

## Resources

- [Bun Official Docs](https://bun.sh/docs)
- [Bun API Reference](https://bun.sh/docs/api)
- [Bun.serve() Documentation](https://bun.sh/docs/api/http)
- [Bun WebSocket API](https://bun.sh/docs/api/websockets)
- [Twitter API v1.1 Documentation](https://developer.twitter.com/en/docs/twitter-api/v1-1)
