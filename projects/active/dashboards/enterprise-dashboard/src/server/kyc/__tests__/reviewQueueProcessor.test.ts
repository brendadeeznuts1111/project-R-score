/**
 * Review Queue Processor Tests
 * Unit tests for automated review processing
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import { ReviewQueueProcessor } from "../reviewQueueProcessor";
import { getKYCReviewQueue, updateKYCReviewStatus } from "../../db";

// Mock database functions
mock.module("../../db", () => ({
  getKYCReviewQueue: mock((status?: string, limit?: number) => {
    if (status === "pending") {
      return [
        {
          id: 1,
          user_id: "user1",
          risk_score: 75,
          device_signatures: JSON.stringify(["signature1"]),
          trace_id: "trace1",
          status: "pending",
          priority: "high",
          created_at: Date.now(),
          reviewed_at: null,
          reviewer_id: null,
          metadata: null,
        },
        {
          id: 2,
          user_id: "user2",
          risk_score: 60,
          device_signatures: JSON.stringify(["signature2"]),
          trace_id: "trace2",
          status: "pending",
          priority: "medium",
          created_at: Date.now(),
          reviewed_at: null,
          reviewer_id: null,
          metadata: null,
        },
      ];
    }
    return [];
  }),
  updateKYCReviewStatus: mock(() => {}),
  getKYCAuditLog: mock(() => []),
  getKYCDocuments: mock(() => []),
  getKYCBioSession: mock(() => null),
}));

describe("ReviewQueueProcessor", () => {
  let processor: ReviewQueueProcessor;

  beforeEach(() => {
    processor = new ReviewQueueProcessor();
  });

  test("processQueue returns processing report", async () => {
    const report = await processor.processQueue();

    expect(report).toHaveProperty("timestamp");
    expect(report).toHaveProperty("processed");
    expect(report).toHaveProperty("approved");
    expect(report).toHaveProperty("rejected");
    expect(report).toHaveProperty("errors");
    expect(typeof report.processed).toBe("number");
    expect(typeof report.approved).toBe("number");
    expect(typeof report.rejected).toBe("number");
    expect(Array.isArray(report.errors)).toBe(true);
  });

  test("processQueue handles empty queue", async () => {
    mock.module("../../db", () => ({
      getKYCReviewQueue: mock(() => []),
      updateKYCReviewStatus: mock(() => {}),
      getKYCAuditLog: mock(() => []),
      getKYCDocuments: mock(() => []),
      getKYCBioSession: mock(() => null),
    }));

    const report = await processor.processQueue();

    expect(report.processed).toBe(0);
    expect(report.approved).toBe(0);
    expect(report.rejected).toBe(0);
    expect(report.errors).toHaveLength(0);
  });

  test("startCron sets up interval", () => {
    const originalSetInterval = globalThis.setInterval;
    const intervalCalls: any[] = [];

    globalThis.setInterval = mock((fn: any, delay: number) => {
      intervalCalls.push({ fn, delay });
      return {} as any;
    });

    processor.startCron();

    expect(intervalCalls.length).toBeGreaterThan(0);
    expect(intervalCalls[0].delay).toBe(15 * 60 * 1000); // 15 minutes

    globalThis.setInterval = originalSetInterval;
  });
});
