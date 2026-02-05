/**
 * Bun v1.3.7 Integration Utilities
 *
 * New APIs available in Bun v1.3.7:
 * - Bun.Glob: Fast file globbing with pattern matching
 * - Bun.Archive: Create/extract tarballs with gzip compression
 * - Bun.JSONC: Parse JSON with comments
 * - Bun.stripANSI: SIMD-accelerated ANSI escape removal
 */

import { Glob } from "bun";

export interface GlobOptions {
	cwd?: string;
	absolute?: boolean;
	followSymlinks?: boolean;
	onlyFiles?: boolean;
	onlyDirectories?: boolean;
}

/**
 * Find files using Bun.Glob (v1.3.7+)
 * Much faster than fs.readdirSync with manual filtering
 */
export async function globFiles(
	pattern: string,
	options: GlobOptions = {},
): Promise<string[]> {
	const glob = new Glob(pattern);
	const results: string[] = [];

	for await (const file of glob.scan({
		cwd: options.cwd ?? process.cwd(),
		absolute: options.absolute ?? false,
	})) {
		results.push(file);
	}

	return results;
}

/**
 * Synchronous version of globFiles
 */
export function globFilesSync(
	pattern: string,
	options: GlobOptions = {},
): string[] {
	const glob = new Glob(pattern);
	const results: string[] = [];

	for (const file of glob.scanSync({
		cwd: options.cwd ?? process.cwd(),
		absolute: options.absolute ?? false,
	})) {
		results.push(file);
	}

	return results;
}

/**
 * Create a tarball archive using Bun.Archive (v1.3.7+)
 * @param outputPath - Output path for the archive (.tar or .tar.gz)
 * @param files - Array of file paths to include
 * @param options - Archive options
 */
export async function createArchive(
	outputPath: string,
	files: string[],
	options: {
		compression?: "gzip" | "none";
		baseDir?: string;
	} = {},
): Promise<void> {
	// Bun.Archive is a constructor function with write method
	await Bun.Archive.write(outputPath, files, {
		compression: options.compression ?? "gzip",
		cwd: options.baseDir,
	});
}

/**
 * Extract a tarball archive
 * Note: Bun.Archive doesn't have extract yet, using manual implementation
 * @param archivePath - Path to the archive (.tar or .tar.gz)
 * @param outputDir - Directory to extract to
 */
export async function extractArchive(
	archivePath: string,
	outputDir: string,
): Promise<void> {
	// For now, use the system tar command
	// Bun.Archive.extract may come in a future version
	const proc = Bun.spawn(["tar", "-xzf", archivePath, "-C", outputDir], {
		stdout: "inherit",
		stderr: "inherit",
	});
	await proc.exited;

	if (proc.exitCode !== 0) {
		throw new Error(`Failed to extract archive: exit code ${proc.exitCode}`);
	}
}

/**
 * Parse JSON with comments (JSONC format)
 * Supports single-line and multi-line comments
 */
export function parseJSONC<T = unknown>(text: string): T {
	return Bun.JSONC.parse(text) as T;
}

/**
 * Parse JSONC from a file
 */
export async function parseJSONCFile<T = unknown>(path: string): Promise<T> {
	const content = await Bun.file(path).text();
	return parseJSONC<T>(content);
}

/**
 * Strip ANSI escape codes from text (SIMD-accelerated)
 * 10-20x faster than regex-based approaches
 */
export function stripAnsi(text: string): string {
	return Bun.stripANSI(text);
}

/**
 * Find TOML config files in a directory
 * Uses Bun.Glob for optimal performance
 */
export async function findTomlConfigs(dir: string): Promise<string[]> {
	return globFiles("*.toml", { cwd: dir, absolute: true });
}

/**
 * Find all source files for a project
 * Excludes node_modules, dist, etc.
 */
export async function findSourceFiles(
	dir: string,
	extensions: string[] = ["ts", "js", "tsx", "jsx"],
): Promise<string[]> {
	const patterns = extensions.map((ext) => `**/*.${ext}`);
	const allFiles: string[] = [];

	for (const pattern of patterns) {
		const files = await globFiles(pattern, {
			cwd: dir,
			absolute: true,
		});
		allFiles.push(...files);
	}

	// Filter out common excluded directories
	const excludeDirs = ["node_modules", "dist", ".git", "coverage", "logs"];
	return allFiles.filter(
		(file) => !excludeDirs.some((dir) => file.includes(`/${dir}/`)),
	);
}

/**
 * Create a backup archive of configuration files
 */
export async function backupConfigs(
	sourceDir: string,
	backupPath: string,
): Promise<{ files: string[]; size: number }> {
	// Find all config files
	const patterns = ["*.toml", "*.json", "*.jsonc", "*.yaml", "*.yml", ".env*"];
	const allFiles: string[] = [];

	for (const pattern of patterns) {
		const files = await globFiles(pattern, { cwd: sourceDir });
		allFiles.push(...files.map((f) => `${sourceDir}/${f}`));
	}

	// Create archive
	await createArchive(backupPath, allFiles);

	// Get archive size
	const stats = await Bun.file(backupPath).stat();

	return {
		files: allFiles,
		size: stats.size,
	};
}

/**
 * Performance comparison helper
 * Compare Bun.Glob vs fs.readdirSync + filter
 */
export async function benchmarkGlob(
	dir: string,
	pattern: string,
	iterations = 100,
): Promise<{
	globTime: number;
	readdirTime: number;
	speedup: number;
}> {
	const { readdirSync } = await import("node:fs");
	const { join } = await import("node:path");

	// Benchmark Bun.Glob
	const globStart = performance.now();
	for (let i = 0; i < iterations; i++) {
		const glob = new Glob(pattern);
		for (const _ of glob.scanSync({ cwd: dir })) {
			// Consume iterator
		}
	}
	const globTime = performance.now() - globStart;

	// Benchmark readdirSync + filter
	const readdirStart = performance.now();
	const regex = new RegExp(
		pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*"),
	);
	for (let i = 0; i < iterations; i++) {
		const files = readdirSync(dir, { recursive: true });
		for (const file of files) {
			if (regex.test(file as string)) {
				// Match found
			}
		}
	}
	const readdirTime = performance.now() - readdirStart;

	return {
		globTime,
		readdirTime,
		speedup: readdirTime / globTime,
	};
}
