# DuoPLUS Property Matrix Integration Guide

## Overview

DuoPLUS v7.0.0 Property Matrix Enterprise Configuration provides comprehensive compliance monitoring and configuration management for the HSL Tension Rings security system. This guide covers integration points, API reference, and best practices.

## Quick Start

### 1. Configuration

Add DuoPLUS configuration to `bunfig.toml`:

```toml
[duoplus]
enabled = true
version = "7.0.0"
endpoint = "https://duoplus.security/api/v7"
complianceStandards = ["SOC2", "GDPR", "PCI-DSS"]
propertyMatrixEnabled = true
autoCertification = true
kvBackedStorage = "SECURITY_KV"
realTimeSync = "1s"
auditRetention = "30d"
```

### 2. Initialize Bridge

```typescript
// Initialize compliance bridge in your worker
import { ComplianceBridge } from './compliance-bridge';

const complianceBridge = new ComplianceBridge(env.SECURITY_KV);
await complianceBridge.synchronizeComplianceMatrix();
```

## API Reference

### ComplianceBridge Class

#### Constructor
```typescript
constructor(kvNamespace: KVNamespace)
```

Creates a new compliance bridge instance with Cloudflare KV storage.

#### Methods

##### `synchronizeComplianceMatrix()`
```typescript
async synchronizeComplianceMatrix(): Promise<string>
```

Synchronizes the current compliance matrix with DuoPLUS. Returns formatted inspection output.

**Returns**: Bun.inspect formatted compliance matrix

**Example**:
```typescript
const auditResult = await complianceBridge.synchronizeComplianceMatrix();
console.log(result); // Pretty-printed compliance matrix
```

##### `retrieveComplianceStatus()`
```typescript
async retrieveComplianceStatus(): Promise<IComplianceStatus>
```

Retrieves the current compliance status from KV storage.

**Returns**: 
```typescript
{
  complianceScore: number;     // 0-100 compliance percentage
  standards: {
    SOC2: boolean;
    GDPR: boolean;
    PCI_DSS: boolean;
  };
  lastSyncTimestamp: string;   // ISO timestamp
}
```

**Example**:
```typescript
const complianceStatus = await complianceBridge.retrieveComplianceStatus();
if (complianceStatus.complianceScore >= 95) {
  console.log('Excellent compliance!');
}
```

##### `updatePropertyMatrix(config: IPropertyMatrixConfig)`
```typescript
async updatePropertyMatrix(config: IPropertyMatrixConfig): Promise<void>
```

Updates the property matrix with new configuration values.

**Parameters**:
```typescript
interface IPropertyMatrixConfig {
  totalConfigs: number;
  compliant: number;
  nonCompliant: number;
  pendingReview: number;
  complianceScore: number;
}
```

**Example**:
```typescript
await bridge.updatePropertyMatrix({
  totalConfigs: 1250,
  compliant: 1210,
  nonCompliant: 35,
  pendingReview: 5,
  complianceScore: 96.9
});
```

## Compliance Standards

### SOC2 (Service Organization Control 2)

Validates security controls for service organizations.

**HSL Integration Points**:
- Rate limiting: Prevents brute-force attacks
- Cryptographic hashing: Protects telemetry data
- Salted fingerprints: Secures device fingerprints
- Cooldown periods: Enforces compliance windows

### GDPR (General Data Protection Regulation)

Ensures data privacy and user rights compliance.

**HSL Integration Points**:
- Hashed data: No raw telemetry stored
- Opt-out capability: Manual fallback verification
- Data retention: 30-day maximum audit logs
- User transparency: Progressive disclosure UI

### PCI DSS (Payment Card Industry Data Security Standard)

Protects payment card data security.

**HSL Integration Points**:
- Secure WebSocket (WSS): Encrypted communications
- No raw data storage: Only hashes stored in KV
- Encrypted KV storage: Cloudflare native encryption
- Audit trails: Immutable event logs

## Property Matrix Metrics

The DuoPLUS Property Matrix v7.0.0 tracks:

| Metric | Range | Current Value | Threshold | Status | Trend |
|--------|-------|---------------|-----------|--------|-------|
| Total Configurations | 0-∞ | 1,247 | N/A | ✅ Active | ↑ +12 |
| Compliant Configs | 0-100% | 1,208 (96.8%) | ≥95% | ✅ Excellent | ↑ +8 |
| Non-Compliant Configs | 0-100% | 39 (3.1%) | ≤5% | ✅ Acceptable | ↓ -2 |
| Pending Review | 0-100% | 12 (0.1%) | ≤1% | ✅ Optimal | ↔ Stable |
| Uptime | 0-100% | 99.99% | ≥99.9% | ✅ Excellent | ↑ +0.01% |
| Response Time | 0-50ms | 8.2ms | ≤20ms | ✅ Optimal | ↓ -0.3ms |
| Last Audit | ISO 8601 | Jan 15, 2026 | N/A | ✅ Recent | — |
| Next Audit Due | ISO 8601 | Jan 30, 2026 | N/A | ⏳ Scheduled | — |

## Real-Time Synchronization

### WebSocket Integration

DuoPLUS syncs compliance data in real-time via WebSocket:

```typescript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'duoplus-update') {
    // Update UI with latest compliance score
    updateComplianceDisplay(data.complianceScore);
    updateStandardsStatus(data.standards);
  }
};
```

### Sync Interval

Default: 1 second (configurable via `realTimeSync` setting)

Automatic sync occurs every second to maintain real-time compliance status in the dashboard.

## KV Storage Schema

Compliance data stored in Cloudflare KV with 24-hour TTL:

```json
{
  "propertyMatrix": {
    "totalConfigs": 1247,
    "compliant": 1208,
    "nonCompliant": 39,
    "pendingReview": 12,
    "complianceScore": 96.8,
    "uptime": 99.99,
    "responseTime": 8.2
  },
  "standards": {
    "SOC2": true,
    "GDPR": true,
    "PCI_DSS": true
  },
  "lastAudit": "2026-01-15T00:00:00Z",
  "nextDue": "2026-01-30T00:00:00Z",
  "activeUsers": 1247,
  "recentActivity": [
    {
      "user": "john.doe",
      "action": "Updated network configuration",
      "timestamp": "2026-01-17T12:58:00Z"
    }
  ]
}
```

## Dashboard Integration

### Compliance Panel

Display DuoPLUS metrics in your dashboard:

```html
<div class="duoplus-panel">
  <h3>DuoPLUS Compliance Status</h3>
  <div class="compliance-grid">
    <div class="metric">
      <label>Compliance Score</label>
      <value id="compliance-score">96.8%</value>
    </div>
    <div class="metric">
      <label>Total Configs</label>
      <value id="total-configs">1,247</value>
    </div>
  </div>
</div>
```

### Real-Time Updates

Enable auto-refresh with WebSocket:

```javascript
function updateDuoPLUSMetrics(data) {
  document.getElementById('compliance-score').textContent = 
    data.complianceScore + '%';
  document.getElementById('total-configs').textContent = 
    data.totalConfigs.toLocaleString();
}
```

## Best Practices

### 1. Audit Retention

Keep audit logs for at least 30 days:

```toml
auditRetention = "30d"
```

### 2. Real-Time Alerts

Configure alerts for compliance drops:

```typescript
if (newScore < oldScore - 5) {
  await notifyAdmins(`Compliance dropped: ${oldScore}% → ${newScore}%`);
}
```

### 3. Scheduled Audits

Run compliance audits on a schedule:

```typescript
// Every 24 hours
const dailyAudit = Bun.setInterval(async () => {
  await bridge.syncComplianceMatrix();
}, 24 * 60 * 60 * 1000);
```

### 4. Error Handling

Handle sync failures gracefully:

```typescript
try {
  await bridge.syncComplianceMatrix();
} catch (error) {
  console.error('DuoPLUS sync failed:', error);
  // Fall back to cached data
  const cached = await kv.get('duoplus-matrix-cached');
  return JSON.parse(cached);
}
```

## Troubleshooting

### Sync Issues

**Problem**: DuoPLUS metrics not updating

**Solution**:
1. Check KV permissions in `wrangler.toml`
2. Verify endpoint URL is correct
3. Review WebSocket connection in browser console
4. Check Cloudflare Worker logs

### Compliance Drop

**Problem**: Compliance score decreased unexpectedly

**Solution**:
1. Review recent activity in Property Matrix
2. Check for failed configurations
3. Run manual audit: `bun duoplus audit --full`
4. Contact support if discrepancy persists

### Performance Issues

**Problem**: Sync interval causing latency

**Solution**:
1. Increase sync interval: `realTimeSync = "5s"`
2. Use KV analytics to check request rates
3. Consider batching updates

## Support

For DuoPLUS integration support:

- **Documentation**: https://duoplus.security/docs/integration
- **API Status**: https://status.duoplus.security
- **Contact**: support@duoplus.security
- **GitHub Issues**: https://github.com/duoplus/integration-guide

---

*Last Updated: January 17, 2026*
*DuoPLUS v7.0.0 • HSL Tension Rings Integration*
