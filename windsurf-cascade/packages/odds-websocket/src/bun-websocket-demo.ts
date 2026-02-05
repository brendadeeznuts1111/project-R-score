#!/usr/bin/env bun

/**
 * 🚀 Bun WebSocket Demo - Sports Betting Protocol
 * 
 * Demonstrates the key features of the optimized WebSocket server:
 * - Real-time odds broadcasting
 * - Pub/Sub messaging
 * - Compression
 * - Performance monitoring
 */

import { BunWebSocketOptimized } from "./bun-websocket-optimized";
import type { OddsTick, ArbitrageOpportunity } from "odds-core";

// Mock data generators
function generateMockOdds(): OddsTick {
    const markets = ["nba", "nfl", "mlb", "nhl", "soccer"];
    const exchanges = ["betfair", "draftkings", "fanduel", "williamhill"];
    const market = markets[Math.floor(Math.random() * markets.length)] || "nba";
    const exchange = exchanges[Math.floor(Math.random() * exchanges.length)] || "betfair";

    return {
        exchange: exchange,
        gameId: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        line: Math.floor(Math.random() * 10) + 1, // 1-10 point line
        juice: -110, // Standard juice
        timestamp: new Date(Date.now()),
        price: 1.5 + Math.random() * 2,
        size: Math.floor(Math.random() * 10000),
        ask: 1.95 + Math.random() * 0.1,
        bid: 1.85 - Math.random() * 0.1
    };
}

function generateMockArbitrage(): ArbitrageOpportunity {
    const exchanges = ["betfair", "draftkings", "fanduel", "williamhill"];
    const exchange1 = exchanges[Math.floor(Math.random() * exchanges.length)] || "betfair";
    const exchange2 = exchanges.filter((e) => e !== exchange1)[Math.floor(Math.random() * (exchanges.length - 1))] || "draftkings";
    const now = new Date(Date.now());

    return {
        id: `arb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        exchangeA: exchange1,
        exchangeB: exchange2,
        lineA: Math.floor(Math.random() * 10) + 1,
        lineB: Math.floor(Math.random() * 10) + 1,
        juiceA: -110,
        juiceB: -108,
        edge: Math.round(Math.random() * 5 * 100) / 100, // 0-5% edge
        kellyFraction: Math.round((Math.random() * 0.1) * 1000) / 1000, // 0-10% Kelly
        timestamp: now,
        expiry: new Date(now.getTime() + 300000) // 5 minutes expiry
    };
}

async function runDemo(): Promise<void> {
    console.log("🚀 Starting Bun WebSocket Demo for Sports Betting Protocol");
    console.log("=".repeat(60));

    // Initialize the optimized server
    const wsServer = new BunWebSocketOptimized({
        port: 3010,
        hostname: "0.0.0.0",
        compression: {
            compress: "dedicated",
            decompress: "dedicated"
        },
        maxPayloadLength: 1024 * 1024,
        idleTimeout: 60,
        backpressureLimit: 1024 * 1024,
        closeOnBackpressureLimit: false
    });

    // Start the server
    wsServer.start();

    console.log("✅ WebSocket server started!");
    console.log("🔗 Connect to: ws://localhost:3010/ws");
    console.log("📊 Health check: http://localhost:3010/health");
    console.log();

    // Start broadcasting odds data
    console.log("📡 Starting real-time odds broadcast...");
    const oddsInterval = setInterval(() => {
        const odds = generateMockOdds();
        wsServer.broadcastOdds(odds);
    }, 100); // Every 100ms

    // Start broadcasting arbitrage opportunities
    console.log("💰 Starting arbitrage opportunity broadcast...");
    const arbitrageInterval = setInterval(() => {
        const arbitrage = generateMockArbitrage();
        wsServer.broadcastArbitrage(arbitrage);
    }, 3000); // Every 3 seconds

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
        wsServer.broadcastHeartbeat();
    }, 30000);

    // Performance monitoring
    let messageCount = 0;
    const monitoringInterval = setInterval(() => {
        const metrics = wsServer.getPerformanceMetrics();
        console.log(`📊 Performance: ${metrics.clients} clients | ${metrics.messagesPerSecond} msg/sec | ${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB memory | uptime: ${Math.floor(metrics.uptime / 1000)}s`);
    }, 5000);

    // Show client connection examples
    console.log();
    console.log("📝 Client Connection Examples:");
    console.log();
    console.log("JavaScript/TypeScript:");
    console.log(`const ws = new WebSocket('ws://localhost:3010/ws');`);
    console.log(`ws.onopen = () => {`);
    console.log(`  ws.send(JSON.stringify({`);
    console.log(`    type: 'subscription',`);
    console.log(`    timestamp: Date.now(),`);
    console.log(`    data: { markets: ['NBA', 'NFL'], arbitrage: true }`);
    console.log(`  }));`);
    console.log(`};`);
    console.log();

    console.log("Python:");
    console.log(`import asyncio`);
    console.log(`import websockets`);
    console.log(`import json`);
    console.log();
    console.log(`async def client():`);
    console.log(`    async with websockets.connect('ws://localhost:3010/ws') as ws:`);
    console.log(`        await ws.send(json.dumps({`);
    console.log(`            "type": "subscription",`);
    console.log(`            "timestamp": int(time.time() * 1000),`);
    console.log(`            "data": {"markets": ["NBA", "NFL"], "arbitrage": True}`);
    console.log(`        }))`);
    console.log(`        async for message in ws:`);
    console.log(`            data = json.loads(message)`);
    console.log(`            print(f"Received: {data['type']}")`);
    console.log();
    console.log(`asyncio.run(client())`);
    console.log();

    console.log("curl (for health check):");
    console.log(`curl http://localhost:3010/health`);
    console.log();

    // Graceful shutdown
    process.on("SIGINT", () => {
        console.log("\n🛑 Shutting down demo server...");

        clearInterval(oddsInterval);
        clearInterval(arbitrageInterval);
        clearInterval(heartbeatInterval);
        clearInterval(monitoringInterval);

        const finalMetrics = wsServer.getPerformanceMetrics();
        console.log(`📊 Final Metrics:`);
        console.log(`   Total clients served: ${finalMetrics.clients}`);
        console.log(`   Total messages sent: ${finalMetrics.messageCount}`);
        console.log(`   Average messages/sec: ${finalMetrics.messagesPerSecond}`);
        console.log(`   Total uptime: ${Math.floor(finalMetrics.uptime / 1000)}s`);
        console.log(`   Peak memory usage: ${Math.round(finalMetrics.memoryUsage.heapUsed / 1024 / 1024)}MB`);

        wsServer.stop();
        console.log("✅ Demo server stopped");
        process.exit(0);
    });

    console.log("🎯 Demo is running! Press Ctrl+C to stop.");
    console.log();
}

// Run demo if this file is executed directly
if (import.meta.main) {
    runDemo().catch(console.error);
}
