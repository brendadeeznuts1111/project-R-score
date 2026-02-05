/**
 * @fileoverview Time and Timezone Constants
 * @description Centralized constants for timezone handling across the application
 * @module utils/time-constants
 *
 * Defines constants for:
 * - Timezone environment variable ($TZ)
 * - Default timezone (Etc/UTC for bun test)
 * - setSystemTime function reference
 *
 * These constants are used to dynamically control headers and footers
 * across server, dashboards, docs, and registry pages.
 *
 * @see {@link https://bun.com/docs/test/time|Bun Test Time Documentation}
 */

/**
 * Timezone environment variable name
 * Used to override default timezone: `TZ=America/Los_Angeles bun test`
 */
export const TZ_ENV_VAR = "TZ";

/**
 * Default timezone for bun test runs
 * By default, bun test runs in UTC (Etc/UTC)
 */
export const DEFAULT_TIMEZONE = "Etc/UTC";

/**
 * Get current timezone from environment or system
 *
 * @returns Current timezone string (e.g., "Etc/UTC", "America/Los_Angeles")
 */
export function getCurrentTimezone(): string {
	// Check process.env.TZ first (runtime override)
	if (process.env.TZ) {
		return process.env.TZ;
	}

	// Fall back to Intl API
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone;
	} catch {
		return DEFAULT_TIMEZONE;
	}
}

/**
 * Get timezone configuration object
 *
 * @returns Object with timezone info and setSystemTime reference
 */
export function getTimezoneConfig(): {
	timezone: string;
	defaultTimezone: string;
	envVar: string;
	setSystemTimeAvailable: boolean;
} {
	return {
		timezone: getCurrentTimezone(),
		defaultTimezone: DEFAULT_TIMEZONE,
		envVar: TZ_ENV_VAR,
		setSystemTimeAvailable: typeof setSystemTime !== "undefined",
	};
}

/**
 * Check if setSystemTime is available (in test context)
 *
 * @returns true if setSystemTime is available
 */
export function isSetSystemTimeAvailable(): boolean {
	try {
		// Try to import setSystemTime from bun:test
		// This will only work in test context
		return typeof setSystemTime !== "undefined";
	} catch {
		return false;
	}
}

/**
 * Timezone constants for use in headers/footers
 */
export const TIMEZONE_CONSTANTS = {
	/** Environment variable name for timezone override */
	TZ_ENV_VAR,
	/** Default timezone (UTC) */
	DEFAULT_TIMEZONE,
	/** Current timezone */
	getCurrentTimezone,
	/** Get full timezone configuration */
	getTimezoneConfig,
	/** Check if setSystemTime is available */
	isSetSystemTimeAvailable,
} as const;
