// Test Data Factories - Centralized mock generation
// Provides consistent, realistic test data across all test suites

import { faker } from '@faker-js/faker';
import { OddsTick, ArbitrageOpportunity, WebSocketMessage, MarketData } from '../../../odds-core/src/types/index';

// Export synthetic arbitrage factories
export { SyntheticArbitrageFactory } from './arbitrage-factory';
export {
    SyntheticArbitrageV1Factory,
    SyntheticArbitrageV2Factory,
    SyntheticArbitrageV3Factory,
    SyntheticArbitrageBatchFactory
} from './incremental-synthetic-factory';

// ===== CORE DATA FACTORIES =====

/**
 * Factory for generating OddsTick objects
 */
export class OddsTickFactory {
    static create(overrides: Partial<OddsTick> = {}): OddsTick {
        const baseTick: OddsTick = {
            id: faker.string.uuid(),
            timestamp: Date.now() - faker.number.int({ min: 0, max: 3600000 }), // Recent timestamp
            symbol: faker.finance.currencySymbol() + faker.finance.currencyCode(),
            price: faker.number.float({ min: 100, max: 1000, precision: 0.01 }),
            size: faker.number.int({ min: 1, max: 1000 }),
            exchange: faker.helpers.arrayElement(['NYSE', 'NASDAQ', 'LSE']),
            side: faker.helpers.arrayElement(['buy', 'sell'])
        };

        return { ...baseTick, ...overrides };
    }

    static createBatch(count: number, overrides: Partial<OddsTick> = {}): OddsTick[] {
        return Array.from({ length: count }, () => this.create(overrides));
    }

    static createWithSpecificPrice(price: number, side: 'buy' | 'sell'): OddsTick {
        return this.create({
            price,
            side
        });
    }

    static createArbitrageOpportunity(): OddsTick[] {
        return [
            this.create({ exchange: 'NYSE', price: 100.50, side: 'buy' }),
            this.create({ exchange: 'NASDAQ', price: 101.00, side: 'sell' })
        ];
    }
}

/**
 * Factory for generating ArbitrageOpportunity objects
 */
export class ArbitrageOpportunityFactory {
    static create(overrides: Partial<ArbitrageOpportunity> = {}): ArbitrageOpportunity {
        const baseOpportunity: ArbitrageOpportunity = {
            id: faker.string.uuid(),
            symbol: faker.finance.currencySymbol() + faker.finance.currencyCode(),
            exchange1: faker.helpers.arrayElement(['NYSE', 'NASDAQ', 'LSE']),
            exchange2: faker.helpers.arrayElement(['NYSE', 'NASDAQ', 'LSE']),
            price1: faker.number.float({ min: 100, max: 1000, precision: 0.01 }),
            price2: faker.number.float({ min: 100, max: 1000, precision: 0.01 }),
            profit: faker.number.float({ min: 0.5, max: 5.0, precision: 0.1 }),
            confidence: faker.number.float({ min: 0.5, max: 1.0, precision: 0.01 }),
            timestamp: faker.date.recent().getTime()
        };

        return { ...baseOpportunity, ...overrides };
    }

    static createProfitable(): ArbitrageOpportunity {
        return this.create({
            profit: faker.number.float({ min: 1.0, max: 5.0, precision: 0.1 }),
            confidence: faker.number.float({ min: 0.8, max: 1.0, precision: 0.01 })
        });
    }

    static createNonProfitable(): ArbitrageOpportunity | null {
        return null; // Represents scenarios with no arbitrage opportunity
    }

    static createBatch(count: number, overrides: Partial<ArbitrageOpportunity> = {}): ArbitrageOpportunity[] {
        return Array.from({ length: count }, () => this.create(overrides));
    }
}

/**
 * Factory for generating WebSocketMessage objects
 */
export class WebSocketMessageFactory {
    static create(overrides: Partial<WebSocketMessage> = {}): WebSocketMessage {
        const baseMessage: WebSocketMessage = {
            type: faker.helpers.arrayElement(['odds-update', 'arbitrage-alert', 'market-data']),
            data: {
                id: faker.string.uuid(),
                price: faker.number.float({ min: 100, max: 1000, precision: 0.01 })
            },
            timestamp: faker.date.recent().getTime(),
            sequence: faker.number.int({ min: 1, max: 1000000 })
        };

        return { ...baseMessage, ...overrides };
    }

    static createOddsUpdate(oddsTick: OddsTick): WebSocketMessage {
        return this.create({
            type: 'odds-update',
            data: oddsTick
        });
    }

    static createArbitrageAlert(opportunity: ArbitrageOpportunity): WebSocketMessage {
        return this.create({
            type: 'arbitrage-alert',
            data: opportunity
        });
    }

    static createBatch(count: number): WebSocketMessage[] {
        return Array.from({ length: count }, () => this.create());
    }
}

/**
 * Factory for generating MarketData objects
 */
export class MarketDataFactory {
    static create(overrides: Partial<MarketData> = {}): MarketData {
        const baseMarket: MarketData = {
            symbol: faker.finance.currencySymbol() + faker.finance.currencyCode(),
            bids: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => [
                faker.number.float({ min: 100, max: 1000, precision: 0.01 }),
                faker.number.int({ min: 1, max: 100 })
            ] as [number, number]),
            asks: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => [
                faker.number.float({ min: 100, max: 1000, precision: 0.01 }),
                faker.number.int({ min: 1, max: 100 })
            ] as [number, number]),
            timestamp: faker.date.recent().getTime(),
            sequence: faker.number.int({ min: 1, max: 1000000 })
        };

        return { ...baseMarket, ...overrides };
    }

    static createBatch(count: number, overrides: Partial<MarketData> = {}): MarketData[] {
        return Array.from({ length: count }, () => this.create(overrides));
    }
}

// ===== SPECIALIZED FACTORIES =====

/**
 * Factory for performance testing data
 */
export class PerformanceDataFactory {
    static createLargeDataset(size: number): OddsTick[] {
        return OddsTickFactory.createBatch(size);
    }

    static createHighFrequencyData(durationMs: number, intervalMs: number = 100): OddsTick[] {
        const dataPoints = Math.floor(durationMs / intervalMs);
        return Array.from({ length: dataPoints }, (_, i) =>
            OddsTickFactory.create({
                timestamp: Date.now() - (durationMs - i * intervalMs)
            })
        );
    }

    static createMemoryPressureData(): any[] {
        return Array.from({ length: 1000 }, () =>
            new Array(10000).fill(null).map(() => ({
                data: faker.lorem.words(100),
                timestamp: faker.date.recent().getTime()
            }))
        );
    }
}

/**
 * Factory for network/API testing
 */
export class NetworkDataFactory {
    static createAPIResponse(success: boolean = true): any {
        return {
            success,
            data: success ? OddsTickFactory.createBatch(10) : null,
            error: success ? null : { message: 'API Error', code: 500 },
            timestamp: faker.date.recent().toISOString()
        };
    }

    static createWebSocketFrame(message: WebSocketMessage): Buffer {
        const messageStr = JSON.stringify(message);
        return Buffer.from(messageStr, 'utf-8');
    }

    static createMockEndpoints(): Array<{ url: string, response: any }> {
        return [
            {
                url: '/api/odds/basketball',
                response: OddsTickFactory.createBatch(20)
            },
            {
                url: '/api/arbitrage/opportunities',
                response: ArbitrageOpportunityFactory.createBatch(5)
            },
            {
                url: '/api/markets/live',
                response: MarketDataFactory.createBatch(10)
            }
        ];
    }
}

// ===== CONTRACT TESTING FACTORIES =====

/**
 * Factory for contract testing scenarios
 */
export class ContractTestFactory {
    static createValidOddsTickContract(): OddsTick {
        return OddsTickFactory.create({
            id: 'contract-test-123',
            symbol: 'TESTUSD',
            price: 110.50,
            side: 'buy',
            timestamp: new Date('2024-01-01T12:00:00Z').getTime()
        });
    }

    static createInvalidOddsTickContract(): any {
        return {
            // Missing required fields for contract testing
            id: 'invalid-contract',
            sport: 'basketball'
            // Missing: event, odds, timestamp, bookmaker
        };
    }

    static createWebSocketContractMessages(): {
        valid: WebSocketMessage;
        invalid: any;
        malformed: string;
    } {
        return {
            valid: WebSocketMessageFactory.createOddsUpdate(
                this.createValidOddsTickContract()
            ),
            invalid: {
                type: 'invalid-type',
                // Missing timestamp and data
            },
            malformed: '{"type": "malformed", "incomplete": json'
        };
    }

    static createAPIContractResponses(): {
        valid: any;
        invalid: any;
        error: any;
    } {
        return {
            valid: {
                status: 200,
                body: {
                    success: true,
                    data: OddsTickFactory.createBatch(5),
                    pagination: { page: 1, total: 100 }
                }
            },
            invalid: {
                status: 200,
                body: {
                    // Missing required fields
                    data: OddsTickFactory.createBatch(5)
                }
            },
            error: {
                status: 500,
                body: {
                    success: false,
                    error: { message: 'Internal Server Error', code: 500 }
                }
            }
        };
    }
}

// ===== BATCH FACTORY HELPERS =====

/**
 * Utility class for creating complex test scenarios
 */
export class TestScenarioFactory {
    static createArbitrageScenario(): {
        marketOdds: OddsTick[];
        opportunities: ArbitrageOpportunity[];
        expectedProfit: number;
    } {
        const marketOdds = [
            OddsTickFactory.create({ exchange: 'NYSE', price: 110.00, side: 'buy' }),
            OddsTickFactory.create({ exchange: 'NASDAQ', price: 105.00, side: 'sell' }),
            OddsTickFactory.create({ exchange: 'LSE', price: 108.00, side: 'buy' })
        ];

        const opportunities = [
            ArbitrageOpportunityFactory.createProfitable()
        ];

        return {
            marketOdds,
            opportunities,
            expectedProfit: opportunities.length > 0 ? opportunities[0].profit : 0
        };
    }

    static createHighVolumeScenario(): {
        ticks: OddsTick[];
        messages: WebSocketMessage[];
        duration: number;
    } {
        const ticks = PerformanceDataFactory.createLargeDataset(50000);
        const messages = ticks.map(tick =>
            WebSocketMessageFactory.createOddsUpdate(tick)
        );

        return {
            ticks,
            messages,
            duration: 60000 // 1 minute
        };
    }

    static createConcurrentUserScenario(userCount: number): {
        userIds: string[];
        connections: Array<{ userId: string, messages: WebSocketMessage[] }>;
    } {
        const userIds = Array.from({ length: userCount }, () => faker.string.uuid());
        const connections = userIds.map(userId => ({
            userId,
            messages: WebSocketMessageFactory.createBatch(
                faker.number.int({ min: 10, max: 100 })
            )
        }));

        return { userIds, connections };
    }
}

// ===== BUN SEARCH UTILITIES =====

/**
 * Search utilities using Bun's built-in search capabilities
 */
export class BunSearchUtils {
    /**
     * Search through an array of objects using Bun's optimized search
     */
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

    /**
     * Find arbitrage opportunities using efficient search
     */
    static findArbitrageOpportunities(
        ticks: OddsTick[],
        minProfitThreshold: number = 0.5
    ): Array<{ buy: OddsTick, sell: OddsTick, profit: number }> {
        const opportunities: Array<{ buy: OddsTick, sell: OddsTick, profit: number }> = [];

        // Group by symbol for efficient search
        const symbolGroups = new Map<string, OddsTick[]>();
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

    /**
     * Filter data by time range using Bun's time utilities
     */
    static filterByTimeRange<T extends { timestamp: number }>(
        data: T[],
        startTime: number,
        endTime: number
    ): T[] {
        return data.filter(item =>
            item.timestamp >= startTime && item.timestamp <= endTime
        );
    }

    /**
     * Get current time range for testing
     */
    static getTimeRange(hoursBack: number = 24): { start: number, end: number } {
        const now = Date.now();
        const start = now - (hoursBack * 60 * 60 * 1000);
        return { start, end: now };
    }
}

// ===== UTILITY CLASSES =====

/**
 * Domain assertion utilities for testing
 */
export class DomainAssertions {
    static isValidOddsTick(tick: any): tick is OddsTick {
        return tick &&
            typeof tick.id === 'string' &&
            typeof tick.timestamp === 'number' &&
            typeof tick.symbol === 'string' &&
            typeof tick.price === 'number' &&
            typeof tick.size === 'number' &&
            typeof tick.exchange === 'string' &&
            ['buy', 'sell'].includes(tick.side);
    }

    static isValidArbitrageOpportunity(opportunity: any): opportunity is ArbitrageOpportunity {
        return opportunity &&
            typeof opportunity.isArbitrage === 'boolean' &&
            typeof opportunity.totalImpliedProbability === 'number' &&
            typeof opportunity.profitMargin === 'number';
    }
}

/**
 * Mock WebSocket implementation for testing
 */
export class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = MockWebSocket.OPEN;
    url: string;
    messages: string[] = [];

    constructor(url: string) {
        this.url = url;
    }

    send(data: string) {
        this.messages.push(data);
    }

    close() {
        this.readyState = MockWebSocket.CLOSED;
    }

    // Event simulation
    addEventListener(event: string, callback: Function) {
        // Mock event listener
    }

    removeEventListener(event: string, callback: Function) {
        // Mock event listener removal
    }
}

// Default export for convenience
export default {
    OddsTick: OddsTickFactory,
    ArbitrageOpportunity: ArbitrageOpportunityFactory,
    WebSocketMessage: WebSocketMessageFactory,
    MarketData: MarketDataFactory,
    Performance: PerformanceDataFactory,
    Network: NetworkDataFactory,
    Contract: ContractTestFactory,
    Scenario: TestScenarioFactory,
    Search: BunSearchUtils,
    DomainAssertions,
    MockWebSocket
};
