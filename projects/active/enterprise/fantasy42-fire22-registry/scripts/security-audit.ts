#!/usr/bin/env bun

// Fantasy42-Fire22 Security Audit Script
// Performs comprehensive security scanning using external tools

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface SecurityReport {
  timestamp: string;
  vulnerabilities: {
    total: number;
    high: number;
    moderate: number;
    low: number;
    critical: number;
  };
  licenses: {
    compliant: boolean;
    violations: string[];
    summary: Record<string, number>;
  };
  audit: {
    passed: boolean;
    issues: string[];
  };
  recommendations: string[];
}

class SecurityAuditor {
  private reports: SecurityReport;

  constructor() {
    this.reports = {
      timestamp: new Date().toISOString(),
      vulnerabilities: { total: 0, high: 0, moderate: 0, low: 0, critical: 0 },
      licenses: { compliant: true, violations: [], summary: {} },
      audit: { passed: true, issues: [] },
      recommendations: [],
    };
  }

  private async runCommand(command: string, args: string[] = []): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', data => {
        stdout += data.toString();
      });

      child.stderr.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${stderr}`));
        }
      });

      child.on('error', error => {
        reject(error);
      });
    });
  }

  private async checkToolAvailability(tool: string): Promise<boolean> {
    try {
      await this.runCommand('which', [tool]);
      return true;
    } catch {
      return false;
    }
  }

  async auditVulnerabilities(): Promise<void> {
    console.info('🔍 Running vulnerability audit...');

    try {
      // Use Bun's native audit command
      const auditOutput = await this.runCommand('bun', ['audit', '--json']);
      const auditData = JSON.parse(auditOutput);

      // Process audit results
      this.reports.audit.passed = auditData.metadata.vulnerabilities.total === 0;

      if (!this.reports.audit.passed) {
        this.reports.audit.issues.push(
          `Found ${auditData.metadata.vulnerabilities.total} vulnerabilities`
        );
      }

      console.info(
        `✅ Bun audit completed: ${auditData.metadata.vulnerabilities.total} issues found`
      );
    } catch (error) {
      console.info('⚠️  Bun audit failed, trying npm audit...');
      try {
        const npmAuditOutput = await this.runCommand('npm', ['audit', '--json']);
        const npmAuditData = JSON.parse(npmAuditOutput);
        console.info(
          `✅ NPM audit completed: ${Object.keys(npmAuditData.vulnerabilities || {}).length} issues found`
        );
      } catch (npmError) {
        console.info('❌ Both Bun and NPM audit failed');
        this.reports.audit.issues.push('Unable to run dependency audit');
      }
    }
  }

  async scanWithSnyk(): Promise<void> {
    console.info('🔍 Running Snyk vulnerability scan...');

    if (!(await this.checkToolAvailability('snyk'))) {
      console.info('⚠️  Snyk not installed. Run: bun add -d snyk');
      this.reports.recommendations.push('Install Snyk: bun add -d snyk');
      return;
    }

    try {
      const snykOutput = await this.runCommand('snyk', ['test', '--json']);
      const snykData = JSON.parse(snykOutput);

      // Process Snyk results
      if (snykData.vulnerabilities) {
        this.reports.vulnerabilities.total = snykData.vulnerabilities.length;

        snykData.vulnerabilities.forEach((vuln: any) => {
          const severity = vuln.severity.toLowerCase();
          if (
            this.reports.vulnerabilities[severity as keyof typeof this.reports.vulnerabilities] !==
            undefined
          ) {
            this.reports.vulnerabilities[severity as keyof typeof this.reports.vulnerabilities]++;
          }
        });
      }

      console.info(
        `✅ Snyk scan completed: ${this.reports.vulnerabilities.total} vulnerabilities found`
      );
    } catch (error) {
      console.info('❌ Snyk scan failed');
      this.reports.audit.issues.push('Snyk scan encountered errors');
    }
  }

  async checkLicenses(): Promise<void> {
    console.info('🔍 Checking license compliance...');

    if (!(await this.checkToolAvailability('license-checker'))) {
      console.info('⚠️  license-checker not installed. Run: bun add -d license-checker');
      this.reports.recommendations.push('Install license-checker: bun add -d license-checker');
      return;
    }

    try {
      const licenseOutput = await this.runCommand('license-checker', ['--json']);
      const licenseData = JSON.parse(licenseOutput);

      // Process license results
      this.reports.licenses.summary = {};

      Object.values(licenseData).forEach((pkg: any) => {
        const license = pkg.licenses;
        this.reports.licenses.summary[license] = (this.reports.licenses.summary[license] || 0) + 1;

        // Check for problematic licenses
        const problematicLicenses = ['GPL-3.0', 'AGPL-3.0', 'LGPL-3.0'];
        if (problematicLicenses.some(prob => license.includes(prob))) {
          this.reports.licenses.violations.push(`${pkg.name}: ${license}`);
          this.reports.licenses.compliant = false;
        }
      });

      console.info(
        `✅ License check completed: ${Object.keys(licenseData).length} packages analyzed`
      );
      console.info(`📊 License summary: ${JSON.stringify(this.reports.licenses.summary, null, 2)}`);
    } catch (error) {
      console.info('❌ License check failed');
      this.reports.audit.issues.push('License compliance check encountered errors');
    }
  }

  async generateReport(): Promise<void> {
    const reportPath = path.join(process.cwd(), 'security-reports');
    const reportFile = path.join(
      reportPath,
      `security-audit-${new Date().toISOString().split('T')[0]}.json`
    );

    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
    try {
      // Create reports directory if it doesn't exist
      await Bun.write(path.join(reportPath, '.gitkeep'), '');
    } catch (error) {
      // Directory creation handled by Bun.write
    }

    // Write the report using Bun's optimized file writing
    await Bun.write(reportFile, JSON.stringify(this.reports, null, 2));
    console.info(`📄 Security report saved to: ${reportFile}`);

    // Generate summary
    console.info('\n📊 Security Audit Summary');
    console.info('========================');

    console.info(`🔍 Vulnerabilities Found: ${this.reports.vulnerabilities.total}`);
    console.info(`   - Critical: ${this.reports.vulnerabilities.critical}`);
    console.info(`   - High: ${this.reports.vulnerabilities.high}`);
    console.info(`   - Moderate: ${this.reports.vulnerabilities.moderate}`);
    console.info(`   - Low: ${this.reports.vulnerabilities.low}`);

    console.info(
      `📋 License Compliance: ${this.reports.licenses.compliant ? '✅ PASS' : '❌ FAIL'}`
    );
    if (this.reports.licenses.violations.length > 0) {
      console.info(`   Violations: ${this.reports.licenses.violations.join(', ')}`);
    }

    console.info(`🔒 Audit Status: ${this.reports.audit.passed ? '✅ PASS' : '❌ ISSUES FOUND'}`);
    if (this.reports.audit.issues.length > 0) {
      this.reports.audit.issues.forEach(issue => console.info(`   - ${issue}`));
    }

    if (this.reports.recommendations.length > 0) {
      console.info('\n💡 Recommendations:');
      this.reports.recommendations.forEach(rec => console.info(`   • ${rec}`));
    }
  }

  async runFullAudit(): Promise<void> {
    console.info('🚀 Starting Fantasy42-Fire22 Security Audit');
    console.info('==========================================');

    try {
      await this.auditVulnerabilities();
      await this.scanWithSnyk();
      await this.checkLicenses();
      await this.generateReport();

      console.info('\n🎉 Security audit completed successfully!');
    } catch (error) {
      console.error('❌ Security audit failed:', error);
      process.exit(1);
    }
  }
}

// Main execution
const auditor = new SecurityAuditor();
auditor.runFullAudit();
