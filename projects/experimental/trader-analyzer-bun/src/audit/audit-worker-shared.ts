/**
 * @fileoverview 9.1.5.16.0.0.0: Audit Worker Shared Utilities
 * @description Shared utilities preloaded into audit workers
 * @module audit/audit-worker-shared
 *
 * This module is preloaded into all audit workers to ensure consistent
 * behavior and reduce initialization time.
 */

/**
 * 9.1.5.16.0.0.0: Shared utilities for audit workers
 *
 * Preloaded modules ensure:
 * - Consistent error handling
 * - Shared configuration
 * - Reduced worker initialization time
 */

/**
 * Extract documentation number from text
 */
export function extractDocNumber(text: string): string | null {
	const match = text.match(/\d+\.\d+\.\d+\.\d+\.\d+(\.\d+)?(\.\d+)?/);
	return match ? match[0] : null;
}

/**
 * Check if documentation number format is valid
 */
export function isValidDocNumber(docNum: string): boolean {
	const parts = docNum.split(".").map(Number);
	return (
		(parts.length === 5 || parts.length === 6 || parts.length === 7) &&
		parts.every((part) => !isNaN(part))
	);
}

/**
 * Worker configuration (shared across all workers)
 */
export const WORKER_CONFIG = {
	maxPatternLength: 1000,
	maxDirectoryDepth: 10,
	timeout: 30000,
};
