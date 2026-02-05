#!/usr/bin/env bun

/**
 * 🔍 Fire22 Workspace Consistency Validator
 *
 * Validates consistency across all Fire22 workspaces:
 * - Naming patterns
 * - Version alignment
 * - Metadata completeness
 * - Configuration consistency
 * - Dependency patterns
 *
 * @version 1.0.0
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ConsistencyIssue {
  workspace: string;
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  expected?: any;
  actual?: any;
}

interface ValidationResult {
  workspace: string;
  valid: boolean;
  issues: ConsistencyIssue[];
  score: number;
}

class WorkspaceConsistencyValidator {
  private workspacesPath: string;
  private workspaces: string[];
  private issues: ConsistencyIssue[] = [];
  private results: ValidationResult[] = [];

  // Expected patterns and standards
  private standards = {
    version: '3.0.9',
    author: 'Fire22 Development Team',
    license: 'MIT',
    type: 'module',
    nodeEngine: '>=18.0.0',
    bunEngine: '>=1.0.0',
    naming: {
      directory: /^@fire22-[a-z-]+$/,
      package: /^@fire22\/[a-z-]+$/,
      displayName: /^[A-Z][a-zA-Z\s]+$/,
    },
    requiredScripts: ['dev', 'build', 'build:standalone', 'test', 'lint', 'typecheck'],
    requiredDevDeps: ['@types/bun', 'typescript'],
    requiredFields: [
      'name',
      'version',
      'description',
      'type',
      'main',
      'scripts',
      'devDependencies',
    ],
  };

  constructor() {
    this.workspacesPath = join(process.cwd(), 'workspaces');
    this.workspaces = [
      '@fire22-pattern-system',
      '@fire22-api-client',
      '@fire22-core-dashboard',
      '@fire22-sports-betting',
      '@fire22-telegram-integration',
      '@fire22-build-system',
    ];
  }

  /**
   * 🚀 Run full validation
   */
  async validate(): Promise<void> {
    console.log('🔍 Fire22 Workspace Consistency Validator');
    console.log('='.repeat(60));

    // Validate each workspace
    for (const workspace of this.workspaces) {
      const result = await this.validateWorkspace(workspace);
      this.results.push(result);
    }

    // Check cross-workspace consistency
    await this.validateCrossWorkspaceConsistency();

    // Generate report
    this.generateReport();

    // Save validation results
    await this.saveResults();
  }

  /**
   * 📊 Validate individual workspace
   */
  private async validateWorkspace(workspace: string): Promise<ValidationResult> {
    console.log(`\n🔍 Validating ${workspace}...`);

    const result: ValidationResult = {
      workspace,
      valid: true,
      issues: [],
      score: 100,
    };

    const workspacePath = join(this.workspacesPath, workspace);

    // Check directory exists
    if (!existsSync(workspacePath)) {
      result.issues.push({
        workspace,
        type: 'error',
        category: 'existence',
        message: 'Workspace directory does not exist',
        expected: workspacePath,
      });
      result.valid = false;
      result.score = 0;
      return result;
    }

    // Validate directory naming
    if (!this.standards.naming.directory.test(workspace)) {
      result.issues.push({
        workspace,
        type: 'error',
        category: 'naming',
        message: 'Directory name does not match pattern',
        expected: '@fire22-[name]',
        actual: workspace,
      });
      result.score -= 10;
    }

    // Validate package.json
    const packageJsonPath = join(workspacePath, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // Check package naming
      if (!this.standards.naming.package.test(packageJson.name)) {
        result.issues.push({
          workspace,
          type: 'error',
          category: 'naming',
          message: 'Package name does not match pattern',
          expected: '@fire22/[name]',
          actual: packageJson.name,
        });
        result.score -= 10;
      }

      // Check naming consistency
      const expectedPackageName = workspace.replace('@fire22-', '@fire22/');
      if (packageJson.name !== expectedPackageName) {
        result.issues.push({
          workspace,
          type: 'error',
          category: 'naming',
          message: 'Package name inconsistent with directory',
          expected: expectedPackageName,
          actual: packageJson.name,
        });
        result.score -= 15;
      }

      // Check version
      if (packageJson.version !== this.standards.version) {
        result.issues.push({
          workspace,
          type: 'warning',
          category: 'version',
          message: 'Version mismatch',
          expected: this.standards.version,
          actual: packageJson.version,
        });
        result.score -= 5;
      }

      // Check type field
      if (packageJson.type !== this.standards.type) {
        result.issues.push({
          workspace,
          type: 'error',
          category: 'metadata',
          message: 'Missing or incorrect type field',
          expected: this.standards.type,
          actual: packageJson.type,
        });
        result.score -= 10;
      }

      // Check required fields
      for (const field of this.standards.requiredFields) {
        if (!packageJson[field]) {
          result.issues.push({
            workspace,
            type: 'error',
            category: 'metadata',
            message: `Missing required field: ${field}`,
            expected: field,
          });
          result.score -= 5;
        }
      }

      // Check required scripts
      if (packageJson.scripts) {
        for (const script of this.standards.requiredScripts) {
          if (!packageJson.scripts[script]) {
            result.issues.push({
              workspace,
              type: 'warning',
              category: 'scripts',
              message: `Missing required script: ${script}`,
              expected: script,
            });
            result.score -= 2;
          }
        }
      }

      // Check dev dependencies
      if (packageJson.devDependencies) {
        for (const dep of this.standards.requiredDevDeps) {
          if (!packageJson.devDependencies[dep]) {
            result.issues.push({
              workspace,
              type: 'warning',
              category: 'dependencies',
              message: `Missing required dev dependency: ${dep}`,
              expected: dep,
            });
            result.score -= 3;
          }
        }
      }

      // Check fire22 metadata
      if (!packageJson.fire22) {
        result.issues.push({
          workspace,
          type: 'warning',
          category: 'metadata',
          message: 'Missing fire22 metadata section',
        });
        result.score -= 5;
      }

      // Check publishConfig
      if (!packageJson.publishConfig) {
        result.issues.push({
          workspace,
          type: 'info',
          category: 'publishing',
          message: 'Missing publishConfig',
        });
        result.score -= 2;
      }
    } else {
      result.issues.push({
        workspace,
        type: 'error',
        category: 'existence',
        message: 'package.json does not exist',
      });
      result.valid = false;
      result.score -= 50;
    }

    // Check TypeScript config
    const tsConfigPath = join(workspacePath, 'tsconfig.json');
    if (!existsSync(tsConfigPath)) {
      result.issues.push({
        workspace,
        type: 'warning',
        category: 'configuration',
        message: 'Missing tsconfig.json',
      });
      result.score -= 5;
    }

    // Check source directory
    const srcPath = join(workspacePath, 'src');
    if (!existsSync(srcPath)) {
      result.issues.push({
        workspace,
        type: 'error',
        category: 'structure',
        message: 'Missing src directory',
      });
      result.score -= 10;
    }

    // Check README
    const readmePath = join(workspacePath, 'README.md');
    if (!existsSync(readmePath)) {
      result.issues.push({
        workspace,
        type: 'info',
        category: 'documentation',
        message: 'Missing README.md',
      });
      result.score -= 2;
    }

    // Ensure score is between 0 and 100
    result.score = Math.max(0, Math.min(100, result.score));
    result.valid = result.score >= 60 && !result.issues.some(i => i.type === 'error');

    // Add issues to global list
    this.issues.push(...result.issues);

    return result;
  }

  /**
   * 🔗 Validate cross-workspace consistency
   */
  private async validateCrossWorkspaceConsistency(): Promise<void> {
    console.log('\n🔗 Validating cross-workspace consistency...');

    const versions = new Set<string>();
    const types = new Set<string>();
    const engines = new Set<string>();

    for (const workspace of this.workspaces) {
      const packageJsonPath = join(this.workspacesPath, workspace, 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

        versions.add(packageJson.version);
        types.add(packageJson.type);

        if (packageJson.engines) {
          engines.add(JSON.stringify(packageJson.engines));
        }
      }
    }

    // Check version consistency
    if (versions.size > 1) {
      this.issues.push({
        workspace: 'global',
        type: 'warning',
        category: 'version',
        message: 'Inconsistent versions across workspaces',
        expected: this.standards.version,
        actual: Array.from(versions),
      });
    }

    // Check type consistency
    if (types.size > 1) {
      this.issues.push({
        workspace: 'global',
        type: 'error',
        category: 'metadata',
        message: 'Inconsistent type fields across workspaces',
        expected: this.standards.type,
        actual: Array.from(types),
      });
    }

    // Check engine consistency
    if (engines.size > 1) {
      this.issues.push({
        workspace: 'global',
        type: 'warning',
        category: 'engines',
        message: 'Inconsistent engine requirements across workspaces',
        actual: Array.from(engines),
      });
    }

    // Check dependency version consistency
    const depVersions = new Map<string, Set<string>>();
    for (const workspace of this.workspaces) {
      const packageJsonPath = join(this.workspacesPath, workspace, 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

        // Check dev dependencies
        if (packageJson.devDependencies) {
          for (const [dep, version] of Object.entries(packageJson.devDependencies)) {
            if (!depVersions.has(dep)) {
              depVersions.set(dep, new Set());
            }
            depVersions.get(dep)!.add(version as string);
          }
        }
      }
    }

    // Report inconsistent dependency versions
    for (const [dep, versions] of depVersions) {
      if (versions.size > 1) {
        this.issues.push({
          workspace: 'global',
          type: 'warning',
          category: 'dependencies',
          message: `Inconsistent versions for ${dep}`,
          actual: Array.from(versions),
        });
      }
    }
  }

  /**
   * 📊 Generate consistency report
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CONSISTENCY REPORT');
    console.log('='.repeat(60));

    // Summary
    const totalIssues = this.issues.length;
    const errors = this.issues.filter(i => i.type === 'error').length;
    const warnings = this.issues.filter(i => i.type === 'warning').length;
    const info = this.issues.filter(i => i.type === 'info').length;

    console.log('\n📈 Summary:');
    console.log(`  Total Issues: ${totalIssues}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  ⚠️  Warnings: ${warnings}`);
    console.log(`  ℹ️  Info: ${info}`);

    // Workspace scores
    console.log('\n🎯 Workspace Scores:');
    for (const result of this.results) {
      const status = result.valid ? '✅' : '❌';
      const grade = this.getGrade(result.score);
      console.log(`  ${status} ${result.workspace}: ${result.score}/100 (${grade})`);
    }

    // Issues by category
    const categories = new Map<string, ConsistencyIssue[]>();
    for (const issue of this.issues) {
      if (!categories.has(issue.category)) {
        categories.set(issue.category, []);
      }
      categories.get(issue.category)!.push(issue);
    }

    console.log('\n📋 Issues by Category:');
    for (const [category, issues] of categories) {
      console.log(`\n  ${category} (${issues.length}):`);
      for (const issue of issues.slice(0, 5)) {
        const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`    ${icon} [${issue.workspace}] ${issue.message}`);
        if (issue.expected && issue.actual) {
          console.log(`       Expected: ${JSON.stringify(issue.expected)}`);
          console.log(`       Actual: ${JSON.stringify(issue.actual)}`);
        }
      }
      if (issues.length > 5) {
        console.log(`    ... and ${issues.length - 5} more`);
      }
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    const recommendations = this.generateRecommendations();
    recommendations.forEach(r => console.log(`  • ${r}`));

    // Overall status
    const overallValid = this.results.every(r => r.valid);
    const avgScore = this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length;

    console.log('\n' + '='.repeat(60));
    console.log(`🏁 Overall Status: ${overallValid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`📊 Average Score: ${avgScore.toFixed(1)}/100 (${this.getGrade(avgScore)})`);
    console.log('='.repeat(60));
  }

  /**
   * 🎯 Get letter grade for score
   */
  private getGrade(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D';
    return 'F';
  }

  /**
   * 💡 Generate recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check for naming issues
    if (this.issues.some(i => i.category === 'naming')) {
      recommendations.push('Standardize naming patterns across all workspaces');
    }

    // Check for version issues
    if (this.issues.some(i => i.category === 'version')) {
      recommendations.push('Synchronize versions using workspace-versioning-strategy.ts');
    }

    // Check for missing scripts
    if (this.issues.some(i => i.category === 'scripts')) {
      recommendations.push('Add missing required scripts to all workspaces');
    }

    // Check for dependency issues
    if (this.issues.some(i => i.category === 'dependencies')) {
      recommendations.push('Align dependency versions across workspaces');
    }

    // Check for metadata issues
    if (this.issues.some(i => i.category === 'metadata')) {
      recommendations.push('Complete missing metadata fields in package.json');
    }

    // Check for documentation issues
    if (this.issues.some(i => i.category === 'documentation')) {
      recommendations.push('Add README.md to all workspaces');
    }

    if (recommendations.length === 0) {
      recommendations.push('All workspaces are consistent! 🎉');
    }

    return recommendations;
  }

  /**
   * 💾 Save validation results
   */
  private async saveResults(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      workspaces: this.workspaces.length,
      results: this.results,
      issues: this.issues,
      summary: {
        totalIssues: this.issues.length,
        errors: this.issues.filter(i => i.type === 'error').length,
        warnings: this.issues.filter(i => i.type === 'warning').length,
        info: this.issues.filter(i => i.type === 'info').length,
        valid: this.results.every(r => r.valid),
        avgScore: this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length,
      },
    };

    const reportPath = join(process.cwd(), 'workspace-consistency-report.json');
    await Bun.write(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Consistency report saved to: ${reportPath}`);
  }
}

// === CLI Interface ===

if (import.meta.main) {
  const validator = new WorkspaceConsistencyValidator();
  await validator.validate();
}

export default WorkspaceConsistencyValidator;
