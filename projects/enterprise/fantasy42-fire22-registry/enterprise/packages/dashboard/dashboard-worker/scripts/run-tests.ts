#!/usr/bin/env bun
/**
 * 🧪 Fire22 Dashboard - Test Runner Script
 * Advanced test runner with reporting and cleanup
 */

import { spawn } from 'child_process';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestOptions {
  type?: 'all' | 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
  coverage?: boolean;
  watch?: boolean;
  verbose?: boolean;
  bail?: boolean;
  parallel?: boolean;
  filter?: string;
}

class TestRunner {
  private options: TestOptions;
  private testDatabase = './test-dashboard.db';
  private coverageDir = './coverage';

  constructor(options: TestOptions = {}) {
    this.options = {
      type: 'all',
      coverage: false,
      watch: false,
      verbose: false,
      bail: false,
      parallel: true,
      ...options,
    };
  }

  /**
   * Setup test environment
   */
  async setup(): Promise<void> {
    console.log('🔧 Setting up test environment...');

    // Clean up previous test database
    if (existsSync(this.testDatabase)) {
      unlinkSync(this.testDatabase);
      console.log('🗑️ Cleaned up previous test database');
    }

    // Create coverage directory
    if (this.options.coverage && !existsSync(this.coverageDir)) {
      mkdirSync(this.coverageDir, { recursive: true });
      console.log('📊 Created coverage directory');
    }

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.TEST_DATABASE_URL = `file:${this.testDatabase}`;
    process.env.TEST_PORT = '4001';
    process.env.TEST_API_KEY = 'test_key_123';
    process.env.TEST_DEBUG = this.options.verbose ? 'true' : 'false';

    console.log('✅ Test environment setup complete');
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');

    // Remove test database
    if (existsSync(this.testDatabase)) {
      unlinkSync(this.testDatabase);
      console.log('🗑️ Removed test database');
    }

    console.log('✅ Test environment cleanup complete');
  }

  /**
   * Build test command
   */
  buildCommand(): string[] {
    const cmd = ['bun', 'test'];

    // Add config
    cmd.push('--config', 'bun.test.config.ts');

    // Add test type filter
    if (this.options.type !== 'all') {
      cmd.push(`tests/${this.options.type}/`);
    }

    // Add coverage
    if (this.options.coverage) {
      cmd.push('--coverage');
    }

    // Add watch mode
    if (this.options.watch) {
      cmd.push('--watch');
    }

    // Add verbose output
    if (this.options.verbose) {
      cmd.push('--verbose');
    }

    // Add bail option
    if (this.options.bail) {
      cmd.push('--bail=1');
    }

    // Add filter
    if (this.options.filter) {
      cmd.push('--filter', this.options.filter);
    }

    return cmd;
  }

  /**
   * Run tests
   */
  async run(): Promise<number> {
    await this.setup();

    const command = this.buildCommand();
    console.log('🚀 Running tests:', command.join(' '));

    return new Promise(resolve => {
      const child = spawn(command[0], command.slice(1), {
        stdio: 'inherit',
        env: { ...process.env },
      });

      child.on('close', async code => {
        if (!this.options.watch) {
          await this.cleanup();
        }
        resolve(code || 0);
      });

      child.on('error', async error => {
        console.error('❌ Test execution failed:', error);
        await this.cleanup();
        resolve(1);
      });
    });
  }

  /**
   * Generate test report
   */
  async generateReport(): Promise<void> {
    console.log('📊 Generating test report...');

    if (existsSync(join(this.coverageDir, 'coverage-final.json'))) {
      console.log(`📈 Coverage report available at: ${join(this.coverageDir, 'index.html')}`);
    }

    // Additional reporting logic can be added here
    console.log('✅ Test report generated');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  const options: TestOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--type':
      case '-t':
        options.type = args[++i] as TestOptions['type'];
        break;
      case '--coverage':
      case '-c':
        options.coverage = true;
        break;
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--bail':
      case '-b':
        options.bail = true;
        break;
      case '--filter':
      case '-f':
        options.filter = args[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
🧪 Fire22 Dashboard Test Runner

Usage: bun run scripts/run-tests.ts [options]

Options:
  -t, --type <type>      Test type: all, unit, integration, e2e, performance, security (default: all)
  -c, --coverage         Generate coverage report
  -w, --watch           Watch mode
  -v, --verbose         Verbose output
  -b, --bail            Bail on first failure
  -f, --filter <filter> Filter tests by name pattern
  -h, --help            Show this help message

Examples:
  bun run scripts/run-tests.ts                    # Run all tests
  bun run scripts/run-tests.ts -t unit           # Run unit tests only
  bun run scripts/run-tests.ts -c                # Run with coverage
  bun run scripts/run-tests.ts -t integration -v # Run integration tests with verbose output
  bun run scripts/run-tests.ts -w                # Run in watch mode
  bun run scripts/run-tests.ts -f "customer"     # Run tests matching "customer"
`);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const options = parseArgs();
    const runner = new TestRunner(options);

    console.log('🧪 Fire22 Dashboard Test Runner');
    console.log('!==!==!==!==!==!==');

    const exitCode = await runner.run();

    if (options.coverage && !options.watch) {
      await runner.generateReport();
    }

    if (exitCode === 0) {
      console.log('✅ All tests passed!');
    } else {
      console.log('❌ Some tests failed!');
    }

    process.exit(exitCode);
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export default TestRunner;
