#!/usr/bin/env bun

/**
 * @fileoverview Rate Limiter Utility
 * @description Token bucket rate limiter using Bun.nanoseconds() for high precision
 * @module rate-limiter
 */

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= 1) {
        this.tokens--;
        return;
      }

      const waitTime = (1 / this.refillRate) * 1000;
      await Bun.sleep(waitTime);
    }
  }

  acquireSync(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }

    return false;
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;
  }

  getRemainingTokens(): number {
    this.refill();
    return this.tokens;
  }

  getCapacity(): number {
    return this.maxTokens;
  }

  getRefillRate(): number {
    return this.refillRate;
  }

  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

/**
 * Sliding window rate limiter
 */
export class SlidingWindowRateLimiter {
  private requests: number[] = [];

  constructor(
    private windowSizeMs: number,
    private maxRequests: number
  ) {}

  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowSizeMs
    );

    if (this.requests.length >= this.maxRequests) {
      // Calculate wait time until oldest request expires
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowSizeMs - (now - oldestRequest);
      await Bun.sleep(waitTime);
      return this.acquire(); // Retry after waiting
    }

    this.requests.push(now);
  }

  acquireSync(): boolean {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowSizeMs
    );

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.windowSizeMs
    );
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  reset(): void {
    this.requests = [];
  }
}

/**
 * Factory for creating rate limiters
 */
export class RateLimiterFactory {
  static tokenBucket(maxTokens: number, refillRate: number): RateLimiter {
    return new RateLimiter(maxTokens, refillRate);
  }

  static slidingWindow(windowSizeMs: number, maxRequests: number): SlidingWindowRateLimiter {
    return new SlidingWindowRateLimiter(windowSizeMs, maxRequests);
  }

  // Common presets
  static apiRateLimiter(): RateLimiter {
    return new RateLimiter(100, 10); // 100 tokens, refill 10 per second
  }

  static userActionLimiter(): RateLimiter {
    return new RateLimiter(5, 1); // 5 actions, refill 1 per second
  }

  static fileUploadLimiter(): SlidingWindowRateLimiter {
    return new SlidingWindowRateLimiter(60000, 10); // 10 uploads per minute
  }
}

// Demo function
async function demo() {
  console.log('🚦 Rate Limiter Demo\n');

  // Token bucket demo
  console.log('Token Bucket Rate Limiter:');
  const limiter = new RateLimiter(5, 2); // 5 tokens, refill 2 per second

  for (let i = 0; i < 8; i++) {
    const remaining = limiter.getRemainingTokens();
    console.log(`Request ${i + 1}: ${remaining} tokens remaining`);

    if (limiter.acquireSync()) {
      console.log('  ✅ Request allowed');
    } else {
      console.log('  ❌ Request denied');
    }

    if (i === 3) {
      console.log('  Waiting 2 seconds to refill...');
      await Bun.sleep(2000);
    }
  }

  console.log();

  // Sliding window demo
  console.log('Sliding Window Rate Limiter:');
  const slidingLimiter = new SlidingWindowRateLimiter(5000, 3); // 3 requests per 5 seconds

  for (let i = 0; i < 5; i++) {
    const remaining = slidingLimiter.getRemainingRequests();
    console.log(`Request ${i + 1}: ${remaining} requests remaining in window`);

    if (slidingLimiter.acquireSync()) {
      console.log('  ✅ Request allowed');
    } else {
      console.log('  ❌ Request denied');
    }

    await Bun.sleep(1000);
  }

  console.log('\n✨ Rate limiter demo complete!');
}

// Run demo if executed directly
if (import.meta.main) {
  demo().catch(console.error);
}