/**
 * Variable Scope Scanner for BunX Phone Management System
 *
 * Detects confusing variable names using Levenshtein similarity analysis
 * Optimized for real-time scanning of TypeScript/JavaScript code
 */

import { coreLogger as logger } from "../shared/logger.js";
import { batchSimilarityCheck } from "./levenshtein";

export interface VariableInfo {
	name: string;
	scope: "method" | "class" | "global";
	line: number;
	type?: string;
	filePath?: string;
}

export interface ScopeConflict {
	var1: VariableInfo;
	var2: VariableInfo;
	similarity: number;
}

export interface ScopeScanResult {
	hasConflicts: boolean;
	conflicts: ScopeConflict[];
	scopeName: string;
	variableCount: number;
}

export interface ScannerConfig {
	similarityThreshold: number;
	minNameLength: number;
	ignorePatterns: RegExp[];
	ignoreTypes: string[];
}

export class ScopeScanner {
	private scopeStack: Map<string, VariableInfo[]>[] = [];
	private currentScopeName = "";

	constructor(
		private config: ScannerConfig = {
			similarityThreshold: 0.3,
			minNameLength: 3,
			ignorePatterns: [/^_$/, /^i$/, /^j$/, /^k$/, /^idx$/, /^tmp$/, /^temp$/],
			ignoreTypes: ["any", "unknown"],
		},
	) {}

	// Enter a new scope (e.g., method in your AccountAgent)
	enterScope(scopeName: string): void {
		this.scopeStack.push(new Map());
		this.currentScopeName = scopeName;
		logger.info(`[ScopeScanner] Entering scope: ${scopeName}`);
	}

	// Add variable to current scope
	addVariable(varInfo: VariableInfo): void {
		// Filter out ignored variables
		if (varInfo.name.length < this.config.minNameLength) return;
		if (this.config.ignorePatterns.some((p) => p.test(varInfo.name))) return;
		if (varInfo.type && this.config.ignoreTypes.includes(varInfo.type)) return;

		const currentScope = this.scopeStack[this.scopeStack.length - 1];
		if (!currentScope) return;

		if (!currentScope.has(varInfo.name)) {
			currentScope.set(varInfo.name, []);
		}

		currentScope.get(varInfo.name)?.push(varInfo);
	}

	// Scan current scope for confusing variable names
	scanCurrentScope(): ScopeScanResult {
		const currentScope = this.scopeStack[this.scopeStack.length - 1];
		if (!currentScope || currentScope.size < 2) {
			return {
				hasConflicts: false,
				conflicts: [],
				scopeName: this.currentScopeName,
				variableCount: currentScope?.size || 0,
			};
		}

		// Extract variable names for batch comparison
		const varNames = Array.from(currentScope.keys());
		const similarPairs = batchSimilarityCheck(varNames, this.config.similarityThreshold);

		// Map back to full variable info
		const conflicts: ScopeConflict[] = similarPairs.map(([name1, name2, sim]) => ({
			var1: currentScope.get(name1)?.[0],
			var2: currentScope.get(name2)?.[0],
			similarity: 1 - sim, // Convert to similarity score (0-1)
		}));

		return {
			hasConflicts: conflicts.length > 0,
			conflicts,
			scopeName: this.currentScopeName,
			variableCount: currentScope.size,
		};
	}

	exitScope(): ScopeScanResult {
		const result = this.scanCurrentScope();
		this.scopeStack.pop();

		// Report findings for your DDD entities
		if (result.hasConflicts) {
			logger.warn(
				`\\n[ScopeScanner] Confusing variable names detected in "${result.scopeName}":`,
			);
			for (const { var1, var2, similarity } of result.conflicts) {
				const location1 = var1.filePath
					? `${var1.filePath}:${var1.line}`
					: `line ${var1.line}`;
				const location2 = var2.filePath
					? `${var2.filePath}:${var2.line}`
					: `line ${var2.line}`;

				logger.warn(
					`  ⚠️  "${var1.name}" (${location1}) vs "${var2.name}" (${location2}) ` +
						`similarity: ${(similarity * 100).toFixed(1)}%`,
				);
			}
		}

		return result;
	}

	// Scan entire file for variable declarations
	scanFile(content: string, filePath: string): ScopeScanResult[] {
		const results: ScopeScanResult[] = [];
		const lines = content.split("\n");

		this.enterScope(`File: ${filePath}`);

		// Parse variable declarations (TypeScript/JavaScript)
		const patterns = [
			/\b(?:const|let|var)\s+([a-zA-Z_]\w*)\s*[:=]/,
			/\b(?:private|public|protected)?\s*([a-zA-Z_]\w*)\s*:/,
			/\bfunction\s+([a-zA-Z_]\w*)\s*\(/,
			/\bclass\s+([a-zA-Z_]\w*)\s*{/,
			/\binterface\s+([a-zA-Z_]\w*)\s*{/,
			/\btype\s+([a-zA-Z_]\w*)\s*=/,
		];

		for (let index = 0; index < lines.length; index++) {
			const line = lines[index];
			for (const pattern of patterns) {
				const match = line.match(pattern);
				if (match) {
					this.addVariable({
						name: match[1],
						scope: "method",
						line: index + 1,
						filePath,
					});
				}
			}
		}

		results.push(this.exitScope());
		return results;
	}

	// Reset scanner state
	reset(): void {
		this.scopeStack = [];
		this.currentScopeName = "";
	}

	// Get scanner statistics
	getStats(): { totalScopes: number; totalVariables: number } {
		const totalVariables = this.scopeStack.reduce((sum, scope) => sum + scope.size, 0);
		return {
			totalScopes: this.scopeStack.length,
			totalVariables,
		};
	}
}
