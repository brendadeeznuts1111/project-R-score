/**
 * Unicode Scope Scanner - Extended scope analysis with Unicode/emoji support
 *
 * Handles modern variable names with emojis, Unicode identifiers,
 * and confusable character detection (Cyrillic vs Latin, etc.)
 */

import { coreLogger as logger } from "../shared/logger.js";
import { GraphemeLevenshteinEngine } from "./bun-grapheme-levenshtein";
import { BunGraphemeSegmenter } from "./bun-grapheme-segmenter";
import {
	type ScopeConflict,
	ScopeScanner,
	type ScopeScanResult,
	type VariableInfo,
} from "./scope-scanner";

export interface ScopeConfig {
	similarityThreshold: number;
	minNameLength: number;
	ignorePatterns: RegExp[];
	ignoreTypes: string[];
	detectConfusables: boolean;
	normalizeEmoji: boolean;
}

export interface UnicodeConflict extends ScopeConflict {
	isConfusable: boolean;
	visualWidth1: number;
	visualWidth2: number;
	graphemeCount1: number;
	graphemeCount2: number;
}

export interface UnicodeScanResult extends ScopeScanResult {
	conflicts: UnicodeConflict[];
	hasConfusables: boolean;
	unicodeVariables: number;
}

export class UnicodeScopeScanner extends ScopeScanner {
	protected levenshtein = new GraphemeLevenshteinEngine();
	protected segmenter = new BunGraphemeSegmenter();
	protected unicodeConfig: ScopeConfig;

	constructor(config: Partial<ScopeConfig> = {}) {
		super({
			similarityThreshold: config.similarityThreshold ?? 0.3,
			minNameLength: config.minNameLength ?? 3,
			ignorePatterns: config.ignorePatterns ?? [/^_$/, /^i$/, /^j$/, /^k$/],
			ignoreTypes: config.ignoreTypes ?? ["any", "unknown"],
		});

		this.unicodeConfig = {
			similarityThreshold: config.similarityThreshold ?? 0.3,
			minNameLength: config.minNameLength ?? 3,
			ignorePatterns: config.ignorePatterns ?? [/^_$/, /^i$/, /^j$/, /^k$/],
			ignoreTypes: config.ignoreTypes ?? ["any", "unknown"],
			detectConfusables: config.detectConfusables ?? true,
			normalizeEmoji: config.normalizeEmoji ?? true,
		};
	}

	/**
	 * Check if variable name contains Unicode beyond ASCII
	 */
	hasUnicode(name: string): boolean {
		return this.segmenter.hasUnicode(name);
	}

	/**
	 * Get visual width of variable name (for terminal alignment)
	 */
	getVisualWidth(name: string): number {
		return Bun.stringWidth(name);
	}

	/**
	 * Get grapheme count (actual character count including emoji)
	 */
	getGraphemeCount(name: string): number {
		return this.segmenter.countGraphemes(name);
	}

	/**
	 * Compare two variable names with Unicode awareness
	 */
	compareNames(name1: string, name2: string): UnicodeConflict | null {
		const result = this.levenshtein.compareVariableNames(name1, name2);

		// Only report if similar enough
		if (result.similarity < this.unicodeConfig.similarityThreshold) {
			return null;
		}

		// Check if this is a confusable (potential security issue)
		const isConfusable = result.isConfusable && this.unicodeConfig.detectConfusables;

		return {
			var1: { name: name1, scope: "method", line: 0 },
			var2: { name: name2, scope: "method", line: 0 },
			similarity: result.similarity,
			isConfusable,
			visualWidth1: result.visualWidth,
			visualWidth2: Bun.stringWidth(name2),
			graphemeCount1: result.graphemeCount1,
			graphemeCount2: result.graphemeCount2,
		};
	}

	/**
	 * Scan variables for Unicode-aware conflicts
	 */
	scanUnicodeConflicts(variables: VariableInfo[]): UnicodeScanResult {
		const conflicts: UnicodeConflict[] = [];
		let hasConfusables = false;
		let unicodeVariables = 0;

		// Count Unicode variables
		for (const v of variables) {
			if (this.hasUnicode(v.name)) {
				unicodeVariables++;
			}
		}

		// Compare all pairs
		const lenVars = variables.length; // ✅ Cache length for nested loops
		for (let i = 0; i < lenVars; i++) {
			for (let j = i + 1; j < lenVars; j++) {
				const result = this.levenshtein.compareVariableNames(
					variables[i].name,
					variables[j].name,
				);

				if (result.similarity >= this.unicodeConfig.similarityThreshold) {
					const conflict: UnicodeConflict = {
						var1: variables[i],
						var2: variables[j],
						similarity: result.similarity,
						isConfusable: result.isConfusable,
						visualWidth1: Bun.stringWidth(variables[i].name),
						visualWidth2: Bun.stringWidth(variables[j].name),
						graphemeCount1: result.graphemeCount1,
						graphemeCount2: result.graphemeCount2,
					};

					conflicts.push(conflict);

					if (result.isConfusable) {
						hasConfusables = true;
					}
				}
			}
		}

		return {
			hasConflicts: conflicts.length > 0,
			conflicts,
			scopeName: "unicode-scan",
			variableCount: variables.length,
			hasConfusables,
			unicodeVariables,
		};
	}

	/**
	 * Report confusable warnings (potential security issues)
	 */
	reportConfusables(result: UnicodeScanResult): void {
		if (!result.hasConfusables) return;

		logger.warn("\n⚠️  CONFUSABLE VARIABLE NAMES DETECTED");
		logger.warn("These may indicate homograph attacks or typosquatting:\n");

		for (const conflict of result.conflicts) {
			if (!conflict.isConfusable) continue;

			const v1 = conflict.var1;
			const v2 = conflict.var2;

			logger.warn(`  🔴 "${v1.name}" vs "${v2.name}"`);
			logger.warn(`     Similarity: ${(conflict.similarity * 100).toFixed(1)}%`);
			logger.warn(
				`     Visual widths: ${conflict.visualWidth1} vs ${conflict.visualWidth2}`,
			);

			if (v1.filePath) {
				logger.warn(`     ${v1.filePath}:${v1.line}`);
			}
			if (v2.filePath) {
				logger.warn(`     ${v2.filePath}:${v2.line}`);
			}
			logger.warn("");
		}
	}

	/**
	 * Format conflict for display
	 */
	formatConflict(conflict: UnicodeConflict): string {
		const icon = conflict.isConfusable ? "🔴" : "🟡";
		const label = conflict.isConfusable ? "CONFUSABLE" : "SIMILAR";

		return [
			`${icon} ${label}: "${conflict.var1.name}" ↔ "${conflict.var2.name}"`,
			`   Similarity: ${(conflict.similarity * 100).toFixed(1)}%`,
			`   Graphemes: ${conflict.graphemeCount1} vs ${conflict.graphemeCount2}`,
			`   Visual width: ${conflict.visualWidth1} vs ${conflict.visualWidth2}`,
		].join("\n");
	}
}

export type { VariableInfo, ScopeConflict };
