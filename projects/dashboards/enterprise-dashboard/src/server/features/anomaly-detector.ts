/**
 * Runtime Anomaly Detection
 *
 * Uses the trained model from scripts/train-anomaly.ts to detect
 * anomalies in real-time metrics. Supports both Z-score and IQR methods.
 */

import { join } from "path";
import type { AnomalyResult, AnomalySeverity, DetectionResult } from "../../types";

// =============================================================================
// Types
// =============================================================================

interface MetricStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
  zThreshold: number;
}

interface AnomalyModel {
  version: string;
  trainedAt: string;
  trainingDays: number;
  sampleCount: number;
  metrics: Record<string, MetricStats>;
  config: {
    zScoreThreshold: number;
    iqrMultiplier: number;
  };
}

// =============================================================================
// Anomaly Detector Class
// =============================================================================

export class AnomalyDetector {
  private model: AnomalyModel | null = null;
  private modelPath: string;
  private lastLoaded: number = 0;
  private reloadIntervalMs: number;

  constructor(options: { modelPath?: string; reloadIntervalMs?: number } = {}) {
    this.modelPath =
      options.modelPath ||
      process.env.ANOMALY_MODEL_PATH ||
      join(import.meta.dir, "../../data/model.json");
    this.reloadIntervalMs = options.reloadIntervalMs || 3600_000; // 1 hour
  }

  /**
   * Load or reload the model from disk
   */
  async loadModel(): Promise<boolean> {
    try {
      const file = Bun.file(this.modelPath);
      if (!(await file.exists())) {
        console.warn(`[ANOMALY] Model not found: ${this.modelPath}`);
        return false;
      }

      this.model = await file.json();
      this.lastLoaded = Date.now();

      console.log(
        `[ANOMALY] Model loaded: v${this.model?.version} ` +
          `(trained ${this.model?.trainedAt}, ${this.model?.sampleCount} samples)`
      );
      return true;
    } catch (err) {
      console.error("[ANOMALY] Failed to load model:", err);
      return false;
    }
  }

  /**
   * Check if model needs reloading
   */
  private async ensureModel(): Promise<boolean> {
    if (!this.model || Date.now() - this.lastLoaded > this.reloadIntervalMs) {
      return this.loadModel();
    }
    return true;
  }

  /**
   * Detect anomalies in a set of metrics
   */
  async detect(metrics: Record<string, number>): Promise<DetectionResult> {
    await this.ensureModel();

    const timestamp = Date.now();
    const anomalies: AnomalyResult[] = [];

    if (!this.model) {
      return { timestamp, anomalies: [], hasAnomalies: false, severity: "none" };
    }

    for (const [name, value] of Object.entries(metrics)) {
      const stats = this.model.metrics[name];
      if (!stats) continue; // Unknown metric, skip

      const result = this.checkMetric(name, value, stats);
      anomalies.push(result);
    }

    const anomalyCount = anomalies.filter((a) => a.isAnomaly).length;
    const severity = this.calculateSeverity(anomalies);

    return {
      timestamp,
      anomalies,
      hasAnomalies: anomalyCount > 0,
      severity,
    };
  }

  /**
   * Check a single metric against trained thresholds
   */
  private checkMetric(name: string, value: number, stats: MetricStats): AnomalyResult {
    // Calculate Z-score
    const zScore = stats.stdDev > 0 ? Math.abs(value - stats.mean) / stats.stdDev : 0;

    // Check IQR bounds
    const outsideIQR = value < stats.lowerBound || value > stats.upperBound;

    // Check Z-score threshold
    const highZScore = zScore > stats.zThreshold;

    // Determine anomaly status and reason
    const isAnomaly = outsideIQR || highZScore;
    let reason: AnomalyResult["reason"];
    if (outsideIQR && highZScore) reason = "both";
    else if (highZScore) reason = "z_score";
    else if (outsideIQR) reason = "iqr_bounds";

    return {
      metric: name,
      value,
      isAnomaly,
      reason,
      zScore,
      deviation: {
        fromMean: value - stats.mean,
        fromBounds:
          value < stats.lowerBound
            ? value - stats.lowerBound
            : value > stats.upperBound
              ? value - stats.upperBound
              : 0,
      },
      thresholds: {
        mean: stats.mean,
        stdDev: stats.stdDev,
        lowerBound: stats.lowerBound,
        upperBound: stats.upperBound,
      },
    };
  }

  /**
   * Calculate overall severity based on anomaly count and magnitude
   */
  private calculateSeverity(results: AnomalyResult[]): AnomalySeverity {
    const anomalies = results.filter((r) => r.isAnomaly);
    if (anomalies.length === 0) return "none";

    // Check for critical metrics (success_rate, critical_count)
    const criticalMetrics = ["success_rate", "critical_count", "cpu_usage", "memory_usage"];
    const hasCritical = anomalies.some(
      (a) => criticalMetrics.includes(a.metric) && a.reason === "both"
    );

    if (hasCritical || anomalies.length >= 4) return "critical";
    if (anomalies.length >= 3 || anomalies.some((a) => a.reason === "both")) return "high";
    if (anomalies.length >= 2) return "medium";
    return "low";
  }

  /**
   * Get model metadata
   */
  getModelInfo(): {
    loaded: boolean;
    version?: string;
    trainedAt?: string;
    sampleCount?: number;
    metrics?: string[];
  } {
    if (!this.model) {
      return { loaded: false };
    }

    return {
      loaded: true,
      version: this.model.version,
      trainedAt: this.model.trainedAt,
      sampleCount: this.model.sampleCount,
      metrics: Object.keys(this.model.metrics),
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const anomalyDetector = new AnomalyDetector();

/**
 * Quick detect function for use in request handlers
 */
export async function detectAnomalies(
  metrics: Record<string, number>
): Promise<DetectionResult> {
  return anomalyDetector.detect(metrics);
}
