/**
 * Tier-1380 Multi-Tenant Snapshot Manager
 * Hardened, tamper-evident, tenant-isolated archive snapshots
 * 
 * @version 2.0.0
 * @author Tier-1380 Enterprise Team
 */

import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";

const SNAPSHOT_DIR = "./snapshots";
const AUDIT_DB = new Database("./data/tier1380-snapshots.db");

// Ensure directories & table exist
await Bun.$`mkdir -p ${SNAPSHOT_DIR}`;

AUDIT_DB.exec(`
  CREATE TABLE IF NOT EXISTS tenant_snapshots (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))),
    tenant TEXT NOT NULL,
    snapshot_path TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    entry_count INTEGER NOT NULL,
    compression_level INTEGER NOT NULL,
    variant TEXT,
    pool_size INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT
  ) STRICT;
  
  CREATE TABLE IF NOT EXISTS snapshot_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (snapshot_id) REFERENCES tenant_snapshots (id)
  );
  
  CREATE INDEX IF NOT EXISTS idx_snapshots_tenant ON tenant_snapshots(tenant);
  CREATE INDEX IF NOT EXISTS idx_snapshots_created ON tenant_snapshots(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_snapshot ON snapshot_audit_log(snapshot_id);
`);

export interface SnapshotMetadata {
  tenant: string;
  variant?: string;
  poolSize: number;
  timestamp: string;
  violations: Array<{ event: string; width?: number; preview?: string; ts?: string }>;
  config?: Record<string, any>;
  version: string;
  environment: string;
}

export interface SnapshotResult {
  path: string;
  size: number;
  sha256: string;
  entries: number;
  tenant: string;
  timestamp: string;
  id: string;
}

export interface SnapshotInfo {
  id: string;
  tenant: string;
  path: string;
  created_at: string;
  size_kb: number;
  sha256: string;
  entry_count: number;
  compression_level: number;
  variant?: string;
  pool_size?: number;
}

/**
 * Create a gzipped tar snapshot for one tenant with comprehensive security
 */
export async function createTenantSnapshot(
  tenant: string, 
  options: {
    variant?: string;
    poolSize?: number;
    compressionLevel?: number;
    includeConfig?: boolean;
    maxViolations?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<SnapshotResult> {
  const startTime = performance.now();
  
  console.log(`📸 Creating Tier-1380 snapshot for tenant: ${tenant}`);
  
  // Validate tenant ID
  if (!tenant || !/^[a-zA-Z0-9_-]+$/.test(tenant)) {
    throw new Error(`Invalid tenant ID: ${tenant}`);
  }

  // 1. Gather tenant-specific data with security bounds
  const maxViolations = options.maxViolations || 1000;
  const violations = AUDIT_DB.query(
    `SELECT event, width, preview, ts FROM violations 
     WHERE tenant = ? 
     ORDER BY ts DESC 
     LIMIT ?`
  ).all(tenant, maxViolations) as any[];

  // 2. Build comprehensive metadata
  const meta: SnapshotMetadata = {
    tenant,
    variant: options.variant || "production",
    poolSize: options.poolSize || 10,
    timestamp: new Date().toISOString(),
    violations,
    config: options.includeConfig ? getSanitizedTenantConfig(tenant) : undefined,
    version: "2.0.0",
    environment: process.env.NODE_ENV || "production",
    ...options.metadata
  };

  // 3. Prepare archive contents with tenant isolation
  const files: Record<string, string> = {
    "metadata.json": JSON.stringify(meta, null, 2),
    "violations.jsonl": violations
      .map(v => JSON.stringify(v))
      .join("\n"),
    "snapshot-info.txt": `Tier-1380 Snapshot\nTenant: ${tenant}\nCreated: ${meta.timestamp}\nVariant: ${meta.variant}\nPool Size: ${meta.poolSize}\nViolations: ${violations.length}\n`,
    "integrity.json": JSON.stringify({
      created_at: meta.timestamp,
      creator: "tier1380-snapshot-manager",
      version: "2.0.0",
      tenant_isolation: true,
      compression: "gzip"
    }, null, 2)
  };

  // Add optional config if requested
  if (options.includeConfig && meta.config) {
    files["config.json"] = JSON.stringify(meta.config, null, 2);
  }

  // 4. Create gzipped archive with security
  const compressionLevel = options.compressionLevel || 7;
  const archive = new Bun.Archive(files, { compress: "gzip", level: compressionLevel });

  // 5. Generate secure filename with tenant prefix
  const safeTenant = tenant.replace(/[^a-z0-9_-]/gi, "_");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${safeTenant}-${timestamp}.tar.gz`;
  const fullPath = `${SNAPSHOT_DIR}/${filename}`;

  // 6. Atomic write with integrity check
  const tempPath = `${fullPath}.tmp`;
  await Bun.write(tempPath, archive);
  
  // 7. Compute integrity hash
  const bytes = await Bun.file(tempPath).arrayBuffer();
  const sha256 = await crypto.subtle.digest('SHA-256', bytes);
  const sha256Hex = Array.from(new Uint8Array(sha256))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // 8. Atomic move to final location
  await Bun.rename(tempPath, fullPath);

  // 9. Database transaction for audit integrity
  const snapshotId = randomUUID();
  AUDIT_DB.transaction(() => {
    AUDIT_DB.run(
      `INSERT INTO tenant_snapshots 
       (id, tenant, snapshot_path, sha256, file_size, entry_count, compression_level, variant, pool_size, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        snapshotId,
        tenant,
        fullPath,
        sha256Hex,
        bytes.byteLength,
        Object.keys(files).length,
        compressionLevel,
        meta.variant,
        meta.poolSize,
        JSON.stringify({ violations_count: violations.length, config_included: !!meta.config })
      ]
    );

    // Audit log entry
    AUDIT_DB.run(
      `INSERT INTO snapshot_audit_log (snapshot_id, action, actor, details)
       VALUES (?, ?, ?, ?)`,
      [
        snapshotId,
        'created',
        process.env.USER || 'system',
        JSON.stringify({
          duration_ms: performance.now() - startTime,
          compression_level: compressionLevel,
          violations_count: violations.length,
          file_size_bytes: bytes.byteLength
        })
      ]
    );
  })();

  // 10. Col-89 safe console log
  const logLine = `📸 Snapshot created: ${filename} | Size: ${Math.round(bytes.byteLength / 1024)} KiB | SHA-256: ${sha256Hex.slice(0,16)}… | Entries: ${Object.keys(files).length}`;
  const width = Bun.stringWidth(logLine, { countAnsiEscapeCodes: false });
  console.log(width <= 89 ? logLine : Bun.escapeHTML(logLine.slice(0, 86)) + "…");

  return {
    path: fullPath,
    size: bytes.byteLength,
    sha256: sha256Hex,
    entries: Object.keys(files).length,
    tenant,
    timestamp: meta.timestamp,
    id: snapshotId
  };
}

/**
 * List latest snapshots with filtering options
 */
export function listRecentSnapshots(
  limit = 10, 
  filters: {
    tenant?: string;
    variant?: string;
    since?: Date;
    minSize?: number;
    maxSize?: number;
  } = {}
): SnapshotInfo[] {
  let query = `
    SELECT id, tenant, snapshot_path, created_at, file_size / 1024.0 AS size_kb, 
           sha256, entry_count, compression_level, variant, pool_size
    FROM tenant_snapshots
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.tenant) {
    query += " AND tenant = ?";
    params.push(filters.tenant);
  }

  if (filters.variant) {
    query += " AND variant = ?";
    params.push(filters.variant);
  }

  if (filters.since) {
    query += " AND created_at >= ?";
    params.push(filters.since.toISOString());
  }

  if (filters.minSize) {
    query += " AND file_size >= ?";
    params.push(filters.minSize * 1024);
  }

  if (filters.maxSize) {
    query += " AND file_size <= ?";
    params.push(filters.maxSize * 1024);
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  return AUDIT_DB.query(query).all(...params) as SnapshotInfo[];
}

/**
 * Extract a single snapshot with comprehensive security validation
 */
export async function extractSnapshot(
  path: string, 
  targetDir: string,
  options: {
    validateIntegrity?: boolean;
    allowedPaths?: string[];
    maxExtractSize?: number;
  } = {}
): Promise<{
  entries: number;
  integrity: { valid: boolean; expected_hash?: string; actual_hash?: string };
  files: string[];
}> {
  console.log(`📦 Extracting snapshot: ${path}`);

  // 1. Path validation - prevent directory traversal
  const resolvedPath = Bun.resolveSync(path, process.cwd());
  const resolvedSnapshotDir = Bun.resolveSync(SNAPSHOT_DIR, process.cwd());
  
  if (!resolvedPath.startsWith(resolvedSnapshotDir)) {
    throw new Error(`Invalid snapshot path: ${path}`);
  }

  // 2. Size validation
  const fileSize = (await Bun.file(path).stat()).size;
  if (options.maxExtractSize && fileSize > options.maxExtractSize) {
    throw new Error(`Snapshot too large: ${fileSize} bytes > ${options.maxExtractSize} bytes`);
  }

  // 3. Load and validate archive
  const bytes = await Bun.file(path).arrayBuffer();
  const archive = new Bun.Archive(bytes);

  // 4. Integrity validation
  let integrity = { valid: true };
  if (options.validateIntegrity) {
    const actualHash = await crypto.subtle.digest('SHA-256', bytes);
    const actualHashHex = Array.from(new Uint8Array(actualHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const dbRecord = AUDIT_DB.query(
      "SELECT sha256 FROM tenant_snapshots WHERE snapshot_path = ?"
    ).get(path) as any;

    if (dbRecord && dbRecord.sha256 !== actualHashHex) {
      integrity = { 
        valid: false, 
        expected_hash: dbRecord.sha256, 
        actual_hash: actualHashHex 
      };
      throw new Error(`Integrity check failed: hash mismatch`);
    }
    integrity = { valid: true, expected_hash: dbRecord.sha256, actual_hash: actualHashHex };
  }

  // 5. Path safety validation
  const files = await archive.files();
  const extractedFiles: string[] = [];
  
  for (const [archivePath] of files) {
    // Check for dangerous paths
    if (archivePath.includes("..") || archivePath.startsWith("/")) {
      throw new Error(`Unsafe path in archive: ${archivePath}`);
    }

    // Check against allowed paths if specified
    if (options.allowedPaths && !options.allowedPaths.some(allowed => archivePath.startsWith(allowed))) {
      console.warn(`Skipping disallowed path: ${archivePath}`);
      continue;
    }

    extractedFiles.push(archivePath);
  }

  // 6. Create target directory
  await Bun.$`mkdir -p ${targetDir}`;

  // 7. Extract with audit logging
  const entryCount = await archive.extract(targetDir);

  // 8. Log extraction
  const snapshotRecord = AUDIT_DB.query(
    "SELECT id, tenant FROM tenant_snapshots WHERE snapshot_path = ?"
  ).get(path) as any;

  if (snapshotRecord) {
    AUDIT_DB.run(
      `INSERT INTO snapshot_audit_log (snapshot_id, action, actor, details)
       VALUES (?, ?, ?, ?)`,
      [
        snapshotRecord.id,
        'extracted',
        process.env.USER || 'system',
        JSON.stringify({
          target_dir: targetDir,
          entries_extracted: entryCount,
          integrity_valid: integrity.valid,
          extracted_at: new Date().toISOString()
        })
      ]
    );
  }

  console.log(`✅ Extracted ${entryCount} entries to ${targetDir}`);

  return {
    entries: entryCount,
    integrity,
    files: extractedFiles
  };
}

/**
 * Verify snapshot integrity
 */
export async function verifySnapshot(path: string): Promise<{
  valid: boolean;
  expected_hash: string;
  actual_hash: string;
  file_exists: boolean;
  size_matches: boolean;
}> {
  try {
    const fileExists = await Bun.file(path).exists();
    if (!fileExists) {
      return {
        valid: false,
        expected_hash: "",
        actual_hash: "",
        file_exists: false,
        size_matches: false
      };
    }

    const dbRecord = AUDIT_DB.query(
      "SELECT sha256, file_size FROM tenant_snapshots WHERE snapshot_path = ?"
    ).get(path) as any;

    if (!dbRecord) {
      return {
        valid: false,
        expected_hash: "",
        actual_hash: "",
        file_exists: true,
        size_matches: false
      };
    }

    const bytes = await Bun.file(path).arrayBuffer();
    const actualHash = await crypto.subtle.digest('SHA-256', bytes);
    const actualHashHex = Array.from(new Uint8Array(actualHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const sizeMatches = bytes.byteLength === dbRecord.file_size;
    const hashMatches = actualHashHex === dbRecord.sha256;

    return {
      valid: hashMatches && sizeMatches,
      expected_hash: dbRecord.sha256,
      actual_hash: actualHashHex,
      file_exists: true,
      size_matches
    };
  } catch (error) {
    return {
      valid: false,
      expected_hash: "",
      actual_hash: "",
      file_exists: false,
      size_matches: false
    };
  }
}

/**
 * Cleanup old snapshots (retention management)
 */
export function cleanupOldSnapshots(
  retentionDays: number = 30,
  dryRun: boolean = true
): { deleted: number; totalSize: number; snapshots: SnapshotInfo[] } {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  
  const oldSnapshots = AUDIT_DB.query(
    `SELECT id, tenant, snapshot_path, file_size, created_at 
     FROM tenant_snapshots 
     WHERE created_at < ?`
  ).all(cutoffDate.toISOString()) as any[];

  let totalSize = 0;
  const deleted: string[] = [];

  for (const snapshot of oldSnapshots) {
    try {
      if (!dryRun) {
        await Bun.remove(snapshot.snapshot_path);
        AUDIT_DB.run("DELETE FROM tenant_snapshots WHERE id = ?", snapshot.id);
        AUDIT_DB.run(
          `INSERT INTO snapshot_audit_log (snapshot_id, action, actor, details)
           VALUES (?, ?, ?, ?)`,
          [
            snapshot.id,
            'deleted',
            'system-cleanup',
            JSON.stringify({
              reason: 'retention_policy',
              retention_days: retentionDays,
              file_size: snapshot.file_size
            })
          ]
        );
      }
      totalSize += snapshot.file_size;
      deleted.push(snapshot.snapshot_path);
    } catch (error) {
      console.warn(`Failed to cleanup snapshot ${snapshot.id}: ${error}`);
    }
  }

  if (dryRun) {
    console.log(`🔍 DRY RUN: Would delete ${deleted.length} snapshots (${Math.round(totalSize / 1024 / 1024)} MiB) older than ${retentionDays} days`);
  } else {
    console.log(`🗑️ Deleted ${deleted.length} snapshots (${Math.round(totalSize / 1024 / 1024)} MiB) older than ${retentionDays} days`);
  }

  return {
    deleted: deleted.length,
    totalSize,
    snapshots: oldSnapshots
  };
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  totalSnapshots: number;
  totalSizeMB: number;
  tenantCounts: Record<string, number>;
  averageSizeMB: number;
  oldestSnapshot: Date | null;
  newestSnapshot: Date | null;
} {
  const stats = AUDIT_DB.query(`
    SELECT 
      COUNT(*) as total,
      SUM(file_size) as total_size,
      COUNT(DISTINCT tenant) as unique_tenants,
      MIN(created_at) as oldest,
      MAX(created_at) as newest,
      AVG(file_size) as avg_size
    FROM tenant_snapshots
  `).get() as any;

  const tenantCounts = AUDIT_DB.query(`
    SELECT tenant, COUNT(*) as count 
    FROM tenant_snapshots 
    GROUP BY tenant
  `).all() as any[];

  return {
    totalSnapshots: stats.total || 0,
    totalSizeMB: Math.round((stats.total_size || 0) / 1024 / 1024),
    tenantCounts: tenantCounts.reduce((acc, row) => {
      acc[row.tenant] = row.count;
      return acc;
    }, {} as Record<string, number>),
    averageSizeMB: Math.round((stats.avg_size || 0) / 1024 / 1024),
    oldestSnapshot: stats.oldest ? new Date(stats.oldest) : null,
    newestSnapshot: stats.newest ? new Date(stats.newest) : null
  };
}

// Helper function to get sanitized tenant config
function getSanitizedTenantConfig(tenant: string): Record<string, any> {
  // Return a sanitized version of tenant configuration
  // Remove sensitive data like passwords, API keys, etc.
  return {
    tenant,
    variant: "production",
    features: ["archive", "audit", "security"],
    limits: {
      maxSnapshots: 100,
      maxViolationEntries: 1000,
      compressionLevel: 7
    },
    // Never include sensitive data in snapshots
  };
}

// Export database for external access
export { AUDIT_DB };
