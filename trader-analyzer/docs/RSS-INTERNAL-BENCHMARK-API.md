# RSS_INTERNAL.benchmark_api Documentation

**Version**: 1.3.3  
**Status**: ✅ **INTEGRATED** - Production Ready  
**Last Updated**: 2025-12-08

---

## Overview

`RSS_INTERNAL.benchmark_api` is an internal RSS feed endpoint constant used for refreshing RSS feed cache after publishing benchmark results, audit reports, and other team-related content. It serves as a fallback endpoint when `RSS_INTERNAL.registry_api` is unavailable.

---

## Definition

**Location**: `src/utils/rss-constants.ts`

```typescript
export const RSS_INTERNAL = {
  // ... other constants ...
  /**
   * Benchmark API endpoint for RSS feed cache refresh
   * Fallback endpoint when registry_api is unavailable
   * Used for benchmark-specific RSS feed cache refresh operations
   * 
   * Endpoint selection priority:
   * 1. RSS_INTERNAL.registry_api (primary)
   * 2. RSS_INTERNAL.benchmark_api (fallback)
   */
  benchmark_api: "https://npm.internal.yourcompany.com/api/rss/benchmarks",
  // ... other constants ...
} as const;
```

---

## Endpoint Selection Logic

The system uses a fallback pattern for endpoint selection:

```typescript
const endpoint = RSS_INTERNAL.registry_api || RSS_INTERNAL.benchmark_api;
```

**Priority**:
1. **Primary**: `RSS_INTERNAL.registry_api` - Registry API endpoint
2. **Fallback**: `RSS_INTERNAL.benchmark_api` - Benchmark API endpoint

---

## Usage

### Centralized Utility Function

**Location**: `src/utils/rss-cache-refresh.ts`

```typescript
import { refreshRSSCache } from '../src/utils/rss-cache-refresh';

// Refresh cache for a team
await refreshRSSCache({ team: 'platform_tools' });

// Refresh cache for a package
await refreshRSSCache({ package: '@graph/layer4' });
```

### Direct Usage (Legacy)

```typescript
import { RSS_INTERNAL } from '../src/utils/rss-constants';

const endpoint = RSS_INTERNAL.registry_api || RSS_INTERNAL.benchmark_api;
await fetch(`${endpoint}/refresh`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.REGISTRY_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ team: teamId }),
});
```

---

## Integration Points

### 1. Audit Results Publisher

**File**: `scripts/publish-audit-to-rss.ts`

```typescript
// After publishing audit results to database
const refreshResult = await refreshRSSCache({ team: teamId });
if (refreshResult.success) {
  console.log(`🔄 RSS feed cache refreshed via ${refreshResult.endpoint}`);
}
```

**Implementation Pattern**: `BP-RSS-INTEGRATOR@1.0.0` - RSS cache refresh pattern

---

### 2. Benchmark Publisher

**File**: `scripts/benchmark-publisher.ts`

```typescript
// After publishing benchmark results
const refreshResult = await refreshRSSCache({ package: packageName });
if (refreshResult.success) {
  console.log(`🔄 RSS feed cache refreshed via ${refreshResult.endpoint}`);
}
```

**Implementation Pattern**: `BP-RSS-INTEGRATOR@1.0.0` - RSS cache refresh pattern

---

## Cache Refresh Endpoint

### Endpoint

```
POST {RSS_INTERNAL.benchmark_api}/refresh
```

### Request Headers

```
Authorization: Bearer {REGISTRY_API_TOKEN}
Content-Type: application/json
```

### Request Body

```json
{
  "team": "platform_tools"  // Optional: team ID
}
```

OR

```json
{
  "package": "@graph/layer4"  // Optional: package name
}
```

### Response

- **200 OK**: Cache refreshed successfully
- **401 Unauthorized**: Invalid or missing API token
- **500 Internal Server Error**: Server error during cache refresh

---

## Features

### 1. Circuit Breaker Protection

Prevents cascading failures when the RSS cache refresh endpoint is down:

- **Failure Threshold**: 3 failures
- **Reset Timeout**: 30 seconds
- **Half-Open Attempts**: 2 attempts

**Implementation**: `BP-CIRCUIT-BREAKER@0.1.0`

---

### 2. Retry Logic with Exponential Backoff

Automatic retry on transient failures:

- **Max Attempts**: 3 (configurable)
- **Initial Delay**: 500ms
- **Max Delay**: 5000ms
- **Backoff Multiplier**: 2x
- **Retryable Errors**: 408, 429, 500, 502, 503, 504

**Implementation**: `BP-ENTERPRISE-RETRY@0.1.0`

---

### 3. Timeout Protection

- **Default Timeout**: 10 seconds
- **Configurable**: Via `timeoutMs` option
- **Uses**: `AbortSignal.timeout()` for efficient timeout handling

---

## Error Handling

The `refreshRSSCache` utility provides graceful error handling:

```typescript
const result = await refreshRSSCache({ team: 'platform_tools' });

if (result.success) {
  console.log(`✅ Cache refreshed via ${result.endpoint}`);
} else {
  console.warn(`⚠️  Cache refresh failed: ${result.error}`);
}
```

**Error Scenarios**:
- No endpoint configured
- Missing `REGISTRY_API_TOKEN`
- Circuit breaker is open
- Network/timeout errors
- Server errors (5xx)

---

## Configuration

### Environment Variables

```bash
# Required for cache refresh
REGISTRY_API_TOKEN=your-api-token-here
```

### Constants

```typescript
// Primary endpoint
RSS_INTERNAL.registry_api = "https://npm.internal.yourcompany.com/api/rss"

// Fallback endpoint
RSS_INTERNAL.benchmark_api = "https://npm.internal.yourcompany.com/api/rss/benchmarks"
```

---

## Examples

### Example 1: Refresh Cache After Audit

```typescript
import { refreshRSSCache } from '../src/utils/rss-cache-refresh';

// After publishing audit results
await refreshRSSCache({ team: 'platform_tools' });
```

### Example 2: Refresh Cache After Benchmark

```typescript
import { refreshRSSCache } from '../src/utils/rss-cache-refresh';

// After publishing benchmark results
await refreshRSSCache({ package: '@graph/layer4' });
```

### Example 3: Custom Retry Options

```typescript
import { refreshRSSCache } from '../src/utils/rss-cache-refresh';

await refreshRSSCache({
  team: 'sports_correlation',
  retryOptions: {
    maxAttempts: 5,
    initialDelayMs: 1000,
  },
  timeoutMs: 15000,
});
```

### Example 4: Check Circuit Breaker State

```typescript
import { 
  getCacheRefreshCircuitBreakerState,
  resetCacheRefreshCircuitBreaker 
} from '../src/utils/rss-cache-refresh';

// Check state
const state = getCacheRefreshCircuitBreakerState();
console.log(`Circuit breaker state: ${state}`);

// Reset if needed
if (state === 'open') {
  resetCacheRefreshCircuitBreaker();
}
```

---

## Related Documentation

- [`src/utils/rss-cache-refresh.ts`](../src/utils/rss-cache-refresh.ts) - Centralized cache refresh utility
- [`src/utils/rss-constants.ts`](../src/utils/rss-constants.ts) - RSS constants definition
- [`docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md`](./TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md) - Implementation patterns
- [`docs/TEAM-ORGANIZATION-VERIFICATION-TEST-RESULTS.md`](./TEAM-ORGANIZATION-VERIFICATION-TEST-RESULTS.md) - Test results

---

## Implementation Patterns

| Pattern | Implementation | Source Blueprint |
|---------|---------------|-----------------|
| **RSS cache refresh** | `refreshRSSCache()` utility | `BP-RSS-INTEGRATOR@1.0.0` |
| **Circuit breaker** | `CircuitBreaker` class | `BP-CIRCUIT-BREAKER@0.1.0` |
| **Retry logic** | `retryWithBackoff()` function | `BP-ENTERPRISE-RETRY@0.1.0` |
| **Fallback endpoint** | `registry_api \|\| benchmark_api` | `BP-RSS-CONSTANTS@1.0.0` |

---

## Best Practices

1. **Always use the centralized utility**: Use `refreshRSSCache()` instead of direct fetch calls
2. **Handle errors gracefully**: Check `result.success` and log warnings for failures
3. **Monitor circuit breaker state**: Use `getCacheRefreshCircuitBreakerState()` for observability
4. **Configure timeouts appropriately**: Adjust `timeoutMs` based on network conditions
5. **Set environment variables**: Ensure `REGISTRY_API_TOKEN` is configured

---

**Author**: NEXUS Team  
**Version**: Bun v1.3.3+  
**Last Updated**: 2025-12-08



