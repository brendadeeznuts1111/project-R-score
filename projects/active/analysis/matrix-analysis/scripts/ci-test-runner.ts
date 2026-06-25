#!/usr/bin/env bun
/**
 * CI-aware Test Runner
 *
 * Automatically adjusts test behavior based on the CI environment.
 *
 * Usage:
 *   bun run scripts/ci-test-runner.ts [patterns...]
 *   bun run test:ci
 */

import { spawn } from 'bun';
import { CIDetector } from '../src/lib/ci-detector';
import { testConfig } from '../src/lib/test-config';

interface TestResult {
  passed: boolean;
  failed: number;
  total: number;
  duration: number;
  coverage?: number;
}

interface ParsedTestOutput {
  passed: number;
  failed: number;
  total: number;
  coverage?: number;
}

interface TestExecutionResult {
  passed: boolean;
  failed: number;
  total: number;
  coverage?: number;
}

class CITestRunner {
  private ci: ReturnType<CIDetector['detect']>;
  private config: ReturnType<typeof testConfig.getConfig>;

  constructor() {
    this.ci = CIDetector.getInstanceSync().detectSync();
    this.config = testConfig.getConfig();

    // Configure environment
    testConfig.configureEnvironment();
  }

  /**
   * Run tests with CI-aware configuration
   */
  async run(patterns: string[] = []): Promise<TestResult> {
    this.printBanner();

    if (patterns.length === 0) {
      patterns = this.config.patterns;
    }

    // Build test command
    const args = this.buildTestCommand(patterns);

    console.info('🧪 Test Configuration:');
    console.info(`   Environment: ${this.ci.name}`);
    console.info(`   Timeout: ${this.config.timeout}ms`);
    console.info(`   Concurrency: ${this.config.concurrency}`);
    console.info(`   Coverage: ${this.config.coverage ? 'enabled' : 'disabled'}`);
    console.info(`   Retry Count: ${this.config.retryCount}`);

    if (this.ci.isPR) {
      console.info(`   Pull Request: Yes`);
    }

    console.info();
    console.info('📝 Command:', `bun ${args.join(' ')}`);
    console.info();

    // Emit start annotation
    if (this.ci.isGitHubActions) {
      CIDetector.getInstanceSync().startGroup('Test Execution');
    }

    const startTime = Date.now();

    // Run tests
    const parsedResult = await this.executeTest(args);

    const duration = Date.now() - startTime;

    // Convert to TestResult format
    const result: TestResult = {
      passed: parsedResult.passed,
      failed: parsedResult.failed,
      total: parsedResult.total,
      duration,
      coverage: parsedResult.coverage
    };

    // Emit end annotation
    if (this.ci.isGitHubActions) {
      CIDetector.getInstanceSync().endGroup();
    }

    // Print results
    this.printResults(result);

    // Emit annotations for failures
    if (!result.passed && this.ci.annotations.enabled) {
      this.emitFailureAnnotations(result);
    }

    return result;
  }

  /**
   * Build the test command with appropriate flags
   */
  private buildTestCommand(patterns: string[]): string[] {
    const args = ['test'];

    // Add timeout
    args.push(`--timeout=${this.config.timeout}`);

    // Add coverage if enabled
    if (this.config.coverage) {
      args.push('--coverage');

      // Configure coverage reporters for CI
      if (this.ci.isCI) {
        args.push('--coverage-reporter=text');
        args.push('--coverage-reporter=lcov');
      }
    }

    // Add concurrency limit
    args.push(`--max-concurrency=${this.config.concurrency}`);

    // Add retry for CI
    if (this.ci.isCI && this.config.retryCount > 0) {
      args.push(`--rerun-each=${this.config.retryCount + 1}`);
    }

    // Add bail for CI (stop after first failure)
    if (this.ci.isCI) {
      args.push('--bail=10'); // Stop after 10 failures
    }

    // Add patterns
    args.push(...patterns.map(p => p.startsWith('./') ? p : `./${p}`));

    return args;
  }

  /**
   * Execute tests and parse output
   */
  private async executeTest(args: string[]): Promise<TestExecutionResult> {
    const proc = spawn({
      cmd: ['bun', ...args],
      stdout: 'pipe',
      stderr: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    // Collect output
    if (proc.stdout) {
      for await (const chunk of proc.stdout) {
        stdout += new TextDecoder().decode(chunk);
      }
    }

    if (proc.stderr) {
      for await (const chunk of proc.stderr) {
        stderr += new TextDecoder().decode(chunk);
      }
    }

    const exitCode = await proc.exited;

    // Parse the output
    const parsed = this.parseTestOutput(stdout + stderr);

    // If parsing failed, use fallback values
    if (parsed.total === 0) {
      return {
        passed: exitCode === 0,
        failed: exitCode === 0 ? 0 : 1,
        total: 1
      };
    }

    return {
      passed: parsed.failed === 0,
      failed: parsed.failed,
      total: parsed.total,
      coverage: parsed.coverage
    };
  }

  /**
   * Parse test output to extract metrics
   */
  private parseTestOutput(output: string): ParsedTestOutput {
    const result: ParsedTestOutput = {
      passed: 0,
      failed: 0,
      total: 0
    };

    try {
      // Parse test summary - handle various formats
      const patterns = [
        /(\d+)\s+pass(?:ed)?[\s,]*(\d+)\s+fail(?:ed)?/i,
        /(\d+)\s+fail(?:ed)?[\s,]*(\d+)\s+pass(?:ed)?/i,
        /pass(?:ed)?:\s*(\d+)[\s,]*fail(?:ed)?:\s*(\d+)/i,
        /fail(?:ed)?:\s*(\d+)[\s,]*pass(?:ed)?:\s*(\d+)/i
      ];

      let matched = false;
      for (const pattern of patterns) {
        const match = output.match(pattern);
        if (match) {
          const passed = this.safeParseInt(match[1]);
          const failed = this.safeParseInt(match[2]);

          // Check which is which based on pattern order
          if (pattern.source.includes('pass.*fail')) {
            result.passed = passed;
            result.failed = failed;
          } else {
            result.failed = passed;
            result.passed = failed;
          }

          result.total = result.passed + result.failed;
          matched = true;
          break;
        }
      }

      // Try alternative format if no match
      if (!matched) {
        const altMatch = output.match(/Ran\s+(\d+)\s+tests?[^\d]*(\d+)\s+fail/);
        if (altMatch) {
          result.total = this.safeParseInt(altMatch[1]);
          result.failed = this.safeParseInt(altMatch[2]);
          result.passed = Math.max(0, result.total - result.failed);
          matched = true;
        }
      }

      // Last resort: count "✓" and "✗" symbols
      if (!matched) {
        const passMatches = output.match(/✓/g) || [];
        const failMatches = output.match(/✗/g) || [];
        result.passed = passMatches.length;
        result.failed = failMatches.length;
        result.total = result.passed + result.failed;
      }

      // Parse coverage if available
      const coveragePatterns = [
        /coverage:?\s*(\d+)%/i,
        /Coverage:\s*(\d+(?:\.\d+)?)/,
        /(\d+(?:\.\d+)?)%\s*coverage/i
      ];

      for (const pattern of coveragePatterns) {
        const match = output.match(pattern);
        if (match) {
          const coverage = parseFloat(match[1]);
          if (!isNaN(coverage) && isFinite(coverage)) {
            result.coverage = Math.floor(coverage);
            break;
          }
        }
      }

      // Validate results
      if (result.total < 0 || result.passed < 0 || result.failed < 0) {
        console.warn('⚠️  Invalid test counts detected, using defaults');
        return { passed: 0, failed: 0, total: 0 };
      }

      if (result.passed + result.failed !== result.total) {
        console.warn('⚠️  Test count mismatch, adjusting totals');
        result.total = result.passed + result.failed;
      }

    } catch (error) {
      console.warn('⚠️  Failed to parse test output:', error instanceof Error ? error.message : 'Unknown error');
      return { passed: 0, failed: 0, total: 0 };
    }

    return result;
  }

  /**
   * Safely parse integer with bounds checking
   */
  private safeParseInt(value: string): number {
    const parsed = parseInt(value, 10);

    if (isNaN(parsed) || !isFinite(parsed)) {
      return 0;
    }

    // Ensure within safe integer range
    if (parsed > Number.MAX_SAFE_INTEGER) {
      console.warn(`⚠️  Number too large: ${value}, capping at MAX_SAFE_INTEGER`);
      return Number.MAX_SAFE_INTEGER;
    }

    if (parsed < Number.MIN_SAFE_INTEGER) {
      console.warn(`⚠️  Number too small: ${value}, capping at MIN_SAFE_INTEGER`);
      return Number.MIN_SAFE_INTEGER;
    }

    return parsed;
  }

  /**
   * Print execution banner
   */
  private printBanner(): void {
    console.info('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.info('║              CI-aware Test Runner - Environment Detection               ║');
    console.info('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.info();
  }

  /**
   * Print test results
   */
  private printResults(results: TestResult): void {
    console.info();
    console.info('📊 Test Results:');
    console.info('══════════════════════════════════════════════════════════════════════════════');

    const status = results.passed ? '✅ PASSED' : '❌ FAILED';
    const statusColor = results.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.info(`   Status: ${statusColor}${status}${reset}`);
    console.info(`   Total:  ${results.total} tests`);
    console.info(`   Passed: ${results.passed} tests`);
    console.info(`   Failed: ${results.failed} tests`);
    console.info(`   Time:   ${(results.duration / 1000).toFixed(2)}s`);

    if (results.coverage !== undefined) {
      const coverageColor = results.coverage >= 80 ? '\x1b[32m' :
                           results.coverage >= 60 ? '\x1b[33m' : '\x1b[31m';
      console.info(`   Coverage: ${coverageColor}${results.coverage}%${reset}`);
    }

    console.info('══════════════════════════════════════════════════════════════════════════════');
    console.info();

    // Emit GitHub Actions summary
    if (this.ci.isGitHubActions) {
      console.info('## Test Summary');
      console.info(`- **Status**: ${results.passed ? '✅ Passed' : '❌ Failed'}`);
      console.info(`- **Duration**: ${(results.duration / 1000).toFixed(2)}s`);

      if (results.coverage) {
        console.info(`- **Coverage**: ${results.coverage}%`);
      }

      if (this.ci.branch) {
        console.info(`- **Branch**: ${this.ci.branch}`);
      }

      if (this.ci.commit) {
        console.info(`- **Commit**: ${this.ci.commit.substring(0, 7)}`);
      }
    }
  }

  /**
   * Emit failure annotations for CI
   */
  private emitFailureAnnotations(result: Omit<TestResult, 'duration'>): void {
    if (!this.ci.annotations.enabled || result.passed) {
      return;
    }

    const detector = CIDetector.getInstanceSync();

    detector.emitAnnotation('error', `${result.failed} test(s) failed`, {
      title: 'Test Failure'
    });

    if (result.coverage && result.coverage < 80) {
      detector.emitAnnotation('warning', `Coverage is ${result.coverage}% (target: 80%)`, {
        title: 'Low Coverage'
      });
    }
  }
}

// CLI interface
async function main() {
  const patterns = process.argv.slice(2);
  const runner = new CITestRunner();

  try {
    const result = await runner.run(patterns);
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

// Export for testing
export { CITestRunner };
