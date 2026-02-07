# 🛡️ Error Handling Best Practices

> **Enterprise-grade error handling patterns for Bun applications**

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Principles](#core-principles)
3. [Global Error Handling](#global-error-handling)
4. [Typed Errors](#typed-errors)
5. [Async Error Handling](#async-error-handling)
6. [ESLint Configuration](#eslint-configuration)
7. [Testing Error Scenarios](#testing-error-scenarios)

---

## Quick Start

```typescript
// 1. Initialize global error handling at app entry point
import { initializeGlobalErrorHandling } from './lib/core/global-error-handler';

initializeGlobalErrorHandling({
  exitOnUncaughtException: true,
  exitOnUnhandledRejection: false,
  shutdownTimeout: 5000,
});

// 2. Use typed errors for different scenarios
import { createValidationError, EnterpriseErrorCode } from './lib/core/core-errors';

function validateUser(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw createValidationError(
      EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
      'User input must be an object',
      'input',
      input
    );
  }
}

// 3. Handle async errors safely
import { safeAsync, safeAsyncWithRetry } from './lib/core/error-handling';

const result = await safeAsync(
  () => fetchUserData(userId),
  'Fetching user data',
  null // fallback value
);

// 4. Use retry logic for transient failures
const data = await safeAsyncWithRetry(
  () => fetchFromAPI(endpoint),
  'API fetch',
  3,      // max retries
  1000,   // base delay
  []      // fallback value
);
```

---

## Core Principles

### 1. Always Handle Promise Rejections

```typescript
// ❌ BAD: Floating promise (will trigger ESLint error)
function badExample() {
  fetchData(); // Promise is not awaited or handled!
}

// ✅ GOOD: Properly awaited
async function goodExample() {
  const data = await fetchData();
  return data;
}

// ✅ GOOD: Explicitly handled with catch
function anotherGoodExample() {
  fetchData()
    .then(data => console.log(data))
    .catch(error => console.error(error));
}

// ✅ GOOD: Using void to intentionally ignore (with care)
function intentionalIgnore() {
  void fetchData(); // ESLint allows this with ignoreVoid: true
}
```

### 2. Use Specific Error Types

```typescript
import {
  createValidationError,
  createNetworkError,
  createSecurityError,
  createResourceError,
  createSystemError,
  EnterpriseErrorCode,
} from './lib/core/core-errors';

// Validation errors
throw createValidationError(
  EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
  'Email format is invalid',
  'email',
  userInput.email
);

// Network errors
throw createNetworkError(
  EnterpriseErrorCode.NETWORK_CONNECTION_FAILED,
  'Failed to connect to database',
  'db.example.com',
  5432,
  'postgresql'
);

// Security errors
throw createSecurityError(
  EnterpriseErrorCode.SECURITY_UNAUTHORIZED,
  'Invalid API key provided',
  { ip: request.ip, endpoint: request.path }
);
```

### 3. Preserve Error Context

```typescript
// ❌ BAD: Losing original error
async function badFetch() {
  try {
    return await fetch(url);
  } catch (error) {
    throw new Error('Fetch failed'); // Original error lost!
  }
}

// ✅ GOOD: Preserving original error
async function goodFetch() {
  try {
    return await fetch(url);
  } catch (error) {
    const enhanced = new Error(`Fetch failed: ${getErrorMessage(error)}`);
    enhanced.cause = error; // Preserve original
    throw enhanced;
  }
}

// ✅ GOOD: Using error factory
import { EnterpriseErrorFactory } from './lib/core/core-errors';

async function bestFetch() {
  try {
    return await fetch(url);
  } catch (error) {
    throw EnterpriseErrorFactory.fromUnknown(error);
  }
}
```

---

## Global Error Handling

### Setup

```typescript
// main.ts - Application entry point
import { initializeGlobalErrorHandling, onShutdown } from './lib/core/global-error-handler';

// Initialize early, before any other code
const errorHandler = initializeGlobalErrorHandling({
  exitOnUncaughtException: true,    // Crash on sync errors
  exitOnUnhandledRejection: false,  // Allow recovery from async errors
  shutdownTimeout: 10000,           // 10s grace period for cleanup
});

// Register cleanup handlers
onShutdown(async () => {
  console.log('🧹 Cleaning up resources...');
  await db.disconnect();
  await cache.close();
});

// Your app code here...
```

### Monitoring Error Statistics

```typescript
import { getGlobalErrorStatistics } from './lib/core/global-error-handler';

// Health check endpoint
app.get('/health/errors', (req, res) => {
  const stats = getGlobalErrorStatistics();
  
  res.json({
    healthy: stats.errorRate < 10, // Less than 10 errors/minute
    ...stats,
  });
});
```

---

## Typed Errors

### Error Severity Levels

```typescript
import { SecurityRiskLevel } from './lib/core/core-types';

// CRITICAL: Immediate attention required
// HIGH: Should be addressed soon
// MEDIUM: Normal operational errors
// LOW: Minor issues, informational
// MINIMAL: Debug-level information
```

### Error Code Ranges

| Range | Category | Example Codes |
|-------|----------|---------------|
| 1000-1999 | System | `SYS_1000`, `SYS_1001` |
| 2000-2999 | Validation | `VAL_2000`, `VAL_2001` |
| 3000-3999 | Network | `NET_3000`, `NET_3001` |
| 4000-4999 | Security | `SEC_4000`, `SEC_4001` |
| 5000-5999 | Resource | `RES_5000`, `RES_5001` |
| 6000-6999 | Business | `BIZ_6000`, `BIZ_6001` |

### Custom Error Classes

```typescript
import { BaseEnterpriseError, EnterpriseErrorCode } from './lib/core/core-errors';

class PaymentError extends BaseEnterpriseError {
  constructor(
    message: string,
    public readonly transactionId: string,
    public readonly amount: number,
    context?: Record<string, unknown>
  ) {
    super(
      EnterpriseErrorCode.BUSINESS_RULE_VIOLATION,
      message,
      SecurityRiskLevel.HIGH,
      { transactionId, amount, ...context }
    );
  }
}
```

---

## Async Error Handling

### Safe Async Operations

```typescript
import { safeAsync, safeAsyncWithRetry, ErrorSeverity } from './lib/core/error-handling';

// Basic safe execution
const result = await safeAsync(
  () => riskyOperation(),
  'Risky operation context',
  defaultValue // Fallback if operation fails
);

// With retry logic
const data = await safeAsyncWithRetry(
  () => fetchFromUnreliableAPI(),
  'Fetching from external API',
  5,          // 5 retries
  2000,       // Start with 2s delay
  [],         // Empty array fallback
  ErrorSeverity.HIGH
);

// The retry uses exponential backoff:
// Attempt 1: immediate
// Attempt 2: after 2s
// Attempt 3: after 4s
// Attempt 4: after 6s
// Attempt 5: after 8s
```

### Handling Multiple Concurrent Operations

```typescript
import { safeAsync } from './lib/core/error-handling';

// ❌ BAD: One failure rejects all
const [users, orders, products] = await Promise.all([
  fetchUsers(),
  fetchOrders(),
  fetchProducts(),
]);

// ✅ GOOD: Individual error handling
const [
  { success: usersSuccess, data: users, error: usersError },
  { success: ordersSuccess, data: orders, error: ordersError },
  { success: productsSuccess, data: products, error: productsError },
] = await Promise.all([
  safeAsync(() => fetchUsers(), 'Fetch users', []),
  safeAsync(() => fetchOrders(), 'Fetch orders', []),
  safeAsync(() => fetchProducts(), 'Fetch products', []),
]);

// Process results individually
if (usersSuccess) {
  console.log(`Loaded ${users.length} users`);
} else {
  console.error('Failed to load users:', usersError);
}
```

### AbortController for Timeouts

```typescript
async function fetchWithTimeout(url: string, timeoutMs: number = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw createNetworkError(
        EnterpriseErrorCode.NETWORK_TIMEOUT,
        `Request timed out after ${timeoutMs}ms`,
        new URL(url).hostname
      );
    }
    throw error;
  }
}
```

---

## ESLint Configuration

### Error Handling Rules Enabled

The following ESLint rules are configured to catch error handling issues:

| Rule | Purpose |
|------|---------|
| `@typescript-eslint/no-floating-promises` | Prevents unhandled promises |
| `@typescript-eslint/await-thenable` | Ensures proper await usage |
| `@typescript-eslint/no-misused-promises` | Prevents async/sync mismatch |
| `@typescript-eslint/prefer-promise-reject-errors` | Requires Error objects in rejections |
| `no-empty` | Prevents empty catch blocks |
| `@typescript-eslint/promise-function-async` | Enforces async/await over then/catch |
| `no-throw-literal` | Requires Error objects for throws |

### Common ESLint Fixes

```typescript
// ❌ Error: @typescript-eslint/no-floating-promises
function processData() {
  saveToDatabase(data);
}

// ✅ Fix: Add await
async function processData() {
  await saveToDatabase(data);
}

// ✅ Alternative: Handle explicitly
function processData() {
  saveToDatabase(data).catch(error => {
    console.error('Failed to save:', error);
  });
}
```

```typescript
// ❌ Error: @typescript-eslint/no-misused-promises
const app = express();
app.get('/', async (req, res) => { // Express doesn't handle async!
  const data = await fetchData();
  res.json(data);
});

// ✅ Fix: Wrap with try-catch
app.get('/', async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (error) {
    next(error);
  }
});
```

```typescript
// ❌ Error: no-empty
try {
  riskyOperation();
} catch (error) {
  // Empty catch!
}

// ✅ Fix: Log or handle the error
try {
  riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  // Or rethrow
  throw error;
}

// ✅ Alternative: Explicitly ignore with comment
try {
  riskyOperation();
} catch (error) {
  // Intentionally ignored - operation is optional
}
```

---

## Testing Error Scenarios

### Unit Testing Errors

```typescript
import { describe, test, expect } from 'bun:test';
import { createValidationError, EnterpriseErrorCode } from './lib/core/core-errors';

describe('User Validation', () => {
  test('throws validation error for invalid email', () => {
    expect(() => {
      validateEmail('not-an-email');
    }).toThrow('Email format is invalid');
  });

  test('error has correct code and severity', () => {
    try {
      validateEmail('not-an-email');
    } catch (error) {
      expect(error.code).toBe(EnterpriseErrorCode.VALIDATION_INPUT_INVALID);
      expect(error.severity).toBe(SecurityRiskLevel.LOW);
      expect(error.field).toBe('email');
    }
  });
});
```

### Testing Async Errors

```typescript
import { safeAsync } from './lib/core/error-handling';

describe('Async Operations', () => {
  test('safeAsync returns fallback on error', async () => {
    const result = await safeAsync(
      () => Promise.reject(new Error('Failed')),
      'Test operation',
      'fallback'
    );
    
    expect(result).toBe('fallback');
  });

  test('safeAsync returns data on success', async () => {
    const result = await safeAsync(
      () => Promise.resolve({ id: 1 }),
      'Test operation',
      null
    );
    
    expect(result).toEqual({ id: 1 });
  });
});
```

### Mocking Network Errors

```typescript
import { describe, test, expect, mock } from 'bun:test';

describe('API Client', () => {
  test('handles network timeout', async () => {
    // Mock fetch to simulate timeout
    global.fetch = mock(() => 
      Promise.reject(new Error('Connection timeout'))
    );

    const result = await fetchWithRetry('/api/data');
    
    expect(result).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(3); // Retried 3 times
  });

  test('handles HTTP error status', async () => {
    global.fetch = mock(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      })
    );

    await expect(fetchWithRetry('/api/data')).rejects.toThrow('HTTP 429');
  });
});
```

---

## Error Handling Checklist

Before submitting code, ensure:

- [ ] All promises are awaited or explicitly handled
- [ ] No empty catch blocks (or documented why)
- [ ] Error types match the failure scenario
- [ ] Original errors are preserved via `cause`
- [ ] Sensitive data is not logged in errors
- [ ] Fallback values are provided for non-critical operations
- [ ] ESLint passes with no errors
- [ ] Error scenarios are tested

---

## Resources

- [lib/core/core-errors.ts](../lib/core/core-errors.ts) - Error classes and factory
- [lib/core/error-handling.ts](../lib/core/error-handling.ts) - Error utilities and retry logic
- [lib/core/global-error-handler.ts](../lib/core/global-error-handler.ts) - Global error handling
- [lib/utils/error-handler.ts](../lib/utils/error-handler.ts) - Standardized error utilities
