// packages/odds-websocket/src/server.ts - Bun-optimized with native APIs
import type { OddsTick, ArbitrageOpportunity, WebSocketMessage } from 'odds-core';
import { BunUtils, OddsProtocolUtils } from 'odds-core/src/bun-utils';
import { BunGlobalsIntegration, MarketDataProcessor } from 'odds-core/src/bun-globals';
import { BunNativeAPIsIntegration, MarketDataNativeProcessor } from 'odds-core/src/bun-native-apis';
import { apiTracker } from 'odds-core/src/monitoring/api-tracker.js';

interface BunWebSocketData {
  id: string;
  connectedAt: number;
  backpressureCount: number;
  subscriptions: Set<string>;
  lastPing: number;
  messageCount: number;
  abortController?: AbortController;
  sessionId: string;
}

// Create market data processors
const marketProcessor = new MarketDataProcessor();
const nativeProcessor = new MarketDataNativeProcessor();

// Start native data feeds
nativeProcessor.startTCPDataFeed(8080);
nativeProcessor.startUDPDataFeed(8081);

// Use Bun's native WebSocket with generics and enhanced features
const server = await apiTracker.track('Bun.serve', () => Bun.serve<OddsTick>({
  port: Bun.env.WS_PORT || 3000,
  development: Bun.env.NODE_ENV !== 'production',
  
  // Enhanced fetch handler with native API integration
  async fetch(req: Request, server: any): Promise<Response | undefined> {
    const url = new URL(req.url);
    
    // WebSocket upgrade
    if (url.pathname === '/ws' && server.upgrade(req)) {
      return undefined;
    }
    
    // Health endpoint with system monitoring
    if (url.pathname === '/health') {
      const memorySnapshot = BunNativeAPIsIntegration.getMemorySnapshot();
      const systemInfo = BunGlobalsIntegration.getSystemInfo();
      const cookieHeader = req.headers.get('cookie') || '';
      const cookies = BunNativeAPIsIntegration.parseCookies(cookieHeader);
      
      return BunGlobalsIntegration.createJSONResponse({
        status: 'healthy',
        uptime: process.uptime(),
        connections: server.clients.size,
        memory: memorySnapshot,
        system: systemInfo,
        cookies,
        nativeFeatures: {
          tcpFeed: true,
          udpFeed: true,
          sqlite: true,
          shell: true,
          hashing: true
        },
        timestamp: Date.now()
      });
    }

    // Enhanced metrics with native API performance
    if (url.pathname === '/metrics') {
      BunGlobalsIntegration.createPerformanceMark('native-metrics-start');
      
      const timer = OddsProtocolUtils.createTimer();
      const memoryTracked = OddsProtocolUtils.trackMemoryUsage({
        connections: server.clients.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        heapSnapshot: BunNativeAPIsIntegration.getMemorySnapshot()
      });
      
      // Query market data statistics
      const marketStats = await nativeProcessor.queryMarketData('AAPL', 1);
      
      BunGlobalsIntegration.createPerformanceMark('native-metrics-data-ready');
      const queryTime = BunGlobalsIntegration.measurePerformance(
        'native-metrics-query',
        'native-metrics-start',
        'native-metrics-data-ready'
      );
      
      const response = BunGlobalsIntegration.createJSONResponse({
        ...memoryTracked,
        processingTime: timer.elapsed(),
        nanoseconds: timer.elapsedNanos(),
        queryTime,
        marketStats: {
          hasData: marketStats.ticks.length > 0,
          queryTime: marketStats.queryTime,
          count: marketStats.count
        },
        nativeAPIs: {
          tcpPort: 8080,
          udpPort: 8081,
          database: './market-data.db',
          memorySnapshot: memorySnapshot
        },
        timestamp: Date.now()
      });
      
      // Set performance cookie
      const perfCookie = BunNativeAPIsIntegration.createCookie('metrics_time', Date.now().toString(), {
        httpOnly: true,
        maxAge: 3600,
        sameSite: 'strict'
      });
      
      response.headers.set('Set-Cookie', perfCookie);
      
      return response;
    }

    // Debug endpoint with native API info
    if (url.pathname === '/debug') {
      const debugData = {
        server: {
          port: server.port,
          clients: server.clients.size,
          uptime: process.uptime()
        },
        bun: BunUtils.getBunInfo(),
        memory: process.memoryUsage(),
        heapSnapshot: BunNativeAPIsIntegration.getMemorySnapshot(),
        system: BunGlobalsIntegration.getSystemInfo(),
        performance: {
          marks: performance.getEntriesByType('mark'),
          measures: performance.getEntriesByType('measure')
        },
        nativeAPIs: {
          tcpFeed: { active: true, port: 8080 },
          udpFeed: { active: true, port: 8081 },
          database: { active: true, path: './market-data.db' },
          hashing: { algorithms: ['sha256', 'sha512', 'md5'] },
          shell: { available: true },
          dns: { available: true }
        }
      };
      
      return new Response(OddsProtocolUtils.formatMarketData(debugData), {
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Debug-Timestamp': Date.now().toString()
        }
      });
    }

    // Shell command endpoint (admin only)
    if (url.pathname === '/admin/shell' && req.method === 'POST') {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== 'Bearer admin-token') {
        return new Response('Unauthorized', { status: 401 });
      }
      
      try {
        const body = await req.json();
        const { command, timeout = 10000 } = body;
        
        if (!command) {
          return new Response('Command required', { status: 400 });
        }
        
        const result = await BunNativeAPIsIntegration.executeShellCommand(command, {
          timeout,
          cwd: import.meta.dir
        });
        
        return BunGlobalsIntegration.createJSONResponse({
          command,
          ...result,
          timestamp: Date.now()
        });
        
      } catch (error) {
        return BunGlobalsIntegration.createJSONResponse({
          error: 'Shell command failed',
          details: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    // Market data API with native storage
    if (url.pathname === '/api/market-data' && req.method === 'GET') {
      const searchParams = new URLSearchParams(url.search);
      const symbols = searchParams.get('symbols')?.split(',') || [];
      const limit = parseInt(searchParams.get('limit') || '100');
      const store = searchParams.get('store') === 'true';
      
      try {
        // Use native processor for queries
        const results = await Promise.all(
          symbols.map(async (symbol) => {
            const result = await nativeProcessor.queryMarketData(symbol.trim(), limit);
            return { symbol: symbol.trim(), ...result };
          })
        );
        
        // Store query results if requested
        if (store && results.length > 0) {
          const storePromises = results.flatMap(result => 
            result.ticks.map(tick => nativeProcessor.storeMarketData(tick))
          );
          await Promise.all(storePromises);
        }
        
        return BunGlobalsIntegration.createJSONResponse({
          results,
          queryTime: results.reduce((sum, r) => sum + r.queryTime, 0),
          totalRecords: results.reduce((sum, r) => sum + r.count, 0),
          stored: store,
          timestamp: Date.now()
        });
        
      } catch (error) {
        return BunGlobalsIntegration.createJSONResponse({
          error: 'Failed to query market data',
          details: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    // Export endpoint with native file I/O
    if (url.pathname === '/api/export' && req.method === 'POST') {
      try {
        const body = await req.json();
        const { symbol, format = 'json' } = body;
        
        const fileName = symbol 
          ? `market-data-${symbol}-${Date.now()}.${format}`
          : `market-data-all-${Date.now()}.${format}`;
        
        const filePath = `./exports/${fileName}`;
        
        const exportResult = await nativeProcessor.exportToFile(filePath, symbol);
        
        return BunGlobalsIntegration.createJSONResponse({
          fileName,
          filePath,
          ...exportResult,
          downloadUrl: `/api/download/${fileName}`,
          timestamp: Date.now()
        });
        
      } catch (error) {
        return BunGlobalsIntegration.createJSONResponse({
          error: 'Export failed',
          details: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }

    // Download endpoint
    if (url.pathname.startsWith('/api/download/') && req.method === 'GET') {
      const fileName = url.pathname.split('/').pop();
      const filePath = `./exports/${fileName}`;
      
      try {
        const file = await apiTracker.track('Bun.file', () => Bun.file(filePath));
        if (!await file.exists()) {
          return new Response('File not found', { status: 404 });
        }
        
        return new Response(file);
      } catch (error) {
        return new Response('Download failed', { status: 500 });
      }
    }
    
    return new Response('Not Found', { status: 404 });
  },
  
  websocket: {
    // Enhanced message handling with native API integration
    async message(ws, message) {
      const connectionData = ws.data as BunWebSocketData;
      connectionData.messageCount++;
      
      try {
        const parsedMessage: WebSocketMessage = JSON.parse(message.toString());
        
        switch (parsedMessage.type) {
          case 'subscribe':
            handleSubscribe(ws, parsedMessage);
            break;
          case 'unsubscribe':
            handleUnsubscribe(ws, parsedMessage);
            break;
          case 'ping':
            await handlePing(ws, parsedMessage);
            break;
          case 'tick':
            await handleTick(ws, parsedMessage);
            break;
          case 'batch-ticks':
            await handleBatchTicks(ws, parsedMessage);
            break;
          case 'query':
            await handleQuery(ws, parsedMessage);
            break;
          case 'export':
            await handleExport(ws, parsedMessage);
            break;
          default:
            console.log(`Unknown message type: ${parsedMessage.type}`);
        }
        
      } catch (error) {
        console.error('WebSocket error:', error);
        ws.close(1011, 'Processing error');
      }
    },
    
    open(ws) {
      // Enhanced connection management with session ID
      const connectionId = OddsProtocolUtils.generateMarketEventId();
      const sessionId = BunUtils.generateId('base64');
      
      const connectionData: BunWebSocketData = {
        id: connectionId,
        sessionId,
        connectedAt: Date.now(),
        backpressureCount: 0,
        subscriptions: new Set(),
        lastPing: Date.now(),
        messageCount: 0,
        abortController: new AbortController()
      };
      
      ws.data = connectionData;
      
      // Subscribe to channels
      ws.subscribe('odds-ticks');
      ws.subscribe('arbitrage-alerts');
      ws.subscribe('system-events');
      ws.subscribe('native-feeds');
      
      // Enhanced welcome message
      const welcomeMessage: WebSocketMessage = {
        type: 'connection',
        data: { 
          id: connectionId,
          sessionId,
          message: 'Connected to odds protocol with native APIs',
          server: BunUtils.getBunInfo(),
          features: [
            'compression', 'batch-processing', 'metrics', 'web-streams',
            'native-tcp', 'native-udp', 'sqlite', 'shell', 'hashing'
          ],
          capabilities: {
            maxPayloadLength: 10 * 1024 * 1024,
            compression: ['gzip', 'deflate', 'zstd'],
            protocols: ['json', 'binary'],
            storage: 'sqlite',
            networking: ['tcp', 'udp'],
            shell: true
          },
          endpoints: {
            tcp: 'localhost:8080',
            udp: 'localhost:8081',
            admin: '/admin/shell',
            export: '/api/export'
          }
        },
        timestamp: Date.now(),
        sequence: 0
      };
      
      ws.send(JSON.stringify(welcomeMessage));
      
      console.log(`🔗 Connection opened: ${connectionId} (session: ${sessionId})`);
      
      // Broadcast connection event
      server.publish('system-events', JSON.stringify({
        type: 'client-connected',
        data: { id: connectionId, sessionId, totalConnections: server.clients.size },
        timestamp: Date.now(),
        sequence: 0
      } as WebSocketMessage));
    },
    
    close(ws, code, message) {
      const connectionData = ws.data as BunWebSocketData;
      if (connectionData) {
        if (connectionData.abortController) {
          connectionData.abortController.abort();
        }
        
        ws.unsubscribe('odds-ticks');
        ws.unsubscribe('arbitrage-alerts');
        ws.unsubscribe('system-events');
        ws.unsubscribe('native-feeds');
        
        const sessionDuration = Date.now() - connectionData.connectedAt;
        
        console.log(`❌ Connection closed: ${connectionData.id} (session: ${connectionData.sessionId}, duration: ${sessionDuration}ms, messages: ${connectionData.messageCount})`);
        
        server.publish('system-events', JSON.stringify({
          type: 'client-disconnected',
          data: { 
            id: connectionData.id, 
            sessionId: connectionData.sessionId,
            totalConnections: server.clients.size,
            sessionDuration,
            messageCount: connectionData.messageCount
          },
          timestamp: Date.now(),
          sequence: 0
        } as WebSocketMessage));
      }
    },
    
    // Enhanced compression configuration
    perMessageDeflate: {
      compress: true,
      compressThreshold: 512,
    },
    
    // Bun-specific optimizations
    backpressureLimit: 1024 * 1024,
    idleTimeout: 60,
    maxPayloadLength: 10 * 1024 * 1024,
  },
}));

// Enhanced message handlers with native API integration
async function handleTick(ws: any, message: WebSocketMessage): Promise<void> {
  const tick = message.data as OddsTick;
  const validated = validateTick(tick);
  if (!validated) {
    ws.close(1008, 'Invalid tick data');
    return;
  }
  
  // Store tick using native processor
  const storeResult = await nativeProcessor.storeMarketData(tick);
  
  // Process through market processor
  marketProcessor.processBatch([tick]).then(result => {
    if (result.errors > 0) {
      console.warn(`Tick processing errors: ${result.errors}`);
    }
  });
  
  // Broadcast with storage metadata
  const enhancedMessage: WebSocketMessage = {
    type: 'tick-stored',
    data: tick,
    metadata: {
      id: storeResult.id,
      hash: storeResult.hash,
      storeTime: storeResult.storeTime,
      timestamp: Date.now()
    },
    timestamp: Date.now(),
    sequence: message.sequence + 1
  };
  
  server.publish('odds-ticks', JSON.stringify(enhancedMessage), true);
  server.publish('native-feeds', JSON.stringify(enhancedMessage), true);
  
  handleBackpressure(ws, tick);
}

async function handleBatchTicks(ws: any, message: WebSocketMessage): Promise<void> {
  const batchTicks = message.data as OddsTick[];
  const batchTimer = OddsProtocolUtils.createTimer();
  
  const validTicks = batchTicks.filter(tick => validateTick(tick));
  
  // Store all ticks using native processor
  const storePromises = validTicks.map(tick => nativeProcessor.storeMarketData(tick));
  const storeResults = await Promise.all(storePromises);
  
  // Process through market processor
  marketProcessor.processBatch(validTicks).then(result => {
    console.log(`Batch processed: ${result.processed}/${validTicks.length} in ${result.duration.toFixed(2)}ms`);
  });
  
  const batchMessage: WebSocketMessage = {
    type: 'tick-batch-stored',
    data: validTicks,
    metadata: {
      processedCount: validTicks.length,
      rejectedCount: batchTicks.length - validTicks.length,
      processingTime: batchTimer.elapsed(),
      storedIds: storeResults.map(r => r.id),
      hashes: storeResults.map(r => r.hash),
      averageStoreTime: storeResults.reduce((sum, r) => sum + r.storeTime, 0) / storeResults.length
    },
    timestamp: Date.now(),
    sequence: message.sequence + 1
  };
  
  server.publish('odds-ticks-batch', JSON.stringify(batchMessage), true);
  server.publish('native-feeds', JSON.stringify(batchMessage), true);
}

async function handleQuery(ws: any, message: WebSocketMessage): Promise<void> {
  const { symbol, limit = 100 } = message.data as { symbol: string; limit?: number };
  
  try {
    const result = await nativeProcessor.queryMarketData(symbol, limit);
    
    const response: WebSocketMessage = {
      type: 'query-result',
      data: result,
      timestamp: Date.now(),
      sequence: message.sequence + 1
    };
    
    ws.send(JSON.stringify(response));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Query failed', error: error instanceof Error ? error.message : String(error) },
      timestamp: Date.now(),
      sequence: message.sequence + 1
    } as WebSocketMessage));
  }
}

async function handleExport(ws: any, message: WebSocketMessage): Promise<void> {
  const { symbol } = message.data as { symbol?: string };
  
  try {
    const fileName = symbol 
      ? `market-data-${symbol}-${Date.now()}.json`
      : `market-data-all-${Date.now()}.json`;
    
    const filePath = `./exports/${fileName}`;
    const exportResult = await nativeProcessor.exportToFile(filePath, symbol);
    
    const response: WebSocketMessage = {
      type: 'export-result',
      data: {
        fileName,
        filePath,
        ...exportResult,
        downloadUrl: `/api/download/${fileName}`
      },
      timestamp: Date.now(),
      sequence: message.sequence + 1
    };
    
    ws.send(JSON.stringify(response));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      data: { message: 'Export failed', error: error instanceof Error ? error.message : String(error) },
      timestamp: Date.now(),
      sequence: message.sequence + 1
    } as WebSocketMessage));
  }
}

async function handlePing(ws: any, message: WebSocketMessage): Promise<void> {
  const connectionData = ws.data as BunWebSocketData;
  connectionData.lastPing = Date.now();
  
  // Generate hash for ping verification
  const { hash } = await BunNativeAPIsIntegration.hashMarketData({
    timestamp: message.timestamp,
    connectionId: connectionData.id
  });
  
  const pongResponse: WebSocketMessage = {
    type: 'pong',
    data: { 
      timestamp: message.timestamp,
      processingTime: Date.now() - message.timestamp,
      connectionId: connectionData.id,
      sessionId: connectionData.sessionId,
      serverTime: Date.now(),
      hash
    },
    timestamp: Date.now(),
    sequence: message.sequence + 1
  };
  
  ws.send(JSON.stringify(pongResponse));
}

// Other existing handlers remain the same...
function handleSubscribe(ws: any, message: WebSocketMessage): void {
  const connectionData = ws.data as BunWebSocketData;
  const symbols = message.data as string[];
  
  symbols.forEach(symbol => {
    const sanitizedSymbol = BunUtils.escapeHTML(symbol);
    connectionData.subscriptions.add(sanitizedSymbol);
    ws.subscribe(`symbol:${sanitizedSymbol}`);
  });
  
  const response: WebSocketMessage = {
    type: 'subscribed',
    data: { 
      symbols, 
      totalSubscriptions: connectionData.subscriptions.size,
      connectionId: connectionData.id,
      sessionId: connectionData.sessionId
    },
    timestamp: Date.now(),
    sequence: message.sequence + 1
  };
  
  ws.send(JSON.stringify(response));
}

function handleUnsubscribe(ws: any, message: WebSocketMessage): void {
  const connectionData = ws.data as BunWebSocketData;
  const symbols = message.data as string[];
  
  symbols.forEach(symbol => {
    const sanitizedSymbol = BunUtils.escapeHTML(symbol);
    connectionData.subscriptions.delete(sanitizedSymbol);
    ws.unsubscribe(`symbol:${sanitizedSymbol}`);
  });
  
  const response: WebSocketMessage = {
    type: 'unsubscribed',
    data: { 
      symbols, 
      totalSubscriptions: connectionData.subscriptions.size,
      connectionId: connectionData.id,
      sessionId: connectionData.sessionId
    },
    timestamp: Date.now(),
    sequence: message.sequence + 1
  };
  
  ws.send(JSON.stringify(response));
}

function validateTick(tick: unknown): tick is OddsTick {
  if (typeof tick !== 'object' || tick === null) {
    return false;
  }
  
  const requiredFields = ['symbol', 'price', 'size', 'timestamp', 'exchange', 'side'];
  return requiredFields.every(field => field in tick);
}

async function handleBackpressure(ws: any, tick: OddsTick | OddsTick[]): Promise<void> {
  const connectionData = ws.data as BunWebSocketData;
  
  const message: WebSocketMessage = {
    type: 'tick',
    data: tick,
    timestamp: Date.now(),
    sequence: 0
  };
  
  const sent = ws.send(JSON.stringify(message), true);
  
  if (sent === -1) {
    connectionData.backpressureCount++;
    
    await scheduler.postTask(() => {
      if (connectionData.backpressureCount > 20) {
        ws.pause();
        setTimeout(() => {
          ws.resume();
          connectionData.backpressureCount = 0;
        }, 200);
      }
    }, { priority: 'background' });
  } else {
    connectionData.backpressureCount = 0;
  }
}

// Enhanced broadcasting functions
export function broadcastArbitrage(opportunity: ArbitrageOpportunity): void {
  const message: WebSocketMessage = {
    type: 'arbitrage',
    data: opportunity,
    timestamp: Date.now(),
    sequence: 0,
    metadata: {
      id: OddsProtocolUtils.generateMarketEventId(),
      processingTime: 0
    }
  };
  
  server.publish('arbitrage-alerts', JSON.stringify(message), true);
  marketProcessor.emitArbitrage(opportunity);
}

export function broadcastTick(tick: OddsTick): void {
  const message: WebSocketMessage = {
    type: 'tick',
    data: tick,
    timestamp: Date.now(),
    sequence: 0,
    metadata: {
      id: OddsProtocolUtils.generateMarketEventId()
    }
  };
  
  server.publish('odds-ticks', JSON.stringify(message), true);
  server.publish(`symbol:${tick.symbol}`, JSON.stringify(message), true);
  marketProcessor.emitTick(tick);
}

export function getServerStats() {
  const timer = OddsProtocolUtils.createTimer();
  const memoryTracked = OddsProtocolUtils.trackMemoryUsage(process.memoryUsage());
  const systemInfo = BunGlobalsIntegration.getSystemInfo();
  const heapSnapshot = BunNativeAPIsIntegration.getMemorySnapshot();
  
  return {
    port: server.port,
    connections: server.clients.size,
    uptime: process.uptime(),
    memory: memoryTracked,
    heapSnapshot,
    bun: BunUtils.getBunInfo(),
    system: systemInfo,
    processingTime: timer.elapsed(),
    nanoseconds: timer.elapsedNanos(),
    nativeAPIs: {
      tcpFeed: { active: true, port: 8080 },
      udpFeed: { active: true, port: 8081 },
      database: { active: true, path: './market-data.db' }
    },
    performance: {
      marks: performance.getEntriesByType('mark').length,
      measures: performance.getEntriesByType('measure').length
    }
  };
}

console.log(`🚀 Odds WebSocket Server (Bun Native APIs v${Bun.version}) running on ${server.port}`);
console.log(`📊 Metrics: http://localhost:${server.port}/metrics`);
console.log(`🔍 Debug: http://localhost:${server.port}/debug`);
console.log(`🌐 API: http://localhost:${server.port}/api/market-data?symbols=AAPL,GOOGL&limit=100`);
console.log(`📡 Native Feeds: TCP on 8080, UDP on 8081`);
console.log(`💾 Database: SQLite at ./market-data.db`);

// Cleanup on exit
process.on('exit', () => {
  nativeProcessor.close();
});

export default server;
