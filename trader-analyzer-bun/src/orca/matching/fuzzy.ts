/**
 * @fileoverview Fuzzy String Matching
 * @description Bun-native fuzzy matching for cross-bookmaker name resolution
 * @module orca/matching/fuzzy
 */

/**
 * Calculate Levenshtein distance between two strings
 * Uses optimized DP with single row (O(m) space instead of O(n*m))
 */
export function levenshteinDistance(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	// Ensure a is the shorter string for space optimization
	if (a.length > b.length) {
		[a, b] = [b, a];
	}

	const m = a.length;
	const n = b.length;
	let prev = new Uint16Array(m + 1);
	let curr = new Uint16Array(m + 1);

	// Initialize first row
	for (let i = 0; i <= m; i++) {
		prev[i] = i;
	}

	for (let j = 1; j <= n; j++) {
		curr[0] = j;
		for (let i = 1; i <= m; i++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[i] = Math.min(
				prev[i] + 1, // deletion
				curr[i - 1] + 1, // insertion
				prev[i - 1] + cost, // substitution
			);
		}
		[prev, curr] = [curr, prev];
	}

	return prev[m];
}

/**
 * Calculate normalized similarity (0-1) using Levenshtein
 */
export function levenshteinSimilarity(a: string, b: string): number {
	const maxLen = Math.max(a.length, b.length);
	if (maxLen === 0) return 1;
	return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Jaro similarity algorithm
 * Better for short strings and transpositions
 */
export function jaroSimilarity(a: string, b: string): number {
	if (a === b) return 1;
	if (a.length === 0 || b.length === 0) return 0;

	const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
	const aMatches = new Array(a.length).fill(false);
	const bMatches = new Array(b.length).fill(false);

	let matches = 0;
	let transpositions = 0;

	// Find matching characters
	for (let i = 0; i < a.length; i++) {
		const start = Math.max(0, i - matchWindow);
		const end = Math.min(i + matchWindow + 1, b.length);

		for (let j = start; j < end; j++) {
			if (bMatches[j] || a[i] !== b[j]) continue;
			aMatches[i] = bMatches[j] = true;
			matches++;
			break;
		}
	}

	if (matches === 0) return 0;

	// Count transpositions
	let k = 0;
	for (let i = 0; i < a.length; i++) {
		if (!aMatches[i]) continue;
		while (!bMatches[k]) k++;
		if (a[i] !== b[k]) transpositions++;
		k++;
	}

	return (
		(matches / a.length +
			matches / b.length +
			(matches - transpositions / 2) / matches) /
		3
	);
}

/**
 * Jaro-Winkler similarity (boosts prefix matches)
 */
export function jaroWinklerSimilarity(
	a: string,
	b: string,
	prefixScale = 0.1,
): number {
	const jaro = jaroSimilarity(a, b);

	// Find common prefix length (up to 4)
	let prefix = 0;
	const maxPrefix = Math.min(4, Math.min(a.length, b.length));
	for (let i = 0; i < maxPrefix; i++) {
		if (a[i] === b[i]) prefix++;
		else break;
	}

	return jaro + prefix * prefixScale * (1 - jaro);
}

/**
 * Token-based similarity using Jaccard index
 * Good for team names that might be in different orders
 */
export function tokenSimilarity(a: string, b: string): number {
	const tokensA = new Set(tokenize(a));
	const tokensB = new Set(tokenize(b));

	if (tokensA.size === 0 && tokensB.size === 0) return 1;
	if (tokensA.size === 0 || tokensB.size === 0) return 0;

	let intersection = 0;
	for (const token of tokensA) {
		if (tokensB.has(token)) intersection++;
	}

	const union = tokensA.size + tokensB.size - intersection;
	return intersection / union;
}

/**
 * Tokenize a string into meaningful parts
 */
export function tokenize(s: string): string[] {
	return s
		.toLowerCase()
		.replace(/[^\w\s]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

/**
 * Common words to ignore in team names
 */
const STOP_WORDS = new Set([
	"the",
	"fc",
	"cf",
	"sc",
	"ac",
	"bc",
	"de",
	"la",
	"los",
	"las",
	"city",
	"united",
	"athletic",
	"sporting",
	"real",
]);

/**
 * Abbreviation expansion map
 */
const ABBREVIATIONS: Record<string, string[]> = {
	// US Cities (longer abbreviations first to avoid conflicts)
	nyc: ["new york city", "new york"],
	ny: ["new york"],
	la: ["los angeles"],
	sf: ["san francisco"],
	phi: ["philadelphia"],
	bos: ["boston"],
	chi: ["chicago"],
	mia: ["miami"],
	dal: ["dallas"],
	hou: ["houston"],
	atl: ["atlanta"],
	den: ["denver"],
	pho: ["phoenix"],
	sea: ["seattle"],
	min: ["minnesota"],
	det: ["detroit"],
	cle: ["cleveland"],
	mil: ["milwaukee"],
	tb: ["tampa bay"],
	okc: ["oklahoma city"],
	por: ["portland"],
	sac: ["sacramento"],
	cha: ["charlotte"],
	ind: ["indiana", "indianapolis"],
	orl: ["orlando"],
	mem: ["memphis"],
	no: ["new orleans"],
	nop: ["new orleans"],
	uta: ["utah"],
	was: ["washington"],
	wsh: ["washington"],
	tor: ["toronto"],
	bkn: ["brooklyn"],
	gsw: ["golden state"],
	sas: ["san antonio"],

	// UK (avoid short abbreviations that conflict)
	man: ["manchester"],
	liv: ["liverpool"],
	ars: ["arsenal"],
	che: ["chelsea"],
	tot: ["tottenham"],
	whu: ["west ham"],
	newc: ["newcastle"], // Use 'newc' to avoid conflict with 'new york'
	lei: ["leicester"],
	eve: ["everton"],
	villa: ["aston villa"],

	// Team suffixes
	utd: ["united"],
	fc: ["football club"],
	cf: ["club de futbol"],
};

/**
 * Expand abbreviations in a string
 */
export function expandAbbreviations(s: string): string {
	let result = s.toLowerCase();
	for (const [abbr, expansions] of Object.entries(ABBREVIATIONS)) {
		const regex = new RegExp(`\\b${abbr}\\b`, "gi");
		if (regex.test(result)) {
			result = result.replace(regex, expansions[0]);
		}
	}
	return result;
}

/**
 * FuzzyMatchResult with confidence scoring
 */
export interface FuzzyMatchResult {
	match: string;
	score: number;
	method: "exact" | "levenshtein" | "jaro-winkler" | "token" | "abbreviation";
}

/**
 * Comprehensive fuzzy matching with multiple algorithms
 */
export function fuzzyMatch(
	query: string,
	candidates: string[],
	threshold = 0.7,
): FuzzyMatchResult | null {
	if (candidates.length === 0) return null;

	const normalizedQuery = query.toLowerCase().trim();
	const expandedQuery = expandAbbreviations(normalizedQuery);

	let bestMatch: FuzzyMatchResult | null = null;
	let bestScore = 0;

	for (const candidate of candidates) {
		const normalizedCandidate = candidate.toLowerCase().trim();
		const expandedCandidate = expandAbbreviations(normalizedCandidate);

		// 1. Exact match (after normalization)
		if (normalizedQuery === normalizedCandidate) {
			return { match: candidate, score: 1.0, method: "exact" };
		}

		// 2. Abbreviation expansion match
		if (
			expandedQuery === expandedCandidate &&
			expandedQuery !== normalizedQuery
		) {
			return { match: candidate, score: 0.98, method: "abbreviation" };
		}

		// 3. Jaro-Winkler (good for typos and minor variations)
		const jwScore = jaroWinklerSimilarity(normalizedQuery, normalizedCandidate);
		if (jwScore > bestScore && jwScore >= threshold) {
			bestScore = jwScore;
			bestMatch = { match: candidate, score: jwScore, method: "jaro-winkler" };
		}

		// 4. Token similarity (good for reordered words)
		const tokenScore = tokenSimilarity(normalizedQuery, normalizedCandidate);
		if (tokenScore > bestScore && tokenScore >= threshold) {
			bestScore = tokenScore;
			bestMatch = { match: candidate, score: tokenScore, method: "token" };
		}

		// 5. Levenshtein similarity (fallback for short strings)
		if (normalizedQuery.length <= 10) {
			const levScore = levenshteinSimilarity(
				normalizedQuery,
				normalizedCandidate,
			);
			if (levScore > bestScore && levScore >= threshold) {
				bestScore = levScore;
				bestMatch = {
					match: candidate,
					score: levScore,
					method: "levenshtein",
				};
			}
		}
	}

	return bestMatch;
}

/**
 * Find top N matches
 */
export function fuzzyMatchTop(
	query: string,
	candidates: string[],
	n = 5,
	threshold = 0.5,
): FuzzyMatchResult[] {
	const normalizedQuery = query.toLowerCase().trim();
	const results: FuzzyMatchResult[] = [];

	for (const candidate of candidates) {
		const normalizedCandidate = candidate.toLowerCase().trim();

		// Use best of multiple algorithms
		const jwScore = jaroWinklerSimilarity(normalizedQuery, normalizedCandidate);
		const tokenScore = tokenSimilarity(normalizedQuery, normalizedCandidate);
		const score = Math.max(jwScore, tokenScore);

		if (score >= threshold) {
			results.push({
				match: candidate,
				score,
				method: score === jwScore ? "jaro-winkler" : "token",
			});
		}
	}

	// Sort by score descending and take top N
	return results.sort((a, b) => b.score - a.score).slice(0, n);
}

/**
 * Check if two strings are likely the same entity
 */
export function isSameEntity(a: string, b: string, threshold = 0.85): boolean {
	const normalizedA = a.toLowerCase().trim();
	const normalizedB = b.toLowerCase().trim();

	if (normalizedA === normalizedB) return true;

	// Check expanded abbreviations
	const expandedA = expandAbbreviations(normalizedA);
	const expandedB = expandAbbreviations(normalizedB);
	if (expandedA === expandedB) return true;

	// Use combined score
	const jw = jaroWinklerSimilarity(normalizedA, normalizedB);
	const token = tokenSimilarity(normalizedA, normalizedB);
	const combined = jw * 0.6 + token * 0.4;

	return combined >= threshold;
}
