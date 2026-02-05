/**
 * @dynamic-spy/kit v5.4 - Quantum URLPattern Test Suite
 * 
 * 99.99% match rate, comprehensive edge cases
 */

import { describe, test, expect, beforeEach, jest } from "bun:test";
import { QuantumURLPatternSpyFactory } from "../src/quantum-urlpattern-spy";
import { HYPER_ENHANCED_SPORTSBOOK_PATTERNS } from "../src/hyper-enhanced-sportsbook-patterns";
import { generateSampleUrl, generateMarketUrl } from "./test-utils";

describe("Quantum URLPattern - 250+ patterns", () => {
	const api = { fetchOdds: jest.fn(), processLive: jest.fn() };

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("multi-pattern fallback & confidence - pinnacle", () => {
		const pinnacleSpy = QuantumURLPatternSpyFactory.createMulti(
			api,
			'fetchOdds',
			HYPER_ENHANCED_SPORTSBOOK_PATTERNS.pinnacle,
			{ cacheResults: true }
		);

		const testUrls = [
			"https://pinnacle.com/vds/sports/1/odds/12345",
			"https://pinnacle.com/vds/sports/1/zh/odds/12345",
			"https://pinnacle.com/vds/live/sports/1/events/98765/details",
			"https://pinnacle.com/v1/odds/historical/2024-01-01/2024-01-07/market123"
		];

		testUrls.forEach(url => {
			const match = pinnacleSpy.exec(url);
			expect(match).not.toBeNull();
			expect(match!.bestMatch.confidence).toBeGreaterThanOrEqual(0.75);
			pinnacleSpy.verify(url);
		});
	});

	test("99.99% match rate - 250 patterns (production traffic simulation)", () => {
		let totalTests = 0;
		let matches = 0;
		const testPatternSet = Object.values(HYPER_ENHANCED_SPORTSBOOK_PATTERNS).flat();
		const spy = QuantumURLPatternSpyFactory.createMulti(api, 'processLive', testPatternSet, { cacheResults: true });

		// Simulate 100 sample URLs per bookie
		const bookies = Object.keys(HYPER_ENHANCED_SPORTSBOOK_PATTERNS);
		for (let i = 0; i < 100 * bookies.length; i++) {
			totalTests++;
			const samplePattern = testPatternSet[Math.floor(Math.random() * testPatternSet.length)];
			const sampleUrl = generateSampleUrl(samplePattern);
			if (spy.test(sampleUrl)) {
				matches++;
			}
		}

		const matchRate = matches / totalTests;
		console.log(`Total Match Tests: ${totalTests}, Successful Matches: ${matches}, Match Rate: ${(matchRate * 100).toFixed(2)}%`);
		expect(matchRate).toBeGreaterThan(0.9999); // 99.99%
	});
});



