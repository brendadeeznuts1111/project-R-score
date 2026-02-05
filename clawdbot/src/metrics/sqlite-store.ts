/**
 * SQLite Metrics Store - Persistent metrics storage with WAL mode.
 * High-performance storage using Bun's native SQLite bindings.
 */

import { Database } from "bun:sqlite";
import { join } from "node:path";
import { STATE_DIR_CLAWDBOT } from "../config/config.js";
import type { Alert } from "./protocol.js";
import type { SkillExecutionRecord } from "./types.js";

const METRICS_DB = "metrics.db";

export type StoredMetric = {
  id: number;
  skillId: string;
  command: string;
  duration: number;
  success: boolean;
  error: string | null;
  timestamp: number;
};

export type StoredAlert = {
  id: string;
  type: string;
  severity: string;
  message: string;
  value: number;
  threshold: number;
  skillId: string | null;
  dismissed: boolean;
  timestamp: number;
};

export class SQLiteMetricsStore {
  private db: Database;
  private insertMetric: ReturnType<Database["prepare"]>;
  private insertAlert: ReturnType<Database["prepare"]>;

  constructor(dbPath?: string) {
    const path = dbPath ?? join(STATE_DIR_CLAWDBOT, METRICS_DB);
    this.db = new Database(path);

    // Enable WAL mode for better concurrent read/write performance
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA synchronous = NORMAL;");
    this.db.exec("PRAGMA cache_size = 10000;");
    this.db.exec("PRAGMA temp_store = MEMORY;");

    this.initSchema();

    // Prepare statements for performance
    this.insertMetric = this.db.prepare(`
      INSERT INTO skill_metrics (skill_id, command, duration, success, error, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    this.insertAlert = this.db.prepare(`
      INSERT INTO alerts (id, type, severity, message, value, threshold, skill_id, dismissed, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  private initSchema(): void {
    this.db.exec(`
      -- Skill execution metrics
      CREATE TABLE IF NOT EXISTS skill_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_id TEXT NOT NULL,
        command TEXT NOT NULL,
        duration INTEGER NOT NULL,
        success INTEGER NOT NULL,
        error TEXT,
        timestamp INTEGER NOT NULL
      );

      -- Indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_metrics_skill ON skill_metrics(skill_id);
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON skill_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_metrics_skill_ts ON skill_metrics(skill_id, timestamp);

      -- Alerts table
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        value REAL NOT NULL,
        threshold REAL NOT NULL,
        skill_id TEXT,
        dismissed INTEGER DEFAULT 0,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_alerts_dismissed ON alerts(dismissed);

      -- Aggregated metrics (hourly rollups)
      CREATE TABLE IF NOT EXISTS hourly_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_id TEXT NOT NULL,
        hour INTEGER NOT NULL,
        total_executions INTEGER NOT NULL,
        success_count INTEGER NOT NULL,
        failure_count INTEGER NOT NULL,
        avg_duration REAL NOT NULL,
        min_duration INTEGER NOT NULL,
        max_duration INTEGER NOT NULL,
        p95_duration REAL,
        UNIQUE(skill_id, hour)
      );

      CREATE INDEX IF NOT EXISTS idx_hourly_skill ON hourly_metrics(skill_id);
      CREATE INDEX IF NOT EXISTS idx_hourly_hour ON hourly_metrics(hour);
    `);
  }

  /**
   * Record a skill execution.
   */
  recordExecution(record: SkillExecutionRecord): void {
    this.insertMetric.run(
      record.skillId,
      record.command,
      Math.round(record.duration),
      record.success ? 1 : 0,
      record.error ?? null,
      new Date(record.timestamp).getTime(),
    );
  }

  /**
   * Record multiple executions in a transaction.
   */
  recordExecutionsBatch(records: SkillExecutionRecord[]): void {
    const tx = this.db.transaction((recs: SkillExecutionRecord[]) => {
      for (const record of recs) {
        this.insertMetric.run(
          record.skillId,
          record.command,
          Math.round(record.duration),
          record.success ? 1 : 0,
          record.error ?? null,
          new Date(record.timestamp).getTime(),
        );
      }
    });
    tx(records);
  }

  /**
   * Record an alert.
   */
  recordAlert(alert: Alert): void {
    this.insertAlert.run(
      alert.id,
      alert.type,
      alert.severity,
      alert.message,
      alert.value,
      alert.threshold,
      alert.skillId ?? null,
      alert.dismissed ? 1 : 0,
      alert.timestamp,
    );
  }

  /**
   * Dismiss an alert.
   */
  dismissAlert(alertId: string): void {
    this.db.prepare("UPDATE alerts SET dismissed = 1 WHERE id = ?").run(alertId);
  }

  /**
   * Get recent executions for a skill.
   */
  getRecentExecutions(skillId: string, limit = 100): StoredMetric[] {
    return this.db
      .prepare(
        `
      SELECT id, skill_id as skillId, command, duration, success, error, timestamp
      FROM skill_metrics
      WHERE skill_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `,
      )
      .all(skillId, limit) as StoredMetric[];
  }

  /**
   * Get all recent executions.
   */
  getAllRecentExecutions(limit = 100): StoredMetric[] {
    return this.db
      .prepare(
        `
      SELECT id, skill_id as skillId, command, duration, success, error, timestamp
      FROM skill_metrics
      ORDER BY timestamp DESC
      LIMIT ?
    `,
      )
      .all(limit) as StoredMetric[];
  }

  /**
   * Get skill aggregate metrics.
   */
  getSkillAggregates(
    skillId: string,
    since?: number,
  ): {
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
  } | null {
    const sinceTs = since ?? Date.now() - 24 * 60 * 60 * 1000; // Default: last 24h

    const result = this.db
      .prepare(
        `
      SELECT
        COUNT(*) as totalExecutions,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successCount,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failureCount,
        AVG(duration) as avgDuration,
        MIN(duration) as minDuration,
        MAX(duration) as maxDuration
      FROM skill_metrics
      WHERE skill_id = ? AND timestamp >= ?
    `,
      )
      .get(skillId, sinceTs) as {
      totalExecutions: number;
      successCount: number;
      failureCount: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
    } | null;

    return result;
  }

  /**
   * Get all skill aggregates.
   */
  getAllSkillAggregates(since?: number): Array<{
    skillId: string;
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    avgDuration: number;
  }> {
    const sinceTs = since ?? Date.now() - 24 * 60 * 60 * 1000;

    return this.db
      .prepare(
        `
      SELECT
        skill_id as skillId,
        COUNT(*) as totalExecutions,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successCount,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failureCount,
        AVG(duration) as avgDuration
      FROM skill_metrics
      WHERE timestamp >= ?
      GROUP BY skill_id
      ORDER BY totalExecutions DESC
    `,
      )
      .all(sinceTs) as Array<{
      skillId: string;
      totalExecutions: number;
      successCount: number;
      failureCount: number;
      avgDuration: number;
    }>;
  }

  /**
   * Get active (non-dismissed) alerts.
   */
  getActiveAlerts(limit = 50): StoredAlert[] {
    return this.db
      .prepare(
        `
      SELECT id, type, severity, message, value, threshold, skill_id as skillId, dismissed, timestamp
      FROM alerts
      WHERE dismissed = 0
      ORDER BY timestamp DESC
      LIMIT ?
    `,
      )
      .all(limit) as StoredAlert[];
  }

  /**
   * Calculate P95 latency for a skill.
   */
  getP95Latency(skillId: string, since?: number): number | null {
    const sinceTs = since ?? Date.now() - 24 * 60 * 60 * 1000;

    const result = this.db
      .prepare(
        `
      SELECT duration
      FROM skill_metrics
      WHERE skill_id = ? AND timestamp >= ?
      ORDER BY duration ASC
    `,
      )
      .all(skillId, sinceTs) as Array<{ duration: number }>;

    if (result.length === 0) return null;

    const p95Index = Math.floor(result.length * 0.95);
    return result[p95Index]?.duration ?? result[result.length - 1].duration;
  }

  /**
   * Rollup hourly metrics (call periodically).
   */
  rollupHourlyMetrics(): void {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const currentHour = Math.floor(Date.now() / (60 * 60 * 1000)) * (60 * 60 * 1000);

    this.db.exec(`
      INSERT OR REPLACE INTO hourly_metrics (skill_id, hour, total_executions, success_count, failure_count, avg_duration, min_duration, max_duration, p95_duration)
      SELECT
        skill_id,
        ${currentHour} as hour,
        COUNT(*) as total_executions,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failure_count,
        AVG(duration) as avg_duration,
        MIN(duration) as min_duration,
        MAX(duration) as max_duration,
        NULL as p95_duration
      FROM skill_metrics
      WHERE timestamp >= ${hourAgo} AND timestamp < ${currentHour + 60 * 60 * 1000}
      GROUP BY skill_id
    `);
  }

  /**
   * Cleanup old data.
   */
  cleanup(olderThanDays: number): { metricsDeleted: number; alertsDeleted: number } {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const metricsResult = this.db
      .prepare("DELETE FROM skill_metrics WHERE timestamp < ?")
      .run(cutoff);
    const alertsResult = this.db
      .prepare("DELETE FROM alerts WHERE timestamp < ? AND dismissed = 1")
      .run(cutoff);

    return {
      metricsDeleted: metricsResult.changes,
      alertsDeleted: alertsResult.changes,
    };
  }

  /**
   * Get database stats.
   */
  getStats(): { metricsCount: number; alertsCount: number; dbSizeBytes: number } {
    const metrics = this.db.prepare("SELECT COUNT(*) as count FROM skill_metrics").get() as {
      count: number;
    };
    const alerts = this.db.prepare("SELECT COUNT(*) as count FROM alerts").get() as {
      count: number;
    };
    const pageCount = this.db.prepare("PRAGMA page_count").get() as { page_count: number };
    const pageSize = this.db.prepare("PRAGMA page_size").get() as { page_size: number };

    return {
      metricsCount: metrics.count,
      alertsCount: alerts.count,
      dbSizeBytes: pageCount.page_count * pageSize.page_size,
    };
  }

  /**
   * Close the database connection.
   */
  close(): void {
    this.db.close();
  }
}
