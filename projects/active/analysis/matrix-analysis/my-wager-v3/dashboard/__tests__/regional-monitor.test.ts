#!/usr/bin/env bun
// Regional Monitor Test Suite
// [TENSION-TEST-004]
// RegionalMonitor is not exported from the module. We re-implement a minimal
// version that matches the same logic to test the algorithms without needing
// to import the module (which starts a server at module scope).

import { describe, it, expect, beforeEach } from "bun:test";

// ── Replicate core types from regional-monitor.ts ────────────────────

interface RegionStatus {
  region: string;
  status: "active" | "idle" | "error";
  lastUpdate: number;
  metrics: {
    parseTime: number;
    testCount: number;
    passRate: number;
    coverage: number;
    duration: number;
  };
  sealId: string;
}

interface Col93Matrix {
  totalEntries: number;
  averageParseTime: string;
  maxParseTime: string;
  performanceGrade: string;
  regions: Record<string, RegionStatus>;
}

interface WindowProxyInfo {
  id: string;
  origin: string;
  status: "active" | "inactive" | "closed";
  lastActivity: number;
}

// ── Minimal RegionalMonitor matching the production code ─────────────

class TestableRegionalMonitor {
  private regions: Map<string, RegionStatus> = new Map();
  private windowProxies: Map<string, WindowProxyInfo> = new Map();
  private col93Matrix: Col93Matrix = {
    totalEntries: 0,
    averageParseTime: "0.000ms",
    maxParseTime: "0.000ms",
    performanceGrade: "✅ EXCELLENT",
    regions: {},
  };

  constructor() {
    this.initializeRegions();
  }

  private initializeRegions(): void {
    const defaultRegion: RegionStatus = {
      region: "",
      status: "idle",
      lastUpdate: Date.now(),
      metrics: {
        parseTime: 0,
        testCount: 0,
        passRate: 0,
        coverage: 0,
        duration: 0,
      },
      sealId: "",
    };

    ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1", "sa-east-1"].forEach(region => {
      this.regions.set(region, { ...defaultRegion, region });
      this.col93Matrix.regions[region] = { ...defaultRegion, region };
    });
  }

  updateRegion(data: {
    region: string;
    status: RegionStatus["status"];
    metrics: Partial<RegionStatus["metrics"]>;
    sealId?: string;
  }): void {
    const region = this.regions.get(data.region);
    if (!region) return;

    region.status = data.status;
    region.lastUpdate = Date.now();
    region.metrics = { ...region.metrics, ...data.metrics };
    if (data.sealId) region.sealId = data.sealId;

    this.col93Matrix.regions[data.region] = { ...region };
  }

  getMatrix(): Col93Matrix {
    return { ...this.col93Matrix };
  }

  getRegionStatus(region: string): RegionStatus | undefined {
    return this.regions.get(region);
  }

  getAllRegions(): RegionStatus[] {
    return Array.from(this.regions.values());
  }

  addWindowProxy(proxyInfo: WindowProxyInfo): void {
    this.windowProxies.set(proxyInfo.id, proxyInfo);
  }

  removeWindowProxy(id: string): boolean {
    return this.windowProxies.delete(id);
  }

  getAllWindowProxies(): WindowProxyInfo[] {
    return Array.from(this.windowProxies.values());
  }

  getWindowProxyStats(): {
    total: number;
    active: number;
    inactive: number;
    origins: string[];
  } {
    const proxies = this.getAllWindowProxies();
    return {
      total: proxies.length,
      active: proxies.filter(p => p.status === "active").length,
      inactive: proxies.filter(p => p.status === "inactive").length,
      origins: Array.from(new Set(proxies.map(p => p.origin))),
    };
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe("RegionalMonitor", () => {
  let monitor: TestableRegionalMonitor;

  beforeEach(() => {
    monitor = new TestableRegionalMonitor();
  });

  describe("initialization", () => {
    it("should initialize with 5 default regions", () => {
      const regions = monitor.getAllRegions();
      expect(regions.length).toBe(5);
    });

    it("should have expected region names", () => {
      const names = monitor.getAllRegions().map(r => r.region);
      expect(names).toContain("us-east-1");
      expect(names).toContain("us-west-2");
      expect(names).toContain("eu-west-1");
      expect(names).toContain("ap-southeast-1");
      expect(names).toContain("sa-east-1");
    });

    it("should start all regions as idle", () => {
      for (const region of monitor.getAllRegions()) {
        expect(region.status).toBe("idle");
      }
    });

    it("should initialize metrics to zero", () => {
      const region = monitor.getRegionStatus("us-east-1")!;
      expect(region.metrics.parseTime).toBe(0);
      expect(region.metrics.testCount).toBe(0);
      expect(region.metrics.passRate).toBe(0);
      expect(region.metrics.coverage).toBe(0);
      expect(region.metrics.duration).toBe(0);
    });
  });

  describe("updateRegion()", () => {
    it("should update region status", () => {
      monitor.updateRegion({
        region: "us-east-1",
        status: "active",
        metrics: { testCount: 42 },
      });

      const region = monitor.getRegionStatus("us-east-1")!;
      expect(region.status).toBe("active");
      expect(region.metrics.testCount).toBe(42);
    });

    it("should merge partial metrics without overwriting others", () => {
      monitor.updateRegion({
        region: "eu-west-1",
        status: "active",
        metrics: { parseTime: 1.5, coverage: 85 },
      });

      const region = monitor.getRegionStatus("eu-west-1")!;
      expect(region.metrics.parseTime).toBe(1.5);
      expect(region.metrics.coverage).toBe(85);
      expect(region.metrics.testCount).toBe(0); // untouched
    });

    it("should update sealId when provided", () => {
      monitor.updateRegion({
        region: "us-west-2",
        status: "active",
        metrics: {},
        sealId: "seal-abc-123",
      });

      const region = monitor.getRegionStatus("us-west-2")!;
      expect(region.sealId).toBe("seal-abc-123");
    });

    it("should ignore updates for non-existent regions", () => {
      monitor.updateRegion({
        region: "non-existent",
        status: "active",
        metrics: { testCount: 99 },
      });

      expect(monitor.getRegionStatus("non-existent")).toBeUndefined();
    });
  });

  describe("getMatrix()", () => {
    it("should return a copy, not a reference", () => {
      const matrix1 = monitor.getMatrix();
      const matrix2 = monitor.getMatrix();
      expect(matrix1).not.toBe(matrix2);
      expect(matrix1).toEqual(matrix2);
    });

    it("should reflect region updates", () => {
      monitor.updateRegion({
        region: "us-east-1",
        status: "active",
        metrics: { passRate: 99.5 },
      });

      const matrix = monitor.getMatrix();
      expect(matrix.regions["us-east-1"].status).toBe("active");
      expect(matrix.regions["us-east-1"].metrics.passRate).toBe(99.5);
    });
  });

  describe("WindowProxy management", () => {
    it("should add a window proxy", () => {
      monitor.addWindowProxy({
        id: "proxy-1",
        origin: "https://example.com",
        status: "active",
        lastActivity: Date.now(),
      });

      const proxies = monitor.getAllWindowProxies();
      expect(proxies.length).toBe(1);
      expect(proxies[0].id).toBe("proxy-1");
    });

    it("should remove a window proxy", () => {
      monitor.addWindowProxy({
        id: "proxy-2",
        origin: "https://test.com",
        status: "active",
        lastActivity: Date.now(),
      });

      const removed = monitor.removeWindowProxy("proxy-2");
      expect(removed).toBe(true);
      expect(monitor.getAllWindowProxies().length).toBe(0);
    });

    it("should return false when removing non-existent proxy", () => {
      const removed = monitor.removeWindowProxy("does-not-exist");
      expect(removed).toBe(false);
    });

    it("should compute proxy stats correctly", () => {
      monitor.addWindowProxy({
        id: "p1",
        origin: "https://a.com",
        status: "active",
        lastActivity: Date.now(),
      });
      monitor.addWindowProxy({
        id: "p2",
        origin: "https://b.com",
        status: "inactive",
        lastActivity: Date.now(),
      });
      monitor.addWindowProxy({
        id: "p3",
        origin: "https://a.com",
        status: "active",
        lastActivity: Date.now(),
      });

      const stats = monitor.getWindowProxyStats();
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
      expect(stats.origins).toContain("https://a.com");
      expect(stats.origins).toContain("https://b.com");
      expect(stats.origins.length).toBe(2); // deduplicated
    });

    it("should start with empty proxy list", () => {
      const stats = monitor.getWindowProxyStats();
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.inactive).toBe(0);
      expect(stats.origins).toEqual([]);
    });
  });
});
