/**
 * Domain Model: Collection
 * Represents a financial collection with comprehensive business logic
 */
export interface Collection {
  id: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processed' | 'failed' | 'cancelled';
  createdAt: Date;
  processedAt?: Date;
  customerName: string;
  referenceId: string;
  settlementId?: string;
  description?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Collection status enumeration for type safety
 */
export enum CollectionStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Collection filter options for querying
 */
export interface CollectionFilters {
  status?: CollectionStatus;
  merchantId?: string;
  customerName?: string;
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  currency?: string;
  tags?: string[];
}

/**
 * Collection summary statistics
 */
export interface CollectionSummary {
  totalCollections: number;
  totalAmount: number;
  pendingCollections: number;
  pendingAmount: number;
  processedCollections: number;
  processedAmount: number;
  failedCollections: number;
  failedAmount: number;
  averageProcessingTime?: number;
  successRate: number;
}
