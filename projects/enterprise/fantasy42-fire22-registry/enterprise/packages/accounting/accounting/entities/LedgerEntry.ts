/**
 * Ledger Entry Entity
 * Domain-Driven Design Implementation
 *
 * Core accounting entity representing financial transactions
 */

import { DomainEntity, DomainError } from '../../shared/domain-entity';
import { BaseDomainEvent } from '../../shared/events/domain-events';

export enum TransactionType {
  BET = 'BET',
  WIN = 'WIN',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  ADJUSTMENT = 'ADJUSTMENT',
  BONUS = 'BONUS',
  REFUND = 'REFUND',
  TRANSFER = 'TRANSFER',
}

export enum EntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export class LedgerEntry extends DomainEntity {
  private readonly _id: string;
  private readonly _accountId: string;
  private readonly _amount: number;
  private readonly _entryType: EntryType;
  private readonly _transactionType: TransactionType;
  private readonly _currency: string;
  private readonly _customerId?: string;
  private readonly _betId?: string;
  private readonly _description?: string;
  private readonly _reference?: string;
  private readonly _balanceBefore?: number;
  private readonly _balanceAfter?: number;
  private readonly _effectiveDate: Date;
  private readonly _createdAt: Date;
  private _postedAt?: Date;
  private _reversedAt?: Date;
  private _reversalEntryId?: string;

  constructor(params: LedgerEntryParams) {
    super(params.id, new Date(), new Date());
    this._id = params.id;
    this._accountId = params.accountId;
    this._amount = params.amount;
    this._entryType = params.entryType;
    this._transactionType = params.transactionType;
    this._currency = params.currency || 'USD';
    this._customerId = params.customerId;
    this._betId = params.betId;
    this._description = params.description;
    this._reference = params.reference;
    this._balanceBefore = params.balanceBefore;
    this._balanceAfter = params.balanceAfter;
    this._effectiveDate = new Date(params.effectiveDate);
    this._createdAt = new Date(params.createdAt);
    this._postedAt = params.postedAt ? new Date(params.postedAt) : undefined;
    this._reversedAt = params.reversedAt ? new Date(params.reversedAt) : undefined;
    this._reversalEntryId = params.reversalEntryId;
  }

  // Getters
  getId(): string {
    return this._id;
  }
  getAccountId(): string {
    return this._accountId;
  }
  getAmount(): number {
    return this._amount;
  }
  getEntryType(): EntryType {
    return this._entryType;
  }
  getTransactionType(): TransactionType {
    return this._transactionType;
  }
  getCurrency(): string {
    return this._currency;
  }
  getCustomerId(): string | undefined {
    return this._customerId;
  }
  getBetId(): string | undefined {
    return this._betId;
  }
  getDescription(): string | undefined {
    return this._description;
  }
  getReference(): string | undefined {
    return this._reference;
  }
  getBalanceBefore(): number | undefined {
    return this._balanceBefore;
  }
  getBalanceAfter(): number | undefined {
    return this._balanceAfter;
  }
  getEffectiveDate(): Date {
    return new Date(this._effectiveDate);
  }
  getCreatedAt(): Date {
    return new Date(this._createdAt);
  }
  getPostedAt(): Date | undefined {
    return this._postedAt ? new Date(this._postedAt) : undefined;
  }
  getReversedAt(): Date | undefined {
    return this._reversedAt ? new Date(this._reversedAt) : undefined;
  }
  getReversalEntryId(): string | undefined {
    return this._reversalEntryId;
  }

  // Business Logic Methods
  isDebit(): boolean {
    return this._entryType === EntryType.DEBIT;
  }

  isCredit(): boolean {
    return this._entryType === EntryType.CREDIT;
  }

  isPosted(): boolean {
    return !!this._postedAt;
  }

  isReversed(): boolean {
    return !!this._reversedAt;
  }

  canBeReversed(): boolean {
    return this.isPosted() && !this.isReversed();
  }

  canBePosted(): boolean {
    return !this.isPosted() && !this.isReversed();
  }

  /**
   * Get the signed amount (negative for debits, positive for credits)
   */
  getSignedAmount(): number {
    return this.isDebit() ? -Math.abs(this._amount) : Math.abs(this._amount);
  }

  /**
   * Get the unsigned amount
   */
  getUnsignedAmount(): number {
    return Math.abs(this._amount);
  }

  /**
   * Post the entry (make it effective)
   */
  post(): void {
    if (!this.canBePosted()) {
      throw new DomainError(`Cannot post ledger entry ${this._id}`, 'ENTRY_CANNOT_POST', {
        entryId: this._id,
        isPosted: this.isPosted(),
        isReversed: this.isReversed(),
      });
    }

    this._postedAt = new Date();

    this.addDomainEvent(
      new BaseDomainEvent('LedgerEntryPosted', this._id, 'LedgerEntry', {
        entryId: this._id,
        accountId: this._accountId,
        amount: this._amount,
        entryType: this._entryType,
        transactionType: this._transactionType,
        postedAt: this._postedAt,
      })
    );
  }

  /**
   * Reverse the entry
   */
  reverse(reason?: string): void {
    if (!this.canBeReversed()) {
      throw new DomainError(`Cannot reverse ledger entry ${this._id}`, 'ENTRY_CANNOT_REVERSE', {
        entryId: this._id,
        isPosted: this.isPosted(),
        isReversed: this.isReversed(),
      });
    }

    this._reversedAt = new Date();

    this.addDomainEvent(
      new BaseDomainEvent('LedgerEntryReversed', this._id, 'LedgerEntry', {
        entryId: this._id,
        accountId: this._accountId,
        amount: this._amount,
        reason,
        reversedAt: this._reversedAt,
      })
    );
  }

  /**
   * Check if entry affects customer balance
   */
  affectsCustomerBalance(): boolean {
    return !!this._customerId;
  }

  /**
   * Check if entry is related to a bet
   */
  isBetRelated(): boolean {
    return !!this._betId;
  }

  /**
   * Get balance change for this entry
   */
  getBalanceChange(): number {
    if (!this.affectsCustomerBalance()) {
      return 0;
    }

    return this.getSignedAmount();
  }

  // Factory methods
  static createDebit(params: DebitEntryParams): LedgerEntry {
    const id = crypto.randomUUID();
    const now = new Date();

    return new LedgerEntry({
      id,
      accountId: params.accountId,
      amount: Math.abs(params.amount), // Always store as positive
      entryType: EntryType.DEBIT,
      transactionType: params.transactionType,
      currency: params.currency,
      customerId: params.customerId,
      betId: params.betId,
      description: params.description,
      reference: params.reference,
      balanceBefore: params.balanceBefore,
      balanceAfter: params.balanceAfter,
      effectiveDate: params.effectiveDate || now,
      createdAt: now,
    });
  }

  static createCredit(params: CreditEntryParams): LedgerEntry {
    const id = crypto.randomUUID();
    const now = new Date();

    return new LedgerEntry({
      id,
      accountId: params.accountId,
      amount: Math.abs(params.amount), // Always store as positive
      entryType: EntryType.CREDIT,
      transactionType: params.transactionType,
      currency: params.currency,
      customerId: params.customerId,
      betId: params.betId,
      description: params.description,
      reference: params.reference,
      balanceBefore: params.balanceBefore,
      balanceAfter: params.balanceAfter,
      effectiveDate: params.effectiveDate || now,
      createdAt: now,
    });
  }

  /**
   * Create a reversal entry for this entry
   */
  createReversal(reason?: string): LedgerEntry {
    const now = new Date();
    const reversedEntryType =
      this._entryType === EntryType.DEBIT ? EntryType.CREDIT : EntryType.DEBIT;

    const reversalEntry = new LedgerEntry({
      id: crypto.randomUUID(),
      accountId: this._accountId,
      amount: this._amount,
      entryType: reversedEntryType,
      transactionType: this._transactionType,
      currency: this._currency,
      customerId: this._customerId,
      betId: this._betId,
      description: `Reversal: ${this._description || 'Original entry'}`,
      reference: `REV-${this._id}`,
      balanceBefore: this._balanceAfter,
      balanceAfter: this._balanceBefore,
      effectiveDate: now,
      createdAt: now,
    });

    // Link the reversal
    reversalEntry._reversalEntryId = this._id;
    this._reversalEntryId = reversalEntry._id;

    // Reverse this entry
    this.reverse(reason);

    return reversalEntry;
  }

  toJSON() {
    return {
      id: this._id,
      accountId: this._accountId,
      amount: this._amount,
      signedAmount: this.getSignedAmount(),
      entryType: this._entryType,
      transactionType: this._transactionType,
      currency: this._currency,
      customerId: this._customerId,
      betId: this._betId,
      description: this._description,
      reference: this._reference,
      balanceBefore: this._balanceBefore,
      balanceAfter: this._balanceAfter,
      effectiveDate: this._effectiveDate.toISOString(),
      createdAt: this._createdAt.toISOString(),
      postedAt: this._postedAt?.toISOString(),
      reversedAt: this._reversedAt?.toISOString(),
      reversalEntryId: this._reversalEntryId,
      affectsCustomerBalance: this.affectsCustomerBalance(),
      isBetRelated: this.isBetRelated(),
    };
  }
}

// Supporting interfaces
export interface LedgerEntryParams {
  id: string;
  accountId: string;
  amount: number;
  entryType: EntryType;
  transactionType: TransactionType;
  currency?: string;
  customerId?: string;
  betId?: string;
  description?: string;
  reference?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  effectiveDate: Date;
  createdAt: Date;
  postedAt?: Date;
  reversedAt?: Date;
  reversalEntryId?: string;
}

export interface DebitEntryParams {
  accountId: string;
  amount: number;
  transactionType: TransactionType;
  currency?: string;
  customerId?: string;
  betId?: string;
  description?: string;
  reference?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  effectiveDate?: Date;
}

export interface CreditEntryParams {
  accountId: string;
  amount: number;
  transactionType: TransactionType;
  currency?: string;
  customerId?: string;
  betId?: string;
  description?: string;
  reference?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  effectiveDate?: Date;
}

// Custom domain errors
export class InsufficientFundsError extends DomainError {
  constructor(accountId: string, required: number, available: number) {
    super(`Insufficient funds in account ${accountId}`, 'INSUFFICIENT_FUNDS', {
      accountId,
      requiredAmount: required,
      availableAmount: available,
    });
  }
}

export class EntryAlreadyPostedError extends DomainError {
  constructor(entryId: string) {
    super(`Entry ${entryId} is already posted`, 'ENTRY_ALREADY_POSTED', {
      entryId,
    });
  }
}

export class EntryAlreadyReversedError extends DomainError {
  constructor(entryId: string) {
    super(`Entry ${entryId} is already reversed`, 'ENTRY_ALREADY_REVERSED', {
      entryId,
    });
  }
}
