# 🤖 Anomaly Detection System

ML-based threat detection for session security and fraud prevention.

## Overview

The Anomaly Detection System monitors 10 behavioral features to identify suspicious activity and automatically block high-risk sessions. It uses weighted feature analysis with a 0-1 risk score scale.

## Features Monitored

| Feature | Type | Threshold | Weight | Purpose |
|---------|------|-----------|--------|---------|
| `root_detected` | Binary | - | 25% | Device rooted/jailbroken |
| `vpn_active` | Binary | - | 15% | VPN connection active |
| `thermal_spike` | Numeric | 15°C | 12% | Abnormal temperature |
| `biometric_fail` | Numeric | 3 attempts | 18% | Failed authentication |
| `proxy_hop_count` | Numeric | 2 hops | 20% | Proxy chain depth |
| `location_change` | Numeric | 500 km | 10% | Unusual location |
| `time_anomaly` | Numeric | 0-1 | 8% | Off-hours access |
| `device_fingerprint_mismatch` | Binary | - | 22% | Device changed |
| `unusual_transaction_pattern` | Binary | - | 16% | Atypical behavior |
| `rapid_api_calls` | Numeric | 100 req/min | 14% | Rate anomaly |

## Risk Levels

```text
Low       (0.0 - 0.3)   ✅ Allow
Medium    (0.3 - 0.6)   ⚠️  Monitor + Challenge
High      (0.6 - 0.85)  🔴 Restrict
Critical  (0.85 - 1.0)  🚫 Block
```

## Usage

### Direct Prediction

```typescript
import { anomalyDetector } from 'src/compliance/anomalyDetector';

const score = await anomalyDetector.predict({
  root_detected: 1,
  vpn_active: 1,
  thermal_spike: 18,
  biometric_fail: 4,
  proxy_hop_count: 3,
  location_change: 2000,
  time_anomaly: 0.8,
  device_fingerprint_mismatch: 1,
  unusual_transaction_pattern: 1,
  rapid_api_calls: 150,
});

if (score.score > 0.92) {
  blockSession("high_risk_anomaly");
}
```

### Session Management

```typescript
import { sessionManager } from 'src/compliance/sessionManager';

// Create session with anomaly check
const result = await sessionManager.createSession(
  userId,
  ipAddress,
  userAgent,
  deviceFingerprint,
  features
);

if (!result.allowed) {
  return { error: result.message, status: 403 };
}

// Validate on each request
const validation = await sessionManager.validateSession(
  sessionId,
  features
);

if (!validation.allowed) {
  return { error: validation.message, status: 403 };
}

if (validation.requiresChallenge) {
  // Trigger 2FA or biometric verification
  return { requiresChallenge: true };
}
```

### Batch Prediction

```typescript
const sessions = [
  { id: 'sess_1', features: {...} },
  { id: 'sess_2', features: {...} },
  { id: 'sess_3', features: {...} },
];

const results = await anomalyDetector.predictBatch(sessions);

results.forEach((score, sessionId) => {
  if (score.blockSession) {
    blockSession(sessionId);
  }
});
```

## Integration Points

### Web App (`web-app/server.js`)

```javascript
// On login
const result = await sessionManager.createSession(
  userId,
  req.ip,
  req.headers['user-agent'],
  req.body.deviceFingerprint,
  extractFeatures(req)
);

if (!result.allowed) {
  return Response.json({ error: result.message }, { status: 403 });
}

// On each API call
const validation = await sessionManager.validateSession(
  sessionId,
  extractFeatures(req)
);

if (!validation.allowed) {
  return Response.json({ error: validation.message }, { status: 403 });
}
```

### API Routes (`src/routes/`)

```typescript
// Payment endpoint
async function handlePayment(req, userId, amount) {
  const features = extractDeviceFeatures(req);
  const validation = await sessionManager.validateSession(
    req.sessionId,
    features
  );

  if (!validation.allowed) {
    throw new Error(validation.message);
  }

  if (validation.requiresChallenge) {
    // Require additional verification for high-risk transactions
    return { requiresChallenge: true };
  }

  // Process payment
  return processPayment(userId, amount);
}
```

## Feature Extraction

```typescript
function extractDeviceFeatures(req): AnomalyFeatures {
  return {
    root_detected: checkRootAccess(req),
    vpn_active: detectVPN(req.ip),
    thermal_spike: getThermalDelta(req.deviceId),
    biometric_fail: getBiometricFailCount(req.sessionId),
    proxy_hop_count: countProxyHops(req.headers),
    location_change: calculateLocationDelta(req.ip),
    time_anomaly: calculateTimeAnomaly(req.timestamp),
    device_fingerprint_mismatch: checkDeviceFingerprint(req),
    unusual_transaction_pattern: detectPatternAnomaly(req.userId),
    rapid_api_calls: countRecentRequests(req.sessionId),
  };
}
```

## Configuration

### Environment Variables

```env
# Anomaly Detection
ANOMALY_THRESHOLD_BLOCK=0.92
ANOMALY_THRESHOLD_CHALLENGE=0.60
ANOMALY_SESSION_TIMEOUT=1800000
ANOMALY_CHECK_INTERVAL=300000
ANOMALY_CLEANUP_INTERVAL=600000
```

### Runtime Config

```typescript
const config = {
  thresholds: {
    block: 0.92,
    challenge: 0.60,
    monitor: 0.30,
  },
  sessionTimeout: 30 * 60 * 1000,
  checkInterval: 5 * 60 * 1000,
  cleanupInterval: 10 * 60 * 1000,
};
```

## Response Format

```typescript
interface AnomalyScore {
  score: number;                    // 0-1 risk score
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: AnomalyFactor[];         // Top contributing factors
  recommendation: string;            // Action to take
  blockSession: boolean;             // Auto-block flag
}

interface AnomalyFactor {
  name: string;
  weight: number;                   // Feature weight
  contribution: number;             // Contribution to score
  threshold: number;                // Feature threshold
  actual: number;                   // Actual value
}
```

## Testing

```bash
# Run anomaly detection examples
bun run anomaly-predict

# Output shows:
# - Direct prediction with critical anomaly
# - Session creation with normal features
# - Session validation with suspicious features
# - Batch prediction across multiple sessions
```

## Security Considerations

1. **Feature Privacy**: Don't log sensitive features (biometric data)
2. **Rate Limiting**: Combine with rate limiting for API endpoints
3. **Challenge Methods**: Use 2FA, biometric, or email verification
4. **Logging**: Audit all blocked sessions for investigation
5. **Model Updates**: Periodically retrain with new threat patterns

## Monitoring

```typescript
// Track blocked sessions
sessionManager.getUserSessions(userId).forEach(session => {
  if (session.blocked) {
    console.log(`🚫 Blocked: ${session.blockReason}`);
    logSecurityEvent('session_blocked', {
      sessionId: session.sessionId,
      userId: session.userId,
      reason: session.blockReason,
      score: session.anomalyScore?.score,
    });
  }
});
```

## Examples

See `ai/anomaly-predict.ts` for complete working examples:
- Direct anomaly prediction
- Session creation with checks
- Session validation with periodic checks
- Batch prediction for multiple sessions

