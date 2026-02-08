/**
 * Database operations for dashboard history tracking
 */

import { Database } from 'bun:sqlite';
import { join } from 'path';
import { logger } from '../../../user-profile/src/index.ts';
import type {
  BenchmarkResult,
  TestResult,
  P2PGatewayResult,
  ProfileResult,
} from '../types.ts';

let historyDb: Database | null = null;
let retentionDays = 30; // Default, will be set from config

/**
 * Initialize the history database
 */
export function initHistoryDatabase(dataDir: string, retention: number = 30): Database {
  retentionDays = retention;
  const dbPath = join(dataDir, 'dashboard-history.db');
  const db = new Database(dbPath);
  
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS benchmark_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      time REAL,
      target REAL,
      status TEXT,
      timestamp INTEGER,
      category TEXT
    );
    
    CREATE TABLE IF NOT EXISTS test_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      status TEXT,
      timestamp INTEGER,
      category TEXT
    );
    
    CREATE TABLE IF NOT EXISTS p2p_gateway_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gateway TEXT,
      operation TEXT,
      time REAL,
      duration_ms REAL,
      target REAL,
      status TEXT,
      timestamp INTEGER,
      dry_run INTEGER,
      success INTEGER,
      error_message TEXT,
      request_size INTEGER,
      response_size INTEGER,
      endpoint TEXT,
      status_code INTEGER,
      metadata TEXT,
      benchmark_id INTEGER
    );
    
    CREATE TABLE IF NOT EXISTS profile_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT,
      time REAL,
      target REAL,
      status TEXT,
      timestamp INTEGER,
      category TEXT,
      metadata TEXT,
      cpu_time_ms REAL,
      memory_delta_bytes INTEGER,
      thread_count INTEGER,
      peak_memory_mb REAL,
      model_accuracy REAL,
      model_loss REAL,
      training_samples INTEGER,
      inference_latency_ms REAL,
      personalization_score REAL,
      feature_count INTEGER,
      embedding_dimension INTEGER,
      hll_cardinality_estimate INTEGER,
      hll_merge_time_ms REAL,
      r2_object_size_bytes INTEGER,
      r2_upload_time_ms REAL,
      r2_download_time_ms REAL,
      gnn_nodes INTEGER,
      gnn_edges INTEGER,
      gnn_propagation_time_ms REAL,
      tags TEXT,
      success INTEGER
    );
    
    CREATE INDEX IF NOT EXISTS idx_benchmark_timestamp ON benchmark_history(timestamp);
    CREATE INDEX IF NOT EXISTS idx_test_timestamp ON test_history(timestamp);
    CREATE INDEX IF NOT EXISTS idx_p2p_gateway ON p2p_gateway_history(gateway, timestamp);
    CREATE INDEX IF NOT EXISTS idx_p2p_operation ON p2p_gateway_history(operation);
    CREATE INDEX IF NOT EXISTS idx_p2p_success ON p2p_gateway_history(success);
    CREATE INDEX IF NOT EXISTS idx_p2p_gateway_operation ON p2p_gateway_history(gateway, operation);
    CREATE INDEX IF NOT EXISTS idx_profile_op ON profile_history(operation, timestamp);
    CREATE INDEX IF NOT EXISTS idx_profile_category ON profile_history(category, timestamp);
    CREATE INDEX IF NOT EXISTS idx_profile_success ON profile_history(success);
    CREATE INDEX IF NOT EXISTS idx_profile_personalization ON profile_history(personalization_score) WHERE personalization_score IS NOT NULL;
    
    -- P2P Gateway Configuration Table
    CREATE TABLE IF NOT EXISTS p2p_gateway_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gateway TEXT NOT NULL UNIQUE,
      api_key_encrypted TEXT,
      api_secret_encrypted TEXT,
      webhook_url TEXT,
      webhook_secret_encrypted TEXT,
      sandbox_mode INTEGER DEFAULT 1,
      rate_limit_per_minute INTEGER DEFAULT 60,
      timeout_ms INTEGER DEFAULT 30000,
      retry_count INTEGER DEFAULT 3,
      circuit_breaker_threshold INTEGER DEFAULT 5,
      config_json TEXT,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    
    -- Profile Engine Configuration Table
    CREATE TABLE IF NOT EXISTS profile_engine_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      xgboost_max_depth INTEGER DEFAULT 6,
      xgboost_learning_rate REAL DEFAULT 0.3,
      xgboost_n_estimators INTEGER DEFAULT 100,
      xgboost_objective TEXT DEFAULT 'reg:squarederror',
      redis_hll_precision INTEGER DEFAULT 14,
      redis_hll_auto_merge INTEGER DEFAULT 1,
      redis_hll_merge_threshold INTEGER DEFAULT 1000,
      r2_bucket_name TEXT,
      r2_snapshot_interval_minutes INTEGER DEFAULT 60,
      r2_retention_days INTEGER DEFAULT 30,
      gnn_hidden_dim INTEGER DEFAULT 128,
      gnn_num_layers INTEGER DEFAULT 2,
      gnn_dropout_rate REAL DEFAULT 0.5,
      gnn_propagation_steps INTEGER DEFAULT 3,
      feature_cache_ttl_seconds INTEGER DEFAULT 3600,
      feature_vector_size INTEGER DEFAULT 256,
      batch_size INTEGER DEFAULT 32,
      max_concurrent_operations INTEGER DEFAULT 10,
      circuit_breaker_enabled INTEGER DEFAULT 1,
      config_json TEXT,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    
    -- Insert default configurations
    INSERT OR IGNORE INTO p2p_gateway_configs (gateway, sandbox_mode, enabled) VALUES
    ('venmo', 1, 1),
    ('cashapp', 1, 1),
    ('paypal', 1, 1),
    ('zelle', 1, 0),
    ('wise', 1, 0),
    ('revolut', 1, 0);
    
    INSERT OR IGNORE INTO profile_engine_configs (
      xgboost_max_depth, xgboost_learning_rate, redis_hll_precision,
      r2_snapshot_interval_minutes, gnn_hidden_dim, enabled
    ) VALUES (6, 0.3, 14, 60, 128, 1);
    
    -- Views for aggregated metrics
    CREATE VIEW IF NOT EXISTS p2p_gateway_metrics AS
    SELECT 
      gateway,
      operation,
      COUNT(*) as total_operations,
      AVG(COALESCE(duration_ms, time)) as avg_duration_ms,
      MIN(COALESCE(duration_ms, time)) as min_duration_ms,
      MAX(COALESCE(duration_ms, time)) as max_duration_ms,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_ops,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_ops,
      (SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate
    FROM p2p_gateway_history
    GROUP BY gateway, operation;
    
    CREATE VIEW IF NOT EXISTS profile_engine_metrics AS
    SELECT 
      operation,
      COUNT(*) as total_operations,
      AVG(time) as avg_duration_ms,
      AVG(personalization_score) as avg_personalization_score,
      AVG(model_accuracy) as avg_model_accuracy,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_ops,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_ops,
      (SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as success_rate,
      AVG(cpu_time_ms) as avg_cpu_time_ms,
      AVG(peak_memory_mb) as avg_peak_memory_mb
    FROM profile_history
    GROUP BY operation;
  `);
  
  historyDb = db;
  return db;
}

/**
 * Get the history database instance
 */
export function getHistoryDatabase(): Database {
  if (!historyDb) {
    throw new Error('History database not initialized. Call initHistoryDatabase() first.');
  }
  return historyDb;
}

/**
 * Save benchmark results to history (batch operation)
 */
export function saveBenchmarkHistory(results: BenchmarkResult | BenchmarkResult[]): void {
  try {
    const db = getHistoryDatabase();
    const resultsArray = Array.isArray(results) ? results : [results];
    const timestamp = Date.now();
    const stmt = db.prepare(`
      INSERT INTO benchmark_history (name, time, target, status, timestamp, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    resultsArray.forEach(result => {
      stmt.run(
        result.name,
        result.time,
        result.target,
        result.status,
        timestamp,
        result.category
      );
    });
    pruneHistory();
  } catch (error) {
    logger.warn(`Failed to save benchmark history: ${error}`);
  }
}

/**
 * Save test results to history (batch operation)
 */
export function saveTestHistory(results: TestResult | TestResult[]): void {
  try {
    const db = getHistoryDatabase();
    const resultsArray = Array.isArray(results) ? results : [results];
    const timestamp = Date.now();
    const stmt = db.prepare(`
      INSERT INTO test_history (name, status, timestamp, category)
      VALUES (?, ?, ?, ?)
    `);
    resultsArray.forEach(result => {
      stmt.run(
        result.name,
        result.status,
        timestamp,
        result.category
      );
    });
    pruneHistory();
  } catch (error) {
    logger.warn(`Failed to save test history: ${error}`);
  }
}

/**
 * Save P2P gateway results to history (batch operation)
 */
export function saveP2PHistory(results: P2PGatewayResult | P2PGatewayResult[], benchmarkId?: number): void {
  try {
    const db = getHistoryDatabase();
    const resultsArray = Array.isArray(results) ? results : [results];
    const timestamp = Date.now();
    const stmt = db.prepare(`
      INSERT INTO p2p_gateway_history (
        gateway, operation, time, duration_ms, target, status, timestamp,
        dry_run, success, error_message, request_size, response_size,
        endpoint, status_code, metadata, benchmark_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    resultsArray.forEach(result => {
      const success = result.success !== undefined 
        ? (result.success ? 1 : 0) 
        : (result.status === 'pass' || result.status === 'warning' ? 1 : 0);
      stmt.run(
        result.gateway,
        result.operation,
        result.time,
        result.time, // duration_ms same as time for compatibility
        result.target,
        result.status,
        timestamp,
        result.dryRun ? 1 : 0,
        success,
        result.errorMessage || null,
        result.requestSize || null,
        result.responseSize || null,
        result.endpoint || null,
        result.statusCode || null,
        result.metadata ? JSON.stringify(result.metadata) : null,
        benchmarkId || null
      );
    });
    pruneHistory();
  } catch (error) {
    logger.warn(`Failed to save P2P history: ${error}`);
  }
}

/**
 * Save profile results to history (batch operation)
 */
export function saveProfileHistory(results: ProfileResult | ProfileResult[]): void {
  try {
    const db = getHistoryDatabase();
    const resultsArray = Array.isArray(results) ? results : [results];
    const timestamp = Date.now();
    const stmt = db.prepare(`
      INSERT INTO profile_history (
        operation, time, target, status, timestamp, category, metadata,
        cpu_time_ms, memory_delta_bytes, thread_count, peak_memory_mb,
        model_accuracy, model_loss, training_samples, inference_latency_ms,
        personalization_score, feature_count, embedding_dimension,
        hll_cardinality_estimate, hll_merge_time_ms, r2_object_size_bytes,
        r2_upload_time_ms, r2_download_time_ms, gnn_nodes, gnn_edges,
        gnn_propagation_time_ms, tags, success
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    resultsArray.forEach(result => {
      const success = result.status === 'pass' || result.status === 'warning' ? 1 : 0;
      stmt.run(
        result.operation,
        result.time,
        result.target,
        result.status,
        timestamp,
        result.category,
        result.metadata ? JSON.stringify(result.metadata) : null,
        result.cpuTimeMs || null,
        result.memoryDeltaBytes || null,
        result.threadCount || null,
        result.peakMemoryMb || null,
        result.modelAccuracy || null,
        result.modelLoss || null,
        result.trainingSamples || null,
        result.inferenceLatencyMs || null,
        result.personalizationScore || null,
        result.featureCount || null,
        result.embeddingDimension || null,
        result.hllCardinalityEstimate || null,
        result.hllMergeTimeMs || null,
        result.r2ObjectSizeBytes || null,
        result.r2UploadTimeMs || null,
        result.r2DownloadTimeMs || null,
        result.gnnNodes || null,
        result.gnnEdges || null,
        result.gnnPropagationTimeMs || null,
        result.tags ? JSON.stringify(result.tags) : null,
        success
      );
    });
    pruneHistory();
  } catch (error) {
    logger.warn(`Failed to save profile history: ${error}`);
  }
}

/**
 * Prune old history entries based on retention_days
 */
export function pruneHistory(): void {
  try {
    const db = getHistoryDatabase();
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const delBench = db.prepare('DELETE FROM benchmark_history WHERE timestamp < ?');
    const delTest = db.prepare('DELETE FROM test_history WHERE timestamp < ?');
    const delP2P = db.prepare('DELETE FROM p2p_gateway_history WHERE timestamp < ?');
    const delProfile = db.prepare('DELETE FROM profile_history WHERE timestamp < ?');
    delBench.run(cutoff);
    delTest.run(cutoff);
    delP2P.run(cutoff);
    delProfile.run(cutoff);
  } catch (error) {
    logger.warn(`Failed to prune history: ${error}`);
  }
}

export interface TrendDataPoint {
  bucket: number;
  name: string;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  count: number;
  passRate: number;
}

export interface TrendResult {
  trends: TrendDataPoint[];
  baseline: Record<string, { avg: number; p95: number }>;
  regressions: Array<{ name: string; current: number; baseline: number; changePercent: number }>;
}

/**
 * Get benchmark trends aggregated by time bucket
 */
export function getBenchmarkTrends(hours: number = 24, bucketMinutes: number = 60): TrendResult {
  const db = getHistoryDatabase();
  const since = Date.now() - hours * 60 * 60 * 1000;
  const bucketMs = bucketMinutes * 60 * 1000;

  // Get raw data points
  const rows = db.prepare(`
    SELECT name, time, status, timestamp
    FROM benchmark_history
    WHERE timestamp > ?
    ORDER BY name, timestamp ASC
  `).all(since) as Array<{ name: string; time: number; status: string; timestamp: number }>;

  // Group by name and time bucket
  const buckets = new Map<string, Map<number, { times: number[]; passes: number; total: number }>>();

  for (const row of rows) {
    const bucket = Math.floor(row.timestamp / bucketMs) * bucketMs;
    if (!buckets.has(row.name)) {
      buckets.set(row.name, new Map());
    }
    const nameBuckets = buckets.get(row.name)!;
    if (!nameBuckets.has(bucket)) {
      nameBuckets.set(bucket, { times: [], passes: 0, total: 0 });
    }
    const b = nameBuckets.get(bucket)!;
    b.times.push(row.time);
    b.total++;
    if (row.status === 'pass' || row.status === 'warning') b.passes++;
  }

  // Calculate percentiles
  const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  };

  // Build trend data points
  const trends: TrendDataPoint[] = [];
  for (const [name, nameBuckets] of buckets) {
    for (const [bucket, data] of nameBuckets) {
      const times = data.times;
      trends.push({
        bucket,
        name,
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        p50: percentile(times, 50),
        p95: percentile(times, 95),
        count: data.total,
        passRate: data.total > 0 ? (data.passes / data.total) * 100 : 0,
      });
    }
  }

  // Sort by bucket time
  trends.sort((a, b) => a.bucket - b.bucket);

  // Calculate 7-day baseline for regression detection
  const baselineSince = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const baselineRows = db.prepare(`
    SELECT name, AVG(time) as avg, time
    FROM benchmark_history
    WHERE timestamp > ? AND timestamp < ?
    GROUP BY name
  `).all(baselineSince, since) as Array<{ name: string; avg: number; time: number }>;

  // Get all times per name for p95 calculation
  const baselineByName = new Map<string, number[]>();
  const allBaselineRows = db.prepare(`
    SELECT name, time
    FROM benchmark_history
    WHERE timestamp > ? AND timestamp < ?
  `).all(baselineSince, since) as Array<{ name: string; time: number }>;

  for (const row of allBaselineRows) {
    if (!baselineByName.has(row.name)) baselineByName.set(row.name, []);
    baselineByName.get(row.name)!.push(row.time);
  }

  const baseline: Record<string, { avg: number; p95: number }> = {};
  for (const row of baselineRows) {
    const times = baselineByName.get(row.name) || [];
    baseline[row.name] = {
      avg: row.avg,
      p95: percentile(times, 95),
    };
  }

  // Detect regressions (>10% slower than baseline)
  const regressions: TrendResult['regressions'] = [];
  const latestByName = new Map<string, number>();

  // Get most recent value per benchmark
  for (let i = trends.length - 1; i >= 0; i--) {
    if (!latestByName.has(trends[i].name)) {
      latestByName.set(trends[i].name, trends[i].avg);
    }
  }

  for (const [name, current] of latestByName) {
    const base = baseline[name];
    if (base && base.avg > 0) {
      const changePercent = ((current - base.avg) / base.avg) * 100;
      if (changePercent > 10) {
        regressions.push({ name, current, baseline: base.avg, changePercent });
      }
    }
  }

  return { trends, baseline, regressions };
}
