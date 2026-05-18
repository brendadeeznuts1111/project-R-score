#!/usr/bin/env bun
/**
 * Security Report Generator
 * Generates comprehensive security reports from scan results
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

interface SecurityReport {
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalScans: number;
    environments: string[];
    complianceRate: number;
    averageRiskScore: number;
  };
  trends: {
    issuesOverTime: Array<{ date: string; fatal: number; warnings: number }>;
    riskScoreTrend: Array<{ date: string; score: number }>;
    packageHealth: Record<string, number>;
  };
  recommendations: string[];
  criticalIssues: Array<{
    date: string;
    package: string;
    issue: string;
    severity: string;
  }>;
}

// ============================================================================
// SECURITY REPORT GENERATOR
// ============================================================================

class SecurityReportGenerator {
  private logDirectory: string;

  constructor(logDirectory = './logs/security') {
    this.logDirectory = logDirectory;
  }

  /**
   * Generate comprehensive security report
   */
  async generateReport(): Promise<SecurityReport> {
    console.info('📊 Generating Security Report...');
    console.info('-'.repeat(40));

    const scanFiles = this.getScanFiles();
    const scanData = this.loadScanData(scanFiles);

    if (scanData.length === 0) {
      console.info('⚠️  No security scan data found');
      return this.createEmptyReport();
    }

    const report = this.analyzeScanData(scanData);
    await this.saveReport(report);

    this.displayReport(report);
    return report;
  }

  private getScanFiles(): string[] {
    if (!existsSync(this.logDirectory)) {
      console.info(`⚠️  Log directory not found: ${this.logDirectory}`);
      return [];
    }

    const files = readdirSync(this.logDirectory)
      .filter(file => extname(file) === '.json' && file.startsWith('security-scan-'))
      .sort()
      .reverse() // Most recent first
      .slice(0, 30); // Last 30 days

    return files.map(file => join(this.logDirectory, file));
  }

  private loadScanData(scanFiles: string[]): any[] {
    const scanData: any[] = [];

    for (const file of scanFiles) {
      try {
        const content = readFileSync(file, 'utf-8');
        const data = JSON.parse(content);
        scanData.push({
          ...data,
          _file: file,
          _date: new Date(data.metadata.timestamp),
        });
      } catch (error) {
        console.warn(`⚠️  Failed to parse scan file: ${file}`);
      }
    }

    return scanData.sort((a, b) => b._date.getTime() - a._date.getTime());
  }

  private analyzeScanData(scanData: any[]): SecurityReport {
    const startDate = scanData[scanData.length - 1]._date;
    const endDate = scanData[0]._date;

    // Calculate summary metrics
    const totalScans = scanData.length;
    const environments = [...new Set(scanData.map(s => s.metadata.environment))];
    const compliantScans = scanData.filter(s => s.compliance).length;
    const complianceRate = totalScans > 0 ? (compliantScans / totalScans) * 100 : 0;

    // Calculate average risk score
    const riskScores = scanData
      .map(s => this.calculateRiskScore(s.results))
      .filter(score => score !== null);
    const averageRiskScore =
      riskScores.length > 0
        ? riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length
        : 0;

    // Analyze trends
    const issuesOverTime = this.analyzeIssuesOverTime(scanData);
    const riskScoreTrend = this.analyzeRiskScoreTrend(scanData);
    const packageHealth = this.analyzePackageHealth(scanData);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      scanData,
      averageRiskScore,
      complianceRate
    );

    // Identify critical issues
    const criticalIssues = this.identifyCriticalIssues(scanData);

    return {
      generatedAt: new Date(),
      timeRange: { start: startDate, end: endDate },
      summary: {
        totalScans,
        environments,
        complianceRate: Math.round(complianceRate * 100) / 100,
        averageRiskScore: Math.round(averageRiskScore * 100) / 100,
      },
      trends: {
        issuesOverTime,
        riskScoreTrend,
        packageHealth,
      },
      recommendations,
      criticalIssues,
    };
  }

  private calculateRiskScore(results: any): number | null {
    if (!results || !results.summary) return null;

    const { fatalIssues, warningIssues, totalPackages } = results.summary;
    return Math.min(fatalIssues * 20 + warningIssues * 5 + totalPackages * 2, 100);
  }

  private analyzeIssuesOverTime(
    scanData: any[]
  ): Array<{ date: string; fatal: number; warnings: number }> {
    const dailyStats = new Map<string, { fatal: number; warnings: number; count: number }>();

    for (const scan of scanData) {
      const date = scan._date.toISOString().split('T')[0];
      const stats = dailyStats.get(date) || { fatal: 0, warnings: 0, count: 0 };

      if (scan.results?.summary) {
        stats.fatal += scan.results.summary.fatalIssues || 0;
        stats.warnings += scan.results.summary.warningIssues || 0;
        stats.count += 1;
      }

      dailyStats.set(date, stats);
    }

    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        fatal: Math.round(stats.fatal / stats.count),
        warnings: Math.round(stats.warnings / stats.count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private analyzeRiskScoreTrend(scanData: any[]): Array<{ date: string; score: number }> {
    return scanData
      .map(scan => ({
        date: scan._date.toISOString().split('T')[0],
        score: this.calculateRiskScore(scan.results) || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private analyzePackageHealth(scanData: any[]): Record<string, number> {
    const packageStats = new Map<string, { issues: number; scans: number }>();

    for (const scan of scanData) {
      if (scan.results?.issues) {
        for (const issue of scan.results.issues) {
          const stats = packageStats.get(issue.package) || { issues: 0, scans: 0 };
          stats.issues += 1;
          stats.scans += 1;
          packageStats.set(issue.package, stats);
        }
      }
    }

    const packageHealth: Record<string, number> = {};
    for (const [pkg, stats] of packageStats.entries()) {
      packageHealth[pkg] = Math.max(0, 100 - (stats.issues / stats.scans) * 100);
    }

    return packageHealth;
  }

  private generateRecommendations(
    scanData: any[],
    avgRiskScore: number,
    complianceRate: number
  ): string[] {
    const recommendations: string[] = [];

    if (avgRiskScore > 70) {
      recommendations.push('🚨 HIGH PRIORITY: Address critical vulnerabilities immediately');
    }

    if (complianceRate < 80) {
      recommendations.push('⚠️  IMPROVE COMPLIANCE: Review and fix security policy violations');
    }

    const recentFatalIssues = scanData
      .slice(0, 5)
      .filter(scan => (scan.results?.summary?.fatalIssues || 0) > 0);

    if (recentFatalIssues.length > 0) {
      recommendations.push('🔴 CRITICAL ISSUES: Review recent fatal security findings');
    }

    const unhealthyPackages = Object.entries(this.analyzePackageHealth(scanData))
      .filter(([, health]) => health < 60)
      .map(([pkg]) => pkg);

    if (unhealthyPackages.length > 0) {
      recommendations.push(
        `📦 UNHEALTHY PACKAGES: Consider replacing ${unhealthyPackages.join(', ')}`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ SECURITY STATUS GOOD: Continue regular monitoring');
    }

    return recommendations;
  }

  private identifyCriticalIssues(
    scanData: any[]
  ): Array<{ date: string; package: string; issue: string; severity: string }> {
    const criticalIssues: Array<{
      date: string;
      package: string;
      issue: string;
      severity: string;
    }> = [];

    for (const scan of scanData.slice(0, 10)) {
      // Last 10 scans
      if (scan.results?.issues) {
        for (const issue of scan.results.issues) {
          if (issue.severity === 'fatal') {
            criticalIssues.push({
              date: scan._date.toISOString().split('T')[0],
              package: issue.package,
              issue: issue.cve || issue.description,
              severity: issue.severity,
            });
          }
        }
      }
    }

    return criticalIssues.slice(0, 10); // Top 10 critical issues
  }

  private createEmptyReport(): SecurityReport {
    return {
      generatedAt: new Date(),
      timeRange: { start: new Date(), end: new Date() },
      summary: { totalScans: 0, environments: [], complianceRate: 0, averageRiskScore: 0 },
      trends: { issuesOverTime: [], riskScoreTrend: [], packageHealth: {} },
      recommendations: ['Run security scans to generate initial data'],
      criticalIssues: [],
    };
  }

  private async saveReport(report: SecurityReport): Promise<void> {
    const reportFile = join(this.logDirectory, 'security-report-latest.json');
    const timestampedFile = join(
      this.logDirectory,
      `security-report-${report.generatedAt.toISOString().split('T')[0]}.json`
    );

    const reportData = JSON.stringify(report, null, 2);
    await Bun.write(reportFile, reportData);
    await Bun.write(timestampedFile, reportData);

    console.info(`📝 Report saved to: ${reportFile}`);
  }

  private displayReport(report: SecurityReport): void {
    console.info('\n📊 Security Report Summary');
    console.info('='.repeat(50));

    console.info(`📅 Generated: ${report.generatedAt.toISOString()}`);
    console.info(
      `📆 Time Range: ${report.timeRange.start.toISOString().split('T')[0]} to ${report.timeRange.end.toISOString().split('T')[0]}`
    );

    console.info('\n📈 Summary:');
    console.info(`   🔍 Total Scans: ${report.summary.totalScans}`);
    console.info(`   🌍 Environments: ${report.summary.environments.join(', ')}`);
    console.info(`   📊 Compliance Rate: ${report.summary.complianceRate}%`);
    console.info(`   📈 Average Risk Score: ${report.summary.averageRiskScore}/100`);

    console.info('\n📋 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.info(`   ${index + 1}. ${rec}`);
    });

    if (report.criticalIssues.length > 0) {
      console.info('\n🚨 Recent Critical Issues:');
      report.criticalIssues.slice(0, 5).forEach((issue, index) => {
        console.info(`   ${index + 1}. ${issue.date}: ${issue.package} - ${issue.issue}`);
      });
    }

    console.info('\n📊 Trends:');
    if (report.trends.issuesOverTime.length > 0) {
      const latest = report.trends.issuesOverTime[report.trends.issuesOverTime.length - 1];
      console.info(
        `   📅 Latest: ${latest.date} - Fatal: ${latest.fatal}, Warnings: ${latest.warnings}`
      );
    }

    if (Object.keys(report.trends.packageHealth).length > 0) {
      const unhealthyCount = Object.values(report.trends.packageHealth).filter(
        health => health < 60
      ).length;
      console.info(`   📦 Unhealthy Packages: ${unhealthyCount}`);
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

/**
 * Generate and display security report
 */
async function generateSecurityReport(): Promise<void> {
  const generator = new SecurityReportGenerator();
  await generator.generateReport();
}

// Run if executed directly
if (import.meta.main) {
  await generateSecurityReport();
}

export { SecurityReportGenerator, generateSecurityReport };
