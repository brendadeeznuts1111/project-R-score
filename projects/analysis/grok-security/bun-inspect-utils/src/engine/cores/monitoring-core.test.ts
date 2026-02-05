// [73.0.0.0] MONITORING CORE TESTS
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { MonitoringCore } from "./monitoring-core";
import type { TensionState, ArchiveMetadata, HealthReport } from "../types";

describe("[73.0.0.0] MonitoringCore", () => {
  let core: MonitoringCore;

  beforeEach(async () => {
    core = new MonitoringCore({ warning: 50, critical: 75 });
    await core.initialize();
  });

  afterEach(() => {
    core.dispose();
  });

  describe("[73.1.0.0] Initialization", () => {
    it("should initialize successfully", () => {
      expect(core.isInitialized()).toBe(true);
    });

    it("should start with zero metrics", () => {
      const metrics = core.getMetrics();
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.totalArchives).toBe(0);
      expect(metrics.totalErrors).toBe(0);
    });
  });

  describe("[73.2.0.0] Tension Recording", () => {
    it("should record tension states", () => {
      const state: TensionState = {
        value: 30,
        lastUpdate: Date.now(),
        errorCount: 0,
        isHealthy: true,
        health: "healthy",
      };

      core.recordTension(state);
      expect(core.getMetrics().totalOperations).toBe(1);
    });

    it("should track peak tension", () => {
      core.recordTension({ value: 30, lastUpdate: 0, errorCount: 0, isHealthy: true, health: "healthy" });
      core.recordTension({ value: 80, lastUpdate: 0, errorCount: 0, isHealthy: false, health: "critical" });
      core.recordTension({ value: 50, lastUpdate: 0, errorCount: 0, isHealthy: false, health: "warning" });

      expect(core.getMetrics().peakTension).toBe(80);
    });

    it("should calculate average tension", () => {
      core.recordTension({ value: 20, lastUpdate: 0, errorCount: 0, isHealthy: true, health: "healthy" });
      core.recordTension({ value: 40, lastUpdate: 0, errorCount: 0, isHealthy: true, health: "healthy" });
      core.recordTension({ value: 60, lastUpdate: 0, errorCount: 0, isHealthy: false, health: "warning" });

      expect(core.getMetrics().averageTension).toBe(40);
    });
  });

  describe("[73.3.0.0] Archive Recording", () => {
    it("should record archives", () => {
      const metadata: ArchiveMetadata = {
        archiveId: "test-123",
        timestamp: Date.now(),
        fileCount: 5,
        originalSize: 10000,
        compressedSize: 2000,
        compressionRatio: 20,
        format: "gzip",
        level: 9,
        status: "completed",
      };

      core.recordArchive(metadata);
      expect(core.getMetrics().totalArchives).toBe(1);
    });

    it("should include last archive in health report", () => {
      const metadata: ArchiveMetadata = {
        archiveId: "test-456",
        timestamp: Date.now(),
        fileCount: 3,
        originalSize: 5000,
        compressedSize: 1000,
        compressionRatio: 20,
        format: "gzip",
        level: 9,
        status: "completed",
      };

      core.recordArchive(metadata);
      const health = core.getHealthReport();
      expect(health.lastArchive?.archiveId).toBe("test-456");
    });
  });

  describe("[73.4.0.0] Error Recording", () => {
    it("should record errors", () => {
      core.recordError();
      core.recordError();

      expect(core.getMetrics().totalErrors).toBe(2);
    });
  });

  describe("[73.5.0.0] Health Report", () => {
    it("should report healthy status", () => {
      core.recordTension({ value: 30, lastUpdate: 0, errorCount: 0, isHealthy: true, health: "healthy" });

      const health = core.getHealthReport();
      expect(health.status).toBe("healthy");
      expect(health.tension).toBe(30);
    });

    it("should include uptime", () => {
      const health = core.getHealthReport();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });

    it("should emit health changes", () => {
      let receivedHealth: HealthReport | null = null;
      core.subscribeHealth((health) => {
        receivedHealth = health;
      });

      core.recordTension({ value: 80, lastUpdate: 0, errorCount: 0, isHealthy: false, health: "critical" });
      expect(receivedHealth?.status).toBe("critical");
    });
  });

  describe("[73.6.0.0] Reset", () => {
    it("should reset all metrics", () => {
      core.recordTension({ value: 80, lastUpdate: 0, errorCount: 0, isHealthy: false, health: "critical" });
      core.recordError();

      core.reset();

      const metrics = core.getMetrics();
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.totalErrors).toBe(0);
      expect(metrics.peakTension).toBe(0);
    });
  });
});

