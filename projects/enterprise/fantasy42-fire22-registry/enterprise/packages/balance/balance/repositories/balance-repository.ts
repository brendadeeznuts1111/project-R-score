/**
 * Balance Repository
 * Domain-Driven Design Implementation
 */

import { Balance, BalanceChange } from '../entities/balance';

export interface BalanceQuery {
  customerId?: string;
  agentId?: string;
  isActive?: boolean;
  thresholdStatus?: 'normal' | 'warning' | 'critical';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface BalanceChangeQuery {
  balanceId?: string;
  changeType?: 'credit' | 'debit';
  performedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export abstract class BalanceRepository {
  abstract save(balance: Balance): Promise<void>;
  abstract saveChange(change: BalanceChange): Promise<void>;
  abstract findById(id: string): Promise<Balance | null>;
  abstract findByCustomerId(customerId: string): Promise<Balance | null>;
  abstract findByQuery(query: BalanceQuery): Promise<Balance[]>;
  abstract getChanges(query: BalanceChangeQuery): Promise<BalanceChange[]>;
  abstract getBalanceHistory(balanceId: string, limit?: number): Promise<BalanceChange[]>;
  abstract getTotalBalanceByAgent(agentId: string): Promise<number>;
  abstract getLowBalanceAlerts(): Promise<Balance[]>;
  abstract updateBalance(id: string, newBalance: number): Promise<void>;
  abstract deactivateBalance(id: string): Promise<void>;
}

// SQLite Implementation
export class SQLiteBalanceRepository extends BalanceRepository {
  constructor(private db: any) {
    super();
  }

  async save(balance: Balance): Promise<void> {
    const data = balance.toJSON();
    await this.db.run(
      `
      INSERT OR REPLACE INTO balances (
        id, customerId, agentId, currentBalance, limits,
        isActive, lastActivity, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        data.id,
        data.customerId,
        data.agentId,
        data.currentBalance,
        JSON.stringify(data.limits),
        data.isActive ? 1 : 0,
        data.lastActivity,
        data.createdAt,
        data.updatedAt,
      ]
    );
  }

  async saveChange(change: BalanceChange): Promise<void> {
    const data = change.toJSON();
    await this.db.run(
      `
      INSERT INTO balance_changes (
        id, balanceId, changeType, amount, previousBalance,
        newBalance, reason, performedBy, metadata, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        data.id,
        data.balanceId,
        data.changeType,
        data.amount,
        data.previousBalance,
        data.newBalance,
        data.reason,
        data.performedBy,
        JSON.stringify(data.metadata || {}),
        data.createdAt,
        data.updatedAt,
      ]
    );
  }

  async findById(id: string): Promise<Balance | null> {
    const row = await this.db
      .query(
        `
      SELECT * FROM balances WHERE id = ?
    `,
        [id]
      )
      .then((rows: any[]) => rows[0]);

    return row ? Balance.fromPersistence(row) : null;
  }

  async findByCustomerId(customerId: string): Promise<Balance | null> {
    const row = await this.db
      .query(
        `
      SELECT * FROM balances WHERE customerId = ? AND isActive = 1
    `,
        [customerId]
      )
      .then((rows: any[]) => rows[0]);

    return row ? Balance.fromPersistence(row) : null;
  }

  async findByQuery(query: BalanceQuery): Promise<Balance[]> {
    let sql = 'SELECT * FROM balances WHERE 1=1';
    const params: any[] = [];

    if (query.customerId) {
      sql += ' AND customerId = ?';
      params.push(query.customerId);
    }

    if (query.agentId) {
      sql += ' AND agentId = ?';
      params.push(query.agentId);
    }

    if (query.isActive !== undefined) {
      sql += ' AND isActive = ?';
      params.push(query.isActive ? 1 : 0);
    }

    const rows = await this.db.query(sql, params);
    return rows.map((row: any) => Balance.fromPersistence(row));
  }

  async getChanges(query: BalanceChangeQuery): Promise<BalanceChange[]> {
    let sql = 'SELECT * FROM balance_changes WHERE 1=1';
    const params: any[] = [];

    if (query.balanceId) {
      sql += ' AND balanceId = ?';
      params.push(query.balanceId);
    }

    if (query.changeType) {
      sql += ' AND changeType = ?';
      params.push(query.changeType);
    }

    if (query.performedBy) {
      sql += ' AND performedBy = ?';
      params.push(query.performedBy);
    }

    if (query.dateFrom) {
      sql += ' AND createdAt >= ?';
      params.push(query.dateFrom.toISOString());
    }

    if (query.dateTo) {
      sql += ' AND createdAt <= ?';
      params.push(query.dateTo.toISOString());
    }

    sql += ' ORDER BY createdAt DESC';

    const rows = await this.db.query(sql, params);
    return rows.map((row: any) => ({
      id: row.id,
      balanceId: row.balanceId,
      changeType: row.changeType,
      amount: row.amount,
      previousBalance: row.previousBalance,
      newBalance: row.newBalance,
      reason: row.reason,
      performedBy: row.performedBy,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  async getBalanceHistory(balanceId: string, limit = 50): Promise<BalanceChange[]> {
    return this.getChanges({ balanceId, limit: limit.toString() });
  }

  async getTotalBalanceByAgent(agentId: string): Promise<number> {
    const result = await this.db
      .query(
        `
      SELECT SUM(currentBalance) as total FROM balances
      WHERE agentId = ? AND isActive = 1
    `,
        [agentId]
      )
      .then((rows: any[]) => rows[0]);

    return result?.total || 0;
  }

  async getLowBalanceAlerts(): Promise<Balance[]> {
    const rows = await this.db.query(`
      SELECT * FROM balances
      WHERE isActive = 1 AND currentBalance <= (
        SELECT json_extract(limits, '$.warningThreshold') FROM balances b2 WHERE b2.id = balances.id
      )
    `);

    return rows.map((row: any) => Balance.fromPersistence(row));
  }

  async updateBalance(id: string, newBalance: number): Promise<void> {
    await this.db.run(
      `
      UPDATE balances SET currentBalance = ?, updatedAt = ? WHERE id = ?
    `,
      [newBalance, new Date().toISOString(), id]
    );
  }

  async deactivateBalance(id: string): Promise<void> {
    await this.db.run(
      `
      UPDATE balances SET isActive = 0, updatedAt = ? WHERE id = ?
    `,
      [new Date().toISOString(), id]
    );
  }
}
