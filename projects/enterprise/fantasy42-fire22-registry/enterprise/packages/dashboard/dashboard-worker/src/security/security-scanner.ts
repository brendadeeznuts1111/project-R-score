/**
 * Fire22 Security Scanner Implementation
 *
 * Enterprise-grade security scanning for packages and content
 * with vulnerability detection, malware scanning, and secrets detection
 */

import { Database } from 'bun:sqlite';
import { createHash } from 'crypto';

interface ScannerConfig {
  vuln: {
    database: string;
    updateFrequency?: number;
  };
  malware: {
    enabled: boolean;
    signatures?: string[];
  };
  secrets: {
    patterns: RegExp[];
    customPatterns?: Record<string, RegExp>;
  };
  deps: {
    checkTransitive: boolean;
    maxDepth?: number;
  };
}

interface PackageInfo {
  name: string;
  version: string;
  content?: any;
  dependencies?: Record<string, string>;
  path?: string;
}

interface SecurityScanResult {
  scanId: string;
  packageName: string;
  packageVersion: string;
  timestamp: Date;
  scanDuration: number;
  securityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  findings: {
    vulnerabilities?: any[];
    malware?: any[];
    secrets?: any[];
    dependencies?: any[];
  };
  recommendations: string[];
  complianceStatus: Record<string, boolean>;
  actionRequired: string;
}

interface VulnerabilityDatabase {
  queryPackage(name: string, version: string): Promise<any[]>;
  updateDatabase(): Promise<void>;
}

export class Fire22SecurityScanner {
  private config: ScannerConfig;
  private vulnDB: Database;
  private scanCache: Map<string, SecurityScanResult>;

  constructor(config: ScannerConfig) {
    this.config = config;
    this.vulnDB = new Database('vulnerabilities.db');
    this.scanCache = new Map();

    this.initializeDatabase();
  }

  private initializeDatabase() {
    // Create vulnerability database tables
    this.vulnDB.exec(`
      CREATE TABLE IF NOT EXISTS vulnerabilities (
        id TEXT PRIMARY KEY,
        package_name TEXT NOT NULL,
        affected_versions TEXT NOT NULL,
        fixed_version TEXT,
        severity TEXT NOT NULL,
        cve_id TEXT,
        description TEXT,
        exploit_available BOOLEAN DEFAULT 0,
        published_date INTEGER,
        updated_date INTEGER
      )
    `);

    this.vulnDB.exec(`
      CREATE INDEX IF NOT EXISTS idx_vuln_package 
      ON vulnerabilities(package_name, affected_versions);
    `);

    // Create malware signatures table
    this.vulnDB.exec(`
      CREATE TABLE IF NOT EXISTS malware_signatures (
        id TEXT PRIMARY KEY,
        signature TEXT NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT
      )
    `);

    // Create scan history table
    this.vulnDB.exec(`
      CREATE TABLE IF NOT EXISTS scan_history (
        scan_id TEXT PRIMARY KEY,
        package_name TEXT NOT NULL,
        package_version TEXT NOT NULL,
        security_score INTEGER,
        risk_level TEXT,
        findings TEXT,
        timestamp INTEGER
      )
    `);
  }

  /**
   * Comprehensive package security scan
   */
  async scanPackage(packageData: PackageInfo): Promise<SecurityScanResult> {
    const scanId = this.generateScanId();
    const startTime = Bun.nanoseconds();

    // Check cache first
    const cacheKey = `${packageData.name}@${packageData.version}`;
    if (this.scanCache.has(cacheKey)) {
      const cached = this.scanCache.get(cacheKey)!;
      if (this.isCacheValid(cached)) {
        return cached;
      }
    }

    // Parallel scanning for performance
    const [vulnResults, malwareResults, secretsResults, depsResults] = await Promise.all([
      this.scanVulnerabilities(packageData),
      this.scanMalware(packageData),
      this.scanSecrets(packageData),
      this.analyzeDependencies(packageData),
    ]);

    const score = this.calculateSecurityScore({
      vulnerabilities: vulnResults,
      malware: malwareResults,
      secrets: secretsResults,
      dependencies: depsResults,
    });

    const riskLevel = this.assessRiskLevel(score);
    const recommendations = this.generateRecommendations(score, {
      vulnerabilities: vulnResults,
      malware: malwareResults,
      secrets: secretsResults,
      dependencies: depsResults,
    });

    const scanTime = Number(Bun.nanoseconds() - startTime) / 1000000; // Convert to ms

    const result: SecurityScanResult = {
      scanId,
      packageName: packageData.name,
      packageVersion: packageData.version,
      timestamp: new Date(),
      scanDuration: scanTime,
      securityScore: score,
      riskLevel,
      findings: {
        vulnerabilities: vulnResults.findings,
        malware: malwareResults.findings,
        secrets: secretsResults.findings,
        dependencies: depsResults.findings,
      },
      recommendations,
      complianceStatus: this.checkCompliance(score, riskLevel),
      actionRequired: this.determineAction(riskLevel),
    };

    // Cache result
    this.scanCache.set(cacheKey, result);

    // Store in database
    await this.storeScanResult(result);

    return result;
  }

  /**
   * Real-time vulnerability scanning
   */
  private async scanVulnerabilities(packageData: PackageInfo): Promise<any> {
    const findings: any[] = [];

    // Query vulnerability database
    const query = this.vulnDB.query(`
      SELECT * FROM vulnerabilities 
      WHERE package_name = ? 
      AND ? GLOB affected_versions
    `);

    const vulns = query.all(packageData.name, packageData.version);

    for (const vuln of vulns) {
      findings.push({
        type: 'direct_vulnerability',
        severity: vuln.severity,
        cveId: vuln.cve_id,
        description: vuln.description,
        affectedVersions: vuln.affected_versions,
        fixedVersion: vuln.fixed_version,
        exploitAvailable: vuln.exploit_available,
        score: this.calculateVulnScore(vuln),
      });
    }

    // Check transitive dependencies
    if (this.config.deps.checkTransitive && packageData.dependencies) {
      for (const [depName, depVersion] of Object.entries(packageData.dependencies)) {
        const depVulns = query.all(depName, depVersion);

        findings.push(
          ...depVulns.map(vuln => ({
            type: 'transitive_vulnerability',
            dependency: depName,
            severity: vuln.severity,
            cveId: vuln.cve_id,
            description: vuln.description,
            score: this.calculateVulnScore(vuln) * 0.7, // Reduce impact for transitive
          }))
        );
      }
    }

    return {
      totalFindings: findings.length,
      criticalCount: findings.filter(f => f.severity === 'critical').length,
      highCount: findings.filter(f => f.severity === 'high').length,
      mediumCount: findings.filter(f => f.severity === 'medium').length,
      lowCount: findings.filter(f => f.severity === 'low').length,
      findings,
      score: this.calculateVulnScore(findings),
    };
  }

  /**
   * Advanced malware detection
   */
  private async scanMalware(packageData: PackageInfo): Promise<any> {
    const findings: any[] = [];

    if (!this.config.malware.enabled || !packageData.content) {
      return {
        totalFindings: 0,
        malwareDetected: false,
        suspiciousPatterns: 0,
        findings: [],
        score: 20, // Full score if not scanned
      };
    }

    const content = this.extractTextContent(packageData.content);

    // Check against malware signatures
    const sigQuery = this.vulnDB.query('SELECT * FROM malware_signatures');
    const signatures = sigQuery.all();

    for (const sig of signatures) {
      if (content.includes(sig.signature)) {
        findings.push({
          type: 'malware',
          signature: sig.signature,
          malwareType: sig.type,
          severity: sig.severity,
          description: sig.description,
        });
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /eval\s*\(/g, // Eval usage
      /Function\s*\(/g, // Dynamic function creation
      /document\.write/g, // DOM manipulation
      /\bexec\s*\(/g, // Command execution
      /require\s*\(['"]child_process['"]\)/g, // Process spawning
      /\.env\.[A-Z_]+/g, // Environment variable access
      /atob\(/g, // Base64 decoding
      /Buffer\.from\([^,]+,\s*['"]base64['"]\)/g, // Base64 buffer
    ];

    for (const pattern of suspiciousPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        findings.push({
          type: 'suspicious_pattern',
          pattern: pattern.source,
          occurrences: matches.length,
          severity: 'medium',
        });
      }
    }

    return {
      totalFindings: findings.length,
      malwareDetected: findings.some(f => f.type === 'malware'),
      suspiciousPatterns: findings.filter(f => f.type === 'suspicious_pattern').length,
      findings,
      score: this.calculateMalwareScore(findings),
    };
  }

  /**
   * Secrets and credentials detection
   */
  private async scanSecrets(packageData: PackageInfo): Promise<any> {
    const patterns = {
      apiKeys: /[a-zA-Z0-9]{32,}/g,
      awsKeys: /AKIA[0-9A-Z]{16}/g,
      privateKeys: /-----BEGIN.*PRIVATE KEY-----/g,
      passwords: /(password|pwd|pass)\s*[:=]\s*['"]?([^'"\s]+)/gi,
      tokens: /(token|jwt|bearer)\s*[:=]\s*['"]?([^'"\s]+)/gi,
      connectionStrings: /(mongodb|postgres|mysql|redis):\/\/[^\s]+/gi,
      githubTokens: /ghp_[a-zA-Z0-9]{36}/g,
      npmTokens: /npm_[a-zA-Z0-9]{36}/g,
      slackWebhooks: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[a-zA-Z0-9]+/g,
    };

    const findings: any[] = [];

    if (!packageData.content) {
      return {
        totalFindings: 0,
        highRiskSecrets: 0,
        findings: [],
        score: 10, // Full score if not scanned
      };
    }

    const content = this.extractTextContent(packageData.content);

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = content.matchAll(pattern);

      for (const match of matches) {
        const entropy = this.calculateEntropy(match[0]);

        if (entropy > 4.0) {
          // High entropy indicates real secret
          findings.push({
            type: type,
            location: this.findLocation(packageData, match[0]),
            entropy,
            severity: this.assessSecretSeverity(type, entropy),
            recommendation: this.getSecretRecommendation(type),
          });
        }
      }
    }

    // Check custom patterns if provided
    if (this.config.secrets.customPatterns) {
      for (const [name, pattern] of Object.entries(this.config.secrets.customPatterns)) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          findings.push({
            type: `custom_${name}`,
            value: match[0].substring(0, 10) + '...', // Truncate for security
            severity: 'high',
          });
        }
      }
    }

    return {
      totalFindings: findings.length,
      highRiskSecrets: findings.filter(f => f.severity === 'high').length,
      findings,
      score: this.calculateSecretsScore(findings),
    };
  }

  /**
   * Dependency analysis
   */
  private async analyzeDependencies(packageData: PackageInfo): Promise<any> {
    const findings: any[] = [];

    if (!packageData.dependencies) {
      return {
        totalDependencies: 0,
        outdated: 0,
        vulnerable: 0,
        findings: [],
        score: 20, // Full score if no dependencies
      };
    }

    const deps = Object.entries(packageData.dependencies);

    for (const [name, version] of deps) {
      // Check if dependency is outdated
      // In production, this would check against npm registry
      const isOutdated = this.checkIfOutdated(name, version);

      if (isOutdated) {
        findings.push({
          type: 'outdated_dependency',
          name,
          currentVersion: version,
          latestVersion: isOutdated.latest,
          severity: 'low',
        });
      }

      // Check for known vulnerable dependencies
      const vulnQuery = this.vulnDB.query(
        'SELECT COUNT(*) as count FROM vulnerabilities WHERE package_name = ?'
      );
      const vulnCount = vulnQuery.get(name)?.count || 0;

      if (vulnCount > 0) {
        findings.push({
          type: 'vulnerable_dependency',
          name,
          version,
          vulnerabilityCount: vulnCount,
          severity: 'medium',
        });
      }
    }

    return {
      totalDependencies: deps.length,
      outdated: findings.filter(f => f.type === 'outdated_dependency').length,
      vulnerable: findings.filter(f => f.type === 'vulnerable_dependency').length,
      findings,
      score: this.scoreDependencies({ findings }),
    };
  }

  /**
   * Calculate comprehensive security score
   */
  private calculateSecurityScore(results: any): number {
    const weights = {
      vulnerabilities: 0.4, // 40%
      dependencies: 0.2, // 20%
      malware: 0.2, // 20%
      secrets: 0.1, // 10%
      codeQuality: 0.1, // 10%
    };

    const scores = {
      vulnerabilities: Math.max(
        0,
        40 -
          (results.vulnerabilities.criticalCount * 10 +
            results.vulnerabilities.highCount * 5 +
            results.vulnerabilities.mediumCount * 2)
      ),
      dependencies: this.scoreDependencies(results.dependencies),
      malware: results.malware.malwareDetected ? 0 : 20,
      secrets: Math.max(0, 10 - results.secrets.highRiskSecrets * 5),
      codeQuality: this.scoreCodeQuality(results),
    };

    const totalScore = Object.entries(weights).reduce((total, [category, weight]) => {
      return total + scores[category] * weight;
    }, 0);

    return Math.round(Math.max(0, Math.min(100, totalScore)));
  }

  /**
   * Helper functions
   */
  private generateScanId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private isCacheValid(cached: SecurityScanResult): boolean {
    const cacheAge = Date.now() - cached.timestamp.getTime();
    return cacheAge < 3600000; // 1 hour cache
  }

  private calculateVulnScore(vuln: any): number {
    const severityScores = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 1,
    };

    if (Array.isArray(vuln)) {
      return vuln.reduce((total, v) => total + (severityScores[v.severity] || 0), 0);
    }

    return severityScores[vuln.severity] || 0;
  }

  private calculateMalwareScore(findings: any[]): number {
    if (findings.some(f => f.type === 'malware')) {
      return 0; // No score if malware detected
    }

    const suspiciousCount = findings.filter(f => f.type === 'suspicious_pattern').length;
    return Math.max(0, 20 - suspiciousCount * 2);
  }

  private calculateSecretsScore(findings: any[]): number {
    const highRisk = findings.filter(f => f.severity === 'high').length;
    const mediumRisk = findings.filter(f => f.severity === 'medium').length;

    return Math.max(0, 10 - highRisk * 5 - mediumRisk * 2);
  }

  private scoreDependencies(results: any): number {
    if (!results.findings) return 20;

    const vulnerable = results.findings.filter(f => f.type === 'vulnerable_dependency').length;
    const outdated = results.findings.filter(f => f.type === 'outdated_dependency').length;

    return Math.max(0, 20 - vulnerable * 5 - outdated * 1);
  }

  private scoreCodeQuality(results: any): number {
    // Simplified code quality scoring
    return 8; // Default moderate quality
  }

  private assessRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  }

  private generateRecommendations(score: number, results: any): string[] {
    const recommendations: string[] = [];

    if (results.vulnerabilities.criticalCount > 0) {
      recommendations.push('Immediately update packages with critical vulnerabilities');
    }

    if (results.malware.malwareDetected) {
      recommendations.push('Remove package immediately - malware detected');
    }

    if (results.secrets.highRiskSecrets > 0) {
      recommendations.push('Rotate exposed credentials and remove from code');
    }

    if (results.dependencies.vulnerable > 0) {
      recommendations.push('Update vulnerable dependencies to patched versions');
    }

    if (score < 50) {
      recommendations.push('Consider alternative packages with better security scores');
    }

    return recommendations;
  }

  private checkCompliance(score: number, riskLevel: string): Record<string, boolean> {
    return {
      owasp: score >= 70,
      nist: score >= 75,
      iso27001: score >= 80,
      pci: riskLevel !== 'critical' && riskLevel !== 'high',
    };
  }

  private determineAction(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical':
        return 'BLOCK - Do not use this package';
      case 'high':
        return 'REVIEW - Requires security team approval';
      case 'medium':
        return 'MONITOR - Use with caution';
      case 'low':
        return 'APPROVED - Safe to use';
      default:
        return 'UNKNOWN';
    }
  }

  private extractTextContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Buffer.isBuffer(content)) {
      return content.toString('utf-8');
    }

    if (content instanceof Uint8Array) {
      return Buffer.from(content).toString('utf-8');
    }

    return JSON.stringify(content);
  }

  private calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;

    for (const count of Object.values(freq)) {
      const probability = count / len;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private findLocation(packageData: PackageInfo, match: string): string {
    // Simplified location finding
    return packageData.path || 'content';
  }

  private assessSecretSeverity(type: string, entropy: number): string {
    const highRiskTypes = ['privateKeys', 'awsKeys', 'connectionStrings'];

    if (highRiskTypes.includes(type)) {
      return 'high';
    }

    if (entropy > 5.0) {
      return 'high';
    }

    if (entropy > 4.5) {
      return 'medium';
    }

    return 'low';
  }

  private getSecretRecommendation(type: string): string {
    const recommendations = {
      apiKeys: 'Use environment variables for API keys',
      awsKeys: 'Use IAM roles or AWS Secrets Manager',
      privateKeys: 'Never commit private keys to repository',
      passwords: 'Use secure credential storage',
      tokens: 'Implement token rotation',
      connectionStrings: 'Use environment-specific configuration',
      githubTokens: 'Use GitHub Apps or OAuth instead',
      npmTokens: 'Store in .npmrc with proper gitignore',
      slackWebhooks: 'Rotate webhook URLs regularly',
    };

    return recommendations[type] || 'Remove sensitive data from code';
  }

  private checkIfOutdated(name: string, version: string): any {
    // Simplified - in production would check npm registry
    // This is a mock implementation
    return null;
  }

  private async storeScanResult(result: SecurityScanResult): Promise<void> {
    const insert = this.vulnDB.query(`
      INSERT INTO scan_history (
        scan_id, package_name, package_version, 
        security_score, risk_level, findings, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      result.scanId,
      result.packageName,
      result.packageVersion,
      result.securityScore,
      result.riskLevel,
      JSON.stringify(result.findings),
      result.timestamp.getTime()
    );
  }
}
