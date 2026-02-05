/**
 * @fileoverview 1.1.1.1.3.1.4: Cross-Reference Index Builder
 * @description Builds and maintains cross-reference index for documentation numbers
 * @module audit/cross-reference-index-builder
 */

import {
	DocumentationNumberExtractor,
	type ExtractedDocNumber,
} from "./documentation-number-extractor";

/**
 * Cross-reference entry
 */
export interface CrossReference {
	source: string; // Source documentation number
	target: string; // Target documentation number
	sourceFile: string;
	targetFile: string;
	line: number;
	context: string;
	isValid: boolean;
}

/**
 * Cross-reference index
 */
export interface CrossReferenceIndex {
	references: Map<string, CrossReference[]>; // source -> references[]
	targets: Map<string, string[]>; // target -> sources[]
	orphans: Set<string>; // Documentation numbers with no references
	broken: Set<string>; // Broken references (target doesn't exist)
}

/**
 * 1.1.1.1.1.3.1.4: Cross-Reference Index Builder
 *
 * Builds comprehensive cross-reference index for documentation numbers
 */
export class CrossReferenceIndexBuilder {
	private extractor: DocumentationNumberExtractor;
	private index: CrossReferenceIndex;

	constructor() {
		this.extractor = new DocumentationNumberExtractor();
		this.index = {
			references: new Map(),
			targets: new Map(),
			orphans: new Set(),
			broken: new Set(),
		};
	}

	/**
	 * Build cross-reference index from files
	 *
	 * @param sourceFiles - Source files to scan
	 * @param targetFiles - Target files to verify references against
	 */
	async buildIndex(
		sourceFiles: string[],
		targetFiles: string[],
	): Promise<CrossReferenceIndex> {
		// Extract all documentation numbers from source files
		const sourceDocs = await this.extractor.extractFromFiles(sourceFiles);

		// Extract all documentation numbers from target files
		const targetDocs = await this.extractor.extractFromFiles(targetFiles);

		// Build target set for quick lookup
		const targetSet = new Set(targetDocs.map((d) => d.number));

		// Process source documentation numbers
		for (const sourceDoc of sourceDocs) {
			// Extract cross-references from context (look for "->" or "see" patterns)
			const references = this.extractCrossReferences(sourceDoc);

			if (references.length === 0) {
				// No references found - potential orphan
				this.index.orphans.add(sourceDoc.number);
			}

			for (const target of references) {
				const crossRef: CrossReference = {
					source: sourceDoc.number,
					target,
					sourceFile: sourceDoc.file,
					targetFile: this.findTargetFile(target, targetDocs),
					line: sourceDoc.line,
					context: sourceDoc.context,
					isValid: targetSet.has(target),
				};

				// Add to references map
				if (!this.index.references.has(sourceDoc.number)) {
					this.index.references.set(sourceDoc.number, []);
				}
				this.index.references.get(sourceDoc.number)!.push(crossRef);

				// Add to targets map
				if (!this.index.targets.has(target)) {
					this.index.targets.set(target, []);
				}
				this.index.targets.get(target)!.push(sourceDoc.number);

				// Mark as broken if target doesn't exist
				if (!crossRef.isValid) {
					this.index.broken.add(target);
				}
			}
		}

		return this.index;
	}

	/**
	 * Get cross-references for a documentation number
	 */
	getReferences(docNumber: string): CrossReference[] {
		return this.index.references.get(docNumber) || [];
	}

	/**
	 * Get sources referencing a documentation number
	 */
	getSources(docNumber: string): string[] {
		return this.index.targets.get(docNumber) || [];
	}

	/**
	 * Check if documentation number is orphaned
	 */
	isOrphaned(docNumber: string): boolean {
		return this.index.orphans.has(docNumber);
	}

	/**
	 * Check if reference is broken
	 */
	isBroken(target: string): boolean {
		return this.index.broken.has(target);
	}

	/**
	 * Get all orphaned documentation numbers
	 */
	getOrphans(): string[] {
		return Array.from(this.index.orphans);
	}

	/**
	 * Get all broken references
	 */
	getBrokenReferences(): string[] {
		return Array.from(this.index.broken);
	}

	/**
	 * Extract cross-references from documentation context
	 *
	 * Looks for patterns like:
	 * - "-> 1.2.3.4.5"
	 * - "see 1.2.3.4.5"
	 * - "Cross-reference: 1.2.3.4.5"
	 */
	private extractCrossReferences(doc: ExtractedDocNumber): string[] {
		const references: string[] = [];
		const context = doc.context;

		// Pattern 1: Arrow notation "-> 1.2.3.4.5"
		const arrowPattern = /->\s*(\d+\.\d+\.\d+\.\d+\.\d+(?:\.\d+)?(?:\.\d+)?)/g;
		let match;
		while ((match = arrowPattern.exec(context)) !== null) {
			references.push(match[1]);
		}

		// Pattern 2: "see" notation "see 1.2.3.4.5"
		const seePattern = /see\s+(\d+\.\d+\.\d+\.\d+\.\d+(?:\.\d+)?(?:\.\d+)?)/gi;
		while ((match = seePattern.exec(context)) !== null) {
			references.push(match[1]);
		}

		// Pattern 3: "Cross-reference:" notation
		const crossRefPattern =
			/cross[-_]?reference[:\s]+(\d+\.\d+\.\d+\.\d+\.\d+(?:\.\d+)?(?:\.\d+)?)/gi;
		while ((match = crossRefPattern.exec(context)) !== null) {
			references.push(match[1]);
		}

		// Pattern 4: Parentheses notation "(1.2.3.4.5)"
		const parenPattern = /\((\d+\.\d+\.\d+\.\d+\.\d+(?:\.\d+)?(?:\.\d+)?)\)/g;
		while ((match = parenPattern.exec(context)) !== null) {
			// Only add if it's different from the main doc number
			if (match[1] !== doc.number) {
				references.push(match[1]);
			}
		}

		return [...new Set(references)]; // Remove duplicates
	}

	/**
	 * Find target file for a documentation number
	 */
	private findTargetFile(
		target: string,
		targetDocs: ExtractedDocNumber[],
	): string {
		const found = targetDocs.find((d) => d.number === target);
		return found?.file || "unknown";
	}

	/**
	 * Rebuild index (clear and rebuild)
	 */
	async rebuildIndex(
		sourceFiles: string[],
		targetFiles: string[],
	): Promise<CrossReferenceIndex> {
		this.index = {
			references: new Map(),
			targets: new Map(),
			orphans: new Set(),
			broken: new Set(),
		};

		return this.buildIndex(sourceFiles, targetFiles);
	}
}
