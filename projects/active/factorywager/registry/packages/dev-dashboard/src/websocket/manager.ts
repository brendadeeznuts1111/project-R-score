/**
 * WebSocket client management and broadcasting
 * 
 * Handles WebSocket connections, subscriptions, and broadcasting updates
 * to connected clients using Bun's native WebSocket API with pub/sub.
 * 
 * Performance Optimizations:
 * - Uses Bun's native pub/sub API (server.publish/ws.subscribe) for efficient broadcasting
 * - Leverages Bun's built-in topic-based subscriptions (similar to MQTT/Redis Pub/Sub)
 * - Automatic connection pooling and compression (perMessageDeflate)
 * - Built-in backpressure handling via send() return values
 * 
 * Reference: https://bun.com/docs/runtime/websockets
 */

import { logger } from '../../../user-profile/src/index.ts';
import type { DeviceMonitor } from '../duoplus/device-monitor.ts';

/**
 * WebSocket client data type
 * This type is used to strongly type ws.data in Bun.serve()
 * 
 * Contextual data is set in server.upgrade() and available in all WebSocket handlers.
 * Reference: https://bun.com/docs/runtime/websockets#contextual-data
 */
export interface WebSocketData {
  connectedAt: number;
  subscriptions: Set<string>;
  clientId: string;
  sessionId?: string;
  userId?: string;
  agentId?: string;
}

/**
 * WebSocket client interface (compatible with Bun's ServerWebSocket)
 * 
 * Bun's ServerWebSocket has these methods:
 * - send(message, compress?): number - Returns bytes sent, -1 for backpressure, 0 for dropped
 * - subscribe(topic): void - Subscribe to a topic
 * - unsubscribe(topic): void - Unsubscribe from a topic
 * - publish(topic, message): void - Publish to a topic (excluding self)
 * - isSubscribed(topic): boolean - Check subscription status
 * - close(code?, reason?): void - Close the connection
 * - cork(cb): void - Batch multiple sends
 */
export interface WebSocketClient {
  readonly data: WebSocketData;
  readonly readyState: number;
  readonly remoteAddress: string;
  readonly subscriptions: string[];
  send(message: string | ArrayBuffer | Uint8Array, compress?: boolean): number;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  publish(topic: string, message: string | ArrayBuffer | Uint8Array): void;
  isSubscribed(topic: string): boolean;
  close(code?: number, reason?: string): void;
  cork(cb: (ws: WebSocketClient) => void): void;
}

/**
 * WebSocket client manager using Bun's native pub/sub API
 * 
 * Uses Bun's built-in topic-based pub/sub for efficient broadcasting.
 * Topics are automatically managed by Bun, reducing memory overhead.
 */
export class WebSocketManager {
  private server: any = null; // Bun server instance (set after Bun.serve())
  private clientCount = 0;
  private deviceMonitor: DeviceMonitor | null = null;
  private abTesting: import('../ab-testing.ts').ABTestingFramework | null = null;
  private socialFeed: import('../social.ts').SocialFeed | null = null;
  private agentSockets = new Map<string, WebSocketClient>();

  /**
   * Set the Bun server instance (called after Bun.serve())
   */
  setServer(server: any): void {
    this.server = server;
  }

  /**
   * Set the device monitor for subscribe_device / unsubscribe_device (optional).
   */
  setDeviceMonitor(monitor: DeviceMonitor | null): void {
    this.deviceMonitor = monitor;
  }

  /**
   * Set the A/B testing framework for agent_action (optional).
   */
  setABTesting(ab: import('../ab-testing.ts').ABTestingFramework | null): void {
    this.abTesting = ab;
  }

  /**
   * Set the social feed for social_interaction (optional).
   */
  setSocialFeed(feed: import('../social.ts').SocialFeed | null): void {
    this.socialFeed = feed;
  }

  /**
   * Get client by agent ID (for sendToAgent).
   */
  getClientByAgentId(agentId: string): WebSocketClient | null {
    return this.agentSockets.get(agentId) ?? null;
  }

  /**
   * Add a client to the manager
   * Note: Clients are automatically managed by Bun's WebSocket handlers
   */
  add(client: WebSocketClient): void {
    this.clientCount++;
    logger.info(`🔌 WebSocket client connected (${this.clientCount} total)`);
  }

  /**
   * Remove a client from the manager
   */
  remove(client: WebSocketClient): void {
    this.clientCount = Math.max(0, this.clientCount - 1);
    logger.info(`🔌 WebSocket client disconnected (${this.clientCount} remaining)`);
  }

  /**
   * Get the number of connected clients
   */
  get size(): number {
    return this.clientCount;
  }

  /**
   * Broadcast a message to all clients subscribed to a topic
   * 
   * Uses Bun's native server.publish() for efficient topic-based broadcasting.
   * This is more efficient than manually iterating clients.
   * 
   * Note: server.publish() sends to ALL subscribers of a topic.
   * If you need to exclude the sender, use ws.publish() instead.
   * 
   * Reference: https://bun.com/docs/runtime/websockets#pubsub
   * 
   * @param type - Message type (used as topic name)
   * @param data - Message data
   */
  broadcast(type: string, data: any): void {
    if (!this.server) {
      logger.warn('WebSocket server not initialized, cannot broadcast');
      return;
    }

    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now(),
    });

    // Use Bun's native pub/sub API for efficient broadcasting
    // Topic name is based on message type (e.g., 'benchmark:complete', 'alerts')
    // server.publish() sends to ALL subscribers (including the sender if they're subscribed)
    const topic = `dashboard:${type}`;
    const sent = this.server.publish(topic, message, true); // compress: true
    
    // Return value is the number of subscribers that received the message
    if (sent === 0) {
      logger.debug(`No subscribers for topic: ${topic}`);
    } else {
      logger.debug(`Broadcasted ${type} to ${sent} subscribers`);
    }
  }

  /**
   * Send a message to a specific client
   * 
   * Uses Bun's send() which returns a number indicating backpressure:
   * - -1: Message enqueued but backpressure detected
   * - 0: Message dropped (connection issue)
   * - 1+: Number of bytes sent
   * 
   * For batching multiple sends, use ws.cork() to send them together:
   * ```typescript
   * ws.cork(() => {
   *   ws.send('message1');
   *   ws.send('message2');
   * });
   * ```
   * 
   * Reference: https://bun.com/docs/runtime/websockets#backpressure
   */
  sendToClient(client: WebSocketClient, type: string, data: any): void {
    try {
      if (client.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({
          type,
          data,
          timestamp: Date.now(),
        });
        
        const result = client.send(message, true); // compress: true
        
        // Handle backpressure
        if (result === -1) {
          logger.debug(`WebSocket backpressure detected for client`);
        } else if (result === 0) {
          logger.warn(`WebSocket message dropped (connection issue)`);
        }
      }
    } catch (error) {
      logger.warn(`Failed to send WebSocket message to client: ${error}`);
    }
  }
  
  /**
   * Publish a message to a topic excluding the sender
   * 
   * Uses ws.publish() which sends to all subscribers EXCEPT the sender.
   * This is useful for echo prevention (e.g., chat messages).
   * 
   * For broadcasting to ALL subscribers including sender, use broadcast() instead.
   * 
   * Reference: https://bun.com/docs/runtime/websockets#pubsub
   */
  publishExcludingSender(ws: WebSocketClient, type: string, data: any): void {
    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now(),
    });
    
    const topic = `dashboard:${type}`;
    ws.publish(topic, message); // Excludes sender automatically
  }

  /**
   * Handle WebSocket message from client
   * 
   * Uses Bun's native pub/sub API for subscriptions.
   */
  handleMessage(ws: WebSocketClient, message: string | ArrayBuffer | Uint8Array): void {
    try {
      const messageStr = typeof message === 'string' 
        ? message 
        : new TextDecoder().decode(message);
      const data = JSON.parse(messageStr);

      // Handle client messages
      switch (data.type) {
        case 'ping':
          // Handle ping/pong for connection keepalive
          const pongMessage = JSON.stringify({
            type: 'pong',
            data: { timestamp: Date.now() },
            timestamp: Date.now(),
          });
          const result = ws.send(pongMessage, true); // compress: true
          if (result === -1) {
            logger.debug('WebSocket backpressure detected on pong');
          }
          break;
        case 'subscribe':
          // Client subscribes to specific topics using Bun's native API
          const channels = data.channels || ['*'];
          ws.data.subscriptions = new Set(channels);
          
          // Subscribe to Bun topics
          channels.forEach((channel: string) => {
            const topic = channel === '*' ? 'dashboard:*' : `dashboard:${channel}`;
            if (!ws.isSubscribed(topic)) {
              ws.subscribe(topic);
            }
          });
          
          this.sendToClient(ws, 'subscribed', {
            channels: Array.from(ws.data.subscriptions),
          });
          break;
        case 'unsubscribe':
          // Unsubscribe from topics
          const unsubChannels = data.channels || [];
          unsubChannels.forEach((channel: string) => {
            const topic = channel === '*' ? 'dashboard:*' : `dashboard:${channel}`;
            if (ws.isSubscribed(topic)) {
              ws.unsubscribe(topic);
            }
          });
          ws.data.subscriptions = new Set(
            Array.from(ws.data.subscriptions).filter(c => !unsubChannels.includes(c))
          );
          this.sendToClient(ws, 'unsubscribed', {
            channels: Array.from(ws.data.subscriptions),
          });
          break;
        case 'subscribe_device':
          if (this.deviceMonitor && typeof data.deviceId === 'string') {
            this.deviceMonitor.subscribe(data.deviceId, ws);
            if (!ws.isSubscribed('dashboard:device_update')) {
              ws.subscribe('dashboard:device_update');
            }
            if (!ws.isSubscribed('dashboard:device_alert')) {
              ws.subscribe('dashboard:device_alert');
            }
            this.sendToClient(ws, 'device_subscribed', { deviceId: data.deviceId });
          }
          break;
        case 'unsubscribe_device':
          if (this.deviceMonitor && typeof data.deviceId === 'string') {
            this.deviceMonitor.unsubscribe(data.deviceId, ws);
            this.sendToClient(ws, 'device_unsubscribed', { deviceId: data.deviceId });
          }
          break;
        case 'register_agent':
          if (typeof data.agentId === 'string') {
            (ws.data as { agentId?: string }).agentId = data.agentId;
            this.agentSockets.set(data.agentId, ws);
            this.sendToClient(ws, 'agent_registered', { agentId: data.agentId });
          }
          break;
        case 'agent_action':
          if (this.abTesting && typeof data.experimentId === 'string' && typeof data.variantId === 'string' && typeof data.action === 'string') {
            const agentId = (ws.data as { agentId?: string }).agentId || ws.data.clientId;
            this.abTesting.recordInteraction(agentId, data.experimentId, data.variantId, data.action, {
              target: typeof data.target === 'string' ? data.target : undefined,
              metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata as Record<string, unknown> : undefined,
            });
          }
          break;
        case 'social_interaction':
          if (this.socialFeed && typeof data.fromAgent === 'string' && typeof data.toAgent === 'string' && typeof data.type === 'string') {
            this.socialFeed.handleSocialInteraction(
              data.fromAgent,
              data.toAgent,
              data.type,
              typeof data.content === 'string' ? data.content : undefined
            );
          }
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
   * 
   * Uses Bun's native subscribe() API for topic-based subscriptions.
   */
  handleOpen(ws: WebSocketClient): void {
    // Initialize client data (already set in server.upgrade(), but ensure it exists)
    if (!ws.data) {
      ws.data = {
        connectedAt: Date.now(),
        subscriptions: new Set(['*']), // Subscribe to all by default
      };
    }

    // Subscribe to all dashboard updates using Bun's native API
    ws.subscribe('dashboard:*');
    
    // Also subscribe to common specific topics
    ws.subscribe('dashboard:benchmark:complete');
    ws.subscribe('dashboard:p2p:complete');
    ws.subscribe('dashboard:profile:complete');
    ws.subscribe('dashboard:tests:complete');
    ws.subscribe('dashboard:data:updated');
    ws.subscribe('dashboard:alerts');

    this.add(ws);

    // Send welcome message
    const welcomeMessage = JSON.stringify({
      type: 'connected',
      data: {
        message: 'Connected to FactoryWager Dev Dashboard',
        subscriptions: Array.from(ws.data.subscriptions),
      },
      timestamp: Date.now(),
    });
    
    const result = ws.send(welcomeMessage, true); // compress: true
    if (result === -1) {
      logger.debug('WebSocket backpressure detected on welcome message');
    }
  }

  /**
   * Handle WebSocket connection close
   * 
   * Bun automatically unsubscribes from topics when connection closes.
   */
  handleClose(ws: WebSocketClient, code?: number, message?: string): void {
    const agentId = (ws.data as { agentId?: string }).agentId;
    if (agentId) this.agentSockets.delete(agentId);
    this.deviceMonitor?.unsubscribeAll(ws);
    logger.debug(`WebSocket closed: code=${code}, message=${message || 'none'}`);
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
   * 
   * Note: With Bun's pub/sub API, we don't maintain a client list.
   * This method returns an empty array as clients are managed by Bun.
   */
  getClients(): WebSocketClient[] {
    // Clients are managed by Bun's WebSocket handlers, not stored here
    return [];
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
