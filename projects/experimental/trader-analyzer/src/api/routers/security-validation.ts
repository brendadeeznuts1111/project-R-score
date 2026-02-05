/**
 * @fileoverview Security Validation for URLPattern Router
 * @description Rate limiting and input sanitization for URLPattern router
 * @module api/routers/security-validation
 * @version 17.16.0.0.0.0.0-routing
 *
 * [DoD][CLASS:SecurityValidation][SCOPE:Security]
 * Security validation with rate limiting and input sanitization
 *
 * Features:
 * - Rate limiting by IP/client
 * - Input sanitization
 * - Security pattern detection
 * - Configurable security policies
 *
 * @example
 * ```typescript
 * const security = new SecurityValidation({ enabled: true });
 * const result = await security.validate(request);
 * if (result.blocked) {
 *   return new Response("Forbidden", { status: 403 });
 * }
 * ```
 */

import { consoleEnhanced } from "../../logging/console-enhanced"

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  blocked: boolean
  reason?: string
  metadata?: Record<string, any>
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  blockDurationMs: number // How long to block after exceeding limit
}

/**
 * Security validation configuration
 */
export interface SecurityConfig {
  enabled: boolean
  rateLimit?: RateLimitConfig
  allowedOrigins?: string[]
  blockedPatterns?: RegExp[]
  maxBodySize?: number
  maxUrlLength?: number
}

/**
 * Client rate limit state
 */
interface ClientState {
  requests: number[]
  blockedUntil?: number
}

/**
 * Security validation with rate limiting and input sanitization
 */
export class SecurityValidation {
  private config: SecurityConfig
  private clientStates = new Map<string, ClientState>()

  // Default rate limit: 100 requests per minute
  private defaultRateLimit: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  }

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enabled: config.enabled !== false,
      rateLimit: config.rateLimit || this.defaultRateLimit,
      allowedOrigins: config.allowedOrigins || [],
      blockedPatterns: config.blockedPatterns || [],
      maxBodySize: config.maxBodySize || 10 * 1024 * 1024, // 10MB
      maxUrlLength: config.maxUrlLength || 2048,
    }

    if (this.config.enabled) {
      consoleEnhanced.info("NX-SECURITY-VALIDATION", "SecurityValidation initialized", {
        rateLimitEnabled: !!this.config.rateLimit,
        maxBodySize: this.config.maxBodySize,
        maxUrlLength: this.config.maxUrlLength,
      })
    }
  }

  /**
   * Validate incoming request
   */
  async validate(request: Request): Promise<SecurityValidationResult> {
    if (!this.config.enabled) {
      return { blocked: false }
    }

    // Get client identifier (IP or similar)
    const clientId = this.getClientId(request)

    // Check if client is currently blocked
    const clientState = this.clientStates.get(clientId)
    if (clientState?.blockedUntil && Date.now() < clientState.blockedUntil) {
      const remaining = Math.ceil((clientState.blockedUntil - Date.now()) / 1000)
      consoleEnhanced.warning("NX-SECURITY-BLOCKED", `Client blocked: ${clientId}`, {
        remainingSeconds: remaining,
      })
      return {
        blocked: true,
        reason: `Rate limit exceeded. Try again in ${remaining} seconds.`,
        metadata: { blockedUntil: clientState.blockedUntil },
      }
    }

    // Apply rate limiting
    if (this.config.rateLimit) {
      const rateLimitResult = this.checkRateLimit(clientId)
      if (rateLimitResult.blocked) {
        return rateLimitResult
      }
    }

    // Check URL length
    if (request.url.length > this.config.maxUrlLength!) {
      consoleEnhanced.warning("NX-SECURITY-URL-LENGTH", `URL too long: ${request.url.length}`, {
        clientId,
        urlLength: request.url.length,
        maxLength: this.config.maxUrlLength,
      })
      return {
        blocked: true,
        reason: "URL too long",
        metadata: { urlLength: request.url.length, maxLength: this.config.maxUrlLength },
      }
    }

    // Check for blocked patterns in URL
    for (const pattern of this.config.blockedPatterns) {
      if (pattern.test(request.url)) {
        consoleEnhanced.warning(
          "NX-SECURITY-BLOCKED-PATTERN",
          `Blocked pattern detected: ${pattern}`,
          {
            clientId,
            url: request.url,
          }
        )
        return {
          blocked: true,
          reason: "Request matches blocked pattern",
          metadata: { pattern: pattern.toString() },
        }
      }
    }

    // Check request body size
    if (request.body) {
      try {
        const contentLength = request.headers.get("content-length")
        if (contentLength && parseInt(contentLength) > this.config.maxBodySize!) {
          consoleEnhanced.warning("NX-SECURITY-BODY-SIZE", `Body too large: ${contentLength}`, {
            clientId,
            contentLength: parseInt(contentLength),
            maxSize: this.config.maxBodySize,
          })
          return {
            blocked: true,
            reason: "Request body too large",
            metadata: { contentLength: parseInt(contentLength), maxSize: this.config.maxBodySize },
          }
        }
      } catch (error) {
        consoleEnhanced.error("NX-SECURITY-ERROR", "Error checking body size", error)
      }
    }

    // Check origin if configured
    if (this.config.allowedOrigins && this.config.allowedOrigins.length > 0) {
      const origin = request.headers.get("origin") || request.headers.get("referer")
      if (origin && !this.config.allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
        consoleEnhanced.warning("NX-SECURITY-ORIGIN", `Disallowed origin: ${origin}`, {
          clientId,
          origin,
          allowedOrigins: this.config.allowedOrigins,
        })
        return {
          blocked: true,
          reason: "Origin not allowed",
          metadata: { origin, allowedOrigins: this.config.allowedOrigins },
        }
      }
    }

    return { blocked: false }
  }

  /**
   * Get client identifier from request
   */
  private getClientId(request: Request): string {
    // Try to get real IP from common headers
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const cfConnectingIp = request.headers.get("cf-connecting-ip")

    const ip = forwardedFor?.split(",")[0]?.trim() || realIp || cfConnectingIp || "unknown"

    // For development, use a simple identifier
    // In production, you might want to use IP + User-Agent or similar
    return ip
  }

  /**
   * Check rate limit for client
   */
  private checkRateLimit(clientId: string): SecurityValidationResult {
    const now = Date.now()
    const config = this.config.rateLimit!

    let clientState = this.clientStates.get(clientId)
    if (!clientState) {
      clientState = { requests: [] }
      this.clientStates.set(clientId, clientState)
    }

    // Remove old requests outside the window
    clientState.requests = clientState.requests.filter(
      (timestamp) => now - timestamp < config.windowMs
    )

    // Check if limit exceeded
    if (clientState.requests.length >= config.maxRequests) {
      clientState.blockedUntil = now + config.blockDurationMs

      consoleEnhanced.warning("NX-SECURITY-RATE-LIMIT", `Rate limit exceeded for ${clientId}`, {
        requestCount: clientState.requests.length,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        blockDurationMs: config.blockDurationMs,
      })

      return {
        blocked: true,
        reason: `Rate limit exceeded: ${config.maxRequests} requests per ${config.windowMs / 1000} seconds`,
        metadata: {
          requestCount: clientState.requests.length,
          maxRequests: config.maxRequests,
          windowMs: config.windowMs,
          blockedUntil: clientState.blockedUntil,
        },
      }
    }

    // Add current request
    clientState.requests.push(now)

    return { blocked: false }
  }

  /**
   * Get security statistics
   */
  getStats(): {
    totalClients: number
    blockedClients: number
    activeBlocks: number
    totalValidations: number
  } {
    const now = Date.now()
    let blockedClients = 0
    let activeBlocks = 0

    for (const [clientId, state] of this.clientStates.entries()) {
      if (state.blockedUntil && state.blockedUntil > now) {
        blockedClients++
        activeBlocks++
      }
    }

    return {
      totalClients: this.clientStates.size,
      blockedClients,
      activeBlocks,
      totalValidations: Array.from(this.clientStates.values()).reduce(
        (sum, state) => sum + state.requests.length,
        0
      ),
    }
  }

  /**
   * Clear all client states (useful for testing)
   */
  clear(): void {
    this.clientStates.clear()
    consoleEnhanced.info("NX-SECURITY-CLEAR", "Security validation state cleared")
  }

  /**
   * Unblock a specific client
   */
  unblockClient(clientId: string): boolean {
    const state = this.clientStates.get(clientId)
    if (state) {
      delete state.blockedUntil
      consoleEnhanced.info("NX-SECURITY-UNBLOCK", `Client unblocked: ${clientId}`)
      return true
    }
    return false
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig }
    consoleEnhanced.info("NX-SECURITY-CONFIG", "Security configuration updated", newConfig)
  }
}
