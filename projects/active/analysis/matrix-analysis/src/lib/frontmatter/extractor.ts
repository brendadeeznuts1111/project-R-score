/**
 * Multi-format frontmatter extractor
 * Detects and parses YAML (---), TOML (+++), and JSON ({}) frontmatter
 */

import { YAML } from "bun";

export type FrontmatterFormat = "yaml" | "toml" | "json" | "none";

export interface FrontmatterResult {
	data: Record<string, unknown>;
	content: string;
	format: FrontmatterFormat;
	raw: string;
	errors: string[];
}

const YAML_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const TOML_RE = /^\+\+\+[ \t]*\r?\n([\s\S]*?)\r?\n\+\+\+[ \t]*(?:\r?\n|$)/;

/**
 * Extract frontmatter from a markdown string.
 * Tries YAML, then TOML, then JSON in order.
 * Returns parsed data, remaining content, detected format, and any errors.
 */
export function extractFrontmatter(markdown: string): FrontmatterResult {
	const result: FrontmatterResult = {
		data: {},
		content: markdown,
		format: "none",
		raw: "",
		errors: [],
	};

	if (!markdown || typeof markdown !== "string") {
		return result;
	}

	// YAML: --- ... ---
	const yamlMatch = markdown.match(YAML_RE);
	if (yamlMatch) {
		try {
			const parsed = YAML.parse(yamlMatch[1]);
			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				result.data = parsed as Record<string, unknown>;
				result.content = markdown.slice(yamlMatch[0].length);
				result.format = "yaml";
				result.raw = yamlMatch[1];
				return result;
			}
			// Scalar or array YAML — treat as no frontmatter
			result.errors.push("YAML frontmatter must be an object (got scalar or array)");
			return result;
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			result.errors.push(`YAML parse error: ${msg}`);
			return result;
		}
	}

	// TOML: +++ ... +++
	const tomlMatch = markdown.match(TOML_RE);
	if (tomlMatch) {
		try {
			const parsed = Bun.TOML.parse(tomlMatch[1]);
			if (parsed && typeof parsed === "object") {
				result.data = parsed as Record<string, unknown>;
				result.content = markdown.slice(tomlMatch[0].length);
				result.format = "toml";
				result.raw = tomlMatch[1];
				return result;
			}
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			result.errors.push(`TOML parse error: ${msg}`);
			return result;
		}
	}

	// JSON: { ... } at very start, terminated by blank line
	const trimmed = markdown.trimStart();
	if (trimmed.startsWith("{")) {
		const leadingWs = markdown.length - trimmed.length;
		// Find closing brace followed by double newline or EOF
		let braceDepth = 0;
		let endIdx = -1;
		for (let i = 0; i < trimmed.length; i++) {
			const ch = trimmed[i];
			if (ch === "{") braceDepth++;
			else if (ch === "}") {
				braceDepth--;
				if (braceDepth === 0) {
					endIdx = i;
					break;
				}
			}
			// Skip over strings to avoid counting braces inside strings
			if (ch === '"') {
				i++;
				while (i < trimmed.length && trimmed[i] !== '"') {
					if (trimmed[i] === "\\") i++; // skip escaped char
					i++;
				}
			}
		}

		if (endIdx > 0) {
			const jsonStr = trimmed.slice(0, endIdx + 1);
			try {
				const parsed = JSON.parse(jsonStr);
				if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
					result.data = parsed;
					// Skip any trailing newlines after the JSON block
					let contentStart = leadingWs + endIdx + 1;
					while (contentStart < markdown.length && markdown[contentStart] === "\n") {
						contentStart++;
					}
					result.content = markdown.slice(contentStart);
					result.format = "json";
					result.raw = jsonStr;
					return result;
				}
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : String(e);
				result.errors.push(`JSON parse error: ${msg}`);
				return result;
			}
		}
	}

	return result;
}
