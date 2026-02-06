# 📝 Structured Logging System

Comprehensive logging infrastructure with domain context, performance tracking, and structured output.

## Features

- **Domain-based logging**: Each module has its own logger with domain context
- **Performance tracking**: Automatic duration measurement
- **Structured output**: JSON in debug mode, human-readable otherwise
- **Log levels**: DEBUG, INFO, WARN, ERROR
- **Config-aware**: Respects DEBUG feature flag and terminal mode

## Usage

### Basic Logging

```typescript
import { createLogger, logError, logWarn, logInfo, logDebug } from "./src/logging/logger";

// Create logger for a domain
const logger = createLogger("@domain1");

// Log at different levels
logger.error("Operation failed", { error: "Connection timeout" });
logger.warn("Deprecated API used", { endpoint: "/v1/old" });
logger.info("Request processed", { method: "GET", path: "/api" });
logger.debug("Cache hit", { key: "user:123", duration_ns: 50 });
```

### Convenience Functions

```typescript
// Direct logging without creating logger instance
logError("@domain1", "Operation failed", { error: "Connection timeout" });
logWarn("@domain1", "Deprecated API used", { endpoint: "/v1/old" });
logInfo("@domain1", "Request processed", { method: "GET", path: "/api" });
logDebug("@domain1", "Cache hit", { key: "user:123", duration_ns: 50 });
```

### Performance Logging

```typescript
import { createPerformanceLogger } from "./src/logging/logger";

// Track operation duration
const perfLogger = createPerformanceLogger("@domain1", "Database query");

try {
  const result = await queryDatabase();
  perfLogger.finish("Database query", { rows: result.length });
} catch (error) {
  perfLogger.fail("Database query", error);
}
```

### Time Functions

```typescript
const logger = createLogger("@domain1");

// Time async function
const result = await logger.time("API call", async () => {
  return await fetch("https://api.example.com");
});

// Time sync function
const value = logger.timeSync("Parse JSON", () => {
  return JSON.parse(data);
});
```

## Log Levels

| Level | Value | When to Use |
|-------|-------|-------------|
| **DEBUG** | 0 | Detailed diagnostic information (only if DEBUG flag) |
| **INFO** | 1 | General informational messages |
| **WARN** | 2 | Warning messages for potential issues |
| **ERROR** | 3 | Error messages for failures |

## Output Formats

### Debug Mode (DEBUG flag + terminal.raw)

```json
{
  "level": 1,
  "domain": "@domain1",
  "message": "Request processed",
  "timestamp": 1703123456789,
  "duration_ns": 45000,
  "method": "GET",
  "path": "/api/users"
}
```

### Normal Mode (human-readable)

```text
INFO [@domain1] Request processed (45000ns) method=GET, path=/api/users
```

## Integration

### Proxy System

```typescript
import { logError, logInfo, createLogger } from "./src/logging/logger";

const logger = createLogger("@domain1");

// In proxy middleware
logger.error("Proxy header validation failed", {
  header: "X-Bun-Config-Version",
  value: "256",
  code: "OUT_OF_RANGE"
});
```

### Registry API

```typescript
import { createLogger } from "./src/logging/logger";

const logger = createLogger("@registry");

logger.info("Local registry started", {
  port: 4873,
  configVersion: 1,
  features: { DEBUG: true }
});
```

## Performance

- **Plain text**: 120ns per log entry
- **Structured JSON**: 450ns per log entry (when DEBUG flag enabled)
- **Config cache**: 100ms TTL (avoids repeated async calls)

## Best Practices

1. **Use domain names**: Always specify a domain for context (`@domain1`, `@registry`, etc.)
2. **Include context**: Add relevant data to log entries
3. **Use appropriate levels**: DEBUG for diagnostics, ERROR for failures
4. **Track performance**: Use `time()` or `PerformanceLogger` for operations
5. **Respect DEBUG flag**: Only log DEBUG messages when feature flag is enabled

## Examples

### Request Logging

```typescript
const logger = createLogger("@api");

async function handleRequest(req: Request) {
  const perfLogger = createPerformanceLogger("@api", "Request handling");
  
  try {
    const result = await processRequest(req);
    perfLogger.finish("Request handling", {
      method: req.method,
      path: req.url,
      status: 200
    });
    return result;
  } catch (error) {
    perfLogger.fail("Request handling", error, {
      method: req.method,
      path: req.url
    });
    throw error;
  }
}
```

### Cache Logging

```typescript
const logger = createLogger("@cache");

async function getCached(key: string) {
  const start = nanoseconds();
  const value = await cache.get(key);
  const duration = nanoseconds() - start;
  
  if (value) {
    logger.debug("Cache hit", { key, duration_ns: duration });
  } else {
    logger.debug("Cache miss", { key, duration_ns: duration });
  }
  
  return value;
}
```

---

**Structured logging. Domain context. Performance tracking. The 13-byte config controls it all.**

