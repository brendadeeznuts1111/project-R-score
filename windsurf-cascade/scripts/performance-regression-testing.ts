// scripts/performance-regression-testing.ts
// Performance regression testing using bail=1 with timeout

import { spawn } from 'bun';

interface PerformanceTestResult {
    testName: string;
    executionTime: number;
    memoryUsage: number;
    status: 'pass' | 'fail' | 'timeout';
    bailTriggered: boolean;
}

class PerformanceRegressionDetector {
    private baseline: Map<string, PerformanceTestResult> = new Map();
    private threshold = 1.5; // 50% regression threshold

    async runPerformanceTest(testPattern: string, timeoutMs: number = 30000) {
        console.log('⚡ Performance Regression Testing');
        console.log(`   Pattern: ${testPattern}`);
        console.log(`   Timeout: ${timeoutMs}ms`);
        console.log(`   Bail: 1 (stop on first failure)\n`);

        const startTime = performance.now();

        try {
            // Run with bail=1 and timeout for quick regression detection
            const result = await this.executeTest(testPattern, timeoutMs);

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            console.log(`📊 Performance Test Results:`);
            console.log(`   Total execution time: ${totalTime.toFixed(2)}ms`);
            console.log(`   Bail triggered: ${result.bailTriggered}`);
            console.log(`   Status: ${result.status}`);

            if (result.bailTriggered) {
                console.log(`   ✅ Early failure detected - saved time!`);
                console.log(`   🎯 Performance regression caught quickly`);
            }

            return result;

        } catch (error) {
            console.error(`❌ Performance test failed:`, error);
            throw error;
        }
    }

    private async executeTest(testPattern: string, timeoutMs: number): Promise<PerformanceTestResult> {
        return new Promise((resolve) => {
            const startTime = performance.now();
            let bailTriggered = false;

            // Mock the actual test execution for demonstration
            setTimeout(() => {
                const endTime = performance.now();
                const executionTime = endTime - startTime;

                // Simulate different scenarios
                const scenarios = [
                    { status: 'pass' as const, bailTriggered: false, time: 100 },
                    { status: 'fail' as const, bailTriggered: true, time: 150 },
                    { status: 'timeout' as const, bailTriggered: true, time: timeoutMs + 1000 }
                ];

                const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

                resolve({
                    testName: testPattern,
                    executionTime: scenario.time,
                    memoryUsage: Math.random() * 100, // MB
                    status: scenario.status,
                    bailTriggered: scenario.bailTriggered
                });

            }, Math.random() * 200 + 50); // Random execution time
        });
    }

    compareWithBaseline(current: PerformanceTestResult): {
        regression: boolean;
        improvement: boolean;
        percentChange: number;
        recommendation: string;
    } {
        const previous = this.baseline.get(current.testName);

        if (!previous) {
            return {
                regression: false,
                improvement: false,
                percentChange: 0,
                recommendation: 'Establish baseline for future comparisons'
            };
        }

        const percentChange = (current.executionTime - previous.executionTime) / previous.executionTime * 100;

        const regression = percentChange > (this.threshold - 1) * 100;
        const improvement = percentChange < -(this.threshold - 1) * 100;

        let recommendation = '';
        if (regression) {
            recommendation = `🚨 Performance regression detected: ${percentChange.toFixed(1)}% slower`;
        } else if (improvement) {
            recommendation = `✅ Performance improvement: ${Math.abs(percentChange).toFixed(1)}% faster`;
        } else {
            recommendation = `⚖️ Performance stable: ${percentChange.toFixed(1)}% change`;
        }

        return {
            regression,
            improvement,
            percentChange,
            recommendation
        };
    }

    setBaseline(result: PerformanceTestResult) {
        this.baseline.set(result.testName, result);
        console.log(`📝 Baseline set for ${result.testName}: ${result.executionTime.toFixed(2)}ms`);
    }
}

// Performance testing configurations
export const PerformanceTestConfigs = {
    // Quick regression detection
    quickRegression: {
        command: 'bun test --bail=1 --timeout=30000',
        description: 'Stop immediately on first failure, 30s timeout',
        useCase: 'CI/CD fast feedback, performance regression detection'
    },

    // Comprehensive performance testing
    comprehensive: {
        command: 'bun test --bail=3 --timeout=60000',
        description: 'Allow 3 failures, 60s timeout',
        useCase: 'Development debugging, multiple performance issues'
    },

    // Stress testing
    stressTest: {
        command: 'bun test --bail=1 --timeout=120000',
        description: 'Immediate bail, 2 minute timeout',
        useCase: 'Stress testing, load testing scenarios'
    },

    // Memory leak detection
    memoryLeak: {
        command: 'bun test property-tests/memory-leak.property.test.ts --bail=1 --timeout=30000',
        description: 'Memory leak detection with immediate bail',
        useCase: 'Memory regression testing, leak detection'
    },

    // Resource budget testing
    resourceBudget: {
        command: 'bun test --global-setup=./global-setup.ts --bail=1 --timeout=30000',
        description: 'Resource budget validation with immediate bail',
        useCase: 'Resource regression testing, budget enforcement'
    }
};

// Best practices for performance testing with bail
export const PerformanceTestingBestPractices = [
    {
        practice: 'Use bail=1 for CI/CD',
        reason: 'Immediate feedback on performance regressions',
        command: 'bun test --bail=1 --timeout=30000'
    },
    {
        practice: 'Set appropriate timeouts',
        reason: 'Prevent hanging tests from blocking CI',
        command: 'bun test --bail=1 --timeout=30000'
    },
    {
        practice: 'Combine with memory monitoring',
        reason: 'Catch both performance and memory regressions',
        command: 'bun test property-tests/memory-leak.property.test.ts --bail=1'
    },
    {
        practice: 'Use with resource budgeting',
        reason: 'Ensure resource constraints are maintained',
        command: 'bun test --global-setup=./global-setup.ts --bail=1'
    },
    {
        practice: 'Monitor execution time trends',
        reason: 'Track performance over time',
        command: 'bun test --bail=1 --timeout=30000 --reporter=json'
    }
];

// Run performance regression demo
async function runPerformanceRegressionDemo() {
    console.log('🎯 Performance Regression Testing Demo\n');

    const detector = new PerformanceRegressionDetector();

    // Test different scenarios
    const testPatterns = [
        'property-tests/memory-leak.property.test.ts',
        'packages/testing/src/types/practical-type-tests.test.ts',
        'property-tests/network/mock-nba-api.test.ts'
    ];

    for (const pattern of testPatterns) {
        console.log(`\n🧪 Testing pattern: ${pattern}`);

        try {
            const result = await detector.runPerformanceTest(pattern, 30000);

            // Set baseline for first run
            if (!detector.baseline.has(pattern)) {
                detector.setBaseline(result);
            } else {
                const comparison = detector.compareWithBaseline(result);
                console.log(`   ${comparison.recommendation}`);
            }

        } catch (error) {
            console.error(`   ❌ Test failed: ${error}`);
        }
    }

    console.log('\n📈 Performance Testing Summary:');
    console.log('   ✅ Bail=1 provides immediate regression detection');
    console.log('   ✅ Timeout prevents hanging tests');
    console.log('   ✅ Significant time savings in CI/CD');
    console.log('   ✅ Works with all advanced testing features');
}

// Export for use
export { PerformanceRegressionDetector };

// Run demo if executed directly
if (import.meta.main) {
    runPerformanceRegressionDemo().catch(console.error);
}
