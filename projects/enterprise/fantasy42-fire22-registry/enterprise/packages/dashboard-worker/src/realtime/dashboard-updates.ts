/**
 * 🔥 Fire22 Real-time Dashboard Updates
 * WebSocket/SSE integration with Pattern Weaver philosophy
 */

import { Env } from '../env';
import { Fire22SystemController } from '../integration/system-controller';
import { patternWeaver, PatternMetrics } from '../patterns/pattern-weaver-integration';

export interface DashboardUpdate {
  type: 'wager' | 'balance' | 'agent' | 'system' | 'notification' | 'pattern-weaver';
  data: any;
  timestamp: string;
  source: 'dashboard' | 'telegram' | 'api' | 'system' | 'pattern-weaver';
  patterns?: string[];
  performance?: {
    duration: number;
    durationMs: number;
    patternMetrics?: Map<string, PatternMetrics>;
  };
}

export class DashboardUpdateManager {
  private env: Env;
  private systemController: Fire22SystemController;
  private activeConnections: Set<WebSocket> = new Set();
  private updateQueue: DashboardUpdate[] = [];

  constructor(env: Env, systemController: Fire22SystemController) {
    this.env = env;
    this.systemController = systemController;
    this.initializeEventListeners();
    this.initializePatternWeaverListeners();
  }

  /**
   * Initialize event listeners for system events
   */
  private initializeEventListeners(): void {
    // Listen for wager events
    this.systemController.addEventListener('wager:placed', data => {
      this.broadcastUpdate({
        type: 'wager',
        data: {
          action: 'placed',
          wager: data,
          summary: {
            totalWagers: this.updateQueue.filter(u => u.type === 'wager').length + 1,
            totalVolume: data.amount,
          },
        },
        timestamp: new Date().toISOString(),
        source: data.source || 'api',
      });
    });

    // Listen for balance changes
    this.systemController.addEventListener('balance:changed', data => {
      this.broadcastUpdate({
        type: 'balance',
        data: {
          action: 'updated',
          user: data.username,
          oldBalance: data.oldBalance,
          newBalance: data.newBalance,
          change: data.change,
        },
        timestamp: new Date().toISOString(),
        source: data.source || 'api',
      });
    });

    // Listen for agent performance updates
    this.systemController.addEventListener('agent:performance', data => {
      this.broadcastUpdate({
        type: 'agent',
        data: {
          action: 'performance_update',
          agentId: data.agentId,
          performance: data.performance,
          metrics: data.metrics,
        },
        timestamp: new Date().toISOString(),
        source: data.source || 'system',
      });
    });

    // Listen for system alerts
    this.systemController.addEventListener('system:alert', data => {
      this.broadcastUpdate({
        type: 'notification',
        data: {
          action: 'alert',
          message: data.message,
          severity: data.severity || 'info',
          target: data.target || 'all',
        },
        timestamp: new Date().toISOString(),
        source: 'system',
      });
    });
  }

  /**
   * Initialize Pattern Weaver event listeners
   */
  private initializePatternWeaverListeners(): void {
    // Listen for pattern execution events
    patternWeaver.on('pattern:executed', data => {
      this.broadcastUpdate({
        type: 'pattern-weaver',
        data: {
          action: 'pattern_executed',
          pattern: data.pattern,
          duration: data.duration,
          success: data.success,
        },
        timestamp: new Date().toISOString(),
        source: 'pattern-weaver',
        patterns: [data.pattern],
        performance: {
          duration: data.duration,
          durationMs: data.duration / 1_000_000,
        },
      });
    });

    // Listen for pattern weaving events
    patternWeaver.on('patterns:weaved', data => {
      this.broadcastUpdate({
        type: 'pattern-weaver',
        data: {
          action: 'patterns_weaved',
          patterns: data.patterns,
          connectionCount: data.connectionCount,
          totalDuration: data.duration,
        },
        timestamp: new Date().toISOString(),
        source: 'pattern-weaver',
        patterns: data.patterns,
        performance: {
          duration: data.duration,
          durationMs: data.duration / 1_000_000,
          patternMetrics: patternWeaver.getMetrics() as Map<string, PatternMetrics>,
        },
      });
    });

    // Listen for performance measurements
    patternWeaver.on('performance:measured', data => {
      this.broadcastUpdate({
        type: 'system',
        data: {
          action: 'performance_measured',
          operation: data.operation,
          duration: data.duration,
          durationMs: data.durationMs,
        },
        timestamp: new Date().toISOString(),
        source: 'pattern-weaver',
        performance: {
          duration: data.duration,
          durationMs: data.durationMs,
        },
      });
    });

    // Listen for pattern errors
    patternWeaver.on('pattern:error', data => {
      this.broadcastUpdate({
        type: 'notification',
        data: {
          action: 'pattern_error',
          pattern: data.pattern,
          error: data.error.message,
          severity: 'error',
        },
        timestamp: new Date().toISOString(),
        source: 'pattern-weaver',
        patterns: [data.pattern],
      });
    });
  }

  /**
   * Enhanced broadcast with Pattern Weaver integration
   */
  async broadcastPatternUpdate(patterns: string[], operation: string, data: any): Promise<void> {
    const { result, duration } = await patternWeaver.measurePerformance(
      `broadcast_${operation}`,
      async () => {
        return this.broadcastUpdate({
          type: 'pattern-weaver',
          data: {
            action: operation,
            ...data,
            patternMetrics: Object.fromEntries(
              Array.from((patternWeaver.getMetrics() as Map<string, PatternMetrics>).entries())
            ),
          },
          timestamp: new Date().toISOString(),
          source: 'pattern-weaver',
          patterns,
          performance: {
            duration: 0, // Will be updated below
            durationMs: 0, // Will be updated below
          },
        });
      }
    );

    // Update the broadcast with actual performance metrics
    this.broadcastUpdate({
      type: 'system',
      data: {
        action: 'broadcast_performance',
        operation: `broadcast_${operation}`,
        totalDuration: duration,
        patterns: patterns.length,
      },
      timestamp: new Date().toISOString(),
      source: 'pattern-weaver',
      performance: {
        duration,
        durationMs: duration / 1_000_000,
      },
    });
  }

  /**
   * Handle WebSocket connection
   */
  handleWebSocketConnection(webSocket: WebSocket): void {
    this.activeConnections.add(webSocket);

    webSocket.addEventListener('close', () => {
      this.activeConnections.delete(webSocket);
    });

    webSocket.addEventListener('error', () => {
      this.activeConnections.delete(webSocket);
    });

    // Send initial data
    this.sendInitialData(webSocket);
  }

  /**
   * Send initial dashboard data to new connection
   */
  private async sendInitialData(webSocket: WebSocket): Promise<void> {
    try {
      const initialData = {
        type: 'initial',
        data: {
          systemStatus: this.systemController.getSystemStatus(),
          recentUpdates: this.updateQueue.slice(-10), // Last 10 updates
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        source: 'system',
      };

      webSocket.send(JSON.stringify(initialData));
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  /**
   * Broadcast update to all connected clients
   */
  private broadcastUpdate(update: DashboardUpdate): void {
    // Add to update queue
    this.updateQueue.push(update);

    // Keep only last 100 updates
    if (this.updateQueue.length > 100) {
      this.updateQueue = this.updateQueue.slice(-100);
    }

    // Broadcast to all active connections
    const message = JSON.stringify(update);

    this.activeConnections.forEach(webSocket => {
      try {
        if (webSocket.readyState === WebSocket.OPEN) {
          webSocket.send(message);
        } else {
          this.activeConnections.delete(webSocket);
        }
      } catch (error) {
        console.error('Error broadcasting update:', error);
        this.activeConnections.delete(webSocket);
      }
    });

    console.log(`📡 Broadcasted ${update.type} update to ${this.activeConnections.size} clients`);
  }

  /**
   * Handle Server-Sent Events (SSE) connection
   */
  handleSSEConnection(): Response {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Send SSE headers
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial data
    this.sendSSEInitialData(writer);

    // Set up periodic updates
    const interval = setInterval(() => {
      this.sendSSEHeartbeat(writer);
    }, 30000); // Heartbeat every 30 seconds

    // Clean up on close
    const cleanup = () => {
      clearInterval(interval);
      writer.close();
    };

    // Store writer for broadcasting
    (writer as any).cleanup = cleanup;
    this.addSSEWriter(writer);

    return new Response(readable, { headers });
  }

  /**
   * Send initial data via SSE
   */
  private async sendSSEInitialData(writer: WritableStreamDefaultWriter): Promise<void> {
    try {
      const initialData = {
        systemStatus: this.systemController.getSystemStatus(),
        recentUpdates: this.updateQueue.slice(-5),
        timestamp: new Date().toISOString(),
      };

      await writer.write(new TextEncoder().encode(`data: ${JSON.stringify(initialData)}\n\n`));
    } catch (error) {
      console.error('Error sending SSE initial data:', error);
    }
  }

  /**
   * Send SSE heartbeat
   */
  private async sendSSEHeartbeat(writer: WritableStreamDefaultWriter): Promise<void> {
    try {
      await writer.write(
        new TextEncoder().encode(
          `data: {"type":"heartbeat","timestamp":"${new Date().toISOString()}"}\n\n`
        )
      );
    } catch (error) {
      console.error('Error sending SSE heartbeat:', error);
    }
  }

  /**
   * Add SSE writer for broadcasting
   */
  private sseWriters: Set<WritableStreamDefaultWriter> = new Set();

  private addSSEWriter(writer: WritableStreamDefaultWriter): void {
    this.sseWriters.add(writer);
  }

  /**
   * Broadcast update via SSE
   */
  private broadcastSSEUpdate(update: DashboardUpdate): void {
    const message = `data: ${JSON.stringify(update)}\n\n`;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    this.sseWriters.forEach(async writer => {
      try {
        await writer.write(data);
      } catch (error) {
        console.error('Error broadcasting SSE update:', error);
        this.sseWriters.delete(writer);
      }
    });
  }

  /**
   * Get dashboard statistics with Pattern Weaver metrics
   */
  getDashboardStats(): any {
    const patternMetrics = patternWeaver.getMetrics() as Map<string, PatternMetrics>;
    const patterns = patternWeaver.getEvolutionStage();

    return {
      activeConnections: this.activeConnections.size,
      sseConnections: this.sseWriters.size,
      totalUpdates: this.updateQueue.length,
      recentUpdates: this.updateQueue.slice(-10),
      systemStatus: this.systemController.getSystemStatus(),
      patternWeaver: {
        totalPatterns: patternMetrics.size,
        evolutionStages: {
          tool: patterns.tool.length,
          control: patterns.control.length,
          philosophy: patterns.philosophy.length,
        },
        performance: {
          totalExecutionTime: Array.from(patternMetrics.values()).reduce(
            (sum, m) => sum + m.executionTime,
            0
          ),
          totalCacheHits: Array.from(patternMetrics.values()).reduce(
            (sum, m) => sum + m.cacheHits,
            0
          ),
          totalCacheMisses: Array.from(patternMetrics.values()).reduce(
            (sum, m) => sum + m.cacheMisses,
            0
          ),
          totalConnections: Array.from(patternMetrics.values()).reduce(
            (sum, m) => sum + m.connectionsFormed,
            0
          ),
        },
        topPatterns: Array.from(patternMetrics.entries())
          .sort((a, b) => b[1].executionTime - a[1].executionTime)
          .slice(0, 5)
          .map(([name, metrics]) => ({
            name,
            executionTime: metrics.executionTime,
            executionTimeMs: metrics.executionTime / 1_000_000,
            cacheEfficiency:
              (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100 || 0,
          })),
      },
    };
  }

  /**
   * Manually trigger update (for testing)
   */
  triggerTestUpdate(): void {
    this.broadcastUpdate({
      type: 'system',
      data: {
        action: 'test',
        message: 'Test update from dashboard manager',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      source: 'system',
    });
  }
}

/**
 * Create dashboard update manager
 */
export function createDashboardUpdateManager(
  env: Env,
  systemController: Fire22SystemController
): DashboardUpdateManager {
  return new DashboardUpdateManager(env, systemController);
}
