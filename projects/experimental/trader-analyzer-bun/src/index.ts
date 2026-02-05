/**
 * @fileoverview Trader Analyzer API Server
 * @description Multi-source trading analytics platform with Bun HMR support
 * @version 1.0.0
 *
 * @example
 * // Start the server with HMR
 * bun --hot run src/index.ts
 *
 * @example
 * // Access the API
 * curl http://localhost:$PORT/api/health
 *
 * @example
 * // View API documentation
 * open http://localhost:$PORT/docs
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import api from './api/routes';
import docs from './api/docs';
import showcase from './api/showcase';
import { box, colors, runtime, timing, formatBytes, table, printTable } from './utils';
import { NexusError, wrapError, ERROR_REGISTRY } from './errors';
import { csrf } from './middleware/csrf';
import { migrateCredentials } from './secrets/migrate';

// ============ WebSocket Server for Dashboard ============
interface DashboardClient {
  id: string;
  connectedAt: number;
  send(data: string): void;
  close(): void;
}

class DashboardWebSocketServer {
  private clients: Map<string, DashboardClient> = new Map();
  private systemStatsInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private port: number = 3004) {}

  start(): void {
    // Start system stats broadcasting
    this.systemStatsInterval = setInterval(async () => {
      await this.broadcastSystemStats();
    }, 5000);

    console.log(`Dashboard WebSocket Server started on port ${this.port}`);
  }

  stop(): void {
    if (this.systemStatsInterval) {
      clearInterval(this.systemStatsInterval);
      this.systemStatsInterval = null;
    }
    this.clients.clear();
  }

  addClient(ws: any): void {
    const client: DashboardClient = {
      id: `dashboard-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      connectedAt: Date.now(),
      send: (data: string) => ws.send(data),
      close: () => ws.close(),
    };

    this.clients.set(client.id, client);

    // Send welcome message
    client.send(JSON.stringify({
      type: 'connected',
      clientId: client.id,
      timestamp: Date.now(),
    }));

    console.log(`Dashboard client connected: ${client.id}`);
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`Dashboard client disconnected: ${clientId}`);
  }

  broadcast(message: any): void {
    const payload = JSON.stringify({
      ...message,
      timestamp: Date.now(),
    });

    for (const client of this.clients.values()) {
      try {
        client.send(payload);
      } catch (error) {
        console.error(`Failed to send to client ${client.id}:`, error);
        this.removeClient(client.id);
      }
    }
  }

  private async broadcastSystemStats(): Promise<void> {
    try {
      // Get memory stats
      const memUsage = process.memoryUsage();

      // Get runtime info
      const runtime = {
        bunVersion: Bun.version,
        platform: process.platform,
        uptime: `${(process.uptime() / 60).toFixed(2)} minutes`,
      };

      this.broadcast({
        type: 'system_stats',
        stats: {
          heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          uptime: runtime.uptime,
        },
      });
    } catch (error) {
      console.error('Failed to broadcast system stats:', error);
    }
  }

  // Forward arbitrage opportunities from alert server
  broadcastArbitrageOpportunity(opportunity: any): void {
    this.broadcast({
      type: 'arbitrage_opportunity',
      opportunity,
    });
  }

  // Forward scan completion from alert server
  broadcastScanComplete(stats: any): void {
    this.broadcast({
      type: 'scan_complete',
      stats,
    });
  }
}

// Global dashboard WebSocket server instance
const dashboardWSS = new DashboardWebSocketServer();

// ============ HMR State Persistence ============
// Preserve state across hot reloads using import.meta.hot.data
interface HMRData {
  server?: ReturnType<typeof Bun.serve>;
  reloadCount: number;
  startedAt: number;
}

// Initialize or restore HMR data
const hmrData: HMRData = import.meta.hot?.data ?? {
  reloadCount: 0,
  startedAt: Date.now(),
};

// Increment reload count on HMR
if (import.meta.hot) {
  hmrData.reloadCount++;
  import.meta.hot.data = hmrData;
}

const app = new Hono();

// ============ Global Error Handler ============
app.onError((err, c) => {
  // Wrap error in NexusError for consistent handling
  const nexusErr = err instanceof NexusError ? err : wrapError(err);

  // Log error with context
  console.error(colors.red(`[${nexusErr.code}] ${c.req.method} ${c.req.path}`));
  console.error(colors.red(`  Status: ${nexusErr.status}`));
  console.error(colors.red(`  Message: ${nexusErr.message}`));
  console.error(colors.gray(`  Ref: ${nexusErr.ref}`));
  if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
    console.error(colors.gray(`  Stack: ${err.stack}`));
  }

  return c.json({
    error: true,
    code: nexusErr.code,
    status: nexusErr.status,
    message: nexusErr.message,
    category: nexusErr.category,
    ref: nexusErr.ref,
    recoverable: nexusErr.recoverable,
    path: c.req.path,
    method: c.req.method,
    timestamp: nexusErr.timestamp,
    ...(nexusErr.details && { details: nexusErr.details }),
    ...(process.env.NODE_ENV !== 'production' && err instanceof Error && {
      stack: err.stack?.split('\n').slice(0, 5),
    }),
  }, nexusErr.status as any);
});

// ============ 404 Handler ============
app.notFound((c) => {
  const err = new NexusError('NX-001', { path: c.req.path });
  console.warn(colors.yellow(`[${err.code}] ${c.req.method} ${c.req.path}`));
  return c.json({
    error: true,
    code: err.code,
    status: err.status,
    message: err.message,
    category: err.category,
    ref: err.ref,
    recoverable: err.recoverable,
    path: c.req.path,
    method: c.req.method,
    timestamp: err.timestamp,
    hint: 'Check /api for available endpoints or /docs for API documentation',
  }, 404);
});

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());

// CSRF protection for API mutations (Bun 1.3)
app.use('/api/*', csrf);

// Mount API routes
app.route('/api', api);

// Mount documentation
app.route('/docs', docs);

// Mount interactive showcase
app.route('/showcase', showcase);

// Mount trading dashboard
app.get('/dashboard', async (c) => {
  try {
    const html = await Bun.file('./dashboard/index.html').text();
    return c.html(html);
  } catch (error) {
    return c.json({ error: 'Dashboard not found' }, 404);
  }
});

// Serve dashboard assets
app.get('/dashboard/manifest.json', async (c) => {
  try {
    const manifest = await Bun.file('./dashboard/manifest.json').text();
    return c.json(JSON.parse(manifest));
  } catch (error) {
    return c.json({ error: 'Manifest not found' }, 404);
  }
});

app.get('/dashboard/sw.js', async (c) => {
  try {
    const sw = await Bun.file('./dashboard/sw.js').text();
    return new Response(sw, {
      headers: { 'Content-Type': 'application/javascript' },
    });
  } catch (error) {
    return c.json({ error: 'Service worker not found' }, 404);
  }
});

// WebSocket endpoint for dashboard
app.get('/ws', (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.json({ error: 'Expected websocket' }, 400);
  }

  const ws = c.req.webSocket;
  if (!ws) {
    return c.json({ error: 'WebSocket upgrade failed' }, 400);
  }

  dashboardWSS.addClient(ws);

  return new Response(null, { status: 101 });
});

// Root route
app.get('/', (c) => {
  return c.json({
    name: 'Trader Analyzer API',
    version: '1.0.0',
    runtime: 'Bun',
    dashboard: '/dashboard',
    showcase: '/showcase',
    documentation: '/docs',
    openapi: '/docs/openapi.json',
    endpoints: {
      // Data Import
      streams: 'GET /api/streams',
      importFile: 'POST /api/streams/file',
      importApi: 'POST /api/streams/api',
      sync: 'POST /api/sync',
      // Analytics
      trades: 'GET /api/trades',
      stats: 'GET /api/stats',
      profile: 'GET /api/profile',
      sessions: 'GET /api/sessions',
      // Prediction Markets
      polymarketMarkets: 'GET /api/polymarket/markets',
      polymarketFetch: 'POST /api/polymarket/fetch',
      kalshiMarkets: 'GET /api/kalshi/markets',
      kalshiFetch: 'POST /api/kalshi/fetch',
      predictionStats: 'GET /api/prediction/stats',
      // Market Making
      mmStats: 'GET /api/mm/stats',
      mmSessions: 'GET /api/mm/sessions',
      // ORCA - Sports Betting Normalization
      orcaNormalize: 'POST /api/orca/normalize',
      orcaBatch: 'POST /api/orca/normalize/batch',
      orcaLookupTeam: 'GET /api/orca/lookup/team',
      orcaBookmakers: 'GET /api/orca/bookmakers',
      orcaSports: 'GET /api/orca/sports',
      orcaMarkets: 'GET /api/orca/markets',
      orcaStats: 'GET /api/orca/stats',
      // ORCA Streaming
      orcaStreamStart: 'POST /api/orca/stream/start',
      orcaStreamStop: 'POST /api/orca/stream/stop',
      orcaStreamStatus: 'GET /api/orca/stream/status',
      // ORCA Storage
      orcaStorageStats: 'GET /api/orca/storage/stats',
      orcaOddsHistory: 'GET /api/orca/storage/odds/:marketId',
      // Debug (Bun 1.3.2)
      debugMemory: 'GET /api/debug/memory',
      debugRuntime: 'GET /api/debug/runtime',
      debugHeapSnapshot: 'POST /api/debug/heap-snapshot',
      debugCpuProfile: 'POST /api/debug/cpu-profile',
      debugWsSubscriptions: 'GET /api/debug/ws-subscriptions',
    },
  });
});

// ============ Server Configuration ============
const port = parseInt(process.env.PORT || '3003');
const startTime = timing.now();

// Migrate plaintext credentials to Bun.secrets on first run
migrateCredentials().then(({ migrated, message }) => {
  if (migrated) console.log(colors.green(`[security] ${message}`));
}).catch(() => {});

// ============ HMR-Aware Server Startup ============
// Reuse existing server on hot reload to preserve connections
let server: ReturnType<typeof Bun.serve>;

if (import.meta.hot?.data.server) {
  // Reuse existing server from previous HMR cycle
  server = import.meta.hot.data.server;
  // Update the fetch handler to use new app routes
  server.reload({ fetch: app.fetch });
} else {
  // First load - create new server
  server = Bun.serve({
    port,
    fetch: app.fetch,
    development: true,
  });
  // Store server in HMR data for next reload
  if (import.meta.hot) {
    import.meta.hot.data.server = server;
  }

  // Start dashboard WebSocket server
  dashboardWSS.start();
}

// Update fetch handler on HMR without restarting server
if (import.meta.hot) {
  // Cleanup before module replacement
  import.meta.hot.dispose(() => {
    console.log(colors.yellow('[HMR] Disposing module...'));
  });

  // Accept updates - this marks the module as hot-replaceable
  import.meta.hot.accept();

  // Listen for HMR events
  import.meta.hot.on('bun:beforeUpdate', () => {
    console.log(colors.cyan('[HMR] Update detected, reloading...'));
  });

  import.meta.hot.on('bun:afterUpdate', () => {
    console.log(colors.green('[HMR] Update complete!'));
  });

  import.meta.hot.on('bun:error', () => {
    console.error(colors.red('[HMR] Error occurred during hot reload'));
  });
}

// ============ Startup Banner ============
const mem = runtime.memoryFormatted();
const isHMR = hmrData.reloadCount > 1;
const uptime = Math.floor((Date.now() - hmrData.startedAt) / 1000);

const banner = isHMR
  ? `
${colors.cyan('NEXUS')} ${colors.gray('Hot Reload')} ${colors.magenta(`#${hmrData.reloadCount}`)}

${colors.green('Server')}     http://localhost:${port}
${colors.green('Memory')}     ${mem.heapUsed} / ${mem.heapTotal}
${colors.green('Uptime')}     ${uptime}s (preserved across ${hmrData.reloadCount} reloads)

${colors.gray(`HMR completed in ${((timing.now() - startTime) / 1_000_000).toFixed(2)}ms`)}
`
  : `
${colors.cyan('NEXUS')} ${colors.gray('Unified Trading Intelligence')}

${colors.green('Runtime')}    Bun ${runtime.version}
${colors.green('Server')}     http://localhost:${port}
${colors.green('Showcase')}   http://localhost:${port}/showcase
${colors.green('Docs')}       http://localhost:${port}/docs
${colors.green('Memory')}     ${mem.heapUsed} / ${mem.heapTotal}

${colors.yellow('Data Sources:')}
  ${colors.gray('•')} Crypto      BitMEX, Binance, Bybit, OKX, Deribit
  ${colors.gray('•')} Prediction  Polymarket, Kalshi
  ${colors.gray('•')} Sports      13+ Bookmakers via ORCA
  ${colors.gray('•')} Files       CSV, JSON

${colors.magenta('HMR')}        Enabled (use bun --hot)

${colors.gray(`Startup: ${((timing.now() - startTime) / 1_000_000).toFixed(2)}ms`)}
`;

console.log(box(banner.trim(), isHMR ? `NEXUS HMR #${hmrData.reloadCount}` : 'NEXUS v1.0.0'));

// Export for Bun.serve compatibility
export default {
  port,
  fetch: app.fetch,
};
