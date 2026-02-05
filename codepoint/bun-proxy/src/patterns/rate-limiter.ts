// @bun/proxy/patterns/rate-limiter.ts - Rate limiting pattern (Code Point: 0x210-0x21F)

import { EventEmitter } from 'events';

// Rate limiting algorithms
export enum RateLimitAlgorithm {
  TOKEN_BUCKET = 'token_bucket',
  LEAKY_BUCKET = 'leaky_bucket',
  FIXED_WINDOW = 'fixed_window',
  SLIDING_WINDOW = 'sliding_window'
}

// Rate limiter configuration
export interface RateLimiterConfig {
  algorithm?: RateLimitAlgorithm;
  capacity?: number;        // Maximum tokens/bucket size
  refillRate?: number;      // Tokens per second (token bucket) or leak rate
  windowSize?: number;      // Window size in milliseconds (for window algorithms)
  burstCapacity?: number;   // Burst capacity for token bucket
  keyGenerator?: (request: any) => string; // Function to generate rate limit key
  exemptKeys?: string[];    // Keys that are exempt from rate limiting
  redis?: {
    enabled?: boolean;
    url?: string;
    keyPrefix?: string;
  };
}

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
  retryAfter?: number;
}

// Rate limit statistics
export interface RateLimitStats {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  currentCapacity: number;
  lastRefill: Date;
  keysTracked: number;
}

// Token Bucket implementation
class TokenBucket {
  private tokens: number;
  private capacity: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;
  private burstCapacity: number;

  constructor(capacity: number, refillRate: number, burstCapacity?: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.burstCapacity = burstCapacity || capacity;
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  // Refill tokens based on time elapsed
  private refill(): void {
    const now = Date.now();
    const timeElapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timeElapsed * this.refillRate;

    this.tokens = Math.min(this.burstCapacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  // Consume tokens
  consume(count: number = 1): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  // Get current token count
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  // Get capacity
  getCapacity(): number {
    return this.capacity;
  }
}

// Fixed Window implementation
class FixedWindow {
  private requests: number = 0;
  private windowStart: number;
  private windowSize: number;
  private maxRequests: number;

  constructor(maxRequests: number, windowSize: number) {
    this.maxRequests = maxRequests;
    this.windowSize = windowSize;
    this.windowStart = Date.now();
  }

  // Check if request is allowed
  allow(): boolean {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart >= this.windowSize) {
      this.requests = 0;
      this.windowStart = now;
    }

    if (this.requests < this.maxRequests) {
      this.requests++;
      return true;
    }

    return false;
  }

  // Get remaining requests in current window
  getRemaining(): number {
    const now = Date.now();
    if (now - this.windowStart >= this.windowSize) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - this.requests);
  }

  // Get reset time
  getResetTime(): number {
    return this.windowStart + this.windowSize;
  }
}

// Sliding Window implementation
class SlidingWindow {
  private requests: number[] = [];
  private windowSize: number;
  private maxRequests: number;

  constructor(maxRequests: number, windowSize: number) {
    this.maxRequests = maxRequests;
    this.windowSize = windowSize;
  }

  // Check if request is allowed
  allow(): boolean {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowSize);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  // Get remaining requests
  getRemaining(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowSize);
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  // Get reset time (approximate)
  getResetTime(): number {
    if (this.requests.length === 0) return Date.now();
    return Math.min(...this.requests) + this.windowSize;
  }
}

// Rate limiter implementation
export class RateLimiter extends EventEmitter {
  private config: Required<RateLimiterConfig>;
  private buckets = new Map<string, TokenBucket | FixedWindow | SlidingWindow>();
  private stats: RateLimitStats;

  constructor(config: RateLimiterConfig = {}) {
    super();

    this.config = {
      algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
      capacity: 100,
      refillRate: 10, // 10 tokens per second
      windowSize: 60000, // 1 minute
      burstCapacity: 100,
      keyGenerator: (request) => request.ip || 'default',
      exemptKeys: [],
      redis: {
        enabled: false,
        url: 'redis://localhost:6379',
        keyPrefix: 'ratelimit:'
      },
      ...config
    };

    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      currentCapacity: this.config.capacity,
      lastRefill: new Date(),
      keysTracked: 0
    };
  }

  // Check if request is allowed
  async checkLimit(request: any): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(request);
    this.stats.totalRequests++;

    // Check if key is exempt
    if (this.config.exemptKeys.includes(key)) {
      this.stats.allowedRequests++;
      return {
        allowed: true,
        remaining: this.config.capacity,
        resetTime: Date.now() + this.config.windowSize,
        limit: this.config.capacity
      };
    }

    // Get or create rate limiter for this key
    const limiter = this.getLimiter(key);

    let allowed: boolean;
    let remaining: number;
    let resetTime: number;

    switch (this.config.algorithm) {
      case RateLimitAlgorithm.TOKEN_BUCKET:
        const bucket = limiter as TokenBucket;
        allowed = bucket.consume();
        remaining = Math.floor(bucket.getTokens());
        resetTime = Date.now() + 1000; // Approximate next refill
        break;

      case RateLimitAlgorithm.FIXED_WINDOW:
        const fixedWindow = limiter as FixedWindow;
        allowed = fixedWindow.allow();
        remaining = fixedWindow.getRemaining();
        resetTime = fixedWindow.getResetTime();
        break;

      case RateLimitAlgorithm.SLIDING_WINDOW:
        const slidingWindow = limiter as SlidingWindow;
        allowed = slidingWindow.allow();
        remaining = slidingWindow.getRemaining();
        resetTime = slidingWindow.getResetTime();
        break;

      default:
        allowed = true;
        remaining = this.config.capacity;
        resetTime = Date.now() + this.config.windowSize;
    }

    if (allowed) {
      this.stats.allowedRequests++;
    } else {
      this.stats.blockedRequests++;
      this.emit('limitExceeded', { key, request });
    }

    const result: RateLimitResult = {
      allowed,
      remaining,
      resetTime,
      limit: this.config.capacity,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - Date.now()) / 1000)
    };

    this.emit('checked', { key, result, request });
    return result;
  }

  // Get limiter for key (create if doesn't exist)
  private getLimiter(key: string): TokenBucket | FixedWindow | SlidingWindow {
    if (!this.buckets.has(key)) {
      let limiter: TokenBucket | FixedWindow | SlidingWindow;

      switch (this.config.algorithm) {
        case RateLimitAlgorithm.TOKEN_BUCKET:
          limiter = new TokenBucket(
            this.config.capacity,
            this.config.refillRate,
            this.config.burstCapacity
          );
          break;

        case RateLimitAlgorithm.FIXED_WINDOW:
          limiter = new FixedWindow(this.config.capacity, this.config.windowSize);
          break;

        case RateLimitAlgorithm.SLIDING_WINDOW:
          limiter = new SlidingWindow(this.config.capacity, this.config.windowSize);
          break;

        default:
          limiter = new TokenBucket(this.config.capacity, this.config.refillRate);
      }

      this.buckets.set(key, limiter);
      this.stats.keysTracked = this.buckets.size;
    }

    return this.buckets.get(key)!;
  }

  // Reset limiter for a specific key
  resetKey(key: string): void {
    this.buckets.delete(key);
    this.stats.keysTracked = this.buckets.size;
    this.emit('keyReset', { key });
  }

  // Reset all limiters
  resetAll(): void {
    this.buckets.clear();
    this.stats.keysTracked = 0;
    this.stats.totalRequests = 0;
    this.stats.allowedRequests = 0;
    this.stats.blockedRequests = 0;
    this.emit('allReset');
  }

  // Get statistics
  getStats(): RateLimitStats {
    return {
      ...this.stats,
      currentCapacity: this.config.capacity,
      lastRefill: new Date()
    };
  }

  // Get configuration
  getConfig(): RateLimiterConfig {
    return { ...this.config };
  }

  // Get all tracked keys
  getKeys(): string[] {
    return Array.from(this.buckets.keys());
  }

  // Get limiter info for a specific key
  getKeyInfo(key: string): any {
    const limiter = this.buckets.get(key);
    if (!limiter) return null;

    switch (this.config.algorithm) {
      case RateLimitAlgorithm.TOKEN_BUCKET:
        const bucket = limiter as TokenBucket;
        return {
          algorithm: 'token_bucket',
          tokens: bucket.getTokens(),
          capacity: bucket.getCapacity()
        };

      case RateLimitAlgorithm.FIXED_WINDOW:
        const fixedWindow = limiter as FixedWindow;
        return {
          algorithm: 'fixed_window',
          requests: fixedWindow.getRemaining(),
          resetTime: fixedWindow.getResetTime()
        };

      case RateLimitAlgorithm.SLIDING_WINDOW:
        const slidingWindow = limiter as SlidingWindow;
        return {
          algorithm: 'sliding_window',
          requests: slidingWindow.getRemaining(),
          resetTime: slidingWindow.getResetTime()
        };

      default:
        return { algorithm: 'unknown' };
    }
  }
}

// Higher-order function to create rate-limited version of any function
export function withRateLimit<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config?: RateLimiterConfig
): ((...args: T) => Promise<R>) {
  const limiter = new RateLimiter(config);

  return async (...args: T): Promise<R> => {
    // Extract request-like object from args (assuming first arg has IP)
    const request = args[0] || {};

    const result = await limiter.checkLimit(request);
    if (!result.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter} seconds`);
    }

    return fn(...args);
  };
}

// Factory function to create rate limiter
export function createRateLimiter(config?: RateLimiterConfig): RateLimiter {
  return new RateLimiter(config);
}

// Export default
export default RateLimiter;