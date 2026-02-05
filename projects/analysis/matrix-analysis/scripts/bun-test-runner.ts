#!/usr/bin/env bun
/**
 * Simple Bun Test Runner
 *
 * A straightforward test runner that works with the organized test structure
 * using Bun's built-in test runner capabilities.
 */

import { Glob } from 'bun';

// Test group configurations
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

interface TestRunnerConfig {
  groups: string[];
  patterns: string[];
  timeout: number;
  parallel: boolean;
  verbose: boolean;
  coverage: boolean;
}

/**
 * Simple Test Runner
 */
class SimpleTestRunner {
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
   * Run tests
   */
  async run(): Promise<void> {
    console.log('🚀 Starting Simple Bun Test Runner');
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
   * Validate configuration
   */
  private validateConfig(): void {
    // Validate groups
    for (const group of this.config.groups) {
      if (!TEST_GROUPS[group as keyof typeof TEST_GROUPS]) {
        throw new Error(`Unknown test group: ${group}`);
      }
    }

    // Validate timeout
    if (this.config.timeout <= 0) {
      throw new Error('Timeout must be greater than 0');
    }
  }

  /**
   * Run tests by groups
   */
  private async runByGroups(): Promise<void> {
    console.log(`🎯 Running test groups: ${this.config.groups.join(', ')}`);

    // Sort groups by priority
    const sortedGroups = this.config.groups.sort((a, b) => {
      const priorityA = TEST_GROUPS[a as keyof typeof TEST_GROUPS].priority;
      const priorityB = TEST_GROUPS[b as keyof typeof TEST_GROUPS].priority;
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
    const group = TEST_GROUPS[groupName as keyof typeof TEST_GROUPS];
    console.log(`\n📋 Running ${group.name} (${groupName})`);

    const patterns = this.config.patterns.length > 0
      ? this.config.patterns
      : group.patterns;

    const timeout = this.config.timeout || group.timeout;

    try {
      // Find test files
      const testFiles = await this.findTestFiles(patterns);

      if (testFiles.length === 0) {
        console.log(`⚠️  No test files found for group: ${groupName}`);
        return;
      }

      console.log(`📁 Found ${testFiles.length} test files`);

      // Build and run test command
      const testCommand = this.buildTestCommand(testFiles);
      console.log(`🔧 Running command: ${testCommand}`);

      const { stdout, stderr, exitCode } = await this.runCommand(testCommand, timeout + 5000);

      if (exitCode !== 0) {
        throw new Error(`Test group ${groupName} failed: ${stderr}`);
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
    const allGroups = Object.keys(TEST_GROUPS) as Array<keyof typeof TEST_GROUPS>;
    this.config.groups = allGroups as string[];
    await this.runByGroups();
  }

  /**
   * Find test files matching patterns
   */
  private async findTestFiles(patterns: string[]): Promise<string[]> {
    const testFiles: string[] = [];

    for (const pattern of patterns) {
      try {
        const globPattern = new Glob(pattern);
        const files = Array.from(globPattern.scanSync());
        testFiles.push(...files);
      } catch (error) {
        console.warn(`⚠️  Failed to find files for pattern ${pattern}:`, error);
      }
    }

    // Remove duplicates
    return [...new Set(testFiles)];
  }

  /**
   * Build test command
   */
  private buildTestCommand(testFiles: string[]): string {
    let command = 'bun test';

    if (this.config.coverage) {
      command += ' --coverage';
    }

    if (this.config.verbose) {
      command += ' --verbose';
    }

    // For Bun test runner, we don't specify file patterns in the command
    // Bun automatically discovers test files based on naming conventions
    // Just run bun test and let it find the appropriate files

    return command;
  }

  /**
   * Run command and capture output
   */
  private async runCommand(command: string, timeout: number): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    const proc = Bun.spawn({
      cmd: command.split(' '),
      stdout: 'pipe',
      stderr: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    // Read stdout
    if (proc.stdout) {
      const reader = proc.stdout.getReader();
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          stdout += new TextDecoder().decode(result.value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    // Read stderr
    if (proc.stderr) {
      const reader = proc.stderr.getReader();
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          stderr += new TextDecoder().decode(result.value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    const exitCode = await proc.exited;

    return {
      stdout,
      stderr,
      exitCode
    };
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
  const runner = new SimpleTestRunner(config);
  await runner.run();
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
Simple Bun Test Runner

Usage: bun run scripts/bun-test-runner.ts [options]

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
  bun run scripts/bun-test-runner.ts --group=unit,smoke
  bun run scripts/bun-test-runner.ts --pattern="tests/**/*.test.ts"
  bun run scripts/bun-test-runner.ts --group=performance --timeout=60000
  bun run scripts/bun-test-runner.ts --coverage --verbose
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { SimpleTestRunner, TEST_GROUPS };
