/**
 * Reliable Webhook Dispatcher
 *
 * Dispatches webhooks with:
 *   - Configurable timeout (default 30s)
 *   - 3 retry attempts with exponential backoff (1s, 2s, 4s)
 *   - Circuit breaker: 5 consecutive failures → degraded (half_open)
 *   - Delivery tracking in webhook_delivery_log
 *   - HMAC-SHA256 signature verification support
 *
 * Zone 8: Webhook Alerts — Tech Innovation Theme (#0066ff)
 */

import { getDb } from "@db/index";
import { logWebhook } from "@utils/tableLogger";
import { createHmac, randomUUID } from "crypto";
import type { WebhookConfig, WebhookDelivery, DeliveryStatus, CircuitBreakerState } from "./webhook-service";
import { getWebhook } from "./webhook-service";

export type { WebhookDelivery, DeliveryStatus, CircuitBreakerState };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_RETRY_ATTEMPTS = 3;
const BACKOFF_DELAYS_MS = [1000, 2000, 4000];
const CIRCUIT_BREAKER_THRESHOLD = 5;
const DEFAULT_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// In-memory circuit breaker state cache
// ---------------------------------------------------------------------------

const circuitCache = new Map<string, { state: CircuitBreakerState; failures: number; lastFailureAt: number }>();

// ---------------------------------------------------------------------------
// Signature generation
// ---------------------------------------------------------------------------

/**
 * Generate HMAC-SHA256 signature for webhook payload.
 */
export function generateSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify HMAC-SHA256 signature.
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = generateSignature(payload, secret);
  try {
    // Constant-time comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expectedBuf.length) return false;
    let result = 0;
    for (let i = 0; i < sigBuf.length; i++) {
      result |= sigBuf[i] ^ expectedBuf[i];
    }
    return result === 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Circuit breaker
// ---------------------------------------------------------------------------

function getCircuitState(webhookId: string): { state: CircuitBreakerState; failures: number } {
  const cached = circuitCache.get(webhookId);
  if (cached) {
    return { state: cached.state, failures: cached.failures };
  }
  return { state: "closed", failures: 0 };
}

function recordSuccess(webhookId: string): void {
  const cached = circuitCache.get(webhookId);
  if (cached) {
    cached.state = "closed";
    cached.failures = 0;
  }

  // Also update DB
  const db = getDb();
  db.run(
    "UPDATE webhook_configs SET circuit_state = 'closed', consecutive_failures = 0, updated_at = ? WHERE webhook_id = ?",
    [Math.floor(Date.now() / 1000), webhookId]
  );
}

function recordFailure(webhookId: string): void {
  const cached = circuitCache.get(webhookId) ?? { state: "closed" as CircuitBreakerState, failures: 0, lastFailureAt: 0 };
  cached.failures += 1;
  cached.lastFailureAt = Date.now();

  if (cached.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    cached.state = "half_open";
  }

  circuitCache.set(webhookId, cached);

  // Update DB
  const db = getDb();
  db.run(
    "UPDATE webhook_configs SET consecutive_failures = ?, circuit_state = ?, updated_at = ? WHERE webhook_id = ?",
    [cached.failures, cached.state, Math.floor(Date.now() / 1000), webhookId]
  );
}

function isCircuitOpen(webhookId: string): boolean {
  const { state } = getCircuitState(webhookId);
  return state === "half_open";
}

// ---------------------------------------------------------------------------
// Core dispatch
// ---------------------------------------------------------------------------

export interface DispatchResult {
  deliveryId: string;
  success: boolean;
  status?: number;
  responseBody?: string;
  durationMs: number;
  attempts: number;
  error?: string;
}

export interface DispatchOptions {
  eventType: string;
  payload: Record<string, unknown>;
  webhookId?: string;
}

/**
 * Create a delivery log entry.
 */
function createDeliveryLog(
  deliveryId: string,
  webhookId: string,
  eventType: string,
  payload: string
): void {
  const db = getDb();
  db.run(
    `INSERT INTO webhook_delivery_log (
      delivery_id, webhook_id, event_type, payload, status, attempts, max_attempts, timestamp
    ) VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
    [deliveryId, webhookId, eventType, payload, DEFAULT_RETRY_ATTEMPTS, Math.floor(Date.now() / 1000)]
  );
}

/**
 * Update a delivery log entry.
 */
function updateDeliveryLog(
  deliveryId: string,
  status: DeliveryStatus,
  attempts: number,
  httpStatus?: number,
  responseBody?: string,
  error?: string,
  durationMs?: number
): void {
  const db = getDb();
  db.run(
    `UPDATE webhook_delivery_log SET
      status = ?, attempts = ?, http_status = ?, response_body = ?, error = ?, duration_ms = ?
    WHERE delivery_id = ?`,
    [status, attempts, httpStatus ?? null, responseBody ?? null, error ?? null, durationMs ?? null, deliveryId]
  );
}

/**
 * Dispatch a webhook with retry logic and circuit breaker protection.
 *
 * Retry schedule: attempt 1 → 1s wait → attempt 2 → 2s wait → attempt 3 → 4s wait → fail
 */
export async function dispatchWebhook(options: DispatchOptions): Promise<DispatchResult> {
  const db = getDb();
  const deliveryId = `dl_${randomUUID().slice(0, 12)}`;
  const eventType = options.eventType;
  const payload = JSON.stringify(options.payload);
  const payloadSize = payload.length;

  // Resolve webhook config
  let config: WebhookConfig;
  try {
    if (options.webhookId) {
      config = getWebhook(options.webhookId);
    } else {
      // Find first enabled webhook matching the event type
      const rows = db
        .query<{ webhook_id: string }, [string]>(
          `SELECT webhook_id FROM webhook_configs
           WHERE enabled = 1 AND event_types_json LIKE ?
           ORDER BY created_at DESC LIMIT 1`
        )
        .all(`%${eventType}%`);

      if (rows.length === 0) {
        return {
          deliveryId,
          success: false,
          error: `No enabled webhook configured for event type: ${eventType}`,
          durationMs: 0,
          attempts: 0,
        };
      }
      config = getWebhook(rows[0].webhook_id);
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Failed to resolve webhook config";
    logWebhook({
      webhookId: options.webhookId ?? "auto",
      eventType,
      status: "failed",
      error,
      payloadSize,
    });
    return { deliveryId, success: false, error, durationMs: 0, attempts: 0 };
  }

  // Check circuit breaker
  if (isCircuitOpen(config.webhookId)) {
    logWebhook({
      webhookId: config.webhookId,
      url: config.url,
      eventType,
      status: "failed",
      error: "Circuit breaker is half_open (too many consecutive failures)",
      payloadSize,
    });
    return {
      deliveryId,
      success: false,
      error: "Circuit breaker open: webhook temporarily disabled due to consecutive failures",
      durationMs: 0,
      attempts: 0,
    };
  }

  // Create delivery log entry
  createDeliveryLog(deliveryId, config.webhookId, eventType, payload);

  const maxAttempts = config.retryCount || DEFAULT_RETRY_ATTEMPTS;
  let lastError: string | undefined;
  let lastStatus: number | undefined;
  let lastResponseBody: string | undefined;
  const totalStartTime = performance.now();

  // Build request headers
  const headers: Record<string, string> = {
    ...config.headers,
    "X-Webhook-Id": config.webhookId,
    "X-Event-Type": eventType,
    "X-Delivery-Id": deliveryId,
    "X-Webhook-Timestamp": String(Math.floor(Date.now() / 1000)),
  };

  // Add HMAC signature if secret is configured
  if (config.secret) {
    const signature = generateSignature(payload, config.secret);
    headers["X-Webhook-Signature"] = `sha256=${signature}`;
  }

  // Attempt delivery with exponential backoff
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptStartTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || DEFAULT_TIMEOUT_MS);

      const response = await fetch(config.url, {
        method: config.method,
        headers,
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const attemptDuration = Math.round(performance.now() - attemptStartTime);
      lastStatus = response.status;
      lastResponseBody = await response.text().catch(() => undefined);

      if (response.ok) {
        // Success — reset circuit breaker
        recordSuccess(config.webhookId);

        const totalDuration = Math.round(performance.now() - totalStartTime);
        updateDeliveryLog(deliveryId, "success", attempt, response.status, lastResponseBody, undefined, totalDuration);

        logWebhook({
          webhookId: config.webhookId,
          url: config.url,
          eventType,
          status: "success",
          statusCode: response.status,
          latencyMs: totalDuration,
          attemptNumber: attempt,
          payloadSize,
        });

        return {
          deliveryId,
          success: true,
          status: response.status,
          responseBody: lastResponseBody,
          durationMs: totalDuration,
          attempts: attempt,
        };
      }

      // HTTP error — may be retryable (5xx)
      lastError = `HTTP ${response.status}: ${lastResponseBody ?? "No response body"}`;

      if (response.status >= 500 && attempt < maxAttempts) {
        logWebhook({
          webhookId: config.webhookId,
          url: config.url,
          eventType,
          status: "retrying",
          statusCode: response.status,
          latencyMs: attemptDuration,
          attemptNumber: attempt,
          error: lastError,
          payloadSize,
        });

        updateDeliveryLog(deliveryId, "retrying", attempt, response.status, lastResponseBody, lastError);

        // Wait with exponential backoff
        const backoffMs = BACKOFF_DELAYS_MS[attempt - 1] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
        await sleep(backoffMs);
        continue;
      }

      // Non-retryable (4xx) or last attempt
      break;
    } catch (err: unknown) {
      const attemptDuration = Math.round(performance.now() - attemptStartTime);
      lastError = err instanceof Error ? err.message : "Unknown fetch error";

      logWebhook({
        webhookId: config.webhookId,
        url: config.url,
        eventType,
        status: "retrying",
        latencyMs: attemptDuration,
        attemptNumber: attempt,
        error: lastError,
        payloadSize,
      });

      updateDeliveryLog(deliveryId, attempt < maxAttempts ? "retrying" : "failed", attempt, undefined, undefined, lastError);

      if (attempt < maxAttempts) {
        const backoffMs = BACKOFF_DELAYS_MS[attempt - 1] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
        await sleep(backoffMs);
      }
    }
  }

  // All attempts exhausted — record failure for circuit breaker
  recordFailure(config.webhookId);

  const totalDuration = Math.round(performance.now() - totalStartTime);
  updateDeliveryLog(deliveryId, "failed", maxAttempts, lastStatus, lastResponseBody, lastError, totalDuration);

  logWebhook({
    webhookId: config.webhookId,
    url: config.url,
    eventType,
    status: "failed",
    latencyMs: totalDuration,
    attemptNumber: maxAttempts,
    error: lastError,
    payloadSize,
  });

  return {
    deliveryId,
    success: false,
    status: lastStatus,
    responseBody: lastResponseBody,
    durationMs: totalDuration,
    attempts: maxAttempts,
    error: `All ${maxAttempts} attempts failed. Last error: ${lastError}`,
  };
}

/**
 * Dispatch to all enabled webhooks matching an event type.
 */
export async function dispatchToAllMatching(eventType: string, payload: Record<string, unknown>): Promise<DispatchResult[]> {
  const db = getDb();

  const rows = db
    .query(
      `SELECT webhook_id FROM webhook_configs
       WHERE enabled = 1 AND event_types_json LIKE ?`
    )
    .all(`%${eventType}%`) as { webhook_id: string }[];

  if (rows.length === 0) {
    return [];
  }

  const results: DispatchResult[] = [];
  for (const row of rows) {
    try {
      const result = await dispatchWebhook({
        eventType,
        payload,
        webhookId: row.webhook_id,
      });
      results.push(result);
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Dispatch error";
      results.push({
        deliveryId: `dl_err_${randomUUID().slice(0, 8)}`,
        success: false,
        error,
        durationMs: 0,
        attempts: 0,
      });
    }
  }

  return results;
}

/**
 * Reset circuit breaker state for a webhook (manual recovery).
 */
export function resetCircuitBreaker(webhookId: string): void {
  circuitCache.delete(webhookId);
  const db = getDb();
  db.run(
    "UPDATE webhook_configs SET circuit_state = 'closed', consecutive_failures = 0, updated_at = ? WHERE webhook_id = ?",
    [Math.floor(Date.now() / 1000), webhookId]
  );

  logWebhook({
    webhookId,
    status: "circuit_reset",
    payloadSize: 0,
  });
}

/**
 * Get circuit breaker state for all webhooks.
 */
export function getAllCircuitStates(): Array<{
  webhookId: string;
  name: string;
  state: CircuitBreakerState;
  consecutiveFailures: number;
  cachedState?: CircuitBreakerState;
}> {
  const db = getDb();

  const rows = db.query<
    { webhook_id: string; name: string; circuit_state: string; consecutive_failures: number },
    []
  >("SELECT webhook_id, name, circuit_state, consecutive_failures FROM webhook_configs").all();

  return rows.map((row) => {
    const cached = circuitCache.get(row.webhook_id);
    return {
      webhookId: row.webhook_id,
      name: row.name,
      state: (cached?.state ?? row.circuit_state) as CircuitBreakerState,
      consecutiveFailures: cached?.failures ?? row.consecutive_failures,
      cachedState: cached?.state,
    };
  });
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
