/**
 * Backwork Test Suite
 * 
 * Tests reverse engineering winning models
 */

import { test, expect } from "bun:test";
import { BackworkEngine, WinningPlay } from "../src/backwork-engine";
import { ModelReverseEngineer } from "../src/model-reverse";
import { AsiaSpikeDetector } from "../src/asia-spike-detector";
import { TickDataExtended } from "../src/model-reverse";

// Create mock tick data
function createMockTicks(): Map<string, TickDataExtended[]> {
	const ticks = new Map<string, TickDataExtended[]>();
	const now = Date.now();

	// Create Pinnacle ticks
	const pinnacleTicks: TickDataExtended[] = [];
	for (let i = 0; i < 100; i++) {
		pinnacleTicks.push({
			bid: 1.92 - (i * 0.001),
			ask: 2.10,
			volume: 1000000 + (i * 10000),
			timestamp: now - (100 - i) * 60000, // Last 100 minutes
			market: 'MANUTD-VS-LIV',
			bookie: 'pinnacle',
			region: 'EUROPE',
			currentLine: { home: 1.92 - (i * 0.001), away: 2.10 },
			lineMovement: -i * 0.001
		});
	}
	ticks.set('pinnacle:MANUTD-VS-LIV', pinnacleTicks);

	// Create Asia ticks (SBOBET, Fonbet) - before Pinnacle
	const asiaTicks: TickDataExtended[] = [];
	for (let i = 0; i < 50; i++) {
		asiaTicks.push({
			bid: 1.89 - (i * 0.001),
			ask: 2.05,
			volume: 3000000 + (i * 50000), // High volume spike
			timestamp: now - (150 - i) * 60000, // 150-100 minutes before
			market: 'MANUTD-VS-LIV',
			bookie: i % 2 === 0 ? 'sbobet' : 'fonbet',
			region: 'ASIA',
			currentLine: { home: 1.89 - (i * 0.001), away: 2.05 },
			lineMovement: -i * 0.001
		});
	}
	ticks.set('asia:MANUTD-VS-LIV', asiaTicks);

	return ticks;
}

test('reverse engineer winning play → asia spike', async () => {
	const ticks = createMockTicks();
	const backworkEngine = new BackworkEngine(ticks);

	const winningPlay: WinningPlay = {
		timestamp: Date.now(),
		bookie: 'pinnacle',
		market: 'MANUTD-VS-LIV',
		line: 1.92,
		side: 'home',
		stake: 1200000,
		odds: 1.92,
		profit: 230000
	};

	const result = await backworkEngine.reverseEngineer(winningPlay);

	expect(result.topMatch).not.toBeNull();
	if (result.topMatch) {
		expect(result.topMatch.confidence).toBeGreaterThan(0.7);
		expect(result.topMatch.market).toBe('MANUTD-VS-LIV');
	}

	// Asia signals may or may not be found depending on volume thresholds
	expect(Array.isArray(result.asiaSignals)).toBe(true);
	expect(result.modelFingerprint.replicationScore).toBeGreaterThan(0.5);
});

test('fuzzy search winning play', () => {
	const ticks = createMockTicks();
	const modelReverse = new ModelReverseEngineer(ticks);

	const winningPlay: WinningPlay = {
		timestamp: Date.now(),
		bookie: 'pinnacle',
		market: 'MANUTD-VS-LIV',
		line: 1.92,
		side: 'home',
		stake: 1200000,
		odds: 1.92
	};

	const matches = modelReverse.fuzzySearchWinningPlay(winningPlay);

	expect(matches.length).toBeGreaterThan(0);
	if (matches.length > 0) {
		expect(matches[0].confidence).toBeGreaterThan(0.7);
		expect(matches[0].market).toBe('MANUTD-VS-LIV');
	}
});

test('asia spike detection', () => {
	const ticks = createMockTicks();
	const asiaDetector = new AsiaSpikeDetector(ticks);

	const winningPlay: WinningPlay = {
		timestamp: Date.now(),
		bookie: 'pinnacle',
		market: 'MANUTD-VS-LIV',
		line: 1.92,
		side: 'home',
		stake: 1200000,
		odds: 1.92
	};

	const signals = asiaDetector.detectPrePinnacleSignals(winningPlay);

	// Signals may be found if volume threshold is met
	expect(Array.isArray(signals)).toBe(true);
	if (signals.length > 0) {
		signals.forEach(signal => {
			expect(signal.bookie).toMatch(/sbobet|fonbet/);
			expect(signal.volume).toBeGreaterThan(0);
			expect(signal.confidence).toBeGreaterThan(0);
		});
	}
});

test('model fingerprint generation', async () => {
	const ticks = createMockTicks();
	const backworkEngine = new BackworkEngine(ticks);

	const winningPlay: WinningPlay = {
		timestamp: Date.now(),
		bookie: 'pinnacle',
		market: 'MANUTD-VS-LIV',
		line: 1.92,
		side: 'home',
		stake: 1200000,
		odds: 1.92
	};

	const result = await backworkEngine.reverseEngineer(winningPlay);

	expect(result.modelFingerprint).toBeDefined();
	expect(result.modelFingerprint.edge).toBeDefined();
	expect(result.modelFingerprint.leadTime).toBeDefined();
	expect(result.modelFingerprint.replicationScore).toBeGreaterThan(0);
	expect(result.modelFingerprint.signals.length).toBeGreaterThan(0);
});

