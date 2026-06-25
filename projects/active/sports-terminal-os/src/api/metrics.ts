/**
 * Prometheus Metrics Endpoint
 *
 * Exposes system and application metrics in Prometheus text format at /api/metrics.
 * Uses the prom-client library (Zone 4 dependency) to collect default Node.js
 * metrics plus custom business metrics for the sports terminal.
 *
 * Endpoint: GET /api/metrics
 * Content-Type: text/plain; version=0.0.4; charset=utf-8
 */

import { createLogger } from "@utils/logger";
import { logTelemetry } from "@utils/tableLogger";
import { env } from "@utils/env";
import type { Counter, Gauge, Histogram } from "prom-client";

const logger = createLogger("Metrics");

// ---------------------------------------------------------------------------
// Lazy-loaded prom-client — avoid hard crash if package not installed
// ---------------------------------------------------------------------------

let promClient: typeof import("prom-client") | null = null;

async function getPromClient(): Promise<typeof import("prom-client")> {
  if (promClient) return promClient;
  try {
    promClient = await import("prom-client");
    // Register default metrics (event loop lag, GC, memory, CPU, etc.)
    promClient.register.setDefaultLabels({
      app: "sports-terminal-os",
      version: env.NODE_ENV === "production" ? "5.2.0" : "5.2.0-dev",
    });
    promClient.collectDefaultMetrics({
      register: promClient.register,
      prefix: "st_",
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });
    logger.info("prom-client default metrics enabled");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.warn("prom-client not available — metrics disabled", { error: message });
    throw new Error(`prom-client not installed: ${message}`);
  }
  return promClient!;
}

// ---------------------------------------------------------------------------
// Custom metrics definitions (created lazily)
// ---------------------------------------------------------------------------

interface CustomMetrics {
  httpRequestsTotal: Counter<string>;
  wsConnections: Gauge<string>;
  wsMessagesReceived: Counter<string>;
  sseConnections: Gauge<string>;
  dbQueryDurationMs: Histogram<string>;
  cronJobsExecuted: Counter<string>;
  memoryUsageBytes: Gauge<string>;
}

let customMetrics: CustomMetrics | null = null;

async function getCustomMetrics(): Promise<CustomMetrics> {
  if (customMetrics) return customMetrics;

  const client = await getPromClient();

  customMetrics = {
    httpRequestsTotal: new client.Counter({
      name: "st_http_requests_total",
      help: "Total HTTP requests processed",
      labelNames: ["method", "route", "status_code"],
      registers: [client.register],
    }),

    wsConnections: new client.Gauge({
      name: "st_ws_connections_active",
      help: "Number of active WebSocket connections",
      registers: [client.register],
    }),

    wsMessagesReceived: new client.Counter({
      name: "st_ws_messages_received_total",
      help: "Total WebSocket messages received",
      labelNames: ["message_type"],
      registers: [client.register],
    }),

    sseConnections: new client.Gauge({
      name: "st_sse_connections_active",
      help: "Number of active SSE connections",
      registers: [client.register],
    }),

    dbQueryDurationMs: new client.Histogram({
      name: "st_db_query_duration_ms",
      help: "Database query duration in milliseconds",
      labelNames: ["query_type", "table"],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500],
      registers: [client.register],
    }),

    cronJobsExecuted: new client.Counter({
      name: "st_cron_jobs_executed_total",
      help: "Total cron job executions",
      labelNames: ["job_name", "status"],
      registers: [client.register],
    }),

    memoryUsageBytes: new client.Gauge({
      name: "st_memory_usage_bytes",
      help: "Process memory usage in bytes",
      labelNames: ["type"],
      registers: [client.register],
    }),
  };

  logger.info("Custom metrics registered");
  return customMetrics;
}

// ---------------------------------------------------------------------------
// Public API — metric recorders
// ---------------------------------------------------------------------------

/**
 * Record an HTTP request metric.
 */
export async function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number
): Promise<void> {
  try {
    const metrics = await getCustomMetrics();
    metrics.httpRequestsTotal.inc({ method, route: sanitizeRoute(route), status_code: String(statusCode) });
  } catch {
    // Never crash the request path on metrics failure
  }
}

/**
 * Update the active WebSocket connection count.
 */
export async function setWsConnections(count: number): Promise<void> {
  try {
    const metrics = await getCustomMetrics();
    metrics.wsConnections.set(count);
  } catch {
    // Silently ignore
  }
}

/**
 * Record a WebSocket message received.
 */
export async function recordWsMessage(messageType: string): Promise<void> {
  try {
    const metrics = await getCustomMetrics();
    metrics.wsMessagesReceived.inc({ message_type: messageType });
  } catch {
    // Silently ignore
  }
}

/**
 * Update the active SSE connection count.
 */
export async function setSseConnections(count: number): Promise<void> {
  try {
    const metrics = await getCustomMetrics();
    metrics.sseConnections.set(count);
  } catch {
    // Silently ignore
  }
}

/**
 * Record a database query duration.
 */
export async function recordDbQueryDuration(
  queryType: string,
  table: string,
  durationMs: number
): Promise<void> {
  try {
    const metrics = await getCustomMetrics();
    metrics.dbQueryDurationMs.observe({ query_type: queryType, table }, durationMs);
  } catch {
    // Silently ignore
  }
}

/**
 * Record a cron job execution.
 */
export async function recordCronJobExecuted(jobName: string, status: "success" | "failure"): Promise<void> {
  try {
    const metrics = await getCustomMetrics();
    metrics.cronJobsExecuted.inc({ job_name: jobName, status });
  } catch {
    // Silently ignore
  }
}

/**
 * Update memory usage gauge.
 */
export async function setMemoryUsage(type: "rss" | "heapTotal" | "heapUsed" | "external", bytes: number): Promise<void> {
  try {
    const metrics = await getCustomMetrics();
    metrics.memoryUsageBytes.set({ type }, bytes);
  } catch {
    // Silently ignore
  }
}

// ---------------------------------------------------------------------------
// Metrics endpoint handler
// ---------------------------------------------------------------------------

/**
 * Serve the /api/metrics endpoint in Prometheus text exposition format.
 */
export async function serveMetricsEndpoint(req: Request): Promise<Response> {
  try {
    const client = await getPromClient();
    const metrics = await client.register.metrics();
    const contentType = client.register.contentType;

    logTelemetry({
      metric: "metrics_endpoint_request",
      value: 1,
      unit: "count",
      tags: { contentType },
    });

    return new Response(metrics, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Metrics unavailable";
    logger.error("Metrics endpoint error", { error: message });

    return Response.json(
      {
        error: message,
        code: "METRICS_UNAVAILABLE",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sanitize a route path for metric labels.
 * Replaces dynamic segments with placeholders to keep cardinality bounded.
 */
function sanitizeRoute(path: string): string {
  // Normalize API paths — replace IDs with :id
  return path
    .replace(/\/api\/players\/[^/]+/, "/api/players/:id")
    .replace(/\/api\/agent\/ip-tracking\/[^/]+/, "/api/agent/ip-tracking/:ip")
    .replace(/\/api\/agent\/rules\/[^/]+/, "/api/agent/rules/:id")
    .replace(/\/api\/rules\/[^/]+/, "/api/rules/:id")
    .replace(/\/api\/vault\/secrets\/[^/]+/, "/api/vault/secrets/:key")
    .replace(/\/api\/telegram\/bot\/[^/]+\/stats/, "/api/telegram/bot/:botId/stats")
    .replace(/\/api\/export\/.*/, "/api/export/:path");
}

/**
 * Get the full Prometheus-compatible Content-Type header.
 */
export function getMetricsContentType(): string {
  return "text/plain; version=0.0.4; charset=utf-8";
}

// ---------------------------------------------------------------------------
// Backward compatibility — handleMetrics used by src/index.ts
// ---------------------------------------------------------------------------

export async function handleMetrics(): Promise<Response> {
  return serveMetricsEndpoint(new Request("http://localhost/metrics"));
}
