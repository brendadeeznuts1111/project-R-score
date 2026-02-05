/**
 * @dynamic-spy/kit v5.4 - Production Examples
 * 
 * Real bookie patterns with complete API access
 */

import { URLPatternSpyFactory } from "./core/urlpattern-spy";
import type { URLPatternInit } from "./core/urlpattern-spy";

// Real bookie patterns from production
export const PRODUCTION_PATTERNS: Record<string, URLPatternInit> = {
	// ✅ Pinnacle - Complete API coverage
	pinnacleOdds: {
		protocol: 'https:',
		hostname: 'pinnacle.com',
		pathname: '/vds/sports/:sportId/odds/:marketId',
		search: '?lang=:lang&currency=:currency'
	},

	// ✅ Bet365 - Hash + SPA routing
	bet365SPA: {
		pathname: '/#/SB/:sport/*/:marketId',
		hostname: 'bet365.com',
		hash: '#live?'
	},

	// ✅ Fonbet - Cyrillic + regex
	fonbetLive: {
		pathname: '/live/:sport([\\u0400-\\u04FF]{3,}):eventId',
		hostname: 'fonbet.ru'
	},

	// ✅ DraftKings - Mobile + Desktop
	draftkingsMobile: {
		pathname: '/sports/:sport/:league/:eventId',
		hostname: 'sportsbook.draftkings.com'
	},

	// ✅ FanDuel - Event routing
	fanduelEvent: {
		pathname: '/sportsbook/:sport/:eventId',
		hostname: 'sportsbook.fanduel.com',
		search: '?tab=:tab'
	},

	// ✅ BetMGM - Market-specific
	betmgmMarket: {
		pathname: '/sports/:sport/:league/:eventId/:market',
		hostname: 'sports.betmgm.com'
	}
};

/**
 * Production usage examples
 */
export function demonstrateProductionUsage() {
	const api = {
		fetchOdds: (url: string, groups?: Record<string, string>) => {
			console.log(`Fetching odds for ${url}`, groups);
		}
	};

	// ✅ Pinnacle - Full API access
	const pinnacleSpy = URLPatternSpyFactory.create(
		api,
		'fetchOdds',
		PRODUCTION_PATTERNS.pinnacleOdds
	);

	const pinnacleUrl = 'https://pinnacle.com/vds/sports/1/odds/12345?lang=en&currency=USD';
	
	console.log(`
✅ test(): ${pinnacleSpy.test(pinnacleUrl)}
✅ groups.marketId: ${pinnacleSpy.exec(pinnacleUrl)?.pathname.groups.marketId}
✅ groups.sportId: ${pinnacleSpy.exec(pinnacleUrl)?.pathname.groups.sportId}
✅ protocol: ${pinnacleSpy.protocol.value}
✅ hostname: ${pinnacleSpy.hostname.value}
✅ pathname: ${pinnacleSpy.pathname.value}
✅ hasRegExpGroups: ${pinnacleSpy.hasRegExpGroups}
✅ spy calls: ${pinnacleSpy.calledTimes()}
	`);

	// Call API
	api.fetchOdds(pinnacleUrl);
	console.log(`✅ After call - spy calls: ${pinnacleSpy.calledTimes()}`);

	// ✅ Bet365 - Hash routing
	const bet365Spy = URLPatternSpyFactory.create(
		api,
		'fetchOdds',
		PRODUCTION_PATTERNS.bet365SPA
	);

	const bet365Url = 'https://bet365.com/#/SB/nfl/12345/67890';
	console.log(`
✅ Bet365 test(): ${bet365Spy.test(bet365Url)}
✅ Bet365 groups.sport: ${bet365Spy.exec(bet365Url)?.pathname.groups.sport}
✅ Bet365 groups.marketId: ${bet365Spy.exec(bet365Url)?.pathname.groups.marketId}
✅ Bet365 hash: ${bet365Spy.hash.value}
	`);

	// ✅ Fonbet - Cyrillic regex
	const fonbetSpy = URLPatternSpyFactory.create(
		api,
		'fetchOdds',
		PRODUCTION_PATTERNS.fonbetLive
	);

	const fonbetUrl = 'https://fonbet.ru/live/футбол:12345';
	console.log(`
✅ Fonbet test(): ${fonbetSpy.test(fonbetUrl)}
✅ Fonbet groups.sport: ${fonbetSpy.exec(fonbetUrl)?.pathname.groups.sport}
✅ Fonbet hasRegExpGroups: ${fonbetSpy.hasRegExpGroups}
	`);

	return {
		pinnacleSpy,
		bet365Spy,
		fonbetSpy
	};
}

/**
 * Complete API demonstration
 */
export function demonstrateCompleteAPI() {
	const api = { fetchOdds: () => {} };
	const spy = URLPatternSpyFactory.create(
		api,
		'fetchOdds',
		PRODUCTION_PATTERNS.pinnacleOdds
	);

	const url = 'https://pinnacle.com/vds/sports/1/odds/12345?lang=en&currency=USD';

	// All available API methods
	return {
		// Core URLPattern API
		test: spy.test(url),
		exec: spy.exec(url),
		groups: spy.exec(url)?.pathname.groups,

		// Pattern properties
		protocol: spy.protocol.value,
		hostname: spy.hostname.value,
		pathname: spy.pathname.value,
		search: spy.search.value,
		hash: spy.hash.value,
		port: spy.port.value,
		username: spy.username.value,
		password: spy.password.value,

		// Spy integration
		calledTimes: spy.calledTimes(),
		hasRegExpGroups: spy.hasRegExpGroups,

		// Verification
		verify: () => {
			api.fetchOdds(url);
			return spy.verify(url);
		}
	};
}



