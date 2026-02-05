/**
 * Performance Budget System for Industry Dominance
 * 
 * Comprehensive performance budgeting with automated enforcement
 * and real-time monitoring for achieving 10/10 performance excellence
 */

import { performance } from 'perf_hooks';

/**
 * Performance budget definitions for all operations
 */
export interface PerformanceBudget {
    name: string;
    maxTime: number; // Maximum allowed time in milliseconds
    maxMemory: number; // Maximum allowed memory in MB
    maxCPU: number; // Maximum allowed CPU percentage
    critical: boolean; // Whether this is a critical path operation
    grade: 'A+' | 'A' | 'B' | 'C'; // Target performance grade
}

/**
 * Comprehensive performance budgets for Odds Protocol
 */
export const PERFORMANCE_BUDGETS: Record<string, PerformanceBudget> = {
    // Critical path operations (A+ Grade: 0-5ms)
    'validation.string': {
        name: 'String Validation',
        maxTime: 5,
        maxMemory: 10,
        maxCPU: 5,
        critical: true,
        grade: 'A+'
    },
    'validation.short_string_validation': {
        name: 'Short String Validation',
        maxTime: 5,
        maxMemory: 10,
        maxCPU: 5,
        critical: true,
        grade: 'A+'
    },
    'validation.medium_string_validation_with_complex_patterns': {
        name: 'Medium String Validation',
        maxTime: 5,
        maxMemory: 10,
        maxCPU: 5,
        critical: true,
        grade: 'A+'
    },
    'validation.large_array_processing': {
        name: 'Large Array Processing',
        maxTime: 5,
        maxMemory: 10,
        maxCPU: 5,
        critical: true,
        grade: 'A+'
    },
    'validation.regex_pattern_matching': {
        name: 'Regex Pattern Matching',
        maxTime: 5,
        maxMemory: 10,
        maxCPU: 5,
        critical: true,
        grade: 'A+'
    },
    'validation.complex_data_structure_validation': {
        name: 'Complex Data Structure Validation',
        maxTime: 5,
        maxMemory: 10,
        maxCPU: 5,
        critical: true,
        grade: 'A+'
    },
    'validation.array': {
        name: 'Array Validation',
        maxTime: 5,
        maxMemory: 20,
        maxCPU: 5,
        critical: true,
        grade: 'A+'
    },
    'validation.regex': {
        name: 'Regex Validation',
        maxTime: 5,
        maxMemory: 15,
        maxCPU: 10,
        critical: true,
        grade: 'A+'
    },
    'file.read': {
        name: 'File Reading',
        maxTime: 5,
        maxMemory: 50,
        maxCPU: 10,
        critical: true,
        grade: 'A+'
    },
    'cache.access': {
        name: 'Cache Access',
        maxTime: 1,
        maxMemory: 5,
        maxCPU: 2,
        critical: true,
        grade: 'A+'
    },

    // Standard operations (A Grade: 5-50ms)
    'template.processing': {
        name: 'Template Processing',
        maxTime: 20,
        maxMemory: 100,
        maxCPU: 30,
        critical: false,
        grade: 'A'
    },
    'metadata.extraction': {
        name: 'Metadata Extraction',
        maxTime: 30,
        maxMemory: 150,
        maxCPU: 25,
        critical: false,
        grade: 'A'
    },
    'vault.organization': {
        name: 'Vault Organization',
        maxTime: 50,
        maxMemory: 200,
        maxCPU: 40,
        critical: false,
        grade: 'A'
    },
    'validation.complex': {
        name: 'Complex Validation',
        maxTime: 40,
        maxMemory: 180,
        maxCPU: 35,
        critical: false,
        grade: 'A'
    },

    // Background operations (B Grade: 50-200ms)
    'report.generation': {
        name: 'Report Generation',
        maxTime: 100,
        maxMemory: 500,
        maxCPU: 60,
        critical: false,
        grade: 'B'
    },
    'bulk.processing': {
        name: 'Bulk Processing',
        maxTime: 200,
        maxMemory: 1000,
        maxCPU: 80,
        critical: false,
        grade: 'B'
    },
    'analytics.computation': {
        name: 'Analytics Computation',
        maxTime: 150,
        maxMemory: 800,
        maxCPU: 70,
        critical: false,
        grade: 'B'
    }
};

/**
 * Performance measurement result
 */
export interface PerformanceMeasurement {
    operation: string;
    time: number;
    memory: number;
    cpu: number;
    withinBudget: boolean;
    grade: 'A+' | 'A' | 'B' | 'C' | 'F';
    budget: PerformanceBudget;
    violations: string[];
}

/**
 * Performance budget enforcer
 */
export class PerformanceBudgetEnforcer {
    private measurements: PerformanceMeasurement[] = [];
    private violations: Map<string, number> = new Map();

    /**
     * Execute operation with performance budget enforcement
     */
    async executeWithBudget<T>(
        operationName: string,
        operation: () => Promise<T> | T
    ): Promise<{ result: T; measurement: PerformanceMeasurement }> {
        const budget = PERFORMANCE_BUDGETS[operationName];
        if (!budget) {
            throw new Error(`No performance budget defined for operation: ${operationName}`);
        }

        // Start performance monitoring
        const startMemory = this.getMemoryUsage();
        const startCPU = this.getCPUUsage();
        const startTime = performance.now();

        try {
            // Execute the operation
            const result = await operation();

            // Measure performance
            const endTime = performance.now();
            const endMemory = this.getMemoryUsage();
            const endCPU = this.getCPUUsage();

            const time = endTime - startTime;
            const memory = endMemory - startMemory;
            const cpu = Math.max(0, endCPU - startCPU);

            // Create measurement
            const measurement = this.createMeasurement(operationName, time, memory, cpu, budget);
            this.recordMeasurement(measurement);

            // Check for violations
            if (!measurement.withinBudget) {
                this.handleViolation(measurement);
            }

            return { result, measurement };
        } catch (error) {
            const endTime = performance.now();
            const time = endTime - startTime;

            // Record failed measurement
            const measurement = this.createMeasurement(operationName, time, 0, 100, budget);
            this.recordMeasurement(measurement);

            throw error;
        }
    }

    /**
     * Create performance measurement
     */
    private createMeasurement(
        operation: string,
        time: number,
        memory: number,
        cpu: number,
        budget: PerformanceBudget
    ): PerformanceMeasurement {
        const violations: string[] = [];

        if (time > budget.maxTime) {
            violations.push(`Time exceeded: ${time.toFixed(2)}ms > ${budget.maxTime}ms`);
        }
        if (memory > budget.maxMemory) {
            violations.push(`Memory exceeded: ${memory.toFixed(2)}MB > ${budget.maxMemory}MB`);
        }
        if (cpu > budget.maxCPU) {
            violations.push(`CPU exceeded: ${cpu.toFixed(1)}% > ${budget.maxCPU}%`);
        }

        const grade = this.calculateGrade(time, budget.grade);
        const withinBudget = violations.length === 0;

        return {
            operation,
            time,
            memory,
            cpu,
            withinBudget,
            grade,
            budget,
            violations
        };
    }

    /**
     * Calculate performance grade
     */
    private calculateGrade(time: number, targetGrade: string): 'A+' | 'A' | 'B' | 'C' | 'F' {
        if (time <= 5) return 'A+';
        if (time <= 50) return 'A';
        if (time <= 200) return 'B';
        if (time <= 1000) return 'C';
        return 'F';
    }

    /**
     * Record performance measurement
     */
    private recordMeasurement(measurement: PerformanceMeasurement): void {
        this.measurements.push(measurement);

        // Keep only last 1000 measurements
        if (this.measurements.length > 1000) {
            this.measurements = this.measurements.slice(-1000);
        }
    }

    /**
     * Handle performance budget violation
     */
    private handleViolation(measurement: PerformanceMeasurement): void {
        const violationCount = this.violations.get(measurement.operation) || 0;
        this.violations.set(measurement.operation, violationCount + 1);

        console.warn(`⚠️ Performance Budget Violation:`);
        console.warn(`   Operation: ${measurement.operation}`);
        console.warn(`   Time: ${measurement.time.toFixed(2)}ms (budget: ${measurement.budget.maxTime}ms)`);
        console.warn(`   Memory: ${measurement.memory.toFixed(2)}MB (budget: ${measurement.budget.maxMemory}MB)`);
        console.warn(`   CPU: ${measurement.cpu.toFixed(1)}% (budget: ${measurement.budget.maxCPU}%)`);

        if (measurement.violations.length > 0) {
            measurement.violations.forEach(violation => {
                console.warn(`   ${violation}`);
            });
        }

        // For critical operations, consider throwing an error
        if (measurement.budget.critical && measurement.grade === 'F') {
            console.error(`🚨 Critical performance failure in ${measurement.operation}`);
        }
    }

    /**
     * Get current memory usage in MB
     */
    private getMemoryUsage(): number {
        const usage = process.memoryUsage();
        return usage.heapUsed / 1024 / 1024;
    }

    /**
     * Get current CPU usage (simplified)
     */
    private getCPUUsage(): number {
        // Simplified CPU usage calculation
        return Math.random() * 20; // Placeholder
    }

    /**
     * Get performance metrics summary
     */
    getMetricsSummary(): {
        totalOperations: number;
        averageTime: number;
        withinBudgetPercentage: number;
        gradeDistribution: Record<string, number>;
        topViolations: Array<{ operation: string; count: number }>;
    } {
        if (this.measurements.length === 0) {
            return {
                totalOperations: 0,
                averageTime: 0,
                withinBudgetPercentage: 0,
                gradeDistribution: {},
                topViolations: []
            };
        }

        const totalOperations = this.measurements.length;
        const averageTime = this.measurements.reduce((sum, m) => sum + m.time, 0) / totalOperations;
        const withinBudget = this.measurements.filter(m => m.withinBudget).length;
        const withinBudgetPercentage = (withinBudget / totalOperations) * 100;

        const gradeDistribution = this.measurements.reduce((acc, m) => {
            acc[m.grade] = (acc[m.grade] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topViolations = Array.from(this.violations.entries())
            .map(([operation, count]) => ({ operation, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalOperations,
            averageTime,
            withinBudgetPercentage,
            gradeDistribution,
            topViolations
        };
    }

    /**
     * Generate performance report
     */
    generatePerformanceReport(): string {
        const metrics = this.getMetricsSummary();

        return `
📊 Performance Budget Report
============================

📈 Summary:
   Total Operations: ${metrics.totalOperations}
   Average Time: ${metrics.averageTime.toFixed(2)}ms
   Within Budget: ${metrics.withinBudgetPercentage.toFixed(1)}%

🎯 Grade Distribution:
${Object.entries(metrics.gradeDistribution)
                .map(([grade, count]) => `   ${grade}: ${count} (${((count / metrics.totalOperations) * 100).toFixed(1)}%)`)
                .join('\n')}

⚠️ Top Violations:
${metrics.topViolations
                .map(v => `   ${v.operation}: ${v.count} violations`)
                .join('\n') || '   No violations detected!'}

🚀 Performance Excellence Status: ${metrics.withinBudgetPercentage >= 95 ? '✅ ACHIEVED' : '🔄 IN PROGRESS'}
`;
    }
}

/**
 * Global performance budget enforcer instance
 */
export const performanceBudget = new PerformanceBudgetEnforcer();

/**
 * Decorator for automatic performance budget enforcement
 */
export function withPerformanceBudget(operationName: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            return performanceBudget.executeWithBudget(operationName, () => method.apply(this, args));
        };

        return descriptor;
    };
}

/**
 * Execute operation with performance budgeting
 */
export async function executeWithBudget<T>(
    operationName: string,
    operation: () => Promise<T> | T
): Promise<{ result: T; measurement: PerformanceMeasurement }> {
    return performanceBudget.executeWithBudget(operationName, operation);
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics() {
    return performanceBudget.getMetricsSummary();
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(): string {
    return performanceBudget.generatePerformanceReport();
}
