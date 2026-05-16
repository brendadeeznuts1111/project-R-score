/**
 * Clawdbot Metrics System
 *
 * Provides skill execution tracking, performance monitoring, and archival.
 *
 * Features:
 * - MetricsCollector: Track skill executions with timing and success/failure
 * - PerformanceMonitor: Measure operation performance using Bun's optimized APIs
 * - MetricsArchiver: Archive old metrics using Bun.Archive (gzip compression)
 * - S3MetricsArchiver: Cloud storage for archived metrics
 * - MetricsBroadcast: Real-time WebSocket updates
 * - MetricsWebSocketServer: Real-time server with Response.json optimization
 * - SQLiteMetricsStore: Persistent storage with WAL mode
 * - AnomalyDetector: Configurable threshold-based anomaly detection
 *
 * Usage:
 * ```typescript
 * import { MetricsCollector, MetricsArchiver, performanceMonitor } from './metrics';
 * import { loadMetricsConfig } from './metrics';
 *
 * const config = loadMetricsConfig();
 * const collector = new MetricsCollector(config.collection);
 * const archiver = new MetricsArchiver(collector, config.archival);
 *
 * // Record a skill execution
 * const start = performance.now();
 * try {
 *   await runSkill('weather', ['San Francisco']);
 *   await collector.recordExecution('weather', 'get', ['San Francisco'], performance.now() - start, true);
 * } catch (err) {
 *   await collector.recordExecution('weather', 'get', ['San Francisco'], performance.now() - start, false, err.message);
 * }
 *
 * // Archive old metrics
 * await archiver.archiveOldMetrics(7); // Archive metrics older than 7 days
 *
 * // Display metrics table
 * console.log(Bun.inspect.table(collector.getTableData(), { colors: true }));
 *
 * // Start real-time WebSocket server
 * import { createMetricsServer } from './metrics';
 * const server = createMetricsServer(collector, { port: 9876 });
 * ```
 */

// Types
export type {
  MetricsArchiveManifest,
  MetricsAggregate,
  MetricsConfig,
  MetricsData,
  MetricsEvent,
  PerformanceMeasurement,
  PerformanceSnapshot,
  SkillAggregateMetrics,
  SkillExecutionRecord,
} from "./types.js";

// Core
export { MetricsCollector } from "./collector.js";
export { PerformanceMonitor, performanceMonitor } from "./performance-monitor.js";
export {
  EnhancedSkillExecutor,
  type SkillExecutionResult,
  type SkillExecutionOptions,
} from "./skill-executor.js";
export { MetricsIntegrityChecker, integrityChecker, type IntegrityData } from "./integrity.js";

// Archival
export { MetricsArchiver } from "./archiver.js";
export { S3MetricsArchiver, type S3ArchiverConfig } from "./s3-archiver.js";

// Configuration
export { loadMetricsConfig, resolveStoragePath } from "./config-loader.js";

// Broadcasting
export {
  createMetricsBroadcaster,
  type MetricsBroadcaster,
  type MetricsBroadcastConfig,
} from "./broadcast.js";

// Protocol
export {
  type Alert,
  type AlertSeverity,
  type AlertType,
  type Thresholds,
  type ServerMessage,
  type ClientMessage,
  DEFAULT_THRESHOLDS,
  handleServerMessage,
  handleClientMessage,
  serverMessages,
  clientMessages,
} from "./protocol.js";

// Persistence
export { SQLiteMetricsStore, type StoredMetric, type StoredAlert } from "./sqlite-store.js";

// Anomaly Detection
export {
  AnomalyDetector,
  anomalyDetector,
  type AnomalyDetectorConfig,
  type SystemMetrics,
} from "./anomaly-detector.js";

// WebSocket Server
export {
  MetricsWebSocketServer,
  createMetricsServer,
  type MetricsServerConfig,
} from "./websocket-server.js";
