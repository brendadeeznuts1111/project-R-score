/**
 * @fileoverview 1.1.1.1.3.1.5: Enhanced Orphan Detection Logic
 * @description Advanced orphan detection with cross-reference validation
 * @module audit/enhanced-orphan-detector
 */

import {
	DocumentationNumberExtractor,
	type ExtractedDocNumber,
} from "./documentation-number-extractor";
import {
	CrossReferenceIndexBuilder,
	type CrossReferenceIndex,
} from "./cross-reference-index-builder";

/**
 * Orphan detection result
 */
export interface OrphanDetectionResult {
	orphanedDocs: Array<{
		docNumber: string;
		file: string;
		line: number;
		reason: string;
	}>;
	brokenReferences: Array<{
		source: string;
		target: string;
		sourceFile: string;
		line: number;
	}>;
	statistics: {
		totalDocs: number;
		orphanedCount: number;
		brokenRefsCount: number;
		coverage: number; // Percentage of docs with valid references
	};
}

/**
 * 1.1.1.1.3.1.5: Enhanced Orphan Detection Logic
 *
 * Detects orphaned documentation and broken cross-references
 */
export class EnhancedOrphanDetector {
	private extractor: DocumentationNumberExtractor;
	private indexBuilder: CrossReferenceIndexBuilder;

	constructor() {
		this.extractor = new DocumentationNumberExtractor();
		this.indexBuilder = new CrossReferenceIndexBuilder();
	}

	/**
	 * Detect orphaned documentation
	 *
	 * @param docFiles - Documentation files to check
	 * @param codeFiles - Code files that should reference docs
	 * @returns Orphan detection results
	 */
	async detectOrphans(
		docFiles: string[],
		codeFiles: string[],
	): Promise<OrphanDetectionResult> {
		// Build cross-reference index
		const index = await this.indexBuilder.buildIndex(codeFiles, docFiles);

		// Extract all documentation numbers from doc files
		const allDocs = await this.extractor.extractFromFiles(docFiles);

		// Find orphaned docs (not referenced in code)
		const orphanedDocs: Array<{
			docNumber: string;
			file: string;
			line: number;
			reason: string;
		}> = [];

		for (const doc of allDocs) {
			const sources = index.targets.get(doc.number);

			if (!sources || sources.length === 0) {
				orphanedDocs.push({
					docNumber: doc.number,
					file: doc.file,
					line: doc.line,
					reason: "No references found in code",
				});
			}
		}

		// Find broken references
		const brokenReferences: Array<{
			source: string;
			target: string;
			sourceFile: string;
			line: number;
		}> = [];

		for (const [source, refs] of index.references) {
			for (const ref of refs) {
				if (!ref.isValid) {
					brokenReferences.push({
						source,
						target: ref.target,
						sourceFile: ref.sourceFile,
						line: ref.line,
					});
				}
			}
		}

		// Calculate statistics
		const totalDocs = allDocs.length;
		const orphanedCount = orphanedDocs.length;
		const brokenRefsCount = brokenReferences.length;
		const referencedDocs = totalDocs - orphanedCount;
		const coverage = totalDocs > 0 ? (referencedDocs / totalDocs) * 100 : 0;

		return {
			orphanedDocs,
			brokenReferences,
			statistics: {
				totalDocs,
				orphanedCount,
				brokenRefsCount,
				coverage,
			},
		};
	}

	/**
	 * Detect undocumented code
	 *
	 * Finds code patterns that should have documentation but don't
	 */
	async detectUndocumentedCode(
		codeFiles: string[],
		patterns: Array<{
			pattern: RegExp;
			description: string;
		}>,
	): Promise<
		Array<{
			file: string;
			line: number;
			code: string;
			pattern: string;
			description: string;
		}>
	> {
		const undocumented: Array<{
			file: string;
			line: number;
			code: string;
			pattern: string;
			description: string;
		}> = [];

		for (const filePath of codeFiles) {
			try {
				const file = Bun.file(filePath);
				const text = await file.text();
				const lines = text.split("\n");

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];

					for (const { pattern, description } of patterns) {
						if (pattern.test(line)) {
							// Check if there's a documentation number nearby (within 5 lines)
							const nearbyText = lines
								.slice(Math.max(0, i - 5), i + 1)
								.join("\n");
							const nearbyDocs = this.extractor.extractFromText(
								nearbyText,
								filePath,
								Math.max(0, i - 5),
							);

							if (nearbyDocs.length === 0) {
								undocumented.push({
									file: filePath,
									line: i + 1,
									code: line.trim(),
									pattern: pattern.toString(),
									description,
								});
							}
						}
					}
				}
			} catch (error) {
				console.error(`Error processing file ${filePath}:`, error);
			}
		}

		return undocumented;
	}

	/**
	 * Validate cross-reference integrity
	 */
	async validateCrossReferences(
		sourceFiles: string[],
		targetFiles: string[],
	): Promise<{
		valid: number;
		broken: number;
		brokenRefs: Array<{
			source: string;
			target: string;
			file: string;
			line: number;
		}>;
	}> {
		const index = await this.indexBuilder.buildIndex(sourceFiles, targetFiles);

		const brokenRefs: Array<{
			source: string;
			target: string;
			file: string;
			line: number;
		}> = [];

		for (const [source, refs] of index.references) {
			for (const ref of refs) {
				if (!ref.isValid) {
					brokenRefs.push({
						source,
						target: ref.target,
						file: ref.sourceFile,
						line: ref.line,
					});
				}
			}
		}

		const totalRefs = Array.from(index.references.values()).reduce(
			(sum, refs) => sum + refs.length,
			0,
		);
		const valid = totalRefs - brokenRefs.length;

		return {
			valid,
			broken: brokenRefs.length,
			brokenRefs,
		};
	}
}
