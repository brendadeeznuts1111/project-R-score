# Dev Dashboard API Documentation

## Base URL

```
http://localhost:3008
```

(Default port is 3008, configurable via `config.toml`)

## Endpoints

### GET `/api/data`

Get current dashboard data (benchmarks, tests, P2P results, profile results).

**Query Parameters:**
- `scope` (optional): Filter by scope - `p2p`, `profile`, or omit for all
- `gateway` (optional): Filter P2P results by gateway (e.g., `venmo`, `cashapp`, `paypal`)
- `operation` (optional): Filter profile results by operation
- `refresh` (optional): Bypass cache and force refresh
- `cache` (optional): Set to `false` to bypass cache

**Examples:**
```bash
# Get all data
curl "http://localhost:3008/api/data"

# Get only P2P data
curl "http://localhost:3008/api/data?scope=p2p"

# Get P2P data for specific gateway
curl "http://localhost:3008/api/data?scope=p2p&gateway=venmo"

# Get profile data for specific operation
curl "http://localhost:3008/api/data?scope=profile&operation=xgboost_personalize"

# Force refresh
curl "http://localhost:3008/api/data?refresh=true"
```

**Response:**
```json
{
  "timestamp": "2026-02-07T12:00:00.000Z",
  "quickWins": 17,
  "quickWinsList": [...],
  "tests": [...],
  "benchmarks": [...],
  "p2pResults": [...],
  "profileResults": [...],
  "stats": {
    "testsPassed": 5,
    "testsTotal": 5,
    "benchmarksPassed": 4,
    "benchmarksTotal": 4,
    "performanceScore": 100,
    "p2pTotal": 15,
    "profileTotal": 10
  },
  "cached": false
}
```

---

### GET `/api/history`

Get historical benchmark/test/P2P/profile data.

**Query Parameters:**
- `hours` (optional): Number of hours to look back (default: 24)
- `scope` (optional): Filter by scope - `p2p`, `profile`, or omit for all
- `gateway` (optional): Filter P2P history by gateway
- `operation` (optional): Filter by operation (for both P2P and profile)

**Examples:**
```bash
# Get all history (last 24 hours)
curl "http://localhost:3008/api/history"

# Get P2P history for last 7 days
curl "http://localhost:3008/api/history?scope=p2p&hours=168"

# Get P2P history for specific gateway
curl "http://localhost:3008/api/history?scope=p2p&gateway=venmo"

# Get profile history for specific operation
curl "http://localhost:3008/api/history?scope=profile&operation=xgboost_personalize"
```

**Response:**
```json
{
  "benchmarks": [...],
  "tests": [...],
  "p2p": [...],
  "profile": [...]
}
```

---

### POST `/api/p2p/benchmark`

Run P2P gateway benchmarks via API.

**Request Body:**
```json
{
  "gateways": ["venmo", "cashapp", "paypal"],
  "operations": ["create", "query", "switch"],
  "iterations": 50,
  "includeDryRun": false,
  "includeFull": false
}
```

**Example:**
```bash
curl -X POST "http://localhost:3008/api/p2p/benchmark" \
  -H "Content-Type: application/json" \
  -d '{
    "gateways": ["venmo", "cashapp"],
    "operations": ["create", "query"],
    "iterations": 50
  }'
```

**Response:**
```json
{
  "success": true,
  "results": [...],
  "summary": {
    "totalOperations": 100,
    "successfulOps": 95,
    "failedOps": 5,
    "successRate": 95.0,
    "gateways": {...},
    "operations": {...}
  },
  "timestamp": "2026-02-07T12:00:00.000Z"
}
```

---

### GET `/api/p2p/metrics`

Get aggregated P2P metrics.

**Query Parameters:**
- `hours` (optional): Number of hours to look back (default: 24)
- `gateway` (optional): Filter by gateway
- `operation` (optional): Filter by operation

**Example:**
```bash
curl "http://localhost:3008/api/p2p/metrics?gateway=venmo&hours=48"
```

**Response:**
```json
{
  "metrics": [
    {
      "gateway": "venmo",
      "operation": "create",
      "totalOperations": 100,
      "avgDurationMs": 170.5,
      "minDurationMs": 150.2,
      "maxDurationMs": 200.1,
      "successfulOps": 95,
      "failedOps": 5,
      "successRate": 95.0
    }
  ],
  "totalRecords": 100
}
```

---

### GET `/api/p2p/trends`

Get P2P performance trends over time.

**Query Parameters:**
- `metric` (optional): Metric to track - `duration_ms` or `avg_duration_ms` (default: `duration_ms`)
- `interval` (optional): Time interval - `hour` or `day` (default: `hour`)
- `period` (optional): Time period - `24h`, `7d`, `30d` (default: `24h`)
- `gateway` (optional): Filter by gateway
- `operation` (optional): Filter by operation

**Examples:**
```bash
# Get duration trends for last 24 hours
curl "http://localhost:3008/api/p2p/trends?metric=duration_ms&interval=hour&period=24h"

# Get trends for specific gateway
curl "http://localhost:3008/api/p2p/trends?metric=duration_ms&interval=hour&period=24h&gateway=venmo"
```

**Response:**
```json
{
  "metric": "duration_ms",
  "interval": "hour",
  "period": "24h",
  "trends": [
    {
      "timestamp": "2026-02-07T10:00:00.000Z",
      "totalOperations": 50,
      "successfulOps": 48,
      "successRate": 96.0,
      "avgDurationMs": 170.5,
      "gateways": [
        {
          "gateway": "venmo",
          "avgDurationMs": 180.2,
          "count": 20,
          "successRate": 95.0
        }
      ],
      "operations": [...]
    }
  ]
}
```

---

### GET `/api/profile/metrics`

Get aggregated profile engine metrics.

**Query Parameters:**
- `hours` (optional): Number of hours to look back (default: 24)
- `operation` (optional): Filter by operation

**Example:**
```bash
curl "http://localhost:3008/api/profile/metrics?operation=xgboost_personalize&hours=48"
```

**Response:**
```json
{
  "metrics": [
    {
      "operation": "xgboost_personalize",
      "totalOperations": 50,
      "avgDurationMs": 2.5,
      "avgPersonalizationScore": 0.85,
      "avgModelAccuracy": 0.92,
      "successfulOps": 48,
      "failedOps": 2,
      "successRate": 96.0
    }
  ],
  "totalRecords": 50
}
```

---

### GET `/api/profile/trends`

Get profile engine performance trends over time.

**Query Parameters:**
- `metric` (optional): Metric to track - `duration_ms`, `personalization_score`, `model_accuracy`, `cpu_time_ms`, `peak_memory_mb` (default: `duration_ms`)
- `interval` (optional): Time interval - `hour` or `day` (default: `hour`)
- `period` (optional): Time period - `24h`, `7d`, `30d` (default: `24h`)
- `operation` (optional): Filter by operation

**Examples:**
```bash
# Get personalization score trends
curl "http://localhost:3008/api/profile/trends?metric=personalization_score&interval=day&period=7d"

# Get model accuracy trends
curl "http://localhost:3008/api/profile/trends?metric=model_accuracy&interval=hour&period=24h"
```

**Response:**
```json
{
  "metric": "personalization_score",
  "interval": "day",
  "period": "7d",
  "trends": [
    {
      "timestamp": "2026-02-07T00:00:00.000Z",
      "totalOperations": 100,
      "avgPersonalizationScore": 0.85,
      "operations": [
        {
          "operation": "xgboost_personalize",
          "avgTime": 2.5,
          "count": 50,
          "avgPersonalizationScore": 0.87
        }
      ]
    }
  ]
}
```

---

### GET `/api/health`

Get dashboard health status.

**Example:**
```bash
curl "http://localhost:3008/api/health"
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "cache": {
    "size": 1,
    "ttl": 30000
  },
  "websocket": {
    "clients": 2
  },
  "dataFreshness": "2s",
  "system": {
    "bunVersion": "1.3.9",
    "nodeVersion": "20.0.0",
    "platform": "darwin"
  },
  "memory": {
    "used": "45.2 MB",
    "total": "512 MB"
  }
}
```

---

## CLI Usage

The dashboard also provides a CLI tool for running benchmarks:

```bash
# Run P2P benchmarks
bun cli.ts p2p --gateways venmo,cashapp,paypal --operations create,query,switch --iterations 100

# Run profile benchmarks
bun cli.ts profile --operations xgboost_personalize,redis_hll_add,r2_snapshot --iterations 50

# Run combined benchmarks
bun cli.ts combined --output combined-results.json
```

See `P2P_BENCHMARK.md` for detailed CLI documentation.

---

## WebSocket API

Connect to `/ws` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3008/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};

// Subscribe to specific channels
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['benchmark:complete', 'p2p:complete', 'profile:complete']
}));
```

**Message Types:**
- `connected` - Connection established
- `benchmark:complete` - Benchmark result available
- `p2p:complete` - P2P benchmark result available
- `profile:complete` - Profile benchmark result available
- `tests:complete` - Test results available
- `data:updated` - Dashboard data updated
- `alerts` - Alert notifications

---

## Error Responses

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error

Error response format:
```json
{
  "error": "Error message here"
}
```
