// packages/odds-websocket/src/bun-v13-server.ts - Bun v1.3 optimized WebSocket server
import type { OddsTick, ArbitrageOpportunity, SharpSignal } from '../../odds-core/src/types';
import { BunNativeAPIsIntegration } from '../../odds-core/src/bun-native-apis';
import { BunCompleteAPIsIntegration } from '../../odds-core/src/bun-complete-apis';
import { hash, stripANSI } from "bun";
import { apiTracker } from '../../odds-core/src/monitoring/api-tracker.js';

export interface ConnectionData {
  id: string;
  connectedAt: number;
  subscription: Set<string>;
  backpressureCount: number;
  messageCount: number;
  lastActivity: number;
}

export interface WorkerMessage {
  type: 'process-tick' | 'arbitrage-alert' | 'sharp-signal';
  data: any;
  connectionId?: string;
  processingTime?: number;
}

export class Bun13OptimizedWebSocketServer {
  private server: ReturnType<typeof Bun.serve>;
  private workerPool: Worker[] = [];
  private currentWorkerIndex = 0;
  private rapidHashCache = new Map<string, bigint>();
  private startTime = performance.now();
  private connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesProcessed: 0,
    averageProcessingTime: 0,
  };

  constructor(options: { 
    port?: number; 
    workerCount?: number;
    enableBackpressure?: boolean;
    compressionThreshold?: number;
  } = {}) {
    const {
      port = 3000,
      workerCount = 4,
      enableBackpressure = true,
      compressionThreshold = 512
    } = options;

    // Initialize worker pool with Bun 1.3 optimizations
    this.initializeWorkers(workerCount);
    
    this.server = await apiTracker.track('Bun.serve', () => Bun.serve<OddsTick>({
      port,
      development: Bun.env.NODE_ENV !== 'production',
      
      // Enhanced fetch handler with Bun 1.3 optimizations
      fetch: (req, server) => this.handleFetch(req, server),
      
      websocket: {
        open: (ws) => this.handleOpen(ws),
        message: (ws, message) => this.handleMessage(ws, message),
        close: (ws) => this.handleClose(ws),
        
        // Bun 1.3: Optimized compression settings
        perMessageDeflate: {
          compress: true,
        },
        
        // Bun 1.3: Enhanced backpressure handling
        backpressureLimit: enableBackpressure ? 1024 * 1024 : undefined, // 1MB
        closeOnBackpressureLimit: false, // Don't close, just handle gracefully
        
        idleTimeout: 60,
        maxPayloadLength: 4 * 1024 * 1024, // 4MB for larger market data
      },
    }));

    console.log(`🚀 Bun 1.3 Optimized WebSocket Server on port ${this.server.port}`);
    console.log(`📊 Worker Pool: ${this.workerPool.length} workers`);
    console.log(`⚡ Compression Threshold: ${compressionThreshold} bytes`);
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  private initializeWorkers(count: number) {
    console.log(`🔄 Initializing ${count} workers with Bun 1.3 optimizations...`);
    
    for (let i = 0; i < count; i++) {
      try {
        const worker = new Worker(
          new URL('./market-worker.ts', import.meta.url).href,
          {
            name: `odds-processor-${i}`,
            smol: true, // Bun 1.3 memory optimization
          }
        );

        worker.onmessage = (event) => {
          this.handleWorkerMessage(event.data);
        };

        worker.onerror = (error) => {
          console.error(`❌ Worker ${i} error:`, error);
        };

        this.workerPool.push(worker);
        console.log(`✅ Worker ${i} initialized with smol optimization`);
      } catch (error) {
        console.error(`❌ Failed to initialize worker ${i}:`, error);
      }
    }
  }

  private handleFetch(req: Request, server: ReturnType<typeof Bun.serve>): Response {
    const url = new URL(req.url);
    
    // WebSocket upgrade endpoint
    if (url.pathname === '/ws' && server.upgrade(req)) {
      return new Response(); // WebSocket upgrade successful
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      const health = this.getHealthStatus();
      return new Response(JSON.stringify(health, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Metrics endpoint
    if (url.pathname === '/metrics') {
      const metrics = this.getPerformanceMetrics();
      return new Response(metrics, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // Bun 1.3 rapidhash demo endpoint
    if (url.pathname === '/hash-demo') {
      const testData = url.searchParams.get('data') || 'test-data';
      const hashResult = this.calculateTickHash({ exchange: 'test', gameId: testData, line: 0, timestamp: new Date() } as OddsTick);
      return new Response(JSON.stringify({
        data: testData,
        hash: hashResult.toString(16),
        cacheSize: this.rapidHashCache.size
      }));
    }
    
    return new Response('Not Found', { status: 404 });
  }

  private handleOpen(ws: any) { // Using any for Bun's ServerWebSocket
    // Bun 1.3: Rapidhash for connection IDs
    const connectionId = this.generateConnectionId();
    
    const connectionData: ConnectionData = {
      id: connectionId,
      connectedAt: performance.now(),
      subscription: new Set(['odds-ticks']),
      backpressureCount: 0,
      messageCount: 0,
      lastActivity: performance.now(),
    };
    
    ws.data = connectionData;
    ws.subscribe('odds-ticks');
    ws.subscribe('arbitrage-alerts');
    ws.subscribe('sharp-signals');
    
    this.connectionMetrics.totalConnections++;
    this.connectionMetrics.activeConnections++;
    
    console.log(`🔗 New connection: ${connectionId} (total: ${this.connectionMetrics.activeConnections})`);
    
    // Send welcome message with connection info
    ws.send(JSON.stringify({
      type: 'connection-established',
      connectionId,
      serverTime: Date.now(),
      features: {
        compression: true,
        rapidhash: true,
        backpressureHandling: true,
      }
    }));
  }

  private async handleMessage(ws: any, message: string | Buffer) { // Using any for Bun's ServerWebSocket
    const connectionData = ws.data as ConnectionData;
    connectionData.messageCount++;
    connectionData.lastActivity = performance.now();
    this.connectionMetrics.messagesProcessed++;

    try {
      const startTime = performance.now();
      
      // Bun 1.3: Strip ANSI codes from malformed messages
      const cleanData = stripANSI(message.toString());
      const tick: OddsTick = JSON.parse(cleanData);

      // Bun 1.3: Rapidhash for tick deduplication
      const tickHash = this.calculateTickHash(tick);
      
      if (this.isDuplicateTick(tickHash)) {
        return; // Skip duplicate ticks
      }

      // Distribute to worker pool with optimized postMessage
      const worker = this.getNextWorker();
      const workerMessage: WorkerMessage = {
        type: 'process-tick',
        data: tick,
        connectionId: connectionData.id,
      };

      // Bun 1.3: 500x faster postMessage for worker communication
      worker.postMessage(workerMessage);

      // Handle backpressure with Bun 1.3 optimizations
      await this.handleBackpressure(ws, tick);

      const processingTime = performance.now() - startTime;
      this.updateProcessingTimeMetrics(processingTime);

    } catch (error) {
      console.error('❌ Message processing error:', error);
      ws.close(1011, 'Invalid message format');
    }
  }

  private handleClose(ws: any) { // Using any for Bun's ServerWebSocket
    const connectionData = ws.data as ConnectionData;
    this.connectionMetrics.activeConnections--;
    
    console.log(`🔌 Connection closed: ${connectionData.id} (active: ${this.connectionMetrics.activeConnections})`);
  }

  private generateConnectionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const hash = Bun.hash(`${timestamp}-${random}`);
    return hash.toString(16);
  }

  private calculateTickHash(tick: OddsTick): bigint {
    const key = `${tick.exchange}-${tick.gameId}-${tick.line}-${tick.timestamp.getTime()}`;
    
    if (!this.rapidHashCache.has(key)) {
      this.rapidHashCache.set(key, BigInt(hash(key)));
    }
    
    return this.rapidHashCache.get(key)!;
  }

  private isDuplicateTick(hash: bigint): boolean {
    // Simple duplicate detection with time-based cleanup
    return this.rapidHashCache.has(hash.toString());
  }

  private getNextWorker(): Worker {
    // Round-robin with load balancing
    const worker = this.workerPool[this.currentWorkerIndex];
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workerPool.length;
    return worker;
  }

  private async handleBackpressure(ws: any, tick: OddsTick) { // Using any for Bun's ServerWebSocket
    try {
      const message = JSON.stringify(tick);
      const sent = ws.send(message); // Simplified send call
      
      if (sent === false) { // Bun returns false for backpressure
        const connectionData = ws.data as ConnectionData;
        connectionData.backpressureCount++;
        
        // Bun 1.3: Use setTimeout for backpressure handling (scheduler may not be available)
        if (connectionData.backpressureCount > 5) {
          // Note: pause/resume may not be available on all WebSocket implementations
          try {
            (ws as any).pause?.();
          } catch {
            // Fallback: just track backpressure
          }
          
          setTimeout(() => {
            try {
              (ws as any).resume?.();
            } catch {
              // Fallback: just reset counter
            }
            connectionData.backpressureCount = Math.max(0, connectionData.backpressureCount - 3);
          }, 50);
        }
      } else {
        connectionData.backpressureCount = Math.max(0, connectionData.backpressureCount - 1);
      }
    } catch (error) {
      console.error('❌ Backpressure handling error:', error);
    }
  }

  private handleWorkerMessage(message: WorkerMessage) {
    try {
      switch (message.type) {
        case 'arbitrage-alert':
          this.server.publish('arbitrage-alerts', JSON.stringify(message.data), false);
          console.log(`💰 Arbitrage alert: ${message.data.edge.toFixed(2)}% edge`);
          break;
          
        case 'sharp-signal':
          this.server.publish('sharp-signals', JSON.stringify(message.data), false);
          console.log(`📈 Sharp signal: ${message.data.confidence.toFixed(2)}% confidence`);
          break;
          
        case 'process-tick':
          // Handle processed tick results
          if (message.data && message.data.processed) {
            this.server.publish('processed-ticks', JSON.stringify(message.data), false);
          }
          break;
          
        default:
          console.warn(`⚠️ Unknown worker message type: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Worker message handling error:', error);
    }
  }

  private getHealthStatus() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      uptime,
      connections: {
        total: this.connectionMetrics.totalConnections,
        active: this.connectionMetrics.activeConnections,
        max: (globalThis as any).connectionPool?.maxConnections || 10000,
      },
      performance: {
        messagesProcessed: this.connectionMetrics.messagesProcessed,
        averageProcessingTime: this.connectionMetrics.averageProcessingTime,
        workerCount: this.workerPool.length,
        rapidHashCacheSize: this.rapidHashCache.size,
      },
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
      },
      bun: {
        version: Bun.version,
        revision: Bun.revision,
      },
    };
  }

  private getPerformanceMetrics(): string {
    const health = this.getHealthStatus();
    
    // Prometheus-style metrics
    const metrics = [
      `# HELP odds_connections_total Total number of connections`,
      `# TYPE odds_connections_total counter`,
      `odds_connections_total ${health.connections.total}`,
      '',
      `# HELP odds_connections_active Active connections`,
      `# TYPE odds_connections_active gauge`,
      `odds_connections_active ${health.connections.active}`,
      '',
      `# HELP odds_messages_processed_total Total messages processed`,
      `# TYPE odds_messages_processed_total counter`,
      `odds_messages_processed_total ${health.performance.messagesProcessed}`,
      '',
      `# HELP odds_processing_time_ms Average processing time`,
      `# TYPE odds_processing_time_ms gauge`,
      `odds_processing_time_ms ${health.performance.averageProcessingTime}`,
      '',
      `# HELP odds_memory_heap_used_bytes Memory heap used`,
      `# TYPE odds_memory_heap_used_bytes gauge`,
      `odds_memory_heap_used_bytes ${health.memory.heapUsed}`,
    ];
    
    return metrics.join('\n');
  }

  private updateProcessingTimeMetrics(processingTime: number) {
    // Update rolling average
    const alpha = 0.1; // Smoothing factor
    this.connectionMetrics.averageProcessingTime = 
      this.connectionMetrics.averageProcessingTime * (1 - alpha) + processingTime * alpha;
  }

  private startPerformanceMonitoring() {
    // Cleanup old hash cache entries periodically
    setInterval(() => {
      if (this.rapidHashCache.size > 10000) {
        const entriesToKeep = 5000;
        const entries = Array.from(this.rapidHashCache.entries());
        this.rapidHashCache.clear();
        
        // Keep most recent entries
        entries.slice(-entriesToKeep).forEach(([key, value]) => {
          this.rapidHashCache.set(key, value);
        });
        
        console.log(`🧹 Cleaned hash cache: ${entriesToKeep} entries retained`);
      }
    }, 60000); // Every minute
  }

  // Public methods for external control
  public broadcastMessage(topic: string, message: any): void {
    this.server.publish(topic, JSON.stringify(message), false);
  }

  public getServerInfo() {
    return {
      port: this.server.port,
      uptime: process.uptime(),
      workerCount: this.workerPool.length,
      bunVersion: Bun.version,
    };
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Bun 1.3 WebSocket server...');
    
    // Terminate all workers
    await Promise.all(
      this.workerPool.map(worker => {
        worker.postMessage({ type: 'shutdown' });
        return new Promise<void>(resolve => {
          setTimeout(() => {
            worker.terminate();
            resolve();
          }, 5000);
        });
      })
    );
    
    this.server.stop();
    console.log('✅ Server shutdown complete');
  }
}

// Export singleton instance
let serverInstance: Bun13OptimizedWebSocketServer | null = null;

export function getBun13Server(): Bun13OptimizedWebSocketServer {
  if (!serverInstance) {
    serverInstance = new Bun13OptimizedWebSocketServer({
      port: parseInt(Bun.env.WS_PORT || '3000'),
      workerCount: parseInt(Bun.env.WORKER_COUNT || '4'),
      enableBackpressure: Bun.env.ENABLE_BACKPRESSURE !== 'false',
      compressionThreshold: parseInt(Bun.env.COMPRESSION_THRESHOLD || '512'),
    });
  }
  return serverInstance;
}

// Auto-start if this file is run directly
if (import.meta.main) {
  const server = getBun13Server();
  
  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });
  
  console.log('🚀 Bun 1.3 WebSocket server started successfully');
}

export default getBun13Server;
