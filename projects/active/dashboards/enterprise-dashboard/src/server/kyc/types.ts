// KYC Failsafe Types and Interfaces

export interface DeviceIntegrityResult {
  isGenuine: boolean;
  riskScore: number;
  signatures: string[];
  logs: string[];
}

export interface KYCFailsafeResult {
  status: "approved" | "review" | "rejected";
  traceId: string;
  auditLog: string[];
}

export interface DocumentVerification {
  confidence: number;
  extractedData: Record<string, any>;
}

export interface BiometricResult {
  passed: boolean;
  livenessScore: number;
}

export interface ReviewDecision {
  action: "approve" | "reject" | "request_more_info";
  confidence: number;
  reason: string;
}

export interface ProcessingReport {
  timestamp: Date;
  processed: number;
  approved: number;
  rejected: number;
  errors: Array<{ userId: string; error: string }>;
}

export interface PlayIntegrityResult {
  passed: boolean;
  failureReason?: string;
}

export interface ReviewQueueItem {
  id: number;
  userId: string;
  riskScore: number;
  deviceSignatures: string[];
  traceId: string;
  status: "pending" | "approved" | "rejected";
  priority: "low" | "medium" | "high";
  createdAt: Date;
  reviewedAt?: Date;
  reviewerId?: string;
}

export interface KYCAuditLog {
  traceId: string;
  userId: string;
  action: string;
  timestamp: Date;
  details: Record<string, any>;
  riskScore?: number;
}

export interface KYCConfig {
  maxRetries: number;
  manualReviewThreshold: number;
  adbPath: string;
  androidVersion: string;
  packageName: string;
  s3Bucket: string;
  googleCloudKey?: string;
  awsAccessKey?: string;
  adminWebhookUrl?: string;
}