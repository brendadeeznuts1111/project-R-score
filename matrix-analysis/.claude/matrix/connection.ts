#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA: Database Connection Manager
 *
 * Handles PostgreSQL (production) and SQLite (local) with:
 * - DNS prefetch for database hosts
 * - fetch.preconnect for early TCP/TLS setup
 * - Environment variable configuration
 *
 * @module connection
 * @tier 1380-OMEGA-HARDENED
 */

import { Database } from "bun:sqlite";
import { dns } from "bun";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const DB_CONFIG = {
	// Local SQLite path (default for testing)
	SQLITE_PATH: process.env.TIER1380_SQLITE_PATH || "data/tier1380.db",

	// PostgreSQL URL (production)
	POSTGRES_URL: process.env.DATABASE_URL || null,

	// Connection mode: "sqlite" | "postgres" | "auto"
	MODE: (process.env.TIER1380_DB_MODE || "auto") as "sqlite" | "postgres" | "auto",
} as const;

// ═══════════════════════════════════════════════════════════════
// DNS PREFETCH & PRECONNECT
// ═══════════════════════════════════════════════════════════════

/**
 * Extract hostname from DATABASE_URL for DNS prefetch
 */
function extractHostname(url: string): string | null {
	try {
		const parsed = new URL(url);
		return parsed.hostname;
	} catch {
		return null;
	}
}

/**
 * Prefetch DNS for database host (call early in app lifecycle)
 */
export function prefetchDatabaseDns(): void {
	if (DB_CONFIG.POSTGRES_URL) {
		const hostname = extractHostname(DB_CONFIG.POSTGRES_URL);
		if (hostname) {
			// v1.2+: DNS prefetch reduces connection latency
			dns.prefetch(hostname, 5432);
			console.log(`🔍 DNS prefetch: ${hostname}:5432`);
		}
	}
}

/**
 * Preconnect to database (TCP + TLS handshake)
 */
export async function preconnectDatabase(): Promise<void> {
	if (DB_CONFIG.POSTGRES_URL) {
		const hostname = extractHostname(DB_CONFIG.POSTGRES_URL);
		if (hostname) {
			// v1.2+: fetch.preconnect for early TCP/TLS setup
			const preconnectUrl = `https://${hostname}:5432`;
			try {
				await fetch.preconnect(preconnectUrl);
				console.log(`🔗 Preconnect: ${preconnectUrl}`);
			} catch {
				// Preconnect failure is non-fatal
				console.log(`⚠️  Preconnect skipped (not HTTPS): ${hostname}:5432`);
			}
		}
	}
}

// ═══════════════════════════════════════════════════════════════
// SQLITE CONNECTION (LOCAL/TESTING)
// ═══════════════════════════════════════════════════════════════

let sqliteDb: Database | null = null;

/**
 * Get or create SQLite connection
 */
export function getSqliteDb(): Database {
	if (!sqliteDb) {
		// Ensure data directory exists
		const dir = DB_CONFIG.SQLITE_PATH.split("/").slice(0, -1).join("/");
		if (dir) {
			try {
				Bun.spawnSync(["mkdir", "-p", dir]);
			} catch {
				// Directory may already exist
			}
		}

		sqliteDb = new Database(DB_CONFIG.SQLITE_PATH, { create: true });
		console.log(`📂 SQLite: ${DB_CONFIG.SQLITE_PATH}`);
	}
	return sqliteDb;
}

/**
 * Close SQLite connection
 */
export function closeSqliteDb(): void {
	if (sqliteDb) {
		sqliteDb.close();
		sqliteDb = null;
	}
}

// ═══════════════════════════════════════════════════════════════
// SCHEMA INITIALIZATION
// ═══════════════════════════════════════════════════════════════

export const TIER1380_SCHEMA = `
-- Tier-1380 Matrix Schema (60 columns, sparse data)
CREATE TABLE IF NOT EXISTS tier1380_matrix (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,

  -- Hardware Layer (Cols 51-53)
  col_51_crc32 INTEGER DEFAULT NULL,
  col_52_hardware_accel TEXT DEFAULT NULL,
  col_53_integrity_verified INTEGER DEFAULT NULL,

  -- SIMD JSON Layer (Cols 54-56)
  col_54_simd_json_time INTEGER DEFAULT NULL,
  col_55_json_throughput INTEGER DEFAULT NULL,
  col_56_stringifier_ops INTEGER DEFAULT NULL,

  -- Temporal Layer (Cols 57-58)
  col_57_idle_start INTEGER DEFAULT NULL,
  col_58_timer_state TEXT DEFAULT NULL,

  -- Compiler Layer (Cols 59-60)
  col_59_arm64_ccmp INTEGER DEFAULT NULL,
  col_60_compiler_opt_level TEXT DEFAULT NULL,

  -- Audit
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_tier1380_timestamp ON tier1380_matrix(timestamp);
CREATE INDEX IF NOT EXISTS idx_tier1380_crc32 ON tier1380_matrix(col_51_crc32) WHERE col_51_crc32 IS NOT NULL;
`;

/**
 * Initialize SQLite schema
 */
export function initSqliteSchema(): void {
	const db = getSqliteDb();
	db.exec(TIER1380_SCHEMA);
	console.log("✅ SQLite schema initialized");
}

// ═══════════════════════════════════════════════════════════════
// CONNECTION MODE DETECTION
// ═══════════════════════════════════════════════════════════════

export type ConnectionMode = "sqlite" | "postgres";

/**
 * Detect connection mode based on config
 */
export function getConnectionMode(): ConnectionMode {
	if (DB_CONFIG.MODE === "postgres" && DB_CONFIG.POSTGRES_URL) {
		return "postgres";
	}
	if (DB_CONFIG.MODE === "sqlite") {
		return "sqlite";
	}
	// Auto: prefer postgres if URL available, else sqlite
	if (DB_CONFIG.MODE === "auto") {
		return DB_CONFIG.POSTGRES_URL ? "postgres" : "sqlite";
	}
	return "sqlite";
}

/**
 * Get connection status
 */
export function getConnectionStatus(): {
	mode: ConnectionMode;
	path: string;
	connected: boolean;
	prefetched: boolean;
} {
	const mode = getConnectionMode();
	return {
		mode,
		path: mode === "postgres" ? DB_CONFIG.POSTGRES_URL || "N/A" : DB_CONFIG.SQLITE_PATH,
		connected: mode === "sqlite" ? sqliteDb !== null : false,
		prefetched: false,
	};
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

if (import.meta.main) {
	console.log("🔌 Tier-1380 OMEGA: Connection Manager\n");

	const command = Bun.argv[2];

	switch (command) {
		case "init": {
			prefetchDatabaseDns();
			await preconnectDatabase();
			initSqliteSchema();
			break;
		}

		case "status": {
			const status = getConnectionStatus();
			console.log(Bun.inspect.table([status]));
			break;
		}

		case "prefetch": {
			prefetchDatabaseDns();
			await preconnectDatabase();
			console.log("✅ DNS prefetch and preconnect complete");
			break;
		}

		default: {
			console.log("Usage: bun matrix/connection.ts <command>\n");
			console.log("Commands:");
			console.log("  init      Initialize database and schema");
			console.log("  status    Show connection status");
			console.log("  prefetch  Run DNS prefetch and preconnect\n");
			console.log("Environment:");
			console.log(
				"  TIER1380_SQLITE_PATH  SQLite file path (default: data/tier1380.db)",
			);
			console.log("  DATABASE_URL          PostgreSQL connection URL");
			console.log("  TIER1380_DB_MODE      Connection mode: sqlite|postgres|auto");
		}
	}
}
