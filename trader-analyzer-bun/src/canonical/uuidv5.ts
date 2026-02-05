/**
 * ORCA – The sharpest line in the water.
 * File: src/canonical/uuidv5.ts
 * Runtime: Bun 1.3.3+
 * Canonical IDs: UUIDv5 (namespace 6ba7b810-9dad-11d1-80b4-00c04fd430c8)
 * Zero external deps unless explicitly listed.
 */

// [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;instance-id=ORCA-UUID-001;version=0.1.16}][PROPERTIES:{namespace={value:"00000000-0000-0000-0000-000000000000";@root:"ROOT-ORCA-SHA1";@immutable:true};salt={value:"{bookId}-{home}-{away}-{period}";@root:"ROOT-DETERMINISTIC";@validate:"string-format"}}][CLASS:CanonicalUUID][#REF:v-0.1.16.CANONICAL.UUID.1.0.A.1.1]]

/**
 * Exchange namespaces - IMMUTABLE once generated
 * These are pre-generated UUIDv4s that serve as namespaces for each exchange
 * NEVER change these after deployment - they are the foundation of identity
 */
export const EXCHANGE_NAMESPACES = {
	// Prediction Markets
	polymarket: "1c3f9d8a-2f71-4c9d-9e5f-8b1a2d7e9f3c",
	kalshi: "8e9f2a1b-5d7c-4f3e-9a1b-6c8d3e2f1a0b",
	manifold: "9f1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
	predictit: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",

	// Crypto Exchanges
	bitmex: "3d7e9f1a-8c2b-4d6e-9f1a-7b3c5d8e2f1a",
	binance: "4e8f0a2b-9c3d-5e7f-0a2b-8c4d6e9f1a3b",
	bybit: "5f9a1b3c-0d4e-6f8a-1b3c-9d5e7f0a2b4c",
	okx: "6a0b2c4d-1e5f-7a9b-2c4d-0e6f8a1b3c5d",
	deribit: "7b1c3d5e-2f6a-8b0c-3d5e-1f7a9b2c4d6e",
	kraken: "8c2d4e6f-3a7b-9c1d-4e6f-2a8b0c3d5e7f",

	// Sports Betting
	pinnacle: "9d3e5f7a-4b8c-0d2e-5f7a-3b9c1d4e6f8a",
	draftkings: "0e4f6a8b-5c9d-1e3f-6a8b-4c0d2e5f7a9b",
	fanduel: "1f5a7b9c-6d0e-2f4a-7b9c-5d1e3f6a8b0c",
	betmgm: "2a6b8c0d-7e1f-3a5b-8c0d-6e2f4a7b9c1d",
	caesars: "3b7c9d1e-8f2a-4b6c-9d1e-7f3a5b8c0d2e",
	bet365: "4c8d0e2f-9a3b-5c7d-0e2f-8a4b6c9d1e3f",

	// ORCA Internal
	orca: "5d9e1f3a-0b4c-6d8e-1f3a-9b5c7d0e2f4a",
} as const;

export type ExchangeName = keyof typeof EXCHANGE_NAMESPACES;

/**
 * Generate RFC 4122 compliant UUIDv5 using Bun.randomUUIDv5
 *
 * @param name - The name to hash (e.g., "USElectionWinner2024")
 * @param namespace - The namespace UUID (from EXCHANGE_NAMESPACES)
 * @returns Deterministic UUID string
 *
 * @example
 * ```ts
 * const uuid = uuidv5("USElectionWinner2024", EXCHANGE_NAMESPACES.polymarket);
 * // Always returns the same UUID for the same name+namespace
 * ```
 */
export function uuidv5(name: string, namespace: string): string {
	return Bun.randomUUIDv5(name, namespace);
}

/**
 * Generate canonical UUID for an exchange market
 *
 * @param exchange - Exchange name (must be in EXCHANGE_NAMESPACES)
 * @param marketId - Market identifier on the exchange
 * @returns Deterministic UUID
 *
 * @example
 * ```ts
 * const uuid = canonicalUUID("polymarket", "USElectionWinner2024");
 * ```
 */
export function canonicalUUID(
	exchange: ExchangeName,
	marketId: string,
): string {
	const namespace = EXCHANGE_NAMESPACES[exchange];
	if (!namespace) {
		throw new Error(`Unknown exchange: ${exchange}`);
	}
	return uuidv5(`${exchange}:${marketId}`, namespace);
}

/**
 * Parse a slug into exchange and marketId
 *
 * @param slug - Format: "exchange:marketId"
 * @returns Parsed components
 */
export function parseSlug(slug: string): {
	exchange: ExchangeName;
	marketId: string;
} {
	const colonIndex = slug.indexOf(":");
	if (colonIndex === -1) {
		throw new Error(
			`Invalid slug format: ${slug}. Expected "exchange:marketId"`,
		);
	}

	const exchange = slug.substring(0, colonIndex) as ExchangeName;
	const marketId = slug.substring(colonIndex + 1);

	if (!EXCHANGE_NAMESPACES[exchange]) {
		throw new Error(`Unknown exchange in slug: ${exchange}`);
	}

	return { exchange, marketId };
}

/**
 * Generate canonical UUID from slug
 *
 * @param slug - Format: "exchange:marketId"
 * @returns Deterministic UUID
 *
 * @example
 * ```ts
 * const uuid = slugToUUID("polymarket:USElectionWinner2024");
 * ```
 */
export function slugToUUID(slug: string): string {
	const { exchange, marketId } = parseSlug(slug);
	return canonicalUUID(exchange, marketId);
}

/**
 * Validate if a string is a valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

/**
 * Get all registered exchanges
 */
export function getRegisteredExchanges(): ExchangeName[] {
	return Object.keys(EXCHANGE_NAMESPACES) as ExchangeName[];
}
