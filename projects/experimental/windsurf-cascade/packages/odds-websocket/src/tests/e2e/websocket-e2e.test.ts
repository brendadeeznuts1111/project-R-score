// WebSocket End-to-End Tests
// Complete workflow testing from client connection to data processing

import { test, describe, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { WebSocket } from "ws";
import {
    OddsTickFactory,
    WebSocketMessageFactory,
    TestScenarioFactory,
    MockAPIClient,
    PerformanceHelper,
    DomainAssertions,
    AsyncHelper
} from "@testing/factories";
import { BunV13WebSocketServer } from "../server-v13-enhanced";

describe("WebSocket End-to-End Tests", () => {
    let server: BunV13WebSocketServer;
    let serverUrl: string;
    let apiClient: MockAPIClient;
    let perfHelper: PerformanceHelper;

    beforeAll(async () => {
        // Start WebSocket server with production-like configuration
        server = new BunV13WebSocketServer({
            port: 0,
            maxConnections: 100,
            enableCompression: true,
            heartbeatInterval: 30000,
            enableMetrics: true,
            enableLogging: false // Disable logging for cleaner test output
        });

        await server.start();
        serverUrl = `ws://localhost:${server.getPort()}`;

        // Setup API client with realistic responses
        apiClient = new MockAPIClient();

        // Setup comprehensive mock responses
        apiClient.setResponse('/api/odds?sport=basketball', {
            status: 200,
            data: OddsTickFactory.createBatch(25, { sport: 'basketball' }),
            pagination: { page: 1, total: 500, limit: 25 }
        });

        apiClient.setResponse('/api/odds?sport=football', {
            status: 200,
            data: OddsTickFactory.createBatch(20, { sport: 'football' }),
            pagination: { page: 1, total: 300, limit: 20 }
        });

        apiClient.setResponse('/api/arbitrage/opportunities', {
            status: 200,
            data: [
                OddsTickFactory.createArbitrageOpportunity(),
                OddsTickFactory.createArbitrageOpportunity()
            ]
        });

        apiClient.setResponse('/api/health', {
            status: 200,
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                uptime: 3600
            }
        });

        perfHelper = new PerformanceHelper();
    });

    afterAll(async () => {
        if (server) {
            await server.stop();
        }
    });

    beforeEach(() => {
        perfHelper.reset();
        server.clearProcessedMessages();
        apiClient.clearHistory();
    });

    describe("Complete Trading Workflow", () => {
        test("full arbitrage detection and alert workflow", async () => {
            const endTimer = perfHelper.startTimer('full-arbitrage-workflow');

            // 1. Client connects to WebSocket
            const tradingClient = new WebSocket(serverUrl);
            let workflowComplete = false;
            const receivedMessages: any[] = [];

            await new Promise<void>((resolve, reject) => {
                tradingClient.on('open', () => {
                    console.log('📡 Trading client connected');

                    tradingClient.on('message', (data) => {
                        const message = JSON.parse(data.toString());
                        receivedMessages.push(message);

                        // Check if workflow is complete
                        if (message.type === 'arbitrage-alert' && receivedMessages.length >= 3) {
                            workflowComplete = true;
                            resolve();
                        }
                    });

                    // 2. Fetch odds data from API
                    setTimeout(async () => {
                        try {
                            const oddsResponse = await apiClient.get('/api/odds?sport=basketball');
                            expect(oddsResponse.status).toBe(200);
                            expect(oddsResponse.data.length).toBe(25);

                            // 3. Send initial odds updates via WebSocket
                            oddsResponse.data.slice(0, 5).forEach((odds: any, index: number) => {
                                setTimeout(() => {
                                    const oddsMessage = WebSocketMessageFactory.createOddsUpdate(odds);
                                    server.broadcast(oddsMessage);
                                }, index * 50);
                            });

                            // 4. Detect arbitrage opportunities
                            setTimeout(async () => {
                                const arbitrageResponse = await apiClient.get('/api/arbitrage/opportunities');
                                expect(arbitrageResponse.status).toBe(200);
                                expect(arbitrageResponse.data.length).toBe(2);

                                // 5. Broadcast arbitrage alerts
                                arbitrageResponse.data.forEach((opportunity: any, index: number) => {
                                    setTimeout(() => {
                                        const alertMessage = WebSocketMessageFactory.create({
                                            type: 'arbitrage-alert',
                                            data: {
                                                ...opportunity,
                                                detectedAt: new Date().toISOString(),
                                                confidence: 0.95
                                            }
                                        });
                                        server.broadcast(alertMessage);
                                    }, index * 100);
                                });

                                // 6. Send market status update
                                setTimeout(() => {
                                    const statusMessage = WebSocketMessageFactory.create({
                                        type: 'market-status',
                                        data: {
                                            status: 'active',
                                            opportunities: arbitrageResponse.data.length,
                                            timestamp: new Date().toISOString()
                                        }
                                    });
                                    server.broadcast(statusMessage);
                                }, 500);

                            }, 1000);

                        } catch (error) {
                            reject(error);
                        }
                    }, 100);
                });

                tradingClient.on('error', reject);
                setTimeout(() => reject(new Error('Workflow timeout')), 10000);
            });

            const duration = endTimer();

            // Verify complete workflow
            expect(workflowComplete).toBe(true);
            expect(receivedMessages.length).toBeGreaterThanOrEqual(3);

            // Verify message types and content
            const oddsUpdates = receivedMessages.filter(m => m.type === 'odds-update');
            const arbitrageAlerts = receivedMessages.filter(m => m.type === 'arbitrage-alert');
            const marketStatus = receivedMessages.find(m => m.type === 'market-status');

            expect(oddsUpdates.length).toBe(5);
            expect(arbitrageAlerts.length).toBe(2);
            expect(marketStatus).toBeDefined();
            expect(marketStatus.data.status).toBe('active');
            expect(marketStatus.data.opportunities).toBe(2);

            // Validate arbitrage alerts
            arbitrageAlerts.forEach(alert => {
                DomainAssertions.assertValidArbitrageOpportunity(alert.data);
                expect(alert.data.detectedAt).toBeDefined();
                expect(alert.data.confidence).toBe(0.95);
            });

            // Performance validation
            expect(duration).toBeLessThan(8000); // Should complete in under 8 seconds

            console.log(`🎯 Full arbitrage workflow completed in ${duration.toFixed(2)}ms`);

            tradingClient.close();
        });

        test("real-time odds streaming with multiple clients", async () => {
            const clientCount = 5;
            const streamDuration = 5000; // 5 seconds
            const messageInterval = 100; // Every 100ms

            const clients: any[] = [];
            const clientMessages: Record<number, any[]> = {};

            // Setup multiple clients
            for (let i = 0; i < clientCount; i++) {
                const client = new WebSocket(serverUrl);
                clients.push(client);
                clientMessages[i] = [];

                await new Promise<void>((resolve, reject) => {
                    client.on('open', () => {
                        client.on('message', (data) => {
                            clientMessages[i].push(JSON.parse(data.toString()));
                        });
                        resolve();
                    });

                    client.on('error', reject);
                    setTimeout(() => reject(new Error('Client connection timeout')), 3000);
                });
            }

            expect(server.getClientCount()).toBe(clientCount);

            // Start streaming
            const streamStart = Date.now();
            let messageCount = 0;

            const streamInterval = setInterval(() => {
                if (Date.now() - streamStart >= streamDuration) {
                    clearInterval(streamInterval);
                    return;
                }

                const oddsUpdate = WebSocketMessageFactory.createOddsUpdate(
                    OddsTickFactory.create({
                        id: `stream-${messageCount}`,
                        timestamp: new Date().toISOString()
                    })
                );

                server.broadcast(oddsUpdate);
                messageCount++;
            }, messageInterval);

            // Wait for streaming to complete
            await new Promise(resolve => setTimeout(resolve, streamDuration + 1000));

            // Verify all clients received all messages
            for (let i = 0; i < clientCount; i++) {
                expect(clientMessages[i].length).toBe(messageCount);

                // Verify message order and content
                const timestamps = clientMessages[i].map(msg => new Date(msg.timestamp).getTime());
                for (let j = 1; j < timestamps.length; j++) {
                    expect(timestamps[j]).toBeGreaterThanOrEqual(timestamps[j - 1]);
                }

                // Verify all messages are odds updates
                expect(clientMessages[i].every(msg => msg.type === 'odds-update')).toBe(true);
            }

            console.log(`📡 Streamed ${messageCount} messages to ${clientCount} clients over ${streamDuration}ms`);

            clients.forEach(client => client.close());
        });

        test("multi-sport odds aggregation workflow", async () => {
            const sports = ['basketball', 'football', 'baseball'];
            const sportClients: Record<string, WebSocket> = {};
            const sportData: Record<string, any[]> = {};

            // Setup clients for each sport
            for (const sport of sports) {
                const client = new WebSocket(serverUrl);
                sportClients[sport] = client;
                sportData[sport] = [];

                await new Promise<void>((resolve, reject) => {
                    client.on('open', () => {
                        client.on('message', (data) => {
                            const message = JSON.parse(data.toString());
                            if (message.type === 'odds-update' && message.data.sport === sport) {
                                sportData[sport].push(message.data);
                            }
                        });
                        resolve();
                    });

                    client.on('error', reject);
                    setTimeout(() => reject(new Error('Sport client timeout')), 3000);
                });
            }

            // Fetch and stream odds for each sport
            for (const sport of sports) {
                const oddsResponse = await apiClient.get(`/api/odds?sport=${sport}`);
                expect(oddsResponse.status).toBe(200);

                // Stream odds with sport-specific delays
                oddsResponse.data.forEach((odds: any, index: number) => {
                    setTimeout(() => {
                        const message = WebSocketMessageFactory.createOddsUpdate(odds);
                        server.broadcast(message);
                    }, sports.indexOf(sport) * 1000 + index * 50);
                });
            }

            // Wait for all data to be received
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Verify sport-specific data reception
            for (const sport of sports) {
                expect(sportData[sport].length).toBeGreaterThan(0);

                // Verify all received data matches the sport
                expect(sportData[sport].every(odds => odds.sport === sport)).toBe(true);

                // Validate odds data structure
                sportData[sport].forEach(odds => {
                    DomainAssertions.assertValidOddsTick(odds);
                });
            }

            console.log(`🏀 Multi-sport aggregation: ${Object.values(sportData).map(data => data.length).join(', ')} odds received`);

            Object.values(sportClients).forEach(client => client.close());
        });
    });

    describe("Error Handling and Recovery", () => {
        test("graceful handling of API failures", async () => {
            const client = new WebSocket(serverUrl);
            let recoveryCompleted = false;

            await new Promise<void>((resolve, reject) => {
                client.on('open', () => {
                    client.on('message', (data) => {
                        const message = JSON.parse(data.toString());

                        if (message.type === 'system-status' && message.data.apiStatus === 'recovered') {
                            recoveryCompleted = true;
                            resolve();
                        }
                    });

                    // Simulate API failure
                    setTimeout(async () => {
                        try {
                            // This will fail
                            await apiClient.get('/api/unknown-endpoint');
                        } catch (error) {
                            // Expected failure
                        }

                        // Send error notification
                        const errorMessage = WebSocketMessageFactory.create({
                            type: 'system-error',
                            data: {
                                error: 'API connection failed',
                                timestamp: new Date().toISOString()
                            }
                        });
                        server.broadcast(errorMessage);

                        // Simulate recovery
                        setTimeout(() => {
                            const recoveryMessage = WebSocketMessageFactory.create({
                                type: 'system-status',
                                data: {
                                    status: 'operational',
                                    apiStatus: 'recovered',
                                    timestamp: new Date().toISOString()
                                }
                            });
                            server.broadcast(recoveryMessage);
                        }, 1000);
                    }, 100);
                });

                client.on('error', reject);
                setTimeout(() => reject(new Error('Recovery timeout')), 5000);
            });

            expect(recoveryCompleted).toBe(true);
            expect(server.isRunning()).toBe(true);

            client.close();
        });

        test("handles client disconnection during active streaming", async () => {
            const clientCount = 10;
            const clients: any[] = [];
            let streamingActive = true;

            // Setup clients
            for (let i = 0; i < clientCount; i++) {
                const client = new WebSocket(serverUrl);
                clients.push(client);

                await new Promise<void>((resolve) => {
                    client.on('open', resolve);
                });
            }

            expect(server.getClientCount()).toBe(clientCount);

            // Start streaming
            const streamInterval = setInterval(() => {
                if (!streamingActive) return;

                const message = WebSocketMessageFactory.createOddsUpdate(
                    OddsTickFactory.create()
                );
                server.broadcast(message);
            }, 50);

            // Disconnect some clients during streaming
            setTimeout(() => {
                clients.slice(0, 5).forEach(client => {
                    client.close();
                });
            }, 1000);

            // Continue streaming for remaining clients
            setTimeout(() => {
                streamingActive = false;
                clearInterval(streamInterval);
            }, 3000);

            await new Promise(resolve => setTimeout(resolve, 3500));

            // Verify server recovered and still has remaining clients
            expect(server.getClientCount()).toBe(5);
            expect(server.isRunning()).toBe(true);

            // Verify streaming continued for remaining clients
            const metrics = server.getPerformanceMetrics();
            expect(metrics.totalMessagesProcessed).toBeGreaterThan(0);

            console.log(`🔄 Handled client disconnection: ${clientCount - 5} clients remaining, server operational`);

            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.close();
                }
            });
        });
    });

    describe("Performance and Scalability", () => {
        test("handles high-frequency trading scenario", async () => {
            const tradingClients = 20;
            const messagesPerSecond = 100;
            const testDuration = 5000; // 5 seconds

            const clients: any[] = [];
            const clientMessageCounts: Record<number, number> = {};

            // Setup trading clients
            for (let i = 0; i < tradingClients; i++) {
                const client = new WebSocket(serverUrl);
                clients.push(client);
                clientMessageCounts[i] = 0;

                await new Promise<void>((resolve, reject) => {
                    client.on('open', () => {
                        client.on('message', () => {
                            clientMessageCounts[i]++;
                        });
                        resolve();
                    });

                    client.on('error', reject);
                    setTimeout(() => reject(new Error('Trading client timeout')), 3000);
                });
            }

            const endTimer = perfHelper.startTimer('high-frequency-trading');

            // Simulate high-frequency trading data
            const messageInterval = setInterval(() => {
                const tradingMessage = WebSocketMessageFactory.create({
                    type: 'trading-update',
                    data: {
                        price: Math.random() * 1000,
                        volume: Math.floor(Math.random() * 10000),
                        timestamp: new Date().toISOString()
                    }
                });

                server.broadcast(tradingMessage);
            }, 1000 / messagesPerSecond);

            // Run for specified duration
            await new Promise(resolve => setTimeout(resolve, testDuration));
            clearInterval(messageInterval);

            const duration = endTimer();

            // Verify performance
            const totalMessagesExpected = (testDuration / 1000) * messagesPerSecond;
            const totalMessagesReceived = Object.values(clientMessageCounts).reduce((a, b) => a + b, 0);
            const averageMessagesPerClient = totalMessagesReceived / tradingClients;

            expect(averageMessagesPerClient).toBeGreaterThan(totalMessagesExpected * 0.8); // At least 80% delivery rate
            expect(duration).toBeLessThan(testDuration + 1000); // Should complete close to target duration

            const serverMetrics = server.getPerformanceMetrics();
            expect(serverMetrics.messagesPerSecond).toBeGreaterThan(messagesPerSecond * 0.8);

            console.log(`⚡ High-frequency trading: ${averageMessagesPerClient.toFixed(0)} avg messages per client, ${serverMetrics.messagesPerSecond.toFixed(0)} msg/sec server throughput`);

            clients.forEach(client => client.close());
        });

        test("maintains performance under memory pressure", async () => {
            // Apply memory pressure
            const memoryPressure = Array.from({ length: 50 }, () =>
                new Array(20000).fill(null).map(() => ({ data: "x".repeat(500) }))
            );

            const client = new WebSocket(serverUrl);
            let performanceMaintained = true;

            await new Promise<void>((resolve, reject) => {
                client.on('open', () => {
                    const messageCount = 1000;
                    let processedCount = 0;

                    client.on('message', () => {
                        processedCount++;

                        if (processedCount === messageCount) {
                            // Check if performance was maintained
                            const metrics = server.getPerformanceMetrics();
                            performanceMaintained = metrics.averageProcessingTime < 10; // Under 10ms average

                            resolve();
                        }
                    });

                    // Send messages while under memory pressure
                    for (let i = 0; i < messageCount; i++) {
                        const message = WebSocketMessageFactory.createOddsUpdate(
                            OddsTickFactory.create({ id: `pressure-${i}` })
                        );
                        server.broadcast(message);
                    }
                });

                client.on('error', reject);
                setTimeout(() => reject(new Error('Memory pressure test timeout')), 10000);
            });

            // Cleanup memory pressure
            memoryPressure.forEach(arr => arr.length = 0);
            if (global.gc) {
                global.gc();
            }

            expect(performanceMaintained).toBe(true);
            expect(server.isRunning()).toBe(true);

            console.log(`🏋️ Performance maintained under memory pressure: ${performanceMaintained}`);

            client.close();
        });
    });

    describe("Data Integrity and Consistency", () => {
        test("maintains data consistency across client reconnection", async () => {
            let clientId = "reconnect-test-client";
            let initialData: any = null;
            let reconnectedData: any = null;

            // First connection
            const client1 = new WebSocket(serverUrl);

            await new Promise<void>((resolve, reject) => {
                client1.on('open', () => {
                    client1.on('message', (data) => {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'odds-update') {
                            initialData = message.data;
                            client1.close();
                            resolve();
                        }
                    });

                    // Send test data
                    const testData = WebSocketMessageFactory.createOddsUpdate(
                        OddsTickFactory.create({
                            id: 'consistency-test',
                            sport: 'basketball',
                            event: 'Test Game'
                        })
                    );
                    server.broadcast(testData);
                });

                client1.on('error', reject);
                setTimeout(() => reject(new Error('First connection timeout')), 5000);
            });

            // Reconnection
            const client2 = new WebSocket(serverUrl);

            await new Promise<void>((resolve, reject) => {
                client2.on('open', () => {
                    client2.on('message', (data) => {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'odds-update' && message.data.id === 'consistency-test') {
                            reconnectedData = message.data;
                            resolve();
                        }
                    });

                    // Request same data again
                    setTimeout(() => {
                        const sameData = WebSocketMessageFactory.createOddsUpdate(initialData);
                        server.broadcast(sameData);
                    }, 100);
                });

                client2.on('error', reject);
                setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
            });

            // Verify data consistency
            expect(reconnectedData).toBeDefined();
            expect(reconnectedData.id).toBe(initialData.id);
            expect(reconnectedData.sport).toBe(initialData.sport);
            expect(reconnectedData.event).toBe(initialData.event);
            expect(reconnectedData.odds).toEqual(initialData.odds);

            console.log(`🔄 Data consistency maintained across reconnection`);

            client2.close();
        });

        test("validates end-to-end data transformation", async () => {
            const client = new WebSocket(serverUrl);
            let transformationValid = false;

            await new Promise<void>((resolve, reject) => {
                client.on('open', () => {
                    client.on('message', (data) => {
                        const message = JSON.parse(data.toString());

                        if (message.type === 'transformed-odds') {
                            const transformedData = message.data;

                            // Validate original data preserved
                            expect(transformedData.id).toBeDefined();
                            expect(transformedData.sport).toBeDefined();
                            expect(transformedData.odds).toBeDefined();

                            // Validate transformations applied
                            expect(transformedData.enriched).toBeDefined();
                            expect(transformedData.processedAt).toBeDefined();
                            expect(transformedData.calculations).toBeDefined();

                            // Validate calculations
                            expect(transformedData.calculations.impliedProbability).toBeGreaterThan(0);
                            expect(transformedData.calculations.impliedProbability).toBeLessThan(1);

                            transformationValid = true;
                            resolve();
                        }
                    });

                    // Simulate data transformation pipeline
                    const rawOdds = OddsTickFactory.create({
                        odds: { home: -110, away: -110 }
                    });

                    const transformedOdds = {
                        ...rawOdds,
                        enriched: true,
                        processedAt: new Date().toISOString(),
                        calculations: {
                            impliedProbability: 0.476,
                            kellyFraction: 0.025,
                            expectedValue: 5.0
                        }
                    };

                    const transformedMessage = WebSocketMessageFactory.create({
                        type: 'transformed-odds',
                        data: transformedOdds
                    });

                    server.broadcast(transformedMessage);
                });

                client.on('error', reject);
                setTimeout(() => reject(new Error('Transformation test timeout')), 5000);
            });

            expect(transformationValid).toBe(true);

            console.log(`🔄 End-to-end data transformation validated`);

            client.close();
        });
    });
});
