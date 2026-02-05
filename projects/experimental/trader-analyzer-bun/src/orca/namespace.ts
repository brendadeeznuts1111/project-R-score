/**
 * ORCA – The sharpest line in the water.
 * File: src/orca/namespace.ts
 * Runtime: Bun 1.3.3+
 * Canonical IDs: UUIDv5 (namespace 6ba7b810-9dad-11d1-80b4-00c04fd430c8)
 * Zero external deps unless explicitly listed.
 */

// [[TECH][MODULE][INSTANCE][META:{blueprint=BP-CANONICAL-UUID@0.1.16;instance-id=ORCA-NAMESPACE-001;version=0.1.16}][PROPERTIES:{namespace={value:"6ba7b810-9dad-11d1-80b4-00c04fd430c8";@root:"ROOT-ORCA-SHA1";@immutable:true}}][CLASS:OrcaNamespace][#REF:v-0.1.16.CANONICAL.UUID.1.0.A.1.1.ORCA.1.1]]

/**
 * ORCA namespace UUID for UUIDv5 generation
 * Using DNS namespace as base for deterministic sports market IDs
 */
export const ORCA_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/**
 * Generates UUIDv5 using Bun.randomUUIDv5
 *
 * @param name - The name to hash
 * @param namespace - Namespace UUID string (defaults to ORCA_NAMESPACE)
 * @returns UUIDv5 string
 */
function generateUUIDv5(
	name: string,
	namespace: string = ORCA_NAMESPACE,
): string {
	return Bun.randomUUIDv5(name, namespace);
}

/**
 * Generates deterministic UUIDv5 from a key string
 *
 * @param key - The canonical key to hash
 * @returns Deterministic UUID string
 *
 * @example
 * const id = generateOrcaId('nba-los-angeles-lakers-boston-celtics-2025-01-15');
 * // Always produces same UUID for same input
 */
export function generateOrcaId(key: string): string {
	return generateUUIDv5(key, ORCA_NAMESPACE);
}

/**
 * Normalizes a string for use in key generation
 * - Lowercase
 * - Trim whitespace
 * - Replace multiple spaces with single space
 * - Remove special characters except hyphen
 *
 * @param str - Raw string to normalize
 * @returns Normalized string
 */
export function normalizeKeyString(str: string): string {
	return str
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ")
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s/g, "-");
}

/**
 * Builds canonical event key for UUIDv5 generation
 *
 * Format: {sport}-{home}-{away}-{date}
 *
 * @param sport - Canonical sport identifier
 * @param home - Canonical home team name
 * @param away - Canonical away team name
 * @param startTime - ISO 8601 datetime string
 * @returns Canonical event key
 *
 * @example
 * buildEventKey('NBA', 'Los Angeles Lakers', 'Boston Celtics', '2025-01-15T19:30:00Z')
 * // Returns: 'nba-los-angeles-lakers-boston-celtics-2025-01-15'
 */
export function buildEventKey(
	sport: string,
	home: string,
	away: string,
	startTime: string,
): string {
	const date = startTime.split("T")[0];
	return `${normalizeKeyString(sport)}-${normalizeKeyString(home)}-${normalizeKeyString(away)}-${date}`;
}

/**
 * Builds canonical market key for UUIDv5 generation
 *
 * Format: {eventId}-{type}-{period}[-{line}]
 *
 * @param eventId - Parent event UUID
 * @param type - Market type (spread, moneyline, total, etc.)
 * @param period - Game period (full, h1, q1, etc.)
 * @param line - Optional line value (e.g., -3.5 for spread)
 * @returns Canonical market key
 *
 * @example
 * buildMarketKey('abc-123', 'spread', 'full', -3.5)
 * // Returns: 'abc-123-spread-full--3.5'
 */
export function buildMarketKey(
	eventId: string,
	type: string,
	period: string,
	line?: number,
): string {
	const base = `${eventId}-${normalizeKeyString(type)}-${normalizeKeyString(period)}`;
	return line !== undefined ? `${base}-${line}` : base;
}

/**
 * Builds canonical selection key for UUIDv5 generation
 *
 * Format: {marketId}-{selection}[-{line}]
 *
 * @param marketId - Parent market UUID
 * @param selection - Selection name (home, away, over, under, etc.)
 * @param line - Optional line value
 * @returns Canonical selection key
 *
 * @example
 * buildSelectionKey('xyz-789', 'home', -3.5)
 * // Returns: 'xyz-789-home--3.5'
 */
export function buildSelectionKey(
	marketId: string,
	selection: string,
	line?: number,
): string {
	const base = `${marketId}-${normalizeKeyString(selection)}`;
	return line !== undefined ? `${base}-${line}` : base;
}

/**
 * Builds canonical team key for UUIDv5 generation
 *
 * Format: team-{sport}-{league}-{name}
 *
 * @param sport - Sport identifier
 * @param league - League identifier
 * @param name - Canonical team name
 * @returns Canonical team key
 */
export function buildTeamKey(
	sport: string,
	league: string,
	name: string,
): string {
	return `team-${normalizeKeyString(sport)}-${normalizeKeyString(league)}-${normalizeKeyString(name)}`;
}

/**
 * Builds canonical league key for UUIDv5 generation
 *
 * Format: league-{sport}-{name}
 *
 * @param sport - Sport identifier
 * @param name - League name
 * @returns Canonical league key
 */
export function buildLeagueKey(sport: string, name: string): string {
	return `league-${normalizeKeyString(sport)}-${normalizeKeyString(name)}`;
}

/**
 * Generates event ID from canonical components
 */
export function generateEventId(
	sport: string,
	home: string,
	away: string,
	startTime: string,
): string {
	const key = buildEventKey(sport, home, away, startTime);
	return generateOrcaId(key);
}

/**
 * Generates market ID from canonical components
 */
export function generateMarketId(
	eventId: string,
	type: string,
	period: string,
	line?: number,
): string {
	const key = buildMarketKey(eventId, type, period, line);
	return generateOrcaId(key);
}

/**
 * Generates selection ID from canonical components
 */
export function generateSelectionId(
	marketId: string,
	selection: string,
	line?: number,
): string {
	const key = buildSelectionKey(marketId, selection, line);
	return generateOrcaId(key);
}

/**
 * Generates team ID from canonical components
 */
export function generateTeamId(
	sport: string,
	league: string,
	name: string,
): string {
	const key = buildTeamKey(sport, league, name);
	return generateOrcaId(key);
}

/**
 * Generates league ID from canonical components
 */
export function generateLeagueId(sport: string, name: string): string {
	const key = buildLeagueKey(sport, name);
	return generateOrcaId(key);
}

// ============ Cache for Performance ============

const idCache = new Map<string, string>();
const MAX_CACHE_SIZE = 10000;

/**
 * Cached version of generateOrcaId for frequently used keys
 */
export function generateOrcaIdCached(key: string): string {
	const cached = idCache.get(key);
	if (cached) return cached;

	const id = generateOrcaId(key);

	// Enforce cache limit with simple eviction
	if (idCache.size >= MAX_CACHE_SIZE) {
		const firstKey = idCache.keys().next().value;
		if (firstKey) idCache.delete(firstKey);
	}

	idCache.set(key, id);
	return id;
}

/**
 * Clear the ID cache
 */
export function clearIdCache(): void {
	idCache.clear();
}

/**
 * Get cache statistics
 */
export function getIdCacheStats(): { size: number; maxSize: number } {
	return { size: idCache.size, maxSize: MAX_CACHE_SIZE };
}

// ============ Batch Operations ============

/**
 * Generate multiple IDs in batch (more efficient for large sets)
 */
export function generateOrcaIdBatch(keys: string[]): Map<string, string> {
	const results = new Map<string, string>();
	for (const key of keys) {
		results.set(key, generateOrcaIdCached(key));
	}
	return results;
}

// ============ Validation ============

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate that a string is a valid UUIDv5
 */
export function isValidOrcaId(id: string): boolean {
	return UUID_REGEX.test(id);
}

// ============ Namespace Generation ============

/**
 * Generate a custom namespace for a domain
 * Uses DNS namespace as base (RFC 4122)
 */
export function generateNamespace(domain: string): string {
	const DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
	return generateUUIDv5(domain, DNS_NAMESPACE);
}

/**
 * Generate ID with a custom namespace
 */
export function generateIdWithNamespace(
	namespace: string,
	key: string,
): string {
	return generateUUIDv5(key, namespace);
}
