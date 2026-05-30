/**
 * Pattern WebSocket Handler — Zone 2 (Golden Hour)
 *
 * Handles WebSocket subscriptions for real-time pattern detection:
 *   - subscribe:patterns   — Subscribe to pattern detection stream
 *   - unsubscribe:patterns — Unsubscribe from pattern detection stream
 *   - Broadcasts detected patterns in real-time
 *
 * Message format: { type: "pattern_detected", provider: "patterns", data: {...} }
 */

import type { ServerWebSocket } from "bun";
import { detectPatterns } from "@services/pattern-service";
import { logPlugin } from "@utils/tableLogger";
import { createLogger } from "@utils/logger";
import type { WebSocketMessage } from "@utils/types";

const logger = createLogger("PatternsWS");

// ---------------------------------------------------------------------------
// Subscriber tracking
// ---------------------------------------------------------------------------

/** Set of WebSocket instances subscribed to pattern updates */
const patternSubscribers = new Set<ServerWebSocket<unknown>>();

/** Interval handle for periodic pattern broadcasting */
let broadcastInterval: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Subscription management
// ---------------------------------------------------------------------------

/**
 * Subscribe a WebSocket client to pattern detection updates.
 */
export function subscribePatterns(ws: ServerWebSocket<unknown>): void {
  patternSubscribers.add(ws);
  logger.info(`Client subscribed to patterns (total: ${patternSubscribers.size})`);

  // Send confirmation
  try {
    ws.send(
      JSON.stringify({
        type: "subscribed",
        provider: "patterns",
        data: { channel: "patterns", subscriberCount: patternSubscribers.size },
      })
    );
  } catch {
    // Client may have disconnected
  }

  // Start broadcaster if first subscriber
  if (patternSubscribers.size === 1) {
    startPatternBroadcaster();
  }
}

/**
 * Unsubscribe a WebSocket client from pattern detection updates.
 */
export function unsubscribePatterns(ws: ServerWebSocket<unknown>): void {
  patternSubscribers.delete(ws);
  logger.info(`Client unsubscribed from patterns (total: ${patternSubscribers.size})`);

  // Stop broadcaster if no subscribers
  if (patternSubscribers.size === 0) {
    stopPatternBroadcaster();
  }
}

/**
 * Remove a subscriber (called on disconnect).
 */
export function removePatternSubscriber(ws: ServerWebSocket<unknown>): void {
  if (patternSubscribers.has(ws)) {
    unsubscribePatterns(ws);
  }
}

// ---------------------------------------------------------------------------
// Broadcasting
// ---------------------------------------------------------------------------

/**
 * Start the periodic pattern detection broadcaster.
 * Runs every 15 seconds to detect and broadcast new patterns.
 */
function startPatternBroadcaster(): void {
  if (broadcastInterval) return;

  logger.info("[PluginExecution] Starting pattern broadcaster");
  logPlugin({ plugin: "PatternsWS", method: "startBroadcaster" });

  // Run immediately then every 15 seconds
  runPatternDetection();
  broadcastInterval = setInterval(runPatternDetection, 15000);
}

/**
 * Stop the pattern broadcaster.
 */
function stopPatternBroadcaster(): void {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
    logger.info("[PluginExecution] Pattern broadcaster stopped");
    logPlugin({ plugin: "PatternsWS", method: "stopBroadcaster" });
  }
}

/**
 * Run pattern detection and broadcast results to subscribers.
 */
function runPatternDetection(): void {
  if (patternSubscribers.size === 0) return;

  try {
    const patterns = detectPatterns({ limit: 20 });

    if (patterns.length === 0) return;

    const message: WebSocketMessage = {
      type: "pattern_detected",
      provider: "patterns",
      data: {
        patterns,
        timestamp: Date.now(),
        count: patterns.length,
      },
    };

    broadcastToPatternSubscribers(message);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[PluginExecution] Pattern detection broadcast failed: ${msg}`);
    logPlugin({ plugin: "PatternsWS", method: "runPatternDetection", error: msg });
  }
}

/**
 * Broadcast a message to all pattern subscribers.
 */
export function broadcastToPatternSubscribers(message: WebSocketMessage): void {
  const payload = JSON.stringify(message);
  const data = new TextEncoder().encode(payload);
  const deadSockets: ServerWebSocket<unknown>[] = [];

  for (const ws of patternSubscribers) {
    try {
      ws.send(data);
    } catch {
      // Mark for cleanup
      deadSockets.push(ws);
    }
  }

  // Clean up dead sockets
  for (const ws of deadSockets) {
    patternSubscribers.delete(ws);
  }

  if (deadSockets.length > 0) {
    logger.debug(`Cleaned up ${deadSockets.length} dead pattern subscribers`);
  }

  // Stop if no more subscribers
  if (patternSubscribers.size === 0) {
    stopPatternBroadcaster();
  }
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

/**
 * Process a pattern-related WebSocket message.
 * Returns true if the message was handled.
 */
export function processPatternWsMessage(
  ws: ServerWebSocket<unknown>,
  msgType: string,
  msgData: unknown
): boolean {
  switch (msgType) {
    case "subscribe:patterns": {
      subscribePatterns(ws);
      return true;
    }

    case "unsubscribe:patterns": {
      unsubscribePatterns(ws);
      return true;
    }

    case "pattern:refresh": {
      // Client requesting immediate refresh
      try {
        const patterns = detectPatterns({ limit: 20 });
        const message: WebSocketMessage = {
          type: "pattern_detected",
          provider: "patterns",
          data: { patterns, timestamp: Date.now(), count: patterns.length },
        };
        ws.send(JSON.stringify(message));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        ws.send(
          JSON.stringify({
            type: "error",
            provider: "patterns",
            data: { error: msg },
          })
        );
      }
      return true;
    }

    default:
      return false;
  }
}

/**
 * Get the current subscriber count.
 */
export function getPatternSubscriberCount(): number {
  return patternSubscribers.size;
}
