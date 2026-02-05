#!/usr/bin/env bun

/**
 * Monitoring System Tests
 *
 * Tests for the monitoring system including:
 * - Device fingerprinting
 * - Device type detection
 * - IP tracking
 * - Rate limiting
 * - Environment isolation
 */

// @ts-ignore - Bun types are available at runtime
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { MonitoringSystem } from "../../../src/server/MonitoringSystem.js";
import path from "node:path";

describe("🔍 Monitoring System Tests", () => {
  let monitoring: MonitoringSystem;
  const testDbPath = path.join(process.env.TMPDIR || "/tmp", `test-monitoring-${Date.now()}.db`);

  beforeEach(() => {
    // Create fresh monitoring system for each test
    monitoring = new MonitoringSystem(testDbPath);
  });

  afterEach(() => {
    // Cleanup
    monitoring.close();
    // Delete test database
    try {
      const fs = require("fs");
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      // Also try to delete -wal and -shm files
      if (fs.existsSync(testDbPath + "-wal")) {
        fs.unlinkSync(testDbPath + "-wal");
      }
      if (fs.existsSync(testDbPath + "-shm")) {
        fs.unlinkSync(testDbPath + "-shm");
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Device Fingerprinting", () => {
    test("generateDeviceFingerprint creates unique fingerprints", () => {
      const req1 = new Request("http://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
          "accept-language": "en-US",
        },
      });

      const req2 = new Request("http://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 (Android 10)",
          "accept-language": "en-US",
        },
      });

      const fp1 = monitoring.generateDeviceFingerprint(req1);
      const fp2 = monitoring.generateDeviceFingerprint(req2);

      expect(typeof fp1).toBe("string");
      expect(typeof fp2).toBe("string");
      expect(fp1).not.toBe(fp2);
    });

    test("generateDeviceFingerprint is consistent for same headers", () => {
      const req = new Request("http://example.com", {
        headers: {
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
          "accept-language": "en-US",
          "accept-encoding": "gzip",
        },
      });

      const fp1 = monitoring.generateDeviceFingerprint(req);
      const fp2 = monitoring.generateDeviceFingerprint(req);

      expect(fp1).toBe(fp2);
    });
  });

  describe("Device Type Detection", () => {
    test("determineDeviceType identifies iOS devices", () => {
      const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)";
      const deviceType = monitoring.determineDeviceType(userAgent);
      expect(deviceType).toBe("ios");
    });

    test("determineDeviceType identifies Android devices", () => {
      const userAgent = "Mozilla/5.0 (Linux; Android 10)";
      const deviceType = monitoring.determineDeviceType(userAgent);
      expect(deviceType).toBe("android");
    });

    test("determineDeviceType identifies Windows devices", () => {
      const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
      const deviceType = monitoring.determineDeviceType(userAgent);
      expect(deviceType).toBe("windows");
    });

    test("determineDeviceType identifies macOS devices", () => {
      const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
      const deviceType = monitoring.determineDeviceType(userAgent);
      expect(deviceType).toBe("macos");
    });

    test("determineDeviceType identifies Linux devices", () => {
      const userAgent = "Mozilla/5.0 (X11; Linux x86_64)";
      const deviceType = monitoring.determineDeviceType(userAgent);
      expect(deviceType).toBe("linux");
    });

    test("determineDeviceType returns unknown for unrecognized agents", () => {
      const userAgent = "SomeUnknownBrowser/1.0";
      const deviceType = monitoring.determineDeviceType(userAgent);
      expect(deviceType).toBe("unknown");
    });
  });

  describe("IP Address Extraction", () => {
    test("getClientIP extracts IP from x-forwarded-for header", () => {
      const req = new Request("http://example.com", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });

      const ip = monitoring.getClientIP(req);
      expect(ip).toBe("192.168.1.1");
    });

    test("getClientIP extracts IP from x-real-ip header", () => {
      const req = new Request("http://example.com", {
        headers: {
          "x-real-ip": "192.168.1.2",
        },
      });

      const ip = monitoring.getClientIP(req);
      expect(ip).toBe("192.168.1.2");
    });

    test("getClientIP returns localhost for local requests", () => {
      const req = new Request("http://example.com");

      const ip = monitoring.getClientIP(req);
      expect(ip).toBe("127.0.0.1");
    });
  });

  describe("Event Recording", () => {
    test("recordEvent stores event data", () => {
      const event = {
        timestamp: Date.now(),
        ip: "192.168.1.1",
        environment: "development",
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        userAgent: "TestAgent/1.0",
        deviceType: "unknown",
        deviceFingerprint: "test-fp-123",
        path: "/api/test",
      };

      monitoring.recordEvent(event);

      const summary = monitoring.getSummary();
      expect(summary.totalEvents).toBe(1);
    });

    test("recordEvent updates device tracking", () => {
      const event = {
        timestamp: Date.now(),
        ip: "192.168.1.1",
        environment: "development",
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        userAgent: "TestAgent/1.0",
        deviceType: "ios",
        deviceFingerprint: "test-fp-123",
        path: "/api/test",
      };

      monitoring.recordEvent(event);

      const summary = monitoring.getSummary();
      expect(summary.uniqueDevices).toBe(1);
    });

    test("recordEvent updates IP statistics", () => {
      const event = {
        timestamp: Date.now(),
        ip: "192.168.1.1",
        environment: "development",
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        path: "/api/test",
      };

      monitoring.recordEvent(event);
      monitoring.recordEvent({ ...event, timestamp: Date.now() });

      const topIPs = monitoring.getTopIPs("development", 10);
      expect(topIPs.length).toBe(1);
      expect(topIPs[0].ip).toBe("192.168.1.1");
      expect(topIPs[0].requestCount).toBe(2);
    });
  });

  describe("Rate Limiting", () => {
    test("isRateLimited returns false for new IPs", () => {
      const isLimited = monitoring.isRateLimited("192.168.1.100", "development", 10, 60);
      expect(isLimited).toBe(false);
    });

    test("isRateLimited returns true after threshold", () => {
      const ip = "192.168.1.101";
      const env = "development";

      // Record 11 events
      for (let i = 0; i < 11; i++) {
        monitoring.recordEvent({
          timestamp: Date.now(),
          ip,
          environment: env,
          endpoint: "/api/test",
          method: "GET",
          statusCode: 200,
          responseTime: 100,
          path: "/api/test",
        });
      }

      const isLimited = monitoring.isRateLimited(ip, env, 10, 60);
      expect(isLimited).toBe(true);
    });

    test("isRateLimited respects time window", () => {
      const ip = "192.168.1.102";
      const env = "development";

      // Record old events (outside window)
      const oldTimestamp = Date.now() - (61 * 1000); // 61 seconds ago
      for (let i = 0; i < 11; i++) {
        monitoring.recordEvent({
          timestamp: oldTimestamp,
          ip,
          environment: env,
          endpoint: "/api/test",
          method: "GET",
          statusCode: 200,
          responseTime: 100,
          path: "/api/test",
        });
      }

      // Should not be rate limited since old events are outside window
      const isLimited = monitoring.isRateLimited(ip, env, 10, 60);
      expect(isLimited).toBe(false);
    });
  });

  describe("Environment Isolation", () => {
    test("Events are isolated by environment", () => {
      const event = {
        timestamp: Date.now(),
        ip: "192.168.1.1",
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        path: "/api/test",
      };

      monitoring.recordEvent({ ...event, environment: "development" });
      monitoring.recordEvent({ ...event, environment: "production" });

      const devMetrics = monitoring.getEnvironmentMetrics("development");
      const prodMetrics = monitoring.getEnvironmentMetrics("production");

      expect(devMetrics.totalRequests).toBe(1);
      expect(prodMetrics.totalRequests).toBe(1);
    });

    test("getEnvironments returns all environments", () => {
      const event = {
        timestamp: Date.now(),
        ip: "192.168.1.1",
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        path: "/api/test",
      };

      monitoring.recordEvent({ ...event, environment: "development" });
      monitoring.recordEvent({ ...event, environment: "staging" });
      monitoring.recordEvent({ ...event, environment: "production" });

      const environments = monitoring.getEnvironments();
      expect(environments).toContain("development");
      expect(environments).toContain("staging");
      expect(environments).toContain("production");
    });
  });

  describe("Metrics and Analytics", () => {
    test("getEnvironmentMetrics returns correct metrics", () => {
      const ip = "192.168.1.200";
      const env = "test";

      // Record some events
      for (let i = 0; i < 5; i++) {
        monitoring.recordEvent({
          timestamp: Date.now(),
          ip,
          environment: env,
          endpoint: `/api/endpoint${i}`,
          method: "GET",
          statusCode: i < 4 ? 200 : 500,
          responseTime: 100 + i * 10,
          path: `/api/endpoint${i}`,
        });
      }

      const metrics = monitoring.getEnvironmentMetrics(env);

      expect(metrics.environment).toBe(env);
      expect(metrics.totalRequests).toBe(5);
      expect(metrics.uniqueIPs).toBe(1);
      expect(metrics.errorRate).toBe(0.2); // 1 error out of 5 requests
      expect(metrics.avgResponseTime).toBeGreaterThan(0);
    });

    test("getTopIPs returns IPs sorted by request count", () => {
      const env = "test-sort";

      // Record events for different IPs
      monitoring.recordEvent({
        timestamp: Date.now(),
        ip: "192.168.1.1",
        environment: env,
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        path: "/api/test",
      });

      monitoring.recordEvent({
        timestamp: Date.now(),
        ip: "192.168.1.2",
        environment: env,
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        path: "/api/test",
      });

      monitoring.recordEvent({
        timestamp: Date.now(),
        ip: "192.168.1.2",
        environment: env,
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        path: "/api/test",
      });

      const topIPs = monitoring.getTopIPs(env, 10);

      expect(topIPs.length).toBe(2);
      expect(topIPs[0].ip).toBe("192.168.1.2");
      expect(topIPs[0].requestCount).toBe(2);
      expect(topIPs[1].ip).toBe("192.168.1.1");
      expect(topIPs[1].requestCount).toBe(1);
    });

    test("getTopDevices returns devices sorted by request count", () => {
      const env = "test-devices";

      // Record events for different devices
      monitoring.recordEvent({
        timestamp: Date.now(),
        ip: "192.168.1.1",
        environment: env,
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        userAgent: "iOS/1.0",
        deviceType: "ios",
        deviceFingerprint: "fp-1",
        path: "/api/test",
      });

      monitoring.recordEvent({
        timestamp: Date.now(),
        ip: "192.168.1.2",
        environment: env,
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        userAgent: "Android/1.0",
        deviceType: "android",
        deviceFingerprint: "fp-2",
        path: "/api/test",
      });

      monitoring.recordEvent({
        timestamp: Date.now(),
        ip: "192.168.1.2",
        environment: env,
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        userAgent: "Android/1.0",
        deviceType: "android",
        deviceFingerprint: "fp-2",
        path: "/api/test",
      });

      const topDevices = monitoring.getTopDevices(env, 10);

      expect(topDevices.length).toBe(2);
      expect(topDevices[0].fingerprint).toBe("fp-2");
      expect(topDevices[0].requestCount).toBe(2);
    });
  });

  describe("Data Cleanup", () => {
    test("cleanup removes old events", () => {
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      const newTimestamp = Date.now();

      monitoring.recordEvent({
        timestamp: oldTimestamp,
        ip: "192.168.1.1",
        environment: "development",
        endpoint: "/api/old",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        path: "/api/old",
      });

      monitoring.recordEvent({
        timestamp: newTimestamp,
        ip: "192.168.1.2",
        environment: "development",
        endpoint: "/api/new",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        path: "/api/new",
      });

      const summaryBefore = monitoring.getSummary();
      expect(summaryBefore.totalEvents).toBe(2);

      // Cleanup events older than 7 days
      const deleted = monitoring.cleanup(7);

      expect(deleted).toBe(1);

      const summaryAfter = monitoring.getSummary();
      expect(summaryAfter.totalEvents).toBe(1);
    });
  });

  describe("Summary and Overview", () => {
    test("getSummary returns correct overall summary", () => {
      const event = {
        timestamp: Date.now(),
        ip: "192.168.1.1",
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTime: 100,
        path: "/api/test",
      };

      monitoring.recordEvent({ ...event, environment: "development" });
      monitoring.recordEvent({ ...event, environment: "production" });

      const summary = monitoring.getSummary();

      expect(summary.totalEvents).toBe(2);
      expect(summary.uniqueIPs).toBe(1);
      expect(summary.environments).toContain("development");
      expect(summary.environments).toContain("production");
    });
  });
});
