import type { ServerWebSocket } from "bun";
import { ProxyServerConfig as ConfigClass } from "./config";
import type {
  WebSocketConnectionInformation,
  WebSocketProxyPerformanceMetrics,
} from "./types";
import { WebSocketProxyOperationalError } from "./types";

/**
 * WebSocket Connection Manager for tracking active connections
 */
class WebSocketConnectionManager {
  private connections = new Map<string, WebSocketConnectionInformation>();
  private stats: WebSocketProxyPerformanceMetrics = {
    totalConnectionCount: 0,
    activeConnectionCount: 0,
    totalMessageCount: 0,
    totalByteCount: 0,
    averageLatencyMilliseconds: 0,
    totalErrorCount: 0,
    serverUptimeMilliseconds: Date.now(),
    systemMemoryUsage: process.memoryUsage(),
    systemCpuUsage: process.cpuUsage(),
  };

  /**
   * Register a new WebSocket connection
   */
  registerWebSocketConnection(
    id: string,
    remoteAddress: string,
    targetUrl: string,
    userAgent?: string
  ): WebSocketConnectionInformation {
    const now = Date.now();
    const connection: WebSocketConnectionInformation = {
      connectionUniqueId: id,
      clientRemoteAddress: remoteAddress,
      clientUserAgent: userAgent,
      connectionEstablishedTimestamp: now,
      lastActivityTimestamp: now,
      outboundMessageCount: 0,
      inboundMessageCount: 0,
      inboundByteCount: 0,
      outboundByteCount: 0,
      targetWebSocketUrl: targetUrl,
    };

    this.connections.set(id, connection);
    this.stats.totalConnectionCount++;
    this.stats.activeConnectionCount++;
    this.updateSystemStats();

    return connection;
  }

  /**
   * Unregister a WebSocket connection
   */
  unregisterWebSocketConnection(id: string): void {
    const connection = this.connections.get(id);
    if (connection) {
      this.connections.delete(id);
      this.stats.activeConnectionCount--;
      this.updateSystemStats();
    }
  }

  /**
   * Update WebSocket connection activity metrics
   */
  updateWebSocketConnectionActivity(
    id: string,
    bytesReceived?: number,
    bytesSent?: number
  ): void {
    const connection = this.connections.get(id);
    if (connection) {
      connection.lastActivityTimestamp = Date.now();
      if (bytesReceived) {
        connection.inboundByteCount += bytesReceived;
        this.stats.totalByteCount += bytesReceived;
      }
      if (bytesSent) {
        connection.outboundByteCount += bytesSent;
        this.stats.totalByteCount += bytesSent;
      }
    }
  }

  /**
   * Increment WebSocket message count
   */
  updateMessageCountForConnection(id: string, isMessageSent = false): void {
    const connection = this.connections.get(id);
    if (connection) {
      if (isMessageSent) {
        connection.outboundMessageCount++;
      } else {
        connection.inboundMessageCount++;
      }
      this.stats.totalMessageCount++;
    }
  }

  /**
   * Get WebSocket connection by unique identifier
   */
  getWebSocketConnectionById(
    id: string
  ): WebSocketConnectionInformation | undefined {
    return this.connections.get(id);
  }

  /**
   * Get all active WebSocket connections
   */
  getAllActiveWebSocketConnections(): WebSocketConnectionInformation[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get current stats
   */
  getStats(): WebSocketProxyPerformanceMetrics {
    this.updateSystemStats();
    return { ...this.stats };
  }

  /**
   * Update system statistics
   */
  private updateSystemStats(): void {
    this.stats.systemMemoryUsage = process.memoryUsage();
    this.stats.systemCpuUsage = process.cpuUsage();
    this.stats.serverUptimeMilliseconds =
      Date.now() - this.stats.serverUptimeMilliseconds;
  }

  /**
   * Clean up idle connections
   */
  cleanupIdleConnections(idleTimeout: number): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, connection] of this.connections) {
      if (now - connection.lastActivityTimestamp > idleTimeout) {
        this.connections.delete(id);
        this.stats.activeConnectionCount--;
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * WebSocket Proxy Connection Handler
 */
class WebSocketProxyConnection {
  private clientSocket?: WebSocket;
  private targetSocket?: WebSocket;
  private connectionId: string;
  private connectionManager: WebSocketConnectionManager;
  private config: ConfigClass;
  private reconnectAttempts = 0;
  private isActive = false;

  constructor(
    connectionId: string,
    connectionManager: WebSocketConnectionManager,
    config: ConfigClass
  ) {
    this.connectionId = connectionId;
    this.connectionManager = connectionManager;
    this.config = config;
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(
    clientSocket: ServerWebSocket<any>,
    remoteAddress: string,
    userAgent?: string
  ): Promise<void> {
    this.clientSocket = clientSocket as any;

    // Add connection to manager
    this.connectionManager.registerWebSocketConnection(
      this.connectionId,
      remoteAddress,
      this.config.targetUrl,
      userAgent
    );

    try {
      // Connect to target
      await this.connectToTarget();

      // Set up message forwarding
      this.setupMessageForwarding();

      this.isActive = true;
    } catch (error) {
      this.handleError(error as Error);
      this.cleanup();
    }
  }

  /**
   * Connect to target WebSocket server
   */
  private async connectToTarget(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.targetSocket = new WebSocket(this.config.targetUrl);

        const timeout = setTimeout(() => {
          reject(
            new WebSocketProxyOperationalError(
              "Target connection timeout",
              "TARGET_TIMEOUT"
            )
          );
        }, this.config.idleTimeout);

        this.targetSocket.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        this.targetSocket.onerror = (error) => {
          clearTimeout(timeout);
          reject(
            new WebSocketProxyOperationalError(
              "Target connection failed",
              "TARGET_CONNECTION_ERROR"
            )
          );
        };
      } catch (error) {
        reject(
          new WebSocketProxyOperationalError(
            "Failed to create target connection",
            "TARGET_CREATION_ERROR"
          )
        );
      }
    });
  }

  /**
   * Set up bidirectional message forwarding
   */
  private setupMessageForwarding(): void {
    if (!this.clientSocket || !this.targetSocket) return;

    // Client to Target
    this.clientSocket.onmessage = (event) => {
      if (this.targetSocket?.readyState === WebSocket.OPEN) {
        const data = event.data;
        const size = typeof data === "string" ? data.length : data.byteLength;

        this.connectionManager.updateWebSocketConnectionActivity(
          this.connectionId,
          size,
          0
        );
        this.connectionManager.updateMessageCountForConnection(
          this.connectionId,
          false
        );

        this.targetSocket.send(data);
      }
    };

    // Target to Client
    this.targetSocket.onmessage = (event) => {
      if (this.clientSocket?.readyState === WebSocket.OPEN) {
        const data = event.data;
        const size = typeof data === "string" ? data.length : data.byteLength;

        this.connectionManager.updateWebSocketConnectionActivity(
          this.connectionId,
          0,
          size
        );
        this.connectionManager.updateMessageCountForConnection(
          this.connectionId,
          true
        );

        this.clientSocket.send(data);
      }
    };

    // Handle connection close
    this.clientSocket.onclose = () => {
      this.cleanup();
    };

    this.targetSocket.onclose = () => {
      this.handleTargetClose();
    };

    // Handle errors
    this.clientSocket.onerror = (error) => {
      this.handleError(
        new WebSocketProxyOperationalError(
          "Client socket error",
          "CLIENT_ERROR"
        )
      );
    };

    this.targetSocket.onerror = (error) => {
      this.handleError(
        new WebSocketProxyOperationalError(
          "Target socket error",
          "TARGET_ERROR"
        )
      );
    };
  }

  /**
   * Handle target connection close
   */
  private handleTargetClose(): void {
    if (
      this.config.reconnectAttempts > 0 &&
      this.reconnectAttempts < this.config.reconnectAttempts
    ) {
      this.reconnectAttempts++;

      setTimeout(async () => {
        try {
          await this.connectToTarget();
          this.setupMessageForwarding();
          this.reconnectAttempts = 0; // Reset on successful reconnect
        } catch (error) {
          this.handleError(error as Error);
          if (this.reconnectAttempts >= this.config.reconnectAttempts) {
            this.cleanup();
          }
        }
      }, this.config.reconnectDelay);
    } else {
      this.cleanup();
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error(`Connection ${this.connectionId} error:`, error);

    // Send error to client if possible
    if (this.clientSocket?.readyState === WebSocket.OPEN) {
      this.clientSocket.send(
        JSON.stringify({
          type: "error",
          code:
            (error as WebSocketProxyOperationalError).code || "UNKNOWN_ERROR",
          message: error.message,
        })
      );
    }
  }

  /**
   * Clean up connection
   */
  cleanup(): void {
    this.isActive = false;

    if (this.clientSocket) {
      this.clientSocket.close();
      this.clientSocket = undefined;
    }

    if (this.targetSocket) {
      this.targetSocket.close();
      this.targetSocket = undefined;
    }

    this.connectionManager.unregisterWebSocketConnection(this.connectionId);
  }

  /**
   * Check if connection is active
   */
  isConnectionActive(): boolean {
    return (
      this.isActive &&
      this.clientSocket?.readyState === WebSocket.OPEN &&
      this.targetSocket?.readyState === WebSocket.OPEN
    );
  }
}

/**
 * Main Bun Proxy Server
 */
export class BunProxyServer {
  private config: ConfigClass;
  private connectionManager: WebSocketConnectionManager;
  private server?: any; // Bun.serve returns Server type
  private connections = new Map<string, WebSocketProxyConnection>();
  private healthCheckInterval?: NodeJS.Timeout;
  private statsInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: ConfigClass) {
    this.config = config;
    this.connectionManager = new WebSocketConnectionManager();
  }

  /**
   * Start the proxy server
   */
  async start(): Promise<void> {
    try {
      // Create Bun server
      this.server = Bun.serve({
        port: this.config.listenPort,
        hostname: this.config.listenHost,
        fetch: this.handleHttpRequest.bind(this),
        websocket: {
          message: this.handleWebSocketMessage.bind(this),
          open: this.handleWebSocketOpen.bind(this),
          close: this.handleWebSocketClose.bind(this),
        },
        tls: this.config.tls
          ? {
              cert: this.config.tls.cert,
              key: this.config.tls.key,
              ca: this.config.tls.ca,
              passphrase: this.config.tls.passphrase,
            }
          : undefined,
      });

      // Start background tasks
      this.startBackgroundTasks();

      console.log(
        `🚀 Bun Proxy Server started on ${this.config.getServerUrl()}`
      );
      console.log(`📡 Proxying to: ${this.config.targetUrl}`);
      console.log(`🔧 Max connections: ${this.config.maxConnections}`);
    } catch (error) {
      throw new WebSocketProxyOperationalError(
        `Failed to start server: ${(error as Error).message}`,
        "SERVER_START_ERROR"
      );
    }
  }

  /**
   * Stop the proxy server
   */
  async stop(): Promise<void> {
    try {
      // Clear intervals
      if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
      if (this.statsInterval) clearInterval(this.statsInterval);
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);

      // Close all connections
      for (const connection of this.connections.values()) {
        connection.cleanup();
      }
      this.connections.clear();

      // Stop server
      if (this.server) {
        this.server.stop();
        this.server = undefined;
      }

      console.log("🛑 Bun Proxy Server stopped");
    } catch (error) {
      throw new WebSocketProxyOperationalError(
        `Failed to stop server: ${(error as Error).message}`,
        "SERVER_STOP_ERROR"
      );
    }
  }

  /**
   * Handle HTTP requests (health checks, stats, etc.)
   */
  private async handleHttpRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === this.config.health.endpoint) {
      return this.handleHealthCheck();
    }

    // Stats endpoint
    if (url.pathname === "/stats") {
      return this.handleStatsRequest();
    }

    // Default response for non-WebSocket requests
    return new Response("WebSocket proxy server", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  /**
   * Handle WebSocket connection open
   */
  private handleWebSocketOpen(ws: ServerWebSocket<any>): void {
    const remoteAddress = this.getClientAddressFromWs(ws);
    const userAgent = ws.data?.userAgent || undefined;
    const connectionId = this.generateConnectionId();

    // Check connection limit
    if (
      this.connectionManager.getStats().activeConnectionCount >=
      this.config.maxConnections
    ) {
      ws.close(1013, "Server overloaded");
      return;
    }

    // Create proxy connection
    const proxyConnection = new WebSocketProxyConnection(
      connectionId,
      this.connectionManager,
      this.config
    );
    this.connections.set(connectionId, proxyConnection);

    // Handle connection
    proxyConnection
      .handleConnection(ws as any, remoteAddress, userAgent)
      .catch((error) => {
        console.error("Failed to handle WebSocket connection:", error);
        ws.close(1011, "Internal server error");
      });
  }

  /**
   * Handle WebSocket messages (handled by individual connections)
   */
  private handleWebSocketMessage(ws: ServerWebSocket<any>, message: any): void {
    // Messages are handled by individual proxy connections
    // This is just a placeholder for the interface
  }

  /**
   * Handle WebSocket connection close
   */
  private handleWebSocketClose(
    ws: ServerWebSocket<any>,
    code: number,
    reason: string
  ): void {
    // Cleanup is handled by individual proxy connections
  }

  /**
   * Handle health check requests
   */
  private handleHealthCheck(): Response {
    const stats = this.connectionManager.getStats();
    const isHealthy = stats.activeConnectionCount < this.config.maxConnections;

    const healthData = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: stats.serverUptimeMilliseconds,
      activeConnections: stats.activeConnectionCount,
      maxConnections: this.config.maxConnections,
      totalConnections: stats.totalConnectionCount,
      memoryUsage: stats.systemMemoryUsage,
    };

    return new Response(JSON.stringify(healthData), {
      status: isHealthy ? 200 : 503,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Handle stats requests
   */
  private handleStatsRequest(): Response {
    const performanceMetrics = this.connectionManager.getStats();
    const activeWebSocketConnections =
      this.connectionManager.getAllActiveWebSocketConnections();

    const statsResponseData = {
      ...performanceMetrics,
      connections: activeWebSocketConnections.map((webSocketConnection) => ({
        id: webSocketConnection.connectionUniqueId,
        clientRemoteAddress: webSocketConnection.clientRemoteAddress,
        connectionEstablishedTimestamp:
          webSocketConnection.connectionEstablishedTimestamp,
        lastActivityTimestamp: webSocketConnection.lastActivityTimestamp,
        outboundMessageCount: webSocketConnection.outboundMessageCount,
        inboundMessageCount: webSocketConnection.inboundMessageCount,
        outboundByteCount: webSocketConnection.outboundByteCount,
        inboundByteCount: webSocketConnection.inboundByteCount,
      })),
    };

    return new Response(JSON.stringify(statsResponseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Start background maintenance tasks
   */
  private startBackgroundTasks(): void {
    // Health check interval
    if (this.config.health.enabled) {
      this.healthCheckInterval = setInterval(() => {
        // Health checks are handled by HTTP endpoint
        // This could be used for proactive health monitoring
      }, this.config.health.interval);
    }

    // Stats collection interval
    if (this.config.stats.collectionInterval > 0) {
      this.statsInterval = setInterval(() => {
        // Stats are collected on-demand
        // This could be used for periodic stats export
      }, this.config.stats.collectionInterval);
    }

    // Cleanup interval for idle connections
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.connectionManager.cleanupIdleConnections(
        this.config.idleTimeout
      );
      if (cleaned > 0 && this.config.debug) {
        console.log(`🧹 Cleaned up ${cleaned} idle connections`);
      }
    }, this.config.idleTimeout);
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract client address from ServerWebSocket
   */
  private getClientAddressFromWs(ws: ServerWebSocket<any>): string {
    // Try to get real IP from headers
    const request = ws.data?.request;
    if (request) {
      const forwardedFor = request.headers.get("x-forwarded-for");
      if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
      }

      const realIp = request.headers.get("x-real-ip");
      if (realIp) {
        return realIp;
      }
    }

    // Fallback
    return "unknown";
  }

  /**
   * Get current server stats
   */
  getStats(): WebSocketProxyPerformanceMetrics {
    return this.connectionManager.getStats();
  }

  /**
   * Get active connections
   */
  getActiveConnections(): WebSocketConnectionInformation[] {
    return this.connectionManager.getAllActiveWebSocketConnections();
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== undefined;
  }
}
