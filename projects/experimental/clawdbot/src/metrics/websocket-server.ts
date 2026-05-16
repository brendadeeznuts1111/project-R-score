/**
 * Metrics WebSocket Server - Real-time metrics with Response.json optimization.
 * Uses Bun.serve with native WebSocket support.
 */

import type { ServerWebSocket } from "bun";
import { MetricsCollector } from "./collector.js";
import { AnomalyDetector, type SystemMetrics } from "./anomaly-detector.js";
import { SQLiteMetricsStore } from "./sqlite-store.js";
import {
  type ClientMessage,
  type ServerMessage,
  type Thresholds,
  handleClientMessage,
  serverMessages,
} from "./protocol.js";
import type { MetricsData, SkillExecutionRecord } from "./types.js";

export type MetricsServerConfig = {
  port: number;
  hostname?: string;
  maxConnections?: number;
  pingInterval?: number;
  updateInterval?: number;
};

type ClientState = {
  subscribed: boolean;
  skills?: string[];
  lastPing: number;
};

const DEFAULT_CONFIG: MetricsServerConfig = {
  port: 9876,
  hostname: "localhost",
  maxConnections: 50,
  pingInterval: 30000,
  updateInterval: 5000,
};

export class MetricsWebSocketServer {
  private server: ReturnType<typeof Bun.serve<ClientState>> | null = null;
  private config: MetricsServerConfig;
  private collector: MetricsCollector;
  private detector: AnomalyDetector;
  private store: SQLiteMetricsStore | null;
  private clients: Map<ServerWebSocket<ClientState>, ClientState> = new Map();
  private updateTimer: ReturnType<typeof setInterval> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    collector: MetricsCollector,
    detector?: AnomalyDetector,
    store?: SQLiteMetricsStore,
    config?: Partial<MetricsServerConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.collector = collector;
    this.detector = detector ?? new AnomalyDetector();
    this.store = store ?? null;
  }

  /**
   * Start the metrics server.
   */
  start(): void {
    if (this.server) return;

    const self = this;

    this.server = Bun.serve<ClientState>({
      port: this.config.port,
      hostname: this.config.hostname,

      fetch(req, server) {
        const url = new URL(req.url);

        // REST endpoint for snapshot - uses Response.json (3.5x faster)
        if (url.pathname === "/api/metrics") {
          return Response.json(self.collectMetrics(), {
            headers: { "Cache-Control": "no-store" },
          });
        }

        // REST endpoint for thresholds
        if (url.pathname === "/api/thresholds") {
          return Response.json(self.detector.getThresholds(), {
            headers: { "Cache-Control": "no-store" },
          });
        }

        // Health check
        if (url.pathname === "/health") {
          return Response.json(
            {
              status: "ok",
              connections: self.clients.size,
              uptime: process.uptime(),
            },
            { headers: { "Cache-Control": "no-store" } },
          );
        }

        // WebSocket upgrade
        if (url.pathname === "/ws" || url.pathname === "/") {
          // Check max connections
          if (self.clients.size >= (self.config.maxConnections ?? 50)) {
            return Response.json({ error: "Max connections reached" }, { status: 503 });
          }

          const upgraded = server.upgrade(req, {
            data: { subscribed: false, lastPing: Date.now() } as ClientState,
          });

          if (!upgraded) {
            return Response.json({ error: "WebSocket upgrade failed" }, { status: 400 });
          }
          return undefined;
        }

        return Response.json({ error: "Not found" }, { status: 404 });
      },

      websocket: {
        open(ws) {
          self.clients.set(ws, ws.data);
          console.log(`[metrics-ws] Client connected (${self.clients.size} total)`);
        },

        message(ws, message) {
          try {
            const msg = JSON.parse(message.toString("utf-8")) as ClientMessage;
            self.handleMessage(ws, msg);
          } catch (err) {
            console.warn("[metrics-ws] Failed to parse message:", err);
            self.send(ws, serverMessages.error("Invalid message format"));
          }
        },

        close(ws) {
          self.clients.delete(ws);
          console.log(`[metrics-ws] Client disconnected (${self.clients.size} total)`);
        },

        drain(ws) {
          // Backpressure relief - ready to send more data
        },
      },
    });

    // Start periodic updates
    this.startUpdateTimer();
    this.startPingTimer();

    console.log(`[metrics-ws] Server started on ${this.config.hostname}:${this.config.port}`);
  }

  /**
   * Stop the server.
   */
  stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    if (this.server) {
      this.server.stop();
      this.server = null;
    }

    this.clients.clear();
    console.log("[metrics-ws] Server stopped");
  }

  /**
   * Handle incoming client messages.
   */
  private handleMessage(ws: ServerWebSocket<ClientState>, msg: ClientMessage): void {
    const state = this.clients.get(ws);
    if (!state) return;

    handleClientMessage(msg, {
      onSubscribe: (skills) => {
        state.subscribed = true;
        state.skills = skills;
        this.clients.set(ws, state);

        // Send initial snapshot
        this.send(ws, serverMessages.snapshot(this.collectMetrics(skills)));
      },

      onUnsubscribe: () => {
        state.subscribed = false;
        state.skills = undefined;
        this.clients.set(ws, state);
      },

      onGetSnapshot: () => {
        this.send(ws, serverMessages.snapshot(this.collectMetrics(state.skills)));
      },

      onSetThresholds: (thresholds: Partial<Thresholds>) => {
        this.detector.setThresholds(thresholds);
        this.broadcast(serverMessages.thresholds(this.detector.getThresholds()));
      },

      onDismissAlert: (alertId: string) => {
        if (this.store) {
          this.store.dismissAlert(alertId);
        }
      },

      onPing: () => {
        state.lastPing = Date.now();
        this.clients.set(ws, state);
        this.send(ws, serverMessages.pong());
      },
    });
  }

  /**
   * Collect current metrics data.
   */
  private collectMetrics(skills?: string[]): MetricsData {
    const data = this.collector.getMetrics();

    if (skills && skills.length > 0) {
      // Filter to requested skills
      const filtered: MetricsData = {
        version: data.version,
        bySkill: {},
        recentExecutions: data.recentExecutions.filter((e: SkillExecutionRecord) =>
          skills.includes(e.skillId),
        ),
        aggregate: data.aggregate,
      };

      for (const skillId of skills) {
        if (data.bySkill[skillId]) {
          filtered.bySkill[skillId] = data.bySkill[skillId];
        }
      }

      return filtered;
    }

    return data;
  }

  /**
   * Record an execution and broadcast to subscribers.
   */
  async recordExecution(record: SkillExecutionRecord): Promise<void> {
    await this.collector.recordExecution(
      record.skillId,
      record.command,
      record.args,
      record.duration,
      record.success,
      record.error,
      record.metadata,
    );

    // Record latency for anomaly detection
    this.detector.recordLatency(record.skillId, record.duration);

    // Persist to SQLite
    if (this.store) {
      this.store.recordExecution(record);
    }

    // Broadcast execution event
    this.broadcast(serverMessages.execution(record), record.skillId);
  }

  /**
   * Check for anomalies and broadcast alerts.
   */
  checkAnomalies(systemMetrics?: SystemMetrics): void {
    const metrics = this.collectMetrics();
    const alerts = this.detector.detectAnomalies(metrics, systemMetrics);

    for (const alert of alerts) {
      // Persist alert
      if (this.store) {
        this.store.recordAlert(alert);
      }

      // Broadcast alert
      this.broadcast(serverMessages.alert(alert));
    }
  }

  /**
   * Send message to a specific client.
   */
  private send(ws: ServerWebSocket<ClientState>, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Client may have disconnected
    }
  }

  /**
   * Broadcast message to all subscribed clients.
   * Stringifies once and reuses for all clients.
   */
  private broadcast(msg: ServerMessage, skillId?: string): void {
    // Pre-stringify once for all clients (avoids N stringify calls)
    const data = JSON.stringify(msg);

    for (const [ws, state] of this.clients) {
      if (!state.subscribed) continue;

      // Filter by skill if client has skill filter and message has skillId
      if (skillId && state.skills && state.skills.length > 0) {
        if (!state.skills.includes(skillId)) continue;
      }

      try {
        ws.send(data);
      } catch {
        // Client may have disconnected
      }
    }
  }

  /**
   * Broadcast pre-stringified data to all subscribed clients.
   */
  private broadcastRaw(data: string, skillId?: string): void {
    for (const [ws, state] of this.clients) {
      if (!state.subscribed) continue;

      if (skillId && state.skills && state.skills.length > 0) {
        if (!state.skills.includes(skillId)) continue;
      }

      try {
        ws.send(data);
      } catch {
        // Client may have disconnected
      }
    }
  }

  /**
   * Start periodic update broadcasts.
   */
  private startUpdateTimer(): void {
    this.updateTimer = setInterval(() => {
      const metrics = this.collectMetrics();
      const alerts = this.store?.getActiveAlerts(10).map((a) => ({
        id: a.id,
        type: a.type as import("./protocol.js").AlertType,
        severity: a.severity as import("./protocol.js").AlertSeverity,
        message: a.message,
        value: a.value,
        threshold: a.threshold,
        timestamp: a.timestamp,
        skillId: a.skillId ?? undefined,
        dismissed: a.dismissed,
      }));

      // Only broadcast to subscribed clients
      for (const [ws, state] of this.clients) {
        if (!state.subscribed) continue;

        const filteredMetrics = state.skills ? this.collectMetrics(state.skills) : metrics;

        this.send(ws, serverMessages.update(filteredMetrics, alerts));
      }
    }, this.config.updateInterval);
  }

  /**
   * Start ping timer for connection health.
   */
  private startPingTimer(): void {
    this.pingTimer = setInterval(() => {
      const now = Date.now();
      const timeout = (this.config.pingInterval ?? 30000) * 2;

      for (const [ws, state] of this.clients) {
        // Close stale connections
        if (now - state.lastPing > timeout) {
          ws.close(1000, "Ping timeout");
          this.clients.delete(ws);
        }
      }
    }, this.config.pingInterval);
  }

  /**
   * Get server stats.
   */
  getStats(): {
    connections: number;
    subscribedClients: number;
    port: number;
  } {
    let subscribed = 0;
    for (const state of this.clients.values()) {
      if (state.subscribed) subscribed++;
    }

    return {
      connections: this.clients.size,
      subscribedClients: subscribed,
      port: this.config.port,
    };
  }
}

/**
 * Create and start a metrics WebSocket server.
 */
export function createMetricsServer(
  collector: MetricsCollector,
  config?: Partial<MetricsServerConfig>,
): MetricsWebSocketServer {
  const store = new SQLiteMetricsStore();
  const detector = new AnomalyDetector();
  const server = new MetricsWebSocketServer(collector, detector, store, config);
  server.start();
  return server;
}
