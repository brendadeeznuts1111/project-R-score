/**
 * @fileoverview Database Initialization Utilities
 * @description Shared database table initialization functions for URL anomaly detection
 * @module utils/database-initialization
 *
 * Provides automatic database initialization to unblock infrastructure-dependent features
 * like statistical analysis (6.7.1A.0.0.0.0) and URL anomaly pattern detection.
 */

/**
 * Initialize URL anomaly detection database tables
 * Creates both url_anomaly_audit and line_movement_audit_v2 tables if they don't exist
 *
 * @returns Promise resolving to initialization result with table status and permissions
 */
export async function initializeUrlAnomalyDatabase(): Promise<{
	success: boolean;
	tablesCreated: string[];
	error?: string;
	database_path: string;
	tables: {
		url_anomaly_audit: { exists: boolean; columns: string[]; ready: boolean };
		line_movement_audit_v2: {
			exists: boolean;
			columns: string[];
			ready: boolean;
		};
	};
	permissions: { write: boolean };
}> {
	try {
		const { Database } = await import("bun:sqlite");
		const dbPath = "./data/research.db";
		
		// Use Bun-native file checking (Bun.file().size) instead of fs.stat
		const dbFile = Bun.file(dbPath);
		const dbExists = await dbFile.exists() && dbFile.size > 0;
		
		const db = new Database(dbPath, { create: true });

		// Check which tables exist BEFORE creation
		const tablesBefore = db
			.query<{ name: string }, []>(
				`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('url_anomaly_audit', 'line_movement_audit_v2')`,
			)
			.all();
		const tablesBeforeSet = new Set(tablesBefore.map((t) => t.name));

		const tablesCreated: string[] = [];

		// 1. line_movement_audit_v2 (from ForensicMovementLogger)
		db.run(`
			CREATE TABLE IF NOT EXISTS line_movement_audit_v2 (
				auditId TEXT PRIMARY KEY,
				bookmaker TEXT NOT NULL,
				eventId TEXT NOT NULL,
				raw_url TEXT NOT NULL,
				parsed_params TEXT,
				response_status INTEGER,
				response_size INTEGER,
				timestamp INTEGER NOT NULL
			)
		`);

		db.run(`
			CREATE INDEX IF NOT EXISTS idx_bookmaker ON line_movement_audit_v2(bookmaker);
			CREATE INDEX IF NOT EXISTS idx_event ON line_movement_audit_v2(eventId);
			CREATE INDEX IF NOT EXISTS idx_timestamp ON line_movement_audit_v2(timestamp);
		`);

		// 2. url_anomaly_audit (from CorrectedForensicLogger)
		db.run(`
			CREATE TABLE IF NOT EXISTS url_anomaly_audit (
				anomalyId TEXT PRIMARY KEY,
				bookmaker TEXT NOT NULL,
				eventId TEXT NOT NULL,
				original_url TEXT NOT NULL,
				parsed_param_count INTEGER NOT NULL,
				corrected_param_count INTEGER NOT NULL,
				threat_level TEXT NOT NULL,
				detected_at INTEGER NOT NULL
			)
		`);

		db.run(`
			CREATE INDEX IF NOT EXISTS idx_anomaly_bookmaker ON url_anomaly_audit(bookmaker);
			CREATE INDEX IF NOT EXISTS idx_anomaly_threat ON url_anomaly_audit(threat_level);
			CREATE INDEX IF NOT EXISTS idx_anomaly_detected ON url_anomaly_audit(detected_at);
		`);

		// Verify table structure AFTER creation
		const tables = db
			.query<{ name: string }, []>(
				`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('url_anomaly_audit', 'line_movement_audit_v2')`,
			)
			.all();

		const tableNames = new Set(tables.map((t) => t.name));
		const urlAnomalyExists = tableNames.has("url_anomaly_audit");
		const lineMovementExists = tableNames.has("line_movement_audit_v2");

		// Track which tables were actually created (didn't exist before)
		if (urlAnomalyExists && !tablesBeforeSet.has("url_anomaly_audit")) {
			tablesCreated.push("url_anomaly_audit");
		}
		if (lineMovementExists && !tablesBeforeSet.has("line_movement_audit_v2")) {
			tablesCreated.push("line_movement_audit_v2");
		}

		// Verify schema by checking columns
		let urlAnomalyColumns: string[] = [];
		let lineMovementColumns: string[] = [];

		if (urlAnomalyExists) {
			const columns = db
				.query<{ name: string }, []>(
					`SELECT name FROM pragma_table_info('url_anomaly_audit')`,
				)
				.all();
			urlAnomalyColumns = columns.map((c) => c.name);
		}

		if (lineMovementExists) {
			const columns = db
				.query<{ name: string }, []>(
					`SELECT name FROM pragma_table_info('line_movement_audit_v2')`,
				)
				.all();
			lineMovementColumns = columns.map((c) => c.name);
		}

		// Test write permissions by inserting a test row (then deleting it)
		let writeTestPassed = false;
		try {
			const testId = `test_${Date.now()}`;
			db.run(
				`INSERT INTO url_anomaly_audit (anomalyId, bookmaker, eventId, original_url, parsed_param_count, corrected_param_count, threat_level, detected_at) 
				 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
				testId,
				"test",
				"test-event",
				"https://test.example.com/test",
				1,
				1,
				"test",
				Math.floor(Date.now() / 1000),
			);
			db.run(`DELETE FROM url_anomaly_audit WHERE anomalyId = ?`, testId);
			writeTestPassed = true;
		} catch (writeError) {
			console.warn(
				`Write test failed: ${writeError instanceof Error ? writeError.message : String(writeError)}`,
			);
		}

		db.close();

		return {
			success: true,
			tablesCreated,
			database_path: dbPath,
			tables: {
				url_anomaly_audit: {
					exists: urlAnomalyExists,
					columns: urlAnomalyColumns,
					ready: urlAnomalyExists && urlAnomalyColumns.length > 0,
				},
				line_movement_audit_v2: {
					exists: lineMovementExists,
					columns: lineMovementColumns,
					ready: lineMovementExists && lineMovementColumns.length > 0,
				},
			},
			permissions: {
				write: writeTestPassed,
			},
		};
	} catch (error) {
		return {
			success: false,
			tablesCreated: [],
			database_path: "./data/research.db",
			tables: {
				url_anomaly_audit: { exists: false, columns: [], ready: false },
				line_movement_audit_v2: { exists: false, columns: [], ready: false },
			},
			permissions: { write: false },
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
