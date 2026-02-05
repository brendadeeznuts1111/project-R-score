/**
 * Unicode-Aware Similarity Comparator
 *
 * Handles emoji/script in variable names for international dev teams
 * Integrates with BunGraphemeSegmenter for proper Unicode handling
 */

import { BunGraphemeSegmenter } from "./bun-grapheme-segmenter";
import { levenshteinDistance } from "./levenshtein";

export class UnicodeAwareComparator {
	private segmenter = new BunGraphemeSegmenter();

	// Segment string into grapheme clusters
	segmentGraphemes(str: string): string[] {
		return this.segmenter.segmentGraphemes(str);
	}

	// Handle emoji/script in variable names (for international dev teams)
	graphemeLevenshtein(s1: string, s2: string): number {
		const graphemes1 = this.segmentGraphemes(s1);
		const graphemes2 = this.segmentGraphemes(s2);

		// Use grapheme clusters instead of code points
		return this.optimizedGraphemeDistance(graphemes1, graphemes2);
	}

	// Normalized version for comparison
	normalizedGraphemeLevenshtein(s1: string, s2: string): number {
		if (s1 === s2) return 0;

		const distance = this.graphemeLevenshtein(s1, s2);
		const graphemes1 = this.segmentGraphemes(s1);
		const graphemes2 = this.segmentGraphemes(s2);
		const maxLen = Math.max(graphemes1.length, graphemes2.length);

		return distance / maxLen;
	}

	private optimizedGraphemeDistance(g1: string[], g2: string[]): number {
		if (g1.length === 0) return g2.length;
		if (g2.length === 0) return g1.length;

		const lenG1 = g1.length; // ✅ Cache length to avoid repeated reads
		const lenG2 = g2.length; // ✅ Cache length to avoid repeated reads

		const dp = new Uint16Array(lenG2 + 1);

		for (let j = 0; j <= lenG2; j++) {
			dp[j] = j;
		}

		for (let i = 0; i < lenG1; i++) {
			let prev = dp[0];
			dp[0] = i + 1;

			for (let j = 0; j < lenG2; j++) {
				const temp = dp[j + 1];
				const cost = this.graphemeSimilarity(g1[i], g2[j]) > 0.8 ? 0 : 1;

				dp[j + 1] = Math.min(dp[j + 1] + 1, dp[j] + 1, prev + cost);

				prev = temp;
			}
		}

		return dp[lenG2];
	}

	// Account for visually similar Unicode characters
	graphemeSimilarity(g1: string, g2: string): number {
		// Handle common confusables (homoglyphs)
		const confusables = new Map<string, string[]>([
			["0", ["O", "o", "〇", "Ο", "ο"]], // Zero vs letters
			["1", ["l", "I", "|", "ı", "Ι"]], // One vs letters
			["2", ["Z", "z", "Ζ"]],
			["5", ["S", "s", "Ѕ"]],
			["8", ["B", "Β"]],
			["а", ["a", "ɑ"]], // Cyrillic 'а' vs Latin 'a'
			["е", ["e", "ε"]], // Cyrillic 'е' vs Latin 'e'
			["о", ["o", "ο"]], // Cyrillic 'о' vs Latin 'o'
			["р", ["p", "ρ"]], // Cyrillic 'р' vs Latin 'p'
			["с", ["c"]], // Cyrillic 'с' vs Latin 'c'
			["х", ["x", "χ"]], // Cyrillic 'х' vs Latin 'x'
			["у", ["y", "γ"]], // Cyrillic 'у' vs Latin 'y'
			["А", ["A", "Α"]], // Cyrillic 'А' vs Latin 'A'
			["В", ["B", "Β"]], // Cyrillic 'В' vs Latin 'B'
			["Е", ["E", "Ε"]], // Cyrillic 'Е' vs Latin 'E'
			["К", ["K", "Κ"]], // Cyrillic 'К' vs Latin 'K'
			["М", ["M", "Μ"]], // Cyrillic 'М' vs Latin 'M'
			["Н", ["H", "Η"]], // Cyrillic 'Н' vs Latin 'H'
			["О", ["O", "Ο"]], // Cyrillic 'О' vs Latin 'O'
			["Р", ["P", "Ρ"]], // Cyrillic 'Р' vs Latin 'P'
			["С", ["C"]], // Cyrillic 'С' vs Latin 'C'
			["Т", ["T", "Τ"]], // Cyrillic 'Т' vs Latin 'T'
			["Х", ["X", "Χ"]], // Cyrillic 'Х' vs Latin 'X'
		]);

		if (g1 === g2) return 1;

		// Case-insensitive match
		if (g1.toLowerCase() === g2.toLowerCase()) return 0.95;

		// Check if characters are known confusables
		for (const [base, similar] of confusables.entries()) {
			if (
				(g1 === base && similar.includes(g2)) ||
				(g2 === base && similar.includes(g1)) ||
				(similar.includes(g1) && similar.includes(g2))
			) {
				return 0.85; // High similarity but not identical
			}
		}

		return 0;
	}

	// Domain-Specific: Compare phone number patterns
	phoneNumberSimilarity(num1: string, num2: string): number {
		// Normalize phone numbers
		const normalize = (num: string) => num.replace(/[+\s\-()]/g, "");
		const n1 = normalize(num1);
		const n2 = normalize(num2);

		if (n1 === n2) return 1;

		// Country code aware comparison
		const cc1 = n1.slice(0, Math.min(3, n1.length));
		const cc2 = n2.slice(0, Math.min(3, n2.length));

		if (cc1 !== cc2) return 0; // Different country codes

		// Compare last 7 digits (local number)
		const local1 = n1.slice(-7);
		const local2 = n2.slice(-7);

		return local1 === local2 ? 0.9 : 0;
	}

	// Domain-Specific: Compare email addresses
	emailSimilarity(email1: string, email2: string): number {
		const normalize = (email: string) => email.toLowerCase().trim();
		const e1 = normalize(email1);
		const e2 = normalize(email2);

		if (e1 === e2) return 1;

		// Split into local and domain parts
		const [local1, domain1] = e1.split("@");
		const [local2, domain2] = e2.split("@");

		if (!domain1 || !domain2) return 0;

		// Same domain check
		if (domain1 !== domain2) return 0;

		// Compare local parts using Levenshtein
		const localDistance = levenshteinDistance(local1, local2);
		const maxLen = Math.max(local1.length, local2.length);

		return 1 - localDistance / maxLen;
	}

	// Detect potential homoglyph attacks in variable names
	detectHomoglyphRisk(varName: string): {
		hasRisk: boolean;
		details: string[];
	} {
		const details: string[] = [];
		const graphemes = this.segmentGraphemes(varName);

		// Check for mixed scripts
		const scripts = new Set<string>();
		for (const g of graphemes) {
			const code = g.codePointAt(0) || 0;
			if (code >= 0x0400 && code <= 0x04ff) scripts.add("Cyrillic");
			else if (code >= 0x0370 && code <= 0x03ff) scripts.add("Greek");
			else if (code >= 0x0041 && code <= 0x007a) scripts.add("Latin");
			else if (code >= 0x0030 && code <= 0x0039) scripts.add("Numeric");
		}

		if (scripts.size > 2) {
			details.push(`Mixed scripts detected: ${Array.from(scripts).join(", ")}`);
		}

		// Check for known confusable characters
		const confusableChars = [
			"а",
			"е",
			"о",
			"р",
			"с",
			"х",
			"у",
			"А",
			"В",
			"Е",
			"К",
			"М",
			"Н",
			"О",
			"Р",
			"С",
			"Т",
			"Х",
		];
		for (const g of graphemes) {
			if (confusableChars.includes(g)) {
				details.push(
					`Potential homoglyph: "${g}" (may be confused with Latin equivalent)`,
				);
			}
		}

		return {
			hasRisk: details.length > 0,
			details,
		};
	}

	// Batch comparison with Unicode awareness
	batchUnicodeComparison(
		variables: string[],
		threshold = 0.3,
	): Array<{
		var1: string;
		var2: string;
		similarity: number;
		unicodeRisk: boolean;
	}> {
		const results: Array<{
			var1: string;
			var2: string;
			similarity: number;
			unicodeRisk: boolean;
		}> = [];

		const lenVars = variables.length; // ✅ Cache length for nested loops
		for (let i = 0; i < lenVars; i++) {
			for (let j = i + 1; j < lenVars; j++) {
				const sim = this.normalizedGraphemeLevenshtein(variables[i], variables[j]);

				if (sim < threshold) {
					const risk1 = this.detectHomoglyphRisk(variables[i]);
					const risk2 = this.detectHomoglyphRisk(variables[j]);

					results.push({
						var1: variables[i],
						var2: variables[j],
						similarity: 1 - sim,
						unicodeRisk: risk1.hasRisk || risk2.hasRisk,
					});
				}
			}
		}

		return results;
	}
}

// Export singleton for convenience
export const unicodeComparator = new UnicodeAwareComparator();
