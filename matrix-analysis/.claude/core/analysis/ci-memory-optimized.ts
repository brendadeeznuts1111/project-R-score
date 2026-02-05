/**
 * Memory-Optimized Scope Scanner for CI/CD
 *
 * Detects similarly-named variables that could cause confusion or bugs.
 * Uses Levenshtein distance for fuzzy matching with memory-efficient chunking.
 *
 * Supports --smol mode for low-memory environments.
 */

import { coreLogger as logger } from "../shared/logger.js";
import { normalizedLevenshtein } from "./levenshtein";

export interface VariableInfo {
	name: string;
	line: number;
	scope: string;
	type?: string;
}

export interface Conflict {
	var1: VariableInfo;
	var2: VariableInfo;
	similarity: number;
	risk: "low" | "medium" | "high";
}

export class MemoryOptimizedScopeScanner {
	private similarityThreshold: number;
	private chunkSize: number;

	constructor(config: { similarityThreshold?: number } = {}, chunkSize = 50) {
		this.similarityThreshold = config.similarityThreshold ?? 0.3;
		this.chunkSize = chunkSize;
	}

	/**
	 * Scan variables for naming conflicts
	 * @param scopeName - Name for logging
	 * @param variables - Variables to scan
	 * @param useSmolMode - Use chunked processing for low memory
	 */
	async scanLargeScope(
		scopeName: string,
		variables: VariableInfo[],
		useSmolMode = false,
	): Promise<Conflict[]> {
		const mode = useSmolMode ? "--smol" : "standard";
		logger.info(`[${scopeName}] Scanning ${variables.length} variables in ${mode} mode`);

		return useSmolMode ? this.scanInChunks(variables) : this.scanAllAtOnce(variables);
	}

	/**
	 * Standard O(n²) comparison - fast but memory intensive
	 */
	private scanAllAtOnce(variables: VariableInfo[]): Conflict[] {
		const conflicts: Conflict[] = [];
		const len = variables.length;

		for (let i = 0; i < len; i++) {
			for (let j = i + 1; j < len; j++) {
				const distance = normalizedLevenshtein(variables[i].name, variables[j].name);

				if (distance < this.similarityThreshold) {
					conflicts.push({
						var1: variables[i],
						var2: variables[j],
						similarity: 1 - distance, // Convert: 0=different, 1=identical
						risk: this.assessRisk(distance, variables[i], variables[j]),
					});
				}
			}
		}

		return conflicts;
	}

	/**
	 * Chunked processing for --smol mode
	 */
	private async scanInChunks(variables: VariableInfo[]): Promise<Conflict[]> {
		const conflicts: Conflict[] = [];
		const chunks = this.createChunks(variables, this.chunkSize);

		logger.info(
			`  Splitting into ${chunks.length} chunks of ${this.chunkSize} variables`,
		);

		const chunkLen = chunks.length;
		for (let i = 0; i < chunkLen; i++) {
			// Compare within current chunk
			conflicts.push(...this.scanAllAtOnce(chunks[i]));

			// Compare with next chunk to catch cross-chunk conflicts
			if (i < chunks.length - 1) {
				conflicts.push(...this.compareChunks(chunks[i], chunks[i + 1]));
			}

			// Release chunk memory
			chunks[i] = [];

			// Yield to event loop every 5 chunks for GC
			if (i % 5 === 0) {
				await Bun.sleep(0);
			}
		}

		return conflicts;
	}

	private createChunks<T>(array: T[], size: number): T[][] {
		const chunks: T[][] = [];
		const arrayLen = array.length;
		for (let i = 0; i < arrayLen; i += size) {
			chunks.push(array.slice(i, i + size));
		}
		return chunks;
	}

	private compareChunks(chunk1: VariableInfo[], chunk2: VariableInfo[]): Conflict[] {
		const conflicts: Conflict[] = [];

		for (const var1 of chunk1) {
			for (const var2 of chunk2) {
				const distance = normalizedLevenshtein(var1.name, var2.name);

				if (distance < this.similarityThreshold) {
					conflicts.push({
						var1,
						var2,
						similarity: 1 - distance,
						risk: this.assessRisk(distance, var1, var2),
					});
				}
			}
		}

		return conflicts;
	}

	/**
	 * Assess risk level based on similarity and context
	 * Higher risk when variables are in same scope or nearby lines
	 */
	private assessRisk(
		distance: number,
		var1: VariableInfo,
		var2: VariableInfo,
	): "low" | "medium" | "high" {
		let riskScore = 1 - distance; // Base: how similar (0-1)

		// Same scope increases risk
		if (var1.scope === var2.scope) riskScore += 0.3;

		// Nearby lines increases risk
		if (Math.abs(var1.line - var2.line) < 10) riskScore += 0.2;

		if (riskScore > 0.7) return "high";
		if (riskScore > 0.4) return "medium";
		return "low";
	}

	/**
	 * Streaming API for very large codebases
	 * Process variables incrementally without loading all into memory
	 */
	createStreamScanner(): StreamScanner {
		const currentChunk: VariableInfo[] = [];
		const previousOverlap: VariableInfo[] = [];
		const allConflicts: Conflict[] = [];

		return {
			addVariable: (variable: VariableInfo) => {
				currentChunk.push(variable);

				if (currentChunk.length >= this.chunkSize) {
					// Compare within chunk
					allConflicts.push(...this.scanAllAtOnce(currentChunk));

					// Compare with overlap from previous chunk
					if (previousOverlap.length > 0) {
						allConflicts.push(...this.compareChunks(previousOverlap, currentChunk));
					}

					// Keep last 10% for overlap with next chunk
					const keepCount = Math.max(1, Math.floor(this.chunkSize * 0.1));
					previousOverlap.length = 0;
					previousOverlap.push(...currentChunk.slice(-keepCount));
					currentChunk.length = 0;
				}
			},

			flush: () => {
				// Process remaining variables
				if (currentChunk.length > 0) {
					allConflicts.push(...this.scanAllAtOnce(currentChunk));

					// Compare with overlap from previous chunk
					if (previousOverlap.length > 0) {
						allConflicts.push(...this.compareChunks(previousOverlap, currentChunk));
					}
				}

				return allConflicts;
			},

			reset: () => {
				currentChunk.length = 0;
				previousOverlap.length = 0;
				allConflicts.length = 0;
			},

			get pendingCount() {
				return currentChunk.length;
			},

			get conflictCount() {
				return allConflicts.length;
			},
		};
	}

	/**
	 * Memory usage reporting
	 */
	getMemoryUsage(): MemoryStats {
		const mem = process.memoryUsage();
		return {
			heapUsedMB: +(mem.heapUsed / 1024 / 1024).toFixed(2),
			heapTotalMB: +(mem.heapTotal / 1024 / 1024).toFixed(2),
			rssMB: +(mem.rss / 1024 / 1024).toFixed(2),
		};
	}
}

export interface StreamScanner {
	addVariable: (variable: VariableInfo) => void;
	flush: () => Conflict[];
	reset: () => void;
	readonly pendingCount: number;
	readonly conflictCount: number;
}

export interface MemoryStats {
	heapUsedMB: number;
	heapTotalMB: number;
	rssMB: number;
}

// CLI usage
if (import.meta.main) {
	const scanner = new MemoryOptimizedScopeScanner({ similarityThreshold: 0.3 });

	// Demo with sample variables
	const testVariables: VariableInfo[] = [
		{ name: "phoneNumber", line: 10, scope: "global" },
		{ name: "phoneNunber", line: 15, scope: "global" }, // Typo
		{ name: "phoneNum", line: 20, scope: "global" },
		{ name: "proxyConfig", line: 25, scope: "global" },
		{ name: "proxyConf", line: 30, scope: "global" },
		{ name: "accountAgent", line: 35, scope: "function" },
		{ name: "accountAgnet", line: 40, scope: "function" }, // Typo
		{ name: "resourceBundle", line: 45, scope: "module" },
		{ name: "simCard", line: 50, scope: "module" },
		{ name: "imeiNumber", line: 55, scope: "module" },
		{ name: "imeiNumer", line: 60, scope: "module" }, // Typo
	];

	logger.info("Memory before scan:", scanner.getMemoryUsage());

	const conflicts = await scanner.scanLargeScope("demo", testVariables, false);

	logger.info("\nConflicts found:", conflicts.length);
	for (const c of conflicts) {
		logger.info(
			`  ${c.risk.toUpperCase()}: "${c.var1.name}" vs "${c.var2.name}" (${(c.similarity * 100).toFixed(0)}% similar)`,
		);
	}

	logger.info("\nMemory after scan:", scanner.getMemoryUsage());

	// Test streaming API
	logger.info("\n--- Streaming Scanner Test ---");
	const stream = scanner.createStreamScanner();

	for (const v of testVariables) {
		stream.addVariable(v);
	}

	const streamConflicts = stream.flush();
	logger.info("Stream conflicts:", streamConflicts.length);
}
