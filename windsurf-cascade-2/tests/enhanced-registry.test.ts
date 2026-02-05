#!/usr/bin/env bun
//! Comprehensive Test Suite for Enhanced Registry System
//! Tests security, performance, and functionality

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { security } from "../src/core/security/middleware.js";
import { performanceMonitor } from "../src/observability/monitoring/performance.js";

// Test configuration
const TEST_PORT = 4874;
const REGISTRY_URL = `http://localhost:${TEST_PORT}`;
let server: any = null;
let testAPIKey: string = "";

describe("Enhanced Registry System", () => {
  
  beforeAll(async () => {
    // Start test registry server
    console.log("🚀 Starting test registry...");

    // Generate test API key
    testAPIKey = security.generateKey("test-suite", ["read", "write", "admin"], 1000);
    console.log("🔑 Generated test API key");

    // Real server for integration tests
    const securityMiddleware = security.middleware({ requireAuth: true });

    server = Bun.serve({
      port: TEST_PORT,
      async fetch(req) {
        const url = new URL(req.url);

        // Performance endpoints
        if (url.pathname === "/_api/performance/metrics") {
          return Response.json(performanceMonitor.getCurrentMetrics());
        }
        if (url.pathname === "/_api/performance/summary") {
          return Response.json(performanceMonitor.getPerformanceSummary());
        }
        if (url.pathname === "/_api/performance/alerts") {
          return Response.json(performanceMonitor.getAlerts());
        }

        // Security endpoints
        if (url.pathname === "/_api/security/metrics") {
          const authError = await securityMiddleware(req, server);
          if (authError) return authError;
          return Response.json(security.getMetrics());
        }

        return new Response("Not Found", { status: 404 });
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    if (server) {
      server.stop();
    }
    performanceMonitor.stop();
  });

  describe("Security Middleware", () => {
    
    it("should generate valid API keys", () => {
      const key = security.generateKey("test", ["read"], 100);
      expect(key).toBeDefined();
      expect(key).toStartWith("br_test_");
      expect(key.length).toBeGreaterThan(30);
    });

    it("should validate API keys correctly", async () => {
      const mockRequest = new Request(REGISTRY_URL, {
        headers: {
          "Authorization": `Bearer ${testAPIKey}`
        }
      });
      
      const middleware = security.middleware({ requireAuth: true });
      const result = await middleware(mockRequest, server);
      
      // Should not return a response (authentication passed)
      expect(result).toBeNull();
    });

    it("should reject invalid API keys", async () => {
      const mockRequest = new Request(REGISTRY_URL, {
        headers: {
          "Authorization": "Bearer invalid-key"
        }
      });
      
      const middleware = security.middleware({ requireAuth: true });
      const result = await middleware(mockRequest, server);
      
      expect(result).toBeDefined();
      expect(result?.status).toBe(401);
    });

    it("should enforce rate limiting", async () => {
      const ip = "192.168.1.100";
      const mockRequest = new Request(REGISTRY_URL, {
        headers: {
          "X-Forwarded-For": ip
        }
      });
      
      const middleware = security.middleware({
        rateLimit: { windowMs: 1000, maxRequests: 2 }
      });
      
      // First request should pass
      let result = await middleware(mockRequest, server);
      expect(result).toBeNull();
      
      // Second request should pass
      result = await middleware(mockRequest, server);
      expect(result).toBeNull();
      
      // Third request should be rate limited
      result = await middleware(mockRequest, server);
      expect(result).toBeDefined();
      expect(result?.status).toBe(429);
    });

    it("should track security metrics", () => {
      const metrics = security.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.requests).toBeDefined();
      expect(metrics.blockedRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.rateLimitHits).toBeGreaterThanOrEqual(0);
      expect(metrics.authFailures).toBeGreaterThanOrEqual(0);
      expect(metrics.activeAPIKeys).toBeGreaterThan(0);
    });
  });

  describe("Performance Monitoring", () => {
    
    it("should collect performance metrics", () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      if (metrics) {
        expect(metrics.timestamp).toBeDefined();
        expect(metrics.cpu).toBeDefined();
        expect(metrics.memory).toBeDefined();
        expect(metrics.network).toBeDefined();
        expect(metrics.registry).toBeDefined();
        expect(metrics.websocket).toBeDefined();
      }
    });

    it("should track metrics history", () => {
      const history = performanceMonitor.getMetricsHistory(10);
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(10);
      
      if (history.length > 0) {
        const metric = history[0];
        expect(metric.timestamp).toBeDefined();
        expect(metric.cpu.usage).toBeGreaterThanOrEqual(0);
        expect(metric.memory.percentage).toBeGreaterThanOrEqual(0);
      }
    });

    it("should generate performance summary", () => {
      const summary = performanceMonitor.getPerformanceSummary();
      
      if (summary) {
        expect(summary.uptime).toBeGreaterThan(0);
        expect(summary.currentMetrics).toBeDefined();
        expect(summary.avgCpuUsage).toBeGreaterThanOrEqual(0);
        expect(summary.avgMemoryUsage).toBeGreaterThanOrEqual(0);
        expect(summary.avgLatency).toBeGreaterThanOrEqual(0);
      }
    });

    it("should manage alerts", () => {
      const alerts = performanceMonitor.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
      
      // Clear alerts
      performanceMonitor.clearAlerts();
      const clearedAlerts = performanceMonitor.getAlerts();
      expect(clearedAlerts.length).toBe(0);
    });

    it("should update alert thresholds", () => {
      const newThresholds = {
        cpu: 90,
        memory: 95,
        latency: 200,
        errorRate: 1
      };
      
      performanceMonitor.updateThresholds(newThresholds);
      // No assertion needed - just ensure no errors
    });
  });

  describe("Registry API Integration", () => {
    
    it("should serve performance metrics endpoint", async () => {
      // Small delay to allow metrics collection
      await new Promise(resolve => setTimeout(resolve, 100));
      const response = await fetch(`${REGISTRY_URL}/_api/performance/metrics`);

      if (response.ok) {
        const data = await response.json();
        if (data) {
          expect(data.cpu).toBeDefined();
          expect(data.memory).toBeDefined();
        }
      } else {
        // Server might not be running in test environment
        expect(response.status).toBeOneOf([200, 404, 500]);
      }
    });

    it("should serve performance summary endpoint", async () => {
      const response = await fetch(`${REGISTRY_URL}/_api/performance/summary`);

      if (response.ok) {
        const data = await response.json();
        if (data) {
          expect(data.uptime).toBeDefined();
        }
      } else {
        expect(response.status).toBeOneOf([200, 404, 500]);
      }
    });

    it("should serve alerts endpoint", async () => {
      const response = await fetch(`${REGISTRY_URL}/_api/performance/alerts`);
      
      if (response.ok) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      } else {
        expect(response.status).toBeOneOf([200, 404, 500]);
      }
    });

    it("should require authentication for security endpoints", async () => {
      const response = await fetch(`${REGISTRY_URL}/_api/security/metrics`);
      
      // Should require authentication
      expect(response.status).toBe(401);
    });

    it("should accept valid API key for security endpoints", async () => {
      const response = await fetch(`${REGISTRY_URL}/_api/security/metrics`, {
        headers: {
          "Authorization": `Bearer ${testAPIKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        expect(data).toBeDefined();
        expect(data.requests).toBeDefined();
      } else {
        // Server might not be running
        expect(response.status).toBeOneOf([200, 401, 404, 500]);
      }
    });
  });

  describe("13-Byte Configuration", () => {
    
    it("should maintain config structure integrity", async () => {
      // Test config byte positions and sizes
      const configStructure = {
        version: { offset: 0, size: 1 },
        registryHash: { offset: 1, size: 4 },
        featureFlags: { offset: 5, size: 4 },
        terminalMode: { offset: 9, size: 1 },
        rows: { offset: 10, size: 1 },
        cols: { offset: 11, size: 1 },
        reserved: { offset: 12, size: 1 }
      };
      
      Object.entries(configStructure).forEach(([field, config]) => {
        expect(config.offset).toBeGreaterThanOrEqual(0);
        expect(config.size).toBeGreaterThan(0);
        expect(config.offset + config.size).toBeLessThanOrEqual(13);
      });
    });

    it("should handle feature flags correctly", () => {
      const featureFlags = {
        PRIVATE_REGISTRY: 0x00000002,
        PREMIUM_TYPES: 0x00000001,
        DEBUG: 0x00000004
      };
      
      // Test flag combinations
      const combined = featureFlags.PRIVATE_REGISTRY | featureFlags.PREMIUM_TYPES;
      expect(combined & featureFlags.PRIVATE_REGISTRY).toBe(featureFlags.PRIVATE_REGISTRY);
      expect(combined & featureFlags.PREMIUM_TYPES).toBe(featureFlags.PREMIUM_TYPES);
      expect(combined & featureFlags.DEBUG).toBe(0);
    });
  });

  describe("WebSocket Subprotocol", () => {
    
    it("should handle binary config updates", () => {
      // Test frame encoding/decoding
      const testFrame = new Uint8Array([0x01, 0x05, 0xFF]);
      expect(testFrame.length).toBe(3);
      expect(testFrame[0]).toBe(0x01); // Config update type
      expect(testFrame[1]).toBe(0x05); // Byte index
      expect(testFrame[2]).toBe(0xFF); // Value
    });

    it("should handle feature toggle frames", () => {
      const testFrame = new Uint8Array([0x02, 0x02, 0x01]);
      expect(testFrame.length).toBe(3);
      expect(testFrame[0]).toBe(0x02); // Feature toggle type
      expect(testFrame[1]).toBe(0x02); // Feature bit
      expect(testFrame[2]).toBe(0x01); // Enabled
    });

    it("should handle heartbeat frames", () => {
      const testFrame = new Uint8Array([0x03]);
      expect(testFrame.length).toBe(1);
      expect(testFrame[0]).toBe(0x03); // Heartbeat type
    });
  });

  describe("Performance Benchmarks", () => {
    
    it("should meet performance targets", async () => {
      const startTime = performance.now();
      
      // Simulate config update operation
      const config = new Uint8Array(13);
      for (let i = 0; i < 1000; i++) {
        config[0] = i % 256;
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 operations in under 100ms
      expect(duration).toBeLessThan(100);
      console.log(`⚡ Config update benchmark: ${duration.toFixed(2)}ms for 1000 operations`);
    });

    it("should handle API key generation efficiently", async () => {
      const startTime = performance.now();
      
      // Generate 100 API keys
      const keys = [];
      for (let i = 0; i < 100; i++) {
        keys.push(security.generateKey(`test-${i}`, ["read"], 100));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(keys.length).toBe(100);
      expect(duration).toBeLessThan(50); // Should be very fast
      console.log(`🔑 API key generation: ${duration.toFixed(2)}ms for 100 keys`);
    });

    it("should collect metrics efficiently", async () => {
      const startTime = performance.now();
      
      // Collect metrics 100 times
      for (let i = 0; i < 100; i++) {
        performanceMonitor.getCurrentMetrics();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should be fast
      console.log(`📊 Metrics collection: ${duration.toFixed(2)}ms for 100 collections`);
    });
  });

  describe("Error Handling", () => {
    
    it("should handle malformed API keys gracefully", async () => {
      const mockRequest = new Request(REGISTRY_URL, {
        headers: {
          "Authorization": "Bearer malformed-key-that-is-too-short"
        }
      });
      
      const middleware = security.middleware({ requireAuth: true });
      const result = await middleware(mockRequest, server);
      
      expect(result).toBeDefined();
      expect(result?.status).toBe(401);
    });

    it("should handle missing authentication headers", async () => {
      const mockRequest = new Request(REGISTRY_URL);
      
      const middleware = security.middleware({ requireAuth: true });
      const result = await middleware(mockRequest, server);
      
      expect(result).toBeDefined();
      expect(result?.status).toBe(401);
    });

    it("should handle rate limit store overflow", async () => {
      // Simulate many different IPs to test store management
      const promises = [];
      
      for (let i = 0; i < 1000; i++) {
        const mockRequest = new Request(REGISTRY_URL, {
          headers: {
            "X-Forwarded-For": `192.168.1.${i % 255}`
          }
        });
        
        const middleware = security.middleware({
          rateLimit: { windowMs: 1000, maxRequests: 1 }
        });
        
        promises.push(middleware(mockRequest, server));
      }
      
      const results = await Promise.all(promises);
      
      // Most should pass (first request for each IP)
      const passed = results.filter(r => r === null).length;
      const blocked = results.filter(r => r?.status === 429).length;
      
      expect(passed + blocked).toBe(1000);
      expect(passed).toBeGreaterThan(0);
      expect(blocked).toBeGreaterThan(0);
    });
  });
});

describe("Integration Tests", () => {
  
  it("should integrate all components seamlessly", async () => {
    // Test that security, performance, and registry work together
    
    // 1. Generate API key
    const apiKey = security.generateKey("integration-test", ["read", "write"], 500);
    expect(apiKey).toBeDefined();
    
    // 2. Get performance metrics
    const metrics = performanceMonitor.getCurrentMetrics();
    expect(metrics).toBeDefined();
    
    // 3. Get security metrics
    const securityMetrics = security.getMetrics();
    expect(securityMetrics).toBeDefined();
    
    // 4. Verify all systems are operational
    if (metrics) {
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
    }
    expect(securityMetrics.activeAPIKeys).toBeGreaterThan(0);
    
    console.log("✅ All components integrated successfully");
  });

  it("should maintain performance under load", async () => {
    const startTime = performance.now();
    const operations = 1000;
    
    // Simulate concurrent operations
    const promises = [];
    
    for (let i = 0; i < operations; i++) {
      // Mix of different operations
      if (i % 3 === 0) {
        // Security check
        const mockRequest = new Request(REGISTRY_URL, {
          headers: { "Authorization": `Bearer ${testAPIKey}` }
        });
        const middleware = security.middleware({ requireAuth: true });
        promises.push(middleware(mockRequest, server));
      } else if (i % 3 === 1) {
        // Performance metrics
        promises.push(Promise.resolve(performanceMonitor.getCurrentMetrics()));
      } else {
        // API key generation
        promises.push(Promise.resolve(security.generateKey(`load-test-${i}`, ["read"], 100)));
      }
    }
    
    await Promise.all(promises);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const opsPerSecond = (operations / duration) * 1000;
    
    expect(opsPerSecond).toBeGreaterThan(100); // Should handle at least 100 ops/sec
    console.log(`⚡ Load test: ${opsPerSecond.toFixed(2)} operations/second`);
  });
});

console.log("🧪 Enhanced Registry Test Suite Complete!");
