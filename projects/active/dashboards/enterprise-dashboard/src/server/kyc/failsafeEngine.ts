/**
 * [KYC][SERVICE][CLASS][META:{export}][BUN-NATIVE]
 * KYC Failsafe Engine
 * Main orchestration engine for KYC failsafe flow
 * #REF:ISSUE-KYC-001
 */

import { Android13KYCFailsafe } from "./android13Failsafe";
import { DocumentService } from "./documentService";
import { BiometricService } from "./biometricService";
import { kycConfig } from "./config";
import {
  insertKYCReviewQueue,
  insertKYCAuditLog,
  insertDeviceVerification,
  insertKYCDocument,
  insertKYCBioSession,
} from "../db";
import type {
  DeviceAttestationProvider,
  KYCFailsafeResult,
  DeviceIntegrityResult,
} from "./types";

// Global reference to WebSocket clients for broadcasting (set from index.ts)
let wsClients: Set<any> | null = null;

export function setKYCWebSocketClients(clients: Set<any>) {
  wsClients = clients;
}

export class KYCFailsafeEngine {
  private attestationProvider: DeviceAttestationProvider;
  private documentService: DocumentService;
  private biometricService: BiometricService;
  private readonly MAX_RETRIES = kycConfig.maxRetries;
  private readonly MANUAL_REVIEW_THRESHOLD = kycConfig.manualReviewThreshold;

  constructor(attestationProvider?: DeviceAttestationProvider) {
    this.attestationProvider = attestationProvider ?? new Android13KYCFailsafe();
    this.documentService = new DocumentService();
    this.biometricService = new BiometricService();
  }

  /**
   * [KYC][SERVICE][FUNCTION][META:{private}][BUN-NATIVE]
   * Factory method for S3 client - avoids repeated instantiation
   */
  private getS3Client() {
    return Bun.s3({
      accessKeyId: kycConfig.awsAccessKey || "",
      secretAccessKey: kycConfig.awsSecretKey || "",
      bucket: kycConfig.s3Bucket,
      region: kycConfig.awsRegion,
    });
  }

  /**
   * [KYC][SERVICE][FUNCTION][META:{private}]
   * Broadcast message to all connected WebSocket clients
   */
  private broadcastToClients(message: object): void {
    if (!wsClients) return;
    const payload = JSON.stringify(message);
    for (const client of wsClients) {
      try {
        client.send(payload);
      } catch {
        // Ignore send errors for disconnected clients
      }
    }
  }

  /**
   * [KYC][SERVICE][FUNCTION][META:{async}][META:{public}][BUN-NATIVE]
   * Main failsafe entry point - called when primary KYC fails
   * #REF:API-KYC-FAILSAFE
   */
  async executeFailsafe(
    userId: string,
    primaryFailureReason: string
  ): Promise<KYCFailsafeResult> {
    const traceId = `kyc-failsafe-${userId}-${Date.now()}`;
    const auditLog: string[] = [];

    auditLog.push(`[${traceId}] 🚨 Primary KYC failed: ${primaryFailureReason}`);
    insertKYCAuditLog({
      traceId,
      userId,
      action: "failsafe_triggered",
      details: { primaryFailureReason },
    });

    try {
      // Step 1: Device integrity verification (Android 13 specific)
      auditLog.push(`[${traceId}] Step 1: Verifying Android 13 device integrity`);
      const deviceCheck = await this.attestationProvider.verifyDeviceIntegrity(userId);
      auditLog.push(...deviceCheck.logs);

      // Store device verification
      insertDeviceVerification({
        traceId,
        userId,
        isGenuine: deviceCheck.isGenuine,
        riskScore: deviceCheck.riskScore,
        signatures: deviceCheck.signatures,
        logs: deviceCheck.logs,
      });

      if (!deviceCheck.isGenuine) {
        if (deviceCheck.riskScore >= 80) {
          auditLog.push(`[${traceId}] 🚫 High-risk device - automatic rejection`);
          await this.logRejection(userId, deviceCheck, traceId);
          insertKYCAuditLog({
            traceId,
            userId,
            action: "rejected",
            details: { reason: "high_risk_device", deviceCheck },
            riskScore: deviceCheck.riskScore,
          });
          return { status: "rejected", traceId, auditLog };
        } else {
          auditLog.push(`[${traceId}] ⚠️  Medium-risk device - manual review required`);
          await this.queueForReview(userId, deviceCheck, traceId);
          return { status: "review", traceId, auditLog };
        }
      }

      // Step 2: Document capture fallback (via ADB)
      auditLog.push(`[${traceId}] Step 2: Initiating document capture fallback`);
      const docs = await this.documentService.captureDocuments(userId, traceId);
      auditLog.push(`[${traceId}] 📄 Documents captured: ${docs.length} files`);

      if (docs.length === 0) {
        auditLog.push(`[${traceId}] ⚠️  No documents captured - manual review required`);
        await this.queueForReview(userId, deviceCheck, traceId);
        return { status: "review", traceId, auditLog };
      }

      // Upload documents to S3
      const s3Client = this.getS3Client();

      const s3Keys: string[] = [];
      for (const doc of docs) {
        try {
          const s3Key = await this.documentService.uploadDocument(
            doc,
            userId,
            traceId,
            s3Client
          );
          s3Keys.push(s3Key);
          insertKYCDocument({
            traceId,
            userId,
            s3Key,
            documentType: "id_document",
            confidenceScore: undefined,
          });
        } catch (error) {
          auditLog.push(`[${traceId}] ⚠️  Failed to upload document: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Step 3: AI-powered document verification
      auditLog.push(`[${traceId}] Step 3: AI document verification`);
      const verification = await this.documentService.verifyDocuments(s3Keys, traceId);
      auditLog.push(`[${traceId}] ✅ Document verification: ${verification.confidence}% confidence`);

      // Update document records with confidence scores
      for (const s3Key of s3Keys) {
        // In production, update the specific document record
      }

      // Step 4: Biometric verification fallback
      if (verification.confidence < 90) {
        auditLog.push(`[${traceId}] Step 4: Biometric verification required`);
        const biometric = await this.biometricService.verifyBiometric(userId, traceId);
        auditLog.push(`[${traceId}] 🔐 Biometric: ${biometric.passed ? "PASSED" : "FAILED"}`);

        insertKYCBioSession({
          traceId,
          userId,
          passed: biometric.passed,
          livenessScore: biometric.livenessScore,
        });

        if (!biometric.passed) {
          await this.queueForReview(userId, deviceCheck, traceId);
          return { status: "review", traceId, auditLog };
        }
      }

      // Step 5: Final approval
      auditLog.push(`[${traceId}] ✅ Failsafe completed - user approved`);
      await this.approveUser(userId, auditLog, traceId);
      insertKYCAuditLog({
        traceId,
        userId,
        action: "approved",
        details: { verification },
      });
      return { status: "approved", traceId, auditLog };
    } catch (error) {
      auditLog.push(`[${traceId}] ❌ Failsafe error: ${error instanceof Error ? error.message : String(error)}`);
      await this.logError(userId, error, traceId);

      // Failsafe's failsafe: Always escalate to manual review on error
      await this.queueForReview(userId, { riskScore: 90, isGenuine: false, signatures: ["error"], logs: [] }, traceId);
      return { status: "review", traceId, auditLog };
    }
  }

  /**
   * Queue user for manual review
   */
  private async queueForReview(
    userId: string,
    deviceCheck: DeviceIntegrityResult,
    traceId: string
  ): Promise<void> {
    const priority = deviceCheck.riskScore > 80 ? "high" : deviceCheck.riskScore > 50 ? "medium" : "low";

    insertKYCReviewQueue({
      userId,
      riskScore: deviceCheck.riskScore,
      deviceSignatures: deviceCheck.signatures,
      traceId,
      status: "pending",
      priority,
      metadata: {
        deviceCheck,
        queuedAt: new Date().toISOString(),
      },
    });

    insertKYCAuditLog({
      traceId,
      userId,
      action: "queued_for_review",
      details: { priority, deviceCheck },
      riskScore: deviceCheck.riskScore,
    });

    // Broadcast to WebSocket clients
    this.broadcastToClients({
      type: "kyc_review_queued",
      traceId,
      userId,
      riskScore: deviceCheck.riskScore,
      priority,
    });

    // Send admin alert
    await this.sendAdminAlert(userId, deviceCheck.riskScore, traceId);
  }

  /**
   * Approve user after successful verification
   */
  async approveUser(userId: string, auditLog: string[], traceId: string): Promise<void> {
    // Update review queue if exists
    const { updateKYCReviewStatus } = await import("../db");
    try {
      updateKYCReviewStatus(traceId, "approved", "system");
    } catch {
      // Queue item may not exist, that's okay
    }

    insertKYCAuditLog({
      traceId,
      userId,
      action: "approved",
      details: { auditLog },
    });
  }

  /**
   * Reject user
   */
  async rejectUser(userId: string, traceId: string, reason: string): Promise<void> {
    const { updateKYCReviewStatus } = await import("../db");
    try {
      updateKYCReviewStatus(traceId, "rejected", "system");
    } catch {
      // Queue item may not exist, that's okay
    }

    insertKYCAuditLog({
      traceId,
      userId,
      action: "rejected",
      details: { reason },
    });
  }

  private async logRejection(
    userId: string,
    deviceCheck: DeviceIntegrityResult,
    traceId: string
  ): Promise<void> {
    const s3Client = this.getS3Client();

    try {
      const rejectionData = new TextEncoder().encode(
        JSON.stringify({
          userId,
          timestamp: new Date().toISOString(),
          deviceCheck,
          traceId,
          reason: "high_risk_device",
        })
      );

      await s3Client.write(`kyc/rejections/${traceId}.json`, rejectionData, {
        contentType: "application/json",
      });
    } catch (error) {
      console.error(`[${traceId}] Failed to log rejection to S3:`, error);
    }
  }

  private async logError(userId: string, error: unknown, traceId: string): Promise<void> {
    const s3Client = this.getS3Client();

    try {
      const errorData = new TextEncoder().encode(
        JSON.stringify({
          userId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          traceId,
        })
      );

      await s3Client.write(`kyc/errors/${traceId}.json`, errorData, {
        contentType: "application/json",
      });
    } catch (s3Error) {
      console.error(`[${traceId}] Failed to log error to S3:`, s3Error);
    }
  }

  private async sendAdminAlert(
    userId: string,
    riskScore: number,
    traceId: string
  ): Promise<void> {
    if (!kycConfig.adminWebhookUrl) {
      return;
    }

    try {
      await fetch(kycConfig.adminWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 KYC Failsafe Alert: User ${userId} (Risk: ${riskScore})`,
          traceId,
          actionUrl: `https://admin.duoplus.app/kyc/review/${traceId}`,
        }),
      });
    } catch (error) {
      console.error(`[${traceId}] Failed to send admin alert:`, error);
    }
  }
}