/**
 * FreshCuts Deep Linking System - Rate Limiting
 * Prevents abuse and ensures fair usage of deep link processing
 */

import { RateLimiter, RateLimitConfig } from './freshcuts-deep-linking-types';

// Memory-based rate limiter implementation
export class MemoryRateLimiter implements RateLimiter {
  private requests = new Map<string, Array<{ timestamp: number; count: number }>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request is allowed based on rate limit
   */
  async isAllowed(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request record for this key
    let requests = this.requests.get(key);
    if (!requests) {
      requests = [];
      this.requests.set(key, requests);
    }

    // Filter out old requests outside the window
    const validRequests = requests.filter(req => req.timestamp > windowStart);

    // Calculate total requests in the current window
    const totalRequests = validRequests.reduce((sum, req) => sum + req.count, 0);

    // Check if limit exceeded
    if (totalRequests >= limit) {
      return false;
    }

    // Add this request
    const existingRequest = validRequests.find(req => req.timestamp > now - 1000); // Within the same second
    if (existingRequest) {
      existingRequest.count++;
    } else {
      validRequests.push({ timestamp: now, count: 1 });
    }

    // Update the requests array
    this.requests.set(key, validRequests);

    return true;
  }

  /**
   * Get remaining requests for a key
   */
  async getRemainingRequests(key: string): Promise<number> {
    const requests = this.requests.get(key);
    if (!requests) return 0;

    const now = Date.now();
    const windowStart = now - 60000; // Default 1 minute window
    const validRequests = requests.filter(req => req.timestamp > windowStart);
    
    const totalRequests = validRequests.reduce((sum, req) => sum + req.count, 0);
    return Math.max(0, 100 - totalRequests); // Default limit of 100 per minute
  }

  /**
   * Get reset time for a key
   */
  async getResetTime(key: string): Promise<number> {
    const requests = this.requests.get(key);
    if (!requests) return 0;

    const oldestRequest = requests[0];
    if (!oldestRequest) return 0;

    return oldestRequest.timestamp + 60000; // Default 1 minute window
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - 60000; // Keep last minute of data

    for (const [key, requests] of Array.from(this.requests.entries())) {
      const validRequests = requests.filter(req => req.timestamp > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Rate limiting middleware for deep link handlers
export class RateLimitedDeepLinkHandler {
  private rateLimiter: RateLimiter;
  private config: RateLimitConfig;

  constructor(
    rateLimiter: RateLimiter,
    config: RateLimitConfig
  ) {
    this.rateLimiter = rateLimiter;
    this.config = config;
  }

  /**
   * Wrap a handler function with rate limiting
   */
  async withRateLimit<T>(
    key: string,
    handler: () => Promise<T>
  ): Promise<T> {
    // Generate rate limit key
    const rateLimitKey = this.config.keyGenerator 
      ? this.config.keyGenerator(key)
      : `deeplink:${key}`;

    // Check if request is allowed
    const isAllowed = await this.rateLimiter.isAllowed(
      rateLimitKey,
      this.config.maxRequests,
      this.config.windowMs
    );

    if (!isAllowed) {
      const remainingRequests = await this.rateLimiter.getRemainingRequests(rateLimitKey);
      const resetTime = await this.rateLimiter.getResetTime(rateLimitKey);
      
      throw new Error(
        `Rate limit exceeded. ${remainingRequests} requests remaining. ` +
        `Resets at ${new Date(resetTime).toISOString()}`
      );
    }

    // Execute the handler
    try {
      const result = await handler();
      
      // Track successful request if configured
      if (!this.config.skipSuccessfulRequests) {
        // Success tracking could be implemented here
      }
      
      return result;
    } catch (error) {
      // Track failed request if configured
      if (!this.config.skipFailedRequests) {
        // Failure tracking could be implemented here
      }
      
      throw error;
    }
  }

  /**
   * Get rate limit status for a key
   */
  async getRateLimitStatus(key: string): Promise<{
    remaining: number;
    resetTime: number;
    limit: number;
    windowMs: number;
  }> {
    const rateLimitKey = this.config.keyGenerator 
      ? this.config.keyGenerator(key)
      : `deeplink:${key}`;

    const remaining = await this.rateLimiter.getRemainingRequests(rateLimitKey);
    const resetTime = await this.rateLimiter.getResetTime(rateLimitKey);

    return {
      remaining,
      resetTime,
      limit: this.config.maxRequests,
      windowMs: this.config.windowMs
    };
  }
}

// Default rate limit configurations
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 100,          // 100 requests per minute
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

export const STRICT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 50,           // 50 requests per minute
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
  keyGenerator: (url: string) => {
    // Generate key based on IP or user ID in a real implementation
    return `deeplink:global:${url.split('?')[0]}`;
  }
};

export const PER_USER_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 20,           // 20 requests per minute per user
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (url: string) => {
    // In a real implementation, this would use user ID from auth context
    return `deeplink:user:anonymous:${url.split('?')[0]}`;
  }
};

// Rate limit factory
export class RateLimitFactory {
  /**
   * Create a rate limiter with the specified configuration
   */
  static create(config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG): RateLimitedDeepLinkHandler {
    const rateLimiter = new MemoryRateLimiter();
    return new RateLimitedDeepLinkHandler(rateLimiter, config);
  }

  /**
   * Create a rate limiter for development (more lenient)
   */
  static createDevelopment(): RateLimitedDeepLinkHandler {
    return this.create({
      windowMs: 60 * 1000,
      maxRequests: 1000, // Much higher limit for development
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    });
  }

  /**
   * Create a rate limiter for production (strict)
   */
  static createProduction(): RateLimitedDeepLinkHandler {
    return this.create(STRICT_RATE_LIMIT_CONFIG);
  }

  /**
   * Create a rate limiter for testing (disabled)
   */
  static createTesting(): RateLimitedDeepLinkHandler {
    return this.create({
      windowMs: 60 * 1000,
      maxRequests: 10000, // Very high limit for testing
      skipSuccessfulRequests: true,
      skipFailedRequests: true
    });
  }
}

export default {
  MemoryRateLimiter,
  RateLimitedDeepLinkHandler,
  RateLimitFactory,
  DEFAULT_RATE_LIMIT_CONFIG,
  STRICT_RATE_LIMIT_CONFIG,
  PER_USER_RATE_LIMIT_CONFIG
};
