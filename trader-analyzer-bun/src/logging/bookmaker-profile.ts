/**
 * @fileoverview Bookmaker Profile Registry Integration
 * @module logging/bookmaker-profile
 *
 * Integrates endpoint parameter configuration with bookmaker registry.
 * Stores expected parameter counts per endpoint as we profile each bookmaker.
 */

import type {
	BookmakerEndpointConfig,
	EndpointParameterConfig,
	BookmakerProfile,
} from "./types";
import type { SharpBookConfig } from "../orca/sharp-books/types";
import { Database } from "bun:sqlite";

/**
 * Build BookmakerEndpointConfig from bookmaker profile
 */
export function buildEndpointConfig(
	profile: BookmakerProfile,
): BookmakerEndpointConfig {
	return {
		bookmaker: profile.bookmaker,
		endpoints: profile.endpoints,
		defaultThreshold: profile.defaultThreshold || 5,
	};
}

/**
 * Build BookmakerEndpointConfig from SharpBookConfig
 * Extracts endpoint paths and initializes with default expected counts
 */
export function buildEndpointConfigFromSharpBook(
	sharpBook: SharpBookConfig,
): BookmakerEndpointConfig {
	const endpoints = new Map<string, number>();

	// Extract endpoint paths from sharp book config
	if (sharpBook.endpoints.odds) {
		const oddsPath = new URL(sharpBook.endpoints.odds).pathname;
		// Default expected params for odds endpoint: 2 (eventId, format)
		endpoints.set(oddsPath, 2);
	}

	if (sharpBook.endpoints.rest) {
		const restPath = new URL(sharpBook.endpoints.rest).pathname;
		// Default expected params for REST base: 0 (base path)
		endpoints.set(restPath, 0);
	}

	return {
		bookmaker: sharpBook.id,
		endpoints,
		defaultThreshold: 5,
	};
}

/**
 * Update bookmaker profile with endpoint parameter configuration
 */
export function updateBookmakerProfile(
	db: Database,
	profile: BookmakerProfile,
): void {
	// Store in security database bookmaker_registry table
	db.run(
		`
		CREATE TABLE IF NOT EXISTS bookmaker_profiles (
			bookmaker TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			endpoint_config TEXT NOT NULL,
			url_encoding_behavior TEXT,
			last_profiled INTEGER,
			updated_at INTEGER NOT NULL
		)
	`,
	);

	db.run(
		`
		INSERT OR REPLACE INTO bookmaker_profiles (
			bookmaker, name, endpoint_config, url_encoding_behavior, last_profiled, updated_at
		) VALUES (?, ?, ?, ?, ?, ?)
	`,
		[
			profile.bookmaker,
			profile.name,
			JSON.stringify({
				endpoints: Object.fromEntries(profile.endpoints),
				defaultThreshold: profile.defaultThreshold,
			}),
			profile.urlEncodingBehavior
				? JSON.stringify(profile.urlEncodingBehavior)
				: null,
			profile.lastProfiled || Date.now(),
			Date.now(),
		],
	);
}

/**
 * Load bookmaker profile from database
 */
export function loadBookmakerProfile(
	db: Database,
	bookmaker: string,
): BookmakerProfile | null {
	try {
		const row = db
			.query(
				`
			SELECT bookmaker, name, endpoint_config, url_encoding_behavior, last_profiled
			FROM bookmaker_profiles
			WHERE bookmaker = ?1
		`,
			)
			.get(bookmaker) as {
			bookmaker: string;
			name: string;
			endpoint_config: string;
			url_encoding_behavior: string | null;
			last_profiled: number;
		} | null;

		if (!row) return null;

		const endpointConfig = JSON.parse(row.endpoint_config);

		return {
			bookmaker: row.bookmaker,
			name: row.name,
			endpoints: new Map(
				Object.entries(endpointConfig.endpoints) as [string, number][],
			),
			defaultThreshold: endpointConfig.defaultThreshold,
			urlEncodingBehavior: row.url_encoding_behavior
				? JSON.parse(row.url_encoding_behavior)
				: undefined,
			lastProfiled: row.last_profiled,
		};
	} catch {
		return null;
	}
}

/**
 * Profile a bookmaker endpoint and update registry
 * Called during bookmaker discovery/profiling phase
 */
export async function profileBookmakerEndpoint(
	db: Database,
	bookmaker: string,
	endpoint: string,
	expectedParamCount: number,
): Promise<void> {
	// Load existing profile or create new
	let profile = loadBookmakerProfile(db, bookmaker);

	if (!profile) {
		// Create new profile
		profile = {
			bookmaker,
			name: bookmaker,
			endpoints: new Map(),
			defaultThreshold: 5,
		};
	}

	// Update endpoint configuration
	profile.endpoints.set(endpoint, expectedParamCount);
	profile.lastProfiled = Date.now();

	// Save to database
	updateBookmakerProfile(db, profile);
}

/**
 * Get endpoint parameter configuration for CorrectedForensicLogger
 */
export function getEndpointConfigForLogger(
	db: Database,
	bookmaker: string,
): BookmakerEndpointConfig | null {
	const profile = loadBookmakerProfile(db, bookmaker);
	if (!profile) return null;

	return buildEndpointConfig(profile);
}
