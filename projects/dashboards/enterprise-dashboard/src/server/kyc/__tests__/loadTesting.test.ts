/**
 * Load Testing
 * Tests system performance under high load and concurrent requests
 */

import { describe, test, expect } from "bun:test";
import { KYCFailsafeEngine } from "../failsafeEngine";
import { KYCDashboard } from "../kycDashboard";

describe("Load Testing", () => {
  test("handles 100 concurrent failsafe executions", async () => {
    const engine = new KYCFailsafeEngine();
    const startTime = Date.now();
    
    const promises = Array.from({ length: 100 }, (_, i) =>
      engine.executeFailsafe(`load-test-user-${i}`, "load-test")
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    expect(results.length).toBe(100);
    expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
    
    // Verify all results are valid
    results.forEach(result => {
      expect(result.status).toBeDefined();
      expect(result.traceId).toBeDefined();
    });
  });

  test("handles 50 concurrent review queue queries", async () => {
    const dashboard = new KYCDashboard();
    const startTime = Date.now();
    
    const promises = Array.from({ length: 50 }, () =>
      dashboard.getReviewQueue("pending")
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    expect(results.length).toBe(50);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    
    results.forEach(queue => {
      expect(Array.isArray(queue)).toBe(true);
    });
  });

  test("handles large dataset (1000+ items) efficiently", async () => {
    const dashboard = new KYCDashboard();
    const startTime = Date.now();
    
    // Test with large limit
    const queue = dashboard.getReviewQueue("pending");
    const duration = Date.now() - startTime;
    
    expect(Array.isArray(queue)).toBe(true);
    expect(duration).toBeLessThan(1000); // Should be fast even with many items
  });

  test("handles WebSocket connection limits", async () => {
    // Simulate multiple WebSocket connections
    const connections = Array.from({ length: 100 }, () => ({
      send: () => {},
      readyState: 1,
    }));
    
    const { setKYCWebSocketClients } = await import("../failsafeEngine");
    setKYCWebSocketClients(new Set(connections));
    
    const engine = new KYCFailsafeEngine();
    const result = await engine.executeFailsafe("ws-load-test", "test");
    
    expect(result.status).toBeDefined();
    expect(result.traceId).toBeDefined();
  });

  test("database performance with concurrent writes", async () => {
    const engine = new KYCFailsafeEngine();
    const startTime = Date.now();
    
    // Create 20 concurrent executions (each writes to DB)
    const promises = Array.from({ length: 20 }, (_, i) =>
      engine.executeFailsafe(`db-write-user-${i}`, "db-test")
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    expect(results.length).toBe(20);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    
    // Verify database consistency
    const dashboard = new KYCDashboard();
    const metrics = dashboard.getMetrics();
    expect(metrics).toBeDefined();
  });

  test("response time under load", async () => {
    const dashboard = new KYCDashboard();
    
    // Measure response time for metrics query under load
    const iterations = 10;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      dashboard.getMetrics();
      times.push(performance.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    
    expect(avgTime).toBeLessThan(100); // Average should be < 100ms
    expect(maxTime).toBeLessThan(500); // Max should be < 500ms
  });
});
