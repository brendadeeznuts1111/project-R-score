/**
 * Error Handling Recipes for Bun Module Resolution APIs
 *
 * Provides reusable error handling patterns for Bun.resolve, Bun.resolveSync,
 * and import.meta.resolve operations.
 *
 * ## Documentation Links
 *
 * - [Bun.resolve](https://bun.com/docs/api/utils#bun-resolve) - Asynchronous module resolution
 * - [Bun.resolveSync](https://bun.com/docs/api/utils#bun-resolvesync) - Synchronous module resolution
 * - [import.meta.resolve](https://bun.com/docs/runtime/bun-apis#importmetaresolve) - ESM module resolution
 * - [ResolveMessage](https://bun.com/docs/api/utils#resolvemessage) - Error class for resolution failures
 * - [Module Resolution Guide](./module-resolution-guide.md) - Complete guide with examples
 *
 * @see https://bun.com/docs/api/utils#bun-resolve
 * @see https://bun.com/docs/api/utils#bun-resolvesync
 * @see https://bun.com/docs/runtime/bun-apis#importmetaresolve
 */

// ResolveMessage is a global class in Bun, no import needed

// ── Type Definitions ────────────────────────────────────────────────────────

export interface ResolveError extends Error {
	code: string;
	specifier?: string;
	referrer?: string;
}

export interface ResolveResult<T> {
	success: boolean;
	path?: string;
	error?: ResolveError;
	data?: T;
}

// ── Error Classification ────────────────────────────────────────────────────

/**
 * Classify a ResolveMessage error by its code
 * ResolveMessage is a global class in Bun
 */
export function classifyResolveError(error: ResolveMessage): ResolveError {
	return {
		name: 'ResolveError',
		message: error.message,
		code: error.code,
		specifier: error.specifier,
		referrer: error.referrer,
	} as ResolveError;
}

/**
 * Check if an error is a ResolveMessage
 * ResolveMessage is a global class in Bun
 */
export function isResolveMessage(error: unknown): error is ResolveMessage {
	return (
		error instanceof Error &&
		error.name === 'ResolveMessage' &&
		'code' in error &&
		typeof (error as {code: unknown}).code === 'string'
	);
}

// ── Recipe 1: Basic Error Handling ─────────────────────────────────────────

/**
 * Basic error handling for Bun.resolve
 *
 * @see https://bun.com/docs/api/utils#bun-resolve
 *
 * @example
 * ```typescript
 * const result = await resolveWithErrorHandling('lodash', import.meta.dir);
 * if (result.success) {
 *   console.log('Resolved:', result.path);
 * } else {
 *   console.error('Error:', result.error?.message);
 * }
 * ```
 */
export async function resolveWithErrorHandling(specifier: string, from?: string): Promise<ResolveResult<string>> {
	try {
		const path = await Bun.resolve(specifier, from);
		return {success: true, path, data: path};
	} catch (error) {
		if (isResolveMessage(error)) {
			return {
				success: false,
				error: classifyResolveError(error),
			};
		}
		return {
			success: false,
			error: {
				name: 'UnknownError',
				message: error instanceof Error ? error.message : String(error),
				code: 'UNKNOWN',
			},
		};
	}
}

/**
 * Basic error handling for Bun.resolveSync
 *
 * @see https://bun.com/docs/api/utils#bun-resolvesync
 */
export function resolveSyncWithErrorHandling(specifier: string, from?: string): ResolveResult<string> {
	try {
		const path = Bun.resolveSync(specifier, from);
		return {success: true, path, data: path};
	} catch (error) {
		if (isResolveMessage(error)) {
			return {
				success: false,
				error: classifyResolveError(error),
			};
		}
		return {
			success: false,
			error: {
				name: 'UnknownError',
				message: error instanceof Error ? error.message : String(error),
				code: 'UNKNOWN',
			},
		};
	}
}

// ── Recipe 2: Error-Specific Handling ──────────────────────────────────────

/**
 * Handle specific ResolveMessage error codes
 *
 * @example
 * ```typescript
 * const result = await resolveWithSpecificHandling('missing-module');
 * switch (result.error?.code) {
 *   case 'MODULE_NOT_FOUND':
 *     console.log('Module not found, trying fallback...');
 *     break;
 *   case 'INVALID_SPECIFIER':
 *     console.error('Invalid module specifier');
 *     break;
 * }
 * ```
 */
export async function resolveWithSpecificHandling(specifier: string, from?: string): Promise<ResolveResult<string>> {
	try {
		const path = await Bun.resolve(specifier, from);
		return {success: true, path, data: path};
	} catch (error) {
		if (isResolveMessage(error)) {
			const resolveError = classifyResolveError(error);

			// Handle specific error codes
			switch (resolveError.code) {
				case 'MODULE_NOT_FOUND':
					// Module doesn't exist - could try fallback or suggest installation
					break;
				case 'INVALID_SPECIFIER':
					// Invalid module specifier format
					break;
				case 'CIRCULAR_DEPENDENCY':
					// Circular dependency detected
					break;
				default:
					// Unknown error code
					break;
			}

			return {
				success: false,
				error: resolveError,
			};
		}

		return {
			success: false,
			error: {
				name: 'UnknownError',
				message: error instanceof Error ? error.message : String(error),
				code: 'UNKNOWN',
			},
		};
	}
}

// ── Recipe 3: Retry with Fallback ──────────────────────────────────────────

/**
 * Resolve with fallback options
 *
 * @example
 * ```typescript
 * const result = await resolveWithFallback('lodash', [
 *   import.meta.dir,
 *   process.cwd(),
 *   '/usr/local/lib/node_modules'
 * ]);
 * ```
 */
export async function resolveWithFallback(specifier: string, fallbackPaths: string[]): Promise<ResolveResult<string>> {
	// Try resolving from current context first
	try {
		const path = await Bun.resolve(specifier, process.cwd());
		return {success: true, path, data: path};
	} catch (error) {
		if (!isResolveMessage(error)) {
			return {
				success: false,
				error: {
					name: 'UnknownError',
					message: error instanceof Error ? error.message : String(error),
					code: 'UNKNOWN',
				},
			};
		}
	}

	// Try each fallback path
	for (const from of fallbackPaths) {
		try {
			const path = await Bun.resolve(specifier, from);
			return {success: true, path, data: path};
		} catch (_error) {
			// Continue to next fallback
			continue;
		}
	}

	// All fallbacks failed
	return {
		success: false,
		error: {
			name: 'ResolveError',
			message: `Could not resolve "${specifier}" from any fallback path`,
			code: 'MODULE_NOT_FOUND',
			specifier,
		},
	};
}

// ── Recipe 4: Batch Resolution with Error Collection ────────────────────────

/**
 * Resolve multiple modules, collecting all errors
 *
 * @example
 * ```typescript
 * const results = await resolveBatch(['lodash', 'uuid', 'missing-module']);
 * const successful = results.filter(r => r.success);
 * const failed = results.filter(r => !r.success);
 * ```
 */
export async function resolveBatch(specifiers: string[], from?: string): Promise<ResolveResult<string>[]> {
	const results = await Promise.allSettled(
		specifiers.map(async specifier => {
			try {
				const path = await Bun.resolve(specifier, from);
				return {success: true, path, data: path} as ResolveResult<string>;
			} catch (error) {
				if (isResolveMessage(error)) {
					return {
						success: false,
						error: classifyResolveError(error),
					} as ResolveResult<string>;
				}
				return {
					success: false,
					error: {
						name: 'UnknownError',
						message: error instanceof Error ? error.message : String(error),
						code: 'UNKNOWN',
					},
				} as ResolveResult<string>;
			}
		}),
	);

	return results.map(result => {
		if (result.status === 'fulfilled') {
			return result.value;
		}
		return {
			success: false,
			error: {
				name: 'PromiseRejected',
				message: result.reason?.message ?? 'Promise rejected',
				code: 'PROMISE_REJECTED',
			},
		};
	});
}

// ── Recipe 5: Safe Import with Error Handling ───────────────────────────────

/**
 * Safely import a module with error handling
 *
 * @example
 * ```typescript
 * const result = await safeImport('lodash', import.meta.dir);
 * if (result.success) {
 *   const _ = result.module;
 *   // Use the module
 * }
 * ```
 */
export async function safeImport<T = unknown>(specifier: string, from?: string): Promise<ResolveResult<T>> {
	try {
		// First resolve the path
		const path = await Bun.resolve(specifier, from ?? process.cwd());

		// Then import it
		const module = await import(path);

		return {
			success: true,
			path,
			data: module as T,
		};
	} catch (error) {
		if (isResolveMessage(error)) {
			return {
				success: false,
				error: classifyResolveError(error),
			};
		}

		// Could be an import error (syntax, runtime, etc.)
		return {
			success: false,
			error: {
				name: 'ImportError',
				message: error instanceof Error ? error.message : String(error),
				code: 'IMPORT_FAILED',
				specifier,
			},
		};
	}
}

// ── Recipe 6: import.meta.resolve Error Handling ────────────────────────────

/**
 * Error handling for import.meta.resolve
 *
 * @example
 * ```typescript
 * const result = await importMetaResolveWithErrorHandling('./utils');
 * if (result.success) {
 *   console.log('Resolved:', result.path);
 * }
 * ```
 */
/**
 * Error handling for import.meta.resolve
 *
 * @see https://bun.com/docs/runtime/bun-apis#importmetaresolve
 *
 * Note: import.meta.resolve signature may vary by Bun version
 */
export function importMetaResolveWithErrorHandling(specifier: string, parent?: string): ResolveResult<string> {
	try {
		// import.meta.resolve may have different signatures in different Bun versions
		// @ts-expect-error - import.meta.resolve signature varies
		const path = import.meta.resolve(specifier, parent);
		return {success: true, path, data: path};
	} catch (error) {
		if (isResolveMessage(error)) {
			return {
				success: false,
				error: classifyResolveError(error),
			};
		}
		return {
			success: false,
			error: {
				name: 'UnknownError',
				message: error instanceof Error ? error.message : String(error),
				code: 'UNKNOWN',
			},
		};
	}
}

// ── Recipe 7: Error Logging and Reporting ───────────────────────────────────

/**
 * Resolve with detailed error logging
 */
export async function resolveWithLogging(
	specifier: string,
	from?: string,
	logger?: (error: ResolveError) => void,
): Promise<ResolveResult<string>> {
	try {
		const path = await Bun.resolve(specifier, from);
		return {success: true, path, data: path};
	} catch (error) {
		if (isResolveMessage(error)) {
			const resolveError = classifyResolveError(error);

			// Log error details
			if (logger) {
				logger(resolveError);
			} else {
				console.error(`[ResolveError] ${resolveError.code}: ${resolveError.message}`);
				if (resolveError.specifier) {
					console.error(`  Specifier: ${resolveError.specifier}`);
				}
				if (resolveError.referrer) {
					console.error(`  Referrer: ${resolveError.referrer}`);
				}
				if (from) {
					console.error(`  From: ${from}`);
				}
			}

			return {
				success: false,
				error: resolveError,
			};
		}

		const unknownError: ResolveError = {
			name: 'UnknownError',
			message: error instanceof Error ? error.message : String(error),
			code: 'UNKNOWN',
		};

		if (logger) {
			logger(unknownError);
		}

		return {
			success: false,
			error: unknownError,
		};
	}
}

// ── Recipe 8: Type-Safe Error Handling ──────────────────────────────────────

/**
 * Type-safe error handling with discriminated union
 */
export type ResolveErrorCode =
	| 'MODULE_NOT_FOUND'
	| 'INVALID_SPECIFIER'
	| 'CIRCULAR_DEPENDENCY'
	| 'UNKNOWN'
	| 'IMPORT_FAILED'
	| 'PROMISE_REJECTED';

export interface TypedResolveError {
	readonly code: ResolveErrorCode;
	readonly message: string;
	readonly specifier?: string;
	readonly referrer?: string;
	readonly from?: string;
}

export function createTypedResolveError(error: unknown, from?: string): TypedResolveError {
	if (isResolveMessage(error)) {
		return {
			code: error.code as ResolveErrorCode,
			message: error.message,
			specifier: error.specifier,
			referrer: error.referrer,
			from,
		};
	}

	return {
		code: 'UNKNOWN',
		message: error instanceof Error ? error.message : String(error),
		from,
	};
}

/**
 * Type-safe resolve with typed error handling
 */
export async function resolveWithTypedErrors(
	specifier: string,
	from?: string,
): Promise<{success: true; path: string} | {success: false; error: TypedResolveError}> {
	try {
		const path = await Bun.resolve(specifier, from);
		return {success: true, path};
	} catch (error) {
		return {
			success: false,
			error: createTypedResolveError(error, from),
		};
	}
}
