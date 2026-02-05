// utils/logger.ts
// Structured logging with log levels, context propagation, and JSON output

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

export interface LogContext {
	requestId?: string;
	operation?: string;
	userId?: string;
	file?: string;
	secret?: string;
	error?: string;
	count?: number;
	secretName?: string;
	[key: string]: any;
}

export interface LogEntry {
	timestamp: string;
	level: string;
	message: string;
	context?: LogContext;
	error?: {
		name: string;
		message: string;
		stack?: string;
		code?: string;
	};
}

class Logger {
	private level: LogLevel;
	private context: LogContext = {};
	// This will be optimized by --define at build time
	// Production: 'json', Development: 'text'
	private outputFormat: "json" | "text" = (
		process.env.NODE_ENV === "production" ? "json" : "text"
	) as "json" | "text";

	constructor(level: LogLevel = LogLevel.INFO) {
		this.level = level;

		// Set log level from environment (optimized by --define at build time)
		// In production builds with --define, this becomes a constant
		const envLevel = process.env.LOG_LEVEL?.toUpperCase();
		if (envLevel === "DEBUG") this.level = LogLevel.DEBUG;
		else if (envLevel === "INFO") this.level = LogLevel.INFO;
		else if (envLevel === "WARN") this.level = LogLevel.WARN;
		else if (envLevel === "ERROR") this.level = LogLevel.ERROR;
	}

	setLevel(level: LogLevel): void {
		this.level = level;
	}

	setContext(context: LogContext): void {
		this.context = { ...this.context, ...context };
	}

	clearContext(): void {
		this.context = {};
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.level;
	}

	private formatMessage(
		level: string,
		message: string,
		context?: LogContext,
		error?: Error,
	): LogEntry {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			context: { ...this.context, ...context },
		};

		if (error) {
			entry.error = {
				name: error.name,
				message: error.message,
				stack: error.stack,
				code: (error as any).code,
			};
		}

		return entry;
	}

	private write(entry: LogEntry): void {
		if (this.outputFormat === "json") {
			console.log(JSON.stringify(entry));
		} else {
			const levelColor =
				{
					DEBUG: "\x1b[36m", // Cyan
					INFO: "\x1b[32m", // Green
					WARN: "\x1b[33m", // Yellow
					ERROR: "\x1b[31m", // Red
				}[entry.level] || "";
			const reset = "\x1b[0m";

			const contextStr = entry.context
				? ` ${JSON.stringify(entry.context)}`
				: "";
			const errorStr = entry.error
				? `\n  Error: ${entry.error.name}: ${entry.error.message}`
				: "";

			console.log(
				`${levelColor}[${entry.level}]${reset} ${entry.message}${contextStr}${errorStr}`,
			);
		}
	}

	debug(message: string, context?: LogContext): void {
		if (this.shouldLog(LogLevel.DEBUG)) {
			this.write(this.formatMessage("DEBUG", message, context));
		}
	}

	info(message: string, context?: LogContext): void {
		if (this.shouldLog(LogLevel.INFO)) {
			this.write(this.formatMessage("INFO", message, context));
		}
	}

	warn(message: string, context?: LogContext, error?: Error): void {
		if (this.shouldLog(LogLevel.WARN)) {
			this.write(this.formatMessage("WARN", message, context, error));
		}
	}

	error(message: string, context?: LogContext, error?: Error): void {
		if (this.shouldLog(LogLevel.ERROR)) {
			this.write(this.formatMessage("ERROR", message, context, error));
		}
	}

	// Convenience method for operation timing
	time(operation: string): () => void {
		const start = performance.now();
		return () => {
			const duration = performance.now() - start;
			this.debug(`Operation ${operation} completed`, {
				operation,
				durationMs: duration.toFixed(2),
			});
		};
	}
}

// Singleton instance
export const logger = new Logger();

// Create child logger with context
export function createLogger(context: LogContext): Logger {
	const childLogger = new Logger();
	childLogger.setContext(context);
	return childLogger;
}
