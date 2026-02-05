/**
 * @dynamic-spy/kit v5.2 - URLPatternSpyFactory (Bun 1.1 Examples)
 * 
 * EXACT Bun 1.1 URLPattern examples → Production Spy Integration
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

export interface URLPatternComponentResults {
	value: string;
	regexp?: string;
	hasRegExpGroups?: boolean;
}

export interface URLPatternSpy<T = any> {
	// ✅ Bun 1.1 API (exact)
	test: (input: string | URL) => boolean;
	exec: (input: string | URL) => URLPatternResult | null;

	// ✅ Bun Pattern Properties
	protocol: URLPatternComponentResults;
	username: URLPatternComponentResults;
	password: URLPatternComponentResults;
	hostname: URLPatternComponentResults;
	port: URLPatternComponentResults;
	pathname: URLPatternComponentResults;
	search: URLPatternComponentResults;
	hash: URLPatternComponentResults;

	// ✅ Spy Integration
	spy: SpyInstance;
	verify: (input: string | URL) => URLPatternResult;
	calledTimes: () => number;
	reset: () => void;
	hasRegExpGroups: boolean;
}

export class URLPatternSpyFactory {
	/**
	 * Create a URLPattern spy with Bun 1.1 exact examples
	 * 
	 * @param target - Target object
	 * @param method - Method name to spy on
	 * @param pattern - URLPattern string or URLPatternInit object
	 */
	static create<T extends Record<string, any>>(
		target: T,
		method: keyof T,
		pattern: string | URLPatternInit
	): URLPatternSpy<T> {
		// ✅ BUN EXAMPLE 1: Constructor (string or URLPatternInit)
		const urlPattern = typeof pattern === 'string'
			? new URLPattern({ pathname: pattern })
			: new URLPattern(pattern);

		// ✅ SPY INTEGRATION
		const spy = spyOn(target, String(method) as any) as any;

		// Extract pattern string for RegExp detection
		const patternString = typeof pattern === 'string' ? pattern : pattern.pathname || '';
		const hasRegExpGroups = /\([^)]+\)/.test(patternString);

		// ✅ Create spy instance with Bun 1.1 exact API
		const spyInstance: URLPatternSpy<T> = {
			// ✅ BUN EXAMPLE 1: test() method
			test: urlPattern.test.bind(urlPattern),

			// ✅ BUN EXAMPLE 2: exec() → groups.id
			exec: urlPattern.exec.bind(urlPattern),

			// ✅ Bun Pattern Properties
			protocol: urlPattern.protocol as URLPatternComponentResults,
			username: urlPattern.username as URLPatternComponentResults,
			password: urlPattern.password as URLPatternComponentResults,
			hostname: urlPattern.hostname as URLPatternComponentResults,
			port: urlPattern.port as URLPatternComponentResults,
			pathname: urlPattern.pathname as URLPatternComponentResults,
			search: urlPattern.search as URLPatternComponentResults,
			hash: urlPattern.hash as URLPatternComponentResults,

			// ✅ SPY INTEGRATION
			spy,

			verify: (input: string | URL): URLPatternResult => {
				expect(spy).toHaveBeenCalled();
				const result = urlPattern.exec(input);
				if (!result) {
					throw new Error(`URL does not match pattern: ${patternString}`);
				}
				return result as URLPatternResult;
			},

			calledTimes: (): number => {
				return spy.mock.calls.length;
			},

			reset: (): void => {
				spy.mockReset();
			},

			hasRegExpGroups
		};

		// Add convenience methods for complete API access
		(spyInstance as any).groups = (input: string | URL) => {
			const result = spyInstance.exec(input);
			return result?.pathname.groups || {};
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

