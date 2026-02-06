# 🌐 Cloudflare + R2 Status Endpoints Documentation

## 📋 Overview

The Empire Pro CLI provides comprehensive status endpoints deployed on Cloudflare Workers with R2 bucket integration for real-time monitoring and analytics.

---

## 🚀 Architecture Overview

```ascii
╔══════════════════════════════════════════════════════════════╗
║                 🌐 Cloudflare Deployment                    ║
╠══════════════════════════════════════════════════════════════╣
║  🌍 Edge Network    │  ⚡ Cloudflare Workers  │  📦 R2 Storage  ║
║  ────────────────── │  ───────────────────── │  ─────────────  ║
║  • Global CDN       │  • Status Endpoints   │  • Reports      ║
║  • Cache Layer      │  • Health Checks      │  • Analytics    ║
║  • DDoS Protection  │  • Metrics API        │  • Backups      ║
║  • Auto-scaling     │  • Analytics Export   │  • Archives     ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 📍 Available Endpoints

### 📊 **Primary Status Endpoint**
```text
GET https://status.empire-pro-cli.com/status
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-15T06:00:00.000Z",
    "uptime": 86400000,
    "version": "3.7.0",
    "environment": "production",
    "services": [
      {
        "name": "Enhanced Tracker",
        "status": "healthy",
        "responseTime": 12,
        "lastCheck": "2026-01-15T06:00:00.000Z"
      }
    ],
    "metrics": {
      "memory": {
        "used": 104857600,
        "total": 209715200,
        "percentage": 50.0
      },
      "performance": {
        "averageResponseTime": 25.5,
        "requestsPerSecond": 45.2,
        "errorRate": 1.2,
        "nativeImplementationRate": 95.8
      }
    },
    "deployment": {
      "platform": "cloudflare",
      "region": "us-east-1",
      "r2": {
        "bucket": "empire-pro-reports",
        "status": "connected",
        "objects": 127,
        "size": 5242880
      }
    },
    "analytics": {
      "totalAPIs": 17,
      "totalCalls": 15420,
      "activeDomains": 8,
      "insights": 5
    }
  },
  "timestamp": "2026-01-15T06:00:00.000Z",
  "endpoint": "/status"
}
```

---

### 🏥 **Health Check Endpoint**
```text
GET https://status.empire-pro-cli.com/health
```

**Lightweight health check for monitoring systems:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-15T06:00:00.000Z",
    "uptime": 86400000,
    "checks": [
      {
        "name": "tracker",
        "status": "healthy",
        "responseTime": 5
      },
      {
        "name": "analytics",
        "status": "healthy",
        "responseTime": 8
      },
      {
        "name": "config",
        "status": "healthy",
        "responseTime": 2
      },
      {
        "name": "r2",
        "status": "healthy",
        "responseTime": 15
      }
    ]
  },
  "timestamp": "2026-01-15T06:00:00.000Z",
  "endpoint": "/health"
}
```

---

### 📈 **Metrics Endpoint**
```text
GET https://status.empire-pro-cli.com/metrics
```

**Detailed performance metrics:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-01-15T06:00:00.000Z",
    "performance": {
      "totalAPIs": 17,
      "totalCalls": 15420,
      "nativeImplementationRate": 95.8,
      "averageResponseTime": 25.5,
      "errorRate": 1.2
    },
    "analytics": {
      "insights": [
        {
          "type": "performance",
          "severity": "warning",
          "title": "High Average Response Time",
          "description": "Average response time is 25.5ms"
        }
      ],
      "domainAnalytics": [
        {
          "domain": "filesystem",
          "totalCalls": 5420,
          "averageResponseTime": 12.3,
          "performanceScore": 85
        }
      ]
    },
    "system": {
      "memory": {
        "used": 104857600,
        "total": 209715200,
        "percentage": 50.0
      },
      "network": {
        "requests": 15420,
        "errors": 185,
        "responseTime": 25.5
      }
    }
  },
  "timestamp": "2026-01-15T06:00:00.000Z",
  "endpoint": "/metrics"
}
```

---

### 📊 **Analytics Endpoint**
```text
GET https://status.empire-pro-cli.com/analytics
GET https://status.empire-pro-cli.com/analytics?format=csv
GET https://status.empire-pro-cli.com/analytics?format=html
```

**Export analytics data in multiple formats:**

- **JSON** (default): Complete analytics data
- **CSV**: Domain performance metrics
- **HTML**: Visual report with charts

---

## 🏗️ Deployment Configuration

### 📦 **Cloudflare Worker Configuration**

**wrangler.toml:**
```toml
name = "empire-pro-status"
main = "deployment/workers/status-worker.ts"
compatibility_date = "2026-01-15"

[env.production]
vars = { ENVIRONMENT = "production" }
r2_buckets = [{ binding = "REPORTS_BUCKET", bucket_name = "empire-pro-reports" }]

[[env.production.routes]]
pattern = "status.empire-pro-cli.com/*"
zone_name = "empire-pro-cli.com"

[env.production.triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes
```

### 🗄️ **R2 Bucket Setup**

**Environment Variables:**
```bash
R2_BUCKET_NAME=empire-pro-reports
R2_REGION=auto
CLOUDFLARE_REGION=us-east-1
CLOUDFLARE_DATACENTER=iad12
CF_EDGE_LOCATION=us-east-1
```

**Bucket Structure:**
```text
empire-pro-reports/
├── reports/
│   ├── 2026-01-15/
│   │   ├── bun-native-metrics-2026-01-15T06-00-00-000Z.json
│   │   └── analytics-report-2026-01-15T06-00-00-000Z.html
├── analytics/
│   ├── domain-breakdowns/
│   └── performance-trends/
└── backups/
    └── archived-reports/
```

---

## 🔧 Integration Examples

### 📱 **Client-side Monitoring**

**JavaScript/TypeScript:**
```typescript
interface StatusResponse {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  services: Array<{
    name: string;
    status: string;
    responseTime: number;
  }>;
}

class EmpireProMonitor {
  private baseUrl = 'https://status.empire-pro-cli.com';
  
  async getStatus(): Promise<StatusResponse> {
    const response = await fetch(`${this.baseUrl}/status`);
    const data = await response.json();
    return data.data;
  }
  
  async watchStatus(callback: (status: StatusResponse) => void): Promise<void> {
    const poll = async () => {
      try {
        const status = await this.getStatus();
        callback(status);
      } catch (error) {
        console.error('Status check failed:', error);
      }
    };
    
    // Poll every 30 seconds
    setInterval(poll, 30000);
    await poll(); // Initial check
  }
}

// Usage
const monitor = new EmpireProMonitor();
monitor.watchStatus((status) => {
  console.log('System status:', status.status);
  if (status.status === 'degraded') {
    // Send alert
  }
});
```

---

### 🤖 **Server Integration**

**Bun.sh Integration:**
```typescript
import { statusEndpoint } from './server/status-endpoint.js';

// Add status endpoint to your existing server
server.get('/api/status', async () => {
  const status = await statusEndpoint.getStatus();
  return Response.json(status);
});

// Health check for load balancers
server.get('/api/health', async () => {
  const health = await statusEndpoint.getHealthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  return new Response(JSON.stringify(health), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

### 📊 **Dashboard Integration**

**React Component:**
```tsx
import React, { useState, useEffect } from 'react';

interface StatusData {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  metrics: {
    performance: {
      averageResponseTime: number;
      requestsPerSecond: number;
      errorRate: number;
    };
  };
}

export const StatusDashboard: React.FC = () => {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('https://status.empire-pro-cli.com/status');
        const data = await response.json();
        setStatus(data.data);
      } catch (error) {
        console.error('Failed to fetch status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (loading) return <div>Loading status...</div>;
  if (!status) return <div>Failed to load status</div>;
  
  const statusColor = status.status === 'healthy' ? 'green' : 
                     status.status === 'degraded' ? 'yellow' : 'red';
  
  return (
    <div className="status-dashboard">
      <div className={`status-indicator ${statusColor}`}>
        Status: {status.status.toUpperCase()}
      </div>
      <div className="metrics">
        <div>Response Time: {status.metrics.performance.averageResponseTime}ms</div>
        <div>Requests/sec: {status.metrics.performance.requestsPerSecond}</div>
        <div>Error Rate: {status.metrics.performance.errorRate}%</div>
        <div>Uptime: {Math.floor(status.uptime / 3600000)}h</div>
      </div>
    </div>
  );
};
```

---

## 🚨 Alerting & Monitoring

### 📧 **Email Alerts**

**Scheduled health check with alerts:**
```typescript
export async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  const health = await statusEndpoint.getHealthCheck();
  
  if (health.status !== 'healthy') {
    // Send alert via email or webhook
    await sendAlert({
      level: health.status === 'down' ? 'critical' : 'warning',
      message: `Empire Pro CLI status: ${health.status}`,
      details: health.checks.filter(c => c.status !== 'healthy')
    });
  }
}
```

### 📱 **Slack Integration**

**Webhook notification:**
```typescript
async function sendSlackAlert(status: any) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  
  const payload = {
    text: `🚨 Empire Pro CLI Status Alert`,
    attachments: [{
      color: status.status === 'healthy' ? 'good' : 'danger',
      fields: [
        { title: 'Status', value: status.status, short: true },
        { title: 'Uptime', value: `${Math.floor(status.uptime / 3600000)}h`, short: true },
        { title: 'Failed Services', value: status.checks.filter(c => c.status !== 'healthy').length, short: true }
      ]
    }]
  };
  
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

---

## 📈 Performance Optimization

### ⚡ **Caching Strategy**

**Cloudflare Cache Headers:**
```typescript
// Add to status worker
const cacheHeaders = {
  'Cache-Control': 'public, max-age=30', // 30 seconds for status
  'CDN-Cache-Control': 'public, max-age=60', // 1 minute CDN cache
  'Edge-Cache-Control': 'public, max-age=300' // 5 minutes edge cache
};

// Health check (no caching)
if (path === '/health') {
  return new Response(JSON.stringify(health), {
    headers: { 'Cache-Control': 'no-cache' }
  });
}
```

### 🗄️ **R2 Optimization**

**Multipart upload for large reports:**
```typescript
async function uploadLargeReport(data: any, key: string) {
  const chunkSize = 100 * 1024 * 1024; // 100MB chunks
  const uploadId = await R2_BUCKET.createMultipartUpload(key);
  
  const parts = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const part = await R2_BUCKET.uploadPart(uploadId, i + 1, chunk);
    parts.push({ partNumber: i + 1, etag: part.etag });
  }
  
  await R2_BUCKET.completeMultipartUpload(uploadId, parts);
}
```

---

## 🔒 Security Considerations

### 🛡️ **Authentication**

**Optional API key authentication:**
```typescript
// Add to worker
if (path.startsWith('/admin/')) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const token = authHeader.substring(7);
  if (token !== env.API_KEY) {
    return new Response('Forbidden', { status: 403 });
  }
}
```

### 🔍 **Rate Limiting**

**DDoS protection:**
```typescript
// Simple rate limiting
const rateLimit = new Map<string, number>();

function checkRateLimit(ip: string): boolean {
  const count = rateLimit.get(ip) || 0;
  if (count > 100) return false; // 100 requests per minute
  
  rateLimit.set(ip, count + 1);
  setTimeout(() => rateLimit.delete(ip), 60000);
  return true;
}
```

---

## 📚 API Reference

### 📊 **Response Codes**

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Successful request |
| 503 | Service Unavailable | System degraded or down |
| 429 | Too Many Requests | Rate limit exceeded |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Invalid credentials |

### 🏷️ **Status Values**

| Status | Description | Action |
|--------|-------------|--------|
| `healthy` | All systems operational | No action needed |
| `degraded` | Some issues detected | Monitor closely |
| `down` | Critical failures | Immediate attention required |

---

## 🚀 Getting Started

### 1. **Deploy to Cloudflare**
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy worker
wrangler deploy --env production
```

### 2. **Configure R2 Bucket**
```bash
# Create R2 bucket
wrangler r2 bucket create empire-pro-reports

# Set environment variables
wrangler secret put R2_BUCKET_NAME
wrangler secret put API_KEY
```

### 3. **Test Endpoints**
```bash
# Test health check
curl https://status.empire-pro-cli.com/health

# Get full status
curl https://status.empire-pro-cli.com/status

# Export analytics as CSV
curl "https://status.empire-pro-cli.com/analytics?format=csv"
```

---

## 🎯 Best Practices

- ✅ **Monitor health checks** every 30 seconds
- ✅ **Set up alerts** for degraded/down status
- ✅ **Cache status data** appropriately (30s-5min)
- ✅ **Use R2 for report storage** and backups
- ✅ **Implement rate limiting** to prevent abuse
- ✅ **Secure admin endpoints** with authentication
- ✅ **Log all status changes** for audit trails
- ✅ **Test failover scenarios** regularly

---

## 📞 Support

For issues with the status endpoints:
- 📧 Email: support@empire-pro-cli.com
- 📱 Slack: #status-alerts
- 🐛 Issues: https://github.com/brendadeeznuts1111/duo-automation/issues

**Status Page**: https://status.empire-pro-cli.com  
**Documentation**: https://docs.empire-pro-cli.com/status  
**API Reference**: https://api.empire-pro-cli.com/status
