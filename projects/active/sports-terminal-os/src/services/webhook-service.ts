/**
 * Webhook Management Service
 *
 * Provides CRUD operations for webhook configurations and test delivery.
 * All database operations use bun:sqlite with proper error handling.
 *
 * Zone 8: Webhook Alerts — Tech Innovation Theme (#0066ff)
 */

import { getDb } from "@db/index";
import { logWebhook } from "@utils/tableLogger";
import { NotFoundError, ValidationError } from "@utils/errors";
import { createHash, randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebhookConfig {
  id: number;
  webhookId: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  bodyTemplate?: string;
  eventTypes: string[];
  enabled: boolean;
  retryCount: number;
  timeoutMs: number;
  secret?: string;
  circuitState: CircuitBreakerState;
  consecutiveFailures: number;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WebhookDelivery {
  id: number;
  deliveryId: string;
  webhookId: string;
  eventType: string;
  payload?: string;
  status: DeliveryStatus;
  httpStatus?: number;
  responseBody?: string;
  attempts: number;
  maxAttempts: number;
  error?: string;
  durationMs?: number;
  timestamp: number;
}

export interface WebhookTestResult {
  success: boolean;
  webhookId: string;
  url: string;
  status?: number;
  responseBody?: string;
  durationMs: number;
  error?: string;
  attempts: number;
}

export type DeliveryStatus = "pending" | "success" | "failed" | "retrying";
export type CircuitBreakerState = "closed" | "open" | "half_open";

export interface CreateWebhookInput {
  name: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  bodyTemplate?: string;
  eventTypes?: string[];
  enabled?: boolean;
  retryCount?: number;
  timeoutMs?: number;
  secret?: string;
  description?: string;
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  bodyTemplate?: string;
  eventTypes?: string[];
  enabled?: boolean;
  retryCount?: number;
  timeoutMs?: number;
  secret?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Internal: Row mapper
// ---------------------------------------------------------------------------

interface WebhookConfigRow {
  id: number;
  webhook_id: string;
  name: string;
  url: string;
  method: string;
  headers_json: string;
  body_template: string | null;
  event_types_json: string;
  enabled: number;
  retry_count: number;
  timeout_ms: number;
  secret: string | null;
  circuit_state: string;
  consecutive_failures: number;
  description: string | null;
  created_at: number;
  updated_at: number;
}

interface DeliveryLogRow {
  id: number;
  delivery_id: string;
  webhook_id: string;
  event_type: string;
  payload: string | null;
  status: string;
  http_status: number | null;
  response_body: string | null;
  attempts: number;
  max_attempts: number;
  error: string | null;
  duration_ms: number | null;
  timestamp: number;
}

function mapConfigRow(row: WebhookConfigRow): WebhookConfig {
  return {
    id: row.id,
    webhookId: row.webhook_id,
    name: row.name,
    url: row.url,
    method: row.method,
    headers: safeJsonParse<Record<string, string>>(row.headers_json, {}),
    bodyTemplate: row.body_template ?? undefined,
    eventTypes: safeJsonParse<string[]>(row.event_types_json, []),
    enabled: row.enabled === 1,
    retryCount: row.retry_count,
    timeoutMs: row.timeout_ms,
    secret: row.secret ?? undefined,
    circuitState: row.circuit_state as CircuitBreakerState,
    consecutiveFailures: row.consecutive_failures,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDeliveryRow(row: DeliveryLogRow): WebhookDelivery {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    webhookId: row.webhook_id,
    eventType: row.event_type,
    payload: row.payload ?? undefined,
    status: row.status as DeliveryStatus,
    httpStatus: row.http_status ?? undefined,
    responseBody: row.response_body ?? undefined,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    error: row.error ?? undefined,
    durationMs: row.duration_ms ?? undefined,
    timestamp: row.timestamp,
  };
}

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new webhook configuration.
 */
export function createWebhook(input: CreateWebhookInput): WebhookConfig {
  const db = getDb();
  const webhookId = `wh_${randomUUID().slice(0, 8)}`;
  const now = Math.floor(Date.now() / 1000);

  // Validate required fields
  if (!input.name?.trim()) throw ValidationError.field("name", "required");
  if (!input.url?.trim()) throw ValidationError.field("url", "required");

  // Basic URL validation
  try {
    new URL(input.url);
  } catch {
    throw ValidationError.field("url", "must be a valid URL", input.url);
  }

  const headersJson = JSON.stringify(input.headers ?? { "Content-Type": "application/json" });
  const eventTypesJson = JSON.stringify(input.eventTypes ?? ["risk_alert"]);

  db.run(
    `INSERT INTO webhook_configs (
      webhook_id, name, url, method, headers_json, body_template,
      event_types_json, enabled, retry_count, timeout_ms, secret,
      description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      webhookId,
      input.name.trim(),
      input.url.trim(),
      (input.method ?? "POST").toUpperCase(),
      headersJson,
      input.bodyTemplate ?? null,
      eventTypesJson,
      input.enabled ? 1 : 0,
      input.retryCount ?? 3,
      input.timeoutMs ?? 30000,
      input.secret ?? null,
      input.description ?? null,
      now,
      now,
    ]
  );

  const row = db
    .query<WebhookConfigRow, [string]>("SELECT * FROM webhook_configs WHERE webhook_id = ?")
    .get(webhookId);

  if (!row) throw new Error("Failed to create webhook: insert succeeded but row not found");

  logWebhook({
    webhookId,
    url: input.url,
    status: "created",
    payloadSize: 0,
  });

  return mapConfigRow(row);
}

/**
 * Get a single webhook configuration by ID.
 */
export function getWebhook(webhookId: string): WebhookConfig {
  const db = getDb();
  const row = db
    .query<WebhookConfigRow, [string]>("SELECT * FROM webhook_configs WHERE webhook_id = ?")
    .get(webhookId);

  if (!row) throw new NotFoundError(`Webhook ${webhookId} not found`, "WEBHOOK_NOT_FOUND", "webhook", webhookId);

  return mapConfigRow(row);
}

/**
 * List all webhook configurations with optional filtering.
 */
export function listWebhooks(options?: {
  enabled?: boolean;
  eventType?: string;
  limit?: number;
  offset?: number;
}): { items: WebhookConfig[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.enabled !== undefined) {
    conditions.push("enabled = ?");
    params.push(options.enabled ? 1 : 0);
  }

  if (options?.eventType) {
    conditions.push("event_types_json LIKE ?");
    params.push(`%${options.eventType}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const rows = db
    .query<WebhookConfigRow, any[]>(`SELECT * FROM webhook_configs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  const countRow = db
    .query<{ count: number }, any[]>(`SELECT COUNT(*) as count FROM webhook_configs ${whereClause}`)
    .get(...params);

  return {
    items: rows.map(mapConfigRow),
    total: countRow?.count ?? 0,
  };
}

/**
 * Update a webhook configuration.
 */
export function updateWebhook(webhookId: string, input: UpdateWebhookInput): WebhookConfig {
  const db = getDb();

  // Verify exists
  const existing = getWebhook(webhookId);

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.name !== undefined) {
    if (!input.name.trim()) throw ValidationError.field("name", "cannot be empty");
    updates.push("name = ?");
    params.push(input.name.trim());
  }

  if (input.url !== undefined) {
    try {
      new URL(input.url);
    } catch {
      throw ValidationError.field("url", "must be a valid URL", input.url);
    }
    updates.push("url = ?");
    params.push(input.url.trim());
  }

  if (input.method !== undefined) {
    updates.push("method = ?");
    params.push(input.method.toUpperCase());
  }

  if (input.headers !== undefined) {
    updates.push("headers_json = ?");
    params.push(JSON.stringify(input.headers));
  }

  if (input.bodyTemplate !== undefined) {
    updates.push("body_template = ?");
    params.push(input.bodyTemplate ?? null);
  }

  if (input.eventTypes !== undefined) {
    updates.push("event_types_json = ?");
    params.push(JSON.stringify(input.eventTypes));
  }

  if (input.enabled !== undefined) {
    updates.push("enabled = ?");
    params.push(input.enabled ? 1 : 0);
  }

  if (input.retryCount !== undefined) {
    updates.push("retry_count = ?");
    params.push(input.retryCount);
  }

  if (input.timeoutMs !== undefined) {
    updates.push("timeout_ms = ?");
    params.push(input.timeoutMs);
  }

  if (input.secret !== undefined) {
    updates.push("secret = ?");
    params.push(input.secret ?? null);
  }

  if (input.description !== undefined) {
    updates.push("description = ?");
    params.push(input.description ?? null);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push("updated_at = ?");
  params.push(Math.floor(Date.now() / 1000));
  params.push(webhookId);

  db.run(
    `UPDATE webhook_configs SET ${updates.join(", ")} WHERE webhook_id = ?`,
    params
  );

  logWebhook({
    webhookId,
    url: existing.url,
    status: "updated",
    payloadSize: 0,
  });

  return getWebhook(webhookId);
}

/**
 * Delete a webhook configuration.
 */
export function deleteWebhook(webhookId: string): void {
  const db = getDb();

  // Verify exists
  getWebhook(webhookId);

  // Delete related delivery logs first
  db.run("DELETE FROM webhook_delivery_log WHERE webhook_id = ?", [webhookId]);

  // Delete config
  db.run("DELETE FROM webhook_configs WHERE webhook_id = ?", [webhookId]);

  logWebhook({
    webhookId,
    status: "deleted",
    payloadSize: 0,
  });
}

/**
 * Toggle webhook enabled/disabled state.
 */
export function toggleWebhook(webhookId: string): WebhookConfig {
  const existing = getWebhook(webhookId);
  return updateWebhook(webhookId, { enabled: !existing.enabled });
}

/**
 * Test a webhook by sending a test payload.
 */
export async function testWebhook(webhookId: string): Promise<WebhookTestResult> {
  const config = getWebhook(webhookId);

  const testPayload = {
    event: "webhook.test",
    webhookId: config.webhookId,
    timestamp: new Date().toISOString(),
    message: "This is a test payload from Sports Terminal OS",
    data: {
      test: true,
      version: "5.2.0",
      zone: "Zone 8 Webhook Alerts",
    },
  };

  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    const response = await fetch(config.url, {
      method: config.method,
      headers: {
        ...config.headers,
        "X-Webhook-Test": "true",
        "X-Webhook-Id": config.webhookId,
      },
      body: JSON.stringify(testPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const durationMs = Math.round(performance.now() - startTime);
    const responseBody = await response.text().catch(() => undefined);

    logWebhook({
      webhookId,
      url: config.url,
      status: response.ok ? "success" : "failed",
      statusCode: response.status,
      latencyMs: durationMs,
      attemptNumber: 1,
      payloadSize: JSON.stringify(testPayload).length,
    });

    return {
      success: response.ok,
      webhookId,
      url: config.url,
      status: response.status,
      responseBody,
      durationMs,
      attempts: 1,
    };
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - startTime);
    const error = err instanceof Error ? err.message : "Unknown error";

    logWebhook({
      webhookId,
      url: config.url,
      status: "failed",
      latencyMs: durationMs,
      attemptNumber: 1,
      error,
      payloadSize: JSON.stringify(testPayload).length,
    });

    return {
      success: false,
      webhookId,
      url: config.url,
      durationMs,
      error,
      attempts: 1,
    };
  }
}

/**
 * Get delivery history for a webhook.
 */
export function getDeliveries(
  webhookId: string,
  options?: {
    status?: DeliveryStatus;
    limit?: number;
    offset?: number;
  }
): { items: WebhookDelivery[]; total: number } {
  const db = getDb();

  // Verify webhook exists
  getWebhook(webhookId);

  const conditions: string[] = ["webhook_id = ?"];
  const params: (string | number)[] = [webhookId];

  if (options?.status) {
    conditions.push("status = ?");
    params.push(options.status);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const rows = db
    .query<DeliveryLogRow, any[]>(`SELECT * FROM webhook_delivery_log ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  const countRow = db
    .query<{ count: number }, any[]>(`SELECT COUNT(*) as count FROM webhook_delivery_log ${whereClause}`)
    .get(...params);

  return {
    items: rows.map(mapDeliveryRow),
    total: countRow?.count ?? 0,
  };
}

/**
 * Get delivery statistics for a webhook.
 */
export function getDeliveryStats(webhookId: string): {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
  avgLatencyMs: number;
  avgAttempts: number;
  lastDeliveryAt?: number;
} {
  const db = getDb();

  // Verify webhook exists
  getWebhook(webhookId);

  const stats = db
    .query<
      {
        total: number;
        successful: number;
        failed: number;
        pending: number;
        avgLatencyMs: number | null;
        avgAttempts: number | null;
        lastDeliveryAt: number | null;
      },
      [string]
    >(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        AVG(duration_ms) as avgLatencyMs,
        AVG(attempts) as avgAttempts,
        MAX(timestamp) as lastDeliveryAt
      FROM webhook_delivery_log
      WHERE webhook_id = ?`
    )
    .get(webhookId);

  const total = stats?.total ?? 0;
  const successful = stats?.successful ?? 0;

  return {
    total,
    successful,
    failed: stats?.failed ?? 0,
    pending: stats?.pending ?? 0,
    successRate: total > 0 ? Math.round((successful / total) * 1000) / 10 : 0,
    avgLatencyMs: Math.round(stats?.avgLatencyMs ?? 0),
    avgAttempts: Math.round((stats?.avgAttempts ?? 0) * 10) / 10,
    lastDeliveryAt: stats?.lastDeliveryAt ?? undefined,
  };
}
