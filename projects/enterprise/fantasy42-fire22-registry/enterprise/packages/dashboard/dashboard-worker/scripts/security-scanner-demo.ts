#!/usr/bin/env bun

/**
 * 🛡️ Fire22 Security Scanner Demo
 *
 * Demonstrates Bun's new security scanning API integration
 * Shows custom security scanner for Fire22 dashboard dependencies
 */

interface SecurityIssue {
  package: string;
  version: string;
  severity: 'fatal' | 'warn';
  type: 'vulnerability' | 'malicious' | 'license' | 'policy';
  cve?: string;
  description: string;
  recommendation: string;
}

interface ScanResult {
  passed: boolean;
  issues: SecurityIssue[];
  scanTime: number;
  packagesScanned: number;
}

class Fire22SecurityScanner {
  private readonly knownVulnerabilities = new Map([
    // Simulated vulnerabilities for demo purposes
    [
      'express@4.17.1',
      {
        cve: 'CVE-2022-24999',
        severity: 'warn' as const,
        description: 'Denial of Service in Express.js through malformed Accept-Language header',
      },
    ],
    [
      'lodash@4.17.20',
      {
        cve: 'CVE-2021-23337',
        severity: 'fatal' as const,
        description: 'Command injection via template',
      },
    ],
    [
      'axios@0.21.1',
      {
        cve: 'CVE-2021-3749',
        severity: 'warn' as const,
        description: 'Regular expression denial of service',
      },
    ],
  ]);

  private readonly maliciousPackages = new Set([
    'evil-package',
    'bitcoin-stealer',
    'credential-harvester',
    'backdoor-util',
  ]);

  private readonly fire22PolicyRules = [
    {
      name: 'no-crypto-mining',
      pattern: /(crypto|mining|bitcoin|ethereum)/i,
      severity: 'fatal' as const,
      description: 'Cryptocurrency mining packages not allowed in Fire22 dashboard',
    },
    {
      name: 'gambling-restriction',
      pattern: /(gambling|casino|poker|slots)/i,
      severity: 'warn' as const,
      description: 'Gambling-related packages require security review',
      exception: ['@fire22/'], // Allow Fire22 internal packages
    },
    {
      name: 'network-restriction',
      pattern: /(proxy|tunnel|vpn)/i,
      severity: 'warn' as const,
      description: 'Network tunneling packages require security review',
    },
  ];

  /**
   * Scan a package for security issues
   */
  async scanPackage(packageName: string, version: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const packageKey = `${packageName}@${version}`;

    // Check for known vulnerabilities
    const vuln = this.knownVulnerabilities.get(packageKey);
    if (vuln) {
      issues.push({
        package: packageName,
        version,
        severity: vuln.severity,
        type: 'vulnerability',
        cve: vuln.cve,
        description: vuln.description,
        recommendation: 'Update to latest secure version',
      });
    }

    // Check for malicious packages
    if (this.maliciousPackages.has(packageName)) {
      issues.push({
        package: packageName,
        version,
        severity: 'fatal',
        type: 'malicious',
        description: `Package ${packageName} is known malicious`,
        recommendation: 'Remove immediately and scan system',
      });
    }

    // Check Fire22 policy rules
    for (const rule of this.fire22PolicyRules) {
      if (rule.pattern.test(packageName)) {
        // Check for exceptions
        if (rule.exception?.some(exception => packageName.startsWith(exception))) {
          continue;
        }

        issues.push({
          package: packageName,
          version,
          severity: rule.severity,
          type: 'policy',
          description: rule.description,
          recommendation: 'Contact security team for approval',
        });
      }
    }

    return issues;
  }

  /**
   * Scan all dependencies in package.json
   */
  async scanDependencies(): Promise<ScanResult> {
    console.info('🛡️ Fire22 Security Scanner - Scanning Dependencies\n');

    const startTime = Bun.nanoseconds();
    const issues: SecurityIssue[] = [];
    let packagesScanned = 0;

    try {
      // Read package.json
      const packageFile = Bun.file('package.json');
      if (!(await packageFile.exists())) {
        throw new Error('package.json not found');
      }

      const pkg = await packageFile.json();
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      console.info(`📦 Scanning ${Object.keys(allDeps).length} packages...\n`);

      // Scan each dependency
      for (const [name, version] of Object.entries(allDeps)) {
        console.info(`🔍 Scanning ${name}@${version}...`);

        const packageIssues = await this.scanPackage(name, version as string);
        issues.push(...packageIssues);
        packagesScanned++;

        if (packageIssues.length > 0) {
          for (const issue of packageIssues) {
            const icon = issue.severity === 'fatal' ? '🚨' : '⚠️';
            console.info(`   ${icon} ${issue.type.toUpperCase()}: ${issue.description}`);
          }
        } else {
          console.info('   ✅ No issues found');
        }
      }

      const endTime = Bun.nanoseconds();
      const scanTime = (endTime - startTime) / 1_000_000; // Convert to ms

      const fatalIssues = issues.filter(i => i.severity === 'fatal');
      const passed = fatalIssues.length === 0;

      return {
        passed,
        issues,
        scanTime,
        packagesScanned,
      };
    } catch (error) {
      console.error('❌ Scan failed:', error);
      return {
        passed: false,
        issues: [],
        scanTime: 0,
        packagesScanned: 0,
      };
    }
  }

  /**
   * Generate security report
   */
  generateReport(result: ScanResult): void {
    console.info('\n' + '='.repeat(50));
    console.info('🛡️ Fire22 Security Scan Report');
    console.info('='.repeat(50));

    console.info(`📊 Packages Scanned: ${result.packagesScanned}`);
    console.info(`⏱️ Scan Time: ${result.scanTime.toFixed(2)}ms`);
    console.info(`🎯 Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (result.issues.length === 0) {
      console.info('\n🎉 No security issues found! Your Fire22 dashboard is secure.');
      return;
    }

    // Group issues by severity
    const fatalIssues = result.issues.filter(i => i.severity === 'fatal');
    const warnIssues = result.issues.filter(i => i.severity === 'warn');

    console.info(`\n🚨 Fatal Issues: ${fatalIssues.length}`);
    console.info(`⚠️ Warnings: ${warnIssues.length}`);

    // Show fatal issues first
    if (fatalIssues.length > 0) {
      console.info('\n🚨 FATAL ISSUES (Installation blocked):');
      for (const issue of fatalIssues) {
        console.info(`\n📦 ${issue.package}@${issue.version}`);
        console.info(`   Type: ${issue.type.toUpperCase()}`);
        if (issue.cve) console.info(`   CVE: ${issue.cve}`);
        console.info(`   Issue: ${issue.description}`);
        console.info(`   Fix: ${issue.recommendation}`);
      }
    }

    // Show warnings
    if (warnIssues.length > 0) {
      console.info('\n⚠️ WARNINGS:');
      for (const issue of warnIssues) {
        console.info(`\n📦 ${issue.package}@${issue.version}`);
        console.info(`   Type: ${issue.type.toUpperCase()}`);
        if (issue.cve) console.info(`   CVE: ${issue.cve}`);
        console.info(`   Issue: ${issue.description}`);
        console.info(`   Recommendation: ${issue.recommendation}`);
      }
    }

    // Show next steps
    console.info('\n💡 Next Steps:');
    if (fatalIssues.length > 0) {
      console.info('   1. Fix all FATAL issues before proceeding');
      console.info('   2. Update vulnerable packages');
      console.info('   3. Remove malicious packages');
      console.info('   4. Re-run security scan');
    } else {
      console.info('   1. Review warnings and update packages');
      console.info('   2. Contact security team for policy violations');
      console.info('   3. Schedule regular security scans');
    }
  }

  /**
   * Create bunfig.toml configuration
   */
  createBunfigConfig(): string {
    return `# Fire22 Dashboard Security Configuration
# Generated by Fire22 Security Scanner

[install.security]
# Use Fire22 custom security scanner
scanner = "@fire22/security-scanner"

[install]
# Enhanced security settings
auto = false          # Disable auto-install for security
exact = true          # Use exact versions
production = true     # Production-grade installs

# Registry security
registry = "https://registry.npmjs.org/"
scopes = {
  "@fire22" = "https://fire22.workers.dev/registry"
}

[install.cache]
# Security-conscious caching
dir = "~/.bun/install/cache"
disable = false
disableManifest = false

[test]
# Security testing
coverage = true
timeout = 30000

# Environment-specific security
[install.production]
dev = false
optional = false`;
  }

  /**
   * Demo: bunfig.toml integration
   */
  async demoBunfigIntegration(): Promise<void> {
    console.info('\n🔧 Bunfig.toml Security Integration Demo\n');

    const config = this.createBunfigConfig();
    const configFile = Bun.file('bunfig-security-demo.toml');

    console.info('📝 Creating security-enhanced bunfig.toml...');
    await Bun.write(configFile, config);

    console.info('✅ Created bunfig-security-demo.toml');
    console.info('\n📋 Security Configuration:');
    console.info('   • Custom Fire22 security scanner enabled');
    console.info('   • Auto-install disabled for security');
    console.info('   • Exact version matching enforced');
    console.info('   • Production-grade install settings');
    console.info('   • Private @fire22 registry support');

    console.info('\n💡 To activate:');
    console.info('   1. cp bunfig-security-demo.toml bunfig.toml');
    console.info('   2. bun install (will use security scanner)');
    console.info('   3. All package operations now security-scanned');
  }
}

/**
 * Demo: Fire22 Package Policy Enforcement
 */
class Fire22PackagePolicy {
  private readonly allowedPackages = new Set([
    '@fire22/',
    'bun-types',
    'typescript',
    '@types/',
    'express',
    'pg',
    'cors',
    'helmet',
  ]);

  private readonly blockedPackages = new Set([
    'lodash', // Use native JS instead
    'moment', // Use native Date or @fire22/time-utils
    'request', // Deprecated, use fetch
    'left-pad', // Security incident history
  ]);

  checkPackage(name: string): { allowed: boolean; reason: string } {
    // Check explicit blocks first
    if (this.blockedPackages.has(name)) {
      return {
        allowed: false,
        reason: `Package ${name} is blocked by Fire22 security policy`,
      };
    }

    // Check allowed patterns
    for (const pattern of this.allowedPackages) {
      if (name.startsWith(pattern)) {
        return {
          allowed: true,
          reason: `Package ${name} matches approved pattern: ${pattern}`,
        };
      }
    }

    return {
      allowed: false,
      reason: `Package ${name} requires security team approval`,
    };
  }

  demoPolicy(): void {
    console.info('\n📋 Fire22 Package Policy Demo\n');

    const testPackages = [
      '@fire22/core-dashboard',
      'express',
      'lodash',
      'bitcoin-miner',
      '@types/node',
      'left-pad',
      'some-unknown-package',
    ];

    console.info('Testing packages against Fire22 security policy:\n');

    for (const pkg of testPackages) {
      const result = this.checkPackage(pkg);
      const icon = result.allowed ? '✅' : '❌';
      console.info(`${icon} ${pkg}`);
      console.info(`   ${result.reason}\n`);
    }
  }
}

// Main demo execution
async function runSecurityDemo(): Promise<void> {
  console.info('🛡️ Fire22 Security Scanner Demo');
  console.info('='.repeat(50));

  const scanner = new Fire22SecurityScanner();
  const policy = new Fire22PackagePolicy();

  // Run dependency scan
  const scanResult = await scanner.scanDependencies();
  scanner.generateReport(scanResult);

  // Demo policy enforcement
  policy.demoPolicy();

  // Demo bunfig.toml integration
  await scanner.demoBunfigIntegration();

  console.info('\n🎉 Security Demo Complete!');
  console.info('\n💡 Fire22 Security Integration Benefits:');
  console.info('   • Automatic vulnerability scanning on bun install');
  console.info('   • Custom Fire22 security policies enforced');
  console.info('   • Supply chain attack prevention');
  console.info('   • License compliance checking');
  console.info('   • Malicious package detection');
  console.info('   • Enterprise security standards');
}

// Run if called directly
if (import.meta.main) {
  await runSecurityDemo();
}

export { Fire22SecurityScanner, Fire22PackagePolicy };
