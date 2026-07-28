/**
 * Action Queue Processor
 *
 * Priority queue for async actions: AI summaries, webhook dispatches,
 * enforcement actions. Backed by SQLite table `action_queue`.
 *
 * Processing:
 *   - Worker runs every 2 minutes via cron
 *   - Priority 1 (highest) through 10 (lowest)
 *   - Status: pending → processing → completed | failed
 *   - Exponential backoff retry (1m, 2m, 4m, 8m, 16m)
 *   - Dead letter queue after max attempts (default 5)
 */

import { Database } from "bun:sqlite";
import { getDb } from "@db/index";
import { createLogger } from "@utils/logger";
import { logQueue } from "@utils/tableLogger";
import type { DispatchOptions } from "../services/webhook-dispatcher";

const logger = createLogger("ActionQueue");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;
const RETRY_BACKOFF_MS = 60_000; // 1 minute base

function isDispatchOptions(value: unknown): value is DispatchOptions {
  if (value === null || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return typeof rec.eventType === "string" && typeof rec.payload === "object" && rec.payload !== null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActionType = "ai_summary" | "webhook_dispatch" | "enforcement" | "report_generation" | "data_cleanup";

export type QueueStatus = "pending" | "processing" | "completed" | "failed" | "dead_letter";

export interface ActionQueueItem {
  id: number;
  actionType: ActionType | string;
  payloadJson: string;
  priority: number;
  status: QueueStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: number;
  createdAt: number;
  lastError?: string;
  processedAt?: number;
}

/** Raw row shape returned by SQLite — snake_case column names. */
interface RawActionQueueRow {
  id: number;
  action_type: string;
  payload_json: string;
  priority: number;
  status: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: number;
  created_at: number;
  last_error: string | null;
  processed_at: number | null;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Schema setup
// ---------------------------------------------------------------------------

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS action_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    priority INTEGER NOT NULL DEFAULT 5 CHECK(priority >= 1 AND priority <= 10),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT ${MAX_ATTEMPTS},
    scheduled_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    processed_at INTEGER,
    last_error TEXT
  )
`;

const CREATE_INDEX_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_action_queue_status ON action_queue(status)`,
  `CREATE INDEX IF NOT EXISTS idx_action_queue_scheduled ON action_queue(scheduled_at)`,
  `CREATE INDEX IF NOT EXISTS idx_action_queue_priority ON action_queue(priority DESC, created_at ASC)`,
  `CREATE INDEX IF NOT EXISTS idx_action_queue_type ON action_queue(action_type)`,
];

/**
 * Ensure the action_queue table and indexes exist.
 */
export function ensureActionQueueSchema(db?: Database): void {
  const database = db || getDb();
  database.run(CREATE_TABLE_SQL);
  for (const sql of CREATE_INDEX_SQL) {
    database.run(sql);
  }
  logger.debug("Action queue schema ensured");
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Enqueue a new action.
 */
export function enqueueAction(
  actionType: ActionType | string,
  payload: Record<string, unknown>,
  priority: number = 5,
  options?: { scheduledAt?: number; maxAttempts?: number }
): number {
  ensureActionQueueSchema();
  const db = getDb();

  const clampedPriority = Math.max(1, Math.min(10, priority));
  const scheduledAt = options?.scheduledAt || Math.floor(Date.now() / 1000);
  const maxAttempts = options?.maxAttempts || MAX_ATTEMPTS;

  const result = db.run(
    `INSERT INTO action_queue (action_type, payload_json, priority, status, attempts, max_attempts, scheduled_at)
     VALUES (?, ?, ?, 'pending', 0, ?, ?)`,
    [actionType, JSON.stringify(payload), clampedPriority, maxAttempts, scheduledAt]
  );

  const id = Number(result.lastInsertRowid);
  logQueue({
    queueId: String(id),
    actionType,
    status: "pending",
    priority: clampedPriority,
  });

  logger.info(`Enqueued action #${id} [${actionType}] priority=${clampedPriority}`);
  return id;
}

/**
 * Dequeue the next pending action (highest priority, oldest first).
 */
export function dequeueAction(): ActionQueueItem | null {
  ensureActionQueueSchema();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  // Use a transaction to atomically select and update
  db.run("BEGIN IMMEDIATE");
  try {
    const row = db
      .query(
        `SELECT id, action_type, payload_json, priority, status, attempts, max_attempts,
                scheduled_at, created_at, last_error, processed_at
         FROM action_queue
         WHERE status = 'pending' AND scheduled_at <= ?
         ORDER BY priority ASC, created_at ASC
         LIMIT 1`
      )
      .get(now) as RawActionQueueRow | undefined;

    if (!row) {
      db.run("COMMIT");
      return null;
    }

    // Mark as processing
    db.run(
      `UPDATE action_queue SET status = 'processing', attempts = attempts + 1, processed_at = ? WHERE id = ?`,
      [now, row.id]
    );
    db.run("COMMIT");

    return {
      id: row.id,
      actionType: row.action_type,
      payloadJson: row.payload_json,
      priority: row.priority,
      status: row.status as QueueStatus,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      scheduledAt: row.scheduled_at,
      createdAt: row.created_at,
      lastError: row.last_error ?? undefined,
      processedAt: now,
    };
  } catch (err: unknown) {
    db.run("ROLLBACK");
    throw err;
  }
}

/**
 * Mark an action as completed.
 */
export function markCompleted(id: number): void {
  const db = getDb();
  db.run(`UPDATE action_queue SET status = 'completed' WHERE id = ?`, [id]);

  logQueue({
    queueId: String(id),
    status: "completed",
  });

  logger.debug(`Action #${id} completed`);
}

/**
 * Mark an action as failed with retry scheduling.
 * If max attempts exceeded, moves to dead_letter.
 */
export function markFailed(id: number, error: string): void {
  const db = getDb();

  const row = db
    .query(`SELECT attempts, max_attempts FROM action_queue WHERE id = ?`)
    .get(id) as { attempts: number; max_attempts: number } | undefined;

  if (!row) return;

  if (row.attempts >= row.max_attempts) {
    // Move to dead letter queue
    db.run(
      `UPDATE action_queue SET status = 'dead_letter', last_error = ? WHERE id = ?`,
      [error.slice(0, 2000), id]
    );
    logQueue({
      queueId: String(id),
      status: "failed",
      error: `Dead letter: ${error.slice(0, 200)}`,
      retryCount: row.attempts,
    });
    logger.error(`Action #${id} moved to dead letter queue after ${row.attempts} attempts: ${error.slice(0, 200)}`);
  } else {
    // Schedule retry with exponential backoff
    const backoffMinutes = Math.pow(2, row.attempts - 1); // 1, 2, 4, 8, 16 minutes
    const nextScheduledAt = Math.floor(Date.now() / 1000) + backoffMinutes * 60;

    db.run(
      `UPDATE action_queue SET status = 'pending', scheduled_at = ?, last_error = ? WHERE id = ?`,
      [nextScheduledAt, error.slice(0, 2000), id]
    );

    logQueue({
      queueId: String(id),
      status: "pending",
      retryCount: row.attempts,
      startedAt: new Date(nextScheduledAt * 1000).toISOString(),
    });
    logger.warn(`Action #${id} failed (attempt ${row.attempts}/${row.max_attempts}), retrying in ${backoffMinutes}min`);
  }
}

/**
 * Get queue statistics.
 */
export function getQueueStats(): QueueStats {
  ensureActionQueueSchema();
  const db = getDb();

  const rows = db
    .query(`SELECT status, COUNT(*) as count FROM action_queue GROUP BY status`)
    .all() as Array<{ status: QueueStatus; count: number }>;

  const stats: QueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    deadLetter: 0,
    total: 0,
  };

  for (const row of rows) {
    const count = row.count;
    stats.total += count;
    switch (row.status) {
      case "pending": stats.pending += count; break;
      case "processing": stats.processing += count; break;
      case "completed": stats.completed += count; break;
      case "failed": stats.failed += count; break;
      case "dead_letter": stats.deadLetter += count; break;
    }
  }

  return stats;
}

/**
 * List items from the queue with optional filtering.
 */
export function listQueueItems(options?: {
  status?: QueueStatus;
  actionType?: string;
  limit?: number;
  offset?: number;
}): ActionQueueItem[] {
  ensureActionQueueSchema();
  const db = getDb();

  let sql = `SELECT id, action_type, payload_json, priority, status, attempts, max_attempts,
                    scheduled_at, created_at, last_error, processed_at
             FROM action_queue WHERE 1=1`;
  const params: (string | number)[] = [];

  if (options?.status) {
    sql += ` AND status = ?`;
    params.push(options.status);
  }
  if (options?.actionType) {
    sql += ` AND action_type = ?`;
    params.push(options.actionType);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(options?.limit || 50, options?.offset || 0);

  const rows = db.query(sql).all(...params) as RawActionQueueRow[];
  return rows.map((row): ActionQueueItem => ({
    id: row.id,
    actionType: row.action_type,
    payloadJson: row.payload_json,
    priority: row.priority,
    status: row.status as QueueStatus,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
    lastError: row.last_error ?? undefined,
    processedAt: row.processed_at ?? undefined,
  }));
}

/**
 * Purge completed/failed items older than the given age.
 */
export function purgeOldItems(maxAgeHours: number = 24): number {
  const db = getDb();
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeHours * 3600;

  const result = db.run(
    `DELETE FROM action_queue WHERE (status = 'completed' OR status = 'dead_letter') AND created_at < ?`,
    [cutoff]
  );

  const deleted = result.changes;
  if (deleted > 0) {
    logger.info(`Purged ${deleted} old queue items (> ${maxAgeHours}h)`);
  }
  return deleted;
}

// ---------------------------------------------------------------------------
// Worker — processes pending actions
// ---------------------------------------------------------------------------

/**
 * Process the next batch of pending actions.
 * Called by the cron job every 2 minutes.
 */
export async function processActionQueue(batchSize: number = 5): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  ensureActionQueueSchema();

  const result = { processed: 0, succeeded: 0, failed: 0 };

  for (let i = 0; i < batchSize; i++) {
    const item = dequeueAction();
    if (!item) break;

    result.processed++;

    try {
      await executeAction(item);
      markCompleted(item.id);
      result.succeeded++;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      markFailed(item.id, errorMessage);
      result.failed++;
    }
  }

  if (result.processed > 0) {
    logger.info(`Queue processing: ${result.succeeded} succeeded, ${result.failed} failed (${result.processed} total)`);
    logQueue({
      status: "completed",
      startedAt: new Date().toISOString(),
      durationMs: 0,
    });
  }

  return result;
}

/**
 * Execute a single action. This is where the actual work happens.
 * Each action type dispatches to its handler.
 */
async function executeAction(item: ActionQueueItem): Promise<void> {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(item.payloadJson);
  } catch {
    logger.warn(`Action #${item.id} has invalid JSON payload`);
  }

  logger.debug(`Executing action #${item.id} [${item.actionType}]`, { payload });

  switch (item.actionType) {
    case "ai_summary": {
      // Delegate to AI summary service (Zone D)
      logger.debug(`AI summary action #${item.id} — delegating to AI service`);
      // await generateSummary(payload);
      break;
    }

    case "webhook_dispatch": {
      // Delegate to webhook dispatcher (Zone 8)
      logger.debug(`Webhook dispatch action #${item.id} — delegating to webhook service`);
      const { dispatchWebhook } = await import("../services/webhook-dispatcher").catch(() => ({ dispatchWebhook: null }));
      if (dispatchWebhook && isDispatchOptions(payload)) {
        await dispatchWebhook(payload);
      }
      break;
    }

    case "enforcement": {
      // Delegate to enforcement engine (Zone M)
      logger.debug(`Enforcement action #${item.id} — delegating to enforcement service`);
      // await applyEnforcement(payload);
      break;
    }

    case "report_generation": {
      logger.debug(`Report generation action #${item.id}`);
      // Placeholder: generate periodic reports
      break;
    }

    case "data_cleanup": {
      logger.debug(`Data cleanup action #${item.id}`);
      // Placeholder: cleanup old data
      break;
    }

    default: {
      logger.warn(`Unknown action type: ${item.actionType}`);
    }
  }
}

// Redirect to the real webhook dispatcher
export { dispatchWebhook } from "@services/webhook-dispatcher";
