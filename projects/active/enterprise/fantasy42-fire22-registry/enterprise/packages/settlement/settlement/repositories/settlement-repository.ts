/**
 * Settlement Repository - Data Access Layer
 * SQLite implementation with Bun-native integration
 */

import { Database } from 'bun:sqlite';
import { DomainLogger, LoggerFactory } from '../../../core/logging/domain-logger';
import { SettlementRepository } from '../services/settlement-service';
import {
  Settlement,
  SettlementStatus,
  SettlementType,
  SettlementFees,
} from '../entities/settlement';

export class SQLiteSettlementRepository implements SettlementRepository {
  private db: Database;
  private logger = LoggerFactory.create('settlement-repository');

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    // Create settlements table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL,
        merchant_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        settlement_type TEXT NOT NULL,
        settlement_date DATE NOT NULL,
        processing_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        failed_at DATETIME,

        -- Fees breakdown
        processing_fee REAL DEFAULT 0,
        network_fee REAL DEFAULT 0,
        interchange_fee REAL DEFAULT 0,
        total_fees REAL DEFAULT 0,

        -- Metadata
        batch_id TEXT,
        settlement_reference TEXT UNIQUE NOT NULL,
        bank_reference TEXT,
        processing_notes TEXT, -- JSON array
        compliance_flags TEXT, -- JSON array
        reconciliation_data TEXT, -- JSON object

        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        -- Indexes for performance
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for common queries
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_settlements_payment ON settlements(payment_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_settlements_merchant ON settlements(merchant_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_settlements_date ON settlements(settlement_date)`);
    this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_settlements_reference ON settlements(settlement_reference)`
    );
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_settlements_batch ON settlements(batch_id)`);

    this.logger.system('Settlement database tables initialized');
  }

  async save(settlement: Settlement): Promise<Settlement> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO settlements (
          id, payment_id, merchant_id, amount, currency, status, settlement_type,
          settlement_date, processing_date, completed_at, failed_at,
          processing_fee, network_fee, interchange_fee, total_fees,
          batch_id, settlement_reference, bank_reference,
          processing_notes, compliance_flags, reconciliation_data,
          updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP
        )
      `);

      stmt.run(
        settlement.id,
        settlement.paymentId,
        settlement.merchantId,
        settlement.amount,
        settlement.currency,
        settlement.status,
        settlement.settlementType,
        settlement.settlementDate.toISOString(),
        settlement.processingDate.toISOString(),
        settlement.completedAt?.toISOString(),
        settlement.failedAt?.toISOString(),

        settlement.fees.processingFee,
        settlement.fees.networkFee,
        settlement.fees.interchangeFee,
        settlement.fees.totalFees,

        settlement.metadata.batchId,
        settlement.metadata.settlementReference,
        settlement.metadata.bankReference,
        JSON.stringify(settlement.metadata.processingNotes || []),
        JSON.stringify(settlement.metadata.complianceFlags || []),
        JSON.stringify(settlement.metadata.reconciliationData || {})
      );

      await this.logger.business('Settlement saved to database', {
        entity: 'Settlement',
        entityId: settlement.id,
        paymentId: settlement.paymentId,
        status: settlement.status,
      });

      return settlement;
    } catch (error) {
      await this.logger.infrastructureError('Failed to save settlement', error as Error, {
        entityId: settlement.id,
      });
      throw error;
    }
  }

  async findById(id: string): Promise<Settlement | null> {
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

  async findByPaymentId(paymentId: string): Promise<Settlement | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM settlements WHERE payment_id = ? ORDER BY created_at DESC LIMIT 1
      `);

      const row = stmt.get(paymentId) as any;

      if (!row) {
        return null;
      }

      return this.mapRowToSettlement(row);
    } catch (error) {
      await this.logger.infrastructureError(
        'Failed to find settlement by payment ID',
        error as Error,
        {
          paymentId,
        }
      );
      throw error;
    }
  }

  async findByMerchantId(merchantId: string): Promise<Settlement[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM settlements
        WHERE merchant_id = ?
        ORDER BY settlement_date DESC, created_at DESC
      `);

      const rows = stmt.all(merchantId) as any[];

      return rows.map(row => this.mapRowToSettlement(row));
    } catch (error) {
      await this.logger.infrastructureError(
        'Failed to find settlements by merchant ID',
        error as Error,
        {
          merchantId,
        }
      );
      throw error;
    }
  }

  async findSettlements(
    merchantId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<Settlement[]> {
    try {
      let query = `SELECT * FROM settlements WHERE 1=1`;
      const params: any[] = [];

      if (merchantId) {
        query += ` AND merchant_id = ?`;
        params.push(merchantId);
      }

      if (dateRange) {
        query += ` AND settlement_date BETWEEN ? AND ?`;
        params.push(dateRange.start.toISOString());
        params.push(dateRange.end.toISOString());
      }

      query += ` ORDER BY settlement_date DESC, created_at DESC`;

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map(row => this.mapRowToSettlement(row));
    } catch (error) {
      await this.logger.infrastructureError('Failed to find settlements', error as Error, {
        merchantId,
        dateRange,
      });
      throw error;
    }
  }

  async findPendingSettlements(): Promise<Settlement[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM settlements
        WHERE status IN ('pending', 'processing')
        ORDER BY settlement_date ASC, created_at ASC
      `);

      const rows = stmt.all() as any[];

      return rows.map(row => this.mapRowToSettlement(row));
    } catch (error) {
      await this.logger.infrastructureError('Failed to find pending settlements', error as Error);
      throw error;
    }
  }

  async updateStatus(id: string, status: SettlementStatus): Promise<void> {
    try {
      let updateFields = 'status = ?, updated_at = CURRENT_TIMESTAMP';
      const params: any[] = [status, id];

      // Add status-specific timestamps
      if (status === SettlementStatus.COMPLETED) {
        updateFields += ', completed_at = CURRENT_TIMESTAMP';
      } else if (status === SettlementStatus.FAILED) {
        updateFields += ', failed_at = CURRENT_TIMESTAMP';
      }

      const stmt = this.db.prepare(`
        UPDATE settlements
        SET ${updateFields}
        WHERE id = ?
      `);

      const result = stmt.run(...params);

      if (result.changes === 0) {
        throw new Error(`Settlement with id ${id} not found`);
      }

      await this.logger.business('Settlement status updated', {
        entity: 'Settlement',
        entityId: id,
        newStatus: status,
      });
    } catch (error) {
      await this.logger.infrastructureError('Failed to update settlement status', error as Error, {
        entityId: id,
        status,
      });
      throw error;
    }
  }

  // Additional query methods for analytics and reporting

  async getSettlementStats(): Promise<{
    totalSettlements: number;
    totalAmount: number;
    completedSettlements: number;
    failedSettlements: number;
    pendingSettlements: number;
    totalFees: number;
  }> {
    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(*) as total_settlements,
          SUM(amount) as total_amount,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_settlements,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_settlements,
          SUM(CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE 0 END) as pending_settlements,
          SUM(total_fees) as total_fees
        FROM settlements
      `);

      const row = stmt.get() as any;

      return {
        totalSettlements: row.total_settlements || 0,
        totalAmount: row.total_amount || 0,
        completedSettlements: row.completed_settlements || 0,
        failedSettlements: row.failed_settlements || 0,
        pendingSettlements: row.pending_settlements || 0,
        totalFees: row.total_fees || 0,
      };
    } catch (error) {
      await this.logger.infrastructureError('Failed to get settlement stats', error as Error);
      throw error;
    }
  }

  async getMerchantSettlementSummary(merchantId: string): Promise<{
    totalSettlements: number;
    totalAmount: number;
    averageAmount: number;
    successRate: number;
    totalFees: number;
    lastSettlementDate?: Date;
  }> {
    try {
      const stmt = this.db.prepare(`
        SELECT
          COUNT(*) as total_settlements,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          SUM(total_fees) as total_fees,
          MAX(settlement_date) as last_settlement_date,
          ROUND(
            (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0) / COUNT(*),
            2
          ) as success_rate
        FROM settlements
        WHERE merchant_id = ?
      `);

      const row = stmt.get(merchantId) as any;

      return {
        totalSettlements: row.total_settlements || 0,
        totalAmount: row.total_amount || 0,
        averageAmount: row.average_amount || 0,
        successRate: row.success_rate || 0,
        totalFees: row.total_fees || 0,
        lastSettlementDate: row.last_settlement_date
          ? new Date(row.last_settlement_date)
          : undefined,
      };
    } catch (error) {
      await this.logger.infrastructureError(
        'Failed to get merchant settlement summary',
        error as Error,
        {
          merchantId,
        }
      );
      throw error;
    }
  }

  // Helper methods for mapping database rows to domain entities

  private mapRowToSettlement(row: any): Settlement {
    // Reconstruct SettlementFees value object
    const fees = new SettlementFees(row.processing_fee, row.network_fee, row.interchange_fee);

    // Parse JSON metadata
    const processingNotes = JSON.parse(row.processing_notes || '[]');
    const complianceFlags = JSON.parse(row.compliance_flags || '[]');
    const reconciliationData = JSON.parse(row.reconciliation_data || '{}');

    // Create metadata object
    const metadata = {
      batchId: row.batch_id,
      settlementReference: row.settlement_reference,
      bankReference: row.bank_reference,
      processingNotes,
      complianceFlags,
      reconciliationData,
    };

    // Create settlement entity (this would need to be done through a factory in real implementation)
    // For now, we'll reconstruct the object
    const settlement = {
      id: row.id,
      paymentId: row.payment_id,
      merchantId: row.merchant_id,
      amount: row.amount,
      currency: row.currency,
      status: row.status as SettlementStatus,
      settlementType: row.settlement_type as SettlementType,
      settlementDate: new Date(row.settlement_date),
      processingDate: new Date(row.processing_date),
      fees,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      failedAt: row.failed_at ? new Date(row.failed_at) : undefined,
      metadata,
    } as Settlement;

    return settlement;
  }

  async close(): Promise<void> {
    this.db.close();
    await this.logger.system('Settlement database connection closed');
  }
}

// Factory for creating settlement repositories
export class SettlementRepositoryFactory {
  static createSQLiteRepository(dbPath?: string): SQLiteSettlementRepository {
    return new SQLiteSettlementRepository(dbPath);
  }

  static createInMemoryRepository(): SQLiteSettlementRepository {
    return new SQLiteSettlementRepository(':memory:');
  }
}
