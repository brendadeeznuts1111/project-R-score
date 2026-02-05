/**
 * Tick Monitor Test Suite
 * 
 * Tests 100ms resolution tick monitoring
 */

import { test, expect, beforeEach } from "bun:test";
import { TickMonitor } from "../src/tick-monitor";

beforeEach(() => {
	// Reset timers if needed
});

test('tick monitoring - 100ms resolution', async () => {
	const tickMonitor = new TickMonitor();
	const bookie = 'pinnacle';
	const market = 'MANUTD-VS-LIV';

	// Simulate 1 hour of ticks (3600 ticks at 100ms intervals = 360 seconds)
	for (let i = 0; i < 3600; i++) {
		tickMonitor.monitorTick(bookie, market, {
			bid: 1.95 + (i * 0.0001),
			ask: 2.10 - (i * 0.0001),
			volume: 1000000 + (i * 1000)
		});
	}

	const ticks = tickMonitor.getTicks(bookie, market);
	expect(ticks.length).toBe(3600);
	
	const movement = tickMonitor.getLineMovement(bookie, market);
	expect(movement.opening).toBeCloseTo(1.95, 2);
	expect(movement.current).toBeGreaterThan(1.95);
	expect(movement.movement).toBeGreaterThan(0);
});

test('tick monitor - multiple markets', () => {
	const tickMonitor = new TickMonitor();

	tickMonitor.monitorTick('pinnacle', 'MARKET-1', { bid: 1.95, ask: 2.10, volume: 1000 });
	tickMonitor.monitorTick('pinnacle', 'MARKET-2', { bid: 2.05, ask: 2.20, volume: 2000 });
	tickMonitor.monitorTick('bet365', 'MARKET-1', { bid: 2.00, ask: 2.15, volume: 1500 });

	expect(tickMonitor.getTicks('pinnacle', 'MARKET-1').length).toBe(1);
	expect(tickMonitor.getTicks('pinnacle', 'MARKET-2').length).toBe(1);
	expect(tickMonitor.getTicks('bet365', 'MARKET-1').length).toBe(1);
});

test('line movement - opening phase', () => {
	const tickMonitor = new TickMonitor();
	const bookie = 'pinnacle';
	const market = 'TEST-MARKET';

	// First 50 ticks (opening phase)
	for (let i = 0; i < 50; i++) {
		tickMonitor.monitorTick(bookie, market, {
			bid: 1.95,
			ask: 2.10,
			volume: 1000
		});
	}

	const movement = tickMonitor.getLineMovement(bookie, market);
	expect(movement.phase).toBe('OPENING');
});

test('line movement - buyback phase', () => {
	const tickMonitor = new TickMonitor();
	const bookie = 'pinnacle';
	const market = 'TEST-MARKET';

	// Opening
	for (let i = 0; i < 100; i++) {
		tickMonitor.monitorTick(bookie, market, {
			bid: 1.95,
			ask: 2.10,
			volume: 1000
		});
	}

	// Buyback (price increases >2%)
	for (let i = 0; i < 50; i++) {
		tickMonitor.monitorTick(bookie, market, {
			bid: 1.95 + (i * 0.001), // Increasing price
			ask: 2.10,
			volume: 1000
		});
	}

	const movement = tickMonitor.getLineMovement(bookie, market);
	expect(movement.movement).toBeGreaterThan(2);
	expect(movement.phase).toBe('BUYBACK');
});

test('line movement - closing phase', () => {
	const tickMonitor = new TickMonitor();
	const bookie = 'pinnacle';
	const market = 'TEST-MARKET';

	// Opening
	for (let i = 0; i < 100; i++) {
		tickMonitor.monitorTick(bookie, market, {
			bid: 1.95,
			ask: 2.10,
			volume: 1000
		});
	}

	// Closing (price decreases <-1%)
	for (let i = 0; i < 50; i++) {
		tickMonitor.monitorTick(bookie, market, {
			bid: 1.95 - (i * 0.001), // Decreasing price
			ask: 2.10,
			volume: 1000
		});
	}

	const movement = tickMonitor.getLineMovement(bookie, market);
	expect(movement.movement).toBeLessThan(-1);
	expect(movement.phase).toBe('CLOSING');
});

test('tick monitor - clear ticks', () => {
	const tickMonitor = new TickMonitor();
	const bookie = 'pinnacle';
	const market = 'TEST-MARKET';

	tickMonitor.monitorTick(bookie, market, { bid: 1.95, ask: 2.10, volume: 1000 });
	expect(tickMonitor.getTicks(bookie, market).length).toBe(1);

	tickMonitor.clearTicks(bookie, market);
	expect(tickMonitor.getTicks(bookie, market).length).toBe(0);
});

test('tick monitor - total count', () => {
	const tickMonitor = new TickMonitor();

	tickMonitor.monitorTick('pinnacle', 'MARKET-1', { bid: 1.95, ask: 2.10, volume: 1000 });
	tickMonitor.monitorTick('pinnacle', 'MARKET-2', { bid: 2.05, ask: 2.20, volume: 2000 });
	tickMonitor.monitorTick('bet365', 'MARKET-1', { bid: 2.00, ask: 2.15, volume: 1500 });

	expect(tickMonitor.getTotalTickCount()).toBe(3);
});



