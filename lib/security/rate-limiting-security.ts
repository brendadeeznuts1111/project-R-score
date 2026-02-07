// lib/security/rate-limiting-security.ts — Rate limiting and security headers middleware

// ============================================================================
// RATE LIMITING INTERFACES
// ============================================================================

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (request: Request) => string; // Generate unique key per client
  headers?: boolean; // Include rate limit headers in response
  message?: string; // Custom message when rate limited
}

interface SecurityHeadersConfig {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableXFrameOptions?: boolean;
  enableXContentTypeOptions?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
  customHeaders?: Record<string, string>;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastAccess: number;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  isRateLimited: boolean;
}

// ============================================================================
// RATE LIMITING IMPLEMENTATION
// ============================================================================

export class RateLimiter {
  private readonly config: RateLimitConfig;
  private readonly clients = new Map<string, RateLimitEntry>();
  private cleanupInterval?: ReturnType<typeof setInterval>;
  private maxClients: number;
  private cleanupThreshold: number;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      headers: true,
      message: 'Too many requests, please try again later.',
      ...config,
    };

    // Memory management settings
    this.maxClients = Math.max(1000, this.config.maxRequests * 10);
    this.cleanupThreshold = Math.max(100, this.maxClients / 10);

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Check if request should be rate limited
   */
  checkLimit(request: Request): RateLimitInfo {
    const key = this.generateKey(request);
    const now = Date.now();

    // Check if we need to trigger cleanup due to memory pressure
    if (this.clients.size > this.maxClients) {
      this.performAggressiveCleanup();
    }

    // Get or create client entry
    let entry = this.clients.get(key);
    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        lastAccess: now,
      };
      this.clients.set(key, entry);
    }

    // Reset if window expired
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + this.config.windowMs;
    }

    // Increment count and update last access
    entry.count++;
    entry.lastAccess = now;

    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const isRateLimited = entry.count > this.config.maxRequests;

    return {
      limit: this.config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      isRateLimited,
    };
  }

  /**
   * Perform aggressive cleanup when memory pressure is detected
   */
  private performAggressiveCleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.clients.entries());

    // Sort by last access time (oldest first)
    entries.sort(([, a], [, b]) => a.lastAccess - b.lastAccess);

    // Remove oldest entries until we're under the threshold
    let removed = 0;
    const targetSize = this.maxClients - this.cleanupThreshold;

    for (let i = 0; i < entries.length && this.clients.size > targetSize; i++) {
      const [key, entry] = entries[i];

      // Remove entries that haven't been accessed recently
      if (now - entry.lastAccess > this.config.windowMs) {
        this.clients.delete(key);
        removed++;
      }
    }

    // If still too many entries, remove the oldest ones regardless of access time
    if (this.clients.size > targetSize) {
      const remainingEntries = Array.from(this.clients.entries());
      remainingEntries.sort(([, a], [, b]) => a.lastAccess - b.lastAccess);

      const excessCount = this.clients.size - targetSize;
      for (let i = 0; i < excessCount; i++) {
        const [key] = remainingEntries[i];
        this.clients.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.warn(
        `🧹 Aggressive rate limiter cleanup: removed ${removed} entries due to memory pressure`
      );
    }
  }

  /**
   * Generate unique key for request
   */
  private generateKey(request: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request);
    }

    // Default: use IP address
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Add user agent for more specific limiting
    const userAgent = request.headers.get('user-agent') || 'unknown';

    return `${ip}:${Buffer.from(userAgent).toString('base64').substring(0, 16)}`;
  }

  /**
   * Start cleanup interval to remove old entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.windowMs);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.clients.entries()) {
      if (now - entry.lastAccess > this.config.windowMs * 2) {
        this.clients.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Rate limiter cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Get current statistics
   */
  getStats(): { totalClients: number; activeClients: number } {
    const now = Date.now();
    let activeClients = 0;

    for (const entry of this.clients.values()) {
      if (now <= entry.resetTime) {
        activeClients++;
      }
    }

    return {
      totalClients: this.clients.size,
      activeClients,
    };
  }

  /**
   * Reset specific client
   */
  resetClient(request: Request): void {
    const key = this.generateKey(request);
    this.clients.delete(key);
  }

  /**
   * Clear all clients
   */
  clear(): void {
    this.clients.clear();
  }

  /**
   * Destroy rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.clients.clear();
    console.log('🗑️ Rate limiter destroyed');
  }
}

// ============================================================================
// SECURITY HEADERS IMPLEMENTATION
// ============================================================================

export class SecurityHeaders {
  private readonly config: SecurityHeadersConfig;

  constructor(config: SecurityHeadersConfig = {}) {
    this.config = {
      enableCSP: true,
      enableHSTS: true,
      enableXFrameOptions: true,
      enableXContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      ...config,
    };
  }

  /**
   * Generate security headers
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Content Security Policy
    if (this.config.enableCSP) {
      headers['Content-Security-Policy'] = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
        "img-src 'self' data: https:",
        "font-src 'self' https:",
        "connect-src 'self' ws: wss:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');
    }

    // HTTP Strict Transport Security
    if (this.config.enableHSTS) {
      headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
    }

    // X-Frame-Options
    if (this.config.enableXFrameOptions) {
      headers['X-Frame-Options'] = 'DENY';
    }

    // X-Content-Type-Options
    if (this.config.enableXContentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff';
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy) {
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    }

    // Permissions Policy
    if (this.config.enablePermissionsPolicy) {
      headers['Permissions-Policy'] = [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
      ].join(', ');
    }

    // Additional security headers
    headers['X-DNS-Prefetch-Control'] = 'off';
    headers['X-Download-Options'] = 'noopen';
    headers['X-Permitted-Cross-Domain-Policies'] = 'none';
    headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
    headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    headers['Cross-Origin-Resource-Policy'] = 'same-origin';

    // Custom headers
    if (this.config.customHeaders) {
      Object.assign(headers, this.config.customHeaders);
    }

    return headers;
  }
}

// ============================================================================
// MIDDLEWARE IMPLEMENTATION
// ============================================================================

export class SecurityMiddleware {
  private rateLimiter?: RateLimiter;
  private securityHeaders: SecurityHeaders;

  constructor(rateLimitConfig?: RateLimitConfig, securityHeadersConfig?: SecurityHeadersConfig) {
    this.securityHeaders = new SecurityHeaders(securityHeadersConfig);

    if (rateLimitConfig) {
      this.rateLimiter = new RateLimiter(rateLimitConfig);
    }
  }

  /**
   * Apply security middleware to request
   */
  async apply(request: Request, handler: () => Promise<Response>): Promise<Response> {
    // Rate limiting check
    if (this.rateLimiter) {
      const rateLimitInfo = this.rateLimiter.checkLimit(request);

      if (rateLimitInfo.isRateLimited) {
        const headers = {
          ...this.securityHeaders.getHeaders(),
          'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
          'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
          'X-RateLimit-Reset': rateLimitInfo.resetTime.toString(),
          'Retry-After': Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000).toString(),
        };

        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests, please try again later.',
            retryAfter: headers['Retry-After'],
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
          }
        );
      }

      // Continue with request, add rate limit headers to response
      const response = await handler();

      if (this.rateLimiter.config.headers) {
        response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime.toString());
      }

      // Add security headers
      const securityHeaders = this.securityHeaders.getHeaders();
      for (const [key, value] of Object.entries(securityHeaders)) {
        response.headers.set(key, value);
      }

      return response;
    }

    // Only security headers, no rate limiting
    const response = await handler();
    const securityHeaders = this.securityHeaders.getHeaders();
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  }

  /**
   * Get rate limiter stats
   */
  getRateLimitStats(): (() => { totalClients: number; activeClients: number }) | undefined {
    return this.rateLimiter ? () => this.rateLimiter!.getStats() : undefined;
  }

  /**
   * Reset client rate limit
   */
  resetClientRateLimit(): ((request: Request) => void) | undefined {
    return this.rateLimiter
      ? (request: Request) => this.rateLimiter!.resetClient(request)
      : undefined;
  }

  /**
   * Destroy middleware
   */
  destroy(): void {
    if (this.rateLimiter) {
      this.rateLimiter.destroy();
    }
  }
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const SecurityPresets = {
  /**
   * Strict security for production APIs
   */
  productionAPI: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      headers: true,
    },
    securityHeaders: {
      enableCSP: true,
      enableHSTS: true,
      enableXFrameOptions: true,
      enableXContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
    },
  },

  /**
   * Moderate security for development
   */
  development: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000, // Higher limit for development
      headers: true,
    },
    securityHeaders: {
      enableCSP: false, // Disabled for easier development
      enableHSTS: false,
      enableXFrameOptions: true,
      enableXContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: false,
    },
  },

  /**
   * High security for sensitive endpoints
   */
  highSecurity: {
    rateLimit: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10, // Very strict
      headers: true,
    },
    securityHeaders: {
      enableCSP: true,
      enableHSTS: true,
      enableXFrameOptions: true,
      enableXContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      customHeaders: {
        'X-Security-Level': 'high',
      },
    },
  },

  /**
   * Permissive for public endpoints
   */
  public: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000, // High limit
      headers: false, // Don't expose limits
    },
    securityHeaders: {
      enableCSP: true,
      enableHSTS: false,
      enableXFrameOptions: 'SAMEORIGIN' as any,
      enableXContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: false,
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create security middleware from preset
 */
export function createSecurityMiddleware(
  preset: keyof typeof SecurityPresets,
  customConfig?: {
    rateLimit?: Partial<RateLimitConfig>;
    securityHeaders?: Partial<SecurityHeadersConfig>;
  }
): SecurityMiddleware {
  const presetConfig = SecurityPresets[preset];

  const rateLimitConfig = customConfig?.rateLimit
    ? { ...presetConfig.rateLimit, ...customConfig.rateLimit }
    : presetConfig.rateLimit;

  const securityHeadersConfig = customConfig?.securityHeaders
    ? { ...presetConfig.securityHeaders, ...customConfig.securityHeaders }
    : presetConfig.securityHeaders;

  return new SecurityMiddleware(rateLimitConfig, securityHeadersConfig);
}

/**
 * CORS configuration helper
 */
export function createCORSHeaders(
  allowedOrigins: string[] = ['*'],
  allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: string[] = ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: number = 86400 // 24 hours
): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes('*') ? '*' : allowedOrigins.join(', '),
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders.join(', '),
    'Access-Control-Max-Age': maxAge.toString(),
    'Access-Control-Allow-Credentials': allowedOrigins.includes('*') ? 'false' : 'true',
  };
}

// ============================================================================
// DEFAULT EXPORTS
// ============================================================================

export const defaultSecurityMiddleware = new SecurityMiddleware(
  SecurityPresets.productionAPI.rateLimit,
  SecurityPresets.productionAPI.securityHeaders
);
