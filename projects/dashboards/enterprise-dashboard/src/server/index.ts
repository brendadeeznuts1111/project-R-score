import type { ServerWebSocket, CookieInit } from "bun";
import { Cookie, YAML, stringWidth, dns } from "bun";
import { Database } from "bun:sqlite";
import { feature } from "bun:bundle";
import { parseArgs } from "util";
import { join, resolve } from "path";
import http from "node:http";
import https from "node:https";
import { buildTLSConfig, getTLSInfo, createTLSBadge } from "./utils/tls-helpers";
import { openProjectShell } from "./pty-ui";
import { VersionValidator } from "./version-validator";
import { applyStartupOptimizations, getOptimizationStatus, refreshOptimizations, probeAllHosts } from "./utils/startup-optimizations";
import {
  safeStringWidth,
  renderDashboardPanel,
  hyperlink,
  type DashboardRow,
} from "./utils/string-width";
import { getNetworkProxyConfig } from "./utils/proxy";
import { generateErrorPage, escapeHtml } from "./utils/error-pages";
import {
  c,
  padRight,
  truncateToWidth,
  createBadge,
  createPill,
  formatBoxLine,
  healthToAnsi,
  renderHealthBar,
  getBoxWidth,
  setupResizeHandler as setupTuiResizeHandler,
  renderProgressBar,
  formatBytes,
  formatUptimeLong,
  formatUptime,
  getThermalColor,
} from "./utils/tui";
import { saveState, loadState, closeStateDb } from "./utils/state";
import {
  getCpuUsage,
  getCpuMetrics,
  getMemoryMetrics,
  getEnhancedMemoryMetrics,
  createQueueBadge,
  getTopProcesses,
  parseProcessOutput,
} from "./utils/metrics-helpers";
import {
  patterns,
  routeGroups,
  matchRoute,
  matchRouteCached,
  testRouteCached,
  getRouteGroup,
  validateRouteParams,
  checkRouteGuard,
  listPatterns,
  listRouteGroups,
  warmPatternCache,
  getCacheStats,
  clearPatternCache,
  type RoutePattern,
  type RouteGroup,
  type CachedRouteMatch,
} from "./router";
import {
  checkRateLimit,
  rateLimiter,
  RateLimiter,
  type RateLimitResult,
} from "./rate-limiter";
import { ptyService } from "./services/pty-service";
import {
  authenticate,
  createApiKey,
  createApiKeyFromRaw,
  findApiKeyByRawKey,
  listApiKeys,
  revokeKey,
  deleteKey,
  updatePermissions,
  hasAdminKey,
  withAuth,
  ALL_PERMISSIONS,
  filterValidPermissions,
  Permissions,
} from "./auth";
import type { AuthContext, Permission } from "../types";
import { handleHealth } from "./handlers/health";
import { handleDashboard, handleStats } from "./handlers/dashboard";
import { handleStylesCss, handleThemesCss, handleIndexJs } from "./handlers/static";
import {
  handleSystemGet,
  handleSystemLive,
  handleSystemPort,
  handleSystemGc,
  handleSystemEnhanced,
  handleSystemQueue,
} from "./handlers/system";
import {
  handlePTYSessions,
  handlePTYCreate,
  handlePTYStats,
  handlePTYExec,
  handlePTYSession,
  handlePTYSessionOutput,
  handlePTYSessionWrite,
  handlePTYSessionResize,
  handlePTYSessionKill,
  handlePTYSessionRemove,
} from "./handlers/pty";
import {
  handleExportS3,
  handleSnapshotGet,
  handleSnapshotPost,
  handleSnapshotsList,
  handleSnapshotGetFile,
} from "./handlers/export";
import {
  handleAnalyticsMatrix,
  handleAnalyticsEndpoint,
  handleAnalyticsProjects,
  handleAnomaliesDetect,
  handleAnomaliesModelGet,
  handleAnomaliesModelPost,
  handleExceptions,
} from "./handlers/analytics";
import {
  handleProjectsList,
  handleProjectGet,
  handleProjectOpen,
  handleProjectGit,
} from "./handlers/projects";

// React SSR for dashboard components
import React from "react";
import { renderToString } from "react-dom/server";
import { RouteHeatmap } from "../client/components/RouteHeatmap";
import { getConfigIntegrity } from "../client/config";
// Config HMR: validate + regenerate themes.css on TOML change when running with --hot
import "../client/config/hmr";

// Declare global for server reference (used in graceful shutdown)
declare global {
  // eslint-disable-next-line no-var
  var _server: ReturnType<typeof Bun.serve> | undefined;
}

// =============================================================================
// Version Validation - Ensure Bun 1.3.6+ with SIMD/PTY/Archive
// =============================================================================
const { features: bunFeatures, elapsed: validationTime } = VersionValidator.startup();

// =============================================================================
// Enterprise Networking - Connection Pooling & Proxy Support
// =============================================================================
// keepAlive: true enables persistent connections (TCP socket reuse)
// This reduces latency and prevents "Too many open files" errors

const httpAgent = new http.Agent({
  keepAlive: true,      // Reuse connections across health check cycles
  maxSockets: 10,       // Max concurrent connections per host
  maxFreeSockets: 5,    // Keep 5 sockets in the pool
  timeout: 30000,       // 30s socket timeout
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 30000,
  rejectUnauthorized: true, // Enforce TLS verification
});

// Proxy configuration for corporate environments
const proxyConfig = getNetworkProxyConfig();

// High-performance health check using persistent connections
async function checkEndpointHealth(url: string): Promise<{ status: string; latency: number }> {
  const start = performance.now();
  const isHttps = url.startsWith("https://");

  return new Promise((resolve) => {
    const agent = isHttps ? httpsAgent : httpAgent;
    const protocol = isHttps ? https : http;

    const req = protocol.get(url, { agent }, (res) => {
      const latency = performance.now() - start;
      const status = res.statusCode === 200 ? "healthy" : "unhealthy";
      res.resume(); // Drain response to keep connection alive for reuse
      resolve({ status, latency });
    });

    req.on("error", () => {
      resolve({ status: "error", latency: performance.now() - start });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: "timeout", latency: 5000 });
    });
  });
}

// =============================================================================
// Memory Monitoring & Garbage Collection
// =============================================================================
const MEMORY_CHECK_INTERVAL = 30000; // 30 seconds
const MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB

let memoryCheckInterval: Timer | null = null;

function startMemoryMonitoring(): void {
  memoryCheckInterval = setInterval(() => {
    const memory = process.memoryUsage();
    if (feature("DEBUG")) {
      debug("Memory usage", {
        heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(memory.rss / 1024 / 1024).toFixed(2)}MB`,
      });
    }
    if (memory.heapUsed > MEMORY_THRESHOLD) {
      console.log(`${c.yellow}High memory usage detected, requesting GC${c.reset}`);
      Bun.gc(true); // Request garbage collection
    }
  }, MEMORY_CHECK_INTERVAL);
}

// =============================================================================
// System Metrics Collection (CPU, Memory, Processes)
// =============================================================================
// Metrics helpers are now imported from utils/metrics-helpers.ts

// =============================================================================
// Analytics View - High-Fidelity System Cockpit
// Real-time CPU, Memory, Processes, and Project Health visualization
// =============================================================================

/**
 * Draw the Analytics & Monitoring view
 * Shows system metrics, top processes, project health, and live traffic
 */
async function drawAnalyticsView() {
  const metrics = await getCachedSystemMetrics();
  const queue = getQueueStats();
  const enhanced = getEnhancedMemoryMetrics();

  // Get server metrics via deferred global (defined after server starts)
  const getServerMetricsFn = (globalThis as any).__getServerMetrics;
  const serverMetrics = getServerMetricsFn ? getServerMetricsFn() : null;

  // Auto-GC: If heap usage exceeds 90% of allocated total, flush it
  const heapUtilization = metrics.memory.heapTotal > 0
    ? (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100
    : 0;
  if (heapUtilization > 90) {
    Bun.gc(true);
    debug("Auto-GC triggered", { heapUtilization });
  }

  // Clear screen
  console.write("\x1b[2J\x1b[H");

  // Get exception stats for panic badge
  const exceptions = getExceptionStats();

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER: System Identity with Panic Badge
  // ═══════════════════════════════════════════════════════════════════════════
  const platformIcon = metrics.platform === "darwin" ? "🍎" : metrics.platform === "linux" ? "🐧" : "💻";
  const uptimeStr = formatUptimeLong(metrics.uptime);

  // Exception badge (shows if any exceptions in last hour)
  const exceptionBadge = exceptions.recent > 0
    ? `${c.err}[ ✖ ${exceptions.recent} EXCEPTION${exceptions.recent > 1 ? "S" : ""} ]${c.reset}`
    : `${c.ok}● ONLINE${c.reset}`;

  // TLS badge
  const tlsBadgeStr = createTLSBadge(config);

  console.log(`${c.cyan}  ╔════ ANALYTICS & MONITORING ${"═".repeat(getBoxWidth() - 32)}╗${c.reset}`);
  console.log(`${c.cyan}  ║${c.reset} 🖥️  ${c.bold}${metrics.hostname.slice(0, 16)}${c.reset} │ ${exceptionBadge} │ ${tlsBadgeStr} │ 🚀 Bun v${Bun.version}${" ".repeat(Math.max(0, getBoxWidth() - 70 - Math.min(16, metrics.hostname.length)))}${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}  ╠${"═".repeat(getBoxWidth())}╣${c.reset}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // CPU & MEMORY BARS
  // ═══════════════════════════════════════════════════════════════════════════
  const cpuBar = renderProgressBar(metrics.cpu.usage, 16, false);
  const memBar = renderProgressBar(metrics.memory.usagePercent, 14, false);
  const memUsedGB = (metrics.memory.used / 1024 / 1024 / 1024).toFixed(1);
  const memTotalGB = (metrics.memory.total / 1024 / 1024 / 1024).toFixed(0);

  const cpuLine = `CPU: ${cpuBar} ${getThermalColor(metrics.cpu.usage)}${metrics.cpu.usage}%${c.reset}`;
  const memLine = `MEM: ${memBar} ${getThermalColor(metrics.memory.usagePercent)}${metrics.memory.usagePercent}%${c.reset} (${memUsedGB}/${memTotalGB}GB)`;

  console.log(`${c.cyan}  ║${c.reset} ${cpuLine}  │ ${memLine}${" ".repeat(Math.max(0, getBoxWidth() - 75))}${c.cyan}║${c.reset}`);

  // Heap and Load
  const heapUsedMB = (metrics.memory.heapUsed / 1024 / 1024).toFixed(1);
  const heapTotalMB = (metrics.memory.heapTotal / 1024 / 1024).toFixed(1);
  const rssMB = (metrics.memory.rss / 1024 / 1024).toFixed(1);
  const loadAvg = metrics.cpu.loadAvg.map(l => l.toFixed(2)).join(" / ");

  const heapLine = `HEAP: ${heapUsedMB} MB / ${heapTotalMB} MB (RSS: ${rssMB} MB)`;
  const loadLine = `LOAD: ${loadAvg}`;

  console.log(`${c.cyan}  ║${c.reset} ${c.dim}${heapLine}${c.reset}    │ ${c.dim}${loadLine}${c.reset}${" ".repeat(Math.max(0, getBoxWidth() - heapLine.length - loadLine.length - 10))}${c.cyan}║${c.reset}`);

  // Enhanced memory metrics
  const pressureColor = enhanced.pressure === "critical" ? c.err :
                        enhanced.pressure === "high" ? c.warn :
                        enhanced.pressure === "medium" ? c.blue : c.ok;
  const pressureIcon = enhanced.pressure === "critical" ? "🔴" :
                       enhanced.pressure === "high" ? "🟠" :
                       enhanced.pressure === "medium" ? "🟡" : "🟢";

  console.log(`${c.cyan}  ║${c.reset} ${pressureIcon} Pressure: ${pressureColor}${c.bold}${enhanced.pressure.toUpperCase()}${c.reset} │ Efficiency: ${enhanced.efficiency}% │ Overhead: ${formatBytes(enhanced.overhead)}${" ".repeat(Math.max(0, getBoxWidth() - 65))}${c.cyan}║${c.reset}`);

  // Queue stats
  const queueBadge = createQueueBadge(queue);
  console.log(`${c.cyan}  ║${c.reset} ${queueBadge}${" ".repeat(Math.max(0, getBoxWidth() - stringWidth(queueBadge) + 10))}${c.cyan}║${c.reset}`);

  console.log(`${c.cyan}  ╚${"═".repeat(getBoxWidth())}╝${c.reset}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVE TRAFFIC MONITOR (Native Bun Server Metrics)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("");
  console.log(`${c.dim}  ┌─ LIVE TRAFFIC MONITOR ${"─".repeat(getBoxWidth() - 25)}┐${c.reset}`);

  if (serverMetrics) {
    // Request bar (scale: 0-100 active)
    const reqPct = Math.min(100, serverMetrics.pendingRequests * 10);
    const reqBar = renderProgressBar(reqPct, 10, false);
    const reqColor = serverMetrics.pendingRequests > 50 ? c.err : serverMetrics.pendingRequests > 10 ? c.warn : c.ok;

    // WebSocket bar (scale: 0-100 connections)
    const wsPct = Math.min(100, serverMetrics.pendingWebSockets * 5);
    const wsBar = renderProgressBar(wsPct, 9, false);
    const wsColor = serverMetrics.pendingWebSockets > 50 ? c.err : serverMetrics.pendingWebSockets > 10 ? c.warn : c.ok;

    console.log(`${c.dim}  │${c.reset}  📥 REQUESTS: ${reqBar} ${reqColor}${serverMetrics.pendingRequests.toString().padEnd(3)}${c.reset} Active  │  🔄 WEBSOCKETS: ${wsBar} ${wsColor}${serverMetrics.pendingWebSockets.toString().padEnd(3)}${c.reset} Open${" ".repeat(Math.max(0, getBoxWidth() - 75))}${c.dim}│${c.reset}`);

    // Subscribers and throughput
    const stats = getStats();
    const reqPerSec = stats.uptime > 0 ? Math.round(stats.totalRequests / stats.uptime) : 0;
    const latencyColor = stats.avgLatency < 10 ? c.ok : stats.avgLatency < 50 ? c.warn : c.err;

    console.log(`${c.dim}  │${c.reset}  📡 TOPIC: ${c.cyan}"dashboard-updates"${c.reset}       │  👥 SUBSCRIBERS: ${c.bold}${serverMetrics.dashboardSubscribers}${c.reset}${" ".repeat(Math.max(0, getBoxWidth() - 60))}${c.dim}│${c.reset}`);
    console.log(`${c.dim}  ├${"─".repeat(getBoxWidth())}┤${c.reset}`);
    console.log(`${c.dim}  │${c.reset}  Requests/Sec: ${c.bold}${reqPerSec}${c.reset} req/s      │  Avg Latency: ${latencyColor}⚡ ${stats.avgLatency}ms${c.reset}       │  Total: ${c.dim}${stats.totalRequests}${c.reset}${" ".repeat(Math.max(0, getBoxWidth() - 72))}${c.dim}│${c.reset}`);
  } else {
    console.log(`${c.dim}  │${c.reset}  ${c.yellow}Server metrics not yet available...${c.reset}${" ".repeat(Math.max(0, getBoxWidth() - 40))}${c.dim}│${c.reset}`);
  }

  console.log(`${c.dim}  └${"─".repeat(getBoxWidth())}┘${c.reset}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // TOP PROCESSES TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("");
  console.log(`${c.dim}  ┌─ TOP PROCESSES ${"─".repeat(getBoxWidth() - 18)}┐${c.reset}`);
  console.log(`${c.dim}  │${c.reset} ${c.bold}PID${c.reset}     │ ${c.bold}PROCESS${c.reset}                     │ ${c.bold}CPU %${c.reset}   │ ${c.bold}MEMORY${c.reset}      │ ${c.bold}STATUS${c.reset}         ${c.dim}│${c.reset}`);
  console.log(`${c.dim}  ├───────┼─────────────────────────────┼─────────┼─────────────┼────────────────┤${c.reset}`);

  for (const proc of metrics.processes.slice(0, 6)) {
    const pidStr = proc.pid.toString().padEnd(5);
    const nameStr = proc.name.padEnd(27).slice(0, 27);
    const cpuStr = `${proc.cpu.toFixed(1)}%`.padStart(6);
    const memStr = formatBytes(proc.memory).padStart(10);
    const statusIcon = proc.status === "running" ? `${c.ok}●${c.reset}` : `${c.warn}○${c.reset}`;
    const statusStr = `${statusIcon} ${proc.status.toUpperCase()}`;

    // Color CPU based on usage
    const cpuColor = proc.cpu > 80 ? c.err : proc.cpu > 50 ? c.warn : c.ok;

    console.log(`${c.dim}  │${c.reset} ${pidStr} ${c.dim}│${c.reset} ${nameStr} ${c.dim}│${c.reset} ${cpuColor}${cpuStr}${c.reset}  ${c.dim}│${c.reset} ${memStr}  ${c.dim}│${c.reset} ${statusStr.padEnd(14)} ${c.dim}│${c.reset}`);
  }

  console.log(`${c.dim}  └───────┴─────────────────────────────┴─────────┴─────────────┴────────────────┘${c.reset}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT HEALTH DISTRIBUTION
  // ═══════════════════════════════════════════════════════════════════════════
  const healthy = projects.filter(p => p.health >= 80).length;
  const warning = projects.filter(p => p.health >= 60 && p.health < 80).length;
  const critical = projects.filter(p => p.health < 60).length;
  const total = projects.length || 1;

  const maxBarWidth = 28;
  const healthyBar = "█".repeat(Math.round((healthy / total) * maxBarWidth));
  const warningBar = "█".repeat(Math.round((warning / total) * maxBarWidth));
  const criticalBar = "█".repeat(Math.round((critical / total) * maxBarWidth));

  console.log("");
  console.log(`${c.dim}  ┌─ PROJECT HEALTH DISTRIBUTION ${"─".repeat(getBoxWidth() - 33)}┐${c.reset}`);
  console.log(`${c.dim}  │${c.reset} ${c.ok}◆${c.reset} HEALTHY (80-100%) : ${c.ok}[ ${healthyBar.padEnd(maxBarWidth)} ]${c.reset} ${healthy.toString().padStart(3)}${" ".repeat(Math.max(0, getBoxWidth() - 60))}${c.dim}│${c.reset}`);
  console.log(`${c.dim}  │${c.reset} ${c.warn}▲${c.reset} WARNING (60-79%)  : ${c.warn}[ ${warningBar.padEnd(maxBarWidth)} ]${c.reset} ${warning.toString().padStart(3)}${" ".repeat(Math.max(0, getBoxWidth() - 60))}${c.dim}│${c.reset}`);
  console.log(`${c.dim}  │${c.reset} ${c.err}✖${c.reset} CRITICAL (<60%)   : ${c.err}[ ${criticalBar.padEnd(maxBarWidth)} ]${c.reset} ${critical.toString().padStart(3)}${" ".repeat(Math.max(0, getBoxWidth() - 60))}${c.dim}│${c.reset}`);
  console.log(`${c.dim}  └${"─".repeat(getBoxWidth())}┘${c.reset}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM LOGS (Exception Tracking)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("");
  console.log(`${c.dim}  ┌─ SYSTEM LOGS ${"─".repeat(getBoxWidth() - 16)}┐${c.reset}`);

  // Show recent exceptions or "no errors" message
  const recentExceptions = exceptionLog.slice(0, 4);
  if (recentExceptions.length === 0) {
    console.log(`${c.dim}  │${c.reset}  ${c.ok}✓ No exceptions detected${c.reset}${" ".repeat(Math.max(0, getBoxWidth() - 28))}${c.dim}│${c.reset}`);
  } else {
    for (const exc of recentExceptions) {
      const time = exc.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const severityIcon = exc.severity === "critical" ? `${c.err}✖${c.reset}` :
                           exc.severity === "error" ? `${c.warn}⚠${c.reset}` : `${c.blue}ℹ${c.reset}`;
      const severityLabel = exc.severity === "critical" ? `${c.err}CRITICAL${c.reset}` :
                            exc.severity === "error" ? `${c.warn}ERROR${c.reset}` : `${c.blue}INFO${c.reset}`;
      const msgTruncated = exc.message.length > 45 ? exc.message.slice(0, 42) + "..." : exc.message.padEnd(45);
      const pathStr = exc.path ? `${c.dim}${exc.path}${c.reset}` : "";

      console.log(`${c.dim}  │${c.reset}  ${severityIcon} ${c.dim}${time}${c.reset} [${severityLabel}] ${msgTruncated} ${c.dim}│${c.reset}`);
    }
  }

  // Summary line
  if (exceptions.total > 0) {
    const summaryParts = [];
    if (exceptions.critical > 0) summaryParts.push(`${c.err}${exceptions.critical} critical${c.reset}`);
    if (exceptions.errors > 0) summaryParts.push(`${c.yellow}${exceptions.errors} errors${c.reset}`);
    if (exceptions.warnings > 0) summaryParts.push(`${c.blue}${exceptions.warnings} warnings${c.reset}`);
    const summary = summaryParts.join(", ") || "none recent";
    console.log(`${c.dim}  ├${"─".repeat(getBoxWidth())}┤${c.reset}`);
    console.log(`${c.dim}  │${c.reset}  ${c.dim}Total: ${exceptions.total} exceptions${c.reset} │ ${c.dim}Last hour:${c.reset} ${summary}${" ".repeat(Math.max(0, getBoxWidth() - 50 - summary.length))}${c.dim}│${c.reset}`);
  }

  console.log(`${c.dim}  └${"─".repeat(getBoxWidth())}┘${c.reset}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMAND BAR
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("");
  console.log(`  ${c.dim}[g]${c.reset} Flush GC  ${c.dim}[r]${c.reset} Refresh  ${c.dim}[p]${c.reset} Projects  ${c.dim}[m]${c.reset} Main View  ${c.dim}[q]${c.reset} Quit`);
}

// Check if a port is in use (for detecting running dev servers)
async function checkPort(port: number): Promise<{ inUse: boolean; pid?: number }> {
  try {
    const proc = Bun.spawn(["lsof", "-i", `:${port}`, "-t"], {
      stdout: "pipe",
      stderr: "ignore",
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    const pid = parseInt(output.trim().split("\n")[0], 10);
    return { inUse: !isNaN(pid), pid: isNaN(pid) ? undefined : pid };
  } catch {
    return { inUse: false };
  }
}

// Get full system metrics (with enhanced data)
async function getSystemMetrics(): Promise<SystemMetrics> {
  const [processes] = await Promise.all([
    getTopProcesses(8, debug),
  ]);

  // Get queue stats from git-scanner
  const queueStats = getQueueStats();

  // Get enhanced memory metrics
  const enhancedMemory = getEnhancedMemoryMetrics();

  return {
    cpu: getCpuMetrics(),
    memory: getMemoryMetrics(),
    processes,
    platform: os.platform(),
    hostname: os.hostname(),
    uptime: Math.floor(os.uptime()),
    timestamp: new Date(),
    // Enhanced metrics
    queue: queueStats,
    enhanced: enhancedMemory,
  };
}

// Cache system metrics (update every 2 seconds)
let cachedSystemMetrics: SystemMetrics | null = null;
let lastMetricsUpdate = 0;
const METRICS_CACHE_TTL = 2000; // 2 seconds

async function getCachedSystemMetrics(): Promise<SystemMetrics> {
  const now = Date.now();
  if (!cachedSystemMetrics || now - lastMetricsUpdate > METRICS_CACHE_TTL) {
    cachedSystemMetrics = await getSystemMetrics();
    lastMetricsUpdate = now;
  }
  return cachedSystemMetrics;
}

// =============================================================================
// System Integrity Check (CRC32 - Hardware Accelerated ~9 GB/s)
// =============================================================================
// Uses Bun.hash.crc32() to verify the server code hasn't been modified
// Bun 1.3.6+: Hardware-accelerated CRC32 is now 20x faster (124µs vs 2,644µs)
// Uses CPU instructions: PCLMULQDQ (x86) or native CRC32 (ARM)

interface IntegrityInfo {
  codeHash: string;
  configHash: string;
  timestamp: string;
  verified: boolean;
}

// Cache integrity hash (only recalculate on file change)
let cachedIntegrity: IntegrityInfo | null = null;
let integrityMtime = 0;

async function getSystemIntegrity(): Promise<IntegrityInfo> {
  const serverFile = Bun.file(import.meta.path);
  const currentMtime = serverFile.lastModified;

  // Return cached if file hasn't changed
  if (cachedIntegrity && integrityMtime === currentMtime) {
    return { ...cachedIntegrity, timestamp: new Date().toISOString() };
  }

  // Read server code and hash it (hardware-accelerated CRC32)
  const serverCode = await serverFile.text();
  const codeHash = Bun.hash.crc32(serverCode).toString(16).padStart(8, "0");

  // Also hash the config for tamper detection
  const configFile = Bun.file(`${import.meta.dir}/config.ts`);
  let configHash = "00000000";
  if (await configFile.exists()) {
    const configCode = await configFile.text();
    configHash = Bun.hash.crc32(configCode).toString(16).padStart(8, "0");
  }

  cachedIntegrity = {
    codeHash,
    configHash,
    timestamp: new Date().toISOString(),
    verified: true,
  };
  integrityMtime = currentMtime;

  return cachedIntegrity;
}

// =============================================================================
// Graceful Shutdown
// =============================================================================
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${c.cyan}Received ${signal}, shutting down gracefully...${c.reset}`);

  // Save current state (guard against early shutdown before vars are initialized)
  try {
    if (typeof cursor !== "undefined") saveState("lastCursor", cursor);
    if (typeof viewMode !== "undefined") saveState("lastViewMode", viewMode);
    if (typeof searchFilter !== "undefined") saveState("lastFilter", searchFilter);
  } catch {
    // Variables not yet initialized during early shutdown
  }

  // Clear intervals (guard against early shutdown before vars are initialized)
  try {
    if (typeof autoRefreshInterval !== "undefined" && autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
    if (typeof memoryCheckInterval !== "undefined" && memoryCheckInterval) {
      clearInterval(memoryCheckInterval);
    }
  } catch {
    // Intervals not yet initialized during early shutdown
  }

  // Destroy HTTP agents (close all keep-alive connections)
  httpAgent.destroy();
  httpsAgent.destroy();

  // Close database
  closeStateDb();

  // Stop server (may not be initialized if shutdown during startup)
  try {
    if (globalThis._server) {
      globalThis._server.stop();
    }
  } catch {
    // Server not yet initialized
  }

  console.log(`${c.ok}Cleanup complete. Goodbye!${c.reset}`);
  process.exit(0);
}

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Error boundary for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error(`${c.err}Uncaught Exception:${c.reset}`);
  console.error(Bun.inspect(error, { colors: true }));
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error(`${c.err}Unhandled Rejection:${c.reset}`);
  console.error(Bun.inspect(reason, { colors: true }));
});

import type { Project, DashboardData, DashboardStats, Alert, TimelinePoint, ApiResponse, SessionData, UIState, SystemMetrics, CpuMetrics, MemoryMetrics, ProcessInfo, QueueStats, EnhancedMemoryMetrics, URLPatternAnalysis, URLPatternAnalysisRequest, URLPatternTestResult, URLPatternAnalysisSummary } from "../types";
import * as os from "node:os";
import { scanAllRepos, getQueueStats, getEnhancedProjectMetrics, getGitActivityStats } from "./git-scanner";
import { config, loadSecrets, getSecretsStatus, getS3Config } from "./config";
import * as db from "./db";
import { BUILD_ID, BUILD_DATE, GIT_COMMIT, BUN_VERSION } from "./build-info";
import { anomalyDetector, detectAnomalies } from "./features/anomaly-detector";
import { getNetworkStatus, probeHost } from "./features/network";

// =============================================================================
// Fetch Preconnect Configuration
// =============================================================================
// Track preconnect stats for health endpoint
let _preconnectHosts: string[] = [];
let _preconnectTime: number | null = null;

/**
 * Normalize URL for fetch.preconnect (requires explicit port)
 */
function normalizePreconnectUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    // fetch.preconnect requires explicit port
    const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
    return `${parsed.protocol}//${parsed.hostname}:${port}`;
  } catch {
    return null;
  }
}

/**
 * Get hosts to preconnect to based on config
 * Returns URLs for S3, proxy, and any custom hosts
 */
function getPreconnectHosts(): string[] {
  const hosts: string[] = [];

  // S3 endpoint (if configured)
  if (config.S3.BUCKET && config.S3.REGION) {
    const endpoint = config.S3.ENDPOINT || `https://s3.${config.S3.REGION}.amazonaws.com`;
    const normalized = normalizePreconnectUrl(endpoint);
    if (normalized) hosts.push(normalized);
  }

  // Proxy URL (if configured)
  if (config.PROXY.URL) {
    const normalized = normalizePreconnectUrl(config.PROXY.URL);
    if (normalized) hosts.push(normalized);
  }

  // Custom preconnect hosts from env (comma-separated)
  const customHosts = process.env.PRECONNECT_HOSTS;
  if (customHosts) {
    for (const host of customHosts.split(",")) {
      const normalized = normalizePreconnectUrl(host);
      if (normalized) hosts.push(normalized);
    }
  }

  _preconnectHosts = hosts;
  _preconnectTime = hosts.length > 0 ? Date.now() : null;

  return hosts;
}

/**
 * Get preconnect status for health endpoint
 */
function getPreconnectStatus() {
  return {
    hosts: _preconnectHosts.length,
    preconnectedAt: _preconnectTime ? new Date(_preconnectTime).toISOString() : null,
    maxConcurrent: parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256"),
  };
}

/**
 * Get comprehensive network stats including DNS cache and connection pool
 */
function getNetworkStats() {
  const dnsCache = dns.getCacheStats();
  const preconnect = getPreconnectStatus();

  // Calculate hit ratio
  const hitsCompleted = dnsCache.cacheHitsCompleted ?? 0;
  const hitsInflight = dnsCache.cacheHitsInflight ?? 0;
  const totalHits = hitsCompleted + hitsInflight;
  const misses = dnsCache.cacheMisses ?? 0;
  const total = totalHits + misses || 1;
  const hitRatio = (totalHits / total) * 100;

  // Determine cache health status
  const status = hitRatio >= 90 ? "optimal" : hitRatio >= 70 ? "good" : "needs_attention";

  return {
    dns: {
      cache: {
        size: dnsCache.size ?? 0,
        maxSize: 255,
        utilization: ((dnsCache.size ?? 0) / 255) * 100,
        ttl: parseInt(process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS || "30"),
      },
      hits: {
        completed: hitsCompleted,
        inflight: hitsInflight,
        total: totalHits,
      },
      misses,
      errors: dnsCache.errors ?? 0,
      hitRatio: Math.round(hitRatio * 10) / 10,
      status,
    },
    connectionPool: {
      maxHttpRequests: preconnect.maxConcurrent,
      preconnect: {
        hosts: preconnect.hosts,
        preconnectedAt: preconnect.preconnectedAt,
        hostList: _preconnectHosts,
      },
      http: {
        maxSockets: httpAgent.maxSockets,
        maxFreeSockets: httpAgent.maxFreeSockets,
      },
      https: {
        maxSockets: httpsAgent.maxSockets,
        maxFreeSockets: httpsAgent.maxFreeSockets,
      },
    },
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// YAML Configuration (optional projects.yaml)
// =============================================================================
interface YAMLConfig {
  projects?: Array<{ name: string; path: string; enabled?: boolean }>;
  settings?: {
    refreshInterval?: number;
    scanDepth?: number;
    autoRefresh?: boolean;
  };
}

async function loadYAMLConfig(configPath: string): Promise<YAMLConfig | null> {
  const file = Bun.file(configPath);
  if (await file.exists()) {
    try {
      const text = await file.text();
      // Bun YAML 1.2 compliant - 'on', 'off', 'yes', 'no' are strings, not booleans
      return YAML.parse(text) as YAMLConfig;
    } catch (e) {
      console.error(`Failed to parse ${configPath}:`, e);
      return null;
    }
  }
  return null;
}

// =============================================================================
// Compile-Time Feature Flags (Dead Code Elimination)
// =============================================================================
// Build different versions:
//   bun build --feature=DEBUG ./index.ts --outfile=dash-debug
//   bun build --feature=false:DEBUG --feature=PREMIUM ./index.ts --outfile=dash-pro
//   bun build --feature=false:DEBUG --feature=false:PREMIUM ./index.ts --outfile=dash-lite

// Debug logging helper - completely removed in production builds
// Note: feature() must be used directly in if/ternary, not wrapped
// Uses %j format specifier for SIMD-accelerated JSON (3x faster in Bun 1.3.6+)
function debug(label: string, data?: unknown): void {
  if (feature("DEBUG")) {
    if (data !== undefined) {
      // Use %j for SIMD FastStringifier path (3x speed boost)
      console.log(`${c.dim}[DEBUG]${c.reset} ${label}: %j`, data);
    } else {
      console.log(`${c.dim}[DEBUG]${c.reset} ${label}`);
    }
  }
}

setupTuiResizeHandler(debug);

// =============================================================================
// S3/R2 Client - Lazy initialized with credentials from config
// =============================================================================
let _s3Client: ReturnType<typeof Bun.s3> | null = null;

function getS3Client() {
  if (_s3Client) return _s3Client;

  const s3Config = getS3Config();
  if (!s3Config.BUCKET) {
    throw new Error("S3/R2 not configured: missing bucket");
  }

  _s3Client = Bun.s3({
    accessKeyId: s3Config.ACCESS_KEY_ID,
    secretAccessKey: s3Config.SECRET_ACCESS_KEY,
    bucket: s3Config.BUCKET,
    region: s3Config.REGION,
    endpoint: s3Config.ENDPOINT, // Required for R2: https://<account-id>.r2.cloudflarestorage.com
  });

  return _s3Client;
}

// Check if S3/R2 is configured
function isS3Configured(): boolean {
  const s3Config = getS3Config();
  return !!(s3Config.BUCKET && s3Config.ACCESS_KEY_ID && s3Config.SECRET_ACCESS_KEY);
}

// S3 export functionality (only in builds with S3_EXPORT)
// S3 Export with Requester Pays Support (Bun 1.3.6+)
// Supports Requester Pays buckets via config.S3.REQUESTER_PAYS
// When requestPayer: true, the requester is charged for data transfer costs
// Content-Encoding support added (Jan 16, 2026 commit: 5d3f37d)
interface S3ExportOptions {
  bucket?: string;
  requestPayer?: boolean;
  contentType?: string;
  contentEncoding?: string; // gzip, br, deflate, etc. (Jan 16, 2026)
}

async function exportToS3(
  filename: string,
  content: string | Uint8Array,
  options?: S3ExportOptions
): Promise<boolean> {
  if (feature("S3_EXPORT")) {
    try {
      if (!isS3Configured()) {
        console.error("S3 export failed: No bucket configured");
        return false;
      }

      const s3Client = getS3Client();
      const requestPayer = options?.requestPayer ?? config.S3.REQUESTER_PAYS;

      // Use Bun's native S3 client with Content-Encoding support (Jan 16, 2026)
      await s3Client.write(filename, content, {
        type: options?.contentType || "application/json",
        contentEncoding: options?.contentEncoding, // gzip, br, deflate support (commit: 5d3f37d)
      });

      debug("S3 export", { filename, requestPayer });
      return true;
    } catch (e) {
      console.error("S3 export failed:", e);
      return false;
    }
  }
  return false;
}

// Export dashboard snapshot to S3
async function exportDashboardSnapshot(): Promise<boolean> {
  if (!feature("S3_EXPORT")) return false;

  const snapshot = {
    timestamp: new Date().toISOString(),
    projects: projects.map(p => ({ name: p.name, branch: p.branch, health: p.health, status: p.status })),
    stats: getStats(),
    system: await getCachedSystemMetrics(),
  };

  const filename = `snapshots/dashboard-${Date.now()}.json`;
  return exportToS3(filename, JSON.stringify(snapshot, null, 2), {
    contentType: "application/json",
  });
}

// Premium features check - use directly: if (feature("PREMIUM")) { ... }
// Cannot wrap in function due to Bun's compile-time dead code elimination

// HTML served dynamically to prevent build-time modification
// (Bun's HTML import modifies the source file during bundling)
const getHomepage = async () => {
  const file = Bun.file("./public/index.html");
  if (await file.exists()) {
    // HTTP/2 Server Push for React dashboard critical resources
    const linkHeaders = [
      '</index.js>; rel=preload; as=script; crossorigin',
      '</styles.css>; rel=preload; as=style',
      // Push font resources to eliminate font loading delay
      'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwgknk-4.woff2>; rel=preload; as=font; type=font/woff2; crossorigin',
      'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwgknk-3.woff2>; rel=preload; as=font; type=font/woff2; crossorigin',
    ].join(', ');

    return new Response(file, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Link": linkHeaders,
      },
    });
  }
  return new Response("Not found", { status: 404 });
};

// =============================================================================
// CLI Argument Parsing
// =============================================================================
const { values: cliArgs } = parseArgs({
  args: Bun.argv,
  options: {
    filter: { type: "string", short: "f", default: "" },
    compact: { type: "boolean", short: "c", default: false },
    problems: { type: "boolean", short: "p", default: false },
    auto: { type: "boolean", short: "a", default: false },
    fast: { type: "boolean", default: false }, // Fast refresh (100ms) - safe with kqueue fix
    depth: { type: "string", short: "d", default: "3" },
    config: { type: "string", default: "projects.yaml" }, // YAML config file
    help: { type: "boolean", short: "h", default: false },
    quiet: { type: "boolean", short: "q", default: false },
    log: { type: "boolean", short: "l", default: false },
  },
  strict: false,
  allowPositionals: true,
});

// Show help and exit
if (cliArgs.help) {
  console.log(`
Enterprise Dashboard Server

Usage: bun run src/server/index.ts [options]

Options:
  -f, --filter <text>   Filter projects by name on startup
  -c, --compact         Start in compact view mode
  -p, --problems        Start in problems-only view
  -a, --auto            Enable auto-refresh (30s interval)
  --fast                Fast refresh mode (100ms) - uses kqueue fix
  -d, --depth <n>       Set git scan depth (default: 3)
  --config <file>       Load projects from YAML config (default: projects.yaml)
  -q, --quiet           Disable interactive console (pipe mode)
  -l, --log             Log viewer mode (pipe stdin)
  -h, --help            Show this help message

Examples:
  bun run src/server/index.ts --filter api --compact
  bun run src/server/index.ts -p -a --fast
  bun run src/server/index.ts --config myprojects.yaml
  bun run src/server/index.ts --depth 4
  cat access.log | bun run src/server/index.ts --log
`);
  process.exit(0);
}

// Check for pipe mode (non-interactive)
const isPipeMode = !process.stdin.isTTY || cliArgs.quiet;

// =============================================================================
// Log Viewer Mode (--log flag)
// Handles piped input: cat file.log | bun run index.ts --log
// =============================================================================
if (cliArgs.log) {
  const logs: string[] = [];
  let scrollOffset = 0;
  const LOG_PAGE_SIZE = 20;
  let streamEnded = false;

  function renderLogViewer() {
    console.write("\x1b[2J\x1b[H"); // Clear screen
    console.log(`\x1b[36m╔══════════════════════════════════════════════════════════════════════════════╗\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m  \x1b[1m\x1b[37mSTREAMING LOG VIEWER\x1b[0m                                                       \x1b[36m║\x1b[0m`);
    console.log(`\x1b[36m╠══════════════════════════════════════════════════════════════════════════════╣\x1b[0m`);
    const status = streamEnded ? "\x1b[33mEOF\x1b[0m" : "\x1b[32mLIVE\x1b[0m";
    console.log(`\x1b[36m║\x1b[0m  Lines: \x1b[32m${logs.length.toString().padEnd(8)}\x1b[0m | Offset: \x1b[33m${scrollOffset.toString().padEnd(8)}\x1b[0m | ${status}              \x1b[36m║\x1b[0m`);
    console.log(`\x1b[36m╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m`);

    const visible = logs.slice(scrollOffset, scrollOffset + LOG_PAGE_SIZE);
    if (visible.length === 0) {
      console.log(`\n  \x1b[2mWaiting for input... (pipe data to stdin)\x1b[0m`);
    } else {
      console.log("");
      visible.forEach((line, i) => {
        const lineNum = (scrollOffset + i + 1).toString().padStart(5);
        const truncated = line.substring(0, 68);
        // Color based on content
        let color = "\x1b[0m";
        if (line.toLowerCase().includes("error")) color = "\x1b[31m";
        else if (line.toLowerCase().includes("warn")) color = "\x1b[33m";
        else if (line.toLowerCase().includes("info")) color = "\x1b[34m";
        else if (line.toLowerCase().includes("success") || line.toLowerCase().includes("ok")) color = "\x1b[32m";

        console.log(`  \x1b[2m${lineNum}\x1b[0m │ ${color}${truncated}\x1b[0m`);
      });
    }

    if (streamEnded) {
      console.log(`\n\x1b[2mStream ended. Total: ${logs.length} lines. Press Ctrl+C to exit.\x1b[0m`);
    } else {
      console.log(`\n\x1b[2mAuto-scrolling... (Ctrl+C to exit)\x1b[0m`);
    }
  }

  // Process stdin stream
  async function processLogPipe() {
    let leftover = "";

    // Cast to AsyncIterable - Bun.stdin.stream() is iterable but types don't reflect this
    for await (const chunk of Bun.stdin.stream() as unknown as AsyncIterable<Uint8Array>) {
      const text = leftover + Buffer.from(chunk).toString();
      const lines = text.split(/\r?\n/);

      // Last element might be incomplete
      leftover = lines.pop() ?? "";

      for (const line of lines) {
        if (line.trim()) {
          logs.push(line);
          // Auto-scroll to bottom
          scrollOffset = Math.max(0, logs.length - LOG_PAGE_SIZE);
        }
      }
      renderLogViewer();
    }

    // Handle any remaining leftover
    if (leftover.trim()) {
      logs.push(leftover);
      scrollOffset = Math.max(0, logs.length - LOG_PAGE_SIZE);
    }

    streamEnded = true;
    renderLogViewer();

    // Keep process alive for viewing
    await new Promise(() => {});
  }

  // Initial render
  renderLogViewer();

  // Start processing pipe and block forever (never reach server code)
  await processLogPipe();
  process.exit(0);
}

// In-memory state
const clients = new Set<ServerWebSocket<unknown>>();

// Session store (in-memory - use Redis in production)
const sessions = new Map<string, SessionData>();

// Default UI state
const defaultUIState: UIState = {
  collapsedProjects: {},
  sidebarCollapsed: false,
  recentFilters: [],
  lastVisited: {},
};

// =============================================================================
// Cookie Configurations - All CookieInit fields explicitly set with defaults
// =============================================================================

/** Theme preference cookie - accessible via JS for initial render */
const COOKIE_THEME = {
  name: "theme",
  maxAge: 60 * 60 * 24 * 365,    // 31,536,000s = 1 year
  expires: undefined,            // Use maxAge instead
  path: "/",                     // Available site-wide
  domain: undefined,             // Current host (default)
  secure: !config.DEVELOPMENT,   // HTTPS only in production
  httpOnly: false,               // Accessible via document.cookie
  sameSite: "lax" as const,      // Allow top-level navigation
  partitioned: false,            // No CHIPS partitioning
} satisfies Omit<CookieInit, "value">;

/** Session ID cookie - secure, not accessible via JS */
const COOKIE_SESSION = {
  name: "session_id",
  maxAge: 60 * 60 * 24 * 7,      // 604,800s = 1 week
  expires: undefined,            // Use maxAge instead
  path: "/",                     // Available site-wide
  domain: undefined,             // Current host (default)
  secure: !config.DEVELOPMENT,   // HTTPS only in production
  httpOnly: true,                // NOT accessible via document.cookie
  sameSite: "strict" as const,   // Never sent cross-site (CSRF protection)
  partitioned: false,            // No CHIPS partitioning
} satisfies Omit<CookieInit, "value">;

/** UI state cookie - stores collapsed projects, sidebar, filters */
const COOKIE_UI_STATE = {
  name: "ui_state",
  maxAge: 60 * 60 * 24 * 30,     // 2,592,000s = 30 days
  expires: undefined,            // Use maxAge instead
  path: "/",                     // Available site-wide
  domain: undefined,             // Current host (default)
  secure: !config.DEVELOPMENT,   // HTTPS only in production
  httpOnly: false,               // Accessible via document.cookie
  sameSite: "lax" as const,      // Allow top-level navigation
  partitioned: false,            // No CHIPS partitioning
} satisfies Omit<CookieInit, "value">;

/** Get cookie options without name field for use with set() */
const cookieOpts = (cfg: typeof COOKIE_THEME | typeof COOKIE_SESSION | typeof COOKIE_UI_STATE) => {
  const { name, ...opts } = cfg;
  return opts;
};
let requestCount = 0;
let errorCount = 0;
let totalLatency = 0;
const startTime = Date.now();
const timeline: TimelinePoint[] = [];
const alerts: Alert[] = [];

// Per-endpoint analytics tracking
interface EndpointStats {
  requests: number;
  errors: number;
  totalLatency: number;
  lastAccessed: number;
  minLatency: number;
  maxLatency: number;
}
const endpointMetrics = new Map<string, EndpointStats>();

function trackEndpoint(path: string, latency: number, isError: boolean) {
  const existing = endpointMetrics.get(path);
  if (existing) {
    existing.requests++;
    if (isError) existing.errors++;
    existing.totalLatency += latency;
    existing.lastAccessed = Date.now();
    existing.minLatency = Math.min(existing.minLatency, latency);
    existing.maxLatency = Math.max(existing.maxLatency, latency);
  } else {
    endpointMetrics.set(path, {
      requests: 1,
      errors: isError ? 1 : 0,
      totalLatency: latency,
      lastAccessed: Date.now(),
      minLatency: latency,
      maxLatency: latency,
    });
  }
}

function getEndpointAnalytics() {
  const entries = Array.from(endpointMetrics.entries())
    .map(([path, stats]) => ({
      path,
      requests: stats.requests,
      errors: stats.errors,
      successRate: stats.requests > 0 ? Math.round(((stats.requests - stats.errors) / stats.requests) * 100) : 100,
      avgLatency: stats.requests > 0 ? Math.round(stats.totalLatency / stats.requests) : 0,
      minLatency: stats.minLatency,
      maxLatency: stats.maxLatency,
      lastAccessed: new Date(stats.lastAccessed).toISOString(),
    }))
    .sort((a, b) => b.requests - a.requests);
  return entries;
}

// Per-project API access tracking
interface ProjectApiStats {
  views: number;
  actions: number;  // open, git, sync operations
  lastAccessed: number;
  endpoints: Set<string>;
}
const projectApiMetrics = new Map<string, ProjectApiStats>();

function trackProjectAccess(projectId: string, action: "view" | "action", endpoint: string) {
  const existing = projectApiMetrics.get(projectId);
  if (existing) {
    if (action === "view") existing.views++;
    else existing.actions++;
    existing.lastAccessed = Date.now();
    existing.endpoints.add(endpoint);
  } else {
    projectApiMetrics.set(projectId, {
      views: action === "view" ? 1 : 0,
      actions: action === "action" ? 1 : 0,
      lastAccessed: Date.now(),
      endpoints: new Set([endpoint]),
    });
  }
}

function getProjectApiAnalytics() {
  return Array.from(projectApiMetrics.entries())
    .map(([projectId, stats]) => ({
      projectId,
      views: stats.views,
      actions: stats.actions,
      totalAccess: stats.views + stats.actions,
      endpointCount: stats.endpoints.size,
      lastAccessed: new Date(stats.lastAccessed).toISOString(),
    }))
    .sort((a, b) => b.totalAccess - a.totalAccess);
}

// Real project data from git repos
let projects: Project[] = [];

// Load secrets from Bun.secrets (falls back to env vars)
await loadSecrets();

// Preconnect to known external hosts (DNS+TCP+TLS early handshake)
// Note: Runtime fetch.preconnect() has issues with external hosts in Bun 1.3.6
// Use --fetch-preconnect CLI flag instead (via restart-server script)
const preconnectHosts = getPreconnectHosts();
if (preconnectHosts.length > 0 && config.DEVELOPMENT) {
  console.log(`${c.dim}◆ Preconnect hosts:${c.reset} ${preconnectHosts.length} (via CLI flag)`);
}

// Initial scan (skip in log viewer mode)
if (!cliArgs.log) {
  console.log("Scanning git repositories...");
  projects = await scanAllRepos();
  console.log(`Found ${projects.length} repositories`);
}

function getStats(): DashboardStats {
  const successRate = requestCount > 0
    ? Math.round(((requestCount - errorCount) / requestCount) * 100)
    : 100;
  const avgLatency = requestCount > 0
    ? Math.round(totalLatency / requestCount)
    : 0;

  return {
    totalRequests: requestCount,
    successRate,
    avgLatency,
    uptime: Math.round((Date.now() - startTime) / 1000),
    timeline: timeline.slice(-config.TIMELINE_DISPLAY_LIMIT),
    alerts: alerts.slice(-config.ALERTS_DISPLAY_LIMIT),
  };
}

async function getDashboardData(): Promise<DashboardData> {
  return {
    projects,
    stats: getStats(),
    system: await getCachedSystemMetrics(),
  };
}

// =============================================================================
// Console Dashboard State (initialized from CLI args or saved state)
// =============================================================================
// Load saved state (falls back to defaults if not found)
let cursor = loadState("lastCursor", 0);
const pageSize = 10;
let viewMode: "full" | "compact" | "problems" | "analytics" = cliArgs.problems
  ? "problems"
  : cliArgs.compact
    ? "compact"
    : loadState("lastViewMode", "full") as "full" | "compact" | "problems" | "analytics";
let searchFilter = (typeof cliArgs.filter === "string" ? cliArgs.filter : "") || loadState("lastFilter", "");
let isChecking = false;
let autoRefresh = cliArgs.auto || false;
let autoRefreshInterval: Timer | null = null;

// Refresh interval - fast mode uses 100ms (safe with kqueue CPU spin fix)
// Normal mode uses 30s to be conservative
const REFRESH_INTERVAL = cliArgs.fast ? 100 : 30000;

// Load optional YAML config
let yamlConfig: YAMLConfig | null = null;
(async () => {
  const configPath = typeof cliArgs.config === "string" ? cliArgs.config : "projects.yaml";
  yamlConfig = await loadYAMLConfig(configPath);
  if (yamlConfig?.settings?.autoRefresh) {
    autoRefresh = true;
  }
})();

// Error log from stderr capture
interface ErrorLogEntry {
  project: string;
  message: string;
  timestamp: Date;
}
const errorLog: ErrorLogEntry[] = [];
const MAX_ERROR_LOG = 5;

// =============================================================================
// Exception Tracking (Enterprise Crash Protection)
// =============================================================================
// Tracks server exceptions for the "Panic Mode" dashboard display

interface ExceptionEntry {
  id: string;
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  timestamp: Date;
  severity: "error" | "warning" | "critical";
}

const exceptionLog: ExceptionEntry[] = [];
const MAX_EXCEPTIONS = 50;
let exceptionCount = 0;

/**
 * Log an exception to the tracking system
 * Returns the exception ID for reference
 */
function trackException(
  error: Error,
  context?: { path?: string; method?: string; severity?: ExceptionEntry["severity"] }
): string {
  const id = `EXC-${Date.now().toString(36).toUpperCase()}`;
  const entry: ExceptionEntry = {
    id,
    message: error.message,
    stack: error.stack,
    path: context?.path,
    method: context?.method,
    timestamp: new Date(),
    severity: context?.severity || "error",
  };

  exceptionLog.unshift(entry);
  if (exceptionLog.length > MAX_EXCEPTIONS) {
    exceptionLog.pop();
  }
  exceptionCount++;

  // Log to console with thermal coloring
  const severityColor = entry.severity === "critical" ? c.err :
                        entry.severity === "error" ? c.yellow : c.blue;
  const severityIcon = entry.severity === "critical" ? "✖" :
                       entry.severity === "error" ? "⚠" : "ℹ";

  console.error(`\n${severityColor}${severityIcon} [${entry.severity.toUpperCase()}] ${entry.id}${c.reset}`);
  console.error(`  ${c.dim}Path:${c.reset} ${entry.path || "unknown"}`);
  console.error(`  ${c.dim}Message:${c.reset} ${entry.message}`);
  if (config.DEVELOPMENT && entry.stack) {
    console.error(`  ${c.dim}Stack:${c.reset}\n${entry.stack.split("\n").slice(1, 4).map(l => `    ${l}`).join("\n")}`);
  }

  return id;
}

/**
 * Get exception stats for dashboard display
 */
function getExceptionStats() {
  const recent = exceptionLog.filter(e =>
    Date.now() - e.timestamp.getTime() < 3600000 // Last hour
  );

  return {
    total: exceptionCount,
    recent: recent.length,
    critical: recent.filter(e => e.severity === "critical").length,
    errors: recent.filter(e => e.severity === "error").length,
    warnings: recent.filter(e => e.severity === "warning").length,
    lastException: exceptionLog[0] || null,
  };
}

// generateErrorPage and escapeHtml are now imported from utils/error-pages.ts

// TUI selection state (arrow navigation)
let selectedRow = 0;

// Check a project's git status and capture stderr
async function checkProjectHealth(projectName: string, projectPath: string): Promise<string | null> {
  try {
    const proc = Bun.spawn(["git", "status", "--porcelain"], {
      cwd: projectPath,
      stderr: "pipe",
      stdout: "pipe",
    });

    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    if (stderr && stderr.trim()) {
      return stderr.split("\n")[0]; // First line of error
    }
    return null;
  } catch (err) {
    return `Failed to check: ${err}`;
  }
}

// Run health checks on all projects
async function runHealthChecks() {
  isChecking = true;

  // Get project paths from the scanner
  const projectPaths = projects.map(p => ({
    name: p.name,
    path: `${config.PROJECTS_DIR}/${p.name}`,
  }));

  // Check projects in parallel (batch of 10)
  const batchSize = 10;
  for (let i = 0; i < projectPaths.length; i += batchSize) {
    const batch = projectPaths.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (p) => {
        const error = await checkProjectHealth(p.name, p.path);
        return { name: p.name, error };
      })
    );

    // Add errors to log
    for (const result of results) {
      if (result.error) {
        errorLog.unshift({
          project: result.name,
          message: result.error,
          timestamp: new Date(),
        });
      }
    }
  }

  // Keep only last N errors
  errorLog.splice(MAX_ERROR_LOG);
  isChecking = false;
}

// Get filtered projects based on current mode
function getFilteredProjects(): Project[] {
  let filtered = projects;

  // Apply search filter
  if (searchFilter) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.branch.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }

  // Apply problems filter
  if (viewMode === "problems") {
    filtered = filtered.filter(p =>
      p.status === "conflict" ||
      p.remote === "behind" ||
      p.remote === "diverged" ||
      p.modifiedFiles > 50 ||
      p.health < 60
    );
  }

  return filtered;
}

// Draw the console dashboard
// Uses stringWidth for pixel-perfect alignment with emojis and ANSI codes
async function drawDashboard() {
  // Analytics view is a completely separate layout
  if (viewMode === "analytics") {
    await drawAnalyticsView();
    return;
  }

  const filtered = getFilteredProjects();
  const stats = getStats();

  // Debug logging (removed in production builds)
  debug("Drawing dashboard", { filtered: filtered.length, viewMode, cursor, selectedRow });

  // Clear screen
  console.write("\x1b[2J\x1b[H");

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH-END HEADER with status badges
  // ═══════════════════════════════════════════════════════════════════════════

  // Status pills
  const onlinePill = createBadge("●", "ONLINE", c.ok);
  const bunPill = createBadge("⚡", "BUN-NATIVE", c.magenta);
  const securePill = createPill("🛡️ SECURE", c.cyan);
  const modePill = feature("PREMIUM")
    ? createBadge("🚀", "PRO", c.yellow)
    : createBadge("📦", "LITE", c.blue);

  // Line 1: Title + Identity Badges
  const titleLine = `🖥️  ${c.bold}${c.white}ENTERPRISE-DASH${c.reset}  ${c.dim}[v1.3.6]${c.reset} ──╼  ${onlinePill}  ( ${bunPill} )  ${securePill}`;

  console.log(`${c.cyan}╔${"═".repeat(getBoxWidth())}╗${c.reset}`);
  console.log(formatBoxLine(titleLine, getBoxWidth() - 2));
  console.log(`${c.cyan}╠${"═".repeat(getBoxWidth())}╣${c.reset}`);

  // Line 2: Metrics Badges
  const projBadge = createBadge("📂", `PROJ: ${projects.length}`);
  const clientBadge = createBadge("💠", `CLIENTS: ${clients.size}`, clients.size > 0 ? c.ok : c.err);
  const successBadge = createBadge(stats.successRate >= 95 ? "✓" : "⚠", `${stats.successRate}%`, stats.successRate >= 95 ? c.ok : c.warn);
  const uptimeBadge = createBadge("⏱️", formatUptime(stats.uptime), c.cyan);

  const metricsLine = `${projBadge}   ${clientBadge}   ${modePill}   ${successBadge}   ${uptimeBadge}`;

  console.log(formatBoxLine(metricsLine, getBoxWidth() - 2));
  console.log(`${c.cyan}╚${"═".repeat(getBoxWidth())}╝${c.reset}`);

  // View mode indicator
  const modeLabel = viewMode === "problems"
    ? `${c.yellow}[PROBLEMS VIEW]${c.reset}`
    : viewMode === "compact"
      ? `${c.blue}[COMPACT]${c.reset}`
      : "";
  const filterLabel = searchFilter ? `${c.magenta}Filter: "${searchFilter}"${c.reset}` : "";

  if (modeLabel || filterLabel) {
    console.log(`  ${modeLabel} ${filterLabel}`);
  }

  if (viewMode === "compact") {
    drawCompactView(filtered);
  } else {
    drawFullTable(filtered);
  }

  // Problems summary
  const problems = projects.filter(p =>
    p.status === "conflict" || p.remote === "behind" || p.remote === "diverged" || p.health < 60
  );

  if (problems.length > 0 && viewMode !== "problems") {
    console.log(`\n${c.yellow}⚠ ${problems.length} project${problems.length > 1 ? "s" : ""} need${problems.length === 1 ? "s" : ""} attention${c.reset}`);
  }

  // Error log panel
  drawErrorLog();

  // Status line
  const statusParts: string[] = [];
  if (isChecking) statusParts.push(`${c.yellow}Checking...${c.reset}`);
  if (autoRefresh) statusParts.push(`${c.ok}Auto-refresh ON${c.reset}`);
  if (statusParts.length > 0) {
    console.log(`  ${statusParts.join("  ")}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH-END FOOTER with feature status badges
  // ═══════════════════════════════════════════════════════════════════════════

  const httpBadge = createBadge("🔌", "HTTP/2: REUSED", c.ok);
  const yamlBadge = createBadge("📦", "YAML: 1.2", c.blue);
  const sqliteBadge = createBadge("💾", "SQLite: OK", c.ok);
  const s3Badge = feature("S3_EXPORT")
    ? createBadge("☁️", "S3: READY", c.magenta)
    : createBadge("☁️", "S3: OFF", c.dim);

  const footerLine = `${httpBadge}  ┃  ${yamlBadge}  ┃  ${sqliteBadge}  ┃  ${s3Badge}`;

  console.log(`\n${c.cyan}╔${"═".repeat(getBoxWidth())}╗${c.reset}`);
  console.log(formatBoxLine(footerLine, getBoxWidth() - 2));
  console.log(`${c.cyan}╚${"═".repeat(getBoxWidth())}╝${c.reset}`);

  // Command bar
  console.log(`  ${c.dim}[r]${c.reset} Refresh  ${c.dim}[s]${c.reset} Short  ${c.dim}[p]${c.reset} Problems  ${c.dim}[m]${c.reset} Metrics  ${c.dim}[g]${c.reset} GC  ${c.dim}[↑↓]${c.reset} Select  ${c.dim}[q]${c.reset} Quit`);
}

// Draw error log panel
function drawErrorLog() {
  console.log(`\n  ${c.dim}┌─ PROCESS ERRORS (stderr) ──────────────────────────────────────────────────┐${c.reset}`);

  if (errorLog.length === 0) {
    console.log(`  ${c.dim}│${c.reset}  ${c.ok}No errors detected${c.reset}                                                       ${c.dim}│${c.reset}`);
  } else {
    for (const entry of errorLog) {
      const time = entry.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const msg = `[${entry.project}] ${entry.message}`.substring(0, 65).padEnd(65);
      console.log(`  ${c.dim}│${c.reset}  ${c.err}⚠${c.reset} ${c.dim}${time}${c.reset} ${msg} ${c.dim}│${c.reset}`);
    }
  }

  console.log(`  ${c.dim}└──────────────────────────────────────────────────────────────────────────────┘${c.reset}`);
}

// Draw full table view
function drawFullTable(filtered: Project[]) {
  if (filtered.length === 0) {
    console.log(`\n  ${c.dim}No projects found${searchFilter ? ` matching "${searchFilter}"` : ""}${c.reset}`);
    return;
  }

  const view = filtered.slice(cursor, cursor + pageSize);
  const showingEnd = Math.min(cursor + pageSize, filtered.length);

  console.log(`\n  ${c.dim}Showing ${cursor + 1}-${showingEnd} of ${filtered.length}${c.reset}`);

  const formatted = view.map((p, viewIndex) => {
    const globalIndex = cursor + viewIndex;
    const isSelected = globalIndex === selectedRow;
    const marker = isSelected ? `${c.cyan}▸${c.reset}` : " ";

    return {
      " ": marker,
      "#": p.id,
      Project: p.name.length > 24 ? p.name.slice(0, 21) + "..." : p.name,
      Branch: p.branch.length > 7 ? p.branch.slice(0, 7) : p.branch,
      Status: p.status === "clean"
        ? `${c.ok}Clean${c.reset}`
        : p.status === "conflict"
          ? `${c.err}CONFLICT${c.reset}`
          : p.modifiedFiles > 50
            ? `${c.warn}${p.modifiedFiles} changed${c.reset}`
            : `${p.modifiedFiles} changed`,
      Remote: p.remote === "ahead"
        ? `${c.blue}↑ ${p.aheadBy}${c.reset}`
        : p.remote === "behind"
          ? `${c.warn}↓ ${p.behindBy}${c.reset}`
          : p.remote === "diverged"
            ? `${c.err}↕ ${p.aheadBy}/${p.behindBy}${c.reset}`
            : `${c.ok}✓${c.reset}`,
      Health: getHealthBar(p.health),
    };
  });

  console.log(Bun.inspect.table(formatted, { colors: true }));
}

// Draw compact view
function drawCompactView(filtered: Project[]) {
  if (filtered.length === 0) {
    console.log(`\n  ${c.dim}No projects found${c.reset}`);
    return;
  }

  console.log("");
  filtered.slice(0, 20).forEach((p, i) => {
    const isSelected = i === selectedRow;
    const marker = isSelected ? `${c.cyan}▸${c.reset}` : " ";
    const status = p.status === "clean" ? `${c.ok}✓${c.reset}` :
                   p.status === "conflict" ? `${c.err}!${c.reset}` :
                   `${c.warn}~${c.reset}`;
    const remote = p.remote === "behind" ? `${c.warn}↓${p.behindBy}${c.reset}` :
                   p.remote === "ahead" ? `${c.blue}↑${p.aheadBy}${c.reset}` :
                   p.remote === "diverged" ? `${c.err}↕${c.reset}` : "";

    console.log(`${marker} ${status} ${p.name.padEnd(28)} ${p.branch.slice(0, 15).padEnd(15)} ${remote}`);
  });

  if (filtered.length > 20) {
    console.log(`  ${c.dim}... and ${filtered.length - 20} more${c.reset}`);
  }
}

// Get colored health bar with true-color gradient using Bun.color
function getHealthBar(health: number): string {
  // Use the new gradient-based health bar for true-color terminals
  return renderHealthBar(health, 8);
}

// Legacy functions for compatibility
function printProjectsTable() {
  drawDashboard();
}

// formatUptime is now imported from utils/tui.ts

// Broadcast to all connected WebSocket clients
async function broadcast(data: DashboardData) {
  // Use realtime manager for topic-based broadcasting
  const { realtime } = await import("./features/realtime");
  realtime.broadcast("dashboard", data);

  // Legacy: also broadcast to all clients directly
  const message = JSON.stringify(data);
  for (const client of clients) {
    try {
      client.send(message);
    } catch {
      // Client disconnected
    }
  }
}

// Rescan repos and check for changes
async function rescanRepos() {
  const oldProjects = projects;
  projects = await scanAllRepos();

  // Generate alerts for status changes
  for (const project of projects) {
    const old = oldProjects.find((p) => p.name === project.name);
    if (!old) {
      alerts.push({
        id: Bun.randomUUIDv7(),
        type: "info",
        message: `New repository discovered: ${project.name}`,
        project: project.name,
        timestamp: new Date(),
      });
      continue;
    }

    // Alert on conflicts
    if (project.status === "conflict" && old.status !== "conflict") {
      alerts.push({
        id: Bun.randomUUIDv7(),
        type: "error",
        message: `Merge conflict detected in ${project.name}`,
        project: project.name,
        timestamp: new Date(),
      });
    }

    // Alert on falling behind
    if (project.behindBy > 0 && old.behindBy === 0) {
      alerts.push({
        id: Bun.randomUUIDv7(),
        type: "warning",
        message: `${project.name} is now ${project.behindBy} commits behind remote`,
        project: project.name,
        timestamp: new Date(),
      });
    }

    // Alert on health drops
    if (project.health < config.HEALTH_WARNING_THRESHOLD && old.health >= config.HEALTH_WARNING_THRESHOLD) {
      alerts.push({
        id: Bun.randomUUIDv7(),
        type: "warning",
        message: `${project.name} health dropped to ${project.health}%`,
        project: project.name,
        timestamp: new Date(),
      });
    }
  }

  // Keep alerts manageable
  if (alerts.length > config.MAX_ALERTS) {
    alerts.splice(0, alerts.length - config.MAX_ALERTS);
  }
}

// Update timeline stats
function updateTimeline() {
  timeline.push({
    timestamp: new Date(),
    requests: requestCount,
    latency: requestCount > 0 ? Math.round(totalLatency / requestCount) : 0,
    errors: errorCount,
  });

  if (timeline.length > config.MAX_TIMELINE_POINTS) timeline.shift();

  getDashboardData().then(broadcast);
}

// Track request metrics
function trackRequest(start: number, path?: string, isError = false) {
  const latency = performance.now() - start;
  requestCount++;
  totalLatency += latency;
  if (path) {
    trackEndpoint(path, latency, isError);
  }
}

// Build TLS config (returns undefined if not enabled)
const tlsConfig = buildTLSConfig(config);

// Apply startup network optimizations (preconnect, DNS prefetch)
// This warms connections before first request, saving ~40-50ms per host
await applyStartupOptimizations();

// =============================================================================
// Admin API Key Bootstrap - Initialize from ADMIN_API_KEY environment variable
// =============================================================================
async function bootstrapAdminKey(): Promise<void> {
  const adminKeyValue = process.env.ADMIN_API_KEY;

  if (!adminKeyValue) {
    // No admin key configured - check if we need one
    if (!hasAdminKey()) {
      console.warn(
        "\x1b[33m[RBAC] Warning: No admin API key configured.\n" +
        "       Set ADMIN_API_KEY env var to create an admin key.\n" +
        "       Example: ADMIN_API_KEY=your-secret-key bun run dev\x1b[0m"
      );
    }
    return;
  }

  // Check if key already exists
  const existingKey = await findApiKeyByRawKey(adminKeyValue);

  if (existingKey) {
    // Key exists - ensure it has all permissions
    if (!existingKey.permissions.includes("admin")) {
      updatePermissions(existingKey.id, ALL_PERMISSIONS);
      console.log(`\x1b[32m[RBAC] Admin key updated: ${existingKey.keyPrefix}****\x1b[0m`);
    } else {
      console.log(`\x1b[32m[RBAC] Admin key ready: ${existingKey.keyPrefix}****\x1b[0m`);
    }
  } else {
    // Create new admin key from env var value
    const result = await createApiKeyFromRaw(adminKeyValue, {
      name: "Bootstrap Admin Key",
      permissions: ALL_PERMISSIONS,
      metadata: { source: "ADMIN_API_KEY env var", createdAt: new Date().toISOString() },
    });
    console.log(`\x1b[32m[RBAC] Admin key created: ${result.prefix}****\x1b[0m`);
  }
}

await bootstrapAdminKey();

// =============================================================================
// Handler Context Objects
// =============================================================================
// Create context objects with dependencies for handler functions

const healthContext = {
  getSystemIntegrity,
  getPreconnectStatus,
  config: { TLS: { ENABLED: config.TLS.ENABLED } },
};

const dashboardContext = {
  getDashboardData,
  getStats,
  trackRequest,
};

const staticContext = {
  config: { DEVELOPMENT: config.DEVELOPMENT },
};

const systemContext = {
  getSystemMetrics,
  getCachedSystemMetrics,
  getQueueStats,
  getEnhancedMemoryMetrics,
  checkPort,
  trackRequest,
};

const ptyContext = {
  config: { DEVELOPMENT: config.DEVELOPMENT },
  trackRequest,
};

const exportContext = {
  config: { S3: { BUCKET: config.S3.BUCKET, REQUESTER_PAYS: config.S3.REQUESTER_PAYS } },
  getS3Config,
  getS3Client,
  isS3Configured,
  projects,
  getStats,
  getCachedSystemMetrics,
};

const analyticsContext = {
  getEndpointAnalytics,
  getProjectApiAnalytics,
  getExceptionStats,
  getCachedSystemMetrics,
  endpointMetrics,
  projectApiMetrics,
  projects,
  requestCount,
  errorCount,
  totalLatency,
  startTime,
  exceptionLog,
  development: config.DEVELOPMENT,
};

const projectsContext = {
  projects,
  trackRequest,
  trackProjectAccess,
};

// =============================================================================
// Route-level Authentication Wrapper
// =============================================================================
// Since Bun.serve routes bypass the fetch handler, we need route-level auth
const server = Bun.serve({
  port: tlsConfig ? 443 : config.PORT, // Use 443 for HTTPS, configured port for HTTP
  hostname: config.HOSTNAME,
  maxRequestBodySize: config.MAX_REQUEST_BODY_SIZE,
  development: config.DEVELOPMENT,
  // Native BoringSSL TLS (only if enabled and certs found)
  ...(tlsConfig && { tls: tlsConfig }),

  routes: {
    // Health endpoint with integrity check (CRC32 hardware accelerated)
    "/health": () => handleHealth(healthContext),
    "/ready": new Response("Ready", { headers: { "X-Ready": "1" } }),

    // React Dashboard static assets (optimized loading)
    "/styles.css": () => handleStylesCss(staticContext),
    "/themes.css": () => handleThemesCss(staticContext),
    "/index.js": () => handleIndexJs(staticContext),

    // Test history files (for HTML reports)
    "/history/:filename": async (req) => {
      try {
        const { filename } = req.params;
        const historyPath = join(process.cwd(), "src/server/kyc/__tests__/history", filename);
        const file = Bun.file(historyPath);
        
        if (await file.exists()) {
          return new Response(file, {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
        
        return new Response("History file not found", { status: 404 });
      } catch (error: any) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    },

    // Legacy static asset routes for backwards compatibility
    "/dist/styles.css": () => new Response(Bun.file("./public/dist/styles.css")),
    "/dist/index.js": () => new Response(Bun.file("./public/dist/index.js"), {
      headers: { "Content-Type": "text/javascript; charset=utf-8" },
    }),
    "/dist/index.css": () => new Response(Bun.file("./public/dist/index.css"), {
      headers: { "Content-Type": "text/css; charset=utf-8" },
    }),

    // Nebula-Flow UI entry point
    "/dashboard": async () => {
      const file = Bun.file("./index.html");
      if (await file.exists()) {
        // HTTP/2 Server Push for critical resources (reduces round trips)
        const linkHeaders = [
          '</dist/ui-bundle.js>; rel=preload; as=script; crossorigin',
          '</dist/ui-bundle.js.map>; rel=preload; as=fetch; crossorigin',
          // Push font resources to eliminate font loading delay
          'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwgknk-4.woff2>; rel=preload; as=font; type=font/woff2; crossorigin',
          'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwgknk-3.woff2>; rel=preload; as=font; type=font/woff2; crossorigin',
        ].join(', ');

        return new Response(file, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Link": linkHeaders,
          },
        });
      }
      return new Response("Not found", { status: 404 });
    },

    // Nebula-Flow UI static files - Optimized bundle first
    "/dist/ui-bundle.js": async () => {
      // Try bundled version first (production optimized)
      const bundleFile = Bun.file("./dist/ui-bundle.js");
      if (await bundleFile.exists()) {
        return new Response(bundleFile, {
          headers: {
            "Content-Type": "text/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=31536000, immutable"
          },
        });
      }
      // Fallback to development version
      const devFile = Bun.file("./ui-frontend/ui.js");
      if (await devFile.exists()) {
        return new Response(devFile, {
          headers: { "Content-Type": "text/javascript; charset=utf-8" },
        });
      }
      return new Response("Not found", { status: 404 });
    },

    // Legacy UI route for backwards compatibility
    "/ui.js": async () => {
      const file = Bun.file("./ui-frontend/ui.js");
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "text/javascript; charset=utf-8" },
        });
      }
      return new Response("Not found", { status: 404 });
    },
    "/ui.config.json": async () => {
      const file = Bun.file("./ui-frontend/ui.config.json");
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      }
      return new Response("Not found", { status: 404 });
    },

    // Serve bundled CSS
    "/dist/ui-styles.css": async () => {
      const cssFile = Bun.file("./dist/ui-styles.css");
      if (await cssFile.exists()) {
        return new Response(cssFile, {
          headers: {
            "Content-Type": "text/css; charset=utf-8",
            "Cache-Control": "public, max-age=31536000, immutable"
          },
        });
      }
      return new Response("Not found", { status: 404 });
    },

    // Serve entire ui-frontend directory for module imports (development fallback)
    "/lib/:path*": async (req) => {
      const url = new URL(req.url);
      const path = url.pathname.replace("/lib/", "");
      const file = Bun.file(`./ui-frontend/lib/${path}`);
      if (await file.exists()) {
        const contentType = path.endsWith(".js") ? "text/javascript; charset=utf-8"
          : path.endsWith(".json") ? "application/json"
          : "application/octet-stream";
        return new Response(file, { headers: { "Content-Type": contentType } });
      }
      return new Response("Not found", { status: 404 });
    },
    "/components/:path*": async (req) => {
      const url = new URL(req.url);
      const path = url.pathname.replace("/components/", "");
      const file = Bun.file(`./ui-frontend/components/${path}`);
      if (await file.exists()) {
        return new Response(file, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
      }
      return new Response("Not found", { status: 404 });
    },
    "/styles/:path*": async (req) => {
      const url = new URL(req.url);
      const path = url.pathname.replace("/styles/", "");
      const file = Bun.file(`./ui-frontend/styles/${path}`);
      if (await file.exists()) {
        return new Response(file, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
      }
      return new Response("Not found", { status: 404 });
    },

    // Serve HTML dynamically (prevents build-time source modification)
    "/": getHomepage,

    // Route performance heatmap with SSR
    "/route-heatmap": () => {
      const html = renderToString(React.createElement(RouteHeatmap));
      const etag = Bun.hash.crc32(html).toString(16).padStart(8, "0");

      return new Response(`
<!DOCTYPE html>
<html>
<head>
  <title>Route Performance Heatmap</title>
  <meta charset="utf-8">
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .route-card { transition: all 0.3s ease; }
    .route-card:hover { transform: translateY(-2px); }
  </style>
</head>
<body>
  <div id="root">${html}</div>
</body>
</html>
      `, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "ETag": `"${etag}"`,
          "Cache-Control": "public, max-age=300",
          "Set-Cookie": "route-heatmap-visited=true; Path=/; HttpOnly; SameSite=Lax"
        }
      });
    },

    // API routes - all return ApiResponse<T>
    "/api/dashboard": () => handleDashboard(dashboardContext),

    "/api/projects": withAuth(() => handleProjectsList(projectsContext), { permission: Permissions.PROJECTS_READ }),

    // Type-safe route parameter for single project
    "/api/projects/:projectId": withAuth((req) => {
      const { projectId } = req.params;
      return handleProjectGet(projectsContext, projectId);
    }, { permission: Permissions.PROJECTS_READ }),

    // Open project directory in Finder/Explorer
    "/api/projects/:projectId/open": withAuth({
      POST: async (req) => {
        const { projectId } = req.params;
        return handleProjectOpen(projectsContext, projectId);
      },
    }, { permission: Permissions.PROJECTS_WRITE }),

    // Execute git command on project
    "/api/projects/:projectId/git": withAuth({
      POST: async (req) => {
        const { projectId } = req.params;
        const body = await req.json().catch(() => ({}));
        return handleProjectGit(projectsContext, projectId, body);
      },
    }, { permission: Permissions.PROJECTS_WRITE }),

    "/api/stats": () => handleStats(dashboardContext),

    // URLPattern route introspection - lists all patterns and groups
    "/api/routes": () => {
      const patternList = listPatterns();
      const groupList = listRouteGroups();

      // Format for Bun.inspect.table display
      const patternsFormatted = patternList.map(p => ({
        Pattern: p.name,
        Path: p.pathname,
        RegExp: p.hasRegExpGroups ? "yes" : "no",
      }));

      const groupsFormatted = groupList.map(g => ({
        Group: g.name,
        Path: g.pathname,
      }));

      return Response.json({
        data: {
          patterns: patternList,
          groups: groupList,
          total: {
            patterns: patternList.length,
            groups: groupList.length,
            withRegExp: patternList.filter(p => p.hasRegExpGroups).length,
          },
          // Include table-formatted output for CLI consumers
          tables: {
            patterns: Bun.inspect.table(patternsFormatted),
            groups: Bun.inspect.table(groupsFormatted),
          },
        },
      });
    },

    // Create snapshot archive of dashboard state (Bun.Archive)
    // GET: Download snapshot, POST: Store to R2
    "/api/snapshot": {
      GET: () => handleSnapshotGet(exportContext),
      POST: () => handleSnapshotPost(exportContext),
    },

    // List stored snapshots from R2
    "/api/snapshots": {
      GET: () => handleSnapshotsList(exportContext),
    },

    // View specific snapshot contents (inline JSON preview)
    "/api/snapshots/:filename": {
      GET: async (req) => {
        const { filename } = req.params;
        const download = new URL(req.url).searchParams.get("download") === "true";
        return handleSnapshotGetFile(exportContext, filename, download);
      },
    },

    // System metrics - CPU, Memory, Processes
    "/api/system": withAuth({
      GET: () => handleSystemGet(systemContext),
    }, { permission: Permissions.SYSTEM_READ }),

    // Live system metrics for real-time monitoring (no cache)
    "/api/system/live": withAuth({
      GET: () => handleSystemLive(systemContext),
    }, { permission: Permissions.SYSTEM_READ }),

    // Check specific port
    "/api/system/port/:port": withAuth(async (req) => {
      const port = parseInt(req.params.port, 10);
      return handleSystemPort(systemContext, port);
    }, { permission: Permissions.SYSTEM_READ }),

    // Force garbage collection (memory flush)
    "/api/system/gc": withAuth({
      POST: () => handleSystemGc(),
    }, { permission: Permissions.SYSTEM_WRITE }),

    // Enhanced system metrics with queue stats and memory analysis
    "/api/system/enhanced": withAuth({
      GET: () => handleSystemEnhanced(systemContext),
    }, { permission: Permissions.SYSTEM_READ }),

    // Queue stats only (lightweight)
    "/api/system/queue": withAuth({
      GET: () => handleSystemQueue(systemContext),
    }, { permission: Permissions.SYSTEM_READ }),

    // Realtime WebSocket stats
    "/api/realtime/stats": {
      GET: async () => {
        const { realtime } = await import("./features/realtime");
        return Response.json({
          data: realtime.getStats(),
        });
      },
    },

    // Realtime activity feed
    "/api/realtime/activities": {
      GET: async (req) => {
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "20", 10);
        const { realtime } = await import("./features/realtime");
        return Response.json({
          data: {
            activities: realtime.getActivities(limit),
            timestamp: Date.now(),
          },
        });
      },
    },

    // Network stats - DNS cache, connection pool, preconnect status
    "/api/network/stats": {
      GET: () => {
        const start = performance.now();
        trackRequest(start, "/api/network/stats");
        return Response.json({
          data: getNetworkStats(),
        });
      },
    },

    // Network status - host matrix with connection status (for NetworkMatrix UI)
    "/api/network/status": {
      GET: () => {
        const start = performance.now();
        trackRequest(start, "/api/network/status");
        return Response.json(getNetworkStatus());
      },
    },

    // Probe a specific host
    "/api/network/probe/:hostId": {
      POST: async (req) => {
        const start = performance.now();
        const url = new URL(req.url);
        const hostId = url.pathname.split("/").pop();
        if (!hostId) {
          return Response.json({ error: "hostId required" }, { status: 400 });
        }
        const result = await probeHost(hostId);
        trackRequest(start, "/api/network/probe/:hostId");
        return Response.json({ data: result });
      },
    },

    // DNS prefetch - warm the DNS cache for a host
    "/api/network/prefetch": {
      POST: async (req) => {
        try {
          const body = await req.json();
          const { host, port = 443 } = body;

          if (!host || typeof host !== "string") {
            return Response.json({ error: "host is required" }, { status: 400 });
          }

          // Prefetch DNS and optionally port-specific record
          dns.prefetch(host, port);

          // Confirm cache was warmed by doing a lookup
          const results = await dns.lookup(host).catch(() => null);

          return Response.json({
            data: {
              success: true,
              host,
              port,
              resolved: results?.[0]?.address || null,
              cacheStats: dns.getCacheStats(),
            },
          });
        } catch (err) {
          return Response.json({
            error: err instanceof Error ? err.message : "Prefetch failed",
          }, { status: 500 });
        }
      },
    },

    // TCP+TLS preconnect - establish connection before needed
    "/api/network/preconnect": {
      POST: async (req) => {
        try {
          const body = await req.json();
          const { url } = body;

          if (!url || typeof url !== "string") {
            return Response.json({ error: "url is required" }, { status: 400 });
          }

          // Validate URL format
          const parsed = new URL(url);

          // Preconnect (DNS + TCP + TLS handshake)
          await fetch.preconnect(url);

          return Response.json({
            data: {
              success: true,
              url,
              host: parsed.hostname,
              protocol: parsed.protocol,
            },
          });
        } catch (err) {
          return Response.json({
            error: err instanceof Error ? err.message : "Preconnect failed",
          }, { status: 500 });
        }
      },
    },

    // Batch prefetch multiple hosts
    "/api/network/prefetch/batch": {
      POST: async (req) => {
        try {
          const body = await req.json();
          const { hosts } = body;

          if (!Array.isArray(hosts)) {
            return Response.json({ error: "hosts array is required" }, { status: 400 });
          }

          const results = await Promise.all(
            hosts.map(async (item: string | { host: string; port?: number }) => {
              const host = typeof item === "string" ? item : item.host;
              const port = typeof item === "string" ? 443 : (item.port || 443);

              dns.prefetch(host, port);
              const lookupResults = await dns.lookup(host).catch(() => null);

              return {
                host,
                port,
                resolved: lookupResults?.[0]?.address || null,
              };
            })
          );

          return Response.json({
            data: {
              success: true,
              prefetched: results.length,
              results,
              cacheStats: dns.getCacheStats(),
            },
          });
        } catch (err) {
          return Response.json({
            error: err instanceof Error ? err.message : "Batch prefetch failed",
          }, { status: 500 });
        }
      },
    },

    // Get/set network configuration (read-only for runtime values)
    "/api/network/config": {
      GET: () => {
        return Response.json({
          data: {
            dnsTtl: {
              current: parseInt(process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS || "30"),
              envVar: "BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS",
              note: "Requires restart to change",
            },
            maxHttpRequests: {
              current: parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256"),
              envVar: "BUN_CONFIG_MAX_HTTP_REQUESTS",
              max: 65336,
              note: "Requires restart to change",
            },
            cacheMaxSize: {
              current: 255,
              note: "Fixed in Bun runtime",
            },
          },
        });
      },
    },

    // Set connection pool limit (requires restart to take effect)
    "/api/network/limit": {
      POST: async (req) => {
        try {
          const body = await req.json();
          const { limit } = body;

          if (typeof limit !== "number" || limit < 1 || limit > 65336) {
            return Response.json({
              error: "Limit must be a number between 1 and 65336",
            }, { status: 400 });
          }

          const oldLimit = parseInt(process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256");
          process.env.BUN_CONFIG_MAX_HTTP_REQUESTS = limit.toString();

          return Response.json({
            data: {
              success: true,
              oldLimit,
              newLimit: limit,
              note: "Restart required for changes to take effect",
            },
          });
        } catch (err) {
          return Response.json({
            error: err instanceof Error ? err.message : "Failed to set limit",
          }, { status: 500 });
        }
      },
    },

    // Set DNS TTL (requires restart to take effect)
    "/api/network/ttl": {
      POST: async (req) => {
        try {
          const body = await req.json();
          const { ttl } = body;

          if (typeof ttl !== "number" || ttl < 1 || ttl > 300) {
            return Response.json({
              error: "TTL must be a number between 1 and 300 seconds",
            }, { status: 400 });
          }

          const oldTtl = parseInt(process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS || "30");
          process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS = ttl.toString();

          return Response.json({
            data: {
              success: true,
              oldTtl,
              newTtl: ttl,
              note: "Restart required for changes to take effect",
            },
          });
        } catch (err) {
          return Response.json({
            error: err instanceof Error ? err.message : "Failed to set TTL",
          }, { status: 500 });
        }
      },
    },

    // Clear DNS cache (entries expire naturally based on TTL)
    "/api/network/clear": {
      POST: () => {
        // Bun doesn't expose a clearCache() method
        // Cache entries expire based on BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS
        const ttl = parseInt(process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS || "30");
        const cacheStats = dns.getCacheStats();

        return Response.json({
          data: {
            success: true,
            message: "DNS cache will clear naturally as entries expire",
            currentCacheSize: cacheStats.size ?? 0,
            ttlSeconds: ttl,
            estimatedClearTime: `${ttl} seconds`,
            tip: "To force immediate clear, restart the server process",
          },
        });
      },
    },

    // Latency test - measure DNS resolution + TCP connect time
    "/api/network/latency-test": {
      GET: async (req) => {
        const url = new URL(req.url);
        const host = url.searchParams.get("host");

        if (!host) {
          return Response.json({ error: "Missing 'host' parameter" }, { status: 400 });
        }

        try {
          // Measure DNS resolution time
          const dnsStart = performance.now();
          const records = await dns.lookup(host);
          const dnsTime = performance.now() - dnsStart;

          if (!records || records.length === 0) {
            return Response.json({ error: `No DNS records found for ${host}` }, { status: 404 });
          }

          // Measure HTTP connect time (HEAD request)
          const connectStart = performance.now();
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          try {
            await fetch(`https://${host}`, {
              method: "HEAD",
              signal: controller.signal,
              verbose: feature("DEBUG") ? true : false,
            });
          } catch {
            // Connection might fail but we still get timing
          }
          clearTimeout(timeout);
          const connectTime = performance.now() - connectStart;

          return Response.json({
            data: {
              host,
              resolved: records[0]?.address,
              family: records[0]?.family === 4 ? "IPv4" : "IPv6",
              dnsTime: Math.round(dnsTime * 100) / 100,
              connectTime: Math.round(connectTime * 100) / 100,
              totalTime: Math.round((dnsTime + connectTime) * 100) / 100,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (e) {
          return Response.json({
            error: `Latency test failed: ${e instanceof Error ? e.message : "Unknown error"}`,
          }, { status: 500 });
        }
      },
    },

    // Startup optimization status
    "/api/network/optimizations": {
      GET: () => {
        return Response.json({
          data: getOptimizationStatus(),
        });
      },
      POST: async () => {
        // Refresh optimizations (re-preconnect, re-prefetch)
        const results = await refreshOptimizations();
        return Response.json({
          data: {
            success: true,
            message: "Optimizations refreshed",
            ...results,
          },
        });
      },
    },

    // Probe host connection timing (measures DNS, connect, TTFB)
    "/api/network/probe": {
      GET: async () => {
        const timings = await probeAllHosts();
        const summary = {
          totalHosts: timings.length,
          avgTtfbMs: Math.round(timings.reduce((sum, t) => sum + t.ttfbMs, 0) / timings.length * 100) / 100,
          reusedConnections: timings.filter(t => t.reused).length,
          failedHosts: timings.filter(t => t.status === 0).length,
        };
        return Response.json({
          data: { timings, summary },
        });
      },
    },

    // Runtime/Bun feature detection
    "/api/runtime": {
      GET: () => {
        return Response.json({
          data: {
            version: Bun.version,
            revision: Bun.revision,
            features: bunFeatures,
            validationTime: `${validationTime.toFixed(2)}ms`,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid,
            timestamp: new Date().toISOString(),
          }
        });
      },
    },

    // Get repository info for GitHub links
    "/api/repo-info": {
      GET: async () => {
        try {
          const cwd = process.cwd();
          
          // Get git remote URL
          const remoteProc = Bun.spawn(["git", "config", "--get", "remote.origin.url"], {
            stdout: "pipe",
            stderr: "pipe",
            cwd,
          });
          
          const remoteOutput = await new Response(remoteProc.stdout).text();
          await remoteProc.exited;
          
          let repoUrl = "https://github.com/brendadeeznuts1111/enterprise-dashboard";
          if (remoteProc.exitCode === 0 && remoteOutput.trim()) {
            // Convert git@github.com:user/repo.git to https://github.com/user/repo
            // or keep https://github.com/user/repo.git and remove .git
            let url = remoteOutput.trim();
            if (url.startsWith("git@")) {
              url = url.replace("git@github.com:", "https://github.com/").replace(".git", "");
            } else if (url.startsWith("https://")) {
              url = url.replace(".git", "");
            }
            repoUrl = url;
          }
          
          // Get current branch
          const branchProc = Bun.spawn(["git", "branch", "--show-current"], {
            stdout: "pipe",
            stderr: "pipe",
            cwd,
          });
          
          const branchOutput = await new Response(branchProc.stdout).text();
          await branchProc.exited;
          
          let branch = "main";
          if (branchProc.exitCode === 0 && branchOutput.trim()) {
            branch = branchOutput.trim();
          } else {
            // Fallback: try to get branch from HEAD
            const headProc = Bun.spawn(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
              stdout: "pipe",
              stderr: "pipe",
              cwd,
            });
            const headOutput = await new Response(headProc.stdout).text();
            await headProc.exited;
            if (headProc.exitCode === 0 && headOutput.trim()) {
              branch = headOutput.trim();
            }
          }
          
          return Response.json({ 
            data: { 
              repoUrl,
              branch,
              cwd: cwd.split("/").pop() || "unknown"
            } 
          });
        } catch (error) {
          // Fallback to defaults on error
          return Response.json({ 
            data: { 
              repoUrl: "https://github.com/brendadeeznuts1111/enterprise-dashboard",
              branch: "main",
              cwd: "unknown"
            } 
          });
        }
      },
    },

    // Cosmic config status (ui-themes, shortcuts, integrity)
    "/api/config/status": {
      GET: async () => {
        try {
          const integrity = getConfigIntegrity();
          return Response.json({ integrity: integrity.combined });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Config status failed" },
            { status: 500 },
          );
        }
      },
    },

    // TOML Configuration files
    "/api/configs": {
      GET: async () => {
        const configDir = "./config";
        const configs: Array<{ name: string; path: string; content: string; description: string; category?: string }> = [];

        try {
          // Scan root config directory
          const rootGlob = new Bun.Glob("*.toml");
          for await (const file of rootGlob.scan({ cwd: configDir })) {
            const content = await Bun.file(`${configDir}/${file}`).text();
            const name = file.replace(".toml", "");

            // Extract description from meta section or first comment
            let description = "";
            const metaMatch = content.match(/\[meta\]\s*\n(?:[^\[]*\n)*?description\s*=\s*"([^"]+)"/);
            if (metaMatch) {
              description = metaMatch[1];
            } else {
              const firstComment = content.split("\n").find((l) => l.trim().startsWith("#") && !l.trim().startsWith("#!"));
              description = firstComment?.replace(/^#+\s*/, "") || "";
            }

            configs.push({
              name,
              path: `config/${file}`,
              content,
              description,
              category: "root",
            });
          }

          // Scan subdirectories (e.g., regions/)
          try {
            const subdirs = ["regions"];
            for (const subdir of subdirs) {
              const subdirPath = `${configDir}/${subdir}`;
              const subdirGlob = new Bun.Glob("*.toml");
              for await (const file of subdirGlob.scan({ cwd: subdirPath })) {
                const content = await Bun.file(`${subdirPath}/${file}`).text();
                const name = `${subdir}/${file.replace(".toml", "")}`;

                // Extract description from meta section or first comment
                let description = "";
                const metaMatch = content.match(/\[meta\]\s*\n(?:[^\[]*\n)*?description\s*=\s*"([^"]+)"/);
                if (metaMatch) {
                  description = metaMatch[1];
                } else {
                  const firstComment = content.split("\n").find((l) => l.trim().startsWith("#") && !l.trim().startsWith("#!"));
                  description = firstComment?.replace(/^#+\s*/, "") || "";
                }

                configs.push({
                  name,
                  path: `config/${subdir}/${file}`,
                  content,
                  description,
                  category: subdir,
                });
              }
            }
          } catch (subdirError) {
            // Subdirectories are optional, continue if they don't exist
            console.warn("Could not scan config subdirectories:", subdirError);
          }

          // Sort: root configs first, then by category, then alphabetically
          configs.sort((a, b) => {
            if (a.category === "root" && b.category !== "root") return -1;
            if (a.category !== "root" && b.category === "root") return 1;
            if (a.category !== b.category) return (a.category || "").localeCompare(b.category || "");
            return a.name.localeCompare(b.name);
          });

          return Response.json({ data: configs });
        } catch (error) {
          return Response.json({ error: "Failed to load configs" }, { status: 500 });
        }
      },
    },

    // Validate a specific config file
    "/api/configs/validate/:name": {
      GET: async (req) => {
        const url = new URL(req.url);
        const name = url.pathname.split("/").pop();
        if (!name) {
          return Response.json({ error: "Config name required" }, { status: 400 });
        }

        const configPath = resolve(`./config/${name}.toml`);

        // Use Bun's native TOML import syntax for better performance
        let parsed: any;
        let content: string;
        try {
          // Try using Bun's native import with type: "toml"
          const module = await import(configPath, { with: { type: "toml" } });
          parsed = module.default;
          
          // Read content separately for validation checks
          const file = Bun.file(configPath);
          content = await file.text();
        } catch (importError: any) {
          // Fallback to file existence check
          const file = Bun.file(configPath);
          if (!await file.exists()) {
            return Response.json({ error: "Config not found" }, { status: 404 });
          }
          
          // If import fails, fall back to Bun.TOML.parse()
          content = await file.text();
          
          // Basic TOML validation by parsing
          try {
            parsed = Bun.TOML.parse(content);
          } catch (parseError) {
            return Response.json({
              error: "TOML parse error",
              message: (parseError as Error).message,
              name,
            }, { status: 400 });
          }
        }

        // Check for required meta section
        const issues: string[] = [];
        if (!parsed.meta) {
          issues.push("Missing [meta] section");
        } else {
          if (!parsed.meta.version) issues.push("Missing meta.version");
          if (!parsed.meta.date) issues.push("Missing meta.date");
          if (!parsed.meta.description) issues.push("Missing meta.description");
        }

        // Check for common issues
        if (content.includes("\t")) {
          issues.push("Contains tabs (use spaces instead)");
        }

        // Check line length
        const lines = content.split("\n");
        const longLines = lines.filter((l) => l.length > 120 && !l.trim().startsWith("#"));
        if (longLines.length > 0) {
          issues.push(`${longLines.length} line(s) exceed 120 characters`);
        }

        return Response.json({
          data: {
            valid: issues.length === 0,
            name,
            path: `config/${name}.toml`,
            parsed: true,
            issues,
            lineCount: lines.length,
            byteCount: content.length,
          }
        });
      },
    },

    // Get a single config file
    "/api/configs/:name": {
      GET: async (req) => {
        const url = new URL(req.url);
        const name = url.pathname.split("/").pop();
        if (!name) {
          return Response.json({ error: "Config name required" }, { status: 400 });
        }

        const configPath = `./config/${name}.toml`;
        const file = Bun.file(configPath);

        if (!await file.exists()) {
          return Response.json({ error: "Config not found" }, { status: 404 });
        }

        const content = await file.text();
        const firstComment = content.split("\n").find((l) => l.startsWith("#"));
        const description = firstComment?.replace(/^#\s*/, "") || "";

        return Response.json({
          data: {
            name,
            path: `config/${name}.toml`,
            content,
            description,
            size: file.size,
            lastModified: file.lastModified,
          }
        });
      },
    },

    // Reload configs (re-read from disk)
    "/api/configs/reload": {
      POST: async () => {
        try {
          const configDir = "./config";
          const configs: Array<{ name: string; path: string; content: string; description: string }> = [];
          const glob = new Bun.Glob("*.toml");

          for await (const file of glob.scan({ cwd: configDir })) {
            const content = await Bun.file(`${configDir}/${file}`).text();
            const name = file.replace(".toml", "");
            const firstComment = content.split("\n").find((l) => l.startsWith("#"));
            const description = firstComment?.replace(/^#\s*/, "") || "";

            configs.push({
              name,
              path: `config/${file}`,
              content,
              description,
            });
          }

          return Response.json({
            data: {
              success: true,
              configsReloaded: configs.length,
              timestamp: new Date().toISOString(),
            }
          });
        } catch (error) {
          return Response.json({ error: "Failed to reload configs" }, { status: 500 });
        }
      },
    },

    // Get config schema/info
    "/api/configs/schema/:name": {
      GET: (req) => {
        const url = new URL(req.url);
        const name = url.pathname.split("/").pop();

        const schemas: Record<string, object> = {
          "network-matrix": {
            type: "object",
            properties: {
              meta: { type: "object", required: ["version", "date", "description"] },
              hosts: { type: "object", additionalProperties: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  env: { type: "string" },
                  color_hex: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                  color_hsl: { type: "string" },
                }
              }},
              dns_prefetch: {
                type: "object",
                properties: {
                  default_hosts: { type: "array", items: { type: "string" } },
                  ttl_seconds: { type: "number", minimum: 1 },
                  max_cache_entries: { type: "number", minimum: 1, maximum: 255 },
                }
              }
            }
          },
          "fetch-preconnect": {
            type: "object",
            properties: {
              meta: { type: "object", required: ["version", "date"] },
              preconnect: { type: "object" },
              pooling: { type: "object" },
              ceiling: { type: "object", properties: {
                default_limit: { type: "number", minimum: 1 },
                max_theoretical: { type: "number", minimum: 1 },
              }},
              performance: { type: "object" },
            }
          },
          "syntax-colors": {
            type: "object",
            properties: {
              colors: { type: "object", additionalProperties: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" } },
              names: { type: "object", additionalProperties: { type: "string" } },
              text_colors: { type: "object", additionalProperties: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" } },
              settings: {
                type: "object",
                properties: {
                  fallback_bg: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                  fallback_text: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                  fallback_name: { type: "string" },
                }
              }
            }
          },
          "server-settings": {
            type: "object",
            properties: {
              meta: { type: "object", required: ["version", "date", "description"] },
              network: {
                type: "object",
                properties: {
                  host: { type: "string" },
                  port: { type: "number", minimum: 1, maximum: 65535 },
                  hostname: { type: "string" },
                  max_request_body_size: { type: "number", minimum: 0 },
                }
              },
              scanning: {
                type: "object",
                properties: {
                  scan_interval_ms: { type: "number", minimum: 1000 },
                  max_repos_per_batch: { type: "number", minimum: 1 },
                  max_concurrent_scans: { type: "number", minimum: 1 },
                  exclude_patterns: { type: "array", items: { type: "string" } },
                }
              },
              intervals: {
                type: "object",
                properties: {
                  status_check_interval_ms: { type: "number", minimum: 1000 },
                  metrics_collection_interval_ms: { type: "number", minimum: 1000 },
                  auto_refresh_interval_ms: { type: "number", minimum: 1000 },
                }
              },
              limits: {
                type: "object",
                properties: {
                  max_projects_displayed: { type: "number", minimum: 1 },
                  max_recent_activity_items: { type: "number", minimum: 1 },
                  max_health_history_points: { type: "number", minimum: 1 },
                }
              },
              health_thresholds: {
                type: "object",
                properties: {
                  good_health: { type: "number", minimum: 0, maximum: 100 },
                  warning_health: { type: "number", minimum: 0, maximum: 100 },
                  critical_health: { type: "number", minimum: 0, maximum: 100 },
                }
              },
              feature_flags: {
                type: "object",
                properties: {
                  enable_s3_export: { type: "boolean" },
                  enable_resource_monitoring: { type: "boolean" },
                  enable_startup_optimizations: { type: "boolean" },
                  enable_analytics: { type: "boolean" },
                }
              },
              cors: {
                type: "object",
                properties: {
                  enabled: { type: "boolean" },
                  origins: { type: "array", items: { type: "string" } },
                  credentials: { type: "boolean" },
                }
              },
              session: {
                type: "object",
                properties: {
                  timeout_ms: { type: "number", minimum: 60000 },
                  cookie_name: { type: "string" },
                }
              },
            }
          },
          "rate-limits": {
            type: "object",
            properties: {
              meta: { type: "object", required: ["version", "date", "description"] },
              endpoints: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  properties: {
                    window_ms: { type: "number", minimum: 1000 },
                    max_requests: { type: "number", minimum: 1 },
                  }
                }
              },
              sensitive_endpoints: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  properties: {
                    window_ms: { type: "number", minimum: 1000 },
                    max_requests: { type: "number", minimum: 1 },
                  }
                }
              },
              burst: {
                type: "object",
                properties: {
                  enabled: { type: "boolean" },
                  max_burst_size: { type: "number", minimum: 1 },
                  burst_window_ms: { type: "number", minimum: 1000 },
                }
              },
              response: {
                type: "object",
                properties: {
                  include_headers: { type: "boolean" },
                  include_retry_after: { type: "boolean" },
                  standard_headers: { type: "boolean" },
                }
              },
            }
          },
          "theme": {
            type: "object",
            properties: {
              meta: { type: "object", required: ["version", "date", "description"] },
              colors: {
                type: "object",
                properties: {
                  primary: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                  secondary: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                  tertiary: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                  accent: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                  background: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                  surface: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                  success: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                  warning: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                  error: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                }
              },
              presets: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  properties: {
                    colors: {
                      type: "object",
                      properties: {
                        primary: { type: "string" },
                        secondary: { type: "string" },
                        tertiary: { type: "string" },
                        accent: { type: "string" },
                      }
                    },
                  }
                }
              },
              typography: {
                type: "object",
                properties: {
                  font_family: { type: "string" },
                  mono_font: { type: "string" },
                  base_size: { type: "string" },
                  line_height: { type: "number" },
                }
              },
              spacing: {
                type: "object",
                properties: {
                  unit: { type: "string" },
                  scale: { type: "string" },
                }
              },
              shadows: {
                type: "object",
                properties: {
                  small: { type: "string" },
                  medium: { type: "string" },
                  large: { type: "string" },
                  glow: { type: "string" },
                }
              },
              animations: {
                type: "object",
                properties: {
                  duration_fast: { type: "string" },
                  duration_normal: { type: "string" },
                  duration_slow: { type: "string" },
                  timing_function: { type: "string" },
                }
              },
            }
          },
          "shortcuts": {
            type: "object",
            properties: {
              meta: { type: "object", required: ["version", "date", "description"] },
              global: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    description: { type: "string" },
                    action: { type: "string" },
                    mode: { type: "string", enum: ["normal", "insert", "visual"] },
                  }
                }
              },
              navigation: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    description: { type: "string" },
                    action: { type: "string" },
                  }
                }
              },
              actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    description: { type: "string" },
                    action: { type: "string" },
                  }
                }
              },
              tabs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    description: { type: "string" },
                    action: { type: "string" },
                  }
                }
              },
              search: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    description: { type: "string" },
                    action: { type: "string" },
                  }
                }
              },
              window: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    description: { type: "string" },
                    action: { type: "string" },
                  }
                }
              },
              config: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    description: { type: "string" },
                    action: { type: "string" },
                  }
                }
              },
              help: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    description: { type: "string" },
                    action: { type: "string" },
                  }
                }
              },
            }
          },
        };

        if (!name || !schemas[name]) {
          return Response.json({ error: "Unknown schema or config", name }, { status: 404 });
        }

        return Response.json({
          data: {
            name,
            schema: schemas[name],
          }
        });
      },
    },

    // =========================================================================
    // Database API - SQLite Persistence (bun:sqlite 3.51.2)
    // =========================================================================

    // Database stats and health
    "/api/db/stats": withAuth({
      GET: () => {
        const stats = db.getDatabaseStats();
        return Response.json({
          data: {
            ...stats,
            sizeMB: (stats.sizeBytes / 1024 / 1024).toFixed(2),
            path: db.DB_PATH,
          }
        });
      },
    }, { permission: Permissions.DATABASE_READ }),

    // Metrics history for analytics
    "/api/db/metrics": withAuth({
      GET: (req) => {
        const url = new URL(req.url);
        const hours = parseInt(url.searchParams.get("hours") || "24", 10);
        const limit = parseInt(url.searchParams.get("limit") || "100", 10);
        const history = db.getMetricsHistory(hours, limit);
        const stats = db.getMetricsStats(hours);
        return Response.json({ data: { history, stats } });
      },
    }, { permission: Permissions.DATABASE_READ }),

    // Activity log
    "/api/db/activity": withAuth({
      GET: (req) => {
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50", 10);
        const projectId = url.searchParams.get("project");
        const activity = projectId
          ? db.getProjectActivity(projectId, limit)
          : db.getRecentActivity(limit);
        return Response.json({ data: activity });
      },
    }, { permission: Permissions.DATABASE_READ }),

    // Settings persistence
    "/api/db/settings": withAuth({
      GET: () => {
        const settings = db.getAllSettings();
        return Response.json({ data: settings });
      },
      POST: async (req) => {
        const body = await req.json() as { key: string; value: unknown };
        if (!body.key) {
          return Response.json({ error: "Missing key" }, { status: 400 });
        }
        db.setSetting(body.key, body.value);
        return Response.json({ data: { success: true, key: body.key } });
      },
    }, { readPermission: Permissions.DATABASE_READ, writePermission: Permissions.DATABASE_WRITE }),

    // Get single setting
    "/api/db/settings/:key": withAuth({
      GET: (req) => {
        const { key } = req.params;
        const value = db.getSetting(key);
        return Response.json({ data: { key, value } });
      },
    }, { permission: Permissions.DATABASE_READ }),

    // Local snapshots (from database, not R2)
    "/api/db/snapshots": withAuth({
      GET: (req) => {
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") || "50", 10);
        const snapshots = db.getSnapshots(limit);
        return Response.json({ data: snapshots });
      },
    }, { permission: Permissions.DATABASE_READ }),

    // Database maintenance
    "/api/db/cleanup": withAuth({
      POST: async (req) => {
        const body = await req.json() as { metricsOlderThanDays?: number; activityOlderThanDays?: number };
        const metricsDeleted = db.cleanupOldMetrics(body.metricsOlderThanDays || 30);
        const activityDeleted = db.cleanupOldActivity(body.activityOlderThanDays || 90);
        return Response.json({
          data: {
            metricsDeleted,
            activityDeleted,
            timestamp: new Date().toISOString(),
          }
        });
      },
    }, { permission: Permissions.DATABASE_WRITE }),

    // Vacuum database (reclaim space)
    "/api/db/vacuum": withAuth({
      POST: () => {
        const beforeStats = db.getDatabaseStats();
        db.vacuum();
        const afterStats = db.getDatabaseStats();
        return Response.json({
          data: {
            before: beforeStats.sizeBytes,
            after: afterStats.sizeBytes,
            freedBytes: beforeStats.sizeBytes - afterStats.sizeBytes,
          }
        });
      },
    }, { permission: Permissions.DATABASE_WRITE }),

    // ASCII Dashboard Panel - Bulletproof Unicode rendering
    "/api/ascii-panel": {
      GET: () => {
        // Build real-time health data from projects
        const currentStats = getStats();
        const healthyCount = projects.filter(p => p.health >= 80).length;
        const warningCount = projects.filter(p => p.health >= 40 && p.health < 80).length;
        const criticalCount = projects.filter(p => p.health < 40).length;

        const rows: DashboardRow[] = [
          { label: "Healthy Projects", value: Math.round((healthyCount / projects.length) * 100), emoji: "✅" },
          { label: "Warning Projects", value: Math.round((warningCount / projects.length) * 100), emoji: "⚠️" },
          { label: "Critical Projects", value: Math.round((criticalCount / projects.length) * 100), emoji: "🔴" },
          { label: "System Uptime", value: Math.min(100, Math.round(currentStats.uptime / 36)), emoji: "⏱️" },
          { label: "API Success Rate", value: Math.round(currentStats.successRate), emoji: "📊" },
        ];

        const panel = renderDashboardPanel("🛡️ Enterprise Health", rows, 50);

        return new Response(panel, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },

    // String width demo - shows Bun.stringWidth accuracy
    "/api/string-width-demo": {
      GET: () => {
        const testCases = [
          { str: "Hello World", expected: 11 },
          { str: "👨‍👩‍👧 Family", expected: 9 },
          { str: "🇺🇸 USA", expected: 6 },
          { str: "\x1b[31mRed Text\x1b[0m", expected: 8 },
          { str: "\x1b[38;2;255;0;0mTrueColor\x1b[0m", expected: 9 },
          { str: hyperlink("Click Me", "https://example.com"), expected: 8 },
          { str: "café", expected: 4 },
          { str: "日本語", expected: 6 },
        ];

        const results = testCases.map(({ str, expected }) => ({
          input: str.replace(/\x1b/g, "\\x1b").substring(0, 30),
          calculated: safeStringWidth(str),
          expected,
          pass: safeStringWidth(str) === expected,
        }));

        return Response.json({
          bunVersion: Bun.version,
          stringWidthSupport: typeof Bun.stringWidth === "function",
          tests: results,
          allPassed: results.every(r => r.pass),
        });
      },
    },

    // Ultra-Enhanced Enterprise Metrics Dashboard
    "/api/metrics/enterprise": {
      GET: async (_, server) => {
        const currentStats = getStats();
        const memory = process.memoryUsage();
        const cpuMetrics = getCpuMetrics();
        const topProjects = await getEnhancedProjectMetrics(projects, 5);
        const gitActivity = await getGitActivityStats(projects);

        // Format uptime as "Xd Xh Xm"
        const uptimeSec = currentStats.uptime;
        const days = Math.floor(uptimeSec / 86400);
        const hours = Math.floor((uptimeSec % 86400) / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        const uptimeStr = `${days}d ${hours}h ${mins}m`;

        // Build ASCII dashboard
        const hostname = os.hostname().slice(0, 20);
        const tlsStatus = config.TLS.ENABLED ? "🔒 HTTPS" : "🔓 HTTP";

        const lines: string[] = [];
        const W = 82; // Total width

        // Header
        lines.push(`╔${"═".repeat(W - 2)}╗`);
        lines.push(`║ 🖥️  ${hostname.padEnd(20)} │ ${uptimeStr.padEnd(12)} │ ${tlsStatus} │ 🚀 Bun ${Bun.version.padEnd(10)}║`);
        lines.push(`╠${"═".repeat(W - 2)}╣`);

        // Server metrics row
        const reqStr = `🔄 ${currentStats.totalRequests} req`;
        const latStr = `⚡ ${currentStats.avgLatency.toFixed(1)}ms`;
        const wsStr = `🖥️ ${server.pendingWebSockets} WS`;
        const subStr = `📡 ${server.subscriberCount("dashboard-updates")} subs`;
        lines.push(`║  📊 SERVER:   ${reqStr.padEnd(12)} │ ${latStr.padEnd(12)} │ ${wsStr.padEnd(10)} │ ${subStr.padEnd(14)}  ║`);

        // System metrics row
        const heapUsed = (memory.heapUsed / 1024 / 1024).toFixed(1);
        const heapTotal = (memory.heapTotal / 1024 / 1024).toFixed(1);
        const cpuStr = `${cpuMetrics.usage}% CPU`;
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = ((totalMem - freeMem) / 1024 / 1024 / 1024).toFixed(1);
        const totalMemGB = (totalMem / 1024 / 1024 / 1024).toFixed(0);
        lines.push(`║  💾 SYSTEM:  🧠 ${heapUsed}/${heapTotal}MB │ 💻 ${cpuStr.padEnd(8)} │ 📂 ${usedMem}GB/${totalMemGB}GB RAM               ║`);

        // Build info row
        lines.push(`║  📦 BUILD:   🎯 ${GIT_COMMIT.slice(0, 7).padEnd(10)} │ 📅 ${BUILD_DATE.slice(0, 10)} │ 🏷️ v${"3.0.0"}                           ║`);

        lines.push(`╚${"═".repeat(W - 2)}╝`);
        lines.push("");

        // Top projects table
        lines.push(`┌─ TOP 5 PROJECTS (File Count, Commits, Path) ${"─".repeat(W - 49)}┐`);
        lines.push(`║  #  │ NAME              │ FILES │ COMMITS │ BRANCH   │ PATH                     ║`);
        lines.push(`╠─────┼───────────────────┼───────┼─────────┼──────────┼${"─".repeat(26)}╣`);

        topProjects.forEach((proj, i) => {
          const marker = i === 0 ? "*" : " ";
          const name = (proj.name.slice(0, 16) + marker).padEnd(17);
          const files = proj.files.toString().padStart(5);
          const commits = proj.commits.toLocaleString().padStart(7);
          const branch = proj.branch.slice(0, 8).padEnd(8);
          const path = proj.path.slice(0, 24).padEnd(24);
          lines.push(`║  ${i + 1}  │ ${name} │ ${files} │ ${commits} │ ${branch} │ ${path} ║`);
        });

        lines.push(`╚─────┴───────────────────┴───────┴─────────┴──────────┴${"─".repeat(26)}╝`);
        lines.push("");

        // Git activity summary
        lines.push(`┌─ GIT ACTIVITY ${"─".repeat(W - 17)}┐`);
        lines.push(`║  📈 Files Changed: ${gitActivity.totalFilesChanged.toString().padEnd(5)} │ 🗂️  Staged: ${gitActivity.stagedProjects} projects │ Modified: ${gitActivity.modifiedProjects} │ Conflicts: ${gitActivity.conflictProjects}    ║`);
        lines.push(`╚${"─".repeat(W - 2)}╝`);

        return new Response(lines.join("\n"), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },

    // JSON version of enterprise metrics
    "/api/metrics/enterprise.json": {
      GET: async (_, server) => {
        const currentStats = getStats();
        const memory = process.memoryUsage();
        const cpuMetrics = getCpuMetrics();
        const topProjects = await getEnhancedProjectMetrics(projects, 5);
        const gitActivity = await getGitActivityStats(projects);

        return Response.json({
          server: {
            hostname: os.hostname(),
            uptime: currentStats.uptime,
            tls: config.TLS.ENABLED,
            bunVersion: Bun.version,
            requests: currentStats.totalRequests,
            avgLatency: currentStats.avgLatency,
            pendingWebSockets: server.pendingWebSockets,
            subscribers: server.subscriberCount("dashboard-updates"),
          },
          system: {
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            cpuUsage: cpuMetrics.usage,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
          },
          build: {
            commit: GIT_COMMIT,
            date: BUILD_DATE,
            version: "3.0.0",
          },
          topProjects,
          gitActivity,
        });
      },
    },

    // Native server metrics (zero-overhead from Bun's C++ core)
    "/api/server/metrics": {
      GET: (_, server) => {
        const stats = getStats();
        const exceptions = getExceptionStats();
        const protocol = config.TLS.ENABLED ? "https" : "http";
        const displayHost = server.hostname === "0.0.0.0" ? "localhost" : server.hostname;

        return Response.json({
          data: {
            // Server identity
            serverId: server.id,

            // Bun runtime info
            bun: {
              version: Bun.version,
              revision: Bun.revision.slice(0, 8),
              env: Bun.env.NODE_ENV || "development",
            },

            // Network binding
            network: {
              hostname: server.hostname,        // Binding address (0.0.0.0)
              displayHost: displayHost,         // Display hostname (localhost)
              port: server.port,                // Listening port
              protocol: protocol,               // http or https
              baseUrl: `${protocol}://${displayHost}:${server.port}`,
              wsUrl: `ws://${displayHost}:${server.port}/dashboard`,
            },

            // Server config
            config: {
              development: config.DEVELOPMENT,
              maxRequestBodySize: config.MAX_REQUEST_BODY_SIZE,
              tlsEnabled: config.TLS.ENABLED,
              projectsDir: config.PROJECTS_DIR,
            },

            // Native Bun counters (zero overhead)
            connections: {
              pendingRequests: server.pendingRequests,
              pendingWebSockets: server.pendingWebSockets,
              dashboardSubscribers: server.subscriberCount("dashboard-updates"),
            },

            // Throughput stats
            throughput: {
              totalRequests: stats.totalRequests,
              avgLatency: stats.avgLatency,
              successRate: stats.successRate,
              uptime: stats.uptime,
              requestsPerSecond: stats.uptime > 0 ? Math.round(stats.totalRequests / stats.uptime) : 0,
            },

            // System info
            system: {
              platform: process.platform,
              arch: process.arch,
              pid: process.pid,
              memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            },

            // Exception stats
            exceptions: {
              total: exceptions.total,
              recent: exceptions.recent,
              critical: exceptions.critical,
            },

            // Legacy flat fields for backward compatibility
            port: server.port,
            hostname: server.hostname,
            protocol: protocol,
            url: `${protocol}://${displayHost}:${server.port}`,
            development: config.DEVELOPMENT,
            totalRequests: stats.totalRequests,
            avgLatency: stats.avgLatency,
            successRate: stats.successRate,
            uptime: stats.uptime,
            requestsPerSecond: stats.uptime > 0 ? Math.round(stats.totalRequests / stats.uptime) : 0,
            pendingRequests: server.pendingRequests,
            pendingWebSockets: server.pendingWebSockets,
            dashboardSubscribers: server.subscriberCount("dashboard-updates"),

            // Rate limiting stats
            rateLimit: rateLimiter.getStats(),

            timestamp: new Date().toISOString(),
          }
        });
      },
    },

    // Analytics matrix endpoint - CLI-friendly output using Bun.inspect.table
    "/api/analytics/matrix": {
      GET: (req) => {
        const url = new URL(req.url);
        const format = url.searchParams.get("format") || "json";
        const limit = parseInt(url.searchParams.get("limit") || "20");
        return handleAnalyticsMatrix(analyticsContext, format, limit);
      },
    },

    // Per-endpoint analytics for specific path
    "/api/analytics/endpoint": {
      GET: (req) => {
        const url = new URL(req.url);
        const path = url.searchParams.get("path");
        if (!path) {
          return Response.json({ error: "Missing 'path' query parameter" }, { status: 400 });
        }
        return handleAnalyticsEndpoint(analyticsContext, path);
      },
    },

    // Per-project API usage analytics
    "/api/analytics/projects": {
      GET: (req) => {
        const url = new URL(req.url);
        const format = url.searchParams.get("format") || "json";
        const limit = parseInt(url.searchParams.get("limit") || "20");
        return handleAnalyticsProjects(analyticsContext, format, limit);
      },
    },

    // =============================================================================
    // Anomaly Detection Endpoints
    // =============================================================================

    // Detect anomalies in current system metrics
    "/api/anomalies/detect": {
      GET: () => handleAnomaliesDetect(analyticsContext),
    },

    // Get anomaly model info
    "/api/anomalies/model": {
      GET: () => handleAnomaliesModelGet(),
      // Reload model from disk
      POST: () => handleAnomaliesModelPost(),
    },

    // =============================================================================
    // Route Topology Endpoint
    // =============================================================================

    "/api/topology": {
      GET: async (req) => {
        const { buildTopologyGraph, getTopologyStats, generateDotGraph, ROUTES, getGroupedRoutes, getExposedHighRiskRoutes } = await import("./features/topology");
        const url = new URL(req.url);
        const format = url.searchParams.get("format") || "json";
        const includeGuards = url.searchParams.get("guards") === "true";
        const riskFilter = url.searchParams.get("risk") ? parseInt(url.searchParams.get("risk")!, 10) : null;
        const groupFilter = url.searchParams.get("group") || null;
        const sortBy = (url.searchParams.get("sort") || "risk") as "risk" | "group" | "path" | "method";

        const options = { includeGuards, riskFilter, groupFilter, sortBy };

        // DOT format for Graphviz
        if (format === "dot") {
          const dot = generateDotGraph(options);
          return new Response(dot, {
            headers: { "Content-Type": "text/vnd.graphviz" },
          });
        }

        // Graph format for force-directed visualization
        if (format === "graph") {
          const graph = buildTopologyGraph(options);
          const stats = getTopologyStats();
          return Response.json({
            data: {
              graph,
              stats,
              timestamp: new Date().toISOString(),
            }
          });
        }

        // Exposed high-risk routes
        if (format === "exposed") {
          const minRisk = riskFilter ?? 3;
          const exposed = getExposedHighRiskRoutes(minRisk);
          return Response.json({
            data: {
              exposed,
              count: exposed.length,
              minRisk,
              timestamp: new Date().toISOString(),
            }
          });
        }

        // Default JSON format with full topology
        const grouped = getGroupedRoutes();
        const stats = getTopologyStats();
        const graph = buildTopologyGraph(options);

        return Response.json({
          data: {
            routes: ROUTES,
            grouped,
            stats,
            graph,
            timestamp: new Date().toISOString(),
          }
        });
      },
    },

    // Exception log endpoint (for monitoring dashboards)
    "/api/exceptions": {
      GET: () => handleExceptions(analyticsContext),
    },

    // TLS/HTTPS status endpoint
    "/api/tls": {
      GET: () => {
        const tls = getTLSInfo(config);
        return Response.json({
          data: {
            enabled: tls.enabled,
            protocol: tls.protocol || null,
            cipher: tls.cipher || null,
            serverName: tls.serverName || null,
            certificate: tls.enabled ? {
              subject: tls.certSubject || null,
              issuer: tls.certIssuer || null,
              expiry: tls.certExpiry?.toISOString() || null,
              daysUntilExpiry: tls.certExpiry
                ? Math.floor((tls.certExpiry.getTime() - Date.now()) / 86400000)
                : null,
            } : null,
            sniEnabled: tls.sniEnabled ?? config.TLS.DOMAINS.length > 1,
            timestamp: new Date().toISOString(),
          }
        });
      },
    },

    // Test endpoint to simulate crashes (development only)
    "/api/crash": {
      GET: () => {
        if (!config.DEVELOPMENT) {
          return Response.json({ error: "Only available in development mode" }, { status: 403 });
        }
        throw new Error("Simulated Enterprise Failure - This is a test exception");
      },
      POST: async (req) => {
        if (!config.DEVELOPMENT) {
          return Response.json({ error: "Only available in development mode" }, { status: 403 });
        }
        const body = await req.json().catch(() => ({}));
        const message = body.message || "Custom simulated failure";
        const severity = body.severity || "error";

        // Track as a manual test exception
        const id = trackException(new Error(message), {
          path: "/api/crash",
          method: "POST",
          severity: severity as "error" | "warning" | "critical",
        });

        return Response.json({
          data: {
            triggered: true,
            id,
            message,
            severity,
          }
        });
      },
    },

    // CRC32 integrity check for project files (hardware accelerated ~9 GB/s)
    "/api/integrity/:projectName": async (req) => {
      const projectName = req.params.projectName;
      const project = projects.find(p => p.name === projectName);
      if (!project) {
        return Response.json({ error: "Project not found" }, { status: 404 });
      }

      const projectPath = `${config.PROJECTS_DIR}/${projectName}`;
      const checksums: Record<string, string> = {};

      try {
        // Get list of tracked files
        const proc = Bun.spawn(["git", "ls-files"], {
          cwd: projectPath,
          stdout: "pipe",
        });
        const output = await new Response(proc.stdout).text();
        await proc.exited;

        const files = output.trim().split("\n").filter(Boolean).slice(0, 50); // Limit to 50 files

        // Calculate CRC32 for each file in parallel
        await Promise.all(files.map(async (file) => {
          try {
            const filePath = `${projectPath}/${file}`;
            const fileData = Bun.file(filePath);
            if (await fileData.exists()) {
              const bytes = await fileData.arrayBuffer();
              const checksum = Bun.hash.crc32(new Uint8Array(bytes));
              checksums[file] = checksum.toString(16).padStart(8, "0");
            }
          } catch {
            // Skip files that can't be read
          }
        }));

        return Response.json({
          data: {
            project: projectName,
            fileCount: Object.keys(checksums).length,
            checksums,
            timestamp: new Date().toISOString(),
          }
        });
      } catch (e) {
        return Response.json({ error: `Failed to check integrity: ${e}` }, { status: 500 });
      }
    },

    // Log search using SIMD-accelerated Buffer.indexOf (up to 2x faster in Bun 1.3.6+)
    // Buffer.indexOf and Buffer.includes now use SIMD-optimized search functions
    "/api/logs/search": {
      POST: async (req) => {
        const body = await req.json() as { pattern: string; file?: string; limit?: number };
        if (!body.pattern) {
          return Response.json({ error: "Missing pattern" }, { status: 400 });
        }

        const logFile = body.file || `${process.env.HOME}/.cache/enterprise-dashboard/app.log`;
        const limit = Math.min(body.limit || 100, 500);

        try {
          const file = Bun.file(logFile);
          if (!(await file.exists())) {
            return Response.json({ data: { matches: [], message: "Log file not found" } });
          }

          // Use SIMD-accelerated Buffer operations for fast searching
          // Buffer.indexOf() and Buffer.includes() are now 2x faster with SIMD optimization
          const buffer = Buffer.from(await file.arrayBuffer());
          const needle = Buffer.from(body.pattern);
          const matches: Array<{ line: number; offset: number; context: string }> = [];

          let offset = 0;
          let lineNumber = 1;
          let lineStart = 0;

          while (offset < buffer.length && matches.length < limit) {
            // SIMD-accelerated indexOf (up to 2x faster in Bun 1.3.6+)
            // Works with both single-byte and multi-byte patterns
            const found = buffer.indexOf(needle, offset);
            if (found === -1) break;

            // Find line boundaries
            let start = found;
            while (start > 0 && buffer[start - 1] !== 10) start--;

            let end = found;
            while (end < buffer.length && buffer[end] !== 10) end++;

            // Count lines up to this point
            for (let i = lineStart; i < start; i++) {
              if (buffer[i] === 10) lineNumber++;
            }
            lineStart = start;

            const context = buffer.slice(start, Math.min(end, start + 200)).toString("utf-8");
            matches.push({
              line: lineNumber,
              offset: found,
              context: context.length > 150 ? context.slice(0, 147) + "..." : context,
            });

            offset = end + 1;
          }

          return Response.json({
            data: {
              pattern: body.pattern,
              file: logFile,
              matches,
              total: matches.length,
              truncated: matches.length >= limit,
            }
          });
        } catch (e) {
          return Response.json({ error: `Search failed: ${e}` }, { status: 500 });
        }
      },
    },

    "/api/rescan": {
      POST: () => {
        requestCount++;
        rescanRepos().then(async () => {
          printProjectsTable();
          broadcast(await getDashboardData());
        });
        return Response.json({ data: { status: "scanning" } } satisfies ApiResponse<{ status: string }>);
      },
    },

    // S3 Export endpoint (requires S3_EXPORT feature flag)
    "/api/export/s3": {
      POST: () => handleExportS3(exportContext),
    },

    // Endpoint health check - uses connection pooling for low latency
    "/api/health-check": {
      POST: async (req) => {
        const body = await req.json() as { url?: string; urls?: string[] };

        // Single URL check
        if (body.url) {
          const result = await checkEndpointHealth(body.url);
          return Response.json({
            data: {
              url: body.url,
              ...result,
              pooled: true, // Indicates connection reuse
            }
          });
        }

        // Batch URL check (parallel with connection pool)
        if (body.urls && Array.isArray(body.urls)) {
          const results = await Promise.all(
            body.urls.slice(0, 20).map(async (url) => ({
              url,
              ...(await checkEndpointHealth(url)),
            }))
          );

          return Response.json({
            data: {
              results,
              pooled: true,
              agentStats: {
                httpSockets: Object.keys(httpAgent.sockets).length,
                httpFreeSockets: Object.keys(httpAgent.freeSockets).length,
                httpsSockets: Object.keys(httpsAgent.sockets).length,
                httpsFreeSockets: Object.keys(httpsAgent.freeSockets).length,
              },
            }
          });
        }

        return Response.json({ error: "Provide 'url' or 'urls' in request body" }, { status: 400 });
      },
    },

    // Proxy status - show proxy configuration (no secrets)
    "/api/proxy-status": {
      GET: () => {
        return Response.json({
          data: {
            enabled: !!proxyConfig,
            url: proxyConfig?.url ? new URL(proxyConfig.url).host : null,
            hasAuth: !!proxyConfig?.headers?.["Proxy-Authorization"],
            hasCorporateId: !!proxyConfig?.headers?.["X-Corporate-ID"],
          }
        });
      },
    },

    // Theme preference with cookies
    "/api/theme": {
      GET: (req) => {
        const theme = req.cookies.get("theme") || "dark";
        return Response.json({ data: { theme } } satisfies ApiResponse<{ theme: string }>);
      },
      POST: async (req) => {
        const body = await req.json() as { theme?: string };
        const theme = body.theme === "light" ? "light" : "dark";

        req.cookies.set(COOKIE_THEME.name, theme, cookieOpts(COOKIE_THEME));

        return Response.json({ data: { theme } } satisfies ApiResponse<{ theme: string }>);
      },
    },

    // Session tracking
    "/api/session": {
      GET: (req) => {
        let sessionId = req.cookies.get("session_id");

        if (!sessionId) {
          sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          req.cookies.set(COOKIE_SESSION.name, sessionId, cookieOpts(COOKIE_SESSION));
        }

        let session = sessions.get(sessionId);
        if (!session) {
          session = {
            sessionId,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            pageViews: 1,
            userAgent: req.headers.get("user-agent") || undefined,
          };
        } else {
          session.lastSeen = Date.now();
          session.pageViews++;
        }
        sessions.set(sessionId, session);

        return Response.json({
          data: {
            sessionId: session.sessionId,
            firstSeen: new Date(session.firstSeen).toISOString(),
            lastSeen: new Date(session.lastSeen).toISOString(),
            pageViews: session.pageViews,
            activeSessions: sessions.size,
          },
        } satisfies ApiResponse<{
          sessionId: string;
          firstSeen: string;
          lastSeen: string;
          pageViews: number;
          activeSessions: number;
        }>);
      },
    },

    // UI state persistence
    "/api/ui-state": {
      GET: (req) => {
        const uiStateCookie = req.cookies.get("ui_state");
        const uiState: UIState = uiStateCookie
          ? { ...defaultUIState, ...JSON.parse(uiStateCookie) }
          : defaultUIState;

        return Response.json({ data: { uiState } } satisfies ApiResponse<{ uiState: UIState }>);
      },

      POST: async (req) => {
        const body = (await req.json()) as Partial<UIState>;

        // Get existing state
        const existingCookie = req.cookies.get("ui_state");
        const existingState: UIState = existingCookie
          ? JSON.parse(existingCookie)
          : { ...defaultUIState };

        // Merge updates
        const updatedState: UIState = {
          ...existingState,
          ...body,
          collapsedProjects: {
            ...existingState.collapsedProjects,
            ...body.collapsedProjects,
          },
          lastVisited: {
            ...existingState.lastVisited,
            ...body.lastVisited,
          },
        };

        // Limit recent filters to last 10
        if (updatedState.recentFilters.length > 10) {
          updatedState.recentFilters = updatedState.recentFilters.slice(-10);
        }

        // Save to cookie
        req.cookies.set(COOKIE_UI_STATE.name, JSON.stringify(updatedState), cookieOpts(COOKIE_UI_STATE));

        return Response.json({ data: { uiState: updatedState } } satisfies ApiResponse<{ uiState: UIState }>);
      },

      DELETE: (req) => {
        req.cookies.delete(COOKIE_UI_STATE.name, { path: COOKIE_UI_STATE.path });
        return Response.json({ data: { cleared: true } } satisfies ApiResponse<{ cleared: boolean }>);
      },
    },

    // Logout - clear all user cookies
    "/api/logout": {
      POST: (req) => {
        const sessionId = req.cookies.get("session_id");

        // Remove from in-memory store
        if (sessionId) {
          sessions.delete(sessionId);
        }

        // Delete all user cookies using named configurations
        req.cookies.delete(COOKIE_SESSION.name, { path: COOKIE_SESSION.path });
        req.cookies.delete(COOKIE_UI_STATE.name, { path: COOKIE_UI_STATE.path });
        req.cookies.delete(COOKIE_THEME.name, { path: COOKIE_THEME.path });
        req.cookies.delete("cli_sync", { path: "/" });

        return Response.json({
          data: {
            cleared: true,
            cookies: ["session_id", "ui_state", "theme", "cli_sync"],
          }
        } satisfies ApiResponse<{ cleared: boolean; cookies: string[] }>);
      },
    },

    // CLI-Web State Sync - Bridge between terminal and web dashboard
    // Uses Bun.Cookie native APIs for zero-overhead parsing
    "/api/sync": {
      // GET: Retrieve current CLI dashboard state for web UI
      GET: (req) => {
        // Get state from cookie or fall back to CLI state
        const cookieState = req.cookies.get("cli_sync");
        let syncedState = {
          cursor,
          selectedRow,
          viewMode,
          searchFilter,
          pageSize,
          autoRefresh,
          projectCount: projects.length,
          lastSync: Date.now(),
        };

        if (cookieState) {
          try {
            const parsed = JSON.parse(cookieState);
            syncedState = { ...syncedState, ...parsed };
          } catch {}
        }

        return Response.json({
          data: {
            cli: syncedState,
            source: cookieState ? "cookie" : "cli",
          }
        });
      },

      // POST: Update CLI state from web UI (bidirectional sync)
      POST: async (req) => {
        const body = await req.json() as {
          cursor?: number;
          selectedRow?: number;
          viewMode?: "full" | "compact" | "problems";
          searchFilter?: string;
        };

        // Update CLI state variables
        if (typeof body.cursor === "number") {
          cursor = Math.max(0, body.cursor);
        }
        if (typeof body.selectedRow === "number") {
          selectedRow = Math.max(0, body.selectedRow);
        }
        if (body.viewMode && ["full", "compact", "problems"].includes(body.viewMode)) {
          viewMode = body.viewMode;
        }
        if (typeof body.searchFilter === "string") {
          searchFilter = body.searchFilter;
        }

        // Persist to SQLite for CLI restart persistence
        saveState("lastCursor", cursor);
        saveState("lastViewMode", viewMode);
        saveState("lastFilter", searchFilter);

        // Also set cookie for web UI persistence
        const syncState = {
          cursor,
          selectedRow,
          viewMode,
          searchFilter,
          lastSync: Date.now(),
        };

        // Use native Cookie.from() for proper serialization
        const syncCookie = Cookie.from("cli_sync", JSON.stringify(syncState), {
          maxAge: 60 * 60 * 24, // 1 day
          httpOnly: false,      // Allow JS access for web UI
          sameSite: "lax",
          path: "/",
        });

        // Use Response.json() for SIMD-optimized performance (Bun 1.3.6+)
        return Response.json({
          data: {
            synced: true,
            state: syncState,
          }
        }, {
          headers: {
            "Set-Cookie": syncCookie.serialize(),
          }
        });
      },
    },

    // Debug endpoint - show all cookies (dev only)
    "/api/debug/cookies": {
      GET: (req) => {
        if (!config.DEVELOPMENT) {
          return Response.json({ error: "Not available in production" }, { status: 403 });
        }

        // Iterate all cookies using CookieMap
        const cookies: Array<{ name: string; value: string; preview: string }> = [];
        for (const [name, value] of req.cookies) {
          cookies.push({
            name,
            value: name === "session_id" ? value.substring(0, 20) + "..." : value,
            preview: value.length > 50 ? value.substring(0, 50) + "..." : value,
          });
        }

        // Check for specific cookies using has()
        const hasSession = req.cookies.has("session_id");
        const hasTheme = req.cookies.has("theme");
        const hasUIState = req.cookies.has("ui_state");
        const hasCLISync = req.cookies.has("cli_sync");

        return Response.json({
          data: {
            count: req.cookies.size,
            has: { session_id: hasSession, theme: hasTheme, ui_state: hasUIState, cli_sync: hasCLISync },
            cookies,
            raw: req.cookies.toJSON(),
            headers: req.cookies.toSetCookieHeaders(),
          }
        });
      },
    },

    // Cookie parser endpoint - parse and inspect a cookie string
    "/api/debug/parse-cookie": {
      POST: async (req) => {
        if (!config.DEVELOPMENT) {
          return Response.json({ error: "Not available in production" }, { status: 403 });
        }

        const body = await req.json() as { cookie: string };
        if (!body.cookie) {
          return Response.json({ error: "Missing cookie string" }, { status: 400 });
        }

        try {
          // Use Cookie.parse() to parse a cookie string
          const cookie = Cookie.parse(body.cookie);

          return Response.json({
            data: {
              parsed: {
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                expires: cookie.expires?.toISOString(),
                maxAge: cookie.maxAge,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
                partitioned: cookie.partitioned,
              },
              isExpired: cookie.isExpired(),
              serialized: cookie.serialize(),
              json: cookie.toJSON(),
            }
          });
        } catch (e) {
          return Response.json({ error: `Parse error: ${e}` }, { status: 400 });
        }
      },
    },

    // Create cookie endpoint - demonstrate Cookie.from()
    "/api/debug/create-cookie": {
      POST: async (req) => {
        if (!config.DEVELOPMENT) {
          return Response.json({ error: "Not available in production" }, { status: 403 });
        }

        const body = await req.json() as {
          name: string;
          value: string;
          maxAge?: number;
          httpOnly?: boolean;
          secure?: boolean;
          sameSite?: "strict" | "lax" | "none";
        };

        if (!body.name || !body.value) {
          return Response.json({ error: "Missing name or value" }, { status: 400 });
        }

        // Use Cookie.from() factory method
        const cookie = Cookie.from(body.name, body.value, {
          maxAge: body.maxAge ?? 3600,
          httpOnly: body.httpOnly ?? false,
          secure: body.secure ?? false,
          sameSite: body.sameSite ?? "lax",
          path: "/",
        });

        return Response.json({
          data: {
            cookie: cookie.toJSON(),
            serialized: cookie.serialize(),
            toString: cookie.toString(),
            isExpired: cookie.isExpired(),
          }
        });
      },
    },

    // Session analytics endpoint
    "/api/admin/sessions": {
      GET: (req) => {
        // Simple auth check
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ") || !config.DEVELOPMENT) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessionList = Array.from(sessions.values()).map(s => ({
          id: s.sessionId.substring(0, 15) + "...",
          firstSeen: new Date(s.firstSeen).toISOString(),
          lastSeen: new Date(s.lastSeen).toISOString(),
          pageViews: s.pageViews,
          duration: Math.floor((Date.now() - s.firstSeen) / 1000),
          idle: Math.floor((Date.now() - s.lastSeen) / 1000),
          userAgent: s.userAgent?.substring(0, 50) || "unknown",
        }));

        // Calculate stats
        const now = Date.now();
        const activeCount = sessionList.filter(s => s.idle < 300).length; // Active in last 5 min
        const totalPageViews = sessionList.reduce((sum, s) => sum + s.pageViews, 0);
        const avgDuration = sessionList.length > 0
          ? Math.floor(sessionList.reduce((sum, s) => sum + s.duration, 0) / sessionList.length)
          : 0;

        return Response.json({
          data: {
            stats: {
              total: sessions.size,
              active: activeCount,
              totalPageViews,
              avgDuration: formatUptime(avgDuration),
            },
            sessions: sessionList,
          }
        });
      },
    },

    // API Key management endpoints (admin only - protected by withAuth)
    "/api/admin/api-keys": withAuth({
      // List all API keys
      GET: async (req) => {
        const includeRevoked = new URL(req.url).searchParams.get("includeRevoked") === "true";
        const keys = listApiKeys(includeRevoked);
        return Response.json({
          data: {
            keys: keys.map((k) => ({
              id: k.id,
              keyPrefix: k.keyPrefix,
              name: k.name,
              permissions: k.permissions,
              createdAt: k.createdAt,
              expiresAt: k.expiresAt,
              lastUsedAt: k.lastUsedAt,
              revokedAt: k.revokedAt,
            })),
            total: keys.length,
          },
        });
      },
      // Create a new API key
      POST: async (req) => {
        const body = (await req.json()) as {
          name: string;
          permissions?: Permission[];
          expiresAt?: number;
          metadata?: Record<string, unknown>;
        };

        if (!body.name || typeof body.name !== "string") {
          return Response.json({ error: "Name is required" }, { status: 400 });
        }

        const permissions = body.permissions
          ? filterValidPermissions(body.permissions)
          : ["urlpattern:read"] as Permission[];

        const result = await createApiKey({
          name: body.name,
          permissions,
          expiresAt: body.expiresAt,
          metadata: body.metadata,
        });

        return Response.json({
          data: {
            id: result.id,
            key: result.key, // Only shown once at creation
            prefix: result.prefix,
            name: body.name,
            permissions,
            message: "Store this key securely - it cannot be retrieved again",
          },
        });
      },
    }, { adminOnly: true }),

    // API Key operations by ID (admin only)
    "/api/admin/api-keys/:id": withAuth({
      // Update API key permissions
      PUT: async (req) => {
        const { id } = req.params;
        const body = (await req.json()) as { permissions: Permission[] };

        if (!body.permissions || !Array.isArray(body.permissions)) {
          return Response.json({ error: "Permissions array required" }, { status: 400 });
        }

        const validPermissions = filterValidPermissions(body.permissions);
        const success = updatePermissions(id, validPermissions);

        if (!success) {
          return Response.json({ error: "API key not found" }, { status: 404 });
        }

        return Response.json({
          data: { id, permissions: validPermissions, message: "Permissions updated" },
        });
      },
      // Revoke an API key
      DELETE: async (req) => {
        const { id } = req.params;
        const permanent = new URL(req.url).searchParams.get("permanent") === "true";

        const success = permanent ? deleteKey(id) : revokeKey(id);

        if (!success) {
          return Response.json({ error: "API key not found" }, { status: 404 });
        }

        return Response.json({
          data: {
            id,
            action: permanent ? "deleted" : "revoked",
            message: permanent ? "API key permanently deleted" : "API key revoked",
          },
        });
      },
    }, { adminOnly: true }),

    // =========================================================================
    // KYC Failsafe API Endpoints
    // =========================================================================

    "/api/kyc/failsafe": withAuth({
      POST: async (req, { auth }) => {
        const start = performance.now();
        trackRequest(start, "/api/kyc/failsafe");
        try {
          const { KYCFailsafeEngine } = await import("./kyc/failsafeEngine");
          const body = await req.json() as { userId: string; primaryFailureReason: string };
          
          if (!body.userId) {
            return Response.json({ error: "userId is required" }, { status: 400 });
          }

          const kycFailsafeEngine = new KYCFailsafeEngine();
          const result = await kycFailsafeEngine.executeFailsafe(
            body.userId,
            body.primaryFailureReason || "primary_flow_timeout"
          );

          return Response.json({ data: result });
        } catch (error: any) {
          return Response.json({ error: error.message || "KYC failsafe execution failed" }, { status: 500 });
        }
      },
    }, { permission: Permissions.KYC_EXECUTE }),

    "/api/kyc/review-queue": withAuth({
      GET: async (req) => {
        const start = performance.now();
        trackRequest(start, "/api/kyc/review-queue");
        try {
          const { KYCDashboard } = await import("./kyc/kycDashboard");
          const { getKYCReviewQueueFiltered } = await import("./db");
          const url = new URL(req.url);
          const searchParams = url.searchParams;
          
          // Check if advanced filters are provided
          const hasAdvancedFilters = 
            searchParams.has("userId") ||
            searchParams.has("traceId") ||
            searchParams.has("reviewerId") ||
            searchParams.has("priority") ||
            searchParams.has("riskScoreMin") ||
            searchParams.has("riskScoreMax") ||
            searchParams.has("createdAtFrom") ||
            searchParams.has("createdAtTo") ||
            searchParams.has("deviceSignature");
          
          const kycDashboard = new KYCDashboard();
          
          if (hasAdvancedFilters) {
            // Use advanced filtering
            const filters: db.KYCReviewQueueFilters = {
              status: (searchParams.get("status") as "pending" | "approved" | "rejected" | null) || undefined,
              userId: searchParams.get("userId") || undefined,
              traceId: searchParams.get("traceId") || undefined,
              reviewerId: searchParams.get("reviewerId") || undefined,
              priority: (searchParams.get("priority") as "low" | "medium" | "high" | null) || undefined,
              riskScoreMin: searchParams.has("riskScoreMin") ? parseInt(searchParams.get("riskScoreMin")!) : undefined,
              riskScoreMax: searchParams.has("riskScoreMax") ? parseInt(searchParams.get("riskScoreMax")!) : undefined,
              createdAtFrom: searchParams.has("createdAtFrom") ? parseInt(searchParams.get("createdAtFrom")!) : undefined,
              createdAtTo: searchParams.has("createdAtTo") ? parseInt(searchParams.get("createdAtTo")!) : undefined,
              deviceSignature: searchParams.get("deviceSignature") || undefined,
              limit: searchParams.has("limit") ? parseInt(searchParams.get("limit")!) : 100,
            };
            
            const queue = kycDashboard.getReviewQueueFiltered(filters);
            return Response.json({ data: { queue, total: queue.length } });
          } else {
            // Use simple status filter (backward compatible)
            const status = searchParams.get("status") as "pending" | "approved" | "rejected" | undefined;
            const queue = kycDashboard.getReviewQueue(status);
            return Response.json({ data: { queue, total: queue.length } });
          }
        } catch (error: any) {
          return Response.json({ error: error.message || "Failed to get review queue" }, { status: 500 });
        }
      },
    }, { permission: Permissions.KYC_REVIEW }),

    "/api/kyc/review-queue/:traceId": withAuth({
      GET: async (req) => {
        const start = performance.now();
        trackRequest(start, "/api/kyc/review-queue/:traceId");
        try {
          const { KYCDashboard } = await import("./kyc/kycDashboard");
          const { traceId } = req.params;
          
          const kycDashboard = new KYCDashboard();
          const item = kycDashboard.getReviewItem(traceId);

          if (!item) {
            return Response.json({ error: "Review item not found" }, { status: 404 });
          }

          return Response.json({ data: item });
        } catch (error: any) {
          return Response.json({ error: error.message || "Failed to get review item" }, { status: 500 });
        }
      },
      POST: async (req) => {
        const start = performance.now();
        trackRequest(start, "/api/kyc/review-queue/:traceId");
        try {
          const { KYCDashboard } = await import("./kyc/kycDashboard");
          const { traceId } = req.params;
          const body = await req.json() as { action: "approve" | "reject"; reviewerId: string };
          
          if (!body.action || !body.reviewerId) {
            return Response.json({ error: "action and reviewerId are required" }, { status: 400 });
          }

          const kycDashboard = new KYCDashboard();
          if (body.action === "approve") {
            kycDashboard.approveReview(traceId, body.reviewerId);
          } else {
            kycDashboard.rejectReview(traceId, body.reviewerId);
          }

          return Response.json({ data: { traceId, action: body.action, success: true } });
        } catch (error: any) {
          return Response.json({ error: error.message || "Failed to update review" }, { status: 500 });
        }
      },
    }, { permission: Permissions.KYC_REVIEW }),

    "/api/kyc/metrics": withAuth({
      GET: async () => {
        const start = performance.now();
        trackRequest(start, "/api/kyc/metrics");
        try {
          const { KYCDashboard } = await import("./kyc/kycDashboard");
          const kycDashboard = new KYCDashboard();
          const metrics = kycDashboard.getMetrics();

          return Response.json({ data: metrics });
        } catch (error: any) {
          return Response.json({ error: error.message || "Failed to get KYC metrics" }, { status: 500 });
        }
      },
    }, { permission: Permissions.KYC_REVIEW }),

    "/api/kyc/audit/:traceId": withAuth({
      GET: async (req) => {
        const start = performance.now();
        trackRequest(start, "/api/kyc/audit/:traceId");
        try {
          const { getKYCAuditLog } = await import("./db");
          const { traceId } = req.params;
          
          const auditLog = getKYCAuditLog(traceId);

          return Response.json({
            data: auditLog.map((log) => ({
              ...log,
              details: log.details_json ? JSON.parse(log.details_json) : {},
              timestamp: new Date(log.timestamp * 1000),
            })),
          });
        } catch (error: any) {
          return Response.json({ error: error.message || "Failed to get audit log" }, { status: 500 });
        }
      },
    }, { permission: Permissions.KYC_REVIEW }),

    // Bulk cookie operations
    "/api/cookies": {
      // Get all user preference cookies using named configurations
      GET: (req) => {
        const theme = req.cookies.get(COOKIE_THEME.name) || "dark";
        const uiStateCookie = req.cookies.get(COOKIE_UI_STATE.name);
        const sessionId = req.cookies.get(COOKIE_SESSION.name);

        const uiState: UIState = uiStateCookie
          ? { ...defaultUIState, ...JSON.parse(uiStateCookie) }
          : defaultUIState;

        return Response.json({
          data: {
            theme,
            uiState,
            hasSession: !!sessionId,
            cookieCount: req.cookies.size,
          }
        });
      },

      // Bulk update preferences using named configurations
      POST: async (req) => {
        const body = await req.json() as {
          theme?: "dark" | "light";
          uiState?: Partial<UIState>;
        };

        // Update theme if provided
        if (body.theme) {
          req.cookies.set(COOKIE_THEME.name, body.theme, cookieOpts(COOKIE_THEME));
        }

        // Update UI state if provided
        if (body.uiState) {
          const existingCookie = req.cookies.get(COOKIE_UI_STATE.name);
          const existingState: UIState = existingCookie
            ? JSON.parse(existingCookie)
            : { ...defaultUIState };

          const updatedState: UIState = {
            ...existingState,
            ...body.uiState,
            collapsedProjects: {
              ...existingState.collapsedProjects,
              ...body.uiState.collapsedProjects,
            },
            lastVisited: {
              ...existingState.lastVisited,
              ...body.uiState.lastVisited,
            },
          };

          req.cookies.set(COOKIE_UI_STATE.name, JSON.stringify(updatedState), cookieOpts(COOKIE_UI_STATE));
        }

        return Response.json({
          data: {
            updated: true,
            theme: body.theme,
            uiState: body.uiState ? true : false,
          }
        });
      },
    },

    // URLPattern observability endpoints
    "/api/urlpattern/analyze": {
      POST: async (req) => {
        const start = performance.now();
        trackRequest(start, "/api/urlpattern/analyze");
        try {
          const { URLPatternUltimateAnalyzer } = await import("./features/urlpattern-observability");
          const analyzer = new URLPatternUltimateAnalyzer();
          const body = await req.json().catch(() => ({})) as URLPatternAnalysisRequest;
          
          let analyses: URLPatternAnalysis[];
          if (body.analyzeAll || !body.pattern) {
            // Analyze all router patterns
            analyses = await analyzer.analyzeRouterPatterns();
          } else {
            // Analyze specific pattern
            const analysis = await analyzer.analyzePattern(body.pattern);
            analyses = [analysis];
          }
          
          const summary: URLPatternAnalysisSummary = {
            totalPatterns: analyses.length,
            avgComplexity: analyses.reduce((sum, a) => sum + a.complexity, 0) / analyses.length,
            bun134Features: {
              execMethod: analyses.filter(a => a.bunSpecific.supportsExecMethod).length,
              testMethod: analyses.filter(a => a.bunSpecific.supportsTestMethod).length,
              fetchProxy: analyses.filter(a => a.proxyAnalysis.fetchProxyOptionSupported).length,
              connectHeaders: analyses.filter(a => a.proxyAnalysis.connectHeadersForwarded).length,
              agentKeepAlive: analyses.filter(a => a.agentAnalysis.httpAgentKeepAliveWorking).length,
              proxyAuth: analyses.filter(a => a.proxyAnalysis.proxyAuthorizationHandled).length,
            },
            recommendations: analyses
              .filter(a => !a.bunSpecific.supportsExecMethod)
              .map(a => `Upgrade to Bun 1.3.4+ for URLPattern.exec() support`)
              .filter((v, i, a) => a.indexOf(v) === i)
          };
          
          return Response.json({
            data: {
              patterns: analyses,
              summary
            }
          } satisfies ApiResponse<{ patterns: URLPatternAnalysis[]; summary: URLPatternAnalysisSummary }>);
        } catch (error: any) {
          return Response.json({
            error: error.message || "Failed to analyze patterns"
          } satisfies ApiResponse<never>, { status: 500 });
        }
      },
    },

    "/api/urlpattern/test": {
      GET: async () => {
        const start = performance.now();
        trackRequest(start, "/api/urlpattern/test");
        try {
          const { URLPatternUltimateAnalyzer } = await import("./features/urlpattern-observability");
          const analyzer = new URLPatternUltimateAnalyzer();
          const results = await analyzer.testBun134AllFeatures();
          
          return Response.json({
            data: results
          } satisfies ApiResponse<URLPatternTestResult>);
        } catch (error: any) {
          return Response.json({
            error: error.message || "Failed to test Bun features"
          } satisfies ApiResponse<never>, { status: 500 });
        }
      },
    },

    "/api/urlpattern/report": {
      GET: async () => {
        const start = performance.now();
        trackRequest(start, "/api/urlpattern/report");
        try {
          const { URLPatternUltimateAnalyzer } = await import("./features/urlpattern-observability");
          const analyzer = new URLPatternUltimateAnalyzer();
          
          // Analyze all router patterns first
          await analyzer.analyzeRouterPatterns();
          
          const report = analyzer.generateComprehensiveBun134Report();
          
          return Response.json({
            data: {
              report,
              timestamp: new Date().toISOString()
            }
          } satisfies ApiResponse<{ report: string; timestamp: string }>);
        } catch (error: any) {
          return Response.json({
            error: error.message || "Failed to generate report"
          } satisfies ApiResponse<never>, { status: 500 });
        }
      },
    },

    "/api/urlpattern/patterns": withAuth({
      GET: async () => {
        const start = performance.now();
        trackRequest(start, "/api/urlpattern/patterns");
        try {
          const { URLPatternUltimateAnalyzer } = await import("./features/urlpattern-observability");
          const analyzer = new URLPatternUltimateAnalyzer();
          const analyses = await analyzer.analyzeRouterPatterns();

          return Response.json({
            data: analyses
          } satisfies ApiResponse<URLPatternAnalysis[]>);
        } catch (error: any) {
          return Response.json({
            error: error.message || "Failed to analyze router patterns"
          } satisfies ApiResponse<never>, { status: 500 });
        }
      },
    }, { permission: "urlpattern:read" }),

    // =========================================================================
    // Peek Cache API - Bun.peek() Sync Pattern Access
    // =========================================================================

    "/api/peek-cache/stats": withAuth({
      GET: () => {
        const start = performance.now();
        trackRequest(start, "/api/peek-cache/stats");
        const stats = getCacheStats();
        return Response.json({
          data: {
            ...stats,
            timestamp: new Date().toISOString(),
            bunVersion: Bun.version,
          }
        });
      },
    }, { permission: "urlpattern:read" }),

    "/api/peek-cache/warm": {
      POST: async () => {
        const start = performance.now();
        trackRequest(start, "/api/peek-cache/warm");
        try {
          const result = await warmPatternCache();
          return Response.json({
            data: {
              ...result,
              timestamp: new Date().toISOString(),
              message: `Warmed ${result.warmed} patterns in ${result.totalTimeMs.toFixed(2)}ms`,
            }
          });
        } catch (error: any) {
          return Response.json({
            error: error.message || "Failed to warm pattern cache"
          }, { status: 500 });
        }
      },
    },

    "/api/peek-cache/clear": {
      POST: () => {
        const start = performance.now();
        trackRequest(start, "/api/peek-cache/clear");
        clearPatternCache();
        return Response.json({
          data: {
            cleared: true,
            timestamp: new Date().toISOString(),
            message: "Pattern cache cleared",
          }
        });
      },
    },

    "/api/peek-cache/test": {
      GET: () => {
        const start = performance.now();
        trackRequest(start, "/api/peek-cache/test");

        // Test matching against various URLs
        const testUrls = [
          "/api/projects/test-project",
          "/api/projects/another-one/open",
          "/api/system/port/8080",
          "/api/db/settings/theme",
          "/api/integrity/my-project",
          "/api/snapshots/backup.json",
        ];

        const patternNames: RoutePattern[] = [
          "project", "projectOpen", "projectGit",
          "systemPort", "dbSetting", "integrity", "snapshotFile"
        ];

        const results = testUrls.map(url => {
          const matches: Array<{
            pattern: string;
            matched: boolean;
            cacheHit: string;
            matchTimeNs: number;
            params?: Record<string, string>;
          }> = [];

          for (const patternName of patternNames) {
            const result = matchRouteCached(url, patternName);
            if (result) {
              matches.push({
                pattern: patternName,
                matched: true,
                cacheHit: result.cacheHit,
                matchTimeNs: result.matchTimeNs,
                params: result.params,
              });
            }
          }

          return { url, matches };
        });

        const stats = getCacheStats();

        return Response.json({
          data: {
            testResults: results,
            cacheStats: {
              hits: stats.hits,
              syncHits: stats.syncHits,
              asyncHits: stats.asyncHits,
              syncHitRate: stats.syncHitRate,
              avgMatchTimeNs: stats.avgMatchTimeNs,
            },
            elapsed: (performance.now() - start).toFixed(2) + "ms",
          }
        });
      },
    },

    // =========================================================================
    // PTY Routes - Interactive Terminal Sessions (Bun 1.3.6+)
    // =========================================================================

    "/api/pty/sessions": withAuth({
      GET: () => handlePTYSessions(ptyContext),
    }, { permission: Permissions.PTY_ACCESS }),

    "/api/pty/create": withAuth({
      POST: async (req) => {
        const body = await req.json();
        return handlePTYCreate(ptyContext, body);
      },
    }, { permission: Permissions.PTY_ACCESS }),

    "/api/pty/stats": withAuth({
      GET: () => handlePTYStats(ptyContext),
    }, { permission: Permissions.PTY_ACCESS }),

    "/api/pty/exec": withAuth({
      POST: async (req) => {
        const body = await req.json();
        return handlePTYExec(ptyContext, body);
      },
    }, { permission: Permissions.PTY_ACCESS }),
  },

  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade for /dashboard
    if (url.pathname === "/dashboard") {
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined;
    }

    // Let Bun handle /_bun/ routes (dev server assets)
    if (url.pathname.startsWith("/_bun/")) {
      return undefined;
    }

    // Dev mode: Serve source files for HMR (TypeScript/TSX transpiled on-the-fly)
    if (config.DEVELOPMENT && url.pathname.startsWith("/src/")) {
      const filePath = "." + url.pathname;
      const file = Bun.file(filePath);
      if (await file.exists()) {
        // Transpile TS/TSX files for browser consumption
        if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
          const transpiler = new Bun.Transpiler({ loader: filePath.endsWith(".tsx") ? "tsx" : "ts" });
          const code = await file.text();
          const result = transpiler.transformSync(code);
          return new Response(result, {
            headers: { "Content-Type": "text/javascript; charset=utf-8" },
          });
        }
        // Serve CSS and other assets directly
        return new Response(file);
      }
    }

    // Skip rate limiting for health checks and static assets
    if (url.pathname !== "/health" && !url.pathname.startsWith("/dist/")) {
      // Multi-scope rate limiting: IP + User-ID + Device Fingerprint
      const { response: rateLimitResponse, result: rateLimitResult } = checkRateLimit(req, server);
      if (rateLimitResponse) {
        // Log rate limit hit for monitoring
        if (config.DEVELOPMENT) {
          console.warn(`[RATE LIMIT] ${rateLimitResult.scope}:${rateLimitResult.key} blocked on ${url.pathname}`);
        }
        return rateLimitResponse;
      }
    }

    // Authenticate request (extract API key and validate)
    const authContext = await authenticate(req);

    // URLPattern-based route guards (debug routes, admin routes, etc.)
    const routeGroup = getRouteGroup(url.pathname);
    if (routeGroup) {
      const guard = checkRouteGuard({
        url,
        method: req.method,
        group: routeGroup,
        isDevelopment: config.DEVELOPMENT,
        auth: authContext,
      });

      if (!guard.allowed) {
        return Response.json(
          { error: guard.message } satisfies ApiResponse<never>,
          { status: guard.status }
        );
      }
    }

    // URLPattern validation for parameterized routes (using peek cache)
    const paramRoutes: RoutePattern[] = [
      "project", "projectOpen", "projectGit",
      "snapshot", "systemPort", "dbSetting", "integrity"
    ];

    for (const patternName of paramRoutes) {
      // Use cached matching for sync access (no await overhead)
      const match = matchRouteCached(url.pathname, patternName);
      if (match) {
        const validation = validateRouteParams(patternName, match.params);
        if (!validation.valid) {
          return Response.json(
            { error: validation.error } satisfies ApiResponse<never>,
            { status: 400 }
          );
        }
        // Log cache performance in dev mode
        if (config.DEVELOPMENT && match.cacheHit === "sync") {
          // Sync hit - pattern was pre-warmed
        }
        // Valid - let Bun.serve routes handle it
        break;
      }
    }

    // PTY session routes (dynamic :sessionId parameter)
    const ptySessionMatch = url.pathname.match(/^\/api\/pty\/session\/([a-f0-9-]+)(\/\w+)?$/);
    if (ptySessionMatch) {
      const sessionId = ptySessionMatch[1];
      const action = ptySessionMatch[2]?.slice(1); // Remove leading /
      
      const start = performance.now();
      ptyContext.trackRequest(start, `/api/pty/session/:sessionId${action ? `/${action}` : ""}`);

      // GET /api/pty/session/:sessionId - Get session info
      if (!action && req.method === "GET") {
        return handlePTYSession(sessionId);
      }

      // GET /api/pty/session/:sessionId/output - Get session output
      if (action === "output" && req.method === "GET") {
        const fromLine = parseInt(url.searchParams.get("from") || "0");
        return handlePTYSessionOutput(sessionId, fromLine);
      }

      // POST /api/pty/session/:sessionId/write - Write to session
      if (action === "write" && req.method === "POST") {
        const body = await req.json();
        return handlePTYSessionWrite(sessionId, body);
      }

      // POST /api/pty/session/:sessionId/resize - Resize session
      if (action === "resize" && req.method === "POST") {
        const body = await req.json();
        return handlePTYSessionResize(sessionId, body);
      }

      // POST /api/pty/session/:sessionId/kill - Kill session
      if (action === "kill" && req.method === "POST") {
        return handlePTYSessionKill(sessionId);
      }

      // DELETE /api/pty/session/:sessionId - Remove session
      if (!action && req.method === "DELETE") {
        return handlePTYSessionRemove(sessionId);
      }
    }

    // CLI Tools API routes
    if (url.pathname.startsWith("/api/cli/")) {
      const start = performance.now();
      
      if (url.pathname === "/api/cli/commands" && req.method === "GET") {
        trackRequest(start, "/api/cli/commands");
        const { handleListCommands } = await import("./cli-api");
        return handleListCommands();
      }
      
      if (url.pathname === "/api/cli/analyze" && req.method === "POST") {
        trackRequest(start, "/api/cli/analyze");
        const { handleAnalyze } = await import("./cli-api");
        return handleAnalyze(req);
      }
      
      if (url.pathname === "/api/cli/diagnose" && req.method === "POST") {
        trackRequest(start, "/api/cli/diagnose");
        const { handleDiagnose } = await import("./cli-api");
        return handleDiagnose(req);
      }
      
      if (url.pathname === "/api/cli/bang" && req.method === "POST") {
        trackRequest(start, "/api/cli/bang");
        const { handleBang } = await import("./cli-api");
        return handleBang(req);
      }

      // Enhanced Diagnose API endpoints
      if (url.pathname === "/api/diagnose/health") {
        trackRequest(start, "/api/diagnose/health");
        const { handleDiagnoseHealth } = await import("./cli-api");
        return handleDiagnoseHealth(req);
      }

      if (url.pathname === "/api/diagnose/grade") {
        trackRequest(start, "/api/diagnose/grade");
        const { handleDiagnoseGrade } = await import("./cli-api");
        return handleDiagnoseGrade(req);
      }

      if (url.pathname === "/api/diagnose/painpoints") {
        trackRequest(start, "/api/diagnose/painpoints");
        const { handleDiagnosePainpoints } = await import("./cli-api");
        return handleDiagnosePainpoints(req);
      }

      if (url.pathname === "/api/diagnose/benchmark") {
        trackRequest(start, "/api/diagnose/benchmark");
        const { handleDiagnoseBenchmark } = await import("./cli-api");
        return handleDiagnoseBenchmark(req);
      }

      if (url.pathname === "/api/diagnose/cache/clear" && req.method === "POST") {
        trackRequest(start, "/api/diagnose/cache/clear");
        const { handleDiagnoseCacheClear } = await import("./cli-api");
        return handleDiagnoseCacheClear();
      }
    }

    // Benchmark API routes
    if (url.pathname.startsWith("/api/benchmarks")) {
      const start = performance.now();
      const { listBenchmarks, getBenchmarkDetails, runBenchmark, runRouteBenchmark, runProjectBenchmark } = await import("./services/bench-service");

      // GET /api/benchmarks - List all benchmarks
      if (url.pathname === "/api/benchmarks" && req.method === "GET") {
        trackRequest(start, "/api/benchmarks");
        try {
          const benchmarks = listBenchmarks();
          return Response.json({ data: benchmarks });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      // GET /api/benchmarks/:name - Get benchmark details
      const benchmarkNameMatch = url.pathname.match(/^\/api\/benchmarks\/([^/]+)$/);
      if (benchmarkNameMatch && req.method === "GET") {
        trackRequest(start, "/api/benchmarks/:name");
        try {
          const name = benchmarkNameMatch[1];
          const details = getBenchmarkDetails(name);
          if (!details) {
            return Response.json({ error: "Benchmark not found" }, { status: 404 });
          }
          return Response.json({ data: details });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      // POST /api/benchmarks/:name/run - Run benchmark
      const benchmarkRunMatch = url.pathname.match(/^\/api\/benchmarks\/([^/]+)\/run$/);
      if (benchmarkRunMatch && req.method === "POST") {
        trackRequest(start, "/api/benchmarks/:name/run");
        try {
          const name = benchmarkRunMatch[1];
          const body = await req.json().catch(() => ({}));
          const { projectId, route, method, testSeed, iterations } = body;

          let results;
          if (name.startsWith("route-")) {
            // Route benchmark
            const group = name.replace("route-", "");
            if (route) {
              results = await runRouteBenchmark(route, method || "GET", { iterations, testSeed });
            } else {
              // Run all routes in group
              const { ROUTES } = await import("./features/topology");
              const groupRoutes = ROUTES.filter(r => r.group === group);
              const routeResults = await Promise.all(
                groupRoutes.map(r => runRouteBenchmark(r.path, r.methods[0], { iterations, testSeed }))
              );
              return Response.json({ data: { group, routes: routeResults } });
            }
          } else if (name === "project" && projectId) {
            // Project benchmark
            results = await runProjectBenchmark(projectId);
          } else {
            // Runtime benchmark
            results = await runBenchmark(name, { json: true });
          }

          return Response.json({ data: results });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      // POST /api/benchmarks/routes/:route - Run route benchmark directly
      const routeBenchmarkMatch = url.pathname.match(/^\/api\/benchmarks\/routes\/(.+)$/);
      if (routeBenchmarkMatch && req.method === "POST") {
        trackRequest(start, "/api/benchmarks/routes/:route");
        try {
          const route = decodeURIComponent(routeBenchmarkMatch[1]);
          const body = await req.json().catch(() => ({}));
          const method = body.method || "GET";
          const { testSeed, iterations } = body;
          const result = await runRouteBenchmark(route, method, { iterations, testSeed });
          return Response.json({ data: result });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      // POST /api/benchmarks/projects/:projectId - Run project benchmark directly
      const projectBenchmarkMatch = url.pathname.match(/^\/api\/benchmarks\/projects\/([^/]+)$/);
      if (projectBenchmarkMatch && req.method === "POST") {
        trackRequest(start, "/api/benchmarks/projects/:projectId");
        try {
          const projectId = projectBenchmarkMatch[1];
          const result = await runProjectBenchmark(projectId);
          return Response.json({ data: result });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      // GET /api/benchmarks/results - Get results history
      if (url.pathname === "/api/benchmarks/results" && req.method === "GET") {
        trackRequest(start, "/api/benchmarks/results");
        // TODO: Implement results history storage
        return Response.json({ data: [] });
      }

      // POST /api/benchmarks/seed - Generate test seed
      if (url.pathname === "/api/benchmarks/seed" && req.method === "POST") {
        trackRequest(start, "/api/benchmarks/seed");
        try {
          const { generateTestSeed } = await import("./services/bench-service");
          const body = await req.json().catch(() => ({}));
          const { seed } = body;
          const result = generateTestSeed(seed);
          return Response.json({ data: result });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      // POST /api/benchmarks/hosts/:hostId - Benchmark network matrix host
      const hostBenchmarkMatch = url.pathname.match(/^\/api\/benchmarks\/hosts\/([^/]+)$/);
      if (hostBenchmarkMatch && req.method === "POST") {
        trackRequest(start, "/api/benchmarks/hosts/:hostId");
        try {
          const { runHostBenchmark } = await import("./services/bench-service");
          const { getNetworkStatus } = await import("./features/network");
          const hostId = hostBenchmarkMatch[1];
          const body = await req.json().catch(() => ({}));
          const { iterations, testSeed } = body;

          // Get host URL from network status
          const networkStatus = getNetworkStatus();
          const host = networkStatus.hosts.find((h: any) => h.id === hostId);
          if (!host || !host.url) {
            return Response.json({ error: `Host not found or URL not configured: ${hostId}` }, { status: 404 });
          }

          const result = await runHostBenchmark(hostId, host.url, { iterations, testSeed });
          return Response.json({ data: result });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }
    }

    // Test Runner API routes
    if (url.pathname.startsWith("/api/tests")) {
      const start = performance.now();
      const { runTests, listTestFiles, runTestsWithSeed } = await import("./services/test-runner-service");

      // GET /api/tests/list - List available test files
      if (url.pathname === "/api/tests/list" && req.method === "GET") {
        trackRequest(start, "/api/tests/list");
        try {
          const params = new URLSearchParams(url.search);
          const pattern = params.get("pattern") || undefined;
          const files = await listTestFiles(pattern);
          return Response.json({ data: files });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      // POST /api/tests/run - Run tests
      if (url.pathname === "/api/tests/run" && req.method === "POST") {
        trackRequest(start, "/api/tests/run");
        try {
          const body = await req.json().catch(() => ({}));
          const {
            pattern,
            testNamePattern,
            timeout,
            concurrent,
            maxConcurrency,
            seed,
            bail,
            watch,
            coverage,
            updateSnapshots,
            rerunEach,
            randomize,
            reporter,
            reporterOutfile,
          } = body;

          // Use seed from benchmark system if provided
          let result;
          if (seed) {
            result = await runTestsWithSeed(seed, {
              pattern,
              testNamePattern,
              timeout,
              concurrent,
              maxConcurrency,
              bail,
              watch,
              coverage,
              updateSnapshots,
              rerunEach,
              reporter,
              reporterOutfile,
            });
          } else {
            result = await runTests({
              pattern,
              testNamePattern,
              timeout,
              concurrent,
              maxConcurrency,
              seed,
              bail,
              watch,
              coverage,
              updateSnapshots,
              rerunEach,
              randomize,
              reporter,
              reporterOutfile,
            });
          }

          return Response.json({ data: result });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      // GET /api/tests - Get test runner info
      if (url.pathname === "/api/tests" && req.method === "GET") {
        trackRequest(start, "/api/tests");
        return Response.json({
          data: {
            version: "1.0.0",
            features: [
              "concurrent execution",
              "test seeds",
              "coverage",
              "snapshots",
              "watch mode",
              "timeouts",
            ],
          },
        });
      }
    }

    // 404 for unmatched routes
    return Response.json({ error: "Not found" } satisfies ApiResponse<never>, { status: 404 });
  },

  websocket: {
    async open(ws) {
      // Register with realtime manager
      const { realtime } = await import("./features/realtime");
      realtime.register(ws, ["dashboard"]);

      // Legacy: add to clients set
      clients.add(ws);

      // Set WebSocket clients for KYC failsafe engine
      const { setKYCWebSocketClients } = await import("./kyc/failsafeEngine");
      setKYCWebSocketClients(clients);

      // Send initial data
      ws.send(JSON.stringify(await getDashboardData()));
    },

    async message(ws, message) {
      const msgStr = String(message);

      // Handle realtime protocol messages
      const { realtime } = await import("./features/realtime");
      realtime.handleMessage(ws, msgStr);

      // Handle legacy rescan requests
      try {
        const data = JSON.parse(msgStr);
        if (data.action === "rescan") {
          realtime.addActivity({
            type: "system",
            message: "Manual rescan triggered",
          });
          rescanRepos().then(async () => {
            printProjectsTable();
            broadcast(await getDashboardData());
          });
        }
      } catch {
        // Not JSON, ignore
      }
    },

    async close(ws) {
      // Unregister from realtime manager
      const { realtime } = await import("./features/realtime");
      realtime.unregister(ws);

      // Legacy: remove from clients set
      clients.delete(ws);
    },
  },

  error(error: Error, request?: Request) {
    // Track the exception in our monitoring system
    const path = request ? new URL(request.url).pathname : "unknown";
    const method = request?.method || "unknown";

    const exceptionId = trackException(error, {
      path,
      method,
      severity: "error",
    });

    // Check Accept header to determine response format
    const acceptsHtml = request?.headers.get("Accept")?.includes("text/html");

    // For API requests or non-browser clients, return JSON
    if (!acceptsHtml || path.startsWith("/api/")) {
      return Response.json(
        {
          error: true,
          message: config.DEVELOPMENT ? error.message : "Internal server error",
          id: exceptionId,
          stack: config.DEVELOPMENT ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // For browser requests, return beautiful HTML error page
    return new Response(
      generateErrorPage(error, { path, id: exceptionId }, config.DEVELOPMENT),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  },
});

// Make server accessible for graceful shutdown
globalThis._server = server;

// Display startup info with TLS status
const protocol = tlsConfig ? "https" : "http";
const wsProtocol = tlsConfig ? "wss" : "ws";
const tlsBadge = createTLSBadge(config);

console.log(`Server running at ${protocol}://${config.HOST}:${server.port}`);
console.log(`WebSocket endpoint: ${wsProtocol}://${config.HOST}:${server.port}/dashboard`);
console.log(`Security: ${tlsBadge}`);
if (tlsConfig) {
  const tls = getTLSInfo(config);
  if (tls.serverName) console.log(`  Server Name: ${tls.serverName}`);
  if (tls.certExpiry) {
    const daysLeft = Math.floor((tls.certExpiry.getTime() - Date.now()) / 86400000);
    const expiryColor = daysLeft < 30 ? c.err : daysLeft < 90 ? c.warn : c.ok;
    console.log(`  Certificate Expires: ${expiryColor}${daysLeft} days${c.reset}`);
  }
}
if (config.DEVELOPMENT) {
  console.log("Development mode: HMR enabled");
}

// Warm the URLPattern peek cache for sync access
warmPatternCache().then((result) => {
  console.log(`${c.ok}✅ Peek Cache:${c.reset} ${result.warmed} patterns warmed in ${result.totalTimeMs.toFixed(1)}ms`);
  if (result.errors > 0) {
    console.warn(`${c.warn}⚠️  ${result.errors} pattern compile errors${c.reset}`);
  }
});

// Initialize KYC Review Queue Processor
(async () => {
  try {
    const { ReviewQueueProcessor } = await import("./kyc/reviewQueueProcessor");
    const { setKYCWebSocketClients } = await import("./kyc/failsafeEngine");
    const processor = new ReviewQueueProcessor();
    processor.startCron();
    setKYCWebSocketClients(clients);
    console.log(`${c.ok}✅ KYC Review Queue Processor:${c.reset} Started (15min interval)`);
  } catch (error) {
    console.warn(`${c.warn}⚠️  KYC Review Queue Processor:${c.reset} Failed to start: ${error instanceof Error ? error.message : String(error)}`);
  }
})();

// =============================================================================
// Native Server Metrics (Zero-Overhead from Bun's C++ Core)
// =============================================================================
// These counters are maintained internally by Bun and have zero overhead to read

interface ServerMetrics {
  pendingRequests: number;
  pendingWebSockets: number;
  dashboardSubscribers: number;
  port: number;
  hostname: string;
  development: boolean;
}

/**
 * Get native server metrics - zero overhead polling
 * Uses Bun's internal counters maintained in C++ core
 */
function getServerMetrics(): ServerMetrics {
  return {
    pendingRequests: server.pendingRequests,
    pendingWebSockets: server.pendingWebSockets,
    dashboardSubscribers: server.subscriberCount("dashboard-updates"),
    port: server.port!, // Non-null: server is running at this point
    hostname: server.hostname!, // Non-null: server is running at this point
    development: config.DEVELOPMENT,
  };
}

// Export for use in analytics view (deferred access pattern)
(globalThis as any).__getServerMetrics = getServerMetrics;

// Update timeline (broadcasts to WebSocket clients)
setInterval(updateTimeline, config.TIMELINE_UPDATE_INTERVAL);

// Rescan repos periodically (dashboard redraws on command)
setInterval(async () => {
  await rescanRepos();
}, config.RESCAN_INTERVAL);

// Record metrics to SQLite periodically (every 5 minutes)
setInterval(() => {
  const stats = getStats();
  const healthyCount = projects.filter(p => p.health >= 80).length;
  const warningCount = projects.filter(p => p.health >= 60 && p.health < 80).length;
  const criticalCount = projects.filter(p => p.health < 60).length;

  db.recordMetrics({
    totalRequests: stats.totalRequests,
    successRate: stats.successRate,
    avgLatency: stats.avgLatency,
    projectCount: projects.length,
    healthyCount,
    warningCount,
    criticalCount,
  });
}, 5 * 60 * 1000); // 5 minutes

// Note: Signal handlers registered at top of file (gracefulShutdown function)

// =============================================================================
// Interactive Console Input (Raw Mode with Arrow Keys)
// =============================================================================

// Arrow key escape sequences
const KEYS = {
  UP: "\x1b[A",
  DOWN: "\x1b[B",
  RIGHT: "\x1b[C",
  LEFT: "\x1b[D",
  ENTER: "\r",
  CTRL_C: "\x03",
  CTRL_D: "\x04",
};

async function startConsoleInput() {
  // Guard against HMR re-initialization (stdin stream can only be read once)
  if ((globalThis as any)._stdinLocked) {
    console.log("Stdin already locked (HMR reload detected)");
    return;
  }
  (globalThis as any)._stdinLocked = true;

  // Handle pipe mode (non-interactive)
  if (isPipeMode) {
    console.log(JSON.stringify({
      projects: projects.length,
      stats: getStats(),
      mode: "pipe",
    }));

    // In pipe mode, read from stdin for commands
    try {
      for await (const chunk of Bun.stdin.stream() as unknown as AsyncIterable<Uint8Array>) {
        const text = Buffer.from(chunk).toString().trim();
        if (text === "status") {
          console.log(JSON.stringify({ projects: projects.length, stats: getStats() }));
        } else if (text === "quit") {
          process.exit(0);
        }
      }
    } catch (err) {
      // ReadableStream lock error during HMR - safe to ignore
      if (err instanceof TypeError && String(err).includes("locked")) {
        console.log("Stdin stream locked (HMR detected)");
      } else {
        throw err;
      }
    }
    return;
  }

  // Start auto-refresh if enabled via CLI
  if (autoRefresh && !autoRefreshInterval) {
    autoRefreshInterval = setInterval(async () => {
      await rescanRepos();
      await runHealthChecks();
      drawDashboard();
    }, REFRESH_INTERVAL);
  }

  // Start memory monitoring (checks every 30s, triggers GC if >100MB)
  startMemoryMonitoring();

  // Initial draw
  drawDashboard();

  // Enable raw mode for instant key response
  try {
    process.stdin.setRawMode(true);
  } catch {
    // Not a TTY or already in raw mode
  }

  try {
    for await (const chunk of process.stdin) {
    const key = Buffer.from(chunk).toString();
    const filtered = getFilteredProjects();

    // Handle arrow keys for navigation
    if (key === KEYS.UP) {
      selectedRow = Math.max(0, selectedRow - 1);
      // Auto-scroll page if needed
      if (selectedRow < cursor) {
        cursor = Math.max(0, cursor - pageSize);
      }
    } else if (key === KEYS.DOWN) {
      selectedRow = Math.min(filtered.length - 1, selectedRow + 1);
      // Auto-scroll page if needed
      if (selectedRow >= cursor + pageSize) {
        cursor = Math.min(cursor + pageSize, Math.max(0, filtered.length - pageSize));
      }
    } else if (key === KEYS.RIGHT || key === "n") {
      // Next page
      cursor = Math.min(cursor + pageSize, Math.max(0, filtered.length - pageSize));
      selectedRow = Math.min(selectedRow, filtered.length - 1);
    } else if (key === KEYS.LEFT || key === "b") {
      // Previous page
      cursor = Math.max(0, cursor - pageSize);
    } else if (key === "i" || key === KEYS.ENTER) {
      // Inspect - open shell in selected project
      const project = filtered[selectedRow];
      if (project) {
        await openProjectShell(project.name, `${config.PROJECTS_DIR}/${project.name}`);
      }
    } else if (key === "r") {
      // Refresh
      console.log(`${c.cyan}Refreshing...${c.reset}`);
      await rescanRepos();
      cursor = 0;
      selectedRow = 0;
    } else if (key === "c") {
      // Clear filters
      searchFilter = "";
      viewMode = "full";
      cursor = 0;
      selectedRow = 0;
    } else if (key === "s") {
      // Toggle compact view
      viewMode = viewMode === "compact" ? "full" : "compact";
    } else if (key === "p") {
      // Toggle problems view
      viewMode = viewMode === "problems" ? "full" : "problems";
      cursor = 0;
      selectedRow = 0;
    } else if (key === "m") {
      // Toggle analytics/metrics view
      viewMode = viewMode === "analytics" ? "full" : "analytics";
    } else if (key === "g") {
      // Manual garbage collection flush
      const before = process.memoryUsage();
      Bun.gc(true);
      const after = process.memoryUsage();
      const freedMB = ((before.heapUsed - after.heapUsed) / 1024 / 1024).toFixed(2);
      // Flash a message then redraw
      console.write("\x1b[2J\x1b[H");
      console.log(`\n  ${c.ok}✓ GC Complete${c.reset} - Freed ${freedMB} MB heap memory\n`);
      await Bun.sleep(800); // Brief pause to show message
    } else if (key === "k") {
      // Run health checks
      drawDashboard();
      await runHealthChecks();
    } else if (key === "a") {
      // Toggle auto-refresh
      autoRefresh = !autoRefresh;
      if (autoRefresh) {
        autoRefreshInterval = setInterval(async () => {
          await rescanRepos();
          await runHealthChecks();
          drawDashboard();
        }, REFRESH_INTERVAL);
      } else if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
      }
    } else if (key === "h" || key === "?") {
      // Show help
      process.stdout.write("\x1b[2J\x1b[H"); // Clear screen
      console.log(`
${c.bold}${c.cyan}Enterprise Dashboard - Keyboard Controls${c.reset}

${c.bold}Navigation:${c.reset}
  ${c.cyan}↑/↓${c.reset}           Move selection up/down
  ${c.cyan}←/→${c.reset} or ${c.cyan}b/n${c.reset}   Previous/Next page
  ${c.cyan}Enter${c.reset} or ${c.cyan}i${c.reset}   Inspect (open shell in project)

${c.bold}Views:${c.reset}
  ${c.cyan}s${c.reset}             Toggle compact/full view
  ${c.cyan}p${c.reset}             Toggle problems-only view
  ${c.cyan}m${c.reset}             Toggle analytics/metrics view
  ${c.cyan}c${c.reset}             Clear all filters

${c.bold}Actions:${c.reset}
  ${c.cyan}r${c.reset}             Refresh/rescan all projects
  ${c.cyan}g${c.reset}             Flush garbage collection (Bun.gc)
  ${c.cyan}k${c.reset}             Run health checks (capture stderr)
  ${c.cyan}a${c.reset}             Toggle auto-refresh (30s interval)

${c.bold}Other:${c.reset}
  ${c.cyan}h${c.reset} or ${c.cyan}?${c.reset}       Show this help
  ${c.cyan}q${c.reset}             Quit

${c.dim}Press any key to continue...${c.reset}`);
      // Wait for any key
      for await (const _ of process.stdin) break;
    } else if (key === "q" || key === KEYS.CTRL_C || key === KEYS.CTRL_D) {
      // Quit
      process.stdin.setRawMode(false);
      console.log(`\n${c.cyan}Goodbye!${c.reset}`);
      server.stop();
      process.exit(0);
    }

    drawDashboard();
  }
  } catch (err) {
    // ReadableStream lock error during HMR - safe to ignore
    if (err instanceof TypeError && String(err).includes("locked")) {
      console.log("Interactive stdin locked (HMR detected)");
    } else {
      throw err;
    }
  }
}

// Start the interactive console
startConsoleInput().catch(console.error);
