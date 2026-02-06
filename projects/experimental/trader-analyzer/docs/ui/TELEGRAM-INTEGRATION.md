# Telegram Integration Guide

**Comprehensive Telegram integration for NEXUS platform**

---

## Overview

The Telegram integration provides:

- ✅ **Enhanced API Client** - Retry logic, circuit breaker, rate limiting
- ✅ **Integration Monitor** - Real-time health monitoring
- ✅ **Message Queue** - Async message sending
- ✅ **Comprehensive Logging** - Request/response tracking
- ✅ **Dashboard Integration** - Live status in web dashboard
- ✅ **CLI Tools** - Full command-line management

---

## Architecture

```text
┌─────────────────────────────────────────┐
│         Application Layer              │
│  (CLI, API Routes, Dashboard)          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Enhanced Telegram Client           │
│  • Retry Logic                          │
│  • Circuit Breaker                      │
│  • Rate Limiting                        │
│  • Request Queue                        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Telegram Bot API Client            │
│  • Basic API Calls                      │
│  • Message Sending                      │
│  • Topic Management                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Telegram Bot API                   │
│      (api.telegram.org)                 │
└─────────────────────────────────────────┘
```

---

## Enhanced Client

### Features

**Retry Logic:**
- Exponential backoff
- Configurable max retries
- Smart error handling

**Circuit Breaker:**
- Automatic failure detection
- Prevents cascading failures
- Auto-recovery

**Rate Limiting:**
- Per-second limits (default: 30)
- Per-minute limits (default: 1000)
- Automatic queuing

**Request Queue:**
- Async message sending
- Non-blocking operations
- Automatic processing

### Usage

```typescript
import { getTelegramClient } from "./telegram/client";

const client = getTelegramClient();

// Send message (with retry and rate limiting)
const result = await client.sendMessage({
  chatId: "-1001234567890",
  text: "Hello!",
  threadId: 2,
  pin: true,
});

// Send async (queued)
await client.sendMessageAsync({
  chatId: "-1001234567890",
  text: "Async message",
  threadId: 2,
});

// Get statistics
const stats = client.getStats();
console.log(`Success rate: ${stats.successfulRequests / stats.totalRequests * 100}%`);
```

### Configuration

```typescript
import { EnhancedTelegramClient } from "./telegram/client";

const client = new EnhancedTelegramClient({
  maxRetries: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  rateLimitPerSecond: 30,
  rateLimitPerMinute: 1000,
  enableLogging: true,
});
```

---

## Integration Monitor

### Features

- Real-time health monitoring
- Configuration validation
- Statistics tracking
- Status reporting

### Usage

```typescript
import { getTelegramMonitor } from "./telegram/monitor";

const monitor = getTelegramMonitor();

// Get comprehensive status
const status = await monitor.getStatus();
console.log(`Overall: ${status.overall.status}`);
console.log(`Success rate: ${status.client.stats.successRate}%`);

// Quick health check
const healthy = await monitor.quickHealthCheck();

// Monitor continuously
for await (const status of monitor.monitorStatus(5000)) {
  console.log(`Status: ${status.overall.status}`);
}
```

### Status Types

**Overall Status:**
- `healthy` - All systems operational
- `degraded` - Some issues detected
- `unhealthy` - Critical issues

**Client Stats:**
- Total requests
- Success/failure counts
- Success rate percentage
- Average response time

---

## API Endpoints

### Integration Status

```http
GET /telegram/integration/status
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "client": {
      "healthy": true,
      "stats": {
        "totalRequests": 150,
        "successfulRequests": 148,
        "failedRequests": 2,
        "successRate": 98.67,
        "averageResponseTime": 245
      }
    },
    "api": {
      "connected": true,
      "chatId": "-1001234567890",
      "topicsCount": 5
    },
    "overall": {
      "status": "healthy",
      "message": "All systems operational"
    }
  }
}
```

### Integration Stats

```http
GET /telegram/integration/stats
```

**Response:**
```json
{
  "status": "ok",
  "data": {
    "totalRequests": 150,
    "successfulRequests": 148,
    "failedRequests": 2,
    "retries": 5,
    "circuitBreakerTrips": 0,
    "rateLimitHits": 0,
    "averageResponseTime": 245
  }
}
```

### Send Message (Enhanced)

```http
POST /telegram/integration/send
Content-Type: application/json

{
  "text": "Hello!",
  "threadId": 2,
  "pin": true
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "Message sent successfully",
  "data": {
    "messageId": 123
  }
}
```

---

## Dashboard Integration

The web dashboard (`dashboard/index.html`) automatically displays:

- **Integration Status** - Overall health
- **Client Health** - Client operational status
- **API Connection** - Telegram API connectivity
- **Success Rate** - Request success percentage
- **Total Requests** - Request count
- **Average Response Time** - Performance metrics

### Auto-Refresh

The dashboard can auto-refresh every 5 seconds to show live status.

---

## CLI Integration

All CLI tools use the enhanced client:

```bash
# Send message (uses enhanced client)
bun run telegram send "Hello!" --topic 2 --pin

# Check integration status
curl http://localhost:3000/telegram/integration/status

# View stats
curl http://localhost:3000/telegram/integration/stats
```

---

## Error Handling

### Retry Logic

The enhanced client automatically retries failed requests:

1. **First attempt** - Immediate
2. **Retry 1** - After 1 second
3. **Retry 2** - After 2 seconds
4. **Retry 3** - After 4 seconds

### Circuit Breaker

If 5 consecutive failures occur:
- Circuit opens
- Requests fail immediately
- After 30 seconds, circuit attempts recovery

### Rate Limiting

- **Per Second**: Max 30 requests
- **Per Minute**: Max 1000 requests
- Automatic queuing when limits reached

---

## Monitoring

### Statistics

Track integration health:

```typescript
const stats = client.getStats();
console.log(`Success rate: ${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%`);
console.log(`Average response: ${stats.averageResponseTime}ms`);
console.log(`Circuit breaker trips: ${stats.circuitBreakerTrips}`);
```

### Health Checks

```typescript
const health = await client.healthCheck();
console.log(`Healthy: ${health.healthy}`);
console.log(`Message: ${health.message}`);
```

---

## Best Practices

### 1. Use Enhanced Client

Always use `getTelegramClient()` for automatic retry and rate limiting:

```typescript
// ✅ Good
const client = getTelegramClient();
await client.sendMessage({ ... });

// ❌ Avoid direct API calls
const api = new TelegramBotApi();
await api.sendMessage(...);
```

### 2. Monitor Status

Regularly check integration status:

```typescript
const monitor = getTelegramMonitor();
const status = await monitor.getStatus();

if (status.overall.status !== 'healthy') {
  // Handle degraded state
}
```

### 3. Use Async Sending

For non-critical messages, use async sending:

```typescript
// Non-blocking
await client.sendMessageAsync({
  chatId: chatId,
  text: "Update",
  threadId: 2,
});
```

### 4. Handle Errors

Always handle errors:

```typescript
try {
  const result = await client.sendMessage({ ... });
  if (!result.ok) {
    console.error(`Failed: ${result.error}`);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
}
```

---

## Troubleshooting

### High Failure Rate

**Symptoms:** Success rate < 80%

**Solutions:**
1. Check bot token validity
2. Verify chat ID
3. Check rate limits
4. Review error messages

### Circuit Breaker Trips

**Symptoms:** Circuit breaker trips > 0

**Solutions:**
1. Check network connectivity
2. Verify Telegram API status
3. Review rate limiting settings
4. Check bot permissions

### Slow Response Times

**Symptoms:** Average response time > 1000ms

**Solutions:**
1. Check network latency
2. Review rate limiting
3. Optimize message size
4. Check Telegram API status

---

## See Also

- `TELEGRAM-CLI.md` - CLI tool documentation
- `GOLDEN-SUPERGROUP.md` - Golden supergroup setup
- `TELEGRAM-NAMING-STANDARD.md` - Naming conventions
- `src/telegram/client.ts` - Enhanced client implementation
- `src/telegram/monitor.ts` - Integration monitor
