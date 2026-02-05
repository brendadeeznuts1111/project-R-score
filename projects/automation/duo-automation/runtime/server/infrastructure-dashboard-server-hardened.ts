#!/usr/bin/env bun
// server/infrastructure-dashboard-server-hardened.ts
// Empire Pro v3.7 - Hardened WebSocket server with security and rate limiting

import { BunServer } from 'bun';
import { MasterPerfTracker } from '../src/storage/r2-apple-manager.ts';

interface WebSocketClient {
  socket: WebSocket;
  scope: string;
  connectedAt: number;
  lastActivity: number;
  rbacToken: string;
}

interface RateLimitConfig {
  maxConnectionsPerScope: number;
  connectionTimeoutMs: number;
  heartbeatIntervalMs: number;
  maxMessageSize: number;
}

export class HardenedInfrastructureDashboard {
  private server: BunServer;
  private activeConnections: Map<string, WebSocketClient[]> = new Map();
  private perfTracker: MasterPerfTracker;
  private rateLimitConfig: RateLimitConfig;
  private rbacValidator: RBACValidator;
  
  constructor(options: {
    port?: number;
    rateLimit?: Partial<RateLimitConfig>;
  } = {}) {
    this.rateLimitConfig = {
      maxConnectionsPerScope: 10,
      connectionTimeoutMs: 300000, // 5 minutes
      heartbeatIntervalMs: 30000, // 30 seconds
      maxMessageSize: 1024 * 1024, // 1MB
      ...options.rateLimit
    };
    
    this.perfTracker = new MasterPerfTracker();
    this.rbacValidator = new RBACValidator();
    this.server = this.createHardenedServer(options.port || 3004);
  }
  
  private createHardenedServer(port: number): BunServer {
    const server = Bun.serve({
      port,
      fetch: (req, server) => {
        // Upgrade WebSocket connections with security checks
        if (server.upgrade(req)) {
          return; // WebSocket handled
        }
        
        // Handle HTTP requests
        return new Response('Infrastructure Dashboard API', {
          status: 200,
          headers: {
            'Content-Type': 'text/plain',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block'
          }
        });
      },
      websocket: {
        message: this.handleWebSocketMessage.bind(this),
        open: this.handleWebSocketOpen.bind(this),
        close: this.handleWebSocketClose.bind(this),
        error: this.handleWebSocketError.bind(this),
        maxPayloadSize: this.rateLimitConfig.maxMessageSize
      }
    });
    
    // Start heartbeat and cleanup intervals
    this.startMaintenanceTasks();
    
    console.log(`🔒 Hardened Infrastructure Dashboard started on port ${port}`);
    console.log(`🛡️  Rate limits: ${this.rateLimitConfig.maxConnectionsPerScope} connections per scope`);
    
    // 📢 Initialize IPC Reporting
    this.setupIPCReporting();

    return server;
  }

  /**
   * 📢 Set up IPC reporting to parent launcher
   */
  private setupIPCReporting() {
    if (process.send) {
      console.log('📢 IPC detected. Enabling status and metric reporting to parent.');
      
      // 1. Initial Status
      process.send({
        type: 'status',
        status: 'online',
        pid: process.pid,
        timestamp: new Date().toISOString()
      });

      // 2. Metrics Interval
      setInterval(() => {
        const mem = process.memoryUsage();
        process.send?.({
          type: 'metrics',
          data: {
            pid: process.pid,
            uptime: Math.floor(process.uptime()),
            uptimeHuman: this.formatUptime(process.uptime()),
            memory: {
              rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
              heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`
            },
            activeConnections: this.getServerStats().totalConnections
          }
        });
      }, 5000);

      // 3. Command Listener
      process.on('message', (message: any) => {
        this.handleIPCCommand(message);
      });
    }
  }

  /**
   * 📢 Handle IPC commands from parent
   */
  private handleIPCCommand(message: any) {
    if (message.type === 'command') {
      console.log(`📢 Received IPC Command: ${message.command}`, message.payload);
      
      switch (message.command) {
        case 'self-heal':
          console.warn('⚠️ Self-heal triggered via IPC!');
          // In a real scenario, this would trigger diagnostic and recovery routines
          break;
        case 'refresh-config':
          console.log('🔄 Refreshing configuration via IPC...');
          break;
        default:
          console.log(`❓ Unknown logic for command: ${message.command}`);
      }
    }
  }

  private formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  }
  
  /**
   * 🔒 WebSocket connection security validation
   */
  private validateWebSocketConnection(request: Request): WebSocketClient | null {
    try {
      // 1. Validate RBAC token from URL
      const url = new URL(request.url!, `http://${request.headers.get('host')}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.warn('🚨 Connection rejected: Missing RBAC token');
        return null;
      }
      
      // Validate token and extract permissions
      const tokenValidation = this.rbacValidator.validateToken(token);
      if (!tokenValidation.valid || !tokenValidation.permissions.includes('infra:read')) {
        console.warn(`🚨 Connection rejected: Invalid RBAC token - ${tokenValidation.reason}`);
        return null;
      }
      
      // 2. Extract and validate scope
      const scope = request.headers.get('x-dashboard-scope') || 
                   url.searchParams.get('scope') || 
                   'UNKNOWN';
      
      if (!['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'].includes(scope)) {
        console.warn(`🚨 Connection rejected: Invalid scope - ${scope}`);
        return null;
      }
      
      // 3. Rate limit: max connections per scope
      const scopeConnections = this.activeConnections.get(scope) || [];
      if (scopeConnections.length >= this.rateLimitConfig.maxConnectionsPerScope) {
        console.warn(`🚨 Connection rejected: Too many connections for scope ${scope} (${scopeConnections.length}/${this.rateLimitConfig.maxConnectionsPerScope})`);
        return null;
      }
      
      const client: WebSocketClient = {
        socket: null as any, // Will be set by caller
        scope,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        rbacToken: token
      };
      
      console.log(`✅ WebSocket connection approved: scope=${scope}, token=${token.substring(0, 8)}...`);
      return client;
      
    } catch (error) {
      console.error('🚨 WebSocket validation error:', error);
      return null;
    }
  }
  
  /**
   * 🔒 Handle new WebSocket connection
   */
  private handleWebSocketOpen(ws: WebSocket, request: Request) {
    const client = this.validateWebSocketConnection(request);
    if (!client) {
      ws.close(4001, 'Authorization failed');
      return;
    }
    
    // Set socket reference
    client.socket = ws;
    
    // Add to active connections
    const scopeConnections = this.activeConnections.get(client.scope) || [];
    scopeConnections.push(client);
    this.activeConnections.set(client.scope, scopeConnections);
    
    // Start scoped metrics stream
    this.startScopedMetricsStream(client);
    
    // Log connection
    this.perfTracker.addMetric({
      category: 'WEBSOCKET',
      type: 'connection',
      topic: 'infrastructure',
      subCat: 'dashboard',
      id: `ws_${Date.now()}`,
      value: '1',
      pattern: 'connected',
      locations: 1,
      impact: 'low',
      properties: {
        scope: client.scope,
        tokenHash: this.hashToken(client.rbacToken),
        totalConnections: scopeConnections.length.toString()
      }
    });
  }
  
  /**
   * 🔒 Handle WebSocket messages with validation
   */
  private handleWebSocketMessage(ws: WebSocket, message: string | Buffer) {
    try {
      const client = this.findClientBySocket(ws);
      if (!client) {
        ws.close(4002, 'Client not found');
        return;
      }
      
      // Update activity timestamp
      client.lastActivity = Date.now();
      
      // Parse and validate message
      const messageStr = message.toString();
      if (messageStr.length > this.rateLimitConfig.maxMessageSize) {
        console.warn('🚨 Message too large, closing connection');
        ws.close(4003, 'Message too large');
        return;
      }
      
      let data;
      try {
        data = JSON.parse(messageStr);
      } catch {
        console.warn('🚨 Invalid JSON message received');
        ws.send(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      
      // Handle different message types
      this.handleMessage(client, data);
      
    } catch (error) {
      console.error('🚨 WebSocket message error:', error);
      ws.close(4004, 'Message processing error');
    }
  }
  
  /**
   * 🔒 Start scoped metrics stream for client
   */
  private startScopedMetricsStream(client: WebSocketClient) {
    console.log(`📊 Starting metrics stream for scope: ${client.scope}`);
    
    // Send initial metrics
    this.sendMetricsToClient(client);
    
    // Set up periodic updates
    const interval = setInterval(() => {
      if (client.socket.readyState === WebSocket.OPEN) {
        this.sendMetricsToClient(client);
      } else {
        clearInterval(interval);
      }
    }, 5000); // Update every 5 seconds
    
    // Store interval for cleanup
    (client as any).updateInterval = interval;
  }
  
  /**
   * 🔒 Send metrics to specific client (scope-isolated)
   */
  private sendMetricsToClient(client: WebSocketClient) {
    try {
      // Only send metrics for the client's scope
      const scopedMetrics = this.perfTracker.getMetricsByScope(client.scope);
      
      const message = {
        type: 'metrics_update',
        scope: client.scope,
        timestamp: new Date().toISOString(),
        metrics: scopedMetrics,
        summary: {
          total: scopedMetrics.length,
          scope: client.scope,
          timezone: this.perfTracker.getTimezoneInfo?.() || 'UTC'
        }
      };
      
      client.socket.send(JSON.stringify(message));
      
    } catch (error) {
      console.error(`🚨 Failed to send metrics to client in scope ${client.scope}:`, error);
    }
  }
  
  /**
   * 🔒 Handle WebSocket disconnection
   */
  private handleWebSocketClose(ws: WebSocket, code: number, reason: string) {
    const client = this.findClientBySocket(ws);
    if (!client) return;
    
    // Clean up interval
    if ((client as any).updateInterval) {
      clearInterval((client as any).updateInterval);
    }
    
    // Remove from active connections
    const scopeConnections = this.activeConnections.get(client.scope) || [];
    const index = scopeConnections.indexOf(client);
    if (index > -1) {
      scopeConnections.splice(index, 1);
      this.activeConnections.set(client.scope, scopeConnections);
    }
    
    console.log(`📊 WebSocket disconnected: scope=${client.scope}, code=${code}, reason=${reason}`);
    
    // Log disconnection
    this.perfTracker.addMetric({
      category: 'WEBSOCKET',
      type: 'disconnection',
      topic: 'infrastructure',
      subCat: 'dashboard',
      id: `ws_close_${Date.now()}`,
      value: code.toString(),
      pattern: 'disconnected',
      locations: 1,
      impact: 'low',
      properties: {
        scope: client.scope,
        reason: reason,
        remainingConnections: scopeConnections.length.toString()
      }
    });
  }
  
  /**
   * 🔒 Handle WebSocket errors
   */
  private handleWebSocketError(ws: WebSocket, error: Error) {
    console.error('🚨 WebSocket error:', error);
    const client = this.findClientBySocket(ws);
    if (client) {
      this.perfTracker.addMetric({
        category: 'WEBSOCKET',
        type: 'error',
        topic: 'infrastructure',
        subCat: 'dashboard',
        id: `ws_error_${Date.now()}`,
        value: '1',
        pattern: 'error',
        locations: 1,
        impact: 'medium',
        properties: {
          scope: client.scope,
          error: error.message
        }
      });
    }
  }
  
  /**
   * 🔒 Find client by WebSocket instance
   */
  private findClientBySocket(ws: WebSocket): WebSocketClient | null {
    for (const connections of this.activeConnections.values()) {
      const client = connections.find(c => c.socket === ws);
      if (client) return client;
    }
    return null;
  }
  
  /**
   * 🔒 Handle different message types
   */
  private handleMessage(client: WebSocketClient, data: any) {
    switch (data.type) {
      case 'get_metrics':
        this.sendMetricsToClient(client);
        break;
        
      case 'ping':
        client.socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
        
      case 'subscribe':
        // Handle subscription to specific metric types
        this.handleSubscription(client, data);
        break;
        
      default:
        console.warn(`🚨 Unknown message type: ${data.type}`);
        client.socket.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }
  
  /**
   * 🔒 Handle metric subscriptions
   */
  private handleSubscription(client: WebSocketClient, data: any) {
    // Validate subscription request
    if (!data.categories || !Array.isArray(data.categories)) {
      client.socket.send(JSON.stringify({ error: 'Invalid subscription request' }));
      return;
    }
    
    // Filter metrics by subscribed categories
    const scopedMetrics = this.perfTracker.getMetricsByScope(client.scope);
    const filteredMetrics = scopedMetrics.filter(m => 
      data.categories.includes(m.category)
    );
    
    client.socket.send(JSON.stringify({
      type: 'subscription_update',
      categories: data.categories,
      metrics: filteredMetrics,
      timestamp: new Date().toISOString()
    }));
  }
  
  /**
   * 🔒 Start maintenance tasks (cleanup, heartbeat)
   */
  private startMaintenanceTasks() {
    // Cleanup inactive connections
    setInterval(() => {
      const now = Date.now();
      for (const [scope, connections] of this.activeConnections.entries()) {
        const activeConnections = connections.filter(client => {
          if (now - client.lastActivity > this.rateLimitConfig.connectionTimeoutMs) {
            console.log(`🧹 Cleaning up inactive connection in scope ${scope}`);
            client.socket.close(4000, 'Connection timeout');
            return false;
          }
          return true;
        });
        this.activeConnections.set(scope, activeConnections);
      }
    }, 60000); // Check every minute
    
    // Send heartbeat to all clients
    setInterval(() => {
      for (const connections of this.activeConnections.values()) {
        connections.forEach(client => {
          if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.send(JSON.stringify({ 
              type: 'heartbeat', 
              timestamp: Date.now() 
            }));
          }
        });
      }
    }, this.rateLimitConfig.heartbeatIntervalMs);
  }
  
  /**
   * 🔒 Utility: Hash token for logging
   */
  private hashToken(token: string): string {
    // Simple hash for logging (don't log actual tokens)
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  /**
   * 📊 Get server statistics
   */
  getServerStats() {
    const stats = {
      totalConnections: 0,
      connectionsByScope: {} as Record<string, number>,
      uptime: process.uptime(),
      rateLimits: this.rateLimitConfig
    };
    
    for (const [scope, connections] of this.activeConnections.entries()) {
      stats.connectionsByScope[scope] = connections.length;
      stats.totalConnections += connections.length;
    }
    
    return stats;
  }
}

/**
 * 🔒 RBAC Token Validator
 */
class RBACValidator {
  private validTokens = new Map<string, { permissions: string[], expires: number }>();
  
  constructor() {
    // Initialize with some demo tokens (in production, use proper JWT validation)
    this.validTokens.set('enterprise-token', {
      permissions: ['infra:read', 'infra:write', 'metrics:read'],
      expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });
    
    this.validTokens.set('development-token', {
      permissions: ['infra:read', 'metrics:read'],
      expires: Date.now() + 24 * 60 * 60 * 1000
    });
  }
  
  validateToken(token: string): { valid: boolean, permissions: string[], reason?: string } {
    const tokenData = this.validTokens.get(token);
    
    if (!tokenData) {
      return { valid: false, permissions: [], reason: 'Token not found' };
    }
    
    if (Date.now() > tokenData.expires) {
      this.validTokens.delete(token);
      return { valid: false, permissions: [], reason: 'Token expired' };
    }
    
    return { valid: true, permissions: tokenData.permissions };
  }
}

// Start server if run directly
if (import.meta.main) {
  const port = parseInt(process.env.INFRA_PORT || '3004');
  const server = new HardenedInfrastructureDashboard({
    port,
    rateLimit: {
      maxConnectionsPerScope: 5,
      connectionTimeoutMs: 60000,
      heartbeatIntervalMs: 15000
    }
  });
  
  console.log('🚀 Hardened Infrastructure Dashboard started!');
  console.log(`📊 Server stats:`, server.getServerStats());
}