#!/usr/bin/env bun

/**
 * Feature Flag Registry Performance Benchmarks
 * Following Bun's benchmarking best practices
 */

import { bench, describe, expect } from "bun:test";
import { FeatureRegistry } from "../src/FeatureRegistry";
import { FeatureFlag } from "../src/types";
import { benchmark, measureNanoseconds } from "./utils";

describe("Feature Flag Registry Performance", () => {
  let registry: FeatureRegistry;

  beforeEach(() => {
    registry = new FeatureRegistry({
      [FeatureFlag.FEAT_PREMIUM]: true,
      [FeatureFlag.FEAT_ENCRYPTION]: true,
      [FeatureFlag.FEAT_BATCH_PROCESSING]: false,
    });
  });

  describe("isEnabled() Lookup Performance", () => {
    bench("single flag lookup", () => {
      registry.isEnabled(FeatureFlag.FEAT_PREMIUM);
    }, {
      iterations: 10_000,
    });

    bench("multiple flag lookups (10 flags)", () => {
      const flags = Object.values(FeatureFlag).slice(0, 10);
      for (const flag of flags) {
        registry.isEnabled(flag);
      }
    }, {
      iterations: 1_000,
    });

    bench("non-existent flag lookup", () => {
      registry.isEnabled("NON_EXISTENT_FLAG" as FeatureFlag);
    }, {
      iterations: 10_000,
    });
  });

  describe("Flag State Updates", () => {
    bench("enable flag", () => {
      registry.enable(FeatureFlag.FEAT_BATCH_PROCESSING);
      registry.disable(FeatureFlag.FEAT_BATCH_PROCESSING);
    }, {
      iterations: 1_000,
    });

    bench("toggle flag", () => {
      registry.toggle(FeatureFlag.FEAT_ENCRYPTION);
    }, {
      iterations: 1_000,
    });

    bench("bulk update (5 flags)", () => {
      const flags = Object.values(FeatureFlag).slice(0, 5);
      flags.forEach(flag => registry.enable(flag));
      flags.forEach(flag => registry.disable(flag));
    }, {
      iterations: 100,
    });
  });

  describe("Registry Initialization", () => {
    bench("empty registry initialization", () => {
      new FeatureRegistry();
    }, {
      iterations: 1_000,
    });

    bench("registry with 10 flags", () => {
      const flags: Partial<Record<FeatureFlag, boolean>> = {};
      Object.values(FeatureFlag).slice(0, 10).forEach(flag => {
        flags[flag] = true;
      });
      new FeatureRegistry(flags);
    }, {
      iterations: 1_000,
    });

    bench("registry with all flags", () => {
      const flags: Partial<Record<FeatureFlag, boolean>> = {};
      Object.values(FeatureFlag).forEach(flag => {
        flags[flag] = Math.random() > 0.5;
      });
      new FeatureRegistry(flags);
    }, {
      iterations: 100,
    });
  });

  describe("Health Score Calculation", () => {
    bench("calculate health score", () => {
      registry.getHealthScore();
    }, {
      iterations: 1_000,
    });

    bench("get health status", () => {
      registry.getHealthStatus();
    }, {
      iterations: 1_000,
    });
  });

  describe("Change Listeners", () => {
    bench("add and trigger listener", () => {
      const listener = () => {};
      registry.onChange(listener);
      registry.enable(FeatureFlag.FEAT_BATCH_PROCESSING);
      registry.offChange(listener);
    }, {
      iterations: 1_000,
    });

    bench("multiple listeners (10)", () => {
      const listeners = Array.from({ length: 10 }, () => () => {});
      listeners.forEach(listener => registry.onChange(listener));
      registry.enable(FeatureFlag.FEAT_BATCH_PROCESSING);
      listeners.forEach(listener => registry.offChange(listener));
    }, {
      iterations: 100,
    });
  });

  describe("Get All Flags", () => {
    bench("getAllFlags()", () => {
      registry.getAllFlags();
    }, {
      iterations: 1_000,
    });

    bench("getEnabledFlags()", () => {
      registry.getEnabledFlags();
    }, {
      iterations: 1_000,
    });

    bench("getDisabledFlags()", () => {
      registry.getDisabledFlags();
    }, {
      iterations: 1_000,
    });
  });

  describe("Microbenchmarks with Nanosecond Precision", () => {
    it("should measure isEnabled with nanosecond precision", () => {
      const { duration } = measureNanoseconds(() => {
        registry.isEnabled(FeatureFlag.FEAT_PREMIUM);
      });
      expect(duration).toBeLessThan(1); // Should be less than 1ms
    });

    it("should measure enable with nanosecond precision", () => {
      const { duration } = measureNanoseconds(() => {
        registry.enable(FeatureFlag.FEAT_BATCH_PROCESSING);
        registry.disable(FeatureFlag.FEAT_BATCH_PROCESSING);
      });
      expect(duration).toBeLessThan(1); // Should be less than 1ms
    });
  });
});

