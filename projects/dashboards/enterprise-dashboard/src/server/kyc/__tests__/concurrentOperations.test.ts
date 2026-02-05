/**
 * Concurrent Operations Tests
 * Tests for concurrent KYC operations and race conditions
 */

import { describe, test, expect } from "bun:test";
import { KYCFailsafeEngine } from "../failsafeEngine";
import { KYCDashboard } from "../kycDashboard";

describe("Concurrent Operations", () => {
  test("handles concurrent failsafe executions", async () => {
    const engine = new KYCFailsafeEngine();
    
    const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);
    const promises = userIds.map(userId => 
      engine.executeFailsafe(userId, "concurrent-test")
    );
    
    const results = await Promise.all(promises);
    
    expect(results.length).toBe(10);
    results.forEach(result => {
      expect(result.status).toBeDefined();
      expect(result.traceId).toBeDefined();
      expect(result.auditLog.length).toBeGreaterThan(0);
    });
    
    // Verify all trace IDs are unique
    const traceIds = results.map(r => r.traceId);
    const uniqueTraceIds = new Set(traceIds);
    expect(uniqueTraceIds.size).toBe(traceIds.length);
  });

  test("handles concurrent review queue operations", async () => {
    const dashboard = new KYCDashboard();
    
    // Simulate concurrent queue fetches
    const promises = Array.from({ length: 5 }, () => 
      dashboard.getReviewQueue("pending")
    );
    
    const results = await Promise.all(promises);
    
    expect(results.length).toBe(5);
    results.forEach(queue => {
      expect(Array.isArray(queue)).toBe(true);
    });
  });

  test("handles concurrent approve/reject operations", async () => {
    const dashboard = new KYCDashboard();
    
    // First, create a test item by executing failsafe
    const engine = new KYCFailsafeEngine();
    const result = await engine.executeFailsafe("concurrent-review-user", "test");
    
    if (result.status === "queued_for_review") {
      const traceId = result.traceId;
      
      // Attempt concurrent approve/reject
      const operations = [
        () => dashboard.approveReview(traceId, "reviewer1"),
        () => dashboard.rejectReview(traceId, "reviewer2"),
        () => dashboard.approveReview(traceId, "reviewer3"),
      ];
      
      // Should handle concurrent operations
      await Promise.allSettled(operations.map(op => op()));
      
      // Verify final state is consistent
      const item = dashboard.getReviewItem(traceId);
      if (item) {
        expect(["approved", "rejected"]).toContain(item.status);
      }
    }
  });

  test("handles concurrent metrics queries", async () => {
    const dashboard = new KYCDashboard();
    
    const promises = Array.from({ length: 20 }, () => 
      dashboard.getMetrics()
    );
    
    const results = await Promise.all(promises);
    
    expect(results.length).toBe(20);
    results.forEach(metrics => {
      expect(metrics).toBeDefined();
      expect(typeof metrics.pending).toBe('number');
      expect(typeof metrics.approved).toBe('number');
      expect(typeof metrics.rejected).toBe('number');
    });
  });

  test("handles rapid sequential executions", async () => {
    const engine = new KYCFailsafeEngine();
    const userId = "rapid-sequential-user";
    
    const results = [];
    for (let i = 0; i < 5; i++) {
      const result = await engine.executeFailsafe(`${userId}-${i}`, "test");
      results.push(result);
    }
    
    expect(results.length).toBe(5);
    results.forEach(result => {
      expect(result.status).toBeDefined();
      expect(result.traceId).toBeDefined();
    });
    
    // All trace IDs should be unique
    const traceIds = results.map(r => r.traceId);
    const uniqueTraceIds = new Set(traceIds);
    expect(uniqueTraceIds.size).toBe(traceIds.length);
  });

  test("handles concurrent filtered queue queries", async () => {
    const dashboard = new KYCDashboard();
    
    const filters = [
      { status: "pending" as const },
      { status: "approved" as const },
      { status: "rejected" as const },
      { priority: "high" as const },
      { priority: "medium" as const },
    ];
    
    const promises = filters.map(filter => 
      dashboard.getReviewQueueFiltered(filter)
    );
    
    const results = await Promise.all(promises);
    
    expect(results.length).toBe(5);
    results.forEach(queue => {
      expect(Array.isArray(queue)).toBe(true);
    });
  });

  test("handles race condition in review status updates", async () => {
    const dashboard = new KYCDashboard();
    const engine = new KYCFailsafeEngine();
    
    // Create a test item
    const result = await engine.executeFailsafe("race-condition-user", "test");
    
    if (result.status === "queued_for_review") {
      const traceId = result.traceId;
      
      // Attempt to approve and reject simultaneously
      const approvePromise = Promise.resolve(dashboard.approveReview(traceId, "reviewer1"));
      const rejectPromise = Promise.resolve(dashboard.rejectReview(traceId, "reviewer2"));
      
      await Promise.allSettled([approvePromise, rejectPromise]);
      
      // Final state should be consistent (either approved or rejected, not both)
      const item = dashboard.getReviewItem(traceId);
      if (item) {
        expect(["approved", "rejected"]).toContain(item.status);
      }
    }
  });

  test("handles large concurrent batch operations", async () => {
    const engine = new KYCFailsafeEngine();
    
    // Create 50 concurrent executions
    const batchSize = 50;
    const promises = Array.from({ length: batchSize }, (_, i) => 
      engine.executeFailsafe(`batch-user-${i}`, "batch-test")
    );
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    expect(results.length).toBe(batchSize);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    
    // Verify all results are valid
    results.forEach(result => {
      expect(result.status).toBeDefined();
      expect(result.traceId).toBeDefined();
    });
  });
});
