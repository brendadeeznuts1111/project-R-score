/**
 * @fileoverview Structured Logger Utility
 * @description Centralized logging utility with log levels and structured output
 * @module utils/logger
 */

import { ENTERPRISE_CONFIG } from "./enterprise-config";

/**
 * Log levels
 */
export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
	level: LogLevel;
	enableStackTraces: boolean;
	prefix?: string;
}

/**
 * Structured logger class
 */
class Logger {
	private config: LoggerConfig;

	constructor(config?: Partial<LoggerConfig>) {
		const logLevel = (
			process.env.LOG_LEVEL || ENTERPRISE_CONFIG.logging.level
		).toLowerCase();
		const levelMap: Record<string, LogLevel> = {
			debug: LogLevel.DEBUG,
			info: LogLevel.INFO,
			warn: LogLevel.WARN,
			error: LogLevel.ERROR,
		};

		this.config = {
			level: config?.level ?? levelMap[logLevel] ?? LogLevel.INFO,
			enableStackTraces:
				config?.enableStackTraces ??
				ENTERPRISE_CONFIG.logging.enableErrorStackTraces,
			prefix: config?.prefix,
		};
	}

	/**
	 * Format log message with prefix and timestamp
	 */
	private formatMessage(
		level: string,
		message: string,
		...args: unknown[]
	): string {
		const timestamp = new Date().toISOString();
		const prefix = this.config.prefix ? `[${this.config.prefix}]` : "";
		const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : "";
		return `${timestamp} ${prefix} [${level}] ${message}${formattedArgs}`;
	}

	/**
	 * Debug log (only in development)
	 */
	debug(message: string, ...args: unknown[]): void {
		if (this.config.level <= LogLevel.DEBUG) {
			console.debug(this.formatMessage("DEBUG", message, ...args));
		}
	}

	/**
	 * Info log
	 */
	info(message: string, ...args: unknown[]): void {
		if (this.config.level <= LogLevel.INFO) {
			console.info(this.formatMessage("INFO", message, ...args));
		}
	}

	/**
	 * Warning log
	 */
	warn(message: string, ...args: unknown[]): void {
		if (this.config.level <= LogLevel.WARN) {
			console.warn(this.formatMessage("WARN", message, ...args));
		}
	}

	/**
	 * Error log
	 */
	error(message: string, error?: Error | unknown, ...args: unknown[]): void {
		if (this.config.level <= LogLevel.ERROR) {
			const errorDetails =
				error instanceof Error
					? {
							message: error.message,
							stack: this.config.enableStackTraces ? error.stack : undefined,
							name: error.name,
						}
					: error;
			console.error(
				this.formatMessage("ERROR", message, errorDetails, ...args),
			);
		}
	}
}

/**
 * Create logger instance with optional prefix
 */
export function createLogger(prefix?: string): Logger {
	return new Logger({ prefix });
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Module-specific loggers
 */
export const securityLogger = createLogger("Security");
export const csrfLogger = createLogger("CSRF");
export const scannerLogger = createLogger("SecurityScanner");
export const mcpToolLogger = createLogger("MCPTool");
