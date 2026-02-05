#!/usr/bin/env bun
/**
 * @fileoverview Audit Results RSS Publisher
 * @description Publish audit results to team RSS feeds and Telegram notifications
 * @module scripts/publish-audit-to-rss
 *
 * [[TECH][MODULE][INTEGRATION][META:{blueprint=BP-AUDIT-RSS-PUBLISHER@1.3.3;instance-id=AUDIT-RSS-PUBLISHER-001;version=1.3.3}]
 * [PROPERTIES:{integration={value:"audit-rss-publishing";@root:"14.0.0.0.0.0.0";@chain:["BP-RSS-CONSTANTS","BP-BENCHMARK-PUBLISHER","BP-TELEGRAM-CLIENT"];@version:"1.3.3"}}]
 * [CLASS:AuditRSSPublisher][#REF:v-1.3.3.BP.AUDIT.RSS.PUBLISHER.1.0.A.1.1.SCRIPT.1.1]]
 *
 * Implementation Patterns:
 * - Team-based routing: `--team` argument mapping to `RSS_TEAM_CATEGORIES` (BP-RSS-CONSTANTS@1.0.0)
 * - Database persistence: SQLite INSERT to `rss_items` table (BP-BENCHMARK-PUBLISHER@1.0.0)
 * - Telegram notifications: `notifyTopic` pattern (BP-TELEGRAM-CLIENT@0.1.0)
 * - RSS cache refresh: `fetch(RSS_INTERNAL.benchmark_api/refresh)` (BP-RSS-INTEGRATOR@1.0.0)
 * - JSON validation: Zod schema validation with fallback (BP-MCP-SERVER@0.2.0)
 * - Graceful error handling: Circuit breaker + retry logic (BP-CIRCUIT-BREAKER@0.1.0)
 *
 * Usage:
 *   bun run scripts/publish-audit-to-rss.ts --team platform_tools
 *   bun run scripts/publish-audit-to-rss.ts --team sports_correlation --file audit-results.json
 *   echo '{"findings": [...]}' | bun run scripts/publish-audit-to-rss.ts --team market_analytics
 */

import { Database } from 'bun:sqlite';
import { z } from 'zod';
import { notifyTopic } from '../packages/@graph/telegram/src/notifications';
import { CircuitBreaker, retryWithBackoff, type RetryOptions } from '../src/utils/enterprise-retry';
import { refreshRSSCache } from '../src/utils/rss-cache-refresh';
import { RSS_TEAM_CATEGORIES } from '../src/utils/rss-constants';

/**
 * Zod schema for audit finding validation
 * Blueprint: BP-MCP-SERVER@0.2.0 - JSON validation with fallback
 */
const AuditFindingSchema = z.object({
	type: z.enum(['error', 'warning', 'info', 'security']),
	severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
	message: z.string(),
	file: z.string().optional(),
	line: z.number().optional(),
	rule: z.string().optional(),
	recommendation: z.string().optional(),
});

/**
 * Zod schema for audit result validation
 * Blueprint: BP-MCP-SERVER@0.2.0 - JSON validation with fallback
 */
const AuditResultSchema = z.object({
	team: z.string(),
	timestamp: z.string().optional(),
	findings: z.array(AuditFindingSchema),
	summary: z.object({
		total: z.number(),
		errors: z.number(),
		warnings: z.number(),
		info: z.number(),
		security: z.number(),
	}).optional(),
	metadata: z.record(z.string(), z.any()).optional(),
});

type AuditFinding = z.infer<typeof AuditFindingSchema>;
type AuditResult = z.infer<typeof AuditResultSchema>;

/**
 * Publish audit results to team RSS feed
 */
export async function publishAuditToRSS(
	teamId: keyof typeof RSS_TEAM_CATEGORIES,
	auditResult: AuditResult,
): Promise<void> {
	const team = RSS_TEAM_CATEGORIES[teamId];
	if (!team) {
		throw new Error(`Invalid team ID: ${teamId}. Valid teams: ${Object.keys(RSS_TEAM_CATEGORIES).join(', ')}`);
	}

	// Database persistence: BP-BENCHMARK-PUBLISHER@1.0.0
	const db = new Database('registry.db');

	// Create table if it doesn't exist (or alter if needed)
	db.exec(`
		CREATE TABLE IF NOT EXISTS rss_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			feed_type TEXT NOT NULL,
			package_name TEXT,
			title TEXT NOT NULL,
			content TEXT NOT NULL,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`);
	
	// Add team_id column if it doesn't exist
	try {
		db.exec(`ALTER TABLE rss_items ADD COLUMN team_id TEXT`);
	} catch {
		// Column already exists, ignore
	}
	
	// Add category column if it doesn't exist
	try {
		db.exec(`ALTER TABLE rss_items ADD COLUMN category TEXT`);
	} catch {
		// Column already exists, ignore
	}

	// Generate audit summary
	const criticalCount = auditResult.findings.filter(f => f.severity === 'critical').length;
	const highCount = auditResult.findings.filter(f => f.severity === 'high').length;
	const statusEmoji = criticalCount > 0 ? '🔴' : highCount > 0 ? '🟡' : '🟢';
	
	const title = `${statusEmoji} Audit Report: ${team.name}`;
	const content = JSON.stringify({
		summary: auditResult.summary,
		findings: auditResult.findings,
		metadata: auditResult.metadata,
		timestamp: auditResult.timestamp,
	});

	// Insert into RSS items table
	// Note: package_name is required by existing schema, use team name as placeholder
	const insertStmt = db.prepare(
		`
		INSERT INTO rss_items (feed_type, package_name, team_id, title, content, category, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
		`,
	);
	
	insertStmt.run(
		'audit',
		`@team/${teamId}`, // Use team identifier as package_name placeholder
		teamId,
		title,
		content,
		'audit',
	);

	console.log(`💾 Audit results saved to registry database for ${team.name}`);

	// Telegram notifications: BP-TELEGRAM-CLIENT@0.1.0
	// Graceful error handling: BP-CIRCUIT-BREAKER@0.1.0
	const telegramBreaker = new CircuitBreaker();
	const telegramRetryOptions: RetryOptions = {
		maxAttempts: 2,
		initialDelayMs: 500,
		maxDelayMs: 2000,
		backoffMultiplier: 2,
	};

	try {
		const criticalFindings = auditResult.findings.filter(f => f.severity === 'critical');
		const highFindings = auditResult.findings.filter(f => f.severity === 'high');
		
		const summary = auditResult.summary ?? {
			total: auditResult.findings.length,
			errors: auditResult.findings.filter(f => f.type === 'error').length,
			warnings: auditResult.findings.filter(f => f.type === 'warning').length,
			info: auditResult.findings.filter(f => f.type === 'info').length,
			security: auditResult.findings.filter(f => f.type === 'security').length,
		};
		
		let message = `${statusEmoji} **Audit Report: ${team.name}**\n\n`;
		message += `📋 **Summary:**\n`;
		message += `• Total Findings: ${summary.total}\n`;
		message += `• 🔴 Critical: ${criticalCount}\n`;
		message += `• 🟡 High: ${highCount}\n`;
		message += `• ⚠️ Warnings: ${summary.warnings}\n`;
		message += `• ℹ️ Info: ${summary.info}\n\n`;

		if (criticalFindings.length > 0) {
			message += `🔴 **Critical Issues:**\n`;
			criticalFindings.slice(0, 3).forEach((finding, idx) => {
				message += `${idx + 1}. ${finding.message}`;
				if (finding.file) {
					message += ` (${finding.file}${finding.line ? `:${finding.line}` : ''})`;
				}
				message += `\n`;
			});
			if (criticalFindings.length > 3) {
				message += `... and ${criticalFindings.length - 3} more\n`;
			}
			message += `\n`;
		}

		if (highFindings.length > 0 && criticalFindings.length === 0) {
			message += `🟡 **High Priority Issues:**\n`;
			highFindings.slice(0, 3).forEach((finding, idx) => {
				message += `${idx + 1}. ${finding.message}`;
				if (finding.file) {
					message += ` (${finding.file}${finding.line ? `:${finding.line}` : ''})`;
				}
				message += `\n`;
			});
			if (highFindings.length > 3) {
				message += `... and ${highFindings.length - 3} more\n`;
			}
			message += `\n`;
		}

		message += `[View Full Report](http://localhost:4000/audits/${teamId})`;

		// Use team's Telegram topic with circuit breaker and retry
		const telegramResult = await retryWithBackoff(
			() => telegramBreaker.execute(async () => {
				await notifyTopic(team.telegram_topic, message, { 
					silent: criticalCount === 0 && highCount === 0 
				});
			}),
			telegramRetryOptions,
		);

		if (telegramResult.success) {
			console.log(`📱 Notification sent to ${team.name} Telegram topic ${team.telegram_topic}`);
		} else {
			console.warn(`⚠️  Telegram notification failed after ${telegramResult.attempts} attempts: ${telegramResult.error}`);
		}
	} catch (error) {
		console.error(`❌ Failed to send Telegram notification: ${error}`);
	}

	// Update RSS feed cache (if internal API is available)
	// Blueprint: BP-RSS-INTEGRATOR@1.0.0 - RSS cache refresh pattern
	// Blueprint: BP-CIRCUIT-BREAKER@0.1.0 - Circuit breaker + retry logic
	const refreshResult = await refreshRSSCache({ team: teamId });
	if (refreshResult.success) {
		console.log(`🔄 RSS feed cache refreshed via ${refreshResult.endpoint}`);
	} else if (refreshResult.error) {
		console.warn(`⚠️  RSS cache refresh failed: ${refreshResult.error}`);
	}
}

/**
 * Parse command line arguments
 */
function parseArgs(): { team?: string; file?: string } {
	const args = process.argv.slice(2);
	const options: { team?: string; file?: string } = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		if (arg === '--team' && nextArg) {
			options.team = nextArg;
			i++;
		} else if (arg === '--file' && nextArg) {
			options.file = nextArg;
			i++;
		}
	}

	return options;
}

// CLI entry point
if (import.meta.main) {
	const options = parseArgs();

	if (!options.team) {
		console.error('Error: --team is required');
		console.error('');
		console.error('Usage:');
		console.error('  bun run scripts/publish-audit-to-rss.ts --team <team-id> [--file <audit-results.json>]');
		console.error('');
		console.error('Teams:');
		console.error('  - platform_tools');
		console.error('  - sports_correlation');
		console.error('  - market_analytics');
		console.error('');
		console.error('Examples:');
		console.error('  bun run scripts/publish-audit-to-rss.ts --team platform_tools');
		console.error('  bun run scripts/publish-audit-to-rss.ts --team sports_correlation --file audit-results.json');
		console.error('  echo \'{"findings": []}\' | bun run scripts/publish-audit-to-rss.ts --team market_analytics');
		process.exit(1);
	}

	const teamId = options.team as keyof typeof RSS_TEAM_CATEGORIES;
	if (!(teamId in RSS_TEAM_CATEGORIES)) {
		console.error(`Error: Invalid team ID: ${teamId}`);
		console.error(`Valid teams: ${Object.keys(RSS_TEAM_CATEGORIES).join(', ')}`);
		process.exit(1);
	}

	try {
		// Read audit result from file or stdin
		// Blueprint: BP-MCP-SERVER@0.2.0 - JSON validation with fallback
		let rawData: any;

		if (options.file) {
			const file = Bun.file(options.file);
			if (!(await file.exists())) {
				console.error(`Error: File not found: ${options.file}`);
				process.exit(1);
			}
			rawData = JSON.parse(await file.text());
		} else {
			const stdin = await Bun.stdin.text();
			if (!stdin.trim()) {
				// Generate default audit result if no input
				rawData = {
					team: teamId,
					timestamp: new Date().toISOString(),
					findings: [],
					summary: {
						total: 0,
						errors: 0,
						warnings: 0,
						info: 0,
						security: 0,
					},
				};
			} else {
				rawData = JSON.parse(stdin);
			}
		}

		// Validate with Zod schema, fallback to defaults on error
		let auditResult: AuditResult;
		try {
			auditResult = AuditResultSchema.parse(rawData);
		} catch (validationError: any) {
			console.warn(`⚠️  JSON validation failed, using fallback defaults: ${validationError.message}`);
			// Fallback: create valid structure from raw data
			auditResult = {
				team: teamId,
				timestamp: rawData.timestamp || new Date().toISOString(),
				findings: Array.isArray(rawData.findings) 
					? rawData.findings.map((f: any) => ({
						type: (['error', 'warning', 'info', 'security'].includes(f.type) ? f.type : 'info') as AuditFinding['type'],
						severity: f.severity,
						message: String(f.message || 'Unknown finding'),
						file: f.file,
						line: f.line,
						rule: f.rule,
						recommendation: f.recommendation,
					}))
					: [],
				summary: rawData.summary || {
					total: Array.isArray(rawData.findings) ? rawData.findings.length : 0,
					errors: 0,
					warnings: 0,
					info: 0,
					security: 0,
				},
				metadata: rawData.metadata,
			};
		}

		// Ensure team matches
		auditResult.team = teamId;
		if (!auditResult.timestamp) {
			auditResult.timestamp = new Date().toISOString();
		}

		// Calculate summary if not provided
		if (!auditResult.summary && auditResult.findings) {
			auditResult.summary = {
				total: auditResult.findings.length,
				errors: auditResult.findings.filter(f => f.type === 'error').length,
				warnings: auditResult.findings.filter(f => f.type === 'warning').length,
				info: auditResult.findings.filter(f => f.type === 'info').length,
				security: auditResult.findings.filter(f => f.type === 'security').length,
			};
		}

		await publishAuditToRSS(teamId, auditResult);
		console.log(`✅ Audit results published for ${RSS_TEAM_CATEGORIES[teamId].name}`);
	} catch (error: any) {
		console.error(`❌ Error publishing audit: ${error.message}`);
		if (error.stack) {
			console.error(error.stack);
		}
		process.exit(1);
	}
}



