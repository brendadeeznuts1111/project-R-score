// WebSocket Tests Entry Point
// Exports all test utilities and configurations for WebSocket testing

// Re-export testing infrastructure
export * from "@testing/factories";
export * from "@testing/utils";
export * from "@testing/contracts";

// Import enhanced server for testing
import { BunV13WebSocketServer } from "../server-v13-enhanced";
import type { WebSocketServerConfig } from "../types";

// WebSocket-specific test configurations
export const WebSocketTestConfig = {
    // Default server configuration for tests
    defaultServerConfig: {
        port: 0, // Random port for testing
        maxConnections: 100,
        enableCompression: true,
        heartbeatInterval: 5000,
        enableMetrics: true,
        enableLogging: false
    },

    // Performance thresholds
    performance: {
        maxMessageProcessingTime: 10, // ms
        minBroadcastThroughput: 50000, // messages/sec
        maxConnectionSetupTime: 1000, // ms
        maxMemoryIncreasePerClient: 1024 * 1024, // 1MB
        minConcurrentConnections: 50
    },

    // Test timeouts
    timeouts: {
        connection: 5000,
        message: 2000,
        broadcast: 1000,
        performance: 30000,
        e2e: 15000
    },

    // Test data sizes
    dataSizes: {
        smallBatch: 10,
        mediumBatch: 100,
        largeBatch: 1000,
        extremeBatch: 10000
    }
};

// WebSocket test utilities
export class WebSocketTestUtils {
    /**
     * Create a test WebSocket server with default configuration
     */
    static createTestServer(overrides: any = {}) {
        const config = { ...WebSocketTestConfig.defaultServerConfig, ...overrides };
        return new BunV13WebSocketServer(config);
    }

    /**
     * Wait for WebSocket connection with timeout
     */
    static async waitForConnection(ws: WebSocket, timeout: number = WebSocketTestConfig.timeouts.connection): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Connection timeout after ${timeout}ms`));
            }, timeout);

            ws.on('open', () => {
                clearTimeout(timeoutId);
                resolve();
            });

            ws.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }

    /**
     * Wait for specific message type with timeout
     */
    static async waitForMessage(
        ws: WebSocket,
        messageType: string,
        timeout: number = WebSocketTestConfig.timeouts.message
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Message timeout after ${timeout}ms`));
            }, timeout);

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === messageType) {
                        clearTimeout(timeoutId);
                        resolve(message);
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });

            ws.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }

    /**
     * Create multiple test clients
     */
    static async createTestClients(
        serverUrl: string,
        count: number,
        timeout: number = WebSocketTestConfig.timeouts.connection
    ): Promise<WebSocket[]> {
        const clients: WebSocket[] = [];

        for (let i = 0; i < count; i++) {
            const ws = new WebSocket(serverUrl);
            await this.waitForConnection(ws, timeout);
            clients.push(ws);
        }

        return clients;
    }

    /**
     * Close multiple clients cleanly
     */
    static async closeClients(clients: WebSocket[]): Promise<void> {
        const closePromises = clients.map(ws => {
            return new Promise<void>((resolve) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.on('close', () => resolve());
                    ws.close();
                } else {
                    resolve();
                }
            });
        });

        await Promise.all(closePromises);
    }

    /**
     * Measure message round-trip time
     */
    static async measureRoundTripTime(
        server: BunV13WebSocketServer,
        client: WebSocket,
        message: any
    ): Promise<number> {
        const startTime = performance.now();

        // Send message through server
        server.broadcast(message);

        // Wait for echo
        await this.waitForMessage(client, message.type);

        return performance.now() - startTime;
    }

    /**
     * Generate load test scenario
     */
    static generateLoadTest(config: {
        clientCount: number;
        messagesPerClient: number;
        messageInterval: number;
        duration: number;
    }) {
        const { clientCount, messagesPerClient, messageInterval, duration } = config;

        return {
            clientCount,
            messagesPerClient,
            messageInterval,
            duration,
            totalMessages: clientCount * messagesPerClient,
            expectedThroughput: (clientCount * messagesPerClient) / (duration / 1000)
        };
    }

    /**
     * Validate WebSocket message structure
     */
    static validateMessage(message: any, expectedType?: string): boolean {
        if (!message || typeof message !== 'object') return false;
        if (!message.type || typeof message.type !== 'string') return false;
        if (!message.timestamp || typeof message.timestamp !== 'string') return false;
        if (!message.data || typeof message.data !== 'object') return false;

        if (expectedType && message.type !== expectedType) return false;

        // Validate timestamp format
        const timestamp = new Date(message.timestamp);
        if (isNaN(timestamp.getTime())) return false;

        return true;
    }

    /**
     * Create test scenario with realistic data
     */
    static createRealisticScenario() {
        return {
            // Basketball game with multiple bookmakers
            basketballGame: {
                sport: 'basketball',
                event: 'Lakers vs Celtics',
                bookmakers: [
                    { name: 'BookMakerA', odds: { home: -110, away: -110 } },
                    { name: 'BookMakerB', odds: { home: -105, away: -115 } },
                    { name: 'BookMakerC', odds: { home: -108, away: -112 } }
                ]
            },

            // Football game with spread betting
            footballGame: {
                sport: 'football',
                event: 'Patriots vs Cowboys',
                bookmakers: [
                    { name: 'SportsBook1', odds: { home: -120, away: +100 }, spread: -3.5 },
                    { name: 'SportsBook2', odds: { home: -115, away: +105 }, spread: -3.0 }
                ]
            },

            // High-frequency trading scenario
            highFrequency: {
                messageRate: 100, // messages per second
                duration: 60000, // 1 minute
                volatility: 0.02 // 2% price volatility
            }
        };
    }
}

// Performance testing utilities
export class WebSocketPerformanceTester {
    private results: Array<{ name: string; value: number; unit: string }> = [];

    /**
     * Measure server throughput
     */
    async measureThroughput(
        server: BunV13WebSocketServer,
        messageCount: number,
        clientCount: number = 1
    ): Promise<number> {
        const startTime = performance.now();

        // Create mock clients
        const mockClients = Array.from({ length: clientCount }, () => ({
            send: () => { },
            readyState: 1 // OPEN
        }));

        mockClients.forEach(client => server.handleConnection(client as any));

        // Send messages
        for (let i = 0; i < messageCount; i++) {
            const message = {
                type: 'throughput-test',
                timestamp: new Date().toISOString(),
                data: { index: i }
            };
            server.broadcast(message);
        }

        const duration = performance.now() - startTime;
        const throughput = (messageCount * clientCount) / (duration / 1000);

        this.results.push({ name: 'throughput', value: throughput, unit: 'messages/sec' });
        return throughput;
    }

    /**
     * Measure memory usage
     */
    async measureMemoryUsage(
        server: BunV13WebSocketServer,
        clientCount: number,
        messageCount: number
    ): Promise<number> {
        const initialMemory = process.memoryUsage().heapUsed;

        // Create clients and send messages
        const mockClients = Array.from({ length: clientCount }, (_, i) => ({
            id: `memory-test-${i}`,
            send: () => { },
            readyState: 1,
            data: new Array(1000).fill(null).map(() => ({ test: 'data' }))
        }));

        mockClients.forEach(client => server.handleConnection(client as any, { id: client.id }));

        for (let i = 0; i < messageCount; i++) {
            const message = {
                type: 'memory-test',
                timestamp: new Date().toISOString(),
                data: { index: i, payload: 'x'.repeat(100) }
            };
            server.broadcast(message);
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;

        this.results.push({ name: 'memory-usage', value: memoryIncrease, unit: 'bytes' });
        return memoryIncrease;
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        return {
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: {
                totalTests: this.results.length,
                passedTests: this.results.filter(r =>
                    (r.name === 'throughput' && r.value > 1000) ||
                    (r.name === 'memory-usage' && r.value < 100 * 1024 * 1024)
                ).length
            }
        };
    }

    /**
     * Reset results
     */
    reset() {
        this.results = [];
    }
}

// Export convenience functions
export const createTestServer = WebSocketTestUtils.createTestServer;
export const waitForConnection = WebSocketTestUtils.waitForConnection;
export const waitForMessage = WebSocketTestUtils.waitForMessage;
export const createTestClients = WebSocketTestUtils.createTestClients;
export const closeClients = WebSocketTestUtils.closeClients;

// Default export
export default {
    WebSocketTestConfig,
    WebSocketTestUtils,
    WebSocketPerformanceTester,
    createTestServer,
    waitForConnection,
    waitForMessage,
    createTestClients,
    closeClients
};
