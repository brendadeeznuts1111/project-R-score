#!/usr/bin/env bun
/**
 * @fileoverview MCP-RSS Monitor Tool
 * @description AI-summarized team updates from RSS feeds
 * @module mcp/tools/rss-monitor
 */

import { RSS_TEAM_CATEGORIES } from '../../utils/rss-constants';
import { parseRSSXML } from '../../utils/rss-parser';

export interface RSSMonitorTool {
	name: string;
	description: string;
	inputSchema: {
		type: 'object';
		properties: {
			teamId?: { type: 'string'; description: string };
			packageName?: { type: 'string'; description: string };
			summarize?: { type: 'boolean'; description: string };
		};
		required: [];
	};
}

/**
 * Fetch and summarize RSS feed
 */
async function fetchTeamFeed(teamId: keyof typeof RSS_TEAM_CATEGORIES): Promise<{
	teamName: string;
	items: Array<{
		title: string;
		description: string;
		pubDate: string;
		link: string;
		type: 'benchmark' | 'rfc' | 'release' | 'incident' | 'general';
	}>;
}> {
	const team = RSS_TEAM_CATEGORIES[teamId];
	if (!team || !team.feedUrl) {
		throw new Error(`No RSS feed configured for team: ${teamId}`);
	}

	try {
		const response = await fetch(team.feedUrl, {
			headers: {
				'User-Agent': 'GraphEngine-MCP-RSS-Monitor/1.0',
			},
			signal: AbortSignal.timeout(30000),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
		}

		const xml = await response.text();
		const feed = parseRSSXML(xml);

		// Detect item types
		const items = feed.items.slice(0, 10).map((item) => {
			const content = (item.description || item.content || '').toLowerCase();
			let type: 'benchmark' | 'rfc' | 'release' | 'incident' | 'general' = 'general';

			if (content.includes('benchmark') || content.includes('avgduration')) {
				type = 'benchmark';
			} else if (content.includes('rfc') || content.includes('request for comments')) {
				type = 'rfc';
			} else if (content.includes('release') || content.includes('published')) {
				type = 'release';
			} else if (content.includes('incident') || content.includes('critical')) {
				type = 'incident';
			}

			return {
				title: item.title,
				description: item.description || item.content || '',
				pubDate: item.pubDate || new Date().toISOString(),
				link: item.link || '',
				type,
			};
		});

		return {
			teamName: team.name,
			items,
		};
	} catch (error) {
		return {
			teamName: team.name,
			items: [],
		};
	}
}

/**
 * Summarize RSS items using AI
 */
function summarizeRSSItems(
	items: Array<{ title: string; description: string; type: string }>,
): string {
	if (items.length === 0) {
		return 'No updates available.';
	}

	const byType = items.reduce(
		(acc, item) => {
			if (!acc[item.type]) acc[item.type] = [];
			acc[item.type].push(item);
			return acc;
		},
		{} as Record<string, typeof items>,
	);

	const summaryParts: string[] = [];

	if (byType.benchmark) {
		summaryParts.push(`📊 ${byType.benchmark.length} benchmark result(s)`);
	}
	if (byType.rfc) {
		summaryParts.push(`📋 ${byType.rfc.length} RFC update(s)`);
	}
	if (byType.release) {
		summaryParts.push(`🚀 ${byType.release.length} release(s)`);
	}
	if (byType.incident) {
		summaryParts.push(`🚨 ${byType.incident.length} incident(s)`);
	}
	if (byType.general) {
		summaryParts.push(`📢 ${byType.general.length} general update(s)`);
	}

	return summaryParts.join(', ');
}

/**
 * Create RSS Monitor Tool
 */
export function createRSSMonitorTool(): RSSMonitorTool {
	return {
		name: 'rss-monitor-summarize',
		description:
			'Monitor RSS feeds and provide AI-summarized team updates. Can filter by team or package.',
		inputSchema: {
			type: 'object',
			properties: {
				teamId: {
					type: 'string',
					description:
						'Team ID to monitor (e.g., "sports_correlation", "market_analytics", "platform_tools")',
				},
				packageName: {
					type: 'string',
					description: 'Package name to monitor (e.g., "@graph/layer4")',
				},
				summarize: {
					type: 'boolean',
					description: 'Whether to generate AI summary (default: true)',
				},
			},
			required: [],
		},
	};
}

/**
 * Execute RSS Monitor Tool
 */
export async function executeRSSMonitorTool(args: {
	teamId?: string;
	packageName?: string;
	summarize?: boolean;
}): Promise<{
	summary: string;
	feeds: Array<{
		teamName: string;
		items: Array<{
			title: string;
			description: string;
			pubDate: string;
			link: string;
			type: string;
		}>;
	}>;
}> {
	const { teamId, packageName, summarize = true } = args;

	// Determine which teams to monitor
	const teamsToMonitor: Array<keyof typeof RSS_TEAM_CATEGORIES> = [];

	if (teamId) {
		if (teamId in RSS_TEAM_CATEGORIES) {
			teamsToMonitor.push(teamId as keyof typeof RSS_TEAM_CATEGORIES);
		}
	} else if (packageName) {
		// Find teams that own this package
		for (const [id, team] of Object.entries(RSS_TEAM_CATEGORIES)) {
			if (team.packages?.some((pkg) => packageName.includes(pkg))) {
				teamsToMonitor.push(id as keyof typeof RSS_TEAM_CATEGORIES);
			}
		}
	} else {
		// Monitor all teams
		teamsToMonitor.push(...(Object.keys(RSS_TEAM_CATEGORIES) as Array<keyof typeof RSS_TEAM_CATEGORIES>));
	}

	// Fetch feeds
	const feeds = await Promise.all(teamsToMonitor.map((id) => fetchTeamFeed(id)));

	// Generate summary
	const allItems = feeds.flatMap((feed) => feed.items);
	const summary = summarize ? summarizeRSSItems(allItems) : `${allItems.length} items found`;

	return {
		summary,
		feeds,
	};
}
