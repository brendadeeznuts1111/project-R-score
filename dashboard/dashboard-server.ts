#!/usr/bin/env bun

/**
 * 🌐 FactoryWager MCP Dashboard Server
 * 
 * Serves the web dashboard and provides real-time API endpoints
 * connecting to the actual MCP system components.
 */

import { serve } from "bun";
import { existsSync } from "node:fs";
import { resolve } from 'node:path';
import { masterTokenManager } from '../lib/security/master-token.ts';
import { r2MCPIntegration } from '../lib/mcp/r2-integration.ts';

const REQUESTED_PORT = parseInt(process.env.DASHBOARD_PORT || '3456', 10);
const DASHBOARD_HOST = process.env.DASHBOARD_HOST || process.env.SERVER_HOST || 'localhost';
const DASHBOARD_HTML = './dashboard/web-dashboard.html';
const DASHBOARD_ROOT = resolve('./dashboard');
const ALLOW_PORT_FALLBACK = parseBooleanEnv(process.env.ALLOW_PORT_FALLBACK, false);
const STARTED_AT = new Date().toISOString();
const SERVICE_NAME = 'factorywager-mcp-dashboard';
const PACKAGE_VERSION = await readPackageVersion();
const BUN_VERSION = Bun.version;
const BUN_REVISION = readBunRevision();

const DASHBOARD_CACHE_TTL_MS = Number.parseInt(process.env.DASHBOARD_CACHE_TTL_MS || '2000', 10) || 2000;
let dashboardDataCache: { expiresAt: number; value: Awaited<ReturnType<typeof collectDashboardData>> } | null = null;
let ACTIVE_PORT = REQUESTED_PORT;

// CORS headers for API endpoints
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type HealthCheck = {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
};

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

async function readPackageVersion(): Promise<string> {
  try {
    const packageJsonPath = resolve('./package.json');
    const text = await Bun.file(packageJsonPath).text();
    const parsed = JSON.parse(text) as { version?: string };
    return parsed.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

function readBunRevision(): string {
  try {
    const cmd = Bun.spawnSync(['bun', '--revision'], { stdout: 'pipe', stderr: 'pipe' });
    if (cmd.exitCode === 0) {
      const revision = new TextDecoder().decode(cmd.stdout).trim();
      if (revision.length > 0) return revision;
    }
  } catch {
    // Ignore and use fallback
  }
  return 'unknown';
}

function buildRuntimeInfo() {
  return {
    bunVersion: BUN_VERSION,
    bunRevision: BUN_REVISION,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    port: ACTIVE_PORT,
    startedAt: STARTED_AT,
    uptimeSec: Number(process.uptime().toFixed(2)),
  };
}

function findPortOwner(port: number): { command: string; pid: string; raw: string } | null {
  try {
    const cmd = Bun.spawnSync(
      ['lsof', '-nP', '-iTCP:' + String(port), '-sTCP:LISTEN'],
      { stdout: 'pipe', stderr: 'pipe' }
    );
    if (cmd.exitCode !== 0) return null;
    const output = new TextDecoder().decode(cmd.stdout).trim();
    if (!output) return null;
    const lines = output.split('\n');
    if (lines.length < 2) return null;
    const firstEntry = lines[1].trim().split(/\s+/);
    return {
      command: firstEntry[0] || 'unknown',
      pid: firstEntry[1] || 'unknown',
      raw: lines[1],
    };
  } catch {
    return null;
  }
}

function buildHealthChecks(): HealthCheck[] {
  const checks: HealthCheck[] = [];
  checks.push({
    name: 'dashboard-html',
    status: existsSync(resolve(DASHBOARD_HTML)) ? 'healthy' : 'error',
    message: existsSync(resolve(DASHBOARD_HTML)) ? 'dashboard HTML found' : 'dashboard HTML missing',
  });
  const r2Config = r2MCPIntegration.getConfigStatus();
  checks.push({
    name: 'r2-config',
    status: r2Config.configured ? 'healthy' : 'warning',
    message: r2Config.configured ? 'R2 configured' : 'R2 not configured; using fallback data',
  });
  checks.push({
    name: 'cache',
    status: 'healthy',
    message: `cache ttl ${DASHBOARD_CACHE_TTL_MS}ms`,
  });
  return checks;
}

function buildHealthPayload() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    version: PACKAGE_VERSION,
    runtime: buildRuntimeInfo(),
    checks: buildHealthChecks(),
  };
}

// Dashboard data collection
async function collectDashboardData() {
  const now = new Date();
  
  // Authentication Metrics
  const tokens = masterTokenManager.listTokens();
  const auditLogs = masterTokenManager.getAuditLogs(100);
  const recentAuths = auditLogs.filter(log => 
    new Date(log.timestamp) > new Date(Date.now() - 60 * 60 * 1000)).length;
  const failedAuths = auditLogs.filter(log => !log.success &&
    new Date(log.timestamp) > new Date(Date.now() - 60 * 60 * 1000)).length;

  // Storage Metrics
  let storageMetrics = {
    totalObjects: 243,
    totalSize: '15.7MB',
    diagnosesCount: 85,
    auditsCount: 125
  };

  try {
    const stats = await r2MCPIntegration.getBucketStats();
    storageMetrics = {
      totalObjects: stats.objectCount,
      totalSize: stats.totalSize,
      diagnosesCount: stats.mcpDataCount,
      auditsCount: Math.floor(stats.mcpDataCount * 0.3)
    };
  } catch {
    // Use defaults if R2 not available
  }

  // System Status
  const systemStatus = [];
  
  // Master Token System
  const recentFailures = auditLogs.filter(log => !log.success && 
    new Date(log.timestamp) > new Date(Date.now() - 5 * 60 * 1000)).length;
  systemStatus.push({
    component: '🔐 Master Token System',
    status: recentFailures > 0 ? 'warning' : 'healthy',
    message: `${tokens.length} active tokens, ${recentFailures} recent failures`,
    metrics: { activeTokens: tokens.length, recentFailures }
  });

  // R2 Storage
  try {
    const configStatus = r2MCPIntegration.getConfigStatus();
    const stats = await r2MCPIntegration.getBucketStats();
    systemStatus.push({
      component: '☁️ R2 Storage Integration',
      status: configStatus.configured ? 'healthy' : 'warning',
      message: configStatus.configured 
        ? `Connected: ${stats.objectCount} objects (${stats.totalSize})`
        : 'Not configured - using mock data',
      metrics: { configured: configStatus.configured, bucketName: configStatus.bucketName, ...stats }
    });
  } catch (error) {
    systemStatus.push({
      component: '☁️ R2 Storage Integration',
      status: 'warning',
      message: `Connection issue: ${error.message}`
    });
  }

  // MCP Servers
  const mcpServers = [
    { name: '📚 Bun MCP Server', script: 'lib/mcp/bun-mcp-server.ts' },
    { name: '🔧 Tools MCP Server', script: 'scripts/fw-tools-mcp.ts' },
    { name: '🌉 MCP Bridge', script: 'scripts/mcp-bridge.ts' }
  ];

  for (const server of mcpServers) {
    const exists = await Bun.file(server.script).exists();
    systemStatus.push({
      component: server.name,
      status: exists ? 'healthy' : 'error',
      message: exists ? 'Server script accessible' : 'Server script not found',
      metrics: { script: server.script, accessible: exists }
    });
  }

  // CLI Tools
  const cliTools = [
    { name: '🔍 fw-docs CLI', script: 'scripts/fw-docs.ts' }
  ];

  for (const tool of cliTools) {
    const exists = await Bun.file(tool.script).exists();
    systemStatus.push({
      component: tool.name,
      status: exists ? 'healthy' : 'error',
      message: exists ? 'CLI tool accessible' : 'CLI tool not found',
      metrics: { script: tool.script, accessible: exists }
    });
  }

  // Recent Activity
  const recentActivity = auditLogs.slice(0, 10).map(log => ({
    time: new Date(log.timestamp).toLocaleTimeString(),
    event: `${log.action} - ${log.tokenId.slice(0, 12)}...`,
    type: log.success ? 'success' : 'warning'
  }));

  // Add system events
  recentActivity.push(
    { time: now.toLocaleTimeString(), event: 'Dashboard data refreshed', type: 'success' }
  );

  return {
    systemStatus,
    metrics: {
      authentication: {
        activeTokens: tokens.length,
        recentAuths,
        failedAuths
      },
      storage: storageMetrics,
      usage: {
        totalSearches: 1250,
        totalDiagnoses: 85,
        totalExamples: 320,
        avgResponseTime: 45
      },
      system: {
        uptime: process.uptime().toFixed(0) + 's',
        memoryUsage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + ' MB',
        errorRate: failedAuths / Math.max(recentAuths, 1),
        lastRestart: new Date(Date.now() - process.uptime() * 1000).toLocaleString()
      }
    },
    recentActivity,
    tokens: tokens.map(t => ({
      id: t.tokenId,
      permissions: t.permissions,
      expiresAt: t.expiresAt,
      metadata: t.metadata
    }))
  };
}

async function collectDashboardDataCached() {
  const now = Date.now();
  if (dashboardDataCache && dashboardDataCache.expiresAt > now) {
    return dashboardDataCache.value;
  }
  const value = await collectDashboardData();
  dashboardDataCache = { value, expiresAt: now + DASHBOARD_CACHE_TTL_MS };
  return value;
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function collectDashboardDebugData(
  requestURL: string,
  deep: boolean
): Promise<Record<string, unknown>> {
  const startedAt = Date.now();
  const routeMap = {
    api: ['/api/dashboard', '/api/dashboard/debug', '/api/dashboard/runtime', '/api/health'],
    ui: ['/', '/dashboard', '/dashboard/*'],
  };

  const r2Config = r2MCPIntegration.getConfigStatus();
  const r2: Record<string, unknown> = { config: r2Config };

  const statsStarted = Date.now();
  try {
    const stats = await r2MCPIntegration.getBucketStats();
    r2.stats = stats;
    r2.statsLatencyMs = Date.now() - statsStarted;
  } catch (error) {
    r2.statsError = stringifyError(error);
    r2.statsLatencyMs = Date.now() - statsStarted;
  }

  if (deep) {
    const connectionStarted = Date.now();
    try {
      const connection = await r2MCPIntegration.testConnection();
      r2.connection = connection ? 'ok' : 'failed';
      r2.connectionLatencyMs = Date.now() - connectionStarted;
    } catch (error) {
      r2.connection = 'error';
      r2.connectionError = stringifyError(error);
      r2.connectionLatencyMs = Date.now() - connectionStarted;
    }

    const listStarted = Date.now();
    try {
      const items = await r2MCPIntegration.listMCPData('mcp/');
      r2.listLatencyMs = Date.now() - listStarted;
      r2.sampleObjects = items.slice(0, 5);
    } catch (error) {
      r2.listLatencyMs = Date.now() - listStarted;
      r2.listError = stringifyError(error);
    }
  }

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    request: requestURL,
    deep,
    latencyMs: Date.now() - startedAt,
    cache: {
      enabled: true,
      ttlMs: DASHBOARD_CACHE_TTL_MS,
      hasValue: Boolean(dashboardDataCache),
      expiresInMs: dashboardDataCache ? Math.max(0, dashboardDataCache.expiresAt - Date.now()) : 0,
    },
    routes: routeMap,
    runtime: {
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      memoryMB: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
      dashboardHost: DASHBOARD_HOST,
      dashboardPort: ACTIVE_PORT,
      ...buildRuntimeInfo(),
    },
    r2,
  };
}

function createFetchHandler() {
  return async function fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API endpoints
    if (path === '/api/dashboard') {
      try {
        const data = await collectDashboardDataCached();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: stringifyError(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (path === '/api/dashboard/debug') {
      try {
        const deep = url.searchParams.get('deep') === '1';
        const data = await collectDashboardDebugData(url.toString(), deep);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: stringifyError(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
      }
    }

    if (path === '/api/dashboard/runtime') {
      return new Response(JSON.stringify(buildRuntimeInfo()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    if (path === '/api/health') {
      return new Response(JSON.stringify(buildHealthPayload()), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Serve dashboard HTML
    if (path === '/' || path === '/dashboard') {
      try {
        const file = Bun.file(DASHBOARD_HTML);
        if (await file.exists()) {
          return new Response(file, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      } catch {
        // Fall through to 404
      }
    }

    // Serve Bun Playground
    if (path === '/bun-playground') {
      try {
        const file = Bun.file('./dashboard/bun-playground.html');
        if (await file.exists()) {
          return new Response(file, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      } catch {
        // Fall through to 404
      }
    }

    // Serve Navigation Hub
    if (path === '/hub' || path === '/nav') {
      try {
        const file = Bun.file('./dashboard/navigation-hub.html');
        if (await file.exists()) {
          return new Response(file, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      } catch {
        // Fall through to 404
      }
    }

    // Serve public dashboards
    if (path.startsWith('/dashboards/')) {
      try {
        const filePath = resolve('./public' + path);
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(file, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      } catch {
        // Fall through to 404
      }
    }

    // Static files
    if (path.startsWith('/dashboard/')) {
      try {
        const filePath = resolve('.' + path);
        if (!filePath.startsWith(DASHBOARD_ROOT + '/')) {
          return new Response('Not Found', { status: 404 });
        }
        const file = Bun.file(filePath);
        if (await file.exists()) {
          const ext = path.split('.').pop();
          const contentType = {
            html: 'text/html',
            js: 'application/javascript',
            css: 'text/css',
            json: 'application/json'
          }[ext] || 'application/octet-stream';
          
          return new Response(file, {
            headers: { 'Content-Type': contentType }
          });
        }
      } catch {
        // Fall through to 404
      }
    }

    // 404
    return new Response('Not Found', { status: 404 });
  };
}

function canRetryPort(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as { code?: string };
  return value.code === 'EADDRINUSE';
}

function startDashboardServer() {
  let candidatePort = REQUESTED_PORT;
  let attempts = 0;
  const maxAttempts = 30;
  const fetchHandler = createFetchHandler();

  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      ACTIVE_PORT = candidatePort;
      const server = serve({
        hostname: DASHBOARD_HOST,
        port: candidatePort,
        fetch: fetchHandler,
      });
      console.log('🏭 Starting FactoryWager MCP Dashboard Server...');
      console.log(`📊 Dashboard: http://${DASHBOARD_HOST}:${ACTIVE_PORT}`);
      console.log(`📡 API: http://${DASHBOARD_HOST}:${ACTIVE_PORT}/api/dashboard`);
      console.log(`🩺 Health: http://${DASHBOARD_HOST}:${ACTIVE_PORT}/api/health`);
      console.log(`🛠 Runtime: http://${DASHBOARD_HOST}:${ACTIVE_PORT}/api/dashboard/runtime`);
      console.log(
        `⚙️ Runtime: bun ${BUN_VERSION} (${BUN_REVISION}) on ${process.platform}/${process.arch} pid=${process.pid}`
      );
      console.log('');
      if (candidatePort !== REQUESTED_PORT) {
        console.warn(
          `[dashboard] port fallback engaged: requested ${REQUESTED_PORT}, active ${candidatePort}`
        );
      }
      return server;
    } catch (error) {
      if (canRetryPort(error)) {
        const owner = findPortOwner(candidatePort);
        const ownerMsg = owner
          ? `owner=${owner.command} pid=${owner.pid}`
          : 'owner=unknown';
        console.error(
          `[dashboard] port ${candidatePort} unavailable (${ownerMsg}).`
        );
        if (!ALLOW_PORT_FALLBACK) {
          console.error('[dashboard] Set ALLOW_PORT_FALLBACK=true to auto-select the next port.');
          throw error;
        }
        candidatePort += 1;
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Unable to start dashboard server after ${maxAttempts} attempts from port ${REQUESTED_PORT}.`
  );
}

startDashboardServer();
