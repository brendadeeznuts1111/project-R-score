#!/usr/bin/env bun

/**
 * Kimi Shell Structured Logger
 * JSON logging with levels, rotation, and filtering
 */

import { existsSync, mkdirSync, renameSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const LOG_DIR = join(homedir(), ".kimi", "logs");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

export type LogLevel = "debug" | "info" | "warn" | "error" | "audit";

interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	component?: string;
	context?: Record<string, unknown>;
	error?: {
		message: string;
		stack?: string;
		code?: string;
	};
}

interface LoggerOptions {
	level?: LogLevel;
	component?: string;
	enableConsole?: boolean;
	enableFile?: boolean;
	logFile?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	audit: 4,
};

class StructuredLogger {
	private level: LogLevel;
	private component: string;
	private enableConsole: boolean;
	private enableFile: boolean;
	private logFile: string;

	constructor(options: LoggerOptions = {}) {
		this.level = options.level || "info";
		this.component = options.component || "kimi-shell";
		this.enableConsole = options.enableConsole ?? true;
		this.enableFile = options.enableFile ?? true;
		this.logFile = options.logFile || join(LOG_DIR, "kimi.log");

		this.ensureLogDir();
	}

	private ensureLogDir(): void {
		if (!existsSync(LOG_DIR)) {
			mkdirSync(LOG_DIR, { recursive: true });
		}
	}

	private shouldLog(level: LogLevel): boolean {
		return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
	}

	private formatConsole(entry: LogEntry): string {
		const colors: Record<LogLevel, string> = {
			debug: "\x1b[90m", // gray
			info: "\x1b[36m", // cyan
			warn: "\x1b[33m", // yellow
			error: "\x1b[31m", // red
			audit: "\x1b[35m", // magenta
		};
		const reset = "\x1b[0m";

		const timestamp = entry.timestamp.slice(11, 23); // HH:MM:SS.mmm
		const levelStr = entry.level.toUpperCase().padStart(5);
		const component = entry.component || this.component;

		return `${colors[entry.level]}[${timestamp}] ${levelStr} [${component}]${reset} ${entry.message}`;
	}

	private async rotateIfNeeded(): Promise<void> {
		if (!existsSync(this.logFile)) return;

		const stats = statSync(this.logFile);
		if (stats.size < MAX_LOG_SIZE) return;

		// Rotate files: kimi.log -> kimi.log.1 -> kimi.log.2 -> ...
		for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
			const oldFile = `${this.logFile}.${i}`;
			const newFile = `${this.logFile}.${i + 1}`;

			if (existsSync(oldFile)) {
				if (i === MAX_LOG_FILES - 1) {
					// Delete oldest
					Bun.file(oldFile)
						.delete()
						.catch(() => {});
				} else {
					renameSync(oldFile, newFile);
				}
			}
		}

		renameSync(this.logFile, `${this.logFile}.1`);
	}

	private async write(entry: LogEntry): Promise<void> {
		const jsonLine = JSON.stringify(entry) + "\n";

		if (this.enableConsole) {
			const consoleOutput = this.formatConsole(entry);
			if (entry.level === "error") {
				console.error(consoleOutput);
			} else {
				console.log(consoleOutput);
			}
		}

		if (this.enableFile) {
			await this.rotateIfNeeded();
			await Bun.write(this.logFile, jsonLine, { append: true });
		}
	}

	log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
		if (!this.shouldLog(level)) return;

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			component: this.component,
			context,
		};

		this.write(entry).catch(() => {});
	}

	debug(message: string, context?: Record<string, unknown>): void {
		this.log("debug", message, context);
	}

	info(message: string, context?: Record<string, unknown>): void {
		this.log("info", message, context);
	}

	warn(message: string, context?: Record<string, unknown>): void {
		this.log("warn", message, context);
	}

	error(message: string, error?: Error, context?: Record<string, unknown>): void {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level: "error",
			message,
			component: this.component,
			context,
		};

		if (error) {
			entry.error = {
				message: error.message,
				stack: error.stack,
				code: (error as any).code,
			};
		}

		this.write(entry).catch(() => {});
	}

	audit(action: string, user: string, details: Record<string, unknown>): void {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level: "audit",
			message: `AUDIT: ${action}`,
			component: this.component,
			context: { user, ...details },
		};

		this.write(entry).catch(() => {});
	}

	child(component: string): StructuredLogger {
		return new StructuredLogger({
			level: this.level,
			component: `${this.component}.${component}`,
			enableConsole: this.enableConsole,
			enableFile: this.enableFile,
			logFile: this.logFile,
		});
	}

	async query(
		options: {
			level?: LogLevel;
			since?: Date;
			until?: Date;
			component?: string;
			limit?: number;
		} = {},
	): Promise<LogEntry[]> {
		const entries: LogEntry[] = [];
		const files = [this.logFile];

		// Include rotated files
		for (let i = 1; i <= MAX_LOG_FILES; i++) {
			const rotated = `${this.logFile}.${i}`;
			if (existsSync(rotated)) {
				files.push(rotated);
			}
		}

		for (const file of files) {
			try {
				const content = await Bun.file(file).text();
				const lines = content.split("\n").filter(Boolean);

				for (const line of lines) {
					try {
						const entry: LogEntry = JSON.parse(line);

						// Apply filters
						if (options.level && LOG_LEVELS[entry.level] < LOG_LEVELS[options.level]) {
							continue;
						}
						if (options.since && new Date(entry.timestamp) < options.since) {
							continue;
						}
						if (options.until && new Date(entry.timestamp) > options.until) {
							continue;
						}
						if (options.component && !entry.component?.includes(options.component)) {
							continue;
						}

						entries.push(entry);
					} catch {
						// Skip invalid lines
					}
				}
			} catch {
				// File doesn't exist
			}
		}

		// Sort by timestamp (newest first) and limit
		entries.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);

		if (options.limit) {
			return entries.slice(0, options.limit);
		}

		return entries;
	}
}

// Global logger instance
export const logger = new StructuredLogger();

async function main() {
	const args = Bun.argv.slice(2);
	const command = args[0];

	switch (command) {
		case "test": {
			const testLogger = new StructuredLogger({ component: "test" });

			testLogger.debug("Debug message", { detail: "value" });
			testLogger.info("Info message");
			testLogger.warn("Warning message", { count: 42 });
			testLogger.error("Error message", new Error("Test error"));
			testLogger.audit("user.login", "admin", { ip: "127.0.0.1" });

			console.log("\n✓ Test logs written");
			break;
		}

		case "query": {
			const level = args[1] as LogLevel | undefined;
			const limit = args[2] ? parseInt(args[2]) : 20;

			const entries = await logger.query({ level, limit });

			console.log(`Found ${entries.length} entries:\n`);

			for (const entry of entries) {
				const timestamp = entry.timestamp.slice(0, 19).replace("T", " ");
				const levelColor: Record<LogLevel, string> = {
					debug: "\x1b[90m",
					info: "\x1b[36m",
					warn: "\x1b[33m",
					error: "\x1b[31m",
					audit: "\x1b[35m",
				};
				const reset = "\x1b[0m";

				console.log(
					`${timestamp} ${levelColor[entry.level]}[${entry.level.toUpperCase()}]${reset} ${entry.message}`,
				);

				if (entry.context && Object.keys(entry.context).length > 0) {
					console.log(
						`  ${"\x1b[90m"}Context: ${JSON.stringify(entry.context)}${reset}`,
					);
				}

				if (entry.error) {
					console.log(`  ${"\x1b[31m"}Error: ${entry.error.message}${reset}`);
				}
			}
			break;
		}

		case "tail": {
			const lines = args[1] ? parseInt(args[1]) : 10;
			const entries = await logger.query({ limit: lines });

			entries.reverse().forEach((entry) => {
				console.log(`${entry.timestamp} [${entry.level}] ${entry.message}`);
			});
			break;
		}

		case "path": {
			console.log(LOG_DIR);
			break;
		}

		default: {
			console.log("🐚 Kimi Structured Logger\n");
			console.log("Usage:");
			console.log("  logger.ts test              Write test logs");
			console.log(
				"  logger.ts query [level] [n] Query logs (level: debug|info|warn|error|audit)",
			);
			console.log("  logger.ts tail [n]          Show last n log lines");
			console.log("  logger.ts path              Show log directory");
			console.log("\nFeatures:");
			console.log("  • JSON structured logging");
			console.log("  • 5 log levels (debug, info, warn, error, audit)");
			console.log("  • Automatic rotation (10MB per file, 5 files max)");
			console.log("  • Query/filter logs by level, time, component");
		}
	}
}

if (import.meta.main) {
	main().catch(console.error);
}

export { StructuredLogger };
