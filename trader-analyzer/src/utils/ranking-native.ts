/**
 * @fileoverview Native Bun Ranking System
 * @description Ranking and sorting using Bun native APIs
 * @module utils/ranking-native
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-RANKING-NATIVE@0.1.0;instance-id=RANKING-NATIVE-001;version=0.1.0}]
 * [PROPERTIES:{ranking={value:"native-ranking";@root:"ROOT-UTILS";@chain:["BP-RANKING","BP-BUN"];@version:"0.1.0"}}]
 * [CLASS:NativeRankingSystem][#REF:v-0.1.0.BP.RANKING.NATIVE.1.0.A.1.1.UTILS.1.1]]
 */

import { $ } from "bun";

/**
 * Rankable item
 */
export interface RankableItem<T = unknown> {
	id: string;
	score: number;
	data: T;
	metadata?: Record<string, unknown>;
}

/**
 * Ranking options
 */
export interface RankingOptions {
	sortOrder?: "asc" | "desc";
	limit?: number;
	minScore?: number;
	maxScore?: number;
}

/**
 * Native ranking system using Bun APIs
 */
export class NativeRankingSystem {
	/**
	 * Rank items by score
	 */
	rankItems<T>(
		items: RankableItem<T>[],
		options: RankingOptions = {},
	): RankableItem<T>[] {
		const { sortOrder = "desc", limit, minScore, maxScore } = options;

		// Filter by score range
		let filtered = items.filter((item) => {
			if (minScore !== undefined && item.score < minScore) return false;
			if (maxScore !== undefined && item.score > maxScore) return false;
			return true;
		});

		// Sort by score
		filtered.sort((a, b) => {
			const diff = a.score - b.score;
			return sortOrder === "desc" ? -diff : diff;
		});

		// Apply limit
		if (limit !== undefined) {
			filtered = filtered.slice(0, limit);
		}

		// Add rank position
		return filtered.map((item, index) => ({
			...item,
			rank: index + 1,
		}));
	}

	/**
	 * Rank tools by usage (using Bun Shell to count references)
	 */
	async rankToolsByUsage(
		toolNames: string[],
		sourceDir = "src",
	): Promise<Array<{ name: string; count: number; rank: number }>> {
		const rankings: Array<{ name: string; count: number }> = [];

		for (const toolName of toolNames) {
			try {
				// Count occurrences using grep and wc
				const result =
					await $`grep -r "${toolName}" ${sourceDir} | wc -l`.text();
				const count = parseInt(result.trim(), 10) || 0;
				rankings.push({ name: toolName, count });
			} catch {
				rankings.push({ name: toolName, count: 0 });
			}
		}

		// Sort by count descending
		rankings.sort((a, b) => b.count - a.count);

		// Add rank
		return rankings.map((item, index) => ({
			...item,
			rank: index + 1,
		}));
	}

	/**
	 * Rank files by size using Bun Shell
	 */
	async rankFilesBySize(
		directory: string,
		pattern = "*",
		limit = 10,
	): Promise<Array<{ path: string; size: number; rank: number }>> {
		try {
			// Use find with -exec du to get file sizes, then sort
			const result =
				await $`find ${directory} -name "${pattern}" -type f -exec du -b {} + | sort -rn | head -n ${limit}`.text();
			const lines = result.trim().split("\n").filter(Boolean);

			return lines.map((line, index) => {
				const parts = line.trim().split(/\s+/);
				const size = parseInt(parts[0], 10) || 0;
				const path = parts.slice(1).join(" ");

				return {
					path,
					size,
					rank: index + 1,
				};
			});
		} catch {
			return [];
		}
	}

	/**
	 * Rank functions by complexity (using Bun Shell to count lines)
	 */
	async rankFunctionsByComplexity(
		filePath: string,
		limit = 10,
	): Promise<Array<{ name: string; lines: number; rank: number }>> {
		try {
			// Extract function definitions and count lines (simplified)
			const content = await Bun.file(filePath).text();
			const functionMatches = content.matchAll(/function\s+(\w+)/g);

			const functions: Array<{ name: string; lines: number }> = [];

			for (const match of functionMatches) {
				const funcName = match[1];
				// Count lines containing function name (rough estimate)
				const result =
					await $`grep -n "${funcName}" ${filePath} | wc -l`.text();
				const lines = parseInt(result.trim(), 10) || 0;
				functions.push({ name: funcName, lines });
			}

			// Sort by lines descending
			functions.sort((a, b) => b.lines - a.lines);

			// Add rank and limit
			return functions.slice(0, limit).map((item, index) => ({
				...item,
				rank: index + 1,
			}));
		} catch {
			return [];
		}
	}

	/**
	 * Rank by multiple criteria (weighted scoring)
	 */
	rankByMultipleCriteria<T>(
		items: Array<T & { scores: Record<string, number> }>,
		weights: Record<string, number>,
		options: RankingOptions = {},
	): Array<T & { totalScore: number; rank: number }> {
		// Calculate weighted scores
		const scored = items.map((item) => {
			let totalScore = 0;
			for (const [key, weight] of Object.entries(weights)) {
				totalScore += (item.scores[key] || 0) * weight;
			}
			return { ...item, totalScore };
		});

		// Sort by total score
		scored.sort((a, b) => {
			const diff = a.totalScore - b.totalScore;
			return options.sortOrder === "asc" ? diff : -diff;
		});

		// Apply limit
		const limited = options.limit ? scored.slice(0, options.limit) : scored;

		// Add rank
		return limited.map((item, index) => ({
			...item,
			rank: index + 1,
		}));
	}
}

/**
 * Singleton instance
 */
export const nativeRanking = new NativeRankingSystem();
