/**
 * KYC Review tab – shared types
 */

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

export interface DetailedReviewItem {
  id: number;
  user_id: string;
  risk_score: number;
  device_signatures: string;
  trace_id: string;
  status: string;
  priority: string;
  created_at: number;
  reviewed_at: number | null;
  reviewer_id: string | null;
  auditLog: Array<{
    id: number;
    trace_id: string;
    user_id: string;
    action: string;
    timestamp: Date;
    details: Record<string, unknown>;
    risk_score: number | null;
  }>;
  documents: Array<{
    id: number;
    trace_id: string;
    s3_key: string;
    document_type: string;
    extracted_data_json: string | null;
    uploaded_at: Date;
    extractedData: Record<string, unknown>;
  }>;
  deviceVerification: {
    trace_id: string;
    user_id: string;
    is_genuine: boolean;
    risk_score: number;
    signatures: string[];
    logs: string[];
    verified_at: Date;
  } | null;
  biometric: {
    trace_id: string;
    user_id: string;
    passed: boolean;
    liveness_score: number;
    attempted_at: Date;
  } | null;
}

export interface KYCMetrics {
  pending: number;
  approved: number;
  rejected: number;
  highPriority: number;
  avgRiskScore: number;
}

export interface FilterState {
  search: string;
  status: ("pending" | "approved" | "rejected")[] | null;
  priority: ("low" | "medium" | "high")[] | null;
  riskScoreMin: number | null;
  riskScoreMax: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  reviewerId: string | null;
}
