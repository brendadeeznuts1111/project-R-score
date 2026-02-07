# 🛡️ Bun Error Handling Patterns

> **For comprehensive best practices, see [ERROR_HANDLING_BEST_PRACTICES.md](./ERROR_HANDLING_BEST_PRACTICES.md)**

## Overview
This guide covers proper error handling patterns in Bun applications, focusing on common anti-patterns and best practices.

## 🚀 Quick Start

```typescript
// 1. Initialize global error handling at app startup
import { initializeGlobalErrorHandling } from './lib/core/global-error-handler';

initializeGlobalErrorHandling({
  exitOnUncaughtException: true,
  exitOnUnhandledRejection: false,
  shutdownTimeout: 5000,
});

// 2. Use typed errors throughout your application
import { createValidationError, EnterpriseErrorCode } from './lib/core/core-errors';

// 3. Handle async operations safely
import { safeAsync } from './lib/core/error-handling';
```

## 🌍 Global Error Handling

Initialize global error handling at your application's entry point to catch uncaught exceptions and unhandled promise rejections:

```typescript
// main.ts or index.ts - Application entry point
import { initializeGlobalErrorHandling, onShutdown } from './lib/core/global-error-handler';

// Initialize early, before other imports if possible
const errorHandler = initializeGlobalErrorHandling({
  exitOnUncaughtException: true,    // Exit on sync errors
  exitOnUnhandledRejection: false,  // Continue on async errors
  shutdownTimeout: 10000,           // Grace period for cleanup
  onUncaughtException: (error) => {
    // Custom handling (optional)
    console.error('Critical error:', error);
  },
});

// Register cleanup handlers
onShutdown(async () => {
  await database.disconnect();
  await cache.close();
  console.log('Cleanup complete');
});
```

### Monitoring Error Statistics

```typescript
import { getGlobalErrorStatistics } from './lib/core/global-error-handler';

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = getGlobalErrorStatistics();
  res.json({
    healthy: stats.errorRate < 10,
    ...stats,
  });
});
```

## ✅ Anti-Pattern: Missing Error Handling

### ❌ BAD: No error handling
```typescript
// ANTI-PATTERN: Will crash on network errors
async function fetchData() {
  const res = await fetch('https://api.example.com/data');
  const data = await res.json(); // Throws if response isn't JSON
  return data;
}
```

### ✅ GOOD: Proper error handling
```typescript
async function fetchData() {
  try {
    const res = await fetch('https://api.example.com/data');

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error; // Re-throw for caller to handle
  }
}
```

## 🔧 Bun-Specific Error Handling

### File Operations
```typescript
// ✅ GOOD: Handle file operation errors
async function readConfig() {
  try {
    const content = await Bun.file('config.json').text();
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('Config file not found, using defaults');
      return {};
    }
    throw error;
  }
}

// ✅ GOOD: Handle write operations
async function saveData(data: any) {
  try {
    const json = JSON.stringify(data, null, 2);
    await Bun.write('data.json', json);
    console.log('✅ Data saved successfully');
  } catch (error) {
    console.error('❌ Failed to save data:', error);
    throw error;
  }
}
```

### Network Operations with Timeouts
```typescript
// ✅ GOOD: Network requests with timeout
async function fetchWithTimeout(url: string, timeoutMs = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Bun-App/1.0' }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}
```

## 🧪 Test Error Scenarios

### HTTP Error Testing
```typescript
// Test different HTTP error responses
describe('API Error Handling', () => {
  test('handles 404 errors', async () => {
    await expect(fetchData('/nonexistent')).rejects.toThrow('HTTP 404');
  });

  test('handles network failures', async () => {
    await expect(fetchData('http://invalid-domain')).rejects.toThrow();
  });

  test('handles malformed JSON', async () => {
    // Mock a response that returns invalid JSON
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })
    );

    await expect(fetchData('/api/data')).rejects.toThrow('Invalid JSON');
  });
});
```

## 📋 Common Error Patterns to Check

### 1. HTTP Requests
- [ ] Check `response.ok` before calling `.json()`/`.text()`
- [ ] Handle different HTTP status codes appropriately
- [ ] Implement timeouts for network requests
- [ ] Handle network failures (DNS, connection refused, etc.)

### 2. File Operations
- [ ] Handle `ENOENT` (file not found) errors
- [ ] Handle permission errors (`EACCES`, `EPERM`)
- [ ] Handle disk space errors (`ENOSPC`)
- [ ] Validate file content before parsing (JSON, YAML, etc.)

### 3. JSON Parsing
- [ ] Wrap `JSON.parse()` in try/catch
- [ ] Validate expected structure after parsing
- [ ] Handle `SyntaxError` for malformed JSON

### 4. External APIs
- [ ] Handle rate limiting (`429` status)
- [ ] Handle authentication errors (`401`, `403`)
- [ ] Implement retry logic with exponential backoff
- [ ] Handle temporary service unavailability (`503`)

## 🛠️ Utility Functions

### Error Wrapper for Async Operations
```typescript
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`❌ ${context}:`, error);
    throw new Error(`${context}: ${error.message}`);
  }
}

// Usage
const data = await withErrorHandling(
  () => fetch('https://api.example.com/data').then(r => r.json()),
  'Fetching user data'
);
```

### Safe JSON Parser
```typescript
function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

// Usage
const config = safeJsonParse(await Bun.file('config.json').text());
```

## 🔍 Linting Rules

Add these ESLint rules to catch missing error handling:

```json
{
  "rules": {
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "error"
  }
}
```

## 📊 Error Monitoring

### Log Errors Appropriately
```typescript
// ✅ GOOD: Structured error logging
console.error('❌ Operation failed:', {
  operation: 'fetchUserData',
  userId: 123,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});

// ✅ GOOD: User-friendly error messages
if (error.code === 'ECONNREFUSED') {
  console.error('❌ Cannot connect to server. Please check your internet connection.');
} else if (error.code === 'ENOTFOUND') {
  console.error('❌ Server not found. Please check the URL.');
}
```

## 🎯 Key Takeaways

1. **Always wrap async operations** in try/catch blocks
2. **Check HTTP response status** before parsing response body
3. **Handle specific error types** (network, file system, parsing)
4. **Provide meaningful error messages** for users
5. **Log errors with context** for debugging
6. **Test error scenarios** in your unit tests
7. **Use TypeScript** for better error type safety

## ✅ Fixed Files

- `projects/experimental/concise-mcp-agents/scripts/users-report-sync.ts` - Added HTTP error handling and try/catch wrapper

## 🔍 Still Need Review

- [ ] Verify all `Bun.file()` operations have error handling
- [ ] Check remaining `fetch()` calls for proper error handling
- [ ] Review JSON parsing operations for try/catch blocks