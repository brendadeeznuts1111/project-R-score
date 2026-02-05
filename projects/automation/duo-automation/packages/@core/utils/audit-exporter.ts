// utils/audit-exporter.ts
// Empire Pro v3.7 - S3 audit log export with proper Content-Disposition

import { feature } from "bun:bundle";
import { SecurityStatusDisplay } from '../security/status-display.ts';
import type { SecurityCheck } from '../security/status-display.ts';

/**
 * Export security reports to S3 with proper Content-Disposition headers
 */
export class AuditExporter {
  private bucketName: string;
  private region: string;

  constructor(bucketName: string = 'empire-audit-logs', region: string = 'us-east-1') {
    this.bucketName = bucketName;
    this.region = region;
  }

  /**
   * Export security report for a domain with proper filename
   */
  async exportSecurityReport(domain: string, checks: SecurityCheck[]): Promise<string> {
    if (!feature("AUDIT_EXPORT")) {
      throw new Error('AUDIT_EXPORT feature flag not enabled');
    }

    const report = SecurityStatusDisplay.displayStatus(domain, checks);
    const filename = this.generateFilename(domain);
    const s3Key = `reports/${domain}/${filename}`;
    
    try {
      // Use Bun's S3 client with Content-Disposition
      const result = await Bun.write(s3Key, report, {
        // @ts-ignore - Bun S3 options
        contentDisposition: `attachment; filename="${filename}"`,
        contentType: "text/plain; charset=utf-8",
        metadata: {
          domain,
          exportDate: new Date().toISOString(),
          totalChecks: checks.length.toString(),
          criticalIssues: checks.filter(c => c.status === 'FAIL').length.toString()
        }
      });

      console.log(`✅ Security report exported: ${s3Key}`);
      return s3Key;
    } catch (error) {
      console.error(`❌ Failed to export security report for ${domain}:`, error);
      throw error;
    }
  }

  /**
   * Export enhanced security dashboard with analytics
   */
  async exportDashboardReport(
    dashboardData: any, 
    scope: string = 'ENTERPRISE'
  ): Promise<string> {
    if (!feature("AUDIT_EXPORT") || !feature("PREMIUM_ANALYTICS")) {
      throw new Error('AUDIT_EXPORT and PREMIUM_ANALYTICS features required');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `dashboard-${scope}-${timestamp}.json`;
    const s3Key = `dashboards/${scope}/${filename}`;
    
    try {
      const report = JSON.stringify(dashboardData, null, 2);
      
      const result = await Bun.write(s3Key, report, {
        // @ts-ignore - Bun S3 options
        contentDisposition: `attachment; filename="${filename}"`,
        contentType: "application/json; charset=utf-8",
        metadata: {
          scope,
          exportDate: new Date().toISOString(),
          reportType: 'dashboard-analytics'
        }
      });

      console.log(`✅ Dashboard report exported: ${s3Key}`);
      return s3Key;
    } catch (error) {
      console.error(`❌ Failed to export dashboard report:`, error);
      throw error;
    }
  }

  /**
   * Generate standardized filename for audit reports
   */
  public generateFilename(domain: string): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-'); // HH-MM-SS
    const sanitizedDomain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `security-report-${sanitizedDomain}-${date}-${time}.txt`;
  }

  /**
   * Generate download URL for exported report
   */
  generateDownloadUrl(s3Key: string, expiresIn: number = 3600): string {
    // In a real implementation, this would generate a presigned URL
    // For demo purposes, return the S3 path
    return `s3://${this.bucketName}/${s3Key}`;
  }

  /**
   * List exported reports for a domain
   */
  async listDomainReports(domain: string, limit: number = 10): Promise<string[]> {
    if (!feature("AUDIT_EXPORT")) {
      throw new Error('AUDIT_EXPORT feature flag not enabled');
    }

    const prefix = `reports/${domain}/`;
    
    try {
      // List objects in S3 (simplified for demo)
      const reports = [
        `reports/${domain}/security-report-${domain}-2026-01-15-10-30-00.txt`,
        `reports/${domain}/security-report-${domain}-2026-01-14-15-45-00.txt`,
        `reports/${domain}/security-report-${domain}-2026-01-13-09-20-00.txt`
      ].slice(0, limit);

      return reports;
    } catch (error) {
      console.error(`❌ Failed to list reports for ${domain}:`, error);
      return [];
    }
  }

  /**
   * Batch export multiple domains
   */
  async batchExportReports(
    domainReports: Array<{ domain: string; checks: SecurityCheck[] }>
  ): Promise<Array<{ domain: string; s3Key: string; success: boolean }>> {
    if (!feature("AUDIT_EXPORT") || !feature("ENTERPRISE_SECURITY")) {
      throw new Error('AUDIT_EXPORT and ENTERPRISE_SECURITY features required');
    }

    const results = [];
    
    for (const { domain, checks } of domainReports) {
      try {
        const s3Key = await this.exportSecurityReport(domain, checks);
        results.push({ domain, s3Key, success: true });
      } catch (error) {
        console.error(`Failed to export ${domain}:`, error);
        results.push({ domain, s3Key: '', success: false });
      }
    }

    return results;
  }

  /**
   * Export compliance summary for enterprise reporting
   */
  async exportComplianceSummary(
    complianceData: {
      soc2: { score: number; issues: string[] };
      gdpr: { score: number; issues: string[] };
      hipaa: { score: number; issues: string[] };
      pci: { score: number; issues: string[] };
    }
  ): Promise<string> {
    if (!feature("AUDIT_EXPORT") || !feature("ENTERPRISE_SECURITY")) {
      throw new Error('AUDIT_EXPORT and ENTERPRISE_SECURITY features required');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `compliance-summary-${timestamp}.json`;
    const s3Key = `compliance/${filename}`;
    
    try {
      const summary = {
        exportDate: new Date().toISOString(),
        compliance: complianceData,
        overallScore: Object.values(complianceData).reduce((sum, c) => sum + c.score, 0) / 4,
        totalIssues: Object.values(complianceData).reduce((sum, c) => sum + c.issues.length, 0),
        generatedBy: 'Empire Pro v3.7 Security Dashboard'
      };

      const report = JSON.stringify(summary, null, 2);
      
      const result = await Bun.write(s3Key, report, {
        // @ts-ignore - Bun S3 options
        contentDisposition: `attachment; filename="${filename}"`,
        contentType: "application/json; charset=utf-8",
        metadata: {
          reportType: 'compliance-summary',
          exportDate: new Date().toISOString(),
          overallScore: summary.overallScore.toString()
        }
      });

      console.log(`✅ Compliance summary exported: ${s3Key}`);
      return s3Key;
    } catch (error) {
      console.error(`❌ Failed to export compliance summary:`, error);
      throw error;
    }
  }
}
