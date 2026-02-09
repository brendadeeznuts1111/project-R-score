#!/usr/bin/env bun
/**
 * Enhanced Dev Dashboard - Comprehensive Tests, Benchmarks & Reports
 *
 * Uses Bun's native APIs:
 * - Bun.TOML.parse() for configuration
 * - Bun.nanoseconds() for high-precision timing
 * - Bun.spawn() available for isolated subprocess execution
 *
 * See: https://bun.com/docs/runtime/bun-apis
 */

import { join } from 'path';
import { profileEngine, logger } from '../../user-profile/src/index.ts';
import type { RouteContext } from './api/routes.ts';
import { handleRoutes } from './api/routes.ts';
import { wsManager } from './websocket/manager.ts';
import { runWebSocketBenchmarks as runWSBenchmarks } from './websocket/benchmark.ts';
import { P2PGatewayBenchmark } from './p2p-gateway-benchmark.ts';
import { getHistoryDatabase } from './db/history.ts';
import {
  loadConfigs,
  initializeSystems,
  getQuickWins,
  checkAndAlert,
  createPageHtmlLoader,
  type DashboardSystems,
} from './core/init.ts';
import { createDataCache, getData } from './core/data.ts';
import type { P2PGatewayResult, WebSocketBenchmarkResult, P2PGateway, P2POperation } from './types.ts';

// Load configs
const configs = await loadConfigs(import.meta.url);
const { dashboard: dashboardConfig, quickWins: quickWinsConfig, benchmarks: benchmarksConfig } = configs;

// Extract config values
const serverConfig = dashboardConfig;
const refreshInterval = serverConfig.server?.auto_refresh_interval || 5;
const CACHE_TTL = parseInt(process.env.DASHBOARD_CACHE_TTL || '30000');

// Initialize data directory
const dataDir = join(import.meta.dir, '..', 'data');

// Initialize all systems
const systems = await initializeSystems(configs, dataDir);

// Create data cache
const dataCache = createDataCache(CACHE_TTL);

// Create page HTML loader
const getPageHtml = await createPageHtmlLoader(import.meta.url, refreshInterval);

// WebSocket Benchmarks
async function runWebSocketBenchmarks(): Promise<WebSocketBenchmarkResult[]> {
  if (serverConfig.features?.websocket_benchmarks === false) {
    return [];
  }

  try {
    const wsUrl = serverConfig.server?.websocket_url
      || process.env.WEBSOCKET_BENCHMARK_URL
      || `ws://${serverConfig.server?.hostname || 'localhost'}:${serverConfig.server?.port || 3008}/ws`;

    logger.info(`Running WebSocket benchmarks against: ${wsUrl}`);
    return await runWSBenchmarks(wsUrl);
  } catch (error) {
    logger.warn(`WebSocket benchmarks failed: ${error}`);
    return [{
      name: 'WebSocket Benchmarks',
      time: 0,
      target: 0,
      status: 'fail',
      note: `Error: ${error instanceof Error ? error.message : String(error)}`,
      category: 'websocket',
    }];
  }
}

// P2P Gateway Benchmarks
async function runP2PBenchmarks(): Promise<P2PGatewayResult[]> {
  const p2pConfig = dashboardConfig.p2p;

  if (!p2pConfig?.enabled) {
    return [];
  }

  try {
    const gateways = (p2pConfig.gateways || ['venmo', 'cashapp', 'paypal']) as P2PGateway[];
    const benchmarkConfig = p2pConfig.benchmarks || {};
    const historyDb = getHistoryDatabase();

    const benchmark = new P2PGatewayBenchmark({
      gateways,
      operations: (benchmarkConfig.operations || ['create', 'query', 'switch', 'dry-run', 'full']) as P2POperation[],
      iterations: benchmarkConfig.iterations || 100,
      includeDryRun: benchmarkConfig.include_dry_run !== false,
      includeFull: benchmarkConfig.include_full !== false,
      transactionAmounts: benchmarkConfig.transaction_amounts || [10.00, 100.00, 1000.00],
      currencies: benchmarkConfig.currencies || ['USD'],
    }, historyDb);

    await benchmark.runAllBenchmarks();
    const dashboardResults = benchmark.toDashboardResults();

    logger.info(`P2P benchmarks completed: ${dashboardResults.length} operations`);
    return dashboardResults;
  } catch (error) {
    logger.error(`P2P benchmarks failed: ${error}`);
    return [];
  }
}

// Create data dependencies
const dataDeps = {
  dashboardConfig,
  benchmarksConfig,
  quickWinsConfig,
  serverConfig,
  profileEngine,
  getQuickWins: () => getQuickWins(quickWinsConfig),
  runP2PBenchmarks,
  runWebSocketBenchmarks,
};

// Wrapper for getData
async function getDataWrapper(useCache = true) {
  return getData(dataDeps, dataCache, useCache);
}

// Wrapper for checkAndAlert
async function checkAndAlertWrapper(data: any) {
  return checkAndAlert(data, systems.alertConfig);
}

// Start server
const server = Bun.serve({
  port: serverConfig.server?.port || 3008,
  hostname: serverConfig.server?.hostname || '0.0.0.0',
  development: {
    hmr: process.env.NODE_ENV !== 'production',
    watch: process.env.NODE_ENV !== 'production',
  },
  /**
   * WebSocket configuration with Bun security fixes applied
   * - perMessageDeflate: true (with 128MB decompression limit protection)
   * - Prevents decompression bomb DoS attacks
   * @see BUN-SECURITY-FIXES-INTEGRATION.md
   */
  websocket: {
    data: {} as import('./websocket/manager.ts').WebSocketData,
    message: (ws, message) => wsManager.handleMessage(ws, message),
    open: (ws) => wsManager.handleOpen(ws),
    close: (ws, code, message) => wsManager.handleClose(ws, code, message),
    error: (ws, error) => wsManager.handleError(ws, error),
    drain: (ws) => {
      logger.debug('WebSocket drain event - ready for more data');
    },
    // Bun Security Fix: 128MB decompression limit prevents DoS attacks
    perMessageDeflate: true,
    idleTimeout: 120,
    maxPayloadLength: 16 * 1024 * 1024,
    backpressureLimit: 1024 * 1024,
    sendPings: true,
  },
  async fetch(req, server) {
    const routeContext: RouteContext = {
      getData: getDataWrapper,
      checkAndAlert: checkAndAlertWrapper,
      getPageHtml,
      dataCache,
      CACHE_TTL,
      fraudEngine: systems.fraudEngine,
      wsClients: wsManager,
      duoplusLoader: systems.duoplusLoader,
      comparisonEngine: systems.comparisonEngine,
      reportExporter: systems.reportExporter,
      deviceAlerts: systems.deviceAlerts,
      abTesting: systems.abTesting,
      socialFeed: systems.socialFeed,
      agentViz: systems.agentViz,
      goldenProfile: systems.goldenProfile,
      paymentGateway: systems.paymentGateway,
      fraudDetection: systems.fraudDetection,
      appleID: systems.appleID,
      agentBehaviorScorer: systems.agentBehaviorScorer,
    };

    return handleRoutes(req, server, routeContext);
  },
});

// Set server instance in WebSocket manager
wsManager.setServer(server);
if (systems.deviceMonitor) {
  wsManager.setDeviceMonitor(systems.deviceMonitor);
}
wsManager.setABTesting(systems.abTesting);
wsManager.setSocialFeed(systems.socialFeed);

// HMR support
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.on('bun:beforeUpdate', () => {
    dataCache.clear();
    logger.info('HMR: Update detected, reloading...');
  });
  import.meta.hot.on('bun:afterUpdate', () => {
    logger.info('HMR: Update complete!');
  });
  import.meta.hot.on('bun:error', () => {
    logger.error('HMR: Error occurred during hot reload');
  });
}

// Startup logging
const port = serverConfig.server?.port || 3008;
const quickWinsSummary = (quickWinsConfig as any).summary;
const benchmarksList = (benchmarksConfig as any).benchmarks || [];
const useIsolation = process.env.BENCHMARK_ISOLATION !== 'false' &&
  (serverConfig.features?.isolated_benchmarks !== false);

const isMainEntry = import.meta.path === Bun.main;
const bunVersion = Bun.version;
const bunRevision = Bun.revision?.slice(0, 8) || 'unknown';
const isProduction = process.env.NODE_ENV === 'production';

logger.info(`Enhanced Dev Dashboard: http://localhost:${port}`);
logger.info(`   Entry: ${isMainEntry ? 'Main script' : 'Imported module'}`);
logger.info(`   Bun: v${bunVersion} (${bunRevision})`);
logger.info(`   Mode: ${isProduction ? 'Production' : 'Development'} ${!isProduction ? '(HMR enabled)' : ''}`);
logger.info(`   Config: TOML-based via Bun.TOML.parse (${quickWinsSummary?.total || 17} quick wins, ${benchmarksList.length} benchmarks)`);
logger.info(`   Isolation: ${useIsolation ? 'Enabled (subprocess mode)' : 'Disabled (in-process mode)'}`);
logger.info(`   Set BENCHMARK_ISOLATION=false to disable isolation mode`);
logger.info(`   Tip: Use 'bun --watch run dev-dashboard' for auto-reload`);
