# 🗺️ ENGINEERING ROADMAP: Phase 2-4 Detailed Breakdown

**Updated:** 2026-01-15T07:00:00Z  
**Status:** Ready for Phase 2 Sprint Planning  
**Next Review:** 2026-01-20 (Phase 2 Checkpoint)

---

## Executive Timeline

```text
Phase 1 ✅ COMPLETE          Phase 2 🔄 IN PROGRESS      Phase 3 🎯 NEXT           Phase 4 📅 FUTURE
Jan 1 - Jan 15              Jan 16 - Jan 22             Jan 23 - Feb 5            Q2 2026
Foundation                  Security                    Observability             Advanced
All systems GO ✅            Critical path               Production grade          Competitive advantage
```

---

## Phase 2: Security Implementation 🔒

**Dates:** Jan 16-22 (7 days)  
**Owner:** Security & QA Teams  
**Entry Criteria:** Phase 1 ✅ PASSED (37/37 tests), validation complete  
**Exit Criteria:** All 15 Phase 2 tests passing, threat model reviewed

### Sprint 2.1: Scope Isolation (Jan 16-17, 2 days)

#### Goal
Ensure metrics cannot leak between scopes.

#### Deliverables

**1. Scope Validation Module** 📝

File: `src/lib/scope-validator.ts` (NEW)

```typescript
interface ScopeValidation {
  isValid: boolean;
  reason?: string;
  currentScope: string;
  metricScope: string;
}

export function validateMetricScope(metric: PerfMetric): ScopeValidation {
  const currentScope = Bun.env.DASHBOARD_SCOPE || detectScope(Bun.env.HOST);
  
  if (!metric.properties?.scope) {
    return { 
      isValid: false, 
      reason: 'metric.properties.scope is required',
      currentScope,
      metricScope: 'undefined'
    };
  }
  
  if (metric.properties.scope !== currentScope) {
    return {
      isValid: false,
      reason: `scope mismatch: ${metric.properties.scope} !== ${currentScope}`,
      currentScope,
      metricScope: metric.properties.scope
    };
  }
  
  return {
    isValid: true,
    currentScope,
    metricScope: metric.properties.scope
  };
}

export function enforceScope(metric: PerfMetric): void {
  const validation = validateMetricScope(metric);
  if (!validation.isValid) {
    throw new Error(`🔒 SECURITY VIOLATION: ${validation.reason}`);
  }
}
```

**Tests:** `tests/unit/scope-validator.test.ts`
- ✅ Valid metric with matching scope
- ✅ Invalid metric with mismatched scope
- ✅ Invalid metric with missing scope
- ✅ Fallback to detectScope when DASHBOARD_SCOPE not set
- ✅ Scope enforcement throws error on violation

**Acceptance Criteria:**
- [ ] All 5 tests passing
- [ ] 100% code coverage
- [ ] Zero false positives (no valid metrics rejected)
- [ ] Zero false negatives (all invalid metrics caught)

---

**2. MasterPerfTracker Integration** 🔗

File: `src/lib/MasterPerfTracker.ts` (MODIFY)

```typescript
export class MasterPerfTracker {
  private validateAndEnforceScope(metric: PerfMetric): void {
    const validation = validateMetricScope(metric);
    
    if (!validation.isValid) {
      this.auditLog.record({
        timestamp: new Date(),
        type: 'SCOPE_VIOLATION',
        severity: 'CRITICAL',
        currentScope: validation.currentScope,
        attemptedScope: validation.metricScope,
        reason: validation.reason,
        source: metric.source,
      });
      throw new Error(`SCOPE_VIOLATION: ${validation.reason}`);
    }
    
    // Ensure metric has scope set
    if (!metric.properties) metric.properties = {};
    metric.properties.scope = validation.currentScope;
  }
  
  public addMetric(metric: PerfMetric): void {
    this.validateAndEnforceScope(metric);
    // ... rest of addMetric logic
  }
}
```

**Tests:** `tests/integration/tracker-scope-enforcement.test.ts`
- ✅ Tracker rejects cross-scope metrics
- ✅ Tracker logs scope violations
- ✅ Tracker auto-sets metric scope on valid metrics

**Acceptance Criteria:**
- [ ] 3 integration tests passing
- [ ] Scope violations logged to audit log
- [ ] Metrics cannot reach storage if scope invalid

---

### Sprint 2.2: Input Sanitization (Jan 18, 1 day)

#### Goal
Prevent injection attacks through metric properties.

#### Deliverables

**1. Property Sanitizer** 🛡️

File: `src/lib/property-sanitizer.ts` (NEW)

```typescript
export interface SanitizationConfig {
  maxKeyLength: number;
  maxValueLength: number;
  allowedKeyPattern: RegExp;
  allowedValuePatterns: Record<string, RegExp>;
}

export const DEFAULT_SANITIZATION: SanitizationConfig = {
  maxKeyLength: 256,
  maxValueLength: 10000,
  allowedKeyPattern: /^[a-zA-Z0-9_.-]+$/,
  allowedValuePatterns: {
    'string': /^[\w\s\-.,!?@():;'"[\]{}]*$/,
    'number': /^-?\d+(\.\d+)?$/,
    'boolean': /^(true|false)$/i,
  },
};

export function sanitizeProperties(
  properties: Record<string, any>,
  config: SanitizationConfig = DEFAULT_SANITIZATION
): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(properties)) {
    // Validate key
    if (key.length > config.maxKeyLength) {
      throw new Error(`Property key exceeds max length: ${key.substring(0, 50)}...`);
    }
    
    if (!config.allowedKeyPattern.test(key)) {
      throw new Error(`Property key contains invalid characters: ${key}`);
    }
    
    // Validate value
    const valueStr = String(value);
    if (valueStr.length > config.maxValueLength) {
      throw new Error(`Property value exceeds max length for key: ${key}`);
    }
    
    const valueType = typeof value;
    const pattern = config.allowedValuePatterns[valueType];
    
    if (pattern && !pattern.test(valueStr)) {
      throw new Error(`Property value invalid for type ${valueType}: ${key}`);
    }
    
    sanitized[key] = value;
  }
  
  return sanitized;
}
```

**Tests:** `tests/unit/property-sanitizer.test.ts`
- ✅ Valid properties pass through unchanged
- ✅ Oversized keys rejected
- ✅ Oversized values rejected
- ✅ Invalid characters rejected
- ✅ Number/boolean/string type validation

**Acceptance Criteria:**
- [ ] 5+ test cases passing
- [ ] All injection vectors mitigated
- [ ] Clear error messages for debugging

---

**2. Metric Validation Integration** 🔗

File: `src/lib/PerfMetric.ts` (MODIFY)

Add to `PerfMetric` interface:

```typescript
export interface PerfMetric {
  // ... existing fields
  properties?: Record<string, any>;
  
  // New validation method
  validate(): ValidationResult {
    const errors: string[] = [];
    
    // Sanitize properties
    try {
      if (this.properties) {
        this.properties = sanitizeProperties(this.properties);
      }
    } catch (err) {
      errors.push(`Property validation failed: ${err.message}`);
    }
    
    // Validate scope
    try {
      enforceScope(this);
    } catch (err) {
      errors.push(`Scope validation failed: ${err.message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      timestamp: new Date(),
    };
  }
}
```

---

### Sprint 2.3: WebSocket Security (Jan 19-21, 3 days)

#### Goal
Secure real-time connections with RBAC, rate limiting, and scope isolation.

#### Deliverables

**1. WebSocket RBAC Module** 🔑

File: `src/lib/websocket-rbac.ts` (NEW)

```typescript
export interface WebSocketToken {
  scope: string;
  clientId: string;
  permissions: string[];
  expiresAt: Date;
  signature: string;
}

export interface RBACConfig {
  tokenSecret: string;
  tokenExpiryMs: number;
  maxConnectionsPerScope: number;
  maxMessagesPerMinute: number;
}

export class WebSocketRBAC {
  private activeConnections: Map<string, Set<string>> = new Map();
  private messageRateLimiter: Map<string, number[]> = new Map();
  
  constructor(private config: RBACConfig) {}
  
  public validateToken(token: string): WebSocketToken {
    try {
      // Verify HMAC-SHA256 signature
      const verified = this.verifySignature(token, this.config.tokenSecret);
      if (!verified) throw new Error('Invalid token signature');
      
      const payload = this.decodeToken(token);
      
      // Check expiry
      if (new Date(payload.expiresAt) < new Date()) {
        throw new Error('Token expired');
      }
      
      return payload;
    } catch (err) {
      throw new Error(`Token validation failed: ${err.message}`);
    }
  }
  
  public checkConnectionLimit(scope: string): boolean {
    const scopeConnections = this.activeConnections.get(scope) || new Set();
    
    if (scopeConnections.size >= this.config.maxConnectionsPerScope) {
      return false;
    }
    
    return true;
  }
  
  public checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const messages = this.messageRateLimiter.get(clientId) || [];
    const recentMessages = messages.filter(ts => ts > oneMinuteAgo);
    
    if (recentMessages.length >= this.config.maxMessagesPerMinute) {
      return false;
    }
    
    recentMessages.push(now);
    this.messageRateLimiter.set(clientId, recentMessages);
    
    return true;
  }
  
  // ... signature verification, token encoding/decoding
}
```

**Tests:** `tests/integration/websocket-rbac.test.ts`
- ✅ Valid token accepted
- ✅ Invalid signature rejected
- ✅ Expired token rejected
- ✅ Connection limit enforced per scope
- ✅ Rate limit enforced per client

**Acceptance Criteria:**
- [ ] 5+ integration tests passing
- [ ] HMAC signature verification working
- [ ] Per-scope connection limits enforced
- [ ] Per-client rate limiting enforced
- [ ] Token expiry working

---

**2. Dashboard WebSocket Handler** 🔗

File: `src/server/dashboard-ws.ts` (NEW)

```typescript
export function createWebSocketHandler(rbac: WebSocketRBAC) {
  return {
    open(ws: WebSocket) {
      try {
        const token = this.validateToken(ws.data.token);
        
        if (!rbac.checkConnectionLimit(token.scope)) {
          ws.close(1008, 'Too many connections for this scope');
          return;
        }
        
        ws.subscribe(`scope:${token.scope}`);
        ws.data.scope = token.scope;
        ws.data.clientId = token.clientId;
      } catch (err) {
        ws.close(1008, `Auth failed: ${err.message}`);
      }
    },
    
    message(ws: WebSocket, message: string) {
      if (!rbac.checkRateLimit(ws.data.clientId)) {
        ws.close(1008, 'Rate limit exceeded');
        return;
      }
      
      // Process message only if scope matches
      const payload = JSON.parse(message);
      if (payload.scope && payload.scope !== ws.data.scope) {
        ws.close(1008, 'Scope violation');
        return;
      }
      
      // Handle message
      this.handleMessage(ws, payload);
    },
  };
}
```

---

### Phase 2 Exit Criteria ✅

- [ ] 15+ security tests passing (100% coverage)
- [ ] Scope isolation enforced end-to-end
- [ ] Input sanitization tested for all vectors
- [ ] WebSocket RBAC functional with rate limiting
- [ ] Threat model reviewed by security team
- [ ] Automated security test suite in CI/CD
- [ ] All code merged to `main` and tagged `v0.2.0-security`

---

## Phase 3: Observability & Monitoring 📊

**Dates:** Jan 23 - Feb 5 (14 days)  
**Owner:** Observability Team  
**Depends On:** Phase 2 ✅  
**Exit Criteria:** CloudWatch integration live, S3 archival working

### Sprint 3.1: Audit Logging (Jan 23-24, 2 days)

#### Goal
Create immutable audit trail for compliance and debugging.

#### Deliverables

**1. Structured Audit Log** 📝

File: `src/lib/audit-logger.ts` (NEW)

```typescript
export interface AuditEvent {
  timestamp: Date;
  eventType: 'AUTH' | 'SCOPE_VIOLATION' | 'METRIC_MUTATION' | 'CONFIG_CHANGE' | 'ERROR';
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  scope: string;
  userId?: string;
  clientId: string;
  action: string;
  details: Record<string, any>;
  result: 'SUCCESS' | 'FAILURE';
}

export class AuditLogger {
  constructor(
    private cloudWatch: CloudWatchClient,
    private localBuffer: AuditEvent[] = []
  ) {}
  
  public record(event: AuditEvent): void {
    // Buffer locally for batching
    this.localBuffer.push(event);
    
    // Flush if buffer full or critical event
    if (
      this.localBuffer.length >= 100 ||
      event.severity === 'CRITICAL'
    ) {
      this.flush();
    }
  }
  
  private async flush(): Promise<void> {
    if (this.localBuffer.length === 0) return;
    
    try {
      await this.cloudWatch.putLogEvents({
        logGroupName: `/duoplus/${Bun.env.DASHBOARD_SCOPE || 'unknown'}`,
        logStreamName: `audit-${new Date().toISOString().split('T')[0]}`,
        logEvents: this.localBuffer.map(e => ({
          timestamp: e.timestamp.getTime(),
          message: JSON.stringify(e),
        })),
      });
      
      this.localBuffer = [];
    } catch (err) {
      console.error('Audit log flush failed:', err);
      // Don't throw - keep system running even if logging fails
    }
  }
}
```

**Tests:** `tests/integration/audit-logger.test.ts`
- ✅ Events recorded locally
- ✅ Events flushed to CloudWatch
- ✅ Critical events flush immediately
- ✅ Log format matches CloudWatch schema

---

**2. Event Recording Integration** 🔗

Add to `MasterPerfTracker`, `WebSocketRBAC`, `PropertySanitizer`:

```typescript
// On authentication success
auditLogger.record({
  timestamp: new Date(),
  eventType: 'AUTH',
  severity: 'INFO',
  scope: token.scope,
  userId: token.userId,
  clientId: token.clientId,
  action: 'WebSocket connected',
  details: { permissions: token.permissions },
  result: 'SUCCESS',
});

// On metric mutation
auditLogger.record({
  timestamp: new Date(),
  eventType: 'METRIC_MUTATION',
  severity: 'INFO',
  scope: metric.scope,
  clientId: req.clientId,
  action: 'addMetric',
  details: { metricId: metric.id, timestamp: metric.timestamp },
  result: 'SUCCESS',
});
```

---

### Sprint 3.2: S3 Export & Archival (Jan 25-26, 2 days)

#### Goal
Archive metrics to S3/R2 with scoped partitioning and TTL-based cleanup.

#### Deliverables

**1. S3 Exporter** 💾

File: `src/lib/s3-exporter.ts` (NEW)

```typescript
export interface S3ExportConfig {
  bucket: string;
  region: string;
  partitionByScope: boolean;
  partitionByDate: boolean;
  contentDisposition: boolean;
}

export class S3Exporter {
  constructor(
    private s3: S3Client,
    private config: S3ExportConfig
  ) {}
  
  public async exportMetrics(
    metrics: PerfMetric[],
    scope: string
  ): Promise<{ key: string; size: number }> {
    const partitionPath = this.buildPartitionPath(scope);
    const key = `${partitionPath}/metrics-${Date.now()}.json`;
    
    const body = JSON.stringify({
      scope,
      exportedAt: new Date().toISOString(),
      count: metrics.length,
      metrics,
    });
    
    const result = await this.s3.putObject({
      Bucket: this.config.bucket,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      ContentDisposition: this.config.contentDisposition
        ? `attachment; filename="metrics-${scope}-${Date.now()}.json"`
        : undefined,
      Metadata: {
        'scope': scope,
        'export-timestamp': new Date().toISOString(),
      },
    });
    
    return { key, size: body.length };
  }
  
  private buildPartitionPath(scope: string): string {
    let path = scope;
    
    if (this.config.partitionByDate) {
      const date = new Date();
      path += `/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }
    
    return path;
  }
  
  public async setupLifecyclePolicy(scope: string): Promise<void> {
    // Archive to Glacier after 30 days, delete after 1 year
    await this.s3.putBucketLifecycleConfiguration({
      Bucket: this.config.bucket,
      LifecycleConfiguration: {
        Rules: [
          {
            Prefix: `${scope}/`,
            Status: 'Enabled',
            Transitions: [
              {
                Days: 30,
                StorageClass: 'GLACIER',
              },
            ],
            Expiration: {
              Days: 365,
            },
          },
        ],
      },
    });
  }
}
```

**Tests:** `tests/integration/s3-exporter.test.ts`
- ✅ Metrics exported to correct S3 key
- ✅ Scoped partition path correct
- ✅ Date partition path correct
- ✅ Content-Disposition header set
- ✅ Lifecycle policy applied

---

### Phase 3 Exit Criteria ✅

- [ ] Audit logging to CloudWatch working
- [ ] All events properly formatted and searchable
- [ ] S3 export functional with scoped partitions
- [ ] Lifecycle policies configured (Glacier/delete)
- [ ] Dashboard exports work end-to-end
- [ ] All code merged to `main` and tagged `v0.3.0-observability`

---

## Phase 4: Advanced Features 🚀

**Timeline:** Q2 2026 (Apr-Jun)  
**Entry Criteria:** Phase 3 ✅  

### 4.1 Historical Time-Series Storage

- Evaluate: InfluxDB, TimescaleDB, Prometheus
- Implement: Scoped retention policies
- Target: Real-time queries on 30-day window

### 4.2 Anomaly Detection

- Model: Statistical baseline per scope/metric
- Alert: Deviations > 2 standard deviations
- Action: Auto-escalate to oncall

### 4.3 Real-Time Alerting

- Channels: Slack, PagerDuty, Email
- Rules: Scope-aware alert routing
- Throttling: Per-rule rate limiting

### 4.4 SLA Dashboards

- Uptime: By scope, by component
- MTTR: Mean time to recovery
- Error Budget: Quarterly forecasting

---

## 📋 Critical Dependencies & Blockers

| Item | Status | Impact | Owner | Due Date |
|------|--------|--------|-------|----------|
| Phase 2 Security Review | ⏳ Pending | Blocks Phase 3 | Security Team | Jan 22 |
| CloudWatch Access | ⏳ Pending | Blocks Phase 3.1 | DevOps | Jan 20 |
| S3 Bucket Setup | ⏳ Pending | Blocks Phase 3.2 | DevOps | Jan 20 |
| Load Testing (Phase 2) | ⏳ Pending | Validates security | QA Team | Jan 21 |

---

## 🎯 Success Metrics

### Phase 2 Security
- ✅ 0 scope violations in production
- ✅ 0 injection attacks (via property validation)
- ✅ <100ms overhead per metric validation
- ✅ 100% audit logging coverage

### Phase 3 Observability  
- ✅ <5s CloudWatch log search latency
- ✅ 99.9% S3 export success rate
- ✅ <1GB storage cost per scope/month
- ✅ 100% metric retention for 12 months

### Phase 4 Advanced
- ✅ Anomaly detection F1 score >0.95
- ✅ Alert delivery <1min (99th percentile)
- ✅ SLA reporting automated (zero manual work)

---

## 🔄 Review Cadence

- **Weekly Sprint Review:** Every Friday 2pm
- **Bi-Weekly Roadmap Update:** Every other Monday
- **Monthly Security Audit:** 1st of month
- **Quarterly Business Review:** End of quarter

---

**Last Updated:** 2026-01-15  
**Next Update:** 2026-01-20 (Phase 2 Week 1 Review)
