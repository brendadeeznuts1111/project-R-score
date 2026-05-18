/**
 * Ledger Repository Interface
 * Domain-Driven Design Implementation
 *
 * Repository pattern for LedgerEntry entity persistence
 */

import { LedgerEntry, TransactionType, EntryType } from '../entities/LedgerEntry';

export interface LedgerQuery {
  accountId?: string;
  customerId?: string;
  betId?: string;
  transactionType?: TransactionType;
  entryType?: EntryType;
  fromDate?: Date;
  toDate?: Date;
  currency?: string;
  minAmount?: number;
  maxAmount?: number;
  isPosted?: boolean;
  isReversed?: boolean;
  limit?: number;
  offset?: number;
}

export interface LedgerSummary {
  totalEntries: number;
  totalDebitAmount: number;
  totalCreditAmount: number;
  netAmount: number;
  entriesByType: Record<TransactionType, number>;
  balance: number;
}

export interface CustomerBalance {
  customerId: string;
  balance: number;
  availableBalance: number;
  heldBalance: number;
  lastTransactionDate?: Date;
  currency: string;
}

export abstract class LedgerRepository {
  /**
   * Save a ledger entry
   */
  abstract save(entry: LedgerEntry): Promise<LedgerEntry>;

  /**
   * Find entry by ID
   */
  abstract findById(id: string): Promise<LedgerEntry | null>;

  /**
   * Find entries by query
   */
  abstract findByQuery(query: LedgerQuery): Promise<LedgerEntry[]>;

  /**
   * Find entries by account
   */
  abstract findByAccountId(
    accountId: string,
    limit?: number,
    offset?: number
  ): Promise<LedgerEntry[]>;

  /**
   * Find entries by customer
   */
  abstract findByCustomerId(
    customerId: string,
    fromDate?: Date,
    toDate?: Date,
    limit?: number,
    offset?: number
  ): Promise<LedgerEntry[]>;

  /**
   * Find entries by bet
   */
  abstract findByBetId(betId: string): Promise<LedgerEntry[]>;

  /**
   * Get customer balance
   */
  abstract getCustomerBalance(customerId: string): Promise<number>;

  /**
   * Get detailed customer balance information
   */
  abstract getCustomerBalanceDetails(customerId: string): Promise<CustomerBalance>;

  /**
   * Get account balance
   */
  abstract getAccountBalance(accountId: string): Promise<number>;

  /**
   * Get ledger summary
   */
  abstract getSummary(query?: LedgerQuery): Promise<LedgerSummary>;

  /**
   * Check if entry exists
   */
  abstract exists(id: string): Promise<boolean>;

  /**
   * Get customer's transaction history
   */
  abstract getCustomerTransactionHistory(
    customerId: string,
    limit?: number,
    offset?: number
  ): Promise<LedgerEntry[]>;

  /**
   * Get daily transaction totals
   */
  abstract getDailyTotals(
    date: Date,
    customerId?: string
  ): Promise<{
    date: string;
    totalDebits: number;
    totalCredits: number;
    netAmount: number;
    transactionCount: number;
  }>;

  /**
   * Get monthly transaction summary
   */
  abstract getMonthlySummary(
    year: number,
    month: number,
    customerId?: string
  ): Promise<{
    year: number;
    month: number;
    totalDebits: number;
    totalCredits: number;
    netAmount: number;
    transactionCount: number;
    transactionsByType: Record<TransactionType, number>;
  }>;
}
