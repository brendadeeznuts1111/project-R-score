/**
 * Batch frontmatter extraction
 * Processes multiple markdown files in parallel using Bun.Glob + Bun.file
 */

import { extractFrontmatter, type FrontmatterResult } from "./extractor";
import { type NormalizationOptions, normalizeFrontmatter } from "./normalizer";
import {
	type FrontmatterSchema,
	type ValidationResult,
	validateFrontmatter,
} from "./validator";

export interface BatchEntry {
	path: string;
	frontmatter: FrontmatterResult;
	normalized: Record<string, unknown>;
	validation: ValidationResult | null;
	hash: string;
}

export interface BatchOptions {
	/** Glob pattern (default: "**\/*.md") */
	pattern?: string;
	/** Normalization options */
	normalize?: NormalizationOptions;
	/** Optional schema for validation */
	schema?: FrontmatterSchema;
}

export interface BatchResult {
	entries: BatchEntry[];
	totalFiles: number;
	withFrontmatter: number;
	errorCount: number;
	elapsedMs: number;
}

/**
 * Batch-extract frontmatter from all matching markdown files in a directory.
 * Returns parsed, normalized, and optionally validated metadata for each file.
 */
export async function batchExtractFrontmatter(
	dir: string,
	options?: BatchOptions,
): Promise<BatchResult> {
	const t0 = Bun.nanoseconds();
	const pattern = options?.pattern ?? "**/*.md";
	const glob = new Bun.Glob(pattern);
	const paths: string[] = [];

	for await (const path of glob.scan({ cwd: dir, absolute: true })) {
		paths.push(path);
	}

	// Process files in parallel
	const entries = await Promise.all(
		paths.map(async (filePath): Promise<BatchEntry> => {
			const file = Bun.file(filePath);
			const text = await file.text();
			const hasher = new Bun.CryptoHasher("md5");
			hasher.update(text);
			const hash = hasher.digest("hex");

			const frontmatter = extractFrontmatter(text);
			const normalized = normalizeFrontmatter(frontmatter.data, options?.normalize);
			const validation = options?.schema
				? validateFrontmatter(normalized, options.schema)
				: null;

			return { path: filePath, frontmatter, normalized, validation, hash };
		}),
	);

	const elapsedMs = (Bun.nanoseconds() - t0) / 1e6;
	const withFrontmatter = entries.filter((e) => e.frontmatter.format !== "none").length;
	const errorCount = entries.filter((e) => e.frontmatter.errors.length > 0).length;

	return {
		entries,
		totalFiles: entries.length,
		withFrontmatter,
		errorCount,
		elapsedMs,
	};
}

/**
 * Generate a JSON index from batch results.
 * Suitable for search indices, RSS feeds, or static site generation.
 */
export function generateIndex(result: BatchResult): Record<string, unknown>[] {
	return result.entries
		.filter((e) => e.frontmatter.format !== "none")
		.map((e) => ({
			path: e.path,
			format: e.frontmatter.format,
			hash: e.hash,
			...e.normalized,
		}));
}

/**
 * Write the batch index to a JSON file.
 */
export async function writeIndex(
	result: BatchResult,
	outputPath: string,
): Promise<void> {
	const index = generateIndex(result);
	await Bun.write(outputPath, JSON.stringify(index, null, 2));
}
