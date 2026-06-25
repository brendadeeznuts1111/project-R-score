/**
 * Financial Transaction Entity
 * Domain-Driven Design Implementation
 *
 * Represents a financial transaction with accounting classification and audit trail
 */

import { DomainEntity } from '../../shared/domain-entity';
import { DomainError } from '../../shared/domain-entity';
import { AccountingPeriod } from '../value-objects/accounting-period';
import { Money } from '../../collections/entities/payment';

export enum TransactionType {
  REVENUE = 'revenue',
  EXPENSE = 'expense',
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  ADJUSTMENT = 'adjustment',
}

export enum TransactionCategory {
  // Revenue
  PAYMENT_PROCESSING = 'payment_processing',
  SUBSCRIPTION_FEES = 'subscription_fees',
  SERVICE_FEES = 'service_fees',
  INTEREST_INCOME = 'interest_income',
  OTHER_INCOME = 'other_income',

  // Expenses
  OPERATING_COSTS = 'operating_costs',
  MARKETING = 'marketing',
  COMPLIANCE = 'compliance',
  TECHNOLOGY = 'technology',
  STAFFING = 'staffing',
  LEGAL_FEES = 'legal_fees',

  // Assets/Liabilities
  CASH_RESERVES = 'cash_reserves',
  ACCOUNTS_RECEIVABLE = 'accounts_receivable',
  ACCOUNTS_PAYABLE = 'accounts_payable',
  LOANS_PAYABLE = 'loans_payable',
  INVESTMENTS = 'investments',
}

export enum TransactionStatus {
  PENDING = 'pending',
  POSTED = 'posted',
  VOIDED = 'voided',
  ADJUSTED = 'adjusted',
}

export class FinancialTransaction extends DomainEntity {
  private readonly _transactionId: string;
  private readonly _type: TransactionType;
  private readonly _category: TransactionCategory;
  private readonly _amount: Money;
  private readonly _accountingPeriod: AccountingPeriod;
  private readonly _description: string;
  private readonly _sourceSystem: string;
  private readonly _sourceTransactionId: string;
  private _status: TransactionStatus;
  private readonly _postedBy: string;
  private _postedAt: Date;
  private _voidedBy?: string;
  private _voidedAt?: Date;
  private _voidReason?: string;
  private readonly _metadata: Record<string, any>;
  private readonly _auditTrail: TransactionAuditEntry[];

  constructor(params: FinancialTransactionParams) {
    super(params.id, new Date(), new Date());
    this.validateTransaction(params);

    this._transactionId = params.transactionId;
    this._type = params.type;
    this._category = params.category;
    this._amount = params.amount;
    this._accountingPeriod = params.accountingPeriod;
    this._description = params.description;
    this._sourceSystem = params.sourceSystem;
    this._sourceTransactionId = params.sourceTransactionId;
    this._status = params.status || TransactionStatus.POSTED;
    this._postedBy = params.postedBy;
    this._postedAt = new Date(params.postedAt);
    this._voidedBy = params.voidedBy;
    this._voidedAt = params.voidedAt ? new Date(params.voidedAt) : undefined;
    this._voidReason = params.voidReason;
    this._metadata = { ...params.metadata };
    this._auditTrail = [...(params.auditTrail || [])];
  }

  static create(params: {
    transactionId: string;
    type: TransactionType;
    category: TransactionCategory;
    amount: Money;
    accountingPeriod: AccountingPeriod;
    description: string;
    sourceSystem: string;
    sourceTransactionId: string;
    postedBy: string;
    postedAt?: Date;
    metadata?: Record<string, any>;
  }): FinancialTransaction {
    const now = new Date();
    const auditEntry: TransactionAuditEntry = {
      timestamp: now,
      action: 'CREATED',
      performedBy: params.postedBy,
      details: 'Transaction created and posted',
    };

    return new FinancialTransaction({
      id: crypto.randomUUID(),
      transactionId: params.transactionId,
      type: params.type,
      category: params.category,
      amount: params.amount,
      accountingPeriod: params.accountingPeriod,
      description: params.description,
      sourceSystem: params.sourceSystem,
      sourceTransactionId: params.sourceTransactionId,
      status: TransactionStatus.POSTED,
      postedBy: params.postedBy,
      postedAt: params.postedAt || now,
      metadata: params.metadata || {},
      auditTrail: [auditEntry],
    });
  }

  // Getters
  getTransactionId(): string {
    return this._transactionId;
  }
  getType(): TransactionType {
    return this._type;
  }
  getCategory(): TransactionCategory {
    return this._category;
  }
  getAmount(): Money {
    return this._amount;
  }
  getAccountingPeriod(): AccountingPeriod {
    return this._accountingPeriod;
  }
  getDescription(): string {
    return this._description;
  }
  getSourceSystem(): string {
    return this._sourceSystem;
  }
  getSourceTransactionId(): string {
    return this._sourceTransactionId;
  }
  getStatus(): TransactionStatus {
    return this._status;
  }
  getPostedBy(): string {
    return this._postedBy;
  }
  getPostedAt(): Date {
    return new Date(this._postedAt);
  }
  getVoidedBy(): string | undefined {
    return this._voidedBy;
  }
  getVoidedAt(): Date | undefined {
    return this._voidedAt ? new Date(this._voidedAt) : undefined;
  }
  getVoidReason(): string | undefined {
    return this._voidReason;
  }
  getMetadata(): Record<string, any> {
    return { ...this._metadata };
  }
  getAuditTrail(): TransactionAuditEntry[] {
    return [...this._auditTrail];
  }

  // Business Logic Methods
  canBeVoided(): boolean {
    return this._status === TransactionStatus.POSTED && !this._accountingPeriod.getIsClosed();
  }

  canBeAdjusted(): boolean {
    return this._status === TransactionStatus.POSTED && !this._accountingPeriod.getIsClosed();
  }

  void(voidedBy: string, reason: string): void {
    if (!this.canBeVoided()) {
      throw new DomainError(
        `Transaction cannot be voided. Status: ${this._status}, Period closed: ${this._accountingPeriod.getIsClosed()}`,
        'INVALID_TRANSACTION_STATUS'
      );
    }

    this._status = TransactionStatus.VOIDED;
    this._voidedBy = voidedBy;
    this._voidedAt = new Date();
    this._voidReason = reason;

    this.addAuditEntry({
      timestamp: this._voidedAt,
      action: 'VOIDED',
      performedBy: voidedBy,
      details: `Transaction voided: ${reason}`,
    });

    this.markAsModified();
  }

  adjust(newAmount: Money, adjustedBy: string, reason: string): FinancialTransaction {
    if (!this.canBeAdjusted()) {
      throw new DomainError(
        `Transaction cannot be adjusted. Status: ${this._status}, Period closed: ${this._accountingPeriod.getIsClosed()}`,
        'INVALID_TRANSACTION_STATUS'
      );
    }

    // Create adjustment transaction
    const adjustmentAmount = new Money(
      newAmount.getAmount() - this._amount.getAmount(),
      newAmount.getCurrency()
    );

    const adjustment = FinancialTransaction.create({
      transactionId: `${this._transactionId}_ADJ_${Date.now()}`,
      type: this._type,
      category: this._category,
      amount: adjustmentAmount,
      accountingPeriod: this._accountingPeriod,
      description: `Adjustment to ${this._transactionId}: ${reason}`,
      sourceSystem: this._sourceSystem,
      sourceTransactionId: this._sourceTransactionId,
      postedBy: adjustedBy,
      metadata: {
        ...this._metadata,
        originalTransactionId: this._transactionId,
        adjustmentReason: reason,
      },
    });

    // Mark original as adjusted
    this._status = TransactionStatus.ADJUSTED;
    this.addAuditEntry({
      timestamp: new Date(),
      action: 'ADJUSTED',
      performedBy: adjustedBy,
      details: `Transaction adjusted: ${reason}. New amount: ${newAmount.toString()}`,
    });

    this.markAsModified();

    return adjustment;
  }

  // Utility Methods
  getNetAmount(): number {
    if (this._status === TransactionStatus.VOIDED) return 0;
    return this._amount.getAmount();
  }

  isRevenue(): boolean {
    return this._type === TransactionType.REVENUE || this._type === TransactionType.INTEREST_INCOME;
  }

  isExpense(): boolean {
    return this._type === TransactionType.EXPENSE;
  }

  isBalanceSheet(): boolean {
    return [TransactionType.ASSET, TransactionType.LIABILITY, TransactionType.EQUITY].includes(
      this._type
    );
  }

  toJSON(): any {
    return {
      id: this.getId(),
      transactionId: this._transactionId,
      type: this._type,
      category: this._category,
      amount: this._amount.toJSON(),
      accountingPeriod: this._accountingPeriod.toJSON(),
      description: this._description,
      sourceSystem: this._sourceSystem,
      sourceTransactionId: this._sourceTransactionId,
      status: this._status,
      postedBy: this._postedBy,
      postedAt: this._postedAt.toISOString(),
      voidedBy: this._voidedBy,
      voidedAt: this._voidedAt?.toISOString(),
      voidReason: this._voidReason,
      metadata: this._metadata,
      auditTrail: this._auditTrail,
      createdAt: this.getCreatedAt().toISOString(),
      updatedAt: this.getUpdatedAt().toISOString(),
    };
  }

  private validateTransaction(params: FinancialTransactionParams): void {
    if (!params.transactionId || typeof params.transactionId !== 'string') {
      throw new DomainError('Transaction ID is required', 'INVALID_TRANSACTION_ID');
    }

    if (!Object.values(TransactionType).includes(params.type)) {
      throw new DomainError('Valid transaction type is required', 'INVALID_TRANSACTION_TYPE');
    }

    if (!Object.values(TransactionCategory).includes(params.category)) {
      throw new DomainError(
        'Valid transaction category is required',
        'INVALID_TRANSACTION_CATEGORY'
      );
    }

    if (!params.amount || !(params.amount instanceof Money)) {
      throw new DomainError('Valid amount is required', 'INVALID_AMOUNT');
    }

    if (!params.accountingPeriod || !(params.accountingPeriod instanceof AccountingPeriod)) {
      throw new DomainError('Valid accounting period is required', 'INVALID_ACCOUNTING_PERIOD');
    }

    if (!params.description || params.description.trim().length === 0) {
      throw new DomainError('Description is required', 'INVALID_DESCRIPTION');
    }

    if (!params.sourceSystem || typeof params.sourceSystem !== 'string') {
      throw new DomainError('Source system is required', 'INVALID_SOURCE_SYSTEM');
    }
  }

  private addAuditEntry(entry: TransactionAuditEntry): void {
    this._auditTrail.push(entry);
  }
}

export interface FinancialTransactionParams {
  id: string;
  transactionId: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: Money;
  accountingPeriod: AccountingPeriod;
  description: string;
  sourceSystem: string;
  sourceTransactionId: string;
  status?: TransactionStatus;
  postedBy: string;
  postedAt: Date;
  voidedBy?: string;
  voidedAt?: Date;
  voidReason?: string;
  metadata?: Record<string, any>;
  auditTrail?: TransactionAuditEntry[];
}

export interface TransactionAuditEntry {
  timestamp: Date;
  action: 'CREATED' | 'POSTED' | 'VOIDED' | 'ADJUSTED' | 'REVIEWED';
  performedBy: string;
  details: string;
  metadata?: Record<string, any>;
}
