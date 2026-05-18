# API Rate Limits Guide

## Overview

This guide covers API rate limiting configuration, monitoring, and optimization
for the Fire22 Dashboard Worker system.

## Rate Limiting Architecture

### Multi-Layer Rate Limiting

```text
┌─────────────────────────────────────────────────────────────────┐
│                    RATE LIMITING LAYERS                        │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Global Rate Limit    │  Layer 2: Per-IP Rate Limit   │
│  ┌─────────────────────────┐   │  ┌───────────────────────────┐ │
│  │ 10,000 req/hour        │   │  │ 1,000 req/hour per IP    │ │
│  │ All endpoints          │───┼──│ Sliding window            │ │
│  │ Circuit breaker        │   │  │ IP-based tracking        │ │
│  └─────────────────────────┘   │  └───────────────────────────┘ │
│            │                   │              │                 │
│  Layer 3: Endpoint-Specific    │  Layer 4: User-Based         │
│  ┌─────────────────────────┐   │  ┌───────────────────────────┐ │
│  │ Different limits per    │   │  │ JWT-based rate limiting   │ │
│  │ endpoint type          │───┼──│ User tiers & quotas       │ │
│  │ Authentication required │   │  │ Premium vs free users     │ │
│  └─────────────────────────┘   │  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Rate Limit Configuration

### Default Limits

```typescript
// Rate limiting configuration
export const rateLimitConfig = {
  // Global rate limits
  global: {
    requests: 10000,
    window: 3600000, // 1 hour in milliseconds
    burst: 100, // Burst allowance
  },

  // Per-IP rate limits
  perIP: {
    requests: 1000,
    window: 3600000, // 1 hour
    burst: 50,
    blockDuration: 300000, // 5 minutes block
  },

  // Endpoint-specific limits
  endpoints: {
    '/api/auth/login': {
      requests: 5,
      window: 900000, // 15 minutes
      burst: 2,
    },
    '/api/fire22/*': {
      requests: 500,
      window: 3600000, // 1 hour
      burst: 20,
    },
    '/api/Manager/*': {
      requests: 200,
      window: 3600000, // 1 hour
      burst: 10,
    },
    '/api/live': {
      requests: 1000,
      window: 3600000, // 1 hour (SSE endpoint)
      burst: 1, // Single connection
    },
  },

  // User tier limits
  userTiers: {
    free: {
      requests: 100,
      window: 3600000, // 1 hour
    },
    premium: {
      requests: 1000,
      window: 3600000, // 1 hour
    },
    enterprise: {
      requests: 10000,
      window: 3600000, // 1 hour
    },
  },
};
```

### Advanced Configuration

```typescript
// Production rate limiting with Redis/KV backend
class AdvancedRateLimiter {
  constructor(private kv: KVNamespace) {}

  async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.window;

    // Get current usage from KV
    const usage = (await this.kv.get(`rate_limit:${key}`, {
      type: 'json',
    })) || {
      requests: [],
      blocked: false,
      blockExpires: 0,
    };

    // Check if currently blocked
    if (usage.blocked && now < usage.blockExpires) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: usage.blockExpires,
        retryAfter: Math.ceil((usage.blockExpires - now) / 1000),
      };
    }

    // Filter requests within current window
    usage.requests = usage.requests.filter(
      (timestamp: number) => timestamp > windowStart
    );

    // Check if limit exceeded
    if (usage.requests.length >= config.requests) {
      // Block the client
      usage.blocked = true;
      usage.blockExpires = now + (config.blockDuration || 300000); // 5 min default

      await this.kv.put(`rate_limit:${key}`, JSON.stringify(usage), {
        expirationTtl: Math.ceil(config.window / 1000) + 300, // Window + 5 min buffer
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + config.window,
        retryAfter: Math.ceil((usage.blockExpires - now) / 1000),
      };
    }

    // Add current request
    usage.requests.push(now);
    usage.blocked = false;

    await this.kv.put(`rate_limit:${key}`, JSON.stringify(usage), {
      expirationTtl: Math.ceil(config.window / 1000) + 300,
    });

    return {
      allowed: true,
      remaining: config.requests - usage.requests.length,
      resetTime: windowStart + config.window,
      retryAfter: 0,
    };
  }
}
```

## Error Code E3002: Rate Limit Exceeded

### Error Details

- **Code**: E3002
- **Message**: "Rate limit exceeded - docs"
- **Severity**: WARNING
- **Category**: API

### When This Error Occurs

```log
[2025-08-27 20:22:49] [ERROR] [API] [v2.0.0] [E3002][WARNING]Rate limit exceeded - docs
```

### Immediate Response Actions

1. **Identify the Source**

```typescript
// Rate limit violation analysis
async function analyzeRateLimitViolation(request: Request) {
  const clientIP = request.headers.get('CF-Connecting-IP');
  const userAgent = request.headers.get('User-Agent');
  const endpoint = new URL(request.url).pathname;

  const analysis = {
    clientIP,
    userAgent,
    endpoint,
    timestamp: new Date(),
    recentRequests: await getRateLimit Recent.getRequests(clientIP, 300000) // Last 5 minutes
  };

  logger.warning("RATE_LIMIT", "2.0.0",
    `Rate limit exceeded: ${JSON.stringify(analysis)}`, "E3002");

  return analysis;
}
```

2. **Implement Exponential Backoff**

```typescript
// Client-side retry with exponential backoff
class APIClient {
  async makeRequestWithBackoff(
    url: string,
    options: RequestInit,
    maxRetries = 3
  ) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.status === 429) {
          // Rate limited
          const retryAfter = parseInt(
            response.headers.get('Retry-After') || '60'
          );
          const backoffTime = Math.min(
            1000 * Math.pow(2, attempt),
            retryAfter * 1000
          );

          logger.warning(
            'API_CLIENT',
            '1.0.0',
            `Rate limited, retrying in ${backoffTime}ms (attempt ${attempt + 1}/${maxRetries + 1})`
          );

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            continue;
          }
        }

        return response;
      } catch (error) {
        if (attempt === maxRetries) throw error;

        const backoffTime = 1000 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
}
```

### Response Headers

```typescript
// Standard rate limit headers
function addRateLimitHeaders(response: Response, rateLimit: RateLimitResult) {
  response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());

  if (!rateLimit.allowed) {
    response.headers.set('Retry-After', rateLimit.retryAfter.toString());
  }

  return response;
}

// Rate limit exceeded response
function createRateLimitResponse(rateLimit: RateLimitResult): Response {
  const errorResponse = {
    error: {
      code: 'E3002',
      message: 'Rate limit exceeded - docs',
      details: {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
        retryAfter: rateLimit.retryAfter,
      },
      documentation: '/docs/api/rate-limits',
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': rateLimit.resetTime.toString(),
      'Retry-After': rateLimit.retryAfter.toString(),
    },
  });
}
```

## Implementation Examples

### Middleware Integration

```typescript
// Rate limiting middleware for Cloudflare Workers
export async function rateLimitMiddleware(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const endpoint = new URL(request.url).pathname;
  const rateLimiter = new AdvancedRateLimiter(env.RATE_LIMIT_KV);

  // Get appropriate rate limit configuration
  const config = getRateLimitConfig(endpoint, request);

  // Check rate limit
  const result = await rateLimiter.checkRateLimit(
    `${clientIP}:${endpoint}`,
    config
  );

  if (!result.allowed) {
    // Track rate limit violation
    errorTracker.trackError('E3002');

    // Log violation
    logger.warning(
      'RATE_LIMIT',
      '2.0.0',
      `Rate limit exceeded for IP ${clientIP} on ${endpoint}`,
      'E3002'
    );

    return createRateLimitResponse(result);
  }

  // Add rate limit headers to successful responses
  ctx.waitUntil(addRateLimitHeaders(response, result));

  return null; // Continue to next middleware
}

function getRateLimitConfig(
  endpoint: string,
  request: Request
): RateLimitConfig {
  // Get user tier from JWT if available
  const userTier = extractUserTierFromJWT(request);

  // Check for endpoint-specific limits
  for (const [pattern, config] of Object.entries(rateLimitConfig.endpoints)) {
    if (endpoint.match(new RegExp(pattern.replace('*', '.*')))) {
      return config;
    }
  }

  // Return user tier limits or default
  return rateLimitConfig.userTiers[userTier] || rateLimitConfig.perIP;
}
```

### Fire22 API Integration

```typescript
// Rate limiting for Fire22 API calls
class Fire22APIClient {
  private rateLimiter = new AdvancedRateLimiter(this.env.KV);

  async makeAPICall(endpoint: string, options: RequestInit): Promise<Response> {
    const rateLimitKey = `fire22_api:${endpoint}`;
    const config = rateLimitConfig.endpoints['/api/fire22/*'];

    // Check rate limit before making API call
    const rateLimit = await this.rateLimiter.checkRateLimit(
      rateLimitKey,
      config
    );

    if (!rateLimit.allowed) {
      logger.warning(
        'FIRE22_API',
        '1.0.0',
        `Rate limit reached for Fire22 API ${endpoint}`,
        'E3002'
      );

      throw new Error(
        `Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds`
      );
    }

    try {
      const response = await fetch(`https://fire22.ag${endpoint}`, options);

      // Handle Fire22's rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        logger.warning(
          'FIRE22_API',
          '1.0.0',
          `Fire22 API rate limited. Retry after ${retryAfter}s`,
          'E3002'
        );
      }

      return response;
    } catch (error) {
      logger.error(
        'FIRE22_API',
        '1.0.0',
        `Fire22 API call failed: ${error.message}`,
        'E4001'
      );
      throw error;
    }
  }
}
```

## Monitoring and Analytics

### Rate Limit Metrics

```typescript
// Rate limit monitoring and metrics
class RateLimitMonitor {
  async gatherMetrics(timeWindow: number = 3600000): Promise<RateLimitMetrics> {
    const now = Date.now();
    const windowStart = now - timeWindow;

    // Query rate limit violations from KV or logs
    const violations = await this.getViolations(windowStart, now);

    return {
      totalRequests: violations.reduce((sum, v) => sum + v.requestCount, 0),
      totalViolations: violations.length,
      topViolators: violations
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10),
      endpointBreakdown: this.groupViolationsByEndpoint(violations),
      timeDistribution: this.analyzeTimeDistribution(violations),
    };
  }

  async generateReport(): Promise<string> {
    const metrics = await this.gatherMetrics();

    return `
## Rate Limit Report

**Time Period**: Last 1 hour
**Total Requests**: ${metrics.totalRequests.toLocaleString()}
**Rate Limit Violations**: ${metrics.totalViolations}
**Violation Rate**: ${((metrics.totalViolations / metrics.totalRequests) * 100).toFixed(2)}%

### Top Violators
${metrics.topViolators
  .map((v, i) => `${i + 1}. ${v.clientIP} - ${v.requestCount} requests`)
  .join('\n')}

### Endpoint Breakdown
${Object.entries(metrics.endpointBreakdown)
  .map(([endpoint, count]) => `- ${endpoint}: ${count} violations`)
  .join('\n')}
    `;
  }
}
```

### Automated Alerts

```typescript
// Automated rate limit alerting
class RateLimitAlerting {
  private alertThresholds = {
    violationRate: 0.05, // 5% violation rate
    consecutiveViolations: 10, // 10 consecutive violations from same IP
    globalViolations: 100, // 100 violations per hour globally
  };

  async checkAndAlert() {
    const metrics = await this.rateLimitMonitor.gatherMetrics();

    // Check violation rate
    const violationRate = metrics.totalViolations / metrics.totalRequests;
    if (violationRate > this.alertThresholds.violationRate) {
      await this.sendAlert('HIGH_VIOLATION_RATE', {
        rate: violationRate,
        threshold: this.alertThresholds.violationRate,
        totalViolations: metrics.totalViolations,
      });
    }

    // Check for IP-based attacks
    for (const violator of metrics.topViolators) {
      if (violator.requestCount > this.alertThresholds.consecutiveViolations) {
        await this.sendAlert('POTENTIAL_ATTACK', {
          clientIP: violator.clientIP,
          requestCount: violator.requestCount,
          timeWindow: '1 hour',
        });
      }
    }
  }

  private async sendAlert(type: string, data: any) {
    logger.error(
      'RATE_LIMIT_ALERT',
      '1.0.0',
      `Alert: ${type} - ${JSON.stringify(data)}`,
      'E3002'
    );

    // In production, integrate with alerting system
    // await notificationService.send({
    //   type: 'rate_limit_alert',
    //   severity: 'high',
    //   data
    // });
  }
}
```

## Best Practices

### Client-Side Optimization

1. **Request Caching**

```typescript
// Implement client-side caching to reduce API calls
class CachedAPIClient {
  private cache = new Map<string, { data: any; expiry: number }>();

  async get(endpoint: string, cacheTime: number = 300000): Promise<any> {
    const cacheKey = endpoint;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiry) {
      return cached.data; // Return cached data
    }

    const data = await this.makeAPICall(endpoint);
    this.cache.set(cacheKey, {
      data,
      expiry: Date.now() + cacheTime,
    });

    return data;
  }
}
```

2. **Request Batching**

```typescript
// Batch multiple requests to reduce API calls
class BatchAPIClient {
  private batchQueue: Array<{
    endpoint: string;
    resolve: Function;
    reject: Function;
  }> = [];
  private batchTimer: NodeJS.Timeout | null = null;

  async request(endpoint: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ endpoint, resolve, reject });

      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), 100);
      }
    });
  }

  private async processBatch() {
    const batch = this.batchQueue.splice(0);
    this.batchTimer = null;

    // Process multiple requests in a single API call
    const batchResult = await this.makeBatchAPICall(
      batch.map(item => item.endpoint)
    );

    batch.forEach((item, index) => {
      item.resolve(batchResult[index]);
    });
  }
}
```

### Server-Side Optimization

1. **Intelligent Rate Limiting**

```typescript
// Dynamic rate limiting based on system load
class AdaptiveRateLimiter extends AdvancedRateLimiter {
  async getAdaptiveLimit(
    baseConfig: RateLimitConfig
  ): Promise<RateLimitConfig> {
    const systemLoad = await this.getSystemLoad();
    const adaptedConfig = { ...baseConfig };

    // Reduce limits during high load
    if (systemLoad > 0.8) {
      adaptedConfig.requests = Math.floor(baseConfig.requests * 0.7);
    } else if (systemLoad > 0.6) {
      adaptedConfig.requests = Math.floor(baseConfig.requests * 0.8);
    }

    return adaptedConfig;
  }
}
```

2. **Graceful Degradation**

```typescript
// Graceful degradation during rate limit events
class GracefulRateLimiter {
  async handleRateLimitExceeded(request: Request): Promise<Response> {
    const endpoint = new URL(request.url).pathname;

    // Serve cached response for non-critical endpoints
    if (this.isNonCriticalEndpoint(endpoint)) {
      const cached = await this.getCachedResponse(endpoint);
      if (cached) {
        return this.createCachedResponse(cached);
      }
    }

    // Redirect to queue for critical endpoints
    if (this.isCriticalEndpoint(endpoint)) {
      return this.redirectToQueue(request);
    }

    return createRateLimitResponse(rateLimit);
  }
}
```

## Testing Rate Limits

### Load Testing

```bash
# Test rate limits with curl
for i in {1..10}; do
  curl -w "%{http_code} %{time_total}\n" \
       -H "Authorization: Bearer $JWT_TOKEN" \
       -X POST http://localhost:3001/api/fire22/test
  sleep 1
done

# Test with ab (Apache Bench)
ab -n 1000 -c 10 -H "Authorization: Bearer $JWT_TOKEN" \
   http://localhost:3001/api/fire22/test

# Test with Artillery.js
artillery run rate-limit-test.yml
```

### Test Configuration

```yaml
# artillery-rate-limit-test.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 100

scenarios:
  - name: 'Rate limit test'
    requests:
      - post:
          url: '/api/fire22/test'
          headers:
            Authorization: 'Bearer {{ $randomString() }}'
          expect:
            - statusCode: [200, 429]
```

## Related Documentation

- [API Authentication](./authentication.md)
- [Error Handling](./error-handling.md)
- [Performance Optimization](./optimization.md)
- [Security Best Practices](../security/api-security.md)
- [Monitoring and Alerting](../monitoring/api-monitoring.md)

---

**Last Updated**: 2025-08-28  
**Version**: 1.0.0  
**Related Error Code**: E3002
