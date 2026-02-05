# Barbershop Fusion System - Council Review (n=14)

## Phase 1: Data Flow Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

Client Request (Payment/Ticket)
    │
    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Bun.serve  │────▶│  Redis Hash  │────▶│  Redis Pub   │
│   Routes/WS  │     │  barber:*    │     │  telemetry   │
└──────────────┘     └──────────────┘     └──────┬───────┘
    │                    │                       │
    ▼                    ▼                       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  bun:sqlite  │     │  Redis Set   │     │  WS Clients  │
│  (:memory:)  │     │  tickets:*   │     │  Admin/Barber│
└──────────────┘     └──────────────┘     └──────────────┘
    │                    │
    ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  Telemetry   │     │  Auto-Assign │
│  sessions    │     │  Logic       │
└──────────────┘     └──────────────┘

Critical Paths:
1. Payment → Redis hmset → SQLite INSERT → WS Publish
2. Barber Login → Redis hgetall → SQLite session → Cookie Set
3. WS Message → Redis subscribe → Server.publish → Client receive
4. Proxy Request → Bun.serve upgrade → WS with proxy headers

Concurrency Hotspots:
- Redis pub/sub (single thread, potential backpressure)
- SQLite :memory: (no WAL, blocking writes)
- WS message broadcast (O(n) loop over clients)
```

---

## Phase 2: Independent Critiques by Role

### 1. Bun Native APIs Expert
**Status:** ⚠️ NEEDS ATTENTION

| Issue | Location | Severity |
|-------|----------|----------|
| Using `new RedisClient()` without `connect()` check | dashboard.ts:88 | HIGH |
| Missing `Bun.Cookie` usage in favor of manual strings | dashboard.ts:229 | MEDIUM |
| `randomUUIDv7()` not using Bun's native UUID | dashboard.ts:4 | LOW |
| No HTTP/2 support in WebSocket upgrade | dashboard.ts:297 | LOW |

```typescript
// CURRENT (risky):
const pubsub = new RedisClient();
await pubsub.connect(); // Could fail, no retry

// RECOMMENDED:
const pubsub = new RedisClient(process.env.REDIS_URL || "redis://localhost:6379");
await pubsub.connect().catch(e => {
  console.error("Redis connection failed, using in-memory fallback");
  return createMemoryPubSub(); // Graceful degradation
});
```

### 2. Security Lead
**Status:** 🔴 CRITICAL

```
VULNERABILITIES FOUND:
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Hardcoded Secrets in Source Code                                    │
│    Line 81: await secrets.set({ service: 'admin', name: 'ADMIN_KEY',   │
│              value: 'godmode123' })                                    │
│    Risk: Secrets committed to git, exposed in bundle                   │
│    Fix: Load from env, use Bun.env.ADMIN_KEY                           │
├────────────────────────────────────────────────────────────────────────┤
│ 2. SQL Injection via String Concatenation                              │
│    Line 93: db.prepare('INSERT ... VALUES(?, ?, ?, ?)')               │
│    Status: SAFE (parameterized), but elsewhere unchecked               │
│    Risk: MEDIUM if dynamic table/column names added                    │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Missing Cookie Security Flags                                       │
│    Line 229: 'Set-Cookie': cookie.serialize(...)                       │
│    Issue: No __Host- prefix, no Partitioned for CHIPS                 │
│    Fix: Use Bun.Cookie with secure defaults                            │
├────────────────────────────────────────────────────────────────────────┤
│ 4. WebSocket Auth Bypass                                               │
│    Line 248: server.upgrade(req) without auth check                    │
│    Risk: Anyone can connect to admin WS                                │
│    Fix: Verify bearer token before upgrade                             │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Proxy-Authorization Header Leak                                     │
│    Not clearing sensitive headers in proxy mode                        │
│    Risk: Credentials forwarded to upstream                             │
│    Fix: Header filter whitelist                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 3. Performance Engineer
**Status:** ⚠️ NEEDS ATTENTION

| Metric | Current | Target | Issue |
|--------|---------|--------|-------|
| SQLite writes | Blocking | Async | Using :memory: with no WAL |
| WS broadcast | O(n) loop | Redis pub/sub | Server.publish limited |
| Redis pipeline | Disabled | Auto-pipelining | Not leveraging Bun feature |
| Memory leaks | Possible | Tracked | No cleanup for closed WS |

```typescript
// MEMORY LEAK - WS not cleaned up:
websocket: {
  open(ws) { ws.subscribe('eod'); },  // Subscribed
  close(ws) { ws.unsubscribe('eod'); } // But what about error/timeout?
}

// FIX: Track all clients, cleanup on any disconnect
const clients = new Map<string, WebSocket>();

websocket: {
  open(ws) {
    const id = randomUUIDv7();
    clients.set(id, ws);
    ws.data = { id, subscribed: ['eod'] };
    ws.subscribe('eod');
  },
  close(ws) {
    const { id, subscribed } = ws.data;
    subscribed.forEach(ch => ws.unsubscribe(ch));
    clients.delete(id);
  }
}
```

### 4. Concurrency Specialist
**Status:** 🔴 CRITICAL

**Race Condition Identified:**
```typescript
// PROBLEM: Redis pub/sub in callback may miss messages
pubsub.subscribe('eod', (m) => server.publish('eod', m));

// ISSUE: If server.publish fails, message is lost
// ISSUE: No ordering guarantee across multiple instances
// ISSUE: subscribe callback is synchronous but publish is async

// FIX: Use proper async handling with retry
pubsub.subscribe('eod', async (message) => {
  const clients = Array.from(clients.values());
  await Promise.allSettled(
    clients.map(c => 
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject('timeout'), 5000);
        c.send(message);
        clearTimeout(timeout);
        resolve(true);
      })
    )
  );
});
```

### 5. Error Handling & Recovery
**Status:** 🔴 CRITICAL

```
UNHANDLED FAILURE MODES:
┌────────────────────────────────────────────────────────────────────┐
│ 1. Redis Connection Drop                                           │
│    - No reconnection logic                                         │
│    - Pub/sub messages lost silently                                │
│    - SQLite continues but data becomes stale                       │
├────────────────────────────────────────────────────────────────────┤
│ 2. SQLite Database Locked                                          │
│    - :memory: with concurrent writes                               │
│    - No busy_timeout set                                           │
│    - Could throw SQLITE_BUSY                                       │
├────────────────────────────────────────────────────────────────────┤
│ 3. WebSocket Proxy 407/Auth Failure                                │
│    - No handling for proxy auth required                           │
│    - Connection hangs indefinitely                                 │
├────────────────────────────────────────────────────────────────────┤
│ 4. Fetch Timeout (External APIs)                                   │
│    - No AbortController used                                       │
│    - Default 30s timeout may be too long                           │
├────────────────────────────────────────────────────────────────────┤
│ 5. Secrets Decryption Failure                                      │
│    - No fallback if Bun.secrets fails                              │
│    - App crashes on startup                                        │
└────────────────────────────────────────────────────────────────────┘
```

### 6. Observability Lead
**Status:** ⚠️ NEEDS ATTENTION

| Missing | Impact | Fix |
|---------|--------|-----|
| Structured logging (JSON) | Can't parse logs in Loki | Use `console.log(JSON.stringify({...}))` |
| Metrics endpoint | No Prometheus scraping | Add `/metrics` with bun-prometheus |
| Distributed tracing | Can't track request flow | Add OpenTelemetry spans |
| Health check | K8s can't verify status | Add `/health?ready=1` deep check |
| WS connection metrics | No visibility into client drops | Track connect/disconnect rates |

```typescript
// CURRENT: console.dir (human readable, not parseable)
console.dir(report, { depth: null });

// RECOMMENDED: Structured JSON logging
console.log(JSON.stringify({
  level: 'info',
  timestamp: new Date().toISOString(),
  event: 'payment_processed',
  amount: report.revenue,
  barber: report.barbers?.[0]?.name,
  trace_id: req.headers.get('x-trace-id') || randomUUIDv7()
}));
```

### 7. Testability Lead
**Status:** ⚠️ NEEDS ATTENTION

```
TEST GAPS:
┌────────────────────────────────────────────────────────────────────┐
│ 1. No Unit Tests                                                   │
│    - All logic in monolithic files                                 │
│    - Can't test validation logic in isolation                      │
├────────────────────────────────────────────────────────────────────┤
│ 2. No Integration Tests                                            │
│    - No test for Redis→SQLite→WS flow                             │
│    - No test for proxy auth flow                                   │
├────────────────────────────────────────────────────────────────────┤
│ 3. No Mocks                                                        │
│    - Can't run without Redis                                       │
│    - Can't run without real CashApp                                │
├────────────────────────────────────────────────────────────────────┤
│ 4. No Test Fixtures                                                │
│    - Sample data mixed with production code                        │
│    - Hard to reset state between tests                             │
└────────────────────────────────────────────────────────────────────┘
```

### 8. DX/Onboarding Lead
**Status:** ✅ GOOD

| Aspect | Status | Notes |
|--------|--------|-------|
| One-liner start | ✅ | `bun barbershop-dashboard.ts` |
| Env handling | ⚠️ | Hardcoded secrets, no .env.example |
| Documentation | ✅ | Inline comments good |
| Type safety | ✅ | TypeScript throughout |
| Hot reload | ❌ | No --watch mode for dev |

### 9. Maintainability/Tech Debt
**Status:** ⚠️ NEEDS ATTENTION

```
TECH DEBT ITEMS:
┌────────────────────────────────────────────────────────────────────┐
│ 1. HTML Templates in Source Code                                   │
│    - ADMIN_DASHBOARD is 400+ lines of inline HTML                  │
│    - Can't use JSX or template engine                              │
│    - No syntax highlighting                                        │
│    SOLUTION: Use Bun.file() to load external templates             │
├────────────────────────────────────────────────────────────────────┤
│ 2. No Dependency Version Locking                                   │
│    - Using Bun's built-ins (good) but no lockfile                  │
│    - If external deps added, no bun.lockb                          │
├────────────────────────────────────────────────────────────────────┤
│ 3. Monolithic Files                                                │
│    - dashboard.ts is 36KB (800+ lines)                             │
│    - Should split into routes/, middleware/, services/             │
├────────────────────────────────────────────────────────────────────┤
│ 4. Magic Numbers                                                   │
│    - Port 3000, 3005, 3006 scattered throughout                    │
│    - No config.ts centralization                                   │
└────────────────────────────────────────────────────────────────────┘
```

### 10. Architecture Lead
**Status:** ⚠️ NEEDS ATTENTION

| Decision | Current | Recommended |
|----------|---------|-------------|
| Routing | Inline object | File-based routing (like Next.js) |
| State | Redis + SQLite | Consider adding in-memory LRU for hot data |
| WS handling | Inline callbacks | Dedicated WS controller class |
| Proxy support | Basic | Full proxy chain with CONNECT tunneling |

### 11. Bun/Node Compatibility
**Status:** ✅ GOOD

| Feature | Bun | Node | Status |
|---------|-----|------|--------|
| bun:sqlite | ✅ | ❌ | Bun-only (acceptable) |
| RedisClient | ✅ | ❌ | Bun-only (acceptable) |
| WebSocket | ✅ | ✅ ws | API differs slightly |
| fetch | Native | node-fetch | Compatible |

### 12. Prod Risks Lead
**Status:** 🔴 CRITICAL

```
PRODUCTION BLOCKERS:
┌────────────────────────────────────────────────────────────────────┐
│ 1. SQLite 3.51.2 Bugs                                              │
│    - DISTINCT + OFFSET known issue in 3.51.2                       │
│    - Bun ships with SQLite 3.51.2                                  │
│    - Query pattern in use: SELECT DISTINCT ... OFFSET              │
│    MITIGATION: Upgrade Bun to 1.1.27+ or avoid DISTINCT+OFFSET    │
├────────────────────────────────────────────────────────────────────┤
│ 2. TLS Certificate Handling                                        │
│    - No cert reloading (requires restart)                          │
│    - No let's encrypt integration                                  │
├────────────────────────────────────────────────────────────────────┤
│ 3. Memory Growth (:memory: SQLite)                                 │
│    - No VACUUM scheduling                                          │
│    - Sessions table grows unbounded                                │
│    - telemetry table grows unbounded                               │
│    FIX: Add TTL cleanup job                                        │
├────────────────────────────────────────────────────────────────────┤
│ 4. NO_PROXY Not Respected                                          │
│    - WS proxy ignores NO_PROXY env var                             │
│    - Could route internal traffic through proxy                    │
└────────────────────────────────────────────────────────────────────┘
```

### 13. Redis Expert
**Status:** ⚠️ NEEDS ATTENTION

| Issue | Location | Fix |
|-------|----------|-----|
| No connection pooling | dashboard.ts:88 | Use connection per subscriber |
| No pipeline batching | Multiple hmsets | Use redis.pipeline() |
| Key expiration missing | barber:* | Add EXPIRE for temp data |
| No Redis Cluster support | - | Add RedisCluster detection |

### 14. SQLite Expert
**Status:** ⚠️ NEEDS ATTENTION

```typescript
// CURRENT: In-memory with no persistence
const db = new Database(':memory:');

// PROBLEM 1: Data lost on restart
// PROBLEM 2: No WAL mode (blocking writes)
// PROBLEM 3: No PRAGMA optimizations

// RECOMMENDED:
const db = new Database(process.env.DB_PATH || './barbershop.db', {
  create: true,
  readwrite: true
});

// Enable WAL for concurrent reads/writes
db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA synchronous = NORMAL');
db.run('PRAGMA cache_size = 10000');

// Add connection pooling for concurrent access
const pool = createSQLitePool(db, { maxConnections: 10 });
```

---

## Phase 3: Prioritized Fixes

### P0 - Block Production
1. **Remove hardcoded secrets** → Use Bun.env
2. **Add WS auth check** → Verify token before upgrade
3. **Fix SQLite 3.51.2 DISTINCT+OFFSET** → Upgrade Bun or rewrite queries
4. **Add Redis reconnection** → Exponential backoff

### P1 - High Priority
5. **Enable SQLite WAL mode** → Non-blocking writes
6. **Add structured logging** → JSON format
7. **Implement connection cleanup** → Prevent memory leaks
8. **Add health check endpoint** → For load balancers

### P2 - Medium Priority
9. **Split monolithic files** → Better organization
10. **Add test suite** → Bun:test framework
11. **Externalize HTML templates** → Bun.file() loading
12. **Add metrics endpoint** → Prometheus format

### P3 - Nice to Have
13. **HTTP/2 support** → ALPN negotiation
14. **Redis Cluster support** → Multi-node
15. **Let's Encrypt integration** → Auto TLS
16. **Hot reload for dev** → --watch mode

---

## One-Liner v2.0

```bash
# PRODUCTION-READY ONE-LINER (v2.0)
REDIS_URL="redis://localhost:6379" \
DB_PATH="./data/barbershop.db" \
ADMIN_KEY="$(openssl rand -hex 32)" \
PAYPAL_SECRET="$PAYPAL_SK" \
TLS_CERT="./certs/cert.pem" \
TLS_KEY="./certs/key.pem" \
LOG_LEVEL="info" \
METRICS_PORT="9090" \
bun run --watch src/index.ts --port 3000 --enable-wal --strict-tls
```

```typescript
// v2.0 ENTRY POINT (src/index.ts)
import { serve } from 'bun';
import { createLogger } from './lib/logger';
import { createDatabase } from './lib/db';
import { createRedis } from './lib/redis';
import { createMetrics } from './lib/metrics';
import { router } from './routes';

const config = {
  port: parseInt(Bun.env.PORT || '3000'),
  redisUrl: Bun.env.REDIS_URL || 'redis://localhost:6379',
  dbPath: Bun.env.DB_PATH || './barbershop.db',
  adminKey: Bun.env.ADMIN_KEY!,
  tls: Bun.env.TLS_CERT ? {
    cert: Bun.file(Bun.env.TLS_CERT),
    key: Bun.file(Bun.env.TLS_KEY!)
  } : undefined
};

const logger = createLogger({ level: Bun.env.LOG_LEVEL || 'info' });
const db = createDatabase(config.dbPath, { wal: true });
const redis = await createRedis(config.redisUrl, { logger });
const metrics = createMetrics({ port: parseInt(Bun.env.METRICS_PORT || '9090') });

const server = serve({
  port: config.port,
  tls: config.tls,
  fetch: router({ db, redis, logger, metrics, config }),
  websocket: {
    open: (ws) => {
      if (!authenticateWS(ws, config.adminKey)) {
        ws.close(1008, 'Unauthorized');
        return;
      }
      logger.info({ event: 'ws_connected', client: ws.data.id });
    },
    close: (ws) => {
      cleanupWS(ws);
      logger.info({ event: 'ws_disconnected', client: ws.data.id });
    }
  }
});

logger.info({ event: 'server_started', port: config.port });
```

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Critical (P0) | 4 | Must fix before prod |
| High (P1) | 4 | Fix within sprint |
| Medium (P2) | 4 | Fix within month |
| Low (P3) | 4 | Nice to have |

**Overall Assessment:** The codebase is functional for development but requires significant hardening for production use, particularly around secrets management, error handling, and observability.
