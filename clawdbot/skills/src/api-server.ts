#!/usr/bin/env bun
/**
 * src/api-server.ts
 * Production-ready Skill API Server
 * - Rate limiting (100 req/min per IP)
 * - API key authentication
 * - WebSocket for real-time execution
 * - Skill install/uninstall/execute
 * - Metrics tracking
 * - Frontend dashboard
 */

import type { Skill } from "./skills";
import skillsModule from "./skills";
import { SkillPackager } from "./packager";
import { SkillVersionManager } from "./version-manager";
import { ExecutableBuilder, type BuildTarget, type BuildResult } from "./lib/executable-builder";
import integrity from "./integrity";
import security from "./security";
import * as os from "os";
import { BunR2Storage, createBunR2StorageFromEnv } from "./storage/bun-r2-storage";

const { allSkills, getSkill, formatStatus } = skillsModule;

// Debug mode - controls verbose logging
const DEBUG = process.env.DEBUG === "1" || process.env.DEBUG === "true" || process.env.LOG_LEVEL === "debug";

function debugLog(...args: unknown[]): void {
  if (DEBUG) console.log(...args);
}

// ═══════════════════════════════════════════════════════════════════════════
// Tailscale Detection
// ═══════════════════════════════════════════════════════════════════════════

interface TailscaleStatus {
  connected: boolean;
  ip: string | null;
  hostname: string | null;
  dnsName: string | null;
  tailnet: string | null;
}

async function getTailscaleStatus(): Promise<TailscaleStatus> {
  try {
    const result = Bun.spawnSync(["tailscale", "status", "--json"]);
    if (result.exitCode !== 0) {
      return { connected: false, ip: null, hostname: null, dnsName: null, tailnet: null };
    }

    const status = JSON.parse(result.stdout.toString());
    const self = status.Self;

    return {
      connected: status.BackendState === "Running",
      ip: self?.TailscaleIPs?.[0] || null,
      hostname: self?.HostName || null,
      dnsName: self?.DNSName?.replace(/\.$/, "") || null,
      tailnet: status.MagicDNSSuffix || null,
    };
  } catch {
    return { connected: false, ip: null, hostname: null, dnsName: null, tailnet: null };
  }
}

async function getTailscaleIP(): Promise<string | null> {
  try {
    const result = Bun.spawnSync(["tailscale", "ip", "-4"]);
    if (result.exitCode === 0) {
      return result.stdout.toString().trim();
    }
  } catch {}
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface RateLimitEntry {
  count: number;
  reset: number;
}

interface SkillMetrics {
  executions: number;
  successes: number;
  failures: number;
  totalTime: number;
  averageTime: number;
  lastExecution: string | null;
}

// Enhanced metrics types
interface CommandMetrics {
  count: number;
  totalTime: number;
  avgDuration: number;
  successes: number;
  failures: number;
}

interface EnhancedSkillMetrics extends SkillMetrics {
  commands: Record<string, CommandMetrics>;
}

interface ExecutionRecord {
  skillId: string;
  command: string;
  args: any[];
  status: "success" | "failure";
  duration: number;
  timestamp: string;
  terminalId?: string;
  error?: string;
}

interface TerminalUsageMetrics {
  interactiveSessions: number;
  dashboardSessions: number;
  debugSessions: number;
  collabSessions: number;
  recordingSessions: number;
  totalTerminalTime: number;
  activeTerminals: number;
}

interface TrendBucket {
  executions: number;
  totalTime: number;
  failures: number;
  timestamp: number;
}

interface BuildRequestOptions {
  target?: string;
  compress?: boolean;
  minify?: boolean;
}

// Log entry types for dashboard viewing
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: Record<string, unknown>;
  skillId?: string;
  requestId?: string;
}

// R2 Log Storage Types
interface LogQueryOptions {
  level?: LogLevel;
  category?: string;
  skillId?: string;
  requestId?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
  source?: "memory" | "r2" | "all";
}

interface LogQueryResult {
  logs: LogEntry[];
  total: number;
  source: "memory" | "r2" | "combined";
  hasMore: boolean;
}

interface LogSyncConfig {
  batchSize: number;
  syncIntervalMs: number;
  retentionDays: number;
  enabled: boolean;
  r2Storage: BunR2Storage | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Rate Limiting
// ═══════════════════════════════════════════════════════════════════════════

const rateLimit = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || "60000", 10); // ms (default: 1 minute)
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "100", 10); // requests per window

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  let entry = rateLimit.get(clientIP);

  if (!entry || now > entry.reset) {
    entry = { count: 1, reset: now + RATE_LIMIT_WINDOW };
    rateLimit.set(clientIP, entry);
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Authentication
// ═══════════════════════════════════════════════════════════════════════════

// API keys required for production security
const apiKeysEnv = process.env.SKILL_API_KEYS || process.env.API_KEYS;
if (!apiKeysEnv) {
  console.warn("WARNING: SKILL_API_KEYS or API_KEYS env var not set - using insecure dev-key");
}
const API_KEYS = new Set(
  (apiKeysEnv || "dev-key")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
);

function authenticateRequest(req: Request): Response | null {
  const apiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!apiKey || !API_KEYS.has(apiKey)) {
    const url = new URL(req.url);
    addLog("warn", "auth", "Authentication failed", { path: url.pathname, hasKey: !!apiKey });
    return jsonResponse(
      { error: "Unauthorized", message: "Valid API key required" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Enhanced Metrics Storage
// ═══════════════════════════════════════════════════════════════════════════

const metricsStore = new Map<string, EnhancedSkillMetrics>();
const recentExecutions: ExecutionRecord[] = [];
const MAX_RECENT_EXECUTIONS = 100;

// Trend tracking - store hourly buckets for last 24 hours (O(1) lookup via Map)
const hourlyTrendsMap = new Map<number, TrendBucket>();
const MAX_HOURLY_BUCKETS = 24;

// Terminal usage metrics (updated by PTY integration)
const terminalUsage: TerminalUsageMetrics = {
  interactiveSessions: 0,
  dashboardSessions: 0,
  debugSessions: 0,
  collabSessions: 0,
  recordingSessions: 0,
  totalTerminalTime: 0,
  activeTerminals: 0,
};

// Server start time for uptime calculation
const serverStartTime = Date.now();

// ═══════════════════════════════════════════════════════════════════════════
// Request ID Tracking
// ═══════════════════════════════════════════════════════════════════════════

let currentRequestId: string | undefined;
let requestIdCounter = 0;

function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const counter = (++requestIdCounter % 9999).toString().padStart(4, "0");
  return `req-${timestamp}-${counter}`;
}

function setCurrentRequestId(id: string | undefined): void {
  currentRequestId = id;
}

function getCurrentRequestId(): string | undefined {
  return currentRequestId;
}

// ═══════════════════════════════════════════════════════════════════════════
// Logs Storage
// ═══════════════════════════════════════════════════════════════════════════

const logsStore: LogEntry[] = [];
const MAX_LOGS = 200;
let logIdCounter = 0;

function addLog(
  level: LogLevel,
  category: string,
  message: string,
  details?: Record<string, unknown>,
  skillId?: string
): LogEntry {
  const reqId = getCurrentRequestId();
  const entry: LogEntry = {
    id: ++logIdCounter,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details,
    skillId,
    requestId: reqId,
  };

  logsStore.unshift(entry);
  if (logsStore.length > MAX_LOGS) {
    logsStore.pop();
  }

  // R2 background sync
  if (logSyncManager) {
    logSyncManager.addLog(entry);
  }

  // Also log to console in DEBUG mode
  if (DEBUG) {
    const prefix = `[${level.toUpperCase()}] [${category}]`;
    if (level === "error") {
      console.error(prefix, message, details || "");
    } else if (level === "warn") {
      console.warn(prefix, message, details || "");
    } else {
      console.log(prefix, message, details || "");
    }
  }

  return entry;
}

// Convenience log functions
export const serverLog = {
  debug: (category: string, message: string, details?: Record<string, unknown>) =>
    addLog("debug", category, message, details),
  info: (category: string, message: string, details?: Record<string, unknown>) =>
    addLog("info", category, message, details),
  warn: (category: string, message: string, details?: Record<string, unknown>) =>
    addLog("warn", category, message, details),
  error: (category: string, message: string, details?: Record<string, unknown>, skillId?: string) =>
    addLog("error", category, message, details, skillId),
};

function getLogs(options: { level?: LogLevel; category?: string; limit?: number; skillId?: string } = {}): LogEntry[] {
  let logs = [...logsStore];

  if (options.level) {
    logs = logs.filter((l) => l.level === options.level);
  }
  if (options.category) {
    logs = logs.filter((l) => l.category === options.category);
  }
  if (options.skillId) {
    logs = logs.filter((l) => l.skillId === options.skillId);
  }

  return logs.slice(0, options.limit || 100);
}

function getLogStats(): { total: number; byLevel: Record<LogLevel, number>; byCategory: Record<string, number> } {
  const byLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
  const byCategory: Record<string, number> = {};

  for (const log of logsStore) {
    byLevel[log.level]++;
    byCategory[log.category] = (byCategory[log.category] || 0) + 1;
  }

  return { total: logsStore.length, byLevel, byCategory };
}

function clearLogs(): { cleared: number } {
  const count = logsStore.length;
  logsStore.length = 0;
  logIdCounter = 0;
  serverLog.info("server", "Logs cleared", { previousCount: count });
  return { cleared: count };
}

// ═══════════════════════════════════════════════════════════════════════════
// R2 Log Sync Manager
// ═══════════════════════════════════════════════════════════════════════════

class LogSyncManager {
  private config: LogSyncConfig;
  private pendingLogs: LogEntry[] = [];
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private batchCounter = 0;
  private serverId: string;
  private sessionId: string;
  private isRunning = false;

  constructor(config: Partial<LogSyncConfig> = {}) {
    this.serverId = this.generateServerId();
    this.sessionId = this.generateSessionId();
    this.config = {
      batchSize: config.batchSize ?? 50,
      syncIntervalMs: config.syncIntervalMs ?? 60000,
      retentionDays: config.retentionDays ?? 7,
      enabled: config.enabled ?? true,
      r2Storage: config.r2Storage ?? null,
    };
  }

  start(): void {
    if (this.isRunning || !this.config.enabled || !this.config.r2Storage) {
      return;
    }
    this.isRunning = true;

    // Start sync timer
    this.syncTimer = setInterval(() => {
      this.syncToR2();
    }, this.config.syncIntervalMs);

    // Start cleanup timer (runs daily)
    this.cleanupTimer = setInterval(
      () => {
        this.cleanupOldLogs();
      },
      24 * 60 * 60 * 1000
    );

    serverLog.info("logsync", "Log sync manager started", {
      serverId: this.serverId,
      sessionId: this.sessionId,
      batchSize: this.config.batchSize,
      syncInterval: this.config.syncIntervalMs,
      retentionDays: this.config.retentionDays,
    });
  }

  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    // Flush remaining logs
    this.syncToR2();
    this.isRunning = false;
  }

  addLog(entry: LogEntry): void {
    if (!this.config.enabled || !this.config.r2Storage) return;

    this.pendingLogs.push(entry);

    // Auto-sync if batch size reached
    if (this.pendingLogs.length >= this.config.batchSize) {
      this.syncToR2();
    }
  }

  private async syncToR2(): Promise<void> {
    if (this.pendingLogs.length === 0 || !this.config.r2Storage) {
      return;
    }

    const logsToSync = this.pendingLogs.splice(0, this.config.batchSize);
    const key = this.generateBatchKey();

    try {
      const data = Bun.gzipSync(new TextEncoder().encode(logsToSync.map((l) => JSON.stringify(l)).join("\n")));

      await this.config.r2Storage.putObject(key, data, {
        contentType: "application/x-ndjson",
        metadata: {
          serverId: this.serverId,
          sessionId: this.sessionId,
          batchId: String(this.batchCounter),
          entryCount: String(logsToSync.length),
          startTime: logsToSync[0].timestamp,
          endTime: logsToSync[logsToSync.length - 1].timestamp,
        },
      });

      this.batchCounter++;

      if (DEBUG) {
        debugLog(`Synced ${logsToSync.length} logs to R2: ${key}`);
      }
    } catch (error: unknown) {
      // Re-add failed logs to queue
      this.pendingLogs.unshift(...logsToSync);
      const errMsg = error instanceof Error ? error.message : String(error);
      serverLog.error("logsync", "Failed to sync logs to R2", {
        error: errMsg,
        batchSize: logsToSync.length,
      });
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    if (!this.config.r2Storage) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    try {
      // List all log files for this server
      const versions = await this.config.r2Storage.listSkillVersions(`logs-${this.serverId}`);
      let deletedCount = 0;

      for (const version of versions) {
        // Parse date from key pattern: logs/{serverId}/{YYYY}/{MM}/{DD}/...
        const dateMatch = version.key?.match(/logs\/[^/]+\/(\d{4})\/(\d{2})\/(\d{2})\//);
        if (dateMatch) {
          const logDate = new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));

          if (logDate < cutoffDate && version.key) {
            await this.config.r2Storage.deleteObject(version.key);
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        serverLog.info("logsync", "Cleaned up old logs", {
          cutoffDate: cutoffDate.toISOString(),
          deletedBatches: deletedCount,
        });
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      serverLog.error("logsync", "Failed to cleanup old logs", { error: errMsg });
    }
  }

  async queryLogs(options: LogQueryOptions): Promise<LogQueryResult> {
    if (!this.config.r2Storage) {
      return { logs: [], total: 0, source: "r2", hasMore: false };
    }

    const logs: LogEntry[] = [];
    const startDate = options.startTime ? new Date(options.startTime) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = options.endTime ? new Date(options.endTime) : new Date();

    try {
      // List log files
      const versions = await this.config.r2Storage.listSkillVersions(`logs-${this.serverId}`);

      for (const version of versions) {
        if (!version.key?.endsWith(".jsonl.gz")) continue;

        // Parse date from key and check if in range
        const dateMatch = version.key.match(/logs\/[^/]+\/(\d{4})\/(\d{2})\/(\d{2})\//);
        if (!dateMatch) continue;

        const logDate = new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));

        if (logDate < startDate || logDate > endDate) continue;

        // Download and parse log file
        const data = await this.config.r2Storage.getObject(version.key);
        const decompressed = Bun.gunzipSync(data);
        const lines = new TextDecoder().decode(decompressed).split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as LogEntry;

            // Apply filters
            if (options.level && entry.level !== options.level) continue;
            if (options.category && entry.category !== options.category) continue;
            if (options.skillId && entry.skillId !== options.skillId) continue;
            if (options.requestId && entry.requestId !== options.requestId) continue;

            logs.push(entry);
          } catch {
            // Skip malformed entries
          }
        }
      }

      // Sort by timestamp descending
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const offset = options.offset ?? 0;
      const limit = options.limit ?? 100;

      return {
        logs: logs.slice(offset, offset + limit),
        total: logs.length,
        source: "r2",
        hasMore: offset + limit < logs.length,
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      serverLog.error("logsync", "Failed to query R2 logs", { error: errMsg });
      return { logs: [], total: 0, source: "r2", hasMore: false };
    }
  }

  private generateBatchKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const batchId = String(this.batchCounter).padStart(6, "0");

    return `logs/${this.serverId}/${year}/${month}/${day}/${this.sessionId}-${batchId}.jsonl.gz`;
  }

  private generateServerId(): string {
    return `srv-${Bun.hash.crc32(os.hostname() + process.pid).toString(36)}`;
  }

  private generateSessionId(): string {
    return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  getConfig(): LogSyncConfig {
    return { ...this.config };
  }
}

// Global log sync manager instance
let logSyncManager: LogSyncManager | null = null;

function getSkillMetrics(skillId: string): EnhancedSkillMetrics {
  return (
    metricsStore.get(skillId) || {
      executions: 0,
      successes: 0,
      failures: 0,
      totalTime: 0,
      averageTime: 0,
      lastExecution: null,
      commands: {},
    }
  );
}

function updateSkillMetrics(
  skillId: string,
  executionTime: number,
  success: boolean,
  command?: string,
  args?: any[],
  error?: string
): void {
  const metrics = getSkillMetrics(skillId);
  const now = new Date().toISOString();

  // Update basic metrics
  metrics.executions++;
  metrics.totalTime += executionTime;
  metrics.averageTime = metrics.totalTime / metrics.executions;
  metrics.lastExecution = now;

  if (success) {
    metrics.successes++;
  } else {
    metrics.failures++;
  }

  // Update command-level metrics
  if (command) {
    if (!metrics.commands[command]) {
      metrics.commands[command] = {
        count: 0,
        totalTime: 0,
        avgDuration: 0,
        successes: 0,
        failures: 0,
      };
    }
    const cmdMetrics = metrics.commands[command];
    cmdMetrics.count++;
    cmdMetrics.totalTime += executionTime;
    cmdMetrics.avgDuration = cmdMetrics.totalTime / cmdMetrics.count;
    if (success) {
      cmdMetrics.successes++;
    } else {
      cmdMetrics.failures++;
    }
  }

  metricsStore.set(skillId, metrics);

  // Add to recent executions
  const record: ExecutionRecord = {
    skillId,
    command: command || "unknown",
    args: args || [],
    status: success ? "success" : "failure",
    duration: executionTime,
    timestamp: now,
    error: error,
  };
  recentExecutions.unshift(record);
  if (recentExecutions.length > MAX_RECENT_EXECUTIONS) {
    recentExecutions.pop();
  }

  // Update hourly trends
  updateHourlyTrends(executionTime, !success);
}

function updateHourlyTrends(executionTime: number, isFailure: boolean): void {
  const now = Date.now();
  const currentHour = Math.floor(now / (60 * 60 * 1000));

  // O(1) lookup via Map
  let currentBucket = hourlyTrendsMap.get(currentHour);

  if (!currentBucket) {
    currentBucket = {
      executions: 0,
      totalTime: 0,
      failures: 0,
      timestamp: now,
    };
    hourlyTrendsMap.set(currentHour, currentBucket);

    // Remove old buckets (keep last 24 hours)
    const cutoffHour = currentHour - MAX_HOURLY_BUCKETS;
    for (const hour of hourlyTrendsMap.keys()) {
      if (hour < cutoffHour) {
        hourlyTrendsMap.delete(hour);
      }
    }
  }

  currentBucket.executions++;
  currentBucket.totalTime += executionTime;
  if (isFailure) {
    currentBucket.failures++;
  }
}

function getTrends(): {
  lastHour: { executions: number; avgDuration: number; errorRate: string };
  last24Hours: { executions: number; avgDuration: number; errorRate: string };
} {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  let lastHourExec = 0,
    lastHourTime = 0,
    lastHourFail = 0;
  let last24Exec = 0,
    last24Time = 0,
    last24Fail = 0;

  for (const bucket of hourlyTrendsMap.values()) {
    if (bucket.timestamp >= oneHourAgo) {
      lastHourExec += bucket.executions;
      lastHourTime += bucket.totalTime;
      lastHourFail += bucket.failures;
    }
    if (bucket.timestamp >= twentyFourHoursAgo) {
      last24Exec += bucket.executions;
      last24Time += bucket.totalTime;
      last24Fail += bucket.failures;
    }
  }

  return {
    lastHour: {
      executions: lastHourExec,
      avgDuration: lastHourExec > 0 ? lastHourTime / lastHourExec : 0,
      errorRate:
        lastHourExec > 0
          ? ((lastHourFail / lastHourExec) * 100).toFixed(1) + "%"
          : "0%",
    },
    last24Hours: {
      executions: last24Exec,
      avgDuration: last24Exec > 0 ? last24Time / last24Exec : 0,
      errorRate:
        last24Exec > 0
          ? ((last24Fail / last24Exec) * 100).toFixed(1) + "%"
          : "0%",
    },
  };
}

function getHourlyHistory(): Array<{ hour: number; executions: number; failures: number; errorRate: number }> {
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const history: Array<{ hour: number; executions: number; failures: number; errorRate: number }> = [];

  // Sort by hour and filter to last 24 hours
  const sortedBuckets = Array.from(hourlyTrendsMap.entries())
    .filter(([_, bucket]) => bucket.timestamp >= twentyFourHoursAgo)
    .sort((a, b) => a[0] - b[0]);

  for (const [hour, bucket] of sortedBuckets) {
    history.push({
      hour,
      executions: bucket.executions,
      failures: bucket.failures,
      errorRate: bucket.executions > 0 ? (bucket.failures / bucket.executions) * 100 : 0,
    });
  }

  return history;
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + " GB";
}

// Export for PTY integration
export function updateTerminalUsage(
  type: "interactive" | "dashboard" | "debug" | "collab" | "recording",
  action: "start" | "end",
  duration?: number
): void {
  if (action === "start") {
    terminalUsage.activeTerminals++;
    switch (type) {
      case "interactive":
        terminalUsage.interactiveSessions++;
        break;
      case "dashboard":
        terminalUsage.dashboardSessions++;
        break;
      case "debug":
        terminalUsage.debugSessions++;
        break;
      case "collab":
        terminalUsage.collabSessions++;
        break;
      case "recording":
        terminalUsage.recordingSessions++;
        break;
    }
  } else {
    terminalUsage.activeTerminals = Math.max(0, terminalUsage.activeTerminals - 1);
    if (duration) {
      terminalUsage.totalTerminalTime += duration;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Response Helpers
// ═══════════════════════════════════════════════════════════════════════════

function jsonResponse(
  data: unknown,
  options: { status?: number; headers?: Record<string, string> } = {}
): Response {
  return Response.json(data, {
    status: options.status || 200,
    headers: {
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
      ...options.headers,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Route Handlers
// ═══════════════════════════════════════════════════════════════════════════

async function handleListSkills(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");
  const tag = url.searchParams.get("tag");

  let skills = allSkills;

  if (category) skills = skills.filter((s) => s.category === category);
  if (status) skills = skills.filter((s) => s.status === status);
  if (tag) skills = skills.filter((s) => s.tags.includes(tag));

  // Add metrics to each skill
  const enrichedSkills = skills.map((s) => ({
    ...s,
    metrics: getSkillMetrics(s.name),
  }));

  return jsonResponse({
    skills: enrichedSkills,
    count: enrichedSkills.length,
    timestamp: new Date().toISOString(),
  });
}

async function handleGetSkill(skillId: string): Promise<Response> {
  const skill = getSkill(skillId);

  if (!skill) {
    return jsonResponse({ error: "Skill not found" }, { status: 404 });
  }

  const versionManager = new SkillVersionManager("./changelogs");
  const changelog = await versionManager.parseChangelog(skillId);
  const checksum = integrity.computeChecksum(skill);
  const metrics = getSkillMetrics(skillId);

  return jsonResponse({
    ...skill,
    checksum: checksum.crc32,
    metrics,
    changelog: changelog?.versions.slice(0, 3) || [],
    system: {
      bunVersion: Bun.version,
      platform: process.platform,
    },
  });
}

async function handleExecuteSkill(
  req: Request,
  skillId: string
): Promise<Response> {
  const skill = getSkill(skillId);

  if (!skill) {
    return jsonResponse({ error: "Skill not found" }, { status: 404 });
  }

  const body = await req.json();
  const { command, args = [], options = {} } = body;

  if (!command) {
    return jsonResponse({ error: "Command is required" }, { status: 400 });
  }

  // Check if skill has a binary
  if (!skill.path) {
    return jsonResponse(
      { error: "Skill has no executable binary" },
      { status: 400 }
    );
  }

  // Use full path if it's a relative/absolute path, otherwise use binary name for PATH lookup
  const binary = skill.path.startsWith("./") || skill.path.startsWith("/")
    ? skill.path
    : skill.path.split("/").pop()!;
  const startTime = performance.now();

  // Execute using security module
  const result = security.executeSkillBinary(binary, [command, ...args], {
    timeout: options.timeout || 30000,
    maxOutputSize: options.maxOutputSize || 1024 * 1024,
  });

  const executionTime = performance.now() - startTime;

  // Update metrics with command details
  updateSkillMetrics(
    skillId,
    executionTime,
    result.success,
    command,
    args,
    result.success ? undefined : result.stderr
  );

  // Log execution
  if (result.success) {
    serverLog.info("exec", `Skill executed: ${skillId}:${command}`, { duration: Math.round(executionTime), exitCode: result.exitCode }, skillId);
  } else {
    serverLog.error("exec", `Skill execution failed: ${skillId}:${command}`, { duration: Math.round(executionTime), exitCode: result.exitCode, stderr: result.stderr?.slice(0, 200) }, skillId);
  }

  return jsonResponse({
    success: result.success,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    executionTime,
    timestamp: new Date().toISOString(),
    skill: {
      id: skill.id,
      name: skill.name,
      version: skill.version,
    },
  });
}

async function handleTestSkill(skillId: string): Promise<Response> {
  const skill = getSkill(skillId);

  if (!skill) {
    return jsonResponse({ error: "Skill not found" }, { status: 404 });
  }

  if (!skill.path) {
    return jsonResponse({
      success: skill.status === "ready",
      message:
        skill.status === "ready"
          ? "Skill is ready (API-based or builtin)"
          : `Skill not ready: ${skill.action}`,
    });
  }

  // Use full path if it's a relative/absolute path
  const binary = skill.path.startsWith("./") || skill.path.startsWith("/")
    ? skill.path
    : skill.path.split("/").pop()!;

  // Check if binary exists
  const binaryExists = skill.path.startsWith("./") || skill.path.startsWith("/")
    ? Bun.spawnSync(["test", "-x", binary]).exitCode === 0
    : security.safeSpawnSync(["which", binary]).success;

  if (!binaryExists) {
    return jsonResponse({
      success: false,
      message: "Binary not found",
      binary,
    });
  }

  // Try to get version
  const versionResult = security.executeSkillBinary(binary, ["--version"], {
    timeout: 5000,
    maxOutputSize: 1024,
  });

  return jsonResponse({
    success: true,
    binary,
    path: binary,
    version: versionResult.success
      ? versionResult.stdout.trim().split("\n")[0]
      : null,
  });
}

async function handleCreatePackage(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") || `api-package-${Date.now()}`;
  const category = url.searchParams.get("category");
  const skillNames = url.searchParams.get("skills")?.split(",").filter(Boolean);

  let skills = allSkills;
  if (category) skills = skills.filter((s) => s.category === category);
  if (skillNames) skills = skills.filter((s) => skillNames.includes(s.name));

  serverLog.info("package", `Creating package: ${name}`, { name, category, skillCount: skills.length });

  const packager = new SkillPackager("./packages");
  const result = await packager.package(skills, { name });

  if (!result.success) {
    serverLog.error("package", `Package creation failed: ${name}`, { name, error: result.error });
    return jsonResponse({ error: result.error }, { status: 500 });
  }

  serverLog.info("package", `Package created: ${name}`, {
    name,
    path: result.path,
    skillCount: result.stats?.skillCount,
    size: result.stats?.compressedSize,
  });

  return jsonResponse({
    success: true,
    package: {
      name,
      path: result.path,
      skills: result.stats?.skillCount,
      size: result.stats?.compressedSize,
      ratio: result.stats?.ratio,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleHealthCheck(): Promise<Response> {
  const ready = allSkills.filter((s) => s.status === "ready").length;
  const tailscale = await getTailscaleStatus();

  return jsonResponse({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    bun: Bun.version,
    platform: process.platform,
    hostname: os.hostname(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    skills: {
      total: allSkills.length,
      ready,
      healthPercent: Math.round((ready / allSkills.length) * 100),
    },
    tailscale,
    network: {
      interfaces: Object.entries(os.networkInterfaces())
        .flatMap(([name, addrs]) =>
          (addrs || [])
            .filter((a) => a.family === "IPv4" && !a.internal)
            .map((a) => ({ name, address: a.address }))
        ),
    },
  });
}

async function handleGetLogs(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const level = url.searchParams.get("level") as LogLevel | null;
  const category = url.searchParams.get("category");
  const skillId = url.searchParams.get("skillId");
  const requestId = url.searchParams.get("requestId");
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const source = (url.searchParams.get("source") || "memory") as "memory" | "r2" | "all";
  const startTime = url.searchParams.get("startTime");
  const endTime = url.searchParams.get("endTime");

  let result: LogQueryResult;

  if (source === "memory" || !logSyncManager) {
    // Existing in-memory query (fast path for dashboard)
    const logs = getLogs({
      level: level || undefined,
      category: category || undefined,
      skillId: skillId || undefined,
      limit,
    });
    result = {
      logs,
      total: logsStore.length,
      source: "memory",
      hasMore: false,
    };
  } else if (source === "r2") {
    // R2-only query
    result = await logSyncManager.queryLogs({
      level: level || undefined,
      category: category || undefined,
      skillId: skillId || undefined,
      requestId: requestId || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      limit,
      offset,
    });
  } else {
    // Combined query (memory + R2)
    const memoryLogs = getLogs({
      level: level || undefined,
      category: category || undefined,
      skillId: skillId || undefined,
      limit: Math.min(limit, MAX_LOGS),
    });

    const r2Result = await logSyncManager.queryLogs({
      level: level || undefined,
      category: category || undefined,
      skillId: skillId || undefined,
      requestId: requestId || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      limit,
      offset,
    });

    // Merge and deduplicate by id
    const seen = new Set(memoryLogs.map((l) => l.id));
    const combined = [...memoryLogs];
    for (const log of r2Result.logs) {
      if (!seen.has(log.id)) {
        combined.push(log);
      }
    }

    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    result = {
      logs: combined.slice(0, limit),
      total: memoryLogs.length + r2Result.total,
      source: "combined",
      hasMore: r2Result.hasMore,
    };
  }

  const stats = getLogStats();

  return jsonResponse({
    logs: result.logs,
    stats,
    query: {
      source: result.source,
      total: result.total,
      hasMore: result.hasMore,
    },
    filters: { level, category, skillId, requestId, limit, offset, startTime, endTime, source },
    timestamp: new Date().toISOString(),
  });
}

async function handleMetrics(): Promise<Response> {
  // Build per-skill breakdown with command details
  const bySkill: Record<string, any> = {};
  let totalExecutions = 0;
  let totalSuccesses = 0;
  let totalTime = 0;

  for (const [skillId, metrics] of metricsStore) {
    bySkill[skillId] = {
      executions: metrics.executions,
      successes: metrics.successes,
      failures: metrics.failures,
      averageDuration: Math.round(metrics.averageTime * 100) / 100,
      lastExecuted: metrics.lastExecution,
      commands: Object.fromEntries(
        Object.entries(metrics.commands).map(([cmd, m]) => [
          cmd,
          { count: m.count, avgDuration: Math.round(m.avgDuration * 100) / 100 },
        ])
      ),
    };
    totalExecutions += metrics.executions;
    totalSuccesses += metrics.successes;
    totalTime += metrics.totalTime;
  }

  // Get system metrics
  const memUsage = process.memoryUsage();
  const uptime = Date.now() - serverStartTime;

  // Get trends
  const trends = getTrends();
  const hourlyHistory = getHourlyHistory();

  return jsonResponse({
    aggregate: {
      totalExecutions,
      totalSuccesses,
      totalFailures: totalExecutions - totalSuccesses,
      successRate:
        totalExecutions > 0
          ? ((totalSuccesses / totalExecutions) * 100).toFixed(1) + "%"
          : "N/A",
      totalTime: totalTime.toFixed(2) + "ms",
      averageTime:
        totalExecutions > 0
          ? (totalTime / totalExecutions).toFixed(2) + "ms"
          : "N/A",
    },
    bySkill,
    terminalUsage: {
      interactiveSessions: terminalUsage.interactiveSessions,
      dashboardSessions: terminalUsage.dashboardSessions,
      debugSessions: terminalUsage.debugSessions,
      totalTerminalTime: formatUptime(terminalUsage.totalTerminalTime),
      activeTerminals: terminalUsage.activeTerminals,
    },
    trends,
    hourlyHistory,
    recentExecutions: recentExecutions.slice(0, 20),
    system: {
      uptime: formatUptime(uptime),
      memoryUsage: formatBytes(memUsage.heapUsed),
      memoryTotal: formatBytes(memUsage.heapTotal),
      cpuUsage: `${((process.cpuUsage().user / 1000000) * 100).toFixed(1)}%`,
      activeProcesses: 1,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleIntegrity(): Promise<Response> {
  serverLog.info("integrity", "Integrity check requested");
  const report = integrity.generateIntegrityReport(allSkills);
  serverLog.info("integrity", "Integrity check completed", {
    totalSkills: report.totalSkills,
    validCount: report.valid?.length || 0,
    warningCount: report.warnings?.length || 0,
    criticalCount: report.critical?.length || 0,
  });
  return jsonResponse(report);
}

async function handleReport(): Promise<Response> {
  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  allSkills.forEach((s) => {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  });

  const ready = allSkills.filter((s) => s.status === "ready").length;

  return jsonResponse({
    summary: {
      total: allSkills.length,
      ready,
      missing: allSkills.length - ready,
      healthPercent: Math.round((ready / allSkills.length) * 100),
    },
    byCategory,
    byStatus,
    generatedAt: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Build Handlers
// ═══════════════════════════════════════════════════════════════════════════

// Singleton builder instance
let builderInstance: ExecutableBuilder | null = null;

function getBuilder(): ExecutableBuilder {
  if (!builderInstance) {
    builderInstance = new ExecutableBuilder();
  }
  return builderInstance;
}

async function handleListBuilds(): Promise<Response> {
  serverLog.debug("builds", "Listing builds");
  const builder = getBuilder();
  const db = builder.getBuildCache();

  const builds = db
    .query("SELECT * FROM builds ORDER BY build_time DESC LIMIT 50")
    .all() as any[];

  const formattedBuilds = builds.map((build) => {
    const metadata = JSON.parse(build.metadata);
    return {
      id: build.id,
      skillId: build.skill_id,
      skillName: metadata.skill?.name || build.skill_id,
      version: metadata.skill?.version || build.version,
      target: build.target,
      size: build.size,
      sizeFormatted: `${(build.size / 1024 / 1024).toFixed(2)} MB`,
      checksum: build.checksum,
      buildTime: build.build_time,
      executablePath: build.executable_path,
    };
  });

  serverLog.info("builds", "Builds listed", { count: formattedBuilds.length });

  return jsonResponse({
    builds: formattedBuilds,
    count: formattedBuilds.length,
    totalSize: builds.reduce((sum, b) => sum + b.size, 0),
    timestamp: new Date().toISOString(),
  });
}

async function handleBuildSkill(req: Request, skillId: string): Promise<Response> {
  const builder = getBuilder();

  // Parse options from query params or body
  const url = new URL(req.url);
  let options: BuildRequestOptions = {};

  if (req.method === "POST") {
    try {
      options = await req.json() as BuildRequestOptions;
    } catch {
      // Use query params if no body
    }
  }

  // Get options from query params
  const target = url.searchParams.get("target") || options.target;
  const compress = url.searchParams.get("compress") !== "false" && options.compress !== false;
  const minify = url.searchParams.get("minify") !== "false" && options.minify !== false;

  const buildOptions: BuildRequestOptions & { target?: BuildTarget } = {
    compress,
    minify,
  };

  if (target) {
    // Convert short target to full target
    const [platform, arch] = target.split("-");
    if (platform === "linux") {
      buildOptions.target = arch === "arm64" ? "bun-linux-arm64" : "bun-linux-x64";
    } else if (platform === "macos") {
      buildOptions.target = arch === "arm64" ? "bun-macos-arm64" : "bun-macos-x64";
    } else if (platform === "windows") {
      buildOptions.target = "bun-windows-x64";
    } else if (target.startsWith("bun-")) {
      buildOptions.target = target;
    }
  }

  try {
    serverLog.info("builds", `Starting build: ${skillId}`, { skillId, target: buildOptions.target || "native", compress, minify });
    const startTime = performance.now();
    const result = await builder.buildSkillExecutable(skillId, buildOptions);
    const duration = Math.round(performance.now() - startTime);

    serverLog.info("builds", `Build completed: ${skillId}`, {
      skillId,
      success: result.success,
      size: result.size,
      duration,
    });

    return jsonResponse({
      success: result.success,
      skillId,
      executablePath: result.executablePath,
      size: result.size,
      sizeFormatted: `${(result.size / 1024 / 1024).toFixed(2)} MB`,
      compressedSize: result.compressedSize,
      metadata: result.metadata,
      stats: result.stats,
      logs: result.logs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    serverLog.error("builds", `Build failed: ${skillId}`, { skillId, error: error.message }, skillId);
    return jsonResponse(
      {
        success: false,
        skillId,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function handleBuildMulti(req: Request, skillId: string): Promise<Response> {
  const builder = getBuilder();
  const url = new URL(req.url);

  // Get targets from query or use defaults
  const targetsParam = url.searchParams.get("targets");
  let targets: BuildTarget[];

  if (targetsParam) {
    targets = targetsParam.split(",").filter(Boolean).map((t) => {
      const [platform, arch] = t.trim().split("-");
      if (platform === "linux") return arch === "arm64" ? "bun-linux-arm64" : "bun-linux-x64";
      if (platform === "macos") return arch === "arm64" ? "bun-macos-arm64" : "bun-macos-x64";
      if (platform === "windows") return "bun-windows-x64";
      return `bun-${t}` as BuildTarget;
    });
  } else {
    targets = [
      "bun-linux-x64",
      "bun-linux-arm64",
      "bun-macos-x64",
      "bun-macos-arm64",
      "bun-windows-x64",
    ];
  }

  try {
    serverLog.info("builds", `Starting multi-target build: ${skillId}`, { skillId, targets });
    const startTime = performance.now();
    const results = await builder.buildMultiTarget(skillId, targets);
    const duration = Math.round(performance.now() - startTime);

    const formattedResults: Record<string, any> = {};
    let successCount = 0;
    let failedCount = 0;

    for (const [target, result] of results) {
      formattedResults[target] = {
        success: result.success,
        executablePath: result.executablePath,
        size: result.size,
        sizeFormatted: `${(result.size / 1024 / 1024).toFixed(2)} MB`,
        checksum: result.metadata.checksum,
      };

      if (result.success) successCount++;
      else failedCount++;
    }

    serverLog.info("builds", `Multi-target build completed: ${skillId}`, {
      skillId,
      targets: targets.length,
      successCount,
      failedCount,
      duration,
    });

    return jsonResponse({
      skillId,
      targets: targets.length,
      success: successCount,
      failed: failedCount,
      results: formattedResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    serverLog.error("builds", `Multi-target build failed: ${skillId}`, { skillId, error: error.message }, skillId);
    return jsonResponse(
      {
        success: false,
        skillId,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function handleGetBuild(skillId: string, target?: string): Promise<Response> {
  const builder = getBuilder();
  const db = builder.getBuildCache();

  let query = "SELECT * FROM builds WHERE skill_id = ?";
  const params: any[] = [skillId];

  if (target) {
    query += " AND target = ?";
    params.push(target.startsWith("bun-") ? target : `bun-${target}`);
  }

  query += " ORDER BY build_time DESC LIMIT 1";

  const build = db.query(query).get(...params) as any;

  if (!build) {
    return jsonResponse(
      { error: "Build not found", skillId, target },
      { status: 404 }
    );
  }

  const metadata = JSON.parse(build.metadata);

  return jsonResponse({
    id: build.id,
    skillId: build.skill_id,
    skillName: metadata.skill?.name || build.skill_id,
    version: metadata.skill?.version || build.version,
    target: build.target,
    size: build.size,
    sizeFormatted: `${(build.size / 1024 / 1024).toFixed(2)} MB`,
    checksum: build.checksum,
    buildTime: build.build_time,
    executablePath: build.executable_path,
    metadata,
  });
}

async function handleCleanBuilds(): Promise<Response> {
  const cacheDir = "./.build-cache";

  const result = Bun.spawnSync(["du", "-sb", cacheDir]);
  let sizeCleared = 0;

  if (result.exitCode === 0) {
    sizeCleared = parseInt(result.stdout.toString().split("\t")[0]) || 0;
  }

  Bun.spawnSync(["rm", "-rf", cacheDir]);

  // Reset singleton so it recreates the database
  builderInstance = null;

  return jsonResponse({
    success: true,
    message: "Build cache cleaned",
    sizeCleared,
    sizeFormatted: `${(sizeCleared / 1024 / 1024).toFixed(2)} MB`,
    timestamp: new Date().toISOString(),
  });
}

async function handleDownloadBuild(skillId: string, target: string): Promise<Response> {
  const builder = getBuilder();
  const db = builder.getBuildCache();

  const fullTarget = target.startsWith("bun-") ? target : `bun-${target}`;

  const build = db
    .query("SELECT * FROM builds WHERE skill_id = ? AND target = ? ORDER BY build_time DESC LIMIT 1")
    .get(skillId, fullTarget) as any;

  if (!build) {
    return jsonResponse(
      { error: "Build not found", skillId, target },
      { status: 404 }
    );
  }

  const file = Bun.file(build.executable_path);
  if (!(await file.exists())) {
    return jsonResponse(
      { error: "Executable file not found", path: build.executable_path },
      { status: 404 }
    );
  }

  const metadata = JSON.parse(build.metadata);
  const filename = `${metadata.skill?.name || skillId}-${target}${build.executable_path.endsWith('.gz') ? '.gz' : ''}`;

  return new Response(file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": build.size.toString(),
      "X-Checksum": build.checksum,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Frontend Dashboard
// ═══════════════════════════════════════════════════════════════════════════

function serveDashboard(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skill Management System</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           background: #0f172a; color: #e2e8f0; padding: 16px; min-height: 100vh; }
    .container { max-width: 1800px; margin: 0 auto; }
    header { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
    .header-left { display: flex; align-items: center; gap: 12px; }

    /* Scope Badge with Domain Context */
    .scope-badge { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-size: 0.65rem; font-weight: 700; padding: 6px 10px; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase; position: relative; display: flex; align-items: center; gap: 6px; }
    .scope-badge .domain-prefix { background: rgba(255,255,255,0.2); padding: 2px 4px; border-radius: 2px; font-size: 0.55rem; }
    .scope-badge::after { content: attr(data-domain-full); position: absolute; top: 100%; left: 0; margin-top: 4px; font-size: 0.55rem; color: #64748b; opacity: 0; transition: opacity 0.2s; white-space: nowrap; text-transform: none; font-weight: 400; }
    .scope-badge:hover::after { opacity: 1; }

    .header-title { }
    h1 { font-size: 1.5rem; color: #e2e8f0; margin: 0; display: flex; align-items: center; gap: 8px; }
    h1 .accent { color: #60a5fa; }

    /* Interactive Version Badge */
    .subtitle { color: #94a3b8; font-size: 0.8rem; margin-top: 2px; display: flex; align-items: center; gap: 6px; }
    .version-badge { color: #60a5fa; font-weight: 500; cursor: pointer; position: relative; padding: 2px 6px; border-radius: 4px; transition: all 0.2s; }
    .version-badge:hover { background: rgba(96, 165, 250, 0.1); }
    .version-badge:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
    .version-tooltip { position: absolute; top: 100%; left: 0; margin-top: 8px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 8px 12px; font-size: 0.7rem; opacity: 0; pointer-events: none; transition: all 0.2s; z-index: 100; min-width: 150px; }
    .version-badge:hover .version-tooltip, .version-badge:focus .version-tooltip { opacity: 1; pointer-events: auto; }
    .version-tooltip div { color: #94a3b8; margin-bottom: 4px; }
    .version-tooltip div:last-child { margin-bottom: 0; }
    .version-tooltip strong { color: #e2e8f0; }

    /* Header Right with Tension Engine */
    .header-right { display: flex; align-items: center; gap: 16px; }

    /* System Tension Ring */
    .system-tension { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .tension-ring { position: relative; width: 44px; height: 44px; }
    .tension-ring svg { transform: rotate(-90deg); }
    .tension-bg { fill: none; stroke: #334155; stroke-width: 3; }
    .tension-fill { fill: none; stroke: #10b981; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: 100; transition: stroke-dashoffset 0.8s ease, stroke 0.3s ease; }
    .tension-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 0.65rem; font-weight: 700; color: #e2e8f0; }
    .tension-label { font-size: 0.55rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .system-tension.warning .tension-fill { stroke: #f59e0b; }
    .system-tension.critical .tension-fill { stroke: #ef4444; }
    .system-tension.warning .tension-value { color: #f59e0b; }
    .system-tension.critical .tension-value { color: #ef4444; }

    /* Live Indicator Enhanced */
    .header-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .live-indicator { display: flex; align-items: center; gap: 8px; }
    .live-dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: pulse 2s infinite; box-shadow: 0 0 8px #4ade80; }
    .live-indicator[data-status="degraded"] .live-dot { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
    .live-indicator[data-status="offline"] .live-dot { background: #ef4444; box-shadow: 0 0 8px #ef4444; animation: none; }
    .indicator-meta { display: flex; flex-direction: column; align-items: flex-start; }
    .status-text { color: #4ade80; font-size: 0.8rem; font-weight: 600; }
    .live-indicator[data-status="degraded"] .status-text { color: #f59e0b; }
    .last-update { font-size: 0.65rem; color: #64748b; }

    /* Header Stats with Trends */
    .header-stats { display: flex; gap: 12px; font-size: 0.7rem; color: #64748b; }
    .stat-item { display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: rgba(51, 65, 85, 0.5); border-radius: 4px; position: relative; transition: all 0.2s; }
    .stat-item:hover { background: rgba(51, 65, 85, 0.8); }
    .stat-item .dot { width: 6px; height: 6px; border-radius: 50%; }
    .stat-item .dot.green { background: #4ade80; }
    .stat-item .dot.blue { background: #60a5fa; }
    .stat-item .dot.yellow { background: #fbbf24; }
    .stat-value { font-weight: 600; color: #e2e8f0; transition: transform 0.15s, color 0.15s; }
    .stat-label { color: #94a3b8; }
    .trend-arrow { font-size: 0.6rem; margin-left: 2px; }
    .trend-arrow.up { color: #4ade80; }
    .trend-arrow.down { color: #ef4444; }
    .stat-item[data-tension="warning"] { border-left: 2px solid #f59e0b; }
    .stat-item[data-tension="critical"] { border-left: 2px solid #ef4444; }

    /* Quick Actions Panel */
    .header-actions { display: flex; align-items: center; gap: 6px; margin-left: 12px; padding-left: 12px; border-left: 1px solid #334155; }
    .action-btn { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #334155; background: transparent; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .action-btn:hover { background: #334155; color: #e2e8f0; border-color: #475569; }
    .action-btn:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
    .action-btn.danger { border-color: #7f1d1d; color: #f87171; }
    .action-btn.danger:hover { background: #7f1d1d; color: white; }
    .action-btn svg { width: 16px; height: 16px; }
    .action-divider { width: 1px; height: 20px; background: #334155; margin: 0 4px; }
    footer { margin-top: 20px; padding: 16px; background: #1e293b; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .footer-left { display: flex; align-items: center; gap: 16px; }
    .footer-brand { font-size: 0.75rem; color: #94a3b8; }
    .footer-brand strong { color: #60a5fa; }
    .footer-stats { display: flex; gap: 16px; font-size: 0.7rem; color: #64748b; }
    .footer-stats span { display: flex; align-items: center; gap: 6px; }
    .footer-right { font-size: 0.65rem; color: #475569; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes statusPulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    @keyframes skeleton {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Grid layouts - responsive with minimum columns */
    .grid-8 { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; margin-bottom: 12px; }
    .grid-7 { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 12px; }
    @media (max-width: 1200px) {
      .grid-8 { grid-template-columns: repeat(4, 1fr); }
      .grid-7 { grid-template-columns: repeat(4, 1fr); }
    }
    @media (max-width: 768px) {
      .grid-8, .grid-7 { grid-template-columns: repeat(2, 1fr); }
      .stat-big .value { font-size: 1.4rem; }
    }

    .card { background: #1e293b; border-radius: 8px; padding: 12px; border: 1px solid #334155; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .card h2 { color: #38bdf8; font-size: 0.9rem; font-weight: 600; }

    /* Micro-interactions for stat cards */
    .card-sm { padding: 10px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; position: relative; }
    .card-sm:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); border-color: #475569; }
    .card-sm:hover .value { color: #60a5fa; }
    .card-sm:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
    .card-sm::after { content: attr(data-tooltip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(8px); background: #0f172a; color: #e2e8f0; padding: 6px 10px; border-radius: 6px; font-size: 0.65rem; white-space: nowrap; opacity: 0; pointer-events: none; transition: all 0.2s ease; border: 1px solid #334155; z-index: 100; }
    .card-sm:hover::after { opacity: 1; transform: translateX(-50%) translateY(-4px); }
    .card-sm[data-tooltip=""]::after { display: none; }

    .stat-big { text-align: center; padding: 8px 4px; }
    .stat-big .value { font-size: 1.75rem; font-weight: 700; color: #f1f5f9; transition: color 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .stat-big .label { font-size: 0.7rem; color: #94a3b8; margin-top: 2px; }
    .stat-big.success .value { color: #4ade80; }
    .stat-big.warning .value { color: #fbbf24; }
    .stat-big.danger .value { color: #f87171; }
    .stat-big.error .value { color: #f87171; }

    /* Status pulse indicator */
    .status-pulse { display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: statusPulse 2s infinite; }
    .status-pulse.warning { background: #f59e0b; animation-name: statusPulseWarning; }
    .status-pulse.danger { background: #ef4444; animation-name: statusPulseDanger; }
    @keyframes statusPulseWarning { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }
    @keyframes statusPulseDanger { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }

    /* Skeleton loading states */
    .card-sm.loading .value, .card-sm.loading .label { background: linear-gradient(90deg, #334155 25%, #475569 50%, #334155 75%); background-size: 200% 100%; animation: skeleton 1.5s infinite; border-radius: 4px; color: transparent; }
    .card-sm.loading .value { min-height: 1.75rem; min-width: 60px; }
    .card-sm.loading .label { min-height: 0.7rem; min-width: 50px; margin: 4px auto 0; }

    .stat-inline { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #334155; font-size: 0.8rem; }
    .stat-inline:last-child { border-bottom: none; }
    .stat-label { color: #94a3b8; }
    .stat-value { font-weight: 600; color: #f1f5f9; }
    .status-ready { color: #4ade80; }
    .status-env { color: #fbbf24; }
    .status-bin { color: #fb923c; }
    .status-error { color: #f87171; }

    /* Mini stat boxes for dense display */
    .mini-stat { background: #2d3748; padding: 8px; border-radius: 6px; text-align: center; }
    .mini-stat .value { font-size: 1.1rem; font-weight: 600; color: #f1f5f9; }
    .mini-stat .label { font-size: 0.6rem; color: #94a3b8; margin-top: 2px; }
    .mini-stat.active .value { color: #4ade80; }

    /* Skills list - 7 columns */
    .skill-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; max-height: 200px; overflow-y: auto; }
    .skill-item { display: flex; align-items: center; gap: 8px; padding: 8px;
                  background: #2d3748; border-radius: 6px; font-size: 0.8rem; }
    .skill-icon { font-size: 1.1rem; }
    .skill-info { flex: 1; min-width: 0; }
    .skill-name { font-weight: 600; color: #f1f5f9; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .skill-meta { font-size: 0.65rem; color: #94a3b8; }
    .skill-status { padding: 2px 6px; border-radius: 8px; font-size: 0.6rem; font-weight: 600; }

    /* Execution list */
    .exec-list { max-height: 180px; overflow-y: auto; }
    .exec-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px;
                 background: #2d3748; border-radius: 4px; margin-bottom: 3px; font-size: 0.75rem; }
    .exec-status { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .exec-status.success { background: #4ade80; }
    .exec-status.failure { background: #f87171; }
    .exec-info { flex: 1; font-family: monospace; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .exec-time { color: #94a3b8; font-size: 0.65rem; }
    .exec-duration { color: #60a5fa; font-size: 0.7rem; min-width: 50px; text-align: right; }

    /* Skill metrics breakdown */
    .skill-metrics-list { max-height: 200px; overflow-y: auto; }
    .skill-metrics { padding: 8px; background: #2d3748; border-radius: 6px; margin-bottom: 6px; }
    .skill-metrics-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .skill-metrics-name { font-weight: 600; color: #c4b5fd; font-size: 0.85rem; }
    .skill-metrics-stats { font-size: 0.7rem; color: #94a3b8; }
    .skill-metrics-detail { font-size: 0.7rem; color: #94a3b8; margin-bottom: 4px; }
    .command-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .command-tag { background: #334155; padding: 2px 6px; border-radius: 3px; font-size: 0.65rem; font-family: monospace; }
    .command-tag .count { color: #60a5fa; margin-left: 3px; }

    /* Endpoints */
    .endpoints { background: #1e293b; border-radius: 8px; padding: 12px; margin-top: 16px; }
    .endpoints h2 { color: #38bdf8; margin-bottom: 10px; font-size: 0.9rem; }
    .endpoint-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
    .endpoint { display: flex; gap: 6px; align-items: center; padding: 4px; font-size: 0.7rem; }
    .method { padding: 2px 5px; border-radius: 3px; font-size: 0.6rem; font-weight: 600; }
    .method.get { background: #3b82f6; color: white; }
    .method.post { background: #22c55e; color: white; }
    .method.delete { background: #ef4444; color: white; }
    .path { color: #e2e8f0; font-family: monospace; font-size: 0.7rem; }

    footer { margin-top: 20px; text-align: center; color: #64748b; font-size: 0.75rem; }

    /* Log entries */
    .log-list { max-height: 220px; overflow-y: auto; }
    .log-item { display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; background: #2d3748; border-radius: 4px; margin-bottom: 3px; font-size: 0.75rem; transition: background 0.15s; flex-wrap: wrap; }
    .log-item:hover { background: #374151; }
    .log-item.has-details { cursor: pointer; }
    .log-item.has-details::before { content: '▶'; font-size: 0.5rem; color: #64748b; margin-right: -4px; transition: transform 0.15s; }
    .log-item.has-details:hover::before { color: #60a5fa; }
    .log-item.expanded { background: #374151; }
    .log-item.expanded::before { transform: rotate(90deg); color: #60a5fa; }
    .log-level { padding: 2px 5px; border-radius: 3px; font-size: 0.6rem; font-weight: 600; min-width: 40px; text-align: center; }
    .log-level.debug { background: #6b7280; color: white; }
    .log-level.info { background: #3b82f6; color: white; }
    .log-level.warn { background: #f59e0b; color: white; }
    .log-level.error { background: #ef4444; color: white; }
    .log-category { color: #c4b5fd; font-size: 0.65rem; min-width: 60px; }
    .log-message { flex: 1; color: #e2e8f0; font-family: monospace; word-break: break-word; }
    .log-time { color: #64748b; font-size: 0.65rem; min-width: 65px; text-align: right; }
    .log-details { display: none; width: 100%; margin-top: 6px; padding: 8px; background: #1e293b; border-radius: 4px; border-left: 3px solid #3b82f6; }
    .log-details pre { margin: 0; font-size: 0.7rem; font-family: monospace; color: #94a3b8; white-space: pre-wrap; word-break: break-all; }
    .log-item.expanded .log-details { display: block; }
    .log-stats { display: flex; gap: 12px; }
    .log-stat { font-size: 0.7rem; }
    .log-stat .count { font-weight: 600; margin-right: 2px; }
    .log-stat.error .count { color: #f87171; }
    .log-stat.warn .count { color: #fbbf24; }
    .log-stat.info .count { color: #60a5fa; }

    /* Log controls */
    .log-controls { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
    .log-filter-btn { padding: 4px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 600; border: 1px solid #475569; background: transparent; color: #94a3b8; cursor: pointer; transition: all 0.15s; }
    .log-filter-btn:hover { border-color: #60a5fa; color: #60a5fa; }
    .log-filter-btn.active { background: #3b82f6; border-color: #3b82f6; color: white; }
    .log-filter-btn.error.active { background: #ef4444; border-color: #ef4444; }
    .log-filter-btn.warn.active { background: #f59e0b; border-color: #f59e0b; }
    .log-filter-btn.info.active { background: #3b82f6; border-color: #3b82f6; }
    .log-filter-btn.debug.active { background: #6b7280; border-color: #6b7280; }
    .log-search { flex: 1; min-width: 120px; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; border: 1px solid #475569; background: #1e293b; color: #e2e8f0; }
    .log-search::placeholder { color: #64748b; }
    .log-search:focus { outline: none; border-color: #60a5fa; }
    .log-clear-btn { padding: 4px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 600; border: 1px solid #7f1d1d; background: transparent; color: #f87171; cursor: pointer; }
    .log-clear-btn:hover { background: #7f1d1d; color: white; }

    /* Sparkline */
    .sparkline-container { display: flex; align-items: center; gap: 16px; padding: 8px 12px; background: #1e293b; border-radius: 6px; margin-bottom: 10px; }
    .sparkline-label { font-size: 0.7rem; color: #94a3b8; min-width: 100px; }
    .sparkline-label span { display: block; font-size: 0.6rem; color: #64748b; }
    .sparkline { flex: 1; height: 24px; }
    .sparkline svg { width: 100%; height: 100%; }
    .sparkline-line { fill: none; stroke: #3b82f6; stroke-width: 1.5; }
    .sparkline-area { fill: url(#sparklineGradient); opacity: 0.3; }
    .sparkline-error { stroke: #ef4444; }
    .sparkline-error-area { fill: url(#sparklineErrorGradient); }
    .sparkline-value { min-width: 60px; text-align: right; font-size: 0.75rem; font-weight: 600; color: #e2e8f0; }
    .sparkline-value.error { color: #f87171; }

    /* No media query reductions - always maintain 7+ columns */
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-left">
        <span class="scope-badge" data-domain-full="skill.management.system.api">
          <span class="domain-prefix">SYS</span>SCOPE
        </span>
        <div class="header-title">
          <h1>Skill <span class="accent">Management</span> System</h1>
          <div class="subtitle">
            API Server powered by
            <span class="version-badge" tabindex="0" role="button" aria-label="Version info">
              Bun ${Bun.version}
              <div class="version-tooltip">
                <div><strong>Bun:</strong> ${Bun.version}</div>
                <div><strong>Node:</strong> ${process.version}</div>
                <div><strong>Platform:</strong> ${process.platform}</div>
              </div>
            </span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <!-- System Tension Ring -->
        <div class="system-tension" id="system-tension">
          <div class="tension-ring">
            <svg viewBox="0 0 36 36" width="44" height="44">
              <circle class="tension-bg" cx="18" cy="18" r="15.9155" />
              <circle class="tension-fill" id="tension-circle" cx="18" cy="18" r="15.9155"
                      stroke-dasharray="100" stroke-dashoffset="100" />
            </svg>
            <span class="tension-value" id="tension-value">--</span>
          </div>
          <span class="tension-label">Health</span>
        </div>
        <!-- Enhanced Live Indicator -->
        <div class="header-meta">
          <div class="live-indicator" id="live-indicator" data-status="online">
            <span class="live-dot"></span>
            <div class="indicator-meta">
              <span class="status-text" id="status-text">Online</span>
              <span class="last-update" id="last-update">--</span>
            </div>
          </div>
          <!-- Header Stats with Trends -->
          <div class="header-stats">
            <div class="stat-item" id="stat-ready">
              <span class="dot green"></span>
              <span class="stat-value" id="header-ready">0</span>
              <span class="stat-label">Ready</span>
              <span class="trend-arrow" id="trend-ready"></span>
            </div>
            <div class="stat-item" id="stat-terminals">
              <span class="dot blue"></span>
              <span class="stat-value" id="header-terminals">0</span>
              <span class="stat-label">Terminals</span>
              <span class="trend-arrow" id="trend-terminals"></span>
            </div>
            <div class="stat-item" id="stat-execs">
              <span class="dot yellow"></span>
              <span class="stat-value" id="header-execs">0</span>
              <span class="stat-label">Execs</span>
              <span class="trend-arrow" id="trend-execs"></span>
            </div>
          </div>
        </div>
        <!-- Quick Actions Panel -->
        <div class="header-actions">
          <button class="action-btn" id="btn-refresh" title="Refresh data" aria-label="Refresh data">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
          <button class="action-btn" id="btn-export" title="Export metrics" aria-label="Export metrics">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </button>
          <span class="action-divider"></span>
          <button class="action-btn danger" id="btn-emergency" title="Emergency stop" aria-label="Emergency stop all skills">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Row 1: 8 Key Stats -->
    <div class="grid-8" id="stats-grid">
      <div class="card card-sm loading" role="region" aria-label="Total Executions" tabindex="0" data-metric="executions" data-tooltip="Total skill executions since start">
        <div class="stat-big"><div class="value" id="total-executions" aria-live="polite">0</div><div class="label">Total Execs</div></div>
      </div>
      <div class="card card-sm loading" role="region" aria-label="Success Rate" tabindex="0" data-metric="success-rate" data-tooltip="Percentage of successful executions">
        <div class="stat-big success" id="success-rate-card"><div class="value" id="success-rate" aria-live="polite">N/A</div><div class="label">Success Rate</div></div>
      </div>
      <div class="card card-sm loading" role="region" aria-label="Average Time" tabindex="0" data-metric="avg-time" data-tooltip="Average execution duration">
        <div class="stat-big"><div class="value" id="avg-time" aria-live="polite">N/A</div><div class="label">Avg Time</div></div>
      </div>
      <div class="card card-sm loading" role="region" aria-label="Active Terminals" tabindex="0" data-metric="terminals" data-tooltip="Currently active PTY sessions">
        <div class="stat-big" id="active-terminals-card"><div class="value" id="active-terminals" aria-live="polite">0<span class="status-pulse" id="terminal-pulse" style="display:none;"></span></div><div class="label">Terminals</div></div>
      </div>
      <div class="card card-sm loading" role="region" aria-label="Executions Per Hour" tabindex="0" data-metric="hourly" data-tooltip="Executions in the last hour">
        <div class="stat-big"><div class="value" id="hour-execs" aria-live="polite">0</div><div class="label">Execs/Hour</div></div>
      </div>
      <div class="card card-sm loading" role="region" aria-label="Error Rate" tabindex="0" data-metric="errors" data-tooltip="Error percentage in the last hour">
        <div class="stat-big" id="error-rate-card"><div class="value" id="hour-errors" aria-live="polite">0%</div><div class="label">Error Rate</div></div>
      </div>
      <div class="card card-sm loading" role="region" aria-label="Server Uptime" tabindex="0" data-metric="uptime" data-tooltip="Time since server started">
        <div class="stat-big"><div class="value" id="sys-uptime" aria-live="polite">--</div><div class="label">Uptime</div></div>
      </div>
      <div class="card card-sm loading" role="region" aria-label="CPU Usage" tabindex="0" data-metric="cpu" data-tooltip="Current CPU utilization">
        <div class="stat-big" id="cpu-card"><div class="value" id="sys-cpu" aria-live="polite">--</div><div class="label">CPU</div></div>
      </div>
    </div>

    <!-- Sparklines Row -->
    <div class="sparkline-container">
      <div class="sparkline-label">Executions<span>Last 24h hourly</span></div>
      <div class="sparkline" id="exec-sparkline"><svg viewBox="0 0 200 24" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="sparklineErrorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path class="sparkline-area" d="M0,24 L0,24 L200,24 L200,24 Z"/>
        <path class="sparkline-line" d="M0,24 L200,24"/>
      </svg></div>
      <div class="sparkline-value" id="exec-sparkline-value">0</div>
    </div>
    <div class="sparkline-container">
      <div class="sparkline-label">Error Rate<span>Last 24h hourly</span></div>
      <div class="sparkline" id="error-sparkline"><svg viewBox="0 0 200 24" preserveAspectRatio="none">
        <path class="sparkline-error-area" d="M0,24 L0,24 L200,24 L200,24 Z"/>
        <path class="sparkline-line sparkline-error" d="M0,24 L200,24"/>
      </svg></div>
      <div class="sparkline-value error" id="error-sparkline-value">0%</div>
    </div>

    <!-- Row 2: Trends (8 columns) -->
    <div class="card" style="margin-bottom: 12px;">
      <div class="card-header"><h2>Trends & Performance</h2></div>
      <div class="grid-8" style="margin-bottom: 0;">
        <div class="mini-stat"><div class="value" id="hour-avg">0ms</div><div class="label">Hour Avg</div></div>
        <div class="mini-stat"><div class="value" id="day-execs">0</div><div class="label">24h Execs</div></div>
        <div class="mini-stat"><div class="value" id="day-avg">0ms</div><div class="label">24h Avg</div></div>
        <div class="mini-stat"><div class="value" id="day-errors">0%</div><div class="label">24h Errors</div></div>
        <div class="mini-stat"><div class="value" id="sys-memory">--</div><div class="label">Memory</div></div>
        <div class="mini-stat"><div class="value">${process.platform}</div><div class="label">Platform</div></div>
        <div class="mini-stat"><div class="value" id="ready-skills">--</div><div class="label">Ready</div></div>
        <div class="mini-stat"><div class="value" id="health-percent">--</div><div class="label">Health</div></div>
      </div>
    </div>

    <!-- Row 3: Terminal Sessions (8 columns) -->
    <div class="card" style="margin-bottom: 12px;">
      <div class="card-header"><h2>Terminal Sessions</h2><span style="font-size: 0.7rem; color: #94a3b8;" id="term-time">0s total</span></div>
      <div class="grid-8" style="margin-bottom: 0;">
        <div class="mini-stat active"><div class="value" id="term-active">0</div><div class="label">Active</div></div>
        <div class="mini-stat"><div class="value" id="term-interactive">0</div><div class="label">Interactive</div></div>
        <div class="mini-stat"><div class="value" id="term-dashboard">0</div><div class="label">Dashboard</div></div>
        <div class="mini-stat"><div class="value" id="term-debug">0</div><div class="label">Debug</div></div>
        <div class="mini-stat"><div class="value" id="term-collab">0</div><div class="label">Collab</div></div>
        <div class="mini-stat"><div class="value" id="term-recording">0</div><div class="label">Recording</div></div>
        <div class="mini-stat"><div class="value status-ready">Enabled</div><div class="label">TLS</div></div>
        <div class="mini-stat"><div class="value status-ready">100/min</div><div class="label">Rate Limit</div></div>
      </div>
    </div>

    <!-- Row 4: Logs & Errors (8 columns) -->
    <div class="card" style="margin-bottom: 12px;">
      <div class="card-header">
        <h2>Logs & Errors</h2>
        <div class="log-stats">
          <span class="log-stat error"><span class="count" id="log-errors">0</span>errors</span>
          <span class="log-stat warn"><span class="count" id="log-warns">0</span>warnings</span>
          <span class="log-stat info"><span class="count" id="log-infos">0</span>info</span>
        </div>
      </div>
      <div class="grid-8" style="margin-bottom: 8px;">
        <div class="mini-stat error" style="background: #7f1d1d40;"><div class="value" id="log-error-count">0</div><div class="label">Errors</div></div>
        <div class="mini-stat" style="background: #78350f40;"><div class="value" id="log-warn-count">0</div><div class="label">Warnings</div></div>
        <div class="mini-stat" style="background: #1e3a5f40;"><div class="value" id="log-info-count">0</div><div class="label">Info</div></div>
        <div class="mini-stat"><div class="value" id="log-debug-count">0</div><div class="label">Debug</div></div>
        <div class="mini-stat"><div class="value" id="log-total">0</div><div class="label">Total</div></div>
        <div class="mini-stat"><div class="value" id="log-categories">0</div><div class="label">Categories</div></div>
        <div class="mini-stat"><div class="value">200</div><div class="label">Max Stored</div></div>
        <div class="mini-stat"><div class="value status-ready" id="log-stream-status">Live</div><div class="label">Stream</div></div>
      </div>
      <div class="log-controls">
        <button class="log-filter-btn active" data-level="all">All</button>
        <button class="log-filter-btn error" data-level="error">Errors</button>
        <button class="log-filter-btn warn" data-level="warn">Warnings</button>
        <button class="log-filter-btn info" data-level="info">Info</button>
        <button class="log-filter-btn debug" data-level="debug">Debug</button>
        <input type="text" class="log-search" id="log-search" placeholder="Search logs...">
        <select class="log-search" id="log-category-filter" style="min-width: 80px; flex: 0;">
          <option value="">All Categories</option>
        </select>
        <button class="log-clear-btn" id="log-clear-btn">Clear Logs</button>
      </div>
      <div class="log-list" id="log-entries" aria-live="polite" aria-label="Log entries">
        <div style="color: #64748b; text-align: center; padding: 20px; font-size: 0.75rem;">No logs yet</div>
      </div>
    </div>

    <!-- Row 5: 7-column content grid -->
    <div class="grid-7">
      <div class="card">
        <div class="card-header"><h2>Recent Executions</h2><span style="font-size: 0.65rem; color: #94a3b8;">Last 15</span></div>
        <div class="exec-list" id="recent-executions" aria-live="polite" aria-label="Recent executions"><div style="color: #64748b; text-align: center; padding: 12px; font-size: 0.75rem;">No executions yet</div></div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Per-Skill Breakdown</h2></div>
        <div class="skill-metrics-list" id="skill-metrics" aria-live="polite" aria-label="Skill metrics"><div style="color: #64748b; text-align: center; padding: 12px; font-size: 0.75rem;">No skill data yet</div></div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Installed Skills</h2><span style="font-size: 0.65rem; color: #94a3b8;" id="skill-count">0</span></div>
        <div class="skill-grid" id="skills" aria-live="polite" aria-label="Installed skills">Loading...</div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Security</h2></div>
        <div class="stat-inline"><span class="stat-label">TLS</span><span class="stat-value status-ready">On</span></div>
        <div class="stat-inline"><span class="stat-label">Auth</span><span class="stat-value status-ready">Required</span></div>
        <div class="stat-inline"><span class="stat-label">Validation</span><span class="stat-value status-ready">Active</span></div>
      </div>
      <div class="card">
        <div class="card-header"><h2>API Stats</h2></div>
        <div class="stat-inline"><span class="stat-label">Endpoints</span><span class="stat-value">14</span></div>
        <div class="stat-inline"><span class="stat-label">GET</span><span class="stat-value">10</span></div>
        <div class="stat-inline"><span class="stat-label">POST</span><span class="stat-value">3</span></div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Builds</h2></div>
        <div class="stat-inline"><span class="stat-label">Targets</span><span class="stat-value">4</span></div>
        <div class="stat-inline"><span class="stat-label">darwin-arm64</span><span class="stat-value status-ready">OK</span></div>
        <div class="stat-inline"><span class="stat-label">linux-x64</span><span class="stat-value status-ready">OK</span></div>
      </div>
      <div class="card">
        <div class="card-header"><h2>PTY</h2></div>
        <div class="stat-inline"><span class="stat-label">Manager</span><span class="stat-value status-ready">Ready</span></div>
        <div class="stat-inline"><span class="stat-label">Sessions</span><span class="stat-value" id="pty-sessions">0</span></div>
        <div class="stat-inline"><span class="stat-label">Max</span><span class="stat-value">10</span></div>
      </div>
    </div>

    <!-- API Endpoints - 5 columns -->
    <div class="endpoints">
      <h2>API Endpoints</h2>
      <div class="endpoint-grid">
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/skills</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/skills/:name</span></div>
        <div class="endpoint"><span class="method post">POST</span><span class="path">/api/skills/:name/execute</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/skills/:name/test</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/package</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/health</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/metrics</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/logs</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/integrity</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/report</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/builds</span></div>
        <div class="endpoint"><span class="method post">POST</span><span class="path">/api/builds/:skill</span></div>
        <div class="endpoint"><span class="method post">POST</span><span class="path">/api/builds/:skill/multi</span></div>
        <div class="endpoint"><span class="method get">GET</span><span class="path">/api/builds/:skill/:target/download</span></div>
        <div class="endpoint"><span class="method delete">DELETE</span><span class="path">/api/builds</span></div>
      </div>
    </div>

    <footer>
      <div class="footer-left">
        <div class="footer-brand"><strong>SCOPE</strong> Skill Management System v1.0.0</div>
        <div class="footer-stats">
          <span>Runtime: <strong>Bun ${Bun.version}</strong></span>
          <span>Platform: <strong>${process.platform}</strong></span>
          <span>Node: <strong>${process.version}</strong></span>
        </div>
      </div>
      <div class="footer-right">
        <span id="footer-uptime">Uptime: --</span> • <span id="footer-memory">Memory: --</span>
      </div>
    </footer>
  </div>

  <script>
    const API_KEY = new URLSearchParams(window.location.search).get('key') || localStorage.getItem('skill-api-key') || 'dev-key';
    if (API_KEY !== 'dev-key') localStorage.setItem('skill-api-key', API_KEY);
    const headers = { 'x-api-key': API_KEY };

    // Security: Escape HTML to prevent XSS
    function escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Debounce helper for performance
    function debounce(fn, ms) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
      };
    }

    function updateLastUpdate() {
      document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
    }

    function updateSparkline(containerId, values, valueId, isPercentage = false) {
      if (!values || values.length === 0) return;

      const container = document.getElementById(containerId);
      if (!container) return;
      const svg = container.querySelector('svg');
      if (!svg) return;

      const width = 200;
      const height = 24;
      const padding = 2;

      // Normalize values
      const maxVal = Math.max(...values, 1);
      const points = values.map((v, i) => ({
        x: (i / Math.max(values.length - 1, 1)) * width,
        y: height - padding - ((v / maxVal) * (height - padding * 2))
      }));

      // Build SVG path
      const linePath = points.map((p, i) => \`\${i === 0 ? 'M' : 'L'}\${p.x.toFixed(1)},\${p.y.toFixed(1)}\`).join(' ');
      const areaPath = linePath + \` L\${width},\${height} L0,\${height} Z\`;

      // Update paths
      const lineEl = svg.querySelector('.sparkline-line');
      const areaEl = svg.querySelector('[class*="area"]');
      if (lineEl) lineEl.setAttribute('d', linePath);
      if (areaEl) areaEl.setAttribute('d', areaPath);

      // Update value display
      const lastValue = values[values.length - 1];
      const valueEl = document.getElementById(valueId);
      if (valueEl) {
        valueEl.textContent = isPercentage ? lastValue.toFixed(1) + '%' : lastValue;
      }
    }

    // Smart color coding by threshold
    function updateStatWithThreshold(cardId, value, thresholds = {}) {
      const card = document.getElementById(cardId);
      if (!card) return;
      const statBig = card.classList.contains('stat-big') ? card : card.querySelector('.stat-big');
      if (!statBig) return;

      // Remove previous state classes
      statBig.classList.remove('success', 'warning', 'danger');

      // Parse numeric value
      const numValue = parseFloat(String(value).replace('%', ''));

      // Apply threshold-based styling
      if (thresholds.successAbove !== undefined && numValue >= thresholds.successAbove) {
        statBig.classList.add('success');
      } else if (thresholds.successBelow !== undefined && numValue <= thresholds.successBelow) {
        statBig.classList.add('success');
      } else if (thresholds.warningAbove !== undefined && numValue >= thresholds.warningAbove) {
        statBig.classList.add('warning');
      } else if (thresholds.warningBelow !== undefined && numValue <= thresholds.warningBelow) {
        statBig.classList.add('warning');
      } else if (thresholds.dangerAbove !== undefined && numValue >= thresholds.dangerAbove) {
        statBig.classList.add('danger');
      } else if (thresholds.dangerBelow !== undefined && numValue <= thresholds.dangerBelow) {
        statBig.classList.add('danger');
      }
    }

    // Remove loading state from all stat cards
    function removeLoadingStates() {
      document.querySelectorAll('#stats-grid .card-sm.loading').forEach(card => {
        card.classList.remove('loading');
      });
    }

    // Track previous values for trend arrows
    let prevMetrics = { ready: 0, terminals: 0, execs: 0 };
    let serverStartTime = Date.now();
    let skillsData = null; // Stores latest skills data for trend calculation

    // Calculate system tension (health score) - lower is better, higher tension = problems
    function calculateTension(metrics) {
      if (!metrics) return 0;
      let tension = 0;

      // Error rate contributes most (0-40 points)
      const errorRate = parseFloat(String(metrics.trends?.lastHour?.errorRate || '0').replace('%', ''));
      tension += Math.min(40, errorRate * 4);

      // CPU usage (0-30 points)
      const cpu = parseFloat(String(metrics.system?.cpuUsage || '0').replace('%', ''));
      tension += Math.min(30, cpu * 0.3);

      // Memory pressure (0-20 points) - thresholds in MB
      const memStr = metrics.system?.memoryUsage || '0 MB';
      const memMatch = memStr.match(/([\\d.]+)\\s*(KB|MB|GB)?/i);
      if (memMatch) {
        let memMB = parseFloat(memMatch[1]);
        const unit = (memMatch[2] || 'MB').toUpperCase();
        if (unit === 'KB') memMB /= 1024;
        else if (unit === 'GB') memMB *= 1024;
        if (memMB > 500) tension += 10;
        if (memMB > 1000) tension += 10;
      }

      // Active terminal load (0-10 points)
      const terminals = metrics.terminalUsage?.activeTerminals || 0;
      if (terminals > 5) tension += 5;
      if (terminals > 10) tension += 5;

      return Math.min(100, Math.round(tension));
    }

    // Update tension ring display
    function updateTensionRing(tension) {
      const circle = document.getElementById('tension-circle');
      const value = document.getElementById('tension-value');
      const container = document.getElementById('system-tension');

      if (!circle || !value || !container) {
        console.warn('Tension ring elements not found:', { circle: !!circle, value: !!value, container: !!container });
        return;
      }

      // Health = 100 - tension (higher health is better)
      const health = 100 - tension;

      // Update circle - use setAttribute for SVG (stroke-dashoffset: 100 = empty, 0 = full)
      // For the ring to show health%, we need dashoffset = 100 - health
      const dashOffset = 100 - health;
      circle.setAttribute('stroke-dashoffset', dashOffset);

      // Update value text
      value.textContent = health + '%';

      // Update color based on health thresholds
      container.classList.remove('warning', 'critical');
      if (health < 50) {
        container.classList.add('critical');
        circle.setAttribute('stroke', '#ef4444');
      } else if (health < 75) {
        container.classList.add('warning');
        circle.setAttribute('stroke', '#f59e0b');
      } else {
        circle.setAttribute('stroke', '#10b981');
      }
    }

    // Update trend arrows for header stats
    function updateTrends(current) {
      const updateTrend = (id, prev, curr) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (curr > prev) {
          el.textContent = '\\u2191';
          el.className = 'trend-arrow up';
        } else if (curr < prev) {
          el.textContent = '\\u2193';
          el.className = 'trend-arrow down';
        } else {
          el.textContent = '';
          el.className = 'trend-arrow';
        }
      };

      updateTrend('trend-ready', prevMetrics.ready, current.ready);
      updateTrend('trend-terminals', prevMetrics.terminals, current.terminals);
      updateTrend('trend-execs', prevMetrics.execs, current.execs);

      prevMetrics = { ...current };
    }

    // Format uptime as human readable
    function formatUptime(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return days + 'd ' + (hours % 24) + 'h';
      if (hours > 0) return hours + 'h ' + (minutes % 60) + 'm';
      if (minutes > 0) return minutes + 'm ' + (seconds % 60) + 's';
      return seconds + 's';
    }

    // Helper: add click + keyboard handler
    function addButtonHandler(id, handler) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', handler);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler(e);
        }
      });
    }

    // Quick action button handlers (debounced)
    const debouncedRefresh = debounce(async () => {
      const btn = document.getElementById('btn-refresh');
      btn.style.animation = 'spin 0.5s ease';
      await loadMetrics();
      await loadSkills();
      setTimeout(() => btn.style.animation = '', 500);
    }, 300);
    addButtonHandler('btn-refresh', debouncedRefresh);

    addButtonHandler('btn-export', async () => {
      try {
        const res = await fetch('/api/metrics', { headers });
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'skill-metrics-' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Export failed:', e);
      }
    });

    addButtonHandler('btn-emergency', async () => {
      if (!confirm('Emergency stop all running skill processes?')) return;
      // For now just log - would need backend endpoint
      console.log('Emergency stop triggered');
      alert('Emergency stop initiated. Check console for details.');
    });

    // Add spin animation for refresh button
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);

    async function loadMetrics() {
      try {
        const res = await fetch('/api/metrics', { headers });
        const data = await res.json();

        // Aggregate stats
        document.getElementById('total-executions').textContent = data.aggregate.totalExecutions;
        document.getElementById('success-rate').textContent = data.aggregate.successRate;
        document.getElementById('avg-time').textContent = data.aggregate.averageTime;

        // Terminal usage
        document.getElementById('active-terminals').textContent = data.terminalUsage.activeTerminals;
        document.getElementById('term-active').textContent = data.terminalUsage.activeTerminals;
        document.getElementById('term-interactive').textContent = data.terminalUsage.interactiveSessions;
        document.getElementById('term-dashboard').textContent = data.terminalUsage.dashboardSessions;
        document.getElementById('term-debug').textContent = data.terminalUsage.debugSessions;
        document.getElementById('term-collab').textContent = data.terminalUsage.collabSessions || 0;
        document.getElementById('term-recording').textContent = data.terminalUsage.recordingSessions || 0;
        document.getElementById('term-time').textContent = data.terminalUsage.totalTerminalTime + ' total';
        document.getElementById('pty-sessions').textContent = data.terminalUsage.activeTerminals;

        // Update active terminals card color
        const termCard = document.getElementById('active-terminals-card');
        if (data.terminalUsage.activeTerminals > 0) {
          termCard.classList.add('active');
        } else {
          termCard.classList.remove('active');
        }

        // Trends
        document.getElementById('hour-execs').textContent = data.trends.lastHour.executions;
        document.getElementById('hour-avg').textContent = Math.round(data.trends.lastHour.avgDuration) + 'ms';
        document.getElementById('hour-errors').textContent = data.trends.lastHour.errorRate;
        document.getElementById('day-execs').textContent = data.trends.last24Hours.executions;
        document.getElementById('day-avg').textContent = Math.round(data.trends.last24Hours.avgDuration) + 'ms';
        document.getElementById('day-errors').textContent = data.trends.last24Hours.errorRate;

        // Update sparklines
        if (data.hourlyHistory && data.hourlyHistory.length > 0) {
          updateSparkline('exec-sparkline', data.hourlyHistory.map(h => h.executions), 'exec-sparkline-value');
          updateSparkline('error-sparkline', data.hourlyHistory.map(h => h.errorRate), 'error-sparkline-value', true);
        }

        // System health
        document.getElementById('sys-uptime').textContent = data.system.uptime;
        document.getElementById('sys-memory').textContent = data.system.memoryUsage;
        document.getElementById('sys-cpu').textContent = data.system.cpuUsage;

        // Header stats
        document.getElementById('header-terminals').textContent = data.terminalUsage.activeTerminals;
        document.getElementById('header-execs').textContent = data.aggregate.totalExecutions;

        // Calculate and update tension (system health)
        const tension = calculateTension(data);
        updateTensionRing(tension);

        // Update trend arrows
        const currentMetrics = {
          ready: skillsData ? skillsData.filter(s => s.status === 'ready').length : prevMetrics.ready,
          terminals: data.terminalUsage.activeTerminals,
          execs: data.aggregate.totalExecutions
        };
        updateTrends(currentMetrics);

        // Update live indicator status based on health
        const health = 100 - tension;
        const indicator = document.getElementById('live-indicator');
        const statusText = document.getElementById('status-text');
        if (indicator && statusText) {
          if (health >= 75) {
            indicator.dataset.status = 'online';
            statusText.textContent = 'Online';
          } else if (health >= 50) {
            indicator.dataset.status = 'degraded';
            statusText.textContent = 'Degraded';
          } else {
            indicator.dataset.status = 'offline';
            statusText.textContent = 'Critical';
          }
        }

        // Update stat items with tension indicators
        const tensionLevel = health < 50 ? 'critical' : health < 75 ? 'warning' : '';
        ['stat-ready', 'stat-terminals', 'stat-execs'].forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            if (tensionLevel) {
              el.setAttribute('data-tension', tensionLevel);
            } else {
              el.removeAttribute('data-tension');
            }
          }
        });

        // Footer stats
        document.getElementById('footer-uptime').textContent = 'Uptime: ' + data.system.uptime;
        document.getElementById('footer-memory').textContent = 'Memory: ' + data.system.memoryUsage;

        // Smart color coding based on thresholds
        updateStatWithThreshold('success-rate-card', data.aggregate.successRate, { successAbove: 95, warningAbove: 80, dangerBelow: 80 });
        updateStatWithThreshold('error-rate-card', data.trends.lastHour.errorRate, { successBelow: 2, warningAbove: 5, dangerAbove: 10 });
        updateStatWithThreshold('cpu-card', data.system.cpuUsage, { successBelow: 50, warningAbove: 70, dangerAbove: 90 });

        // Show/hide terminal pulse indicator
        const terminalPulse = document.getElementById('terminal-pulse');
        if (terminalPulse) {
          terminalPulse.style.display = data.terminalUsage.activeTerminals > 0 ? 'inline-block' : 'none';
        }

        // Remove loading states on first successful load
        removeLoadingStates();

        // Per-skill breakdown
        const skillMetricsEl = document.getElementById('skill-metrics');
        const skills = Object.entries(data.bySkill);
        if (skills.length > 0) {
          skillMetricsEl.innerHTML = skills.map(([id, s]) => {
            const cmds = Object.entries(s.commands || {}).map(([cmd, c]) =>
              \`<span class="command-tag">\${escapeHtml(cmd)}<span class="count">\${c.count}x</span></span>\`
            ).join('');
            return \`
              <div class="skill-metrics">
                <div class="skill-metrics-header">
                  <span class="skill-metrics-name">\${escapeHtml(id)}</span>
                  <span class="skill-metrics-stats">\${s.executions} runs | \${Math.round(s.averageDuration)}ms avg</span>
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 6px;">
                  <span style="color: #4ade80;">\${s.successes} success</span> •
                  <span style="color: #f87171;">\${s.failures} failed</span>
                </div>
                \${cmds ? '<div class="command-list">' + cmds + '</div>' : ''}
              </div>
            \`;
          }).join('');
        } else {
          skillMetricsEl.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">No skill data yet</div>';
        }

        // Recent executions
        const recentEl = document.getElementById('recent-executions');
        if (data.recentExecutions && data.recentExecutions.length > 0) {
          recentEl.innerHTML = data.recentExecutions.slice(0, 15).map(e => {
            const time = new Date(e.timestamp).toLocaleTimeString();
            const statusClass = escapeHtml(e.status);
            return \`
              <div class="exec-item">
                <span class="exec-status \${statusClass}"></span>
                <span class="exec-info">\${escapeHtml(e.skillId)}:\${escapeHtml(e.command)}</span>
                <span class="exec-duration">\${Math.round(e.duration)}ms</span>
                <span class="exec-time">\${time}</span>
              </div>
            \`;
          }).join('');
        } else {
          recentEl.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px;">No executions yet</div>';
        }

        updateLastUpdate();
      } catch (err) {
        console.error('Failed to load metrics:', err);
      }
    }

    async function loadSkills() {
      try {
        const [skillsRes, healthRes] = await Promise.all([
          fetch('/api/skills', { headers }),
          fetch('/api/health', { headers })
        ]);
        const data = await skillsRes.json();
        const health = await healthRes.json();
        const statusColors = { ready: 'status-ready', env: 'status-env', bin: 'status-bin', multiple: 'status-error', unknown: 'status-error' };

        // Store skills data for trend calculation
        skillsData = data.skills;

        document.getElementById('skill-count').textContent = data.skills.length + ' skills';
        document.getElementById('ready-skills').textContent = health.skills.ready + '/' + health.skills.total;
        document.getElementById('health-percent').textContent = health.skills.healthPercent + '%';
        document.getElementById('header-ready').textContent = health.skills.ready;

        document.getElementById('skills').innerHTML = data.skills.map(s => {
          const statusColor = statusColors[s.status] || '';
          return \`
            <div class="skill-item">
              <span class="skill-icon">\${escapeHtml(s.icon)}</span>
              <div class="skill-info">
                <div class="skill-name">\${escapeHtml(s.name)}</div>
                <div class="skill-meta">\${escapeHtml(s.category)}</div>
              </div>
              <span class="skill-status \${statusColor}">\${escapeHtml(s.status).toUpperCase()}</span>
            </div>
          \`;
        }).join('');
      } catch (err) {
        console.error('Failed to load skills:', err);
      }
    }

    // Log filter state
    let logState = {
      level: 'all',
      search: '',
      category: '',
      logs: [],
      categories: new Set()
    };

    async function loadLogs() {
      try {
        const res = await fetch('/api/logs?limit=50', { headers });
        const data = await res.json();

        // Update stats
        document.getElementById('log-error-count').textContent = data.stats.byLevel.error;
        document.getElementById('log-warn-count').textContent = data.stats.byLevel.warn;
        document.getElementById('log-info-count').textContent = data.stats.byLevel.info;
        document.getElementById('log-debug-count').textContent = data.stats.byLevel.debug;
        document.getElementById('log-total').textContent = data.stats.total;
        document.getElementById('log-categories').textContent = Object.keys(data.stats.byCategory).length;

        // Header stats
        document.getElementById('log-errors').textContent = data.stats.byLevel.error;
        document.getElementById('log-warns').textContent = data.stats.byLevel.warn;
        document.getElementById('log-infos').textContent = data.stats.byLevel.info;

        // Store logs and update categories
        logState.logs = data.logs || [];
        const categorySelect = document.getElementById('log-category-filter');
        const currentCat = categorySelect.value;

        // Update category dropdown
        const newCategories = new Set(logState.logs.map(l => l.category));
        if ([...newCategories].sort().join() !== [...logState.categories].sort().join()) {
          logState.categories = newCategories;
          categorySelect.innerHTML = '<option value="">All Categories</option>' +
            [...newCategories].sort().map(c => \`<option value="\${escapeHtml(c)}">\${escapeHtml(c)}</option>\`).join('');
          categorySelect.value = currentCat;
        }

        renderLogs();
      } catch (err) {
        console.error('Failed to load logs:', err);
      }
    }

    function renderLogs() {
      const logsEl = document.getElementById('log-entries');

      // Filter logs
      let filtered = logState.logs.filter(log => {
        if (logState.level !== 'all' && log.level !== logState.level) return false;
        if (logState.category && log.category !== logState.category) return false;
        if (logState.search) {
          const searchLower = logState.search.toLowerCase();
          const matchText = (log.message + ' ' + log.category + ' ' + (log.skillId || '') + ' ' + (log.requestId || '')).toLowerCase();
          if (!matchText.includes(searchLower)) return false;
        }
        return true;
      });

      if (filtered.length > 0) {
        logsEl.innerHTML = filtered.map(log => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          const hasDetails = log.details && Object.keys(log.details).length > 0;
          const hasRequestId = log.requestId;
          const expandable = hasDetails || hasRequestId;
          const detailsObj = { ...(log.details || {}), ...(hasRequestId ? { requestId: log.requestId } : {}) };
          const detailsJson = escapeHtml(JSON.stringify(detailsObj, null, 2));
          const levelClass = escapeHtml(log.level);
          return \`
            <div class="log-item\${expandable ? ' has-details' : ''}" data-id="\${escapeHtml(log.id)}" title="\${escapeHtml(log.requestId || '')}">
              <span class="log-level \${levelClass}">\${levelClass.toUpperCase()}</span>
              <span class="log-category">\${escapeHtml(log.category)}</span>
              <span class="log-message">\${escapeHtml(log.message)}</span>
              <span class="log-time">\${time}</span>
              \${expandable ? \`<div class="log-details"><pre>\${detailsJson}</pre></div>\` : ''}
            </div>
          \`;
        }).join('');

        // Add click/keyboard handlers for expandable items
        logsEl.querySelectorAll('.log-item.has-details').forEach(item => {
          item.setAttribute('tabindex', '0');
          item.setAttribute('role', 'button');
          item.setAttribute('aria-expanded', 'false');
          item.addEventListener('click', () => {
            item.classList.toggle('expanded');
            item.setAttribute('aria-expanded', item.classList.contains('expanded'));
          });
          item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              item.classList.toggle('expanded');
              item.setAttribute('aria-expanded', item.classList.contains('expanded'));
            }
          });
        });
      } else {
        logsEl.innerHTML = '<div style="color: #64748b; text-align: center; padding: 20px; font-size: 0.75rem;">No logs match filters</div>';
      }
    }

    // Initialize log controls
    function initLogControls() {
      // Filter buttons
      document.querySelectorAll('.log-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          logState.level = btn.dataset.level;
          renderLogs();
        });
      });

      // Search input
      document.getElementById('log-search').addEventListener('input', (e) => {
        logState.search = e.target.value;
        renderLogs();
      });

      // Category filter
      document.getElementById('log-category-filter').addEventListener('change', (e) => {
        logState.category = e.target.value;
        renderLogs();
      });

      // Clear logs button
      document.getElementById('log-clear-btn').addEventListener('click', async () => {
        if (!confirm('Clear all logs?')) return;
        try {
          await fetch('/api/logs', { method: 'DELETE', headers });
          logState.logs = [];
          logState.categories.clear();
          document.getElementById('log-category-filter').innerHTML = '<option value="">All Categories</option>';
          renderLogs();
        } catch (err) {
          console.error('Failed to clear logs:', err);
        }
      });
    }

    initLogControls();

    // Initial load
    loadMetrics();
    loadSkills();
    loadLogs();

    // Refresh intervals
    setInterval(loadMetrics, 5000);   // Metrics every 5s
    setInterval(loadSkills, 30000);   // Skills every 30s
    setInterval(loadLogs, 3000);      // Logs every 3s
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html", "Cache-Control": "no-cache" },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Server
// ═══════════════════════════════════════════════════════════════════════════

export class SkillAPIServer {
  private server: ReturnType<typeof Bun.serve> | null = null;

  async start(port: number = 3000) {
    // Initialize R2 log sync if configured
    const r2Storage = createBunR2StorageFromEnv();
    if (r2Storage) {
      logSyncManager = new LogSyncManager({
        r2Storage,
        batchSize: parseInt(process.env.LOG_BATCH_SIZE || "50"),
        syncIntervalMs: parseInt(process.env.LOG_SYNC_INTERVAL || "60000"),
        retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || "7"),
        enabled: process.env.LOG_R2_ENABLED !== "false",
      });
      logSyncManager.start();
    }

    this.server = Bun.serve({
      port,
      hostname: "0.0.0.0",

      error(error: Error) {
        console.error("Server error:", error);
        return jsonResponse(
          { error: "Internal Server Error", message: error.message },
          { status: 500 }
        );
      },

      fetch: async (req: Request) => {
        const url = new URL(req.url);
        const method = req.method;
        const path = url.pathname;

        // Handle CORS preflight
        if (method === "OPTIONS") {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers":
                "Content-Type, x-api-key, Authorization",
            },
          });
        }

        // Generate request ID for tracking (use incoming header or generate new)
        const requestId = req.headers.get("x-request-id") || generateRequestId();
        setCurrentRequestId(requestId);

        try {
          // Rate limiting
          const clientIP =
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            "unknown";

          if (!checkRateLimit(clientIP)) {
            serverLog.warn("ratelimit", "Rate limit exceeded", { clientIP, path });
            return jsonResponse(
              { error: "Too many requests", retryAfter: 60, requestId },
              { status: 429, headers: { "Retry-After": "60", "x-request-id": requestId } }
            );
          }

          // Serve dashboard
          if (path === "/" || path === "/dashboard") {
            return serveDashboard();
          }

          // Public endpoints (no auth required)
          if (path === "/api/health" && method === "GET") {
            return handleHealthCheck();
          }

          // Authenticate all other API endpoints
          if (path.startsWith("/api/")) {
            const authError = authenticateRequest(req);
            if (authError) return authError;
          }

          // Skills
          if (path === "/api/skills" && method === "GET") {
            return handleListSkills(req);
          }

          if (path.match(/^\/api\/skills\/[^/]+$/) && method === "GET") {
            const skillId = path.split("/")[3];
            return handleGetSkill(skillId);
          }

          if (path.match(/^\/api\/skills\/[^/]+\/execute$/) && method === "POST") {
            const skillId = path.split("/")[3];
            return handleExecuteSkill(req, skillId);
          }

          if (path.match(/^\/api\/skills\/[^/]+\/test$/) && method === "GET") {
            const skillId = path.split("/")[3];
            return handleTestSkill(skillId);
          }

          // Package
          if (path === "/api/package" && method === "GET") {
            return handleCreatePackage(req);
          }

          // System
          if (path === "/api/metrics" && method === "GET") {
            return handleMetrics();
          }

          if (path === "/api/logs" && method === "GET") {
            return handleGetLogs(req);
          }

          if (path === "/api/logs" && method === "DELETE") {
            const result = clearLogs();
            return jsonResponse({ success: true, ...result, timestamp: new Date().toISOString() });
          }

          if (path === "/api/integrity" && method === "GET") {
            return handleIntegrity();
          }

          if (path === "/api/report" && method === "GET") {
            return handleReport();
          }

          // Builds
          if (path === "/api/builds" && method === "GET") {
            return handleListBuilds();
          }

          if (path === "/api/builds" && method === "DELETE") {
            return handleCleanBuilds();
          }

          if (path.match(/^\/api\/builds\/[^/]+\/multi$/) && method === "POST") {
            const skillId = path.split("/")[3];
            return handleBuildMulti(req, skillId);
          }

          if (path.match(/^\/api\/builds\/[^/]+\/[^/]+\/download$/) && method === "GET") {
            const parts = path.split("/");
            const skillId = parts[3];
            const target = parts[4];
            return handleDownloadBuild(skillId, target);
          }

          if (path.match(/^\/api\/builds\/[^/]+$/) && method === "POST") {
            const skillId = path.split("/")[3];
            return handleBuildSkill(req, skillId);
          }

          if (path.match(/^\/api\/builds\/[^/]+$/) && method === "GET") {
            const skillId = path.split("/")[3];
            const url = new URL(req.url);
            const target = url.searchParams.get("target") || undefined;
            return handleGetBuild(skillId, target);
          }

          // Not found
          return jsonResponse(
            {
              error: "Not found",
              path,
              endpoints: [
                "GET  /api/skills",
                "GET  /api/skills/:name",
                "POST /api/skills/:name/execute",
                "GET  /api/skills/:name/test",
                "GET  /api/package",
                "GET  /api/health",
                "GET  /api/metrics",
                "GET  /api/integrity",
                "GET  /api/report",
                "GET  /api/builds",
                "POST /api/builds/:skill",
                "POST /api/builds/:skill/multi",
                "GET  /api/builds/:skill?target=...",
                "GET  /api/builds/:skill/:target/download",
                "DELETE /api/builds",
              ],
            },
            { status: 404 }
          );
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Unknown error";
          console.error("Request error:", error);
          serverLog.error("server", "Request error", { path, method, error: message });
          return jsonResponse({ error: message, requestId }, { status: 500 });
        } finally {
          setCurrentRequestId(undefined);
        }
      },
    });

    // Startup banner - always show minimal info
    console.log(`🚀 Skill API Server listening on http://localhost:${port}`);

    // Log server startup
    serverLog.info("server", "API server started", { port, bun: Bun.version, platform: process.platform });

    // Verbose startup info only in DEBUG mode
    if (DEBUG) {
      console.log("═".repeat(60));
      console.log(`📡 Local: http://localhost:${port}`);
      console.log(`📊 Dashboard: http://localhost:${port}/dashboard`);

      // Display Tailscale info
      const tailscale = await getTailscaleStatus();
      if (tailscale.connected) {
        console.log(`🔗 Tailscale IP: ${tailscale.ip}`);
        if (tailscale.dnsName) {
          console.log(`🌐 Tailscale DNS: ${tailscale.dnsName}`);
        }
      } else {
        console.log(`⚠️  Tailscale: Not connected`);
      }

      console.log(`🔑 API Keys configured: ${API_KEYS.size}`);
      console.log("═".repeat(60));
    }

    return this.server;
  }

  stop() {
    // Stop log sync manager and flush remaining logs
    if (logSyncManager) {
      logSyncManager.stop();
      logSyncManager = null;
    }

    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }
}

export function startAPIServer(port?: number) {
  const server = new SkillAPIServer();
  return server.start(port);
}

export default {
  SkillAPIServer,
  startAPIServer,
};

// Auto-start when run directly
if (import.meta.main) {
  const port = parseInt(process.env.PORT || "3002", 10);
  startAPIServer(port);
}
