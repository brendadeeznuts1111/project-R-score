/**
 * @fileoverview Compliance Audit Trail Logger
 * @module security/compliance-logger
 *
 * SOC2/GDPR ready compliance logging with immutable audit trails.
 */

import { Database } from "bun:sqlite";
import { Bun } from "bun";

export interface ComplianceLogEntry {
	invocationId: string;
	toolName: string;
	userId: string;
	arguments: string;
	result: string;
	timestamp: number;
	ipAddress?: string;
}

export interface DataAccessEntry {
	accessId: string;
	userId: string;
	eventId: string;
	dataType: "odds" | "registry" | "pattern";
	timestamp: number;
	lawfulBasis: string;
}

export class ComplianceLogger {
	private auditLog: Database;

	constructor(dbPath: string = "compliance-audit.db") {
		// Separate immutable audit database (WAL disabled, synchronous=FULL)
		this.auditLog = new Database(dbPath, {
			create: true,
		});

		// Durability over speed for compliance
		this.auditLog.run("PRAGMA synchronous = FULL");
		this.auditLog.run("PRAGMA journal_mode = DELETE"); // No WAL for immutability

		this.initializeSchema();
	}

	/**
	 * Initialize compliance database schema
	 */
	private initializeSchema(): void {
		this.auditLog.run(`
			CREATE TABLE IF NOT EXISTS compliance_mcp_log (
				invocationId TEXT PRIMARY KEY,
				toolName TEXT NOT NULL,
				userId TEXT NOT NULL,
				arguments TEXT NOT NULL,
				result TEXT NOT NULL,
				timestamp INTEGER NOT NULL,
				ip_address TEXT
			)
		`);

		this.auditLog.run(`
			CREATE TABLE IF NOT EXISTS compliance_data_access (
				accessId TEXT PRIMARY KEY,
				userId TEXT NOT NULL,
				eventId TEXT NOT NULL,
				data_type TEXT NOT NULL,
				timestamp INTEGER NOT NULL,
				lawful_basis TEXT NOT NULL
			)
		`);

		this.auditLog.run(`
			CREATE INDEX IF NOT EXISTS idx_mcp_user ON compliance_mcp_log(userId);
			CREATE INDEX IF NOT EXISTS idx_mcp_timestamp ON compliance_mcp_log(timestamp);
			CREATE INDEX IF NOT EXISTS idx_data_user ON compliance_data_access(userId);
			CREATE INDEX IF NOT EXISTS idx_data_timestamp ON compliance_data_access(timestamp);
		`);
	}

	/**
	 * Log every MCP tool invocation (non-repudiation)
	 */
	logMCPInvocation(
		toolName: string,
		userId: string,
		args: unknown,
		result: unknown,
		ipAddress?: string,
	): void {
		const invocationId = Bun.randomUUIDv7();

		this.auditLog.run(
			`
			INSERT INTO compliance_mcp_log (
				invocationId, toolName, userId, arguments, result, timestamp, ip_address
			) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
		`,
			invocationId,
			toolName,
			userId,
			JSON.stringify(this.sanitizeForAudit(args)),
			JSON.stringify(this.sanitizeForAudit(result)),
			Date.now(),
			ipAddress || null,
		);
	}

	/**
	 * Log all data access for GDPR compliance
	 */
	logDataAccess(
		userId: string,
		eventId: string,
		dataType: "odds" | "registry" | "pattern",
		lawfulBasis: string = "legitimate_interest",
	): void {
		const accessId = Bun.randomUUIDv7();

		this.auditLog.run(
			`
			INSERT INTO compliance_data_access (
				accessId, userId, eventId, data_type, timestamp, lawful_basis
			) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
		`,
			accessId,
			userId,
			eventId,
			dataType,
			Date.now(),
			lawfulBasis,
		);
	}

	/**
	 * Generate compliance report for auditor
	 */
	async generateComplianceReport(
		startDate: string,
		endDate: string,
	): Promise<Uint8Array> {
		const startTimestamp = new Date(startDate).getTime() / 1000;
		const endTimestamp = new Date(endDate).getTime() / 1000;

		const report = this.auditLog
			.query(`
			SELECT 
				DATE(timestamp / 1000, 'unixepoch') as date,
				COUNT(*) as total_invocations,
				COUNT(DISTINCT userId) as unique_users,
				COUNT(CASE WHEN toolName LIKE '%registry%' THEN 1 END) as registry_access,
				COUNT(CASE WHEN toolName LIKE '%pattern%' THEN 1 END) as pattern_access
			FROM compliance_mcp_log
			WHERE timestamp / 1000 BETWEEN ?1 AND ?2
			GROUP BY date
			ORDER BY date
		`)
			.all(startTimestamp, endTimestamp);

		// Convert to JSON and compress with native zstd
		const json = JSON.stringify(report, null, 2);
		const compressed = Bun.gzipSync(json);

		return compressed;
	}

	/**
	 * Sanitize sensitive data for audit logs
	 */
	private sanitizeForAudit(data: unknown): unknown {
		if (typeof data !== "object" || data === null) {
			return data;
		}

		if (Array.isArray(data)) {
			return data.map((item) => this.sanitizeForAudit(item));
		}

		const sanitized: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(data)) {
			// Redact sensitive fields
			if (
				["password", "token", "secret", "key", "apiKey"].some((sensitive) =>
					key.toLowerCase().includes(sensitive),
				)
			) {
				sanitized[key] = "[REDACTED]";
			} else {
				sanitized[key] = this.sanitizeForAudit(value);
			}
		}

		return sanitized;
	}

	/**
	 * Get compliance statistics
	 */
	getComplianceStats(days: number = 30): {
		totalLogs: number;
		uniqueUsers: number;
		oldest: number;
		newest: number;
	} {
		const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

		const stats = this.auditLog
			.query(`
			SELECT 
				COUNT(*) as total_logs,
				MIN(timestamp) as oldest,
				MAX(timestamp) as newest,
				COUNT(DISTINCT userId) as unique_users
			FROM compliance_mcp_log
			WHERE timestamp > ?1
		`)
			.get(cutoff) as {
			total_logs: number;
			oldest: number;
			newest: number;
			unique_users: number;
		};

		return {
			totalLogs: stats.total_logs || 0,
			uniqueUsers: stats.unique_users || 0,
			oldest: stats.oldest || Date.now(),
			newest: stats.newest || Date.now(),
		};
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.auditLog.close();
	}
}
