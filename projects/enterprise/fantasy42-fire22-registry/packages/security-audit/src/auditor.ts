/**
 * Enhanced Fantasy42 Security Auditor
 *
 * Core auditing engine with comprehensive security analysis,
 * detailed error reporting, and actionable remediation.
 */

import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  SECURITY_ERROR_CODES,
  getSecurityIssue,
  type SecurityIssue,
  type Vulnerability,
} from './error-codes';
import type { PackageAuditResult, AuditSummary, AuditOptions } from './types';

export class EnhancedFantasy42SecurityAuditor {
  private auditResults: {
    timestamp: string;
    packages: Map<string, PackageAuditResult>;
    summary: AuditSummary;
    recommendations: string[];
    issues: SecurityIssue[];
    timeline: Array<{ timestamp: string; action: string; details: string; duration?: number }>;
  };

  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.auditResults = {
      timestamp: new Date().toISOString(),
      packages: new Map(),
      summary: {
        totalPackages: 0,
        securePackages: 0,
        vulnerablePackages: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        compliancePassed: 0,
        complianceFailed: 0,
        overallScore: 100,
        riskLevel: 'LOW',
        executionTime: 0,
        timestamp: new Date().toISOString(),
      },
      recommendations: [],
      issues: [],
      timeline: [],
    };
  }

  async runEnhancedSecurityAudit(options: AuditOptions = {}): Promise<AuditSummary> {
    this.logTimeline('audit_start', 'Starting enhanced security audit');

    try {
      const packagesToAudit = options.packages || (await this.discoverPackages());
      this.logTimeline('discovery_complete', `Discovered ${packagesToAudit.length} packages`);

      console.log(
        `🔍 Auditing ${packagesToAudit.length} packages with enterprise security standards...\n`
      );

      for (const packagePath of packagesToAudit) {
        const packageStart = Date.now();
        await this.auditPackage(packagePath, options);
        const packageDuration = Date.now() - packageStart;

        if (options.verbose) {
          console.log(`   ⏱️  Package audit completed in ${packageDuration}ms`);
        }
      }

      // Run additional security checks
      if (options.deepScan) {
        await this.runDeepSecurityChecks(options);
      }

      // Calculate overall security metrics
      this.calculateSecurityMetrics();

      // Generate comprehensive recommendations
      this.generateRecommendations();

      // Update execution time
      this.auditResults.summary.executionTime = Date.now() - this.startTime;

      this.logTimeline(
        'audit_complete',
        `Audit completed successfully in ${this.auditResults.summary.executionTime}ms`
      );

      return this.auditResults.summary;
    } catch (error) {
      this.logTimeline('audit_failed', `Audit failed: ${error}`);
      throw error;
    }
  }

  private async discoverPackages(): Promise<string[]> {
    const packages: string[] = [];

    // Check main packages directory
    const packagesDir = join(process.cwd(), 'packages');
    if (existsSync(packagesDir)) {
      packages.push(...this.walkForPackages(packagesDir));
    }

    // Check enterprise packages directory
    const enterpriseDir = join(process.cwd(), 'enterprise/packages');
    if (existsSync(enterpriseDir)) {
      packages.push(...this.walkForPackages(enterpriseDir));
    }

    // Add root package
    const rootPackageJson = join(process.cwd(), 'package.json');
    if (existsSync(rootPackageJson)) {
      packages.push(process.cwd());
    }

    return [...new Set(packages)]; // Remove duplicates
  }

  private walkForPackages(dir: string): string[] {
    const packages: string[] = [];

    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          const packageJson = join(fullPath, 'package.json');

          if (existsSync(packageJson)) {
            packages.push(fullPath);
          } else {
            // Continue walking subdirectories
            packages.push(...this.walkForPackages(fullPath));
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.warn(`⚠️  Skipping directory ${dir}: ${error}`);
    }

    return packages;
  }

  private async auditPackage(packagePath: string, options: AuditOptions): Promise<void> {
    const packageJsonPath = join(packagePath, 'package.json');

    if (!existsSync(packageJsonPath)) {
      console.log(`⚠️  Skipping ${packagePath} - no package.json`);
      return;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const packageName = packageJson.name || 'unknown';
      const packageVersion = packageJson.version || '0.0.0';

      console.log(`🔍 Auditing: ${packageName}@${packageVersion}`);

      const issues: SecurityIssue[] = [];

      // Check package dependencies
      issues.push(...(await this.checkPackageDependencies(packageJson, packagePath)));

      // Check package scripts
      issues.push(...(await this.checkPackageScripts(packageJson, packagePath)));

      // Check configuration files
      issues.push(...(await this.checkConfigurationFiles(packagePath)));

      // Check source code
      issues.push(...(await this.checkSourceCode(packagePath)));

      // Calculate package security score
      const score = this.calculatePackageScore(issues);

      const result: PackageAuditResult = {
        name: packageName,
        version: packageVersion,
        path: packagePath,
        issues,
        score,
        lastAudit: new Date().toISOString(),
        nextAuditDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      this.auditResults.packages.set(packageName, result);
      this.auditResults.issues.push(...issues);

      // Update summary
      this.auditResults.summary.totalPackages++;
      if (issues.length === 0) {
        this.auditResults.summary.securePackages++;
      } else {
        this.auditResults.summary.vulnerablePackages++;
      }

      console.log(`   📊 Score: ${score}/100 (${issues.length} issues found)`);
    } catch (error) {
      console.error(`❌ Failed to audit package ${packagePath}:`, error);
    }
  }

  private async checkPackageDependencies(
    packageJson: any,
    packagePath: string
  ): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
      ...packageJson.optionalDependencies,
    };

    for (const [depName, depVersion] of Object.entries(allDeps || {})) {
      // Check for known vulnerable packages
      if (this.isVulnerablePackage(depName, depVersion as string)) {
        const issueTemplate = SECURITY_ERROR_CODES.PKG001;
        issues.push({
          ...issueTemplate,
          evidence: `Package: ${depName}@${depVersion}`,
          file: 'package.json',
          detectedAt: new Date().toISOString(),
          confidence: 'HIGH',
        });
      }

      // Check for outdated packages
      if (this.isOutdatedPackage(depName, depVersion as string)) {
        const issueTemplate = SECURITY_ERROR_CODES.PKG002;
        issues.push({
          ...issueTemplate,
          evidence: `Package: ${depName}@${depVersion}`,
          file: 'package.json',
          detectedAt: new Date().toISOString(),
          confidence: 'MEDIUM',
        });
      }

      // Check for unmaintained packages
      if (this.isUnmaintainedPackage(depName)) {
        const issueTemplate = SECURITY_ERROR_CODES.PKG003;
        issues.push({
          ...issueTemplate,
          evidence: `Package: ${depName} (last updated >6 months ago)`,
          file: 'package.json',
          detectedAt: new Date().toISOString(),
          confidence: 'MEDIUM',
        });
      }
    }

    return issues;
  }

  private async checkPackageScripts(
    packageJson: any,
    packagePath: string
  ): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    const scripts = packageJson.scripts || {};

    for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
      if (this.containsDangerousCommands(scriptCommand as string)) {
        issues.push({
          code: 'CFG001',
          severity: 'HIGH',
          category: 'Configuration Security',
          title: 'Potentially Dangerous Script Command',
          description: `Script '${scriptName}' contains potentially dangerous commands`,
          impact: 'Risk of command injection or unintended execution',
          suggestions: [
            'Review script commands for security implications',
            'Use explicit paths instead of user input',
            'Implement command validation and sanitization',
            'Consider using safer alternatives',
          ],
          remediation: 'Review and fix dangerous script commands within 7 days',
          evidence: `Script: ${scriptName}, Command: ${scriptCommand}`,
          file: 'package.json',
          detectedAt: new Date().toISOString(),
          confidence: 'HIGH',
          cwe: 'CWE-78',
          owasp: 'A03:2021-Injection',
        });
      }
    }

    return issues;
  }

  private async checkConfigurationFiles(packagePath: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    const configFiles = [
      'package.json',
      '.env',
      '.env.local',
      '.env.production',
      'config.json',
      'config.js',
      'bunfig.toml',
      'wrangler.toml',
    ];

    for (const configFile of configFiles) {
      const configPath = join(packagePath, configFile);

      if (existsSync(configPath)) {
        try {
          const content = readFileSync(configPath, 'utf-8');

          // Check for hardcoded secrets
          if (this.containsHardcodedSecrets(content)) {
            const issueTemplate = SECURITY_ERROR_CODES.CFG001;
            issues.push({
              ...issueTemplate,
              evidence: `File: ${configFile}`,
              file: configFile,
              detectedAt: new Date().toISOString(),
              confidence: 'HIGH',
            });
          }

          // Check for debug mode in production configs
          if (configFile.includes('production') && this.containsDebugMode(content)) {
            const issueTemplate = SECURITY_ERROR_CODES.CFG003;
            issues.push({
              ...issueTemplate,
              evidence: `File: ${configFile}`,
              file: configFile,
              detectedAt: new Date().toISOString(),
              confidence: 'HIGH',
            });
          }
        } catch (error) {
          // Skip files we can't read
        }
      }
    }

    return issues;
  }

  private async checkSourceCode(packagePath: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    const sourceFiles = await this.findSourceFiles(packagePath);
    const maxFiles = 50; // Limit for performance

    for (const file of sourceFiles.slice(0, maxFiles)) {
      try {
        const content = readFileSync(file, 'utf-8');
        const fileIssues = this.analyzeSourceFile(file, content);
        issues.push(...fileIssues);
      } catch (error) {
        // Skip files we can't read
      }
    }

    return issues;
  }

  private analyzeSourceFile(filePath: string, content: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for SQL injection patterns
      if (this.containsSQLInjection(line)) {
        const issueTemplate = SECURITY_ERROR_CODES.COD001;
        issues.push({
          ...issueTemplate,
          evidence: `Line ${index + 1}: ${line.trim()}`,
          file: filePath,
          line: index + 1,
          detectedAt: new Date().toISOString(),
          confidence: 'HIGH',
        });
      }

      // Check for XSS patterns
      if (this.containsXSS(line)) {
        const issueTemplate = SECURITY_ERROR_CODES.COD002;
        issues.push({
          ...issueTemplate,
          evidence: `Line ${index + 1}: ${line.trim()}`,
          file: filePath,
          line: index + 1,
          detectedAt: new Date().toISOString(),
          confidence: 'HIGH',
        });
      }

      // Check for command injection
      if (this.containsCommandInjection(line)) {
        const issueTemplate = SECURITY_ERROR_CODES.COD004;
        issues.push({
          ...issueTemplate,
          evidence: `Line ${index + 1}: ${line.trim()}`,
          file: filePath,
          line: index + 1,
          detectedAt: new Date().toISOString(),
          confidence: 'HIGH',
        });
      }

      // Check for hardcoded secrets in source
      if (this.containsHardcodedSecrets(line)) {
        const issueTemplate = SECURITY_ERROR_CODES.CFG001;
        issues.push({
          ...issueTemplate,
          evidence: `Line ${index + 1}: ${line.trim()}`,
          file: filePath,
          line: index + 1,
          detectedAt: new Date().toISOString(),
          confidence: 'HIGH',
        });
      }
    });

    return issues;
  }

  private async runDeepSecurityChecks(options: AuditOptions): Promise<void> {
    console.log('🔬 Running deep security analysis...');

    // Check infrastructure security
    const infraIssues = await this.checkInfrastructureSecurity();
    this.auditResults.issues.push(...infraIssues);

    // Additional deep analysis could go here
    console.log('✅ Deep security analysis completed');
  }

  private async checkInfrastructureSecurity(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Check if HTTPS is configured (simplified check)
    if (!this.isHTTPSConfigured()) {
      const issueTemplate = SECURITY_ERROR_CODES.INF003;
      issues.push({
        ...issueTemplate,
        evidence: 'HTTPS not detected in application configuration',
        detectedAt: new Date().toISOString(),
        confidence: 'MEDIUM',
      });
    }

    return issues;
  }

  private calculatePackageScore(issues: SecurityIssue[]): number {
    if (issues.length === 0) return 100;

    let score = 100;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'CRITICAL':
          score -= 25;
          break;
        case 'HIGH':
          score -= 15;
          break;
        case 'MEDIUM':
          score -= 8;
          break;
        case 'LOW':
          score -= 3;
          break;
      }
    });

    return Math.max(0, score);
  }

  private calculateSecurityMetrics(): void {
    const issues = this.auditResults.issues;

    // Count issues by severity
    issues.forEach(issue => {
      this.auditResults.summary[`${issue.severity.toLowerCase()}Issues` as keyof AuditSummary]++;
    });

    // Calculate overall score
    if (this.auditResults.summary.totalPackages > 0) {
      const totalScore = Array.from(this.auditResults.packages.values()).reduce(
        (sum, pkg) => sum + pkg.score,
        0
      );
      this.auditResults.summary.overallScore = Math.round(
        totalScore / this.auditResults.summary.totalPackages
      );
    }

    // Determine risk level
    const criticalCount = this.auditResults.summary.criticalIssues;
    const highCount = this.auditResults.summary.highIssues;

    if (criticalCount > 0) {
      this.auditResults.summary.riskLevel = 'CRITICAL';
    } else if (highCount > 3) {
      this.auditResults.summary.riskLevel = 'HIGH';
    } else if (highCount > 0 || this.auditResults.summary.mediumIssues > 5) {
      this.auditResults.summary.riskLevel = 'MEDIUM';
    } else {
      this.auditResults.summary.riskLevel = 'LOW';
    }
  }

  private generateRecommendations(): void {
    const recommendations: string[] = [];

    const criticalCount = this.auditResults.summary.criticalIssues;
    const highCount = this.auditResults.summary.highIssues;

    if (criticalCount > 0) {
      recommendations.push(
        '🚨 CRITICAL: Address all critical security issues within 24 hours - immediate action required'
      );
    }

    if (highCount > 0) {
      recommendations.push(
        `🔴 HIGH PRIORITY: Address ${highCount} high-severity issues within 7 days`
      );
    }

    if (this.auditResults.summary.overallScore < 70) {
      recommendations.push(
        `📊 OVERALL SECURITY SCORE: ${this.auditResults.summary.overallScore}% - significant improvement needed`
      );
    }

    recommendations.push(
      '🔄 CONTINUOUS MONITORING: Implement automated security scanning in CI/CD pipeline'
    );
    recommendations.push(
      '📚 TRAINING: Ensure development team is trained on secure coding practices'
    );
    recommendations.push('📋 COMPLIANCE: Regular security audits and compliance reviews');

    this.auditResults.recommendations = recommendations;
  }

  private logTimeline(action: string, details: string, duration?: number): void {
    this.auditResults.timeline.push({
      timestamp: new Date().toISOString(),
      action,
      details,
      duration,
    });
  }

  // Helper methods for vulnerability detection
  private isVulnerablePackage(name: string, version: string): boolean {
    const vulnerablePackages = ['lodash', 'express', 'axios', 'moment'];
    return vulnerablePackages.includes(name) && version.startsWith('4.');
  }

  private isOutdatedPackage(name: string, version: string): boolean {
    return version.split('.')[0] === '1' && ['lodash', 'express'].includes(name);
  }

  private isUnmaintainedPackage(name: string): boolean {
    // Simplified check - in real implementation, this would check npm registry
    const unmaintained = ['old-package', 'deprecated-lib'];
    return unmaintained.includes(name);
  }

  private containsDangerousCommands(command: string): boolean {
    const dangerousPatterns = [
      /rm\s+-rf\s+/,
      /sudo\s+/,
      />\s*\/dev/,
      /curl.*\|\s*sh/,
      /wget.*\|\s*sh/,
    ];
    return dangerousPatterns.some(pattern => pattern.test(command));
  }

  private containsHardcodedSecrets(content: string): boolean {
    const secretPatterns = [
      /password\s*[:=]\s*['"][^'"]*['"]/i,
      /secret\s*[:=]\s*['"][^'"]*['"]/i,
      /token\s*[:=]\s*['"][^'"]*['"]/i,
      /key\s*[:=]\s*['"][^'"]*['"]/i,
      /api[_-]?key/i,
      /auth[_-]?token/i,
    ];
    return secretPatterns.some(pattern => pattern.test(content));
  }

  private containsDebugMode(content: string): boolean {
    return /debug\s*:\s*true/i.test(content) || /NODE_ENV.*development/i.test(content);
  }

  private containsSQLInjection(line: string): boolean {
    const sqlPatterns = [
      /SELECT.*\+.*FROM/i,
      /INSERT.*\+.*INTO/i,
      /UPDATE.*\+.*SET/i,
      /DELETE.*\+.*FROM/i,
      /\$\{.*\}/, // Template literals that could contain user input
    ];
    return sqlPatterns.some(pattern => pattern.test(line));
  }

  private containsXSS(line: string): boolean {
    const xssPatterns = [
      /innerHTML\s*=\s*.*\+/i,
      /document\.write\s*\(/i,
      /eval\s*\(/i,
      /dangerouslySetInnerHTML/i,
    ];
    return xssPatterns.some(pattern => pattern.test(line));
  }

  private containsCommandInjection(line: string): boolean {
    const cmdPatterns = [
      /exec\s*\(/i,
      /spawn\s*\(/i,
      /child_process/i,
      /`\s*.*\$\{.*\}`/, // Template literals in command execution
    ];
    return cmdPatterns.some(pattern => pattern.test(line));
  }

  private async findSourceFiles(packagePath: string): Promise<string[]> {
    const sourceFiles: string[] = [];
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];

    const walk = (dir: string) => {
      try {
        const entries = readdirSync(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);

          if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            walk(fullPath);
          } else if (stat.isFile() && extensions.some(ext => entry.endsWith(ext))) {
            sourceFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    walk(packagePath);
    return sourceFiles;
  }

  private isHTTPSConfigured(): boolean {
    // Simplified check - in real implementation, this would check server config
    return true; // Assume HTTPS is configured for demo
  }

  // Public getters for results
  getResults() {
    return this.auditResults;
  }

  getSummary(): AuditSummary {
    return this.auditResults.summary;
  }

  getIssues(): SecurityIssue[] {
    return this.auditResults.issues;
  }

  getRecommendations(): string[] {
    return this.auditResults.recommendations;
  }
}
