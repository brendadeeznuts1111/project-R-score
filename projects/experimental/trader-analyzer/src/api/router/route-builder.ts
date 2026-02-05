/**
 * @fileoverview 7.4.0.0.0.0.0: Route Builder for Type-Safe URLPattern Routes
 * @description Fluent API for building URLPattern routes with compile-time type checking
 * @module api/router/route-builder
 * @version 7.4.0.0.0.0.0
 *
 * [DoD][CLASS:RouteBuilder][SCOPE:TypeSafety]
 * Fluent API for building URLPattern routes with compile-time type checking
 */

import type { Context } from "hono"
import { consoleEnhanced } from "../../logging/console-enhanced"

/**
 * URLPattern groups type helper
 */
type URLPatternGroups<T extends string> = {
  [K in T]: string
}

/**
 * Route pattern interface (re-export for convenience)
 */
export interface RoutePattern<T extends Record<string, string> = Record<string, string>> {
  pattern: URLPattern
  handler: (request: Request, context: Context, groups: T) => Promise<Response> | Response
  middlewares?: Array<
    (request: Request, context: Context, groups: T) => Promise<Response> | Response
  >
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  summary?: string
  tags?: string[]
}

/**
 * 7.4.0.0.0.0.0: Route Builder Class
 * [DoD][CLASS:RouteBuilder][SCOPE:TypeSafety]
 *
 * Provides a fluent API for building URLPattern routes with compile-time
 * type checking and automatic parameter extraction.
 *
 * @example
 * ```typescript
 * const route = RouteBuilder.path('/api/v1/events/:eventId/periods/:period')
 *   .get()
 *   .use(authMiddleware)
 *   .handle(async (req, ctx, groups) => {
 *     // groups.eventId and groups.period are string (type-safe!)
 *     const { eventId, period } = groups;
 *     return Response.json({ eventId, period });
 *   })
 *   .summary('Get period data for event')
 *   .tags(['events', 'periods'])
 *   .build();
 * ```
 */
export class RouteBuilder<T extends string = never> {
  private patternInit: {
    pathname?: string
    hostname?: string
    protocol?: "http:" | "https:"
  } = {}
  private method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  private middlewares: any[] = []
  private handler?: (
    request: Request,
    context: Context,
    groups: URLPatternGroups<any>
  ) => Promise<Response> | Response
  private options: {
    summary?: string
    tags?: string[]
  } = {}

  /**
   * 7.4.1.0.0.0.0: Start building a route with pathname
   * [DoD][METHOD:Path][SCOPE:RouteConstruction]
   *
   * @param pathname - URL pattern string (e.g., '/api/v1/users/:id')
   * @returns RouteBuilder instance for chaining
   */
  static path(pathname: string): RouteBuilder {
    const builder = new RouteBuilder()
    builder.patternInit.pathname = pathname
    return builder
  }

  /**
   * 7.4.2.0.0.0.0: Add hostname constraint
   * [DoD][METHOD:Hostname][SCOPE:RouteConstraints]
   */
  hostname(host: string): RouteBuilder<T> {
    this.patternInit.hostname = host
    return this
  }

  /**
   * 7.4.3.0.0.0.0: Add protocol constraint
   * [DoD][METHOD:Protocol][SCOPE:RouteConstraints]
   */
  protocol(proto: "http:" | "https:"): RouteBuilder<T> {
    this.patternInit.protocol = proto
    return this
  }

  /**
   * 7.4.4.0.0.0.0: Set HTTP method to GET
   * [DoD][METHOD:Get][SCOPE:HTTPMethods]
   */
  get(): RouteBuilder<T> {
    this.method = "GET"
    return this
  }

  /**
   * 7.4.5.0.0.0.0: Set HTTP method to POST
   * [DoD][METHOD:Post][SCOPE:HTTPMethods]
   */
  post(): RouteBuilder<T> {
    this.method = "POST"
    return this
  }

  /**
   * 7.4.6.0.0.0.0: Set HTTP method to PUT
   * [DoD][METHOD:Put][SCOPE:HTTPMethods]
   */
  put(): RouteBuilder<T> {
    this.method = "PUT"
    return this
  }

  /**
   * 7.4.7.0.0.0.0: Set HTTP method to DELETE
   * [DoD][METHOD:Delete][SCOPE:HTTPMethods]
   */
  delete(): RouteBuilder<T> {
    this.method = "DELETE"
    return this
  }

  /**
   * 7.4.8.0.0.0.0: Set HTTP method to PATCH
   * [DoD][METHOD:Patch][SCOPE:HTTPMethods]
   */
  patch(): RouteBuilder<T> {
    this.method = "PATCH"
    return this
  }

  /**
   * 7.4.9.0.0.0.0: Add middleware function
   * [DoD][METHOD:Use][SCOPE:Middleware]
   *
   * @param middleware - Middleware function to execute before handler
   */
  use(middleware: Function): RouteBuilder<T> {
    this.middlewares.push(middleware)
    return this
  }

  /**
   * 7.4.10.0.0.0.0: Set route handler with typed groups
   * [DoD][METHOD:Handle][SCOPE:RouteHandler]
   *
   * @param handler - Route handler function with typed parameter groups
   * @returns RouteBuilder with updated type parameter
   */
  handle<U extends string>(
    handler: (
      req: Request,
      context: Context,
      groups: URLPatternGroups<U>
    ) => Promise<Response> | Response
  ): RouteBuilder<U> {
    this.handler = handler
    return this as RouteBuilder<U>
  }

  /**
   * 7.4.11.0.0.0.0: Add route summary for documentation
   * [DoD][METHOD:Summary][SCOPE:Documentation]
   */
  summary(text: string): RouteBuilder<T> {
    this.options.summary = text
    return this
  }

  /**
   * 7.4.12.0.0.0.0: Add tags for categorization
   * [DoD][METHOD:Tags][SCOPE:Documentation]
   */
  tags(tags: string[]): RouteBuilder<T> {
    this.options.tags = tags
    return this
  }

  /**
   * 7.4.13.0.0.0.0: Build final route pattern
   * [DoD][METHOD:Build][SCOPE:RouteConstruction]
   *
   * @returns Complete RoutePattern with type-safe handler
   * @throws Error if handler is not provided
   */
  build(): RoutePattern {
    if (!this.handler) {
      throw new Error("Route handler is required. Call .handle() before .build()")
    }

    if (!this.patternInit.pathname && !this.patternInit.hostname) {
      throw new Error("Route pattern must have pathname or hostname")
    }

    const route: RoutePattern = {
      pattern: new URLPattern(this.patternInit),
      method: this.method,
      middlewares: this.middlewares.length > 0 ? this.middlewares : undefined,
      handler: this.handler,
      ...this.options,
    }

    consoleEnhanced.debug("HBAPI-009", "Route built with RouteBuilder", {
      pattern: this.patternInit.pathname || this.patternInit.hostname,
      method: this.method || "ALL",
      middlewareCount: this.middlewares.length,
      hasSummary: !!this.options.summary,
      tags: this.options.tags,
    })

    return route
  }

  /**
   * 7.4.14.0.0.0.0: Validate route pattern
   * [DoD][METHOD:Validate][SCOPE:RouteValidation]
   *
   * @returns Validation result with any issues found
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.patternInit.pathname && !this.patternInit.hostname) {
      errors.push("Route pattern must have pathname or hostname")
    }

    if (!this.handler) {
      errors.push("Route handler is required")
    }

    // Check for common pattern issues
    if (this.patternInit.pathname) {
      // Check for malformed parameter syntax
      const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g
      const params = (this.patternInit.pathname.match(paramRegex) || []) as string[]
      const duplicates = params.filter((param, index) => params.indexOf(param) !== index)

      if (duplicates.length > 0) {
        errors.push(`Duplicate parameter names found: ${duplicates.join(", ")}`)
      }

      // Check for invalid characters in parameter names
      const invalidParams = params.filter((param) => !/^:[a-zA-Z_][a-zA-Z0-9_]*$/.test(param))
      if (invalidParams.length > 0) {
        errors.push(`Invalid parameter names: ${invalidParams.join(", ")}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

/**
 * Example usage of RouteBuilder for type-safe routes
 *
 * @example
 * ```typescript
 * const route = RouteBuilder.path('/api/v1/events/:eventId/periods/:period')
 *   .get()
 *   .handle(async (req, context, groups) => {
 *     // groups.eventId and groups.period are string (type-safe!)
 *     const { eventId, period } = groups;
 *     return Response.json({ eventId, period });
 *   })
 *   .summary('Get period data for event')
 *   .tags(['events', 'periods'])
 *   .build();
 * ```
 */
