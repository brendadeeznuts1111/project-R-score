# A/B Variant Extensions

> **Four Advanced Features** for the A/B Variant Cookie System

## Overview

| Feature | File | Description | Benchmark |
|---------|------|-------------|-----------|
| **Zstd Compressed Snapshots** | `ab-variant-compressed.ts` | Compress A/B state for cookie transport | 5μs/op (zstd) |
| **Multi-Tenant Prefix Routing** | `ab-variant-multi-tenant.ts` | `tenant-a-ab-*`, `tenant-b-ab-*` prefixes | 0.77μs/op |
| **A/B Metrics Dashboard** | `ab-variant-dashboard.ts` | Real-time stats via HTTP + SSE | 0.17μs snapshot |
| **Variant Rollout Scheduler** | `ab-variant-scheduler.ts` | Time-based rollout (9am-5pm, 50%) | 0.46μs/op |

---

## 1. Zstd-Compressed Cookie Snapshots

**Use Case**: Transport large A/B state in cookies (4KB limit). Uses Bun.zstdCompressSync (2x gzip).

### Omega Pools + JSC + SQLite (`ab-variant-omega-pools-zstd.ts`)

JSC serialize (zero-copy) + Zstd + SQLite persistence. Perf: 8.4μs compress, 4.5μs decompress.

```bash
bun run ab:omega:zstd
bun run ab:omega:zstd:bench

curl -H "Cookie: ab-variant-a=enabled;sessionId=abc123" http://127.0.0.1:8085
curl -H "Cookie: sessionId=abc123" http://127.0.0.1:8085/restore
```

**Endpoints**: `/` (snapshot+persist), `/restore` (load from SQLite), `/bench` (perf).

### API

```typescript
import {
  compressState,
  decompressState,
  stateToCookieValue,
  cookieValueToState,
  parseSnapshotCookie,
  formatSnapshotCookie,
  createSnapshotFromCookies,
} from "./examples/ab-variant-compressed.ts";

// Compress state (zstd | deflate | gzip)
const { data, format } = compressState(state, { format: "zstd" });
const restored = decompressState(data, format);

// Cookie helpers
const cookieValue = stateToCookieValue(state, "zstd");
const snapshot = cookieValueToState(cookieValue);

// Parse from Cookie header
const snapshot = parseSnapshotCookie(req.headers.get("cookie") || "");

// Format Set-Cookie
const setCookie = formatSnapshotCookie(state, { format: "zstd", maxAge: 86400 });
```

### Performance (538 B state)

| Format | Compressed | Ratio | Time | Ops/Sec |
|--------|------------|-------|------|---------|
| Zstd | 179 B | 66.7% | 5μs | 219K |
| Deflate | 157 B | 70.8% | 9μs | 114K |
| Gzip | 175 B | 67.5% | 7μs | 135K |

### Endpoints

- `GET /snapshot` - Compress current state (with Cookie header)
- `GET /cookie` - Create Set-Cookie with compressed snapshot
- `GET /restore` - Decompress and return snapshot from cookie

```bash
bun run ab:compressed
curl -H "Cookie: ab-variant-a=enabled" http://127.0.0.1:8081/snapshot
```

---

## 2. Multi-Tenant Prefix Routing

**Use Case**: Route A/B variants by tenant. Prefixes: `tenant-a-ab-*`, `tenant-b-ab-*`, `tenant-foo-ab-*`.

### Hardening (`ab-variant-hardening.ts`)

- **Memoized tenant parser** (LRU ~10) – cache hit ~2–4ns
- **Rate-limit guard** (500/min per tenant) – returns 429 when exceeded
- **Col-89 safe tenant log** – `logTenantAccess(tenant, variant, poolSize)`

### Tenant Resolution

1. **X-Tenant-ID** header
2. **Path** `/a/page` → tenant `a`
3. **Subdomain** `a.example.com` → tenant `a`

### API

```typescript
import {
  parseTenantCookieMap,
  parseAllTenantCookies,
  resolveTenantFromRequest,
  tenantPrefix,
  formatTenantCookie,
} from "./examples/ab-variant-multi-tenant.ts";

// Resolve tenant from request
const tenantId = resolveTenantFromRequest(req) ?? "default";

// Parse tenant-specific cookies
const prefix = tenantPrefix(tenantId); // "tenant-a-ab-"
const cookies = parseTenantCookieMap(cookieHeader, prefix);

// Parse all tenants
const all = parseAllTenantCookies(cookieHeader);
// Map<"tenant-a", Map<"tenant-a-ab-variant-1", "enabled">>

// Format Set-Cookie
const setCookie = formatTenantCookie("a", "enabled");
// "tenant-a-ab-enabled=enabled;Path=/;Max-Age=86400;..."
```

### Performance

| Operation | Time | Ops/Sec |
|-----------|------|---------|
| Parse all tenants (3) | 1.49μs | 673K |
| Parse single tenant | 0.77μs | 1.3M |

```bash
bun run ab:multitenant
curl -H "X-Tenant-ID: a" -H "Cookie: tenant-a-ab-variant-1=enabled" http://127.0.0.1:8082
```

---

## 3. A/B Metrics Dashboard

**Use Case**: Real-time variant distribution and conversion stats via HTTP + SSE.

### API

```typescript
import {
  recordImpression,
  recordConversion,
  getSnapshot,
  broadcastSnapshot,
  startDashboard,
} from "./examples/ab-variant-dashboard.ts";

// Record events (from Cookie header)
recordImpression("enabled");
recordConversion("enabled");

// Get snapshot
const snapshot = getSnapshot();
// { variants, totalImpressions, totalConversions, timestamp, uptime }
```

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | HTML dashboard (auto-refresh via SSE) |
| `/events` | GET | SSE stream (real-time metrics) |
| `/metrics` | GET | JSON snapshot |
| `/impression` | GET | Record impression (with Cookie) |
| `/convert` | GET | Record conversion (with Cookie) |
| `/reset` | GET | Reset metrics |

### Performance

| Operation | Time |
|-----------|------|
| Record impression | 0.91μs |
| Get snapshot | 0.17μs |

```bash
bun run ab:dashboard
curl http://127.0.0.1:8083
curl -H "Cookie: ab-variant-a=enabled" http://127.0.0.1:8083/impression
curl http://127.0.0.1:8083/metrics
```

---

## 4. Variant Rollout Scheduler

**Use Case**: Time-based rollout. Mon-Fri 9am-5pm = 50% enabled; 5pm-9am = 25% disabled; Weekend = control.

### API

```typescript
import {
  resolveScheduledVariant,
  isInWindow,
  hashToPercent,
} from "./examples/ab-variant-scheduler.ts";

const config: SchedulerConfig = {
  defaultVariant: "control",
  rules: [
    {
      variant: "enabled",
      percentage: 50,
      window: { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] },
      priority: 10,
    },
  ],
};

const { variant, reason } = resolveScheduledVariant(
  config,
  cookies,
  sessionId,
  new Date(),
);
// variant: "enabled" | "disabled" | "control"
// reason: "cookie" | "schedule" | "default"
```

### Time Window

```typescript
interface TimeWindow {
  start: string;    // "09:00"
  end: string;      // "17:00"
  days?: number[];  // [1,2,3,4,5] = Mon-Fri
}
```

### Performance

| Operation | Time | Ops/Sec |
|-----------|------|---------|
| Resolve variant | 0.46μs | 2.2M |

```bash
bun run ab:scheduler
curl http://127.0.0.1:8084/schedule
```

---

## Quick Commands

```bash
# Compressed snapshots
bun run ab:compressed
bun run ab:compressed:bench

# Multi-tenant
bun run ab:multitenant
bun run ab:multitenant:bench

# Dashboard
bun run ab:dashboard
bun run ab:dashboard:bench

# Scheduler
bun run ab:scheduler
bun run ab:scheduler:bench
```

---

## Port Assignments

| Service | Port |
|---------|------|
| ab:server | 8080 |
| ab:omega | 8080 |
| ab:compressed | 8081 |
| ab:multitenant | 8082 |
| ab:dashboard | 8083 |
| ab:scheduler | 8084 |

---

## Integration Example

```typescript
// Combined: Multi-tenant + Compressed + Scheduler + Dashboard
import { parseTenantCookieMap, tenantPrefix, resolveTenantFromRequest } from "./ab-variant-multi-tenant.ts";
import { parseSnapshotCookie, createSnapshotFromCookies } from "./ab-variant-compressed.ts";
import { resolveScheduledVariant } from "./ab-variant-scheduler.ts";
import { recordImpression } from "./ab-variant-dashboard.ts";

const tenantId = resolveTenantFromRequest(req) ?? "default";
const prefix = tenantPrefix(tenantId);
const cookies = parseTenantCookieMap(req.headers.get("cookie") ?? "", prefix);

// Try compressed snapshot first
let state = parseSnapshotCookie(req.headers.get("cookie") ?? "");
if (!state) {
  state = createSnapshotFromCookies(req.headers.get("cookie") ?? "");
}

const { variant } = resolveScheduledVariant(config, cookies, sessionId);
recordImpression(variant);

return Response.json({ variant, tenantId, state });
```

---

*Built with Bun 1.3.7+ • Tier-1380 Compliant*
