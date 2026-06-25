// utils/common.ts
// Consolidated common utility functions to reduce code duplication

/**
 * Deep clone an object using JSON parse/stringify
 * More reliable than structuredClone for plain objects
 */
export function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Sort object keys deterministically for consistent output
 * Handles nested objects and arrays
 */
export function sortObjectKeys(obj: any): any {
	if (typeof obj !== "object" || obj === null) return obj;

	if (Array.isArray(obj)) {
		return obj.map(sortObjectKeys);
	}

	const sorted: any = {};
	const keys = Object.keys(obj).sort();

	for (const key of keys) {
		sorted[key] = sortObjectKeys(obj[key]);
	}

	return sorted;
}

/**
 * Sort object keys and return as new object (shallow)
 * For performance-critical scenarios where deep sorting isn't needed
 */
export function sortObjectKeysShallow<T extends Record<string, any>>(
	obj: T,
): T {
	const sorted = {} as T;
	const keys = Object.keys(obj).sort();

	for (const key of keys) {
		(sorted as any)[key] = obj[key];
	}

	return sorted;
}

/**
 * Check if a value is effectively empty
 */
export function isEmpty(value: any): boolean {
	if (value === undefined || value === null) return true;
	if (typeof value === "string") return value.trim() === "";
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === "object") return Object.keys(value).length === 0;
	return false;
}

/**
 * Generate a fast hash using Bun's built-in CRC32
 */
export function fastHash(str: string): number {
	return Bun.hash.crc32(str);
}

/**
 * Set nested value using dot notation path
 */
export function setNestedValue(obj: any, path: string, value: any): void {
	const keys = path.split(".");
	let current = obj;

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (
			!(key in current) ||
			typeof current[key] !== "object" ||
			current[key] === null
		) {
			current[key] = {};
		}
		current = current[key];
	}

	current[keys[keys.length - 1]] = value;
}

/**
 * Get nested value using dot notation path
 */
export function getNestedValue(
	obj: any,
	path: string,
	defaultValue?: any,
): any {
	const keys = path.split(".");
	let current = obj;

	for (const key of keys) {
		if (current === null || current === undefined || !(key in current)) {
			return defaultValue;
		}
		current = current[key];
	}

	return current;
}

/**
 * Check if object has nested property using dot notation
 */
export function hasNestedProperty(obj: any, path: string): boolean {
	const keys = path.split(".");
	let current = obj;

	for (const key of keys) {
		if (current === null || current === undefined || !(key in current)) {
			return false;
		}
		current = current[key];
	}

	return true;
}

/**
 * Remove undefined values from object (recursive)
 */
export function removeUndefined(obj: any): any {
	if (obj === null || obj === undefined) return obj;
	if (typeof obj !== "object") return obj;

	if (Array.isArray(obj)) {
		return obj.map(removeUndefined).filter((val) => val !== undefined);
	}

	const result: any = {};
	for (const [key, value] of Object.entries(obj)) {
		const cleaned = removeUndefined(value);
		if (cleaned !== undefined) {
			result[key] = cleaned;
		}
	}

	return result;
}

/**
 * Merge objects deeply, with later objects taking precedence
 */
export function deepMerge<T extends Record<string, any>>(
	...objects: Partial<T>[]
): T {
	const result = {} as T;

	for (const obj of objects) {
		for (const [key, value] of Object.entries(obj)) {
			if (value === undefined || value === null) {
				continue;
			}

			if (
				typeof value === "object" &&
				!Array.isArray(value) &&
				result[key] !== undefined &&
				typeof result[key] === "object" &&
				!Array.isArray(result[key])
			) {
				(result as any)[key] = deepMerge(
					(result as any)[key] as any,
					value as any,
				);
			} else {
				(result as any)[key] = value as any;
			}
		}
	}

	return result;
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null;

	return (...args: Parameters<T>) => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

/**
 * Create a throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number,
): (...args: Parameters<T>) => void {
	let inThrottle = false;

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxAttempts: number = 3,
	baseDelay: number = 1000,
): Promise<T> {
	let lastError: Error;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;

			if (attempt === maxAttempts) {
				throw lastError;
			}

			const delay = baseDelay * 2 ** (attempt - 1);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError!;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = ""): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2);
	return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
	try {
		return JSON.parse(str);
	} catch {
		return fallback;
	}
}

/**
 * Safe JSON stringify with fallback
 */
export function safeJsonStringify(obj: any, fallback: string = "{}"): string {
	try {
		return JSON.stringify(obj);
	} catch {
		return fallback;
	}
}
