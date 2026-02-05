/**
 * Enterprise validation utilities for configuration and data
 */

import { z } from "zod";
import type { ValidationResult } from "../types";

// ============================================================================
// CONFIGURATION SCHEMAS
// ============================================================================

export const LogLevelSchema = z.enum([
	"debug",
	"info",
	"warn",
	"error",
	"success",
]);

export const LoggerConfigSchema = z.object({
	logFile: z.string().optional().default("./logs/profiling.jsonl"),
	terminal: z.boolean().optional().default(true),
	level: LogLevelSchema.optional().default("info"),
	service: z.string().optional().default("bun-enterprise"),
	enableColors: z.boolean().optional().default(true),
	enableMetrics: z.boolean().optional().default(true),
	bufferSize: z.number().int().positive().optional().default(1000),
	flushInterval: z.number().int().positive().optional().default(5000),
});

export const InspectorConfigSchema = z.object({
	port: z.number().int().positive().optional().default(9229),
	host: z.string().optional().default("localhost"),
	enabled: z.boolean().optional().default(true),
	breakpoints: z.boolean().optional().default(true),
	console: z.boolean().optional().default(true),
	profiling: z.boolean().optional().default(true),
	security: z
		.object({
			allowedHosts: z.array(z.string()).optional(),
			requireAuth: z.boolean().optional().default(false),
			token: z.string().optional(),
		})
		.optional(),
});

export const BundleConfigSchema = z.object({
	outputDir: z.string().optional().default("./bundles"),
	compression: z.boolean().optional().default(true),
	includeMetadata: z.boolean().optional().default(true),
	maxSize: z
		.number()
		.int()
		.positive()
		.optional()
		.default(100 * 1024 * 1024),
	retention: z
		.object({
			maxAge: z.number().int().positive(),
			maxFiles: z.number().int().positive(),
		})
		.optional(),
});

export const TerminalConfigSchema = z.object({
	enabled: z.boolean().optional().default(true),
	historySize: z.number().int().positive().optional().default(1000),
	prompt: z.string().optional().default("bun> "),
	colors: z.boolean().optional().default(true),
	autoComplete: z.boolean().optional().default(true),
	shortcuts: z.record(z.string()).optional(),
	security: z
		.object({
			allowCommands: z.array(z.string()).optional(),
			blockCommands: z.array(z.string()).optional(),
			requireAuth: z.boolean().optional().default(false),
		})
		.optional(),
});

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export class ConfigValidator {
	static validateLoggerConfig(config: unknown): ValidationResult {
		try {
			const validated = LoggerConfigSchema.parse(config);
			return {
				valid: true,
				errors: [],
				data: validated,
			};
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					valid: false,
					errors: error.errors.map((err) => ({
						field: err.path.join("."),
						message: err.message,
						value: err.received,
						constraint: err.code,
					})),
				};
			}
			return {
				valid: false,
				errors: [
					{
						field: "unknown",
						message:
							error instanceof Error
								? error.message
								: "Unknown validation error",
					},
				],
			};
		}
	}

	static validateInspectorConfig(config: unknown): ValidationResult {
		try {
			const validated = InspectorConfigSchema.parse(config);
			return {
				valid: true,
				errors: [],
				data: validated,
			};
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					valid: false,
					errors: error.errors.map((err) => ({
						field: err.path.join("."),
						message: err.message,
						value: err.received,
						constraint: err.code,
					})),
				};
			}
			return {
				valid: false,
				errors: [
					{
						field: "unknown",
						message:
							error instanceof Error
								? error.message
								: "Unknown validation error",
					},
				],
			};
		}
	}

	static validateBundleConfig(config: unknown): ValidationResult {
		try {
			const validated = BundleConfigSchema.parse(config);
			return {
				valid: true,
				errors: [],
				data: validated,
			};
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					valid: false,
					errors: error.errors.map((err) => ({
						field: err.path.join("."),
						message: err.message,
						value: err.received,
						constraint: err.code,
					})),
				};
			}
			return {
				valid: false,
				errors: [
					{
						field: "unknown",
						message:
							error instanceof Error
								? error.message
								: "Unknown validation error",
					},
				],
			};
		}
	}

	static validateTerminalConfig(config: unknown): ValidationResult {
		try {
			const validated = TerminalConfigSchema.parse(config);
			return {
				valid: true,
				errors: [],
				data: validated,
			};
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					valid: false,
					errors: error.errors.map((err) => ({
						field: err.path.join("."),
						message: err.message,
						value: err.received,
						constraint: err.code,
					})),
				};
			}
			return {
				valid: false,
				errors: [
					{
						field: "unknown",
						message:
							error instanceof Error
								? error.message
								: "Unknown validation error",
					},
				],
			};
		}
	}
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

export class InputValidator {
	static sanitizeString(input: string, maxLength = 1000): string {
		if (typeof input !== "string") return "";
		return input.trim().slice(0, maxLength);
	}

	static validatePort(port: unknown): number {
		const portNum = Number(port);
		if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
			throw new Error("Port must be an integer between 1 and 65535");
		}
		return portNum;
	}

	static validateFilePath(path: unknown): string {
		if (typeof path !== "string") {
			throw new Error("File path must be a string");
		}
		if (!path.trim()) {
			throw new Error("File path cannot be empty");
		}
		// Prevent directory traversal
		if (path.includes("..") || path.includes("~")) {
			throw new Error("Invalid file path: directory traversal not allowed");
		}
		return path;
	}

	static validateLogLevel(level: unknown): string {
		if (typeof level !== "string") {
			throw new Error("Log level must be a string");
		}
		const validLevels = ["debug", "info", "warn", "error", "success"];
		if (!validLevels.includes(level.toLowerCase())) {
			throw new Error(
				`Invalid log level: ${level}. Must be one of: ${validLevels.join(", ")}`,
			);
		}
		return level.toLowerCase();
	}

	static validateJson(input: string): any {
		try {
			return JSON.parse(input);
		} catch (error) {
			throw new Error(
				`Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	static validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	static validateUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	static validateToken(token: string): boolean {
		// Basic token validation - alphanumeric with length constraints
		const tokenRegex = /^[a-zA-Z0-9_-]{16,}$/;
		return tokenRegex.test(token);
	}

	static validateLineNumber(line: number): void {
		if (!Number.isInteger(line) || line < 0) {
			throw new Error("Line number must be a non-negative integer");
		}
	}
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class ValidationError extends Error {
	public readonly code: string;
	public readonly field: string;
	public readonly value: any;

	constructor(
		message: string,
		field: string,
		value?: any,
		code = "VALIDATION_ERROR",
	) {
		super(message);
		this.name = "ValidationError";
		this.code = code;
		this.field = field;
		this.value = value;
	}
}

export class ConfigError extends Error {
	public readonly code: string;
	public readonly configType: string;

	constructor(message: string, configType: string, code = "CONFIG_ERROR") {
		super(message);
		this.name = "ConfigError";
		this.code = code;
		this.configType = configType;
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export * from "../types";
