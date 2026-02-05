// WebSocket Server Unit Tests
// Tests for BunV13WebSocketServer core functionality

import { test, describe, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
    OddsTickFactory,
    WebSocketMessageFactory,
    DomainAssertions,
    MockWebSocket
} from "@odds-testing/core/factories";
import { BunV13WebSocketServer } from "../../server-v13-enhanced";

describe("BunV13WebSocketServer - Unit Tests", () => {
    let server: BunV13WebSocketServer;
    let mockClients: MockWebSocket[] = [];

    beforeAll(() => {
        server = new BunV13WebSocketServer({
            port: 0, // Use random available port
            maxConnections: 100,
            enableCompression: true,
            heartbeatInterval: 30000
        });
    });

    afterAll(async () => {
        if (server) {
            await server.stop();
        }
        mockClients.forEach(client => client.close());
    });

    beforeEach(() => {
        mockClients = [];
    });

    describe("Server Initialization", () => {
        test("initializes with default configuration", () => {
            const defaultServer = new BunV13WebSocketServer();

            expect(defaultServer.getPort()).toBeGreaterThan(0);
            expect(defaultServer.getClientCount()).toBe(0);
            expect(defaultServer.isRunning()).toBe(false);
        });

        test("initializes with custom configuration", () => {
            const customConfig = {
                port: 8080,
                maxConnections: 50,
                enableCompression: false,
                heartbeatInterval: 15000
            };

            const customServer = new BunV13WebSocketServer(customConfig);

            expect(customServer.getPort()).toBe(8080);
            expect(customServer.getMaxConnections()).toBe(50);
        });

        test("validates configuration parameters", () => {
            expect(() => {
                new BunV13WebSocketServer({ port: -1 });
            }).toThrow("Port must be between 0 and 65535");

            expect(() => {
                new BunV13WebSocketServer({ maxConnections: 0 });
            }).toThrow("Max connections must be greater than 0");

            expect(() => {
                new BunV13WebSocketServer({ heartbeatInterval: -1 });
            }).toThrow("Heartbeat interval must be greater than 0");
        });
    });

    describe("Client Connection Management", () => {
        test("accepts client connections", async () => {
            await server.start();

            const mockClient = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            mockClient.simulateOpen();

            // Simulate server receiving connection
            server.handleConnection(mockClient as any);

            expect(server.getClientCount()).toBe(1);
            expect(mockClient.isOpen).toBe(true);
        });

        test("rejects connections when at capacity", async () => {
            const limitedServer = new BunV13WebSocketServer({ maxConnections: 1 });
            await limitedServer.start();

            const client1 = new MockWebSocket(`ws://localhost:${limitedServer.getPort()}`);
            const client2 = new MockWebSocket(`ws://localhost:${limitedServer.getPort()}`);

            limitedServer.handleConnection(client1 as any);
            limitedServer.handleConnection(client2 as any);

            expect(limitedServer.getClientCount()).toBe(1);
            expect(client1.isOpen).toBe(true);
            expect(client2.isOpen).toBe(false); // Should be rejected

            await limitedServer.stop();
        });

        test("removes disconnected clients", async () => {
            await server.start();

            const mockClient = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            server.handleConnection(mockClient as any);

            expect(server.getClientCount()).toBe(1);

            // Simulate client disconnection
            mockClient.simulateClose(1000, "Normal closure");
            server.handleDisconnection(mockClient as any);

            expect(server.getClientCount()).toBe(0);
        });

        test("tracks client metadata", async () => {
            await server.start();

            const mockClient = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            const clientInfo = {
                id: "client-123",
                userAgent: "TestClient/1.0",
                connectedAt: new Date().toISOString()
            };

            server.handleConnection(mockClient as any, clientInfo);

            const clients = server.getConnectedClients();
            expect(clients).toHaveLength(1);
            expect(clients[0].id).toBe(clientInfo.id);
            expect(clients[0].userAgent).toBe(clientInfo.userAgent);
        });
    });

    describe("Message Handling", () => {
        beforeEach(async () => {
            await server.start();
        });

        test("processes valid odds update messages", () => {
            const mockClient = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            server.handleConnection(mockClient as any);

            const oddsTick = OddsTickFactory.create();
            const message = WebSocketMessageFactory.createOddsUpdate(oddsTick);

            server.handleMessage(mockClient as any, JSON.stringify(message));

            // Verify message was processed
            const processedMessages = server.getProcessedMessages();
            expect(processedMessages).toHaveLength(1);
            expect(processedMessages[0].type).toBe("odds-update");
            expect(processedMessages[0].data.id).toBe(oddsTick.id);
        });

        test("validates message structure", () => {
            const mockClient = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            server.handleConnection(mockClient as any);

            const invalidMessage = { type: "invalid", data: "incomplete" };

            expect(() => {
                server.handleMessage(mockClient as any, JSON.stringify(invalidMessage));
            }).toThrow("Invalid message structure");
        });

        test("handles malformed JSON gracefully", () => {
            const mockClient = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            server.handleConnection(mockClient as any);

            expect(() => {
                server.handleMessage(mockClient as any, "invalid json");
            }).toThrow("Invalid JSON message");
        });

        test("processes arbitrage alert messages", () => {
            const mockClient = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            server.handleConnection(mockClient as any);

            const arbitrageOpportunity = OddsTickFactory.createArbitrageOpportunity();
            const message = WebSocketMessageFactory.create({
                type: "arbitrage-alert",
                data: arbitrageOpportunity
            });

            server.handleMessage(mockClient as any, JSON.stringify(message));

            const processedMessages = server.getProcessedMessages();
            expect(processedMessages).toHaveLength(1);
            expect(processedMessages[0].type).toBe("arbitrage-alert");
        });

        test("broadcasts messages to all connected clients", () => {
            const client1 = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            const client2 = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            const client3 = new MockWebSocket(`ws://localhost:${server.getPort()}`);

            server.handleConnection(client1 as any);
            server.handleConnection(client2 as any);
            server.handleConnection(client3 as any);

            const broadcastMessage = WebSocketMessageFactory.create({
                type: "market-update",
                data: { status: "active" }
            });

            server.broadcast(broadcastMessage);

            expect(client1.sentMessages).toHaveLength(1);
            expect(client2.sentMessages).toHaveLength(1);
            expect(client3.sentMessages).toHaveLength(1);

            const sentData = JSON.parse(client1.sentMessages[0]);
            expect(sentData.type).toBe("market-update");
        });

        test("sends targeted messages to specific clients", () => {
            const client1 = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            const client2 = new MockWebSocket(`ws://localhost:${server.getPort()}`);

            server.handleConnection(client1 as any, { id: "client-1" });
            server.handleConnection(client2 as any, { id: "client-2" });

            const targetedMessage = WebSocketMessageFactory.create({
                type: "private-alert",
                data: { message: "For your eyes only" }
            });

            server.sendToClient("client-1", targetedMessage);

            expect(client1.sentMessages).toHaveLength(1);
            expect(client2.sentMessages).toHaveLength(0);
        });
    });

    describe("Performance Monitoring", () => {
        test("tracks message processing metrics", async () => {
            await server.start();

            const mockClient = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            server.handleConnection(mockClient as any);

            // Process multiple messages
            for (let i = 0; i < 100; i++) {
                const message = WebSocketMessageFactory.createOddsUpdate(
                    OddsTickFactory.create({ id: `odds-${i}` })
                );
                server.handleMessage(mockClient as any, JSON.stringify(message));
            }

            const metrics = server.getPerformanceMetrics();

            expect(metrics.totalMessagesProcessed).toBe(100);
            expect(metrics.averageProcessingTime).toBeGreaterThan(0);
            expect(metrics.messagesPerSecond).toBeGreaterThan(0);
        });

        test("monitors connection metrics", async () => {
            await server.start();

            // Simulate multiple connections
            for (let i = 0; i < 10; i++) {
                const client = new MockWebSocket(`ws://localhost:${server.getPort()}`);
                server.handleConnection(client as any, { id: `client-${i}` });
            }

            const metrics = server.getConnectionMetrics();

            expect(metrics.currentConnections).toBe(10);
            expect(metrics.totalConnections).toBe(10);
            expect(metrics.peakConnections).toBe(10);
        });

        test("detects performance degradation", async () => {
            await server.start();

            const mockClient = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            server.handleConnection(mockClient as any);

            // Simulate slow processing
            const slowMessage = WebSocketMessageFactory.createOddsUpdate(
                OddsTickFactory.create()
            );

            // Mock slow processing
            const originalHandle = server.handleMessage.bind(server);
            server.handleMessage = (client: any, message: string) => {
                // Simulate delay
                const start = performance.now();
                while (performance.now() - start < 150) {
                    // Wait 150ms
                }
                return originalHandle(client, message);
            };

            server.handleMessage(mockClient as any, JSON.stringify(slowMessage));

            const alerts = server.getPerformanceAlerts();
            expect(alerts.some(alert => alert.type === "slow-message-processing")).toBe(true);
        });
    });

    describe("Error Handling", () => {
        test("handles client connection errors", async () => {
            await server.start();

            const faultyClient = {
                simulateOpen: () => { throw new Error("Connection failed"); },
                close: () => { },
                on: () => { }
            };

            expect(() => {
                server.handleConnection(faultyClient as any);
            }).not.toThrow();

            // Server should continue running
            expect(server.isRunning()).toBe(true);
        });

        test("handles message processing errors", async () => {
            await server.start();

            const mockClient = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            server.handleConnection(mockClient as any);

            // Send message that causes processing error
            const problematicMessage = {
                type: "odds-update",
                data: null // This should cause an error
            };

            expect(() => {
                server.handleMessage(mockClient as any, JSON.stringify(problematicMessage));
            }).not.toThrow();

            // Client should still be connected
            expect(server.getClientCount()).toBe(1);
        });

        test("logs errors appropriately", async () => {
            await server.start();

            const mockClient = new MockWebSocket(`ws://localhost:${server.getPort()}`);
            server.handleConnection(mockClient as any);

            const errorLogs = [];
            const originalConsoleError = console.error;
            console.error = (...args) => {
                errorLogs.push(args.join(" "));
            };

            try {
                const invalidMessage = "definitely not json";
                server.handleMessage(mockClient as any, invalidMessage);

                expect(errorLogs.length).toBeGreaterThan(0);
                expect(errorLogs.some(log => log.includes("Invalid JSON"))).toBe(true);
            } finally {
                console.error = originalConsoleError;
            }
        });
    });

    describe("Configuration Validation", () => {
        test("validates port range", () => {
            expect(() => new BunV13WebSocketServer({ port: 65536 })).toThrow();
            expect(() => new BunV13WebSocketServer({ port: -1 })).toThrow();
            expect(() => new BunV13WebSocketServer({ port: 8080 })).not.toThrow();
        });

        test("validates connection limits", () => {
            expect(() => new BunV13WebSocketServer({ maxConnections: 0 })).toThrow();
            expect(() => new BunV13WebSocketServer({ maxConnections: -1 })).toThrow();
            expect(() => new BunV13WebSocketServer({ maxConnections: 1000 })).not.toThrow();
        });

        test("validates timing parameters", () => {
            expect(() => new BunV13WebSocketServer({ heartbeatInterval: 0 })).toThrow();
            expect(() => new BunV13WebSocketServer({ heartbeatInterval: -100 })).toThrow();
            expect(() => new BunV13WebSocketServer({ heartbeatInterval: 30000 })).not.toThrow();
        });
    });

    describe("Data Validation", () => {
        test("validates odds data from factory", () => {
            const oddsTick = OddsTickFactory.create();
            DomainAssertions.assertValidOddsTick(oddsTick);

            // Test with custom data
            const customOdds = OddsTickFactory.create({
                sport: "basketball",
                odds: { home: -110, away: -110 }
            });

            expect(customOdds.sport).toBe("basketball");
            expect(customOdds.odds.home).toBe(-110);
            expect(customOdds.odds.away).toBe(-110);
        });

        test("validates WebSocket messages from factory", () => {
            const message = WebSocketMessageFactory.createOddsUpdate(
                OddsTickFactory.create()
            );

            DomainAssertions.assertValidWebSocketMessage(message);
            expect(message.type).toBe("odds-update");
            expect(message.data).toBeDefined();
            expect(message.timestamp).toBeDefined();
        });
    });
});
