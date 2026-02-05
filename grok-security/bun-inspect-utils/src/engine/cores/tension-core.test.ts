// [71.0.0.0] TENSION CORE TESTS
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { TensionCore } from "./tension-core";
import type { TensionState, ErrorContext } from "../types";

describe("[71.0.0.0] TensionCore", () => {
  let core: TensionCore;

  beforeEach(async () => {
    core = new TensionCore(0, { warning: 50, critical: 75 });
    await core.initialize();
  });

  afterEach(() => {
    core.dispose();
  });

  describe("[71.1.0.0] Initialization", () => {
    it("should initialize with default values", () => {
      expect(core.isInitialized()).toBe(true);
      expect(core.getState().value).toBe(0);
    });

    it("should clamp initial tension to valid range", async () => {
      const highCore = new TensionCore(150);
      await highCore.initialize();
      expect(highCore.getState().value).toBe(100);
      highCore.dispose();

      const lowCore = new TensionCore(-50);
      await lowCore.initialize();
      expect(lowCore.getState().value).toBe(0);
      lowCore.dispose();
    });
  });

  describe("[71.2.0.0] set()", () => {
    it("should set valid tension values", () => {
      expect(core.set(50)).toBe(true);
      expect(core.getState().value).toBe(50);
    });

    it("should reject values below 0", () => {
      expect(core.set(-10)).toBe(false);
    });

    it("should reject values above 100", () => {
      expect(core.set(150)).toBe(false);
    });

    it("should update lastUpdate timestamp", () => {
      const before = core.getState().lastUpdate;
      core.set(25);
      expect(core.getState().lastUpdate).toBeGreaterThanOrEqual(before);
    });
  });

  describe("[71.3.0.0] increment() / decrement()", () => {
    it("should increment tension", () => {
      core.set(50);
      core.increment(10);
      expect(core.getState().value).toBe(60);
    });

    it("should not exceed 100", () => {
      core.set(95);
      core.increment(20);
      expect(core.getState().value).toBe(100);
    });

    it("should decrement tension", () => {
      core.set(50);
      core.decrement(10);
      expect(core.getState().value).toBe(40);
    });

    it("should not go below 0", () => {
      core.set(5);
      core.decrement(20);
      expect(core.getState().value).toBe(0);
    });
  });

  describe("[71.4.0.0] getHealthStatus()", () => {
    it("should return healthy for values < 50", () => {
      core.set(30);
      expect(core.getHealthStatus()).toBe("healthy");
    });

    it("should return warning for values 50-75", () => {
      core.set(60);
      expect(core.getHealthStatus()).toBe("warning");
    });

    it("should return critical for values > 75", () => {
      core.set(90);
      expect(core.getHealthStatus()).toBe("critical");
    });
  });

  describe("[71.5.0.0] Event subscriptions", () => {
    it("should emit state changes", () => {
      let receivedState: TensionState | null = null;
      core.subscribe((state) => {
        receivedState = state;
      });

      core.set(40);
      expect(receivedState?.value).toBe(40);
    });

    it("should emit errors", () => {
      let receivedError: ErrorContext | null = null;
      core.subscribeErrors((error) => {
        receivedError = error;
      });

      core.set(-10);
      expect(receivedError).toBeDefined();
      expect(receivedError?.message).toContain("Invalid tension");
    });

    it("should emit warnings for high tension", () => {
      let receivedWarning: string | null = null;
      core.subscribeWarnings((warning) => {
        receivedWarning = warning;
      });

      core.set(80);
      expect(receivedWarning).toContain("Critical");
    });

    it("should allow unsubscribing", () => {
      let callCount = 0;
      const unsubscribe = core.subscribe(() => {
        callCount++;
      });

      core.set(10);
      expect(callCount).toBe(1);

      unsubscribe();
      core.set(20);
      expect(callCount).toBe(1);
    });
  });

  describe("[71.6.0.0] reset()", () => {
    it("should reset to healthy state", () => {
      core.set(80);
      core.triggerError({ message: "Test", severity: "medium" });

      core.reset();

      const state = core.getState();
      expect(state.value).toBe(0);
      expect(state.errorCount).toBe(0);
      expect(state.isHealthy).toBe(true);
    });
  });
});

