/**
 * Memory Performance Tests
 * Validates heap pressure and memory usage (-14% target)
 */

import { describe, test, beforeAll, measureMemory, gcTick } from "harness";
import { LatticeRouter } from "../../packages/core/src/core/lattice";
import { RegistryLoader } from "../../packages/core/src/parsers/toml-ingressor";

describe('Memory Performance', () => {
  let router: LatticeRouter;

  beforeAll(async () => {
    const config = await RegistryLoader.YAML.parse('./registry.toml');
    router = new LatticeRouter(config);
    await router.initialize();
  });

  test('route matching should not leak memory', async () => {
    // Run GC before test
    await gcTick(10);

    const initialMemory = process.memoryUsage().heapUsed;

    // Perform many route matches
    for (let i = 0; i < 10000; i++) {
      router.match('/mcp/registry/@test/package', 'GET');
      router.match('/mcp/health', 'GET');
      router.match('/invalid/route', 'GET');
    }

    // Run GC after test
    await gcTick(10);

    const finalMemory = process.memoryUsage().heapUsed;
    const leak = finalMemory - initialMemory;

    // Should have minimal memory growth (< 1MB for 10k operations)
    if (leak > 1_000_000) {
      throw new Error(`Potential memory leak: ${(leak / 1_000_000).toFixed(2)}MB growth`);
    }
  });

  test('URLPattern instances should be reused', async () => {
    // Router should pre-compile patterns, not create new ones
    const routes = router.getRoutes();
    const pattern1 = routes[0]?.pattern;

    // Get routes again
    const routes2 = router.getRoutes();
    const pattern2 = routes2[0]?.pattern;

    // Should be the same instance (object identity)
    if (pattern1 !== pattern2) {
      throw new Error('URLPattern instances are being recreated');
    }
  });

  test('server map should be efficient', async () => {
    const memory = await measureMemory(
      () => {
        for (let i = 0; i < 1000; i++) {
          router.getServer('core-runtime');
        }
      },
      100
    );

    // Server lookups should not allocate significant memory
    // Allow up to 100KB for 100k lookups
    if (memory.heapUsed > 100_000) {
      throw new Error(`Excessive memory allocation: ${(memory.heapUsed / 1000).toFixed(2)}KB`);
    }
  });

  test('match result objects should be minimal', async () => {
    await gcTick(10);
    const before = process.memoryUsage().heapUsed;

    // Create 1000 match results
    const matches = [];
    for (let i = 0; i < 1000; i++) {
      const match = router.match('/mcp/registry/@test/pkg', 'GET');
      if (match) matches.push(match);
    }

    await gcTick(10);
    const after = process.memoryUsage().heapUsed;

    const perMatch = (after - before) / matches.length;

    // Each match result should be < 1KB
    if (perMatch > 1000) {
      throw new Error(`Match objects too large: ${perMatch.toFixed(2)} bytes each`);
    }
  });
});
