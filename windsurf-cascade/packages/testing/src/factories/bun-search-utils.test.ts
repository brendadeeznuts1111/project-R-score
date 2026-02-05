// Test Bun search utilities

import { describe, test, expect } from 'bun:test';
import { OddsTickFactory, BunSearchUtils } from './index';

describe('BunSearchUtils', () => {
    const sampleTicks = [
        OddsTickFactory.create({ symbol: 'AAPL', exchange: 'NYSE', price: 150, side: 'buy' }),
        OddsTickFactory.create({ symbol: 'AAPL', exchange: 'NASDAQ', price: 152, side: 'sell' }),
        OddsTickFactory.create({ symbol: 'GOOGL', exchange: 'NYSE', price: 2800, side: 'buy' }),
        OddsTickFactory.create({ symbol: 'GOOGL', exchange: 'NASDAQ', price: 2805, side: 'sell' }),
        OddsTickFactory.create({ symbol: 'MSFT', exchange: 'LSE', price: 300, side: 'buy' }),
        OddsTickFactory.create({ symbol: 'MSFT', exchange: 'NYSE', price: 302, side: 'sell' })
    ];

    test('should search objects by term', () => {
        const results = BunSearchUtils.searchObjects(sampleTicks, 'AAPL', ['symbol']);
        expect(results).toHaveLength(2);
        expect(results[0].symbol).toBe('AAPL');
        expect(results[1].symbol).toBe('AAPL');
    });

    test('should search objects by multiple fields', () => {
        const results = BunSearchUtils.searchObjects(sampleTicks, 'NYSE', ['symbol', 'exchange']);
        expect(results.length).toBeGreaterThan(0);
        results.forEach(result => {
            expect(['symbol', 'exchange'].some(field =>
                String(result[field]).toLowerCase().includes('nyse')
            )).toBe(true);
        });
    });

    test('should find arbitrage opportunities', () => {
        const opportunities = BunSearchUtils.findArbitrageOpportunities(sampleTicks, 1.0);
        expect(opportunities.length).toBeGreaterThan(0);

        opportunities.forEach(opp => {
            expect(opp.profit).toBeGreaterThan(1.0);
            expect(opp.buy.exchange).not.toBe(opp.sell.exchange);
            expect(opp.buy.symbol).toBe(opp.sell.symbol);
            expect(opp.buy.side).toBe('buy');
            expect(opp.sell.side).toBe('sell');
        });
    });

    test('should filter by time range', () => {
        const now = Date.now();
        const recentTick = OddsTickFactory.create({ timestamp: now - 1000 });
        const oldTick = OddsTickFactory.create({ timestamp: now - 3600000 });
        const ticks = [recentTick, oldTick];

        const recent = BunSearchUtils.filterByTimeRange(ticks, now - 5000, now);
        expect(recent).toHaveLength(1);
        expect(recent[0].timestamp).toBe(recentTick.timestamp);
    });

    test('should get time range', () => {
        const range24h = BunSearchUtils.getTimeRange(24);
        const range1h = BunSearchUtils.getTimeRange(1);

        expect(range24h.end - range24h.start).toBe(24 * 60 * 60 * 1000);
        expect(range1h.end - range1h.start).toBe(1 * 60 * 60 * 1000);
        expect(range24h.end).toBe(Date.now());
        expect(range1h.end).toBe(Date.now());
    });
});
