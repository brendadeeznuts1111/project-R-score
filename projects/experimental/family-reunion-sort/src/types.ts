// Database types and interfaces for the dispute handling system

export interface Dispute {
  id: string;
  transactionId: string;
  customerId: string;
  merchantId: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  requestedResolution: ResolutionType;
  evidenceUrls: string[];
  merchantResponse?: MerchantResponse;
  resolution?: DisputeResolution;
  venmoDisputeId?: string;
  venmoStatus?: string;
  venmoResolution?: string;
  refundId?: string;
  timeline: TimelineEvent[];
  contactMerchantFirst: boolean;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface Transaction {
  id: string;
  venmoPaymentId: string;
  amount: number;
  merchantId: string;
  merchantUsername: string;
  customerId: string;
  items: TransactionItem[];
  createdAt: Date;
  location?: Location;
  requiresDelivery: boolean;
  qrCodeData: string;
}

export interface TransactionItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MerchantResponse {
  message: string;
  acceptsFault: boolean;
  evidence?: string[];
  resolutionOffer?: {
    type: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'EXCHANGE' | 'STORE_CREDIT';
    amount?: number;
    description: string;
  };
}

export interface DisputeResolution {
  outcome: 'CUSTOMER_WINS_FULL_REFUND' | 'CUSTOMER_WINS_PARTIAL_REFUND' | 'MERCHANT_WINS' | 'COMPROMISE';
  reason: string;
  refundAmount?: number;
  compromiseDetails?: string;
  factors?: string[];
}

export interface TimelineEvent {
  event: string;
  timestamp: Date;
  actor: 'CUSTOMER' | 'MERCHANT' | 'SYSTEM' | 'VENMO';
  details?: string;
}

export interface DisputeChat {
  disputeId: string;
  encryptionKey: string;
  messages: DisputeMessage[];
  participants: ChatParticipant[];
  isActive: boolean;
  createdAt: Date;
}

export interface DisputeMessage {
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isSystem?: boolean;
  attachments?: string[];
}

export interface ChatParticipant {
  userId: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'MODERATOR';
}

export interface CreateDisputeRequest {
  transactionId: string;
  customerId: string;
  reason: string;
  description: string;
  evidence: string[];
  requestedResolution: ResolutionType;
  contactMerchantFirst: boolean;
}

export interface Merchant {
  id: string;
  username: string;
  displayName: string;
  email: string;
  phone?: string;
  isVerified: boolean;
  rating: number;
  totalTransactions: number;
  disputeRate: number;
  venmoBusinessId?: string;
  createdAt: Date;
}

export interface Customer {
  id: string;
  username: string;
  email: string;
  phone?: string;
  totalDisputes: number;
  disputeWinRate: number;
  createdAt: Date;
}

export type DisputeStatus = 
  | 'SUBMITTED'
  | 'MERCHANT_REVIEW'
  | 'UNDER_REVIEW'
  | 'ESCALATED_TO_VENMO'
  | 'INTERNAL_REVIEW'
  | 'RESOLVED'
  | 'CLOSED';

export type ResolutionType = 
  | 'REFUND_FULL'
  | 'REFUND_PARTIAL'
  | 'EXCHANGE'
  | 'STORE_CREDIT';

export interface AIEvidenceAnalysis {
  disputeId: string;
  overallScore: number; // 0.0 to 1.0
  recommendation: 'APPROVE' | 'REJECT' | 'FURTHER_REVIEW' | 'COMPROMISE';
  confidence: number;
  detectedSentiment: {
    customer: string;
    merchant?: string;
  };
  keyFindings: string[];
  anomaliesDetected: string[];
  evidenceValidation: Array<{
    url: string;
    type: 'PHOTO' | 'DOCUMENT' | 'VIDEO' | 'OTHER';
    authenticityScore: number;
    relevanceScore: number;
    extractedText?: string;
    description: string;
  }>;
  complianceCheck: {
    regulationECompliant: boolean;
    missingRequiredDocs: string[];
  };
  analyzedAt: Date;
}

export interface DisputeReport {
  summary: {
    id: string;
    status: DisputeStatus;
    outcome?: string;
    amount: number;
    daysToResolve: number;
  };
  parties: {
    customer: any;
    merchant: Merchant | null;
    moderator: string;
  };
  timeline: TimelineEvent[];
  evidence: {
    totalFiles: number;
    fileTypes: { [key: string]: number };
    totalSize: number;
  };
  decisionFactors: string[];
  compliance: {
    pciCompliant: boolean;
    dataRetention: string;
    auditTrail: Array<{
      action: string;
      timestamp: Date;
      actor: string;
      details: string;
    }>;
  };
}

export interface RiskFactor {
  factor: string;
  score: number;
  details: string;
}

export interface DisputeMetrics {
  totalDisputes: number;
  resolutionRate: number;
  averageResolutionTime: number;
  topDisputeReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  highRiskMerchants: Merchant[];
  customerSatisfaction: number;
  financialImpact: {
    totalAmountDisputed: number;
    totalRefundsIssued: number;
    fraudPreventionSavings: number;
  };
}

export interface VenmoWebhookPayload {
  type: 'dispute.created' | 'dispute.updated' | 'dispute.resolved' | 'refund.processed';
  data: any;
  timestamp: string;
}

export interface VenmoDisputeCreatedPayload {
  dispute_id: string;
  payment_id: string;
  status: string;
  created_at: string;
  amount: number;
}

export interface VenmoDisputeResolvedPayload {
  dispute_id: string;
  status: string;
  resolution: 'won' | 'lost' | 'partial';
  resolved_at: string;
  refund_amount?: number;
}

export interface DisputeDecision {
  outcome: 'CUSTOMER_WINS_FULL_REFUND' | 'CUSTOMER_WINS_PARTIAL_REFUND' | 'MERCHANT_WINS' | 'COMPROMISE';
  reason: string;
  partialAmount?: number;
  compromiseDetails?: string;
}

// Database schema for SQLite
export const DATABASE_SCHEMA = `
-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  venmo_payment_id TEXT UNIQUE NOT NULL,
  amount REAL NOT NULL,
  merchant_id TEXT NOT NULL,
  merchant_username TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  items TEXT NOT NULL, -- JSON array
  created_at DATETIME NOT NULL,
  location TEXT, -- JSON object
  requires_delivery BOOLEAN DEFAULT FALSE,
  qr_code_data TEXT NOT NULL
);

-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  rating REAL DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  dispute_rate REAL DEFAULT 0,
  venmo_business_id TEXT,
  created_at DATETIME NOT NULL
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  total_disputes INTEGER DEFAULT 0,
  dispute_win_rate REAL DEFAULT 0,
  created_at DATETIME NOT NULL
);

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_resolution TEXT NOT NULL,
  evidence_urls TEXT NOT NULL, -- JSON array
  merchant_response TEXT, -- JSON object
  resolution TEXT, -- JSON object
  venmo_dispute_id TEXT,
  venmo_status TEXT,
  venmo_resolution TEXT,
  refund_id TEXT,
  timeline TEXT NOT NULL, -- JSON array
  contact_merchant_first BOOLEAN DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  resolved_at DATETIME,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- Dispute chats table
CREATE TABLE IF NOT EXISTS dispute_chats (
  dispute_id TEXT PRIMARY KEY,
  encryption_key TEXT NOT NULL,
  messages TEXT NOT NULL, -- JSON array
  participants TEXT NOT NULL, -- JSON array
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (dispute_id) REFERENCES disputes(id)
);

-- Evidence files table
CREATE TABLE IF NOT EXISTS evidence_files (
  id TEXT PRIMARY KEY,
  dispute_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at DATETIME NOT NULL,
  FOREIGN KEY (dispute_id) REFERENCES disputes(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_customer ON disputes(customer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_merchant ON disputes(merchant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
`;
