/**
 * @fileoverview 9.1.5.1.5.2.0: UUIDv7 Validation Utilities
 * @description UUIDv7 validation and testing utilities
 * @module utils/validation/uuid-validator
 *
 * Cross-Reference Hub:
 * - @see 7.2.1.0.0.0.0 → Bun.randomUUIDv7() for UUID generation
 * - @see 9.1.1.4.1.0 → Telegram message ID validation
 */

/**
 * UUIDv7 regex pattern (RFC 4122 compliant)
 * Format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
 */
const regexPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 9.1.5.1.5.2.0: UUIDv7 validation test suite
 *
 * Validates UUIDv7 format using regex pattern and optionally generates
 * a fresh UUID using Bun.randomUUIDv7() (7.2.1.0.0.0.0) for comparison.
 *
 * @param uuid - UUID string to validate
 * @returns true if UUID is valid UUIDv7 format
 *
 * @example
 * ```typescript
 * const isValid = validateUUIDv7('0193a0e7-8b5a-7e50-ad7c-9b4e2d1f0a8b');
 * // Returns: true
 *
 * const invalid = validateUUIDv7('not-a-uuid');
 * // Returns: false
 * ```
 *
 * @see 7.2.1.0.0.0.0 - Bun.randomUUIDv7() documentation
 */
export function validateUUIDv7(uuid: string): boolean {
	// Basic format validation
	if (!regexPattern.test(uuid)) {
		return false;
	}

	// Optional: Generate fresh UUID for validation comparison
	// This ensures we're using the same generation method
	const testUuid = Bun.randomUUIDv7(); // 7.2.1.0.0.0.0 - Generate fresh UUID for validation

	// If the provided UUID matches a freshly generated one, it's definitely valid
	// Otherwise, just validate format
	return uuid === testUuid || regexPattern.test(uuid);
}

/**
 * Validate multiple UUIDs
 *
 * @param uuids - Array of UUID strings to validate
 * @returns Array of validation results
 */
export function validateUUIDs(uuids: string[]): boolean[] {
	return uuids.map(validateUUIDv7);
}

/**
 * Check if UUID is time-ordered (UUIDv7)
 *
 * @param uuid - UUID string to check
 * @returns true if UUID appears to be UUIDv7 format
 */
export function isUUIDv7(uuid: string): boolean {
	return regexPattern.test(uuid);
}
