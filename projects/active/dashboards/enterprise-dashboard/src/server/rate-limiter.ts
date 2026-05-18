/**
 * Multi-Scope Rate Limiter
 *
 * Protects against velocity attacks with layered limits:
 * - Per-IP: Basic layer, bypassable with IP rotation
 * - Per-User-ID: Authenticated requests (from session/JWT)
 * - Per-Fingerprint: Device/browser fingerprint for additional coverage
 *
 * Uses sliding window algorithm with O(1) memory per key.
 */

import type { Server } from "bun";

// Server type with any WebSocket data (not used in rate limiting)
type BunServer = Server<unknown>;

// =============================================================================
// TYPES
// =============================================================================

export type RateLimitScope = "ip" | "user" | "fingerprint" | "combined";

export interface RateLimitConfig {
  /** Requests allowed per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Optional: skip rate limiting for these IPs (e.g., health checks) */
  skipIps?: string[];
  /** Optional: custom key extractor */
  keyGenerator?: (req: Request, server: BunServer) => string | null;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
  scope: RateLimitScope;
  key: string;
}

interface SlidingWindowEntry {
  count: number;
  windowStart: number;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/** Default limits by scope */
export const DEFAULT_LIMITS: Record<RateLimitScope, RateLimitConfig> = {
  ip: {
    limit: 100,
    windowMs: 60_000, // 100 req/min per IP
  },
  user: {
    limit: 200,
    windowMs: 60_000, // 200 req/min per user (more generous for authenticated)
  },
  fingerprint: {
    limit: 150,
    windowMs: 60_000, // 150 req/min per device
  },
  combined: {
    limit: 50,
    windowMs: 60_000, // 50 req/min when all scopes match (strictest)
  },
};

/** Stricter limits for sensitive endpoints */
export const SENSITIVE_ENDPOINT_LIMITS: Record<RateLimitScope, RateLimitConfig> = {
  ip: {
    limit: 10,
    windowMs: 60_000, // 10 req/min per IP
  },
  user: {
    limit: 20,
    windowMs: 60_000, // 20 req/min per user
  },
  fingerprint: {
    limit: 15,
    windowMs: 60_000, // 15 req/min per device
  },
  combined: {
    limit: 5,
    windowMs: 60_000, // 5 req/min when all match
  },
};

/** Patterns for sensitive endpoints (funding, auth, etc.) */
export const SENSITIVE_PATTERNS = [
  /^\/api\/fund/i,
  /^\/api\/payment/i,
  /^\/api\/transfer/i,
  /^\/api\/withdraw/i,
  /^\/api\/auth\/login/i,
  /^\/api\/auth\/register/i,
  /^\/api\/auth\/password/i,
  /^\/api\/admin/i,
  /^\/api\/secrets/i,
  /^\/api\/export/i,
];

// =============================================================================
// RATE LIMITER CLASS
// =============================================================================

export class RateLimiter {
  private windows = new Map<string, SlidingWindowEntry>();
  private cleanupInterval: Timer | null = null;

  /** Default config for each scope */
  private scopeConfigs: Record<RateLimitScope, RateLimitConfig>;

  /** IPs to skip (localhost, health checks) */
  private skipIps: Set<string>;

  constructor(
    configs: Partial<Record<RateLimitScope, Partial<RateLimitConfig>>> = {},
    skipIps: string[] = ["127.0.0.1", "::1", "localhost"]
  ) {
    // Merge user configs with defaults
    this.scopeConfigs = {
      ip: { ...DEFAULT_LIMITS.ip, ...configs.ip },
      user: { ...DEFAULT_LIMITS.user, ...configs.user },
      fingerprint: { ...DEFAULT_LIMITS.fingerprint, ...configs.fingerprint },
      combined: { ...DEFAULT_LIMITS.combined, ...configs.combined },
    };

    this.skipIps = new Set(skipIps);

    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * Check if request is allowed under rate limits
   * Returns the most restrictive result across all applicable scopes
   */
  check(
    req: Request,
    server: BunServer,
    options: {
      userId?: string;
      fingerprint?: string;
      isSensitive?: boolean;
    } = {}
  ): RateLimitResult {
    const ip = this.extractIp(req, server);
    const { userId, fingerprint, isSensitive } = options;

    // Skip for allowlisted IPs
    if (this.skipIps.has(ip)) {
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: Date.now(),
        scope: "ip",
        key: ip,
      };
    }

    // Determine which config to use
    const configs = isSensitive ? SENSITIVE_ENDPOINT_LIMITS : this.scopeConfigs;

    // Check all applicable scopes, return most restrictive
    const results: RateLimitResult[] = [];

    // Always check IP
    results.push(this.checkScope("ip", `ip:${ip}`, configs.ip));

    // Check user if provided
    if (userId) {
      results.push(this.checkScope("user", `user:${userId}`, configs.user));
    }

    // Check fingerprint if provided
    if (fingerprint) {
      results.push(this.checkScope("fingerprint", `fp:${fingerprint}`, configs.fingerprint));
    }

    // Check combined key if we have multiple identifiers
    if (userId || fingerprint) {
      const combinedKey = `combined:${ip}:${userId || "anon"}:${fingerprint || "unknown"}`;
      results.push(this.checkScope("combined", combinedKey, configs.combined));
    }

    // Return the most restrictive result (lowest remaining or first denied)
    const denied = results.find(r => !r.allowed);
    if (denied) return denied;

    // All allowed - return the one with lowest remaining
    return results.reduce((min, r) =>
      r.remaining < min.remaining ? r : min
    );
  }

  /**
   * Check a single scope against its limit
   */
  private checkScope(
    scope: RateLimitScope,
    key: string,
    config: RateLimitConfig
  ): RateLimitResult {
    const now = Date.now();
    const entry = this.windows.get(key);

    // No entry or window expired - start fresh
    if (!entry || now - entry.windowStart >= config.windowMs) {
      this.windows.set(key, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: config.limit - 1,
        resetAt: now + config.windowMs,
        scope,
        key,
      };
    }

    // Within window - check limit
    const remaining = config.limit - entry.count - 1;
    const resetAt = entry.windowStart + config.windowMs;

    if (entry.count >= config.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
        scope,
        key,
      };
    }

    // Allowed - increment counter
    entry.count++;
    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      resetAt,
      scope,
      key,
    };
  }

  /**
   * Extract client IP from request
   */
  private extractIp(req: Request, server: BunServer): string {
    // Check standard proxy headers first
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      // Take first IP (client) from comma-separated list
      return forwarded.split(",")[0].trim();
    }

    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp;

    // Fall back to Bun's socket info
    const socketAddr = server.requestIP(req);
    return socketAddr?.address || "unknown";
  }

  /**
   * Extract user ID from request (session cookie or Authorization header)
   */
  static extractUserId(req: Request): string | undefined {
    // Check Authorization header (JWT/Bearer)
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      try {
        // Decode JWT payload (don't verify - just extract ID for rate limiting)
        const [, payload] = auth.slice(7).split(".");
        const decoded = JSON.parse(atob(payload));
        return decoded.sub || decoded.userId || decoded.id;
      } catch {
        // Invalid JWT format
      }
    }

    // Check session cookie
    const cookies = req.headers.get("cookie");
    if (cookies) {
      const match = cookies.match(/session_id=([^;]+)/);
      if (match) return `session:${match[1]}`;
    }

    return undefined;
  }

  /**
   * Extract device fingerprint from request
   * Uses combination of headers for lightweight fingerprinting
   */
  static extractFingerprint(req: Request): string {
    const components = [
      req.headers.get("user-agent") || "",
      req.headers.get("accept-language") || "",
      req.headers.get("accept-encoding") || "",
      req.headers.get("sec-ch-ua") || "", // Client hints
      req.headers.get("sec-ch-ua-platform") || "",
    ];

    // Create hash of components
    return Bun.hash.crc32(components.join("|")).toString(16);
  }

  /**
   * Check if path matches sensitive endpoint patterns
   */
  static isSensitiveEndpoint(pathname: string): boolean {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(pathname));
  }

  /**
   * Generate rate limit headers for response
   */
  static getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(result.remaining + (result.allowed ? 1 : 0)),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      "X-RateLimit-Scope": result.scope,
    };

    if (!result.allowed && result.retryAfter) {
      headers["Retry-After"] = String(result.retryAfter);
    }

    return headers;
  }

  /**
   * Create 429 Too Many Requests response
   */
  static createLimitResponse(result: RateLimitResult): Response {
    return new Response(
      JSON.stringify({
        error: "Too Many Requests",
        message: `Rate limit exceeded for ${result.scope}. Retry after ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
        scope: result.scope,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...RateLimiter.getHeaders(result),
        },
      }
    );
  }

  /**
   * Cleanup expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxWindowMs = Math.max(
      this.scopeConfigs.ip.windowMs,
      this.scopeConfigs.user.windowMs,
      this.scopeConfigs.fingerprint.windowMs,
      this.scopeConfigs.combined.windowMs
    );

    for (const [key, entry] of this.windows) {
      if (now - entry.windowStart > maxWindowMs * 2) {
        this.windows.delete(key);
      }
    }
  }

  /**
   * Get current stats for monitoring
   */
  getStats(): {
    activeKeys: number;
    byScope: Record<RateLimitScope, number>;
  } {
    const byScope: Record<RateLimitScope, number> = {
      ip: 0,
      user: 0,
      fingerprint: 0,
      combined: 0,
    };

    for (const key of this.windows.keys()) {
      if (key.startsWith("ip:")) byScope.ip++;
      else if (key.startsWith("user:")) byScope.user++;
      else if (key.startsWith("fp:")) byScope.fingerprint++;
      else if (key.startsWith("combined:")) byScope.combined++;
    }

    return {
      activeKeys: this.windows.size,
      byScope,
    };
  }

  /**
   * Reset rate limit for a specific key (e.g., after successful captcha)
   */
  reset(key: string): void {
    this.windows.delete(key);
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.windows.clear();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Global rate limiter instance */
export const rateLimiter = new RateLimiter();

/**
 * Middleware-style rate limit check
 * Returns null if allowed, Response if blocked
 */
export function checkRateLimit(
  req: Request,
  server: BunServer
): { response: Response | null; result: RateLimitResult } {
  const url = new URL(req.url);
  const userId = RateLimiter.extractUserId(req);
  const fingerprint = RateLimiter.extractFingerprint(req);
  const isSensitive = RateLimiter.isSensitiveEndpoint(url.pathname);

  const result = rateLimiter.check(req, server, {
    userId,
    fingerprint,
    isSensitive,
  });

  if (!result.allowed) {
    return {
      response: RateLimiter.createLimitResponse(result),
      result,
    };
  }

  return { response: null, result };
}
