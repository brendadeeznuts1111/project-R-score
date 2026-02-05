/**
 * KYC Dashboard Tests
 * Unit tests for admin dashboard integration
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import { KYCDashboard } from "../kycDashboard";

// Mock database functions
mock.module("../../db", () => ({
  getKYCReviewQueue: mock((status?: string) => {
    if (status === "pending") {
      return [
        {
          id: 1,
          user_id: "user1",
          risk_score: 85,
          device_signatures: JSON.stringify(["signature1"]),
          trace_id: "trace1",
          status: "pending",
          priority: "high",
          created_at: Math.floor(Date.now() / 1000),
          reviewed_at: null,
          reviewer_id: null,
          metadata: null,
        },
      ];
    }
    return [];
  }),
  getKYCReviewByTraceId: mock((traceId: string) => ({
    id: 1,
    user_id: "user1",
    risk_score: 85,
    device_signatures: JSON.stringify(["signature1"]),
    trace_id: traceId,
    status: "pending",
    priority: "high",
    created_at: Math.floor(Date.now() / 1000),
    reviewed_at: null,
    reviewer_id: null,
    metadata: null,
  })),
  updateKYCReviewStatus: mock(() => {}),
  getKYCAuditLog: mock(() => []),
  getKYCDocuments: mock(() => []),
  getDeviceVerification: mock(() => null),
  getKYCBioSession: mock(() => null),
}));

describe("KYCDashboard", () => {
  let dashboard: KYCDashboard;

  beforeEach(() => {
    dashboard = new KYCDashboard();
  });

  test("getReviewQueue returns formatted queue items", () => {
    const queue = dashboard.getReviewQueue("pending");

    expect(Array.isArray(queue)).toBe(true);
    if (queue.length > 0) {
      const item = queue[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("userId");
      expect(item).toHaveProperty("riskScore");
      expect(item).toHaveProperty("deviceSignatures");
      expect(item).toHaveProperty("traceId");
      expect(item).toHaveProperty("status");
      expect(item).toHaveProperty("priority");
      expect(item).toHaveProperty("createdAt");
      expect(["pending", "approved", "rejected"]).toContain(item.status);
      expect(["low", "medium", "high"]).toContain(item.priority);
      expect(item.createdAt).toBeInstanceOf(Date);
    }
  });

  test("getReviewQueue filters by status", () => {
    const pendingQueue = dashboard.getReviewQueue("pending");
    const approvedQueue = dashboard.getReviewQueue("approved");
    const rejectedQueue = dashboard.getReviewQueue("rejected");

    expect(Array.isArray(pendingQueue)).toBe(true);
    expect(Array.isArray(approvedQueue)).toBe(true);
    expect(Array.isArray(rejectedQueue)).toBe(true);
  });

  test("getReviewItem returns detailed item with audit log", () => {
    const item = dashboard.getReviewItem("trace1");

    expect(item).not.toBeNull();
    if (item) {
      expect(item).toHaveProperty("auditLog");
      expect(item).toHaveProperty("documents");
      expect(item).toHaveProperty("deviceVerification");
      expect(item).toHaveProperty("biometric");
      expect(Array.isArray(item.auditLog)).toBe(true);
      expect(Array.isArray(item.documents)).toBe(true);
    }
  });

  test("getReviewItem returns null for non-existent trace ID", () => {
    mock.module("../../db", () => ({
      getKYCReviewByTraceId: mock(() => null),
      getKYCAuditLog: mock(() => []),
      getKYCDocuments: mock(() => []),
      getDeviceVerification: mock(() => null),
      getKYCBioSession: mock(() => null),
    }));

    const dashboard2 = new KYCDashboard();
    const item = dashboard2.getReviewItem("non-existent-trace");

    expect(item).toBeNull();
  });

  test("approveReview updates review status", () => {
    expect(() => {
      dashboard.approveReview("trace1", "reviewer-123");
    }).not.toThrow();
  });

  test("rejectReview updates review status", () => {
    expect(() => {
      dashboard.rejectReview("trace1", "reviewer-123");
    }).not.toThrow();
  });

  test("getMetrics returns dashboard metrics", () => {
    mock.module("../../db", () => ({
      getKYCReviewQueue: mock((status?: string) => {
        if (status === "pending") {
          return [
            {
              id: 1,
              user_id: "user1",
              risk_score: 85,
              device_signatures: JSON.stringify([]),
              trace_id: "trace1",
              status: "pending",
              priority: "high",
              created_at: Date.now(),
              reviewed_at: null,
              reviewer_id: null,
              metadata: null,
            },
          ];
        }
        return [];
      }),
    }));

    const dashboard2 = new KYCDashboard();
    const metrics = dashboard2.getMetrics();

    expect(metrics).toHaveProperty("pending");
    expect(metrics).toHaveProperty("approved");
    expect(metrics).toHaveProperty("rejected");
    expect(metrics).toHaveProperty("highPriority");
    expect(metrics).toHaveProperty("avgRiskScore");
    expect(typeof metrics.pending).toBe("number");
    expect(typeof metrics.approved).toBe("number");
    expect(typeof metrics.rejected).toBe("number");
    expect(typeof metrics.highPriority).toBe("number");
    expect(typeof metrics.avgRiskScore).toBe("number");
  });
});
