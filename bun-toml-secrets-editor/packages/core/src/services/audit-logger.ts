// services/audit-logger.ts

import { DatabaseService } from "./database-service";
import type { EditResult } from "./types/toml-secrets";
import { logger } from "./utils/logger";
import { metrics } from "./utils/metrics";

export class AuditLogger {
	private db: DatabaseService;

	constructor(dbPath: string = ":memory:") {
		this.db = new DatabaseService(dbPath);
	}

	async logEdit(result: EditResult, execTimeNs: number = 0): Promise<void> {
		try {
			await this.db.logAuditEvent(result, execTimeNs);
			metrics.incrementCounter("secrets_editor_audit_events_total", {
				action: "edit",
			});

			// Use structured logger instead of console.log
			logger.info("Audit event logged", {
				action: "edit",
				file: result.path,
				secrets: result.secretsCount,
				risk: result.riskScore,
				patterns: result.patterns.length,
				execTimeNs,
			});
		} catch (error) {
			logger.error(
				"Failed to log audit event",
				{
					action: "edit",
					file: result.path,
				},
				error instanceof Error ? error : undefined,
			);
			metrics.incrementCounter("secrets_editor_audit_errors_total");
			// Don't throw - audit logging failures shouldn't break the operation
		}
	}

	async getAuditLog(filePath?: string, limit = 100): Promise<any[]> {
		const iterator = this.db.getAuditLog(filePath, limit);
		return Array.from(iterator);
	}

	async exportAuditLog(
		filePath: string,
		format: "json" | "csv" = "json",
	): Promise<string> {
		const logs = await this.getAuditLog(filePath);

		if (format === "json") {
			return JSON.stringify(logs, null, 2);
		} else {
			// CSV format
			if (logs.length === 0) return "";

			const headers = Object.keys(logs[0]);
			const csvRows = [
				headers.join(","),
				...logs.map((log) =>
					headers.map((h) => JSON.stringify(log[h] || "")).join(","),
				),
			];

			return csvRows.join("\n");
		}
	}

	// Database maintenance methods
	async vacuum(): Promise<void> {
		await this.db.vacuum();
	}

	async optimize(): Promise<void> {
		await this.db.optimize();
	}

	// Get database statistics
	async getStats(): Promise<{
		auditEntries: number;
		secretsCount: number;
		patternsCount: number;
	}> {
		try {
			const auditLog = await this.getAuditLog();
			return {
				auditEntries: auditLog.length,
				secretsCount: 0, // Would require additional query
				patternsCount: 0, // Would require additional query
			};
		} catch (error) {
			logger.error(
				"Failed to get audit stats",
				{},
				error instanceof Error ? error : undefined,
			);
			return {
				auditEntries: 0,
				secretsCount: 0,
				patternsCount: 0,
			};
		}
	}

	// Close database connection
	close(): void {
		this.db.close();
	}
}
