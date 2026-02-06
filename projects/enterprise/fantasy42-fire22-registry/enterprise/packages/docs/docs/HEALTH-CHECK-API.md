# 🚀 **Crystal Clear Architecture - Health Check API**

## 📊 **Overview**

The Crystal Clear Architecture Health Check API provides comprehensive system
monitoring and health assessment capabilities. This enterprise-grade health
monitoring system covers all aspects of system health including system
resources, databases, external services, applications, performance, security,
and caching.

## 🏗️ **Architecture**

```text
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Health Router │────│ Health Services  │────│ Health Service  │
│   (/api/health) │    │ (System, DB, ...)│    │ (Main Interface)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Express Server  │    │ Health Monitoring│    │  Metrics &      │
│                 │    │  Middleware      │    │  Alerts         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔗 **API Endpoints**

### **Basic Health Checks**

#### `GET /api/health`

**Basic health check endpoint**

```bash
curl http://localhost:3000/api/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-28T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "development"
}
```

#### `GET /api/health/ping`

**Simple ping/pong health check**

```bash
curl http://localhost:3000/api/health/ping
```

#### `GET /api/health/status`

**Detailed system status**

```bash
curl http://localhost:3000/api/health/status
```

---

### **System Health Endpoints**

#### `GET /api/health/system`

**Comprehensive system health information**

```bash
curl http://localhost:3000/api/health/system
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-28T10:30:00.000Z",
  "uptime": 3600,
  "loadAverage": [1.2, 1.5, 1.8],
  "cpuUsage": 45.2,
  "memoryUsage": {
    "total": 8589934592,
    "used": 4294967296,
    "free": 4294967296,
    "usagePercent": 50.0
  },
  "diskUsage": [
    {
      "mount": "/",
      "total": 100000000000,
      "used": 50000000000,
      "free": 50000000000,
      "usagePercent": 50.0
    }
  ],
  "networkInterfaces": [...]
}
```

#### `GET /api/health/system/cpu`

**CPU usage and information**

#### `GET /api/health/system/memory`

**Memory usage and statistics**

#### `GET /api/health/system/disk`

**Disk usage and filesystem information**

#### `GET /api/health/system/network`

**Network interface and connectivity information**

---

### **Database Health Endpoints**

#### `GET /api/health/database`

**Database connectivity and performance health**

```bash
curl http://localhost:3000/api/health/database
```

#### `GET /api/health/database/connection`

**Database connection pool status**

#### `GET /api/health/database/performance`

**Database performance metrics**

#### `GET /api/health/database/migrations`

**Database migration status**

---

### **External Services Health Endpoints**

#### `GET /api/health/external`

**External service dependencies health**

```bash
curl http://localhost:3000/api/health/external
```

#### `GET /api/health/external/:service`

**Individual external service health**

```bash
curl http://localhost:3000/api/health/external/GitHub%20API
```

---

### **Application Health Endpoints**

#### `GET /api/health/application`

**Application-specific health metrics**

#### `GET /api/health/application/domains`

**Domain-specific health status**

#### `GET /api/health/application/tasks`

**Background task processing health**

---

### **Performance Health Endpoints**

#### `GET /api/health/performance`

**Performance metrics and monitoring**

#### `GET /api/health/performance/response-times`

**API response time metrics**

#### `GET /api/health/performance/throughput`

**System throughput metrics**

#### `GET /api/health/performance/error-rates`

**Error rate monitoring**

---

### **Cache Health Endpoints**

#### `GET /api/health/cache`

**Cache health and performance metrics**

#### `GET /api/health/cache/hit-rates`

**Cache hit rate metrics**

#### `POST /api/health/cache/clear`

**Clear cache (admin only)**

---

### **Security Health Endpoints**

#### `GET /api/health/security`

**Security status and compliance checks**

#### `GET /api/health/security/auth`

**Authentication system health**

#### `GET /api/health/security/ssl`

**SSL/TLS certificate status**

---

### **Comprehensive Health Check**

#### `GET /api/health/comprehensive`

**All-in-one comprehensive health check**

```bash
curl http://localhost:3000/api/health/comprehensive
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-28T10:30:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "development",
  "summary": {
    "totalServices": 7,
    "healthyServices": 6,
    "unhealthyServices": 1,
    "degradedServices": 1,
    "criticalServices": 0
  },
  "services": {
    "system": {...},
    "database": {...},
    "external": {...},
    "application": {...},
    "performance": {...},
    "cache": {...},
    "security": {...}
  },
  "alerts": [
    {
      "service": "Performance",
      "status": "degraded",
      "message": "Response time above threshold",
      "timestamp": "2025-01-28T10:30:00.000Z",
      "severity": "high"
    }
  ],
  "recommendations": [
    "Consider optimizing database queries",
    "Monitor memory usage during peak hours",
    "Review error logs for potential issues"
  ]
}
```

#### `GET /api/health/metrics`

**Prometheus-style metrics endpoint**

```bash
curl http://localhost:3000/api/health/metrics
```

---

## 📈 **Health Status Codes**

| Status     | HTTP Code | Description                       |
| ---------- | --------- | --------------------------------- |
| `healthy`  | 200       | All systems operational           |
| `degraded` | 200       | Some services under elevated load |
| `critical` | 503       | Critical system failures detected |

## 🔧 **Configuration**

### **Environment Variables**

```bash
# Database Health Check
DATABASE_URL=postgresql://localhost:5432/crystal_clear

# External Services Configuration
HEALTH_CHECK_SERVICE_GITHUB_API='{"name":"GitHub API","url":"https://api.github.com/zen","type":"api","timeout":5000,"expectedStatus":200}'
HEALTH_CHECK_SERVICE_NPM_REGISTRY='{"name":"NPM Registry","url":"https://registry.npmjs.org/","type":"api","timeout":5000,"expectedStatus":200}'

# Health Check Intervals
HEALTH_CHECK_INTERVAL=30000          # 30 seconds
HEALTH_CHECK_CACHE_TIMEOUT=300000    # 5 minutes
```

### **Custom Health Checks**

```typescript
import { ExternalServicesHealthService } from '../services/health/external-services-health.service';

const externalHealth = new ExternalServicesHealthService();

// Add custom service to monitor
externalHealth.addService({
  name: 'Payment Gateway',
  url: 'https://api.payment-gateway.com/health',
  type: 'api',
  timeout: 3000,
  expectedStatus: 200,
  headers: {
    Authorization: 'Bearer your-token',
  },
});
```

---

## 📊 **Monitoring & Alerting**

### **Real-time Streaming**

#### `GET /api/health/metrics/stream`

Server-sent events for real-time metrics updates

```javascript
const eventSource = new EventSource('/api/health/metrics/stream');

eventSource.onmessage = event => {
  const data = JSON.parse(event.data);
  console.log('Real-time metrics:', data);
};
```

### **Alert Configuration**

```typescript
// Configure alert thresholds
const alertThresholds = {
  cpuUsage: { warning: 70, critical: 90 },
  memoryUsage: { warning: 75, critical: 90 },
  responseTime: { warning: 1000, critical: 2000 },
  errorRate: { warning: 0.05, critical: 0.1 },
};
```

### **Integration with Monitoring Systems**

```typescript
// Prometheus metrics integration
const metrics = await healthService.getPrometheusMetrics();
// Send to Prometheus pushgateway

// Custom alerting
const health = await healthService.getComprehensiveHealth();
if (health.status !== 'healthy') {
  await sendAlert(health.alerts);
}
```

---

## 🚀 **Integration Examples**

### **Express.js Integration**

```typescript
import express from 'express';
import { healthService } from './services/health/health.service';
import healthRouter from './api/health-router';

const app = express();

// Mount health check routes
app.use('/api/health', healthRouter);

// Health monitoring middleware
app.use(async (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    healthService.recordPerformanceMetrics(responseTime, success);
  });

  next();
});

app.listen(3000, () => {
  console.log('🚀 Server running with comprehensive health monitoring');
});
```

### **Docker Health Checks**

```dockerfile
# Dockerfile with health checks
FROM node:18-alpine

COPY . /app
WORKDIR /app

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000
CMD ["npm", "start"]
```

### **Kubernetes Integration**

```yaml
# Kubernetes pod with health checks
apiVersion: v1
kind: Pod
metadata:
  name: crystal-clear-api
spec:
  containers:
    - name: api
      image: crystal-clear-api:latest
      ports:
        - containerPort: 3000
      livenessProbe:
        httpGet:
          path: /api/health
          port: 3000
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /api/health/status
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 5
```

---

## 📋 **API Response Format**

### **Standard Response Structure**

```json
{
  "status": "healthy|degraded|critical",
  "timestamp": "ISO8601 timestamp",
  "data": {
    // Service-specific data
  },
  "error": "Error message (if applicable)",
  "code": "Error code (if applicable)"
}
```

### **Comprehensive Health Response**

```json
{
  "status": "healthy|degraded|critical",
  "timestamp": "ISO8601 timestamp",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "development",
  "summary": {
    "totalServices": 7,
    "healthyServices": 6,
    "unhealthyServices": 1,
    "degradedServices": 1,
    "criticalServices": 0
  },
  "services": {
    "system": {
      /* System health data */
    },
    "database": {
      /* Database health data */
    },
    "external": {
      /* External services data */
    },
    "application": {
      /* Application health data */
    },
    "performance": {
      /* Performance metrics */
    },
    "cache": {
      /* Cache health data */
    },
    "security": {
      /* Security status */
    }
  },
  "alerts": [
    {
      "service": "Service Name",
      "status": "degraded|critical",
      "message": "Alert description",
      "timestamp": "ISO8601 timestamp",
      "severity": "low|medium|high|critical"
    }
  ],
  "recommendations": ["Recommendation text", "Another recommendation"]
}
```

---

## 🔍 **Troubleshooting**

### **Common Issues**

**❌ Health checks return 500 errors**

```bash
# Check service logs
tail -f /var/log/crystal-clear/health.log

# Verify database connectivity
curl http://localhost:3000/api/health/database

# Check external service availability
curl http://localhost:3000/api/health/external
```

**❌ Real-time metrics not updating**

```bash
# Check EventSource connection
curl -I http://localhost:3000/api/health/metrics/stream

# Verify CORS configuration
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     http://localhost:3000/api/health/metrics/stream
```

**❌ High memory usage in health service**

```bash
# Check cache configuration
curl http://localhost:3000/api/health/cache

# Clear cache if needed
curl -X POST http://localhost:3000/api/health/cache/clear
```

### **Debug Mode**

```typescript
// Enable detailed logging
process.env.HEALTH_DEBUG = 'true';

// Get detailed service information
const health = await healthService.getComprehensiveHealth();
console.log(JSON.stringify(health, null, 2));
```

---

## 📚 **Related Documentation**

- [System Architecture](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Performance Monitoring](./PERFORMANCE_METRICS.md)
- [Security Guidelines](./SECURITY.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

## 🎯 **Best Practices**

### **Health Check Design**

1. **Fast Execution**: Health checks should complete in <1 second
2. **No Side Effects**: Checks should not modify system state
3. **Independent**: Each check should work independently
4. **Informative**: Provide actionable error messages

### **Monitoring Strategy**

1. **Multiple Levels**: Basic, detailed, and comprehensive checks
2. **Appropriate Intervals**: Different checks at different frequencies
3. **Alert Thresholds**: Configurable warning and critical levels
4. **Historical Data**: Track trends over time

### **Production Deployment**

1. **Load Balancer Integration**: Use for service discovery
2. **Container Orchestration**: Kubernetes readiness/liveness probes
3. **Monitoring Integration**: Prometheus, Grafana, DataDog
4. **Automated Remediation**: Self-healing capabilities

---

**🚀 The Crystal Clear Health Check API provides enterprise-grade monitoring and
observability, ensuring your application remains healthy, performant, and
reliable in production environments.**
