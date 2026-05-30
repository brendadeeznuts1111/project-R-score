/**
 * Risk WebSocket Handler
 *
 * Handles `subscribe:risk` messages for real-time risk updates.
 * Broadcasts position changes, enforcement actions, and violations
 * to all subscribed clients.
 *
 * Format: { type: "risk_update", provider: "risk", data: {...} }
 */

import type { ServerWebSocket } from "bun";
import { logRiskAlert, logPosition, logEnforcement, logViolation } from "@utils/tableLogger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WSClientData {
  clientId: string;
  subscribedChannels: Set<string>;
  connectedAt: number;
  userId?: string;
  role?: string;
}

interface RiskUpdateMessage {
  type: "risk_update";
  provider: "risk";
  data: Record<string, unknown>;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Client Registry
// ---------------------------------------------------------------------------

const riskClients = new Map<string, ServerWebSocket<WSClientData>>();

// ---------------------------------------------------------------------------
// Handler Functions
// ---------------------------------------------------------------------------

/**
 * Register a new WebSocket client for risk updates.
 */
export function registerRiskClient(ws: ServerWebSocket<WSClientData>): void {
  riskClients.set(ws.data.clientId, ws);
  logRiskAlert({
    alertType: "system_alert",
    severity: "INFO",
    source: "risk-ws",
    message: `Risk WS client registered: ${ws.data.clientId}`,
  });

  // Send initial welcome
  sendToClient(ws, {
    type: "risk_update",
    provider: "risk",
    data: { event: "subscribed", channel: "risk", clientId: ws.data.clientId },
    timestamp: Date.now(),
  });
}

/**
 * Unregister a WebSocket client.
 */
export function unregisterRiskClient(clientId: string): void {
  riskClients.delete(clientId);
  logRiskAlert({
    alertType: "system_alert",
    severity: "INFO",
    source: "risk-ws",
    message: `Risk WS client unregistered: ${clientId}`,
  });
}

/**
 * Handle incoming WebSocket messages for risk channel.
 */
export function handleRiskMessage(ws: ServerWebSocket<WSClientData>, message: Record<string, unknown>): void {
  const msgType = message.type as string;

  try {
    switch (msgType) {
      case "subscribe:risk": {
        ws.data.subscribedChannels.add("risk");
        sendToClient(ws, {
          type: "risk_update",
          provider: "risk",
          data: { event: "subscribed", channel: "risk" },
          timestamp: Date.now(),
        });
        break;
      }

      case "unsubscribe:risk": {
        ws.data.subscribedChannels.delete("risk");
        sendToClient(ws, {
          type: "risk_update",
          provider: "risk",
          data: { event: "unsubscribed", channel: "risk" },
          timestamp: Date.now(),
        });
        break;
      }

      case "ping": {
        sendToClient(ws, {
          type: "risk_update",
          provider: "risk",
          data: { event: "pong" },
          timestamp: Date.now(),
        });
        break;
      }

      case "request:dashboard": {
        // Client is requesting a dashboard refresh — can trigger server fetch
        broadcastToRiskClients({
          event: "dashboard_refresh_requested",
          clientId: ws.data.clientId,
        });
        break;
      }

      default: {
        sendToClient(ws, {
          type: "risk_update",
          provider: "risk",
          data: { event: "error", message: `Unknown message type: ${msgType}` },
          timestamp: Date.now(),
        });
      }
    }
  } catch (err: any) {
    logRiskAlert({
      alertType: "system_alert",
      severity: "MEDIUM",
      source: "risk-ws",
      message: `Error handling risk WS message: ${err.message}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Broadcast Functions
// ---------------------------------------------------------------------------

/**
 * Broadcast a position change event to all risk subscribers.
 */
export function broadcastPositionChange(positionData: {
  positionId: string;
  agentLogin: string;
  sport: string;
  eventId: string;
  riskTier: string;
  status: string;
  totalExposure: number;
  action: "created" | "updated" | "expired" | "closed";
}): void {
  logPosition({
    positionId: positionData.positionId,
    agentLogin: positionData.agentLogin,
    sport: positionData.sport,
    eventId: positionData.eventId,
    exposure: positionData.totalExposure,
    status: positionData.status,
    action: positionData.action,
  });

  broadcastToRiskClients({
    event: "position_change",
    ...positionData,
  });
}

/**
 * Broadcast an enforcement action to all risk subscribers.
 */
export function broadcastEnforcement(enforcementData: {
  playerId: string;
  actionType: string;
  status: string;
  appliedBy?: string;
  reason?: string;
  previousLimit?: number;
  newLimit?: number;
}): void {
  logEnforcement({
    playerId: enforcementData.playerId,
    action: enforcementData.actionType,
    reason: enforcementData.reason,
  });

  broadcastToRiskClients({
    event: "enforcement_action",
    ...enforcementData,
  });
}

/**
 * Broadcast a violation detection to all risk subscribers.
 */
export function broadcastViolation(violationData: {
  violationId: string;
  playerId: string;
  wagerId: string;
  severity: string;
  violationType: string;
  description: string;
}): void {
  logViolation({
    violationId: violationData.violationId,
    wagerId: violationData.wagerId,
    playerId: violationData.playerId,
    violationType: violationData.violationType,
    severity: violationData.severity,
  });

  broadcastToRiskClients({
    event: "violation_detected",
    ...violationData,
  });
}

/**
 * Broadcast a risk alert to all risk subscribers.
 */
export function broadcastRiskAlert(alertData: {
  severity: string;
  title: string;
  message: string;
  playerId?: string;
  agentLogin?: string;
  wagerId?: string;
}): void {
  logRiskAlert({
    alertType: "risk_alert",
    severity: alertData.severity as "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    source: "risk-ws",
    entityType: "player",
    entityId: alertData.playerId,
    message: alertData.message,
  });

  broadcastToRiskClients({
    event: "risk_alert",
    ...alertData,
    timestamp: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function sendToClient(ws: ServerWebSocket<WSClientData>, message: RiskUpdateMessage): void {
  try {
    ws.send(JSON.stringify(message));
  } catch (err: any) {
    // Client disconnected
    riskClients.delete(ws.data.clientId);
  }
}

function broadcastToRiskClients(data: Record<string, unknown>): void {
  const message: RiskUpdateMessage = {
    type: "risk_update",
    provider: "risk",
    data,
    timestamp: Date.now(),
  };

  const payload = JSON.stringify(message);
  let sent = 0;

  for (const [clientId, ws] of riskClients) {
    if (ws.data.subscribedChannels.has("risk") && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
        sent++;
      } catch {
        riskClients.delete(clientId);
      }
    }
  }

  // Log only if significant or for monitoring
  if ((data.severity as string) === "CRITICAL" || (data.severity as string) === "HIGH") {
    logRiskAlert({
      alertType: "system_alert",
      severity: "INFO",
      source: "risk-ws",
      message: `Broadcast sent to ${sent} clients: ${data.event || "update"}`,
    });
  }
}

/** Get current risk subscriber count for monitoring */
export function getRiskSubscriberCount(): number {
  let count = 0;
  for (const [, ws] of riskClients) {
    if (ws.data.subscribedChannels.has("risk")) count++;
  }
  return count;
}

/** Get full WebSocket stats for health checks */
export function getRiskWSStats(): {
  totalClients: number;
  riskSubscribers: number;
  uptimeSeconds: number;
} {
  return {
    totalClients: riskClients.size,
    riskSubscribers: getRiskSubscriberCount(),
    uptimeSeconds: Math.floor(Date.now() / 1000),
  };
}
