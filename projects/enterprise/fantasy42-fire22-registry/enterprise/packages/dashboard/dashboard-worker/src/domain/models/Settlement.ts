/**
 * Domain Model: Settlement
 * Represents a financial settlement with comprehensive business logic
 */
export interface Settlement {
  id: string;
  collectionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  processingFee: number;
  netAmount: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  agentId: string;
  agentName?: string;
  merchantId: string;
  merchantName?: string;
  transactionId?: string;
  paymentMethod?: string;
  notes?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
}

/**
 * Settlement status enumeration for type safety
 */
export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Settlement filter options for querying
 */
export interface SettlementFilters {
  status?: SettlementStatus;
  agentId?: string;
  merchantId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  currency?: string;
  collectionId?: string;
}

/**
 * Settlement summary statistics
 */
export interface SettlementSummary {
  totalSettlements: number;
  totalAmount: number;
  totalFees: number;
  netAmount: number;
  pendingSettlements: number;
  pendingAmount: number;
  processingSettlements: number;
  processingAmount: number;
  completedSettlements: number;
  completedAmount: number;
  failedSettlements: number;
  failedAmount: number;
  averageProcessingTime?: number;
  successRate: number;
  feePercentage: number;
}

/**
 * Settlement processing result
 */
export interface SettlementResult {
  settlementId: string;
  success: boolean;
  transactionId?: string;
  processedAt: Date;
  fee: number;
  netAmount: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}
