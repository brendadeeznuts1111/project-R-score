/**
 * High-Performance Levenshtein Implementation for Bun
 *
 * Optimized for real-time variable scope analysis in the BunX Phone Management System
 * Leverages Bun's JavaScriptCore engine and typed arrays for maximum performance
 */

export function levenshteinDistance(s1: string, s2: string): number {
	const m = s1.length,
		n = s2.length;

	// Early termination for empty strings
	if (m === 0) return n;
	if (n === 0) return m;

	// Use typed arrays for better performance in Bun
	const dp = new Uint16Array(n + 1);

	// Initialize first row
	for (let j = 0; j <= n; j++) {
		dp[j] = j;
	}

	// Compute distance
	for (let i = 1; i <= m; i++) {
		let prev = dp[0];
		dp[0] = i;

		for (let j = 1; j <= n; j++) {
			const temp = dp[j];
			const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;

			dp[j] = Math.min(
				dp[j] + 1, // deletion
				dp[j - 1] + 1, // insertion
				prev + cost, // substitution
			);

			prev = temp;
		}
	}

	return dp[n];
}

// Normalized version for variable name comparison
export function normalizedLevenshtein(s1: string, s2: string): number {
	if (s1 === s2) return 0;

	const distance = levenshteinDistance(s1, s2);
	const maxLen = Math.max(s1.length, s2.length);

	return distance / maxLen; // 0 = identical, 1 = completely different
}

// Optimized for batch comparisons in scope scanning
export function batchSimilarityCheck(
	variables: string[],
	threshold = 0.3,
): [string, string, number][] {
	const conflicts: [string, string, number][] = [];
	const len = variables.length;

	// Precompute all pairs (O(n²) but optimized in Bun)
	for (let i = 0; i < len; i++) {
		for (let j = i + 1; j < len; j++) {
			const sim = normalizedLevenshtein(variables[i], variables[j]);

			// Only store if below similarity threshold (more similar = lower score)
			if (sim < threshold) {
				conflicts.push([variables[i], variables[j], sim]);
			}
		}
	}

	return conflicts;
}

// Performance benchmark for Bun vs Node.js comparison
export function benchmarkPerformance(variables: string[], iterations = 1000): number {
	const start = performance.now();

	for (let i = 0; i < iterations; i++) {
		batchSimilarityCheck(variables, 0.3);
	}

	const end = performance.now();
	return end - start;
}
