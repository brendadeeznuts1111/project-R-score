/**
 * 🔥 Fire22 Customer Constants Implementation
 * All standardized constants for customer types, payment methods, etc.
 */

import {
  CustomerType,
  CustomerTier,
  PaymentMethod,
  TransactionStatus,
  RiskLevel,
  AgentLevel,
} from '../types/customer-types';
import type {
  CustomerTypeConfig,
  CustomerTierConfig,
  PaymentMethodConfig,
  TransactionStatusConfig,
  RiskLevelConfig,
  AgentLevelConfig,
  ValidationRule,
  SystemConfig,
} from '../types/customer-types';

// Customer Type Constants
export const CUSTOMER_TYPE_CONSTANTS: Record<CustomerType, CustomerTypeConfig> = {
  [CustomerType.NEW]: {
    code: 'NEW',
    name: 'New Customer',
    description: 'Recently registered, under probation period',
    maxDeposit: 1000,
    maxWithdrawal: 500,
    commissionRate: 0.008, // 0.8%
    verificationRequired: false,
    managerApprovalRequired: false,
    riskLevel: RiskLevel.LOW,
    color: '#4caf50',
    icon: '🆕',
  },
  [CustomerType.POSTUP]: {
    code: 'POSTUP',
    name: 'Post-Up Customer',
    description: 'Must deposit before placing wagers',
    maxDeposit: 5000,
    maxWithdrawal: 2500,
    commissionRate: 0.012, // 1.2%
    verificationRequired: true,
    managerApprovalRequired: false,
    riskLevel: RiskLevel.MEDIUM,
    color: '#ff9800',
    icon: '💰',
  },
  [CustomerType.CREDIT]: {
    code: 'CREDIT',
    name: 'Credit Customer',
    description: 'Can wager on credit, weekly settlement',
    maxDeposit: 50000,
    maxWithdrawal: 25000,
    commissionRate: 0.02, // 2.0%
    verificationRequired: true,
    managerApprovalRequired: true,
    riskLevel: RiskLevel.HIGH,
    color: '#2196f3',
    icon: '💳',
  },
  [CustomerType.RISKY]: {
    code: 'RISKY',
    name: 'High Risk Customer',
    description: 'Flagged for suspicious activity, enhanced monitoring',
    maxDeposit: 500,
    maxWithdrawal: 250,
    commissionRate: 0.005, // 0.5%
    verificationRequired: true,
    managerApprovalRequired: true,
    riskLevel: RiskLevel.CRITICAL,
    color: '#f44336',
    icon: '⚠️',
  },
  [CustomerType.VIP]: {
    code: 'VIP',
    name: 'VIP Customer',
    description: 'High-value customer with premium privileges',
    maxDeposit: 100000,
    maxWithdrawal: 50000,
    commissionRate: 0.035, // 3.5%
    verificationRequired: true,
    managerApprovalRequired: false,
    riskLevel: RiskLevel.TRUSTED,
    color: '#9c27b0',
    icon: '👑',
  },
  [CustomerType.SUSPENDED]: {
    code: 'SUSPENDED',
    name: 'Suspended Customer',
    description: 'Temporarily suspended, no transactions allowed',
    maxDeposit: 0,
    maxWithdrawal: 0,
    commissionRate: 0.0,
    verificationRequired: true,
    managerApprovalRequired: true,
    riskLevel: RiskLevel.SUSPENDED,
    color: '#795548',
    icon: '⏸️',
  },
  [CustomerType.BANNED]: {
    code: 'BANNED',
    name: 'Banned Customer',
    description: 'Permanently banned from platform',
    maxDeposit: 0,
    maxWithdrawal: 0,
    commissionRate: 0.0,
    verificationRequired: false,
    managerApprovalRequired: true,
    riskLevel: RiskLevel.BANNED,
    color: '#424242',
    icon: '🚫',
  },
  [CustomerType.DORMANT]: {
    code: 'DORMANT',
    name: 'Dormant Customer',
    description: 'Inactive for 90+ days, reduced limits',
    maxDeposit: 2500,
    maxWithdrawal: 1000,
    commissionRate: 0.01, // 1.0%
    verificationRequired: false,
    managerApprovalRequired: false,
    riskLevel: RiskLevel.LOW,
    color: '#607d8b',
    icon: '😴',
  },
};

// Customer Tier Constants
export const CUSTOMER_TIER_CONSTANTS: Record<CustomerTier, CustomerTierConfig> = {
  [CustomerTier.BRONZE]: {
    code: 'BRONZE',
    name: 'Bronze Tier',
    minVolume: 0,
    maxVolume: 100000,
    commissionBoost: 0.0, // +0.0%
    color: '#cd7f32',
    icon: '🥉',
    benefits: ['Standard support', 'Basic features'],
  },
  [CustomerTier.SILVER]: {
    code: 'SILVER',
    name: 'Silver Tier',
    minVolume: 100000,
    maxVolume: 500000,
    commissionBoost: 0.005, // +0.5%
    color: '#c0c0c0',
    icon: '🥈',
    benefits: ['Priority support', 'Enhanced features', 'Monthly bonus'],
  },
  [CustomerTier.GOLD]: {
    code: 'GOLD',
    name: 'Gold Tier',
    minVolume: 500000,
    maxVolume: 2000000,
    commissionBoost: 0.01, // +1.0%
    color: '#ffd700',
    icon: '🥇',
    benefits: ['VIP support', 'Premium features', 'Weekly bonus', 'Custom limits'],
  },
  [CustomerTier.PLATINUM]: {
    code: 'PLATINUM',
    name: 'Platinum Tier',
    minVolume: 2000000,
    maxVolume: 10000000,
    commissionBoost: 0.015, // +1.5%
    color: '#e5e4e2',
    icon: '💎',
    benefits: ['Dedicated manager', 'All features', 'Daily bonus', 'Unlimited limits'],
  },
  [CustomerTier.DIAMOND]: {
    code: 'DIAMOND',
    name: 'Diamond Tier',
    minVolume: 10000000,
    maxVolume: Infinity,
    commissionBoost: 0.02, // +2.0%
    color: '#b9f2ff',
    icon: '💎',
    benefits: ['Personal concierge', 'Early access', 'Hourly bonus', 'White-glove service'],
  },
};

// Payment Method Constants
export const PAYMENT_METHOD_CONSTANTS: Record<PaymentMethod, PaymentMethodConfig> = {
  [PaymentMethod.BANK_TRANSFER]: {
    code: 'BANK_TRANSFER',
    name: 'Bank Transfer',
    commissionRate: 0.008, // 0.8%
    processingTime: '2-5 business days',
    minAmount: 100,
    maxAmount: 50000,
    currency: 'USD',
    icon: '🏦',
    color: '#4caf50',
  },
  [PaymentMethod.WIRE_TRANSFER]: {
    code: 'WIRE_TRANSFER',
    name: 'Wire Transfer',
    commissionRate: 0.015, // 1.5%
    processingTime: '1-3 business days',
    minAmount: 1000,
    maxAmount: 100000,
    currency: 'USD',
    icon: '📡',
    color: '#2196f3',
  },
  [PaymentMethod.PAYPAL]: {
    code: 'PAYPAL',
    name: 'PayPal',
    commissionRate: 0.014, // 1.4%
    processingTime: '2-5 minutes',
    minAmount: 10,
    maxAmount: 10000,
    currency: 'USD',
    icon: '🅿️',
    color: '#0070ba',
  },
  [PaymentMethod.CASHAPP]: {
    code: 'CASHAPP',
    name: 'Cash App',
    commissionRate: 0.011, // 1.1%
    processingTime: '1-3 minutes',
    minAmount: 5,
    maxAmount: 7500,
    currency: 'USD',
    icon: '💚',
    color: '#00d632',
  },
  [PaymentMethod.VENMO]: {
    code: 'VENMO',
    name: 'Venmo',
    commissionRate: 0.012, // 1.2%
    processingTime: '1-3 minutes',
    minAmount: 5,
    maxAmount: 5000,
    currency: 'USD',
    icon: '💙',
    color: '#1e88e5',
  },
  [PaymentMethod.ZELLE]: {
    code: 'ZELLE',
    name: 'Zelle',
    commissionRate: 0.009, // 0.9%
    processingTime: 'Instant',
    minAmount: 1,
    maxAmount: 2500,
    currency: 'USD',
    icon: '⚡',
    color: '#6a1b9a',
  },
  [PaymentMethod.CRYPTO_BTC]: {
    code: 'CRYPTO_BTC',
    name: 'Bitcoin',
    commissionRate: 0.005, // 0.5%
    processingTime: '30-60 minutes',
    minAmount: 50,
    maxAmount: 25000,
    currency: 'BTC',
    icon: '₿',
    color: '#f7931a',
  },
  [PaymentMethod.CRYPTO_ETH]: {
    code: 'CRYPTO_ETH',
    name: 'Ethereum',
    commissionRate: 0.006, // 0.6%
    processingTime: '10-30 minutes',
    minAmount: 50,
    maxAmount: 25000,
    currency: 'ETH',
    icon: '⟨Ξ⟩',
    color: '#627eea',
  },
  [PaymentMethod.CRYPTO_USDC]: {
    code: 'CRYPTO_USDC',
    name: 'USD Coin',
    commissionRate: 0.004, // 0.4%
    processingTime: '10-30 minutes',
    minAmount: 10,
    maxAmount: 50000,
    currency: 'USDC',
    icon: '💲',
    color: '#2775ca',
  },
  [PaymentMethod.CREDIT_CARD]: {
    code: 'CREDIT_CARD',
    name: 'Credit Card',
    commissionRate: 0.025, // 2.5%
    processingTime: '1-5 minutes',
    minAmount: 10,
    maxAmount: 5000,
    currency: 'USD',
    icon: '💳',
    color: '#ff5722',
  },
  [PaymentMethod.DEBIT_CARD]: {
    code: 'DEBIT_CARD',
    name: 'Debit Card',
    commissionRate: 0.018, // 1.8%
    processingTime: '1-5 minutes',
    minAmount: 10,
    maxAmount: 3000,
    currency: 'USD',
    icon: '💳',
    color: '#4caf50',
  },
  [PaymentMethod.PREPAID_CARD]: {
    code: 'PREPAID_CARD',
    name: 'Prepaid Card',
    commissionRate: 0.022, // 2.2%
    processingTime: '1-10 minutes',
    minAmount: 10,
    maxAmount: 2000,
    currency: 'USD',
    icon: '💳',
    color: '#9c27b0',
  },
};

// Transaction Status Constants
export const TRANSACTION_STATUS_CONSTANTS: Record<TransactionStatus, TransactionStatusConfig> = {
  [TransactionStatus.PENDING]: {
    code: 'PENDING',
    name: 'Pending Review',
    description: 'Transaction awaiting approval',
    canCancel: true,
    canEdit: true,
    color: '#ff9800',
    icon: '⏳',
  },
  [TransactionStatus.PROCESSING]: {
    code: 'PROCESSING',
    name: 'Processing',
    description: 'Transaction is being processed',
    canCancel: false,
    canEdit: false,
    color: '#2196f3',
    icon: '🔄',
  },
  [TransactionStatus.APPROVED]: {
    code: 'APPROVED',
    name: 'Approved',
    description: 'Transaction approved by manager',
    canCancel: false,
    canEdit: false,
    color: '#4caf50',
    icon: '✅',
  },
  [TransactionStatus.COMPLETED]: {
    code: 'COMPLETED',
    name: 'Completed',
    description: 'Transaction successfully completed',
    canCancel: false,
    canEdit: false,
    color: '#4caf50',
    icon: '🎉',
  },
  [TransactionStatus.FAILED]: {
    code: 'FAILED',
    name: 'Failed',
    description: 'Transaction failed to process',
    canCancel: false,
    canEdit: false,
    color: '#f44336',
    icon: '❌',
  },
  [TransactionStatus.CANCELLED]: {
    code: 'CANCELLED',
    name: 'Cancelled',
    description: 'Transaction cancelled by user or system',
    canCancel: false,
    canEdit: false,
    color: '#795548',
    icon: '🚫',
  },
  [TransactionStatus.EXPIRED]: {
    code: 'EXPIRED',
    name: 'Expired',
    description: 'Transaction expired due to timeout',
    canCancel: false,
    canEdit: false,
    color: '#607d8b',
    icon: '⌛',
  },
  [TransactionStatus.DISPUTED]: {
    code: 'DISPUTED',
    name: 'Disputed',
    description: 'Transaction under dispute investigation',
    canCancel: false,
    canEdit: false,
    color: '#9c27b0',
    icon: '⚖️',
  },
  [TransactionStatus.REFUNDED]: {
    code: 'REFUNDED',
    name: 'Refunded',
    description: 'Transaction amount refunded to customer',
    canCancel: false,
    canEdit: false,
    color: '#00bcd4',
    icon: '↩️',
  },
};

// Risk Level Constants
export const RISK_LEVEL_CONSTANTS: Record<RiskLevel, RiskLevelConfig> = {
  [RiskLevel.TRUSTED]: {
    code: 'TRUSTED',
    name: 'Trusted',
    description: 'Highest trust level, minimal restrictions',
    autoApprovalLimit: 100000,
    manualReviewRequired: false,
    enhancedMonitoring: false,
    color: '#4caf50',
    icon: '🛡️',
  },
  [RiskLevel.LOW]: {
    code: 'LOW',
    name: 'Low Risk',
    description: 'Standard risk level, normal monitoring',
    autoApprovalLimit: 10000,
    manualReviewRequired: false,
    enhancedMonitoring: false,
    color: '#8bc34a',
    icon: '🟢',
  },
  [RiskLevel.MEDIUM]: {
    code: 'MEDIUM',
    name: 'Medium Risk',
    description: 'Moderate risk, increased monitoring',
    autoApprovalLimit: 5000,
    manualReviewRequired: false,
    enhancedMonitoring: true,
    color: '#ff9800',
    icon: '🟡',
  },
  [RiskLevel.HIGH]: {
    code: 'HIGH',
    name: 'High Risk',
    description: 'High risk profile, manual review required',
    autoApprovalLimit: 1000,
    manualReviewRequired: true,
    enhancedMonitoring: true,
    color: '#ff5722',
    icon: '🟠',
  },
  [RiskLevel.CRITICAL]: {
    code: 'CRITICAL',
    name: 'Critical Risk',
    description: 'Critical risk, all transactions require approval',
    autoApprovalLimit: 0,
    manualReviewRequired: true,
    enhancedMonitoring: true,
    color: '#f44336',
    icon: '🔴',
  },
  [RiskLevel.SUSPENDED]: {
    code: 'SUSPENDED',
    name: 'Suspended',
    description: 'Account suspended, no transactions allowed',
    autoApprovalLimit: 0,
    manualReviewRequired: true,
    enhancedMonitoring: true,
    color: '#795548',
    icon: '⏸️',
  },
  [RiskLevel.BANNED]: {
    code: 'BANNED',
    name: 'Banned',
    description: 'Permanently banned, access denied',
    autoApprovalLimit: 0,
    manualReviewRequired: true,
    enhancedMonitoring: false,
    color: '#424242',
    icon: '🚫',
  },
};

// Agent Level Constants
export const AGENT_LEVEL_CONSTANTS: Record<AgentLevel, AgentLevelConfig> = {
  [AgentLevel.SUPER_ADMIN]: {
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    commissionPercentage: 0.25, // 25% of commission pool
    maxDownline: 1000,
    canCreateAgents: true,
    managerRequired: false,
    color: '#ff1744',
    icon: '👑',
  },
  [AgentLevel.MASTER_AGENT]: {
    code: 'MASTER_AGENT',
    name: 'Master Agent',
    commissionPercentage: 0.2, // 20% of commission pool
    maxDownline: 500,
    canCreateAgents: true,
    managerRequired: false,
    color: '#ff5722',
    icon: '🎖️',
  },
  [AgentLevel.REGIONAL_MANAGER]: {
    code: 'REGIONAL_MANAGER',
    name: 'Regional Manager',
    commissionPercentage: 0.15, // 15% of commission pool
    maxDownline: 200,
    canCreateAgents: true,
    managerRequired: true,
    color: '#ff9800',
    icon: '🌍',
  },
  [AgentLevel.AREA_MANAGER]: {
    code: 'AREA_MANAGER',
    name: 'Area Manager',
    commissionPercentage: 0.13, // 13% of commission pool
    maxDownline: 100,
    canCreateAgents: true,
    managerRequired: true,
    color: '#ffc107',
    icon: '🏢',
  },
  [AgentLevel.BRANCH_MANAGER]: {
    code: 'BRANCH_MANAGER',
    name: 'Branch Manager',
    commissionPercentage: 0.12, // 12% of commission pool
    maxDownline: 50,
    canCreateAgents: true,
    managerRequired: true,
    color: '#8bc34a',
    icon: '🏪',
  },
  [AgentLevel.SENIOR_AGENT]: {
    code: 'SENIOR_AGENT',
    name: 'Senior Agent',
    commissionPercentage: 0.1, // 10% of commission pool
    maxDownline: 25,
    canCreateAgents: true,
    managerRequired: true,
    color: '#00bcd4',
    icon: '👨‍💼',
  },
  [AgentLevel.AGENT]: {
    code: 'AGENT',
    name: 'Agent',
    commissionPercentage: 0.05, // 5% of commission pool
    maxDownline: 10,
    canCreateAgents: false,
    managerRequired: true,
    color: '#9c27b0',
    icon: '👤',
  },
  [AgentLevel.PLAYER]: {
    code: 'PLAYER',
    name: 'Player',
    commissionPercentage: 0.0, // 0% (pays commission)
    maxDownline: 0,
    canCreateAgents: false,
    managerRequired: false,
    color: '#607d8b',
    icon: '🎲',
  },
};

// Validation Rules
export const VALIDATION_RULES: Record<string, ValidationRule> = {
  CUSTOMER_USERNAME: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    required: true,
  },
  CUSTOMER_EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    required: true,
    unique: true,
  },
  CUSTOMER_PHONE: {
    pattern: /^\+?[\d\s\-\(\)]{10,20}$/,
    required: false,
  },
  TRANSACTION_AMOUNT: {
    min: 1,
    max: 1000000,
    decimalPlaces: 2,
    required: true,
  },
  AGENT_CODE: {
    length: 8,
    pattern: /^[A-Z0-9]{8}$/,
    required: true,
    unique: true,
  },
  TELEGRAM_USER_ID: {
    pattern: /^\d{9,15}$/,
    required: false,
  },
  BITCOIN_ADDRESS: {
    pattern: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    required: false,
  },
};

// System Constants
export const SYSTEM_CONSTANTS: SystemConfig = {
  // Transaction Limits
  MAX_DAILY_DEPOSIT: 50000,
  MAX_DAILY_WITHDRAWAL: 25000,
  MAX_PENDING_TRANSACTIONS: 10,
  TRANSACTION_TIMEOUT_MINUTES: 30,

  // P2P Queue Settings
  P2P_MATCH_TIMEOUT_MINUTES: 15,
  P2P_QUEUE_MAX_ITEMS: 1000,
  P2P_MATCH_TOLERANCE_PERCENTAGE: 0.05, // 5%

  // Commission Settings
  BASE_COMMISSION_RATE: 0.4, // 40% of house edge goes to commissions
  MIN_COMMISSION_AMOUNT: 0.01,
  MAX_COMMISSION_PERCENTAGE: 0.035, // 3.5%
};

// Utility Functions
export class CustomerUtils {
  static getCustomerTypeConfig(type: CustomerType): CustomerTypeConfig {
    return CUSTOMER_TYPE_CONSTANTS[type];
  }

  static getCustomerTierConfig(tier: CustomerTier): CustomerTierConfig {
    return CUSTOMER_TIER_CONSTANTS[tier];
  }

  static getPaymentMethodConfig(method: PaymentMethod): PaymentMethodConfig {
    return PAYMENT_METHOD_CONSTANTS[method];
  }

  static calculateTotalCommissionRate(
    type: CustomerType,
    tier: CustomerTier,
    paymentMethod: PaymentMethod
  ): number {
    const baseRate = CUSTOMER_TYPE_CONSTANTS[type].commissionRate;
    const tierBoost = CUSTOMER_TIER_CONSTANTS[tier].commissionBoost;
    const paymentRate = PAYMENT_METHOD_CONSTANTS[paymentMethod].commissionRate;

    return Math.min(baseRate + tierBoost + paymentRate, SYSTEM_CONSTANTS.MAX_COMMISSION_PERCENTAGE);
  }

  static isTransactionAllowed(
    customer: { type: CustomerType; riskLevel: RiskLevel },
    amount: number,
    transactionType: 'deposit' | 'withdrawal'
  ): boolean {
    const typeConfig = CUSTOMER_TYPE_CONSTANTS[customer.type];
    const riskConfig = RISK_LEVEL_CONSTANTS[customer.riskLevel];

    if (customer.type === CustomerType.BANNED || customer.type === CustomerType.SUSPENDED) {
      return false;
    }

    const maxAmount =
      transactionType === 'deposit' ? typeConfig.maxDeposit : typeConfig.maxWithdrawal;

    return amount <= maxAmount && amount <= riskConfig.autoApprovalLimit;
  }

  static getTierByVolume(lifetimeVolume: number): CustomerTier {
    if (lifetimeVolume >= CUSTOMER_TIER_CONSTANTS[CustomerTier.DIAMOND].minVolume) {
      return CustomerTier.DIAMOND;
    } else if (lifetimeVolume >= CUSTOMER_TIER_CONSTANTS[CustomerTier.PLATINUM].minVolume) {
      return CustomerTier.PLATINUM;
    } else if (lifetimeVolume >= CUSTOMER_TIER_CONSTANTS[CustomerTier.GOLD].minVolume) {
      return CustomerTier.GOLD;
    } else if (lifetimeVolume >= CUSTOMER_TIER_CONSTANTS[CustomerTier.SILVER].minVolume) {
      return CustomerTier.SILVER;
    } else {
      return CustomerTier.BRONZE;
    }
  }
}
