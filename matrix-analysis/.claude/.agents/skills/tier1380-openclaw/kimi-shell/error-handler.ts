#!/usr/bin/env bun
/**
 * Kimi Shell Error Handler
 * Centralized error handling with classification and recovery
 */

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	gray: "\x1b[90m",
};

export type ErrorSeverity = "low" | "medium" | "high" | "critical";
export type ErrorCategory =
	| "user"
	| "system"
	| "network"
	| "permission"
	| "resource"
	| "unknown";

export interface ErrorContext {
	command?: string;
	args?: string[];
	profile?: string;
	timestamp: number;
	stack?: string;
	[key: string]: unknown;
}

export class KimiError extends Error {
	public readonly code: string;
	public readonly severity: ErrorSeverity;
	public readonly category: ErrorCategory;
	public readonly retryable: boolean;
	public readonly context: ErrorContext;
	public readonly timestamp: number;

	constructor(
		message: string,
		options: {
			code: string;
			severity?: ErrorSeverity;
			category?: ErrorCategory;
			retryable?: boolean;
			context?: Partial<ErrorContext>;
			cause?: Error;
		},
	) {
		super(message, { cause: options.cause });
		this.name = "KimiError";
		this.code = options.code;
		this.severity = options.severity || "medium";
		this.category = options.category || "unknown";
		this.retryable = options.retryable ?? false;
		this.timestamp = Date.now();
		this.context = {
			timestamp: this.timestamp,
			...options.context,
		};
	}

	toJSON(): object {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			severity: this.severity,
			category: this.category,
			retryable: this.retryable,
			context: this.context,
			stack: this.stack,
		};
	}
}

// Error code registry
export const ErrorCodes = {
	// User errors (400-499)
	INVALID_COMMAND: "KIMI_400",
	INVALID_ARGUMENT: "KIMI_401",
	PROFILE_NOT_FOUND: "KIMI_404",
	PLUGIN_NOT_FOUND: "KIMI_405",

	// System errors (500-599)
	EXECUTION_FAILED: "KIMI_500",
	INIT_FAILED: "KIMI_501",
	STATE_CORRUPTED: "KIMI_502",

	// Network errors (600-699)
	MCP_CONNECTION_FAILED: "KIMI_600",
	ACP_CONNECTION_FAILED: "KIMI_601",
	GATEWAY_UNREACHABLE: "KIMI_602",

	// Permission errors (700-799)
	ACCESS_DENIED: "KIMI_700",
	SECRET_NOT_FOUND: "KIMI_701",

	// Resource errors (800-899)
	RESOURCE_EXHAUSTED: "KIMI_800",
	DISK_FULL: "KIMI_801",
	MEMORY_LIMIT: "KIMI_802",
} as const;

export interface RetryOptions {
	maxRetries: number;
	initialDelay: number;
	maxDelay: number;
	backoffMultiplier: number;
	retryableErrors?: string[];
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
	maxRetries: 3,
	initialDelay: 1000,
	maxDelay: 30000,
	backoffMultiplier: 2,
};

export async function withRetry<T>(
	fn: () => Promise<T>,
	options: Partial<RetryOptions> = {},
): Promise<T> {
	const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
	let lastError: Error | undefined;
	let delay = opts.initialDelay;

	for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;

			// Check if error is retryable
			const kimiError = error instanceof KimiError ? error : null;
			const isRetryable = kimiError?.retryable ?? false;

			if (!isRetryable || attempt === opts.maxRetries) {
				throw error;
			}

			// Wait before retry
			await new Promise((resolve) => setTimeout(resolve, delay));
			delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
		}
	}

	throw lastError;
}

export class ErrorHandler {
	private errorLog: KimiError[] = [];
	private maxLogSize = 100;

	handle(error: unknown, context?: Partial<ErrorContext>): KimiError {
		const kimiError = this.normalizeError(error, context);

		// Log the error
		this.logError(kimiError);

		// Display to user
		this.displayError(kimiError);

		return kimiError;
	}

	private normalizeError(error: unknown, context?: Partial<ErrorContext>): KimiError {
		if (error instanceof KimiError) {
			return error;
		}

		if (error instanceof Error) {
			return new KimiError(error.message, {
				code: ErrorCodes.EXECUTION_FAILED,
				severity: "high",
				category: "system",
				context: { ...context, stack: error.stack },
				cause: error,
			});
		}

		return new KimiError(String(error), {
			code: ErrorCodes.EXECUTION_FAILED,
			severity: "medium",
			category: "unknown",
			context,
		});
	}

	private logError(error: KimiError): void {
		this.errorLog.push(error);
		if (this.errorLog.length > this.maxLogSize) {
			this.errorLog.shift();
		}

		// Persist to file (async, don't block)
		this.persistError(error).catch(() => {});
	}

	private async persistError(error: KimiError): Promise<void> {
		const logPath = `${process.env.HOME}/.kimi/logs/errors.jsonl`;
		const line = JSON.stringify(error.toJSON()) + "\n";

		try {
			await Bun.write(logPath, line, { append: true });
		} catch {
			// Fail silently - can't log the logging error
		}
	}

	private displayError(error: KimiError): void {
		const color =
			error.severity === "critical"
				? COLORS.red
				: error.severity === "high"
					? COLORS.yellow
					: COLORS.cyan;

		console.error(`\n${color}${COLORS.bold}Error [${error.code}]${COLORS.reset}`);
		console.error(`${color}${error.message}${COLORS.reset}`);

		if (error.retryable) {
			console.error(
				`${COLORS.gray}(This error may be temporary - retry with: kimi retry)${COLORS.reset}`,
			);
		}

		// Show help based on error code
		const help = this.getHelpForError(error.code);
		if (help) {
			console.error(`\n${COLORS.gray}💡 ${help}${COLORS.reset}`);
		}
	}

	private getHelpForError(code: string): string | null {
		const helpMap: Record<string, string> = {
			[ErrorCodes.PROFILE_NOT_FOUND]:
				"Create the profile with: kimi profile create <name>",
			[ErrorCodes.PLUGIN_NOT_FOUND]:
				"Install the plugin with: kimi plugin install <name>",
			[ErrorCodes.MCP_CONNECTION_FAILED]: "Check MCP server status: kimi mcp status",
			[ErrorCodes.SECRET_NOT_FOUND]: "Add the secret with: kimi vault set <key>",
			[ErrorCodes.GATEWAY_UNREACHABLE]: "Start the gateway with: openclaw start",
		};
		return helpMap[code] || null;
	}

	getRecentErrors(count: number = 10): KimiError[] {
		return this.errorLog.slice(-count);
	}

	clearLog(): void {
		this.errorLog = [];
	}
}

// Global error handler instance
export const errorHandler = new ErrorHandler();

// Wrapper for async functions
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	context?: Partial<ErrorContext>,
): T {
	return (async (...args: any[]) => {
		try {
			return await fn(...args);
		} catch (error) {
			throw errorHandler.handle(error, { ...context, args });
		}
	}) as T;
}

async function main() {
	const args = Bun.argv.slice(2);
	const command = args[0];

	switch (command) {
		case "test": {
			// Test error handling
			try {
				throw new KimiError("Profile not found: production", {
					code: ErrorCodes.PROFILE_NOT_FOUND,
					severity: "high",
					category: "user",
					retryable: false,
					context: { profile: "production", command: "switch" },
				});
			} catch (error) {
				errorHandler.handle(error);
			}
			break;
		}

		case "retry": {
			console.log(`${COLORS.cyan}Retrying last command...${COLORS.reset}`);
			// Would retry last command from session
			break;
		}

		case "logs": {
			const errors = errorHandler.getRecentErrors(5);
			console.log(`${COLORS.bold}Recent Errors:${COLORS.reset}\n`);
			for (const err of errors) {
				console.log(`[${err.code}] ${err.message}`);
			}
			break;
		}

		default: {
			console.log(`${COLORS.bold}🐚 Kimi Error Handler${COLORS.reset}\n`);
			console.log("Usage:");
			console.log("  error-handler.ts test    Test error display");
			console.log("  error-handler.ts retry   Retry last command");
			console.log("  error-handler.ts logs    Show recent errors");
		}
	}
}

if (import.meta.main) {
	main().catch(console.error);
}
