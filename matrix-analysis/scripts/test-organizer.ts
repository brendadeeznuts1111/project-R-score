#!/usr/bin/env bun
/**
 * Test Organizer with Variables and Groups
 *
 * Organizes tests using environment variables and grouping strategies.
 *
 * Usage:
 *   bun run scripts/test-organizer.ts --group=<group>
 *   bun run scripts/test-organizer.ts --tag=<tag>
 *   bun run scripts/test-organizer.ts --priority=<priority>
 *   bun run scripts/test-organizer.ts --config=<config>
 */

import { spawn } from 'bun';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, resolve, normalize } from 'path';
import { execSync } from 'child_process';

interface TestOptions {
  coverage?: boolean;
  watch?: boolean;
  verbose?: boolean;
  bail?: number;
}

interface TestGroup {
  name: string;
  description: string;
  patterns: string[];
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  timeout?: number;
  parallel?: boolean;
  dependencies?: string[];
  environment?: Record<string, string>;
}

interface TestConfig {
  groups: Record<string, TestGroup>;
  globalEnvironment: Record<string, string>;
  defaultTimeout: number;
  maxConcurrency: number;
  retryCount: number;
}

class TestOrganizer {
  private config: TestConfig;
  private configPath: string;
  private runningDependencies: Set<string> = new Set();
  private executedGroups: Set<string> = new Set();
  private dependencyLocks: Map<string, Promise<boolean>> = new Map();

  constructor(configPath: string = 'test-organizer.config.json') {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): TestConfig {
    const defaultConfig: TestConfig = {
      groups: {
        unit: {
          name: 'Unit Tests',
          description: 'Fast, isolated unit tests',
          patterns: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
          priority: 'high',
          tags: ['unit', 'fast'],
          timeout: 5000,
          parallel: true
        },
        integration: {
          name: 'Integration Tests',
          description: 'Tests that integrate multiple components',
          patterns: ['tests/integration/**/*.test.ts'],
          priority: 'medium',
          tags: ['integration'],
          timeout: 15000,
          parallel: false,
          dependencies: ['unit']
        },
        e2e: {
          name: 'End-to-End Tests',
          description: 'Full application flow tests',
          patterns: ['tests/e2e/**/*.test.ts'],
          priority: 'low',
          tags: ['e2e', 'slow'],
          timeout: 60000,
          parallel: false,
          dependencies: ['unit', 'integration']
        },
        performance: {
          name: 'Performance Tests',
          description: 'Performance and benchmark tests',
          patterns: ['tests/performance/**/*.test.ts'],
          priority: 'low',
          tags: ['performance', 'benchmark'],
          timeout: 120000,
          parallel: false
        },
        security: {
          name: 'Security Tests',
          description: 'Security and vulnerability tests',
          patterns: ['tests/security/**/*.test.ts'],
          priority: 'high',
          tags: ['security'],
          timeout: 30000,
          parallel: true
        },
        api: {
          name: 'API Tests',
          description: 'API endpoint tests',
          patterns: ['tests/api/**/*.test.ts'],
          priority: 'high',
          tags: ['api'],
          timeout: 10000,
          parallel: true
        },
        ui: {
          name: 'UI Tests',
          description: 'User interface tests',
          patterns: ['tests/ui/**/*.test.ts'],
          priority: 'medium',
          tags: ['ui', 'frontend'],
          timeout: 20000,
          parallel: false
        },
        database: {
          name: 'Database Tests',
          description: 'Database operation tests',
          patterns: ['tests/database/**/*.test.ts'],
          priority: 'medium',
          tags: ['database'],
          timeout: 15000,
          parallel: false,
          environment: {
            DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db'
          }
        }
      },
      globalEnvironment: {
        NODE_ENV: 'test',
        BUN_TEST_ANNOTATIONS: '1'
      },
      defaultTimeout: 10000,
      maxConcurrency: 4,
      retryCount: 2
    };

    if (existsSync(this.configPath)) {
      try {
        const fileContent = readFileSync(this.configPath, 'utf-8');
        const userConfig = JSON.parse(fileContent);
        return { ...defaultConfig, ...userConfig };
      } catch (error: any) {
        if (error instanceof SyntaxError) {
          console.error(`⚠️  JSON syntax error in ${this.configPath}:`);
          // Note: line property is not standard across all JavaScript engines
          // We'll show the position if available
          if ('message' in error) {
            console.error(`   ${error.message}`);
          }
        } else {
          console.error(`⚠️  Failed to load config from ${this.configPath}: ${error.message}`);
        }
        console.log('   Using default configuration');
      }
    }

    return defaultConfig;
  }

  /**
   * Set custom config path and reload
   */
  setConfigPath(path: string): void {
    this.configPath = path;
    this.config = this.loadConfig();
  }

  /**
   * Save current configuration
   */
  saveConfig(): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log(`✅ Configuration saved to ${this.configPath}`);
    } catch (error: any) {
      console.error(`❌ Failed to save config: ${error.message}`);
    }
  }

  /**
   * List all available test groups
   */
  listGroups(): void {
    console.log('📋 Available Test Groups:');
    console.log();

    const sortedGroups = Object.entries(this.config.groups).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
    });

    for (const [key, group] of sortedGroups) {
      const priorityIcon = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
      }[group.priority];

      console.log(`${priorityIcon} ${key.padEnd(12)} - ${group.name}`);
      console.log(`   ${group.description}`);
      console.log(`   Tags: ${group.tags.join(', ')}`);
      console.log(`   Patterns: ${group.patterns.join(', ')}`);

      if (group.dependencies) {
        console.log(`   Dependencies: ${group.dependencies.join(', ')}`);
      }

      console.log();
    }
  }

  /**
   * Check if an environment variable key is sensitive
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /auth/i,
      /credential/i,
      /private/i,
      /api[_-]?key/i,
      /access[_-]?token/i,
      /refresh[_-]?token/i,
      /session[_-]?secret/i,
      /client[_-]?secret/i,
      /signing[_-]?key/i,
      /encryption[_-]?key/i,
    ];

    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  /**
   * Execute a dependency with proper locking
   */
  private async executeDependency(dep: string, options: TestOptions): Promise<boolean> {
    // Add to running dependencies for circular dependency detection
    this.runningDependencies.add(dep);

    try {
      console.log(`   Running dependency: ${dep}`);
      const result = await this.runGroup(dep, options);
      return result;
    } finally {
      // Always remove from running dependencies, even if failed
      this.runningDependencies.delete(dep);
    }
  }

  /**
   * Run tests for a specific group
   */
  async runGroup(groupName: string, options: TestOptions = {}): Promise<boolean> {
    // Validate input
    if (!groupName || typeof groupName !== 'string') {
      console.error('❌ Invalid group name');
      return false;
    }

    const group = this.config.groups[groupName];

    if (!group) {
      console.error(`❌ Test group '${groupName}' not found`);
      console.log('   Available groups:', Object.keys(this.config.groups).join(', '));
      return false;
    }

    // Check if already executed
    if (this.executedGroups.has(groupName)) {
      console.log(`⏭️  Group '${groupName}' already executed, skipping`);
      return true;
    }

    // Check dependencies with mutex locks
    if (group.dependencies) {
      console.log(`🔍 Checking dependencies for ${group.name}...`);

      for (const dep of group.dependencies) {
        if (!this.config.groups[dep]) {
          console.error(`❌ Dependency '${dep}' not found`);
          return false;
        }

        // Check if dependency is already being executed
        if (this.dependencyLocks.has(dep)) {
          console.log(`⏳ Waiting for dependency '${dep}' to complete...`);
          const depResult = await this.dependencyLocks.get(dep)!;
          if (!depResult) {
            console.error(`❌ Dependency '${dep}' failed`);
            return false;
          }
          continue;
        }

        // Check for circular dependencies
        if (this.runningDependencies.has(dep)) {
          console.error(`❌ Circular dependency detected: ${groupName} → ${dep}`);
          console.error(`   Current path: ${Array.from(this.runningDependencies).join(' → ')} → ${dep}`);
          return false;
        }

        // Create and store the dependency execution promise
        const depPromise = this.executeDependency(dep, options);
        this.dependencyLocks.set(dep, depPromise);

        // Wait for dependency to complete
        const depSuccess = await depPromise;

        // Clean up the lock
        this.dependencyLocks.delete(dep);

        if (!depSuccess) {
          console.error(`❌ Dependency '${dep}' failed`);
          return false;
        }
      }
    }

    // Mark as executed before running
    this.executedGroups.add(groupName);

    console.log(`🧪 Running ${group.name}...`);
    console.log(`   Priority: ${group.priority}`);
    console.log(`   Patterns: ${group.patterns.join(', ')}`);

    // Build test command
    const args = ['test'];

    // Add timeout
    args.push(`--timeout=${group.timeout || this.config.defaultTimeout}`);

    // Add concurrency
    if (group.parallel !== false) {
      args.push(`--max-concurrency=${this.config.maxConcurrency}`);
    } else {
      args.push('--max-concurrency=1');
    }

    // Add retry with validation
    if (this.config.retryCount > 0) {
      // Ensure retry count is reasonable
      const validRetryCount = Math.min(Math.max(this.config.retryCount, 0), 10);
      if (validRetryCount !== this.config.retryCount) {
        console.warn(`⚠️  Invalid retry count ${this.config.retryCount}, using ${validRetryCount}`);
      }
      args.push(`--rerun-each=${validRetryCount + 1}`);
    }

    // Add coverage
    if (options.coverage) {
      args.push('--coverage');
    }

    // Add watch mode
    if (options.watch) {
      args.push('--watch');
    }

    // Add verbose output
    if (options.verbose) {
      args.push('--verbose');
    }

    // Add bail
    if (options.bail) {
      args.push(`--bail=${options.bail}`);
    }

    // Sanitize test patterns to prevent command injection
    const sanitizedPatterns = group.patterns.map(pattern => {
      if (!pattern || typeof pattern !== 'string') {
        console.warn(`⚠️  Invalid pattern: ${pattern}`);
        return null;
      }

      // Remove dangerous characters and patterns
      let sanitized = pattern.trim();

      // Prevent path traversal
      if (sanitized.includes('..')) {
        console.warn(`⚠️  Path traversal detected in pattern: ${pattern}`);
        return null;
      }

      // Prevent command injection
      const dangerousChars = /[;&|`$(){}[\]<>"'\\]/;
      if (dangerousChars.test(sanitized)) {
        console.warn(`⚠️  Dangerous characters detected in pattern: ${pattern}`);
        return null;
      }

      // Prevent shell command patterns
      const dangerousPatterns = [
        /\$\{[^}]*\}/,    // Variable expansion
        /`[^`]*`/,        // Backtick execution
        /\$\(.*?\)/,      // Command substitution
        /<<\s*\w+/,       // Here documents
        />>?\s*\/dev\//,   // Device redirects
        /\s*\|\s*/,       // Pipes
        /\s*&&\s*/,       // Command chaining
        /\s*\|\|\s*/,     // OR commands
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
          console.warn(`⚠️  Dangerous pattern detected: ${pattern}`);
          return null;
        }
      }

      // Validate file extension
      if (!sanitized.endsWith('.test.ts') && !sanitized.endsWith('.spec.ts') && !sanitized.includes('**')) {
        console.warn(`⚠️  Invalid test file pattern: ${pattern}`);
        return null;
      }

      return sanitized;
    }).filter(Boolean) as string[];

    // Add test patterns with proper path format
    // Bun test needs explicit paths for globs
    const expandedPatterns: string[] = [];
    for (const pattern of sanitizedPatterns) {
      if (pattern.includes('**')) {
        // Expand globs manually for bun test
        try {
          const globPattern = pattern.startsWith('./') ? pattern.slice(2) : pattern;
          const glob = new Bun.Glob(globPattern);

          // Use for await...of with proper error handling
          for await (const file of glob.scan('.')) {
            // Validate the file path to prevent injection
            if (file && typeof file === 'string' && !file.includes('\0')) {
              expandedPatterns.push(`./${file}`);
            }
          }
        } catch (error: any) {
          console.error(`⚠️  Failed to expand pattern '${pattern}': ${error.message}`);
          // Continue with other patterns instead of failing completely
        }
      } else {
        expandedPatterns.push(pattern.startsWith('./') ? pattern : `./${pattern}`);
      }
    }

    if (expandedPatterns.length === 0) {
      console.log(`⚠️  No test files found for group '${groupName}'`);
      return true;
    }

    args.push(...expandedPatterns);

    // Prepare environment with validation
    const env: Record<string, string> = {
      ...process.env,
      ...this.config.globalEnvironment,
      ...group.environment,
      TEST_GROUP: groupName,
      TEST_PRIORITY: group.priority,
      TEST_TAGS: group.tags.join(',')
    };

    // Sanitize environment variables
    for (const [key, value] of Object.entries(env)) {
      if (typeof value !== 'string') {
        delete env[key];
        continue;
      }

      // Remove potentially dangerous characters and patterns
      let sanitized = value;

      // Remove control characters (except tab which we'll handle separately)
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

      // Remove line breaks and excessive whitespace
      sanitized = sanitized.replace(/[\r\n]/g, ' ').replace(/\t+/g, ' ').trim();

      // Prevent command injection patterns
      const dangerousPatterns = [
        /[;&|`$(){}[\]]/,  // Shell metacharacters
        /\$\{[^}]*\}/,    // Variable expansion
        /`[^`]*`/,        // Backtick execution
        /\$\(.*?\)/,      // Command substitution
        /<<\s*\w+/,       // Here documents
        />>?\s*\/dev\//,   // Redirects to devices
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
          console.warn(`⚠️  Detected potentially dangerous pattern in ${key}, removing it`);
          sanitized = '';
          break;
        }
      }

      // Length validation to prevent buffer overflow
      if (sanitized.length > 32768) {
        console.warn(`⚠️  Environment variable ${key} too long, truncating`);
        sanitized = sanitized.substring(0, 32768);
      }

      // Validate specific sensitive variables
      if (this.isSensitiveKey(key)) {
        // For sensitive keys, ensure they don't contain suspicious patterns
        if (sanitized.includes('${') || sanitized.includes('`') || sanitized.includes('$(')) {
          console.warn(`⚠️  Detected suspicious pattern in sensitive variable ${key}, clearing it`);
          sanitized = '';
        }
      }

      env[key] = sanitized;
    }

    console.log(`   Command: bun ${args.join(' ')}`);
    console.log();

    // Run tests
    const proc = spawn({
      cmd: ['bun', ...args],
      stdout: 'inherit',
      stderr: 'inherit',
      env
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      console.log(`✅ ${group.name} passed`);
      return true;
    } else {
      console.log(`❌ ${group.name} failed`);
      return false;
    }
  }

  /**
   * Run tests by tag
   */
  async runByTag(tag: string, options: TestOptions = {}): Promise<boolean> {
    // Validate input
    if (!tag || typeof tag !== 'string') {
      console.error('❌ Invalid tag');
      return false;
    }

    console.log(`🏷️  Running tests with tag: ${tag}`);

    const matchingGroups = Object.entries(this.config.groups)
      .filter(([_, group]) => group.tags.includes(tag));

    if (matchingGroups.length === 0) {
      console.error(`❌ No test groups found with tag '${tag}'`);
      console.log('   Available tags:', [...new Set(
        Object.values(this.config.groups).flatMap(g => g.tags)
      )].join(', '));
      return false;
    }

    let allPassed = true;

    for (const [groupName, _] of matchingGroups) {
      const passed = await this.runGroup(groupName, options);
      if (!passed) {
        allPassed = false;

        // Stop on failure if not in watch mode
        if (!options.watch) {
          break;
        }
      }
    }

    return allPassed;
  }

  /**
   * Run tests by priority
   */
  async runByPriority(priority: 'high' | 'medium' | 'low', options: TestOptions = {}): Promise<boolean> {
    // Validate input
    if (!priority || !['high', 'medium', 'low'].includes(priority)) {
      console.error('❌ Invalid priority. Must be: high, medium, or low');
      return false;
    }

    console.log(`🎯 Running tests with priority: ${priority}`);

    const matchingGroups = Object.entries(this.config.groups)
      .filter(([_, group]) => group.priority === priority);

    if (matchingGroups.length === 0) {
      console.error(`❌ No test groups found with priority '${priority}'`);
      return false;
    }

    let allPassed = true;

    for (const [groupName, _] of matchingGroups) {
      const passed = await this.runGroup(groupName, options);
      if (!passed) {
        allPassed = false;

        // Stop on failure if not in watch mode
        if (!options.watch) {
          break;
        }
      }
    }

    return allPassed;
  }

  /**
   * Run all tests in dependency order
   */
  async runAll(options: TestOptions = {}): Promise<boolean> {
    console.log('🚀 Running all test groups in dependency order...');

    // Reset execution tracking
    this.executedGroups.clear();
    this.runningDependencies.clear();

    // Build dependency graph with full cycle detection
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (groupName: string, path: string[] = []): void => {
      // Check for circular dependencies
      if (path.includes(groupName)) {
        const cycle = [...path.slice(path.indexOf(groupName)), groupName].join(' → ');
        throw new Error(`Circular dependency detected: ${cycle}`);
      }

      if (visiting.has(groupName)) {
        throw new Error(`Circular dependency detected: ${groupName}`);
      }

      if (visited.has(groupName)) {
        return;
      }

      visiting.add(groupName);

      const group = this.config.groups[groupName];
      if (group?.dependencies) {
        for (const dep of group.dependencies) {
          visit(dep, [...path, groupName]);
        }
      }

      visiting.delete(groupName);
      visited.add(groupName);
      order.push(groupName);
    };

    // Visit all groups
    for (const groupName of Object.keys(this.config.groups)) {
      try {
        visit(groupName);
      } catch (error: any) {
        console.error(`❌ ${error.message}`);
        return false;
      }
    }

    // Run in order
    let allPassed = true;

    for (const groupName of order) {
      const passed = await this.runGroup(groupName, options);
      if (!passed) {
        allPassed = false;

        // Stop on failure if not in watch mode
        if (!options.watch) {
          break;
        }
      }
    }

    return allPassed;
  }

  /**
   * Generate test matrix for CI
   */
  generateMatrix(): void {
    console.log('📊 Test Matrix for CI:');
    console.log();

    const matrix = {
      include: Object.entries(this.config.groups).map(([key, group]) => ({
        group: key,
        priority: group.priority,
        tags: group.tags.join(','),
        parallel: group.parallel !== false,
        timeout: group.timeout || this.config.defaultTimeout
      }))
    };

    console.log(JSON.stringify(matrix, null, 2));
    console.log();

    // Generate GitHub Actions workflow
    console.log('📝 GitHub Actions Workflow:');
    console.log();
    console.log('```yaml');
    console.log('name: Tests');
    console.log('on: [push, pull_request]');
    console.log();
    console.log('jobs:');
    console.log('  test:');
    console.log('    runs-on: ubuntu-latest');
    console.log('    strategy:');
    console.log('      matrix:');
    console.log('        ${{ steps.matrix.outputs.matrix }}');
    console.log('    steps:');
    console.log('      - uses: actions/checkout@v4');
    console.log('      - name: Setup Bun');
    console.log('        uses: oven-sh/setup-bun@v1');
    console.log('      - name: Install dependencies');
    console.log('        run: bun install --frozen-lockfile');
    console.log('      - name: Run tests');
    console.log('        run: bun run scripts/test-organizer.ts --group=${{ matrix.group }}');
    console.log('```');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const organizer = new TestOrganizer();

  const options: TestOptions = {
    coverage: false,
    watch: false,
    verbose: false,
    bail: undefined
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--group':
      case '-g':
        i++;
        if (i < args.length && args[i]) {
          const success = await organizer.runGroup(args[i], options);
          process.exit(success ? 0 : 1);
        } else {
          console.error('❌ --group requires a group name');
          process.exit(1);
        }
        break;

      case '--tag':
      case '-t':
        i++;
        if (i < args.length && args[i]) {
          const success = await organizer.runByTag(args[i], options);
          process.exit(success ? 0 : 1);
        } else {
          console.error('❌ --tag requires a tag name');
          process.exit(1);
        }
        break;

      case '--priority':
      case '-p':
        i++;
        if (i < args.length && args[i]) {
          const success = await organizer.runByPriority(args[i] as 'high' | 'medium' | 'low', options);
          process.exit(success ? 0 : 1);
        } else {
          console.error('❌ --priority requires a level (high|medium|low)');
          process.exit(1);
        }
        break;

      case '--all':
      case '-a':
        const success = await organizer.runAll(options);
        process.exit(success ? 0 : 1);
        break;

      case '--list':
      case '-l':
        organizer.listGroups();
        process.exit(0);
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
        i++;
        if (i < args.length && args[i]) {
          const bailCount = parseInt(args[i]);
          if (isNaN(bailCount) || bailCount < 1) {
            console.error('❌ --bail requires a positive number');
            process.exit(1);
          }
          options.bail = bailCount;
        } else {
          console.error('❌ --bail requires a number');
          process.exit(1);
        }
        break;

      case '--matrix':
      case '-m':
        organizer.generateMatrix();
        process.exit(0);
        break;

      case '--config':
        i++;
        if (i < args.length && args[i]) {
          try {
            // Validate and canonicalize path
            const configPath = resolve(normalize(args[i]));
            if (!existsSync(configPath)) {
              console.warn(`⚠️  Config file does not exist: ${configPath}`);
            }
            organizer.setConfigPath(configPath);
          } catch (error: any) {
            console.error(`❌ Invalid config path: ${error.message}`);
            process.exit(1);
          }
        } else {
          console.error('❌ --config requires a path');
          process.exit(1);
        }
        break;

      case '--save-config':
        organizer.saveConfig();
        process.exit(0);
        break;

      case '--help':
      case '-h':
        console.log('Test Organizer - Organize tests with variables and groups');
        console.log();
        console.log('Usage: bun run scripts/test-organizer.ts [options]');
        console.log();
        console.log('Options:');
        console.log('  -g, --group <name>     Run specific test group');
        console.log('  -t, --tag <tag>        Run tests with specific tag');
        console.log('  -p, --priority <level> Run tests by priority (high|medium|low)');
        console.log('  -a, --all              Run all tests in dependency order');
        console.log('  -l, --list             List all test groups');
        console.log('  -m, --matrix           Generate CI matrix');
        console.log('  -c, --coverage         Enable coverage reporting');
        console.log('  -w, --watch            Enable watch mode');
        console.log('  -v, --verbose          Enable verbose output');
        console.log('  -b, --bail <num>       Stop after N failures');
        console.log('  --config <path>        Use custom config file');
        console.log('  --save-config          Save current configuration');
        console.log('  -h, --help             Show this help');
        console.log();
        console.log('Examples:');
        console.log('  bun run scripts/test-organizer.ts --list');
        console.log('  bun run scripts/test-organizer.ts --group unit');
        console.log('  bun run scripts/test-organizer.ts --tag fast');
        console.log('  bun run scripts/test-organizer.ts --priority high');
        console.log('  bun run scripts/test-organizer.ts --all --coverage');
        process.exit(0);

      default:
        if (arg.startsWith('-')) {
          console.error(`❌ Unknown option: ${arg}`);
          console.log('   Use --help for available options');
          process.exit(1);
        }
    }
  }

  // Default action: list groups
  organizer.listGroups();
}

// Run if called directly
if (import.meta.main) {
  main().catch((err) => {
    console.error('❌ Test organizer failed:', err);
    process.exit(1);
  });
}

// Export for testing
export { TestOrganizer, type TestGroup, type TestConfig };
