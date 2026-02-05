/**
 * Audit Logger - Comprehensive Audit Trail System
 * Enterprise-Grade Security & Compliance Logging
 */

export interface AuditLogEntry {
  action: string;
  timestamp: number;
  duration?: number;
  phone?: string;
  email?: string;
  address?: string;
  handle?: string;
  riskScore?: number;
  error?: string;
  [key: string]: any;
}

export interface ComplianceReportOptions {
  period: number; // days
  includeDetails: boolean;
}

export interface ComplianceReport {
  generatedAt: string;
  period: number;
  totalActions: number;
  actionsByType: Record<string, number>;
  averageRiskScore: number;
  highRiskEvents: number;
  errors: number;
  topUsers: Array<{
    identifier: string;
    actionCount: number;
    avgRiskScore: number;
  }>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  action?: string;
  startDate?: number;
  endDate?: number;
  minRiskScore?: number;
}

export class AuditLogger {
  private logs: AuditLogEntry[];
  private maxLogSize: number;
  private retentionPeriod: number; // in milliseconds

  constructor() {
    this.logs = [];
    this.maxLogSize = 10000;
    this.retentionPeriod = 90 * 24 * 60 * 60 * 1000; // 90 days
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    // Ensure timestamp
    if (!entry.timestamp) {
      entry.timestamp = Date.now();
    }

    // Add to logs
    this.logs.push(entry);

    // Maintain log size
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }

    // Clean old entries
    this.cleanOldEntries();

    // In production, would write to persistent storage
    console.log(`📝 AUDIT: ${entry.action} at ${new Date(entry.timestamp).toISOString()}`);
  }

  /**
   * Query audit logs
   */
  async query(options: QueryOptions = {}): Promise<AuditLogEntry[]> {
    let filteredLogs = [...this.logs];

    // Filter by action
    if (options.action) {
      filteredLogs = filteredLogs.filter(log => log.action === options.action);
    }

    // Filter by date range
    if (options.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.startDate);
    }

    if (options.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= options.endDate);
    }

    // Filter by risk score
    if (options.minRiskScore) {
      filteredLogs = filteredLogs.filter(log => 
        log.riskScore && log.riskScore >= options.minRiskScore
      );
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;

    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * Generate compliance report
   */
  async getComplianceReport(days: number, options: ComplianceReportOptions = {
    period: days,
    includeDetails: true
  }): Promise<ComplianceReport> {
    const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => log.timestamp >= startDate);

    const report: ComplianceReport = {
      generatedAt: new Date().toISOString(),
      period: days,
      totalActions: recentLogs.length,
      actionsByType: {},
      averageRiskScore: 0,
      highRiskEvents: 0,
      errors: 0,
      topUsers: []
    };

    // Analyze actions by type
    recentLogs.forEach(log => {
      report.actionsByType[log.action] = (report.actionsByType[log.action] || 0) + 1;
      
      if (log.riskScore) {
        report.averageRiskScore += log.riskScore;
        if (log.riskScore > 70) {
          report.highRiskEvents++;
        }
      }
      
      if (log.error) {
        report.errors++;
      }
    });

    // Calculate average risk score
    const riskEntries = recentLogs.filter(log => log.riskScore);
    if (riskEntries.length > 0) {
      report.averageRiskScore = report.averageRiskScore / riskEntries.length;
    }

    // Find top users (by phone/email/handle)
    const userStats = new Map<string, { count: number; totalRisk: number; riskEntries: number }>();

    recentLogs.forEach(log => {
      const identifier = log.phone || log.email || log.address || log.handle || 'unknown';
      const stats = userStats.get(identifier) || { count: 0, totalRisk: 0, riskEntries: 0 };
      
      stats.count++;
      if (log.riskScore) {
        stats.totalRisk += log.riskScore;
        stats.riskEntries++;
      }
      
      userStats.set(identifier, stats);
    });

    // Convert to array and sort
    report.topUsers = Array.from(userStats.entries())
      .map(([identifier, stats]) => ({
        identifier,
        actionCount: stats.count,
        avgRiskScore: stats.riskEntries > 0 ? stats.totalRisk / stats.riskEntries : 0
      }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);

    return report;
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(): Promise<{
    totalLogs: number;
    recentActivity: number;
    riskDistribution: Record<string, number>;
    errorRate: number;
  }> {
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => log.timestamp >= last24h);

    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    let errorCount = 0;

    recentLogs.forEach(log => {
      if (log.riskScore) {
        if (log.riskScore < 30) riskDistribution.low++;
        else if (log.riskScore < 50) riskDistribution.medium++;
        else if (log.riskScore < 70) riskDistribution.high++;
        else riskDistribution.critical++;
      }
      
      if (log.error) {
        errorCount++;
      }
    });

    return {
      totalLogs: this.logs.length,
      recentActivity: recentLogs.length,
      riskDistribution,
      errorRate: recentLogs.length > 0 ? errorCount / recentLogs.length : 0
    };
  }

  /**
   * Export logs to various formats
   */
  async export(format: 'json' | 'csv' | 'xml', options: QueryOptions = {}): Promise<string> {
    const logs = await this.query(options);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      
      case 'csv':
        return this.exportToCSV(logs);
      
      case 'xml':
        return this.exportToXML(logs);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Clear audit logs
   */
  async clear(before?: number): Promise<number> {
    if (!before) {
      const count = this.logs.length;
      this.logs = [];
      return count;
    }

    const originalLength = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp >= before);
    return originalLength - this.logs.length;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private cleanOldEntries(): void {
    const cutoffTime = Date.now() - this.retentionPeriod;
    const originalLength = this.logs.length;
    
    this.logs = this.logs.filter(log => log.timestamp >= cutoffTime);
    
    if (this.logs.length < originalLength) {
      console.log(`🧹 Cleaned ${originalLength - this.logs.length} old audit entries`);
    }
  }

  private exportToCSV(logs: AuditLogEntry[]): string {
    if (logs.length === 0) return '';

    const headers = Object.keys(logs[0]);
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = headers.map(header => {
        const value = log[header];
        if (value === undefined || value === null) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value.toString();
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  private exportToXML(logs: AuditLogEntry[]): string {
    const xmlEntries = logs.map(log => {
      const fields = Object.entries(log)
        .map(([key, value]) => `    <${key}>${this.escapeXML(value?.toString() || '')}</${key}>`)
        .join('\n');
      
      return `  <entry>\n${fields}\n  </entry>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<audit>
  <generated_at>${new Date().toISOString()}</generated_at>
  <total_entries>${logs.length}</total_entries>
  <entries>
${xmlEntries}
  </entries>
</audit>`;
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
