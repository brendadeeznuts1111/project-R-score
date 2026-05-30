/**
 * Metrics Background Collector
 *
 * Periodically collects system and application metrics, updating
 * Prometheus gauges. Runs on a 15-second interval.
 *
 * Collected metrics:
 *   - Memory usage (rss, heapTotal, heapUsed, external)
 *   - WS connection count
 *   - SSE connection count
 *   - DB query timing (via wrapper)
 *
 * Never crashes the main process.
 */

import { createLogger } from "@utils/logger";
import { logTelemetry } from "@utils/tableLogger";
import {
  setMemoryUsage,
  setWsConnections,
  setSseConnections,
} from "@api/metrics";

const logger = createLogger("MetricsCollector");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const COLLECT_INTERVAL_MS = 15_000; // 15 seconds

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let collectInterval: Timer | null = null;
let isRunning = false;

/** External getter callbacks for connection counts */
let wsCountGetter: (() => number) | null = null;
let sseCountGetter: (() => number) | null = null;

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

async function collectMetrics(): Promise<void> {
  try {
    // Memory usage
    const mem = process.memoryUsage();
    await Promise.all([
      setMemoryUsage("rss", mem.rss),
      setMemoryUsage("heapTotal", mem.heapTotal),
      setMemoryUsage("heapUsed", mem.heapUsed),
      setMemoryUsage("external", mem.external),
    ]);

    // Connection counts (from external getters)
    if (wsCountGetter) {
      await setWsConnections(wsCountGetter());
    }
    if (sseCountGetter) {
      await setSseConnections(sseCountGetter());
    }

    // Log telemetry periodically (every 60s = every 4th collection)
    const now = Date.now();
    if (Math.floor(now / COLLECT_INTERVAL_MS) % 4 === 0) {
      logTelemetry({
        metric: "system_memory",
        value: Math.round(mem.rss / 1024 / 1024),
        unit: "MB",
        tags: {
          heapUsed: String(Math.round(mem.heapUsed / 1024 / 1024)),
          uptime: String(Math.floor(process.uptime())),
        },
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Metrics collection error: ${message}`);
    // Never throw — background services must not crash
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Start the background metrics collector.
 *
 * @param getWsCount — Callback that returns current WebSocket client count
 * @param getSseCount — Callback that returns current SSE client count
 */
export function startMetricsCollector(
  getWsCount: () => number,
  getSseCount: () => number
): void {
  if (isRunning) {
    logger.warn("Metrics collector already running");
    return;
  }

  wsCountGetter = getWsCount;
  sseCountGetter = getSseCount;
  isRunning = true;

  // Collect immediately on startup
  collectMetrics();

  collectInterval = setInterval(() => {
    collectMetrics();
  }, COLLECT_INTERVAL_MS);

  logger.info(`Metrics collector started (${COLLECT_INTERVAL_MS}ms interval)`);
}

/**
 * Stop the background metrics collector.
 */
export function stopMetricsCollector(): void {
  if (collectInterval) {
    clearInterval(collectInterval);
    collectInterval = null;
  }
  isRunning = false;
  wsCountGetter = null;
  sseCountGetter = null;
  logger.info("Metrics collector stopped");
}

/**
 * Get collector status for health checks.
 */
export function getMetricsCollectorStatus(): Record<string, unknown> {
  return {
    running: isRunning,
    intervalMs: COLLECT_INTERVAL_MS,
    wsCountAvailable: wsCountGetter !== null,
    sseCountAvailable: sseCountGetter !== null,
  };
}
