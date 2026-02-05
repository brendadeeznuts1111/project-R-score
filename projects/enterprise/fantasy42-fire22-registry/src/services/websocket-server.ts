#!/usr/bin/env bun

/**
 * 🌐 Advanced WebSocket Server with Bun 1.1.x+ Compression
 *
 * Real-time communication server for Fire22 dashboards
 * Features:
 * - Real-time data streaming with WebSocket compression (permessage-deflate)
 * - Authentication & authorization
 * - Connection management
 * - Message broadcasting
 * - Health monitoring
 * - Auto-reconnection support
 * - 🚀 BUN 1.1.X OPTIMIZATION: Native WebSocket with compression
 */

// 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's native WebSocket with advanced compression support
import { serve } from 'bun';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'events';

// 🚀 BUN 1.1.X OPTIMIZATION: Advanced WebSocket compression utilities
import { deflate, inflate } from 'zlib';
import { promisify } from 'util';

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

// 🚀 BUN 1.1.X OPTIMIZATION: Client metadata interface for advanced features
interface ClientMetadata {
  id: string;
  userId?: string;
  subscriptions: Set<string>;
  lastActivity: number;
  authenticated: boolean;
  // 🚀 BUN 1.1.X OPTIMIZATION: Advanced compression features
  compressionEnabled: boolean;
  messageBuffer: RealtimeMessage[];
  compressionLevel: number;
  lastCompressionStats: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
}

interface RealtimeMessage {
  type: string;
  payload: any;
  timestamp: string;
  clientId?: string;
  userId?: string;
}

interface SubscriptionData {
  clientId: string;
  channels: string[];
  filters?: Record<string, any>;
}

// 🚀 BUN 1.1.X OPTIMIZATION: Advanced compression configuration
interface CompressionConfig {
  enabled: boolean;
  minMessageSize: number; // Only compress messages above this size (bytes)
  maxBatchSize: number; // Maximum messages in a batch
  batchTimeout: number; // Time to wait before sending incomplete batch (ms)
  compressionLevel: number; // zlib compression level (1-9)
  adaptiveCompression: boolean; // Adjust compression based on message patterns
}

interface BatchedMessage {
  messages: RealtimeMessage[];
  timestamp: string;
  batchId: string;
}

class AdvancedWebSocketServer extends EventEmitter {
  private server: any;
  private clients: Map<string, WebSocket> = new Map();
  private clientMetadata: Map<string, ClientMetadata> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private heartbeatInterval: any;
  private cleanupInterval: any;
  private jwtSecret: string;
  private port: number;

  // 🚀 BUN 1.1.X OPTIMIZATION: Advanced compression features
  private compressionConfig: CompressionConfig;
  private compressionStats: Map<string, any> = new Map();

  constructor(port: number = 8080, jwtSecret: string = 'default-secret') {
    super();
    this.port = port;
    this.jwtSecret = jwtSecret;

    // 🚀 BUN 1.1.X OPTIMIZATION: Initialize advanced compression configuration
    this.compressionConfig = {
      enabled: true,
      minMessageSize: 1024, // 1KB
      maxBatchSize: 10,
      batchTimeout: 100, // 100ms
      compressionLevel: 6, // Good balance of speed/compression
      adaptiveCompression: true,
    };

    this.initializeServer();
    this.setupIntervals();
  }

  private initializeServer(): void {
    // 🚀 BUN 1.1.X OPTIMIZATION: Native WebSocket server with compression enabled
    this.server = serve({
      port: this.port,
      websocket: {
        // Enable WebSocket compression (permessage-deflate)
        perMessageDeflate: true,
        maxPayloadLength: 1024 * 1024, // 1MB max payload
        idleTimeout: 300, // 5 minutes
        backpressureLimit: 1024 * 1024, // 1MB backpressure limit
        closeOnBackpressureLimit: false,
        message: this.handleMessage.bind(this),
        open: this.handleConnection.bind(this),
        close: this.handleDisconnection.bind(this),
        drain: this.handleDrain.bind(this),
      },
      fetch: (req) => {
        // Handle WebSocket upgrade requests
        if (req.headers.get('upgrade') === 'websocket') {
          return undefined; // Let Bun handle WebSocket upgrade
        }
        return new Response('WebSocket server - use WebSocket protocol', { status: 400 });
      },
    });

    console.log(`🚀 Advanced WebSocket Server with Enhanced Compression started on port ${this.port}`);
    console.log(`🔧 WebSocket Compression: permessage-deflate + Advanced Batching ENABLED`);
    console.log(`📊 Max Payload: 1MB, Idle Timeout: 5 minutes`);
    console.log(`🗜️  Advanced Compression: Min ${this.compressionConfig.minMessageSize}B, Batch ${this.compressionConfig.maxBatchSize} msgs`);
    console.log(`⚡ Compression Level: ${this.compressionConfig.compressionLevel}, Adaptive: ${this.compressionConfig.adaptiveCompression}`);
  }

  private handleConnection(ws: WebSocket): void {
    const clientId = this.generateClientId();

    // 🚀 BUN 1.1.X OPTIMIZATION: Store client metadata separately
    const metadata: ClientMetadata = {
      id: clientId,
      subscriptions: new Set(),
      lastActivity: Date.now(),
      authenticated: false,
      compressionEnabled: this.compressionConfig.enabled,
      messageBuffer: [],
      compressionLevel: this.compressionConfig.compressionLevel,
      lastCompressionStats: {
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 1.0,
      },
    };

    this.clients.set(clientId, ws);
    this.clientMetadata.set(clientId, metadata);

    console.log(`🔗 New client connected: ${clientId} (with advanced compression & batching)`);

    // 🚀 BUN 1.1.X OPTIMIZATION: Send enhanced welcome message with compression details
    this.sendToClient(clientId, {
      type: 'connection-established',
      payload: {
        clientId,
        serverTime: new Date().toISOString(),
        features: ['authentication', 'subscriptions', 'real-time-updates', 'advanced-compression', 'message-batching'],
        compressionEnabled: this.compressionConfig.enabled,
        compressionConfig: {
          minMessageSize: this.compressionConfig.minMessageSize,
          maxBatchSize: this.compressionConfig.maxBatchSize,
          compressionLevel: this.compressionConfig.compressionLevel,
          adaptiveCompression: this.compressionConfig.adaptiveCompression,
        },
      },
      timestamp: new Date().toISOString(),
    });

    client.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnection(clientId, code, reason);
    });

    client.on('error', error => {
      console.error(`❌ Client ${clientId} error:`, error);
      this.handleClientError(clientId, error);
    });

    client.on('pong', () => {
      client.lastActivity = Date.now();
    });

    this.emit('client-connected', clientId);
  }

  private async handleMessage(ws: WebSocket, message: string | Buffer): Promise<void> {
    const clientId = (ws as any).id;
    try {
      let parsedMessage: RealtimeMessage;

      // 🚀 BUN 1.1.X OPTIMIZATION: Handle compressed messages
      if (Buffer.isBuffer(message)) {
        const messageStr = message.toString('utf8');

        // Check if this is a compressed message
        if (messageStr.startsWith('COMPRESSED:')) {
          parsedMessage = await this.decompressMessage(message);
        } else {
          parsedMessage = JSON.parse(messageStr);
        }
      } else {
        parsedMessage = JSON.parse(message.toString());
      }

      const client = this.clients.get(clientId);

      if (!client) return;

      client.lastActivity = Date.now();

      console.log(`📨 Message from ${clientId}: ${parsedMessage.type}`);

      switch (parsedMessage.type) {
        case 'authenticate':
          this.handleAuthentication(clientId, parsedMessage);
          break;
        case 'subscribe':
          this.handleSubscription(clientId, parsedMessage);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(clientId, parsedMessage);
          break;
        case 'ping':
          this.handlePing(clientId);
          break;
        case 'batch':
          await this.handleBatchedMessage(clientId, parsedMessage);
          break;
        default:
          this.handleCustomMessage(clientId, parsedMessage);
      }

      this.emit('message-received', { clientId, message: parsedMessage });
    } catch (error) {
      console.error(`❌ Failed to parse message from ${clientId}:`, error);
      await this.sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Invalid message format' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Decompress incoming compressed message
   */
  private async decompressMessage(compressedData: Buffer): Promise<RealtimeMessage> {
    try {
      // Extract compression header (COMPRESSED:batchId:)
      const headerEndIndex = compressedData.indexOf(':', 11); // After "COMPRESSED:"
      if (headerEndIndex === -1) {
        throw new Error('Invalid compression header');
      }

      // Extract compressed data
      const compressedPayload = compressedData.slice(headerEndIndex + 1);

      // Decompress the data
      const decompressedData = await inflateAsync(compressedPayload);
      const decompressedStr = decompressedData.toString('utf8');

      const batchedMessage: BatchedMessage = JSON.parse(decompressedStr);

      // Return the first message from the batch (for backward compatibility)
      // In a full implementation, you'd handle the entire batch
      if (batchedMessage.messages && batchedMessage.messages.length > 0) {
        return batchedMessage.messages[0];
      } else {
        throw new Error('Empty batch message');
      }

    } catch (error) {
      console.error('❌ Failed to decompress message:', error);
      throw error;
    }
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Handle batched messages from client
   */
  private async handleBatchedMessage(clientId: string, batchedMessage: any): Promise<void> {
    const messages = batchedMessage.payload.messages || [];

    for (const message of messages) {
      await this.handleCustomMessage(clientId, message);
    }

    console.log(`📦 Processed batched message from ${clientId}: ${messages.length} messages`);
  }

  private handleAuthentication(clientId: string, message: RealtimeMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const { token } = message.payload;
      const decoded = jwt.verify(token, this.jwtSecret) as any;

      client.userId = decoded.userId || decoded.sub;
      client.authenticated = true;

      this.sendToClient(clientId, {
        type: 'authentication-success',
        payload: {
          userId: client.userId,
          authenticated: true,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ Client ${clientId} authenticated as user ${client.userId}`);
      this.emit('client-authenticated', { clientId, userId: client.userId });
    } catch (error) {
      client.authenticated = false;
      this.sendToClient(clientId, {
        type: 'authentication-failed',
        payload: { message: 'Invalid authentication token' },
        timestamp: new Date().toISOString(),
      });

      console.log(`❌ Client ${clientId} authentication failed`);
      this.emit('authentication-failed', { clientId, error });
    }
  }

  private handleSubscription(clientId: string, message: RealtimeMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channels, filters } = message.payload as SubscriptionData;

    channels.forEach(channel => {
      client.subscriptions.add(channel);

      if (!this.subscriptions.has(channel)) {
        this.subscriptions.set(channel, new Set());
      }
      this.subscriptions.get(channel)!.add(clientId);
    });

    this.sendToClient(clientId, {
      type: 'subscription-success',
      payload: {
        channels: Array.from(client.subscriptions),
        filters,
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`📡 Client ${clientId} subscribed to: ${channels.join(', ')}`);
    this.emit('client-subscribed', { clientId, channels, filters });
  }

  private handleUnsubscription(clientId: string, message: RealtimeMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channels } = message.payload;

    channels.forEach((channel: string) => {
      client.subscriptions.delete(channel);

      const channelSubs = this.subscriptions.get(channel);
      if (channelSubs) {
        channelSubs.delete(clientId);
        if (channelSubs.size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    });

    this.sendToClient(clientId, {
      type: 'unsubscription-success',
      payload: {
        channels: Array.from(client.subscriptions),
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`📴 Client ${clientId} unsubscribed from: ${channels.join(', ')}`);
    this.emit('client-unsubscribed', { clientId, channels });
  }

  private handlePing(clientId: string): void {
    this.sendToClient(clientId, {
      type: 'pong',
      payload: { serverTime: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
  }

  private async handleCustomMessage(clientId: string, message: RealtimeMessage): Promise<void> {
    // Handle custom message types
    this.emit('custom-message', { clientId, message });
  }

  private handleDrain(ws: WebSocket): void {
    // Handle backpressure relief
    const clientId = (ws as any).id;
    console.log(`💧 WebSocket backpressure relieved for client: ${clientId}`);
  }

  private handleDisconnection(ws: WebSocket, code: number, reason: string): void {
    const clientId = (ws as any).id;
    const client = this.clients.get(clientId);
    if (!client) return;

    // Clean up subscriptions
    client.subscriptions.forEach(channel => {
      const channelSubs = this.subscriptions.get(channel);
      if (channelSubs) {
        channelSubs.delete(clientId);
        if (channelSubs.size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    });

    this.clients.delete(clientId);

    console.log(`🔌 Client ${clientId} disconnected (code: ${code})`);
    this.emit('client-disconnected', { clientId, code, reason: reason.toString() });
  }

  private handleClientError(clientId: string, error: Error): void {
    console.error(`❌ Client ${clientId} error:`, error);
    this.emit('client-error', { clientId, error });
  }

  private setupIntervals(): void {
    // Heartbeat interval (every 30 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    // Cleanup interval (every 60 seconds)
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveClients();
    }, 60000);
  }

  private sendHeartbeat(): void {
    const heartbeatMessage = {
      type: 'heartbeat',
      payload: {
        serverTime: new Date().toISOString(),
        activeClients: this.clients.size,
        activeSubscriptions: this.subscriptions.size,
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcast(heartbeatMessage);
  }

  private cleanupInactiveClients(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [clientId, client] of this.clients) {
      if (now - client.lastActivity > timeout) {
        console.log(`🧹 Cleaning up inactive client: ${clientId}`);
        client.close(1000, 'Inactive timeout');
        this.clients.delete(clientId);
      }
    }
  }

  // Public API methods

  /**
   * Send message to specific client with advanced compression
   */
  async sendToClient(clientId: string, message: RealtimeMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || client.readyState !== WebSocket.OPEN) return;

    // 🚀 BUN 1.1.X OPTIMIZATION: Advanced compression logic
    if (this.compressionConfig.enabled && client.compressionEnabled) {
      await this.sendCompressedMessage(clientId, message);
    } else {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Send compressed message with smart batching
   */
  private async sendCompressedMessage(clientId: string, message: RealtimeMessage): Promise<void> {
    const client = this.clients.get(clientId);
    const metadata = this.clientMetadata.get(clientId);
    if (!client || !metadata) return;

    const messageSize = JSON.stringify(message).length;

    // Only compress messages above minimum size threshold
    if (messageSize < this.compressionConfig.minMessageSize) {
      client.send(JSON.stringify(message));
      return;
    }

    // Add to message buffer for batching
    metadata.messageBuffer.push(message);

    // Check if we should send the batch
    if (metadata.messageBuffer.length >= this.compressionConfig.maxBatchSize) {
      await this.sendMessageBatch(clientId);
    } else {
      // Set up batch timer if not already set
      const existingTimer = this.batchTimers.get(clientId);
      if (!existingTimer) {
        const timer = setTimeout(async () => {
          await this.sendMessageBatch(clientId);
        }, this.compressionConfig.batchTimeout);
        this.batchTimers.set(clientId, timer);
      }
    }
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Send compressed message batch
   */
  private async sendMessageBatch(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    const metadata = this.clientMetadata.get(clientId);
    if (!client || !metadata) return;

    if (!metadata.messageBuffer || metadata.messageBuffer.length === 0) return;

    // Clear the batch timer
    const timer = this.batchTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(clientId);
    }

    try {
      // Create batched message
      const batchedMessage: BatchedMessage = {
        messages: metadata.messageBuffer,
        timestamp: new Date().toISOString(),
        batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      const originalData = JSON.stringify(batchedMessage);
      const originalSize = Buffer.byteLength(originalData, 'utf8');

      // Compress the data
      const compressedData = await deflateAsync(originalData, {
        level: metadata.compressionLevel,
      });
      const compressedSize = compressedData.length;

      // Calculate compression stats
      const compressionRatio = originalSize / compressedSize;
      metadata.lastCompressionStats = {
        originalSize,
        compressedSize,
        compressionRatio,
      };

      // Update global compression stats
      this.updateCompressionStats(clientId, originalSize, compressedSize);

      // Send compressed batch with compression header
      const compressionHeader = Buffer.from(`COMPRESSED:${batchedMessage.batchId}:`, 'utf8');
      const finalData = Buffer.concat([compressionHeader, compressedData]);

      client.send(finalData);

      console.log(`📦 Sent compressed batch to ${clientId}: ${metadata.messageBuffer.length} messages (${originalSize} → ${compressedSize} bytes, ${compressionRatio.toFixed(2)}x compression)`);

      // Clear the buffer
      metadata.messageBuffer.length = 0;

    } catch (error) {
      console.error(`❌ Compression error for client ${clientId}:`, error);
      // Fallback to sending uncompressed messages
      for (const message of metadata.messageBuffer) {
        client.send(JSON.stringify(message));
      }
      metadata.messageBuffer.length = 0;
    }
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Update compression statistics
   */
  private updateCompressionStats(clientId: string, originalSize: number, compressedSize: number): void {
    const stats = this.compressionStats.get(clientId) || {
      totalMessages: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      avgCompressionRatio: 1.0,
      compressionSavings: 0,
    };

    stats.totalMessages++;
    stats.totalOriginalSize += originalSize;
    stats.totalCompressedSize += compressedSize;
    stats.avgCompressionRatio = stats.totalOriginalSize / stats.totalCompressedSize;
    stats.compressionSavings = stats.totalOriginalSize - stats.totalCompressedSize;

    this.compressionStats.set(clientId, stats);
  }

  /**
   * Send message to all authenticated clients with compression
   */
  async broadcast(message: RealtimeMessage, authenticatedOnly: boolean = true): Promise<void> {
    const promises = [];
    for (const [clientId, client] of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        if (!authenticatedOnly || client.authenticated) {
          promises.push(this.sendToClient(clientId, message));
        }
      }
    }
    await Promise.all(promises);
  }

  /**
   * Send message to all subscribers of a channel with compression
   */
  async broadcastToChannel(channel: string, message: RealtimeMessage): Promise<void> {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) return;

    const promises = [];
    for (const clientId of subscribers) {
      promises.push(this.sendToClient(clientId, message));
    }
    await Promise.all(promises);
  }

  /**
   * Send message to specific user (across all their connections) with compression
   */
  async sendToUser(userId: string, message: RealtimeMessage): Promise<void> {
    const promises = [];
    for (const [clientId, client] of this.clients) {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        promises.push(this.sendToClient(clientId, message));
      }
    }
    await Promise.all(promises);
  }

  /**
   * Get server statistics with compression metrics
   */
  getStats(): any {
    const channelStats = Array.from(this.subscriptions.entries()).map(([channel, subscribers]) => ({
      channel,
      subscriberCount: subscribers.size,
    }));

    // 🚀 BUN 1.1.X OPTIMIZATION: Include compression statistics
    const compressionStats = Array.from(this.compressionStats.entries()).map(([clientId, stats]) => ({
      clientId,
      ...stats,
    }));

    // 🚀 BUN 1.1.X OPTIMIZATION: Use Math.sumPrecise for accurate compression statistics
    const savingsValues = compressionStats.map(stat => stat.compressionSavings);
    const totalCompressionSavings = Math.sumPrecise(...savingsValues);

    const ratioValues = compressionStats.map(stat => stat.avgCompressionRatio);
    const avgCompressionRatio = ratioValues.length > 0
      ? Math.sumPrecise(...ratioValues) / ratioValues.length
      : 1.0;

    return {
      totalClients: this.clients.size,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.authenticated).length,
      totalSubscriptions: this.subscriptions.size,
      channels: channelStats,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      // 🚀 BUN 1.1.X OPTIMIZATION: Advanced compression statistics
      compressionEnabled: this.compressionConfig.enabled,
      compressionConfig: this.compressionConfig,
      compressionStats: {
        totalClientsWithCompression: compressionStats.length,
        totalCompressionSavings,
        avgCompressionRatio: avgCompressionRatio.toFixed(2),
        clientCompressionStats: compressionStats,
      },
    };
  }

  /**
   * Close server gracefully
   */
  close(): Promise<void> {
    return new Promise(resolve => {
      console.log('🛑 Shutting down WebSocket server...');

      clearInterval(this.heartbeatInterval);
      clearInterval(this.cleanupInterval);

      // Close all client connections
      for (const [clientId, client] of this.clients) {
        client.close(1001, 'Server shutdown');
      }

      // Note: Bun's serve() doesn't have a close method, server will close when process exits
      console.log('✅ WebSocket server shutdown initiated');
      resolve();
    });
  }

  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// REALTIME DATA STREAMERS
// ============================================================================

class RealtimeDataStreamer {
  private server: AdvancedWebSocketServer;
  private streams: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: AdvancedWebSocketServer) {
    this.server = server;
    this.initializeStreams();
  }

  private initializeStreams(): void {
    // Dashboard metrics stream
    this.createStream('dashboard-metrics', 5000, () => this.generateMetricsUpdate());

    // Agent activity stream
    this.createStream('agent-activity', 3000, () => this.generateAgentActivity());

    // Betting activity stream
    this.createStream('betting-activity', 2000, () => this.generateBettingActivity());

    // Fantasy402 updates stream
    this.createStream('fantasy402-updates', 10000, () => this.generateFantasyUpdates());

    // System health stream
    this.createStream('system-health', 15000, () => this.generateHealthUpdate());

    console.log('🌊 Initialized real-time data streams');
  }

  private createStream(name: string, interval: number, generator: () => any): void {
    const stream = setInterval(() => {
      const data = generator();
      this.server.broadcastToChannel(name, {
        type: 'stream-update',
        payload: {
          stream: name,
          data,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    }, interval);

    this.streams.set(name, stream);
  }

  private generateMetricsUpdate(): any {
    const now = Date.now();
    const baseVariation = Math.sin(now / 3600000) * 0.02;

    return {
      totalRevenue: 125000 + baseVariation * 10000 + (Math.random() - 0.5) * 5000,
      activeUsers: Math.floor(2500 + baseVariation * 200 + (Math.random() - 0.5) * 100),
      roi: 85 + baseVariation * 10 + (Math.random() - 0.5) * 5,
      performanceScore: 92 + baseVariation * 5 + (Math.random() - 0.5) * 3,
      timestamp: new Date().toISOString(),
    };
  }

  private generateAgentActivity(): any {
    const activities = [
      'Agent BLAKEPPH updated rates',
      'New agent TEST001 registered',
      'Commission payout processed',
      'Agent DEMO002 went offline',
      'VIP client status updated',
    ];

    return {
      activity: activities[Math.floor(Math.random() * activities.length)],
      agentId: `AGENT${Math.floor(Math.random() * 100)}`,
      timestamp: new Date().toISOString(),
      type: 'agent-activity',
    };
  }

  private generateBettingActivity(): any {
    const sports = ['Football', 'Basketball', 'Baseball', 'Soccer', 'Tennis'];
    const outcomes = ['won', 'lost', 'pending'];

    return {
      betId: `BET${Date.now()}`,
      sport: sports[Math.floor(Math.random() * sports.length)],
      stake: Math.floor(Math.random() * 1000) + 50,
      outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
      timestamp: new Date().toISOString(),
      type: 'betting-activity',
    };
  }

  private generateFantasyUpdates(): any {
    return {
      vipUpdates: Math.floor(Math.random() * 5) + 1,
      newUsers: Math.floor(Math.random() * 10) + 1,
      totalBets: Math.floor(Math.random() * 50) + 25,
      revenue: Math.floor(Math.random() * 10000) + 5000,
      timestamp: new Date().toISOString(),
      type: 'fantasy402-update',
    };
  }

  private generateHealthUpdate(): any {
    return {
      status: 'healthy',
      services: {
        api: Math.random() > 0.05 ? 'healthy' : 'degraded',
        database: Math.random() > 0.03 ? 'healthy' : 'warning',
        websocket: 'healthy',
        fantasy402: Math.random() > 0.1 ? 'healthy' : 'warning',
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      type: 'health-update',
    };
  }

  stopAllStreams(): void {
    for (const [name, stream] of this.streams) {
      clearInterval(stream);
      console.log(`🛑 Stopped stream: ${name}`);
    }
    this.streams.clear();
  }
}

// ============================================================================
// WEB SOCKET CLIENT
// ============================================================================

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private url: string;
  private subscriptions: Set<string> = new Set();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('🔗 WebSocket client connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = event => {
          this.handleMessage(event);
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket client disconnected');
          this.handleReconnect();
        };

        this.ws.onerror = error => {
          console.error('❌ WebSocket client error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: RealtimeMessage = JSON.parse(event.data);
      this.emit(message.type, message);
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );

      setTimeout(() => {
        this.connect().catch(() => {
          // Reconnection failed, will try again
        });
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  send(message: RealtimeMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected, message not sent');
    }
  }

  subscribe(channels: string[]): void {
    channels.forEach(channel => this.subscriptions.add(channel));

    this.send({
      type: 'subscribe',
      payload: { channels: Array.from(this.subscriptions) },
      timestamp: new Date().toISOString(),
    });
  }

  unsubscribe(channels: string[]): void {
    channels.forEach(channel => this.subscriptions.delete(channel));

    this.send({
      type: 'unsubscribe',
      payload: { channels },
      timestamp: new Date().toISOString(),
    });
  }

  authenticate(token: string): void {
    this.send({
      type: 'authenticate',
      payload: { token },
      timestamp: new Date().toISOString(),
    });
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  AdvancedWebSocketServer,
  RealtimeDataStreamer,
  WebSocketClient,
  type RealtimeMessage,
  type SubscriptionData,
  type WebSocketClient as WSClient,
};

// ============================================================================
// CLI STARTUP (if run directly)
// ============================================================================

if (require.main === module) {
  const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8080;
  const JWT_SECRET = process.env.JWT_SECRET || 'fire22-websocket-secret';

  const server = new AdvancedWebSocketServer(PORT, JWT_SECRET);
  const streamer = new RealtimeDataStreamer(server);

  console.log(`🚀 WebSocket Server running on port ${PORT}`);
  console.log(`🔑 JWT Secret: ${JWT_SECRET}`);
  console.log(`📊 Real-time streams active`);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down WebSocket server...');
    streamer.stopAllStreams();
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down WebSocket server...');
    streamer.stopAllStreams();
    await server.close();
    process.exit(0);
  });
}
