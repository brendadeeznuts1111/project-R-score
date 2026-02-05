/**
 * Component #59: WebSocket-Subscription-Tracker
 * Logic Tier: Level 1 (Network)
 * Resource Tax: Mem +2KB/conn
 * Parity Lock: 6y7z...8a0b
 * Protocol: RFC 6455
 *
 * Deduplicated topic list; empty on close.
 * Tracks WebSocket subscriptions for debugging and monitoring.
 *
 * @module infrastructure/websocket-subscription-tracker
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * WebSocket connection data with subscription tracking
 */
export interface TrackedWebSocketData {
  subscriptions: Set<string>;
  subscriptionCount: number;
  connectionId: string;
  connectedAt: number;
  lastActivity: number;
  ip?: string;
  userAgent?: string;
}

/**
 * Subscription event for logging
 */
export interface SubscriptionEvent {
  type: 'subscribe' | 'unsubscribe';
  topic: string;
  connectionId: string;
  timestamp: number;
  totalSubscriptions: number;
}

/**
 * WebSocket with tracking data
 */
export interface TrackedWebSocket {
  data: TrackedWebSocketData;
  readyState: number;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
}

/**
 * WebSocket Subscription Tracker for connection management
 * Provides deduplicated topic tracking and debugging support
 */
export class WebSocketSubscriptionTracker {
  private static connections = new Map<string, TrackedWebSocketData>();
  private static eventLog: SubscriptionEvent[] = [];
  private static maxEventLogSize = 1000;
  private static totalSubscriptions = 0;

  /**
   * Upgrade connection with subscription tracking
   */
  static upgradeConnection(
    req: Request,
    server: { upgrade: (req: Request, options?: { data?: unknown }) => boolean }
  ): boolean {
    if (!isFeatureEnabled('WEBSOCKET_TRANSPORT')) {
      return server.upgrade(req);
    }

    const connectionId = crypto.randomUUID();
    const now = Date.now();

    const data: TrackedWebSocketData = {
      subscriptions: new Set(),
      subscriptionCount: 0,
      connectionId,
      connectedAt: now,
      lastActivity: now,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    };

    // Store in connection map
    this.connections.set(connectionId, data);

    return server.upgrade(req, { data });
  }

  /**
   * Subscribe to a topic with deduplication
   */
  static subscribe(ws: TrackedWebSocket, topic: string): void {
    if (!isFeatureEnabled('WEBSOCKET_TRANSPORT')) {
      ws.subscribe(topic);
      return;
    }

    const data = ws.data;

    // Deduplicate subscription
    if (!data.subscriptions.has(topic)) {
      data.subscriptions.add(topic);
      data.subscriptionCount++;
      data.lastActivity = Date.now();
      this.totalSubscriptions++;

      // Log event
      this.logEvent({
        type: 'subscribe',
        topic,
        connectionId: data.connectionId,
        timestamp: Date.now(),
        totalSubscriptions: data.subscriptionCount,
      });
    }

    // Call underlying subscribe
    ws.subscribe(topic);
  }

  /**
   * Unsubscribe from a topic
   */
  static unsubscribe(ws: TrackedWebSocket, topic: string): void {
    if (!isFeatureEnabled('WEBSOCKET_TRANSPORT')) {
      ws.unsubscribe(topic);
      return;
    }

    const data = ws.data;

    if (data.subscriptions.has(topic)) {
      data.subscriptions.delete(topic);
      data.subscriptionCount--;
      data.lastActivity = Date.now();
      this.totalSubscriptions--;

      // Log event
      this.logEvent({
        type: 'unsubscribe',
        topic,
        connectionId: data.connectionId,
        timestamp: Date.now(),
        totalSubscriptions: data.subscriptionCount,
      });
    }

    // Call underlying unsubscribe
    ws.unsubscribe(topic);
  }

  /**
   * Get deduplicated subscription list
   * Returns empty array after close
   */
  static getSubscriptions(ws: TrackedWebSocket): string[] {
    if (!isFeatureEnabled('WEBSOCKET_TRANSPORT')) {
      return [];
    }

    // Return empty array if closed
    if (ws.readyState === 3) { // CLOSED
      ws.data.subscriptions.clear();
      return [];
    }

    return Array.from(ws.data.subscriptions).sort();
  }

  /**
   * Handle connection close
   */
  static handleClose(ws: TrackedWebSocket): void {
    if (!isFeatureEnabled('WEBSOCKET_TRANSPORT')) return;

    const data = ws.data;

    // Decrement total subscriptions
    this.totalSubscriptions -= data.subscriptionCount;

    // Clear subscriptions
    data.subscriptions.clear();
    data.subscriptionCount = 0;

    // Remove from connections map
    this.connections.delete(data.connectionId);

    if (isFeatureEnabled('DEBUG')) {
      console.debug('[WS-Tracker] Connection closed', {
        component: 59,
        connectionId: data.connectionId,
        duration: `${Date.now() - data.connectedAt}ms`,
      });
    }
  }

  /**
   * Get subscription count for a connection
   */
  static getSubscriptionCount(ws: TrackedWebSocket): number {
    return ws.data?.subscriptionCount ?? 0;
  }

  /**
   * Get total active subscriptions across all connections
   */
  static getTotalSubscriptions(): number {
    return this.totalSubscriptions;
  }

  /**
   * Get active connection count
   */
  static getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connection by ID
   */
  static getConnection(connectionId: string): TrackedWebSocketData | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all active connections
   */
  static getAllConnections(): TrackedWebSocketData[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get recent subscription events
   */
  static getRecentEvents(limit = 100): SubscriptionEvent[] {
    return this.eventLog.slice(-limit);
  }

  /**
   * Get subscriptions by topic
   */
  static getConnectionsByTopic(topic: string): string[] {
    const connectionIds: string[] = [];

    for (const [id, data] of this.connections) {
      if (data.subscriptions.has(topic)) {
        connectionIds.push(id);
      }
    }

    return connectionIds;
  }

  /**
   * Get topic statistics
   */
  static getTopicStats(): Map<string, number> {
    const stats = new Map<string, number>();

    for (const data of this.connections.values()) {
      for (const topic of data.subscriptions) {
        stats.set(topic, (stats.get(topic) || 0) + 1);
      }
    }

    return stats;
  }

  /**
   * Log subscription event
   */
  private static logEvent(event: SubscriptionEvent): void {
    this.eventLog.push(event);

    // Trim log if too large
    if (this.eventLog.length > this.maxEventLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxEventLogSize / 2);
    }

    // Debug logging
    if (isFeatureEnabled('DEBUG')) {
      console.debug('[WS-Tracker]', event.type, {
        topic: event.topic,
        connectionId: event.connectionId.slice(0, 8),
        total: event.totalSubscriptions,
      });
    }
  }

  /**
   * Reset all tracking (for testing)
   */
  static reset(): void {
    this.connections.clear();
    this.eventLog.length = 0;
    this.totalSubscriptions = 0;
  }
}

/**
 * Zero-cost exports
 */
export const upgradeConnection = isFeatureEnabled('WEBSOCKET_TRANSPORT')
  ? WebSocketSubscriptionTracker.upgradeConnection.bind(WebSocketSubscriptionTracker)
  : (req: Request, server: { upgrade: (req: Request) => boolean }) => server.upgrade(req);

export const subscribe = isFeatureEnabled('WEBSOCKET_TRANSPORT')
  ? WebSocketSubscriptionTracker.subscribe.bind(WebSocketSubscriptionTracker)
  : (ws: TrackedWebSocket, topic: string) => ws.subscribe(topic);

export const unsubscribe = isFeatureEnabled('WEBSOCKET_TRANSPORT')
  ? WebSocketSubscriptionTracker.unsubscribe.bind(WebSocketSubscriptionTracker)
  : (ws: TrackedWebSocket, topic: string) => ws.unsubscribe(topic);

export const getSubscriptions = isFeatureEnabled('WEBSOCKET_TRANSPORT')
  ? WebSocketSubscriptionTracker.getSubscriptions.bind(WebSocketSubscriptionTracker)
  : () => [];

export const handleClose = isFeatureEnabled('WEBSOCKET_TRANSPORT')
  ? WebSocketSubscriptionTracker.handleClose.bind(WebSocketSubscriptionTracker)
  : () => {};
