/**
 * @fileoverview JSON Utilities
 * @description Safe JSON parsing and stringification utilities
 * @module utils/json
 */

/**
 * Safely parse JSON with fallback value
 *
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed value or fallback
 */
export function safeParseJSON<T>(
	json: string | null | undefined,
	fallback: T,
): T {
	if (!json || json.trim() === "") {
		return fallback;
	}

	try {
		return JSON.parse(json) as T;
	} catch (error) {
		console.warn(
			`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
		return fallback;
	}
}

/**
 * Safely stringify JSON with fallback
 *
 * @param value - Value to stringify
 * @param fallback - Fallback string if stringification fails
 * @returns JSON string or fallback
 */
export function safeStringifyJSON(value: unknown, fallback = "{}"): string {
	try {
		return JSON.stringify(value);
	} catch (error) {
		console.warn(
			`Failed to stringify JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
		return fallback;
	}
}
