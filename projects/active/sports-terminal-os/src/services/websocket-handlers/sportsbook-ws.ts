/**
 * Sportsbook WebSocket Handler — Zone 1 (Ocean Depths)
 *
 * Handles WebSocket messages for sportsbook subscriptions:
 *   - subscribe:sportsbook   — Subscribe to sportsbook odds updates
 *   - unsubscribe:sportsbook — Unsubscribe from sportsbook updates
 *   - Broadcasts odds updates to subscribed clients
 *
 * Message format: { type: "sportsbook_odds_update", provider: "sportsbook", data: {...} }
 *
 * Depends on Zone 4 WebSocket infrastructure (wsClients, broadcastToWebSockets).
 */

import type { ServerWebSocket } from "bun";
import type { WebSocketClient, WebSocketMessage } from "@utils/types";
import { createLogger } from "@utils/logger";
import { logSportEvent, logMarketDepth } from "@utils/tableLogger";
import {
  listOdds,
  fetchBookHealth,
  getBestLines,
  getLineMovements,
  updateBookHealth,
  type OddsFilter,
  type MarketType,
} from "@services/sportsbook-service";

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger("SportsbookWS");

// ---------------------------------------------------------------------------
// Channel constants
// ---------------------------------------------------------------------------

const SPORTSBOOK_CHANNEL = "sportsbook";
const SPORTSBOOK_ODDS_UPDATE_TYPE = "sportsbook_odds_update";

// ---------------------------------------------------------------------------
// Subscription tracking (per-client)
// ---------------------------------------------------------------------------

/** Set of client IDs subscribed to sportsbook updates */
const subscribedClients = new Set<string>();

/** Per-client filter preferences */
const clientFilters = new Map<string, OddsFilter>();

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

/**
 * Handle incoming WebSocket messages related to sportsbook.
 * Called from the main WebSocket message handler in index.ts.
 */
export function handleSportsbookMessage(
  client: WebSocketClient,
  msg: WebSocketMessage,
  ws: ServerWebSocket<unknown>
): boolean {
  const msgType = String(msg.type || "");

  // Handle subscribe:sportsbook
  if (msgType === `subscribe:${SPORTSBOOK_CHANNEL}`) {
    subscribedClients.add(client.id);

    // Parse optional filter from message data
    const filterData = msg.data as Record<string, unknown> | undefined;
    if (filterData) {
      const filter: OddsFilter = {};
      if (filterData.sport) filter.sport = String(filterData.sport);
      if (filterData.bookId) filter.bookId = String(filterData.bookId);
      if (filterData.market) filter.market = String(filterData.market) as MarketType;
      clientFilters.set(client.id, filter);
    }

    logger.info(`Client ${client.id} subscribed to sportsbook`);

    // Send initial snapshot
    try {
      sendSnapshot(client, ws);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Snapshot error";
      logger.error(`[SportEvent] Snapshot failed for ${client.id}: ${message}`);
    }

    // Confirm subscription
    ws.send(JSON.stringify({
      type: "subscribed",
      channel: SPORTSBOOK_CHANNEL,
      timestamp: Date.now(),
    }));

    logSportEvent({
      sport: SPORTSBOOK_CHANNEL,
      status: "client_subscribed",
    });

    return true; // Message handled
  }

  // Handle unsubscribe:sportsbook
  if (msgType === `unsubscribe:${SPORTSBOOK_CHANNEL}`) {
    subscribedClients.delete(client.id);
    clientFilters.delete(client.id);

    logger.info(`Client ${client.id} unsubscribed from sportsbook`);

    ws.send(JSON.stringify({
      type: "unsubscribed",
      channel: SPORTSBOOK_CHANNEL,
      timestamp: Date.now(),
    }));

    return true; // Message handled
  }

  // Not a sportsbook message
  return false;
}

/**
 * Send initial snapshot to a newly subscribed client.
 */
function sendSnapshot(client: WebSocketClient, ws: ServerWebSocket<unknown>): void {
  const filter = clientFilters.get(client.id) || {};

  // Get current odds
  const oddsResult = listOdds({ ...filter, limit: 50 });

  // Get best lines
  const bestLines = getBestLines({
    sport: filter.sport,
    market: filter.market,
  });

  // Get recent movements
  const movements = getLineMovements({
    sport: filter.sport,
    bookId: filter.bookId,
    limit: 20,
  });

  // Get book health
  const health = fetchBookHealth();

  const snapshot = {
    type: SPORTSBOOK_ODDS_UPDATE_TYPE,
    provider: "sportsbook",
    data: {
      kind: "snapshot",
      odds: oddsResult.items,
      bestLines,
      movements,
      health,
      timestamp: Date.now(),
    },
  };

  ws.send(JSON.stringify(snapshot));

  logMarketDepth({
    eventId: "snapshot",
    market: filter.market || "all",
    book: filter.bookId || "all",
    lastUpdated: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Broadcast helpers
// ---------------------------------------------------------------------------

/**
 * Broadcast an odds update to all subscribed clients.
 * Filters the data per-client if they have filter preferences.
 */
export function broadcastOddsUpdate(data: unknown): void {
  if (subscribedClients.size === 0) return;

  const message = JSON.stringify({
    type: SPORTSBOOK_ODDS_UPDATE_TYPE,
    provider: "sportsbook",
    data,
  });

  // Get the global wsClients map from index.ts
  // We access it via the global module imports
  const wsClients = getGlobalWsClients();
  if (!wsClients) return;

  let sentCount = 0;

  for (const clientId of subscribedClients) {
    const client = wsClients.get(clientId);
    if (!client) {
      // Client disconnected, clean up
      subscribedClients.delete(clientId);
      clientFilters.delete(clientId);
      continue;
    }

    try {
      client.ws.send(message);
      sentCount++;
    } catch {
      // Client disconnected mid-send
      subscribedClients.delete(clientId);
      clientFilters.delete(clientId);
    }
  }

  logger.debug(`Broadcast odds update to ${sentCount} clients`);
}

/**
 * Broadcast a line movement to all subscribed clients.
 */
export function broadcastLineMovement(movement: {
  bookId: string;
  sport: string;
  eventId: string;
  market: string;
  oldOdds: number;
  newOdds: number;
  direction: string;
  timestamp: number;
}): void {
  broadcastOddsUpdate({
    kind: "line_movement",
    ...movement,
  });

  logMarketDepth({
    eventId: movement.eventId,
    market: movement.market,
    book: movement.bookId,
    lastUpdated: new Date(movement.timestamp).toISOString(),
  });
}

/**
 * Broadcast a health update to all subscribed clients.
 */
export function broadcastHealthUpdate(health: unknown): void {
  broadcastOddsUpdate({
    kind: "health_update",
    health,
    timestamp: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Client lifecycle
// ---------------------------------------------------------------------------

/**
 * Clean up subscriptions when a client disconnects.
 * Call this from the WebSocket close handler in index.ts.
 */
export function onClientDisconnect(clientId: string): void {
  if (subscribedClients.has(clientId)) {
    subscribedClients.delete(clientId);
    clientFilters.delete(clientId);
    logger.debug(`Cleaned up sportsbook subscription for ${clientId}`);
  }
}

// ---------------------------------------------------------------------------
// Access global wsClients from index.ts
// ---------------------------------------------------------------------------

let globalWsClients: Map<string, WebSocketClient> | null = null;

export function setWsClientsMap(map: Map<string, WebSocketClient>): void {
  globalWsClients = map;
}

function getGlobalWsClients(): Map<string, WebSocketClient> | null {
  if (globalWsClients) return globalWsClients;

  // Try to get from the module registry
  try {
    // @ts-ignore - dynamic access to index.ts exports
    const indexModule = import.meta.require?.("@/index.ts");
    if (indexModule?.wsClients) {
      globalWsClients = indexModule.wsClients as Map<string, WebSocketClient>;
      return globalWsClients;
    }
  } catch {
    // Module not available
  }

  return null;
}

// ---------------------------------------------------------------------------
// Periodic health check broadcaster (called by cron every 60s)
// ---------------------------------------------------------------------------

/**
 * Run book health checks and broadcast results.
 * This is called by the Zone 4 cron system every 60 seconds.
 */
export function runBookHealthChecks(): void {
  try {
    const health = fetchBookHealth();

    for (const book of health) {
      // Check if book is stale (> 60s since last check)
      const staleMs = Date.now() - book.lastCheck;
      if (staleMs > 60000) {
        // Book hasn't been checked recently — mark as degraded
        updateBookHealth(book.bookId, {
          latencyMs: book.latencyMs,
          success: false,
          error: `Stale health check (${Math.round(staleMs / 1000)}s)`,
        });
      }
    }

    broadcastHealthUpdate(health);

    logSportEvent({
      sport: "all",
      status: `health_broadcast_${health.length}_books`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Health check error";
    logger.error(`[SportEvent] runBookHealthChecks error: ${msg}`);
  }
}

// Track last cleanup run
let lastCleanupRun = 0;

/**
 * Periodic cleanup of stale subscriptions.
 */
export function cleanupStaleSubscriptions(): void {
  const now = Date.now();
  if (now - lastCleanupRun < 30000) return; // Max once per 30s
  lastCleanupRun = now;

  const wsClients = getGlobalWsClients();
  if (!wsClients) return;

  let cleaned = 0;
  for (const clientId of subscribedClients) {
    if (!wsClients.has(clientId)) {
      subscribedClients.delete(clientId);
      clientFilters.delete(clientId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} stale sportsbook subscriptions`);
  }
}
