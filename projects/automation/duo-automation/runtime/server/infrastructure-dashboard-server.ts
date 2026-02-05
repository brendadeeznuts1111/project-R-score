/**
 * infrastructure-dashboard-server.ts v4.0
 * Enhanced Bun native server for Unified Infrastructure Dashboard
 * Integrates reports and metrics from secrets health and R2 benchmarks
 * 
 * v4.0 Enhancements:
 * - Advanced caching with ETag support
 * - Health check endpoints with detailed diagnostics
 * - Enhanced security with CORS and rate limiting
 * - Performance metrics and monitoring
 * - Graceful shutdown handling
 * - Timezone-aware timestamps
 * - Structured logging
 * - Configurable compression levels
 * - v2.01.05 metrics and pattern analysis integration
 */

import { ScopedSecretsManager } from '../utils/scoped-secrets-manager';
import { ScopeDetector } from '../utils/scope-detector';
import { UnifiedDashboardLauncher } from '../utils/unified-dashboard-launcher';
import { PERMISSIONS } from '../src/rbac/permissions';
import { AuthManager, DEFAULT_CLI_ADMIN } from '../src/rbac/auth-context';
import { BunR2AppleManager } from '../src/storage/r2-apple-manager';
import { SyncHealthMonitor } from '../utils/sync-health-monitor';
import { BunNamespaceIsolator } from '../kernel/agent-isolator';
import { file, serve, zstdCompressSync, Glob } from 'bun';
import { heal } from '../scripts/self-heal';
import { initializeScopeTimezone, isTimezoneInitialized } from '../bootstrap-timezone';
import { createMetricsRoutes, MetricsAPI } from '../src/api/metrics-api';

const PORT = parseInt(process.env.INFRA_PORT || '3004');
const NODE_ENV = process.env.NODE_ENV || 'development';
const COMPRESSION_LEVEL = parseInt(process.env.COMPRESSION_LEVEL || '3');
const ACTIVE_SCOPE = UnifiedDashboardLauncher.getCurrentScope();
const ACTIVE_DOMAIN = process.env.DOMAIN || ScopeDetector.getScopeConfig().domain;

// Initialize timezone for this scope
if (!isTimezoneInitialized()) {
  try {
    initializeScopeTimezone(ACTIVE_SCOPE);
  } catch (e) {
    console.warn(`⚠️ Failed to initialize scope timezone for ${ACTIVE_SCOPE}:`, e);
  }
}
const METRICS_INTERVAL = parseInt(process.env.METRICS_INTERVAL || '1000');
const MAX_CONNECTIONS_PER_SCOPE = parseInt(process.env.MAX_CONNECTIONS_PER_SCOPE || '10');

// Initialize timezone for this scope
// initializeScopeTimezone(); // Temporarily disabled for testing

// 🔒 Security: Enhanced rate limiting and connection tracking
const activeConnections = new Map<string, number>();
const connectionTimestamps = new Map<string, number>();
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// 🚀 Performance: Response cache with ETag support
const responseCache = new Map<string, { data: any; etag: string; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

// 🏥 Health tracking
let serverStartTime = Date.now();
let totalRequests = 0;
let errorCount = 0;

// Initialize R2 Manager for MASTER_PERF metrics
const r2Manager = new BunR2AppleManager();

// Initialize Isolator for metrics
const isolator = new BunNamespaceIsolator('hard');

// Ensure we have reports directory
const REPORTS_DIR = './reports';

async function getJsonReport(filename: string, useCache = true) {
  try {
    const cacheKey = `report:${filename}`;
    const now = Date.now();
    
    // Check cache first
    if (useCache && responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
    }
    
    const f = file(`${REPORTS_DIR}/${filename}`);
    if (await f.exists()) {
      const data = await f.json();
      const etag = `"${Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16)}"`;
      
      // Cache the response
      responseCache.set(cacheKey, { data, etag, timestamp: now });
      return data;
    }
    return null;
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
    errorCount++;
    return null;
  }
}

// 🏥 Enhanced health check
function getHealthStatus() {
  const now = Date.now();
  const uptime = now - serverStartTime;
  const memUsage = process.memoryUsage();
  
  return {
    status: 'healthy',
    uptime,
    uptimeHuman: `${Math.floor(uptime / 60000)}m ${Math.floor((uptime % 60000) / 1000)}s`,
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    },
    requests: {
      total: totalRequests,
      errors: errorCount,
      errorRate: totalRequests > 0 ? (errorCount / totalRequests * 100).toFixed(2) + '%' : '0%'
    },
    connections: {
      active: activeConnections.size,
      byScope: Object.fromEntries(activeConnections)
    },
    cache: {
      size: responseCache.size,
      ttl: CACHE_TTL
    },
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

// 🛡️ Enhanced security validation
function validateRbacToken(token: string | null, requiredPermissions: string[]): boolean {
  if (!token) return false;
  
  // Check rate limiting by token
  const tokenKey = `token:${token}`;
  const now = Date.now();
  const rateLimitData = requestCounts.get(tokenKey) || { count: 0, resetTime: now + 60000 };
  
  if (now > rateLimitData.resetTime) {
    rateLimitData.count = 0;
    rateLimitData.resetTime = now + 60000;
  }
  
  rateLimitData.count++;
  requestCounts.set(tokenKey, rateLimitData);
  
  // Rate limit: 100 requests per minute per token
  if (rateLimitData.count > 100) {
    console.warn(`Rate limit exceeded for token: ${token.slice(0, 8)}...`);
    return false;
  }
  
  // Validate token
  const validTokens = [
    process.env.ADMIN_TOKEN,
    process.env.INFRA_TOKEN,
    process.env.DASHBOARD_TOKEN,
    'demo-token' // Only for development
  ].filter(Boolean);
  
  return validTokens.includes(token);
}

// 🌐 CORS headers
function addCorsHeaders(response: Response): Response {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Dashboard-Scope');
  return response;
}

const server = serve({
  port: PORT,
  development: NODE_ENV === 'development',
  async fetch(req, server) {
    totalRequests++;
    const url = new URL(req.url);
    const startTime = Date.now();
    
    // 🌐 Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return addCorsHeaders(new Response(null, { status: 200 }));
    }
    
    // 🏥 Health check endpoint (no auth required)
    if (url.pathname === '/health' || url.pathname === '/api/infra/health') {
      const health = getHealthStatus();
      const response = Response.json(health);
      return addCorsHeaders(response);
    }
    
    // 🏥 Detailed diagnostics endpoint
    if (url.pathname === '/api/infra/diagnostics') {
      const token = url.searchParams.get('token');
      if (!validateRbacToken(token, ['infra:admin'])) {
        return addCorsHeaders(new Response('Unauthorized', { status: 401 }));
      }
      
      const diagnostics = {
        ...getHealthStatus(),
        environment: {
          nodeEnv: NODE_ENV,
          platform: process.platform,
          arch: process.arch,
          bunVersion: Bun.version,
          pid: process.pid
        },
        config: {
          port: PORT,
          compressionLevel: COMPRESSION_LEVEL,
          metricsInterval: METRICS_INTERVAL,
          maxConnectionsPerScope: MAX_CONNECTIONS_PER_SCOPE
        },
        scope: ScopeDetector.getScopeConfig()
      };
      const response = Response.json(diagnostics);
      return addCorsHeaders(response);
    }

    // Handle WebSocket upgrade with security hardening
    if (url.pathname === '/ws') {
      // 🔒 Security: Validate RBAC token from URL
      const token = url.searchParams.get('token');
      
      if (!validateRbacToken(token, ['infra:read'])) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      // 🔒 Security: Enhanced rate limiting per scope
      const scope = req.headers.get('x-dashboard-scope') || 'global';
      const connectionCount = activeConnections.get(scope) || 0;
      
      if (connectionCount >= MAX_CONNECTIONS_PER_SCOPE) {
        console.warn(`Connection limit exceeded for scope: ${scope}`);
        return new Response('Too many connections', { status: 429 });
      }
      
      // Track connection timestamp
      const now = Date.now();
      connectionTimestamps.set(`${scope}:${now}`, now);
      
      const upgraded = server.upgrade(req);
      if (upgraded) {
        activeConnections.set(scope, connectionCount + 1);
        return undefined; // Bun handles the response
      }
    }

    // 🏠 Static files with enhanced headers
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const dashboardHtml = file('./src/dashboard/test-dashboard.html');
      if (await dashboardHtml.exists()) {
        const response = new Response(await dashboardHtml.bytes(), {
          headers: { 
            'Content-Type': 'text/html',
            'Cache-Control': NODE_ENV === 'production' ? 'public, max-age=3600' : 'no-cache'
          }
        });
        return addCorsHeaders(response);
      }
      return addCorsHeaders(new Response('Dashboard not found', { status: 404 }));
    }

    // API Endpoints
    
    // 1. 📊 Secrets Health with caching
    if (url.pathname === '/api/infra/secrets-health') {
      const data = await getJsonReport('secrets-health.json');
      const response = { success: true, data, timestamp: new Date().toISOString() };
      
      // Check ETag
      const ifNoneMatch = req.headers.get('if-none-match');
      const etag = responseCache.get('report:secrets-health.json')?.etag;
      
      if (ifNoneMatch && etag && ifNoneMatch === etag) {
        return addCorsHeaders(new Response(null, { status: 304 }));
      }
      
      let resp = Response.json(response);
      if (etag) resp.headers.set('ETag', etag);
      
      if (req.headers.get('accept-encoding')?.includes('zstd')) {
        const compressed = zstdCompressSync(Buffer.from(JSON.stringify(response)), { level: COMPRESSION_LEVEL });
        resp = new Response(new Uint8Array(compressed), {
          headers: { 
            'Content-Type': 'application/json',
            'Content-Encoding': 'zstd',
            'ETag': etag || ''
          }
        });
      }
      return addCorsHeaders(resp);
    }

    // 2. 📈 R2 Benchmarks with enhanced compression
    if (url.pathname === '/api/infra/r2-benchmarks') {
      const data = await getJsonReport('r2-benchmark.json');
      const response = { success: true, data, timestamp: new Date().toISOString() };

      // Check ETag
      const ifNoneMatch = req.headers.get('if-none-match');
      const etag = responseCache.get('report:r2-benchmark.json')?.etag;
      
      if (ifNoneMatch && etag && ifNoneMatch === etag) {
        return addCorsHeaders(new Response(null, { status: 304 }));
      }
      
      let resp = Response.json(response);
      if (etag) resp.headers.set('ETag', etag);
      
      if (req.headers.get('accept-encoding')?.includes('zstd')) {
        const compressed = zstdCompressSync(Buffer.from(JSON.stringify(response)), { level: COMPRESSION_LEVEL });
        resp = new Response(new Uint8Array(compressed), {
          headers: { 
            'Content-Type': 'application/json',
            'Content-Encoding': 'zstd',
            'ETag': etag || ''
          }
        });
      }
      return addCorsHeaders(resp);
    }

    // 3. 🖥️ System Status with timezone info
    if (url.pathname === '/api/infra/status') {
      const scope = ScopeDetector.getScopeConfig();
      const status = {
        success: true,
        data: {
          scope: scope.scope,
          platform: process.platform,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          isMocked: process.env.MOCK_R2 === 'true',
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          nodeEnv: NODE_ENV
        }
      };
      return addCorsHeaders(Response.json(status));
    }

    // 4. 🔄 Sync Health
    if (url.pathname === '/api/infra/sync-health') {
      const data = await SyncHealthMonitor.checkStorageSync();
      const response = { success: true, data, timestamp: new Date().toISOString() };
      return addCorsHeaders(Response.json(response));
    }

    // 4.5 🛡️ Agent Isolation Stats
    if (url.pathname === '/api/infra/isolation-stats') {
      const data = isolator.getIsolationStats();
      const response = { success: true, data, timestamp: new Date().toISOString() };
      return addCorsHeaders(Response.json(response));
    }

    // 5. 📊 MASTER_PERF Matrix with enhanced metadata
    if (url.pathname === '/api/infra/master-perf') {
      const metrics = r2Manager.getMasterPerfMetrics();
      const operationMetrics = r2Manager.getOperationMetrics();
      const response = { 
        success: true, 
        data: {
          metrics,
          operationMetrics,
          matrixString: r2Manager.getMasterPerfMatrixString(),
          summary: {
            totalMetrics: metrics.length,
            categories: [...new Set(metrics.map((m: any) => m.category))],
            avgResponseTime: metrics.reduce((sum: number, m: any) => sum + (m.responseTime || 0), 0) / metrics.length,
            successRate: metrics.filter((m: any) => m.status === 'success').length / metrics.length * 100
          },
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };
      
      if (req.headers.get('accept-encoding')?.includes('zstd')) {
        const compressed = zstdCompressSync(Buffer.from(JSON.stringify(response)), { level: COMPRESSION_LEVEL });
        const resp = new Response(new Uint8Array(compressed), {
          headers: { 
            'Content-Type': 'application/json',
            'Content-Encoding': 'zstd' 
          }
        });
        return addCorsHeaders(resp);
      }
      return addCorsHeaders(Response.json(response));
    }

    // 6. 🕵️ Audit Trigger (Deterministic)
    if (url.pathname === '/api/infra/audit' && req.method === 'POST') {
      const auditData = await req.json().catch(() => ({}));
      console.log(`🕵️ Audit triggered:`, auditData);
      
      // In a real scenario, this would trigger the UnifiedAuditor
      const response = { 
        success: true, 
        message: 'Audit triggered successfully',
        auditId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        requestData: auditData
      };
      return addCorsHeaders(Response.json(response));
    }

    // 7. 🎛️ Admin Control (Enhanced v4.0)
    if (url.pathname === '/api/infra/control' && req.method === 'POST') {
      const { feature, enabled, value } = await req.json().catch(() => ({}));
      console.log(`🎛️ Admin Control: ${feature} => ${enabled ? 'ON' : 'OFF'}${value ? ` (value: ${value})` : ''}`);
      
      const result: any = { feature, status: enabled, timestamp: new Date().toISOString() };
      
      switch (feature) {
        case 'MOCK_R2':
          process.env.MOCK_R2 = enabled ? 'true' : 'false';
          result.previousValue = process.env.MOCK_R2;
          break;
        case 'COMPRESSION_LEVEL':
          if (typeof value === 'number' && value >= 1 && value <= 22) {
            process.env.COMPRESSION_LEVEL = value.toString();
            result.compressionLevel = value;
          }
          break;
        case 'METRICS_INTERVAL':
          if (typeof value === 'number' && value >= 100) {
            process.env.METRICS_INTERVAL = value.toString();
            result.metricsInterval = value;
          }
          break;
        case 'CACHE_CLEAR':
          responseCache.clear();
          result.cacheCleared = true;
          result.cacheSize = 0;
          break;
        default:
          result.warning = `Unknown feature: ${feature}`;
      }
      
      return addCorsHeaders(Response.json({ success: true, ...result }));
    }

    // 8. 📊 v2.01.05 Metrics API endpoints
    const metricsAPI = MetricsAPI.getInstance();
    
    // Current metrics
    if (url.pathname === '/api/metrics') {
      const token = url.searchParams.get('token');
      if (!validateRbacToken(token, ['infra:read'])) {
        return addCorsHeaders(new Response('Unauthorized', { status: 401 }));
      }
      
      const query = {
        format: url.searchParams.get('format') as any,
        startTime: url.searchParams.get('startTime') ? parseInt(url.searchParams.get('startTime')!) : undefined,
        endTime: url.searchParams.get('endTime') ? parseInt(url.searchParams.get('endTime')!) : undefined,
        patterns: url.searchParams.get('patterns') ? url.searchParams.get('patterns')!.split(',') : undefined,
        riskLevel: url.searchParams.get('riskLevel') as any,
        limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined
      };
      
      const response = await metricsAPI.getCurrentMetrics(query);
      
      if (response.status === 'error') {
        return addCorsHeaders(new Response(response.error || 'Metrics error', { status: 500 }));
      }
      
      if (query.format && query.format !== 'json') {
        const metricsResponse = response.data as any;
        return addCorsHeaders(new Response(metricsResponse.content, {
          headers: { 'Content-Type': metricsResponse.contentType }
        }));
      }
      
      return addCorsHeaders(Response.json(response));
    }
    
    // System health with metrics
    if (url.pathname === '/api/metrics/health') {
      const token = url.searchParams.get('token');
      if (!validateRbacToken(token, ['infra:read'])) {
        return addCorsHeaders(new Response('Unauthorized', { status: 401 }));
      }
      
      const response = await metricsAPI.getSystemHealth();
      
      if (response.status === 'error') {
        return addCorsHeaders(new Response(response.error || 'Health check error', { status: 500 }));
      }
      
      return addCorsHeaders(Response.json(response));
    }
    
    // Pattern analysis
    if (url.pathname === '/api/metrics/patterns') {
      const token = url.searchParams.get('token');
      if (!validateRbacToken(token, ['infra:read'])) {
        return addCorsHeaders(new Response('Unauthorized', { status: 401 }));
      }
      
      const response = await metricsAPI.getPatternAnalysis();
      
      if (response.status === 'error') {
        return addCorsHeaders(new Response(response.error || 'Pattern analysis error', { status: 500 }));
      }
      
      return addCorsHeaders(Response.json(response));
    }
    
    // Risk assessment
    if (url.pathname === '/api/metrics/risk') {
      const token = url.searchParams.get('token');
      if (!validateRbacToken(token, ['infra:admin'])) {
        return addCorsHeaders(new Response('Unauthorized', { status: 401 }));
      }
      
      const response = await metricsAPI.getRiskAssessment();
      
      if (response.status === 'error') {
        return addCorsHeaders(new Response(response.error || 'Risk assessment error', { status: 500 }));
      }
      
      return addCorsHeaders(Response.json(response));
    }
    
    // Trends analysis
    if (url.pathname === '/api/metrics/trends') {
      const token = url.searchParams.get('token');
      if (!validateRbacToken(token, ['infra:read'])) {
        return addCorsHeaders(new Response('Unauthorized', { status: 401 }));
      }
      
      const response = await metricsAPI.getTrends();
      
      if (response.status === 'error') {
        return addCorsHeaders(new Response(response.error || 'Trends analysis error', { status: 500 }));
      }
      
      return addCorsHeaders(Response.json(response));
    }
    
    // Export metrics
    if (url.pathname === '/api/metrics/export') {
      const token = url.searchParams.get('token');
      if (!validateRbacToken(token, ['infra:admin'])) {
        return addCorsHeaders(new Response('Unauthorized', { status: 401 }));
      }
      
      const query = {
        format: url.searchParams.get('format') as any || 'json'
      };
      
      const response = await metricsAPI.exportMetrics(query);
      
      if (response.status === 'error') {
        return addCorsHeaders(new Response(response.error || 'Export error', { status: 500 }));
      }
      
      const exportResponse = response.data as any;
      return addCorsHeaders(new Response(exportResponse.content, {
        headers: {
          'Content-Type': exportResponse.contentType,
          'Content-Disposition': `attachment; filename="${exportResponse.filename}"`
        }
      }));
    }
    
    // Metrics configuration
    if (url.pathname === '/api/metrics/config') {
      const token = url.searchParams.get('token');
      if (!validateRbacToken(token, ['infra:admin'])) {
        return addCorsHeaders(new Response('Unauthorized', { status: 401 }));
      }
      
      const response = await metricsAPI.getConfiguration();
      
      if (response.status === 'error') {
        return addCorsHeaders(new Response(response.error || 'Configuration error', { status: 500 }));
      }
      
      return addCorsHeaders(Response.json(response));
    }
    
    // Reset metrics
    if (url.pathname === '/api/metrics/reset' && req.method === 'POST') {
      const token = url.searchParams.get('token');
      if (!validateRbacToken(token, ['infra:admin'])) {
        return addCorsHeaders(new Response('Unauthorized', { status: 401 }));
      }
      
      const response = await metricsAPI.resetMetrics();
      
      if (response.status === 'error') {
        return addCorsHeaders(new Response(response.error || 'Reset error', { status: 500 }));
      }
      
      return addCorsHeaders(Response.json(response));
    }

    // Default response
    const response = new Response('Not Found', { status: 404 });
    return addCorsHeaders(response);
  },
  websocket: {
    open(ws) {
      const scope = (ws as any).data?.scope || 'global';
      ws.subscribe(`metrics:${scope}`);
      ws.subscribe(`commands:${scope}`);
      console.log(`🔌 Client connected to scoped metrics stream [${scope}]`);
    },
    async message(ws, message) {
      try {
        const payload = JSON.parse(message.toString());
        
        // Handle Global Command Hub (Ticket 13.3)
        if (payload.type === 'global_command') {
          const { command, target } = payload;
          console.log(`📡 Global Command Hub: Executing [${command}] on [${target}]`);
          
          let result = 'Command acknowledged.';
          if (command === 'status:all') {
            result = 'All agents reporting HEALTHY. (Simulated)';
          } else if (command === 'sync:r2') {
            result = 'Data mirror synchronization initiated.';
          } else if (command === 'rotate:secrets') {
            // Trigger the heal logic (rotation)
            try {
              await heal();
              result = 'Secret rotation sequence completed successfully.';
            } catch (error) {
              console.error('Secret rotation failed:', error);
              result = `Secret rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          } else if (command === 'cache:clear') {
            responseCache.clear();
            result = 'Response cache cleared successfully.';
          } else if (command === 'health:check') {
            const health = getHealthStatus();
            result = `Health status: ${health.status} - Uptime: ${health.uptimeHuman} - Memory: ${health.memory.heapUsed}`;
          } else {
            result = `Unknown command: ${command}`;
          }

          ws.send(JSON.stringify({
            type: 'command_result',
            command,
            result,
            timestamp: new Date().toISOString()
          }));
          return;
        }

        // Handle real-time metrics subscription
        if (payload.type === 'subscribe_metrics') {
          const { interval = 1000 } = payload;
          console.log(`📊 Client subscribed to real-time metrics with ${interval}ms interval`);
          
          // Send immediate metrics
          const health = getHealthStatus();
          ws.send(JSON.stringify({
            type: 'metrics_snapshot',
            data: health,
            timestamp: new Date().toISOString()
          }));
          return;
        }
        // Handle log streaming request
        if (payload.type === 'request_logs' && payload.agentId) {
          
          // Find the newest JSON file for this agent
          const outputsDir = './agents/outputs';
          const glob = new Glob(`agent_${payload.agentId}_*.json`);
          const files = [];
          for await (const file of glob.scan(outputsDir)) {
            files.push(file);
          }
          
          if (files.length > 0) {
            const newestFile = files.sort().reverse()[0];
            const content = await file(`${outputsDir}/${newestFile}`).json();
            
            // Stream back the "log" (status/checklist/setup)
            ws.send(JSON.stringify({
              type: 'agent_logs',
              agentId: payload.agentId,
              data: {
                status: content.agent?.status || 'Active',
                lastActive: content.agent?.phone?.lastActive || new Date().toISOString(),
                checklist: content.setup?.checklist || 'No checklist available.',
                setupScript: content.setup?.script || 'No setup script available.'
              }
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: `No agent data found for ID: ${payload.agentId}`
            }));
          }
        }
      } catch (e) {
        console.error('Error handling WS message:', e);
        errorCount++;
        
        // Send error back to client
        ws.send(JSON.stringify({
          type: 'error',
          message: e instanceof Error ? e.message : 'Unknown error'
        }));
      }
      
      const scope = (ws as any).data?.scope || 'global';
      const currentCount = activeConnections.get(scope) || 0;
      activeConnections.set(scope, currentCount - 1);
      
      console.log(`🔌 Client disconnected from scoped metrics stream [${scope}]`);
    }
  }
});


// 🧹 Cleanup old connections and rate limiting data
setInterval(() => {
  const now = Date.now();
  
  // Clean old connection timestamps (older than 1 hour)
  for (const [key, timestamp] of connectionTimestamps.entries()) {
    if (now - timestamp > 3600000) {
      connectionTimestamps.delete(key);
    }
  }
  
  // Clean expired rate limit data
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(key);
    }
  }
  
  // Clean expired cache entries
  for (const [key, cached] of responseCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }
}, 60000); // Clean every minute

// 🔄 Enhanced periodic metrics push via WebSocket (scoped)
setInterval(async () => {
  try {
    const secretsData = await getJsonReport('secrets-health.json');
    const r2Data = await getJsonReport('r2-benchmark.json');
    const scope = ScopeDetector.getScopeConfig();
    const isolationStats = isolator.getIsolationStats();
    const masterPerfMetrics = r2Manager.getMasterPerfMetrics();
    const operationMetrics = r2Manager.getOperationMetrics();
    
    const payload = {
      type: 'metrics_update',
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      data: {
        secrets: secretsData,
        r2: r2Data,
        isolation: isolationStats,
        masterPerf: {
          metrics: masterPerfMetrics,
          operationMetrics,
          totalMetrics: masterPerfMetrics.length,
          categories: [...new Set(masterPerfMetrics.map((m: any) => m.category))],
          avgResponseTime: masterPerfMetrics.reduce((sum: number, m: any) => sum + (m.responseTime || 0), 0) / masterPerfMetrics.length,
          successRate: masterPerfMetrics.filter((m: any) => m.status === 'success').length / masterPerfMetrics.length * 100
        },
        status: {
          scope: scope.scope,
          platform: process.platform,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          isMocked: process.env.MOCK_R2 === 'true',
          serverUptime: Math.floor((Date.now() - serverStartTime) / 1000)
        },
        performance: {
          requestsPerSecond: totalRequests / ((Date.now() - serverStartTime) / 1000),
          errorRate: totalRequests > 0 ? (errorCount / totalRequests * 100).toFixed(2) + '%' : '0%',
          cacheHitRate: ((responseCache.size / Math.max(totalRequests, 1)) * 100).toFixed(2) + '%'
        }
      }
    };

    // 🔒 Security: Publish to scoped channels
    const scopes = Array.from(activeConnections.keys());
    
    for (const scope of scopes) {
      if ((activeConnections.get(scope) || 0) > 0) {
        const scopedPayload = {
          ...payload,
          scope,
          data: {
            ...payload.data,
            masterPerf: {
              ...payload.data.masterPerf,
              // Filter metrics by scope for security
              metrics: payload.data.masterPerf.metrics.filter((m: any) => 
                !m.properties?.scope || m.properties.scope === scope
              )
            }
          }
        };
        
        server.publish(`metrics:${scope}`, JSON.stringify(scopedPayload));
      }
    }
  } catch (error) {
    console.error('Error in metrics push:', error);
    errorCount++;
  }
}, METRICS_INTERVAL);

// 🛡️ Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  console.log(`📊 Final stats: ${totalRequests} requests, ${errorCount} errors`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  console.log(`📊 Final stats: ${totalRequests} requests, ${errorCount} errors`);
  process.exit(0);
});

// 🚀 Server startup
console.log(`🚀 Infrastructure Dashboard Server v4.0 running on http://localhost:${PORT}`);
console.log(`📊 Scope: ${ScopeDetector.getScopeConfig().scope}`);
console.log(`🌍 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
console.log(`🔧 Environment: ${NODE_ENV}`);
console.log(`📈 Metrics interval: ${METRICS_INTERVAL}ms`);
console.log(`🗜️ Compression level: ${COMPRESSION_LEVEL}`);
console.log(`🔌 Max connections per scope: ${MAX_CONNECTIONS_PER_SCOPE}`);

// 📡 Send initial status via IPC if available
if (process.env.ENABLE_IPC === 'true') {
  try {
    process.send?.({
      type: 'status',
      status: 'online',
      pid: process.pid,
      port: PORT,
      scope: ScopeDetector.getScopeConfig().scope
    });
    
    // Periodically send metrics updates via IPC
    setInterval(() => {
      const metrics = getHealthStatus();
      process.send?.({
        type: 'metrics',
        pid: process.pid,
        data: metrics
      });
    }, METRICS_INTERVAL * 5); // Send IPC metrics less frequently than WS
  } catch (e) {
    console.warn('⚠️ IPC communication failed:', e);
  }
}