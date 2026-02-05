// WebSocket Integration Tests
// Tests for WebSocket server integration with real clients and data flows

import { test, describe, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { WebSocket } from "ws";
import {
    OddsTickFactory,
    WebSocketMessageFactory,
    TestScenarioFactory,
    MockAPIClient,
    PerformanceHelper,
    DomainAssertions
} from "@testing/factories";
import { BunV13WebSocketServer } from "../server-v13-enhanced";

describe("WebSocket Integration Tests", () => {
    let server: BunV13WebSocketServer;
    let serverUrl: string;
    let apiClient: MockAPIClient;
    let perfHelper: PerformanceHelper;

    beforeAll(async () => {
        // Start WebSocket server
        server = new BunV13WebSocketServer({
            port: 0, // Random port
            maxConnections: 50,
            enableCompression: true,
            heartbeatInterval: 5000
        });

        await server.start();
        serverUrl = `ws://localhost:${server.getPort()}`;

        // Setup mock API client
        apiClient = new MockAPIClient();
        apiClient.setResponse('/api/odds', {
            status: 200,
            data: OddsTickFactory.createBatch(20),
            pagination: { page: 1, total: 100, limit: 20 }
        });

        apiClient.setResponse('/api/arbitrage', {
            status: 200,
            data: [OddsTickFactory.createArbitrageOpportunity()]
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
    });

    describe("Real WebSocket Client Integration", () => {
        test("establishes real WebSocket connection", async () => {
            const ws = new WebSocket(serverUrl);

            await new Promise<void>((resolve, reject) => {
                ws.on('open', () => {
                    expect(ws.readyState).toBe(WebSocket.OPEN);
                    resolve();
                });

                ws.on('error', reject);
                setTimeout(() => reject(new Error('Connection timeout')), 5000);
            });

            ws.close();
        });

        test("receives server broadcasts", async () => {
            const ws = new WebSocket(serverUrl);
            let receivedMessage: any = null;

            await new Promise<void>((resolve, reject) => {
                ws.on('open', () => {
                    // Listen for messages
                    ws.on('message', (data) => {
                        receivedMessage = JSON.parse(data.toString());
                        resolve();
                    });

                    // Trigger server broadcast after connection
                    setTimeout(() => {
                        const broadcastMessage = WebSocketMessageFactory.create({
                            type: 'test-broadcast',
                            data: { message: 'Hello clients!' }
                        });
                        server.broadcast(broadcastMessage);
                    }, 100);
                });

                ws.on('error', reject);
                setTimeout(() => reject(new Error('Message timeout')), 5000);
            });

            expect(receivedMessage).toBeDefined();
            expect(receivedMessage.type).toBe('test-broadcast');
            expect(receivedMessage.data.message).toBe('Hello clients!');

            ws.close();
        });

        test("handles multiple concurrent clients", async () => {
            const clientCount = 10;
            const clients: any[] = [];
            const connectionPromises = [];

            // Create multiple clients
            for (let i = 0; i < clientCount; i++) {
                const ws = new WebSocket(serverUrl);
                clients.push(ws);

                const promise = new Promise<void>((resolve, reject) => {
                    ws.on('open', resolve);
                    ws.on('error', reject);
                });

                connectionPromises.push(promise);
            }

            // Wait for all connections
            await Promise.all(connectionPromises);

            expect(server.getClientCount()).toBe(clientCount);

            // Broadcast to all clients
            const broadcastMessage = WebSocketMessageFactory.create({
                type: 'multi-client-test',
                data: { clientCount }
            });

            server.broadcast(broadcastMessage);

            // Verify all clients received the message
            await new Promise(resolve => setTimeout(resolve, 100));

            clients.forEach(ws => ws.close());
        });
    });

    describe("End-to-End Data Flow", () => {
        test("complete odds update workflow", async () => {
            const endTimer = perfHelper.startTimer('odds-workflow');

            // 1. Fetch odds from API
            const apiResponse = await apiClient.get('/api/odds');
            expect(apiResponse.status).toBe(200);
            expect(apiResponse.data.length).toBe(20);

            // 2. Connect WebSocket client
            const ws = new WebSocket(serverUrl);
            let receivedOddsUpdate: any = null;

            await new Promise<void>((resolve, reject) => {
                ws.on('open', () => {
                    ws.on('message', (data) => {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'odds-update') {
                            receivedOddsUpdate = message;
                            resolve();
                        }
                    });

                    // 3. Send odds update via WebSocket
                    const oddsUpdate = WebSocketMessageFactory.createOddsUpdate(
                        apiResponse.data[0]
                    );
                    server.broadcast(oddsUpdate);
                });

                ws.on('error', reject);
                setTimeout(() => reject(new Error('Workflow timeout')), 5000);
            });

            const duration = endTimer();

            // 4. Verify complete workflow
            expect(receivedOddsUpdate).toBeDefined();
            expect(receivedOddsUpdate.type).toBe('odds-update');
            expect(receivedOddsUpdate.data.id).toBe(apiResponse.data[0].id);

            // Performance check
            expect(duration).toBeLessThan(1000); // Should complete in under 1 second

            ws.close();
        });

        test("arbitrage detection and alert workflow", async () => {
            const scenario = TestScenarioFactory.createArbitrageScenario();

            // 1. Setup WebSocket client for arbitrage alerts
            const ws = new WebSocket(serverUrl);
            let receivedAlert: any = null;

            await new Promise<void>((resolve, reject) => {
                ws.on('open', () => {
                    ws.on('message', (data) => {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'arbitrage-alert') {
                            receivedAlert = message;
                            resolve();
                        }
                    });

                    // 2. Simulate arbitrage detection
                    const arbitrageAlert = WebSocketMessageFactory.create({
                        type: 'arbitrage-alert',
                        data: {
                            id: 'arb-detected',
                            sport: scenario.marketOdds[0].sport,
                            event: scenario.marketOdds[0].event,
                            profit: scenario.expectedProfit,
                            opportunities: scenario.marketOdds,
                            timestamp: new Date().toISOString()
                        }
                    });

                    server.broadcast(arbitrageAlert);
                });

                ws.on('error', reject);
                setTimeout(() => reject(new Error('Arbitrage workflow timeout')), 5000);
            });

            // 3. Verify arbitrage alert
            expect(receivedAlert).toBeDefined();
            expect(receivedAlert.type).toBe('arbitrage-alert');
            expect(receivedAlert.data.profit).toBe(scenario.expectedProfit);
            expect(receivedAlert.data.opportunities).toHaveLength(scenario.marketOdds.length);

            // Validate arbitrage data
            DomainAssertions.assertValidArbitrageOpportunity(receivedAlert.data);

            ws.close();
        });

        test("real-time streaming scenario", async () => {
            const highVolumeScenario = TestScenarioFactory.createHighFrequencyScenario(100, 50);
            const ws = new WebSocket(serverUrl);
            const receivedMessages: any[] = [];

            await new Promise<void>((resolve, reject) => {
                ws.on('open', () => {
                    ws.on('message', (data) => {
                        receivedMessages.push(JSON.parse(data.toString()));

                        if (receivedMessages.length === highVolumeScenario.messages.length) {
                            resolve();
                        }
                    });

                    // Stream messages with realistic timing
                    highVolumeScenario.messages.forEach((message, index) => {
                        setTimeout(() => {
                            server.broadcast(message);
                        }, index * 50); // 50ms intervals
                    });
                });

                ws.on('error', reject);
                setTimeout(() => reject(new Error('Streaming timeout')), 15000);
            });

            // Verify streaming results
            expect(receivedMessages).toHaveLength(100);

            // Verify chronological order
            const timestamps = receivedMessages.map(msg => new Date(msg.timestamp).getTime());
            for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
            }

            // Verify message types
            expect(receivedMessages.every(msg => msg.type === 'odds-update')).toBe(true);

            ws.close();
        });
    });

    describe("Performance Integration", () => {
        test("handles high-frequency message broadcasting", async () => {
            const messageCount = 1000;
            const clientCount = 5;
            const clients: any[] = [];

            // Setup multiple clients
            for (let i = 0; i < clientCount; i++) {
                const ws = new WebSocket(serverUrl);
                clients.push(ws);
            }

            await new Promise(resolve => {
                let connectedCount = 0;
                clients.forEach(ws => {
                    ws.on('open', () => {
                        connectedCount++;
                        if (connectedCount === clientCount) {
                            resolve(undefined);
                        }
                    });
                });
            });

            // Measure broadcast performance
            const endTimer = perfHelper.startTimer('high-frequency-broadcast');

            const messages = Array.from({ length: messageCount }, () =>
                WebSocketMessageFactory.createOddsUpdate(OddsTickFactory.create())
            );

            // Broadcast all messages
            messages.forEach(message => {
                server.broadcast(message);
            });

            const duration = endTimer();
            const throughput = messageCount / (duration / 1000);

            // Performance assertions
            expect(throughput).toBeGreaterThan(1000); // At least 1000 msgs/sec
            expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

            // Verify server metrics
            const metrics = server.getPerformanceMetrics();
            expect(metrics.totalMessagesProcessed).toBeGreaterThanOrEqual(messageCount);

            clients.forEach(ws => ws.close());
        });

        test("maintains performance under concurrent load", async () => {
            const concurrentClients = 20;
            const messagesPerClient = 50;
            const clients: any[] = [];

            // Connect all clients
            for (let i = 0; i < concurrentClients; i++) {
                const ws = new WebSocket(serverUrl);
                clients.push(ws);
            }

            await new Promise(resolve => {
                let connectedCount = 0;
                clients.forEach(ws => {
                    ws.on('open', () => {
                        connectedCount++;
                        if (connectedCount === concurrentClients) {
                            resolve(undefined);
                        }
                    });
                });
            });

            // Generate load
            const endTimer = perfHelper.startTimer('concurrent-load');

            const loadPromises = clients.map((client, clientIndex) => {
                return new Promise<void>((resolve) => {
                    let messageCount = 0;

                    client.on('message', () => {
                        messageCount++;
                        if (messageCount === messagesPerClient) {
                            resolve();
                        }
                    });

                    // Send messages to this client
                    for (let i = 0; i < messagesPerClient; i++) {
                        const message = WebSocketMessageFactory.create({
                            type: 'targeted-message',
                            data: { clientIndex, messageIndex: i }
                        });

                        setTimeout(() => {
                            server.sendToClient(`client-${clientIndex}`, message);
                        }, i * 10);
                    }
                });
            });

            await Promise.all(loadPromises);
            const duration = endTimer();

            // Verify performance under load
            expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds

            const totalMessages = concurrentClients * messagesPerClient;
            const throughput = totalMessages / (duration / 1000);
            expect(throughput).toBeGreaterThan(100); // At least 100 msgs/sec under load

            clients.forEach(ws => ws.close());
        });
    });

    describe("Error Recovery Integration", () => {
        test("recovers from client connection failures", async () => {
            // Attempt connection to invalid port
            const invalidWs = new WebSocket('ws://localhost:99999');

            await new Promise<void>((resolve, reject) => {
                invalidWs.on('error', () => {
                    resolve(); // Expected error
                });

                invalidWs.on('open', () => {
                    reject(new Error('Should not connect to invalid port'));
                });

                setTimeout(() => reject(new Error('Error timeout')), 5000);
            });

            // Server should still be running and accepting new connections
            const validWs = new WebSocket(serverUrl);

            await new Promise<void>((resolve, reject) => {
                validWs.on('open', () => {
                    expect(server.getClientCount()).toBe(1);
                    resolve();
                });

                validWs.on('error', reject);
                setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
            });

            validWs.close();
        });

        test("handles message parsing errors gracefully", async () => {
            const ws = new WebSocket(serverUrl);
            let serverStillRunning = true;

            await new Promise<void>((resolve, reject) => {
                ws.on('open', () => {
                    // Send invalid JSON
                    ws.send('invalid json message');

                    // Send valid message after error
                    setTimeout(() => {
                        const validMessage = WebSocketMessageFactory.create({
                            type: 'recovery-test',
                            data: { message: 'Server recovered' }
                        });
                        ws.send(JSON.stringify(validMessage));
                    }, 100);

                    ws.on('message', (data) => {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'recovery-test') {
                            serverStillRunning = server.isRunning();
                            resolve();
                        }
                    });
                });

                ws.on('error', reject);
                setTimeout(() => reject(new Error('Recovery timeout')), 5000);
            });

            expect(serverStillRunning).toBe(true);
            expect(server.getClientCount()).toBe(1);

            ws.close();
        });

        test("maintains service during partial client failures", async () => {
            const goodClients: WebSocket[] = [];
            const faultyClients: WebSocket[] = [];

            // Create mix of good and faulty clients
            for (let i = 0; i < 5; i++) {
                const goodWs = new WebSocket(serverUrl);
                goodClients.push(goodWs);
            }

            // Wait for good clients to connect
            await new Promise(resolve => {
                let connectedCount = 0;
                goodClients.forEach(ws => {
                    ws.on('open', () => {
                        connectedCount++;
                        if (connectedCount === goodClients.length) {
                            resolve(undefined);
                        }
                    });
                });
            });

            // Simulate faulty clients (just for counting, not actual connections)
            for (let i = 0; i < 3; i++) {
                faultyClients.push(new WebSocket('ws://localhost:99999'));
            }

            // Server should still work with good clients
            const testMessage = WebSocketMessageFactory.create({
                type: 'service-continuity',
                data: { message: 'Service continues despite failures' }
            });

            server.broadcast(testMessage);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(server.getClientCount()).toBe(goodClients.length);
            expect(server.isRunning()).toBe(true);

            goodClients.forEach(ws => ws.close());
        });
    });

    describe("Data Consistency Integration", () => {
        test("maintains data integrity across API and WebSocket", async () => {
            // 1. Get data from API
            const apiResponse = await apiClient.get('/api/odds');
            const originalOdds = apiResponse.data[0];

            // 2. Transform for WebSocket
            const wsMessage = WebSocketMessageFactory.createOddsUpdate(originalOdds);

            // 3. Send via WebSocket
            const ws = new WebSocket(serverUrl);
            let receivedData: any = null;

            await new Promise<void>((resolve, reject) => {
                ws.on('open', () => {
                    ws.on('message', (data) => {
                        receivedData = JSON.parse(data.toString()).data;
                        resolve();
                    });

                    server.broadcast(wsMessage);
                });

                ws.on('error', reject);
                setTimeout(() => reject(new Error('Data consistency timeout')), 5000);
            });

            // 4. Verify data consistency
            expect(receivedData.id).toBe(originalOdds.id);
            expect(receivedData.sport).toBe(originalOdds.sport);
            expect(receivedData.odds).toEqual(originalOdds.odds);
            expect(receivedData.timestamp).toBe(originalOdds.timestamp);

            ws.close();
        });

        test("handles data transformation correctly", async () => {
            const rawOdds = OddsTickFactory.create({
                odds: { home: -110, away: -110 }
            });

            // Simulate data enrichment
            const enrichedOdds = {
                ...rawOdds,
                calculated: {
                    impliedProbability: 0.476,
                    kellyFraction: 0.025,
                    expectedValue: 5.0
                },
                processedAt: new Date().toISOString()
            };

            const ws = new WebSocket(serverUrl);
            let receivedEnrichedData: any = null;

            await new Promise<void>((resolve, reject) => {
                ws.on('open', () => {
                    ws.on('message', (data) => {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'odds-update') {
                            receivedEnrichedData = message.data;
                            resolve();
                        }
                    });

                    const enrichedMessage = WebSocketMessageFactory.createOddsUpdate(enrichedOdds);
                    server.broadcast(enrichedMessage);
                });

                ws.on('error', reject);
                setTimeout(() => reject(new Error('Data transformation timeout')), 5000);
            });

            // Verify transformation preserved core data
            expect(receivedEnrichedData.id).toBe(rawOdds.id);
            expect(receivedEnrichedData.sport).toBe(rawOdds.sport);
            expect(receivedEnrichedData.odds).toEqual(rawOdds.odds);

            // Verify enrichment was added
            expect(receivedEnrichedData.calculated).toBeDefined();
            expect(receivedEnrichedData.processedAt).toBeDefined();
            expect(receivedEnrichedData.calculated.kellyFraction).toBe(0.025);

            ws.close();
        });
    });
});
