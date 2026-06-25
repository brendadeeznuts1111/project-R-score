/**
 * Agent WebSocket Handler — Agent Domain (Sunset Boulevard: #e76f51)
 *
 * Handles WebSocket messages for agent subscriptions:
 *   - subscribe:agent:{agentLogin}  — Subscribe to agent updates
 *   - unsubscribe:agent:{agentLogin} — Unsubscribe
 *   - subscribe:agents             — Subscribe to all agent events
 *
 * Broadcasts:
 *   - { type: "agent_update", provider: "agents", data: {...} }
 *   - { type: "hierarchy_change", provider: "agents", data: {...} }
 *   - { type: "performance_update", provider: "agents", data: {...} }
 *   - { type: "new_player", provider: "agents", data: {...} }
 *
 * Depends on Zone 4 WebSocket infrastructure.
 */

import type { ServerWebSocket } from "bun";
import type { WebSocketClient, WebSocketMessage } from "@utils/types";
import { createLogger } from "@utils/logger";
import { logAgent, logAgentAction } from "@utils/tableLogger";
import {
  getAgentByLogin,
  getAgentHierarchy,
  getAgentPerformance,
  getAgentPlayers,
  getAgentDownline,
  type AgentNode,
  type AgentPerformance,
} from "@services/agent-service";

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = createLogger("AgentWS");

// ---------------------------------------------------------------------------
// Channel constants
// ---------------------------------------------------------------------------

const AGENT_CHANNEL_PREFIX = "agent:";
const AGENTS_CHANNEL = "agents";
const AGENT_UPDATE_TYPE = "agent_update";
const HIERARCHY_CHANGE_TYPE = "hierarchy_change";
const PERFORMANCE_UPDATE_TYPE = "performance_update";
const NEW_PLAYER_TYPE = "new_player";

// ---------------------------------------------------------------------------
// Subscription tracking
// ---------------------------------------------------------------------------

/** Map of clientId -> Set of subscribed agent logins */
const agentSubscriptions = new Map<string, Set<string>>();

/** Set of clients subscribed to all agent events */
const globalSubscribers = new Set<string>();

/** Per-client: last snapshot to avoid duplicate broadcasts */
const lastSnapshots = new Map<string, string>();

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

export function handleAgentMessage(
  client: WebSocketClient,
  msg: WebSocketMessage,
  ws: ServerWebSocket<unknown>,
): boolean {
  const msgType = String(msg.type || "");

  // Handle subscribe:agent:{agentLogin}
  if (msgType.startsWith(`subscribe:${AGENT_CHANNEL_PREFIX}`)) {
    const agentLogin = msgType.slice(`subscribe:${AGENT_CHANNEL_PREFIX}`.length);
    if (!agentLogin) return false;

    // Add subscription
    if (!agentSubscriptions.has(client.id)) {
      agentSubscriptions.set(client.id, new Set());
    }
    agentSubscriptions.get(client.id)!.add(agentLogin);

    logger.info(`Client ${client.id} subscribed to agent:${agentLogin}`);

    // Send initial snapshot
    try {
      sendAgentSnapshot(client, ws, agentLogin);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Snapshot error";
      logger.error(`[AgentHierarchy] Snapshot failed for ${client.id}: ${message}`);
    }

    // Confirm subscription
    ws.send(JSON.stringify({
      type: "subscribed",
      channel: `${AGENT_CHANNEL_PREFIX}${agentLogin}`,
      timestamp: Date.now(),
    }));

    return true;
  }

  // Handle unsubscribe:agent:{agentLogin}
  if (msgType.startsWith(`unsubscribe:${AGENT_CHANNEL_PREFIX}`)) {
    const agentLogin = msgType.slice(`unsubscribe:${AGENT_CHANNEL_PREFIX}`.length);
    if (!agentLogin) return false;

    agentSubscriptions.get(client.id)?.delete(agentLogin);
    logger.info(`Client ${client.id} unsubscribed from agent:${agentLogin}`);

    ws.send(JSON.stringify({
      type: "unsubscribed",
      channel: `${AGENT_CHANNEL_PREFIX}${agentLogin}`,
      timestamp: Date.now(),
    }));

    return true;
  }

  // Handle subscribe:agents (global)
  if (msgType === `subscribe:${AGENTS_CHANNEL}`) {
    globalSubscribers.add(client.id);
    logger.info(`Client ${client.id} subscribed to global agents channel`);

    ws.send(JSON.stringify({
      type: "subscribed",
      channel: AGENTS_CHANNEL,
      timestamp: Date.now(),
    }));

    return true;
  }

  // Handle unsubscribe:agents
  if (msgType === `unsubscribe:${AGENTS_CHANNEL}`) {
    globalSubscribers.delete(client.id);
    logger.info(`Client ${client.id} unsubscribed from global agents channel`);

    ws.send(JSON.stringify({
      type: "unsubscribed",
      channel: AGENTS_CHANNEL,
      timestamp: Date.now(),
    }));

    return true;
  }

  // Not an agent message
  return false;
}

// ---------------------------------------------------------------------------
// Snapshot helpers
// ---------------------------------------------------------------------------

function sendAgentSnapshot(client: WebSocketClient, ws: ServerWebSocket<unknown>, agentLogin: string): void {
  const agent = getAgentByLogin(agentLogin);
  if (!agent) {
    ws.send(JSON.stringify({
      type: "error",
      source: "agents",
      message: `Agent not found: ${agentLogin}`,
      code: "NOT_FOUND",
    }));
    return;
  }

  // Get hierarchy for this agent
  const hierarchy = getAgentHierarchy(agentLogin);

  // Get performance
  const performance = getAgentPerformance(agentLogin, "today");

  // Get players
  const players = getAgentPlayers(agentLogin);

  // Get downline
  const downline = getAgentDownline(agentLogin);

  const snapshot = {
    type: AGENT_UPDATE_TYPE,
    provider: "agents",
    data: {
      kind: "snapshot",
      agent,
      hierarchy,
      performance,
      players: players.players.slice(0, 20),
      playerCount: players.total,
      downline: {
        directCount: downline.direct.length,
        totalCount: downline.all.length,
      },
      timestamp: Date.now(),
    },
  };

  ws.send(JSON.stringify(snapshot));

  // Store hash to detect changes
  lastSnapshots.set(`${client.id}:${agentLogin}`, JSON.stringify(snapshot.data));
}

// ---------------------------------------------------------------------------
// Broadcast helpers
// ---------------------------------------------------------------------------

/**
 * Broadcast an agent update to all relevant subscribers.
 */
export function broadcastAgentUpdate(agentLogin: string, updateType: string, data: unknown): void {
  const message = JSON.stringify({
    type: AGENT_UPDATE_TYPE,
    provider: "agents",
    data: {
      kind: updateType,
      agentLogin,
      ...data as Record<string, unknown>,
      timestamp: Date.now(),
    },
  });

  const wsClients = getGlobalWsClients();
  if (!wsClients) return;

  let sentCount = 0;

  // Send to specific agent subscribers
  for (const [clientId, subscriptions] of agentSubscriptions) {
    if (subscriptions.has(agentLogin) || subscriptions.has("*")) {
      const client = wsClients.get(clientId);
      if (!client) {
        agentSubscriptions.delete(clientId);
        continue;
      }

      try {
        client.ws.send(message);
        sentCount++;
      } catch {
        agentSubscriptions.delete(clientId);
      }
    }
  }

  // Send to global subscribers
  for (const clientId of globalSubscribers) {
    const client = wsClients.get(clientId);
    if (!client) {
      globalSubscribers.delete(clientId);
      continue;
    }

    try {
      client.ws.send(message);
      sentCount++;
    } catch {
      globalSubscribers.delete(clientId);
    }
  }

  logger.debug(`Broadcast agent update to ${sentCount} clients`);
}

/**
 * Broadcast hierarchy change event.
 */
export function broadcastHierarchyChange(agentLogin: string, changeType: string, details?: Record<string, unknown>): void {
  const message = JSON.stringify({
    type: HIERARCHY_CHANGE_TYPE,
    provider: "agents",
    data: {
      agentLogin,
      changeType,
      ...details,
      timestamp: Date.now(),
    },
  });

  const wsClients = getGlobalWsClients();
  if (!wsClients) return;

  for (const clientId of globalSubscribers) {
    const client = wsClients.get(clientId);
    if (!client) {
      globalSubscribers.delete(clientId);
      continue;
    }
    try {
      client.ws.send(message);
    } catch {
      globalSubscribers.delete(clientId);
    }
  }

  logAgent({ agentLogin, action: `hierarchy_${changeType}` });
}

/**
 * Broadcast performance update.
 */
export function broadcastPerformanceUpdate(agentLogin: string, performance: AgentPerformance): void {
  const message = JSON.stringify({
    type: PERFORMANCE_UPDATE_TYPE,
    provider: "agents",
    data: {
      agentLogin,
      performance,
      timestamp: Date.now(),
    },
  });

  const wsClients = getGlobalWsClients();
  if (!wsClients) return;

  let sentCount = 0;
  for (const [clientId, subscriptions] of agentSubscriptions) {
    if (subscriptions.has(agentLogin)) {
      const client = wsClients.get(clientId);
      if (!client) {
        agentSubscriptions.delete(clientId);
        continue;
      }
      try {
        client.ws.send(message);
        sentCount++;
      } catch {
        agentSubscriptions.delete(clientId);
      }
    }
  }

  for (const clientId of globalSubscribers) {
    const client = wsClients.get(clientId);
    if (!client) {
      globalSubscribers.delete(clientId);
      continue;
    }
    try {
      client.ws.send(message);
      sentCount++;
    } catch {
      globalSubscribers.delete(clientId);
    }
  }

  logger.debug(`Broadcast performance update to ${sentCount} clients`);
}

/**
 * Broadcast new player assignment.
 */
export function broadcastNewPlayer(agentLogin: string, playerData: Record<string, unknown>): void {
  const message = JSON.stringify({
    type: NEW_PLAYER_TYPE,
    provider: "agents",
    data: {
      agentLogin,
      player: playerData,
      timestamp: Date.now(),
    },
  });

  const wsClients = getGlobalWsClients();
  if (!wsClients) return;

  for (const [clientId, subscriptions] of agentSubscriptions) {
    if (subscriptions.has(agentLogin)) {
      const client = wsClients.get(clientId);
      if (!client) {
        agentSubscriptions.delete(clientId);
        continue;
      }
      try {
        client.ws.send(message);
      } catch {
        agentSubscriptions.delete(clientId);
      }
    }
  }

  for (const clientId of globalSubscribers) {
    const client = wsClients.get(clientId);
    if (!client) {
      globalSubscribers.delete(clientId);
      continue;
    }
    try {
      client.ws.send(message);
    } catch {
      globalSubscribers.delete(clientId);
    }
  }

  logAgentAction({ agentLogin, actionType: "player_assigned", targetPlayerId: playerData.playerId as string });
}

// ---------------------------------------------------------------------------
// Client lifecycle
// ---------------------------------------------------------------------------

export function onClientDisconnect(clientId: string): void {
  const hadAgentSubs = agentSubscriptions.has(clientId);
  const hadGlobal = globalSubscribers.has(clientId);

  if (hadAgentSubs) {
    agentSubscriptions.delete(clientId);
  }
  if (hadGlobal) {
    globalSubscribers.delete(clientId);
  }

  // Clean up snapshots
  for (const key of lastSnapshots.keys()) {
    if (key.startsWith(`${clientId}:`)) {
      lastSnapshots.delete(key);
    }
  }

  if (hadAgentSubs || hadGlobal) {
    logger.debug(`Cleaned up agent subscriptions for ${clientId}`);
  }
}

// ---------------------------------------------------------------------------
// Access global wsClients from index.ts
// ---------------------------------------------------------------------------

let globalWsClients: Map<string, WebSocketClient> | null = null;

export function setAgentWsClientsMap(map: Map<string, WebSocketClient>): void {
  globalWsClients = map;
}

function getGlobalWsClients(): Map<string, WebSocketClient> | null {
  if (globalWsClients) return globalWsClients;

  try {
    // @ts-ignore - dynamic access
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
// Periodic sync broadcaster (called by cron)
// ---------------------------------------------------------------------------

let lastSyncBroadcast = 0;

/**
 * Run periodic agent sync check and broadcast updates.
 * Called by the Zone 4 cron system.
 */
export function runAgentSyncBroadcast(): void {
  const now = Date.now();
  if (now - lastSyncBroadcast < 60000) return; // Max once per 60s
  lastSyncBroadcast = now;

  try {
    broadcastAgentUpdate("*", "sync_heartbeat", { syncedAt: Math.floor(now / 1000) });
    logger.debug("Agent sync heartbeat broadcast");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Broadcast error";
    logger.error(`[AgentHierarchy] runAgentSyncBroadcast error: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Cleanup stale subscriptions
// ---------------------------------------------------------------------------

let lastCleanupRun = 0;

export function cleanupStaleAgentSubscriptions(): void {
  const now = Date.now();
  if (now - lastCleanupRun < 30000) return;
  lastCleanupRun = now;

  const wsClients = getGlobalWsClients();
  if (!wsClients) return;

  let cleaned = 0;
  for (const clientId of agentSubscriptions.keys()) {
    if (!wsClients.has(clientId)) {
      agentSubscriptions.delete(clientId);
      cleaned++;
    }
  }
  for (const clientId of globalSubscribers) {
    if (!wsClients.has(clientId)) {
      globalSubscribers.delete(clientId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} stale agent subscriptions`);
  }
}
