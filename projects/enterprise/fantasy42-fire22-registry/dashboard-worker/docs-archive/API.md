# 🔌 Fire22 Dashboard API Reference

## Overview

The Fire22 Dashboard API provides comprehensive endpoints for sports betting
operations, real-time monitoring, and system management.

## Base URLs

| Environment | URL                             | Authentication |
| ----------- | ------------------------------- | -------------- |
| Production  | `https://api.fire22.ag`         | Required       |
| Staging     | `https://staging-api.fire22.ag` | Required       |
| Development | `http://localhost:3001`         | Optional       |

## Authentication

### JWT Bearer Token

All API requests require authentication using JWT Bearer tokens:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Obtaining Tokens

```typescript
// POST /api/auth/login
const response = await fetch('https://api.fire22.ag/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'password123',
  }),
});

const { token, expiresIn } = await response.json();
// Token expires in 24 hours
```

## Core Endpoints

### Dashboard

#### GET /dashboard

Returns the main dashboard HTML interface.

**Response**: `text/html`

```html
<!doctype html>
<html>
  <head>
    <title>Fire22 Dashboard</title>
    <link rel="stylesheet" href="/styles/index.css" />
  </head>
  <body>
    <!-- Dashboard content -->
  </body>
</html>
```

#### GET /api/live

Server-Sent Events stream for real-time updates.

**Response**: `text/event-stream`

```typescript
// Example SSE messages
data: {"type":"metrics","timestamp":1703001234567,"data":{"requests":1234,"latency":45}}

data: {"type":"wager","timestamp":1703001234568,"data":{"id":"w123","amount":100,"status":"pending"}}

data: {"type":"agent","timestamp":1703001234569,"data":{"id":"a456","action":"login","tier":3}}
```

### Fire22 Integration

#### POST /api/manager/getLiveWagers

Get all pending wagers requiring attention.

**Request Body**:

```json
{
  "agentId": "uuid-string",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "status": "pending",
  "limit": 100,
  "offset": 0
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "wagers": [
      {
        "id": "w123",
        "customerId": "c456",
        "customerName": "John Doe",
        "agentId": "a789",
        "amount": 150.0,
        "type": "single",
        "sport": "football",
        "event": "Team A vs Team B",
        "odds": 1.95,
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00Z",
        "expiresAt": "2024-01-15T14:30:00Z"
      }
    ],
    "total": 42,
    "hasMore": true
  }
}
```

#### POST /api/manager/getWeeklyFigureByAgent

Get weekly performance metrics for agents.

**Request Body**:

```json
{
  "agentId": "uuid-string",
  "weekOf": "2024-01-15",
  "includeSubs": true,
  "metrics": ["wagers", "revenue", "commissions", "players"]
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "a789",
      "username": "agent001",
      "tier": 3
    },
    "metrics": {
      "wagers": {
        "count": 342,
        "volume": 45670.0,
        "won": 156,
        "lost": 186
      },
      "revenue": {
        "gross": 12340.0,
        "net": 8456.0,
        "margin": 0.185
      },
      "commissions": {
        "earned": 1234.0,
        "rate": 0.1
      },
      "players": {
        "active": 89,
        "new": 12,
        "churned": 3
      }
    },
    "comparison": {
      "previousWeek": {
        "revenue": 11230.0,
        "change": 0.099
      },
      "yearAgo": {
        "revenue": 9870.0,
        "change": 0.251
      }
    },
    "subAgents": [
      {
        "id": "a790",
        "metrics": {
          "revenue": 3456.0,
          "players": 23
        }
      }
    ]
  }
}
```

### Customer Management

#### GET /api/customers

Get paginated list of customers.

**Query Parameters**:

- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 50, max: 200)
- `search` (string): Search by name/username
- `agentId` (uuid): Filter by agent
- `status` (string): active|suspended|blocked
- `sortBy` (string): name|balance|created
- `order` (string): asc|desc

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "c123",
        "username": "player001",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "balance": 500.0,
        "currency": "USD",
        "status": "active",
        "agentId": "a789",
        "tier": 1,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastActiveAt": "2024-01-15T12:00:00Z",
        "stats": {
          "totalWagers": 145,
          "totalWon": 4560.0,
          "totalLost": 3890.0
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 2600,
      "pages": 52
    }
  }
}
```

#### POST /api/customers

Create a new customer.

**Request Body**:

```json
{
  "username": "newplayer",
  "password": "securePassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+1234567891",
  "agentId": "a789",
  "initialDeposit": 100.0,
  "currency": "USD"
}
```

**Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "c124",
    "username": "newplayer",
    "balance": 100.0,
    "status": "active",
    "createdAt": "2024-01-15T13:00:00Z"
  }
}
```

### Agent Hierarchy

#### GET /api/agents/hierarchy

Get the complete 8-level agent hierarchy.

**Query Parameters**:

- `rootId` (uuid): Start from specific agent
- `depth` (integer): Max depth (1-8)
- `includeStats` (boolean): Include performance stats

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "hierarchy": {
      "id": "a001",
      "username": "master",
      "tier": 8,
      "stats": {
        "directCustomers": 0,
        "totalCustomers": 2600,
        "weeklyRevenue": 125000.0
      },
      "children": [
        {
          "id": "a010",
          "username": "senior001",
          "tier": 7,
          "stats": {
            "directCustomers": 5,
            "totalCustomers": 450
          },
          "children": [
            {
              "id": "a100",
              "username": "manager001",
              "tier": 6,
              "children": []
            }
          ]
        }
      ]
    },
    "summary": {
      "totalAgents": 156,
      "byTier": {
        "8": 1,
        "7": 5,
        "6": 20,
        "5": 35,
        "4": 40,
        "3": 30,
        "2": 20,
        "1": 5
      }
    }
  }
}
```

### Synchronization

#### POST /api/sync/fire22-customers

Force synchronization with Fire22 API.

**Request Body**:

```json
{
  "fullSync": true,
  "since": "2024-01-01T00:00:00Z",
  "batchSize": 100,
  "dryRun": false
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "synced": 2600,
    "created": 45,
    "updated": 2555,
    "errors": 0,
    "duration": 4567,
    "nextSyncToken": "token_xyz",
    "summary": {
      "customers": {
        "active": 2400,
        "suspended": 150,
        "blocked": 50
      },
      "balances": {
        "total": 456789.0,
        "average": 175.68
      }
    }
  }
}
```

### Health & Monitoring

#### GET /health

System health check.

**Response**: `200 OK`

```json
{
  "status": "healthy",
  "timestamp": 1703001234567,
  "uptime": 864000,
  "version": "2.0.0",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 5,
      "connections": 12
    },
    "fire22Api": {
      "status": "healthy",
      "latency": 45,
      "lastSync": "2024-01-15T12:00:00Z"
    },
    "cache": {
      "status": "healthy",
      "hitRate": 0.95,
      "memory": "45MB/128MB"
    },
    "dns": {
      "status": "healthy",
      "cached": 6,
      "avgLatency": 1
    }
  }
}
```

#### GET /api/test/fire22

Test Fire22 API connectivity.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "connected": true,
    "latency": 45,
    "version": "1.5.0",
    "endpoints": {
      "auth": "available",
      "customers": "available",
      "wagers": "available",
      "reports": "available"
    }
  }
}
```

### DNS Management

#### GET /api/fire22/dns-stats

Get DNS cache statistics.

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "cacheHitsCompleted": 1234,
    "cacheMisses": 56,
    "cacheSize": 6,
    "totalCount": 1290,
    "errors": 0,
    "ttlConfig": 30,
    "domains": [
      {
        "domain": "fire22.ag",
        "hits": 456,
        "avgLatency": 0.8
      }
    ]
  }
}
```

#### POST /api/fire22/refresh-dns

Manually refresh DNS cache.

**Request Body**:

```json
{
  "domains": ["fire22.ag", "api.fire22.ag"],
  "force": true
}
```

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "refreshed": 2,
    "duration": 15,
    "results": {
      "fire22.ag": "104.21.45.67",
      "api.fire22.ag": "104.21.45.68"
    }
  }
}
```

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": 1703001234567,
    "requestId": "req_xyz123"
  }
}
```

### Common Error Codes

| Code                  | Status | Description                  |
| --------------------- | ------ | ---------------------------- |
| `AUTH_REQUIRED`       | 401    | Missing authentication token |
| `AUTH_INVALID`        | 401    | Invalid or expired token     |
| `FORBIDDEN`           | 403    | Insufficient permissions     |
| `NOT_FOUND`           | 404    | Resource not found           |
| `VALIDATION_ERROR`    | 400    | Invalid request data         |
| `RATE_LIMITED`        | 429    | Too many requests            |
| `SERVER_ERROR`        | 500    | Internal server error        |
| `SERVICE_UNAVAILABLE` | 503    | Temporary outage             |

## Rate Limiting

Rate limits per tier:

| Tier       | Requests/Second | Burst |
| ---------- | --------------- | ----- |
| Free       | 10              | 20    |
| Basic      | 100             | 200   |
| Pro        | 1000            | 2000  |
| Enterprise | Unlimited       | -     |

Headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703001234567
```

## Pagination

Standard pagination parameters:

```typescript
interface PaginationParams {
  page?: number; // Current page (default: 1)
  limit?: number; // Items per page (default: 50)
  cursor?: string; // Cursor-based pagination
  sortBy?: string; // Sort field
  order?: 'asc' | 'desc'; // Sort order
}

interface PaginationResponse {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
  };
}
```

## Webhooks

### Webhook Events

Configure webhooks for real-time events:

```json
{
  "url": "https://your-domain.com/webhooks/fire22",
  "events": [
    "customer.created",
    "customer.updated",
    "wager.placed",
    "wager.settled",
    "agent.login",
    "balance.changed"
  ],
  "secret": "webhook_secret_123"
}
```

### Webhook Payload

```json
{
  "event": "wager.placed",
  "timestamp": 1703001234567,
  "data": {
    "wagerId": "w123",
    "customerId": "c456",
    "amount": 100.0
  },
  "signature": "sha256=abc123..."
}
```

## SDKs & Client Libraries

### TypeScript/JavaScript

```bash
npm install @fire22/dashboard-client
```

````typescript
```javascript
import { Fire22Client } from '@fire22/dashboard-client';
````text

const client = new Fire22Client({ apiKey: 'your_api_key', environment:
'production' });

const customers = await client.customers.list({ page: 1, limit: 50 });

````

### Python

```bash
pip install fire22-dashboard
````

```python
from fire22_dashboard import Fire22Client

client = Fire22Client(
    api_key='your_api_key',
    environment='production'
)

customers = client.customers.list(
    page=1,
    limit=50
)
```

## API Versioning

The API uses URL versioning:

- Current: `/api/v2/`
- Previous: `/api/v1/` (deprecated)
- Beta: `/api/v3-beta/`

Include version in Accept header:

```http
Accept: application/vnd.fire22.v2+json
```

## Testing

### Test Environment

Base URL: `https://test-api.fire22.ag`

Test credentials:

```json
{
  "username": "test_admin",
  "password": "test123!",
  "apiKey": "test_key_xyz"
}
```

### Postman Collection

Import the Postman collection:
[Fire22 Dashboard API.postman_collection.json](./postman/collection.json)

### cURL Examples

```bash
# Authentication
curl -X POST https://api.fire22.ag/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Get customers
curl https://api.fire22.ag/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create wager
curl -X POST https://api.fire22.ag/api/wagers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"c123","amount":100,"type":"single"}'
```

---

API Version: 2.0.0 | Last Updated: 2025-08-27
