/**
 * Finance Types
 * Shared types and interfaces for finance-related functionality
 */

import type { BaseEntity, Currency, Status } from '../shared/common';

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'wager'
  | 'settlement'
  | 'adjustment'
  | 'system'
  | 'bonus'
  | 'refund'
  | 'fee'
  | 'commission'
  | 'transfer';

export type BalanceChangeReason =
  | 'manual_adjustment'
  | 'bet_placement'
  | 'bet_settlement'
  | 'deposit'
  | 'withdrawal'
  | 'bonus_credit'
  | 'bonus_redemption'
  | 'fee_charge'
  | 'commission_payment'
  | 'system_correction'
  | 'account_closure'
  | 'account_reactivation';

export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'paypal'
  | 'crypto'
  | 'cash'
  | 'check'
  | 'wire_transfer'
  | 'ach'
  | 'other';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export interface BalanceValidationRules {
  minBalance: number;
  maxBalance: number;
  warningThreshold: number;
  criticalThreshold: number;
  dailyChangeLimit: number;
  weeklyChangeLimit: number;
  monthlyChangeLimit: number;
  maxNegativeBalance: number;
  requireApprovalThreshold: number;
}

export interface BalanceChangeEvent extends BaseEntity {
  customerId: string;
  agentId: string;
  changeType: TransactionType;
  previousBalance: number;
  newBalance: number;
  changeAmount: number;
  reason: BalanceChangeReason;
  performedBy: string;
  approvedBy?: string;
  approvalRequired: boolean;
  riskScore?: number;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  sessionId?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface BalanceThresholdAlert extends BaseEntity {
  customerId: string;
  agentId: string;
  alertType: 'warning' | 'critical' | 'limit_exceeded' | 'approval_required';
  threshold: number;
  currentBalance: number;
  previousBalance: number;
  triggerAmount: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  autoResolved: boolean;
  resolutionNotes?: string;
  escalationLevel: number;
}

export interface BalanceAnalytics {
  customerId: string;
  agentId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  startingBalance: number;
  endingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalWagers: number;
  totalSettlements: number;
  totalAdjustments: number;
  totalFees: number;
  totalBonuses: number;
  netChange: number;
  changePercentage: number;
  volatilityScore: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  riskLevel: RiskLevel;
  averageBalance: number;
  maxBalance: number;
  minBalance: number;
  transactionCount: number;
  uniqueTransactionTypes: number;
  largestDeposit: number;
  largestWithdrawal: number;
  mostActiveDay: string;
  patterns: BalancePattern[];
}

export interface BalancePattern {
  type: 'deposit_pattern' | 'withdrawal_pattern' | 'betting_pattern' | 'activity_pattern';
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'irregular';
  averageAmount: number;
  confidence: number; // 0-100
  impact: 'positive' | 'negative' | 'neutral';
  recommendation?: string;
}

export interface TransactionRecord extends BaseEntity {
  customerId: string;
  agentId: string;
  transactionType: TransactionType;
  amount: number;
  currency: Currency;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  externalTransactionId?: string;
  gatewayTransactionId?: string;
  feeAmount: number;
  netAmount: number;
  description: string;
  reference?: string;
  category: string;
  tags: string[];
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  sessionId?: string;
  location?: {
    country: string;
    region: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  metadata?: Record<string, any>;
}

export interface PaymentGatewayConfig {
  gatewayId: string;
  name: string;
  type: 'credit_card' | 'bank_transfer' | 'crypto' | 'wallet' | 'other';
  isActive: boolean;
  credentials: Record<string, string>;
  supportedCurrencies: Currency[];
  supportedCountries: string[];
  feeStructure: {
    fixedFee: number;
    percentageFee: number;
    minFee: number;
    maxFee: number;
  };
  limits: {
    minAmount: number;
    maxAmount: number;
    dailyLimit: number;
    monthlyLimit: number;
  };
  features: {
    recurringPayments: boolean;
    refunds: boolean;
    chargebacks: boolean;
    verification: boolean;
    sandboxMode: boolean;
  };
  webhooks: {
    enabled: boolean;
    endpoints: string[];
    secret: string;
  };
}

export interface CommissionStructure {
  id: string;
  name: string;
  type: 'flat' | 'percentage' | 'tiered' | 'hybrid';
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  baseRate: number;
  tiers?: CommissionTier[];
  conditions?: CommissionCondition[];
  overrides?: CommissionOverride[];
}

export interface CommissionTier {
  minAmount: number;
  maxAmount?: number;
  rate: number;
  bonus?: number;
}

export interface CommissionCondition {
  type: 'volume' | 'frequency' | 'performance' | 'tenure';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
  value: number | [number, number];
  adjustment: number;
}

export interface CommissionOverride {
  customerId?: string;
  agentId?: string;
  rate: number;
  reason: string;
  appliedBy: string;
  appliedAt: Date;
  expiresAt?: Date;
}

export interface AffiliateProfile extends BaseEntity {
  userId: string;
  referralCode: string;
  status: Status;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  commissionStructureId: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  conversionRate: number;
  averageReferralValue: number;
  topReferrer: boolean;
  marketingMaterials: string[];
  customLandingPage?: string;
  trackingPixels: string[];
  notifications: AffiliateNotificationSettings;
}

export interface AffiliateNotificationSettings {
  commissionEarned: boolean;
  newReferral: boolean;
  referralActivity: boolean;
  paymentProcessed: boolean;
  tierUpgrade: boolean;
  marketingUpdates: boolean;
}

export interface FreePlayBonus extends BaseEntity {
  customerId: string;
  agentId: string;
  bonusType:
    | 'free_bet'
    | 'free_play'
    | 'cashback'
    | 'match_bonus'
    | 'reload_bonus'
    | 'loyalty_bonus';
  amount: number;
  currency: Currency;
  wagerRequirement: number;
  expiryDate: Date;
  claimedAt?: Date;
  redeemedAt?: Date;
  remainingAmount: number;
  status: 'active' | 'expired' | 'cancelled' | 'redeemed';
  conditions: BonusCondition[];
  source: 'manual' | 'automatic' | 'promotion' | 'loyalty_program';
  reference?: string;
}

export interface BonusCondition {
  type: 'deposit_amount' | 'wager_amount' | 'game_type' | 'time_period' | 'frequency';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
  value: number | [number, number];
  description: string;
}

export interface DeviceProfile {
  id: string;
  customerId: string;
  deviceId: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'other';
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  userAgent: string;
  screenResolution?: string;
  timezone: string;
  language: string;
  isTrusted: boolean;
  trustScore: number; // 0-100
  firstSeen: Date;
  lastSeen: Date;
  sessionCount: number;
  totalTransactions: number;
  failedLoginAttempts: number;
  riskFactors: DeviceRiskFactor[];
  locationHistory: DeviceLocation[];
}

export interface DeviceRiskFactor {
  factor: string;
  risk: RiskLevel;
  score: number;
  description: string;
  detectedAt: Date;
  mitigated: boolean;
}

export interface DeviceLocation {
  timestamp: Date;
  ipAddress: string;
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface UserAgentProfile {
  id: string;
  customerId: string;
  userAgent: string;
  fingerprint: string;
  isLegitimate: boolean;
  riskScore: number;
  botProbability: number;
  automationIndicators: string[];
  lastAnalysis: Date;
  analysisVersion: string;
  recommendations: string[];
}

// Export utility types
export type BalanceChangeCreate = Omit<BalanceChangeEvent, keyof BaseEntity>;
export type TransactionCreate = Omit<TransactionRecord, keyof BaseEntity>;
export type AffiliateProfileCreate = Omit<AffiliateProfile, keyof BaseEntity>;
export type FreePlayBonusCreate = Omit<FreePlayBonus, keyof BaseEntity>;
export type DeviceProfileCreate = Omit<DeviceProfile, keyof BaseEntity>;
