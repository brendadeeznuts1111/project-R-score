/**
 * [KYC][SERVICE][CLASS][META:{export}]
 * KYC Dashboard Integration
 * Admin dashboard integration for KYC review and monitoring
 * #REF:ISSUE-KYC-006
 */

import {
  getKYCReviewQueue,
  getKYCReviewQueueFiltered,
  getKYCReviewByTraceId,
  updateKYCReviewStatus,
  getKYCAuditLog,
  getKYCDocuments,
  getDeviceVerification,
  getKYCBioSession,
  type KYCReviewQueueFilters,
} from "../db";
import type { ReviewQueueItem } from "./types";

export class KYCDashboard {
  /**
   * Add item to review queue (called by failsafe engine)
   */
  addToReviewQueue(item: {
    userId: string;
    priority: "low" | "medium" | "high";
    reason: string;
    traceId: string;
  }): void {
    // Queue is already added by failsafe engine, this is for dashboard integration
    // Could trigger additional notifications or UI updates here
  }

  /**
   * Get review queue for admin dashboard
   */
  getReviewQueue(status?: "pending" | "approved" | "rejected"): ReviewQueueItem[] {
    const queue = getKYCReviewQueue(status || "pending", 100);
    return queue.map((item) => ({
      id: item.id,
      userId: item.user_id,
      riskScore: item.risk_score,
      deviceSignatures: JSON.parse(item.device_signatures),
      traceId: item.trace_id,
      status: item.status as "pending" | "approved" | "rejected",
      priority: item.priority as "low" | "medium" | "high",
      createdAt: new Date(item.created_at * 1000),
      reviewedAt: item.reviewed_at ? new Date(item.reviewed_at * 1000) : undefined,
      reviewerId: item.reviewer_id || undefined,
    }));
  }

  /**
   * Get filtered review queue with advanced filtering options
   */
  getReviewQueueFiltered(filters: KYCReviewQueueFilters): ReviewQueueItem[] {
    const queue = getKYCReviewQueueFiltered(filters);
    return queue.map((item) => ({
      id: item.id,
      userId: item.user_id,
      riskScore: item.risk_score,
      deviceSignatures: JSON.parse(item.device_signatures),
      traceId: item.trace_id,
      status: item.status as "pending" | "approved" | "rejected",
      priority: item.priority as "low" | "medium" | "high",
      createdAt: new Date(item.created_at * 1000),
      reviewedAt: item.reviewed_at ? new Date(item.reviewed_at * 1000) : undefined,
      reviewerId: item.reviewer_id || undefined,
    }));
  }

  /**
   * Get review item details
   */
  getReviewItem(traceId: string) {
    const item = getKYCReviewByTraceId(traceId);
    if (!item) {
      return null;
    }

    const auditLog = getKYCAuditLog(traceId);
    const documents = getKYCDocuments(traceId);
    const deviceVerification = getDeviceVerification(traceId);
    const biometric = getKYCBioSession(traceId);

    return {
      ...item,
      auditLog: auditLog.map((log) => ({
        ...log,
        details: log.details_json ? JSON.parse(log.details_json) : {},
        timestamp: new Date(log.timestamp * 1000),
      })),
      documents: documents.map((doc) => ({
        ...doc,
        extractedData: doc.extracted_data_json
          ? JSON.parse(doc.extracted_data_json)
          : {},
        uploadedAt: new Date(doc.uploaded_at * 1000),
      })),
      deviceVerification: deviceVerification
        ? {
            ...deviceVerification,
            isGenuine: deviceVerification.is_genuine === 1,
            signatures: JSON.parse(deviceVerification.signatures_json),
            logs: JSON.parse(deviceVerification.logs_json),
            verifiedAt: new Date(deviceVerification.verified_at * 1000),
          }
        : null,
      biometric: biometric
        ? {
            ...biometric,
            passed: biometric.passed === 1,
            attemptedAt: new Date(biometric.attempted_at * 1000),
          }
        : null,
    };
  }

  /**
   * Approve review item
   */
  approveReview(traceId: string, reviewerId: string): void {
    updateKYCReviewStatus(traceId, "approved", reviewerId);
  }

  /**
   * Reject review item
   */
  rejectReview(traceId: string, reviewerId: string): void {
    updateKYCReviewStatus(traceId, "rejected", reviewerId);
  }

  /**
   * Get KYC metrics for dashboard
   */
  getMetrics() {
    const pending = getKYCReviewQueue("pending", 1000);
    const approved = getKYCReviewQueue("approved", 1000);
    const rejected = getKYCReviewQueue("rejected", 1000);

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      highPriority: pending.filter((p) => p.priority === "high").length,
      avgRiskScore:
        pending.length > 0
          ? pending.reduce((sum, p) => sum + p.risk_score, 0) / pending.length
          : 0,
    };
  }
}