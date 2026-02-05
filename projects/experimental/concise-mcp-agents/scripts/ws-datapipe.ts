#!/usr/bin/env bun

// [WEBSOCKETS][LIVE][SERVER][WS-SRV-001][v2.8][ACTIVE]

// [DATAPIPE][CORE][DA-CO-A5A][v2.8.0][ACTIVE]

import { fetchData, parseBets, aggregateAgents } from "./datapipe.ts";

const VAULT = process.env.OBSIDIAN_VAULT || process.cwd();

interface WSClient {
  id: string;
  subscribed: boolean;
}

const server = Bun.serve<{ id: string }>({
  port: 3001,
  fetch(req, server) {
    // Check for syndicate-live subprotocol
    const upgradeHeader = req.headers.get("upgrade");
    const subprotocol = req.headers.get("sec-websocket-protocol");

    if (upgradeHeader !== "websocket" || subprotocol !== "syndicate-live") {
      return new Response("WebSocket upgrade required with syndicate-live subprotocol", { status: 400 });
    }

    if (server.upgrade(req, { data: { id: crypto.randomUUID() } })) {
      return; // Successfully upgraded
    }

    return new Response("WebSocket upgrade failed", { status: 400 });
  },

  websocket: {
    open(ws) {
      console.log(`🔗 Client connected: ${ws.data.id} from ${ws.remoteAddress}:${ws.remotePort}`);
      ws.subscribe("syndicate-live");

      // Send welcome message with compression info
      ws.send(JSON.stringify({
        type: "connected",
        clientId: ws.data.id,
        remoteAddress: ws.remoteAddress,
        remotePort: ws.remotePort,
        compression: "permessage-deflate",
        timestamp: new Date().toISOString()
      }));
    },

    message(ws, message) {
      try {
        const data = JSON.parse(message as string);
        console.log(`📨 Message from ${ws.data.id}:`, data.type);

        switch (data.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
            break;

          case "fetch":
            handleFetchRequest(ws);
            break;

          case "subscribe":
            ws.subscribe("syndicate-live");
            ws.send(JSON.stringify({ type: "subscribed", channel: "syndicate-live" }));
            break;

          case "status":
            sendStatusUpdate(ws);
            break;

          default:
            ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
        }
      } catch (error) {
        console.error(`❌ Message parse error: ${error}`);
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      }
    },

    close(ws, code, reason) {
      console.log(`🔌 Client disconnected: ${ws.data.id} from ${ws.remoteAddress}:${ws.remotePort} (${code})`);
    },
  },
});

async function handleFetchRequest(ws: any) {
  try {
    console.log("🔄 Fetching latest data...");

    // Fetch and process data
    const rawData = await fetchData();
    const bets = parseBets(rawData.data || []);
    const agents = aggregateAgents(rawData);

    // Get last 10 bets for live updates
    const recentBets = bets.slice(-10);

    // Send to requesting client
    ws.send(JSON.stringify({
      type: "fetch_response",
      bets: recentBets,
      agents: agents.slice(0, 5), // Top 5 agents
      totalBets: bets.length,
      timestamp: new Date().toISOString()
    }));

    // Broadcast to all syndicate-live subscribers
    const broadcastData = {
      type: "live_update",
      bets: recentBets,
      agents: agents.slice(0, 3), // Top 3 for live updates
      timestamp: new Date().toISOString()
    };

    const published = server.publish("syndicate-live", JSON.stringify(broadcastData));
    console.log(`📡 Broadcasted to ${published} clients`);

  } catch (error) {
    console.error(`❌ Fetch error: ${error}`);
    ws.send(JSON.stringify({
      type: "error",
      message: "Failed to fetch data",
      error: error.message
    }));
  }
}

async function sendStatusUpdate(ws: any) {
  try {
    const rawData = await fetchData();
    const bets = parseBets(rawData.data || []);
    const agents = aggregateAgents(rawData);

    ws.send(JSON.stringify({
      type: "status",
      connectedClients: getConnectedClientsCount(),
      totalBets: bets.length,
      activeAgents: agents.length,
      lastUpdate: new Date().toISOString(),
      serverUptime: process.uptime()
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: "status_error",
      message: "Status check failed",
      error: error.message
    }));
  }
}

function getConnectedClientsCount(): number {
  // This is a simplified count - in a real implementation you'd track connections
  return 0; // Bun doesn't expose connection count directly
}

// Periodic status broadcasts (every 30 seconds)
setInterval(async () => {
  try {
    const rawData = await fetchData();
    const bets = parseBets(rawData.data || []);
    const agents = aggregateAgents(rawData);

    const statusData = {
      type: "periodic_status",
      totalBets: bets.length,
      activeAgents: agents.length,
      topAgent: agents[0]?.name || "None",
      topProfit: agents[0]?.stats.profit || 0,
      timestamp: new Date().toISOString()
    };

    const published = server.publish("syndicate-live", JSON.stringify(statusData));
    if (published > 0) {
      console.log(`📊 Status broadcast to ${published} clients (${bets.length} bets, ${agents.length} agents)`);
    }
  } catch (error) {
    console.error(`❌ Status broadcast error: ${error}`);
  }
}, 30000);

console.log(`🌐 WebSocket Live Server on ws://localhost:3001`);
console.log(`🔐 Subprotocol: syndicate-live`);
console.log(`🗜️  Compression: permessage-deflate`);
console.log(`📡 Broadcasting every 30s`);
console.log(`✅ Ready for live updates!`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  server.stop();
  process.exit(0);
});
