/**
 * @dynamic-spy/kit v3.4 - Secrets Manager
 * 
 * AsyncLocalStorage-safe secrets management with Bun.secrets integration
 * Production-ready for 75+ sportsbooks
 */

import { AsyncLocalStorage } from "async_hooks";

interface SecretsStore {
	apiKeys: Record<string, string>;
}

const asyncLocalStorage = new AsyncLocalStorage<SecretsStore>();

export class SecretsManager {
	/**
	 * Run a function with bookie API keys in async context
	 * 
	 * ✅ FIXED: Nested contexts merge keys (inner inherits outer)
	 * 
	 * @param bookieKeys - Record of bookie names to API keys
	 * @param fn - Async function to execute with secrets
	 * @returns Result of the function
	 */
	static async withSecrets<T>(
		bookieKeys: Record<string, string>,
		fn: () => Promise<T>
	): Promise<T> {
		// Get parent context keys (for nested contexts)
		const parentStore = asyncLocalStorage.getStore();
		const mergedKeys = {
			...(parentStore?.apiKeys || {}),
			...bookieKeys
		};

		return asyncLocalStorage.run({ apiKeys: mergedKeys }, fn);
	}

	/**
	 * Get API key for a bookie (Bun.secrets + AsyncLocalStorage)
	 * 
	 * ✅ FIXED: Safe access - no crash if store is undefined
	 * 
	 * @param bookie - Bookie name (e.g., 'pinnacle', 'fonbet')
	 * @returns API key or undefined if not found
	 */
	static getBookieKey(bookie: string): string | undefined {
		// 1. Try Bun.secrets first (production secrets)
		try {
			if (Bun.secrets && typeof Bun.secrets === 'object' && bookie in Bun.secrets) {
				return Bun.secrets[bookie as keyof typeof Bun.secrets] as string;
			}
		} catch (error) {
			// Bun.secrets might not be available in all environments
		}

		// 2. Try AsyncLocalStorage context
		const store = asyncLocalStorage.getStore();
		if (store?.apiKeys?.[bookie]) {
			return store.apiKeys[bookie];
		}

		// 3. Not found
		return undefined;
	}

	/**
	 * Get all bookie keys from current context
	 * 
	 * ✅ FIXED: Includes parent context keys (nested contexts)
	 * 
	 * @returns Record of all available bookie keys
	 */
	static getAllBookieKeys(): Record<string, string> {
		const store = asyncLocalStorage.getStore();
		const bunSecrets: Record<string, string> = {};

		// Collect from Bun.secrets
		try {
			if (Bun.secrets && typeof Bun.secrets === 'object') {
				Object.keys(Bun.secrets).forEach(key => {
					bunSecrets[key] = Bun.secrets[key as keyof typeof Bun.secrets] as string;
				});
			}
		} catch (error) {
			// Bun.secrets might not be available
		}

		// Merge with AsyncLocalStorage context (already includes parent keys via withSecrets merge)
		const contextKeys = store?.apiKeys || {};

		return {
			...bunSecrets,
			...contextKeys
		};
	}

	/**
	 * Check if a bookie key exists
	 * 
	 * @param bookie - Bookie name
	 * @returns True if key exists
	 */
	static hasBookieKey(bookie: string): boolean {
		return this.getBookieKey(bookie) !== undefined;
	}

	/**
	 * Set a bookie key in the current context (non-persistent)
	 * 
	 * @param bookie - Bookie name
	 * @param key - API key
	 */
	static setBookieKey(bookie: string, key: string): void {
		const store = asyncLocalStorage.getStore();
		if (store) {
			store.apiKeys[bookie] = key;
		}
	}

	/**
	 * Clear all keys from current context
	 */
	static clearContextKeys(): void {
		const store = asyncLocalStorage.getStore();
		if (store) {
			store.apiKeys = {};
		}
	}

	/**
	 * Get keys count (Bun.secrets + context)
	 * 
	 * @returns Number of available keys
	 */
	static getKeysCount(): number {
		return Object.keys(this.getAllBookieKeys()).length;
	}
}

