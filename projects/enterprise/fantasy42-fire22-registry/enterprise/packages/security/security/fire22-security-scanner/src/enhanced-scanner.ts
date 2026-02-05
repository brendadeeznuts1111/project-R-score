#!/usr/bin/env bun
/**
 * Enhanced Fire22 Enterprise Security Scanner
 * Advanced security scanner with configurable thresholds, exceptions, and logging
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Import security databases from the original scanner
const VULNERABILITY_DB: Record<string, any[]> = {
  lodash: [
    {
      severity: 'fatal',
      version: '<4.17.12',
      cve: 'CVE-2020-8203',
      description: 'Prototype pollution vulnerability in lodash',
      recommendation: 'Upgrade to lodash >= 4.17.12',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2020-8203',
    },
  ],
  axios: [
    {
      severity: 'warn',
      version: '<0.21.1',
      cve: 'CVE-2020-28168',
      description: 'Server-Side Request Forgery (SSRF) vulnerability',
      recommendation: 'Upgrade to axios >= 0.21.1',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2020-28168',
    },
  ],
};

const MALICIOUS_PACKAGES = new Set(['fake-package', 'malicious-lib', 'trojan-horse']);

const LICENSE_DB: Record<string, string[]> = {
  lodash: ['MIT'],
  axios: ['MIT'],
  react: ['MIT'],
  typescript: ['Apache-2.0'],
};

// ============================================================================
// ENHANCED TYPES AND INTERFACES
// ============================================================================

interface SecurityThresholds {
  maxFatalIssues: number;
  maxWarningIssues: number;
  maxRiskScore: number;
  maxVulnerabilityAge: number; // days
  requireLicenseInfo: boolean;
  blockUntrustedRegistries: boolean;
}

interface VulnerabilityException {
  cve?: string;
  package?: string;
  reason: string;
  approvedBy: string;
  expiresAt?: Date;
  riskAccepted: boolean;
}

interface ScanConfig {
  thresholds: SecurityThresholds;
  exceptions: VulnerabilityException[];
  enableLogging: boolean;
  logDirectory: string;
  ciMode: boolean;
  failOnThresholdExceeded: boolean;
  exportResults: boolean;
}

interface ScanMetadata {
  timestamp: Date;
  environment: string;
  triggeredBy: string;
  scanDuration: number;
  bunVersion: string;
}

interface HistoricalScan {
  metadata: ScanMetadata;
  results: ScanResult;
  thresholds: SecurityThresholds;
  compliance: boolean;
}

// ============================================================================
// CONFIGURABLE SECURITY THRESHOLDS
// ============================================================================

const DEFAULT_THRESHOLDS: SecurityThresholds = {
  maxFatalIssues: 0, // Zero tolerance for fatal issues
  maxWarningIssues: 5, // Allow up to 5 warnings
  maxRiskScore: 70, // Maximum acceptable risk score
  maxVulnerabilityAge: 90, // 90 days max age for vulnerabilities
  requireLicenseInfo: true, // Require license information
  blockUntrustedRegistries: true, // Block untrusted registries
};

// Environment-specific thresholds
const ENVIRONMENT_THRESHOLDS = {
  development: {
    ...DEFAULT_THRESHOLDS,
    maxFatalIssues: 2, // More lenient for development
    maxWarningIssues: 10,
    maxRiskScore: 80,
  },
  staging: {
    ...DEFAULT_THRESHOLDS,
    maxFatalIssues: 1, // Stricter for staging
    maxWarningIssues: 5,
    maxRiskScore: 75,
  },
  production: {
    ...DEFAULT_THRESHOLDS,
    maxFatalIssues: 0, // Zero tolerance for production
    maxWarningIssues: 0,
    maxRiskScore: 50,
  },
  ci: {
    ...DEFAULT_THRESHOLDS,
    maxFatalIssues: 0, // Strict CI checks
    maxWarningIssues: 3,
    maxRiskScore: 60,
  },
};

// ============================================================================
// VULNERABILITY EXCEPTIONS DATABASE
// ============================================================================

const VULNERABILITY_EXCEPTIONS: VulnerabilityException[] = [
  {
    cve: 'CVE-2020-8203',
    package: 'lodash',
    reason: 'Legacy dependency in existing codebase, upgrade planned for Q2',
    approvedBy: 'Security Team',
    expiresAt: new Date('2024-12-31'),
    riskAccepted: true,
  },
  {
    cve: 'CVE-2020-28168',
    package: 'axios',
    reason: 'Internal network isolation mitigates SSRF risk',
    approvedBy: 'DevOps Team',
    expiresAt: new Date('2024-10-15'),
    riskAccepted: true,
  },
  {
    package: 'old-internal-package',
    reason: 'Company-internal package with known issues, replacement in development',
    approvedBy: 'Architecture Team',
    riskAccepted: false,
  },
];

// ============================================================================
// ENHANCED SECURITY SCANNER CLASS
// ============================================================================

class EnhancedSecurityScanner {
  private config: ScanConfig;
  private scanMetadata: ScanMetadata;

  constructor(config: Partial<ScanConfig> = {}) {
    // Determine environment and set appropriate thresholds
    const environment = this.detectEnvironment();
    const baseThresholds = ENVIRONMENT_THRESHOLDS[environment] || DEFAULT_THRESHOLDS;

    this.config = {
      thresholds: { ...baseThresholds, ...config.thresholds },
      exceptions: [...VULNERABILITY_EXCEPTIONS, ...(config.exceptions || [])],
      enableLogging: config.enableLogging ?? true,
      logDirectory: config.logDirectory || './logs/security',
      ciMode: config.ciMode ?? this.isCiMode(),
      failOnThresholdExceeded: config.failOnThresholdExceeded ?? true,
      exportResults: config.exportResults ?? true,
    };

    this.scanMetadata = {
      timestamp: new Date(),
      environment,
      triggeredBy: process.env.USER || 'unknown',
      scanDuration: 0,
      bunVersion: Bun.version,
    };
  }

  /**
   * Main scanning function with enhanced features
   */
  async scan(packages: PackageInfo[]): Promise<void> {
    const scanStart = performance.now();

    console.log('🔍 Enhanced Fire22 Security Scanner');
    console.log('='.repeat(50));
    console.log(`   📊 Environment: ${this.scanMetadata.environment}`);
    console.log(`   🎯 CI Mode: ${this.config.ciMode ? 'Enabled' : 'Disabled'}`);
    console.log(
      `   📋 Thresholds: Fatal ≤ ${this.config.thresholds.maxFatalIssues}, Warnings ≤ ${this.config.thresholds.maxWarningIssues}`
    );
    console.log(`   📈 Max Risk Score: ${this.config.thresholds.maxRiskScore}`);

    const result = await this.performEnhancedScan(packages);

    this.scanMetadata.scanDuration = performance.now() - scanStart;

    // Check thresholds and handle exceptions
    const thresholdExceeded = this.checkThresholds(result);
    const hasValidExceptions = this.applyExceptions(result);

    // Display enhanced results
    this.displayEnhancedResults(result, thresholdExceeded, hasValidExceptions);

    // Logging and tracking
    if (this.config.enableLogging) {
      await this.logScanResults(result);
    }

    // CI/CD failure handling
    if (this.config.failOnThresholdExceeded && thresholdExceeded && !hasValidExceptions) {
      console.error(`\n🚫 SECURITY SCAN FAILED: Thresholds exceeded!`);
      console.error(`   Build will fail in CI/CD environment.`);
      process.exit(1);
    }

    if (hasValidExceptions) {
      console.log(
        `\n⚠️  SECURITY EXCEPTIONS APPLIED: Some issues were exempted based on approved exceptions.`
      );
      console.log(`   Review exception details above for justification.`);
    }
  }

  private async performEnhancedScan(packages: PackageInfo[]): Promise<ScanResult> {
    const issues: SecurityIssue[] = [];

    for (const pkg of packages) {
      // Enhanced vulnerability scanning with age checking
      if (this.config.thresholds.maxVulnerabilityAge) {
        const vulnIssues = this.scanVulnerabilitiesWithAge(pkg);
        issues.push(...vulnIssues);
      }

      // Enhanced malware scanning
      const malwareIssue = this.enhancedMalwareScan(pkg);
      if (malwareIssue) issues.push(malwareIssue);

      // Enhanced license checking
      if (this.config.thresholds.requireLicenseInfo) {
        const licenseIssue = this.enhancedLicenseCheck(pkg);
        if (licenseIssue) issues.push(licenseIssue);
      }

      // Registry validation with enhanced checking
      if (this.config.thresholds.blockUntrustedRegistries) {
        const registryIssue = this.enhancedRegistryValidation(pkg);
        if (registryIssue) issues.push(registryIssue);
      }
    }

    return {
      issues,
      summary: {
        totalPackages: packages.length,
        issuesFound: issues.length,
        fatalIssues: issues.filter(i => i.severity === 'fatal').length,
        warningIssues: issues.filter(i => i.severity === 'warn').length,
      },
    };
  }

  private scanVulnerabilitiesWithAge(pkg: PackageInfo): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const vulnerabilities = VULNERABILITY_DB[pkg.name] || [];

    for (const vuln of vulnerabilities) {
      if (this.isVersionVulnerable(pkg.version, vuln.version)) {
        // Check if vulnerability is too old (beyond threshold)
        const vulnAge = this.getVulnerabilityAge(vuln.cve);
        const isOldVuln = vulnAge > this.config.thresholds.maxVulnerabilityAge;

        issues.push({
          ...vuln,
          package: pkg.name,
          version: pkg.version,
          description: `${vuln.description}${isOldVuln ? ` (Age: ${vulnAge} days - exceeds ${this.config.thresholds.maxVulnerabilityAge} day threshold)` : ''}`,
          severity: isOldVuln ? 'warn' : vuln.severity,
        });
      }
    }

    return issues;
  }

  private enhancedMalwareScan(pkg: PackageInfo): SecurityIssue | null {
    if (MALICIOUS_PACKAGES.has(pkg.name)) {
      return {
        severity: 'fatal',
        package: pkg.name,
        version: pkg.version,
        description: 'Package flagged as potentially malicious - enhanced pattern detection',
        recommendation: 'Remove this package immediately and find a secure alternative',
      };
    }
    return null;
  }

  private enhancedLicenseCheck(pkg: PackageInfo): SecurityIssue | null {
    const licenses = LICENSE_DB[pkg.name];

    if (!licenses) {
      return {
        severity: 'warn',
        package: pkg.name,
        version: pkg.version,
        description: 'License information not available in enhanced license database',
        recommendation: 'Verify license compatibility manually and add to approved license list',
      };
    }

    const hasAllowedLicense = licenses.some(license =>
      this.config.thresholds.allowedLicenses?.some(allowed =>
        license.toLowerCase().includes(allowed.toLowerCase())
      )
    );

    if (!hasAllowedLicense) {
      return {
        severity: 'fatal',
        package: pkg.name,
        version: pkg.version,
        description: `License not in approved list: ${licenses.join(', ')}`,
        recommendation:
          'Choose a package with compatible licensing or add license to approved list',
      };
    }

    return null;
  }

  private enhancedRegistryValidation(pkg: PackageInfo): SecurityIssue | null {
    if (pkg.registry && !this.config.thresholds.trustedRegistries?.includes(pkg.registry)) {
      return {
        severity: 'fatal',
        package: pkg.name,
        version: pkg.version,
        description: `Package from untrusted registry: ${pkg.registry} (enhanced registry validation)`,
        recommendation: 'Use packages only from approved, trusted registries',
      };
    }
    return null;
  }

  private checkThresholds(result: ScanResult): boolean {
    const { summary } = result;

    return (
      summary.fatalIssues > this.config.thresholds.maxFatalIssues ||
      summary.warningIssues > this.config.thresholds.maxWarningIssues ||
      this.calculateOverallRiskScore(result) > this.config.thresholds.maxRiskScore
    );
  }

  private applyExceptions(result: ScanResult): boolean {
    let exceptionsApplied = false;

    result.issues = result.issues.filter(issue => {
      const exception = this.findApplicableException(issue);

      if (exception) {
        console.log(`   ⚠️  EXCEPTION APPLIED: ${issue.package}@${issue.version}`);
        console.log(`      📝 Reason: ${exception.reason}`);
        console.log(`      👤 Approved by: ${exception.approvedBy}`);
        if (exception.expiresAt) {
          console.log(`      ⏰ Expires: ${exception.expiresAt.toISOString().split('T')[0]}`);
        }
        exceptionsApplied = true;
        return false; // Remove from issues list
      }

      return true; // Keep in issues list
    });

    return exceptionsApplied;
  }

  private findApplicableException(issue: SecurityIssue): VulnerabilityException | null {
    return (
      this.config.exceptions.find(exception => {
        // Match by CVE ID
        if (exception.cve && issue.cve === exception.cve) {
          return true;
        }

        // Match by package name
        if (exception.package && issue.package === exception.package) {
          return true;
        }

        return false;
      }) || null
    );
  }

  private displayEnhancedResults(
    result: ScanResult,
    thresholdExceeded: boolean,
    exceptionsApplied: boolean
  ): void {
    console.log(`\n📊 Enhanced Security Scan Results:`);
    console.log(`   📦 Total packages: ${result.summary.totalPackages}`);
    console.log(`   🔍 Issues found: ${result.summary.issuesFound}`);
    console.log(`   🚨 Fatal issues: ${result.summary.fatalIssues}`);
    console.log(`   ⚠️  Warnings: ${result.summary.warningIssues}`);
    console.log(`   📊 Overall risk score: ${this.calculateOverallRiskScore(result)}/100`);

    if (thresholdExceeded) {
      console.log(`   🚫 THRESHOLDS EXCEEDED: Build will fail!`);
    } else {
      console.log(`   ✅ THRESHOLDS MET: Security requirements satisfied`);
    }

    if (result.issues.length > 0) {
      console.log(`\n🔍 Detailed Issues:`);

      result.issues.forEach((issue, index) => {
        const icon = issue.severity === 'fatal' ? '🚨' : '⚠️';
        console.log(`\n   ${index + 1}. ${icon} ${issue.package}@${issue.version}`);
        console.log(`      Severity: ${issue.severity.toUpperCase()}`);
        console.log(`      ${issue.description}`);
        if (issue.cve) console.log(`      CVE: ${issue.cve}`);
        if (issue.recommendation) console.log(`      💡 ${issue.recommendation}`);
        if (issue.url) console.log(`      🔗 ${issue.url}`);
      });
    } else {
      console.log(`\n✅ No security issues found!`);
    }

    console.log(`\n📈 Performance: ${this.scanMetadata.scanDuration.toFixed(2)}ms scan time`);
  }

  private calculateOverallRiskScore(result: ScanResult): number {
    let score = 0;

    // Fatal issues are high risk
    score += result.summary.fatalIssues * 20;

    // Warnings add moderate risk
    score += result.summary.warningIssues * 5;

    // Package count affects complexity
    score += Math.min(result.summary.totalPackages * 2, 20);

    return Math.min(score, 100);
  }

  private async logScanResults(result: ScanResult): Promise<void> {
    // Ensure log directory exists
    if (!existsSync(this.config.logDirectory)) {
      mkdirSync(this.config.logDirectory, { recursive: true });
    }

    const logFile = join(
      this.config.logDirectory,
      `security-scan-${this.scanMetadata.timestamp.toISOString().split('T')[0]}.json`
    );

    const historicalScan: HistoricalScan = {
      metadata: this.scanMetadata,
      results: result,
      thresholds: this.config.thresholds,
      compliance: !this.checkThresholds(result),
    };

    await Bun.write(logFile, JSON.stringify(historicalScan, null, 2));
    console.log(`   📝 Scan results logged to: ${logFile}`);
  }

  private detectEnvironment(): string {
    if (process.env.CI) return 'ci';
    if (process.env.NODE_ENV === 'production') return 'production';
    if (process.env.NODE_ENV === 'staging') return 'staging';
    return 'development';
  }

  private isCiMode(): boolean {
    return !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI);
  }

  private getVulnerabilityAge(cve?: string): number {
    // Mock implementation - in real scenario, this would query CVE database
    return cve ? Math.floor(Math.random() * 365) : 0;
  }

  private isVersionVulnerable(version: string, constraint: string): boolean {
    if (constraint.startsWith('<')) {
      const targetVersion = constraint.substring(1);
      return version < targetVersion;
    }
    return false;
  }
}

// ============================================================================
// ENHANCED SCANNER API
// ============================================================================

/**
 * Enhanced security scan with configurable thresholds and exceptions
 */
export async function enhancedScan(
  packages: PackageInfo[],
  config: Partial<ScanConfig> = {}
): Promise<void> {
  const scanner = new EnhancedSecurityScanner(config);
  await scanner.scan(packages);
}

/**
 * Get recommended thresholds for different environments
 */
export function getRecommendedThresholds(environment: string): SecurityThresholds {
  return ENVIRONMENT_THRESHOLDS[environment] || DEFAULT_THRESHOLDS;
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: Partial<ScanConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.thresholds) {
    const t = config.thresholds;
    if (t.maxFatalIssues < 0) errors.push('maxFatalIssues must be non-negative');
    if (t.maxWarningIssues < 0) errors.push('maxWarningIssues must be non-negative');
    if (t.maxRiskScore < 0 || t.maxRiskScore > 100)
      errors.push('maxRiskScore must be between 0-100');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// DEMO AND TESTING
// ============================================================================

/**
 * Demo the enhanced security scanner with configurable thresholds
 */
export async function runEnhancedDemo(): Promise<void> {
  console.log('🚀 Enhanced Fire22 Security Scanner Demo');
  console.log('='.repeat(60));

  const demoPackages: PackageInfo[] = [
    { name: 'react', version: '18.2.0' },
    { name: 'lodash', version: '4.17.10' }, // Will be flagged (exception applies)
    { name: 'axios', version: '0.20.0' }, // Will be flagged
    { name: 'typescript', version: '5.0.0' },
    { name: 'fake-package', version: '1.0.0' }, // Malicious
    {
      name: 'unknown-package',
      version: '1.0.0',
      registry: 'https://untrusted-registry.com',
    },
  ];

  console.log('🔧 Testing with different threshold configurations:');
  console.log(`   📦 Scanning ${demoPackages.length} packages`);

  // Test 1: Strict production thresholds
  console.log('\n🏭 PRODUCTION THRESHOLDS:');
  await enhancedScan(demoPackages, {
    thresholds: ENVIRONMENT_THRESHOLDS.production,
    enableLogging: false,
  });

  // Test 2: Lenient development thresholds
  console.log('\n🔧 DEVELOPMENT THRESHOLDS:');
  await enhancedScan(demoPackages, {
    thresholds: ENVIRONMENT_THRESHOLDS.development,
    enableLogging: false,
  });

  // Test 3: Custom thresholds with exceptions
  console.log('\n⚙️  CUSTOM THRESHOLDS WITH EXCEPTIONS:');
  await enhancedScan(demoPackages, {
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      maxFatalIssues: 1, // Allow 1 fatal issue
      maxWarningIssues: 10,
    },
    exceptions: VULNERABILITY_EXCEPTIONS,
    enableLogging: false,
  });

  console.log('\n🎉 Enhanced Security Scanner Demo Complete!');
  console.log('   ✅ Threshold-based scanning demonstrated');
  console.log('   ✅ Exception handling shown');
  console.log('   ✅ Environment-specific configurations tested');
}

// Run demo if this file is executed directly
if (import.meta.main) {
  await runEnhancedDemo();
}
