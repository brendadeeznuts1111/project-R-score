/**
 * @fileoverview Alias registry for cross-bookmaker name resolution
 * @module orca/aliases/registry
 */

import type { OrcaBookmaker, OrcaSport } from "../../types";
import { type FuzzyMatchResult, fuzzyMatch, isSameEntity } from "../matching";
import { generateLeagueId, generateTeamId } from "../namespace";
import type { OrcaStorage } from "../storage/sqlite";

/**
 * Alias types for registry
 */
export type AliasType = "team" | "league" | "sport" | "market";

/**
 * Alias entry with metadata
 */
export interface AliasEntry {
	canonical: string;
	canonicalId: string;
	sport?: OrcaSport;
	league?: string;
	confidence: number;
}

/**
 * Fuzzy lookup result with match confidence
 */
export interface FuzzyLookupResult extends AliasEntry {
	matchScore: number;
	matchMethod: string;
}

/**
 * AliasRegistry - Central lookup for bookmaker-specific naming variations
 *
 * Maps bookmaker-specific names to canonical identifiers using the pattern:
 * "{bookmaker}:{normalized_alias}" -> canonical entry
 *
 * Optionally persists to SQLite for durability across restarts
 */
export class AliasRegistry {
	private teamAliases = new Map<string, AliasEntry>();
	private leagueAliases = new Map<string, AliasEntry>();
	private sportAliases = new Map<string, AliasEntry>();
	private storage: OrcaStorage | null = null;

	/**
	 * Enable SQLite persistence
	 */
	setStorage(storage: OrcaStorage): void {
		this.storage = storage;
	}

	/**
	 * Generates registry key from bookmaker and alias
	 */
	private makeKey(bookmaker: string, alias: string): string {
		return `${bookmaker.toLowerCase()}:${alias.toLowerCase().trim()}`;
	}

	/**
	 * Registers a team alias
	 */
	registerTeam(
		bookmaker: OrcaBookmaker,
		alias: string,
		canonical: string,
		sport: OrcaSport,
		league: string,
		confidence = 1.0,
	): void {
		const key = this.makeKey(bookmaker, alias);
		const canonicalId = generateTeamId(sport, league, canonical);
		this.teamAliases.set(key, {
			canonical,
			canonicalId,
			sport,
			league,
			confidence,
		});

		// Persist to SQLite if enabled
		if (this.storage) {
			this.storage.addTeamAlias(
				bookmaker,
				alias,
				canonical,
				sport,
				league,
				confidence,
			);
		}
	}

	/**
	 * Registers a league alias
	 */
	registerLeague(
		bookmaker: OrcaBookmaker,
		alias: string,
		canonical: string,
		sport: OrcaSport,
		confidence = 1.0,
	): void {
		const key = this.makeKey(bookmaker, alias);
		const canonicalId = generateLeagueId(sport, canonical);
		this.leagueAliases.set(key, {
			canonical,
			canonicalId,
			sport,
			confidence,
		});
	}

	/**
	 * Registers a sport alias
	 */
	registerSport(
		bookmaker: OrcaBookmaker,
		alias: string,
		canonical: OrcaSport,
		confidence = 1.0,
	): void {
		const key = this.makeKey(bookmaker, alias);
		this.sportAliases.set(key, {
			canonical,
			canonicalId: canonical, // Sport uses the enum value as ID
			confidence,
		});

		// Persist to SQLite if enabled
		if (this.storage) {
			this.storage.addSportAlias(bookmaker, alias, canonical);
		}
	}

	/**
	 * Looks up a team by bookmaker and name (exact match)
	 */
	lookupTeam(bookmaker: OrcaBookmaker, name: string): AliasEntry | null {
		const key = this.makeKey(bookmaker, name);
		return this.teamAliases.get(key) || null;
	}

	/**
	 * Fuzzy lookup for teams when exact match fails
	 * Returns best match above threshold
	 */
	fuzzyLookupTeam(
		bookmaker: OrcaBookmaker,
		name: string,
		threshold = 0.75,
	): FuzzyLookupResult | null {
		// First try exact match
		const exact = this.lookupTeam(bookmaker, name);
		if (exact) {
			return { ...exact, matchScore: 1.0, matchMethod: "exact" };
		}

		// Get all teams for this bookmaker
		const prefix = `${bookmaker.toLowerCase()}:`;
		const candidates: { alias: string; entry: AliasEntry }[] = [];

		for (const [key, entry] of this.teamAliases) {
			if (key.startsWith(prefix)) {
				const alias = key.substring(prefix.length);
				candidates.push({ alias, entry });
			}
		}

		if (candidates.length === 0) return null;

		// Fuzzy match against aliases
		const match = fuzzyMatch(
			name,
			candidates.map((c) => c.alias),
			threshold,
		);

		if (!match) return null;

		// Find the matching entry
		const matched = candidates.find(
			(c) => c.alias.toLowerCase() === match.match.toLowerCase(),
		);

		if (!matched) return null;

		return {
			...matched.entry,
			matchScore: match.score,
			matchMethod: match.method,
		};
	}

	/**
	 * Smart lookup - tries exact first, then fuzzy
	 */
	smartLookupTeam(
		bookmaker: OrcaBookmaker,
		name: string,
		fuzzyThreshold = 0.75,
	): FuzzyLookupResult | null {
		// Try exact match first (faster)
		const exact = this.lookupTeam(bookmaker, name);
		if (exact) {
			return { ...exact, matchScore: 1.0, matchMethod: "exact" };
		}

		// Fall back to fuzzy matching
		return this.fuzzyLookupTeam(bookmaker, name, fuzzyThreshold);
	}

	/**
	 * Looks up a league by bookmaker and name
	 */
	lookupLeague(bookmaker: OrcaBookmaker, name: string): AliasEntry | null {
		const key = this.makeKey(bookmaker, name);
		return this.leagueAliases.get(key) || null;
	}

	/**
	 * Looks up a sport by bookmaker and name
	 */
	lookupSport(bookmaker: OrcaBookmaker, name: string): AliasEntry | null {
		const key = this.makeKey(bookmaker, name);
		return this.sportAliases.get(key) || null;
	}

	/**
	 * Bulk loads team aliases for a bookmaker
	 */
	loadTeamAliases(
		bookmaker: OrcaBookmaker,
		sport: OrcaSport,
		league: string,
		aliases: Record<string, string[]>,
	): void {
		for (const [canonical, aliasList] of Object.entries(aliases)) {
			for (const alias of aliasList) {
				this.registerTeam(bookmaker, alias, canonical, sport, league);
			}
			// Also register the canonical name itself
			this.registerTeam(bookmaker, canonical, canonical, sport, league);
		}
	}

	/**
	 * Bulk loads sport aliases for a bookmaker
	 */
	loadSportAliases(
		bookmaker: OrcaBookmaker,
		aliases: Record<OrcaSport, string[]>,
	): void {
		for (const [canonical, aliasList] of Object.entries(aliases)) {
			for (const alias of aliasList) {
				this.registerSport(bookmaker, alias, canonical as OrcaSport);
			}
			// Also register the canonical name itself
			this.registerSport(bookmaker, canonical, canonical as OrcaSport);
		}
	}

	/**
	 * Gets all registered teams for a bookmaker and sport
	 */
	getTeamsForSport(bookmaker: OrcaBookmaker, sport: OrcaSport): AliasEntry[] {
		const results: AliasEntry[] = [];
		const seen = new Set<string>();

		for (const [key, entry] of this.teamAliases) {
			if (key.startsWith(`${bookmaker}:`) && entry.sport === sport) {
				if (!seen.has(entry.canonicalId)) {
					seen.add(entry.canonicalId);
					results.push(entry);
				}
			}
		}

		return results;
	}

	/**
	 * Gets registry statistics
	 */
	getStats(): { teams: number; leagues: number; sports: number } {
		return {
			teams: this.teamAliases.size,
			leagues: this.leagueAliases.size,
			sports: this.sportAliases.size,
		};
	}

	/**
	 * Clears all aliases (useful for testing)
	 */
	clear(): void {
		this.teamAliases.clear();
		this.leagueAliases.clear();
		this.sportAliases.clear();
	}

	/**
	 * Load team aliases from SQLite storage (on startup)
	 */
	loadFromStorage(): number {
		if (!this.storage) return 0;

		const loaded = 0;
		// Note: This would require adding a getAllAliases method to storage
		// For now, storage is write-through only - aliases loaded from static files
		// and persisted for future recovery/export
		return loaded;
	}

	/**
	 * Get storage reference
	 */
	getStorage(): OrcaStorage | null {
		return this.storage;
	}
}

/**
 * Global registry instance
 */
export const globalRegistry = new AliasRegistry();
