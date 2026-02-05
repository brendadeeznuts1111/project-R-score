/**
 * Enterprise error handling utilities
 */

import type { AppError } from "../types";

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class EnterpriseError extends Error implements AppError {
	public readonly code: string;
	public readonly statusCode: number;
	public readonly details: Record<string, any>;
	public readonly timestamp: string;
	public readonly correlationId?: string;
	public readonly service?: string;

	constructor(
		message: string,
		code = "ENTERPRISE_ERROR",
		statusCode = 500,
		details: Record<string, any> = {},
		correlationId?: string,
		service?: string,
	) {
		super(message);
		this.name = "EnterpriseError";
		this.code = code;
		this.statusCode = statusCode;
		this.details = details;
		this.timestamp = new Date().toISOString();
		this.correlationId = correlationId;
		this.service = service;

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, EnterpriseError);
		}
	}

	toJSON(): Record<string, any> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			statusCode: this.statusCode,
			details: this.details,
			timestamp: this.timestamp,
			correlationId: this.correlationId,
			service: this.service,
			stack: this.stack,
		};
	}
}

export class LoggerError extends EnterpriseError {
	constructor(
		message: string,
		details: Record<string, any> = {},
		correlationId?: string,
	) {
		super(message, "LOGGER_ERROR", 500, details, correlationId, "logger");
	}
}

export class ProfilerError extends EnterpriseError {
	constructor(
		message: string,
		details: Record<string, any> = {},
		correlationId?: string,
	) {
		super(message, "PROFILER_ERROR", 500, details, correlationId, "profiler");
	}
}

export class InspectorError extends EnterpriseError {
	constructor(
		message: string,
		details: Record<string, any> = {},
		correlationId?: string,
	) {
		super(message, "INSPECTOR_ERROR", 500, details, correlationId, "inspector");
	}
}

export class TerminalError extends EnterpriseError {
	constructor(
		message: string,
		details: Record<string, any> = {},
		correlationId?: string,
	) {
		super(message, "TERMINAL_ERROR", 500, details, correlationId, "terminal");
	}
}

export class ConfigError extends EnterpriseError {
	constructor(
		message: string,
		configType: string,
		details: Record<string, any> = {},
		correlationId?: string,
	) {
		super(
			message,
			"CONFIG_ERROR",
			500,
			{ ...details, configType },
			correlationId,
			"config",
		);
	}
}

export class ValidationError extends EnterpriseError {
	public readonly field: string;
	public readonly value: any;

	constructor(
		message: string,
		field: string,
		value?: any,
		correlationId?: string,
	) {
		super(
			message,
			"VALIDATION_ERROR",
			400,
			{ field, value },
			correlationId,
			"validation",
		);
		this.field = field;
		this.value = value;
	}
}

export class SecurityError extends EnterpriseError {
	constructor(
		message: string,
		details: Record<string, any> = {},
		correlationId?: string,
	) {
		super(message, "SECURITY_ERROR", 403, details, correlationId, "security");
	}
}

export class AuthenticationError extends EnterpriseError {
	constructor(
		message: string = "Authentication failed",
		correlationId?: string,
	) {
		super(message, "AUTH_ERROR", 401, {}, correlationId, "auth");
	}
}

export class AuthorizationError extends EnterpriseError {
	constructor(message: string = "Access denied", correlationId?: string) {
		super(message, "AUTHZ_ERROR", 403, {}, correlationId, "authz");
	}
}

export class RateLimitError extends EnterpriseError {
	constructor(
		message: string = "Rate limit exceeded",
		details: Record<string, any> = {},
		correlationId?: string,
	) {
		super(
			message,
			"RATE_LIMIT_ERROR",
			429,
			details,
			correlationId,
			"ratelimit",
		);
	}
}

// ============================================================================
// ERROR FACTORY
// ============================================================================

export class ErrorFactory {
	private static generateCorrelationId(): string {
		return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	static createError(
		type: keyof typeof ErrorTypes,
		message: string,
		details: Record<string, any> = {},
		correlationId?: string,
	): EnterpriseError {
		const id = correlationId || ErrorFactory.generateCorrelationId();
		const ErrorClass = ErrorTypes[type];
		return new ErrorClass(message, details, id);
	}

	static fromError(
		error: unknown,
		context: Record<string, any> = {},
	): EnterpriseError {
		if (error instanceof EnterpriseError) {
			return error;
		}

		if (error instanceof Error) {
			return new EnterpriseError(
				error.message,
				"UNKNOWN_ERROR",
				500,
				{ ...context, originalError: error.name },
				context.correlationId,
			);
		}

		return new EnterpriseError(
			String(error),
			"UNKNOWN_ERROR",
			500,
			context,
			context.correlationId,
		);
	}
}

// ============================================================================
// ERROR TYPE MAPPING
// ============================================================================

const ErrorTypes = {
	logger: LoggerError,
	profiler: ProfilerError,
	inspector: InspectorError,
	terminal: TerminalError,
	config: ConfigError,
	validation: ValidationError,
	security: SecurityError,
	auth: AuthenticationError,
	authz: AuthorizationError,
	ratelimit: RateLimitError,
} as const;

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

export interface ErrorHandler {
	handle(error: Error, context?: Record<string, any>): Promise<void>;
}

export class DefaultErrorHandler implements ErrorHandler {
	async handle(error: Error, context: Record<string, any> = {}): Promise<void> {
		const enterpriseError = ErrorFactory.fromError(error, context);

		// Log the error
		console.error("🚨 Enterprise Error:", {
			message: enterpriseError.message,
			code: enterpriseError.code,
			statusCode: enterpriseError.statusCode,
			correlationId: enterpriseError.correlationId,
			service: enterpriseError.service,
			details: enterpriseError.details,
			timestamp: enterpriseError.timestamp,
			stack: enterpriseError.stack,
		});

		// In a real enterprise environment, you would:
		// - Send to error tracking service (Sentry, etc.)
		// - Trigger alerts for critical errors
		// - Store in error database
		// - Notify operations team
	}
}

// ============================================================================
// ERROR RECOVERY UTILITIES
// ============================================================================

export class ErrorRecovery {
	static async withRetry<T>(
		operation: () => Promise<T>,
		maxRetries = 3,
		delay = 1000,
		backoff = 2,
	): Promise<T> {
		let lastError: Error;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				if (attempt === maxRetries) {
					throw lastError;
				}

				console.warn(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`, {
					error: lastError.message,
					attempt,
					maxRetries,
				});

				await new Promise((resolve) => setTimeout(resolve, delay));
				delay *= backoff;
			}
		}

		throw lastError!;
	}

	static async withFallback<T>(
		primaryOperation: () => Promise<T>,
		fallbackOperation: () => Promise<T>,
	): Promise<T> {
		try {
			return await primaryOperation();
		} catch (primaryError) {
			console.warn("⚠️ Primary operation failed, trying fallback...", {
				error:
					primaryError instanceof Error
						? primaryError.message
						: String(primaryError),
			});

			try {
				return await fallbackOperation();
			} catch (_fallbackError) {
				console.error("❌ Both primary and fallback operations failed");
				throw primaryError; // Throw the original error
			}
		}
	}

	static async withTimeout<T>(
		operation: () => Promise<T>,
		timeoutMs: number,
		timeoutError = new Error("Operation timed out"),
	): Promise<T> {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(timeoutError), timeoutMs);
		});

		return Promise.race([operation(), timeoutPromise]);
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export * from "../types";
