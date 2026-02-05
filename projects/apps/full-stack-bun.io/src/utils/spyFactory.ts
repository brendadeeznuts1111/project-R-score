/**
 * Dynamic Spy Factory - Production-Ready Testing Utilities
 * 
 * Provides utilities for creating and managing dynamic spies
 * for testing systems with dynamic property keys (DB records, cache keys, etc.)
 * 
 * Compatible with @dynamic-spy/kit API for easy migration
 */

import { jest } from "bun:test";

/**
 * Spy Kit API (matching @dynamic-spy/kit interface)
 * 
 * Usage:
 * ```typescript
 * import spyKit from '@dynamic-spy/kit';
 * const spy = spyKit.create(server, 'updateOdds');
 * spy.spyOnKey('/route/path');
 * ```
 */
export const spyKit = {
	create: <T extends Record<string, any>>(target: T, method: keyof T) => {
		return createDynamicSpy(target, method);
	}
};

/**
 * Generic spy factory for dynamic property-based testing
 */
export const createDynamicSpy = <T extends Record<string, any>>(
	target: T,
	method: keyof T,
	keyPattern?: string
) => {
	const spyMap = new Map<string, jest.SpyInstance>();

	return {
		/**
		 * Create or retrieve a spy for a specific key
		 */
		spyOnKey: (key: string): jest.SpyInstance => {
			const spyKey = `${String(method)}:${key}`;
			if (!spyMap.has(spyKey)) {
				spyMap.set(spyKey, jest.spyOn(target, String(method) as any));
			}
			return spyMap.get(spyKey)!;
		},

		/**
		 * Get a spy for a specific key (for manual verification)
		 */
		getSpy: (key: string): jest.SpyInstance | undefined => {
			return spyMap.get(`${String(method)}:${key}`);
		},

		/**
		 * Get all spies created by this factory
		 */
		getAllSpies: (): jest.SpyInstance[] => {
			return Array.from(spyMap.values());
		},

		/**
		 * Clear all spies
		 */
		clear: () => {
			spyMap.forEach(spy => spy.mockRestore());
			spyMap.clear();
		}
	};
};

/**
 * Create a spy manager for cache operations
 */
export const createCacheSpyManager = <T extends { set: (key: string, value: any) => any }>(
	cache: T
) => {
	return createDynamicSpy(cache, 'set');
};

/**
 * Create a spy manager for database operations
 */
export const createDatabaseSpyManager = <T extends { 
	setUser?: (id: string, data: any) => any;
	update?: (id: string, data: any) => any;
}>(db: T) => {
	const method = db.setUser ? 'setUser' : 'update';
	return createDynamicSpy(db, method as keyof T);
};

/**
 * Create a spy manager for arbitrage opportunity tracking
 */
export const createArbSpyManager = <T extends { updateArb: (key: string, data: any) => any }>(
	manager: T
) => {
	return createDynamicSpy(manager, 'updateArb');
};

