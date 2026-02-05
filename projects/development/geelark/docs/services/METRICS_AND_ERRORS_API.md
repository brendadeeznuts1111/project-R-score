# Metrics and Error Tracking API Documentation

Complete API reference for MetricsCollector and ErrorTracker services in Geelark.

## Table of Contents

1. [Overview](#overview)
2. [MetricsCollector API](#metricscollector-api)
3. [ErrorTracker API](#errortracker-api)
4. [Integration Examples](#integration-examples)
5. [Best Practices](#best-practices)

## Overview

The metrics and error tracking framework provides two production-grade singleton services:

- **MetricsCollector**: Centralized metrics collection and aggregation (API calls, performance, errors, health)
- **ErrorTracker**: Standardized error handling and reporting with automatic metrics integration

Both services are fully typed with TypeScript and follow Geelark naming conventions.

---

## MetricsCollector API

### Singleton Access

```typescript
import { MetricsCollector } from '../src/services/MetricsCollector';
import { Logger } from '../src/Logger';

// Get singleton instance (optional logger)
const metrics = MetricsCollector.getInstance();

// Or with logger for detailed logging
const logger = new Logger({ /* config */ });
const metricsWithLogging = MetricsCollector.getInstance(logger);

// Testing: reset to fresh state
MetricsCollector.reset();
```

### Recording API Call Metrics

#### `recordAPICall(metric: Omit<APIMetric, 'timestamp' | 'success'>): void`

Record a single API call.

```typescript
metrics.recordAPICall({
  endpoint: '/api/users',
  method: 'GET',
  duration: 150,           // milliseconds
  status: 200,
  requestSize: 0,
  responseSize: 2048,
  requestId: 'req-123'
});
```

Success is automatically determined: `status < 400` = success.

#### `recordAPICallBatch(metrics: Omit<APIMetric, 'timestamp' | 'success'>[]): void`

Record multiple API calls efficiently.

```typescript
metrics.recordAPICallBatch([
  { endpoint: '/api/1', method: 'GET', duration: 50, status: 200 },
  { endpoint: '/api/2', method: 'POST', duration: 100, status: 201 },
  { endpoint: '/api/3', method: 'DELETE', duration: 75, status: 204 }
]);
```

### Recording Performance Metrics

#### `recordPerformance(label: string, duration: number, options?: { tags?, metadata? }): void`

Track operation performance with optional tags and metadata.

```typescript
metrics.recordPerformance('database-query', 245, {
  tags: { database: 'postgres', table: 'users' },
  metadata: { rowsAffected: 150 }
});

metrics.recordPerformance('cache-hit', 2, {
  tags: { cacheType: 'redis' }
});
```

### Recording Error Metrics

#### `recordError(errorData: { code, message, severity, context?, stackTrace? }): void`

Record error metrics with severity levels.

```typescript
metrics.recordError({
  code: 'DB_001',
  message: 'Database connection failed',
  severity: 'critical',
  context: { database: 'primary', timestamp: Date.now() },
  stackTrace: error.stack
});
```

Severity levels: `'warn'`, `'error'`, `'critical'`

### Recording Health Metrics

#### `recordHealth(metrics: Omit<HealthMetric, 'timestamp'>): void`

Record system health snapshot.

```typescript
metrics.recordHealth({
  cpuUsage: 45.5,
  memoryUsage: 62.3,
  uptime: 3600000,
  requestsPerSecond: 120,
  errorRate: 0.02,
  avgLatency: 150,
  status: 'healthy'
});
```

### Querying Metrics

#### `getMetrics(filter?: MetricsFilter): MetricsSnapshot`

Get comprehensive metrics snapshot with optional filtering.

```typescript
// Get all metrics
const allMetrics = metrics.getMetrics();

// Filter by endpoint
const userMetrics = metrics.getMetrics({ endpoint: '/api/users' });

// Filter by method and time range
const postMetrics = metrics.getMetrics({
  method: 'POST',
  timeRange: 300000  // Last 5 minutes
});
```

Returns (MetricsSnapshot):
```typescript
{
  timestamp: number,
  apiMetrics: {
    totalRequests: number,
    successRequests: number,
    failedRequests: number,
    avgDuration: number,
    p50Duration: number,
    p95Duration: number,
    p99Duration: number,
    totalRequestSize: number,
    totalResponseSize: number,
    errorsByStatus: Record<number, number>
  },
  performanceMetrics: {
    labels: string[],
    avgDurations: Record<string, number>
  },
  errorMetrics: {
    totalErrors: number,
    errorsBySeverity: Record<string, number>,
    errorsByCode: Record<string, number>
  },
  healthMetrics: {
    cpuUsage: number,
    memoryUsage: number,
    uptime: number,
    requestsPerSecond: number,
    errorRate: number,
    avgLatency: number,
    healthScore: number,
    status: string
  }
}
```

#### `getEndpointMetrics(endpoint: string, method?: string): MetricsSnapshot`

Get metrics for specific endpoint.

```typescript
const userGetMetrics = metrics.getEndpointMetrics('/api/users', 'GET');
const userPostMetrics = metrics.getEndpointMetrics('/api/users', 'POST');
```

#### `getRecentMetrics(timeRangeMs?: number): MetricsSnapshot`

Get metrics from recent time window (default: 1 hour).

```typescript
const last15Min = metrics.getRecentMetrics(900000);
const lastHour = metrics.getRecentMetrics();
```

### Calculating Key Metrics

#### `getErrorRate(timeRangeMs?: number): number`

Get error rate as decimal (0-1).

```typescript
const errorRate = metrics.getErrorRate(300000);  // Last 5 minutes
console.log(`Error rate: ${(errorRate * 100).toFixed(2)}%`);
```

#### `getAverageLatency(timeRangeMs?: number): number`

Get average response time in milliseconds.

```typescript
const avgMs = metrics.getAverageLatency();
console.log(`Average latency: ${avgMs}ms`);
```

#### `getLatencyPercentile(percentile: number, timeRangeMs?: number): number`

Get latency at percentile (P50, P95, P99).

```typescript
const p50 = metrics.getLatencyPercentile(50);
const p95 = metrics.getLatencyPercentile(95);
const p99 = metrics.getLatencyPercentile(99);

console.log(`Latency P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
```

#### `getThroughput(timeRangeMs?: number): number`

Get requests per second.

```typescript
const rps = metrics.getThroughput();
console.log(`Throughput: ${rps.toFixed(2)} req/s`);
```

#### `calculateHealthScore(timeRangeMs?: number): number`

Calculate health score (0-100) based on weighted factors.

```typescript
const score = metrics.calculateHealthScore();
console.log(`Health score: ${score}/100`);
```

Weighted factors:
- Error rate: 30%
- Latency: 25%
- Uptime: 20%
- Memory usage: 15%
- CPU usage: 10%

#### `getHealthStatus(score?: number): 'healthy' | 'degraded' | 'impaired' | 'critical'`

Get health status based on score.

```typescript
const score = metrics.calculateHealthScore();
const status = metrics.getHealthStatus(score);

// Score ranges:
// >= 80: 'healthy'
// >= 60: 'degraded'
// >= 40: 'impaired'
// < 40:  'critical'
```

### Event Subscriptions

#### `onMetricEvent(event, callback): this`

Subscribe to metric events.

```typescript
metrics.onMetricEvent('api-call-recorded', (data) => {
  console.log(`API call: ${data.endpoint} - ${data.status}`);
});

metrics.onMetricEvent('error-recorded', (data) => {
  console.log(`Error: ${data.code} - ${data.severity}`);
});

metrics.onMetricEvent('health-recorded', (data) => {
  console.log(`Health: CPU ${data.cpuUsage}%, Memory ${data.memoryUsage}%`);
});
```

Available events: `'api-call-recorded'`, `'performance-recorded'`, `'error-recorded'`, `'health-recorded'`, `'metrics-updated'`

#### `offMetricEvent(event, callback): this`

Unsubscribe from metric events.

```typescript
const handler = (data) => { /* ... */ };
metrics.onMetricEvent('api-call-recorded', handler);
// Later...
metrics.offMetricEvent('api-call-recorded', handler);
```

### Data Management

#### `reset(): void`

Reset all metrics (useful for testing).

```typescript
metrics.reset();
```

#### `pruneOldMetrics(ageMs: number): void`

Remove metrics older than specified age.

```typescript
metrics.pruneOldMetrics(86400000);  // Remove metrics older than 24 hours
```

#### `getStats(): { apiMetricsCount, performanceMetricsCount, errorMetricsCount, healthMetricsCount, uptime, totalMemory }`

Get collection statistics.

```typescript
const stats = metrics.getStats();
console.log(`Metrics stored: ${stats.apiMetricsCount} API, ${stats.errorMetricsCount} errors`);
```

---

## ErrorTracker API

### Singleton Access

```typescript
import { ErrorTracker } from '../src/services/ErrorTracker';
import { MetricsCollector } from '../src/services/MetricsCollector';

const metricsCollector = MetricsCollector.getInstance();

// Get singleton instance (requires MetricsCollector dependency)
const errorTracker = ErrorTracker.getInstance(metricsCollector);

// Or with optional logger
const errorTracker = ErrorTracker.getInstance(metricsCollector, logger);

// Testing: reset
ErrorTracker.reset();
```

### Error Creation & Tracking

#### `trackError(code: ErrorCode, context?: ErrorContext): ApplicationError`

Create and track an error with automatic metrics recording.

```typescript
const error = errorTracker.trackError('SYS_001', {
  endpoint: '/api/users',
  userId: 'user-123',
  operation: 'create-user'
});

throw error;
```

Error is automatically:
- Created with mapped error code info
- Added to error history
- Recorded in MetricsCollector
- Logged with appropriate level

#### `createError(code: ErrorCode, context?: ErrorContext): ApplicationError`

Create error without tracking (for special cases).

```typescript
const error = errorTracker.createError('API_002', {
  endpoint: '/admin'
});

// Handle specially without automatic tracking
```

### Error Reporting

#### `getErrorReport(code: ErrorCode): ErrorReport | undefined`

Get report for specific error code.

```typescript
const report = errorTracker.getErrorReport('API_001');
if (report) {
  console.log(`Error ${report.code}: ${report.count} occurrences`);
  console.log(`Last occurred: ${new Date(report.lastOccurrence).toISOString()}`);
  console.log(`Severity: ${report.severity}`);
}
```

#### `getAllErrorReports(): ErrorReport[]`

Get all error reports.

```typescript
const reports = errorTracker.getAllErrorReports();
reports.forEach(report => {
  console.log(`${report.code}: ${report.count} times`);
});
```

#### `getRecentErrors(limit?: number): ErrorReport[]`

Get N most recent errors.

```typescript
const recent = errorTracker.getRecentErrors(10);
recent.forEach(err => console.log(err.message));
```

#### `getErrorStats(): ErrorStats`

Get comprehensive error statistics.

```typescript
const stats = errorTracker.getErrorStats();
console.log(`Total errors: ${stats.totalErrors}`);
console.log(`By severity:`, stats.bySeverity);  // { error: 5, critical: 2, warn: 1 }
console.log(`By code:`, stats.byCode);          // { 'API_001': 3, 'DB_001': 2, ... }
```

#### `getErrorsBySeverity(severity: 'warn' | 'error' | 'critical'): ErrorReport[]`

Get errors filtered by severity.

```typescript
const criticalErrors = errorTracker.getErrorsBySeverity('critical');
console.log(`Critical errors: ${criticalErrors.length}`);
```

#### `getErrorTrend(timeWindowMs?: number): number`

Get count of errors in time window.

```typescript
const errorsTodayCount = errorTracker.getErrorTrend(86400000);
console.log(`Errors today: ${errorsTodayCount}`);
```

### Error Analysis

#### `isErrorRateHigh(threshold?: number, timeWindowMs?: number): boolean`

Check if error rate exceeds threshold.

```typescript
if (errorTracker.isErrorRateHigh(0.05, 300000)) {
  console.warn('High error rate detected!');
}
```

#### `getDashboardSummary(): { totalErrors, criticalErrors, recentErrors, topErrors, errorRate }`

Get summary for dashboard display.

```typescript
const summary = errorTracker.getDashboardSummary();
console.log(`Total: ${summary.totalErrors}, Critical: ${summary.criticalErrors}`);
console.log(`Top errors:`, summary.topErrors);  // [{ code: 'API_001', count: 5 }, ...]
console.log(`Current error rate: ${(summary.errorRate * 100).toFixed(2)}%`);
```

### Error Utilities

#### `isRetryable(error: ApplicationError): boolean`

Determine if error should be retried.

```typescript
if (errorTracker.isRetryable(error)) {
  // 408, 429, 5xx status codes
  await retry(() => operation(), { maxAttempts: 3 });
}
```

#### `getRetryDelay(error: ApplicationError, attempt: number): number`

Get exponential backoff delay in milliseconds.

```typescript
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    return await operation();
  } catch (error) {
    if (errorTracker.isRetryable(error)) {
      const delay = errorTracker.getRetryDelay(error, attempt);
      // delay = 100, 200, 400, 800, ... (capped at 1600ms)
      await sleep(delay);
    } else {
      throw error;
    }
  }
}
```

#### `getUserMessage(error: ApplicationError): string`

Get user-friendly error message.

```typescript
try {
  // operation
} catch (error) {
  const userMessage = errorTracker.getUserMessage(error);
  res.status(error.statusCode).json({ message: userMessage });
}
```

#### `getRecommendedAction(error: ApplicationError): string`

Get recommended action for error.

```typescript
const error = errorTracker.trackError('DB_001');
console.log(`Recommended action: ${errorTracker.getRecommendedAction(error)}`);
// Output: "Check database connection"
```

### Error Management

#### `getErrorCount(code: ErrorCode): number`

Get total count for specific error code.

```typescript
const apiErrorCount = errorTracker.getErrorCount('API_001');
console.log(`API_001 has occurred ${apiErrorCount} times`);
```

#### `resetErrorCount(code?: ErrorCode): void`

Reset count for specific error or all errors.

```typescript
// Reset specific error
errorTracker.resetErrorCount('API_001');

// Reset all error counts
errorTracker.resetErrorCount();
```

#### `clearHistory(): void`

Clear all error history.

```typescript
errorTracker.clearHistory();
```

#### `isValidErrorCode(code: string): boolean`

Validate error code exists.

```typescript
if (errorTracker.isValidErrorCode('SYS_001')) {
  console.log('Valid error code');
}
```

### Export & Persistence

#### `exportAsJSON(): string`

Export error history as JSON.

```typescript
const json = errorTracker.exportAsJSON();
await fs.writeFile('errors-export.json', json);
```

Returns JSON with structure:
```json
{
  "timestamp": "2026-01-09T13:00:00.000Z",
  "stats": { /* stats object */ },
  "history": [ /* error reports */ ]
}
```

---

## Integration Examples

### Example 1: HTTP Middleware Integration

```typescript
import { MetricsCollector } from '../src/services/MetricsCollector';
import { ErrorTracker } from '../src/services/ErrorTracker';

const metrics = MetricsCollector.getInstance();
const errorTracker = ErrorTracker.getInstance(metrics);

app.use((req, res, next) => {
  const start = Date.now();
  
  // Capture original send
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Record metrics
    metrics.recordAPICall({
      endpoint: req.path,
      method: req.method as any,
      duration,
      status: res.statusCode,
      requestSize: req.get('content-length') || 0,
      responseSize: Buffer.byteLength(data)
    });
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  next();
});

app.use((err, req, res, next) => {
  const error = errorTracker.trackError('API_005', {
    endpoint: req.path,
    method: req.method,
    message: err.message
  });
  
  res.status(error.statusCode).json({
    message: errorTracker.getUserMessage(error),
    action: errorTracker.getRecommendedAction(error)
  });
});
```

### Example 2: Database Operations

```typescript
async function executeQuery(sql: string, params: any[]): Promise<any> {
  const start = Date.now();
  
  try {
    const result = await db.query(sql, params);
    
    metrics.recordPerformance('database-query', Date.now() - start, {
      tags: { operation: 'query', table: extractTable(sql) },
      metadata: { rowsAffected: result.rowCount }
    });
    
    return result;
  } catch (error) {
    const appError = errorTracker.trackError('DB_001', {
      operation: 'query',
      query: sql.substring(0, 100),
      params: params.length
    });
    
    throw appError;
  }
}
```

### Example 3: Health Check Endpoint

```typescript
app.get('/health', (req, res) => {
  const metrics = metricsCollector.getMetrics();
  const healthScore = metricsCollector.calculateHealthScore();
  const errorSummary = errorTracker.getDashboardSummary();
  
  res.json({
    status: metricsCollector.getHealthStatus(healthScore),
    score: healthScore,
    metrics: {
      avgLatency: metrics.healthMetrics.avgLatency,
      errorRate: (metrics.healthMetrics.errorRate * 100).toFixed(2) + '%',
      requestsPerSec: metrics.healthMetrics.requestsPerSecond
    },
    errors: {
      total: errorSummary.totalErrors,
      critical: errorSummary.criticalErrors,
      top: errorSummary.topErrors
    }
  });
});
```

### Example 4: Performance Monitoring

```typescript
import { performance } from 'node:perf_hooks';

async function cacheGet(key: string): Promise<any> {
  const mark = `cache-get-${key}`;
  performance.mark(`${mark}-start`);
  
  try {
    const value = await redis.get(key);
    performance.mark(`${mark}-end`);
    
    const measure = performance.measure(mark, `${mark}-start`, `${mark}-end`);
    metrics.recordPerformance('cache-get', measure.duration, {
      tags: { key, hit: !!value }
    });
    
    return value;
  } catch (error) {
    errorTracker.trackError('CACHE_001', { key, operation: 'get' });
    throw error;
  }
}
```

### Example 5: Error Recovery with Retry Logic

```typescript
async function callExternalAPI(endpoint: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await fetch(endpoint);
      
      metrics.recordAPICall({
        endpoint,
        method: 'GET',
        duration: result.time,
        status: result.status
      });
      
      return result;
    } catch (error) {
      const appError = errorTracker.trackError('API_003', { endpoint });
      
      if (errorTracker.isRetryable(appError)) {
        const delay = errorTracker.getRetryDelay(appError, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw appError;
      }
    }
  }
}
```

---

## Best Practices

### 1. Initialize Once at Startup

```typescript
// app.ts or main.ts
const logger = new Logger(/* config */);
const metrics = MetricsCollector.getInstance(logger);
const errorTracker = ErrorTracker.getInstance(metrics, logger);

// Make available globally if needed
global.metrics = metrics;
global.errorTracker = errorTracker;
```

### 2. Use Type-Safe Error Codes

```typescript
// All error codes are typed from ERROR_CODES constants
const error = errorTracker.trackError('SYS_001');  // ✓ TypeScript checks this
const error = errorTracker.trackError('INVALID');  // ✗ TypeScript error
```

### 3. Always Include Error Context

```typescript
// Good: provides debugging information
errorTracker.trackError('DB_001', {
  endpoint: req.path,
  userId: req.user?.id,
  operation: 'findUser',
  requestId: req.id
});

// Avoid: insufficient context
errorTracker.trackError('DB_001');
```

### 4. Monitor Health Scores Regularly

```typescript
setInterval(() => {
  const score = metrics.calculateHealthScore();
  const status = metrics.getHealthStatus(score);
  
  if (status === 'critical' || status === 'impaired') {
    logger.error('System health degraded', { score, status });
    // Alert ops team, trigger failover, etc.
  }
}, 60000);  // Check every minute
```

### 5. Clean Up Old Metrics

```typescript
// Prevent unbounded memory growth
setInterval(() => {
  metrics.pruneOldMetrics(604800000);  // Keep 7 days of history
}, 3600000);  // Cleanup every hour
```

### 6. Export Metrics for Analysis

```typescript
app.get('/metrics/export', (req, res) => {
  const format = req.query.format || 'json';
  
  if (format === 'json') {
    const data = metrics.getMetrics();
    const errors = errorTracker.exportAsJSON();
    res.json({ metrics: data, errors: JSON.parse(errors) });
  } else if (format === 'csv') {
    // Convert to CSV format for spreadsheet analysis
    res.setHeader('Content-Type', 'text/csv');
    res.send(convertToCSV(metrics.getMetrics()));
  }
});
```

### 7. Subscribe to Critical Events

```typescript
// Alert on critical errors
metrics.onMetricEvent('error-recorded', (error) => {
  if (error.severity === 'critical') {
    alertOps({
      title: `CRITICAL: ${error.code}`,
      message: error.message,
      timestamp: new Date(error.timestamp)
    });
  }
});
```

---

## Time Window Constants

The framework includes pre-defined time windows:

```typescript
import { TIME_WINDOWS } from '../src/constants/api-metrics';

TIME_WINDOWS.SHORT = 300000;        // 5 minutes
TIME_WINDOWS.MEDIUM = 3600000;      // 1 hour
TIME_WINDOWS.LONG = 86400000;       // 24 hours
```

Use these for consistent metric queries:
```typescript
metrics.getErrorRate(TIME_WINDOWS.SHORT);    // 5-minute error rate
metrics.getThroughput(TIME_WINDOWS.MEDIUM);  // Hourly throughput
```
