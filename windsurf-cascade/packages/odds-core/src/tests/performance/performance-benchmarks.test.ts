// Consolidated Performance Tests - Benchmarks
// Merged from multiple scattered performance test files

import { test, describe, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    OddsTickFactory,
    PerformanceDataFactory,
    TestScenarioFactory,
    WebSocketMessageFactory
} from "@testing/factories";

// Performance monitoring utilities
class PerformanceMonitor {
    private measurements: Array<{ name: string; duration: number; timestamp: number }> = [];

    startMeasurement(name: string): () => number {
        const startTime = performance.now();
        return () => {
            const duration = performance.now() - startTime;
            this.measurements.push({ name, duration, timestamp: Date.now() });
            return duration;
        };
    }

    getMeasurements(name?: string) {
        return name
            ? this.measurements.filter(m => m.name === name)
            : this.measurements;
    }

    getAverageDuration(name: string): number {
        const measurements = this.getMeasurements(name);
        if (measurements.length === 0) return 0;
        return measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
    }

    getThroughput(name: string, timeWindowMs: number = 1000): number {
        const measurements = this.getMeasurements(name);
        const now = Date.now();
        const recentMeasurements = measurements.filter(m => now - m.timestamp <= timeWindowMs);
        return recentMeasurements.length / (timeWindowMs / 1000);
    }

    reset() {
        this.measurements = [];
    }

    generateReport() {
        const grouped = this.measurements.reduce((acc, m) => {
            if (!acc[m.name]) acc[m.name] = [];
            acc[m.name].push(m.duration);
            return acc;
        }, {} as Record<string, number[]>);

        return Object.entries(grouped).map(([name, durations]) => ({
            name,
            samples: durations.length,
            average: durations.reduce((a, b) => a + b, 0) / durations.length,
            min: Math.min(...durations),
            max: Math.max(...durations),
            p95: this.percentile(durations, 0.95),
            p99: this.percentile(durations, 0.99)
        }));
    }

    private percentile(values: number[], p: number): number {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[Math.max(0, index)];
    }
}

// Mock performance-critical functions
function rapidHash(data: string): bigint {
    // Simple hash implementation for testing
    let hash = 0n;
    for (let i = 0; i < data.length; i++) {
        hash = (hash * 31n + BigInt(data.charCodeAt(i))) % 18446744073709551615n;
    }
    return hash;
}

function cleanInput(text: string): string {
    // Remove ANSI codes
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}

function processOddsTick(tick: any): any {
    // Simulate odds processing
    return {
        ...tick,
        processed: true,
        kellyFraction: Math.random() * 0.1,
        expectedValue: Math.random() * 50 - 25,
        processedAt: new Date().toISOString()
    };
}

describe("Performance Benchmarks", () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        monitor = new PerformanceMonitor();
    });

    describe("Hash Performance", () => {
        test("hashes large datasets efficiently", () => {
            const testData = Array.from({ length: 10000 }, (_, i) => `test-data-${i}-${Math.random()}`);

            const endMeasurement = monitor.startMeasurement("hash-large-dataset");

            const hashResults = testData.map(data => rapidHash(data));

            const duration = endMeasurement();

            expect(hashResults).toHaveLength(10000);
            expect(hashResults.every(h => typeof h === 'bigint')).toBe(true);
            expect(duration).toBeLessThan(100); // Should complete 10,000 hashes in under 100ms

            console.log(`🚀 Hashed 10,000 items in ${duration.toFixed(2)}ms`);
        });

        test("hash performance scales linearly", () => {
            const sizes = [1000, 5000, 10000, 20000];
            const durations: number[] = [];

            sizes.forEach(size => {
                const testData = Array.from({ length: size }, (_, i) => `test-data-${i}`);

                const endMeasurement = monitor.startMeasurement(`hash-${size}-items`);
                testData.forEach(data => rapidHash(data));
                const duration = endMeasurement();

                durations.push(duration);
            });

            // Performance should scale reasonably (not exponentially)
            expect(durations[3]).toBeLessThan(durations[0] * 25); // 20x data should take less than 25x time

            console.log(`📈 Hash scaling: ${sizes.map((size, i) => `${size}: ${durations[i].toFixed(2)}ms`).join(', ')}`);
        });

        test("concurrent hashing performance", () => {
            const concurrentBatches = 10;
            const batchSize = 1000;

            const endMeasurement = monitor.startMeasurement("concurrent-hashing");

            const promises = Array.from({ length: concurrentBatches }, () => {
                return new Promise<void>((resolve) => {
                    const batch = Array.from({ length: batchSize }, (_, i) => `batch-${Math.random()}-${i}`);
                    batch.forEach(data => rapidHash(data));
                    resolve();
                });
            });

            Promise.all(promises).then(() => {
                const duration = endMeasurement();
                expect(duration).toBeLessThan(200); // Should handle concurrent hashing efficiently

                console.log(`⚡ Concurrent hashing: ${concurrentBatches} batches of ${batchSize} in ${duration.toFixed(2)}ms`);
            });
        });
    });

    describe("Data Processing Performance", () => {
        test("processes odds ticks efficiently", () => {
            const oddsTicks = PerformanceDataFactory.createLargeDataset(50000);

            const endMeasurement = monitor.startMeasurement("process-odds-ticks");

            const processedTicks = oddsTicks.map(tick => processOddsTick(tick));

            const duration = endMeasurement();

            expect(processedTicks).toHaveLength(50000);
            expect(processedTicks.every(t => t.processed)).toBe(true);
            expect(duration).toBeLessThan(200); // Should process 50k ticks in under 200ms

            console.log(`📊 Processed 50,000 odds ticks in ${duration.toFixed(2)}ms`);
        });

        test("real-time data processing under load", () => {
            const messageRate = 1000; // messages per second
            const testDuration = 5000; // 5 seconds
            const totalMessages = (messageRate * testDuration) / 1000;

            const messages = Array.from({ length: totalMessages }, () =>
                WebSocketMessageFactory.createOddsUpdate(OddsTickFactory.create())
            );

            const endMeasurement = monitor.startMeasurement("realtime-processing");

            let processedCount = 0;
            messages.forEach(message => {
                processOddsTick(message.data);
                processedCount++;
            });

            const duration = endMeasurement();
            const actualRate = processedCount / (duration / 1000);

            expect(processedCount).toBe(totalMessages);
            expect(actualRate).toBeGreaterThan(messageRate * 0.8); // Should handle at least 80% of target rate

            console.log(`🔄 Real-time processing: ${actualRate.toFixed(0)} messages/sec (target: ${messageRate})`);
        });

        test("memory-efficient processing of large datasets", () => {
            const initialMemory = process.memoryUsage();

            const largeDataset = PerformanceDataFactory.createLargeDataset(100000);

            const endMeasurement = monitor.startMeasurement("memory-efficient-processing");

            // Process in chunks to test memory efficiency
            const chunkSize = 10000;
            for (let i = 0; i < largeDataset.length; i += chunkSize) {
                const chunk = largeDataset.slice(i, i + chunkSize);
                chunk.forEach(tick => processOddsTick(tick));

                // Simulate garbage collection
                if (i % (chunkSize * 5) === 0) {
                    if (global.gc) global.gc();
                }
            }

            const duration = endMeasurement();
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

            expect(duration).toBeLessThan(500);
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase

            console.log(`🧠 Memory efficient: ${duration.toFixed(2)}ms, +${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        });
    });

    describe("WebSocket Performance", () => {
        test("high-frequency message broadcasting", () => {
            const clientCount = 100;
            const messageCount = 1000;

            // Mock clients
            const clients = Array.from({ length: clientCount }, () => ({
                messages: [] as string[],
                send: (message: string) => {
                    clients[0].messages.push(message); // Only track on first client for performance
                }
            }));

            const messages = Array.from({ length: messageCount }, () =>
                WebSocketMessageFactory.create()
            );

            const endMeasurement = monitor.startMeasurement("websocket-broadcast");

            messages.forEach(message => {
                clients.forEach(client => client.send(JSON.stringify(message)));
            });

            const duration = endMeasurement();
            const totalMessages = clientCount * messageCount;
            const throughput = totalMessages / (duration / 1000);

            expect(clients[0].messages).toHaveLength(messageCount);
            expect(throughput).toBeGreaterThan(10000); // At least 10k messages/sec

            console.log(`📡 WebSocket broadcast: ${throughput.toFixed(0)} messages/sec`);
        });

        test("message serialization performance", () => {
            const messages = WebSocketMessageFactory.createBatch(10000);

            const endMeasurement = monitor.startMeasurement("message-serialization");

            const serializedMessages = messages.map(msg => JSON.stringify(msg));

            const duration = endMeasurement();

            expect(serializedMessages).toHaveLength(10000);
            expect(duration).toBeLessThan(100); // Should serialize 10k messages in under 100ms

            console.log(`📝 Serialized 10,000 messages in ${duration.toFixed(2)}ms`);
        });

        test("message deserialization performance", () => {
            const serializedMessages = Array.from({ length: 10000 }, () =>
                JSON.stringify(WebSocketMessageFactory.create())
            );

            const endMeasurement = monitor.startMeasurement("message-deserialization");

            const deserializedMessages = serializedMessages.map(msg => JSON.parse(msg));

            const duration = endMeasurement();

            expect(deserializedMessages).toHaveLength(10000);
            expect(duration).toBeLessThan(150); // Should deserialize 10k messages in under 150ms

            console.log(`📖 Deserialized 10,000 messages in ${duration.toFixed(2)}ms`);
        });
    });

    describe("Stress Testing", () => {
        test("handles sustained high load", () => {
            const duration = 10000; // 10 seconds
            const targetOpsPerSec = 50000;

            const endMeasurement = monitor.startMeasurement("sustained-load");

            const startTime = Date.now();
            let operations = 0;

            while (Date.now() - startTime < duration) {
                // Mixed operations
                rapidHash(`stress-test-${operations}`);
                cleanInput(`\x1b[31mtest-${operations}\x1b[0m`);
                processOddsTick(OddsTickFactory.create());
                operations++;
            }

            const actualDuration = endMeasurement();
            const actualOpsPerSec = operations / (actualDuration / 1000);

            expect(actualOpsPerSec).toBeGreaterThan(targetOpsPerSec * 0.8); // At least 80% of target

            console.log(`🔥 Sustained load: ${actualOpsPerSec.toFixed(0)} ops/sec (target: ${targetOpsPerSec})`);
        });

        test("maintains performance under memory pressure", () => {
            // Apply memory pressure
            const memoryHog = Array.from({ length: 100 }, () =>
                new Array(100000).fill(null).map(() => ({ data: "x".repeat(1000) }))
            );

            const endMeasurement = monitor.startMeasurement("performance-under-pressure");

            // Test performance under pressure
            for (let i = 0; i < 10000; i++) {
                rapidHash(`pressure-test-${i}`);
                processOddsTick(OddsTickFactory.create());
            }

            const duration = endMeasurement();

            // Cleanup
            memoryHog.forEach(arr => arr.length = 0);

            expect(duration).toBeLessThan(300); // Should still perform reasonably under pressure

            console.log(`🏋️ Performance under pressure: ${duration.toFixed(2)}ms`);
        });

        test("concurrent operations performance", () => {
            const concurrentTasks = 10;
            const operationsPerTask = 1000;

            const endMeasurement = monitor.startMeasurement("concurrent-operations");

            const tasks = Array.from({ length: concurrentTasks }, (_, taskIndex) => {
                return new Promise<void>((resolve) => {
                    for (let i = 0; i < operationsPerTask; i++) {
                        rapidHash(`concurrent-${taskIndex}-${i}`);
                        processOddsTick(OddsTickFactory.create());
                    }
                    resolve();
                });
            });

            Promise.all(tasks).then(() => {
                const duration = endMeasurement();
                const totalOperations = concurrentTasks * operationsPerTask;
                const throughput = totalOperations / (duration / 1000);

                expect(throughput).toBeGreaterThan(20000); // At least 20k ops/sec concurrent

                console.log(`🚀 Concurrent operations: ${throughput.toFixed(0)} ops/sec`);
            });
        });
    });

    describe("Performance Regression Detection", () => {
        test("performance benchmarks meet minimum standards", () => {
            const benchmarks = [
                { name: "hash-1000", minOpsPerSec: 100000 },
                { name: "process-1000-ticks", minOpsPerSec: 50000 },
                { name: "serialize-1000-messages", minOpsPerSec: 100000 },
                { name: "deserialize-1000-messages", minOpsPerSec: 80000 }
            ];

            const results = [];

            for (const benchmark of benchmarks) {
                const endMeasurement = monitor.startMeasurement(benchmark.name);

                // Run benchmark based on name
                if (benchmark.name.includes("hash")) {
                    for (let i = 0; i < 1000; i++) rapidHash(`benchmark-${i}`);
                } else if (benchmark.name.includes("process")) {
                    for (let i = 0; i < 1000; i++) processOddsTick(OddsTickFactory.create());
                } else if (benchmark.name.includes("serialize")) {
                    for (let i = 0; i < 1000; i++) JSON.stringify(WebSocketMessageFactory.create());
                } else if (benchmark.name.includes("deserialize")) {
                    const messages = Array.from({ length: 1000 }, () => JSON.stringify(WebSocketMessageFactory.create()));
                    messages.forEach(msg => JSON.parse(msg));
                }

                const duration = endMeasurement();
                const opsPerSec = 1000 / (duration / 1000);

                results.push({ name: benchmark.name, opsPerSec, passed: opsPerSec >= benchmark.minOpsPerSec });

                expect(opsPerSec).toBeGreaterThanOrEqual(benchmark.minOpsPerSec);
            }

            console.log(`📊 Benchmark Results:`);
            results.forEach(result => {
                console.log(`  ${result.name}: ${result.opsPerSec.toFixed(0)} ops/sec ${result.passed ? '✅' : '❌'}`);
            });
        });

        test("performance report generation", () => {
            // Run various operations to generate data
            for (let i = 0; i < 100; i++) {
                const endHash = monitor.startMeasurement("hash-operation");
                rapidHash(`report-${i}`);
                endHash();

                const endProcess = monitor.startMeasurement("process-operation");
                processOddsTick(OddsTickFactory.create());
                endProcess();
            }

            const report = monitor.generateReport();

            expect(report).toHaveLength(2);
            expect(report[0].name).toBe("hash-operation");
            expect(report[1].name).toBe("process-operation");

            report.forEach(metric => {
                expect(metric.samples).toBe(100);
                expect(metric.average).toBeGreaterThan(0);
                expect(metric.min).toBeLessThanOrEqual(metric.average);
                expect(metric.max).toBeGreaterThanOrEqual(metric.average);
                expect(metric.p95).toBeLessThan(metric.max);
                expect(metric.p99).toBeLessThan(metric.max);
            });

            console.log(`📈 Performance Report:`);
            report.forEach(metric => {
                console.log(`  ${metric.name}: avg=${metric.average.toFixed(2)}ms, p95=${metric.p95.toFixed(2)}ms, p99=${metric.p99.toFixed(2)}ms`);
            });
        });
    });
});
