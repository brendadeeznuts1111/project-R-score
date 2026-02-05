/**
 * @fileoverview Bookmaker Market UUID Generator
 * @description Deterministic UUIDv5 generation for bookmaker markets using ORCA namespace
 * @module orca/aliases/bookmakers/uuid
 */

import { generateOrcaId, ORCA_NAMESPACE } from "../../namespace";

/**
 * Market identifier for UUID generation
 */
export interface MarketIdentifier {
	bookId: string;
	home: string;
	away: string;
	period: number | string;
}

/**
 * Bookmaker UUID Generator
 * Generates deterministic UUIDv5 for bookmaker markets using ORCA namespace
 */
export class BookmakerUUIDGenerator {
	private static readonly NAMESPACE = ORCA_NAMESPACE;

	/**
	 * Generate salt string from market identifier
	 * Format: {bookId}-{home}-{away}-{period}
	 */
	static generateSalt(identifier: MarketIdentifier): string {
		return `${identifier.bookId}-${identifier.home}-${identifier.away}-${identifier.period}`;
	}

	/**
	 * Generate UUID from market identifier
	 */
	static generate(identifier: MarketIdentifier | string): string {
		const salt =
			typeof identifier === "string"
				? identifier
				: BookmakerUUIDGenerator.generateSalt(identifier);
		return generateOrcaId(salt);
	}

	/**
	 * Validate UUID format
	 */
	static validateUUID(uuid: string): boolean {
		const regex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return regex.test(uuid);
	}
}

/**
 * Generate market UUID from bookmaker identifier
 *
 * @param bookId - Bookmaker-specific market ID
 * @param home - Home team name
 * @param away - Away team name
 * @param period - Period identifier (0 for full game, 1 for first half, etc.)
 * @returns Deterministic UUIDv5
 *
 * @example
 * ```ts
 * const uuid = generateMarketUUID('betfair-12345', 'Arsenal', 'Chelsea', 0);
 * // Always returns the same UUID for the same inputs
 * ```
 */
export function generateMarketUUID(
	bookId: string,
	home: string,
	away: string,
	period: number | string,
): string {
	return BookmakerUUIDGenerator.generate({ bookId, home, away, period });
}
