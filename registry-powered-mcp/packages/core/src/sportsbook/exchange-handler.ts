/**
 * Sportsbook Exchange Handler
 * WebSocket and REST endpoints for dashboard integration
 *
 * Endpoints:
 * - WS  /mcp/exchange              - Real-time odds streaming
 * - GET /mcp/exchange/markets      - List active markets
 * - GET /mcp/exchange/risk/:id     - Get risk assessment for market
 * - GET /mcp/exchange/arb          - Get current arbitrage opportunities
 * - GET /mcp/exchange/metrics      - Get exchange performance metrics
 * - GET /mcp/exchange/health       - Health check
 * - GET /mcp/exchange/buffers      - Buffer inspector statistics
 *
 * Propagation Half-Life API:
 * - GET /mcp/propagation/half-life    - Query half-life metrics
 * - GET /mcp/propagation/patterns     - Query detected patterns
 * - GET /mcp/propagation/heatmap      - Get heatmap data
 * - GET /mcp/propagation/history/:id  - Get market propagation history
 * - GET /mcp/propagation/metrics      - Get aggregate metrics
 *
 * PTY Debug Shell (Bun v1.3.5+):
 * - GET    /mcp/exchange/shell           - Spawn PTY session (SSE stream)
 * - GET    /mcp/exchange/shell/sessions  - List active sessions
 * - GET    /mcp/exchange/shell/stats     - Shell manager stats
 * - GET    /mcp/exchange/shell/:id       - Get session info
 * - POST   /mcp/exchange/shell/:id/input - Send input to session
 * - POST   /mcp/exchange/shell/:id/resize - Resize terminal
 * - GET    /mcp/exchange/shell/:id/buffer - Get output buffer
 * - DELETE /mcp/exchange/shell/:id       - Close session
 *
 * SYSCALL: EXCHANGE_ENDPOINT_HANDLER
 */

// Quiet mode for tests
const QUIET_MODE = process.env.NODE_ENV === 'test' || process.env.LATTICE_QUIET === 'true';
const log = QUIET_MODE ? (() => {}) : console.log.bind(console);

import {
  RiskManagementEngine,
  HighFrequencyOddsFeed,
  createMockOddsFeed,
  DeltaUpdateAggregator,
  loadDeltaConfig,
  TypedArrayInspector,
  CustomUint8Array,
  type EnhancedOddsEntry,
  type RiskAssessment,
  type ArbitrageOpportunity,
  type DeltaAggregatorConfig,
  type DeltaMetrics,
  type RegistryStats,
  SPORTSBOOK_PERFORMANCE_TARGETS,
  MarketStatus,
} from './index';

import {
  createConfiguredTracker,
  type HalfLifeTracker,
  type TrackingResult,
  type DetectedPattern,
  type PropagationHeatmap,
  type HalfLifeMetrics,
  MarketTier,
} from './propagation';

import {
  TerminalDashboard,
  type MarketDisplayData,
  type SelectionDisplayData,
  type BufferMetrics as DashboardBufferMetrics,
  type PerformanceMetrics as DashboardPerformanceMetrics,
} from '../monitoring/terminal-dashboard';

import {
  PTYShellManager,
  createPTYShellHandlers,
  type PTYShellConfig,
} from './pty-shell';

import {
  type DisplayMarket,
  type DisplayRiskAssessment,
  type DisplayArbitrage,
  type DisplayOddsEntry,
  type WsMessage,
  toDisplayOddsEntry,
  toDisplayMarket,
  toDisplayRiskAssessment,
  toDisplayArbitrage,
  createOddsUpdateMessage,
  createRiskAlertMessage,
  createArbitrageMessage,
  createHeartbeatMessage,
  uuidToNumericId,
} from './adapters';

import {
  createPropagationApiHandlers,
  parseHalfLifeQuery,
  parsePatternQuery,
  parseHeatmapQuery,
} from '../api/propagation-api';

import {
  createPatternDetectedMessage,
  createPatternExpiredMessage,
  createHeatmapUpdateMessage,
  createHalfLifeUpdateMessage,
  type PropagationWebSocketMessage,
} from '../api/propagation-websocket';

/**
 * Exchange handler configuration
 */
export interface ExchangeHandlerConfig {
  /** Enable/disable the exchange handler entirely */
  readonly enabled?: boolean;
  /** Enable mock data generation for demo */
  readonly mockMode: boolean;
  /** Mock update interval in ms */
  readonly mockIntervalMs: number;
  /** Number of mock markets */
  readonly mockMarketsCount: number;
  /** Heartbeat interval in ms */
  readonly heartbeatIntervalMs: number;
  /** Enable risk alerts */
  readonly enableRiskAlerts: boolean;
  /** Enable arbitrage alerts */
  readonly enableArbitrageAlerts: boolean;
  /** Enable propagation tracking */
  readonly enablePropagation: boolean;
  /** Broadcast pattern detections */
  readonly enablePatternAlerts: boolean;
  /** Delta aggregator configuration (loaded from env if not provided) */
  readonly deltaConfig?: Partial<DeltaAggregatorConfig>;
  /** PTY debug shell configuration */
  readonly ptyConfig?: Partial<PTYShellConfig>;
}

/**
 * Default configuration
 */
export const DEFAULT_EXCHANGE_CONFIG: ExchangeHandlerConfig = {
  mockMode: true,
  mockIntervalMs: 100,
  mockMarketsCount: 10,
  heartbeatIntervalMs: 5000,
  enableRiskAlerts: true,
  enableArbitrageAlerts: true,
  enablePropagation: true,
  enablePatternAlerts: true,
} as const;

/**
 * WebSocket client tracking
 */
interface WsClient {
  readonly id: string;
  readonly ws: WebSocket;
  readonly subscribedMarkets: Set<string>;
  readonly connectedAt: number;
  /** Whether client has opted-in to delta updates */
  deltaEnabled: boolean;
}

/**
 * Exchange Handler
 * Manages WebSocket connections and REST API for sportsbook dashboard
 */
export class ExchangeHandler {
  private readonly config: ExchangeHandlerConfig;
  private readonly riskEngine: RiskManagementEngine;
  private readonly deltaAggregator: DeltaUpdateAggregator;
  private readonly bufferInspector: TypedArrayInspector;
  private readonly ptyShellManager: PTYShellManager;
  private readonly ptyShellHandlers: ReturnType<typeof createPTYShellHandlers>;
  private readonly propagationTracker: HalfLifeTracker;
  private readonly propagationApiHandlers: ReturnType<typeof createPropagationApiHandlers>;
  private readonly clients: Map<string, WsClient> = new Map();
  private readonly marketCache: Map<string, DisplayMarket> = new Map();
  private readonly arbitrageCache: Map<string, DisplayArbitrage> = new Map();

  private mockFeed: ReturnType<typeof createMockOddsFeed> | null = null;
  private mockUpdateTimer: Timer | null = null;
  private heartbeatTimer: Timer | null = null;
  private isRunning = false;
  private dashboard: TerminalDashboard | null = null;
  private dashboardUpdateTimer: Timer | null = null;

  // Metrics
  private messagesSent = 0;
  private updateCount = 0;
  private startTime = 0;
  private deltaClientCount = 0;

  constructor(config: Partial<ExchangeHandlerConfig> = {}) {
    this.config = { ...DEFAULT_EXCHANGE_CONFIG, ...config };
    this.riskEngine = new RiskManagementEngine({
      enableThreatIntel: true,
    });

    // Initialize delta aggregator from env config or provided config
    const deltaConfig = config.deltaConfig
      ? { ...loadDeltaConfig(), ...config.deltaConfig }
      : loadDeltaConfig();
    this.deltaAggregator = new DeltaUpdateAggregator(deltaConfig);

    // Initialize buffer inspector for monitoring wire protocol allocations
    this.bufferInspector = TypedArrayInspector.getInstance({
      enableEvents: true,
      leakThresholdMs: 30000, // 30 seconds for exchange buffers
      autoCleanupIntervalMs: 10000, // 10 second cleanup cycle
    });

    // Initialize PTY shell manager for debug access
    this.ptyShellManager = new PTYShellManager(config.ptyConfig);
    this.ptyShellHandlers = createPTYShellHandlers(this.ptyShellManager);

    // Initialize propagation tracker with all pattern detectors
    this.propagationTracker = createConfiguredTracker({
      enablePatternDetection: this.config.enablePropagation,
    });
    this.propagationApiHandlers = createPropagationApiHandlers(this.propagationTracker);

    // Set up threat callback for risk alerts
    if (this.config.enableRiskAlerts) {
      this.riskEngine.setThreatCallback((threat, data) => {
        this.broadcastRiskAlert(threat, data);
      });
    }
  }

  /**
   * Start the exchange handler
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();

    // Start mock feed if in mock mode
    if (this.config.mockMode) {
      this.mockFeed = createMockOddsFeed(
        this.config.mockIntervalMs,
        this.config.mockMarketsCount
      );

      // Create our own update timer that calls handleOddsUpdate
      // Note: We can't use mockFeed.start() because its internal timer
      // was created with a reference to the original generateUpdate function,
      // so wrapping the method after creation doesn't work.
      const riskEngine = this.riskEngine;
      const self = this;
      const generateUpdate = this.mockFeed.generateUpdate;

      this.mockUpdateTimer = setInterval(() => {
        const entry = generateUpdate();
        const assessment = riskEngine.processOddsUpdate(entry);
        self.handleOddsUpdate(entry, assessment);
      }, this.config.mockIntervalMs);
    }

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.broadcastHeartbeat();
    }, this.config.heartbeatIntervalMs);

    // Start dashboard updates if attached
    if (this.dashboard) {
      this.startDashboardUpdates();
    }

    log('🎰 Exchange handler started');
    if (this.deltaAggregator.isEnabled()) {
      log(`📊 Delta-Aggregator: ${this.deltaAggregator.getFeatureMode()} mode`);
    }
    if (this.config.enablePropagation) {
      log('📈 Propagation Half-Life Tracker: ACTIVE');
    }
  }

  /**
   * Stop the exchange handler
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.mockUpdateTimer) {
      clearInterval(this.mockUpdateTimer);
      this.mockUpdateTimer = null;
    }

    if (this.mockFeed) {
      this.mockFeed = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Stop dashboard updates
    if (this.dashboardUpdateTimer) {
      clearInterval(this.dashboardUpdateTimer);
      this.dashboardUpdateTimer = null;
    }

    // Close all WebSocket connections
    const clientArray = Array.from(this.clients.values());
    for (let i = 0; i < clientArray.length; i++) {
      clientArray[i].ws.close(1000, 'Exchange shutting down');
    }
    this.clients.clear();

    // Shutdown PTY shell manager
    this.ptyShellManager.shutdown();

    log('🎰 Exchange handler stopped');
  }

  /**
   * Handle WebSocket upgrade
   */
  handleWebSocketUpgrade(req: Request, server: any): Response | undefined {
    const clientId = crypto.randomUUID();

    const upgraded = server.upgrade(req, {
      data: { clientId },
    });

    if (upgraded) {
      return undefined; // Upgrade successful
    }

    return new Response('WebSocket upgrade failed', { status: 400 });
  }

  /**
   * Handle WebSocket open
   */
  handleWebSocketOpen(ws: WebSocket, clientId: string, deltaEnabled = false): void {
    const client: WsClient = {
      id: clientId,
      ws,
      subscribedMarkets: new Set(),
      connectedAt: Date.now(),
      deltaEnabled,
    };

    this.clients.set(clientId, client);
    if (deltaEnabled) {
      this.deltaClientCount++;
    }

    // Send initial state
    this.sendToClient(client, createHeartbeatMessage({
      throughput: this.getMetrics().throughput,
      p99Latency: this.getMetrics().p99LatencyMs,
      activeMarkets: this.marketCache.size,
    }));

    log(`📡 Client connected: ${clientId} (total: ${this.clients.size})`);
  }

  /**
   * Handle WebSocket message
   */
  handleWebSocketMessage(ws: WebSocket, clientId: string, message: string | Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'SUBSCRIBE':
          if (data.marketId) {
            client.subscribedMarkets.add(data.marketId);
          }
          break;

        case 'UNSUBSCRIBE':
          if (data.marketId) {
            client.subscribedMarkets.delete(data.marketId);
          }
          break;

        case 'GET_MARKETS':
          this.sendToClient(client, {
            type: 'MARKETS',
            timestamp: Date.now(),
            sequence: 0,
            payload: Array.from(this.marketCache.values()),
          });
          break;

        case 'GET_ARBITRAGE':
          this.sendToClient(client, {
            type: 'ARBITRAGE_LIST',
            timestamp: Date.now(),
            sequence: 0,
            payload: Array.from(this.arbitrageCache.values()),
          });
          break;

        case 'ENABLE_DELTA':
          if (!client.deltaEnabled && this.deltaAggregator.isEnabled()) {
            client.deltaEnabled = true;
            this.deltaClientCount++;
            this.sendToClient(client, {
              type: 'DELTA_ENABLED',
              timestamp: Date.now(),
              sequence: 0,
              payload: { mode: this.deltaAggregator.getFeatureMode() },
            });
          }
          break;

        case 'DISABLE_DELTA':
          if (client.deltaEnabled) {
            client.deltaEnabled = false;
            this.deltaClientCount--;
            this.sendToClient(client, {
              type: 'DELTA_DISABLED',
              timestamp: Date.now(),
              sequence: 0,
              payload: null,
            });
          }
          break;
      }
    } catch (e) {
      // Invalid message, ignore
    }
  }

  /**
   * Handle WebSocket close
   */
  handleWebSocketClose(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client?.deltaEnabled) {
      this.deltaClientCount--;
    }
    this.clients.delete(clientId);
    log(`📡 Client disconnected: ${clientId} (total: ${this.clients.size})`);
  }

  /**
   * Handle REST request
   */
  async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Delegate to PTY shell handlers first
    const ptyResponse = await this.ptyShellHandlers.handleRequest(req);
    if (ptyResponse) {
      return ptyResponse;
    }

    try {
      // GET /mcp/exchange/markets
      if (path === '/mcp/exchange/markets' && req.method === 'GET') {
        const markets = Array.from(this.marketCache.values());
        return Response.json({ success: true, data: markets, count: markets.length }, { headers });
      }

      // GET /mcp/exchange/risk/:marketId
      if (path.startsWith('/mcp/exchange/risk/') && req.method === 'GET') {
        const marketId = path.split('/').pop()!;
        const market = this.riskEngine.getMarket(marketId);

        if (!market) {
          return Response.json({ success: false, error: 'Market not found' }, { status: 404, headers });
        }

        const arbitrage = this.riskEngine.detectArbitrage(marketId);
        const assessment = this.createAssessmentForMarket(marketId, arbitrage);

        return Response.json({
          success: true,
          data: toDisplayRiskAssessment(assessment, arbitrage ? 1 : 0),
        }, { headers });
      }

      // GET /mcp/exchange/arb
      if (path === '/mcp/exchange/arb' && req.method === 'GET') {
        const opportunities = Array.from(this.arbitrageCache.values());
        return Response.json({
          success: true,
          data: opportunities,
          count: opportunities.length,
        }, { headers });
      }

      // GET /mcp/exchange/metrics
      if (path === '/mcp/exchange/metrics' && req.method === 'GET') {
        return Response.json({
          success: true,
          data: this.getMetrics(),
        }, { headers });
      }

      // GET /mcp/exchange/health
      if (path === '/mcp/exchange/health' && req.method === 'GET') {
        return Response.json({
          success: true,
          status: this.isRunning ? 'operational' : 'stopped',
          uptime: this.isRunning ? Date.now() - this.startTime : 0,
          clients: this.clients.size,
          markets: this.marketCache.size,
        }, { headers });
      }

      // GET /mcp/exchange/buffers - Buffer inspector statistics
      if (path === '/mcp/exchange/buffers' && req.method === 'GET') {
        return Response.json({
          success: true,
          data: this.getBufferStats(),
        }, { headers });
      }

      // ========================================================================
      // Propagation API Endpoints
      // ========================================================================

      // GET /mcp/propagation/half-life
      if (path === '/mcp/propagation/half-life' && req.method === 'GET') {
        const query = parseHalfLifeQuery(url.searchParams);
        const result = this.propagationApiHandlers.getHalfLife(query);
        return Response.json(result, { headers });
      }

      // GET /mcp/propagation/patterns
      if (path === '/mcp/propagation/patterns' && req.method === 'GET') {
        const query = parsePatternQuery(url.searchParams);
        const result = this.propagationApiHandlers.getPatterns(query);
        return Response.json(result, { headers });
      }

      // GET /mcp/propagation/heatmap
      if (path === '/mcp/propagation/heatmap' && req.method === 'GET') {
        const query = parseHeatmapQuery(url.searchParams);
        const result = this.propagationApiHandlers.getHeatmap(query);
        return Response.json(result, { headers });
      }

      // GET /mcp/propagation/history/:marketId
      if (path.startsWith('/mcp/propagation/history/') && req.method === 'GET') {
        const marketId = path.split('/').pop()!;
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);
        const result = this.propagationApiHandlers.getHistory(marketId, limit);
        return Response.json(result, { headers });
      }

      // GET /mcp/propagation/metrics
      if (path === '/mcp/propagation/metrics' && req.method === 'GET') {
        const result = this.propagationApiHandlers.getMetrics();
        return Response.json(result, { headers });
      }

      return Response.json({ success: false, error: 'Not found' }, { status: 404, headers });
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      }, { status: 500, headers });
    }
  }

  /**
   * Get exchange metrics
   */
  getMetrics(): {
    throughput: number;
    p99LatencyMs: number;
    clients: number;
    markets: number;
    arbitrageOpportunities: number;
    messagesSent: number;
    uptime: number;
    riskEngineMetrics: ReturnType<RiskManagementEngine['getMetrics']>;
    delta: {
      enabled: boolean;
      mode: string;
      deltaClients: number;
      metrics: DeltaMetrics;
    };
    propagation: {
      enabled: boolean;
      trackedMarkets: number;
      trackedBookmakers: number;
      activePatterns: number;
      avgProcessingTimeUs: number;
      memoryBytes: number;
    };
    buffers: {
      activeCount: number;
      totalAllocatedBytes: number;
      potentialLeaks: number;
    };
    ptyShell: ReturnType<PTYShellManager['getStats']>;
  } {
    const uptime = this.isRunning ? (Date.now() - this.startTime) / 1000 : 0;
    const throughput = uptime > 0 ? Math.floor(this.updateCount / uptime) : 0;
    const bufferStats = this.bufferInspector.getStats();
    const propagationStats = this.propagationTracker.getStats();

    return {
      throughput,
      p99LatencyMs: this.riskEngine.getMetrics().lastProcessingMs,
      clients: this.clients.size,
      markets: this.marketCache.size,
      arbitrageOpportunities: this.arbitrageCache.size,
      messagesSent: this.messagesSent,
      uptime: Math.floor(uptime),
      riskEngineMetrics: this.riskEngine.getMetrics(),
      delta: {
        enabled: this.deltaAggregator.isEnabled(),
        mode: this.deltaAggregator.getFeatureMode(),
        deltaClients: this.deltaClientCount,
        metrics: this.deltaAggregator.getMetrics(),
      },
      propagation: {
        enabled: this.config.enablePropagation,
        trackedMarkets: propagationStats.trackedMarkets,
        trackedBookmakers: propagationStats.trackedBookmakers,
        activePatterns: propagationStats.activePatterns,
        avgProcessingTimeUs: propagationStats.avgProcessingTimeUs,
        memoryBytes: propagationStats.memoryBytes,
      },
      buffers: {
        activeCount: bufferStats.activeCount,
        totalAllocatedBytes: bufferStats.totalAllocatedBytes,
        potentialLeaks: bufferStats.potentialLeaks.length,
      },
      ptyShell: this.ptyShellManager.getStats(),
    };
  }

  /**
   * Get detailed buffer statistics from TypedArrayInspector
   */
  getBufferStats(): {
    stats: RegistryStats;
    memoryProfile: ReturnType<TypedArrayInspector['getMemoryProfile']>;
    formatted: string;
  } {
    const stats = this.bufferInspector.getStats();
    const memoryProfile = this.bufferInspector.getMemoryProfile();
    const formatted = this.bufferInspector.formatStats();

    return {
      stats,
      memoryProfile,
      formatted,
    };
  }

  /**
   * Attach a terminal dashboard for live monitoring
   * Dashboard will be updated with market data, buffer metrics, and performance metrics
   */
  attachDashboard(dashboard: TerminalDashboard): void {
    this.dashboard = dashboard;

    // Start dashboard update timer (100ms refresh)
    if (!this.dashboardUpdateTimer && this.isRunning) {
      this.startDashboardUpdates();
    }

    log('📊 Terminal dashboard attached');
  }

  /**
   * Detach the terminal dashboard
   */
  detachDashboard(): void {
    if (this.dashboardUpdateTimer) {
      clearInterval(this.dashboardUpdateTimer);
      this.dashboardUpdateTimer = null;
    }
    this.dashboard = null;

    log('📊 Terminal dashboard detached');
  }

  /**
   * Check if a dashboard is attached
   */
  hasDashboard(): boolean {
    return this.dashboard !== null;
  }

  /**
   * Get the attached dashboard (for testing)
   */
  getDashboard(): TerminalDashboard | null {
    return this.dashboard;
  }

  /**
   * Get the propagation tracker (for testing and external access)
   */
  getPropagationTracker(): HalfLifeTracker {
    return this.propagationTracker;
  }

  /**
   * Get propagation heatmap data
   */
  getPropagationHeatmap(): PropagationHeatmap {
    return this.propagationTracker.getHeatmap();
  }

  /**
   * Get active pattern detections
   */
  getActivePatterns(): DetectedPattern[] {
    return this.propagationTracker.getActivePatterns();
  }

  /**
   * Start dashboard update timer
   */
  private startDashboardUpdates(): void {
    if (this.dashboardUpdateTimer) return;

    this.dashboardUpdateTimer = setInterval(() => {
      this.updateDashboard();
    }, 100); // 100ms refresh rate
  }

  /**
   * Update the attached dashboard with current state
   */
  private updateDashboard(): void {
    if (!this.dashboard) return;

    // Convert market cache to dashboard format
    const markets = this.convertMarketsForDashboard();
    this.dashboard.updateMarkets(markets);

    // Update buffer metrics
    const bufferStats = this.bufferInspector.getStats();
    this.dashboard.updateBufferMetrics({
      activeCount: bufferStats.activeCount,
      totalAllocatedBytes: bufferStats.totalAllocatedBytes,
      potentialLeaks: bufferStats.potentialLeaks.length,
      byType: bufferStats.byType,
    });

    // Update performance metrics
    const metrics = this.getMetrics();
    this.dashboard.updatePerformanceMetrics({
      throughput: metrics.throughput,
      p99LatencyMs: metrics.p99LatencyMs,
      messagesSent: metrics.messagesSent,
      uptime: metrics.uptime,
      clients: metrics.clients,
    });
  }

  /**
   * Convert market cache to dashboard display format
   */
  private convertMarketsForDashboard(): MarketDisplayData[] {
    const markets: MarketDisplayData[] = [];

    // Get all markets from risk engine
    const marketKeys = Array.from(this.marketCache.keys());
    for (let i = 0; i < marketKeys.length; i++) {
      const marketId = marketKeys[i];
      const riskMarket = this.riskEngine.getMarket(marketId);
      if (!riskMarket) continue;

      const selections: SelectionDisplayData[] = riskMarket.selections.map(sel => {
        // Calculate total volume from all sources
        const totalVolume = sel.odds.reduce((sum, o) => sum + o.volume, 0);

        // Get previous odds - use the odds before the latest if available
        const previousOdds = sel.odds.length > 1
          ? sel.odds[sel.odds.length - 2]?.odds
          : undefined;

        return {
          selectionId: sel.selectionId,
          name: sel.name,
          odds: sel.bestBack,
          previousOdds,
          volume: totalVolume,
        };
      });

      markets.push({
        marketId: riskMarket.eventId,
        name: riskMarket.marketType,
        status: 'ACTIVE' as const, // Market status not stored in AggregatedMarket
        selections,
        url: `https://exchange.example.com/market/${marketId}`,
      });
    }

    return markets;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private handleOddsUpdate(entry: EnhancedOddsEntry, assessment: RiskAssessment): void {
    this.updateCount++;

    // Track propagation if enabled
    let propagationResult: TrackingResult | null = null;
    if (this.config.enablePropagation) {
      propagationResult = this.propagationTracker.trackUpdate(entry);

      // Broadcast new pattern detections
      if (this.config.enablePatternAlerts && propagationResult.newPatterns.length > 0) {
        for (const pattern of propagationResult.newPatterns) {
          this.broadcastPropagationMessage(createPatternDetectedMessage(pattern));
        }
      }

      // Broadcast expired patterns
      if (this.config.enablePatternAlerts && propagationResult.expiredPatterns.length > 0) {
        for (const expired of propagationResult.expiredPatterns) {
          this.broadcastPropagationMessage(createPatternExpiredMessage(
            expired.patternId,
            [],
            expired.reason as 'timeout' | 'resolved' | 'invalidated'
          ));
        }
      }

      // Broadcast half-life metric updates for significant changes
      const metricsArray = Array.from(propagationResult.metricsUpdates.entries());
      for (let i = 0; i < metricsArray.length; i++) {
        const [tier, metrics] = metricsArray[i];
        if (metrics.sampleCount > 0 && metrics.sampleCount % 10 === 0) {
          // Broadcast every 10th update to avoid flooding
          this.broadcastPropagationMessage(createHalfLifeUpdateMessage(tier, entry.bookmaker, metrics, null));
        }
      }
    }

    // Check for arbitrage
    const arbitrage = this.riskEngine.detectArbitrage(entry.marketId);
    if (arbitrage && this.config.enableArbitrageAlerts) {
      const displayArb = toDisplayArbitrage(arbitrage);
      this.arbitrageCache.set(arbitrage.id, displayArb);
      this.broadcast(createArbitrageMessage(displayArb));

      // Clean old arbitrage opportunities
      const now = Math.floor(Date.now() / 1000);
      const arbEntries = Array.from(this.arbitrageCache.entries());
      for (let i = 0; i < arbEntries.length; i++) {
        const [id, arb] = arbEntries[i];
        if (arb.expiresIn <= 0) {
          this.arbitrageCache.delete(id);
        }
      }
    }

    // Update market cache for dashboard
    const riskMarket = this.riskEngine.getMarket(entry.marketId);
    if (riskMarket) {
      const displayMarket = toDisplayMarket(riskMarket, null, arbitrage);
      this.marketCache.set(entry.marketId, displayMarket);
    }

    // Convert to display format
    const displayEntry = toDisplayOddsEntry(
      entry,
      assessment.smartMoneyDetected ? 150 : Math.floor(Math.random() * 100),
      arbitrage !== null
    );

    // Compute delta if enabled
    let deltaResult = null;
    if (this.deltaAggregator.isEnabled()) {
      // Serialize display entry to binary buffer for delta computation
      const buffer = this.serializeOddsEntry(displayEntry);
      deltaResult = this.deltaAggregator.computeDelta(buffer);
    }

    // Broadcast to subscribed clients
    const message = createOddsUpdateMessage([displayEntry]);
    this.broadcastToSubscribers(entry.marketId, message, deltaResult);
  }

  /**
   * Serialize odds entry to binary buffer for delta computation
   * Format: [marketId:u32][selectionId:u32][odds:f64][volume:u32][isArbitrage:u8]
   * Uses CustomUint8Array for lifecycle tracking via TypedArrayInspector
   */
  private serializeOddsEntry(entry: DisplayOddsEntry): ArrayBuffer {
    // Create tracked buffer for wire protocol monitoring
    const buffer = this.bufferInspector.createTracked(
      CustomUint8Array,
      32,
      `odds-entry-${entry.marketId}-${entry.selectionId}`
    );
    const view = new DataView(buffer.buffer);

    view.setUint32(0, entry.marketId, true);
    view.setUint32(4, entry.selectionId, true);
    view.setFloat64(8, entry.odds, true);
    view.setUint32(16, entry.volume, true);
    view.setUint8(20, entry.isArbitrage ? 1 : 0);
    view.setFloat64(24, entry.movement, true);

    return buffer.buffer;
  }

  private broadcastRiskAlert(threat: string, data: unknown): void {
    // Create risk assessment from threat data
    const assessment: DisplayRiskAssessment = {
      marketId: 0,
      riskScore: 0.8,
      riskLevel: 'HIGH',
      factors: [{
        type: threat,
        severity: 'HIGH',
        description: `Threat detected: ${threat}`,
      }],
      recommendation: 'REVIEW',
      arbitrageOpportunities: 0,
      smartMoneyDetected: threat === 'SMART_MONEY_DETECTED',
      maxExposure: 0,
      timestamp: Date.now(),
    };

    this.broadcast(createRiskAlertMessage(assessment));
  }

  private broadcastHeartbeat(): void {
    const message = createHeartbeatMessage({
      throughput: this.getMetrics().throughput,
      p99Latency: this.getMetrics().p99LatencyMs,
      activeMarkets: this.marketCache.size,
    });

    this.broadcast(message);
  }

  private broadcast<T>(message: WsMessage<T>): void {
    const payload = JSON.stringify(message);

    const clientArray = Array.from(this.clients.values());
    for (let i = 0; i < clientArray.length; i++) {
      const client = clientArray[i];
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(payload);
          this.messagesSent++;
        }
      } catch (e) {
        // Client disconnected, will be cleaned up
      }
    }
  }

  /**
   * Broadcast propagation-specific messages (patterns, heatmaps, half-life updates)
   * Uses separate type to avoid WsMessage type constraints
   */
  private broadcastPropagationMessage<T>(message: PropagationWebSocketMessage<T>): void {
    const payload = JSON.stringify(message);

    const clientArray = Array.from(this.clients.values());
    for (let i = 0; i < clientArray.length; i++) {
      const client = clientArray[i];
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(payload);
          this.messagesSent++;
        }
      } catch (e) {
        // Client disconnected, will be cleaned up
      }
    }
  }

  private broadcastToSubscribers<T>(
    marketId: string,
    message: WsMessage<T>,
    deltaResult?: { hasChanges: boolean; serialized: ArrayBuffer | null; compressionRatio: number } | null
  ): void {
    const payload = JSON.stringify(message);
    const mode = this.deltaAggregator.getFeatureMode();
    const deltaEnabled = this.deltaAggregator.isEnabled();

    const clientArray = Array.from(this.clients.values());
    for (let i = 0; i < clientArray.length; i++) {
      const client = clientArray[i];
      if (client.subscribedMarkets.has(marketId) || client.subscribedMarkets.size === 0) {
        try {
          if (client.ws.readyState === WebSocket.OPEN) {
            // Determine what to send based on mode and client preference
            let sendDelta = false;

            if (deltaEnabled && deltaResult?.hasChanges && deltaResult.serialized) {
              if (mode === 'ENFORCE') {
                // Always send delta in ENFORCE mode
                sendDelta = true;
              } else if (mode === 'ROLLBACK' && client.deltaEnabled) {
                // Send delta only to opted-in clients in ROLLBACK mode
                sendDelta = true;
              }
              // SHADOW mode: compute delta (already done) but always send full JSON
            }

            if (sendDelta && deltaResult?.serialized) {
              // Send binary delta patch with type prefix
              const prefix = new TextEncoder().encode('DELTA:');
              const combined = new Uint8Array(prefix.length + deltaResult.serialized.byteLength);
              combined.set(prefix);
              combined.set(new Uint8Array(deltaResult.serialized), prefix.length);
              client.ws.send(combined);
            } else {
              // Send full JSON payload
              client.ws.send(payload);
            }
            this.messagesSent++;
          }
        } catch (e) {
          // Client disconnected
        }
      }
    }
  }

  private sendToClient<T>(client: WsClient, message: WsMessage<T>): void {
    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        this.messagesSent++;
      }
    } catch (e) {
      // Client disconnected
    }
  }

  private createAssessmentForMarket(marketId: string, arbitrage: ArbitrageOpportunity | null): RiskAssessment {
    return {
      marketId,
      riskScore: arbitrage ? 0.6 : 0.2,
      factors: arbitrage ? [{
        type: 'ARBITRAGE_DETECTED',
        severity: 'high',
        description: `${arbitrage.profit.toFixed(2)}% arbitrage opportunity`,
        weight: 0.4,
      }] : [],
      recommendation: arbitrage ? 'review' : 'accept',
      maxExposure: 100000,
      smartMoneyDetected: false,
      arbitrageRisk: arbitrage !== null,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }
}

/**
 * Create Bun.serve WebSocket handlers for exchange
 */
export function createExchangeWebSocketHandlers(handler: ExchangeHandler): {
  open: (ws: WebSocket & { data?: { clientId: string; deltaEnabled: boolean } }) => void;
  message: (ws: WebSocket & { data?: { clientId: string } }, message: string | Buffer) => void;
  close: (ws: WebSocket & { data?: { clientId: string } }) => void;
} {
  return {
    open(ws) {
      const clientId = ws.data?.clientId ?? crypto.randomUUID();
      const deltaEnabled = ws.data?.deltaEnabled ?? false;
      handler.handleWebSocketOpen(ws, clientId, deltaEnabled);
    },

    message(ws, message) {
      const clientId = ws.data?.clientId;
      if (clientId) {
        handler.handleWebSocketMessage(ws, clientId, message);
      }
    },

    close(ws) {
      const clientId = ws.data?.clientId;
      if (clientId) {
        handler.handleWebSocketClose(clientId);
      }
    },
  };
}

/**
 * Parse WebSocket upgrade request for delta opt-in
 * Checks for ?delta=1 query parameter
 */
export function parseWebSocketUpgradeData(req: Request): { clientId: string; deltaEnabled: boolean } {
  const url = new URL(req.url);
  const deltaParam = url.searchParams.get('delta');

  return {
    clientId: crypto.randomUUID(),
    deltaEnabled: deltaParam === '1' || deltaParam === 'true',
  };
}
