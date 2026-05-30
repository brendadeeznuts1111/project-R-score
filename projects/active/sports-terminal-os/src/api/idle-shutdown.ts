/**
 * Idle Shutdown Timer
 *
 * Monitors active WebSocket and SSE connections. When no connections
 * exist for IDLE_TIMEOUT_MS (default 5 minutes), triggers a graceful
 * shutdown to conserve resources.
 *
 * Activation: Only when ENABLE_IDLE_SHUTDOWN=true (default: false for safety).
 *
 * Behavior:
 *   - Timer resets on each new WS/SSE connection
 *   - Timer is cancelled when at least one connection is active
 *   - Graceful shutdown closes all connections before exiting
 */

import { createLogger } from "@utils/logger";
import { logHealth } from "@utils/tableLogger";

const logger = createLogger("Idle");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const IDLE_TIMEOUT_MS = Number(process.env.IDLE_TIMEOUT_MS) || 300_000;
const ENABLE_IDLE_SHUTDOWN = process.env.ENABLE_IDLE_SHUTDOWN === "true";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let idleTimeout: ReturnType<typeof setTimeout> | null = null;
let lastActivityTime = Date.now();
let wsConnectionCount = 0;
let sseConnectionCount = 0;
let isShutdownActive = false;

/** Callback registered for graceful shutdown */
let shutdownCallback: (() => void) | null = null;

// ---------------------------------------------------------------------------
// Activity tracking
// ---------------------------------------------------------------------------

/**
 * Register the shutdown callback. Called once during server startup.
 */
export function registerShutdownCallback(cb: () => void): void {
  shutdownCallback = cb;
}

/**
 * Record that activity has occurred — resets the idle timer.
 */
export function recordActivity(): void {
  lastActivityTime = Date.now();

  if (!ENABLE_IDLE_SHUTDOWN || isShutdownActive) return;

  // Cancel any pending idle timeout since there was activity
  if (idleTimeout) {
    clearTimeout(idleTimeout);
    idleTimeout = null;
  }

  // Only restart the timer if there are NO active connections
  if (wsConnectionCount === 0 && sseConnectionCount === 0) {
    startIdleTimer();
  }
}

/**
 * Called when a WebSocket connection is opened.
 */
export function onWsConnectionOpen(): void {
  wsConnectionCount++;
  lastActivityTime = Date.now();
  cancelIdleTimer();
  logger.debug(`WS connection opened (active: ${wsConnectionCount})`);
}

/**
 * Called when a WebSocket connection is closed.
 */
export function onWsConnectionClose(): void {
  wsConnectionCount = Math.max(0, wsConnectionCount - 1);
  lastActivityTime = Date.now();
  logger.debug(`WS connection closed (active: ${wsConnectionCount})`);

  checkAndStartTimer();
}

/**
 * Called when an SSE connection is opened.
 */
export function onSseConnectionOpen(): void {
  sseConnectionCount++;
  lastActivityTime = Date.now();
  cancelIdleTimer();
  logger.debug(`SSE connection opened (active: ${sseConnectionCount})`);
}

/**
 * Called when an SSE connection is closed.
 */
export function onSseConnectionClose(): void {
  sseConnectionCount = Math.max(0, sseConnectionCount - 1);
  lastActivityTime = Date.now();
  logger.debug(`SSE connection closed (active: ${sseConnectionCount})`);

  checkAndStartTimer();
}

// ---------------------------------------------------------------------------
// Timer management
// ---------------------------------------------------------------------------

function hasActiveConnections(): boolean {
  return wsConnectionCount > 0 || sseConnectionCount > 0;
}

function cancelIdleTimer(): void {
  if (idleTimeout) {
    clearTimeout(idleTimeout);
    idleTimeout = null;
  }
}

function checkAndStartTimer(): void {
  if (!ENABLE_IDLE_SHUTDOWN || isShutdownActive) return;

  if (!hasActiveConnections()) {
    startIdleTimer();
  }
}

function startIdleTimer(): void {
  if (idleTimeout) return; // Already running
  if (IDLE_TIMEOUT_MS <= 0) return; // Disabled via config

  logger.info(`Idle timer started (${IDLE_TIMEOUT_MS}ms until shutdown)`);

  idleTimeout = setTimeout(() => {
    const idleMs = Date.now() - lastActivityTime;

    if (idleMs >= IDLE_TIMEOUT_MS && !hasActiveConnections()) {
      triggerShutdown("idle_timeout", {
        idleMs,
        thresholdMs: IDLE_TIMEOUT_MS,
        lastActivity: new Date(lastActivityTime).toISOString(),
      });
    } else {
      // Conditions changed — maybe a connection came in just after timer fired
      logger.debug(`Idle timer fired but conditions changed, aborting shutdown`);
      idleTimeout = null;
      checkAndStartTimer();
    }
  }, IDLE_TIMEOUT_MS);
}

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------

function triggerShutdown(
  reason: string,
  context: Record<string, unknown>
): void {
  if (isShutdownActive) return;
  isShutdownActive = true;

  logger.info(`Idle shutdown triggered: ${reason}`, context);

  const idleMs = Date.now() - lastActivityTime;

  logHealth({
    component: "IdleShutdown",
    status: "shutting_down",
    uptimeMs: idleMs,
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    activeConnections: wsConnectionCount + sseConnectionCount,
    totalRequests: 0,
  });

  if (shutdownCallback) {
    try {
      shutdownCallback();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Shutdown callback error: ${message}`);
      // Force exit if graceful shutdown fails
      setTimeout(() => process.exit(0), 5000);
    }
  } else {
    logger.warn("No shutdown callback registered — forcing exit");
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// Status query
// ---------------------------------------------------------------------------

/**
 * Get current idle shutdown status for health checks.
 */
export function getIdleStatus(): Record<string, unknown> {
  return {
    enabled: ENABLE_IDLE_SHUTDOWN,
    idleTimeoutMs: IDLE_TIMEOUT_MS,
    active: idleTimeout !== null,
    wsConnections: wsConnectionCount,
    sseConnections: sseConnectionCount,
    totalConnections: wsConnectionCount + sseConnectionCount,
    lastActivityAt: new Date(lastActivityTime).toISOString(),
    idleForMs: Date.now() - lastActivityTime,
    isShutdownActive,
  };
}

/**
 * Initialize the idle shutdown system. Called once at server startup.
 */
export function initIdleShutdown(): void {
  if (!ENABLE_IDLE_SHUTDOWN) {
    logger.info("Idle shutdown disabled (ENABLE_IDLE_SHUTDOWN != true)");
    return;
  }

  logger.info(`Idle shutdown initialized (${IDLE_TIMEOUT_MS}ms timeout)`);

  // Start the timer if there are no connections at boot
  if (!hasActiveConnections()) {
    startIdleTimer();
  }
}

/**
 * Reset the idle shutdown state. Useful for testing.
 */
export function resetIdleShutdown(): void {
  cancelIdleTimer();
  wsConnectionCount = 0;
  sseConnectionCount = 0;
  isShutdownActive = false;
  lastActivityTime = Date.now();
}


