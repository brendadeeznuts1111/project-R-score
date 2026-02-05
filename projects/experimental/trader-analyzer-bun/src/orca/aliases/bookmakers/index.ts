/**
 * @fileoverview Bookmaker alias loader and canonical UUID system
 * @module orca/aliases/bookmakers
 */

import type { AliasRegistry } from "../registry";
import { loadBetfairAliases } from "./betfair";
import { loadDraftKingsAliases } from "./draftkings";
import { loadPinnacleAliases } from "./pinnacle";

/**
 * Loads all bookmaker aliases into the registry
 */
export function loadAllBookmakerAliases(registry: AliasRegistry): void {
	loadPinnacleAliases(registry);
	loadDraftKingsAliases(registry);
	loadBetfairAliases(registry);
}

export { loadBetfairAliases } from "./betfair";
// Export cache manager
export {
	BookmakerCacheManager,
	type CacheEntry,
	type CacheMetrics,
	getBookmakerCache,
} from "./cache";
export { loadDraftKingsAliases } from "./draftkings";
// Export market fetcher
export {
	BetfairAdapter,
	type CanonicalMarket,
	type ExchangeAdapter,
	getMarketFetcher,
	type MarketData,
	MarketFetcher,
	PinnacleAdapter,
} from "./fetcher";
// Export header manager
export {
	getHeaderManager,
	HeaderManager,
	type HeaderRule,
} from "./headers";
// Export inspectable cache manager
export {
	getInspectableBookmakerCache,
	InspectableBookmakerCacheManager,
} from "./inspectable-cache";
// Export alias loaders
export { loadPinnacleAliases } from "./pinnacle";
// Export tag system
export {
	ALL_TAGS,
	filterMarketsByAnyTags,
	filterMarketsByTags,
	getAllTags,
	getTagStatistics,
	inferTagsFromMarket,
	MARKET_TAGS,
	sortTagsByCategory,
	type TagStatistic,
	validateTags,
} from "./tags";
// Export UUID system
export {
	BookmakerUUIDGenerator,
	generateMarketUUID,
	type MarketIdentifier,
} from "./uuid";
