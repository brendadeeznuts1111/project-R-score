/**
 * @fileoverview Circular Buffer Implementation
 * @description High-performance circular buffer with Bun-native inspection
 * @module utils/circular-buffer
 *
 * [hyper-bun][utils][feat][META:priority=high,status=production][circular-buffer][#REF:Bun.inspect.custom]
 *
 * Features:
 * - Fixed-size circular buffer with O(1) operations
 * - Bun-native custom inspection for beautiful debugging
 * - Memory-efficient with configurable capacity
 * - Type-safe with TypeScript generics
 * - Zero dependencies - pure Bun APIs
 *
 * @example
 * ```typescript
 * const buffer = new CircularBuffer<number>(100);
 * buffer.push(1, 2, 3);
 * console.log(buffer); // Beautiful formatted output
 * ```
 */

/**
 * Extended Bun inspection options with advanced array formatting
 */
export interface AdvancedInspectOptions {
	/** Array formatting style: 'oneline', 'structured', 'compact', 'expanded' */
	arrayFormat?: "oneline" | "structured" | "compact" | "expanded";
	/** Custom separator for array items (default: ', ') */
	arraySeparator?: string;
	/** Enhanced maxArrayLength with context-aware scaling */
	maxArrayLength?: number;
	/** Redact sensitive data patterns */
	redactSensitive?: boolean | RegExp[];
	/** Include file context in inspection */
	showFileContext?: boolean;
	/** Standard Bun.inspect options */
	depth?: number;
	colors?: boolean;
	compact?: boolean;
	showHidden?: boolean;
	sorted?: boolean;
	getters?: boolean;
	[key: string]: any; // Allow other Bun.inspect options
}

/**
 * Circular Buffer with Bun-native custom inspection
 *
 * A fixed-size buffer that overwrites oldest items when full.
 * Uses Bun.inspect.custom for beautiful debugging output with advanced features:
 * - Context-aware formatting based on execution environment
 * - Environment-adaptive configuration
 * - Security integration with sensitive data redaction
 * - File context tracking
 *
 * @template T - The type of items stored in the buffer
 */
export class CircularBuffer<T> {
	#buffer: Array<T | undefined>;
	#head = 0;
	#tail = 0;
	#count = 0;
	#capacity: number;
	#createdAt: number;
	#createdIn: string;
	#sensitivePatterns: RegExp[] = [];

	/**
	 * Create a new circular buffer
	 *
	 * @param capacity - Maximum number of items the buffer can hold
	 * @param options - Optional configuration
	 * @param options.sensitivePatterns - Regex patterns for sensitive data redaction
	 * @throws {Error} If capacity is not a positive integer
	 */
	constructor(
		capacity: number,
		options?: {
			sensitivePatterns?: RegExp[];
		},
	) {
		if (!Number.isInteger(capacity) || capacity <= 0) {
			throw new Error(`Capacity must be a positive integer, got ${capacity}`);
		}
		this.#capacity = capacity;
		this.#buffer = new Array(capacity);
		this.#createdAt = Date.now();

		// Capture creation context using Bun.main and import.meta.path
		try {
			// Use import.meta.path if available, fallback to Bun.main
			this.#createdIn = import.meta.path || Bun.main || "unknown";
		} catch {
			this.#createdIn = Bun.main || "unknown";
		}

		// Set up sensitive data patterns
		if (options?.sensitivePatterns) {
			this.#sensitivePatterns = options.sensitivePatterns;
		} else {
			// Default sensitive patterns: API keys, tokens, passwords, etc.
			this.#sensitivePatterns = [
				/(api[_-]?key|apikey)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
				/(token|bearer|authorization)\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
				/(password|passwd|pwd)\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
				/(secret|secret[_-]?key)\s*[:=]\s*["']?([a-zA-Z0-9_-]{16,})["']?/gi,
			];
		}
	}

	/**
	 * Get the current number of items in the buffer
	 */
	get size(): number {
		return this.#count;
	}

	/**
	 * Get the maximum capacity of the buffer
	 */
	get capacity(): number {
		return this.#capacity;
	}

	/**
	 * Check if the buffer is empty
	 */
	get isEmpty(): boolean {
		return this.#count === 0;
	}

	/**
	 * Check if the buffer is full
	 */
	get isFull(): boolean {
		return this.#count === this.#capacity;
	}

	/**
	 * Push one or more items into the buffer
	 *
	 * @param items - Items to add to the buffer
	 * @returns Number of items successfully added
	 *
	 * @example
	 * ```typescript
	 * buffer.push(1, 2, 3);
	 * ```
	 */
	push(...items: T[]): number {
		let added = 0;
		for (const item of items) {
			this.#buffer[this.#tail] = item;
			this.#tail = (this.#tail + 1) % this.#capacity;

			if (this.#count < this.#capacity) {
				this.#count++;
			} else {
				// Buffer is full, overwrite oldest item
				this.#head = (this.#head + 1) % this.#capacity;
			}
			added++;
		}
		return added;
	}

	/**
	 * Remove and return the oldest item from the buffer
	 *
	 * @returns The oldest item, or undefined if buffer is empty
	 *
	 * @example
	 * ```typescript
	 * const item = buffer.pop();
	 * ```
	 */
	pop(): T | undefined {
		if (this.#count === 0) {
			return undefined;
		}

		const item = this.#buffer[this.#head];
		this.#buffer[this.#head] = undefined;
		this.#head = (this.#head + 1) % this.#capacity;
		this.#count--;

		return item;
	}

	/**
	 * Peek at the oldest item without removing it
	 *
	 * @returns The oldest item, or undefined if buffer is empty
	 */
	peek(): T | undefined {
		if (this.#count === 0) {
			return undefined;
		}
		return this.#buffer[this.#head];
	}

	/**
	 * Get the item at a specific index (0 = oldest, size-1 = newest)
	 *
	 * @param index - Zero-based index
	 * @returns The item at the index, or undefined if out of bounds
	 */
	at(index: number): T | undefined {
		if (index < 0 || index >= this.#count) {
			return undefined;
		}
		const actualIndex = (this.#head + index) % this.#capacity;
		return this.#buffer[actualIndex];
	}

	/**
	 * Get a slice of items from the buffer
	 *
	 * @param start - Start index (default: 0)
	 * @param end - End index (default: size)
	 * @returns Array of items in the slice
	 */
	slice(start = 0, end = this.#count): T[] {
		if (start < 0) start = 0;
		if (end > this.#count) end = this.#count;
		if (start >= end) return [];

		const result: T[] = [];
		for (let i = start; i < end; i++) {
			const item = this.at(i);
			if (item !== undefined) {
				result.push(item);
			}
		}
		return result;
	}

	/**
	 * Clear all items from the buffer
	 */
	clear(): void {
		this.#buffer.fill(undefined);
		this.#head = 0;
		this.#tail = 0;
		this.#count = 0;
	}

	/**
	 * Convert buffer to array (oldest to newest)
	 *
	 * @returns Array containing all items
	 */
	toArray(): T[] {
		return this.slice();
	}

	/**
	 * Redact sensitive data from a value
	 *
	 * @param value - Value to potentially redact
	 * @param redactEnabled - Whether redaction is enabled
	 * @returns Redacted value or original value
	 */
	#redactSensitive(value: any, redactEnabled: boolean): any {
		if (!redactEnabled || this.#sensitivePatterns.length === 0) {
			return value;
		}

		if (typeof value === "string") {
			let redacted = value;
			for (const pattern of this.#sensitivePatterns) {
				redacted = redacted.replace(pattern, (match, key, secret) => {
					return `${key}: [REDACTED]`;
				});
			}
			return redacted;
		}

		if (typeof value === "object" && value !== null) {
			if (Array.isArray(value)) {
				return value.map((item) => this.#redactSensitive(item, redactEnabled));
			}

			const redacted: any = {};
			for (const [key, val] of Object.entries(value)) {
				// Check if key itself suggests sensitive data
				const isSensitiveKey =
					/(password|secret|token|key|auth|credential)/i.test(key);
				if (isSensitiveKey && typeof val === "string") {
					redacted[key] = "[REDACTED]";
				} else {
					redacted[key] = this.#redactSensitive(val, redactEnabled);
				}
			}
			return redacted;
		}

		return value;
	}

	/**
	 * Get environment-adaptive configuration
	 *
	 * Adapts inspection behavior based on:
	 * - NODE_ENV (production/development)
	 * - DEBUG_LEVEL environment variable
	 * - Execution context (main script vs module)
	 */
	#getEnvironmentConfig(): {
		verbose: boolean;
		maxItems: number;
		showDetails: boolean;
		redactSensitive: boolean;
	} {
		const nodeEnv = Bun.env.NODE_ENV || "development";
		const debugLevel = Bun.env.DEBUG_LEVEL || "info";
		const isProduction = nodeEnv === "production";
		const isMainScript =
			import.meta.main || (Bun.main && import.meta.path === Bun.main);

		// Determine verbosity based on environment
		const isVerbose =
			!isProduction || debugLevel === "debug" || debugLevel === "trace";

		// Calculate max items based on context
		let maxItems: number;
		if (isMainScript && isVerbose) {
			maxItems = 200; // Very verbose for main script execution
		} else if (isVerbose) {
			maxItems = 100; // Verbose for development
		} else {
			maxItems = 10; // Compact for production
		}

		// Adjust based on DEBUG_LEVEL
		if (debugLevel === "trace") {
			maxItems *= 2;
		} else if (debugLevel === "error" || debugLevel === "warn") {
			maxItems = Math.floor(maxItems / 2);
		}

		return {
			verbose: isVerbose,
			maxItems,
			showDetails: isVerbose || debugLevel === "debug",
			redactSensitive: isProduction && debugLevel !== "debug", // Redact in production unless debug
		};
	}

	/**
	 * Format array with advanced options
	 *
	 * @param items - Items to format
	 * @param options - Formatting options
	 * @returns Formatted string
	 */
	#formatArray(items: T[], options: AdvancedInspectOptions): string {
		const arrayFormat = options.arrayFormat ?? "structured";
		const arraySeparator = options.arraySeparator ?? ", ";
		const inspectOptions: any = {
			...options,
			depth: (options.depth ?? 4) - 1,
			colors: options.colors ?? true,
		};

		switch (arrayFormat) {
			case "oneline": {
				const compact = Bun.inspect(items, {
					...inspectOptions,
					compact: true,
				});
				return compact.replace(/,/g, arraySeparator);
			}

			case "compact": {
				return Bun.inspect(items, { ...inspectOptions, compact: true });
			}

			case "expanded": {
				// Custom expanded format with separators
				if (items.length === 0) return "[]";
				const formatted = items.map((item, idx) => {
					const inspected = Bun.inspect(item, inspectOptions);
					return `  [${idx}]: ${inspected}`;
				});
				return `[\n${formatted.join(arraySeparator.trim() + "\n")}\n]`;
			}

			case "structured":
			default: {
				return Bun.inspect(items, { ...inspectOptions, compact: false });
			}
		}
	}

	/**
	 * Custom Bun.inspect implementation with advanced features
	 *
	 * Features:
	 * - Context-aware formatting (Bun.main, import.meta.path)
	 * - Environment adaptation (NODE_ENV, DEBUG_LEVEL)
	 * - Security integration (sensitive data redaction)
	 * - File context tracking
	 * - Advanced array formatting (arrayFormat, arraySeparator)
	 * - Enhanced maxArrayLength handling
	 *
	 * @param depth - Current inspection depth
	 * @param options - Bun.inspect options with advanced extensions
	 * @returns Formatted inspection object
	 */
	[Bun.inspect.custom](depth: number, options: any): any {
		// Respect max depth
		if (depth < 0) {
			return "[CircularBuffer]";
		}

		const advancedOptions = options as AdvancedInspectOptions;
		const envConfig = this.#getEnvironmentConfig();

		// Extract options with environment-aware defaults
		const baseMaxArrayLength = advancedOptions.maxArrayLength ?? 50;
		const maxArrayLength = envConfig.verbose
			? Math.max(baseMaxArrayLength, envConfig.maxItems)
			: Math.min(baseMaxArrayLength, envConfig.maxItems);

		const arrayFormat =
			advancedOptions.arrayFormat ??
			(envConfig.verbose ? "structured" : "compact");
		const arraySeparator = advancedOptions.arraySeparator ?? ", ";
		const showHidden = advancedOptions.showHidden ?? false;
		const showFileContext =
			advancedOptions.showFileContext ?? envConfig.showDetails;
		const redactSensitive =
			advancedOptions.redactSensitive ?? envConfig.redactSensitive;

		// Calculate visible items with enhanced maxArrayLength handling
		const visibleItems = Math.min(this.#count, maxArrayLength);

		// Extract slice for display
		let displaySlice = this.slice(0, visibleItems);

		// Apply sensitive data redaction if enabled
		if (redactSensitive) {
			displaySlice = displaySlice.map((item) =>
				this.#redactSensitive(item, true),
			) as T[];
		}

		// Format array with advanced options
		const formattedSlice = this.#formatArray(displaySlice, {
			...advancedOptions,
			arrayFormat,
			arraySeparator,
		});

		// Build inspection result
		const result: any = {
			type: "CircularBuffer",
			capacity: this.#capacity,
			size: this.#count,
			preview: formattedSlice,
		};

		// Add truncation info if needed
		if (this.#count > visibleItems) {
			result.truncated = `${this.#count - visibleItems} more items`;
			result._maxDisplayLength = maxArrayLength;
		}

		// Add file context if requested
		if (showFileContext) {
			result._createdAt = new Date(this.#createdAt).toISOString();
			result._createdIn = this.#createdIn;
			if (Bun.main && import.meta.path) {
				result._executionContext = {
					mainScript: Bun.main,
					currentPath: import.meta.path,
					isMainScript: import.meta.path === Bun.main,
				};
			}
		}

		// Add hidden details if requested
		if (showHidden) {
			result._head = this.#head;
			result._tail = this.#tail;
			result._bufferSize = this.#buffer.length;
			result._memoryLayout = "circular";
			result._utilization = `${((this.#count / this.#capacity) * 100).toFixed(1)}%`;
			result._environment = {
				nodeEnv: Bun.env.NODE_ENV || "development",
				debugLevel: Bun.env.DEBUG_LEVEL || "info",
				...envConfig,
			};
		}

		// Add status indicators
		if (this.isEmpty) {
			result.status = "empty";
		} else if (this.isFull) {
			result.status = "full";
		} else {
			result.status = "partial";
		}

		return result;
	}

	/**
	 * Iterator for for...of loops
	 *
	 * @example
	 * ```typescript
	 * for (const item of buffer) {
	 *   console.log(item);
	 * }
	 * ```
	 */
	*[Symbol.iterator](): Generator<T> {
		for (let i = 0; i < this.#count; i++) {
			const item = this.at(i);
			if (item !== undefined) {
				yield item;
			}
		}
	}

	/**
	 * Get string representation
	 */
	toString(): string {
		return `CircularBuffer(${this.#count}/${this.#capacity})`;
	}
}

/**
 * Create a circular buffer with initial values
 *
 * @param capacity - Maximum capacity
 * @param initialValues - Initial items to add
 * @param options - Optional configuration
 * @returns New CircularBuffer instance
 *
 * @example
 * ```typescript
 * const buffer = createCircularBuffer(10, [1, 2, 3]);
 * const secureBuffer = createCircularBuffer(10, data, {
 *   sensitivePatterns: [/password/gi, /token/gi]
 * });
 * ```
 */
export function createCircularBuffer<T>(
	capacity: number,
	initialValues?: T[],
	options?: {
		sensitivePatterns?: RegExp[];
	},
): CircularBuffer<T> {
	const buffer = new CircularBuffer<T>(capacity, options);
	if (initialValues && initialValues.length > 0) {
		buffer.push(...initialValues);
	}
	return buffer;
}
