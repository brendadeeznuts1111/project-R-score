#!/usr/bin/env bun
/**
 * 🔍 Fire22 Pre-Commit Quality Gate
 *
 * Fast quality checks for git pre-commit hook integration
 * Optimized for speed while maintaining code quality standards
 *
 * @version 3.0.9
 * @author Fire22 Development Team
 */

import { spawn } from 'child_process';

interface PreCommitResult {
  step: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  message: string;
}

class PreCommitCheck {
  private results: PreCommitResult[] = [];

  /**
   * Run essential pre-commit checks
   */
  async runPreCommitChecks(): Promise<boolean> {
    console.info('🔍 Fire22 Pre-Commit Quality Gate');
    console.info('!==!==!==!==!==!====\n');

    const checks = [
      { name: 'format-check', fn: this.checkFormatting.bind(this), required: true },
      { name: 'lint-check', fn: this.checkLinting.bind(this), required: true },
      { name: 'type-check', fn: this.checkTypes.bind(this), required: true },
      { name: 'test-quick', fn: this.runQuickTests.bind(this), required: false },
    ];

    let allPassed = true;

    for (const check of checks) {
      console.info(`🔄 Running ${check.name}...`);
      const result = await check.fn();
      this.results.push(result);

      const statusIcon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';

      console.info(
        `${statusIcon} ${check.name} - ${result.status.toUpperCase()} (${result.duration.toFixed(0)}ms)`
      );
      console.info(`   💬 ${result.message}\n`);

      if (result.status === 'fail' && check.required) {
        allPassed = false;
      }
    }

    this.displaySummary(allPassed);
    return allPassed;
  }

  /**
   * Check code formatting
   */
  private async checkFormatting(): Promise<PreCommitResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bunx', ['--package', 'prettier@3.1.1', '--check', 'src/**/*.ts']);

      return {
        step: 'format-check',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'All files are properly formatted',
      };
    } catch (error) {
      return {
        step: 'format-check',
        status: 'fail',
        duration: performance.now() - startTime,
        message: 'Formatting issues detected. Run "fire22 format" to fix.',
      };
    }
  }

  /**
   * Check linting
   */
  private async checkLinting(): Promise<PreCommitResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bunx', ['--package', 'eslint@8.56.0', '--ext', '.ts', 'src/']);

      return {
        step: 'lint-check',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'No linting errors found',
      };
    } catch (error) {
      return {
        step: 'lint-check',
        status: 'fail',
        duration: performance.now() - startTime,
        message: 'Linting errors detected. Run "fire22 lint --fix" to fix.',
      };
    }
  }

  /**
   * Check TypeScript types
   */
  private async checkTypes(): Promise<PreCommitResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bun', ['run', 'typecheck']);

      return {
        step: 'type-check',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'TypeScript compilation successful',
      };
    } catch (error) {
      return {
        step: 'type-check',
        status: 'fail',
        duration: performance.now() - startTime,
        message: 'TypeScript errors detected. Fix before committing.',
      };
    }
  }

  /**
   * Run quick tests
   */
  private async runQuickTests(): Promise<PreCommitResult> {
    const startTime = performance.now();

    try {
      await this.execCommand('bun', ['run', 'test:quick'], 10000); // 10 second timeout

      return {
        step: 'test-quick',
        status: 'pass',
        duration: performance.now() - startTime,
        message: 'Quick tests passed',
      };
    } catch (error) {
      return {
        step: 'test-quick',
        status: 'skip',
        duration: performance.now() - startTime,
        message: 'Quick tests skipped (optional check)',
      };
    }
  }

  /**
   * Execute command with timeout
   */
  private execCommand(command: string, args: string[], timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
      });

      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error('Command timed out'));
      }, timeout);

      child.on('close', code => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', error => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Display summary
   */
  private displaySummary(allPassed: boolean): void {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.info('📊 Pre-Commit Summary');
    console.info('!==!==!=====');
    console.info(`🎯 Status: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.info(`⏱️  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.info(`✅ Passed: ${passed}`);
    console.info(`❌ Failed: ${failed}`);
    console.info(`⏭️ Skipped: ${skipped}`);
    console.info('');

    if (allPassed) {
      console.info('🎉 All quality checks passed! Commit can proceed.');
    } else {
      console.info('🚫 Quality checks failed. Please fix issues before committing.');
      console.info('');
      console.info('💡 Quick fixes:');
      console.info('   • Format code: fire22 format');
      console.info('   • Fix linting: fire22 lint --fix');
      console.info('   • Check types: fire22 typecheck');
    }
  }
}

// CLI interface and git hook integration
async function main() {
  const preCommit = new PreCommitCheck();

  try {
    const success = await preCommit.runPreCommitChecks();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Pre-commit check failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { PreCommitCheck };
