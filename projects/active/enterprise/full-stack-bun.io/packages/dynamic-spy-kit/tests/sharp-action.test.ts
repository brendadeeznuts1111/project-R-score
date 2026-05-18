/**
 * Sharp Action Test Suite
 * 
 * Tests Pinnacle leads line movement
 */

import { test, expect } from "bun:test";
import { LineMovementDetector } from "../src/line-movement-detector";

test('pinnacle leads line movement', () => {
	const detector = new LineMovementDetector();
	const market = 'MANUTD-VS-LIV';

	// Pinnacle sets opening line
	detector.detectMovement('pinnacle', market, { home: 1.95 });

	// Pinnacle moves first (sharp action)
	const pinnacleMove = detector.detectMovement('pinnacle', market, { home: 1.92 });

	// Others lag behind
	detector.detectMovement('bet365', market, { home: 2.05 });
	detector.detectMovement('betmgm', market, { home: 2.10 });

	const comparison = detector.compareMovements(market, ['pinnacle', 'bet365', 'betmgm']);
	
	expect(comparison.sharp).toBe('pinnacle');
	expect(comparison.movementDiff).toBeGreaterThan(0);
	expect(pinnacleMove.phase).toBe('CLOSING');
});

test('sharp action - multiple movements', () => {
	const detector = new LineMovementDetector();
	const market = 'TEST-MARKET';

	// Pinnacle leads with multiple movements
	detector.detectMovement('pinnacle', market, { home: 1.95 });
	detector.detectMovement('pinnacle', market, { home: 1.92 });
	detector.detectMovement('pinnacle', market, { home: 1.90 });

	// Others follow slowly
	detector.detectMovement('bet365', market, { home: 2.05 });
	detector.detectMovement('bet365', market, { home: 2.03 });

	const pinnacleHistory = detector.getMovementHistory('pinnacle', market);
	const bet365History = detector.getMovementHistory('bet365', market);

	expect(pinnacleHistory.length).toBeGreaterThan(bet365History.length);
	expect(Math.abs(parseFloat(pinnacleHistory[pinnacleHistory.length - 1].movement)))
		.toBeGreaterThan(Math.abs(parseFloat(bet365History[bet365History.length - 1]?.movement || '0')));
});



