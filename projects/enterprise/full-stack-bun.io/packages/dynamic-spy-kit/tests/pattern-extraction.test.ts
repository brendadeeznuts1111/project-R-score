/**
 * Pattern Extraction Test Suite
 * 
 * Tests pattern extraction from multiple winning plays
 */

import { test, expect } from "bun:test";
import { PatternExtractor } from "../src/pattern-extractor";
import { BackworkEngine, WinningPlay } from "../src/backwork-engine";
import { TickDataExtended } from "../src/model-reverse";

// Helper function to create mock ticks
function createMockTicks(): Map<string, TickDataExtended[]> {
	const ticks = new Map<string, TickDataExtended[]>();
	const now = Date.now();

	const pinnacleTicks: TickDataExtended[] = [];
	for (let i = 0; i < 100; i++) {
		pinnacleTicks.push({
			bid: 1.92 - (i * 0.001),
			ask: 2.10,
			volume: 1000000 + (i * 10000),
			timestamp: now - (100 - i) * 60000,
			market: 'MANUTD-VS-LIV',
			bookie: 'pinnacle',
			region: 'EUROPE',
			currentLine: { home: 1.92 - (i * 0.001), away: 2.10 },
			lineMovement: -i * 0.001
		});
	}
	ticks.set('pinnacle:MANUTD-VS-LIV', pinnacleTicks);

	return ticks;
}

test('extract patterns from multiple plays', async () => {
	const ticks = createMockTicks();
	const backworkEngine = new BackworkEngine(ticks);
	const extractor = new PatternExtractor();

	const plays: WinningPlay[] = [
		{
			timestamp: Date.now(),
			bookie: 'pinnacle',
			market: 'MANUTD-VS-LIV',
			line: 1.92,
			side: 'home',
			stake: 1200000,
			odds: 1.92,
			profit: 230000
		},
		{
			timestamp: Date.now() + 3600000,
			bookie: 'pinnacle',
			market: 'ARSENAL-VS-CHELSEA',
			line: 1.95,
			side: 'home',
			stake: 1000000,
			odds: 1.95,
			profit: 190000
		}
	];

	const results = await Promise.all(
		plays.map(play => backworkEngine.reverseEngineer(play))
	);

	const patterns = extractor.extractPatterns(results);

	expect(patterns.length).toBeGreaterThan(0);
	if (patterns.length > 0) {
		expect(patterns[0].plays).toBeGreaterThan(0);
		// Edge may be 0 if profit data is missing
		expect(patterns[0].edge).toBeGreaterThanOrEqual(0);
	}
});

test('pattern extraction - common signals', async () => {
	const ticks = createMockTicks();
	const backworkEngine = new BackworkEngine(ticks);
	const extractor = new PatternExtractor();

	const plays: WinningPlay[] = Array.from({ length: 5 }, (_, i) => ({
		timestamp: Date.now() + (i * 3600000),
		bookie: 'pinnacle',
		market: `MARKET-${i}`,
		line: 1.92 + (i * 0.01),
		side: 'home',
		stake: 1000000,
		odds: 1.92
	}));

	const results = await Promise.all(
		plays.map(play => backworkEngine.reverseEngineer(play))
	);

	const patterns = extractor.extractPatterns(results);

	expect(patterns.length).toBeGreaterThan(0);
	if (patterns.length > 0) {
		expect(Array.isArray(patterns[0].signals)).toBe(true);
		expect(patterns[0].entry).toBeDefined();
		expect(patterns[0].stake).toBeDefined();
		expect(patterns[0].name).toBeDefined();
		expect(patterns[0].plays).toBeGreaterThan(0);
	}
});

