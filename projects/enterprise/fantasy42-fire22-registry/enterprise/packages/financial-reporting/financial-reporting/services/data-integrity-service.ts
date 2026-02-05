/**
 * Data Integrity Service
 * Domain-Driven Design Implementation
 *
 * Handles data reconciliation, integrity checks, and balance validation
 */

import { DomainEvents } from '../../shared/events/domain-events';
import { DomainError } from '../../shared/domain-entity';
import { AccountingPeriod } from '../value-objects/accounting-period';
import { AuditLogService, AuditEventType, AuditSeverity } from './audit-log-service';

export interface ReconciliationResult {
  period: {
    start: Date;
    end: Date;
  };
  sources: {
    customerBalances: {
      totalAmount: number;
      recordCount: number;
      source: 'customer_balances';
    };
    ledgerLiability: {
      totalAmount: number;
      recordCount: number;
      source: 'ledger_liability';
    };
  };
  reconciliation: {
    isBalanced: boolean;
    difference: number;
    tolerance: number;
    withinTolerance: boolean;
  };
  metadata: {
    checkedAt: Date;
    duration: number;
    dataSources: string[];
  };
}

export interface IntegrityCheckResult {
  checkType: string;
  isValid: boolean;
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedRecords: number;
    suggestedAction: string;
  }>;
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    checkedAt: Date;
  };
}

export interface DataQualityMetrics {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    completeness: number; // Percentage of expected records present
    accuracy: number; // Percentage of records with correct data
    consistency: number; // Percentage of records following business rules
    timeliness: number; // Percentage of records within expected timeframes
  };
  issues: Array<{
    category: string;
    count: number;
    description: string;
  }>;
  recommendations: string[];
}

export class DataIntegrityService {
  constructor(
    private db: any, // SQLite database connection
    private auditService: AuditLogService,
    private events: DomainEvents = DomainEvents.getInstance()
  ) {}

  /**
   * Run balance reconciliation - scheduled job
   * Queries Balance domain for total customer liability and sums relevant ledger_entries
   * Any discrepancy triggers high-priority alert
   */
  async runReconciliation(
    periodStart?: Date,
    periodEnd?: Date,
    tolerance: number = 0.01
  ): Promise<ReconciliationResult> {
    const startTime = Date.now();
    const start = periodStart || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours default
    const end = periodEnd || new Date();

    try {
      // Query Balance domain for total customer liability
      const customerBalances = await this.queryBalanceDomainForTotalLiability();

      // Sum relevant ledger_entries for the same period
      const ledgerLiability = await this.sumLedgerEntriesForCustomerAccounts(start, end);

      // Calculate reconciliation (customer balances should equal ledger liability)
      const difference = Math.abs(
        customerBalances.totalAmount - Math.abs(ledgerLiability.totalAmount)
      );
      const isBalanced = difference === 0;
      const withinTolerance = difference <= tolerance;

      const result: ReconciliationResult = {
        period: { start, end },
        sources: {
          customerBalances,
          ledgerLiability,
        },
        reconciliation: {
          isBalanced,
          difference,
          tolerance,
          withinTolerance,
        },
        metadata: {
          checkedAt: new Date(),
          duration: Date.now() - startTime,
          dataSources: ['balance_domain', 'ledger_entries'],
        },
      };

      // Log reconciliation result to audit trail
      await this.auditService.logComplianceEvent(
        isBalanced
          ? AuditEventType.COMPLIANCE_CHECK_PASSED
          : AuditEventType.COMPLIANCE_CHECK_FAILED,
        isBalanced ? AuditSeverity.LOW : AuditSeverity.HIGH,
        'system',
        'DataIntegrityService',
        `reconciliation_${Date.now()}`,
        isBalanced
          ? ['Balance reconciliation successful']
          : [`Balance discrepancy: $${difference.toFixed(2)}`],
        {
          reconciliation: result,
          tolerance,
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
        }
      );

      // Trigger high-priority alert if discrepancy found
      if (!withinTolerance) {
        await this.triggerHighPriorityReconciliationAlert(result);
      }

      return result;
    } catch (error) {
      await this.auditService.logComplianceEvent(
        AuditEventType.COMPLIANCE_CHECK_FAILED,
        AuditSeverity.CRITICAL,
        'system',
        'DataIntegrityService',
        `reconciliation_${Date.now()}`,
        [`Reconciliation failed: ${error.message}`],
        { error: error.message, periodStart: start, periodEnd: end }
      );

      throw new DomainError(
        `Balance reconciliation failed: ${error.message}`,
        'RECONCILIATION_FAILED',
        { periodStart: start, periodEnd: end, error }
      );
    }
  }

  /**
   * Check ledger integrity (sum of all entries should be zero)
   */
  async checkLedgerIntegrity(periodStart?: Date, periodEnd?: Date): Promise<IntegrityCheckResult> {
    const query =
      periodStart && periodEnd
        ? `SELECT SUM(amount) as total, COUNT(*) as count FROM ledger_entries
       WHERE entry_date BETWEEN ? AND ? AND status = 'posted'`
        : `SELECT SUM(amount) as total, COUNT(*) as count FROM ledger_entries
       WHERE status = 'posted'`;

    const params =
      periodStart && periodEnd ? [periodStart.toISOString(), periodEnd.toISOString()] : [];

    const result = await this.db.get(query, params);

    const isValid = Math.abs(result.total || 0) < 0.01; // Allow for tiny rounding differences
    const issues = [];

    if (!isValid) {
      issues.push({
        severity: 'high' as const,
        description: `Ledger does not balance. Total: $${(result.total || 0).toFixed(2)}`,
        affectedRecords: result.count || 0,
        suggestedAction: 'Investigate unbalanced entries and perform manual reconciliation',
      });
    }

    // Check for orphaned entries
    const orphanedQuery = `
      SELECT COUNT(*) as orphaned_count FROM ledger_entries le
      LEFT JOIN accounts a ON le.account_id = a.id
      WHERE a.id IS NULL AND le.status = 'posted'
    `;

    const orphanedResult = await this.db.get(orphanedQuery);

    if (orphanedResult.orphaned_count > 0) {
      issues.push({
        severity: 'medium' as const,
        description: `${orphanedResult.orphaned_count} ledger entries reference non-existent accounts`,
        affectedRecords: orphanedResult.orphaned_count,
        suggestedAction: 'Clean up orphaned ledger entries or restore missing accounts',
      });
    }

    return {
      checkType: 'ledger_integrity',
      isValid: isValid && issues.length === 0,
      issues,
      summary: {
        totalRecords: result.count || 0,
        validRecords: isValid
          ? (result.count || 0) - issues.reduce((sum, issue) => sum + issue.affectedRecords, 0)
          : 0,
        invalidRecords: issues.reduce((sum, issue) => sum + issue.affectedRecords, 0),
        checkedAt: new Date(),
      },
    };
  }

  /**
   * Validate financial transaction data quality
   */
  async validateTransactionDataQuality(
    periodStart: Date,
    periodEnd: Date
  ): Promise<IntegrityCheckResult> {
    const issues = [];

    // Check for transactions with missing required fields
    const missingFieldsQuery = `
      SELECT COUNT(*) as count FROM financial_transactions
      WHERE (accounting_period_id IS NULL OR description = '' OR source_system = '')
      AND posted_at BETWEEN ? AND ?
    `;

    const missingFieldsResult = await this.db.get(missingFieldsQuery, [
      periodStart.toISOString(),
      periodEnd.toISOString(),
    ]);

    if (missingFieldsResult.count > 0) {
      issues.push({
        severity: 'medium' as const,
        description: `${missingFieldsResult.count} transactions have missing required fields`,
        affectedRecords: missingFieldsResult.count,
        suggestedAction: 'Complete missing transaction data fields',
      });
    }

    // Check for unusual amount patterns
    const unusualAmountsQuery = `
      SELECT COUNT(*) as count FROM financial_transactions
      WHERE ABS(amount) > 1000000
      AND posted_at BETWEEN ? AND ?
    `;

    const unusualAmountsResult = await this.db.get(unusualAmountsQuery, [
      periodStart.toISOString(),
      periodEnd.toISOString(),
    ]);

    if (unusualAmountsResult.count > 0) {
      issues.push({
        severity: 'low' as const,
        description: `${unusualAmountsResult.count} transactions have unusually large amounts (> $1M)`,
        affectedRecords: unusualAmountsResult.count,
        suggestedAction: 'Review large transactions for validity',
      });
    }

    // Check for duplicate transaction IDs
    const duplicateIdsQuery = `
      SELECT transaction_id, COUNT(*) as count
      FROM financial_transactions
      WHERE posted_at BETWEEN ? AND ?
      GROUP BY transaction_id
      HAVING COUNT(*) > 1
    `;

    const duplicateResults = await this.db.all(duplicateIdsQuery, [
      periodStart.toISOString(),
      periodEnd.toISOString(),
    ]);

    if (duplicateResults.length > 0) {
      const totalDuplicates = duplicateResults.reduce((sum, row) => sum + row.count - 1, 0);
      issues.push({
        severity: 'high' as const,
        description: `${totalDuplicates} duplicate transaction IDs found`,
        affectedRecords: totalDuplicates,
        suggestedAction: 'Resolve duplicate transaction IDs',
      });
    }

    // Get total count
    const totalQuery = `
      SELECT COUNT(*) as count FROM financial_transactions
      WHERE posted_at BETWEEN ? AND ?
    `;

    const totalResult = await this.db.get(totalQuery, [
      periodStart.toISOString(),
      periodEnd.toISOString(),
    ]);

    return {
      checkType: 'transaction_data_quality',
      isValid: issues.length === 0,
      issues,
      summary: {
        totalRecords: totalResult.count || 0,
        validRecords:
          (totalResult.count || 0) - issues.reduce((sum, issue) => sum + issue.affectedRecords, 0),
        invalidRecords: issues.reduce((sum, issue) => sum + issue.affectedRecords, 0),
        checkedAt: new Date(),
      },
    };
  }

  /**
   * Get data quality metrics
   */
  async getDataQualityMetrics(periodStart: Date, periodEnd: Date): Promise<DataQualityMetrics> {
    // Run various quality checks
    const reconciliation = await this.runReconciliation(periodStart, periodEnd);
    const ledgerIntegrity = await this.checkLedgerIntegrity(periodStart, periodEnd);
    const transactionQuality = await this.validateTransactionDataQuality(periodStart, periodEnd);

    // Calculate overall metrics
    const totalChecks = 3;
    const passedChecks = [
      reconciliation.reconciliation.withinTolerance,
      ledgerIntegrity.isValid,
      transactionQuality.isValid,
    ].filter(Boolean).length;

    const completeness = (passedChecks / totalChecks) * 100;
    const accuracy =
      (transactionQuality.summary.validRecords /
        Math.max(transactionQuality.summary.totalRecords, 1)) *
      100;
    const consistency = ledgerIntegrity.isValid ? 100 : 0;
    const timeliness = reconciliation.reconciliation.withinTolerance ? 100 : 50; // Simplified

    // Collect all issues
    const issues = [
      ...ledgerIntegrity.issues.map(issue => ({
        category: 'ledger_integrity',
        count: issue.affectedRecords,
        description: issue.description,
      })),
      ...transactionQuality.issues.map(issue => ({
        category: 'transaction_quality',
        count: issue.affectedRecords,
        description: issue.description,
      })),
    ];

    // Generate recommendations
    const recommendations = [];
    if (!reconciliation.reconciliation.withinTolerance) {
      recommendations.push('Perform manual reconciliation to resolve balance discrepancies');
    }
    if (!ledgerIntegrity.isValid) {
      recommendations.push('Review and correct unbalanced ledger entries');
    }
    if (transactionQuality.issues.length > 0) {
      recommendations.push('Clean up transaction data quality issues');
    }

    return {
      period: { start: periodStart, end: periodEnd },
      metrics: {
        completeness,
        accuracy,
        consistency,
        timeliness,
      },
      issues,
      recommendations,
    };
  }

  /**
   * Run scheduled integrity checks
   */
  async runScheduledIntegrityChecks(): Promise<{
    reconciliation: ReconciliationResult;
    ledgerIntegrity: IntegrityCheckResult;
    transactionQuality: IntegrityCheckResult;
    dataQuality: DataQualityMetrics;
  }> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    console.log('🔍 Running scheduled integrity checks...');

    const [reconciliation, ledgerIntegrity, transactionQuality] = await Promise.all([
      this.runReconciliation(periodStart, now),
      this.checkLedgerIntegrity(periodStart, now),
      this.validateTransactionDataQuality(periodStart, now),
    ]);

    const dataQuality = await this.getDataQualityMetrics(periodStart, now);

    // Log scheduled check completion
    await this.auditService.logSystemEvent(
      AuditEventType.SYSTEM_MAINTENANCE,
      'system',
      'DataIntegrityService',
      'Scheduled integrity checks completed',
      {
        reconciliation: reconciliation.reconciliation,
        ledgerIntegrity: ledgerIntegrity.summary,
        transactionQuality: transactionQuality.summary,
        dataQuality: dataQuality.metrics,
      }
    );

    return {
      reconciliation,
      ledgerIntegrity,
      transactionQuality,
      dataQuality,
    };
  }

  // Private helper methods
  private async queryBalanceDomainForTotalLiability(): Promise<{
    totalAmount: number;
    recordCount: number;
    source: 'customer_balances';
  }> {
    try {
      // Query the Balance domain for total customer liability
      // This simulates querying the Balance domain service
      const query = `
        SELECT SUM(current_balance) as total_liability, COUNT(*) as customer_count
        FROM balances
        WHERE is_active = 1
          AND account_type = 'customer'
      `;

      const result = await this.db.get(query);

      return {
        totalAmount: result.total_liability || 0,
        recordCount: result.customer_count || 0,
        source: 'customer_balances',
      };
    } catch (error) {
      // Fallback: if Balance domain is unavailable, try direct query
      console.warn('Balance domain query failed, using fallback:', error.message);

      const fallbackQuery = `
        SELECT SUM(current_balance) as total, COUNT(*) as count
        FROM balances
        WHERE is_active = 1
      `;

      const result = await this.db.get(fallbackQuery);

      return {
        totalAmount: result.total || 0,
        recordCount: result.count || 0,
        source: 'customer_balances',
      };
    }
  }

  private async sumLedgerEntriesForCustomerAccounts(
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    totalAmount: number;
    recordCount: number;
    source: 'ledger_liability';
  }> {
    // Sum all ledger entries for customer accounts (representing liability)
    const query = `
      SELECT -SUM(le.amount) as total_liability, COUNT(*) as entry_count
      FROM ledger_entries le
      JOIN accounts a ON le.account_id = a.id
      WHERE a.account_type = 'customer'
        AND le.status = 'posted'
        AND le.entry_date BETWEEN ? AND ?
    `;

    const result = await this.db.get(query, [periodStart.toISOString(), periodEnd.toISOString()]);

    return {
      totalAmount: result.total_liability || 0,
      recordCount: result.entry_count || 0,
      source: 'ledger_liability',
    };
  }

  private async triggerHighPriorityReconciliationAlert(
    result: ReconciliationResult
  ): Promise<void> {
    const severity =
      result.reconciliation.difference > 1000
        ? AuditSeverity.CRITICAL
        : result.reconciliation.difference > 100
          ? AuditSeverity.HIGH
          : AuditSeverity.MEDIUM;

    // High-priority alert for reconciliation discrepancies
    await this.events.publish('HighPriorityReconciliationAlert', {
      alertType: 'BALANCE_DISCREPANCY',
      severity,
      difference: result.reconciliation.difference,
      tolerance: result.reconciliation.tolerance,
      customerBalances: result.sources.customerBalances.totalAmount,
      ledgerLiability: result.sources.ledgerLiability.totalAmount,
      customerCount: result.sources.customerBalances.recordCount,
      ledgerEntryCount: result.sources.ledgerLiability.recordCount,
      periodStart: result.period.start,
      periodEnd: result.period.end,
      timestamp: new Date(),
      requiresImmediateAction: severity === AuditSeverity.CRITICAL,
    });

    // Log critical compliance violation to audit trail
    await this.auditService.logComplianceEvent(
      AuditEventType.COMPLIANCE_RULE_VIOLATION,
      severity,
      'system',
      'DataIntegrityService',
      `reconciliation_critical_alert_${Date.now()}`,
      [
        `CRITICAL: Balance reconciliation discrepancy detected`,
        `Difference: $${result.reconciliation.difference.toFixed(2)}`,
        `Customer balances: $${result.sources.customerBalances.totalAmount.toFixed(2)}`,
        `Ledger liability: $${result.sources.ledgerLiability.totalAmount.toFixed(2)}`,
        `Period: ${result.period.start.toISOString()} to ${result.period.end.toISOString()}`,
      ],
      result
    );
  }
}
