// test/stress-test.test.ts
import { test, expect, describe, beforeEach } from "bun:test";
import { uploadUserReport, uploadTenantExport, PROD_DEPS } from "../src/utils/s3Exports";
import { exportAppleReceipt, exportApplePayLogs } from "../src/utils/R2AppleManager";
import { performanceMonitor } from "../src/utils/performance-monitor";
import { createMockDeps, getMockCalls } from "./utils/mockDeps";

describe("Stress Test - Dependency Injection System", () => {
  beforeEach(() => {
    performanceMonitor.reset();
  });

  test("stress-test: 1000 concurrent S3 uploads with DI", async () => {
    const mockDeps = createMockDeps({
      feature: (flag: string) => flag === "PREMIUM",
    });

    const promises = [];
    const startTime = Date.now();

    // Create 1000 concurrent upload operations
    for (let i = 0; i < 1000; i++) {
      promises.push(
        uploadUserReport(
          `user${i}`,
          "PRODUCTION",
          new TextEncoder().encode(`{"data": "test${i}"}`),
          mockDeps
        )
      );
    }

    // Wait for all operations to complete
    await Promise.all(promises);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Verify all calls were made
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(1000);

    // Performance assertions
    expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    expect(totalTime / 1000).toBeLessThan(10); // Average <10ms per operation

    // Verify performance monitoring
    const summary = performanceMonitor.getSummary();
    expect(summary.totalCalls).toBe(1000);
    expect(summary.avgResolutionTime).toBeLessThan(10);
    expect(summary.mockUsagePercentage).toBe(100);
  });

  test("stress-test: Memory efficiency with large datasets", async () => {
    const mockDeps = createMockDeps();
    
    // Create large data payloads (1MB each)
    const largeData = new Uint8Array(1024 * 1024).fill(65); // 'A' repeated 1MB
    
    const promises = [];
    const startTime = Date.now();

    // Process 100 large files
    for (let i = 0; i < 100; i++) {
      promises.push(
        uploadUserReport(
          `user${i}`,
          "PRODUCTION",
          largeData,
          mockDeps
        )
      );
    }

    await Promise.all(promises);
    const endTime = Date.now();

    // Verify memory efficiency
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(100);
    
    // Each call should have the correct large data
    calls.forEach((call, index) => {
      expect(call.data.length).toBe(1024 * 1024);
      expect(call.data[0]).toBe(65); // 'A'
    });

    // Performance should remain reasonable even with large data
    expect(endTime - startTime).toBeLessThan(10000); // Within 10 seconds
  });

  test("stress-test: Apple Pay transaction processing at scale", async () => {
    const mockDeps = createMockDeps({
      feature: (flag: string) => flag === "APPLE_PAY_PREMIUM",
    });

    // Simulate high-volume transaction processing
    const transactions = Array.from({ length: 10000 }, (_, i) => ({
      id: `txn_${i}`,
      amount: Math.random() * 1000,
      currency: "USD",
      timestamp: new Date().toISOString(),
    }));

    const startTime = Date.now();

    // Process transactions in batches
    const batchSize = 100;
    const promises = [];

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      promises.push(
        exportApplePayLogs(`user${Math.floor(i / batchSize)}`, batch, mockDeps)
      );
    }

    await Promise.all(promises);
    const endTime = Date.now();

    // Verify all batches were processed
    const calls = getMockCalls(mockDeps);
    expect(calls).toHaveLength(100); // 100 batches

    // Verify CSV content integrity
    calls.forEach((call, index) => {
      const csvContent = new TextDecoder().decode(call.data);
      expect(csvContent).toContain("id,amount,currency,timestamp");
      expect(csvContent.split("\n").length).toBeGreaterThan(1); // Has header + data
    });

    // Performance should scale well
    expect(endTime - startTime).toBeLessThan(15000); // Within 15 seconds
  });

  test("stress-test: Mixed workload with feature flags", async () => {
    const mockDeps = createMockDeps({
      feature: (flag: string) => {
        // Simulate complex feature flag logic
        const flags: Record<string, boolean> = {
          "PREMIUM": Math.random() > 0.5,
          "APPLE_PAY_PREMIUM": Math.random() > 0.3,
        };
        return flags[flag] ?? false;
      },
    });

    const promises = [];
    const startTime = Date.now();

    // Mixed workload: S3 exports + Apple Pay processing
    for (let i = 0; i < 500; i++) {
      // S3 exports
      promises.push(
        uploadUserReport(
          `user${i}`,
          "PRODUCTION",
          new TextEncoder().encode(`{"data": "test${i}"}`),
          mockDeps
        )
      );

      // Apple Pay exports
      if (i % 10 === 0) {
        promises.push(
          exportAppleReceipt(
            `apple${i}`,
            `{"receipt": "data${i}"}`,
            mockDeps
          )
        );
      }
    }

    await Promise.all(promises);
    const endTime = Date.now();

    // Verify all operations completed
    const calls = getMockCalls(mockDeps);
    expect(calls.length).toBeGreaterThan(500); // S3 + Apple Pay calls

    // Performance should remain stable under mixed load
    expect(endTime - startTime).toBeLessThan(8000); // Within 8 seconds

    // Performance monitoring should track all operations
    const summary = performanceMonitor.getSummary();
    expect(summary.totalCalls).toBeGreaterThan(500);
    expect(summary.avgResolutionTime).toBeLessThan(15);
  });

  test("stress-test: Performance monitoring under load", async () => {
    const mockDeps = createMockDeps();

    // Generate high-frequency performance events
    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < 10000; i++) {
      promises.push(
        uploadUserReport(
          `perf${i}`,
          "PRODUCTION",
          new TextEncoder().encode(`{"perf": "test${i}"}`),
          mockDeps
        )
      );
    }

    await Promise.all(promises);
    const endTime = Date.now();

    // Verify performance monitoring handled the load
    const summary = performanceMonitor.getSummary();
    expect(summary.totalCalls).toBe(10000);
    expect(summary.avgResolutionTime).toBeLessThan(5); // Should be very fast
    expect(summary.mockUsagePercentage).toBe(100);

    // Verify metrics export works under load
    const exported = performanceMonitor.exportMetrics();
    expect(exported).toHaveLength(10000);
    
    // Verify all metrics have required fields
    exported.forEach(metric => {
      expect(metric).toHaveProperty('diResolution');
      expect(metric).toHaveProperty('mockUsage');
      expect(metric).toHaveProperty('timestamp');
      expect(metric).toHaveProperty('function');
      expect(metric).toHaveProperty('environment');
    });

    // Overall performance should be excellent
    expect(endTime - startTime).toBeLessThan(20000); // Within 20 seconds
  });

  test("stress-test: Error handling and resilience", async () => {
    const mockDeps = createMockDeps({
      s3Write: async (_path: string, _data: Uint8Array, _opts?: any) => {
        // Simulate occasional failures (10% failure rate)
        if (Math.random() < 0.1) {
          throw new Error("Simulated S3 failure");
        }
        return Promise.resolve();
      },
    });

    const promises = [];
    const startTime = Date.now();

    // Run operations that may fail
    for (let i = 0; i < 1000; i++) {
      promises.push(
        uploadUserReport(
          `resilience${i}`,
          "PRODUCTION",
          new TextEncoder().encode(`{"test": "data${i}"}`),
          mockDeps
        ).catch(err => {
          // Expected failures should be caught
          expect(err.message).toBe("Simulated S3 failure");
        })
      );
    }

    await Promise.all(promises);
    const endTime = Date.now();

    // System should remain responsive despite failures
    expect(endTime - startTime).toBeLessThan(10000); // Within 10 seconds

    // Performance monitoring should track both successes and failures
    const summary = performanceMonitor.getSummary();
    expect(summary.totalCalls).toBeGreaterThan(0);
  });
});
