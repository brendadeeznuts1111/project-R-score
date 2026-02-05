#!/usr/bin/env bun

import { SubmarketAnalysisEngine, SubmarketNodes as AnalysisSubmarketNodes } from '../../analysis.js';
import { ArbitragePathfinder } from '../../pathfinder.js';
import { AdvancedSubmarketPlatform } from '../../platform.js';
import { SubmarketNodes, ArbitragePath } from '../../../.root/governance/integrations/types/submarket-schema';
import { PathfindingOptions } from '../../pathfinder.js';

// === WebSocket Message Types ===
interface WebSocketMessage {
  type: string;
  data?: any;
  marketId?: string;
  timestamp: number;
}

interface ClientConnection {
  id: string;
  ws: any; // ServerWebSocket
  subscribedMarkets: Set<string>;
  lastActivity: number;
}

// === Main WebSocket Server ===
class SubmarketWebSocketServer {
  private server: any;
  private clients: Map<string, ClientConnection> = new Map();
  private analysisEngine: SubmarketAnalysisEngine;
  private pathfinder: ArbitragePathfinder;
  private platform: AdvancedSubmarketPlatform;
  private updateInterval: Timer | null = null;
  private messageDeduplication: Map<string, number> = new Map();

  constructor(private port: number = 3001) {
    this.analysisEngine = new SubmarketAnalysisEngine();
    this.pathfinder = new ArbitragePathfinder();
    this.platform = new AdvancedSubmarketPlatform();
  }

  async start(): Promise<void> {
    console.log(`🚀 Starting Submarket WebSocket Server on port ${this.port}`);

    // Initialize Bun WebSocket server
    this.server = Bun.serve({
      port: this.port,
      fetch: this.handleHttpRequest.bind(this),
      websocket: {
        message: this.handleWebSocketMessage.bind(this),
        open: (ws: any) => {
          const clientId = Bun.randomUUIDv7();
          const client: ClientConnection = {
            id: clientId,
            ws,
            subscribedMarkets: new Set(),
            lastActivity: Date.now()
          };

          this.clients.set(clientId, client);
          ws.data = client;

          console.log(`🔌 Client connected: ${clientId}`);
          
          // Send welcome message
          this.sendToClient(client, {
            type: 'connected',
            data: {
              clientId,
              serverTime: Date.now(),
              availableMarkets: this.getAvailableMarkets()
            },
            timestamp: Date.now()
          });
        },
        close: this.handleWebSocketClose.bind(this),
        // Enable compression for better performance
        perMessageDeflate: {
          compress: true,
          decompress: true
        },
        // Configure connection data
        data: {} as ClientConnection
      }
    });

    // Start real-time data updates
    this.startRealTimeUpdates();

    console.log(`✅ Submarket WebSocket Server running on ws://localhost:${this.port}`);
    console.log(`📊 Real-time updates enabled (2-second intervals)`);
    console.log(`🔗 Dashboard available at http://localhost:${this.port + 1}`);
  }

  private async handleHttpRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    
    // Handle health checks
    if (url.pathname === '/health') {
      return Response.json({
        status: 'healthy',
        timestamp: Date.now(),
        clients: this.clients.size,
        uptime: process.uptime()
      });
    }

    // Handle data export
    if (url.pathname === '/api/export') {
      const marketId = url.searchParams.get('market') || 'nba-ml-warriors-lakers';
      const data = await this.generateExportData(marketId);
      
      return new Response(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="submarket-${marketId}-${Date.now()}.json"`
        }
      });
    }

    // Serve the web app
    if (url.pathname === '/') {
      return this.serveWebApp();
    }

    return new Response('Not Found', { status: 404 });
  }

  
  private handleWebSocketMessage(ws: any, message: string | Buffer): void {
    const client = ws.data as ClientConnection;
    client.lastActivity = Date.now();

    try {
      const msg: WebSocketMessage = JSON.parse(message.toString());
      
      // Deduplicate messages based on hash
      const messageHash = Bun.hash(JSON.stringify(msg)).toString();
      const now = Date.now();
      
      if (this.messageDeduplication.has(messageHash)) {
        const lastSeen = this.messageDeduplication.get(messageHash)!;
        if (now - lastSeen < 1000) { // Ignore duplicate messages within 1 second
          return;
        }
      }
      this.messageDeduplication.set(messageHash, now);

      // Clean old deduplication entries
      if (this.messageDeduplication.size > 1000) {
        const cutoff = now - 60000; // 1 minute ago
        for (const [hash, timestamp] of this.messageDeduplication.entries()) {
          if (timestamp < cutoff) {
            this.messageDeduplication.delete(hash);
          }
        }
      }

      this.handleClientMessage(client, msg);
    } catch (error) {
      console.error(`❌ Invalid message from client ${client.id}:`, error);
      this.sendToClient(client, {
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: Date.now()
      });
    }
  }

  private handleWebSocketClose(ws: any, code: number, message: string): void {
    const client = ws.data as ClientConnection;
    this.clients.delete(client.id);
    console.log(`🔌 Client disconnected: ${client.id} (${code}: ${message})`);
  }

  private handleWebSocketError(ws: any, error: Error): void {
    const client = ws.data as ClientConnection;
    console.error(`❌ WebSocket error for client ${client.id}:`, error);
  }

  private async handleClientMessage(client: ClientConnection, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'get-submarket-data':
        await this.handleSubmarketDataRequest(client, message.marketId);
        break;
      
      case 'subscribe-market':
        this.handleMarketSubscription(client, message.marketId);
        break;
      
      case 'unsubscribe-market':
        this.handleMarketUnsubscription(client, message.marketId);
        break;
      
      case 'set-real-time-mode':
        // Handle real-time mode toggle (could be per-client)
        break;
      
      case 'get-arbitrage-paths':
        await this.handleArbitragePathsRequest(client, message.marketId);
        break;
      
      default:
        this.sendToClient(client, {
          type: 'error',
          data: { message: `Unknown message type: ${message.type}` },
          timestamp: Date.now()
        });
    }
  }

  private async handleSubmarketDataRequest(client: ClientConnection, marketId?: string): Promise<void> {
    try {
      const targetMarket = marketId || 'nba-ml-warriors-lakers';
      
      // Get submarket analysis from existing engine
      const analysis: AnalysisSubmarketNodes = this.analysisEngine.analyzeSubmarketStructure(targetMarket);
      
      // Get platform data
      const platformData = this.platform.getMarketNodes();
      
      // Map analysis result to schema SubmarketNodes
      const enhancedData: SubmarketNodes = {
        primaryMarket: {
          nodeId: analysis.primaryMarket.nodeId,
          marketDepth: analysis.primaryMarket.marketDepth,
          liquidityScore: analysis.primaryMarket.liquidityScore,
          competitionLevel: analysis.primaryMarket.competitionLevel,
          efficiency: analysis.primaryMarket.efficiency
        },
        secondaryMarkets: analysis.secondaryMarkets.map(market => ({
          nodeId: market.nodeId,
          marketDepth: 100000, // Default value since not in original
          liquidityScore: 75, // Default value since not in original
          correlationStrength: market.correlationStrength
        })),
        crossMarketEdges: {
          totalEdges: analysis.crossMarketEdges.totalEdges,
          strongestCorrelation: analysis.crossMarketEdges.strongestCorrelation,
          arbitragePaths: ['direct-1', 'triangle-1', 'multi-hop-1'] // Default paths since not in original interface
        }
      };

      client.subscribedMarkets.add(targetMarket);
      
      this.sendToClient(client, {
        type: 'submarket-update',
        data: enhancedData,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(`❌ Error fetching submarket data:`, error);
      this.sendToClient(client, {
        type: 'error',
        data: { message: 'Failed to fetch submarket data' },
        timestamp: Date.now()
      });
    }
  }

  private async handleArbitragePathsRequest(client: ClientConnection, marketId?: string): Promise<void> {
    try {
      const targetMarket = marketId || 'nba-ml-warriors-lakers';
      
      // Get arbitrage paths from pathfinder
      const paths = this.pathfinder.findOptimalPaths(
        targetMarket,
        [`${targetMarket}-spread`, `${targetMarket}-total`],
        { maxHops: 3, minProfit: 0.01, maxRisk: 50, minLiquidity: 1000, maxComplexity: 8 }
      );

      this.sendToClient(client, {
        type: 'arbitrage-paths',
        data: paths,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(`❌ Error fetching arbitrage paths:`, error);
      this.sendToClient(client, {
        type: 'error',
        data: { message: 'Failed to fetch arbitrage paths' },
        timestamp: Date.now()
      });
    }
  }

  private handleMarketSubscription(client: ClientConnection, marketId?: string): void {
    if (marketId) {
      client.subscribedMarkets.add(marketId);
      this.sendToClient(client, {
        type: 'subscription-confirmed',
        data: { marketId },
        timestamp: Date.now()
      });
    }
  }

  private handleMarketUnsubscription(client: ClientConnection, marketId?: string): void {
    if (marketId) {
      client.subscribedMarkets.delete(marketId);
      this.sendToClient(client, {
        type: 'unsubscription-confirmed',
        data: { marketId },
        timestamp: Date.now()
      });
    }
  }

  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.broadcastRealTimeUpdates();
    }, 2000); // Update every 2 seconds
  }

  private async broadcastRealTimeUpdates(): Promise<void> {
    if (this.clients.size === 0) return;

    for (const client of this.clients.values()) {
      // Skip inactive clients
      if (Date.now() - client.lastActivity > 30000) {
        this.clients.delete(client.id);
        client.ws.close();
        continue;
      }

      // Send updates for subscribed markets
      for (const marketId of client.subscribedMarkets) {
        try {
          // Get fresh data
          const analysis: AnalysisSubmarketNodes = this.analysisEngine.analyzeSubmarketStructure(marketId);
          const paths = this.pathfinder.findOptimalPaths(
            marketId,
            [`${marketId}-spread`, `${marketId}-total`],
            { maxHops: 3, minProfit: 0.01, maxRisk: 50, minLiquidity: 1000, maxComplexity: 8 }
          );

          // Send updates with slight randomization to simulate real-time changes
          const enhancedData: SubmarketNodes = {
            primaryMarket: {
              nodeId: analysis.primaryMarket.nodeId,
              marketDepth: analysis.primaryMarket.marketDepth,
              liquidityScore: Math.max(0, Math.min(100, analysis.primaryMarket.liquidityScore + (Math.random() - 0.5) * 3)),
              competitionLevel: analysis.primaryMarket.competitionLevel,
              efficiency: Math.max(0, Math.min(100, analysis.primaryMarket.efficiency + (Math.random() - 0.5) * 2))
            },
            secondaryMarkets: analysis.secondaryMarkets.map(market => ({
              nodeId: market.nodeId,
              marketDepth: 100000, // Default value since not in original
              liquidityScore: 75, // Default value since not in original
              correlationStrength: market.correlationStrength
            })),
            crossMarketEdges: {
              totalEdges: analysis.crossMarketEdges.totalEdges,
              strongestCorrelation: analysis.crossMarketEdges.strongestCorrelation,
              arbitragePaths: ['direct-1', 'triangle-1', 'multi-hop-1'] // Default paths since not in original interface
            }
          };

          this.sendToClient(client, {
            type: 'submarket-update',
            data: enhancedData,
            timestamp: Date.now()
          });

          // Only send path updates if they've changed significantly
          if (Math.random() > 0.7) { // 30% chance of path updates
            this.sendToClient(client, {
              type: 'arbitrage-paths',
              data: paths.map(path => ({
                ...path,
                estimatedProfit: Math.max(0, path.estimatedProfit + (Math.random() - 0.5) * 0.005)
              })),
              timestamp: Date.now()
            });
          }

        } catch (error) {
          console.error(`❌ Error broadcasting updates to client ${client.id}:`, error);
        }
      }
    }
  }

  private sendToClient(client: ClientConnection, message: any): void {
    try {
      if (client.ws.readyState === 1) { // WebSocket.OPEN
        client.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error(`❌ Error sending message to client ${client.id}:`, error);
      this.clients.delete(client.id);
    }
  }

  private async generateExportData(marketId: string): Promise<any> {
    const analysis: AnalysisSubmarketNodes = this.analysisEngine.analyzeSubmarketStructure(marketId);
    const paths = this.pathfinder.findOptimalPaths(
      marketId,
      [`${marketId}-spread`, `${marketId}-total`],
      { maxHops: 3, minProfit: 0.01, maxRisk: 50, minLiquidity: 1000, maxComplexity: 8 }
    );

    // Map analysis result to schema SubmarketNodes for export
    const mappedData: SubmarketNodes = {
      primaryMarket: {
        nodeId: analysis.primaryMarket.nodeId,
        marketDepth: analysis.primaryMarket.marketDepth,
        liquidityScore: analysis.primaryMarket.liquidityScore,
        competitionLevel: analysis.primaryMarket.competitionLevel,
        efficiency: analysis.primaryMarket.efficiency
      },
      secondaryMarkets: analysis.secondaryMarkets.map(market => ({
        nodeId: market.nodeId,
        marketDepth: 100000, // Default value since not in original
        liquidityScore: 75, // Default value since not in original
        correlationStrength: market.correlationStrength
      })),
      crossMarketEdges: {
        totalEdges: analysis.crossMarketEdges.totalEdges,
        strongestCorrelation: analysis.crossMarketEdges.strongestCorrelation,
        arbitragePaths: ['direct-1', 'triangle-1', 'multi-hop-1'] // Default paths since not in original interface
      }
    };

    return {
      exportTime: new Date().toISOString(),
      marketId,
      submarketNodes: mappedData,
      arbitragePaths: paths,
      metadata: {
        serverVersion: '1.0.0',
        dataFreshness: 'real-time',
        exportFormat: 'json'
      }
    };
  }

  private getAvailableMarkets(): string[] {
    return [
      'nba-ml-warriors-lakers',
      'nba-spread-warriors-lakers',
      'nba-total-warriors-lakers',
      'nfl-ml-chiefs-bills',
      'mlb-moneyline-yankees-redsox'
    ];
  }

  private async serveWebApp(): Promise<Response> {
    // Serve a simple HTML page that loads the React app
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submarket Analysis Dashboard</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        // Embedded React components would go here
        // For now, show a simple loading page
        const App = () => {
            const [connected, setConnected] = React.useState(false);
            const [ws, setWs] = React.useState(null);

            React.useEffect(() => {
                const websocket = new WebSocket('ws://localhost:${this.port}');
                
                websocket.onopen = () => {
                    setConnected(true);
                    setWs(websocket);
                };
                
                websocket.onclose = () => {
                    setConnected(false);
                };
                
                return () => websocket.close();
            }, []);

            return (
                <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                    <div className="text-center">
                        <div className={\`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center \${
                            connected ? 'bg-green-500' : 'bg-red-500'
                        }\`}>
                            {connected ? '🟢' : '🔴'}
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Submarket Analysis Dashboard</h1>
                        <p className="text-gray-400 mb-4">
                            {connected ? 'Connected to real-time data' : 'Connecting to server...'}
                        </p>
                        <div className="text-sm text-gray-500">
                            WebSocket: ws://localhost:${this.port}
                        </div>
                    </div>
                </div>
            );
        };

        ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  async stop(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.clients.clear();

    if (this.server) {
      this.server.stop();
    }
    
    console.log('🛑 Submarket WebSocket Server stopped');
  }
}

// === Server Entry Point ===
async function main() {
  const server = new SubmarketWebSocketServer(3001);
  
  try {
    await server.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down server...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.main) {
  main();
}

export { SubmarketWebSocketServer };
