/**
 * Webhook API Routes
 *
 * Zone 8: Webhook Alerts — Tech Innovation Theme (#0066ff)
 *
 * Routes:
 *   GET    /api/webhooks              — List all webhook configs
 *   POST   /api/webhooks              — Create new webhook
 *   GET    /api/webhooks/:id          — Get webhook config
 *   PUT    /api/webhooks/:id          — Update webhook
 *   DELETE /api/webhooks/:id          — Delete webhook
 *   POST   /api/webhooks/:id/test     — Test webhook
 *   POST   /api/webhooks/:id/toggle   — Enable/disable
 *   GET    /api/webhooks/:id/deliveries — Delivery history
 *   GET    /api/webhooks/:id/stats    — Delivery stats
 *   POST   /api/webhooks/:id/reset-circuit — Reset circuit breaker
 */

import type { AuthContext } from "@utils/types";
import { NotFoundError, ValidationError } from "@utils/errors";
import { logWebhook } from "@utils/tableLogger";
import {
  createWebhook,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  listWebhooks,
  toggleWebhook,
  testWebhook,
  getDeliveries,
  getDeliveryStats,
} from "@services/webhook-service";
import { resetCircuitBreaker } from "@services/webhook-dispatcher";

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/webhooks — List all webhook configs
 */
export async function handleListWebhooks(req: Request, _auth: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const enabled = url.searchParams.get("enabled");
  const eventType = url.searchParams.get("eventType") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  const options: Parameters<typeof listWebhooks>[0] = { limit, offset };
  if (enabled !== null) options.enabled = enabled === "true";
  if (eventType) options.eventType = eventType;

  const result = listWebhooks(options);

  // Strip secrets from response
  const sanitized = result.items.map((wh) => ({
    ...wh,
    secret: wh.secret ? "***REDACTED***" : undefined,
  }));

  return Response.json({ items: sanitized, total: result.total, limit, offset });
}

/**
 * POST /api/webhooks — Create new webhook
 */
export async function handleCreateWebhook(req: Request, _auth: AuthContext): Promise<Response> {
  const body = await req.json();

  if (!body.name) throw ValidationError.field("name", "required");
  if (!body.url) throw ValidationError.field("url", "required");

  const webhook = createWebhook({
    name: body.name,
    url: body.url,
    method: body.method,
    headers: body.headers,
    bodyTemplate: body.bodyTemplate,
    eventTypes: body.eventTypes,
    enabled: body.enabled,
    retryCount: body.retryCount,
    timeoutMs: body.timeoutMs,
    secret: body.secret,
    description: body.description,
  });

  const { secret, ...safeWebhook } = webhook;
  return Response.json({ ...safeWebhook, secret: secret ? "***REDACTED***" : undefined }, { status: 201 });
}

/**
 * GET /api/webhooks/:id — Get webhook config
 */
export async function handleGetWebhook(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "required");

  const webhook = getWebhook(id);
  const { secret, ...safeWebhook } = webhook;
  return Response.json({ ...safeWebhook, secret: secret ? "***REDACTED***" : undefined });
}

/**
 * PUT /api/webhooks/:id — Update webhook
 */
export async function handleUpdateWebhook(
  req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "required");

  const body = await req.json();

  // Prevent updating webhook_id
  const updateInput: Parameters<typeof updateWebhook>[1] = {};
  if (body.name !== undefined) updateInput.name = body.name;
  if (body.url !== undefined) updateInput.url = body.url;
  if (body.method !== undefined) updateInput.method = body.method;
  if (body.headers !== undefined) updateInput.headers = body.headers;
  if (body.bodyTemplate !== undefined) updateInput.bodyTemplate = body.bodyTemplate;
  if (body.eventTypes !== undefined) updateInput.eventTypes = body.eventTypes;
  if (body.enabled !== undefined) updateInput.enabled = body.enabled;
  if (body.retryCount !== undefined) updateInput.retryCount = body.retryCount;
  if (body.timeoutMs !== undefined) updateInput.timeoutMs = body.timeoutMs;
  if (body.secret !== undefined) updateInput.secret = body.secret;
  if (body.description !== undefined) updateInput.description = body.description;

  const webhook = updateWebhook(id, updateInput);
  const { secret, ...safeWebhook } = webhook;
  return Response.json({ ...safeWebhook, secret: secret ? "***REDACTED***" : undefined });
}

/**
 * DELETE /api/webhooks/:id — Delete webhook
 */
export async function handleDeleteWebhook(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "required");

  deleteWebhook(id);
  return new Response(null, { status: 204 });
}

/**
 * POST /api/webhooks/:id/test — Test webhook
 */
export async function handleTestWebhook(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "required");

  const result = await testWebhook(id);
  return Response.json(result);
}

/**
 * POST /api/webhooks/:id/toggle — Enable/disable webhook
 */
export async function handleToggleWebhook(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "required");

  const webhook = toggleWebhook(id);
  const { secret, ...safeWebhook } = webhook;
  return Response.json({ ...safeWebhook, secret: secret ? "***REDACTED***" : undefined });
}

/**
 * GET /api/webhooks/:id/deliveries — Delivery history
 */
export async function handleGetDeliveries(
  req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "required");

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  const result = getDeliveries(id, {
    status: status as "pending" | "success" | "failed" | undefined,
    limit,
    offset,
  });

  return Response.json(result);
}

/**
 * GET /api/webhooks/:id/stats — Delivery stats
 */
export async function handleGetWebhookStats(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "required");

  const stats = getDeliveryStats(id);
  return Response.json(stats);
}

/**
 * POST /api/webhooks/:id/reset-circuit — Reset circuit breaker
 */
export async function handleResetCircuit(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "required");

  resetCircuitBreaker(id);
  logWebhook({
    webhookId: id,
    status: "circuit_reset",
    payloadSize: 0,
  });

  return Response.json({ webhookId: id, circuitState: "closed", consecutiveFailures: 0 });
}

// ---------------------------------------------------------------------------
// Route registry export
// ---------------------------------------------------------------------------

export interface WebhookRoute {
  method: string;
  pattern: RegExp;
  handler: (req: Request, auth: AuthContext, params?: Record<string, string>) => Promise<Response>;
  auth: "required" | "admin";
}

export const webhookRoutes: WebhookRoute[] = [
  { method: "GET", pattern: /^\/api\/webhooks$/, handler: handleListWebhooks, auth: "required" },
  { method: "POST", pattern: /^\/api\/webhooks$/, handler: handleCreateWebhook, auth: "admin" },
  { method: "GET", pattern: /^\/api\/webhooks\/[^/]+$/, handler: handleGetWebhook, auth: "required" },
  { method: "PUT", pattern: /^\/api\/webhooks\/[^/]+$/, handler: handleUpdateWebhook, auth: "admin" },
  { method: "DELETE", pattern: /^\/api\/webhooks\/[^/]+$/, handler: handleDeleteWebhook, auth: "admin" },
  { method: "POST", pattern: /^\/api\/webhooks\/[^/]+\/test$/, handler: handleTestWebhook, auth: "admin" },
  { method: "POST", pattern: /^\/api\/webhooks\/[^/]+\/toggle$/, handler: handleToggleWebhook, auth: "admin" },
  { method: "GET", pattern: /^\/api\/webhooks\/[^/]+\/deliveries$/, handler: handleGetDeliveries, auth: "required" },
  { method: "GET", pattern: /^\/api\/webhooks\/[^/]+\/stats$/, handler: handleGetWebhookStats, auth: "required" },
  { method: "POST", pattern: /^\/api\/webhooks\/[^/]+\/reset-circuit$/, handler: handleResetCircuit, auth: "admin" },
];
