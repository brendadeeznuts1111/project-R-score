/**
 * Rate Limiting Module
 * Protection against API abuse with sliding window algorithm
 */

import config from './config';
import logger from './logger';
import redisManager from './redis-manager';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private localCache: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: Timer;

  constructor(windowMs: number = config.rateLimitWindowMs, maxRequests: number = config.rateLimitMaxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const resetTime = now + this.windowMs;
    
    // Try Redis first for distributed rate limiting
    if (redisManager.isHealthy()) {
      return this.checkRedis(key, now);
    }
    
    // Fall back to local cache
    return this.checkLocal(key, now, resetTime);
  }

  private async checkRedis(key: string, now: number): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;
    const windowKey = Math.floor(now / this.windowMs);
    
    try {
      // Use Redis INCR for atomic counter
      const count = await redisManager.hincrby(redisKey, String(windowKey), 1);
      
      // Set expiration on the hash
      await redisManager.expire(redisKey, Math.ceil(this.windowMs / 1000) + 1);
      
      const allowed = count <= this.maxRequests;
      const resetTime = (windowKey + 1) * this.windowMs;
      
      if (!allowed) {
        logger.warn('Rate limit exceeded', { key, count, limit: this.maxRequests });
      }
      
      return {
        allowed,
        limit: this.maxRequests,
        remaining: Math.max(0, this.maxRequests - count),
        resetTime,
        retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
      };
    } catch (err) {
      logger.error('Redis rate limiting failed, falling back to local', err as Error);
      return this.checkLocal(key, now, now + this.windowMs);
    }
  }

  private checkLocal(key: string, now: number, resetTime: number): RateLimitResult {
    const entry = this.localCache.get(key);
    
    if (!entry || now > entry.resetTime) {
      // New window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime,
      };
      this.localCache.set(key, newEntry);
      
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        resetTime,
      };
    }
    
    // Existing window
    entry.count++;
    const allowed = entry.count <= this.maxRequests;
    
    if (!allowed) {
      logger.warn('Rate limit exceeded (local)', { key, count: entry.count, limit: this.maxRequests });
    }
    
    return {
      allowed,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetTime: entry.resetTime,
      retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.localCache.entries()) {
      if (now > entry.resetTime) {
        this.localCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Rate limiter cleanup: removed ${cleaned} expired entries`);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.localCache.clear();
  }

  // Generate rate limit headers
  getHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
      ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
    };
  }
}

// IP-based rate limiter
export class IPRateLimiter extends RateLimiter {
  async checkRequest(req: Request): Promise<RateLimitResult> {
    const ip = this.getClientIP(req);
    return this.check(`ip:${ip}`);
  }

  private getClientIP(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIP = req.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }
    
    // Fallback to a default (will be overridden by actual connection info)
    return 'unknown';
  }
}

// API key-based rate limiter (for authenticated requests)
export class APIKeyRateLimiter extends RateLimiter {
  async checkAPIKey(apiKey: string): Promise<RateLimitResult> {
    return this.check(`apikey:${apiKey}`);
  }
}

// Singleton instances
export const ipRateLimiter = new IPRateLimiter();
export const apiKeyRateLimiter = new APIKeyRateLimiter(60000, 1000); // Higher limit for API keys

export default ipRateLimiter;
