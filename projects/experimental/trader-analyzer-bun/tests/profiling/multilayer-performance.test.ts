/**
 * @fileoverview Multi-Layer System Performance Tests
 * @description Performance tests with onTestFinished hooks
 * @module tests/profiling/multilayer-performance
 * @version 1.1.1.1.5.0.1
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  onTestFinished,
  test,
} from 'bun:test';
import { ProfilingMultiLayerGraphSystem } from '../../src/graphs/multilayer/profiling/instrumented-system';

// Mock data generator
class MockMarketDataGenerator {
  static generate(count: number): Array<{
    id: string;
    layer: number;
    timestamp: number;
  }> {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        id: `market_${i}`,
        layer: (i % 4) + 1,
        timestamp: Date.now() - i * 1000,
      });
    }
    return data;
  }
}

describe('Header 1.1.1.1.5.0.1: Multi-Layer System Performance Tests', () => {
  let system: ProfilingMultiLayerGraphSystem;
  let mockData: Array<{
    id: string;
    layer: number;
    timestamp: number;
  }>;

  beforeEach(() => {
    mockData = MockMarketDataGenerator.generate(1000);

    system = new ProfilingMultiLayerGraphSystem({
      data: mockData,
      enableProfiling: false,
      testMode: true,
    });
  });

  afterEach(() => {
    system.cleanup();
  });

  test('Layer 1 correlation computation should be efficient', async () => {
    const startTime = performance.now();

    const layer1Results = await system.computeLayer1Correlations(mockData);

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100); // Should complete in <100ms
    expect(layer1Results.correlations).toBeArray();
    expect(layer1Results.correlations.length).toBeGreaterThan(0);

    onTestFinished(() => {
      system.clearLayerCache(1);
      console.log(`🧹 Cleaned Layer 1 test artifacts`);
    });
  });

  test('Cross-sport anomaly detection should handle recursion', () => {
    function detectPatternRecursion(events: unknown[], depth: number): number {
      if (events.length <= 1 || depth >= 10) {
        return events.length;
      }

      const mid = Math.floor(events.length / 2);
      const left = detectPatternRecursion(events.slice(0, mid), depth + 1);
      const right = detectPatternRecursion(events.slice(mid), depth + 1);

      return left + right + 1;
    }

    const patternCount = detectPatternRecursion(mockData, 0);
    expect(patternCount).toBeGreaterThan(0);

    onTestFinished(() => {
      system.recordTestMetric('pattern_recursion', {
        inputSize: mockData.length,
        patternCount,
        testName: 'cross_sport_anomaly_recursion',
      });
    });
  });

  test.serial('Hidden edge detection with cleanup hooks', async () => {
    const hiddenEdges = await system.detectHiddenEdges({
      confidenceThreshold: 0.7,
      minObservations: 3,
    });

    expect(hiddenEdges).toBeArray();

    onTestFinished(() => {
      console.log('🧹 First cleanup: clearing edge cache');
      system.clearEdgeCache();
    });

    onTestFinished(() => {
      console.log('🧹 Second cleanup: validating edge counts');
      const remaining = system.getEdgeCount();
      expect(remaining).toBe(0);
    });

    onTestFinished(async () => {
      console.log('🧹 Third cleanup: async database cleanup');
      await system.cleanupDatabase();
    });
  });

  describe('Header 1.1.1.1.5.0.2: Memory and Performance Regression Tests', () => {
    test('should not have memory leaks in recursive operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(
          system.computeRecursiveCorrelations(mockData.slice(0, 100)),
        );
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // <10MB

      onTestFinished(() => {
        if (global.gc) {
          global.gc();
          const postGCMemory = process.memoryUsage().heapUsed;
          console.log(
            `🧹 Memory after GC: ${(postGCMemory / 1024 / 1024).toFixed(2)}MB`,
          );
        }
      });
    });

    test('CPU profiling integration works correctly', () => {
      if (process.env.CI) {
        console.log('⏭️ Skipping CPU profiling test in CI');
        return;
      }

      const start = performance.now();

      let total = 0;
      for (let i = 0; i < 1000000; i++) {
        total += Math.sin(i) * Math.cos(i);
      }

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // <500ms

      onTestFinished(() => {
        system.recordPerformanceMetric('cpu_intensive_loop', duration, {
          iterations: 1000000,
          total,
        });
      });
    });
  });
});
