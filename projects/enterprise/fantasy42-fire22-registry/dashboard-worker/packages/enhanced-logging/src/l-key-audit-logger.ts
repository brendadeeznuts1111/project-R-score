/**
 * L-Key Audit Logger - Specialized logging for L-Key operations
 */

import { Fire22Logger, LogLevel, LogContext } from './logger';
import { LKeyLogEntry, AuditReport } from './types';

export class LKeyAuditLogger extends Fire22Logger {
  private auditEntries: LKeyLogEntry[] = [];
  private maxAuditEntries: number = 10000;

  constructor(config = {}) {
    super({
      component: 'l-key-audit',
      enableLKeyTracking: true,
      ...config,
    });
  }

  /**
   * Log L-Key specific audit event
   */
  public logLKeyAction(
    action: string,
    lKey: string,
    entityType: string,
    entityId: string,
    context: LogContext = {},
    metadata?: Record<string, any>
  ): void {
    const auditEntry: LKeyLogEntry = {
      timestamp: new Date(),
      level: LogLevel.INFO,
      message: `L-Key Action: ${action}`,
      context: {
        ...context,
        lKey,
        entityId,
        component: 'l-key-audit',
      },
      metadata,
      lKey,
      lKeyCategory: this.getLKeyCategory(lKey),
      entityType,
      entityId,
      action,
      auditTrail: [lKey],
    };

    // Add flow sequence if provided
    if (metadata?.flowSequence) {
      auditEntry.flowSequence = metadata.flowSequence;
      auditEntry.auditTrail = [...auditEntry.auditTrail, ...metadata.flowSequence];
    }

    this.addAuditEntry(auditEntry);
    this.log(LogLevel.INFO, auditEntry.message, auditEntry.context, auditEntry.metadata);
  }

  /**
   * Log L-Key transaction flow
   */
  public logLKeyFlow(
    flowName: string,
    flowSequence: string[],
    entityId: string,
    context: LogContext = {},
    metadata?: Record<string, any>
  ): void {
    const primaryLKey = flowSequence[0] || 'L0000';

    this.logLKeyAction('FLOW_EXECUTION', primaryLKey, 'FLOW', entityId, context, {
      ...metadata,
      flowName,
      flowSequence,
      flowLength: flowSequence.length,
    });

    // Log each step in the flow
    flowSequence.forEach((lKey, index) => {
      this.debug(
        `Flow Step ${index + 1}/${flowSequence.length}: ${lKey}`,
        {
          ...context,
          lKey,
          entityId,
        },
        {
          flowName,
          stepIndex: index,
          totalSteps: flowSequence.length,
          stepLKey: lKey,
        }
      );
    });
  }

  /**
   * Log L-Key entity mapping
   */
  public logEntityMapping(
    entityType: string,
    entityId: string,
    lKey: string,
    mappingDetails: Record<string, any>,
    context: LogContext = {}
  ): void {
    this.logLKeyAction('ENTITY_MAPPED', lKey, entityType, entityId, context, {
      mappingType: 'ENTITY_CREATION',
      ...mappingDetails,
    });
  }

  /**
   * Log L-Key validation events
   */
  public logLKeyValidation(
    lKey: string,
    isValid: boolean,
    validationErrors?: string[],
    context: LogContext = {}
  ): void {
    const level = isValid ? LogLevel.DEBUG : LogLevel.WARN;
    const action = isValid ? 'VALIDATION_PASSED' : 'VALIDATION_FAILED';

    this.log(
      level,
      `L-Key Validation ${isValid ? 'Passed' : 'Failed'}: ${lKey}`,
      {
        ...context,
        lKey,
        component: 'l-key-validator',
      },
      {
        validationResult: isValid,
        validationErrors: validationErrors || [],
        lKeyCategory: this.getLKeyCategory(lKey),
      }
    );

    if (!isValid) {
      this.logLKeyAction(action, lKey, 'VALIDATION', lKey, context, {
        validationErrors: validationErrors || [],
      });
    }
  }

  /**
   * Log L-Key usage statistics
   */
  public logLKeyUsage(lKey: string, usageCount: number, context: LogContext = {}): void {
    this.debug(
      `L-Key Usage: ${lKey} used ${usageCount} times`,
      {
        ...context,
        lKey,
        component: 'l-key-metrics',
      },
      {
        usageCount,
        lKeyCategory: this.getLKeyCategory(lKey),
        usageTimestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Generate comprehensive audit report
   */
  public generateAuditReport(
    startDate: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: Date = new Date()
  ): AuditReport {
    const relevantEntries = this.auditEntries.filter(
      entry => entry.timestamp >= startDate && entry.timestamp <= endDate
    );

    const byLevel: Record<string, number> = {};
    const byLKey: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    let securityEvents = 0;

    // Analyze entries
    for (const entry of relevantEntries) {
      // Count by level
      const levelName = LogLevel[entry.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;

      // Count by L-Key
      byLKey[entry.lKey] = (byLKey[entry.lKey] || 0) + 1;

      // Count by action
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;

      // Count security events
      if (entry.action.includes('SECURITY') || entry.action.includes('VALIDATION_FAILED')) {
        securityEvents++;
      }
    }

    // Calculate performance metrics
    const performanceEntries = relevantEntries.filter(e => e.metadata?.duration);
    const averageResponseTime =
      performanceEntries.length > 0
        ? performanceEntries.reduce((sum, e) => sum + (e.metadata?.duration || 0), 0) /
          performanceEntries.length
        : 0;

    const errorEntries = relevantEntries.filter(e => e.level >= LogLevel.ERROR);
    const errorRate = relevantEntries.length > 0 ? errorEntries.length / relevantEntries.length : 0;

    // Find top errors
    const errorCounts: Record<string, { count: number; lastOccurrence: Date }> = {};
    for (const entry of errorEntries) {
      if (!errorCounts[entry.message]) {
        errorCounts[entry.message] = { count: 0, lastOccurrence: entry.timestamp };
      }
      errorCounts[entry.message].count++;
      if (entry.timestamp > errorCounts[entry.message].lastOccurrence) {
        errorCounts[entry.message].lastOccurrence = entry.timestamp;
      }
    }

    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([message, data]) => ({ message, ...data }));

    // Calculate compliance metrics
    const transactionEntries = relevantEntries.filter(e => e.entityType === 'TRANSACTION');
    const highRiskEntries = transactionEntries.filter(e => e.metadata?.riskScore > 60);
    const blockedEntries = transactionEntries.filter(
      e => e.action.includes('BLOCKED') || e.action.includes('REJECTED')
    );
    const averageRiskScore =
      transactionEntries.length > 0
        ? transactionEntries.reduce((sum, e) => sum + (e.metadata?.riskScore || 0), 0) /
          transactionEntries.length
        : 0;

    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalEntries: relevantEntries.length,
      byLevel,
      byLKey,
      byAction,
      securityEvents,
      performanceMetrics: {
        averageResponseTime,
        errorRate,
        throughput: relevantEntries.length / ((endDate.getTime() - startDate.getTime()) / 3600000), // per hour
      },
      topErrors,
      complianceMetrics: {
        totalTransactions: transactionEntries.length,
        highRiskTransactions: highRiskEntries.length,
        blockedTransactions: blockedEntries.length,
        averageRiskScore,
      },
    };
  }

  /**
   * Get L-Key usage statistics
   */
  public getLKeyUsageStats(
    startDate: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: Date = new Date()
  ): Record<
    string,
    {
      usage: number;
      category: string;
      lastUsed: Date;
      actions: Record<string, number>;
    }
  > {
    const relevantEntries = this.auditEntries.filter(
      entry => entry.timestamp >= startDate && entry.timestamp <= endDate
    );

    const stats: Record<
      string,
      {
        usage: number;
        category: string;
        lastUsed: Date;
        actions: Record<string, number>;
      }
    > = {};

    for (const entry of relevantEntries) {
      if (!stats[entry.lKey]) {
        stats[entry.lKey] = {
          usage: 0,
          category: entry.lKeyCategory,
          lastUsed: entry.timestamp,
          actions: {},
        };
      }

      stats[entry.lKey].usage++;
      stats[entry.lKey].actions[entry.action] = (stats[entry.lKey].actions[entry.action] || 0) + 1;

      if (entry.timestamp > stats[entry.lKey].lastUsed) {
        stats[entry.lKey].lastUsed = entry.timestamp;
      }
    }

    return stats;
  }

  /**
   * Export audit entries for external analysis
   */
  public exportAuditEntries(
    startDate?: Date,
    endDate?: Date,
    format: 'json' | 'csv' = 'json'
  ): string {
    let entries = this.auditEntries;

    if (startDate || endDate) {
      entries = entries.filter(entry => {
        if (startDate && entry.timestamp < startDate) return false;
        if (endDate && entry.timestamp > endDate) return false;
        return true;
      });
    }

    if (format === 'csv') {
      const headers = [
        'timestamp',
        'level',
        'message',
        'lKey',
        'lKeyCategory',
        'entityType',
        'entityId',
        'action',
        'auditTrail',
        'metadata',
      ];

      const csvLines = [
        headers.join(','),
        ...entries.map(entry =>
          [
            entry.timestamp.toISOString(),
            LogLevel[entry.level],
            `"${entry.message.replace(/"/g, '""')}"`,
            entry.lKey,
            entry.lKeyCategory,
            entry.entityType,
            entry.entityId,
            entry.action,
            `"${entry.auditTrail.join(',')}"`,
            `"${JSON.stringify(entry.metadata || {}).replace(/"/g, '""')}"`,
          ].join(',')
        ),
      ];

      return csvLines.join('\n');
    }

    return JSON.stringify(entries, null, 2);
  }

  /**
   * Add audit entry to internal storage
   */
  private addAuditEntry(entry: LKeyLogEntry): void {
    this.auditEntries.push(entry);

    // Maintain max size
    if (this.auditEntries.length > this.maxAuditEntries) {
      this.auditEntries.shift();
    }
  }

  /**
   * Get L-Key category
   */
  private getLKeyCategory(lKey: string): string {
    const prefix = lKey.substring(0, 2);
    const categoryMap: Record<string, string> = {
      L1: 'PARTY',
      L2: 'CUSTOMER',
      L3: 'TRANSACTION',
      L4: 'PAYMENT',
      L5: 'ORDER',
      L6: 'STATUS',
      L7: 'FEE',
      L8: 'RISK',
      L9: 'SERVICE',
    };
    return categoryMap[prefix] || 'UNKNOWN';
  }

  /**
   * Clear audit entries
   */
  public clearAuditEntries(): void {
    this.auditEntries = [];
  }

  /**
   * Get audit entry count
   */
  public getAuditEntryCount(): number {
    return this.auditEntries.length;
  }
}

export default LKeyAuditLogger;
