/**
 * @fileoverview ORCA - Sports Betting Market Normalization Layer
 * @description UUIDv5-based deterministic market identification for cross-bookmaker matching
 * @module orca
 *
 * @example
 * ```typescript
 * import { createOrcaNormalizer } from './orca';
 *
 * const normalizer = createOrcaNormalizer();
 *
 * // DraftKings input
 * const dk = normalizer.normalize({
 *   bookmaker: 'draftkings',
 *   sport: 'NBA Basketball',
 *   league: 'NBA',
 *   homeTeam: 'LA Lakers',
 *   awayTeam: 'BOS Celtics',
 *   startTime: '2025-01-15T19:30:00Z',
 *   marketType: 'Point Spread',
 *   line: -3.5,
 *   selection: 'LA Lakers -3.5',
 * });
 *
 * // Pinnacle input - SAME game
 * const pin = normalizer.normalize({
 *   bookmaker: 'pinnacle',
 *   sport: 'Basketball',
 *   league: 'NBA',
 *   homeTeam: 'Los Angeles Lakers',
 *   awayTeam: 'Boston Celtics',
 *   startTime: '2025-01-15T19:30:00Z',
 *   marketType: 'Spread',
 *   line: -3.5,
 *   selection: 'Los Angeles Lakers',
 * });
 *
 * // IDs MATCH across bookmakers
 * dk.data?.event.id === pin.data?.event.id  // true
 * dk.data?.market.id === pin.data?.market.id  // true
 * ```
 */

export { loadAllBookmakerAliases } from "./aliases/bookmakers";
export type {
	AliasEntry,
	AliasType,
	FuzzyLookupResult,
} from "./aliases/registry";
// Alias system
export { AliasRegistry, globalRegistry } from "./aliases/registry";
export type { FuzzyMatchResult } from "./matching";
// Fuzzy matching
export {
	expandAbbreviations,
	fuzzyMatch,
	fuzzyMatchTop,
	isSameEntity,
	jaroSimilarity,
	jaroWinklerSimilarity,
	levenshteinDistance,
	levenshteinSimilarity,
	tokenize,
	tokenSimilarity,
} from "./matching";
// Namespace and ID generation
export {
	buildEventKey,
	buildLeagueKey,
	buildMarketKey,
	buildSelectionKey,
	buildTeamKey,
	generateEventId,
	generateLeagueId,
	generateMarketId,
	generateOrcaId,
	generateSelectionId,
	generateTeamId,
	normalizeKeyString,
	ORCA_NAMESPACE,
} from "./namespace";
export type { NormalizationResult } from "./normalizer";
// Core normalizer
export {
	createOrcaNormalizer,
	globalNormalizer,
	OrcaNormalizer,
} from "./normalizer";
// Storage
export { getOrcaStorage, OrcaStorage } from "./storage";
export type { BookmakerClient, RawOddsData } from "./streaming/clients";
export {
	BaseBookmakerClient,
	BetfairClient,
	PS3838Client,
} from "./streaming/clients";
export type { OddsFetcherConfig } from "./streaming/fetcher";
export { OddsFetcher } from "./streaming/fetcher";
// Streaming
export { createOrcaStreamServer, OrcaStreamServer } from "./streaming/server";
export {
	getLeague,
	getLeaguesBySport,
	LEAGUE_ALIASES,
	LEAGUES,
	resolveLeague,
} from "./taxonomy/league";
export {
	getMarketTypeInfo,
	listMarketTypes,
	MARKET_TYPE_ALIASES,
	MARKET_TYPES,
	PERIOD_ALIASES,
	PERIODS,
	resolveMarketType,
	resolvePeriod,
} from "./taxonomy/market";
// Taxonomy
export {
	getSportInfo,
	listSports,
	resolveSport,
	SPORT_ALIASES,
	SPORTS,
} from "./taxonomy/sport";
