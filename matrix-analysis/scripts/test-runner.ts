#!/usr/bin/env bun
/**
 * Bun Test Runner
 *
 * A comprehensive test runner that works with the organized test structure
 * and provides enhanced functionality for running tests across different groups.
 */

import { test, expect } from 'bun:test';
import { TestHelpers } from '../tests/utils/test-helpers';

// Test runner configuration
interface TestRunnerConfig {
  groups: string[];
  patterns: string[];
  timeout: number;
  parallel: boolean;
  verbose: boolean;
  coverage: boolean;
}

// Test group definitions
const TEST_GROUPS = {
  smoke: {
    name: 'Smoke Tests',
    patterns: ['tests/unit/**/*.test.ts'],
    priority: 'high',
    timeout: 3000
  },
  unit: {
    name: 'Unit Tests',
    patterns: ['tests/unit/**/*.test.ts'],
    priority: 'high',
    timeout: 5000
  },
  integration: {
    name: 'Integration Tests',
    patterns: ['tests/integration/**/*.test.ts'],
    priority: 'medium',
    timeout: 15000
  },
  e2e: {
    name: 'End-to-End Tests',
    patterns: ['tests/e2e/**/*.test.ts'],
    priority: 'low',
    timeout: 30000
  },
  performance: {
    name: 'Performance Tests',
    patterns: ['tests/performance/**/*.test.ts'],
    priority: 'low',
    timeout: 60000
  },
  security: {
    name: 'Security Tests',
    patterns: ['tests/security/**/*.test.ts'],
    priority: 'high',
    timeout: 30000
  },
  network: {
    name: 'Network Tests',
    patterns: ['tests/network/**/*.test.ts'],
    priority: 'medium',
    timeout: 20000
  }
};

/**
 * Test Runner Class
 */
class TestRunner {
  private config: TestRunnerConfig;

  constructor(config: Partial<TestRunnerConfig> = {}) {
    this.config = {
      groups: ['unit'],
      patterns: [],
      timeout: 10000,
      parallel: true,
      verbose: false,
      coverage: false,
      ...config
    };
  }

  /**
   * Run tests based on configuration
   */
  async run(): Promise<void> {
    console.log('🚀 Starting Bun Test Runner');
    console.log(`📊 Configuration: ${JSON.stringify(this.config, null, 2)}`);

    try {
      // Validate configuration
      this.validateConfig();

      // Run tests by groups or patterns
      if (this.config.groups.length > 0) {
        await this.runByGroups();
      } else if (this.config.patterns.length > 0) {
        await this.runByPatterns();
      } else {
        await this.runAll();
      }

      console.log('✅ All tests completed successfully');
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    }
  }

  /**
   * Validate test runner configuration
   */
  private validateConfig(): void {
    // Validate groups
    for (const group of this.config.groups) {
      if (!TEST_GROUPS[group]) {
        throw new Error(`Unknown test group: ${group}`);
      }
    }

    // Validate timeout
    if (this.config.timeout <= 0) {
      throw new Error('Timeout must be greater than 0');
    }
  }

  /**
   * Run tests by predefined groups
   */
  private async runByGroups(): Promise<void> {
    console.log(`🎯 Running test groups: ${this.config.groups.join(', ')}`);

    // Sort groups by priority
    const sortedGroups = this.config.groups.sort((a, b) => {
      const priorityA = TEST_GROUPS[a].priority;
      const priorityB = TEST_GROUPS[b].priority;
      const priorityOrder = ['high', 'medium', 'low'];
      return priorityOrder.indexOf(priorityA) - priorityOrder.indexOf(priorityB);
    });

    for (const group of sortedGroups) {
      await this.runGroup(group);
    }
  }

  /**
   * Run tests for a specific group
   */
  private async runGroup(groupName: string): Promise<void> {
    const group = TEST_GROUPS[groupName];
    console.log(`\n📋 Running ${group.name} (${groupName})`);

    const patterns = this.config.patterns.length > 0
      ? this.config.patterns
      : group.patterns;

    const timeout = this.config.timeout || group.timeout;

    try {
      // Use Bun's test runner directly
      const testFiles = await this.findTestFiles(patterns);

      if (testFiles.length === 0) {
        console.log(`⚠️  No test files found for group: ${groupName}`);
        return;
      }

      console.log(`📁 Found ${testFiles.length} test files`);

      // Run tests using Bun's test runner
      const testCommand = this.buildTestCommand(testFiles);
      const result = await TestHelpers.runCommand(testCommand, {
        timeout: timeout + 5000 // Add buffer
      });

      if (result.exitCode !== 0) {
        throw new Error(`Test group ${groupName} failed: ${result.stderr}`);
      }

      console.log(`✅ ${group.name} completed successfully`);

    } catch (error) {
      console.error(`❌ ${group.name} failed:`, error);
      throw error;
    }
  }

  /**
   * Run tests by custom patterns
   */
  private async runByPatterns(): Promise<void> {
    console.log(`🔍 Running tests with patterns: ${this.config.patterns.join(', ')}`);
    await this.runGroup('custom');
  }

  /**
   * Run all tests
   */
  private async runAll(): Promise<void> {
    console.log('🏃 Running all tests');

    // Run all predefined groups
    const allGroups = Object.keys(TEST_GROUPS);
    this.config.groups = allGroups;
    await this.runByGroups();
  }

  /**
   * Find test files matching patterns
   */
  private async findTestFiles(patterns: string[]): Promise<string[]> {
    const testFiles: string[] = [];

    for (const pattern of patterns) {
      try {
        // Use glob pattern matching
        const files = await TestHelpers.findFiles(pattern);
        testFiles.push(...files);
      } catch (error) {
        console.warn(`⚠️  Failed to find files for pattern ${pattern}:`, error);
      }
    }

    // Remove duplicates
    return [...new Set(testFiles)];
  }

  /**
   * Build test command for Bun
   */
  private buildTestCommand(testFiles: string[]): string {
    let command = 'bun test';

    if (this.config.coverage) {
      command += ' --coverage';
    }

    if (this.config.verbose) {
      command += ' --verbose';
    }

    if (testFiles.length > 0) {
      command += ` ${testFiles.join(' ')}`;
    }

    return command;
  }
}

/**
 * CLI Interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config: Partial<TestRunnerConfig> = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--group':
      case '-g':
        if (i + 1 < args.length) {
          config.groups = args[++i].split(',');
        }
        break;

      case '--pattern':
      case '-p':
        if (i + 1 < args.length) {
          config.patterns = args[++i].split(',');
        }
        break;

      case '--timeout':
      case '-t':
        if (i + 1 < args.length) {
          config.timeout = parseInt(args[++i], 10);
        }
        break;

      case '--serial':
        config.parallel = false;
        break;

      case '--verbose':
      case '-v':
        config.verbose = true;
        break;

      case '--coverage':
        config.coverage = true;
        break;

      case '--help':
      case '-h':
        printHelp();
        return;
    }
  }

  // Create and run test runner
  const runner = new TestRunner(config);
  await runner.run();
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
Bun Test Runner

Usage: bun run scripts/test-runner.ts [options]

Options:
  -g, --group <groups>     Test groups to run (comma-separated)
  -p, --pattern <patterns> Custom test patterns (comma-separated)
  -t, --timeout <ms>       Test timeout in milliseconds
  --serial                 Run tests serially instead of in parallel
  -v, --verbose            Enable verbose output
  --coverage               Enable coverage reporting
  -h, --help               Show this help message

Test Groups:
  smoke     - Critical path tests that must always pass
  unit      - Fast, isolated unit tests
  integration - Tests that integrate multiple components
  e2e       - Full application flow tests
  performance - Performance and benchmark tests
  security  - Security and vulnerability tests
  network   - Tests that require network access

Examples:
  bun run scripts/test-runner.ts --group=unit,smoke
  bun run scripts/test-runner.ts --pattern="tests/**/*.test.ts"
  bun run scripts/test-runner.ts --group=performance --timeout=60000
  bun run scripts/test-runner.ts --coverage --verbose
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { TestRunner, TEST_GROUPS };
