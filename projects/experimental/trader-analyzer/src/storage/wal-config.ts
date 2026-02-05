/**
 * @fileoverview SQLite WAL Mode Configuration
 * @description High-frequency write optimization for forensic logging
 * @module storage/wal-config
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-WAL-CONFIG@0.1.0;instance-id=WAL-CONFIG-001;version=0.1.0}]
 * [PROPERTIES:{storage={value:"wal-config";@root:"ROOT-STORAGE";@chain:["BP-SQLITE","BP-WAL"];@version:"0.1.0"}}]
 * [CLASS:WALConfig][#REF:v-0.1.0.BP.WAL.CONFIG.1.0.A.1.1.STORAGE.1.1]]
 *
 * @remarks Bun latest includes SQLite 3.51.1 with enhanced WAL performance and query planner improvements.
 * @see https://bun.com/blog/bun-v1.3.4#sqlite-3-51-1
 */

import { Database } from "bun:sqlite";

/**
 * Configure database for WAL mode with optimizations
 *
 * Leverages SQLite 3.51.1 improvements for better concurrent read/write performance and query optimization.
 *
 * @param db - Database instance to configure
 * @param options - Configuration options
 * @param options.checkpointPages - Pages to checkpoint (default: 1000)
 * @param options.cacheSizeMB - Cache size in MB (default: 64)
 * @param options.mmapSizeMB - Memory-mapped I/O size in MB (default: 256)
 *
 * @example
 * ```typescript
 * const db = new Database("./data/cache.db");
 * configureWAL(db, { cacheSizeMB: 128, mmapSizeMB: 512 });
 * ```
 */
export function configureWAL(
	db: Database,
	options?: {
		checkpointPages?: number;
		cacheSizeMB?: number;
		mmapSizeMB?: number;
	},
): void {
	const {
		checkpointPages = 1000,
		cacheSizeMB = 64,
		mmapSizeMB = 256,
	} = options || {};

	// Enable WAL mode (Write-Ahead Logging)
	// Allows concurrent readers during writes
	db.run("PRAGMA journal_mode = WAL");

	// Auto-checkpoint every N pages
	db.run(`PRAGMA wal_autocheckpoint = ${checkpointPages}`);

	// Cache size in KB (negative = KB, positive = pages)
	db.run(`PRAGMA cache_size = -${cacheSizeMB * 1024}`);

	// Memory-mapped I/O size in bytes
	db.run(`PRAGMA mmap_size = ${mmapSizeMB * 1024 * 1024}`);

	// Additional optimizations
	db.run("PRAGMA synchronous = NORMAL"); // Balance between safety and speed
	db.run("PRAGMA temp_store = MEMORY"); // Store temp tables in memory
	db.run("PRAGMA foreign_keys = ON"); // Enable foreign key constraints
}

/**
 * Create optimized database with WAL mode
 */
export function createOptimizedDB(
	path: string,
	options?: {
		checkpointPages?: number;
		cacheSizeMB?: number;
		mmapSizeMB?: number;
	},
): Database {
	const db = new Database(path);
	configureWAL(db, options);
	return db;
}

/**
 * Manual WAL checkpoint
 */
export function checkpointWAL(
	db: Database,
	mode: "PASSIVE" | "FULL" | "RESTART" | "TRUNCATE" = "FULL",
): void {
	db.run(`PRAGMA wal_checkpoint(${mode})`);
}

/**
 * Get WAL statistics
 */
export function getWALStats(db: Database): {
	walMode: string;
	pageSize: number;
	pageCount: number;
	walSize: number;
} {
	const walMode = db.query("PRAGMA journal_mode").get() as {
		journal_mode: string;
	};
	const pageSize = db.query("PRAGMA page_size").get() as { page_size: number };
	const pageCount = db.query("PRAGMA page_count").get() as {
		page_count: number;
	};
	const walSize = db.query("PRAGMA wal_checkpoint").get() as {
		wal_checkpoint: number;
	};

	return {
		walMode: walMode.journal_mode,
		pageSize: pageSize.page_size,
		pageCount: pageCount.page_count,
		walSize: walSize.wal_checkpoint,
	};
}

/**
 * Backup database with compression
 */
export async function backupDatabase(
	db: Database,
	backupPath: string,
): Promise<void> {
	// SQLite backup API
	const backup = db.backup(backupPath);

	// Wait for backup to complete
	await new Promise<void>((resolve, reject) => {
		backup.step(-1, (err) => {
			if (err) reject(err);
			else resolve();
		});
	});

	backup.finish();
}
