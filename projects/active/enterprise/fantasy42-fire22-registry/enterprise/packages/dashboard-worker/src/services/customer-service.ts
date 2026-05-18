/**
 * 🔥 Fire22 Customer Service
 * Service class implementing customer type logic and business rules
 */

import {
  Customer,
  Transaction,
  CustomerType,
  CustomerTier,
  PaymentMethod,
  TransactionStatus,
  RiskLevel,
  AgentLevel,
} from '../types/customer-types';

import {
  CUSTOMER_TYPE_CONSTANTS,
  CUSTOMER_TIER_CONSTANTS,
  PAYMENT_METHOD_CONSTANTS,
  TRANSACTION_STATUS_CONSTANTS,
  RISK_LEVEL_CONSTANTS,
  AGENT_LEVEL_CONSTANTS,
  SYSTEM_CONSTANTS,
  CustomerUtils,
} from '../constants/customer-constants';

export class CustomerService {
  /**
   * Create a new customer with default values based on type
   */
  static createCustomer(data: Partial<Customer>): Customer {
    const customerType = data.type || CustomerType.NEW;
    const typeConfig = CUSTOMER_TYPE_CONSTANTS[customerType];

    const customer: Customer = {
      id: data.id || this.generateCustomerId(),
      username: data.username || '',
      email: data.email || '',
      phone: data.phone,
      telegramId: data.telegramId,
      telegramUsername: data.telegramUsername,

      // Customer Classification
      type: customerType,
      tier: data.tier || CustomerTier.BRONZE,
      riskLevel: data.riskLevel || typeConfig.riskLevel,

      // Financial Information
      balance: data.balance || 0,
      creditLimit: data.creditLimit || 0,
      lifetimeVolume: data.lifetimeVolume || 0,
      lifetimeCommission: data.lifetimeCommission || 0,

      // Agent Hierarchy
      agentId: data.agentId,
      agentLevel: data.agentLevel || AgentLevel.PLAYER,
      uplineAgentId: data.uplineAgentId,
      downlineCount: data.downlineCount || 0,

      // Status & Verification
      isActive: data.isActive !== undefined ? data.isActive : true,
      isVerified: data.isVerified || false,
      isSuspended: data.isSuspended || false,
      verificationDate: data.verificationDate,
      suspensionReason: data.suspensionReason,

      // Timestamps
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      lastLoginAt: data.lastLoginAt,
      lastTransactionAt: data.lastTransactionAt,
    };

    return customer;
  }

  /**
   * Validate transaction against customer limits and rules
   */
  static validateTransaction(
    customer: Customer,
    amount: number,
    paymentMethod: PaymentMethod,
    transactionType: 'deposit' | 'withdrawal'
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check customer status
    if (!customer.isActive) {
      errors.push('Customer account is inactive');
    }

    if (customer.isSuspended) {
      errors.push('Customer account is suspended');
    }

    if (customer.type === CustomerType.BANNED) {
      errors.push('Customer is banned from platform');
    }

    // Check customer type limits
    const typeConfig = CUSTOMER_TYPE_CONSTANTS[customer.type];
    const maxAmount =
      transactionType === 'deposit' ? typeConfig.maxDeposit : typeConfig.maxWithdrawal;

    if (amount > maxAmount) {
      errors.push(
        `Transaction amount exceeds ${transactionType} limit of $${maxAmount.toLocaleString()}`
      );
    }

    // Check payment method limits
    const paymentConfig = PAYMENT_METHOD_CONSTANTS[paymentMethod];

    if (amount < paymentConfig.minAmount) {
      errors.push(`Amount below minimum of $${paymentConfig.minAmount} for ${paymentConfig.name}`);
    }

    if (amount > paymentConfig.maxAmount) {
      errors.push(
        `Amount exceeds maximum of $${paymentConfig.maxAmount.toLocaleString()} for ${paymentConfig.name}`
      );
    }

    // Check risk level limits
    const riskConfig = RISK_LEVEL_CONSTANTS[customer.riskLevel];

    if (amount > riskConfig.autoApprovalLimit) {
      // This is not an error, just requires manual approval
      // But we'll note it for the caller to handle
    }

    // Check verification requirements
    if (typeConfig.verificationRequired && !customer.isVerified) {
      errors.push('Customer verification required for this transaction type');
    }

    // Special checks for credit customers
    if (customer.type === CustomerType.CREDIT && transactionType === 'withdrawal') {
      if (amount > customer.balance + customer.creditLimit) {
        errors.push('Withdrawal exceeds available balance plus credit limit');
      }
    } else if (transactionType === 'withdrawal' && amount > customer.balance) {
      errors.push('Insufficient balance for withdrawal');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate commission for a transaction
   */
  static calculateCommission(
    customer: Customer,
    amount: number,
    paymentMethod: PaymentMethod
  ): {
    baseRate: number;
    tierBoost: number;
    paymentMethodRate: number;
    totalRate: number;
    commissionAmount: number;
    netAmount: number;
  } {
    const baseRate = CUSTOMER_TYPE_CONSTANTS[customer.type].commissionRate;
    const tierBoost = CUSTOMER_TIER_CONSTANTS[customer.tier].commissionBoost;
    const paymentMethodRate = PAYMENT_METHOD_CONSTANTS[paymentMethod].commissionRate;

    const totalRate = Math.min(baseRate + tierBoost, SYSTEM_CONSTANTS.MAX_COMMISSION_PERCENTAGE);

    const commissionAmount = Math.max(amount * totalRate, SYSTEM_CONSTANTS.MIN_COMMISSION_AMOUNT);

    const netAmount = amount - commissionAmount;

    return {
      baseRate,
      tierBoost,
      paymentMethodRate,
      totalRate,
      commissionAmount,
      netAmount,
    };
  }

  /**
   * Update customer tier based on lifetime volume
   */
  static updateCustomerTier(customer: Customer): CustomerTier {
    const newTier = CustomerUtils.getTierByVolume(customer.lifetimeVolume);

    if (newTier !== customer.tier) {
      customer.tier = newTier;
      customer.updatedAt = new Date();
    }

    return newTier;
  }

  /**
   * Check if transaction requires manager approval
   */
  static requiresManagerApproval(
    customer: Customer,
    amount: number,
    paymentMethod: PaymentMethod,
    transactionType: 'deposit' | 'withdrawal'
  ): boolean {
    const typeConfig = CUSTOMER_TYPE_CONSTANTS[customer.type];
    const riskConfig = RISK_LEVEL_CONSTANTS[customer.riskLevel];

    // Always require approval for these customer types
    if (typeConfig.managerApprovalRequired) {
      return true;
    }

    // Require approval if risk level demands it
    if (riskConfig.manualReviewRequired) {
      return true;
    }

    // Require approval if amount exceeds auto-approval limit
    if (amount > riskConfig.autoApprovalLimit) {
      return true;
    }

    // Require approval for large transactions
    if (transactionType === 'deposit' && amount > SYSTEM_CONSTANTS.MAX_DAILY_DEPOSIT * 0.5) {
      return true;
    }

    if (transactionType === 'withdrawal' && amount > SYSTEM_CONSTANTS.MAX_DAILY_WITHDRAWAL * 0.5) {
      return true;
    }

    return false;
  }

  /**
   * Get customer display information
   */
  static getCustomerDisplayInfo(customer: Customer): {
    typeInfo: { name: string; icon: string; color: string };
    tierInfo: { name: string; icon: string; color: string };
    riskInfo: { name: string; icon: string; color: string };
    statusBadges: Array<{ text: string; color: string; icon: string }>;
  } {
    const typeConfig = CUSTOMER_TYPE_CONSTANTS[customer.type];
    const tierConfig = CUSTOMER_TIER_CONSTANTS[customer.tier];
    const riskConfig = RISK_LEVEL_CONSTANTS[customer.riskLevel];

    const statusBadges: Array<{ text: string; color: string; icon: string }> = [];

    if (!customer.isActive) {
      statusBadges.push({ text: 'Inactive', color: '#757575', icon: '⚫' });
    }

    if (customer.isSuspended) {
      statusBadges.push({ text: 'Suspended', color: '#ff5722', icon: '⏸️' });
    }

    if (!customer.isVerified && typeConfig.verificationRequired) {
      statusBadges.push({ text: 'Unverified', color: '#ff9800', icon: '⚠️' });
    } else if (customer.isVerified) {
      statusBadges.push({ text: 'Verified', color: '#4caf50', icon: '✅' });
    }

    if (riskConfig.enhancedMonitoring) {
      statusBadges.push({ text: 'Enhanced Monitoring', color: '#9c27b0', icon: '🔍' });
    }

    return {
      typeInfo: {
        name: typeConfig.name,
        icon: typeConfig.icon,
        color: typeConfig.color,
      },
      tierInfo: {
        name: tierConfig.name,
        icon: tierConfig.icon,
        color: tierConfig.color,
      },
      riskInfo: {
        name: riskConfig.name,
        icon: riskConfig.icon,
        color: riskConfig.color,
      },
      statusBadges,
    };
  }

  /**
   * Get recommended payment methods for customer
   */
  static getRecommendedPaymentMethods(customer: Customer): PaymentMethod[] {
    const recommendations: PaymentMethod[] = [];

    // Base recommendations by customer type
    switch (customer.type) {
      case CustomerType.NEW:
        recommendations.push(PaymentMethod.CASHAPP, PaymentMethod.VENMO, PaymentMethod.PAYPAL);
        break;

      case CustomerType.POSTUP:
        recommendations.push(
          PaymentMethod.BANK_TRANSFER,
          PaymentMethod.PAYPAL,
          PaymentMethod.ZELLE
        );
        break;

      case CustomerType.CREDIT:
        recommendations.push(
          PaymentMethod.WIRE_TRANSFER,
          PaymentMethod.BANK_TRANSFER,
          PaymentMethod.CRYPTO_USDC
        );
        break;

      case CustomerType.VIP:
        recommendations.push(
          PaymentMethod.WIRE_TRANSFER,
          PaymentMethod.CRYPTO_BTC,
          PaymentMethod.CRYPTO_USDC,
          PaymentMethod.BANK_TRANSFER
        );
        break;

      case CustomerType.RISKY:
        recommendations.push(PaymentMethod.BANK_TRANSFER, PaymentMethod.WIRE_TRANSFER);
        break;

      default:
        recommendations.push(PaymentMethod.PAYPAL, PaymentMethod.BANK_TRANSFER);
    }

    // Filter by tier benefits
    if (customer.tier === CustomerTier.DIAMOND || customer.tier === CustomerTier.PLATINUM) {
      // High tier customers get access to all methods
      return Object.values(PaymentMethod);
    }

    return recommendations;
  }

  /**
   * Generate unique customer ID
   */
  private static generateCustomerId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `CUST_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Process customer upgrade/downgrade
   */
  static processCustomerTypeChange(
    customer: Customer,
    newType: CustomerType,
    reason: string,
    approvedBy: string
  ): { success: boolean; message: string; changes: any[] } {
    const oldType = customer.type;
    const changes: any[] = [];

    // Validate the change
    if (oldType === newType) {
      return {
        success: false,
        message: 'Customer is already of this type',
        changes: [],
      };
    }

    // Record the change
    changes.push({
      field: 'type',
      oldValue: oldType,
      newValue: newType,
      reason,
      approvedBy,
      timestamp: new Date(),
    });

    // Update customer
    customer.type = newType;
    customer.riskLevel = CUSTOMER_TYPE_CONSTANTS[newType].riskLevel;
    customer.updatedAt = new Date();

    // Additional updates based on new type
    if (newType === CustomerType.SUSPENDED || newType === CustomerType.BANNED) {
      customer.isSuspended = true;
      customer.suspensionReason = reason;
    } else if (oldType === CustomerType.SUSPENDED || oldType === CustomerType.BANNED) {
      customer.isSuspended = false;
      customer.suspensionReason = undefined;
    }

    return {
      success: true,
      message: `Customer type changed from ${CUSTOMER_TYPE_CONSTANTS[oldType].name} to ${CUSTOMER_TYPE_CONSTANTS[newType].name}`,
      changes,
    };
  }
}

export default CustomerService;
