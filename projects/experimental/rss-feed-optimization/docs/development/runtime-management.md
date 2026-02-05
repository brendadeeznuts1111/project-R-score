# Runtime Management

Production-grade process management, monitoring, and control for the RSS Feed Optimizer.

## Overview

The runtime management system provides enterprise-grade process control features:

- **Graceful Shutdowns** - Zero-downtime deployments, Kubernetes-ready
- **Resource Monitoring** - Memory and CPU tracking with alerts
- **Runtime Configuration** - Hot-reload configuration without restarts
- **Multi-Process Workers** - Parallel feed processing with worker pools
- **Cluster Management** - High availability with automatic restarts
- **Inter-Process Communication** - Message passing between processes

## Quick Start

### Basic Usage

```bash
# Start in production mode
bun run src/main.js

# Start with cluster mode (multiple workers)
bun run src/main.js --cluster

# Start with custom config
bun run src/main.js --config=./config/production.json

# Start in debug mode
bun run src/main.js --debug
```

### Signal Commands

```bash
# Graceful shutdown
kill -SIGTERM <pid>

# Reload configuration without restart
kill -SIGHUP <pid>

# Dump debug information
kill -SIGUSR1 <pid>

# Rotate logs
kill -SIGUSR2 <pid>
```

## Components

### ProcessManager

Handles graceful shutdowns, signal handling, and process lifecycle management.

```javascript
import { ProcessManager } from './runtime/process-manager.js'

const pm = new ProcessManager()

// Add custom shutdown handler
pm.addShutdownHandler(async () => {
  await database.close()
})

// Dump debug info manually
pm.dumpDebugInfo()
```

**Features:**
- SIGTERM/SIGINT graceful shutdown (30s timeout)
- SIGHUP configuration reload
- SIGUSR1 debug info dump
- SIGUSR2 log rotation
- Uncaught exception handling
- Shutdown handler registration

### ResourceMonitor

Monitors memory and CPU usage with automatic alerts and throttling.

```javascript
import { ResourceMonitor } from './runtime/resource-monitor.js'

const monitor = new ResourceMonitor({
  memoryLimitMB: 512,
  cpuUsageLimit: 90
})

monitor.startMonitoring()

// Check if processing is throttled
if (globalThis.throttled) {
  // Reduce workload
}
```

**Features:**
- Memory usage tracking (5s intervals)
- CPU usage calculation
- RSS metrics logging (30s intervals)
- Automatic garbage collection trigger
- Processing throttling on high CPU
- Global metrics storage

### RuntimeConfigManager

Hot-reload configuration management with environment variable watching.

```javascript
import { RuntimeConfigManager } from './runtime/config-manager.js'

const config = new RuntimeConfigManager('./config/runtime.json')
await config.init()

// Get configuration
const maxMemory = config.get('maxMemoryMB', 512)

// Set configuration
config.set('customKey', 'value')
await config.saveConfig()
```

**Configuration Options:**
| Option | Default | Description |
|--------|---------|-------------|
| `maxMemoryMB` | 512 | Memory limit in MB |
| `maxConcurrentFeeds` | 10 | Maximum concurrent feed fetches |
| `cacheTTLSeconds` | 3600 | Cache time-to-live |
| `enableNativeParsing` | true | Enable native RSS parsing |
| `enableCircuitBreaker` | true | Enable circuit breaker pattern |
| `enableRetry` | true | Enable retry with backoff |
| `logLevel` | 'info' | Logging level |
| `metricsEnabled` | true | Enable metrics collection |

### WorkerPoolManager

Parallel RSS feed processing using worker threads.

```javascript
import { WorkerPoolManager } from './runtime/worker-pool.js'

const pool = new WorkerPoolManager(4) // 4 workers
await pool.init()

// Parse feeds in parallel
const results = await pool.parseFeedsInParallel([
  { xml: feedXml1, options: {} },
  { xml: feedXml2, options: {} }
])

// Cleanup
await pool.cleanup()
```

**Features:**
- Automatic CPU-based worker count
- Round-robin task distribution
- Worker restart on failure
- Task timeout handling (30s)
- Statistics tracking

### ClusterManager

High availability with multiple worker processes and automatic failover.

```javascript
import { ClusterManager } from './runtime/cluster-manager.js'

const cluster = new ClusterManager(4) // 4 workers
await cluster.init()

// Check cluster stats
const stats = cluster.getWorkerStats()
```

**Features:**
- Primary/worker process model
- Automatic worker restarts
- Health checks (30s intervals)
- Graceful rolling restarts
- Load distribution across ports
- Worker-specific environment variables

### IPCManager

Inter-process communication for coordination and message passing.

```javascript
import { IPCManager } from './runtime/ipc-manager.js'

const ipc = new IPCManager()
ipc.setupIPC()

// Register custom message handler
ipc.registerHandler('CUSTOM_EVENT', (data) => {
  console.log('Received:', data)
})

// Send to parent process
ipc.sendToParent('FEED_PROCESSED', { feedId: 123 })
```

**Features:**
- Message handler registration
- Broadcast messaging
- Process-to-process channels
- Health status reporting
- Configuration updates
- Debug info requests

## Runtime Integration

### Initialize All Components

```javascript
import { initializeRuntime } from './runtime/index.js'

const runtime = await initializeRuntime({
  configFile: './config/runtime.json',
  memoryLimitMB: 512,
  cpuUsageLimit: 90
})

// Access components
const { processManager, resourceMonitor, configManager, ipcManager } = runtime
```

### Global Metrics

The runtime system stores metrics globally for access across components:

```javascript
// Access global metrics
globalThis.metrics = {
  feedsProcessed: 0,
  feedsFailed: 0,
  avgParseTime: 0,
  activeConnections: 0
}

// Update metrics
globalThis.metrics.feedsProcessed++
```

## Production Deployment

### Environment Variables

```bash
# Required
PORT=3000
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx

# Optional
MAX_MEMORY_MB=512
MAX_CONCURRENT_FEEDS=10
ENABLE_NATIVE_PARSING=true
ENABLE_CIRCUIT_BREAKER=true
ENABLE_RETRY=true
METRICS_ENABLED=true
```

### Docker Compose

```yaml
version: '3.8'
services:
  rss-optimizer:
    build: .
    command: bun run src/main.js --cluster
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rss-optimizer
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: rss-optimizer
        image: rss-optimizer:latest
        command: ["bun", "run", "src/main.js", "--cluster"]
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        lifecycle:
          preStop:
            exec:
              command: ["sh", "-c", "sleep 10"]
```

## Monitoring Endpoints

The server exposes several monitoring endpoints:

### Health Check
```bash
curl http://localhost:3000/health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "pid": 12345,
  "uptime": 3600,
  "memory": {
    "used": 128,
    "total": 256,
    "rss": 64
  },
  "connections": 5
}
```

### Metrics
```bash
curl http://localhost:3000/metrics
```

Returns aggregated metrics from global metrics store.

### Debug Info
```bash
curl http://localhost:3000/debug
```

Returns detailed debug information for troubleshooting.

### Cluster Stats
```bash
curl http://localhost:3000/cluster
```

Returns cluster configuration and worker status (primary only).

## Testing

Run runtime management tests:

```bash
bun test tests/runtime.test.js
```

Tests cover:
- Process manager signal handling
- Resource monitoring and alerts
- Configuration management
- IPC message passing
- Runtime integration

## Troubleshooting

### High Memory Usage

1. Check memory limits: `curl http://localhost:3000/metrics`
2. Adjust `maxMemoryMB` in config
3. Enable aggressive GC in config
4. Monitor RSS metrics for memory leaks

### Process Crashes

1. Check logs for uncaught exceptions
2. Verify worker pool limits
3. Check circuit breaker thresholds
4. Review cluster health endpoint

### Configuration Not Reloading

1. Verify config file path
2. Check file permissions
3. Review polling interval (5s default)
4. Check environment variables

## Best Practices

1. **Always use graceful shutdowns** in production
2. **Set appropriate memory limits** based on workload
3. **Monitor metrics regularly** for capacity planning
4. **Use cluster mode** for high availability
5. **Configure health checks** for load balancers
6. **Log aggregation** for centralized monitoring
