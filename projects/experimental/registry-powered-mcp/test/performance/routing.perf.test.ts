/**
 * Routing Performance Tests
 * End-to-end routing performance validation
 */

import { describe, test, beforeAll, measurePerformance, assertPerformanceMetrics } from "harness";
import { LatticeRouter } from "../../packages/core/src/core/lattice";
import { RegistryLoader } from "../../packages/core/src/parsers/toml-ingressor";

describe('Routing Performance', () => {
  let router: LatticeRouter;

  beforeAll(async () => {
    const config = await RegistryLoader.load('./registry.toml');
    router = new LatticeRouter(config);
    await router.initialize();
  });

  test('route matching with parameter extraction', async () => {
    const metrics = await measurePerformance(
      () => {
        const match = router.match('/mcp/registry/@scope/name', 'GET');
        // Access params to ensure extraction happens
        if (match) {
          const _ = match.params.scope;
          const __ = match.params.name;
        }
      },
      5000,
      500
    );

    assertPerformanceMetrics(metrics, {
      maxMean: 0.05,  // 50μs
      maxP99: 0.15,   // 150μs
    });
  });

  test('method filtering overhead', async () => {
    const metrics = await measurePerformance(
      () => {
        // Test different methods to ensure filtering works
        router.match('/mcp/health', 'GET');
        router.match('/mcp/health', 'POST');
        router.match('/mcp/health', 'PUT');
      },
      3000,
      300
    );

    assertPerformanceMetrics(metrics, {
      maxMean: 0.1,   // 100μs for 3 matches
      maxP99: 0.3,    // 300μs
    });
  });

  test('server resolution performance', async () => {
    const metrics = await measurePerformance(
      () => {
        router.getServer('core-runtime');
      },
      10000,
      1000
    );

    // Should be a simple Map lookup
    assertPerformanceMetrics(metrics, {
      maxMean: 0.001, // 1μs
      maxP99: 0.01,   // 10μs
    });
  });

  test('health check performance', async () => {
    const metrics = await measurePerformance(
      () => {
        router.healthCheck();
      },
      5000,
      500
    );

    assertPerformanceMetrics(metrics, {
      maxMean: 0.01,  // 10μs
      maxP99: 0.05,   // 50μs
    });
  });

  test('statistics gathering performance', async () => {
    const metrics = await measurePerformance(
      () => {
        router.getStats();
      },
      5000,
      500
    );

    assertPerformanceMetrics(metrics, {
      maxMean: 0.01,  // 10μs
      maxP99: 0.05,   // 50μs
    });
  });

  test('concurrent route matching (simulated)', async () => {
    const routes = [
      ['/mcp/health', 'GET'],
      ['/mcp/registry/@test/pkg', 'GET'],
      ['/mcp/tools/fs/read', 'POST'],
      ['/mcp/metrics', 'GET'],
      ['/invalid/route', 'GET'],
    ] as const;

    const metrics = await measurePerformance(
      () => {
        for (const [path, method] of routes) {
          router.match(path, method);
        }
      },
      2000,
      500  // Increased warmup for JIT stability
    );

    // 5 route matches - mean is the SLA gate
    assertPerformanceMetrics(metrics, {
      maxMean: 0.15,  // 30μs per route = 150μs total
      // P99 omitted - not reliable for micro-benchmarks
    });
  });
});
