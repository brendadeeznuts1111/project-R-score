// [2.0.0.0] SIGNALS: Tension Signal Tests
import { describe, it, expect, beforeEach } from "bun:test";
import { tensionSignal } from "./tensionSignal";

describe("[SIGNAL][TENSION] tensionSignal", () => {
  beforeEach(() => {
    tensionSignal.reset();
  });

  describe("set()", () => {
    it("should set valid tension values", () => {
      tensionSignal.set(50);
      expect(tensionSignal.value).toBe(50);
    });

    it("should reject negative values", () => {
      let errorTriggered = false;
      tensionSignal.onError = () => {
        errorTriggered = true;
      };
      tensionSignal.set(-10);
      expect(errorTriggered).toBe(true);
    });

    it("should reject values > 100", () => {
      let errorTriggered = false;
      tensionSignal.onError = () => {
        errorTriggered = true;
      };
      tensionSignal.set(150);
      expect(errorTriggered).toBe(true);
    });

    it("should mark as healthy when < 50", () => {
      tensionSignal.set(30);
      expect(tensionSignal.isHealthy).toBe(true);
    });

    it("should mark as unhealthy when >= 50", () => {
      tensionSignal.set(60);
      expect(tensionSignal.isHealthy).toBe(false);
    });
  });

  describe("getState()", () => {
    it("should return current state snapshot", () => {
      tensionSignal.set(45);
      const state = tensionSignal.getState();
      expect(state.value).toBe(45);
      expect(state.isHealthy).toBe(true);
      expect(state.errorCount).toBe(0);
    });
  });

  describe("triggerError()", () => {
    it("should increment error count", () => {
      const error = new Error("Test error");
      tensionSignal.triggerError(error);
      expect(tensionSignal.errorCount).toBe(1);
    });

    it("should increase tension on error", () => {
      const initial = tensionSignal.value;
      const error = new Error("Test error");
      tensionSignal.triggerError(error);
      expect(tensionSignal.value).toBeGreaterThan(initial);
    });

    it("should add file context to error", () => {
      let capturedError: any;
      tensionSignal.onError = (err) => {
        capturedError = err;
      };
      const error = new Error("Test");
      tensionSignal.triggerError(error);
      expect(capturedError.file).toBeDefined();
      expect(capturedError.line).toBeDefined();
    });
  });

  describe("getHealth()", () => {
    it("should return healthy status when tension < 50", () => {
      tensionSignal.set(30);
      const health = tensionSignal.getHealth();
      expect(health.status).toBe("healthy");
    });

    it("should return warning status when 50 <= tension <= 75", () => {
      tensionSignal.set(60);
      const health = tensionSignal.getHealth();
      expect(health.status).toBe("warning");
    });

    it("should return critical status when tension > 75", () => {
      tensionSignal.set(85);
      const health = tensionSignal.getHealth();
      expect(health.status).toBe("critical");
    });
  });

  describe("reset()", () => {
    it("should reset all values", () => {
      tensionSignal.set(80);
      tensionSignal.triggerError(new Error("Test"));
      tensionSignal.reset();
      expect(tensionSignal.value).toBe(0);
      expect(tensionSignal.errorCount).toBe(0);
      expect(tensionSignal.isHealthy).toBe(true);
    });
  });
});

