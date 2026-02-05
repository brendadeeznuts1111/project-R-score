/**
 * @fileoverview Market type taxonomy and normalization
 * @module orca/taxonomy/market
 */

import type { OrcaMarketType, OrcaPeriod } from "../../types";

/**
 * Market type definitions with metadata
 */
export const MARKET_TYPES: Record<
	OrcaMarketType,
	{ name: string; description: string }
> = {
	moneyline: {
		name: "Moneyline",
		description: "Bet on which team/participant will win",
	},
	spread: {
		name: "Point Spread",
		description: "Bet on the margin of victory with a handicap",
	},
	total: {
		name: "Total (Over/Under)",
		description: "Bet on whether combined score is over or under a number",
	},
	prop: {
		name: "Proposition Bet",
		description: "Bet on specific events within a game (player props, etc.)",
	},
	future: {
		name: "Futures",
		description: "Bet on future outcomes (championship, MVP, etc.)",
	},
	live: {
		name: "Live/In-Play",
		description: "Bets placed during a live event",
	},
};

/**
 * Market type aliases by bookmaker
 */
export const MARKET_TYPE_ALIASES: Record<string, OrcaMarketType> = {
	// Moneyline
	moneyline: "moneyline",
	ml: "moneyline",
	"money line": "moneyline",
	"to win": "moneyline",
	"match winner": "moneyline",
	"head to head": "moneyline",
	h2h: "moneyline",
	"1x2": "moneyline",

	// Spread
	spread: "spread",
	"point spread": "spread",
	handicap: "spread",
	"asian handicap": "spread",
	ats: "spread",
	"against the spread": "spread",
	"run line": "spread",
	"puck line": "spread",

	// Total
	total: "total",
	totals: "total",
	"over/under": "total",
	"over under": "total",
	"o/u": "total",
	"game total": "total",
	"team total": "total",

	// Props
	prop: "prop",
	props: "prop",
	proposition: "prop",
	"player prop": "prop",
	"player props": "prop",
	"team prop": "prop",
	"game prop": "prop",

	// Futures
	future: "future",
	futures: "future",
	outright: "future",
	outrights: "future",
	"to win championship": "future",
	"championship winner": "future",
	mvp: "future",

	// Live
	live: "live",
	"in-play": "live",
	"in play": "live",
	"in-game": "live",
	"live betting": "live",
};

/**
 * Period definitions
 */
export const PERIODS: Record<OrcaPeriod, { name: string; sport?: string[] }> = {
	full: { name: "Full Game" },
	h1: { name: "First Half", sport: ["NBA", "NFL", "NCAAF", "NCAAB", "EPL"] },
	h2: { name: "Second Half", sport: ["NBA", "NFL", "NCAAF", "NCAAB", "EPL"] },
	q1: { name: "First Quarter", sport: ["NBA", "NFL", "NCAAF", "NCAAB"] },
	q2: { name: "Second Quarter", sport: ["NBA", "NFL", "NCAAF", "NCAAB"] },
	q3: { name: "Third Quarter", sport: ["NBA", "NFL", "NCAAF", "NCAAB"] },
	q4: { name: "Fourth Quarter", sport: ["NBA", "NFL", "NCAAF", "NCAAB"] },
	p1: { name: "First Period", sport: ["NHL"] },
	p2: { name: "Second Period", sport: ["NHL"] },
	p3: { name: "Third Period", sport: ["NHL"] },
	i1: { name: "First Inning", sport: ["MLB"] },
	i2: { name: "Second Inning", sport: ["MLB"] },
	i3: { name: "Third Inning", sport: ["MLB"] },
	i4: { name: "Fourth Inning", sport: ["MLB"] },
	i5: { name: "Fifth Inning", sport: ["MLB"] },
	i6: { name: "Sixth Inning", sport: ["MLB"] },
	i7: { name: "Seventh Inning", sport: ["MLB"] },
	i8: { name: "Eighth Inning", sport: ["MLB"] },
	i9: { name: "Ninth Inning", sport: ["MLB"] },
	set1: { name: "First Set", sport: ["TENNIS"] },
	set2: { name: "Second Set", sport: ["TENNIS"] },
	set3: { name: "Third Set", sport: ["TENNIS"] },
	set4: { name: "Fourth Set", sport: ["TENNIS"] },
	set5: { name: "Fifth Set", sport: ["TENNIS"] },
};

/**
 * Period aliases
 */
export const PERIOD_ALIASES: Record<string, OrcaPeriod> = {
	// Full game
	full: "full",
	"full game": "full",
	game: "full",
	match: "full",
	regulation: "full",

	// Halves
	"1st half": "h1",
	"first half": "h1",
	"1h": "h1",
	h1: "h1",
	"2nd half": "h2",
	"second half": "h2",
	"2h": "h2",
	h2: "h2",

	// Quarters
	"1st quarter": "q1",
	"first quarter": "q1",
	"1q": "q1",
	q1: "q1",
	"2nd quarter": "q2",
	"second quarter": "q2",
	"2q": "q2",
	q2: "q2",
	"3rd quarter": "q3",
	"third quarter": "q3",
	"3q": "q3",
	q3: "q3",
	"4th quarter": "q4",
	"fourth quarter": "q4",
	"4q": "q4",
	q4: "q4",

	// Hockey periods
	"1st period": "p1",
	"first period": "p1",
	"1p": "p1",
	p1: "p1",
	"2nd period": "p2",
	"second period": "p2",
	"2p": "p2",
	p2: "p2",
	"3rd period": "p3",
	"third period": "p3",
	"3p": "p3",
	p3: "p3",

	// Tennis sets
	"1st set": "set1",
	"first set": "set1",
	"set 1": "set1",
	set1: "set1",
	"2nd set": "set2",
	"second set": "set2",
	"set 2": "set2",
	set2: "set2",
	"3rd set": "set3",
	"third set": "set3",
	"set 3": "set3",
	set3: "set3",
};

/**
 * Resolves raw market type to canonical type
 */
export function resolveMarketType(rawType: string): OrcaMarketType | null {
	const normalized = rawType.toLowerCase().trim();
	return MARKET_TYPE_ALIASES[normalized] || null;
}

/**
 * Resolves raw period to canonical period
 */
export function resolvePeriod(rawPeriod: string | undefined): OrcaPeriod {
	if (!rawPeriod) return "full";
	const normalized = rawPeriod.toLowerCase().trim();
	return PERIOD_ALIASES[normalized] || "full";
}

/**
 * Gets market type metadata
 */
export function getMarketTypeInfo(type: OrcaMarketType) {
	return MARKET_TYPES[type];
}

/**
 * Lists all market types
 */
export function listMarketTypes(): OrcaMarketType[] {
	return Object.keys(MARKET_TYPES) as OrcaMarketType[];
}
