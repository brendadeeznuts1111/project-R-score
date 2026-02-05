/**
 * Market Filtering & Pattern Types
 * Defines market types, sub-markets, and pattern classifications
 */

export type MarketType = "moneyline" | "spread" | "over_under" | "props";
export type SportType = "soccer" | "basketball" | "football" | "baseball" | "hockey" | "tennis" | "esports";
export type PatternType =
	| "volume_spike"
	| "odds_flip"
	| "market_suspension"
	| "correlation_chain"
	| "temporal_pattern"
	| "cross_sport_anomaly";

export interface MarketFilter {
	marketType?: MarketType;
	subMarket?: string;
	sport?: SportType;
	league?: string;
	patternTypes?: PatternType[];
	minConfidence?: number;
	maxDetectionTime?: number;
}

export interface MarketTypeConfig {
	name: string;
	layer: number;
	packages: string[];
}

export interface SubMarketConfig {
	name: string;
	packages: string[];
}

export interface PatternConfig {
	name: string;
	layer: number;
	packages: string[];
}

export const MARKET_FILTERS = {
	// Primary market types (Layer 2)
	types: {
		moneyline: {
			name: "Moneyline",
			layer: 2,
			packages: ["@graph/layer2"],
		},
		spread: {
			name: "Point Spread",
			layer: 2,
			packages: ["@graph/layer2"],
		},
		over_under: {
			name: "Over/Under",
			layer: 2,
			packages: ["@graph/layer2"],
		},
		props: {
			name: "Player Props",
			layer: 2,
			packages: ["@graph/layer2"],
		},
	} as const satisfies Record<MarketType, MarketTypeConfig>,

	// Sub-markets (Layer 3)
	subMarkets: {
		soccer: {
			premier_league: {
				name: "Premier League",
				packages: ["@graph/layer3"],
			},
			bundesliga: {
				name: "Bundesliga",
				packages: ["@graph/layer3"],
			},
			la_liga: {
				name: "La Liga",
				packages: ["@graph/layer3"],
			},
			champions_league: {
				name: "Champions League",
				packages: ["@graph/layer3"],
			},
		},
		basketball: {
			nba: {
				name: "NBA",
				packages: ["@graph/layer3"],
			},
			euroleague: {
				name: "EuroLeague",
				packages: ["@graph/layer3"],
			},
		},
	} as const,

	// Pattern types (Layer 4)
	patterns: {
		volume_spike: {
			name: "Volume Spike",
			layer: 4,
			packages: ["@graph/layer4"],
		},
		odds_flip: {
			name: "Odds Flip",
			layer: 4,
			packages: ["@graph/layer4"],
		},
		market_suspension: {
			name: "Market Suspension",
			layer: 4,
			packages: ["@graph/layer4"],
		},
		correlation_chain: {
			name: "Correlation Chain",
			layer: 4,
			packages: ["@graph/layer4"],
		},
		temporal_pattern: {
			name: "Temporal Pattern",
			layer: 3,
			packages: ["@graph/layer3"],
		},
		cross_sport_anomaly: {
			name: "Cross-Sport Anomaly",
			layer: 4,
			packages: ["@graph/layer4"],
		},
	} as const satisfies Record<PatternType, PatternConfig>,
} as const;

/**
 * Get packages that support a market type
 */
export function getPackagesForMarketType(marketType: MarketType): string[] {
	return MARKET_FILTERS.types[marketType]?.packages || [];
}

/**
 * Get packages that support a sub-market
 */
export function getPackagesForSubMarket(
	sport: SportType,
	league: string,
): string[] {
	const subMarket = MARKET_FILTERS.subMarkets[sport]?.[league as keyof typeof MARKET_FILTERS.subMarkets[typeof sport]];
	return subMarket?.packages || [];
}

/**
 * Get packages that support a pattern type
 */
export function getPackagesForPattern(pattern: PatternType): string[] {
	return MARKET_FILTERS.patterns[pattern]?.packages || [];
}

/**
 * Check if a package supports a filter
 */
export function packageSupportsFilter(
	packageName: string,
	filter: MarketFilter,
): boolean {
	// Check market type
	if (filter.marketType) {
		const packages = getPackagesForMarketType(filter.marketType);
		if (!packages.includes(packageName)) {
			return false;
		}
	}

	// Check sub-market
	if (filter.subMarket && filter.sport) {
		const [sport, league] = filter.subMarket.split(":");
		const packages = getPackagesForSubMarket(
			sport as SportType,
			league,
		);
		if (!packages.includes(packageName)) {
			return false;
		}
	}

	// Check pattern types
	if (filter.patternTypes && filter.patternTypes.length > 0) {
		const allPatternPackages = filter.patternTypes.flatMap((pattern) =>
			getPackagesForPattern(pattern),
		);
		if (!allPatternPackages.includes(packageName)) {
			return false;
		}
	}

	return true;
}
