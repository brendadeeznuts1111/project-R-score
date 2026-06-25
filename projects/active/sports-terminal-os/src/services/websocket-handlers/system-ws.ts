/**
 * System WebSocket Handler
 *
 * Handles `subscribe:system` messages for system-level events.
 * Broadcasts: cron completions, errors, config changes, health alerts.
 *
 * Format: { type: "system_event", provider: "system", data: {...} }
 *
 * Provides real-time operational visibility for the command center.
 */

import type { ServerWebSocket } from "bun";
import { logHealth, logCron } from "@utils/tableLogger";

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

interface SystemEventMessage {
  type: "system_event";
  provider: "system";
  data: Record<string, unknown>;
  timestamp: number;
}

export type SystemEventType =
  | "cron_complete"
  | "cron_error"
  | "config_change"
  | "health_alert"
  | "export_complete"
  | "sandbox_complete"
  | "ip_flagged"
  | "denylist_update"
  | "migration_applied"
  | "shutdown_warning";

interface SystemEventPayload {
  eventType: SystemEventType;
  severity?: "info" | "warning" | "error" | "critical";
  message: string;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Client Registry
// ---------------------------------------------------------------------------

const systemClients = new Map<string, ServerWebSocket<WSClientData>>();

// ---------------------------------------------------------------------------
// Handler Functions
// ---------------------------------------------------------------------------

/**
 * Register a new WebSocket client for system events.
 */
export function registerSystemClient(ws: ServerWebSocket<WSClientData>): void {
  systemClients.set(ws.data.clientId, ws);
  logHealth({
    component: "WebSocket",
    status: "connected",
    activeConnections: systemClients.size,
  });

  // Send initial welcome
  sendToClient(ws, {
    type: "system_event",
    provider: "system",
    data: {
      eventType: "subscribed",
      channel: "system",
      clientId: ws.data.clientId,
      activeConnections: systemClients.size,
    },
    timestamp: Date.now(),
  });
}

/**
 * Unregister a WebSocket client.
 */
export function unregisterSystemClient(clientId: string): void {
  systemClients.delete(clientId);
  logHealth({
    component: "WebSocket",
    status: "disconnected",
    activeConnections: systemClients.size,
  });
}

/**
 * Handle incoming WebSocket messages for the system channel.
 */
export function handleSystemMessage(
  ws: ServerWebSocket<WSClientData>,
  message: Record<string, unknown>
): void {
  const msgType = message.type as string;

  try {
    switch (msgType) {
      case "subscribe:system": {
        ws.data.subscribedChannels.add("system");
        sendToClient(ws, {
          type: "system_event",
          provider: "system",
          data: { eventType: "subscribed", channel: "system" },
          timestamp: Date.now(),
        });
        break;
      }

      case "unsubscribe:system": {
        ws.data.subscribedChannels.delete("system");
        sendToClient(ws, {
          type: "system_event",
          provider: "system",
          data: { eventType: "unsubscribed", channel: "system" },
          timestamp: Date.now(),
        });
        break;
      }

      case "ping": {
        sendToClient(ws, {
          type: "system_event",
          provider: "system",
          data: { eventType: "pong" },
          timestamp: Date.now(),
        });
        break;
      }

      case "request:health": {
        // Client requesting current health status
        sendToClient(ws, {
          type: "system_event",
          provider: "system",
          data: {
            eventType: "health_status",
            timestamp: Date.now(),
            connections: systemClients.size,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
          },
          timestamp: Date.now(),
        });
        break;
      }

      default: {
        sendToClient(ws, {
          type: "system_event",
          provider: "system",
          data: {
            eventType: "error",
            message: `Unknown system message type: ${msgType}`,
          },
          timestamp: Date.now(),
        });
      }
    }
  } catch (err: any) {
    logHealth({
      component: "WebSocket",
      status: "error",
      error: `System WS message error: ${err.message}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Broadcast Functions
// ---------------------------------------------------------------------------

/**
 * Broadcast a cron completion event to all system subscribers.
 */
export function broadcastCronComplete(cronData: {
  jobName: string;
  schedule: string;
  durationMs: number;
  recordsProcessed: number;
  error?: string;
}): void {
  logCron({
    jobName: cronData.jobName,
    schedule: cronData.schedule,
    durationMs: cronData.durationMs,
    recordsProcessed: cronData.recordsProcessed,
    error: cronData.error,
  });

  broadcastToSystemClients({
    eventType: cronData.error ? "cron_error" : "cron_complete",
    severity: cronData.error ? "error" : "info",
    message: cronData.error
      ? `Cron ${cronData.jobName} failed: ${cronData.error}`
      : `Cron ${cronData.jobName} completed in ${cronData.durationMs}ms`,
    details: {
      jobName: cronData.jobName,
      schedule: cronData.schedule,
      durationMs: cronData.durationMs,
      recordsProcessed: cronData.recordsProcessed,
      ...(cronData.error ? { error: cronData.error } : {}),
    },
  });
}

/**
 * Broadcast a configuration change event.
 */
export function broadcastConfigChange(configData: {
  key: string;
  oldValue?: unknown;
  newValue?: unknown;
  changedBy?: string;
}): void {
  broadcastToSystemClients({
    eventType: "config_change",
    severity: "info",
    message: `Config changed: ${configData.key}`,
    details: configData,
  });

  logHealth({
    component: "Config",
    status: "changed",
    ...configData,
  } as Record<string, unknown>);
}

/**
 * Broadcast a health alert.
 */
export function broadcastHealthAlert(alertData: {
  severity: "warning" | "error" | "critical";
  component: string;
  message: string;
  details?: Record<string, unknown>;
}): void {
  logHealth({
    component: alertData.component,
    status: alertData.severity === "critical" ? "error" : "degraded",
    ...alertData.details,
  } as Record<string, unknown>);

  broadcastToSystemClients({
    eventType: "health_alert",
    severity: alertData.severity,
    message: `[${alertData.component}] ${alertData.message}`,
    details: {
      component: alertData.component,
      ...alertData.details,
    },
  });
}

/**
 * Broadcast an export completion event.
 */
export function broadcastExportComplete(exportData: {
  entity: string;
  format: string;
  rowCount: number;
  durationMs: number;
  success: boolean;
  error?: string;
}): void {
  broadcastToSystemClients({
    eventType: "export_complete",
    severity: exportData.success ? "info" : "error",
    message: exportData.success
      ? `Export ${exportData.entity} completed: ${exportData.rowCount} rows`
      : `Export ${exportData.entity} failed: ${exportData.error}`,
    details: exportData,
  });
}

/**
 * Broadcast a sandbox completion event.
 */
export function broadcastSandboxComplete(sandboxData: {
  scenarioId: string;
  scenarioName: string;
  durationMs: number;
  customerCount?: number;
  success: boolean;
}): void {
  broadcastToSystemClients({
    eventType: "sandbox_complete",
    severity: sandboxData.success ? "info" : "error",
    message: `Sandbox "${sandboxData.scenarioName}" completed`,
    details: sandboxData,
  });
}

/**
 * Broadcast an IP flag event.
 */
export function broadcastIPFlag(ipData: {
  ipAddress: string;
  playerId: string;
  flagType: string;
  severity: string;
  description: string;
}): void {
  broadcastToSystemClients({
    eventType: "ip_flagged",
    severity: ipData.severity === "critical" || ipData.severity === "high" ? "warning" : "info",
    message: `IP ${ipData.ipAddress} flagged: ${ipData.description}`,
    details: ipData,
  });
}

/**
 * Broadcast a denylist update.
 */
export function broadcastDenylistUpdate(denylistData: {
  ipAddress: string;
  action: "added" | "removed";
  reason?: string;
  by?: string;
}): void {
  broadcastToSystemClients({
    eventType: "denylist_update",
    severity: "info",
    message: `IP ${denylistData.ipAddress} ${denylistData.action} to denylist`,
    details: denylistData,
  });
}

/**
 * Broadcast a migration applied event.
 */
export function broadcastMigrationApplied(migrationData: {
  filename: string;
  direction: "up" | "down";
}): void {
  broadcastToSystemClients({
    eventType: "migration_applied",
    severity: "info",
    message: `Migration ${migrationData.filename} ${migrationData.direction} applied`,
    details: migrationData,
  });

  logHealth({
    component: "Migration",
    status: "applied",
    filename: migrationData.filename,
    direction: migrationData.direction,
  });
}

/**
 * Broadcast a shutdown warning.
 */
export function broadcastShutdownWarning(warningData: {
  reason: string;
  countdownSeconds: number;
}): void {
  broadcastToSystemClients({
    eventType: "shutdown_warning",
    severity: "critical",
    message: `System shutdown in ${warningData.countdownSeconds}s: ${warningData.reason}`,
    details: warningData,
  });

  logHealth({
    component: "System",
    status: "error",
    error: `Shutdown warning: ${warningData.reason}`,
  });
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function sendToClient(ws: ServerWebSocket<WSClientData>, message: SystemEventMessage): void {
  try {
    ws.send(JSON.stringify(message));
  } catch (err: any) {
    // Client disconnected
    systemClients.delete(ws.data.clientId);
  }
}

function broadcastToSystemClients(payload: SystemEventPayload): void {
  const message: SystemEventMessage = {
    type: "system_event",
    provider: "system",
    data: {
      ...payload,
      details: payload.details || {},
    },
    timestamp: Date.now(),
  };

  const jsonPayload = JSON.stringify(message);
  let sent = 0;

  for (const [clientId, ws] of systemClients) {
    if (ws.data.subscribedChannels.has("system") && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(jsonPayload);
        sent++;
      } catch {
        systemClients.delete(clientId);
      }
    }
  }

  // Log critical events regardless
  if (payload.severity === "critical" || payload.severity === "error") {
    logHealth({
      component: "WebSocket",
      status: payload.severity === "critical" ? "error" : "degraded",
      activeConnections: sent,
      error: payload.message,
    });
  }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/** Get current system subscriber count. */
export function getSystemSubscriberCount(): number {
  let count = 0;
  for (const [, ws] of systemClients) {
    if (ws.data.subscribedChannels.has("system")) count++;
  }
  return count;
}

/** Get full WebSocket stats for health checks. */
export function getSystemWSStats(): {
  totalClients: number;
  systemSubscribers: number;
  uptimeSeconds: number;
} {
  return {
    totalClients: systemClients.size,
    systemSubscribers: getSystemSubscriberCount(),
    uptimeSeconds: Math.floor(Date.now() / 1000),
  };
}
