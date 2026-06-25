# Sports Terminal OS — Complete API Contract

> **Version:** 5.2.0
> **Status:** Authoritative Specification
> **OpenAPI:** 3.1.0 compatible
> **Last Updated:** 2025-01-15

---

## Table of Contents

1. [Base Configuration](#1-base-configuration)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Error Format](#3-error-format)
4. [Auth Matrix](#4-auth-matrix)
5. [Rate Limiting Rules](#5-rate-limiting-rules)
6. [Category A: Authentication (3 endpoints)](#6-category-a-authentication)
7. [Category B: Secrets Vault (3 endpoints)](#7-category-b-secrets-vault)
8. [Category C: Buckeye Live Data (4 endpoints)](#8-category-c-buckeye-live-data)
9. [Category D: Agent Decisions (5 endpoints)](#9-category-d-agent-decisions)
10. [Category E: IP Intelligence (8 endpoints)](#10-category-e-ip-intelligence)
11. [Category F: Rules Engine (5 endpoints)](#11-category-f-rules-engine)
12. [Category G: Player Intelligence (7 endpoints)](#12-category-g-player-intelligence)
13. [Category H: Sandbox v1 (6 endpoints)](#13-category-h-sandbox-v1)
14. [Category I: Sandbox v2 (7 endpoints)](#14-category-i-sandbox-v2)
15. [Category J: Export (1 endpoint)](#15-category-j-export)
16. [Category K: Kimi AI (1 endpoint)](#16-category-k-kimi-ai)
17. [Category L: Risk Command Center (19 endpoints)](#17-category-l-risk-command-center)
18. [Category M: Enforcement (8 endpoints)](#18-category-m-enforcement)
19. [Category N: Player Search (3 endpoints)](#19-category-n-player-search)
20. [Category O: Agent Hub (12 endpoints)](#20-category-o-agent-hub)
21. [Category P: Benchmark (1 endpoint)](#21-category-p-benchmark)
22. [Partner Profile OS Endpoints](#22-partner-profile-os-endpoints)
23. [Telegram Hub Endpoints](#23-telegram-hub-endpoints)
24. [WebSocket Registry](#24-websocket-registry)
25. [SSE Endpoints](#25-sse-endpoints)
26. [Appendix: Complete Endpoint Index](#26-appendix-complete-endpoint-index)

---

## 1. Base Configuration

| Field | Value |
|---|---|
| **Base URL** | `http://localhost:3000` (development) |
| **Protocol** | HTTP/1.1 (Bun.serve) with WebSocket upgrade |
| **Content-Type** | `application/json` for all request/response bodies |
| **CORS** | Enabled for all origins in dev; restricted in prod |
| **Encoding** | UTF-8 |
| **Date Format** | ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`) |
| **Timestamp** | Unix milliseconds for internal fields |
| **Currency** | Cents (integer) for all monetary values unless noted |

### Common Headers

| Header | Description | Required |
|---|---|---|
| `Authorization: Bearer <jwt>` | JWT access token (HS256) | See Auth Matrix |
| `X-API-Key: <key>` | Admin API key for proxy endpoints | See Auth Matrix |
| `X-Admin-Token: <token>` | ADMIN_API_TOKEN for sensitive mutations | Admin only |
| `Content-Type: application/json` | Request body content type | POST/PUT/PATCH |
| `Accept: application/json` | Response content type negotiation | Optional |

---

## 2. Authentication & Authorization

### 2.1 JWT Authentication

**Signing Algorithm:** HS256
**Token Lifetime:** 24 hours
**Renewal Window:** Last 4 hours via `/api/proxy/renewToken`

```json
// JWT Payload Structure
{
  "sub": "user_id_or_agent_login",
  "role": "admin" | "agent" | "viewer",
  "iat": 1704067200,
  "exp": 1704153600,
  "jti": "unique-token-id"
}
```

### 2.2 API Key Authentication

Proxy endpoints to Buckeye use `X-API-Key` header. Key is stored in environment variable `PROXY_API_KEY`.

### 2.3 Session Authentication

Buckeye sessions use a JWT + `cf_clearance` cookie combination for Cloudflare-protected upstream at `fantasy402.com:443`.

### 2.4 Dev Bypass

Set `DEV_BYPASS_JWT=true` to skip JWT verification. All endpoints return 200 with mock user context.

---

## 3. Error Format

### 3.1 HTTP Error Response

All errors follow this consistent shape:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {},
  "timestamp": "2025-01-15T10:30:00Z",
  "requestId": "req_abc123"
}
```

### 3.2 Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT/API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid request body or parameters |
| `VALIDATION_ERROR` | 400 | Request body failed schema validation |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unhandled server error |
| `BAD_GATEWAY` | 502 | Upstream (Buckeye) unreachable |
| `GATEWAY_TIMEOUT` | 504 | Upstream request timed out |
| `PARTNER_NOT_FOUND` | 404 | Partner ID does not exist |
| `TEMPLATE_NOT_FOUND` | 404 | Template ID does not exist |
| `INVALID_TRANSITION` | 400 | Invalid lifecycle state transition |
| `GUARD_CHECK_FAILED` | 400 | Lifecycle guard check rejected transition |
| `BLACKLISTED_BOOK` | 403 | Book is in partner blacklist |
| `KYC_PENDING` | 403 | Partner KYC not verified |
| `INSUFFICIENT_BALANCE` | 400 | Partner balance below threshold |
| `OPSEC_VIOLATION` | 403 | OpSec score exceeded limit |
| `MAX_EXPOSURE_EXCEEDED` | 400 | Stake exceeds max exposure per signal |
| `DAILY_LIMIT_EXCEEDED` | 400 | Stake exceeds remaining daily exposure |
| `MAX_SOURCES_REACHED` | 400 | Partner has maximum sources attached |
| `SOURCE_NOT_FOUND` | 404 | Source ID not in partner profile |
| `API_ACCESS_DENIED` | 403 | API access not enabled for partner |
| `TELEGRAM_BOT_UNHEALTHY` | 503 | Bot heartbeat stale (>60s) |
| `QUEUE_OVERFLOW` | 503 | Redis stream length exceeds threshold |
| `DB_CONNECTION_ERROR` | 500 | SQLite connection failure |
| `INVALID_TEMPLATE` | 400 | TOML template validation failed |
| `DUPLICATE_PARTNER` | 409 | Partner ID already exists |
| `DEPOSIT_FAILED` | 400 | Deposit validation failed |
| `WITHDRAWAL_FAILED` | 400 | Withdrawal validation failed |

### 3.3 Validation Error Details

When `VALIDATION_ERROR` occurs, the `details` field contains field-level errors:

```json
{
  "error": "Request validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "suggestedStake",
    "issue": "must be >= 0",
    "received": -1000
  }
}
```

### 3.4 WebSocket Error Format

```json
{
  "type": "error",
  "source": "endpoint_name",
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

---

## 4. Auth Matrix

Legend: `JWT` = Bearer token required | `API` = X-API-Key required | `Sess` = Session cookie | `Admin` = X-Admin-Token | `Pub` = Public

| Category | Auth Mode | Notes |
|---|---|---|
| Authentication endpoints | `Pub` | Login, token renewal |
| Secrets Vault | `JWT` + `Admin` | Admin only |
| Buckeye Live Data | `JWT` or `API` | Proxy to upstream |
| Agent Decisions | `JWT` | Authenticated users |
| IP Intelligence | `JWT` + `Admin` | Admin for mutations, viewer for reads |
| Rules Engine | `JWT` + `Admin` | Admin for CRUD, viewer for reads |
| Player Intelligence | `JWT` | Authenticated users |
| Sandbox v1/v2 | `JWT` | Authenticated users |
| Export | `JWT` or `API` | Authenticated users |
| Kimi AI | `JWT` + `Admin` | Admin key required |
| Risk Command Center | `JWT` | Authenticated users |
| Enforcement | `JWT` + `Admin` | Admin for mutations |
| Player Search | `JWT` | Authenticated users |
| Agent Hub | `JWT` | Agent or admin |
| Benchmark | `JWT` or `API` | Authenticated users |
| Partner Profile OS | `JWT` + `Admin` | Admin for mutations, viewer for reads |
| Telegram Hub | `JWT` + `Admin` | Admin for refresh, viewer for stats |

---

## 5. Rate Limiting Rules

### 5.1 Rate Limit Tiers

| Tier | Requests/Min | Requests/Hour | Applies To |
|---|---|---|---|
| `critical` | 10 | 100 | Auth, token renewal |
| `standard` | 60 | 3,600 | Most read endpoints |
| `intensive` | 120 | 10,000 | Search, export, analytics |
| `streaming` | 1,000 | 60,000 | WebSocket, SSE connections |
| `admin` | 180 | 10,800 | Admin mutations |
| `proxy` | 30 | 1,800 | Buckeye proxy calls |
| `ai` | 20 | 500 | Kimi AI endpoints |
| `signal` | 600 | 36,000 | Signal evaluation, routing |

### 5.2 Rate Limit Headers

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Maximum requests in window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `X-RateLimit-Tier` | Applied rate limit tier |

### 5.3 Rate Limit Response

```json
// HTTP 429
{
  "error": "Rate limit exceeded. Try again in 45 seconds.",
  "code": "RATE_LIMITED",
  "details": {
    "limit": 60,
    "window": "minute",
    "retryAfter": 45,
    "tier": "standard"
  }
}
```

### 5.4 Per-Endpoint Rate Limit Assignments

| Endpoint | Tier | Burst |
|---|---|---|
| POST /api/proxy/auth | `critical` | 5 |
| POST /api/proxy/renewToken | `critical` | 5 |
| GET /api/proxy/accountInfo | `standard` | 10 |
| All /api/vault/* | `admin` | 10 |
| All /api/proxy/* Buckeye | `proxy` | 10 |
| POST /api/agent/analyze-live | `ai` | 5 |
| POST /api/kimi/chat | `ai` | 5 |
| GET /api/players/search | `intensive` | 20 |
| POST /api/signals/route | `signal` | 100 |
| POST /api/partners/:id/evaluate | `signal` | 100 |
| GET /api/stream/live-wagers | `streaming` | — |
| WS /ws | `streaming` | — |
| GET /api/health/system-status | `standard` | 20 |
| POST /api/admin/bots/refresh | `admin` | 10 |
| GET /api/telegram/delivery-stats | `standard` | 15 |
| All /api/partners/* | `standard` | 15 |
| All /api/enforcement/* | `admin` | 10 |
| All /api/positions/* | `intensive` | 15 |



---

## 6. Category A: Authentication

> **Base:** `/api/proxy` | **Count:** 3 endpoints | **Auth:** Public (login), JWT (renew/info) | **Tier:** `critical`

These endpoints proxy authentication requests to the Buckeye upstream (`fantasy402.com:443`) and manage session state locally.

---

### A.1 POST /api/proxy/auth

Authenticate with Buckeye and establish a session.

**Auth:** `Pub`

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "captchaToken": "string?"
}
```

**Response 200:**
```json
{
  "success": true,
  "token": "buckeye_jwt_token_string",
  "user": {
    "id": "user_12345",
    "login": "agent_login",
    "role": "agent",
    "displayName": "Agent Name",
    "balance": 1500000,
    "currency": "USD"
  },
  "sessionId": "sess_abc123",
  "expiresAt": 1704153600
}
```

**Error Codes:** `BAD_REQUEST`, `UNAUTHORIZED`, `BAD_GATEWAY`, `GATEWAY_TIMEOUT`

---

### A.2 POST /api/proxy/renewToken

Renew an expiring Buckeye session token.

**Auth:** `JWT`

**Request Body:**
```json
{
  "token": "existing_buckeye_jwt_token"
}
```

**Response 200:**
```json
{
  "success": true,
  "token": "new_buckeye_jwt_token_string",
  "expiresAt": 1704153600
}
```

**Error Codes:** `UNAUTHORIZED`, `BAD_REQUEST`, `BAD_GATEWAY`

---

### A.3 GET /api/proxy/accountInfo

Retrieve current account information from Buckeye.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `sessionId` | string | No | Specific session to query |

**Response 200:**
```json
{
  "id": "user_12345",
  "login": "agent_login",
  "displayName": "Agent Name",
  "email": "agent@example.com",
  "role": "agent",
  "balance": 1500000,
  "pendingBalance": 250000,
  "currency": "USD",
  "status": "active",
  "createdAt": "2024-01-15T10:00:00Z",
  "lastLoginAt": "2025-01-15T08:30:00Z",
  "permissions": ["read", "write", "trade"],
  "limits": {
    "maxWager": 500000,
    "maxPayout": 1000000,
    "dailyWagerLimit": 5000000
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`, `BAD_GATEWAY`

---

## 7. Category B: Secrets Vault

> **Base:** `/api/vault` | **Count:** 3 endpoints | **Auth:** `JWT` + `Admin` | **Tier:** `admin`

Secure storage for API keys, tokens, and sensitive configuration values.

---

### B.1 GET /api/vault/secrets

List all stored secrets (keys only, no values).

**Auth:** `JWT` + `Admin` (`X-Admin-Token`)

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `prefix` | string | No | Filter by key prefix |
| `limit` | integer | No | Max results (default: 50, max: 200) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "secrets": [
    {
      "key": "BUCKEYE_API_KEY",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-10T12:00:00Z",
      "hasValue": true,
      "tags": ["production", "buckeye"]
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`

---

### B.2 POST /api/vault/secrets

Store or update a secret.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "key": "BUCKEYE_API_KEY",
  "value": "encrypted_secret_value",
  "tags": ["production", "buckeye"]
}
```

**Response 201:**
```json
{
  "key": "BUCKEYE_API_KEY",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "tags": ["production", "buckeye"]
}
```

**Response 200 (updated):**
```json
{
  "key": "BUCKEYE_API_KEY",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "tags": ["production", "buckeye"]
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`

---

### B.3 DELETE /api/vault/secrets/:key

Delete a secret from the vault.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `key` | string | Secret key identifier |

**Response 204:** No content

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

## 8. Category C: Buckeye Live Data

> **Base:** `/api/proxy` | **Count:** 4 endpoints | **Auth:** `JWT` or `API` (`X-API-Key`) | **Tier:** `proxy`

Real-time data ingestion from Buckeye upstream. These endpoints populate the `raw_players`, `raw_wagers`, and `raw_agent_performance` tables.

---

### C.1 GET /api/proxy/players

Retrieve player roster from Buckeye.

**Auth:** `JWT` or `API`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `sessionId` | string | No | Buckeye session ID |
| `updatedSince` | timestamp | No | Only players updated since this time |
| `limit` | integer | No | Max results (default: 100, max: 500) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "players": [
    {
      "id": "player_12345",
      "login": "player_login",
      "displayName": "Player Name",
      "balance": 500000,
      "status": "active",
      "archetype": "sharp",
      "riskTier": "GREEN",
      "lastActiveAt": "2025-01-15T10:00:00Z",
      "totalWagers": 150,
      "totalWagered": 7500000,
      "winRate": 0.58,
      "profitLoss": 1250000,
      "agentId": "agent_001"
    }
  ],
  "total": 247,
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `BAD_GATEWAY`, `GATEWAY_TIMEOUT`, `RATE_LIMITED`

---

### C.2 GET /api/proxy/wagers

Retrieve wager feed from Buckeye.

**Auth:** `JWT` or `API`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `sessionId` | string | No | Buckeye session ID |
| `since` | timestamp | No | Wagers placed since this time |
| `playerId` | string | No | Filter by player |
| `status` | enum | No | `pending`, `settled`, `cancelled`, `all` |
| `limit` | integer | No | Max results (default: 100, max: 500) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "wagers": [
    {
      "id": "wager_abc123",
      "playerId": "player_12345",
      "playerLogin": "player_login",
      "agentId": "agent_001",
      "sport": "NBA",
      "eventId": "evt_98765",
      "eventName": "Lakers vs Celtics",
      "market": "spread",
      "selection": "Lakers -4.5",
      "odds": -110,
      "stake": 100000,
      "potentialPayout": 190909,
      "status": "pending",
      "placedAt": "2025-01-15T10:25:00Z",
      "riskScore": 0.72,
      "ipAddress": "192.168.1.100"
    }
  ],
  "total": 1247,
  "newSinceLastPoll": 23,
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `BAD_GATEWAY`, `GATEWAY_TIMEOUT`, `RATE_LIMITED`

---

### C.3 GET /api/proxy/agentPerformance

Retrieve agent performance metrics from Buckeye.

**Auth:** `JWT` or `API`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `sessionId` | string | No | Buckeye session ID |
| `agentId` | string | No | Filter by agent login |
| `period` | string | No | `today`, `week`, `month`, `all` |
| `limit` | integer | No | Max results (default: 50) |

**Response 200:**
```json
{
  "performances": [
    {
      "agentId": "agent_001",
      "agentLogin": "agent_login",
      "period": "today",
      "totalPlayers": 45,
      "activePlayers": 32,
      "totalWagers": 156,
      "totalWagered": 4500000,
      "totalPayouts": 3800000,
      "grossProfit": 700000,
      "holdPercentage": 0.156,
      "newPlayers": 3,
      "topPlayerByWager": "player_12345",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

**Error Codes:** `UNAUTHORIZED`, `BAD_GATEWAY`, `GATEWAY_TIMEOUT`

---

### C.4 GET /api/proxy/pending

Retrieve pending wagers awaiting settlement.

**Auth:** `JWT` or `API`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `sessionId` | string | No | Buckeye session ID |
| `agentId` | string | No | Filter by agent |
| `playerId` | string | No | Filter by player |
| `sport` | string | No | Filter by sport |
| `limit` | integer | No | Max results (default: 100, max: 500) |

**Response 200:**
```json
{
  "pendingWagers": [
    {
      "id": "wager_abc123",
      "playerId": "player_12345",
      "eventId": "evt_98765",
      "sport": "NBA",
      "market": "spread",
      "selection": "Lakers -4.5",
      "odds": -110,
      "stake": 100000,
      "potentialPayout": 190909,
      "placedAt": "2025-01-15T10:25:00Z",
      "eventStartAt": "2025-01-15T12:00:00Z",
      "timeToEvent": 5700000
    }
  ],
  "totalPendingExposure": 4500000,
  "count": 47,
  "bySport": {
    "NBA": 15,
    "NFL": 20,
    "MLB": 12
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `BAD_GATEWAY`, `GATEWAY_TIMEOUT`

---

## 9. Category D: Agent Decisions

> **Base:** `/api/agent` | **Count:** 5 endpoints | **Auth:** `JWT` | **Tier:** `ai` (analyze), `standard` (others)

AI-powered risk analysis and feature extraction endpoints. Powered by Kimi AI when `ENABLE_RISK_ENGINE=true` and `KIMI_API_KEY` is configured.

---

### D.1 POST /api/agent/analyze-live

Run AI risk analysis on live player data.

**Auth:** `JWT`

**Request Body:**
```json
{
  "playerId": "player_12345",
  "context": {
    "recentWagers": 12,
    "timeWindow": "24h",
    "stakeVelocity": 250000,
    "winRate": 0.62,
    "unusualMarkets": ["esports", "lower_league"],
    "ipFlags": ["shared_ip", "vpn_usage"]
  },
  "deepAnalysis": true
}
```

**Response 200:**
```json
{
  "playerId": "player_12345",
  "analysisId": "analysis_abc123",
  "timestamp": "2025-01-15T10:30:00Z",
  "riskTier": "RED",
  "riskScore": 0.87,
  "confidence": 0.92,
  "factors": [
    { "factor": "stake_velocity_spike", "weight": 0.35, "description": "Stake velocity 3.5x above baseline" },
    { "factor": "unusual_market_betting", "weight": 0.25, "description": "Betting on obscure markets" },
    { "factor": "ip_risk_flags", "weight": 0.20, "description": "VPN and shared IP detected" },
    { "factor": "win_rate_anomaly", "weight": 0.20, "description": "62% win rate over 100+ wagers" }
  ],
  "recommendations": [
    "Reduce max wager to 5000c",
    "Flag for manual review",
    "Monitor IP activity"
  ],
  "aiSummary": "Player exhibits sharp betting patterns with elevated risk indicators. Recommend tier reduction and enhanced monitoring.",
  "processingTimeMs": 1245
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`, `INTERNAL_ERROR` (AI unavailable)

---

### D.2 POST /api/agent/extract-features

Extract customer features for archetype classification.

**Auth:** `JWT`

**Request Body:**
```json
{
  "playerId": "player_12345",
  "wagerHistory": [
    { "stake": 50000, "odds": -110, "result": "win", "sport": "NBA", "market": "spread" }
  ],
  "accountAgeDays": 120,
  "depositCount": 8,
  "totalDeposited": 2000000,
  "sessionCount": 45
}
```

**Response 200:**
```json
{
  "playerId": "player_12345",
  "features": {
    "avgStake": 72500,
    "stakeVariance": 15000,
    "winRate": 0.62,
    "sportDiversity": 3,
    "marketDiversity": 5,
    "bettingFrequency": 2.5,
    "avgOdds": -108,
    "consistencyScore": 0.78,
    "profitFactor": 1.45,
    "sessionLengthAvg": 45
  },
  "archetype": "sharp",
  "confidence": 0.89,
  "nextReviewAt": "2025-01-16T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`, `NOT_FOUND`

---

### D.3 GET /api/agent/rules

List configured agent decision rules.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `active` | boolean | No | Filter by active status |
| `category` | string | No | Filter by rule category |

**Response 200:**
```json
{
  "rules": [
    {
      "id": "rule_001",
      "name": "High Win Rate Alert",
      "category": "risk",
      "condition": "winRate > 0.55 AND wagerCount > 50",
      "action": "flag_for_review",
      "severity": "medium",
      "active": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-10T00:00:00Z"
    }
  ],
  "total": 12
}
```

**Error Codes:** `UNAUTHORIZED`

---

### D.4 POST /api/agent/rules

Create a new agent decision rule.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "name": "VIP Whale Detection",
  "category": "archetype",
  "condition": "balance > 10000000 AND avgStake > 500000",
  "action": "tag_whale",
  "severity": "low",
  "active": true
}
```

**Response 201:**
```json
{
  "id": "rule_002",
  "name": "VIP Whale Detection",
  "category": "archetype",
  "condition": "balance > 10000000 AND avgStake > 500000",
  "action": "tag_whale",
  "severity": "low",
  "active": true,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`

---

### D.5 DELETE /api/agent/rules/:id

Delete an agent decision rule.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Rule ID |

**Response 204:** No content

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`



---

## 10. Category E: IP Intelligence

> **Base:** `/api/agent` | **Count:** 8 endpoints | **Auth:** `JWT` (read), `JWT` + `Admin` (mutations) | **Tier:** `standard` (read), `admin` (mutations)

IP surveillance, tracking, denylist management, and flagging for multi-account detection.

Tables: `ip_tracking`, `ip_denylist`, `ip_flags`, `ip_reputation_log`

---

### E.1 GET /api/agent/ip-tracking

List tracked IP addresses with activity summary.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `ip` | string | No | Filter by specific IP |
| `playerId` | string | No | Filter by associated player |
| `flagged` | boolean | No | Only flagged IPs |
| `limit` | integer | No | Max results (default: 50) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "ips": [
    {
      "id": "ip_001",
      "ipAddress": "192.168.1.100",
      "playerIds": ["player_12345", "player_67890"],
      "playerCount": 2,
      "firstSeenAt": "2025-01-01T08:00:00Z",
      "lastSeenAt": "2025-01-15T10:30:00Z",
      "wagerCount": 145,
      "totalWagered": 8900000,
      "geoLocation": { "country": "US", "city": "New York", "lat": 40.71, "lon": -74.01 },
      "isVpn": false,
      "isShared": true,
      "riskScore": 0.65,
      "flagged": true,
      "flagReason": "Multi-account from same IP",
      "createdAt": "2025-01-01T08:00:00Z"
    }
  ],
  "total": 2341,
  "flagged": 12
}
```

**Error Codes:** `UNAUTHORIZED`

---

### E.2 GET /api/agent/ip-tracking/:ip

Get detailed information for a single IP address.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `ip` | string | IP address (dotted notation) |

**Response 200:**
```json
{
  "ipAddress": "192.168.1.100",
  "playerIds": ["player_12345", "player_67890"],
  "players": [
    {
      "playerId": "player_12345",
      "login": "player1",
      "firstSeen": "2025-01-01T08:00:00Z",
      "lastSeen": "2025-01-15T10:30:00Z",
      "wagerCount": 89,
      "totalWagered": 5600000
    },
    {
      "playerId": "player_67890",
      "login": "player2",
      "firstSeen": "2025-01-05T14:00:00Z",
      "lastSeen": "2025-01-15T09:00:00Z",
      "wagerCount": 56,
      "totalWagered": 3300000
    }
  ],
  "sessionHistory": [
    { "timestamp": "2025-01-15T10:30:00Z", "playerId": "player_12345", "action": "wager_placed" }
  ],
  "geoLocation": { "country": "US", "city": "New York", "isp": "Comcast" },
  "isVpn": false,
  "isShared": true,
  "riskScore": 0.65,
  "reputationLog": [
    { "timestamp": "2025-01-10T00:00:00Z", "action": "flagged", "reason": "Multi-account detected" }
  ]
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### E.3 POST /api/agent/ip-block

Add an IP address to the denylist.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "ipAddress": "10.0.0.99",
  "reason": "Suspicious activity - coordinated betting",
  "scope": "all",
  "expiresAt": "2025-02-15T00:00:00Z",
  "severity": "high"
}
```

**Response 201:**
```json
{
  "id": "block_001",
  "ipAddress": "10.0.0.99",
  "reason": "Suspicious activity - coordinated betting",
  "scope": "all",
  "status": "active",
  "expiresAt": "2025-02-15T00:00:00Z",
  "severity": "high",
  "createdAt": "2025-01-15T10:30:00Z",
  "createdBy": "admin_user"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `DUPLICATE_PARTNER`

---

### E.4 DELETE /api/agent/ip-block/:ip

Remove an IP from the denylist.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `ip` | string | IP address to unblock |

**Response 204:** No content

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

### E.5 GET /api/agent/ip-denylist

List all denied IP addresses.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `active` | boolean | No | Only active blocks |
| `scope` | string | No | Filter by scope (`all`, `wager`, `login`) |
| `limit` | integer | No | Max results (default: 50) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "deniedIps": [
    {
      "id": "block_001",
      "ipAddress": "10.0.0.99",
      "reason": "Suspicious activity",
      "scope": "all",
      "status": "active",
      "expiresAt": "2025-02-15T00:00:00Z",
      "severity": "high",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 45,
  "active": 42
}
```

**Error Codes:** `UNAUTHORIZED`

---

### E.6 GET /api/agent/ip-flags

List all IP flags (multi-account, VPN, bot detection).

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `type` | string | No | Filter by flag type |
| `resolved` | boolean | No | Only unresolved flags |
| `limit` | integer | No | Max results (default: 50) |

**Response 200:**
```json
{
  "flags": [
    {
      "id": "flag_001",
      "ipAddress": "192.168.1.100",
      "type": "multi_account",
      "severity": "high",
      "description": "3 accounts sharing IP",
      "playerIds": ["player_1", "player_2", "player_3"],
      "status": "open",
      "createdAt": "2025-01-10T08:00:00Z",
      "resolvedAt": null
    }
  ],
  "total": 18,
  "open": 12,
  "resolved": 6
}
```

**Error Codes:** `UNAUTHORIZED`

---

### E.7 PUT /api/agent/ip-flags/:id/resolve

Resolve an IP flag.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Flag ID |

**Request Body:**
```json
{
  "resolution": "confirmed_multi_account",
  "notes": "Verified: 3 accounts are operated by the same individual"
}
```

**Response 200:**
```json
{
  "id": "flag_001",
  "status": "resolved",
  "resolution": "confirmed_multi_account",
  "notes": "Verified: 3 accounts are operated by the same individual",
  "resolvedAt": "2025-01-15T10:30:00Z",
  "resolvedBy": "admin_user"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

### E.8 GET /api/agent/ip-reputation

Get IP reputation score and history.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `ip` | string | Yes | IP address |

**Response 200:**
```json
{
  "ipAddress": "192.168.1.100",
  "currentScore": 0.65,
  "riskLevel": "medium",
  "factors": [
    { "type": "multi_account", "weight": 0.4, "count": 3 },
    { "type": "wager_volume", "weight": 0.3, "count": 145 },
    { "type": "time_pattern", "weight": 0.3, "pattern": "irregular_hours" }
  ],
  "history": [
    { "date": "2025-01-01", "score": 0.2 },
    { "date": "2025-01-07", "score": 0.45 },
    { "date": "2025-01-14", "score": 0.65 }
  ],
  "trend": "rising"
}
```

**Error Codes:** `UNAUTHORIZED`, `BAD_REQUEST` (missing ip param)

---

## 11. Category F: Rules Engine

> **Base:** `/api/agent/rules` | **Count:** 5 endpoints | **Auth:** `JWT` (read), `JWT` + `Admin` (mutations) | **Tier:** `standard` (read), `admin` (mutations)

CRUD + execution for the rules engine. Rules are stored in the `rules` table.

---

### F.1 GET /api/agent/rules

List all rules (paginated, filterable).

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `active` | boolean | No | Filter by active status |
| `category` | string | No | Filter by category (`risk`, `archetype`, `limit`, `alert`) |
| `severity` | string | No | Filter by severity (`low`, `medium`, `high`, `critical`) |
| `limit` | integer | No | Max results (default: 50, max: 200) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "rules": [
    {
      "id": "rule_001",
      "name": "High Win Rate Alert",
      "category": "risk",
      "description": "Flag players with suspicious win rates",
      "condition": "winRate > 0.55 AND wagerCount > 50",
      "action": "flag_for_review",
      "actionParams": { "notify": true, "tier": "YELLOW" },
      "severity": "medium",
      "priority": 5,
      "active": true,
      "matchCount": 23,
      "lastMatchAt": "2025-01-15T08:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-10T00:00:00Z"
    }
  ],
  "total": 45,
  "active": 38
}
```

**Error Codes:** `UNAUTHORIZED`

---

### F.2 GET /api/agent/rules/:id

Get a single rule by ID.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Rule ID |

**Response 200:**
```json
{
  "id": "rule_001",
  "name": "High Win Rate Alert",
  "category": "risk",
  "description": "Flag players with suspicious win rates",
  "condition": "winRate > 0.55 AND wagerCount > 50",
  "conditionAst": { "operator": "AND", "operands": [...] },
  "action": "flag_for_review",
  "actionParams": { "notify": true, "tier": "YELLOW" },
  "severity": "medium",
  "priority": 5,
  "active": true,
  "executionLog": [
    { "timestamp": "2025-01-15T08:00:00Z", "playerId": "player_123", "matched": true, "actionTaken": "flagged" }
  ],
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-10T00:00:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### F.3 POST /api/agent/rules

Create a new rule.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "name": "Steam Bet Detection",
  "category": "risk",
  "description": "Detect rapid bets on line movement",
  "condition": "betVelocity > 5_per_minute AND oddsChange > 20_points",
  "action": "auto_limit",
  "actionParams": { "maxWager": 5000, "duration": "1h" },
  "severity": "high",
  "priority": 3,
  "active": true
}
```

**Response 201:**
```json
{
  "id": "rule_002",
  "name": "Steam Bet Detection",
  "category": "risk",
  "description": "Detect rapid bets on line movement",
  "condition": "betVelocity > 5_per_minute AND oddsChange > 20_points",
  "action": "auto_limit",
  "actionParams": { "maxWager": 5000, "duration": "1h" },
  "severity": "high",
  "priority": 3,
  "active": true,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`

---

### F.4 PUT /api/agent/rules/:id

Update an existing rule.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Rule ID |

**Request Body:**
```json
{
  "name": "Steam Bet Detection (Updated)",
  "condition": "betVelocity > 3_per_minute AND oddsChange > 15_points",
  "actionParams": { "maxWager": 2500, "duration": "2h" },
  "active": true
}
```

**Response 200:**
```json
{
  "id": "rule_002",
  "name": "Steam Bet Detection (Updated)",
  "condition": "betVelocity > 3_per_minute AND oddsChange > 15_points",
  "actionParams": { "maxWager": 2500, "duration": "2h" },
  "active": true,
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`

---

### F.5 POST /api/agent/rules/:id/execute

Execute a rule against a player or all players.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Rule ID |

**Request Body:**
```json
{
  "playerId": "player_12345",
  "dryRun": true
}
```

**Response 200:**
```json
{
  "ruleId": "rule_001",
  "dryRun": true,
  "timestamp": "2025-01-15T10:30:00Z",
  "results": [
    {
      "playerId": "player_12345",
      "matched": true,
      "context": { "winRate": 0.62, "wagerCount": 89 },
      "actionTaken": "flag_for_review",
      "actionResult": { "tierChanged": false, "flagCreated": true }
    }
  ],
  "totalMatched": 1,
  "totalEvaluated": 1
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

## 12. Category G: Player Intelligence

> **Base:** `/api/players` | **Count:** 7 endpoints | **Auth:** `JWT` | **Tier:** `standard` (detail), `intensive` (search, performance)

Player 360-degree view: search, profiles, performance analytics, transactions, flags, notes, and links.

---

### G.1 GET /api/players

List all players (paginated).

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `limit` | integer | No | Max results (default: 25, max: 200) |
| `offset` | integer | No | Pagination offset |
| `status` | string | No | Filter by status |
| `archetype` | string | No | Filter by archetype |
| `riskTier` | string | No | Filter by risk tier |
| `agentId` | string | No | Filter by agent |

**Response 200:**
```json
{
  "players": [
    {
      "id": "player_12345",
      "login": "player_login",
      "displayName": "Player Name",
      "balance": 500000,
      "status": "active",
      "archetype": "sharp",
      "riskTier": "GREEN",
      "agentId": "agent_001",
      "totalWagers": 150,
      "winRate": 0.58,
      "profitLoss": 1250000,
      "lastActiveAt": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 247,
  "limit": 25,
  "offset": 0
}
```

**Error Codes:** `UNAUTHORIZED`

---

### G.2 GET /api/players/:id

Get full player profile (Player 360).

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Player ID |

**Response 200:**
```json
{
  "id": "player_12345",
  "login": "player_login",
  "displayName": "Player Name",
  "email": "player@example.com",
  "phone": "+1-555-0123",
  "balance": 500000,
  "pendingBalance": 100000,
  "status": "active",
  "archetype": "sharp",
  "archetypeConfidence": 0.89,
  "riskTier": "GREEN",
  "riskScore": 0.35,
  "agentId": "agent_001",
  "agentName": "Agent One",
  "createdAt": "2024-06-01T00:00:00Z",
  "lastActiveAt": "2025-01-15T10:00:00Z",
  "statistics": {
    "totalWagers": 150,
    "totalWagered": 7500000,
    "totalWon": 5625000,
    "totalLost": 4375000,
    "profitLoss": 1250000,
    "winRate": 0.58,
    "avgStake": 50000,
    "avgOdds": -108,
    "biggestWin": 500000,
    "biggestLoss": 300000,
    "sportBreakdown": { "NBA": 60, "NFL": 50, "MLB": 40 }
  },
  "flags": [
    {
      "id": "flag_001",
      "type": "win_rate_review",
      "severity": "medium",
      "status": "open",
      "createdAt": "2025-01-10T00:00:00Z"
    }
  ],
  "notes": [
    {
      "id": "note_001",
      "content": "Player requested limit increase. Under review.",
      "author": "admin_user",
      "createdAt": "2025-01-08T14:00:00Z"
    }
  ],
  "links": [
    { "type": "telegram", "value": "@player_handle" },
    { "type": "referrer", "value": "player_99999" }
  ],
  "ipHistory": ["192.168.1.100", "192.168.1.101"]
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### G.3 GET /api/players/:id/transactions

Get player transaction history.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Player ID |

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `type` | string | No | Filter: `deposit`, `withdrawal`, `wager`, `settlement` |
| `limit` | integer | No | Max results (default: 50) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "transactions": [
    {
      "id": "tx_001",
      "type": "wager",
      "amount": -100000,
      "currency": "USD",
      "balanceAfter": 400000,
      "description": "NBA: Lakers vs Celtics - spread",
      "status": "completed",
      "createdAt": "2025-01-15T10:25:00Z"
    }
  ],
  "total": 350,
  "deposits": 2000000,
  "withdrawals": 500000,
  "netProfit": 1250000
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### G.4 GET /api/players/:id/performance

Get detailed performance analytics for a player.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Player ID |

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `period` | string | No | `7d`, `30d`, `90d`, `1y`, `all` (default: `30d`) |

**Response 200:**
```json
{
  "playerId": "player_12345",
  "period": "30d",
  "summary": {
    "wagers": 45,
    "wagered": 2250000,
    "won": 1350000,
    "lost": 900000,
    "profitLoss": 450000,
    "winRate": 0.60,
    "roi": 0.20
  },
  "daily": [
    { "date": "2025-01-15", "wagers": 3, "wagered": 150000, "pnl": 75000, "winRate": 0.67 }
  ],
  "bySport": [
    { "sport": "NBA", "wagers": 20, "wagered": 1000000, "pnl": 300000, "winRate": 0.58 },
    { "sport": "NFL", "wagers": 15, "wagered": 750000, "pnl": 150000, "winRate": 0.62 },
    { "sport": "MLB", "wagers": 10, "wagered": 500000, "pnl": 0, "winRate": 0.50 }
  ],
  "byMarket": [
    { "market": "spread", "wagers": 25, "wagered": 1250000, "pnl": 200000, "winRate": 0.56 },
    { "market": "ml", "wagers": 12, "wagered": 600000, "pnl": 150000, "winRate": 0.65 },
    { "market": "total", "wagers": 8, "wagered": 400000, "pnl": 100000, "winRate": 0.60 }
  ],
  "stakeDistribution": {
    "min": 10000,
    "max": 200000,
    "median": 50000,
    "avg": 50000
  },
  "trends": {
    "winRateTrend": "stable",
    "stakeTrend": "increasing",
    "activityTrend": "consistent"
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### G.5 POST /api/players/:id/notes

Add a note to a player's profile.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Player ID |

**Request Body:**
```json
{
  "content": "Player called support about withdrawal delay.",
  "isPrivate": false
}
```

**Response 201:**
```json
{
  "id": "note_002",
  "playerId": "player_12345",
  "content": "Player called support about withdrawal delay.",
  "author": "admin_user",
  "isPrivate": false,
  "createdAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`

---

### G.6 GET /api/players/:id/flags

Get all flags for a player.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Player ID |

**Response 200:**
```json
{
  "playerId": "player_12345",
  "flags": [
    {
      "id": "flag_001",
      "type": "win_rate_review",
      "severity": "medium",
      "description": "Win rate 62% over 100+ wagers",
      "source": "auto_rule",
      "ruleId": "rule_001",
      "status": "open",
      "createdAt": "2025-01-10T00:00:00Z",
      "resolvedAt": null,
      "resolvedBy": null
    }
  ],
  "openCount": 1,
  "totalCount": 3
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### G.7 GET /api/players/search

Advanced player search with filters.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | No | Free-text search (login, name, email) |
| `archetype` | string | No | Filter by archetype |
| `riskTier` | string | No | Filter by risk tier (`BLACK`, `RED`, `YELLOW`, `GREEN`) |
| `minWinRate` | float | No | Minimum win rate (0.0-1.0) |
| `maxWinRate` | float | No | Maximum win rate (0.0-1.0) |
| `minBalance` | integer | No | Minimum balance (cents) |
| `maxBalance` | integer | No | Maximum balance (cents) |
| `agentId` | string | No | Filter by agent |
| `status` | string | No | Filter by status |
| `flagged` | boolean | No | Only flagged players |
| `limit` | integer | No | Max results (default: 25, max: 200) |
| `offset` | integer | No | Pagination offset |
| `sort` | string | No | Sort field (default: `lastActiveAt`) |
| `order` | string | No | Sort order: `asc`, `desc` |

**Response 200:**
```json
{
  "players": [
    {
      "id": "player_12345",
      "login": "player_login",
      "displayName": "Player Name",
      "balance": 500000,
      "archetype": "sharp",
      "riskTier": "GREEN",
      "winRate": 0.58,
      "totalWagers": 150,
      "agentId": "agent_001",
      "lastActiveAt": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 12,
  "limit": 25,
  "offset": 0,
  "filters": {
    "riskTier": "GREEN",
    "minWinRate": 0.55
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`



---

## 13. Category H: Sandbox v1

> **Base:** `/api/sandbox/v1` | **Count:** 6 endpoints | **Auth:** `JWT` | **Tier:** `standard`

Legacy sandbox system for scenario simulation and customer behavior modeling.

Tables: `sandbox_scenarios_v2`, `sandbox_customers`, `sandbox_snapshots`

---

### H.1 GET /api/sandbox/v1/scenarios

List sandbox scenarios.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `active` | boolean | No | Only active scenarios |
| `limit` | integer | No | Max results (default: 25) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "scenarios": [
    {
      "id": "scenario_001",
      "name": "Sharp Player Simulation",
      "description": "Simulate a sharp player's betting patterns",
      "status": "active",
      "playerCount": 25,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-10T00:00:00Z"
    }
  ],
  "total": 8
}
```

**Error Codes:** `UNAUTHORIZED`

---

### H.2 GET /api/sandbox/v1/scenarios/:id

Get a single scenario with full configuration.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Scenario ID |

**Response 200:**
```json
{
  "id": "scenario_001",
  "name": "Sharp Player Simulation",
  "description": "Simulate a sharp player's betting patterns",
  "status": "active",
  "configuration": {
    "archetype": "sharp",
    "winRate": 0.60,
    "avgStake": 100000,
    "stakeVariance": 20000,
    "bettingFrequency": 5,
    "sportPreferences": ["NBA", "NFL"],
    "marketPreferences": ["spread", "ml"]
  },
  "players": ["sandbox_player_1", "sandbox_player_2"],
  "results": {
    "totalWagers": 500,
    "totalWagered": 50000000,
    "totalPnl": 5000000,
    "avgRoi": 0.10
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-10T00:00:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### H.3 POST /api/sandbox/v1/scenarios

Create a new sandbox scenario.

**Auth:** `JWT`

**Request Body:**
```json
{
  "name": "Chase Gambler Pattern",
  "description": "Simulate escalating bets after losses",
  "configuration": {
    "archetype": "chase_gambler",
    "winRate": 0.30,
    "avgStake": 50000,
    "stakeVariance": 30000,
    "bettingFrequency": 10,
    "chaseMultiplier": 2.0,
    "sportPreferences": ["NBA", "NFL", "MLB"],
    "marketPreferences": ["spread", "total"]
  }
}
```

**Response 201:**
```json
{
  "id": "scenario_002",
  "name": "Chase Gambler Pattern",
  "status": "active",
  "configuration": { ... },
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`

---

### H.4 POST /api/sandbox/v1/scenarios/:id/run

Run a scenario simulation.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Scenario ID |

**Request Body:**
```json
{
  "iterations": 1000,
  "duration": "30d",
  "randomSeed": 42
}
```

**Response 202:**
```json
{
  "simulationId": "sim_001",
  "scenarioId": "scenario_001",
  "status": "running",
  "iterations": 1000,
  "startedAt": "2025-01-15T10:30:00Z",
  "estimatedCompletion": "2025-01-15T10:32:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`

---

### H.5 GET /api/sandbox/v1/simulations/:id

Get simulation results.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Simulation ID |

**Response 200:**
```json
{
  "simulationId": "sim_001",
  "scenarioId": "scenario_001",
  "status": "completed",
  "iterations": 1000,
  "results": {
    "totalWagers": 150000,
    "totalWagered": 150000000,
    "totalPnl": 15000000,
    "avgRoi": 0.10,
    "winRate": 0.60,
    "maxDrawdown": 2500000,
    "maxConsecutiveLosses": 8,
    "sharpeRatio": 1.45,
    "distribution": {
      "profit": 0.65,
      "breakEven": 0.05,
      "loss": 0.30
    }
  },
  "startedAt": "2025-01-15T10:30:00Z",
  "completedAt": "2025-01-15T10:32:00Z",
  "durationMs": 120000
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### H.6 DELETE /api/sandbox/v1/scenarios/:id

Delete a sandbox scenario.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Scenario ID |

**Response 204:** No content

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

## 14. Category I: Sandbox v2

> **Base:** `/api/sandbox/v2` | **Count:** 7 endpoints | **Auth:** `JWT` | **Tier:** `standard` (CRUD), `intensive` (generate)

Enhanced sandbox with A/B testing, summary generation, and batch processing.

Tables: `sandbox_scenarios_v2`, `sandbox_ab_tests_v2`, `sandbox_summary_queue_v2`

---

### I.1 GET /api/sandbox/v2/scenarios

List v2 scenarios.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `limit` | integer | No | Max results (default: 25) |
| `offset` | integer | No | Pagination offset |
| `status` | string | No | `draft`, `active`, `archived` |

**Response 200:**
```json
{
  "scenarios": [
    {
      "id": "sv2_001",
      "name": "A/B Test: Limit Strategies",
      "version": 2,
      "status": "active",
      "abTestId": "ab_001",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-10T00:00:00Z"
    }
  ],
  "total": 5
}
```

**Error Codes:** `UNAUTHORIZED`

---

### I.2 POST /api/sandbox/v2/save

Save a v2 scenario.

**Auth:** `JWT`

**Request Body:**
```json
{
  "id": "sv2_002",
  "name": "New Scenario",
  "description": "Testing whale behavior patterns",
  "configuration": {
    "archetype": "whale",
    "parameters": {
      "balance": 10000000,
      "avgStake": 500000,
      "bettingFrequency": 3,
      "sportPreferences": ["NFL", "NBA", "Soccer"]
    }
  },
  "rules": ["rule_001", "rule_003"]
}
```

**Response 201:**
```json
{
  "id": "sv2_002",
  "name": "New Scenario",
  "version": 2,
  "status": "active",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`

---

### I.3 POST /api/sandbox/v2/ab-test

Create an A/B test from two scenarios.

**Auth:** `JWT`

**Request Body:**
```json
{
  "name": "Sharp vs Recreational ROI",
  "scenarioA": "sv2_001",
  "scenarioB": "sv2_002",
  "metric": "roi",
  "sampleSize": 1000,
  "confidenceLevel": 0.95,
  "runDuration": "7d"
}
```

**Response 201:**
```json
{
  "id": "ab_001",
  "name": "Sharp vs Recreational ROI",
  "scenarioA": "sv2_001",
  "scenarioB": "sv2_002",
  "metric": "roi",
  "status": "running",
  "sampleSize": 1000,
  "confidenceLevel": 0.95,
  "results": null,
  "createdAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`, `NOT_FOUND`

---

### I.4 GET /api/sandbox/v2/ab-test/:id

Get A/B test results.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | A/B test ID |

**Response 200:**
```json
{
  "id": "ab_001",
  "name": "Sharp vs Recreational ROI",
  "scenarioA": "sv2_001",
  "scenarioB": "sv2_002",
  "status": "completed",
  "results": {
    "scenarioA": { "mean": 0.12, "stdDev": 0.03, "sampleSize": 1000 },
    "scenarioB": { "mean": 0.08, "stdDev": 0.04, "sampleSize": 1000 },
    "difference": 0.04,
    "pValue": 0.001,
    "significant": true,
    "winner": "A",
    "confidenceInterval": [0.02, 0.06]
  },
  "createdAt": "2025-01-15T10:30:00Z",
  "completedAt": "2025-01-15T17:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### I.5 POST /api/sandbox/v2/generate-summaries

Queue AI-generated summaries for sandbox results.

**Auth:** `JWT`

**Request Body:**
```json
{
  "scenarioIds": ["sv2_001", "sv2_002"],
  "options": {
    "includeCharts": true,
    "detailLevel": "comprehensive",
    "format": "markdown"
  }
}
```

**Response 202:**
```json
{
  "jobId": "job_001",
  "status": "queued",
  "scenarioCount": 2,
  "estimatedCompletion": "2025-01-15T10:35:00Z",
  "queuedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`, `INTERNAL_ERROR` (AI unavailable)

---

### I.6 GET /api/sandbox/v2/summaries/:jobId

Get generated summary status and results.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `jobId` | string | Summary job ID |

**Response 200 (completed):**
```json
{
  "jobId": "job_001",
  "status": "completed",
  "summaries": [
    {
      "scenarioId": "sv2_001",
      "title": "Sharp Player Scenario Analysis",
      "content": "# Sharp Player Scenario\n\nThe simulation of sharp betting patterns...",
      "keyMetrics": {
        "roi": 0.12,
        "winRate": 0.60,
        "maxDrawdown": 0.05
      },
      "generatedAt": "2025-01-15T10:34:00Z"
    }
  ],
  "completedAt": "2025-01-15T10:34:00Z"
}
```

**Response 200 (pending):**
```json
{
  "jobId": "job_001",
  "status": "processing",
  "progress": 0.5,
  "scenariosProcessed": 1,
  "scenariosTotal": 2,
  "startedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### I.7 DELETE /api/sandbox/v2/scenarios/:id

Delete a v2 scenario and associated data.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Scenario ID |

**Response 204:** No content

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

## 15. Category J: Export

> **Base:** `/api/export` | **Count:** 1 endpoint | **Auth:** `JWT` or `API` | **Tier:** `intensive`

CSV export for analytics and reporting.

---

### J.1 GET /api/export/:type

Export data as CSV.

**Auth:** `JWT` or `API`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `type` | string | Export type: `players`, `wagers`, `transactions`, `agent-performance`, `risk-flags` |

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `format` | string | No | `csv` (default), `json`, `xlsx` |
| `from` | date | No | Start date filter |
| `to` | date | No | End date filter |
| `agentId` | string | No | Filter by agent |
| `playerId` | string | No | Filter by player |
| `columns` | string | No | Comma-separated column list |

**Response 200:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="players_2025-01-15.csv"

id,login,displayName,balance,status,archetype,riskTier,totalWagers,winRate
player_12345,player_login,Player Name,500000,active,sharp,GREEN,150,0.58
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND` (invalid type), `VALIDATION_ERROR`

---

## 16. Category K: Kimi AI

> **Base:** `/api/kimi` | **Count:** 1 endpoint | **Auth:** `JWT` + `Admin` | **Tier:** `ai`

AI-powered chat completions for risk analysis via Kimi AI (Moonshot AI).

Requires: `KIMI_API_KEY` environment variable, `ENABLE_ANALYTICS=true`

---

### K.1 POST /api/kimi/chat

Send a chat completion request to Kimi AI.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a sports betting risk analyst. Analyze the following player data and provide risk assessment."
    },
    {
      "role": "user",
      "content": "Player ID: player_12345\nWin Rate: 62%\nAvg Stake: $500\nTotal Wagers: 150\nRecent Activity: Betting on obscure markets"
    }
  ],
  "model": "kimi-latest",
  "temperature": 0.3,
  "maxTokens": 2000,
  "stream": false
}
```

**Response 200:**
```json
{
  "id": "chatcmpl_abc123",
  "model": "kimi-latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "## Risk Assessment: player_12345\n\n**Overall Risk: HIGH**\n\n### Key Indicators:\n1. **Win Rate Anomaly**: 62% over 150 wagers is significantly above expected 50%\n2. **Market Selection**: Betting on obscure markets suggests information advantage\n3. **Stake Consistency**: $500 average indicates disciplined approach\n\n### Recommendation:\n- Reduce max wager to $250\n- Flag for manual review\n- Monitor line movement correlation"
      },
      "finishReason": "stop"
    }
  ],
  "usage": {
    "promptTokens": 120,
    "completionTokens": 95,
    "totalTokens": 215
  },
  "processingTimeMs": 1245
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_ERROR`, `RATE_LIMITED` (Kimi AI rate limit)



---

## 17. Category L: Risk Command Center

> **Base:** `/api` | **Count:** 19 endpoints | **Auth:** `JWT` | **Tier:** `intensive` (reads), `admin` (mutations)

Comprehensive risk management: positions, dashboard metrics, live wager streaming, exposure tracking, and alert management.

Tables: `risk_positions`, `ai_risk_flags`, `alert_log`, `wager_violations`, `customer_features`

---

### L.1 POST /api/positions/generate

Generate risk positions for current exposure.

**Auth:** `JWT`

**Request Body:**
```json
{
  "sport": "NBA",
  "eventId": "evt_98765",
  "market": "spread",
  "generateSummary": true,
  "includePlayerBreakdown": true
}
```

**Response 200:**
```json
{
  "positionId": "pos_001",
  "sport": "NBA",
  "eventId": "evt_98765",
  "eventName": "Lakers vs Celtics",
  "market": "spread",
  "generatedAt": "2025-01-15T10:30:00Z",
  "exposure": {
    "totalWagered": 2500000,
    "totalLiability": 4750000,
    "netExposure": -2250000,
    "sideBreakdown": {
      "Lakers -4.5": { "wagered": 1500000, "count": 23, "avgOdds": -110 },
      "Celtics +4.5": { "wagered": 1000000, "count": 15, "avgOdds": -110 }
    }
  },
  "riskIndicators": [
    { "type": "lopsided_exposure", "severity": "high", "description": "60% of wagers on Lakers -4.5" },
    { "type": "large_wager", "severity": "medium", "description": "Individual wager of $500 exceeds threshold" }
  ],
  "playerBreakdown": [
    { "playerId": "player_123", "wagered": 500000, "side": "Lakers -4.5", "riskTier": "RED" }
  ],
  "recommendations": [
    "Consider line adjustment to Lakers -5.5",
    "Monitor sharp player activity"
  ]
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`

---

### L.2 GET /api/positions

List all risk positions.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `sport` | string | No | Filter by sport |
| `status` | string | No | `open`, `closed`, `expired` |
| `riskLevel` | string | No | `low`, `medium`, `high`, `critical` |
| `limit` | integer | No | Max results (default: 25) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "positions": [
    {
      "id": "pos_001",
      "sport": "NBA",
      "eventId": "evt_98765",
      "eventName": "Lakers vs Celtics",
      "market": "spread",
      "status": "open",
      "riskLevel": "high",
      "totalWagered": 2500000,
      "totalLiability": 4750000,
      "netExposure": -2250000,
      "generatedAt": "2025-01-15T10:30:00Z",
      "expiresAt": "2025-01-15T15:00:00Z"
    }
  ],
  "total": 47,
  "byRiskLevel": { "low": 20, "medium": 15, "high": 10, "critical": 2 }
}
```

**Error Codes:** `UNAUTHORIZED`

---

### L.3 GET /api/positions/:id

Get a single risk position with full detail.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Position ID |

**Response 200:**
```json
{
  "id": "pos_001",
  "sport": "NBA",
  "eventId": "evt_98765",
  "eventName": "Lakers vs Celtics",
  "market": "spread",
  "status": "open",
  "riskLevel": "high",
  "exposure": { ... },
  "wagers": [
    { "wagerId": "wager_1", "playerId": "player_123", "stake": 100000, "odds": -110, "side": "Lakers -4.5" }
  ],
  "riskIndicators": [...],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "expiresAt": "2025-01-15T15:00:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### L.4 DELETE /api/positions/:id

Expire/clear a risk position.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Position ID |

**Response 204:** No content

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

### L.5 GET /api/dashboard/metrics

Get Risk Command Center dashboard metrics.

**Auth:** `JWT`

**Response 200:**
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "overview": {
    "totalOpenPositions": 47,
    "totalExposure": 45000000,
    "totalLiability": 85000000,
    "activeAlerts": 12,
    "pendingEnforcements": 5,
    "wagersToday": 2341,
    "revenueToday": 1250000
  },
  "riskDistribution": {
    "byTier": { "GREEN": 180, "YELLOW": 45, "RED": 18, "BLACK": 4 },
    "bySport": { "NBA": 85, "NFL": 92, "MLB": 45, "NHL": 25 },
    "byMarket": { "spread": 120, "ml": 80, "total": 47 }
  },
  "exposureByHour": [
    { "hour": "08:00", "exposure": 500000 },
    { "hour": "09:00", "exposure": 1200000 },
    { "hour": "10:00", "exposure": 2500000 }
  ],
  "topAlerts": [
    {
      "id": "alert_001",
      "severity": "critical",
      "type": "exposure_spike",
      "message": "NFL exposure increased 300% in last hour",
      "createdAt": "2025-01-15T09:45:00Z"
    }
  ],
  "recentEnforcements": [
    {
      "id": "enf_001",
      "playerId": "player_123",
      "type": "wager_limit",
      "appliedAt": "2025-01-15T09:30:00Z",
      "status": "active"
    }
  ]
}
```

**Error Codes:** `UNAUTHORIZED`, `INTERNAL_ERROR`

---

### L.6 GET /api/dashboard/alerts

List active risk alerts.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `severity` | string | No | `critical`, `high`, `medium`, `low` |
| `type` | string | No | Filter by alert type |
| `status` | string | No | `open`, `acknowledged`, `resolved` |
| `limit` | integer | No | Max results (default: 25) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "alerts": [
    {
      "id": "alert_001",
      "severity": "critical",
      "type": "exposure_spike",
      "title": "NFL Exposure Spike",
      "message": "NFL exposure increased 300% in last hour",
      "context": { "sport": "NFL", "previousExposure": 500000, "currentExposure": 2000000 },
      "status": "open",
      "acknowledgedBy": null,
      "createdAt": "2025-01-15T09:45:00Z",
      "acknowledgedAt": null,
      "resolvedAt": null
    }
  ],
  "total": 12,
  "bySeverity": { "critical": 2, "high": 4, "medium": 4, "low": 2 }
}
```

**Error Codes:** `UNAUTHORIZED`

---

### L.7 PUT /api/dashboard/alerts/:id/acknowledge

Acknowledge an alert.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Alert ID |

**Response 200:**
```json
{
  "id": "alert_001",
  "status": "acknowledged",
  "acknowledgedBy": "admin_user",
  "acknowledgedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### L.8 PUT /api/dashboard/alerts/:id/resolve

Resolve an alert.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Alert ID |

**Request Body:**
```json
{
  "resolution": "Adjusted NFL limits, exposure normalized",
  "actionsTaken": ["Reduced max NFL wager to 2500c", "Notified agent supervisor"]
}
```

**Response 200:**
```json
{
  "id": "alert_001",
  "status": "resolved",
  "resolution": "Adjusted NFL limits, exposure normalized",
  "resolvedBy": "admin_user",
  "resolvedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### L.9 GET /api/dashboard/exposure

Get real-time exposure breakdown.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `sport` | string | No | Filter by sport |
| `eventId` | string | No | Filter by event |
| `market` | string | No | Filter by market |

**Response 200:**
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "totalExposure": 45000000,
  "totalLiability": 85000000,
  "bySport": [
    { "sport": "NBA", "exposure": 15000000, "liability": 28000000, "wagerCount": 450 },
    { "sport": "NFL", "exposure": 20000000, "liability": 38000000, "wagerCount": 520 },
    { "sport": "MLB", "exposure": 10000000, "liability": 19000000, "wagerCount": 210 }
  ],
  "byMarket": [
    { "market": "spread", "exposure": 25000000, "liability": 47500000 },
    { "market": "ml", "exposure": 15000000, "liability": 28500000 },
    { "market": "total", "exposure": 5000000, "liability": 9000000 }
  ],
  "largestPositions": [
    { "eventId": "evt_98765", "eventName": "Lakers vs Celtics", "exposure": 2500000, "riskLevel": "high" }
  ],
  "trend": "increasing",
  "trendPercent": 12.5
}
```

**Error Codes:** `UNAUTHORIZED`

---

### L.10 GET /api/dashboard/velocity

Get betting velocity metrics.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `period` | string | No | `1h`, `6h`, `24h`, `7d` (default: `24h`) |
| "sport" | string | No | Filter by sport |

**Response 200:**
```json
{
  "period": "24h",
  "timestamp": "2025-01-15T10:30:00Z",
  "metrics": {
    "wagersPerHour": 97.5,
    "avgStake": 65000,
    "peakWagersPerHour": 156,
    "peakHour": "20:00",
    "uniquePlayers": 89,
    "newPlayers": 5,
    "returningPlayers": 84
  },
  "hourlyBreakdown": [
    { "hour": "09:00", "wagers": 45, "stake": 2900000 },
    { "hour": "10:00", "wagers": 67, "stake": 4355000 }
  ],
  "velocityAlerts": [
    { "hour": "20:00", "wagers": 156, "threshold": 100, "severity": "high" }
  ],
  "trend": { "direction": "increasing", "percent": 8.3 }
}
```

**Error Codes:** `UNAUTHORIZED`

---

### L.11 GET /api/risk-flags

List all risk flags across players.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "playerId" | string | No | Filter by player |
| "severity" | string | No | `critical`, `high`, `medium`, `low` |
| "status" | string | No | `open`, `acknowledged`, `resolved` |
| "type" | string | No | Filter by flag type |
| "limit" | integer | No | Max results (default: 50) |
| "offset" | integer | No | Pagination offset |

**Response 200:**
```json
{
  "flags": [
    {
      "id": "flag_001",
      "playerId": "player_12345",
      "playerLogin": "player_login",
      "type": "win_rate_anomaly",
      "severity": "high",
      "description": "Win rate 62% over 150 wagers exceeds threshold",
      "context": { "winRate": 0.62, "wagerCount": 150, "threshold": 0.55 },
      "status": "open",
      "createdAt": "2025-01-10T00:00:00Z",
      "resolvedAt": null
    }
  ],
  "total": 67,
  "bySeverity": { "critical": 3, "high": 18, "medium": 28, "low": 18 },
  "byType": { "win_rate_anomaly": 15, "stake_spike": 12, "ip_flag": 8, "pattern_match": 32 }
}
```

**Error Codes:** `UNAUTHORIZED`

---

### L.12 POST /api/risk-flags

Create a manual risk flag.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "playerId": "player_12345",
  "type": "manual_review",
  "severity": "medium",
  "description": "Player requested unusual withdrawal pattern",
  "context": { "withdrawalAmount": 1000000, "frequency": "daily" }
}
```

**Response 201:**
```json
{
  "id": "flag_002",
  "playerId": "player_12345",
  "type": "manual_review",
  "severity": "medium",
  "status": "open",
  "createdAt": "2025-01-15T10:30:00Z",
  "createdBy": "admin_user"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`

---

### L.13 PUT /api/risk-flags/:id/resolve

Resolve a risk flag.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Flag ID |

**Request Body:**
```json
{
  "resolution": "Withdrawal pattern verified as legitimate",
  "tierChange": null
}
```

**Response 200:**
```json
{
  "id": "flag_002",
  "status": "resolved",
  "resolution": "Withdrawal pattern verified as legitimate",
  "resolvedBy": "admin_user",
  "resolvedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

### L.14 GET /api/wager-violations

List wager violations.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "playerId" | string | No | Filter by player |
| "wagerId" | string | No | Filter by wager |
| "type" | string | No | Filter by violation type |
| "limit" | integer | No | Max results (default: 50) |
| "offset" | integer | No | Pagination offset |

**Response 200:**
```json
{
  "violations": [
    {
      "id": "viol_001",
      "wagerId": "wager_abc123",
      "playerId": "player_12345",
      "playerLogin": "player_login",
      "type": "exceeds_tier_limit",
      "description": "Wager of $1000 exceeds RED tier max of $50",
      "wagerAmount": 100000,
      "limitAmount": 5000,
      "status": "enforced",
      "enforcedAction": "reduced_to_limit",
      "enforcedAmount": 5000,
      "createdAt": "2025-01-15T10:25:00Z",
      "enforcedAt": "2025-01-15T10:25:01Z"
    }
  ],
  "total": 234,
  "byType": { "exceeds_tier_limit": 120, "suspicious_pattern": 45, "ip_violation": 69 }
}
```

**Error Codes:** `UNAUTHORIZED`

---

### L.15 GET /api/customer-features

List customer features extracted by the ML pipeline.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "playerId" | string | No | Filter by player |
| "archetype" | string | No | Filter by archetype |
| "limit" | integer | No | Max results (default: 50) |
| "offset" | integer | No | Pagination offset |

**Response 200:**
```json
{
  "features": [
    {
      "playerId": "player_12345",
      "archetype": "sharp",
      "confidence": 0.89,
      "features": {
        "avgStake": 72500,
        "winRate": 0.62,
        "sportDiversity": 3,
        "consistencyScore": 0.78,
        "profitFactor": 1.45
      },
      "extractedAt": "2025-01-15T10:00:00Z",
      "nextReviewAt": "2025-01-16T10:00:00Z"
    }
  ],
  "total": 247,
  "byArchetype": { "sharp": 23, "whale": 5, "chase_gambler": 45, "new": 89, "recreational": 72, "suspicious": 13 }
}
```

**Error Codes:** `UNAUTHORIZED`

---

### L.16 POST /api/customer-features/extract

Trigger manual feature extraction for a player.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "playerId": "player_12345",
  "forceReclassify": true
}
```

**Response 200:**
```json
{
  "playerId": "player_12345",
  "archetype": "sharp",
  "confidence": 0.91,
  "features": { ... },
  "extractedAt": "2025-01-15T10:30:00Z",
  "processingTimeMs": 450
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

### L.17 GET /api/stream/live-wagers

**SSE Endpoint.** Stream live wager events in real-time.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "sport" | string | No | Filter by sport |
| "minStake" | integer | No | Minimum stake to include (cents) |
| "playerId" | string | No | Filter by player |

**SSE Event Format:**
```
event: wager
data: {"id":"wager_123","playerId":"p_1","sport":"NBA","stake":100000,"odds":-110,"timestamp":"2025-01-15T10:30:00Z"}

event: violation
data: {"type":"exceeds_limit","wagerId":"wager_124","playerId":"p_2","limit":5000,"attempted":100000}
```

**Error Codes:** `UNAUTHORIZED`

---

### L.18 GET /api/stream/alerts

**SSE Endpoint.** Stream risk alerts in real-time.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "severity" | string | No | Minimum severity level |
| "types" | string | No | Comma-separated alert types |

**SSE Event Format:**
```
event: alert
data: {"id":"alert_001","severity":"critical","type":"exposure_spike","message":"NFL exposure up 300%","timestamp":"2025-01-15T10:30:00Z"}

event: flag
data: {"id":"flag_001","playerId":"p_1","type":"win_rate_anomaly","severity":"high","timestamp":"2025-01-15T10:30:00Z"}
```

**Error Codes:** `UNAUTHORIZED`

---

### L.19 GET /api/stream/positions

**SSE Endpoint.** Stream position updates in real-time.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "sport" | string | No | Filter by sport |

**SSE Event Format:**
```
event: position-update
data: {"positionId":"pos_001","eventId":"evt_98765","netExposure":-2250000,"wagerCount":38,"updatedAt":"2025-01-15T10:30:00Z"}

event: position-new
data: {"positionId":"pos_002","eventId":"evt_99999","eventName":"Warriors vs Nets","initialExposure":500000}
```

**Error Codes:** `UNAUTHORIZED`



---

## 18. Category M: Enforcement

> **Base:** `/api/enforcement` | **Count:** 8 endpoints | **Auth:** `JWT` (read), `JWT` + `Admin` (mutations) | **Tier:** `admin` (mutations), `standard` (reads)

Automated and manual enforcement actions: wager limits, auto-enforcement, and limit adjustment.

Tables: `limit_enforcement_log`, `enforcement_queue`

---

### M.1 POST /api/enforcement/apply-limit

Apply a wager limit to a player.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "playerId": "player_12345",
  "limitType": "max_wager",
  "limitValue": 5000,
  "reason": "Win rate anomaly - temporary reduction",
  "duration": "7d",
  "notifyPlayer": false
}
```

**Response 201:**
```json
{
  "id": "enf_001",
  "playerId": "player_12345",
  "limitType": "max_wager",
  "limitValue": 5000,
  "previousValue": 500000,
  "status": "active",
  "reason": "Win rate anomaly - temporary reduction",
  "appliedBy": "admin_user",
  "appliedAt": "2025-01-15T10:30:00Z",
  "expiresAt": "2025-01-22T10:30:00Z",
  "isAutoEnforced": false
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`

---

### M.2 POST /api/enforcement/apply-limit/batch

Apply limits to multiple players.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "playerIds": ["player_12345", "player_67890", "player_11111"],
  "limitType": "max_wager",
  "limitValue": 5000,
  "reason": "Batch enforcement: suspicious activity group",
  "duration": "7d"
}
```

**Response 200:**
```json
{
  "results": [
    { "playerId": "player_12345", "status": "applied", "enforcementId": "enf_001" },
    { "playerId": "player_67890", "status": "applied", "enforcementId": "enf_002" },
    { "playerId": "player_11111", "status": "failed", "reason": "Player not found" }
  ],
  "applied": 2,
  "failed": 1,
  "appliedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`

---

### M.3 DELETE /api/enforcement/apply-limit/:id

Remove an enforcement limit.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Enforcement ID |

**Response 200:**
```json
{
  "id": "enf_001",
  "status": "removed",
  "removedBy": "admin_user",
  "removedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

### M.4 POST /api/enforcement/auto-enforce

Configure auto-enforcement rules.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "name": "Win Rate Auto-Limit",
  "trigger": {
    "condition": "winRate > 0.60 AND wagerCount > 100",
    "evaluationWindow": "30d"
  },
  "action": {
    "type": "reduce_wager_limit",
    "params": { "newLimit": 2500, "duration": "14d" }
  },
  "cooldown": "30d",
  "active": true
}
```

**Response 201:**
```json
{
  "id": "auto_001",
  "name": "Win Rate Auto-Limit",
  "trigger": { ... },
  "action": { ... },
  "status": "active",
  "createdAt": "2025-01-15T10:30:00Z",
  "createdBy": "admin_user"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`

---

### M.5 GET /api/enforcement/auto-enforce

List auto-enforcement configurations.

**Auth:** `JWT`

**Response 200:**
```json
{
  "rules": [
    {
      "id": "auto_001",
      "name": "Win Rate Auto-Limit",
      "trigger": "winRate > 0.60 AND wagerCount > 100",
      "action": "reduce_wager_limit to 2500c",
      "status": "active",
      "triggerCount": 5,
      "lastTriggeredAt": "2025-01-14T08:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 4
}
```

**Error Codes:** `UNAUTHORIZED`

---

### M.6 GET /api/enforcement/log

Get enforcement action log.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "playerId" | string | No | Filter by player |
| "enforcementId" | string | No | Filter by enforcement |
| "limit" | integer | No | Max results (default: 50) |
| "offset" | integer | No | Pagination offset |

**Response 200:**
```json
{
  "entries": [
    {
      "id": "log_001",
      "enforcementId": "enf_001",
      "playerId": "player_12345",
      "action": "limit_applied",
      "details": { "limitType": "max_wager", "oldValue": 500000, "newValue": 5000 },
      "performedBy": "admin_user",
      "performedAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1567
}
```

**Error Codes:** `UNAUTHORIZED`

---

### M.7 GET /api/enforcement/queue

Get pending enforcement queue.

**Auth:** `JWT`

**Response 200:**
```json
{
  "queue": [
    {
      "id": "q_001",
      "playerId": "player_12345",
      "action": "apply_limit",
      "params": { "limitType": "max_wager", "limitValue": 5000 },
      "reason": "Rule trigger: High Win Rate Alert",
      "status": "pending",
      "scheduledAt": "2025-01-15T10:30:00Z",
      "ruleId": "rule_001"
    }
  ],
  "total": 5,
  "byStatus": { "pending": 3, "processing": 1, "failed": 1 }
}
```

**Error Codes:** `UNAUTHORIZED`

---

### M.8 POST /api/enforcement/queue/:id/process

Manually process a queued enforcement.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Queue entry ID |

**Response 200:**
```json
{
  "id": "q_001",
  "status": "completed",
  "result": { "enforcementId": "enf_003", "limitApplied": true },
  "processedAt": "2025-01-15T10:30:00Z",
  "processedBy": "admin_user"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

## 19. Category N: Player Search

> **Base:** `/api/players/search` | **Count:** 3 endpoints | **Auth:** `JWT` | **Tier:** `intensive`

Advanced player search and discovery endpoints.

---

### N.1 GET /api/players/search

Full-text search across player attributes.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Search query (login, name, email, phone) |
| `limit` | integer | No | Max results (default: 25, max: 100) |
| "offset" | integer | No | Pagination offset |

**Response 200:**
```json
{
  "query": "john",
  "players": [
    {
      "id": "player_12345",
      "login": "john_doe",
      "displayName": "John Doe",
      "email": "john@example.com",
      "balance": 500000,
      "status": "active",
      "riskTier": "GREEN",
      "matchScore": 0.95
    },
    {
      "id": "player_67890",
      "login": "johnny_bet",
      "displayName": "Johnny Bets",
      "email": "johnny@example.com",
      "balance": 250000,
      "status": "active",
      "riskTier": "YELLOW",
      "matchScore": 0.82
    }
  ],
  "total": 2,
  "limit": 25,
  "offset": 0
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR` (missing q param)

---

### N.2 GET /api/players/search/advanced

Advanced multi-criteria player search.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "login" | string | No | Login exact/partial match |
| "displayName" | string | No | Display name match |
| "email" | string | No | Email match |
| "archetype" | string | No | `sharp`, `whale`, `chase_gambler`, `new`, `recreational`, `suspicious` |
| "riskTier" | string | No | `BLACK`, `RED`, `YELLOW`, `GREEN` |
| "minBalance" | integer | No | Minimum balance (cents) |
| "maxBalance" | integer | No | Maximum balance (cents) |
| "minWinRate" | float | No | Minimum win rate (0.0-1.0) |
| "maxWinRate" | float | No | Maximum win rate (0.0-1.0) |
| "minWagers" | integer | No | Minimum wager count |
| "maxWagers" | integer | No | Maximum wager count |
| "agentId" | string | No | Filter by assigned agent |
| "flagged" | boolean | No | Only flagged players |
| "activeSince" | date | No | Active since date |
| "sortBy" | string | No | `balance`, `winRate`, `wagerCount`, `lastActive` |
| "sortOrder" | string | No | `asc`, `desc` |
| "limit" | integer | No | Max results (default: 25, max: 200) |
| "offset" | integer | No | Pagination offset |

**Response 200:**
```json
{
  "filters": {
    "archetype": "sharp",
    "minWinRate": 0.55,
    "riskTier": "GREEN"
  },
  "players": [
    {
      "id": "player_12345",
      "login": "sharp_player",
      "displayName": "Sharp Player",
      "balance": 500000,
      "archetype": "sharp",
      "riskTier": "GREEN",
      "winRate": 0.58,
      "totalWagers": 150,
      "agentId": "agent_001",
      "lastActiveAt": "2025-01-15T10:00:00Z",
      "matchScore": 1.0
    }
  ],
  "total": 12,
  "limit": 25,
  "offset": 0
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`

---

### N.3 GET /api/players/search/by-performance

Search players by performance criteria.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "minProfit" | integer | No | Minimum profit (cents) |
| "maxProfit" | integer | No | Maximum profit (cents) |
| "period" | string | No | `7d`, `30d`, `90d`, `1y` |
| "roi" | float | No | Minimum ROI (0.0-1.0) |
| "consistency" | string | No | `high`, `medium`, `low` |
| "limit" | integer | No | Max results (default: 25) |
| "offset" | integer | No | Pagination offset |

**Response 200:**
```json
{
  "period": "30d",
  "players": [
    {
      "id": "player_12345",
      "login": "profitable_1",
      "displayName": "Profitable One",
      "profit30d": 450000,
      "roi": 0.20,
      "winRate": 0.60,
      "consistency": "high",
      "wagers": 45,
      "riskTier": "GREEN",
      "archetype": "sharp"
    }
  ],
  "total": 8,
  "summary": {
    "avgProfit": 312500,
    "avgRoi": 0.15,
    "avgWinRate": 0.58
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`

---

## 20. Category O: Agent Hub

> **Base:** `/api/proxy`, `/api/agent` | **Count:** 12 endpoints | **Auth:** `JWT` | **Tier:** `standard`

Agent hierarchy, downline management, billing, and performance tracking.

Tables: `agent_hierarchy`, `player_agent_map`, `agent_supergroups`, `agent_supergroup_topics`

---

### O.1 GET /api/proxy/agentDownline

Get agent downline (subordinate agents).

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "agentId" | string | No | Agent login (defaults to current user) |
| "depth" | integer | No | Hierarchy depth (default: 1, max: 5) |

**Response 200:**
```json
{
  "agentId": "agent_001",
  "agentLogin": "supervisor",
  "displayName": "Supervisor Agent",
  "level": 1,
  "downline": [
    {
      "agentId": "agent_002",
      "agentLogin": "sub_agent_1",
      "displayName": "Sub Agent One",
      "level": 2,
      "playerCount": 25,
      "totalWagers": 450,
      "downline": [
        {
          "agentId": "agent_003",
          "agentLogin": "sub_sub_1",
          "displayName": "Sub Sub One",
          "level": 3,
          "playerCount": 10,
          "totalWagers": 120,
          "downline": []
        }
      ]
    }
  ],
  "totalDownlineAgents": 5,
  "totalDownlinePlayers": 67
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### O.2 GET /api/agent/hierarchy

Get full agent hierarchy tree.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "rootAgentId" | string | No | Root of tree (omit for full org) |
| "depth" | integer | No | Max depth (default: 10) |

**Response 200:**
```json
{
  "root": {
    "agentId": "agent_root",
    "agentLogin": "master_agent",
    "displayName": "Master Agent",
    "level": 0,
    "children": [
      {
        "agentId": "agent_001",
        "agentLogin": "supervisor",
        "displayName": "Supervisor",
        "level": 1,
        "children": [
          { "agentId": "agent_002", "agentLogin": "sub_1", "displayName": "Sub 1", "level": 2, "children": [] },
          { "agentId": "agent_003", "agentLogin": "sub_2", "displayName": "Sub 2", "level": 2, "children": [] }
        ]
      }
    ]
  },
  "totalAgents": 8,
  "maxDepth": 3
}
```

**Error Codes:** `UNAUTHORIZED`

---

### O.3 GET /api/agent/billing

Get agent billing information.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "agentId" | string | No | Agent login (defaults to current user) |
| "period" | string | No | `current_month`, `last_month`, `quarter`, `custom` |
| "from" | date | No | Custom period start |
| "to" | date | No | Custom period end |

**Response 200:**
```json
{
  "agentId": "agent_001",
  "agentLogin": "supervisor",
  "period": "2025-01",
  "billing": {
    "commissionRate": 0.30,
    "grossRevenue": 2500000,
    "commissionAmount": 750000,
    "makeupApplied": 0,
    "netCommission": 750000,
    "playerCount": 45,
    "wagerCount": 1560,
    "holdPercentage": 0.156
  },
  "breakdown": {
    "byPlayer": [
      { "playerId": "player_1", "playerLogin": "player1", "revenue": 500000, "commission": 150000, "wagers": 89 }
    ],
    "bySport": [
      { "sport": "NBA", "revenue": 1000000, "commission": 300000 },
      { "sport": "NFL", "revenue": 1500000, "commission": 450000 }
    ]
  },
  "payoutStatus": {
    "status": "pending",
    "scheduledDate": "2025-02-01",
    "amount": 750000
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### O.4 GET /api/agent/:id/players

Get players managed by an agent.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Agent ID/login |

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "status" | string | No | Filter by player status |
| "limit" | integer | No | Max results (default: 25) |
| "offset" | integer | No | Pagination offset |

**Response 200:**
```json
{
  "agentId": "agent_001",
  "agentLogin": "supervisor",
  "players": [
    {
      "id": "player_12345",
      "login": "player1",
      "displayName": "Player One",
      "balance": 500000,
      "status": "active",
      "riskTier": "GREEN",
      "totalWagers": 150,
      "lastActiveAt": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 45,
  "limit": 25,
  "offset": 0
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### O.5 GET /api/agent/:id/performance

Get agent performance metrics.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Agent ID/login |

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "period" | string | No | `today`, `week`, `month`, `quarter`, `year` |

**Response 200:**
```json
{
  "agentId": "agent_001",
  "agentLogin": "supervisor",
  "period": "month",
  "metrics": {
    "totalPlayers": 45,
    "newPlayers": 5,
    "churnedPlayers": 2,
    "totalWagers": 1560,
    "totalWagered": 45000000,
    "grossRevenue": 2500000,
    "holdPercentage": 0.056,
    "avgWagerSize": 28846,
    "activePlayerPercentage": 0.78
  },
  "daily": [
    { "date": "2025-01-15", "wagers": 52, "wagered": 1500000, "revenue": 85000, "players": 35 }
  ],
  "topPlayers": [
    { "playerId": "player_1", "login": "top1", "wagered": 5000000, "revenue": 300000 }
  ],
  "comparison": {
    "previousPeriod": { "revenue": 2200000, "wagers": 1400 },
    "change": { "revenue": 0.136, "wagers": 0.114 }
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### O.6 GET /api/agent/sync

Trigger agent data sync from Buckeye.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "agentId" | string | No | Specific agent to sync (omit for all) |
| "fullSync" | boolean | No | Full resync vs. incremental |

**Response 202:**
```json
{
  "syncId": "sync_001",
  "status": "in_progress",
  "agentsQueued": 3,
  "startedAt": "2025-01-15T10:30:00Z",
  "estimatedCompletion": "2025-01-15T10:35:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `BAD_GATEWAY`

---

### O.7 GET /api/agent/supergroups

List agent supergroups.

**Auth:** `JWT`

**Response 200:**
```json
{
  "supergroups": [
    {
      "id": 1,
      "name": "Risk Alerts Group",
      "chatId": "-1001234567890",
      "botId": "risk_bot",
      "isActive": true,
      "topics": [
        { "id": 1, "purpose": "riskAlerts", "threadId": 12345, "name": "Risk Alerts" },
        { "id": 2, "purpose": "deposits", "threadId": 12346, "name": "Deposits" }
      ],
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 5
}
```

**Error Codes:** `UNAUTHORIZED`

---

### O.8 POST /api/agent/supergroups

Create an agent supergroup.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "name": "New Agent Group",
  "chatId": "-1001234567891",
  "botId": "agent_bot",
  "topics": [
    { "purpose": "general", "name": "General" },
    { "purpose": "performance", "name": "Performance Updates" }
  ]
}
```

**Response 201:**
```json
{
  "id": 6,
  "name": "New Agent Group",
  "chatId": "-1001234567891",
  "botId": "agent_bot",
  "isActive": true,
  "topics": [
    { "id": 10, "purpose": "general", "threadId": 12347, "name": "General" },
    { "id": 11, "purpose": "performance", "threadId": 12348, "name": "Performance Updates" }
  ],
  "createdAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`

---

### O.9 GET /api/agent/supergroups/:id/topics

Get topics for a supergroup.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | integer | Supergroup ID |

**Response 200:**
```json
{
  "supergroupId": 1,
  "topics": [
    {
      "id": 1,
      "purpose": "riskAlerts",
      "threadId": 12345,
      "name": "Risk Alerts",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

### O.10 POST /api/agent/supergroups/:id/topics

Create a topic in a supergroup.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | integer | Supergroup ID |

**Request Body:**
```json
{
  "purpose": "hierarchy_changes",
  "name": "Hierarchy Changes",
  "iconColor": "FFB6C1"
}
```

**Response 201:**
```json
{
  "id": 12,
  "purpose": "hierarchy_changes",
  "threadId": 12349,
  "name": "Hierarchy Changes",
  "iconColor": "FFB6C1",
  "isActive": true,
  "createdAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`

---

### O.11 GET /api/agent/topics/resolve

Resolve the correct topic for an event.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "agentLogin" | string | Yes | Agent login |
| "purpose" | string | Yes | Topic purpose |

**Response 200:**
```json
{
  "agentLogin": "supervisor",
  "purpose": "riskAlerts",
  "topicId": 12345,
  "threadId": 12345,
  "topicName": "Risk Alerts",
  "supergroupId": 1,
  "resolvedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND` (no topic resolved)

---

### O.12 GET /api/agent/topics/purposes

List available topic purposes.

**Auth:** `JWT`

**Response 200:**
```json
{
  "purposes": [
    { "purpose": "general", "description": "General agent communications", "defaultIcon": "1F4E2" },
    { "purpose": "riskAlerts", "description": "Risk alert notifications", "defaultIcon": "1F6A8" },
    { "purpose": "deposits", "description": "Deposit notifications", "defaultIcon": "1F4B0" },
    { "purpose": "performance", "description": "Performance updates", "defaultIcon": "1F4C8" },
    { "purpose": "hierarchy_changes", "description": "Hierarchy change notifications", "defaultIcon": "1F465" }
  ]
}
```

**Error Codes:** `UNAUTHORIZED`

---

## 21. Category P: Benchmark

> **Base:** `/api/benchmark` | **Count:** 1 endpoint | **Auth:** `JWT` or `API` | **Tier:** `intensive`

System performance benchmarking endpoint.

---

### P.1 GET /api/benchmark

Run system performance benchmark.

**Auth:** `JWT` or `API`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| "duration" | integer | No | Benchmark duration in seconds (default: 30) |
| "type" | string | No | `full`, `database`, `network`, `cpu`, `memory` |

**Response 200:**
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "duration": 30,
  "results": {
    "database": {
      "queriesPerSecond": 12500,
      "avgQueryTimeMs": 0.08,
      "p95QueryTimeMs": 0.15,
      "p99QueryTimeMs": 0.30,
      "connections": 5
    },
    "network": {
      "requestsPerSecond": 45000,
      "avgLatencyMs": 2.5,
      "p95LatencyMs": 5.0,
      "p99LatencyMs": 10.0
    },
    "cpu": {
      "avgUsage": 0.35,
      "peakUsage": 0.72
    },
    "memory": {
      "usedMb": 256,
      "totalMb": 1024,
      "usage": 0.25
    }
  },
  "summary": {
    "grade": "A",
    "status": "healthy",
    "recommendations": []
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `INTERNAL_ERROR`



---

## 22. Partner Profile OS Endpoints

> **Base:** `/api/partners`, `/api/signals`, `/api/templates` | **Auth:** `JWT` (reads), `JWT` + `Admin` (mutations) | **Tier:** `standard` (reads), `admin` (mutations), `signal` (routing)

The Partner Profile OS provides canonical partner identity management, signal routing with multi-layered data source separation, lifecycle state machine, and settlement tracking.

Tables: `partner_profiles`, `partner_sources`, `partner_cultivation`, `partner_settlement`, `partner_telegram_topics`, `partner_gates`, `partner_runtime_state`, `partner_lifecycle_log`, `partner_gate_log`, `partner_settlement_log`

### 22.1 Partner Profiles

---

#### GET /api/partners

List all partners.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `status` | string | No | Filter by lifecycle state: `signup`, `materialized`, `kyc_pending`, `active`, `cultivating`, `graduated`, `frozen`, `suspended`, `terminated` |
| `templateId` | string | No | Filter by template ID |
| `kycStatus` | string | No | Filter by KYC: `pending`, `verified`, `rejected` |
| `limit` | integer | No | Max results (default: 50, max: 200) |
| `offset` | integer | No | Pagination offset |
| `sort` | string | No | Sort field (default: `createdAt`) |
| `order` | string | No | `asc`, `desc` |

**Response 200:**
```json
{
  "partners": [
    {
      "partnerId": "PARTNER_001",
      "templateId": "hybrid-sharp",
      "displayName": "Hybrid Sharp Partner",
      "email": "partner@example.com",
      "status": "active",
      "kycStatus": "verified",
      "currentBalance": 50000,
      "dailyUsed": 12000,
      "currentLimit": 25000,
      "opsecScore": 15,
      "riskLevel": "green",
      "createdAt": "2025-01-01T00:00:00Z",
      "activatedAt": "2025-01-05T00:00:00Z"
    }
  ],
  "total": 47,
  "byStatus": { "active": 30, "cultivating": 8, "frozen": 5, "suspended": 2, "graduated": 2 }
}
```

**Error Codes:** `UNAUTHORIZED`

---

#### POST /api/partners

Create a new partner from a template.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "partnerId": "PARTNER_002",
  "templateId": "hybrid-sharp",
  "displayName": "New Partner",
  "email": "new@example.com",
  "phone": "+1-555-0199",
  "overrides": {
    "profile": {
      "displayName": "Custom Display Name"
    },
    "runtime": {
      "currentBalance": 75000,
      "kycStatus": "verified"
    }
  }
}
```

**Response 201:**
```json
{
  "partnerId": "PARTNER_002",
  "templateId": "hybrid-sharp",
  "displayName": "Custom Display Name",
  "email": "new@example.com",
  "status": "materialized",
  "kycStatus": "verified",
  "currentBalance": 75000,
  "currentLimit": 0,
  "dailyUsed": 0,
  "createdAt": "2025-01-15T10:30:00Z",
  "materializedAt": "2025-01-15T10:30:00Z",
  "profile": { "jurisdiction": "us", "sources": { "defaults": [], "max_sources": 5 } },
  "gateway": {
    "state": "materialized",
    "bookCount": 0,
    "sorEligible": false
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `TEMPLATE_NOT_FOUND`, `DUPLICATE_PARTNER`

---

#### GET /api/partners/:id

Get full partner profile.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "templateId": "hybrid-sharp",
  "displayName": "Hybrid Sharp Partner",
  "email": "partner@example.com",
  "phone": "+1-555-0100",
  "status": "active",
  "kycStatus": "verified",
  "riskLevel": "green",
  "opsecScore": 15,
  "currentBalance": 50000,
  "dailyUsed": 12000,
  "totalDeposited": 100000,
  "totalWithdrawn": 30000,
  "totalSettledPnl": -5000,
  "currentLimit": 25000,
  "currentLimits": { "NBA": 5000, "NFL": 10000, "MLB": 5000 },
  "jurisdiction": { "country": "US", "state": "NV", "kycTier": "enhanced", "taxForm": "W9" },
  "sources": {
    "defaults": [
      { "id": "dk_retail", "bookId": "DRAFTKINGS", "active": true, "priority": 1 },
      { "id": "pin_offshore", "bookId": "PINNACLE", "active": true, "priority": 2 }
    ],
    "maxSources": 5,
    "apiAccess": true
  },
  "cultivation": {
    "phase": "warmup",
    "targetDepositTotal": 50000,
    "actualDepositTotal": 100000,
    "targetLimit": 25000,
    "currentLimit": 25000,
    "betCount": 45,
    "sportsDiversityCount": 3
  },
  "settlement": {
    "commissionStructure": "tiered",
    "commissionTiers": [
      { "threshold": 0, "rate": 0.30 },
      { "threshold": 25000, "rate": 0.40 },
      { "threshold": 100000, "rate": 0.50 }
    ],
    "makeupEnabled": true,
    "makeupBalance": 500,
    "payoutCadence": "monthly",
    "currency": "USD"
  },
  "sor": {
    "eligibleTiers": ["T1", "T2", "T3"],
    "maxExposurePerSignal": 5000,
    "maxDailyExposure": 25000,
    "maxSingleBet": 5000,
    "bookWhitelist": ["DRAFTKINGS", "PINNACLE", "FANDUEL"],
    "bookBlacklist": ["1XBET", "BETFAIR"],
    "steamAllowed": true,
    "arbAllowed": true,
    "clvAllowed": true,
    "manualAllowed": true,
    "predictiveAllowed": false
  },
  "telegram": {
    "groups": [
      { "type": "steam", "name": "PARTNER_001_Steam", "autoCreate": true },
      { "type": "arb", "name": "PARTNER_001_Arb", "autoCreate": true },
      { "type": "signals", "name": "PARTNER_001_Signals", "autoCreate": true }
    ],
    "alertTypes": ["steam", "arb", "clv", "limit_hit"],
    "alertStakeMinimum": 1000
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "materializedAt": "2025-01-02T00:00:00Z",
  "activatedAt": "2025-01-05T00:00:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `PARTNER_NOT_FOUND`

---

#### PUT /api/partners/:id

Update partner profile fields.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Request Body:**
```json
{
  "displayName": "Updated Partner Name",
  "email": "updated@example.com",
  "phone": "+1-555-0200"
}
```

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "displayName": "Updated Partner Name",
  "email": "updated@example.com",
  "phone": "+1-555-0200",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `PARTNER_NOT_FOUND`, `VALIDATION_ERROR`

---

#### DELETE /api/partners/:id

Soft-delete (terminate) a partner.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "status": "terminated",
  "terminatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `PARTNER_NOT_FOUND`

---

#### POST /api/partners/:id/evaluate

Evaluate a signal against a specific partner.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Request Body:**
```json
{
  "signalId": "steam_001",
  "bookId": "PINNACLE",
  "type": "steam",
  "suggestedStake": 10000,
  "tier": "T1",
  "eventId": "E1",
  "market": "spread",
  "sport": "NBA",
  "confidence": 0.95,
  "urgencyMs": 5000
}
```

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "signalId": "steam_001",
  "allowed": true,
  "action": "adjust",
  "reason": "Exceeds max exposure per signal",
  "adjustedStake": 5000,
  "metadata": {
    "originalStake": 10000,
    "maxExposure": 5000,
    "maxDaily": 25000,
    "remainingDaily": 13000,
    "tier": "T1",
    "template": "hybrid-sharp",
    "bookAllowed": true,
    "typeAllowed": true,
    "kycPass": true,
    "balancePass": true,
    "opsecPass": true,
    "marketLimit": 5000
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `PARTNER_NOT_FOUND`, `VALIDATION_ERROR`

---

#### POST /api/partners/:id/transition

Trigger a lifecycle state transition.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Request Body:**
```json
{
  "event": "approve",
  "reason": "KYC verified and capital requirement met",
  "guardOverrides": []
}
```

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "previousState": "materialized",
  "currentState": "active",
  "transition": "materialized→active",
  "reason": "KYC verified and capital requirement met",
  "guardChecks": [
    { "name": "kyc_verified", "passed": true, "detail": "KYC status: verified" },
    { "name": "capital_met", "passed": true, "detail": "Balance 50000 >= requirement 25000" }
  ],
  "transitionedAt": "2025-01-15T10:30:00Z",
  "triggeredBy": "admin_user"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `PARTNER_NOT_FOUND`, `INVALID_TRANSITION`, `GUARD_CHECK_FAILED`, `VALIDATION_ERROR`

**Valid Transitions:**
| Event | From → To | Guards |
|---|---|---|
| `materialize` | signup → materialized | Template loaded |
| `approve` | materialized/kyc_pending → active | KYC verified + capital met |
| `graduate` | cultivating → graduated | Limit target + deposits + admin approval |
| `freeze` | any → frozen | Admin/compliance trigger |
| `reactivate` | frozen/suspended → active | Admin approval |

---

#### GET /api/partners/:id/gate-log

Get gate decision history for a partner.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `action` | string | No | Filter by action: `allow`, `block`, `adjust`, `defer` |
| `limit` | integer | No | Max results (default: 50, max: 500) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "entries": [
    {
      "id": 1,
      "signalId": "steam_001",
      "action": "allow",
      "reason": null,
      "originalStake": 5000,
      "adjustedStake": null,
      "metadata": { "bookAllowed": true, "kycPass": true, "balancePass": true },
      "timestamp": "2025-01-15T10:00:00Z"
    },
    {
      "id": 2,
      "signalId": "arb_001",
      "action": "block",
      "reason": "Book BLACKLISTED",
      "originalStake": 10000,
      "metadata": { "bookAllowed": false },
      "timestamp": "2025-01-15T10:15:00Z"
    }
  ],
  "total": 234,
  "byAction": { "allow": 180, "block": 35, "adjust": 15, "defer": 4 }
}
```

**Error Codes:** `UNAUTHORIZED`, `PARTNER_NOT_FOUND`

---

#### GET /api/partners/:id/lifecycle-log

Get lifecycle transition history.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "entries": [
    {
      "id": 1,
      "fromState": null,
      "toState": "signup",
      "triggeredBy": "system",
      "reason": "Partner registration",
      "guardChecks": [],
      "timestamp": "2025-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "fromState": "signup",
      "toState": "materialized",
      "triggeredBy": "admin_user",
      "reason": "Template hybrid-sharp loaded",
      "guardChecks": [],
      "timestamp": "2025-01-02T00:00:00Z"
    },
    {
      "id": 3,
      "fromState": "materialized",
      "toState": "active",
      "triggeredBy": "admin_user",
      "reason": "KYC verified and capital met",
      "guardChecks": [
        { "name": "kyc_verified", "passed": true },
        { "name": "capital_met", "passed": true }
      ],
      "timestamp": "2025-01-05T00:00:00Z"
    }
  ],
  "total": 3,
  "currentState": "active"
}
```

**Error Codes:** `UNAUTHORIZED`, `PARTNER_NOT_FOUND`

---

#### GET /api/partners/:id/settlement

Get settlement/commission info for a partner.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "commissionStructure": "tiered",
  "commissionTiers": [
    { "threshold": 0, "rate": 0.30 },
    { "threshold": 25000, "rate": 0.40 },
    { "threshold": 100000, "rate": 0.50 }
  ],
  "currentRate": 0.40,
  "makeupEnabled": true,
  "makeupBalance": 500,
  "makeupWindowDays": 30,
  "payoutCadence": "monthly",
  "payoutMethod": "bank_transfer",
  "payoutMinimum": 1000,
  "currency": "USD",
  "lifetimeCommissionPaid": 15000,
  "lifetimeMakeupCleared": 2500,
  "lastPayoutAt": "2025-01-01T00:00:00Z",
  "nextPayoutAt": "2025-02-01T00:00:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `PARTNER_NOT_FOUND`

---

#### POST /api/partners/:id/deposit

Record a deposit for a partner.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Request Body:**
```json
{
  "amount": 25000,
  "method": "bank_transfer",
  "reference": "wire_20250115",
  "notes": "January capital injection"
}
```

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "depositId": "dep_001",
  "amount": 25000,
  "previousBalance": 50000,
  "newBalance": 75000,
  "totalDeposited": 125000,
  "processedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `PARTNER_NOT_FOUND`, `DEPOSIT_FAILED`, `VALIDATION_ERROR`

---

#### POST /api/partners/:id/withdrawal

Record a withdrawal for a partner.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Request Body:**
```json
{
  "amount": 10000,
  "method": "bank_transfer",
  "reference": "payout_20250115"
}
```

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "withdrawalId": "wdr_001",
  "amount": 10000,
  "previousBalance": 75000,
  "newBalance": 65000,
  "totalWithdrawn": 40000,
  "processedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `PARTNER_NOT_FOUND`, `WITHDRAWAL_FAILED` (insufficient balance), `VALIDATION_ERROR`

---

#### POST /api/partners/:id/set-market-limit

Set a per-market cultivation limit.

**Auth:** `JWT` + `Admin`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Request Body:**
```json
{
  "market": "NBA",
  "limit": 5000
}
```

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "market": "NBA",
  "previousLimit": 0,
  "newLimit": 5000,
  "allLimits": { "NBA": 5000, "NFL": 10000, "MLB": 5000 },
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `PARTNER_NOT_FOUND`, `VALIDATION_ERROR`

---

#### GET /api/partners/:id/sources/health

Run health checks on partner sources.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Partner ID |

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "sources": [
    {
      "sourceId": "dk_retail",
      "bookId": "DRAFTKINGS",
      "healthy": true,
      "latencyMs": 45,
      "lastHealthCheck": "2025-01-15T10:29:00Z",
      "status": "active"
    },
    {
      "sourceId": "pin_offshore",
      "bookId": "PINNACLE",
      "healthy": false,
      "latencyMs": 5000,
      "error": "Connection timeout",
      "status": "degraded"
    }
  ],
  "overall": "degraded",
  "checkedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `PARTNER_NOT_FOUND`

---

### 22.2 Signal Routing

---

#### POST /api/signals/route

Route a signal to all eligible partners.

**Auth:** `JWT`

**Request Body:**
```json
{
  "signalId": "arb_001",
  "bookId": "PINNACLE",
  "type": "arb",
  "suggestedStake": 5000,
  "tier": "T2",
  "eventId": "E2",
  "market": "ml",
  "sport": "NFL",
  "confidence": 0.88,
  "urgencyMs": 3000,
  "odds": -105,
  "side": "home"
}
```

**Response 200:**
```json
{
  "signalId": "arb_001",
  "routedAt": "2025-01-15T10:30:00Z",
  "candidatesEvaluated": 3,
  "results": [
    {
      "partnerId": "PARTNER_001",
      "allowed": true,
      "action": "allow",
      "adjustedStake": null,
      "reason": null,
      "metadata": { "originalStake": 5000, "remainingDaily": 13000, "bookAllowed": true }
    },
    {
      "partnerId": "PARTNER_002",
      "allowed": false,
      "action": "block",
      "reason": "Partner frozen",
      "metadata": { "bookAllowed": false }
    },
    {
      "partnerId": "PARTNER_003",
      "allowed": true,
      "action": "adjust",
      "adjustedStake": 3000,
      "reason": "Exceeds remaining daily exposure",
      "metadata": { "originalStake": 5000, "remainingDaily": 3000, "bookAllowed": true }
    }
  ],
  "summary": {
    "allowed": 2,
    "blocked": 1,
    "adjusted": 1,
    "totalExposureRecorded": 8000
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`

---

#### GET /api/signals/gate-results

Get all recent gate results.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `partnerId` | string | No | Filter by partner |
| `action` | string | No | Filter by action: `allow`, `block`, `adjust`, `defer` |
| `bookId` | string | No | Filter by book |
| `hours` | integer | No | Results from last N hours (default: 24) |
| `limit` | integer | No | Max results (default: 100) |
| `offset` | integer | No | Pagination offset |

**Response 200:**
```json
{
  "entries": [
    {
      "id": 1001,
      "partnerId": "PARTNER_001",
      "signalId": "steam_045",
      "action": "allow",
      "reason": null,
      "originalStake": 5000,
      "adjustedStake": null,
      "metadata": { "bookAllowed": true, "kycPass": true },
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1240,
  "byAction": { "allow": 980, "block": 180, "adjust": 70, "defer": 10 }
}
```

**Error Codes:** `UNAUTHORIZED`

---

#### POST /api/signals/evaluate-batch

Batch evaluate signals for a single partner.

**Auth:** `JWT`

**Request Body:**
```json
{
  "partnerId": "PARTNER_001",
  "signals": [
    {
      "signalId": "steam_001",
      "bookId": "PINNACLE",
      "type": "steam",
      "suggestedStake": 5000,
      "tier": "T1",
      "eventId": "E1",
      "market": "spread",
      "sport": "NBA",
      "confidence": 0.95,
      "urgencyMs": 5000
    },
    {
      "signalId": "arb_001",
      "bookId": "DRAFTKINGS",
      "type": "arb",
      "suggestedStake": 3000,
      "tier": "T2",
      "eventId": "E2",
      "market": "ml",
      "sport": "NFL",
      "confidence": 0.88,
      "urgencyMs": 3000
    }
  ]
}
```

**Response 200:**
```json
{
  "partnerId": "PARTNER_001",
  "evaluatedAt": "2025-01-15T10:30:00Z",
  "results": [
    {
      "signalId": "steam_001",
      "allowed": true,
      "action": "allow",
      "metadata": { "remainingDaily": 13000 }
    },
    {
      "signalId": "arb_001",
      "allowed": true,
      "action": "allow",
      "metadata": { "remainingDaily": 8000 }
    }
  ],
  "totalExposureRecorded": 8000
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`, `PARTNER_NOT_FOUND`

---

### 22.3 Profile Templates

---

#### GET /api/templates

List available profile templates.

**Auth:** `JWT`

**Response 200:**
```json
{
  "templates": [
    {
      "templateId": "hybrid-sharp",
      "description": "Hybrid partner with sharp access to multiple books",
      "version": "1.0",
      "categories": ["sharp", "hybrid"],
      "filePath": "./profiles/hybrid-sharp.toml",
      "loadedAt": "2025-01-01T00:00:00Z",
      "partnerCount": 12
    },
    {
      "templateId": "legal-us-retail",
      "description": "US-based retail partner with strict compliance",
      "version": "1.0",
      "categories": ["retail", "us"],
      "filePath": "./profiles/legal-us-retail.toml",
      "loadedAt": "2025-01-01T00:00:00Z",
      "partnerCount": 8
    },
    {
      "templateId": "offshore-whale",
      "description": "Offshore whale partner with high limits",
      "version": "1.0",
      "categories": ["whale", "offshore"],
      "filePath": "./profiles/offshore-whale.toml",
      "loadedAt": "2025-01-01T00:00:00Z",
      "partnerCount": 3
    }
  ],
  "total": 8
}
```

**Error Codes:** `UNAUTHORIZED`

---

#### GET /api/templates/:id

Get detailed template configuration.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | Template ID |

**Response 200:**
```json
{
  "templateId": "hybrid-sharp",
  "toml": "[profile]\ndisplay_name = 'Hybrid Sharp Partner'\n\n[sor]\neligible_tiers = ['T1', 'T2', 'T3']\nmax_exposure_per_signal = 5000\nsteam_allowed = true\narb_allowed = true\n...",
  "parsed": {
    "profile": { "displayName": "Hybrid Sharp Partner" },
    "jurisdiction": { "country": "US", "kycTier": "enhanced" },
    "sources": { "maxSources": 5, "apiAccess": true },
    "sor": { "eligibleTiers": ["T1", "T2", "T3"], "maxExposurePerSignal": 5000 },
    "cultivation": { "phase": "warmup", "targetLimit": 25000 },
    "settlement": { "commissionStructure": "tiered", "payoutCadence": "monthly" },
    "telegram": { "alertTypes": ["steam", "arb", "clv"] }
  },
  "partnerCount": 12
}
```

**Error Codes:** `UNAUTHORIZED`, `TEMPLATE_NOT_FOUND`

---

#### POST /api/templates/reload

Hot-reload all templates from disk.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "templateDir": "./profiles"
}
```

**Response 200:**
```json
{
  "success": true,
  "templatesLoaded": 8,
  "partnersRefreshed": 47,
  "bookIndexRefreshed": true,
  "errors": [],
  "reloadedAt": "2025-01-15T10:30:00Z"
}
```

**Response 200 (with errors):**
```json
{
  "success": true,
  "templatesLoaded": 7,
  "partnersRefreshed": 47,
  "bookIndexRefreshed": true,
  "errors": [
    { "file": "./profiles/broken.toml", "line": 42, "column": 15, "message": "Unexpected token" }
  ],
  "reloadedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`

---

#### POST /api/templates/validate

Validate a template file without loading.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "templateContent": "[profile]\ndisplay_name = 'Test'\n\n[sor]\neligible_tiers = ['T1']\nmax_exposure_per_signal = 1000\n"
}
```

**Response 200:**
```json
{
  "valid": true,
  "templateId": "test",
  "parsed": { ... },
  "errors": [],
  "warnings": []
}
```

**Response 200 (invalid):**
```json
{
  "valid": false,
  "templateId": null,
  "parsed": null,
  "errors": [
    { "path": "sor.eligible_tiers", "message": "Must contain at least one tier" }
  ],
  "warnings": [
    { "path": "settlement.commission_tiers", "message": "No commission tiers defined, using flat rate" }
  ]
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`



---

## 23. Telegram Hub Endpoints

> **Base:** `/api/health`, `/api/admin`, `/api/telegram` | **Auth:** `JWT` (reads), `JWT` + `Admin` (mutations) | **Tier:** `standard`

Telegram Bot Hub integration: health monitoring, topic refresh, delivery statistics, and per-bot metrics.

Tables: `bot_heartbeat`, `telegram_dispatch_log`, `agent_supergroups`, `agent_supergroup_topics`

### 23.1 System Health

---

#### GET /api/health/system-status

Get overall system health including Telegram bot status.

**Auth:** `JWT`

**Response 200:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptimeSeconds": 86400,
  "version": "5.2.0",
  "database": {
    "status": "ok",
    "connections": 5,
    "lagMs": 2
  },
  "telegramBots": [
    {
      "botId": "risk_bot",
      "status": "healthy",
      "lastHeartbeat": "2025-01-15T10:30:00Z",
      "heartbeatAgeMs": 1500,
      "uptimeMs": 3600000,
      "messagesDelivered": 15234,
      "messagesFailed": 12,
      "topicsManaged": 48,
      "topicsMissing": 0,
      "queueLag": 12
    },
    {
      "botId": "payment_bot",
      "status": "healthy",
      "lastHeartbeat": "2025-01-15T10:29:58Z",
      "heartbeatAgeMs": 3500,
      "uptimeMs": 3600000,
      "messagesDelivered": 8921,
      "messagesFailed": 3,
      "topicsManaged": 36,
      "topicsMissing": 0,
      "queueLag": 0
    },
    {
      "botId": "agent_bot",
      "status": "healthy",
      "lastHeartbeat": "2025-01-15T10:29:55Z",
      "heartbeatAgeMs": 6500,
      "uptimeMs": 7200000,
      "messagesDelivered": 5620,
      "messagesFailed": 1,
      "topicsManaged": 24,
      "topicsMissing": 0,
      "queueLag": 3
    }
  ],
  "queues": [
    { "stream": "risk_alerts", "length": 12, "pending": 2 },
    { "stream": "payment_events", "length": 0, "pending": 0 },
    { "stream": "agent_events", "length": 3, "pending": 1 },
    { "stream": "system_events", "length": 1, "pending": 0 }
  ],
  "alerts": {
    "staleBots": 0,
    "queueOverflow": 0,
    "highFailureRate": 0
  }
}
```

**Status Determination:**
| Overall | Condition |
|---|---|
| `healthy` | DB ok + all bots healthy + no queue overflow |
| `degraded` | Any bot stale (>60s heartbeat) or queue lag >100 |
| `unhealthy` | DB error OR all bots stale OR critical queue overflow |

**Error Codes:** `UNAUTHORIZED`

---

#### GET /api/health/ready

Kubernetes-style readiness probe.

**Auth:** `Pub`

**Response 200:**
```json
{
  "ready": true,
  "timestamp": "2025-01-15T10:30:00Z",
  "checks": {
    "database": true,
    "redis": true,
    "templateLoad": true
  }
}
```

**Response 503 (not ready):**
```json
{
  "ready": false,
  "timestamp": "2025-01-15T10:30:00Z",
  "checks": {
    "database": true,
    "redis": false,
    "templateLoad": true
  }
}
```

---

#### GET /api/health/live

Kubernetes-style liveness probe.

**Auth:** `Pub`

**Response 200:** `alive`

**Response 503:** `not alive`

---

### 23.2 Admin Operations

---

#### POST /api/admin/bots/refresh

Trigger topic reconciliation for all bots or a specific bot.

**Auth:** `JWT` + `Admin` (`role: admin` or `superadmin`)

**Request Body:**
```json
{
  "botId": "risk_bot"
}
```

**Notes:** `botId` is optional; omit to refresh all bots.

**Response 200:**
```json
{
  "ok": true,
  "botsTriggered": ["risk_bot", "payment_bot", "agent_bot"],
  "message": "Refresh events published to system_events stream",
  "publishedAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `TELEGRAM_BOT_UNHEALTHY`

---

#### POST /api/admin/bots/restart

Restart a specific bot worker.

**Auth:** `JWT` + `Admin`

**Request Body:**
```json
{
  "botId": "risk_bot",
  "reason": "Memory usage threshold exceeded"
}
```

**Response 202:**
```json
{
  "botId": "risk_bot",
  "status": "restart_scheduled",
  "reason": "Memory usage threshold exceeded",
  "scheduledAt": "2025-01-15T10:30:00Z"
}
```

**Error Codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

### 23.3 Delivery Statistics

---

#### GET /api/telegram/delivery-stats

Aggregated delivery metrics from `telegram_dispatch_log`.

**Auth:** `JWT`

**Query Parameters:**
| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `hours` | integer | No | 24 | Lookback period in hours |
| `botId` | string | No | (all) | Filter by bot |
| `purpose` | string | No | (all) | Filter by purpose |

**Response 200:**
```json
{
  "period": {
    "hours": 24,
    "from": "2025-01-14T10:00:00Z",
    "to": "2025-01-15T10:00:00Z"
  },
  "summary": {
    "totalEvents": 24152,
    "delivered": 24130,
    "failed": 22,
    "successRate": 0.9991,
    "avgLatencyMs": 145,
    "p99LatencyMs": 890
  },
  "byBot": [
    {
      "botId": "risk_bot",
      "delivered": 15234,
      "failed": 12,
      "avgLatencyMs": 132,
      "successRate": 0.9992
    },
    {
      "botId": "payment_bot",
      "delivered": 8921,
      "failed": 10,
      "avgLatencyMs": 167,
      "successRate": 0.9989
    }
  ],
  "byPurpose": [
    { "purpose": "riskAlerts", "delivered": 8234, "failed": 8 },
    { "purpose": "deposits", "delivered": 5210, "failed": 2 },
    { "purpose": "performance", "delivered": 3686, "failed": 5 },
    { "purpose": "general", "delivered": 7000, "failed": 7 }
  ],
  "byHour": [
    { "hour": "09:00", "delivered": 420, "failed": 1 },
    { "hour": "10:00", "delivered": 380, "failed": 0 },
    { "hour": "11:00", "delivered": 450, "failed": 2 }
  ],
  "topFailures": [
    { "error": "No topic resolved", "count": 15 },
    { "error": "Rate limit exceeded", "count": 5 },
    { "error": "Bot token invalid", "count": 2 }
  ]
}
```

**Error Codes:** `UNAUTHORIZED`, `VALIDATION_ERROR`

---

#### GET /api/telegram/bot/:botId/stats

Real-time stats for a specific bot worker.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `botId` | string | Bot identifier (`risk_bot`, `payment_bot`, `agent_bot`) |

**Response 200:**
```json
{
  "botId": "risk_bot",
  "running": true,
  "uptimeMs": 3600000,
  "messagesDelivered": 15234,
  "messagesFailed": 12,
  "streams": ["risk_alerts"],
  "topicsManaged": 48,
  "totalTopics": 52,
  "pendingCount": 2,
  "lastHeartbeat": "2025-01-15T10:30:00Z",
  "heartbeatAgeMs": 1500,
  "consumerLag": 12,
  "avgProcessingMs": 45
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

#### GET /api/telegram/bot/:botId/delivery-log

Get delivery log for a specific bot.

**Auth:** `JWT`

**Path Parameters:**
| Param | Type | Description |
|---|---|---|
| `botId` | string | Bot identifier |

**Query Parameters:**
| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `hours` | integer | No | 24 | Lookback period |
| `status` | string | No | (all) | `delivered`, `failed` |
| `limit` | integer | No | 50 | Max results |
| `offset` | integer | No | 0 | Pagination offset |

**Response 200:**
```json
{
  "botId": "risk_bot",
  "entries": [
    {
      "id": 1001,
      "eventType": "risk_alert",
      "purpose": "riskAlerts",
      "agentLogin": "supervisor",
      "chatId": "-1001234567890",
      "threadId": 12345,
      "status": "delivered",
      "latencyMs": 45,
      "deliveredAt": "2025-01-15T10:29:59Z",
      "errorMessage": null
    },
    {
      "id": 1002,
      "eventType": "risk_alert",
      "purpose": "riskAlerts",
      "agentLogin": "unknown_agent",
      "chatId": null,
      "threadId": null,
      "status": "failed",
      "latencyMs": null,
      "deliveredAt": null,
      "errorMessage": "No topic resolved"
    }
  ],
  "total": 1240,
  "summary": {
    "delivered": 1228,
    "failed": 12,
    "avgLatencyMs": 132
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `NOT_FOUND`

---

#### GET /api/telegram/topics/status

Get topic provisioning status across all supergroups.

**Auth:** `JWT`

**Response 200:**
```json
{
  "supergroups": [
    {
      "supergroupId": 1,
      "name": "Risk Alerts Group",
      "botId": "risk_bot",
      "topics": {
        "total": 8,
        "active": 8,
        "missing": 0
      },
      "lastRefresh": "2025-01-15T10:00:00Z"
    }
  ],
  "summary": {
    "totalSupergroups": 5,
    "totalTopics": 40,
    "activeTopics": 38,
    "missingTopics": 2
  }
}
```

**Error Codes:** `UNAUTHORIZED`



---

## 24. WebSocket Registry

> **Endpoint:** `ws://localhost:3000/ws` | **Auth:** JWT via query param or upgrade header | **Tier:** `streaming`

### 24.1 Connection

Establish a WebSocket connection with JWT authentication:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws?token=<jwt_token>');
```

**Connection Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | JWT access token |
| `subscriptions` | string | No | Comma-separated list of channels to subscribe |

**Valid Subscription Channels:**
- `wagers` — All live wager events
- `alerts` — Risk alerts
- `positions` — Position updates
- `players` — Player activity
- `odds` — Odds movement
- `enforcement` — Enforcement actions
- `partner_gates` — Partner gate decisions
- `system` — System events (health, config changes)

### 24.2 Client → Server Messages

---

#### subscribe

Subscribe to additional channels after connection.

```json
{
  "type": "subscribe",
  "channels": ["alerts", "positions"]
}
```

**Server Response:**
```json
{
  "type": "subscribed",
  "channels": ["alerts", "positions"],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

#### unsubscribe

Unsubscribe from channels.

```json
{
  "type": "unsubscribe",
  "channels": ["odds"]
}
```

**Server Response:**
```json
{
  "type": "unsubscribed",
  "channels": ["odds"],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

#### ping

Keep-alive ping (client-initiated).

```json
{
  "type": "ping",
  "timestamp": 1705312200000
}
```

**Server Response:**
```json
{
  "type": "pong",
  "clientTimestamp": 1705312200000,
  "serverTimestamp": 1705312200015
}
```

---

#### get_status

Request current connection status.

```json
{
  "type": "get_status"
}
```

**Server Response:**
```json
{
  "type": "status",
  "connectedAt": "2025-01-15T10:00:00Z",
  "subscribedChannels": ["wagers", "alerts", "positions"],
  "messagesReceived": 4521,
  "messagesSent": 3,
  "lastActivityAt": "2025-01-15T10:30:00Z"
}
```

### 24.3 Server → Client Messages

---

#### wager

New wager placed (from SSE stream, forwarded via WS).

```json
{
  "type": "wager",
  "channel": "wagers",
  "data": {
    "id": "wager_abc123",
    "playerId": "player_12345",
    "playerLogin": "player_login",
    "agentId": "agent_001",
    "sport": "NBA",
    "eventId": "evt_98765",
    "eventName": "Lakers vs Celtics",
    "market": "spread",
    "selection": "Lakers -4.5",
    "odds": -110,
    "stake": 100000,
    "potentialPayout": 190909,
    "status": "pending",
    "placedAt": "2025-01-15T10:30:00Z",
    "riskScore": 0.72,
    "ipAddress": "192.168.1.100"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

#### alert

Risk alert generated.

```json
{
  "type": "alert",
  "channel": "alerts",
  "data": {
    "id": "alert_001",
    "severity": "critical",
    "type": "exposure_spike",
    "title": "NFL Exposure Spike",
    "message": "NFL exposure increased 300% in last hour",
    "context": {
      "sport": "NFL",
      "previousExposure": 500000,
      "currentExposure": 2000000
    },
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

#### position_update

Position exposure changed.

```json
{
  "type": "position_update",
  "channel": "positions",
  "data": {
    "positionId": "pos_001",
    "eventId": "evt_98765",
    "eventName": "Lakers vs Celtics",
    "netExposure": -2250000,
    "wagerCount": 39,
    "sideBreakdown": {
      "Lakers -4.5": { "wagered": 1600000, "count": 25 },
      "Celtics +4.5": { "wagered": 1000000, "count": 14 }
    },
    "updatedAt": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

#### odds_move

Odds movement on a line.

```json
{
  "type": "odds_move",
  "channel": "odds",
  "data": {
    "eventId": "evt_98765",
    "sport": "NBA",
    "market": "spread",
    "selection": "Lakers -4.5",
    "book": "DRAFTKINGS",
    "oldOdds": -110,
    "newOdds": -115,
    "oldLine": -4.5,
    "newLine": -5.0,
    "moveDirection": "away",
    "moveSize": 0.5,
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

#### enforcement_action

Enforcement action applied.

```json
{
  "type": "enforcement_action",
  "channel": "enforcement",
  "data": {
    "id": "enf_001",
    "playerId": "player_12345",
    "playerLogin": "player_login",
    "action": "limit_applied",
    "limitType": "max_wager",
    "oldValue": 500000,
    "newValue": 5000,
    "appliedBy": "admin_user",
    "appliedAt": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

#### partner_gate

Partner gate decision recorded.

```json
{
  "type": "partner_gate",
  "channel": "partner_gates",
  "data": {
    "partnerId": "PARTNER_001",
    "signalId": "steam_001",
    "action": "allow",
    "reason": null,
    "originalStake": 5000,
    "adjustedStake": null,
    "metadata": {
      "bookAllowed": true,
      "kycPass": true,
      "balancePass": true,
      "remainingDaily": 13000
    },
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

#### system_event

System-level event.

```json
{
  "type": "system_event",
  "channel": "system",
  "data": {
    "event": "template_reloaded",
    "templatesLoaded": 8,
    "partnersRefreshed": 47,
    "timestamp": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

#### error

WebSocket-level error (does not close connection).

```json
{
  "type": "error",
  "channel": "system",
  "code": "INVALID_MESSAGE",
  "message": "Unknown message type: 'bad_type'",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Error Codes:**
| Code | Description |
|---|---|
| `INVALID_MESSAGE` | Unknown or malformed message type |
| `AUTH_EXPIRED` | JWT token has expired |
| `RATE_LIMITED` | Message rate limit exceeded |
| `INVALID_CHANNEL` | Requested channel does not exist |
| `NOT_AUTHORIZED` | Not authorized for this channel |

### 24.4 Connection Lifecycle

```
Client                                  Server
  |                                       |
  |---- WS /ws?token=... ---------------->|
  |                                       |-- Validate JWT
  |<---- Connection Established ----------|
  |                                       |
  |---- {type: "subscribe", channels:[]}->|
  |<---- {type: "subscribed", ...} -------|
  |                                       |
  |<---- {type: "wager", ...} ------------|  (stream events)
  |<---- {type: "alert", ...} ------------|
  |                                       |
  |---- {type: "ping", ...} ------------->|
  |<---- {type: "pong", ...} -------------|
  |                                       |
  |---- Close --------------------------->|
  |<---- Connection Closed ---------------|
```

**Idle Timeout:** 5 minutes (configurable via `IDLE_TIMEOUT_MS`, default: 300000)
**Ping Interval:** Client should ping every 30 seconds
**Max Message Size:** 64KB
**Max Connections:** 1000 per server instance

---

## 25. SSE Endpoints

Server-Sent Events provide unidirectional streaming from server to client. Use EventSource API in browsers.

### 25.1 Connection Format

```javascript
const eventSource = new EventSource('/api/stream/live-wagers?token=<jwt>');
eventSource.addEventListener('wager', (e) => {
  const wager = JSON.parse(e.data);
  console.log('New wager:', wager);
});
```

### 25.2 SSE Endpoints

| Endpoint | Event Types | Description | Auth |
|---|---|---|---|
| `GET /api/stream/live-wagers` | `wager`, `violation` | Real-time wager feed | JWT |
| `GET /api/stream/alerts` | `alert`, `flag` | Risk alert stream | JWT |
| `GET /api/stream/positions` | `position-update`, `position-new` | Position updates | JWT |
| `GET /api/stream/partner-gates` | `gate-decision` | Partner gate decisions | JWT |
| `GET /api/stream/system` | `system-event`, `health-check` | System events | JWT |

### 25.3 Common SSE Event Format

```
event: <event-type>
id: <event-id>
data: <json-payload>
retry: 5000

```

### 25.4 SSE: Live Wagers

**Endpoint:** `GET /api/stream/live-wagers`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | JWT token (query param or Authorization header) |
| `sport` | string | No | Filter by sport |
| `minStake` | integer | No | Minimum stake (cents) |
| `playerId` | string | No | Filter by player |

**Events:**

```
event: wager
data: {"id":"wager_123","playerId":"p_1","sport":"NBA","stake":100000,"odds":-110,"timestamp":"2025-01-15T10:30:00Z"}

event: violation
data: {"type":"exceeds_limit","wagerId":"wager_124","playerId":"p_2","limit":5000,"attempted":100000,"enforced":true}

event: heartbeat
data: {"timestamp":"2025-01-15T10:30:00Z","wagersInLastMinute":23}
```

---

### 25.5 SSE: Alerts

**Endpoint:** `GET /api/stream/alerts`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | JWT token |
| `severity` | string | No | Minimum severity |
| `types` | string | No | Comma-separated alert types |

**Events:**

```
event: alert
data: {"id":"alert_001","severity":"critical","type":"exposure_spike","message":"NFL exposure up 300%","timestamp":"2025-01-15T10:30:00Z"}

event: flag
data: {"id":"flag_001","playerId":"p_1","type":"win_rate_anomaly","severity":"high","timestamp":"2025-01-15T10:30:00Z"}

event: alert-resolved
data: {"id":"alert_001","status":"resolved","resolution":"Limits adjusted","resolvedAt":"2025-01-15T10:30:00Z"}
```

---

### 25.6 SSE: Positions

**Endpoint:** `GET /api/stream/positions`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | JWT token |
| `sport` | string | No | Filter by sport |

**Events:**

```
event: position-update
data: {"positionId":"pos_001","eventId":"evt_98765","netExposure":-2250000,"wagerCount":39,"updatedAt":"2025-01-15T10:30:00Z"}

event: position-new
data: {"positionId":"pos_002","eventId":"evt_99999","eventName":"Warriors vs Nets","initialExposure":500000,"createdAt":"2025-01-15T10:30:00Z"}

event: position-expired
data: {"positionId":"pos_003","expiredAt":"2025-01-15T10:30:00Z","reason":"event_started"}
```

---

### 25.7 SSE: Partner Gates

**Endpoint:** `GET /api/stream/partner-gates`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | JWT token |
| `partnerId` | string | No | Filter by partner |

**Events:**

```
event: gate-decision
data: {"partnerId":"PARTNER_001","signalId":"steam_045","action":"allow","originalStake":5000,"timestamp":"2025-01-15T10:30:00Z"}

event: gate-block
data: {"partnerId":"PARTNER_002","signalId":"arb_012","action":"block","reason":"Partner frozen","timestamp":"2025-01-15T10:30:00Z"}

event: gate-adjust
data: {"partnerId":"PARTNER_003","signalId":"clv_023","action":"adjust","originalStake":10000,"adjustedStake":7000,"reason":"Exceeds remaining daily","timestamp":"2025-01-15T10:30:00Z"}
```

---

### 25.8 SSE: System

**Endpoint:** `GET /api/stream/system`

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | JWT token |

**Events:**

```
event: system-event
data: {"event":"template_reloaded","templatesLoaded":8,"partnersRefreshed":47,"timestamp":"2025-01-15T10:30:00Z"}

event: health-check
data: {"status":"healthy","database":"ok","bots":3,"timestamp":"2025-01-15T10:30:00Z"}

event: rate-limit-warning
data: {"endpoint":"/api/signals/route","current":580,"limit":600,"window":"minute","timestamp":"2025-01-15T10:30:00Z"}
```

---

### 25.9 SSE Error Handling

When errors occur, the SSE stream sends an error event and may close:

```
event: error
data: {"code":"AUTH_EXPIRED","message":"JWT token has expired","timestamp":"2025-01-15T10:30:00Z"}

```

**Auto-reconnect:** EventSource auto-reconnects after 5 seconds (configurable via `retry` field).

### 25.10 SSE Connection Limits

| Metric | Limit |
|---|---|
| Max SSE connections per client IP | 5 |
| Max SSE connections globally | 500 |
| Keep-alive interval | 30 seconds |
| Event buffer size | 1000 events |
| Connection idle timeout | 10 minutes |



---

## 26. Appendix: Complete Endpoint Index

### 26.1 Endpoint Summary by Category

| # | Category | Count | Auth | Tier |
|---|----------|-------|------|------|
| A | Authentication | 3 | Pub/JWT | critical |
| B | Secrets Vault | 3 | JWT+Admin | admin |
| C | Buckeye Live Data | 4 | JWT/API | proxy |
| D | Agent Decisions | 5 | JWT(/Admin) | ai/standard |
| E | IP Intelligence | 8 | JWT(/Admin) | standard/admin |
| F | Rules Engine | 5 | JWT(/Admin) | standard/admin |
| G | Player Intelligence | 7 | JWT | standard/intensive |
| H | Sandbox v1 | 6 | JWT | standard |
| I | Sandbox v2 | 7 | JWT | standard/intensive |
| J | Export | 1 | JWT/API | intensive |
| K | Kimi AI | 1 | JWT+Admin | ai |
| L | Risk Command Center | 19 | JWT(/Admin) | intensive/admin |
| M | Enforcement | 8 | JWT(/Admin) | admin |
| N | Player Search | 3 | JWT | intensive |
| O | Agent Hub | 12 | JWT | standard |
| P | Benchmark | 1 | JWT/API | intensive |
| — | **Proxy Subtotal** | **93** | — | — |
| Q | Partner Profile OS | 18 | JWT(/Admin) | standard/admin/signal |
| R | Telegram Hub | 9 | JWT(/Admin) | standard |
| S | WebSocket | 8 message types | JWT | streaming |
| T | SSE Streams | 5 endpoints | JWT | streaming |
| — | **Grand Total** | **125+ endpoints** | — | — |

### 26.2 Complete Endpoint Reference

#### Category A: Authentication (3)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| A.1 | POST | `/api/proxy/auth` | Pub | `{username, password, captchaToken?}` | `{success, token, user, sessionId}` | UNAUTHORIZED, BAD_REQUEST, BAD_GATEWAY |
| A.2 | POST | `/api/proxy/renewToken` | JWT | `{token}` | `{success, token, expiresAt}` | UNAUTHORIZED, BAD_REQUEST |
| A.3 | GET | `/api/proxy/accountInfo` | JWT | Query: `sessionId?` | Account info object | UNAUTHORIZED, NOT_FOUND, BAD_GATEWAY |

#### Category B: Secrets Vault (3)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| B.1 | GET | `/api/vault/secrets` | JWT+Admin | Query: `prefix?, limit?, offset?` | `{secrets[], total}` | UNAUTHORIZED, FORBIDDEN |
| B.2 | POST | `/api/vault/secrets` | JWT+Admin | `{key, value, tags?}` | `{key, createdAt, updatedAt}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR |
| B.3 | DELETE | `/api/vault/secrets/:key` | JWT+Admin | — | 204 No Content | UNAUTHORIZED, FORBIDDEN, NOT_FOUND |

#### Category C: Buckeye Live Data (4)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| C.1 | GET | `/api/proxy/players` | JWT/API | Query: `sessionId?, updatedSince?, limit?, offset?` | `{players[], total}` | UNAUTHORIZED, BAD_GATEWAY, RATE_LIMITED |
| C.2 | GET | `/api/proxy/wagers` | JWT/API | Query: `sessionId?, since?, playerId?, status?, limit?, offset?` | `{wagers[], total, newSinceLastPoll}` | UNAUTHORIZED, BAD_GATEWAY, RATE_LIMITED |
| C.3 | GET | `/api/proxy/agentPerformance` | JWT/API | Query: `sessionId?, agentId?, period?, limit?` | `{performances[], total}` | UNAUTHORIZED, BAD_GATEWAY |
| C.4 | GET | `/api/proxy/pending` | JWT/API | Query: `sessionId?, agentId?, playerId?, sport?, limit?` | `{pendingWagers[], totalPendingExposure, count, bySport}` | UNAUTHORIZED, BAD_GATEWAY |

#### Category D: Agent Decisions (5)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| D.1 | POST | `/api/agent/analyze-live` | JWT | `{playerId, context, deepAnalysis?}` | `{playerId, analysisId, riskTier, riskScore, factors[], recommendations}` | UNAUTHORIZED, VALIDATION_ERROR, INTERNAL_ERROR |
| D.2 | POST | `/api/agent/extract-features` | JWT | `{playerId, wagerHistory[], accountAgeDays, ...}` | `{playerId, features{}, archetype, confidence}` | UNAUTHORIZED, VALIDATION_ERROR, NOT_FOUND |
| D.3 | GET | `/api/agent/rules` | JWT | Query: `active?, category?` | `{rules[], total}` | UNAUTHORIZED |
| D.4 | POST | `/api/agent/rules` | JWT+Admin | `{name, category, condition, action, severity, priority, active}` | `{id, ...}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR |
| D.5 | DELETE | `/api/agent/rules/:id` | JWT+Admin | — | 204 | UNAUTHORIZED, FORBIDDEN, NOT_FOUND |

#### Category E: IP Intelligence (8)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| E.1 | GET | `/api/agent/ip-tracking` | JWT | Query: `ip?, playerId?, flagged?, limit?, offset?` | `{ips[], total, flagged}` | UNAUTHORIZED |
| E.2 | GET | `/api/agent/ip-tracking/:ip` | JWT | — | IP detail object | UNAUTHORIZED, NOT_FOUND |
| E.3 | POST | `/api/agent/ip-block` | JWT+Admin | `{ipAddress, reason, scope, expiresAt, severity}` | `{id, ipAddress, status, createdAt}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR |
| E.4 | DELETE | `/api/agent/ip-block/:ip` | JWT+Admin | — | 204 | UNAUTHORIZED, FORBIDDEN, NOT_FOUND |
| E.5 | GET | `/api/agent/ip-denylist` | JWT | Query: `active?, scope?, limit?, offset?` | `{deniedIps[], total, active}` | UNAUTHORIZED |
| E.6 | GET | `/api/agent/ip-flags` | JWT | Query: `type?, resolved?, limit?` | `{flags[], total, open, resolved}` | UNAUTHORIZED |
| E.7 | PUT | `/api/agent/ip-flags/:id/resolve` | JWT+Admin | `{resolution, notes}` | `{id, status, resolvedAt}` | UNAUTHORIZED, FORBIDDEN, NOT_FOUND |
| E.8 | GET | `/api/agent/ip-reputation` | JWT | Query: `ip` | `{ipAddress, currentScore, riskLevel, factors[], history[], trend}` | UNAUTHORIZED, BAD_REQUEST |

#### Category F: Rules Engine (5)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| F.1 | GET | `/api/agent/rules` | JWT | Query: `active?, category?, severity?, limit?, offset?` | `{rules[], total, active}` | UNAUTHORIZED |
| F.2 | GET | `/api/agent/rules/:id` | JWT | — | Rule detail + executionLog | UNAUTHORIZED, NOT_FOUND |
| F.3 | POST | `/api/agent/rules` | JWT+Admin | `{name, category, description, condition, action, actionParams, severity, priority, active}` | `{id, ...}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR |
| F.4 | PUT | `/api/agent/rules/:id` | JWT+Admin | `{name?, condition?, actionParams?, active?}` | `{id, ...}` | UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR |
| F.5 | POST | `/api/agent/rules/:id/execute` | JWT+Admin | `{playerId, dryRun}` | `{ruleId, dryRun, results[], totalMatched}` | UNAUTHORIZED, FORBIDDEN, NOT_FOUND |

#### Category G: Player Intelligence (7)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| G.1 | GET | `/api/players` | JWT | Query: `limit?, offset?, status?, archetype?, riskTier?, agentId?` | `{players[], total}` | UNAUTHORIZED |
| G.2 | GET | `/api/players/:id` | JWT | — | Full Player 360 object | UNAUTHORIZED, NOT_FOUND |
| G.3 | GET | `/api/players/:id/transactions` | JWT | Query: `type?, limit?, offset?` | `{transactions[], total, deposits, withdrawals, netProfit}` | UNAUTHORIZED, NOT_FOUND |
| G.4 | GET | `/api/players/:id/performance` | JWT | Query: `period?` | `{playerId, period, summary, daily[], bySport[], byMarket[], trends}` | UNAUTHORIZED, NOT_FOUND |
| G.5 | POST | `/api/players/:id/notes` | JWT | `{content, isPrivate?}` | `{id, playerId, content, author, createdAt}` | UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR |
| G.6 | GET | `/api/players/:id/flags` | JWT | — | `{playerId, flags[], openCount, totalCount}` | UNAUTHORIZED, NOT_FOUND |
| G.7 | GET | `/api/players/search` | JWT | Query: `q, limit?, offset?` | `{players[], total}` | UNAUTHORIZED, VALIDATION_ERROR |

#### Category H: Sandbox v1 (6)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| H.1 | GET | `/api/sandbox/v1/scenarios` | JWT | Query: `active?, limit?, offset?` | `{scenarios[], total}` | UNAUTHORIZED |
| H.2 | GET | `/api/sandbox/v1/scenarios/:id` | JWT | — | Scenario detail | UNAUTHORIZED, NOT_FOUND |
| H.3 | POST | `/api/sandbox/v1/scenarios` | JWT | `{name, description, configuration{}}` | `{id, name, status, createdAt}` | UNAUTHORIZED, VALIDATION_ERROR |
| H.4 | POST | `/api/sandbox/v1/scenarios/:id/run` | JWT | `{iterations, duration, randomSeed?}` | `{simulationId, status, iterations, startedAt}` | UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR |
| H.5 | GET | `/api/sandbox/v1/simulations/:id` | JWT | — | Simulation results | UNAUTHORIZED, NOT_FOUND |
| H.6 | DELETE | `/api/sandbox/v1/scenarios/:id` | JWT | — | 204 | UNAUTHORIZED, NOT_FOUND |

#### Category I: Sandbox v2 (7)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| I.1 | GET | `/api/sandbox/v2/scenarios` | JWT | Query: `limit?, offset?, status?` | `{scenarios[], total}` | UNAUTHORIZED |
| I.2 | POST | `/api/sandbox/v2/save` | JWT | `{id?, name, description, configuration{}, rules?}` | `{id, name, version, createdAt}` | UNAUTHORIZED, VALIDATION_ERROR |
| I.3 | POST | `/api/sandbox/v2/ab-test` | JWT | `{name, scenarioA, scenarioB, metric, sampleSize, confidenceLevel, runDuration}` | `{id, name, status, createdAt}` | UNAUTHORIZED, VALIDATION_ERROR, NOT_FOUND |
| I.4 | GET | `/api/sandbox/v2/ab-test/:id` | JWT | — | A/B test results | UNAUTHORIZED, NOT_FOUND |
| I.5 | POST | `/api/sandbox/v2/generate-summaries` | JWT | `{scenarioIds[], options{}}` | `{jobId, status, scenarioCount}` | UNAUTHORIZED, VALIDATION_ERROR, INTERNAL_ERROR |
| I.6 | GET | `/api/sandbox/v2/summaries/:jobId` | JWT | — | `{jobId, status, summaries[], ...}` | UNAUTHORIZED, NOT_FOUND |
| I.7 | DELETE | `/api/sandbox/v2/scenarios/:id` | JWT | — | 204 | UNAUTHORIZED, NOT_FOUND |

#### Category J: Export (1)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| J.1 | GET | `/api/export/:type` | JWT/API | Query: `format?, from?, to?, agentId?, playerId?, columns?` | CSV/JSON/XLSX file | UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR |

#### Category K: Kimi AI (1)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| K.1 | POST | `/api/kimi/chat` | JWT+Admin | `{messages[], model?, temperature?, maxTokens?, stream?}` | `{id, model, choices[], usage}` | UNAUTHORIZED, FORBIDDEN, INTERNAL_ERROR, RATE_LIMITED |

#### Category L: Risk Command Center (19)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| L.1 | POST | `/api/positions/generate` | JWT | `{sport?, eventId?, market?, generateSummary?, includePlayerBreakdown?}` | `{positionId, exposure{}, riskIndicators[], recommendations}` | UNAUTHORIZED, VALIDATION_ERROR |
| L.2 | GET | `/api/positions` | JWT | Query: `sport?, status?, riskLevel?, limit?, offset?` | `{positions[], total, byRiskLevel}` | UNAUTHORIZED |
| L.3 | GET | `/api/positions/:id` | JWT | — | Position detail | UNAUTHORIZED, NOT_FOUND |
| L.4 | DELETE | `/api/positions/:id` | JWT+Admin | — | 204 | UNAUTHORIZED, FORBIDDEN, NOT_FOUND |
| L.5 | GET | `/api/dashboard/metrics` | JWT | — | Dashboard metrics object | UNAUTHORIZED, INTERNAL_ERROR |
| L.6 | GET | `/api/dashboard/alerts` | JWT | Query: `severity?, type?, status?, limit?, offset?` | `{alerts[], total, bySeverity}` | UNAUTHORIZED |
| L.7 | PUT | `/api/dashboard/alerts/:id/acknowledge` | JWT | — | `{id, status, acknowledgedBy, acknowledgedAt}` | UNAUTHORIZED, NOT_FOUND |
| L.8 | PUT | `/api/dashboard/alerts/:id/resolve` | JWT | `{resolution, actionsTaken?}` | `{id, status, resolution, resolvedAt}` | UNAUTHORIZED, NOT_FOUND |
| L.9 | GET | `/api/dashboard/exposure` | JWT | Query: `sport?, eventId?, market?` | `{timestamp, totalExposure, bySport[], byMarket[], trend}` | UNAUTHORIZED |
| L.10 | GET | `/api/dashboard/velocity` | JWT | Query: `period?, sport?` | `{period, metrics{}, hourlyBreakdown[], velocityAlerts[]}` | UNAUTHORIZED |
| L.11 | GET | `/api/risk-flags` | JWT | Query: `playerId?, severity?, status?, type?, limit?, offset?` | `{flags[], total, bySeverity, byType}` | UNAUTHORIZED |
| L.12 | POST | `/api/risk-flags` | JWT+Admin | `{playerId, type, severity, description, context?}` | `{id, playerId, status, createdAt}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR |
| L.13 | PUT | `/api/risk-flags/:id/resolve` | JWT+Admin | `{resolution, tierChange?}` | `{id, status, resolvedAt}` | UNAUTHORIZED, FORBIDDEN, NOT_FOUND |
| L.14 | GET | `/api/wager-violations` | JWT | Query: `playerId?, wagerId?, type?, limit?, offset?` | `{violations[], total, byType}` | UNAUTHORIZED |
| L.15 | GET | `/api/customer-features` | JWT | Query: `playerId?, archetype?, limit?, offset?` | `{features[], total, byArchetype}` | UNAUTHORIZED |
| L.16 | POST | `/api/customer-features/extract` | JWT+Admin | `{playerId, forceReclassify?}` | `{playerId, archetype, confidence, features}` | UNAUTHORIZED, FORBIDDEN, NOT_FOUND |
| L.17 | GET | `/api/stream/live-wagers` | JWT | Query: `sport?, minStake?, playerId?` | SSE: wager, violation events | UNAUTHORIZED |
| L.18 | GET | `/api/stream/alerts` | JWT | Query: `severity?, types?` | SSE: alert, flag events | UNAUTHORIZED |
| L.19 | GET | `/api/stream/positions` | JWT | Query: `sport?` | SSE: position-update, position-new events | UNAUTHORIZED |

#### Category M: Enforcement (8)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| M.1 | POST | `/api/enforcement/apply-limit` | JWT+Admin | `{playerId, limitType, limitValue, reason, duration, notifyPlayer?}` | `{id, playerId, limitType, status, expiresAt}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR, NOT_FOUND |
| M.2 | POST | `/api/enforcement/apply-limit/batch` | JWT+Admin | `{playerIds[], limitType, limitValue, reason, duration}` | `{results[], applied, failed}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR |
| M.3 | DELETE | `/api/enforcement/apply-limit/:id` | JWT+Admin | — | `{id, status, removedAt}` | UNAUTHORIZED, FORBIDDEN, NOT_FOUND |
| M.4 | POST | `/api/enforcement/auto-enforce` | JWT+Admin | `{name, trigger{condition, evaluationWindow}, action{type, params}, cooldown, active}` | `{id, name, status, createdAt}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR |
| M.5 | GET | `/api/enforcement/auto-enforce` | JWT | — | `{rules[], total}` | UNAUTHORIZED |
| M.6 | GET | `/api/enforcement/log` | JWT | Query: `playerId?, enforcementId?, limit?, offset?` | `{entries[], total}` | UNAUTHORIZED |
| M.7 | GET | `/api/enforcement/queue` | JWT | — | `{queue[], total, byStatus}` | UNAUTHORIZED |
| M.8 | POST | `/api/enforcement/queue/:id/process` | JWT+Admin | — | `{id, status, result, processedAt}` | UNAUTHORIZED, FORBIDDEN, NOT_FOUND |

#### Category N: Player Search (3)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| N.1 | GET | `/api/players/search` | JWT | Query: `q, limit?, offset?` | `{query, players[], total}` | UNAUTHORIZED, VALIDATION_ERROR |
| N.2 | GET | `/api/players/search/advanced` | JWT | Query: `login?, displayName?, email?, archetype?, riskTier?, minBalance?, maxBalance?, minWinRate?, maxWinRate?, minWagers?, maxWagers?, agentId?, flagged?, activeSince?, sortBy?, sortOrder?, limit?, offset?` | `{filters, players[], total}` | UNAUTHORIZED, VALIDATION_ERROR |
| N.3 | GET | `/api/players/search/by-performance` | JWT | Query: `minProfit?, maxProfit?, period?, roi?, consistency?, limit?, offset?` | `{period, players[], total, summary}` | UNAUTHORIZED, VALIDATION_ERROR |

#### Category O: Agent Hub (12)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| O.1 | GET | `/api/proxy/agentDownline` | JWT | Query: `agentId?, depth?` | `{agentId, downline[], totalDownlineAgents, totalDownlinePlayers}` | UNAUTHORIZED, NOT_FOUND |
| O.2 | GET | `/api/agent/hierarchy` | JWT | Query: `rootAgentId?, depth?` | `{root{}, totalAgents, maxDepth}` | UNAUTHORIZED |
| O.3 | GET | `/api/agent/billing` | JWT | Query: `agentId?, period?, from?, to?` | `{agentId, billing{}, breakdown{}, payoutStatus}` | UNAUTHORIZED, NOT_FOUND |
| O.4 | GET | `/api/agent/:id/players` | JWT | Query: `status?, limit?, offset?` | `{agentId, players[], total}` | UNAUTHORIZED, NOT_FOUND |
| O.5 | GET | `/api/agent/:id/performance` | JWT | Query: `period?` | `{agentId, metrics{}, daily[], topPlayers[], comparison}` | UNAUTHORIZED, NOT_FOUND |
| O.6 | GET | `/api/agent/sync` | JWT | Query: `agentId?, fullSync?` | `{syncId, status, agentsQueued, startedAt}` | UNAUTHORIZED, BAD_GATEWAY |
| O.7 | GET | `/api/agent/supergroups` | JWT | — | `{supergroups[], total}` | UNAUTHORIZED |
| O.8 | POST | `/api/agent/supergroups` | JWT+Admin | `{name, chatId, botId, topics[]}` | `{id, name, isActive, topics[], createdAt}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR |
| O.9 | GET | `/api/agent/supergroups/:id/topics` | JWT | — | `{supergroupId, topics[]}` | UNAUTHORIZED, NOT_FOUND |
| O.10 | POST | `/api/agent/supergroups/:id/topics` | JWT+Admin | `{purpose, name, iconColor?}` | `{id, purpose, threadId, name, createdAt}` | UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR |
| O.11 | GET | `/api/agent/topics/resolve` | JWT | Query: `agentLogin, purpose` | `{agentLogin, purpose, topicId, threadId, topicName}` | UNAUTHORIZED, NOT_FOUND |
| O.12 | GET | `/api/agent/topics/purposes` | JWT | — | `{purposes[]}` | UNAUTHORIZED |

#### Category P: Benchmark (1)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| P.1 | GET | `/api/benchmark` | JWT/API | Query: `duration?, type?` | `{timestamp, duration, results{database, network, cpu, memory}, summary}` | UNAUTHORIZED, INTERNAL_ERROR |

### 26.3 Partner Profile OS Endpoints (18)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| Q.1 | GET | `/api/partners` | JWT | Query: `status?, templateId?, kycStatus?, limit?, offset?, sort?, order?` | `{partners[], total, byStatus}` | UNAUTHORIZED |
| Q.2 | POST | `/api/partners` | JWT+Admin | `{partnerId, templateId, displayName, email, phone?, overrides?}` | `{partnerId, templateId, status, createdAt, gateway{}}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR, TEMPLATE_NOT_FOUND, DUPLICATE_PARTNER |
| Q.3 | GET | `/api/partners/:id` | JWT | — | Full partner profile | UNAUTHORIZED, PARTNER_NOT_FOUND |
| Q.4 | PUT | `/api/partners/:id` | JWT+Admin | `{displayName?, email?, phone?}` | `{partnerId, updatedAt}` | UNAUTHORIZED, FORBIDDEN, PARTNER_NOT_FOUND, VALIDATION_ERROR |
| Q.5 | DELETE | `/api/partners/:id` | JWT+Admin | — | `{partnerId, status, terminatedAt}` | UNAUTHORIZED, FORBIDDEN, PARTNER_NOT_FOUND |
| Q.6 | POST | `/api/partners/:id/evaluate` | JWT+Admin | `{signalId, bookId, type, suggestedStake, tier, eventId, market, sport, confidence, urgencyMs, ...}` | `{partnerId, signalId, allowed, action, reason?, adjustedStake?, metadata{}}` | UNAUTHORIZED, FORBIDDEN, PARTNER_NOT_FOUND, VALIDATION_ERROR |
| Q.7 | POST | `/api/partners/:id/transition` | JWT+Admin | `{event, reason, guardOverrides?}` | `{partnerId, previousState, currentState, transition, guardChecks[], transitionedAt}` | UNAUTHORIZED, FORBIDDEN, PARTNER_NOT_FOUND, INVALID_TRANSITION, GUARD_CHECK_FAILED |
| Q.8 | GET | `/api/partners/:id/gate-log` | JWT | Query: `action?, limit?, offset?` | `{partnerId, entries[], total, byAction}` | UNAUTHORIZED, PARTNER_NOT_FOUND |
| Q.9 | GET | `/api/partners/:id/lifecycle-log` | JWT | — | `{partnerId, entries[], total, currentState}` | UNAUTHORIZED, PARTNER_NOT_FOUND |
| Q.10 | GET | `/api/partners/:id/settlement` | JWT | — | `{partnerId, commissionStructure, commissionTiers[], currentRate, makeupEnabled, ...}` | UNAUTHORIZED, PARTNER_NOT_FOUND |
| Q.11 | POST | `/api/partners/:id/deposit` | JWT+Admin | `{amount, method, reference?, notes?}` | `{partnerId, depositId, amount, previousBalance, newBalance, totalDeposited, processedAt}` | UNAUTHORIZED, FORBIDDEN, PARTNER_NOT_FOUND, DEPOSIT_FAILED |
| Q.12 | POST | `/api/partners/:id/withdrawal` | JWT+Admin | `{amount, method, reference?}` | `{partnerId, withdrawalId, amount, previousBalance, newBalance, totalWithdrawn, processedAt}` | UNAUTHORIZED, FORBIDDEN, PARTNER_NOT_FOUND, WITHDRAWAL_FAILED |
| Q.13 | POST | `/api/partners/:id/set-market-limit` | JWT+Admin | `{market, limit}` | `{partnerId, market, previousLimit, newLimit, allLimits{}, updatedAt}` | UNAUTHORIZED, FORBIDDEN, PARTNER_NOT_FOUND, VALIDATION_ERROR |
| Q.14 | GET | `/api/partners/:id/sources/health` | JWT | — | `{partnerId, sources[], overall, checkedAt}` | UNAUTHORIZED, PARTNER_NOT_FOUND |
| Q.15 | POST | `/api/signals/route` | JWT | `{signalId, bookId, type, suggestedStake, tier, eventId, market, sport, confidence, urgencyMs, ...}` | `{signalId, routedAt, candidatesEvaluated, results[], summary{}}` | UNAUTHORIZED, VALIDATION_ERROR |
| Q.16 | GET | `/api/signals/gate-results` | JWT | Query: `partnerId?, action?, bookId?, hours?, limit?, offset?` | `{entries[], total, byAction}` | UNAUTHORIZED |
| Q.17 | POST | `/api/signals/evaluate-batch` | JWT | `{partnerId, signals[]}` | `{partnerId, evaluatedAt, results[], totalExposureRecorded}` | UNAUTHORIZED, VALIDATION_ERROR, PARTNER_NOT_FOUND |
| Q.18 | GET | `/api/templates` | JWT | — | `{templates[], total}` | UNAUTHORIZED |
| Q.19 | GET | `/api/templates/:id` | JWT | — | `{templateId, toml, parsed{}, partnerCount}` | UNAUTHORIZED, TEMPLATE_NOT_FOUND |
| Q.20 | POST | `/api/templates/reload` | JWT+Admin | `{templateDir?}` | `{success, templatesLoaded, partnersRefreshed, bookIndexRefreshed, errors[], reloadedAt}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR |
| Q.21 | POST | `/api/templates/validate` | JWT+Admin | `{templateContent}` | `{valid, templateId?, parsed?, errors[], warnings[]}` | UNAUTHORIZED, FORBIDDEN |

### 26.4 Telegram Hub Endpoints (9)

| # | Method | Path | Auth | Body | Response | Errors |
|---|--------|------|------|------|----------|--------|
| R.1 | GET | `/api/health/system-status` | JWT | — | `{status, timestamp, uptimeSeconds, database{}, telegramBots[], queues[], alerts{}}` | UNAUTHORIZED |
| R.2 | GET | `/api/health/ready` | Pub | — | `{ready, timestamp, checks{}}` | — |
| R.3 | GET | `/api/health/live` | Pub | — | `alive` / 503 | — |
| R.4 | POST | `/api/admin/bots/refresh` | JWT+Admin | `{botId?}` | `{ok, botsTriggered[], message, publishedAt}` | UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR |
| R.5 | POST | `/api/admin/bots/restart` | JWT+Admin | `{botId, reason?}` | `{botId, status, scheduledAt}` | UNAUTHORIZED, FORBIDDEN, NOT_FOUND |
| R.6 | GET | `/api/telegram/delivery-stats` | JWT | Query: `hours?, botId?, purpose?` | `{period{}, summary{}, byBot[], byPurpose[], byHour[], topFailures[]}` | UNAUTHORIZED, VALIDATION_ERROR |
| R.7 | GET | `/api/telegram/bot/:botId/stats` | JWT | — | `{botId, running, uptimeMs, messagesDelivered, messagesFailed, streams[], topicsManaged, totalTopics, pendingCount, ...}` | UNAUTHORIZED, NOT_FOUND |
| R.8 | GET | `/api/telegram/bot/:botId/delivery-log` | JWT | Query: `hours?, status?, limit?, offset?` | `{botId, entries[], total, summary{}}` | UNAUTHORIZED, NOT_FOUND |
| R.9 | GET | `/api/telegram/topics/status` | JWT | — | `{supergroups[], summary{totalSupergroups, totalTopics, activeTopics, missingTopics}}` | UNAUTHORIZED |

### 26.5 WebSocket Message Types (8)

| Direction | Type | Description |
|---|---|---|
| Client | `subscribe` | Subscribe to channels |
| Client | `unsubscribe` | Unsubscribe from channels |
| Client | `ping` | Keep-alive ping |
| Client | `get_status` | Request connection status |
| Server | `subscribed` | Subscription confirmation |
| Server | `unsubscribed` | Unsubscription confirmation |
| Server | `pong` | Ping response |
| Server | `status` | Connection status info |
| Server | `wager` | New wager event |
| Server | `alert` | Risk alert event |
| Server | `position_update` | Position update event |
| Server | `odds_move` | Odds movement event |
| Server | `enforcement_action` | Enforcement action event |
| Server | `partner_gate` | Partner gate decision event |
| Server | `system_event` | System event |
| Server | `error` | WebSocket error |

### 26.6 SSE Endpoints (5)

| # | Method | Path | Auth | Events | Description |
|---|--------|------|------|--------|-------------|
| S.1 | GET | `/api/stream/live-wagers` | JWT | `wager`, `violation`, `heartbeat` | Real-time wager feed |
| S.2 | GET | `/api/stream/alerts` | JWT | `alert`, `flag`, `alert-resolved` | Risk alert stream |
| S.3 | GET | `/api/stream/positions` | JWT | `position-update`, `position-new`, `position-expired` | Position updates |
| S.4 | GET | `/api/stream/partner-gates` | JWT | `gate-decision`, `gate-block`, `gate-adjust` | Partner gate decisions |
| S.5 | GET | `/api/stream/system` | JWT | `system-event`, `health-check`, `rate-limit-warning` | System events |

---

### 26.7 Error Code Quick Reference

| Code | HTTP | When to Use |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT/API key |
| `FORBIDDEN` | 403 | Valid auth but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `BAD_REQUEST` | 400 | Malformed request |
| `VALIDATION_ERROR` | 400 | Schema validation failure |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unhandled server error |
| `BAD_GATEWAY` | 502 | Upstream unreachable |
| `GATEWAY_TIMEOUT` | 504 | Upstream timeout |
| `PARTNER_NOT_FOUND` | 404 | Partner ID not found |
| `TEMPLATE_NOT_FOUND` | 404 | Template ID not found |
| `INVALID_TRANSITION` | 400 | Invalid lifecycle transition |
| `GUARD_CHECK_FAILED` | 400 | Lifecycle guard rejected transition |
| `BLACKLISTED_BOOK` | 403 | Book in partner blacklist |
| `KYC_PENDING` | 403 | Partner KYC not verified |
| `INSUFFICIENT_BALANCE` | 400 | Balance below threshold |
| `OPSEC_VIOLATION` | 403 | OpSec score exceeded |
| `MAX_EXPOSURE_EXCEEDED` | 400 | Stake exceeds max per signal |
| `DAILY_LIMIT_EXCEEDED` | 400 | Stake exceeds daily limit |
| `MAX_SOURCES_REACHED` | 400 | Max sources for partner |
| `SOURCE_NOT_FOUND` | 404 | Source ID not in profile |
| `API_ACCESS_DENIED` | 403 | API access not enabled |
| `TELEGRAM_BOT_UNHEALTHY` | 503 | Bot heartbeat stale |
| `QUEUE_OVERFLOW` | 503 | Redis stream overflow |
| `DB_CONNECTION_ERROR` | 500 | Database connection failed |
| `INVALID_TEMPLATE` | 400 | TOML template validation failed |
| `DUPLICATE_PARTNER` | 409 | Partner ID already exists |
| `DEPOSIT_FAILED` | 400 | Deposit validation failed |
| `WITHDRAWAL_FAILED` | 400 | Withdrawal validation failed |

### 26.8 Auth Matrix Quick Reference

| Endpoint Group | Auth Required | Admin Required | Notes |
|---|---|---|---|
| `POST /api/proxy/auth` | None | No | Login endpoint |
| `POST /api/proxy/renewToken` | JWT | No | Token renewal |
| `GET /api/proxy/accountInfo` | JWT | No | Account info |
| `GET/POST /api/vault/*` | JWT | Yes | `X-Admin-Token` required |
| `GET /api/proxy/*` (Buckeye) | JWT or API Key | No | `X-API-Key` header |
| `POST /api/agent/analyze-live` | JWT | No | AI analysis |
| `POST /api/agent/extract-features` | JWT | No | Feature extraction |
| `GET /api/agent/rules` | JWT | No | List rules |
| `POST/DELETE /api/agent/rules` | JWT | Yes | Rule mutations |
| `GET /api/agent/*` (IP) | JWT | No reads / Yes mutations | IP intelligence |
| `GET /api/players/*` | JWT | No | Player data |
| `POST /api/players/:id/notes` | JWT | No | Add notes |
| `GET /api/players/search*` | JWT | No | Search |
| `GET/POST /api/sandbox/*` | JWT | No | Sandbox |
| `GET /api/export/*` | JWT or API Key | No | Export |
| `POST /api/kimi/chat` | JWT | Yes | AI chat |
| `GET /api/dashboard/*` | JWT | No reads / Yes mutations | Dashboard |
| `POST/DELETE /api/positions/*` | JWT | Yes mutations | Positions |
| `GET /api/enforcement/*` | JWT | No reads / Yes mutations | Enforcement |
| `GET /api/proxy/agentDownline` | JWT | No | Agent data |
| `GET /api/agent/*` | JWT | No reads / Yes mutations | Agent hub |
| `POST /api/agent/*` (supergroups) | JWT | Yes | Supergroup mutations |
| `GET /api/benchmark` | JWT or API Key | No | Benchmark |
| `GET /api/partners` | JWT | No | List partners |
| `POST /api/partners` | JWT | Yes | Create partner |
| `GET/PUT/DELETE /api/partners/:id` | JWT(/Admin) | Yes for mutations | Partner CRUD |
| `POST /api/partners/:id/*` | JWT | Yes | Partner mutations |
| `POST /api/signals/*` | JWT | No | Signal routing |
| `GET /api/signals/*` | JWT | No | Signal reads |
| `GET /api/templates` | JWT | No | List templates |
| `POST /api/templates/*` | JWT | Yes | Template mutations |
| `GET /api/health/*` | JWT or Pub | No | Health checks |
| `POST /api/admin/*` | JWT | Yes | Admin only |
| `GET /api/telegram/*` | JWT | No | Telegram stats |
| `WS /ws` | JWT (query param) | No | WebSocket |
| `SSE /api/stream/*` | JWT (query/header) | No | SSE streams |

---

### 26.9 Database Tables Reference

| Domain | Tables | Count |
|---|---|---|
| Live Data | `buckeye_sessions`, `raw_players`, `raw_wagers`, `raw_agent_performance`, `tokens`, `request_log` | 6 |
| Risk | `customer_features`, `ai_risk_flags`, `risk_positions`, `enforcement_queue`, `limit_enforcement_log`, `wager_violations` | 6 |
| IP Surveillance | `ip_tracking`, `ip_denylist`, `ip_flags`, `ip_reputation_log` | 4 |
| Sandbox | `sandbox_scenarios_v2`, `sandbox_customers`, `sandbox_snapshots`, `sandbox_ab_tests_v2`, `sandbox_summary_queue_v2` | 5 |
| Webhooks | `webhook_configs`, `alert_log`, `webhook_delivery_log` | 3 |
| Rules | `rules` | 1 |
| Partner OS | `partner_profiles`, `partner_sources`, `partner_cultivation`, `partner_settlement`, `partner_telegram_topics`, `partner_gates`, `partner_runtime_state`, `partner_lifecycle_log`, `partner_gate_log`, `partner_settlement_log` | 10 |
| Telegram Hub | `bot_heartbeat`, `telegram_dispatch_log`, `agent_supergroups`, `agent_supergroup_topics` | 4 |
| Agent | `agent_hierarchy`, `player_agent_map`, `agent_supergroups`, `agent_supergroup_topics` | 4 |
| Protected (never drop) | `wagers`, `bet_actions`, `telegram_topics`, `telegram_channels`, `telegram_messages`, `log_snapshots` | 6 |
| **Total** | | **~50 tables** |

### 26.10 Cron Jobs Reference

| Cron Expression | Job | Description | Output Tables |
|---|---|---|---|
| `*/2 * * * *` | Queue Processor | Process pending AI summaries | `sandbox_summary_queue_v2` |
| `*/5 * * * *` | Wager Refresh | Fetch new wagers from Buckeye | `raw_wagers` |
| `*/10 * * * *` | Feature Extraction | Run `classifyArchetype()` | `customer_features` |
| `*/15 * * * *` | Player Refresh | Fetch player roster | `raw_players` |
| `0 * * * *` | Position Expiry | Expire stale risk positions | `risk_positions` |
| `0 * * * *` | Sandbox Janitor | Cleanup old sandbox data | `sandbox_*` |
| `0 3 * * *` | Alert Cleanup | Purge alerts > 90 days | `alert_log` |
| `*/15 * * * *` | IP Surveillance | Auto-flag shared IPs | `ip_tracking`, `ip_flags` |
| `0 0 * * *` | Daily Exposure Reset | Reset partner dailyUsed to 0 | `partner_profiles` |

### 26.11 Environment Variables Reference

| Variable | Required | Default | Used By |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | Auth (HS256) |
| `IDLE_TIMEOUT_MS` | No | 300000 | WebSocket idle timeout |
| `DEV_BYPASS_JWT` | No | false | Dev auth bypass |
| `ADMIN_API_TOKEN` | No | — | Admin mutations |
| `PROXY_INTERNAL_URL` | No | `http://localhost:3001` | Proxy bridge |
| `PROXY_API_KEY` | No | — | `X-API-Key` header |
| `REDIS_URL` | No | — | Telegram Hub queues |
| `TELEGRAM_BOT_TOKEN` | No | — | Telegram Bot API |
| `ENABLE_ANALYTICS` | No | false | Analytics endpoints |
| `ENABLE_RISK_ENGINE` | No | false | Risk engine |
| `KIMI_API_KEY` | No | — | Kimi AI |
| `DB_PATH` | No | — | SQLite database path |
| `TEMPLATE_DIR` | No | `./profiles` | Partner template directory |

---

*End of API Contract v5.2.0*

*This document is the authoritative specification for all Sports Terminal OS API endpoints. Implementation agents must follow this contract precisely for method, path, auth, request/response shapes, and error codes.*

