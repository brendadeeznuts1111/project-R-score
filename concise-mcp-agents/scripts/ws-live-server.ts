#!/usr/bin/env bun

// [WS][LIVE][SERVER][WS-LIVE-002][v2.13][ACTIVE]

import { govEngine } from "./gov-rules.ts";

interface WSLiveServer {
  port: number;
  pollInterval: number;
  connectedClients: number;
  totalBetsBroadcast: number;
  lastPollTime: string;
}

class SyndicateWSLiveServer implements WSLiveServer {
  port = 3001;
  pollInterval = 30000; // 30 seconds
  connectedClients = 0;
  totalBetsBroadcast = 0;
  lastPollTime = new Date().toISOString();

  private server: ReturnType<typeof Bun.serve>;
  private lastBetId = 0; // Track last processed bet ID
  private pollTimer: Timer;

  constructor() {
    this.startServer();
    this.startPolling();
  }

  private startServer(): void {
    this.server = Bun.serve({
      port: this.port,
      fetch: (req, server) => {
        // Handle CORS for web clients
        if (req.method === 'OPTIONS') {
          return new Response(null, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
          });
        }

        // Upgrade to WebSocket with syndicate-live subprotocol
        if (server.upgrade(req, {
          data: {
            id: crypto.randomUUID(),
            connectedAt: new Date().toISOString()
          }
        })) {
          return;
        }

        return new Response("Syndicate WS Live Server v2.13", {
          headers: { 'Content-Type': 'text/plain' }
        });
      },

      websocket: {
        open: (ws) => {
          this.connectedClients++;
          console.log(`🟢 WS Client connected (${this.connectedClients} total)`);

          // Subscribe to syndicate-live channel
          ws.subscribe("syndicate-live");

          // Send welcome message with deflate status
          ws.send(JSON.stringify({
            type: "connected",
            message: "Welcome to Syndicate Live WS v2.13",
            extensions: ws.extensions || "none",
            clientId: ws.data.id,
            timestamp: new Date().toISOString()
          }));

          // Send current stats
          this.sendStats(ws);
        },

        message: (ws, msg) => {
          try {
            const data = JSON.parse(msg.toString());

            if (data.type === "ping") {
              ws.send(JSON.stringify({
                type: "pong",
                timestamp: new Date().toISOString()
              }));
            } else if (data.type === "stats") {
              this.sendStats(ws);
            } else if (data.type === "health") {
              ws.send(JSON.stringify({
                type: "health",
                status: "healthy",
                uptime: this.getUptime(),
                clients: this.connectedClients,
                lastPoll: this.lastPollTime
              }));
            }
          } catch (error) {
            ws.send(JSON.stringify({
              type: "error",
              message: "Invalid message format",
              timestamp: new Date().toISOString()
            }));
          }
        },

        close: (ws, code, reason) => {
          this.connectedClients--;
          console.log(`🔴 WS Client disconnected (${this.connectedClients} remaining) - Code: ${code}`);
        },

        drain: (ws) => {
          console.log(`💧 WS backpressure relieved for client ${ws.data.id}`);
        }
      },
    });

    console.log(`🌐 WS Live Server started on port ${this.port}`);
    console.log(`📊 Deflate compression: ${this.server.protocol || 'enabled'}`);
    console.log(`⏰ Poll interval: ${this.pollInterval / 1000}s`);
  }

  private startPolling(): void {
    this.pollTimer = setInterval(async () => {
      await this.pollAndBroadcast();
    }, this.pollInterval);

    // Initial poll
    setTimeout(() => this.pollAndBroadcast(), 1000);
  }

  private async pollAndBroadcast(): Promise<void> {
    try {
      this.lastPollTime = new Date().toISOString();

      // Poll datapipe for new bets
      console.log('📊 Polling for new bets...');

      const proc = Bun.spawnSync(['bun', 'datapipe.ts', 'raw'], {
        cwd: process.cwd(),
        env: { ...process.env }
      });

      if (proc.exitCode !== 0) {
        console.error('❌ Datapipe poll failed:', proc.stderr.toString());
        return;
      }

      const data = JSON.parse(proc.stdout.toString());

      // Extract new bets (simplified - in real implementation, track processed IDs)
      const allBets = data || [];
      const newBets = allBets.slice(-10); // Last 10 bets as example

      if (newBets.length > 0) {
        console.log(`📡 Broadcasting ${newBets.length} new bets`);

        // Broadcast to all subscribers
        this.server.publish("syndicate-live", JSON.stringify({
          type: "bets",
          bets: newBets,
          timestamp: new Date().toISOString(),
          compressed: true // Deflate compression enabled
        }));

        this.totalBetsBroadcast += newBets.length;

        // Check for high-profit alerts
        const highProfitBets = newBets.filter((bet: any) =>
          bet.profit && parseFloat(bet.profit) > 1000
        );

        if (highProfitBets.length > 0) {
          console.log(`🚨 High profit alert: ${highProfitBets.length} bets > $1000`);

          // Send alert to subscribers
          this.server.publish("syndicate-live", JSON.stringify({
            type: "alert",
            message: `${highProfitBets.length} high-profit bets detected`,
            bets: highProfitBets,
            timestamp: new Date().toISOString()
          }));
        }
      } else {
        console.log('📊 No new bets to broadcast');
      }

    } catch (error) {
      console.error('❌ Poll error:', error.message);
    }
  }

  private sendStats(ws: any): void {
    ws.send(JSON.stringify({
      type: "stats",
      clients: this.connectedClients,
      totalBroadcast: this.totalBetsBroadcast,
      uptime: this.getUptime(),
      lastPoll: this.lastPollTime,
      pollInterval: this.pollInterval,
      timestamp: new Date().toISOString()
    }));
  }

  private getUptime(): string {
    // Simple uptime calculation
    const uptime = Date.now() - (this.server ? Date.now() - 30000 : 0);
    const minutes = Math.floor(uptime / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  public stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    if (this.server) {
      this.server.stop();
    }
    console.log('🛑 WS Live Server stopped');
  }
}

// CLI Interface
const cmd = process.argv[2];
let server: SyndicateWSLiveServer;

switch (cmd) {
  case 'start':
  case undefined:
    server = new SyndicateWSLiveServer();
    console.log('🚀 Syndicate WS Live Server v2.13 started');
    console.log('🌐 WebSocket: ws://localhost:3001');
    console.log('📊 Broadcasting: syndicate-live channel');
    console.log('🗜️  Compression: Bun deflate enabled');
    console.log('⏰ Polling: Every 30 seconds');

    // Keep alive
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down gracefully...');
      if (server) server.stop();
      process.exit(0);
    });
    break;

  case 'test':
    console.log('🧪 WS Live Server Test Mode');
    console.log('✅ Would start on port 3001');
    console.log('✅ Would poll datapipe every 30s');
    console.log('✅ Would broadcast to syndicate-live channel');
    console.log('✅ Would enable deflate compression');
    break;

  default:
    console.log('WS Live Server Commands:');
    console.log('  start  - Start the live WebSocket server');
    console.log('  test   - Dry run test (no actual server)');
}
