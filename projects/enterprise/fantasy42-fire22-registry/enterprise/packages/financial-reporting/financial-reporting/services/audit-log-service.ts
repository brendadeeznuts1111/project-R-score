/**
 * Audit Log Service
 * Domain-Driven Design Implementation
 *
 * Comprehensive audit logging for financial reporting and compliance
 */

import { DomainEvents } from '../../shared/events/domain-events';
import { DomainError } from '../../shared/domain-entity';
import { FinancialTransaction } from '../entities/financial-transaction';
import { FinancialReport } from '../entities/financial-report';
import { AccountingPeriod } from '../value-objects/accounting-period';

export enum AuditEventType {
  // Transaction Events
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_MODIFIED = 'transaction_modified',
  TRANSACTION_VOIDED = 'transaction_voided',
  TRANSACTION_ADJUSTED = 'transaction_adjusted',

  // Report Events
  REPORT_GENERATED = 'report_generated',
  REPORT_APPROVED = 'report_approved',
  REPORT_PUBLISHED = 'report_published',
  REPORT_ARCHIVED = 'report_archived',
  REPORT_CORRECTED = 'report_corrected',

  // Compliance Events
  COMPLIANCE_CHECK_PASSED = 'compliance_check_passed',
  COMPLIANCE_CHECK_FAILED = 'compliance_check_failed',
  COMPLIANCE_RULE_VIOLATION = 'compliance_rule_violation',
  REGULATORY_FILING_SUBMITTED = 'regulatory_filing_submitted',

  // Access Events
  DATA_ACCESSED = 'data_accessed',
  REPORT_VIEWED = 'report_viewed',
  EXPORT_GENERATED = 'export_generated',

  // System Events
  SYSTEM_MAINTENANCE = 'system_maintenance',
  CONFIGURATION_CHANGED = 'configuration_changed',
  SECURITY_INCIDENT = 'security_incident',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType: string;
  resourceId: string;
  action: string;
  description: string;
  metadata: Record<string, any>;
  previousState?: any;
  newState?: any;
  complianceFlags: string[];
  retentionPeriod: Date;
}

export interface AuditQuery {
  eventTypes?: AuditEventType[];
  severities?: AuditSeverity[];
  userIds?: string[];
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  complianceFlags?: string[];
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByUser: Record<string, number>;
  complianceViolations: number;
  period: {
    start: Date;
    end: Date;
  };
}

export class AuditLogService {
  constructor(
    private auditRepository: any, // AuditLogRepository
    private userService: any, // User service for user context
    private sessionService: any, // Session service for session context
    private events: DomainEvents = DomainEvents.getInstance()
  ) {}

  /**
   * Log financial transaction event
   */
  async logTransactionEvent(
    eventType: AuditEventType,
    transaction: FinancialTransaction,
    userId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<AuditLogEntry> {
    const entry = await this.createAuditEntry({
      eventType,
      severity: this.determineTransactionSeverity(eventType, transaction),
      userId,
      resourceType: 'FinancialTransaction',
      resourceId: transaction.getId(),
      action: eventType.replace('_', ' '),
      description,
      metadata: {
        transactionId: transaction.getTransactionId(),
        transactionType: transaction.getType(),
        amount: transaction.getAmount().toJSON(),
        accountingPeriod: transaction.getAccountingPeriod().toJSON(),
        sourceSystem: transaction.getSourceSystem(),
        ...metadata,
      },
      previousState: metadata?.previousState,
      newState: metadata?.newState,
      complianceFlags: this.determineComplianceFlags(transaction, eventType),
    });

    await this.auditRepository.save(entry);
    await this.checkAuditTriggers(entry);

    return entry;
  }

  /**
   * Log financial report event
   */
  async logReportEvent(
    eventType: AuditEventType,
    report: FinancialReport,
    userId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<AuditLogEntry> {
    const entry = await this.createAuditEntry({
      eventType,
      severity: this.determineReportSeverity(eventType, report),
      userId,
      resourceType: 'FinancialReport',
      resourceId: report.getId(),
      action: eventType.replace('_', ' '),
      description,
      metadata: {
        reportType: report.getReportType(),
        periodStart: report.getPeriodStart(),
        periodEnd: report.getPeriodEnd(),
        status: report.getStatus(),
        complianceStatus: report.getComplianceStatus(),
        ...metadata,
      },
      previousState: metadata?.previousState,
      newState: metadata?.newState,
      complianceFlags: this.determineReportComplianceFlags(report, eventType),
    });

    await this.auditRepository.save(entry);
    await this.checkAuditTriggers(entry);

    return entry;
  }

  /**
   * Log compliance event
   */
  async logComplianceEvent(
    eventType: AuditEventType,
    severity: AuditSeverity,
    userId: string,
    resourceType: string,
    resourceId: string,
    description: string,
    violations?: Array<{
      rule: string;
      severity: AuditSeverity;
      details: string;
    }>,
    metadata?: Record<string, any>
  ): Promise<AuditLogEntry> {
    const entry = await this.createAuditEntry({
      eventType,
      severity,
      userId,
      resourceType,
      resourceId,
      action: eventType.replace('_', ' '),
      description,
      metadata: {
        violations,
        ...metadata,
      },
      complianceFlags: violations ? violations.map(v => `violation:${v.rule}`) : [],
    });

    await this.auditRepository.save(entry);

    // If critical compliance violation, trigger immediate alert
    if (severity === AuditSeverity.CRITICAL) {
      await this.triggerComplianceAlert(entry);
    }

    return entry;
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(query: AuditQuery): Promise<AuditLogEntry[]> {
    // Log the audit query itself
    await this.logAuditQuery(query);

    return await this.auditRepository.findByQuery(query);
  }

  /**
   * Get audit summary for a period
   */
  async getAuditSummary(
    startDate: Date,
    endDate: Date,
    groupBy?: 'type' | 'severity' | 'user'
  ): Promise<AuditSummary> {
    const events = await this.auditRepository.findByPeriod(startDate, endDate);
    const summary: AuditSummary = {
      totalEvents: events.length,
      eventsByType: {} as Record<AuditEventType, number>,
      eventsBySeverity: {} as Record<AuditSeverity, number>,
      eventsByUser: {} as Record<string, number>,
      complianceViolations: 0,
      period: { start: startDate, end: endDate },
    };

    // Initialize counters
    Object.values(AuditEventType).forEach(type => {
      summary.eventsByType[type] = 0;
    });

    Object.values(AuditSeverity).forEach(severity => {
      summary.eventsBySeverity[severity] = 0;
    });

    // Count events
    events.forEach(event => {
      summary.eventsByType[event.eventType]++;
      summary.eventsBySeverity[event.severity]++;

      if (event.userId) {
        summary.eventsByUser[event.userId] = (summary.eventsByUser[event.userId] || 0) + 1;
      }

      if (event.complianceFlags.length > 0) {
        summary.complianceViolations++;
      }
    });

    return summary;
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceAuditTrail(
    resourceType: string,
    resourceId: string,
    limit?: number
  ): Promise<AuditLogEntry[]> {
    return await this.auditRepository.findByResource(resourceType, resourceId, limit);
  }

  /**
   * Archive old audit logs
   */
  async archiveAuditLogs(olderThan: Date): Promise<{
    archived: number;
    deleted: number;
    errors: string[];
  }> {
    const result = {
      archived: 0,
      deleted: 0,
      errors: [] as string[],
    };

    try {
      // Find logs older than specified date
      const oldLogs = await this.auditRepository.findOlderThan(olderThan);

      // Archive logs (move to long-term storage)
      for (const log of oldLogs) {
        try {
          await this.archiveLogEntry(log);
          result.archived++;
        } catch (error) {
          result.errors.push(`Failed to archive log ${log.id}: ${error.message}`);
        }
      }

      // Delete archived logs from active storage
      result.deleted = await this.auditRepository.deleteArchivedLogs(olderThan);
    } catch (error) {
      result.errors.push(`Archive operation failed: ${error.message}`);
    }

    // Log the archive operation
    await this.logSystemEvent(
      AuditEventType.SYSTEM_MAINTENANCE,
      'system',
      'AuditLogService',
      `Archived ${result.archived} audit logs, deleted ${result.deleted} old logs`,
      { result }
    );

    return result;
  }

  /**
   * Search audit logs with full-text search
   */
  async searchAuditLogs(searchTerm: string, query?: AuditQuery): Promise<AuditLogEntry[]> {
    return await this.auditRepository.search(searchTerm, query);
  }

  /**
   * Get compliance violations report
   */
  async getComplianceViolationsReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    violations: AuditLogEntry[];
    summary: {
      total: number;
      bySeverity: Record<AuditSeverity, number>;
      byType: Record<string, number>;
      criticalIssues: AuditLogEntry[];
    };
  }> {
    const violations = await this.auditRepository.findComplianceViolations(startDate, endDate);

    const summary = {
      total: violations.length,
      bySeverity: {} as Record<AuditSeverity, number>,
      byType: {} as Record<string, number>,
      criticalIssues: [] as AuditLogEntry[],
    };

    // Initialize severity counters
    Object.values(AuditSeverity).forEach(severity => {
      summary.bySeverity[severity] = 0;
    });

    violations.forEach(violation => {
      summary.bySeverity[violation.severity]++;

      violation.complianceFlags.forEach(flag => {
        summary.byType[flag] = (summary.byType[flag] || 0) + 1;
      });

      if (violation.severity === AuditSeverity.CRITICAL) {
        summary.criticalIssues.push(violation);
      }
    });

    return { violations, summary };
  }

  // Private helper methods
  private async createAuditEntry(params: {
    eventType: AuditEventType;
    severity: AuditSeverity;
    userId?: string;
    resourceType: string;
    resourceId: string;
    action: string;
    description: string;
    metadata?: Record<string, any>;
    previousState?: any;
    newState?: any;
    complianceFlags?: string[];
  }): Promise<AuditLogEntry> {
    const sessionInfo = await this.getSessionInfo();
    const retentionPeriod = this.calculateRetentionPeriod(params.eventType, params.severity);

    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      eventType: params.eventType,
      severity: params.severity,
      timestamp: new Date(),
      userId: params.userId,
      sessionId: sessionInfo.sessionId,
      ipAddress: sessionInfo.ipAddress,
      userAgent: sessionInfo.userAgent,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      action: params.action,
      description: params.description,
      metadata: params.metadata || {},
      previousState: params.previousState,
      newState: params.newState,
      complianceFlags: params.complianceFlags || [],
      retentionPeriod,
    };

    return entry;
  }

  private determineTransactionSeverity(
    eventType: AuditEventType,
    transaction: FinancialTransaction
  ): AuditSeverity {
    switch (eventType) {
      case AuditEventType.TRANSACTION_VOIDED:
      case AuditEventType.TRANSACTION_ADJUSTED:
        return AuditSeverity.HIGH;
      case AuditEventType.TRANSACTION_CREATED:
      case AuditEventType.TRANSACTION_MODIFIED:
        return AuditSeverity.MEDIUM;
      default:
        return AuditSeverity.LOW;
    }
  }

  private determineReportSeverity(
    eventType: AuditEventType,
    report: FinancialReport
  ): AuditSeverity {
    switch (eventType) {
      case AuditEventType.REPORT_CORRECTED:
        return AuditSeverity.HIGH;
      case AuditEventType.REPORT_PUBLISHED:
        return AuditSeverity.MEDIUM;
      case AuditEventType.REPORT_GENERATED:
      case AuditEventType.REPORT_APPROVED:
      case AuditEventType.REPORT_ARCHIVED:
        return AuditSeverity.LOW;
      default:
        return AuditSeverity.LOW;
    }
  }

  private determineComplianceFlags(
    transaction: FinancialTransaction,
    eventType: AuditEventType
  ): string[] {
    const flags: string[] = [];

    if (transaction.getNetAmount() > 10000) {
      flags.push('large_transaction');
    }

    if (
      transaction.getType() === 'adjustment' ||
      eventType === AuditEventType.TRANSACTION_ADJUSTED
    ) {
      flags.push('adjustment');
    }

    if (transaction.getStatus() === 'voided') {
      flags.push('voided_transaction');
    }

    return flags;
  }

  private determineReportComplianceFlags(
    report: FinancialReport,
    eventType: AuditEventType
  ): string[] {
    const flags: string[] = [];

    if (report.getComplianceStatus() === 'non_compliant') {
      flags.push('non_compliant_report');
    }

    if (report.getComplianceStatus() === 'requires_attention') {
      flags.push('compliance_attention_required');
    }

    if (eventType === AuditEventType.REPORT_CORRECTED) {
      flags.push('report_correction');
    }

    return flags;
  }

  private calculateRetentionPeriod(eventType: AuditEventType, severity: AuditSeverity): Date {
    const now = new Date();

    // Critical events: 7 years
    if (severity === AuditSeverity.CRITICAL) {
      return new Date(now.getTime() + 7 * 365 * 24 * 60 * 60 * 1000);
    }

    // High severity and compliance events: 5 years
    if (severity === AuditSeverity.HIGH || eventType.toString().includes('compliance')) {
      return new Date(now.getTime() + 5 * 365 * 24 * 60 * 60 * 1000);
    }

    // Medium severity: 3 years
    if (severity === AuditSeverity.MEDIUM) {
      return new Date(now.getTime() + 3 * 365 * 24 * 60 * 60 * 1000);
    }

    // Low severity: 1 year
    return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  }

  private async getSessionInfo(): Promise<{
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }> {
    // Implementation would get current session context
    return {};
  }

  private async checkAuditTriggers(entry: AuditLogEntry): Promise<void> {
    // Check for patterns that require immediate attention
    if (entry.severity === AuditSeverity.CRITICAL) {
      await this.events.publish('CriticalAuditEvent', {
        auditEntryId: entry.id,
        eventType: entry.eventType,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        description: entry.description,
      });
    }

    // Check for unusual patterns
    if (
      entry.complianceFlags.includes('large_transaction') &&
      entry.eventType === AuditEventType.TRANSACTION_VOIDED
    ) {
      await this.events.publish('UnusualTransactionPattern', {
        auditEntryId: entry.id,
        pattern: 'large_transaction_voided',
        resourceId: entry.resourceId,
      });
    }
  }

  private async triggerComplianceAlert(entry: AuditLogEntry): Promise<void> {
    await this.events.publish('ComplianceAlert', {
      auditEntryId: entry.id,
      severity: entry.severity,
      eventType: entry.eventType,
      description: entry.description,
      complianceFlags: entry.complianceFlags,
    });
  }

  private async logAuditQuery(query: AuditQuery): Promise<void> {
    // Log that an audit query was performed
    await this.logSystemEvent(
      AuditEventType.DATA_ACCESSED,
      'system',
      'AuditLogService',
      'Audit logs queried',
      { query }
    );
  }

  private async logSystemEvent(
    eventType: AuditEventType,
    userId: string,
    resourceType: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry = await this.createAuditEntry({
      eventType,
      severity: AuditSeverity.LOW,
      userId,
      resourceType,
      resourceId: 'system',
      action: eventType.replace('_', ' '),
      description,
      metadata,
    });

    await this.auditRepository.save(entry);
  }

  private async archiveLogEntry(entry: AuditLogEntry): Promise<void> {
    // Implementation would move entry to archive storage
    // This is a placeholder for the actual archiving logic
  }
}
