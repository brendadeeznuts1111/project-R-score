#!/usr/bin/env bun

/**
 * 🔧 CI/CD Rules & Organization System for Fantasy42-Fire22
 *
 * Comprehensive CI/CD pipeline with quality gates, security checks, and deployment rules
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface QualityGate {
  name: string;
  metric: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value: number | string;
  required: boolean;
  description: string;
}

interface SecurityRule {
  name: string;
  pattern: RegExp;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  action: 'BLOCK' | 'WARN' | 'ALLOW';
  description: string;
}

interface BranchRule {
  pattern: RegExp;
  allowed: boolean;
  requiresReview: boolean;
  requiresTests: boolean;
  canMergeTo: string[];
  description: string;
}

class CICDRulesSystem {
  private qualityGates: QualityGate[] = [
    {
      name: 'Test Coverage',
      metric: 'test_coverage',
      operator: '>=',
      value: 80,
      required: true,
      description: 'Minimum test coverage requirement',
    },
    {
      name: 'Bundle Size',
      metric: 'bundle_size',
      operator: '<=',
      value: 2 * 1024 * 1024, // 2MB
      required: true,
      description: 'Maximum bundle size limit',
    },
    {
      name: 'Security Score',
      metric: 'security_score',
      operator: '>=',
      value: 90,
      required: true,
      description: 'Minimum security audit score',
    },
    {
      name: 'Performance Score',
      metric: 'performance_score',
      operator: '>=',
      value: 85,
      required: false,
      description: 'Minimum performance benchmark score',
    },
    {
      name: 'Dependency Count',
      metric: 'dependency_count',
      operator: '<=',
      value: 200,
      required: false,
      description: 'Maximum dependency count',
    },
  ];

  private securityRules: SecurityRule[] = [
    {
      name: 'Hardcoded Secrets',
      pattern: /(api[_-]?key|secret|password|token)\s*[=:]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
      severity: 'CRITICAL',
      action: 'BLOCK',
      description: 'Hardcoded API keys, secrets, or passwords',
    },
    {
      name: 'Private Keys',
      pattern:
        /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (RSA |EC |DSA )?PRIVATE KEY-----/g,
      severity: 'CRITICAL',
      action: 'BLOCK',
      description: 'Private cryptographic keys in codebase',
    },
    {
      name: 'Database URLs with Credentials',
      pattern: /(mongodb|postgresql|mysql|sqlite):\/\/[^:]+:[^@]+@/gi,
      severity: 'CRITICAL',
      action: 'BLOCK',
      description: 'Database connection strings with embedded credentials',
    },
    {
      name: 'AWS Access Keys',
      pattern: /AKIA[0-9A-Z]{16}/g,
      severity: 'CRITICAL',
      action: 'BLOCK',
      description: 'AWS access key IDs',
    },
    {
      name: 'Credit Card Numbers',
      pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      severity: 'HIGH',
      action: 'BLOCK',
      description: 'Potential credit card numbers',
    },
    {
      name: 'Social Security Numbers',
      pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
      severity: 'HIGH',
      action: 'BLOCK',
      description: 'Potential Social Security Numbers',
    },
    {
      name: 'Internal IPs',
      pattern: /\b(10\.|172\.|192\.168\.)\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      severity: 'MEDIUM',
      action: 'WARN',
      description: 'Internal IP addresses in production code',
    },
    {
      name: 'Large Files',
      pattern: /.{0}/, // This will be checked via file size
      severity: 'MEDIUM',
      action: 'WARN',
      description: 'Files larger than 10MB',
    },
  ];

  private branchRules: BranchRule[] = [
    {
      pattern: /^main$/,
      allowed: true,
      requiresReview: true,
      requiresTests: true,
      canMergeTo: [],
      description: 'Main production branch - requires review and tests',
    },
    {
      pattern: /^develop$/,
      allowed: true,
      requiresReview: true,
      requiresTests: true,
      canMergeTo: ['staging', 'main'],
      description: 'Development branch - requires review and tests',
    },
    {
      pattern: /^staging$/,
      allowed: true,
      requiresReview: true,
      requiresTests: true,
      canMergeTo: ['main'],
      description: 'Staging branch - requires review and tests',
    },
    {
      pattern: /^enterprise$/,
      allowed: true,
      requiresReview: true,
      requiresTests: true,
      canMergeTo: ['main'],
      description: 'Enterprise features branch - requires review and tests',
    },
    {
      pattern: /^feature\/.+$/,
      allowed: true,
      requiresReview: false,
      requiresTests: true,
      canMergeTo: ['develop'],
      description: 'Feature branches - require tests but no review',
    },
    {
      pattern: /^fix\/.+$/,
      allowed: true,
      requiresReview: false,
      requiresTests: true,
      canMergeTo: ['develop', 'main'],
      description: 'Bug fix branches - require tests, can merge to main',
    },
    {
      pattern: /^hotfix\/.+$/,
      allowed: true,
      requiresReview: true,
      requiresTests: true,
      canMergeTo: ['main', 'develop'],
      description: 'Hotfix branches - require review and tests',
    },
    {
      pattern: /^release\/.+$/,
      allowed: true,
      requiresReview: true,
      requiresTests: true,
      canMergeTo: ['main'],
      description: 'Release branches - require review and tests',
    },
    {
      pattern: /^domain\/.+$/,
      allowed: true,
      requiresReview: true,
      requiresTests: true,
      canMergeTo: ['develop'],
      description: 'Domain-specific branches - require review and tests',
    },
    {
      pattern: /^.*$/,
      allowed: false,
      requiresReview: false,
      requiresTests: false,
      canMergeTo: [],
      description: 'All other branch patterns are not allowed',
    },
  ];

  constructor() {
    console.log('🔧 Initializing CI/CD Rules System...\n');
  }

  public validateQualityGates(metrics: Record<string, number>): {
    passed: boolean;
    failed: QualityGate[];
  } {
    const failed: QualityGate[] = [];

    for (const gate of this.qualityGates) {
      if (!gate.required && !(gate.metric in metrics)) {
        continue; // Skip optional gates without data
      }

      const actualValue = metrics[gate.metric];
      if (actualValue === undefined) {
        if (gate.required) {
          failed.push(gate);
        }
        continue;
      }

      let passed = false;
      switch (gate.operator) {
        case '>':
          passed = actualValue > gate.value;
          break;
        case '>=':
          passed = actualValue >= gate.value;
          break;
        case '<':
          passed = actualValue < gate.value;
          break;
        case '<=':
          passed = actualValue <= gate.value;
          break;
        case '==':
          passed = actualValue === gate.value;
          break;
        case '!=':
          passed = actualValue !== gate.value;
          break;
      }

      if (!passed) {
        failed.push(gate);
      }
    }

    return {
      passed: failed.length === 0,
      failed,
    };
  }

  public scanForSecurityIssues(files: string[]): {
    issues: SecurityRule[];
    violations: Array<{ file: string; rule: SecurityRule; matches: string[] }>;
  } {
    const violations: Array<{ file: string; rule: SecurityRule; matches: string[] }> = [];

    for (const filePath of files) {
      if (!existsSync(filePath)) continue;

      try {
        const content = readFileSync(filePath, 'utf-8');

        for (const rule of this.securityRules) {
          const matches: string[] = [];
          let match;

          // Special handling for file size check
          if (rule.name === 'Large Files') {
            const stats = require('fs').statSync(filePath);
            if (stats.size > 10 * 1024 * 1024) {
              // 10MB
              matches.push(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            }
          } else {
            while ((match = rule.pattern.exec(content)) !== null) {
              // Skip if it's in documentation or comments
              const lines = content.substring(0, match.index).split('\n');
              const currentLine = lines[lines.length - 1];

              if (
                !currentLine.includes('//') &&
                !currentLine.includes('#') &&
                !currentLine.includes('/*')
              ) {
                matches.push(match[0].substring(0, 100) + (match[0].length > 100 ? '...' : ''));
              }
            }
          }

          if (matches.length > 0) {
            violations.push({
              file: filePath,
              rule,
              matches,
            });
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not scan ${filePath}: ${error.message}`);
      }
    }

    return {
      issues: this.securityRules,
      violations,
    };
  }

  public validateBranch(branchName: string): {
    allowed: boolean;
    rule?: BranchRule;
    violations: string[];
  } {
    const violations: string[] = [];

    for (const rule of this.branchRules) {
      if (rule.pattern.test(branchName)) {
        const allowed = rule.allowed;

        if (!allowed) {
          violations.push(`Branch name '${branchName}' is not allowed`);
        }

        return {
          allowed,
          rule,
          violations,
        };
      }
    }

    violations.push(`Branch name '${branchName}' does not match any allowed patterns`);
    return {
      allowed: false,
      violations,
    };
  }

  public validateCommit(commitMessage: string): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check for conventional commit format
    const conventionalPattern =
      /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,72}/;
    if (!conventionalPattern.test(commitMessage)) {
      violations.push('Commit message does not follow conventional commit format');
    }

    // Check for sensitive keywords
    const sensitiveKeywords = ['password', 'secret', 'key', 'token', 'credential'];
    for (const keyword of sensitiveKeywords) {
      if (commitMessage.toLowerCase().includes(keyword)) {
        violations.push(`Commit message contains sensitive keyword: '${keyword}'`);
      }
    }

    // Check length
    if (commitMessage.length > 100) {
      violations.push('Commit message is too long (>100 characters)');
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  public generateCICDPipeline(): string {
    let pipeline = `# 🚀 Fantasy42-Fire22 CI/CD Pipeline\n\n`;

    pipeline += `## 📋 Quality Gates\n\n`;
    for (const gate of this.qualityGates) {
      pipeline += `- **${gate.name}**: ${gate.metric} ${gate.operator} ${gate.value}`;
      pipeline += ` (${gate.required ? 'Required' : 'Optional'})`;
      pipeline += `\n  - ${gate.description}\n\n`;
    }

    pipeline += `## 🔒 Security Rules\n\n`;
    for (const rule of this.securityRules) {
      pipeline += `- **${rule.name}** (${rule.severity})\n`;
      pipeline += `  - Pattern: \`${rule.pattern.source}\`\n`;
      pipeline += `  - Action: ${rule.action}\n`;
      pipeline += `  - ${rule.description}\n\n`;
    }

    pipeline += `## 🌿 Branch Rules\n\n`;
    for (const rule of this.branchRules.filter(r => r.allowed)) {
      pipeline += `- **${rule.pattern.source}**\n`;
      pipeline += `  - Review required: ${rule.requiresReview}\n`;
      pipeline += `  - Tests required: ${rule.requiresTests}\n`;
      pipeline += `  - Can merge to: ${rule.canMergeTo.join(', ') || 'none'}\n`;
      pipeline += `  - ${rule.description}\n\n`;
    }

    pipeline += `## 🔄 Pipeline Stages\n\n`;
    pipeline += `1. **Lint & Format**\n`;
    pipeline += `   - ESLint configuration check\n`;
    pipeline += `   - Prettier formatting validation\n`;
    pipeline += `   - TypeScript compilation check\n\n`;

    pipeline += `2. **Security Scan**\n`;
    pipeline += `   - Secret detection\n`;
    pipeline += `   - Dependency vulnerability scan\n`;
    pipeline += `   - License compliance check\n\n`;

    pipeline += `3. **Test Execution**\n`;
    pipeline += `   - Unit tests with coverage\n`;
    pipeline += `   - Integration tests\n`;
    pipeline += `   - Performance benchmarks\n\n`;

    pipeline += `4. **Quality Gates**\n`;
    pipeline += `   - Coverage threshold check\n`;
    pipeline += `   - Bundle size validation\n`;
    pipeline += `   - Security score verification\n\n`;

    pipeline += `5. **Build & Deploy**\n`;
    pipeline += `   - Production build creation\n`;
    pipeline += `   - Artifact generation\n`;
    pipeline += `   - Automated deployment\n\n`;

    return pipeline;
  }

  public createGitHubActionsWorkflow(): string {
    return `# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop, staging, enterprise]
  pull_request:
    branches: [main, develop, staging, enterprise]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run linting
        run: bun run lint

      - name: Run formatting check
        run: bun run format:check

      - name: Run TypeScript check
        run: bunx tsc --noEmit

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Run security audit
        run: bun run scripts/targeted-security-cleanup.bun.ts scan

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Run performance benchmark
        run: bun run scripts/sqlite-performance-benchmark.bun.ts

  deploy:
    needs: [quality-check, security-scan, test, performance-test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Build for production
        run: bun run build

      - name: Deploy to Cloudflare
        run: |
          # Deployment commands would go here
          echo "Deployment would happen here"

  backup:
    needs: [deploy]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Run backup to R2
        run: bun run scripts/r2-backup-system.bun.ts backup
        env:
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          R2_ACCESS_KEY_ID: \${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: \${{ secrets.R2_SECRET_ACCESS_KEY }}
          R2_BUCKET_NAME: fantasy42-backups`;
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'validate';

  const ciSystem = new CICDRulesSystem();

  switch (command) {
    case 'validate':
      // Example validation
      const branchResult = ciSystem.validateBranch('feature/new-feature');
      console.log('Branch validation:', branchResult);

      const commitResult = ciSystem.validateCommit('feat: add new dashboard component');
      console.log('Commit validation:', commitResult);

      const qualityResult = ciSystem.validateQualityGates({
        test_coverage: 85,
        bundle_size: 1024 * 1024, // 1MB
        security_score: 95,
      });
      console.log('Quality gates:', qualityResult);
      break;

    case 'pipeline':
      const pipeline = ciSystem.generateCICDPipeline();
      console.log(pipeline);
      break;

    case 'workflow':
      const workflow = ciSystem.createGitHubActionsWorkflow();
      console.log(workflow);
      break;

    case 'scan':
      // Scan current directory for security issues
      const files = [
        'package.json',
        'bunfig.toml',
        '.env',
        ...require('fs')
          .readdirSync('.')
          .filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'))
          .slice(0, 10),
      ];
      const scanResult = ciSystem.scanForSecurityIssues(files);
      console.log(`Security scan found ${scanResult.violations.length} violations`);
      for (const violation of scanResult.violations.slice(0, 5)) {
        console.log(`  ${violation.file}: ${violation.rule.name}`);
      }
      break;

    default:
      console.log(
        'Usage: bun run .github/workflows/ci-cd-rules.bun.ts [validate|pipeline|workflow|scan]'
      );
      break;
  }
}
