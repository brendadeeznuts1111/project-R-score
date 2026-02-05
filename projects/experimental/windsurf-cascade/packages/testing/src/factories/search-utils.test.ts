// Test search utilities using Bun's testing framework

import { describe, test, expect } from 'bun:test';
import { OddsTickFactory } from './index';

// Simple search utilities for testing
class SearchUtils {
    static searchObjects<T extends Record<string, any>>(
        objects: T[],
        searchTerm: string,
        fields: (keyof T)[]
    ): T[] {
        const term = searchTerm.toLowerCase();
        return objects.filter(obj =>
            fields.some(field =>
                String(obj[field]).toLowerCase().includes(term)
            )
        );
    }

    static findArbitrageOpportunities(
        ticks: any[],
        minProfitThreshold: number = 0.5
    ): Array<{ buy: any, sell: any, profit: number }> {
        const opportunities: Array<{ buy: any, sell: any, profit: number }> = [];

        // Group by symbol for efficient search
        const symbolGroups = new Map<string, any[]>();
        ticks.forEach(tick => {
            if (!symbolGroups.has(tick.symbol)) {
                symbolGroups.set(tick.symbol, []);
            }
            symbolGroups.get(tick.symbol)!.push(tick);
        });

        // Search for arbitrage within each symbol group
        for (const [symbol, symbolTicks] of symbolGroups) {
            const buyTicks = symbolTicks.filter((t: any) => t.side === 'buy');
            const sellTicks = symbolTicks.filter((t: any) => t.side === 'sell');

            buyTicks.forEach((buy: any) => {
                sellTicks.forEach((sell: any) => {
                    const profit = sell.price - buy.price;
                    if (profit > minProfitThreshold && buy.exchange !== sell.exchange) {
                        opportunities.push({ buy, sell, profit });
                    }
                });
            });
        }

        return opportunities.sort((a, b) => b.profit - a.profit);
    }

    static filterByTimeRange<T extends { timestamp: number }>(
        data: T[],
        startTime: number,
        endTime: number
    ): T[] {
        return data.filter(item =>
            item.timestamp >= startTime && item.timestamp <= endTime
        );
    }

    static getTimeRange(hoursBack: number = 24): { start: number, end: number } {
        const now = Date.now();
        const start = now - (hoursBack * 60 * 60 * 1000);
        return { start, end: now };
    }
}

describe('SearchUtils', () => {
    const sampleTicks = [
        OddsTickFactory.create({ symbol: 'AAPL', exchange: 'NYSE', price: 150, side: 'buy' }),
        OddsTickFactory.create({ symbol: 'AAPL', exchange: 'NASDAQ', price: 152, side: 'sell' }),
        OddsTickFactory.create({ symbol: 'GOOGL', exchange: 'NYSE', price: 2800, side: 'buy' }),
        OddsTickFactory.create({ symbol: 'GOOGL', exchange: 'NASDAQ', price: 2805, side: 'sell' }),
        OddsTickFactory.create({ symbol: 'MSFT', exchange: 'LSE', price: 300, side: 'buy' }),
        OddsTickFactory.create({ symbol: 'MSFT', exchange: 'NYSE', price: 302, side: 'sell' })
    ];

    test('should search objects by term', () => {
        const results = SearchUtils.searchObjects(sampleTicks, 'AAPL', ['symbol']);
        expect(results).toHaveLength(2);
        expect(results[0].symbol).toBe('AAPL');
        expect(results[1].symbol).toBe('AAPL');
    });

    test('should search objects by multiple fields', () => {
        const results = SearchUtils.searchObjects(sampleTicks, 'NYSE', ['symbol', 'exchange']);
        expect(results.length).toBeGreaterThan(0);
        results.forEach(result => {
            expect(['symbol', 'exchange'].some(field =>
                String(result[field]).toLowerCase().includes('nyse')
            )).toBe(true);
        });
    });

    test('should find arbitrage opportunities', () => {
        const opportunities = SearchUtils.findArbitrageOpportunities(sampleTicks, 1.0);
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

        const recent = SearchUtils.filterByTimeRange(ticks, now - 5000, now);
        expect(recent).toHaveLength(1);
        expect(recent[0].timestamp).toBe(recentTick.timestamp);
    });

    test('should get time range', () => {
        const range24h = SearchUtils.getTimeRange(24);
        const range1h = SearchUtils.getTimeRange(1);

        expect(range24h.end - range24h.start).toBe(24 * 60 * 60 * 1000);
        expect(range1h.end - range1h.start).toBe(1 * 60 * 60 * 1000);
        expect(range24h.end).toBe(Date.now());
        expect(range1h.end).toBe(Date.now());
    });
});
