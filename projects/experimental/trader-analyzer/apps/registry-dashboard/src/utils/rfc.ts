/**
 * @fileoverview RFC Utility Functions
 * @description Shared utilities for RFC creation and management
 * @module apps/registry-dashboard/src/utils/rfc
 */

/**
 * Get RFC creation URL for a package
 */
export function getRFCCreationURL(packageName: string, baseUrl?: string): string {
	const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
	return `${base}/rfcs/new?package=${encodeURIComponent(packageName)}`;
}

/**
 * Get RFC detail URL
 */
export function getRFCDetailURL(rfcId: number, baseUrl?: string): string {
	const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
	return `${base}/rfcs/${rfcId}`;
}

/**
 * Create RFC for package (opens in new tab)
 */
export function createRFC(packageName: string): void {
	if (typeof window === 'undefined') {
		console.warn('createRFC called outside browser context');
		return;
	}
	
	const url = getRFCCreationURL(packageName);
	window.open(url, '_blank');
}

// Make available globally for onclick handlers
if (typeof window !== 'undefined') {
	(window as any).createRFC = createRFC;
}
