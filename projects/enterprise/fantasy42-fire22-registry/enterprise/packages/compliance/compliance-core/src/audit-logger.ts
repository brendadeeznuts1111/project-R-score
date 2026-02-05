#!/usr/bin/env bun

/**
 * 📋 Fantasy42 Compliance Audit Logger
 *
 * Enterprise-grade audit logging with ANSI stripping, compliance validation,
 * and secure trail management for Fantasy42 operations.
 */

import { Fantasy42SecureClient } from '@fire22-registry/core-security';
import { Fantasy42UserAgents } from '@fire22-registry/core-security';

export interface AuditEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'COMPLIANCE';
  event: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  geoRegion?: string;
  action: string;
  resource: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  details?: Record<string, any>;
  compliance: {
    gdpr: boolean;
    pci: boolean;
    aml: boolean;
    retention: string; // e.g., "5 years"
    category: 'user_action' | 'system_event' | 'security_event' | 'compliance_check';
  };
}

export interface ComplianceReport {
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalEntries: number;
    byLevel: Record<string, number>;
    byResult: Record<string, number>;
    complianceRate: number;
    violations: number;
  };
  violations: AuditEntry[];
  recommendations: string[];
  compliance: {
    gdpr: ComplianceStatus;
    pci: ComplianceStatus;
    aml: ComplianceStatus;
    overall: ComplianceStatus;
  };
}

export interface ComplianceStatus {
  status: 'compliant' | 'non-compliant' | 'partial' | 'unknown';
  score: number; // 0-100
  violations: number;
  lastCheck: string;
}

export class Fantasy42ComplianceLogger extends Fantasy42SecureClient {
  private static instance: Fantasy42ComplianceLogger;
  private auditBuffer: AuditEntry[] = [];
  private bufferSize: number = 100;
  private flushInterval: Timer | null = null;

  constructor(environment: string = 'production') {
    super('AUDIT_LOGGER', environment, {
      compliance: true,
      buildVersion: '2.7.0',
    });

    this.startPeriodicFlush();
  }

  static getInstance(environment: string = 'production'): Fantasy42ComplianceLogger {
    if (!Fantasy42ComplianceLogger.instance) {
      Fantasy42ComplianceLogger.instance = new Fantasy42ComplianceLogger(environment);
    }
    return Fantasy42ComplianceLogger.instance;
  }

  /**
   * Log a compliance event
   */
  async logAudit(
    level: AuditEntry['level'],
    event: string,
    action: string,
    resource: string,
    result: AuditEntry['result'],
    options: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      geoRegion?: string;
      details?: Record<string, any>;
      category?: AuditEntry['compliance']['category'];
    } = {}
  ): Promise<void> {
    const auditEntry: AuditEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      userAgent: this.getClientInfo().userAgent,
      userId: options.userId,
      sessionId: options.sessionId,
      ipAddress: options.ipAddress,
      geoRegion: options.geoRegion || this.getClientInfo().geoRegion,
      action,
      resource,
      result,
      details: options.details,
      compliance: {
        gdpr: this.determineGDPRCompliance(level, action, resource),
        pci: this.determinePCICompliance(action, resource),
        aml: this.determineAMLCompliance(action, resource),
        retention: this.determineRetentionPeriod(level, action),
        category: options.category || this.determineCategory(action, resource),
      },
    };

    // Clean the audit entry (strip ANSI codes and sanitize)
    const cleanEntry = this.sanitizeAuditEntry(auditEntry);

    // Add to buffer
    this.auditBuffer.push(cleanEntry);

    // Flush if buffer is full
    if (this.auditBuffer.length >= this.bufferSize) {
      await this.flushAuditBuffer();
    }

    // Send to compliance service for real-time monitoring
    if (level === 'SECURITY' || level === 'ERROR') {
      await this.sendToComplianceService(cleanEntry);
    }

    // Log to console with appropriate level
    this.logToConsole(cleanEntry);
  }

  /**
   * Log security request with User-Agent tracking
   */
  async logSecurityRequest(
    endpoint: string,
    status: number,
    options: {
      userAgent?: string;
      userId?: string;
      ipAddress?: string;
      method?: string;
      duration?: number;
      error?: string;
    } = {}
  ): Promise<void> {
    const level: AuditEntry['level'] = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO';
    const result: AuditEntry['result'] =
      status >= 400 ? 'FAILURE' : status >= 200 ? 'SUCCESS' : 'DENIED';

    await this.logAudit(level, 'API_REQUEST', options.method || 'GET', endpoint, result, {
      userId: options.userId,
      ipAddress: options.ipAddress,
      details: {
        statusCode: status,
        responseTime: options.duration,
        error: options.error,
        userAgent: options.userAgent || this.getClientInfo().userAgent,
      },
      category: 'security_event',
    });
  }

  /**
   * Log compliance check result
   */
  async logComplianceCheck(
    checkType: 'GDPR' | 'PCI' | 'AML' | 'KYC',
    passed: boolean,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logAudit(
      passed ? 'INFO' : 'ERROR',
      'COMPLIANCE_CHECK',
      checkType,
      'compliance_system',
      passed ? 'SUCCESS' : 'FAILURE',
      {
        details: {
          checkType,
          passed,
          ...details,
        },
        category: 'compliance_check',
      }
    );
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: string, endDate: string): Promise<ComplianceReport> {
    // Get audit entries for the period
    const entries = await this.getAuditEntries(startDate, endDate);

    // Calculate summary statistics
    const summary = this.calculateSummary(entries);

    // Identify violations
    const violations = entries.filter(
      entry => entry.result === 'FAILURE' || entry.level === 'ERROR' || entry.level === 'SECURITY'
    );

    // Generate recommendations
    const recommendations = this.generateComplianceRecommendations(entries, summary);

    // Check framework compliance
    const compliance = {
      gdpr: this.checkFrameworkCompliance('GDPR', entries),
      pci: this.checkFrameworkCompliance('PCI', entries),
      aml: this.checkFrameworkCompliance('AML', entries),
      overall: this.checkOverallCompliance(entries),
    };

    const report: ComplianceReport = {
      generatedAt: new Date().toISOString(),
      period: { start: startDate, end: endDate },
      summary,
      violations,
      recommendations,
      compliance,
    };

    // Save report
    await this.saveComplianceReport(report);

    return report;
  }

  /**
   * Get audit entries for a date range
   */
  async getAuditEntries(startDate: string, endDate: string): Promise<AuditEntry[]> {
    // In production, this would query the audit database
    // For now, return buffered entries within the date range
    return this.auditBuffer.filter(
      entry => entry.timestamp >= startDate && entry.timestamp <= endDate
    );
  }

  /**
   * Flush audit buffer to persistent storage
   */
  async flushAuditBuffer(): Promise<void> {
    if (this.auditBuffer.length === 0) return;

    try {
      // Send batch to audit service
      await this.post('/api/v1/audit/batch', {
        entries: this.auditBuffer,
        batchId: `batch-${Date.now()}`,
        timestamp: new Date().toISOString(),
      });

      console.log(`📋 Flushed ${this.auditBuffer.length} audit entries`);
      this.auditBuffer = [];
    } catch (error) {
      console.error('❌ Failed to flush audit buffer:', error);
      // Keep entries in buffer for retry
    }
  }

  /**
   * Start periodic buffer flushing
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(async () => {
      await this.flushAuditBuffer();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Stop periodic flushing
   */
  stopPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  private sanitizeAuditEntry(entry: AuditEntry): AuditEntry {
    // Deep clean the audit entry
    const cleaned = JSON.parse(JSON.stringify(entry));

    // Remove ANSI escape codes from all string fields
    const cleanString = JSON.stringify(cleaned).replace(/\x1b\[[0-9;]*m/g, '');
    const parsed = JSON.parse(cleanString);

    // Sanitize sensitive information
    if (parsed.details) {
      parsed.details = this.sanitizeDetails(parsed.details);
    }

    // Ensure compliance flags are boolean
    parsed.compliance = {
      ...parsed.compliance,
      gdpr: Boolean(parsed.compliance.gdpr),
      pci: Boolean(parsed.compliance.pci),
      aml: Boolean(parsed.compliance.aml),
    };

    return parsed;
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    }

    // Sanitize IP addresses (keep first two octets for geo tracking)
    if (sanitized.ipAddress) {
      const ipParts = sanitized.ipAddress.split('.');
      if (ipParts.length === 4) {
        sanitized.ipAddress = `${ipParts[0]}.${ipParts[1]}.***.***`;
      }
    }

    return sanitized;
  }

  private determineGDPRCompliance(level: string, action: string, resource: string): boolean {
    // GDPR requires proper data handling
    if (resource.includes('personal') || resource.includes('user') || action.includes('delete')) {
      return level !== 'ERROR' && action !== 'unauthorized_access';
    }
    return true;
  }

  private determinePCICompliance(action: string, resource: string): boolean {
    // PCI compliance for payment operations
    if (resource.includes('payment') || resource.includes('card')) {
      return action.includes('encrypt') || action.includes('secure');
    }
    return true;
  }

  private determineAMLCompliance(action: string, resource: string): boolean {
    // AML compliance for financial operations
    if (resource.includes('transaction') || resource.includes('money')) {
      return action.includes('verify') || action.includes('check');
    }
    return true;
  }

  private determineRetentionPeriod(level: string, action: string): string {
    // Determine retention period based on data sensitivity
    if (level === 'SECURITY' || action.includes('breach')) {
      return '10 years';
    }
    if (action.includes('payment') || action.includes('financial')) {
      return '7 years';
    }
    if (action.includes('personal') || action.includes('gdpr')) {
      return '5 years';
    }
    return '3 years';
  }

  private determineCategory(
    action: string,
    resource: string
  ): AuditEntry['compliance']['category'] {
    if (action.includes('login') || action.includes('access')) {
      return 'security_event';
    }
    if (action.includes('check') && resource.includes('compliance')) {
      return 'compliance_check';
    }
    return 'user_action';
  }

  private logToConsole(entry: AuditEntry): void {
    const levelEmoji =
      {
        INFO: 'ℹ️',
        WARN: '⚠️',
        ERROR: '❌',
        SECURITY: '🔒',
        COMPLIANCE: '📋',
      }[entry.level] || '📝';

    const message = `${levelEmoji} [${entry.level}] ${entry.event}: ${entry.action} on ${entry.resource} - ${entry.result}`;

    switch (entry.level) {
      case 'ERROR':
      case 'SECURITY':
        console.error(message);
        break;
      case 'WARN':
        console.warn(message);
        break;
      default:
        console.log(message);
    }
  }

  private calculateSummary(entries: AuditEntry[]): ComplianceReport['summary'] {
    const summary = {
      totalEntries: entries.length,
      byLevel: {} as Record<string, number>,
      byResult: {} as Record<string, number>,
      complianceRate: 0,
      violations: 0,
    };

    for (const entry of entries) {
      // Count by level
      summary.byLevel[entry.level] = (summary.byLevel[entry.level] || 0) + 1;

      // Count by result
      summary.byResult[entry.result] = (summary.byResult[entry.result] || 0) + 1;

      // Count violations
      if (entry.result === 'FAILURE' || entry.level === 'ERROR' || entry.level === 'SECURITY') {
        summary.violations++;
      }
    }

    // Calculate compliance rate (successful entries / total entries)
    const successfulEntries = summary.byResult.SUCCESS || 0;
    summary.complianceRate = entries.length > 0 ? successfulEntries / entries.length : 0;

    return summary;
  }

  private checkFrameworkCompliance(framework: string, entries: AuditEntry[]): ComplianceStatus {
    const relevantEntries = entries.filter(entry => {
      switch (framework) {
        case 'GDPR':
          return entry.compliance.gdpr;
        case 'PCI':
          return entry.compliance.pci;
        case 'AML':
          return entry.compliance.aml;
        default:
          return false;
      }
    });

    const violations = relevantEntries.filter(
      entry => entry.result === 'FAILURE' || entry.level === 'ERROR'
    ).length;

    const score =
      relevantEntries.length > 0
        ? ((relevantEntries.length - violations) / relevantEntries.length) * 100
        : 100;

    let status: ComplianceStatus['status'];
    if (score >= 95) status = 'compliant';
    else if (score >= 80) status = 'partial';
    else status = 'non-compliant';

    return {
      status,
      score: Math.round(score),
      violations,
      lastCheck: new Date().toISOString(),
    };
  }

  private checkOverallCompliance(entries: AuditEntry[]): ComplianceStatus {
    const gdpr = this.checkFrameworkCompliance('GDPR', entries);
    const pci = this.checkFrameworkCompliance('PCI', entries);
    const aml = this.checkFrameworkCompliance('AML', entries);

    const averageScore = (gdpr.score + pci.score + aml.score) / 3;
    const totalViolations = gdpr.violations + pci.violations + aml.violations;

    let status: ComplianceStatus['status'];
    if (averageScore >= 90) status = 'compliant';
    else if (averageScore >= 70) status = 'partial';
    else status = 'non-compliant';

    return {
      status,
      score: Math.round(averageScore),
      violations: totalViolations,
      lastCheck: new Date().toISOString(),
    };
  }

  private generateComplianceRecommendations(
    entries: AuditEntry[],
    summary: ComplianceReport['summary']
  ): string[] {
    const recommendations: string[] = [];

    if (summary.complianceRate < 0.95) {
      recommendations.push('Improve overall compliance rate by addressing failed operations');
    }

    if (summary.violations > 10) {
      recommendations.push('Review and address high number of compliance violations');
    }

    if (summary.byLevel.ERROR > summary.byLevel.INFO) {
      recommendations.push('Investigate high error rate and improve system stability');
    }

    if (recommendations.length === 0) {
      recommendations.push('Compliance posture is strong - continue regular monitoring');
    }

    return recommendations;
  }

  private async sendToComplianceService(entry: AuditEntry): Promise<void> {
    try {
      await this.post('/api/v1/compliance/events', entry);
    } catch (error) {
      console.warn('⚠️ Failed to send to compliance service:', error);
    }
  }

  private async saveComplianceReport(report: ComplianceReport): Promise<void> {
    const reportPath = `./compliance-report-${Date.now()}.json`;
    await Bun.write(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Compliance report saved: ${reportPath}`);
  }
}

// Export singleton instance
export const complianceLogger = Fantasy42ComplianceLogger.getInstance();

// Export types
export type { AuditEntry, ComplianceReport, ComplianceStatus };
