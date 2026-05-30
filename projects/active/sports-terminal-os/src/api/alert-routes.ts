/**
 * Alert API Routes
 *
 * Zone 8: Webhook Alerts — Tech Innovation Theme (#0066ff)
 *
 * Routes:
 *   GET    /api/alerts               — List alerts with filters
 *   GET    /api/alerts/:id           — Get single alert
 *   POST   /api/alerts/:id/acknowledge — Acknowledge
 *   POST   /api/alerts/:id/resolve   — Resolve
 *   GET    /api/alerts/stats/summary — Alert summary (counts by severity/status)
 *   SSE    /api/alerts/stream        — Real-time alert stream
 */

import type { AuthContext } from "@utils/types";
import { NotFoundError, ValidationError } from "@utils/errors";
import { logRiskAlert } from "@utils/tableLogger";
import {
  getAlerts,
  getAlert,
  acknowledgeAlert,
  resolveAlert,
  getAlertSummary,
  generateAlert,
  type AlertFilter,
  type AlertSeverity,
  type AlertType,
} from "@services/alert-service";

// ---------------------------------------------------------------------------
// SSE: Active alert stream clients
// ---------------------------------------------------------------------------

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  filter?: { severity?: AlertSeverity; alertType?: AlertType };
  connectedAt: number;
}

const alertStreamClients = new Map<string, SSEClient>();

/**
 * Broadcast an alert event to all connected SSE clients.
 */
export function broadcastAlertToSSE(alert: Record<string, unknown>): void {
  const payload = `event: alert\ndata: ${JSON.stringify(alert)}\n\n`;
  const encoded = new TextEncoder().encode(payload);

  for (const [clientId, client] of alertStreamClients.entries()) {
    try {
      // Apply client-side filter if set
      if (client.filter?.severity && alert.severity !== client.filter.severity) continue;
      if (client.filter?.alertType && alert.alertType !== client.filter.alertType) continue;

      client.controller.enqueue(encoded);
    } catch {
      alertStreamClients.delete(clientId);
    }
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/alerts — List alerts with filters
 */
export async function handleListAlerts(req: Request, auth: AuthContext): Promise<Response> {
  const url = new URL(req.url);

  const filter: AlertFilter = {
    limit: parseInt(url.searchParams.get("limit") ?? "50", 10),
    offset: parseInt(url.searchParams.get("offset") ?? "0", 10),
  };

  const severity = url.searchParams.get("severity");
  if (severity) filter.severity = severity as AlertSeverity;

  const alertType = url.searchParams.get("type");
  if (alertType) filter.alertType = alertType as AlertType;

  const status = url.searchParams.get("status");
  if (status) filter.status = status as "open" | "acknowledged" | "resolved";

  const source = url.searchParams.get("source");
  if (source) filter.source = source;

  const fromTs = url.searchParams.get("from");
  if (fromTs) filter.fromTimestamp = parseInt(fromTs, 10);

  const toTs = url.searchParams.get("to");
  if (toTs) filter.toTimestamp = parseInt(toTs, 10);

  const result = getAlerts(filter);
  return Response.json(result);
}

/**
 * POST /api/alerts — Create a new alert
 */
export async function handleCreateAlert(req: Request, auth: AuthContext): Promise<Response> {
  const body = await req.json();

  if (!body.severity) throw ValidationError.field("severity", "required");
  if (!body.message) throw ValidationError.field("message", "required");
  if (!body.alertType) throw ValidationError.field("alertType", "required");

  const alert = generateAlert({
    severity: body.severity as AlertSeverity,
    alertType: body.alertType as AlertType,
    message: body.message,
    source: body.source ?? auth.user.login ?? auth.user.id,
    relatedEntityType: body.relatedEntityType,
    relatedEntityId: body.relatedEntityId,
    metadata: body.metadata,
  });

  // Broadcast to SSE stream clients
  broadcastAlertToSSE({
    type: "new_alert",
    alertId: alert.alertId,
    severity: alert.severity,
    alertType: alert.alertType,
    message: alert.message,
    source: alert.source,
    createdAt: alert.createdAt,
  });

  return Response.json(alert, { status: 201 });
}

/**
 * GET /api/alerts/:id — Get single alert
 */
export async function handleGetAlert(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "required");

  const alert = getAlert(id);
  return Response.json(alert);
}

/**
 * POST /api/alerts/:id/acknowledge — Acknowledge alert
 */
export async function handleAcknowledgeAlert(
  _req: Request,
  auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "required");

  const acknowledgedBy = auth.user.login ?? auth.user.id;
  const alert = acknowledgeAlert(id, acknowledgedBy);

  broadcastAlertToSSE({
    type: "acknowledged",
    alertId: alert.alertId,
    acknowledged: true,
    acknowledgedBy,
  });

  return Response.json(alert);
}

/**
 * POST /api/alerts/:id/resolve — Resolve alert
 */
export async function handleResolveAlert(
  _req: Request,
  auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "required");

  const resolvedBy = auth.user.login ?? auth.user.id;
  const alert = resolveAlert(id, resolvedBy);

  broadcastAlertToSSE({
    type: "resolved",
    alertId: alert.alertId,
    resolved: true,
    resolvedBy,
  });

  return Response.json(alert);
}

/**
 * GET /api/alerts/stats/summary — Alert summary
 */
export async function handleAlertSummary(_req: Request, _auth: AuthContext): Promise<Response> {
  const summary = getAlertSummary();
  return Response.json(summary);
}

/**
 * SSE /api/alerts/stream — Real-time alert stream
 */
export function handleAlertStream(req: Request): Response {
  const url = new URL(req.url);
  const clientId = crypto.randomUUID();

  const filter: SSEClient["filter"] = {};
  const severityParam = url.searchParams.get("severity");
  if (severityParam) filter.severity = severityParam as AlertSeverity;
  const typeParam = url.searchParams.get("type");
  if (typeParam) filter.alertType = typeParam as AlertType;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        clientId,
        stream: "alerts",
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectEvent));

      alertStreamClients.set(clientId, {
        id: clientId,
        controller,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        connectedAt: Date.now(),
      });

      logRiskAlert({
        alertType: "system_alert",
        severity: "INFO",
        source: "alert-stream",
        message: `SSE client connected: ${clientId} (total: ${alertStreamClients.size})`,
      });
    },
    cancel() {
      alertStreamClients.delete(clientId);

      logRiskAlert({
        alertType: "system_alert",
        severity: "INFO",
        source: "alert-stream",
        message: `SSE client disconnected: ${clientId} (remaining: ${alertStreamClients.size})`,
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ---------------------------------------------------------------------------
// Route registry export
// ---------------------------------------------------------------------------

export interface AlertRoute {
  method: string;
  pattern: RegExp;
  handler: (req: Request, auth: AuthContext, params?: Record<string, string>) => Promise<Response> | Response;
  auth: "required" | "admin";
}

export const alertRoutes: AlertRoute[] = [
  { method: "GET", pattern: /^\/api\/alerts$/, handler: handleListAlerts, auth: "required" },
  { method: "POST", pattern: /^\/api\/alerts$/, handler: handleCreateAlert, auth: "admin" },
  { method: "GET", pattern: /^\/api\/alerts\/stats\/summary$/, handler: handleAlertSummary, auth: "required" },
  { method: "GET", pattern: /^\/api\/alerts\/stream$/, handler: handleAlertStream as any, auth: "required" },
  { method: "GET", pattern: /^\/api\/alerts\/[^/]+$/, handler: handleGetAlert, auth: "required" },
  { method: "POST", pattern: /^\/api\/alerts\/[^/]+\/acknowledge$/, handler: handleAcknowledgeAlert, auth: "required" },
  { method: "POST", pattern: /^\/api\/alerts\/[^/]+\/resolve$/, handler: handleResolveAlert, auth: "required" },
];
