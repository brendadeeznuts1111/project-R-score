/**
 * WebSocket hub for real-time swarm radar
 */

import { buildGraph, updateGraph } from "../../src/core/edge-builder.js";
import { loadConfig, type SystemConfig } from "../../src/types/config.js";
import { getLogger } from "../../src/utils/logger.js";
import { handleError, createErrorContext } from "../../src/utils/error-handler.js";
import { SharpShiftLedger } from "./ledger.js";
import { Hedger } from "./hedger.js";
import type { Game, Edge } from "../../src/types/game.js";
import {
  LEDGER_PRUNE_THRESHOLD,
  EDGE_TIME_WINDOW_MS,
  CIRCUIT_BREAKER_AUTO_CLOSE_MS,
} from "../../src/constants.js";
import { getBuildInfo } from "../../src/core/build-metadata.js";
import { rotationCache } from "../../src/utils/rotation-cache.js";

const logger = getLogger();

interface WebSocketClient {
  ws: WebSocket;
  subscribed: boolean;
  lastHeartbeat: number;
}

export class SwarmRadar {
  private config: SystemConfig;
  private server: ReturnType<typeof Bun.serve> | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private wsToClientId: Map<WebSocket, string> = new Map(); // Fast lookup: WebSocket -> clientId
  private ledger: SharpShiftLedger;
  private hedger: Hedger;
  private currentGraph: ReturnType<typeof buildGraph> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  constructor(config?: Partial<SystemConfig>) {
    this.config = loadConfig(config);
    this.ledger = new SharpShiftLedger(this.config.ledger.retentionHours);
    this.hedger = new Hedger(this.config.hedger);
  }

  /**
   * Start the radar server
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("Radar server is already running");
      return;
    }

    logger.info("Starting Swarm Radar server", {
      port: this.config.radar.port,
      league: this.config.radar.league,
    });

    this.server = Bun.serve({
      port: this.config.radar.port,
      websocket: {
        message: (ws, message) => {
          this.handleMessage(ws, message);
        },
        open: (ws) => {
          this.handleOpen(ws);
        },
        close: (ws) => {
          this.handleClose(ws);
        },
        error: (ws, error) => {
          this.handleError(ws, error);
        },
      },
      fetch: (req, server) => {
        const url = new URL(req.url);

        // Health check endpoint
        if (url.pathname === "/health" && this.config.radar.enableHealthCheck) {
          return new Response(JSON.stringify(this.getHealthStatus()), {
            headers: { "Content-Type": "application/json" },
          });
        }

        // WebSocket upgrade
        if (server.upgrade(req)) {
          return;
        }

        return new Response("Swarm Radar", { status: 200 });
      },
    });

    // Start heartbeat
    if (this.config.radar.heartbeatInterval > 0) {
      this.heartbeatInterval = setInterval(() => {
        this.sendHeartbeat();
      }, this.config.radar.heartbeatInterval);
    }

    this.isRunning = true;
    logger.info("Swarm Radar server started", {
      port: this.config.radar.port,
      url: `ws://localhost:${this.config.radar.port}`,
      build: getBuildInfo(),
    });
  }

  /**
   * Stop the radar server
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info("Stopping Swarm Radar server");

    // Close all connections
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.ws.close();
        this.wsToClientId.delete(client.ws);
      } catch (error) {
        // Ignore errors during shutdown
      }
    }
    this.clients.clear();
    this.wsToClientId.clear();

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Stop server
    if (this.server) {
      this.server.stop();
      this.server = null;
    }

    this.isRunning = false;
    logger.info("Swarm Radar server stopped");
  }

  /**
   * Process new games and broadcast edges
   */
  processGames(games: Game[]): void {
    const context = createErrorContext("processGames", {
      gameCount: games.length,
    });

    try {
      if (games.length === 0) {
        logger.debug("No games to process", context);
        return;
      }

      // Update rotation cache with new games
      for (const game of games) {
        try {
          rotationCache.set(game);
        } catch (error) {
          logger.warn("Failed to add game to rotation cache", {
            gameId: game.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (!this.currentGraph) {
        this.currentGraph = buildGraph(games, this.config.edge);
      } else {
        this.currentGraph = updateGraph(
          this.currentGraph,
          games,
          this.config.edge
        );
      }

      // Process new edges
      const newEdges = this.currentGraph.edges.filter(
        (edge) => edge.timestamp > Date.now() - EDGE_TIME_WINDOW_MS
      );

      for (const edge of newEdges) {
        // Append to ledger
        this.ledger.appendEdge(edge);

        // Check for green-flash qualification
        if (this.hedger.qualifiesForGreenFlash(edge)) {
          const quote = this.hedger.quoteHedge(edge, 1.0);
          if (quote) {
            const greenFlash = this.hedger.generateGreenFlash(edge, quote.quote);
            this.broadcast(greenFlash);
          }
        }
      }

      // Prune old ledger entries
      if (this.ledger.getEdgeCount() > LEDGER_PRUNE_THRESHOLD) {
        try {
          this.ledger.pruneOldEdges();
        } catch (error) {
          logger.warn("Failed to prune ledger edges", {
            error: error instanceof Error ? error.message : String(error),
            edgeCount: this.ledger.getEdgeCount(),
          });
        }
      }
    } catch (error) {
      handleError(error, context, {
        logLevel: "error",
        throw: false, // Don't throw, log and continue
        recover: () => {
          logger.debug("Continuing after error in processGames");
        },
      });
    }
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen(ws: WebSocket): void {
    const clientId = crypto.randomUUID();
    this.clients.set(clientId, {
      ws,
      subscribed: false,
      lastHeartbeat: Date.now(),
    });
    this.wsToClientId.set(ws, clientId);

    logger.debug("Client connected", { clientId });

    // Send welcome message
    ws.send(JSON.stringify({
      type: "welcome",
      clientId,
      timestamp: Date.now(),
    }));
  }

  /**
   * Find client by WebSocket instance
   */
  private findClientByWebSocket(ws: WebSocket): WebSocketClient | null {
    const clientId = this.wsToClientId.get(ws);
    if (!clientId) {
      return null;
    }
    return this.clients.get(clientId) || null;
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(ws: WebSocket): void {
    const clientId = this.wsToClientId.get(ws);
    if (clientId) {
      this.clients.delete(clientId);
      this.wsToClientId.delete(ws);
      logger.debug("Client disconnected", { clientId });
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(ws: WebSocket, error: Error): void {
    logger.error("WebSocket error", error);
    
    const clientId = this.wsToClientId.get(ws);
    if (clientId) {
      this.clients.delete(clientId);
      this.wsToClientId.delete(ws);
    }
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(ws: WebSocket, message: string | Buffer): void {
    try {
      const text = typeof message === "string" ? message : message.toString();
      const data = JSON.parse(text);

      const client = this.findClientByWebSocket(ws);
      if (!client) {
        return;
      }

      switch (data.type) {
        case "subscribe":
          client.subscribed = true;
          ws.send(JSON.stringify({
            type: "subscribed",
            timestamp: Date.now(),
          }));
          break;

        case "unsubscribe":
          client.subscribed = false;
          ws.send(JSON.stringify({
            type: "unsubscribed",
            timestamp: Date.now(),
          }));
          break;

        case "ping":
          client.lastHeartbeat = Date.now();
          ws.send(JSON.stringify({
            type: "pong",
            timestamp: Date.now(),
          }));
          break;

        default:
          logger.warn("Unknown message type", { type: data.type });
      }
    } catch (error) {
      logger.error(
        "Error handling message",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Broadcast message to all subscribed clients
   */
  private broadcast(message: unknown): void {
    const payload = JSON.stringify(message);
    let sentCount = 0;
    let failedCount = 0;

    for (const client of this.clients.values()) {
      if (client.subscribed && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(payload);
          sentCount++;
        } catch (error) {
          failedCount++;
          logger.warn("Failed to send message to client", {
            clientId: this.wsToClientId.get(client.ws),
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    if (sentCount > 0) {
      logger.debug("Broadcast message", {
        sentCount,
        failedCount,
        totalClients: this.clients.size,
      });
    }
  }

  /**
   * Send heartbeat to all clients
   */
  private sendHeartbeat(): void {
    const now = Date.now();
    const timeout = this.config.radar.heartbeatInterval * 2;

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastHeartbeat > timeout) {
        // Client hasn't responded, close connection
        logger.warn("Client heartbeat timeout", { clientId });
        try {
          client.ws.close();
        } catch (error) {
          // Ignore
        }
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: "running" | "stopped";
    clients: number;
    subscribedClients: number;
    ledgerSize: number;
    ledgerEdgeCount: number;
    circuitBreakerStatus: ReturnType<typeof this.hedger.getCircuitBreakerStatus>;
  } {
    const subscribedClients = Array.from(this.clients.values()).filter(
      (c) => c.subscribed
    ).length;

    return {
      status: this.isRunning ? "running" : "stopped",
      clients: this.clients.size,
      subscribedClients,
      ledgerSize: this.ledger.getSize(),
      ledgerEdgeCount: this.ledger.getEdgeCount(),
      circuitBreakerStatus: this.hedger.getCircuitBreakerStatus(),
    };
  }
}

