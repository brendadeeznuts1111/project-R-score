/**
 * Health Check Endpoints
 *
 * Provides Kubernetes-compatible health probes:
 *   GET /api/health       — Basic health (db, memory, uptime)
 *   GET /api/health/ready — Readiness probe (all services up)
 *   GET /api/health/live  — Liveness probe (process alive)
 *
 * Response format (from api-contract.md §3):
 *   { status, version, uptime, memory, dbStatus, activeConnections, ... }
 */

import { getDb, checkDbHealth } from "@db/index";
import { env, getFeatureFlags } from "@utils/env";
import { createLogger } from "@utils/logger";
import { logHealth } from "@utils/tableLogger";
import { getIdleStatus } from "./idle-shutdown";
import { getQueueStats } from "./action-queue";
import { getRateLimitStats } from "./rate-limiter";

const logger = createLogger("HealthCheck");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VERSION = "5.2.0";

// Server start time — set when module is first loaded
const moduleLoadTime = Date.now();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMemoryUsage(): Record<string, number> {
  const usage = process.memoryUsage();
  return {
    rssMb: Math.round(usage.rss / 1024 / 1024),
    heapTotalMb: Math.round(usage.heapTotal / 1024 / 1024),
    heapUsedMb: Math.round(usage.heapUsed / 1024 / 1024),
    externalMb: Math.round(usage.external / 1024 / 1024),
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
  };
}

function getUptime(): number {
  return process.uptime();
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Handler: GET /api/health (basic)
// ---------------------------------------------------------------------------

export function handleBasicHealth(): Response {
  const dbHealthy = checkDbHealth();
  const memory = getMemoryUsage();
  const uptime = getUptime();

  logHealth({
    component: "HealthCheck",
    status: dbHealthy ? "ok" : "degraded",
    uptimeMs: Math.round(uptime * 1000),
    memoryMb: memory.rssMb,
  });

  return Response.json({
    status: dbHealthy ? "healthy" : "degraded",
    version: VERSION,
    uptime,
    uptimeFormatted: formatUptime(uptime),
    memory,
    dbStatus: dbHealthy ? "connected" : "disconnected",
    environment: env.NODE_ENV,
    timestamp: formatTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Handler: GET /api/health/ready (readiness probe)
// ---------------------------------------------------------------------------

export function handleReadiness(): Response {
  const dbHealthy = checkDbHealth();
  const memory = getMemoryUsage();
  const uptime = getUptime();

  // Collect service status
  const services: Record<string, string> = {
    database: dbHealthy ? "up" : "down",
    api: "up",
  };

  // Check if memory usage is reasonable (< 1GB RSS)
  const memoryOk = memory.rssMb < 1024;
  if (!memoryOk) {
    services.memory = "warning";
  }

  const allUp = Object.values(services).every((s) => s === "up");
  const status = allUp ? "ready" : "not_ready";
  const httpStatus = allUp ? 200 : 503;

  logHealth({
    component: "Readiness",
    status,
    uptimeMs: Math.round(uptime * 1000),
    memoryMb: memory.rssMb,
    activeConnections: 0,
  });

  return Response.json(
    {
      status,
      version: VERSION,
      uptime,
      memory,
      dbStatus: dbHealthy ? "connected" : "disconnected",
      services,
      featureFlags: getFeatureFlags(),
      timestamp: formatTimestamp(),
    },
    { status: httpStatus }
  );
}

// ---------------------------------------------------------------------------
// Handler: GET /api/health/live (liveness probe)
// ---------------------------------------------------------------------------

export function handleLiveness(): Response {
  return Response.json({
    status: "alive",
    version: VERSION,
    uptime: getUptime(),
    pid: process.pid,
    timestamp: formatTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Handler: GET /api/health/detailed (extended diagnostics)
// ---------------------------------------------------------------------------

export function handleDetailedHealth(): Response {
  const dbHealthy = checkDbHealth();
  const memory = getMemoryUsage();
  const uptime = getUptime();

  // Collect extended diagnostics
  let queueStats = { pending: 0, processing: 0, completed: 0, failed: 0, deadLetter: 0, total: 0 };
  let rateLimitStats = { totalBuckets: 0 };
  let idleStatus = { enabled: false };

  try {
    queueStats = getQueueStats();
  } catch (err: unknown) {
    logger.warn("Could not fetch queue stats", { error: String(err) });
  }

  try {
    rateLimitStats = getRateLimitStats() as { totalBuckets: number };
  } catch (err: unknown) {
    logger.warn("Could not fetch rate limit stats", { error: String(err) });
  }

  try {
    idleStatus = getIdleStatus() as { enabled: boolean };
  } catch (err: unknown) {
    logger.warn("Could not fetch idle status", { error: String(err) });
  }

  return Response.json({
    status: dbHealthy ? "healthy" : "degraded",
    version: VERSION,
    uptime,
    uptimeFormatted: formatUptime(uptime),
    memory,
    dbStatus: dbHealthy ? "connected" : "disconnected",
    environment: env.NODE_ENV,
    features: getFeatureFlags(),
    subsystems: {
      actionQueue: queueStats,
      rateLimiter: rateLimitStats,
      idleShutdown: idleStatus,
    },
    process: {
      pid: process.pid,
      ppid: process.ppid,
      arch: process.arch,
      platform: process.platform,
      nodeRuntime: process.version,
    },
    timestamp: formatTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}
