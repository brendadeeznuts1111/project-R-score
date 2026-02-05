/**
 * Performance Test Kit - Self Tests
 * Validates the harness utilities work correctly
 *
 * Also serves as usage documentation for the test kit
 */

import { describe, test, expect } from "harness";
import {
  measure,
  measureAsync,
  collectStats,
  collectStatsAsync,
  calculateStats,
  assertSLA,
  assertStatsSLA,
  getTier,
  formatTime,
  formatStats,
  createTimer,
  measureMemory,
  withTimeout,
  createBenchmark,
  SLA_TARGETS,
  PERFORMANCE_TIERS,
} from "./performance";

describe("Performance Test Kit", () => {
  describe("measure()", () => {
    test("measures synchronous operations with nanosecond precision", () => {
      const result = measure(() => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += i;
        return sum;
      });

      expect(result.value).toBe(499500);
      expect(result.durationNs).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.durationUs).toBeGreaterThan(0);
      expect(result.durationNs).toBeCloseTo(result.durationMs * 1_000_000, 0);
    });

    test("returns correct value from measured function", () => {
      const result = measure(() => "hello world");
      expect(result.value).toBe("hello world");
    });
  });

  describe("measureAsync()", () => {
    test("measures async operations", async () => {
      const result = await measureAsync(async () => {
        await Bun.sleep(1);
        return 42;
      });

      expect(result.value).toBe(42);
      // Allow slight timing variance (sleep may return slightly early)
      expect(result.durationMs).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("collectStats()", () => {
    test("collects statistics from multiple iterations", () => {
      const stats = collectStats(() => Math.random(), 100, { warmup: 10 });

      expect(stats.count).toBe(100);
      expect(stats.min).toBeGreaterThanOrEqual(0);
      expect(stats.max).toBeGreaterThan(stats.min);
      expect(stats.mean).toBeGreaterThan(0);
      expect(stats.p50).toBeGreaterThan(0);
      expect(stats.p95).toBeGreaterThanOrEqual(stats.p50);
      expect(stats.p99).toBeGreaterThanOrEqual(stats.p95);
      expect(stats.stdDev).toBeGreaterThanOrEqual(0);
    });

    test("warmup iterations are excluded from samples", () => {
      let callCount = 0;
      const stats = collectStats(() => callCount++, 50, { warmup: 10 });

      // 10 warmup + 50 measured = 60 total calls
      expect(callCount).toBe(60);
      expect(stats.count).toBe(50);
    });
  });

  describe("collectStatsAsync()", () => {
    test("collects statistics from async operations", async () => {
      const stats = await collectStatsAsync(
        async () => await Promise.resolve(1),
        20,
        { warmup: 5 }
      );

      expect(stats.count).toBe(20);
      expect(stats.mean).toBeGreaterThan(0);
    });
  });

  describe("calculateStats()", () => {
    test("calculates correct statistics", () => {
      const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = calculateStats(samples);

      expect(stats.count).toBe(10);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(10);
      expect(stats.mean).toBe(5.5);
      expect(stats.p50).toBe(5); // 50th percentile
      expect(stats.p99).toBe(10); // 99th percentile
    });

    test("handles empty array", () => {
      const stats = calculateStats([]);
      expect(stats.count).toBe(0);
      expect(stats.mean).toBe(0);
    });

    test("calculates standard deviation correctly", () => {
      // Known dataset: stdDev of [2, 4, 4, 4, 5, 5, 7, 9] = 2
      const samples = [2, 4, 4, 4, 5, 5, 7, 9];
      const stats = calculateStats(samples);

      expect(stats.mean).toBe(5);
      expect(stats.stdDev).toBeCloseTo(2, 1);
    });
  });

  describe("assertSLA()", () => {
    test("passes when under target", () => {
      expect(() => assertSLA(0.01, 0.03, "Test op")).not.toThrow();
    });

    test("throws when over 120% of target", () => {
      expect(() => assertSLA(0.05, 0.03, "Test op")).toThrow("SLA VIOLATION");
    });

    test("includes operation name in error", () => {
      expect(() => assertSLA(100, 1, "Critical Path")).toThrow("Critical Path");
    });
  });

  describe("assertStatsSLA()", () => {
    test("passes when p99 is under target", () => {
      const stats = { count: 100, min: 0.01, max: 0.02, mean: 0.015, p50: 0.015, p95: 0.018, p99: 0.02, stdDev: 0.003, cv: 20 };
      expect(() => assertStatsSLA(stats, 0.03, "Test")).not.toThrow();
    });

    test("throws when p99 exceeds target", () => {
      const stats = { count: 100, min: 0.01, max: 0.05, mean: 0.02, p50: 0.02, p95: 0.04, p99: 0.05, stdDev: 0.01, cv: 50 };
      expect(() => assertStatsSLA(stats, 0.03, "Test")).toThrow("SLA VIOLATION");
    });
  });

  describe("getTier()", () => {
    test("returns EXCELLENT when under 80% of target", () => {
      const tier = getTier(0.02, 0.03);
      expect(tier.label).toBe("EXCELLENT");
    });

    test("returns GOOD when under 100% of target", () => {
      const tier = getTier(0.028, 0.03);
      expect(tier.label).toBe("GOOD");
    });

    test("returns ACCEPTABLE when under 120% of target", () => {
      const tier = getTier(0.034, 0.03);
      expect(tier.label).toBe("ACCEPTABLE");
    });

    test("returns POOR when over 120% of target", () => {
      const tier = getTier(0.05, 0.03);
      expect(tier.label).toBe("POOR");
    });
  });

  describe("formatTime()", () => {
    test("formats nanoseconds", () => {
      expect(formatTime(0.0001)).toContain("ns");
    });

    test("formats microseconds", () => {
      expect(formatTime(0.5)).toContain("μs");
    });

    test("formats milliseconds", () => {
      expect(formatTime(50)).toContain("ms");
    });

    test("formats seconds", () => {
      expect(formatTime(2500)).toContain("s");
    });
  });

  describe("formatStats()", () => {
    test("formats statistics with label", () => {
      const stats = { count: 100, min: 0.01, max: 0.05, mean: 0.02, p50: 0.02, p95: 0.04, p99: 0.045, stdDev: 0.01, cv: 50 };
      const formatted = formatStats(stats, "Route dispatch");

      expect(formatted).toContain("Route dispatch:");
      expect(formatted).toContain("samples: 100");
      expect(formatted).toContain("p99:");
      expect(formatted).toContain("cv:");
    });
  });

  describe("createTimer()", () => {
    test("measures elapsed time", async () => {
      const timer = createTimer();
      timer.start();
      await Bun.sleep(5);
      timer.stop();

      // Allow slight timing variance (sleep may return slightly early)
      expect(timer.durationMs).toBeGreaterThanOrEqual(4.5);
      expect(timer.durationNs).toBeGreaterThan(0);
      expect(timer.durationUs).toBeGreaterThan(0);
    });

    test("can be reset", () => {
      const timer = createTimer();
      timer.start();
      timer.stop();
      const firstDuration = timer.durationNs;

      timer.reset();
      expect(timer.durationNs).toBe(0);
    });
  });

  describe("measureMemory()", () => {
    test("measures heap delta", () => {
      const result = measureMemory(() => {
        // Allocate some memory
        const arr = new Array(10000).fill({ data: "x".repeat(100) });
        return arr;
      });

      expect(result.heapDeltaBytes).toBeDefined();
      expect(result.heapDeltaKB).toBeDefined();
      expect(result.heapDeltaMB).toBeDefined();
      expect(result.before).toBeDefined();
      expect(result.after).toBeDefined();
    });
  });

  describe("withTimeout()", () => {
    test("returns result if operation completes in time", async () => {
      const result = await withTimeout(async () => {
        await Bun.sleep(1);
        return "success";
      }, 1000);

      expect(result).toBe("success");
    });

    test("throws if operation exceeds timeout", async () => {
      await expect(
        withTimeout(async () => {
          await Bun.sleep(100);
          return "never";
        }, 10)
      ).rejects.toThrow("timed out");
    });
  });

  describe("createBenchmark()", () => {
    test("returns comprehensive benchmark results", () => {
      const benchmark = createBenchmark(
        () => Math.random(),
        { iterations: 100, warmup: 10, target: 1.0 }
      );

      expect(benchmark.count).toBe(100);
      expect(benchmark.mean).toBeGreaterThan(0);
      expect(benchmark.p99).toBeGreaterThan(0);
      expect(benchmark.tier).toBeDefined();
      expect(benchmark.formatted).toContain("Stats:");
      expect(benchmark.meetsTarget).toBe(true);
    });

    test("correctly identifies when target is not met", () => {
      // Create a slow operation that will exceed a tiny target
      const benchmark = createBenchmark(
        () => {
          let sum = 0;
          for (let i = 0; i < 10000; i++) sum += i;
          return sum;
        },
        { iterations: 10, warmup: 2, target: 0.000001 } // 1 nanosecond target
      );

      expect(benchmark.meetsTarget).toBe(false);
      expect(benchmark.tier?.label).toBe("POOR");
    });
  });

  describe("SLA_TARGETS", () => {
    test("exports commonly used targets", () => {
      expect(SLA_TARGETS.DISPATCH_MS).toBe(0.03);
      expect(SLA_TARGETS.REQUEST_CYCLE_P99_MS).toBe(10.8);
      expect(SLA_TARGETS.TRANSPILE_MS).toBe(10);
    });
  });

  describe("PERFORMANCE_TIERS", () => {
    test("exports tier definitions", () => {
      expect(PERFORMANCE_TIERS.EXCELLENT.threshold).toBe(0.8);
      expect(PERFORMANCE_TIERS.GOOD.threshold).toBe(1.0);
      expect(PERFORMANCE_TIERS.ACCEPTABLE.threshold).toBe(1.2);
      expect(PERFORMANCE_TIERS.POOR.threshold).toBe(Infinity);
    });
  });
});

describe("Usage Examples", () => {
  test("Example: Basic timing pattern", () => {
    // This is the most common pattern for testing performance
    const result = measure(() => {
      // Your operation here - simple arithmetic for predictable timing
      let sum = 0;
      for (let i = 0; i < 100; i++) sum += i;
      return sum;
    });

    // Assert against reasonable threshold (sub-millisecond for simple ops)
    expect(result.durationMs).toBeLessThan(1); // Simple operations should be <1ms
    expect(result.value).toBe(4950);
  });

  test("Example: Statistical analysis", () => {
    const stats = collectStats(() => {
      const pattern = new URLPattern({ pathname: "/api/:id" });
      return pattern.test("/api/123");
    }, 100);

    // Use p99 for SLA assertions (handles outliers)
    expect(stats.p99).toBeLessThan(SLA_TARGETS.ROUTE_TEST_MS * 100); // Relaxed
    // CV can be high for micro-benchmarks due to JIT warmup variance
    expect(stats.cv).toBeLessThan(500); // Relaxed consistency check
  });

  test("Example: Async operation measurement", async () => {
    const result = await measureAsync(async () => {
      return await Promise.resolve("data");
    });

    expect(result.value).toBe("data");
    expect(result.durationMs).toBeLessThan(10);
  });

  test("Example: Memory profiling", () => {
    const memory = measureMemory(() => {
      const data = new Array(1000).fill({ x: 1, y: 2 });
      return data;
    });

    // Log for visibility (optional)
    // console.log(`Memory delta: ${memory.heapDeltaKB.toFixed(2)}KB`);
    expect(memory.heapDeltaBytes).toBeDefined();
  });

  test("Example: Full benchmark with tier classification", () => {
    // Pre-create pattern to avoid cold-path overhead
    const pattern = new URLPattern({ pathname: "/users/:id/posts/:postId" });

    const benchmark = createBenchmark(
      () => pattern.exec("/users/123/posts/456"),
      {
        iterations: 500,
        warmup: 50,
        target: SLA_TARGETS.DISPATCH_MS,
      }
    );

    // Check tier is defined (any tier is valid, performance varies by system load)
    expect(["EXCELLENT", "GOOD", "ACCEPTABLE", "POOR"]).toContain(benchmark.tier?.label);
  });
});
