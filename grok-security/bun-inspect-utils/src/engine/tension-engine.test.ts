// [74.0.0.0] TENSION ENGINE TESTS
// Comprehensive tests for the unified tension engine
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { TensionEngine } from "./tension-engine";
import { MemoryAdapter } from "./adapters/memory-adapter";
import type { TensionState, HealthReport, ErrorContext } from "./types";

describe("[74.0.0.0] TensionEngine", () => {
  let engine: TensionEngine;

  beforeEach(async () => {
    engine = new TensionEngine({
      initialTension: 0,
      healthThresholds: { warning: 50, critical: 75 },
    });
    await engine.initialize();
  });

  afterEach(() => {
    engine.dispose();
  });

  describe("[74.1.0.0] Initialization", () => {
    it("should initialize successfully", () => {
      expect(engine.isInitialized()).toBe(true);
    });

    it("should start with initial tension value", () => {
      const state = engine.getState();
      expect(state.value).toBe(0);
      expect(state.isHealthy).toBe(true);
    });

    it("should use custom initial tension", async () => {
      const customEngine = new TensionEngine({ initialTension: 25 });
      await customEngine.initialize();
      expect(customEngine.getState().value).toBe(25);
      customEngine.dispose();
    });
  });

  describe("[74.2.0.0] Tension Management", () => {
    it("should set tension value", () => {
      const result = engine.setTension(50);
      expect(result).toBe(true);
      expect(engine.getState().value).toBe(50);
    });

    it("should reject invalid tension values", () => {
      const result = engine.setTension(150);
      expect(result).toBe(false);
    });

    it("should emit tensionChange event", () => {
      let receivedState: TensionState | null = null;
      engine.on("tensionChange", (state) => {
        receivedState = state;
      });

      engine.setTension(30);
      expect(receivedState?.value).toBe(30);
    });
  });

  describe("[74.3.0.0] Health Monitoring", () => {
    it("should report healthy status when tension < 50", () => {
      engine.setTension(25);
      const health = engine.getHealth();
      expect(health.status).toBe("healthy");
    });

    it("should report warning status when 50 <= tension <= 75", () => {
      engine.setTension(60);
      const health = engine.getHealth();
      expect(health.status).toBe("warning");
    });

    it("should report critical status when tension > 75", () => {
      engine.setTension(85);
      const health = engine.getHealth();
      expect(health.status).toBe("critical");
    });

    it("should emit healthChange event on status change", () => {
      let receivedHealth: HealthReport | null = null;
      engine.on("healthChange", (health) => {
        receivedHealth = health;
      });

      engine.setTension(80);
      expect(receivedHealth?.status).toBe("critical");
    });
  });

  describe("[74.4.0.0] Metrics Tracking", () => {
    it("should track total operations", () => {
      engine.setTension(10);
      engine.setTension(20);
      engine.setTension(30);

      const metrics = engine.getMetrics();
      expect(metrics.totalOperations).toBe(3);
    });

    it("should track peak tension", () => {
      engine.setTension(30);
      engine.setTension(80);
      engine.setTension(40);

      const metrics = engine.getMetrics();
      expect(metrics.peakTension).toBe(80);
    });

    it("should calculate average tension", () => {
      engine.setTension(20);
      engine.setTension(40);
      engine.setTension(60);

      const metrics = engine.getMetrics();
      expect(metrics.averageTension).toBe(40);
    });
  });

  describe("[74.5.0.0] Error Handling", () => {
    it("should emit error event on invalid tension", () => {
      let receivedError: ErrorContext | null = null;
      engine.on("error", (error) => {
        receivedError = error;
      });

      engine.setTension(-10);
      expect(receivedError).toBeDefined();
      expect(receivedError?.severity).toBe("high");
    });

    it("should increment error count on errors", () => {
      engine.setTension(-10);
      engine.setTension(200);

      const metrics = engine.getMetrics();
      expect(metrics.totalErrors).toBe(2);
    });
  });

  describe("[74.6.0.0] Storage Adapter", () => {
    it("should accept storage adapter", () => {
      const adapter = new MemoryAdapter();
      engine.setStorageAdapter(adapter);
      // No error means success
      expect(true).toBe(true);
    });
  });

  describe("[74.7.0.0] Reset & Dispose", () => {
    it("should reset all state", () => {
      engine.setTension(80);
      engine.reset();

      const state = engine.getState();
      expect(state.value).toBe(0);
      expect(state.errorCount).toBe(0);
    });

    it("should dispose properly", () => {
      engine.dispose();
      expect(engine.isInitialized()).toBe(false);
    });
  });
});

