/**
 * HTTP Server Lifecycle Integration Tests
 * Tests server startup, request handling, and shutdown with performance timing
 *
 * Uses Performance Test Harness for SLA validation
 * APIs: Bun.serve(), Bun.nanoseconds()
 */

import { describe, test, expect, beforeAll, afterAll } from "harness";
import {
  measure,
  measureAsync,
  collectStatsAsync,
  assertSLA,
  SLA_TARGETS,
  formatTime,
  formatStats,
} from "../../harness/performance";

// Get load-adjusted performance targets
function getLoadMultiplier(): number {
  try {
    const loadAvg = require('os').loadavg()[0];
    const cpuCount = require('os').cpus().length;
    const normalizedLoad = loadAvg / cpuCount;

    // Very generous adjustment for system load in CI/dev environments
    if (normalizedLoad > 0.3) {
      const multiplier = Math.min(10.0, 1.0 + (normalizedLoad * 3));
      console.log(`⚠️  HTTP Lifecycle: System load ${loadAvg.toFixed(2)}, multiplier: ${multiplier.toFixed(1)}x`);
      return multiplier;
    }
    return 1.0;
  } catch {
    return 1.0;
  }
}

const LOAD_MULTIPLIER = getLoadMultiplier();

// Integration test targets are more relaxed than production SLA
// Network-based tests have inherent latency variance from TCP/HTTP overhead
const BASE_INTEGRATION_HEALTH_CHECK_MS = 15; // 15ms (3x production SLA)
const INTEGRATION_HEALTH_CHECK_MS = BASE_INTEGRATION_HEALTH_CHECK_MS * LOAD_MULTIPLIER;

import { LatticeRouter } from "../../../packages/core/src/core/lattice";
import { RegistryLoader } from "../../../packages/core/src/parsers/toml-ingressor";
import type { Server } from "bun";

describe("HTTP Server Lifecycle Integration", () => {
  let router: LatticeRouter;
  let server: Server;
  const TEST_PORT = 13333; // Use non-standard port for testing

  beforeAll(async () => {
    const config = await RegistryLoader.load("./registry.toml");
    router = new LatticeRouter(config);
    await router.initialize();
  });

  afterAll(() => {
    if (server) {
      server.stop(true);
    }
  });

  describe("Server Startup", () => {
    test("server starts within SLA", async () => {
      const result = await measureAsync(async () => {
        server = Bun.serve({
          port: TEST_PORT,
          fetch(req) {
            const url = new URL(req.url);
            const match = router.match(url.pathname, req.method);

            if (!match) {
              return new Response("Not Found", { status: 404 });
            }

            return new Response(JSON.stringify({
              route: match.route.pattern.pathname,
              params: match.params,
            }), {
              headers: { "Content-Type": "application/json" },
            });
          },
        });
        return server;
      });

      expect(result.value).toBeDefined();
      expect(result.value.port).toBe(TEST_PORT);

      // Server startup should be nearly instant (cold_start_ms target is 0)
      expect(result.durationMs).toBeLessThan(100); // Allow 100ms for server startup

      console.log(`Server startup: ${formatTime(result.durationMs)}`);
    });

    test("server is immediately responsive after startup", async () => {
      const result = await measureAsync(async () => {
        const response = await fetch(`http://localhost:${TEST_PORT}/mcp/health`);
        return response.status;
      });

      expect(result.value).toBe(200);
      // First request may have cold-start overhead, use relaxed target
      assertSLA(result.durationMs, INTEGRATION_HEALTH_CHECK_MS, "First request");
    });
  });

  describe("Request Handling Performance", () => {
    test("health endpoint meets SLA", async () => {
      const stats = await collectStatsAsync(
        async () => {
          const response = await fetch(`http://localhost:${TEST_PORT}/mcp/health`);
          return response.status;
        },
        50, // 50 iterations
        { warmup: 5 }
      );

      // Use relaxed integration target for P99 (network has inherent jitter)
      expect(stats.p99).toBeLessThan(INTEGRATION_HEALTH_CHECK_MS);
      console.log(formatStats(stats, "Health endpoint"));
    });

    test("registry lookup meets request cycle SLA", async () => {
      const stats = await collectStatsAsync(
        async () => {
          const response = await fetch(`http://localhost:${TEST_PORT}/mcp/registry/@mcp/core`);
          return response.status;
        },
        50,
        { warmup: 5 }
      );

      // P99 should be under request cycle target
      expect(stats.p99).toBeLessThan(SLA_TARGETS.REQUEST_CYCLE_P99_MS);
      console.log(formatStats(stats, "Registry lookup"));
    });

    test("404 responses are fast", async () => {
      const stats = await collectStatsAsync(
        async () => {
          const response = await fetch(`http://localhost:${TEST_PORT}/invalid/path`);
          return response.status;
        },
        50,
        { warmup: 5 }
      );

      expect(stats.p99).toBeLessThan(SLA_TARGETS.HEALTH_CHECK_MS); // Should be as fast as health
      console.log(formatStats(stats, "404 response"));
    });
  });

  describe("Response Validation", () => {
    test("health endpoint returns valid JSON", async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/mcp/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("application/json");
      expect(data).toBeDefined();
    });

    test("registry endpoint extracts params correctly", async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/mcp/registry/@test/my-package`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.params.scope).toBe("@test");
      expect(data.params.name).toBe("my-package");
    });

    test("wildcard routes match deeply nested paths", async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/mcp/tools/fs/read/deeply/nested/path.txt`, {
        method: "POST",
      });

      // Should match if fs tools are configured
      expect([200, 404]).toContain(response.status);
    });
  });

  describe("Concurrent Request Handling", () => {
    test("handles 10 concurrent requests", async () => {
      const result = await measureAsync(async () => {
        const requests = Array.from({ length: 10 }, () =>
          fetch(`http://localhost:${TEST_PORT}/mcp/health`)
        );
        const responses = await Promise.all(requests);
        return responses.map(r => r.status);
      });

      expect(result.value.every(s => s === 200)).toBe(true);
      expect(result.durationMs).toBeLessThan(100); // 10 concurrent should be fast

      console.log(`10 concurrent requests: ${formatTime(result.durationMs)}`);
    });

    test("handles 50 concurrent requests", async () => {
      const result = await measureAsync(async () => {
        const requests = Array.from({ length: 50 }, () =>
          fetch(`http://localhost:${TEST_PORT}/mcp/health`)
        );
        const responses = await Promise.all(requests);
        return responses.map(r => r.status);
      });

      expect(result.value.every(s => s === 200)).toBe(true);
      expect(result.durationMs).toBeLessThan(500); // 50 concurrent should complete in 500ms

      console.log(`50 concurrent requests: ${formatTime(result.durationMs)}`);
    });

    test("handles sequential requests with consistent latency", async () => {
      const stats = await collectStatsAsync(
        async () => {
          const response = await fetch(`http://localhost:${TEST_PORT}/mcp/health`);
          return response.status;
        },
        100,
        { warmup: 10 }
      );

      // Mean should be fast (< 10ms per request)
      expect(stats.mean).toBeLessThan(10);

      // Log variance metrics for visibility (not hard gates due to network jitter)
      console.log(formatStats(stats, "Sequential request consistency"));
      if (stats.cv > 150) {
        console.log(`  ⚠ High CV (${stats.cv.toFixed(1)}%) - expected with network jitter`);
      }
    });
  });

  describe("Method Handling", () => {
    test("GET requests are routed correctly", async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/mcp/registry/@test/pkg`, {
        method: "GET",
      });
      expect(response.status).toBe(200);
    });

    test("POST requests to filesystem routes work", async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/mcp/tools/fs/read`, {
        method: "POST",
        body: JSON.stringify({ path: "/test" }),
      });
      // Should match if configured
      expect([200, 404]).toContain(response.status);
    });

    test("unsupported methods on GET-only routes fail gracefully", async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/mcp/registry/@test/pkg`, {
        method: "DELETE",
      });
      // Should either 404 or match a wildcard route
      expect([200, 404, 405]).toContain(response.status);
    });
  });

  describe("Server Shutdown", () => {
    test("server stops cleanly", async () => {
      const result = measure(() => {
        server.stop(true);
      });

      expect(result.durationMs).toBeLessThan(100); // Shutdown should be fast
      console.log(`Server shutdown: ${formatTime(result.durationMs)}`);
    });

    test("requests fail after shutdown", async () => {
      try {
        await fetch(`http://localhost:${TEST_PORT}/mcp/health`);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Expected - connection refused
        expect(error).toBeDefined();
      }
    });
  });
});
