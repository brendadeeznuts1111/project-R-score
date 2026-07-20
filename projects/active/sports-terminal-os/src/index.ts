#!/usr/bin/env bun
/**
 * Sports Terminal OS — Main Server Entry Point
 *
 * Single-port Bun.serve that handles:
 *   - HTTP API requests (all 93 proxy endpoints)
 *   - WebSocket connections (real-time data)
 *   - SSE streams (live wager feed)
 *   - Static file serving (frontend SPA in production)
 *   - Cron job registration (8 scheduled jobs)
 *   - Graceful shutdown handling
 *   - Idle timeout with automatic shutdown
 *   - Health check endpoint
 *
 * Architecture: Single-process, single-port design.
 * All traffic routes through this one server instance.
 */

import type { Server, ServerWebSocket } from "bun";
import { handleRequest, handleMetrics } from "@api/router";
import { getDb, closeDb } from "@db/index";
import { env } from "@utils/env";
import { createLogger } from "@utils/logger";
import { logHealth } from "@utils/tableLogger";
import type { WebSocketMessage, WebSocketClient } from "@utils/types";

// Zone 4: Backend Operations
import { registerCronJobs as registerCronManager } from "@services/cron";
import { startMetricsCollector, stopMetricsCollector } from "@services/metrics-collector";
import {
  initIdleShutdown,
  registerShutdownCallback,
  onWsConnectionOpen,
  onWsConnectionClose,
  onSseConnectionOpen,
  onSseConnectionClose,
  resetIdleShutdown,
} from "@api/idle-shutdown";

// Zone 3: Prediction Markets WebSocket
import {
  processPredictionWsMessage,
  removePredictionSubscriber,
} from "@services/websocket-handlers/prediction-ws";

// Zone 10: Odds Drift WebSocket
import {
  processOddsDriftWsMessage,
  unregisterDriftClient,
  getOddsDriftMetrics,
  broadcastOddsDrift,
  setOddsDriftBroadcast,
  setSnapshotProvider as setOddsDriftSnapshotProvider,
} from "@services/websocket-handlers/odds-drift-ws";

import { ensureActionQueueSchema, processActionQueue } from "@api/action-queue";
import { recordWsMessage, recordHttpRequest } from "@api/metrics";
import { applySecurityHeaders } from "@middleware/security";

// Zone 10: Odds Drift Engine + Alias Loader + Pipeline Worker
import { initOddsDriftEngine } from "@services/odds-drift-engine";
import { loadAliasMap, startAliasHotReload, stopAliasHotReload } from "@services/team-alias-loader";
import { PipelineWorker } from "@services/pipeline-worker";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PORT = env.PORT;
const HOST = env.HOST;
const IDLE_TIMEOUT_MS = env.IDLE_TIMEOUT_MS;
const VERSION = "5.2.0";

const logger = createLogger("Server");

// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------

/** Active WebSocket clients keyed by client ID */
const wsClients = new Map<string, WebSocketClient>();

/** Active SSE clients keyed by client ID */
const sseClients = new Map<string, { controller: ReadableStreamDefaultController<Uint8Array>; filter?: Record<string, unknown> }>();

/** Server start time for uptime tracking */
let serverStartTime = Date.now();

/** Request counter for telemetry */
let requestCount = 0;
let errorCount = 0;



/** Server instance reference */
let serverInstance: Server<unknown> | null = null;

/** Zone 10: Pipeline worker — visual evidence for drift alerts */
let pipelineWorker: PipelineWorker | null = null;

// ---------------------------------------------------------------------------
// WebSocket metrics
// ---------------------------------------------------------------------------

/**
 * Gather real-time WebSocket metrics for the /ws/metrics endpoint.
 * Returns JSON-serializable object consumed by hygiene dashboard.
 */
export function getWsMetrics(): Record<string, unknown> {
  const topicDistribution: Record<string, number> = {};

  for (const client of wsClients.values()) {
    for (const channel of client.subscribedChannels) {
      topicDistribution[channel] = (topicDistribution[channel] ?? 0) + 1;
    }
  }

  // Pull odds-drift + pipeline metrics (statically imported)
  let oddsDrift: Record<string, unknown> | null = null;
  try {
    oddsDrift = getOddsDriftMetrics();
  } catch {
    // odds-drift handler may not be registered
  }

  let pipeline: Record<string, unknown> | null = null;
  try {
    pipeline = pipelineWorker?.getMetrics() ?? null;
  } catch {
    // pipeline worker may not be initialized
  }

  return {
    protocol_version: "odds-drift-v2.1.0",
    uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
    connections: wsClients.size,
    topics_distribution: topicDistribution,
    odds_drift: oddsDrift,
    pipeline: pipeline,
    server_time: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// WebSocket message broadcasting
// ---------------------------------------------------------------------------

/**
 * Broadcast a message to all connected WebSocket clients,
 * optionally filtered by subscribed channels.
 */
export function broadcastToWebSockets(message: WebSocketMessage): void {
  const payload = JSON.stringify(message);
  const data = new TextEncoder().encode(payload);

  for (const client of wsClients.values()) {
    try {
      // If client has subscriptions, check channel match
      if (client.subscribedChannels.size > 0 && message.type) {
        if (!client.subscribedChannels.has(message.type)) continue;
      }
      client.ws.send(data);
    } catch {
      // Client disconnected mid-send, will be cleaned up on close
    }
  }
}

/**
 * Broadcast to a specific channel only.
 */
export function broadcastToChannel(channel: string, data: unknown): void {
  broadcastToWebSockets({ type: channel as WebSocketMessage["type"], data });
}

// ---------------------------------------------------------------------------
// SSE broadcasting
// ---------------------------------------------------------------------------

/**
 * Send an SSE event to all connected clients.
 */
export function broadcastToSSE(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);

  for (const [clientId, client] of sseClients.entries()) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      // Client disconnected, remove them
      sseClients.delete(clientId);
    }
  }
}

// ---------------------------------------------------------------------------
// Activity tracking
// ---------------------------------------------------------------------------

function hasActiveConnections(): boolean {
  return wsClients.size > 0 || sseClients.size > 0;
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function gracefulShutdown(signal?: string): Promise<void> {
  logger.info(`Graceful shutdown initiated${signal ? ` (${signal})` : ""}`);

  // Zone 4: Stop background services
  try {
    stopMetricsCollector();
    resetIdleShutdown();
    stopAliasHotReload();
    logger.info("Background services stopped");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.warn(`Error stopping background services: ${message}`);
  }

  // Stop accepting new connections
  if (serverInstance) {
    serverInstance.stop(true);
    serverInstance = null;
  }

  // Close all WebSocket connections gracefully
  for (const [clientId, client] of wsClients.entries()) {
    try {
      client.ws.close(1001, "Server shutting down");
    } catch {
      // Ignore close errors
    }
    wsClients.delete(clientId);
  }

  // Close all SSE connections
  for (const [clientId, client] of sseClients.entries()) {
    try {
      client.controller.close();
    } catch {
      // Ignore close errors
    }
    sseClients.delete(clientId);
  }

  // Close database connection
  closeDb();

  // Disconnect Redis if connected (shared publisher client)
  try {
    const { closeRedis } = await import("./telegram/queue-publisher");
    await closeRedis();
    logger.info("Redis disconnected");
  } catch {
    // Redis may not be configured
  }

  logger.info("Shutdown complete.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Signal handlers
// ---------------------------------------------------------------------------

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ---------------------------------------------------------------------------
// Zone 4: Cron job registration (delegated to services/cron.ts)
// ---------------------------------------------------------------------------

function registerCronJobs(): void {
  try {
    const count = registerCronManager();
    logger.info(`Zone 4 cron manager registered ${count} jobs`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error(`Failed to register cron jobs: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// WebSocket handlers
// ---------------------------------------------------------------------------

function handleWebSocketOpen(ws: ServerWebSocket<unknown>): void {
  const clientId = Bun.randomUUIDv7();
  ws.data = { clientId };

  const client: WebSocketClient = {
    id: clientId,
    ws,
    subscribedChannels: new Set(),
    connectedAt: Date.now(),
    lastPingAt: Date.now(),
  };

  wsClients.set(clientId, client);
  onWsConnectionOpen();
  recordWsMessage("connect").catch(() => {});

  logger.info(`WebSocket client connected: ${clientId} (total: ${wsClients.size})`);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "connected",
      data: { clientId, version: VERSION, serverTime: Date.now() },
    })
  );
}

function handleWebSocketMessage(ws: ServerWebSocket<unknown>, message: string | Uint8Array): void {
  const clientId = (ws.data as { clientId: string } | undefined)?.clientId;
  if (!clientId) return;

  const client = wsClients.get(clientId);
  if (!client) return;

  client.lastPingAt = Date.now();

  try {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    const msg = JSON.parse(text) as WebSocketMessage;

    // Record WS message metric
    recordWsMessage(msg.type || "unknown").catch(() => {});

    // Handle message types
    switch (msg.type) {
      case "subscribe": {
        const channel = msg.data as string;
        if (channel) {
          client.subscribedChannels.add(channel);
          ws.send(JSON.stringify({ type: "subscribed", data: { channel } }));
        }
        break;
      }

      case "unsubscribe": {
        const channel = msg.data as string;
        if (channel) {
          client.subscribedChannels.delete(channel);
          ws.send(JSON.stringify({ type: "unsubscribed", data: { channel } }));
        }
        break;
      }

      case "pong": {
        // Client pong received, connection alive
        break;
      }

      default: {
        // Try Zone 3: Prediction Market WebSocket handlers
        let handled = processPredictionWsMessage(ws, msg.type, msg.data);
        if (handled) break;

        // Try Zone 10: Odds Drift WebSocket handler
        handled = processOddsDriftWsMessage(ws, msg.type, msg.data, clientId);
        if (handled) break;

        // Unknown message type — log but don't crash
        logger.warn(`Unknown WebSocket message type: ${msg.type}`);
      }
    }
  } catch (err: unknown) {
    // Never let one message crash the handler
    const errorMessage = err instanceof Error ? err.message : "Parse error";
    logger.error(`WebSocket message error [${clientId}]: ${errorMessage}`);
    ws.send(
      JSON.stringify({
        type: "error",
        source: "websocket",
        message: errorMessage,
        code: "WS_MESSAGE_ERROR",
      })
    );
  }
}

function handleWebSocketClose(ws: ServerWebSocket<unknown>, code: number, reason: string): void {
  const clientId = (ws.data as { clientId: string } | undefined)?.clientId;
  if (clientId) {
    // Zone 3: Clean up prediction market subscriptions
    removePredictionSubscriber(ws);

    // Zone 10: Clean up odds drift subscriptions
    unregisterDriftClient(clientId);

    wsClients.delete(clientId);
    onWsConnectionClose();
    logger.info(`WebSocket client disconnected: ${clientId} (code: ${code}, reason: ${reason}, remaining: ${wsClients.size})`);
  }
}

// ---------------------------------------------------------------------------
// SSE handler
// ---------------------------------------------------------------------------

function handleSSE(req: Request): Response {
  const clientId = Bun.randomUUIDv7();
  const url = new URL(req.url);

  // Parse optional filter params
  const filter: Record<string, unknown> = {};
  if (url.searchParams.has("playerId")) {
    filter.playerId = url.searchParams.get("playerId");
  }
  if (url.searchParams.has("sport")) {
    filter.sport = url.searchParams.get("sport");
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        clientId,
        stream: "live-wagers",
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectEvent));

      // Store the controller for broadcasting
      sseClients.set(clientId, { controller, filter });
      onSseConnectionOpen();

      logger.info(`SSE client connected: ${clientId} (total: ${sseClients.size})`);
    },
    cancel() {
      sseClients.delete(clientId);
      onSseConnectionClose();
      logger.info(`SSE client disconnected: ${clientId} (remaining: ${sseClients.size})`);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------

/**
 * Serve frontend static files in production.
 * In development, Vite's dev server handles this.
 */
async function serveStaticFile(pathname: string): Promise<Response | null> {
  // Only serve static files in production or if the dist exists
  if (env.NODE_ENV === "development") {
    return null;
  }

  // Strip leading slash and resolve safely
  const cleanPath = pathname.replace(/^\//, "");
  if (!cleanPath || cleanPath === "") {
    // Serve index.html for root
    const indexFile = Bun.file("./dist/frontend/index.html");
    if (await indexFile.exists()) {
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html" },
      });
    }
    return null;
  }

  // Try to serve the requested file
  const filePath = `./dist/frontend/${cleanPath}`;
  try {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      const ext = cleanPath.split(".").pop() || "";
      const mimeTypes: Record<string, string> = {
        js: "application/javascript",
        mjs: "application/javascript",
        css: "text/css",
        html: "text/html",
        json: "application/json",
        png: "image/png",
        jpg: "image/jpeg",
        svg: "image/svg+xml",
        ico: "image/x-icon",
      };
      return new Response(file, {
        headers: { "Content-Type": mimeTypes[ext] || "application/octet-stream" },
      });
    }
  } catch {
    // File not found, fall through
  }

  // SPA fallback — serve index.html for unknown routes
  if (!pathname.startsWith("/api/") && !pathname.startsWith("/ws") && !pathname.startsWith("/thumbs/")) {
    const indexFile = Bun.file("./dist/frontend/index.html");
    if (await indexFile.exists()) {
      return new Response(indexFile, {
        headers: { "Content-Type": "text/html" },
      });
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main server
// ---------------------------------------------------------------------------

function startServer(): void {
  logger.info(`Starting Sports Terminal OS v${VERSION}...`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Port: ${PORT}`);
  logger.info(`Idle timeout: ${IDLE_TIMEOUT_MS}ms`);

  // Initialize database on startup
  try {
    getDb();
    logger.info("Database connected");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error(`Database connection failed: ${message}`);
    process.exit(1);
  }

  // Zone 4: Initialize action queue schema
  try {
    ensureActionQueueSchema();
    logger.info("Action queue schema initialized");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.warn(`Action queue schema init warning: ${message}`);
  }

  // Zone 4: Register idle shutdown callback
  registerShutdownCallback(() => {
    gracefulShutdown("idle_timeout");
  });
  initIdleShutdown();

  // Zone 4: Register cron jobs
  registerCronJobs();

  // Zone 4: Start background metrics collector
  startMetricsCollector(
    () => wsClients.size,
    () => sseClients.size
  );

  // Zone 10: Initialize Odds Drift Engine
  try {
    // Wire the broadcast function (callback injection — no circular deps)
    setOddsDriftBroadcast((message) => {
      broadcastToWebSockets({
        type: message.type as WebSocketMessage["type"],
        provider: message.provider,
        data: message.data,
      });
    });

    // Load team aliases from DB and initialize the engine
    const { aliasMap, canonicalTeams } = loadAliasMap();

    if (canonicalTeams.length > 0) {
      // Create pipeline worker for visual evidence
      pipelineWorker = new PipelineWorker({
        onBroadcast: (channel, payload) => {
          broadcastToWebSockets({
            type: channel as WebSocketMessage["type"],
            data: payload,
          });
        },
      });

      const engine = initOddsDriftEngine({
        canonicalTeams,
        aliasMap,
        threshold: 0.88,
        minDrift: 0.01,
        dedupWindowMs: 5000,
        onAlert: (alert) => {
          // 1. Broadcast drift alert to WebSocket clients
          broadcastOddsDrift({
            source: alert.source,
            rawTeam: alert.rawTeam,
            canonicalTeam: alert.canonicalTeam ?? "unknown",
            drift: alert.drift,
            direction: alert.direction,
            market: alert.market,
            fromOdds: alert.fromOdds,
            toOdds: alert.toOdds,
            detectedAt: alert.detectedAt,
            metadata: alert.metadata,
          });

          // 2. Pipeline worker: scrape evidence, generate thumbnail, notify Telegram
          pipelineWorker?.onAlert(alert);
        },
      });

      // Wire snapshot provider
      setOddsDriftSnapshotProvider(() => engine.snapshot());

      // Start hot-reload for alias map
      startAliasHotReload();

      logger.info(
        `Zone 10: Engine + PipelineWorker initialized ` +
        `(${canonicalTeams.length} teams, ${aliasMap.size} aliases, ` +
        `webview=${pipelineWorker?.getMetrics().webViewAvailable ?? "?"})`
      );
    } else {
      logger.info("Zone 10: OddsDriftEngine skipped — no canonical teams in alias store");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.warn(`Zone 10: OddsDriftEngine init skipped (${message})`);
  }

  // Create the server
  serverInstance = Bun.serve({
    port: PORT,
    hostname: HOST,

    // WebSocket configuration
    websocket: {
      open(ws) {
        handleWebSocketOpen(ws);
      },
      message(ws, message) {
        handleWebSocketMessage(ws, message);
      },
      close(ws, code, reason) {
        handleWebSocketClose(ws, code, reason);
      },
      ping(ws) {
        const clientId = (ws.data as { clientId: string } | undefined)?.clientId;
        if (clientId) {
          const client = wsClients.get(clientId);
          if (client) {
            client.lastPingAt = Date.now();
          }
        }
      },
    },

    // HTTP handler
    async fetch(req, server) {
      const url = new URL(req.url);
      const pathname = url.pathname;
      requestCount++;

      // WebSocket upgrade
      if (pathname === "/ws") {
        const upgraded = server.upgrade(req, { data: { authToken: null } });
        if (upgraded) {
          // WebSocket upgrade — Bun.serve omits a Response body when upgrade succeeds
          return undefined!;
        }
        return Response.json({ error: "WebSocket upgrade failed" }, { status: 400 });
      }

      // SSE endpoint
      if (pathname === "/api/stream/live-wagers") {
        return handleSSE(req);
      }

      // Zone 10: Thumbnail evidence endpoint
      if (pathname.startsWith("/thumbs/")) {
        const team = decodeURIComponent(pathname.split("/").pop()!);
        const entry = pipelineWorker?.getThumbnail(team);
        if (!entry) return new Response("Not found", { status: 404 });
        return new Response(entry.bytes, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=60",
            "X-SHA256": entry.sha256,
          },
        });
      }

      // Legacy fast-path metrics endpoint (redirected to router)
      if (pathname === "/metrics") {
        return handleMetrics();
      }

      // Legacy fast-path health endpoint (redirected to router)
      if (pathname === "/health") {
        return handleRequest(new Request(`${url.origin}/api/health`, req));
      }

      // API routes + WS metrics (includes /api/metrics, /api/health/*, /ws/metrics via router)
      if (pathname.startsWith("/api/") || pathname.startsWith("/ws/")) {
        try {
          const response = await handleRequest(req);
          return response;
        } catch (err: unknown) {
          errorCount++;
          const message = err instanceof Error ? err.message : "Unknown error";
          logger.error(`Unhandled API error: ${message}`);
          const errorResponse = Response.json(
            { error: "Internal server error", code: "INTERNAL_ERROR", requestId: Bun.randomUUIDv7().slice(0, 12) },
            { status: 500 }
          );
          applySecurityHeaders(errorResponse);
          return errorResponse;
        }
      }

      // Static files (production only)
      const staticResponse = await serveStaticFile(pathname);
      if (staticResponse) {
        applySecurityHeaders(staticResponse);
        return staticResponse;
      }

      // Development fallback
      if (env.NODE_ENV === "development") {
        const devResponse = Response.json(
          {
            error: "Frontend not built. Run `bun run frontend:dev` in a separate terminal.",
            hint: "The API is running. Use `bun run frontend:dev` for the UI.",
          },
          { status: 200 }
        );
        applySecurityHeaders(devResponse);
        return devResponse;
      }

      // Not found
      const notFoundResponse = Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
      applySecurityHeaders(notFoundResponse);
      return notFoundResponse;
    },
  });

  serverStartTime = Date.now();

  logger.info(`✅ Server listening on http://${HOST}:${PORT}`);
  logger.info(`   WebSocket: ws://${HOST}:${PORT}/ws`);
  logger.info(`   SSE: http://${HOST}:${PORT}/api/stream/live-wagers`);
  logger.info(`   Health: http://${HOST}:${PORT}/api/health`);
  logger.info(`   Readiness: http://${HOST}:${PORT}/api/health/ready`);
  logger.info(`   Liveness: http://${HOST}:${PORT}/api/health/live`);
  logger.info(`   Metrics: http://${HOST}:${PORT}/api/metrics`);
  logger.info(`   Zone 4 Backend Ops: initialized`);
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

// broadcastToWebSockets and broadcastToSSE are already exported inline above.
// Only aggregate-export the variables + gracefulShutdown which aren't inline-exported.
export {
  wsClients,
  sseClients,
  requestCount,
  errorCount,
  serverStartTime,
  gracefulShutdown,
};

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

if (import.meta.main) {
  startServer();
}