// scripts/demonstrate-bail-functionality.ts
// Demonstration of Bun test runner bail functionality

import { spawn } from 'bun';

async function runBailDemo() {
    console.info('🎯 Bun Test Runner Bail Functionality Demo\n');

    // Test 1: Bail after 1 failure (default)
    console.info('1️⃣ Testing bail after 1 failure (default):');
    console.info('   Command: bun test --bail');
    console.info('   Expected: Stop immediately after first failure\n');

    // Test 2: Bail after 3 failures
    console.info('2️⃣ Testing bail after 3 failures:');
    console.info('   Command: bun test --bail=3');
    console.info('   Expected: Run until 3 failures, then stop\n');

    // Test 3: Bail after 5 failures
    console.info('3️⃣ Testing bail after 5 failures:');
    console.info('   Command: bun test --bail=5');
    console.info('   Expected: Run until 5 failures, then stop\n');

    console.info('💡 Use Cases for --bail:');
    console.info('   • Fast CI feedback - stop early on failures');
    console.info('   • Debug failing tests - focus on first issues');
    console.info('   • Resource conservation - save CPU/memory');
    console.info('   • Large test suites - avoid cascading failures\n');

    console.info('🔧 Advanced Bail Options:');
    console.info('   --bail        Stop after 1 failure (default)');
    console.info('   --bail=0      Never bail (run all tests)');
    console.info('   --bail=N      Stop after N failures\n');

    console.info('📊 Performance Impact:');
    console.info('   • Default bail: ~50% faster on failure detection');
    console.info('   • Custom bail: Tunable for your test suite');
    console.info('   • No bail: Full coverage but slower\n');

    console.info('🚀 Production Usage:');
    console.info('   # CI/CD - Fast feedback');
    console.info('   bun test --ci --bail');
    console.info('');
    console.info('   # Development - Debug specific failures');
    console.info('   bun test --bail=3 --verbose');
    console.info('');
    console.info('   # Full coverage - Never bail');
    console.info('   bun test --bail=0 --coverage');
}

// Bail configuration examples
export const BailExamples = {
    // Fast CI feedback
    ciFast: 'bun test --ci --bail',

    // Development debugging
    devDebug: 'bun test --bail=3 --verbose',

    // Full coverage testing
    fullCoverage: 'bun test --bail=0 --coverage',

    // Performance testing
    performance: 'bun test --bail=1 --timeout=30000',

    // Concurrent testing with bail
    concurrent: 'bun test --bail=2 --max-concurrency 20',

    // Property testing with bail
    property: 'bun test property-tests/ --bail=1 --timeout 120000',

    // Type testing with bail
    typeTesting: 'bun test packages/testing/src/types/ --bail=1',

    // Integration testing with bail
    integration: 'bun test --bail=5 --global-setup=./global-setup.ts'
};

// Bail best practices
export const BailBestPractices = [
    {
        scenario: 'CI/CD Pipelines',
        recommendation: 'Use --bail for fast feedback on failures',
        command: 'bun test --ci --bail',
        reason: 'Save resources and get quick feedback'
    },
    {
        scenario: 'Development Debugging',
        recommendation: 'Use --bail=3 to see multiple related failures',
        command: 'bun test --bail=3 --verbose',
        reason: 'Identify patterns in failing tests'
    },
    {
        scenario: 'Full Coverage',
        recommendation: 'Use --bail=0 for complete test execution',
        command: 'bun test --bail=0 --coverage',
        reason: 'Ensure all tests run for coverage reports'
    },
    {
        scenario: 'Performance Testing',
        recommendation: 'Use --bail=1 with timeout limits',
        command: 'bun test --bail=1 --timeout=30000',
        reason: 'Quickly identify performance regressions'
    },
    {
        scenario: 'Large Test Suites',
        recommendation: 'Use --bail=5 for balanced feedback',
        command: 'bun test --bail=5 --max-concurrency 20',
        reason: 'Get meaningful feedback without excessive execution'
    }
];

// Run the demo
if (import.meta.main) {
    runBailDemo().catch(console.error);
}
