/**
 * Controller Types
 * Shared types and interfaces for API controllers
 */

import type { BaseEntity, Status, Currency } from '../shared/common';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type ResponseStatus = 'success' | 'error' | 'partial' | 'pending';

export interface ApiResponse<T = any> {
  status: ResponseStatus;
  message: string;
  data?: T;
  errors?: string[];
  metadata?: {
    timestamp: Date;
    requestId: string;
    processingTime: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface ControllerRequest extends Request {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: any;
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
  session?: {
    id: string;
    data: Record<string, any>;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeParams {
  dateFrom?: Date;
  dateTo?: Date;
  timezone?: string;
}

export interface FilterParams {
  status?: Status;
  customerId?: string;
  agentId?: string;
  type?: string;
  category?: string;
  search?: string;
}

export interface ControllerConfig {
  timeout: number;
  retries: number;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  caching: {
    enabled: boolean;
    ttl: number;
  };
  validation: {
    strict: boolean;
    sanitize: boolean;
  };
}

// Settlement Types
export interface SettlementRecord extends BaseEntity {
  settlementId: string;
  customerId: string;
  customerName: string;
  wagerId: string;
  event: string;
  betType: string;
  selection: string;
  stake: number;
  odds: number;
  potentialPayout: number;
  outcome: 'won' | 'lost' | 'push' | 'cancelled';
  status: 'pending' | 'settled' | 'cancelled';
  settledAmount: number;
  settledDate?: Date;
  processedBy: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface SettlementSummary {
  totalSettlements: number;
  totalAmount: number;
  pendingCount: number;
  settledCount: number;
  wonCount: number;
  lostCount: number;
  averageStake: number;
  averagePayout: number;
  totalProfit: number;
}

// Adjustment Types
export interface AdjustmentRecord extends BaseEntity {
  adjustmentId: string;
  customerId: string;
  agentId: string;
  adjustmentType: string;
  amount: number;
  reason: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requestedBy: string;
  approvedBy?: string;
  processedBy?: string;
  approvedAt?: Date;
  processedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface AdjustmentType {
  id: string;
  name: string;
  description: string;
  category: string;
  requiresApproval: boolean;
  maxAmount: number;
  minAmount: number;
  active: boolean;
  createdBy: string;
  createdAt: Date;
}

// Balance Types
export interface CustomerBalance extends BaseEntity {
  customerId: string;
  currentBalance: number;
  availableBalance: number;
  pendingWagers: number;
  creditLimit: number;
  lastUpdated: Date;
  currency: Currency;
  status: Status;
  accountType: 'regular' | 'vip' | 'house';
}

export interface BalanceUpdate extends BaseEntity {
  customerId: string;
  previousBalance: number;
  newBalance: number;
  changeAmount: number;
  changeType: 'deposit' | 'withdrawal' | 'adjustment' | 'wager' | 'settlement';
  reference: string;
  performedBy: string;
  approvedBy?: string;
  notes?: string;
}

export interface BalanceSettings {
  minBalance: number;
  maxBalance: number;
  warningThreshold: number;
  criticalThreshold: number;
  requireApprovalThreshold: number;
  autoSettlementEnabled: boolean;
  settlementDelayHours: number;
}

// Distribution/Payout Types
export interface DistributionRecord extends BaseEntity {
  distributionId: string;
  agentId: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  grossAmount: number;
  adjustments: number;
  netAmount: number;
  status: 'calculated' | 'approved' | 'paid' | 'cancelled';
  paymentMethod: 'bank_transfer' | 'check' | 'wire' | 'crypto';
  paymentReference?: string;
  paidAt?: Date;
  processedBy: string;
  notes?: string;
}

export interface DistributionSummary {
  totalDistributions: number;
  totalAmount: number;
  pendingCount: number;
  paidCount: number;
  averageAmount: number;
  topRecipients: Array<{
    agentId: string;
    name: string;
    totalAmount: number;
  }>;
}

// System Types
export interface SystemLog extends BaseEntity {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  message: string;
  details?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  stackTrace?: string;
}

export interface SystemAlert extends BaseEntity {
  alertId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  activeConnections: number;
  requestCount: number;
  errorCount: number;
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
}

// Dashboard Types
export interface DashboardData {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    totalBalance: number;
    pendingSettlements: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    amount?: number;
    timestamp: Date;
  }>;
  alerts: SystemAlert[];
  metrics: SystemMetrics;
  timestamp: Date;
}

// Utility Types
export type ControllerResult<T = any> = Promise<Response>;

export interface ControllerContext {
  request: ControllerRequest;
  config: ControllerConfig;
  logger: {
    debug: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
  };
  cache: {
    get: <T>(key: string) => Promise<T | null>;
    set: <T>(key: string, value: T, ttl?: number) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
}

// Export type guards
export function isSettlementRecord(obj: any): obj is SettlementRecord {
  return obj && typeof obj.settlementId === 'string' && typeof obj.customerId === 'string';
}

export function isAdjustmentRecord(obj: any): obj is AdjustmentRecord {
  return obj && typeof obj.adjustmentId === 'string' && typeof obj.customerId === 'string';
}

export function isCustomerBalance(obj: any): obj is CustomerBalance {
  return obj && typeof obj.customerId === 'string' && typeof obj.currentBalance === 'number';
}

export function isDistributionRecord(obj: any): obj is DistributionRecord {
  return obj && typeof obj.distributionId === 'string' && typeof obj.agentId === 'string';
}
