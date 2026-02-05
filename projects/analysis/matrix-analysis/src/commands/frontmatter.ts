/**
 * CLI commands for frontmatter extraction
 */

import {
	batchExtractFrontmatter,
	generateIndex,
	writeIndex,
} from "../lib/frontmatter/batch";
import { extractFrontmatter } from "../lib/frontmatter/extractor";
import { injectIntoHtml } from "../lib/frontmatter/inject";
import { normalizeFrontmatter } from "../lib/frontmatter/normalizer";
import type { FrontmatterSchema } from "../lib/frontmatter/validator";
import { validateFrontmatter } from "../lib/frontmatter/validator";

// ─── Col-89 Unicode-Aware Table ─────────────────────────────────────────────

const COL_WIDTH = 89;
// Table chrome: "│ " + index col (~4) + " │ " + key col + " │ " + value col + " │"
// Overhead per row: index(~4) + key + value + 5 separators × 3 chars = ~19 chars chrome
const TABLE_CHROME = 19;

/**
 * Truncate a string to fit a visual width budget using Bun.stringWidth.
 * Appends "…" if truncated.
 */
function truncateToWidth(str: string, maxWidth: number): string {
	const width = Bun.stringWidth(str);
	if (width <= maxWidth) return str;
	// Binary search for the cut point
	let lo = 0;
	let hi = str.length;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (Bun.stringWidth(str.slice(0, mid)) <= maxWidth - 1) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}
	return str.slice(0, lo) + "…";
}

/**
 * Print a key-value table within Col-89 using Bun.inspect.table.
 * Measures the widest key, allocates remaining budget to values,
 * and truncates with Bun.stringWidth awareness.
 */
function printKvTable(
	entries: { key: string; value: string; type?: string }[],
	columns: string[] = ["key", "value"],
): void {
	const hasType = columns.includes("type");
	const typeWidth = hasType ? 10 : 0; // "boolean" = 7, "string" = 6, + padding

	const maxKeyWidth = Math.max(...entries.map((e) => Bun.stringWidth(e.key)));
	const valueBudget = COL_WIDTH - TABLE_CHROME - maxKeyWidth - typeWidth;

	const rows = entries.map((e) => {
		const truncated = truncateToWidth(e.value, Math.max(valueBudget, 20));
		return hasType
			? { key: e.key, value: truncated, type: e.type ?? "" }
			: { key: e.key, value: truncated };
	});

	console.log(Bun.inspect.table(rows, columns));
}

/**
 * Extract and display frontmatter from a single file.
 */
export async function frontmatterDebug(filePath: string): Promise<void> {
	const file = Bun.file(filePath);
	if (!(await file.exists())) {
		console.error(`File not found: ${filePath}`);
		process.exit(1);
	}

	const md = await file.text();
	const result = extractFrontmatter(md);
	const normalized = normalizeFrontmatter(result.data, { seoMapping: true });

	console.log(`Format: ${result.format}`);
	if (result.errors.length > 0) {
		console.log(`Errors: ${result.errors.join(", ")}`);
	}
	console.log(`Fields: ${Object.keys(result.data).length}`);
	console.log();

	if (Object.keys(normalized).length > 0) {
		const rows = Object.entries(normalized)
			.filter(([, v]) => typeof v !== "object")
			.map(([key, value]) => ({ key, value: String(value), type: typeof value }));
		if (rows.length > 0) {
			printKvTable(rows, ["key", "value", "type"]);
		}

		// Show nested objects separately
		const nested = Object.entries(normalized).filter(
			([, v]) => typeof v === "object" && v !== null,
		);
		for (const [key, value] of nested) {
			console.log(`${key}:`, JSON.stringify(value, null, 2));
		}
	} else {
		console.log("No frontmatter found.");
	}
}

/**
 * Batch extract frontmatter from a directory and optionally write index.
 */
export async function frontmatterBatch(
	dir: string,
	options: {
		indexJson?: string;
		schema?: string;
		pattern?: string;
	},
): Promise<void> {
	let schema: FrontmatterSchema | undefined;
	if (options.schema) {
		const schemaFile = Bun.file(options.schema);
		if (await schemaFile.exists()) {
			schema = await schemaFile.json();
		} else {
			console.error(`Schema file not found: ${options.schema}`);
			process.exit(1);
		}
	}

	const result = await batchExtractFrontmatter(dir, {
		pattern: options.pattern,
		schema,
	});

	// Summary table
	const summary = [
		{ metric: "Total files", value: result.totalFiles },
		{ metric: "With frontmatter", value: result.withFrontmatter },
		{ metric: "Errors", value: result.errorCount },
		{ metric: "Elapsed", value: `${result.elapsedMs.toFixed(2)}ms` },
	];
	console.log(Bun.inspect.table(summary, ["metric", "value"]));

	// Format breakdown
	const formatCounts: Record<string, number> = {};
	for (const entry of result.entries) {
		formatCounts[entry.frontmatter.format] =
			(formatCounts[entry.frontmatter.format] || 0) + 1;
	}
	const formatRows = Object.entries(formatCounts).map(([format, count]) => ({
		format,
		count,
	}));
	console.log(Bun.inspect.table(formatRows, ["format", "count"]));

	// Show errors if any
	const errors = result.entries.filter((e) => e.frontmatter.errors.length > 0);
	if (errors.length > 0) {
		console.log("\nErrors:");
		for (const entry of errors) {
			console.log(`  ${entry.path}: ${entry.frontmatter.errors.join(", ")}`);
		}
	}

	// Show validation failures if schema was provided
	const failures = result.entries.filter((e) => e.validation && !e.validation.valid);
	if (failures.length > 0) {
		console.log("\nValidation failures:");
		for (const entry of failures) {
			console.log(`  ${entry.path}:`);
			for (const err of entry.validation!.errors) {
				console.log(`    ${err.field}: ${err.message}`);
			}
		}
	}

	// Write index if requested
	if (options.indexJson) {
		await writeIndex(result, options.indexJson);
		console.log(`\nIndex written to: ${options.indexJson}`);
	}
}

/**
 * Validate a single file's frontmatter against a schema.
 */
export async function frontmatterValidate(
	filePath: string,
	schemaPath: string,
): Promise<void> {
	const [fileContent, schemaContent] = await Promise.all([
		Bun.file(filePath).text(),
		Bun.file(schemaPath).json(),
	]);

	const extracted = extractFrontmatter(fileContent);
	if (extracted.format === "none") {
		console.log("No frontmatter found.");
		return;
	}

	const normalized = normalizeFrontmatter(extracted.data);
	const result = validateFrontmatter(normalized, schemaContent as FrontmatterSchema);

	if (result.valid) {
		console.log("Validation passed.");
	} else {
		console.log("Validation failed:");
		for (const err of result.errors) {
			console.log(
				`  ${err.field}: ${err.message}${err.actual ? ` (got: ${err.actual})` : ""}`,
			);
		}
		process.exit(1);
	}
}

/**
 * Convert HTML from Bun.markdown.html() to ANSI-styled terminal output.
 * Uses simple tag replacement — handles the common markdown elements.
 */
function htmlToAnsi(html: string): string {
	return html
		.replace(
			/<h([1-6])[^>]*>(.*?)<\/h\1>/g,
			(_, level, text) => `\x1b[1;4m${"#".repeat(Number(level))} ${text}\x1b[0m\n`,
		)
		.replace(/<p>([\s\S]*?)<\/p>/g, (_, text) => `${text}\n`)
		.replace(/<strong>(.*?)<\/strong>/g, (_, text) => `\x1b[1m${text}\x1b[22m`)
		.replace(/<em>(.*?)<\/em>/g, (_, text) => `\x1b[3m${text}\x1b[23m`)
		.replace(/<del>(.*?)<\/del>/g, (_, text) => `\x1b[9m${text}\x1b[29m`)
		.replace(/<code>(.*?)<\/code>/g, (_, text) => `\x1b[36m${text}\x1b[0m`)
		.replace(
			/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
			(_, code) =>
				`\x1b[2m${code.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")}\x1b[0m`,
		)
		.replace(
			/<a href="([^"]*)"[^>]*>(.*?)<\/a>/g,
			(_, href, text) => `\x1b[4;34m${text}\x1b[0m (${href})`,
		)
		.replace(/<li[^>]*>([\s\S]*?)<\/li>/g, (_, text) => `  - ${text.trim()}\n`)
		.replace(
			/<blockquote>\s*([\s\S]*?)\s*<\/blockquote>/g,
			(_, text) => `\x1b[2m> ${text.trim()}\x1b[0m\n`,
		)
		.replace(/<hr\s*\/?>/g, `${"─".repeat(40)}\n`)
		.replace(/<table>[\s\S]*?<\/table>/g, (match) => {
			// Simple table rendering — extract cells
			const rows = match.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
			return (
				rows
					.map((row) => {
						const cells = (row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g) ?? []).map(
							(c) => c.replace(/<\/?t[hd][^>]*>/g, "").trim(),
						);
						return `  ${cells.join("  |  ")}`;
					})
					.join("\n") + "\n"
			);
		})
		.replace(/<img[^>]*alt="([^"]*)"[^>]*>/g, "[image: $1]")
		.replace(/<[^>]+>/g, "")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/**
 * Convert a markdown file to HTML with frontmatter-injected metadata.
 * With --ansi, renders to terminal instead.
 */
export async function frontmatterRender(
	filePath: string,
	options: {
		output?: string;
		siteUrl?: string;
		ansi?: boolean;
	},
): Promise<void> {
	const md = await Bun.file(filePath).text();
	const extracted = extractFrontmatter(md);
	const normalized = normalizeFrontmatter(extracted.data, { seoMapping: true });

	// ANSI terminal preview mode
	if (options.ansi) {
		if (Object.keys(normalized).length > 0) {
			console.log(`\x1b[2m--- frontmatter (${extracted.format}) ---\x1b[0m`);
			const rows = Object.entries(normalized)
				.filter(([, v]) => typeof v !== "object")
				.map(([key, value]) => ({ key, value: String(value) }));
			if (rows.length > 0) {
				printKvTable(rows);
			}
			console.log(`\x1b[2m---\x1b[0m\n`);
		}
		const html = Bun.markdown.html(extracted.content);
		console.log(htmlToAnsi(html));
		return;
	}

	// HTML render with headingIds for anchor links
	const bodyHtml = Bun.markdown.html(extracted.content, { headingIds: true });

	const title = Bun.escapeHTML(String(normalized.title ?? ""));
	const shell = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
</head>
<body>
${bodyHtml}
</body>
</html>`;

	const fullHtml = injectIntoHtml(shell, normalized, {
		modes: ["meta", "opengraph", "jsonld"],
		siteUrl: options.siteUrl,
	});

	if (options.output) {
		await Bun.write(options.output, fullHtml);
		console.log(`Written to: ${options.output}`);
	} else {
		console.log(fullHtml);
	}
}
