# Correlation Engine Registry Integration

**Version:** 1.1.1.1.4.5.0  
**Date:** 2024-01-XX

## Overview

The DoD Multi-Layer Correlation Engine has been integrated into the NEXUS Registry System, providing unified health monitoring, metrics tracking, and API access.

## Registry Entry

### Registry Information

- **ID:** `correlation-engine`
- **Name:** DoD Multi-Layer Correlation Engine
- **Category:** Research
- **Type:** Config
- **Endpoint:** `/api/registry/correlation-engine`
- **Version:** 1.1.1.1.4.5.0

### Tags

- `correlation`
- `multi-layer`
- `dod`
- `anomaly-detection`
- `propagation`
- `health-check`

### Use Cases

1. Cross-sport correlation analysis
2. Cross-event correlation detection
3. Cross-market correlation patterns
4. Direct latency correlation
5. Anomaly detection and scoring
6. Propagation path prediction
7. Health monitoring for load balancers

## API Endpoints

### Registry Overview

```bash
GET /api/registry
```

Returns overview of all registries including correlation-engine with:
- Status (healthy/degraded/offline)
- Metrics (totalItems, activeItems, avgResponseMs, errorRate)
- Last updated timestamp

### Correlation Engine Registry

```bash
GET /api/registry/correlation-engine
```

Returns detailed information:
- Health status
- Statistics by layer
- Total correlations count
- Capabilities list
- Endpoint references

**Response Example:**
```json
{
  "registry": "correlation-engine",
  "version": "1.1.1.1.4.5.0",
  "health": {
    "status": "HEALTHY",
    "timestamp": 1704067200000,
    "metrics": {
      "dbLatency": 2.5,
      "layerFailures": 0,
      "activeConnections": 0,
      "lastSuccessfulBuild": 1704067100000
    },
    "failover": false
  },
  "statistics": {
    "totalCorrelations": 12000,
    "byLayer": {
      "layer1": {
        "count": 3000,
        "avgCorrelation": 0.65,
        "avgConfidence": 0.72,
        "avgLatency": 45.2
      },
      "layer2": {
        "count": 3000,
        "avgCorrelation": 0.58,
        "avgConfidence": 0.68,
        "avgLatency": 125.8
      },
      "layer3": {
        "count": 3000,
        "avgCorrelation": 0.52,
        "avgConfidence": 0.64,
        "avgLatency": 234.5
      },
      "layer4": {
        "count": 3000,
        "avgCorrelation": 0.48,
        "avgConfidence": 0.61,
        "avgLatency": 189.3
      }
    }
  },
  "endpoints": {
    "health": "/api/dod/health",
    "registry": "/api/registry/correlation-engine"
  },
  "capabilities": [
    "buildMultiLayerGraph",
    "detectAnomalies",
    "predictPropagationPath",
    "healthCheck"
  ]
}
```

## Health Status Integration

The registry automatically updates the correlation-engine status based on:

1. **Database Latency:** < 100ms = healthy
2. **Layer Failures:** < 2 failures in 30s window = healthy
3. **Error Rate:** Calculated from layer failures

### Status Calculation

```typescript
if (errorRate === 0 && avgResponseMs < 100) {
  status = "healthy";
} else if (errorRate < 0.1) {
  status = "degraded";
} else {
  status = "offline";
}
```

## Metrics Collection

The registry collects the following metrics:

- **totalItems:** Total number of correlations in database
- **activeItems:** Same as totalItems (all correlations are active)
- **lastUpdated:** Timestamp of last successful build
- **queryCount24h:** Query count (currently 0, can be enhanced)
- **avgResponseMs:** Database latency from health check
- **errorRate:** Calculated from layer failures (0.1 per failure)

## Registry Schema

```typescript
{
  version: "1.1.1.1.4.5.0",
  properties: [
    "status",
    "timestamp",
    "metrics",
    "dbLatency",
    "layerFailures",
    "activeConnections",
    "lastSuccessfulBuild",
    "failover"
  ]
}
```

## Integration Points

### 1. Registry Overview (`getRegistriesOverview`)

The correlation-engine registry is included in the main registry overview endpoint, showing:
- Basic information
- Status
- Metrics summary
- Schema version

### 2. Metrics Collection (`getRegistryMetrics`)

Automatically collects metrics when the registry overview is requested:
- Opens research database
- Creates engine instance
- Gets health status
- Counts correlations
- Calculates statistics

### 3. Registry Endpoint (`/api/registry/correlation-engine`)

Provides detailed registry information:
- Full health status
- Layer-by-layer statistics
- Capabilities list
- Endpoint references

## Error Handling

The integration gracefully handles:
- Missing database file (returns offline status)
- Database errors (returns degraded status)
- Missing tables (returns empty metrics)
- Connection failures (returns offline status)

## Usage Examples

### Check Registry Status

```bash
curl http://localhost:3000/api/registry | jq '.registries[] | select(.id == "correlation-engine")'
```

### Get Correlation Engine Details

```bash
curl http://localhost:3000/api/registry/correlation-engine | jq
```

### Monitor Health

```bash
curl http://localhost:3000/api/dod/health | jq
```

## Benefits

1. **Unified Monitoring:** Health status visible in registry overview
2. **Metrics Tracking:** Automatic collection of performance metrics
3. **API Discovery:** Easy discovery of correlation engine capabilities
4. **Status Visibility:** Clear health status for load balancers
5. **Statistics Access:** Layer-by-layer statistics available via API

## Related Documentation

- [Correlation Engine Benchmarks](./CORRELATION-ENGINE-BENCHMARKS.md)
- [Registry System](./REGISTRY-SYSTEM.md)
- [DoD Health Check](./DOD-MULTI-LAYER-ENGINE.md)
