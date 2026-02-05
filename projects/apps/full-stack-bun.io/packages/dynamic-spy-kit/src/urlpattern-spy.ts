/**
 * @dynamic-spy/kit v2.2 - COMPLETE URLPattern API
 * 
 * Full URLPattern integration with spy verification
 */

import { spyOn, expect } from "bun:test";

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

export interface URLPatternComponent {
	value: string;
	regexp?: string;
	hasRegExpGroups?: boolean;
}

export interface URLPatternResult {
	protocol: URLPatternComponent;
	username: URLPatternComponent;
	password: URLPatternComponent;
	hostname: URLPatternComponent;
	port: URLPatternComponent;
	pathname: URLPatternComponent;
	search: URLPatternComponent;
	hash: URLPatternComponent;
}

export type URLPatternInit = {
	protocol?: string;
	username?: string;
	password?: string;
	hostname?: string;
	port?: string;
	pathname?: string;
	search?: string;
	hash?: string;
	baseURL?: string;
};

export interface URLPatternSpy<T = any> {
	// Core URLPattern API
	test: (input: string | URL) => boolean;
	exec: (input: string | URL) => URLPatternResult | null;

	// Pattern properties
	protocol: URLPatternComponent;
	username: URLPatternComponent;
	password: URLPatternComponent;
	hostname: URLPatternComponent;
	port: URLPatternComponent;
	pathname: URLPatternComponent;
	search: URLPatternComponent;
	hash: URLPatternComponent;

	// Spy integration
	spy: SpyInstance;
	verify: (input: string | URL) => URLPatternResult;
	hasRegExpGroups: boolean;
}

export class URLPatternSpyFactory {
	/**
	 * Create a URLPattern spy with full API access
	 * 
	 * @param target - Target object
	 * @param method - Method name to spy on
	 * @param pattern - URLPattern string or URLPatternInit object
	 */
	static create(
		target: any,
		method: string,
		pattern: string | URLPatternInit
	): URLPatternSpy {
		// 1. Create URLPattern with FULL constructor support
		const urlPattern = typeof pattern === 'string'
			? new URLPattern({ pathname: pattern })
			: new URLPattern(pattern);

		// 2. Spy on target method
		const spy = spyOn(target, method as any) as any;

		// 3. Extract pattern string for RegExp detection
		const patternString = typeof pattern === 'string' ? pattern : pattern.pathname || '';

		// 4. Detect RegExp groups
		const hasRegExpGroups = /\([^)]+\)/.test(patternString);

		// 5. Create spy instance with ALL URLPattern properties
		const spyInstance: URLPatternSpy = {
			// === CORE API ===
			test: (input: string | URL): boolean => {
				try {
					return urlPattern.test(input);
				} catch {
					return false;
				}
			},

			exec: (input: string | URL): URLPatternResult | null => {
				try {
					return urlPattern.exec(input) as URLPatternResult | null;
				} catch {
					return null;
				}
			},

			// === ALL PATTERN PROPERTIES ===
			protocol: urlPattern.protocol as URLPatternComponent,
			username: urlPattern.username as URLPatternComponent,
			password: urlPattern.password as URLPatternComponent,
			hostname: urlPattern.hostname as URLPatternComponent,
			port: urlPattern.port as URLPatternComponent,
			pathname: urlPattern.pathname as URLPatternComponent,
			search: urlPattern.search as URLPatternComponent,
			hash: urlPattern.hash as URLPatternComponent,

			// === SPY INTEGRATION ===
			spy,

			verify: (input: string | URL): URLPatternResult => {
				// Verify spy was called
				expect(spy).toHaveBeenCalled();

				// Get pattern match
				const result = urlPattern.exec(input);
				if (!result) {
					throw new Error(`URL does not match pattern: ${patternString}`);
				}

				return result as URLPatternResult;
			},

			hasRegExpGroups
		};

		return spyInstance;
	}

	/**
	 * Factory for multiple patterns (router)
	 * 
	 * @param target - Target object
	 * @param method - Method name to spy on
	 * @param patterns - Array of URLPattern strings or URLPatternInit objects
	 */
	static createRouter(
		target: any,
		method: string,
		patterns: (string | URLPatternInit)[]
	): URLPatternSpy[] {
		return patterns.map(p => this.create(target, method, p));
	}
}



