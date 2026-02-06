// bun-grapheme-levenshtein.ts
import { BunGraphemeSegmenter } from "./bun-grapheme-segmenter";

export class GraphemeLevenshteinEngine {
	private segmenter = new BunGraphemeSegmenter();

	// Emoji-aware variable name comparison
	compareVariableNames(name1: string, name2: string): ComparisonResult {
		// Segment into grapheme clusters
		const graphemes1 = this.segmenter.segmentGraphemes(name1);
		const graphemes2 = this.segmenter.segmentGraphemes(name2);

		// Handle emoji sequences (flags, ZWJ, skin tones)
		const normalized1 = this.normalizeEmojiSequences(graphemes1);
		const normalized2 = this.normalizeEmojiSequences(graphemes2);

		// Calculate grapheme-level Levenshtein
		const distance = this.graphemeDistance(normalized1, normalized2);

		// Visual width calculation for terminal display
		const visualWidth = Math.max(Bun.stringWidth(name1), Bun.stringWidth(name2));

		return {
			distance,
			similarity: 1 - distance / Math.max(normalized1.length, normalized2.length, 1),
			visualWidth,
			isConfusable: this.isConfusable(name1, name2, distance),
			graphemeCount1: normalized1.length,
			graphemeCount2: normalized2.length,
		};
	}

	private normalizeEmojiSequences(graphemes: string[]): string[] {
		return graphemes.map((g) => {
			// Normalize skin tone variations to base emoji
			if (g.match(/\p{Emoji_Modifier_Base}\p{Emoji_Modifier}/u)) {
				return g.replace(/\p{Emoji_Modifier}/u, "");
			}

			// Normalize flag sequences to country code
			if (g.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u)) {
				return "🏳️"; // Generic flag placeholder
			}

			// Normalize ZWJ sequences
			if (g.includes("\u200D")) {
				const parts = g.split("\u200D");
				return parts[0]; // Use first component
			}

			return g;
		});
	}

	private graphemeDistance(g1: string[], g2: string[]): number {
		const m = g1.length,
			n = g2.length;
		if (m === 0) return n;
		if (n === 0) return m;

		// Use Float64Array to preserve fractional similarity costs
		const dp = new Float64Array(n + 1);

		for (let j = 0; j <= n; j++) {
			dp[j] = j;
		}

		for (let i = 0; i < m; i++) {
			let prev = dp[0];
			dp[0] = i + 1;

			for (let j = 0; j < n; j++) {
				const temp = dp[j + 1];
				const cost = g1[i] === g2[j] ? 0 : this.graphemeConfusionCost(g1[i], g2[j]);

				dp[j + 1] = Math.min(
					dp[j + 1] + 1, // deletion
					dp[j] + 1, // insertion
					prev + cost, // substitution
				);

				prev = temp;
			}
		}

		return dp[n];
	}

	private graphemeConfusionCost(g1: string, g2: string): number {
		// Emoji vs text confusion (high cost)
		if (this.isEmoji(g1) !== this.isEmoji(g2)) return 2;

		// Script confusion (Cyrillic vs Latin)
		if (this.isConfusableScript(g1, g2)) return 1.5;

		// Visual similarity
		if (this.areVisuallySimilar(g1, g2)) return 0.8;

		return 1;
	}

	private isEmoji(grapheme: string): boolean {
		// Must have emoji presentation (exclude digits 0-9, *, #)
		// Use Extended_Pictographic which excludes ASCII digits
		return /\p{Extended_Pictographic}/u.test(grapheme);
	}

	private isConfusableScript(g1: string, g2: string): boolean {
		const c1 = g1.codePointAt(0) || 0;
		const c2 = g2.codePointAt(0) || 0;

		// Cyrillic vs Latin range overlap
		return (
			(c1 >= 0x0400 && c1 <= 0x04ff && c2 >= 0x0041 && c2 <= 0x007a) ||
			(c2 >= 0x0400 && c2 <= 0x04ff && c1 >= 0x0041 && c1 <= 0x007a)
		);
	}

	private areVisuallySimilar(g1: string, g2: string): boolean {
		// Groups of visually similar characters
		const confusableGroups: string[][] = [
			["0", "O", "o", "Ο", "О"], // Zero, Latin O, Greek Omicron, Cyrillic O
			["1", "l", "I", "|", "Ι", "І", "i"], // One, lowercase L, uppercase i, etc.
			["a", "а"], // Latin 'a', Cyrillic 'а'
			["e", "е"], // Latin 'e', Cyrillic 'е'
			["p", "р"], // Latin 'p', Cyrillic 'р'
			["c", "с"], // Latin 'c', Cyrillic 'с'
			["x", "х"], // Latin 'x', Cyrillic 'х'
			["y", "у"], // Latin 'y', Cyrillic 'у'
		];

		for (const group of confusableGroups) {
			if (group.includes(g1) && group.includes(g2)) {
				return true;
			}
		}
		return false;
	}

	isConfusable(name1: string, name2: string, distance: number): boolean {
		const visualSim =
			distance /
			Math.max(
				this.segmenter.segmentGraphemes(name1).length,
				this.segmenter.segmentGraphemes(name2).length,
				1,
			);

		return visualSim < 0.3; // Threshold for confusability
	}
}

export interface ComparisonResult {
	distance: number;
	similarity: number;
	visualWidth: number;
	isConfusable: boolean;
	graphemeCount1: number;
	graphemeCount2: number;
}

// Singleton instance
export const levenshtein = new GraphemeLevenshteinEngine();
