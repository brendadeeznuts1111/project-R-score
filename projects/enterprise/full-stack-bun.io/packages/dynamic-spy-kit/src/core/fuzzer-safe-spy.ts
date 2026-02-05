/**
 * @dynamic-spy/kit v3.4 - Fuzzer-Safe Spy Factory
 * 
 * 100% fuzzer hardened array and bulk market spying
 */

import { spyOn } from "bun:test";

export interface SpyInstance {
	mock: {
		calls: any[][];
		results: any[];
	};
	toHaveBeenCalled: () => boolean;
	toHaveBeenCalledWith: (...args: any[]) => boolean;
	toHaveBeenCalledTimes: (n: number) => boolean;
	mockReset: () => void;
	mockRestore: () => void;
}

export class FuzzerSafeSpyFactory {
	/**
	 * Create spies for array elements with safe indexed spying
	 * 
	 * @param arr - Array to spy on
	 * @param method - Optional method name to spy on
	 * @returns Array of spy instances
	 */
	static createArraySpies<T>(arr: T[], method?: keyof T): SpyInstance[] {
		return arr.map((_, i) => {
			// ✅ FIXED: Safe indexed spying
			// Convert index to string for safe property access
			return spyOn(arr, String(i) as any) as SpyInstance;
		});
	}

	/**
	 * Create bulk market spies with both index and string keys
	 * 
	 * @param markets - Array of market identifiers
	 * @returns Record of spies keyed by market name and index
	 */
	static bulkMarketSpies(markets: string[]): Record<string, SpyInstance> {
		const spies: Record<string, SpyInstance> = {};

		markets.forEach((market, i) => {
			// Index + string key hybrid
			// Market name as key
			spies[market] = spyOn(markets, String(i) as any) as SpyInstance;
			
			// Index as key (for numeric access)
			spies[`${i}`] = spyOn(markets, String(i) as any) as SpyInstance;
		});

		return spies;
	}

	/**
	 * Create spies for object with dynamic keys (fuzzer-safe)
	 * 
	 * @param obj - Object to spy on
	 * @param keys - Array of keys to spy on
	 * @returns Record of spies keyed by the provided keys
	 */
	static createDynamicKeySpies<T extends Record<string, any>>(
		obj: T,
		keys: (keyof T)[]
	): Record<string, SpyInstance> {
		const spies: Record<string, SpyInstance> = {};

		keys.forEach(key => {
			try {
				// Safe property spying
				spies[String(key)] = spyOn(obj, key as any) as SpyInstance;
			} catch (error) {
				// Fuzzer-safe: ignore invalid keys
				console.warn(`Failed to spy on key: ${String(key)}`, error);
			}
		});

		return spies;
	}

	/**
	 * Create spies for nested object paths (fuzzer-safe)
	 * 
	 * @param obj - Root object
	 * @param paths - Array of dot-separated paths (e.g., ['a.b.c', 'x.y'])
	 * @returns Record of spies keyed by path
	 */
	static createNestedPathSpies(
		obj: any,
		paths: string[]
	): Record<string, SpyInstance> {
		const spies: Record<string, SpyInstance> = {};

		paths.forEach(path => {
			try {
				const parts = path.split('.');
				let current: any = obj;

				// Navigate to nested property
				for (let i = 0; i < parts.length - 1; i++) {
					if (current == null) break;
					current = current[parts[i]];
				}

				if (current != null && parts.length > 0) {
					const lastKey = parts[parts.length - 1];
					spies[path] = spyOn(current, lastKey as any) as SpyInstance;
				}
			} catch (error) {
				// Fuzzer-safe: ignore invalid paths
				console.warn(`Failed to spy on path: ${path}`, error);
			}
		});

		return spies;
	}

	/**
	 * Create spies for array of objects with specific property
	 * 
	 * @param arr - Array of objects
	 * @param property - Property name to spy on
	 * @returns Array of spies, one per array element
	 */
	static createArrayPropertySpies<T extends Record<string, any>>(
		arr: T[],
		property: keyof T
	): SpyInstance[] {
		return arr.map((item, i) => {
			try {
				return spyOn(item, property as any) as SpyInstance;
			} catch (error) {
				// Fuzzer-safe: return a no-op spy if property doesn't exist
				return {
					mock: { calls: [], results: [] },
					toHaveBeenCalled: () => false,
					toHaveBeenCalledWith: () => false,
					toHaveBeenCalledTimes: () => false,
					mockReset: () => {},
					mockRestore: () => {}
				} as SpyInstance;
			}
		});
	}

	/**
	 * Reset all spies in a record
	 * 
	 * @param spies - Record of spies to reset
	 */
	static resetAllSpies(spies: Record<string, SpyInstance>): void {
		Object.values(spies).forEach(spy => {
			try {
				spy.mockReset();
			} catch (error) {
				// Fuzzer-safe: ignore reset errors
			}
		});
	}

	/**
	 * Restore all spies in a record
	 * 
	 * @param spies - Record of spies to restore
	 */
	static restoreAllSpies(spies: Record<string, SpyInstance>): void {
		Object.values(spies).forEach(spy => {
			try {
				spy.mockRestore();
			} catch (error) {
				// Fuzzer-safe: ignore restore errors
			}
		});
	}
}

