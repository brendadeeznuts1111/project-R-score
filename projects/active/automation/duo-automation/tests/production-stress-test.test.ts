// test/production-stress-test.test.ts
import { test, expect, describe, beforeEach } from "bun:test";
import { uploadUserReport } from "../src/utils/s3Exports";
import { diMonitor } from "../src/monitoring/diPerformance";
import { createMockDeps, getMockCalls } from "./utils/mockDeps";

describe("Production Stress Test - Enterprise Grade", () => {
  beforeEach(() => {
    diMonitor.reset();
  });

  test("stress-test: 100K operations memory leak validation", async () => {
    const mockDeps = createMockDeps({
      feature: (flag: string) => flag === "PREMIUM",
    });

    const promises = [];
    const startTime = performance.now();

    // Generate 100K operations to test memory limits
    for (let i = 0; i < 100000; i++) {
      promises.push(
        uploadUserReport(
          `user${i}`,
          "PRODUCTION",
          new TextEncoder().encode(`{"data": "test${i}"}`),
          mockDeps
        )
      );
    }

    await Promise.all(promises);
    const endTime = performance.now();

    // Verify all operations completed
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(100000);

    // Performance assertions (should be extremely fast with mocks)
    expect(endTime - startTime).toBeLessThan(5000); // Within 5 seconds
    expect((endTime - startTime) / 100000).toBeLessThan(0.1); // <0.1ms per operation

    // Verify memory management (should not exceed limits)
    const health = diMonitor.getHealthStatus();
    expect(health.memoryUsage.metricsCount).toBeLessThanOrEqual(10000); // Max limit
    expect(parseFloat(health.memoryUsage.memoryUtilization)).toBeGreaterThanOrEqual(50); // At least 50% utilized
    expect(health.alerts.mockLeakDetected).toBe(true); // Expected in test
  });

  test("stress-test: Production logging performance", async () => {
    // Set production environment to test logging
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const mockDeps = createMockDeps();
      const logMessages: string[] = [];
      
      // Spy on console.log
      const originalConsoleLog = console.log;
      console.log = (message: string) => {
        logMessages.push(message);
      };

      const startTime = performance.now();

      // Test logging performance under load
      for (let i = 0; i < 1000; i++) {
        await uploadUserReport(
          `log${i}`,
          "PRODUCTION",
          new TextEncoder().encode(`{"log": "test${i}"}`),
          mockDeps
        );
      }

      const endTime = performance.now();

      // Verify structured logging format
      expect(logMessages).toHaveLength(1000);
      
      // Check log format (should be structured JSON)
      for (let i = 0; i < Math.min(10, logMessages.length); i++) {
        const logEntry = JSON.parse(logMessages[i]);
        expect(logEntry).toMatchObject({
          type: 'di_performance',
          function: 'uploadUserReport',
          isMock: true,
        });
        expect(logEntry.resolutionMs).toBeGreaterThanOrEqual(0);
        expect(logEntry.timestamp).toBeDefined();
      }

      // Logging should not significantly impact performance
      expect(endTime - startTime).toBeLessThan(1000); // Within 1 second

      // Restore console.log
      console.log = originalConsoleLog;
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test("stress-test: Error handling and aggregation", async () => {
    const mockDeps = createMockDeps({
      s3Write: async (_path: string, _data: Uint8Array, _opts?: any) => {
        // Simulate 20% failure rate
        if (Math.random() < 0.2) {
          throw new Error("Simulated S3 failure");
        }
        return Promise.resolve();
      },
    });

    const promises = [];
    const startTime = performance.now();

    // Run operations with expected failures
    for (let i = 0; i < 1000; i++) {
      promises.push(
        uploadUserReport(
          `error${i}`,
          "PRODUCTION",
          new TextEncoder().encode(`{"test": "data${i}"}`),
          mockDeps
        ).catch(() => {
          // Expected failures should be caught
        })
      );
    }

    await Promise.all(promises);
    const endTime = performance.now();

    // Verify error tracking
    const summary = diMonitor.getSummary();
    const uploadSummary = summary.find(s => s.function === 'uploadUserReport');
    
    expect(uploadSummary).toBeDefined();
    expect(uploadSummary!.callCount).toBeGreaterThan(0);
    expect(parseFloat(uploadSummary!.errorRate)).toBeGreaterThan(15); // Around 20%
    expect(uploadSummary!.isHealthy).toBe(false); // Error rate > 1%

    // Performance should remain acceptable despite errors
    expect(endTime - startTime).toBeLessThan(3000); // Within 3 seconds

    // Verify error details are captured
    const recentMetrics = diMonitor.getRecentMetrics(10);
    const errorMetrics = recentMetrics.filter(m => m.error);
    expect(errorMetrics.length).toBeGreaterThan(0);
    expect(errorMetrics[0]).toMatchObject({
      function: 'uploadUserReport',
      error: 'Simulated S3 failure',
      isMock: true,
    });
  });

  test("stress-test: Health check under load", async () => {
    const mockDeps = createMockDeps();

    // Generate load
    const promises = [];
    for (let i = 0; i < 5000; i++) {
      promises.push(
        uploadUserReport(
          `health${i}`,
          "PRODUCTION",
          new TextEncoder().encode(`{"health": "test${i}"}`),
          mockDeps
        )
      );
    }

    await Promise.all(promises);

    // Test health check performance
    const healthStartTime = performance.now();
    const health = diMonitor.getHealthStatus();
    const healthEndTime = performance.now();

    // Health check should be fast even under load
    expect(healthEndTime - healthStartTime).toBeLessThan(10); // <10ms

    // Verify health status structure
    expect(health).toMatchObject({
      status: 'degraded', // Mock leak detected in test environment
      timestamp: expect.any(String),
    });

    expect(health.di).toMatchObject({
      available: true,
      memory: {
        metricsCount: expect.any(Number),
        maxMetrics: 10000,
        memoryUtilization: expect.any(String),
      },
      alerts: {
        mockLeakDetected: true,
        errorRateHigh: false,
        slowFunctions: expect.any(Array),
      },
    });

    expect(health.functions).toBeInstanceOf(Array);
  });

  test("stress-test: Metrics export performance", async () => {
    const mockDeps = createMockDeps();

    // Generate data
    for (let i = 0; i < 1000; i++) {
      await uploadUserReport(
        `export${i}`,
        "PRODUCTION",
        new TextEncoder().encode(`{"export": "test${i}"}`),
        mockDeps
      );
    }

    // Test export performance
    const exportStartTime = performance.now();
    const exported = diMonitor.exportMetrics();
    const exportEndTime = performance.now();

    // Export should be fast
    expect(exportEndTime - exportStartTime).toBeLessThan(50); // <50ms

    // Verify export structure
    expect(exported).toMatchObject({
      recent: expect.any(Array),
      summary: expect.any(Array),
      health: expect.any(Object),
    });

    expect(exported.recent).toHaveLength(1000); // All recent metrics
    expect(exported.summary).toHaveLength(1); // One function summary
    expect(exported.health.status).toBe('degraded'); // Mock leak detected
  });
});
