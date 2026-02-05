/**
 * @dynamic-spy/kit v5.2 - Production Arbitrage Router
 * 
 * 75 bookies from Bun patterns → Production ready
 */

import { URLPatternSpyFactory } from "../core/urlpattern-spy";
import { SPORTSBOOK_PATTERNS, SPORTSBOOK_BENCHMARK } from "../sportsbook-patterns";

export type SportsbookName = keyof typeof SPORTSBOOK_PATTERNS;

export interface BookieTestResult {
	matches: boolean;
	groups: Record<string, string>;
	verified: boolean;
	vig: string;
	latency: string;
	calledTimes: number;
}

export class ArbRouter {
	private spies = new Map<SportsbookName, ReturnType<typeof URLPatternSpyFactory.create>>();

	constructor(api: any) {
		// Initialize ALL 75 bookies with Bun patterns
		Object.entries(SPORTSBOOK_PATTERNS).forEach(([bookie, pattern]) => {
			this.spies.set(
				bookie as SportsbookName,
				URLPatternSpyFactory.create(api, 'fetchOdds', pattern)
			);
		});
	}

	/**
	 * Test bookie URL pattern
	 * 
	 * @param bookie - Sportsbook name
	 * @param url - URL to test
	 * @returns Test result with Bun.exec() groups
	 */
	testBookie(bookie: SportsbookName, url: string): BookieTestResult {
		const spy = this.spies.get(bookie);
		if (!spy) {
			throw new Error(`Unknown bookie: ${bookie}`);
		}

		// ✅ Bun.test()
		const matches = spy.test(url);

		// ✅ Bun.exec() → groups
		const execResult = spy.exec(url);
		const groups = execResult?.pathname.groups || {};

		// ✅ Spy verification
		let verified = false;
		try {
			if (spy.calledTimes() > 0) {
				spy.verify(url);
				verified = true;
			}
		} catch {
			verified = false;
		}

		// Production metrics
		const benchmark = SPORTSBOOK_BENCHMARK[bookie];
		const vig = benchmark?.vig || 'N/A';
		const latency = benchmark?.latency || '<45ms';

		return {
			matches,
			groups,
			verified,
			vig,
			latency,
			calledTimes: spy.calledTimes()
		};
	}

	/**
	 * Get all bookie spies
	 */
	getSpies(): Map<SportsbookName, ReturnType<typeof URLPatternSpyFactory.create>> {
		return this.spies;
	}

	/**
	 * Get spy for specific bookie
	 */
	getSpy(bookie: SportsbookName): ReturnType<typeof URLPatternSpyFactory.create> | undefined {
		return this.spies.get(bookie);
	}
}



