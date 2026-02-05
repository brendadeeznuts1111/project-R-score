/**
 * Bun SQL Ledger Repository
 * Domain-Driven Design Implementation
 *
 * Concrete repository implementation using Bun.SQL for ledger entries
 */

import { SQL } from 'bun';
import {
  LedgerRepository,
  LedgerQuery,
  LedgerSummary,
  CustomerBalance,
} from '../../domains/accounting/repositories/LedgerRepository';
import {
  LedgerEntry,
  TransactionType,
  EntryType,
} from '../../domains/accounting/entities/LedgerEntry';

export class BunSQLLedgerRepository implements LedgerRepository {
  constructor(private db: SQL) {}

  async save(entry: LedgerEntry): Promise<LedgerEntry> {
    const data = entry.toJSON();

    // Check if entry exists
    const existing = await this.findById(entry.getId());

    if (existing) {
      // Update existing entry
      await this.db.run(
        `
        UPDATE ledger_entries
        SET posted_at = ?, reversed_at = ?, reversal_entry_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `,
        [data.postedAt, data.reversedAt, data.reversalEntryId, data.id]
      );
    } else {
      // Insert new entry
      await this.db.run(
        `
        INSERT INTO ledger_entries (
          id, account_id, amount, entry_type, transaction_type, currency,
          customer_id, bet_id, description, reference,
          balance_before, balance_after, effective_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
        [
          data.id,
          data.accountId,
          data.amount,
          data.entryType,
          data.transactionType,
          data.currency,
          data.customerId,
          data.betId,
          data.description,
          data.reference,
          data.balanceBefore,
          data.balanceAfter,
          data.effectiveDate,
        ]
      );
    }

    // Publish domain events after successful save
    const domainEvents = entry.getDomainEvents();
    if (domainEvents.length > 0) {
      // Import DomainEvents here to avoid circular dependency
      const { DomainEvents } = await import('../../domains/shared/events/domain-events');
      const events = DomainEvents.getInstance();

      for (const event of domainEvents) {
        await events.publish(event.eventType, event);
      }

      // Clear events after publishing
      entry.clearDomainEvents();
    }

    return entry;
  }

  async findById(id: string): Promise<LedgerEntry | null> {
    const result = (await this.db
      .query(
        `
      SELECT * FROM ledger_entries WHERE id = ? AND deleted_at IS NULL
    `,
        [id]
      )
      .get()) as any;

    if (!result) return null;

    return this.mapRowToEntry(result);
  }

  async findByQuery(query: LedgerQuery): Promise<LedgerEntry[]> {
    let sql = `
      SELECT * FROM ledger_entries
      WHERE deleted_at IS NULL
    `;
    const params: any[] = [];

    if (query.accountId) {
      sql += ' AND account_id = ?';
      params.push(query.accountId);
    }

    if (query.customerId) {
      sql += ' AND customer_id = ?';
      params.push(query.customerId);
    }

    if (query.betId) {
      sql += ' AND bet_id = ?';
      params.push(query.betId);
    }

    if (query.transactionType) {
      sql += ' AND transaction_type = ?';
      params.push(query.transactionType);
    }

    if (query.entryType) {
      sql += ' AND entry_type = ?';
      params.push(query.entryType);
    }

    if (query.fromDate) {
      sql += ' AND effective_date >= ?';
      params.push(query.fromDate.toISOString());
    }

    if (query.toDate) {
      sql += ' AND effective_date <= ?';
      params.push(query.toDate.toISOString());
    }

    if (query.currency) {
      sql += ' AND currency = ?';
      params.push(query.currency);
    }

    if (query.minAmount !== undefined) {
      sql += ' AND amount >= ?';
      params.push(query.minAmount);
    }

    if (query.maxAmount !== undefined) {
      sql += ' AND amount <= ?';
      params.push(query.maxAmount);
    }

    if (query.isPosted !== undefined) {
      if (query.isPosted) {
        sql += ' AND posted_at IS NOT NULL';
      } else {
        sql += ' AND posted_at IS NULL';
      }
    }

    if (query.isReversed !== undefined) {
      if (query.isReversed) {
        sql += ' AND reversed_at IS NOT NULL';
      } else {
        sql += ' AND reversed_at IS NULL';
      }
    }

    sql += ' ORDER BY effective_date DESC, created_at DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const results = (await this.db.query(sql, params).all()) as any[];
    return results.map(row => this.mapRowToEntry(row));
  }

  async findByAccountId(accountId: string, limit = 100, offset = 0): Promise<LedgerEntry[]> {
    const results = (await this.db
      .query(
        `
      SELECT * FROM ledger_entries
      WHERE account_id = ? AND deleted_at IS NULL
      ORDER BY effective_date DESC, created_at DESC
      LIMIT ? OFFSET ?
    `,
        [accountId, limit, offset]
      )
      .all()) as any[];

    return results.map(row => this.mapRowToEntry(row));
  }

  async findByCustomerId(
    customerId: string,
    fromDate?: Date,
    toDate?: Date,
    limit = 50,
    offset = 0
  ): Promise<LedgerEntry[]> {
    let sql = `
      SELECT * FROM ledger_entries
      WHERE customer_id = ? AND deleted_at IS NULL
    `;
    const params: any[] = [customerId];

    if (fromDate) {
      sql += ' AND effective_date >= ?';
      params.push(fromDate.toISOString());
    }

    if (toDate) {
      sql += ' AND effective_date <= ?';
      params.push(toDate.toISOString());
    }

    sql += ' ORDER BY effective_date DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const results = (await this.db.query(sql, params).all()) as any[];
    return results.map(row => this.mapRowToEntry(row));
  }

  async findByBetId(betId: string): Promise<LedgerEntry[]> {
    const results = (await this.db
      .query(
        `
      SELECT * FROM ledger_entries
      WHERE bet_id = ? AND deleted_at IS NULL
      ORDER BY effective_date DESC, created_at DESC
    `,
        [betId]
      )
      .all()) as any[];

    return results.map(row => this.mapRowToEntry(row));
  }

  async getCustomerBalance(customerId: string): Promise<number> {
    const result = (await this.db
      .query(
        `
      SELECT
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END), 0) as balance
      FROM ledger_entries
      WHERE customer_id = ? AND posted_at IS NOT NULL AND reversed_at IS NULL AND deleted_at IS NULL
    `,
        [customerId]
      )
      .get()) as any;

    return parseFloat(result.balance || 0);
  }

  async getCustomerBalanceDetails(customerId: string): Promise<CustomerBalance> {
    const balance = await this.getCustomerBalance(customerId);

    // Get available balance (excluding held amounts for open bets)
    const heldResult = (await this.db
      .query(
        `
      SELECT COALESCE(SUM(amount), 0) as held_amount
      FROM ledger_entries
      WHERE customer_id = ? AND transaction_type = 'BET'
        AND posted_at IS NOT NULL AND reversed_at IS NULL AND deleted_at IS NULL
        AND bet_id IN (
          SELECT id FROM bets WHERE customer_id = ? AND status = 'OPEN'
        )
    `,
        [customerId, customerId]
      )
      .get()) as any;

    const heldAmount = parseFloat(heldResult.held_amount || 0);
    const availableBalance = balance - heldAmount;

    // Get last transaction date
    const lastTxResult = (await this.db
      .query(
        `
      SELECT effective_date
      FROM ledger_entries
      WHERE customer_id = ? AND posted_at IS NOT NULL AND deleted_at IS NULL
      ORDER BY effective_date DESC
      LIMIT 1
    `,
        [customerId]
      )
      .get()) as any;

    return {
      customerId,
      balance,
      availableBalance,
      heldBalance: heldAmount,
      lastTransactionDate: lastTxResult ? new Date(lastTxResult.effective_date) : undefined,
      currency: 'USD',
    };
  }

  async getAccountBalance(accountId: string): Promise<number> {
    const result = (await this.db
      .query(
        `
      SELECT
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END), 0) as balance
      FROM ledger_entries
      WHERE account_id = ? AND posted_at IS NOT NULL AND reversed_at IS NULL AND deleted_at IS NULL
    `,
        [accountId]
      )
      .get()) as any;

    return parseFloat(result.balance || 0);
  }

  async getSummary(query?: LedgerQuery): Promise<LedgerSummary> {
    let whereClause = 'WHERE posted_at IS NOT NULL AND reversed_at IS NULL AND deleted_at IS NULL';
    const params: any[] = [];

    if (query?.customerId) {
      whereClause += ' AND customer_id = ?';
      params.push(query.customerId);
    }

    if (query?.accountId) {
      whereClause += ' AND account_id = ?';
      params.push(query.accountId);
    }

    if (query?.fromDate) {
      whereClause += ' AND effective_date >= ?';
      params.push(query.fromDate.toISOString());
    }

    if (query?.toDate) {
      whereClause += ' AND effective_date <= ?';
      params.push(query.toDate.toISOString());
    }

    const sql = `
      SELECT
        COUNT(*) as total_entries,
        COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount END), 0) as total_credit,
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END), 0) as net_amount,
        COALESCE(SUM(CASE WHEN transaction_type = 'BET' THEN 1 END), 0) as bet_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'WIN' THEN 1 END), 0) as win_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN 1 END), 0) as deposit_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'WITHDRAWAL' THEN 1 END), 0) as withdrawal_count
      FROM ledger_entries
      ${whereClause}
    `;

    const result = (await this.db.query(sql, params).get()) as any;

    return {
      totalEntries: result.total_entries || 0,
      totalDebitAmount: parseFloat(result.total_debit || 0),
      totalCreditAmount: parseFloat(result.total_credit || 0),
      netAmount: parseFloat(result.net_amount || 0),
      entriesByType: {
        [TransactionType.BET]: result.bet_count || 0,
        [TransactionType.WIN]: result.win_count || 0,
        [TransactionType.DEPOSIT]: result.deposit_count || 0,
        [TransactionType.WITHDRAWAL]: result.withdrawal_count || 0,
        [TransactionType.ADJUSTMENT]: 0,
        [TransactionType.BONUS]: 0,
        [TransactionType.REFUND]: 0,
        [TransactionType.TRANSFER]: 0,
      },
      balance: parseFloat(result.net_amount || 0),
    };
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .query(
        `
      SELECT 1 FROM ledger_entries
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1
    `,
        [id]
      )
      .get();

    return !!result;
  }

  async getCustomerTransactionHistory(
    customerId: string,
    limit = 20,
    offset = 0
  ): Promise<LedgerEntry[]> {
    return await this.findByCustomerId(customerId, undefined, undefined, limit, offset);
  }

  async getDailyTotals(
    date: Date,
    customerId?: string
  ): Promise<{
    date: string;
    totalDebits: number;
    totalCredits: number;
    netAmount: number;
    transactionCount: number;
  }> {
    const dateStr = date.toISOString().split('T')[0];
    let sql = `
      SELECT
        COUNT(*) as transaction_count,
        COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END), 0) as net_amount
      FROM ledger_entries
      WHERE DATE(effective_date) = ?
        AND posted_at IS NOT NULL AND reversed_at IS NULL AND deleted_at IS NULL
    `;
    const params: any[] = [dateStr];

    if (customerId) {
      sql += ' AND customer_id = ?';
      params.push(customerId);
    }

    const result = (await this.db.query(sql, params).get()) as any;

    return {
      date: dateStr,
      totalDebits: parseFloat(result.total_debits || 0),
      totalCredits: parseFloat(result.total_credits || 0),
      netAmount: parseFloat(result.net_amount || 0),
      transactionCount: result.transaction_count || 0,
    };
  }

  async getMonthlySummary(
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
  }> {
    let sql = `
      SELECT
        COUNT(*) as transaction_count,
        COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END), 0) as net_amount,
        COALESCE(SUM(CASE WHEN transaction_type = 'BET' THEN 1 END), 0) as bet_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'WIN' THEN 1 END), 0) as win_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN 1 END), 0) as deposit_count,
        COALESCE(SUM(CASE WHEN transaction_type = 'WITHDRAWAL' THEN 1 END), 0) as withdrawal_count
      FROM ledger_entries
      WHERE strftime('%Y', effective_date) = ?
        AND strftime('%m', effective_date) = ?
        AND posted_at IS NOT NULL AND reversed_at IS NULL AND deleted_at IS NULL
    `;
    const params: any[] = [year.toString(), month.toString().padStart(2, '0')];

    if (customerId) {
      sql += ' AND customer_id = ?';
      params.push(customerId);
    }

    const result = (await this.db.query(sql, params).get()) as any;

    return {
      year,
      month,
      totalDebits: parseFloat(result.total_debits || 0),
      totalCredits: parseFloat(result.total_credits || 0),
      netAmount: parseFloat(result.net_amount || 0),
      transactionCount: result.transaction_count || 0,
      transactionsByType: {
        [TransactionType.BET]: result.bet_count || 0,
        [TransactionType.WIN]: result.win_count || 0,
        [TransactionType.DEPOSIT]: result.deposit_count || 0,
        [TransactionType.WITHDRAWAL]: result.withdrawal_count || 0,
        [TransactionType.ADJUSTMENT]: 0,
        [TransactionType.BONUS]: 0,
        [TransactionType.REFUND]: 0,
        [TransactionType.TRANSFER]: 0,
      },
    };
  }

  private mapRowToEntry(row: any): LedgerEntry {
    return new LedgerEntry({
      id: row.id,
      accountId: row.account_id,
      amount: parseFloat(row.amount),
      entryType: row.entry_type as EntryType,
      transactionType: row.transaction_type as TransactionType,
      currency: row.currency,
      customerId: row.customer_id,
      betId: row.bet_id,
      description: row.description,
      reference: row.reference,
      balanceBefore: row.balance_before ? parseFloat(row.balance_before) : undefined,
      balanceAfter: row.balance_after ? parseFloat(row.balance_after) : undefined,
      effectiveDate: new Date(row.effective_date),
      createdAt: new Date(row.created_at),
      postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
      reversedAt: row.reversed_at ? new Date(row.reversed_at) : undefined,
      reversalEntryId: row.reversal_entry_id,
    });
  }
}
