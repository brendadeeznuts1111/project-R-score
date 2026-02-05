/**
 * @fileoverview Tag Inference System Tests (Bun)
 * @module orca/aliases/bookmakers/tags.test
 */

import { beforeEach, describe, expect, it } from "bun:test";
import {
	type CanonicalMarket,
	filterMarketsByAnyTags,
	filterMarketsByTags,
	getAllTags,
	getTagStatistics,
	inferTagsFromMarket,
	MARKET_TAGS,
	sortTagsByCategory,
	validateTags,
} from "./tags";

describe("Tag Inference System", () => {
	describe("inferTagsFromMarket", () => {
		it("infers sports market tags correctly", () => {
			const market: CanonicalMarket = {
				uuid: "test-uuid-1",
				bookId: "betfair-123",
				home: "Lakers",
				away: "Celtics",
				period: 0,
				league: "NBA",
				sport: "basketball",
				startTime: new Date(),
				odds: {},
				exchanges: [],
				canonicalOdds: {},
				timestamp: new Date(),
			};

			const tags = inferTagsFromMarket(market);

			expect(tags).toContain("sports");
			expect(tags).toContain("basketball");
			expect(tags).toContain("nba");
			expect(tags).toContain("full");
			expect(tags.length).toBeGreaterThanOrEqual(4);
		});

		it("infers period tags correctly", () => {
			const market1: CanonicalMarket = {
				uuid: "test-uuid-2",
				bookId: "betfair-124",
				home: "Arsenal",
				away: "Chelsea",
				period: 0,
				league: "EPL",
				sport: "soccer",
				startTime: new Date(),
				odds: {},
				exchanges: [],
				canonicalOdds: {},
				timestamp: new Date(),
			};

			const market2: CanonicalMarket = {
				...market1,
				uuid: "test-uuid-3",
				period: 1,
			};

			const tags1 = inferTagsFromMarket(market1);
			const tags2 = inferTagsFromMarket(market2);

			expect(tags1).toContain("full");
			expect(tags2).toContain("first_half");
		});

		it("infers live status from recent timestamp", () => {
			const market: CanonicalMarket = {
				uuid: "test-uuid-4",
				bookId: "betfair-125",
				home: "Team A",
				away: "Team B",
				period: 0,
				league: "NFL",
				sport: "football",
				startTime: new Date(),
				odds: {},
				exchanges: [],
				canonicalOdds: {},
				timestamp: new Date(), // Recent timestamp
			};

			const tags = inferTagsFromMarket(market);

			expect(tags).toContain("live");
		});

		it("infers pregame status from future start time", () => {
			const futureTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
			const market: CanonicalMarket = {
				uuid: "test-uuid-5",
				bookId: "betfair-126",
				home: "Team A",
				away: "Team B",
				period: 0,
				league: "NBA",
				sport: "basketball",
				startTime: futureTime,
				odds: {},
				exchanges: [],
				canonicalOdds: {},
				timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
			};

			const tags = inferTagsFromMarket(market);

			expect(tags).toContain("pregame");
		});
	});

	describe("filterMarketsByTags", () => {
		const markets: CanonicalMarket[] = [
			{
				uuid: "uuid-1",
				bookId: "betfair-1",
				home: "Lakers",
				away: "Celtics",
				period: 0,
				league: "NBA",
				sport: "basketball",
				startTime: new Date(),
				odds: {},
				exchanges: [],
				canonicalOdds: {},
				timestamp: new Date(),
			},
			{
				uuid: "uuid-2",
				bookId: "betfair-2",
				home: "Arsenal",
				away: "Chelsea",
				period: 0,
				league: "EPL",
				sport: "soccer",
				startTime: new Date(),
				odds: {},
				exchanges: [],
				canonicalOdds: {},
				timestamp: new Date(),
			},
			{
				uuid: "uuid-3",
				bookId: "betfair-3",
				home: "Patriots",
				away: "Chiefs",
				period: 0,
				league: "NFL",
				sport: "football",
				startTime: new Date(),
				odds: {},
				exchanges: [],
				canonicalOdds: {},
				timestamp: new Date(),
			},
		];

		it("filters markets that have ALL specified tags", () => {
			const filtered = filterMarketsByTags(markets, ["sports", "basketball"]);

			expect(filtered).toHaveLength(1);
			expect(filtered[0].uuid).toBe("uuid-1");
		});

		it("returns empty array when no markets match all tags", () => {
			const filtered = filterMarketsByTags(markets, ["sports", "hockey"]);

			expect(filtered).toHaveLength(0);
		});

		it("handles single tag filter", () => {
			const filtered = filterMarketsByTags(markets, ["sports"]);

			expect(filtered).toHaveLength(3);
		});

		it("handles empty tags array (returns all markets)", () => {
			const filtered = filterMarketsByTags(markets, []);

			expect(filtered).toHaveLength(3);
		});
	});

	describe("filterMarketsByAnyTags", () => {
		const markets: CanonicalMarket[] = [
			{
				uuid: "uuid-1",
				bookId: "betfair-1",
				home: "Lakers",
				away: "Celtics",
				period: 0,
				league: "NBA",
				sport: "basketball",
				startTime: new Date(),
				odds: {},
				exchanges: [],
				canonicalOdds: {},
				timestamp: new Date(),
			},
			{
				uuid: "uuid-2",
				bookId: "betfair-2",
				home: "Arsenal",
				away: "Chelsea",
				period: 0,
				league: "EPL",
				sport: "soccer",
				startTime: new Date(),
				odds: {},
				exchanges: [],
				canonicalOdds: {},
				timestamp: new Date(),
			},
			{
				uuid: "uuid-3",
				bookId: "betfair-3",
				home: "Patriots",
				away: "Chiefs",
				period: 0,
				league: "NFL",
				sport: "football",
				startTime: new Date(),
				odds: {},
				exchanges: [],
				canonicalOdds: {},
				timestamp: new Date(),
			},
		];

		it("filters markets that have ANY of the specified tags", () => {
			const filtered = filterMarketsByAnyTags(markets, [
				"basketball",
				"soccer",
			]);

			expect(filtered).toHaveLength(2);
			expect(filtered.map((m) => m.uuid)).toEqual(["uuid-1", "uuid-2"]);
		});

		it("returns empty array when no markets match any tag", () => {
			const filtered = filterMarketsByAnyTags(markets, ["hockey"]);

			expect(filtered).toHaveLength(0);
		});
	});

	describe("getAllTags", () => {
		it("returns all unique tags from markets", () => {
			const markets: CanonicalMarket[] = [
				{
					uuid: "uuid-1",
					bookId: "betfair-1",
					home: "Lakers",
					away: "Celtics",
					period: 0,
					league: "NBA",
					sport: "basketball",
					startTime: new Date(),
					odds: {},
					exchanges: [],
					canonicalOdds: {},
					timestamp: new Date(),
				},
				{
					uuid: "uuid-2",
					bookId: "betfair-2",
					home: "Arsenal",
					away: "Chelsea",
					period: 0,
					league: "EPL",
					sport: "soccer",
					startTime: new Date(),
					odds: {},
					exchanges: [],
					canonicalOdds: {},
					timestamp: new Date(),
				},
			];

			const allTags = getAllTags(markets);

			expect(allTags).toContain("sports");
			expect(allTags).toContain("basketball");
			expect(allTags).toContain("nba");
			expect(allTags).toContain("soccer");
			expect(allTags).toContain("epl");
		});
	});

	describe("getTagStatistics", () => {
		it("returns correct tag counts and percentages", () => {
			const markets: CanonicalMarket[] = [
				{
					uuid: "uuid-1",
					bookId: "betfair-1",
					home: "Lakers",
					away: "Celtics",
					period: 0,
					league: "NBA",
					sport: "basketball",
					startTime: new Date(),
					odds: {},
					exchanges: [],
					canonicalOdds: {},
					timestamp: new Date(),
				},
				{
					uuid: "uuid-2",
					bookId: "betfair-2",
					home: "Arsenal",
					away: "Chelsea",
					period: 0,
					league: "EPL",
					sport: "soccer",
					startTime: new Date(),
					odds: {},
					exchanges: [],
					canonicalOdds: {},
					timestamp: new Date(),
				},
			];

			const stats = getTagStatistics(markets);

			const sportsStat = stats.find((s) => s.tag === "sports");
			expect(sportsStat).toBeDefined();
			expect(sportsStat?.count).toBe(2);
			expect(sportsStat?.percentage).toBe(100);
		});
	});

	describe("validateTags", () => {
		it("returns valid tags that exist in MARKET_TAGS", () => {
			const inputTags = ["sports", "live", "nonexistent", "nba"];
			const validTags = validateTags(inputTags);

			expect(validTags).toHaveLength(3);
			expect(validTags).toContain("sports");
			expect(validTags).toContain("nba");
			expect(validTags).not.toContain("nonexistent");
		});

		it("handles duplicate tags", () => {
			const inputTags = ["sports", "sports", "nba"];
			const validTags = validateTags(inputTags);

			expect(validTags).toHaveLength(2);
			expect(validTags).toEqual(["sports", "nba"]);
		});
	});

	describe("sortTagsByCategory", () => {
		it("sorts tags into their respective categories", () => {
			const tags = ["live", "sports", "nba", "basketball", "full"];

			const sorted = sortTagsByCategory(tags);

			expect(sorted.status).toContain("live");
			expect(sorted.domain).toContain("sports");
			expect(sorted.leagues).toContain("nba");
			expect(sorted.sports).toContain("basketball");
			expect(sorted.period).toContain("full");
		});

		it("handles tags that dont belong to any category", () => {
			const tags = ["live", "unknown_tag"];

			const sorted = sortTagsByCategory(tags);

			expect(sorted.status).toContain("live");
			expect(sorted.other).toContain("unknown_tag");
		});
	});

	describe("MARKET_TAGS constant", () => {
		it("has all tag categories defined", () => {
			expect(MARKET_TAGS.status).toBeArray();
			expect(MARKET_TAGS.domain).toBeArray();
			expect(MARKET_TAGS.sports).toBeArray();
			expect(MARKET_TAGS.leagues).toBeArray();
			expect(MARKET_TAGS.gender).toBeArray();
			expect(MARKET_TAGS.period).toBeArray();
			expect(MARKET_TAGS.category).toBeArray();
			expect(MARKET_TAGS.cryptoTier).toBeArray();
			expect(MARKET_TAGS.betType).toBeArray();
		});

		it("contains expected tags in each category", () => {
			expect(MARKET_TAGS.status).toContain("live");
			expect(MARKET_TAGS.status).toContain("pregame");
			expect(MARKET_TAGS.status).toContain("final");

			expect(MARKET_TAGS.domain).toContain("sports");
			expect(MARKET_TAGS.domain).toContain("crypto");

			expect(MARKET_TAGS.sports).toContain("basketball");
			expect(MARKET_TAGS.sports).toContain("football");
			expect(MARKET_TAGS.sports).toContain("mma");
		});
	});
});
