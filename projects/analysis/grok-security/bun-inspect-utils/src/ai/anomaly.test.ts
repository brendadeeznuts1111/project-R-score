import { describe, it, expect, beforeEach } from "bun:test";
import {
  AnomalyEngine,
  createAnomalyEngine,
  createSignal,
  calculateCTRProximity,
  calculateLegVelocity,
  detectIPJump,
  detectCountryChanges,
  formatScore,
} from "./index";

describe("[AI][ANOMALY]", () => {
  let engine: AnomalyEngine;

  beforeEach(async () => {
    engine = createAnomalyEngine();
    await engine.initialize();
  });

  describe("AnomalyEngine", () => {
    it("should initialize successfully", () => {
      const state = engine.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.modelLoaded).toBe(true);
    });

    it("should score a low-risk signal", async () => {
      const signal = createSignal("device-1", {
        deviceAgeDays: 365,
        legAmount: 100,
        legVelocity: 0.5,
        ipJumpCount: 0,
        ctrProximity: 0.1,
        chargebackHistory: false,
      });

      const score = await engine.scoreSignal(signal);
      expect(score.score).toBeLessThan(0.7);
      expect(score.riskLevel).toBe("low");
      expect(score.nebulaCode).toBe("N-00");
    });

    it("should score a medium-risk signal", async () => {
      const signal = createSignal("device-2", {
        deviceAgeDays: 10,
        legAmount: 500,
        legVelocity: 5,
        ipJumpCount: 2,
        ctrProximity: 0.7,
        chargebackHistory: false,
      });

      const score = await engine.scoreSignal(signal);
      expect(score.score).toBeGreaterThanOrEqual(0.7);
      expect(score.score).toBeLessThan(0.9);
      expect(score.riskLevel).toBe("medium");
      expect(score.nebulaCode).toBe("N-AI-T");
    });

    it("should score a high-risk signal", async () => {
      const signal = createSignal("device-3", {
        deviceAgeDays: 1,
        legAmount: 5000,
        legVelocity: 8,
        ipJumpCount: 3,
        ctrProximity: 0.95,
        chargebackHistory: true,
        vpnDetected: true,
      });

      const score = await engine.scoreSignal(signal);
      expect(score.score).toBeGreaterThanOrEqual(0.9);
      expect(score.riskLevel).toBe("high");
      expect(score.nebulaCode).toBe("N-AI-B");
    });

    it("should provide reasons for high-risk scores", async () => {
      const signal = createSignal("device-4", {
        deviceAgeDays: 2,
        legVelocity: 6,
        ipJumpCount: 2,
        chargebackHistory: true,
      });

      const score = await engine.scoreSignal(signal);
      expect(score.reasons.length).toBeGreaterThan(0);
    });

    it("should return appropriate action for score", async () => {
      const signal = createSignal("device-5", {
        deviceAgeDays: 365,
        legVelocity: 1,
        ipJumpCount: 0,
      });

      const score = await engine.scoreSignal(signal);
      const action = engine.getAction(score);
      expect(action.type).toBe("allow");
      expect(action.nebulaCode).toBe("N-00");
    });

    it("should track scoring latency", async () => {
      const signal = createSignal("device-6", {
        deviceAgeDays: 30,
      });

      await engine.scoreSignal(signal);
      const state = engine.getState();
      expect(state.totalScores).toBe(1);
      expect(state.averageLatency).toBeGreaterThan(0);
    });
  });

  describe("Utility Functions", () => {
    it("should calculate CTR proximity", () => {
      expect(calculateCTRProximity(0)).toBe(0);
      expect(calculateCTRProximity(5000)).toBe(0.5);
      expect(calculateCTRProximity(10000)).toBe(1);
    });

    it("should calculate leg velocity", () => {
      expect(calculateLegVelocity(10, 2)).toBe(5);
      expect(calculateLegVelocity(1, 1)).toBe(1);
    });

    it("should detect IP jumps", () => {
      expect(detectIPJump(["192.168.1.1"])).toBe(0);
      expect(detectIPJump(["192.168.1.1", "192.168.2.1"])).toBe(1);
    });

    it("should detect country changes", () => {
      expect(detectCountryChanges(["US"])).toBe(0);
      expect(detectCountryChanges(["US", "UK"])).toBe(1);
    });

    it("should format scores", () => {
      expect(formatScore(0.5)).toBe("50.0%");
      expect(formatScore(0.95)).toBe("95.0%");
    });
  });
});
