import React, { useState, useEffect } from 'react';
import { SubmarketDashboard } from './components/SubmarketDashboard';
import { SubmarketNodes, ArbitragePath } from '../../.root/governance/integrations/types/submarket-schema';

// === WebSocket Integration with Bun ===
interface WebSocketData {
  type: 'submarket-update' | 'arbitrage-paths' | 'metrics' | 'error';
  data: any;
  timestamp: number;
}

class SubmarketWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use Bun's native WebSocket with custom headers
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('🔌 Connected to Submarket WebSocket');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketData = JSON.parse(event.data);
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
              handler(message.data);
            }
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket connection closed');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  subscribe(eventType: string, handler: (data: any) => void): void {
    this.messageHandlers.set(eventType, handler);
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// === Main Web App Component ===
export const SubmarketWebApp: React.FC = () => {
  const [submarketNodes, setSubmarketNodes] = useState<SubmarketNodes | null>(null);
  const [arbitragePaths, setArbitragePaths] = useState<ArbitragePath[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string>('nba-ml-warriors-lakers');
  const [realTimeMode, setRealTimeMode] = useState(true);
  const [wsClient] = useState(() => new SubmarketWebSocketClient('ws://localhost:3001'));

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        await wsClient.connect();
        setIsConnected(true);

        // Subscribe to real-time updates
        wsClient.subscribe('submarket-update', (data) => {
          setSubmarketNodes(data);
        });

        wsClient.subscribe('arbitrage-paths', (data) => {
          setArbitragePaths(data);
        });

        // Request initial data
        wsClient.send({
          type: 'get-submarket-data',
          marketId: selectedMarket
        });

      } catch (error) {
        console.error('❌ Failed to connect to WebSocket:', error);
        setIsConnected(false);
        // Fallback to mock data
        loadMockData();
      }
    };

    initializeConnection();

    return () => {
      wsClient.disconnect();
    };
  }, [wsClient, selectedMarket]);

  // Load mock data as fallback
  const loadMockData = () => {
    const mockData: SubmarketNodes = {
      primaryMarket: {
        nodeId: selectedMarket,
        marketDepth: 150000,
        liquidityScore: 85,
        competitionLevel: 65,
        efficiency: 78
      },
      secondaryMarkets: [
        {
          nodeId: `${selectedMarket}-spread`,
          marketDepth: 120000,
          liquidityScore: 75,
          correlationStrength: 0.85
        },
        {
          nodeId: `${selectedMarket}-total`,
          marketDepth: 90000,
          liquidityScore: 70,
          correlationStrength: 0.72
        }
      ],
      crossMarketEdges: {
        totalEdges: 8,
        strongestCorrelation: 0.85,
        arbitragePaths: ['direct-1', 'triangle-1', 'multi-hop-1']
      }
    };

    const mockPaths: ArbitragePath[] = [
      {
        pathId: 'direct-1',
        pathType: 'direct',
        estimatedProfit: 0.025,
        executionComplexity: 2,
        riskScore: 12,
        liquidityRequirement: 5000,
        timeToExecution: 'seconds'
      },
      {
        pathId: 'triangle-1',
        pathType: 'multi-hop',
        estimatedProfit: 0.032,
        executionComplexity: 6,
        riskScore: 18,
        liquidityRequirement: 8000,
        timeToExecution: 'minutes'
      },
      {
        pathId: 'multi-hop-1',
        pathType: 'multi-hop',
        estimatedProfit: 0.018,
        executionComplexity: 8,
        riskScore: 24,
        liquidityRequirement: 12000,
        timeToExecution: 'minutes'
      }
    ];

    setSubmarketNodes(mockData);
    setArbitragePaths(mockPaths);
  };

  // Handle market selection
  const handleMarketChange = (marketId: string) => {
    setSelectedMarket(marketId);
    if (isConnected && wsClient) {
      wsClient.send({
        type: 'get-submarket-data',
        marketId
      });
    } else {
      loadMockData();
    }
  };

  // Toggle real-time mode
  const toggleRealTimeMode = () => {
    setRealTimeMode(!realTimeMode);
    if (wsClient) {
      wsClient.send({
        type: 'set-real-time-mode',
        enabled: !realTimeMode
      });
    }
  };

  if (!submarketNodes) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Submarket Analysis</h2>
          <p className="text-gray-400">
            {isConnected ? 'Fetching real-time data...' : 'Initializing connection...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Control Bar */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold">Submarket Analysis Platform</h1>
            
            {/* Market Selector */}
            <select
              value={selectedMarket}
              onChange={(e) => handleMarketChange(e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="nba-ml-warriors-lakers">NBA ML - Warriors vs Lakers</option>
              <option value="nba-spread-warriors-lakers">NBA Spread - Warriors vs Lakers</option>
              <option value="nba-total-warriors-lakers">NBA Total - Warriors vs Lakers</option>
              <option value="nfl-ml-chiefs-bills">NFL ML - Chiefs vs Bills</option>
              <option value="mlb-moneyline-yankees-redsox">MLB ML - Yankees vs Red Sox</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Real-time Toggle */}
            <button
              onClick={toggleRealTimeMode}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                realTimeMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {realTimeMode ? '🔴 Live' : '⏸️ Paused'}
            </button>

            {/* Actions */}
            <button
              onClick={() => window.open('/api/export', '_blank')}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors"
            >
              📊 Export Data
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <SubmarketDashboard
        submarketNodes={submarketNodes}
        arbitragePaths={arbitragePaths}
        realTimeUpdates={realTimeMode}
      />
    </div>
  );
};

export default SubmarketWebApp;
