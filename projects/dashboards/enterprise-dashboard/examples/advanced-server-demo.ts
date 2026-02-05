#!/usr/bin/env bun
/**
 * Advanced Bun.serve() Demo
 *
 * Demonstrates server features:
 * - Random port allocation (port: 0)
 * - WebSocket with typed messages
 * - Route patterns
 * - Server introspection
 */

import { type ServerWebSocket } from "bun";

// =============================================================================
// Types
// =============================================================================

interface ClientData {
  id: string;
  connectedAt: number;
}

type WsMessage =
  | { type: "ping" }
  | { type: "subscribe"; channel: string }
  | { type: "unsubscribe"; channel: string }
  | { type: "broadcast"; message: string };

// =============================================================================
// Server
// =============================================================================

const server = Bun.serve<ClientData>({
  // port: 0 = Bun picks a random available port
  port: 0,
  hostname: "localhost",

  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req, {
        data: {
          id: Bun.randomUUIDv7(),
          connectedAt: Date.now(),
        },
      });
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined;
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        port: server.port,
        url: server.url.href,
        pendingRequests: server.pendingRequests,
        pendingWebSockets: server.pendingWebSockets,
      });
    }

    // Server info
    if (url.pathname === "/info") {
      return Response.json({
        hostname: server.hostname,
        port: server.port,
        url: server.url.href,
        development: server.development,
      });
    }

    return new Response("Not found", { status: 404 });
  },

  websocket: {
    open(ws) {
      console.log(`Client ${ws.data.id} connected`);
      ws.send(JSON.stringify({ type: "connected", id: ws.data.id }));
    },

    message(ws, raw) {
      try {
        const msg = JSON.parse(String(raw)) as WsMessage;

        switch (msg.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
            break;

          case "subscribe":
            ws.subscribe(msg.channel);
            ws.send(JSON.stringify({ type: "subscribed", channel: msg.channel }));
            break;

          case "unsubscribe":
            ws.unsubscribe(msg.channel);
            ws.send(JSON.stringify({ type: "unsubscribed", channel: msg.channel }));
            break;

          case "broadcast":
            server.publish("global", JSON.stringify({
              type: "message",
              from: ws.data.id,
              message: msg.message,
            }));
            break;
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      }
    },

    close(ws) {
      console.log(`Client ${ws.data.id} disconnected`);
    },
  },
});

// =============================================================================
// Startup
// =============================================================================

console.log(`Server running at ${server.url}`);
console.log(`WebSocket: ws://localhost:${server.port}/ws`);
console.log(`Health: ${server.url}health`);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  server.stop();
  process.exit(0);
});
