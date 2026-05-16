/**
 * Anomaly Detector - Detect metrics anomalies with configurable thresholds.
 */

import { randomUUID } from "node:crypto";
import type {
  Alert,
  AlertSeverity,
  AlertType,
  Thresholds,
  DEFAULT_THRESHOLDS,
} from "./protocol.js";
import type { MetricsData, SkillAggregateMetrics } from "./types.js";

export type AnomalyDetectorConfig = {
  thresholds: Thresholds;
  baselineWindow: number; // ms - window for calculating baseline
  enabledChecks: Set<AlertType>;
};

export type SystemMetrics = {
  memoryUsageMB: number;
  cpuUsagePercent: number;
  storageUsagePercent: number;
  cacheHitRatio: number;
};

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  thresholds: {
    latencySpikePercent: 50,
    errorRateCritical: 5,
    errorRateWarning: 1,
    cacheHitMin: 90,
    storageMaxPercent: 85,
    memoryMaxMB: 512,
    executionTimeMs: 5000,
  },
  baselineWindow: 60 * 60 * 1000, // 1 hour
  enabledChecks: new Set([
    "latency_spike",
    "error_rate",
    "memory_high",
    "cache_miss",
    "storage_full",
    "skill_failure",
  ]),
};

export class AnomalyDetector {
  private config: AnomalyDetectorConfig;
  private baselineLatencies: Map<string, number[]> = new Map();
  private lastAlerts: Map<string, number> = new Map(); // Debounce alerts

  constructor(config?: Partial<AnomalyDetectorConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      thresholds: { ...DEFAULT_CONFIG.thresholds, ...config?.thresholds },
      enabledChecks: config?.enabledChecks ?? DEFAULT_CONFIG.enabledChecks,
    };
  }

  /**
   * Update thresholds.
   */
  setThresholds(thresholds: Partial<Thresholds>): void {
    this.config.thresholds = { ...this.config.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds.
   */
  getThresholds(): Thresholds {
    return { ...this.config.thresholds };
  }

  /**
   * Record a latency measurement for baseline calculation.
   */
  recordLatency(skillId: string, latency: number): void {
    if (!this.baselineLatencies.has(skillId)) {
      this.baselineLatencies.set(skillId, []);
    }
    const latencies = this.baselineLatencies.get(skillId)!;
    latencies.push(latency);

    // Keep only recent measurements
    if (latencies.length > 1000) {
      latencies.shift();
    }
  }

  /**
   * Get baseline latency for a skill.
   */
  getBaselineLatency(skillId: string): number | null {
    const latencies = this.baselineLatencies.get(skillId);
    if (!latencies || latencies.length === 0) return null;

    const sum = latencies.reduce((a, b) => a + b, 0);
    return sum / latencies.length;
  }

  /**
   * Detect anomalies in metrics data.
   */
  detectAnomalies(metrics: MetricsData, system?: SystemMetrics): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    // Check each skill's metrics
    for (const [skillId, skillMetrics] of Object.entries(metrics.bySkill)) {
      // Latency spike detection
      if (this.config.enabledChecks.has("latency_spike")) {
        const latencyAlert = this.checkLatencySpike(skillId, skillMetrics, now);
        if (latencyAlert) alerts.push(latencyAlert);
      }

      // Error rate detection
      if (this.config.enabledChecks.has("error_rate")) {
        const errorAlert = this.checkErrorRate(skillId, skillMetrics, now);
        if (errorAlert) alerts.push(errorAlert);
      }

      // Skill failure detection (recent failures)
      if (this.config.enabledChecks.has("skill_failure")) {
        const failureAlert = this.checkSkillFailure(skillId, skillMetrics, now);
        if (failureAlert) alerts.push(failureAlert);
      }
    }

    // System-level checks
    if (system) {
      if (this.config.enabledChecks.has("memory_high")) {
        const memoryAlert = this.checkMemoryUsage(system, now);
        if (memoryAlert) alerts.push(memoryAlert);
      }

      if (this.config.enabledChecks.has("storage_full")) {
        const storageAlert = this.checkStorageUsage(system, now);
        if (storageAlert) alerts.push(storageAlert);
      }

      if (this.config.enabledChecks.has("cache_miss")) {
        const cacheAlert = this.checkCacheHitRatio(system, now);
        if (cacheAlert) alerts.push(cacheAlert);
      }
    }

    return alerts;
  }

  private checkLatencySpike(
    skillId: string,
    metrics: SkillAggregateMetrics,
    now: number,
  ): Alert | null {
    const baseline = this.getBaselineLatency(skillId);
    if (baseline === null) return null;

    const currentLatency = metrics.avgDuration;
    const spikePercent = ((currentLatency - baseline) / baseline) * 100;

    if (spikePercent > this.config.thresholds.latencySpikePercent) {
      if (this.shouldAlert(`latency_spike:${skillId}`, now)) {
        return this.createAlert(
          "latency_spike",
          spikePercent > this.config.thresholds.latencySpikePercent * 2 ? "critical" : "warning",
          `Latency spike detected for ${skillId}: ${spikePercent.toFixed(1)}% above baseline`,
          spikePercent,
          this.config.thresholds.latencySpikePercent,
          now,
          skillId,
        );
      }
    }

    return null;
  }

  private checkErrorRate(
    skillId: string,
    metrics: SkillAggregateMetrics,
    now: number,
  ): Alert | null {
    if (metrics.totalExecutions === 0) return null;

    const errorRate = (metrics.failureCount / metrics.totalExecutions) * 100;

    if (errorRate > this.config.thresholds.errorRateCritical) {
      if (this.shouldAlert(`error_rate:${skillId}`, now)) {
        return this.createAlert(
          "error_rate",
          "critical",
          `Critical error rate for ${skillId}: ${errorRate.toFixed(1)}%`,
          errorRate,
          this.config.thresholds.errorRateCritical,
          now,
          skillId,
        );
      }
    } else if (errorRate > this.config.thresholds.errorRateWarning) {
      if (this.shouldAlert(`error_rate_warn:${skillId}`, now)) {
        return this.createAlert(
          "error_rate",
          "warning",
          `Elevated error rate for ${skillId}: ${errorRate.toFixed(1)}%`,
          errorRate,
          this.config.thresholds.errorRateWarning,
          now,
          skillId,
        );
      }
    }

    return null;
  }

  private checkSkillFailure(
    skillId: string,
    metrics: SkillAggregateMetrics,
    now: number,
  ): Alert | null {
    // Check for recent consecutive failures
    if (metrics.failureCount > 0 && metrics.totalExecutions > 0) {
      const recentFailureRate = metrics.failureCount / Math.min(metrics.totalExecutions, 10);
      if (recentFailureRate > 0.5) {
        if (this.shouldAlert(`skill_failure:${skillId}`, now)) {
          return this.createAlert(
            "skill_failure",
            "critical",
            `Skill ${skillId} experiencing high failure rate: ${metrics.failureCount} failures`,
            metrics.failureCount,
            1,
            now,
            skillId,
          );
        }
      }
    }

    return null;
  }

  private checkMemoryUsage(system: SystemMetrics, now: number): Alert | null {
    if (system.memoryUsageMB > this.config.thresholds.memoryMaxMB) {
      if (this.shouldAlert("memory_high", now)) {
        return this.createAlert(
          "memory_high",
          system.memoryUsageMB > this.config.thresholds.memoryMaxMB * 1.2 ? "critical" : "warning",
          `High memory usage: ${system.memoryUsageMB.toFixed(0)}MB`,
          system.memoryUsageMB,
          this.config.thresholds.memoryMaxMB,
          now,
        );
      }
    }

    return null;
  }

  private checkStorageUsage(system: SystemMetrics, now: number): Alert | null {
    if (system.storageUsagePercent > this.config.thresholds.storageMaxPercent) {
      if (this.shouldAlert("storage_full", now)) {
        return this.createAlert(
          "storage_full",
          system.storageUsagePercent > 95 ? "critical" : "warning",
          `Storage usage high: ${system.storageUsagePercent.toFixed(1)}%`,
          system.storageUsagePercent,
          this.config.thresholds.storageMaxPercent,
          now,
        );
      }
    }

    return null;
  }

  private checkCacheHitRatio(system: SystemMetrics, now: number): Alert | null {
    if (system.cacheHitRatio < this.config.thresholds.cacheHitMin) {
      if (this.shouldAlert("cache_miss", now)) {
        return this.createAlert(
          "cache_miss",
          system.cacheHitRatio < this.config.thresholds.cacheHitMin * 0.5 ? "critical" : "warning",
          `Low cache hit ratio: ${system.cacheHitRatio.toFixed(1)}%`,
          system.cacheHitRatio,
          this.config.thresholds.cacheHitMin,
          now,
        );
      }
    }

    return null;
  }

  /**
   * Debounce alerts - don't fire the same alert more than once per minute.
   */
  private shouldAlert(key: string, now: number): boolean {
    const lastAlert = this.lastAlerts.get(key);
    if (lastAlert && now - lastAlert < 60000) {
      return false;
    }
    this.lastAlerts.set(key, now);
    return true;
  }

  private createAlert(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    value: number,
    threshold: number,
    timestamp: number,
    skillId?: string,
  ): Alert {
    return {
      id: randomUUID(),
      type,
      severity,
      message,
      value,
      threshold,
      timestamp,
      skillId,
      dismissed: false,
    };
  }

  /**
   * Clear baseline data for a skill.
   */
  clearBaseline(skillId: string): void {
    this.baselineLatencies.delete(skillId);
  }

  /**
   * Clear all baseline data.
   */
  clearAllBaselines(): void {
    this.baselineLatencies.clear();
  }

  /**
   * Get table-friendly alert data.
   */
  getAlertTableData(alerts: Alert[]): Array<{
    ID: string;
    Type: string;
    Severity: string;
    Message: string;
    Value: string;
    Skill: string;
  }> {
    return alerts.map((a) => ({
      ID: a.id.slice(0, 8),
      Type: a.type,
      Severity: a.severity,
      Message: a.message.slice(0, 50),
      Value: a.value.toFixed(1),
      Skill: a.skillId ?? "-",
    }));
  }
}

// Singleton instance
export const anomalyDetector = new AnomalyDetector();
