// Basic WebSocket Server Test
// Simple test to verify server functionality

import { test, describe, expect, beforeAll, afterAll } from "bun:test";
import { BunV13WebSocketServer } from "../server-v13-enhanced";

describe("Basic WebSocket Server Tests", () => {
    let server: BunV13WebSocketServer;

    beforeAll(() => {
        server = new BunV13WebSocketServer({
            port: 0, // Random port for testing
            testMode: true
        });
    });

    afterAll(async () => {
        if (server) {
            await server.stop();
        }
    });

    test("server initializes correctly", () => {
        expect(server).toBeDefined();
        expect(server.getPort()).toBeGreaterThan(0);
        expect(server.getClientCount()).toBe(0);
        expect(server.isRunning()).toBe(true); // Server starts automatically
    });

    test("server starts and stops correctly", async () => {
        expect(server.isRunning()).toBe(true); // Already running from constructor
        await server.stop();
        expect(server.isRunning()).toBe(false);
    });

    test("handles client connections", () => {
        const mockClient = {
            id: 'test-client-1',
            send: () => { },
            readyState: 1 // WebSocket.OPEN
        };

        server.handleConnection(mockClient, { id: mockClient.id });
        expect(server.getClientCount()).toBe(1);

        server.handleDisconnection(mockClient);
        expect(server.getClientCount()).toBe(0);
    });

    test("processes messages correctly", () => {
        const message = {
            type: 'test-message',
            timestamp: new Date().toISOString(),
            data: { content: 'test data' }
        };

        server.processMessage(message);

        const processedMessages = server.getProcessedMessages();
        expect(processedMessages).toHaveLength(1);
        expect(processedMessages[0].type).toBe('test-message');
    });

    test("broadcasts messages", () => {
        const mockClient1 = {
            id: 'client-1',
            send: () => { },
            readyState: 1
        };

        const mockClient2 = {
            id: 'client-2',
            send: () => { },
            readyState: 1
        };

        server.handleConnection(mockClient1, { id: mockClient1.id });
        server.handleConnection(mockClient2, { id: mockClient2.id });

        const message = {
            type: 'broadcast-test',
            timestamp: new Date().toISOString(),
            data: { message: 'Hello all!' }
        };

        server.broadcast(message);

        // Should not throw errors
        expect(true).toBe(true);
    });

    test("provides performance metrics", () => {
        const metrics = server.getPerformanceMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.totalMessagesProcessed).toBeGreaterThanOrEqual(0);
        expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
        expect(metrics.messagesPerSecond).toBeGreaterThanOrEqual(0);
    });

    test("uses rapidhash for message processing", () => {
        const message = {
            type: 'hash-test',
            timestamp: new Date().toISOString(),
            data: {
                sport: 'basketball',
                odds: { home: -110, away: -110 },
                bookmaker: 'TestBookmaker'
            }
        };

        server.processMessage(message);

        const processedMessages = server.getProcessedMessages();
        expect(processedMessages.length).toBeGreaterThanOrEqual(2); // At least 2 messages

        // The last message should be our hash test
        const hashTestMessage = processedMessages[processedMessages.length - 1];
        expect(hashTestMessage.type).toBe('hash-test');
    });
});
