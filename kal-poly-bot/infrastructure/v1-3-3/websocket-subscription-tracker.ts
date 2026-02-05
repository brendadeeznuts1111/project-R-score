import "./types.d.ts";
// infrastructure/v1-3-3/websocket-subscription-tracker.ts
// Component #59: WebSocket Subscription Tracker for Efficient Tick Data


// Export interfaces for type safety
export interface WebSocketSubscription {
  topic: string;
  patternId?: number;
  priority: number;
  subscribedAt: number;
  lastActivity: number;
  messageCount: number;
}

export interface WebSocketConnection {
  id: string;
  subscriptions: Set<string>;
  data: {
    kalmanPatterns?: Set<number>;
    subscriptionPriorities?: Map<string, number>;
    lastActivity?: number;
    metadata?: Record<string, unknown>;
  };
}

export interface SubscriptionMetrics {
  totalConnections: number;
  totalSubscriptions: number;
  deduplicatedSubscriptions: number;
  averageMessagesPerSecond: number;
  kalmanPatternSubscriptions: number;
}

// WebSocket subscription tracking for tick data
export class WebSocketSubscriptionTracker {
  private static connections = new Map<string, WebSocketConnection>();
  private static subscriptions = new Map<string, WebSocketSubscription>();
  private static metrics: SubscriptionMetrics = {
    totalConnections: 0,
    totalSubscriptions: 0,
    deduplicatedSubscriptions: 0,
    averageMessagesPerSecond: 0,
    kalmanPatternSubscriptions: 0,
  };

  // Enhanced WebSocket upgrade with subscription tracking
  static upgradeConnection(req: Request, server: any): boolean {
    if (!process.env.FEATURE_WS_SUBSCRIPTIONS === "1") {
      return server.upgrade(req);
    }

    const connectionId = this.generateConnectionId();
    const connection: WebSocketConnection = {
      id: connectionId,
      subscriptions: new Set(),
      data: {
        kalmanPatterns: new Set(),
        subscriptionPriorities: new Map(),
        lastActivity: Date.now(),
        metadata: server.data || {},
      },
    };

    // Store connection
    this.connections.set(connectionId, connection);
    this.metrics.totalConnections++;

    // Enhanced server with tracking
    const enhancedServer = {
      ...server,
      data: {
        ...server.data,
        connectionId,
        subscriptionTracker: this,
      },
    };

    const upgraded = server.upgrade(req, enhancedServer);

    if (upgraded) {
      console.log(`[WS_TRACKER] Connection upgraded: ${connectionId}`);
    } else {
      this.connections.delete(connectionId);
      this.metrics.totalConnections--;
    }

    return upgraded;
  }

  // Subscribe to a topic with deduplication
  static subscribe(
    ws: any,
    topic: string,
    patternId?: number,
    priority: number = 50
  ): void {
    if (!process.env.FEATURE_WS_SUBSCRIPTIONS === "1") {
      ws.subscribe(topic);
      return;
    }

    const connectionId = ws.data?.connectionId;
    if (!connectionId) {
      console.warn("[WS_TRACKER] No connection ID found for WebSocket");
      ws.subscribe(topic);
      return;
    }

    const connection = this.connections.get(connectionId);
    if (!connection) {
      console.warn(`[WS_TRACKER] Connection not found: ${connectionId}`);
      ws.subscribe(topic);
      return;
    }

    // Check for deduplication
    if (connection.subscriptions.has(topic)) {
      console.log(`[WS_TRACKER] Already subscribed to: ${topic}`);
      return;
    }

    // Add subscription
    connection.subscriptions.add(topic);
    connection.data.lastActivity = Date.now();

    // Update subscription details
    const subscription: WebSocketSubscription = {
      topic,
      patternId,
      priority,
      subscribedAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
    };

    this.subscriptions.set(`${connectionId}:${topic}`, subscription);

    // Track Kalman pattern subscriptions
    if (patternId) {
      connection.data.kalmanPatterns?.add(patternId);
      this.metrics.kalmanPatternSubscriptions++;
    }

    // Track priority
    connection.data.subscriptionPriorities?.set(topic, priority);

    // Actually subscribe to WebSocket
    ws.subscribe(topic);

    console.log(
      `[WS_TRACKER] Subscribed: ${topic} (priority: ${priority}, pattern: ${patternId})`
    );
    this.updateMetrics();
  }

  // Unsubscribe from a topic
  static unsubscribe(ws: any, topic: string): void {
    if (!process.env.FEATURE_WS_SUBSCRIPTIONS === "1") {
      ws.unsubscribe(topic);
      return;
    }

    const connectionId = ws.data?.connectionId;
    if (!connectionId) return;

    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.subscriptions.delete(topic);
    connection.data.lastActivity = Date.now();

    const subscriptionKey = `${connectionId}:${topic}`;
    const subscription = this.subscriptions.get(subscriptionKey);

    if (subscription) {
      // Update Kalman pattern count
      if (subscription.patternId) {
        connection.data.kalmanPatterns?.delete(subscription.patternId);
        this.metrics.kalmanPatternSubscriptions--;
      }

      this.subscriptions.delete(subscriptionKey);
    }

    connection.data.subscriptionPriorities?.delete(topic);
    ws.unsubscribe(topic);

    console.log(`[WS_TRACKER] Unsubscribed: ${topic}`);
    this.updateMetrics();
  }

  // Get subscriptions for a WebSocket
  static getSubscriptions(ws: any): string[] {
    if (!process.env.FEATURE_WS_SUBSCRIPTIONS === "1") {
      return ["unknown"]; // Can't track without feature
    }

    const connectionId = ws.data?.connectionId;
    if (!connectionId) return [];

    const connection = this.connections.get(connectionId);
    if (!connection) return [];

    return Array.from(connection.subscriptions);
  }

  // Get deduplicated subscriptions across all connections
  static getDeduplicatedSubscriptions(): string[] {
    if (!process.env.FEATURE_WS_SUBSCRIPTIONS === "1") return [];

    const allTopics = new Set<string>();
    for (const connection of this.connections.values()) {
      for (const topic of connection.subscriptions) {
        allTopics.add(topic);
      }
    }

    return Array.from(allTopics);
  }

  // Get subscriptions by priority
  static getSubscriptionsByPriority(minPriority: number = 0): string[] {
    if (!process.env.FEATURE_WS_SUBSCRIPTIONS === "1") return [];

    const prioritizedTopics: string[] = [];

    for (const connection of this.connections.values()) {
      for (const topic of connection.subscriptions) {
        const priority =
          connection.data.subscriptionPriorities?.get(topic) || 0;
        if (priority >= minPriority) {
          prioritizedTopics.push(topic);
        }
      }
    }

    return [...new Set(prioritizedTopics)];
  }

  // Track message activity
  static trackMessage(ws: any, topic: string): void {
    if (!process.env.FEATURE_WS_SUBSCRIPTIONS === "1") return;

    const connectionId = ws.data?.connectionId;
    if (!connectionId) return;

    const subscriptionKey = `${connectionId}:${topic}`;
    const subscription = this.subscriptions.get(subscriptionKey);

    if (subscription) {
      subscription.lastActivity = Date.now();
      subscription.messageCount++;
    }

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.data.lastActivity = Date.now();
    }
  }

  // Cleanup inactive connections
  static cleanupInactiveConnections(timeoutMs: number = 300000): void {
    // 5 minutes
    if (!process.env.FEATURE_WS_SUBSCRIPTIONS === "1") return;

    const now = Date.now();
    const inactiveConnections: string[] = [];

    for (const [connectionId, connection] of this.connections.entries()) {
      const lastActivity = connection.data.lastActivity || 0;
      if (now - lastActivity > timeoutMs) {
        inactiveConnections.push(connectionId);
      }
    }

    for (const connectionId of inactiveConnections) {
      this.removeConnection(connectionId);
    }

    if (inactiveConnections.length > 0) {
      console.log(
        `[WS_TRACKER] Cleaned up ${inactiveConnections.length} inactive connections`
      );
    }
  }

  // Remove connection and all its subscriptions
  static removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove all subscriptions for this connection
    for (const topic of connection.subscriptions) {
      const subscriptionKey = `${connectionId}:${topic}`;
      const subscription = this.subscriptions.get(subscriptionKey);

      if (subscription) {
        if (subscription.patternId) {
          this.metrics.kalmanPatternSubscriptions--;
        }
        this.subscriptions.delete(subscriptionKey);
      }
    }

    this.connections.delete(connectionId);
    this.metrics.totalConnections--;

    console.log(`[WS_TRACKER] Removed connection: ${connectionId}`);
    this.updateMetrics();
  }

  // Get subscription metrics
  static getMetrics(): SubscriptionMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  // Update internal metrics
  private static updateMetrics(): void {
    this.metrics.totalConnections = this.connections.size;

    let totalSubscriptions = 0;
    for (const connection of this.connections.values()) {
      totalSubscriptions += connection.subscriptions.size;
    }
    this.metrics.totalSubscriptions = totalSubscriptions;

    // Calculate deduplicated subscriptions
    const allTopics = new Set<string>();
    for (const connection of this.connections.values()) {
      for (const topic of connection.subscriptions) {
        allTopics.add(topic);
      }
    }
    this.metrics.deduplicatedSubscriptions = allTopics.size;

    // Calculate average messages per second (simplified)
    let totalMessages = 0;
    let activeSubscriptions = 0;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    for (const subscription of this.subscriptions.values()) {
      if (subscription.lastActivity > oneMinuteAgo) {
        totalMessages += subscription.messageCount;
        activeSubscriptions++;
      }
    }

    this.metrics.averageMessagesPerSecond =
      activeSubscriptions > 0 ? totalMessages / 60 : 0;
  }

  // Generate connection ID
  private static generateConnectionId(): string {
    return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get connection info
  static getConnectionInfo(connectionId: string): WebSocketConnection | null {
    return this.connections.get(connectionId) || null;
  }

  // Get all active connections
  static getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  // Force cleanup of all connections
  static cleanupAll(): void {
    this.connections.clear();
    this.subscriptions.clear();
    this.metrics = {
      totalConnections: 0,
      totalSubscriptions: 0,
      deduplicatedSubscriptions: 0,
      averageMessagesPerSecond: 0,
      kalmanPatternSubscriptions: 0,
    };
    console.log("[WS_TRACKER] Cleaned up all connections and subscriptions");
  }
}

// Zero-cost export
export const {
  upgradeConnection,
  subscribe,
  unsubscribe,
  getSubscriptions,
  getDeduplicatedSubscriptions,
  getSubscriptionsByPriority,
  trackMessage,
  cleanupInactiveConnections,
  removeConnection,
  getMetrics,
  getConnectionInfo,
  getAllConnections,
  cleanupAll,
} = process.env.FEATURE_WS_SUBSCRIPTIONS === "1"
  ? WebSocketSubscriptionTracker
  : {
      upgradeConnection: (req: Request, server: any) => server.upgrade(req),
      subscribe: (ws: any, topic: string) => ws.subscribe(topic),
      unsubscribe: (ws: any, topic: string) => ws.unsubscribe(topic),
      getSubscriptions: () => ["unknown"],
      getDeduplicatedSubscriptions: () => [],
      getSubscriptionsByPriority: () => [],
      trackMessage: () => {},
      cleanupInactiveConnections: () => {},
      removeConnection: () => {},
      getMetrics: () => ({
        totalConnections: 0,
        totalSubscriptions: 0,
        deduplicatedSubscriptions: 0,
        averageMessagesPerSecond: 0,
        kalmanPatternSubscriptions: 0,
      }),
      getConnectionInfo: () => null,
      getAllConnections: () => [],
      cleanupAll: () => {},
    };

export default WebSocketSubscriptionTracker;
