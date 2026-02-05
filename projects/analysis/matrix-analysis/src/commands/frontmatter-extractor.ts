#!/usr/bin/env bun

/**
 * FactoryWager Frontmatter Engine v1.0
 * Multi-format frontmatter detection + normalization + batch processing
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface FrontmatterResult {
	data: Record<string, any>;
	content: string;
	format: "yaml" | "toml" | "json" | "none";
	raw: string;
	errors?: string[];
}

/**
 * Extract frontmatter from markdown content
 * Supports YAML, TOML, and JSON formats
 */
export function extractFrontmatter(markdown: string): FrontmatterResult {
	const result: FrontmatterResult = {
		data: {},
		content: markdown,
		format: "none",
		raw: "",
	};

	// YAML --- ... ---
	const yamlMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (yamlMatch) {
		try {
			result.data = Bun.YAML.parse(yamlMatch[1]) || {};
			result.content = markdown.slice(yamlMatch[0].length);
			result.format = "yaml";
			result.raw = yamlMatch[1];
			return result;
		} catch (e: any) {
			result.errors = [`YAML parse error: ${e.message}`];
		}
	}

	// TOML +++ ... +++
	const tomlMatch = markdown.match(/^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?/);
	if (tomlMatch) {
		try {
			result.data = parseTOML(tomlMatch[1]) || {};
			result.content = markdown.slice(tomlMatch[0].length);
			result.format = "toml";
			result.raw = tomlMatch[1];
			return result;
		} catch (e: any) {
			result.errors = [`TOML parse error: ${e.message}`];
		}
	}

	// JSON { ... } at very beginning
	if (markdown.trimStart().startsWith("{")) {
		try {
			const end = markdown.indexOf("}\n\n") + 1;
			if (end > 1) {
				const jsonStr = markdown.slice(0, end + 1);
				result.data = JSON.parse(jsonStr);
				result.content = markdown.slice(end + 1);
				result.format = "json";
				result.raw = jsonStr;
				return result;
			}
		} catch (e: any) {
			result.errors = [`JSON parse error: ${e.message}`];
		}
	}

	return result;
}

/**
 * Normalize common frontmatter keys
 */
export function normalizeFrontmatter(data: Record<string, any>): Record<string, any> {
	const normalized = { ...data };

	// Date normalization
	if (normalized.date || normalized.published) {
		const d = new Date(normalized.date || normalized.published);
		if (!isNaN(d.getTime())) {
			normalized.date_iso = d.toISOString();
		}
	}

	// Tags/Categories normalization
	if (typeof normalized.tags === "string") {
		normalized.tags = normalized.tags.split(/[\s,]+/).filter(Boolean);
	}
	if (typeof normalized.categories === "string") {
		normalized.categories = normalized.categories.split(/[\s,]+/).filter(Boolean);
	}

	// SEO meta mapping
	if ("title" in normalized) {
		normalized.meta = normalized.meta || {};
		normalized.meta.title = normalized.title;
	}

	return normalized;
}

/**
 * Simple TOML parser (basic implementation)
 */
function parseTOML(toml: string): Record<string, any> {
	const result: Record<string, any> = {};
	const lines = toml.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const equalIndex = trimmed.indexOf("=");
		if (equalIndex > 0) {
			const key = trimmed.slice(0, equalIndex).trim();
			const value = trimmed.slice(equalIndex + 1).trim();

			if (value.startsWith('"') && value.endsWith('"')) {
				result[key] = value.slice(1, -1);
			} else if (value.startsWith("[") && value.endsWith("]")) {
				// Parse array
				const arrayContent = value.slice(1, -1);
				result[key] = arrayContent
					.split(",")
					.map((item) => item.trim().replace(/['"]/g, ""))
					.filter(Boolean);
			} else if (value === "true" || value === "false") {
				result[key] = value === "true";
			} else if (!isNaN(Number(value))) {
				result[key] = Number(value);
			} else {
				result[key] = value;
			}
		}
	}

	return result;
}

/**
 * Batch process markdown files
 */
export async function batchExtractFrontmatter(
	inputDir: string,
	outputFile: string,
): Promise<void> {
	const startTime = Date.now();
	const results: Array<{
		file: string;
		frontmatter: FrontmatterResult;
		normalized: Record<string, any>;
	}> = [];

	try {
		const files = readFileSync(join(inputDir, "files.txt"), "utf-8")
			.split("\n")
			.filter(Boolean);

		for (const file of files) {
			const content = readFileSync(join(inputDir, file), "utf-8");
			const frontmatter = extractFrontmatter(content);
			const normalized = normalizeFrontmatter(frontmatter.data);

			results.push({ file, frontmatter, normalized });
		}

		const index = {
			generated: new Date().toISOString(),
			total_files: results.length,
			files: results,
		};

		writeFileSync(outputFile, JSON.stringify(index, null, 2));

		const duration = Date.now() - startTime;
		console.log(`✅ Processed ${results.length} files in ${duration}ms`);
		console.log(`📊 Average: ${(duration / results.length).toFixed(2)}ms per file`);
	} catch (error: any) {
		console.error("❌ Batch processing failed:", error.message);
	}
}

// CLI interface
async function main() {
	const args = process.argv.slice(2);

	if (args.includes("--help") || args.includes("-h")) {
		console.log(`
🏭 FactoryWager Frontmatter Engine v1.0

Usage:
  bun run frontmatter-extractor.ts --file <path>           # Extract single file
  bun run frontmatter-extractor.ts --batch <input> <output> # Batch process

Options:
  --file <path>     Extract frontmatter from single file
  --batch <dir> <out>  Batch process directory
  --help, -h        Show this help

Examples:
  bun run frontmatter-extractor.ts --file content/post.md
  bun run frontmatter-extractor.ts --batch content frontmatter-index.json
    `);
		return;
	}

	if (args.includes("--file")) {
		const fileIndex = args.indexOf("--file") + 1;
		if (fileIndex >= args.length) {
			console.error("❌ --file requires a path argument");
			return;
		}

		const filePath = args[fileIndex];
		try {
			const content = readFileSync(filePath, "utf-8");
			const result = extractFrontmatter(content);
			const normalized = normalizeFrontmatter(result.data);

			console.log("📋 Frontmatter Result:");
			console.log(`Format: ${result.format}`);
			console.log(`Data:`, JSON.stringify(normalized, null, 2));
			console.log(`Content length: ${result.content.length} chars`);

			if (result.errors) {
				console.log(`Errors:`, result.errors);
			}
		} catch (error: any) {
			console.error("❌ Failed to process file:", error.message);
		}
		return;
	}

	if (args.includes("--batch")) {
		const inputIndex = args.indexOf("--batch") + 1;
		const outputIndex = inputIndex + 1;

		if (outputIndex >= args.length) {
			console.error("❌ --batch requires input and output arguments");
			return;
		}

		const inputDir = args[inputIndex];
		const outputFile = args[outputIndex];

		await batchExtractFrontmatter(inputDir, outputFile);
		return;
	}

	console.error("❌ No valid command provided. Use --help for usage.");
}

// Run if executed directly
if (import.meta.main) {
	main().catch(console.error);
}
