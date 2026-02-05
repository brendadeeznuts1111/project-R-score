#!/usr/bin/env bun
/**
 * Anomaly Detection Model Training
 *
 * Nightly cron job that trains on metrics_history from the last 7 days.
 * Uses statistical methods (Z-score, IQR) for anomaly detection thresholds.
 *
 * Usage:
 *   bun scripts/train-anomaly.ts [--days=7] [--output=./data/model.json]
 *
 * Cron (nightly at 2am):
 *   0 2 * * * cd /path/to/project && bun scripts/train-anomaly.ts
 */

import { Database } from "bun:sqlite";
import { join } from "path";
import { parseArgs } from "util";

// =============================================================================
// CLI Arguments
// =============================================================================

const { values: args } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    days: { type: "string", default: "7" },
    output: { type: "string", default: "./data/model.json" },
    verbose: { type: "boolean", default: false },
  },
});

const TRAINING_DAYS = parseInt(args.days || "7", 10);
const OUTPUT_PATH = args.output || "./data/model.json";
const VERBOSE = args.verbose;

// =============================================================================
// Types
// =============================================================================

interface MetricsRecord {
  id: number;
  timestamp: number;
  total_requests: number;
  success_rate: number;
  avg_latency: number;
  project_count: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  cpu_usage: number | null;
  memory_usage: number | null;
}

interface MetricStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  lowerBound: number; // Q1 - 1.5*IQR
  upperBound: number; // Q3 + 1.5*IQR
  zThreshold: number; // Z-score threshold (default 3)
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
// Statistical Functions
// =============================================================================

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[], avg?: number): number {
  if (values.length < 2) return 0;
  const m = avg ?? mean(values);
  const squaredDiffs = values.map((v) => (v - m) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
}

function computeStats(values: number[], zThreshold = 3, iqrMultiplier = 1.5): MetricStats {
  const sorted = [...values].sort((a, b) => a - b);
  const avg = mean(values);
  const std = stdDev(values, avg);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;

  return {
    mean: avg,
    stdDev: std,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    q1,
    median: percentile(sorted, 50),
    q3,
    iqr,
    lowerBound: q1 - iqrMultiplier * iqr,
    upperBound: q3 + iqrMultiplier * iqr,
    zThreshold,
  };
}

// =============================================================================
// Training Logic
// =============================================================================

async function train(): Promise<void> {
  const startTime = performance.now();
  console.log(`\n[TRAIN] Anomaly Detection Model Training`);
  console.log(`        Training window: ${TRAINING_DAYS} days`);
  console.log(`        Output: ${OUTPUT_PATH}\n`);

  // Connect to database
  const DATA_DIR = process.env.DATA_DIR || join(import.meta.dir, "../data");
  const DB_PATH = process.env.DB_PATH || join(DATA_DIR, "dashboard.db");

  if (!(await Bun.file(DB_PATH).exists())) {
    console.error(`[ERROR] Database not found: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });

  // Query metrics from the last N days
  const cutoff = Math.floor(Date.now() / 1000) - TRAINING_DAYS * 86400;
  const query = db.prepare(`
    SELECT * FROM metrics_history
    WHERE timestamp > ?
    ORDER BY timestamp ASC
  `);

  const records = query.all(cutoff) as MetricsRecord[];

  if (records.length < 10) {
    console.error(`[ERROR] Insufficient data: ${records.length} records (need at least 10)`);
    db.close();
    process.exit(1);
  }

  console.log(`[DATA]  Found ${records.length} metric samples`);
  console.log(`        Timespan: ${new Date(records[0].timestamp * 1000).toISOString()}`);
  console.log(`              to: ${new Date(records[records.length - 1].timestamp * 1000).toISOString()}\n`);

  // Extract metric arrays (filter nulls for cpu/memory)
  const metricArrays: Record<string, number[]> = {
    total_requests: records.map((r) => r.total_requests),
    success_rate: records.map((r) => r.success_rate),
    avg_latency: records.map((r) => r.avg_latency),
    project_count: records.map((r) => r.project_count),
    healthy_count: records.map((r) => r.healthy_count),
    warning_count: records.map((r) => r.warning_count),
    critical_count: records.map((r) => r.critical_count),
    cpu_usage: records.filter((r) => r.cpu_usage != null).map((r) => r.cpu_usage!),
    memory_usage: records.filter((r) => r.memory_usage != null).map((r) => r.memory_usage!),
  };

  // Compute statistics for each metric
  const metrics: Record<string, MetricStats> = {};
  const Z_THRESHOLD = 3;
  const IQR_MULTIPLIER = 1.5;

  for (const [name, values] of Object.entries(metricArrays)) {
    if (values.length < 10) {
      console.log(`[SKIP]  ${name}: insufficient data (${values.length} samples)`);
      continue;
    }
    metrics[name] = computeStats(values, Z_THRESHOLD, IQR_MULTIPLIER);
  }

  // Build model
  const model: AnomalyModel = {
    version: "1.0.0",
    trainedAt: new Date().toISOString(),
    trainingDays: TRAINING_DAYS,
    sampleCount: records.length,
    metrics,
    config: {
      zScoreThreshold: Z_THRESHOLD,
      iqrMultiplier: IQR_MULTIPLIER,
    },
  };

  // Write model to file
  const outputPath = OUTPUT_PATH.startsWith("./")
    ? join(import.meta.dir, "..", OUTPUT_PATH.slice(2))
    : OUTPUT_PATH;

  await Bun.write(outputPath, JSON.stringify(model, null, 2));

  db.close();

  const elapsed = (performance.now() - startTime).toFixed(2);

  // Summary output
  console.log(`[MODEL] Trained thresholds:`);
  if (VERBOSE) {
    const tableData = Object.entries(metrics).map(([name, stats]) => ({
      Metric: name,
      Mean: stats.mean.toFixed(2),
      StdDev: stats.stdDev.toFixed(2),
      "IQR Lower": stats.lowerBound.toFixed(2),
      "IQR Upper": stats.upperBound.toFixed(2),
    }));
    console.log(Bun.inspect.table(tableData, { colors: true }));
  } else {
    for (const [name, stats] of Object.entries(metrics)) {
      console.log(
        `        ${name.padEnd(16)} mean=${stats.mean.toFixed(2).padStart(8)} ` +
          `stdDev=${stats.stdDev.toFixed(2).padStart(8)} ` +
          `bounds=[${stats.lowerBound.toFixed(2)}, ${stats.upperBound.toFixed(2)}]`
      );
    }
  }

  console.log(`\n[DONE]  Model saved to ${outputPath}`);
  console.log(`        Training completed in ${elapsed}ms\n`);
}

// =============================================================================
// Entry Point
// =============================================================================

train().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
