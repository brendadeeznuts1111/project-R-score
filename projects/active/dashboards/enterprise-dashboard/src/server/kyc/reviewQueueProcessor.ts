/**
 * [KYC][SERVICE][CLASS][META:{export}]
 * Review Queue Processor
 * Automated processing of manual review queue with ML-based decision engine
 * #REF:ISSUE-KYC-005
 */

import {
  getKYCReviewQueue,
  updateKYCReviewStatus,
  getKYCAuditLog,
  getKYCDocuments,
  getKYCBioSession,
  type KYCReviewQueueRecord,
} from "../db";
import { KYCFailsafeEngine } from "./failsafeEngine";
import type { ProcessingReport, ReviewDecision } from "./types";

export class ReviewQueueProcessor {
  private kycFailsafe: KYCFailsafeEngine;

  constructor() {
    this.kycFailsafe = new KYCFailsafeEngine();
  }

  /**
   * [KYC][SERVICE][FUNCTION][META:{async}][META:{public}]
   * Process manual review queue every 15 minutes
   * #REF:API-KYC-QUEUE-PROCESS
   */
  async processQueue(): Promise<ProcessingReport> {
    const pending = getKYCReviewQueue("pending", 50);

    const report: ProcessingReport = {
      timestamp: new Date(),
      processed: 0,
      approved: 0,
      rejected: 0,
      errors: [],
    };

    for (const item of pending) {
      try {
        const decision = await this.makeDecision(item);

        if (decision.action === "approve") {
          await this.kycFailsafe.approveUser(item.user_id, [], item.trace_id);
          updateKYCReviewStatus(item.trace_id, "approved", "system");
          report.approved++;
        } else if (decision.action === "reject") {
          await this.kycFailsafe.rejectUser(
            item.user_id,
            item.trace_id,
            decision.reason
          );
          updateKYCReviewStatus(item.trace_id, "rejected", "system");
          report.rejected++;
        }
        // "request_more_info" leaves item in pending state

        report.processed++;
      } catch (error) {
        report.errors.push({
          userId: item.user_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return report;
  }

  /**
   * ML-based decision engine
   */
  private async makeDecision(item: KYCReviewQueueRecord): Promise<ReviewDecision> {
    // Enrich risk data
    const auditLog = getKYCAuditLog(item.trace_id);
    const documents = getKYCDocuments(item.trace_id);
    const biometric = getKYCBioSession(item.trace_id);

    // Calculate document confidence
    const documentConfidence =
      documents.length > 0
        ? documents.reduce((sum, doc) => sum + (doc.confidence_score || 0), 0) /
          documents.length
        : 0;

    // If device was high-risk but documents are valid, approve
    if (item.risk_score > 70 && documentConfidence > 95) {
      return {
        action: "approve",
        confidence: 0.92,
        reason: "high_quality_documents_override",
      };
    }

    // If biometric passed and documents are good, approve
    if (biometric && biometric.passed === 1 && documentConfidence > 85) {
      return {
        action: "approve",
        confidence: 0.88,
        reason: "biometric_and_document_verified",
      };
    }

    // Default to reject for high-risk without strong docs
    if (item.risk_score > 80 && documentConfidence < 80) {
      return {
        action: "reject",
        confidence: 0.88,
        reason: "insufficient_evidence",
      };
    }

    // Medium risk: request more info (leave in pending)
    return {
      action: "request_more_info",
      confidence: 0.65,
      reason: "ambiguous_risk_profile",
    };
  }

  /**
   * Start cron processor (call this at server startup)
   */
  startCron(): void {
    // Process queue every 15 minutes
    setInterval(() => {
      this.processQueue().catch((error) => {
        console.error("Review queue processing error:", error);
      });
    }, 15 * 60 * 1000);
  }
}