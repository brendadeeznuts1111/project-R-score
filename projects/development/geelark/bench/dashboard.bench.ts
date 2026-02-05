#!/usr/bin/env bun

/**
 * Dashboard Rendering Performance Benchmarks
 * Following Bun's benchmarking best practices
 */

import { bench, describe, expect, beforeEach } from "bun:test";
import { Dashboard } from "../src/Dashboard";
import { FeatureRegistry } from "../src/FeatureRegistry";
import { FeatureFlag } from "../src/types";
import { Logger } from "../src/Logger";
import { measureNanoseconds } from "./utils";

describe("Dashboard Rendering Performance", () => {
  let dashboard: Dashboard;
  let registry: FeatureRegistry;
  let logger: Logger;

  beforeEach(() => {
    registry = new FeatureRegistry({
      [FeatureFlag.FEAT_PREMIUM]: true,
      [FeatureFlag.FEAT_ENCRYPTION]: true,
      [FeatureFlag.FEAT_BATCH_PROCESSING]: true,
      [FeatureFlag.FEAT_AUTO_HEAL]: true,
      [FeatureFlag.FEAT_NOTIFICATIONS]: true,
    });

    logger = new Logger({
      level: "INFO",
      enableFileLogging: false,
      enableConsoleLogging: false, // Disable console logging for benchmarks
    });

    dashboard = new Dashboard(registry, logger);
  });

  describe("Status Bar Rendering", () => {
    bench("display status bar", () => {
      dashboard["displayTopStatusBar"](); // Using private method access
    }, {
      iterations: 1_000,
    });

    bench("calculate health status", () => {
      dashboard["calculateHealthStatus"](); // Using private method access
    }, {
      iterations: 1_000,
    });

    bench("pad line", () => {
      dashboard["padLine"]("Test line", 80); // Using private method access
    }, {
      iterations: 1_000,
    });
  });

  describe("Feature Flag Display", () => {
    bench("get enabled flags", () => {
      registry.getEnabledFlags();
    }, {
      iterations: 1_000,
    });

    bench("get all flags", () => {
      registry.getAllFlags();
    }, {
      iterations: 1_000,
    });

    bench("get badge for flag", () => {
      registry.getBadge(FeatureFlag.FEAT_PREMIUM);
    }, {
      iterations: 1_000,
    });

    bench("display environment panel", () => {
      dashboard["displayEnvironmentPanel"](); // Using private method access
    }, {
      iterations: 1_000,
    });
  });

  describe("Performance Metrics Display", () => {
    bench("display performance graph", () => {
      dashboard["displayPerformanceGraph"](); // Using private method access
    }, {
      iterations: 1_000,
    });

    bench("create progress bar", () => {
      dashboard["createProgressBar"](80, 5); // Using private method access
    }, {
      iterations: 1_000,
    });

    bench("display performance metrics", () => {
      dashboard["displayPerformanceMetrics"](); // Using private method access
    }, {
      iterations: 1_000,
    });
  });

  describe("Health Status Display", () => {
    bench("get health status", () => {
      registry.getHealthStatus();
    }, {
      iterations: 1_000,
    });

    bench("get enabled count", () => {
      registry.getEnabledCount();
    }, {
      iterations: 1_000,
    });

    bench("get total count", () => {
      registry.getTotalCount();
    }, {
      iterations: 1_000,
    });

    bench("display health status", () => {
      dashboard["displayHealthStatus"](); // Using private method access
    }, {
      iterations: 1_000,
    });
  });

  describe("Full Dashboard Render", () => {
    bench("display status", () => {
      dashboard.displayStatus();
    }, {
      iterations: 100,
    });

    bench("display full dashboard", () => {
      dashboard.displayFullDashboard();
    }, {
      iterations: 100,
    });

    bench("render with all features enabled", () => {
      // Enable all features
      Object.values(FeatureFlag).forEach(flag => {
        try {
          registry.enable(flag);
        } catch {
          // Ignore errors for incompatible flags
        }
      });
      dashboard.displayFullDashboard();
    }, {
      iterations: 100,
    });
  });

  describe("Dashboard Updates", () => {
    bench("update dashboard state", () => {
      registry.toggle(FeatureFlag.FEAT_BATCH_PROCESSING);
      dashboard.displayStatus();
    }, {
      iterations: 100,
    });

    bench("batch updates (5 flags)", () => {
      const flags = Object.values(FeatureFlag).slice(0, 5);
      flags.forEach(flag => {
        try {
          registry.toggle(flag);
        } catch {
          // Ignore errors
        }
      });
      dashboard.displayStatus();
    }, {
      iterations: 50,
    });
  });

  describe("Microbenchmarks with Nanosecond Precision", () => {
    it("should measure status bar rendering with nanosecond precision", () => {
      const { duration } = measureNanoseconds(() => {
        dashboard["displayTopStatusBar"]();
      });
      expect(duration).toBeLessThan(10); // Should be less than 10ms
    });

    it("should measure full dashboard render with nanosecond precision", () => {
      const { duration } = measureNanoseconds(() => {
        dashboard.displayStatus();
      });
      expect(duration).toBeLessThan(100); // Should be less than 100ms
    });
  });
});

