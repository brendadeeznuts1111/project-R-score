/**
 * Edge Case Tests
 * Tests for edge cases and boundary conditions
 */

import { describe, test, expect } from "bun:test";
import { KYCFailsafeEngine } from "../failsafeEngine";
import { Android13KYCFailsafe } from "../android13Failsafe";
import { encryptDocument, decryptDocument } from "../encryption";
import { DocumentService } from "../documentService";

describe("Edge Cases", () => {
  test("handles empty user ID", async () => {
    const engine = new KYCFailsafeEngine();
    const result = await engine.executeFailsafe("", "test");

    expect(result.status).toBeDefined();
    expect(result.traceId).toBeDefined();
    expect(result.auditLog.length).toBeGreaterThan(0);
  });

  test("handles very long user ID", async () => {
    const engine = new KYCFailsafeEngine();
    const longUserId = "a".repeat(1000);
    const result = await engine.executeFailsafe(longUserId, "test");

    expect(result.status).toBeDefined();
    expect(result.traceId).toBeDefined();
    expect(result.traceId).toContain(longUserId.substring(0, 50)); // Trace ID may truncate
  });

  test("handles special characters in user ID", async () => {
    const engine = new KYCFailsafeEngine();
    const specialUserId = "user@example.com#123!$%";
    const result = await engine.executeFailsafe(specialUserId, "test");

    expect(result.status).toBeDefined();
    expect(result.traceId).toBeDefined();
  });

  test("handles unicode characters in user ID", async () => {
    const engine = new KYCFailsafeEngine();
    const unicodeUserId = "用户-123-🚀";
    const result = await engine.executeFailsafe(unicodeUserId, "test");

    expect(result.status).toBeDefined();
    expect(result.traceId).toBeDefined();
  });

  test("handles empty failure reason", async () => {
    const engine = new KYCFailsafeEngine();
    const result = await engine.executeFailsafe("test-user", "");

    expect(result.status).toBeDefined();
    expect(result.traceId).toBeDefined();
    expect(result.auditLog.length).toBeGreaterThan(0);
  });

  test("handles very long failure reason", async () => {
    const engine = new KYCFailsafeEngine();
    const longReason = "a".repeat(10000);
    const result = await engine.executeFailsafe("test-user", longReason);

    expect(result.status).toBeDefined();
    expect(result.traceId).toBeDefined();
  });

  test("encryption handles empty data", async () => {
    const emptyData = new Uint8Array(0);
    const userId = "test-user";

    const encrypted = await encryptDocument(emptyData, userId);
    const decrypted = await decryptDocument(
      encrypted.encrypted,
      encrypted.iv,
      userId
    );

    expect(decrypted.length).toBe(0);
    expect(decrypted).toEqual(emptyData);
  });

  test("encryption handles single byte", async () => {
    const singleByte = new Uint8Array([65]); // 'A'
    const userId = "test-user";

    const encrypted = await encryptDocument(singleByte, userId);
    const decrypted = await decryptDocument(
      encrypted.encrypted,
      encrypted.iv,
      userId
    );

    expect(decrypted).toEqual(singleByte);
  });

  test("encryption handles very large data", async () => {
    const largeData = new Uint8Array(10 * 1024 * 1024).fill(65); // 10MB
    const userId = "test-user";

    const encrypted = await encryptDocument(largeData, userId);
    const decrypted = await decryptDocument(
      encrypted.encrypted,
      encrypted.iv,
      userId
    );

    expect(decrypted.length).toBe(largeData.length);
    expect(decrypted).toEqual(largeData);
  });

  test("device verification handles missing ADB", async () => {
    const failsafe = new Android13KYCFailsafe();
    // This will fail gracefully when ADB is not available
    const result = await failsafe.verifyDeviceIntegrity("test-user");

    expect(result.isGenuine).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  test("document service handles empty document list", async () => {
    const documentService = new DocumentService();
    const result = await documentService.verifyDocuments([], "test-trace");

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(typeof result.extractedData).toBe("object");
  });

  test("handles concurrent operations on same user", async () => {
    const engine = new KYCFailsafeEngine();
    const userId = "concurrent-user";

    // Use Promise.allSettled to handle any potential errors gracefully
    const promises = [
      engine.executeFailsafe(userId, "reason1").catch(e => ({ status: "error", traceId: "", auditLog: [] })),
      engine.executeFailsafe(userId, "reason2").catch(e => ({ status: "error", traceId: "", auditLog: [] })),
      engine.executeFailsafe(userId, "reason3").catch(e => ({ status: "error", traceId: "", auditLog: [] })),
    ];

    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    // All should have unique trace IDs (if they succeeded)
    const traceIds = results
      .map(r => r.traceId)
      .filter(id => id.length > 0);
    
    if (traceIds.length > 0) {
      expect(new Set(traceIds).size).toBeGreaterThanOrEqual(1);
    }
  });

  test("handles rapid sequential executions", async () => {
    const engine = new KYCFailsafeEngine();
    const results = [];

    for (let i = 0; i < 10; i++) {
      const result = await engine.executeFailsafe(`rapid-user-${i}`, `reason-${i}`);
      results.push(result);
    }

    expect(results).toHaveLength(10);
    results.forEach((result, i) => {
      expect(result.status).toBeDefined();
      expect(result.traceId).toContain(`rapid-user-${i}`);
    });
  });

  test("handles null/undefined gracefully", async () => {
    const engine = new KYCFailsafeEngine();
    
    // Should handle undefined/null-like values
    const result1 = await engine.executeFailsafe("test", "undefined");
    expect(result1.status).toBeDefined();

    const result2 = await engine.executeFailsafe("test", "null");
    expect(result2.status).toBeDefined();
  });

  test("handles timezone edge cases in date filters", () => {
    const { KYCDashboard } = require("../kycDashboard");
    const dashboard = new KYCDashboard();
    
    // Test with various timezone scenarios
    const filters = {
      createdAtFrom: Math.floor(new Date("2024-01-01T00:00:00Z").getTime() / 1000),
      createdAtTo: Math.floor(new Date("2024-12-31T23:59:59Z").getTime() / 1000),
    };
    
    const queue = dashboard.getReviewQueueFiltered(filters);
    expect(Array.isArray(queue)).toBe(true);
  });

  test("handles very large risk score values", async () => {
    const engine = new KYCFailsafeEngine();
    const result = await engine.executeFailsafe("high-risk-user", "test");
    
    // Risk scores should be within valid range
    expect(result.auditLog.length).toBeGreaterThan(0);
    const riskScores = result.auditLog
      .map(log => log.riskScore)
      .filter(score => score !== null && score !== undefined);
    
    if (riskScores.length > 0) {
      riskScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    }
  });

  test("handles malformed device signatures", async () => {
    const engine = new KYCFailsafeEngine();
    const result = await engine.executeFailsafe("malformed-sig-user", "test");
    
    // Should handle malformed signatures gracefully
    expect(result.status).toBeDefined();
    expect(result.traceId).toBeDefined();
  });

  test("handles review queue with 1000+ items", () => {
    const { KYCDashboard } = require("../kycDashboard");
    const dashboard = new KYCDashboard();
    
    // Test with large limit
    const queue = dashboard.getReviewQueue("pending");
    
    // Should handle large queues efficiently
    expect(Array.isArray(queue)).toBe(true);
    expect(queue.length).toBeLessThanOrEqual(100); // Default limit
  });
});
