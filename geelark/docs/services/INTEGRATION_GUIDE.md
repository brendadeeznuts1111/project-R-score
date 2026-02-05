# Metrics and Error Tracking Integration Guide

Step-by-step guide to integrate MetricsCollector and ErrorTracker into your Geelark application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation & Setup](#installation--setup)
3. [Basic Usage](#basic-usage)
4. [Express.js Integration](#expressjs-integration)
5. [Advanced Patterns](#advanced-patterns)
6. [Troubleshooting](#troubleshooting)

## Quick Start

Get up and running in 5 minutes:

```typescript
// 1. Import services
import { MetricsCollector } from '../src/services/MetricsCollector';
import { ErrorTracker } from '../src/services/ErrorTracker';
import { Logger } from '../src/Logger';

// 2. Initialize (once at app startup)
const logger = new Logger({ level: 'INFO' });
const metrics = MetricsCollector.getInstance(logger);
const errorTracker = ErrorTracker.getInstance(metrics, logger);

// 3. Use in your code
async function getUser(userId: string) {
  const start = Date.now();
  
  try {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    // Record successful operation
    metrics.recordPerformance('database-query', Date.now() - start, {
      tags: { operation: 'getUser' }
    });
    
    return user;
  } catch (error) {
    // Track error automatically
    throw errorTracker.trackError('DB_001', {
      operation: 'getUser',
      userId
    });
  }
}

// 4. Query metrics
const healthScore = metrics.calculateHealthScore();
console.log(`System health: ${healthScore}/100`);

const errorStats = errorTracker.getDashboardSummary();
console.log(`Critical errors: ${errorStats.criticalErrors}`);
```

## Installation & Setup

### Step 1: Import Required Services

```typescript
// services.ts - Create a centralized initialization module
import { MetricsCollector } from '../services/MetricsCollector';
import { ErrorTracker } from '../services/ErrorTracker';
import { Logger } from '../Logger';
import { FeatureRegistry } from '../FeatureRegistry';

// Initialize basic dependencies
const featureRegistry = new FeatureRegistry(new Map());
const logger = new Logger({
  level: 'INFO',
  externalServices: [],
  retention: 30,
  featureRegistry
});

// Initialize metrics and error tracking
export const metrics = MetricsCollector.getInstance(logger);
export const errorTracker = ErrorTracker.getInstance(metrics, logger);

// Make globally available if needed
global.metrics = metrics;
global.errorTracker = errorTracker;
```

### Step 2: Set Up Error Codes

All error codes are predefined in `ERROR_CODES` constants. Available categories:

- **SYS (1000-1999)**: System errors
- **API (2000-2999)**: API errors
- **VAL (3000-3999)**: Validation errors
- **DB (4000-4999)**: Database errors
- **AUTH (5000-5999)**: Authentication errors
- **CACHE (6000-6999)**: Cache errors
- **CONFIG (7000-7999)**: Configuration errors
- **NETWORK (8000-8999)**: Network errors
- **ERR (9000-9999)**: Generic errors

Type safety ensures you can only use valid error codes:

```typescript
// ✓ Type-safe (compiles)
errorTracker.trackError('SYS_001');
errorTracker.trackError('API_002');
errorTracker.trackError('DB_001');

// ✗ Type error (catches at compile time)
errorTracker.trackError('INVALID_CODE');  // TS Error
```

### Step 3: Configure Time Windows (Optional)

Default time windows are predefined:

```typescript
import { TIME_WINDOWS } from '../constants/api-metrics';

// Available constants
TIME_WINDOWS.SHORT = 300000;        // 5 minutes
TIME_WINDOWS.MEDIUM = 3600000;      // 1 hour
TIME_WINDOWS.LONG = 86400000;       // 24 hours

// Use in metrics queries
metrics.getErrorRate(TIME_WINDOWS.SHORT);
metrics.getThroughput(TIME_WINDOWS.MEDIUM);
```

## Basic Usage

### Recording API Metrics

```typescript
// When handling HTTP requests
import express from 'express';
import { metrics } from './services';

const app = express();

app.get('/api/users/:id', async (req, res) => {
  const start = Date.now();
  
  try {
    const user = await User.findById(req.params.id);
    
    // Record successful request
    metrics.recordAPICall({
      endpoint: req.path,
      method: req.method as any,
      duration: Date.now() - start,
      status: 200,
      responseSize: JSON.stringify(user).length
    });
    
    res.json(user);
  } catch (error) {
    metrics.recordAPICall({
      endpoint: req.path,
      method: req.method as any,
      duration: Date.now() - start,
      status: 500
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Recording Performance Metrics

```typescript
import { metrics } from './services';

// Track database queries
async function executeQuery(sql: string) {
  const start = Date.now();
  
  try {
    const result = await db.query(sql);
    
    metrics.recordPerformance('database-query', Date.now() - start, {
      tags: { database: 'postgres' },
      metadata: { rows: result.rowCount }
    });
    
    return result;
  } catch (error) {
    metrics.recordPerformance('database-query-failed', Date.now() - start, {
      tags: { database: 'postgres', status: 'failed' }
    });
    throw error;
  }
}

// Track cache operations
async function cacheGet(key: string) {
  const start = Date.now();
  const value = await redis.get(key);
  
  metrics.recordPerformance('cache-get', Date.now() - start, {
    tags: { hit: !!value }
  });
  
  return value;
}

// Track business logic operations
function processPayment(amount: number) {
  const start = Date.now();
  
  try {
    const result = paymentGateway.charge(amount);
    
    metrics.recordPerformance('payment-processing', Date.now() - start, {
      tags: { status: 'success' },
      metadata: { amount }
    });
    
    return result;
  } catch (error) {
    metrics.recordPerformance('payment-processing', Date.now() - start, {
      tags: { status: 'failed' }
    });
    throw error;
  }
}
```

### Tracking Errors

```typescript
import { errorTracker, metrics } from './services';

// Track errors with context
async function createUser(userData: any) {
  try {
    // Validate input
    if (!userData.email) {
      throw errorTracker.trackError('VAL_001', {
        operation: 'createUser',
        missingField: 'email'
      });
    }
    
    // Attempt creation
    const user = await User.create(userData);
    return user;
    
  } catch (error) {
    // Different handling based on error type
    if (error.message.includes('duplicate')) {
      throw errorTracker.trackError('DB_003', {
        operation: 'createUser',
        userId: userData.id
      });
    } else {
      throw errorTracker.trackError('SYS_001', {
        operation: 'createUser',
        originalError: error.message
      });
    }
  }
}
```

## Express.js Integration

### Pattern 1: Middleware for Auto-Recording

```typescript
import express from 'express';
import { metrics, errorTracker } from './services';

const app = express();

// Metrics recording middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Intercept response
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Record metric
    metrics.recordAPICall({
      endpoint: req.path,
      method: req.method as any,
      duration,
      status: res.statusCode,
      requestSize: parseInt(req.headers['content-length'] || '0'),
      responseSize: typeof data === 'string' ? data.length : 0
    });
    
    // Call original
    return originalSend.call(this, data);
  };
  
  next();
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Track error
  const appError = errorTracker.trackError('API_005', {
    endpoint: req.path,
    method: req.method,
    message: err.message
  });
  
  // Send response
  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: errorTracker.getUserMessage(appError),
      action: errorTracker.getRecommendedAction(appError)
    }
  });
});
```

### Pattern 2: Health Check Endpoint

```typescript
import { metrics, errorTracker } from './services';

app.get('/health', (req, res) => {
  const metricsData = metrics.getMetrics();
  const healthScore = metrics.calculateHealthScore();
  const healthStatus = metrics.getHealthStatus(healthScore);
  const errorSummary = errorTracker.getDashboardSummary();
  
  res.json({
    status: healthStatus,
    health: {
      score: healthScore,
      uptime: metricsData.healthMetrics.uptime,
      avgLatency: `${metricsData.healthMetrics.avgLatency.toFixed(0)}ms`,
      errorRate: `${(metricsData.healthMetrics.errorRate * 100).toFixed(2)}%`,
      requestsPerSecond: metricsData.healthMetrics.requestsPerSecond.toFixed(2)
    },
    errors: {
      total: errorSummary.totalErrors,
      critical: errorSummary.criticalErrors,
      recentRate: `${(errorSummary.errorRate * 100).toFixed(2)}%`,
      topErrors: errorSummary.topErrors.slice(0, 3)
    }
  });
});
```

### Pattern 3: Metrics Export Endpoint

```typescript
import { metrics, errorTracker } from './services';

app.get('/metrics/export', (req, res) => {
  const format = req.query.format || 'json';
  
  const metricsData = metrics.getMetrics();
  const errorData = JSON.parse(errorTracker.exportAsJSON());
  
  if (format === 'json') {
    res.json({
      timestamp: new Date().toISOString(),
      metrics: metricsData,
      errors: errorData
    });
  } else if (format === 'csv') {
    // Convert to CSV
    const csv = convertToCSV(metricsData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=metrics.csv');
    res.send(csv);
  } else {
    res.status(400).json({ error: 'Unsupported format' });
  }
});
```

## Advanced Patterns

### Pattern 1: Retry Logic with Error Tracking

```typescript
import { errorTracker } from './services';

async function executeWithRetry(
  operation: () => Promise<any>,
  maxAttempts: number = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const appError = error instanceof Error 
        ? errorTracker.createError('API_003', { attempt })
        : error;
      
      if (errorTracker.isRetryable(appError) && attempt < maxAttempts) {
        const delay = errorTracker.getRetryDelay(appError, attempt);
        console.log(`Retry attempt ${attempt} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw appError;
      }
    }
  }
}

// Usage
const result = await executeWithRetry(async () => {
  return await externalAPI.call();
});
```

### Pattern 2: Circuit Breaker with Health Monitoring

```typescript
import { metrics, errorTracker } from './services';

class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should be opened
    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure > 30000) {  // 30 second timeout
        this.state = 'half-open';
      } else {
        throw errorTracker.trackError('API_004', {
          message: 'Circuit breaker is open',
          failureCount: this.failureCount
        });
      }
    }
    
    try {
      const result = await operation();
      
      // Success - reset
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= 5) {
        this.state = 'open';
        metrics.recordError({
          code: 'API_004',
          message: 'Circuit breaker opened',
          severity: 'critical',
          context: { failureCount: this.failureCount }
        });
      }
      
      throw error;
    }
  }
}
```

### Pattern 3: Real-Time Monitoring

```typescript
import { metrics, errorTracker } from './services';

// Monitor system health every minute
setInterval(() => {
  const healthScore = metrics.calculateHealthScore();
  const status = metrics.getHealthStatus(healthScore);
  const errorRate = metrics.getErrorRate();
  const latencyP95 = metrics.getLatencyPercentile(95);
  
  console.log(`[HEALTH CHECK]`);
  console.log(`  Status: ${status} (${healthScore}/100)`);
  console.log(`  Error rate: ${(errorRate * 100).toFixed(2)}%`);
  console.log(`  P95 Latency: ${latencyP95}ms`);
  
  // Alert if degraded
  if (status === 'critical' || status === 'impaired') {
    alertOps({
      level: 'warning',
      title: `System health: ${status}`,
      details: { healthScore, errorRate, latencyP95 }
    });
  }
  
  // Check for error spikes
  if (errorTracker.isErrorRateHigh(0.1)) {
    alertOps({
      level: 'critical',
      title: 'High error rate detected',
      details: errorTracker.getDashboardSummary()
    });
  }
}, 60000);
```

### Pattern 4: Performance Profiling

```typescript
import { metrics } from './services';

class PerformanceProfiler {
  private measurements = new Map<string, number[]>();
  
  async profile<T>(
    label: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    
    try {
      const result = await operation();
      
      const duration = Date.now() - start;
      metrics.recordPerformance(label, duration);
      
      // Collect statistics
      if (!this.measurements.has(label)) {
        this.measurements.set(label, []);
      }
      this.measurements.get(label)!.push(duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      metrics.recordPerformance(label, duration, {
        tags: { status: 'failed' }
      });
      throw error;
    }
  }
  
  getStats(label: string) {
    const measurements = this.measurements.get(label) || [];
    const sorted = [...measurements].sort((a, b) => a - b);
    
    return {
      count: sorted.length,
      avg: sorted.length > 0 
        ? sorted.reduce((a, b) => a + b) / sorted.length 
        : 0,
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0
    };
  }
}

// Usage
const profiler = new PerformanceProfiler();

async function processLargeDataset(data: any[]) {
  return profiler.profile('dataset-processing', async () => {
    // Process data
    return data.map(item => transform(item));
  });
}

// Later, view statistics
const stats = profiler.getStats('dataset-processing');
console.log(`Processing took ${stats.avg}ms on average (p95: ${stats.p95}ms)`);
```

## Troubleshooting

### Issue: Memory Growing Indefinitely

**Problem**: Metrics and error history continuously grow.

**Solution**: Enable automatic pruning:

```typescript
import { metrics } from './services';

// Clean up old metrics every hour
setInterval(() => {
  metrics.pruneOldMetrics(604800000);  // Keep 7 days
  console.log('Metrics pruned');
}, 3600000);  // Every hour
```

### Issue: High Memory Usage from Large Responses

**Problem**: Recording huge response sizes bloats metrics.

**Solution**: Cap response sizes:

```typescript
const MAX_RESPONSE_SIZE = 1024 * 1024;  // 1MB

metrics.recordAPICall({
  // ... other fields
  responseSize: Math.min(response.length, MAX_RESPONSE_SIZE)
});
```

### Issue: Metrics Not Being Recorded

**Problem**: Middleware not capturing metrics.

**Solution**: Ensure middleware is registered before route handlers:

```typescript
// ✓ Correct order
app.use(metricsMiddleware);
app.use(errorHandler);
app.use(routes);

// ✗ Wrong - middleware too late
app.use(routes);
app.use(metricsMiddleware);  // Won't capture route metrics
```

### Issue: Error Codes Not Type-Checking

**Problem**: TypeScript allows invalid error codes.

**Solution**: Ensure ERROR_CODES is imported correctly:

```typescript
// ✓ Correct
import { ERROR_CODES, type ErrorCode } from '../constants/api-metrics';

const error = errorTracker.trackError('SYS_001');  // TypeScript verifies

// ✗ Wrong - any type bypasses checks
const error = errorTracker.trackError('INVALID_CODE' as any);
```

### Issue: Tests Failing with Singleton State

**Problem**: Tests interfere due to shared singleton state.

**Solution**: Reset singletons in tests:

```typescript
import { describe, it, beforeEach } from 'bun:test';
import { MetricsCollector } from '../src/services/MetricsCollector';
import { ErrorTracker } from '../src/services/ErrorTracker';

describe('My Feature', () => {
  beforeEach(() => {
    // Reset for clean state
    MetricsCollector.reset();
    ErrorTracker.reset();
  });
  
  it('should work correctly', () => {
    const metrics = MetricsCollector.getInstance();
    // ... test code
  });
});
```

---

## Next Steps

1. **Review** the [API Documentation](./METRICS_AND_ERRORS_API.md) for complete API reference
2. **Implement** middleware for your framework (Express, Fastify, etc.)
3. **Add** health check and metrics export endpoints
4. **Configure** periodic cleanup and monitoring
5. **Test** with the provided unit test suites
