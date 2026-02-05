/**
 * @fileoverview Canonical Identity Module
 * @description Deterministic UUIDs and unified market identity across all exchanges
 * @module canonical
 */

// Market Fetcher
export {
	type CanonicalMarket,
	type CrossExchangeMatch,
	type ExchangeFetcher,
	fetchCanonicalMarket,
	fetchCanonicalMarkets,
	findCrossExchangeMatches,
	getFetcher,
	getMarketByUUID,
	type RawMarketData,
	registerFetcher,
	searchAllExchanges,
} from "./fetcher";
// Inspectable Canonicalizer
export {
	getInspectableMarketCanonicalizer,
	InspectableMarketCanonicalizer,
} from "./inspectable-canonicalizer";

// Market Canonicalizer
export {
	type CacheStats,
	type CanonicalMarketWithMetadata,
	MarketCanonicalizer,
	type MarketIdentifier,
} from "./market-canonicalizer";
// UUIDv5 Generation
export {
	canonicalUUID,
	EXCHANGE_NAMESPACES,
	type ExchangeName,
	getRegisteredExchanges,
	isValidUUID,
	parseSlug,
	slugToUUID,
	uuidv5,
} from "./uuidv5";
