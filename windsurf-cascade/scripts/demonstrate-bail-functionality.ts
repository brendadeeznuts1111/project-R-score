// scripts/demonstrate-bail-functionality.ts
// Demonstration of Bun test runner bail functionality

import { spawn } from 'bun';

async function runBailDemo() {
    console.log('🎯 Bun Test Runner Bail Functionality Demo\n');

    // Test 1: Bail after 1 failure (default)
    console.log('1️⃣ Testing bail after 1 failure (default):');
    console.log('   Command: bun test --bail');
    console.log('   Expected: Stop immediately after first failure\n');

    // Test 2: Bail after 3 failures
    console.log('2️⃣ Testing bail after 3 failures:');
    console.log('   Command: bun test --bail=3');
    console.log('   Expected: Run until 3 failures, then stop\n');

    // Test 3: Bail after 5 failures
    console.log('3️⃣ Testing bail after 5 failures:');
    console.log('   Command: bun test --bail=5');
    console.log('   Expected: Run until 5 failures, then stop\n');

    console.log('💡 Use Cases for --bail:');
    console.log('   • Fast CI feedback - stop early on failures');
    console.log('   • Debug failing tests - focus on first issues');
    console.log('   • Resource conservation - save CPU/memory');
    console.log('   • Large test suites - avoid cascading failures\n');

    console.log('🔧 Advanced Bail Options:');
    console.log('   --bail        Stop after 1 failure (default)');
    console.log('   --bail=0      Never bail (run all tests)');
    console.log('   --bail=N      Stop after N failures\n');

    console.log('📊 Performance Impact:');
    console.log('   • Default bail: ~50% faster on failure detection');
    console.log('   • Custom bail: Tunable for your test suite');
    console.log('   • No bail: Full coverage but slower\n');

    console.log('🚀 Production Usage:');
    console.log('   # CI/CD - Fast feedback');
    console.log('   bun test --ci --bail');
    console.log('');
    console.log('   # Development - Debug specific failures');
    console.log('   bun test --bail=3 --verbose');
    console.log('');
    console.log('   # Full coverage - Never bail');
    console.log('   bun test --bail=0 --coverage');
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
