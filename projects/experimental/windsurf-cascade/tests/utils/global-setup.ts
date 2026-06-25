// global-setup.ts
// Global Setup/Teardown with Resource Budgeting for Phase V Advanced Testing

import { ResourceMonitor } from './packages/testing/src/resource-budget';
import { TestDurationOracle } from './src/agents/testDurationOracle';

// Mock ResourceAwareMCP for demonstration
const ResourceAwareMCP = {
    executeWithResources: async (
        resourceConfig: any,
        input: any,
        fn: () => Promise<any>
    ) => {
        console.info(`[ResourceAwareMCP] Executing with config: ${resourceConfig.name}`);
        return await fn();
    },

    getPressureScore: () => {
        return ResourceMonitor.getPressureScore();
    }
};

// Mock consciousness ledger
const ConsciousLedger = {
    log: (entry: any) => {
        console.info(`[ConsciousLedger] ${JSON.stringify(entry)}`);
    }
};

// Mock schema loading functions
const loadSchema = async (schemaName: string) => {
    console.info(`[Setup] Loading schema: ${schemaName}`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate loading time
    return { name: schemaName, loaded: true, timestamp: Date.now() };
};

interface SuiteBudget {
    cpuMs: number;      // Max CPU time for entire suite
    memoryMB: number;   // Max heap growth for entire suite
    testCount: number;  // Expected number of tests
}

export async function setup() {
    console.info('🧠 Initializing Advanced Test Suite Setup...');

    // Budget entire test suite: 10GB heap, 10min CPU
    const suiteBudget: SuiteBudget = {
        cpuMs: 600_000,      // 10 minutes
        memoryMB: 10_000,    // 10 GB
        testCount: 50        // Expected test count
    };

    console.info(`📊 Test suite starting with budget:`, suiteBudget);

    // Reset monitors for clean baseline
    ResourceMonitor.reset();
    TestDurationOracle.reset();

    // Pre-warm caches for known slow queries
    console.info('🚀 Pre-warming caches...');
    await ResourceAwareMCP.executeWithResources(
        {
            name: 'prewarm-cache',
            description: 'Pre-warm schemas and caches for optimal test performance'
        } as any,
        {},
        async () => {
            // Load common schemas in parallel
            const schemas = ['market-metrics', 'risk-limits', 'odds-calculations', 'arbitrage-rules'];

            await Promise.all(schemas.map(async (schema) => {
                const result = await loadSchema(schema);
                console.info(`   ✅ Loaded schema: ${schema.name || 'unnamed'}`);
                return result;
            }));

            console.info('   🎯 All schemas pre-warmed and cached');
        }
    );

    // Initialize resource monitoring
    const initialMetrics = {
        heapGrowth: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        cpuTime: 0, // Will be tracked during execution
        networkUsage: 0 // Mock network tracking
    };

    ResourceMonitor.record(initialMetrics);

    // Log setup completion
    ConsciousLedger.log({
        type: 'test_suite_setup_complete',
        suiteBudget,
        initialMetrics,
        schemasLoaded: ['market-metrics', 'risk-limits', 'odds-calculations', 'arbitrage-rules'],
        timestamp: Date.now()
    });

    console.info('✅ Test suite setup complete - ready for advanced testing');
    console.info(`   📈 Budget: ${suiteBudget.cpuMs / 1000}s CPU, ${suiteBudget.memoryMB}MB Memory`);
    console.info(`   🧠 Consciousness monitoring: ENABLED`);
    console.info(`   ⚡ Resource tracking: ACTIVE`);

    return {
        suiteBudget,
        setupTime: Date.now(),
        consciousnessEnabled: true
    };
}

export async function teardown(setupContext?: any) {
    console.info('📊 Executing Advanced Test Suite Teardown...');

    const startTime = Date.now();

    // Get final metrics
    const pressure = ResourceAwareMCP.getPressureScore();
    const predictions = TestDurationOracle.getAllPredictions();
    const finalMetrics = ResourceMonitor.getAverageMetrics();

    // Calculate suite performance
    const suiteDuration = startTime - (setupContext?.setupTime || startTime);
    const slowTests = predictions.filter(p => p.suggestion === 'split' || p.suggestion === 'decreaseRuns');
    const efficientTests = predictions.filter(p => p.predictedDuration < 5000);

    console.info('\n📈 Test Suite Performance Summary:');
    console.info(`   ⏱️  Total duration: ${(suiteDuration / 1000).toFixed(2)}s`);
    console.info(`   🧠 Resource pressure: ${(pressure * 100).toFixed(1)}%`);
    console.info(`   🐌 Slow tests detected: ${slowTests.length}`);
    console.info(`   ⚡ Efficient tests: ${efficientTests.length}/${predictions.length}`);

    if (finalMetrics) {
        console.info(`   💾 Average memory usage: ${finalMetrics.heapGrowth.toFixed(2)}MB`);
        console.info(`   🔄 Average CPU time: ${finalMetrics.cpuTime.toFixed(2)}ms`);
    }

    // Generate recommendations
    const recommendations = [];

    if (pressure > 0.8) {
        recommendations.push('🔴 High resource pressure - consider reducing test complexity');
    }

    if (slowTests.length > predictions.length * 0.2) {
        recommendations.push('🟡 Many slow tests - consider test splitting or optimization');
    }

    if (efficientTests.length / predictions.length > 0.8) {
        recommendations.push('🟢 Excellent test efficiency - suite is well optimized');
    }

    if (recommendations.length > 0) {
        console.info('\n💡 Recommendations:');
        recommendations.forEach(rec => console.info(`   ${rec}`));
    }

    // Log comprehensive completion data to consciousness ledger
    ConsciousLedger.log({
        type: 'test_suite_complete',
        performance: {
            duration: suiteDuration,
            pressure,
            slowTestCount: slowTests.length,
            efficientTestCount: efficientTests.length,
            totalTestCount: predictions.length
        },
        resourceMetrics: finalMetrics,
        predictions: {
            slowTests: slowTests.map(t => ({
                name: t.testName,
                predictedMs: t.predictedDuration,
                suggestion: t.suggestion
            })),
            averageConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
        },
        recommendations,
        timestamp: Date.now()
    });

    // Export analytics for external monitoring
    const analyticsData = {
        timestamp: new Date().toISOString(),
        suitePerformance: {
            duration: suiteDuration,
            pressure,
            testCount: predictions.length
        },
        resourceMetrics: finalMetrics,
        recommendations,
        consciousness: {
            enabled: true,
            ledgerEntries: 1, // This teardown entry
            predictionsGenerated: predictions.length
        }
    };

    // In real implementation, this would be sent to monitoring system
    console.info('\n📤 Analytics exported for monitoring:');
    console.info(JSON.stringify(analyticsData, null, 2));

    console.info('\n✅ Test suite teardown complete');
    console.info('   🧠 Consciousness ledger updated');
    console.info('   📊 Performance metrics recorded');
    console.info('   🔄 Resource monitors reset');

    return analyticsData;
}

// Health check function for monitoring systems
export async function healthCheck() {
    const pressure = ResourceMonitor.getPressureScore();
    const predictions = TestDurationOracle.getAllPredictions();
    const metrics = ResourceMonitor.getAverageMetrics();

    return {
        status: pressure < 0.9 ? 'healthy' : 'warning',
        timestamp: new Date().toISOString(),
        resourcePressure: pressure,
        testPredictions: {
            total: predictions.length,
            slow: predictions.filter(p => p.predictedDuration > 30000).length,
            averageConfidence: predictions.length > 0
                ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
                : 0
        },
        resourceMetrics: metrics,
        consciousness: {
            enabled: true,
            ledgerSize: 1 // Mock ledger size
        }
    };
}

// Export for use in test configuration
export default {
    setup,
    teardown,
    healthCheck
};
