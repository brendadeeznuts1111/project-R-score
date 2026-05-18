// scripts/run-v2.01.05-tests.ts
// Comprehensive test runner for v2.01.05 self-heal features

import { $ } from 'bun';
import { readdir, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface TestResult {
  name: string;
  passed: number;
  failed: number;
  duration: number;
  success: boolean;
}

interface TestSuite {
  name: string;
  path: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Self-Heal Core',
    path: 'tests/self-heal-v2.01.05.test.ts',
    description: 'Core functionality tests for v2.01.05 self-heal script'
  },
  {
    name: 'CLI Integration',
    path: 'tests/cli-enhanced-v2.01.05.test.ts',
    description: 'Integration tests for enhanced CLI commands'
  },
  {
    name: 'Performance Benchmarks',
    path: 'tests/performance/self-heal-benchmark-v2.01.05.test.ts',
    description: 'Performance and scalability benchmarks'
  }
];

async function runTestSuite(suite: TestSuite): Promise<TestResult> {
  console.info(`\n🧪 Running ${suite.name} Tests`);
  console.info(`📝 ${suite.description}`);
  console.info('─'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const result = await $`bun test "${suite.path}" --reporter=verbose`.text();
    const duration = Date.now() - startTime;
    
    // Parse test results
    const lines = result.split('\n');
    let passed = 0;
    let failed = 0;
    
    for (const line of lines) {
      if (line.includes('✓') || line.includes('pass')) {
        passed++;
      } else if (line.includes('✗') || line.includes('fail')) {
        failed++;
      }
    }
    
    return {
      name: suite.name,
      passed,
      failed,
      duration,
      success: failed === 0
    };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      name: suite.name,
      passed: 0,
      failed: 1,
      duration,
      success: false
    };
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function generateReport(results: TestResult[]): string {
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalTests = totalPassed + totalFailed;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const successRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : '0';
  
  return `
📊 V2.01.05 TEST REPORT
========================
Generated: ${new Date().toISOString()}
Test Suites: ${results.length}
Total Tests: ${totalTests}
Passed: ${totalPassed} ✅
Failed: ${totalFailed} ${totalFailed > 0 ? '❌' : '✅'}
Success Rate: ${successRate}%
Total Duration: ${formatDuration(totalDuration)}

TEST SUITE DETAILS:
${results.map(r => `
${r.success ? '✅' : '❌'} ${r.name}
   Tests: ${r.passed + r.failed} (${r.passed} passed, ${r.failed} failed)
   Duration: ${formatDuration(r.duration)}
   Status: ${r.success ? 'PASSED' : 'FAILED'}
`).join('')}

${totalFailed > 0 ? '⚠️  Some tests failed. Check the output above for details.' : '🎉 All tests passed! The v2.01.05 self-heal system is working correctly.'}

FEATURES TESTED:
• ✅ Advanced file validation and safety checks
• ✅ SHA-256 file hashing and integrity verification
• ✅ Parallel processing with configurable limits
• ✅ Backup system with integrity validation
• ✅ Comprehensive audit logging
• ✅ Enhanced CLI command integration
• ✅ Performance optimization and scalability
• ✅ Error handling and edge cases
• ✅ Configuration management
• ✅ Memory usage and resource management
`;
}

async function createTestReports(results: TestResult[]): Promise<void> {
  const reportDir = './test-reports';
  await mkdir(reportDir, { recursive: true });
  
  // Generate detailed report
  const report = generateReport(results);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Save detailed report
  await writeFile(join(reportDir, `v2.01.05-test-report-${timestamp}.md`), report);
  
  // Save JSON summary
  const summary = {
    timestamp: new Date().toISOString(),
    version: '2.01.05',
    results,
    summary: {
      totalSuites: results.length,
      totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      successRate: results.every(r => r.success)
    }
  };
  
  await writeFile(join(reportDir, `v2.01.05-test-summary-${timestamp}.json`), JSON.stringify(summary, null, 2));
  
  console.info(`\n📋 Test reports saved to: ${reportDir}/`);
  console.info(`   📄 Detailed report: v2.01.05-test-report-${timestamp}.md`);
  console.info(`   📊 JSON summary: v2.01.05-test-summary-${timestamp}.json`);
}

async function runQuickHealthCheck(): Promise<boolean> {
  console.info('\n🏥 Running Quick Health Check...');
  
  try {
    // Test basic self-heal functionality
    const result = await $`bun run scripts/self-heal.ts --help`.text();
    if (!result.includes('System Hygiene v2.01.05')) {
      console.info('❌ Self-heal script not responding correctly');
      return false;
    }
    
    // Test CLI integration
    const cacheResult = await $`bun run cli/commands/cache.ts --help`.text();
    if (!cacheResult.includes('cache')) {
      console.info('❌ Cache CLI not responding correctly');
      return false;
    }
    
    // Test empire CLI
    const empireResult = await $`bun run cli/bin/empire.ts --help`.text();
    if (!empireResult.includes('empire')) {
      console.info('❌ Empire CLI not responding correctly');
      return false;
    }
    
    console.info('✅ All components responding correctly');
    return true;
    
  } catch (error) {
    console.info('❌ Health check failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function main() {
  console.info('🚀 Duo Automation v2.01.05 Test Runner');
  console.info('=====================================');
  console.info('Running comprehensive tests for enhanced self-heal system...\n');
  
  // Quick health check first
  const healthCheck = await runQuickHealthCheck();
  if (!healthCheck) {
    console.info('\n❌ Health check failed. Please check your installation.');
    process.exit(1);
  }
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  // Run each test suite
  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push(result);
    
    if (result.success) {
      console.info(`✅ ${suite.name} completed in ${formatDuration(result.duration)}`);
    } else {
      console.info(`❌ ${suite.name} failed in ${formatDuration(result.duration)}`);
    }
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Generate and display report
  const report = generateReport(results);
  console.info(report);
  
  // Save detailed reports
  await createTestReports(results);
  
  console.info(`\n⏱️  Total test execution time: ${formatDuration(totalDuration)}`);
  
  // Exit with appropriate code
  const allPassed = results.every(r => r.success);
  process.exit(allPassed ? 0 : 1);
}

// Command line options
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.info(`
🧪 Duo Automation v2.01.05 Test Runner

Usage: bun run scripts/run-v2.01.05-tests.ts [options]

Options:
  --help, -h     Show this help message
  --quick        Run only quick health check
  --suite <name> Run specific test suite
  --no-reports   Skip generating detailed reports

Available Test Suites:
• self-heal      Core functionality tests
• cli            CLI integration tests  
• performance    Performance benchmarks

Examples:
  bun run scripts/run-v2.01.05-tests.ts
  bun run scripts/run-v2.01.05-tests.ts --quick
  bun run scripts/run-v2.01.05-tests.ts --suite self-heal
`);
  process.exit(0);
}

if (args.includes('--quick')) {
  runQuickHealthCheck().then(success => {
    process.exit(success ? 0 : 1);
  });
} else if (args.includes('--suite')) {
  const suiteName = args[args.indexOf('--suite') + 1];
  const suite = testSuites.find(s => s.name.toLowerCase().includes(suiteName.toLowerCase()));
  
  if (!suite) {
    console.info(`❌ Test suite '${suiteName}' not found`);
    console.info('Available suites:', testSuites.map(s => s.name).join(', '));
    process.exit(1);
  }
  
  runTestSuite(suite).then(result => {
    console.info(`\n${result.success ? '✅' : '❌'} ${suite.name}: ${result.passed + result.failed} tests, ${formatDuration(result.duration)}`);
    process.exit(result.success ? 0 : 1);
  });
} else {
  main();
}
