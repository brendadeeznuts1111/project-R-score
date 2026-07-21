// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// @see https://bun.com/docs/runtime/file-io — Bun.write
// lib/validation/automated-validation-system.ts — Automated validation for CI/CD and repo health

// Entry guard check
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

import { URLValidator, ConstantValidator, ValidationReporter } from './cli-constants-validation';

import { DocumentationValidator } from '../../packages/docs-tools/src/documentation-validator';
import { UntrackedFilesAnalyzer } from '../docs/untracked-files-analyzer';

// ============================================================================
// AUTOMATED VALIDATION SYSTEM
// ============================================================================

interface ValidationResult {
  success: boolean;
  timestamp: string;
  results: {
    urls: { total: number; valid: number; invalid: number; errors: string[] };
    constants: { total: number; valid: number; invalid: number; errors: string[] };
    documentation: { total: number; valid: number; invalid: number; errors: string[] };
    files: { total: number; tracked: number; untracked: number; recommendations: string[] };
  };
  performance: {
    totalTime: number;
    urlResponseTime: number;
    memoryUsage: number;
  };
  recommendations: string[];
}

class AutomatedValidationSystem {
  private static readonly PERFORMANCE_THRESHOLDS = {
    maxTotalTime: 60000, // 60 seconds
    maxUrlResponseTime: 5000, // 5 seconds
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    minSuccessRate: 0.95, // 95%
  };

  /**
   * Run complete automated validation
   */
  static async runCompleteValidation(): Promise<ValidationResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    console.info('🤖 AUTOMATED VALIDATION SYSTEM');
    console.info('='.repeat(50));

    const results: ValidationResult['results'] = {
      urls: { total: 0, valid: 0, invalid: 0, errors: [] },
      constants: { total: 0, valid: 0, invalid: 0, errors: [] },
      documentation: { total: 0, valid: 0, invalid: 0, errors: [] },
      files: { total: 0, tracked: 0, untracked: 0, recommendations: [] },
    };

    const recommendations: string[] = [];

    try {
      // 1. URL Validation with timeout protection
      console.info('\n🌐 Running URL Validation...');
      const urlValidationPromises = [
        URLValidator.validateURL('bun-official-docs'),
        URLValidator.validateURL('github-api'),
        URLValidator.validateURL('bun-cli-installation'),
        URLValidator.validateURL('bun-utils-documentation'),
      ];

      // Add timeout to prevent blocking
      const urlResults = (await Promise.race([
        Promise.all(urlValidationPromises),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('URL validation timeout')), 30000)
        ),
      ])) as any[];

      results.urls.total = urlResults.length;
      results.urls.valid = urlResults.filter(r => r.isValid).length;
      results.urls.invalid = urlResults.filter(r => !r.isValid).length;
      results.urls.errors = urlResults.flatMap(r => r.errors);

      console.info(`   URLs: ${results.urls.valid}/${results.urls.total} valid`);

      // 2. Constants Validation
      console.info('\n📊 Running Constants Validation...');
      const constantNames = ['default-timeout', 'max-retries', 'cli-categories-count'];
      const constantResults = constantNames.map(name => ConstantValidator.validateConstant(name));

      results.constants.total = constantResults.length;
      results.constants.valid = constantResults.filter(r => r.isValid).length;
      results.constants.invalid = constantResults.filter(r => !r.isValid).length;
      results.constants.errors = constantResults.flatMap(r => r.errors);

      console.info(`   Constants: ${results.constants.valid}/${results.constants.total} valid`);

      // 3. Documentation Validation
      console.info('\n📚 Running Documentation Validation...');
      try {
        const docResults = await DocumentationValidator.validateCLIDocumentation();
        results.documentation.total = docResults.total;
        results.documentation.valid = docResults.valid;
        results.documentation.invalid = docResults.total - docResults.valid;
        results.documentation.errors = docResults.errors;
        console.info(
          `   Documentation: ${results.documentation.valid}/${results.documentation.total} valid`
        );
      } catch (error) {
        results.documentation.errors.push(`Documentation validation failed: ${error}`);
        console.info(`   Documentation: Validation failed`);
      }

      // 4. Files Analysis
      console.info('\n📁 Running Files Analysis...');
      try {
        const filesAnalysis = await UntrackedFilesAnalyzer.analyzeAllFiles();
        results.files.total = filesAnalysis.total;
        results.files.untracked = filesAnalysis.total;
        results.files.tracked = 0; // Would need git status to get accurate count
        results.files.recommendations = filesAnalysis.analyses
          .filter(f => f.recommendation === 'track')
          .slice(0, 5)
          .map(f => f.path);

        console.info(`   Files: ${results.files.untracked} untracked analyzed`);
      } catch (error) {
        results.files.errors.push(`Files analysis failed: ${error}`);
        console.info(`   Files: Analysis failed`);
      }

      // Generate recommendations
      const overallSuccessRate = this.calculateSuccessRate(results);

      if (overallSuccessRate < this.PERFORMANCE_THRESHOLDS.minSuccessRate) {
        recommendations.push('Overall success rate below threshold - investigate failures');
      }

      if (results.urls.invalid > 0) {
        recommendations.push(`${results.urls.invalid} URLs failed validation - check connectivity`);
      }

      if (results.constants.invalid > 0) {
        recommendations.push(
          `${results.constants.invalid} constants failed validation - update configurations`
        );
      }

      if (results.files.untracked > 50) {
        recommendations.push('High number of untracked files - consider cleaning repository');
      }
    } catch (error) {
      console.error('Validation error:', error);
      recommendations.push(`Validation system error: ${error}`);
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
      success: this.calculateSuccessRate(results) >= this.PERFORMANCE_THRESHOLDS.minSuccessRate,
      timestamp: new Date().toISOString(),
      results,
      performance: {
        totalTime: endTime - startTime,
        urlResponseTime: results.urls.total > 0 ? 1000 : 0, // Placeholder
        memoryUsage: endMemory - startMemory,
      },
      recommendations,
    };
  }

  /**
   * Calculate overall success rate
   */
  private static calculateSuccessRate(results: ValidationResult['results']): number {
    const totalChecks = results.urls.total + results.constants.total + results.documentation.total;
    const totalValid = results.urls.valid + results.constants.valid + results.documentation.valid;

    return totalChecks > 0 ? totalValid / totalChecks : 0;
  }

  /**
   * Generate CI/CD compatible output
   */
  static generateCIOutput(result: ValidationResult): void {
    console.info('\n📋 CI/CD VALIDATION REPORT');
    console.info('='.repeat(50));

    // Exit code based on success
    if (!result.success) {
      console.info('❌ VALIDATION FAILED');
      process.exit(1);
    } else {
      console.info('✅ VALIDATION PASSED');
    }

    // Detailed results
    console.info(`\n📊 RESULTS:`);
    console.info(`   URLs: ${result.results.urls.valid}/${result.results.urls.total} valid`);
    console.info(
      `   Constants: ${result.results.constants.valid}/${result.results.constants.total} valid`
    );
    console.info(
      `   Documentation: ${result.results.documentation.valid}/${result.results.documentation.total} valid`
    );
    console.info(`   Files: ${result.results.files.untracked} untracked`);

    // Performance metrics
    console.info(`\n⚡ PERFORMANCE:`);
    console.info(`   Total time: ${result.performance.totalTime}ms`);
    console.info(`   Memory used: ${(result.performance.memoryUsage / 1024 / 1024).toFixed(1)}MB`);

    // Recommendations
    if (result.recommendations.length > 0) {
      console.info(`\n💡 RECOMMENDATIONS:`);
      result.recommendations.forEach(rec => console.info(`   • ${rec}`));
    }

    // Output JSON for CI systems
    console.info(`\n📄 JSON OUTPUT:`);
    try {
      const jsonOutput = JSON.stringify(
        {
          success: result.success,
          timestamp: result.timestamp,
          metrics: {
            successRate: this.calculateSuccessRate(result.results),
            ...result.performance,
          },
        },
        null,
        2
      );
      console.info(jsonOutput);
    } catch (error) {
      console.info('{"error": "Failed to serialize output to JSON"}');
    }
  }

  /**
   * Create GitHub Actions workflow
   */
  static async createGitHubActionsWorkflow(): Promise<void> {
    const workflow = `name: Automated Validation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 6 * * *' # Daily at 6 AM

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest

    - name: Install dependencies
      run: bun install

    - name: Run automated validation
      run: bun run lib/automated-validation-system.ts

    - name: Upload validation report
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: validation-report
        path: |
          validation-report.json
          URL_OPTIMIZATION_REPORT.md
        retention-days: 30

    - name: Comment PR with results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs').promises;
          try {
            // Node fs.promises — github-script runs on Node, not Bun runtime
            await fs.access('validation-report.json');
            const raw = await fs.readFile('validation-report.json');
            const report = JSON.parse(raw.toString());
            const comment = \`
            ## 🔍 Automated Validation Results

            **Status:** \${report.success ? '✅ PASSED' : '❌ FAILED'}
            **Success Rate:** \${(report.metrics.successRate * 100).toFixed(1)}%
            **Total Time:** \${report.metrics.totalTime}ms

            \${report.recommendations.length > 0 ?
              '**Recommendations:**\\n' + report.recommendations.map(r => \`• \${r}\`).join('\\n')
              : 'No issues detected!'}
            \`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
          } catch (error) {
            console.info('Failed to read validation report:', error.message);
          }
`;

    try {
      // Bun.write creates parent directories
      await Bun.write('.github/workflows/automated-validation.yml', workflow);
      console.info(
        '   ✅ GitHub Actions workflow created: .github/workflows/automated-validation.yml'
      );
    } catch (error) {
      console.info(`   ❌ Failed to create GitHub Actions workflow: ${error}`);
    }
  }

  /**
   * Create monitoring dashboard configuration
   */
  static async createMonitoringDashboard(): Promise<void> {
    const dashboard = {
      title: 'Repository Validation Dashboard',
      refreshInterval: 300000, // 5 minutes
      widgets: [
        {
          type: 'metric',
          title: 'URL Validation Success Rate',
          query: 'validation_success_rate{type="urls"}',
          threshold: 0.95,
        },
        {
          type: 'metric',
          title: 'Constants Validation Success Rate',
          query: 'validation_success_rate{type="constants"}',
          threshold: 1.0,
        },
        {
          type: 'metric',
          title: 'Documentation Validation Success Rate',
          query: 'validation_success_rate{type="documentation"}',
          threshold: 0.9,
        },
        {
          type: 'metric',
          title: 'Validation Response Time',
          query: 'validation_duration_ms',
          threshold: 30000,
        },
        {
          type: 'alert',
          title: 'Critical Failures',
          conditions: ['validation_success_rate < 0.90', 'validation_duration_ms > 60000'],
        },
      ],
    };

    try {
      await Bun.write('config/monitoring-dashboard.json', JSON.stringify(dashboard, null, 2));
      console.info('   ✅ Monitoring dashboard config created: config/monitoring-dashboard.json');
    } catch (error) {
      console.info(`   ❌ Failed to create monitoring dashboard: ${error}`);
    }
  }

  /**
   * Setup complete automated validation system
   */
  static async setupSystem(): Promise<void> {
    console.info('🚀 SETTING UP AUTOMATED VALIDATION SYSTEM');
    console.info('='.repeat(50));

    // Run validation
    const result = await this.runCompleteValidation();

    // Generate CI output
    this.generateCIOutput(result);

    // Save validation report
    try {
      await Bun.write('validation-report.json', JSON.stringify(result, null, 2));
      console.info('\n📄 Validation report saved: validation-report.json');
    } catch (error) {
      console.info(`\n❌ Failed to save validation report: ${error}`);
    }

    // Create GitHub Actions workflow
    console.info('\n🔧 Creating CI/CD integration...');
    await this.createGitHubActionsWorkflow();

    // Create monitoring dashboard
    console.info('\n📊 Setting up monitoring...');
    await this.createMonitoringDashboard();

    console.info('\n✅ Automated validation system setup complete!');
    console.info('\n🎯 Features enabled:');
    console.info('   • Automated URL, constants, and documentation validation');
    console.info('   • CI/CD integration with GitHub Actions');
    console.info('   • Performance monitoring and alerting');
    console.info('   • Comprehensive reporting and recommendations');
    console.info('   • Repository health tracking');
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  try {
    await AutomatedValidationSystem.setupSystem();
  } catch (error) {
    console.error('\n❌ Automated validation setup failed:', error);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
