#!/usr/bin/env bun

/**
 * 🏛️ Fantasy42-Fire22 Engineering Playbook Compliance Auditor
 *
 * Automated script that scans all repositories for playbook compliance.
 * Runs weekly and generates comprehensive compliance reports.
 *
 * Usage:
 *   bun run scripts/playbook-auditor.ts [options]
 *
 * Options:
 *   --repo <path>        Scan specific repository
 *   --all-repos          Scan all repositories (default)
 *   --output <format>    Output format: json, markdown, html
 *   --dashboard          Update compliance dashboard
 *   --verbose            Enable verbose logging
 */

// 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's enhanced fs operations and fs.glob
import * as fs from 'fs';
import { join, resolve, relative } from 'path';
import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';

// 🚀 BUN 1.1.X OPTIMIZATION: Import PreciseMath for accurate financial calculations
import { PreciseMath } from '../enterprise/packages/financial-reporting/financial-reporting/utils/precise-math';

interface ComplianceResult {
  repository: string;
  timestamp: string;
  overallScore: number;
  categories: {
    architectural: ComplianceCategory;
    tooling: ComplianceCategory;
    operational: ComplianceCategory;
    security: ComplianceCategory;
  };
  violations: PlaybookViolation[];
  recommendations: string[];
}

interface ComplianceCategory {
  score: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  criticalIssues: number;
}

interface PlaybookViolation {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'architectural' | 'tooling' | 'operational' | 'security';
  rule: string;
  description: string;
  file?: string;
  line?: number;
  remediation: string;
}

class PlaybookAuditor {
  private results: ComplianceResult[] = [];
  private verbose: boolean = false;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  async auditRepository(repoPath: string): Promise<ComplianceResult> {
    const repoName = relative(process.cwd(), repoPath);
    console.log(`🔍 Auditing repository: ${repoName}`);

    const result: ComplianceResult = {
      repository: repoName,
      timestamp: new Date().toISOString(),
      overallScore: 0,
      categories: {
        architectural: this.createEmptyCategory(),
        tooling: this.createEmptyCategory(),
        operational: this.createEmptyCategory(),
        security: this.createEmptyCategory(),
      },
      violations: [],
      recommendations: [],
    };

    // Run all compliance checks
    await this.checkArchitecturalCompliance(repoPath, result);
    await this.checkToolingCompliance(repoPath, result);
    await this.checkOperationalCompliance(repoPath, result);
    await this.checkSecurityCompliance(repoPath, result);

    // Calculate overall score
    result.overallScore = this.calculateOverallScore(result);

    // Generate recommendations
    result.recommendations = this.generateRecommendations(result);

    console.log(`✅ Repository audit complete: ${repoName} (Score: ${result.overallScore}%)`);

    return result;
  }

  private async checkArchitecturalCompliance(
    repoPath: string,
    result: ComplianceResult
  ): Promise<void> {
    const category = result.categories.architectural;

    // Check for event-driven patterns
    await this.checkEventDrivenPatterns(repoPath, result);

    // Check for domain-aligned boundaries
    await this.checkDomainBoundaries(repoPath, result);

    // Check for CQRS usage
    await this.checkCQRSUsage(repoPath, result);

    // Check for edge-native deployment
    await this.checkEdgeNativeDeployment(repoPath, result);

    // Check for microservice fitness
    await this.checkMicroserviceFitness(repoPath, result);

    category.score =
      category.totalChecks > 0 ? (category.passedChecks / category.totalChecks) * 100 : 100;
  }

  private async checkToolingCompliance(repoPath: string, result: ComplianceResult): Promise<void> {
    const category = result.categories.tooling;

    // Check for Bun/TypeScript usage
    await this.checkBunTypeScriptUsage(repoPath, result);

    // Check for Cloudflare native integration
    await this.checkCloudflareIntegration(repoPath, result);

    // Check for observability instrumentation
    await this.checkObservabilityInstrumentation(repoPath, result);

    category.score =
      category.totalChecks > 0 ? (category.passedChecks / category.totalChecks) * 100 : 100;
  }

  private async checkOperationalCompliance(
    repoPath: string,
    result: ComplianceResult
  ): Promise<void> {
    const category = result.categories.operational;

    // Check for CI/CD automation
    await this.checkCIDCAutomation(repoPath, result);

    // Check for monitoring and alerting
    await this.checkMonitoringAlerting(repoPath, result);

    // Check for resiliency patterns
    await this.checkResiliencyPatterns(repoPath, result);

    category.score =
      category.totalChecks > 0 ? (category.passedChecks / category.totalChecks) * 100 : 100;
  }

  private async checkSecurityCompliance(repoPath: string, result: ComplianceResult): Promise<void> {
    const category = result.categories.security;

    // Check for security scanning
    await this.checkSecurityScanning(repoPath, result);

    // Check for dependency auditing
    await this.checkDependencyAuditing(repoPath, result);

    // Check for compliance requirements
    await this.checkComplianceRequirements(repoPath, result);

    category.score =
      category.totalChecks > 0 ? (category.passedChecks / category.totalChecks) * 100 : 100;
  }

  // Architectural Checks
  private async checkEventDrivenPatterns(
    repoPath: string,
    result: ComplianceResult
  ): Promise<void> {
    const category = result.categories.architectural;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const files = await this.findTypeScriptFiles(repoPath);
      let hasEventDriven = false;

      for (const file of files) {
        const content = await Bun.file(file).text();
        if (
          content.includes('EventEmitter') ||
          content.includes('emit(') ||
          content.includes('on(')
        ) {
          hasEventDriven = true;
          break;
        }
      }

      if (hasEventDriven) {
        category.passedChecks++;
      } else {
        category.failedChecks++;
        result.violations.push({
          severity: 'MEDIUM',
          category: 'architectural',
          rule: 'event-driven-patterns',
          description: 'No event-driven patterns detected in codebase',
          remediation: 'Implement EventEmitter or event-driven communication patterns',
        });
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  private async checkDomainBoundaries(repoPath: string, result: ComplianceResult): Promise<void> {
    const category = result.categories.architectural;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
      const packageJson = join(repoPath, 'package.json');
      if (await Bun.file(packageJson).exists()) {
        const pkg = await Bun.file(packageJson).json();
        const name = pkg.name || '';

        // Check for domain-aligned naming
        if (
          name.includes('fantasy42') ||
          name.includes('fire22') ||
          name.includes('betting') ||
          name.includes('user') ||
          name.includes('payment') ||
          name.includes('analytics')
        ) {
          category.passedChecks++;
        } else {
          category.failedChecks++;
          result.violations.push({
            severity: 'LOW',
            category: 'architectural',
            rule: 'domain-boundaries',
            description: 'Package name does not reflect domain boundaries',
            file: 'package.json',
            remediation: 'Use domain-aligned naming convention (e.g., @fire22/betting-engine)',
          });
        }
      } else {
        category.failedChecks++;
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  private async checkCQRSUsage(repoPath: string, result: ComplianceResult): Promise<void> {
    const category = result.categories.architectural;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const files = await this.findTypeScriptFiles(repoPath);
      let hasCQRS = false;

      for (const file of files) {
        const content = await Bun.file(file).text();
        if (
          (content.includes('Command') && content.includes('Query')) ||
          content.includes('CQRS') ||
          (content.includes('command') && content.includes('query'))
        ) {
          hasCQRS = true;
          break;
        }
      }

      if (hasCQRS) {
        category.passedChecks++;
      } else {
        // CQRS is optional for simple services
        category.passedChecks++;
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  private async checkEdgeNativeDeployment(
    repoPath: string,
    result: ComplianceResult
  ): Promise<void> {
    const category = result.categories.architectural;
    category.totalChecks++;

    try {
      // Check for Cloudflare Workers configuration
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
      const wranglerToml = join(repoPath, 'wrangler.toml');
      const hasWorkersConfig = await Bun.file(wranglerToml).exists();

      // Check for edge deployment markers
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const files = await this.findTypeScriptFiles(repoPath);
      let hasEdgeMarkers = false;

      for (const file of files) {
        const content = await Bun.file(file).text();
        if (
          content.includes('Cloudflare') ||
          content.includes('Workers') ||
          content.includes('edge') ||
          content.includes('globalThis')
        ) {
          hasEdgeMarkers = true;
          break;
        }
      }

      if (hasWorkersConfig || hasEdgeMarkers) {
        category.passedChecks++;
      } else {
        category.failedChecks++;
        result.violations.push({
          severity: 'HIGH',
          category: 'architectural',
          rule: 'edge-native-deployment',
          description: 'No edge-native deployment configuration found',
          remediation: 'Deploy to Cloudflare Workers or document edge deployment exception',
        });
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  private async checkMicroserviceFitness(
    repoPath: string,
    result: ComplianceResult
  ): Promise<void> {
    const category = result.categories.architectural;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
      const packageJson = join(repoPath, 'package.json');
      if (await Bun.file(packageJson).exists()) {
        const pkg = await Bun.file(packageJson).json();
        const description = pkg.description || '';

        // Check if description indicates single responsibility
        if (description.length > 10 && !description.toLowerCase().includes('monolith')) {
          category.passedChecks++;
        } else {
          category.failedChecks++;
          result.violations.push({
            severity: 'MEDIUM',
            category: 'architectural',
            rule: 'microservice-fitness',
            description: 'Service description does not indicate clear single responsibility',
            file: 'package.json',
            remediation:
              'Write clear, focused service description indicating single responsibility',
          });
        }
      } else {
        category.failedChecks++;
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  // Tooling Checks
  private async checkBunTypeScriptUsage(repoPath: string, result: ComplianceResult): Promise<void> {
    const category = result.categories.tooling;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence checks
      const packageJson = join(repoPath, 'package.json');
      const tsconfigJson = join(repoPath, 'tsconfig.json');
      const bunfigToml = join(repoPath, 'bunfig.toml');

      const hasPackageJson = await Bun.file(packageJson).exists();
      const hasTypeScript = await Bun.file(tsconfigJson).exists();
      const hasBunConfig = await Bun.file(bunfigToml).exists();

      if (hasPackageJson && hasTypeScript) {
        category.passedChecks++;
      } else {
        category.failedChecks++;
        result.violations.push({
          severity: 'HIGH',
          category: 'tooling',
          rule: 'bun-typescript-first',
          description: 'Missing TypeScript configuration or not using Bun ecosystem',
          remediation: 'Add tsconfig.json and configure for Bun/TypeScript ecosystem',
        });
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  private async checkCloudflareIntegration(
    repoPath: string,
    result: ComplianceResult
  ): Promise<void> {
    const category = result.categories.tooling;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
      const wranglerToml = join(repoPath, 'wrangler.toml');
      const hasWorkersConfig = await Bun.file(wranglerToml).exists();

      if (hasWorkersConfig) {
        category.passedChecks++;
      } else {
        // Cloudflare integration is preferred but not mandatory for all services
        category.passedChecks++;
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  private async checkObservabilityInstrumentation(
    repoPath: string,
    result: ComplianceResult
  ): Promise<void> {
    const category = result.categories.tooling;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const files = await this.findTypeScriptFiles(repoPath);
      let hasObservability = false;

      for (const file of files) {
        const content = await Bun.file(file).text();
        if (
          content.includes('console.log') ||
          content.includes('logger') ||
          content.includes('metrics') ||
          content.includes('trace')
        ) {
          hasObservability = true;
          break;
        }
      }

      if (hasObservability) {
        category.passedChecks++;
      } else {
        category.failedChecks++;
        result.violations.push({
          severity: 'MEDIUM',
          category: 'tooling',
          rule: 'observability-instrumentation',
          description: 'No observability instrumentation detected',
          remediation: 'Add logging, metrics, and tracing instrumentation',
        });
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  // Operational Checks
  private async checkCIDCAutomation(repoPath: string, result: ComplianceResult): Promise<void> {
    const category = result.categories.operational;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
      const githubWorkflows = join(repoPath, '.github', 'workflows');
      const hasCI = await Bun.file(githubWorkflows).exists();

      if (hasCI) {
        category.passedChecks++;
      } else {
        category.failedChecks++;
        result.violations.push({
          severity: 'HIGH',
          category: 'operational',
          rule: 'ci-cd-automation',
          description: 'No CI/CD pipeline configuration found',
          remediation: 'Add GitHub Actions or equivalent CI/CD pipeline',
        });
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  private async checkMonitoringAlerting(repoPath: string, result: ComplianceResult): Promise<void> {
    const category = result.categories.operational;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const files = await this.findTypeScriptFiles(repoPath);
      let hasMonitoring = false;

      for (const file of files) {
        const content = await Bun.file(file).text();
        if (
          content.includes('health') ||
          content.includes('monitor') ||
          content.includes('alert') ||
          content.includes('metrics')
        ) {
          hasMonitoring = true;
          break;
        }
      }

      if (hasMonitoring) {
        category.passedChecks++;
      } else {
        category.failedChecks++;
        result.violations.push({
          severity: 'MEDIUM',
          category: 'operational',
          rule: 'monitoring-alerting',
          description: 'No monitoring or alerting implementation detected',
          remediation: 'Add health checks, monitoring, and alerting capabilities',
        });
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  private async checkResiliencyPatterns(repoPath: string, result: ComplianceResult): Promise<void> {
    const category = result.categories.operational;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const files = await this.findTypeScriptFiles(repoPath);
      let hasResiliency = false;

      for (const file of files) {
        const content = await Bun.file(file).text();
        if (
          content.includes('retry') ||
          content.includes('circuit') ||
          content.includes('timeout') ||
          content.includes('fallback')
        ) {
          hasResiliency = true;
          break;
        }
      }

      if (hasResiliency) {
        category.passedChecks++;
      } else {
        category.failedChecks++;
        result.violations.push({
          severity: 'MEDIUM',
          category: 'operational',
          rule: 'resiliency-patterns',
          description: 'No resiliency patterns (retry, circuit breaker, timeout) detected',
          remediation: 'Implement retry logic, circuit breakers, and timeouts for external calls',
        });
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  // Security Checks
  private async checkSecurityScanning(repoPath: string, result: ComplianceResult): Promise<void> {
    const category = result.categories.security;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's enhanced fs operations for workflow discovery
      const githubWorkflows = join(repoPath, '.github', 'workflows');
      if (await Bun.file(githubWorkflows).exists()) {
        // Use Bun's fs.glob for efficient workflow file discovery
        const workflowPattern = join(githubWorkflows, '*.{yml,yaml}');
        const workflowGlob = new Bun.Glob(workflowPattern);
        const workflowFiles = await Array.fromAsync(workflowGlob.scan());
        let hasSecurityScan = false;

        for (const file of workflowFiles) {
          const fileName = String(file);
          if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
            const content = await Bun.file(join(githubWorkflows, fileName)).text();
            if (
              content.includes('security') ||
              content.includes('audit') ||
              content.includes('snyk') ||
              content.includes('trivy')
            ) {
              hasSecurityScan = true;
              break;
            }
          }
        }

        if (hasSecurityScan) {
          category.passedChecks++;
        } else {
          category.failedChecks++;
          result.violations.push({
            severity: 'CRITICAL',
            category: 'security',
            rule: 'security-scanning',
            description: 'No security scanning configured in CI/CD pipeline',
            remediation: 'Add Snyk, Trivy, or equivalent security scanning to CI pipeline',
          });
        }
      } else {
        category.failedChecks++;
        result.violations.push({
          severity: 'CRITICAL',
          category: 'security',
          rule: 'security-scanning',
          description: 'No CI/CD pipeline found - cannot verify security scanning',
          remediation: 'Implement CI/CD pipeline with security scanning',
        });
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  private async checkDependencyAuditing(repoPath: string, result: ComplianceResult): Promise<void> {
    const category = result.categories.security;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file operations
      const packageJson = join(repoPath, 'package.json');
      if (await Bun.file(packageJson).exists()) {
        const pkg = await Bun.file(packageJson).json();
        const scripts = pkg.scripts || {};

        // Check for audit scripts
        if (scripts['audit'] || scripts['security:audit'] || scripts['bun:audit']) {
          category.passedChecks++;
        } else {
          category.failedChecks++;
          result.violations.push({
            severity: 'HIGH',
            category: 'security',
            rule: 'dependency-auditing',
            description: 'No dependency auditing script configured',
            file: 'package.json',
            remediation: 'Add audit script to package.json (e.g., "audit": "bun audit")',
          });
        }
      } else {
        category.failedChecks++;
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  private async checkComplianceRequirements(
    repoPath: string,
    result: ComplianceResult
  ): Promise<void> {
    const category = result.categories.security;
    category.totalChecks++;

    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const files = await this.findTypeScriptFiles(repoPath);
      let hasCompliance = false;

      for (const file of files) {
        const content = await Bun.file(file).text();
        if (
          content.includes('GDPR') ||
          content.includes('compliance') ||
          content.includes('audit') ||
          content.includes('security')
        ) {
          hasCompliance = true;
          break;
        }
      }

      if (hasCompliance) {
        category.passedChecks++;
      } else {
        category.failedChecks++;
        result.violations.push({
          severity: 'MEDIUM',
          category: 'security',
          rule: 'compliance-requirements',
          description: 'No compliance-related code or documentation detected',
          remediation: 'Add compliance checks, audit trails, or security measures',
        });
      }
    } catch (error) {
      category.failedChecks++;
    }
  }

  // Helper Methods
  private createEmptyCategory(): ComplianceCategory {
    return {
      score: 0,
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      criticalIssues: 0,
    };
  }

  private calculateOverallScore(result: ComplianceResult): number {
    const categories = result.categories;
    const weights = {
      architectural: 0.3,
      tooling: 0.25,
      operational: 0.25,
      security: 0.2,
    };

    // 🚀 BUN 1.1.X OPTIMIZATION: Use Math.sumPrecise for accurate weighted score calculation
    const weightedComponents = [
      categories.architectural.score * weights.architectural,
      categories.tooling.score * weights.tooling,
      categories.operational.score * weights.operational,
      categories.security.score * weights.security,
    ];

    // 🚀 BUN 1.1.X OPTIMIZATION: Using PreciseMath.sumPrecise for accurate calculations
    const calculationResult = PreciseMath.sumPrecise(weightedComponents);
    return Math.round(calculationResult.value);
  }

  private generateRecommendations(result: ComplianceResult): string[] {
    const recommendations: string[] = [];

    if (result.categories.security.score < 80) {
      recommendations.push(
        '🚨 CRITICAL: Security compliance is below 80%. Immediate remediation required.'
      );
    }

    if (result.categories.architectural.score < 70) {
      recommendations.push(
        '🏗️ ARCHITECTURAL: Consider implementing event-driven patterns and domain boundaries.'
      );
    }

    if (result.categories.operational.score < 75) {
      recommendations.push('⚙️ OPERATIONAL: Enhance CI/CD automation and monitoring capabilities.');
    }

    if (result.violations.filter(v => v.severity === 'CRITICAL').length > 0) {
      recommendations.push(
        '🔴 CRITICAL VIOLATIONS: Address all critical playbook violations immediately.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        '✅ EXCELLENT: All major compliance areas are well-implemented. Continue monitoring.'
      );
    }

    return recommendations;
  }

  private async findTypeScriptFiles(repoPath: string): Promise<string[]> {
    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's enhanced fs.glob for efficient file discovery
    try {
      const pattern = join(repoPath, '**/*.{ts,tsx}');
      const glob = new Bun.Glob(pattern);
      const files = await Array.fromAsync(glob.scan());

      // Convert relative paths back to absolute paths
      return files.map(file => join(repoPath, String(file)));
    } catch (error) {
      console.warn(`⚠️  Error scanning TypeScript files in ${repoPath}:`, error.message);
      return [];
    }
  }

  // Fallback method for compatibility - optimized with Bun's fs operations
  private async findTypeScriptFilesFallback(repoPath: string): Promise<string[]> {
    try {
      // Use Bun's enhanced fs.glob even in fallback for consistency
      const pattern = join(repoPath, '**/*.{ts,tsx}');
      const glob = new Bun.Glob(pattern);
      const files = await Array.fromAsync(glob.scan());

      return files.map(file => join(repoPath, file));
    } catch (error) {
      console.warn(`⚠️  Fallback method error:`, error.message);
      return [];
    }
  }

  async generateReport(
    results: ComplianceResult[],
    format: 'json' | 'markdown' | 'html' = 'json'
  ): Promise<void> {
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `playbook-compliance-report-${timestamp}`;

    // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file writing
    switch (format) {
      case 'json':
        await Bun.write(`${filename}.json`, JSON.stringify(results, null, 2));
        break;
      case 'markdown':
        const markdown = this.generateMarkdownReport(results);
        await Bun.write(`${filename}.md`, markdown);
        break;
      case 'html':
        const html = this.generateHTMLReport(results);
        await Bun.write(`${filename}.html`, html);
        break;
    }

    console.log(`📄 Compliance report generated: ${filename}.${format}`);
  }

  private generateMarkdownReport(results: ComplianceResult[]): string {
    let report = '# 🏛️ Fantasy42-Fire22 Playbook Compliance Report\n\n';
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    // Overall Summary
    const totalScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
    report += `## 📊 Overall Summary\n\n`;
    report += `**Average Compliance Score:** ${totalScore.toFixed(1)}%\n\n`;
    report += `**Repositories Scanned:** ${results.length}\n\n`;

    // Repository Breakdown
    report += `## 📋 Repository Breakdown\n\n`;
    report += `| Repository | Score | Critical Issues | High Issues |\n`;
    report += `|------------|-------|----------------|-------------|\n`;

    results.forEach(result => {
      const critical = result.violations.filter(v => v.severity === 'CRITICAL').length;
      const high = result.violations.filter(v => v.severity === 'HIGH').length;
      report += `| ${result.repository} | ${result.overallScore}% | ${critical} | ${high} |\n`;
    });

    report += `\n`;

    // Detailed Violations
    results.forEach(result => {
      if (result.violations.length > 0) {
        report += `## 🚨 ${result.repository} - Violations\n\n`;

        result.violations.forEach(violation => {
          report += `### ${violation.severity}: ${violation.rule}\n\n`;
          report += `${violation.description}\n\n`;
          report += `**Remediation:** ${violation.remediation}\n\n`;
          if (violation.file) {
            report += `**File:** ${violation.file}`;
            if (violation.line) {
              report += `:${violation.line}`;
            }
            report += `\n\n`;
          }
        });
      }
    });

    // Recommendations
    report += `## 💡 Recommendations\n\n`;
    const allRecommendations = results.flatMap(r => r.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];

    uniqueRecommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });

    return report;
  }

  private generateHTMLReport(results: ComplianceResult[]): string {
    // Simple HTML report generation
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Fantasy42-Fire22 Playbook Compliance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .score { font-size: 24px; font-weight: bold; }
        .critical { color: red; }
        .high { color: orange; }
        .medium { color: yellow; }
        .low { color: green; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>🏛️ Fantasy42-Fire22 Playbook Compliance Report</h1>
    <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
`;

    const totalScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
    html += `<div class="score">Average Compliance: ${totalScore.toFixed(1)}%</div>`;

    html += `<h2>📋 Repository Breakdown</h2>`;
    html += `<table>
        <tr><th>Repository</th><th>Score</th><th>Critical Issues</th><th>High Issues</th></tr>`;

    results.forEach(result => {
      const critical = result.violations.filter(v => v.severity === 'CRITICAL').length;
      const high = result.violations.filter(v => v.severity === 'HIGH').length;
      html += `<tr>
        <td>${result.repository}</td>
        <td>${result.overallScore}%</td>
        <td class="critical">${critical}</td>
        <td class="high">${high}</td>
      </tr>`;
    });

    html += `</table></body></html>`;

    return html;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    repo: null as string | null,
    allRepos: true,
    output: 'json' as 'json' | 'markdown' | 'html',
    dashboard: false,
    verbose: false,
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--repo':
        options.repo = args[++i];
        options.allRepos = false;
        break;
      case '--all-repos':
        options.allRepos = true;
        break;
      case '--output':
        options.output = args[++i] as 'json' | 'markdown' | 'html';
        break;
      case '--dashboard':
        options.dashboard = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
    }
  }

  const auditor = new PlaybookAuditor(options.verbose);

  try {
    let results: ComplianceResult[] = [];

    if (options.allRepos) {
      // 🚀 BUN 1.1.X OPTIMIZATION: Scan repositories using enhanced directory discovery
      try {
        // Find all directories that contain package.json or wrangler.toml
        const repoGlob = new Bun.Glob('*');
        const repoCandidates = await Array.fromAsync(repoGlob.scan());

        for (const entry of repoCandidates) {
          const entryName = String(entry);
          const fullPath = join(process.cwd(), entryName);

          // Check if it's a directory and contains project files
          if (
            !entryName.startsWith('.') &&
            ((await Bun.file(join(fullPath, 'package.json')).exists()) ||
              (await Bun.file(join(fullPath, 'wrangler.toml')).exists()))
          ) {
            const result = await auditor.auditRepository(fullPath);
            results.push(result);
          }
        }
      } catch (error) {
        console.error(`Error scanning repositories: ${error.message}`);
      }
    } else if (options.repo) {
      const result = await auditor.auditRepository(options.repo);
      results.push(result);
    }

    // Generate report
    await auditor.generateReport(results, options.output);

    // Update dashboard if requested
    if (options.dashboard) {
      console.log('📊 Updating compliance dashboard...');
      // TODO: Implement dashboard update logic
    }

    console.log('✅ Playbook compliance audit complete!');
  } catch (error) {
    console.error('❌ Playbook auditor failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
