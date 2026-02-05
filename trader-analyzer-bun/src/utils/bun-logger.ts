/**
 * @fileoverview Bun-Native Logger Utility
 * @description Fast, Bun-native logging using stdout.write(), ANSI colors, and Temporal polyfill
 * @module utils/bun-logger
 * 
 * Uses Bun's built-in features:
 * - stdout.write() for fast, direct output (bypasses console wrapper)
 * - ANSI color codes (no external color library needed)
 * - Temporal polyfill (no external date/time library needed)
 * 
 * See: https://bun.com/docs/runtime/console#object-inspection-depth
 */

import { stdout } from "bun";

/**
 * ANSI color codes for log levels
 */
const lvlColor = {
	INFO: "\x1b[36m", // cyan
	WARN: "\x1b[33m", // yellow
	ERROR: "\x1b[31m", // red
	DEBUG: "\x1b[90m", // grey
} as const;

/**
 * ANSI reset code
 */
const RESET = "\x1b[0m";

/**
 * Log level type
 */
type LogLevel = keyof typeof lvlColor;

/**
 * Logger configuration
 */
interface BunLoggerConfig {
	namespace?: string;
	enableColors?: boolean;
	logLevel?: LogLevel;
}

/**
 * Bun-native logger class
 */
class BunLogger {
	private namespace: string;
	private enableColors: boolean;
	private logLevel: LogLevel;

	constructor(config: BunLoggerConfig = {}) {
		this.namespace = config.namespace || "app";
		this.enableColors = config.enableColors ?? true;
		
		// Determine log level from environment or config
		const envLevel = process.env.LOG_LEVEL?.toUpperCase();
		this.logLevel = (config.logLevel || 
			(envLevel && envLevel in lvlColor ? envLevel as LogLevel : "INFO")) as LogLevel;
	}

	/**
	 * Format timestamp using Bun's Temporal polyfill
	 */
	private formatTimestamp(): string {
		// Use Temporal if available (Bun polyfill), fallback to Date
		// @ts-expect-error - Temporal is a Bun polyfill, not in TypeScript types
		if (typeof Temporal !== "undefined" && Temporal?.Now) {
			// @ts-expect-error - Temporal is a Bun polyfill
			return Temporal.Now.instant().toLocaleString("en-GB", { 
				timeStyle: "medium" 
			});
		}
		// Fallback to Date if Temporal not available
		return new Date().toLocaleTimeString("en-GB");
	}

	/**
	 * Format log message with colors and timestamp
	 */
	private formatMessage(
		level: LogLevel,
		message: string,
		extra?: unknown,
	): string {
		const ts = this.formatTimestamp();
		const color = this.enableColors ? lvlColor[level] : "";
		const reset = this.enableColors ? RESET : "";
		const ns = this.namespace ? `[${this.namespace}]` : "";
		
		let line = `${color}[${ts}]${ns ? ` ${ns}` : ""} ${message}${reset}`;
		
		if (extra !== undefined) {
			// Use JSON.stringify for structured data (benefits from bunfig.toml depth=5)
			line += ` ${JSON.stringify(extra, null, 0)}`;
		}
		
		return line + "\n";
	}

	/**
	 * Write log message directly to stdout (fast, no console wrapper)
	 */
	private write(level: LogLevel, message: string, extra?: unknown): void {
		// Check log level priority
		const levelPriority: Record<LogLevel, number> = {
			DEBUG: 0,
			INFO: 1,
			WARN: 2,
			ERROR: 3,
		};
		
		if (levelPriority[level] < levelPriority[this.logLevel]) {
			return; // Skip if below configured log level
		}

		const formatted = this.formatMessage(level, message, extra);
		stdout.write(formatted);
	}

	/**
	 * Log info message
	 */
	info(message: string, extra?: unknown): void {
		this.write("INFO", message, extra);
	}

	/**
	 * Log debug message
	 */
	debug(message: string, extra?: unknown): void {
		this.write("DEBUG", message, extra);
	}

	/**
	 * Log warning message
	 */
	warn(message: string, extra?: unknown): void {
		this.write("WARN", message, extra);
	}

	/**
	 * Log error message
	 */
	error(message: string, extra?: unknown): void {
		this.write("ERROR", message, extra);
	}

	/**
	 * Create a child logger with a specific namespace
	 */
	child(namespace: string): BunLogger {
		return new BunLogger({
			namespace: `${this.namespace}:${namespace}`,
			enableColors: this.enableColors,
			logLevel: this.logLevel,
		});
	}
}

/**
 * Create a Bun-native logger instance
 */
export function createBunLogger(config?: BunLoggerConfig): BunLogger {
	return new BunLogger(config);
}

/**
 * Default logger instance
 */
export const bunLogger = createBunLogger();

/**
 * Correlation graph logger (namespace-specific)
 */
export const correlationGraphLogger = createBunLogger({ 
	namespace: "correlation-graph" 
});

/**
 * API logger (namespace-specific)
 */
export const apiLogger = createBunLogger({ 
	namespace: "api" 
});

/**
 * Simple log function (matches the example pattern)
 */
export function log(lvl: LogLevel, ns: string, msg: string, extra?: unknown): void {
	// @ts-expect-error - Temporal is a Bun polyfill, not in TypeScript types
	const ts = typeof Temporal !== "undefined" && Temporal?.Now
		// @ts-expect-error - Temporal is a Bun polyfill
		? Temporal.Now.instant().toLocaleString("en-GB", { timeStyle: "medium" })
		: new Date().toLocaleTimeString("en-GB");
	
	const color = lvlColor[lvl];
	const line = `${color}[${ts}] [${ns}] ${msg}${RESET}` +
		(extra ? ` ${JSON.stringify(extra)}` : "") +
		"\n";
	
	stdout.write(line);
}
