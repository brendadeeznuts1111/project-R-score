// utils/toml-parser-safe.ts
// Safe TOML parsing with stack overflow protection and comprehensive error handling
// Built for Bun v1.3.7+ with additional safety measures

import { fastHash } from "./common";

export interface SafeTomlParseOptions {
	/** Maximum file size in bytes (default: 10MB) */
	maxFileSize?: number;
	/** Maximum parsing depth for nested structures (default: 1000) */
	maxDepth?: number;
	/** Enable detailed error reporting (default: true) */
	verboseErrors?: boolean;
	/** Cache parsed results (default: true) */
	enableCache?: boolean;
	/** Custom cache TTL in milliseconds (default: 10 minutes) */
	cacheTTL?: number;
}

export interface TomlParseResult {
	success: boolean;
	data?: any;
	error?: string;
	metadata?: {
		size: number;
		parseTime: number;
		fromCache: boolean;
		depth: number;
	};
}

const DEFAULT_OPTIONS: Required<SafeTomlParseOptions> = {
	maxFileSize: 10 * 1024 * 1024, // 10MB
	maxDepth: 1000,
	verboseErrors: true,
	enableCache: true,
	cacheTTL: 10 * 60 * 1000, // 10 minutes
};

// Simple LRU cache for parsed TOML
const parseCache = new Map<
	string,
	{ data: any; timestamp: number; depth: number }
>();
const MAX_CACHE_SIZE = 100;

/**
 * Safe TOML parsing with stack overflow protection and comprehensive validation
 *
 * This utility provides additional safety on top of Bun v1.3.7's built-in stack overflow checks
 * for maximum reliability when parsing untrusted or large TOML files.
 */
export function safeParseToml(
	content: string,
	options: SafeTomlParseOptions = {},
): TomlParseResult {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const startTime = performance.now();

	// Input validation
	if (typeof content !== "string") {
		return {
			success: false,
			error: "Content must be a string",
		};
	}

	// Size check
	const contentSize = Buffer.byteLength(content, "utf8");
	if (contentSize > opts.maxFileSize) {
		return {
			success: false,
			error: `Content too large: ${contentSize} bytes (max: ${opts.maxFileSize} bytes)`,
		};
	}

	// Cache check
	if (opts.enableCache) {
		const cacheKey = fastHash(content).toString();
		const cached = parseCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < opts.cacheTTL) {
			return {
				success: true,
				data: cached.data,
				metadata: {
					size: contentSize,
					parseTime: performance.now() - startTime,
					fromCache: true,
					depth: cached.depth,
				},
			};
		}
	}

	try {
		// Pre-parse validation for common stack overflow patterns
		const validationResult = validateTomlStructure(content, opts.maxDepth);
		if (!validationResult.valid) {
			return {
				success: false,
				error: validationResult.error,
			};
		}

		// Parse with Bun's native TOML parser (v1.3.7+ has stack overflow protection)
		const parsed = Bun.TOML.parse(content);

		// Post-parse depth validation
		const actualDepth = calculateObjectDepth(parsed);
		if (actualDepth > opts.maxDepth) {
			return {
				success: false,
				error: `Object depth too large: ${actualDepth} (max: ${opts.maxDepth})`,
			};
		}

		// Cache the result
		if (opts.enableCache) {
			const cacheKey = fastHash(content).toString();

			// Maintain cache size
			if (parseCache.size >= MAX_CACHE_SIZE) {
				const oldestKey = parseCache.keys().next().value;
				parseCache.delete(oldestKey);
			}

			parseCache.set(cacheKey, {
				data: parsed,
				timestamp: Date.now(),
				depth: actualDepth,
			});
		}

		return {
			success: true,
			data: parsed,
			metadata: {
				size: contentSize,
				parseTime: performance.now() - startTime,
				fromCache: false,
				depth: actualDepth,
			},
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		// Enhanced error messages for common issues
		let enhancedError = errorMessage;
		if (opts.verboseErrors) {
			if (
				errorMessage.includes("stack overflow") ||
				errorMessage.includes("Maximum call stack")
			) {
				enhancedError = `Stack overflow detected: The TOML structure is too deeply nested. Consider flattening the structure or increasing maxDepth option.`;
			} else if (
				errorMessage.includes("unexpected") ||
				errorMessage.includes("Failed to parse toml")
			) {
				enhancedError = `TOML syntax error: ${errorMessage}. Check for missing quotes, invalid characters, or malformed tables.`;
			} else if (errorMessage.includes("duplicate")) {
				enhancedError = `Duplicate key error: ${errorMessage}. TOML keys must be unique within their scope.`;
			}
		}

		return {
			success: false,
			error: enhancedError,
		};
	}
}

/**
 * Validates TOML structure for potential stack overflow issues before parsing
 */
function validateTomlStructure(
	content: string,
	maxDepth: number,
): { valid: boolean; error?: string } {
	const lines = content.split("\n");
	let currentDepth = 0;
	let maxObservedDepth = 0;
	let inMultilineString = false;
	let multilineStringDelimiter = "";

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// Skip empty lines and comments
		if (!line || line.startsWith("#")) continue;

		// Handle multiline strings
		if (
			!inMultilineString &&
			(line.startsWith('"""') || line.startsWith("'''"))
		) {
			inMultilineString = true;
			multilineStringDelimiter = line.slice(0, 3);
			// Check if it's a single-line multiline string
			if (line.endsWith(multilineStringDelimiter) && line.length > 6) {
				inMultilineString = false;
			}
			continue;
		} else if (inMultilineString && line.endsWith(multilineStringDelimiter)) {
			inMultilineString = false;
			continue;
		} else if (inMultilineString) {
			continue;
		}

		// Count table nesting
		const tableMatch = line.match(/^\[+([^\]]+)\]+$/);
		if (tableMatch) {
			const openBrackets = (line.match(/^\[/g) || []).length;
			const closeBrackets = (line.match(/\]$/g) || []).length;

			if (openBrackets !== closeBrackets) {
				return {
					valid: false,
					error: `Unmatched table brackets at line ${i + 1}: ${line}`,
				};
			}

			// Each set of brackets represents a nesting level
			currentDepth = openBrackets;
			maxObservedDepth = Math.max(maxObservedDepth, currentDepth);

			if (maxObservedDepth > maxDepth) {
				return {
					valid: false,
					error: `Table nesting too deep: ${maxObservedDepth} levels at line ${i + 1} (max: ${maxDepth})`,
				};
			}
		}

		// Check for array nesting patterns that could cause stack overflow
		const arrayMatch = line.match(/^(\s*)([^=]+)\s*=\s*\[/);
		if (arrayMatch) {
			const arrayContent = line.substring(line.indexOf("["));
			const bracketDepth = (arrayContent.match(/\[/g) || []).length;

			if (bracketDepth > maxDepth / 2) {
				// Arrays can be nested within tables
				return {
					valid: false,
					error: `Array nesting potentially too deep at line ${i + 1}: ${bracketDepth} levels`,
				};
			}
		}
	}

	return { valid: true };
}

/**
 * Calculates the maximum depth of a parsed object
 */
function calculateObjectDepth(obj: any, currentDepth = 0): number {
	if (typeof obj !== "object" || obj === null) {
		return currentDepth;
	}

	if (currentDepth > 1000) {
		// Safety check
		return currentDepth;
	}

	let maxDepth = currentDepth;

	for (const value of Object.values(obj)) {
		if (typeof value === "object" && value !== null) {
			if (Array.isArray(value)) {
				for (const item of value) {
					const itemDepth = calculateObjectDepth(item, currentDepth + 1);
					maxDepth = Math.max(maxDepth, itemDepth);
				}
			} else {
				// For nested objects, increment depth
				const objectDepth = calculateObjectDepth(value, currentDepth + 1);
				maxDepth = Math.max(maxDepth, objectDepth);
			}
		}
	}

	return maxDepth;
}

/**
 * Clear the TOML parse cache
 */
export function clearTomlParseCache(): void {
	parseCache.clear();
}

/**
 * Get cache statistics
 */
export function getTomlParseCacheStats(): {
	size: number;
	maxSize: number;
	entries: Array<{ key: string; age: number; depth: number }>;
} {
	const entries = Array.from(parseCache.entries()).map(([key, value]) => ({
		key,
		age: Date.now() - value.timestamp,
		depth: value.depth,
	}));

	return {
		size: parseCache.size,
		maxSize: MAX_CACHE_SIZE,
		entries,
	};
}

/**
 * Parse TOML file safely with file system error handling
 */
export async function safeParseTomlFile(
	filePath: string,
	options: SafeTomlParseOptions = {},
): Promise<TomlParseResult> {
	try {
		const file = Bun.file(filePath);

		// Check if file exists
		if (!(await file.exists())) {
			return {
				success: false,
				error: `File not found: ${filePath}`,
			};
		}

		// Check file size before reading
		const fileSize = file.size;
		if (fileSize > (options.maxFileSize ?? DEFAULT_OPTIONS.maxFileSize)) {
			return {
				success: false,
				error: `File too large: ${fileSize} bytes (max: ${options.maxFileSize ?? DEFAULT_OPTIONS.maxFileSize} bytes)`,
			};
		}

		const content = await file.text();
		return safeParseToml(content, options);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			error: `Failed to read file ${filePath}: ${errorMessage}`,
		};
	}
}

// Export a convenient default instance
export const parseTomlSafe = safeParseToml;
export const parseTomlFileSafe = safeParseTomlFile;
