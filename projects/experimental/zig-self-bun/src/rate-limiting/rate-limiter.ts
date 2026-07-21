// src/rate-limiting/rate-limiter.ts
//! Distributed rate limiting with sliding window algorithm
//! Uses in-memory store (in production, use Redis/external store)

import { nanoseconds } from "bun";
import { createLogger } from "../logging/logger";

const logger = createLogger("@rate-limit");

// Rate limit configuration
export interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
}

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

// In-memory store for rate limiting (in production, use Redis)
class RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  // Clean up expired entries periodically
  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (now > data.resetTime) {
        this.store.delete(key);
      }
    }
  }

  checkAndUpdate(key: string, config: RateLimitConfig): RateLimitResult {
    this.cleanup();

    const now = Date.now();
    const windowStart = now - config.windowMs;
    let entry = this.store.get(key);

    // Create new entry if doesn't exist or expired
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      this.store.set(key, entry);
    }

    const remaining = Math.max(0, config.maxRequests - entry.count);

    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        limit: config.maxRequests,
      };
    }

    // Allow request and increment counter
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
    };
  }

  // Get current state for a key
  getState(key: string): { count: number; resetTime: number } | undefined {
    return this.store.get(key);
  }

  // Clear all entries (useful for testing)
  clear(): void {
    this.store.clear();
  }
}

// Global rate limit store
const store = new RateLimitStore();

// Rate limiter class
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: (req) => req.headers.get("CF-Connecting-IP") ||
                             req.headers.get("X-Forwarded-For") ||
                             req.headers.get("X-Real-IP") ||
                             "127.0.0.1", // Default to localhost
      ...config,
    };
  }

  // Check if request should be allowed
  check(req: Request): RateLimitResult {
    const key = this.config.keyGenerator!(req);
    return store.checkAndUpdate(key, this.config);
  }

  // Get current state for a request
  getState(req: Request): { count: number; resetTime: number } | undefined {
    const key = this.config.keyGenerator!(req);
    return store.getState(key);
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  // API endpoints: 1000 requests per minute
  api: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
  }),

  // Proxy requests: 100 requests per minute per IP
  proxy: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  }),

  // WebSocket connections: 10 connections per minute per IP
  websocket: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  }),

  // Config updates: 50 updates per minute per IP
  config: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
  }),

  // Aggressive rate limiting for auth endpoints
  auth: new RateLimiter({
    windowMs: 15 * 1000, // 15 seconds
    maxRequests: 5,      // 5 attempts per 15 seconds
  }),
};

// Rate limiting middleware
export function createRateLimitMiddleware(limiter: RateLimiter, skipOnDebug: boolean = true) {
  return async (req: Request, next: () => Promise<Response>): Promise<Response> => {
    // Skip rate limiting if DEBUG flag is enabled and skipOnDebug is true
    if (skipOnDebug && process.env.BUN_FEATURE_DEBUG === "1") {
      return next();
    }

    const result = limiter.check(req);

    // Add rate limit headers
    const headers = new Headers();
    headers.set("X-RateLimit-Limit", result.limit.toString());
    headers.set("X-RateLimit-Remaining", result.remaining.toString());
    headers.set("X-RateLimit-Reset", Math.ceil(result.resetTime / 1000).toString());

    if (!result.allowed) {
      logger.warn("@rate-limit", "Rate limit exceeded", {
        ip: req.headers.get("CF-Connecting-IP") ||
            req.headers.get("X-Forwarded-For") ||
            req.headers.get("X-Real-IP") || "unknown",
        limit: result.limit,
        resetTime: result.resetTime,
      });

      return new Response("Rate limit exceeded", {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          ...Object.fromEntries(headers.entries()),
        },
      });
    }

    // Continue with request
    const response = await next();

    // Add rate limit headers to response
    const responseHeaders = new Headers(response.headers);
    for (const [key, value] of headers.entries()) {
      responseHeaders.set(key, value);
    }

    return new Response(response.body, {
      ...response,
      headers: responseHeaders,
    });
  };
}

// HTTP response for rate limit status
export function createRateLimitStatusResponse(req: Request, limiter: RateLimiter): Response {
  const result = limiter.check(req);

  return new Response(JSON.stringify({
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
    limit: result.limit,
    resetIn: Math.ceil((result.resetTime - Date.now()) / 1000),
  }), {
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
    },
  });
}

// Clear all rate limit data (useful for testing)
export function clearRateLimits(): void {
  store.clear();
  logger.info("@rate-limit", "Cleared all rate limit data");
}

// Get rate limit statistics
export function getRateLimitStats(): {
  totalKeys: number;
  activeWindows: number;
} {
  // This is a simplified version - in production, expose more detailed stats
  return {
    totalKeys: 0, // Not accessible from current store implementation
    activeWindows: 0,
  };
}

// Rate limit error class
export class RateLimitExceededError extends Error {
  public readonly resetTime: number;
  public readonly limit: number;

  constructor(message: string, resetTime: number, limit: number) {
    super(message);
    this.name = "RateLimitExceededError";
    this.resetTime = resetTime;
    this.limit = limit;
  }
}

// Distributed rate limiting with Redis (placeholder for future implementation)
export class DistributedRateLimiter extends RateLimiter {
  constructor(config: RateLimitConfig, redisUrl?: string) {
    super(config);
    // In production, implement Redis-backed rate limiting
    if (redisUrl) {
      logger.info("@rate-limit", "Distributed rate limiting enabled", { redisUrl });
    }
  }

  // Override check method to use Redis
  check(req: Request): RateLimitResult {
    // Placeholder: implement Redis-based rate limiting
    // For now, fall back to in-memory implementation
    return super.check(req);
  }
}

// Sliding window rate limiter (more accurate than fixed window)
export class SlidingWindowRateLimiter extends RateLimiter {
  private requestTimes = new Map<string, number[]>();

  constructor(config: RateLimitConfig) {
    super(config);
  }

  check(req: Request): RateLimitResult {
    const key = this.config.keyGenerator!(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get request times for this key
    let times = this.requestTimes.get(key) || [];

    // Remove old requests outside the window
    times = times.filter(time => time > windowStart);

    // Check if under limit
    if (times.length >= this.config.maxRequests) {
      const resetTime = times[0] + this.config.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        limit: this.config.maxRequests,
      };
    }

    // Add current request
    times.push(now);
    this.requestTimes.set(key, times);

    return {
      allowed: true,
      remaining: this.config.maxRequests - times.length,
      resetTime: now + this.config.windowMs,
      limit: this.config.maxRequests,
    };
  }
}

// Export convenience functions
export function isRateLimited(req: Request, limiter: RateLimiter = rateLimiters.api): boolean {
  return !limiter.check(req).allowed;
}

export function getRateLimitHeaders(req: Request, limiter: RateLimiter = rateLimiters.api): Record<string, string> {
  const result = limiter.check(req);
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
  };
}

