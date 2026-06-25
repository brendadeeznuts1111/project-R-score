/**
 * Player WebSocket Handler — Player Domain (Desert Rose: #d4a5a5)
 *
 * Handles WebSocket subscriptions for real-time player updates:
 *   - subscribe:player:<playerId>   — Subscribe to a specific player's updates
 *   - unsubscribe:player:<playerId> — Unsubscribe from player updates
 *
 * Broadcast format:
 *   { type: "player_update", provider: "players", data: {...} }
 *
 * Broadcast events:
 *   - wager_placed: New wager by tracked player
 *   - flag_added: New flag on tracked player
 *   - note_added: New staff note on tracked player
 *   - tier_changed: Risk tier change
 *   - balance_changed: Balance update
 */

import type { ServerWebSocket } from "bun";
import { createLogger } from "@utils/logger";
import { logPlayerFlag, logPlayerNote } from "@utils/tableLogger";
import type { WebSocketMessage } from "@utils/types";

const logger = createLogger("PlayersWS");

// ---------------------------------------------------------------------------
// Subscriber tracking: playerId -> Set<ws>
// ---------------------------------------------------------------------------

/** Map of playerId to set of subscribed WebSocket clients */
const playerSubscribers = new Map<string, Set<ServerWebSocket<unknown>>>();

/** Map of WebSocket to set of subscribed playerIds (for cleanup on disconnect) */
const wsSubscriptions = new Map<ServerWebSocket<unknown>, Set<string>>();

// ---------------------------------------------------------------------------
// Subscription management
// ---------------------------------------------------------------------------

/**
 * Subscribe a WebSocket client to updates for a specific player.
 */
export function subscribePlayer(
  ws: ServerWebSocket<unknown>,
  playerId: string
): void {
  // Add ws to player subscribers
  let subscribers = playerSubscribers.get(playerId);
  if (!subscribers) {
    subscribers = new Set();
    playerSubscribers.set(playerId, subscribers);
  }
  subscribers.add(ws);

  // Track playerId for this ws
  let playerIds = wsSubscriptions.get(ws);
  if (!playerIds) {
    playerIds = new Set();
    wsSubscriptions.set(ws, playerIds);
  }
  playerIds.add(playerId);

  logger.info(`WS client subscribed to player:${playerId} (subscribers: ${subscribers.size})`);

  // Send confirmation
  try {
    ws.send(
      JSON.stringify({
        type: "subscribed",
        provider: "players",
        data: { channel: `player:${playerId}`, subscriberCount: subscribers.size },
      } as WebSocketMessage)
    );
  } catch {
    // Client may have disconnected
  }
}

/**
 * Unsubscribe a WebSocket client from a specific player's updates.
 */
export function unsubscribePlayer(
  ws: ServerWebSocket<unknown>,
  playerId: string
): void {
  const subscribers = playerSubscribers.get(playerId);
  if (subscribers) {
    subscribers.delete(ws);
    if (subscribers.size === 0) {
      playerSubscribers.delete(playerId);
    }
  }

  const playerIds = wsSubscriptions.get(ws);
  if (playerIds) {
    playerIds.delete(playerId);
    if (playerIds.size === 0) {
      wsSubscriptions.delete(ws);
    }
  }

  logger.info(`WS client unsubscribed from player:${playerId}`);

  // Send confirmation
  try {
    ws.send(
      JSON.stringify({
        type: "unsubscribed",
        provider: "players",
        data: { channel: `player:${playerId}` },
      } as WebSocketMessage)
    );
  } catch {
    // Client may have disconnected
  }
}

/**
 * Remove all subscriptions for a WebSocket client (called on disconnect).
 */
export function removePlayerSubscriber(ws: ServerWebSocket<unknown>): void {
  const playerIds = wsSubscriptions.get(ws);
  if (playerIds) {
    for (const playerId of playerIds) {
      const subscribers = playerSubscribers.get(playerId);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          playerSubscribers.delete(playerId);
        }
      }
    }
    wsSubscriptions.delete(ws);
    logger.info(`WS client disconnected, removed ${playerIds.size} player subscriptions`);
  }
}

// ---------------------------------------------------------------------------
// Broadcasting
// ---------------------------------------------------------------------------

/**
 * Broadcast a player update to all subscribers of that player.
 * Format: { type: "player_update", provider: "players", data: {...} }
 */
export function broadcastPlayerUpdate(
  playerId: string,
  eventType: string,
  data: Record<string, unknown>
): void {
  const subscribers = playerSubscribers.get(playerId);
  if (!subscribers || subscribers.size === 0) return;

  const message: WebSocketMessage = {
    type: "player_update",
    provider: "players",
    data: {
      playerId,
      eventType,
      ...data,
      timestamp: Date.now(),
    },
  };

  const payload = JSON.stringify(message);
  const encoded = new TextEncoder().encode(payload);
  const deadSockets: ServerWebSocket<unknown>[] = [];

  for (const ws of subscribers) {
    try {
      ws.send(encoded);
    } catch {
      deadSockets.push(ws);
    }
  }

  // Clean up dead sockets
  for (const ws of deadSockets) {
    removePlayerSubscriber(ws);
  }

  if (deadSockets.length > 0) {
    logger.debug(`Cleaned up ${deadSockets.length} dead player subscribers`);
  }
}

// ---------------------------------------------------------------------------
// Convenience broadcast methods
// ---------------------------------------------------------------------------

/**
 * Broadcast that a player placed a new wager.
 */
export function broadcastWagerPlaced(
  playerId: string,
  wager: {
    wagerId: string;
    wagerNumber: string;
    sport: string;
    stake: number;
    odds: number;
    potentialPayout: number;
  }
): void {
  broadcastPlayerUpdate(playerId, "wager_placed", { wager });
  logger.info(`[WagerTicker] Broadcast wager_placed for player:${playerId}`);
}

/**
 * Broadcast that a flag was added to a player.
 */
export function broadcastFlagAdded(
  playerId: string,
  flag: {
    flagId: string;
    flagType: string;
    severity: string;
    title: string;
  }
): void {
  broadcastPlayerUpdate(playerId, "flag_added", { flag });
  logPlayerFlag({
    playerId,
    flagType: flag.flagType,
    severity: flag.severity,
    action: "create",
  });
}

/**
 * Broadcast that a note was added to a player.
 */
export function broadcastNoteAdded(
  playerId: string,
  note: {
    noteId: string;
    author: string;
    contentPreview: string;
  }
): void {
  broadcastPlayerUpdate(playerId, "note_added", { note });
  logPlayerNote({
    playerId,
    authorLogin: note.author,
    action: "create",
  });
}

/**
 * Broadcast that a player's risk tier changed.
 */
export function broadcastTierChanged(
  playerId: string,
  oldTier: string,
  newTier: string
): void {
  broadcastPlayerUpdate(playerId, "tier_changed", { oldTier, newTier });
  logger.info(`[PlayerRisk] Tier change broadcast: ${playerId} ${oldTier} -> ${newTier}`);
}

/**
 * Broadcast that a player's balance changed.
 */
export function broadcastBalanceChanged(
  playerId: string,
  oldBalance: number,
  newBalance: number
): void {
  broadcastPlayerUpdate(playerId, "balance_changed", {
    oldBalance,
    newBalance,
    delta: newBalance - oldBalance,
  });
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

/**
 * Process a player-related WebSocket message.
 * Returns true if the message was handled.
 *
 * Expected message formats:
 *   { type: "subscribe:player:<playerId>" }
 *   { type: "unsubscribe:player:<playerId>" }
 */
export function processPlayerWsMessage(
  ws: ServerWebSocket<unknown>,
  msgType: string,
  _msgData?: unknown
): boolean {
  // Handle subscribe:player:<playerId>
  if (msgType.startsWith("subscribe:player:")) {
    const playerId = msgType.slice("subscribe:player:".length);
    if (playerId) {
      subscribePlayer(ws, playerId);
    }
    return true;
  }

  // Handle unsubscribe:player:<playerId>
  if (msgType.startsWith("unsubscribe:player:")) {
    const playerId = msgType.slice("unsubscribe:player:".length);
    if (playerId) {
      unsubscribePlayer(ws, playerId);
    }
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Get the current subscriber counts for diagnostics.
 */
export function getPlayerSubscriberStats(): {
  totalPlayers: number;
  totalSubscriptions: number;
  players: Array<{ playerId: string; subscriberCount: number }>;
} {
  let totalSubscriptions = 0;
  const players: Array<{ playerId: string; subscriberCount: number }> = [];

  for (const [playerId, subscribers] of playerSubscribers.entries()) {
    totalSubscriptions += subscribers.size;
    players.push({ playerId, subscriberCount: subscribers.size });
  }

  return {
    totalPlayers: playerSubscribers.size,
    totalSubscriptions,
    players: players.sort((a, b) => b.subscriberCount - a.subscriberCount),
  };
}
