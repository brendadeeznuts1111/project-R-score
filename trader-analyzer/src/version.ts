/**
 * @fileoverview Hyper-Bun Version Information
 * @description Version info embedding in standalone executable
 * @module version
 * 
 * Auto-generated at build time with git commit hash and build metadata.
 * Embedded in standalone executable for version consistency.
 */

/**
 * Hyper-Bun version information
 * Auto-generated at build time
 */
export const HYPER_BUN_VERSION = {
	gitCommit: process.env.GIT_COMMIT || process.env.GITHUB_SHA || 'dev',
	buildDate: new Date().toISOString(),
	bunVersion: typeof Bun !== 'undefined' ? Bun.version : 'unknown',
	features: ['fhspread', 'mcp-errors', 'circuit-breaker', 'urlpattern-regex', 'fake-timers', 'proxy-headers', 'http-agent-pool', 'console-json']
};

/**
 * Get version string for display
 */
export function getVersionString(): string {
	return `Hyper-Bun v${HYPER_BUN_VERSION.gitCommit} (Bun ${HYPER_BUN_VERSION.bunVersion})`;
}

/**
 * Get features list as string
 */
export function getFeaturesString(): string {
	return HYPER_BUN_VERSION.features.join(', ');
}
