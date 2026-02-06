/**
 * Tier-1380 OMEGA Phase 3.9 Apex: Sovereign Registry
 *
 * Matrix persistence with sparse data handling
 * v1.3.6: undefined columns are OMITTED, letting DB use DEFAULT
 * v1.3.7: SQLite local mode with DNS prefetch for PostgreSQL
 * v3.9 Apex: Added columns 72-75 for Chrome State Intelligence
 *   - Col 72: entropy_vector (float)
 *   - Col 73: seal_latency_ms (float)
 *   - Col 74: security_score (float)
 *   - Col 75: omega_status (string)
 *
 * @module registry
 * @tier 1380-OMEGA-v3.9-Apex
 */

import { sql } from "bun";
import {
	type ConnectionMode,
	getConnectionMode,
	getSqliteDb,
	initSqliteSchema,
	preconnectDatabase,
	prefetchDatabaseDns,
} from "./connection.ts";

export interface MatrixRow {
	id: string;
	timestamp: bigint;
	col_51_crc32?: number; // Hardware layer
	col_52_hardware_accel?: string;
	col_53_integrity_verified?: boolean;
	col_54_simd_json_time?: number; // Serialization
	col_55_json_throughput?: number;
	col_56_stringifier_ops?: number;
	col_57_idle_start?: number; // Temporal
	col_58_timer_state?: string;
	col_59_arm64_ccmp?: boolean; // Optimization
	col_60_compiler_opt_level?: string;

	// Phase 3.9 Apex: Chrome State Intelligence (Cols 72-75)
	col_72_entropy_vector?: number; // Shannon entropy of cookie values
	col_73_seal_latency_ms?: number; // Integrity seal computation time
	col_74_security_score?: number; // Spec compliance score (0-1)
	col_75_omega_status?: string; // Health bitmask: VALIDATED|RISKY|EXPIRED|CORRUPT

	// ... 50 other optional columns
}

/**
 * Get current connection mode
 */
export function getRegistryMode(): ConnectionMode {
	return getConnectionMode();
}

/**
 * Initialize registry with DNS prefetch and preconnect
 */
export async function initRegistry(): Promise<void> {
	const mode = getConnectionMode();

	if (mode === "postgres") {
		// DNS prefetch and preconnect for PostgreSQL
		prefetchDatabaseDns();
		await preconnectDatabase();
		await sql.unsafe(REGISTRY_SCHEMA);
	} else {
		// SQLite local mode
		initSqliteSchema();
	}
}

/**
 * Commit a sparse matrix row to the Sovereign Registry
 * v1.3.6: undefined values are omitted, letting DB use DEFAULT NULL
 * v1.3.7: SQLite local mode support
 */
export async function commitToSovereignRegistry(row: MatrixRow): Promise<void> {
	const mode = getConnectionMode();

	if (mode === "sqlite") {
		// SQLite mode
		const db = getSqliteDb();
		const stmt = db.prepare(`
			INSERT OR REPLACE INTO tier1380_matrix
			(id, timestamp, col_51_crc32, col_52_hardware_accel, col_53_integrity_verified,
			 col_54_simd_json_time, col_55_json_throughput, col_56_stringifier_ops,
			 col_57_idle_start, col_58_timer_state, col_59_arm64_ccmp, col_60_compiler_opt_level)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);
		stmt.run(
			row.id,
			Number(row.timestamp),
			row.col_51_crc32 ?? null,
			row.col_52_hardware_accel ?? null,
			row.col_53_integrity_verified === undefined
				? null
				: row.col_53_integrity_verified
					? 1
					: 0,
			row.col_54_simd_json_time ?? null,
			row.col_55_json_throughput ?? null,
			row.col_56_stringifier_ops ?? null,
			row.col_57_idle_start ?? null,
			row.col_58_timer_state ?? null,
			row.col_59_arm64_ccmp === undefined ? null : row.col_59_arm64_ccmp ? 1 : 0,
			row.col_60_compiler_opt_level ?? null,
		);
		return;
	}

	// PostgreSQL mode - v1.3.6: undefined columns are OMITTED
	await sql`
    INSERT INTO tier1380_matrix ${sql({
			id: row.id,
			timestamp: row.timestamp,
			col_51_crc32: row.col_51_crc32,
			col_52_hardware_accel: row.col_52_hardware_accel,
			col_53_integrity_verified: row.col_53_integrity_verified,
			col_54_simd_json_time: row.col_54_simd_json_time,
			col_55_json_throughput: row.col_55_json_throughput,
			col_56_stringifier_ops: row.col_56_stringifier_ops,
			col_57_idle_start: row.col_57_idle_start,
			col_58_timer_state: row.col_58_timer_state,
			col_59_arm64_ccmp: row.col_59_arm64_ccmp,
			col_60_compiler_opt_level: row.col_60_compiler_opt_level,
		})}
  `;
}

/**
 * Bulk insert with sparse data - fixed in v1.3.6
 * Previously: If first object lacked col_59, ALL rows dropped col_59
 */
export async function bulkCommitToRegistry(rows: MatrixRow[]): Promise<void> {
	const mode = getConnectionMode();

	if (mode === "sqlite") {
		// SQLite: iterate and insert each row
		for (const row of rows) {
			await commitToSovereignRegistry(row);
		}
		return;
	}

	// PostgreSQL: v1.3.6 bulk insert with sparse data
	await sql`INSERT INTO tier1380_matrix ${sql(rows)}`;
}

/**
 * Query matrix with time-series filtering
 */
export async function queryRegistry(
	startTime: bigint,
	endTime: bigint,
): Promise<MatrixRow[]> {
	const mode = getConnectionMode();

	if (mode === "sqlite") {
		const db = getSqliteDb();
		const rows = db
			.query(
				`SELECT * FROM tier1380_matrix
				 WHERE timestamp BETWEEN ? AND ?
				 ORDER BY timestamp ASC`,
			)
			.all(Number(startTime), Number(endTime)) as MatrixRow[];
		return rows.map(normalizeRow);
	}

	return await sql`
    SELECT * FROM tier1380_matrix
    WHERE timestamp BETWEEN ${startTime} AND ${endTime}
    ORDER BY timestamp ASC
  `;
}

/**
 * Get latest matrix entry for each column
 */
export async function getLatestTelemetry(): Promise<Partial<MatrixRow>> {
	const mode = getConnectionMode();

	if (mode === "sqlite") {
		const db = getSqliteDb();
		const row = db
			.query(
				`SELECT * FROM tier1380_matrix
				 ORDER BY timestamp DESC
				 LIMIT 1`,
			)
			.get() as MatrixRow | null;
		return row ? normalizeRow(row) : {};
	}

	const [row] = await sql`
    SELECT * FROM tier1380_matrix
    ORDER BY timestamp DESC
    LIMIT 1
  `;
	return row || {};
}

/**
 * Normalize SQLite row (convert INTEGER booleans to actual booleans)
 */
function normalizeRow(row: Record<string, unknown>): MatrixRow {
	return {
		...row,
		id: row.id as string,
		timestamp: BigInt(row.timestamp as number),
		col_53_integrity_verified:
			row.col_53_integrity_verified === null
				? undefined
				: Boolean(row.col_53_integrity_verified),
		col_59_arm64_ccmp:
			row.col_59_arm64_ccmp === null ? undefined : Boolean(row.col_59_arm64_ccmp),
	} as MatrixRow;
}

/**
 * Schema initialization for SQLite/PostgreSQL
 * Phase 3.9 Apex: Added Chrome State Intelligence columns 72-75
 */
export const REGISTRY_SCHEMA = `
CREATE TABLE IF NOT EXISTS tier1380_matrix (
  id TEXT PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  
  -- Hardware Layer (Cols 51-53)
  col_51_crc32 INTEGER DEFAULT NULL,
  col_52_hardware_accel TEXT DEFAULT NULL,
  col_53_integrity_verified BOOLEAN DEFAULT NULL,
  
  -- SIMD JSON Layer (Cols 54-56)
  col_54_simd_json_time INTEGER DEFAULT NULL,
  col_55_json_throughput INTEGER DEFAULT NULL,
  col_56_stringifier_ops INTEGER DEFAULT NULL,
  
  -- Temporal Layer (Cols 57-58)
  col_57_idle_start INTEGER DEFAULT NULL,
  col_58_timer_state TEXT DEFAULT NULL,
  
  -- Compiler Layer (Cols 59-60)
  col_59_arm64_ccmp BOOLEAN DEFAULT NULL,
  col_60_compiler_opt_level TEXT DEFAULT NULL,
  
  -- Phase 3.9 Apex: Chrome State Intelligence (Cols 72-75)
  col_72_entropy_vector REAL DEFAULT NULL,
  col_73_seal_latency_ms REAL DEFAULT NULL,
  col_74_security_score REAL DEFAULT NULL,
  col_75_omega_status TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_timestamp ON tier1380_matrix(timestamp);
CREATE INDEX IF NOT EXISTS idx_hardware ON tier1380_matrix(col_51_crc32) WHERE col_51_crc32 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compiler ON tier1380_matrix(col_59_arm64_ccmp) WHERE col_59_arm64_ccmp IS NOT NULL;

-- Phase 3.9 Apex: New indexes for Chrome State Intelligence
CREATE INDEX IF NOT EXISTS idx_entropy ON tier1380_matrix(col_72_entropy_vector) WHERE col_72_entropy_vector IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_omega_status ON tier1380_matrix(col_75_omega_status) WHERE col_75_omega_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_score ON tier1380_matrix(col_74_security_score) WHERE col_74_security_score IS NOT NULL;
`;

/**
 * Initialize the Sovereign Registry
 * Uses sql.unsafe() for raw DDL statements (CREATE TABLE, CREATE INDEX)
 */
export async function initializeRegistry(): Promise<void> {
	await sql.unsafe(REGISTRY_SCHEMA);
}

// CLI usage
if (import.meta.main) {
	const command = Bun.argv[2];
	const mode = getConnectionMode();

	console.log(`🔌 Tier-1380 OMEGA Sovereign Registry (${mode} mode)\n`);

	switch (command) {
		case "init": {
			await initRegistry();
			console.log("✅ Sovereign Registry initialized");
			break;
		}

		case "commit": {
			// Ensure schema exists
			if (mode === "sqlite") {
				initSqliteSchema();
			}

			const row: MatrixRow = {
				id: Bun.randomUUIDv7(),
				timestamp: BigInt(Date.now()),
				col_51_crc32: Bun.hash.crc32(Buffer.from("test")),
				col_52_hardware_accel: process.arch === "arm64" ? "ARM_CRC32" : "PCLMULQDQ",
				// cols 53-60 intentionally undefined (will use DEFAULT)
			};
			await commitToSovereignRegistry(row);
			console.log(`✅ Committed row: ${row.id}`);
			break;
		}

		case "query": {
			const rows = await queryRegistry(0n, BigInt(Date.now()));
			console.log(`📊 ${rows.length} rows in registry`);
			if (rows.length > 0) {
				console.log(
					Bun.inspect.table(
						rows.slice(-5).map((r) => ({
							id: `${r.id.slice(0, 8)}...`,
							timestamp: new Date(Number(r.timestamp)).toISOString(),
							crc32: r.col_51_crc32?.toString(16) || "—",
							hw_accel: r.col_52_hardware_accel || "—",
							ccmp: r.col_59_arm64_ccmp ?? "—",
						})),
					),
				);
			}
			break;
		}

		case "latest": {
			const latest = await getLatestTelemetry();
			if (latest.id) {
				console.log(Bun.inspect.table([latest]));
			} else {
				console.log("No telemetry found");
			}
			break;
		}

		default: {
			console.log("Usage: bun matrix/registry.ts <command>\n");
			console.log("Commands:");
			console.log("  init     Initialize database schema");
			console.log("  commit   Commit a sample sparse row");
			console.log("  query    Query all telemetry");
			console.log("  latest   Get latest telemetry entry\n");
			console.log("Environment:");
			console.log("  TIER1380_SQLITE_PATH  SQLite path (default: data/tier1380.db)");
			console.log("  DATABASE_URL          PostgreSQL URL (for production)");
			console.log("  TIER1380_DB_MODE      Mode: sqlite|postgres|auto");
		}
	}
}
