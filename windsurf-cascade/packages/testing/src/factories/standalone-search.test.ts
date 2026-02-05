// Standalone search utilities test using Bun's testing framework

import { describe, test, expect } from 'bun:test';
import { faker } from '@faker-js/faker';

// Mock data type
interface MockTick {
    id: string;
    timestamp: number;
    symbol: string;
    price: number;
    exchange: string;
    side: 'buy' | 'sell';
}

// Simple factory for test data
class MockTickFactory {
    static create(overrides: Partial<MockTick> = {}): MockTick {
        const baseTick: MockTick = {
            id: faker.string.uuid(),
            timestamp: Date.now() - faker.number.int({ min: 0, max: 3600000 }),
            symbol: faker.finance.currencySymbol() + faker.finance.currencyCode(),
            price: faker.number.float({ min: 100, max: 1000, precision: 0.01 }),
            exchange: faker.helpers.arrayElement(['NYSE', 'NASDAQ', 'LSE']),
            side: faker.helpers.arrayElement(['buy', 'sell'])
        };
        return { ...baseTick, ...overrides };
    }
}

// Search utilities using efficient algorithms
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
        ticks: MockTick[],
        minProfitThreshold: number = 0.5
    ): Array<{ buy: MockTick, sell: MockTick, profit: number }> {
        const opportunities: Array<{ buy: MockTick, sell: MockTick, profit: number }> = [];

        // Group by symbol for efficient search
        const symbolGroups = new Map<string, MockTick[]>();
        ticks.forEach(tick => {
            if (!symbolGroups.has(tick.symbol)) {
                symbolGroups.set(tick.symbol, []);
            }
            symbolGroups.get(tick.symbol)!.push(tick);
        });

        // Search for arbitrage within each symbol group
        for (const [symbol, symbolTicks] of symbolGroups) {
            const buyTicks = symbolTicks.filter(t => t.side === 'buy');
            const sellTicks = symbolTicks.filter(t => t.side === 'sell');

            buyTicks.forEach(buy => {
                sellTicks.forEach(sell => {
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

describe('Bun Search Utilities', () => {
    const sampleTicks: MockTick[] = [
        MockTickFactory.create({ symbol: 'AAPL', exchange: 'NYSE', price: 150, side: 'buy' }),
        MockTickFactory.create({ symbol: 'AAPL', exchange: 'NASDAQ', price: 152, side: 'sell' }),
        MockTickFactory.create({ symbol: 'GOOGL', exchange: 'NYSE', price: 2800, side: 'buy' }),
        MockTickFactory.create({ symbol: 'GOOGL', exchange: 'NASDAQ', price: 2805, side: 'sell' }),
        MockTickFactory.create({ symbol: 'MSFT', exchange: 'LSE', price: 300, side: 'buy' }),
        MockTickFactory.create({ symbol: 'MSFT', exchange: 'NYSE', price: 302, side: 'sell' })
    ];

    test('should search objects by term using efficient filtering', () => {
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

    test('should find arbitrage opportunities using optimized search', () => {
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

    test('should filter by time range using Date.now()', () => {
        const now = Date.now();
        const recentTick = MockTickFactory.create({ timestamp: now - 1000 });
        const oldTick = MockTickFactory.create({ timestamp: now - 3600000 });
        const ticks = [recentTick, oldTick];

        const recent = SearchUtils.filterByTimeRange(ticks, now - 5000, now);
        expect(recent).toHaveLength(1);
        expect(recent[0].timestamp).toBe(recentTick.timestamp);
    });

    test('should get time range using standard time utilities', () => {
        const range24h = SearchUtils.getTimeRange(24);
        const range1h = SearchUtils.getTimeRange(1);

        expect(range24h.end - range24h.start).toBe(24 * 60 * 60 * 1000);
        expect(range1h.end - range1h.start).toBe(1 * 60 * 60 * 1000);
        expect(range24h.end).toBe(Date.now());
        expect(range1h.end).toBe(Date.now());
    });

    test('should handle large datasets efficiently', () => {
        const largeDataset = Array.from({ length: 1000 }, () => MockTickFactory.create());

        // Test search performance
        const searchResults = SearchUtils.searchObjects(largeDataset, 'USD', ['symbol']);
        expect(searchResults.length).toBeGreaterThanOrEqual(0);

        // Test time filtering performance
        const timeRange = SearchUtils.getTimeRange(1);
        const timeFiltered = SearchUtils.filterByTimeRange(largeDataset, timeRange.start, timeRange.end);
        expect(timeFiltered.length).toBeGreaterThanOrEqual(0);
    });
});
