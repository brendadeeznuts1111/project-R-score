/**
 * Real-Time Dashboard Synchronization
 * Provides WebSocket-based real-time updates for all dashboards
 * Synchronizes data changes across connected clients instantly
 */

import { UnifiedDashboardIntegration } from './unified-dashboard-integration';
import { WebSocket } from 'ws';

interface DashboardClient {
  id: string;
  ws: WebSocket;
  subscribedDashboards: string[];
  lastActivity: Date;
}

interface DashboardUpdate {
  dashboardType: string;
  data: any;
  timestamp: string;
  changeType: 'full' | 'partial' | 'incremental';
  affectedRecords?: string[];
}

export class RealtimeDashboardSync {
  private clients: Map<string, DashboardClient> = new Map();
  private unifiedIntegration: UnifiedDashboardIntegration;
  private updateQueue: DashboardUpdate[] = [];
  private isProcessingQueue = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(unifiedIntegration: UnifiedDashboardIntegration) {
    this.unifiedIntegration = unifiedIntegration;
    this.startHeartbeat();
    this.setupDataChangeListeners();
  }

  // Client Management
  registerClient(ws: WebSocket, clientId: string): void {
    const client: DashboardClient = {
      id: clientId,
      ws,
      subscribedDashboards: [],
      lastActivity: new Date(),
    };

    this.clients.set(clientId, client);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(clientId, data);
      } catch (error) {
        console.error(`Invalid message from client ${clientId}:`, error);
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    });

    ws.on('error', error => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.clients.delete(clientId);
    });

    console.log(`Client ${clientId} registered`);
  }

  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    switch (message.type) {
      case 'subscribe':
        this.subscribeClientToDashboards(clientId, message.dashboards);
        break;
      case 'unsubscribe':
        this.unsubscribeClientFromDashboards(clientId, message.dashboards);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      default:
        console.warn(`Unknown message type from client ${clientId}:`, message.type);
    }
  }

  private subscribeClientToDashboards(clientId: string, dashboards: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscribedDashboards = [...new Set([...client.subscribedDashboards, ...dashboards])];

    // Send current data for subscribed dashboards
    for (const dashboard of dashboards) {
      this.sendCurrentDashboardData(clientId, dashboard);
    }

    console.log(`Client ${clientId} subscribed to dashboards:`, dashboards);
  }

  private unsubscribeClientFromDashboards(clientId: string, dashboards: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscribedDashboards = client.subscribedDashboards.filter(
      dashboard => !dashboards.includes(dashboard)
    );

    console.log(`Client ${clientId} unsubscribed from dashboards:`, dashboards);
  }

  private async sendCurrentDashboardData(clientId: string, dashboardType: string): Promise<void> {
    try {
      const data = await this.unifiedIntegration.getDashboardData(dashboardType as any);

      this.sendToClient(clientId, {
        type: 'dashboard_update',
        dashboardType,
        data,
        timestamp: new Date().toISOString(),
        changeType: 'full',
      });
    } catch (error) {
      console.error(
        `Failed to send current data for ${dashboardType} to client ${clientId}:`,
        error
      );
    }
  }

  // Data Change Listeners
  private setupDataChangeListeners(): void {
    // Set up listeners for data changes in the unified integration
    this.unifiedIntegration.subscribeToUpdates('ipTracker', data => {
      this.queueUpdate({
        dashboardType: 'ipTracker',
        data,
        timestamp: new Date().toISOString(),
        changeType: 'partial',
      });
    });

    this.unifiedIntegration.subscribeToUpdates('transactionHistory', data => {
      this.queueUpdate({
        dashboardType: 'transactionHistory',
        data,
        timestamp: new Date().toISOString(),
        changeType: 'incremental',
      });
    });

    this.unifiedIntegration.subscribeToUpdates('collections', data => {
      this.queueUpdate({
        dashboardType: 'collections',
        data,
        timestamp: new Date().toISOString(),
        changeType: 'partial',
      });
    });

    this.unifiedIntegration.subscribeToUpdates('sportsbookLines', data => {
      this.queueUpdate({
        dashboardType: 'sportsbookLines',
        data,
        timestamp: new Date().toISOString(),
        changeType: 'partial',
      });
    });

    this.unifiedIntegration.subscribeToUpdates('analysis', data => {
      this.queueUpdate({
        dashboardType: 'analysis',
        data,
        timestamp: new Date().toISOString(),
        changeType: 'full',
      });
    });
  }

  // Update Queue Management
  private queueUpdate(update: DashboardUpdate): void {
    this.updateQueue.push(update);
    this.processUpdateQueue();
  }

  private async processUpdateQueue(): Promise<void> {
    if (this.isProcessingQueue || this.updateQueue.length === 0) return;

    this.isProcessingQueue = true;

    try {
      // Process updates in batches to avoid overwhelming clients
      const batchSize = 10;
      const updates = this.updateQueue.splice(0, batchSize);

      for (const update of updates) {
        await this.broadcastUpdate(update);
      }
    } finally {
      this.isProcessingQueue = false;

      // Continue processing if there are more updates
      if (this.updateQueue.length > 0) {
        setTimeout(() => this.processUpdateQueue(), 100);
      }
    }
  }

  private async broadcastUpdate(update: DashboardUpdate): Promise<void> {
    const interestedClients = Array.from(this.clients.values()).filter(client =>
      client.subscribedDashboards.includes(update.dashboardType)
    );

    console.log(
      `Broadcasting ${update.dashboardType} update to ${interestedClients.length} clients`
    );

    for (const client of interestedClients) {
      try {
        this.sendToClient(client.id, {
          type: 'dashboard_update',
          ...update,
        });
      } catch (error) {
        console.error(`Failed to send update to client ${client.id}:`, error);
        // Remove failed client
        this.clients.delete(client.id);
      }
    }
  }

  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  // Heartbeat System
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeoutThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [clientId, client] of this.clients) {
        // Check for inactive clients
        if (now.getTime() - client.lastActivity.getTime() > timeoutThreshold) {
          console.log(`Removing inactive client ${clientId}`);
          client.ws.close();
          this.clients.delete(clientId);
          continue;
        }

        // Send heartbeat
        this.sendToClient(clientId, {
          type: 'heartbeat',
          timestamp: now.toISOString(),
          activeClients: this.clients.size,
        });
      }
    }, 30000); // Every 30 seconds
  }

  // Manual Update Triggers
  async triggerManualUpdate(dashboardType: string): Promise<void> {
    try {
      const data = await this.unifiedIntegration.getDashboardData(dashboardType as any);

      this.queueUpdate({
        dashboardType,
        data,
        timestamp: new Date().toISOString(),
        changeType: 'full',
      });
    } catch (error) {
      console.error(`Failed to trigger manual update for ${dashboardType}:`, error);
    }
  }

  async triggerPartialUpdate(
    dashboardType: string,
    partialData: any,
    affectedRecords?: string[]
  ): Promise<void> {
    this.queueUpdate({
      dashboardType,
      data: partialData,
      timestamp: new Date().toISOString(),
      changeType: 'partial',
      affectedRecords,
    });
  }

  // System Status
  getSystemStatus(): {
    activeClients: number;
    queuedUpdates: number;
    isProcessing: boolean;
    uptime: number;
  } {
    return {
      activeClients: this.clients.size,
      queuedUpdates: this.updateQueue.length,
      isProcessing: this.isProcessingQueue,
      uptime: process.uptime(),
    };
  }

  getClientInfo(): Array<{
    id: string;
    subscribedDashboards: string[];
    lastActivity: string;
  }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      subscribedDashboards: client.subscribedDashboards,
      lastActivity: client.lastActivity.toISOString(),
    }));
  }

  // Cleanup
  async destroy(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }

    this.clients.clear();
    this.updateQueue.length = 0;

    console.log('🧹 Real-time dashboard sync cleaned up');
  }
}

// WebSocket Server Integration
export async function handleWebSocketConnection(ws: WebSocket, env: any): Promise<void> {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Initialize unified integration if not already done
  const unifiedIntegration = new UnifiedDashboardIntegration({
    ipTracker: { enabled: true, realTimeUpdates: true, riskThreshold: 70 },
    transactionHistory: { enabled: true, realTimeUpdates: true, maxRecords: 1000 },
    collections: { enabled: true, realTimeUpdates: true, autoSettlement: false },
    sportsbookLines: { enabled: true, realTimeUpdates: true, autoRefresh: true },
    analysis: { enabled: true, realTimeUpdates: true, predictiveEnabled: true },
  });

  // Initialize real-time sync
  const realtimeSync = new RealtimeDashboardSync(unifiedIntegration);

  // Register the client
  realtimeSync.registerClient(ws, clientId);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: 'welcome',
      clientId,
      message: 'Connected to Dashboard Real-time Sync',
      timestamp: new Date().toISOString(),
    })
  );
}
