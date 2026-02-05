import { serve } from "bun";
import { config } from "./config-loader";
import { CookieManager } from "./cookie-manager";

export interface WebSocketData {
  userId: string;
  role: string;
  permissions: string[];
  protocol?: string;
  extensions?: string[];
  subscribedWorkflows: Set<string>;
  lastPing: number;
  compressionEnabled: boolean;
}

export interface WebSocketMessage {
  type: string;
  action: string;
  data: any;
  id?: string;
  timestamp?: number;
}

export class EnhancedWebSocketServer {
  private server: ReturnType<typeof serve> | null = null;
  private cookieManager: CookieManager;
  private connections: Map<WebSocket, WebSocketData> = new Map();
  private workflowSubscriptions: Map<string, Set<WebSocket>> = new Map();

  constructor() {
    this.cookieManager = new CookieManager();
  }

  createServer(wsConfig?: any) {
    const websocketConfig = wsConfig || config.websocket || {
      compression: true,
      subprotocols: ["betting-workflow-v1"],
      heartbeat_interval: 30000,
      max_message_size: "1MB"
    };

    this.server = serve({
      port: parseInt(Bun.env.WS_PORT || "8080"),
      hostname: Bun.env.WS_HOST || "0.0.0.0",

      // Enhanced WebSocket configuration with Bun 1.3 features
      websocket: {
        // Compression support
        compression: websocketConfig.compression,
        perMessageDeflate: {
          threshold: 1024, // Compress messages > 1KB
          concurrencyLimit: 10,
          serverMaxWindowBits: 15,
          clientMaxWindowBits: 15,
          serverNoContextTakeover: true,
          clientNoContextTakeover: true
        },

        // Subprotocol negotiation
        subprotocols: wsConfig.subprotocols,

        async open(ws) {
          try {
            // Parse cookies from handshake
            const cookies = this.parseCookiesFromHeaders(ws.requestHeaders);
            const session = await this.validateSession(cookies);

            if (!session) {
              ws.close(1008, "Invalid session");
              return;
            }

            // Set WebSocket data with enhanced Bun 1.3 features
            const wsData: WebSocketData = {
              userId: session.userId,
              role: session.role,
              permissions: session.permissions,
              protocol: ws.protocol, // RFC 6455 compliant
              extensions: ws.extensions, // Compression info
              subscribedWorkflows: new Set(),
              lastPing: Date.now(),
              compressionEnabled: ws.extensions?.includes("permessage-deflate") ?? false
            };

            ws.data = wsData;
            this.connections.set(ws, wsData);

            console.log("Enhanced WebSocket connection opened", {
              userId: wsData.userId,
              protocol: wsData.protocol,
              extensions: wsData.extensions,
              compression: wsData.compressionEnabled
            });

            // Send welcome with compression info
            this.send(ws, {
              type: "connection",
              action: "welcome",
              data: {
                protocol: wsData.protocol,
                extensions: wsData.extensions,
                compression: wsData.compressionEnabled,
                serverTime: Date.now(),
                heartbeatInterval: wsConfig.heartbeat_interval
              }
            });

            // Start heartbeat
            this.startHeartbeat(ws);

          } catch (error) {
            console.error("WebSocket open error", error);
            ws.close(1011, "Internal server error");
          }
        },

        async message(ws, message) {
          try {
            const start = performance.now();

            // Handle compressed messages automatically
            let parsedMessage: WebSocketMessage;
            if (message instanceof Buffer) {
              // Bun 1.3 automatically handles decompression
              parsedMessage = JSON.parse(message.toString());
            } else {
              parsedMessage = JSON.parse(message);
            }

            // Process message with enhanced features
            await this.processMessage(ws, parsedMessage);

            const duration = performance.now() - start;
            console.log("WebSocket message processed", {
              userId: ws.data.userId,
              duration: `${duration.toFixed(2)}ms`,
              compressed: message instanceof Buffer,
              messageSize: message.length
            });

          } catch (error) {
            console.error("WebSocket message error", error);
            this.sendError(ws, "Invalid message format");
          }
        },

        close(ws, code, reason) {
          const wsData = this.connections.get(ws);
          console.log("WebSocket connection closed", {
            userId: wsData?.userId,
            code,
            reason: reason.toString(),
            duration: Date.now() - (wsData?.lastPing ?? Date.now())
          });

          this.cleanupConnection(ws);
        },

        // Enhanced error handling
        error(ws, error) {
          console.error("WebSocket error", error);
          this.sendError(ws, "Connection error occurred");
        },

        // Handle ping/pong for heartbeat
        ping(ws, data) {
          ws.pong(data); // Respond to ping
          if (ws.data) {
            ws.data.lastPing = Date.now();
          }
        },

        pong(ws, data) {
          // Client responded to our ping
          if (ws.data) {
            ws.data.lastPing = Date.now();
          }
        }
      },

      // HTTP routes for WebSocket upgrade
      async fetch(req, server) {
        const url = new URL(req.url);

        // WebSocket upgrade endpoint
        if (url.pathname === "/ws" && req.headers.get("upgrade") === "websocket") {
          // Validate upgrade request
          const cookies = this.parseCookies(req.headers.get("cookie") || "");
          const sessionValid = await this.validateSession(cookies);

          if (!sessionValid) {
            return new Response("Unauthorized", { status: 401 });
          }

          // Upgrade to WebSocket with Bun 1.3 enhancements
          const success = server.upgrade(req, {
            data: {
              userId: sessionValid.userId,
              role: sessionValid.role,
              permissions: sessionValid.permissions
            }
          });

          if (!success) {
            return new Response("WebSocket upgrade failed", { status: 400 });
          }

          return undefined; // Bun handles the upgrade
        }

        // Health check
        if (url.pathname === "/health" && req.method === "GET") {
          const connectionCount = this.connections.size;
          const compressionEnabled = wsConfig.compression;
          const subprotocols = wsConfig.subprotocols;

          return new Response(JSON.stringify({
            status: "healthy",
            websocket: {
              connections: connectionCount,
              compression: compressionEnabled,
              subprotocols: subprotocols,
              maxMessageSize: wsConfig.max_message_size
            },
            timestamp: Date.now()
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        // Metrics endpoint
        if (url.pathname === "/ws/metrics" && req.method === "GET") {
          const metrics = {
            connections: {
              total: this.connections.size,
              compressed: Array.from(this.connections.values()).filter(c => c.compressionEnabled).length
            },
            subscriptions: {
              workflows: this.workflowSubscriptions.size,
              totalSubscriptions: Array.from(this.workflowSubscriptions.values()).reduce((sum, subs) => sum + subs.size, 0)
            },
            protocols: this.getProtocolStats(),
            timestamp: Date.now()
          };

          return new Response(JSON.stringify(metrics), {
            headers: { "Content-Type": "application/json" }
          });
        }

        return new Response("Not Found", { status: 404 });
      }
    });

    console.log(`🚀 Enhanced WebSocket Server running on port ${this.server.port}`);
    return this.server;
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    return this.cookieManager.parseCookies(cookieHeader);
  }

  private async validateSession(cookies: Record<string, string>): Promise<any> {
    // Validate session from cookies
    const sessionCookie = cookies.sessionId;
    if (!sessionCookie) return null;

    // In a real implementation, this would validate against database/cache
    // For now, return mock session data
    return {
      userId: "user123",
      role: "trader",
      permissions: ["workflows:read", "betting:read"]
    };
  }

  private async processMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    // Route message based on type
    switch (message.type) {
      case "workflow":
        await this.handleWorkflowMessage(ws, message);
        break;
      case "betting":
        await this.handleBettingMessage(ws, message);
        break;
      case "system":
        await this.handleSystemMessage(ws, message);
        break;
      case "subscription":
        await this.handleSubscriptionMessage(ws, message);
        break;
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private async handleWorkflowMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const wsData = this.connections.get(ws);
    if (!wsData) return;

    switch (message.action) {
      case "subscribe":
        const workflowId = message.data.workflowId;
        if (workflowId) {
          wsData.subscribedWorkflows.add(workflowId);

          // Add to global subscriptions
          if (!this.workflowSubscriptions.has(workflowId)) {
            this.workflowSubscriptions.set(workflowId, new Set());
          }
          this.workflowSubscriptions.get(workflowId)!.add(ws);

          this.send(ws, {
            type: "workflow",
            action: "subscribed",
            data: { workflowId },
            id: message.id
          });
        }
        break;

      case "unsubscribe":
        const unsubscribeId = message.data.workflowId;
        if (unsubscribeId) {
          wsData.subscribedWorkflows.delete(unsubscribeId);

          // Remove from global subscriptions
          const subs = this.workflowSubscriptions.get(unsubscribeId);
          if (subs) {
            subs.delete(ws);
            if (subs.size === 0) {
              this.workflowSubscriptions.delete(unsubscribeId);
            }
          }

          this.send(ws, {
            type: "workflow",
            action: "unsubscribed",
            data: { workflowId: unsubscribeId },
            id: message.id
          });
        }
        break;

      case "update":
        // Broadcast workflow update to subscribers
        const workflowUpdate = message.data;
        this.broadcastToWorkflow(workflowUpdate.workflowId, {
          type: "workflow",
          action: "update",
          data: workflowUpdate
        });
        break;
    }
  }

  private async handleBettingMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    // Handle betting-related messages
    switch (message.action) {
      case "odds_update":
        // Broadcast odds updates
        this.broadcast({
          type: "betting",
          action: "odds_update",
          data: message.data
        }, ws); // Exclude sender
        break;

      case "line_change":
        // Handle line change notifications
        this.send(ws, {
          type: "betting",
          action: "line_change_ack",
          data: { received: true },
          id: message.id
        });
        break;
    }
  }

  private async handleSystemMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const wsData = this.connections.get(ws);
    if (!wsData) return;

    switch (message.action) {
      case "ping":
        this.send(ws, {
          type: "system",
          action: "pong",
          data: { timestamp: Date.now() },
          id: message.id
        });
        break;

      case "status":
        this.send(ws, {
          type: "system",
          action: "status",
          data: {
            userId: wsData.userId,
            role: wsData.role,
            permissions: wsData.permissions,
            subscribedWorkflows: Array.from(wsData.subscribedWorkflows),
            compressionEnabled: wsData.compressionEnabled,
            protocol: wsData.protocol,
            uptime: Date.now() - wsData.lastPing
          }
        });
        break;
    }
  }

  private async handleSubscriptionMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const wsData = this.connections.get(ws);
    if (!wsData) return;

    switch (message.action) {
      case "list":
        const subscriptions = Array.from(wsData.subscribedWorkflows);
        this.send(ws, {
          type: "subscription",
          action: "list",
          data: { subscriptions }
        });
        break;

      case "bulk_subscribe":
        const workflowIds = message.data.workflowIds || [];
        workflowIds.forEach((id: string) => {
          wsData.subscribedWorkflows.add(id);
          if (!this.workflowSubscriptions.has(id)) {
            this.workflowSubscriptions.set(id, new Set());
          }
          this.workflowSubscriptions.get(id)!.add(ws);
        });

        this.send(ws, {
          type: "subscription",
          action: "bulk_subscribed",
          data: { workflowIds }
        });
        break;
    }
  }

  private send(ws: WebSocket, data: WebSocketMessage): void {
    if (ws.readyState !== WebSocket.OPEN) return;

    try {
      const message = JSON.stringify(data);

      // Bun 1.3 automatically handles compression
      ws.send(message);

    } catch (error) {
      console.error("Failed to send WebSocket message", error);
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.send(ws, {
      type: "error",
      action: "display_error",
      data: { message, timestamp: Date.now() }
    });
  }

  private broadcast(message: WebSocketMessage, exclude?: WebSocket): void {
    for (const [ws, wsData] of this.connections) {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        this.send(ws, message);
      }
    }
  }

  private broadcastToWorkflow(workflowId: string, message: WebSocketMessage): void {
    const subscribers = this.workflowSubscriptions.get(workflowId);
    if (!subscribers) return;

    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        this.send(ws, message);
      }
    }
  }

  private startHeartbeat(ws: WebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(interval);
        return;
      }

      const wsData = this.connections.get(ws);
      if (!wsData) {
        clearInterval(interval);
        return;
      }

      // Check if client is still responsive
      const timeSinceLastPing = Date.now() - wsData.lastPing;
      if (timeSinceLastPing > config.websocket.heartbeat_interval * 2) {
        console.log(`Client ${wsData.userId} unresponsive, closing connection`);
        ws.close(1001, "Heartbeat timeout");
        clearInterval(interval);
        return;
      }

      // Send ping
      try {
        ws.ping();
      } catch (error) {
        console.error("Failed to send ping", error);
        clearInterval(interval);
      }
    }, config.websocket.heartbeat_interval);

    // Clean up interval when connection closes
    ws.addEventListener('close', () => clearInterval(interval));
  }

  private cleanupConnection(ws: WebSocket): void {
    const wsData = this.connections.get(ws);
    if (!wsData) return;

    // Cleanup subscriptions
    for (const workflowId of wsData.subscribedWorkflows) {
      const subs = this.workflowSubscriptions.get(workflowId);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) {
          this.workflowSubscriptions.delete(workflowId);
        }
      }
    }

    this.connections.delete(ws);
  }

  private getProtocolStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const wsData of this.connections.values()) {
      const protocol = wsData.protocol || 'unknown';
      stats[protocol] = (stats[protocol] || 0) + 1;
    }
    return stats;
  }

  // Public methods for external control
  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getCompressedConnectionCount(): number {
    return Array.from(this.connections.values()).filter(c => c.compressionEnabled).length;
  }

  public getWorkflowSubscriptionCount(): number {
    return this.workflowSubscriptions.size;
  }

  public stop(): void {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
    this.connections.clear();
    this.workflowSubscriptions.clear();
  }
}
