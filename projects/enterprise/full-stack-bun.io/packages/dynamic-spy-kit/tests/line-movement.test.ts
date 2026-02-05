/**
 * Line Movement Test Suite
 * 
 * Tests opening→buyback→closing patterns across regions
 */

import { test, expect } from "bun:test";
import { LineMovementDetector } from "../src/line-movement-detector";

test('asia→us line movement - pinnacle leads', () => {
	const detector = new LineMovementDetector();

	// Asia opening (Pinnacle sets line)
	const pinnacleOpening = detector.detectMovement('pinnacle', 'MANUTD-VS-LIV', { home: 1.95 });
	expect(pinnacleOpening.phase).toBe('OPENING');

	// Europe follows (Bet365 lags)
	const bet365Follow = detector.detectMovement('bet365', 'MANUTD-VS-LIV', { home: 2.05 });
	expect(bet365Follow.phase).toBe('OPENING');

	// US closing (Pinnacle moves first → Sharp action)
	const pinnacleMove = detector.detectMovement('pinnacle', 'MANUTD-VS-LIV', { home: 1.92 });
	expect(pinnacleMove.phase).toBe('CLOSING');
	expect(pinnacleMove.movement).toContain('-1.54'); // Approximately -1.54%

	const betmgmLag = detector.detectMovement('betmgm', 'MANUTD-VS-LIV', { home: 2.15 });
	expect(betmgmLag.phase).toBe('CLOSING');
});

test('sharp action detection - pinnacle leads', () => {
	const detector = new LineMovementDetector();
	const market = 'TEST-MARKET';

	// Pinnacle moves first
	detector.detectMovement('pinnacle', market, { home: 1.95 });
	detector.detectMovement('pinnacle', market, { home: 1.92 }); // -1.54%

	// Others lag
	detector.detectMovement('bet365', market, { home: 2.05 });
	detector.detectMovement('betmgm', market, { home: 2.10 });

	const comparison = detector.compareMovements(market, ['pinnacle', 'bet365', 'betmgm']);
	expect(comparison.sharp).toBe('pinnacle');
	expect(comparison.laggards.length).toBeGreaterThan(0);
	expect(comparison.movementDiff).toBeGreaterThan(0);
});

test('movement history tracking', () => {
	const detector = new LineMovementDetector();
	const bookie = 'pinnacle';
	const market = 'TEST-MARKET';

	detector.detectMovement(bookie, market, { home: 1.95 });
	detector.detectMovement(bookie, market, { home: 1.92 });
	detector.detectMovement(bookie, market, { home: 1.90 });

	const history = detector.getMovementHistory(bookie, market);
	expect(history.length).toBe(3);
	expect(history[0].phase).toBe('OPENING');
	expect(history[history.length - 1].movement).toContain('-2.56'); // Approximately -2.56%
});

test('buyback phase detection', () => {
	const detector = new LineMovementDetector();
	const bookie = 'pinnacle';
	const market = 'TEST-MARKET';

	// Opening
	detector.detectMovement(bookie, market, { home: 1.95 });

	// Buyback (>2% increase)
	detector.detectMovement(bookie, market, { home: 2.00 }); // +2.56%

	const latest = detector.getMovementHistory(bookie, market);
	expect(latest[latest.length - 1].phase).toBe('BUYBACK');
});



