/**
 * API route handlers for the dashboard
 * 
 * This module contains all HTTP route handlers organized by functionality.
 * Routes are registered in the main Bun.serve() handler.
 */

import { Database } from 'bun:sqlite';
import { getHistoryDatabase } from '../db/history.ts';
import { calculateProfileMetrics, calculateP2PMetrics } from '../metrics/calculators.ts';
import type {
  ProfileResult,
  ProfileOperation,
  P2PGatewayResult,
  P2PGateway,
  P2POperation,
} from '../types.ts';

/**
 * Context object containing dependencies needed by route handlers
 */
import type { WebSocketManager } from '../websocket/manager.ts';

export interface RouteContext {
  getData: (useCache?: boolean) => Promise<any>;
  checkAndAlert: (data: any) => Promise<void>;
  getPageHtml: () => Promise<string>;
  dataCache: Map<string, { data: any; timestamp: number }>;
  CACHE_TTL: number;
  fraudEngine: any | null;
  wsClients: WebSocketManager;
}

/**
 * Handle WebSocket upgrade
 */
export function handleWebSocketUpgrade(req: Request, server: any): Response | undefined {
  const url = new URL(req.url);
  if (url.pathname === '/ws') {
    const upgraded = server.upgrade(req, {
      data: {
        connectedAt: Date.now(),
        subscriptions: new Set(['*']),
      },
    });
    
    if (upgraded) {
      return undefined; // WebSocket upgrade successful
    }
    
    return new Response('WebSocket upgrade failed', { status: 500 });
  }
  return undefined;
}

/**
 * Handle dashboard data endpoint
 */
export async function handleDataRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/data') return null;
  
  const bypassCache = url.searchParams.has('refresh') || url.searchParams.get('cache') === 'false';
  const scope = url.searchParams.get('scope'); // p2p, profile, or undefined (all)
  const data = await context.getData(!bypassCache);
  
  // Filter by scope if requested
  let responseData = data;
  const gateway = url.searchParams.get('gateway'); // Filter by gateway for P2P scope
  
  if (scope === 'p2p') {
    let p2pResults = data.p2pResults || [];
    if (gateway) {
      p2pResults = p2pResults.filter((p: any) => p.gateway === gateway);
    }
    responseData = {
      ...data,
      benchmarks: [],
      tests: [],
      profileResults: [],
      p2pResults,
      stats: {
        ...data.stats,
        benchmarksTotal: 0,
        benchmarksPassed: 0,
        testsTotal: 0,
        testsPassed: 0,
        profileTotal: 0,
        p2pTotal: p2pResults.length,
      },
    };
  } else if (scope === 'profile') {
    const operation = url.searchParams.get('operation'); // Filter by operation for profile scope
    let profileResults = data.profileResults || [];
    if (operation) {
      profileResults = profileResults.filter((p: any) => p.operation === operation);
    }
    responseData = {
      ...data,
      benchmarks: [],
      tests: [],
      p2pResults: [],
      profileResults,
      stats: {
        ...data.stats,
        benchmarksTotal: 0,
        benchmarksPassed: 0,
        testsTotal: 0,
        testsPassed: 0,
        p2pTotal: 0,
        profileTotal: profileResults.length,
      },
    };
  }
  
  // Check and send alerts (only for fresh data)
  if (!data.cached) {
    await context.checkAndAlert(data);
  }
  
  return new Response(JSON.stringify(responseData), {
    headers: { 
      'Content-Type': 'application/json',
      'X-Cache': data.cached ? 'HIT' : 'MISS',
      'X-Cache-TTL': String(context.CACHE_TTL),
    },
  });
}

/**
 * Handle open file in editor endpoint
 */
export async function handleOpenFileRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/open-file' || req.method !== 'POST') return null;
  
  try {
    const body = await req.json();
    const { filePath, line, column } = body;
    
    if (!filePath) {
      return new Response(JSON.stringify({ error: 'filePath required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Security: Validate file path to prevent directory traversal
    // Only allow relative paths or paths within the project root
    let safeFilePath: string;
    try {
      // Block path traversal attempts
      if (filePath.includes('..') || filePath.includes('\0')) {
        return new Response(JSON.stringify({ error: 'Invalid file path: path traversal detected' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Resolve path relative to project root
      const projectRoot = process.cwd();
      const resolvedPath = Bun.resolveSync(filePath, projectRoot);
      
      // Ensure resolved path is within project root (prevent absolute path escapes)
      if (!resolvedPath.startsWith(projectRoot)) {
        return new Response(JSON.stringify({ error: 'Invalid file path: outside project scope' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Use resolved path for security
      safeFilePath = resolvedPath;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid file path: ' + (error instanceof Error ? error.message : String(error)) }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Use Bun.openInEditor to open file
    Bun.openInEditor(safeFilePath, {
      line: Math.max(1, Math.floor(line || 1)), // Ensure positive integer
      column: Math.max(1, Math.floor(column || 1)), // Ensure positive integer
    });
    
    return new Response(JSON.stringify({ success: true, message: `Opened ${safeFilePath} in editor` }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle history endpoint
 */
export function handleHistoryRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/history') return Promise.resolve(null);
  
  return (async () => {
    try {
      const hours = parseInt(url.searchParams.get('hours') || '24');
      const scope = url.searchParams.get('scope'); // p2p, profile, or undefined (all)
      const gateway = url.searchParams.get('gateway'); // Filter by gateway for P2P scope
      const operation = url.searchParams.get('operation'); // Filter by operation
      const since = Date.now() - (hours * 60 * 60 * 1000);
      
      let responseData: any = {};
      const db = getHistoryDatabase();
      
      if (scope === 'p2p') {
        let query = 'SELECT * FROM p2p_gateway_history WHERE timestamp > ?';
        const params: any[] = [since];
        
        if (gateway) {
          query += ' AND gateway = ?';
          params.push(gateway);
        }
        
        query += ' ORDER BY timestamp DESC';
        const p2pHistory = db.prepare(query).all(...params);
        responseData = { p2p: p2pHistory };
      } else if (scope === 'profile') {
        let query = 'SELECT * FROM profile_history WHERE timestamp > ?';
        const params: any[] = [since];
        
        if (operation) {
          query += ' AND operation = ?';
          params.push(operation);
        }
        
        query += ' ORDER BY timestamp DESC';
        const profileHistory = db.prepare(query).all(...params);
        responseData = { profile: profileHistory };
      } else {
        // Default: return all history
        const benchmarks = db.prepare(
          'SELECT * FROM benchmark_history WHERE timestamp > ? ORDER BY timestamp DESC'
        ).all(since);
        
        const tests = db.prepare(
          'SELECT * FROM test_history WHERE timestamp > ? ORDER BY timestamp DESC'
        ).all(since);
        
        const p2pHistory = db.prepare(
          'SELECT * FROM p2p_gateway_history WHERE timestamp > ? ORDER BY timestamp DESC'
        ).all(since);
        
        const profileHistory = db.prepare(
          'SELECT * FROM profile_history WHERE timestamp > ? ORDER BY timestamp DESC'
        ).all(since);
        
        responseData = { benchmarks, tests, p2p: p2pHistory, profile: profileHistory };
      }
      
      return new Response(JSON.stringify(responseData), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })();
}

/**
 * Handle profile metrics endpoint
 */
export function handleProfileMetricsRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/profile/metrics') return Promise.resolve(null);
  
  return (async () => {
    try {
      const hours = parseInt(url.searchParams.get('hours') || '24');
      const operation = url.searchParams.get('operation'); // Filter by operation
      const since = Date.now() - (hours * 60 * 60 * 1000);
      
      let query = 'SELECT * FROM profile_history WHERE timestamp > ?';
      const params: any[] = [since];
      
      if (operation) {
        query += ' AND operation = ?';
        params.push(operation);
      }
      
      query += ' ORDER BY timestamp DESC';
      const db = getHistoryDatabase();
      const profileHistory = db.prepare(query).all(...params);
      
      // Convert database rows to ProfileResult format
      const profileResults: ProfileResult[] = profileHistory.map((row: any) => ({
        operation: row.operation as ProfileOperation,
        time: row.time,
        target: row.target,
        status: row.status as 'pass' | 'fail' | 'warning',
        category: (row.category || 'core') as any,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        cpuTimeMs: row.cpu_time_ms,
        memoryDeltaBytes: row.memory_delta_bytes,
        threadCount: row.thread_count,
        peakMemoryMb: row.peak_memory_mb,
        modelAccuracy: row.model_accuracy,
        modelLoss: row.model_loss,
        trainingSamples: row.training_samples,
        inferenceLatencyMs: row.inference_latency_ms,
        personalizationScore: row.personalization_score,
        featureCount: row.feature_count,
        embeddingDimension: row.embedding_dimension,
        hllCardinalityEstimate: row.hll_cardinality_estimate,
        hllMergeTimeMs: row.hll_merge_time_ms,
        r2ObjectSizeBytes: row.r2_object_size_bytes,
        r2UploadTimeMs: row.r2_upload_time_ms,
        r2DownloadTimeMs: row.r2_download_time_ms,
        gnnNodes: row.gnn_nodes,
        gnnEdges: row.gnn_edges,
        gnnPropagationTimeMs: row.gnn_propagation_time_ms,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
      }));
      
      // Calculate aggregate metrics
      const metrics = calculateProfileMetrics(profileResults);
      
      return new Response(JSON.stringify({ metrics, totalRecords: profileHistory.length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })();
}

/**
 * Handle P2P metrics endpoint
 */
export function handleP2PMetricsRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/p2p/metrics') return Promise.resolve(null);
  
  return (async () => {
    try {
      const hours = parseInt(url.searchParams.get('hours') || '24');
      const gateway = url.searchParams.get('gateway'); // Filter by gateway
      const operation = url.searchParams.get('operation'); // Filter by operation
      const since = Date.now() - (hours * 60 * 60 * 1000);
      
      let query = 'SELECT * FROM p2p_gateway_history WHERE timestamp > ?';
      const params: any[] = [since];
      
      if (gateway) {
        query += ' AND gateway = ?';
        params.push(gateway);
      }
      
      if (operation) {
        query += ' AND operation = ?';
        params.push(operation);
      }
      
      query += ' ORDER BY timestamp DESC';
      const db = getHistoryDatabase();
      const p2pHistory = db.prepare(query).all(...params);
      
      // Convert database rows to P2PGatewayResult format
      const p2pResults: P2PGatewayResult[] = p2pHistory.map((row: any) => ({
        gateway: row.gateway as P2PGateway,
        operation: row.operation as P2POperation,
        time: row.time,
        target: row.target,
        status: row.status as 'pass' | 'fail' | 'warning',
        note: undefined,
        dryRun: row.dry_run === 1,
        success: row.success === 1,
        errorMessage: row.error_message || undefined,
        requestSize: row.request_size || undefined,
        responseSize: row.response_size || undefined,
        endpoint: row.endpoint || undefined,
        statusCode: row.status_code || undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }));
      
      // Calculate aggregate metrics
      const metrics = calculateP2PMetrics(p2pResults);
      
      return new Response(JSON.stringify({ metrics, totalRecords: p2pHistory.length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })();
}

/**
 * Handle profile trends endpoint
 */
export function handleProfileTrendsRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/profile/trends') return Promise.resolve(null);
  
  return (async () => {
    try {
      const hours = parseInt(url.searchParams.get('hours') || '24');
      const operation = url.searchParams.get('operation');
      const since = Date.now() - (hours * 60 * 60 * 1000);
      
      let query = 'SELECT operation, timestamp, time, personalization_score, model_accuracy FROM profile_history WHERE timestamp > ?';
      const params: any[] = [since];
      
      if (operation) {
        query += ' AND operation = ?';
        params.push(operation);
      }
      
      query += ' ORDER BY timestamp ASC';
      const db = getHistoryDatabase();
      const trends = db.prepare(query).all(...params);
      
      return new Response(JSON.stringify({ trends }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })();
}

/**
 * Apply export filters from query params
 */
function applyExportFilters(data: any, url: URL) {
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';
  const status = url.searchParams.get('status') || '';
  const testSearch = url.searchParams.get('test_search') || '';
  const testCategory = url.searchParams.get('test_category') || '';
  const testStatus = url.searchParams.get('test_status') || '';
  const benchmarks = data.benchmarks.filter((b: any) => {
    const mSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
    const mCat = !category || b.category === category;
    const mStatus = !status || b.status === status;
    return mSearch && mCat && mStatus;
  });
  const tests = data.tests.filter((t: any) => {
    const mSearch = !testSearch || t.name.toLowerCase().includes(testSearch.toLowerCase());
    const mCat = !testCategory || t.category === testCategory;
    const mStatus = !testStatus || t.status === testStatus;
    return mSearch && mCat && mStatus;
  });
  return { ...data, benchmarks, tests };
}

/**
 * Handle CSV export endpoint
 */
export async function handleCsvExportRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/export/csv') return null;
  
  try {
    const data = await context.getData(false);
    const filtered = applyExportFilters(data, url);
    const csv = [
      ['Benchmark', 'Time (ms)', 'Target (ms)', 'Status', 'Category'].join(','),
      ...filtered.benchmarks.map((b: any) =>
        [b.name, b.time, b.target, b.status, b.category].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      ),
      '',
      ['Test', 'Status', 'Category', 'Message'].join(','),
      ...filtered.tests.map((t: any) =>
        [t.name, t.status, t.category, t.message || ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\\n');
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="dashboard-export.csv"'
      }
    });
  } catch (error) {
    return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, {
      status: 500,
    });
  }
}

/**
 * Handle JSON export endpoint
 */
export async function handleJsonExportRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/export/json') return null;
  
  try {
    const data = await context.getData(false);
    const filtered = applyExportFilters(data, url);
    const exportData = {
      ...filtered,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      environment: {
        bunVersion: Bun.version,
        nodeEnv: process.env.NODE_ENV,
      }
    };
    
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="dashboard-export.json"'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle fraud prevention routes
 */
export async function handleFraudRoutes(req: Request, context: RouteContext): Promise<Response | null> {
  if (!context.fraudEngine) return null;
  
  const url = new URL(req.url);
  
  // Fraud history
  if (url.pathname === '/api/fraud/history') {
    try {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10) || 100));
      const eventType = url.searchParams.get('eventType') || undefined;
      const since = url.searchParams.get('since'); const sinceSec = since ? parseInt(since, 10) : undefined;
      const entries = context.fraudEngine.getAccountHistory({ userId, eventType, since: sinceSec, limit });
      return new Response(JSON.stringify({ userId, entries }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  // Cross-lookup
  if (url.pathname === '/api/fraud/cross-lookup') {
    try {
      const type = (url.searchParams.get('type') as 'phone_hash' | 'email_hash' | 'device_id') || undefined;
      const minAccounts = Math.max(2, parseInt(url.searchParams.get('minAccounts') || '2', 10) || 2);
      const results = context.fraudEngine.getCrossLookups({ referenceType: type, minAccounts });
      return new Response(JSON.stringify({ results }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  // References
  if (url.pathname === '/api/fraud/references') {
    try {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const refs = context.fraudEngine.getReferencesForUser(userId);
      return new Response(JSON.stringify({ userId, references: refs }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  // Event (POST)
  if (url.pathname === '/api/fraud/event' && req.method === 'POST') {
    try {
      const body = await req.json() as { userId: string; eventType: string; metadata?: Record<string, unknown>; ipHash?: string; deviceHash?: string; gateway?: string; amountCents?: number; success?: boolean };
      if (!body?.userId || !body?.eventType) {
        return new Response(JSON.stringify({ error: 'userId and eventType required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      context.fraudEngine.recordEvent(body);
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  // Register (POST)
  if (url.pathname === '/api/fraud/register' && req.method === 'POST') {
    try {
      const body = await req.json() as { userId: string; referenceType: 'phone_hash' | 'email_hash' | 'device_id'; valueHash?: string; phone?: string };
      if (!body?.userId || !body?.referenceType) {
        return new Response(JSON.stringify({ error: 'userId and referenceType required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      let valueHash = body.valueHash;
      if (!valueHash && body.phone && body.referenceType === 'phone_hash') {
        const fp = await import('../../fraud-prevention/src/index.ts');
        valueHash = await fp.hashPhone(body.phone);
      } else if (!valueHash) {
        return new Response(JSON.stringify({ error: 'valueHash required, or phone when referenceType is phone_hash' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      context.fraudEngine.registerReference({ userId: body.userId, referenceType: body.referenceType, valueHash });
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  return null;
}

/**
 * Handle health check endpoint
 */
export function handleHealthRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/health') return Promise.resolve(null);
  
  return (async () => {
    try {
      const startTime = Bun.nanoseconds();
      
      // Check database connectivity
      let dbStatus = 'ok';
      try {
        getHistoryDatabase().prepare('SELECT 1').get();
      } catch (error) {
        dbStatus = 'error';
      }
      
      // Check cache status
      const cacheStatus = context.dataCache.size > 0 ? 'active' : 'empty';
      const cacheSize = context.dataCache.size;
      
      // Get recent data to check system health
      let dataStatus = 'ok';
      let lastDataTime = null;
      try {
        const cachedData = context.dataCache.get('dashboard-data');
        if (cachedData) {
          lastDataTime = cachedData.timestamp;
          const age = Date.now() - cachedData.timestamp;
          if (age > context.CACHE_TTL * 2) {
            dataStatus = 'stale';
          }
        } else {
          dataStatus = 'no-cache';
        }
      } catch (error) {
        dataStatus = 'error';
      }
      
      // Check WebSocket connections
      const wsConnections = context.wsClients.size;
      
      // Get system info
      const healthData = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime(),
        responseTime: (Bun.nanoseconds() - startTime) / 1_000_000,
        services: {
          database: {
            status: dbStatus,
            type: 'sqlite',
          },
          cache: {
            status: cacheStatus,
            size: cacheSize,
            ttl: context.CACHE_TTL,
            lastDataTime,
          },
          websocket: {
            status: wsConnections > 0 ? 'active' : 'idle',
            connections: wsConnections,
          },
          data: {
            status: dataStatus,
            lastUpdate: lastDataTime,
          },
        },
        environment: {
          bunVersion: Bun.version,
          nodeEnv: process.env.NODE_ENV || 'development',
          platform: process.platform,
        },
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
      };
      
      // Determine overall health status
      const isHealthy = dbStatus === 'ok' && dataStatus !== 'error';
      healthData.status = isHealthy ? 'healthy' : 'degraded';
      
      return new Response(JSON.stringify(healthData, null, 2), {
        headers: { 
          'Content-Type': 'application/json',
          'X-Health-Status': isHealthy ? 'healthy' : 'degraded',
        },
        status: isHealthy ? 200 : 503,
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  })();
}

/**
 * Handle benchmarks table endpoint
 */
export async function handleBenchmarksTableRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/benchmarks/table') return null;
  
  try {
    const bypassCache = url.searchParams.has('refresh') || url.searchParams.get('cache') === 'false';
    const data = await context.getData(!bypassCache);
    const tableData = data.benchmarks.map((b: any) => ({
      name: b.name,
      time: `${b.time.toFixed(3)}ms`,
      target: `${b.target.toFixed(3)}ms`,
      status: b.status,
      category: b.category,
    }));
    
    // Use Bun.inspect.table for formatted table output
    const tableString = Bun.inspect.table(tableData, ['name', 'time', 'target', 'status', 'category'], {
      colors: true,
    });
    
    return new Response(tableString, {
      headers: { 
        'Content-Type': 'text/plain',
        'X-Cache': data.cached ? 'HIT' : 'MISS',
        'X-Cache-TTL': String(context.CACHE_TTL),
      },
    });
  } catch (error) {
    return new Response(`Error: ${error instanceof Error ? error.message : String(error)}`, {
      status: 500,
    });
  }
}

/**
 * Handle root route (serve HTML page)
 */
export async function handleRootRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  // Only handle root path, not API routes
  if (url.pathname !== '/' && !url.pathname.startsWith('/api/') && url.pathname !== '/ws') {
    return null;
  }
  if (url.pathname !== '/') return null;
  
  const pageHtml = await context.getPageHtml();
  return new Response(pageHtml, { headers: { 'Content-Type': 'text/html' } });
}

/**
 * Main route handler that processes all routes
 */
export async function handleRoutes(req: Request, server: any, context: RouteContext): Promise<Response> {
  // Try WebSocket upgrade first
  const wsResponse = handleWebSocketUpgrade(req, server);
  if (wsResponse !== undefined) return wsResponse;
  
  // Try all route handlers in order
  const routes = [
    () => handleDataRoute(req, context),
    () => handleOpenFileRoute(req),
    () => handleHistoryRoute(req),
    () => handleProfileMetricsRoute(req),
    () => handleP2PMetricsRoute(req),
    () => handleProfileTrendsRoute(req),
    () => handleCsvExportRoute(req, context),
    () => handleJsonExportRoute(req, context),
    () => handleFraudRoutes(req, context),
    () => handleHealthRoute(req, context),
    () => handleBenchmarksTableRoute(req, context),
    () => handleRootRoute(req, context),
  ];
  
  for (const routeHandler of routes) {
    const response = await routeHandler();
    if (response !== null) {
      return response;
    }
  }
  
  // 404 if no route matched
  return new Response('Not Found', { status: 404 });
}
