import { describe, it, expect, beforeEach, afterEach } from "bun:test";

describe("🔧 Build Hooks System Tests", () => {
  describe("📊 Bundle Size Tracking", () => {
    beforeEach(() => {
      // Clear the cache file before each test
      try {
        Bun.write("./.bun-cache/prev-size.txt", "0");
      } catch {
        // Ignore errors
      }
    });

    it("should track bundle size changes", async () => {
      const { trackBundleSize } = await import("../scripts/build-hooks.ts");

      // First build - previous size will be 0
      const delta1 = await trackBundleSize(1000000);
      expect(delta1.currentSize).toBe(1000000);
      expect(delta1.previousSize).toBe(0);
      expect(delta1.trend).toBe("increase");

      // Second build - previous size is now 1000000
      const delta2 = await trackBundleSize(1200000);
      expect(delta2.currentSize).toBe(1200000);
      expect(delta2.previousSize).toBe(1000000);
      expect(delta2.deltaBytes).toBe(200000);
      expect(delta2.deltaPercent).toBe("20.0");
      expect(delta2.trend).toBe("increase");

      // Third build - size decrease
      const delta3 = await trackBundleSize(800000);
      expect(delta3.currentSize).toBe(800000);
      expect(delta3.previousSize).toBe(1200000);
      expect(delta3.deltaBytes).toBe(-400000);
      expect(delta3.deltaPercent).toBe("-33.3");
      expect(delta3.trend).toBe("decrease");
    });

    it("should handle zero size", async () => {
      const { trackBundleSize } = await import("../scripts/build-hooks.ts");

      const delta = await trackBundleSize(0);
      expect(delta.currentSize).toBe(0);
      expect(delta.deltaBytes).toBe(0);
      expect(delta.trend).toBe("unchanged");
    });
  });

  describe("📈 Build Metrics Calculation", () => {
    it("should calculate build metrics correctly", async () => {
      const { calculateBuildMetrics } = await import("../scripts/build-hooks.ts");

      const mockBuildResult = {
        outputs: [
          { path: "bundle.js", size: 1024000 }, // 1MB
          { path: "styles.css", size: 512000 },  // 512KB
          { path: "bundle.js.map", size: 204800 }, // 200KB sourcemap
        ],
      };

      const startTime = Date.now() - 1000; // 1 second ago
      const metrics = await calculateBuildMetrics(mockBuildResult, startTime);

      expect(metrics.totalSize).toBe(1740800); // 1.66MB
      expect(metrics.bundleCount).toBe(3);
      expect(metrics.buildTime).toBeGreaterThan(0);
      expect(metrics.compressionRatio).toBeLessThan(100);
      expect(metrics.version).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
    });

    it("should handle empty build results", async () => {
      const { calculateBuildMetrics } = await import("../scripts/build-hooks.ts");

      const mockBuildResult = { outputs: [] };
      const metrics = await calculateBuildMetrics(mockBuildResult, Date.now());

      expect(metrics.totalSize).toBe(0);
      expect(metrics.bundleCount).toBe(0);
      expect(metrics.compressionRatio).toBe(100);
    });

    it("should handle missing outputs gracefully", async () => {
      const { calculateBuildMetrics } = await import("../scripts/build-hooks.ts");

      const metrics = await calculateBuildMetrics({ outputs: undefined }, Date.now());

      expect(metrics.totalSize).toBe(0);
      expect(metrics.bundleCount).toBe(0);
    });
  });

  describe("📋 Size Delta Calculations", () => {
    beforeEach(() => {
      // Clear the cache file before each test
      try {
        Bun.write("./.bun-cache/prev-size.txt", "0");
      } catch {
        // Ignore errors
      }
    });

    it("should calculate correct size deltas", async () => {
      const { trackBundleSize } = await import("../scripts/build-hooks.ts");

      // Test size increase
      await trackBundleSize(1000);
      const increaseDelta = await trackBundleSize(1500);
      expect(increaseDelta.deltaBytes).toBe(500);
      expect(increaseDelta.deltaPercent).toBe("50.0");
      expect(increaseDelta.trend).toBe("increase");

      // Test size decrease
      const decreaseDelta = await trackBundleSize(800);
      expect(decreaseDelta.deltaBytes).toBe(-700);
      expect(decreaseDelta.deltaPercent).toBe("-46.7");
      expect(decreaseDelta.trend).toBe("decrease");

      // Test no change
      const unchangedDelta = await trackBundleSize(800);
      expect(unchangedDelta.deltaBytes).toBe(0);
      expect(unchangedDelta.deltaPercent).toBe("0.0");
      expect(unchangedDelta.trend).toBe("unchanged");
    });
  });

  describe("🎯 Performance Analysis", () => {
    it("should calculate metrics for large bundles", async () => {
      const { calculateBuildMetrics } = await import("../scripts/build-hooks.ts");

      const largeBundleResult = {
        outputs: [{ path: "large.js", size: 3 * 1024 * 1024 }], // 3MB
      };

      const metrics = await calculateBuildMetrics(largeBundleResult, Date.now());

      expect(metrics.totalSize).toBeGreaterThan(2 * 1024 * 1024);
      expect(metrics.bundleCount).toBe(1);
    });
  });

  describe("🚨 Error Handling", () => {
    it("should handle null build result", async () => {
      const { calculateBuildMetrics } = await import("../scripts/build-hooks.ts");

      const metrics = await calculateBuildMetrics(null, Date.now());

      expect(metrics.totalSize).toBe(0);
      expect(metrics.bundleCount).toBe(0);
    });

    it("should handle invalid size file", async () => {
      const { trackBundleSize } = await import("../scripts/build-hooks.ts");

      // Clear cache and write invalid content
      try {
        Bun.write("./.bun-cache/prev-size.txt", "invalid-number");
      } catch {
        // Ignore errors
      }

      // Should still work with NaN fallback
      const delta = await trackBundleSize(1000);
      expect(delta.currentSize).toBe(1000);
    });
  });
});
