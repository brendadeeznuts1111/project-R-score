#!/usr/bin/env bun
/**
 * @fileoverview Bun v1.3.4 Fake Timers Example
 * @description Demonstrates how to use fake timers for testing timer-based code
 * @see {@link ../docs/BUN-FAKE-TIMERS.md|Fake Timers Documentation}
 * @see {@link https://bun.com/blog/bun-v1.3.4#fake-timers-for-bun-test|Bun v1.3.4 Blog Post}
 * 
 * Fake timers are essential for testing code that relies on setTimeout, setInterval,
 * and other timer-based APIs, allowing tests to run instantly instead of waiting
 * for real time to pass.
 */

import { test, expect, jest, setSystemTime } from "bun:test";

// ═══════════════════════════════════════════════════════════════
// Example 1: Basic setTimeout Testing
// ═══════════════════════════════════════════════════════════════

test("Example 1: Basic setTimeout with fake timers", () => {
  jest.useFakeTimers();

  let called = false;
  setTimeout(() => {
    called = true;
  }, 1000);

  expect(called).toBe(false);

  // Advance time by 1 second - test completes instantly!
  jest.advanceTimersByTime(1000);

  expect(called).toBe(true);

  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════
// Example 2: setInterval Testing
// ═══════════════════════════════════════════════════════════════

test("Example 2: setInterval with fake timers", () => {
  jest.useFakeTimers();

  let callCount = 0;
  
  const intervalId = setInterval(() => {
    callCount++;
  }, 1000);

  // Advance time by 3 seconds - should execute 3 times
  jest.advanceTimersByTime(3000);
  
  expect(callCount).toBe(3);

  clearInterval(intervalId);
  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════
// Example 3: Debounce Function Testing
// ═══════════════════════════════════════════════════════════════

function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

test("Example 3: Testing debounce function", () => {
  jest.useFakeTimers();

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

  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════
// Example 4: Throttle Function Testing
// ═══════════════════════════════════════════════════════════════

function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

test("Example 4: Testing throttle function", () => {
  jest.useFakeTimers();

  let callCount = 0;
  
  const throttled = throttle(() => {
    callCount++;
  }, 1000);
  
  // Call multiple times rapidly
  throttled();
  throttled();
  throttled();
  
  // Should only execute once immediately
  expect(callCount).toBe(1);
  
  // Advance time - should allow another call
  jest.advanceTimersByTime(1000);
  throttled();
  expect(callCount).toBe(2);

  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════
// Example 5: Using getTimerCount()
// ═══════════════════════════════════════════════════════════════

test("Example 5: Tracking pending timers with getTimerCount", () => {
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
  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════
// Example 6: Using advanceTimersToNextTimer()
// ═══════════════════════════════════════════════════════════════

test("Example 6: Advancing to next timer", () => {
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

  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════
// Example 7: runAllTimers() vs runOnlyPendingTimers()
// ═══════════════════════════════════════════════════════════════

test("Example 7: runAllTimers vs runOnlyPendingTimers", () => {
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

  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════
// Example 8: Combining Jest and Bun-native APIs
// ═══════════════════════════════════════════════════════════════

test("Example 8: Combining jest.useFakeTimers() and setSystemTime()", () => {
  const now = Date.now();
  
  // Set initial time with Jest API
  jest.useFakeTimers({ now });
  
  // Also set system time with Bun API
  setSystemTime(new Date(now));

  // Test code that uses both Date.now() and setTimeout
  const startTime = Date.now();
  let callbackTime: number | null = null;

  setTimeout(() => {
    callbackTime = Date.now();
  }, 5000);

  // Advance time with Jest API
  jest.advanceTimersByTime(5000);
  
  // Also update system time with Bun API
  setSystemTime(new Date(now + 5000));

  expect(callbackTime).toBe(now + 5000);
  expect(callbackTime! - startTime).toBe(5000);

  // Cleanup
  jest.useRealTimers();
  setSystemTime();
});

// ═══════════════════════════════════════════════════════════════
// Example 9: Testing Expiration Logic
// ═══════════════════════════════════════════════════════════════

class Cache {
  private data: Map<string, { value: any; expiresAt: number }> = new Map();

  set(key: string, value: any, ttl: number) {
    this.data.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  get(key: string): any | null {
    const entry = this.data.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.data.delete(key);
      return null;
    }
    
    return entry.value;
  }
}

test("Example 9: Testing cache expiration", () => {
  const now = Date.now();
  jest.useFakeTimers({ now });
  setSystemTime(new Date(now));

  const cache = new Cache();
  
  // Set value with 1 hour TTL
  cache.set("key1", "value1", 60 * 60 * 1000);
  
  expect(cache.get("key1")).toBe("value1");

  // Advance time by 30 minutes - should still be valid
  jest.advanceTimersByTime(30 * 60 * 1000);
  setSystemTime(new Date(now + 30 * 60 * 1000));
  expect(cache.get("key1")).toBe("value1");

  // Advance time past expiration (1 hour + 1 minute)
  jest.advanceTimersByTime(31 * 60 * 1000);
  setSystemTime(new Date(now + 61 * 60 * 1000));
  expect(cache.get("key1")).toBeNull();

  jest.useRealTimers();
  setSystemTime();
});

// ═══════════════════════════════════════════════════════════════
// Example 10: Testing Retry Logic
// ═══════════════════════════════════════════════════════════════

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }
  
  throw lastError!;
}

test("Example 10: Testing retry logic with backoff", async () => {
  jest.useFakeTimers();

  let attemptCount = 0;
  const failingFn = async () => {
    attemptCount++;
    if (attemptCount < 3) {
      throw new Error("Failed");
    }
    return "success";
  };

  const promise = retryWithBackoff(failingFn, 3, 1000);

  // Advance through retry delays: 1s, 2s
  jest.advanceTimersByTime(1000); // First retry delay
  jest.advanceTimersByTime(2000); // Second retry delay

  const result = await promise;
  expect(result).toBe("success");
  expect(attemptCount).toBe(3);

  jest.useRealTimers();
});

// ═══════════════════════════════════════════════════════════════
// Example 11: Testing Rate Limiting
// ═══════════════════════════════════════════════════════════════

class RateLimiter {
  private requests: number[] = [];
  
  constructor(private maxRequests: number, private windowMs: number) {}

  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Remove requests outside the window
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }
}

test("Example 11: Testing rate limiter", () => {
  const now = Date.now();
  jest.useFakeTimers({ now });
  setSystemTime(new Date(now));

  const limiter = new RateLimiter(5, 60000); // 5 requests per minute

  // Make 5 requests - should all succeed
  for (let i = 0; i < 5; i++) {
    expect(limiter.canMakeRequest()).toBe(true);
    jest.advanceTimersByTime(1000);
    setSystemTime(new Date(now + (i + 1) * 1000));
  }

  // 6th request should be rate limited
  expect(limiter.canMakeRequest()).toBe(false);

  // Advance time past the window - should allow requests again
  jest.advanceTimersByTime(60000);
  setSystemTime(new Date(now + 60000));
  expect(limiter.canMakeRequest()).toBe(true);

  jest.useRealTimers();
  setSystemTime();
});

// ═══════════════════════════════════════════════════════════════
// Example 12: Checking Fake Timer State
// ═══════════════════════════════════════════════════════════════

test("Example 12: Checking if fake timers are active", () => {
  expect(jest.isFakeTimers()).toBe(false);

  jest.useFakeTimers();
  expect(jest.isFakeTimers()).toBe(true);

  jest.useRealTimers();
  expect(jest.isFakeTimers()).toBe(false);
});

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════

console.log(`
✅ Fake Timers Examples Complete!

Key Takeaways:
• Fake timers allow tests to run instantly instead of waiting for real time
• Essential for testing setTimeout, setInterval, and timer-based code
• Use jest.useFakeTimers() for Jest-compatible API
• Use setSystemTime() for Bun-native system time control
• Always clean up with jest.useRealTimers() and setSystemTime()
• Combine both APIs for maximum control and compatibility

📚 See docs/BUN-FAKE-TIMERS.md for complete documentation
🔗 Reference: https://bun.com/blog/bun-v1.3.4#fake-timers-for-bun-test
`);
