#!/usr/bin/env bun

/**
 * 🚀 Bun WebSocket Optimized Server for Sports Betting Protocol
 * 
 * Leveraging Bun's native WebSocket features:
 * - Pub/Sub for real-time odds distribution
 * - Compression for bandwidth optimization
 * - Backpressure handling for 700k+ msg/sec
 * - Connection pooling and management
 */

import type { ServerWebSocket, Server } from "bun";
import type { OddsTick, ArbitrageOpportunity } from "odds-core";
import { timeManager, BenchmarkTimer } from "./utils/time-manager";

// Client connection data
interface ClientData {
    id: string;
    subscribedMarkets: Set<string>;
    subscriptionType: "all" | "selective";
    connectedAt: Date;
    lastActivity: Date;
    messageCount: number;
}

// WebSocket data type for type safety
type WebSocketData = ClientData;

// Configuration for high-performance WebSocket server
interface WebSocketConfig {
    port?: number;
    hostname?: string;
    compression?: boolean | {
        compress?: boolean | "disable" | "shared" | "dedicated" | "3KB" | "4KB" | "8KB" | "16KB" | "32KB" | "64KB" | "128KB" | "256KB";
        decompress?: boolean | "disable" | "shared" | "dedicated" | "3KB" | "4KB" | "8KB" | "16KB" | "32KB" | "64KB" | "128KB" | "256KB";
    };
    maxPayloadLength?: number;
    idleTimeout?: number;
    backpressureLimit?: number;
    closeOnBackpressureLimit?: boolean;
}

// Message types for the protocol
interface WebSocketMessage {
    type: "odds" | "arbitrage" | "heartbeat" | "subscription" | "error";
    timestamp: Date;
    data: any;
    market?: string;
}

/**
 * High-Performance WebSocket Server for Sports Betting
 */
export class BunWebSocketOptimized {
    private server: Server<WebSocketData>;
    private clients: Map<string, ClientData> = new Map();
    private config: Required<WebSocketConfig>;
    private messageCount = 0;
    private startTime: Date;
    private performanceTimer: BenchmarkTimer;

    constructor(config: WebSocketConfig = {}) {
        this.config = {
            port: config.port || 3001,
            hostname: config.hostname || "0.0.0.0",
            compression: config.compression || {
                compress: "dedicated",
                decompress: "dedicated"
            },
            maxPayloadLength: config.maxPayloadLength || 1024 * 1024, // 1MB
            idleTimeout: config.idleTimeout || 30, // 30 seconds
            backpressureLimit: config.backpressureLimit || 1024 * 1024, // 1MB
            closeOnBackpressureLimit: config.closeOnBackpressureLimit || false,
        };

        this.startTime = timeManager.now();
        this.performanceTimer = new BenchmarkTimer('websocket-server');
        this.server = this.createServer();
    }

    /**
     * Create the optimized Bun WebSocket server
     */
    private createServer(): Server<WebSocketData> {
        return Bun.serve({
            hostname: this.config.hostname,
            port: this.config.port,

            fetch: (req, server) => {
                const url = new URL(req.url);

                // WebSocket upgrade endpoint
                if (url.pathname === "/ws") {
                    return this.handleUpgrade(req, server);
                }

                // Health check endpoint
                if (url.pathname === "/health") {
                    return new Response(JSON.stringify({
                        status: "healthy",
                        clients: this.clients.size,
                        messageCount: this.messageCount,
                        uptime: timeManager.nowMs() - this.startTime.getTime(),
                        performance: this.getPerformanceMetrics(),
                        timestamp: timeManager.now().toISOString()
                    }), {
                        headers: { "Content-Type": "application/json" }
                    });
                }

                // Static files or API routes
                return new Response("WebSocket server running", { status: 200 });
            },

            websocket: {
                // WebSocket configuration
                perMessageDeflate: this.config.compression,
                maxPayloadLength: this.config.maxPayloadLength,
                idleTimeout: this.config.idleTimeout,
                backpressureLimit: this.config.backpressureLimit,
                closeOnBackpressureLimit: this.config.closeOnBackpressureLimit,

                // Type-safe client data
                data: {} as ClientData,

                // Connection opened
                open: (ws) => {
                    const clientId = this.generateClientId();
                    const now = timeManager.now();
                    const clientData: ClientData = {
                        id: clientId,
                        subscribedMarkets: new Set(),
                        subscriptionType: "selective",
                        connectedAt: now,
                        lastActivity: now,
                        messageCount: 0
                    };

                    // Store client data
                    this.clients.set(clientId, clientData);
                    ws.data = clientData;

                    console.log(`🔗 Client connected: ${clientId} (${ws.remoteAddress})`);

                    // Send welcome message
                    this.sendToClient(ws, {
                        type: "heartbeat",
                        timestamp: now,
                        data: { clientId, message: "Connected to sports betting WebSocket" }
                    });

                    // Subscribe to global odds feed by default
                    ws.subscribe("global-odds");
                    ws.subscribe("global-arbitrage");
                },

                // Message received
                message: (ws, message) => {
                    try {
                        const clientData = ws.data as ClientData;
                        const now = timeManager.now();
                        clientData.lastActivity = now;
                        clientData.messageCount++;

                        // Parse message
                        const parsedMessage: WebSocketMessage = JSON.parse(message.toString());

                        switch (parsedMessage.type) {
                            case "subscription":
                                this.handleSubscription(ws, parsedMessage);
                                break;

                            case "heartbeat":
                                this.sendToClient(ws, {
                                    type: "heartbeat",
                                    timestamp: now,
                                    data: {
                                        message: "pong",
                                        clientId: clientData.id,
                                        serverTime: now.toISOString()
                                    }
                                });
                                break;

                            default:
                                console.log(`📨 Received message from ${clientData.id}:`, parsedMessage.type);
                        }
                    } catch (error) {
                        console.error("❌ Message parsing error:", error);
                        this.sendToClient(ws, {
                            type: "error",
                            timestamp: Date.now(),
                            data: { error: "Invalid message format" }
                        });
                    }
                },

                // Connection closed
                close: (ws, code, message) => {
                    const clientData = ws.data as ClientData;
                    if (clientData?.id) {
                        console.log(`🔌 Client disconnected: ${clientData.id} (${code}: ${message})`);
                        this.clients.delete(clientData.id);
                    }
                },
            }
        });
    }

    /**
     * Handle WebSocket upgrade
     */
    private handleUpgrade(req: Request, server: Server<ClientData>): Response | undefined {
        const success = server.upgrade(req, {
            headers: {
                "X-Protocol-Version": "1.0.0",
                "X-Server-Timestamp": Date.now().toString()
            },
            data: {
                id: "",
                subscribedMarkets: new Set(),
                subscriptionType: "selective",
                connectedAt: new Date(),
                lastActivity: new Date(),
                messageCount: 0
            } as ClientData
        });

        if (success) {
            return undefined; // WebSocket upgrade successful
        }

        return new Response("WebSocket upgrade failed", { status: 400 });
    }

    /**
     * Handle client subscription requests
     */
    private handleSubscription(ws: ServerWebSocket<ClientData>, message: WebSocketMessage): void {
        const clientData = ws.data;

        if (message.data.markets) {
            // Subscribe to specific markets
            message.data.markets.forEach((market: string) => {
                if (!clientData.subscribedMarkets.has(market)) {
                    clientData.subscribedMarkets.add(market);
                    ws.subscribe(`market-${market}`);
                }
            });
        }

        if (message.data.arbitrage) {
            ws.subscribe("arbitrage-opportunities");
        }

        this.sendToClient(ws, {
            type: "subscription",
            timestamp: timeManager.now(),
            data: {
                subscribedMarkets: Array.from(clientData.subscribedMarkets),
                subscriptionType: clientData.subscriptionType
            }
        });
    }

    /**
     * Send message to specific client with backpressure handling
     */
    private sendToClient(ws: ServerWebSocket<ClientData>, message: WebSocketMessage): void {
        try {
            const result = ws.send(JSON.stringify(message), true); // Enable compression

            if (result === -1) {
                console.log(`⚠️ Backpressure detected for client: ${ws.data.id}`);
            } else if (result === 0) {
                console.log(`❌ Message dropped for client: ${ws.data.id}`);
            } else {
                this.messageCount++;
            }
        } catch (error) {
            console.error(`❌ Send error for client ${ws.data.id}:`, error);
        }
    }

    /**
     * Broadcast odds data to all subscribed clients
     */
    public broadcastOdds(odds: OddsTick): void {
        const now = timeManager.now();
        const message: WebSocketMessage = {
            type: "odds",
            timestamp: now,
            data: odds,
            market: odds.gameId || "unknown"
        };

        // Publish to global odds feed
        this.server.publish("global-odds", JSON.stringify(message), true);

        // Publish to market-specific topic
        this.server.publish(`market-${odds.gameId || "unknown"}`, JSON.stringify(message), true);

        this.messageCount++;
    }

    /**
     * Broadcast arbitrage opportunities
     */
    public broadcastArbitrage(opportunity: ArbitrageOpportunity): void {
        const now = timeManager.now();
        const message: WebSocketMessage = {
            type: "arbitrage",
            timestamp: now,
            data: opportunity
        };

        this.server.publish("global-arbitrage", JSON.stringify(message), true);
        this.server.publish("arbitrage-opportunities", JSON.stringify(message), true);

        this.messageCount++;
    }

    /**
     * Send heartbeat to all clients
     */
    public broadcastHeartbeat(): void {
        const now = timeManager.now();
        const uptimeMs = now.getTime() - this.startTime.getTime();
        const message: WebSocketMessage = {
            type: "heartbeat",
            timestamp: now,
            data: {
                message: "ping",
                clientCount: this.clients.size,
                messageCount: this.messageCount,
                uptime: uptimeMs,
                uptimeFormatted: timeManager.formatDuration(uptimeMs, 'milliseconds')
            }
        };

        this.server.publish("global-odds", JSON.stringify(message), true);
    }

    /**
     * Get performance metrics with enhanced timing
     */
    public getPerformanceMetrics(): any {
        const now = timeManager.now();
        const uptimeMs = now.getTime() - this.startTime.getTime();
        const performanceMs = timeManager.performanceMs();

        return {
            uptime: uptimeMs,
            uptimeFormatted: timeManager.formatDuration(uptimeMs, 'milliseconds'),
            performanceTime: performanceMs,
            performanceTimeFormatted: timeManager.formatDuration(performanceMs, 'milliseconds'),
            nanoseconds: timeManager.nanoseconds(),
            clients: this.clients.size,
            messageCount: this.messageCount,
            messagesPerSecond: uptimeMs > 0 ? Math.round((this.messageCount / uptimeMs) * 1000) : 0,
            pendingWebSockets: this.server.pendingWebSockets,
            memoryUsage: process.memoryUsage(),
            averageMessageSize: this.messageCount > 0 ? Math.round(process.memoryUsage().heapUsed / this.messageCount) : 0,
            timestamp: now.toISOString()
        };
    }

    /**
     * Generate unique client ID with enhanced timing
     */
    private generateClientId(): string {
        return `client-${timeManager.nowMs()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Start the server
     */
    public start(): void {
        console.log(`🚀 Bun WebSocket Server starting on ${this.config.hostname}:${this.config.port}`);
        console.log(`📊 Configuration:`, {
            compression: this.config.compression,
            maxPayloadLength: this.config.maxPayloadLength,
            idleTimeout: this.config.idleTimeout,
            backpressureLimit: this.config.backpressureLimit
        });
    }

    /**
     * Stop the server
     */
    public stop(): void {
        console.log("🛑 Shutting down WebSocket server...");
        this.server.stop();
    }

    /**
     * Get server instance
     */
    public getServer(): Server<WebSocketData> {
        return this.server;
    }
}
