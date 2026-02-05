# Bun Fetch API: Custom Headers

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+  
**Reference**: [Bun Fetch Documentation](https://bun.com/docs/runtime/networking/fetch#custom-headers)

> **Status**: ✅ Production Ready  
> **See Also**: [Anti-Patterns Guide](./ANTI-PATTERNS.md) - Proper header handling

---

## Overview

Bun's `fetch` API supports **custom headers** using both object literals and the `Headers` API. Headers are essential for:

- **Authentication** (API keys, Bearer tokens, OAuth)
- **Request identification** (request IDs, correlation IDs)
- **Content negotiation** (Accept, Content-Type)
- **Security** (CSRF tokens, custom security headers)
- **API versioning** (API version headers)
- **Rate limiting** (rate limit headers)

---

## 🚀 Basic Usage

### Method 1: Object Format (Simple)

The simplest way to set headers is using an object literal:

```typescript
// ✅ Good: Simple object format
const response = await fetch("https://api.example.com/data", {
  headers: {
    "X-Custom-Header": "value",
    "Authorization": "Bearer token123",
    "Content-Type": "application/json",
  },
});

const data = await response.json();
```

### Method 2: Headers Object (Advanced)

For more control (e.g., appending multiple values), use the `Headers` API:

```typescript
// ✅ Good: Headers object for advanced control
const headers = new Headers();
headers.append("X-Custom-Header", "value");
headers.append("Authorization", "Bearer token123");
headers.set("Content-Type", "application/json");

const response = await fetch("https://api.example.com/data", {
  headers,
});

const data = await response.json();
```

---

## 📋 Common Patterns

### Pattern 1: Reusable Header Sets

```typescript
// ✅ Good: Reusable header configuration
const HYPERBUN_HEADERS = Object.freeze({
  "User-Agent": `HyperBun/${Bun.version} (${process.platform})`,
  "Accept": "application/json",
  "Accept-Encoding": "gzip, deflate, br",
});

async function fetchWithStandardHeaders(url: string) {
  const response = await fetch(url, {
    headers: {
      ...HYPERBUN_HEADERS,
      "X-Request-ID": crypto.randomUUID(),
    },
  });

  return await response.json();
}
```

### Pattern 2: Dynamic Headers with Merging

```typescript
// ✅ Good: Merge default and custom headers
class FetchClient {
  private defaultHeaders: Record<string, string>;

  constructor(defaultHeaders: Record<string, string> = {}) {
    this.defaultHeaders = {
      "User-Agent": `MyApp/${Bun.version}`,
      "Accept": "application/json",
      ...defaultHeaders,
    };
  }

  async fetch(url: string, options: RequestInit = {}) {
    const mergedHeaders = {
      ...this.defaultHeaders,
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers: mergedHeaders,
    });

    return response;
  }
}
```

### Pattern 3: Authentication Headers

```typescript
// ✅ Good: Secure token handling
class AuthenticatedClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async fetch(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      },
    });

    return response;
  }

  // Rotate token
  updateToken(newToken: string) {
    this.token = newToken;
  }
}
```

### Pattern 4: Conditional Headers

```typescript
// ✅ Good: Conditional header inclusion
async function fetchWithConditionalHeaders(
  url: string,
  includeAuth: boolean = false,
  includeTrace: boolean = false,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (includeAuth) {
    headers["Authorization"] = `Bearer ${process.env.API_TOKEN}`;
  }

  if (includeTrace) {
    headers["X-Trace-ID"] = crypto.randomUUID();
    headers["X-Request-ID"] = crypto.randomUUID();
  }

  const response = await fetch(url, { headers });
  return await response.json();
}
```

### Pattern 5: Headers Object with Multiple Values

```typescript
// ✅ Good: Headers object for multiple values
const headers = new Headers();
headers.append("Accept", "application/json");
headers.append("Accept", "application/xml"); // Multiple Accept values
headers.set("Authorization", "Bearer token");

const response = await fetch("https://api.example.com/data", {
  headers,
});

// Server receives: Accept: application/json, application/xml
```

### Pattern 6: Headers with Timeout

```typescript
// ✅ Good: Combine headers with timeout
async function fetchWithHeadersAndTimeout(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  return await response.json();
}
```

---

## 🔒 Security Best Practices

### ✅ DO: Use Secure Token Storage

```typescript
// ✅ Good: Token from secure storage
const token = await Bun.secrets.get({
  service: "com.example.api",
  name: "api-token",
});

const response = await fetch("https://api.example.com/data", {
  headers: {
    "Authorization": `Bearer ${token}`,
  },
});
```

### ❌ DON'T: Hardcode Tokens

```typescript
// ❌ Bad: Hardcoded token
const response = await fetch("https://api.example.com/data", {
  headers: {
    "Authorization": "Bearer hardcoded-token-123", // Never do this!
  },
});
```

### ✅ DO: Validate Header Values

```typescript
// ✅ Good: Validate header values
function createHeaders(token: string): Record<string, string> {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid token");
  }

  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
```

### ✅ DO: Use HTTPS for Sensitive Headers

```typescript
// ✅ Good: Always use HTTPS for authentication
const response = await fetch("https://api.example.com/data", {
  headers: {
    "Authorization": `Bearer ${token}`, // Safe over HTTPS
  },
});
```

---

## 🎯 Common Header Use Cases

### API Authentication

```typescript
// Bearer token
headers: {
  "Authorization": "Bearer your-token-here",
}

// API key
headers: {
  "X-API-Key": "your-api-key",
}

// Basic auth
headers: {
  "Authorization": `Basic ${btoa("username:password")}`,
}
```

### Request Identification

```typescript
headers: {
  "X-Request-ID": crypto.randomUUID(),
  "X-Correlation-ID": correlationId,
  "X-Client-Version": "1.0.0",
}
```

### Content Negotiation

```typescript
headers: {
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Content-Type": "application/json",
}
```

### Rate Limiting

```typescript
headers: {
  "X-RateLimit-Limit": "1000",
  "X-RateLimit-Remaining": "999",
  "X-RateLimit-Reset": "1640995200",
}
```

### CSRF Protection

```typescript
headers: {
  "X-CSRF-Token": csrfToken,
  "X-Requested-With": "XMLHttpRequest",
}
```

---

## ⚠️ Common Pitfalls

### Pitfall 1: Case Sensitivity

HTTP headers are case-insensitive per RFC 7230, but some servers may be strict:

```typescript
// ✅ Good: Use standard casing
headers: {
  "Content-Type": "application/json", // Standard casing
  "Authorization": "Bearer token",
}

// ⚠️ Works but inconsistent
headers: {
  "content-type": "application/json", // Lowercase works but non-standard
  "AUTHORIZATION": "Bearer token", // Uppercase works but non-standard
}
```

### Pitfall 2: Overwriting Headers

```typescript
// ❌ Bad: May overwrite important headers
const response = await fetch(url, {
  headers: {
    "User-Agent": "MyApp/1.0",
  },
});

// ✅ Good: Merge with existing headers
const response = await fetch(url, {
  headers: {
    ...existingHeaders,
    "User-Agent": "MyApp/1.0",
  },
});
```

### Pitfall 3: Invalid Header Values

```typescript
// ❌ Bad: Invalid characters in header values
headers: {
  "X-Custom": "value\nwith\nnewlines", // Invalid!
}

// ✅ Good: Validate header values
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, ""); // Remove newlines
}

headers: {
  "X-Custom": sanitizeHeaderValue(userInput),
}
```

### Pitfall 4: Not Handling Header Errors

```typescript
// ❌ Bad: No error handling
const response = await fetch(url, {
  headers: {
    "Authorization": `Bearer ${token}`,
  },
});

// ✅ Good: Handle authentication errors
try {
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Token expired, refresh it
    const newToken = await refreshToken();
    // Retry with new token
  }
} catch (error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    // Handle timeout
  }
  throw error;
}
```

---

## 🔍 Debugging

### Enable Verbose Logging

```typescript
// ✅ Good: Debug headers with verbose logging
const response = await fetch("https://api.example.com/data", {
  headers: {
    "Authorization": "Bearer token",
    "X-Custom-Header": "value",
  },
  verbose: true, // Bun-specific: prints request/response headers
});
```

### Inspect Request Headers

```typescript
// ✅ Good: Create Request object to inspect headers
const request = new Request("https://api.example.com/data", {
  headers: {
    "Authorization": "Bearer token",
    "X-Custom-Header": "value",
  },
});

console.log("Request headers:", Object.fromEntries(request.headers.entries()));

const response = await fetch(request);
```

### Log Headers for Debugging

```typescript
// ✅ Good: Log headers for debugging (remove in production)
function debugFetch(url: string, options: RequestInit = {}) {
  if (process.env.DEBUG === "true") {
    console.log("Request URL:", url);
    console.log("Request headers:", options.headers);
  }

  return fetch(url, options);
}
```

---

## 📚 Related Documentation

- [Bun Fetch Streaming Responses](./BUN-FETCH-STREAMING-RESPONSES.md) - Stream large responses efficiently
- [Bun Fetch Timeouts](./BUN-FETCH-TIMEOUTS.md) - Always use timeouts for fetch requests
- [Bun Fetch API Examples](../examples/bun-fetch-api-examples.ts) - Comprehensive fetch examples
- [Anti-Patterns Guide](./ANTI-PATTERNS.md) - Proper header handling
- [Bun Official Docs](https://bun.com/docs/runtime/networking/fetch#custom-headers) - Official custom headers documentation

---

## 🔗 Project-Specific Examples

### Example: Workspace API with Authentication

```typescript
// See src/workspace/devworkspace.ts
async function fetchWorkspaceAPI(endpoint: string, apiKey: string) {
  const response = await fetch(`http://localhost:3000/api/workspace/${endpoint}`, {
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
  });

  return await response.json();
}
```

### Example: Correlation Graph API with Request ID

```typescript
// See examples/bun-fetch-streaming-examples.ts
async function fetchCorrelationGraph(eventId: string) {
  const requestId = crypto.randomUUID();

  const response = await fetch(
    `http://localhost:3000/api/correlation-graph/${eventId}`,
    {
      headers: {
        "X-Request-ID": requestId,
        "Accept": "application/x-ndjson",
      },
      signal: AbortSignal.timeout(10000),
    },
  );

  // Stream response...
}
```

### Example: Market Probe with Bookmaker Headers

```typescript
// See src/hyper-bun/market-probe-service.ts
async function fetchMarketData(bookmaker: string, marketId: string) {
  const headers = await getBookmakerHeaders(bookmaker);

  const response = await fetch(
    `https://api.${bookmaker}.com/market/${marketId}`,
    {
      headers: {
        ...headers,
        "X-Request-ID": crypto.randomUUID(),
      },
      signal: AbortSignal.timeout(5000),
    },
  );

  return await response.json();
}
```

---

## ✅ Quick Reference

| Pattern | Code |
|---------|------|
| Object format | `headers: { "X-Header": "value" }` |
| Headers object | `new Headers().set("X-Header", "value")` |
| Multiple values | `headers.append("Accept", "value1"); headers.append("Accept", "value2")` |
| Merge headers | `{ ...defaultHeaders, ...customHeaders }` |
| Authentication | `"Authorization": "Bearer token"` |
| Request ID | `"X-Request-ID": crypto.randomUUID()` |
| Content-Type | `"Content-Type": "application/json"` |

---

## 🎓 Best Practices Summary

1. **Always use HTTPS** for sensitive headers (Authorization, API keys)
2. **Store tokens securely** (use `Bun.secrets`, environment variables)
3. **Validate header values** before sending (sanitize user input)
4. **Use standard header names** (Content-Type, Authorization, etc.)
5. **Merge headers carefully** (don't overwrite important defaults)
6. **Handle authentication errors** (401, 403 status codes)
7. **Use Headers object** when you need multiple values or advanced control
8. **Include request IDs** for tracing and debugging
9. **Set appropriate Content-Type** for request bodies
10. **Combine with timeouts** for production reliability

---

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.4+
