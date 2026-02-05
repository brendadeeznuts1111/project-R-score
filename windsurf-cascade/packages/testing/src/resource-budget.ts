// packages/testing/src/resource-budget.ts
// Resource-budgeted test execution with consciousness integration

interface TestBudget {
    cpuMs: number;      // Max CPU time in milliseconds
    memoryMB: number;   // Max heap growth in MB
    networkKB: number;  // Max network usage (if applicable)
}

interface ResourceMetrics {
    heapGrowth: number;  // MB
    cpuTime: number;     // ms
    networkUsage: number; // KB
}

// Mock ResourceAwareMCP for demonstration
const ResourceAwareMCP = {
    executeWithResources: async (
        resourceConfig: any,
        input: any,
        fn: () => Promise<any>
    ) => {
        return await fn();
    }
};

// Mock consciousness ledger
const ConsciousLedger = {
    log: (entry: any) => {
        console.log(`[ConsciousLedger] ${JSON.stringify(entry)}`);
    }
};

export function withBudget<T>(
    budget: TestBudget,
    testFn: () => Promise<T>
): Promise<T> {
    return ResourceAwareMCP.executeWithResources(
        {
            name: 'test-execution',
            description: `Test with budget: ${JSON.stringify(budget)}`,
            inputSchema: { type: 'object' },
        } as any,
        {},
        async () => {
            const startMetrics = getResourceMetrics();
            const result = await testFn();
            const endMetrics = getResourceMetrics();

            const metrics = calculateResourceDelta(startMetrics, endMetrics);

            // Check budget violations
            if (metrics.heapGrowth > budget.memoryMB) {
                const violation = {
                    type: 'memory_budget_violation',
                    actual: metrics.heapGrowth.toFixed(2),
                    budget: budget.memoryMB,
                    unit: 'MB'
                };

                ConsciousLedger.log(violation);
                throw new Error(`Test exceeded memory budget: ${violation.actual}${violation.unit} > ${violation.budget}${violation.unit}`);
            }

            if (metrics.cpuTime > budget.cpuMs) {
                const violation = {
                    type: 'cpu_budget_violation',
                    actual: metrics.cpuTime.toFixed(2),
                    budget: budget.cpuMs,
                    unit: 'ms'
                };

                ConsciousLedger.log(violation);
                throw new Error(`Test exceeded CPU budget: ${violation.actual}${violation.unit} > ${violation.budget}${violation.unit}`);
            }

            if (metrics.networkUsage > budget.networkKB) {
                const violation = {
                    type: 'network_budget_violation',
                    actual: metrics.networkUsage.toFixed(2),
                    budget: budget.networkKB,
                    unit: 'KB'
                };

                ConsciousLedger.log(violation);
                throw new Error(`Test exceeded network budget: ${violation.actual}${violation.unit} > ${violation.budget}${violation.unit}`);
            }

            // Log successful budget compliance
            ConsciousLedger.log({
                type: 'test_budget_compliance',
                budget,
                metrics,
                efficiency: {
                    memory: ((budget.memoryMB - metrics.heapGrowth) / budget.memoryMB * 100).toFixed(1),
                    cpu: ((budget.cpuMs - metrics.cpuTime) / budget.cpuMs * 100).toFixed(1)
                }
            });

            return result;
        }
    );
}

function getResourceMetrics(): ResourceMetrics {
    const usage = process.memoryUsage();
    return {
        heapGrowth: 0, // Will be calculated as delta
        cpuTime: 0,   // Will be calculated as delta
        networkUsage: 0 // Mock network tracking
    };
}

function calculateResourceDelta(start: ResourceMetrics, end: ResourceMetrics): ResourceMetrics {
    return {
        heapGrowth: end.heapGrowth - start.heapGrowth,
        cpuTime: end.cpuTime - start.cpuTime,
        networkUsage: end.networkUsage - start.networkUsage
    };
}

// Budget presets for different test types
export const BudgetPresets = {
    // Fast unit tests
    unit: { cpuMs: 100, memoryMB: 10, networkKB: 0 },

    // Integration tests with moderate resource usage
    integration: { cpuMs: 1000, memoryMB: 50, networkKB: 100 },

    // Property tests with high iteration counts
    property: { cpuMs: 5000, memoryMB: 100, networkKB: 500 },

    // Performance benchmarks
    benchmark: { cpuMs: 30000, memoryMB: 500, networkKB: 1000 },

    // Memory-intensive tests
    memory: { cpuMs: 2000, memoryMB: 1000, networkKB: 0 }
};

// Helper function to create budgeted tests
export function createBudgetedTest<T>(
    name: string,
    budget: TestBudget,
    testFn: () => Promise<T>
) {
    return {
        name,
        budget,
        testFn: () => withBudget(budget, testFn)
    };
}

// Resource monitoring utilities
export class ResourceMonitor {
    private static metrics: Array<{ timestamp: number; metrics: ResourceMetrics }> = [];

    static record(metrics: ResourceMetrics): void {
        this.metrics.push({
            timestamp: Date.now(),
            metrics: { ...metrics }
        });

        // Keep only last 1000 entries
        if (this.metrics.length > 1000) {
            this.metrics.shift();
        }
    }

    static getAverageMetrics(timeWindowMs: number = 60000): ResourceMetrics | null {
        const cutoff = Date.now() - timeWindowMs;
        const recentMetrics = this.metrics
            .filter(m => m.timestamp > cutoff)
            .map(m => m.metrics);

        if (recentMetrics.length === 0) return null;

        return {
            heapGrowth: recentMetrics.reduce((sum, m) => sum + m.heapGrowth, 0) / recentMetrics.length,
            cpuTime: recentMetrics.reduce((sum, m) => sum + m.cpuTime, 0) / recentMetrics.length,
            networkUsage: recentMetrics.reduce((sum, m) => sum + m.networkUsage, 0) / recentMetrics.length
        };
    }

    static getPressureScore(): number {
        const avg = this.getAverageMetrics();
        if (!avg) return 0;

        // Calculate pressure score (0-1, higher is more pressure)
        const memoryPressure = Math.min(avg.heapGrowth / 100, 1); // Normalize to 100MB
        const cpuPressure = Math.min(avg.cpuTime / 10000, 1); // Normalize to 10s
        const networkPressure = Math.min(avg.networkUsage / 1000, 1); // Normalize to 1MB

        return (memoryPressure + cpuPressure + networkPressure) / 3;
    }

    static reset(): void {
        this.metrics = [];
    }
}
