/**
 * Worker Monitoring Configuration
 * Configuration and setup guide for enhanced worker monitoring
 */

export interface WorkerMonitoringConfig {
  monitoring: {
    enabled: boolean;
    endpoint?: string;
    alertWebhookUrl?: string;
    batchSize: number;
    batchInterval: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableRequestTracing: boolean;
    enablePerformanceLogging: boolean;
  };
  alerts: {
    errorRateThreshold: number;
    responseTimeThreshold: number;
    serverErrorThreshold: number;
    enableWebhookAlerts: boolean;
  };
  health: {
    checkInterval: number;
    cacheTtl: number;
    enableDetailedChecks: boolean;
  };
}

/**
 * Default configuration for worker monitoring
 */
export const defaultWorkerMonitoringConfig: WorkerMonitoringConfig = {
  monitoring: {
    enabled: true,
    endpoint: process.env.MONITORING_ENDPOINT,
    alertWebhookUrl: process.env.ALERT_WEBHOOK_URL,
    batchSize: 10,
    batchInterval: 30000, // 30 seconds
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    enableRequestTracing: true,
    enablePerformanceLogging: true,
  },
  alerts: {
    errorRateThreshold: 0.05, // 5%
    responseTimeThreshold: 2000, // 2 seconds
    serverErrorThreshold: 5, // 5+ 5xx errors
    enableWebhookAlerts: true,
  },
  health: {
    checkInterval: 30000, // 30 seconds
    cacheTtl: 30000, // 30 seconds
    enableDetailedChecks: true,
  },
};

/**
 * Environment variable mapping for Cloudflare Workers
 */
export const workerEnvironmentConfig = {
  // Monitoring configuration
  MONITORING_ENABLED: 'true',
  MONITORING_ENDPOINT: 'https://your-monitoring-endpoint.com/api/worker-metrics',
  ALERT_WEBHOOK_URL: 'https://your-slack-webhook.com/alerts',

  // Worker identification
  WORKER_ID: 'dashboard-worker',

  // Logging configuration
  LOG_LEVEL: 'info', // debug, info, warn, error

  // Database and cache (if available)
  DB_URL: 'your-database-url',
  CACHE_URL: 'your-cache-url',
};

/**
 * Setup instructions for worker monitoring
 */
export const setupInstructions = {
  environmentVariables: `
# Add these to your Cloudflare Worker environment variables:

MONITORING_ENABLED=true
MONITORING_ENDPOINT=https://your-monitoring-endpoint.com/api/worker-metrics
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
WORKER_ID=dashboard-worker
LOG_LEVEL=info

# Optional: Database and cache endpoints
DB_URL=your-database-connection-string
CACHE_URL=your-cache-endpoint
  `,

  monitoringEndpoints: `
# Available monitoring endpoints:

GET /health     - Comprehensive health check
GET /metrics    - Real-time performance metrics
GET /alerts     - Active alerts and warnings
GET /profile    - Performance profiling and recommendations
GET /config     - Worker configuration and features

# Example usage:
curl https://your-worker.com/health
curl https://your-worker.com/metrics
  `,

  integrationWithMainSystem: `
# To integrate with your main monitoring system:

1. Set MONITORING_ENDPOINT to your main monitoring API
2. The worker will automatically send metrics batches
3. Alerts are forwarded to both local logs and main system
4. Health checks sync periodically with main monitoring

# Main system should expect:
POST /api/worker-metrics
Content-Type: application/json
{
  "type": "worker_metrics_batch",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "metrics": [...]
}
  `,

  alertingSetup: `
# Alerting configuration:

1. Set ALERT_WEBHOOK_URL for external notifications
2. Alerts trigger on:
   - Error rate > 5%
   - Average response time > 2 seconds
   - 5xx errors > 5 in short period

3. Alerts include:
   - Severity level (high, medium, critical)
   - Detailed metrics
   - Trace IDs for debugging
   - Performance recommendations
  `,

  performanceOptimization: `
# Performance optimization tips:

1. Enable caching for health checks (30s TTL)
2. Batch metrics sending (10 metrics per batch)
3. Use background processing for non-critical tasks
4. Monitor memory usage in Cloudflare Workers
5. Set appropriate log levels for production

# Recommended thresholds:
- Response time: < 1000ms average
- Error rate: < 1%
- Memory usage: < 50MB
  `,
};

/**
 * Worker monitoring dashboard integration
 */
export const dashboardIntegration = {
  metricsMapping: {
    'worker.request.count': 'requestCount',
    'worker.error.rate': 'errorRate',
    'worker.response.time.avg': 'averageResponseTime',
    'worker.active.requests': 'activeRequests',
    'worker.memory.usage': 'memoryUsage',
  },

  alertRules: [
    {
      name: 'Worker High Error Rate',
      condition: 'worker.error.rate > 0.05',
      severity: 'high',
      message: 'Worker error rate exceeded 5%',
    },
    {
      name: 'Worker Slow Response Time',
      condition: 'worker.response.time.avg > 2000',
      severity: 'medium',
      message: 'Worker average response time > 2 seconds',
    },
  ],

  dashboardConfig: {
    refreshInterval: 30000, // 30 seconds
    metrics: ['requestCount', 'errorCount', 'averageResponseTime', 'activeRequests', 'alerts'],
    charts: [
      {
        type: 'line',
        metric: 'averageResponseTime',
        title: 'Response Time Trend',
      },
      {
        type: 'bar',
        metric: 'statusCodes',
        title: 'HTTP Status Codes',
      },
    ],
  },
};

/**
 * Troubleshooting guide
 */
export const troubleshooting = {
  commonIssues: [
    {
      issue: 'Metrics not sending to main system',
      solution: 'Check MONITORING_ENDPOINT URL and network connectivity',
    },
    {
      issue: 'High memory usage',
      solution: 'Enable health check caching and reduce batch sizes',
    },
    {
      issue: 'Too many alerts',
      solution: 'Adjust alert thresholds in configuration',
    },
    {
      issue: 'Slow response times',
      solution: 'Check database/cache connections and optimize queries',
    },
  ],

  debuggingSteps: [
    'Check /health endpoint for system status',
    'Review /metrics for performance data',
    'Check /alerts for active issues',
    'Use /profile for optimization recommendations',
    'Enable debug logging temporarily',
  ],
};

export default {
  defaultConfig: defaultWorkerMonitoringConfig,
  environmentConfig: workerEnvironmentConfig,
  setupInstructions,
  dashboardIntegration,
  troubleshooting,
};
