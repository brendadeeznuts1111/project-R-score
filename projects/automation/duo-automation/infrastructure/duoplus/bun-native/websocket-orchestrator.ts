// duoplus/bun-native/websocket-orchestrator.ts
import { serve } from 'bun';

export type WebSocketMessage = {
  type: 'RPA_STATUS_UPDATE' | 'PHONE_HEALTH_CHECK' | 'TASK_COMPLETION' | 'ERROR_NOTIFICATION';
  payload: {
    phoneId?: string;
    progress?: number;
    status?: string;
    error?: string;
    timestamp: number;
    metadata?: Record<string, any>;
  };
};

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastPing: number;
}

export class BunSocketOrchestrator {
  private server: any;
  private clients: Map<string, WebSocketClient> = new Map();
  private port: number;
  private compression: 'deflate' | 'gzip';
  private heartbeatInterval: NodeJS.Timeout;

  constructor(options: {
    port?: number;
    compression?: 'deflate' | 'gzip';
  } = {}) {
    this.port = options.port ?? 3000;
    this.compression = options.compression ?? 'deflate';
    this.setupHeartbeat();
  }

  async start(): Promise<void> {
    this.server = serve({
      port: this.port,
      fetch: this.handleRequest.bind(this),
      websocket: {
        message: this.handleWebSocketMessage.bind(this),
        open: this.handleWebSocketOpen.bind(this),
        close: this.handleWebSocketClose.bind(this),
        error: this.handleWebSocketError.bind(this),
        // Enable compression for better performance
        compression: this.compression,
        // Enable binary messages for efficiency
        binaryType: 'arraybuffer'
      }
    });

    console.log(`🚀 WebSocket Orchestrator started on port ${this.port}`);
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();
    
    if (this.server) {
      this.server.stop();
    }
  }

  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        connectedClients: this.clients.size,
        uptime: process.uptime()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // WebSocket upgrade endpoint
    if (url.pathname === '/ws') {
      return new Response('WebSocket endpoint', { status: 426 });
    }

    return new Response('Not Found', { status: 404 });
  }

  private handleWebSocketOpen(ws: WebSocket, req: Request) {
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      lastPing: Date.now()
    };

    this.clients.set(clientId, client);
    
    // Send welcome message
    this.sendToClient(clientId, {
      type: 'RPA_STATUS_UPDATE',
      payload: {
        timestamp: Date.now(),
        metadata: { message: 'Connected to DuoPlus WebSocket Orchestrator' }
      }
    });

    console.log(`📡 Client connected: ${clientId}`);
  }

  private handleWebSocketMessage(ws: WebSocket, message: string | Buffer) {
    try {
      const data = JSON.parse(message.toString());
      const client = this.findClientByWs(ws);
      
      if (!client) return;

      // Handle subscription requests
      if (data.type === 'SUBSCRIBE') {
        data.phoneIds?.forEach((phoneId: string) => {
          client.subscriptions.add(phoneId);
        });
        
        this.sendToClient(client.id, {
          type: 'RPA_STATUS_UPDATE',
          payload: {
            timestamp: Date.now(),
            metadata: { 
              subscribed: Array.from(client.subscriptions),
              count: client.subscriptions.size
            }
          }
        });
      }

      // Handle unsubscription requests
      if (data.type === 'UNSUBSCRIBE') {
        data.phoneIds?.forEach((phoneId: string) => {
          client.subscriptions.delete(phoneId);
        });
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  }

  private handleWebSocketClose(ws: WebSocket) {
    const client = this.findClientByWs(ws);
    if (client) {
      this.clients.delete(client.id);
      console.log(`📡 Client disconnected: ${client.id}`);
    }
  }

  private handleWebSocketError(ws: WebSocket, error: Error) {
    console.error('WebSocket error:', error);
    const client = this.findClientByWs(ws);
    if (client) {
      this.clients.delete(client.id);
    }
  }

  private findClientByWs(ws: WebSocket): WebSocketClient | null {
    for (const client of this.clients.values()) {
      if (client.ws === ws) {
        return client;
      }
    }
    return null;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Broadcast message to all subscribed clients
   */
  broadcast(message: WebSocketMessage, targetPhoneId?: string): void {
    const messageStr = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      // Send to all clients if no target, or only to subscribed clients
      if (!targetPhoneId || client.subscriptions.has(targetPhoneId)) {
        try {
          client.ws.send(messageStr);
        } catch (error) {
          console.error(`Failed to send to client ${client.id}:`, error);
          // Remove dead client
          this.clients.delete(client.id);
        }
      }
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send to client ${clientId}:`, error);
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * Send RPA status update
   */
  sendRpaStatusUpdate(phoneId: string, progress: number, status: string): void {
    this.broadcast({
      type: 'RPA_STATUS_UPDATE',
      payload: {
        phoneId,
        progress,
        status,
        timestamp: Date.now()
      }
    }, phoneId);
  }

  /**
   * Send phone health check
   */
  sendPhoneHealthCheck(phoneId: string, isOnline: boolean): void {
    this.broadcast({
      type: 'PHONE_HEALTH_CHECK',
      payload: {
        phoneId,
        status: isOnline ? 'online' : 'offline',
        timestamp: Date.now()
      }
    }, phoneId);
  }

  /**
   * Send task completion notification
   */
  sendTaskCompletion(phoneId: string, taskId: string, success: boolean): void {
    this.broadcast({
      type: 'TASK_COMPLETION',
      payload: {
        phoneId,
        status: success ? 'completed' : 'failed',
        timestamp: Date.now(),
        metadata: { taskId }
      }
    }, phoneId);
  }

  /**
   * Send error notification
   */
  sendErrorNotification(phoneId: string, error: string): void {
    this.broadcast({
      type: 'ERROR_NOTIFICATION',
      payload: {
        phoneId,
        error,
        timestamp: Date.now()
      }
    }, phoneId);
  }

  /**
   * Setup heartbeat to keep connections alive
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, client] of this.clients.entries()) {
        // Remove clients that haven't responded in 60 seconds
        if (now - client.lastPing > 60000) {
          client.ws.close();
          this.clients.delete(clientId);
          continue;
        }

        // Send ping
        try {
          client.ws.send(JSON.stringify({
            type: 'PING',
            payload: { timestamp: now }
          }));
        } catch (error) {
          this.clients.delete(clientId);
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      connectedClients: this.clients.size,
      port: this.port,
      compression: this.compression,
      uptime: process.uptime()
    };
  }
}
