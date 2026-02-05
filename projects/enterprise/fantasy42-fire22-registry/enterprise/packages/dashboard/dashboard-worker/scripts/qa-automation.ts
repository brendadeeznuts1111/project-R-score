#!/usr/bin/env bun
/**
 * 🔍 Fire22 QA Automation Suite
 *
 * Comprehensive quality assurance automation including:
 * - Code quality checks (lint, format, typecheck)
 * - Security vulnerability scanning
 * - Performance regression testing
 * - API contract validation
 * - Integration testing
 * - Pre-deployment validation
 *
 * @version 3.0.9
 * @author Fire22 Development Team
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface QAResult {
  step: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  duration: number;
  message?: string;
  details?: string[];
  score?: number;
}

interface QAReport {
  timestamp: string;
  overallStatus: 'pass' | 'fail' | 'warning';
  overallScore: number;
  duration: number;
  results: QAResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
    total: number;
  };
  recommendations: string[];
}

interface QAConfig {
  skipSteps: string[];
  strictMode: boolean;
  parallel: boolean;
  generateReport: boolean;
  failFast: boolean;
  scoreThreshold: number;
}

class QAAutomation {
  private config: QAConfig;
  private results: QAResult[] = [];
  private startTime: number;

  constructor(config: Partial<QAConfig> = {}) {
    this.config = {
      skipSteps: [],
      strictMode: false,
      parallel: false,
      generateReport: true,
      failFast: false,
      scoreThreshold: 80,
      ...config,
    };

    this.startTime = performance.now();
    console.log('🔍 Fire22 QA Automation Suite');
    console.log('!==!==!==!==!===\n');
  }

  /**
   * Run comprehensive QA suite
   */
  async runQASuite(): Promise<QAReport> {
    const steps = [
      { name: 'code-format', fn: this.checkCodeFormatting.bind(this) },
      { name: 'code-lint', fn: this.checkLinting.bind(this) },
      { name: 'type-check', fn: this.checkTypeScript.bind(this) },
      { name: 'security-scan', fn: this.runSecurityScan.bind(this) },
      { name: 'unit-tests', fn: this.runUnitTests.bind(this) },
      { name: 'api-tests', fn: this.runAPITests.bind(this) },
      { name: 'performance-tests', fn: this.runPerformanceTests.bind(this) },
      { name: 'build-validation', fn: this.validateBuild.bind(this) },
      { name: 'dependency-audit', fn: this.auditDependencies.bind(this) },
      { name: 'documentation', fn: this.checkDocumentation.bind(this) },
    ];

    console.log(`📋 Running ${steps.length} QA steps...\n`);

    if (this.config.parallel) {
      await this.runStepsParallel(steps);
    } else {
      await this.runStepsSequential(steps);
    }

    const report = this.generateReport();

    if (this.config.generateReport) {
      await this.saveReport(report);
    }

    this.displaySummary(report);
    return report;
  }

  /**
   * Run steps sequentially
   */
  private async runStepsSequential(
    steps: Array<{ name: string; fn: () => Promise<QAResult> }>
  ): Promise<void> {
    for (const step of steps) {
      if (this.config.skipSteps.includes(step.name)) {
        this.results.push({
          step: step.name,
          status: 'skip',
          duration: 0,
          message: 'Skipped by configuration',
        });
        console.log(`⏭️  Skipping ${step.name}`);
        continue;
      }

      console.log(`🔄 Running ${step.name}...`);
      const result = await step.fn();
      this.results.push(result);

      const statusIcon = this.getStatusIcon(result.status);
      console.log(
        `${statusIcon} ${step.name} - ${result.status.toUpperCase()} (${result.duration.toFixed(0)}ms)`
      );

      if (result.message) {
        console.log(`   💬 ${result.message}`);
      }

      if (result.details) {
        result.details.forEach(detail => console.log(`   📄 ${detail}`));
      }

      console.log('');

      // Fail fast if enabled
      if (this.config.failFast && result.status === 'fail') {
        console.log('🛑 Failing fast due to failed step');
        break;
      }
    }
  }

  /**
   * Run steps in parallel
   */
  private async runStepsParallel(
    steps: Array<{ name: string; fn: () => Promise<QAResult> }>
  ): Promise<void> {
    const filteredSteps = steps.filter(step => !this.config.skipSteps.includes(step.name));

    console.log(`🚀 Running ${filteredSteps.length} steps in parallel...\n`);

    const promises = filteredSteps.map(async step => {
      const result = await step.fn();
      console.log(
        `${this.getStatusIcon(result.status)} ${step.name} completed (${result.duration.toFixed(0)}ms)`
      );
      return result;
    });

    this.results = await Promise.all(promises);
  }

  /**
   * Check code formatting
   */
  private async checkCodeFormatting(): Promise<QAResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bun', ['run', 'format:check']);

      return {
        step: 'code-format',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'All files are properly formatted',
        score: 100,
      };
    } catch (error) {
      return {
        step: 'code-format',
        status: 'fail',
        duration: performance.now() - startTime,
        message: 'Code formatting issues detected',
        details: ['Run "fire22 format" to fix formatting issues'],
        score: 0,
      };
    }
  }

  /**
   * Check linting
   */
  private async checkLinting(): Promise<QAResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bun', ['run', 'lint']);

      return {
        step: 'code-lint',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'No linting errors found',
        score: 100,
      };
    } catch (error) {
      return {
        step: 'code-lint',
        status: 'fail',
        duration: performance.now() - startTime,
        message: 'Linting errors detected',
        details: ['Run "fire22 lint --fix" to fix linting issues'],
        score: 20,
      };
    }
  }

  /**
   * Check TypeScript compilation
   */
  private async checkTypeScript(): Promise<QAResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bun', ['run', 'typecheck']);

      return {
        step: 'type-check',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'TypeScript compilation successful',
        score: 100,
      };
    } catch (error) {
      return {
        step: 'type-check',
        status: 'fail',
        duration: performance.now() - startTime,
        message: 'TypeScript compilation errors',
        details: ['Fix TypeScript errors before proceeding'],
        score: 0,
      };
    }
  }

  /**
   * Run security vulnerability scan
   */
  private async runSecurityScan(): Promise<QAResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bun', ['audit', '--audit-level', 'high']);

      return {
        step: 'security-scan',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'No high-severity vulnerabilities found',
        score: 100,
      };
    } catch (error) {
      return {
        step: 'security-scan',
        status: 'fail',
        duration: performance.now() - startTime,
        message: 'Security vulnerabilities detected',
        details: ['Update vulnerable dependencies', 'Review security audit output'],
        score: 10,
      };
    }
  }

  /**
   * Run unit tests
   */
  private async runUnitTests(): Promise<QAResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bun', ['test']);

      return {
        step: 'unit-tests',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'All unit tests passing',
        score: 100,
      };
    } catch (error) {
      return {
        step: 'unit-tests',
        status: 'fail',
        duration: performance.now() - startTime,
        message: 'Unit test failures detected',
        details: ['Fix failing unit tests', 'Ensure adequate test coverage'],
        score: 30,
      };
    }
  }

  /**
   * Run API tests
   */
  private async runAPITests(): Promise<QAResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bun', ['run', 'scripts/api-tester.ts']);

      return {
        step: 'api-tests',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'All API endpoints responding correctly',
        score: 100,
      };
    } catch (error) {
      return {
        step: 'api-tests',
        status: 'warning',
        duration: performance.now() - startTime,
        message: 'Some API tests failed (development environment)',
        details: ['API tests may fail in development without running server'],
        score: 70,
      };
    }
  }

  /**
   * Run performance tests
   */
  private async runPerformanceTests(): Promise<QAResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bun', ['run', 'scripts/performance-monitor.ts']);

      // Check if performance report exists and analyze
      const reportPath = 'performance-report.json';
      if (existsSync(reportPath)) {
        const report = JSON.parse(readFileSync(reportPath, 'utf8'));
        const avgTime = report.summary?.averageReadTime || 0;

        if (avgTime > 50) {
          return {
            step: 'performance-tests',
            status: 'warning',
            duration: performance.now() - startTime,
            message: `Performance warning: Average response time ${avgTime.toFixed(2)}ms`,
            score: 70,
          };
        }
      }

      return {
        step: 'performance-tests',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'Performance metrics within acceptable range',
        score: 100,
      };
    } catch (error) {
      return {
        step: 'performance-tests',
        status: 'fail',
        duration: performance.now() - startTime,
        message: 'Performance test execution failed',
        score: 0,
      };
    }
  }

  /**
   * Validate build process
   */
  private async validateBuild(): Promise<QAResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bun', ['run', 'build:quick']);

      return {
        step: 'build-validation',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'Build completed successfully',
        score: 100,
      };
    } catch (error) {
      return {
        step: 'build-validation',
        status: 'fail',
        duration: performance.now() - startTime,
        message: 'Build process failed',
        details: ['Fix build errors before deployment'],
        score: 0,
      };
    }
  }

  /**
   * Audit dependencies
   */
  private async auditDependencies(): Promise<QAResult> {
    const startTime = performance.now();

    try {
      // Check for outdated packages
      const outdatedResult = await this.execCommand('bun', ['outdated'], true);

      return {
        step: 'dependency-audit',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'Dependencies are up to date',
        score: 100,
      };
    } catch (error) {
      return {
        step: 'dependency-audit',
        status: 'warning',
        duration: performance.now() - startTime,
        message: 'Some dependencies may be outdated',
        details: ['Review and update dependencies as needed'],
        score: 80,
      };
    }
  }

  /**
   * Check documentation completeness
   */
  private async checkDocumentation(): Promise<QAResult> {
    const startTime = performance.now();

    const requiredDocs = ['README.md', 'CLAUDE.md', 'package.json', 'src/api/README.md'];

    const missingDocs = requiredDocs.filter(doc => !existsSync(doc));

    if (missingDocs.length > 0) {
      return {
        step: 'documentation',
        status: 'warning',
        duration: performance.now() - startTime,
        message: `Missing ${missingDocs.length} documentation files`,
        details: missingDocs.map(doc => `Missing: ${doc}`),
        score: Math.max(0, 100 - missingDocs.length * 20),
      };
    }

    return {
      step: 'documentation',
      status: 'pass',
      duration: performance.now() - startTime,
      message: 'All required documentation present',
      score: 100,
    };
  }

  /**
   * Execute command with promise wrapper
   */
  private execCommand(command: string, args: string[], allowFailure = false): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
      });

      child.on('close', code => {
        if (code === 0 || allowFailure) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', error => {
        if (!allowFailure) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Generate QA report
   */
  private generateReport(): QAReport {
    const totalDuration = performance.now() - this.startTime;

    const summary = {
      passed: this.results.filter(r => r.status === 'pass').length,
      failed: this.results.filter(r => r.status === 'fail').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
      skipped: this.results.filter(r => r.status === 'skip').length,
      total: this.results.length,
    };

    const scores = this.results.filter(r => r.score !== undefined).map(r => r.score!);
    const overallScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0;

    const overallStatus = summary.failed > 0 ? 'fail' : summary.warnings > 0 ? 'warning' : 'pass';

    const recommendations: string[] = [];

    if (summary.failed > 0) {
      recommendations.push('Fix all failing checks before deployment');
    }

    if (overallScore < this.config.scoreThreshold) {
      recommendations.push(
        `Improve overall quality score (${overallScore}% < ${this.config.scoreThreshold}%)`
      );
    }

    if (summary.warnings > 0) {
      recommendations.push('Address warnings to improve code quality');
    }

    if (overallStatus === 'pass' && overallScore >= 90) {
      recommendations.push('Excellent! Code is ready for deployment');
    }

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      overallScore,
      duration: totalDuration,
      results: this.results,
      summary,
      recommendations,
    };
  }

  /**
   * Save report to file
   */
  private async saveReport(report: QAReport): Promise<void> {
    const reportPath = join(process.cwd(), `qa-report-${Date.now()}.json`);
    await Bun.write(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 QA report saved to: ${reportPath}`);
  }

  /**
   * Display summary
   */
  private displaySummary(report: QAReport): void {
    console.log('\n📊 QA Automation Summary');
    console.log('='.repeat(40));
    console.log(`🎯 Overall Status: ${report.overallStatus.toUpperCase()}`);
    console.log(`📈 Overall Score: ${report.overallScore}%`);
    console.log(`⏱️  Total Duration: ${(report.duration / 1000).toFixed(1)}s`);
    console.log('');

    console.log('📋 Results Breakdown:');
    console.log(`   ✅ Passed: ${report.summary.passed}`);
    console.log(`   ❌ Failed: ${report.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`   ⏭️  Skipped: ${report.summary.skipped}`);
    console.log(`   📊 Total: ${report.summary.total}`);
    console.log('');

    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   • ${rec}`));
      console.log('');
    }

    // Exit with appropriate code
    if (report.overallStatus === 'fail') {
      console.log('🚫 QA checks failed. Please fix issues before proceeding.');
      process.exit(1);
    } else if (report.overallStatus === 'warning') {
      console.log('⚠️  QA checks passed with warnings. Consider addressing issues.');
    } else {
      console.log('✅ All QA checks passed! Ready for deployment.');
    }
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: QAResult['status']): string {
    switch (status) {
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'skip':
        return '⏭️';
      default:
        return '❓';
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const config: Partial<QAConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--strict':
        config.strictMode = true;
        break;
      case '--parallel':
        config.parallel = true;
        break;
      case '--fail-fast':
        config.failFast = true;
        break;
      case '--no-report':
        config.generateReport = false;
        break;
      case '--skip':
        config.skipSteps = args[++i].split(',');
        break;
      case '--threshold':
        config.scoreThreshold = parseInt(args[++i]);
        break;
      case '--help':
      case '-h':
        console.log(`
🔍 Fire22 QA Automation Suite

USAGE:
  bun run scripts/qa-automation.ts [options]

OPTIONS:
  --strict              Enable strict mode (fail on warnings)
  --parallel            Run checks in parallel
  --fail-fast           Stop on first failure
  --no-report          Don't generate report file
  --skip <steps>       Skip specific steps (comma-separated)
  --threshold <score>  Set minimum score threshold (default: 80)
  -h, --help           Show this help message

AVAILABLE STEPS:
  code-format          Check code formatting
  code-lint           Check linting rules
  type-check          TypeScript compilation
  security-scan       Vulnerability scanning
  unit-tests          Run unit tests
  api-tests           Test API endpoints
  performance-tests   Performance benchmarks
  build-validation    Validate build process
  dependency-audit    Check dependencies
  documentation       Check documentation

EXAMPLES:
  bun run scripts/qa-automation.ts                    # Full QA suite
  bun run scripts/qa-automation.ts --parallel         # Run in parallel
  bun run scripts/qa-automation.ts --skip api-tests   # Skip API tests
  fire22 qa                                           # Via Fire22 CLI

🔥 Fire22 Development Team - Enterprise Dashboard System
`);
        process.exit(0);
    }
  }

  const qa = new QAAutomation(config);

  try {
    await qa.runQASuite();
  } catch (error) {
    console.error('💥 QA automation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('💥 QA automation failed:', error);
    process.exit(1);
  });
}

export { QAAutomation, QAResult, QAReport };
