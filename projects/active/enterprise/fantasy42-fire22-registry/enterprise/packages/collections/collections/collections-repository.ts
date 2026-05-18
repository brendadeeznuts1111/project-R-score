/**
 * Collections Repository - Data Access Layer
 * SQLite implementation with Bun-native integration
 */

import { Database } from 'bun:sqlite';
import { DomainLogger, LoggerFactory } from '../../core/logging/domain-logger';
import { CollectionsRepository, Payment, Settlement } from './collections-service';

export class SQLiteCollectionsRepository implements CollectionsRepository {
  private db: Database;
  private logger = LoggerFactory.create('collections-repository');

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    // Create payments table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        merchant_id TEXT NOT NULL,
        reference TEXT UNIQUE NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME
      )
    `);

    // Create settlements table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        settlement_date DATE NOT NULL,
        bank_reference TEXT,
        fees REAL DEFAULT 0,
        net_amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id)
      )
    `);

    // Create indexes for performance
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_settlements_payment ON settlements(payment_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_settlements_date ON settlements(settlement_date)`);

    this.logger.system('Collections database tables initialized');
  }

  async savePayment(payment: Payment): Promise<Payment> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO payments (id, amount, currency, status, payment_method, customer_id, merchant_id, reference, metadata, processed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        payment.id,
        payment.amount,
        payment.currency,
        payment.status,
        payment.paymentMethod,
        payment.customerId,
        payment.merchantId,
        payment.reference,
        JSON.stringify(payment.metadata),
        payment.processedAt?.toISOString()
      );

      await this.logger.business('Payment saved to database', {
        entity: 'Payment',
        entityId: payment.id,
        customerId: payment.customerId,
      });

      return payment;
    } catch (error) {
      await this.logger.infrastructureError('Failed to save payment', error as Error, {
        entityId: payment.id,
      });
      throw error;
    }
  }

  async findPaymentById(id: string): Promise<Payment | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM payments WHERE id = ?
      `);

      const row = stmt.get(id) as any;

      if (!row) {
        return null;
      }

      return this.mapRowToPayment(row);
    } catch (error) {
      await this.logger.infrastructureError('Failed to find payment by ID', error as Error, {
        entityId: id,
      });
      throw error;
    }
  }

  async findPaymentByReference(reference: string): Promise<Payment | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM payments WHERE reference = ?
      `);

      const row = stmt.get(reference) as any;

      if (!row) {
        return null;
      }

      return this.mapRowToPayment(row);
    } catch (error) {
      await this.logger.infrastructureError('Failed to find payment by reference', error as Error, {
        reference,
      });
      throw error;
    }
  }

  async findPaymentsInRange(timeRange: { start: Date; end: Date }): Promise<Payment[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM payments
        WHERE created_at BETWEEN ? AND ?
        ORDER BY created_at DESC
      `);

      const rows = stmt.all(timeRange.start.toISOString(), timeRange.end.toISOString()) as any[];

      return rows.map(row => this.mapRowToPayment(row));
    } catch (error) {
      await this.logger.infrastructureError('Failed to find payments in range', error as Error, {
        timeRange,
      });
      throw error;
    }
  }

  async updatePaymentStatus(id: string, status: Payment['status']): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE payments
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const result = stmt.run(status, id);

      if (result.changes === 0) {
        throw new Error(`Payment with id ${id} not found`);
      }

      await this.logger.business('Payment status updated', {
        entity: 'Payment',
        entityId: id,
        metadata: { newStatus: status },
      });
    } catch (error) {
      await this.logger.infrastructureError('Failed to update payment status', error as Error, {
        entityId: id,
        status,
      });
      throw error;
    }
  }

  async saveSettlement(settlement: Settlement): Promise<Settlement> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO settlements (id, payment_id, amount, currency, status, settlement_date, bank_reference, fees, net_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        settlement.id,
        settlement.paymentId,
        settlement.amount,
        settlement.currency,
        settlement.status,
        settlement.settlementDate.toISOString(),
        settlement.bankReference,
        settlement.fees,
        settlement.netAmount
      );

      await this.logger.business('Settlement saved to database', {
        entity: 'Settlement',
        entityId: settlement.id,
        paymentId: settlement.paymentId,
      });

      return settlement;
    } catch (error) {
      await this.logger.infrastructureError('Failed to save settlement', error as Error, {
        entityId: settlement.id,
      });
      throw error;
    }
  }

  async findSettlementById(id: string): Promise<Settlement | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM settlements WHERE id = ?
      `);

      const row = stmt.get(id) as any;

      if (!row) {
        return null;
      }

      return this.mapRowToSettlement(row);
    } catch (error) {
      await this.logger.infrastructureError('Failed to find settlement by ID', error as Error, {
        entityId: id,
      });
      throw error;
    }
  }

  async findSettlementsInRange(timeRange: { start: Date; end: Date }): Promise<Settlement[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM settlements
        WHERE settlement_date BETWEEN ? AND ?
        ORDER BY settlement_date DESC
      `);

      const rows = stmt.all(
        timeRange.start.toISOString().split('T')[0],
        timeRange.end.toISOString().split('T')[0]
      ) as any[];

      return rows.map(row => this.mapRowToSettlement(row));
    } catch (error) {
      await this.logger.infrastructureError('Failed to find settlements in range', error as Error, {
        timeRange,
      });
      throw error;
    }
  }

  async findSettlementsByPaymentId(paymentId: string): Promise<Settlement[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM settlements
        WHERE payment_id = ?
        ORDER BY settlement_date DESC
      `);

      const rows = stmt.all(paymentId) as any[];

      return rows.map(row => this.mapRowToSettlement(row));
    } catch (error) {
      await this.logger.infrastructureError(
        'Failed to find settlements by payment ID',
        error as Error,
        {
          paymentId,
        }
      );
      throw error;
    }
  }

  // Helper methods for mapping database rows to domain entities
  private mapRowToPayment(row: any): Payment {
    return {
      id: row.id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      paymentMethod: row.payment_method,
      customerId: row.customer_id,
      merchantId: row.merchant_id,
      reference: row.reference,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    };
  }

  private mapRowToSettlement(row: any): Settlement {
    return {
      id: row.id,
      paymentId: row.payment_id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      settlementDate: new Date(row.settlement_date),
      bankReference: row.bank_reference,
      fees: row.fees,
      netAmount: row.net_amount,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // Database maintenance methods
  async getPaymentStats(): Promise<{
    totalPayments: number;
    totalAmount: number;
    pendingPayments: number;
    completedPayments: number;
  }> {
    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(*) as total_payments,
          SUM(amount) as total_amount,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_payments
        FROM payments
      `);

      const row = stmt.get() as any;

      return {
        totalPayments: row.total_payments || 0,
        totalAmount: row.total_amount || 0,
        pendingPayments: row.pending_payments || 0,
        completedPayments: row.completed_payments || 0,
      };
    } catch (error) {
      await this.logger.infrastructureError('Failed to get payment stats', error as Error);
      throw error;
    }
  }

  async close(): Promise<void> {
    this.db.close();
    await this.logger.system('Collections database connection closed');
  }
}

// Factory for creating collections repositories
export class CollectionsRepositoryFactory {
  static createSQLiteRepository(dbPath?: string): SQLiteCollectionsRepository {
    return new SQLiteCollectionsRepository(dbPath);
  }

  static createInMemoryRepository(): SQLiteCollectionsRepository {
    return new SQLiteCollectionsRepository(':memory:');
  }
}
