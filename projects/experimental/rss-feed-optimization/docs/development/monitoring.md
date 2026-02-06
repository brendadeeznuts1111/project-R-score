# Monitoring and Observability Guide

This guide provides comprehensive information about monitoring and observability for the RSS Feed Optimization project, including metrics collection, alerting, logging, and performance monitoring.

## Overview

Monitoring and observability are critical for maintaining a healthy, performant RSS Feed Optimization application. This guide covers how to monitor application health, performance metrics, and system resources to ensure optimal operation.

## Monitoring Architecture

### Three Pillars of Observability

1. **Metrics**: Quantitative measurements of system behavior
2. **Logs**: Detailed records of system events
3. **Traces**: Request flow through the system

### Monitoring Stack

```text
Application Layer
├── Custom Metrics (Performance, Business)
├── Application Logs
└── Error Tracking

Infrastructure Layer
├── System Metrics (CPU, Memory, Disk)
├── Network Metrics
└── Process Monitoring

External Dependencies
├── R2 Storage Metrics
├── DNS Resolution Metrics
└── External API Metrics
```

## Metrics Collection

### Application Metrics

#### Core Metrics

```javascript
// src/utils/metrics.js
export class Metrics {
  constructor() {
    this.counters = new Map();
    this.timers = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
  }

  // Counter metrics (monotonic increasing)
  increment(metric, value = 1) {
    const current = this.counters.get(metric) || 0;
    this.counters.set(metric, current + value);
  }

  // Timer metrics (duration measurements)
  recordTiming(metric, duration) {
    if (!this.timers.has(metric)) {
      this.timers.set(metric, []);
    }
    
    this.timers.get(metric).push(duration);
  }

  // Gauge metrics (current value)
  setGauge(metric, value) {
    this.gauges.set(metric, value);
  }

  // Histogram metrics (distribution)
  recordHistogram(metric, value) {
    if (!this.histograms.has(metric)) {
      this.histograms.set(metric, []);
    }
    
    this.histograms.get(metric).push(value);
  }

  // Get comprehensive metrics
  getMetrics() {
    return {
      system: this.getSystemMetrics(),
      application: this.getApplicationMetrics(),
      performance: this.getPerformanceMetrics(),
      business: this.getBusinessMetrics()
    };
  }
}
```

#### System Metrics

```javascript
// src/utils/system-metrics.js
export class SystemMetrics {
  static getSystemMetrics() {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    const uptime = process.uptime();
    
    return {
      timestamp: new Date().toISOString(),
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024),
        usagePercentage: Math.round((memory.heapUsed / memory.heapTotal) * 100)
      },
      cpu: {
        user: cpu.user / 1000,
        system: cpu.system / 1000,
        total: (cpu.user + cpu.system) / 1000
      },
      uptime: Math.floor(uptime),
      loadAverage: process.platform === 'linux' ? require('os').loadavg() : [0, 0, 0]
    };
  }

  static getProcessMetrics() {
    return {
      pid: process.pid,
      ppid: process.ppid,
      title: process.title,
      version: process.version,
      versions: process.versions,
      platform: process.platform,
      arch: process.arch
    };
  }
}
```

#### Performance Metrics

```javascript
// src/utils/performance-metrics.js
export class PerformanceMetrics {
  constructor() {
    this.operations = new Map();
  }

  async trackOperation(operation, fn) {
    const start = process.hrtime.bigint();
    const memStart = process.memoryUsage();

    try {
      const result = await fn();
      
      const end = process.hrtime.bigint();
      const memEnd = process.memoryUsage();
      
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      const memoryUsed = memEnd.heapUsed - memStart.heapUsed;

      this.recordOperation(operation, duration, memoryUsed);
      
      return result;
    } catch (error) {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;
      
      this.recordOperation(operation, duration, 0, error);
      throw error;
    }
  }

  recordOperation(operation, duration, memory, error = null) {
    if (!this.operations.has(operation)) {
      this.operations.set(operation, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        totalMemory: 0,
        errors: 0
      });
    }

    const stats = this.operations.get(operation);
    stats.count++;
    stats.totalTime += duration;
    stats.minTime = Math.min(stats.minTime, duration);
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.totalMemory += memory;
    
    if (error) {
      stats.errors++;
    }
  }

  getOperationMetrics() {
    const metrics = {};
    
    for (const [operation, stats] of this.operations.entries()) {
      const avgTime = stats.totalTime / stats.count;
      const avgMemory = stats.totalMemory / stats.count;
      const errorRate = (stats.errors / stats.count) * 100;

      metrics[operation] = {
        count: stats.count,
        avgTime: `${avgTime.toFixed(2)}ms`,
        minTime: `${stats.minTime.toFixed(2)}ms`,
        maxTime: `${stats.maxTime.toFixed(2)}ms`,
        avgMemory: `${Math.round(avgMemory / 1024)}KB`,
        errorRate: `${errorRate.toFixed(2)}%`,
        errors: stats.errors
      };
    }

    return metrics;
  }
}
```

### Business Metrics

#### RSS Feed Metrics

```javascript
// src/utils/business-metrics.js
export class BusinessMetrics {
  constructor() {
    this.feedStats = new Map();
    this.userStats = new Map();
  }

  recordFeedAccess(feedType, userAgent) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Track by hour
    const hourKey = `hour_${hour}`;
    this.incrementCounter(`feed.access.${feedType}.${hourKey}`);
    
    // Track by day
    const dayKey = `day_${dayOfWeek}`;
    this.incrementCounter(`feed.access.${feedType}.${dayKey}`);
    
    // Track user agent
    const botPattern = /(bot|crawler|spider)/i;
    const isBot = botPattern.test(userAgent);
    
    this.incrementCounter(`feed.access.${feedType}.bots`, isBot ? 1 : 0);
    this.incrementCounter(`feed.access.${feedType}.users`, isBot ? 0 : 1);
  }

  recordPostGeneration(postCount, duration) {
    this.incrementCounter('posts.generated', postCount);
    this.recordTiming('posts.generation_time', duration);
  }

  recordCacheOperation(operation, hit) {
    this.incrementCounter(`cache.${operation}.total`);
    this.incrementCounter(`cache.${operation}.${hit ? 'hit' : 'miss'}`);
  }

  getFeedMetrics() {
    return {
      accessPatterns: this.getAccessPatterns(),
      performance: this.getPerformanceStats(),
      cache: this.getCacheStats()
    };
  }

  getAccessPatterns() {
    const patterns = {};
    
    for (const [key, value] of this.feedStats.entries()) {
      const [type, metric] = key.split('.');
      if (!patterns[type]) patterns[type] = {};
      patterns[type][metric] = value;
    }
    
    return patterns;
  }
}
```

## Logging Strategy

### Structured Logging

```javascript
// src/utils/logger.js
export class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'info';
    this.formatter = new LogFormatter();
  }

  log(level, message, meta = {}) {
    if (this.shouldLog(level)) {
      const logEntry = this.formatter.format(level, message, meta);
      this.output(logEntry);
    }
  }

  info(message, meta) {
    this.log('info', message, meta);
  }

  warn(message, meta) {
    this.log('warn', message, meta);
  }

  error(message, meta) {
    this.log('error', message, meta);
  }

  debug(message, meta) {
    this.log('debug', message, meta);
  }

  shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevel = levels.indexOf(this.level);
    const messageLevel = levels.indexOf(level);
    return messageLevel <= currentLevel;
  }

  output(logEntry) {
    console.log(JSON.stringify(logEntry));
    
    // Send to external logging service if configured
    if (process.env.LOG_SERVICE_URL) {
      fetch(process.env.LOG_SERVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      }).catch(() => {
        // Fail silently to avoid logging loops
      });
    }
  }
}

class LogFormatter {
  format(level, message, meta) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      pid: process.pid,
      hostname: require('os').hostname(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }
}
```

### Request Logging

```javascript
// src/middleware/request-logger.js
export function requestLogger(logger) {
  return (req, res, next) => {
    const start = Date.now();
    const startMemory = process.memoryUsage();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const endMemory = process.memoryUsage();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        memoryDelta: `${Math.round(memoryDelta / 1024)}KB`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer')
      };

      if (res.statusCode >= 400) {
        logger.warn('HTTP request completed with error', logData);
      } else {
        logger.info('HTTP request completed', logData);
      }
    });

    next();
  };
}
```

### Error Logging

```javascript
// src/middleware/error-logger.js
export function errorLogger(logger) {
  return (error, req, res, next) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    logger.error('Application error occurred', errorData);
    
    // Send to error tracking service
    if (process.env.ERROR_TRACKING_URL) {
      fetch(process.env.ERROR_TRACKING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(() => {
        // Fail silently
      });
    }

    next(error);
  };
}
```

## Health Checks

### Application Health

```javascript
// src/middleware/health.js
export function healthCheck(req, res) {
  const memory = process.memoryUsage();
  const uptime = process.uptime();
  
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      rss: Math.round(memory.rss / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      external: Math.round(memory.external / 1024 / 1024)
    },
    uptime: Math.floor(uptime),
    dependencies: {
      r2: checkR2Connection(),
      cache: checkCacheHealth(),
      dns: checkDNSHealth()
    }
  };

  const isHealthy = Object.values(health.dependencies).every(dep => dep.status === 'OK');
  
  res.status(isHealthy ? 200 : 503).json(health);
}

async function checkR2Connection() {
  try {
    const { R2BlogStorage } = await import('../r2-client.js');
    const storage = new R2BlogStorage();
    
    // Test R2 connection
    await storage.listPosts();
    
    return { status: 'OK', latency: 'low' };
  } catch (error) {
    return { status: 'ERROR', error: error.message };
  }
}

function checkCacheHealth() {
  try {
    // Test cache operations
    const cache = new Cache();
    cache.set('health-check', 'test');
    const value = cache.get('health-check');
    
    if (value === 'test') {
      return { status: 'OK', size: cache.size };
    } else {
      return { status: 'ERROR', error: 'Cache read/write failed' };
    }
  } catch (error) {
    return { status: 'ERROR', error: error.message };
  }
}

async function checkDNSHealth() {
  try {
    const { DNSOptimizer } = await import('../utils/dns-optimizer.js');
    const dns = new DNSOptimizer();
    
    // Test DNS prefetching
    await dns.prefetch(['google.com', 'github.com']);
    
    return { status: 'OK', prefetchCount: dns.cache.size };
  } catch (error) {
    return { status: 'ERROR', error: error.message };
  }
}
```

### Detailed Health Check

```javascript
// src/middleware/detailed-health.js
export function detailedHealthCheck(req, res) {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    checks: {
      memory: checkMemoryHealth(),
      cpu: checkCPUHealth(),
      disk: checkDiskHealth(),
      dependencies: await checkDependencies(),
      performance: getPerformanceHealth()
    }
  };

  // Determine overall health
  const allChecks = Object.values(health.checks).flat();
  const failedChecks = allChecks.filter(check => check.status === 'ERROR');
  
  if (failedChecks.length > 0) {
    health.status = 'ERROR';
    health.failedChecks = failedChecks;
  }

  res.json(health);
}

function checkMemoryHealth() {
  const memory = process.memoryUsage();
  const usagePercentage = (memory.heapUsed / memory.heapTotal) * 100;
  
  return {
    status: usagePercentage > 90 ? 'ERROR' : usagePercentage > 70 ? 'WARNING' : 'OK',
    details: {
      rss: Math.round(memory.rss / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      usagePercentage: usagePercentage.toFixed(2)
    }
  };
}

function checkCPUHealth() {
  const cpuUsage = process.cpuUsage();
  const totalCPU = cpuUsage.user + cpuUsage.system;
  
  return {
    status: totalCPU > 1000000000 ? 'ERROR' : 'OK', // 1 second CPU time
    details: {
      user: cpuUsage.user / 1000,
      system: cpuUsage.system / 1000,
      total: totalCPU / 1000
    }
  };
}

async function checkDependencies() {
  const checks = [];
  
  // Check R2
  try {
    const r2Check = await checkR2Connection();
    checks.push({ name: 'R2 Storage', ...r2Check });
  } catch (error) {
    checks.push({ name: 'R2 Storage', status: 'ERROR', error: error.message });
  }
  
  // Check Cache
  try {
    const cacheCheck = checkCacheHealth();
    checks.push({ name: 'Cache', ...cacheCheck });
  } catch (error) {
    checks.push({ name: 'Cache', status: 'ERROR', error: error.message });
  }
  
  return checks;
}
```

## Alerting and Notifications

### Alert Manager

```javascript
// src/utils/alert-manager.js
export class AlertManager {
  constructor() {
    this.alerts = new Map();
    this.rules = [];
    this.loadRules();
  }

  loadRules() {
    this.rules = [
      {
        name: 'High Memory Usage',
        condition: (metrics) => metrics.system.memory.usagePercentage > 90,
        severity: 'CRITICAL',
        message: 'Memory usage is critically high'
      },
      {
        name: 'High CPU Usage',
        condition: (metrics) => metrics.system.cpu.total > 5000,
        severity: 'WARNING',
        message: 'CPU usage is high'
      },
      {
        name: 'R2 Connection Failed',
        condition: (metrics) => metrics.dependencies.r2.status === 'ERROR',
        severity: 'CRITICAL',
        message: 'R2 storage connection failed'
      },
      {
        name: 'High Error Rate',
        condition: (metrics) => metrics.application.errorRate > 10,
        severity: 'WARNING',
        message: 'Application error rate is high'
      }
    ];
  }

  checkAlerts(metrics) {
    for (const rule of this.rules) {
      if (rule.condition(metrics)) {
        this.triggerAlert(rule, metrics);
      }
    }
  }

  triggerAlert(rule, metrics) {
    const alert = {
      id: `${rule.name}_${Date.now()}`,
      name: rule.name,
      severity: rule.severity,
      message: rule.message,
      timestamp: new Date().toISOString(),
      metrics: metrics
    };

    // Store alert
    this.alerts.set(alert.id, alert);

    // Send notifications
    this.sendNotifications(alert);

    // Log alert
    console.error(`ALERT: ${rule.severity} - ${rule.message}`, alert);
  }

  sendNotifications(alert) {
    // Send to webhook
    if (process.env.ALERT_WEBHOOK_URL) {
      fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      }).catch(console.error);
    }

    // Send email (if configured)
    if (process.env.ALERT_EMAIL) {
      this.sendEmailAlert(alert);
    }
  }

  sendEmailAlert(alert) {
    // Implementation for sending email alerts
    // This would integrate with your email service
  }

  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(alert => 
      alert.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );
  }
}
```

### Dashboard Integration

```javascript
// src/utils/dashboard.js
export class Dashboard {
  constructor() {
    this.metrics = new Metrics();
    this.alertManager = new AlertManager();
    this.logger = new Logger();
  }

  setupRoutes(app) {
    // Metrics endpoint
    app.get('/api/v1/metrics', (req, res) => {
      res.json(this.metrics.getMetrics());
    });

    // Health check endpoint
    app.get('/api/v1/health', (req, res) => {
      res.json(this.getHealthStatus());
    });

    // Detailed health check
    app.get('/api/v1/health/detailed', (req, res) => {
      res.json(this.getDetailedHealth());
    });

    // Active alerts
    app.get('/api/v1/alerts', (req, res) => {
      res.json(this.alertManager.getActiveAlerts());
    });

    // Dashboard data
    app.get('/api/v1/dashboard', (req, res) => {
      res.json(this.getDashboardData());
    });
  }

  getHealthStatus() {
    const metrics = this.metrics.getMetrics();
    const alerts = this.alertManager.getActiveAlerts();
    
    return {
      status: alerts.length > 0 ? 'WARNING' : 'OK',
      timestamp: new Date().toISOString(),
      metrics: {
        uptime: metrics.system.uptime,
        memory: metrics.system.memory,
        errorRate: metrics.application.errorRate
      },
      alerts: alerts.length
    };
  }

  getDetailedHealth() {
    return {
      system: this.getSystemHealth(),
      application: this.getApplicationHealth(),
      dependencies: this.getDependenciesHealth(),
      alerts: this.alertManager.getActiveAlerts()
    };
  }

  getDashboardData() {
    return {
      overview: this.getOverview(),
      performance: this.getPerformanceData(),
      system: this.getSystemData(),
      alerts: this.alertManager.getActiveAlerts()
    };
  }
}
```

## Monitoring Integration

### Prometheus Integration

```javascript
// src/utils/prometheus.js
export class PrometheusExporter {
  constructor() {
    this.metrics = new Map();
  }

  registerCounter(name, help) {
    this.metrics.set(name, {
      type: 'counter',
      help,
      value: 0
    });
  }

  registerGauge(name, help) {
    this.metrics.set(name, {
      type: 'gauge',
      help,
      value: 0
    });
  }

  registerHistogram(name, help) {
    this.metrics.set(name, {
      type: 'histogram',
      help,
      buckets: [0.1, 0.5, 1, 2, 5],
      values: []
    });
  }

  increment(name, value = 1) {
    if (this.metrics.has(name)) {
      this.metrics.get(name).value += value;
    }
  }

  setGauge(name, value) {
    if (this.metrics.has(name)) {
      this.metrics.get(name).value = value;
    }
  }

  observe(name, value) {
    if (this.metrics.has(name)) {
      this.metrics.get(name).values.push(value);
    }
  }

  getMetrics() {
    let output = '';
    
    for (const [name, metric] of this.metrics.entries()) {
      output += `# HELP ${name} ${metric.help}\n`;
      output += `# TYPE ${name} ${metric.type}\n`;
      
      if (metric.type === 'counter' || metric.type === 'gauge') {
        output += `${name} ${metric.value}\n`;
      } else if (metric.type === 'histogram') {
        const values = metric.values;
        const count = values.length;
        const sum = values.reduce((a, b) => a + b, 0);
        
        output += `${name}_count ${count}\n`;
        output += `${name}_sum ${sum}\n`;
        
        // Bucket counts
        for (const bucket of metric.buckets) {
          const bucketCount = values.filter(v => v <= bucket).length;
          output += `${name}_bucket{le="${bucket}"} ${bucketCount}\n`;
        }
        
        output += `${name}_bucket{le="+Inf"} ${count}\n`;
      }
      
      output += '\n';
    }
    
    return output;
  }
}
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "RSS Feed Optimization",
    "panels": [
      {
        "title": "System Memory",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes / 1024 / 1024",
            "legendFormat": "RSS (MB)"
          },
          {
            "expr": "process_heap_bytes / 1024 / 1024",
            "legendFormat": "Heap (MB)"
          }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate (%)"
          }
        ]
      }
    ]
  }
}
```

## Log Aggregation

### Centralized Logging

```javascript
// src/utils/log-aggregator.js
export class LogAggregator {
  constructor() {
    this.buffer = [];
    this.flushInterval = 30000; // 30 seconds
    this.maxBufferSize = 1000;
    
    this.startAggregation();
  }

  startAggregation() {
    setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  log(level, message, meta) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      pid: process.pid,
      hostname: require('os').hostname()
    };

    this.buffer.push(logEntry);

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const logs = this.buffer.splice(0, this.buffer.length);
    
    try {
      // Send to log aggregation service
      if (process.env.LOG_AGGREGATION_URL) {
        await fetch(process.env.LOG_AGGREGATION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs })
        });
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Re-add logs to buffer for retry
      this.buffer.unshift(...logs);
    }
  }
}
```

### Log Rotation

```javascript
// src/utils/log-rotator.js
export class LogRotator {
  constructor() {
    this.logDir = process.env.LOG_DIR || './logs';
    this.maxFileSize = parseInt(process.env.LOG_MAX_SIZE) || 100 * 1024 * 1024; // 100MB
    this.maxFiles = parseInt(process.env.LOG_MAX_FILES) || 10;
  }

  async rotate() {
    const logFiles = await this.getLogFiles();
    
    for (const file of logFiles) {
      const stats = await this.getFileStats(file);
      
      if (stats.size > this.maxFileSize) {
        await this.rotateFile(file);
      }
    }
    
    await this.cleanupOldFiles();
  }

  async rotateFile(file) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = `${file}.${timestamp}`;
    
    await this.renameFile(file, rotatedFile);
    await this.compressFile(rotatedFile);
  }

  async cleanupOldFiles() {
    const logFiles = await this.getLogFiles();
    
    if (logFiles.length > this.maxFiles) {
      const filesToDelete = logFiles.slice(this.maxFiles);
      
      for (const file of filesToDelete) {
        await this.deleteFile(file);
      }
    }
  }
}
```

## Performance Monitoring

### Real-time Monitoring

```javascript
// src/utils/realtime-monitor.js
export class RealtimeMonitor {
  constructor() {
    this.metrics = new Map();
    this.subscribers = new Set();
    this.monitoring = false;
  }

  start() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.interval = setInterval(() => {
      this.collectMetrics();
    }, 5000); // Every 5 seconds
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.monitoring = false;
    }
  }

  collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: SystemMetrics.getSystemMetrics(),
      application: this.getApplicationMetrics(),
      performance: this.getPerformanceMetrics()
    };

    this.metrics.set(metrics.timestamp, metrics);
    this.notifySubscribers(metrics);
  }

  getApplicationMetrics() {
    return {
      activeConnections: this.getActiveConnections(),
      queueLength: this.getQueueLength(),
      errorCount: this.getErrorCount()
    };
  }

  getPerformanceMetrics() {
    return {
      avgResponseTime: this.getAverageResponseTime(),
      requestsPerSecond: this.getRequestsPerSecond(),
      memoryUsage: this.getMemoryUsage()
    };
  }

  subscribe(callback) {
    this.subscribers.add(callback);
  }

  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  notifySubscribers(metrics) {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(metrics);
      } catch (error) {
        console.error('Error in metrics subscriber:', error);
      }
    }
  }
}
```

### Performance Dashboard

```javascript
// src/utils/performance-dashboard.js
export class PerformanceDashboard {
  constructor() {
    this.monitor = new RealtimeMonitor();
    this.metrics = [];
  }

  start() {
    this.monitor.subscribe((metrics) => {
      this.metrics.push(metrics);
      
      // Keep only last hour of metrics
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      this.metrics = this.metrics.filter(m => new Date(m.timestamp) > oneHourAgo);
      
      this.updateDashboard(metrics);
    });

    this.monitor.start();
  }

  updateDashboard(metrics) {
    // Update dashboard elements
    this.updateSystemMetrics(metrics.system);
    this.updatePerformanceMetrics(metrics.performance);
    this.updateAlerts(metrics.alerts);
  }

  updateSystemMetrics(systemMetrics) {
    // Update DOM elements or send to frontend
    console.log('System Metrics Update:', systemMetrics);
  }

  updatePerformanceMetrics(performanceMetrics) {
    // Update performance charts
    console.log('Performance Metrics Update:', performanceMetrics);
  }

  getMetricsHistory() {
    return this.metrics;
  }
}
```

This comprehensive monitoring and observability guide ensures you can effectively monitor, alert, and maintain your RSS Feed Optimization application.