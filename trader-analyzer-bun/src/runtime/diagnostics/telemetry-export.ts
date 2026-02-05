/**
 * @fileoverview 9.1.5.1.5.1.0: Telemetry Event Export Utilities
 * @description Telemetry event ID generation and export for distributed tracing
 * @module runtime/diagnostics/telemetry-export
 *
 * Cross-Reference Hub:
 * - @see 7.2.1.0.0.0.0 → Bun.randomUUIDv7() for UUID generation
 * - @see 9.1.1.4.1.0 → Telegram message correlation
 * - @see 9.1.1.9.2.0.0 → Steam alert tracking
 */

/**
 * 9.1.5.1.5.1.0: Telemetry event ID generation using Bun.randomUUIDv7()
 *
 * Generates time-ordered UUIDs for telemetry event sequencing and correlation.
 * Uses Bun.randomUUIDv7() (7.2.1.0.0.0.0) for deterministic time-ordering.
 *
 * @returns UUIDv7 string suitable for telemetry event tracking
 *
 * @example
 * ```typescript
 * const eventId = generateEventId();
 * await exportTelemetryEvent({
 *   id: eventId,
 *   timestamp: Date.now(),
 *   type: 'market_movement',
 * });
 * ```
 *
 * @see 7.2.1.0.0.0.0 - Bun.randomUUIDv7() documentation
 */
export const generateEventId = (): string => {
	// 7.2.1.0.0.0.0 - Time-ordered UUID for event sequencing
	return Bun.randomUUIDv7(); // Time-ordered UUID for event sequencing
};

/**
 * Export telemetry event with generated ID
 *
 * @param event - Telemetry event data
 * @returns Event with generated ID
 */
export function exportTelemetryEvent<T extends Record<string, unknown>>(
	event: T,
): T & { id: string; timestamp: number } {
	return {
		...event,
		id: generateEventId(),
		timestamp: Date.now(),
	};
}
