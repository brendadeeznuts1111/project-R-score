// src/websocket-concurrent-demo.test.ts
// Demonstration of concurrent WebSocket testing patterns

import { test, describe, expect, beforeAll, afterAll } from "bun:test";
import { WebSocketMessage } from '../../packages/core/src/types/common';
import { createLogger } from '../../packages/core/src/utils/logger';

const logger = createLogger('WebSocketDemo');

// Mock WebSocket for demonstration
class MockWebSocket {
    static readyStates = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 };

    readyState: number = MockWebSocket.readyStates.OPEN;
    onopen?: () => void;
    onmessage?: (event: MessageEvent) => void;
    onerror?: (event: Event) => void;
    onclose?: () => void;

    private messageQueue: string[] = [];

    constructor(url: string) {
        logger.info(`🔌 MockWebSocket connecting to: ${url}`);
        // Simulate connection
        setTimeout(() => {
            this.readyState = MockWebSocket.readyStates.OPEN;
            if (this.onopen) this.onopen();
        }, 10);
    }

    send(data: string) {
        if (this.readyState === MockWebSocket.readyStates.OPEN) {
            console.log(`📤 Sending: ${data.substring(0, 50)}...`);
            // Simulate echo back
            setTimeout(() => {
                if (this.onmessage) {
                    this.onmessage(new MessageEvent('message', { data }));
                }
            }, Math.random() * 50);
        }
    }

    close() {
        this.readyState = MockWebSocket.readyStates.CLOSED;
        if (this.onclose) this.onclose();
    }
}

// Mock global WebSocket for testing
global.WebSocket = MockWebSocket as any;

// Test configuration
const SERVER_CONFIG = {
    port: 3001,
    host: "localhost"
};

const mockOddsData = {
    id: "test-odds-123",
    sport: "basketball",
    event: "Lakers vs Celtics",
    odds: { home: -110, away: -110 },
    timestamp: new Date().toISOString()
};

describe.concurrent("WebSocket Concurrent Testing Demo", () => {

    test.concurrent("handles multiple concurrent connections", async () => {
        console.log("🚀 Testing concurrent connections...");

        const connections = Array.from({ length: 5 }, (_, i) =>
            new MockWebSocket(`ws://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`)
        );

        // Wait for all connections to open
        await Promise.all(connections.map(ws =>
            new Promise<void>((resolve, reject) => {
                ws.onopen = () => resolve();
                ws.onerror = reject;
                setTimeout(reject, 1000);
            })
        ));

        // All connections should be successful
        connections.forEach(ws => {
            expect(ws.readyState).toBe(MockWebSocket.readyStates.OPEN);
        });

        console.log("✅ All 5 concurrent connections established");

        // Close all connections
        connections.forEach(ws => ws.close());
    });

    test.concurrent("concurrent message broadcasting", async () => {
        console.log("📡 Testing concurrent message broadcasting...");

        const client1 = new MockWebSocket(`ws://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);
        const client2 = new MockWebSocket(`ws://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);
        const client3 = new MockWebSocket(`ws://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);

        // Wait for connections
        await Promise.all([
            new Promise<void>(resolve => { client1.onopen = () => resolve(); }),
            new Promise<void>(resolve => { client2.onopen = () => resolve(); }),
            new Promise<void>(resolve => { client3.onopen = () => resolve(); })
        ]);

        const messages1: WebSocketMessage[] = [];
        const messages2: WebSocketMessage[] = [];
        const messages3: WebSocketMessage[] = [];

        client1.onmessage = (event) => messages1.push(JSON.parse(event.data));
        client2.onmessage = (event) => messages2.push(JSON.parse(event.data));
        client3.onmessage = (event) => messages3.push(JSON.parse(event.data));

        // Send concurrent messages
        const messagePromises = Array.from({ length: 10 }, (_, i) => {
            const message = {
                ...mockOddsData,
                id: `test-${i}`,
                timestamp: new Date().toISOString()
            };

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    if (client1.readyState === MockWebSocket.readyStates.OPEN) {
                        client1.send(JSON.stringify(message));
                    }
                    resolve();
                }, Math.random() * 100);
            });
        });

        await Promise.all(messagePromises);

        // Wait for messages to be processed
        await new Promise(resolve => setTimeout(resolve, 200));

        // All clients should receive messages
        expect(messages1.length).toBeGreaterThan(0);
        expect(messages2.length).toBeGreaterThan(0);
        expect(messages3.length).toBeGreaterThan(0);

        console.log(`✅ Broadcasting complete: ${messages1.length} messages received`);

        // Close connections
        client1.close();
        client2.close();
        client3.close();
    });

    test.concurrent("concurrent subscription management", async () => {
        console.log("📋 Testing concurrent subscription management...");

        const clients = Array.from({ length: 3 }, () =>
            new MockWebSocket(`ws://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`)
        );

        // Wait for connections
        await Promise.all(clients.map(ws =>
            new Promise<void>(resolve => { ws.onopen = () => resolve(); })
        ));

        // Subscribe to different channels concurrently
        const subscriptionPromises = clients.map((ws, index) => {
            return new Promise<void>((resolve) => {
                const subscription = {
                    type: "subscribe",
                    channels: [`basketball-${index}`, `arbitrage-${index}`]
                };

                ws.send(JSON.stringify(subscription));
                setTimeout(resolve, 50);
            });
        });

        await Promise.all(subscriptionPromises);

        // Verify subscriptions (no errors occurred)
        clients.forEach(ws => {
            expect(ws.readyState).toBe(MockWebSocket.readyStates.OPEN);
        });

        console.log("✅ All concurrent subscriptions completed");

        // Close connections
        clients.forEach(ws => ws.close());
    });

    test.concurrent("high-frequency message processing", async () => {
        console.log("⚡ Testing high-frequency message processing...");

        const client = new MockWebSocket(`ws://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`);

        await new Promise<void>(resolve => { client.onopen = () => resolve(); });

        let messageCount = 0;
        const startTime = performance.now();

        client.onmessage = (event) => {
            messageCount++;
            if (messageCount >= 100) {
                const duration = performance.now() - startTime;
                expect(duration).toBeLessThan(1000); // Should process 100 messages quickly
                console.log(`📡 Processed 100 messages in ${duration.toFixed(2)}ms`);
                client.close();
            }
        };

        // Send high-frequency messages
        for (let i = 0; i < 100; i++) {
            const message = {
                ...mockOddsData,
                id: `perf-test-${i}`,
                timestamp: new Date().toISOString()
            };

            if (client.readyState === MockWebSocket.readyStates.OPEN) {
                client.send(JSON.stringify(message));
            }
        }
    });

    test.concurrent("handles connection drops gracefully", async () => {
        console.log("🔌 Testing connection drop handling...");

        const clients = Array.from({ length: 3 }, () =>
            new MockWebSocket(`ws://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`)
        );

        // Wait for connections
        await Promise.all(clients.map(ws =>
            new Promise<void>(resolve => { ws.onopen = () => resolve(); })
        ));

        // Drop connections randomly
        const dropPromises = clients.map((ws, index) => {
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    ws.close();
                    console.log(`🔌 Client ${index} disconnected`);
                    resolve();
                }, Math.random() * 100);
            });
        });

        await Promise.all(dropPromises);

        // Verify all connections are closed
        clients.forEach(ws => {
            expect(ws.readyState).toBe(MockWebSocket.readyStates.CLOSED);
        });

        console.log("✅ Connection drops handled gracefully");
    });
});

describe.concurrent("Performance Benchmarks", () => {

    test.concurrent("concurrent client stress test", async () => {
        console.log("💪 Running concurrent client stress test...");

        const clientCount = 10;
        const messagesPerClient = 20;

        const clients = Array.from({ length: clientCount }, () =>
            new MockWebSocket(`ws://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`)
        );

        // Wait for all connections
        await Promise.all(clients.map(ws =>
            new Promise<void>(resolve => { ws.onopen = () => resolve(); })
        ));

        const startTime = performance.now();
        let totalMessages = 0;

        // Send messages from all clients concurrently
        const sendPromises = clients.map((client, clientIndex) => {
            return Promise.all(Array.from({ length: messagesPerClient }, (_, msgIndex) => {
                return new Promise<void>((resolve) => {
                    setTimeout(() => {
                        const message = {
                            ...mockOddsData,
                            id: `stress-${clientIndex}-${msgIndex}`,
                            timestamp: new Date().toISOString()
                        };

                        client.send(JSON.stringify(message));
                        totalMessages++;
                        resolve();
                    }, Math.random() * 50);
                });
            }));
        });

        await Promise.all(sendPromises);

        const duration = performance.now() - startTime;
        console.log(`💪 Stress test: ${totalMessages} messages in ${duration.toFixed(2)}ms`);

        // Performance assertion
        expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
        expect(totalMessages).toBe(clientCount * messagesPerClient);

        // Close all connections
        clients.forEach(ws => ws.close());
    });
});
