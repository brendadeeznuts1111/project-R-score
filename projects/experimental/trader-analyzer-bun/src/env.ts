/**
 * @fileoverview Zero-Dependency Environment Validator
 * @description Type-safe environment variable validation using Bun.env
 * @module env
 * 
 * Provides:
 * - Type-safe environment variable parsing
 * - Zero dependencies (uses Bun.env only)
 * - Helper functions for environment detection
 * - Runtime validation with helpful error messages
 */

/**
 * Environment variable parser schema
 * Each key maps to a parser function that validates and transforms the value
 */
type EnvSchema = Record<string, (value?: string) => any>;

/**
 * Validated environment object with proper types
 */
type ValidatedEnv<T extends EnvSchema> = {
	[K in keyof T]: ReturnType<T[K]>;
};

/**
 * Create a validated environment object from a schema
 * Uses Bun.env for zero-dependency environment access
 * 
 * @example
 * ```typescript
 * const env = createEnv({
 *   PORT: (v = "3000") => Number(v),
 *   NODE_ENV: (v = "development") => v as "development" | "production" | "test",
 *   API_KEY: (v) => {
 *     if (!v) throw new Error("API_KEY is required");
 *     return v;
 *   },
 * });
 * ```
 */
export function createEnv<T extends EnvSchema>(
	schema: T,
): ValidatedEnv<T> {
	const env: Record<string, any> = {};
	const errors: string[] = [];

	for (const [key, parser] of Object.entries(schema)) {
		try {
			// Use Bun.env instead of process.env for Bun-native access
			const value = Bun.env[key];
			env[key] = parser(value);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			errors.push(`Environment variable ${key}: ${message}`);
		}
	}

	if (errors.length > 0) {
		throw new Error(
			`Environment validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
		);
	}

	return env as ValidatedEnv<T>;
}

/**
 * Default environment schema for common variables
 * Can be extended or overridden
 */
const defaultSchema = {
	NODE_ENV: (v = "development") => {
		const env = v.toLowerCase();
		if (!["development", "production", "test"].includes(env)) {
			throw new Error(
				`NODE_ENV must be one of: development, production, test. Got: ${v}`,
			);
		}
		return env as "development" | "production" | "test";
	},
	PORT: (v = "3000") => {
		const port = Number(v);
		if (isNaN(port) || port < 1 || port > 65535) {
			throw new Error(`PORT must be a number between 1 and 65535. Got: ${v}`);
		}
		return port;
	},
	LOG_LEVEL: (v = "info") => {
		const level = v.toLowerCase();
		if (!["debug", "info", "warn", "error"].includes(level)) {
			throw new Error(
				`LOG_LEVEL must be one of: debug, info, warn, error. Got: ${v}`,
			);
		}
		return level as "debug" | "info" | "warn" | "error";
	},
} as const;

/**
 * Default validated environment object
 * Uses Bun.env for zero-dependency access
 */
export const env = createEnv(defaultSchema);

/**
 * Check if running in production environment
 * Uses Bun.env.NODE_ENV for zero-dependency access
 */
export function isProduction(): boolean {
	return Bun.env.NODE_ENV === "production";
}

/**
 * Check if running in development environment
 * Uses Bun.env.NODE_ENV for zero-dependency access
 */
export function isDevelopment(): boolean {
	return Bun.env.NODE_ENV === "development" || !Bun.env.NODE_ENV;
}

/**
 * Check if running in test environment
 * Uses Bun.env.NODE_ENV for zero-dependency access
 */
export function isTest(): boolean {
	return Bun.env.NODE_ENV === "test";
}

/**
 * Get environment variable with optional default value
 * Uses Bun.env for zero-dependency access
 * 
 * @example
 * ```typescript
 * const apiKey = getEnv("API_KEY", "default-key");
 * const required = getEnv("REQUIRED_KEY"); // throws if missing
 * ```
 */
export function getEnv(key: string, defaultValue?: string): string {
	const value = Bun.env[key];
	if (value === undefined) {
		if (defaultValue === undefined) {
			throw new Error(`Environment variable ${key} is required but not set`);
		}
		return defaultValue;
	}
	return value;
}

/**
 * Get environment variable as number with optional default
 * Uses Bun.env for zero-dependency access
 * 
 * @example
 * ```typescript
 * const port = getEnvNumber("PORT", 3000);
 * ```
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
	const value = Bun.env[key];
	if (value === undefined) {
		if (defaultValue === undefined) {
			throw new Error(`Environment variable ${key} is required but not set`);
		}
		return defaultValue;
	}
	const num = Number(value);
	if (isNaN(num)) {
		throw new Error(`Environment variable ${key} must be a number. Got: ${value}`);
	}
	return num;
}

/**
 * Get environment variable as boolean
 * Uses Bun.env for zero-dependency access
 * 
 * @example
 * ```typescript
 * const enabled = getEnvBoolean("FEATURE_ENABLED", false);
 * ```
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
	const value = Bun.env[key];
	if (value === undefined) {
		if (defaultValue === undefined) {
			throw new Error(`Environment variable ${key} is required but not set`);
		}
		return defaultValue;
	}
	const lower = value.toLowerCase();
	if (lower === "true" || lower === "1" || lower === "yes") {
		return true;
	}
	if (lower === "false" || lower === "0" || lower === "no") {
		return false;
	}
	throw new Error(
		`Environment variable ${key} must be a boolean (true/false, 1/0, yes/no). Got: ${value}`,
	);
}
