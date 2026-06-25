#!/usr/bin/env bun
/**
 * Fire22 Enterprise Security Scanner
 * Custom security scanner for Bun package installations
 *
 * This scanner provides enterprise-grade security analysis including:
 * - Vulnerability scanning (CVEs)
 * - Malicious package detection
 * - License compliance checking
 * - Supply chain security validation
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface PackageInfo {
  name: string;
  version: string;
  registry?: string;
  integrity?: string;
  dependencies?: Record<string, string>;
}

interface SecurityIssue {
  severity: 'fatal' | 'warn';
  package: string;
  version: string;
  cve?: string;
  description: string;
  recommendation?: string;
  url?: string;
}

interface ScanResult {
  issues: SecurityIssue[];
  summary: {
    totalPackages: number;
    issuesFound: number;
    fatalIssues: number;
    warningIssues: number;
  };
}

interface ScannerConfig {
  level: 'fatal' | 'warn';
  enableVulnerabilityScan: boolean;
  enableMalwareScan: boolean;
  enableLicenseCheck: boolean;
  trustedRegistries: string[];
  blockedPackages: string[];
  allowedLicenses: string[];
}

// ============================================================================
// SECURITY DATABASE (Mock - Production would use real API)
// ============================================================================

const VULNERABILITY_DB: Record<string, SecurityIssue[]> = {
  lodash: [
    {
      severity: 'fatal',
      package: 'lodash',
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
      package: 'axios',
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
// FIRE22 SECURITY SCANNER IMPLEMENTATION
// ============================================================================

class Fire22SecurityScanner {
  private config: ScannerConfig;

  constructor(config: Partial<ScannerConfig> = {}) {
    this.config = {
      level: 'fatal',
      enableVulnerabilityScan: true,
      enableMalwareScan: true,
      enableLicenseCheck: true,
      trustedRegistries: ['https://registry.npmjs.org', 'https://npm.fire22.com'],
      blockedPackages: [],
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'],
      ...config,
    };
  }

  /**
   * Main scanning function called by Bun
   */
  async scan(packages: PackageInfo[]): Promise<void> {
    console.info(`🔍 Fire22 Security Scanner: Scanning ${packages.length} packages...`);

    const result = await this.performScan(packages);

    // Display results
    this.displayResults(result);

    // Handle issues based on severity
    const fatalIssues = result.issues.filter(issue => issue.severity === 'fatal');

    if (fatalIssues.length > 0) {
      console.error(`🚨 FATAL: ${fatalIssues.length} critical security issues found!`);
      throw new Error(`Security scan failed: ${fatalIssues.length} fatal issues detected`);
    }
  }

  private async performScan(packages: PackageInfo[]): Promise<ScanResult> {
    const issues: SecurityIssue[] = [];

    for (const pkg of packages) {
      // Vulnerability scanning
      if (this.config.enableVulnerabilityScan) {
        const vulnIssues = this.scanVulnerabilities(pkg);
        issues.push(...vulnIssues);
      }

      // Malware scanning
      if (this.config.enableMalwareScan) {
        const malwareIssue = this.scanMalware(pkg);
        if (malwareIssue) issues.push(malwareIssue);
      }

      // License compliance
      if (this.config.enableLicenseCheck) {
        const licenseIssue = this.scanLicense(pkg);
        if (licenseIssue) issues.push(licenseIssue);
      }

      // Registry validation
      const registryIssue = this.validateRegistry(pkg);
      if (registryIssue) issues.push(registryIssue);
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

  private scanVulnerabilities(pkg: PackageInfo): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const vulnerabilities = VULNERABILITY_DB[pkg.name] || [];

    for (const vuln of vulnerabilities) {
      if (this.isVersionVulnerable(pkg.version, vuln.version)) {
        issues.push({
          ...vuln,
          package: pkg.name,
          version: pkg.version,
        });
      }
    }

    return issues;
  }

  private scanMalware(pkg: PackageInfo): SecurityIssue | null {
    if (MALICIOUS_PACKAGES.has(pkg.name)) {
      return {
        severity: 'fatal',
        package: pkg.name,
        version: pkg.version,
        description: 'Package flagged as potentially malicious',
        recommendation: 'Remove this package and find an alternative',
      };
    }
    return null;
  }

  private scanLicense(pkg: PackageInfo): SecurityIssue | null {
    const licenses = LICENSE_DB[pkg.name];

    if (!licenses) {
      return {
        severity: 'warn',
        package: pkg.name,
        version: pkg.version,
        description: 'License information not available',
        recommendation: 'Verify license compatibility manually',
      };
    }

    const hasAllowedLicense = licenses.some(license =>
      this.config.allowedLicenses.some(allowed =>
        license.toLowerCase().includes(allowed.toLowerCase())
      )
    );

    if (!hasAllowedLicense) {
      return {
        severity: 'fatal',
        package: pkg.name,
        version: pkg.version,
        description: `License not in allowed list: ${licenses.join(', ')}`,
        recommendation: 'Choose a package with compatible licensing',
      };
    }

    return null;
  }

  private validateRegistry(pkg: PackageInfo): SecurityIssue | null {
    if (pkg.registry && !this.config.trustedRegistries.includes(pkg.registry)) {
      return {
        severity: 'fatal',
        package: pkg.name,
        version: pkg.version,
        description: `Package from untrusted registry: ${pkg.registry}`,
        recommendation: 'Use packages from trusted registries only',
      };
    }
    return null;
  }

  private displayResults(result: ScanResult): void {
    console.info(`\n📊 Security Scan Results:`);
    console.info(`   📦 Total packages: ${result.summary.totalPackages}`);
    console.info(`   🔍 Issues found: ${result.summary.issuesFound}`);
    console.info(`   🚨 Fatal issues: ${result.summary.fatalIssues}`);
    console.info(`   ⚠️  Warnings: ${result.summary.warningIssues}`);

    if (result.issues.length > 0) {
      console.info(`\n🔍 Detailed Issues:`);

      result.issues.forEach((issue, index) => {
        const icon = issue.severity === 'fatal' ? '🚨' : '⚠️';
        console.info(`\n   ${index + 1}. ${icon} ${issue.package}@${issue.version}`);
        console.info(`      Severity: ${issue.severity.toUpperCase()}`);
        console.info(`      ${issue.description}`);
        if (issue.cve) console.info(`      CVE: ${issue.cve}`);
        if (issue.recommendation) console.info(`      💡 ${issue.recommendation}`);
        if (issue.url) console.info(`      🔗 ${issue.url}`);
      });
    } else {
      console.info(`\n✅ No security issues found!`);
    }
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
// BUN SECURITY SCANNER API IMPLEMENTATION
// ============================================================================

/**
 * Main scanner function exported for Bun
 * This function is called by Bun during package installation
 */
export async function scan(packages: PackageInfo[]): Promise<void> {
  const scanner = new Fire22SecurityScanner({
    level: 'fatal',
    enableVulnerabilityScan: true,
    enableMalwareScan: true,
    enableLicenseCheck: true,
    trustedRegistries: ['https://registry.npmjs.org', 'https://npm.fire22.com'],
    blockedPackages: ['old-unsafe-package'],
    allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'],
  });

  await scanner.scan(packages);
}

/**
 * Demo function to test the security scanner
 */
export async function runDemo(): Promise<void> {
  console.info('🚀 Fire22 Security Scanner Demo');
  console.info('='.repeat(50));

  const demoPackages: PackageInfo[] = [
    { name: 'lodash', version: '4.17.10' }, // Vulnerable
    { name: 'axios', version: '0.20.0' }, // Vulnerable
    { name: 'react', version: '18.2.0' }, // Safe
    { name: 'fake-package', version: '1.0.0' }, // Malicious
    {
      name: 'unknown-package',
      version: '1.0.0',
      registry: 'https://untrusted-registry.com',
    }, // Untrusted registry
  ];

  console.info('🔍 Scanning demo packages...');
  console.info(`   Packages: ${demoPackages.map(p => p.name).join(', ')}`);

  try {
    await scan(demoPackages);
    console.info('\n✅ Demo completed successfully!');
  } catch (error) {
    console.info(`\n❌ Demo failed: ${error.message}`);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (import.meta.main) {
  await runDemo();
}
