/**
 * Real-time Manager
 * Handles WebSocket connections and Server-Sent Events for real-time communication
 */

export interface WebSocketClient {
  id: string;
  userId?: string;
  role?: string;
  subscriptions: Set<string>;
  lastActivity: number;
  websocket: WebSocket;
}

export interface SSEClient {
  id: string;
  userId?: string;
  role?: string;
  subscriptions: Set<string>;
  response: Response;
  controller: AbortController;
  lastActivity: number;
}

export interface RealTimeMessage {
  type: string;
  channel: string;
  payload: any;
  timestamp: number;
  senderId?: string;
  targetUserId?: string;
  metadata?: Record<string, any>;
}

export interface RealTimeConfig {
  enableWebSocket: boolean;
  enableSSE: boolean;
  maxConnections: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  messageQueueSize: number;
}

export class RealTimeManager {
  private config: RealTimeConfig;
  private wsClients: Map<string, WebSocketClient> = new Map();
  private sseClients: Map<string, SSEClient> = new Map();
  private messageQueues: Map<string, RealTimeMessage[]> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: RealTimeConfig) {
    this.config = config;
    this.startHeartbeat();
  }

  /**
   * Handle WebSocket connection
   */
  async handleWebSocket(request: Request, env: any): Promise<Response> {
    if (!this.config.enableWebSocket) {
      return new Response('WebSocket connections are disabled', { status: 503 });
    }

    try {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Create client record
      const clientId = this.generateClientId();
      const wsClient: WebSocketClient = {
        id: clientId,
        subscriptions: new Set(),
        lastActivity: Date.now(),
        websocket: server as any,
      };

      // Store client
      this.wsClients.set(clientId, wsClient);

      // Handle WebSocket messages
      server.addEventListener('message', event => {
        this.handleWebSocketMessage(clientId, event.data);
      });

      server.addEventListener('close', () => {
        this.removeWebSocketClient(clientId);
      });

      server.addEventListener('error', () => {
        this.removeWebSocketClient(clientId);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      return new Response('WebSocket connection failed', { status: 500 });
    }
  }

  /**
   * Handle Server-Sent Events connection
   */
  async handleSSE(request: Request): Promise<Response> {
    if (!this.config.enableSSE) {
      return new Response('Server-Sent Events are disabled', { status: 503 });
    }

    const clientId = this.generateClientId();
    const controller = new AbortController();

    // Parse query parameters for subscriptions
    const url = new URL(request.url);
    const subscriptions = url.searchParams.get('channels')?.split(',') || ['general'];

    const sseClient: SSEClient = {
      id: clientId,
      subscriptions: new Set(subscriptions),
      response: null as any,
      controller,
      lastActivity: Date.now(),
    };

    // Store client
    this.sseClients.set(clientId, sseClient);

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start: controller => {
        // Send initial connection message
        const initialMessage = {
          type: 'connection',
          data: {
            clientId,
            timestamp: Date.now(),
            message: 'Connected to Fire22 Real-time API',
          },
        };
        controller.enqueue(`data: ${JSON.stringify(initialMessage)}\n\n`);

        // Send queued messages
        this.sendQueuedMessages(clientId, controller);

        // Set up cleanup on abort
        request.signal.addEventListener('abort', () => {
          this.removeSSEClient(clientId);
          controller.close();
        });
      },
      cancel: () => {
        this.removeSSEClient(clientId);
      },
    });

    const response = new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Client-ID': clientId,
      },
    });

    // Store response reference
    sseClient.response = response;

    return response;
  }

  /**
   * Broadcast message to all connected clients
   */
  async broadcast(message: Omit<RealTimeMessage, 'timestamp'>): Promise<void> {
    const fullMessage: RealTimeMessage = {
      ...message,
      timestamp: Date.now(),
    };

    // Send to WebSocket clients
    for (const [clientId, client] of this.wsClients) {
      if (client.subscriptions.has(message.channel) || message.channel === 'broadcast') {
        try {
          client.websocket.send(JSON.stringify(fullMessage));
          client.lastActivity = Date.now();
        } catch (error) {
          console.error(`Failed to send to WebSocket client ${clientId}:`, error);
          this.removeWebSocketClient(clientId);
        }
      }
    }

    // Send to SSE clients
    for (const [clientId, client] of this.sseClients) {
      if (client.subscriptions.has(message.channel) || message.channel === 'broadcast') {
        this.queueMessage(clientId, fullMessage);
        client.lastActivity = Date.now();
      }
    }
  }

  /**
   * Send message to specific user
   */
  async sendToUser(userId: string, message: Omit<RealTimeMessage, 'timestamp'>): Promise<void> {
    const fullMessage: RealTimeMessage = {
      ...message,
      timestamp: Date.now(),
      targetUserId: userId,
    };

    // Send to WebSocket clients
    for (const [clientId, client] of this.wsClients) {
      if (client.userId === userId) {
        try {
          client.websocket.send(JSON.stringify(fullMessage));
          client.lastActivity = Date.now();
        } catch (error) {
          console.error(`Failed to send to WebSocket client ${clientId}:`, error);
          this.removeWebSocketClient(clientId);
        }
      }
    }

    // Send to SSE clients
    for (const [clientId, client] of this.sseClients) {
      if (client.userId === userId) {
        this.queueMessage(clientId, fullMessage);
        client.lastActivity = Date.now();
      }
    }
  }

  /**
   * Send message to specific channel
   */
  async sendToChannel(channel: string, message: Omit<RealTimeMessage, 'timestamp'>): Promise<void> {
    const fullMessage: RealTimeMessage = {
      ...message,
      timestamp: Date.now(),
      channel,
    };

    // Send to WebSocket clients
    for (const [clientId, client] of this.wsClients) {
      if (client.subscriptions.has(channel)) {
        try {
          client.websocket.send(JSON.stringify(fullMessage));
          client.lastActivity = Date.now();
        } catch (error) {
          console.error(`Failed to send to WebSocket client ${clientId}:`, error);
          this.removeWebSocketClient(clientId);
        }
      }
    }

    // Send to SSE clients
    for (const [clientId, client] of this.sseClients) {
      if (client.subscriptions.has(channel)) {
        this.queueMessage(clientId, fullMessage);
        client.lastActivity = Date.now();
      }
    }
  }

  /**
   * Subscribe client to channel
   */
  subscribeClient(clientId: string, channel: string): boolean {
    // Check WebSocket clients
    const wsClient = this.wsClients.get(clientId);
    if (wsClient) {
      wsClient.subscriptions.add(channel);
      return true;
    }

    // Check SSE clients
    const sseClient = this.sseClients.get(clientId);
    if (sseClient) {
      sseClient.subscriptions.add(channel);
      return true;
    }

    return false;
  }

  /**
   * Unsubscribe client from channel
   */
  unsubscribeClient(clientId: string, channel: string): boolean {
    // Check WebSocket clients
    const wsClient = this.wsClients.get(clientId);
    if (wsClient) {
      wsClient.subscriptions.delete(channel);
      return true;
    }

    // Check SSE clients
    const sseClient = this.sseClients.get(clientId);
    if (sseClient) {
      sseClient.subscriptions.delete(channel);
      return true;
    }

    return false;
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    websocket: { total: number; active: number };
    sse: { total: number; active: number };
    channels: string[];
  } {
    const now = Date.now();
    const activeThreshold = now - this.config.connectionTimeout;

    const activeWS = Array.from(this.wsClients.values()).filter(
      client => client.lastActivity > activeThreshold
    ).length;

    const activeSSE = Array.from(this.sseClients.values()).filter(
      client => client.lastActivity > activeThreshold
    ).length;

    const channels = new Set<string>();
    for (const client of this.wsClients.values()) {
      client.subscriptions.forEach(channel => channels.add(channel));
    }
    for (const client of this.sseClients.values()) {
      client.subscriptions.forEach(channel => channels.add(channel));
    }

    return {
      websocket: {
        total: this.wsClients.size,
        active: activeWS,
      },
      sse: {
        total: this.sseClients.size,
        active: activeSSE,
      },
      channels: Array.from(channels),
    };
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(clientId: string, data: string): void {
    try {
      const message = JSON.parse(data);
      const client = this.wsClients.get(clientId);

      if (!client) {
        return;
      }

      client.lastActivity = Date.now();

      switch (message.type) {
        case 'subscribe':
          if (message.channel) {
            client.subscriptions.add(message.channel);
            client.websocket.send(
              JSON.stringify({
                type: 'subscribed',
                channel: message.channel,
                timestamp: Date.now(),
              })
            );
          }
          break;

        case 'unsubscribe':
          if (message.channel) {
            client.subscriptions.delete(message.channel);
            client.websocket.send(
              JSON.stringify({
                type: 'unsubscribed',
                channel: message.channel,
                timestamp: Date.now(),
              })
            );
          }
          break;

        case 'ping':
          client.websocket.send(
            JSON.stringify({
              type: 'pong',
              timestamp: Date.now(),
            })
          );
          break;

        default:
          console.log(`Unknown WebSocket message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Queue message for SSE client
   */
  private queueMessage(clientId: string, message: RealTimeMessage): void {
    if (!this.messageQueues.has(clientId)) {
      this.messageQueues.set(clientId, []);
    }

    const queue = this.messageQueues.get(clientId)!;
    queue.push(message);

    // Limit queue size
    if (queue.length > this.config.messageQueueSize) {
      queue.shift(); // Remove oldest message
    }

    // Try to send immediately if client is connected
    this.sendQueuedMessages(clientId);
  }

  /**
   * Send queued messages to SSE client
   */
  private sendQueuedMessages(clientId: string, controller?: ReadableStreamDefaultController): void {
    const client = this.sseClients.get(clientId);
    if (!client) {
      return;
    }

    const queue = this.messageQueues.get(clientId) || [];
    if (queue.length === 0) {
      return;
    }

    // Use provided controller or try to get it from the response
    let targetController = controller;

    if (!targetController) {
      // This is a simplified approach - in a real implementation,
      // you'd need a way to access the stream controller
      return;
    }

    // Send all queued messages
    while (queue.length > 0) {
      const message = queue.shift()!;
      try {
        targetController.enqueue(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        // If we can't send, put the message back in the queue
        queue.unshift(message);
        break;
      }
    }
  }

  /**
   * Remove WebSocket client
   */
  private removeWebSocketClient(clientId: string): void {
    this.wsClients.delete(clientId);
    this.messageQueues.delete(clientId);
  }

  /**
   * Remove SSE client
   */
  private removeSSEClient(clientId: string): void {
    const client = this.sseClients.get(clientId);
    if (client) {
      client.controller.abort();
      this.sseClients.delete(clientId);
      this.messageQueues.delete(clientId);
    }
  }

  /**
   * Start heartbeat for connection monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeoutThreshold = now - this.config.connectionTimeout;

      // Clean up timed out connections
      for (const [clientId, client] of this.wsClients) {
        if (client.lastActivity < timeoutThreshold) {
          this.removeWebSocketClient(clientId);
        }
      }

      for (const [clientId, client] of this.sseClients) {
        if (client.lastActivity < timeoutThreshold) {
          this.removeSSEClient(clientId);
        }
      }

      // Send heartbeat to active connections
      const heartbeatMessage = {
        type: 'heartbeat',
        timestamp: now,
      };

      for (const client of this.wsClients.values()) {
        if (client.lastActivity > timeoutThreshold) {
          try {
            client.websocket.send(JSON.stringify(heartbeatMessage));
          } catch (error) {
            console.error(`Heartbeat failed for WebSocket client ${client.id}:`, error);
          }
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat and cleanup
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all WebSocket connections
    for (const client of this.wsClients.values()) {
      try {
        client.websocket.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
    }

    // Abort all SSE connections
    for (const client of this.sseClients.values()) {
      client.controller.abort();
    }

    this.wsClients.clear();
    this.sseClients.clear();
    this.messageQueues.clear();
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `rt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Default real-time configuration
export const defaultRealTimeConfig: RealTimeConfig = {
  enableWebSocket: true,
  enableSSE: true,
  maxConnections: 1000,
  heartbeatInterval: 30000, // 30 seconds
  connectionTimeout: 60000, // 1 minute
  messageQueueSize: 100,
};
