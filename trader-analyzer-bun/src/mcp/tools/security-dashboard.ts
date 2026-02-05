/**
 * @fileoverview Security Dashboard MCP Tools
 * @module mcp/tools/security-dashboard
 *
 * MCP tools for security monitoring and incident response.
 */

import { Database } from "bun:sqlite";
import type { RuntimeSecurityMonitor } from "../../security/runtime-monitor";
import type { ComplianceLogger } from "../../security/compliance-logger";
import type { IncidentResponseOrchestrator } from "../../security/incident-response";

export function createSecurityDashboardTools(
	monitor?: RuntimeSecurityMonitor,
	compliance?: ComplianceLogger,
	incidentResponse?: IncidentResponseOrchestrator,
): Array<{
	name: string;
	description: string;
	inputSchema: {
		type: "object";
		properties: Record<string, any>;
		required?: string[];
	};
	execute: (args: Record<string, any>) => Promise<{
		content: Array<{ type?: string; text?: string; data?: any }>;
		isError?: boolean;
	}>;
}> {
	// Use default database if instances not provided
	const db = new Database("security.db", { create: true });

	return [
		{
			name: "security-threat-summary",
			description:
				"Get real-time security threat summary for the last 24 hours",
			inputSchema: {
				type: "object",
				properties: {
					hours: {
						type: "number",
						description: "Number of hours to look back (default: 24)",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const hours = (args.hours as number) || 24;
					const cutoff = Date.now() - hours * 60 * 60 * 1000;

					const summary = db
						.query(`
						SELECT 
							threat_type,
							COUNT(*) as count,
							MAX(severity) as max_severity,
							MIN(detected_at) as first_seen,
							MAX(detected_at) as last_seen
						FROM security_threats
						WHERE detected_at > ?1
						GROUP BY threat_type
						ORDER BY count DESC
					`)
						.all(cutoff) as Array<{
						threat_type: string;
						count: number;
						max_severity: number;
						first_seen: number;
						last_seen: number;
					}>;

					if (summary.length === 0) {
						return {
							content: [
								{
									text: `🛡️  ${hours}-Hour Threat Summary\n\nNo threats detected in the last ${hours} hours.`,
								},
							],
						};
					}

					const text =
						`🛡️  ${hours}-Hour Threat Summary\n\n` +
						summary
							.map(
								(t) =>
									`${t.threat_type.padEnd(30)} | ${String(t.count).padStart(5)} events | Max Sev: ${t.max_severity}`,
							)
							.join("\n");

					return {
						content: [{ text }],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `Error getting threat summary: ${(error as Error).message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "security-incident-response",
			description: "Get active incident response status",
			inputSchema: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				try {
					const active = db
						.query(`
						SELECT 
							i.incidentId,
							i.severity,
							i.status,
							i.playbook,
							i.startTime,
							COUNT(a.actionId) as action_count
						FROM incidents i
						LEFT JOIN incident_actions a ON i.incidentId = a.incidentId
						WHERE i.status != 'resolved'
						GROUP BY i.incidentId
						ORDER BY i.startTime DESC
					`)
						.all() as Array<{
						incidentId: string;
						severity: string;
						status: string;
						playbook: string;
						startTime: number;
						action_count: number;
					}>;

					if (active.length === 0) {
						return {
							content: [
								{
									text: "🚨 Active Incidents\n\nNo active incidents.",
								},
							],
						};
					}

					const text =
						"🚨 Active Incidents\n\n" +
						active
							.map(
								(i) =>
									`${i.incidentId} | ${i.severity.toUpperCase().padEnd(9)} | ${i.status.padEnd(10)} | Playbook: ${i.playbook} | Actions: ${i.action_count}`,
							)
							.join("\n");

					return {
						content: [{ text }],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `Error getting incident response: ${(error as Error).message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "security-compliance-status",
			description: "Check compliance audit trail health",
			inputSchema: {
				type: "object",
				properties: {
					days: {
						type: "number",
						description: "Number of days to look back (default: 30)",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const days = (args.days as number) || 30;
					const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

					const stats = db
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

					if (!stats || stats.total_logs === 0) {
						return {
							content: [
								{
									text: `✅ Compliance Status: NO DATA\n\nNo compliance logs found in the last ${days} days.`,
								},
							],
						};
					}

					const retentionDays = Math.round(
						(stats.newest - stats.oldest) / (24 * 60 * 60 * 1000),
					);

					const text =
						`✅ Compliance Status: HEALTHY\n\n` +
						`Logs: ${stats.total_logs.toLocaleString()}\n` +
						`Users: ${stats.unique_users}\n` +
						`Retention: ${retentionDays} days\n` +
						`Oldest: ${new Date(stats.oldest).toISOString()}\n` +
						`Newest: ${new Date(stats.newest).toISOString()}`;

					return {
						content: [{ text }],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `Error getting compliance status: ${(error as Error).message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
		{
			name: "security-recent-threats",
			description: "Get recent security threats with details",
			inputSchema: {
				type: "object",
				properties: {
					limit: {
						type: "number",
						description: "Maximum number of threats to return (default: 10)",
					},
				},
			},
			execute: async (args: Record<string, any>) => {
				try {
					const limit = (args.limit as number) || 10;

					const threats = db
						.query(`
						SELECT threatId, threat_type, severity, context, detected_at
						FROM security_threats
						ORDER BY detected_at DESC
						LIMIT ?1
					`)
						.all(limit) as Array<{
						threatId: string;
						threat_type: string;
						severity: number;
						context: string;
						detected_at: number;
					}>;

					if (threats.length === 0) {
						return {
							content: [
								{
									text: "🔍 Recent Threats\n\nNo threats found.",
								},
							],
						};
					}

					const text =
						"🔍 Recent Threats\n\n" +
						threats
							.map((t) => {
								const context = JSON.parse(t.context);
								return (
									`[${t.severity >= 8 ? "🔴" : t.severity >= 6 ? "🟠" : "🟡"}] ${t.threat_type}\n` +
									`  ID: ${t.threatId}\n` +
									`  Severity: ${t.severity}/10\n` +
									`  Detected: ${new Date(t.detected_at).toISOString()}\n` +
									`  Context: ${JSON.stringify(context, null, 2)}\n`
								);
							})
							.join("\n");

					return {
						content: [{ text }],
					};
				} catch (error) {
					return {
						content: [
							{
								text: `Error getting recent threats: ${(error as Error).message}`,
							},
						],
						isError: true,
					};
				}
			},
		},
	];
}
