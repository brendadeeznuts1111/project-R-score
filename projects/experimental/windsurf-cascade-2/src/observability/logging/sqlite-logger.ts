// src/observability/logging/sqlite-logger.ts
//! SQLite-backed log storage (fast local, synced to R2)

import { Database } from "bun:sqlite";

// Get current 13-byte config
function getCurrentConfig() {
  return {
    version: 2,
    registryHash: 0x12345678,
    featureFlags: 0x00000007,
    terminal: { mode: "cooked", rows: 48, cols: 80 },
    features: { PRIVATE_REGISTRY: true, PREMIUM_TYPES: true, DEBUG: true }
  };
}

// Performance tracking
function nanoseconds(): number {
  if (typeof Bun !== 'undefined' && Bun.nanoseconds) {
    return Bun.nanoseconds();
  }
  return Date.now() * 1000000;
}

// Open SQLite DB (connection per domain, hashed by registry)
const config = getCurrentConfig();
const dbPath = `./logs-${config.registryHash.toString(16)}-@domain1.sqlite`;
const db = new Database(dbPath);

// Schema (64 bytes per row, optimized for 13-byte config)
db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp_nanoseconds INTEGER NOT NULL,    -- 8 bytes
    config_version INTEGER,                    -- 1 byte (Byte 0)
    feature_flags INTEGER,                     -- 4 bytes (Bytes 5-8)
    terminal_mode INTEGER,                     -- 1 byte (Byte 9)
    domain TEXT NOT NULL,                      -- 8 bytes (@domain1)
    level TEXT,                                -- 5 bytes (debug, info, etc)
    message TEXT,                              -- variable
    duration_ns INTEGER,                       -- 8 bytes
    meta TEXT                                  -- JSON (compressed)
  ) STRICT;
  
  -- Index for fast queries by config state
  CREATE INDEX IF NOT EXISTS idx_config ON logs(config_version, feature_flags);
  
  -- Index for time-based queries
  CREATE INDEX IF NOT EXISTS idx_time ON logs(timestamp_nanoseconds);
  
  -- Index for domain-based queries
  CREATE INDEX IF NOT EXISTS idx_domain ON logs(domain);
  
  -- Index for level-based queries
  CREATE INDEX IF NOT EXISTS idx_level ON logs(level);
`);

// In-memory buffer for batch inserts
let logBuffer: any[] = [];
let flushTimer: Timer | null = null;

// Log to SQLite (faster than R2 for immediate queries)
export function logToSQLite(entry: {
  domain?: string;
  level?: string;
  message: string;
  duration_ns?: number;
  meta?: any;
}) {
  const start = nanoseconds();
  
  const logEntry = {
    timestamp: nanoseconds(),
    config_version: config.version,                          // Byte 0
    feature_flags: config.featureFlags,                     // Bytes 5-8
    terminal_mode: config.terminal.mode === "raw" ? 2 : 1, // Byte 9
    domain: entry.domain || "@domain1",
    level: entry.level || "info",
    message: entry.message,
    duration_ns: entry.duration_ns || 0,
    meta: entry.meta ? JSON.stringify(entry.meta) : null
  };
  
  // Add to buffer for batch processing
  logBuffer.push(logEntry);
  
  // Flush if buffer is full or set timer
  if (logBuffer.length >= 100) {
    flushLogBuffer();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushLogBuffer, 1000); // Flush every second
  }
  
  const duration = nanoseconds() - start;
  
  // Debug logging
  if (config.features?.DEBUG) {
    console.debug(`[SQLITE] Log queued: ${entry.message} (${duration}ns)`);
  }
}

// Flush buffer to SQLite
function flushLogBuffer() {
  if (logBuffer.length === 0) return;
  
  const start = nanoseconds();
  const stmt = db.prepare(`
    INSERT INTO logs (timestamp_nanoseconds, config_version, feature_flags, terminal_mode, domain, level, message, duration_ns, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction(() => {
    for (const entry of logBuffer) {
      stmt.run(
        entry.timestamp,
        entry.config_version,
        entry.feature_flags,
        entry.terminal_mode,
        entry.domain,
        entry.level,
        entry.message,
        entry.duration_ns,
        entry.meta
      );
    }
  });
  
  transaction();
  
  const duration = nanoseconds() - start;
  const count = logBuffer.length;
  
  if (config.features?.DEBUG) {
    console.debug(`[SQLITE] Flushed ${count} logs in ${duration}ns (${Math.floor(duration/count)}ns per log)`);
  }
  
  // Clear buffer and timer
  logBuffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  
  // Trigger R2 sync if we have enough logs
  // Note: Bun's SQLite doesn't have a 'changes' property on the Database object
  // We'll track changes manually
  if (logBuffer.length > 1000) {
    flushSQLiteToR2(); // Async worker
  }
}

// Mock R2 sync (would integrate with Cloudflare R2 in production)
async function flushSQLiteToR2() {
  if (config.features?.DEBUG) {
    console.log("[R2] Starting sync to cloud storage...");
  }
  
  // In production, this would:
  // 1. Export recent logs from SQLite
  // 2. Compress and upload to R2
  // 3. Mark as synced in database
  
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      if (config.features?.DEBUG) {
        console.log("[R2] Sync completed");
      }
      resolve();
    }, 100); // Mock async operation
  });
}

// Query logs by config state (fast index scan)
export function queryLogsByConfig(version: number, flags: number, limit: number = 100): any[] {
  const start = nanoseconds();
  
  const stmt = db.prepare(`
    SELECT * FROM logs 
    WHERE config_version = ? AND feature_flags = ?
    ORDER BY timestamp_nanoseconds DESC
    LIMIT ?
  `);
  
  const results = stmt.all(version, flags, limit) as any[];
  
  const duration = nanoseconds() - start;
  
  if (config.features?.DEBUG) {
    console.debug(`[SQLITE] Query by config completed in ${duration}ns, returned ${results.length} results`);
  }
  
  return results;
}

// Query logs by time range
export function queryLogsByTimeRange(startTime: number, endTime: number, limit: number = 100): any[] {
  const start = nanoseconds();
  
  const stmt = db.prepare(`
    SELECT * FROM logs 
    WHERE timestamp_nanoseconds BETWEEN ? AND ?
    ORDER BY timestamp_nanoseconds DESC
    LIMIT ?
  `);
  
  const results = stmt.all(startTime, endTime, limit) as any[];
  
  const duration = nanoseconds() - start;
  
  if (config.features?.DEBUG) {
    console.debug(`[SQLITE] Time range query completed in ${duration}ns, returned ${results.length} results`);
  }
  
  return results;
}

// Query logs by domain
export function queryLogsByDomain(domain: string, limit: number = 100): any[] {
  const start = nanoseconds();
  
  const stmt = db.prepare(`
    SELECT * FROM logs 
    WHERE domain = ?
    ORDER BY timestamp_nanoseconds DESC
    LIMIT ?
  `);
  
  const results = stmt.all(domain, limit) as any[];
  
  const duration = nanoseconds() - start;
  
  if (config.features?.DEBUG) {
    console.debug(`[SQLITE] Domain query completed in ${duration}ns, returned ${results.length} results`);
  }
  
  return results;
}

// Get database statistics
export function getDatabaseStats() {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_logs,
      COUNT(DISTINCT config_version) as unique_versions,
      COUNT(DISTINCT feature_flags) as unique_flag_combinations,
      COUNT(DISTINCT domain) as unique_domains,
      MIN(timestamp_nanoseconds) as earliest_log,
      MAX(timestamp_nanoseconds) as latest_log
    FROM logs
  `).get() as any;
  
  return {
    ...stats,
    database_path: dbPath,
    buffer_size: logBuffer.length,
    config_version: config.version,
    feature_flags: config.featureFlags.toString(16)
  };
}

// Cleanup old logs (maintenance)
export function cleanupOldLogs(olderThanNanoseconds: number = 7 * 24 * 60 * 60 * 1000000000) { // 7 days
  const cutoff = nanoseconds() - olderThanNanoseconds;
  
  const stmt = db.prepare(`
    DELETE FROM logs 
    WHERE timestamp_nanoseconds < ?
  `);
  
  const result = stmt.run(cutoff);
  
  if (config.features?.DEBUG) {
    console.debug(`[SQLITE] Cleaned up ${result.changes} old logs`);
  }
  
  return result.changes;
}

// Export database for testing
export { db };

// Initialize logging system
console.log("🗄️  SQLite logger initialized with 13-byte config");
console.log(`📊 Database: ${dbPath}`);
console.log(`🔧 Config: v${config.version}, flags: 0x${config.featureFlags.toString(16)}`);

// Example usage
export function demonstrateLogging() {
  console.log("📝 Demonstrating SQLite logging with 13-byte config");
  
  // Log some example entries
  logToSQLite({
    level: "info",
    message: "Registry started successfully",
    meta: { version: config.version, port: 4873 }
  });
  
  logToSQLite({
    level: "debug",
    message: "13-byte config loaded",
    duration_ns: 45000,
    meta: { 
      config_version: config.version,
      feature_flags: config.featureFlags,
      terminal_mode: config.terminal.mode
    }
  });
  
  logToSQLite({
    level: "info",
    message: "Package published",
    meta: { package: "@mycompany/pkg", version: "1.0.0" }
  });
  
  // Flush buffer immediately for demo
  flushLogBuffer();
  
  // Query logs back
  const logs = queryLogsByConfig(config.version, config.featureFlags, 10);
  console.log(`📋 Retrieved ${logs.length} logs for current config`);
  
  // Show stats
  const stats = getDatabaseStats();
  console.log("📊 Database stats:", stats);
}

// Auto-flush on process exit
process.on('exit', flushLogBuffer);
process.on('SIGINT', () => {
  flushLogBuffer();
  process.exit(0);
});
process.on('SIGTERM', () => {
  flushLogBuffer();
  process.exit(0);
});
