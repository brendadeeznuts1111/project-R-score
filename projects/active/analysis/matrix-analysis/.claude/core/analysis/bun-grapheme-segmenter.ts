/**
 * BunGraphemeSegmenter - High-performance grapheme segmentation for Bun
 *
 * Leverages native Intl.Segmenter for maximum efficiency in Bun's JavaScriptCore
 */

export class BunGraphemeSegmenter {
	private segmenter: Intl.Segmenter;

	constructor(locale: string = "en") {
		this.segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
	}

	/**
	 * Segments a string into an array of grapheme clusters (Unicode characters)
	 */
	segmentGraphemes(str: string): string[] {
		if (!str) return [];

		// Fast path for ASCII-only strings
		if (/^[\x00-\x7F]*$/.test(str)) {
			return str.split("");
		}

		return Array.from(this.segmenter.segment(str), (s) => s.segment);
	}

	/**
	 * Gets the count of grapheme clusters in a string
	 */
	countGraphemes(str: string): number {
		return this.segmentGraphemes(str).length;
	}

	/**
	 * Checks if a string contains any non-ASCII Unicode characters
	 */
	hasUnicode(str: string): boolean {
		return /[^\x00-\x7F]/.test(str);
	}
}

export const defaultSegmenter = new BunGraphemeSegmenter();
