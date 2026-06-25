/**
 * Alert Generation & Management Service
 *
 * Provides:
 *   - generateAlert() — Creates alerts from risk conditions
 *   - getAlerts() — List with filtering (severity, type, status, time range)
 *   - acknowledgeAlert() — Mark as acknowledged
 *   - resolveAlert() — Mark as resolved
 *   - getAlertSummary() — Counts by severity/status
 *
 * Zone 8: Webhook Alerts — Tech Innovation Theme (#0066ff)
 */

import { getDb } from "@db/index";
import { logRiskAlert } from "@utils/tableLogger";
import { NotFoundError, ValidationError } from "@utils/errors";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export type AlertType =
  | "risk_alert"
  | "system_alert"
  | "pattern_alert"
  | "enforcement_alert"
  | "webhook_failure"
  | "circuit_breaker"
  | "ip_flag"
  | "compliance";

export interface RiskAlert {
  id: number;
  alertId: string;
  severity: AlertSeverity;
  alertType: AlertType;
  message: string;
  source?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAlertInput {
  severity: AlertSeverity;
  alertType: AlertType;
  message: string;
  source?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertFilter {
  severity?: AlertSeverity;
  alertType?: AlertType;
  status?: AlertStatus;
  acknowledged?: boolean;
  resolved?: boolean;
  source?: string;
  entityType?: string;
  entityId?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  offset?: number;
}

export interface AlertSummary {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byStatus: Record<AlertStatus, number>;
  byType: Record<string, number>;
  criticalUnacknowledged: number;
  open: number;
}

// ---------------------------------------------------------------------------
// Internal: Row mapper
// ---------------------------------------------------------------------------

interface AlertLogRow {
  id: number;
  alert_id: string;
  severity: string;
  alert_type: string;
  message: string;
  source: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  metadata_json: string;
  acknowledged: number;
  acknowledged_by: string | null;
  acknowledged_at: number | null;
  resolved: number;
  resolved_by: string | null;
  resolved_at: number | null;
  created_at: number;
  updated_at: number;
}

function mapAlertRow(row: AlertLogRow): RiskAlert {
  return {
    id: row.id,
    alertId: row.alert_id,
    severity: row.severity as AlertSeverity,
    alertType: row.alert_type as AlertType,
    message: row.message,
    source: row.source ?? undefined,
    relatedEntityType: row.related_entity_type ?? undefined,
    relatedEntityId: row.related_entity_id ?? undefined,
    metadata: safeJsonParse<Record<string, unknown>>(row.metadata_json, {}),
    acknowledged: row.acknowledged === 1,
    acknowledgedBy: row.acknowledged_by ?? undefined,
    acknowledgedAt: row.acknowledged_at ?? undefined,
    resolved: row.resolved === 1,
    resolvedBy: row.resolved_by ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
// Alert CRUD
// ---------------------------------------------------------------------------

/**
 * Generate a new alert from risk conditions.
 */
export function generateAlert(input: CreateAlertInput): RiskAlert {
  const db = getDb();
  const alertId = `alert_${randomUUID().slice(0, 10)}`;
  const now = Math.floor(Date.now() / 1000);

  // Validate
  if (!input.message?.trim()) throw ValidationError.field("message", "required");
  const validSeverities: AlertSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  if (!validSeverities.includes(input.severity)) {
    throw ValidationError.field("severity", "must be CRITICAL, HIGH, MEDIUM, or LOW", input.severity);
  }

  db.run(
    `INSERT INTO alert_log (
      alert_id, severity, alert_type, message, source,
      related_entity_type, related_entity_id, metadata_json,
      acknowledged, resolved, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    [
      alertId,
      input.severity,
      input.alertType,
      input.message.trim(),
      input.source ?? null,
      input.relatedEntityType ?? null,
      input.relatedEntityId ?? null,
      JSON.stringify(input.metadata ?? {}),
      now,
      now,
    ]
  );

  const row = db
    .query<AlertLogRow, [string]>("SELECT * FROM alert_log WHERE alert_id = ?")
    .get(alertId);

  if (!row) throw new Error("Failed to create alert");

  const alert = mapAlertRow(row);

  logRiskAlert({
    alertId,
    alertType: input.alertType,
    severity: input.severity,
    source: input.source,
    entityType: input.relatedEntityType,
    entityId: input.relatedEntityId,
    message: input.message,
  });

  return alert;
}

/**
 * Get a single alert by ID.
 */
export function getAlert(alertId: string): RiskAlert {
  const db = getDb();
  const row = db
    .query<AlertLogRow, [string]>("SELECT * FROM alert_log WHERE alert_id = ?")
    .get(alertId);

  if (!row) throw new NotFoundError(`Alert ${alertId} not found`, "ALERT_NOT_FOUND", "alert", alertId);

  return mapAlertRow(row);
}

/**
 * List alerts with comprehensive filtering.
 */
export function getAlerts(filter: AlertFilter = {}): { items: RiskAlert[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filter.severity) {
    conditions.push("severity = ?");
    params.push(filter.severity);
  }

  if (filter.alertType) {
    conditions.push("alert_type = ?");
    params.push(filter.alertType);
  }

  if (filter.source) {
    conditions.push("source = ?");
    params.push(filter.source);
  }

  if (filter.entityType) {
    conditions.push("related_entity_type = ?");
    params.push(filter.entityType);
  }

  if (filter.entityId) {
    conditions.push("related_entity_id = ?");
    params.push(filter.entityId);
  }

  if (filter.acknowledged !== undefined) {
    conditions.push("acknowledged = ?");
    params.push(filter.acknowledged ? 1 : 0);
  }

  if (filter.resolved !== undefined) {
    conditions.push("resolved = ?");
    params.push(filter.resolved ? 1 : 0);
  }

  if (filter.status === "open") {
    conditions.push("acknowledged = 0 AND resolved = 0");
  } else if (filter.status === "acknowledged") {
    conditions.push("acknowledged = 1 AND resolved = 0");
  } else if (filter.status === "resolved") {
    conditions.push("resolved = 1");
  }

  if (filter.fromTimestamp !== undefined) {
    conditions.push("created_at >= ?");
    params.push(filter.fromTimestamp);
  }

  if (filter.toTimestamp !== undefined) {
    conditions.push("created_at <= ?");
    params.push(filter.toTimestamp);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;

  const rows = db
    .query<AlertLogRow, any[]>(`SELECT * FROM alert_log ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  const countRow = db
    .query<{ count: number }, any[]>(`SELECT COUNT(*) as count FROM alert_log ${whereClause}`)
    .get(...params);

  return {
    items: rows.map(mapAlertRow),
    total: countRow?.count ?? 0,
  };
}

/**
 * Acknowledge an alert.
 */
export function acknowledgeAlert(alertId: string, acknowledgedBy: string): RiskAlert {
  const db = getDb();

  // Verify exists
  getAlert(alertId);

  const now = Math.floor(Date.now() / 1000);

  db.run(
    `UPDATE alert_log SET
      acknowledged = 1,
      acknowledged_by = ?,
      acknowledged_at = ?,
      updated_at = ?
    WHERE alert_id = ?`,
    [acknowledgedBy, now, now, alertId]
  );

  logRiskAlert({
    alertId,
    severity: "INFO",
    source: acknowledgedBy,
    message: "Alert acknowledged",
  });

  return getAlert(alertId);
}

/**
 * Resolve an alert.
 */
export function resolveAlert(alertId: string, resolvedBy: string): RiskAlert {
  const db = getDb();

  // Verify exists
  getAlert(alertId);

  const now = Math.floor(Date.now() / 1000);

  db.run(
    `UPDATE alert_log SET
      acknowledged = 1,
      resolved = 1,
      resolved_by = ?,
      resolved_at = ?,
      updated_at = ?
    WHERE alert_id = ?`,
    [resolvedBy, now, now, alertId]
  );

  logRiskAlert({
    alertId,
    severity: "INFO",
    source: resolvedBy,
    message: "Alert resolved",
  });

  return getAlert(alertId);
}

/**
 * Get alert summary (counts by severity, status, type).
 */
export function getAlertSummary(): AlertSummary {
  const db = getDb();

  // Total count
  const totalRow = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM alert_log").get();

  // By severity
  const severityRows = db
    .query<{ severity: string; count: number }, []>(
      "SELECT severity, COUNT(*) as count FROM alert_log GROUP BY severity"
    )
    .all();

  // By acknowledged/resolved status
  const statusRows = db
    .query<{ acknowledged: number; resolved: number; count: number }, []>(
      "SELECT acknowledged, resolved, COUNT(*) as count FROM alert_log GROUP BY acknowledged, resolved"
    )
    .all();

  // By type
  const typeRows = db
    .query<{ alert_type: string; count: number }, []>(
      "SELECT alert_type, COUNT(*) as count FROM alert_log GROUP BY alert_type"
    )
    .all();

  // Critical unacknowledged
  const criticalRow = db
    .query<{ count: number }, []>(
      "SELECT COUNT(*) as count FROM alert_log WHERE severity = 'CRITICAL' AND acknowledged = 0"
    )
    .get();

  const bySeverity: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const row of severityRows) {
    bySeverity[row.severity] = row.count;
  }

  const byStatus: Record<string, number> = { open: 0, acknowledged: 0, resolved: 0 };
  for (const row of statusRows) {
    if (row.resolved === 1) {
      byStatus.resolved += row.count;
    } else if (row.acknowledged === 1) {
      byStatus.acknowledged += row.count;
    } else {
      byStatus.open += row.count;
    }
  }

  const byType: Record<string, number> = {};
  for (const row of typeRows) {
    byType[row.alert_type] = row.count;
  }

  return {
    total: totalRow?.count ?? 0,
    bySeverity: bySeverity as Record<AlertSeverity, number>,
    byStatus: byStatus as Record<AlertStatus, number>,
    byType,
    criticalUnacknowledged: criticalRow?.count ?? 0,
    open: byStatus.open,
  };
}

/**
 * Delete old resolved alerts (for cleanup cron).
 */
export function deleteOldAlerts(olderThanSeconds: number): number {
  const db = getDb();

  const cutoff = Math.floor(Date.now() / 1000) - olderThanSeconds;

  const result = db.run(
    "DELETE FROM alert_log WHERE resolved = 1 AND resolved_at < ?",
    [cutoff]
  );

  return result.changes ?? 0;
}

/**
 * Bulk acknowledge alerts matching a filter.
 */
export function bulkAcknowledge(filter: AlertFilter, acknowledgedBy: string): number {
  const db = getDb();

  const conditions: string[] = ["acknowledged = 0"];
  const params: (string | number)[] = [];

  if (filter.severity) {
    conditions.push("severity = ?");
    params.push(filter.severity);
  }

  if (filter.alertType) {
    conditions.push("alert_type = ?");
    params.push(filter.alertType);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const now = Math.floor(Date.now() / 1000);

  const result = db.run(
    `UPDATE alert_log SET
      acknowledged = 1,
      acknowledged_by = ?,
      acknowledged_at = ?,
      updated_at = ?
    ${whereClause}`,
    [acknowledgedBy, now, now, ...params]
  );

  logRiskAlert({
    severity: "INFO",
    source: acknowledgedBy,
    message: `Bulk acknowledged ${result.changes ?? 0} alerts`,
  });

  return result.changes ?? 0;
}
