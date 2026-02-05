/**
 * Settlement Domain Entity - Domain-Driven Design
 * Payment settlement and reconciliation entity
 */

import {
  DomainError,
  ValidationError,
  BusinessRuleViolationError,
  DomainErrorFactory,
} from '../../../core/errors/domain-errors';
import { DomainLogger, LoggerFactory } from '../../../core/logging/domain-logger';

export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum SettlementType {
  AUTOMATED = 'automated',
  MANUAL = 'manual',
  ADJUSTMENT = 'adjustment',
  REFUND = 'refund',
}

export interface SettlementFees {
  processingFee: number;
  networkFee: number;
  interchangeFee: number;
  totalFees: number;
}

export interface SettlementBreakdown {
  principalAmount: number;
  fees: SettlementFees;
  netAmount: number;
  currency: string;
}

export interface SettlementMetadata {
  batchId?: string;
  settlementReference: string;
  bankReference?: string;
  processingNotes?: string[];
  reconciliationData?: Record<string, any>;
  complianceFlags?: string[];
}

/**
 * Settlement Domain Entity
 * Represents a payment settlement in the financial domain
 */
export class Settlement {
  public readonly id: string;
  public readonly paymentId: string;
  public readonly merchantId: string;
  public readonly amount: number;
  public readonly currency: string;
  public status: SettlementStatus;
  public readonly settlementType: SettlementType;
  public readonly settlementDate: Date;
  public readonly processingDate: Date;
  public readonly fees: SettlementFees;
  public readonly breakdown: SettlementBreakdown;
  public readonly metadata: SettlementMetadata;
  public readonly createdAt: Date;
  public updatedAt: Date;
  public completedAt?: Date;
  public failedAt?: Date;

  private readonly logger = LoggerFactory.create('settlement-entity');
  private readonly errorFactory = new DomainErrorFactory('settlement');

  constructor(
    id: string,
    paymentId: string,
    merchantId: string,
    amount: number,
    currency: string,
    settlementType: SettlementType,
    settlementDate: Date,
    fees: SettlementFees,
    metadata: SettlementMetadata
  ) {
    this.validateConstruction(paymentId, merchantId, amount, currency, settlementDate);

    this.id = id;
    this.paymentId = paymentId;
    this.merchantId = merchantId;
    this.amount = amount;
    this.currency = currency;
    this.status = SettlementStatus.PENDING;
    this.settlementType = settlementType;
    this.settlementDate = settlementDate;
    this.processingDate = new Date();
    this.fees = fees;
    this.breakdown = this.calculateBreakdown(amount, currency, fees);
    this.metadata = metadata;
    this.createdAt = new Date();
    this.updatedAt = new Date();

    this.logger.business('Settlement entity created', {
      entity: 'Settlement',
      entityId: id,
      paymentId,
      amount,
      currency,
    });
  }

  /**
   * Mark settlement as processing
   */
  public markAsProcessing(): void {
    this.ensureCanTransitionTo(SettlementStatus.PROCESSING);

    this.status = SettlementStatus.PROCESSING;
    this.updatedAt = new Date();

    this.logger.business('Settlement marked as processing', {
      entity: 'Settlement',
      entityId: this.id,
      paymentId: this.paymentId,
    });
  }

  /**
   * Complete the settlement
   */
  public complete(bankReference?: string): void {
    this.ensureCanTransitionTo(SettlementStatus.COMPLETED);

    this.status = SettlementStatus.COMPLETED;
    this.completedAt = new Date();
    this.updatedAt = new Date();

    if (bankReference) {
      this.metadata.bankReference = bankReference;
    }

    this.logger.business('Settlement completed', {
      entity: 'Settlement',
      entityId: this.id,
      paymentId: this.paymentId,
      bankReference,
    });
  }

  /**
   * Fail the settlement
   */
  public fail(reason: string): void {
    this.ensureCanTransitionTo(SettlementStatus.FAILED);

    this.status = SettlementStatus.FAILED;
    this.failedAt = new Date();
    this.updatedAt = new Date();

    if (!this.metadata.processingNotes) {
      this.metadata.processingNotes = [];
    }
    this.metadata.processingNotes.push(`Failed: ${reason}`);

    this.logger.business('Settlement failed', {
      entity: 'Settlement',
      entityId: this.id,
      paymentId: this.paymentId,
      reason,
    });
  }

  /**
   * Cancel the settlement
   */
  public cancel(reason: string): void {
    this.ensureCanTransitionTo(SettlementStatus.CANCELLED);

    this.status = SettlementStatus.CANCELLED;
    this.updatedAt = new Date();

    if (!this.metadata.processingNotes) {
      this.metadata.processingNotes = [];
    }
    this.metadata.processingNotes.push(`Cancelled: ${reason}`);

    this.logger.business('Settlement cancelled', {
      entity: 'Settlement',
      entityId: this.id,
      paymentId: this.paymentId,
      reason,
    });
  }

  /**
   * Add compliance flag
   */
  public addComplianceFlag(flag: string): void {
    if (!this.metadata.complianceFlags) {
      this.metadata.complianceFlags = [];
    }

    if (!this.metadata.complianceFlags.includes(flag)) {
      this.metadata.complianceFlags.push(flag);
      this.logger.business('Compliance flag added', {
        entity: 'Settlement',
        entityId: this.id,
        flag,
      });
    }
  }

  /**
   * Check if settlement is in a final state
   */
  public isFinal(): boolean {
    return [
      SettlementStatus.COMPLETED,
      SettlementStatus.FAILED,
      SettlementStatus.CANCELLED,
    ].includes(this.status);
  }

  /**
   * Get settlement age in days
   */
  public getAgeInDays(): number {
    const now = new Date();
    const created = this.createdAt;
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get settlement summary
   */
  public getSummary(): SettlementSummary {
    return {
      id: this.id,
      paymentId: this.paymentId,
      merchantId: this.merchantId,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      settlementType: this.settlementType,
      settlementDate: this.settlementDate,
      netAmount: this.breakdown.netAmount,
      ageInDays: this.getAgeInDays(),
      hasComplianceFlags: (this.metadata.complianceFlags?.length ?? 0) > 0,
    };
  }

  // Private methods

  private validateConstruction(
    paymentId: string,
    merchantId: string,
    amount: number,
    currency: string,
    settlementDate: Date
  ): void {
    if (!paymentId || typeof paymentId !== 'string') {
      throw this.errorFactory.validationError('Payment ID is required', 'paymentId', paymentId);
    }

    if (!merchantId || typeof merchantId !== 'string') {
      throw this.errorFactory.validationError('Merchant ID is required', 'merchantId', merchantId);
    }

    if (!amount || amount <= 0) {
      throw this.errorFactory.validationError('Amount must be positive', 'amount', amount);
    }

    if (!currency || !['USD', 'EUR', 'GBP', 'CAD'].includes(currency)) {
      throw this.errorFactory.validationError('Invalid currency', 'currency', currency);
    }

    if (!settlementDate || settlementDate < new Date()) {
      throw this.errorFactory.validationError(
        'Settlement date must be in the future',
        'settlementDate',
        settlementDate
      );
    }
  }

  private ensureCanTransitionTo(newStatus: SettlementStatus): void {
    const validTransitions: Record<SettlementStatus, SettlementStatus[]> = {
      [SettlementStatus.PENDING]: [SettlementStatus.PROCESSING, SettlementStatus.CANCELLED],
      [SettlementStatus.PROCESSING]: [
        SettlementStatus.COMPLETED,
        SettlementStatus.FAILED,
        SettlementStatus.CANCELLED,
      ],
      [SettlementStatus.COMPLETED]: [],
      [SettlementStatus.FAILED]: [SettlementStatus.PROCESSING], // Allow retry
      [SettlementStatus.CANCELLED]: [],
    };

    if (!validTransitions[this.status]?.includes(newStatus)) {
      throw this.errorFactory.businessRuleViolation(
        `Cannot transition from ${this.status} to ${newStatus}`,
        'invalid_status_transition'
      );
    }
  }

  private calculateBreakdown(
    amount: number,
    currency: string,
    fees: SettlementFees
  ): SettlementBreakdown {
    const netAmount = amount - fees.totalFees;

    return {
      principalAmount: amount,
      fees,
      netAmount,
      currency,
    };
  }
}

/**
 * Settlement Summary for reporting and monitoring
 */
export interface SettlementSummary {
  id: string;
  paymentId: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: SettlementStatus;
  settlementType: SettlementType;
  settlementDate: Date;
  netAmount: number;
  ageInDays: number;
  hasComplianceFlags: boolean;
}

/**
 * Factory for creating Settlement entities
 */
export class SettlementFactory {
  static createAutomatedSettlement(
    paymentId: string,
    merchantId: string,
    amount: number,
    currency: string,
    settlementDate: Date,
    fees: SettlementFees,
    batchId?: string
  ): Settlement {
    const id = `stl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata: SettlementMetadata = {
      batchId,
      settlementReference: `AUTO_${Date.now()}`,
      processingNotes: ['Created via automated settlement process'],
    };

    return new Settlement(
      id,
      paymentId,
      merchantId,
      amount,
      currency,
      SettlementType.AUTOMATED,
      settlementDate,
      fees,
      metadata
    );
  }

  static createManualSettlement(
    paymentId: string,
    merchantId: string,
    amount: number,
    currency: string,
    settlementDate: Date,
    fees: SettlementFees,
    notes?: string[]
  ): Settlement {
    const id = `stl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata: SettlementMetadata = {
      settlementReference: `MANUAL_${Date.now()}`,
      processingNotes: notes || ['Created via manual settlement process'],
    };

    return new Settlement(
      id,
      paymentId,
      merchantId,
      amount,
      currency,
      SettlementType.MANUAL,
      settlementDate,
      fees,
      metadata
    );
  }
}
