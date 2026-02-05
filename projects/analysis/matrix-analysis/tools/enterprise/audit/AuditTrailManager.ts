/**
 * Audit Trail Manager - Comprehensive Compliance and Governance
 * Tier-1380 Enterprise Archive Management System
 *
 * @version 2.0.0
 * @author Tier-1380 Compliance Team
 */

import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";

export interface AuditEvent {
	id: string;
	timestamp: Date;
	eventType: AuditEventType;
	tenantId: string;
	userId?: string;
	sessionId?: string;
	resource: string;
	action: string;
	outcome: "success" | "failure" | "partial";
	details: Record<string, any>;
	metadata: {
		ipAddress?: string;
		userAgent?: string;
		requestId?: string;
		correlationId?: string;
		source: string;
		version: string;
	};
	compliance: {
		dataClassification: "public" | "internal" | "confidential" | "restricted";
		retentionPeriod: number; // days
		legalHold: boolean;
		regulations: string[];
	};
}

export type AuditEventType =
	| "archive_created"
	| "archive_extracted"
	| "archive_analyzed"
	| "security_scan"
	| "access_granted"
	| "access_denied"
	| "configuration_changed"
	| "user_authenticated"
	| "policy_violation"
	| "data_export"
	| "system_backup"
	| "compliance_check"
	| "threat_detected"
	| "incident_reported";

export interface ComplianceReport {
	tenantId: string;
	reportPeriod: { start: Date; end: Date };
	summary: {
		totalEvents: number;
		eventsByType: Record<AuditEventType, number>;
		eventsByOutcome: Record<string, number>;
		complianceScore: number;
		violations: number;
		legalHolds: number;
	};
	regulations: {
		[regulation: string]: {
			compliant: boolean;
			violations: string[];
			recommendations: string[];
		};
	};
	trends: {
		eventVolume: Array<{ date: string; count: number }>;
		violationTypes: Array<{ type: string; count: number }>;
		accessPatterns: Array<{ user: string; resource: string; count: number }>;
	};
	recommendations: string[];
}

export interface RetentionPolicy {
	eventType: AuditEventType;
	retentionDays: number;
	archivalLocation?: string;
	exceptions: string[];
	autoDelete: boolean;
}

export interface ComplianceRule {
	id: string;
	name: string;
	description: string;
	regulation: string;
	severity: "low" | "medium" | "high" | "critical";
	enabled: boolean;
	conditions: {
		eventType?: AuditEventType[];
		dataClassification?: string[];
		timeRestrictions?: {
			startHour?: number;
			endHour?: number;
			daysOfWeek?: number[];
		};
		userRestrictions?: {
			roles?: string[];
			departments?: string[];
		};
	};
	actions: {
		alert: boolean;
		block: boolean;
		requireApproval: boolean;
		notifyRoles: string[];
	};
}

export class AuditTrailManager {
	private readonly db: Database;
	private readonly retentionPolicies: Map<AuditEventType, RetentionPolicy> = new Map();
	private readonly complianceRules: Map<string, ComplianceRule> = new Map();
	private readonly eventQueue: AuditEvent[] = [];
	private readonly batchSize: number = 100;
	private readonly flushInterval: number = 5000; // 5 seconds

	constructor(dbPath: string = "./data/audit-trail.db") {
		this.db = new Database(dbPath, { create: true });
		this.initializeDatabase();
		this.initializeRetentionPolicies();
		this.initializeComplianceRules();
		this.startBatchProcessor();
	}

	private initializeDatabase(): void {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        user_id TEXT,
        session_id TEXT,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        outcome TEXT NOT NULL,
        details TEXT,
        metadata TEXT,
        compliance_classification TEXT NOT NULL,
        compliance_retention INTEGER NOT NULL,
        compliance_legal_hold BOOLEAN DEFAULT FALSE,
        compliance_regulations TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS compliance_violations (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_by TEXT,
        resolved_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES audit_events (id)
      );
      
      CREATE TABLE IF NOT EXISTS audit_retention (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        retention_days INTEGER NOT NULL,
        archival_location TEXT,
        exceptions TEXT,
        auto_delete BOOLEAN DEFAULT TRUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS compliance_reports (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        report_period_start TEXT NOT NULL,
        report_period_end TEXT NOT NULL,
        report_data TEXT NOT NULL,
        generated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_events(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_outcome ON audit_events(outcome);
    `);
	}

	private initializeRetentionPolicies(): void {
		const policies: RetentionPolicy[] = [
			{
				eventType: "archive_created",
				retentionDays: 2555, // 7 years
				archivalLocation: "cold_storage",
				exceptions: ["legal_hold"],
				autoDelete: false,
			},
			{
				eventType: "archive_extracted",
				retentionDays: 1825, // 5 years
				archivalLocation: "standard",
				exceptions: ["compliance_investigation"],
				autoDelete: false,
			},
			{
				eventType: "security_scan",
				retentionDays: 365, // 1 year
				autoDelete: true,
			},
			{
				eventType: "user_authenticated",
				retentionDays: 90, // 3 months
				autoDelete: true,
			},
			{
				eventType: "policy_violation",
				retentionDays: 2555, // 7 years
				archivalLocation: "compliance_storage",
				exceptions: [],
				autoDelete: false,
			},
			{
				eventType: "threat_detected",
				retentionDays: 2555, // 7 years
				archivalLocation: "security_storage",
				exceptions: [],
				autoDelete: false,
			},
		];

		policies.forEach((policy) => {
			this.retentionPolicies.set(policy.eventType, policy);
		});
	}

	private initializeComplianceRules(): void {
		const rules: ComplianceRule[] = [
			{
				id: "GDPR_DATA_ACCESS",
				name: "GDPR Data Access Compliance",
				description: "Monitor access to personal data per GDPR requirements",
				regulation: "GDPR",
				severity: "high",
				enabled: true,
				conditions: {
					dataClassification: ["confidential", "restricted"],
					timeRestrictions: {
						startHour: 9,
						endHour: 17,
						daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
					},
				},
				actions: {
					alert: true,
					block: false,
					requireApproval: true,
					notifyRoles: ["compliance_officer", "data_protection_officer"],
				},
			},
			{
				id: "SOX_ARCHIVE_INTEGRITY",
				name: "Sarbanes-Oxley Archive Integrity",
				description: "Ensure archive integrity for financial data per SOX requirements",
				regulation: "SOX",
				severity: "critical",
				enabled: true,
				conditions: {
					eventType: ["archive_created", "archive_extracted"],
					dataClassification: ["confidential", "restricted"],
				},
				actions: {
					alert: true,
					block: false,
					requireApproval: false,
					notifyRoles: ["audit_committee", "compliance_officer"],
				},
			},
			{
				id: "HIPAA_DATA_PROTECTION",
				name: "HIPAA Protected Health Information",
				description: "Monitor access to protected health information",
				regulation: "HIPAA",
				severity: "critical",
				enabled: true,
				conditions: {
					dataClassification: ["restricted"],
					userRestrictions: {
						roles: ["healthcare_provider", "authorized_personnel"],
					},
				},
				actions: {
					alert: true,
					block: true,
					requireApproval: true,
					notifyRoles: ["privacy_officer", "security_officer"],
				},
			},
		];

		rules.forEach((rule) => {
			this.complianceRules.set(rule.id, rule);
		});
	}

	/**
	 * Record an audit event
	 */
	async recordEvent(event: Omit<AuditEvent, "id">): Promise<string> {
		const auditEvent: AuditEvent = {
			...event,
			id: randomUUID(),
		};

		// Check compliance rules
		await this.checkComplianceRules(auditEvent);

		// Add to batch queue
		this.eventQueue.push(auditEvent);

		// Flush if batch is full
		if (this.eventQueue.length >= this.batchSize) {
			await this.flushEvents();
		}

		return auditEvent.id;
	}

	/**
	 * Query audit events
	 */
	queryEvents(
		filters: {
			tenantId?: string;
			userId?: string;
			eventType?: AuditEventType;
			dateRange?: { start: Date; end: Date };
			outcome?: string;
			limit?: number;
			offset?: number;
		} = {},
	): AuditEvent[] {
		let query = "SELECT * FROM audit_events WHERE 1=1";
		const params: any[] = [];

		if (filters.tenantId) {
			query += " AND tenant_id = ?";
			params.push(filters.tenantId);
		}

		if (filters.userId) {
			query += " AND user_id = ?";
			params.push(filters.userId);
		}

		if (filters.eventType) {
			query += " AND event_type = ?";
			params.push(filters.eventType);
		}

		if (filters.dateRange) {
			query += " AND timestamp BETWEEN ? AND ?";
			params.push(
				filters.dateRange.start.toISOString(),
				filters.dateRange.end.toISOString(),
			);
		}

		if (filters.outcome) {
			query += " AND outcome = ?";
			params.push(filters.outcome);
		}

		query += " ORDER BY timestamp DESC";

		if (filters.limit) {
			query += " LIMIT ?";
			params.push(filters.limit);
		}

		if (filters.offset) {
			query += " OFFSET ?";
			params.push(filters.offset);
		}

		const rows = this.db.query(query).all(...params) as any[];

		return rows.map((row) => ({
			id: row.id,
			timestamp: new Date(row.timestamp),
			eventType: row.event_type as AuditEventType,
			tenantId: row.tenant_id,
			userId: row.user_id,
			sessionId: row.session_id,
			resource: row.resource,
			action: row.action,
			outcome: row.outcome as "success" | "failure" | "partial",
			details: JSON.parse(row.details || "{}"),
			metadata: JSON.parse(row.metadata || "{}"),
			compliance: {
				dataClassification: row.compliance_classification as any,
				retentionPeriod: row.compliance_retention,
				legalHold: Boolean(row.compliance_legal_hold),
				regulations: JSON.parse(row.compliance_regulations || "[]"),
			},
		}));
	}

	/**
	 * Generate compliance report
	 */
	async generateComplianceReport(
		tenantId: string,
		dateRange: { start: Date; end: Date },
	): Promise<ComplianceReport> {
		console.log(`📋 Generating compliance report for tenant: ${tenantId}`);

		const events = this.queryEvents({
			tenantId,
			dateRange,
		});

		// Calculate summary
		const totalEvents = events.length;
		const eventsByType = events.reduce(
			(acc, event) => {
				acc[event.eventType] = (acc[event.eventType] || 0) + 1;
				return acc;
			},
			{} as Record<AuditEventType, number>,
		);

		const eventsByOutcome = events.reduce(
			(acc, event) => {
				acc[event.outcome] = (acc[event.outcome] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const violations = this.db
			.query(`
      SELECT COUNT(*) as count FROM compliance_violations cv
      JOIN audit_events ae ON cv.event_id = ae.id
      WHERE ae.tenant_id = ? AND ae.timestamp BETWEEN ? AND ?
    `)
			.get(tenantId, dateRange.start.toISOString(), dateRange.end.toISOString()) as any;

		const legalHolds = events.filter((e) => e.compliance.legalHold).length;

		// Calculate compliance score
		const complianceScore = this.calculateComplianceScore(events, violations.count);

		// Analyze regulations
		const regulations = this.analyzeRegulationCompliance(events);

		// Generate trends
		const trends = this.generateTrends(events);

		// Generate recommendations
		const recommendations = this.generateComplianceRecommendations(
			events,
			violations.count,
		);

		const report: ComplianceReport = {
			tenantId,
			reportPeriod: dateRange,
			summary: {
				totalEvents,
				eventsByType,
				eventsByOutcome,
				complianceScore,
				violations: violations.count,
				legalHolds,
			},
			regulations,
			trends,
			recommendations,
		};

		// Store report
		await this.storeReport(report);

		console.log(`✅ Compliance report generated:`);
		console.log(`  Total events: ${totalEvents}`);
		console.log(`  Compliance score: ${complianceScore}%`);
		console.log(`  Violations: ${violations.count}`);

		return report;
	}

	/**
	 * Apply retention policies
	 */
	async applyRetentionPolicies(): Promise<{
		processed: number;
		archived: number;
		deleted: number;
	}> {
		console.log(`🗄️ Applying retention policies...`);

		let processed = 0;
		let archived = 0;
		let deleted = 0;

		for (const [eventType, policy] of this.retentionPolicies) {
			const cutoffDate = new Date(
				Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000,
			);

			const eventsToProcess = this.db
				.query(`
        SELECT * FROM audit_events 
        WHERE event_type = ? AND timestamp < ? AND compliance_legal_hold = FALSE
      `)
				.all(eventType, cutoffDate.toISOString()) as any[];

			for (const event of eventsToProcess) {
				processed++;

				if (policy.archivalLocation && !policy.exceptions.includes(event.id)) {
					// Archive to cold storage (simulated)
					await this.archiveEvent(event, policy.archivalLocation);
					archived++;
				}

				if (policy.autoDelete && !policy.exceptions.includes(event.id)) {
					// Delete from primary database
					this.db.prepare("DELETE FROM audit_events WHERE id = ?").run(event.id);
					deleted++;
				}
			}
		}

		console.log(`✅ Retention policies applied:`);
		console.log(`  Processed: ${processed} events`);
		console.log(`  Archived: ${archived} events`);
		console.log(`  Deleted: ${deleted} events`);

		return { processed, archived, deleted };
	}

	/**
	 * Get compliance violations
	 */
	getViolations(tenantId?: string, resolved: boolean = false): any[] {
		let query = `
      SELECT cv.*, ae.event_type, ae.timestamp, ae.user_id, ae.resource
      FROM compliance_violations cv
      JOIN audit_events ae ON cv.event_id = ae.id
      WHERE cv.resolved = ?
    `;
		const params: any[] = [resolved];

		if (tenantId) {
			query += " AND ae.tenant_id = ?";
			params.push(tenantId);
		}

		query += " ORDER BY cv.created_at DESC";

		return this.db.query(query).all(...params);
	}

	/**
	 * Resolve compliance violation
	 */
	resolveViolation(violationId: string, resolvedBy: string): void {
		this.db
			.prepare(`
      UPDATE compliance_violations 
      SET resolved = TRUE, resolved_by = ?, resolved_at = ?
      WHERE id = ?
    `)
			.run(resolvedBy, new Date().toISOString(), violationId);
	}

	/**
	 * Export audit data for compliance
	 */
	exportComplianceData(
		tenantId: string,
		dateRange: { start: Date; end: Date },
		format: "json" | "csv" | "xml" = "json",
	): string {
		const events = this.queryEvents({
			tenantId,
			dateRange,
		});

		const exportData = {
			metadata: {
				tenantId,
				exportDate: new Date().toISOString(),
				dateRange,
				totalEvents: events.length,
				format,
			},
			events: events.map((event) => ({
				...event,
				// Remove sensitive metadata for export
				metadata: {
					source: event.metadata.source,
					version: event.metadata.version,
				},
			})),
		};

		switch (format) {
			case "json":
				return JSON.stringify(exportData, null, 2);
			case "csv":
				return this.convertToCSV(exportData.events);
			case "xml":
				return this.convertToXML(exportData);
			default:
				throw new Error(`Unsupported export format: ${format}`);
		}
	}

	// ─── Private Helper Methods ────────────────────────────────────────────────────
	private startBatchProcessor(): void {
		setInterval(async () => {
			if (this.eventQueue.length > 0) {
				await this.flushEvents();
			}
		}, this.flushInterval);
	}

	private async flushEvents(): Promise<void> {
		if (this.eventQueue.length === 0) return;

		const events = this.eventQueue.splice(0, this.batchSize);

		const stmt = this.db.prepare(`
      INSERT INTO audit_events 
      (id, timestamp, event_type, tenant_id, user_id, session_id, resource, action, outcome, details, metadata, compliance_classification, compliance_retention, compliance_legal_hold, compliance_regulations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		for (const event of events) {
			stmt.run(
				event.id,
				event.timestamp.toISOString(),
				event.eventType,
				event.tenantId,
				event.userId,
				event.sessionId,
				event.resource,
				event.action,
				event.outcome,
				JSON.stringify(event.details),
				JSON.stringify(event.metadata),
				event.compliance.dataClassification,
				event.compliance.retentionPeriod,
				event.compliance.legalHold,
				JSON.stringify(event.compliance.regulations),
			);
		}

		console.log(`📝 Flushed ${events.length} audit events to database`);
	}

	private async checkComplianceRules(event: AuditEvent): Promise<void> {
		for (const rule of this.complianceRules.values()) {
			if (!rule.enabled) continue;

			if (this.evaluateRuleConditions(rule, event)) {
				// Rule triggered - create violation
				await this.createViolation(event.id, rule.id, rule.severity, rule.description);

				// Execute rule actions
				if (rule.actions.alert) {
					console.warn(`🚨 Compliance Alert: ${rule.name} - ${rule.description}`);
				}

				if (rule.actions.block) {
					console.error(`🛑 Action Blocked: ${rule.name} - ${rule.description}`);
				}
			}
		}
	}

	private evaluateRuleConditions(rule: ComplianceRule, event: AuditEvent): boolean {
		const conditions = rule.conditions;

		// Check event type
		if (conditions.eventType && !conditions.eventType.includes(event.eventType)) {
			return false;
		}

		// Check data classification
		if (
			conditions.dataClassification &&
			!conditions.dataClassification.includes(event.compliance.dataClassification)
		) {
			return false;
		}

		// Check time restrictions
		if (conditions.timeRestrictions) {
			const hour = event.timestamp.getHours();
			const dayOfWeek = event.timestamp.getDay();

			if (
				conditions.timeRestrictions.startHour !== undefined &&
				hour < conditions.timeRestrictions.startHour
			) {
				return false;
			}

			if (
				conditions.timeRestrictions.endHour !== undefined &&
				hour > conditions.timeRestrictions.endHour
			) {
				return false;
			}

			if (
				conditions.timeRestrictions.daysOfWeek &&
				!conditions.timeRestrictions.daysOfWeek.includes(dayOfWeek)
			) {
				return false;
			}
		}

		return true;
	}

	private async createViolation(
		eventId: string,
		ruleId: string,
		severity: string,
		description: string,
	): Promise<void> {
		const violationId = randomUUID();

		this.db
			.prepare(`
      INSERT INTO compliance_violations (id, event_id, rule_id, severity, description)
      VALUES (?, ?, ?, ?, ?)
    `)
			.run(violationId, eventId, ruleId, severity, description);
	}

	private calculateComplianceScore(events: AuditEvent[], violations: number): number {
		if (events.length === 0) return 100;

		const successEvents = events.filter((e) => e.outcome === "success").length;
		const baseScore = (successEvents / events.length) * 100;

		// Deduct points for violations
		const violationPenalty = (violations / events.length) * 50;

		return Math.max(0, Math.min(100, baseScore - violationPenalty));
	}

	private analyzeRegulationCompliance(
		events: AuditEvent[],
	): ComplianceReport["regulations"] {
		const regulations: ComplianceReport["regulations"] = {};

		// Group events by regulation
		const eventsByRegulation = events.reduce(
			(acc, event) => {
				for (const regulation of event.compliance.regulations) {
					if (!acc[regulation]) {
						acc[regulation] = [];
					}
					acc[regulation].push(event);
				}
				return acc;
			},
			{} as Record<string, AuditEvent[]>,
		);

		for (const [regulation, regEvents] of Object.entries(eventsByRegulation)) {
			const violations = regEvents.filter((e) => e.outcome === "failure").length;
			const compliant = violations === 0;

			regulations[regulation] = {
				compliant,
				violations: regEvents.filter((e) => e.outcome === "failure").map((e) => e.id),
				recommendations: compliant
					? ["Continue maintaining compliance standards"]
					: [
							"Investigate failure causes",
							"Implement corrective actions",
							"Enhance monitoring",
						],
			};
		}

		return regulations;
	}

	private generateTrends(events: AuditEvent[]): ComplianceReport["trends"] {
		// Group events by date
		const eventsByDate = events.reduce(
			(acc, event) => {
				const date = event.timestamp.toISOString().split("T")[0];
				if (!acc[date]) acc[date] = 0;
				acc[date]++;
				return acc;
			},
			{} as Record<string, number>,
		);

		const eventVolume = Object.entries(eventsByDate).map(([date, count]) => ({
			date,
			count,
		}));

		// Analyze violation types
		const violationEvents = events.filter((e) => e.outcome === "failure");
		const violationTypes = violationEvents.reduce(
			(acc, event) => {
				const type = event.eventType;
				acc[type] = (acc[type] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		// Analyze access patterns
		const accessPatterns = events.reduce(
			(acc, event) => {
				if (event.userId) {
					const key = `${event.userId}:${event.resource}`;
					acc[key] = (acc[key] || 0) + 1;
				}
				return acc;
			},
			{} as Record<string, number>,
		);

		return {
			eventVolume,
			violationTypes: Object.entries(violationTypes).map(([type, count]) => ({
				type,
				count,
			})),
			accessPatterns: Object.entries(accessPatterns)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 10)
				.map(([key, count]) => {
					const [user, resource] = key.split(":");
					return { user, resource, count };
				}),
		};
	}

	private generateComplianceRecommendations(
		events: AuditEvent[],
		violations: number,
	): string[] {
		const recommendations: string[] = [];

		if (violations > 0) {
			recommendations.push(
				`🚨 ${violations} compliance violations detected - immediate investigation required`,
			);
		}

		const failureRate =
			events.filter((e) => e.outcome === "failure").length / events.length;
		if (failureRate > 0.1) {
			recommendations.push(
				"⚠️ High failure rate detected - review operational procedures",
			);
		}

		const afterHoursEvents = events.filter((e) => {
			const hour = e.timestamp.getHours();
			return hour < 6 || hour > 22;
		});

		if (afterHoursEvents.length > events.length * 0.2) {
			recommendations.push(
				"🌙 Significant after-hours activity - review access policies",
			);
		}

		const restrictedDataAccess = events.filter(
			(e) => e.compliance.dataClassification === "restricted" && e.outcome === "success",
		);

		if (restrictedDataAccess.length > 0) {
			recommendations.push(
				"🔒 Restricted data access detected - ensure proper authorization and logging",
			);
		}

		if (recommendations.length === 0) {
			recommendations.push(
				"✅ Good compliance posture - continue monitoring and maintaining standards",
			);
		}

		return recommendations;
	}

	private async storeReport(report: ComplianceReport): Promise<void> {
		const reportId = randomUUID();

		this.db
			.prepare(`
      INSERT INTO compliance_reports (id, tenant_id, report_period_start, report_period_end, report_data)
      VALUES (?, ?, ?, ?, ?)
    `)
			.run(
				reportId,
				report.tenantId,
				report.reportPeriod.start.toISOString(),
				report.reportPeriod.end.toISOString(),
				JSON.stringify(report),
			);
	}

	private async archiveEvent(event: any, location: string): Promise<void> {
		// Simulate archival to cold storage
		console.log(`🗄️ Archiving event ${event.id} to ${location}`);
		// In a real implementation, this would move to S3, Glacier, etc.
	}

	private convertToCSV(events: any[]): string {
		if (events.length === 0) return "";

		const headers = Object.keys(events[0]);
		const csvRows = [headers.join(",")];

		for (const event of events) {
			const values = headers.map((header) => {
				const value = event[header];
				if (typeof value === "object") {
					return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
				}
				return `"${String(value).replace(/"/g, '""')}"`;
			});
			csvRows.push(values.join(","));
		}

		return csvRows.join("\n");
	}

	private convertToXML(data: any): string {
		// Simple XML conversion - in production, use a proper XML library
		let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
		xml += "<audit_export>\n";
		xml += `  <metadata>\n`;
		xml += `    <tenantId>${data.metadata.tenantId}</tenantId>\n`;
		xml += `    <exportDate>${data.metadata.exportDate}</exportDate>\n`;
		xml += `    <totalEvents>${data.metadata.totalEvents}</totalEvents>\n`;
		xml += `  </metadata>\n`;
		xml += `  <events>\n`;

		for (const event of data.events) {
			xml += `    <event id="${event.id}">\n`;
			xml += `      <timestamp>${event.timestamp}</timestamp>\n`;
			xml += `      <type>${event.eventType}</type>\n`;
			xml += `      <tenant>${event.tenantId}</tenant>\n`;
			xml += `      <resource>${event.resource}</resource>\n`;
			xml += `      <action>${event.action}</action>\n`;
			xml += `      <outcome>${event.outcome}</outcome>\n`;
			xml += `    </event>\n`;
		}

		xml += `  </events>\n`;
		xml += "</audit_export>";

		return xml;
	}

	/**
	 * Close database connection
	 */
	close(): void {
		// Flush any remaining events
		this.flushEvents();
		this.db.close();
	}
}

// ─── Export singleton instance ───────────────────────────────────────────────────
export const auditTrailManager = new AuditTrailManager();
