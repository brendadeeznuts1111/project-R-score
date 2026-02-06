# Bun Server Metrics Integration

> Monitor server activity with Bun's built-in metrics

## Overview

NEXUS integrates Bun's built-in server metrics to provide real-time visibility into server activity. These metrics are exposed via the `/health` and `/metrics` endpoints.

**Bun Documentation**: [Server Metrics](https://bun.sh/docs/api/http-server#metrics)

---

## Available Metrics

### `server.pendingRequests`

**Type**: `number`  
**Description**: Active HTTP requests currently being processed

**Example**:
```typescript
const server = Bun.serve({
  fetch(req, server) {
    return new Response(
      `Active requests: ${server.pendingRequests}`,
    );
  },
});
```

### `server.pendingWebSockets`

**Type**: `number`  
**Description**: Active WebSocket connections

**Example**:
```typescript
const server = Bun.serve({
  fetch(req, server) {
    return new Response(
      `Active WebSockets: ${server.pendingWebSockets}`,
    );
  },
});
```

### `server.subscriberCount(topic)`

**Type**: `(topic: string) => number`  
**Description**: Get count of WebSocket subscribers for a specific topic

**Example**:
```typescript
const server = Bun.serve({
  fetch(req, server) {
    const chatUsers = server.subscriberCount("chat");
    return new Response(`${chatUsers} users in chat`);
  },
  websocket: {
    message(ws) {
      ws.subscribe("chat");
    },
  },
});
```

---

## Integration in NEXUS

### Implementation

**File**: `src/observability/metrics.ts`

```typescript
/**
 * Get Bun server metrics
 * @see {@link https://bun.sh/docs/api/http-server#metrics|Bun Server Metrics Documentation}
 */
export function getBunServerMetrics(server: ReturnType<typeof Bun.serve>): {
  pendingRequests: number;
  pendingWebSockets: number;
  subscribers: Record<string, number>;
} {
  const subscribers: Record<string, number> = {};
  
  // Get subscriber counts for known topics
  const knownTopics: string[] = ["chat", "telegram", "ws", "updates"];
  for (const topic of knownTopics) {
    try {
      const count = server.subscriberCount(topic);
      if (count > 0) {
        subscribers[topic] = count;
      }
    } catch {
      // Topic may not exist, ignore
    }
  }

  return {
    pendingRequests: server.pendingRequests,
    pendingWebSockets: server.pendingWebSockets,
    subscribers,
  };
}
```

**File**: `src/index.ts`

```typescript
/**
 * Get the Bun server instance for accessing built-in metrics
 * @see {@link https://bun.sh/docs/api/http-server#metrics|Bun Server Metrics}
 */
export function getServer(): ReturnType<typeof Bun.serve> {
  return server;
}
```

---

## API Endpoints

### `GET /health`

Returns JSON health check with Bun server metrics.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z",
  "metrics": {
    "pendingRequests": 5,
    "pendingWebSockets": 2,
    "subscribers": {
      "chat": 10,
      "telegram": 5
    }
  }
}
```

**Implementation**: `src/api/routes.ts:101`

---

### `GET /metrics`

Returns Prometheus-formatted metrics including Bun server metrics.

**Response** (Prometheus format):
```text
# HELP bun_server_pending_requests Active HTTP requests
# TYPE bun_server_pending_requests gauge
bun_server_pending_requests 5

# HELP bun_server_pending_websockets Active WebSocket connections
# TYPE bun_server_pending_websockets gauge
bun_server_pending_websockets 2

# HELP bun_server_subscribers WebSocket subscribers per topic
# TYPE bun_server_subscribers gauge
bun_server_subscribers{topic="chat"} 10
bun_server_subscribers{topic="telegram"} 5
```

**Implementation**: `src/api/routes.ts:96`

---

## Usage Examples

### Accessing Metrics in Code

```typescript
import { getServer } from "../index";
import { getBunServerMetrics } from "../observability/metrics";

const server = getServer();
const metrics = getBunServerMetrics(server);

console.log(`Active requests: ${metrics.pendingRequests}`);
console.log(`Active WebSockets: ${metrics.pendingWebSockets}`);
console.log(`Chat subscribers: ${metrics.subscribers.chat || 0}`);
```

### Monitoring with Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'nexus'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Health Check Monitoring

```bash
# Check health with metrics
curl http://localhost:3000/health | jq '.metrics'

# Output:
# {
#   "pendingRequests": 5,
#   "pendingWebSockets": 2,
#   "subscribers": {
#     "chat": 10,
#     "telegram": 5
#   }
# }
```

---

## Prometheus Metrics

### Custom Metrics

NEXUS also exposes custom application metrics:

- `bookmaker_moves_total` - Total moves per bookmaker
- `steam_move_latency_ms` - Time to detect steam moves (histogram)

### Bun Server Metrics

- `bun_server_pending_requests` (gauge) - Active HTTP requests
- `bun_server_pending_websockets` (gauge) - Active WebSocket connections
- `bun_server_subscribers{topic="..."}` (gauge) - WebSocket subscribers per topic

---

## Related Documentation

- [Bun Server Metrics Documentation](https://bun.sh/docs/api/http-server#metrics)
- [Bun.serve() Documentation](https://bun.sh/docs/api/http-server)
- [Prometheus Metrics Format](https://prometheus.io/docs/instrumenting/exposition_formats/)
- [API Documentation](/docs) - Full API reference

---

## Code References

- **Server Instance Export**: `src/index.ts:getServer()`
- **Metrics Collection**: `src/observability/metrics.ts:getBunServerMetrics()`
- **Health Endpoint**: `src/api/routes.ts:101`
- **Metrics Endpoint**: `src/api/routes.ts:96`
- **OpenAPI Documentation**: `src/api/docs.ts:/health`, `/metrics`

---

**Last Updated**: 2025-01-15  
**Bun Version**: 1.3.3+  
**Status**: ✅ Production Ready
