/**
 * @fileoverview Cross-Market Event Matcher
 * @description Matches prediction market events across venues using text similarity
 * @module arbitrage/matcher
 */

import type { PredictionMarket } from "../types";
import type {
	MarketCategory,
	MatchCriteria,
	MatchedEvent,
	PredictionVenue,
	VenueQuote,
} from "./types";

// ORCA-style namespace for prediction market events
const PREDICTION_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/**
 * Default match criteria
 */
const DEFAULT_CRITERIA: MatchCriteria = {
	minSimilarity: 0.6,
	categoryMustMatch: false,
	maxDateDifferenceDays: 7,
};

/**
 * Stopwords to remove for better matching
 */
const STOPWORDS = new Set([
	"the",
	"a",
	"an",
	"will",
	"be",
	"to",
	"of",
	"in",
	"on",
	"at",
	"by",
	"for",
	"with",
	"is",
	"are",
	"was",
	"were",
	"has",
	"have",
	"had",
	"do",
	"does",
	"did",
	"this",
	"that",
	"these",
	"those",
	"what",
	"which",
	"who",
	"whom",
	"where",
	"when",
	"why",
	"how",
	"or",
	"and",
	"but",
	"if",
	"than",
	"then",
	"so",
	"as",
	"up",
	"down",
	"out",
	"off",
	"over",
	"under",
	"again",
	"further",
	"once",
	"here",
	"there",
]);

/**
 * Category keywords for automatic categorization
 */
const CATEGORY_KEYWORDS: Record<MarketCategory, string[]> = {
	crypto: [
		"bitcoin",
		"btc",
		"ethereum",
		"eth",
		"crypto",
		"cryptocurrency",
		"token",
		"blockchain",
		"defi",
		"nft",
	],
	politics: [
		"election",
		"president",
		"congress",
		"senate",
		"vote",
		"democrat",
		"republican",
		"trump",
		"biden",
		"political",
		"governor",
		"mayor",
	],
	sports: [
		"nfl",
		"nba",
		"mlb",
		"nhl",
		"soccer",
		"football",
		"basketball",
		"baseball",
		"hockey",
		"game",
		"championship",
		"super bowl",
		"world series",
	],
	economics: [
		"fed",
		"federal reserve",
		"interest rate",
		"inflation",
		"gdp",
		"unemployment",
		"recession",
		"stock",
		"market",
		"s&p",
		"nasdaq",
		"dow",
	],
	weather: [
		"temperature",
		"hurricane",
		"tornado",
		"earthquake",
		"flood",
		"weather",
		"climate",
		"storm",
	],
	entertainment: [
		"oscar",
		"grammy",
		"emmy",
		"movie",
		"film",
		"album",
		"song",
		"celebrity",
		"awards",
	],
	science: [
		"space",
		"nasa",
		"mars",
		"moon",
		"spacex",
		"rocket",
		"ai",
		"artificial intelligence",
		"technology",
		"breakthrough",
	],
	other: [],
};

/**
 * EventMatcher - Matches events across prediction markets
 *
 * Uses text similarity and keyword extraction to find matching events
 * across Polymarket and Kalshi (and future venues).
 */
export class EventMatcher {
	private criteria: MatchCriteria;
	private eventCache: Map<string, MatchedEvent> = new Map();

	constructor(criteria?: Partial<MatchCriteria>) {
		this.criteria = { ...DEFAULT_CRITERIA, ...criteria };
	}

	/**
	 * Generate deterministic event ID using ORCA-style UUIDv5
	 */
	generateEventId(
		normalizedQuestion: string,
		category: MarketCategory,
	): string {
		const seed = `${category}:${normalizedQuestion}`;
		return Bun.randomUUIDv5(seed, PREDICTION_NAMESPACE);
	}

	/**
	 * Normalize a question for matching
	 * - Lowercase
	 * - Remove stopwords
	 * - Extract key terms
	 * - Normalize numbers and dates
	 */
	normalizeQuestion(question: string): string {
		let normalized = question.toLowerCase();

		// Remove punctuation except hyphens and dollar signs
		normalized = normalized.replace(/[^\w\s\-$%]/g, " ");

		// Normalize money amounts
		normalized = normalized.replace(/\$(\d+),?(\d*)/g, "$$$1$2");
		normalized = normalized.replace(
			/\$(\d+)k/gi,
			(_, n) => `$${parseInt(n, 10) * 1000}`,
		);
		normalized = normalized.replace(
			/\$(\d+)m/gi,
			(_, n) => `$${parseInt(n, 10) * 1000000}`,
		);
		normalized = normalized.replace(
			/\$(\d+)b/gi,
			(_, n) => `$${parseInt(n, 10) * 1000000000}`,
		);

		// Normalize percentages
		normalized = normalized.replace(/(\d+)%/g, "$1 percent");

		// Normalize dates
		normalized = normalized.replace(
			/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g,
			(_, m, d, y) => {
				const year = y.length === 2 ? `20${y}` : y;
				return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
			},
		);

		// Remove stopwords
		const words = normalized
			.split(/\s+/)
			.filter((w) => !STOPWORDS.has(w) && w.length > 1);

		// Sort for consistency
		return words.sort().join(" ");
	}

	/**
	 * Extract keywords from a question
	 */
	extractKeywords(question: string): string[] {
		const normalized = question.toLowerCase();
		const keywords: string[] = [];

		// Extract entity-like words (capitalized in original)
		const capitalizedWords = question.match(/[A-Z][a-z]+/g) || [];
		keywords.push(...capitalizedWords.map((w) => w.toLowerCase()));

		// Extract numbers with context
		const numbers = normalized.match(/\$?\d+[.,]?\d*[kmb]?%?/g) || [];
		keywords.push(...numbers);

		// Extract dates
		const dates =
			normalized.match(/\d{4}|\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?/g) ||
			[];
		keywords.push(...dates.map((d) => d.toLowerCase()));

		// Category-specific keywords
		for (const [_category, categoryKeywords] of Object.entries(
			CATEGORY_KEYWORDS,
		)) {
			for (const keyword of categoryKeywords) {
				if (normalized.includes(keyword)) {
					keywords.push(keyword);
				}
			}
		}

		return [...new Set(keywords)];
	}

	/**
	 * Detect category from question content
	 */
	detectCategory(question: string): MarketCategory {
		const normalized = question.toLowerCase();

		for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
			if (category === "other") continue;

			const matches = keywords.filter((kw) => normalized.includes(kw));
			if (matches.length >= 2) {
				return category as MarketCategory;
			}
		}

		// Single keyword match with high confidence keywords
		const highConfidence: Partial<Record<MarketCategory, string[]>> = {
			crypto: ["bitcoin", "ethereum", "btc", "eth"],
			politics: ["election", "president", "congress"],
			economics: ["federal reserve", "interest rate", "fed"],
		};

		for (const [category, keywords] of Object.entries(highConfidence)) {
			for (const keyword of keywords || []) {
				if (normalized.includes(keyword)) {
					return category as MarketCategory;
				}
			}
		}

		return "other";
	}

	/**
	 * Calculate similarity between two normalized questions
	 * Uses Jaccard similarity on word sets
	 */
	calculateSimilarity(question1: string, question2: string): number {
		const words1 = new Set(question1.split(" "));
		const words2 = new Set(question2.split(" "));

		const intersection = new Set([...words1].filter((w) => words2.has(w)));
		const union = new Set([...words1, ...words2]);

		if (union.size === 0) return 0;

		// Jaccard similarity
		const jaccard = intersection.size / union.size;

		// Boost for exact substring matches
		const originalLower1 = question1.toLowerCase();
		const originalLower2 = question2.toLowerCase();

		let boost = 0;
		if (
			originalLower1.includes(originalLower2) ||
			originalLower2.includes(originalLower1)
		) {
			boost = 0.2;
		}

		return Math.min(1, jaccard + boost);
	}

	/**
	 * Convert PredictionMarket to VenueQuote
	 */
	marketToQuote(market: PredictionMarket, venue: PredictionVenue): VenueQuote {
		// Parse prices - handle different formats
		let yesPrice = 0.5;
		let noPrice = 0.5;

		if (market.outcomePrices) {
			if (typeof market.outcomePrices === "string") {
				try {
					const prices = JSON.parse(market.outcomePrices);
					yesPrice = parseFloat(prices[0]) || 0.5;
					noPrice = parseFloat(prices[1]) || 0.5;
				} catch {
					yesPrice = 0.5;
					noPrice = 0.5;
				}
			} else if (Array.isArray(market.outcomePrices)) {
				yesPrice = parseFloat(String(market.outcomePrices[0])) || 0.5;
				noPrice = parseFloat(String(market.outcomePrices[1])) || 0.5;
			}
		}

		// Handle Kalshi-style prices (in cents)
		if (venue === "kalshi") {
			if (market.yes_bid !== undefined) {
				yesPrice = market.yes_bid / 100;
			}
			if (market.no_bid !== undefined) {
				noPrice = market.no_bid / 100;
			}
		}

		return {
			venue,
			instrumentId: market.id,
			instrumentName: market.question || market.title || market.id,
			yesProbability: yesPrice,
			yesAsk: market.yes_ask ? market.yes_ask / 100 : yesPrice + 0.01,
			yesBid: market.yes_bid ? market.yes_bid / 100 : yesPrice - 0.01,
			noAsk: market.no_ask ? market.no_ask / 100 : noPrice + 0.01,
			noBid: market.no_bid ? market.no_bid / 100 : noPrice - 0.01,
			volume: market.volume || 0,
			liquidity: market.liquidity || 0,
			timestamp: Date.now(),
			raw: market,
		};
	}

	/**
	 * Find matches for a single market across other markets
	 */
	findMatches(
		market: PredictionMarket,
		_venue: PredictionVenue,
		otherMarkets: { market: PredictionMarket; venue: PredictionVenue }[],
	): { match: PredictionMarket; venue: PredictionVenue; similarity: number }[] {
		const question = market.question || market.title || "";
		const normalizedQuestion = this.normalizeQuestion(question);
		const category = this.detectCategory(question);

		const matches: {
			match: PredictionMarket;
			venue: PredictionVenue;
			similarity: number;
		}[] = [];

		for (const other of otherMarkets) {
			const otherQuestion = other.market.question || other.market.title || "";
			const otherNormalized = this.normalizeQuestion(otherQuestion);
			const otherCategory = this.detectCategory(otherQuestion);

			// Skip if category must match and doesn't
			if (this.criteria.categoryMustMatch && category !== otherCategory) {
				continue;
			}

			// Check date difference if both have end dates
			if (market.endDate && other.market.endDate) {
				const date1 = new Date(market.endDate);
				const date2 = new Date(other.market.endDate);
				const daysDiff =
					Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);

				if (daysDiff > this.criteria.maxDateDifferenceDays) {
					continue;
				}
			}

			const similarity = this.calculateSimilarity(
				normalizedQuestion,
				otherNormalized,
			);

			if (similarity >= this.criteria.minSimilarity) {
				matches.push({ match: other.market, venue: other.venue, similarity });
			}
		}

		// Sort by similarity descending
		return matches.sort((a, b) => b.similarity - a.similarity);
	}

	/**
	 * Match all markets from multiple venues
	 */
	matchAllMarkets(
		marketsByVenue: Map<PredictionVenue, PredictionMarket[]>,
	): MatchedEvent[] {
		const matchedEvents: Map<string, MatchedEvent> = new Map();
		const processed: Set<string> = new Set();

		// Flatten all markets with venue info
		const allMarkets: { market: PredictionMarket; venue: PredictionVenue }[] =
			[];
		for (const [venue, markets] of marketsByVenue) {
			for (const market of markets) {
				allMarkets.push({ market, venue });
			}
		}

		// Process each market
		for (const { market, venue } of allMarkets) {
			const marketKey = `${venue}:${market.id}`;
			if (processed.has(marketKey)) continue;

			const question = market.question || market.title || "";
			const normalizedQuestion = this.normalizeQuestion(question);
			const category = this.detectCategory(question);
			const keywords = this.extractKeywords(question);

			// Find matches from other venues
			const otherVenueMarkets = allMarkets.filter((m) => m.venue !== venue);
			const matches = this.findMatches(market, venue, otherVenueMarkets);

			// Create quotes array starting with this market
			const quotes: VenueQuote[] = [this.marketToQuote(market, venue)];
			processed.add(marketKey);

			// Add matched markets
			let highestConfidence = 1.0;
			for (const match of matches) {
				const matchKey = `${match.venue}:${match.match.id}`;
				if (!processed.has(matchKey)) {
					quotes.push(this.marketToQuote(match.match, match.venue));
					processed.add(matchKey);
					highestConfidence = Math.min(highestConfidence, match.similarity);
				}
			}

			// Only create matched event if we have quotes from multiple venues
			// OR if it's a single high-volume market worth tracking
			if (quotes.length > 1 || (market.volume && market.volume > 10000)) {
				const eventId = this.generateEventId(normalizedQuestion, category);

				const matchedEvent: MatchedEvent = {
					id: eventId,
					description: question,
					normalizedQuestion,
					category,
					resolutionDate: market.endDate,
					quotes,
					confidence: quotes.length > 1 ? highestConfidence : 1.0,
					keywords,
				};

				matchedEvents.set(eventId, matchedEvent);
			}
		}

		// Update cache
		for (const [id, event] of matchedEvents) {
			this.eventCache.set(id, event);
		}

		return Array.from(matchedEvents.values());
	}

	/**
	 * Get cached event by ID
	 */
	getEvent(eventId: string): MatchedEvent | undefined {
		return this.eventCache.get(eventId);
	}

	/**
	 * Get all cached events
	 */
	getAllEvents(): MatchedEvent[] {
		return Array.from(this.eventCache.values());
	}

	/**
	 * Get events by category
	 */
	getEventsByCategory(category: MarketCategory): MatchedEvent[] {
		return this.getAllEvents().filter((e) => e.category === category);
	}

	/**
	 * Clear the event cache
	 */
	clearCache(): void {
		this.eventCache.clear();
	}

	/**
	 * Get matcher statistics
	 */
	getStats(): {
		cachedEvents: number;
		byCategory: Record<MarketCategory, number>;
	} {
		const byCategory: Record<MarketCategory, number> = {
			crypto: 0,
			politics: 0,
			sports: 0,
			economics: 0,
			weather: 0,
			entertainment: 0,
			science: 0,
			other: 0,
		};

		for (const event of this.eventCache.values()) {
			byCategory[event.category]++;
		}

		return {
			cachedEvents: this.eventCache.size,
			byCategory,
		};
	}
}

/**
 * Create a new EventMatcher instance
 */
export function createEventMatcher(
	criteria?: Partial<MatchCriteria>,
): EventMatcher {
	return new EventMatcher(criteria);
}

/**
 * Global event matcher instance
 */
export const globalMatcher = new EventMatcher();
