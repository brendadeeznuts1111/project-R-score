# Bun v1.2.13 Updates for P2P Proxy

## Overview

Bun v1.2.13 includes several improvements that enhance our P2P Proxy system:

## 1. WebSocket Proxy Support

### What's New
- Full support for `ws://` and `wss://` through HTTP/HTTPS proxies
- Basic authentication for proxy connections
- Custom proxy headers
- Full TLS configuration (ca, cert, key, passphrase)

### How It Helps Our P2P Proxy

Our real-time dashboard (`dashboard/p2p-dashboard.ts`) uses WebSockets. In production, you might need to:

```typescript
// Run dashboard behind corporate proxy
const ws = new WebSocket('wss://your-domain.com/ws', {
  // NEW in Bun v1.2.13: Proxy support
  proxy: {
    url: 'http://corporate-proxy:8080',
    // Basic auth
    username: 'proxy-user',
    password: 'proxy-pass',
    // Custom headers
    headers: {
      'X-Proxy-Auth': 'custom-token'
    }
  },
  // Full TLS configuration
  tls: {
    ca: await Bun.file('/path/to/ca.crt').text(),
    cert: await Bun.file('/path/to/client.crt').text(),
    key: await Bun.file('/path/to/client.key').text(),
    passphrase: 'key-password'
  }
});
```

### Use Cases
- **Corporate environments**: Dashboard behind corporate proxy
- **TLS mutual auth**: Secure WebSocket with client certificates
- **Custom CA**: Self-signed certificates in internal networks

## 2. SQLite 3.51.2 Update

### What's New
- DISTINCT and OFFSET clause fixes
- Improved WAL mode locking
- Cursor renumbering fixes

### Impact on P2P Proxy

Our system uses **Redis** for real-time data, but if you want to add local caching:

```typescript
import { Database } from 'bun:sqlite';

// Local transaction cache (fallback if Redis unavailable)
const db = new Database('p2p-cache.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    stealth_id TEXT,
    amount REAL,
    bonus REAL,
    provider TEXT,
    timestamp INTEGER
  )
`);

// Insert with WAL mode (improved in 3.51.2)
db.exec('PRAGMA journal_mode = WAL');
```

### When to Use
- **Offline mode**: Cache transactions when Redis is down
- **Local analytics**: Fast queries on transaction history
- **Backup**: Redundant storage for critical payments

## 3. Node.js Compatibility Fixes

### Relevant Fixes

#### a) `node:http` CONNECT Event Handler
Fixed pipelined data in head parameter - improves compatibility with:
- Cap'n Proto's KJ HTTP library
- Cloudflare's workerd runtime

**Impact**: If we deploy P2P Proxy to Cloudflare Workers, this fix ensures proper HTTP CONNECT handling.

#### b) Temp Directory Resolution
Now correctly checks `TMPDIR`, `TMP`, `TEMP` environment variables.

**Impact**: Better cross-platform temporary file handling for receipt generation.

#### c) `node:zlib` Memory Leak Fix
Fixed memory leak in Brotli, Zstd, Zlib compression streams.

**Impact**: If we add response compression to the payment page:

```typescript
import { gzipSync } from 'node:zlib';

// Before v1.2.13: Memory leak on repeated compression
// After v1.2.13: Fixed!
const compressed = gzipSync(html);
```

#### d) `ws` Module Agent Option
The `ws` module now correctly supports the `agent` option for proxy connections.

**Impact**: Better compatibility with existing Node.js WebSocket libraries if migrating.

## 4. Recommended Production Configuration

### With WebSocket Proxy Support

```typescript
// dashboard/p2p-dashboard-production.ts
const server = serve({
  port: PORT,
  hostname: '0.0.0.0',
  
  async fetch(req, server) {
    // WebSocket with TLS and proxy support
    if (req.url.endsWith('/ws')) {
      const success = server.upgrade(req, {
        // NEW: TLS configuration for WebSocket
        tls: {
          cert: await Bun.file('/etc/ssl/cert.pem').text(),
          key: await Bun.file('/etc/ssl/key.pem').text(),
        }
      });
      return success ? undefined : new Response('Upgrade failed', { status: 400 });
    }
    // ...
  }
});
```

### Environment Variables

```bash
# .env.production
# WebSocket proxy (if behind corporate proxy)
WS_PROXY_URL=http://proxy.company.com:8080
WS_PROXY_USERNAME=proxy-user
WS_PROXY_PASSWORD=proxy-pass

# Temp directory (now properly resolved in v1.2.13)
TMPDIR=/var/tmp

# TLS certificates
TLS_CERT_PATH=/etc/ssl/certs/p2p-proxy.crt
TLS_KEY_PATH=/etc/ssl/private/p2p-proxy.key
```

## 5. Migration Notes

### From Node.js WebSocket Libraries

If migrating from `ws` or `socket.io`:

```typescript
// Before (Node.js with 'ws' library)
import WebSocket from 'ws';
const ws = new WebSocket('wss://server.com', {
  agent: new HttpsProxyAgent('http://proxy:8080')
});

// After (Bun v1.2.13 native)
const ws = new WebSocket('wss://server.com', {
  proxy: {
    url: 'http://proxy:8080',
    // agent option now supported!
  }
});
```

## 6. Testing Proxy Connections

```typescript
// tests/websocket-proxy-test.ts
async function testWebSocketProxy() {
  const ws = new WebSocket('wss://your-domain.com/ws', {
    proxy: {
      url: process.env.WS_PROXY_URL!,
      username: process.env.WS_PROXY_USERNAME,
      password: process.env.WS_PROXY_PASSWORD,
    }
  });
  
  ws.onopen = () => {
    console.log('✅ WebSocket connected through proxy');
  };
  
  ws.onerror = (err) => {
    console.error('❌ WebSocket error:', err);
  };
}
```

## Summary

Bun v1.2.13 makes our P2P Proxy more production-ready:

| Feature | Benefit |
|---------|---------|
| WebSocket Proxy | Deploy behind corporate firewalls |
| TLS Config | Mutual auth for secure environments |
| SQLite 3.51.2 | Reliable local caching fallback |
| Node.js Compat | Easier migration from existing systems |
| Memory Leak Fix | Stable long-running processes |

## References

- [Bun v1.2.13 Release Notes](https://bun.sh/blog/bun-v1.2.13)
- [WebSocket Documentation](https://bun.sh/docs/api/websockets)
- [SQLite Documentation](https://bun.sh/docs/api/sqlite)
