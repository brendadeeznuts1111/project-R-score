/**
 * Alerts System for Suspicious Activity
 *
 * Detects and manages security alerts and suspicious activity
 */

import { MonitoringSystem, MonitoringEvent } from "./MonitoringSystem";
import path from "node:path";

const __dirname = import.meta.dir;
const ROOT_DIR = path.resolve(__dirname, "../..");
const ALERTS_DB_PATH = path.join(ROOT_DIR, "monitoring-alerts.db");

export interface Alert {
  id?: number;
  timestamp: number;
  type: "rate_limit" | "brute_force" | "ddos" | "unusual_traffic" | "unauthorized_access" | "data_anomaly" | "geo_anomaly";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  ip: string;
  environment: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  type: Alert["type"];
  severity: Alert["severity"];
  enabled: boolean;
  threshold: number;
  windowSeconds: number;
  description: string;
  lastTriggered?: number;
}

export class AlertsSystem {
  private monitoring: MonitoringSystem;
  private db: any; // Using any to avoid import issues

  constructor(monitoring: MonitoringSystem, dbPath: string = ALERTS_DB_PATH) {
    this.monitoring = monitoring;
    // @ts-ignore - Using dynamic import
    const { Database } = require("bun:sqlite");
    this.db = new Database(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.initializeSchema();
    this.initializeDefaultRules();
  }

  private initializeSchema(): void {
    // Alerts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        ip TEXT NOT NULL,
        environment TEXT NOT NULL,
        details TEXT NOT NULL,
        resolved INTEGER NOT NULL DEFAULT 0,
        resolvedAt INTEGER,
        resolvedBy TEXT
      )
    `);

    // Alert rules table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        threshold REAL NOT NULL,
        windowSeconds INTEGER NOT NULL,
        description TEXT NOT NULL,
        lastTriggered INTEGER
      )
    `);

    // Indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity)`);
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const rules: AlertRule[] = [
      {
        id: "rate-limit-exceeded",
        name: "Rate Limit Exceeded",
        type: "rate_limit",
        severity: "medium",
        enabled: true,
        threshold: 1000, // requests per minute
        windowSeconds: 60,
        description: "Detects when rate limiting thresholds are exceeded",
      },
      {
        id: "brute-force-login",
        name: "Brute Force Login Attempt",
        type: "brute_force",
        severity: "high",
        enabled: true,
        threshold: 10, // failed login attempts
        windowSeconds: 300, // 5 minutes
        description: "Detects potential brute force login attacks",
      },
      {
        id: "unusual-traffic-spike",
        name: "Unusual Traffic Spike",
        type: "ddos",
        severity: "high",
        enabled: true,
        threshold: 5, // 5x normal traffic
        windowSeconds: 60,
        description: "Detects sudden traffic spikes that may indicate DDoS",
      },
      {
        id: "unusual-endpoint-access",
        name: "Unusual Endpoint Access",
        type: "unusual_traffic",
        severity: "medium",
        enabled: true,
        threshold: 100, // requests to rare endpoint
        windowSeconds: 300,
        description: "Detects unusual access patterns to sensitive endpoints",
      },
      {
        id: "high-error-rate",
        name: "High Error Rate",
        type: "data_anomaly",
        severity: "medium",
        enabled: true,
        threshold: 0.5, // 50% error rate
        windowSeconds: 300,
        description: "Detects unusually high error rates",
      },
      {
        id: "suspicious-user-agent",
        name: "Suspicious User Agent",
        type: "unusual_traffic",
        severity: "low",
        enabled: true,
        threshold: 1,
        windowSeconds: 60,
        description: "Detects requests from suspicious user agents",
      },
    ];

    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO alert_rules (id, name, type, severity, enabled, threshold, windowSeconds, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    rules.forEach(rule => {
      insert.run(
        rule.id,
        rule.name,
        rule.type,
        rule.severity,
        rule.enabled ? 1 : 0,
        rule.threshold,
        rule.windowSeconds,
        rule.description
      );
    });
  }

  /**
   * Check event against alert rules
   */
  async checkEvent(event: MonitoringEvent): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const rules = this.getActiveRules();

    for (const rule of rules) {
      const alert = await this.checkRule(event, rule);
      if (alert) {
        alerts.push(alert);
      }
    }

    return alerts;
  }

  /**
   * Check event against specific rule
   */
  private async checkRule(event: MonitoringEvent, rule: AlertRule): Promise<Alert | null> {
    const { id, type, threshold, windowSeconds } = rule;

    switch (id) {
      case "rate-limit-exceeded": {
        const isLimited = this.monitoring.isRateLimited(
          event.ip,
          event.environment,
          threshold,
          windowSeconds
        );
        if (isLimited) {
          return {
            timestamp: Date.now(),
            type,
            severity: rule.severity,
            title: rule.name,
            description: `IP ${event.ip} exceeded rate limit of ${threshold} requests per ${windowSeconds}s`,
            ip: event.ip,
            environment: event.environment,
            details: {
              endpoint: event.endpoint,
              method: event.method,
              threshold,
              windowSeconds,
            },
            resolved: false,
          };
        }
        break;
      }

      case "high-error-rate": {
        // Get error rate for this IP
        const windowStart = Date.now() - (windowSeconds * 1000);
        const events = this.monitoring.getIPEvents(event.ip, event.environment, 1000);
        const recentEvents = events.filter(e => e.timestamp > windowStart);
        const errorCount = recentEvents.filter(e => e.statusCode >= 400).length;
        const errorRate = recentEvents.length > 0 ? errorCount / recentEvents.length : 0;

        if (errorRate >= threshold && recentEvents.length > 10) {
          return {
            timestamp: Date.now(),
            type,
            severity: rule.severity,
            title: rule.name,
            description: `IP ${event.ip} has ${(errorRate * 100).toFixed(1)}% error rate (${errorCount}/${recentEvents.length} requests)`,
            ip: event.ip,
            environment: event.environment,
            details: {
              errorRate,
              errorCount,
              totalRequests: recentEvents.length,
              windowSeconds,
            },
            resolved: false,
          };
        }
        break;
      }

      case "unusual-traffic-spike": {
        // Calculate average traffic for this environment
        const summary = this.monitoring.getSummary();
        const avgRequestsPerMinute = summary.totalEvents / 60; // Rough estimate

        // Get recent requests from this IP
        const windowStart = Date.now() - (windowSeconds * 1000);
        const events = this.monitoring.getIPEvents(event.ip, event.environment, 10000);
        const recentEvents = events.filter(e => e.timestamp > windowStart);
        const requestsPerMinute = recentEvents.length / (windowSeconds / 60);

        if (requestsPerMinute > avgRequestsPerMinute * threshold && recentEvents.length > 50) {
          return {
            timestamp: Date.now(),
            type,
            severity: rule.severity,
            title: rule.name,
            description: `Unusual traffic spike from ${event.ip}: ${recentEvents.length} requests in last ${windowSeconds}s`,
            ip: event.ip,
            environment: event.environment,
            details: {
              requestsPerMinute: requestsPerMinute.toFixed(1),
              averageRequestsPerMinute: avgRequestsPerMinute.toFixed(1),
              spikeMultiplier: (requestsPerMinute / avgRequestsPerMinute).toFixed(1),
              requestCount: recentEvents.length,
            },
            resolved: false,
          };
        }
        break;
      }

      case "suspicious-user-agent": {
        const suspiciousPatterns = [
          /sqlmap/i,
          /nmap/i,
          /nikto/i,
          /metasploit/i,
          /havij/i,
          /w3af/i,
          /acunetix/i,
          /nessus/i,
          /openvas/i,
          /curl/i,
          /wget/i,
          /python-requests/i,
        ];

        const userAgent = event.userAgent || "";
        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

        if (isSuspicious) {
          return {
            timestamp: Date.now(),
            type,
            severity: rule.severity,
            title: rule.name,
            description: `Suspicious user agent detected: ${userAgent.slice(0, 100)}`,
            ip: event.ip,
            environment: event.environment,
            details: {
              userAgent: userAgent.slice(0, 200),
              endpoint: event.endpoint,
            },
            resolved: false,
          };
        }
        break;
      }
    }

    return null;
  }

  /**
   * Create alert
   */
  createAlert(alert: Alert): Alert {
    const stmt = this.db.prepare(`
      INSERT INTO alerts (timestamp, type, severity, title, description, ip, environment, details, resolved)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    stmt.run(
      alert.timestamp,
      alert.type,
      alert.severity,
      alert.title,
      alert.description,
      alert.ip,
      alert.environment,
      JSON.stringify(alert.details)
    );

    const id = this.db.lastInsertRowId;

    // Update rule last triggered
    this.db.prepare(`UPDATE alert_rules SET lastTriggered = ? WHERE type = ?`).run(
      Date.now(),
      alert.type
    );

    return { ...alert, id };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(limit: number = 100): Alert[] {
    const rows = this.db.prepare(`
      SELECT * FROM alerts WHERE resolved = 0 ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as any[];

    return rows.map(row => ({
      ...row,
      resolved: row.resolved === 1,
      details: JSON.parse(row.details),
    }));
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit: number = 100, offset: number = 0): Alert[] {
    const rows = this.db.prepare(`
      SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ? OFFSET ?
    `).all(limit, offset) as any[];

    return rows.map(row => ({
      ...row,
      resolved: row.resolved === 1,
      resolvedAt: row.resolvedAt,
      details: JSON.parse(row.details),
    }));
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    active: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    today: number;
  } {
    const total = this.db.prepare(`SELECT COUNT(*) as count FROM alerts`).get() as { count: number };
    const active = this.db.prepare(`SELECT COUNT(*) as count FROM alerts WHERE resolved = 0`).get() as { count: number };

    const byTypeRows = this.db.prepare(`
      SELECT type, COUNT(*) as count FROM alerts GROUP BY type ORDER BY count DESC
    `).all() as any[];
    const byType = byTypeRows.reduce((acc, row) => ({ ...acc, [row.type]: row.count }), {});

    const bySeverityRows = this.db.prepare(`
      SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity ORDER BY count DESC
    `).all() as any[];
    const bySeverity = bySeverityRows.reduce((acc, row) => ({ ...acc, [row.severity]: row.count }), {});

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = this.db.prepare(`
      SELECT COUNT(*) as count FROM alerts WHERE timestamp >= ?
    `).get(todayStart.getTime()) as { count: number };

    return {
      total: total.count,
      active: active.count,
      byType,
      bySeverity,
      today: today.count,
    };
  }

  /**
   * Resolve alert
   */
  resolveAlert(id: number, resolvedBy: string): boolean {
    const result = this.db.prepare(`
      UPDATE alerts SET resolved = 1, resolvedAt = ?, resolvedBy = ? WHERE id = ?
    `).run(Date.now(), resolvedBy, id);

    return result.changes > 0;
  }

  /**
   * Get active alert rules
   */
  getActiveRules(): AlertRule[] {
    const rows = this.db.prepare(`
      SELECT * FROM alert_rules WHERE enabled = 1
    `).all() as any[];

    return rows.map(row => ({
      ...row,
      enabled: row.enabled === 1,
    }));
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const fields = [];
    const values = [];

    if (updates.enabled !== undefined) {
      fields.push("enabled = ?");
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.threshold !== undefined) {
      fields.push("threshold = ?");
      values.push(updates.threshold);
    }
    if (updates.windowSeconds !== undefined) {
      fields.push("windowSeconds = ?");
      values.push(updates.windowSeconds);
    }

    if (fields.length === 0) return false;

    values.push(ruleId);

    const result = this.db.prepare(`
      UPDATE alert_rules SET ${fields.join(", ")} WHERE id = ?
    `).run(...values);

    return result.changes > 0;
  }

  /**
   * Cleanup old alerts
   */
  cleanup(olderThanDays: number = 30): number {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Only delete resolved alerts older than cutoff
    const result = this.db.prepare(`
      DELETE FROM alerts WHERE resolved = 1 AND resolvedAt < ?
    `).run(cutoff);

    return result.changes;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
