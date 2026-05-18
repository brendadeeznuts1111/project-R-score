/**
 * Rate Limiting Middleware
 *
 * Implements rate limiting with different strategies and storage backends
 */

import type { AuthenticatedRequest } from './auth.middleware';

interface RateLimitOptions {
  /** Maximum number of requests per window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom key generator function */
  keyGenerator?: (request: AuthenticatedRequest) => string;
  /** Custom rate limit per user role */
  roleBasedLimits?: Record<string, { max: number; windowMs: number }>;
  /** Skip rate limiting for certain conditions */
  skip?: (request: AuthenticatedRequest) => boolean;
  /** Custom response when rate limit exceeded */
  onLimitReached?: (request: AuthenticatedRequest) => Response;
  /** Headers to include in response */
  standardHeaders?: boolean;
  /** Store rate limit data (memory, redis, etc.) */
  store?: RateLimitStore;
}

interface RateLimitInfo {
  totalHits: number;
  totalTokens: number;
  remainingTokens: number;
  msBeforeNext: number;
}

interface RateLimitStore {
  get(key: string): Promise<RateLimitInfo | null>;
  set(key: string, info: RateLimitInfo, ttl: number): Promise<void>;
  increment(key: string, windowMs: number): Promise<RateLimitInfo>;
  reset(key: string): Promise<void>;
}

/**
 * In-memory rate limit store
 */
class MemoryStore implements RateLimitStore {
  private store = new Map<string, { info: RateLimitInfo; expiry: number }>();

  async get(key: string): Promise<RateLimitInfo | null> {
    const record = this.store.get(key);
    if (!record) return null;

    if (Date.now() > record.expiry) {
      this.store.delete(key);
      return null;
    }

    return record.info;
  }

  async set(key: string, info: RateLimitInfo, ttl: number): Promise<void> {
    this.store.set(key, {
      info,
      expiry: Date.now() + ttl,
    });
  }

  async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
    const now = Date.now();
    const existing = await this.get(key);

    if (existing) {
      const updated = {
        ...existing,
        totalHits: existing.totalHits + 1,
        remainingTokens: Math.max(0, existing.remainingTokens - 1),
      };

      await this.set(key, updated, windowMs);
      return updated;
    }

    const newInfo: RateLimitInfo = {
      totalHits: 1,
      totalTokens: 1,
      remainingTokens: 0,
      msBeforeNext: windowMs,
    };

    await this.set(key, newInfo, windowMs);
    return newInfo;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.expiry) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Cloudflare Workers KV store (for production)
 */
class CloudflareKVStore implements RateLimitStore {
  constructor(private kv: any) {}

  async get(key: string): Promise<RateLimitInfo | null> {
    const value = await this.kv.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, info: RateLimitInfo, ttl: number): Promise<void> {
    await this.kv.put(key, JSON.stringify(info), { expirationTtl: Math.floor(ttl / 1000) });
  }

  async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
    const existing = await this.get(key);

    if (existing) {
      const updated = {
        ...existing,
        totalHits: existing.totalHits + 1,
        remainingTokens: Math.max(0, existing.remainingTokens - 1),
      };

      await this.set(key, updated, windowMs);
      return updated;
    }

    const newInfo: RateLimitInfo = {
      totalHits: 1,
      totalTokens: 1,
      remainingTokens: 0,
      msBeforeNext: windowMs,
    };

    await this.set(key, newInfo, windowMs);
    return newInfo;
  }

  async reset(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}

// Global memory store instance
const memoryStore = new MemoryStore();

// Cleanup memory store every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    memoryStore.cleanup();
  }, 300000);
}

/**
 * Default key generator - uses user ID or IP address
 */
function defaultKeyGenerator(request: AuthenticatedRequest): string {
  const userId = request.user?.id;
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from various headers
  const forwarded = request.headers?.get?.('x-forwarded-for');
  const realIp = request.headers?.get?.('x-real-ip');
  const cfConnectingIp = request.headers?.get?.('cf-connecting-ip');

  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  return `ip:${ip}`;
}

/**
 * Get role-specific rate limits
 */
function getRoleLimits(
  role: string,
  roleBasedLimits?: Record<string, { max: number; windowMs: number }>
): { max: number; windowMs: number } {
  if (!roleBasedLimits) {
    // Default limits by role
    const defaults: Record<string, { max: number; windowMs: number }> = {
      admin: { max: 1000, windowMs: 60000 }, // 1000/min
      manager: { max: 500, windowMs: 60000 }, // 500/min
      agent: { max: 200, windowMs: 60000 }, // 200/min
      customer: { max: 100, windowMs: 60000 }, // 100/min
      public: { max: 20, windowMs: 60000 }, // 20/min
    };

    return defaults[role] || defaults.public;
  }

  return roleBasedLimits[role] || roleBasedLimits.default || { max: 100, windowMs: 60000 };
}

/**
 * Default response when rate limit is exceeded
 */
function defaultLimitResponse(request: AuthenticatedRequest, retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(retryAfter / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(retryAfter / 1000).toString(),
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + retryAfter).toISOString(),
      },
    }
  );
}

/**
 * Create rate limit middleware
 */
export function rateLimiter(options: RateLimitOptions = { max: 100, windowMs: 60000 }) {
  const {
    max: defaultMax,
    windowMs: defaultWindowMs,
    keyGenerator = defaultKeyGenerator,
    roleBasedLimits,
    skip,
    onLimitReached = defaultLimitResponse,
    standardHeaders = true,
    store = memoryStore,
  } = options;

  return async (request: AuthenticatedRequest): Promise<Response | void> => {
    try {
      // Skip rate limiting if specified
      if (skip && skip(request)) {
        return;
      }

      // Generate rate limit key
      const key = keyGenerator(request);

      // Get role-specific limits
      const userRole = request.user?.role || 'public';
      const { max, windowMs } = roleBasedLimits
        ? getRoleLimits(userRole, roleBasedLimits)
        : { max: defaultMax, windowMs: defaultWindowMs };

      // Get or create rate limit info
      const info = await store.increment(key, windowMs);

      // Update remaining tokens based on max limit
      info.remainingTokens = Math.max(0, max - info.totalHits);
      info.totalTokens = max;

      // Check if limit exceeded
      if (info.totalHits > max) {
        return onLimitReached(request, info.msBeforeNext);
      }

      // Add rate limit headers if requested
      if (standardHeaders) {
        // Store headers on request for later use
        (request as any).rateLimitHeaders = {
          'X-RateLimit-Limit': max.toString(),
          'X-RateLimit-Remaining': info.remainingTokens.toString(),
          'X-RateLimit-Reset': new Date(Date.now() + info.msBeforeNext).toISOString(),
          'X-RateLimit-Used': info.totalHits.toString(),
        };
      }

      return;
    } catch (error: any) {
      console.error('Rate limiting error:', error);

      // If rate limiting fails, don't block the request
      // This ensures availability over strict rate limiting
      return;
    }
  };
}

/**
 * Role-based rate limiting presets
 */
export const roleBasedRateLimits = {
  /** Very permissive for admins */
  admin: rateLimiter({
    max: 1000,
    windowMs: 60000, // 1000 requests per minute
    roleBasedLimits: {
      admin: { max: 1000, windowMs: 60000 },
    },
  }),

  /** Moderate limits for managers */
  manager: rateLimiter({
    max: 500,
    windowMs: 60000, // 500 requests per minute
    roleBasedLimits: {
      admin: { max: 1000, windowMs: 60000 },
      manager: { max: 500, windowMs: 60000 },
    },
  }),

  /** Standard limits for agents */
  agent: rateLimiter({
    max: 200,
    windowMs: 60000, // 200 requests per minute
    roleBasedLimits: {
      admin: { max: 1000, windowMs: 60000 },
      manager: { max: 500, windowMs: 60000 },
      agent: { max: 200, windowMs: 60000 },
    },
  }),

  /** Conservative limits for customers */
  customer: rateLimiter({
    max: 100,
    windowMs: 60000, // 100 requests per minute
    roleBasedLimits: {
      admin: { max: 1000, windowMs: 60000 },
      manager: { max: 500, windowMs: 60000 },
      agent: { max: 200, windowMs: 60000 },
      customer: { max: 100, windowMs: 60000 },
    },
  }),

  /** Strict limits for public endpoints */
  public: rateLimiter({
    max: 20,
    windowMs: 60000, // 20 requests per minute
    roleBasedLimits: {
      public: { max: 20, windowMs: 60000 },
    },
  }),
};

/**
 * Endpoint-specific rate limits
 */
export const endpointRateLimits = {
  /** Login attempts - very strict */
  login: rateLimiter({
    max: 5,
    windowMs: 300000, // 5 attempts per 5 minutes
    keyGenerator: request => {
      const ip =
        request.headers?.get?.('cf-connecting-ip') ||
        request.headers?.get?.('x-forwarded-for')?.split(',')[0] ||
        'unknown';
      return `login:${ip}`;
    },
  }),

  /** Password reset - strict */
  passwordReset: rateLimiter({
    max: 3,
    windowMs: 900000, // 3 attempts per 15 minutes
  }),

  /** File uploads - moderate */
  upload: rateLimiter({
    max: 10,
    windowMs: 300000, // 10 uploads per 5 minutes
  }),

  /** Search operations - moderate */
  search: rateLimiter({
    max: 50,
    windowMs: 60000, // 50 searches per minute
  }),

  /** Report generation - strict */
  reports: rateLimiter({
    max: 10,
    windowMs: 300000, // 10 reports per 5 minutes
  }),
};

/**
 * Create Cloudflare Workers KV store
 */
export function createCloudflareKVStore(kv: any): CloudflareKVStore {
  return new CloudflareKVStore(kv);
}

/**
 * Get rate limit status for a key
 */
export async function getRateLimitStatus(
  key: string,
  store: RateLimitStore = memoryStore
): Promise<RateLimitInfo | null> {
  return await store.get(key);
}

/**
 * Reset rate limit for a key
 */
export async function resetRateLimit(
  key: string,
  store: RateLimitStore = memoryStore
): Promise<void> {
  await store.reset(key);
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(response: Response, request: AuthenticatedRequest): Response {
  const headers = (request as any).rateLimitHeaders;
  if (headers) {
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(headers)) {
      newHeaders.set(key, value as string);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  return response;
}

export default rateLimiter;
