#!/usr/bin/env bun

/**
 * 🔔 R2 Event System - Real-time Notifications & WebSocket Integration
 *
 * Provides event-driven architecture for R2 operations with:
 * - WebSocket-based live updates
 * - Event streaming for real-time monitoring
 * - Pub/Sub pattern for cross-service communication
 * - Hook system for custom event handlers
 */

import { styled, FW_COLORS } from '../theme/colors';

export interface R2Event {
  id: string;
  type: R2EventType;
  timestamp: string;
  bucket: string;
  key?: string;
  metadata?: Record<string, any>;
  source: string;
}

export type R2EventType =
  | 'object:created'
  | 'object:updated'
  | 'object:deleted'
  | 'object:accessed'
  | 'bucket:sync-started'
  | 'bucket:sync-completed'
  | 'bucket:sync-failed'
  | 'lifecycle:expired'
  | 'lifecycle:archived'
  | 'backup:started'
  | 'backup:completed'
  | 'backup:failed'
  | 'search:index-updated'
  | 'cache:invalidated'
  | 'batch:started'
  | 'batch:completed'
  | 'batch:failed'
  | 'error:occurred';

export interface EventHandler {
  (event: R2Event): void | Promise<void>;
}

export interface EventFilter {
  types?: R2EventType[];
  buckets?: string[];
  keys?: string[];
  sources?: string[];
  since?: Date;
  until?: Date;
}

export interface WebSocketConfig {
  port?: number;
  path?: string;
  heartbeatInterval?: number;
  maxConnections?: number;
  authentication?: boolean;
}

export class R2EventSystem {
  private handlers: Map<R2EventType, Set<EventHandler>> = new Map();
  private globalHandlers: Set<EventHandler> = new Set();
  private eventHistory: R2Event[] = [];
  private maxHistorySize: number = 10000;
  private wsClients: Set<WebSocket> = new Set();
  private wsServer?: WebSocket;
  private config: WebSocketConfig;
  private isRunning: boolean = false;
  private eventCounter: number = 0;

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      port: config.port || 8787,
      path: config.path || '/r2-events',
      heartbeatInterval: config.heartbeatInterval || 30000,
      maxConnections: config.maxConnections || 100,
      authentication: config.authentication ?? false,
    };
  }

  /**
   * Initialize the event system and start WebSocket server
   */
  async initialize(): Promise<void> {
    if (this.isRunning) return;

    console.log(styled('🔔 Initializing R2 Event System', 'accent'));

    // Start WebSocket server
    await this.startWebSocketServer();

    // Start heartbeat
    this.startHeartbeat();

    this.isRunning = true;
    const EVENT_SYSTEM_HOST =
      process.env.EVENT_SYSTEM_HOST || process.env.SERVER_HOST || 'localhost';
    console.log(
      styled(
        `✅ Event system running on ws://${EVENT_SYSTEM_HOST}:${this.config.port}${this.config.path}`,
        'success'
      )
    );
  }

  /**
   * Start WebSocket server for real-time events
   */
  private async startWebSocketServer(): Promise<void> {
    try {
      const server = Bun.serve({
        port: this.config.port,
        fetch(req, server) {
          const url = new URL(req.url);
          if (url.pathname === this.config.path) {
            const upgraded = server.upgrade(req, {
              data: {
                clientId: crypto.randomUUID(),
                connectedAt: new Date().toISOString(),
              },
            });
            if (upgraded) return undefined;
          }
          return new Response('R2 Event System', { status: 200 });
        },
        websocket: {
          open: ws => {
            if (this.wsClients.size >= this.config.maxConnections!) {
              ws.close(1008, 'Maximum connections reached');
              return;
            }
            this.wsClients.add(ws);
            console.log(
              styled(`🔌 WebSocket client connected (${this.wsClients.size} total)`, 'info')
            );

            // Send welcome message
            ws.send(
              JSON.stringify({
                type: 'connection:established',
                clientId: ws.data.clientId,
                timestamp: new Date().toISOString(),
              })
            );
          },
          close: ws => {
            this.wsClients.delete(ws);
            console.log(
              styled(`🔌 WebSocket client disconnected (${this.wsClients.size} remaining)`, 'muted')
            );
          },
          message: (ws, message) => {
            this.handleWebSocketMessage(ws, message);
          },
        },
      });

      console.log(styled(`🌐 WebSocket server started on port ${this.config.port}`, 'success'));
    } catch (error) {
      console.error(styled(`❌ Failed to start WebSocket server: ${error.message}`, 'error'));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(ws: WebSocket, message: string | Buffer): void {
    try {
      const data = JSON.parse(message.toString());

      switch (data.action) {
        case 'subscribe':
          ws.data.subscriptions = data.types || ['*'];
          ws.send(
            JSON.stringify({
              type: 'subscription:confirmed',
              subscriptions: ws.data.subscriptions,
            })
          );
          break;

        case 'unsubscribe':
          ws.data.subscriptions = [];
          ws.send(JSON.stringify({ type: 'subscription:cleared' }));
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;

        case 'history':
          const history = this.getEventHistory({
            types: data.types,
            since: data.since ? new Date(data.since) : undefined,
            limit: data.limit || 100,
          });
          ws.send(JSON.stringify({ type: 'history', events: history }));
          break;
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    setInterval(() => {
      const heartbeat = {
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        connections: this.wsClients.size,
      };

      this.broadcastToWebSockets(heartbeat);
    }, this.config.heartbeatInterval);
  }

  /**
   * Broadcast event to all WebSocket clients
   */
  private broadcastToWebSockets(event: any): void {
    const message = JSON.stringify(event);
    this.wsClients.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          // Check subscription
          const subscriptions = ws.data.subscriptions || ['*'];
          if (subscriptions.includes('*') || subscriptions.includes(event.type)) {
            ws.send(message);
          }
        }
      } catch (error) {
        console.warn(styled(`⚠️ Failed to send to WebSocket client: ${error.message}`, 'warning'));
      }
    });
  }

  /**
   * Emit an R2 event
   */
  emit(event: Omit<R2Event, 'id' | 'timestamp'>): void {
    const fullEvent: R2Event = {
      ...event,
      id: `evt-${Date.now()}-${++this.eventCounter}`,
      timestamp: new Date().toISOString(),
    };

    // Store in history
    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    // Call type-specific handlers
    const typeHandlers = this.handlers.get(fullEvent.type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => {
        try {
          handler(fullEvent);
        } catch (error) {
          console.error(styled(`❌ Event handler error: ${error.message}`, 'error'));
        }
      });
    }

    // Call global handlers
    this.globalHandlers.forEach(handler => {
      try {
        handler(fullEvent);
      } catch (error) {
        console.error(styled(`❌ Global handler error: ${error.message}`, 'error'));
      }
    });

    // Broadcast to WebSocket clients
    this.broadcastToWebSockets(fullEvent);

    // Log significant events
    if (this.isSignificantEvent(fullEvent.type)) {
      console.log(styled(`📢 ${fullEvent.type}: ${fullEvent.key || fullEvent.bucket}`, 'info'));
    }
  }

  /**
   * Subscribe to specific event types
   */
  on(type: R2EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: EventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to events once
   */
  once(type: R2EventType): Promise<R2Event> {
    return new Promise(resolve => {
      const unsubscribe = this.on(type, event => {
        unsubscribe();
        resolve(event);
      });
    });
  }

  /**
   * Wait for specific event condition
   */
  async waitFor(
    type: R2EventType,
    condition: (event: R2Event) => boolean,
    timeout: number = 30000
  ): Promise<R2Event> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Timeout waiting for event: ${type}`));
      }, timeout);

      const unsubscribe = this.on(type, event => {
        if (condition(event)) {
          clearTimeout(timer);
          unsubscribe();
          resolve(event);
        }
      });
    });
  }

  /**
   * Get event history with optional filtering
   */
  getEventHistory(filter?: EventFilter & { limit?: number }): R2Event[] {
    let events = [...this.eventHistory];

    if (filter?.types) {
      events = events.filter(e => filter.types!.includes(e.type));
    }
    if (filter?.buckets) {
      events = events.filter(e => filter.buckets!.includes(e.bucket));
    }
    if (filter?.keys) {
      events = events.filter(
        e =>
          e.key &&
          filter.keys!.some(pattern => e.key!.includes(pattern) || this.matchGlob(e.key!, pattern))
      );
    }
    if (filter?.sources) {
      events = events.filter(e => filter.sources!.includes(e.source));
    }
    if (filter?.since) {
      events = events.filter(e => new Date(e.timestamp) >= filter.since!);
    }
    if (filter?.until) {
      events = events.filter(e => new Date(e.timestamp) <= filter.until!);
    }

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filter?.limit) {
      events = events.slice(0, filter.limit);
    }

    return events;
  }

  /**
   * Create event stream (async iterator)
   */
  async *createEventStream(filter?: EventFilter): AsyncGenerator<R2Event> {
    const buffer: R2Event[] = [];
    let resolveNext: ((event: R2Event) => void) | null = null;

    const unsubscribe = this.onAll(event => {
      if (this.matchesFilter(event, filter)) {
        if (resolveNext) {
          resolveNext(event);
          resolveNext = null;
        } else {
          buffer.push(event);
        }
      }
    });

    try {
      while (true) {
        if (buffer.length > 0) {
          yield buffer.shift()!;
        } else {
          yield new Promise<R2Event>(resolve => {
            resolveNext = resolve;
          });
        }
      }
    } finally {
      unsubscribe();
    }
  }

  /**
   * Get event statistics
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByBucket: Record<string, number>;
    activeConnections: number;
    uptime: number;
  } {
    const eventsByType: Record<string, number> = {};
    const eventsByBucket: Record<string, number> = {};

    this.eventHistory.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsByBucket[event.bucket] = (eventsByBucket[event.bucket] || 0) + 1;
    });

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      eventsByBucket,
      activeConnections: this.wsClients.size,
      uptime: Date.now() - (this as any).startTime || 0,
    };
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
    this.emit({
      type: 'cache:invalidated',
      bucket: 'system',
      source: 'R2EventSystem',
      metadata: { action: 'history-cleared' },
    });
  }

  /**
   * Shutdown the event system
   */
  async shutdown(): Promise<void> {
    console.log(styled('🛑 Shutting down R2 Event System', 'warning'));

    // Close all WebSocket connections
    this.wsClients.forEach(ws => {
      ws.close(1000, 'Server shutting down');
    });
    this.wsClients.clear();

    // Clear handlers
    this.handlers.clear();
    this.globalHandlers.clear();

    this.isRunning = false;
    console.log(styled('✅ Event system shutdown complete', 'success'));
  }

  // Private helper methods

  private isSignificantEvent(type: R2EventType): boolean {
    return [
      'object:created',
      'object:deleted',
      'bucket:sync-failed',
      'backup:failed',
      'error:occurred',
    ].includes(type);
  }

  private matchesFilter(event: R2Event, filter?: EventFilter): boolean {
    if (!filter) return true;

    if (filter.types && !filter.types.includes(event.type)) return false;
    if (filter.buckets && !filter.buckets.includes(event.bucket)) return false;
    if (filter.sources && !filter.sources.includes(event.source)) return false;
    if (
      filter.keys &&
      event.key &&
      !filter.keys.some(
        pattern => event.key!.includes(pattern) || this.matchGlob(event.key!, pattern)
      )
    )
      return false;
    if (filter.since && new Date(event.timestamp) < filter.since) return false;
    if (filter.until && new Date(event.timestamp) > filter.until) return false;

    return true;
  }

  private matchGlob(str: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return regex.test(str);
  }
}

// Export singleton instance
export const r2EventSystem = new R2EventSystem();

// Helper functions for common events
export function emitObjectCreated(bucket: string, key: string, metadata?: any): void {
  r2EventSystem.emit({
    type: 'object:created',
    bucket,
    key,
    metadata,
    source: 'R2Client',
  });
}

export function emitObjectUpdated(bucket: string, key: string, metadata?: any): void {
  r2EventSystem.emit({
    type: 'object:updated',
    bucket,
    key,
    metadata,
    source: 'R2Client',
  });
}

export function emitObjectDeleted(bucket: string, key: string): void {
  r2EventSystem.emit({
    type: 'object:deleted',
    bucket,
    key,
    source: 'R2Client',
  });
}

// CLI interface
if (import.meta.main) {
  const events = r2EventSystem;
  await events.initialize();

  console.log(styled('\n📊 R2 Event System Test', 'accent'));
  console.log(styled('=======================', 'accent'));

  // Subscribe to all events
  events.onAll(event => {
    console.log(
      styled(`[${event.timestamp}] ${event.type}: ${event.key || event.bucket}`, 'muted')
    );
  });

  // Emit test events
  emitObjectCreated('scanner-cookies', 'test/object1.json', { size: 1024 });
  emitObjectUpdated('scanner-cookies', 'test/object2.json', { size: 2048 });

  console.log(styled('\n📈 Event Stats:', 'info'));
  const stats = events.getStats();
  console.log(styled(`  Total Events: ${stats.totalEvents}`, 'muted'));
  console.log(styled(`  Active Connections: ${stats.activeConnections}`, 'muted'));

  // Keep running
  console.log(styled('\n🌐 WebSocket server running. Press Ctrl+C to stop.', 'info'));

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await events.shutdown();
    process.exit(0);
  });
}
