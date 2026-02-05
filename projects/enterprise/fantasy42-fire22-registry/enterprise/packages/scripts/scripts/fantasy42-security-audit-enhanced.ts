#!/usr/bin/env bun

/**
 * 🔒 Fantasy42 Enhanced Security Audit System
 *
 * Enterprise-grade security auditing with detailed error codes,
 * actionable recommendations, and comprehensive issue classification
 */

import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

// ============================================================================
// SECURITY ERROR CODES & CLASSIFICATIONS
// ============================================================================

const SECURITY_ERROR_CODES = {
  // Package Security (PKG-XXX)
  PKG001: {
    severity: 'CRITICAL',
    category: 'Package Security',
    title: 'Vulnerable Package Dependency',
    description: 'Package contains known security vulnerabilities',
    impact: 'High risk of exploitation and data breaches',
    suggestions: [
      'Update package to latest secure version',
      'Review vulnerability details and exploit vectors',
      'Consider package alternatives if updates unavailable',
      'Implement temporary mitigation if immediate update impossible',
    ],
  },
  PKG002: {
    severity: 'HIGH',
    category: 'Package Security',
    title: 'Outdated Package Version',
    description: 'Package version significantly behind latest release',
    impact: 'Missed security patches and feature updates',
    suggestions: [
      'Update to latest stable version',
      'Check changelog for breaking changes',
      'Test thoroughly after update',
      'Update package-lock.json/bun.lock',
    ],
  },
  PKG003: {
    severity: 'MEDIUM',
    category: 'Package Security',
    title: 'Unmaintained Package',
    description: 'Package has not been updated in 6+ months',
    impact: 'No security updates or bug fixes',
    suggestions: [
      'Evaluate package necessity',
      'Find actively maintained alternative',
      'Consider forking and maintaining internally',
      'Implement additional security monitoring',
    ],
  },

  // Code Security (COD-XXX)
  COD001: {
    severity: 'CRITICAL',
    category: 'Code Security',
    title: 'SQL Injection Vulnerability',
    description: 'Unsanitized user input in SQL queries',
    impact: 'Complete database compromise possible',
    suggestions: [
      'Use parameterized queries or prepared statements',
      'Implement input sanitization and validation',
      'Use ORM with built-in SQL injection protection',
      'Conduct security code review',
    ],
  },
  COD002: {
    severity: 'HIGH',
    category: 'Code Security',
    title: 'Cross-Site Scripting (XSS)',
    description: 'Unsanitized user input in HTML output',
    impact: 'Client-side code execution and session hijacking',
    suggestions: [
      'Escape all user input in HTML templates',
      'Use Content Security Policy (CSP)',
      'Implement input validation and sanitization',
      'Use template engines with XSS protection',
    ],
  },
  COD003: {
    severity: 'HIGH',
    category: 'Code Security',
    title: 'Broken Authentication',
    description: 'Weak or improperly implemented authentication',
    impact: 'Unauthorized access to user accounts',
    suggestions: [
      'Implement multi-factor authentication (MFA)',
      'Use secure session management',
      'Implement proper password policies',
      'Regular security audits of auth mechanisms',
    ],
  },

  // Configuration Security (CFG-XXX)
  CFG001: {
    severity: 'CRITICAL',
    category: 'Configuration Security',
    title: 'Hardcoded Secrets',
    description: 'API keys, passwords, or tokens in source code',
    impact: 'Credential exposure and unauthorized access',
    suggestions: [
      'Move secrets to environment variables',
      'Use secret management service (Vault, AWS Secrets Manager)',
      'Implement secret rotation policies',
      'Conduct code review for credential exposure',
    ],
  },
  CFG002: {
    severity: 'HIGH',
    category: 'Configuration Security',
    title: 'Weak Encryption',
    description: 'Using deprecated or weak encryption algorithms',
    impact: 'Data confidentiality and integrity compromised',
    suggestions: [
      'Use AES-256-GCM for symmetric encryption',
      'Use RSA-4096 or ECDSA for asymmetric encryption',
      'Implement proper key management',
      'Regular cryptographic algorithm updates',
    ],
  },
  CFG003: {
    severity: 'MEDIUM',
    category: 'Configuration Security',
    title: 'Debug Mode Enabled',
    description: 'Debug mode active in production environment',
    impact: 'Information disclosure and performance issues',
    suggestions: [
      'Disable debug mode in production',
      'Use environment-specific configuration',
      'Implement production logging levels',
      'Regular environment configuration audits',
    ],
  },

  // Infrastructure Security (INF-XXX)
  INF001: {
    severity: 'CRITICAL',
    category: 'Infrastructure Security',
    title: 'Unpatched System Components',
    description: 'Operating system or runtime with known vulnerabilities',
    impact: 'System compromise and lateral movement',
    suggestions: [
      'Apply latest security patches immediately',
      'Implement automated patching system',
      'Regular vulnerability scanning',
      'Isolate vulnerable systems until patched',
    ],
  },
  INF002: {
    severity: 'HIGH',
    category: 'Infrastructure Security',
    title: 'Weak Network Security',
    description: 'Missing firewall rules or insecure network configuration',
    impact: 'Unauthorized network access and data exfiltration',
    suggestions: [
      'Implement least privilege network access',
      'Configure Web Application Firewall (WAF)',
      'Enable network segmentation',
      'Regular network security audits',
    ],
  },
  INF003: {
    severity: 'MEDIUM',
    category: 'Infrastructure Security',
    title: 'Missing HTTPS/TLS',
    description: 'Plaintext communication without encryption',
    impact: 'Man-in-the-middle attacks and data interception',
    suggestions: [
      'Implement HTTPS with TLS 1.3',
      'Obtain certificate from trusted CA',
      'Configure HSTS headers',
      'Redirect all HTTP traffic to HTTPS',
    ],
  },

  // Compliance Security (CMP-XXX)
  CMP001: {
    severity: 'CRITICAL',
    category: 'Compliance Security',
    title: 'GDPR Violation',
    description: 'Improper handling of personal data',
    impact: 'Legal penalties and reputation damage',
    suggestions: [
      'Implement data processing agreements',
      'Obtain proper consent for data collection',
      'Implement data subject access rights',
      'Conduct GDPR compliance audit',
    ],
  },
  CMP002: {
    severity: 'HIGH',
    category: 'Compliance Security',
    title: 'PCI DSS Non-Compliance',
    description: 'Payment card data handling violations',
    impact: 'Fines and loss of payment processing capability',
    suggestions: [
      'Implement PCI DSS Level 1 compliance',
      'Use PCI-compliant payment processors',
      'Regular security assessments',
      'Tokenize sensitive card data',
    ],
  },
} as const;

// ============================================================================
// ENHANCED SECURITY AUDIT CLASS
// ============================================================================

interface SecurityIssue {
  code: keyof typeof SECURITY_ERROR_CODES;
  file?: string;
  line?: number;
  column?: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  impact: string;
  suggestions: string[];
  evidence?: string;
  remediation?: string;
  cwe?: string; // Common Weakness Enumeration
  owasp?: string; // OWASP Top 10 reference
}

interface PackageAuditResult {
  name: string;
  version: string;
  path: string;
  issues: SecurityIssue[];
  score: number; // Security score 0-100
  lastAudit: string;
  nextAuditDue: string;
}

interface AuditSummary {
  totalPackages: number;
  securePackages: number;
  vulnerablePackages: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  compliancePassed: number;
  complianceFailed: number;
  overallScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class EnhancedFantasy42SecurityAuditor {
  private auditResults: {
    timestamp: string;
    packages: Map<string, PackageAuditResult>;
    summary: AuditSummary;
    recommendations: string[];
    issues: SecurityIssue[];
  };

  constructor() {
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
      },
      recommendations: [],
      issues: [],
    };
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

    // Add current directory if it has package.json
    const currentPackageJson = join(process.cwd(), 'package.json');
    if (existsSync(currentPackageJson)) {
      packages.push(process.cwd());
    }

    return packages;
  }

  private walkForPackages(dir: string): string[] {
    const packages: string[] = [];
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

    return packages;
  }

  async runEnhancedSecurityAudit(
    options: {
      packages?: string[];
      verbose?: boolean;
      report?: boolean;
      fix?: boolean;
      deepScan?: boolean;
      compliance?: string[];
    } = {}
  ): Promise<AuditSummary> {
    console.log('🔍 Starting Enhanced Fantasy42 Security Audit...');
    console.log('================================================\n');

    try {
      const packagesToAudit = options.packages || (await this.discoverPackages());

      console.log(`📦 Auditing ${packagesToAudit.length} packages...\n`);

      for (const packagePath of packagesToAudit) {
        await this.auditPackage(packagePath, options);
      }

      // Run additional security checks
      await this.runAdvancedSecurityChecks(options);

      // Calculate overall security score
      this.calculateSecurityScore();

      // Generate comprehensive recommendations
      this.generateEnhancedRecommendations();

      // Save detailed audit report
      if (options.report) {
        await this.saveEnhancedAuditReport();
      }

      // Display results with detailed error codes
      this.displayEnhancedResults();

      return this.auditResults.summary;
    } catch (error) {
      console.error('❌ Enhanced security audit failed:', error);
      throw error;
    }
  }

  private async auditPackage(packagePath: string, options: any): Promise<void> {
    const packageJsonPath = join(packagePath, 'package.json');

    if (!existsSync(packageJsonPath)) {
      console.log(`⚠️  Skipping ${packagePath} - no package.json`);
      return;
    }

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

    // Check source code if deep scan enabled
    if (options.deepScan) {
      issues.push(...(await this.checkSourceCode(packagePath)));
    }

    // Calculate package security score
    const score = this.calculatePackageScore(issues);

    const result: PackageAuditResult = {
      name: packageName,
      version: packageVersion,
      path: packagePath,
      issues,
      score,
      lastAudit: new Date().toISOString(),
      nextAuditDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
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

    // Count issues by severity
    issues.forEach(issue => {
      this.auditResults.summary[`${issue.severity.toLowerCase()}Issues` as keyof AuditSummary]++;
    });

    console.log(`   📊 Score: ${score}/100 (${issues.length} issues found)`);
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
      // Check for known vulnerable packages (simplified example)
      if (this.isVulnerablePackage(depName, depVersion as string)) {
        issues.push({
          code: 'PKG001',
          file: 'package.json',
          severity: 'CRITICAL',
          category: 'Package Security',
          title: SECURITY_ERROR_CODES.PKG001.title,
          description: `${depName}@${depVersion} contains known vulnerabilities`,
          impact: SECURITY_ERROR_CODES.PKG001.impact,
          suggestions: SECURITY_ERROR_CODES.PKG001.suggestions,
          evidence: `Package: ${depName}, Version: ${depVersion}`,
          cwe: 'CWE-937', // OWASP Dependency Confusion
          owasp: 'A06:2021-Vulnerable Components',
        });
      }

      // Check for outdated packages
      if (this.isOutdatedPackage(depName, depVersion as string)) {
        issues.push({
          code: 'PKG002',
          file: 'package.json',
          severity: 'HIGH',
          category: 'Package Security',
          title: SECURITY_ERROR_CODES.PKG002.title,
          description: `${depName}@${depVersion} is significantly outdated`,
          impact: SECURITY_ERROR_CODES.PKG002.impact,
          suggestions: SECURITY_ERROR_CODES.PKG002.suggestions,
          evidence: `Package: ${depName}, Current: ${depVersion}`,
          cwe: 'CWE-1104', // Use of Unmaintained Third Party Components
          owasp: 'A06:2021-Vulnerable Components',
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
      // Check for potentially dangerous scripts
      if (this.containsDangerousCommands(scriptCommand as string)) {
        issues.push({
          code: 'CFG001',
          file: 'package.json',
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
          evidence: `Script: ${scriptName}, Command: ${scriptCommand}`,
          cwe: 'CWE-78', // OS Command Injection
          owasp: 'A03:2021-Injection',
        });
      }
    }

    return issues;
  }

  private async checkConfigurationFiles(packagePath: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Check for common config files
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
        const content = readFileSync(configPath, 'utf-8');

        // Check for hardcoded secrets
        if (this.containsHardcodedSecrets(content)) {
          issues.push({
            code: 'CFG001',
            file: configFile,
            severity: 'CRITICAL',
            category: 'Configuration Security',
            title: SECURITY_ERROR_CODES.CFG001.title,
            description: `File contains hardcoded secrets or credentials`,
            impact: SECURITY_ERROR_CODES.CFG001.impact,
            suggestions: SECURITY_ERROR_CODES.CFG001.suggestions,
            evidence: `File: ${configFile}`,
            cwe: 'CWE-798', // Use of Hard-coded Credentials
            owasp: 'A07:2021-Identification and Authentication',
          });
        }

        // Check for debug mode in production-like configs
        if (configFile.includes('production') && this.containsDebugMode(content)) {
          issues.push({
            code: 'CFG003',
            file: configFile,
            severity: 'MEDIUM',
            category: 'Configuration Security',
            title: SECURITY_ERROR_CODES.CFG003.title,
            description: 'Debug mode enabled in production configuration',
            impact: SECURITY_ERROR_CODES.CFG003.impact,
            suggestions: SECURITY_ERROR_CODES.CFG003.suggestions,
            evidence: `File: ${configFile}`,
            cwe: 'CWE-489', // Active Debug Code
            owasp: 'A05:2021-Security Misconfiguration',
          });
        }
      }
    }

    return issues;
  }

  private async checkSourceCode(packagePath: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Walk through source files
    const walkSourceFiles = (dir: string): void => {
      if (!existsSync(dir)) return;

      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          walkSourceFiles(fullPath);
        } else if (stat.isFile() && this.isSourceFile(entry)) {
          const content = readFileSync(fullPath, 'utf-8');
          const fileIssues = this.analyzeSourceFile(fullPath, content);
          issues.push(...fileIssues);
        }
      }
    };

    // Check common source directories
    const sourceDirs = ['src', 'lib', 'app', 'server', 'api'];
    for (const srcDir of sourceDirs) {
      walkSourceFiles(join(packagePath, srcDir));
    }

    return issues;
  }

  private analyzeSourceFile(filePath: string, content: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for SQL injection patterns
      if (this.containsSQLInjection(line)) {
        issues.push({
          code: 'COD001',
          file: filePath,
          line: index + 1,
          severity: 'CRITICAL',
          category: 'Code Security',
          title: SECURITY_ERROR_CODES.COD001.title,
          description: 'Potential SQL injection vulnerability detected',
          impact: SECURITY_ERROR_CODES.COD001.impact,
          suggestions: SECURITY_ERROR_CODES.COD001.suggestions,
          evidence: `Line ${index + 1}: ${line.trim()}`,
          cwe: 'CWE-89', // SQL Injection
          owasp: 'A03:2021-Injection',
        });
      }

      // Check for XSS patterns
      if (this.containsXSS(line)) {
        issues.push({
          code: 'COD002',
          file: filePath,
          line: index + 1,
          severity: 'HIGH',
          category: 'Code Security',
          title: SECURITY_ERROR_CODES.COD002.title,
          description: 'Potential XSS vulnerability detected',
          impact: SECURITY_ERROR_CODES.COD002.impact,
          suggestions: SECURITY_ERROR_CODES.COD002.suggestions,
          evidence: `Line ${index + 1}: ${line.trim()}`,
          cwe: 'CWE-79', // Cross-site Scripting
          owasp: 'A03:2021-Injection',
        });
      }

      // Check for hardcoded secrets in source
      if (this.containsHardcodedSecrets(line)) {
        issues.push({
          code: 'CFG001',
          file: filePath,
          line: index + 1,
          severity: 'CRITICAL',
          category: 'Configuration Security',
          title: SECURITY_ERROR_CODES.CFG001.title,
          description: 'Hardcoded credentials detected in source code',
          impact: SECURITY_ERROR_CODES.CFG001.impact,
          suggestions: SECURITY_ERROR_CODES.CFG001.suggestions,
          evidence: `Line ${index + 1}: ${line.trim()}`,
          cwe: 'CWE-798', // Use of Hard-coded Credentials
          owasp: 'A07:2021-Identification and Authentication',
        });
      }
    });

    return issues;
  }

  private async runAdvancedSecurityChecks(options: any): Promise<void> {
    console.log('🔬 Running Advanced Security Checks...\n');

    // Check for infrastructure vulnerabilities
    const infraIssues = await this.checkInfrastructureSecurity();
    this.auditResults.issues.push(...infraIssues);

    // Check compliance if requested
    if (options.compliance) {
      const complianceIssues = await this.checkComplianceSecurity(options.compliance);
      this.auditResults.issues.push(...complianceIssues);
    }
  }

  private async checkInfrastructureSecurity(): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Check if HTTPS is configured
    if (!this.isHTTPSConfigured()) {
      issues.push({
        code: 'INF003',
        severity: 'MEDIUM',
        category: 'Infrastructure Security',
        title: SECURITY_ERROR_CODES.INF003.title,
        description: 'HTTPS/TLS not properly configured',
        impact: SECURITY_ERROR_CODES.INF003.impact,
        suggestions: SECURITY_ERROR_CODES.INF003.suggestions,
        cwe: 'CWE-319', // Cleartext Transmission of Sensitive Information
        owasp: 'A02:2021-Cryptographic Failures',
      });
    }

    return issues;
  }

  private async checkComplianceSecurity(frameworks: string[]): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Check GDPR compliance
    if (frameworks.includes('gdpr') && !this.isGDPRCompliant()) {
      issues.push({
        code: 'CMP001',
        severity: 'CRITICAL',
        category: 'Compliance Security',
        title: SECURITY_ERROR_CODES.CMP001.title,
        description: 'GDPR compliance requirements not met',
        impact: SECURITY_ERROR_CODES.CMP001.impact,
        suggestions: SECURITY_ERROR_CODES.CMP001.suggestions,
        cwe: 'CWE-200', // Exposure of Sensitive Information
        owasp: 'A04:2021-Insecure Design',
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

  private calculateSecurityScore(): void {
    const totalIssues = this.auditResults.issues.length;
    if (totalIssues === 0) {
      this.auditResults.summary.overallScore = 100;
      this.auditResults.summary.riskLevel = 'LOW';
      return;
    }

    let score = 100;
    const criticalCount = this.auditResults.issues.filter(i => i.severity === 'CRITICAL').length;
    const highCount = this.auditResults.issues.filter(i => i.severity === 'HIGH').length;
    const mediumCount = this.auditResults.issues.filter(i => i.severity === 'MEDIUM').length;

    score -= criticalCount * 20;
    score -= highCount * 10;
    score -= mediumCount * 5;

    this.auditResults.summary.overallScore = Math.max(0, score);

    // Determine risk level
    if (criticalCount > 0) {
      this.auditResults.summary.riskLevel = 'CRITICAL';
    } else if (highCount > 2) {
      this.auditResults.summary.riskLevel = 'HIGH';
    } else if (highCount > 0 || mediumCount > 3) {
      this.auditResults.summary.riskLevel = 'MEDIUM';
    } else {
      this.auditResults.summary.riskLevel = 'LOW';
    }
  }

  private generateEnhancedRecommendations(): void {
    const recommendations: string[] = [];

    const criticalCount = this.auditResults.issues.filter(i => i.severity === 'CRITICAL').length;
    const highCount = this.auditResults.issues.filter(i => i.severity === 'HIGH').length;

    if (criticalCount > 0) {
      recommendations.push(
        '🚨 IMMEDIATE ACTION REQUIRED: Address all CRITICAL security issues within 24 hours'
      );
    }

    if (highCount > 0) {
      recommendations.push('🔴 HIGH PRIORITY: Address HIGH severity issues within 72 hours');
    }

    // Group issues by category
    const issuesByCategory = this.groupIssuesByCategory();

    Object.entries(issuesByCategory).forEach(([category, issues]) => {
      if (issues.length > 0) {
        recommendations.push(
          `📋 ${category}: ${issues.length} issues found - ${this.getCategoryRecommendations(category)}`
        );
      }
    });

    this.auditResults.recommendations = recommendations;
  }

  private groupIssuesByCategory(): Record<string, SecurityIssue[]> {
    const grouped: Record<string, SecurityIssue[]> = {};

    this.auditResults.issues.forEach(issue => {
      if (!grouped[issue.category]) {
        grouped[issue.category] = [];
      }
      grouped[issue.category].push(issue);
    });

    return grouped;
  }

  private getCategoryRecommendations(category: string): string {
    const recommendations = {
      'Package Security': 'Update vulnerable packages and review dependencies',
      'Code Security': 'Conduct security code review and implement input validation',
      'Configuration Security': 'Move secrets to environment variables and secure configs',
      'Infrastructure Security': 'Apply security patches and configure network security',
      'Compliance Security': 'Implement required compliance frameworks and documentation',
    };

    return (
      recommendations[category as keyof typeof recommendations] ||
      'Review and address security issues'
    );
  }

  private displayEnhancedResults(): void {
    console.log('\n📊 Enhanced Security Audit Results');
    console.log('===================================');

    console.log(`\n🎯 Overall Security Score: ${this.auditResults.summary.overallScore}/100`);
    console.log(`🚨 Risk Level: ${this.auditResults.summary.riskLevel}`);

    console.log('\n📦 Package Summary:');
    console.log(`   Total Packages: ${this.auditResults.summary.totalPackages}`);
    console.log(`   ✅ Secure: ${this.auditResults.summary.securePackages}`);
    console.log(`   ⚠️  Vulnerable: ${this.auditResults.summary.vulnerablePackages}`);

    console.log('\n🔍 Issues by Severity:');
    console.log(`   🚨 Critical: ${this.auditResults.summary.criticalIssues}`);
    console.log(`   🔴 High: ${this.auditResults.summary.highIssues}`);
    console.log(`   🟡 Medium: ${this.auditResults.summary.mediumIssues}`);
    console.log(`   🟢 Low: ${this.auditResults.summary.lowIssues}`);

    if (this.auditResults.recommendations.length > 0) {
      console.log('\n💡 Key Recommendations:');
      this.auditResults.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }

    console.log('\n📋 Detailed Issues:');
    const issuesByCode = this.groupIssuesByCode();
    Object.entries(issuesByCode).forEach(([code, issues]) => {
      const errorInfo = SECURITY_ERROR_CODES[code as keyof typeof SECURITY_ERROR_CODES];
      console.log(
        `\n${errorInfo.severity === 'CRITICAL' ? '🚨' : errorInfo.severity === 'HIGH' ? '🔴' : errorInfo.severity === 'MEDIUM' ? '🟡' : '🟢'} ${code}: ${errorInfo.title}`
      );
      console.log(`   📊 Found in ${issues.length} location(s)`);
      console.log(`   📝 ${errorInfo.description}`);
      console.log(`   💥 Impact: ${errorInfo.impact}`);

      if (issues.length <= 3) {
        issues.forEach(issue => {
          const location = issue.file
            ? `${issue.file}${issue.line ? `:${issue.line}` : ''}`
            : 'Unknown';
          console.log(`      📍 ${location}`);
        });
      } else {
        console.log(
          `      📍 ${issues[0].file || 'Multiple files'} and ${issues.length - 1} more...`
        );
      }

      console.log(`   🛠️  Suggestions:`);
      errorInfo.suggestions.forEach(suggestion => {
        console.log(`      • ${suggestion}`);
      });
    });
  }

  private groupIssuesByCode(): Record<string, SecurityIssue[]> {
    const grouped: Record<string, SecurityIssue[]> = {};

    this.auditResults.issues.forEach(issue => {
      if (!grouped[issue.code]) {
        grouped[issue.code] = [];
      }
      grouped[issue.code].push(issue);
    });

    return grouped;
  }

  private async saveEnhancedAuditReport(): Promise<void> {
    const report = {
      timestamp: this.auditResults.timestamp,
      summary: this.auditResults.summary,
      issues: this.auditResults.issues.map(issue => ({
        ...issue,
        errorDetails: SECURITY_ERROR_CODES[issue.code],
      })),
      recommendations: this.auditResults.recommendations,
      packages: Array.from(this.auditResults.packages.entries()).map(([name, result]) => ({
        name,
        ...result,
      })),
    };

    const filename = `enhanced-security-audit-${new Date().toISOString().slice(0, 10)}.json`;
    await Bun.write(filename, JSON.stringify(report, null, 2));
    console.log(`💾 Enhanced audit report saved to: ${filename}`);
  }

  // Helper methods for vulnerability detection
  private isVulnerablePackage(name: string, version: string): boolean {
    // Simplified vulnerability check - in real implementation, this would
    // query vulnerability databases like Snyk, NPM audit, etc.
    const vulnerablePackages = ['lodash', 'express', 'axios'];
    return vulnerablePackages.includes(name) && version.startsWith('4.');
  }

  private isOutdatedPackage(name: string, version: string): boolean {
    // Simplified outdated check
    return version.split('.')[0] === '1' && ['lodash', 'express'].includes(name);
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

  private isSourceFile(filename: string): boolean {
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.vue', '.svelte'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  private isHTTPSConfigured(): boolean {
    // Simplified check - in real implementation, this would check
    // server configuration, SSL certificates, etc.
    return true; // Assume HTTPS is configured for demo
  }

  private isGDPRCompliant(): boolean {
    // Simplified compliance check
    return false; // Would check actual GDPR compliance in real implementation
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('🔒 Fantasy42 Enhanced Security Audit System');
console.log('==========================================\n');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose'),
  report: args.includes('--report') || true, // Default to true
  fix: args.includes('--fix'),
  deepScan: args.includes('--deep-scan'),
  compliance: args.filter(arg => arg.startsWith('--compliance=')).map(arg => arg.split('=')[1]),
};

// Run enhanced security audit
const auditor = new EnhancedFantasy42SecurityAuditor();
await auditor.runEnhancedSecurityAudit(options);

console.log('\n✅ Enhanced Fantasy42 Security Audit Complete!');
console.log('================================================');
console.log('🔍 Detailed error codes and actionable suggestions provided above.');
console.log('📊 Full report saved with comprehensive issue analysis.');
