/**
 * Fire22 Security Scanner
 * Advanced security scanning using Bun's native security features
 */

import { secrets } from 'bun';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import semver from 'semver';

export interface SecurityScanResult {
  vulnerabilities: Vulnerability[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  recommendations: string[];
  scannedAt: string;
  scanDuration: number;
}

export interface Vulnerability {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedPackages: string[];
  cve?: string;
  fixVersion?: string;
  recommendation: string;
}

export class Fire22SecurityScanner {
  private scanStartTime: number = 0;
  private knownVulnerabilities: Map<string, Vulnerability[]> = new Map();

  constructor() {
    this.initializeVulnerabilityDatabase();
  }

  /**
   * Initialize vulnerability database with known security issues
   */
  private initializeVulnerabilityDatabase() {
    // Critical vulnerabilities database
    this.knownVulnerabilities.set('lodash', [
      {
        id: 'FIRE22-SEC-001',
        title: 'Prototype Pollution in lodash',
        severity: 'high',
        description: 'Lodash versions before 4.17.12 are vulnerable to prototype pollution',
        affectedPackages: ['lodash'],
        cve: 'CVE-2019-10744',
        fixVersion: '4.17.12',
        recommendation: 'Upgrade lodash to version 4.17.12 or later',
      },
    ]);

    this.knownVulnerabilities.set('express', [
      {
        id: 'FIRE22-SEC-002',
        title: 'Open Redirect in Express',
        severity: 'medium',
        description: 'Express.js vulnerable to open redirect attacks',
        affectedPackages: ['express'],
        cve: 'CVE-2022-24999',
        fixVersion: '4.18.0',
        recommendation: 'Upgrade Express.js to latest version and validate redirects',
      },
    ]);

    this.knownVulnerabilities.set('jsonwebtoken', [
      {
        id: 'FIRE22-SEC-003',
        title: 'JWT Algorithm Confusion',
        severity: 'critical',
        description: 'JWT library vulnerable to algorithm confusion attacks',
        affectedPackages: ['jsonwebtoken'],
        cve: 'CVE-2022-23529',
        fixVersion: '9.0.0',
        recommendation: 'Upgrade jsonwebtoken and explicitly specify algorithm',
      },
    ]);
  }

  /**
   * Scan package.json dependencies for vulnerabilities
   */
  async scanDependencies(packageJsonPath: string): Promise<Vulnerability[]> {
    try {
      const packageJson = await Bun.file(packageJsonPath).json();
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const vulnerabilities: Vulnerability[] = [];

      for (const [packageName, version] of Object.entries(dependencies)) {
        const knownVulns = this.knownVulnerabilities.get(packageName);
        if (knownVulns) {
          for (const vuln of knownVulns) {
            if (this.isVersionVulnerable(version as string, vuln.fixVersion)) {
              vulnerabilities.push({
                ...vuln,
                affectedPackages: [`${packageName}@${version}`],
              });
            }
          }
        }
      }

      return vulnerabilities;
    } catch (error) {
      console.error(`Failed to scan dependencies: ${error}`);
      return [];
    }
  }

  /**
   * Check if version is vulnerable based on fix version
   */
  private isVersionVulnerable(currentVersion: string, fixVersion?: string): boolean {
    if (!fixVersion) return true;

    try {
      const cleanCurrent = semver.clean(currentVersion.replace(/[\^~]/, ''));
      const cleanFix = semver.clean(fixVersion);

      if (!cleanCurrent || !cleanFix) return true;

      return semver.lt(cleanCurrent, cleanFix);
    } catch {
      return true; // Assume vulnerable if version parsing fails
    }
  }

  /**
   * Scan for secrets and sensitive data in files
   */
  async scanSecrets(directory: string): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    const secretPatterns = [
      { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
      { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/g },
      { name: 'Private Key', pattern: /-----BEGIN (RSA )?PRIVATE KEY-----/g },
      { name: 'API Key', pattern: /api[_-]?key[_-]?[=:]\s*['"]\w+['"]/gi },
      { name: 'Database URL', pattern: /mongodb:\/\/.*|postgres:\/\/.*|mysql:\/\/.*/gi },
    ];

    try {
      const files = await this.getFiles(directory, ['.js', '.ts', '.json', '.env']);

      for (const filePath of files) {
        const content = await Bun.file(filePath).text();

        for (const { name, pattern } of secretPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            vulnerabilities.push({
              id: `FIRE22-SECRET-${name.replace(/\s+/g, '-').toUpperCase()}`,
              title: `Exposed ${name}`,
              severity: 'critical',
              description: `Found exposed ${name} in ${filePath}`,
              affectedPackages: [filePath],
              recommendation: `Remove ${name} from source code and use Bun.secrets for secure storage`,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Failed to scan secrets: ${error}`);
    }

    return vulnerabilities;
  }

  /**
   * Get all files with specific extensions from directory
   */
  private async getFiles(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...(await this.getFiles(fullPath, extensions)));
        } else if (entry.isFile()) {
          const ext = entry.name.substring(entry.name.lastIndexOf('.'));
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}: ${error}`);
    }

    return files;
  }

  /**
   * Scan file permissions and system security
   */
  async scanSystemSecurity(directory: string): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];

    try {
      const files = await this.getFiles(directory, ['.js', '.ts', '.sh', '.json']);

      for (const filePath of files) {
        const stats = await stat(filePath);
        const mode = stats.mode;

        // Check for world-writable files
        if ((mode & 0o002) !== 0) {
          vulnerabilities.push({
            id: 'FIRE22-PERM-001',
            title: 'World-writable file',
            severity: 'high',
            description: `File ${filePath} is world-writable`,
            affectedPackages: [filePath],
            recommendation: 'Remove world-write permissions: chmod o-w ' + filePath,
          });
        }

        // Check for executable scripts without proper shebang
        if (filePath.endsWith('.sh') && (mode & 0o111) !== 0) {
          const content = await Bun.file(filePath).text();
          if (!content.startsWith('#!')) {
            vulnerabilities.push({
              id: 'FIRE22-SCRIPT-001',
              title: 'Executable script without shebang',
              severity: 'medium',
              description: `Executable script ${filePath} missing shebang`,
              affectedPackages: [filePath],
              recommendation: 'Add proper shebang line to script',
            });
          }
        }
      }
    } catch (error) {
      console.error(`Failed to scan system security: ${error}`);
    }

    return vulnerabilities;
  }

  /**
   * Calculate overall security score
   */
  private calculateSecurityScore(vulnerabilities: Vulnerability[]): number {
    let score = 100;

    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Determine risk level based on vulnerabilities
   */
  private determineRiskLevel(
    vulnerabilities: Vulnerability[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const hasCritical = vulnerabilities.some(v => v.severity === 'critical');
    const hasHigh = vulnerabilities.some(v => v.severity === 'high');
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;

    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (mediumCount >= 3) return 'high';
    if (mediumCount > 0) return 'medium';

    return 'low';
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(vulnerabilities: Vulnerability[]): string[] {
    const recommendations = new Set<string>();

    recommendations.add(
      '🔐 Use Bun.secrets for credential storage instead of environment variables'
    );
    recommendations.add("🛡️ Enable Bun's built-in security scanner in bunfig.toml");
    recommendations.add('📦 Regularly update dependencies to latest versions');
    recommendations.add('🔍 Implement automated security scanning in CI/CD pipeline');

    if (vulnerabilities.some(v => v.severity === 'critical')) {
      recommendations.add('🚨 Address critical vulnerabilities immediately');
      recommendations.add('🔒 Review and rotate all API keys and secrets');
    }

    if (vulnerabilities.some(v => v.title.includes('Exposed'))) {
      recommendations.add('🗝️ Migrate exposed secrets to secure credential storage');
      recommendations.add('📝 Add .env files to .gitignore');
    }

    return Array.from(recommendations);
  }

  /**
   * Perform comprehensive security scan
   */
  async performSecurityScan(directory: string = process.cwd()): Promise<SecurityScanResult> {
    this.scanStartTime = Bun.nanoseconds();

    console.log('🔍 Starting Fire22 security scan...');

    const vulnerabilities: Vulnerability[] = [];

    // Scan package.json if it exists
    const packageJsonPath = join(directory, 'package.json');
    try {
      await stat(packageJsonPath);
      console.log('📦 Scanning dependencies...');
      vulnerabilities.push(...(await this.scanDependencies(packageJsonPath)));
    } catch {
      // package.json doesn't exist, skip dependency scan
    }

    // Scan for secrets
    console.log('🔐 Scanning for exposed secrets...');
    vulnerabilities.push(...(await this.scanSecrets(directory)));

    // Scan system security
    console.log('🛡️ Scanning system security...');
    vulnerabilities.push(...(await this.scanSystemSecurity(directory)));

    const scanEndTime = Bun.nanoseconds();
    const scanDuration = (scanEndTime - this.scanStartTime) / 1_000_000; // Convert to milliseconds

    const result: SecurityScanResult = {
      vulnerabilities,
      riskLevel: this.determineRiskLevel(vulnerabilities),
      score: this.calculateSecurityScore(vulnerabilities),
      recommendations: this.generateRecommendations(vulnerabilities),
      scannedAt: new Date().toISOString(),
      scanDuration,
    };

    console.log(`✅ Security scan completed in ${scanDuration.toFixed(2)}ms`);
    console.log(
      `📊 Security Score: ${result.score}/100 (Risk Level: ${result.riskLevel.toUpperCase()})`
    );
    console.log(`🔍 Found ${vulnerabilities.length} potential security issues`);

    return result;
  }

  /**
   * Store scan results securely using Bun.secrets
   */
  async storeSecureScanResults(scanResult: SecurityScanResult): Promise<void> {
    try {
      await secrets.set({
        service: 'fire22-security-scanner',
        name: `scan-result-${Date.now()}`,
        value: JSON.stringify(scanResult),
      });
      console.log('🔒 Scan results stored securely using Bun.secrets');
    } catch (error) {
      console.error('❌ Failed to store scan results:', error);
    }
  }

  /**
   * Retrieve stored scan results
   */
  async getStoredScanResults(): Promise<SecurityScanResult[]> {
    try {
      // Note: Bun.secrets doesn't have a list function, so this is a placeholder
      // In a real implementation, you'd need to track result keys separately
      console.log('🔍 Retrieving stored scan results...');
      return [];
    } catch (error) {
      console.error('❌ Failed to retrieve scan results:', error);
      return [];
    }
  }
}

// Export default scanner instance
export const fire22SecurityScanner = new Fire22SecurityScanner();

// CLI interface
if (import.meta.main) {
  const scanner = new Fire22SecurityScanner();
  const result = await scanner.performSecurityScan();

  if (result.vulnerabilities.length > 0) {
    console.log('\n🚨 SECURITY VULNERABILITIES FOUND:');
    for (const vuln of result.vulnerabilities) {
      console.log(`\n📍 ${vuln.title} (${vuln.severity.toUpperCase()})`);
      console.log(`   ${vuln.description}`);
      console.log(`   💡 ${vuln.recommendation}`);
    }
  }

  console.log('\n💡 RECOMMENDATIONS:');
  result.recommendations.forEach(rec => console.log(`   ${rec}`));

  // Store results securely
  await scanner.storeSecureScanResults(result);

  // Exit with appropriate code
  process.exit(result.riskLevel === 'critical' || result.riskLevel === 'high' ? 1 : 0);
}
