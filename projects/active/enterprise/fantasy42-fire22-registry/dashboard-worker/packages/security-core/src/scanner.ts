/**
 * @fire22/security-core/scanner - Package Security Scanner
 *
 * Vulnerability scanning and security policy enforcement for Fire22 packages
 */

import type {
  SecurityIssue,
  ScanResult,
  SecurityPolicy,
  ScannerError,
  SecuritySeverity,
} from './types';

export class Fire22SecurityScanner {
  private readonly knownVulnerabilities = new Map([
    [
      'express@4.17.1',
      {
        cve: 'CVE-2022-24999',
        severity: 'warn' as SecuritySeverity,
        description: 'Denial of Service in Express.js through malformed Accept-Language header',
      },
    ],
    [
      'lodash@4.17.20',
      {
        cve: 'CVE-2021-23337',
        severity: 'fatal' as SecuritySeverity,
        description: 'Command injection via template',
      },
    ],
  ]);

  private readonly fire22Policies: SecurityPolicy[] = [
    {
      name: 'no-crypto-mining',
      pattern: /(crypto|mining|bitcoin|ethereum)/i,
      severity: 'fatal',
      description: 'Cryptocurrency mining packages not allowed in Fire22 dashboard',
      enabled: true,
    },
    {
      name: 'gambling-restriction',
      pattern: /(gambling|casino|poker|slots)/i,
      severity: 'warn',
      description: 'Gambling-related packages require security review',
      exception: ['@fire22/'],
      enabled: true,
    },
  ];

  async scanDependencies(): Promise<ScanResult> {
    const startTime = Bun.nanoseconds();
    const issues: SecurityIssue[] = [];
    let packagesScanned = 0;

    try {
      const packageFile = Bun.file('package.json');
      if (!(await packageFile.exists())) {
        throw new Error('package.json not found');
      }

      const pkg = await packageFile.json();
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      for (const [name, version] of Object.entries(allDeps)) {
        const packageIssues = await this.scanPackage(name, version as string);
        issues.push(...packageIssues);
        packagesScanned++;
      }

      const endTime = Bun.nanoseconds();
      const scanTime = (endTime - startTime) / 1_000_000;

      const fatalCount = issues.filter(i => i.severity === 'fatal').length;
      const warnCount = issues.filter(i => i.severity === 'warn').length;

      return {
        passed: fatalCount === 0,
        issues,
        scanTime,
        packagesScanned,
        summary: {
          fatal: fatalCount,
          warn: warnCount,
          clean: packagesScanned - issues.length,
        },
      };
    } catch (error) {
      throw new Error(`Security scan failed: ${error}`);
    }
  }

  private async scanPackage(packageName: string, version: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const packageKey = `${packageName}@${version}`;

    // Skip Fire22 internal packages
    if (packageName.startsWith('@fire22/')) {
      return issues;
    }

    // Check vulnerabilities
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

    // Check policies
    for (const policy of this.fire22Policies) {
      if (!policy.enabled) continue;

      if (policy.pattern.test(packageName)) {
        if (policy.exception?.some(exception => packageName.startsWith(exception))) {
          continue;
        }

        issues.push({
          package: packageName,
          version,
          severity: policy.severity,
          type: 'policy',
          description: policy.description,
          recommendation: 'Contact security team for approval',
        });
      }
    }

    return issues;
  }
}

export class Fire22PackagePolicy {
  private readonly allowedPackages = new Set([
    '@fire22/',
    'bun-types',
    'typescript',
    '@types/',
    'express',
    'zod',
  ]);

  checkPackage(name: string): { allowed: boolean; reason: string } {
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
}
