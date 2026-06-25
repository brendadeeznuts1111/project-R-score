/**
 * Token Bucket Rate Limiter
 *
 * In-memory token bucket implementation per IP address + endpoint tier.
 * No Redis required — uses a Bun-native Map with automatic cleanup.
 *
 * Tiers (from api-contract.md §5):
 *   Tier 1 — 100/min  (standard read endpoints)
 *   Tier 2 — 60/min   (general API)
 *   Tier 3 — 30/min   (proxy endpoints)
 *   Tier 4 — 10/min   (auth endpoints)
 *   Tier 5 — 200/min  (metrics, health — internal/scraping)
 *   Tier 6 — 5/min    (auth mutations — strict)
 *
 * Headers returned on every response:
 *   X-RateLimit-Limit     — Maximum requests in window
 *   X-RateLimit-Remaining — Remaining requests in current window
 *   X-RateLimit-Reset     — Unix timestamp when window resets
 *
 * On 429 response:
 *   Retry-After           — Seconds until client can retry
 */

import { createLogger } from "@utils/logger";
import { logQueue } from "@utils/tableLogger";
import { RateLimitError } from "@utils/errors";

const logger = createLogger("RateLimit");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface TierConfig {
  requestsPerMinute: number;
  burst: number;
  windowMs: number;
}

const TIER_CONFIGS: Record<number, TierConfig> = {
  1: { requestsPerMinute: 100, burst: 20, windowMs: 60000 },
  2: { requestsPerMinute: 60, burst: 10, windowMs: 60000 },
  3: { requestsPerMinute: 30, burst: 10, windowMs: 60000 },
  4: { requestsPerMinute: 10, burst: 5, windowMs: 60000 },
  5: { requestsPerMinute: 200, burst: 50, windowMs: 60000 },
  6: { requestsPerMinute: 5, burst: 3, windowMs: 60000 },
};

/** Endpoint -> tier mapping */
const ENDPOINT_TIERS: Array<{ pattern: RegExp; tier: number }> = [
  // Tier 6: Auth mutations (strict)
  { pattern: /^\/api\/proxy\/auth$/, tier: 6 },
  { pattern: /^\/api\/proxy\/renewToken$/, tier: 6 },

  // Tier 5: Metrics & health (high for scraping)
  { pattern: /^\/api\/metrics$/, tier: 5 },
  { pattern: /^\/api\/health/, tier: 5 },
  { pattern: /^\/metrics$/, tier: 5 },
  { pattern: /^\/health$/, tier: 5 },

  // Tier 4: Auth reads
  { pattern: /^\/api\/proxy\/accountInfo$/, tier: 4 },

  // Tier 3: Proxy endpoints
  { pattern: /^\/api\/proxy\//, tier: 3 },

  // Tier 2: General API
  { pattern: /^\/api\/rules/, tier: 2 },
  { pattern: /^\/api\/agent\/ip-tracking/, tier: 2 },
  { pattern: /^\/api\/players/, tier: 2 },
  { pattern: /^\/api\/positions/, tier: 2 },
  { pattern: /^\/api\/dashboard/, tier: 2 },
  { pattern: /^\/api\/export/, tier: 2 },

  // Tier 1: Standard reads (default)
  { pattern: /^\/api\//, tier: 1 },
];

// ---------------------------------------------------------------------------
// Token bucket state
// ---------------------------------------------------------------------------

interface BucketState {
  tokens: number;
  lastRefill: number;
  windowMs: number;
  maxTokens: number;
}

/** Key format: `${tier}:${ip}` */
const buckets = new Map<string, BucketState>();

/** Track last cleanup time */
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 300_000; // 5 minutes
const BUCKET_MAX_AGE_MS = 600_000;   // Remove buckets idle for 10 minutes

// ---------------------------------------------------------------------------
// Core rate limiting
// ---------------------------------------------------------------------------

/**
 * Determine the rate limit tier for a given pathname.
 */
export function getTierForEndpoint(pathname: string): number {
  for (const entry of ENDPOINT_TIERS) {
    if (entry.pattern.test(pathname)) {
      return entry.tier;
    }
  }
  return 1; // Default to Tier 1
}

/**
 * Get tier configuration.
 */
export function getTierConfig(tier: number): TierConfig {
  return TIER_CONFIGS[tier] || TIER_CONFIGS[1];
}

/**
 * Extract client IP from request.
 */
function extractClientIp(req: Request): string {
  // Check forwarded headers (common proxy setups)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback: extract from URL (Bun.serve doesn't expose socket directly in fetch)
  try {
    const url = new URL(req.url);
    return url.hostname || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Refill tokens in a bucket based on elapsed time.
 */
function refillBucket(bucket: BucketState): void {
  const now = Date.now();
  const elapsedMs = now - bucket.lastRefill;
  if (elapsedMs <= 0) return;

  const refillRate = bucket.maxTokens / bucket.windowMs; // tokens per ms
  const tokensToAdd = elapsedMs * refillRate;

  bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

/**
 * Get or create a bucket for the given key.
 */
function getBucket(key: string, tier: number): BucketState {
  const config = getTierConfig(tier);

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = {
      tokens: config.burst,
      lastRefill: Date.now(),
      windowMs: config.windowMs,
      maxTokens: config.burst,
    };
    buckets.set(key, bucket);
  }

  refillBucket(bucket);
  return bucket;
}

/**
 * Clean up stale buckets to prevent unbounded memory growth.
 */
function cleanupStaleBuckets(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  let removed = 0;
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > BUCKET_MAX_AGE_MS) {
      buckets.delete(key);
      removed++;
    }
  }

  lastCleanup = now;
  if (removed > 0) {
    logger.debug(`Cleaned up ${removed} stale rate limit buckets`, { remaining: buckets.size });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a request is rate limited.
 *
 * @returns Rate limit result with headers. If limited, throws RateLimitError.
 */
export interface RateLimitResult {
  allowed: boolean;
  headers: Record<string, string>;
  retryAfter?: number;
}

/**
 * Check a request against the rate limiter.
 *
 * @param req — The incoming request
 * @param pathname — The request pathname (used for tier selection)
 * @returns RateLimitResult with headers
 * @throws RateLimitError if the request exceeds the limit
 */
export function checkRateLimit(req: Request, pathname: string): RateLimitResult {
  cleanupStaleBuckets();

  const clientIp = extractClientIp(req);
  const tier = getTierForEndpoint(pathname);
  const config = getTierConfig(tier);

  // Admin API keys bypass rate limiting
  const apiKey = req.headers.get("X-API-Key");
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (apiKey && adminToken && apiKey === adminToken) {
    return {
      allowed: true,
      headers: {
        "X-RateLimit-Limit": String(config.requestsPerMinute),
        "X-RateLimit-Remaining": "unlimited",
        "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000)),
        "X-RateLimit-Tier": String(tier),
      },
    };
  }

  const key = `${tier}:${clientIp}`;
  const bucket = getBucket(key, tier);

  const now = Date.now();
  const resetTime = Math.floor((now + config.windowMs) / 1000);

  if (bucket.tokens < 1) {
    // Rate limited
    const retryAfter = Math.ceil((1 / (config.requestsPerMinute / 60))); // seconds to get 1 token
    logger.warn(`Rate limit exceeded`, {
      ip: clientIp,
      tier,
      path: pathname,
      retryAfter,
    });

    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
      config.requestsPerMinute,
      "minute",
      String(tier)
    );
  }

  // Consume a token
  bucket.tokens -= 1;

  const remainingTokens = Math.max(0, Math.floor(bucket.tokens));

  return {
    allowed: true,
    headers: {
      "X-RateLimit-Limit": String(config.requestsPerMinute),
      "X-RateLimit-Remaining": String(remainingTokens),
      "X-RateLimit-Reset": String(resetTime),
      "X-RateLimit-Tier": String(tier),
    },
  };
}

/**
 * Apply rate limit headers to an existing Response.
 */
export function applyRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  Object.entries(result.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Get rate limiter statistics for health/debugging.
 */
export function getRateLimitStats(): Record<string, unknown> {
  const tierCounts: Record<number, number> = {};
  for (const [key] of buckets) {
    const tier = Number(key.split(":")[0]);
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  }

  return {
    totalBuckets: buckets.size,
    bucketsByTier: tierCounts,
    lastCleanup: new Date(lastCleanup).toISOString(),
    tierConfigs: Object.fromEntries(
      Object.entries(TIER_CONFIGS).map(([tier, config]) => [
        tier,
        { rpm: config.requestsPerMinute, burst: config.burst },
      ])
    ),
  };
}

/**
 * Reset all rate limit buckets. Useful in testing.
 */
export function resetRateLimiter(): void {
  buckets.clear();
  lastCleanup = Date.now();
  logger.info("Rate limiter state reset");
}
