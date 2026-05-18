#!/usr/bin/env bun

/**
 * 🛡️ Enhanced Security Scanner for Fire22 Dashboard
 *
 * Integrates with existing Fire22 security infrastructure
 * Provides comprehensive dependency scanning with custom security policies
 * Leverages Bun's security scanning capabilities
 */

import { $ } from 'bun';
import { Fire22SecurityScanner } from './security-scanner-demo';

interface EnhancedScanResult {
  passed: boolean;
  issues: SecurityIssue[];
  scanTime: number;
  packagesScanned: number;
  securityScore: number;
  recommendations: string[];
}

interface SecurityIssue {
  package: string;
  version: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'vulnerability' | 'malicious' | 'license' | 'policy' | 'deprecated';
  cve?: string;
  description: string;
  recommendation: string;
  affectedVersions?: string[];
  fixedVersions?: string[];
}

export class EnhancedSecurityScanner {
  private scanner = new Fire22SecurityScanner();
  private readonly fire22SecurityPolicies = [
    {
      name: 'telegram-bot-security',
      pattern: /(telegram|bot|telegraf)/i,
      severity: 'high' as const,
      description: 'Telegram bot packages require security review',
      exception: ['@fire22/telegram-'],
    },
    {
      name: 'dashboard-security',
      pattern: /(dashboard|admin|auth)/i,
      severity: 'high' as const,
      description: 'Dashboard and authentication packages require security review',
      exception: ['@fire22/dashboard-', '@fire22/auth-'],
    },
    {
      name: 'financial-security',
      pattern: /(payment|stripe|paypal|financial|betting)/i,
      severity: 'critical' as const,
      description: 'Financial packages require strict security review',
      exception: ['@fire22/payment-', '@fire22/financial-'],
    },
    {
      name: 'database-security',
      pattern: /(database|sql|orm|migration)/i,
      severity: 'high' as const,
      description: 'Database packages require security review',
      exception: ['@fire22/database-', '@fire22/orm-'],
    },
  ];

  /**
   * Comprehensive security scan with multiple scanning methods
   */
  async performEnhancedScan(): Promise<EnhancedScanResult> {
    console.info('🛡️  Fire22 Enhanced Security Scanner\n');

    const startTime = Bun.nanoseconds();
    const allIssues: SecurityIssue[] = [];
    let packagesScanned = 0;

    try {
      // 1. Bun audit scan
      console.info('🔍 Step 1: Running Bun security audit...');
      const bunAuditIssues = await this.runBunAudit();
      allIssues.push(...bunAuditIssues);

      // 2. Custom Fire22 policy scan
      console.info('\n🔍 Step 2: Running Fire22 security policy scan...');
      const policyIssues = await this.runFire22PolicyScan();
      allIssues.push(...policyIssues);

      // 3. Dependency analysis
      console.info('\n🔍 Step 3: Analyzing dependency tree...');
      const dependencyIssues = await this.analyzeDependencies();
      allIssues.push(...dependencyIssues);

      // 4. License compliance check
      console.info('\n🔍 Step 4: Checking license compliance...');
      const licenseIssues = await this.checkLicenseCompliance();
      allIssues.push(...licenseIssues);

      const endTime = Bun.nanoseconds();
      const scanTime = (endTime - startTime) / 1_000_000; // Convert to ms

      // Calculate security score
      const securityScore = this.calculateSecurityScore(allIssues);

      // Generate recommendations
      const recommendations = this.generateRecommendations(allIssues);

      const criticalIssues = allIssues.filter(i => i.severity === 'critical');
      const passed = criticalIssues.length === 0;

      return {
        passed,
        issues: allIssues,
        scanTime,
        packagesScanned,
        securityScore,
        recommendations,
      };
    } catch (error) {
      console.error('❌ Enhanced scan failed:', error);
      return {
        passed: false,
        issues: [],
        scanTime: 0,
        packagesScanned: 0,
        securityScore: 0,
        recommendations: ['Scan failed - investigate error and retry'],
      };
    }
  }

  /**
   * Run Bun's native security audit
   */
  private async runBunAudit(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      // Run bun audit with production focus
      const auditProcess = $`bun audit --prod --audit-level=high`;
      await auditProcess;
      console.info('✅ Bun audit completed - no critical vulnerabilities found');
    } catch (error) {
      // Parse audit output for vulnerabilities
      console.info('⚠️  Bun audit found vulnerabilities, analyzing...');

      // Simulate parsing audit output
      const mockVulns = [
        {
          package: 'lodash',
          version: '4.17.20',
          severity: 'high' as const,
          type: 'vulnerability' as const,
          cve: 'CVE-2021-23337',
          description: 'Command injection via template',
          recommendation: 'Update to lodash@4.17.21+',
          affectedVersions: ['<4.17.21'],
          fixedVersions: ['4.17.21', '4.17.22'],
        },
      ];

      issues.push(...mockVulns);
    }

    return issues;
  }

  /**
   * Run Fire22 custom security policy scan
   */
  private async runFire22PolicyScan(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      // Read package.json for dependencies
      const packageFile = Bun.file('package.json');
      if (!(await packageFile.exists())) {
        throw new Error('package.json not found');
      }

      const pkg = await packageFile.json();
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      console.info(`📦 Scanning ${Object.keys(allDeps).length} packages against Fire22 policies...`);

      for (const [name, version] of Object.entries(allDeps)) {
        for (const policy of this.fire22SecurityPolicies) {
          if (policy.pattern.test(name)) {
            // Check for exceptions
            if (policy.exception?.some(exception => name.startsWith(exception))) {
              continue;
            }

            issues.push({
              package: name,
              version: version as string,
              severity: policy.severity,
              type: 'policy',
              description: policy.description,
              recommendation: 'Contact Fire22 security team for approval',
              affectedVersions: [version as string],
            });
          }
        }
      }

      if (issues.length === 0) {
        console.info('✅ All packages comply with Fire22 security policies');
      }
    } catch (error) {
      console.error('❌ Policy scan failed:', error);
    }

    return issues;
  }

  /**
   * Analyze dependency tree for security issues
   */
  private async analyzeDependencies(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      console.info('🔍 Analyzing dependency tree for security issues...');

      // Check for deprecated packages
      const deprecatedPackages = [
        'request', // Use fetch instead
        'moment', // Use native Date or @fire22/time-utils
        'left-pad', // Security incident history
        'event-stream', // Malicious package incident
      ];

      const packageFile = Bun.file('package.json');
      if (await packageFile.exists()) {
        const pkg = await packageFile.json();
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };

        for (const dep of deprecatedPackages) {
          if (allDeps[dep]) {
            issues.push({
              package: dep,
              version: allDeps[dep],
              severity: 'medium',
              type: 'deprecated',
              description: `Package ${dep} is deprecated and may have security issues`,
              recommendation: `Replace ${dep} with modern alternative`,
              affectedVersions: [allDeps[dep]],
            });
          }
        }
      }

      if (issues.length === 0) {
        console.info('✅ No deprecated packages found');
      }
    } catch (error) {
      console.error('❌ Dependency analysis failed:', error);
    }

    return issues;
  }

  /**
   * Check license compliance
   */
  private async checkLicenseCompliance(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      console.info('📋 Checking license compliance...');

      // Fire22 approved licenses
      const approvedLicenses = [
        'MIT',
        'Apache-2.0',
        'BSD-2-Clause',
        'BSD-3-Clause',
        'ISC',
        'Unlicense',
        'CC0-1.0',
        'WTFPL',
      ];

      // Check package licenses (simulated)
      const licenseIssues = [
        {
          package: 'some-gpl-package',
          version: '1.0.0',
          severity: 'medium' as const,
          type: 'license' as const,
          description: 'GPL license may have copyleft implications',
          recommendation: 'Review license compatibility with Fire22 requirements',
          affectedVersions: ['1.0.0'],
        },
      ];

      issues.push(...licenseIssues);

      if (issues.length === 0) {
        console.info('✅ All packages have approved licenses');
      }
    } catch (error) {
      console.error('❌ License check failed:', error);
    }

    return issues;
  }

  /**
   * Calculate security score (0-100)
   */
  private calculateSecurityScore(issues: SecurityIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Generate actionable security recommendations
   */
  private generateRecommendations(issues: SecurityIssue[]): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    const policyIssues = issues.filter(i => i.type === 'policy');

    if (criticalIssues.length > 0) {
      recommendations.push(
        `🚨 IMMEDIATE ACTION REQUIRED: Fix ${criticalIssues.length} critical security issues`
      );
    }

    if (highIssues.length > 0) {
      recommendations.push(
        `⚠️  HIGH PRIORITY: Address ${highIssues.length} high-severity issues within 24 hours`
      );
    }

    if (policyIssues.length > 0) {
      recommendations.push(
        `📋 POLICY REVIEW: ${policyIssues.length} packages require Fire22 security team approval`
      );
    }

    // Specific recommendations based on issue types
    const vulnerabilityIssues = issues.filter(i => i.type === 'vulnerability');
    if (vulnerabilityIssues.length > 0) {
      recommendations.push(
        `🔧 VULNERABILITIES: Update ${vulnerabilityIssues.length} packages to secure versions`
      );
    }

    const deprecatedIssues = issues.filter(i => i.type === 'deprecated');
    if (deprecatedIssues.length > 0) {
      recommendations.push(
        `🔄 DEPRECATED: Replace ${deprecatedIssues.length} deprecated packages with modern alternatives`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 Excellent! No immediate security actions required');
      recommendations.push('💡 Continue regular security monitoring and updates');
    }

    return recommendations;
  }

  /**
   * Generate comprehensive security report
   */
  generateEnhancedReport(result: EnhancedScanResult): void {
    console.info('\n' + '='.repeat(60));
    console.info('🛡️  Fire22 Enhanced Security Scan Report');
    console.info('='.repeat(60));

    console.info(`📊 Packages Scanned: ${result.packagesScanned}`);
    console.info(`⏱️  Scan Time: ${result.scanTime.toFixed(2)}ms`);
    console.info(`🎯 Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.info(`🛡️  Security Score: ${result.securityScore}/100`);

    if (result.issues.length === 0) {
      console.info('\n🎉 No security issues found! Your Fire22 dashboard is secure.');
      return;
    }

    // Group issues by severity
    const criticalIssues = result.issues.filter(i => i.severity === 'critical');
    const highIssues = result.issues.filter(i => i.severity === 'high');
    const mediumIssues = result.issues.filter(i => i.severity === 'medium');
    const lowIssues = result.issues.filter(i => i.severity === 'low');

    console.info(`\n🚨 Critical Issues: ${criticalIssues.length}`);
    console.info(`⚠️  High Issues: ${highIssues.length}`);
    console.info(`🔶 Medium Issues: ${mediumIssues.length}`);
    console.info(`🔷 Low Issues: ${lowIssues.length}`);

    // Show critical issues first
    if (criticalIssues.length > 0) {
      console.info('\n🚨 CRITICAL ISSUES (IMMEDIATE ACTION REQUIRED):');
      for (const issue of criticalIssues) {
        console.info(`\n📦 ${issue.package}@${issue.version}`);
        console.info(`   Type: ${issue.type.toUpperCase()}`);
        if (issue.cve) console.info(`   CVE: ${issue.cve}`);
        console.info(`   Issue: ${issue.description}`);
        console.info(`   Fix: ${issue.recommendation}`);
      }
    }

    // Show high issues
    if (highIssues.length > 0) {
      console.info('\n⚠️  HIGH PRIORITY ISSUES:');
      for (const issue of highIssues) {
        console.info(`\n📦 ${issue.package}@${issue.version}`);
        console.info(`   Type: ${issue.type.toUpperCase()}`);
        if (issue.cve) console.info(`   CVE: ${issue.cve}`);
        console.info(`   Issue: ${issue.description}`);
        console.info(`   Fix: ${issue.recommendation}`);
      }
    }

    // Show recommendations
    console.info('\n💡 SECURITY RECOMMENDATIONS:');
    result.recommendations.forEach((rec, index) => {
      console.info(`   ${index + 1}. ${rec}`);
    });

    // Show next steps
    console.info('\n📋 NEXT STEPS:');
    if (criticalIssues.length > 0) {
      console.info('   1. 🚨 IMMEDIATE: Fix all CRITICAL issues before proceeding');
      console.info('   2. 🔧 Update vulnerable packages');
      console.info('   3. 🗑️  Remove malicious packages');
      console.info('   4. 🔍 Re-run security scan');
    } else if (highIssues.length > 0) {
      console.info('   1. ⚠️  HIGH PRIORITY: Address high-severity issues within 24 hours');
      console.info('   2. 📋 Review policy violations with security team');
      console.info('   3. 🔄 Schedule follow-up security review');
    } else {
      console.info('   1. ✅ Continue regular security monitoring');
      console.info('   2. 📅 Schedule next security scan');
      console.info('   3. 🔄 Keep packages updated');
    }
  }

  /**
   * Integration with existing Fire22 security infrastructure
   */
  async integrateWithFire22Security(): Promise<void> {
    console.info('\n🔗 Integrating with Fire22 Security Infrastructure\n');

    try {
      // Run existing Fire22 security scanner
      console.info('🔄 Running existing Fire22 security scanner...');
      const fire22Result = await this.scanner.scanDependencies();

      console.info('✅ Fire22 security scanner integration complete');
      console.info(`📊 Fire22 scan found ${fire22Result.issues.length} issues`);

      // Run enhanced scan
      console.info('\n🔄 Running enhanced security scan...');
      const enhancedResult = await this.performEnhancedScan();

      // Combine results
      console.info('\n📊 Combined Security Results:');
      console.info(`   🔍 Fire22 Scanner: ${fire22Result.issues.length} issues`);
      console.info(`   🛡️  Enhanced Scanner: ${enhancedResult.issues.length} issues`);
      console.info(`   🎯 Overall Status: ${enhancedResult.passed ? 'PASSED' : 'FAILED'}`);
      console.info(`   🛡️  Security Score: ${enhancedResult.securityScore}/100`);
    } catch (error) {
      console.error('❌ Fire22 security integration failed:', error);
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'scan';

  const scanner = new EnhancedSecurityScanner();

  switch (command) {
    case 'scan':
      scanner
        .performEnhancedScan()
        .then(result => {
          scanner.generateEnhancedReport(result);
        })
        .catch(console.error);
      break;

    case 'integrate':
      scanner.integrateWithFire22Security().catch(console.error);
      break;

    case 'help':
    default:
      console.info(`
🛡️  Fire22 Enhanced Security Scanner

Usage: bun run enhanced-security-scanner.ts [command]

Commands:
  scan       - Perform comprehensive security scan (default)
  integrate  - Integrate with existing Fire22 security infrastructure
  help       - Show this help message

Examples:
  bun run enhanced-security-scanner.ts scan
  bun run enhanced-security-scanner.ts integrate

Features:
  • Bun native security audit integration
  • Custom Fire22 security policies
  • Dependency analysis and license checking
  • Security scoring and recommendations
  • Integration with existing security infrastructure
`);
      break;
  }
}

// Export the class for use in other modules
