/**
 * Telegram Alert MCP Tool
 * MCP tool for publishing market tension alerts to Telegram supergroups
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MCP-TELEGRAM-ALERTS@1.3.4;instance-id=MCP-TELEGRAM-ALERTS-001;version=1.3.4}][PROPERTIES:{mcp={value:"telegram-alerts";@root:"20.0.0.0.0.0.0";@chain:["BP-MCP-TOOLS","BP-TELEGRAM-CLIENT"];@version:"1.3.4"}}][CLASS:TelegramAlertsMCP][#REF:v-1.3.4.BP.MCP.TELEGRAM.ALERTS.1.0.A.1.1.MCP.1.1]]
 */

import { z } from 'zod';
import { TensionAlertRouter } from '../../telegram/tension-alerts.js';
import { TELEGRAM_CONFIG } from '../../utils/rss-constants.js';
import type { MCPTool } from '../server.js';

/**
 * Telegram alert tool input schema
 */
const telegramAlertInputSchema = z.object({
	severity: z.enum(['critical', 'high', 'medium', 'low']),
	bookmaker: z.string(),
	eventId: z.string(),
	nodes: z.array(z.string()),
	snapshot: z.any().optional(),
	teamId: z.enum(['sports_correlation', 'market_analytics', 'platform_tools']),
});

/**
 * Create Telegram alert MCP tool
 */
export function createTelegramAlertTool(): MCPTool {
	return {
		name: 'telegram-publish-tension-alert',
		description:
			'Publish market tension alert to Telegram supergroup with intelligent routing and pinning',
		inputSchema: {
			type: 'object',
			properties: {
				severity: {
					type: 'string',
					enum: ['critical', 'high', 'medium', 'low'],
					description: 'Alert severity level',
				},
				bookmaker: {
					type: 'string',
					description: 'Bookmaker identifier (e.g., "dk", "betfair")',
				},
				eventId: {
					type: 'string',
					description: 'Event identifier',
				},
				nodes: {
					type: 'array',
					items: { type: 'string' },
					description: 'Array of affected node URLs',
				},
				snapshot: {
					type: 'object',
					description: 'Optional snapshot data',
				},
				teamId: {
					type: 'string',
					enum: ['sports_correlation', 'market_analytics', 'platform_tools'],
					description: 'Target team supergroup',
				},
			},
			required: ['severity', 'bookmaker', 'eventId', 'nodes', 'teamId'],
		},
	};
}

/**
 * Execute Telegram alert tool
 */
export async function executeTelegramAlertTool(
	args: z.infer<typeof telegramAlertInputSchema>,
): Promise<{
	content: Array<{ type: string; text: string }>;
	alert_id?: string;
	pinned?: boolean;
}> {
	const router = new TensionAlertRouter();

	// Map severity string to numeric severity
	const severityMap = {
		critical: 9,
		high: 7,
		medium: 5,
		low: 3,
	};

	const alert = {
		severity: severityMap[args.severity],
		nodes: args.nodes,
		snapshot: args.snapshot || {
			description: `Tension detected for ${args.bookmaker} event ${args.eventId}`,
			eventId: args.eventId,
		},
		tensionId: crypto.randomUUID(),
		tension_type: 'market_movement',
		eventId: args.eventId,
	};

	// Route the alert
	await router.routeTensionAlert(alert);

	const teamConfig = TELEGRAM_CONFIG.supergroups[args.teamId];
	const topicId =
		args.severity === 'critical'
			? teamConfig.topics.incidents
			: teamConfig.topics.general;

	return {
		content: [
			{
				type: 'text',
				text: `✅ Tension alert sent to ${args.teamId} Telegram supergroup (topic ${topicId})`,
			},
		],
		alert_id: alert.tensionId,
		pinned: args.severity === 'critical',
	};
}



