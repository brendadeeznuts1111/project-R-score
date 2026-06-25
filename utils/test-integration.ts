#!/usr/bin/env bun
// test-integration.ts - v2.8: Advanced Test Process Integration Framework

interface TestConfig {
  singleProcess?: boolean;
  memoryOptimized?: boolean;
  ciMode?: boolean;
  githubActions?: boolean;
  signalHandling?: boolean;
  environmentDetection?: boolean;
}

interface TestResult {
  file: string;
  passed: number;
  failed: number;
  errors: number;
  exitCode: number;
  duration: number;
  memoryUsage: number;
}

interface TestSuite {
  results: TestResult[];
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    totalErrors: number;
    totalDuration: number;
    peakMemory: number;
    successRate: number;
  };
  environment: {
    ci: boolean;
    githubActions: boolean;
    nodeEnv: string;
    bunVersion: string;
    platform: string;
  };
}

class TestProcessIntegration {
  private config: TestConfig;
  private signalHandlers: Map<string, () => void> = new Map();

  constructor(config: TestConfig = {}) {
    this.config = {
      singleProcess: true,
      memoryOptimized: false,
      ciMode: process.env.CI === 'true',
      githubActions: process.env.GITHUB_ACTIONS === 'true',
      signalHandling: true,
      environmentDetection: true,
      ...config
    };
  }

  // 🔍 Environment Detection
  detectEnvironment(): TestSuite['environment'] {
    const env = {
      ci: process.env.CI === 'true',
      githubActions: process.env.GITHUB_ACTIONS === 'true',
      nodeEnv: process.env.NODE_ENV || 'development',
      bunVersion: Bun.version,
      platform: process.platform
    };

    console.info('🔍 Environment Detection:');
    console.info(`  CI Environment: ${env.ci ? '✅' : '❌'}`);
    console.info(`  GitHub Actions: ${env.githubActions ? '✅' : '❌'}`);
    console.info(`  Node Environment: ${env.nodeEnv}`);
    console.info(`  Bun Version: ${env.bunVersion}`);
    console.info(`  Platform: ${env.platform}`);

    // GitHub Actions specific setup
    if (env.githubActions) {
      console.info('🎯 GitHub Actions detected - enabling annotations');
      this.setupGitHubActionsAnnotations();
    }

    // CI optimizations
    if (env.ci) {
      console.info('🏭 CI Environment detected - enabling optimizations');
      this.applyCIOptimizations();
    }

    return env;
  }

  // 🎯 GitHub Actions Integration
  private setupGitHubActionsAnnotations(): void {
    // Bun automatically emits GitHub Actions annotations
    // But we can add custom ones
    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);
      
      // Emit GitHub Actions annotations for test results
      if (args[0] && typeof args[0] === 'string' && args[0].includes('✅')) {
        process.stdout.write(`::notice::${args.join(' ')}\n`);
      } else if (args[0] && typeof args[0] === 'string' && args[0].includes('❌')) {
        process.stdout.write(`::error::${args.join(' ')}\n`);
      }
    };
  }

  // 🏭 CI Environment Optimizations
  private applyCIOptimizations(): void {
    // Enable memory optimizations in CI
    if (this.config.memoryOptimized) {
      process.env.BUN_TEST_SMOL = 'true';
    }

    // Disable animations and colors in CI
    if (!process.env.FORCE_COLOR) {
      process.env.NO_COLOR = '1';
    }

    // Optimize for parallel execution in CI
    process.env.BUN_TEST_POOL_SIZE = '4';
  }

  // ⚡ Signal Handling
  setupSignalHandling(): void {
    if (!this.config.signalHandling) return;

    console.info('⚡ Setting up signal handlers...');

    // Graceful shutdown on SIGTERM
    const sigtermHandler = () => {
      console.info('\n🛑 SIGTERM received - gracefully stopping tests...');
      this.cleanup();
      process.exit(143); // 128 + 15 (SIGTERM)
    };

    // Immediate shutdown on SIGKILL (can't be caught, but we can prepare)
    const sigintHandler = () => {
      console.info('\n⚡ SIGINT received - stopping test execution...');
      this.cleanup();
      process.exit(130); // 128 + 2 (SIGINT)
    };

    process.on('SIGTERM', sigtermHandler);
    process.on('SIGINT', sigintHandler);

    this.signalHandlers.set('SIGTERM', sigtermHandler);
    this.signalHandlers.set('SIGINT', sigintHandler);

    // Cleanup on exit
    process.on('exit', () => {
      this.cleanup();
    });
  }

  // 🧹 Cleanup Resources
  private cleanup(): void {
    console.info('🧹 Cleaning up test resources...');
    
    // Clear signal handlers
    this.signalHandlers.forEach((handler, signal) => {
      process.removeListener(signal as NodeJS.Signals, handler);
    });
    this.signalHandlers.clear();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  // 📊 Memory Management
  async runMemoryOptimizedTest(testFile: string): Promise<TestResult> {
    const startMemory = process.memoryUsage();
    const startTime = performance.now();

    console.info(`📊 Running memory-optimized test: ${testFile}`);

    try {
      // Use --smol flag for reduced memory footprint
      const command = `bun test --smol ${testFile}`;
      const result = await Bun.$`${command}`.quiet();
      
      const endMemory = process.memoryUsage();
      const duration = performance.now() - startTime;
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      // Parse test results from output
      const output = result.stdout.toString();
      const passedMatch = output.match(/(\d+) pass/);
      const failedMatch = output.match(/(\d+) fail/);
      const errorMatch = output.match(/(\d+) error/);

      const testResult: TestResult = {
        file: testFile,
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        errors: errorMatch ? parseInt(errorMatch[1]) : 0,
        exitCode: result.exitCode,
        duration,
        memoryUsage: Math.max(0, memoryDelta)
      };

      console.info(`  ✅ Completed: ${testResult.passed} passed, ${testResult.failed} failed, ${testResult.errors} errors`);
      console.info(`  📈 Memory delta: ${(testResult.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.info(`  ⏱️  Duration: ${testResult.duration.toFixed(2)}ms`);

      return testResult;

    } catch (error: any) {
      console.error(`  ❌ Test failed: ${error.message}`);
      
      return {
        file: testFile,
        passed: 0,
        failed: 0,
        errors: 1,
        exitCode: 1,
        duration: performance.now() - startTime,
        memoryUsage: 0
      };
    }
  }

  // 🚀 Single Process Test Execution
  async runSingleProcessTests(testFiles: string[]): Promise<TestResult[]> {
    console.info(`🚀 Running ${testFiles.length} tests in single process mode...`);
    
    const results: TestResult[] = [];
    const startTime = performance.now();

    for (const testFile of testFiles) {
      const result = await this.runMemoryOptimizedTest(testFile);
      results.push(result);

      // Early exit on critical errors
      if (result.exitCode > 1) {
        console.info(`🚨 Critical error in ${testFile}, stopping execution...`);
        break;
      }
    }

    const totalDuration = performance.now() - startTime;
    console.info(`\n✅ Single process execution completed in ${totalDuration.toFixed(2)}ms`);

    return results;
  }

  // 📈 Performance Monitoring
  async monitorPerformance(testFile: string): Promise<void> {
    console.info(`📈 Monitoring performance for: ${testFile}`);

    const samples: Array<{ timestamp: number; memory: number }> = [];
    const interval = setInterval(() => {
      samples.push({
        timestamp: performance.now(),
        memory: process.memoryUsage().heapUsed
      });
    }, 100);

    try {
      await this.runMemoryOptimizedTest(testFile);
    } finally {
      clearInterval(interval);

      if (samples.length > 0) {
        const peakMemory = Math.max(...samples.map(s => s.memory));
        const avgMemory = samples.reduce((sum, s) => sum + s.memory, 0) / samples.length;
        const memoryGrowth = samples[samples.length - 1].memory - samples[0].memory;

        console.info(`📊 Performance Metrics:`);
        console.info(`  Peak Memory: ${(peakMemory / 1024 / 1024).toFixed(2)}MB`);
        console.info(`  Average Memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
        console.info(`  Memory Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
        console.info(`  Sample Count: ${samples.length}`);
      }
    }
  }

  // 🎯 Exit Code Analysis
  analyzeExitCodes(results: TestResult[]): void {
    console.info('\n🎯 Exit Code Analysis:');
    
    const exitCodeStats = new Map<number, number>();
    results.forEach(result => {
      exitCodeStats.set(result.exitCode, (exitCodeStats.get(result.exitCode) || 0) + 1);
    });

    exitCodeStats.forEach((count, code) => {
      let description: string;
      switch (code) {
        case 0:
          description = 'All tests passed';
          break;
        case 1:
          description = 'Test failures occurred';
          break;
        default:
          description = `${code} unhandled errors`;
          break;
      }
      console.info(`  Exit Code ${code}: ${count} files (${description})`);
    });
  }

  // 📋 Generate Test Suite Report
  generateSuiteReport(results: TestResult[], environment: TestSuite['environment']): TestSuite {
    const summary = {
      totalTests: results.reduce((sum, r) => sum + r.passed + r.failed + r.errors, 0),
      totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      peakMemory: Math.max(...results.map(r => r.memoryUsage)),
      successRate: 0
    };

    summary.successRate = summary.totalTests > 0 ? (summary.totalPassed / summary.totalTests) * 100 : 0;

    return {
      results,
      summary,
      environment
    };
  }

  // 📄 Markdown Report Generation
  generateMarkdownReport(suite: TestSuite): string {
    const { results, summary, environment } = suite;

    let report = '# 🧪 Test Process Integration Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Bun Version**: ${environment.bunVersion}\n`;
    report += `**Platform**: ${environment.platform}\n`;
    report += `**Environment**: ${environment.ci ? 'CI' : 'Local'}\n`;
    report += `**GitHub Actions**: ${environment.githubActions ? 'Yes' : 'No'}\n\n`;

    // Summary Section
    report += '## 📊 Test Summary\n\n';
    report += '| Metric | Value |\n';
    report += '|--------|-------|\n';
    report += `| Total Tests | ${summary.totalTests} |\n`;
    report += `| Passed | ${summary.totalPassed} |\n`;
    report += `| Failed | ${summary.totalFailed} |\n`;
    report += `| Errors | ${summary.totalErrors} |\n`;
    report += `| Success Rate | ${summary.successRate.toFixed(1)}% |\n`;
    report += `| Total Duration | ${summary.totalDuration.toFixed(2)}ms |\n`;
    report += `| Peak Memory | ${(summary.peakMemory / 1024 / 1024).toFixed(2)}MB |\n\n`;

    // Individual Results
    report += '## 📋 Individual Test Results\n\n';
    report += '| File | Passed | Failed | Errors | Exit Code | Duration (ms) | Memory (MB) |\n';
    report += '|------|--------|--------|--------|-----------|---------------|-------------|\n';

    results.forEach(result => {
      const memoryMB = (result.memoryUsage / 1024 / 1024).toFixed(2);
      report += `| ${result.file} | ${result.passed} | ${result.failed} | ${result.errors} | ${result.exitCode} | ${result.duration.toFixed(2)} | ${memoryMB} |\n`;
    });

    report += '\n';

    // Environment Details
    report += '## 🔍 Environment Details\n\n';
    report += `- **CI Environment**: ${environment.ci ? 'Enabled' : 'Disabled'}\n`;
    report += `- **GitHub Actions**: ${environment.githubActions ? 'Enabled' : 'Disabled'}\n`;
    report += `- **Node Environment**: ${environment.nodeEnv}\n`;
    report += `- **Single Process**: ${this.config.singleProcess ? 'Enabled' : 'Disabled'}\n`;
    report += `- **Memory Optimized**: ${this.config.memoryOptimized ? 'Enabled' : 'Disabled'}\n`;
    report += `- **Signal Handling**: ${this.config.signalHandling ? 'Enabled' : 'Disabled'}\n\n`;

    // Recommendations
    report += '## 💡 Recommendations\n\n';
    
    if (summary.successRate < 90) {
      report += '⚠️ Success rate is below 90% - review failing tests\n';
    }
    
    if (summary.peakMemory > 100 * 1024 * 1024) { // 100MB
      report += '📈 High memory usage detected - consider test splitting\n';
    }
    
    if (summary.totalDuration > 10000) { // 10 seconds
      report += '⏱️ Long execution time - consider parallel execution\n';
    }

    if (environment.ci && !this.config.memoryOptimized) {
      report += '🏭 Consider enabling memory optimization for CI environments\n';
    }

    report += '\n---\n\n';
    report += '*Generated by Bun Test Process Integration v2.8*';

    return report;
  }

  // 🚀 Main Execution
  async runTestSuite(testPatterns: string[] = ['**/*.test.ts']): Promise<void> {
    console.info('🚀 Bun Test Process Integration v2.8');
    console.info('=' .repeat(60));

    // Environment Detection
    const environment = this.detectEnvironment();

    // Setup Signal Handling
    this.setupSignalHandling();

    // Find test files
    console.info('\n🔍 Discovering test files...');
    const testFiles: string[] = [];
    
    for (const pattern of testPatterns) {
      const files = await Array.fromAsync(new Bun.Glob(pattern).scan());
      testFiles.push(...files);
    }

    console.info(`Found ${testFiles.length} test files`);

    if (testFiles.length === 0) {
      console.info('⚠️ No test files found');
      return;
    }

    // Run Tests
    console.info('\n🧪 Running test suite...');
    const startTime = performance.now();

    let results: TestResult[];
    
    if (this.config.singleProcess) {
      results = await this.runSingleProcessTests(testFiles);
    } else {
      // Parallel execution (not implemented in this example)
      console.info('🔄 Parallel execution mode not implemented');
      results = await this.runSingleProcessTests(testFiles);
    }

    const totalDuration = performance.now() - startTime;

    // Analysis
    this.analyzeExitCodes(results);

    // Generate Report
    const suite = this.generateSuiteReport(results, environment);
    const markdownReport = this.generateMarkdownReport(suite);

    // Save Report
    const reportFile = 'test-integration-report.md';
    await Bun.write(reportFile, markdownReport);
    console.info(`\n📄 Report saved to: ${reportFile}`);

    // Save JSON data
    const jsonFile = 'test-integration-results.json';
    await Bun.write(jsonFile, JSON.stringify(suite, null, 2));
    console.info(`📊 JSON data saved to: ${jsonFile}`);

    // Final Summary
    console.info('\n' + '=' .repeat(60));
    console.info('✅ Test Integration Complete!');
    console.info(`📊 Success Rate: ${suite.summary.successRate.toFixed(1)}%`);
    console.info(`⏱️  Total Duration: ${totalDuration.toFixed(2)}ms`);
    console.info(`🧠 Peak Memory: ${(suite.summary.peakMemory / 1024 / 1024).toFixed(2)}MB`);

    // Exit with appropriate code
    const exitCode = suite.summary.totalErrors > 0 ? Math.min(suite.summary.totalErrors, 127) : 
                    suite.summary.totalFailed > 0 ? 1 : 0;
    
    if (exitCode !== 0) {
      console.info(`🚨 Exiting with code ${exitCode}`);
      process.exit(exitCode);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.info('Bun Test Process Integration v2.8');
    console.info('');
    console.info('Usage:');
    console.info('  bun run test-integration.ts [options] [patterns...]');
    console.info('');
    console.info('Options:');
    console.info('  --single-process    Run tests in single process mode (default)');
    console.info('  --memory-optimized  Enable memory optimizations');
    console.info('  --no-signal-handling  Disable signal handling');
    console.info('  --no-env-detection   Disable environment detection');
    console.info('  --monitor <file>     Monitor performance for specific test');
    console.info('');
    console.info('Examples:');
    console.info('  bun run test-integration.ts');
    console.info('  bun run test-integration.ts --memory-optimized **/*.test.ts');
    console.info('  bun run test-integration.ts --monitor src/core.test.ts');
    return;
  }

  const config: TestConfig = {};
  const patterns: string[] = [];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--single-process':
        config.singleProcess = true;
        break;
      case '--memory-optimized':
        config.memoryOptimized = true;
        break;
      case '--no-signal-handling':
        config.signalHandling = false;
        break;
      case '--no-env-detection':
        config.environmentDetection = false;
        break;
      case '--monitor':
        if (i + 1 < args.length) {
          const testFile = args[++i];
          const integration = new TestProcessIntegration(config);
          await integration.monitorPerformance(testFile);
          return;
        }
        break;
      default:
        if (!args[i].startsWith('--')) {
          patterns.push(args[i]);
        }
    }
  }

  // Default pattern if none provided
  if (patterns.length === 0) {
    patterns.push('**/*.test.ts');
  }

  const integration = new TestProcessIntegration(config);
  
  try {
    await integration.runTestSuite(patterns);
  } catch (error: any) {
    console.error('❌ Test integration failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
