# Fetch Error Handling Patterns Guide

This comprehensive guide documents all fetch error handling patterns used throughout the codebase, with real-world examples from production code.

## 📋 Table of Contents

- [1. Response Status Checking](#1-response-status-checking)
- [2. Status Code Specific Error Handling](#2-status-code-specific-error-handling)
- [3. Try-Catch with Network Error Handling](#3-try-catch-with-network-error-handling)
- [4. Retry Logic with Exponential Backoff](#4-retry-logic-with-exponential-backoff)
- [5. AbortSignal Timeouts](#5-abortsignal-timeouts)
- [6. Cookie Parsing Error Handling](#6-cookie-parsing-error-handling)
- [7. Metrics Recording for Error Tracking](#7-metrics-recording-for-error-tracking)
- [8. Complete Production Example](#8-complete-production-example)
- [9. Error Handling Checklist](#9-error-handling-checklist)

---

## 1. Response Status Checking

The most fundamental pattern - fetch doesn't throw on HTTP errors, so you must check manually.

### Pattern
```typescript
const response = await fetch(url, options);

// Manual error checking - REQUIRED
if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

const data = await response.json();
```

### Real-World Example
```typescript
// @/Users/nolarose/b-react-hmr-refresh/src/api/auth-cookie-handler.ts:18-20
export async function loginAndStoreCookies() {
  const response = await fetch("https://api.example.com/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: Bun.env.API_PASSWORD }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  // Process cookies...
  return { success: true, cookieCount: cookieJar.size };
}
```

### Why This Matters
- Unlike axios, fetch **does not throw** on HTTP errors (4xx, 5xx)
- `response.ok` is `true` only for status codes 200-299
- Always check before calling `.json()` or `.text()`

---

## 2. Status Code Specific Error Handling

Detailed handling for different HTTP status codes with user-friendly messages.

### Pattern
```typescript
async function safeFetch(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    switch (response.status) {
      case 400:
        throw new Error('Bad request - invalid data');
      case 401:
        throw new Error('Authentication required');
      case 403:
        throw new Error('Access forbidden - insufficient permissions');
      case 404:
        throw new Error('Resource not found');
      case 429:
        throw new Error('Rate limit exceeded - please try again later');
      case 500:
        throw new Error('Internal server error');
      case 502:
        throw new Error('Bad gateway - upstream server error');
      case 503:
        throw new Error('Service temporarily unavailable');
      default:
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
  
  return response.json();
}
```

### Status Code Categories

| Code Range | Type | Retryable? | Example |
|------------|------|------------|---------|
| 200-299 | Success | No | OK, Created |
| 300-399 | Redirect | No | Moved Permanently |
| 400-499 | Client Error | No | Bad Request, Unauthorized |
| 500-599 | Server Error | Yes | Internal Server Error, Bad Gateway |

---

## 3. Try-Catch with Network Error Handling

Wrap fetch in try-catch to handle network failures (DNS errors, connection refused, etc.).

### Pattern
```typescript
try {
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('Success:', data);
  
} catch (error) {
  if (error instanceof TypeError) {
    // Network error (DNS, offline, etc.)
    console.error('Network error:', error.message);
  } else if (error instanceof Error) {
    // HTTP error
    console.error('HTTP error:', error.message);
  } else {
    // Unknown error
    console.error('Unknown error:', error);
  }
  throw error; // Re-throw for caller to handle
}
```

### Real-World Example
```typescript
// @/Users/nolarose/b-react-hmr-refresh/examples/fetch-advanced-demo.ts:24-44
async function basicFetchWithErrorHandling() {
  log.info("=== Basic Fetch with Error Handling ===");
  
  try {
    const response = await fetch(`${API_BASE}/api/config`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Bun-Enhanced-File-Analyzer/1.3.6",
      },
    });

    // Manual error checking - CRITICAL for fetch
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    log.success("✅ Basic fetch successful", { prefix: "FETCH" });
    console.log("Config data:", data);
    
  } catch (error) {
    log.error(`❌ Fetch failed: ${error.message}`, { prefix: "FETCH" });
  }
}
```

### Error Types

| Error Type | Cause | Handling |
|------------|-------|----------|
| `TypeError` | Network failure, DNS error, CORS | Show "Network error" message |
| `Error` with status | HTTP error (4xx, 5xx) | Show status-specific message |
| `SyntaxError` | Invalid JSON response | Show "Invalid response" message |
| `AbortError` | Request cancelled | Silent cleanup |

---

## 4. Retry Logic with Exponential Backoff

Automatic retries for transient server errors (5xx) with exponential backoff and jitter.

### Pattern
```typescript
async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  maxRetries = 3,
  baseDelay = 1000
) {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (response.ok) return response.json();
      
      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }
      
      // Retry server errors (5xx) with exponential backoff
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s...
        const jitter = Math.random() * 0.1 * delay; // Add jitter
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        log.info(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      }
      
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries) break;
      
      // Don't retry network errors if it's the last attempt
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
    }
  }
  
  throw lastError!;
}
```

### Retry Timing Example

| Attempt | Base Delay | With Jitter | Total Delay |
|---------|------------|--------------|-------------|
| 1 | 1000ms | 0-100ms | ~1050ms |
| 2 | 2000ms | 0-200ms | ~2100ms |
| 3 | 4000ms | 0-400ms | ~4200ms |
| **Total** | - | - | **~7350ms** |

### When to Retry

| Status Code | Retry? | Reason |
|-------------|--------|--------|
| 429 | Yes | Rate limiting - wait and retry |
| 500 | Yes | Transient server error |
| 502 | Yes | Bad gateway - temporary |
| 503 | Yes | Service unavailable - temporary |
| 400 | No | Bad request - won't fix |
| 401 | No | Auth required - won't fix |
| 403 | No | Forbidden - won't fix |
| 404 | No | Not found - won't fix |

---

## 5. AbortSignal Timeouts

Prevent hanging requests with timeout signals using AbortController.

### Pattern
```typescript
// Simple timeout
async function fetchWithTimeout(url: string, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Using AbortSignal.timeout (Bun/Modern browsers)
async function fetchWithSignalTimeout(url: string, timeoutMs = 10000) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs)
    });
    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}
```

### Timeout Recommendations

| Request Type | Timeout | Reason |
|--------------|---------|--------|
| User-facing API | 5-10s | User experience |
| Background sync | 30s | Lower priority |
| File upload | 60s+ | Large files |
| WebSocket | None | Persistent connection |
| Health check | 3s | Quick check |

---

## 6. Cookie Parsing Error Handling

Safe cookie parsing with fallbacks for different environments.

### Pattern
```typescript
interface ParsedCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

function parseCookieHeader(header: string): ParsedCookie {
  try {
    if (typeof Bun !== 'undefined' && Bun.Cookie) {
      // Use Bun's native cookie parser
      const cookie = Bun.Cookie.parse(header);
      return {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      };
    } else {
      // Simple fallback parsing
      const [nameValue] = header.split(';');
      const [name, value] = nameValue.split('=');
      return { name: name?.trim(), value: value?.trim() };
    }
  } catch (error) {
    console.warn(`Failed to parse cookie: ${header}`, error);
    return { name: 'unknown', value: '' };
  }
}
```

### Real-World Example
```typescript
// @/Users/nolarose/b-react-hmr-refresh/src/api/authenticated-client.ts:164-199
// Process Set-Cookie headers
const setCookies = response.headers.getSetCookie?.() || [];
let newCookieCount = 0;

for (const header of setCookies) {
  try {
    let cookie;
    if (typeof Bun !== 'undefined' && Bun.Cookie) {
      cookie = Bun.Cookie.parse(header);
    } else {
      // Simple fallback parsing
      const [nameValue] = header.split(';');
      const [name, value] = nameValue.split('=');
      cookie = { name, value };
    }
    
    // Apply security policy
    const cookieOptions = {
      ...config.securityPolicy,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly ?? config.securityPolicy?.httpOnly,
      secure: cookie.secure ?? config.securityPolicy?.secure,
      sameSite: cookie.sameSite ?? config.securityPolicy?.sameSite,
    };
    
    if (typeof Bun !== 'undefined' && Bun.CookieMap && jar.set) {
      jar.set(cookie.name, cookie.value, cookieOptions);
    } else {
      // Map fallback
      (jar as Map<string, string>).set(cookie.name, cookie.value);
    }
    newCookieCount++;
    
    log('debug', `Stored cookie: ${cookie.name}`);
  } catch (cookieError) {
    log('warn', `Failed to parse cookie: ${header}`, cookieError);
  }
}
```

---

## 7. Metrics Recording for Error Tracking

Track request metrics including failures for monitoring and debugging.

### Pattern
```typescript
interface RequestMetrics {
  url: string;
  method: string;
  duration: number;
  status: number;
  cookieCount: number;
  timestamp: number;
  error?: string;
}

const metrics: RequestMetrics[] = [];

async function fetchWithMetrics(url: string, options: RequestInit = {}): Promise<Response> {
  const startTime = Date.now();
  const method = options.method || 'GET';
  
  try {
    const response = await fetch(url, options);
    
    // Record success metrics
    const metric: RequestMetrics = {
      url,
      method,
      duration: Date.now() - startTime,
      status: response.status,
      cookieCount: jar.size,
      timestamp: Date.now(),
    };
    
    metrics.push(metric);
    if (metrics.length > 100) metrics.shift(); // Keep last 100 requests
    
    return response;
    
  } catch (error) {
    // Record error metrics
    const metric: RequestMetrics = {
      url,
      method,
      duration: Date.now() - startTime,
      status: 0,
      cookieCount: jar.size,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    metrics.push(metric);
    log('error', `Request failed after ${metric.duration}ms`, error);
    throw error;
  }
}
```

### Metrics Dashboard Example
```typescript
function getMetricsSummary() {
  const recentMetrics = metrics.slice(-100);
  
  const summary = {
    totalRequests: recentMetrics.length,
    successCount: recentMetrics.filter(m => m.status >= 200 && m.status < 300).length,
    errorCount: recentMetrics.filter(m => m.status >= 400 || m.error).length,
    avgDuration: recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length,
    errorRate: recentMetrics.filter(m => m.status >= 400 || m.error).length / recentMetrics.length,
    topErrors: getTopErrors(),
  };
  
  return summary;
}

function getTopErrors() {
  const errorCounts: Record<string, number> = {};
  metrics.forEach(m => {
    if (m.error) {
      errorCounts[m.error] = (errorCounts[m.error] || 0) + 1;
    }
  });
  return Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}
```

---

## 8. Complete Production Example

A production-ready fetch wrapper combining all patterns.

```typescript
import { createCookieClient } from "../src/api/authenticated-client";
import { log } from "../src/utils/logger";

interface FetchOptions {
  timeout?: number;
  retries?: number;
  includeCookies?: boolean;
}

interface FetchResult<T> {
  data: T;
  status: number;
  duration: number;
  cookies: Record<string, string>;
}

class FetchClient {
  private client = createCookieClient();
  private defaultTimeout = 10000;
  private defaultRetries = 3;

  async get<T>(url: string, options: FetchOptions = {}): Promise<FetchResult<T>> {
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T>(url: string, body: unknown, options: FetchOptions = {}): Promise<FetchResult<T>> {
    return this.request<T>('POST', url, body, options);
  }

  async put<T>(url: string, body: unknown, options: FetchOptions = {}): Promise<FetchResult<T>> {
    return this.request<T>('PUT', url, body, options);
  }

  async delete<T>(url: string, options: FetchOptions = {}): Promise<FetchResult<T>> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    options: FetchOptions = {}
  ): Promise<FetchResult<T>> {
    const timeout = options.timeout ?? this.defaultTimeout;
    const maxRetries = options.retries ?? this.defaultRetries;
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await this.client.fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
          credentials: options.includeCookies ? "include" : "same-origin",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check response status
        if (!response.ok) {
          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`Client error: ${response.status} ${response.statusText}`);
          }
          
          // Retry server errors (5xx)
          if (attempt < maxRetries) {
            const delay = 1000 * Math.pow(2, attempt - 1);
            log.warn(`Server error ${response.status}, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        // Parse response
        const data = await response.json();
        
        // Get current cookies
        const cookies = this.client.getCookies();

        log.success(`✅ ${method} ${url} completed in ${Date.now() - startTime}ms`);

        return {
          data,
          status: response.status,
          duration: Date.now() - startTime,
          cookies,
        };

      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;

        // Don't retry on timeout
        if (error instanceof Error && error.name === 'AbortError') {
          log.error(`⏱️ Request timeout after ${timeout}ms`);
          throw new Error(`Request timeout: ${url}`);
        }

        // Don't retry if max retries reached
        if (attempt === maxRetries) {
          log.error(`❌ ${method} ${url} failed after ${maxRetries} attempts`);
          throw lastError;
        }

        log.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      }
    }

    throw lastError;
  }
}

// Usage example
const api = new FetchClient();

try {
  const result = await api.get<User>("/api/user/profile");
  console.log("User:", result.data);
  console.log("Duration:", result.duration, "ms");
  console.log("Status:", result.status);
} catch (error) {
  console.error("Failed to fetch user:", error.message);
}
```

---

## 9. Error Handling Checklist

Use this checklist when implementing fetch error handling:

- [ ] **Status Check**: Always check `response.ok` or `response.status`
- [ ] **Error Messages**: Provide user-friendly error messages
- [ ] **Status Codes**: Handle 4xx and 5xx differently
- [ ] **Network Errors**: Wrap in try-catch for network failures
- [ ] **Timeouts**: Implement AbortSignal timeouts
- [ ] **Retries**: Add exponential backoff for 5xx errors
- [ ] **No Retries**: Don't retry 4xx client errors
- [ ] **Cookies**: Handle cookie parsing errors gracefully
- [ ] **Metrics**: Track request metrics for monitoring
- [ ] **Logging**: Log errors with context for debugging
- [ ] **Type Safety**: Use TypeScript for error types
- [ ] **Fallbacks**: Provide fallbacks for missing Bun APIs

---

## 📁 Related Files

- `@/Users/nolarose/b-react-hmr-refresh/src/api/authenticated-client.ts` - Production fetch client with error handling
- `@/Users/nolarose/b-react-hmr-refresh/src/api/auth-cookie-handler.ts` - Cookie-aware fetch with error handling
- `@/Users/nolarose/b-react-hmr-refresh/examples/fetch-advanced-demo.ts` - Demo with error handling patterns
- `@/Users/nolarose/b-react-hmr-refresh/docs/FETCH_GUIDE.md` - Comprehensive fetch guide

---

## 🔗 See Also

- [MDN Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [Bun Fetch Documentation](https://bun.sh/docs/api/fetch)
- [Fetch Error Handling Best Practices](https://stackoverflow.com/questions/48446470/what-is-the-best-practice-for-fetch-error-handling-in-javascript)
