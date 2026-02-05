/**
 * @fileoverview Tag Inference System for Bookmaker Markets
 * @description Automatic tag inference and filtering for canonical markets
 * @module orca/aliases/bookmakers/tags
 */

import type { CanonicalMarket } from "./fetcher";

// Re-export for convenience
export type { CanonicalMarket };

/**
 * Market tag categories
 */
export const MARKET_TAGS = {
	status: ["live", "pregame", "final", "suspended", "cancelled"],
	domain: ["crypto", "sports", "prediction"],
	sports: [
		"basketball",
		"football",
		"soccer",
		"baseball",
		"hockey",
		"mma",
		"boxing",
		"tennis",
		"golf",
	],
	leagues: [
		"nba",
		"wnba",
		"nfl",
		"ncaa",
		"ncaaf",
		"ncaab",
		"mlb",
		"nhl",
		"epl",
		"laliga",
		"bundesliga",
		"seriea",
		"ligue1",
		"mls",
		"ufc",
	],
	gender: ["mens", "womens", "mixed"],
	period: ["first_half", "second_half", "quarter", "period", "full"],
	category: ["politics", "economy", "tech", "sports", "entertainment"],
	cryptoTier: ["major", "altcoin", "defi", "memecoin"],
	betType: ["moneyline", "spread", "total", "props", "futures"],
} as const;

/**
 * All valid tags flattened
 */
export const ALL_TAGS = Object.values(MARKET_TAGS).flat();

/**
 * Infer tags from a canonical market
 */
export function inferTagsFromMarket(market: CanonicalMarket): string[] {
	const tags: string[] = [];

	// Domain tag
	if (market.sport) {
		tags.push("sports");
	} else {
		// Could be crypto or prediction - default to sports for now
		tags.push("sports");
	}

	// Sport tag
	if (market.sport) {
		const sportLower = market.sport.toLowerCase();
		if (MARKET_TAGS.sports.includes(sportLower as any)) {
			tags.push(sportLower);
		}
	}

	// League tag
	if (market.league) {
		const leagueLower = market.league.toLowerCase();
		if (MARKET_TAGS.leagues.includes(leagueLower as any)) {
			tags.push(leagueLower);
		}
	}

	// Period tag
	if (market.period !== undefined) {
		if (market.period === 0) {
			tags.push("full");
		} else if (market.period === 1) {
			tags.push("first_half");
		} else if (market.period === 2) {
			tags.push("second_half");
		} else {
			tags.push("period");
		}
	}

	// Status tag (inferred from timestamp freshness)
	const now = Date.now();
	const marketTime = market.timestamp.getTime();
	const ageMs = now - marketTime;

	if (ageMs < 5 * 60 * 1000) {
		// Less than 5 minutes old
		tags.push("live");
	} else if (market.startTime && market.startTime.getTime() > now) {
		tags.push("pregame");
	} else {
		tags.push("final");
	}

	return tags;
}

/**
 * Filter markets by tags (AND logic - all tags must match)
 */
export function filterMarketsByTags(
	markets: CanonicalMarket[],
	tags: string[],
): CanonicalMarket[] {
	if (tags.length === 0) {
		return markets;
	}

	return markets.filter((market) => {
		const marketTags = inferTagsFromMarket(market);
		return tags.every((tag) => marketTags.includes(tag));
	});
}

/**
 * Filter markets by any tags (OR logic - any tag matches)
 */
export function filterMarketsByAnyTags(
	markets: CanonicalMarket[],
	tags: string[],
): CanonicalMarket[] {
	if (tags.length === 0) {
		return markets;
	}

	return markets.filter((market) => {
		const marketTags = inferTagsFromMarket(market);
		return tags.some((tag) => marketTags.includes(tag));
	});
}

/**
 * Get all unique tags from markets
 */
export function getAllTags(markets: CanonicalMarket[]): string[] {
	const tagSet = new Set<string>();

	markets.forEach((market) => {
		const tags = inferTagsFromMarket(market);
		tags.forEach((tag) => tagSet.add(tag));
	});

	return Array.from(tagSet);
}

/**
 * Tag statistics
 */
export interface TagStatistic {
	tag: string;
	count: number;
	percentage: number;
}

/**
 * Get tag statistics from markets
 */
export function getTagStatistics(markets: CanonicalMarket[]): TagStatistic[] {
	const tagCounts = new Map<string, number>();

	markets.forEach((market) => {
		const tags = inferTagsFromMarket(market);
		tags.forEach((tag) => {
			tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
		});
	});

	const total = markets.length;
	return Array.from(tagCounts.entries())
		.map(([tag, count]) => ({
			tag,
			count,
			percentage: total > 0 ? Math.round((count / total) * 100) : 0,
		}))
		.sort((a, b) => b.count - a.count);
}

/**
 * Validate tags against MARKET_TAGS
 */
export function validateTags(tags: string[]): string[] {
	const validTags = tags.filter((tag) =>
		(ALL_TAGS as readonly string[]).includes(tag),
	);
	return Array.from(new Set(validTags)); // Remove duplicates
}

/**
 * Sort tags by category
 */
export function sortTagsByCategory(tags: string[]): {
	status: string[];
	domain: string[];
	sports: string[];
	leagues: string[];
	gender: string[];
	period: string[];
	category: string[];
	cryptoTier: string[];
	betType: string[];
	other: string[];
} {
	const sorted: {
		status: string[];
		domain: string[];
		sports: string[];
		leagues: string[];
		gender: string[];
		period: string[];
		category: string[];
		cryptoTier: string[];
		betType: string[];
		other: string[];
	} = {
		status: [],
		domain: [],
		sports: [],
		leagues: [],
		gender: [],
		period: [],
		category: [],
		cryptoTier: [],
		betType: [],
		other: [],
	};

	tags.forEach((tag) => {
		if (MARKET_TAGS.status.includes(tag as any)) {
			sorted.status.push(tag);
		} else if (MARKET_TAGS.domain.includes(tag as any)) {
			sorted.domain.push(tag);
		} else if (MARKET_TAGS.sports.includes(tag as any)) {
			sorted.sports.push(tag);
		} else if (MARKET_TAGS.leagues.includes(tag as any)) {
			sorted.leagues.push(tag);
		} else if (MARKET_TAGS.gender.includes(tag as any)) {
			sorted.gender.push(tag);
		} else if (MARKET_TAGS.period.includes(tag as any)) {
			sorted.period.push(tag);
		} else if (MARKET_TAGS.category.includes(tag as any)) {
			sorted.category.push(tag);
		} else if (MARKET_TAGS.cryptoTier.includes(tag as any)) {
			sorted.cryptoTier.push(tag);
		} else if (MARKET_TAGS.betType.includes(tag as any)) {
			sorted.betType.push(tag);
		} else {
			sorted.other.push(tag);
		}
	});

	return sorted;
}
