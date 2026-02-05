/**
 * SQLite Database Module
 * Persistent storage using bun:sqlite (SQLite 3.51.2)
 *
 * Features:
 * - WAL mode for better concurrency
 * - Snapshots metadata persistence
 * - Metrics history for analytics
 * - Session/settings storage
 */
import { Database } from "bun:sqlite";
import { join } from "path";

// Database file location (in project data directory)
const DATA_DIR = process.env.DATA_DIR || join(import.meta.dir, "../../data");
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, "dashboard.db");

// Ensure data directory exists
await Bun.write(join(DATA_DIR, ".gitkeep"), "");

// Initialize database with WAL mode for better performance
const db = new Database(DB_PATH, { create: true });
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA synchronous = NORMAL");
db.run("PRAGMA cache_size = 10000");
db.run("PRAGMA temp_store = MEMORY");

// ============================================
// Schema Initialization
// ============================================

// Snapshots metadata table
db.run(`
  CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    project_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    stored_in TEXT DEFAULT 'local',
    checksum TEXT,
    metadata TEXT
  )
`);

// Metrics history for analytics
db.run(`
  CREATE TABLE IF NOT EXISTS metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
    total_requests INTEGER NOT NULL DEFAULT 0,
    success_rate REAL NOT NULL DEFAULT 100,
    avg_latency REAL NOT NULL DEFAULT 0,
    project_count INTEGER NOT NULL DEFAULT 0,
    healthy_count INTEGER NOT NULL DEFAULT 0,
    warning_count INTEGER NOT NULL DEFAULT 0,
    critical_count INTEGER NOT NULL DEFAULT 0,
    cpu_usage REAL,
    memory_usage REAL
  )
`);

// Create index for faster time-based queries
db.run(`CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics_history(timestamp)`);

// Settings/preferences table
db.run(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

// Project activity log
db.run(`
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

// Create index for activity queries
db.run(`CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp)`);

// API Keys table for RBAC authentication
db.run(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    name TEXT NOT NULL,
    permissions TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at INTEGER,
    last_used_at INTEGER,
    revoked_at INTEGER,
    metadata TEXT
  )
`);

// Create indexes for api_keys queries
db.run(`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL`);

// ============================================
// KYC Failsafe Tables
// ============================================

// KYC Review Queue
db.run(`
  CREATE TABLE IF NOT EXISTS kyc_review_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    device_signatures TEXT NOT NULL,
    trace_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    reviewed_at INTEGER,
    reviewer_id TEXT,
    metadata TEXT
  )
`);

// KYC Audit Log
db.run(`
  CREATE TABLE IF NOT EXISTS kyc_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
    details_json TEXT,
    risk_score INTEGER
  )
`);

// Device Verifications
db.run(`
  CREATE TABLE IF NOT EXISTS device_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    is_genuine INTEGER NOT NULL,
    risk_score INTEGER NOT NULL,
    signatures_json TEXT NOT NULL,
    logs_json TEXT NOT NULL,
    verified_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

// KYC Documents
db.run(`
  CREATE TABLE IF NOT EXISTS kyc_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    document_type TEXT NOT NULL,
    confidence_score INTEGER,
    extracted_data_json TEXT,
    uploaded_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

// KYC Biometric Sessions
db.run(`
  CREATE TABLE IF NOT EXISTS kyc_biometric_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    passed INTEGER NOT NULL,
    liveness_score INTEGER NOT NULL,
    attempted_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

// Create indexes for KYC tables
db.run(`CREATE INDEX IF NOT EXISTS idx_kyc_queue_status ON kyc_review_queue(status, priority, created_at)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_kyc_queue_trace ON kyc_review_queue(trace_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_kyc_queue_user ON kyc_review_queue(user_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_kyc_audit_trace ON kyc_audit_log(trace_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_kyc_audit_user ON kyc_audit_log(user_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_kyc_audit_timestamp ON kyc_audit_log(timestamp)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_kyc_device_trace ON device_verifications(trace_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_kyc_doc_trace ON kyc_documents(trace_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_kyc_biometric_trace ON kyc_biometric_sessions(trace_id)`);

// ============================================
// Prepared Statements for Performance
// ============================================

const stmts = {
  // Snapshots
  insertSnapshot: db.prepare(`
    INSERT INTO snapshots (id, filename, size, project_count, stored_in, checksum, metadata)
    VALUES ($id, $filename, $size, $project_count, $stored_in, $checksum, $metadata)
  `),
  getSnapshots: db.prepare(`
    SELECT * FROM snapshots ORDER BY created_at DESC LIMIT $limit
  `),
  getSnapshot: db.prepare(`
    SELECT * FROM snapshots WHERE id = $id
  `),
  deleteSnapshot: db.prepare(`
    DELETE FROM snapshots WHERE id = $id
  `),

  // Metrics
  insertMetrics: db.prepare(`
    INSERT INTO metrics_history (
      total_requests, success_rate, avg_latency, project_count,
      healthy_count, warning_count, critical_count, cpu_usage, memory_usage
    ) VALUES (
      $total_requests, $success_rate, $avg_latency, $project_count,
      $healthy_count, $warning_count, $critical_count, $cpu_usage, $memory_usage
    )
  `),
  getMetricsHistory: db.prepare(`
    SELECT * FROM metrics_history
    WHERE timestamp >= $since
    ORDER BY timestamp DESC
    LIMIT $limit
  `),
  getMetricsStats: db.prepare(`
    SELECT
      AVG(success_rate) as avg_success_rate,
      AVG(avg_latency) as avg_latency,
      MAX(total_requests) as peak_requests,
      AVG(cpu_usage) as avg_cpu,
      AVG(memory_usage) as avg_memory
    FROM metrics_history
    WHERE timestamp >= $since
  `),

  // Settings
  getSetting: db.prepare(`SELECT value FROM settings WHERE key = $key`),
  setSetting: db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES ($key, $value, unixepoch())
    ON CONFLICT(key) DO UPDATE SET value = $value, updated_at = unixepoch()
  `),
  getAllSettings: db.prepare(`SELECT key, value FROM settings`),

  // Activity Log
  logActivity: db.prepare(`
    INSERT INTO activity_log (project_id, project_name, action, details)
    VALUES ($project_id, $project_name, $action, $details)
  `),
  getRecentActivity: db.prepare(`
    SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT $limit
  `),
  getProjectActivity: db.prepare(`
    SELECT * FROM activity_log WHERE project_id = $project_id ORDER BY timestamp DESC LIMIT $limit
  `),

  // API Keys
  insertApiKey: db.prepare(`
    INSERT INTO api_keys (id, key_hash, key_prefix, name, permissions, created_at, expires_at, metadata)
    VALUES ($id, $key_hash, $key_prefix, $name, $permissions, $created_at, $expires_at, $metadata)
  `),
  getApiKeyByHash: db.prepare(`
    SELECT * FROM api_keys WHERE key_hash = $key_hash AND revoked_at IS NULL
  `),
  getApiKeyById: db.prepare(`
    SELECT * FROM api_keys WHERE id = $id
  `),
  getApiKeyByPrefix: db.prepare(`
    SELECT * FROM api_keys WHERE key_prefix = $key_prefix AND revoked_at IS NULL
  `),
  getAllApiKeys: db.prepare(`
    SELECT id, key_prefix, name, permissions, created_at, expires_at, last_used_at, revoked_at, metadata
    FROM api_keys ORDER BY created_at DESC
  `),
  getActiveApiKeys: db.prepare(`
    SELECT id, key_prefix, name, permissions, created_at, expires_at, last_used_at, metadata
    FROM api_keys WHERE revoked_at IS NULL ORDER BY created_at DESC
  `),
  updateApiKeyLastUsed: db.prepare(`
    UPDATE api_keys SET last_used_at = $last_used_at WHERE id = $id
  `),
  updateApiKeyPermissions: db.prepare(`
    UPDATE api_keys SET permissions = $permissions WHERE id = $id
  `),
  revokeApiKey: db.prepare(`
    UPDATE api_keys SET revoked_at = $revoked_at WHERE id = $id
  `),
  deleteApiKey: db.prepare(`
    DELETE FROM api_keys WHERE id = $id
  `),

  // KYC Review Queue
  insertKYCReviewQueue: db.prepare(`
    INSERT INTO kyc_review_queue (user_id, risk_score, device_signatures, trace_id, status, priority, metadata)
    VALUES ($user_id, $risk_score, $device_signatures, $trace_id, $status, $priority, $metadata)
  `),
  getKYCReviewQueue: db.prepare(`
    SELECT * FROM kyc_review_queue 
    WHERE status = $status 
    ORDER BY priority DESC, created_at ASC 
    LIMIT $limit
  `),
  getKYCReviewQueueFiltered: db.prepare(`
    SELECT * FROM kyc_review_queue 
    WHERE 
      ($status IS NULL OR status = $status)
      AND ($user_id IS NULL OR user_id LIKE $user_id)
      AND ($trace_id IS NULL OR trace_id LIKE $trace_id)
      AND ($reviewer_id IS NULL OR reviewer_id LIKE $reviewer_id)
      AND ($priority IS NULL OR priority = $priority)
      AND ($risk_score_min IS NULL OR risk_score >= $risk_score_min)
      AND ($risk_score_max IS NULL OR risk_score <= $risk_score_max)
      AND ($created_at_from IS NULL OR created_at >= $created_at_from)
      AND ($created_at_to IS NULL OR created_at <= $created_at_to)
      AND ($device_signature IS NULL OR device_signatures LIKE $device_signature)
    ORDER BY priority DESC, created_at ASC 
    LIMIT $limit
  `),
  getKYCReviewByTraceId: db.prepare(`
    SELECT * FROM kyc_review_queue WHERE trace_id = $trace_id
  `),
  updateKYCReviewStatus: db.prepare(`
    UPDATE kyc_review_queue 
    SET status = $status, reviewed_at = $reviewed_at, reviewer_id = $reviewer_id
    WHERE trace_id = $trace_id
  `),
  getKYCReviewByUserId: db.prepare(`
    SELECT * FROM kyc_review_queue WHERE user_id = $user_id ORDER BY created_at DESC LIMIT $limit
  `),

  // KYC Audit Log
  insertKYCAuditLog: db.prepare(`
    INSERT INTO kyc_audit_log (trace_id, user_id, action, details_json, risk_score)
    VALUES ($trace_id, $user_id, $action, $details_json, $risk_score)
  `),
  getKYCAuditLog: db.prepare(`
    SELECT * FROM kyc_audit_log WHERE trace_id = $trace_id ORDER BY timestamp ASC
  `),
  getKYCAuditLogByUserId: db.prepare(`
    SELECT * FROM kyc_audit_log WHERE user_id = $user_id ORDER BY timestamp DESC LIMIT $limit
  `),

  // Device Verifications
  insertDeviceVerification: db.prepare(`
    INSERT INTO device_verifications (trace_id, user_id, is_genuine, risk_score, signatures_json, logs_json)
    VALUES ($trace_id, $user_id, $is_genuine, $risk_score, $signatures_json, $logs_json)
  `),
  getDeviceVerification: db.prepare(`
    SELECT * FROM device_verifications WHERE trace_id = $trace_id
  `),

  // KYC Documents
  insertKYCDocument: db.prepare(`
    INSERT INTO kyc_documents (trace_id, user_id, s3_key, document_type, confidence_score, extracted_data_json)
    VALUES ($trace_id, $user_id, $s3_key, $document_type, $confidence_score, $extracted_data_json)
  `),
  getKYCDocuments: db.prepare(`
    SELECT * FROM kyc_documents WHERE trace_id = $trace_id ORDER BY uploaded_at ASC
  `),

  // KYC Biometric Sessions
  insertKYCBioSession: db.prepare(`
    INSERT INTO kyc_biometric_sessions (trace_id, user_id, passed, liveness_score)
    VALUES ($trace_id, $user_id, $passed, $liveness_score)
  `),
  getKYCBioSession: db.prepare(`
    SELECT * FROM kyc_biometric_sessions WHERE trace_id = $trace_id
  `),
};

// ============================================
// Snapshots API
// ============================================

export interface SnapshotRecord {
  id: string;
  filename: string;
  size: number;
  project_count: number;
  created_at: number;
  stored_in: string;
  checksum: string | null;
  metadata: string | null;
}

export function saveSnapshot(snapshot: {
  id: string;
  filename: string;
  size: number;
  projectCount: number;
  storedIn?: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
}): void {
  stmts.insertSnapshot.run({
    $id: snapshot.id,
    $filename: snapshot.filename,
    $size: snapshot.size,
    $project_count: snapshot.projectCount,
    $stored_in: snapshot.storedIn || "local",
    $checksum: snapshot.checksum || null,
    $metadata: snapshot.metadata ? JSON.stringify(snapshot.metadata) : null,
  });
}

export function getSnapshots(limit = 50): SnapshotRecord[] {
  return stmts.getSnapshots.all({ $limit: limit }) as SnapshotRecord[];
}

export function getSnapshot(id: string): SnapshotRecord | null {
  return stmts.getSnapshot.get({ $id: id }) as SnapshotRecord | null;
}

export function deleteSnapshot(id: string): void {
  stmts.deleteSnapshot.run({ $id: id });
}

// ============================================
// Metrics API
// ============================================

export interface MetricsRecord {
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

export function recordMetrics(metrics: {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  projectCount: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  cpuUsage?: number;
  memoryUsage?: number;
}): void {
  stmts.insertMetrics.run({
    $total_requests: metrics.totalRequests,
    $success_rate: metrics.successRate,
    $avg_latency: metrics.avgLatency,
    $project_count: metrics.projectCount,
    $healthy_count: metrics.healthyCount,
    $warning_count: metrics.warningCount,
    $critical_count: metrics.criticalCount,
    $cpu_usage: metrics.cpuUsage ?? null,
    $memory_usage: metrics.memoryUsage ?? null,
  });
}

export function getMetricsHistory(sinceHoursAgo = 24, limit = 1000): MetricsRecord[] {
  const since = Math.floor(Date.now() / 1000) - (sinceHoursAgo * 3600);
  return stmts.getMetricsHistory.all({ $since: since, $limit: limit }) as MetricsRecord[];
}

export function getMetricsStats(sinceHoursAgo = 24): {
  avgSuccessRate: number;
  avgLatency: number;
  peakRequests: number;
  avgCpu: number;
  avgMemory: number;
} | null {
  const since = Math.floor(Date.now() / 1000) - (sinceHoursAgo * 3600);
  const result = stmts.getMetricsStats.get({ $since: since }) as {
    avg_success_rate: number;
    avg_latency: number;
    peak_requests: number;
    avg_cpu: number;
    avg_memory: number;
  } | null;

  if (!result) return null;

  return {
    avgSuccessRate: result.avg_success_rate || 0,
    avgLatency: result.avg_latency || 0,
    peakRequests: result.peak_requests || 0,
    avgCpu: result.avg_cpu || 0,
    avgMemory: result.avg_memory || 0,
  };
}

// ============================================
// Settings API
// ============================================

export function getSetting<T = string>(key: string, defaultValue?: T): T {
  const result = stmts.getSetting.get({ $key: key }) as { value: string } | null;
  if (!result) return defaultValue as T;

  try {
    return JSON.parse(result.value) as T;
  } catch {
    return result.value as T;
  }
}

export function setSetting(key: string, value: unknown): void {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  stmts.setSetting.run({ $key: key, $value: serialized });
}

export function getAllSettings(): Record<string, unknown> {
  const rows = stmts.getAllSettings.all() as { key: string; value: string }[];
  const settings: Record<string, unknown> = {};

  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return settings;
}

// ============================================
// Activity Log API
// ============================================

export interface ActivityRecord {
  id: number;
  project_id: string;
  project_name: string;
  action: string;
  details: string | null;
  timestamp: number;
}

export function logActivity(
  projectId: string,
  projectName: string,
  action: string,
  details?: Record<string, unknown>
): void {
  stmts.logActivity.run({
    $project_id: projectId,
    $project_name: projectName,
    $action: action,
    $details: details ? JSON.stringify(details) : null,
  });
}

export function getRecentActivity(limit = 50): ActivityRecord[] {
  return stmts.getRecentActivity.all({ $limit: limit }) as ActivityRecord[];
}

export function getProjectActivity(projectId: string, limit = 20): ActivityRecord[] {
  return stmts.getProjectActivity.all({ $project_id: projectId, $limit: limit }) as ActivityRecord[];
}

// ============================================
// Maintenance Functions
// ============================================

export function cleanupOldMetrics(olderThanDays = 30): number {
  const cutoff = Math.floor(Date.now() / 1000) - (olderThanDays * 86400);
  const result = db.run(`DELETE FROM metrics_history WHERE timestamp < ?`, [cutoff]);
  return result.changes;
}

export function cleanupOldActivity(olderThanDays = 90): number {
  const cutoff = Math.floor(Date.now() / 1000) - (olderThanDays * 86400);
  const result = db.run(`DELETE FROM activity_log WHERE timestamp < ?`, [cutoff]);
  return result.changes;
}

export function vacuum(): void {
  db.run("VACUUM");
}

export function getDatabaseStats(): {
  snapshots: number;
  metrics: number;
  activities: number;
  settings: number;
  sizeBytes: number;
} {
  // Single query with UNION ALL instead of 4 sequential queries (~4x faster)
  const counts = db.query(`
    SELECT 'snapshots' as tbl, COUNT(*) as count FROM snapshots
    UNION ALL SELECT 'metrics', COUNT(*) FROM metrics_history
    UNION ALL SELECT 'activities', COUNT(*) FROM activity_log
    UNION ALL SELECT 'settings', COUNT(*) FROM settings
  `).all() as Array<{ tbl: string; count: number }>;

  const countMap = Object.fromEntries(counts.map((r) => [r.tbl, r.count]));

  const file = Bun.file(DB_PATH);
  const sizeBytes = file.size;

  return {
    snapshots: countMap.snapshots ?? 0,
    metrics: countMap.metrics ?? 0,
    activities: countMap.activities ?? 0,
    settings: countMap.settings ?? 0,
    sizeBytes,
  };
}

// ============================================
// API Keys API
// ============================================

export interface ApiKeyRecord {
  id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  permissions: string;
  created_at: number;
  expires_at: number | null;
  last_used_at: number | null;
  revoked_at: number | null;
  metadata: string | null;
}

export function insertApiKey(apiKey: {
  id: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  permissions: string[];
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}): void {
  stmts.insertApiKey.run({
    $id: apiKey.id,
    $key_hash: apiKey.keyHash,
    $key_prefix: apiKey.keyPrefix,
    $name: apiKey.name,
    $permissions: JSON.stringify(apiKey.permissions),
    $created_at: Math.floor(Date.now() / 1000),
    $expires_at: apiKey.expiresAt ?? null,
    $metadata: apiKey.metadata ? JSON.stringify(apiKey.metadata) : null,
  });
}

export function getApiKeyByHash(keyHash: string): ApiKeyRecord | null {
  return stmts.getApiKeyByHash.get({ $key_hash: keyHash }) as ApiKeyRecord | null;
}

export function getApiKeyById(id: string): ApiKeyRecord | null {
  return stmts.getApiKeyById.get({ $id: id }) as ApiKeyRecord | null;
}

export function getApiKeyByPrefix(prefix: string): ApiKeyRecord | null {
  return stmts.getApiKeyByPrefix.get({ $key_prefix: prefix }) as ApiKeyRecord | null;
}

export function getAllApiKeys(): Omit<ApiKeyRecord, "key_hash">[] {
  return stmts.getAllApiKeys.all() as Omit<ApiKeyRecord, "key_hash">[];
}

export function getActiveApiKeys(): Omit<ApiKeyRecord, "key_hash" | "revoked_at">[] {
  return stmts.getActiveApiKeys.all() as Omit<ApiKeyRecord, "key_hash" | "revoked_at">[];
}

export function updateApiKeyLastUsed(id: string): void {
  stmts.updateApiKeyLastUsed.run({
    $id: id,
    $last_used_at: Math.floor(Date.now() / 1000),
  });
}

export function updateApiKeyPermissions(id: string, permissions: string[]): void {
  stmts.updateApiKeyPermissions.run({
    $id: id,
    $permissions: JSON.stringify(permissions),
  });
}

export function revokeApiKey(id: string): void {
  stmts.revokeApiKey.run({
    $id: id,
    $revoked_at: Math.floor(Date.now() / 1000),
  });
}

export function deleteApiKey(id: string): void {
  stmts.deleteApiKey.run({ $id: id });
}

// ============================================
// KYC API
// ============================================

export interface KYCReviewQueueRecord {
  id: number;
  user_id: string;
  risk_score: number;
  device_signatures: string;
  trace_id: string;
  status: string;
  priority: string;
  created_at: number;
  reviewed_at: number | null;
  reviewer_id: string | null;
  metadata: string | null;
}

export interface KYCAuditLogRecord {
  id: number;
  trace_id: string;
  user_id: string;
  action: string;
  timestamp: number;
  details_json: string | null;
  risk_score: number | null;
}

export function insertKYCReviewQueue(item: {
  userId: string;
  riskScore: number;
  deviceSignatures: string[];
  traceId: string;
  status?: "pending" | "approved" | "rejected";
  priority?: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
}): void {
  stmts.insertKYCReviewQueue.run({
    $user_id: item.userId,
    $risk_score: item.riskScore,
    $device_signatures: JSON.stringify(item.deviceSignatures),
    $trace_id: item.traceId,
    $status: item.status || "pending",
    $priority: item.priority || "medium",
    $metadata: item.metadata ? JSON.stringify(item.metadata) : null,
  });
}

export function getKYCReviewQueue(
  status: "pending" | "approved" | "rejected" = "pending",
  limit = 50
): KYCReviewQueueRecord[] {
  return stmts.getKYCReviewQueue.all({ $status: status, $limit: limit }) as KYCReviewQueueRecord[];
}

export interface KYCReviewQueueFilters {
  status?: "pending" | "approved" | "rejected" | null;
  userId?: string | null;
  traceId?: string | null;
  reviewerId?: string | null;
  priority?: "low" | "medium" | "high" | null;
  riskScoreMin?: number | null;
  riskScoreMax?: number | null;
  createdAtFrom?: number | null; // Unix timestamp
  createdAtTo?: number | null; // Unix timestamp
  deviceSignature?: string | null;
  limit?: number;
}

export function getKYCReviewQueueFiltered(filters: KYCReviewQueueFilters): KYCReviewQueueRecord[] {
  const limit = filters.limit || 100;
  
  // Build LIKE patterns for text searches
  const userIdPattern = filters.userId ? `%${filters.userId}%` : null;
  const traceIdPattern = filters.traceId ? `%${filters.traceId}%` : null;
  const reviewerIdPattern = filters.reviewerId ? `%${filters.reviewerId}%` : null;
  const deviceSignaturePattern = filters.deviceSignature ? `%${filters.deviceSignature}%` : null;
  
  return stmts.getKYCReviewQueueFiltered.all({
    $status: filters.status || null,
    $user_id: userIdPattern,
    $trace_id: traceIdPattern,
    $reviewer_id: reviewerIdPattern,
    $priority: filters.priority || null,
    $risk_score_min: filters.riskScoreMin ?? null,
    $risk_score_max: filters.riskScoreMax ?? null,
    $created_at_from: filters.createdAtFrom ?? null,
    $created_at_to: filters.createdAtTo ?? null,
    $device_signature: deviceSignaturePattern,
    $limit: limit,
  }) as KYCReviewQueueRecord[];
}

export function getKYCReviewByTraceId(traceId: string): KYCReviewQueueRecord | null {
  return stmts.getKYCReviewByTraceId.get({ $trace_id: traceId }) as KYCReviewQueueRecord | null;
}

export function updateKYCReviewStatus(
  traceId: string,
  status: "pending" | "approved" | "rejected",
  reviewerId: string
): void {
  stmts.updateKYCReviewStatus.run({
    $trace_id: traceId,
    $status: status,
    $reviewed_at: Math.floor(Date.now() / 1000),
    $reviewer_id: reviewerId,
  });
}

export function insertKYCAuditLog(log: {
  traceId: string;
  userId: string;
  action: string;
  details?: Record<string, unknown>;
  riskScore?: number;
}): void {
  stmts.insertKYCAuditLog.run({
    $trace_id: log.traceId,
    $user_id: log.userId,
    $action: log.action,
    $details_json: log.details ? JSON.stringify(log.details) : null,
    $risk_score: log.riskScore ?? null,
  });
}

export function getKYCAuditLog(traceId: string): KYCAuditLogRecord[] {
  return stmts.getKYCAuditLog.all({ $trace_id: traceId }) as KYCAuditLogRecord[];
}

export function insertDeviceVerification(verification: {
  traceId: string;
  userId: string;
  isGenuine: boolean;
  riskScore: number;
  signatures: string[];
  logs: string[];
}): void {
  stmts.insertDeviceVerification.run({
    $trace_id: verification.traceId,
    $user_id: verification.userId,
    $is_genuine: verification.isGenuine ? 1 : 0,
    $risk_score: verification.riskScore,
    $signatures_json: JSON.stringify(verification.signatures),
    $logs_json: JSON.stringify(verification.logs),
  });
}

export function insertKYCDocument(document: {
  traceId: string;
  userId: string;
  s3Key: string;
  documentType: string;
  confidenceScore?: number;
  extractedData?: Record<string, unknown>;
}): void {
  stmts.insertKYCDocument.run({
    $trace_id: document.traceId,
    $user_id: document.userId,
    $s3_key: document.s3Key,
    $document_type: document.documentType,
    $confidence_score: document.confidenceScore ?? null,
    $extracted_data_json: document.extractedData ? JSON.stringify(document.extractedData) : null,
  });
}

export function insertKYCBioSession(session: {
  traceId: string;
  userId: string;
  passed: boolean;
  livenessScore: number;
}): void {
  stmts.insertKYCBioSession.run({
    $trace_id: session.traceId,
    $user_id: session.userId,
    $passed: session.passed ? 1 : 0,
    $liveness_score: session.livenessScore,
  });
}

export function getKYCDocuments(traceId: string): Array<{
  id: number;
  trace_id: string;
  user_id: string;
  s3_key: string;
  document_type: string;
  confidence_score: number | null;
  extracted_data_json: string | null;
  uploaded_at: number;
}> {
  return stmts.getKYCDocuments.all({ $trace_id: traceId }) as Array<{
    id: number;
    trace_id: string;
    user_id: string;
    s3_key: string;
    document_type: string;
    confidence_score: number | null;
    extracted_data_json: string | null;
    uploaded_at: number;
  }>;
}

export function getKYCBioSession(traceId: string): {
  id: number;
  trace_id: string;
  user_id: string;
  passed: number;
  liveness_score: number;
  attempted_at: number;
} | null {
  return stmts.getKYCBioSession.get({ $trace_id: traceId }) as {
    id: number;
    trace_id: string;
    user_id: string;
    passed: number;
    liveness_score: number;
    attempted_at: number;
  } | null;
}

export function getDeviceVerification(traceId: string): {
  id: number;
  trace_id: string;
  user_id: string;
  is_genuine: number;
  risk_score: number;
  signatures_json: string;
  logs_json: string;
  verified_at: number;
} | null {
  return stmts.getDeviceVerification.get({ $trace_id: traceId }) as {
    id: number;
    trace_id: string;
    user_id: string;
    is_genuine: number;
    risk_score: number;
    signatures_json: string;
    logs_json: string;
    verified_at: number;
  } | null;
}

// Export database instance for advanced queries
export { db, DB_PATH };

// Log initialization
console.log(`SQLite database initialized at ${DB_PATH}`);
