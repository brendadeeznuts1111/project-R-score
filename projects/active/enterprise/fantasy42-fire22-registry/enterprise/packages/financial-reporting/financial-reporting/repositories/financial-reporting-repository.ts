/**
 * Financial Reporting Repository
 * Domain-Driven Design Implementation
 *
 * Handles data persistence for financial reports with enterprise-grade patterns
 */

import {
  FinancialReport,
  ReportType,
  ReportStatus,
  ComplianceStatus,
} from '../entities/financial-report';

export interface FinancialReportQuery {
  reportType?: ReportType;
  status?: ReportStatus;
  complianceStatus?: ComplianceStatus;
  periodStart?: Date;
  periodEnd?: Date;
  approvedBy?: string;
  generatedAfter?: Date;
  generatedBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface FinancialReportSummary {
  totalReports: number;
  reportsByStatus: Record<ReportStatus, number>;
  reportsByType: Record<ReportType, number>;
  reportsByCompliance: Record<ComplianceStatus, number>;
  overdueReports: number;
  pendingReviews: number;
}

export abstract class FinancialReportingRepository {
  /**
   * Save a financial report
   */
  abstract save(report: FinancialReport): Promise<FinancialReport>;

  /**
   * Find report by ID
   */
  abstract findById(id: string): Promise<FinancialReport | null>;

  /**
   * Find reports by query
   */
  abstract findByQuery(query: FinancialReportQuery): Promise<FinancialReport[]>;

  /**
   * Find reports by period
   */
  abstract findByPeriod(startDate: Date, endDate: Date): Promise<FinancialReport[]>;

  /**
   * Find reports requiring attention
   */
  abstract findReportsRequiringAttention(): Promise<FinancialReport[]>;

  /**
   * Get repository statistics
   */
  abstract getSummary(): Promise<FinancialReportSummary>;

  /**
   * Delete report (soft delete)
   */
  abstract delete(id: string): Promise<void>;

  /**
   * Check if report exists
   */
  abstract exists(id: string): Promise<boolean>;
}

// SQLite Implementation
export class SQLiteFinancialReportingRepository extends FinancialReportingRepository {
  constructor(private db: any) {
    super();
  }

  async save(report: FinancialReport): Promise<FinancialReport> {
    const data = report.toJSON();

    // Check if report exists
    const existing = await this.findById(report.getId());

    if (existing) {
      // Update existing report
      await this.db.run(
        `
        UPDATE financial_reports
        SET status = ?, compliance_status = ?, approved_by = ?,
            approved_at = ?, published_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `,
        [
          data.status,
          data.complianceStatus,
          data.approvedBy,
          data.approvedAt,
          data.publishedAt,
          data.id,
        ]
      );
    } else {
      // Insert new report
      await this.db.run(
        `
        INSERT INTO financial_reports (
          id, report_type, period_start, period_end, generated_at,
          status, compliance_status, approved_by, approved_at, published_at,
          summary_data, collections_data, settlements_data, balance_data,
          revenue_data, compliance_data, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
        [
          data.id,
          data.reportType,
          data.periodStart,
          data.periodEnd,
          data.generatedAt,
          data.status,
          data.complianceStatus,
          data.approvedBy,
          data.approvedAt,
          data.publishedAt,
          JSON.stringify(data.summary),
          JSON.stringify(data.collections),
          JSON.stringify(data.settlements),
          JSON.stringify(data.balance),
          JSON.stringify(data.revenue),
          JSON.stringify(data.compliance),
        ]
      );
    }

    // Publish domain events after successful save
    const domainEvents = report.getDomainEvents();
    if (domainEvents.length > 0) {
      // Import DomainEvents here to avoid circular dependency
      const { DomainEvents } = await import('../../shared/events/domain-events');
      const events = DomainEvents.getInstance();

      for (const event of domainEvents) {
        await events.publish(event.eventType, event);
      }

      // Clear events after publishing
      report.clearDomainEvents();
    }

    return report;
  }

  async findById(id: string): Promise<FinancialReport | null> {
    const row = await this.db
      .query(
        `
      SELECT * FROM financial_reports WHERE id = ? AND deleted_at IS NULL
    `,
        [id]
      )
      .get();

    if (!row) return null;

    return this.mapRowToEntity(row);
  }

  async findByQuery(query: FinancialReportQuery): Promise<FinancialReport[]> {
    let sql = `
      SELECT * FROM financial_reports
      WHERE deleted_at IS NULL
    `;
    const params: any[] = [];

    if (query.reportType) {
      sql += ' AND report_type = ?';
      params.push(query.reportType);
    }

    if (query.status) {
      sql += ' AND status = ?';
      params.push(query.status);
    }

    if (query.complianceStatus) {
      sql += ' AND compliance_status = ?';
      params.push(query.complianceStatus);
    }

    if (query.periodStart) {
      sql += ' AND period_end >= ?';
      params.push(query.periodStart.toISOString());
    }

    if (query.periodEnd) {
      sql += ' AND period_start <= ?';
      params.push(query.periodEnd.toISOString());
    }

    if (query.approvedBy) {
      sql += ' AND approved_by = ?';
      params.push(query.approvedBy);
    }

    if (query.generatedAfter) {
      sql += ' AND generated_at >= ?';
      params.push(query.generatedAfter.toISOString());
    }

    if (query.generatedBefore) {
      sql += ' AND generated_at <= ?';
      params.push(query.generatedBefore.toISOString());
    }

    sql += ' ORDER BY generated_at DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const rows = await this.db.query(sql, params).all();
    return rows.map((row: any) => this.mapRowToEntity(row));
  }

  async findByPeriod(startDate: Date, endDate: Date): Promise<FinancialReport[]> {
    const rows = await this.db
      .query(
        `
      SELECT * FROM financial_reports
      WHERE deleted_at IS NULL
        AND period_start <= ?
        AND period_end >= ?
      ORDER BY period_start ASC
    `,
        [endDate.toISOString(), startDate.toISOString()]
      )
      .all();

    return rows.map((row: any) => this.mapRowToEntity(row));
  }

  async findReportsRequiringAttention(): Promise<FinancialReport[]> {
    const now = new Date().toISOString();

    const rows = await this.db
      .query(
        `
      SELECT * FROM financial_reports
      WHERE deleted_at IS NULL
        AND (
          compliance_status IN ('requires_attention', 'non_compliant')
          OR (status = 'draft' AND period_end < ?)
          OR status = 'pending_review'
        )
      ORDER BY
        CASE
          WHEN compliance_status = 'non_compliant' THEN 1
          WHEN compliance_status = 'requires_attention' THEN 2
          WHEN status = 'pending_review' THEN 3
          WHEN status = 'draft' AND period_end < ? THEN 4
          ELSE 5
        END,
        period_end ASC
    `,
        [now, now]
      )
      .all();

    return rows.map((row: any) => this.mapRowToEntity(row));
  }

  async getSummary(): Promise<FinancialReportSummary> {
    const now = new Date().toISOString();

    const stats = await this.db
      .query(
        `
      SELECT
        COUNT(*) as total_reports,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
        SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_review_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_count,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived_count,
        SUM(CASE WHEN report_type = 'daily' THEN 1 ELSE 0 END) as daily_count,
        SUM(CASE WHEN report_type = 'weekly' THEN 1 ELSE 0 END) as weekly_count,
        SUM(CASE WHEN report_type = 'monthly' THEN 1 ELSE 0 END) as monthly_count,
        SUM(CASE WHEN report_type = 'quarterly' THEN 1 ELSE 0 END) as quarterly_count,
        SUM(CASE WHEN report_type = 'annual' THEN 1 ELSE 0 END) as annual_count,
        SUM(CASE WHEN report_type = 'custom' THEN 1 ELSE 0 END) as custom_count,
        SUM(CASE WHEN compliance_status = 'compliant' THEN 1 ELSE 0 END) as compliant_count,
        SUM(CASE WHEN compliance_status = 'pending_review' THEN 1 ELSE 0 END) as compliance_pending_count,
        SUM(CASE WHEN compliance_status = 'requires_attention' THEN 1 ELSE 0 END) as requires_attention_count,
        SUM(CASE WHEN compliance_status = 'non_compliant' THEN 1 ELSE 0 END) as non_compliant_count,
        SUM(CASE WHEN status = 'draft' AND period_end < ? THEN 1 ELSE 0 END) as overdue_count
      FROM financial_reports
      WHERE deleted_at IS NULL
    `,
        [now]
      )
      .get();

    return {
      totalReports: stats.total_reports || 0,
      reportsByStatus: {
        [ReportStatus.DRAFT]: stats.draft_count || 0,
        [ReportStatus.PENDING_REVIEW]: stats.pending_review_count || 0,
        [ReportStatus.APPROVED]: stats.approved_count || 0,
        [ReportStatus.PUBLISHED]: stats.published_count || 0,
        [ReportStatus.ARCHIVED]: stats.archived_count || 0,
      },
      reportsByType: {
        [ReportType.DAILY]: stats.daily_count || 0,
        [ReportType.WEEKLY]: stats.weekly_count || 0,
        [ReportType.MONTHLY]: stats.monthly_count || 0,
        [ReportType.QUARTERLY]: stats.quarterly_count || 0,
        [ReportType.ANNUAL]: stats.annual_count || 0,
        [ReportType.CUSTOM]: stats.custom_count || 0,
      },
      reportsByCompliance: {
        [ComplianceStatus.COMPLIANT]: stats.compliant_count || 0,
        [ComplianceStatus.PENDING_REVIEW]: stats.compliance_pending_count || 0,
        [ComplianceStatus.REQUIRES_ATTENTION]: stats.requires_attention_count || 0,
        [ComplianceStatus.NON_COMPLIANT]: stats.non_compliant_count || 0,
      },
      overdueReports: stats.overdue_count || 0,
      pendingReviews: stats.pending_review_count || 0,
    };
  }

  async delete(id: string): Promise<void> {
    await this.db.run(
      `
      UPDATE financial_reports
      SET deleted_at = datetime('now')
      WHERE id = ?
    `,
      [id]
    );
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .query(
        `
      SELECT 1 FROM financial_reports
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1
    `,
        [id]
      )
      .get();

    return !!result;
  }

  private mapRowToEntity(row: any): FinancialReport {
    return new FinancialReport({
      id: row.id,
      reportType: row.report_type,
      periodStart: new Date(row.period_start),
      periodEnd: new Date(row.period_end),
      generatedAt: new Date(row.generated_at),
      status: row.status,
      complianceStatus: row.compliance_status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      summary: JSON.parse(row.summary_data),
      collections: JSON.parse(row.collections_data),
      settlements: JSON.parse(row.settlements_data),
      balance: JSON.parse(row.balance_data),
      revenue: JSON.parse(row.revenue_data),
      compliance: JSON.parse(row.compliance_data),
    });
  }
}

// Factory for creating repositories
export class FinancialReportingRepositoryFactory {
  static createSQLiteRepository(dbPath?: string): FinancialReportingRepository {
    const db = new (require('bun:sqlite').Database)(dbPath || ':memory:');
    this.initializeSchema(db);
    return new SQLiteFinancialReportingRepository(db);
  }

  static createInMemoryRepository(): FinancialReportingRepository {
    return this.createSQLiteRepository(':memory:');
  }

  static createWithMockDatabase(mockDb: any): FinancialReportingRepository {
    return new SQLiteFinancialReportingRepository(mockDb);
  }

  private static initializeSchema(db: any): void {
    // Skip schema initialization for mock databases
    if (db.constructor.name !== 'Database') {
      return;
    }

    db.run(`
      CREATE TABLE IF NOT EXISTS financial_reports (
        id TEXT PRIMARY KEY,
        report_type TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        compliance_status TEXT NOT NULL DEFAULT 'pending_review',
        approved_by TEXT,
        approved_at TEXT,
        published_at TEXT,
        summary_data TEXT NOT NULL,
        collections_data TEXT NOT NULL,
        settlements_data TEXT NOT NULL,
        balance_data TEXT NOT NULL,
        revenue_data TEXT NOT NULL,
        compliance_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      )
    `);

    // Create indexes for better query performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_reports_status ON financial_reports(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_reports_type ON financial_reports(report_type)`);
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_reports_period ON financial_reports(period_start, period_end)`
    );
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_reports_compliance ON financial_reports(compliance_status)`
    );
    db.run(`CREATE INDEX IF NOT EXISTS idx_reports_generated ON financial_reports(generated_at)`);
  }
}
