/**
 * @dynamic-spy/kit v5.4 - Production Examples Test
 * 
 * Real bookie patterns with complete API access
 */

import { test, expect } from "bun:test";
import { URLPatternSpyFactory } from "../src/core/urlpattern-spy";
import { PRODUCTION_PATTERNS, demonstrateProductionUsage, demonstrateCompleteAPI } from "../src/production-examples";

describe("Production Examples", () => {
	test("Pinnacle - Complete API coverage", () => {
		const api = { fetchOdds: () => {} };
		const pinnacleSpy = URLPatternSpyFactory.create(
			api,
			'fetchOdds',
			PRODUCTION_PATTERNS.pinnacleOdds
		);

		const url = 'https://pinnacle.com/vds/sports/1/odds/12345?lang=en&currency=USD';

		// ✅ test()
		expect(pinnacleSpy.test(url)).toBe(true);
		expect(pinnacleSpy.test('https://pinnacle.com/invalid')).toBe(false);

		// ✅ exec() → groups
		const result = pinnacleSpy.exec(url);
		expect(result).not.toBeNull();
		expect(result!.pathname.groups.marketId).toBe('12345');
		expect(result!.pathname.groups.sportId).toBe('1');

		// ✅ Pattern properties
		expect(pinnacleSpy.protocol.value).toBe('https:');
		expect(pinnacleSpy.hostname.value).toBe('pinnacle.com');
		expect(pinnacleSpy.pathname.value).toContain('/vds/sports/:sportId/odds/:marketId');

		// ✅ hasRegExpGroups
		expect(pinnacleSpy.hasRegExpGroups).toBe(false);

		// ✅ spy calls
		expect(pinnacleSpy.calledTimes()).toBe(0);
		api.fetchOdds(url);
		expect(pinnacleSpy.calledTimes()).toBe(1);

		// ✅ verify
		pinnacleSpy.verify(url);
	});

	test("Bet365 - Hash + SPA routing", () => {
		const api = { fetchOdds: () => {} };
		const bet365Spy = URLPatternSpyFactory.create(
			api,
			'fetchOdds',
			PRODUCTION_PATTERNS.bet365SPA
		);

		const url = 'https://bet365.com/#/SB/nfl/12345/67890';

		expect(bet365Spy.test(url)).toBe(true);
		const result = bet365Spy.exec(url);
		expect(result).not.toBeNull();
		expect(result!.pathname.groups.sport).toBe('nfl');
		expect(result!.pathname.groups.marketId).toBe('67890');
		expect(bet365Spy.hash.value).toBe('#live?');
	});

	test("Fonbet - Cyrillic + regex", () => {
		const api = { fetchOdds: () => {} };
		const fonbetSpy = URLPatternSpyFactory.create(
			api,
			'fetchOdds',
			PRODUCTION_PATTERNS.fonbetLive
		);

		const url = 'https://fonbet.ru/live/футбол:12345';

		expect(fonbetSpy.test(url)).toBe(true);
		const result = fonbetSpy.exec(url);
		expect(result).not.toBeNull();
		expect(fonbetSpy.hasRegExpGroups).toBe(true);
	});

	test("Complete API demonstration", () => {
		const result = demonstrateCompleteAPI();
		
		expect(result.test).toBe(true);
		expect(result.exec).not.toBeNull();
		expect(result.groups).toBeDefined();
		expect(result.protocol).toBe('https:');
		expect(result.hostname).toBe('pinnacle.com');
		expect(result.calledTimes).toBe(0);
		expect(result.hasRegExpGroups).toBe(false);

		// Test verify
		const verifyResult = result.verify();
		expect(verifyResult).not.toBeNull();
		expect(result.calledTimes).toBeGreaterThan(0);
	});

	test("Production usage demonstration", () => {
		const spies = demonstrateProductionUsage();
		
		expect(spies.pinnacleSpy).toBeDefined();
		expect(spies.bet365Spy).toBeDefined();
		expect(spies.fonbetSpy).toBeDefined();
	});
});



