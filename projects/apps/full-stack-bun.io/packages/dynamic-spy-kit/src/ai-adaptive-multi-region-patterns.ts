/**
 * @dynamic-spy/kit v9.0 - AI-Adaptive Multi-Region Patterns
 * 
 * Dynamic, Geo-adaptive & AI-optimized endpoints
 * Record structure for region-based pattern management
 */

import type { URLPatternInit } from "./core/urlpattern-spy";
import { AIPatternLoader } from "./ai-pattern-loader";

export interface AdaptivePattern extends URLPatternInit {
	id?: string;
	priority?: number; // 0-1000 scale
	environment?: 'prod' | 'staging' | 'dev';
	type?: 'static' | 'ai-generated' | 'ai-driven';
	region?: 'asia' | 'eu' | 'cis' | 'us' | 'global';
}

export type RegionPatterns = (URLPatternInit & { 
	id?: string; 
	priority?: number; 
	environment?: string; 
	type?: 'static' | 'ai-generated' | 'ai-driven' 
})[];

export const AI_ADAPTIVE_MULTI_REGION_PATTERNS: Record<string, RegionPatterns> = {
	'pinnacle-asia': [
		// High Priority Asia Patterns (priority 110)
		{
			id: 'P_ASIA_ZH',
			pathname: '/vds/sports/:sportId/zh/odds/:marketId',
			hostname: 'pinnacle.com',
			priority: 110,
			environment: 'prod',
			type: 'static'
		},
		{
			id: 'P_ASIA_EN',
			pathname: '/vds/sports/:sportId/en/odds/:marketId',
			hostname: 'pinnacle.com',
			priority: 108,
			environment: 'prod',
			type: 'static'
		},
		{
			id: 'P_ASIA_DE',
			pathname: '/vds/sports/:sportId/de/odds/:marketId',
			hostname: 'pinnacle.com',
			priority: 105,
			environment: 'prod',
			type: 'static'
		}
	],

	'bet365-eu': [
		// EU Patterns (priority 95-100)
		{
			id: 'B365_EU_LOCAL',
			pathname: '/:lang(en|de|fr)/sportsbook/:sportSlug+/:market',
			hostname: 'bet365.com',
			priority: 95,
			environment: 'prod',
			type: 'static'
		},
		{
			id: 'B365_EU_MOBILE',
			pathname: '/m/:lang(en|de|fr)?/sports/:eventId',
			hostname: 'm.bet365.com',
			priority: 92,
			environment: 'prod',
			type: 'static'
		},
		{
			id: 'B365_EU_SPA',
			pathname: '/#/SB/:sport/*/:marketId',
			hostname: 'bet365.com',
			priority: 90,
			environment: 'prod',
			type: 'static'
		}
	],

	'fonbet-cis': [
		// CIS Patterns (priority 100)
		{
			id: 'F_CIS_RU',
			pathname: '/line/:sport/:league/:matchId',
			hostname: 'fonbet.ru',
			priority: 100,
			environment: 'prod',
			type: 'static'
		},
		{
			id: 'F_CIS_KZ',
			pathname: '/live/line/:sportId/:eventId',
			hostname: 'fonbet.kz',
			priority: 98,
			environment: 'prod',
			type: 'static'
		}
	],

	'us-sportsbooks': [
		// US Patterns
		{
			id: 'DK_MOBILE',
			pathname: '/sports/:sport/:league/:eventId',
			hostname: 'sportsbook.draftkings.com',
			priority: 85,
			environment: 'prod',
			type: 'static'
		},
		{
			id: 'FD_EVENT',
			pathname: '/sportsbook/:sport/:eventId',
			hostname: 'sportsbook.fanduel.com',
			priority: 83,
			environment: 'prod',
			type: 'static'
		},
		{
			id: 'BGM_MARKET',
			pathname: '/sports/:sport/:league/:eventId/:market',
			hostname: 'sports.betmgm.com',
			priority: 80,
			environment: 'prod',
			type: 'static'
		}
	],

	'pinnacle-global': [
		// Global Pinnacle Patterns
		{
			id: 'P_LIVE',
			pathname: '/vds/live/sports/:sportId/events/:eventId{/*}?',
			hostname: 'pinnacle.com',
			priority: 88,
			environment: 'prod',
			type: 'static'
		},
		{
			id: 'P_HISTORICAL',
			pathname: '/v1/odds/historical/:startDate{\\d{4}-\\d{2}-\\d{2}}/:endDate{\\d{4}-\\d{2}-\\d{2}}?/:market',
			hostname: 'pinnacle.com',
			priority: 75,
			environment: 'prod',
			type: 'static'
		}
	],

	'ai-driven-feed': [], // This region will be dynamically updated by `loadAIDrivenFeedPatterns`

	'global-hyper-ranked': [] // Initialized with all static + dynamic patterns
};

/**
 * Load AI-driven feed patterns from JSON file
 */
export async function loadAIDrivenFeedPatterns(): Promise<RegionPatterns> {
	try {
		const aiPatterns = await AIPatternLoader.loadPatterns('./patterns/ai-driven-feed.json');
		return AIPatternLoader.convertToURLPatternInit(aiPatterns);
	} catch (e) {
		console.error('Failed to load AI-driven feed patterns:', e);
		return [];
	}
}

/**
 * Load feed-batch patterns from JSON file
 */
export async function loadFeedBatchPatterns(): Promise<RegionPatterns> {
	try {
		const feedPatterns = await AIPatternLoader.loadPatterns('./patterns/feed-batch.json');
		return AIPatternLoader.convertToURLPatternInit(feedPatterns);
	} catch (e) {
		console.error('Failed to load feed-batch patterns:', e);
		return [];
	}
}

/**
 * Build global-hyper-ranked region from all static + dynamic patterns
 */
export async function buildGlobalHyperRankedPatterns(): Promise<RegionPatterns> {
	const allPatterns: RegionPatterns = [];
	
	// Collect all static patterns from regions
	Object.entries(AI_ADAPTIVE_MULTI_REGION_PATTERNS).forEach(([region, patterns]) => {
		if (region !== 'ai-driven-feed' && region !== 'global-hyper-ranked') {
			allPatterns.push(...patterns);
		}
	});
	
	// Load AI-driven feed patterns
	const aiFeedPatterns = await loadAIDrivenFeedPatterns();
	allPatterns.push(...aiFeedPatterns);
	
	// Load feed-batch patterns
	const feedBatchPatterns = await loadFeedBatchPatterns();
	allPatterns.push(...feedBatchPatterns);
	
	// Sort by priority (highest first)
	return allPatterns.sort((a, b) => {
		const priorityA = a.priority || 50;
		const priorityB = b.priority || 50;
		return priorityB - priorityA;
	});
}

/**
 * Initialize global-hyper-ranked patterns
 */
export async function initializeGlobalHyperRanked(): Promise<void> {
	AI_ADAPTIVE_MULTI_REGION_PATTERNS['global-hyper-ranked'] = await buildGlobalHyperRankedPatterns();
	console.log(`✅ Initialized global-hyper-ranked with ${AI_ADAPTIVE_MULTI_REGION_PATTERNS['global-hyper-ranked'].length} patterns`);
}

/**
 * Update AI-driven feed patterns dynamically
 */
export async function updateAIDrivenFeedPatterns(): Promise<void> {
	const aiFeedPatterns = await loadAIDrivenFeedPatterns();
	AI_ADAPTIVE_MULTI_REGION_PATTERNS['ai-driven-feed'] = aiFeedPatterns;
	
	// Rebuild global-hyper-ranked
	await initializeGlobalHyperRanked();
	
	console.log(`✅ Updated ai-driven-feed with ${aiFeedPatterns.length} patterns`);
}

/**
 * Get all patterns as flat array (for backward compatibility)
 */
export function getAllPatterns(): AdaptivePattern[] {
	const allPatterns: AdaptivePattern[] = [];
	Object.values(AI_ADAPTIVE_MULTI_REGION_PATTERNS).forEach(patterns => {
		allPatterns.push(...patterns as AdaptivePattern[]);
	});
	return allPatterns;
}

/**
 * Filter patterns by environment
 */
export function filterByEnvironment(patterns: AdaptivePattern[], environment: string): AdaptivePattern[] {
	return patterns.filter(p => p.environment === environment);
}

/**
 * Sort patterns by priority (highest first)
 */
export function sortByPriority(patterns: AdaptivePattern[]): AdaptivePattern[] {
	return patterns.sort((a, b) => {
		const priorityA = a.priority || 50;
		const priorityB = b.priority || 50;
		return priorityB - priorityA;
	});
}

/**
 * Get priority distribution
 */
export function getPriorityDistribution(patterns: AdaptivePattern[]): {
	high: number; // >= 100
	medium: number; // 75-99
	low: number; // < 75
	aiDriven: number;
	environment: Record<string, number>;
} {
	const high = patterns.filter(p => (p.priority || 0) >= 100).length;
	const medium = patterns.filter(p => (p.priority || 0) >= 75 && (p.priority || 0) < 100).length;
	const low = patterns.filter(p => (p.priority || 0) < 75).length;
	const aiDriven = patterns.filter(p => p.type === 'ai-driven' || p.type === 'ai-generated').length;

	const environment: Record<string, number> = {};
	patterns.forEach(p => {
		const env = p.environment || 'prod';
		environment[env] = (environment[env] || 0) + 1;
	});

	return { high, medium, low, aiDriven, environment };
}
