/**
 * Tick Benchmark Test Suite
 * 
 * Tests 864K ticks/24h performance
 */

import { test, expect } from "bun:test";
import { TickMonitor } from "../src/tick-monitor";

const SPORTSBOOKS = ['pinnacle', 'bet365', 'fonbet', 'betmgm', 'draftkings'];
const mockOdds = { bid: 1.95, ask: 2.10, volume: 1000000 };

test('tick benchmark - 864K ticks/24h', () => {
	const tickMonitor = new TickMonitor();
	const start = performance.now();

	// 75 bookies × 12K markets × 1 tick = 900K ticks (simplified)
	// Actual: 75 bookies × 12,467 markets × 1 tick = 935,025 ticks
	for (let b = 0; b < 75; b++) {
		for (let m = 0; m < 12467; m++) {
			tickMonitor.monitorTick(SPORTSBOOKS[b % SPORTSBOOKS.length], `MARKET-${m}`, mockOdds);
		}
	}

	const duration = performance.now() - start;
	const totalTicks = tickMonitor.getTotalTickCount();

	expect(totalTicks).toBe(75 * 12467);
	expect(duration).toBeLessThan(2500); // <2.5s for 935K ticks ⚡
});

test('tick monitor - memory efficiency', () => {
	const tickMonitor = new TickMonitor();

	// Add 10000 ticks to one market (should cap at 10000)
	for (let i = 0; i < 15000; i++) {
		tickMonitor.monitorTick('pinnacle', 'TEST-MARKET', mockOdds);
	}

	const ticks = tickMonitor.getTicks('pinnacle', 'TEST-MARKET');
	expect(ticks.length).toBe(10000); // Capped at 10000
});



