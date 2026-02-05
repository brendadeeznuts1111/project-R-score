# Constants & Variables Reference

**Comprehensive reference for all constants, variables, and headers used in NEXUS Trading Platform**

---

## Table of Contents

1. [HTTP Headers](#http-headers)
2. [API Constants](#api-constants)
3. [Environment Variables](#environment-variables)
4. [Secrets Keys](#secrets-keys)
5. [File Paths](#file-paths)
6. [HTTP Status Codes](#http-status-codes)
7. [Error Categories](#error-categories)
8. [Cache Keys](#cache-keys)
9. [Time Constants](#time-constants)
10. [Regex Patterns](#regex-patterns)
11. [Query Parameters](#query-parameters)
12. [URL Parameter Utilities](#url-parameter-utilities)

---

## HTTP Headers

### Header Names

**Location:** `src/api/headers.ts`

```typescript
HEADER_NAMES = {
  // Request Headers
  CONTENT_TYPE: "Content-Type",
  AUTHORIZATION: "Authorization",
  REQUEST_ID: "X-Request-ID",
  IF_NONE_MATCH: "If-None-Match",
  IF_MODIFIED_SINCE: "If-Modified-Since",
  ACCEPT: "Accept",
  ACCEPT_ENCODING: "Accept-Encoding",
  USER_AGENT: "User-Agent",
  
  // Response Headers
  API_VERSION: "X-API-Version",
  RESPONSE_TIME: "X-Response-Time",
  CACHE: "X-Cache",
  CACHE_HIT_RATE: "X-Cache-Hit-Rate",
  LOG_COUNT: "X-Log-Count",
  METRICS_TYPE: "X-Metrics-Type",
  REQUEST_ID_ECHO: "X-Request-ID",
  ETAG: "ETag",
  CACHE_CONTROL: "Cache-Control",
  CONTENT_ENCODING: "Content-Encoding",
  CONTENT_DISPOSITION: "Content-Disposition",
  LAST_MODIFIED: "Last-Modified",
  
  // Security Headers
  X_CONTENT_TYPE_OPTIONS: "X-Content-Type-Options",
  X_FRAME_OPTIONS: "X-Frame-Options",
  X_XSS_PROTECTION: "X-XSS-Protection",
  STRICT_TRANSPORT_SECURITY: "Strict-Transport-Security",
  CONTENT_SECURITY_POLICY: "Content-Security-Policy",
  REFERRER_POLICY: "Referrer-Policy",
  PERMISSIONS_POLICY: "Permissions-Policy",
}
```

### Header Values

```typescript
HEADER_VALUES = {
  CONTENT_TYPE: {
    JSON: "application/json",
    TEXT: "text/plain",
    HTML: "text/html",
    XML: "application/xml",
    CSV: "text/csv",
    OCTET_STREAM: "application/octet-stream",
    GZIP: "application/gzip",
    ZSTD: "application/zstd",
  },
  
  CACHE_CONTROL: {
    NO_CACHE: "no-cache",
    NO_STORE: "no-store",
    PUBLIC: "public, max-age=3600",
    PRIVATE: "private, max-age=300",
    IMMUTABLE: "public, max-age=31536000, immutable",
  },
  
  X_CONTENT_TYPE_OPTIONS: "nosniff",
  X_FRAME_OPTIONS: "DENY",
  X_XSS_PROTECTION: "1; mode=block",
  STRICT_TRANSPORT_SECURITY: "max-age=31536000; includeSubDomains",
  REFERRER_POLICY: "strict-origin-when-cross-origin",
}
```

### Default Response Headers

All API responses include these headers by default:

```typescript
DEFAULT_RESPONSE_HEADERS = {
  "X-API-Version": "0.1.15",
  "Cache-Control": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
}
```

### Security Headers

Production security headers:

```typescript
SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}
```

---

## API Constants

**Location:** `src/constants/index.ts`

```typescript
API_CONSTANTS = {
  VERSION: "0.1.15",
  NAME: "NEXUS Trading Platform",
  DESCRIPTION: "Unified Trading Intelligence Platform",
  
  // Ports
  DEFAULT_PORT: 3000,
  DEFAULT_WS_PORT: 3002,
  
  // Timeouts
  DEFAULT_TIMEOUT: 3000,
  LONG_TIMEOUT: 10000,
  
  // Limits
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_LOG_LIMIT: 500,
  DEFAULT_LOG_LIMIT: 50,
  
  // Cache
  DEFAULT_CACHE_TTL: 300, // 5 minutes
  MAX_CACHE_ENTRIES: 10000,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 500,
}
```

---

## Environment Variables

**Location:** `src/constants/index.ts`

```typescript
ENV_VARS = {
  // Server
  PORT: "PORT",
  WS_PORT: "WS_PORT",
  NODE_ENV: "NODE_ENV",
  
  // Telegram
  TELEGRAM_BOT_TOKEN: "TELEGRAM_BOT_TOKEN",
  TELEGRAM_CHAT_ID: "TELEGRAM_CHAT_ID",
  TELEGRAM_SUPERGROUP_ID: "TELEGRAM_SUPERGROUP_ID",
  TELEGRAM_LIVE_TOPIC_ID: "TELEGRAM_LIVE_TOPIC_ID",
  TELEGRAM_LOG_DIR: "TELEGRAM_LOG_DIR",
  
  // API
  API_URL: "API_URL",
  API_KEY: "API_KEY",
  
  // Database
  DATABASE_URL: "DATABASE_URL",
  
  // Security
  SECURITY_MONITOR_ENABLED: "BUN_SECURITY_MONITOR_ENABLED",
  PAGERDUTY_KEY: "BUN_PAGERDUTY_KEY",
  AUDIT_LOG_LEVEL: "BUN_AUDIT_LOG_LEVEL",
  
  // Feature Flags
  URL_SANITIZE: "BUN_URL_SANITIZE",
  ANOMALY_DETECTION: "BUN_ANOMALY_DETECTION",
  CORRECT_HISTORICAL: "BUN_CORRECT_HISTORICAL",
}
```

---

## Secrets Keys

**Location:** `src/constants/index.ts`

```typescript
SECRETS_KEYS = {
  TELEGRAM_BOT_TOKEN: "TELEGRAM_BOT_TOKEN",
  TELEGRAM_CHAT_ID: "TELEGRAM_CHAT_ID",
  TELEGRAM_SUPERGROUP_ID: "TELEGRAM_SUPERGROUP_ID",
  TELEGRAM_LIVE_TOPIC_ID: "TELEGRAM_LIVE_TOPIC_ID",
  API_KEY: "API_KEY",
  PAGERDUTY_KEY: "PAGERDUTY_KEY",
}
```

**Usage:**

```typescript
import { getSecret } from "./constants";

const botToken = getSecret(SECRETS_KEYS.TELEGRAM_BOT_TOKEN);
```

---

## File Paths

**Location:** `src/constants/index.ts`

```typescript
FILE_PATHS = {
  // Data directories
  DATA_DIR: "data",
  STREAMS_DIR: "data/streams",
  TELEGRAM_LOGS_DIR: "data/telegram-logs",
  SECURITY_DIR: "data/security",
  RESEARCH_DIR: "data/research",
  FORENSIC_DIR: "data/forensic",
  COMPLIANCE_DIR: "data/compliance",
  
  // Databases
  PIPELINE_DB: "data/pipeline.sqlite",
  RBAC_DB: "data/rbac.sqlite",
  PROPERTIES_DB: "data/properties.sqlite",
  SOURCES_DB: "data/sources.sqlite",
  FEATURES_DB: "data/features.sqlite",
  SECURITY_DB: "data/security.db",
  COMPLIANCE_DB: "data/compliance-audit.db",
  RESEARCH_DB: "data/research.db",
  
  // Logs
  TELEGRAM_LOG_PATTERN: "data/telegram-logs/telegram-{date}.jsonl",
}
```

---

## HTTP Status Codes

**Location:** `src/constants/index.ts`

```typescript
HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
}
```

**Usage:**

```typescript
import { HTTP_STATUS } from "./constants";

return c.json({ error: "Not found" }, HTTP_STATUS.NOT_FOUND);
```

---

## Error Categories

**Location:** `src/constants/index.ts`

```typescript
ERROR_CATEGORIES = {
  VALIDATION: "validation",
  NETWORK: "network",
  AUTHENTICATION: "authentication",
  AUTHORIZATION: "authorization",
  NOT_FOUND: "not_found",
  RATE_LIMIT: "rate_limit",
  INTERNAL: "internal",
  DATABASE: "database",
  EXTERNAL_API: "external_api",
}
```

---

## Cache Keys

**Location:** `src/constants/index.ts`

```typescript
CACHE_KEYS = {
  ANALYTICS_PATTERNS: "analytics:patterns",
  ANALYTICS_TRENDS: "analytics:trends",
  STREAMS_LIST: "streams:list",
  ARBITRAGE_STATUS: "arbitrage:status",
  ORCA_STATS: "orca:stats",
  SHARP_BOOKS: "sharp-books:all",
}
```

---

## Time Constants

**Location:** `src/constants/index.ts`

```typescript
TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
}
```

**Usage:**

```typescript
import { TIME_CONSTANTS } from "./constants";

setTimeout(() => {
  // Do something
}, TIME_CONSTANTS.MINUTE);
```

---

## Regex Patterns

**Location:** `src/constants/index.ts`

```typescript
REGEX_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
}
```

**Usage:**

```typescript
import { REGEX_PATTERNS } from "./constants";

if (REGEX_PATTERNS.UUID.test(id)) {
  // Valid UUID
}
```

---

## Query Parameters

**Location:** `src/constants/index.ts`

Standardized query parameter names used across NEXUS API endpoints.

### Query Parameter Names

```typescript
QUERY_PARAMS = {
  // Pagination
  PAGE: "page",
  LIMIT: "limit",
  OFFSET: "offset",
  
  // Filtering
  LEVEL: "level",
  SOURCE: "source",
  SEARCH: "search",
  SYMBOL: "symbol",
  CATEGORY: "category",
  STATUS: "status",
  
  // Date Ranges
  FROM: "from",
  TO: "to",
  START_DATE: "startDate",
  END_DATE: "endDate",
  
  // File Operations
  FILE: "file",
  
  // Arbitrage
  MIN_SPREAD: "minSpread",
  MIN_EV: "minEv",
  ARBITRAGE_ONLY: "arbitrageOnly",
  
  // Sorting
  SORT: "sort",
  ORDER: "order",
  
  // Cache Control
  NO_CACHE: "noCache",
  REFRESH: "refresh",
}
```

### Query Parameter Defaults

```typescript
QUERY_DEFAULTS = {
  PAGE: 1,
  LIMIT: 100,  // API_CONSTANTS.DEFAULT_PAGE_SIZE
  MAX_LIMIT: 500,  // API_CONSTANTS.MAX_PAGE_SIZE
  MIN_SPREAD: 0,
  MIN_EV: 0,
}
```

**Usage:**

```typescript
import { QUERY_PARAMS, QUERY_DEFAULTS } from "./constants";

// In API route
const page = parseInt(c.req.query(QUERY_PARAMS.PAGE) || String(QUERY_DEFAULTS.PAGE));
const limit = parseInt(c.req.query(QUERY_PARAMS.LIMIT) || String(QUERY_DEFAULTS.LIMIT));
```

---

## URL Parameter Utilities

**Location:** `src/api/url-params.ts`

Bun-native URL parameter parsing utilities using canonical `URLSearchParams` API.

### Core Functions

#### `parseQueryParams(url: string): URLSearchParams`

Parse query parameters from URL string using Bun's canonical URLSearchParams.

```typescript
import { parseQueryParams } from "./api/url-params";

const params = parseQueryParams("https://api.example.com/trades?symbol=BTC&limit=10");
const symbol = params.get("symbol"); // "BTC"
```

#### `getIntParam(params, key, defaultValue, min?, max?): number`

Get integer query parameter with default and bounds validation.

```typescript
import { parseQueryParams, getIntParam } from "./api/url-params";
import { QUERY_PARAMS, QUERY_DEFAULTS } from "./constants";

const params = parseQueryParams(req.url);
const limit = getIntParam(params, QUERY_PARAMS.LIMIT, QUERY_DEFAULTS.LIMIT, 1, 500);
```

#### `getStringParam(params, key, defaultValue?, allowedValues?): string | undefined`

Get string query parameter with optional validation against allowed values.

```typescript
const level = getStringParam(params, QUERY_PARAMS.LEVEL, undefined, ["error", "warn", "info"] as const);
```

#### `getBoolParam(params, key, defaultValue?): boolean`

Get boolean query parameter (accepts "true", "1", "yes").

```typescript
const arbitrageOnly = getBoolParam(params, QUERY_PARAMS.ARBITRAGE_ONLY, false);
```

#### `getDateParam(params, key, defaultValue?): string | undefined`

Get date query parameter (ISO 8601 format validation).

```typescript
const from = getDateParam(params, QUERY_PARAMS.FROM);
```

#### `parsePaginationParams(params): { page: number; limit: number }`

Parse pagination parameters with defaults.

```typescript
import { parseQueryParams, parsePaginationParams } from "./api/url-params";

const params = parseQueryFromRequest(c.req.url);
const { page, limit } = parsePaginationParams(params);
```

#### `parseDateRangeParams(params): { from?: string; to?: string }`

Parse date range parameters.

```typescript
const { from, to } = parseDateRangeParams(params);
```

#### `detectUrlAnomalies(url): { hasEntities, entityTypes, paramCount, threatLevel }`

Detect HTML entity encoding anomalies in URL parameters. Bun's URLSearchParams parses HTML entities (`&amp;`, `&#x26;`, `&#38;`) as parameter separators, which can be a security concern.

```typescript
import { detectUrlAnomalies } from "./api/url-params";

const anomalies = detectUrlAnomalies("?team=NE&amp;spread=-3");
// Returns: { hasEntities: true, entityTypes: ["amp"], paramCount: 2, threatLevel: "low" }
```

### Bun URLSearchParams Cross-Reference

**Bun Documentation:** https://bun.com/reference/globals/URLSearchParams

All URL parameter utilities use Bun's native `URLSearchParams` API, ensuring:
- Consistent behavior with Bun runtime
- Proper handling of HTML entity edge cases
- Type-safe parameter extraction
- Built-in validation and bounds checking

### Example: Complete API Route

```typescript
import { parseQueryFromRequest, getIntParam, getStringParam, parseDateRangeParams } from "./api/url-params";
import { QUERY_PARAMS, QUERY_DEFAULTS, API_CONSTANTS } from "./constants";

api.get("/api/logs", async (c) => {
  const params = parseQueryFromRequest(c.req.url);
  
  const level = getStringParam(params, QUERY_PARAMS.LEVEL, undefined, ["error", "warn", "info", "debug"] as const);
  const source = getStringParam(params, QUERY_PARAMS.SOURCE);
  const search = getStringParam(params, QUERY_PARAMS.SEARCH);
  const limit = getIntParam(params, QUERY_PARAMS.LIMIT, API_CONSTANTS.DEFAULT_LOG_LIMIT, 1, API_CONSTANTS.MAX_LOG_LIMIT);
  
  // ... rest of handler
});
```

---

## Helper Functions

### Environment Variables

```typescript
import { getEnv, getRequiredEnv, getSecret } from "./constants";

// Get with fallback
const port = getEnv(ENV_VARS.PORT, "3000");

// Get required (throws if missing)
const token = getRequiredEnv(ENV_VARS.TELEGRAM_BOT_TOKEN);

// Get from Bun.secrets with env fallback
const secret = getSecret(SECRETS_KEYS.API_KEY);
```

### Port Configuration

```typescript
import { getPort, getWSPort } from "./constants";

const apiPort = getPort(); // Default: 3000
const wsPort = getWSPort(); // Default: 3002
```

### Environment Detection

```typescript
import { isProduction, isDevelopment } from "./constants";

if (isProduction()) {
  // Production-specific code
}

if (isDevelopment()) {
  // Development-specific code
}
```

---

## Header Utilities

**Location:** `src/api/headers.ts`

### Create Response Headers

```typescript
import { createResponseHeaders, addResponseTimeHeader } from "./api/headers";

const headers = createResponseHeaders({
  "Content-Type": "application/json",
});

addResponseTimeHeader(headers, startTime);
```

### Cache Headers

```typescript
import { addCacheHeaders } from "./api/headers";

addCacheHeaders(headers, hitRate, isHit);
```

### Request ID

```typescript
import { getRequestId, echoRequestId } from "./api/headers";

const requestId = getRequestId(request.headers);
echoRequestId(responseHeaders, requestId);
```

---

## Export Summary

### Headers Module

```typescript
export {
  HEADER_NAMES,
  HEADER_VALUES,
  API_VERSION,
  DEFAULT_RESPONSE_HEADERS,
  SECURITY_HEADERS,
  HEADERS_CONSTANTS,
  createResponseHeaders,
  addResponseTimeHeader,
  addCacheHeaders,
  addETagHeader,
  echoRequestId,
  getRequestId,
  getContentType,
  acceptsJSON,
};
```

### Constants Module

```typescript
export {
  API_CONSTANTS,
  ENV_VARS,
  SECRETS_KEYS,
  FILE_PATHS,
  HTTP_STATUS,
  ERROR_CATEGORIES,
  CACHE_KEYS,
  TIME_CONSTANTS,
  REGEX_PATTERNS,
  CONSTANTS,
  getEnv,
  getRequiredEnv,
  getSecret,
  getPort,
  getWSPort,
  isProduction,
  isDevelopment,
};
```

---

## Best Practices

1. **Always use constants** instead of magic strings/numbers
2. **Import from centralized modules** (`src/api/headers.ts`, `src/constants/index.ts`)
3. **Use helper functions** for environment variables and secrets
4. **Follow naming conventions** (UPPER_SNAKE_CASE for constants)
5. **Document new constants** in this reference

---

## Related Documentation

- [Development Workflow](./DEVELOPMENT-WORKFLOW.md) - Environment setup and configuration
- [API Documentation](./API.md) - API endpoint documentation
- [Security Architecture](./SECURITY-ARCHITECTURE.md) - Security headers and configuration
