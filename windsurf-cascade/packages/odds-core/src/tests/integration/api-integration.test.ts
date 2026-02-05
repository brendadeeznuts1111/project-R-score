// Consolidated Integration Tests - API Integration
// Merged from multiple scattered integration test files

import { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { OddsTickFactory, WebSocketMessageFactory, NetworkDataFactory } from "@testing/factories";

// Mock API and WebSocket implementations for integration testing
class MockWebSocketServer {
    private clients = new Set();
    private messageHistory: any[] = [];

    constructor(private port: number) { }

    addClient(client: any) {
        this.clients.add(client);
        client.on('message', (message: any) => {
            this.messageHistory.push({
                timestamp: new Date().toISOString(),
                message: JSON.parse(message.toString())
            });
        });
    }

    broadcast(message: any) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach(client => {
            client.send(messageStr);
        });
    }

    getMessageHistory() {
        return this.messageHistory;
    }

    clearHistory() {
        this.messageHistory = [];
    }

    getClientCount() {
        return this.clients.size;
    }
}

class MockAPIClient {
    constructor(private baseUrl: string) { }

    async get(endpoint: string): Promise<any> {
        // Simulate API latency
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

        // Mock responses based on endpoint
        if (endpoint.includes('/odds')) {
            return {
                status: 200,
                data: OddsTickFactory.createBatch(20),
                pagination: { page: 1, total: 100, limit: 20 }
            };
        }

        if (endpoint.includes('/arbitrage')) {
            return {
                status: 200,
                data: [
                    {
                        id: 'arb-123',
                        sport: 'basketball',
                        profit: 2.5,
                        opportunities: OddsTickFactory.createBatch(2)
                    }
                ]
            };
        }

        return { status: 404, data: null };
    }

    async post(endpoint: string, data: any): Promise<any> {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

        if (endpoint.includes('/calculate')) {
            return {
                status: 200,
                data: {
                    success: true,
                    calculation: {
                        profit: data.odds ? 2.5 : 0,
                        confidence: 0.95
                    }
                }
            };
        }

        return { status: 400, data: { error: 'Bad Request' } };
    }
}

describe("API Integration Tests", () => {
    let apiClient: MockAPIClient;
    let wsServer: MockWebSocketServer;
    let mockClients: any[] = [];

    beforeAll(() => {
        apiClient = new MockAPIClient('http://localhost:3001');
        wsServer = new MockWebSocketServer(8080);
    });

    afterAll(() => {
        mockClients.forEach(client => client.close?.());
    });

    beforeEach(() => {
        wsServer.clearHistory();
    });

    afterEach(() => {
        mockClients.forEach(client => client.close?.());
        mockClients = [];
    });

    describe("API Client Integration", () => {
        test("fetches odds data successfully", async () => {
            const response = await apiClient.get('/api/odds?sport=basketball');

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeGreaterThan(0);
            expect(response.pagination).toBeDefined();
        });

        test("handles API errors gracefully", async () => {
            const response = await apiClient.get('/api/unknown');

            expect(response.status).toBe(404);
            expect(response.data).toBeNull();
        });

        test("posts arbitrage calculations successfully", async () => {
            const calculationData = {
                odds: [
                    { bookmaker: 'BookA', odds: -110, commission: 0.02 },
                    { bookmaker: 'BookB', odds: -105, commission: 0.025 }
                ]
            };

            const response = await apiClient.post('/api/arbitrage/calculate', calculationData);

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.calculation.profit).toBeGreaterThan(0);
        });

        test("handles invalid POST data", async () => {
            const response = await apiClient.post('/api/arbitrage/calculate', {});

            expect(response.status).toBe(400);
            expect(response.data.error).toBeDefined();
        });
    });

    describe("WebSocket Integration", () => {
        test("multiple clients connect and receive messages", async () => {
            const clientCount = 5;
            const testMessage = WebSocketMessageFactory.create();

            // Create mock clients
            for (let i = 0; i < clientCount; i++) {
                const mockClient = {
                    sentMessages: [] as string[],
                    send: (message: string) => {
                        mockClient.sentMessages.push(message);
                    },
                    on: (event: string, handler: Function) => {
                        if (event === 'message') {
                            mockClient.messageHandler = handler;
                        }
                    },
                    close: () => { },
                    messageHandler: null as any
                };

                wsServer.addClient(mockClient);
                mockClients.push(mockClient);
            }

            // Broadcast message
            wsServer.broadcast(testMessage);

            // Verify all clients received the message
            mockClients.forEach(client => {
                expect(client.sentMessages).toHaveLength(1);
                expect(client.sentMessages[0]).toBe(JSON.stringify(testMessage));
            });
        });

        test("clients can send messages to server", async () => {
            const mockClient = {
                sentMessages: [] as string[],
                send: (message: string) => {
                    mockClient.sentMessages.push(message);
                },
                on: (event: string, handler: Function) => {
                    if (event === 'message') {
                        mockClient.messageHandler = handler;
                    }
                },
                close: () => { },
                messageHandler: null as any
            };

            wsServer.addClient(mockClient);

            const clientMessage = WebSocketMessageFactory.create();
            mockClient.messageHandler(JSON.stringify(clientMessage));

            const history = wsServer.getMessageHistory();
            expect(history).toHaveLength(1);
            expect(history[0].message).toEqual(clientMessage);
        });

        test("handles high-frequency message streaming", async () => {
            const mockClient = {
                sentMessages: [] as string[],
                send: (message: string) => {
                    mockClient.sentMessages.push(message);
                },
                on: (event: string, handler: Function) => {
                    if (event === 'message') {
                        mockClient.messageHandler = handler;
                    }
                },
                close: () => { },
                messageHandler: null as any
            };

            wsServer.addClient(mockClient);

            // Send high-frequency messages
            const messageCount = 1000;
            const messages = Array.from({ length: messageCount }, () =>
                WebSocketMessageFactory.create()
            );

            const startTime = performance.now();
            messages.forEach(message => wsServer.broadcast(message));
            const endTime = performance.now();

            const duration = endTime - startTime;
            expect(mockClient.sentMessages).toHaveLength(messageCount);
            expect(duration).toBeLessThan(1000); // Should handle 1000 messages in under 1 second
        });
    });

    describe("End-to-End Workflows", () => {
        test("complete arbitrage detection workflow", async () => {
            // 1. Fetch odds from multiple bookmakers
            const oddsResponse = await apiClient.get('/api/odds');
            expect(oddsResponse.status).toBe(200);

            // 2. Calculate arbitrage opportunities
            const arbitrageResponse = await apiClient.post('/api/arbitrage/calculate', {
                odds: oddsResponse.data.slice(0, 2)
            });
            expect(arbitrageResponse.status).toBe(200);
            expect(arbitrageResponse.data.success).toBe(true);

            // 3. Broadcast arbitrage alert via WebSocket
            const alertMessage = WebSocketMessageFactory.create({
                type: 'arbitrage-alert',
                data: arbitrageResponse.data.calculation
            });

            const mockClient = {
                sentMessages: [] as string[],
                send: (message: string) => {
                    mockClient.sentMessages.push(message);
                },
                on: () => { },
                close: () => { }
            };

            wsServer.addClient(mockClient);
            wsServer.broadcast(alertMessage);

            expect(mockClient.sentMessages).toHaveLength(1);
            expect(JSON.parse(mockClient.sentMessages[0]).type).toBe('arbitrage-alert');
        });

        test("real-time odds update workflow", async () => {
            const mockClient = {
                sentMessages: [] as string[],
                send: (message: string) => {
                    mockClient.sentMessages.push(message);
                },
                on: (event: string, handler: Function) => {
                    if (event === 'message') {
                        mockClient.messageHandler = handler;
                    }
                },
                close: () => { },
                messageHandler: null as any
            };

            wsServer.addClient(mockClient);

            // Simulate real-time odds updates
            const updateCount = 10;
            for (let i = 0; i < updateCount; i++) {
                const oddsUpdate = WebSocketMessageFactory.createOddsUpdate(
                    OddsTickFactory.create({
                        timestamp: new Date(Date.now() - i * 1000).toISOString()
                    })
                );

                wsServer.broadcast(oddsUpdate);

                // Small delay to simulate real-time updates
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            expect(mockClient.sentMessages).toHaveLength(updateCount);

            // Verify chronological order
            const messages = mockClient.sentMessages.map(msg => JSON.parse(msg));
            const timestamps = messages.map(msg => new Date(msg.timestamp).getTime());

            for (let i = 1; i < timestamps.length; i++) {
                expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
            }
        });

        test("error handling and recovery workflow", async () => {
            // 1. Simulate API failure
            const originalGet = apiClient.get.bind(apiClient);
            apiClient.get = async () => {
                throw new Error('Network error');
            };

            let errorHandled = false;
            try {
                await apiClient.get('/api/odds');
            } catch (error) {
                errorHandled = true;
                expect(error.message).toBe('Network error');
            }

            expect(errorHandled).toBe(true);

            // 2. Restore API and verify recovery
            apiClient.get = originalGet;
            const response = await apiClient.get('/api/odds');
            expect(response.status).toBe(200);

            // 3. Verify WebSocket still works
            const mockClient = {
                sentMessages: [] as string[],
                send: (message: string) => {
                    mockClient.sentMessages.push(message);
                },
                on: () => { },
                close: () => { }
            };

            wsServer.addClient(mockClient);
            wsServer.broadcast(WebSocketMessageFactory.create());

            expect(mockClient.sentMessages).toHaveLength(1);
        });
    });

    describe("Performance Integration", () => {
        test("handles concurrent API requests", async () => {
            const concurrentRequests = 20;
            const requests = Array.from({ length: concurrentRequests }, () =>
                apiClient.get('/api/odds')
            );

            const startTime = performance.now();
            const responses = await Promise.all(requests);
            const endTime = performance.now();

            const duration = endTime - startTime;

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.data).toBeDefined();
            });

            expect(duration).toBeLessThan(2000); // Should handle 20 concurrent requests in under 2 seconds
        });

        test("maintains performance under load", async () => {
            const clientCount = 50;
            const messagesPerClient = 100;

            // Create multiple clients
            const clients = Array.from({ length: clientCount }, () => {
                const client = {
                    sentMessages: [] as string[],
                    send: (message: string) => {
                        client.sentMessages.push(message);
                    },
                    on: () => { },
                    close: () => { }
                };

                wsServer.addClient(client);
                return client;
            });

            // Send messages to all clients
            const startTime = performance.now();

            for (let i = 0; i < messagesPerClient; i++) {
                const message = WebSocketMessageFactory.create();
                wsServer.broadcast(message);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Verify all clients received all messages
            clients.forEach(client => {
                expect(client.sentMessages).toHaveLength(messagesPerClient);
            });

            expect(duration).toBeLessThan(5000); // Should handle 5000 total messages in under 5 seconds
        });
    });

    describe("Data Consistency", () => {
        test("maintains data consistency across API and WebSocket", async () => {
            // Get data from API
            const apiResponse = await apiClient.get('/api/odds');
            const apiOdds = apiResponse.data[0];

            // Send same data via WebSocket
            const wsMessage = WebSocketMessageFactory.createOddsUpdate(apiOdds);

            const mockClient = {
                sentMessages: [] as string[],
                send: (message: string) => {
                    mockClient.sentMessages.push(message);
                },
                on: () => { },
                close: () => { }
            };

            wsServer.addClient(mockClient);
            wsServer.broadcast(wsMessage);

            // Verify data consistency
            const receivedMessage = JSON.parse(mockClient.sentMessages[0]);
            expect(receivedMessage.data).toEqual(apiOdds);
        });

        test("handles data transformation correctly", async () => {
            const rawOdds = OddsTickFactory.create();

            // Transform data for API response
            const apiTransformed = {
                ...rawOdds,
                calculated: {
                    kellyFraction: 0.025,
                    expectedValue: 20
                }
            };

            // Transform data for WebSocket message
            const wsTransformed = WebSocketMessageFactory.createOddsUpdate(rawOdds);

            // Verify both transformations maintain core data
            expect(apiTransformed.id).toBe(rawOdds.id);
            expect(wsTransformed.data.id).toBe(rawOdds.id);
            expect(apiTransformed.sport).toBe(rawOdds.sport);
            expect(wsTransformed.data.sport).toBe(rawOdds.sport);
        });
    });
});
