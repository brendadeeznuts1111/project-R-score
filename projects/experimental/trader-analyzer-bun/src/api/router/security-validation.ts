/**
 * @fileoverview 7.8.0.0.0.0.0: URLPattern Security Validation
 * @description Pattern-aware rate limiting and input validation
 * @module src/api/router/security-validation
 * @version 7.8.0.0.0.0.0
 *
 * [DoD][SECURITY:PatternValidation][SCOPE:InputValidation]
 * Validate URLPattern parameters and implement rate limiting
 */

import { consoleEnhanced } from "../../logging/console-enhanced"

/**
 * Pattern parameter validators
 */
export const patternValidators = {
  eventId: (value: string) => /^[A-Z]{3,4}-\d{8}(-\d{4})?$/.test(value),
  layer: (value: string) => /^[1-4]$/.test(value),
  period: (value: string) => /^(Q[1-4]|H[1-2]|FULL)$/.test(value),
  level: (value: string) => /^(DEBUG|INFO|WARN|ERROR|CRITICAL)$/.test(value),
  server: (value: string) => /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value),
  type: (value: string) => /^(api-key|cookies|tokens)$/.test(value),
  anomalyId: (value: string) => /^ANOM-\d{3}$/.test(value),
  sessionId: (value: string) => /^[a-f0-9]{32}$/.test(value),
  userId: (value: string) => /^\d+$/.test(value),
  fileName: (value: string) => /^[\w\.-]+$/.test(value) && !/\.\./.test(value),
}

/**
 * 7.8.1.0.0.0.0: Validate URLPattern groups
 * [DoD][FUNCTION:ValidateURLPatternGroups][SCOPE:InputValidation]
 *
 * @param groups - Parameter groups from URLPattern match
 * @returns Validation result
 */
export function validateURLPatternGroups(groups: Record<string, string>): {
  valid: boolean
  errors: string[]
  sanitized: Record<string, string>
} {
  const errors: string[] = []
  const sanitized: Record<string, string> = {}

  for (const [key, value] of Object.entries(groups)) {
    if (value === undefined || value === null) {
      continue // Skip optional parameters
    }

    const validator = patternValidators[key as keyof typeof patternValidators]
    if (validator) {
      if (!validator(value)) {
        errors.push(`Invalid ${key}: ${value}`)
        consoleEnhanced.warning("HBAPI-011", `Invalid pattern parameter`, {
          parameter: key,
          value,
          validator: validator.toString(),
        })
      } else {
        // Sanitize the value
        sanitized[key] = value.trim()
      }
    } else {
      // No validator defined, pass through but log
      sanitized[key] = value.trim()
      consoleEnhanced.debug("HBAPI-012", `Unvalidated parameter`, { parameter: key })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  }
}

/**
 * 7.8.2.0.0.0.0: Pattern-aware rate limiter
 * [DoD][CLASS:PatternRateLimiter][SCOPE:DoSProtection]
 */
export class PatternRateLimiter {
  private limits = new Map<string, { window: number; max: number }>([
    ["/api/v1/graph/:eventId", { window: 60000, max: 1000 }], // 1000/min per event
    ["/api/v1/logs/:level", { window: 60000, max: 100 }], // 100/min per level
    ["/api/v1/secrets/:server/:type", { window: 60000, max: 10 }], // 10/min (sensitive)
    ["/api/v1/auth/login", { window: 300000, max: 5 }], // 5 per 5min
    ["/api/v1/auth/logout", { window: 60000, max: 30 }], // 30/min
    ["/dashboard/:eventId", { window: 60000, max: 500 }], // 500/min per dashboard
    ["/ws/:streamType", { window: 60000, max: 100 }], // 100/min per websocket type
  ])

  private hits = new Map<string, { count: number; resetTime: number; firstHit: number }>()

  /**
   * Check if request should be rate limited
   */
  check(
    pattern: string,
    identifier: string,
    groups?: Record<string, string>
  ): {
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  } {
    const limit = this.limits.get(pattern)
    if (!limit) {
      return { allowed: true, remaining: -1, resetTime: 0 }
    }

    const now = Date.now()
    const key = `${pattern}:${identifier}`

    // Create dynamic key for parameterized routes
    let dynamicKey = key
    if (groups) {
      // For routes with parameters, create more specific keys
      if (pattern.includes(":eventId") && groups.eventId) {
        dynamicKey = `${pattern.replace(":eventId", groups.eventId)}:${identifier}`
      } else if (pattern.includes(":server") && groups.server) {
        dynamicKey = `${pattern.replace(":server", groups.server)}:${identifier}`
      }
    }

    const entry = this.hits.get(dynamicKey)

    if (!entry || now > entry.resetTime) {
      // New window
      const resetTime = now + limit.window
      this.hits.set(dynamicKey, {
        count: 1,
        resetTime,
        firstHit: now,
      })
      return {
        allowed: true,
        remaining: limit.max - 1,
        resetTime,
      }
    }

    if (entry.count >= limit.max) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

      consoleEnhanced.warning("HBAPI-013", "Rate limit exceeded", {
        pattern,
        identifier,
        limit: limit.max,
        window_ms: limit.window,
        retryAfter,
      })

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter,
      }
    }

    entry.count++
    return {
      allowed: true,
      remaining: limit.max - entry.count,
      resetTime: entry.resetTime,
    }
  }

  /**
   * Add custom rate limit for a pattern
   */
  addLimit(pattern: string, windowMs: number, maxRequests: number): void {
    this.limits.set(pattern, { window: windowMs, max: maxRequests })
    consoleEnhanced.info("Rate limit added", { pattern, windowMs, maxRequests })
  }

  /**
   * Remove rate limit for a pattern
   */
  removeLimit(pattern: string): void {
    this.limits.delete(pattern)
    consoleEnhanced.info("Rate limit removed", { pattern })
  }

  /**
   * Get current rate limit status
   */
  getStatus(
    pattern: string,
    identifier: string
  ): {
    current: number
    limit: number
    window: number
    remaining: number
  } | null {
    const limit = this.limits.get(pattern)
    if (!limit) return null

    const key = `${pattern}:${identifier}`
    const entry = this.hits.get(key)

    return {
      current: entry?.count || 0,
      limit: limit.max,
      window: limit.window,
      remaining: Math.max(0, limit.max - (entry?.count || 0)),
    }
  }

  /**
   * Clean up expired entries (for maintenance)
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.hits.entries()) {
      if (now > entry.resetTime) {
        this.hits.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      consoleEnhanced.debug("HBAPI-014", "Rate limiter cleanup", { entriesRemoved: cleaned })
    }

    return cleaned
  }

  /**
   * Get statistics
   */
  getStats(): {
    patterns: number
    activeLimits: number
    totalHits: number
  } {
    const totalHits = Array.from(this.hits.values()).reduce((sum, entry) => sum + entry.count, 0)

    return {
      patterns: this.limits.size,
      activeLimits: this.hits.size,
      totalHits,
    }
  }
}

/**
 * Global pattern rate limiter instance
 * [DoD][SINGLETON:PatternRateLimiter][SCOPE:Global]
 */
export const patternRateLimiter = new PatternRateLimiter()

/**
 * 7.8.3.0.0.0.0: Security middleware for URLPattern routes
 * [DoD][FUNCTION:SecurityMiddleware][SCOPE:RequestValidation]
 */
export function createSecurityMiddleware(
  options: { validateParams?: boolean; rateLimit?: boolean; logSecurityEvents?: boolean } = {}
) {
  return async (request: Request, context: any, groups: Record<string, string>) => {
    const url = new URL(request.url)
    const clientId =
      request.headers.get("x-client-id") || request.headers.get("x-forwarded-for") || "anonymous"

    // Parameter validation
    if (options.validateParams !== false) {
      const validation = validateURLPatternGroups(groups)
      if (!validation.valid) {
        consoleEnhanced.error("HBAPI-015", "Parameter validation failed", {
          errors: validation.errors,
          path: url.pathname,
          clientId,
        })

        return new Response(
          JSON.stringify({
            error: "Invalid request parameters",
            details: validation.errors,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      // Replace groups with sanitized versions
      Object.assign(groups, validation.sanitized)
    }

    // Rate limiting
    if (options.rateLimit !== false) {
      const rateLimitResult = patternRateLimiter.check(url.pathname, clientId, groups)
      if (!rateLimitResult.allowed) {
        consoleEnhanced.warning("HBAPI-016", "Request rate limited", {
          path: url.pathname,
          clientId,
          retryAfter: rateLimitResult.retryAfter,
        })

        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            retryAfter: rateLimitResult.retryAfter,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
            },
          }
        )
      }

      // Add rate limit headers to response
      if (context.response) {
        context.response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString())
        context.response.headers.set(
          "X-RateLimit-Reset",
          Math.ceil(rateLimitResult.resetTime / 1000).toString()
        )
      }
    }

    // Security event logging
    if (options.logSecurityEvents) {
      consoleEnhanced.debug("HBAPI-017", "Security check passed", {
        path: url.pathname,
        method: request.method,
        clientId,
        userAgent: request.headers.get("user-agent"),
      })
    }

    // Continue to next middleware/handler
    return new Response("continue")
  }
}

/**
 * 7.8.4.0.0.0.0: SQL injection protection for URL parameters
 * [DoD][FUNCTION:SanitizeSQLInput][SCOPE:SQLInjectionProtection]
 */
export function sanitizeSQLInput(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/['";\\]/g, "") // Remove quotes, semicolons, backslashes
    .replace(/--/g, "") // Remove SQL comments
    .replace(/\/\*.*?\*\//g, "") // Remove block comments
    .trim()
}

/**
 * 7.8.5.0.0.0.0: XSS protection for URL parameters
 * [DoD][FUNCTION:SanitizeXSSInput][SCOPE:XSSProtection]
 */
export function sanitizeXSSInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim()
}

/**
 * Initialize security components
 */
export function initializeSecurity(): void {
  // Set up periodic cleanup
  setInterval(() => {
    patternRateLimiter.cleanup()
  }, 300000) // Clean up every 5 minutes

  consoleEnhanced.info("URLPattern security validation initialized", {
    validators: Object.keys(patternValidators).length,
    rateLimits: patternRateLimiter.getStats().patterns,
  })
}
