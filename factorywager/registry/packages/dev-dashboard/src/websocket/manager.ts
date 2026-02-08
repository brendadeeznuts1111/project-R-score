/**
 * WebSocket client management and broadcasting
 * 
 * Handles WebSocket connections, subscriptions, and broadcasting updates
 * to connected clients using Bun's native WebSocket API.
 */

import { logger } from '../../user-profile/src/index.ts';

/**
 * WebSocket client with subscription data
 */
export interface WebSocketClient {
  send: (data: string | ArrayBuffer) => void;
  readyState: number;
  data: {
    connectedAt: number;
    subscriptions: Set<string>;
  };
}

/**
 * WebSocket client manager
 */
export class WebSocketManager {
  private clients = new Set<WebSocketClient>();

  /**
   * Add a client to the manager
   */
  add(client: WebSocketClient): void {
    this.clients.add(client);
    logger.info(`🔌 WebSocket client connected (${this.clients.size} total)`);
  }

  /**
   * Remove a client from the manager
   */
  remove(client: WebSocketClient): void {
    this.clients.delete(client);
    logger.info(`🔌 WebSocket client disconnected (${this.clients.size} remaining)`);
  }

  /**
   * Get the number of connected clients
   */
  get size(): number {
    return this.clients.size;
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(type: string, data: any): void {
    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now(),
    });

    this.clients.forEach(ws => {
      try {
        // Check if client is subscribed to this type (or subscribed to all)
        const subscriptions = ws.data?.subscriptions || new Set(['*']);
        const isSubscribed = subscriptions.has('*') || subscriptions.has(type);

        if (isSubscribed && ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      } catch (error) {
        logger.warn(`Failed to send WebSocket message: ${error}`);
        this.clients.delete(ws);
      }
    });
  }

  /**
   * Send a message to a specific client
   */
  sendToClient(client: WebSocketClient, type: string, data: any): void {
    try {
      if (client.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({
          type,
          data,
          timestamp: Date.now(),
        });
        client.send(message);
      }
    } catch (error) {
      logger.warn(`Failed to send WebSocket message to client: ${error}`);
      this.clients.delete(client);
    }
  }

  /**
   * Handle WebSocket message from client
   */
  handleMessage(ws: WebSocketClient, message: string | Buffer): void {
    try {
      const data = JSON.parse(message.toString());

      // Handle client messages
      switch (data.type) {
        case 'ping':
          this.sendToClient(ws, 'pong', { timestamp: Date.now() });
          break;
        case 'subscribe':
          // Client can subscribe to specific update types
          if (!ws.data) {
            ws.data = {
              connectedAt: Date.now(),
              subscriptions: new Set(['*']),
            };
          }
          ws.data.subscriptions = new Set(data.channels || ['*']);
          this.sendToClient(ws, 'subscribed', {
            channels: Array.from(ws.data.subscriptions),
          });
          break;
        default:
          logger.warn(`Unknown WebSocket message type: ${data.type}`);
      }
    } catch (error) {
      logger.error(`WebSocket message error: ${error}`);
    }
  }

  /**
   * Handle WebSocket connection open
   */
  handleOpen(ws: WebSocketClient): void {
    // Initialize client data
    ws.data = {
      connectedAt: Date.now(),
      subscriptions: new Set(['*']), // Subscribe to all by default
    };

    this.add(ws);

    // Send welcome message
    this.sendToClient(ws, 'connected', {
      message: 'Connected to FactoryWager Dev Dashboard',
    });
  }

  /**
   * Handle WebSocket connection close
   */
  handleClose(ws: WebSocketClient): void {
    this.remove(ws);
  }

  /**
   * Handle WebSocket error
   */
  handleError(ws: WebSocketClient, error: Error): void {
    logger.error(`WebSocket error: ${error}`);
    this.remove(ws);
  }

  /**
   * Get all connected clients (for debugging/monitoring)
   */
  getClients(): WebSocketClient[] {
    return Array.from(this.clients);
  }
}

/**
 * Global WebSocket manager instance
 */
export const wsManager = new WebSocketManager();

/**
 * Convenience function for broadcasting updates
 * Maintains backward compatibility with existing code
 */
export function broadcastUpdate(type: string, data: any): void {
  wsManager.broadcast(type, data);
}
