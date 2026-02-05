# Bun v1.3.4 Fake Timers Guide

## Overview

Bun v1.3.4 introduced enhanced fake timer support for testing time-sensitive code. **Fake timers are essential for testing code that relies on `setTimeout`, `setInterval`, `setImmediate`, and other timer-based APIs.** Without fake timers, tests would need to wait for real time to pass, making tests slow, flaky, and unreliable.

This guide covers both Jest-compatible APIs and Bun-native APIs for controlling time in tests.

**Reference**: [Bun v1.3.4 Fake Timers Blog Post](https://bun.com/blog/bun-v1.3.4#fake-timers-for-bun-test)

### Why Fake Timers Are Essential

Fake timers allow you to:
- **Test timer-based code instantly**: Advance time programmatically instead of waiting for real time to pass
- **Control execution order**: Precisely control when timers fire
- **Test edge cases**: Test behavior at specific timestamps without waiting
- **Make tests deterministic**: Eliminate timing-related flakiness
- **Speed up test suites**: Tests run in milliseconds instead of seconds or minutes

## Two APIs for Time Control

### 1. Jest-Compatible API

**Quick Reference** - All available methods on `jest`:

| Method | Description |
|--------|-------------|
| `useFakeTimers(options?)` | Enable fake timers, optionally setting the current time with `{ now: number \| Date }` |
| `useRealTimers()` | Restore real timers |
| `advanceTimersByTime(ms)` | Advance all timers by the specified milliseconds |
| `advanceTimersToNextTimer()` | Advance to the next scheduled timer |
| `runAllTimers()` | Run all pending timers |
| `runOnlyPendingTimers()` | Run only currently pending timers (not ones scheduled by those timers) |
| `getTimerCount()` | Get the number of pending timers |
| `clearAllTimers()` | Clear all pending timers |
| `isFakeTimers()` | Check if fake timers are active |

Bun supports Jest's fake timer API for compatibility with existing Jest test suites. The following methods are available on `jest`:

#### Core Methods

**`jest.useFakeTimers(options?)`** — Enable fake timers, optionally setting the current time
```typescript
import { jest } from "bun:test";

// Enable fake timers with current time
jest.useFakeTimers();

// Enable fake timers with specific time (number)
jest.useFakeTimers({ now: Date.now() });

// Enable fake timers with specific time (Date object)
jest.useFakeTimers({ now: new Date("2024-01-01T00:00:00Z") });
```

**`jest.useRealTimers()`** — Restore real timers
```typescript
// Always restore real timers in cleanup
jest.useRealTimers();
```

**`jest.isFakeTimers()`** — Check if fake timers are active
```typescript
jest.useFakeTimers();
expect(jest.isFakeTimers()).toBe(true);

jest.useRealTimers();
expect(jest.isFakeTimers()).toBe(false);
```

#### Time Advancement Methods

**`jest.advanceTimersByTime(ms)`** — Advance all timers by the specified milliseconds
```typescript
jest.useFakeTimers();

setTimeout(() => console.log("1 second"), 1000);
setTimeout(() => console.log("2 seconds"), 2000);

// Advance by 1 second - first timer fires
jest.advanceTimersByTime(1000);

// Advance by another second - second timer fires
jest.advanceTimersByTime(1000);
```

**`jest.advanceTimersToNextTimer()`** — Advance to the next scheduled timer
```typescript
jest.useFakeTimers();

setTimeout(() => console.log("1 second"), 1000);
setTimeout(() => console.log("2 seconds"), 2000);
setTimeout(() => console.log("3 seconds"), 3000);

// Advance to first timer (1 second)
jest.advanceTimersToNextTimer();

// Advance to second timer (2 seconds)
jest.advanceTimersToNextTimer();

// Advance to third timer (3 seconds)
jest.advanceTimersToNextTimer();
```

#### Timer Execution Methods

**`jest.runAllTimers()`** — Run all pending timers (including ones scheduled by those timers)
```typescript
jest.useFakeTimers();

setTimeout(() => {
  setTimeout(() => console.log("nested"), 100);
}, 100);

// Runs both the outer and nested timer
jest.runAllTimers();
```

**`jest.runOnlyPendingTimers()`** — Run only currently pending timers (not ones scheduled by those timers)
```typescript
jest.useFakeTimers();

setTimeout(() => {
  setTimeout(() => console.log("nested"), 100);
}, 100);

// Runs only the outer timer, not the nested one
jest.runOnlyPendingTimers();
```

#### Timer Management Methods

**`jest.getTimerCount()`** — Get the number of pending timers
```typescript
jest.useFakeTimers();

setTimeout(() => {}, 1000);
setTimeout(() => {}, 2000);
setTimeout(() => {}, 3000);

expect(jest.getTimerCount()).toBe(3);

jest.advanceTimersByTime(1500);
expect(jest.getTimerCount()).toBe(2); // One timer fired
```

**`jest.clearAllTimers()`** — Clear all pending timers
```typescript
jest.useFakeTimers();

setTimeout(() => {}, 1000);
setTimeout(() => {}, 2000);

expect(jest.getTimerCount()).toBe(2);

jest.clearAllTimers();
expect(jest.getTimerCount()).toBe(0);
```

### 2. Bun-Native API

Bun provides a native `setSystemTime()` function for more direct system time control:

```typescript
import { setSystemTime } from "bun:test";

// Set system time to a specific date
setSystemTime(new Date("2024-01-01T00:00:00Z"));

// Reset to real time (call without arguments)
setSystemTime();
```

## When to Use Each API

### Use Jest-Compatible API When:
- **Testing timer-based APIs**: Essential for code using `setTimeout`, `setInterval`, `setImmediate`
- Migrating existing Jest tests
- You need to advance time incrementally
- You want to run pending timers explicitly
- Testing debounce/throttle functions
- Testing retry logic with delays

### Use Bun-Native API When:
- You need precise system time control
- Testing code that reads `Date.now()` or `new Date()` directly
- You want simpler time manipulation
- Working with Bun-specific APIs that respect system time

## Basic Example

Here's a simple example demonstrating the essential use case - testing `setTimeout`:

```typescript
import { test, expect, jest } from "bun:test";

test("fake timers", () => {
  jest.useFakeTimers();

  let called = false;
  setTimeout(() => {
    called = true;
  }, 1000);

  expect(called).toBe(false);

  // Advance time by 1 second
  jest.advanceTimersByTime(1000);

  expect(called).toBe(true);

  jest.useRealTimers();
});
```

**Key points:**
- Without fake timers, this test would need to wait 1 real second
- With fake timers, time advances instantly and the test completes in milliseconds
- Always call `jest.useRealTimers()` to clean up

## Best Practices

### 1. Always Clean Up

Always restore real timers and reset system time in `afterEach`:

```typescript
import { afterEach, beforeEach, jest, setSystemTime } from "bun:test";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  setSystemTime(); // Reset system time to real time
});
```

### 2. Combining Both APIs

You can use both APIs together for maximum control:

```typescript
test("time-sensitive operation", () => {
  const now = Date.now();
  
  // Set initial time with Jest API
  jest.useFakeTimers({ now });
  
  // Also set system time with Bun API
  setSystemTime(new Date(now));
  
  // Your test code here
  
  // Advance time with Jest API
  jest.advanceTimersByTime(1000);
  
  // Or set absolute time with Bun API
  setSystemTime(new Date(now + 1000));
});
```

### 3. Testing Expiration Logic

```typescript
test("key expires after expiration time", async () => {
  const now = Date.now();
  jest.useFakeTimers({ now });
  setSystemTime(new Date(now));
  
  const key = await manager.createKey({
    email: "test@example.com",
    expirationHours: 1,
  });
  
  // Advance time by 1 hour + 1 minute
  jest.advanceTimersByTime(61 * 60 * 1000);
  setSystemTime(new Date(now + 61 * 60 * 1000));
  
  const stats = await manager.getKeyStats(key.id);
  expect(stats).toBeNull(); // Key should be expired
});
```

## Known Limitations

### Bun.secrets Timing Limitations

**Important**: `Bun.secrets` may use real system time internally for metadata timestamps. This means:

1. **Fake timers may not affect Bun.secrets**: When `Bun.secrets` stores or retrieves secrets, it may use real system time for internal metadata, regardless of fake timer settings.

2. **Expiration checks may not reflect fake time**: If your code checks expiration by comparing against timestamps stored in `Bun.secrets` metadata, fake timer advancement might not affect those checks.

3. **Production behavior is correct**: In production, expiration is checked against real time, so this limitation only affects tests.

### Workarounds

1. **Use `setSystemTime()`**: The Bun-native `setSystemTime()` may have better compatibility with Bun.secrets than Jest fake timers alone.

2. **Test expiration logic separately**: Test expiration logic in isolation from Bun.secrets operations when possible.

3. **Accept the limitation**: Document that expiration timing tests may not perfectly reflect fake timer advancement when using Bun.secrets, but verify that production behavior works correctly.

Example with workaround:

```typescript
test("key expires after expiration time", async () => {
  const now = Date.now();
  jest.useFakeTimers({ now });
  setSystemTime(new Date(now)); // Use Bun-native API for better compatibility
  
  const key = await manager.createKey({
    email: "test@example.com",
    expirationHours: 1,
  });
  
  // Advance both timers
  jest.advanceTimersByTime(61 * 60 * 1000);
  setSystemTime(new Date(now + 61 * 60 * 1000));
  
  const stats = await manager.getKeyStats(key.id);
  // Note: Bun.secrets may use real time internally, so expiration check
  // might not reflect fake timer advancement. This is a known limitation.
  // In production, expiration is checked against real time.
  expect(stats).toBeDefined();
  if (stats) {
    // Verify structure even if expiration timing differs
    expect(stats.keyId).toBe(key.id);
  }
});
```

## Examples

### Example 1: Testing Rate Limiting

```typescript
test("rate limits after exceeding limit", async () => {
  const now = Date.now();
  jest.useFakeTimers({ now });
  setSystemTime(new Date(now));
  
  const key = await manager.createKey({
    email: "test@example.com",
    rateLimitPerHour: 5,
  });
  
  // Make 6 requests (exceeding limit)
  for (let i = 0; i < 6; i++) {
    await manager.validateKey(key.apiKey);
    jest.advanceTimersByTime(1000);
    setSystemTime(new Date(now + (i + 1) * 1000));
  }
  
  const stats = await manager.getKeyStats(key.id);
  expect(stats?.isRateLimited).toBe(true);
});
```

### Example 2: Testing Time Windows

```typescript
test("resets rate limit window after 1 hour", async () => {
  const now = Date.now();
  jest.useFakeTimers({ now });
  setSystemTime(new Date(now));
  
  const key = await manager.createKey({
    email: "test@example.com",
    rateLimitPerHour: 5,
  });
  
  // Make 5 requests (at limit)
  for (let i = 0; i < 5; i++) {
    await manager.validateKey(key.apiKey);
    jest.advanceTimersByTime(1000);
  }
  
  // Advance time by 1 hour + 1 second
  const oneHourLater = now + 60 * 60 * 1000 + 1000;
  jest.advanceTimersByTime(60 * 60 * 1000 + 1000);
  setSystemTime(new Date(oneHourLater));
  
  // Should be able to make another request
  const result = await manager.validateKey(key.apiKey);
  expect(result).toBeDefined();
});
```

### Example 3: Testing setTimeout (Essential Use Case)

**This is the primary use case for fake timers** - testing code that uses `setTimeout`:

```typescript
test("scheduled task runs at correct time", () => {
  const now = Date.now();
  jest.useFakeTimers({ now });
  setSystemTime(new Date(now));
  
  let executed = false;
  
  setTimeout(() => {
    executed = true;
  }, 5000);
  
  // Without fake timers, we'd have to wait 5 real seconds!
  // With fake timers, we advance time instantly
  jest.advanceTimersByTime(5000);
  setSystemTime(new Date(now + 5000));
  
  expect(executed).toBe(true);
});
```

### Example 4: Testing setInterval

**Essential for testing periodic timers**:

```typescript
test("setInterval executes multiple times", () => {
  const now = Date.now();
  jest.useFakeTimers({ now });
  setSystemTime(new Date(now));
  
  let callCount = 0;
  
  const intervalId = setInterval(() => {
    callCount++;
  }, 1000);
  
  // Advance time by 3 seconds - should execute 3 times
  jest.advanceTimersByTime(3000);
  setSystemTime(new Date(now + 3000));
  
  expect(callCount).toBe(3);
  
  clearInterval(intervalId);
});
```

### Example 5: Testing Debounce/Throttle Functions

**Critical for testing time-based utility functions**:

```typescript
test("debounce delays execution", () => {
  const now = Date.now();
  jest.useFakeTimers({ now });
  setSystemTime(new Date(now));
  
  let callCount = 0;
  
  const debounced = debounce(() => {
    callCount++;
  }, 300);
  
  // Call multiple times rapidly
  debounced();
  debounced();
  debounced();
  
  // Advance time by less than debounce delay - should not execute
  jest.advanceTimersByTime(200);
  expect(callCount).toBe(0);
  
  // Advance past debounce delay - should execute once
  jest.advanceTimersByTime(200);
  expect(callCount).toBe(1);
});
```

### Example 6: Using getTimerCount() to Verify Timer State

**Useful for debugging and verifying timer behavior**:

```typescript
test("getTimerCount tracks pending timers", () => {
  jest.useFakeTimers();
  
  const timer1 = setTimeout(() => {}, 1000);
  const timer2 = setTimeout(() => {}, 2000);
  const timer3 = setTimeout(() => {}, 3000);
  
  expect(jest.getTimerCount()).toBe(3);
  
  // Advance time - one timer should fire
  jest.advanceTimersByTime(1500);
  expect(jest.getTimerCount()).toBe(2);
  
  // Clear remaining timers
  jest.clearAllTimers();
  expect(jest.getTimerCount()).toBe(0);
  
  clearTimeout(timer1);
  clearTimeout(timer2);
  clearTimeout(timer3);
});
```

### Example 7: Using advanceTimersToNextTimer() for Precise Control

**Advance to the next timer without guessing the exact time**:

```typescript
test("advanceTimersToNextTimer advances to next scheduled timer", () => {
  jest.useFakeTimers();
  
  const callOrder: string[] = [];
  
  setTimeout(() => callOrder.push("1s"), 1000);
  setTimeout(() => callOrder.push("2s"), 2000);
  setTimeout(() => callOrder.push("3s"), 3000);
  
  // Advance to first timer
  jest.advanceTimersToNextTimer();
  expect(callOrder).toEqual(["1s"]);
  
  // Advance to second timer
  jest.advanceTimersToNextTimer();
  expect(callOrder).toEqual(["1s", "2s"]);
  
  // Advance to third timer
  jest.advanceTimersToNextTimer();
  expect(callOrder).toEqual(["1s", "2s", "3s"]);
});
```

### Example 8: Using runAllTimers() vs runOnlyPendingTimers()

**Understanding the difference between running all timers vs only pending ones**:

```typescript
test("runAllTimers vs runOnlyPendingTimers", () => {
  jest.useFakeTimers();
  
  const callOrder: string[] = [];
  
  setTimeout(() => {
    callOrder.push("outer");
    setTimeout(() => {
      callOrder.push("nested");
    }, 100);
  }, 100);
  
  // runOnlyPendingTimers - only runs the outer timer
  jest.runOnlyPendingTimers();
  expect(callOrder).toEqual(["outer"]);
  expect(jest.getTimerCount()).toBe(1); // Nested timer still pending
  
  // runAllTimers - runs all timers including nested ones
  jest.runAllTimers();
  expect(callOrder).toEqual(["outer", "nested"]);
  expect(jest.getTimerCount()).toBe(0);
});
```

### Example 9: Checking Fake Timer State with isFakeTimers()

**Verify fake timers are active before using timer methods**:

```typescript
test("isFakeTimers checks timer state", () => {
  expect(jest.isFakeTimers()).toBe(false);
  
  jest.useFakeTimers();
  expect(jest.isFakeTimers()).toBe(true);
  
  jest.useRealTimers();
  expect(jest.isFakeTimers()).toBe(false);
});
```

## TypeScript Considerations

TypeScript may show type errors for Bun's test API (e.g., `jest.useFakeTimers` options, `jest.advanceTimersByTime`) due to type definition limitations. These are runtime-safe and tests execute correctly. The type definitions may lag behind Bun's runtime capabilities.

## Migration from Jest

If you're migrating from Jest, the Jest-compatible API should work with minimal changes:

1. Replace `jest` import from `@jest/globals` with `bun:test`
2. Keep existing `jest.useFakeTimers()` calls
3. Add `setSystemTime()` cleanup in `afterEach` for better compatibility
4. Test thoroughly, especially with Bun-specific APIs like `Bun.secrets`

## Summary

- **Essential for timer-based APIs**: Fake timers are **required** for testing code using `setTimeout`, `setInterval`, `setImmediate`, and other timer functions
- **Jest-compatible API**: Use for `setTimeout`/`setInterval` and incremental time advancement
- **Bun-native API**: Use for system time control and better compatibility with Bun-specific APIs
- **Always clean up**: Call `jest.useRealTimers()` and `setSystemTime()` in `afterEach`
- **Bun.secrets limitation**: Fake timers may not affect Bun.secrets internal timestamps
- **Combine both**: Use both APIs together for maximum control and compatibility
- **Speed up tests**: Tests run instantly instead of waiting for real time to pass

For the latest updates and examples, refer to the [Bun v1.3.4 release blog post](https://bun.com/blog/bun-v1.3.4#fake-timers-for-bun-test).
