# Bun Fetch API: Timeouts and Request Cancellation

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+  
**Reference**: [Bun Fetch Documentation](https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout)

> **Status**: ✅ Production Ready  
> **See Also**: [Anti-Patterns Guide](./ANTI-PATTERNS.md) - Always use timeouts for fetch requests

---

## Overview

Bun's `fetch` API supports **timeouts and request cancellation** using `AbortSignal`. This is essential for:

- **Preventing hanging requests** (network issues, slow servers)
- **Resource management** (avoiding memory leaks from abandoned requests)
- **User experience** (responsive applications that don't freeze)
- **Cost control** (preventing runaway API calls)

---

## 🚀 Basic Usage

### Simple Timeout with `AbortSignal.timeout()`

Bun provides a convenient `AbortSignal.timeout()` method for simple timeout scenarios:

```typescript
// ✅ Good: Simple timeout using AbortSignal.timeout()
const response = await fetch("https://api.example.com/data", {
  signal: AbortSignal.timeout(5000), // 5 second timeout
});

const data = await response.json();
```

### Manual Cancellation with `AbortController`

For more control (e.g., canceling based on user action), use `AbortController`:

```typescript
// ✅ Good: Manual cancellation control
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

// Or cancel based on user action
button.addEventListener("click", () => controller.abort());

const response = await fetch("https://api.example.com/data", {
  signal: controller.signal,
});

const data = await response.json();
```

---

## 📋 Common Patterns

### Pattern 1: Timeout with Error Handling

```typescript
async function fetchWithTimeout(url: string, timeoutMs: number) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}
```

### Pattern 2: Timeout with Retry Logic

```typescript
async function fetchWithRetry(
  url: string,
  timeoutMs: number,
  maxRetries: number = 3,
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok) {
        return response;
      }

      // Retry on server errors (5xx)
      if (response.status >= 500 && attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
        continue;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        if (attempt === maxRetries - 1) {
          throw new Error(`Request timeout after ${timeoutMs}ms (${maxRetries} attempts)`);
        }
        // Retry on timeout
        continue;
      }
      throw error;
    }
  }

  throw new Error("Max retries exceeded");
}
```

### Pattern 3: Multiple Requests with Shared Timeout

```typescript
async function fetchMultiple(urls: string[], timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const responses = await Promise.all(
      urls.map((url) =>
        fetch(url, {
          signal: controller.signal,
        }),
      ),
    );

    clearTimeout(timeoutId);
    return responses;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    throw error;
  }
}
```

### Pattern 4: Streaming with Timeout

```typescript
async function streamWithTimeout(url: string, timeoutMs: number) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.body) {
    throw new Error("Response body is not streamable");
  }

  const decoder = new TextDecoder();
  for await (const chunk of response.body) {
    const text = decoder.decode(chunk, { stream: true });
    console.log("Chunk:", text);
  }
}
```

### Pattern 5: User-Initiated Cancellation

```typescript
class FetchManager {
  private controllers = new Map<string, AbortController>();

  async fetch(url: string, requestId: string, timeoutMs: number) {
    // Cancel any existing request with same ID
    this.cancel(requestId);

    const controller = new AbortController();
    this.controllers.set(requestId, controller);

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.controllers.delete(requestId);

      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      this.controllers.delete(requestId);
      throw error;
    }
  }

  cancel(requestId: string) {
    const controller = this.controllers.get(requestId);
    if (controller) {
      controller.abort();
      this.controllers.delete(requestId);
    }
  }
}
```

---

## ⚠️ Error Handling

### Detecting Timeout Errors

```typescript
try {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
  });
} catch (error: unknown) {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      // Request was aborted (timeout or manual cancellation)
      console.error("Request aborted:", error.message);
    } else {
      // Other network errors
      console.error("Network error:", error.message);
    }
  }
}
```

### Timeout vs Network Errors

```typescript
async function fetchWithDetailedError(url: string, timeoutMs: number) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });

    return await response.json();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: "timeout",
          message: `Request timed out after ${timeoutMs}ms`,
        };
      }

      if (error.message.includes("ECONNREFUSED")) {
        return {
          success: false,
          error: "connection_refused",
          message: "Could not connect to server",
        };
      }

      return {
        success: false,
        error: "network_error",
        message: error.message,
      };
    }

    return {
      success: false,
      error: "unknown",
      message: "An unknown error occurred",
    };
  }
}
```

---

## 🎯 When to Use Timeouts

### ✅ Always Use Timeouts For:

- **External API calls** (third-party services, unpredictable latency)
- **User-facing requests** (prevent UI freezing)
- **Batch operations** (prevent one slow request blocking others)
- **Production environments** (prevent resource exhaustion)
- **Streaming responses** (prevent indefinite waits)

### ⚠️ Consider Shorter Timeouts For:

- **Health checks** (1-2 seconds)
- **Real-time features** (WebSocket fallbacks, 3-5 seconds)
- **UI interactions** (user-initiated actions, 5-10 seconds)
- **Background jobs** (can be longer, 30-60 seconds)

### 📊 Recommended Timeout Values

| Use Case | Timeout | Reason |
|----------|---------|--------|
| Health checks | 1-2s | Fast failure for monitoring |
| User API calls | 5-10s | Balance UX and reliability |
| File uploads | 30-60s | Large files need more time |
| Background jobs | 60-300s | Can afford longer waits |
| Streaming | 30-60s | Per-chunk timeout, not total |

---

## 🔍 Performance Considerations

### Timeout Overhead

- **`AbortSignal.timeout()`**: Minimal overhead (~1-2μs setup)
- **`AbortController`**: Slightly more overhead (~2-5μs) but more flexible
- **Memory**: Aborted requests are cleaned up automatically

### Best Practices

1. **Set reasonable timeouts** - Too short causes false failures, too long wastes resources
2. **Use different timeouts per endpoint** - Critical vs non-critical operations
3. **Combine with retries** - Retry on timeout for transient failures
4. **Monitor timeout rates** - High timeout rates indicate network/server issues

---

## 🐛 Debugging

### Enable Verbose Logging

```typescript
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000),
  verbose: true, // Bun-specific: prints request/response details
});
```

### Track Timeout Metrics

```typescript
class TimeoutTracker {
  private timeouts = new Map<string, number>();

  async fetchWithTracking(url: string, timeoutMs: number) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });

      const duration = Date.now() - startTime;
      console.log(`Request ${requestId} completed in ${duration}ms`);

      return response;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      if (error instanceof Error && error.name === "AbortError") {
        console.warn(`Request ${requestId} timed out after ${duration}ms`);
        this.timeouts.set(requestId, duration);
      }
      throw error;
    }
  }

  getTimeoutStats() {
    return {
      totalTimeouts: this.timeouts.size,
      averageTimeoutDuration:
        Array.from(this.timeouts.values()).reduce((a, b) => a + b, 0) /
        this.timeouts.size,
    };
  }
}
```

---

## 📚 Related Documentation

- [Bun Fetch Streaming Responses](./BUN-FETCH-STREAMING-RESPONSES.md) - Stream large responses efficiently
- [Bun Fetch API Examples](../examples/bun-fetch-api-examples.ts) - Comprehensive fetch examples
- [Anti-Patterns Guide](./ANTI-PATTERNS.md) - Always use timeouts for fetch requests
- [Bun Official Docs](https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout) - Official timeout documentation

---

## 🔗 Project-Specific Examples

### Example: Correlation Graph API with Timeout

```typescript
// See examples/bun-fetch-streaming-examples.ts
async function fetchCorrelationGraph(eventId: string) {
  const response = await fetch(
    `http://localhost:3000/api/correlation-graph/${eventId}`,
    {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    },
  );

  if (!response.body) {
    throw new Error("Response body is not streamable");
  }

  // Stream NDJSON response
  const decoder = new TextDecoder();
  for await (const chunk of response.body) {
    const text = decoder.decode(chunk, { stream: true });
    // Process correlation data incrementally
  }
}
```

### Example: Workspace API with Retry on Timeout

```typescript
async function fetchWorkspaceConfig() {
  const maxRetries = 3;
  const timeoutMs = 5000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch("http://localhost:3000/api/workspace/config", {
        signal: AbortSignal.timeout(timeoutMs),
      });

      return await response.json();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        if (attempt === maxRetries - 1) {
          throw new Error(`Workspace config fetch failed after ${maxRetries} attempts`);
        }
        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt)),
        );
        continue;
      }
      throw error;
    }
  }
}
```

---

## ✅ Quick Reference

| Pattern | Code |
|---------|------|
| Simple timeout | `fetch(url, { signal: AbortSignal.timeout(5000) })` |
| Manual cancel | `controller.abort()` |
| Error handling | `error.name === "AbortError"` |
| Retry on timeout | Retry loop with exponential backoff |
| Multiple requests | Shared `AbortController` for all requests |

---

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+
