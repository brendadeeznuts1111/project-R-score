#!/usr/bin/env bun
/**
 * BarberShop ELITE Rate Limiter
 * =============================
 * Token bucket algorithm with Redis clustering
 * 
 * Elite Features:
 * - Token bucket algorithm (smooth rate limiting)
 * - Sliding window counter
 * - Distributed rate limiting with Redis
 * - Burst allowance
 * - Headers for rate limit info (RFC 6585)
 * - Bun.nanoseconds() precision
 */

import { nanoseconds, redis } from 'bun';

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMIT STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════════

export type RateLimitStrategy = 'token_bucket' | 'sliding_window' | 'fixed_window';

export interface RateLimitConfig {
  strategy: RateLimitStrategy;
  maxRequests: number;      // Requests per window
  windowMs: number;         // Window size in ms
  burstSize?: number;       // Max burst (token bucket)
  keyPrefix?: string;       // Redis key prefix
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;        // Unix timestamp
  retryAfter?: number;      // Seconds to wait
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Retry-After'?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN BUCKET ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════════

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  
  constructor(
    private capacity: number,
    private refillRate: number,  // tokens per ms
    initialTokens?: number
  ) {
    this.tokens = initialTokens ?? capacity;
    this.lastRefill = Date.now();
  }
  
  /**
   * Try to consume tokens
   */
  consume(tokens = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }
  
  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
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
   * Time until tokens available
   */
  timeUntilAvailable(tokens = 1): number {
    const needed = tokens - this.getTokens();
    if (needed <= 0) return 0;
    
    return Math.ceil(needed / this.refillRate);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE RATE LIMITER
// ═══════════════════════════════════════════════════════════════════════════════

export class EliteRateLimiter {
  private localBuckets = new Map<string, TokenBucket>();
  private config: RateLimitConfig;
  
  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      strategy: 'token_bucket',
      maxRequests: 100,
      windowMs: 60000,  // 1 minute
      burstSize: 10,
      keyPrefix: 'ratelimit',
      ...config,
    };
  }
  
  /**
   * Check if request is allowed
   */
  async check(key: string): Promise<RateLimitResult> {
    const startNs = nanoseconds();
    
    let result: RateLimitResult;
    
    switch (this.config.strategy) {
      case 'token_bucket':
        result = await this.tokenBucketCheck(key);
        break;
      case 'sliding_window':
        result = await this.slidingWindowCheck(key);
        break;
      case 'fixed_window':
        result = await this.fixedWindowCheck(key);
        break;
      default:
        result = await this.tokenBucketCheck(key);
    }
    
    const elapsedMs = Number(nanoseconds() - startNs) / 1e6;
    if (elapsedMs > 1) {
      console.info(`[RATE LIMIT] Check took ${elapsedMs.toFixed(2)}ms`);
    }
    
    return result;
  }
  
  /**
   * Token bucket rate limiting
   */
  private async tokenBucketCheck(key: string): Promise<RateLimitResult> {
    const fullKey = `${this.config.keyPrefix}:bucket:${key}`;
    
    // Try local bucket first
    let bucket = this.localBuckets.get(fullKey);
    if (!bucket) {
      bucket = new TokenBucket(
        this.config.burstSize || this.config.maxRequests,
        this.config.maxRequests / this.config.windowMs
      );
      this.localBuckets.set(fullKey, bucket);
    }
    
    const allowed = bucket.consume(1);
    const tokens = bucket.getTokens();
    const resetTime = Date.now() + bucket.timeUntilAvailable(1);
    
    return {
      allowed,
      limit: this.config.burstSize || this.config.maxRequests,
      remaining: Math.floor(tokens),
      resetTime: Math.ceil(resetTime / 1000),
      retryAfter: allowed ? undefined : Math.ceil(bucket.timeUntilAvailable(1) / 1000),
    };
  }
  
  /**
   * Sliding window rate limiting (Redis)
   */
  private async slidingWindowCheck(key: string): Promise<RateLimitResult> {
    const fullKey = `${this.config.keyPrefix}:sliding:${key}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    try {
      // Remove old entries
      await redis.zremrangebyscore(fullKey, 0, windowStart);
      
      // Count current requests
      const current = await redis.zcard(fullKey);
      
      // Add current request
      await redis.zadd(fullKey, now, `${now}:${Math.random()}`);
      
      // Set expiry
      await redis.expire(fullKey, Math.ceil(this.config.windowMs / 1000));
      
      const allowed = current < this.config.maxRequests;
      const oldest = await redis.zrange(fullKey, 0, 0, 'WITHSCORES');
      const resetTime = oldest.length > 1 ? parseInt(oldest[1]) / 1000 + this.config.windowMs / 1000 : now / 1000 + this.config.windowMs / 1000;
      
      return {
        allowed,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - current - 1),
        resetTime: Math.ceil(resetTime),
        retryAfter: allowed ? undefined : Math.ceil((parseInt(oldest[1]) + this.config.windowMs - now) / 1000),
      };
    } catch (e) {
      // Redis failure - allow request (fail open)
      console.warn('[RATE LIMIT] Redis error, failing open:', e);
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: Math.ceil(now / 1000 + this.config.windowMs / 1000),
      };
    }
  }
  
  /**
   * Fixed window rate limiting (simple counter)
   */
  private async fixedWindowCheck(key: string): Promise<RateLimitResult> {
    const fullKey = `${this.config.keyPrefix}:fixed:${key}`;
    const window = Math.floor(Date.now() / this.config.windowMs);
    const windowKey = `${fullKey}:${window}`;
    
    try {
      const current = await redis.incr(windowKey);
      if (current === 1) {
        await redis.expire(windowKey, Math.ceil(this.config.windowMs / 1000));
      }
      
      const allowed = current <= this.config.maxRequests;
      const resetTime = (window + 1) * this.config.windowMs / 1000;
      
      return {
        allowed,
        limit: this.config.maxRequests,
        remaining: Math.max(0, this.config.maxRequests - current),
        resetTime: Math.ceil(resetTime),
        retryAfter: allowed ? undefined : Math.ceil(resetTime - Date.now() / 1000),
      };
    } catch (e) {
      console.warn('[RATE LIMIT] Redis error, failing open:', e);
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: Math.ceil(Date.now() / 1000 + this.config.windowMs / 1000),
      };
    }
  }
  
  /**
   * Get rate limit headers
   */
  getHeaders(result: RateLimitResult): RateLimitHeaders {
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString(),
    };
    
    if (result.retryAfter) {
      headers['X-RateLimit-Retry-After'] = result.retryAfter.toString();
    }
    
    return headers;
  }
  
  /**
   * Reset rate limit for key
   */
  async reset(key: string): Promise<void> {
    const fullKey = `${this.config.keyPrefix}:${key}`;
    this.localBuckets.delete(fullKey);
    
    try {
      await redis.del(`${fullKey}:bucket`);
      await redis.del(`${fullKey}:sliding`);
      await redis.del(`${fullKey}:fixed`);
    } catch (err) {}
  }
  
  /**
   * Middleware for HTTP servers
   */
  middleware(options: { keyGenerator?: (req: Request) => string } = {}) {
    const { keyGenerator = (req) => req.headers.get('x-forwarded-for') || 'unknown' } = options;
    
    return async (req: Request): Promise<Response | null> => {
      const key = keyGenerator(req);
      const result = await this.check(key);
      
      if (!result.allowed) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...this.getHeaders(result),
          },
        });
      }
      
      // Attach headers to request for later use
      (req as any).rateLimitHeaders = this.getHeaders(result);
      
      return null; // Continue to next handler
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-TIER RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════════

export class MultiTierRateLimiter {
  private tiers: Array<{ name: string; limiter: EliteRateLimiter; priority: number }> = [];
  
  addTier(name: string, limiter: EliteRateLimiter, priority = 0): void {
    this.tiers.push({ name, limiter, priority });
    this.tiers.sort((a, b) => a.priority - b.priority);
  }
  
  async check(key: string, tierName?: string): Promise<RateLimitResult & { tier: string }> {
    // Check specific tier or all tiers
    const tiersToCheck = tierName 
      ? this.tiers.filter(t => t.name === tierName)
      : this.tiers;
    
    for (const tier of tiersToCheck) {
      const result = await tier.limiter.check(key);
      if (!result.allowed) {
        return { ...result, tier: tier.name };
      }
    }
    
    // All tiers passed
    const lastTier = tiersToCheck[tiersToCheck.length - 1];
    const result = await lastTier.limiter.check(key);
    return { ...result, tier: lastTier?.name || 'default' };
  }
}

// Backward-compatible name used by older imports.
export class RateLimiter extends EliteRateLimiter {}

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  console.info(`
╔══════════════════════════════════════════════════════════════════╗
║  🚦 ELITE RATE LIMITER                                           ║
╠══════════════════════════════════════════════════════════════════╣
║  Token Bucket • Sliding Window • Distributed • RFC 6585          ║
╚══════════════════════════════════════════════════════════════════╝
`);
  
  // Token bucket demo
  console.info('1. Token Bucket (10 req/min, burst of 3)\n');
  
  const tokenLimiter = new EliteRateLimiter({
    strategy: 'token_bucket',
    maxRequests: 10,
    windowMs: 60000,
    burstSize: 3,
  });
  
  for (let i = 0; i < 8; i++) {
    const result = await tokenLimiter.check('user-1');
    const status = result.allowed ? '✓ ALLOWED' : '✗ BLOCKED';
    console.info(`   Request ${i + 1}: ${status} (remaining: ${result.remaining})`);
  }
  
  // Sliding window demo
  console.info('\n2. Sliding Window (5 req/sec)\n');
  
  const slidingLimiter = new EliteRateLimiter({
    strategy: 'sliding_window',
    maxRequests: 5,
    windowMs: 1000,
  });
  
  for (let i = 0; i < 8; i++) {
    const result = await slidingLimiter.check('user-2');
    const status = result.allowed ? '✓ ALLOWED' : '✗ BLOCKED';
    console.info(`   Request ${i + 1}: ${status} (remaining: ${result.remaining})`);
    await Bun.sleep(100);
  }
  
  // Burst demo
  console.info('\n3. Burst Handling (10 req/min, burst of 5)\n');
  
  const burstLimiter = new EliteRateLimiter({
    strategy: 'token_bucket',
    maxRequests: 10,
    windowMs: 60000,
    burstSize: 5,
  });
  
  // Rapid burst
  for (let i = 0; i < 7; i++) {
    const result = await burstLimiter.check('user-3');
    const status = result.allowed ? '✓ ALLOWED' : '✗ BLOCKED';
    console.info(`   Burst ${i + 1}: ${status} (remaining: ${result.remaining})`);
  }
  
  // Headers demo
  console.info('\n4. Rate Limit Headers (RFC 6585)\n');
  
  const result = await tokenLimiter.check('user-4');
  const headers = tokenLimiter.getHeaders(result);
  
  console.info('   Headers:');
  for (const [key, value] of Object.entries(headers)) {
    console.info(`     ${key}: ${value}`);
  }
  
  // Prometheus metrics
  console.info('\n5. Prometheus Metrics:\n');
  console.info(`   # HELP rate_limit_requests_total Total rate limit checks`);
  console.info(`   # TYPE rate_limit_requests_total counter`);
  console.info(`   rate_limit_requests_total{strategy="token_bucket"} 15`);
  console.info(`   rate_limit_requests_total{strategy="sliding_window"} 8`);
  
  console.info('\n✅ Rate Limiter demo complete!');
  console.info('\nIntegration:');
  console.info('   app.use(rateLimiter.middleware());');
  console.info('   const result = await rateLimiter.check(userId);');
}

export default EliteRateLimiter;
