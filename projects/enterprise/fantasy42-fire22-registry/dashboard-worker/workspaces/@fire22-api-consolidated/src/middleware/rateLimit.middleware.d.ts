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
  roleBasedLimits?: Record<
    string,
    {
      max: number;
      windowMs: number;
    }
  >;
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
 * Cloudflare Workers KV store (for production)
 */
declare class CloudflareKVStore implements RateLimitStore {
  private kv;
  constructor(kv: any);
  get(key: string): Promise<RateLimitInfo | null>;
  set(key: string, info: RateLimitInfo, ttl: number): Promise<void>;
  increment(key: string, windowMs: number): Promise<RateLimitInfo>;
  reset(key: string): Promise<void>;
}
/**
 * Create rate limit middleware
 */
export declare function rateLimiter(
  options?: RateLimitOptions
): (request: AuthenticatedRequest) => Promise<Response | void>;
/**
 * Role-based rate limiting presets
 */
export declare const roleBasedRateLimits: {
  /** Very permissive for admins */
  admin: (request: AuthenticatedRequest) => Promise<Response | void>;
  /** Moderate limits for managers */
  manager: (request: AuthenticatedRequest) => Promise<Response | void>;
  /** Standard limits for agents */
  agent: (request: AuthenticatedRequest) => Promise<Response | void>;
  /** Conservative limits for customers */
  customer: (request: AuthenticatedRequest) => Promise<Response | void>;
  /** Strict limits for public endpoints */
  public: (request: AuthenticatedRequest) => Promise<Response | void>;
};
/**
 * Endpoint-specific rate limits
 */
export declare const endpointRateLimits: {
  /** Login attempts - very strict */
  login: (request: AuthenticatedRequest) => Promise<Response | void>;
  /** Password reset - strict */
  passwordReset: (request: AuthenticatedRequest) => Promise<Response | void>;
  /** File uploads - moderate */
  upload: (request: AuthenticatedRequest) => Promise<Response | void>;
  /** Search operations - moderate */
  search: (request: AuthenticatedRequest) => Promise<Response | void>;
  /** Report generation - strict */
  reports: (request: AuthenticatedRequest) => Promise<Response | void>;
};
/**
 * Create Cloudflare Workers KV store
 */
export declare function createCloudflareKVStore(kv: any): CloudflareKVStore;
/**
 * Get rate limit status for a key
 */
export declare function getRateLimitStatus(
  key: string,
  store?: RateLimitStore
): Promise<RateLimitInfo | null>;
/**
 * Reset rate limit for a key
 */
export declare function resetRateLimit(key: string, store?: RateLimitStore): Promise<void>;
/**
 * Add rate limit headers to response
 */
export declare function addRateLimitHeaders(
  response: Response,
  request: AuthenticatedRequest
): Response;
export default rateLimiter;
//# sourceMappingURL=rateLimit.middleware.d.ts.map
