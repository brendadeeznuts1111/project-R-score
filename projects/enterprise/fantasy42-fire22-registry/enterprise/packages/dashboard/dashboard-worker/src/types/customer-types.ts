/**
 * 🔥 Fire22 Customer Types & Interfaces
 * Standardized customer classifications and type definitions
 */

// Customer Type Enums
export enum CustomerType {
  NEW = 'new',
  POSTUP = 'postup',
  CREDIT = 'credit',
  RISKY = 'risky',
  VIP = 'vip',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  DORMANT = 'dormant',
}

export enum CustomerTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  WIRE_TRANSFER = 'wire_transfer',
  PAYPAL = 'paypal',
  CASHAPP = 'cashapp',
  VENMO = 'venmo',
  ZELLE = 'zelle',
  CRYPTO_BTC = 'crypto_btc',
  CRYPTO_ETH = 'crypto_eth',
  CRYPTO_USDC = 'crypto_usdc',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PREPAID_CARD = 'prepaid_card',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded',
}

export enum RiskLevel {
  TRUSTED = 'trusted',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum AgentLevel {
  SUPER_ADMIN = 1,
  MASTER_AGENT = 2,
  REGIONAL_MANAGER = 3,
  AREA_MANAGER = 4,
  BRANCH_MANAGER = 5,
  SENIOR_AGENT = 6,
  AGENT = 7,
  PLAYER = 8,
}

// Interface Definitions
export interface CustomerTypeConfig {
  code: string;
  name: string;
  description: string;
  maxDeposit: number;
  maxWithdrawal: number;
  commissionRate: number;
  verificationRequired: boolean;
  managerApprovalRequired: boolean;
  riskLevel: RiskLevel;
  color: string;
  icon: string;
}

export interface CustomerTierConfig {
  code: string;
  name: string;
  minVolume: number;
  maxVolume: number;
  commissionBoost: number;
  color: string;
  icon: string;
  benefits: string[];
}

export interface PaymentMethodConfig {
  code: string;
  name: string;
  commissionRate: number;
  processingTime: string;
  minAmount: number;
  maxAmount: number;
  currency: string;
  icon: string;
  color: string;
}

export interface TransactionStatusConfig {
  code: string;
  name: string;
  description: string;
  canCancel: boolean;
  canEdit: boolean;
  color: string;
  icon: string;
}

export interface RiskLevelConfig {
  code: string;
  name: string;
  description: string;
  autoApprovalLimit: number;
  manualReviewRequired: boolean;
  enhancedMonitoring: boolean;
  color: string;
  icon: string;
}

export interface AgentLevelConfig {
  code: string;
  name: string;
  commissionPercentage: number;
  maxDownline: number;
  canCreateAgents: boolean;
  managerRequired: boolean;
  color: string;
  icon: string;
}

// Core Customer Interface
export interface Customer {
  id: string;
  username: string;
  email: string;
  phone?: string;
  telegramId?: string;
  telegramUsername?: string;

  // Customer Classification
  type: CustomerType;
  tier: CustomerTier;
  riskLevel: RiskLevel;

  // Financial Information
  balance: number;
  creditLimit: number;
  lifetimeVolume: number;
  lifetimeCommission: number;

  // Agent Hierarchy
  agentId?: string;
  agentLevel: AgentLevel;
  uplineAgentId?: string;
  downlineCount: number;

  // Status & Verification
  isActive: boolean;
  isVerified: boolean;
  isSuspended: boolean;
  verificationDate?: Date;
  suspensionReason?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  lastTransactionAt?: Date;
}

// Transaction Interface
export interface Transaction {
  id: string;
  customerId: string;
  agentId?: string;

  // Transaction Details
  type: 'deposit' | 'withdrawal' | 'wager' | 'commission' | 'adjustment';
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;

  // Commission Information
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;

  // Processing Information
  processingStartTime?: Date;
  processingEndTime?: Date;
  approvedBy?: string;
  approvedAt?: Date;

  // External References
  externalTransactionId?: string;
  fire22TransactionId?: string;
  telegramMessageId?: string;

  // P2P Matching
  p2pMatchId?: string;
  p2pPartnerId?: string;

  // Metadata
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// P2P Queue Item Interface
export interface P2PQueueItem {
  id: string;
  customerId: string;
  type: 'deposit' | 'withdrawal';

  // Transaction Details
  amount: number;
  paymentMethod: PaymentMethod;
  currency: string;

  // Queue Information
  priority: number;
  timeoutAt: Date;
  matchTolerancePercentage: number;

  // Matching Preferences
  preferredPartnerIds?: string[];
  excludedPartnerIds?: string[];

  // Status
  isMatched: boolean;
  matchedWith?: string;
  matchedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Agent Interface
export interface Agent {
  id: string;
  code: string;
  username: string;
  email: string;

  // Hierarchy Information
  level: AgentLevel;
  uplineAgentId?: string;
  downlineAgentIds: string[];

  // Performance Metrics
  totalCommission: number;
  monthlyCommission: number;
  playerCount: number;
  activePlayerCount: number;

  // Configuration
  commissionRate: number;
  maxPlayers: number;
  canCreateSubAgents: boolean;

  // Status
  isActive: boolean;
  isVerified: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Validation Rule Interface
export interface ValidationRule {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  required: boolean;
  unique?: boolean;
  length?: number;
  decimalPlaces?: number;
}

// System Configuration Interface
export interface SystemConfig {
  MAX_DAILY_DEPOSIT: number;
  MAX_DAILY_WITHDRAWAL: number;
  MAX_PENDING_TRANSACTIONS: number;
  TRANSACTION_TIMEOUT_MINUTES: number;
  P2P_MATCH_TIMEOUT_MINUTES: number;
  P2P_QUEUE_MAX_ITEMS: number;
  P2P_MATCH_TOLERANCE_PERCENTAGE: number;
  BASE_COMMISSION_RATE: number;
  MIN_COMMISSION_AMOUNT: number;
  MAX_COMMISSION_PERCENTAGE: number;
}

// Export all constant mappings
export const CUSTOMER_TYPE_CONSTANTS: Record<CustomerType, CustomerTypeConfig>;
export const CUSTOMER_TIER_CONSTANTS: Record<CustomerTier, CustomerTierConfig>;
export const PAYMENT_METHOD_CONSTANTS: Record<PaymentMethod, PaymentMethodConfig>;
export const TRANSACTION_STATUS_CONSTANTS: Record<TransactionStatus, TransactionStatusConfig>;
export const RISK_LEVEL_CONSTANTS: Record<RiskLevel, RiskLevelConfig>;
export const AGENT_LEVEL_CONSTANTS: Record<AgentLevel, AgentLevelConfig>;
export const VALIDATION_RULES: Record<string, ValidationRule>;
export const SYSTEM_CONSTANTS: SystemConfig;
