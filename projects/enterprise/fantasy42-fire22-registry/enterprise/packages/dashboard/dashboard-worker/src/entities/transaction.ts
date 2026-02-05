/**
 * 💰 Fire22 Dashboard - Transaction Entity Classes
 * Transaction domain entity implementations with business logic
 */

import { AuditableEntityClass, ValidationRule } from './base';
import type { Transaction } from '../types/database/entities';
import { DATABASE, BUSINESS } from '../constants';

export class TransactionEntity extends AuditableEntityClass implements Transaction {
  // Basic information
  public customer_id: string;
  public agent_id: string;
  public amount: number;
  public tran_type:
    | 'deposit'
    | 'withdrawal'
    | 'bet'
    | 'win'
    | 'adjustment'
    | 'bonus'
    | 'commission'
    | 'fee';
  public tran_code: string;
  public document_number?: string;
  public reference?: string;

  // Description and details
  public short_desc: string;
  public long_desc?: string;

  // Processing information
  public status: 'pending' | 'completed' | 'failed' | 'cancelled';
  public processed_at?: string;
  public processor?: string;
  public external_reference?: string;

  // Balance tracking
  public balance_before: number;
  public balance_after: number;
  public freeplay_balance: number;
  public freeplay_pending_balance: number;
  public freeplay_pending_count: number;

  // Audit information
  public entered_by: string;
  public approved_by?: string;
  public grade_num?: number;
  public tran_datetime: string;

  // Related entities
  public wager_id?: string;
  public parent_transaction_id?: string;

  // Metadata
  public metadata?: Record<string, any>;
  public fees?: {
    processing_fee: number;
    service_fee: number;
    third_party_fee: number;
  };

  constructor(data: Partial<Transaction>) {
    super(data);

    // Basic information
    this.customer_id = data.customer_id || '';
    this.agent_id = data.agent_id || '';
    this.amount = data.amount || 0;
    this.tran_type = data.tran_type || 'deposit';
    this.tran_code = data.tran_code || this.generateTransactionCode();
    this.document_number = data.document_number;
    this.reference = data.reference;

    // Description
    this.short_desc = data.short_desc || '';
    this.long_desc = data.long_desc;

    // Processing
    this.status = data.status || 'pending';
    this.processed_at = data.processed_at;
    this.processor = data.processor;
    this.external_reference = data.external_reference;

    // Balance tracking
    this.balance_before = data.balance_before || 0;
    this.balance_after = data.balance_after || 0;
    this.freeplay_balance = data.freeplay_balance || 0;
    this.freeplay_pending_balance = data.freeplay_pending_balance || 0;
    this.freeplay_pending_count = data.freeplay_pending_count || 0;

    // Audit information
    this.entered_by = data.entered_by || '';
    this.approved_by = data.approved_by;
    this.grade_num = data.grade_num;
    this.tran_datetime = data.tran_datetime || new Date().toISOString();

    // Related entities
    this.wager_id = data.wager_id;
    this.parent_transaction_id = data.parent_transaction_id;

    // Metadata
    this.metadata = data.metadata || {};
    this.fees = data.fees || {
      processing_fee: 0,
      service_fee: 0,
      third_party_fee: 0,
    };
  }

  protected getEntityName(): string {
    return 'transaction';
  }

  protected getValidationRules(): ValidationRule[] {
    return [
      {
        field: 'customer_id',
        required: true,
        type: 'string',
        minLength: 1,
      },
      {
        field: 'agent_id',
        required: true,
        type: 'string',
        minLength: 1,
      },
      {
        field: 'amount',
        required: true,
        type: 'number',
        custom: (value: number) => {
          if (value === 0) return 'Transaction amount cannot be zero';
          if (Math.abs(value) > BUSINESS.TRANSACTION_LIMITS.MAX_AMOUNT) {
            return `Amount exceeds maximum limit of ${BUSINESS.TRANSACTION_LIMITS.MAX_AMOUNT}`;
          }
          return true;
        },
      },
      {
        field: 'tran_code',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50,
      },
      {
        field: 'short_desc',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 255,
      },
      {
        field: 'entered_by',
        required: true,
        type: 'string',
        minLength: 1,
      },
      {
        field: 'tran_datetime',
        required: true,
        type: 'string',
        custom: (value: string) => {
          const date = new Date(value);
          return !isNaN(date.getTime()) || 'Invalid transaction datetime';
        },
      },
    ];
  }

  /**
   * Generate unique transaction code
   */
  private generateTransactionCode(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `TXN_${timestamp}_${random}`;
  }

  /**
   * Check if transaction is debit (reduces balance)
   */
  public isDebit(): boolean {
    return ['withdrawal', 'bet', 'fee', 'adjustment'].includes(this.tran_type) && this.amount < 0;
  }

  /**
   * Check if transaction is credit (increases balance)
   */
  public isCredit(): boolean {
    return ['deposit', 'win', 'bonus', 'adjustment'].includes(this.tran_type) && this.amount > 0;
  }

  /**
   * Get absolute amount
   */
  public getAbsoluteAmount(): number {
    return Math.abs(this.amount);
  }

  /**
   * Calculate net balance change
   */
  public getNetBalanceChange(): number {
    return this.balance_after - this.balance_before;
  }

  /**
   * Get total fees
   */
  public getTotalFees(): number {
    if (!this.fees) return 0;
    return this.fees.processing_fee + this.fees.service_fee + this.fees.third_party_fee;
  }

  /**
   * Get net amount (amount minus fees)
   */
  public getNetAmount(): number {
    return this.amount - this.getTotalFees();
  }

  /**
   * Check if transaction requires approval
   */
  public requiresApproval(): boolean {
    const absAmount = this.getAbsoluteAmount();

    // Large transactions require approval
    if (absAmount >= BUSINESS.TRANSACTION_LIMITS.APPROVAL_REQUIRED) {
      return true;
    }

    // Withdrawals over certain amount require approval
    if (
      this.tran_type === 'withdrawal' &&
      absAmount >= BUSINESS.TRANSACTION_LIMITS.WITHDRAWAL_APPROVAL
    ) {
      return true;
    }

    // Adjustments always require approval
    if (this.tran_type === 'adjustment') {
      return true;
    }

    return false;
  }

  /**
   * Process the transaction
   */
  public process(processor: string): this {
    if (this.status !== 'pending') {
      throw new Error('Only pending transactions can be processed');
    }

    this.status = 'completed';
    this.processed_at = new Date().toISOString();
    this.processor = processor;
    this.touch();

    return this;
  }

  /**
   * Approve the transaction
   */
  public approve(approvedBy: string): this {
    if (this.status !== 'pending') {
      throw new Error('Only pending transactions can be approved');
    }

    this.approved_by = approvedBy;
    this.touch();

    return this;
  }

  /**
   * Cancel the transaction
   */
  public cancel(reason?: string): this {
    if (this.status === 'completed') {
      throw new Error('Cannot cancel completed transaction');
    }

    this.status = 'cancelled';
    this.processed_at = new Date().toISOString();

    if (reason) {
      this.metadata = { ...this.metadata, cancellation_reason: reason };
    }

    this.touch();
    return this;
  }

  /**
   * Fail the transaction
   */
  public fail(errorMessage: string): this {
    if (this.status === 'completed') {
      throw new Error('Cannot fail completed transaction');
    }

    this.status = 'failed';
    this.processed_at = new Date().toISOString();
    this.metadata = { ...this.metadata, error_message: errorMessage };
    this.touch();

    return this;
  }

  /**
   * Add fee
   */
  public addFee(type: 'processing_fee' | 'service_fee' | 'third_party_fee', amount: number): this {
    if (!this.fees) {
      this.fees = { processing_fee: 0, service_fee: 0, third_party_fee: 0 };
    }

    this.fees[type] += amount;
    this.touch();

    return this;
  }

  /**
   * Set metadata value
   */
  public setMetadata(key: string, value: any): this {
    this.metadata = { ...this.metadata, [key]: value };
    this.touch();
    return this;
  }

  /**
   * Get metadata value
   */
  public getMetadata(key: string): any {
    return this.metadata?.[key];
  }

  /**
   * Check if transaction is related to wager
   */
  public isWagerRelated(): boolean {
    return !!this.wager_id || ['bet', 'win'].includes(this.tran_type);
  }

  /**
   * Check if transaction is financial (money movement)
   */
  public isFinancial(): boolean {
    return ['deposit', 'withdrawal', 'adjustment'].includes(this.tran_type);
  }

  /**
   * Get transaction summary
   */
  public getSummary(): {
    code: string;
    type: string;
    amount: number;
    status: string;
    customer: string;
    datetime: string;
    description: string;
  } {
    return {
      code: this.tran_code,
      type: this.tran_type,
      amount: this.amount,
      status: this.status,
      customer: this.customer_id,
      datetime: this.tran_datetime,
      description: this.short_desc,
    };
  }

  /**
   * Check if transaction is within time limit
   */
  public isWithinTimeLimit(hours: number): boolean {
    const transactionTime = new Date(this.tran_datetime);
    const now = new Date();
    const diffHours = (now.getTime() - transactionTime.getTime()) / (1000 * 60 * 60);

    return diffHours <= hours;
  }

  /**
   * Get processing time in milliseconds
   */
  public getProcessingTime(): number | null {
    if (!this.processed_at) return null;

    const created = new Date(this.created_at);
    const processed = new Date(this.processed_at);

    return processed.getTime() - created.getTime();
  }

  /**
   * Reverse the transaction (create opposite transaction)
   */
  public createReversal(reversedBy: string, reason: string): Partial<Transaction> {
    return {
      customer_id: this.customer_id,
      agent_id: this.agent_id,
      amount: -this.amount,
      tran_type: 'adjustment',
      short_desc: `REVERSAL: ${this.short_desc}`,
      long_desc: `Reversal of transaction ${this.tran_code}. Reason: ${reason}`,
      parent_transaction_id: this.id,
      entered_by: reversedBy,
      metadata: {
        reversal_of: this.id,
        reversal_reason: reason,
        original_transaction_code: this.tran_code,
      },
    };
  }
}

export { TransactionEntity as Transaction };
