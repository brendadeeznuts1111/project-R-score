#!/usr/bin/env bun

import { custom as inspectCustom } from 'bun:inspect';

export interface HubMessage {
  type: string;
  data: any;
  timestamp: string;
  source: string;
  id: string;
}

export interface HubClient {
  id: string;
  type: 'agent' | 'device' | 'service' | 'monitor';
  connected: boolean;
  lastSeen: string;
  capabilities: string[];
  metadata: Record<string, any>;

  [inspectCustom]: () => string;
}

export class EnhancedManagementHub {
  private clients: Map<string, HubClient> = new Map();
  private messageQueue: HubMessage[] = [];
  private messageHandlers: Map<string, Function[]> = new Map();

  constructor() {
    console.log('🔗 Enhanced Management Hub initialized');
    this.startHeartbeat();
  }

  /**
   * Register a client with the hub
   */
  registerClient(client: Omit<HubClient, 'connected' | 'lastSeen'>): HubClient {
    const fullClient: HubClient = {
      ...client,
      connected: true,
      lastSeen: new Date().toISOString(),

      [inspectCustom]: function() {
        const statusColor = this.connected ? '\x1b[32m' : '\x1b[31m'; // Green/Red
        const typeColor = {
          agent: '\x1b[34m',    // Blue
          device: '\x1b[35m',   // Magenta
          service: '\x1b[36m',  // Cyan
          monitor: '\x1b[33m'   // Yellow
        }[this.type] || '\x1b[37m';

        return [
          `${statusColor}[${this.connected ? 'ONLINE' : 'OFFLINE'}]`.padEnd(10),
          `${typeColor}[${this.type.toUpperCase()}]`.padEnd(10),
          this.id.padEnd(15),
          new Date(this.lastSeen).toLocaleString().padEnd(20),
          this.capabilities.join(', ').padEnd(30),
          '\x1b[0m'
        ].join(' | ');
      }
    };

    this.clients.set(client.id, fullClient);
    console.log(`📝 Client registered: ${client.id} (${client.type})`);

    return fullClient;
  }

  /**
   * Send message to all clients or specific client
   */
  async sendMessage(message: Omit<HubMessage, 'timestamp' | 'id'>, targetClientId?: string): Promise<void> {
    const fullMessage: HubMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    if (targetClientId) {
      // Send to specific client
      const client = this.clients.get(targetClientId);
      if (client && client.connected) {
        console.log(`📤 Message sent to ${targetClientId}: ${message.type}`);
        // In real implementation, send via IPC/WebSocket/etc.
      }
    } else {
      // Broadcast to all connected clients
      const connectedClients = Array.from(this.clients.values()).filter(c => c.connected);
      console.log(`📢 Message broadcast to ${connectedClients.length} clients: ${message.type}`);
      // In real implementation, broadcast via IPC/WebSocket/etc.
    }

    // Store in queue for monitoring
    this.messageQueue.push(fullMessage);
    if (this.messageQueue.length > 1000) {
      this.messageQueue.shift();
    }
  }

  /**
   * Register message handler
   */
  onMessage(type: string, handler: Function): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message: HubMessage, sender: HubClient): Promise<any> {
    console.log(`📨 Message received from ${sender.id}: ${message.type}`);

    // Update sender's last seen
    sender.lastSeen = new Date().toISOString();

    // Call registered handlers
    const handlers = this.messageHandlers.get(message.type) || [];
    for (const handler of handlers) {
      try {
        await handler(message, sender);
      } catch (error) {
        console.error(`❌ Handler error for ${message.type}:`, error);
      }
    }

    // Return acknowledgment
    return {
      acknowledged: true,
      messageId: message.id,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get connected clients
   */
  getConnectedClients(): HubClient[] {
    return Array.from(this.clients.values()).filter(client => client.connected);
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): HubClient | null {
    return this.clients.get(clientId) || null;
  }

  /**
   * Disconnect client
   */
  disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.connected = false;
      client.lastSeen = new Date().toISOString();
      console.log(`🔌 Client disconnected: ${clientId}`);
    }
  }

  /**
   * Get hub statistics
   */
  getStatistics(): any {
    const clients = Array.from(this.clients.values());
    const connectedClients = clients.filter(c => c.connected);

    return {
      totalClients: clients.length,
      connectedClients: connectedClients.length,
      disconnectedClients: clients.length - connectedClients.length,
      messagesProcessed: this.messageQueue.length,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      clientTypes: connectedClients.reduce((acc, client) => {
        acc[client.type] = (acc[client.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    setInterval(() => {
      const now = Date.now();
      const timeoutMs = 30000; // 30 seconds

      for (const [clientId, client] of this.clients) {
        const lastSeen = new Date(client.lastSeen).getTime();
        if (now - lastSeen > timeoutMs && client.connected) {
          console.log(`⏰ Client heartbeat timeout: ${clientId}`);
          this.disconnectClient(clientId);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Display hub status using Bun's native table
   */
  displayStatus(): void {
    const stats = this.getStatistics();
    const clients = this.getConnectedClients();

    console.log('\n🔗 MANAGEMENT HUB STATUS');
    console.log('═'.repeat(50));

    // Hub statistics
    console.log('📊 Hub Statistics:');
    console.log(Bun.inspect.table([stats], {
      colors: true,
      indent: 2,
      maxWidth: 80
    }));

    // Connected clients
    if (clients.length > 0) {
      console.log('\n🤝 Connected Clients:');
      console.log(Bun.inspect.table(clients, {
        colors: true,
        indent: 2,
        maxWidth: 100
      }));
    } else {
      console.log('\n🤝 No connected clients');
    }

    // Recent messages
    const recentMessages = this.messageQueue.slice(-5);
    if (recentMessages.length > 0) {
      console.log('\n💬 Recent Messages:');
      console.log(Bun.inspect.table(recentMessages.map(msg => ({
        Type: msg.type,
        Source: msg.source,
        Time: new Date(msg.timestamp).toLocaleTimeString(),
        ID: msg.id.substring(0, 8)
      })), {
        colors: true,
        indent: 2,
        maxWidth: 80
      }));
    }
  }
}