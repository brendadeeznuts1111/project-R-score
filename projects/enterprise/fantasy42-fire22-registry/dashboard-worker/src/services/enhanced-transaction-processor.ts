/**
 * 🔥 Fire22 Enhanced Transaction Processor with L-Key Integration
 * Complete transaction processing system with full L-Key mapping and audit trails
 */

import {
  PartyType,
  CustomerType,
  TransactionType,
  PaymentMethod,
  ORDER_CONSTANTS,
  FEE_STRUCTURE,
  L_KEY_MAPPING,
  calculateTotalFee,
  getLKeyForValue,
  getValueForLKey,
  requiresEnhancedKYC,
} from '../types/fire22-otc-constants';

import {
  lKeyMapper,
  entityMapper,
  transactionFlowMapper,
  auditTrailMapper,
  MappedEntity,
} from '../utils/l-key-mapper';

import { createFire22Logger } from '../../packages/enhanced-logging/src';

// Initialize enhanced logger
const logger = createFire22Logger({
  enableLKeyTracking: true,
  component: 'enhanced-transaction-processor',
});

// !==!==!==!==!==!==!==!===
// TRANSACTION INTERFACES
// !==!==!==!==!==!==!==!===

export interface TransactionRequest {
  id: string;
  type: TransactionType;

  // Parties
  fromCustomerId: string;
  fromCustomerType: CustomerType;
  fromTelegramId: string;
  fromUsername: string;

  toCustomerId: string;
  toCustomerType: CustomerType;
  toTelegramId: string;
  toUsername: string;

  // Transaction Details
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;

  // Service Information
  serviceTier?: number;
  monthlyVolume?: number;
  referralCode?: string;

  // Metadata
  description?: string;
  metadata?: Record<string, any>;
}

export interface ProcessedTransaction {
  // Basic Info
  id: string;
  status: string;
  type: TransactionType;

  // L-Key Mapping
  transactionLKey: string;
  fromCustomerLKey: string;
  toCustomerLKey: string;
  paymentMethodLKey: string;
  statusLKey: string;

  // Entities
  fromEntity: MappedEntity;
  toEntity: MappedEntity;
  transactionEntity: MappedEntity;

  // Financial Details
  amount: number;
  currency: string;
  fees: {
    baseFee: number;
    tierDiscount: number;
    volumeDiscount: number;
    paymentSurcharge: number;
    totalFee: number;
    effectiveRate: number;
  };

  // Flow Tracking
  flowSequence: string[]; // L-Key sequence of transaction flow
  auditTrail: string[]; // All L-Keys involved

  // Compliance
  kycRequired: boolean;
  riskScore: number;
  complianceChecks: string[];

  // Timing
  createdAt: Date;
  processedAt?: Date;
  settledAt?: Date;

  // Results
  success: boolean;
  errorMessage?: string;
  settlementHash?: string;
}

// !==!==!==!==!==!==!==!===
// ENHANCED TRANSACTION PROCESSOR
// !==!==!==!==!==!==!==!===

export class EnhancedTransactionProcessor {
  private static instance: EnhancedTransactionProcessor;
  private processedTransactions: Map<string, ProcessedTransaction> = new Map();

  private constructor() {}

  public static getInstance(): EnhancedTransactionProcessor {
    if (!EnhancedTransactionProcessor.instance) {
      EnhancedTransactionProcessor.instance = new EnhancedTransactionProcessor();
    }
    return EnhancedTransactionProcessor.instance;
  }

  /**
   * Process a complete transaction with full L-Key mapping
   */
  public async processTransaction(request: TransactionRequest): Promise<ProcessedTransaction> {
    logger.info(`🔥 Processing Transaction ${request.id} with L-Key mapping`, {
      component: 'transaction-processor',
      entityId: request.id,
    });

    // Step 1: Generate L-Keys for all components
    const transactionLKey =
      getLKeyForValue(request.type) || lKeyMapper.generateNextLKey('TRANSACTIONS');
    const fromCustomerLKey =
      getLKeyForValue(request.fromCustomerType) || lKeyMapper.generateNextLKey('CUSTOMERS');
    const toCustomerLKey =
      getLKeyForValue(request.toCustomerType) || lKeyMapper.generateNextLKey('CUSTOMERS');
    const paymentMethodLKey =
      getLKeyForValue(request.paymentMethod) || lKeyMapper.generateNextLKey('PAYMENTS');
    const statusLKey = getLKeyForValue('PENDING') || 'L6001';

    logger.debug(
      '📍 L-Keys Generated',
      {
        entityId: request.id,
        component: 'l-key-generator',
      },
      {
        transactionLKey: `${transactionLKey} (${request.type})`,
        fromCustomerLKey: `${fromCustomerLKey} (${request.fromCustomerType})`,
        toCustomerLKey: `${toCustomerLKey} (${request.toCustomerType})`,
        paymentMethodLKey: `${paymentMethodLKey} (${request.paymentMethod})`,
        statusLKey,
      }
    );

    // Step 2: Create entity mappings
    const fromEntity = entityMapper.mapCustomer({
      id: request.fromCustomerId,
      type: request.fromCustomerType,
      username: request.fromUsername,
      telegramId: request.fromTelegramId,
      serviceTier: request.serviceTier || 1,
      metadata: {
        role: 'SENDER',
        transactionId: request.id,
      },
    });

    const toEntity = entityMapper.mapCustomer({
      id: request.toCustomerId,
      type: request.toCustomerType,
      username: request.toUsername,
      telegramId: request.toTelegramId,
      serviceTier: request.serviceTier || 1,
      metadata: {
        role: 'RECEIVER',
        transactionId: request.id,
      },
    });

    const transactionEntity = entityMapper.mapTransaction({
      id: request.id,
      type: request.type,
      amount: request.amount,
      currency: request.currency,
      fromParty: request.fromCustomerId,
      toParty: request.toCustomerId,
      paymentMethod: request.paymentMethod,
      metadata: {
        description: request.description,
        referralCode: request.referralCode,
        ...request.metadata,
      },
    });

    // Log entity mappings with L-Keys
    logger.logEntityMapping(
      'CUSTOMER',
      fromEntity.id,
      fromEntity.lKey,
      {
        username: request.fromUsername,
        role: 'SENDER',
      },
      { entityId: request.id }
    );

    logger.logEntityMapping(
      'CUSTOMER',
      toEntity.id,
      toEntity.lKey,
      {
        username: request.toUsername,
        role: 'RECEIVER',
      },
      { entityId: request.id }
    );

    logger.logEntityMapping(
      'TRANSACTION',
      transactionEntity.id,
      transactionEntity.lKey,
      {
        type: request.type,
        amount: request.amount,
        currency: request.currency,
      },
      { entityId: request.id }
    );

    // Step 3: Calculate fees using enhanced system
    const fees = calculateTotalFee({
      amount: request.amount,
      customerType: request.fromCustomerType,
      paymentMethod: request.paymentMethod,
      serviceTier: request.serviceTier || 1,
      monthlyVolume: request.monthlyVolume || 0,
    });

    // Log comprehensive fee calculation
    logger.logFeeCalculation(request.id, fees, transactionLKey, {
      entityId: request.id,
      component: 'fee-calculator',
    });

    // Step 4: Compliance checks
    const kycRequired = requiresEnhancedKYC(request.amount, request.fromCustomerType);
    const riskScore = this.calculateRiskScore(request);
    const complianceChecks = await this.performComplianceChecks(request, riskScore);

    console.log(`🛡️  Compliance Status:
    Enhanced KYC Required: ${kycRequired}
    Risk Score: ${riskScore}/100
    Compliance Checks: ${complianceChecks.length} completed`);

    // Step 5: Generate transaction flow sequence
    const flowSequence = this.generateFlowSequence(request, {
      transactionLKey,
      fromCustomerLKey,
      toCustomerLKey,
      paymentMethodLKey,
      statusLKey,
    });

    console.log(`🔄 Transaction Flow: ${flowSequence.join(' → ')}`);

    // Step 6: Create processed transaction
    const processedTransaction: ProcessedTransaction = {
      id: request.id,
      status: 'PROCESSING',
      type: request.type,

      // L-Key Mapping
      transactionLKey,
      fromCustomerLKey,
      toCustomerLKey,
      paymentMethodLKey,
      statusLKey,

      // Entities
      fromEntity,
      toEntity,
      transactionEntity,

      // Financial Details
      amount: request.amount,
      currency: request.currency,
      fees,

      // Flow Tracking
      flowSequence,
      auditTrail: [
        transactionLKey,
        fromCustomerLKey,
        toCustomerLKey,
        paymentMethodLKey,
        statusLKey,
      ],

      // Compliance
      kycRequired,
      riskScore,
      complianceChecks,

      // Timing
      createdAt: new Date(),

      // Results (will be updated)
      success: false,
    };

    // Step 7: Log initial audit entry
    auditTrailMapper.logEntry({
      action: 'TRANSACTION_INITIATED',
      entityId: request.id,
      entityType: request.type,
      userId: request.fromCustomerId,
      metadata: {
        amount: request.amount,
        toCustomer: request.toCustomerId,
        paymentMethod: request.paymentMethod,
        lKeys: processedTransaction.auditTrail,
        fees: fees,
      },
    });

    // Step 8: Execute transaction processing
    try {
      await this.executeTransaction(processedTransaction);
      processedTransaction.success = true;
      processedTransaction.status = 'COMPLETED';
      processedTransaction.processedAt = new Date();
      processedTransaction.statusLKey = getLKeyForValue('FILLED') || 'L6004';

      console.log(`✅ Transaction ${request.id} completed successfully`);

      // Log success audit entry
      auditTrailMapper.logEntry({
        action: 'TRANSACTION_COMPLETED',
        entityId: request.id,
        entityType: request.type,
        userId: request.fromCustomerId,
        metadata: {
          finalStatus: processedTransaction.status,
          fees: processedTransaction.fees,
          settlementHash: processedTransaction.settlementHash,
        },
      });
    } catch (error: any) {
      processedTransaction.success = false;
      processedTransaction.status = 'FAILED';
      processedTransaction.errorMessage = error.message;
      processedTransaction.statusLKey = getLKeyForValue('REJECTED') || 'L6006';

      console.error(`❌ Transaction ${request.id} failed: ${error.message}`);

      // Log failure audit entry
      auditTrailMapper.logEntry({
        action: 'TRANSACTION_FAILED',
        entityId: request.id,
        entityType: request.type,
        userId: request.fromCustomerId,
        metadata: {
          error: error.message,
          failurePoint: processedTransaction.status,
        },
      });
    }

    // Store processed transaction
    this.processedTransactions.set(request.id, processedTransaction);

    return processedTransaction;
  }

  /**
   * Execute the actual transaction processing
   */
  private async executeTransaction(transaction: ProcessedTransaction): Promise<void> {
    // Simulate processing steps
    await this.sleep(1000);

    // Update status to processing
    transaction.status = 'VALIDATING';
    transaction.statusLKey = 'L6007'; // MATCHING

    // Validate balances
    console.log(`🔍 Validating balances for ${transaction.amount} ${transaction.currency}`);
    await this.sleep(500);

    // Process payment
    transaction.status = 'PROCESSING_PAYMENT';
    console.log(`💳 Processing ${transaction.paymentMethodLKey} payment`);
    await this.sleep(1500);

    // Settle transaction
    transaction.status = 'SETTLING';
    console.log(`⚡ Settling transaction via ${getValueForLKey(transaction.paymentMethodLKey)}`);
    await this.sleep(1000);

    // Generate settlement hash
    transaction.settlementHash = this.generateSettlementHash();
    transaction.settledAt = new Date();

    console.log(`🎯 Settlement completed: ${transaction.settlementHash}`);
  }

  /**
   * Calculate risk score for transaction
   */
  private calculateRiskScore(request: TransactionRequest): number {
    let riskScore = 0;

    // Amount-based risk
    if (request.amount > 100000) riskScore += 30;
    else if (request.amount > 25000) riskScore += 15;
    else if (request.amount > 10000) riskScore += 5;

    // Customer type risk
    if (request.fromCustomerType === CustomerType.HIGH_RISK) riskScore += 40;
    else if (request.fromCustomerType === CustomerType.NEW) riskScore += 20;
    else if (request.fromCustomerType === CustomerType.VIP) riskScore -= 10;

    // Payment method risk
    if (request.paymentMethod === PaymentMethod.CASH_DEPOSIT) riskScore += 25;
    else if (request.paymentMethod === PaymentMethod.PAYPAL) riskScore += 10;
    else if (request.paymentMethod === PaymentMethod.BANK_WIRE) riskScore -= 5;

    return Math.max(0, Math.min(100, riskScore));
  }

  /**
   * Perform compliance checks
   */
  private async performComplianceChecks(
    request: TransactionRequest,
    riskScore: number
  ): Promise<string[]> {
    const checks = ['KYC_VERIFICATION', 'AML_SCREENING'];

    if (request.amount > 10000) {
      checks.push('CTR_REPORTING', 'LARGE_TRANSACTION_REVIEW');
    }

    if (riskScore > 60) {
      checks.push('ENHANCED_DUE_DILIGENCE', 'MANUAL_REVIEW');
    }

    if (
      request.paymentMethod === PaymentMethod.BITCOIN ||
      request.paymentMethod === PaymentMethod.ETHEREUM
    ) {
      checks.push('CRYPTO_COMPLIANCE', 'BLOCKCHAIN_ANALYSIS');
    }

    // Simulate check processing
    await this.sleep(200 * checks.length);

    return checks;
  }

  /**
   * Generate transaction flow sequence using L-Keys
   */
  private generateFlowSequence(
    request: TransactionRequest,
    lKeys: {
      transactionLKey: string;
      fromCustomerLKey: string;
      toCustomerLKey: string;
      paymentMethodLKey: string;
      statusLKey: string;
    }
  ): string[] {
    const flow = [
      lKeys.fromCustomerLKey, // Initiator
      lKeys.transactionLKey, // Transaction type
      lKeys.paymentMethodLKey, // Payment method
      'L6001', // PENDING
      'L6002', // OPEN
      'L6007', // MATCHING/PROCESSING
      lKeys.toCustomerLKey, // Recipient
      'L6004', // FILLED/COMPLETED
      'L3010', // INSTANT_SETTLEMENT
    ];

    // Add compliance steps for high-risk transactions
    if (requiresEnhancedKYC(request.amount, request.fromCustomerType)) {
      flow.splice(-2, 0, 'L8008'); // ENHANCED_KYC
    }

    return flow;
  }

  /**
   * Generate settlement hash
   */
  private generateSettlementHash(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 16);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get transaction by ID
   */
  public getTransaction(id: string): ProcessedTransaction | undefined {
    return this.processedTransactions.get(id);
  }

  /**
   * Get all transactions
   */
  public getAllTransactions(): ProcessedTransaction[] {
    return Array.from(this.processedTransactions.values());
  }

  /**
   * Get transactions by status
   */
  public getTransactionsByStatus(status: string): ProcessedTransaction[] {
    return this.getAllTransactions().filter(t => t.status === status);
  }

  /**
   * Get transactions by L-Key
   */
  public getTransactionsByLKey(lKey: string): ProcessedTransaction[] {
    return this.getAllTransactions().filter(
      t => t.auditTrail.includes(lKey) || t.flowSequence.includes(lKey)
    );
  }

  /**
   * Generate comprehensive report
   */
  public generateReport(): {
    totalTransactions: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byLKey: Record<string, number>;
    totalVolume: number;
    totalFees: number;
    averageRiskScore: number;
  } {
    const transactions = this.getAllTransactions();

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byLKey: Record<string, number> = {};
    let totalVolume = 0;
    let totalFees = 0;
    let totalRiskScore = 0;

    for (const tx of transactions) {
      // Count by status
      byStatus[tx.status] = (byStatus[tx.status] || 0) + 1;

      // Count by type
      byType[tx.type] = (byType[tx.type] || 0) + 1;

      // Count by L-Keys
      for (const lKey of tx.auditTrail) {
        byLKey[lKey] = (byLKey[lKey] || 0) + 1;
      }

      // Accumulate totals
      totalVolume += tx.amount;
      totalFees += tx.fees.totalFee;
      totalRiskScore += tx.riskScore;
    }

    const averageRiskScore = transactions.length > 0 ? totalRiskScore / transactions.length : 0;

    return {
      totalTransactions: transactions.length,
      byStatus,
      byType,
      byLKey,
      totalVolume,
      totalFees,
      averageRiskScore,
    };
  }
}

export default EnhancedTransactionProcessor;
