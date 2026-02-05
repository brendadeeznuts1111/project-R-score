#!/usr/bin/env bun
// Historical Analyzer Test Suite
// [TENSION-TEST-002]

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { HistoricalAnalyzer } from "../tension-field/historical-analyzer";
import { TENSION_CONSTANTS } from "../tension-field/config";
import { unlinkSync } from "fs";

function makeDataPoint(overrides: {
  timestamp?: number;
  volume?: number;
  link?: number;
  profile?: number;
  security?: number;
  compliance?: number;
  anomalies?: Array<{ type: string; severity: "LOW" | "MEDIUM" | "HIGH"; confidence: number; description: string }>;
  riskScore?: number;
  events?: string[];
} = {}) {
  return {
    timestamp: overrides.timestamp ?? Date.now(),
    tensions: {
      volume: overrides.volume ?? 50,
      link: overrides.link ?? 40,
      profile: overrides.profile ?? 30,
      security: overrides.security ?? 20,
      compliance: overrides.compliance ?? 10,
    },
    anomalies: overrides.anomalies ?? [],
    riskScore: overrides.riskScore ?? 25,
    events: overrides.events,
  };
}

describe("HistoricalAnalyzer", () => {
  const DATA_FILE = TENSION_CONSTANTS.DATA_FILE;

  beforeEach(() => {
    try { unlinkSync(DATA_FILE); } catch { /* not found */ }
  });

  afterEach(() => {
    try { unlinkSync(DATA_FILE); } catch { /* not found */ }
  });

  describe("create()", () => {
    it("should create an instance with empty data", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      expect(analyzer).toBeDefined();
    });
  });

  describe("addDataPoint()", () => {
    it("should add a data point and persist", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      const dp = makeDataPoint();
      await analyzer.addDataPoint(dp);

      // Re-create to verify persistence
      const analyzer2 = await HistoricalAnalyzer.create();
      // If data was persisted, analyzePeriod should not throw
      const report = analyzer2.analyzePeriod();
      expect(report.summary.totalDataPoints).toBe(1);
    });

    it("should trim data at MAX_DATA_POINTS", async () => {
      const analyzer = await HistoricalAnalyzer.create();

      // Inject data directly to avoid 10k file writes
      const fakeData = Array.from({ length: TENSION_CONSTANTS.MAX_DATA_POINTS + 5 }, (_, i) =>
        makeDataPoint({ timestamp: Date.now() - (TENSION_CONSTANTS.MAX_DATA_POINTS + 5 - i) * 1000 })
      );
      (analyzer as any).data = fakeData;

      // Adding one more should trigger trimming in addDataPoint
      await analyzer.addDataPoint(makeDataPoint({ timestamp: Date.now() }));

      const report = analyzer.analyzePeriod();
      expect(report.summary.totalDataPoints).toBeLessThanOrEqual(TENSION_CONSTANTS.MAX_DATA_POINTS);
    });
  });

  describe("analyzePeriod()", () => {
    it("should throw when no data available", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      expect(() => analyzer.analyzePeriod()).toThrow("No data available");
    });

    it("should compute summary stats correctly", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      const now = Date.now();

      await analyzer.addDataPoint(makeDataPoint({ timestamp: now - 2000, volume: 10, riskScore: 20 }));
      await analyzer.addDataPoint(makeDataPoint({ timestamp: now - 1000, volume: 30, riskScore: 40 }));
      await analyzer.addDataPoint(makeDataPoint({ timestamp: now, volume: 20, riskScore: 30 }));

      const report = analyzer.analyzePeriod();
      expect(report.summary.totalDataPoints).toBe(3);
      expect(report.summary.avgTensions.volume).toBe(20);
      expect(report.summary.peakTensions.volume).toBe(30);
      expect(report.summary.minTensions.volume).toBe(10);
      expect(report.summary.avgRiskScore).toBe(30);
    });

    it("should filter by date range", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      const now = Date.now();

      await analyzer.addDataPoint(makeDataPoint({ timestamp: now - 3000 }));
      await analyzer.addDataPoint(makeDataPoint({ timestamp: now - 2000 }));
      await analyzer.addDataPoint(makeDataPoint({ timestamp: now - 1000 }));
      await analyzer.addDataPoint(makeDataPoint({ timestamp: now }));

      const report = analyzer.analyzePeriod(
        new Date(now - 2500),
        new Date(now - 500)
      );
      expect(report.summary.totalDataPoints).toBe(2);
    });

    it("should compute trend analysis for each field", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        await analyzer.addDataPoint(makeDataPoint({
          timestamp: now - (10 - i) * 60_000,
          volume: 50 + i,
        }));
      }

      const report = analyzer.analyzePeriod();
      // Each tension field should have a trend analysis object
      for (const field of ["volume", "link", "profile", "security", "compliance"] as const) {
        expect(report.trends[field]).toBeDefined();
        expect(["increasing", "decreasing", "stable"]).toContain(report.trends[field].direction);
        expect(report.trends[field].slope).toBeTypeOf("number");
        // Strength/confidence may be NaN for constant-value fields (zero variance)
        expect(report.trends[field]).toHaveProperty("strength");
        expect(report.trends[field]).toHaveProperty("confidence");
      }
    });

    it("should detect stable trend when values are constant", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        await analyzer.addDataPoint(makeDataPoint({
          timestamp: now - (10 - i) * 60_000,
          volume: 50,
          link: 50,
          profile: 50,
          security: 50,
          compliance: 50,
        }));
      }

      const report = analyzer.analyzePeriod();
      expect(report.trends.volume.direction).toBe("stable");
    });

    it("should include patterns in report", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        await analyzer.addDataPoint(makeDataPoint({
          timestamp: now - (10 - i) * 60_000,
          volume: 50 + i,
          link: 50 + i,
        }));
      }

      const report = analyzer.analyzePeriod();
      expect(report.patterns).toBeArray();
    });

    it("should generate recommendations", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      const now = Date.now();

      for (let i = 0; i < 5; i++) {
        await analyzer.addDataPoint(makeDataPoint({
          timestamp: now - (5 - i) * 60_000,
        }));
      }

      const report = analyzer.analyzePeriod();
      expect(report.recommendations).toBeArray();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("risk assessment", () => {
    it("should assess LOW risk for calm data", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        await analyzer.addDataPoint(makeDataPoint({
          timestamp: now - (10 - i) * 60_000,
          volume: 10,
          link: 10,
          profile: 10,
          security: 10,
          compliance: 10,
          riskScore: 5,
        }));
      }

      const report = analyzer.analyzePeriod();
      expect(report.riskAssessment.overallRisk).toBe("LOW");
      expect(report.riskAssessment.probabilityOfCrisis).toBeLessThan(0.5);
    });

    it("should assess HIGH/CRITICAL risk for extreme values", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        await analyzer.addDataPoint(makeDataPoint({
          timestamp: now - (10 - i) * 60_000,
          volume: 96 + i,
          security: 96 + i,
          riskScore: 90 + i,
          anomalies: [
            { type: "spike", severity: "HIGH", confidence: 0.9, description: "test" },
            { type: "spike", severity: "HIGH", confidence: 0.9, description: "test2" },
            { type: "spike", severity: "HIGH", confidence: 0.9, description: "test3" },
          ],
        }));
      }

      const report = analyzer.analyzePeriod();
      expect(["HIGH", "CRITICAL"]).toContain(report.riskAssessment.overallRisk);
      expect(report.riskAssessment.riskFactors.length).toBeGreaterThan(0);
      expect(report.riskAssessment.recommendedActions.length).toBeGreaterThan(0);
    });

    it("should include risk factors in assessment", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      const now = Date.now();

      for (let i = 0; i < 5; i++) {
        await analyzer.addDataPoint(makeDataPoint({
          timestamp: now - (5 - i) * 60_000,
          volume: 96,
        }));
      }

      const report = analyzer.analyzePeriod();
      expect(report.riskAssessment.riskFactors).toBeArray();
    });
  });

  describe("exportReport()", () => {
    it("should export as JSON", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      const now = Date.now();

      await analyzer.addDataPoint(makeDataPoint({ timestamp: now }));

      const report = analyzer.analyzePeriod();
      const json = analyzer.exportReport(report, "json");

      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.summary).toBeDefined();
      expect(parsed.period).toBeDefined();
    });

    it("should export as CSV with correct headers", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      await analyzer.addDataPoint(makeDataPoint({ timestamp: Date.now() }));

      const report = analyzer.analyzePeriod();
      const csv = analyzer.exportReport(report, "csv");
      const lines = csv.split("\n");

      expect(lines[0]).toContain("Metric");
      expect(lines[0]).toContain("Volume");
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it("should export as HTML", async () => {
      const analyzer = await HistoricalAnalyzer.create();
      await analyzer.addDataPoint(makeDataPoint({ timestamp: Date.now() }));

      const report = analyzer.analyzePeriod();
      const html = analyzer.exportReport(report, "html");

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Tension Field Historical Analysis");
    });
  });
});
