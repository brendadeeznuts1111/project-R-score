#!/usr/bin/env bun

/**
 * 📚 Bun WebSocket Usage Example
 * 
 * Demonstrates how to use the optimized WebSocket server
 * for real-time sports betting data streaming
 */

import { BunWebSocketOptimized } from "./bun-websocket-optimized";
import type { OddsTick, ArbitrageOpportunity } from "odds-core";

// Example usage of the optimized WebSocket server
async function runWebSocketExample() {
    console.log("🚀 Starting Bun WebSocket Example for Sports Betting Protocol");

    // Initialize the optimized server
    const wsServer = new BunWebSocketOptimized({
        port: 3001,
        hostname: "0.0.0.0",

        // High-performance compression settings
        compression: {
            compress: "dedicated",  // Best for high throughput
            decompress: "dedicated"
        },

        // Optimized for 700k+ msg/sec
        maxPayloadLength: 1024 * 1024,  // 1MB
        idleTimeout: 30,                 // 30 seconds
        backpressureLimit: 1024 * 1024, // 1MB
        closeOnBackpressureLimit: false  // Keep connections alive
    });

    // Start the server
    wsServer.start();

    // Simulate real-time odds data
    const markets = ["NBA", "NFL", "MLB", "NHL", "Soccer"];
    const exchanges = ["betfair", "draftkings", "fanduel", "williamhill"];

    // Function to generate mock odds data
    function generateMockOdds(): OddsTick {
        const market = markets[Math.floor(Math.random() * markets.length)];
        const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];

        return {
            exchange: exchange || "betfair",
            gameId: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            line: Math.floor(Math.random() * 10) + 1,
            juice: -110,
            timestamp: new Date(Date.now()),
            price: 1.5 + Math.random() * 2,
            size: Math.floor(Math.random() * 10000),
            ask: 1.95 + Math.random() * 0.1,
            bid: 1.85 - Math.random() * 0.1
        };
    }

    // Function to generate mock arbitrage opportunities
    function generateMockArbitrage(): ArbitrageOpportunity {
        const exchange1 = exchanges[Math.floor(Math.random() * exchanges.length)] || "betfair";
        const exchange2 = exchanges.filter(e => e !== exchange1)[Math.floor(Math.random() * (exchanges.length - 1))] || "draftkings";

        return {
            id: `arb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            exchangeA: exchange1,
            exchangeB: exchange2,
            lineA: Math.floor(Math.random() * 10) + 1,
            lineB: Math.floor(Math.random() * 10) + 1,
            juiceA: -110,
            juiceB: -108,
            edge: Math.round(Math.random() * 5 * 100) / 100,
            kellyFraction: Math.round((Math.random() * 0.1) * 1000) / 1000,
            timestamp: new Date(Date.now()),
            expiry: new Date(Date.now() + 300000)
        };
    }

    // Start broadcasting odds data
    console.log("📡 Starting real-time odds broadcast...");

    const oddsInterval = setInterval(() => {
        const odds = generateMockOdds();
        wsServer.broadcastOdds(odds);
    }, 50); // New odds every 50ms (20 per second)

    // Start broadcasting arbitrage opportunities
    console.log("💰 Starting arbitrage opportunity broadcast...");

    const arbitrageInterval = setInterval(() => {
        const arbitrage = generateMockArbitrage();
        wsServer.broadcastArbitrage(arbitrage);
    }, 2000); // New arbitrage every 2 seconds

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
        wsServer.broadcastHeartbeat();
    }, 30000);

    // Performance monitoring
    const monitoringInterval = setInterval(() => {
        const metrics = wsServer.getPerformanceMetrics();
        console.log(`📊 Performance Metrics:`, {
            clients: metrics.clients,
            messagesPerSecond: metrics.messagesPerSecond,
            totalMessages: metrics.messageCount,
            uptime: `${Math.floor(metrics.uptime / 1000)}s`,
            memoryUsage: `${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`
        });
    }, 10000); // Every 10 seconds

    // Graceful shutdown
    process.on("SIGINT", () => {
        console.log("\n🛑 Shutting down WebSocket server...");

        clearInterval(oddsInterval);
        clearInterval(arbitrageInterval);
        clearInterval(heartbeatInterval);
        clearInterval(monitoringInterval);

        wsServer.stop();
        process.exit(0);
    });

    console.log("✅ WebSocket server is running!");
    console.log("🔗 Connect to: ws://localhost:3001/ws");
    console.log("📊 Health check: http://localhost:3001/health");
    console.log("\n📝 Client Usage Example:");
    console.log(`
// JavaScript/TypeScript Client
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onopen = () => {
  // Subscribe to specific markets
  ws.send(JSON.stringify({
    type: 'subscription',
    timestamp: Date.now(),
    data: {
      markets: ['NBA', 'NFL'],
      arbitrage: true
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message.type, message.data);
};

// Python Client Example
import asyncio
import websockets
import json

async def client():
    uri = "ws://localhost:3001/ws"
    async with websockets.connect(uri) as websocket:
        # Subscribe to markets
        await websocket.send(json.dumps({
            "type": "subscription",
            "timestamp": int(time.time() * 1000),
            "data": {
                "markets": ["NBA", "NFL"],
                "arbitrage": True
            }
        }))
        
        # Listen for messages
        async for message in websocket:
            data = json.loads(message)
            print(f"Received: {data['type']} - {data['data']}")

asyncio.run(client())
  `);
}

// CLI Client Example
class WebSocketCLI {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnects = 5;

    constructor(private url: string) {
        this.connect();
    }

    private connect() {
        this.ws = new WebSocket(this.url);

        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log("🔗 Connected to WebSocket server");
            this.reconnectAttempts = 0;

            // Subscribe to all markets
            this.ws?.send(JSON.stringify({
                type: "subscription",
                timestamp: Date.now(),
                data: {
                    markets: ["NBA", "NFL", "MLB", "NHL", "Soccer"],
                    arbitrage: true
                }
            }));
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data.toString());
            this.handleMessage(message);
        };

        this.ws.onclose = () => {
            console.log("🔌 Disconnected from WebSocket server");
            this.handleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error("❌ WebSocket error:", error);
        };
    }

    private handleMessage(message: any) {
        switch (message.type) {
            case "odds":
                console.log(`📈 [${message.data.market}] ${message.data.exchange}:`, {
                    home: message.data.odds.home,
                    away: message.data.odds.away,
                    draw: message.data.odds.draw || "N/A"
                });
                break;

            case "arbitrage":
                console.log(`💰 Arbitrage Opportunity:`, {
                    profit: `${message.data.profit}%`,
                    confidence: `${message.data.confidence}%`,
                    markets: message.data.markets.join(", ")
                });
                break;

            case "heartbeat":
                console.log(`💓 Heartbeat:`, {
                    clients: message.data.clientCount,
                    messages: message.data.messageCount,
                    uptime: `${Math.floor(message.data.uptime / 1000)}s`
                });
                break;

            default:
                console.log(`📨 Unknown message type: ${message.type}`);
        }
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnects) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnects})`);

            setTimeout(() => {
                this.connect();
            }, 1000 * this.reconnectAttempts);
        } else {
            console.error("❌ Max reconnection attempts reached");
        }
    }

    public send(message: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error("❌ WebSocket is not connected");
        }
    }

    public close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Export for use in other modules
export { runWebSocketExample, WebSocketCLI };

// Run example if this file is executed directly
if (import.meta.main) {
    runWebSocketExample().catch(console.error);
}
