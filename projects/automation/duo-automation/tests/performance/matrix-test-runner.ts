#!/usr/bin/env bun
// tests/matrix-test-runner.ts - Enhanced test runner with matrix table separation and execution control

import { TEST_MATRIX, ENV_CONTROLS, getExecutionOrder, isTestEnabled, getTestEnvironment, getTestCategory, getTestPriority, getMatrixSummary, buildBunTestArgs, getExecutionControlSummary } from './test-matrix.config';
import { spawn } from 'bun';
import { writeFile, readFile } from 'fs/promises';

interface TestResult {
  testKey: string;
  category: string;
  priority: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  output?: string;
  error?: string;
  progress?: number; // 0-100 percentage
  startTime?: number;
  endTime?: number;
}

class MatrixTestRunner {
  private results: Map<string, TestResult> = new Map();
  private startTime: number = Date.now();
  private totalTests: number = 0;
  private completedTests: number = 0;

  constructor() {
    this.setupEnvironment();
  }

  private updateStatusDisplay(): void {
    // Clear current line and show progress
    const progress = this.totalTests > 0 ? Math.round((this.completedTests / this.totalTests) * 100) : 0;
    const running = Array.from(this.results.values()).filter(r => r.status === 'running').length;
    const passed = Array.from(this.results.values()).filter(r => r.status === 'passed').length;
    const failed = Array.from(this.results.values()).filter(r => r.status === 'failed').length;
    
    process.stdout.write(`\r📊 Progress: ${progress}% (${this.completedTests}/${this.totalTests}) | Running: ${running} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  }

  private updateTestStatus(testKey: string, status: TestResult['status'], progress?: number): void {
    const result = this.results.get(testKey);
    if (result) {
      result.status = status;
      if (progress !== undefined) {
        result.progress = progress;
      }
      
      if (status === 'running') {
        result.startTime = Date.now();
      } else if (status === 'passed' || status === 'failed') {
        result.endTime = Date.now();
        this.completedTests++;
      }
      
      this.updateStatusDisplay();
    }
  }

  private setupEnvironment(): void {
    console.log('🔧 Setting up test matrix environment...');
    
    // Display current configuration
    console.log('\n📊 Test Matrix Configuration:');
    console.log(`   Total Tests: ${Object.keys(TEST_MATRIX).length}`);
    console.log(`   Enabled Tests: ${Object.keys(TEST_MATRIX).filter(key => isTestEnabled(key)).length}`);
    
    const summary = getMatrixSummary();
    console.log(`   Categories: ${summary.categories.join(', ')}`);
    console.log(`   Priorities: ${summary.priorities.join(', ')}`);
    
    console.log('\n🎛️ Environment Controls:');
    Object.entries(ENV_CONTROLS).forEach(([key, value]) => {
      if (key.startsWith('BUN_TEST_')) {
        console.log(`   ${key}: ${value}`);
      }
    });
    
    console.log('\n⚙️ Execution Controls:');
    const execControls = getExecutionControlSummary();
    console.log(`   Timeout: ${execControls.timeout}ms`);
    console.log(`   Rerun Each: ${execControls.rerunEach}x`);
    console.log(`   Concurrent: ${execControls.concurrent}`);
    console.log(`   Randomize: ${execControls.randomize}`);
    console.log(`   Seed: ${execControls.seed || 'auto'}`);
    console.log(`   Bail: ${execControls.bail}`);
    console.log(`   Max Concurrency: ${execControls.maxConcurrency}`);
    console.log(`   Command: bun ${execControls.commandArgs.join(' ')}`);
  }

  async runTests(options: {
    category?: string;
    priority?: string;
    parallel?: boolean;
    dryRun?: boolean;
  } = {}): Promise<void> {
    const { category, priority, parallel = false, dryRun = false } = options;
    
    console.log('\n🚀 Starting matrix test execution...');
    
    // Get tests to run based on filters
    let testsToRun = getExecutionOrder();
    
    if (category) {
      testsToRun = testsToRun.filter(key => getTestCategory(key) === category);
    }
    
    if (priority) {
      testsToRun = testsToRun.filter(key => getTestPriority(key) === priority);
    }
    
    console.log(`\n📋 Tests to execute: ${testsToRun.length}`);
    
    // Initialize total tests for progress tracking
    this.totalTests = testsToRun.length;
    this.completedTests = 0;
    
    if (dryRun) {
      this.printExecutionPlan(testsToRun);
      return;
    }
    
    // Initialize results
    for (const testKey of testsToRun) {
      this.results.set(testKey, {
        testKey,
        category: getTestCategory(testKey),
        priority: getTestPriority(testKey),
        status: 'pending',
        progress: 0
      });
    }
    
    console.log('\n🔄 Executing tests with real-time status updates...\n');
    
    // Execute tests
    if (parallel) {
      await this.runTestsParallel(testsToRun);
    } else {
      await this.runTestsSequential(testsToRun);
    }
    
    // Final status update
    console.log('\n');
    this.updateStatusDisplay();
    console.log('\n');
    
    // Generate report
    await this.generateReport();
  }

  private printExecutionPlan(tests: string[]): void {
    console.log('\n📋 Execution Plan:');
    console.table(tests.map(testKey => ({
      'Test Key': testKey,
      'Category': getTestCategory(testKey),
      'Priority': getTestPriority(testKey),
      'Environment': Object.keys(getTestEnvironment(testKey)).join(', ')
    })));
  }

  private async runTestsSequential(tests: string[]): Promise<void> {
    console.log('\n🔄 Running tests sequentially...');
    
    for (const testKey of tests) {
      await this.runSingleTest(testKey);
    }
  }

  private async runTestsParallel(tests: string[]): Promise<void> {
    console.log('\n⚡ Running tests in parallel...');
    
    const promises = tests.map(testKey => this.runSingleTest(testKey));
    await Promise.all(promises);
  }

  private async runSingleTest(testKey: string): Promise<void> {
    const result = this.results.get(testKey)!;
    
    // Update status to running
    this.updateTestStatus(testKey, 'running', 0);
    
    console.log(`\n🧪 Starting ${testKey} (${result.category} - ${result.priority})...`);
    
    const startTime = Date.now();
    
    try {
      // Simulate progress updates during test execution
      const progressInterval = setInterval(() => {
        const currentProgress = result.progress || 0;
        if (currentProgress < 90) {
          this.updateTestStatus(testKey, 'running', currentProgress + 10);
        }
      }, 100);
      
      // Set test-specific environment
      const testEnv = getTestEnvironment(testKey);
      
      // Create clean environment object with only string values
      const env: Record<string, string> = {};
      
      // Add process.env values (only defined strings)
      Object.entries(process.env).forEach(([key, value]) => {
        if (value !== undefined) {
          env[key] = value;
        }
      });
      
      // Add test environment values
      Object.entries(testEnv).forEach(([key, value]) => {
        if (value !== undefined) {
          env[key] = value;
        }
      });
      
      // Determine test file based on test key
      const testFile = this.getTestFile(testKey);
      
      // Update progress to 90% before running test
      this.updateTestStatus(testKey, 'running', 90);
      
      // Run the test
      const output = await this.executeTest(testFile, env);
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      // Update status to passed
      result.status = 'passed';
      result.output = output;
      result.duration = Date.now() - startTime;
      result.progress = 100;
      
      this.updateTestStatus(testKey, 'passed', 100);
      
      console.log(`✅ ${testKey} passed (${result.duration}ms)`);
      
    } catch (error) {
      // Clear progress interval if it exists
      const currentProgress = result.progress || 0;
      
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      result.duration = Date.now() - startTime;
      result.progress = currentProgress;
      
      this.updateTestStatus(testKey, 'failed', currentProgress);
      
      console.log(`❌ ${testKey} failed: ${result.error}`);
    }
  }

  private getTestFile(testKey: string): string {
    // Map test keys to actual test files
    const testFileMap: Record<string, string> = {
      'core-user-agent': 'tests/bun-anti-detection.test.ts',
      'core-proxy-management': 'tests/bun-anti-detection.test.ts',
      'core-rate-limiting': 'tests/bun-anti-detection.test.ts',
      'core-input-validation': 'tests/bun-anti-detection.test.ts',
      'core-integration': 'tests/bun-anti-detection.test.ts',
      'config-manager': 'tests/config-manager.test.ts',
      'config-environment': 'tests/environment.test.ts',
      'security-secrets': 'tests/secrets-health-export.test.ts',
      'performance-load': 'tests/performance/load-tests.test.ts',
      'performance-memory': 'tests/performance/memory-tests.test.ts',
      'integration-scoping': 'tests/scoping-integration.test.ts',
      'integration-platform': 'tests/platform-capabilities.test.ts',
      'e2e-workflows': 'tests/e2e/workflow-tests.test.ts'
    };
    
    return testFileMap[testKey] || `tests/${testKey}.test.ts`;
  }

  private async executeTest(testFile: string, env: Record<string, string>): Promise<string> {
    return new Promise((resolve, reject) => {
      // Build Bun Test command with execution controls
      const bunArgs = buildBunTestArgs();
      bunArgs.push(testFile, '--reporter=dots');
      
      const child = spawn('bun', bunArgs, {
        env,
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Test failed with code ${code}: ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 Generating test matrix report...');
    
    const totalDuration = Date.now() - this.startTime;
    const results = Array.from(this.results.values());
    
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      totalDuration,
      categoryBreakdown: this.getCategoryBreakdown(),
      priorityBreakdown: this.getPriorityBreakdown(),
      averageTestDuration: results.length > 0 
        ? Math.round(results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length)
        : 0
    };
    
    console.log('\n📈 Test Matrix Results:');
    console.table(summary);
    
    // Enhanced detailed results with status
    console.log('\n📋 Detailed Results with Status:');
    console.table(results.map(r => ({
      'Test': r.testKey,
      'Category': r.category,
      'Priority': r.priority,
      'Status': r.status,
      'Progress': `${r.progress || 0}%`,
      'Duration': r.duration ? `${r.duration}ms` : 'N/A',
      'Started': r.startTime ? new Date(r.startTime).toLocaleTimeString() : 'N/A',
      'Completed': r.endTime ? new Date(r.endTime).toLocaleTimeString() : 'N/A'
    })));
    
    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary,
      detailedResults: results,
      environmentControls: ENV_CONTROLS,
      matrixConfiguration: TEST_MATRIX,
      executionControl: getExecutionControlSummary()
    };
    
    await writeFile(
      'reports/test-matrix-report.json',
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n📄 Report saved to: reports/test-matrix-report.json');
  }

  private getCategoryBreakdown(): Record<string, any> {
    const results = Array.from(this.results.values());
    const breakdown: Record<string, any> = {};
    
    results.forEach(result => {
      if (!breakdown[result.category]) {
        breakdown[result.category] = { total: 0, passed: 0, failed: 0 };
      }
      breakdown[result.category].total++;
      if (result.status === 'passed') breakdown[result.category].passed++;
      if (result.status === 'failed') breakdown[result.category].failed++;
    });
    
    return breakdown;
  }

  private getPriorityBreakdown(): Record<string, any> {
    const results = Array.from(this.results.values());
    const breakdown: Record<string, any> = {};
    
    results.forEach(result => {
      if (!breakdown[result.priority]) {
        breakdown[result.priority] = { total: 0, passed: 0, failed: 0 };
      }
      breakdown[result.priority].total++;
      if (result.status === 'passed') breakdown[result.priority].passed++;
      if (result.status === 'failed') breakdown[result.priority].failed++;
    });
    
    return breakdown;
  }

  public showHelp(): void {
    console.log(`
🚀 Matrix Test Runner - Enhanced Test Execution with Matrix Control

📖 USAGE:
  bun run tests/matrix-test-runner.ts [options]

🎛️ BASIC OPTIONS:
  --category <name>       Run tests for specific category
                         Categories: Core Functionality, Configuration, Security, Performance, Integration, E2E
  --priority <level>      Run tests for specific priority
                         Levels: critical, high, medium, low
  --parallel              Run tests in parallel (faster execution)
  --dry-run              Show execution plan without running tests
  --help                 Show this detailed help message

⚡ EXECUTION EXAMPLES:
  # Run all critical tests
  bun run tests/matrix-test-runner.ts --priority critical
  
  # Run configuration tests in parallel
  bun run tests/matrix-test-runner.ts --category Configuration --parallel
  
  # Show execution plan
  bun run tests/matrix-test-runner.ts --dry-run

🔧 BUN TEST EXECUTION CONTROLS (Environment Variables):
  --timeout <ms>         Set per-test timeout (default: 5000)
  --rerun-each <n>       Re-run each test N times (default: 1)
  --concurrent           Treat all tests as concurrent
  --randomize            Run tests in random order
  --seed <number>        Set random seed for reproducibility
  --bail <n>             Exit after N failures (default: 1)
  --max-concurrency <n>  Max concurrent tests (default: 20)

📊 QUICK SCRIPTS:
  bun run matrix                    # Run all enabled tests
  bun run matrix:critical          # Critical tests only (fast feedback)
  bun run matrix:core              # Core functionality tests
  bun run matrix:config            # Configuration tests
  bun run matrix:security          # Security tests
  bun run matrix:performance       # Performance tests
  bun run matrix:integration       # Integration tests
  bun run matrix:e2e               # End-to-end tests
  bun run matrix:parallel          # All tests in parallel
  bun run matrix:timeout           # Extended timeout (10s)
  bun run matrix:rerun             # Rerun each test 3x
  bun run matrix:concurrent        # Force concurrent execution
  bun run matrix:random            # Randomize with seed 12345
  bun run matrix:bail              # Bail after 2 failures
  bun run matrix:max-concurrency   # Limit to 8 concurrent
  bun run matrix:stress            # Stress test with rerun
  bun run matrix:reliable          # Reliable testing mode
  bun run matrix:dry-run           # Show execution plan
  bun run matrix:help              # Show this help

📚 DOCUMENTATION:
  • tests/QUICK_REFERENCE.md    - Quick start guide
  • tests/CLI_FLAGS_GUIDE.md    - Detailed flags reference
  • tests/MATRIX_TESTING_GUIDE.md - Comprehensive guide

🎯 GETTING STARTED:
  1. Run: bun run matrix:help (this help)
  2. Try: bun run matrix:critical (fast feedback)
  3. Explore: bun run matrix:dry-run (see what runs)
  4. Read: tests/QUICK_REFERENCE.md (quick patterns)
  `);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    category: undefined as string | undefined,
    priority: undefined as string | undefined,
    parallel: false,
    dryRun: false
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--category':
        options.category = args[++i];
        break;
      case '--priority':
        options.priority = args[++i];
        break;
      case '--parallel':
        options.parallel = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        const runner = new MatrixTestRunner();
        runner.showHelp();
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        console.error('Use --help for available options');
        process.exit(1);
    }
  }
  
  const runner = new MatrixTestRunner();
  await runner.runTests(options);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { MatrixTestRunner };
