#!/usr/bin/env bun

/**
 * 🔍 Comprehensive Package Audit System for Fantasy42-Fire22
 *
 * Enterprise-grade package auditing, security scanning, and compliance checking
 * Audits all packages across the monorepo for vulnerabilities and issues
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { Database } from 'bun:sqlite';

interface PackageInfo {
  name: string;
  version: string;
  path: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  hasPackageJson: boolean;
  hasBunLock: boolean;
  hasNodeModules: boolean;
  size: number;
  lastModified: Date;
}

interface AuditResult {
  package: PackageInfo;
  security: SecurityIssue[];
  dependencies: DependencyIssue[];
  compliance: ComplianceIssue[];
  performance: PerformanceMetric[];
  score: number; // 0-100
}

interface SecurityIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  package?: string;
  recommendation: string;
  cve?: string;
}

interface DependencyIssue {
  type: 'MISSING' | 'OUTDATED' | 'UNUSED' | 'DUPLICATE' | 'CIRCULAR';
  package: string;
  current?: string;
  latest?: string;
  description: string;
}

interface ComplianceIssue {
  standard: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  description: string;
  remediation?: string;
}

interface PerformanceMetric {
  metric: string;
  value: number;
  unit: string;
  status: 'GOOD' | 'WARN' | 'CRITICAL';
}

class ComprehensivePackageAudit {
  private db: Database;
  private auditResults: AuditResult[] = [];
  private scannedPaths: Set<string> = new Set();

  constructor() {
    this.db = new Database(':memory:');
    this.initializeAuditDatabase();
  }

  private initializeAuditDatabase(): void {
    this.db.run(`
      CREATE TABLE audit_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        package_name TEXT NOT NULL,
        package_path TEXT NOT NULL,
        audit_score INTEGER,
        security_issues INTEGER,
        dependency_issues INTEGER,
        compliance_issues INTEGER,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE security_findings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        package_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        recommendation TEXT,
        cve TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE dependency_issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        package_name TEXT NOT NULL,
        issue_type TEXT NOT NULL,
        dependency_name TEXT,
        current_version TEXT,
        latest_version TEXT,
        description TEXT
      )
    `);
  }

  private async findAllPackages(rootPath: string = '.'): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = [];
    const rootPackageJson = join(rootPath, 'package.json');

    // Check root package
    if (existsSync(rootPackageJson)) {
      packages.push(await this.analyzePackage(rootPath));
    }

    // Find all sub-packages
    const subdirs = [
      'enterprise/packages',
      'dashboard-worker/packages',
      'packages',
      'catalog-demo',
      'docs-worker',
    ];

    for (const subdir of subdirs) {
      const subPath = join(rootPath, subdir);
      if (existsSync(subPath)) {
        packages.push(...(await this.scanDirectoryForPackages(subPath)));
      }
    }

    return packages;
  }

  private async scanDirectoryForPackages(dirPath: string): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = [];

    // Use Node.js fs to recursively find package.json files
    const findPackageJsonFiles = (dir: string): string[] => {
      const results: string[] = [];
      const items = require('fs').readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = join(dir, item.name);

        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          // Check if this directory has a package.json
          const packageJsonPath = join(fullPath, 'package.json');
          if (existsSync(packageJsonPath)) {
            results.push(packageJsonPath);
          }
          // Recursively search subdirectories
          results.push(...findPackageJsonFiles(fullPath));
        }
      }

      return results;
    };

    try {
      const packageFiles = findPackageJsonFiles(dirPath);

      for (const packageFile of packageFiles) {
        const packagePath = dirname(packageFile);
        if (!this.scannedPaths.has(packagePath)) {
          this.scannedPaths.add(packagePath);
          packages.push(await this.analyzePackage(packagePath));
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to scan directory ${dirPath}:`, error.message);
    }

    return packages;
  }

  private async analyzePackage(packagePath: string): Promise<PackageInfo> {
    const packageJsonPath = join(packagePath, 'package.json');
    const bunLockPath = join(packagePath, 'bun.lock');
    const nodeModulesPath = join(packagePath, 'node_modules');

    let packageData = {
      name: 'unknown',
      version: '0.0.0',
      dependencies: {},
      devDependencies: {},
      scripts: {},
    };

    let hasPackageJson = false;
    let hasBunLock = false;
    let hasNodeModules = false;
    let size = 0;
    let lastModified = new Date();

    if (existsSync(packageJsonPath)) {
      hasPackageJson = true;
      const stats = statSync(packageJsonPath);
      lastModified = stats.mtime;

      try {
        const content = readFileSync(packageJsonPath, 'utf-8');
        packageData = JSON.parse(content);
      } catch (error) {
        console.warn(`⚠️ Failed to parse ${packageJsonPath}:`, error.message);
      }
    }

    hasBunLock = existsSync(bunLockPath);
    hasNodeModules = existsSync(nodeModulesPath);

    // Calculate package size (rough estimate)
    try {
      const calculateDirectorySize = (dir: string): number => {
        let totalSize = 0;
        const items = require('fs').readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
          const fullPath = join(dir, item.name);

          if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
            totalSize += calculateDirectorySize(fullPath);
          } else if (item.isFile()) {
            try {
              const stats = statSync(fullPath);
              totalSize += stats.size;
            } catch (error) {
              // Skip files that can't be accessed
            }
          }
        }

        return totalSize;
      };

      size = calculateDirectorySize(packagePath);
    } catch (error) {
      console.warn(`⚠️ Failed to calculate size for ${packagePath}:`, error.message);
    }

    return {
      name: packageData.name || 'unknown',
      version: packageData.version || '0.0.0',
      path: packagePath,
      dependencies: packageData.dependencies || {},
      devDependencies: packageData.devDependencies || {},
      scripts: packageData.scripts || {},
      hasPackageJson,
      hasBunLock,
      hasNodeModules,
      size,
      lastModified,
    };
  }

  private auditPackageSecurity(packageInfo: PackageInfo): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for known vulnerable packages
    const vulnerablePackages = [
      'left-pad', // Historical vulnerability
      'event-stream', // Malicious package
      'flatmap-stream', // Malicious dependency
      'mongoose', // Had issues in older versions
      'lodash', // Had prototype pollution issues
    ];

    const allDeps = { ...packageInfo.dependencies, ...packageInfo.devDependencies };

    for (const [dep, version] of Object.entries(allDeps)) {
      if (vulnerablePackages.includes(dep)) {
        issues.push({
          severity: 'HIGH',
          title: 'Known Vulnerable Package',
          description: `Package ${dep}@${version} has known security vulnerabilities`,
          package: dep,
          recommendation: 'Update to latest secure version or find alternative',
        });
      }

      // Check for overly permissive version ranges
      if (version.includes('*') || version.includes('>=')) {
        issues.push({
          severity: 'MEDIUM',
          title: 'Permissive Version Range',
          description: `Package ${dep} uses overly permissive version range: ${version}`,
          package: dep,
          recommendation: 'Use specific version ranges (^x.y.z or ~x.y.z) for better security',
        });
      }
    }

    // Check for missing package.json
    if (!packageInfo.hasPackageJson) {
      issues.push({
        severity: 'HIGH',
        title: 'Missing Package Manifest',
        description: 'Package directory missing package.json file',
        recommendation: 'Create package.json with proper metadata and dependencies',
      });
    }

    // Check for unauthorized scripts
    const dangerousScripts = ['preinstall', 'postinstall', 'install'];
    for (const script of dangerousScripts) {
      if (packageInfo.scripts[script]) {
        issues.push({
          severity: 'HIGH',
          title: 'Potentially Dangerous Script',
          description: `Package contains ${script} script which can execute arbitrary code`,
          recommendation: 'Review and audit install scripts for security risks',
        });
      }
    }

    return issues;
  }

  private auditPackageDependencies(packageInfo: PackageInfo): DependencyIssue[] {
    const issues: DependencyIssue[] = [];

    // Check for missing dependencies
    const allDeps = { ...packageInfo.dependencies, ...packageInfo.devDependencies };

    for (const [dep, version] of Object.entries(allDeps)) {
      // This is a simplified check - in a real audit, you'd check against
      // actual installed versions and registries
      if (version.includes('file:') || version.includes('link:')) {
        issues.push({
          type: 'UNUSED',
          package: dep,
          description: 'Local file dependency detected',
          current: version,
        });
      }
    }

    // Check for dependency size
    const depCount = Object.keys(packageInfo.dependencies).length;
    const devDepCount = Object.keys(packageInfo.devDependencies).length;

    if (depCount > 50) {
      issues.push({
        type: 'OUTDATED',
        package: 'dependency-count',
        description: `Package has ${depCount} dependencies - consider reducing`,
        current: depCount.toString(),
      });
    }

    return issues;
  }

  private auditPackageCompliance(packageInfo: PackageInfo): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];

    // Check for required fields
    const requiredFields = ['name', 'version', 'description'];
    for (const field of requiredFields) {
      if (!packageInfo[field as keyof PackageInfo]) {
        issues.push({
          standard: 'NPM',
          status: 'FAIL',
          description: `Missing required field: ${field}`,
          remediation: `Add ${field} to package.json`,
        });
      }
    }

    // Check for license
    if (!packageInfo.dependencies.license && !packageInfo.devDependencies.license) {
      issues.push({
        standard: 'OSS',
        status: 'WARN',
        description: 'Package missing license information',
        remediation: 'Add license field to package.json',
      });
    }

    // Check for repository
    if (!packageInfo.dependencies.repository && !packageInfo.devDependencies.repository) {
      issues.push({
        standard: 'MAINTAINABILITY',
        status: 'WARN',
        description: 'Package missing repository information',
        remediation: 'Add repository field to package.json',
      });
    }

    return issues;
  }

  private auditPackagePerformance(packageInfo: PackageInfo): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = [];

    // Package size metric
    const sizeInMB = packageInfo.size / (1024 * 1024);
    let sizeStatus: 'GOOD' | 'WARN' | 'CRITICAL' = 'GOOD';
    if (sizeInMB > 100) sizeStatus = 'CRITICAL';
    else if (sizeInMB > 50) sizeStatus = 'WARN';

    metrics.push({
      metric: 'package_size',
      value: Math.round(sizeInMB * 100) / 100,
      unit: 'MB',
      status: sizeStatus,
    });

    // Dependency count metric
    const depCount = Object.keys(packageInfo.dependencies).length;
    let depStatus: 'GOOD' | 'WARN' | 'CRITICAL' = 'GOOD';
    if (depCount > 100) depStatus = 'CRITICAL';
    else if (depCount > 50) depStatus = 'WARN';

    metrics.push({
      metric: 'dependency_count',
      value: depCount,
      unit: 'packages',
      status: depStatus,
    });

    // File age metric (how recently modified)
    const ageInDays = (Date.now() - packageInfo.lastModified.getTime()) / (1000 * 60 * 60 * 24);
    let ageStatus: 'GOOD' | 'WARN' | 'CRITICAL' = 'GOOD';
    if (ageInDays > 365) ageStatus = 'WARN';
    else if (ageInDays > 730) ageStatus = 'CRITICAL';

    metrics.push({
      metric: 'last_modified',
      value: Math.round(ageInDays),
      unit: 'days',
      status: ageStatus,
    });

    return metrics;
  }

  private calculateAuditScore(
    security: SecurityIssue[],
    dependencies: DependencyIssue[],
    compliance: ComplianceIssue[]
  ): number {
    let score = 100;

    // Deduct points for security issues
    for (const issue of security) {
      switch (issue.severity) {
        case 'CRITICAL':
          score -= 25;
          break;
        case 'HIGH':
          score -= 15;
          break;
        case 'MEDIUM':
          score -= 10;
          break;
        case 'LOW':
          score -= 5;
          break;
      }
    }

    // Deduct points for dependency issues
    score -= dependencies.length * 5;

    // Deduct points for compliance issues
    for (const issue of compliance) {
      if (issue.status === 'FAIL') score -= 10;
      else if (issue.status === 'WARN') score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  public async runFullAudit(): Promise<void> {
    console.log('🔍 Starting Comprehensive Package Audit...\n');

    const startTime = Date.now();
    const packages = await this.findAllPackages();

    console.log(`📦 Found ${packages.length} packages to audit\n`);

    for (const packageInfo of packages) {
      console.log(`🔍 Auditing: ${packageInfo.name}@${packageInfo.version}`);

      const security = this.auditPackageSecurity(packageInfo);
      const dependencies = this.auditPackageDependencies(packageInfo);
      const compliance = this.auditPackageCompliance(packageInfo);
      const performance = this.auditPackagePerformance(packageInfo);
      const score = this.calculateAuditScore(security, dependencies, compliance);

      const result: AuditResult = {
        package: packageInfo,
        security,
        dependencies,
        compliance,
        performance,
        score,
      };

      this.auditResults.push(result);

      // Store in database
      this.db.run(
        'INSERT INTO audit_results (package_name, package_path, audit_score, security_issues, dependency_issues, compliance_issues) VALUES (?, ?, ?, ?, ?, ?)',
        packageInfo.name,
        packageInfo.path,
        score,
        security.length,
        dependencies.length,
        compliance.length
      );

      // Store detailed findings
      for (const issue of security) {
        this.db.run(
          'INSERT INTO security_findings (package_name, severity, title, description, recommendation, cve) VALUES (?, ?, ?, ?, ?, ?)',
          packageInfo.name,
          issue.severity,
          issue.title,
          issue.description,
          issue.recommendation,
          issue.cve || ''
        );
      }

      for (const issue of dependencies) {
        this.db.run(
          'INSERT INTO dependency_issues (package_name, issue_type, dependency_name, current_version, latest_version, description) VALUES (?, ?, ?, ?, ?, ?)',
          packageInfo.name,
          issue.type,
          issue.package,
          issue.current || '',
          issue.latest || '',
          issue.description
        );
      }

      console.log(
        `   ✅ Score: ${score}/100 (${security.length} security, ${dependencies.length} deps, ${compliance.length} compliance issues)\n`
      );
    }

    const totalTime = Date.now() - startTime;
    this.displayAuditReport(totalTime);
  }

  private displayAuditReport(totalTime: number): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE PACKAGE AUDIT REPORT');
    console.log('='.repeat(80));

    const totalPackages = this.auditResults.length;
    const averageScore = Math.round(
      this.auditResults.reduce((sum, r) => sum + r.score, 0) / totalPackages
    );
    const totalSecurityIssues = this.auditResults.reduce((sum, r) => sum + r.security.length, 0);
    const totalDependencyIssues = this.auditResults.reduce(
      (sum, r) => sum + r.dependencies.length,
      0
    );
    const totalComplianceIssues = this.auditResults.reduce(
      (sum, r) => sum + r.compliance.length,
      0
    );

    console.log(`\n📈 Audit Summary:`);
    console.log(`   ⏱️  Total Audit Time: ${Math.round(totalTime / 1000)}s`);
    console.log(`   📦 Packages Audited: ${totalPackages}`);
    console.log(`   🎯 Average Score: ${averageScore}/100`);
    console.log(`   🔒 Security Issues: ${totalSecurityIssues}`);
    console.log(`   📦 Dependency Issues: ${totalDependencyIssues}`);
    console.log(`   📋 Compliance Issues: ${totalComplianceIssues}`);

    // Score distribution
    const scoreRanges = {
      excellent: this.auditResults.filter(r => r.score >= 90).length,
      good: this.auditResults.filter(r => r.score >= 70 && r.score < 90).length,
      fair: this.auditResults.filter(r => r.score >= 50 && r.score < 70).length,
      poor: this.auditResults.filter(r => r.score < 50).length,
    };

    console.log(`\n📊 Score Distribution:`);
    console.log(`   🟢 Excellent (90-100): ${scoreRanges.excellent} packages`);
    console.log(`   🟡 Good (70-89): ${scoreRanges.good} packages`);
    console.log(`   🟠 Fair (50-69): ${scoreRanges.fair} packages`);
    console.log(`   🔴 Poor (<50): ${scoreRanges.poor} packages`);

    // Top security issues
    if (totalSecurityIssues > 0) {
      console.log(`\n🚨 Top Security Issues:`);
      const allSecurityIssues = this.auditResults.flatMap(r => r.security);
      const issueCounts = allSecurityIssues.reduce(
        (acc, issue) => {
          acc[issue.title] = (acc[issue.title] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      Object.entries(issueCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([title, count]) => {
          console.log(`   • ${title}: ${count} occurrences`);
        });
    }

    // Package size analysis
    const totalSize = this.auditResults.reduce((sum, r) => sum + r.package.size, 0);
    const avgSize = Math.round((totalSize / totalPackages / (1024 * 1024)) * 100) / 100;

    console.log(`\n💾 Package Size Analysis:`);
    console.log(`   📊 Total Size: ${Math.round(totalSize / (1024 * 1024))} MB`);
    console.log(`   📈 Average Size: ${avgSize} MB per package`);

    // Recommendations
    console.log(`\n💡 Recommendations:`);

    if (averageScore >= 80) {
      console.log(`   ✅ Overall package health is excellent`);
    } else if (averageScore >= 60) {
      console.log(`   ⚠️  Consider addressing security and dependency issues`);
    } else {
      console.log(`   🚨 Critical: Immediate attention required for security issues`);
    }

    if (totalSecurityIssues > 0) {
      console.log(`   🔒 Review and fix ${totalSecurityIssues} security issues`);
    }

    if (totalDependencyIssues > 0) {
      console.log(`   📦 Audit ${totalDependencyIssues} dependency issues`);
    }

    if (totalComplianceIssues > 0) {
      console.log(`   📋 Address ${totalComplianceIssues} compliance issues`);
    }

    console.log('='.repeat(80));
  }

  public getAuditResults(): AuditResult[] {
    return this.auditResults;
  }

  public exportReport(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(
        {
          summary: {
            totalPackages: this.auditResults.length,
            averageScore: Math.round(
              this.auditResults.reduce((sum, r) => sum + r.score, 0) / this.auditResults.length
            ),
            totalSecurityIssues: this.auditResults.reduce((sum, r) => sum + r.security.length, 0),
            totalDependencyIssues: this.auditResults.reduce(
              (sum, r) => sum + r.dependencies.length,
              0
            ),
            totalComplianceIssues: this.auditResults.reduce(
              (sum, r) => sum + r.compliance.length,
              0
            ),
          },
          results: this.auditResults,
        },
        null,
        2
      );
    }

    // CSV format
    let csv = 'Package,Score,Security Issues,Dependency Issues,Compliance Issues,Size (MB)\n';
    for (const result of this.auditResults) {
      const sizeMB = Math.round((result.package.size / (1024 * 1024)) * 100) / 100;
      csv += `${result.package.name},${result.score},${result.security.length},${result.dependencies.length},${result.compliance.length},${sizeMB}\n`;
    }
    return csv;
  }

  public close(): void {
    this.db.close();
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'audit';
  const format = (args[1] as 'json' | 'csv') || 'json';

  const auditor = new ComprehensivePackageAudit();

  switch (command) {
    case 'audit':
      await auditor.runFullAudit();
      auditor.close();
      break;

    case 'export':
      await auditor.runFullAudit();
      const report = auditor.exportReport(format);
      const ext = format === 'json' ? 'json' : 'csv';
      const filename = `package-audit-report-${new Date().toISOString().split('T')[0]}.${ext}`;
      await Bun.write(filename, report);
      console.log(`📄 Report exported to: ${filename}`);
      auditor.close();
      break;

    case 'quick':
      await auditor.runFullAudit();
      const results = auditor.getAuditResults();
      const summary = results.reduce(
        (acc, r) => ({
          total: acc.total + 1,
          excellent: acc.excellent + (r.score >= 90 ? 1 : 0),
          good: acc.good + (r.score >= 70 && r.score < 90 ? 1 : 0),
          fair: acc.fair + (r.score >= 50 && r.score < 70 ? 1 : 0),
          poor: acc.poor + (r.score < 50 ? 1 : 0),
        }),
        { total: 0, excellent: 0, good: 0, fair: 0, poor: 0 }
      );

      console.log('\n📊 Quick Summary:');
      console.log(`   Total Packages: ${summary.total}`);
      console.log(`   🟢 Excellent: ${summary.excellent}`);
      console.log(`   🟡 Good: ${summary.good}`);
      console.log(`   🟠 Fair: ${summary.fair}`);
      console.log(`   🔴 Poor: ${summary.poor}`);
      auditor.close();
      break;

    default:
      console.log(
        'Usage: bun run scripts/comprehensive-package-audit.bun.ts [audit|export|quick] [format]'
      );
      console.log('');
      console.log('Commands:');
      console.log('  audit     - Run full comprehensive audit');
      console.log('  export    - Run audit and export report (json/csv)');
      console.log('  quick     - Run audit and show quick summary');
      console.log('');
      console.log('Examples:');
      console.log('  bun run scripts/comprehensive-package-audit.bun.ts audit');
      console.log('  bun run scripts/comprehensive-package-audit.bun.ts export csv');
      auditor.close();
      break;
  }
}
