# Security Architecture - Hyper-Bun v1.3.3

Complete security layer for forensic sports intelligence: runtime threat detection, secure deployment, compliance logging, and automated incident response.

## 🛡️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Request                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              MaliciousQueryDetector                          │
│  ┌─▶ Validates URL entities & parameters                    │
│  └─▶ Blocks high-risk requests                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│             RuntimeSecurityMonitor                            │
│  ┌─▶ CPU/Memory/FD monitoring                               │
│  ├─▶ Egress rate limiting                                    │
│  ├─▶ Auth failure tracking                                   │
│  └─▶ Threat detection & auto-response                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         CorrectedForensicLogger                              │
│  ┌─▶ Sanitizes URLs before logging                           │
│  └─▶ Captures both parsed & corrected params                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│             ForensicAuditDB                                  │
│  ┌─▶ Immutable audit trail                                  │
│  └─▶ Compliance-ready logging                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          IncidentResponseOrchestrator                         │
│  ┌─▶ Auto-executes containment playbooks                     │
│  ├─▶ Triggers PagerDuty for critical                         │
│  └─▶ Maintains incident state                                │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 Components

### 0. Bun.secrets DoD Integration

**Location**: `src/secrets/`, `src/auth/secret-guard.ts`, `src/cli/secrets.ts`

Hardware-backed secret storage with complete DoD compliance, role-based access control, and automated rotation.

**Features**:
- Hardware-backed storage (macOS Keychain, Linux libsecret, Windows Credential Manager)
- Role-based access control (RBAC) with senior-engineer/engineer/analyst roles
- 90-day automated secret rotation via cron
- Version control with rollback support
- Emergency rotation procedures
- Comprehensive audit logging (HBSE-001 through HBSE-007)
- Prometheus metrics integration

**Log Codes**:
- `HBSE-001` - Secret deleted
- `HBSE-002` - Secret created
- `HBSE-003` - Secret updated
- `HBSE-004` - Secret access error
- `HBSE-005` - Secret rotation completed
- `HBSE-006` - Unauthorized access attempt
- `HBSE-007` - Emergency rotation executed

**See Also**:
- [Bun.secrets DoD Completion](./BUN-SECRETS-DOD-COMPLETION.md) - Complete DoD integration report
- [Secrets Management Operator Guide](./operators/secrets-management.md) - CLI commands and procedures
- [Secrets Metrics Verification](./VERIFY-SECRETS-METRICS.md) - Prometheus metrics guide
- [RBAC and SCOPE Guide](./RBAC-AND-SCOPE-GUIDE.md) - Authorization patterns

### 1. RuntimeSecurityMonitor

**Location**: `src/security/runtime-monitor.ts`

Monitors system resources and detects security threats using Bun native APIs.

**Features**:
- Memory spike detection (2x baseline threshold)
- CPU monitoring (95% sustained threshold)
- File descriptor leak detection (>1000 FDs)
- Network egress spike detection (1000 API calls/min)
- Unusual endpoint detection
- Authentication failure burst detection (10 fails/min)
- Suspicious parameter count detection (50+ params)
- Entity encoding detection (HTML injection attempts)

**Bun APIs Used**:
- `Bun.hash()` - Generate threat IDs
- `Bun.spawn()` - Monitor file descriptors
- `Bun.gc()` - Force garbage collection
- `process.memoryUsage()` - Memory monitoring
- `bun:sqlite` - Threat storage

**Usage**:
```typescript
import { RuntimeSecurityMonitor } from '../security/runtime-monitor';

const monitor = new RuntimeSecurityMonitor();

// Monitor network egress
monitor.monitorNetworkEgress('https://api.example.com/odds', 'bookmaker');

// Track auth failures
monitor.onAuthFailure('bookmaker', 401);

// Get recent threats
const threats = monitor.getRecentThreats(24);
```

### 2. ComplianceLogger

**Location**: `src/security/compliance-logger.ts`

SOC2/GDPR ready compliance logging with immutable audit trails.

**Features**:
- MCP tool invocation logging (non-repudiation)
- Data access logging (GDPR compliance)
- Compliance report generation (gzipped JSON)
- Sensitive data sanitization
- Immutable audit database (WAL disabled, synchronous=FULL)

**Bun APIs Used**:
- `Bun.randomUUIDv7()` - Generate unique IDs
- `Bun.gzipSync()` - Compress compliance reports
- `bun:sqlite` - Immutable audit storage

**Usage**:
```typescript
import { ComplianceLogger } from '../security/compliance-logger';

const logger = new ComplianceLogger();

// Log MCP invocation
logger.logMCPInvocation('tool-name', 'user123', args, result, '192.168.1.1');

// Log data access
logger.logDataAccess('user123', 'event-456', 'odds', 'legitimate_interest');

// Generate report
const report = await logger.generateComplianceReport('2024-01-01', '2024-01-31');
```

### 3. IncidentResponseOrchestrator

**Location**: `src/security/incident-response.ts`

Automated incident response with playbooks and containment actions.

**Features**:
- Automatic threat response playbooks
- Containment actions (isolate, block, rotate, snapshot)
- PagerDuty integration (for critical incidents)
- Incident state tracking
- Auto-resolution after 1 hour

**Bun APIs Used**:
- `Bun.randomUUIDv7()` - Generate incident IDs
- `Bun.generateHeapSnapshot()` - Forensic snapshots
- `Bun.gc()` - Force garbage collection
- `bun:sqlite` - Incident storage

**Usage**:
```typescript
import { IncidentResponseOrchestrator } from '../security/incident-response';

const orchestrator = new IncidentResponseOrchestrator();

// Trigger response
orchestrator.onThreatDetected({
  type: 'entity_encoding_detected',
  severity: 10,
  context: { url: '...', bookmaker: '...' }
});

// Get active incidents
const incidents = orchestrator.getActiveIncidents();
```

## 🔐 Threat Indicators

| Threat Type | Threshold | Severity | Response |
|------------|-----------|----------|----------|
| `entity_encoding_detected` | Pattern match | 10 (CRITICAL) | Quarantine request, block IP, snapshot |
| `failed_auth_burst` | 10 fails/min | 9 (HIGH) | Isolate bookmaker, rotate keys |
| `memory_spike` | 2x baseline | 8 (HIGH) | Force GC, snapshot system |
| `egress_spike` | 1000 calls/min | 7 (MEDIUM) | Rate limit global, alert team |
| `suspicious_parameter_count` | 50+ params | 6 (MEDIUM) | Alert team |
| `file_descriptor_leak` | >1000 FDs | 8 (HIGH) | Alert team |

## 📊 API Endpoints

### Security Threat Summary
```
GET /api/security/threats?hours=24
```

Returns threat summary grouped by type for the last N hours.

### Active Incidents
```
GET /api/security/incidents
```

Returns all active security incidents.

### Compliance Status
```
GET /api/security/compliance?days=30
```

Returns compliance statistics for the last N days.

### Compliance Report
```
GET /api/security/compliance/report?start=2024-01-01&end=2024-01-31
```

Generates and downloads a gzipped compliance report.

### Secrets Management (API v1)
```
GET /api/v1/secrets/{server}/{type}
POST /api/v1/secrets/{server}/{type}
DELETE /api/v1/secrets/{server}/{type}
```

Hardware-backed secret storage with role-based access control. All operations are logged with HBSE-* codes and tracked via Prometheus metrics.

**See Also:**
- [Bun.secrets DoD Integration](./BUN-SECRETS-DOD-COMPLETION.md)
- [Secrets Management Operator Guide](./operators/secrets-management.md)
- [Secrets Metrics Verification](./VERIFY-SECRETS-METRICS.md)

## 🛠️ MCP Tools

### security-threat-summary
Get real-time security threat summary for the last 24 hours.

### security-incident-response
Get active incident response status.

### security-compliance-status
Check compliance audit trail health.

### security-recent-threats
Get recent security threats with details.

## 📝 Examples

See `src/api/examples.ts` for complete code examples:
- `RuntimeSecurityMonitor - Threat Detection`
- `ComplianceLogger - SOC2/GDPR Audit Trail`
- `IncidentResponseOrchestrator - Automated Threat Response`

## 🚀 Production Deployment

### Security Checklist

1. **Verify binary signature before launch**
   ```bash
   bun run scripts/verify-binary.ts \
     --binary=./hyper-bun-fullstack \
     --pub-key=./keys/deploy-key.pub
   ```

2. **Run security baseline test**
   ```bash
   bun test --filter="security.baseline"
   ```

3. **Deploy with security monitoring enabled**
   ```bash
   BUN_SECURITY_MONITOR_ENABLED=true \
   BUN_PAGERDUTY_KEY=pd_key_here \
   BUN_AUDIT_LOG_LEVEL=verbose \
     ./hyper-bun-fullstack \
     --mode=production \
     --enable-forensics \
     --enable-security-metrics
   ```

4. **Verify threat detection is active**
   ```bash
   bun run scripts/test-security-alert.ts \
     --simulate=entity_encoding_detected
   ```

5. **Check compliance logging**
   ```bash
   bun run mcp compliance generate-report \
     --start=2024-01-01 --end=2024-01-31 \
     --output=audit-report.zst
   ```

## 📚 Related Documentation

- [Bun API Reference](https://bun.com/reference)
- [Bun Runtime APIs](https://bun.com/docs/runtime/bun-apis)
- [API Examples](/api/examples)
- [Security Examples](/api/examples?category=Security%20%26%20Research)

---

**Status**: 🛡️ Security Layer Hardened | Runtime Monitoring Active | Compliance Ready
