# API Reference

The Fire22 Dashboard provides a comprehensive RESTful API with real-time
capabilities, DNS optimization, and enterprise-grade security.

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://fire22-dashboard.workers.dev`

## Authentication

Most endpoints require JWT authentication. Include the token in the
Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

<div className="api-endpoint">
<strong>🔑 Get Token:</strong> <code>POST /api/auth/login</code><br/>
<strong>📝 Body:</strong> <code>{"username": "admin", "password": "your-password"}</code>
</div>

## Rate Limiting

API endpoints are protected by intelligent rate limiting:

- **General**: 100 requests per minute
- **Authentication**: 5 attempts per minute
- **Fire22 Sync**: 10 requests per minute
- **Health Checks**: Unlimited

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    "result": "..."
  },
  "timestamp": "2024-12-19T10:30:00Z",
  "performance": {
    "responseTime": "2ms",
    "dnsResolution": "0.5ms"
  }
}
```

## API Categories

### 🏥 Health & Monitoring

- [`GET /health`](./dashboard/health) - System health status
- [`GET /api/live`](./dashboard/live-events) - Real-time events (SSE)
- [`GET /api/system/stats`](./dashboard/system-stats) - System statistics

### 🔥 Fire22 Integration

- [`GET /api/customers`](./fire22/customers) - Customer data (2,600+ records)
- [`POST /api/fire22/sync-customers`](./fire22/customers) - Force sync
- [`GET /api/agents/hierarchy`](./fire22/agents) - 8-level agent hierarchy
- [`POST /api/manager/getLiveWagers`](./fire22/wagers) - Live wager data

### 🚀 Performance & DNS

- [`GET /api/fire22/dns-stats`](./fire22/cache) - DNS cache statistics
- [`POST /api/fire22/refresh-dns`](./fire22/cache) - Manual cache refresh
- [`GET /api/fire22/dns-config`](./fire22/cache) - DNS configuration

### 🔒 Security

- [`POST /api/auth/login`](./security/authentication) - User authentication
- [`GET /api/security/scan`](./security/scanner) - Security scan results

## Real-time Features

### Server-Sent Events (SSE)

The dashboard supports real-time updates via SSE:

```javascript
const eventSource = new EventSource('/api/live');

eventSource.addEventListener('fire22-status', event => {
  const data = JSON.parse(event.data);
  console.log('Fire22 Status:', data);
});

eventSource.addEventListener('system-metrics', event => {
  const metrics = JSON.parse(event.data);
  console.log('System Metrics:', metrics);
});
```

<div className="performance-metric">
⚡ <strong>Real-time Performance:</strong><br/>
• Event Latency: <Onems local processing<br/>
• Connection Pooling: Max 100 concurrent SSE connections<br/>
• Heartbeat: Every 30 seconds<br/>
• Automatic Reconnection: 5 retry attempts
</div>

## DNS Caching System

Fire22 Dashboard includes advanced DNS optimization:

### Prefetched Domains

- `fire22.ag` - Main Fire22 API
- `api.fire22.ag` - API endpoints
- `cloud.fire22.ag` - Cloud services
- `api.cloudflare.com` - Cloudflare infrastructure
- `workers.dev` - Workers platform
- `pages.dev` - Pages platform

### Cache Configuration

```bash
# Environment-specific DNS TTL settings
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5    # Development
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=30   # Production
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=60   # High-performance
```

## Error Handling

The API uses standard HTTP status codes:

- **200** - Success
- **400** - Bad Request
- **401** - Unauthorized
- **429** - Rate Limited
- **500** - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request parameters are invalid",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "timestamp": "2024-12-19T10:30:00Z"
}
```

## Quick Examples

### Health Check

```bash
curl http://localhost:3001/health
```

### Get Fire22 Customers

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3001/api/customers
```

### Check DNS Performance

```bash
curl http://localhost:3001/api/fire22/dns-stats
```

### Start SSE Connection

```bash
curl -N -H "Accept: text/event-stream" \
     http://localhost:3001/api/live
```

## SDK & Libraries

### JavaScript/TypeScript

````typescript
```javascript
```javascript
import { Fire22Client } from '@fire22/client';
````

```text

const client = new Fire22Client({
  baseUrl: 'http://localhost:3001',
  apiKey: 'your-api-key'
});

// Get customers with caching
const customers = await client.customers.list({
  cache: true,
  limit: 100
});
```

### Bun Native

```typescript
// Using Bun's native features
const response = await fetch('http://localhost:3001/api/customers', {
  headers: {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Fire22-Dashboard/1.0.0 Bun',
  },
});

const data = await response.json();
```

## Next Steps

- 🏥 [Health Monitoring](./dashboard/health) - System health endpoints
- 🔥 [Fire22 Integration](./fire22/authentication) - Fire22 API details
- 🔒 [Security Guide](./security/authentication) - Authentication & security
- ⚡ [Performance Optimization](/architecture/performance/caching) - Advanced
  caching

---

`&lt;div className="fire22-badge"&gt;`RESTful API</div>
`&lt;div className="fire22-badge"&gt;`Real-time SSE</div>
`&lt;div className="fire22-badge"&gt;`DNS Optimized</div>
