# HTTP 408 Request Timeout

**Status**: ✅ Documented  
**HTTP Status Code**: 408  
**NEXUS Error Code**: NX-006  
**Last Updated**: 2025-12-08

## Overview

HTTP 408 Request Timeout indicates that the server did not receive a complete request message within the time that it was prepared to wait. This is different from 504 Gateway Timeout, which indicates a timeout between servers.

**Reference**: [MDN HTTP 408 Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/408)

---

## When to Use HTTP 408

### Use 408 Request Timeout When:

- ✅ **Incomplete Request**: Client did not send complete request headers/body within server's timeout window
- ✅ **Client-Side Timeout**: Timeout occurs before server receives full request
- ✅ **Request Reading Timeout**: Server is waiting for client to finish sending request
- ✅ **Idle Connection**: Client connection is idle for too long during request transmission

### Do NOT Use 408 For:

- ❌ **Server-to-Server Timeout**: Use 504 Gateway Timeout instead
- ❌ **Processing Timeout**: Use 500 or 503 instead
- ❌ **External Service Timeout**: Use 504 Gateway Timeout (NX-405)

---

## Comparison: 408 vs 504

| Status Code | When to Use | Example |
|-------------|-------------|---------|
| **408 Request Timeout** | Server didn't receive complete request from client | Client uploads large file but connection drops mid-upload |
| **504 Gateway Timeout** | Server didn't receive response from upstream server | API calls external service but external service times out |

---

## NEXUS Error Registry

### Error Code: NX-006

```typescript
{
  code: "NX-006",
  status: 408,
  message: "Request Timeout",
  category: "GENERAL",
  ref: "/docs/errors#nx-006",
  recoverable: true,
  details: "The server did not receive a complete request message within the time that it was prepared to wait. The client should retry the request."
}
```

---

## Implementation Examples

### Example 1: Request Reading Timeout

```typescript
import { HTTP_STATUS } from '../api/git-info-constants';
import { wrapError } from '../errors';

// Server-side timeout for reading request
app.post('/api/upload', async (c) => {
  const timeout = 30000; // 30 seconds
  
  try {
    // Set timeout for reading request body
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const body = await c.req.json({ signal: controller.signal });
    clearTimeout(timeoutId);
    
    // Process body...
    return c.json({ success: true });
  } catch (error) {
    if (error.name === 'AbortError') {
      // Request reading timed out
      return c.json(
        wrapError('NX-006', { details: 'Request timeout - incomplete request received' }),
        HTTP_STATUS.REQUEST_TIMEOUT
      );
    }
    throw error;
  }
});
```

### Example 2: Using Bun.serve() Request Timeout

```typescript
Bun.serve({
  port: 3000,
  async fetch(req) {
    // Bun automatically handles request reading timeouts
    // You can configure this via server options
    
    try {
      const body = await req.json();
      return new Response(JSON.stringify({ success: true }));
    } catch (error) {
      // Handle timeout errors
      if (error instanceof Error && error.message.includes('timeout')) {
        return new Response(
          JSON.stringify({
            error: 'NX-006',
            message: 'Request Timeout',
            details: 'Server did not receive complete request'
          }),
          { status: 408 }
        );
      }
      throw error;
    }
  },
  // Configure request timeout (if supported)
  // idleTimeout: 30000, // 30 seconds
});
```

### Example 3: Manual Request Timeout Detection

```typescript
import { NexusError } from '../errors';

function createRequestTimeoutHandler(timeoutMs: number) {
  return async (req: Request): Promise<Response | null> => {
    const startTime = Date.now();
    
    // Monitor request reading
    const reader = req.body?.getReader();
    if (!reader) return null;
    
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    
    try {
      while (true) {
        const { done, value } = await Promise.race([
          reader.read(),
          new Promise<{ done: boolean; value?: Uint8Array }>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
          )
        ]);
        
        if (done) break;
        if (value) {
          chunks.push(value);
          totalSize += value.length;
        }
        
        // Check if request is taking too long
        if (Date.now() - startTime > timeoutMs) {
          throw new Error('Request timeout');
        }
      }
      
      return null; // Request completed successfully
    } catch (error) {
      if (error instanceof Error && error.message === 'Request timeout') {
        return new Response(
          JSON.stringify({
            error: 'NX-006',
            message: 'Request Timeout',
            status: 408
          }),
          { status: 408 }
        );
      }
      throw error;
    }
  };
}
```

---

## Client-Side Handling

### Retry Strategy

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 408) {
        // Request Timeout - retry with exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
```

---

## Integration with NEXUS Platform

### Error Registry Usage

```typescript
import { ERROR_REGISTRY } from '../errors';

// Get error definition
const timeoutError = ERROR_REGISTRY['NX-006'];
console.log(timeoutError.status); // 408
console.log(timeoutError.message); // "Request Timeout"
console.log(timeoutError.recoverable); // true
```

### Error Response Format

```typescript
import { wrapError } from '../errors';

// Return 408 error response
return c.json(
  wrapError('NX-006', {
    details: 'Request timeout after 30 seconds',
    timeoutMs: 30000
  }),
  408
);
```

---

## Best Practices

### 1. Set Appropriate Timeouts

```typescript
// ✅ Good - Reasonable timeout for request reading
const REQUEST_READ_TIMEOUT = 30000; // 30 seconds

// ❌ Avoid - Too short (may timeout on slow connections)
const REQUEST_READ_TIMEOUT = 1000; // 1 second

// ❌ Avoid - Too long (wastes server resources)
const REQUEST_READ_TIMEOUT = 300000; // 5 minutes
```

### 2. Provide Clear Error Messages

```typescript
// ✅ Good - Clear error message
return c.json({
  error: 'NX-006',
  message: 'Request Timeout',
  details: 'Server did not receive complete request within 30 seconds',
  timeoutMs: 30000,
  retryable: true
}, 408);

// ❌ Avoid - Vague error message
return c.json({ error: 'Timeout' }, 408);
```

### 3. Include Retry Information

```typescript
// ✅ Good - Include retry guidance
return c.json({
  error: 'NX-006',
  message: 'Request Timeout',
  retryAfter: 5, // seconds
  retryable: true
}, 408);
```

---

## Related HTTP Status Codes

| Code | Name | Use Case |
|------|------|----------|
| **408** | Request Timeout | Server didn't receive complete request from client |
| **504** | Gateway Timeout | Server didn't receive response from upstream server |
| **503** | Service Unavailable | Server temporarily unavailable |
| **500** | Internal Server Error | Server error during request processing |

---

## Related Documentation

- [MDN HTTP 408](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/408) - Official MDN documentation
- [NEXUS Error Registry](../src/errors/index.ts) - Error code definitions
- [HTTP Status Codes](./HTTP-STATUS-CODES.md) - Complete status code reference
- [Error Handling Guide](./ERROR-HANDLING.md) - Error handling best practices

---

## Test Coverage

**Test File**: `test/api/http-status-codes.test.ts` (to be created)

**Coverage**:
- ✅ 408 Request Timeout error response
- ✅ Request reading timeout detection
- ✅ Client retry handling
- ✅ Error message clarity

---

**Last Updated**: 2025-12-08  
**Status**: ✅ Documented
