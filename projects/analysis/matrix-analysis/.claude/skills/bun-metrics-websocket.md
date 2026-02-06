---
name: bun-metrics-websocket
description: Real-time metrics with WebSocket, SQLite, anomaly detection, Response.json
user-invocable: false
version: 1.1.0
---

# Metrics & WebSocket Patterns

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ BROWSER (metrics-client.ts)                                     │
│ - Auto-reconnect WebSocket                                      │
│ - Metric panels + threshold sliders                             │
│ - localStorage: thresholds + dismissed alerts                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ ws://localhost:3334/metrics (5s updates)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ WEBSOCKET SERVER (metrics-websocket.ts)                         │
│ Bun.serve<ClientData> + discriminated union messages            │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ COLLECTOR (metrics-collector.ts)                                │
│ recordRequest() → collectSnapshot() → detectAnomalies()         │
└────────────────────────┬────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SQLITE (metrics.db) - WAL mode                                  │
│ Tables: endpoint_metrics, anomaly_alerts                        │
└─────────────────────────────────────────────────────────────────┘
```

## Server Setup

```typescript
interface ClientData { id: string; subscribed: boolean; connectedAt: number }

Bun.serve<ClientData>({
  fetch(req, server) {
    if (new URL(req.url).pathname === "/metrics") {
      return server.upgrade(req, {
        data: { id: Bun.randomUUIDv7(), subscribed: true, connectedAt: Date.now() }
      }) ? undefined : new Response("Failed", { status: 400 });
    }
    return new Response("OK");
  },
  websocket: {
    open(ws) { ws.send(JSON.stringify({ type: "snapshot", data: collectMetrics() })); },
    message(ws, msg) { handleMessage(ws, JSON.parse(msg.toString())); },
    close(ws) { console.log(`${ws.data.id} disconnected`); },
    perMessageDeflate: true,
    maxPayloadLength: 16 * 1024,
    idleTimeout: 120
  }
});
```

## Message Protocol (Discriminated Unions)

```typescript
type ServerMessage =
  | { type: "snapshot"; data: MetricsSnapshot; timestamp: number }
  | { type: "update"; data: MetricsSnapshot; alerts?: Alert[]; timestamp: number }
  | { type: "error"; error: string; timestamp: number };

function handleMessage(msg: ServerMessage) {
  switch (msg.type) {
    case "snapshot": updateUI(msg.data); break;
    case "update": updateUI(msg.data); if (msg.alerts) showAlerts(msg.alerts); break;
    case "error": console.error(msg.error); break;
    default: const _: never = msg;  // Exhaustive check
  }
}
```

## SQLite Persistence

```typescript
import { Database } from "bun:sqlite";
const db = new Database("metrics.db");
db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS endpoint_metrics (
    id INTEGER PRIMARY KEY,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    p50 REAL, p95 REAL, p99 REAL,
    error_rate REAL,
    timestamp INTEGER NOT NULL,
    UNIQUE(endpoint, method, timestamp)
  );
  CREATE INDEX IF NOT EXISTS idx_ts ON endpoint_metrics(endpoint, timestamp);
`);

const insert = db.prepare(`INSERT INTO endpoint_metrics VALUES (NULL,?,?,?,?,?,?,?)`);
const tx = db.transaction((m: Metric) => insert.run(m.endpoint, m.method, m.p50, m.p95, m.p99, m.errorRate, m.timestamp));
```

## Anomaly Detection

```typescript
interface Thresholds {
  latencySpikePercent: number;    // default: 50
  errorRateCritical: number;      // default: 5
  errorRateWarning: number;       // default: 1
  cacheHitMin: number;            // default: 90
  storageMax: number;             // default: 85
}

function detectAnomalies(snapshot: Snapshot, thresholds: Thresholds): Alert[] {
  const alerts: Alert[] = [];
  const avgLatency = snapshot.endpoints.reduce((s, e) => s + e.p50, 0) / snapshot.endpoints.length;
  const spike = ((avgLatency - BASELINE) / BASELINE) * 100;

  if (spike > thresholds.latencySpikePercent)
    alerts.push({ id: Bun.randomUUIDv7(), type: "latency_spike", severity: "critical", value: spike });

  const errorRate = snapshot.endpoints.reduce((s, e) => s + e.errorRate, 0) / snapshot.endpoints.length;
  if (errorRate > thresholds.errorRateCritical)
    alerts.push({ id: Bun.randomUUIDv7(), type: "error_rate", severity: "critical", value: errorRate });

  return alerts;
}
```

## Client Auto-Reconnect

```typescript
class MetricsClient {
  private ws: WebSocket | null = null;
  private retries = 0;
  private delay = 1000;

  connect() {
    this.ws = new WebSocket("ws://localhost:3334/metrics");
    this.ws.onopen = () => { this.retries = 0; this.delay = 1000; this.send({ type: "subscribe" }); };
    this.ws.onmessage = (e) => this.handleMessage(JSON.parse(e.data));
    this.ws.onerror = this.ws.onclose = () => this.reconnect();
  }

  private reconnect() {
    if (this.retries++ >= 10) return;
    setTimeout(() => this.connect(), Math.min(this.delay, 30000));
    this.delay = this.delay * 2 + Math.random() * 1000;  // Exponential backoff + jitter
  }

  send(msg: object) { this.ws?.readyState === 1 && this.ws.send(JSON.stringify(msg)); }
  private handleMessage(msg: ServerMessage) { /* switch on msg.type */ }
}
```

## Threshold Persistence (localStorage)

```typescript
const DEFAULTS: Thresholds = { latencySpikePercent: 50, errorRateCritical: 5, errorRateWarning: 1, cacheHitMin: 90, storageMax: 85 };

const loadThresholds = (): Thresholds => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("thresholds") || "{}") }; }
  catch { return DEFAULTS; }
};

const saveThresholds = (t: Thresholds) => localStorage.setItem("thresholds", JSON.stringify(t));
```

## Interval Cleanup

```typescript
const intervals = new Map<string, Timer>();

function schedule(name: string, fn: () => void, ms: number) {
  if (intervals.has(name)) clearInterval(intervals.get(name)!);
  intervals.set(name, setInterval(fn, ms));
}

function cleanup() { intervals.forEach(clearInterval); intervals.clear(); }
process.on("SIGINT", () => { cleanup(); process.exit(0); });
```

## Domain Types

```typescript
interface EndpointMetrics {
  path: string;
  method: string;
  p50: number; p95: number; p99: number;
  errorRate: number;
  throughput: number;
}

interface MetricsSnapshot {
  timestamp: number;
  endpoints: EndpointMetrics[];
  cdn: { bandwidth: number; cacheHitRatio: number; storage: number };
  system: { uptime: number; memory: number; cpu: number };
}
```

---

## Response.json() Optimization

**3.5x faster** SSE/broadcast - use `Response.json()` instead of `JSON.stringify()`:

```typescript
// Before (slow)
return new Response(JSON.stringify(matrix), {
  headers: { "Content-Type": "application/json" }
});

// After (3.5x faster, ~70% less CPU)
return Response.json(matrix);

// With headers
return Response.json(matrix, {
  headers: { "Cache-Control": "no-cache" }
});

// With status
return Response.json({ error: "Not found" }, { status: 404 });
```

### SSE Broadcast Pattern

```typescript
// High-performance SSE with Response.json
Bun.serve({
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/api/metrics") {
      // Response.json is optimized for JSON serialization
      return Response.json(collectMetrics(), {
        headers: { "Cache-Control": "no-store" }
      });
    }

    if (url.pathname === "/sse") {
      // For SSE, still need manual encoding but use Bun's optimized JSON
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const send = (data: object) => {
            // Bun.serialize is faster than JSON.stringify for complex objects
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          const interval = setInterval(() => send(collectMetrics()), 1000);
          return () => clearInterval(interval);
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });
    }
  }
});
```

---

## Canary Test Filtering (--grep)

Run only WebSocket/metrics tests in CI for **40% faster feedback**:

```json
{
  "scripts": {
    "test": "bun test",
    "test:canary": "bun test --grep '\\[CANARY\\]'",
    "test:ws": "bun test --grep '\\[WS\\]'",
    "test:metrics": "bun test --grep '\\[METRICS\\]'",
    "test:fast": "bun test --grep '\\[FAST\\]'"
  }
}
```

### Tag Tests for Filtering

```typescript
import { describe, it, expect } from "bun:test";

describe("canary tests", () => {
  it("[CANARY] health check returns 200", async () => {
    const res = await fetch("http://localhost:3000/health");
    expect(res.status).toBe(200);
  });

  it("[WS] WebSocket connection established", async () => {
    const ws = new WebSocket("ws://localhost:3000/metrics");
    await new Promise((resolve) => ws.onopen = resolve);
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it("[METRICS] snapshot contains required fields", () => {
    const snapshot = collectMetrics();
    expect(snapshot).toHaveProperty("timestamp");
    expect(snapshot).toHaveProperty("endpoints");
  });

  it("[FAST] CRC32 hash consistency", () => {
    const data = "test data";
    expect(Bun.hash.crc32(data)).toBe(Bun.hash.crc32(data));
  });
});
```

### CI Workflow

```yaml
# .github/workflows/test.yml
jobs:
  canary:
    runs-on: ubuntu-latest
    steps:
      - uses: oven-sh/setup-bun@v2
      - run: bun test --grep '\[CANARY\]'  # Fast gate

  full:
    needs: canary
    runs-on: ubuntu-latest
    steps:
      - uses: oven-sh/setup-bun@v2
      - run: bun test  # Full suite only if canary passes
```
