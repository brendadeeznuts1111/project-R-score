#!/usr/bin/env bun
// test-suite.ts - Comprehensive testing suite for enhanced dashboard

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { EnhancedDashboardServer, type EnhancedDashboardConfig } from "./enhanced-dashboard";

// Test configuration
const testConfig: EnhancedDashboardConfig = {
  server: {
    port: 3334, // Use different port for testing
    host: "localhost",
    cors: {
      origin: ["http://localhost:3001"],
      credentials: true
    },
    rateLimit: {
      windowMs: 60000,
      max: 100
    },
    compression: true
  },
  database: {
    path: "./data/test-audit.db",
    backup: {
      enabled: false, // Disable for testing
      interval: 3600000,
      retention: 168
    },
    optimization: {
      vacuumInterval: 86400000,
      analyzeInterval: 3600000
    }
  },
  features: {
    caching: {
      enabled: true,
      ttl: 300000,
      maxSize: 100
    },
    websockets: true,
    metrics: true,
    alerts: false, // Disable for testing
    scheduling: false
  },
  security: {
    apiKey: false,
    jwt: {
      enabled: false,
      secret: "test-secret",
      expiry: "1h"
    },
    audit: true
  },
  monitoring: {
    healthCheck: true,
    metricsEndpoint: true,
    profiling: false
  }
};

describe("Enhanced Dashboard Server", () => {
  let server: EnhancedDashboardServer;
  let baseUrl: string;

  beforeAll(async () => {
    // Start test server
    server = new EnhancedDashboardServer(testConfig);
    baseUrl = `http://${testConfig.server.host}:${testConfig.server.port}`;
    
    // Give server a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Cleanup test database
    try {
      await Bun.write(testConfig.database.path, "");
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Health Check", () => {
    it("should return healthy status", async () => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);
      
      const health = await response.json();
      expect(health.status).toBe("healthy");
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.memory).toBeDefined();
      expect(health.cache).toBeDefined();
      expect(health.connections).toBeDefined();
    });
  });

  describe("API Endpoints", () => {
    describe("GET /api/tenants/enhanced", () => {
      it("should return enhanced tenant data", async () => {
        const response = await fetch(`${baseUrl}/api/tenants/enhanced`);
        expect(response.status).toBe(200);
        
        const tenants = await response.json();
        expect(Array.isArray(tenants)).toBe(true);
        
        if (tenants.length > 0) {
          const tenant = tenants[0];
          expect(tenant).toHaveProperty("id");
          expect(tenant).toHaveProperty("name");
          expect(tenant).toHaveProperty("enabled");
          expect(tenant).toHaveProperty("settings");
          expect(tenant).toHaveProperty("metadata");
          expect(tenant).toHaveProperty("compliance");
        }
      });
    });

    describe("GET /api/violations/advanced", () => {
      it("should return advanced violation data", async () => {
        const response = await fetch(`${baseUrl}/api/violations/advanced`);
        expect(response.status).toBe(200);
        
        const violations = await response.json();
        expect(Array.isArray(violations)).toBe(true);
        
        if (violations.length > 0) {
          const violation = violations[0];
          expect(violation).toHaveProperty("id");
          expect(violation).toHaveProperty("tenant");
          expect(violation).toHaveProperty("type");
          expect(violation).toHaveProperty("severity");
          expect(violation).toHaveProperty("autoFixable");
          expect(violation).toHaveProperty("category");
          expect(violation).toHaveProperty("confidence");
        }
      });

      it("should filter by tenant", async () => {
        const response = await fetch(`${baseUrl}/api/violations/advanced`, {
          headers: { "x-tenant-id": "tenant-a" }
        });
        expect(response.status).toBe(200);
        
        const violations = await response.json();
        expect(Array.isArray(violations)).toBe(true);
      });
    });

    describe("GET /api/snapshots/enhanced", () => {
      it("should return enhanced snapshot data", async () => {
        const response = await fetch(`${baseUrl}/api/snapshots/enhanced`);
        expect(response.status).toBe(200);
        
        const snapshots = await response.json();
        expect(Array.isArray(snapshots)).toBe(true);
        
        if (snapshots.length > 0) {
          const snapshot = snapshots[0];
          expect(snapshot).toHaveProperty("id");
          expect(snapshot).toHaveProperty("tenant");
          expect(snapshot).toHaveProperty("filename");
          expect(snapshot).toHaveProperty("size");
          expect(snapshot).toHaveProperty("compressedSize");
          expect(snapshot).toHaveProperty("checksum");
          expect(snapshot).toHaveProperty("encrypted");
          expect(snapshot).toHaveProperty("metadata");
          expect(snapshot).toHaveProperty("retention");
        }
      });
    });

    describe("GET /api/analytics/performance", () => {
      it("should return performance analytics", async () => {
        const response = await fetch(`${baseUrl}/api/analytics/performance`);
        expect(response.status).toBe(200);
        
        const analytics = await response.json();
        expect(analytics).toHaveProperty("totalRequests");
        expect(analytics).toHaveProperty("averageResponseTime");
        expect(analytics).toHaveProperty("errorRate");
        expect(analytics).toHaveProperty("cacheHitRate");
        expect(analytics).toHaveProperty("topEndpoints");
        expect(Array.isArray(analytics.topEndpoints)).toBe(true);
      });
    });

    describe("GET /api/cache/stats", () => {
      it("should return cache statistics", async () => {
        const response = await fetch(`${baseUrl}/api/cache/stats`);
        expect(response.status).toBe(200);
        
        const stats = await response.json();
        expect(stats).toHaveProperty("size");
        expect(stats).toHaveProperty("maxSize");
        expect(stats).toHaveProperty("hitRate");
        expect(typeof stats.size).toBe("number");
        expect(typeof stats.maxSize).toBe("number");
        expect(typeof stats.hitRate).toBe("number");
      });
    });

    describe("GET /api/realtime/stats", () => {
      it("should return real-time connection stats", async () => {
        const response = await fetch(`${baseUrl}/api/realtime/stats`);
        expect(response.status).toBe(200);
        
        const stats = await response.json();
        expect(stats).toHaveProperty("totalConnections");
        expect(stats).toHaveProperty("rooms");
        expect(typeof stats.totalConnections).toBe("number");
        expect(typeof stats.rooms).toBe("object");
      });
    });

    describe("GET /metrics", () => {
      it("should return Prometheus-style metrics", async () => {
        const response = await fetch(`${baseUrl}/metrics`);
        expect(response.status).toBe(200);
        
        const metrics = await response.text();
        expect(typeof metrics).toBe("string");
        expect(metrics.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle 404 for unknown endpoints", async () => {
      const response = await fetch(`${baseUrl}/unknown-endpoint`);
      expect(response.status).toBe(404);
    });

    it("should handle invalid HTTP methods", async () => {
      const response = await fetch(`${baseUrl}/api/tenants/enhanced`, {
        method: "DELETE"
      });
      expect(response.status).toBe(405);
    });

    it("should handle malformed requests", async () => {
      const response = await fetch(`${baseUrl}/api/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json"
      });
      expect(response.status).toBe(400);
    });
  });

  describe("CORS Headers", () => {
    it("should include CORS headers", async () => {
      const response = await fetch(`${baseUrl}/api/tenants/enhanced`, {
        method: "OPTIONS"
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
      expect(response.headers.get("access-control-allow-methods")).toBeTruthy();
      expect(response.headers.get("access-control-allow-headers")).toBeTruthy();
    });
  });

  describe("Content Type Headers", () => {
    it("should return JSON content type for API endpoints", async () => {
      const response = await fetch(`${baseUrl}/api/tenants/enhanced`);
      expect(response.headers.get("content-type")).toContain("application/json");
    });

    it("should return HTML content type for dashboard", async () => {
      const response = await fetch(`${baseUrl}/`);
      expect(response.headers.get("content-type")).toContain("text/html");
    });
  });
});

// Unit Tests for Utility Classes
describe("Utility Classes", () => {
  describe("Enhanced Cache", () => {
    let cache: any;

    beforeEach(() => {
      // Import and instantiate cache
      const { EnhancedCache } = require("./enhanced-dashboard");
      cache = new EnhancedCache(3, 1000); // Small cache for testing
    });

    afterEach(() => {
      cache.clear();
    });

    it("should store and retrieve values", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return null for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeNull();
    });

    it("should respect TTL", async () => {
      cache.set("key1", "value1", 100); // 100ms TTL
      expect(cache.get("key1")).toBe("value1");
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get("key1")).toBeNull();
    });

    it("should handle cache size limits", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      cache.set("key4", "value4"); // Should evict oldest
      
      expect(cache.get("key1")).toBeNull(); // Should be evicted
      expect(cache.get("key4")).toBe("value4");
    });

    it("should provide statistics", () => {
      cache.set("key1", "value1");
      cache.get("key1");
      cache.get("key1");
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(3);
      expect(stats.hitRate).toBe(2);
    });
  });

  describe("Realtime Manager", () => {
    let manager: any;

    beforeEach(() => {
      const { RealtimeManager } = require("./enhanced-dashboard");
      manager = new RealtimeManager();
    });

    it("should manage connections", () => {
      const mockWs = { readyState: 1, send: () => {} };
      manager.addConnection(mockWs);
      
      const stats = manager.getStats();
      expect(stats.totalConnections).toBe(1);
    });

    it("should manage rooms", () => {
      const mockWs = { readyState: 1, send: () => {} };
      manager.addConnection(mockWs);
      manager.joinRoom(mockWs, "test-room");
      
      const stats = manager.getStats();
      expect(stats.rooms["test-room"]).toBe(1);
    });

    it("should broadcast messages", () => {
      const messages = [];
      const mockWs = { 
        readyState: 1, 
        send: (msg) => messages.push(msg) 
      };
      
      manager.addConnection(mockWs);
      manager.broadcast({ type: "test", data: "hello" });
      
      expect(messages.length).toBe(1);
      expect(JSON.parse(messages[0])).toEqual({ type: "test", data: "hello" });
    });
  });
});

// Integration Tests
describe("Integration Tests", () => {
  describe("End-to-End Workflow", () => {
    let baseUrl: string;

    beforeAll(() => {
      baseUrl = `http://${testConfig.server.host}:${testConfig.server.port}`;
    });

    it("should handle complete dashboard workflow", async () => {
      // 1. Check health
      const healthResponse = await fetch(`${baseUrl}/health`);
      expect(healthResponse.status).toBe(200);

      // 2. Get tenants
      const tenantsResponse = await fetch(`${baseUrl}/api/tenants/enhanced`);
      expect(tenantsResponse.status).toBe(200);
      const tenants = await tenantsResponse.json();

      // 3. Get violations for first tenant
      if (tenants.length > 0) {
        const violationsResponse = await fetch(`${baseUrl}/api/violations/advanced`, {
          headers: { "x-tenant-id": tenants[0].id }
        });
        expect(violationsResponse.status).toBe(200);
      }

      // 4. Get performance metrics
      const metricsResponse = await fetch(`${baseUrl}/api/analytics/performance`);
      expect(metricsResponse.status).toBe(200);

      // 5. Check cache stats
      const cacheResponse = await fetch(`${baseUrl}/api/cache/stats`);
      expect(cacheResponse.status).toBe(200);

      // 6. Get Prometheus metrics
      const prometheusResponse = await fetch(`${baseUrl}/metrics`);
      expect(prometheusResponse.status).toBe(200);
    });
  });
});

// Performance Tests
describe("Performance Tests", () => {
  let baseUrl: string;

  beforeAll(() => {
    baseUrl = `http://${testConfig.server.host}:${testConfig.server.port}`;
  });

  it("should handle concurrent requests", async () => {
    const promises = [];
    const startTime = Date.now();
    
    // Make 50 concurrent requests
    for (let i = 0; i < 50; i++) {
      promises.push(fetch(`${baseUrl}/health`));
    }
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    // All requests should succeed
    results.forEach(response => {
      expect(response.status).toBe(200);
    });
    
    // Should complete within reasonable time
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(5000); // 5 seconds
  });

  it("should maintain response times under load", async () => {
    const promises = [];
    const responseTimes = [];
    
    for (let i = 0; i < 20; i++) {
      const startTime = Date.now();
      promises.push(
        fetch(`${baseUrl}/api/tenants/enhanced`).then(response => {
          responseTimes.push(Date.now() - startTime);
          return response;
        })
      );
    }
    
    await Promise.all(promises);
    
    // Calculate average response time
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    // Should be reasonable for development
    expect(avgResponseTime).toBeLessThan(1000); // 1 second
  });
});

// Run tests
if (import.meta.main) {
  console.log("🧪 Running Enhanced Dashboard Test Suite");
  console.log("=" .repeat(50));
  
  // Bun test runner will automatically run all tests
  console.log("Test configuration loaded");
  console.log("Run with: bun test test-suite.ts");
}

export {};
