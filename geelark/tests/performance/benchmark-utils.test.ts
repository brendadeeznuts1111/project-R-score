#!/usr/bin/env bun

/**
 * Benchmarking Utilities Tests
 * Comprehensive tests for performance tracking and memory analysis
 *
 * Run with: bun test tests/performance/benchmark-utils.test.ts
 */

// @ts-ignore - Bun types are available at runtime
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { BenchmarkHistory, MemoryAnalyzer, PerformanceDashboard, PerformanceTracker, measureWithGC } from "../../src/core/benchmark.js";
// @ts-ignore - heapStats is available at runtime via bun:jsc
const heapStats = globalThis.heapStats || (() => {
  // Fallback if heapStats is not available
  return { heapSize: 0, heapCapacity: 0, objectCount: 0 };
});

describe("🔬 Performance Tracking Utilities", () => {

  beforeEach(() => {
    // Clean environment before each test
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);
  });

  afterEach(() => {
    // Clean environment after each test
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);
  });

  describe("PerformanceTracker", () => {

    it("should measure synchronous function execution time", () => {
      const result = PerformanceTracker.measure(() => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += Math.sqrt(i);
        }
        return sum;
      }, "test computation");

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
    });

    it("should return the correct function result", () => {
      const expected = { value: 42, name: "test" };
      const result = PerformanceTracker.measure(() => expected, "object return");

      expect(result).toBe(expected);
      expect(result.value).toBe(42);
      expect(result.name).toBe("test");
    });

    it("should measure async function execution time", async () => {
      const result = await PerformanceTracker.measureAsync(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return "async result";
      }, "async test");

      expect(result).toBe("async result");
    });

    it("should handle async functions that throw", async () => {
      let errorCaught = false;

      try {
        await PerformanceTracker.measureAsync(async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          throw new Error("Test error");
        }, "error test");
      } catch (error) {
        errorCaught = true;
        expect(error.message).toBe("Test error");
      }

      expect(errorCaught).toBe(true);
    });

    it("should measure with nanosecond precision", () => {
      const result = PerformanceTracker.measureNanoseconds(() => {
        // Very fast operation
        return Math.random();
      }, "nanosecond test");

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });
  });

  describe("MemoryAnalyzer", () => {

    it("should capture heap snapshot", () => {
      const stats = MemoryAnalyzer.snapshot("test snapshot");

      expect(stats).toBeDefined();
      expect(typeof stats.heapSize).toBe("number");
      expect(typeof stats.heapCapacity).toBe("number");
      expect(typeof stats.objectCount).toBe("number");
      expect(stats.heapSize).toBeGreaterThan(0);
      expect(stats.heapCapacity).toBeGreaterThanOrEqual(stats.heapSize);
      expect(stats.objectCount).toBeGreaterThan(0);
    });

    it("should compare memory snapshots correctly", () => {
      const before = MemoryAnalyzer.snapshot("before");

      // Allocate more significant memory to ensure measurable difference
      const arrays = Array.from({ length: 1000 }, () =>
        Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          data: "x".repeat(100),
          timestamp: Date.now()
        }))
      );

      const after = MemoryAnalyzer.snapshot("after");

      // Memory should have increased significantly
      expect(after.heapSize).toBeGreaterThan(before.heapSize);
      expect(after.objectCount).toBeGreaterThan(before.objectCount);

      // Clean up
      arrays.length = 0;
    });

    it("should analyze memory growth", () => {
      let memoryAllocated = false;

      MemoryAnalyzer.analyzeGrowth("test growth", () => {
        // Allocate memory
        const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: i, data: "x".repeat(100) }));
        memoryAllocated = largeArray.length > 0;
      });

      expect(memoryAllocated).toBe(true);
    });
  });

  describe("measureWithGC", () => {

    it("should measure function with garbage collection", () => {
      const result = measureWithGC(() => {
        // Create temporary objects
        const temp = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: i * 2 }));
        return temp.length;
      }, "GC test");

      expect(result).toBe(1000);
    });

    it("should handle functions that return different types", () => {
      const stringResult = measureWithGC(() => "test string", "string test");
      const numberResult = measureWithGC(() => 42, "number test");
      const objectResult = measureWithGC(() => ({ a: 1, b: 2 }), "object test");

      expect(stringResult).toBe("test string");
      expect(numberResult).toBe(42);
      expect(objectResult).toEqual({ a: 1, b: 2 });
    });
  });

  describe("BenchmarkHistory", () => {

    it("should track benchmark history", () => {
      const history = new BenchmarkHistory();

      const result1 = history.track("test1", () => 42);
      const result2 = history.track("test2", () => "hello");
      const result3 = history.track("test1", () => 100);

      expect(result1).toBe(42);
      expect(result2).toBe("hello");
      expect(result3).toBe(100);

      const trends = history.getTrends();
      expect(trends).toHaveLength(3);
      expect(trends[0].metrics.label).toBe("test1");
      expect(trends[1].metrics.label).toBe("test2");
      expect(trends[2].metrics.label).toBe("test1");
    });

    it("should calculate average time for labels", () => {
      const history = new BenchmarkHistory();

      history.track("fast", () => {});
      history.track("fast", () => {});
      history.track("slow", () => {
        // Simulate slower operation
        for (let i = 0; i < 10000; i++) Math.sqrt(i);
      });

      const fastAvg = history.getAverageTime("fast");
      const slowAvg = history.getAverageTime("slow");

      expect(fastAvg).toBeGreaterThan(0);
      expect(slowAvg).toBeGreaterThan(0);
      expect(slowAvg).toBeGreaterThan(fastAvg);
    });

    it("should limit history to 100 entries", () => {
      const history = new BenchmarkHistory();

      // Add more than 100 entries
      for (let i = 0; i < 150; i++) {
        history.track(`test${i}`, () => i);
      }

      const trends = history.getTrends();
      expect(trends).toHaveLength(100);

      // Should keep the most recent entries
      expect(trends[0].metrics.label).toBe("test50");
      expect(trends[99].metrics.label).toBe("test149");
    });
  });

  describe("PerformanceDashboard", () => {

    it("should record and report metrics", () => {
      const dashboard = new PerformanceDashboard();

      dashboard.record("response_time", 100);
      dashboard.record("response_time", 150);
      dashboard.record("response_time", 120);
      dashboard.record("memory_usage", 1024);
      dashboard.record("memory_usage", 2048);

      const report = dashboard.getReport();

      expect(report.response_time).toBeDefined();
      expect(report.memory_usage).toBeDefined();

      expect(report.response_time.avg).toBe(123.33333333333333); // (100+150+120)/3
      expect(report.response_time.min).toBe(100);
      expect(report.response_time.max).toBe(150);
      expect(report.response_time.samples).toBe(3);

      expect(report.memory_usage.avg).toBe(1536); // (1024+2048)/2
      expect(report.memory_usage.min).toBe(1024);
      expect(report.memory_usage.max).toBe(2048);
      expect(report.memory_usage.samples).toBe(2);
    });

    it("should handle rolling window of metrics", () => {
      const dashboard = new PerformanceDashboard();

      // Add 1005 entries (should keep only last 1000)
      for (let i = 0; i < 1005; i++) {
        dashboard.record("test_metric", i);
      }

      const report = dashboard.getReport();

      expect(report.test_metric.samples).toBe(1000);
      expect(report.test_metric.min).toBe(5); // First kept entry
      expect(report.test_metric.max).toBe(1004); // Last entry
    });

    it("should handle empty metrics gracefully", () => {
      const dashboard = new PerformanceDashboard();
      const report = dashboard.getReport();

      expect(report).toEqual({});
    });
  });

  describe("Integration Tests", () => {

    it("should work together for comprehensive analysis", async () => {
      const dashboard = new PerformanceDashboard();
      const history = new BenchmarkHistory();

      // Simulate a real performance analysis scenario
      const analysisResult = history.track("code_analysis", () => {
        const start = performance.now();

        // Simulate code analysis work
        const result = measureWithGC(() => {
          const files = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            content: "x".repeat(1000),
            complexity: Math.random()
          }));

          return files.reduce((sum, file) => sum + file.complexity, 0);
        }, "file processing");

        const duration = performance.now() - start;
        dashboard.record("analysis_time", duration);
        dashboard.record("files_processed", 100);

        return result;
      });

      expect(analysisResult).toBeGreaterThan(0);

      const trends = history.getTrends();
      expect(trends).toHaveLength(1);
      expect(trends[0].metrics.label).toBe("code_analysis");

      const report = dashboard.getReport();
      expect(report.analysis_time).toBeDefined();
      expect(report.files_processed).toBeDefined();
      expect(report.files_processed.avg).toBe(100);
    });
  });
});

describe("🌐 Bun-Specific Performance Tests", () => {

  it("should demonstrate Bun.nanoseconds precision", () => {
    // @ts-ignore - Bun.nanoseconds is available at runtime
    const start = Bun.nanoseconds();

    // Very small operation
    const result = Math.random() * 1000;

    // @ts-ignore - Bun.nanoseconds is available at runtime
    const end = Bun.nanoseconds();

    const duration = end - start;

    expect(typeof duration).toBe("number");
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1_000_000); // Should be less than 1ms
    expect(result).toBeGreaterThan(0);
  });

  it("should compare Bun.sleep vs setTimeout", async () => {
    const iterations = 5;
    const sleepTimes: number[] = [];
    const timeoutTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Test Bun.sleep
      const sleepStart = performance.now();
      // @ts-ignore - Bun.sleep is available at runtime
      await Bun.sleep(10);
      const sleepEnd = performance.now();
      sleepTimes.push(sleepEnd - sleepStart);

      // Test setTimeout
      const timeoutStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, 10));
      const timeoutEnd = performance.now();
      timeoutTimes.push(timeoutEnd - timeoutStart);
    }

    const avgSleep = sleepTimes.reduce((a, b) => a + b, 0) / sleepTimes.length;
    const avgTimeout = timeoutTimes.reduce((a, b) => a + b, 0) / timeoutTimes.length;

    // Both should be around 10ms (with some tolerance)
    expect(avgSleep).toBeGreaterThan(8);
    expect(avgSleep).toBeLessThan(15);
    expect(avgTimeout).toBeGreaterThan(8);
    expect(avgTimeout).toBeLessThan(20);

    console.log(`📊 Average Bun.sleep: ${avgSleep.toFixed(2)}ms`);
    console.log(`📊 Average setTimeout: ${avgTimeout.toFixed(2)}ms`);
  });

  it("should test Bun garbage collection", () => {
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);

    const beforeMemory = heapStats().heapSize;

    // Allocate memory
    const arrays = Array.from({ length: 100 }, () =>
      Array.from({ length: 10000 }, (_, i) => ({ id: i, data: "x".repeat(100) }))
    );

    const afterAllocation = heapStats().heapSize;

    // If heapStats is not available (fallback returns 0), skip the memory check
    if (beforeMemory === 0 && afterAllocation === 0) {
      console.log("⚠️ heapStats not available, skipping memory allocation check");
    } else {
      expect(afterAllocation).toBeGreaterThan(beforeMemory);
    }

    // Clear references and force GC
    arrays.length = 0;
    // @ts-ignore - Bun.gc is available at runtime
    Bun.gc(true);

    const afterGC = heapStats().heapSize;

    // Memory should decrease after GC (though not necessarily to original level)
    console.log(`🧠 Memory before: ${(beforeMemory / 1024).toFixed(2)}KB`);
    console.log(`🧠 Memory after allocation: ${(afterAllocation / 1024).toFixed(2)}KB`);
    console.log(`🧠 Memory after GC: ${(afterGC / 1024).toFixed(2)}KB`);

    // Just verify that GC ran (memory should not increase after cleanup)
    if (beforeMemory > 0) {
      expect(afterGC).toBeLessThanOrEqual(afterAllocation);
    }
  });
});
