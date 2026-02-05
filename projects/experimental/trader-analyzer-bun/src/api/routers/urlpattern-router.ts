/**
 * @fileoverview 7.0.0.0.0.0.0: URLPattern Router for HyperBun MLGS API
 * @description Bun-native URLPattern-based router for declarative route matching
 * @module api/routers/urlpattern-router
 * @version 7.0.0.0.0.0.0
 *
 * [DoD][CLASS:URLPatternRouter][SCOPE:DeclarativeRouting]
 * Bun-native URLPattern-based router for HyperBun MLGS API endpoints
 * Replaces manual regex matching with Web Platform standard
 *
 * Cross-reference: docs/BUN-1.3.4-URLPATTERN-API.md
 * Cross-reference: docs/12.0.0.0.0.0.0-FRONTEND-UI-STANDARDS-ASSET-PIPELINE.md
 * Ripgrep Pattern: 7\.0\.0\.0\.0\.0\.0|URLPatternRouter|urlpattern-router
 */

import type { Context } from "hono"
import { LOG_CODES } from "../../logging/log-codes"
import { logger } from "../../utils/logger"
import { consoleEnhanced } from "../../logging/console-enhanced"
import { StructuredLogger } from "../../logging/structured-logger"

// Note: Bun 1.3.4+ has native URLPattern support
// URLPattern is available globally - no import needed
// For TypeScript types, URLPattern is part of the global scope

/**
 * Route pattern definition with handler and optional middleware
 */
export interface RoutePattern<T extends Record<string, string> = Record<string, string>> {
  pattern: URLPattern
  handler: (request: Request, context: Context, groups: T) => Promise<Response> | Response
  middlewares?: Array<
    (request: Request, context: Context, groups: T) => Promise<Response> | Response
  >
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  summary?: string // For OpenAPI documentation
  tags?: string[] // For categorization
}

/**
 * 7.0.0.0.0.0.0: URLPattern Router Class
 * [DoD][CLASS:URLPatternRouter][SCOPE:DeclarativeRouting]
 *
 * Provides declarative route matching using Bun's native URLPattern API (v1.3.4+).
 * Features pattern caching, middleware chains, and performance metrics.
 */
export class URLPatternRouter {
  private readonly routes: RoutePattern[] = []
  private readonly patternCache = new Map<string, URLPattern>()
  private readonly metrics = {
    hits: new Map<string, number>(),
    misses: 0,
    avgMatchTime: 0,
  }

  constructor() {
    // Pre-compile common patterns for performance
    this.precompilePatterns()
  }

  /**
   * 7.0.1.0.0.0.0: Pre-compile common route patterns
   * [DoD][METHOD:PrecompilePatterns][SCOPE:Performance]
   */
  private precompilePatterns(): void {
    // API v1 patterns
    this.patternCache.set("api-v1-graph", new URLPattern({ pathname: "/api/v1/graph/:eventId" }))
    this.patternCache.set("api-v1-logs", new URLPattern({ pathname: "/api/v1/logs/:level?" }))
    this.patternCache.set(
      "api-v1-secrets",
      new URLPattern({ pathname: "/api/v1/secrets/:server/:type" })
    )
    this.patternCache.set("api-v1-auth-login", new URLPattern({ pathname: "/api/v1/auth/login" }))
    this.patternCache.set("api-v1-auth-logout", new URLPattern({ pathname: "/api/v1/auth/logout" }))
    this.patternCache.set("api-v1-auth-verify", new URLPattern({ pathname: "/api/v1/auth/verify" }))

    // Dashboard patterns
    this.patternCache.set("dashboard-event", new URLPattern({ pathname: "/dashboard/:eventId?" }))
    this.patternCache.set("dashboard-logs", new URLPattern({ pathname: "/dashboard/logs/:level?" }))

    // WebSocket patterns
    this.patternCache.set("ws-stream", new URLPattern({ pathname: "/ws/:streamType" }))

    logger.info("URLPattern precompilation complete", {
      code: LOG_CODES["HBAPI-001"]?.code || "HBAPI-001",
      patterns: this.patternCache.size,
    })
  }

  /**
   * 7.1.0.0.0.0.0: Register a route with URLPattern
   * [DoD][METHOD:AddRoute][SCOPE:RouteRegistration]
   *
   * @param pattern - Route pattern definition with handler
   *
   * @example
   * ```typescript
   * router.add({
   *   pattern: new URLPattern({ pathname: '/api/v1/users/:id' }),
   *   handler: async (req, ctx, groups) => {
   *     const userId = groups.id;
   *     return new Response(JSON.stringify({ userId }));
   *   },
   *   method: 'GET',
   *   summary: 'Get user by ID'
   * });
   * ```
   */
  add<T extends Record<string, string>>(pattern: RoutePattern<T>): void {
    // Validate pattern
    if (!pattern.pattern) {
      throw new Error("Route pattern is required")
    }

    // Ensure pattern has required components
    if (!pattern.pattern.pathname && !pattern.pattern.hostname) {
      throw new Error("Pattern must have pathname or hostname")
    }

    this.routes.push(pattern as RoutePattern)

    logger.debug("Route registered", {
      code: LOG_CODES["HBAPI-001"]?.code || "HBAPI-001",
      operation: "route_registered",
      pattern: pattern.pattern.pathname,
      method: pattern.method || "ALL",
    })
  }

  /**
   * 7.1.1.0.0.0.0: Match incoming request against patterns
   * [DoD][METHOD:MatchRequest][SCOPE:RouteMatching]
   *
   * @param request - Incoming HTTP request
   * @returns Match result with route, groups, and match time, or null if no match
   *
   * @example
   * ```typescript
   * const match = router.match(request);
   * if (match) {
   *   const { route, groups, matchTime } = match;
   *   // Use groups.id, groups.server, etc.
   * }
   * ```
   */
  match(request: Request): {
    route: RoutePattern
    groups: Record<string, string>
    matchTime: number
  } | null {
    const startTime = performance.now()
    const url = new URL(request.url)

    // Try cached patterns first (fast path)
    for (const [key, pattern] of this.patternCache.entries()) {
      const result = pattern.exec(request.url)

      if (result) {
        const route = this.routes.find(
          (r) =>
            r.pattern.pathname === pattern.pathname &&
            (r.method === undefined || r.method === request.method)
        )

        if (route) {
          const matchTime = performance.now() - startTime
          this.recordMetric(key, matchTime)

          logger.debug("Pattern matched", {
            code: LOG_CODES["HBAPI-002"]?.code || "HBAPI-002",
            operation: "pattern_matched",
            pattern: key,
            matchTime: matchTime.toFixed(3) + "ms",
          })

          return {
            route,
            groups: Object.fromEntries(
              Object.entries(result.pathname.groups || {}).filter(
                ([, value]) => value !== undefined
              )
            ) as Record<string, string>,
            matchTime,
          }
        }
      }
    }

    // Fallback to full route scanning (slow path)
    for (const route of this.routes) {
      const result = route.pattern.exec(request.url)

      if (result && (route.method === undefined || route.method === request.method)) {
        const matchTime = performance.now() - startTime
        this.recordMetric("uncached", matchTime)

        logger.debug("Pattern matched (uncached)", {
          code: LOG_CODES["HBAPI-003"]?.code || "HBAPI-003",
          operation: "pattern_matched_uncached",
          pathname: route.pattern.pathname,
          matchTime: matchTime.toFixed(3) + "ms",
        })

        return {
          route,
          groups: Object.fromEntries(
            Object.entries(result.pathname.groups || {}).filter(([, value]) => value !== undefined)
          ) as Record<string, string>,
          matchTime,
        }
      }
    }

    // No match
    this.metrics.misses++
    return null
  }

  /**
   * 7.1.2.0.0.0.0: Execute route with middleware chain
   * [DoD][METHOD:ExecuteRoute][SCOPE:RouteExecution]
   *
   * @param request - Incoming HTTP request
   * @param context - Hono context object
   * @param match - Match result from match() method
   * @returns Response from route handler or middleware chain
   *
   * @example
   * ```typescript
   * const match = router.match(request);
   * if (match) {
   *   const response = await router.execute(request, context, match);
   *   return response;
   * }
   * ```
   */
  async execute(
    request: Request,
    context: Context,
    match: { route: RoutePattern; groups: Record<string, string> }
  ): Promise<Response> {
    const { route, groups } = match

    // Build middleware chain
    const handlers = [...(route.middlewares || []), route.handler]

    try {
      let response: Response = new Response("Not Found", { status: 404 })

      for (const handler of handlers) {
        response = await handler(request, context, groups)

        // If response is already sent, stop chain
        if (response.headers.get("x-response-sent")) {
          break
        }
      }

      return response
    } catch (error) {
      const structuredLogger = new StructuredLogger()
      const errorObj = error as Error

      // Use structured logger for %j format
      structuredLogger.log("ROUTE_EXECUTION_FAILED", {
        code: LOG_CODES["HBAPI-004"]?.code || "HBAPI-004",
        operation: "route_execution_failed",
        pattern: route.pattern.pathname,
        url: request.url,
        method: request.method,
        error: errorObj.message,
        stack: errorObj.stack,
      })

      // Also use legacy logger for backward compatibility
      logger.error("Route execution failed", errorObj, {
        code: LOG_CODES["HBAPI-004"]?.code || "HBAPI-004",
        operation: "route_execution_failed",
        pattern: route.pattern.pathname,
      })

      throw error
    }
  }

  /**
   * 7.1.2.1.0.0.0: Check if two URLPattern pathnames match (handles wildcards)
   * [DoD][METHOD:PatternsMatch][SCOPE:RouteMatching]
   */
  private patternsMatch(pattern1: string, pattern2: string): boolean {
    // Simple comparison - in production, might need more sophisticated matching
    // For now, exact match or both contain same parameter names
    if (pattern1 === pattern2) return true

    // Extract parameter names from patterns
    const params1 = pattern1.match(/:(\w+)/g) || []
    const params2 = pattern2.match(/:(\w+)/g) || []

    // If both have same number of params and same structure, consider match
    if (params1.length === params2.length) {
      const normalized1 = pattern1.replace(/:(\w+)/g, ":param")
      const normalized2 = pattern2.replace(/:(\w+)/g, ":param")
      return normalized1 === normalized2
    }

    return false
  }

  /**
   * 7.1.3.0.0.0.0: Performance metrics tracking
   * [DoD][METHOD:RecordMetric][SCOPE:Observability]
   */
  private recordMetric(patternKey: string, matchTime: number): void {
    const current = this.metrics.hits.get(patternKey) || 0
    this.metrics.hits.set(patternKey, current + 1)

    // Rolling average
    const totalHits = Array.from(this.metrics.hits.values()).reduce((a, b) => a + b, 0)
    this.metrics.avgMatchTime =
      (this.metrics.avgMatchTime * (totalHits - 1) + matchTime) / totalHits
  }

  /**
   * 7.1.4.0.0.0.0: Get performance metrics
   * [DoD][METHOD:GetMetrics][SCOPE:Observability]
   *
   * @returns Router performance metrics
   */
  getMetrics() {
    return {
      patterns: this.routes.length,
      cacheHits: Object.fromEntries(this.metrics.hits),
      cacheMisses: this.metrics.misses,
      avgMatchTime: this.metrics.avgMatchTime.toFixed(3) + "ms",
    }
  }

  /**
   * 7.1.5.0.0.0.0: Clear pattern cache (for hot reload)
   * [DoD][METHOD:ClearCache][SCOPE:Development]
   */
  clearCache(): void {
    this.patternCache.clear()
    this.precompilePatterns()
    logger.info("URLPattern cache cleared", {
      code: LOG_CODES["HBAPI-005"]?.code || "HBAPI-005",
      operation: "urlpattern_cache_cleared",
    })
  }
}

/**
 * Global router instance for application-wide use
 * [DoD][SINGLETON:URLPatternRouter][SCOPE:Global]
 */
export const urlPatternRouter = new URLPatternRouter()
