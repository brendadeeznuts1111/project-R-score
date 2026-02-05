# DoD-Grade Multi-Layer Correlation Engine

**Status**: 🟢 **[DoD][CLASS:MissionCritical] Multi-Layer Graph Engine Deployed | Failover Active | Audit Logging: HIGH**

## Overview

The DoD-Grade Multi-Layer Correlation Engine is a mission-critical correlation detection system with defense-grade resilience patterns, circuit breakers, audit logging, and comprehensive health monitoring.

## Architecture

### Core Components

1. **DoDMultiLayerCorrelationGraph** - Main engine class
   - Input validation using Zod schemas
   - Circuit breaker pattern (ResilienceGovernor)
   - Comprehensive audit logging
   - Multi-layer graph building (L1-L4)
   - Anomaly detection with severity classification
   - Propagation path prediction
   - Health status monitoring

2. **ResilienceGovernor** - Circuit breaker implementation
   - Automatic failure detection
   - Circuit opening/closing logic
   - Fallback mechanisms
   - Status monitoring

3. **AuditLogger** - Audit trail system
   - Operation logging
   - Performance tracking
   - Outcome recording
   - User context tracking

4. **Health Check System** - Monitoring and failover
   - Database latency measurement
   - Circuit breaker status
   - Failure rate tracking
   - Failover activation

## Features

### [DoD][CLASS:InputValidation]
- Event ID validation: `^[A-Z]{3,4}-\d{8}-\d{4}$`
- Node ID validation: 10-128 characters
- Correlation strength: -1 to 1 range
- Confidence threshold: 0 to 1 range
- Timestamp validation: positive integers

### [DoD][CLASS:CircuitBreaker]
- Automatic failure detection (3 failures threshold)
- 30-second cooldown period
- Per-layer circuit breakers (L1-L4)
- Fallback mechanisms for degraded operation

### [DoD][CLASS:AuditTrail]
- All operations logged with timestamps
- Layer-specific tracking
- Outcome recording (SUCCESS/FAILED/VALIDATION_FAILED)
- Latency measurement
- User context tracking

### [DoD][SCOPE:BuildOps]
- Parallel layer building (L1-L4)
- Resilience to individual layer failures
- Build latency tracking
- Success rate calculation

### [DoD][SCOPE:AnomalyDetection]
- Layer-specific detectors
- Severity classification (LOW/MEDIUM/HIGH/CRITICAL)
- Confidence-based filtering
- Critical anomaly persistence

### [DoD][CLASS:PropagationEngine]
- Recursive SQL path finding
- Cumulative impact calculation
- Confidence decay modeling
- Latency aggregation

## Database Schema

```sql
-- Multi-layer correlations table
CREATE TABLE multi_layer_correlations (
  correlation_id INTEGER PRIMARY KEY,
  layer INTEGER NOT NULL CHECK(layer BETWEEN 1 AND 4),
  event_id TEXT NOT NULL,
  source_node TEXT NOT NULL CHECK(length(source_node) >= 10),
  target_node TEXT NOT NULL CHECK(length(target_node) >= 10),
  correlation_type TEXT NOT NULL,
  correlation_score REAL NOT NULL CHECK(correlation_score BETWEEN -1 AND 1),
  latency_ms INTEGER NOT NULL CHECK(latency_ms >= 0),
  expected_propagation REAL NOT NULL,
  detected_at INTEGER NOT NULL,
  confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1),
  severity_level TEXT CHECK(severity_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  INDEX idx_layer_confidence (layer, confidence),
  INDEX idx_event_detection (event_id, detected_at),
  UNIQUE(event_id, source_node, target_node, detected_at)
);

-- Audit log table
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  operation TEXT NOT NULL,
  event_id TEXT NOT NULL,
  layer INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  user_context TEXT,
  INDEX idx_audit_time (timestamp)
);
```

## API Endpoints

### `GET /api/dod/health`
Health check endpoint for load balancer and monitoring.

**Response:**
```json
{
  "status": "HEALTHY" | "DEGRADED" | "CRITICAL",
  "timestamp": 1234567890,
  "metrics": {
    "dbLatency": 5.2,
    "openCircuits": 0,
    "recentFailures": 0,
    "circuitBreakers": {
      "L4_BUILD": { "open": false, "failures": 0 },
      "L3_BUILD": { "open": false, "failures": 0 },
      "L2_BUILD": { "open": false, "failures": 0 },
      "L1_BUILD": { "open": false, "failures": 0 }
    }
  },
  "failover": false
}
```

## Usage

### Basic Usage

```typescript
import { DoDMultiLayerCorrelationGraph } from "./arbitrage/shadow-graph/dod-multi-layer-engine";
import { Database } from "bun:sqlite";

const db = new Database("./data/research.db");
const engine = new DoDMultiLayerCorrelationGraph(db);

// Build multi-layer graph
const graph = await engine.buildMultiLayerGraph("NBA-20240115-1400");

if (graph) {
  // Detect anomalies
  const anomalies = await engine.detectAnomalies(graph, 0.7);
  
  // Predict propagation path
  const path = await engine.predictPropagationPath(
    "source_node_id",
    "target_node_id",
    4
  );
  
  // Get health status
  const health = engine.getHealthStatus();
}
```

### Health Monitoring

```typescript
import { healthCheck, initializeHealthCheck } from "./api/dod-health";
import { getDatabase } from "./storage/sqlite";

const db = getDatabase();
initializeHealthCheck(db);

// Check health
const health = healthCheck();
console.log(`Status: ${health.status}`);
console.log(`DB Latency: ${health.metrics.dbLatency}ms`);
console.log(`Open Circuits: ${health.metrics.openCircuits}`);
```

## Configuration

### Thresholds
- Layer 4 (Cross-Sport): 0.85
- Layer 3 (Cross-Event): 0.75
- Layer 2 (Cross-Market): 0.65
- Layer 1 (Direct): 0.55

### Windows
- Cross-Sport: 3,600,000ms (1 hour)
- Cross-Event: 604,800,000ms (7 days)

### Circuit Breaker
- Failure threshold: 3 failures
- Cooldown period: 30 seconds
- Automatic recovery

## Deployment

### Systemd Service

See `deploy/bun-correlation-engine.service` for production deployment configuration.

**Key Features:**
- Automatic restart on failure
- Resource limits (8GB memory, 400% CPU)
- Security hardening (NoNewPrivileges, PrivateTmp, ProtectSystem)
- Environment variables for configuration

### Environment Variables

- `NODE_ENV=production`
- `DATABASE_PATH=/var/lib/correlations/production.db`
- `AUDIT_LEVEL=HIGH`
- `FAILOVER_ENABLED=true`

## Dashboard Theme

The DoD dashboard theme (`src/styles/dod-dashboard.css`) provides:

- Dark theme with high contrast
- Status indicators (active/warning/critical)
- Layer tiles with anomaly counters
- Edge cards with severity highlighting
- Propagation visualization
- Failover banner

## Status Indicators

- 🟢 **HEALTHY**: All systems operational
- 🟡 **DEGRADED**: Some circuits open or elevated latency
- 🔴 **CRITICAL**: Multiple failures or failover activated

## Integration

The DoD engine integrates with:

- Existing multi-layer correlation system
- Shadow-graph database schema
- Audit logging infrastructure
- Health check endpoints
- WebSocket monitoring

## References

- `[DoD][DOMAIN:SportsBetting][SCOPE:MultiLayerCorrelation][TYPE:CoreEngine]`
- `[META:{latency:ms, confidence:0-1, propagation:bps}]`
- `[CLASS:MissionCritical]`
- `[#REF:STANAG-4609]`

## Files

- `src/arbitrage/shadow-graph/dod-multi-layer-engine.ts` - Core engine
- `src/api/dod-health.ts` - Health check endpoint
- `src/styles/dod-dashboard.css` - Dashboard theme
- `deploy/bun-correlation-engine.service` - Systemd service file
- `docs/DOD-MULTI-LAYER-ENGINE.md` - This documentation

## Status

**🟢 [DoD][CLASS:MissionCritical] Multi-Layer Graph Engine Deployed | Failover Active | Audit Logging: HIGH**
