#!/usr/bin/env bun

/**
 * 🌿 Branch Management Validator for Fantasy42-Fire22 Registry
 *
 * Enterprise branch validation, protection, and management
 * Pure Bun Ecosystem - Zero external dependencies
 */

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// ============================================================================
// BRANCH CONFIGURATION TYPES
// ============================================================================

interface BranchProtectionRule {
  pattern: string;
  required_status_checks?: {
    strict: boolean;
    contexts: string[];
  };
  enforce_admins?: boolean;
  required_pull_request_reviews?: {
    required_approving_review_count: number;
    dismiss_stale_reviews: boolean;
    require_code_owner_reviews: boolean;
    dismissal_restrictions?: {
      users: string[];
      teams: string[];
    };
  };
  restrictions?: {
    users: string[];
    teams: string[];
    apps: string[];
  };
  allow_force_pushes: boolean;
  allow_deletions: boolean;
  block_creations: boolean;
  required_linear_history: boolean;
  lock_branch: boolean;
  allow_fork_syncing: boolean;
}

interface BranchValidationResult {
  branch: string;
  pattern: string;
  valid: boolean;
  issues: string[];
  protectionLevel: 'LOW' | 'STANDARD' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  recommendations: string[];
}

interface BranchManagementConfig {
  registry: {
    name: string;
    version: string;
    lastUpdated: string;
  };
  branchTypes: {
    [key: string]: BranchTypeConfig;
  };
  protectionRules: BranchProtectionRule[];
  validation: {
    lastRun: string;
    totalBranches: number;
    compliantBranches: number;
    issuesFound: number;
  };
}

interface BranchTypeConfig {
  pattern: string;
  purpose: string;
  protection: 'LOW' | 'STANDARD' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  requiredReviews: number;
  codeOwnerRequired: boolean;
  statusChecks: string[];
  allowedTeams: string[];
  autoDelete: boolean;
  maxAge: number; // days
}

// ============================================================================
// BRANCH MANAGEMENT VALIDATOR CLASS
// ============================================================================

class BranchManagementValidator {
  private config: BranchManagementConfig;
  private registryPath: string;

  constructor() {
    this.registryPath = resolve(process.cwd());
    this.config = this.loadConfiguration();
  }

  private loadConfiguration(): BranchManagementConfig {
    const configPath = join(this.registryPath, '.github', 'branch-management-config.json');

    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    // Default configuration
    return {
      registry: {
        name: 'Fantasy42-Fire22 Registry',
        version: '5.1.0',
        lastUpdated: new Date().toISOString(),
      },
      branchTypes: {
        main: {
          pattern: 'main',
          purpose: 'Production releases',
          protection: 'MAXIMUM',
          requiredReviews: 2,
          codeOwnerRequired: true,
          statusChecks: [
            'ci/circleci: build',
            'ci/circleci: test',
            'security/codeql',
            'dependency-review',
          ],
          allowedTeams: ['enterprise-admins', 'release-managers'],
          autoDelete: false,
          maxAge: -1,
        },
        enterprise: {
          pattern: 'enterprise',
          purpose: 'Enterprise features',
          protection: 'HIGH',
          requiredReviews: 3,
          codeOwnerRequired: true,
          statusChecks: [
            'ci/circleci: enterprise-build',
            'security/codeql-enterprise',
            'compliance-check',
          ],
          allowedTeams: ['enterprise-team', 'security-team', 'compliance-team'],
          autoDelete: false,
          maxAge: -1,
        },
        develop: {
          pattern: 'develop',
          purpose: 'Development integration',
          protection: 'MEDIUM',
          requiredReviews: 1,
          codeOwnerRequired: false,
          statusChecks: ['ci/circleci: build', 'ci/circleci: test'],
          allowedTeams: ['development-team', 'devops-team'],
          autoDelete: false,
          maxAge: -1,
        },
        staging: {
          pattern: 'staging',
          purpose: 'Pre-production testing',
          protection: 'MEDIUM',
          requiredReviews: 1,
          codeOwnerRequired: false,
          statusChecks: ['ci/circleci: staging-build', 'e2e-tests'],
          allowedTeams: ['qa-team', 'devops-team'],
          autoDelete: false,
          maxAge: -1,
        },
        feature: {
          pattern: 'feature/*',
          purpose: 'Feature development',
          protection: 'STANDARD',
          requiredReviews: 1,
          codeOwnerRequired: true,
          statusChecks: ['ci/circleci: build', 'unit-tests', 'lint-check'],
          allowedTeams: ['development-team', 'frontend-team', 'backend-team'],
          autoDelete: true,
          maxAge: 14,
        },
        hotfix: {
          pattern: 'hotfix/*',
          purpose: 'Critical bug fixes',
          protection: 'HIGH',
          requiredReviews: 2,
          codeOwnerRequired: true,
          statusChecks: [
            'ci/circleci: build',
            'ci/circleci: test',
            'security/codeql',
            'critical-tests',
          ],
          allowedTeams: ['development-team', 'security-team', 'devops-team'],
          autoDelete: true,
          maxAge: 7,
        },
        release: {
          pattern: 'release/*',
          purpose: 'Release preparation',
          protection: 'HIGH',
          requiredReviews: 2,
          codeOwnerRequired: true,
          statusChecks: [
            'ci/circleci: build',
            'ci/circleci: test',
            'security/codeql',
            'dependency-review',
            'compliance-check',
            'e2e-tests',
          ],
          allowedTeams: ['release-managers', 'enterprise-team', 'security-team'],
          autoDelete: true,
          maxAge: 30,
        },
      },
      protectionRules: [],
      validation: {
        lastRun: new Date().toISOString(),
        totalBranches: 0,
        compliantBranches: 0,
        issuesFound: 0,
      },
    };
  }

  private saveConfiguration(): void {
    const configPath = join(this.registryPath, '.github', 'branch-management-config.json');
    this.config.registry.lastUpdated = new Date().toISOString();
    writeFileSync(configPath, JSON.stringify(this.config, null, 2));
  }

  // ============================================================================
  // BRANCH VALIDATION
  // ============================================================================

  async validateBranches(): Promise<BranchValidationResult[]> {
    // This would typically connect to GitHub API to get actual branches
    // For now, we'll validate against the protection rules file
    const results: BranchValidationResult[] = [];

    const protectionRulesPath = join(this.registryPath, '.github', 'branch-protection-rules.json');
    if (!existsSync(protectionRulesPath)) {
      return [
        {
          branch: 'main',
          pattern: 'main',
          valid: false,
          issues: ['Branch protection rules file not found'],
          protectionLevel: 'LOW',
          recommendations: ['Create .github/branch-protection-rules.json'],
        },
      ];
    }

    const protectionData = JSON.parse(readFileSync(protectionRulesPath, 'utf-8'));
    const rules = protectionData.branch_protection_rules || [];

    for (const rule of rules) {
      const result = this.validateProtectionRule(rule);
      results.push(result);
    }

    // Update validation stats
    this.config.validation.lastRun = new Date().toISOString();
    this.config.validation.totalBranches = results.length;
    this.config.validation.compliantBranches = results.filter(r => r.valid).length;
    this.config.validation.issuesFound = results.reduce((sum, r) => sum + r.issues.length, 0);

    this.saveConfiguration();

    return results;
  }

  private validateProtectionRule(rule: any): BranchValidationResult {
    const result: BranchValidationResult = {
      branch: rule.pattern,
      pattern: rule.pattern,
      valid: true,
      issues: [],
      protectionLevel: 'LOW',
      recommendations: [],
    };

    // Determine expected configuration based on branch type
    const branchType = this.getBranchType(rule.pattern);
    if (!branchType) {
      result.issues.push(`Unknown branch pattern: ${rule.pattern}`);
      result.valid = false;
      return result;
    }

    const expectedConfig = this.config.branchTypes[branchType];

    // Validate required reviews
    if (rule.required_pull_request_reviews) {
      const actualReviews = rule.required_pull_request_reviews.required_approving_review_count;
      if (actualReviews < expectedConfig.requiredReviews) {
        result.issues.push(
          `Insufficient reviews: ${actualReviews} < ${expectedConfig.requiredReviews}`
        );
        result.valid = false;
      }
    } else if (expectedConfig.requiredReviews > 0) {
      result.issues.push('Missing required pull request reviews configuration');
      result.valid = false;
    }

    // Validate CODEOWNERS requirement
    if (
      expectedConfig.codeOwnerRequired &&
      !rule.required_pull_request_reviews?.require_code_owner_reviews
    ) {
      result.issues.push('CODEOWNERS review should be required');
      result.valid = false;
    }

    // Validate status checks
    if (rule.required_status_checks?.contexts) {
      const actualChecks = rule.required_status_checks.contexts;
      const missingChecks = expectedConfig.statusChecks.filter(
        check => !actualChecks.includes(check)
      );

      if (missingChecks.length > 0) {
        result.issues.push(`Missing status checks: ${missingChecks.join(', ')}`);
        result.valid = false;
      }
    } else if (expectedConfig.statusChecks.length > 0) {
      result.issues.push('Missing status checks configuration');
      result.valid = false;
    }

    // Set protection level
    result.protectionLevel = expectedConfig.protection;

    // Generate recommendations
    if (!rule.required_status_checks?.strict) {
      result.recommendations.push('Consider enabling strict status checks');
    }

    if (!rule.required_linear_history) {
      result.recommendations.push('Consider requiring linear history');
    }

    if (rule.allow_force_pushes) {
      result.recommendations.push('Consider disabling force pushes');
    }

    return result;
  }

  private getBranchType(pattern: string): string | null {
    for (const [type, config] of Object.entries(this.config.branchTypes)) {
      if (
        pattern === config.pattern ||
        (config.pattern.includes('*') && pattern.startsWith(config.pattern.replace('/*', '/')))
      ) {
        return type;
      }
    }
    return null;
  }

  // ============================================================================
  // BRANCH PROTECTION GENERATION
  // ============================================================================

  generateProtectionRules(): BranchProtectionRule[] {
    const rules: BranchProtectionRule[] = [];

    for (const [type, config] of Object.entries(this.config.branchTypes)) {
      const rule: BranchProtectionRule = {
        pattern: config.pattern,
        required_status_checks:
          config.statusChecks.length > 0
            ? {
                strict: config.protection === 'MAXIMUM' || config.protection === 'HIGH',
                contexts: config.statusChecks,
              }
            : undefined,
        enforce_admins: config.protection === 'MAXIMUM',
        required_pull_request_reviews:
          config.requiredReviews > 0
            ? {
                required_approving_review_count: config.requiredReviews,
                dismiss_stale_reviews: true,
                require_code_owner_reviews: config.codeOwnerRequired,
                dismissal_restrictions:
                  config.protection === 'MAXIMUM' || config.protection === 'HIGH'
                    ? {
                        users: ['nolarose1968-pixel'],
                        teams: ['enterprise-team', 'security-team'],
                      }
                    : undefined,
              }
            : undefined,
        restrictions:
          config.protection === 'MAXIMUM'
            ? {
                users: ['nolarose1968-pixel'],
                teams: ['enterprise-team'],
                apps: [],
              }
            : undefined,
        allow_force_pushes: false,
        allow_deletions: false,
        block_creations: config.protection === 'MAXIMUM',
        required_linear_history: true,
        lock_branch: false,
        allow_fork_syncing: true,
      };

      rules.push(rule);
    }

    this.config.protectionRules = rules;
    this.saveConfiguration();

    return rules;
  }

  // ============================================================================
  // REPORTING & ANALYSIS
  // ============================================================================

  async generateReport(): Promise<string> {
    const validationResults = await this.validateBranches();

    let report = `# 🌿 Branch Management Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `**Registry:** ${this.config.registry.name}\n`;
    report += `**Version:** ${this.config.registry.version}\n\n`;

    // Summary
    report += `## 📊 Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Branches | ${this.config.validation.totalBranches} |\n`;
    report += `| Compliant | ${this.config.validation.compliantBranches} |\n`;
    report += `| Non-compliant | ${this.config.validation.totalBranches - this.config.validation.compliantBranches} |\n`;
    report += `| Issues Found | ${this.config.validation.issuesFound} |\n`;
    report += `| Compliance Rate | ${this.config.validation.totalBranches > 0 ? Math.round((this.config.validation.compliantBranches / this.config.validation.totalBranches) * 100) : 0}% |\n\n`;

    // Branch Details
    report += `## 🌿 Branch Details\n\n`;
    for (const result of validationResults) {
      report += `### ${result.branch} (${result.protectionLevel})\n\n`;
      report += `- **Pattern:** ${result.pattern}\n`;
      report += `- **Status:** ${result.valid ? '✅ Compliant' : '❌ Non-compliant'}\n`;

      if (result.issues.length > 0) {
        report += `- **Issues:**\n`;
        for (const issue of result.issues) {
          report += `  - ${issue}\n`;
        }
      }

      if (result.recommendations.length > 0) {
        report += `- **Recommendations:**\n`;
        for (const rec of result.recommendations) {
          report += `  - ${rec}\n`;
        }
      }

      report += `\n`;
    }

    // Branch Types Reference
    report += `## 📋 Branch Types Reference\n\n`;
    report += `| Type | Pattern | Protection | Reviews | Purpose |\n`;
    report += `|------|---------|------------|---------|---------|\n`;

    for (const [type, config] of Object.entries(this.config.branchTypes)) {
      report += `| ${type} | ${config.pattern} | ${config.protection} | ${config.requiredReviews} | ${config.purpose} |\n`;
    }

    report += `\n`;

    // Best Practices
    report += `## ✨ Best Practices\n\n`;
    report += `- Use descriptive branch names following the pattern\n`;
    report += `- Keep feature branches under 14 days\n`;
    report += `- Always create pull requests for changes\n`;
    report += `- Include CODEOWNERS in review process\n`;
    report += `- Run full test suite before merging\n`;
    report += `- Use squash merge for feature branches\n`;
    report += `- Delete merged branches automatically\n\n`;

    return report;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getBranchTypeConfig(type: string): BranchTypeConfig | null {
    return this.config.branchTypes[type] || null;
  }

  updateBranchTypeConfig(type: string, config: Partial<BranchTypeConfig>): void {
    if (this.config.branchTypes[type]) {
      Object.assign(this.config.branchTypes[type], config);
      this.saveConfiguration();
    }
  }

  exportProtectionRules(): string {
    const rules = this.generateProtectionRules();
    return JSON.stringify({ branch_protection_rules: rules }, null, 2);
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const validator = new BranchManagementValidator();

  try {
    switch (command) {
      case 'validate':
        console.log('🔍 Validating branch management...');
        const results = await validator.validateBranches();

        console.log(`\n📊 Validation Results:`);
        console.log(`Total branches: ${results.length}`);
        console.log(`Compliant: ${results.filter(r => r.valid).length}`);
        console.log(`Issues: ${results.reduce((sum, r) => sum + r.issues.length, 0)}`);

        for (const result of results) {
          if (!result.valid || result.issues.length > 0) {
            console.log(`\n❌ ${result.branch}:`);
            for (const issue of result.issues) {
              console.log(`  - ${issue}`);
            }
          }
        }
        break;

      case 'generate':
        console.log('🔧 Generating branch protection rules...');
        const rules = validator.generateProtectionRules();
        const rulesPath = join(process.cwd(), '.github', 'branch-protection-rules-generated.json');
        writeFileSync(rulesPath, validator.exportProtectionRules());
        console.log(`Protection rules saved to ${rulesPath}`);
        break;

      case 'report':
        console.log('📊 Generating branch management report...');
        const report = await validator.generateReport();
        const reportPath = join(process.cwd(), 'BRANCH-MANAGEMENT-REPORT.md');
        writeFileSync(reportPath, report);
        console.log(`Report saved to ${reportPath}`);
        break;

      case 'types':
        console.log('📋 Branch Types:');
        for (const [type, config] of Object.entries(validator['config'].branchTypes)) {
          console.log(`  ${type}: ${config.pattern} (${config.protection})`);
          console.log(`    Purpose: ${config.purpose}`);
          console.log(
            `    Reviews: ${config.requiredReviews}, CODEOWNERS: ${config.codeOwnerRequired}`
          );
          console.log(`    Status Checks: ${config.statusChecks.join(', ')}`);
          console.log('');
        }
        break;

      default:
        console.log('Usage: bun run branch-management-validator.bun.ts <command>');
        console.log('Commands:');
        console.log('  validate  - Validate current branch protection rules');
        console.log('  generate  - Generate new branch protection rules');
        console.log('  report    - Generate branch management report');
        console.log('  types     - List branch types and configurations');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run CLI if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export {
  BranchManagementValidator,
  type BranchProtectionRule,
  type BranchValidationResult,
  type BranchManagementConfig,
};
