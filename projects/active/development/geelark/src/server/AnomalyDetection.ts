/**
 * Anomaly Detection System
 *
 * Detects unusual patterns and anomalies in monitoring data
 */

import { MonitoringSystem, MonitoringEvent } from "./MonitoringSystem";

export interface Anomaly {
  id?: number;
  timestamp: number;
  type: "statistical" | "pattern" | "behavioral" | "performance";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  expectedRange: { min: number; max: number };
  confidence: number; // 0-1
  details: Record<string, any>;
  resolved: boolean;
}

export interface AnomalyConfig {
  // Statistical anomaly thresholds
  zScoreThreshold: number; // Default: 3 (3 standard deviations)
  minDataPoints: number; // Minimum data points required for analysis

  // Performance anomaly thresholds
  highResponseTimeThreshold: number; // milliseconds
  lowResponseTimeThreshold: number; // milliseconds
  highErrorRateThreshold: number; // 0-1

  // Pattern anomaly thresholds
  unusualEndpointThreshold: number; // requests per minute
  burstTrafficThreshold: number; // multiplier over baseline
  timeWindowMinutes: number; // Analysis window
}

export class AnomalyDetection {
  private monitoring: MonitoringSystem;
  private config: AnomalyConfig;
  private db: any; // Using any to avoid import issues
  private anomalyHistory: Map<string, number[]> = new Map();

  constructor(
    monitoring: MonitoringSystem,
    config: Partial<AnomalyConfig> = {},
    dbPath?: string
  ) {
    this.monitoring = monitoring;

    // @ts-ignore - Using dynamic import
    const { Database } = require("bun:sqlite");
    this.db = new Database(dbPath || "monitoring-anomalies.db");
    this.db.exec("PRAGMA journal_mode = WAL");

    this.config = {
      zScoreThreshold: config.zScoreThreshold || 3,
      minDataPoints: config.minDataPoints || 30,
      highResponseTimeThreshold: config.highResponseTimeThreshold || 5000,
      lowResponseTimeThreshold: config.lowResponseTimeThreshold || 5,
      highErrorRateThreshold: config.highErrorRateThreshold || 0.1,
      unusualEndpointThreshold: config.unusualEndpointThreshold || 100,
      burstTrafficThreshold: config.burstTrafficThreshold || 5,
      timeWindowMinutes: config.timeWindowMinutes || 5,
    };

    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Anomalies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS anomalies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        metric TEXT NOT NULL,
        currentValue REAL NOT NULL,
        expectedMin REAL NOT NULL,
        expectedMax REAL NOT NULL,
        confidence REAL NOT NULL,
        details TEXT NOT NULL,
        resolved INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(type)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_resolved ON anomalies(resolved)`);
  }

  /**
   * Run all anomaly detection algorithms
   */
  async detectAnomalies(environment: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // 1. Statistical anomalies in response times
    const responseTimeAnomalies = this.detectResponseTimeAnomalies(environment);
    anomalies.push(...responseTimeAnomalies);

    // 2. Error rate anomalies
    const errorRateAnomalies = this.detectErrorRateAnomalies(environment);
    anomalies.push(...errorRateAnomalies);

    // 3. Traffic pattern anomalies
    const trafficAnomalies = this.detectTrafficAnomalies(environment);
    anomalies.push(...trafficAnomalies);

    // 4. Endpoint anomalies
    const endpointAnomalies = this.detectEndpointAnomalies(environment);
    anomalies.push(...endpointAnomalies);

    // 5. Behavioral anomalies (unusual IP patterns)
    const behavioralAnomalies = this.detectBehavioralAnomalies(environment);
    anomalies.push(...behavioralAnomalies);

    // Save anomalies to database
    for (const anomaly of anomalies) {
      this.saveAnomaly(anomaly);
    }

    return anomalies;
  }

  /**
   * Detect statistical anomalies in response times using Z-score
   */
  private detectResponseTimeAnomalies(environment: string): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const metrics = this.monitoring.getEnvironmentMetrics(environment);

    // Get recent response times from monitoring data
    const topIPs = this.monitoring.getTopIPs(environment, 50);
    const allResponseTimes: number[] = [];

    for (const ipInfo of topIPs) {
      const events = this.monitoring.getIPEvents(ipInfo.ip, environment, 100);
      events.forEach(e => allResponseTimes.push(e.responseTime));
    }

    if (allResponseTimes.length < this.config.minDataPoints) {
      return anomalies;
    }

    // Calculate statistics
    const mean = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
    const variance = allResponseTimes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allResponseTimes.length;
    const stdDev = Math.sqrt(variance);

    // Detect outliers using Z-score
    for (const ipInfo of topIPs) {
      const events = this.monitoring.getIPEvents(ipInfo.ip, environment, 100);

      for (const event of events) {
        const zScore = Math.abs((event.responseTime - mean) / stdDev);

        if (zScore > this.config.zScoreThreshold) {
          const severity = this.calculateSeverity(zScore, this.config.zScoreThreshold);

          anomalies.push({
            timestamp: Date.now(),
            type: "statistical",
            severity,
            title: `Unusual Response Time from ${event.ip}`,
            description: `Response time of ${event.responseTime}ms is ${zScore.toFixed(1)} standard deviations from the mean (${mean.toFixed(0)}ms)`,
            metric: "responseTime",
            currentValue: event.responseTime,
            expectedRange: {
              min: Math.max(0, mean - (2 * stdDev)),
              max: mean + (2 * stdDev),
            },
            confidence: Math.min(zScore / this.config.zScoreThreshold, 1),
            details: {
              ip: event.ip,
              endpoint: event.endpoint,
              zScore: zScore.toFixed(2),
              mean: mean.toFixed(0),
              stdDev: stdDev.toFixed(0),
            },
            resolved: false,
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Detect error rate anomalies
   */
  private detectErrorRateAnomalies(environment: string): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const metrics = this.monitoring.getEnvironmentMetrics(environment);

    if (metrics.errorRate > this.config.highErrorRateThreshold) {
      const severity = metrics.errorRate > 0.5 ? "critical" : metrics.errorRate > 0.3 ? "high" : "medium";

      anomalies.push({
        timestamp: Date.now(),
        type: "performance",
        severity,
        title: `High Error Rate in ${environment}`,
        description: `Error rate of ${(metrics.errorRate * 100).toFixed(1)}% exceeds threshold of ${(this.config.highErrorRateThreshold * 100).toFixed(0)}%`,
        metric: "errorRate",
        currentValue: metrics.errorRate,
        expectedRange: {
          min: 0,
          max: this.config.highErrorRateThreshold,
        },
        confidence: Math.min(metrics.errorRate / this.config.highErrorRateThreshold, 1),
        details: {
          environment,
          totalRequests: metrics.totalRequests,
          errorCount: Math.floor(metrics.totalRequests * metrics.errorRate),
        },
        resolved: false,
      });
    }

    return anomalies;
  }

  /**
   * Detect traffic pattern anomalies (bursts, drops)
   */
  private detectTrafficAnomalies(environment: string): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Get traffic history for the last hour
    const now = Date.now();
    const windowSize = 5 * 60 * 1000; // 5 minutes
    const windows = 12; // 1 hour of data

    const trafficPerWindow: number[] = [];

    for (let i = 0; i < windows; i++) {
      const windowStart = now - ((i + 1) * windowSize);
      const windowEnd = now - (i * windowSize);

      // Count events in this window
      const summary = this.monitoring.getSummary();
      const windowEvents = summary.totalEvents / windows; // Rough estimate

      trafficPerWindow.push(windowEvents);
    }

    if (trafficPerWindow.length < this.config.minDataPoints) {
      return anomalies;
    }

    // Calculate baseline (excluding most recent window)
    const baselineWindows = trafficPerWindow.slice(1);
    const baseline = baselineWindows.reduce((a, b) => a + b, 0) / baselineWindows.length;
    const currentWindow = trafficPerWindow[0];

    // Detect traffic burst
    if (currentWindow > baseline * this.config.burstTrafficThreshold) {
      const burstMultiplier = currentWindow / baseline;

      anomalies.push({
        timestamp: Date.now(),
        type: "pattern",
        severity: burstMultiplier > 10 ? "critical" : "high",
        title: `Traffic Burst Detected in ${environment}`,
        description: `Current traffic (${currentWindow.toFixed(0)} requests/5min) is ${burstMultiplier.toFixed(1)}x higher than baseline (${baseline.toFixed(0)} requests/5min)`,
        metric: "trafficRate",
        currentValue: currentWindow,
        expectedRange: {
          min: baseline * 0.5,
          max: baseline * 2,
        },
        confidence: Math.min(burstMultiplier / this.config.burstTrafficThreshold, 1),
        details: {
          environment,
          burstMultiplier: burstMultiplier.toFixed(1),
          baseline: baseline.toFixed(0),
        },
        resolved: false,
      });
    }

    // Detect traffic drop
    if (currentWindow < baseline * 0.2 && baseline > 10) {
      const dropPercentage = ((baseline - currentWindow) / baseline) * 100;

      anomalies.push({
        timestamp: Date.now(),
        type: "pattern",
        severity: dropPercentage > 90 ? "critical" : "high",
        title: `Traffic Drop Detected in ${environment}`,
        description: `Traffic dropped by ${dropPercentage.toFixed(0)}% from baseline`,
        metric: "trafficRate",
        currentValue: currentWindow,
        expectedRange: {
          min: baseline * 0.5,
          max: baseline * 2,
        },
        confidence: Math.min(dropPercentage / 100, 1),
        details: {
          environment,
          dropPercentage: dropPercentage.toFixed(0),
          baseline: baseline.toFixed(0),
        },
        resolved: false,
      });
    }

    return anomalies;
  }

  /**
   * Detect endpoint anomalies (unusual endpoints)
   */
  private detectEndpointAnomalies(environment: string): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // This would require tracking endpoint-level statistics
    // For now, return empty as we'd need to enhance MonitoringSystem
    // TODO: Implement endpoint-level statistics tracking

    return anomalies;
  }

  /**
   * Detect behavioral anomalies (unusual IP patterns)
   */
  private detectBehavioralAnomalies(environment: string): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const topIPs = this.monitoring.getTopIPs(environment, 100);

    // Check for IPs with unusually high request rates
    const avgRequests = topIPs.reduce((sum, ip) => sum + ip.requestCount, 0) / topIPs.length;

    for (const ipInfo of topIPs) {
      if (ipInfo.requestCount > avgRequests * 10) {
        // Check if this IP has been flagged before
        const history = this.anomalyHistory.get(ipInfo.ip) || [];
        history.push(Date.now());
        this.anomalyHistory.set(ipInfo.ip, history);

        // Only alert if not recently flagged (within last hour)
        const recentFlag = history.find(t => Date.now() - t < 60 * 60 * 1000);
        if (!recentFlag || history.length > 5) {
          anomalies.push({
            timestamp: Date.now(),
            type: "behavioral",
            severity: ipInfo.requestCount > avgRequests * 100 ? "critical" : "high",
            title: `Unusual Activity from ${ipInfo.ip}`,
            description: `IP ${ipInfo.ip} made ${ipInfo.requestCount} requests, ${(ipInfo.requestCount / avgRequests).toFixed(1)}x more than average`,
            metric: "requestCount",
            currentValue: ipInfo.requestCount,
            expectedRange: {
              min: 0,
              max: avgRequests * 5,
            },
            confidence: Math.min(ipInfo.requestCount / (avgRequests * 10), 1),
            details: {
              ip: ipInfo.ip,
              requestCount: ipInfo.requestCount,
              average: avgRequests.toFixed(0),
              multiplier: (ipInfo.requestCount / avgRequests).toFixed(1),
            },
            resolved: false,
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Calculate severity based on how far the value is from threshold
   */
  private calculateSeverity(value: number, threshold: number): Anomaly["severity"] {
    const ratio = value / threshold;
    if (ratio > 5) return "critical";
    if (ratio > 3) return "high";
    if (ratio > 2) return "medium";
    return "low";
  }

  /**
   * Save anomaly to database
   */
  private saveAnomaly(anomaly: Anomaly): void {
    this.db.prepare(`
      INSERT INTO anomalies (
        timestamp, type, severity, title, description, metric,
        currentValue, expectedMin, expectedMax, confidence, details, resolved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      anomaly.timestamp,
      anomaly.type,
      anomaly.severity,
      anomaly.title,
      anomaly.description,
      anomaly.metric,
      anomaly.currentValue,
      anomaly.expectedRange.min,
      anomaly.expectedRange.max,
      anomaly.confidence,
      JSON.stringify(anomaly.details)
    );
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(limit: number = 100, type?: string): Anomaly[] {
    let query = "SELECT * FROM anomalies";
    const params: any[] = [];

    if (type) {
      query += " WHERE type = ?";
      params.push(type);
    }

    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(limit);

    const rows = this.db.prepare(query).all(...params) as any[];

    return rows.map(row => ({
      ...row,
      resolved: row.resolved === 1,
      details: JSON.parse(row.details),
      expectedRange: {
        min: row.expectedMin,
        max: row.expectedMax,
      },
    }));
  }

  /**
   * Get anomaly statistics
   */
  getAnomalyStats(): {
    total: number;
    active: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    today: number;
  } {
    const total = this.db.prepare("SELECT COUNT(*) as count FROM anomalies").get() as { count: number };
    const active = this.db.prepare("SELECT COUNT(*) as count FROM anomalies WHERE resolved = 0").get() as { count: number };

    const byTypeRows = this.db.prepare("SELECT type, COUNT(*) as count FROM anomalies GROUP BY type ORDER BY count DESC").all() as any[];
    const byType = byTypeRows.reduce((acc, row) => ({ ...acc, [row.type]: row.count }), {});

    const bySeverityRows = this.db.prepare("SELECT severity, COUNT(*) as count FROM anomalies GROUP BY severity ORDER BY count DESC").all() as any[];
    const bySeverity = bySeverityRows.reduce((acc, row) => ({ ...acc, [row.severity]: row.count }), {});

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = this.db.prepare("SELECT COUNT(*) as count FROM anomalies WHERE timestamp >= ?").get(todayStart.getTime()) as { count: number };

    return {
      total: total.count,
      active: active.count,
      byType,
      bySeverity,
      today: today.count,
    };
  }

  /**
   * Resolve anomaly
   */
  resolveAnomaly(id: number): boolean {
    const result = this.db.prepare("UPDATE anomalies SET resolved = 1 WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /**
   * Cleanup old anomalies
   */
  cleanup(olderThanDays: number = 30): number {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Only delete resolved anomalies older than cutoff
    const result = this.db.prepare("DELETE FROM anomalies WHERE resolved = 1 AND timestamp < ?").run(cutoff);

    return result.changes;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
