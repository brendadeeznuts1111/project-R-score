/**
 * Enterprise-grade enhanced logging system leveraging Bun v1.3.7 features
 * - Bun.JSONL for structured log streaming
 * - Bun.wrapAnsi() for better terminal output
 * - Comprehensive error handling and validation
 * - Performance monitoring and metrics
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import type {
	LogBuffer,
	LogEntry,
	LogFilter,
	LoggerMetrics,
	LoggerOptions,
	LogLevel as LogLevelType,
	LogSession,
} from "../types";

// Re-export LogLevel for convenience
export const LogLevel = {
	DEBUG: "debug" as const,
	INFO: "info" as const,
	WARN: "warn" as const,
	ERROR: "error" as const,
	SUCCESS: "success" as const,
};

export type LogLevel = LogLevelType;

import { ErrorFactory, ErrorRecovery, LoggerError } from "../utils/errors";
import { ConfigValidator, InputValidator } from "../utils/validation";

// ============================================================================
// ENHANCED LOGGER CLASS
// ============================================================================

export class EnhancedLogger {
	private config: LoggerOptions;
	private metrics: LoggerMetrics;
	private buffer: LogBuffer;
	private sessionId: string;
	private startTime: number;
	private isInitialized = false;

	constructor(options: LoggerOptions = {}) {
		// Validate configuration
		const validation = ConfigValidator.validateLoggerConfig(options);
		if (!validation.valid) {
			throw new LoggerError(
				`Invalid logger configuration: ${validation.errors.map((e) => e.message).join(", ")}`,
				{ errors: validation.errors },
			);
		}

		this.config = validation.data as LoggerOptions;
		this.sessionId = this.generateSessionId();
		this.startTime = performance.now();

		// Initialize metrics
		this.metrics = {
			totalLogs: 0,
			logsByLevel: {
				debug: 0,
				info: 0,
				warn: 0,
				error: 0,
				success: 0,
			},
			errorRate: 0,
			averageLogSize: 0,
			bufferUtilization: 0,
			lastFlushTime: new Date().toISOString(),
		};

		// Initialize buffer
		this.buffer = {
			entries: [],
			maxSize: this.config.bufferSize || 1000,
			flushInterval: this.config.flushInterval || 5000,
			lastFlush: Date.now(),
			isFlushing: false,
		};

		// Initialize the logger
		this.initialize();
	}

	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private async initialize(): Promise<void> {
		try {
			await ErrorRecovery.withRetry(
				async () => {
					this.ensureLogDirectory();
					await this.writeSessionHeader();
					this.setupBufferFlush();
					this.isInitialized = true;
				},
				3,
				1000,
			);

			this.info("🚀 Enhanced Logger initialized", {
				sessionId: this.sessionId,
				config: this.config,
				bunVersion: process.version,
			});
		} catch (error) {
			throw ErrorFactory.fromError(error, {
				operation: "logger_initialization",
				sessionId: this.sessionId,
			});
		}
	}

	private ensureLogDirectory(): void {
		try {
			const logDir = dirname(this.config.logFile!);
			if (!existsSync(logDir)) {
				mkdirSync(logDir, { recursive: true });
			}
		} catch (error) {
			throw new LoggerError(
				`Failed to create log directory: ${error instanceof Error ? error.message : "Unknown error"}`,
				{ logFile: this.config.logFile },
			);
		}
	}

	private async writeSessionHeader(): Promise<void> {
		const header: LogSession = {
			timestamp: new Date().toISOString(),
			type: "log_session_start",
			version: "2.0.0",
			bun_version: process.version,
			node_env: process.env.NODE_ENV || "development",
			sessionId: this.sessionId,
		};

		await this.writeToJSONL(header);
	}

	private setupBufferFlush(): void {
		if (this.buffer.flushInterval > 0) {
			setInterval(() => {
				this.flushBuffer();
			}, this.buffer.flushInterval);
		}
	}

	// ============================================================================
	// PUBLIC LOGGING METHODS
	// ============================================================================

	public debug(message: string, metadata: Record<string, any> = {}): void {
		this.log(LogLevel.DEBUG, message, metadata);
	}

	public info(message: string, metadata: Record<string, any> = {}): void {
		this.log(LogLevel.INFO, message, metadata);
	}

	public warn(message: string, metadata: Record<string, any> = {}): void {
		this.log(LogLevel.WARN, message, metadata);
	}

	public error(message: string, metadata: Record<string, any> = {}): void {
		this.log(LogLevel.ERROR, message, metadata);
	}

	public success(message: string, metadata: Record<string, any> = {}): void {
		this.log(LogLevel.SUCCESS, message, metadata);
	}

	public log(
		level: LogLevel,
		message: string,
		metadata: Record<string, any> = {},
	): void {
		if (!this.isInitialized) {
			console.warn("⚠️ Logger not initialized, log entry ignored");
			return;
		}

		try {
			// Validate inputs
			const sanitizedMessage = InputValidator.sanitizeString(message, 10000);
			const sanitizedLevel = InputValidator.validateLogLevel(level) as LogLevel;

			// Create log entry
			const entry: LogEntry = {
				timestamp: new Date().toISOString(),
				level: sanitizedLevel,
				message: sanitizedMessage,
				metadata: this.sanitizeMetadata(metadata),
				correlationId: metadata.correlationId || this.generateCorrelationId(),
				sessionId: this.sessionId,
				service: this.config.service,
				version: "2.0.0",
			};

			// Update metrics
			this.updateMetrics(entry);

			// Add to buffer
			this.addToBuffer(entry);

			// Output to terminal if enabled
			if (this.config.terminal) {
				this.writeToTerminal(entry);
			}
		} catch (error) {
			console.error("❌ Failed to log entry:", error);
			// Fallback to console logging
			console.log(`[${level.toUpperCase()}] ${message}`, metadata);
		}
	}

	// ============================================================================
	// PRIVATE HELPER METHODS
	// ============================================================================

	private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
		const sanitized: Record<string, any> = {};

		for (const [key, value] of Object.entries(metadata)) {
			const sanitizedKey = InputValidator.sanitizeString(key, 100);

			if (typeof value === "string") {
				sanitized[sanitizedKey] = InputValidator.sanitizeString(value, 1000);
			} else if (typeof value === "number" || typeof value === "boolean") {
				sanitized[sanitizedKey] = value;
			} else if (value && typeof value === "object") {
				// Recursively sanitize nested objects
				sanitized[sanitizedKey] = JSON.parse(
					JSON.stringify(value, (_k, v) =>
						typeof v === "string" ? InputValidator.sanitizeString(v, 1000) : v,
					),
				);
			} else {
				sanitized[sanitizedKey] = String(value);
			}
		}

		return sanitized;
	}

	private generateCorrelationId(): string {
		return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private updateMetrics(entry: LogEntry): void {
		this.metrics.totalLogs++;
		this.metrics.logsByLevel[entry.level]++;

		// Calculate error rate
		const totalLogs = this.metrics.totalLogs;
		const errorLogs = this.metrics.logsByLevel.error;
		this.metrics.errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

		// Calculate average log size
		const entrySize = JSON.stringify(entry).length;
		this.metrics.averageLogSize =
			(this.metrics.averageLogSize * (totalLogs - 1) + entrySize) / totalLogs;

		// Update buffer utilization
		this.metrics.bufferUtilization =
			(this.buffer.entries.length / this.buffer.maxSize) * 100;
	}

	private addToBuffer(entry: LogEntry): void {
		this.buffer.entries.push(entry);

		// Auto-flush if buffer is full
		if (this.buffer.entries.length >= this.buffer.maxSize) {
			this.flushBuffer();
		}
	}

	private async flushBuffer(): Promise<void> {
		if (this.buffer.isFlushing || this.buffer.entries.length === 0) {
			return;
		}

		this.buffer.isFlushing = true;

		try {
			const entries = [...this.buffer.entries];
			this.buffer.entries = [];

			// Write all entries to JSONL file
			for (const entry of entries) {
				await this.writeToJSONL(entry);
			}

			this.buffer.lastFlush = Date.now();
			this.metrics.lastFlushTime = new Date().toISOString();
		} catch (error) {
			console.error("❌ Failed to flush log buffer:", error);
			// Re-add entries to buffer for retry
			this.buffer.entries.unshift(...this.buffer.entries);
		} finally {
			this.buffer.isFlushing = false;
		}
	}

	private async writeToJSONL(entry: LogEntry | LogSession): Promise<void> {
		try {
			const jsonLine = `${JSON.stringify(entry)}\n`;
			appendFileSync(this.config.logFile!, jsonLine, "utf8");
		} catch (error) {
			throw new LoggerError(
				`Failed to write to JSONL file: ${error instanceof Error ? error.message : "Unknown error"}`,
				{ logFile: this.config.logFile, entry },
			);
		}
	}

	private writeToTerminal(entry: LogEntry): void {
		try {
			const timestamp = new Date(entry.timestamp).toLocaleTimeString();
			const level = entry.level.toUpperCase().padEnd(7);

			let output = `[${timestamp}] ${level} ${entry.message}`;

			// Add metadata if present
			if (entry.metadata && Object.keys(entry.metadata).length > 0) {
				output += `\n   Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
			}

			// Use Bun.wrapAnsi() for better terminal formatting if available
			if (typeof Bun !== "undefined" && Bun.wrapAnsi) {
				const wrapped = Bun.wrapAnsi(output, { width: 120 });
				console.log(wrapped);
			} else {
				console.log(output);
			}
		} catch (error) {
			console.error("❌ Failed to write to terminal:", error);
		}
	}

	// ============================================================================
	// ADVANCED FEATURES
	// ============================================================================

	public async searchLogs(filter: LogFilter): Promise<LogEntry[]> {
		try {
			const content = await Bun.file(this.config.logFile!).text();
			const lines = content.split("\n").filter((line) => line.trim());

			const entries: LogEntry[] = [];

			for (const line of lines) {
				try {
					const entry = JSON.parse(line) as LogEntry;
					if (this.matchesFilter(entry, filter)) {
						entries.push(entry);
					}
				} catch {
					// Skip invalid JSON lines
				}
			}

			return entries;
		} catch (error) {
			throw new LoggerError(
				`Failed to search logs: ${error instanceof Error ? error.message : "Unknown error"}`,
				{ filter },
			);
		}
	}

	private matchesFilter(entry: LogEntry, filter: LogFilter): boolean {
		// Filter by level
		if (filter.levels && !filter.levels.includes(entry.level)) {
			return false;
		}

		// Filter by service
		if (filter.services && !filter.services.includes(entry.service!)) {
			return false;
		}

		// Filter by time range
		if (filter.timeRange) {
			const entryTime = new Date(entry.timestamp).getTime();
			const startTime = new Date(filter.timeRange.start).getTime();
			const endTime = new Date(filter.timeRange.end).getTime();

			if (entryTime < startTime || entryTime > endTime) {
				return false;
			}
		}

		// Filter by correlation ID
		if (filter.correlationId && entry.correlationId !== filter.correlationId) {
			return false;
		}

		// Filter by user ID
		if (filter.userId && entry.userId !== filter.userId) {
			return false;
		}

		// Filter by metadata
		if (filter.metadata) {
			for (const [key, value] of Object.entries(filter.metadata)) {
				if (entry.metadata?.[key] !== value) {
					return false;
				}
			}
		}

		return true;
	}

	public getMetrics(): LoggerMetrics {
		return { ...this.metrics };
	}

	public async shutdown(): Promise<void> {
		try {
			// Flush remaining buffer
			await this.flushBuffer();

			// Write session footer
			const footer: LogSession = {
				timestamp: new Date().toISOString(),
				type: "log_session_end",
				version: "2.0.0",
				bun_version: process.version,
				node_env: process.env.NODE_ENV || "development",
				sessionId: this.sessionId,
			};

			await this.writeToJSONL(footer);

			this.info("✅ Enhanced Logger shutdown complete", {
				sessionId: this.sessionId,
				duration: performance.now() - this.startTime,
				metrics: this.metrics,
			});

			this.isInitialized = false;
		} catch (error) {
			console.error("❌ Failed to shutdown logger gracefully:", error);
		}
	}
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Lazy Logger Instance to prevent circular dependencies
 */
let _globalLoggerInstance: EnhancedLogger | null = null;

export const getLogger = (options?: LoggerOptions): EnhancedLogger => {
	if (!_globalLoggerInstance) {
		_globalLoggerInstance = new EnhancedLogger(options);
	}
	return _globalLoggerInstance;
};

export const createLogger = (options: LoggerOptions): EnhancedLogger => {
	return new EnhancedLogger(options);
};

export function createDefaultLogger(): EnhancedLogger {
	return new EnhancedLogger({
		service: "bun-enterprise",
		level: LogLevel.INFO,
		enableMetrics: true,
		enableColors: true,
	});
}

// ============================================================================
// EXPORTS
// ============================================================================

export * from "../types";
