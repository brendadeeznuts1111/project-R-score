# 🚀 Fire22 Dashboard Worker API Routing Documentation

## Table of Contents

- [Overview](#overview)
- [Authentication & Authorization](#authentication--authorization)
- [API Endpoint Groups](#api-endpoint-groups)
- [Routing Architecture](#routing-architecture)
- [Middleware Stack](#middleware-stack)
- [Special API Systems](#special-api-systems)
- [Testing & Examples](#testing--examples)

## Overview

The Fire22 Dashboard Worker implements a comprehensive REST API with **119+
endpoints** organized into modular route groups. The system uses multiple
routing frameworks optimized for different use cases.

### Key Statistics

- **Total Endpoints**: 119+ routes
- **API Groups**: 7 main groups + 3 special systems
- **Authentication**: JWT-based with role permissions
- **Rate Limiting**: Role-based (100-1000 req/min)
- **Frameworks**: itty-router, Hono, Express

## Authentication & Authorization

### JWT Authentication

```typescript
// Authentication endpoints
POST / api / auth / login; // User login
POST / api / auth / logout; // User logout
GET / api / auth / verify; // Token verification
```

### Role-Based Permissions

- **Admin**: Full system access
- **Manager**: Customer and wager management
- **Financial**: Withdrawal and deposit operations
- **Customer**: Limited read-only access

### Headers Required

```bash
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## API Endpoint Groups

### 🔐 Authentication Routes (`/api/auth`)

| Method | Endpoint           | Description         | Auth Required |
| ------ | ------------------ | ------------------- | ------------- |
| POST   | `/api/auth/login`  | User authentication | No            |
| POST   | `/api/auth/logout` | User logout         | Yes           |
| GET    | `/api/auth/verify` | Verify JWT token    | Yes           |

### 👨‍💼 Admin Routes (`/api/admin`)

| Method | Endpoint                                  | Description           | Permission |
| ------ | ----------------------------------------- | --------------------- | ---------- |
| POST   | `/api/admin/settle-wagers`                | Settle pending wagers | admin.\*   |
| POST   | `/api/admin/bulk-settle`                  | Bulk wager settlement | admin.\*   |
| POST   | `/api/admin/void-wager`                   | Void a wager          | admin.\*   |
| POST   | `/api/admin/create-customer`              | Create new customer   | admin.\*   |
| POST   | `/api/admin/import-customers`             | Bulk import customers | admin.\*   |
| POST   | `/api/admin/deposit`                      | Process deposit       | admin.\*   |
| POST   | `/api/admin/sync-fire22`                  | Sync with Fire22 API  | admin.\*   |
| GET    | `/api/admin/debug/cache-stats`            | Cache statistics      | admin.\*   |
| GET    | `/api/admin/agent-configs-dashboard`      | Agent configurations  | admin.\*   |
| GET    | `/api/admin/permissions-matrix-dashboard` | Permissions overview  | admin.\*   |

### 📊 Manager Routes (`/api/manager`)

| Method | Endpoint                              | Description        | Permission |
| ------ | ------------------------------------- | ------------------ | ---------- |
| POST   | `/api/manager/getWeeklyFigureByAgent` | Weekly performance | manager.\* |
| POST   | `/api/manager/getParlayActivity`      | Parlay activity    | manager.\* |
| POST   | `/api/manager/getLiveWagers`          | Live wagers        | manager.\* |
| POST   | `/api/manager/getLiveActivity`        | Live activity feed | manager.\* |
| POST   | `/api/manager/getCustomers`           | Customer list      | manager.\* |
| POST   | `/api/manager/getCustomerDetails`     | Customer details   | manager.\* |
| POST   | `/api/manager/getAgentPerformance`    | Agent metrics      | manager.\* |
| POST   | `/api/manager/getBetTicker`           | Bet ticker feed    | manager.\* |
| GET    | `/api/manager/reports/daily`          | Daily reports      | manager.\* |
| GET    | `/api/manager/reports/weekly`         | Weekly reports     | manager.\* |
| GET    | `/api/manager/reports/monthly`        | Monthly reports    | manager.\* |

### 💰 Financial Routes (`/api/financial`) - _[Fixed Double Slash Bug]_

| Method | Endpoint                              | Description          | Permission   |
| ------ | ------------------------------------- | -------------------- | ------------ |
| POST   | `/api/financial/withdrawals/request`  | Request withdrawal   | financial.\* |
| POST   | `/api/financial/withdrawals/approve`  | Approve withdrawal   | financial.\* |
| POST   | `/api/financial/withdrawals/complete` | Complete withdrawal  | financial.\* |
| POST   | `/api/financial/withdrawals/reject`   | Reject withdrawal    | financial.\* |
| GET    | `/api/financial/withdrawals/pending`  | Pending withdrawals  | financial.\* |
| GET    | `/api/financial/withdrawals`          | All withdrawals      | financial.\* |
| POST   | `/api/financial/queue/init`           | Initialize P2P queue | financial.\* |
| POST   | `/api/financial/queue/withdrawal`     | Queue withdrawal     | financial.\* |
| POST   | `/api/financial/queue/deposit`        | Queue deposit        | financial.\* |
| GET    | `/api/financial/queue/stats`          | Queue statistics     | financial.\* |
| GET    | `/api/financial/queue/items`          | Queue items          | financial.\* |
| GET    | `/api/financial/queue/opportunities`  | P2P opportunities    | financial.\* |
| POST   | `/api/financial/queue/process`        | Process queue        | financial.\* |
| POST   | `/api/financial/queue/complete`       | Complete transaction | financial.\* |

### 👤 Customer Routes (`/api/customer`)

| Method | Endpoint                     | Description        | Permission  |
| ------ | ---------------------------- | ------------------ | ----------- |
| POST   | `/api/customer/getHeriarchy` | Customer hierarchy | customer.\* |

### ❤️ Health Routes (`/api/health`)

| Method | Endpoint                  | Description          | Auth Required |
| ------ | ------------------------- | -------------------- | ------------- |
| GET    | `/api/health`             | System health status | No            |
| GET    | `/api/health/ready`       | Readiness check      | No            |
| GET    | `/api/health/live`        | Liveness probe       | No            |
| GET    | `/api/health/metrics`     | Health metrics       | Yes           |
| GET    | `/api/health/permissions` | Permissions check    | Yes           |
| GET    | `/api/health/fire22`      | Fire22 API status    | Yes           |
| GET    | `/api/health/database`    | Database status      | Yes           |

### 📈 Other Routes (`/api/other`)

Large collection of analytics, reporting, and Fire22 integration endpoints (49+
routes).

## Special API Systems

### 🎯 Hub API (`/api/hub`)

Advanced system integration endpoints for D1, R2, SQLite, Language, and Telegram
systems.

#### Hub Endpoints Overview

```typescript
// Health & Metrics
GET  /api/hub/health              // Hub health check
GET  /api/hub/test                // Connection test
GET  /api/hub/metrics             // Comprehensive metrics

// D1 Database
POST /api/hub/d1/:database/query     // Execute D1 query
GET  /api/hub/d1/:database/tables    // List tables
GET  /api/hub/d1/:database/schema/:table // Table schema

// R2 Storage
POST /api/hub/r2/:bucket/upload      // Upload file
GET  /api/hub/r2/:bucket/download/:key // Download file
DELETE /api/hub/r2/:bucket/:key      // Delete file
GET  /api/hub/r2/:bucket/list        // List objects

// SQLite Sync
POST /api/hub/sqlite/sync            // Sync SQLite data

// Language System
GET  /api/hub/language/codes         // All language codes
GET  /api/hub/language/text/:code    // Get text by code
POST /api/hub/language/sync          // Sync language data
POST /api/hub/language/set           // Set language

// Telegram Integration
GET  /api/hub/telegram/status        // Bot status
POST /api/hub/telegram/notify        // Send notification
POST /api/hub/telegram/support-ticket // Create ticket
GET  /api/hub/telegram/metrics       // Telegram metrics
```

### 📦 Package Review Grid (`/api/packages`)

```typescript
GET  /api/packages/review-grid       // Complete package analysis
GET  /api/packages/analyze/:path     // Analyze specific package
GET  /api/packages/discover          // Discover all packages
```

### 🔄 Unified API Handler

Consolidated endpoint handler for dashboard and Telegram bot integration.

## Routing Architecture

### Framework Stack

```typescript
// Main API Router (itty-router)
import { Router } from 'itty-router';
const router = Router({ base: '/api' });

// Hub Endpoints (Hono)
import { Hono } from 'hono';
const app = new Hono();

// Config Routes (Express)
import express from 'express';
const router = express.Router();
```

### Route Organization

```
src/api/
├── index.ts                 # Main API router
├── routes/
│   ├── auth.routes.ts      # Authentication routes
│   ├── admin.routes.ts     # Admin operations
│   ├── manager.routes.ts   # Manager endpoints
│   ├── financial.routes.ts # Financial operations
│   ├── customer.routes.ts  # Customer endpoints
│   ├── health.routes.ts    # Health checks
│   ├── config.routes.ts    # Configuration
│   └── other.routes.ts     # Miscellaneous
├── controllers/
│   └── [corresponding controllers]
├── middleware/
│   ├── auth.middleware.ts
│   ├── authorize.middleware.ts
│   ├── rateLimit.middleware.ts
│   └── validate.middleware.ts
└── schemas/
    └── index.ts            # Request/response schemas
```

## Middleware Stack

### Execution Order

1. **CORS** - Cross-origin resource sharing
2. **Rate Limiting** - Request throttling
3. **Authentication** - JWT verification
4. **Authorization** - Role-based access
5. **Validation** - Request schema validation
6. **Controller** - Business logic
7. **Error Handler** - Centralized error handling

### Rate Limiting Configuration

```typescript
// Default limits
General: 100 requests/minute
Authenticated: 500 requests/minute
Admin: 1000 requests/minute
Financial: 200 requests/minute

// Endpoint-specific
POST /api/auth/login: 5 requests/minute
POST /api/admin/bulk-*: 10 requests/minute
```

## Testing & Examples

### Basic Authentication

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'

# Use token for authenticated requests
curl -X GET http://localhost:3001/api/health/metrics \
  -H "Authorization: Bearer <jwt_token>"
```

### Fire22 Integration

```bash
# Sync customers
curl -X POST http://localhost:3001/api/admin/sync-fire22 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"

# Get live wagers
curl -X POST http://localhost:3001/api/manager/getLiveWagers \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "AGENT001", "limit": 50}'
```

### Package Review

```bash
# Get package review grid
curl -X GET http://localhost:3001/api/packages/review-grid \
  -H "Authorization: Bearer <jwt_token>"
```

### Hub Operations

```bash
# Execute D1 query
curl -X POST http://localhost:3001/api/hub/d1/fire22-dashboard/query \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM customers LIMIT 10"}'
```

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Common Error Codes

- `AUTH_001` - Invalid credentials
- `AUTH_002` - Token expired
- `AUTH_003` - Insufficient permissions
- `RATE_001` - Rate limit exceeded
- `VAL_001` - Validation error
- `SYS_001` - Internal server error

## Development Notes

### Fixed Issues

- ✅ Fixed double slash bug in financial routes (`//api/` → `/api/`)
- ✅ Standardized route prefixes across all route files
- ✅ Consolidated middleware execution order

### TODO Items

- ⚠️ Complete financial controller implementations
- ⚠️ Add OpenAPI/Swagger documentation
- ⚠️ Implement comprehensive error logging
- ⚠️ Add request/response interceptors
- ⚠️ Create postman collection

## Performance Optimizations

### Caching Strategy

- **Customer Data**: 5-minute TTL
- **Agent Hierarchy**: 15-minute TTL
- **Fire22 API**: Request-level caching
- **DNS Prefetching**: Proactive resolution

### Database Optimization

- **Connection Pooling**: Max 20 connections
- **Query Optimization**: Indexed lookups
- **Batch Operations**: Bulk insert/update support

## Security Considerations

### Best Practices

- JWT tokens expire after 24 hours
- Refresh tokens stored securely
- Rate limiting prevents abuse
- Input validation on all endpoints
- SQL injection prevention
- XSS protection headers
- CORS configuration

### Audit Trail

- All financial operations logged
- User actions tracked
- API access monitoring
- Security events recorded

---

_Last Updated: 2024-12-28_ _Version: 4.0.0-staging_ _Total Endpoints: 119+_
