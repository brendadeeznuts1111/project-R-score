// WebSocket Performance Tests
// Comprehensive performance testing for WebSocket server

import { test, describe, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { WebSocket } from "ws";
import {
    OddsTickFactory,
    WebSocketMessageFactory,
    PerformanceDataFactory,
    PerformanceHelper,
    MemoryHelper,
    TestScenarioFactory
} from "@testing/factories";
import { BunV13WebSocketServer } from "../server-v13-enhanced";

describe("WebSocket Performance Tests", () => {
    let server: BunV13WebSocketServer;
    let serverUrl: string;
    let perfHelper: PerformanceHelper;
    let memHelper: MemoryHelper;

    beforeAll(async () => {
        server = new BunV13WebSocketServer({
            port: 0,
            maxConnections: 200,
            enableCompression: true,
            heartbeatInterval: 1000
        });

        await server.start();
        serverUrl = `ws://localhost:${server.getPort()}`;

        perfHelper = new PerformanceHelper();
        memHelper = new MemoryHelper();
    });

    afterAll(async () => {
        if (server) {
            await server.stop();
        }
    });

    beforeEach(() => {
        perfHelper.reset();
        memHelper = new MemoryHelper();
    });

    describe("Message Processing Performance", () => {
        test("processes high-volume messages efficiently", async () => {
            const messageCount = 10000;
            const messages = Array.from({ length: messageCount }, () =>
                WebSocketMessageFactory.createOddsUpdate(OddsTickFactory.create())
            );

            const endTimer = perfHelper.startTimer('high-volume-processing');

            // Process messages through server
            messages.forEach(message => {
                server.processMessage(message);
            });

            const duration = endTimer();
            const throughput = messageCount / (duration / 1000);

            expect(throughput).toBeGreaterThan(50000); // At least 50k messages/sec
            expect(duration).toBeLessThan(1000); // Should complete in under 1 second

            const metrics = server.getPerformanceMetrics();
            expect(metrics.averageProcessingTime).toBeLessThan(0.1); // Sub-millisecond average

            console.log(`🚀 Processed ${messageCount} messages in ${duration.toFixed(2)}ms (${throughput.toFixed(0)} msg/sec)`);
        });

        test("handles large message payloads efficiently", async () => {
            const largeDataset = PerformanceDataFactory.createLargeDataset(1000);
            const largeMessages = largeDataset.map(odds =>
                WebSocketMessageFactory.createOddsUpdate(odds)
            );

            const endTimer = perfHelper.startTimer('large-payload-processing');

            largeMessages.forEach(message => {
                server.processMessage(message);
            });

            const duration = endTimer();
            const avgMessageSize = JSON.stringify(largeMessages[0]).length;

            expect(duration).toBeLessThan(2000); // Should handle large payloads in under 2 seconds

            const throughput = (largeMessages.length * avgMessageSize) / (duration / 1000);
            expect(throughput).toBeGreaterThan(100000); // At least 100KB/sec processing

            console.log(`📊 Processed ${largeMessages.length} large messages (${avgMessageSize} bytes each) in ${duration.toFixed(2)}ms`);
        });

        test("maintains performance under sustained load", async () => {
            const duration = 10000; // 10 seconds
            const targetRate = 1000; // 1000 messages per second
            const totalMessages = (duration * targetRate) / 1000;

            const endTimer = perfHelper.startTimer('sustained-load');
            const startTime = Date.now();
            let processedCount = 0;

            // Generate sustained load
            while (Date.now() - startTime < duration) {
                const batch = Array.from({ length: 10 }, () =>
                    WebSocketMessageFactory.createOddsUpdate(OddsTickFactory.create())
                );

                batch.forEach(message => {
                    server.processMessage(message);
                    processedCount++;
                });

                // Small delay to simulate realistic timing
                await new Promise(resolve => setTimeout(resolve, 5));
            }

            const actualDuration = endTimer();
            const actualRate = processedCount / (actualDuration / 1000);

            expect(actualRate).toBeGreaterThan(targetRate * 0.8); // At least 80% of target rate
            expect(processedCount).toBeGreaterThan(totalMessages * 0.8);

            console.log(`🔥 Sustained load: ${actualRate.toFixed(0)} msg/sec for ${actualDuration.toFixed(0)}ms`);
        });
    });

    describe("Broadcast Performance", () => {
        test("broadcasts to many clients efficiently", async () => {
            const clientCount = 100;
            const messageCount = 1000;
            const clients: any[] = [];

            // Create mock clients for performance testing
            const mockClients = Array.from({ length: clientCount }, () => ({
                sentMessages: [] as string[],
                send: (message: string) => {
                    mockClients[0].sentMessages.push(message); // Track on first client only
                },
                readyState: WebSocket.OPEN
            }));

            // Add clients to server
            mockClients.forEach((client, index) => {
                server.handleConnection(client as any, { id: `client-${index}` });
            });

            expect(server.getClientCount()).toBe(clientCount);

            const endTimer = perfHelper.startTimer('broadcast-performance');

            // Broadcast messages
            for (let i = 0; i < messageCount; i++) {
                const message = WebSocketMessageFactory.create({
                    type: 'broadcast-test',
                    data: { messageIndex: i }
                });
                server.broadcast(message);
            }

            const duration = endTimer();
            const totalBroadcasts = clientCount * messageCount;
            const broadcastThroughput = totalBroadcasts / (duration / 1000);

            expect(broadcastThroughput).toBeGreaterThan(50000); // At least 50k broadcasts/sec
            expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

            expect(mockClients[0].sentMessages).toHaveLength(messageCount);

            console.log(`📡 Broadcasted ${totalBroadcasts} messages to ${clientCount} clients in ${duration.toFixed(2)}ms (${broadcastThroughput.toFixed(0)} broadcasts/sec)`);
        });

        test("handles targeted message sending efficiently", async () => {
            const clientCount = 50;
            const messagesPerClient = 100;

            // Create mock clients
            const mockClients = Array.from({ length: clientCount }, (_, index) => ({
                id: `client-${index}`,
                sentMessages: [] as string[],
                send: (message: string) => {
                    mockClients[index].sentMessages.push(message);
                },
                readyState: WebSocket.OPEN
            }));

            mockClients.forEach(client => {
                server.handleConnection(client as any, { id: client.id });
            });

            const endTimer = perfHelper.startTimer('targeted-messaging');

            // Send targeted messages
            for (let clientIndex = 0; clientIndex < clientCount; clientIndex++) {
                for (let messageIndex = 0; messageIndex < messagesPerClient; messageIndex++) {
                    const message = WebSocketMessageFactory.create({
                        type: 'targeted-message',
                        data: { clientIndex, messageIndex }
                    });

                    server.sendToClient(`client-${clientIndex}`, message);
                }
            }

            const duration = endTimer();
            const totalMessages = clientCount * messagesPerClient;
            const throughput = totalMessages / (duration / 1000);

            expect(throughput).toBeGreaterThan(10000); // At least 10k targeted messages/sec
            expect(duration).toBeLessThan(3000); // Should complete in under 3 seconds

            // Verify each client received correct number of messages
            mockClients.forEach(client => {
                expect(client.sentMessages).toHaveLength(messagesPerClient);
            });

            console.log(`🎯 Sent ${totalMessages} targeted messages in ${duration.toFixed(2)}ms (${throughput.toFixed(0)} msg/sec)`);
        });
    });

    describe("Connection Management Performance", () => {
        test("handles rapid connection/disconnection cycles", async () => {
            const cycleCount = 1000;
            const concurrentClients = 50;

            const endTimer = perfHelper.startTimer('connection-cycles');

            for (let cycle = 0; cycle < cycleCount; cycle++) {
                // Connect clients
                const mockClients = Array.from({ length: concurrentClients }, (_, index) => ({
                    id: `cycle-${cycle}-client-${index}`,
                    send: () => { },
                    readyState: WebSocket.OPEN
                }));

                mockClients.forEach(client => {
                    server.handleConnection(client as any, { id: client.id });
                });

                expect(server.getClientCount()).toBe(concurrentClients);

                // Disconnect all clients
                mockClients.forEach(client => {
                    server.handleDisconnection(client as any);
                });

                expect(server.getClientCount()).toBe(0);
            }

            const duration = endTimer();
            const cyclesPerSecond = cycleCount / (duration / 1000);

            expect(cyclesPerSecond).toBeGreaterThan(100); // At least 100 cycles/sec
            expect(duration).toBeLessThan(15000); // Should complete in under 15 seconds

            console.log(`🔄 Completed ${cycleCount} connection cycles in ${duration.toFixed(2)}ms (${cyclesPerSecond.toFixed(0)} cycles/sec)`);
        });

        test("manages large numbers of concurrent connections", async () => {
            const targetConnections = 150;
            const mockClients = Array.from({ length: targetConnections }, (_, index) => ({
                id: `perf-client-${index}`,
                send: () => { },
                readyState: WebSocket.OPEN,
                lastPing: Date.now()
            }));

            const endTimer = perfHelper.startTimer('connection-scaling');

            // Add connections incrementally
            for (let i = 0; i < mockClients.length; i++) {
                server.handleConnection(mockClients[i] as any, { id: mockClients[i].id });

                // Verify connection count
                expect(server.getClientCount()).toBe(i + 1);
            }

            const connectionDuration = endTimer();

            // Test memory usage with many connections
            const memoryAfterConnections = memHelper.getCurrentMemory();
            const memoryIncrease = memoryAfterConnections.heapUsed - memHelper.getMemoryIncrease().heapUsed;

            expect(connectionDuration).toBeLessThan(1000); // Should connect all clients in under 1 second
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB for 150 connections

            // Test broadcasting with many connections
            const broadcastEndTimer = perfHelper.startTimer('broadcast-to-many');

            const testMessage = WebSocketMessageFactory.create({
                type: 'mass-broadcast',
                data: { connectionCount: targetConnections }
            });

            server.broadcast(testMessage);

            const broadcastDuration = broadcastEndTimer();

            expect(broadcastDuration).toBeLessThan(100); // Should broadcast to 150 clients in under 100ms

            console.log(`👥 Managed ${targetConnections} connections: ${connectionDuration.toFixed(2)}ms setup, ${broadcastDuration.toFixed(2)}ms broadcast`);
        });
    });

    describe("Memory Performance", () => {
        test("maintains stable memory usage under load", async () => {
            const initialMemory = memHelper.getCurrentMemory();

            // Generate high load
            const messageCount = 50000;
            const messages = Array.from({ length: messageCount }, () =>
                WebSocketMessageFactory.createOddsUpdate(OddsTickFactory.create())
            );

            messages.forEach(message => server.processMessage(message));

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const finalMemory = memHelper.getCurrentMemory();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const increaseMB = memoryIncrease / 1024 / 1024;

            expect(increaseMB).toBeLessThan(100); // Less than 100MB increase for 50k messages

            console.log(`🧠 Memory usage: +${increaseMB.toFixed(2)}MB for ${messageCount} messages`);
        });

        test("efficiently handles large message payloads", async () => {
            const initialMemory = memHelper.getCurrentMemory();

            // Create messages with large payloads
            const largeMessages = Array.from({ length: 1000 }, () => {
                const largeOdds = OddsTickFactory.create();
                // Add large additional data
                (largeOdds as any).largeData = "x".repeat(10000); // 10KB per message
                return WebSocketMessageFactory.createOddsUpdate(largeOdds);
            });

            largeMessages.forEach(message => server.processMessage(message));

            if (global.gc) {
                global.gc();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const finalMemory = memHelper.getCurrentMemory();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const increaseMB = memoryIncrease / 1024 / 1024;

            // Should handle 10MB of message data with reasonable memory overhead
            expect(increaseMB).toBeLessThan(50); // Less than 50MB overhead for 10MB of data

            console.log(`📦 Large payload memory: +${increaseMB.toFixed(2)}MB for ~10MB of message data`);
        });

        test("cleans up resources after client disconnection", async () => {
            const initialMemory = memHelper.getCurrentMemory();

            // Create and connect many clients
            const clientCount = 100;
            const mockClients = Array.from({ length: clientCount }, (_, index) => ({
                id: `memory-test-client-${index}`,
                send: () => { },
                readyState: WebSocket.OPEN,
                data: new Array(1000).fill(null).map(() => ({ clientData: "x".repeat(100) }))
            }));

            mockClients.forEach(client => {
                server.handleConnection(client as any, { id: client.id });
            });

            const memoryWithClients = memHelper.getCurrentMemory();
            const memoryWithClientsIncrease = memoryWithClients.heapUsed - initialMemory.heapUsed;

            // Disconnect all clients
            mockClients.forEach(client => {
                server.handleDisconnection(client as any);
            });

            if (global.gc) {
                global.gc();
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            const finalMemory = memHelper.getCurrentMemory();
            const memoryAfterCleanup = finalMemory.heapUsed - initialMemory.heapUsed;

            // Most memory should be cleaned up
            const cleanupEfficiency = 1 - (memoryAfterCleanup / memoryWithClientsIncrease);
            expect(cleanupEfficiency).toBeGreaterThan(0.8); // At least 80% cleanup

            console.log(`🧹 Memory cleanup: ${cleanupEfficiency.toFixed(1)}% efficiency (${(memoryWithClientsIncrease / 1024 / 1024).toFixed(2)}MB -> ${(memoryAfterCleanup / 1024 / 1024).toFixed(2)}MB)`);
        });
    });

    describe("Stress Testing", () => {
        test("handles extreme message volume without degradation", async () => {
            const extremeMessageCount = 100000;
            const batchSize = 1000;
            const batches = extremeMessageCount / batchSize;

            const endTimer = perfHelper.startTimer('extreme-volume');
            const batchTimes: number[] = [];

            for (let batch = 0; batch < batches; batch++) {
                const batchStart = performance.now();

                const batchMessages = Array.from({ length: batchSize }, () =>
                    WebSocketMessageFactory.createOddsUpdate(OddsTickFactory.create())
                );

                batchMessages.forEach(message => server.processMessage(message));

                const batchDuration = performance.now() - batchStart;
                batchTimes.push(batchDuration);
            }

            const totalDuration = endTimer();
            const avgBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length;
            const maxBatchTime = Math.max(...batchTimes);

            // Performance should not degrade significantly
            const degradationFactor = maxBatchTime / avgBatchTime;
            expect(degradationFactor).toBeLessThan(3); // Worst batch should be less than 3x average

            expect(totalDuration).toBeLessThan(10000); // Should complete in under 10 seconds

            console.log(`🔥 Extreme volume: ${extremeMessageCount} messages in ${totalDuration.toFixed(2)}ms (avg batch: ${avgBatchTime.toFixed(2)}ms, max: ${maxBatchTime.toFixed(2)}ms)`);
        });

        test("maintains performance under memory pressure", async () => {
            // Apply memory pressure
            const memoryHog = Array.from({ length: 100 }, () =>
                new Array(50000).fill(null).map(() => ({ pressure: "x".repeat(1000) }))
            );

            const endTimer = perfHelper.startTimer('performance-under-pressure');

            // Test performance while under memory pressure
            const messageCount = 10000;
            const messages = Array.from({ length: messageCount }, () =>
                WebSocketMessageFactory.createOddsUpdate(OddsTickFactory.create())
            );

            messages.forEach(message => server.processMessage(message));

            const duration = endTimer();

            // Cleanup memory pressure
            memoryHog.forEach(arr => arr.length = 0);
            if (global.gc) {
                global.gc();
            }

            expect(duration).toBeLessThan(3000); // Should still perform reasonably under pressure

            console.log(`🏋️ Performance under pressure: ${duration.toFixed(2)}ms for ${messageCount} messages`);
        });

        test("handles concurrent operations efficiently", async () => {
            const concurrentTasks = 20;
            const operationsPerTask = 1000;

            const endTimer = perfHelper.startTimer('concurrent-operations');

            const tasks = Array.from({ length: concurrentTasks }, (_, taskIndex) => {
                return new Promise<void>((resolve) => {
                    const taskMessages = Array.from({ length: operationsPerTask }, (_, opIndex) =>
                        WebSocketMessageFactory.create({
                            type: 'concurrent-test',
                            data: { taskIndex, opIndex }
                        })
                    );

                    taskMessages.forEach(message => {
                        server.processMessage(message);
                    });

                    resolve();
                });
            });

            await Promise.all(tasks);
            const duration = endTimer();

            const totalOperations = concurrentTasks * operationsPerTask;
            const throughput = totalOperations / (duration / 1000);

            expect(throughput).toBeGreaterThan(30000); // At least 30k ops/sec concurrent

            console.log(`⚡ Concurrent operations: ${throughput.toFixed(0)} ops/sec (${totalOperations} total operations)`);
        });
    });

    describe("Performance Regression Detection", () => {
        test("meets minimum performance benchmarks", () => {
            const benchmarks = [
                { name: 'message-processing', minOpsPerSec: 50000 },
                { name: 'broadcast-throughput', minOpsPerSec: 50000 },
                { name: 'connection-handling', minOpsPerSec: 100 },
                { name: 'targeted-messaging', minOpsPerSec: 10000 }
            ];

            const results = [];

            // Message processing benchmark
            const messageEndTimer = perfHelper.startTimer('benchmark-message-processing');
            for (let i = 0; i < 1000; i++) {
                server.processMessage(WebSocketMessageFactory.createOddsUpdate(OddsTickFactory.create()));
            }
            const messageDuration = messageEndTimer();
            const messageOpsPerSec = 1000 / (messageDuration / 1000);
            results.push({ name: 'message-processing', opsPerSec: messageOpsPerSec });

            // Connection handling benchmark
            const connectionEndTimer = perfHelper.startTimer('benchmark-connection-handling');
            for (let i = 0; i < 100; i++) {
                const mockClient = { id: `benchmark-${i}`, send: () => { }, readyState: 1 };
                server.handleConnection(mockClient as any, { id: mockClient.id });
                server.handleDisconnection(mockClient as any);
            }
            const connectionDuration = connectionEndTimer();
            const connectionOpsPerSec = 100 / (connectionDuration / 1000);
            results.push({ name: 'connection-handling', opsPerSec: connectionOpsPerSec });

            results.forEach(result => {
                const benchmark = benchmarks.find(b => b.name === result.name);
                if (benchmark) {
                    expect(result.opsPerSec).toBeGreaterThan(benchmark.minOpsPerSec);
                }
            });

            console.log(`📊 Performance Benchmarks:`);
            results.forEach(result => {
                const benchmark = benchmarks.find(b => b.name === result.name);
                const status = result.opsPerSec >= benchmark?.minOpsPerSec ? '✅' : '❌';
                console.log(`  ${result.name}: ${result.opsPerSec.toFixed(0)} ops/sec ${status}`);
            });
        });

        test("generates detailed performance report", () => {
            // Run various operations to generate metrics
            for (let i = 0; i < 1000; i++) {
                server.processMessage(WebSocketMessageFactory.createOddsUpdate(OddsTickFactory.create()));
            }

            const report = server.getPerformanceReport();

            expect(report).toBeDefined();
            expect(report.totalMessagesProcessed).toBe(1000);
            expect(report.averageProcessingTime).toBeGreaterThan(0);
            expect(report.peakMemoryUsage).toBeGreaterThan(0);
            expect(report.connectionMetrics).toBeDefined();
            expect(report.performanceAlerts).toBeDefined();

            console.log(`📈 Performance Report:`);
            console.log(`  Messages processed: ${report.totalMessagesProcessed}`);
            console.log(`  Avg processing time: ${report.averageProcessingTime.toFixed(3)}ms`);
            console.log(`  Throughput: ${report.messagesPerSecond.toFixed(0)} msg/sec`);
            console.log(`  Peak memory: ${(report.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
        });
    });
});
