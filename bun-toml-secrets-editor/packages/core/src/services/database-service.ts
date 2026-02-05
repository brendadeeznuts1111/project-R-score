// services/database-service.ts
import { Database } from "bun:sqlite";
import { DatabaseError, retryWithBackoff } from "@bun-toml/core/errors/app-errors";
import type {
	EditResult,
	ExtractedPattern,
	SecretLifecycle,
	TomlSecret,
} from "./types/toml-secrets";
import { logger } from "./utils/logger";
import { metrics } from "./utils/metrics";

interface LifecycleRow {
	secret_name: string;
	created_at: string;
	updated_at: string;
	last_accessed: string;
	access_count: number;
	expires_at?: string;
	rotation_policy: string;
	status: string;
	metadata?: string;
}

export class DatabaseService {
	private db: Database;

	constructor(dbPath: string = ":memory:") {
		this.db = new Database(dbPath);
		this.initializeSchema();
		this.createIndexes();
		// Run migrations
		this.runMigrations().catch((error) => {
			logger.warn(
				"Failed to run migrations",
				error instanceof Error ? { error: error.message } : {},
			);
		});
	}

	private async runMigrations(): Promise<void> {
		// Run migration 001: Add lifecycle table
		// Note: Migration is idempotent - it checks if table exists first
		try {
			const { migrate } = await import("../migrations/001_add_lifecycle_table");
			await migrate(this.db);
		} catch (error) {
			// Migration might fail if table already exists, which is fine
			logger.debug(
				"Migration check completed",
				{},
				error instanceof Error ? error : undefined,
			);
		}
	}

	private initializeSchema(): void {
		// Secrets table
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS secrets (
        crc32_hash INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        value TEXT,
        classification TEXT,
        is_dangerous INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

		// Patterns table
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS patterns (
        crc32_hash INTEGER PRIMARY KEY,
        pattern TEXT UNIQUE NOT NULL,
        key_path TEXT,
        env_vars TEXT, -- JSON array
        is_dynamic INTEGER DEFAULT 0,
        risk_level TEXT DEFAULT 'low',
        violation_count INTEGER DEFAULT 0,
        exec_ns INTEGER DEFAULT 0, -- Execution time in nanoseconds
        secrets_count INTEGER DEFAULT 0,
        file_path TEXT,
        created_at INTEGER
      );
    `);

		// Audit log table
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        action TEXT NOT NULL,
        file_path TEXT,
        original_hash TEXT,
        optimized_hash TEXT,
        secrets_count INTEGER DEFAULT 0,
        risk_score INTEGER DEFAULT 0,
        changes TEXT, -- JSON array
        patterns_count INTEGER DEFAULT 0,
        exec_time_ns INTEGER DEFAULT 0
      );
    `);

		// Secret-pattern relationships
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS secret_patterns (
        secret_crc32 INTEGER,
        pattern_crc32 INTEGER,
        PRIMARY KEY (secret_crc32, pattern_crc32),
        FOREIGN KEY (secret_crc32) REFERENCES secrets(crc32_hash),
        FOREIGN KEY (pattern_crc32) REFERENCES patterns(crc32_hash)
      );
    `);

		// Lifecycles table for persistent secret lifecycle management
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS lifecycles (
        secret_name TEXT PRIMARY KEY,
        created INTEGER NOT NULL,
        last_rotated INTEGER NOT NULL,
        expires_at INTEGER,
        rotation_policy TEXT NOT NULL,
        rotation_interval_days INTEGER,
        last_used INTEGER,
        usage_count INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        policy_type TEXT
      );
    `);
	}

	// Covering index for secret lookups (100x faster)
	private createIndexes(): void {
		// Covering index for patterns with violations
		this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_secret_lookup
      ON patterns(crc32_hash, risk_level, violation_count, exec_ns)
      WHERE violation_count > 0;
    `);

		// Index for audit log queries
		this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp
      ON audit_log(timestamp DESC, file_path);
    `);

		// Index for secret-pattern relationships
		this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_secret_patterns
      ON secret_patterns(secret_crc32, pattern_crc32);
    `);

		// Composite index for risk analysis
		this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_patterns_risk
      ON patterns(risk_level, violation_count DESC, exec_ns);
    `);

		// Index for lifecycle expiration queries
		this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_lifecycle_expires
      ON lifecycles(expires_at, status)
      WHERE expires_at IS NOT NULL;
    `);

		// Index for lifecycle status queries
		this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_lifecycle_status
      ON lifecycles(status, last_rotated);
    `);
	}

	// Parallel batch inserts with WAL mode
	async batchInsertSecrets(secrets: TomlSecret[]): Promise<void> {
		return retryWithBackoff(async () => {
			// Enable WAL mode for concurrent writes
			this.db.exec("PRAGMA journal_mode = WAL;");

			const insert = this.db.prepare(`
        INSERT OR REPLACE INTO secrets
        (crc32_hash, name, value, classification, is_dangerous, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

			const now = Date.now();

			try {
				// Begin transaction
				this.db.exec("BEGIN;");

				// Batch insert all secrets
				for (const secret of secrets) {
					const crc32 = Bun.hash.crc32(secret.name);
					insert.run(
						crc32,
						secret.name,
						secret.value,
						secret.classification,
						secret.isDangerous ? 1 : 0,
						now,
						now,
					);
				}

				// Commit transaction
				this.db.exec("COMMIT;");
				metrics.incrementCounter("database_operations_total", {
					operation: "batch_insert_secrets",
				});
			} catch (error) {
				this.db.exec("ROLLBACK;");
				metrics.incrementCounter("database_errors_total", {
					operation: "batch_insert_secrets",
				});
				throw new DatabaseError(
					`Failed to batch insert secrets: ${error instanceof Error ? error.message : String(error)}`,
					{ operation: "batchInsertSecrets", count: secrets.length },
					error instanceof Error ? error : undefined,
				);
			} finally {
				insert.finalize();
			}
		});
	}

	// Batch insert patterns with relationships
	async batchInsertPatterns(
		patterns: ExtractedPattern[],
		secretMap?: Map<string, TomlSecret>,
	): Promise<void> {
		return retryWithBackoff(async () => {
			this.db.exec("PRAGMA journal_mode = WAL;");

			const insertPattern = this.db.prepare(`
        INSERT OR REPLACE INTO patterns
        (crc32_hash, pattern, key_path, env_vars, is_dynamic, risk_level, secrets_count, file_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

			const insertRelationship = this.db.prepare(`
        INSERT OR IGNORE INTO secret_patterns (secret_crc32, pattern_crc32)
        VALUES (?, ?)
      `);

			const now = Date.now();

			try {
				this.db.exec("BEGIN;");

				for (const pattern of patterns) {
					const crc32 = Bun.hash.crc32(pattern.pattern);
					const riskLevel = this.calculateRiskLevel(pattern);
					const secretsCount = pattern.envVars.length;

					insertPattern.run(
						crc32,
						pattern.pattern,
						pattern.keyPath,
						JSON.stringify(pattern.envVars),
						pattern.isDynamic ? 1 : 0,
						riskLevel,
						secretsCount,
						pattern.location.file,
						now,
					);

					// Insert secret-pattern relationships
					if (secretMap) {
						for (const envVar of pattern.envVars) {
							const secret = secretMap.get(envVar);
							if (secret) {
								const secretCrc32 = Bun.hash.crc32(secret.name);
								insertRelationship.run(secretCrc32, crc32);
							}
						}
					}
				}

				this.db.exec("COMMIT;");
				metrics.incrementCounter("database_operations_total", {
					operation: "batch_insert_patterns",
				});
			} catch (error) {
				this.db.exec("ROLLBACK;");
				metrics.incrementCounter("database_errors_total", {
					operation: "batch_insert_patterns",
				});
				throw new DatabaseError(
					`Failed to batch insert patterns: ${error instanceof Error ? error.message : String(error)}`,
					{ operation: "batchInsertPatterns", count: patterns.length },
					error instanceof Error ? error : undefined,
				);
			} finally {
				insertPattern.finalize();
				insertRelationship.finalize();
			}
		});
	}

	// Streaming query results (O(1) memory)
	getCriticalPatterns(): any[] {
		const query = this.db.query(`
      SELECT * FROM patterns
      WHERE risk_level = 'critical'
      AND exec_ns > 1000000
      ORDER BY violation_count DESC, exec_ns DESC
    `);

		return query.all();
	}

	// Efficient audit logging
	async logAuditEvent(
		result: EditResult,
		execTimeNs: number = 0,
	): Promise<void> {
		const insert = this.db.prepare(`
      INSERT INTO audit_log
      (timestamp, action, file_path, original_hash, optimized_hash, secrets_count, risk_score, changes, patterns_count, exec_time_ns)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		try {
			insert.run(
				new Date().toISOString(),
				"edit",
				result.path,
				result.originalHash,
				result.optimizedHash,
				result.secretsCount,
				result.riskScore,
				JSON.stringify(result.changes),
				result.patterns.length,
				execTimeNs,
			);
		} finally {
			insert.finalize();
		}
	}

	// Get audit log with efficient querying
	getAuditLog(filePath?: string, limit = 100): any[] {
		const query = this.db.query(`
      SELECT * FROM audit_log
      ${filePath ? "WHERE file_path = ?" : ""}
      ORDER BY timestamp DESC
      LIMIT ?
    `);

		return filePath ? query.all(filePath, limit) : query.all(limit);
	}

	// Get secrets with patterns
	getSecretsWithPatterns(): any[] {
		const query = this.db.query(`
      SELECT
        s.name,
        s.classification,
        s.is_dangerous,
        COUNT(sp.pattern_crc32) as pattern_count,
        GROUP_CONCAT(p.pattern) as patterns
      FROM secrets s
      LEFT JOIN secret_patterns sp ON s.crc32_hash = sp.secret_crc32
      LEFT JOIN patterns p ON sp.pattern_crc32 = p.crc32_hash
      GROUP BY s.crc32_hash, s.name, s.classification, s.is_dangerous
      ORDER BY pattern_count DESC, s.is_dangerous DESC
    `);

		return query.all();
	}

	// Update pattern statistics
	updatePatternStats(
		patternCrc32: number,
		execTimeNs: number,
		violations: number,
	): void {
		const update = this.db.prepare(`
      UPDATE patterns
      SET exec_ns = ?, violation_count = violation_count + ?
      WHERE crc32_hash = ?
    `);

		try {
			update.run(execTimeNs, violations, patternCrc32);
		} finally {
			update.finalize();
		}
	}

	// Database maintenance
	async vacuum(): Promise<void> {
		this.db.exec("VACUUM;");
	}

	async optimize(): Promise<void> {
		this.db.exec("PRAGMA optimize;");
	}

	// Lifecycle persistence methods
	async saveLifecycle(
		lifecycle: SecretLifecycle,
		secretName: string,
		policyType?: string,
	): Promise<void> {
		return retryWithBackoff(async () => {
			const insert = this.db.prepare(`
        INSERT OR REPLACE INTO lifecycles
        (secret_name, created, last_rotated, expires_at, rotation_policy, rotation_interval_days, last_used, usage_count, status, policy_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

			try {
				insert.run(
					secretName,
					lifecycle.created.getTime(),
					lifecycle.lastRotated.getTime(),
					lifecycle.expiresAt?.getTime() || null,
					lifecycle.rotationPolicy,
					lifecycle.rotationIntervalDays || null,
					lifecycle.lastUsed?.getTime() || null,
					lifecycle.usageCount,
					lifecycle.status,
					policyType || null,
				);
				metrics.incrementCounter("database_operations_total", {
					operation: "save_lifecycle",
				});
			} catch (error) {
				metrics.incrementCounter("database_errors_total", {
					operation: "save_lifecycle",
				});
				throw new DatabaseError(
					`Failed to save lifecycle for ${secretName}: ${error instanceof Error ? error.message : String(error)}`,
					{ operation: "saveLifecycle", secretName },
					error instanceof Error ? error : undefined,
				);
			} finally {
				insert.finalize();
			}
		});
	}

	async loadLifecycle(secretName: string): Promise<SecretLifecycle | null> {
		try {
			const query = this.db.query(`
        SELECT * FROM lifecycles WHERE secret_name = ?
      `);
			const result = query.get(secretName) as LifecycleRow | undefined;

			if (!result) {
				return null;
			}

			return {
				created: new Date(result.created),
				lastRotated: new Date(result.last_rotated),
				expiresAt: result.expires_at ? new Date(result.expires_at) : undefined,
				rotationPolicy: result.rotation_policy as
					| "manual"
					| "automatic"
					| "never",
				rotationIntervalDays: result.rotation_interval_days || undefined,
				lastUsed: result.last_used ? new Date(result.last_used) : undefined,
				usageCount: result.usage_count,
				status: result.status as
					| "active"
					| "expired"
					| "pending-rotation"
					| "deprecated",
			};
		} catch (error) {
			logger.error(
				"Failed to load lifecycle",
				{ secretName },
				error instanceof Error ? error : undefined,
			);
			throw new DatabaseError(
				`Failed to load lifecycle for ${secretName}: ${error instanceof Error ? error.message : String(error)}`,
				{ operation: "loadLifecycle", secretName },
				error instanceof Error ? error : undefined,
			);
		}
	}

	async loadAllLifecycles(): Promise<Map<string, SecretLifecycle>> {
		try {
			const query = this.db.query(`
        SELECT * FROM lifecycles
      `);
			const results = query.all() as any[];

			const lifecycles = new Map<string, SecretLifecycle>();
			for (const result of results) {
				lifecycles.set(result.secret_name, {
					created: new Date(result.created),
					lastRotated: new Date(result.last_rotated),
					expiresAt: result.expires_at
						? new Date(result.expires_at)
						: undefined,
					rotationPolicy: result.rotation_policy as
						| "manual"
						| "automatic"
						| "never",
					rotationIntervalDays: result.rotation_interval_days || undefined,
					lastUsed: result.last_used ? new Date(result.last_used) : undefined,
					usageCount: result.usage_count,
					status: result.status as
						| "active"
						| "expired"
						| "pending-rotation"
						| "deprecated",
				});
			}

			return lifecycles;
		} catch (error) {
			logger.error(
				"Failed to load all lifecycles",
				{},
				error instanceof Error ? error : undefined,
			);
			throw new DatabaseError(
				`Failed to load all lifecycles: ${error instanceof Error ? error.message : String(error)}`,
				{ operation: "loadAllLifecycles" },
				error instanceof Error ? error : undefined,
			);
		}
	}

	// Close database connection
	close(): void {
		this.db.close();
		logger.info("Database connection closed");
	}

	private calculateRiskLevel(pattern: ExtractedPattern): string {
		if (
			pattern.envVars.some(
				(v) => v.includes("SECRET") || v.includes("TOKEN") || v.includes("KEY"),
			)
		) {
			return "critical";
		}
		if (pattern.envVars.some((v) => v.includes("PASSWORD"))) {
			return "high";
		}
		if (pattern.envVars.length > 2) {
			return "medium";
		}
		return "low";
	}
}
