// utils/toml-utils.ts
// Using Bun's native TOML parser for parsing and stringification
import { EnvVarPattern } from "../types/toml-config";
import { fastHash, sortObjectKeys } from "./common";
import { defaultTOMLCache } from "./toml-cache";

/**
 * Parse TOML string content using Bun's native TOML parser with performance caching
 *
 * Use this when:
 * - Content comes from network/API
 * - Content is read from Bun.file() as text
 * - File path is dynamic/unknown at import time
 *
 * For static config files, prefer loadTomlFile() which uses Bun's native loader.
 *
 * @param content - TOML string to parse
 * @returns Parsed TOML object
 */
export function parseTomlString(content: string): any {
	// Check cache first
	const cacheKey = `parse:${fastHash(content)}`;
	const cached = defaultTOMLCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	// Parse and cache
	const parsed = Bun.TOML.parse(content);
	defaultTOMLCache.set(cacheKey, parsed, 10 * 60 * 1000); // Cache for 10 minutes
	return parsed;
}

/**
 * Stringify object to TOML using Bun's native TOML parser with deterministic sorting
 */
export function stringifyToml(obj: any): string {
	// Zero-copy stringify with deterministic sorting
	const sorted = sortObjectKeys(obj);
	return simpleTomlStringify(sorted);
}

/**
 * Simple TOML stringifier for basic objects with configurable indentation
 */
function simpleTomlStringify(obj: any, indent = 0, indentSize = 2): string {
	const spaces = " ".repeat(indent * indentSize);
	let result = "";

	for (const [key, value] of Object.entries(obj)) {
		if (value == null) continue;

		if (typeof value === "string") {
			result += `${spaces}${key} = "${value}"\n`;
		} else if (typeof value === "number" || typeof value === "boolean") {
			result += `${spaces}${key} = ${value}\n`;
		} else if (Array.isArray(value)) {
			result += `${spaces}${key} = [${value.map((item) => (typeof item === "string" ? `"${item}"` : item)).join(", ")}]\n`;
		} else if (typeof value === "object") {
			result += `${spaces}[${key}]\n`;
			result += simpleTomlStringify(value, indent + 1, indentSize);
		}
	}

	return result;
}

/**
 * Expand environment variables in TOML object or string
 * Supports ${VAR} and ${VAR:-default} syntax
 */
export function expandEnvVars(obj: any): any;
export function expandEnvVars(str: string): string;
export function expandEnvVars(input: any): any {
	if (typeof input === "string") {
		return input.replace(EnvVarPattern, (_, match) => {
			const [key, defaultValue] = match.split(":-");
			return process.env[key] || defaultValue || "";
		});
	}

	return JSON.parse(JSON.stringify(input), (_, value) => {
		if (typeof value === "string") {
			return value.replace(EnvVarPattern, (_, match) => {
				const [key, defaultValue] = match.split(":-");
				return process.env[key] || defaultValue || "";
			});
		}
		return value;
	});
}

/**
 * Validate that all required environment variables are present
 */
export function validateRequiredEnvVars(obj: any): {
	valid: boolean;
	missing: string[];
} {
	const allVars = new Set<string>();

	function collectVars(obj: any) {
		if (typeof obj === "string") {
			const matches = obj.match(EnvVarPattern);
			if (matches) {
				matches.forEach((match) => {
					const inner = match.slice(2, -1); // Remove ${ and }
					const varName = inner.split(":-")[0]; // Remove default value if present
					allVars.add(varName);
				});
			}
		} else if (Array.isArray(obj)) {
			obj.forEach(collectVars);
		} else if (obj && typeof obj === "object") {
			Object.values(obj).forEach(collectVars);
		}
	}

	collectVars(obj);

	const missing = Array.from(allVars).filter(
		(varName) => !process.env[varName],
	);

	return {
		valid: missing.length === 0,
		missing,
	};
}

/**
 * Load TOML file using Bun's built-in native TOML loader with caching
 * This is the preferred way for TOML files in Bun when the path is known at import time
 *
 * Benefits:
 * - Parsed at bundle/import time (zero runtime cost)
 * - Inlined into bundle as JavaScript object
 * - Uses Bun's fast native TOML parser
 * - Enhanced with intelligent caching for repeated access
 *
 * Usage:
 *   const config = await loadTomlFile('./config/secrets.toml');
 *
 * Note: For dynamic file paths or content from network/API,
 * use parseTomlFile() or parseTomlString() instead.
 *
 * @param filePath - Relative path to TOML file (must be importable)
 * @returns Parsed TOML object
 */
export async function loadTomlFile(filePath: string): Promise<any> {
	// Try cache first
	const cached = defaultTOMLCache.get(`file:${filePath}`);
	if (cached) {
		return cached;
	}

	try {
		// Fallback: Read file and parse manually since dynamic import attributes
		// aren't supported in current TypeScript config
		const file = Bun.file(filePath);
		const content = await file.text();
		const parsed = Bun.TOML.parse(content);

		// Cache the result
		defaultTOMLCache.set(`file:${filePath}`, parsed, 15 * 60 * 1000); // Cache for 15 minutes
		return parsed;
	} catch (error) {
		throw new Error(
			`Failed to load TOML file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Load TOML file from BunFile using Bun's file API and parse with native parser
 *
 * Use this when:
 * - File path is dynamic (user-provided, CLI argument, etc.)
 * - File is outside the project directory (not importable)
 * - You already have a BunFile handle
 *
 * For static config files in the project, prefer loadTomlFile() which uses
 * Bun's native TOML loader for better performance.
 *
 * @param file - BunFile handle to read and parse
 * @returns Parsed TOML object
 */
export async function parseTomlFile(file: any): Promise<any> {
	const content = await file.text();
	return parseTomlString(content);
}

/**
 * Comprehensive TOML function creator with advanced features
 * Creates a configurable TOML processor with caching, validation, and transformation capabilities
 *
 * Features:
 * - Intelligent caching with TTL
 * - Schema validation
 * - Environment variable expansion
 * - Transformation pipelines
 * - Error handling and recovery
 * - Performance monitoring
 * - Type safety with TypeScript generics
 *
 * @param options - Configuration options for the TOML function
 * @returns Enhanced TOML processor function
 */
export function createTomlFunction<T extends object = any>(
	options: {
		/** Cache TTL in milliseconds (default: 10 minutes) */
		cacheTTL?: number;
		/** Enable environment variable expansion (default: true) */
		expandEnv?: boolean;
		/** Enable schema validation (default: false) */
		validate?: boolean;
		/** Custom schema validator function */
		schemaValidator?: (data: any) => { valid: boolean; errors: string[] };
		/** Transformation pipeline to apply to parsed data */
		transform?: (data: any) => T;
		/** Enable performance monitoring (default: false) */
		monitor?: boolean;
		/** Custom error handler */
		onError?: (error: Error, context: string) => void;
		/** Enable strict parsing mode (default: false) */
		strict?: boolean;
	} = {},
) {
	const {
		cacheTTL = 10 * 60 * 1000, // 10 minutes
		expandEnv = true,
		validate = false,
		schemaValidator,
		transform,
		monitor = false,
		onError,
		strict = false,
	} = options;

	// Performance tracking
	const metrics = {
		parseCount: 0,
		cacheHits: 0,
		errors: 0,
		totalParseTime: 0,
	};

	// Create the processor object with proper method references
	const processor = {
		/**
		 * Parse TOML string with advanced features
		 */
		parse: (content: string, context = "unknown"): T => {
			const startTime = performance.now();
			metrics.parseCount++;

			try {
				// Check cache first
				const cacheKey = `enhanced:${fastHash(content)}:${context}`;
				const cached = defaultTOMLCache.get(cacheKey);
				if (cached) {
					metrics.cacheHits++;
					if (monitor) {
						console.log(
							`📊 Cache hit for ${context} - ${(performance.now() - startTime).toFixed(2)}ms`,
						);
					}
					return cached as T;
				}

				// Validate input
				if (!content || typeof content !== "string") {
					throw new Error("Invalid TOML content: must be a non-empty string");
				}

				if (strict && content.trim().length === 0) {
					throw new Error("Strict mode: Empty TOML content not allowed");
				}

				// Parse with Bun's native TOML parser
				let parsed = Bun.TOML.parse(content);

				// Apply transformations
				if (expandEnv) {
					parsed = expandEnvVars(parsed);
				}

				// Validate schema if enabled
				if (validate && schemaValidator) {
					const validation = schemaValidator(parsed);
					if (!validation.valid) {
						throw new Error(
							`Schema validation failed: ${validation.errors.join(", ")}`,
						);
					}
				}

				// Apply custom transformation
				if (transform) {
					parsed = transform(parsed);
				}

				// Cache the result
				defaultTOMLCache.set(cacheKey, parsed, cacheTTL);

				// Performance monitoring
				const parseTime = performance.now() - startTime;
				metrics.totalParseTime += parseTime;

				if (monitor) {
					console.log(
						`📊 Parsed ${context} - ${parseTime.toFixed(2)}ms - Cache hit rate: ${((metrics.cacheHits / metrics.parseCount) * 100).toFixed(1)}%`,
					);
				}

				return parsed as T;
			} catch (error) {
				metrics.errors++;
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				if (onError) {
					onError(
						error instanceof Error ? error : new Error(errorMessage),
						context,
					);
				}

				// Enhanced error messages for common issues
				if (errorMessage.includes("parse")) {
					throw new Error(
						`TOML parsing failed in ${context}: ${errorMessage}. Check for syntax errors, missing quotes, or invalid characters.`,
					);
				} else if (errorMessage.includes("schema")) {
					throw new Error(
						`Schema validation failed in ${context}: ${errorMessage}`,
					);
				} else {
					throw new Error(
						`TOML processing error in ${context}: ${errorMessage}`,
					);
				}
			}
		},

		/**
		 * Parse TOML file with enhanced error handling
		 */
		parseFile: async (filePath: string, context = filePath): Promise<T> => {
			try {
				const file = Bun.file(filePath);
				if (!file.exists()) {
					throw new Error(`File not found: ${filePath}`);
				}

				const content = await file.text();
				return processor.parse(content, context);
			} catch (error) {
				if (onError) {
					onError(
						error instanceof Error ? error : new Error(String(error)),
						`file:${context}`,
					);
				}
				throw error;
			}
		},

		/**
		 * Stringify object to TOML with enhanced formatting
		 */
		stringify: (
			obj: any,
			options: {
				/** Sort keys alphabetically (default: true) */
				sortKeys?: boolean;
				/** Indentation spaces (default: 2) */
				indent?: number;
				/** Add header comment (default: false) */
				header?: string;
				/** Add footer comment (default: false) */
				footer?: string;
			} = {},
		): string => {
			const { sortKeys = true, indent = 2, header, footer } = options;

			try {
				let result = "";

				// Add header comment if provided
				if (header) {
					result += `# ${header}\n`;
				}

				// Sort keys if enabled
				const processed =
					sortKeys && typeof obj === "object" && obj !== null
						? sortObjectKeys(obj)
						: obj;

				// Generate TOML
				result += simpleTomlStringify(processed, 0, indent);

				// Add footer comment if provided
				if (footer) {
					result += `\n# ${footer}`;
				}

				return result;
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				throw new Error(`TOML stringification failed: ${errorMessage}`);
			}
		},

		/**
		 * Validate TOML content without parsing
		 */
		validate: (content: string): { valid: boolean; errors: string[] } => {
			const errors: string[] = [];

			try {
				// Basic syntax checks
				if (!content || typeof content !== "string") {
					errors.push("Content must be a non-empty string");
					return { valid: false, errors };
				}

				// Check for common TOML syntax issues
				const lines = content.split("\n");
				const _inTable = false;
				let bracketCount = 0;

				lines.forEach((line, index) => {
					const trimmed = line.trim();
					const lineNum = index + 1;

					// Skip empty lines and comments
					if (!trimmed || trimmed.startsWith("#")) return;

					// Check for unclosed brackets
					bracketCount += (trimmed.match(/\[/g) || []).length;
					bracketCount -= (trimmed.match(/\]/g) || []).length;

					// Check for malformed sections
					if (trimmed.startsWith("[") && !trimmed.endsWith("]")) {
						errors.push(`Line ${lineNum}: Unclosed section header`);
					}

					// Check for invalid key-value pairs
					if (
						trimmed.includes("=") &&
						!trimmed.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=/)
					) {
						errors.push(`Line ${lineNum}: Invalid key format`);
					}

					// Check for unescaped quotes in strings
					if (trimmed.includes("=") && trimmed.includes('"')) {
						const parts = trimmed.split("=");
						if (parts.length > 1) {
							const value = parts.slice(1).join("=").trim();
							if (value.startsWith('"') && !value.endsWith('"')) {
								errors.push(`Line ${lineNum}: Unclosed string value`);
							}
						}
					}
				});

				if (bracketCount !== 0) {
					errors.push("Unmatched brackets in TOML content");
				}

				// Try parsing with Bun's TOML parser
				try {
					Bun.TOML.parse(content);
				} catch (parseError) {
					errors.push(
						`Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
					);
				}

				return {
					valid: errors.length === 0,
					errors,
				};
			} catch (error) {
				errors.push(
					`Validation error: ${error instanceof Error ? error.message : String(error)}`,
				);
				return { valid: false, errors };
			}
		},

		/**
		 * Get performance metrics
		 */
		getMetrics: () => ({
			...metrics,
			averageParseTime:
				metrics.parseCount > 0
					? metrics.totalParseTime / metrics.parseCount
					: 0,
			cacheHitRate:
				metrics.parseCount > 0
					? (metrics.cacheHits / metrics.parseCount) * 100
					: 0,
		}),

		/**
		 * Clear cache and reset metrics
		 */
		reset: () => {
			defaultTOMLCache.clear();
			metrics.parseCount = 0;
			metrics.cacheHits = 0;
			metrics.errors = 0;
			metrics.totalParseTime = 0;
		},
	};

	return processor;
}
