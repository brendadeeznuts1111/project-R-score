/**
 * Twitter Rate Limiter
 * Implements rate limiting with exponential backoff for Twitter API
 */

import type { RateLimitConfig, RetryPolicy } from '../types/twitter.types';

/**
 * Rate limit state for tracking API usage
 */
interface RateLimitState {
  requests: number;
  windowStart: number;
  backoffDelay: number;
}

/**
 * Twitter Rate Limiter with exponential backoff
 */
export class TwitterRateLimiter {
  private readonly config: RateLimitConfig;
  private readonly retryPolicy: RetryPolicy;
  private readonly state: Map<string, RateLimitState> = new Map();

  constructor(config: RateLimitConfig, retryPolicy: RetryPolicy) {
    this.config = config;
    this.retryPolicy = retryPolicy;
  }

  /**
   * Check if operation can proceed within rate limits
   */
  async checkLimit(operation: string): Promise<boolean> {
    const now = Date.now();
    const windowDuration = this.getWindowDuration(operation);
    const maxRequests = this.getMaxRequests(operation);

    const state = this.getOrCreateState(operation);

    // Reset window if expired
    if (now - state.windowStart >= windowDuration) {
      state.requests = 0;
      state.windowStart = now;
    }

    // Check if under limit
    if (state.requests < maxRequests) {
      state.requests++;
      return true;
    }

    return false;
  }

  /**
   * Wait for rate limit reset or apply backoff
   */
  async waitForLimit(operation: string): Promise<void> {
    const state = this.getOrCreateState(operation);
    const now = Date.now();
    const windowDuration = this.getWindowDuration(operation);

    // Calculate wait time
    let waitTime = windowDuration - (now - state.windowStart);

    // Apply exponential backoff for repeated violations
    if (state.backoffDelay > 0) {
      waitTime = Math.max(waitTime, state.backoffDelay);
      state.backoffDelay = Math.min(
        state.backoffDelay * this.retryPolicy.backoffMultiplier,
        this.retryPolicy.maxDelay
      );
    } else {
      state.backoffDelay = this.retryPolicy.baseDelay;
    }

    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  /**
   * Reset backoff delay on successful operation
   */
  resetBackoff(operation: string): void {
    const state = this.getOrCreateState(operation);
    state.backoffDelay = 0;
  }

  /**
   * Get current rate limit status
   */
  getStatus(operation: string): { requests: number; maxRequests: number; windowRemaining: number } {
    const state = this.getOrCreateState(operation);
    const now = Date.now();
    const windowDuration = this.getWindowDuration(operation);
    const maxRequests = this.getMaxRequests(operation);

    const windowRemaining = Math.max(0, windowDuration - (now - state.windowStart));

    return {
      requests: state.requests,
      maxRequests,
      windowRemaining,
    };
  }

  /**
   * Get or create rate limit state for operation
   */
  private getOrCreateState(operation: string): RateLimitState {
    if (!this.state.has(operation)) {
      this.state.set(operation, {
        requests: 0,
        windowStart: Date.now(),
        backoffDelay: 0,
      });
    }
    return this.state.get(operation)!;
  }

  /**
   * Get window duration for operation type
   */
  private getWindowDuration(operation: string): number {
    switch (operation) {
      case 'tweet':
        return 15 * 60 * 1000; // 15 minutes
      case 'media_upload':
        return 15 * 60 * 1000; // 15 minutes
      case 'follow':
      case 'unfollow':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'search':
        return 15 * 60 * 1000; // 15 minutes
      default:
        return 15 * 60 * 1000; // Default 15 minutes
    }
  }

  /**
   * Get max requests for operation type
   */
  private getMaxRequests(operation: string): number {
    switch (operation) {
      case 'tweet':
        return this.config.tweetsPerHour;
      case 'media_upload':
        return this.config.mediaUploadsPerHour;
      case 'follow':
        return this.config.followsPerDay;
      case 'unfollow':
        return this.config.unfollowsPerDay;
      case 'search':
        return 180; // Twitter search limit
      default:
        return 100; // Conservative default
    }
  }

  /**
   * Execute operation with rate limiting
   */
  async executeWithLimit<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Check rate limit
    if (!(await this.checkLimit(operation))) {
      await this.waitForLimit(operation);
    }

    try {
      const result = await fn();
      this.resetBackoff(operation);
      return result;
    } catch (error) {
      // Don't reset backoff on error - let it build up
      throw error;
    }
  }
}

/**
 * Rate limit bucket for fine-grained control
 */
export class RateLimitBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(capacity: number, refillRatePerSecond: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.refillRate = refillRatePerSecond / 1000;
  }

  /**
   * Try to consume tokens
   */
  tryConsume(tokens: number = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  /**
   * Wait until tokens are available
   */
  async waitForTokens(tokens: number = 1): Promise<void> {
    while (!this.tryConsume(tokens)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Global rate limit manager
 */
export class TwitterRateLimitManager {
  private readonly limiter: TwitterRateLimiter;
  private readonly buckets: Map<string, RateLimitBucket> = new Map();

  constructor(config: RateLimitConfig, retryPolicy: RetryPolicy) {
    this.limiter = new TwitterRateLimiter(config, retryPolicy);
  }

  /**
   * Execute operation with comprehensive rate limiting
   */
  async execute<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.limiter.executeWithLimit(operation, async () => {
      // Additional bucket-based limiting if needed
      const bucket = this.getBucket(operation);
      await bucket.waitForTokens();

      return fn();
    });
  }

  /**
   * Get rate limit status
   */
  getStatus(operation: string): any {
    const limiterStatus = this.limiter.getStatus(operation);
    const bucket = this.getBucket(operation);

    return {
      ...limiterStatus,
      availableTokens: bucket.getTokens(),
    };
  }

  /**
   * Get or create token bucket for operation
   */
  private getBucket(operation: string): RateLimitBucket {
    if (!this.buckets.has(operation)) {
      // Create bucket with conservative defaults
      const capacity = 10;
      const refillRate = 1; // 1 token per second
      this.buckets.set(operation, new RateLimitBucket(capacity, refillRate));
    }
    return this.buckets.get(operation)!;
  }
}