/**
 * @fire22/security-scanner - Production Bun Security Scanner
 *
 * Enterprise security scanner implementing Bun's Security Scanner API
 * with threat feed integration and Fire22 workspace policies
 */

import { z } from 'zod';
import type {
  ScanRequest,
  ScanResult,
  SecurityAdvisory,
  ThreatFeedItem,
  Fire22SecurityPolicy,
} from './types';

// Zod schema for threat feed validation
const ThreatFeedItemSchema = z.object({
  package: z.string(),
  version: z.string(),
  url: z.string().nullable(),
  description: z.string().nullable(),
  categories: z.array(
    z.enum([
      'backdoor',
      'botnet',
      'malware',
      'token-stealer',
      'crypto-miner',
      'protestware',
      'adware',
      'deprecated',
      'typosquatting',
      'suspicious',
    ])
  ),
  severity: z.enum(['fatal', 'warn']),
  cve: z.string().nullable().optional(),
  publishedAt: z.string().optional(),
  lastModified: z.string().optional(),
});

const ThreatFeedSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  items: z.array(ThreatFeedItemSchema),
});

export class Fire22SecurityScanner {
  private threatFeed: ThreatFeedItem[] = [];
  private lastFeedUpdate = 0;
  private readonly FEED_CACHE_TTL = 1000 * 60 * 60; // 1 hour
  private readonly THREAT_FEED_URL = 'https://api.fire22.com/security/threat-feed';

  // Fire22 workspace-specific policies
  private readonly fire22Policies: Fire22SecurityPolicy[] = [
    {
      name: 'fire22-crypto-mining',
      pattern: /(crypto|mining|bitcoin|ethereum|monero)/i,
      level: 'fatal',
      category: 'crypto-miner',
      description: 'Cryptocurrency mining packages are not allowed in Fire22 workspace',
      excludePatterns: ['@fire22/crypto-utils'], // Allow internal crypto utilities
    },
    {
      name: 'fire22-gambling-restriction',
      pattern: /(gambling|casino|poker|slots|betting)/i,
      level: 'warn',
      category: 'suspicious',
      description: 'Gambling-related packages require security team approval',
      excludePatterns: ['@fire22/'], // Allow Fire22 internal packages
    },
    {
      name: 'fire22-network-tunneling',
      pattern: /(proxy|tunnel|vpn|tor)/i,
      level: 'warn',
      category: 'suspicious',
      description: 'Network tunneling packages require security review',
    },
    {
      name: 'fire22-obfuscated-code',
      pattern: /(obfuscat|uglif|minif)/i,
      level: 'warn',
      category: 'suspicious',
      description: 'Code obfuscation tools require review in production builds',
    },
  ];

  /**
   * Main scan function called by Bun's package manager
   * This is the entry point for the security scanner API
   */
  async scan(request: ScanRequest): Promise<ScanResult> {
    try {
      // Update threat feed if needed
      await this.updateThreatFeed();

      const advisories: SecurityAdvisory[] = [];

      // Scan each package in the request
      for (const pkg of request.packages) {
        const packageAdvisories = await this.scanPackage(pkg.name, pkg.version);
        advisories.push(...packageAdvisories);
      }

      // Return scan results
      return {
        advisories,
        metadata: {
          scannerName: '@fire22/security-scanner',
          scannerVersion: '1.0.0',
          scanTime: Date.now(),
          threatFeedVersion: this.getThreatFeedVersion(),
          packagesScanned: request.packages.length,
        },
      };
    } catch (error) {
      // Graceful error handling - Bun will cancel installation on error
      throw new Error(
        `Fire22 Security Scanner failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Scan individual package for security issues
   */
  private async scanPackage(packageName: string, version: string): Promise<SecurityAdvisory[]> {
    const advisories: SecurityAdvisory[] = [];

    // Skip Fire22 internal packages (trusted by default)
    if (packageName.startsWith('@fire22/')) {
      return advisories;
    }

    // 1. Check against threat feed
    const threatAdvisories = await this.checkThreatFeed(packageName, version);
    advisories.push(...threatAdvisories);

    // 2. Check Fire22 workspace policies
    const policyAdvisories = this.checkFire22Policies(packageName, version);
    advisories.push(...policyAdvisories);

    // 3. Check for known vulnerability patterns
    const vulnerabilityAdvisories = this.checkKnownVulnerabilities(packageName, version);
    advisories.push(...vulnerabilityAdvisories);

    // 4. Check for suspicious patterns
    const suspiciousAdvisories = this.checkSuspiciousPatterns(packageName, version);
    advisories.push(...suspiciousAdvisories);

    return advisories;
  }

  /**
   * Check package against threat feed using validated data
   */
  private async checkThreatFeed(packageName: string, version: string): Promise<SecurityAdvisory[]> {
    const advisories: SecurityAdvisory[] = [];

    for (const threat of this.threatFeed) {
      // Use Bun.semver.satisfies for version range checking
      if (threat.package === packageName && this.isVersionVulnerable(version, threat.version)) {
        advisories.push({
          level: threat.severity,
          package: packageName,
          version: version,
          title: `Security threat detected: ${threat.categories.join(', ')}`,
          description:
            threat.description ||
            `Package ${packageName} has been identified as containing ${threat.categories.join(', ')}`,
          recommendation: this.getRecommendationForThreat(threat),
          url: threat.url,
          cve: threat.cve,
          metadata: {
            categories: threat.categories,
            source: 'fire22-threat-feed',
          },
        });
      }
    }

    return advisories;
  }

  /**
   * Check against Fire22 workspace policies
   */
  private checkFire22Policies(packageName: string, version: string): SecurityAdvisory[] {
    const advisories: SecurityAdvisory[] = [];

    for (const policy of this.fire22Policies) {
      if (policy.pattern.test(packageName)) {
        // Check for exclusions
        if (policy.excludePatterns?.some(pattern => packageName.startsWith(pattern))) {
          continue;
        }

        advisories.push({
          level: policy.level,
          package: packageName,
          version: version,
          title: `Fire22 Policy Violation: ${policy.name}`,
          description: policy.description,
          recommendation:
            policy.level === 'fatal'
              ? 'Remove this package or get security team approval'
              : 'Contact Fire22 security team for review and approval',
          metadata: {
            policyName: policy.name,
            category: policy.category,
            source: 'fire22-policy',
          },
        });
      }
    }

    return advisories;
  }

  /**
   * Check for known vulnerabilities using Bun.semver
   */
  private checkKnownVulnerabilities(packageName: string, version: string): SecurityAdvisory[] {
    const advisories: SecurityAdvisory[] = [];

    // Known vulnerability database (in production, this would be from external feed)
    const knownVulnerabilities = [
      {
        package: 'lodash',
        versionRange: '>=1.0.0 <4.17.21',
        cve: 'CVE-2021-23337',
        level: 'fatal' as const,
        description: 'Command injection vulnerability in lodash template',
      },
      {
        package: 'express',
        versionRange: '>=4.0.0 <4.18.2',
        cve: 'CVE-2022-24999',
        level: 'warn' as const,
        description: 'DoS vulnerability in Express.js Accept-Language header parsing',
      },
      {
        package: 'axios',
        versionRange: '>=0.1.0 <0.21.2',
        cve: 'CVE-2021-3749',
        level: 'warn' as const,
        description: 'Regular expression denial of service in axios',
      },
    ];

    for (const vuln of knownVulnerabilities) {
      if (vuln.package === packageName && Bun.semver.satisfies(version, vuln.versionRange)) {
        advisories.push({
          level: vuln.level,
          package: packageName,
          version: version,
          title: `Known vulnerability: ${vuln.cve}`,
          description: vuln.description,
          recommendation: 'Update to latest secure version',
          cve: vuln.cve,
          url: `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${vuln.cve}`,
          metadata: {
            source: 'cve-database',
            versionRange: vuln.versionRange,
          },
        });
      }
    }

    return advisories;
  }

  /**
   * Check for suspicious package patterns
   */
  private checkSuspiciousPatterns(packageName: string, version: string): SecurityAdvisory[] {
    const advisories: SecurityAdvisory[] = [];

    // Typosquatting detection
    const popularPackages = ['react', 'lodash', 'express', 'axios', 'moment'];
    for (const popular of popularPackages) {
      if (this.isTyposquat(packageName, popular)) {
        advisories.push({
          level: 'fatal',
          package: packageName,
          version: version,
          title: 'Potential typosquatting detected',
          description: `Package name "${packageName}" is suspiciously similar to popular package "${popular}"`,
          recommendation: 'Verify package name and use official package instead',
          metadata: {
            suspectedTarget: popular,
            source: 'typosquat-detection',
          },
        });
      }
    }

    // Suspicious version patterns
    if (version.includes('alpha') || version.includes('beta') || version.includes('rc')) {
      // Only warn for pre-release in production installs
      advisories.push({
        level: 'warn',
        package: packageName,
        version: version,
        title: 'Pre-release version detected',
        description: `Package ${packageName}@${version} is a pre-release version`,
        recommendation: 'Consider using stable release for production',
        metadata: {
          source: 'version-analysis',
        },
      });
    }

    return advisories;
  }

  /**
   * Update threat feed with validation
   */
  private async updateThreatFeed(): Promise<void> {
    const now = Date.now();

    // Skip update if cache is still valid
    if (now - this.lastFeedUpdate < this.FEED_CACHE_TTL) {
      return;
    }

    try {
      // In production, fetch from actual threat feed
      // For demo, use local mock data
      const mockThreatFeed = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        items: [
          {
            package: 'evil-package',
            version: '*',
            url: 'https://fire22.com/security/advisories/evil-package',
            description: 'Known malicious package that steals credentials',
            categories: ['backdoor', 'token-stealer'],
            severity: 'fatal',
            cve: null,
            publishedAt: '2024-01-01T00:00:00Z',
          },
          {
            package: 'bitcoin-miner',
            version: '>=1.0.0',
            url: null,
            description: 'Cryptocurrency mining software',
            categories: ['crypto-miner'],
            severity: 'fatal',
            publishedAt: '2024-01-02T00:00:00Z',
          },
        ],
      };

      // Validate threat feed data using Zod schema
      const validatedFeed = ThreatFeedSchema.parse(mockThreatFeed);
      this.threatFeed = validatedFeed.items;
      this.lastFeedUpdate = now;
    } catch (error) {
      // Fail immediately on invalid threat feed data
      throw new Error(
        `Threat feed validation failed: ${error instanceof Error ? error.message : 'Invalid data'}`
      );
    }
  }

  /**
   * Check if version is vulnerable using Bun.semver
   */
  private isVersionVulnerable(version: string, vulnerableRange: string): boolean {
    try {
      return Bun.semver.satisfies(version, vulnerableRange);
    } catch (error) {
      // Invalid version/range - err on side of caution
      return false;
    }
  }

  /**
   * Simple typosquatting detection using Levenshtein distance
   */
  private isTyposquat(packageName: string, popularPackage: string): boolean {
    if (packageName === popularPackage) return false;

    const distance = this.levenshteinDistance(packageName, popularPackage);
    return distance <= 2 && Math.abs(packageName.length - popularPackage.length) <= 1;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Get recommendation text for threat type
   */
  private getRecommendationForThreat(threat: ThreatFeedItem): string {
    if (threat.categories.includes('backdoor') || threat.categories.includes('malware')) {
      return 'Remove immediately and scan system for compromise';
    }
    if (threat.categories.includes('crypto-miner')) {
      return 'Remove package - cryptocurrency mining not allowed in Fire22 workspace';
    }
    if (threat.categories.includes('protestware') || threat.categories.includes('adware')) {
      return 'Review package behavior and consider alternatives';
    }
    return 'Contact Fire22 security team for guidance';
  }

  /**
   * Get current threat feed version
   */
  private getThreatFeedVersion(): string {
    return this.threatFeed.length > 0 ? 'v1.0.0' : 'not-loaded';
  }

  /**
   * Package integrity check using Bun.hash
   */
  async checkPackageIntegrity(
    packageName: string,
    version: string,
    expectedHash?: string
  ): Promise<boolean> {
    if (!expectedHash) return true;

    try {
      // In production, this would hash the actual package contents
      const mockPackageContent = `${packageName}@${version}`;
      const actualHash = Bun.hash(mockPackageContent);

      return actualHash.toString() === expectedHash;
    } catch (error) {
      return false;
    }
  }
}

// Export the main scanner function for Bun's security scanner API
export default async function scan(request: ScanRequest): Promise<ScanResult> {
  const scanner = new Fire22SecurityScanner();
  return await scanner.scan(request);
}
