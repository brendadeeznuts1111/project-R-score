# Monitoring Services

Real-time monitoring, observability, and health check services.

## 📊 Services

### **Monitoring Service** (`monitoring-service.ts`)
Comprehensive monitoring solution for URL structure migration and application health:
- Real-time metrics collection
- Error rate tracking
- Performance monitoring
- User satisfaction metrics
- Alert system with configurable thresholds
- Health check endpoints
- Dashboard data aggregation

## 🚀 Features

### **Metrics Collection**
- Response time tracking
- Error rate monitoring
- Redirect success rates
- User satisfaction scores
- System resource usage

### **Alerting System**
- Configurable thresholds
- Real-time notifications
- Multi-channel alerts (console, logs, webhooks)
- Alert escalation rules

### **Health Checks**
- Service availability checks
- Dependency health monitoring
- Database connectivity
- External API status

## 📈 Usage

```typescript
import MonitoringService from './monitoring-service';

// Initialize monitoring
const monitoring = new MonitoringService({
  port: 3002,
  alertThresholds: {
    errorRate: 5.0,
    responseTime: 500,
    userSatisfaction: 4.0
  }
});

// Start monitoring server
await monitoring.start();

// Record custom metrics
monitoring.recordMetric('custom_event', {
  value: 42,
  tags: ['service', 'api']
});
```

## 🔧 Configuration

Environment variables:
- `MONITORING_SERVICE_PORT` - Service port (default: 3002)
- `ALERT_WEBHOOK_URL` - Webhook for alert notifications
- `METRICS_RETENTION_HOURS` - How long to keep metrics data
- `HEALTH_CHECK_INTERVAL` - Health check frequency in seconds

## 📊 Endpoints

- `GET /health` - Service health status
- `GET /metrics` - Current metrics
- `GET /alerts` - Active alerts
- `POST /alerts/acknowledge` - Acknowledge alerts

## 🔗 Dependencies

- Bun runtime for HTTP server
- Shared logging from `/lib/monitoring/`
- Configuration from environment variables
