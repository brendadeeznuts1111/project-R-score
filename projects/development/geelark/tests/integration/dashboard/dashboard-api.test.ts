#!/usr/bin/env bun

/**
 * Dashboard API Tests
 *
 * Tests for the DashboardAPI endpoints including:
 * - Feature flag merging
 * - Build triggering
 * - Metrics endpoint
 * - Health checks
 */

// @ts-ignore - Bun types are available at runtime
import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import { BunServe } from "../../../src/server/BunServe.js";
import { setupDashboardAPI } from "../../../src/server/DashboardAPI.js";
import path from "node:path";

describe("Dashboard API Integration Tests", () => {
  let server: BunServe;
  let baseURL: string;
  const PORT = 3456; // Use different port to avoid conflicts

  beforeAll(async () => {
    // Create test server
    server = new BunServe({
      port: PORT,
      hostname: "localhost",
      cors: {
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        headers: ["Content-Type", "Authorization"],
      },
    });

    // Setup dashboard API routes
    setupDashboardAPI(server);

    // Start server
    server.start();
    baseURL = "http://localhost:" + PORT;

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await server.stop();
  });

  describe("Feature Flags API", () => {
    test("GET /api/flags/meta returns meta.json", async () => {
      const res = await fetch(baseURL + "/api/flags/meta");
      expect(res.ok).toBe(true);
      expect(res.headers.get("content-type")).toContain("application/json");

      const data = await res.json();
      expect(data).toHaveProperty("$schema");
      expect(data).toHaveProperty("meta");
      expect(data).toHaveProperty("featureFlags");
    });

    test("GET /api/flags/merged returns merged flags with Architect additions", async () => {
      const res = await fetch(baseURL + "/api/flags/merged");
      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(data).toHaveProperty("categories");
      expect(data).toHaveProperty("flags");
      expect(data).toHaveProperty("architectFlags");

      // Verify integration category exists
      const integrationCategory = data.categories.find(
        (cat: any) => cat.id === "integration"
      );
      expect(integrationCategory).toBeDefined();
      expect(integrationCategory.flags).toContain("INTEGRATION_GEELARK_API");

      // Verify Architect flags are included
      expect(data.architectFlags).toContain("INTEGRATION_GEELARK_API");
      expect(data.architectFlags).toContain("FEAT_FREE");
      expect(data.architectFlags).toContain("ENV_STAGING");

      // Verify INTEGRATION_GEELARK_API flag definition
      expect(data.flags["INTEGRATION_GEELARK_API"]).toBeDefined();
      expect(data.flags["INTEGRATION_GEELARK_API"].name).toBe("GEELARK API");
      expect(data.flags["INTEGRATION_GEELARK_API"].critical).toBe(true);
    });

    test("Merged flags include all Architect-specific flags", async () => {
      const res = await fetch(baseURL + "/api/flags/merged");
      const data = await res.json();

      // Verify architect flags list is returned
      expect(data.architectFlags).toBeDefined();
      expect(Array.isArray(data.architectFlags)).toBe(true);

      const expectedArchitectFlags = [
        "INTEGRATION_GEELARK_API",
        "INTEGRATION_PROXY_SERVICE",
        "INTEGRATION_EMAIL_SERVICE",
        "INTEGRATION_SMS_SERVICE",
        "FEAT_FREE",
        "FEAT_ENTERPRISE",
        "ENV_STAGING",
        "ENV_TEST",
      ];

      // Check that all expected architect flags are in the architectFlags array
      expectedArchitectFlags.forEach(flag => {
        expect(data.architectFlags).toContain(flag);
      });

      // Verify at least some architect-specific flags are in the flags object
      expect(data.flags["INTEGRATION_GEELARK_API"]).toBeDefined();
      expect(data.flags["INTEGRATION_GEELARK_API"].name).toBe("GEELARK API");
    });
  });

  describe("Build Configuration API", () => {
    test("GET /api/build/configs returns build configurations", async () => {
      const res = await fetch(baseURL + "/api/build/configs");
      expect(res.ok).toBe(true);

      const configs = await res.json();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);

      // Verify config structure
      const firstConfig = configs[0];
      expect(firstConfig).toHaveProperty("name");
      expect(firstConfig).toHaveProperty("description");
      expect(firstConfig).toHaveProperty("features");
      expect(firstConfig).toHaveProperty("sizeEstimate");
    });

    test("Build configs include expected configurations", async () => {
      const res = await fetch(baseURL + "/api/build/configs");
      const configs = await res.json();

      const configNames = configs.map((c: any) => c.name);
      expect(configNames).toContain("development");
      expect(configNames).toContain("production");
    });
  });

  describe("Build Trigger API", () => {
    test("POST /api/build/trigger rejects missing parameters", async () => {
      const res = await fetch(baseURL + "/api/build/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });

    test("POST /api/build/trigger rejects empty flags array", async () => {
      const res = await fetch(baseURL + "/api/build/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configName: "test", flags: [] }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Flags must be a non-empty array");
    });

    test("POST /api/build/trigger accepts valid build request", async () => {
      const res = await fetch(baseURL + "/api/build/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configName: "test-build",
          flags: ["ENV_PRODUCTION", "FEAT_ENCRYPTION"],
        }),
      });

      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("config");
      expect(data.config).toBe("test-build");
      expect(data.flags).toEqual(["ENV_PRODUCTION", "FEAT_ENCRYPTION"]);
    });
  });

  describe("Metrics API", () => {
    test("GET /api/metrics returns runtime metrics", async () => {
      const res = await fetch(baseURL + "/api/metrics");
      expect(res.ok).toBe(true);

      const metrics = await res.json();
      expect(metrics).toHaveProperty("uptime");
      expect(metrics).toHaveProperty("memory");
      expect(metrics).toHaveProperty("cpu");
      expect(metrics).toHaveProperty("timestamp");
      expect(metrics).toHaveProperty("pid");
      expect(metrics).toHaveProperty("platform");

      // Verify memory structure
      expect(metrics.memory).toHaveProperty("rss");
      expect(metrics.memory).toHaveProperty("heapTotal");
      expect(metrics.memory).toHaveProperty("heapUsed");

      // Verify types
      expect(typeof metrics.uptime).toBe("number");
      expect(typeof metrics.timestamp).toBe("number");
      expect(typeof metrics.pid).toBe("number");
    });

    test("Metrics return valid values", async () => {
      const res = await fetch(baseURL + "/api/metrics");
      const metrics = await res.json();

      expect(metrics.uptime).toBeGreaterThan(0);
      expect(metrics.memory.rss).toBeGreaterThan(0);
      expect(metrics.memory.heapUsed).toBeGreaterThan(0);
      expect(metrics.cpu.user).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Health API", () => {
    test("GET /api/health returns health status", async () => {
      const res = await fetch(baseURL + "/api/health");
      expect(res.ok).toBe(true);

      const health = await res.json();
      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("version");
      expect(health).toHaveProperty("timestamp");
      expect(health).toHaveProperty("uptime");

      expect(health.status).toBe("healthy");
      expect(health.uptime).toBeGreaterThan(0);
    });
  });

  describe("Info API", () => {
    test("GET /api/info returns system information", async () => {
      const res = await fetch(baseURL + "/api/info");
      expect(res.ok).toBe(true);

      const info = await res.json();
      expect(info).toHaveProperty("system");
      expect(info).toHaveProperty("build");

      expect(info.system).toHaveProperty("name");
      expect(info.system).toHaveProperty("type");
    });
  });

  describe("CORS Headers", () => {
    test("OPTIONS /api/* returns CORS headers", async () => {
      const res = await fetch(baseURL + "/api/flags/meta", {
        method: "OPTIONS",
      });

      expect(res.ok).toBe(true);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
      expect(res.headers.get("access-control-allow-methods")).toContain("GET");
      expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    });
  });
});
