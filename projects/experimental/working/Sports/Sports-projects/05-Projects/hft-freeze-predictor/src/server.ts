// HFT Freeze Predictor - HTTP API + WebSocket
//
// Routes:
// GET  /health           - Server health
// GET  /api/hft/status   - Current metrics & config
// POST /api/hft/ingest   - Receive metrics snapshot
// GET  /api/hft/events   - Query historical events
// GET  /api/hft/stats    - Database statistics
// WS   /ws/hft/stream    - Real-time predictions

import type { MetricsSnapshot, FreezeEvent, Prediction } from "./types";
import type { ServerWebSocket } from "bun";
import { predict, DEFAULT_CONFIG } from "./predictor";
import { init, store, storePrediction, query, getConfig, close, getDb } from "./store";

interface WSData {
  id: string;
  connectedAt: number;
}

let lastPrediction: Prediction | null = null;
const wsClients = new Set<ServerWebSocket<WSData>>();

// Broadcast to all WebSocket clients
function broadcast(message: object): void {
  const data = JSON.stringify(message);
  for (const client of wsClients) {
    try {
      client.send(data);
    } catch {}
  }
}

export function createServer(port: number = 0) {
  // Initialize database
  init();

  return Bun.serve<WSData>({
    port,

    routes: {
      "/health": () => {
        return Response.json({
          status: "ok",
          wsClients: wsClients.size,
          timestamp: Date.now(),
        });
      },

      "/api/hft/status": () => {
        const config = getConfig();
        return Response.json({
          config,
          lastPrediction,
          wsClients: wsClients.size,
        });
      },

      "/api/hft/ingest": {
        POST: async (req) => {
          const metrics: MetricsSnapshot = await req.json();

          // Validate required fields
          if (
            typeof metrics.velocity !== "number" ||
            typeof metrics.latency !== "number" ||
            typeof metrics.sharpeRatio !== "number"
          ) {
            return Response.json(
              { error: "Invalid metrics: velocity, latency, sharpeRatio required" },
              { status: 400 }
            );
          }

          // Add timestamp if not provided
          if (!metrics.timestamp) {
            metrics.timestamp = Date.now();
          }

          // Run prediction
          const config = getConfig();
          const prediction = predict(metrics, config);
          lastPrediction = prediction;

          // Store event
          const event: FreezeEvent = {
            id: crypto.randomUUID(),
            timestamp: metrics.timestamp,
            velocity: metrics.velocity,
            latency: metrics.latency,
            sharpeRatio: metrics.sharpeRatio,
            frozen: prediction.probability > 0.5,
          };
          store(event);
          storePrediction(prediction);

          // Broadcast to WebSocket clients
          broadcast({
            type: "prediction",
            event,
            prediction,
          });

          return Response.json({
            event,
            prediction,
          });
        },
      },

      "/api/hft/events": (req) => {
        const url = new URL(req.url);
        const sinceParam = url.searchParams.get("since");
        const limitParam = url.searchParams.get("limit");
        const since = sinceParam ? parseInt(sinceParam, 10) : 0;
        const limit = limitParam ? parseInt(limitParam, 10) : 100;

        const events = query(since).slice(0, limit);
        return Response.json(events);
      },

      "/api/hft/stats": () => {
        const db = getDb();
        const eventCount = (
          db.query("SELECT COUNT(*) as count FROM events").get() as { count: number }
        ).count;
        const frozenCount = (
          db.query("SELECT COUNT(*) as count FROM events WHERE frozen = 1").get() as { count: number }
        ).count;
        const predictionCount = (
          db.query("SELECT COUNT(*) as count FROM predictions").get() as { count: number }
        ).count;

        return Response.json({
          events: eventCount,
          frozenEvents: frozenCount,
          predictions: predictionCount,
          freezeRate: eventCount > 0 ? (frozenCount / eventCount * 100).toFixed(1) + "%" : "0%",
        });
      },

      "/api/hft/*": Response.json({ error: "Not found" }, { status: 404 }),
    },

    fetch(req, server) {
      const url = new URL(req.url);

      // WebSocket upgrade
      if (url.pathname === "/ws/hft/stream") {
        const upgraded = server.upgrade(req, {
          data: {
            id: crypto.randomUUID(),
            connectedAt: Date.now(),
          },
        });
        if (upgraded) return undefined;
        return Response.json({ error: "WebSocket upgrade failed" }, { status: 400 });
      }

      return Response.json({ error: "Not found" }, { status: 404 });
    },

    websocket: {
      open(ws) {
        wsClients.add(ws);
        ws.send(JSON.stringify({
          type: "connected",
          id: ws.data.id,
          config: getConfig(),
        }));
        console.log(`[ws] Client connected: ${ws.data.id}`);
      },

      message(ws, message) {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === "ping") {
            ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          }
        } catch {}
      },

      close(ws) {
        wsClients.delete(ws);
        console.log(`[ws] Client disconnected: ${ws.data.id}`);
      },
    },

    error(error: Error) {
      return Response.json({ error: error.message }, { status: 500 });
    },
  });
}

export function stopServer(): void {
  close();
}

export { broadcast };

// Entry point
if (import.meta.main) {
  const port = Number(Bun.env.PORT) || 3003;
  const server = createServer(port);
  console.log(`[hft] Freeze predictor server: http://localhost:${server.port}`);
  console.log(`[hft] WebSocket: ws://localhost:${server.port}/ws/hft/stream`);
  console.log(`[hft] Routes: /health, /api/hft/status, /api/hft/ingest, /api/hft/events, /api/hft/stats`);
}
