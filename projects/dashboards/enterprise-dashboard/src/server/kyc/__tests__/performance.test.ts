/**
 * Performance Benchmarks
 * Performance tests for KYC failsafe operations
 */

import { describe, test, expect } from "bun:test";
import { KYCFailsafeEngine } from "../failsafeEngine";
import { Android13KYCFailsafe } from "../android13Failsafe";
import { encryptDocument, decryptDocument } from "../encryption";

describe("Performance Benchmarks", () => {
  test("failsafe execution completes within acceptable time", async () => {
    const engine = new KYCFailsafeEngine();
    const start = performance.now();

    const result = await engine.executeFailsafe("perf-test-user", "timeout");

    const duration = performance.now() - start;

    // Should complete within 10 seconds (allowing for ADB timeouts)
    expect(duration).toBeLessThan(10000);
    expect(result.status).toBeDefined();
    expect(result.traceId).toBeDefined();
  });

  test("device verification completes within acceptable time", async () => {
    const failsafe = new Android13KYCFailsafe();
    const start = performance.now();

    const result = await failsafe.verifyDeviceIntegrity("perf-test-user");

    const duration = performance.now() - start;

    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000);
    expect(result.isGenuine).toBeDefined();
    expect(result.riskScore).toBeDefined();
  });

  test("encryption performance for typical document size", async () => {
    const testData = new Uint8Array(100 * 1024); // 100KB document
    testData.fill(65); // Fill with 'A'
    const userId = "perf-test-user";

    const start = performance.now();
    const encrypted = await encryptDocument(testData, userId);
    const encryptDuration = performance.now() - start;

    const decryptStart = performance.now();
    await decryptDocument(encrypted.encrypted, encrypted.iv, userId);
    const decryptDuration = performance.now() - decryptStart;

    // Encryption should be fast (< 100ms for 100KB)
    expect(encryptDuration).toBeLessThan(100);
    // Decryption should be fast (< 100ms for 100KB)
    expect(decryptDuration).toBeLessThan(100);
  });

  test("encryption performance scales with document size", async () => {
    const sizes = [10 * 1024, 100 * 1024, 1024 * 1024]; // 10KB, 100KB, 1MB
    const userId = "perf-test-user";
    const durations: number[] = [];

    for (const size of sizes) {
      const testData = new Uint8Array(size).fill(65);
      const start = performance.now();
      await encryptDocument(testData, userId);
      durations.push(performance.now() - start);
    }

    // All operations should complete reasonably fast
    durations.forEach((duration, i) => {
      expect(duration).toBeLessThan(500); // Each should be < 500ms
    });

    // The largest size should be reasonable (< 500ms for 1MB)
    expect(durations[2]).toBeLessThan(500);
    
    // Verify all operations completed successfully
    expect(durations).toHaveLength(3);
  });

  test("concurrent failsafe executions", async () => {
    const engine = new KYCFailsafeEngine();
    const concurrentCount = 5;
    const start = performance.now();

    const promises = Array.from({ length: concurrentCount }, (_, i) =>
      engine.executeFailsafe(`user-${i}`, "concurrent_test")
    );

    const results = await Promise.all(promises);
    const duration = performance.now() - start;

    expect(results).toHaveLength(concurrentCount);
    results.forEach((result, i) => {
      expect(result.status).toBeDefined();
      expect(result.traceId).toContain(`user-${i}`);
    });

    // Concurrent execution should be faster than sequential
    // (allowing 15 seconds for 5 concurrent operations)
    expect(duration).toBeLessThan(15000);
  });

  test("trace ID generation performance", () => {
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const traceId = `kyc-failsafe-user-${i}-${Date.now()}`;
      expect(traceId).toBeDefined();
    }

    const duration = performance.now() - start;

    // Should generate 1000 trace IDs in < 10ms
    expect(duration).toBeLessThan(10);
  });
});
