/**
 * Realtime WebSocket Manager
 *
 * Enhanced WebSocket handling with:
 * - Topic-based subscriptions
 * - Delta updates
 * - Heartbeat/ping-pong
 * - Activity feed
 */

import type { ServerWebSocket } from "bun";

// ============================================================================
// Types
// ============================================================================

export type RealtimeTopic =
  | "dashboard"
  | "projects"
  | "metrics"
  | "alerts"
  | "activity"
  | "system";

export interface RealtimeClient {
  ws: ServerWebSocket<unknown>;
  topics: Set<RealtimeTopic>;
  lastPing: number;
  seq: number;
}

export interface RealtimeMessage<T = unknown> {
  topic: RealtimeTopic;
  type: "full" | "delta" | "heartbeat";
  data: T;
  timestamp: number;
  seq: number;
}

export interface ActivityEvent {
  id: string;
  type: "git" | "file" | "api" | "alert" | "system";
  project?: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Realtime Manager
// ============================================================================

class RealtimeManager {
  private clients = new Map<ServerWebSocket<unknown>, RealtimeClient>();
  private activities: ActivityEvent[] = [];
  private seqCounter = 0;
  private lastData = new Map<RealtimeTopic, unknown>();

  /** Max activities to keep in memory */
  private maxActivities = 100;

  /**
   * Register a new WebSocket client
   */
  register(ws: ServerWebSocket<unknown>, initialTopics: RealtimeTopic[] = ["dashboard"]): RealtimeClient {
    const client: RealtimeClient = {
      ws,
      topics: new Set(initialTopics),
      lastPing: Date.now(),
      seq: 0,
    };
    this.clients.set(ws, client);
    console.log(`[Realtime] Client registered (${this.clients.size} total)`);
    return client;
  }

  /**
   * Unregister a WebSocket client
   */
  unregister(ws: ServerWebSocket<unknown>): void {
    this.clients.delete(ws);
    console.log(`[Realtime] Client unregistered (${this.clients.size} total)`);
  }

  /**
   * Get client by WebSocket
   */
  getClient(ws: ServerWebSocket<unknown>): RealtimeClient | undefined {
    return this.clients.get(ws);
  }

  /**
   * Subscribe client to topics
   */
  subscribe(ws: ServerWebSocket<unknown>, topics: RealtimeTopic[]): void {
    const client = this.clients.get(ws);
    if (!client) return;

    for (const topic of topics) {
      client.topics.add(topic);
    }
    console.log(`[Realtime] Client subscribed to: ${topics.join(", ")}`);
  }

  /**
   * Unsubscribe client from topics
   */
  unsubscribe(ws: ServerWebSocket<unknown>, topics: RealtimeTopic[]): void {
    const client = this.clients.get(ws);
    if (!client) return;

    for (const topic of topics) {
      client.topics.delete(topic);
    }
  }

  /**
   * Handle incoming message from client
   */
  handleMessage(ws: ServerWebSocket<unknown>, message: string): void {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "ping":
          this.handlePing(ws, data.timestamp);
          break;

        case "subscribe":
          if (Array.isArray(data.topics)) {
            this.subscribe(ws, data.topics);
          }
          break;

        case "unsubscribe":
          if (Array.isArray(data.topics)) {
            this.unsubscribe(ws, data.topics);
          }
          break;

        case "refresh":
          this.sendRefresh(ws, data.topic);
          break;

        default:
          // Legacy: pass to default handler
          return;
      }
    } catch {
      // Not JSON or parse error, ignore
    }
  }

  /**
   * Handle ping and send pong with latency
   */
  private handlePing(ws: ServerWebSocket<unknown>, timestamp: number): void {
    const client = this.clients.get(ws);
    if (client) {
      client.lastPing = Date.now();
    }

    ws.send(
      JSON.stringify({
        type: "pong",
        timestamp,
        serverTime: Date.now(),
      })
    );
  }

  /**
   * Send full refresh for a topic
   */
  private sendRefresh(ws: ServerWebSocket<unknown>, topic?: RealtimeTopic): void {
    const client = this.clients.get(ws);
    if (!client) return;

    const topicsToRefresh = topic ? [topic] : [...client.topics];

    for (const t of topicsToRefresh) {
      const data = this.lastData.get(t);
      if (data) {
        this.sendToClient(ws, t, data, "full");
      }
    }
  }

  /**
   * Broadcast data to all subscribed clients
   */
  broadcast<T>(topic: RealtimeTopic, data: T, type: "full" | "delta" = "full"): void {
    // Store last data for new clients
    if (type === "full") {
      this.lastData.set(topic, data);
    }

    const message = this.createMessage(topic, data, type);

    for (const [ws, client] of this.clients) {
      if (client.topics.has(topic)) {
        try {
          client.seq = message.seq;
          ws.send(JSON.stringify(message));
        } catch (err) {
          console.error("[Realtime] Send error:", err);
        }
      }
    }
  }

  /**
   * Send to specific client
   */
  private sendToClient<T>(
    ws: ServerWebSocket<unknown>,
    topic: RealtimeTopic,
    data: T,
    type: "full" | "delta"
  ): void {
    const message = this.createMessage(topic, data, type);
    ws.send(JSON.stringify(message));
  }

  /**
   * Create a realtime message
   */
  private createMessage<T>(topic: RealtimeTopic, data: T, type: "full" | "delta"): RealtimeMessage<T> {
    return {
      topic,
      type,
      data,
      timestamp: Date.now(),
      seq: ++this.seqCounter,
    };
  }

  /**
   * Add activity event and broadcast
   */
  addActivity(event: Omit<ActivityEvent, "id" | "timestamp">): void {
    const activity: ActivityEvent = {
      ...event,
      id: Bun.randomUUIDv7(),
      timestamp: Date.now(),
    };

    this.activities.unshift(activity);
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(0, this.maxActivities);
    }

    // Broadcast to activity subscribers
    this.broadcast("activity", { activities: [activity] }, "delta");
  }

  /**
   * Get recent activities
   */
  getActivities(limit = 20): ActivityEvent[] {
    return this.activities.slice(0, limit);
  }

  /**
   * Get all WebSocket connections (for legacy compatibility)
   */
  getAllClients(): Set<ServerWebSocket<unknown>> {
    return new Set(this.clients.keys());
  }

  /**
   * Get stats
   */
  getStats(): {
    clients: number;
    subscriptions: Record<RealtimeTopic, number>;
    activities: number;
  } {
    const subscriptions: Record<RealtimeTopic, number> = {
      dashboard: 0,
      projects: 0,
      metrics: 0,
      alerts: 0,
      activity: 0,
      system: 0,
    };

    for (const client of this.clients.values()) {
      for (const topic of client.topics) {
        subscriptions[topic]++;
      }
    }

    return {
      clients: this.clients.size,
      subscriptions,
      activities: this.activities.length,
    };
  }

  /**
   * Broadcast to all clients (legacy compatibility)
   */
  broadcastAll(data: unknown): void {
    const message = JSON.stringify(data);
    for (const ws of this.clients.keys()) {
      try {
        ws.send(message);
      } catch {
        // Client disconnected
      }
    }
  }
}

// Singleton instance
export const realtime = new RealtimeManager();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Log activity for git operations
 */
export function logGitActivity(project: string, message: string, metadata?: Record<string, unknown>): void {
  realtime.addActivity({
    type: "git",
    project,
    message,
    metadata,
  });
}

/**
 * Log activity for API operations
 */
export function logApiActivity(message: string, metadata?: Record<string, unknown>): void {
  realtime.addActivity({
    type: "api",
    message,
    metadata,
  });
}

/**
 * Log activity for system events
 */
export function logSystemActivity(message: string, metadata?: Record<string, unknown>): void {
  realtime.addActivity({
    type: "system",
    message,
    metadata,
  });
}

/**
 * Log alert
 */
export function logAlert(message: string, metadata?: Record<string, unknown>): void {
  realtime.addActivity({
    type: "alert",
    message,
    metadata,
  });
}

export default realtime;
