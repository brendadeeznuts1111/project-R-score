/**
 * @fileoverview Time Formatting Utilities
 * @description Consistent time formatting across CLI, dashboard, and tests
 * @module utils/time-format
 *
 * Provides consistent time formatting that matches Bun test runner output
 * and CLI dashboard display format.
 *
 * Works correctly with Bun's setSystemTime() from bun:test:
 * - setSystemTime(date) - Sets mocked time
 * - setSystemTime() - Resets to actual time (no arguments)
 *
 * Timezone Handling:
 * - By default, `bun test` runs in UTC (Etc/UTC)
 * - Override with: `TZ=America/Los_Angeles bun test`
 * - Or set `process.env.TZ` at runtime (unlike Jest, can be set multiple times)
 * - All formatting functions respect the current timezone setting
 *
 * @see {@link https://bun.com/docs/test/time|Bun Test Time Documentation}
 */

import {
	getCurrentTimezone,
	getTimezoneConfig,
	DEFAULT_TIMEZONE,
	TZ_ENV_VAR,
} from "./time-constants";

/**
 * Format time for display (matches CLI dashboard format)
 * Uses toLocaleTimeString() to match Bun CLI output
 *
 * @param date - Date object or ISO string
 * @returns Formatted time string (e.g., "10:49:18 AM")
 *
 * @example
 * ```typescript
 * formatSystemTime(new Date()); // "10:49:18 AM"
 * formatSystemTime("2024-01-15T10:49:18.000Z"); // "10:49:18 AM"
 * ```
 */
export function formatSystemTime(date?: Date | string): string {
	if (!date) {
		return new Date().toLocaleTimeString();
	}

	const dateObj = typeof date === "string" ? new Date(date) : date;
	return dateObj.toLocaleTimeString();
}

/**
 * Format timestamp for display (matches CLI dashboard format)
 * Uses toLocaleTimeString() for consistency with CLI output
 *
 * @param iso - ISO 8601 timestamp string
 * @returns Formatted time string or "--" if invalid
 *
 * @example
 * ```typescript
 * formatTimestamp("2024-01-15T10:49:18.000Z"); // "10:49:18 AM"
 * formatTimestamp(); // "--"
 * ```
 */
export function formatTimestamp(iso?: string): string {
	if (!iso) return "--";
	try {
		const date = new Date(iso);
		return date.toLocaleTimeString();
	} catch {
		return "--";
	}
}

/**
 * Format date and time for display
 * Uses toLocaleString() for full date/time display
 *
 * @param date - Date object or ISO string
 * @returns Formatted date/time string (e.g., "1/15/2024, 10:49:18 AM")
 *
 * @example
 * ```typescript
 * formatDateTime(new Date()); // "1/15/2024, 10:49:18 AM"
 * ```
 */
export function formatDateTime(date?: Date | string): string {
	if (!date) {
		return new Date().toLocaleString();
	}

	const dateObj = typeof date === "string" ? new Date(date) : date;
	return dateObj.toLocaleString();
}

/**
 * Get current system time formatted
 * Matches format used in Bun CLI dashboard
 *
 * @returns Current time as formatted string
 */
export function getSystemTime(): string {
	return new Date().toLocaleTimeString();
}

/**
 * Get current system date/time formatted
 *
 * @returns Current date/time as formatted string
 */
export function getSystemDateTime(): string {
	return new Date().toLocaleString();
}

/**
 * Get current timezone information
 *
 * @returns Object with timezone name and UTC offset
 *
 * @example
 * ```typescript
 * const tz = getTimezoneInfo();
 * // { name: "America/Los_Angeles", offset: -480, offsetString: "UTC-08:00" }
 * ```
 */
export function getTimezoneInfo(): {
	name: string;
	offset: number; // minutes from UTC
	offsetString: string; // e.g., "UTC-08:00"
	defaultTimezone: string;
	envVar: string;
} {
	const timeZone = getCurrentTimezone();
	const offset = new Date().getTimezoneOffset();
	const offsetHours = Math.abs(Math.floor(offset / 60));
	const offsetMinutes = Math.abs(offset % 60);
	const offsetSign = offset <= 0 ? "+" : "-";
	const offsetString = `UTC${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;

	return {
		name: timeZone,
		offset: -offset, // Negate because getTimezoneOffset returns opposite
		offsetString,
		defaultTimezone: DEFAULT_TIMEZONE,
		envVar: TZ_ENV_VAR,
	};
}

/**
 * Get timezone configuration for headers/footers
 *
 * @returns Object with timezone constants and current timezone info
 */
export function getTimezoneConfigForHeaders(): {
	timezone: string;
	defaultTimezone: string;
	envVar: string;
	offsetString: string;
	setSystemTimeAvailable: boolean;
} {
	const tzInfo = getTimezoneInfo();
	const config = getTimezoneConfig();

	return {
		timezone: tzInfo.name,
		defaultTimezone: tzInfo.defaultTimezone,
		envVar: tzInfo.envVar,
		offsetString: tzInfo.offsetString,
		setSystemTimeAvailable: config.setSystemTimeAvailable,
	};
}
