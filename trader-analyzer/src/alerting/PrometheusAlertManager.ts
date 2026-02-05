#!/usr/bin/env bun
/**
 * @fileoverview Prometheus Alert Manager
 * @description 6.1.1.2.2.8.1.1.2.8.4 - Alert management system for fhSPREAD deviation detection
 * @module alerting/PrometheusAlertManager
 *
 * @see {@link ../../../docs/ANTI-PATTERNS.md|Anti-Patterns Guide} for coding best practices
 * @see {@link ../../../docs/NAMING-CONVENTIONS.md|Naming Conventions} for code style guidelines
 */

import { Database } from "bun:sqlite"

/**
 * Alert severity levels
 */
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL"

/**
 * Alert data structure
 */
export interface AlertData {
  severity: AlertSeverity
  category: string
  marketId: string
  deviation: number
  deviatingNodes: number
  message: string
  timestamp?: number
}

/**
 * Alert rule for Prometheus-style alerting
 */
export interface AlertRule {
  alert: string
  expr: string
  for: string
  labels: Record<string, string>
  annotations: {
    summary: string
    description: string
    runbook?: string
  }
}

/**
 * 6.1.1.2.2.8.1.1.2.8.4: PrometheusAlertManager
 *
 * Handles alert generation, persistence, and notification for the fhSPREAD subsystem.
 * Integrates with Prometheus metrics for rule-based alerting.
 */
export class PrometheusAlertManager {
  private db: Database
  private alertRules = new Map<string, AlertRule>()

  /**
   * Constructor
   */
  constructor(db: Database) {
    this.db = db
    this.initializeDatabase()
    this.loadDefaultRules()
  }

  /**
   * Initialize database tables for alert storage
   */
  private initializeDatabase(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        severity TEXT NOT NULL,
        category TEXT NOT NULL,
        marketId TEXT NOT NULL,
        deviation REAL,
        deviatingNodes INTEGER,
        message TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        acknowledged INTEGER DEFAULT 0,
        resolved INTEGER DEFAULT 0
      )
    `)

    // Create indexes for efficient querying
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_category ON alerts(category)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_market ON alerts(marketId)`)
  }

  /**
   * Load default alert rules
   */
  private loadDefaultRules(): void {
    // fhSPREAD deviation alert rule
    this.alertRules.set("fhspread-deviation", {
      alert: "FhSpreadSignificantDeviation",
      expr: "rate(fhspread_deviation_significant_total[5m]) > 2",
      for: "2m",
      labels: {
        severity: "warning",
        team: "trading",
      },
      annotations: {
        summary: "Multiple significant spread deviations detected",
        description:
          "{{ $value }} deviations/minute exceeding 3% threshold. Potential bait lines or sharp money.",
        runbook: "https://wiki.hyperbun.com/runbooks/fhspread-deviation",
      },
    })
  }

  /**
   * Notify about an alert condition
   */
  async notify(alert: AlertData): Promise<void> {
    const timestamp = alert.timestamp || Date.now()

    // Store alert in database
    const stmt = this.db.prepare(`
      INSERT INTO alerts (severity, category, marketId, deviation, deviatingNodes, message, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      alert.severity,
      alert.category,
      alert.marketId,
      alert.deviation,
      alert.deviatingNodes,
      alert.message,
      timestamp
    )

    // Log alert for immediate visibility
    console.warn(`[ALERT] ${alert.severity}: ${alert.category}`, {
      marketId: alert.marketId,
      deviation: alert.deviation,
      deviatingNodes: alert.deviatingNodes,
      message: alert.message,
      timestamp,
    })

    // TODO: Integrate with external notification systems (PagerDuty, Slack, etc.)
    // This would send HTTP requests to external alerting services
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(
    options: { category?: string; severity?: AlertSeverity; limit?: number; since?: number } = {}
  ): Array<AlertData & { id: number; acknowledged: boolean; resolved: boolean }> {
    let query = `SELECT * FROM alerts WHERE 1=1`
    const params: any[] = []

    if (options.category) {
      query += ` AND category = ?`
      params.push(options.category)
    }

    if (options.severity) {
      query += ` AND severity = ?`
      params.push(options.severity)
    }

    if (options.since) {
      query += ` AND timestamp >= ?`
      params.push(options.since)
    }

    query += ` ORDER BY timestamp DESC`

    if (options.limit) {
      query += ` LIMIT ?`
      params.push(options.limit)
    }

    const results = this.db.prepare(query).all(...params) as any[]

    return results.map((row) => ({
      id: row.id,
      severity: row.severity as AlertSeverity,
      category: row.category,
      marketId: row.marketId,
      deviation: row.deviation,
      deviatingNodes: row.deviatingNodes,
      message: row.message,
      timestamp: row.timestamp,
      acknowledged: row.acknowledged === 1,
      resolved: row.resolved === 1,
    }))
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: number): void {
    this.db.prepare(`UPDATE alerts SET acknowledged = 1 WHERE id = ?`).run(alertId)
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: number): void {
    this.db.prepare(`UPDATE alerts SET resolved = 1 WHERE id = ?`).run(alertId)
  }

  /**
   * Get alert rules (for Prometheus configuration)
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values())
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(name: string, rule: AlertRule): void {
    this.alertRules.set(name, rule)
  }
}
