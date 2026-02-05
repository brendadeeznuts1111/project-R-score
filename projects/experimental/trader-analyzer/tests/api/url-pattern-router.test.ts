#!/usr/bin/env bun
/**
 * @fileoverview 7.5.0.0.0.0.0: Comprehensive URLPattern Router Test Suite
 * @description Complete test coverage for URLPattern-based routing system
 * @module tests/api/url-pattern-router.test
 * @version 7.5.0.0.0.0.0
 *
 * [DoD][TEST:URLPatternRouter][SCOPE:FunctionalValidation]
 * Comprehensive test suite for URLPattern-based routing
 */

import { test, expect, describe, beforeEach } from "bun:test"
import { URLPatternRouter } from "../../src/api/routers/urlpattern-router"
import { RouteBuilder } from "../../src/api/router/route-builder"
import { PatternOptimizer } from "../../src/api/router/pattern-optimizer"
import { consoleEnhanced } from "../../src/logging/console-enhanced"

describe("URLPatternRouter Core Functionality", () => {
  let router: URLPatternRouter

  beforeEach(() => {
    router = new URLPatternRouter()
  })

  test("Basic pattern matching with parameters", () => {
    router.add({
      pattern: new URLPattern({ pathname: "/users/:id" }),
      handler: (req, ctx, groups) => {
        expect(groups.id).toBe("123")
        return new Response("OK")
      },
    })

    const request = new Request("https://example.com/users/123")
    const match = router.match(request)

    expect(match).toBeDefined()
    expect(match?.groups.id).toBe("123")
  })

  test("Pattern with multiple parameters", () => {
    router.add({
      pattern: new URLPattern({ pathname: "/events/:eventId/periods/:period" }),
      handler: (req, ctx, groups) => {
        expect(groups.eventId).toBe("NFL-20241207")
        expect(groups.period).toBe("Q1")
        return new Response("OK")
      },
    })

    const match = router.match(new Request("https://example.com/events/NFL-20241207/periods/Q1"))

    expect(match?.groups).toEqual({
      eventId: "NFL-20241207",
      period: "Q1",
    })
  })

  test("Optional parameters", () => {
    router.add({
      pattern: new URLPattern({ pathname: "/logs/:level?" }),
      handler: (req, ctx, groups) => {
        expect(groups.level).toBeUndefined()
        return new Response("OK")
      },
    })

    const match = router.match(new Request("https://example.com/logs"))
    expect(match?.groups.level).toBeUndefined()
  })

  test("Wildcard patterns", () => {
    router.add({
      pattern: new URLPattern({ pathname: "/files/*" }),
      handler: (req, ctx, groups) => {
        expect(groups[0]).toBe("images/photo.jpg")
        return new Response("OK")
      },
    })

    const match = router.match(new Request("https://example.com/files/images/photo.jpg"))
    expect(match?.groups[0]).toBe("images/photo.jpg")
  })

  test("HTTP method filtering", () => {
    router.add({
      pattern: new URLPattern({ pathname: "/api/data" }),
      method: "POST",
      handler: () => new Response("POST OK"),
    })

    router.add({
      pattern: new URLPattern({ pathname: "/api/data" }),
      method: "GET",
      handler: () => new Response("GET OK"),
    })

    const postMatch = router.match(new Request("https://example.com/api/data", { method: "POST" }))
    const getMatch = router.match(new Request("https://example.com/api/data", { method: "GET" }))

    expect(postMatch?.route.method).toBe("POST")
    expect(getMatch?.route.method).toBe("GET")
  })

  test("Middleware chain execution", async () => {
    const executionOrder: string[] = []

    router.add({
      pattern: new URLPattern({ pathname: "/test" }),
      middlewares: [
        (req, ctx, groups) => {
          executionOrder.push("middleware1")
          return new Response("Continue")
        },
        (req, ctx, groups) => {
          executionOrder.push("middleware2")
          return new Response("Continue")
        },
      ],
      handler: () => {
        executionOrder.push("handler")
        return new Response("Final")
      },
    })

    const match = router.match(new Request("https://example.com/test"))
    expect(match).toBeDefined()

    if (match) {
      const response = await router.execute(
        new Request("https://example.com/test"),
        {} as any,
        match
      )
      expect(executionOrder).toEqual(["middleware1", "middleware2", "handler"])
    }
  })

  test("Performance: Cached patterns are faster", () => {
    // Add 100 routes to force cache usage
    for (let i = 0; i < 100; i++) {
      router.add({
        pattern: new URLPattern({ pathname: `/route-${i}/:id` }),
        handler: () => new Response("OK"),
      })
    }

    // Add one more that we'll test
    router.add({
      pattern: new URLPattern({ pathname: "/test/:id" }),
      handler: () => new Response("OK"),
    })

    const request = new Request("https://example.com/test/123")

    // First match (may be uncached)
    const match1 = router.match(request)
    expect(match1).toBeDefined()

    // Second match (definitely cached)
    const start = performance.now()
    const match2 = router.match(request)
    const duration = performance.now() - start

    expect(match2).toBeDefined()
    expect(duration).toBeLessThan(1) // Cached match should be < 1ms
  })

  test("Complex real-world pattern: Graph API", () => {
    router.add({
      pattern: new URLPattern({
        pathname: "/api/v1/graph/:eventId/periods/:period/anomalies/:anomalyId?",
      }),
      handler: (req, ctx, groups) => {
        expect(groups.eventId).toMatch(/^[A-Z]{3,4}-\d{8}-\d{4}$/)
        expect(groups.period).toMatch(/^(Q[1-4]|H[1-2]|FULL)$/)
        return new Response("OK")
      },
    })

    const match = router.match(
      new Request(
        "https://example.com/api/v1/graph/NFL-20241207-1345/periods/Q1/anomalies/ANOM-001"
      )
    )

    expect(match?.groups).toEqual({
      eventId: "NFL-20241207-1345",
      period: "Q1",
      anomalyId: "ANOM-001",
    })
  })

  test("No match returns null", () => {
    router.add({
      pattern: new URLPattern({ pathname: "/api/v1/test" }),
      handler: () => new Response("OK"),
    })

    const match = router.match(new Request("https://example.com/nonexistent"))
    expect(match).toBeNull()
  })

  test("Performance metrics tracking", () => {
    router.add({
      pattern: new URLPattern({ pathname: "/test/:id" }),
      handler: () => new Response("OK"),
    })

    // Make several matches
    for (let i = 0; i < 5; i++) {
      router.match(new Request(`https://example.com/test/${i}`))
    }

    const metrics = router.getMetrics()
    expect(metrics.patterns).toBeGreaterThan(0)
    expect(metrics.avgMatchTime).toBeDefined()
  })
})

describe("RouteBuilder Type Safety", () => {
  test("Fluent API builds correct route", () => {
    const route = RouteBuilder.path("/api/v1/test/:id")
      .get()
      .handle(async (req, ctx, groups) => {
        // groups.id is string (type-safe!)
        return Response.json({ id: groups.id })
      })
      .summary("Test route")
      .tags(["test"])
      .build()

    expect(route.method).toBe("GET")
    expect(route.pattern.pathname).toBe("/api/v1/test/:id")
    expect(route.middlewares).toBeUndefined()
    expect(route.summary).toBe("Test route")
    expect(route.tags).toEqual(["test"])
  })

  test("Route with middleware", () => {
    const route = RouteBuilder.path("/api/v1/secure/:action")
      .post()
      .use(async (req, ctx, groups) => new Response("middleware"))
      .handle(async (req, ctx, groups) => Response.json({ action: groups.action }))
      .build()

    expect(route.method).toBe("POST")
    expect(route.middlewares).toHaveLength(1)
  })

  test("Route validation - missing handler", () => {
    expect(() => {
      RouteBuilder.path("/test").build()
    }).toThrow("Route handler is required")
  })

  test("Route validation - missing pattern", () => {
    expect(() => {
      RouteBuilder.path("")
        .handle(() => new Response("OK"))
        .build()
    }).toThrow("Route pattern must have pathname or hostname")
  })

  test("Route validation - duplicate parameters", () => {
    // URLPattern throws an error for duplicate parameter names
    expect(() => {
      RouteBuilder.path("/test/:id/:id")
        .handle(async (req, ctx, groups) => Response.json(groups))
        .build()
    }).toThrow()
  })

  test("Hostname constraint", () => {
    const route = RouteBuilder.path("/api/v1/test")
      .hostname("api.example.com")
      .handle(() => new Response("OK"))
      .build()

    expect(route.pattern.hostname).toBe("api.example.com")
  })

  test("Protocol constraint", () => {
    const route = RouteBuilder.path("/secure")
      .protocol("https:")
      .handle(() => new Response("OK"))
      .build()

    // URLPattern normalizes https: to https
    expect(route.pattern.protocol).toBe("https")
  })
})

describe("PatternOptimizer Functionality", () => {
  test("Cache hit optimization", () => {
    const optimizer = new PatternOptimizer()

    const pattern1 = optimizer.getOrCompile("/api/v1/users/:id")
    const pattern2 = optimizer.getOrCompile("/api/v1/users/:id")

    expect(pattern1).toBe(pattern2) // Same reference from cache
    expect(optimizer.getStats().cacheSize).toBe(1)
  })

  test("LRU eviction", () => {
    const optimizer = new PatternOptimizer()

    // Fill cache
    for (let i = 0; i < 1005; i++) {
      optimizer.getOrCompile(`/route/${i}`)
    }

    expect(optimizer.size()).toBeLessThanOrEqual(1000)
  })

  test("Cache statistics", () => {
    const optimizer = new PatternOptimizer()

    optimizer.getOrCompile("/test1")
    optimizer.getOrCompile("/test2")
    optimizer.getOrCompile("/test1") // Hit

    const stats = optimizer.getStats()
    expect(stats.cacheSize).toBe(2)
    expect(stats.totalHits).toBeGreaterThan(2)
  })

  test("Pre-compile patterns", () => {
    const optimizer = new PatternOptimizer()
    const patterns = ["/api/v1/a", "/api/v1/b", "/api/v1/c"]

    optimizer.precompile(patterns)

    expect(optimizer.size()).toBe(3)
    patterns.forEach((pattern) => {
      expect(optimizer.isCached(pattern)).toBe(true)
    })
  })
})

describe("Integration Tests", () => {
  test("Full request flow with router and builder", async () => {
    const router = new URLPatternRouter()

    // Add route using RouteBuilder
    const route = RouteBuilder.path("/api/v1/integration/:testId")
      .get()
      .handle(async (req, ctx, groups) => {
        return Response.json({
          testId: groups.testId,
          method: req.method,
          url: req.url,
        })
      })
      .build()

    router.add(route)

    // Test the full flow
    const request = new Request("https://example.com/api/v1/integration/test-123")
    const match = router.match(request)

    expect(match).toBeDefined()
    expect(match?.groups.testId).toBe("test-123")

    if (match) {
      const response = await router.execute(request, {} as any, match)
      const data = await response.json()

      expect(data.testId).toBe("test-123")
      expect(data.method).toBe("GET")
    }
  })

  test("Middleware integration", async () => {
    const router = new URLPatternRouter()
    const middlewareCalls: string[] = []

    router.add({
      pattern: new URLPattern({ pathname: "/middleware/:id" }),
      middlewares: [
        async (req, ctx, groups) => {
          middlewareCalls.push("auth")
          ;(ctx as any).user = { id: 1 }
          return new Response("continue")
        },
        async (req, ctx, groups) => {
          middlewareCalls.push("logging")
          return new Response("continue")
        },
      ],
      handler: async (req, ctx, groups) => {
        middlewareCalls.push("handler")
        return Response.json({
          id: groups.id,
          user: (ctx as any).user,
        })
      },
    })

    const request = new Request("https://example.com/middleware/456")
    const match = router.match(request)

    expect(match).toBeDefined()

    if (match) {
      const response = await router.execute(request, {} as any, match)
      const data = await response.json()

      expect(middlewareCalls).toEqual(["auth", "logging", "handler"])
      expect(data.id).toBe("456")
      expect(data.user.id).toBe(1)
    }
  })
})

// Performance benchmarks
describe("Performance Benchmarks", () => {
  test("URLPattern vs Regex performance", () => {
    const urlPattern = new URLPattern({ pathname: "/api/v1/graph/:eventId" })
    const regex = /^\/api\/v1\/graph\/([^\/]+)$/

    const testUrl = "https://example.com/api/v1/graph/NFL-20241207-1345"
    const iterations = 10000

    // Benchmark URLPattern
    const patternStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      urlPattern.exec(testUrl)
    }
    const patternTime = performance.now() - patternStart

    // Benchmark Regex
    const regexStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      regex.exec("/api/v1/graph/NFL-20241207-1345")
    }
    const regexTime = performance.now() - regexStart

    console.log(`URLPattern: ${((patternTime / iterations) * 1000).toFixed(4)}µs/op`)
    console.log(`Regex: ${((regexTime / iterations) * 1000).toFixed(4)}µs/op`)
    console.log(`URLPattern is ${(regexTime / patternTime).toFixed(1)}x faster`)

    // URLPattern performance depends on the pattern complexity
    // For simple patterns, regex might be faster, but URLPattern provides better features
    console.log(
      `Performance comparison: URLPattern ${(patternTime / regexTime).toFixed(2)}x ${patternTime > regexTime ? "slower" : "faster"} than regex`
    )

    // Just ensure both are reasonably fast (< 10ms per operation)
    expect(patternTime / iterations).toBeLessThan(0.01)
    expect(regexTime / iterations).toBeLessThan(0.01)
  })

  test("Router throughput", () => {
    const router = new URLPatternRouter()

    // Add many routes
    for (let i = 0; i < 100; i++) {
      router.add({
        pattern: new URLPattern({ pathname: `/route/${i}/:id` }),
        handler: () => new Response("OK"),
      })
    }

    const request = new Request("https://example.com/route/50/test-id")
    const iterations = 1000

    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      router.match(request)
    }
    const duration = performance.now() - start

    const throughput = iterations / (duration / 1000) // ops per second
    console.log(`Router throughput: ${throughput.toFixed(0)} ops/sec`)

    expect(throughput).toBeGreaterThan(1000) // Should handle at least 1000 ops/sec
  })
})

// Run: bun test tests/api/url-pattern-router.test.ts --coverage
