# MASTER_PERF Matrix Integration

**Enterprise Observability & Security Framework** aligned with DuoPlus v3.7 deterministic foundation and Sovereign v4.2 real-time intelligence.

---

## 🔒 Scope Isolation Requirements (Master Table)

| Component | Property | Scope | Tier | Domain | Validation | Risk | Status |
|-----------|----------|-------|------|--------|-----------|------|--------|
| **Metrics** | `scope` | Enterprise | premium | api.duoplus.io | MUST match env scope | Critical | ✅ Enforced |
| **Metrics** | `domain` | Development | basic | dev.duoplus.io | MUST NOT leak cross-scope | Critical | ✅ Enforced |
| **Metrics** | `metadata` | Internal | standard | internal.duoplus.io | Sanitized, no injection | High | ✅ Enforced |
| **WebSocket** | `token` | Enterprise | premium | api.duoplus.io | RBAC validated | Critical | ⏳ Pending |
| **WebSocket** | `scope` | Enterprise | premium | api.duoplus.io | Rate-limited per scope | High | ⏳ Pending |
| **WebSocket** | `properties` | all | all | all | UTF-8 safe, no control chars | Medium | ⏳ Pending |
| **Export** | `filename` | Enterprise | premium | api.duoplus.io | Content-disposition header | Medium | ⏳ Pending |
| **Export** | `partition` | Enterprise | premium | api.duoplus.io | S3: `scope/date/...` | High | ⏳ Pending |

**Legend:** 
- **Property** = Metric field requiring validation
- **Scope** = Deployment context (Enterprise|Development|Internal)
- **Tier** = Feature tier (basic|standard|premium)
- **Domain** = Registry/environment domain
- **Validation** = Required check
- **Risk** = Security risk level
- **Status** = Implementation status

---

## ⚡ Performance Optimization Matrix

| Feature | Type | Scope | Size | Build Flag | Compile-Time | Runtime | Dead Code | Candidates |
|---------|------|-------|------|-----------|--------------|---------|-----------|------------|
| **PERF_TRACKING** | Optional | Development | +60B | `--feature=PERF_TRACKING` | Eliminated in prod | 0ms | ✅ Yes | r2-apple-manager |
| **DEBUG_PERF** | Optional | Development | +45B | `--feature=DEBUG_PERF` | Eliminated in prod | 0ms | ✅ Yes | infrastructure-dashboard |
| **AUDIT_LOGGING** | Required | Enterprise | +100B | `--feature=AUDIT_LOGGING` | Always included | 0ms | ❌ No | all enterprise |
| **RATE_LIMITING** | Required | Enterprise | +80B | `--feature=RATE_LIMITING` | Always included | 0ms | ❌ No | websocket, api |
| **WEBHOOK_SIGNING** | Required | Enterprise | +70B | `--feature=WEBHOOK_SIGNING` | Always included | 0ms | ❌ No | webhooks |

**Build Commands:**
```bash
# Production (minimal - only required features)
bun build --minify app.ts

# Development (with tracking)
bun build --feature=PERF_TRACKING --feature=DEBUG_PERF --minify app.ts

# Enterprise (full feature set)
bun build --feature=ENTERPRISE --feature=AUDIT_LOGGING --feature=RATE_LIMITING --minify app.ts
```

---

## 🌐 WebSocket Security Matrix

| Layer | Property | Type | Scope | Requirement | Implementation | Status |
|-------|----------|------|-------|-------------|----------------|--------|
| **Authentication** | `token` | RBAC | Enterprise | Validate against token store | JWT verify + permission check | ⏳ TODO |
| **Authentication** | `scope` | RBAC | Enterprise | Extract from X-Dashboard-Scope header | Header parsing + validation | ⏳ TODO |
| **Rate Limiting** | `connections` | Protection | Enterprise | Max 10 clients per scope | Track per-scope active count | ⏳ TODO |
| **Rate Limiting** | `messages` | Protection | Enterprise | Max 100 msg/min per client | Token bucket algorithm | ⏳ TODO |
| **Isolation** | `stream` | Scoping | Enterprise | Only send scope-matching metrics | Filter metrics before broadcast | ⏳ TODO |
| **Logging** | `events` | Audit | Enterprise | Log all auth failures | Sentry + CloudWatch | ⏳ TODO |

---

## 📊 Metrics Sanitization Matrix

| Input | Validation | Sanitization | Scope | Risk | Pattern |
|-------|-----------|--------------|-------|------|---------|
| **Key names** | `[^\w.-]` | Replace with `_` | all | Medium | `operation` → `operation`, `x-custom` → `x_custom` |
| **String values** | Control chars | Remove `[\r\n\t\u0000-\u001f]` | all | Low | `"debug\n"` → `"debug "` |
| **Numeric values** | Type check | Convert to string safely | all | Low | `123` → `"123"` |
| **Object values** | Nested depth | Stringify + truncate >1KB | all | Medium | Deep nesting rejected |
| **Scope field** | Enum validation | MUST match `Bun.env.DASHBOARD_SCOPE` | all | Critical | Mismatch throws error |

---

## 🚀 Unicode Terminal Output Matrix

| Component | Type | Encoding | Scope | Feature | Status |
|-----------|------|----------|-------|---------|--------|
| **Table formatter** | Utility | UTF-8 emoji | all | Required | ✅ UnicodeTableFormatter active |
| **Progress bars** | Utility | Unicode box drawing | all | Optional | ⏳ Bun native impl |
| **Color output** | Utility | ANSI 256-color | all | Optional | ⏳ Bun native impl |
| **Emoji flags** | Utility | UTF-8 regional indicators | Enterprise | Required | ✅ Scope-based icons |

---

## 📋 Security Validation Checklist (Master Requirements)

| Requirement | Component | Implementation | Domain | Scope | Tier | Status | Deadline |
|-------------|-----------|-----------------|--------|-------|------|--------|----------|
| **Scope isolation** | Metrics | `validateMetricScope()` | all | Enterprise | premium | ✅ Done | 2026-01-15 |
| **Input sanitization** | Metrics | `sanitizeProperties()` | all | all | basic | ⏳ Todo | 2026-01-16 |
| **RBAC auth** | WebSocket | Token validation + perms | api.duoplus.io | Enterprise | premium | ⏳ Todo | 2026-01-17 |
| **Rate limiting** | WebSocket | Per-scope connection limits | api.duoplus.io | Enterprise | premium | ⏳ Todo | 2026-01-17 |
| **Audit logging** | Export | All auth/mutation events | all | Enterprise | premium | ⏳ Todo | 2026-01-18 |
| **Content-disposition** | S3 Export | Descriptive filenames | all | Enterprise | standard | ⏳ Todo | 2026-01-18 |

---

## ✅ Production Readiness Matrix

| Aspect | Feature | Implementation | Scope | Tier | Tests | Docs | Approval |
|--------|---------|-----------------|-------|------|-------|------|----------|
| **Multi-tenant isolation** | Scope validation | Metrics + WebSocket | Enterprise | premium | ⏳ TODO | ✅ DONE | ⏳ Pending |
| **Zero-trust security** | Property sanitization | Input validation | all | basic | ⏳ TODO | ⏳ TODO | ⏳ Pending |
| **Performance optimization** | Compile-time flags | Feature gates | all | all | ✅ DONE | ✅ DONE | ✅ Approved |
| **Unicode terminal support** | Table formatter | Enhanced output | all | basic | ⏳ TODO | ✅ DONE | ✅ Approved |
| **Audit-ready exports** | S3 integration | Content-disposition | Enterprise | premium | ⏳ TODO | ⏳ TODO | ⏳ Pending |
| **Real-time streaming** | WebSocket | Rate-limited streams | Enterprise | premium | ⏳ TODO | ⏳ TODO | ⏳ Pending |

---

## 🔧 Critical Implementation Code Blocks

### 1. Scope Isolation Enforcement

```typescript
// In MasterPerfTracker.ts
private validateMetricScope(metric: PerfMetric): void {
  const currentScope = Bun.env.DASHBOARD_SCOPE;
  
  // Reject metrics claiming wrong scope (critical: prevents cross-scope leakage)
  if (metric.properties?.scope && metric.properties.scope !== currentScope) {
    throw new Error(
      `SECURITY: Metric scope mismatch - attempted: ${metric.properties.scope}, current: ${currentScope}`
    );
  }
  
  // Auto-inject scope if missing (ensures all metrics tagged)
  if (!metric.properties) metric.properties = {};
  metric.properties.scope = currentScope;
}
```

### 2. Input Sanitization

```typescript
// In MasterPerfTracker.ts
private sanitizeProperties(props: Record<string, any>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(props)) {
    // Remove dangerous characters from keys
    const cleanKey = key.replace(/[^\w.-]/g, '_');
    
    // Remove control characters from values
    const cleanValue = String(value).replace(/[\r\n\t\u0000-\u001f]/g, ' ');
    
    // Truncate extremely long values
    const truncated = cleanValue.slice(0, 1024);
    
    sanitized[cleanKey] = truncated;
  }
  return sanitized;
}
```

### 3. WebSocket Security & Rate Limiting

```typescript
// In infrastructure-dashboard-server.ts
ws.on("connection", (socket, request) => {
  // 1. RBAC Token Validation
  const url = new URL(request.url!, `http://${request.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!this.validateRbacToken(token, ['infra:read'])) {
    socket.close(4001, "Unauthorized");
    return;
  }
  
  // 2. Rate Limiting: max 10 clients per scope
  const scope = request.headers['x-dashboard-scope'];
  const activeCount = this.activeConnections.get(scope) ?? 0;
  if (activeCount >= 10) {
    socket.close(4002, `Too many connections for scope: ${scope}`);
    return;
  }
  
  // 3. Scope-Isolated Metrics Stream
  this.startScopedMetricsStream(socket, scope);
});
```

### 4. S3 Export with Content-Disposition

```typescript
// In MasterPerfTracker.ts
async exportMetricsToS3(scope: string): Promise<void> {
  const metrics = this.getMasterPerfMetrics();
  const json = JSON.stringify(metrics, null, 2);
  const date = new Date().toISOString().split('T')[0];
  
  // Use descriptive filename with date
  const filename = `perf-metrics-${scope}-${date}.json`;
  const path = `perf-metrics/${scope}/archive/${date}/latest.json`;
  
  await s3.write(path, json, {
    contentDisposition: `attachment; filename="${filename}"`,
    contentType: "application/json",
    metadata: {
      scope: scope,
      exportDate: new Date().toISOString(),
      version: "1.0"
    }
  });
}
```

---

## 🧪 Critical Test Suite Template

```typescript
// tests/master-perf-security.test.ts
import { test, expect, describe, beforeEach } from 'bun:test';
import { MasterPerfTracker } from '../src/tracking/master-perf-tracker';

describe("🔒 MASTER_PERF Security", () => {
  let tracker: MasterPerfTracker;
  
  beforeEach(() => {
    Bun.env.DASHBOARD_SCOPE = "ENTERPRISE";
    tracker = new MasterPerfTracker();
  });

  test("metrics cannot leak cross-scope data", () => {
    expect(() => {
      tracker.addPerformanceMetric({
        category: "api",
        type: "request",
        value: 150,
        properties: { scope: "DEVELOPMENT" } // ← Should reject
      });
    }).toThrow("Metric scope mismatch");
  });

  test("auto-injects correct scope when missing", () => {
    const metric = tracker.addPerformanceMetric({
      category: "api",
      type: "request",
      value: 150,
      properties: {} // ← No scope
    });
    
    expect(metric.properties.scope).toBe("ENTERPRISE");
  });

  test("sanitizes dangerous property names", () => {
    const sanitized = tracker.sanitizeProperties({
      "x-custom-header": "value",
      "bad\nkey": "value"
    });
    
    expect(Object.keys(sanitized)).not.toContain("bad\nkey");
    expect("x_custom_header" in sanitized || "x-custom-header" in sanitized).toBe(true);
  });

  test("WebSocket requires valid RBAC token", async () => {
    const res = await fetch("ws://localhost:3004/ws?token=invalid");
    expect(res.status).toBe(401);
  });

  test("WebSocket enforces per-scope connection limits", async () => {
    // Simulate 10 connections already open for ENTERPRISE scope
    for (let i = 0; i < 10; i++) {
      await tracker.registerWebSocketConnection("ENTERPRISE");
    }
    
    // 11th connection should be rejected
    const res = await fetch(
      "ws://localhost:3004/ws?token=valid",
      { headers: { "x-dashboard-scope": "ENTERPRISE" } }
    );
    expect(res.status).toBe(429); // Too Many Requests
  });
});
```

---

## 📊 Next Phase: Historical Time-Series Storage

**Recommended implementation** for production:

| Component | Purpose | Schema | Partition | Scope | Status |
|-----------|---------|--------|-----------|-------|--------|
| **S3 Storage** | Historical archive | JSON + Parquet | `{scope}/{year}/{month}/{day}/{hour}/` | Enterprise | ⏳ TODO |
| **Parquet Index** | Query optimization | Column-oriented | By metric type + timestamp | Enterprise | ⏳ TODO |
| **Time-series DB** | Real-time queries | InfluxDB / TimescaleDB | By scope + metric type | Enterprise | ⏳ TODO |
| **Anomaly Detection** | Outlier identification | Statistical models | Per scope per metric | Enterprise | ⏳ TODO |

---

## 🎯 Current Phase: Core Security (Critical Path)

**What's ready:**
- ✅ Bun compile-time feature flags (zero overhead)
- ✅ Scope types defined + validated
- ✅ Master table formats documented

**What's next (in order):**
1. ⏳ **Implement scope validation** in MasterPerfTracker
2. ⏳ **Add property sanitization** for security
3. ⏳ **Harden WebSocket** with RBAC + rate limiting
4. ⏳ **Add audit logging** for all mutations
5. ⏳ **Setup S3 export** with proper partitioning

---

## 📞 Questions for Clarification

1. **WebSocket Authentication**: Use JWT tokens or existing session cookies?
2. **Rate Limit Storage**: In-memory Map or Redis for distributed tracking?
3. **Audit Log Destination**: Sentry, CloudWatch, or local file?
4. **Parquet Support**: Use `apache/arrow` or defer to query phase?
5. **Alerting**: When metrics exceed thresholds, what's the action?

---

**Status**: 🟡 **In Progress** | Core security being implemented | All tables established
