# Metrics & Monitoring Tracking Guide

Comprehensive guide for implementing application-wide metrics, API call tracking, and performance monitoring in Geelark.

## Table of Contents
1. [Overview](#overview)
2. [Metrics System Architecture](#metrics-system-architecture)
3. [API Call Tracking](#api-call-tracking)
4. [Performance Metrics](#performance-metrics)
5. [Error Tracking](#error-tracking)
6. [Implementation Examples](#implementation-examples)

---

## Overview

### Purpose
Provide centralized tracking and monitoring of:
- API calls (requests/responses)
- Application metrics (memory, CPU, throughput)
- Performance measurements (latency, duration)
- Error rates and error codes
- Health status and alerts

### Key Principles
1. **Non-invasive** - Minimal impact on application performance
2. **Centralized** - Single source of truth for all metrics
3. **Real-time** - Immediate metric updates and alerting
4. **Queryable** - Easy to retrieve and filter metrics
5. **Aggregatable** - Support for rolling windows and summaries

---

## Metrics System Architecture

### Core Components

```typescript
// Metrics collector (singleton)
export class MetricsCollector {
  private apiMetrics: Map<string, APIMetric[]>;
  private performanceMetrics: Map<string, number[]>;
  private errorMetrics: Map<string, ErrorMetric[]>;
  private healthMetrics: HealthMetric;
  
  // Record API call
  recordAPICall(endpoint: string, method: string, duration: number, status: number): void {}
  
  // Record performance measurement
  recordPerformance(label: string, duration: number): void {}
  
  // Record error occurrence
  recordError(code: string, message: string, severity: 'warn' | 'error' | 'critical'): void {}
  
  // Get current metrics
  getMetrics(filter?: FilterOptions): Metrics {}
  
  // Reset metrics
  reset(): void {}
  
  // Subscribe to updates
  on(event: 'metrics-updated' | 'alert', callback: Function): void {}
}

// Metrics aggregator (derives insights from raw metrics)
export class MetricsAggregator {
  calculateAverageLatency(endpoint: string): number {}
  calculateErrorRate(endpoint: string): number {}
  calculateThroughput(endpoint: string, timeWindow: number): number {}
  getHealthScore(): number {}
  detectAnomalies(): Anomaly[] {}
}
```

### Metric Categories

#### 1. API Metrics
```typescript
interface APIMetric {
  endpoint: string;           // /api/users, /health
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  timestamp: number;          // Unix timestamp
  duration: number;           // Milliseconds
  status: number;             // HTTP status code
  requestSize?: number;       // Bytes
  responseSize?: number;      // Bytes
  success: boolean;           // Status < 400
  errors?: string[];          // Error messages
}
```

#### 2. Performance Metrics
```typescript
interface PerformanceMetric {
  label: string;              // 'database_query', 'file_read'
  timestamp: number;
  duration: number;           // Milliseconds
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}
```

#### 3. Error Metrics
```typescript
interface ErrorMetric {
  code: string;               // 'ERR_001', 'ERR_VALIDATION_FAILED'
  message: string;
  timestamp: number;
  severity: 'warn' | 'error' | 'critical';
  context?: Record<string, any>;
  stackTrace?: string;
  count: number;              // How many times occurred
}
```

#### 4. Health Metrics
```typescript
interface HealthMetric {
  timestamp: number;
  cpuUsage: number;           // Percentage 0-100
  memoryUsage: number;        // Percentage 0-100
  uptime: number;             // Seconds
  requestsPerSecond: number;
  errorRate: number;          // Percentage 0-100
  avgLatency: number;         // Milliseconds
  status: 'healthy' | 'degraded' | 'impaired' | 'critical';
}
```

---

## API Call Tracking

### Implementation

```typescript
// Middleware for automatic API call tracking
export class APITrackingMiddleware {
  constructor(private metricsCollector: MetricsCollector) {}
  
  middleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = performance.now();
    
    // Intercept response
    const originalSend = res.send;
    res.send = (body: any) => {
      const duration = performance.now() - startTime;
      
      this.metricsCollector.recordAPICall({
        endpoint: req.path,
        method: req.method as any,
        duration,
        status: res.statusCode,
        requestSize: JSON.stringify(req.body).length,
        responseSize: JSON.stringify(body).length
      });
      
      return originalSend.call(res, body);
    };
    
    next();
  };
}

// Usage in server
app.use(new APITrackingMiddleware(metricsCollector).middleware);
```

### Tracking Key Endpoints

```typescript
// Critical endpoints to track
const TRACKED_ENDPOINTS = {
  // Health checks
  '/health': {
    method: 'GET',
    priority: 'high',
    alertThreshold: { latency: 100, errorRate: 0.01 }
  },
  
  // API endpoints
  '/api/users': { method: 'GET', priority: 'high' },
  '/api/users/:id': { method: 'GET', priority: 'medium' },
  '/api/data/process': { method: 'POST', priority: 'critical' },
  
  // Dashboard
  '/dashboard/metrics': { method: 'GET', priority: 'high' },
  '/dashboard/status': { method: 'GET', priority: 'medium' }
};
```

### Query API Metrics

```typescript
// Get metrics for specific endpoint
const userEndpointMetrics = metricsCollector.getMetrics({
  endpoint: '/api/users',
  method: 'GET',
  timeRange: '1h'  // Last hour
});

console.log({
  totalRequests: userEndpointMetrics.count,
  avgLatency: userEndpointMetrics.avgDuration,
  errorCount: userEndpointMetrics.errors,
  errorRate: userEndpointMetrics.errorRate,
  p95Latency: userEndpointMetrics.p95,
  p99Latency: userEndpointMetrics.p99
});
```

---

## Performance Metrics

### Types of Performance Measurements

#### Database Operations
```typescript
// Track database query performance
const startQuery = performance.now();
const result = await db.query('SELECT * FROM users');
const duration = performance.now() - startQuery;

metricsCollector.recordPerformance('db.query', duration, {
  operation: 'SELECT',
  table: 'users',
  rowsReturned: result.length
});
```

#### File Operations
```typescript
// Track file I/O
const startRead = performance.now();
const content = await Bun.file(path).text();
const duration = performance.now() - startRead;

metricsCollector.recordPerformance('file.read', duration, {
  path,
  sizeBytes: content.length
});
```

#### Processing Tasks
```typescript
// Track batch processing
const startProcess = performance.now();
const results = await processor.process(items);
const duration = performance.now() - startProcess;

metricsCollector.recordPerformance('batch.process', duration, {
  itemsProcessed: items.length,
  itemsSuccessful: results.successful,
  itemsFailed: results.failed
});
```

### Performance Thresholds

```typescript
const PERFORMANCE_THRESHOLDS = {
  'api.response': {
    warning: 500,      // milliseconds
    critical: 1000,
    unit: 'ms'
  },
  'db.query': {
    warning: 200,
    critical: 500,
    unit: 'ms'
  },
  'file.read': {
    warning: 100,
    critical: 500,
    unit: 'ms'
  },
  'memory.usage': {
    warning: 80,       // percentage
    critical: 95,
    unit: '%'
  }
};
```

---

## Error Tracking

### Error Code System

```typescript
// Centralized error code registry
export const ERROR_CODES = {
  // System Errors (1000-1999)
  'SYS_001': { message: 'System initialization failed', statusCode: 500 },
  'SYS_002': { message: 'Configuration loading failed', statusCode: 500 },
  'SYS_003': { message: 'Memory threshold exceeded', statusCode: 503 },
  
  // API Errors (2000-2999)
  'API_001': { message: 'Invalid request format', statusCode: 400 },
  'API_002': { message: 'Unauthorized access', statusCode: 401 },
  'API_003': { message: 'Resource not found', statusCode: 404 },
  'API_004': { message: 'Rate limit exceeded', statusCode: 429 },
  'API_005': { message: 'Internal server error', statusCode: 500 },
  
  // Validation Errors (3000-3999)
  'VAL_001': { message: 'Invalid email format', statusCode: 400 },
  'VAL_002': { message: 'Invalid phone number', statusCode: 400 },
  'VAL_003': { message: 'Missing required field', statusCode: 400 },
  'VAL_004': { message: 'Password too weak', statusCode: 400 },
  
  // Database Errors (4000-4999)
  'DB_001': { message: 'Database connection failed', statusCode: 503 },
  'DB_002': { message: 'Query timeout', statusCode: 504 },
  'DB_003': { message: 'Duplicate entry', statusCode: 409 },
  'DB_004': { message: 'Transaction failed', statusCode: 500 },
  
  // Authentication Errors (5000-5999)
  'AUTH_001': { message: 'Invalid credentials', statusCode: 401 },
  'AUTH_002': { message: 'Session expired', statusCode: 401 },
  'AUTH_003': { message: 'Token invalid', statusCode: 401 },
  
  // Business Logic Errors (6000-6999)
  'BIZ_001': { message: 'Insufficient funds', statusCode: 400 },
  'BIZ_002': { message: 'Duplicate registration', statusCode: 409 },
  'BIZ_003': { message: 'Resource already in use', statusCode: 409 }
};
```

### Error Tracking Implementation

```typescript
export class ErrorTracker {
  constructor(private metricsCollector: MetricsCollector) {}
  
  trackError = (code: string, context?: Record<string, any>) => {
    const errorInfo = ERROR_CODES[code];
    
    this.metricsCollector.recordError({
      code,
      message: errorInfo?.message || 'Unknown error',
      timestamp: Date.now(),
      severity: this.determineSeverity(code),
      context
    });
    
    // Create proper error with code
    const error = new ApplicationError(
      errorInfo?.message || 'Unknown error',
      code,
      errorInfo?.statusCode || 500
    );
    
    return error;
  };
  
  private determineSeverity = (code: string): 'warn' | 'error' | 'critical' => {
    if (code.startsWith('SYS_') || code.startsWith('DB_')) return 'critical';
    if (code.startsWith('API_') || code.startsWith('AUTH_')) return 'error';
    return 'warn';
  };
}
```

---

## Implementation Examples

### Example 1: Track API Request

```typescript
// In your API handler
app.get('/api/users/:id', async (req, res) => {
  const startTime = performance.now();
  
  try {
    const user = await db.users.findById(req.params.id);
    
    if (!user) {
      throw errorTracker.trackError('API_003', { userId: req.params.id });
    }
    
    const duration = performance.now() - startTime;
    metricsCollector.recordAPICall({
      endpoint: '/api/users/:id',
      method: 'GET',
      duration,
      status: 200
    });
    
    res.json(user);
  } catch (error) {
    const duration = performance.now() - startTime;
    metricsCollector.recordAPICall({
      endpoint: '/api/users/:id',
      method: 'GET',
      duration,
      status: error.statusCode || 500
    });
    
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});
```

### Example 2: Track Performance Issue

```typescript
// Detect slow endpoints
setInterval(() => {
  const metrics = metricsCollector.getMetrics({
    timeRange: '5m'
  });
  
  Object.entries(metrics.endpoints).forEach(([endpoint, stats]) => {
    if (stats.avgLatency > PERFORMANCE_THRESHOLDS['api.response'].warning) {
      logger.warn(`Slow endpoint detected: ${endpoint}`, {
        avgLatency: stats.avgLatency,
        p95: stats.p95,
        errorRate: stats.errorRate
      });
      
      // Alert dashboard
      dashboard.addAlert({
        type: 'performance',
        severity: stats.avgLatency > PERFORMANCE_THRESHOLDS['api.response'].critical ? 'critical' : 'warning',
        message: `Endpoint ${endpoint} is slow (avg: ${stats.avgLatency}ms)`
      });
    }
  });
}, 60000); // Every minute
```

### Example 3: Health Score Calculation

```typescript
// Calculate overall health
export function calculateHealthScore(metrics: Metrics): number {
  const weights = {
    errorRate: 0.3,
    latency: 0.3,
    uptime: 0.2,
    memoryUsage: 0.1,
    cpuUsage: 0.1
  };
  
  const scores = {
    errorRate: Math.max(0, 100 - (metrics.errorRate * 100)),
    latency: Math.max(0, 100 - (metrics.avgLatency / 10)),
    uptime: Math.min(100, (metrics.uptime / 86400) * 100), // Daily uptime
    memoryUsage: Math.max(0, 100 - metrics.memoryUsage),
    cpuUsage: Math.max(0, 100 - metrics.cpuUsage)
  };
  
  const healthScore = Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (scores[key] * weight);
  }, 0);
  
  return Math.round(healthScore);
}
```

---

## Querying Metrics

### Common Queries

```typescript
// Last hour metrics
const hourMetrics = metricsCollector.getMetrics({
  timeRange: '1h'
});

// Last 24 hours with aggregation
const dailyMetrics = metricsCollector.getMetrics({
  timeRange: '24h',
  aggregation: 'hourly'
});

// Per-endpoint breakdown
const endpointMetrics = metricsCollector.getMetrics({
  groupBy: 'endpoint',
  timeRange: '1h'
});

// Error rate trend
const errorTrend = metricsCollector.getMetrics({
  timeRange: '7d',
  groupBy: 'day',
  metric: 'error_rate'
});

// Percentile latencies
const latencyPercentiles = metricsCollector.getMetrics({
  timeRange: '1h',
  percentiles: [50, 75, 90, 95, 99]
});
```

---

## Alerting Rules

```typescript
export const ALERT_RULES = {
  // Error rate alerts
  'error_rate_high': {
    condition: (metrics) => metrics.errorRate > 0.05,
    message: 'Error rate above 5%',
    severity: 'critical',
    actionable: true
  },
  
  // Latency alerts
  'latency_high': {
    condition: (metrics) => metrics.avgLatency > 1000,
    message: 'Average latency above 1 second',
    severity: 'warning'
  },
  
  // Memory alerts
  'memory_critical': {
    condition: (metrics) => metrics.memoryUsage > 0.95,
    message: 'Memory usage above 95%',
    severity: 'critical',
    action: 'triggerGC'
  },
  
  // Uptime alerts
  'uptime_low': {
    condition: (metrics) => metrics.uptime < 3600,
    message: 'Application running for less than 1 hour',
    severity: 'info'
  }
};
```

---

## Dashboard Integration

The metrics system feeds into the Dashboard for real-time visualization:

```typescript
// Dashboard displays:
- Request rates (req/sec)
- Error rates (%)
- Average latency (ms)
- P95/P99 latencies (ms)
- Memory usage (%)
- CPU usage (%)
- Uptime
- Health score (0-100)
- Active alerts
- Endpoint slowness indicators
- Error code frequency
```

---

## Best Practices

1. **Minimize Overhead** - Use async metric recording
2. **Aggregate Data** - Store rolled-up summaries, not raw data
3. **Set Retention** - Delete old metrics automatically
4. **Alert Fatigue** - Avoid too many alerts with tuned thresholds
5. **Context** - Always include relevant context with metrics
6. **Consistency** - Use standardized metric names and dimensions
7. **Documentation** - Keep error codes and metrics documented
8. **Testing** - Test metrics under load

---

**Last Updated**: January 9, 2026  
**Status**: Framework and Best Practices  
**Next Steps**: Implement MetricsCollector class and integrate with services
