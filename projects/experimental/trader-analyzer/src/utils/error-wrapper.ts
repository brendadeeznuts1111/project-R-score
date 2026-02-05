/**
 * @fileoverview Defensive Error Wrapper
 * @description Implements Bun's defensive error handling pattern (event.error || event.message)
 * @module utils/error-wrapper
 * 
 * Pattern: Bun commit 05508a6 - defensive error value extraction
 * Reference: https://github.com/oven-sh/bun/commit/05508a627d299b78099a39b1cfb571373c5656d0
 * 
 * @see {@link ../docs/BUN-HMR-ERROR-HANDLING.md|Bun HMR Error Handling Guide}
 * @see {@link ../docs/VERSION-METADATA-STANDARDS.md|Version & Metadata Standards}
 */

/**
 * Normalized error structure
 */
export interface NormalizedError {
	message: string;
	stack?: string;
	type: string;
	cause?: NormalizedError;
	raw: unknown;
	timestamp: number;
}

/**
 * Normalize any thrown value into a structured error
 * Pattern: Bun's event.error || event.message fallback chain
 * 
 * @param error - Any error value (Error, string, object, null, undefined)
 * @returns Normalized error structure
 * 
 * @example
 * ```typescript
 * try {
 *   riskyOperation();
 * } catch (err) {
 *   const normalized = normalizeError(err);
 *   logger.error('Operation failed', normalized);
 * }
 * ```
 */
export function normalizeError(error: unknown): NormalizedError {
	// Handle Error instances
	if (error instanceof Error) {
		return {
			message: error.message || error.toString() || "Unknown error",
			stack: error.stack,
			type: error.constructor.name,
			cause: error.cause ? normalizeError(error.cause) : undefined,
			raw: error,
			timestamp: Date.now(),
		};
	}

	// Handle error-like objects (e.g., ErrorEvent, { error: ..., message: ... })
	if (error && typeof error === "object" && "error" in error) {
		const errObj = error as { error?: unknown; message?: string };
		// Bun pattern: event.error || event.message
		const actualError = errObj.error || errObj.message || error;

		return normalizeError(actualError);
	}

	// Handle objects with message property
	if (error && typeof error === "object" && "message" in error) {
		const errObj = error as { message?: unknown };
		return {
			message: String(errObj.message || error || "Unknown error"),
			stack: new Error().stack, // Capture stack at call site
			type: error.constructor?.name || "ObjectError",
			raw: error,
			timestamp: Date.now(),
		};
	}

	// Handle primitive values (string, number)
	if (typeof error === "string") {
		return {
			message: error,
			stack: new Error().stack, // Capture stack at call site
			type: "StringError",
			raw: error,
			timestamp: Date.now(),
		};
	}

	if (typeof error === "number") {
		return {
			message: `Error code: ${error}`,
			stack: new Error().stack,
			type: "NumericError",
			raw: error,
			timestamp: Date.now(),
		};
	}

	// Handle null/undefined
	return {
		message: "Unknown error occurred",
		stack: new Error().stack,
		type: "UnknownError",
		raw: error,
		timestamp: Date.now(),
	};
}

/**
 * Safe string extraction with fallback chain
 * Pattern: value?.property || fallback
 * 
 * @param error - Any error value
 * @returns Error message string (never throws)
 * 
 * @example
 * ```typescript
 * const message = getErrorMessage(err); // Always returns a string
 * ```
 */
export function getErrorMessage(error: unknown): string {
	const normalized = normalizeError(error);
	return normalized.message;
}

/**
 * Extract stack trace with fallback
 * 
 * @param error - Any error value
 * @returns Stack trace string or fallback message
 * 
 * @example
 * ```typescript
 * const stack = getErrorStack(err); // Always returns a string
 * ```
 */
export function getErrorStack(error: unknown): string {
	const normalized = normalizeError(error);
	return normalized.stack || "No stack trace available";
}

/**
 * Extract error type/constructor name
 * 
 * @param error - Any error value
 * @returns Error type string
 */
export function getErrorType(error: unknown): string {
	const normalized = normalizeError(error);
	return normalized.type;
}

/**
 * Log error with full context (Bun-style defensive logging)
 * 
 * @param logger - Logger instance with error method
 * @param context - Context description for the error
 * @param error - Error value to log
 * @param metadata - Additional metadata to include
 * 
 * @example
 * ```typescript
 * logError(logger, 'Correlation calculation failed', err, {
 *   sportA: 'basketball',
 *   sportB: 'soccer',
 *   dataSize: data.length
 * });
 * ```
 */
export function logError(
	logger: { error: (message: string, ...args: unknown[]) => void },
	context: string,
	error: unknown,
	metadata: Record<string, unknown> = {},
): void {
	const normalized = normalizeError(error);

	logger.error(context, {
		error: {
			message: normalized.message,
			stack: normalized.stack,
			type: normalized.type,
			cause: normalized.cause,
		},
		...metadata,
		timestamp: normalized.timestamp,
	});
}

/**
 * Create a safe error handler function
 * Returns a function that safely handles errors with defensive pattern
 * 
 * @param logger - Logger instance
 * @param context - Default context for errors
 * @returns Error handler function
 * 
 * @example
 * ```typescript
 * const handleError = createErrorHandler(logger, 'WebSocket connection');
 * ws.on('error', handleError);
 * ```
 */
export function createErrorHandler(
	logger: { error: (message: string, ...args: unknown[]) => void },
	context: string,
) {
	return (error: unknown, metadata?: Record<string, unknown>) => {
		logError(logger, context, error, metadata);
	};
}
