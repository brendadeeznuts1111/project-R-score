/**
 * @fileoverview ORCA Normalizer - Main normalization service
 * @description Transforms raw bookmaker data to canonical ORCA identifiers
 * @module orca/normalizer
 */

import type {
	OrcaBookmaker,
	OrcaEvent,
	OrcaMarket,
	OrcaMarketType,
	OrcaNormalizedOutput,
	OrcaPeriod,
	OrcaRawInput,
	OrcaSelection,
	OrcaSport,
	Result,
} from "../types";
import { loadAllBookmakerAliases } from "./aliases/bookmakers";

import { type AliasRegistry, globalRegistry } from "./aliases/registry";
import {
	generateEventId,
	generateLeagueId,
	generateMarketId,
	generateSelectionId,
	generateTeamId,
} from "./namespace";
import { getLeague, resolveLeague } from "./taxonomy/league";
import { resolveMarketType, resolvePeriod } from "./taxonomy/market";
import { resolveSport } from "./taxonomy/sport";

/**
 * Normalization result with confidence scoring
 */
export interface NormalizationResult {
	success: boolean;
	data?: OrcaNormalizedOutput;
	error?: string;
	warnings: string[];
}

/**
 * OrcaNormalizer - Transforms raw bookmaker data to canonical identifiers
 *
 * Uses UUIDv5 to generate deterministic IDs that are identical across bookmakers
 * for the same underlying event/market/selection.
 */
export class OrcaNormalizer {
	private registry: AliasRegistry;
	private initialized = false;

	constructor(registry?: AliasRegistry) {
		this.registry = registry || globalRegistry;
	}

	/**
	 * Initializes the normalizer with all bookmaker aliases
	 */
	initialize(): void {
		if (this.initialized) return;
		loadAllBookmakerAliases(this.registry);
		this.initialized = true;
	}

	/**
	 * Normalizes raw bookmaker input to canonical ORCA format
	 */
	normalize(input: OrcaRawInput): Result<OrcaNormalizedOutput> {
		this.initialize();

		const warnings: string[] = [];
		let confidence = 1.0;

		// 1. Resolve sport
		const sport = this.resolveSportFromInput(input);
		if (!sport) {
			return {
				ok: false,
				error: new Error(`Unknown sport: ${input.sport}`),
			};
		}

		// 2. Resolve league
		const leagueKey = resolveLeague(input.league);
		const league = leagueKey ? getLeague(leagueKey) : null;
		const leagueId = league?.id || generateLeagueId(sport, input.league);

		if (!league) {
			warnings.push(`Unknown league: ${input.league}, using raw value`);
			confidence *= 0.9;
		}

		// 3. Resolve teams
		const homeTeam = this.resolveTeam(
			input.bookmaker,
			input.homeTeam,
			sport,
			leagueKey || input.league,
		);
		const awayTeam = this.resolveTeam(
			input.bookmaker,
			input.awayTeam,
			sport,
			leagueKey || input.league,
		);

		if (!homeTeam.canonical) {
			warnings.push(`Unknown home team: ${input.homeTeam}`);
			confidence *= 0.85;
		} else if (homeTeam.matchMethod && homeTeam.matchMethod !== "exact") {
			// Fuzzy matched - adjust confidence based on match score
			warnings.push(
				`Fuzzy matched home team: ${input.homeTeam} → ${homeTeam.canonical} (${homeTeam.matchMethod}: ${(homeTeam.matchScore! * 100).toFixed(1)}%)`,
			);
			confidence *= homeTeam.matchScore || 0.85;
		}

		if (!awayTeam.canonical) {
			warnings.push(`Unknown away team: ${input.awayTeam}`);
			confidence *= 0.85;
		} else if (awayTeam.matchMethod && awayTeam.matchMethod !== "exact") {
			// Fuzzy matched - adjust confidence based on match score
			warnings.push(
				`Fuzzy matched away team: ${input.awayTeam} → ${awayTeam.canonical} (${awayTeam.matchMethod}: ${(awayTeam.matchScore! * 100).toFixed(1)}%)`,
			);
			confidence *= awayTeam.matchScore || 0.85;
		}

		// 4. Generate event ID
		const eventId = generateEventId(
			sport,
			homeTeam.canonical || input.homeTeam,
			awayTeam.canonical || input.awayTeam,
			input.startTime,
		);

		// 5. Resolve market type
		const marketType = resolveMarketType(input.marketType);
		if (!marketType) {
			return {
				ok: false,
				error: new Error(`Unknown market type: ${input.marketType}`),
			};
		}

		// 6. Resolve period
		const period = resolvePeriod(input.period);

		// 7. Generate market ID
		const marketId = generateMarketId(eventId, marketType, period, input.line);

		// 8. Resolve selection type
		const selectionType = this.resolveSelectionType(
			input.selection,
			marketType,
			homeTeam.canonical,
			awayTeam.canonical,
		);

		// 9. Generate selection ID
		const selectionId = generateSelectionId(
			marketId,
			selectionType,
			input.line,
		);

		// Build output
		const event: OrcaEvent = {
			id: eventId,
			sport,
			leagueId,
			leagueName: league?.name || input.league,
			homeTeamId: homeTeam.id,
			homeTeamName: homeTeam.canonical || input.homeTeam,
			awayTeamId: awayTeam.id,
			awayTeamName: awayTeam.canonical || input.awayTeam,
			startTime: input.startTime,
			status: "scheduled",
		};

		const market: OrcaMarket = {
			id: marketId,
			eventId,
			type: marketType,
			period,
			line: input.line,
		};

		const selection: OrcaSelection = {
			id: selectionId,
			marketId,
			name: input.selection,
			type: selectionType,
			line: input.line,
		};

		return {
			ok: true,
			data: {
				event,
				market,
				selection,
				confidence,
				warnings,
			},
		};
	}

	/**
	 * Batch normalize multiple inputs
	 */
	normalizeBatch(inputs: OrcaRawInput[]): Result<OrcaNormalizedOutput>[] {
		return inputs.map((input) => this.normalize(input));
	}

	/**
	 * Gets just the event ID for given parameters
	 */
	getEventId(
		sport: OrcaSport,
		homeTeam: string,
		awayTeam: string,
		startTime: string,
	): string {
		return generateEventId(sport, homeTeam, awayTeam, startTime);
	}

	/**
	 * Gets just the market ID for given parameters
	 */
	getMarketId(
		eventId: string,
		type: OrcaMarketType,
		period: OrcaPeriod,
		line?: number,
	): string {
		return generateMarketId(eventId, type, period, line);
	}

	/**
	 * Gets just the selection ID for given parameters
	 */
	getSelectionId(marketId: string, selection: string, line?: number): string {
		return generateSelectionId(marketId, selection, line);
	}

	/**
	 * Looks up a team by bookmaker and name
	 */
	lookupTeam(
		bookmaker: OrcaBookmaker,
		name: string,
	): { canonical: string; id: string } | null {
		this.initialize();
		const entry = this.registry.lookupTeam(bookmaker, name);
		if (!entry) return null;
		return { canonical: entry.canonical, id: entry.canonicalId };
	}

	/**
	 * Gets registry statistics
	 */
	getStats(): { teams: number; leagues: number; sports: number } {
		return this.registry.getStats();
	}

	/**
	 * Resolves sport from input, checking registry first
	 */
	private resolveSportFromInput(input: OrcaRawInput): OrcaSport | null {
		// Try registry lookup first
		const registryEntry = this.registry.lookupSport(
			input.bookmaker,
			input.sport,
		);
		if (registryEntry) {
			return registryEntry.canonical as OrcaSport;
		}

		// Fall back to taxonomy resolution
		return resolveSport(input.sport);
	}

	/**
	 * Resolves team from input with fuzzy matching fallback
	 */
	private resolveTeam(
		bookmaker: OrcaBookmaker,
		teamName: string,
		sport: OrcaSport,
		league: string,
	): {
		canonical: string | null;
		id: string;
		matchScore?: number;
		matchMethod?: string;
	} {
		// Try smart lookup (exact first, then fuzzy)
		const entry = this.registry.smartLookupTeam(bookmaker, teamName, 0.75);
		if (entry) {
			return {
				canonical: entry.canonical,
				id: entry.canonicalId,
				matchScore: entry.matchScore,
				matchMethod: entry.matchMethod,
			};
		}

		// Generate ID from raw name if not found
		return {
			canonical: null,
			id: generateTeamId(sport, league, teamName),
		};
	}

	/**
	 * Resolves selection type based on context
	 */
	private resolveSelectionType(
		selection: string,
		marketType: OrcaMarketType,
		homeTeam: string | null,
		awayTeam: string | null,
	): "home" | "away" | "over" | "under" | "draw" {
		const normalized = selection.toLowerCase();

		// Check for over/under
		if (normalized.includes("over") || normalized.startsWith("o ")) {
			return "over";
		}
		if (normalized.includes("under") || normalized.startsWith("u ")) {
			return "under";
		}

		// Check for draw
		if (normalized === "draw" || normalized === "x" || normalized === "tie") {
			return "draw";
		}

		// Check for team matches
		if (homeTeam && normalized.includes(homeTeam.toLowerCase())) {
			return "home";
		}
		if (awayTeam && normalized.includes(awayTeam.toLowerCase())) {
			return "away";
		}

		// Default based on market type
		if (marketType === "total") {
			return "over"; // Default for totals
		}

		return "home"; // Default fallback
	}
}

/**
 * Global normalizer instance
 */
export const globalNormalizer = new OrcaNormalizer();

/**
 * Factory function to create a new normalizer
 */
export function createOrcaNormalizer(registry?: AliasRegistry): OrcaNormalizer {
	const normalizer = new OrcaNormalizer(registry);
	normalizer.initialize();
	return normalizer;
}
