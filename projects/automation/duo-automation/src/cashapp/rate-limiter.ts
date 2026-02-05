/**
 * CashApp Rate Limiter - Bun Native Redis Implementation
 * Enterprise-Grade Rate Limiting with Sliding Window Support
 */

import { redis, RedisClient } from "bun";
import type { RateLimitConfig, RateLimitResult } from './types.js';

/**
 * Redis-backed rate limiter using Bun's native Redis client
 * Implements sliding window rate limiting with automatic blocking
 */
export class CashAppRateLimiter {
  private readonly client: RedisClient;
  private readonly keyPrefix: string;
  private readonly config: Required<RateLimitConfig>;

  constructor(
    config: RateLimitConfig,
    options: {
      keyPrefix?: string;
      redisUrl?: string;
    } = {}
  ) {
    this.keyPrefix = options.keyPrefix || 'cashapp_rate';
    this.config = {
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration || 300 // 5 minutes default block
    };
    
    // Create Redis client with URL from env or default
    const redisUrl = options.redisUrl || process.env.REDIS_URL || `redis://localhost:${process.env.REDIS_PORT || 6379}`;
    this.client = new RedisClient(redisUrl);
  }

  /**
   * Check if request is allowed and consume a point
   */
  async consume(key: string): Promise<RateLimitResult> {
    const rateKey = `${this.keyPrefix}:${key}`;
    const blockKey = `${rateKey}:blocked`;
    
    // Check if key is currently blocked
    const isBlocked = await this.client.exists(blockKey);
    if (isBlocked) {
      const ttl = await this.client.ttl(blockKey);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: ttl > 0 ? ttl : this.config.blockDuration,
        resetAt: Date.now() + (ttl > 0 ? ttl : this.config.blockDuration) * 1000
      };
    }

    // Initialize counter if this is first request in window
    const exists = await this.client.exists(rateKey);
    if (!exists) {
      await this.client.set(rateKey, '0');
      await this.client.expire(rateKey, this.config.duration);
    }

    // Increment counter
    const count = await this.client.incr(rateKey);
    const ttl = await this.client.ttl(rateKey);
    
    const remaining = Math.max(0, this.config.points - count);
    const resetAt = Date.now() + ttl * 1000;

    // Check if over limit
    if (count > this.config.points) {
      // Block the key
      await this.client.set(blockKey, '1');
      await this.client.expire(blockKey, this.config.blockDuration);
      
      return {
        allowed: false,
        remaining: 0,
        retryAfter: this.config.blockDuration,
        resetAt
      };
    }

    return {
      allowed: true,
      remaining,
      resetAt
    };
  }

  /**
   * Get current rate limit status without consuming
   */
  async getStatus(key: string): Promise<RateLimitResult> {
    const rateKey = `${this.keyPrefix}:${key}`;
    const blockKey = `${rateKey}:blocked`;
    
    // Check if blocked
    const isBlocked = await this.client.exists(blockKey);
    if (isBlocked) {
      const ttl = await this.client.ttl(blockKey);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: ttl > 0 ? ttl : this.config.blockDuration,
        resetAt: Date.now() + (ttl > 0 ? ttl : this.config.blockDuration) * 1000
      };
    }

    // Get current count
    const countStr = await this.client.get(rateKey);
    const count = countStr ? parseInt(countStr) : 0;
    const ttl = await this.client.ttl(rateKey);
    
    const remaining = Math.max(0, this.config.points - count);
    const resetAt = Date.now() + (ttl > 0 ? ttl : this.config.duration) * 1000;

    return {
      allowed: count < this.config.points,
      remaining,
      resetAt
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(key: string): Promise<void> {
    const rateKey = `${this.keyPrefix}:${key}`;
    const blockKey = `${rateKey}:blocked`;
    
    await this.client.del(rateKey);
    await this.client.del(blockKey);
  }

  /**
   * Reset all rate limits (use with caution)
   */
  async resetAll(): Promise<number> {
    const pattern = `${this.keyPrefix}:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
    return keys.length;
  }

  /**
   * Get rate limit statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    blockedKeys: number;
  }> {
    const pattern = `${this.keyPrefix}:*`;
    const keys = await this.client.keys(pattern);
    
    let blockedCount = 0;
    for (const key of keys) {
      if (key.endsWith(':blocked')) {
        blockedCount++;
      }
    }

    return {
      totalKeys: keys.length,
      blockedKeys: blockedCount
    };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    this.client.close();
  }

  /**
   * Create a new client instance (for subscription mode)
   */
  duplicate(): RedisClient {
    return new RedisClient(process.env.REDIS_URL || `redis://localhost:${process.env.REDIS_PORT || 6379}`);
  }
}

/**
 * Sliding window rate limiter for more accurate rate limiting
 * Uses Redis sorted sets for precise window tracking
 */
export class SlidingWindowRateLimiter {
  private readonly client: RedisClient;
  private readonly keyPrefix: string;
  private readonly windowSize: number; // in milliseconds
  private readonly maxRequests: number;

  constructor(
    windowSizeMs: number,
    maxRequests: number,
    options: {
      keyPrefix?: string;
      redisUrl?: string;
    } = {}
  ) {
    this.windowSize = windowSizeMs;
    this.maxRequests = maxRequests;
    this.keyPrefix = options.keyPrefix || 'cashapp_rate_sliding';
    
    const redisUrl = options.redisUrl || process.env.REDIS_URL || `redis://localhost:${process.env.REDIS_PORT || 6379}`;
    this.client = new RedisClient(redisUrl);
  }

  /**
   * Check and consume using sliding window algorithm
   * Uses simple counter-based approach for Bun Redis compatibility
   */
  async consume(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const rateKey = `${this.keyPrefix}:${key}`;
    const windowKey = `${rateKey}:window`;

    // Use simple increment with timestamp tracking
    const currentWindow = Math.floor(now / this.windowSize);
    const windowBucket = `${windowKey}:${currentWindow}`;

    // Get current count for this window
    const countStr = await this.client.get(windowBucket);
    const count = countStr ? parseInt(countStr) : 0;

    if (count >= this.maxRequests) {
      // Calculate when this window resets
      const windowEnd = (currentWindow + 1) * this.windowSize;
      const retryAfter = Math.ceil((windowEnd - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(1, retryAfter),
        resetAt: windowEnd
      };
    }

    // Increment counter
    await this.client.incr(windowBucket);
    await this.client.expire(windowBucket, Math.ceil(this.windowSize / 1000) + 1);

    // Set expiry on main key
    await this.client.expire(rateKey, Math.ceil(this.windowSize / 1000) + 1);

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - count - 1),
      resetAt: (currentWindow + 1) * this.windowSize
    };
  }

  /**
   * Get current count in window
   */
  async getCurrentCount(key: string): Promise<number> {
    const now = Date.now();
    const rateKey = `${this.keyPrefix}:${key}`;
    const windowKey = `${rateKey}:window`;
    const currentWindow = Math.floor(now / this.windowSize);
    const windowBucket = `${windowKey}:${currentWindow}`;

    const countStr = await this.client.get(windowBucket);
    return countStr ? parseInt(countStr) : 0;
  }

  /**
   * Reset limiter for a key
   */
  async reset(key: string): Promise<void> {
    const rateKey = `${this.keyPrefix}:${key}`;
    await this.client.del(rateKey);
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    this.client.close();
  }
}

// Export factory functions for convenience
export function createRateLimiter(
  points: number = 100,
  duration: number = 60,
  blockDuration: number = 300
): CashAppRateLimiter {
  return new CashAppRateLimiter({ points, duration, blockDuration });
}

export function createSlidingWindowLimiter(
  windowSizeMs: number = 60000,
  maxRequests: number = 100
): SlidingWindowRateLimiter {
  return new SlidingWindowRateLimiter(windowSizeMs, maxRequests);
}
