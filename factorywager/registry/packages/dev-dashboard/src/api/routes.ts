/**
 * API route handlers for the dashboard
 * 
 * This module contains all HTTP route handlers organized by functionality.
 * Routes are registered in the main Bun.serve() handler.
 */

import { Database } from 'bun:sqlite';
import { getHistoryDatabase } from '../db/history.ts';
import { calculateProfileMetrics, calculateP2PMetrics } from '../metrics/calculators.ts';
import {
  getWebhookMetrics,
  getDNSCacheStats,
  calculateDNSCacheHitRatio,
} from '../alerts/webhook.ts';
import {
  extractFraudContext,
  setFraudSession,
  revokeFraudSession,
  createResponseWithCookies,
  getCookieTelemetry,
} from '../fraud/session.ts';
import {
  getDashboardPreferences,
  injectPreferencesIntoHtml,
  setVisitCookies,
  updatePreferencesFromBody,
} from '../preferences.ts';
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

import type { DuoPlusFragmentLoader } from '../duoplus/fragment-loader.ts';
import {
  getMyDevicesFromCookie,
  setMyDevicesCookie,
} from '../duoplus/fragment-loader.ts';
import type { DeviceComparisonEngine } from '../duoplus/comparison.ts';
import type { DeviceReportExporter } from '../duoplus/reports.ts';
import type { DeviceAlertSystem } from '../duoplus/alerts.ts';
import { getOrSetAgentId, type ABTestingFramework } from '../ab-testing.ts';
import type { GoldenProfileSystem } from '../golden-profile.ts';
import type { PaymentGatewaySystem } from '../payment-gateway.ts';
import type { FraudDetectionSystem } from '../fraud-detection.ts';
import type { AppleIDIntegration } from '../apple-id.ts';
import type { AgentBehaviorScorer } from '../agent-behavior-scoring.ts';
import {
  getUserGroups,
  setUserGroups,
  addToGroup,
  removeFromGroup,
  getDeviceTags,
  tagDevice,
  untagDevice,
  searchByTags,
} from '../duoplus/groups.ts';

export interface RouteContext {
  getData: (useCache?: boolean) => Promise<any>;
  checkAndAlert: (data: any) => Promise<void>;
  getPageHtml: () => Promise<string>;
  dataCache: Map<string, { data: any; timestamp: number }>;
  CACHE_TTL: number;
  fraudEngine: any | null;
  wsClients: WebSocketManager;
  duoplusLoader: DuoPlusFragmentLoader | null;
  comparisonEngine: DeviceComparisonEngine | null;
  reportExporter: DeviceReportExporter | null;
  deviceAlerts: DeviceAlertSystem | null;
  abTesting: ABTestingFramework | null;
  socialFeed: import('../social.ts').SocialFeed | null;
  agentViz: import('../agent-viz.ts').AgentInteractionVisualizer | null;
  goldenProfile: GoldenProfileSystem | null;
  paymentGateway: PaymentGatewaySystem | null;
  fraudDetection: FraudDetectionSystem | null;
  appleID: AppleIDIntegration | null;
  agentBehaviorScorer: AgentBehaviorScorer | null;
}

/**
 * Handle WebSocket upgrade
 * 
 * Uses Bun's WebSocket upgrade API with:
 * - Cookie parsing for user identification
 * - Typed contextual data (ws.data)
 * - Custom headers in upgrade response
 * 
 * Reference: https://bun.com/docs/runtime/websockets#contextual-data
 */
export function handleWebSocketUpgrade(req: Request, server: any): Response | undefined {
  const url = new URL(req.url);
  if (url.pathname === '/ws') {
    try {
      // Parse cookies for user identification (if available)
      // Cookies are automatically sent with WebSocket upgrade request
      // Use fraud session cookies for enhanced security
      const fraudContext = extractFraudContext(req);
      let sessionId = fraudContext.sessionId || undefined;
      let userId: string | undefined;
      
      // Also check legacy cookies for backward compatibility
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader && !sessionId) {
        try {
          const cookies = new Bun.CookieMap(cookieHeader);
          sessionId = cookies.get('SessionId') || sessionId;
          userId = cookies.get('UserId') || undefined;
        } catch {
          // Invalid cookie header, continue without cookies
        }
      }
      
      // Generate session ID if not present
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }
      
      // Upgrade to WebSocket with typed data
      // Reference: https://bun.com/docs/runtime/websockets#contextual-data
      const upgraded = server.upgrade(req, {
        // Contextual data attached to ws.data (strongly typed)
        data: {
          connectedAt: Date.now(),
          subscriptions: new Set(['*']), // Subscribe to all updates by default
          clientId: `client-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          sessionId,
          userId,
        },
        // Custom headers in the 101 Switching Protocols response
        // Reference: https://bun.com/docs/runtime/websockets#headers
        headers: {
          'X-WebSocket-Version': '1.0',
          'Set-Cookie': `SessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax`,
        },
      });
      
      if (upgraded) {
        // WebSocket upgrade successful - do not return a Response
        // Bun automatically sends 101 Switching Protocols response
        return undefined;
      }
      
      // Upgrade failed
      return new Response('WebSocket upgrade failed', { status: 500 });
    } catch (error) {
      return new Response(
        `WebSocket upgrade error: ${error instanceof Error ? error.message : String(error)}`,
        { status: 500 }
      );
    }
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
  
  // Event (POST) - Enhanced with cookie-based context
  if (url.pathname === '/api/fraud/event' && req.method === 'POST') {
    try {
      const body = await req.json() as { userId: string; eventType: string; metadata?: Record<string, unknown>; ipHash?: string; deviceHash?: string; gateway?: string; amountCents?: number; success?: boolean };
      if (!body?.userId || !body?.eventType) {
        return new Response(JSON.stringify({ error: 'userId and eventType required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      
      // Extract fraud context from cookies
      const fraudContext = extractFraudContext(req);
      
      // Enhance event with cookie-based context
      const enhancedEvent = {
        ...body,
        deviceHash: body.deviceHash || fraudContext.deviceId || undefined,
        metadata: {
          ...body.metadata,
          sessionId: fraudContext.sessionId,
          lastVisit: fraudContext.lastVisit,
          ipAddress: fraudContext.ipAddress,
          userAgent: fraudContext.userAgent,
        },
      };
      
      context.fraudEngine.recordEvent(enhancedEvent);
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  // Login endpoint - Set secure fraud session
  if (url.pathname === '/api/fraud/login' && req.method === 'POST') {
    try {
      const body = await req.json() as { userId: string; deviceId?: string };
      if (!body?.userId) {
        return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      
      // Set secure fraud session cookies
      const { sessionId, deviceId } = setFraudSession(req, body.userId, body.deviceId);
      
      // Create response with cookies
      return createResponseWithCookies(
        JSON.stringify({ 
          ok: true, 
          sessionId: sessionId.substring(0, 8) + '...', // Truncated for security
          deviceId,
        }),
        { sessionId, deviceId },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  // Revoke session endpoint - Nuclear logout
  if (url.pathname === '/api/fraud/revoke' && req.method === 'POST') {
    try {
      // Immediately revoke all fraud-related cookies
      const deleteHeaders = revokeFraudSession(req);
      
      const headers = new Headers({ 'Content-Type': 'application/json' });
      deleteHeaders.forEach(header => {
        headers.append('Set-Cookie', header);
      });
      
      return new Response(
        JSON.stringify({ ok: true, message: 'Session revoked' }),
        { headers }
      );
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
  
  // Cookie telemetry endpoint
  if (url.pathname === '/api/fraud/cookie-telemetry') {
    try {
      const telemetry = getCookieTelemetry(req);
      return new Response(JSON.stringify(telemetry), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  
  return null;
}

/**
 * Handle webhook health endpoint
 */
export function handleWebhookHealthRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/health/webhook') return Promise.resolve(null);
  
  return (async () => {
    try {
      const metrics = getWebhookMetrics();
      const dnsStats = getDNSCacheStats();
      
      // Determine health status based on failure rate
      // Consider healthy if failure rate is below 10%, degraded otherwise
      const isHealthy = metrics.failureRate === null || metrics.failureRate < 10;
      
      const healthData = {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: Date.now(),
        ...metrics,
        dns: {
          hitRatio: calculateDNSCacheHitRatio(dnsStats),
          stats: dnsStats,
        },
      };
      
      return new Response(JSON.stringify(healthData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Health-Status': isHealthy ? 'healthy' : 'degraded',
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
 * Handle my-devices API (GET/POST) - device IDs stored in cookie for Cloud Phones tab.
 */
export async function handleMyDevicesRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/dashboard/my-devices') return null;

  const cookieHeader = req.headers.get('cookie');

  if (req.method === 'GET') {
    const deviceIds = getMyDevicesFromCookie(cookieHeader);
    return new Response(JSON.stringify({ deviceIds }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as { deviceIds?: string[] };
      const ids = Array.isArray(body?.deviceIds) ? body.deviceIds.filter((x): x is string => typeof x === 'string') : [];
      const headers = setMyDevicesCookie(cookieHeader, ids);
      const resHeaders = new Headers({ 'Content-Type': 'application/json' });
      for (const h of headers) resHeaders.append('Set-Cookie', h);
      return new Response(JSON.stringify({ success: true, deviceIds: ids }), { headers: resHeaders });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return null;
}

/**
 * Handle device fragment (GET /api/fragment/device/:id).
 * Returns HTML fragment from DuoPlus API; access controlled by my_devices cookie.
 */
export async function handleFragmentDeviceRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith('/api/fragment/device/') || req.method !== 'GET') return null;
  if (!context.duoplusLoader) {
    return new Response(JSON.stringify({ error: 'DuoPlus not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parts = url.pathname.split('/');
  const deviceId = parts[parts.length - 1];
  if (!deviceId) return new Response('Bad Request', { status: 400 });

  const cookieHeader = req.headers.get('cookie');
  const myDevices = getMyDevicesFromCookie(cookieHeader);
  if (!myDevices.includes(deviceId)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { html, setCookieHeaders } = await context.duoplusLoader.createDeviceFragment(deviceId, cookieHeader);
  const headers = new Headers({ 'Content-Type': 'text/html; charset=utf-8' });
  for (const h of setCookieHeaders) headers.append('Set-Cookie', h);
  return new Response(html, { headers });
}

/**
 * Handle dashboard groups (GET/POST) and group devices (POST /api/dashboard/groups/:id/devices).
 */
export async function handleDashboardGroupsRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const cookieHeader = req.headers.get('cookie');

  if (url.pathname === '/api/dashboard/groups' && req.method === 'GET') {
    const tags = url.searchParams.get('tags');
    if (tags) {
      const deviceIds = getMyDevicesFromCookie(cookieHeader);
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const filtered = searchByTags(cookieHeader, deviceIds, tagList);
      return new Response(JSON.stringify({ deviceIds: filtered }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const groups = getUserGroups(cookieHeader);
    return new Response(JSON.stringify({ groups }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.pathname === '/api/dashboard/groups' && req.method === 'POST') {
    try {
      const body = (await req.json()) as { groups?: Record<string, { name: string; devices?: string[]; color?: string; icon?: string }> };
      const groups = body.groups ?? getUserGroups(cookieHeader);
      const headers = setUserGroups(cookieHeader, groups);
      const resHeaders = new Headers({ 'Content-Type': 'application/json' });
      for (const h of headers) resHeaders.append('Set-Cookie', h);
      return new Response(JSON.stringify({ success: true, groups }), { headers: resHeaders });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  const groupsMatch = url.pathname.match(/^\/api\/dashboard\/groups\/([^/]+)\/devices$/);
  if (groupsMatch && req.method === 'POST') {
    const groupId = decodeURIComponent(groupsMatch[1]);
    try {
      const body = (await req.json()) as { deviceId: string; action?: 'add' | 'remove' };
      const deviceId = body.deviceId;
      if (!deviceId) {
        return new Response(JSON.stringify({ error: 'deviceId required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const myDevices = getMyDevicesFromCookie(cookieHeader);
      if (!myDevices.includes(deviceId)) {
        return new Response(JSON.stringify({ error: 'Device not in your list' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const action = body.action === 'remove' ? 'remove' : 'add';
      const res =
        action === 'remove'
          ? removeFromGroup(cookieHeader, groupId, deviceId)
          : addToGroup(cookieHeader, groupId, deviceId);
      const resHeaders = new Headers({ 'Content-Type': 'application/json' });
      for (const h of res.headers) resHeaders.append('Set-Cookie', h);
      return new Response(JSON.stringify({ success: true, groups: res.groups }), { headers: resHeaders });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return null;
}

/**
 * Handle device tags (GET/POST /api/dashboard/devices/:id/tags).
 */
export async function handleDeviceTagsRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const match = url.pathname.match(/^\/api\/dashboard\/devices\/([^/]+)\/tags$/);
  if (!match) return null;
  const deviceId = decodeURIComponent(match[1]);
  const cookieHeader = req.headers.get('cookie');
  const myDevices = getMyDevicesFromCookie(cookieHeader);
  if (!myDevices.includes(deviceId)) {
    return new Response(JSON.stringify({ error: 'Device not in your list' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'GET') {
    const tags = getDeviceTags(cookieHeader, deviceId);
    return new Response(JSON.stringify({ deviceId, tags }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as { tags?: string[]; tag?: string; action?: 'add' | 'remove' };
      if (body.action === 'remove' && body.tag) {
        const res = untagDevice(cookieHeader, deviceId, body.tag);
        const resHeaders = new Headers({ 'Content-Type': 'application/json' });
        for (const h of res.headers) resHeaders.append('Set-Cookie', h);
        return new Response(JSON.stringify({ success: true, tags: res.tags }), { headers: resHeaders });
      }
      const tags = Array.isArray(body.tags) ? body.tags : body.tag ? [body.tag] : [];
      const res = tagDevice(cookieHeader, deviceId, tags);
      const resHeaders = new Headers({ 'Content-Type': 'application/json' });
      for (const h of res.headers) resHeaders.append('Set-Cookie', h);
      return new Response(JSON.stringify({ success: true, tags: res.tags }), { headers: resHeaders });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return null;
}

/**
 * Handle devices compare (POST /api/devices/compare).
 * Body: { deviceIds: string[], layout?: string }. Only devices in my_devices are allowed.
 */
export async function handleDevicesCompareRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/devices/compare' || req.method !== 'POST') return null;
  if (!context.comparisonEngine || !context.duoplusLoader) {
    return new Response(JSON.stringify({ error: 'DuoPlus not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as { deviceIds?: string[]; layout?: string };
    const deviceIds = Array.isArray(body?.deviceIds)
      ? (body.deviceIds as string[]).filter((x): x is string => typeof x === 'string')
      : [];
    if (deviceIds.length < 2) {
      return new Response(JSON.stringify({ error: 'At least 2 device IDs required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cookieHeader = req.headers.get('cookie');
    const myDevices = getMyDevicesFromCookie(cookieHeader);
    const allowed = deviceIds.filter((id) => myDevices.includes(id));
    if (allowed.length !== deviceIds.length) {
      return new Response(JSON.stringify({ error: 'Some devices are not in your list' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const layout = typeof body.layout === 'string' ? body.layout : 'grid';
    const comparison = await context.comparisonEngine.createComparison(allowed, cookieHeader, { layout });
    const html = context.comparisonEngine.renderComparisonHTML(comparison, layout);
    return new Response(
      JSON.stringify({
        comparisonId: comparison.id,
        comparison: {
          id: comparison.id,
          deviceIds: comparison.deviceIds,
          timestamp: comparison.timestamp,
          metrics: comparison.metrics,
          differences: comparison.differences,
          rankings: comparison.rankings,
        },
        html,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle report generation (POST /api/reports/generate).
 * Body: { deviceIds: string[], format: 'json'|'csv'|'html', template?: 'full'|'summary' }.
 * Only devices in my_devices are allowed. Returns content or download.
 */
export async function handleReportsGenerateRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/reports/generate' || req.method !== 'POST') return null;
  if (!context.reportExporter || !context.duoplusLoader) {
    return new Response(JSON.stringify({ error: 'DuoPlus not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as {
      deviceIds?: string[];
      format?: 'json' | 'csv' | 'html';
      template?: 'full' | 'summary';
    };
    const deviceIds = Array.isArray(body?.deviceIds)
      ? (body.deviceIds as string[]).filter((x): x is string => typeof x === 'string')
      : [];
    const format = body?.format === 'csv' || body?.format === 'html' ? body.format : 'json';
    const template = body?.template === 'summary' ? 'summary' : 'full';

    const cookieHeader = req.headers.get('cookie');
    const myDevices = getMyDevicesFromCookie(cookieHeader);
    const allowed = deviceIds.length ? deviceIds.filter((id) => myDevices.includes(id)) : myDevices;
    if (deviceIds.length && allowed.length !== deviceIds.length) {
      return new Response(JSON.stringify({ error: 'Some devices are not in your list' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await context.reportExporter.generateReport(allowed, cookieHeader, {
      format,
      template,
    });

    if (result.content !== undefined) {
      const contentType =
        format === 'json'
          ? 'application/json'
          : format === 'csv'
            ? 'text/csv'
            : 'text/html';
      const filename =
        format === 'json'
          ? `devices-report-${result.report.metadata.reportId}.json`
          : format === 'csv'
            ? `devices-report-${result.report.metadata.reportId}.csv`
            : `devices-report-${result.report.metadata.reportId}.html`;
      const headers = new Headers({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      return new Response(result.content, { headers });
    }

    return new Response(JSON.stringify({ reportId: result.report.metadata.reportId, downloadUrl: result.downloadUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle device alerts: GET /api/alerts/device (recent), POST /api/alerts/device/:id/ack (acknowledge).
 */
export async function handleDeviceAlertsRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  const matchAck = url.pathname.match(/^\/api\/alerts\/device\/([^/]+)\/ack$/);
  if (matchAck && req.method === 'POST') {
    const alertId = matchAck[1];
    if (!context.deviceAlerts) {
      return new Response(JSON.stringify({ error: 'Device alerts not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const alert = context.deviceAlerts.getAlert(alertId);
    const ok = context.deviceAlerts.acknowledge(alertId);
    if (ok && context.socialFeed && alert) {
      context.socialFeed.pushAlertAck(alertId, alert.deviceId);
    }
    return new Response(JSON.stringify({ success: ok }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.pathname !== '/api/alerts/device' || req.method !== 'GET') return null;
  if (!context.deviceAlerts) {
    return new Response(JSON.stringify({ error: 'Device alerts not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
  const alerts = context.deviceAlerts.getRecentAlerts(limit);
  return new Response(JSON.stringify({ alerts }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle agent ID: GET /api/agent/id returns { agentId } and sets dw_agent_id cookie if missing.
 */
export async function handleAgentIdRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/agent/id' || req.method !== 'GET') return null;
  const cookieHeader = req.headers.get('cookie');
  const { agentId, setCookieHeader } = getOrSetAgentId(cookieHeader);
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (setCookieHeader) headers.append('Set-Cookie', setCookieHeader);
  return new Response(JSON.stringify({ agentId }), { headers });
}

/**
 * Handle experiments: POST /api/experiments (create), GET /api/experiments (list),
 * GET /api/experiments/:id/assign (get or assign variant), GET /api/experiments/:id/results.
 */
export async function handleExperimentsRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  const pathMatch = url.pathname.match(/^\/api\/experiments\/([^/]+)\/(assign|results)$/);
  const pathList = url.pathname === '/api/experiments' && req.method === 'GET';
  const pathCreate = url.pathname === '/api/experiments' && req.method === 'POST';

  if (!context.abTesting) {
    return new Response(JSON.stringify({ error: 'A/B testing not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (pathCreate) {
    try {
      const body = (await req.json()) as { name?: string; variants?: { id: string; name: string; weight?: number }[] };
      const name = typeof body.name === 'string' ? body.name : 'Experiment';
      const variants = Array.isArray(body.variants)
        ? (body.variants as { id: string; name: string; weight?: number }[]).map((v) => ({
            id: String(v.id),
            name: String(v.name ?? v.id),
            weight: typeof v.weight === 'number' ? v.weight : 1,
          }))
        : [
            { id: 'control', name: 'Control', weight: 0.5 },
            { id: 'variant', name: 'Variant', weight: 0.5 },
          ];
      const experiment = context.abTesting.createExperiment(name, variants);
      return new Response(JSON.stringify({ experiment }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  if (pathList) {
    const experiments = context.abTesting.listExperiments();
    return new Response(JSON.stringify({ experiments }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (pathMatch) {
    const experimentId = pathMatch[1];
    const action = pathMatch[2];
    if (action === 'assign') {
      const cookieHeader = req.headers.get('cookie');
      const { agentId, setCookieHeader: agentCookie } = getOrSetAgentId(cookieHeader);
      const result = context.abTesting.assignVariant(experimentId, agentId, cookieHeader);
      if (!result) {
        return new Response(JSON.stringify({ error: 'Experiment not found or not running' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (agentCookie) headers.append('Set-Cookie', agentCookie);
      if (result.setCookieHeader) headers.append('Set-Cookie', result.setCookieHeader);
      return new Response(
        JSON.stringify({
          experimentId,
          variantId: result.variantId,
          variantName: result.variantName,
          agentId,
        }),
        { headers }
      );
    }
    if (action === 'results') {
      const result = context.abTesting.getResults(experimentId);
      if (!result) {
        return new Response(JSON.stringify({ error: 'Experiment not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return null;
}

/**
 * Handle social feed: GET /api/social/feed (paginated), POST /api/social/interact.
 */
export async function handleSocialFeedRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/social/feed' && url.pathname !== '/api/social/interact') return null;
  if (!context.socialFeed) {
    return new Response(JSON.stringify({ error: 'Social feed not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.pathname === '/api/social/feed' && req.method === 'GET') {
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
    const posts = context.socialFeed.getFeed(limit, offset);
    return new Response(JSON.stringify({ posts }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.pathname === '/api/social/interact' && req.method === 'POST') {
    try {
      const body = (await req.json()) as { fromAgent?: string; toAgent?: string; interactionType?: string; content?: string };
      const fromAgent = typeof body.fromAgent === 'string' ? body.fromAgent : '';
      const toAgent = typeof body.toAgent === 'string' ? body.toAgent : '';
      const type = typeof body.interactionType === 'string' ? body.interactionType : 'message';
      const content = typeof body.content === 'string' ? body.content : undefined;
      if (!fromAgent || !toAgent) {
        return new Response(JSON.stringify({ error: 'fromAgent and toAgent required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      context.socialFeed.handleSocialInteraction(fromAgent, toAgent, type, content);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  return null;
}

/**
 * Handle analytics: GET /api/analytics/agents/network, GET /api/analytics/agents/heatmap,
 * GET /api/experiments/:id/impact.
 */
export async function handleAnalyticsRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  const networkMatch = url.pathname === '/api/analytics/agents/network' && req.method === 'GET';
  const heatmapMatch = url.pathname === '/api/analytics/agents/heatmap' && req.method === 'GET';
  const impactPath = url.pathname.match(/^\/api\/experiments\/([^/]+)\/impact$/);
  const impactMatch = impactPath && req.method === 'GET';

  if (!context.agentViz) {
    return new Response(JSON.stringify({ error: 'Analytics not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (networkMatch) {
    const agentIdsParam = url.searchParams.get('agents');
    const agentIds = agentIdsParam ? agentIdsParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const network = context.agentViz.visualizeAgentNetwork(agentIds);
    return new Response(JSON.stringify(network), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (heatmapMatch) {
    const timeRangeHours = Math.min(168, Math.max(24, parseInt(url.searchParams.get('hours') || '168', 10) || 168));
    const heatmap = context.agentViz.createInteractionHeatmap(timeRangeHours);
    return new Response(JSON.stringify(heatmap), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (impactMatch && impactPath) {
    const experimentId = impactPath[1];
    const impact = context.agentViz.visualizeExperimentImpact(experimentId);
    if (!impact) {
      return new Response(JSON.stringify({ error: 'Experiment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(impact), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null;
}

/**
 * Golden profile: POST /api/profile/create, GET/POST /api/profile/score.
 */
export async function handleGoldenProfileRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/profile/create' && url.pathname !== '/api/profile/score') return null;
  if (!context.goldenProfile) {
    return new Response(JSON.stringify({ error: 'Golden profile not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const cookieHeader = req.headers.get('cookie');
  const { agentId: resolvedAgentId, setCookieHeader: agentCookie } = getOrSetAgentId(cookieHeader);

  if (url.pathname === '/api/profile/create' && req.method === 'POST') {
    try {
      const body = (await req.json()) as { agentId?: string };
      const agentId = (body?.agentId && typeof body.agentId === 'string') ? body.agentId : resolvedAgentId;
      const profile = context.goldenProfile.createGoldenProfile(agentId, cookieHeader);
      const headers = new Headers({ 'Content-Type': 'application/json' });
      const setCookies = context.goldenProfile.toSetCookieHeaders(cookieHeader, profile);
      for (const h of setCookies) headers.append('Set-Cookie', h);
      if (agentId === resolvedAgentId && agentCookie) headers.append('Set-Cookie', agentCookie);
      return new Response(JSON.stringify({ profile }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (url.pathname === '/api/profile/score' && (req.method === 'GET' || req.method === 'POST')) {
    try {
      let agentId = resolvedAgentId;
      if (req.method === 'POST') {
        const body = (await req.json()) as { agentId?: string };
        if (body?.agentId && typeof body.agentId === 'string') agentId = body.agentId;
      }
      const score = await context.goldenProfile.calculateIntegrationScore(agentId, cookieHeader);
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (agentCookie) headers.append('Set-Cookie', agentCookie);
      return new Response(JSON.stringify(score), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return null;
}

/**
 * Payment: POST /api/payment/link, POST /api/payment/process, POST /api/payment/split, GET /api/payment/transactions, GET /api/payment/gateways.
 */
export async function handlePaymentRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (
    url.pathname !== '/api/payment/link' &&
    url.pathname !== '/api/payment/process' &&
    url.pathname !== '/api/payment/split' &&
    url.pathname !== '/api/payment/transactions' &&
    url.pathname !== '/api/payment/gateways'
  ) return null;
  if (!context.paymentGateway) {
    return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const cookieHeader = req.headers.get('cookie');
  const { agentId, setCookieHeader: agentCookie } = getOrSetAgentId(cookieHeader);

  if (url.pathname === '/api/payment/gateways' && req.method === 'GET') {
    return new Response(JSON.stringify(context.paymentGateway.getGateways()), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.pathname === '/api/payment/transactions' && req.method === 'GET') {
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
    const txs = context.paymentGateway.getTransactions(agentId, limit);
    return new Response(JSON.stringify({ transactions: txs }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.pathname === '/api/payment/link' && req.method === 'POST') {
    try {
      const body = (await req.json()) as { agentId?: string; gateway: string; authData?: Record<string, unknown> };
      const gateway = body?.gateway && typeof body.gateway === 'string' ? body.gateway : 'venmo';
      const aid = body?.agentId && typeof body.agentId === 'string' ? body.agentId : agentId;
      const result = await context.paymentGateway.linkPaymentGateway(aid, gateway, body?.authData ?? {}, cookieHeader);
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (result.setCookieHeaders) for (const h of result.setCookieHeaders) headers.append('Set-Cookie', h);
      if (agentCookie) headers.append('Set-Cookie', agentCookie);
      return new Response(JSON.stringify(result), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (url.pathname === '/api/payment/process' && req.method === 'POST') {
    try {
      const body = (await req.json()) as { agentId?: string; amount: number; gateway?: string; description?: string };
      const amount = Number(body?.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid amount' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const aid = body?.agentId && typeof body.agentId === 'string' ? body.agentId : agentId;
      const tx = await context.paymentGateway.processPayment(
        aid,
        { amount, gateway: body?.gateway, description: body?.description },
        cookieHeader
      );
      return new Response(JSON.stringify(tx), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (url.pathname === '/api/payment/split' && req.method === 'POST') {
    try {
      const body = (await req.json()) as { agentIds: string[]; amount: number; description?: string };
      const agentIds = Array.isArray(body?.agentIds) ? body.agentIds.filter((x): x is string => typeof x === 'string') : [];
      const amount = Number(body?.amount);
      if (agentIds.length === 0 || !Number.isFinite(amount) || amount <= 0) {
        return new Response(JSON.stringify({ error: 'agentIds and amount required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const result = await context.paymentGateway.splitPayment(agentIds, amount, body?.description ?? 'Split payment', cookieHeader);
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return null;
}

/**
 * Apple ID: POST /api/apple/link, GET /api/apple/status, POST /api/apple/findmy.
 */
export async function handleAppleRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/apple/link' && url.pathname !== '/api/apple/status' && url.pathname !== '/api/apple/findmy') return null;
  if (!context.appleID) {
    return new Response(JSON.stringify({ error: 'Apple ID integration not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const cookieHeader = req.headers.get('cookie');
  const { agentId, setCookieHeader: agentCookie } = getOrSetAgentId(cookieHeader);

  if (url.pathname === '/api/apple/status' && req.method === 'GET') {
    const status = context.appleID.getAppleStatus(agentId, cookieHeader);
    return new Response(JSON.stringify(status ?? { linked: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.pathname === '/api/apple/link' && req.method === 'POST') {
    try {
      const body = (await req.json()) as { agentId?: string; appleId: string; password: string };
      const appleId = body?.appleId && typeof body.appleId === 'string' ? body.appleId : '';
      const password = body?.password && typeof body.password === 'string' ? body.password : '';
      if (!appleId) {
        return new Response(JSON.stringify({ error: 'appleId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const aid = body?.agentId && typeof body.agentId === 'string' ? body.agentId : agentId;
      const result = await context.appleID.linkAppleID(aid, appleId, password, cookieHeader);
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (result.setCookieHeaders) for (const h of result.setCookieHeaders) headers.append('Set-Cookie', h);
      if (agentCookie) headers.append('Set-Cookie', agentCookie);
      return new Response(JSON.stringify(result), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (url.pathname === '/api/apple/findmy' && req.method === 'POST') {
    try {
      const body = (await req.json()) as { deviceId: string; action?: 'locate' | 'playSound' | 'lock' | 'erase' };
      const deviceId = body?.deviceId && typeof body.deviceId === 'string' ? body.deviceId : '';
      const action = (body?.action && ['locate', 'playSound', 'lock', 'erase'].includes(body.action)) ? body.action : 'locate';
      if (!deviceId) {
        return new Response(JSON.stringify({ error: 'deviceId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const result = await context.appleID.findMyDevice(deviceId, action, cookieHeader);
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return null;
}

/**
 * Fraud: POST /api/fraud/analyze.
 */
export async function handleFraudAnalyzeRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/fraud/analyze' || req.method !== 'POST') return null;
  if (!context.fraudDetection) {
    return new Response(JSON.stringify({ error: 'Fraud detection not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const body = (await req.json()) as { agentId: string; amount: number; gateway?: string; paymentMethod?: { token: string; gateway: string }; metadata?: Record<string, unknown> };
    const agentId = body?.agentId && typeof body.agentId === 'string' ? body.agentId : '';
    const amount = Number(body?.amount);
    if (!agentId || !Number.isFinite(amount)) {
      return new Response(JSON.stringify({ error: 'agentId and amount required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const analysis = await context.fraudDetection.analyzeTransaction({
      agentId,
      amount,
      gateway: body?.gateway ?? 'venmo',
      paymentMethod: body?.paymentMethod,
      metadata: body?.metadata,
    });
    return new Response(JSON.stringify(analysis), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Behavior: GET /api/behavior/score, GET /api/behavior/leaderboard.
 */
export async function handleBehaviorRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/behavior/score' && url.pathname !== '/api/behavior/leaderboard') return null;
  if (!context.agentBehaviorScorer) {
    return new Response(JSON.stringify({ error: 'Behavior scorer not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const cookieHeader = req.headers.get('cookie');
  const { agentId } = getOrSetAgentId(cookieHeader);

  if (url.pathname === '/api/behavior/score' && req.method === 'GET') {
    const agentIdParam = url.searchParams.get('agentId');
    const aid = (agentIdParam && typeof agentIdParam === 'string') ? agentIdParam : agentId;
    const result = await context.agentBehaviorScorer.analyzeAgentBehavior(aid);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  }

  if (url.pathname === '/api/behavior/leaderboard' && req.method === 'GET') {
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
    const metric = (url.searchParams.get('metric') as 'totalScore' | 'productivity' | 'collaboration') || 'totalScore';
    const leaderboard = await context.agentBehaviorScorer.createLeaderboard(metric, limit);
    return new Response(JSON.stringify({ leaderboard }), { headers: { 'Content-Type': 'application/json' } });
  }

  return null;
}

/**
 * Handle dashboard preferences API (GET/POST)
 * Cookie-managed preferences; uses Bun.CookieMap and Set-Cookie on response.
 */
export async function handleDashboardPreferencesRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/api/dashboard/preferences') return null;

  const cookieHeader = req.headers.get('cookie');

  if (req.method === 'GET') {
    const prefs = getDashboardPreferences(cookieHeader);
    return new Response(JSON.stringify(prefs), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as { theme?: string; layout?: string; sidebarCollapsed?: boolean; fontSize?: string };
      const { preferences, headers } = updatePreferencesFromBody(cookieHeader, body);
      const resHeaders = new Headers({ 'Content-Type': 'application/json' });
      for (const h of headers) resHeaders.append('Set-Cookie', h);
      return new Response(JSON.stringify({ success: true, preferences }), { headers: resHeaders });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return null;
}

/**
 * Handle root route (serve HTML page)
 * Injects cookie-based preferences (theme, etc.) and sets visit cookies.
 */
export async function handleRootRoute(req: Request, context: RouteContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== '/' && !url.pathname.startsWith('/api/') && url.pathname !== '/ws') return null;
  if (url.pathname !== '/') return null;

  const cookieHeader = req.headers.get('cookie');
  const prefs = getDashboardPreferences(cookieHeader);
  let pageHtml = await context.getPageHtml();
  pageHtml = injectPreferencesIntoHtml(pageHtml, prefs);

  const { headers: setCookieHeaders } = setVisitCookies(cookieHeader);
  const headers = new Headers({ 'Content-Type': 'text/html' });
  for (const h of setCookieHeaders) headers.append('Set-Cookie', h);

  return new Response(pageHtml, { headers });
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
    () => handleDashboardPreferencesRoute(req),
    () => handleMyDevicesRoute(req),
    () => handleFragmentDeviceRoute(req, context),
    () => handleDevicesCompareRoute(req, context),
    () => handleReportsGenerateRoute(req, context),
    () => handleDeviceAlertsRoute(req, context),
    () => handleAgentIdRoute(req),
    () => handleExperimentsRoute(req, context),
    () => handleSocialFeedRoute(req, context),
    () => handleAnalyticsRoute(req, context),
    () => handleGoldenProfileRoute(req, context),
    () => handlePaymentRoute(req, context),
    () => handleAppleRoute(req, context),
    () => handleFraudAnalyzeRoute(req, context),
    () => handleBehaviorRoute(req, context),
    () => handleDashboardGroupsRoute(req),
    () => handleDeviceTagsRoute(req),
    () => handleOpenFileRoute(req),
    () => handleHistoryRoute(req),
    () => handleProfileMetricsRoute(req),
    () => handleP2PMetricsRoute(req),
    () => handleProfileTrendsRoute(req),
    () => handleCsvExportRoute(req, context),
    () => handleJsonExportRoute(req, context),
    () => handleFraudRoutes(req, context),
    () => handleWebhookHealthRoute(req), // Webhook health check (before general health)
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
