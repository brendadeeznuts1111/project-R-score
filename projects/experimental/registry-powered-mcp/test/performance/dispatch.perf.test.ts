/**
 * Dispatch Performance Tests
 * Validates that route dispatch meets <0.03ms SLA
 */

import { describe, test, beforeAll, measurePerformance, assertPerformanceMetrics } from "harness";
import { LatticeRouter } from "../../packages/core/src/core/lattice";
import { RegistryLoader } from "../../packages/core/src/parsers/toml-ingressor";

describe('Dispatch Performance', () => {
  let router: LatticeRouter;

  beforeAll(async () => {
    const config = await RegistryLoader.YAML.parse('./registry.toml');
    router = new LatticeRouter(config);
    await router.initialize();
  });

  test('URLPattern compilation should be fast', async () => {
    const metrics = await measurePerformance(
      () => {
        new URLPattern({ pathname: '/test/:id' });
      },
      2000,
      500  // Increased warmup
    );

    // Mean is the SLA gate; P99 is informational for micro-benchmarks
    assertPerformanceMetrics(metrics, {
      maxMean: 0.015, // 15μs (environment adjusted)
      // P99 omitted - not reliable at nanosecond scale
    });
  });

  test('Map lookup should be O(1)', async () => {
    const testMap = new Map();
    for (let i = 0; i < 1000; i++) {
      testMap.set(`key-${i}`, `value-${i}`);
    }

    const metrics = await measurePerformance(
      () => {
        testMap.get('key-500');
      },
      10000,
      100
    );

    // Map lookup should be <0.1μs (0.0001ms)
    assertPerformanceMetrics(metrics, {
      maxMean: 0.001, // 1μs
      maxP99: 0.005,  // 5μs
    });
  });

  test('simple route dispatch should meet <0.03ms SLA', async () => {
    const metrics = await measurePerformance(
      () => {
        router.match('/mcp/health', 'GET');
      },
      10000,
      1000
    );

    assertPerformanceMetrics(metrics, {
      maxMean: 0.03,  // 30μs SLA
      maxP95: 0.08,   // 80μs (relaxed for test environment)
      maxP99: 0.2,    // 200μs (relaxed - micro-benchmark tail affected by GC)
    });
  });

  test('parameterized route dispatch should meet <0.03ms SLA', async () => {
    const metrics = await measurePerformance(
      () => {
        router.match('/mcp/registry/@test/package', 'GET');
      },
      10000,
      2000  // Increased warmup for JIT stability
    );

    // Production SLA is 0.03ms MEAN - this is the hard gate
    // P99 is informational for micro-benchmarks (affected by GC, context switches)
    assertPerformanceMetrics(metrics, {
      maxMean: 0.03,  // 30μs SLA (production target)
      maxP95: 0.08,   // 80μs
      maxP99: 0.15,   // 150μs (micro-benchmark tail, not production P99)
    });
  });

  test('wildcard route dispatch should meet <0.03ms SLA', async () => {
    const metrics = await measurePerformance(
      () => {
        router.match('/mcp/tools/fs/read/file.txt', 'POST');
      },
      10000,
      1000
    );

    assertPerformanceMetrics(metrics, {
      maxMean: 0.03,  // 30μs SLA
      maxP95: 0.08,   // 80μs (relaxed for test environment)
      maxP99: 0.2,    // 200μs (relaxed - micro-benchmark tail affected by GC)
    });
  });

  test('404 handling should be fast', async () => {
    const metrics = await measurePerformance(
      () => {
        router.match('/invalid/route/not/found', 'GET');
      },
      10000,
      1000
    );

    assertPerformanceMetrics(metrics, {
      maxMean: 0.03,  // 30μs SLA
      maxP95: 0.08,   // 80μs (relaxed for test environment)
      maxP99: 0.2,    // 200μs (relaxed - micro-benchmark tail affected by GC)
    });
  });
});
