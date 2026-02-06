# Feed Monitoring with Bun 1.3 Enhanced Socket Information

## Overview

Bun 1.3's enhanced socket information provides detailed connection visibility for monitoring, debugging, and managing feed connections. This document covers practical use cases and implementations.

## Enhanced Socket Properties

All `Bun.connect()` sockets expose these properties:

```typescript
interface Socket {
  localAddress: string;    // Local IP address (e.g., "10.0.0.24")
  localPort: number;       // Local port number (e.g., 59876)
  localFamily: 'IPv4' | 'IPv6';  // Local address family
  remoteAddress: string;   // Remote server IP (e.g., "104.21.8.212")
  remotePort: number;      // Remote port (e.g., 443)
  remoteFamily: 'IPv4' | 'IPv6';  // Remote address family
}
```

## Canonical Format

```typescript
`${s.localAddress}:${s.localPort} → ${s.remoteAddress}:${s.remotePort} (${s.remoteFamily})`
// Example: 10.0.0.24:59876 → 104.21.8.212:443 (IPv4)
```

## Use Cases

### 1. Connection Monitoring & Debugging

Monitor multiple feed connections and log detailed connection information.

**Usage:**
```typescript
import { monitorConnections } from './utils/feed-connection-monitor';
import { loadEnhancedFeedPatterns } from './utils/feed-registry-loader';

const feeds = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
const connections = await monitorConnections(feeds);

// Output:
// ✅ Connected to AI_FEED_2:
//   Local: 10.0.0.24:59876
//   Remote: 104.21.8.212:443
//   Type: ai-generated (Priority: 1250)
//   Format: 10.0.0.24:59876 → 104.21.8.212:443 (IPv4)
```

**Benefits:**
- Trace which local ports connect to which feeds
- Debug connection routing issues
- Monitor connection origins and destinations

### 2. Load Balancing/Health Check

Check feed health and measure connection latency for load balancing decisions.

**Usage:**
```typescript
import { FeedHealthChecker } from './utils/feed-health-checker';

const checker = new FeedHealthChecker(feeds);
const results = await checker.checkAll(5000); // 5 second timeout

results.forEach(result => {
  if (result.status === 'healthy') {
    console.log(`${result.feedId}: ${result.latency} - ${result.remoteEndpoint}`);
  }
});

const healthyFeeds = checker.getHealthyFeeds(results);
const unhealthyFeeds = checker.getUnhealthyFeeds(results);
```

**Output:**
```text
📊 Health Check Results:
  ✅ AI_FEED_2: 45.23ms - 104.21.8.212:443 (IPv4)
  ✅ AI_FEED_3: 52.11ms - 104.21.8.212:443 (IPv4)
  ❌ AI_FEED_4: Connection timeout

📈 Summary: 2 healthy, 1 unhealthy
```

**Benefits:**
- Make routing decisions based on latency
- Identify unhealthy feeds automatically
- Load balance across healthy feeds

### 3. Connection Pool with Detailed Metrics

Manage connection pools with detailed socket information and metrics.

**Usage:**
```typescript
import { FeedConnectionPool } from './utils/feed-connection-pool';

const pool = new FeedConnectionPool(feeds, 5); // Max 5 connections per feed

// Get connection
const socket = await pool.getConnection('AI_FEED_2');
console.log(`${socket.localInfo} → ${socket.remoteInfo}`);

// Use connection...
socket.write('data');

// Release connection back to pool
pool.releaseConnection(socket);

// Get pool statistics
const stats = pool.getPoolStats('AI_FEED_2');
console.log(`Active: ${stats.active}, Available: ${stats.available}`);
```

**Pool Statistics:**
```typescript
{
  active: 3,
  available: 2,
  maxConnections: 5,
  connections: [
    {
      localInfo: "10.0.0.24:59876",
      remoteInfo: "104.21.8.212:443",
      age: 12345,      // ms since creation
      idle: 5000      // ms since last use
    }
  ]
}
```

**Benefits:**
- Reuse connections efficiently
- Track connection metrics
- Monitor pool utilization

### 4. Real-time Feed Diagnostics

Diagnose feed connection issues in real-time.

**Usage:**
```typescript
import { diagnoseFeedIssues, formatDiagnostics } from './utils/feed-diagnostics';

const issues = await diagnoseFeedIssues(feeds, 3000);
console.log(formatDiagnostics(issues));
```

**Output:**
```text
📊 Feed Diagnostics Summary:
  Errors: 1
  Warnings: 2
  Info: 0

❌ Errors:
  [AI_FEED_4] Connection failed: Connection timeout
    Details: {
      "hostname": "ai-odds.stream",
      "port": 443,
      "error": "Connection timeout"
    }

⚠️  Warnings:
  [AI_FEED_2] Unexpected port: 80 (expected 443)
  [AI_FEED_3] IPv6 requested but connection is IPv4
```

**Checks Performed:**
- Address family validation (IPv4/IPv6)
- Port verification
- IPv6 availability
- Ephemeral port detection
- Connection timeout detection

**Benefits:**
- Identify network issues quickly
- Verify connection characteristics
- Security auditing of connections

## Integration Examples

### Complete Monitoring Setup

```typescript
import { loadEnhancedFeedPatterns } from './utils/feed-registry-loader';
import { FeedHealthChecker } from './utils/feed-health-checker';
import { FeedConnectionPool } from './utils/feed-connection-pool';
import { diagnoseFeedIssues } from './utils/feed-diagnostics';

async function setupFeedMonitoring() {
  const feeds = await loadEnhancedFeedPatterns('./patterns/ai-driven-feed.json');
  
  // 1. Health check all feeds
  const checker = new FeedHealthChecker(feeds);
  const healthResults = await checker.checkAll();
  const healthyFeeds = checker.getHealthyFeeds(healthResults);
  
  // 2. Create connection pool for healthy feeds
  const healthyFeedConfig = feeds.filter(f => healthyFeeds.includes(f.id));
  const pool = new FeedConnectionPool(healthyFeedConfig, 5);
  
  // 3. Run diagnostics
  const issues = await diagnoseFeedIssues(feeds);
  const errors = issues.filter(i => i.severity === 'error');
  
  if (errors.length > 0) {
    console.error('Critical feed issues detected:', errors);
  }
  
  return { pool, healthResults, issues };
}
```

### Production Monitoring Loop

```typescript
async function monitorFeedsContinuously(feeds: EnhancedFeedPattern[], intervalMs = 60000) {
  const checker = new FeedHealthChecker(feeds);
  
  while (true) {
    const results = await checker.checkAll();
    
    // Log metrics
    console.log(`[${new Date().toISOString()}] Health Check:`);
    results.forEach(r => {
      if (r.status === 'healthy') {
        console.log(`  ✅ ${r.feedId}: ${r.latency} - ${r.remoteEndpoint}`);
      } else {
        console.error(`  ❌ ${r.feedId}: ${r.error}`);
      }
    });
    
    await Bun.sleep(intervalMs);
  }
}
```

## Key Benefits

1. **Debugging**: Easily trace which local ports connect to which feeds
2. **Monitoring**: Track connection origins and destinations in logs
3. **Security**: Verify connections use expected IP versions (IPv4/IPv6)
4. **Troubleshooting**: Identify network issues by examining connection details
5. **Load Balancing**: Make routing decisions based on connection characteristics

## Best Practices

1. **Always check health before using feeds** - Use `FeedHealthChecker` before routing traffic
2. **Monitor connection pools** - Track pool utilization to optimize connection limits
3. **Run diagnostics regularly** - Use `diagnoseFeedIssues` in monitoring loops
4. **Log socket information** - Include socket details in logs for debugging
5. **Handle timeouts gracefully** - Set appropriate timeouts for health checks

## See Also

- `examples/feed-monitoring-demo.ts` - Complete demo of all use cases
- `docs/SOCKET-FORMAT.md` - Socket format documentation
- `src/utils/socket-connection.ts` - Socket utility functions



