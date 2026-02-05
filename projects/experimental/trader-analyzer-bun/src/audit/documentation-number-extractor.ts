/**
 * @fileoverview 1.1.1.1.3.1.3: Documentation Number Extractor
 * @description Extracts and validates documentation numbers from code and docs
 * @module audit/documentation-number-extractor
 */

/**
 * Documentation number pattern
 * Supports formats: X.X.X.X.X, X.X.X.X.X.X, X.X.X.X.X.X.X
 */
const DOC_NUMBER_PATTERN = /\b(\d+\.\d+\.\d+\.\d+\.\d+(?:\.\d+)?(?:\.\d+)?)\b/g;

/**
 * Extracted documentation number
 */
export interface ExtractedDocNumber {
	number: string;
	file: string;
	line: number;
	context: string;
	isValid: boolean;
	parts: number[];
}

/**
 * 1.1.1.1.3.1.3: Documentation Number Extractor
 *
 * Extracts documentation numbers from files and validates format
 */
export class DocumentationNumberExtractor {
	/**
	 * Extract all documentation numbers from text
	 *
	 * @param text - Text content to extract from
	 * @param file - File path (for context)
	 * @param startLine - Starting line number (default: 1)
	 * @returns Array of extracted documentation numbers
	 */
	extractFromText(
		text: string,
		file: string,
		startLine: number = 1,
	): ExtractedDocNumber[] {
		const extracted: ExtractedDocNumber[] = [];
		const lines = text.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const matches = line.matchAll(DOC_NUMBER_PATTERN);

			for (const match of matches) {
				const docNumber = match[1];
				const isValid = this.validateFormat(docNumber);
				const parts = docNumber.split(".").map(Number);

				extracted.push({
					number: docNumber,
					file,
					line: startLine + i,
					context: line.trim(),
					isValid,
					parts,
				});
			}
		}

		return extracted;
	}

	/**
	 * Extract from file content
	 */
	async extractFromFile(filePath: string): Promise<ExtractedDocNumber[]> {
		try {
			const file = Bun.file(filePath);
			const text = await file.text();
			return this.extractFromText(text, filePath);
		} catch (error) {
			console.error(`Error reading file ${filePath}:`, error);
			return [];
		}
	}

	/**
	 * Extract from multiple files
	 */
	async extractFromFiles(filePaths: string[]): Promise<ExtractedDocNumber[]> {
		const allExtracted: ExtractedDocNumber[] = [];

		for (const filePath of filePaths) {
			const extracted = await this.extractFromFile(filePath);
			allExtracted.push(...extracted);
		}

		return allExtracted;
	}

	/**
	 * Validate documentation number format
	 *
	 * @param docNumber - Documentation number to validate
	 * @returns True if valid format
	 */
	validateFormat(docNumber: string): boolean {
		const parts = docNumber.split(".");

		// Must have 5-7 parts
		if (parts.length < 5 || parts.length > 7) {
			return false;
		}

		// All parts must be numbers
		for (const part of parts) {
			if (isNaN(Number(part))) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Normalize documentation number (remove leading zeros, etc.)
	 */
	normalize(docNumber: string): string {
		const parts = docNumber.split(".").map((p) => Number(p).toString());
		return parts.join(".");
	}

	/**
	 * Compare two documentation numbers
	 *
	 * @returns -1 if a < b, 0 if equal, 1 if a > b
	 */
	compare(a: string, b: string): number {
		const partsA = a.split(".").map(Number);
		const partsB = b.split(".").map(Number);

		const maxLength = Math.max(partsA.length, partsB.length);

		for (let i = 0; i < maxLength; i++) {
			const partA = partsA[i] || 0;
			const partB = partsB[i] || 0;

			if (partA < partB) return -1;
			if (partA > partB) return 1;
		}

		return 0;
	}

	/**
	 * Check if documentation number is in range
	 */
	isInRange(docNumber: string, min: string, max: string): boolean {
		return (
			this.compare(docNumber, min) >= 0 && this.compare(docNumber, max) <= 0
		);
	}
}
