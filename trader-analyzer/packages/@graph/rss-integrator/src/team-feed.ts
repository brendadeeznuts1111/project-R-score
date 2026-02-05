#!/usr/bin/env bun
/**
 * @fileoverview RSS Feed Integration with Team Architecture
 * @description Fetch and parse team feeds with metadata enrichment
 * @module @graph/rss-integrator/team-feed
 */

import {
    RSS_DEFAULTS,
    RSS_FEED_URLS,
    RSS_REGEX_PATTERNS,
    RSS_TEAM_CATEGORIES,
    RSS_USER_AGENTS,
} from '../../../src/utils/rss-constants.js';
import { parseRSSXML, type RSSFeed } from '../../../src/utils/rss-parser.js';

export type TeamId = keyof typeof RSS_TEAM_CATEGORIES;

export interface EnrichedFeed extends RSSFeed {
	teamId: TeamId;
	teamName: string;
	teamLead: string;
	telegramTopic: number;
	packages: string[];
	feedUrl?: string;
}

/**
 * Fetch and parse team feed
 */
export async function getTeamFeed(teamId: TeamId): Promise<EnrichedFeed> {
	const team = RSS_TEAM_CATEGORIES[teamId];
	
	if (!team) {
		throw new Error(`Team not found: ${teamId}`);
	}
	
	// Get feed URL from RSS_FEED_URLS (nested structure: RSS_FEED_URLS.sports_correlation.main)
	const teamFeeds = RSS_FEED_URLS[teamId as keyof typeof RSS_FEED_URLS];
	const feedUrl = typeof teamFeeds === 'object' && teamFeeds !== null && 'main' in teamFeeds 
		? (teamFeeds as { main: string }).main 
		: team.feed_url;

	if (!feedUrl) {
		throw new Error(`No RSS feed configured for team: ${teamId}`);
	}

	const response = await fetch(feedUrl, {
		headers: {
			'User-Agent': RSS_USER_AGENTS.team_bot,
		},
		// @ts-ignore - Bun supports timeout
		signal: AbortSignal.timeout(RSS_DEFAULTS.timeout),
	});

	if (!response.ok) {
		throw new Error(`RSS feed returned ${response.status}: ${response.statusText}`);
	}

	const xml = await response.text();
	const feed = parseRSSXML(xml);

	// Enrich with team metadata
	return {
		...feed,
		teamId,
		teamName: team.name,
		teamLead: team.team_lead,
		telegramTopic: team.telegram_topic,
		packages: team.packages,
		feedUrl, // Include feed URL in response
	};
}

/**
 * Subscribe to package-specific feed updates
 */
export function subscribeToPackageFeed(
	packageName: string,
	callback: (update: PackageFeedUpdate) => void,
): () => void {
	const feedUrl =
		RSS_FEED_URLS.packages[packageName as keyof typeof RSS_FEED_URLS.packages];

	if (!feedUrl) {
		console.warn(`No RSS feed for package: ${packageName}`);
		return () => {}; // Return no-op unsubscribe function
	}

	let lastItemIds = new Set<string>();
	let intervalId: ReturnType<typeof setInterval> | null = null;

	const poll = async () => {
		try {
			const response = await fetch(feedUrl, {
				headers: { 'User-Agent': RSS_USER_AGENTS.monitoring_bot },
				// @ts-ignore - Bun supports timeout
				signal: AbortSignal.timeout(RSS_DEFAULTS.timeout),
			});

			if (!response.ok) {
				console.error(`Failed to fetch feed for ${packageName}: ${response.status}`);
				return;
			}

			const xml = await response.text();
			const feed = parseRSSXML(xml);

			// Check for new items
			for (const item of feed.items) {
				const itemId = item.guid || item.link;
				if (itemId && !lastItemIds.has(itemId)) {
					lastItemIds.add(itemId);
					callback({
						package: packageName,
						type: detectItemType(item),
						...item,
					});
				}
			}

			// Keep only recent item IDs to prevent memory growth
			if (lastItemIds.size > RSS_DEFAULTS.batch_size) {
				const idsArray = Array.from(lastItemIds);
				lastItemIds = new Set(idsArray.slice(-RSS_DEFAULTS.batch_size));
			}
		} catch (error) {
			console.error(`Error polling feed for ${packageName}:`, error);
		}
	};

	// Initial poll
	poll();

	// Set up polling
	intervalId = setInterval(poll, RSS_DEFAULTS.refresh_interval * 1000);

	// Return unsubscribe function
	return () => {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	};
}

export interface PackageFeedUpdate {
	package: string;
	type: 'benchmark' | 'rfc' | 'release' | 'incident' | 'general';
	title: string;
	link: string;
	description: string;
	pubDate: string;
	category?: string;
	author?: string;
	guid?: string;
}

/**
 * Detect item type from content
 */
function detectItemType(item: {
	title: string;
	description: string;
	category?: string;
}): 'benchmark' | 'rfc' | 'release' | 'incident' | 'general' {
	const content = `${item.title} ${item.description} ${item.category || ''}`;

	if (RSS_REGEX_PATTERNS.benchmark_results.test(content)) {
		return 'benchmark';
	}
	if (RSS_REGEX_PATTERNS.rfc_status.test(content)) {
		return 'rfc';
	}
	if (content.toLowerCase().includes('published') || content.toLowerCase().includes('release')) {
		return 'release';
	}
	if (RSS_REGEX_PATTERNS.incident_severity.test(content)) {
		return 'incident';
	}

	return 'general';
}

/**
 * Get all team feeds
 */
export async function getAllTeamFeeds(): Promise<EnrichedFeed[]> {
	const teamIds = Object.keys(RSS_TEAM_CATEGORIES) as TeamId[];
	const feeds = await Promise.allSettled(teamIds.map((id) => getTeamFeed(id)));

	return feeds
		.filter((result): result is PromiseFulfilledResult<EnrichedFeed> => result.status === 'fulfilled')
		.map((result) => result.value);
}
