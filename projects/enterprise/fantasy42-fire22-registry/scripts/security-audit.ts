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
    console.log('🔍 Running vulnerability audit...');

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

      console.log(
        `✅ Bun audit completed: ${auditData.metadata.vulnerabilities.total} issues found`
      );
    } catch (error) {
      console.log('⚠️  Bun audit failed, trying npm audit...');
      try {
        const npmAuditOutput = await this.runCommand('npm', ['audit', '--json']);
        const npmAuditData = JSON.parse(npmAuditOutput);
        console.log(
          `✅ NPM audit completed: ${Object.keys(npmAuditData.vulnerabilities || {}).length} issues found`
        );
      } catch (npmError) {
        console.log('❌ Both Bun and NPM audit failed');
        this.reports.audit.issues.push('Unable to run dependency audit');
      }
    }
  }

  async scanWithSnyk(): Promise<void> {
    console.log('🔍 Running Snyk vulnerability scan...');

    if (!(await this.checkToolAvailability('snyk'))) {
      console.log('⚠️  Snyk not installed. Run: bun add -d snyk');
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

      console.log(
        `✅ Snyk scan completed: ${this.reports.vulnerabilities.total} vulnerabilities found`
      );
    } catch (error) {
      console.log('❌ Snyk scan failed');
      this.reports.audit.issues.push('Snyk scan encountered errors');
    }
  }

  async checkLicenses(): Promise<void> {
    console.log('🔍 Checking license compliance...');

    if (!(await this.checkToolAvailability('license-checker'))) {
      console.log('⚠️  license-checker not installed. Run: bun add -d license-checker');
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

      console.log(
        `✅ License check completed: ${Object.keys(licenseData).length} packages analyzed`
      );
      console.log(`📊 License summary: ${JSON.stringify(this.reports.licenses.summary, null, 2)}`);
    } catch (error) {
      console.log('❌ License check failed');
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
    console.log(`📄 Security report saved to: ${reportFile}`);

    // Generate summary
    console.log('\n📊 Security Audit Summary');
    console.log('========================');

    console.log(`🔍 Vulnerabilities Found: ${this.reports.vulnerabilities.total}`);
    console.log(`   - Critical: ${this.reports.vulnerabilities.critical}`);
    console.log(`   - High: ${this.reports.vulnerabilities.high}`);
    console.log(`   - Moderate: ${this.reports.vulnerabilities.moderate}`);
    console.log(`   - Low: ${this.reports.vulnerabilities.low}`);

    console.log(
      `📋 License Compliance: ${this.reports.licenses.compliant ? '✅ PASS' : '❌ FAIL'}`
    );
    if (this.reports.licenses.violations.length > 0) {
      console.log(`   Violations: ${this.reports.licenses.violations.join(', ')}`);
    }

    console.log(`🔒 Audit Status: ${this.reports.audit.passed ? '✅ PASS' : '❌ ISSUES FOUND'}`);
    if (this.reports.audit.issues.length > 0) {
      this.reports.audit.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    if (this.reports.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.reports.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
  }

  async runFullAudit(): Promise<void> {
    console.log('🚀 Starting Fantasy42-Fire22 Security Audit');
    console.log('==========================================');

    try {
      await this.auditVulnerabilities();
      await this.scanWithSnyk();
      await this.checkLicenses();
      await this.generateReport();

      console.log('\n🎉 Security audit completed successfully!');
    } catch (error) {
      console.error('❌ Security audit failed:', error);
      process.exit(1);
    }
  }
}

// Main execution
const auditor = new SecurityAuditor();
auditor.runFullAudit();
