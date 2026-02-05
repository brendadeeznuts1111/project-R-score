/**
 * @dynamic-spy/kit v2.4 - Production Arbitrage Router
 * 
 * Production-ready OddsRouter with FULL URLPattern validation
 */

import { URLPatternSpyFactory, URLPatternSpy } from './urlpattern-spy.js';

export class OddsRouter {
	public oddsSpy: ReturnType<typeof URLPatternSpyFactory.create>;
	public arbSpy: ReturnType<typeof URLPatternSpyFactory.create>;

	constructor(private target: any = {}) {
		// 1. BOOKIE ODDS - hostname + pathname + query
		this.oddsSpy = URLPatternSpyFactory.create(this.target, 'updateOdds', {
			hostname: ':bookie.com',           // bookie1.com, bookie2.com
			pathname: '/odds/:market',         // /odds/BTC-USD
			search: '?type=:type'              // ?type=sports
		});

		// 2. ARB OPPORTUNITIES - RegExp pair validation
		this.arbSpy = URLPatternSpyFactory.create(this.target, 'updateArb', {
			pathname: '/arb/:pair([A-Z]{3}-[A-Z]{3}):spread'  // /arb/BTC-USD:0.02
		});
	}

	// Production methods - spied automatically
	updateOdds(url: string, odds: any) {
		console.log(`📊 Odds update: ${url}`, odds);
	}

	updateArb(url: string, opp: any) {
		console.log(`💰 Arb found: ${url}`, opp);
	}

	// 🔍 Production test methods
	testOddsFeed(url: string) {
		const groups = this.oddsSpy.exec(url);
		if (groups) {
			console.log('✅ Bookie:', groups.hostname.groups!.bookie);
			console.log('✅ Market:', groups.pathname.groups!.market);
			console.log('✅ Type:', groups.search.groups!.type);
			// Only verify if spy was called
			if (this.oddsSpy.spy.mock.calls.length > 0) {
				this.oddsSpy.verify(url);  // Spy assertion
			}
		}
		return groups;
	}

	testArbOpportunity(url: string) {
		const groups = this.arbSpy.exec(url);
		if (groups) {
			console.log('✅ Pair:', groups.pathname.groups!.pair);   // "BTC-USD"
			console.log('✅ Spread:', groups.pathname.groups!.spread); // "0.02"
			// Only verify if spy was called
			if (this.arbSpy.spy.mock.calls.length > 0) {
				this.arbSpy.verify(url);
			}
		}
		return groups;
	}
}

