// packages/testing/src/factories/arbitrage-factory.ts - Factory for synthetic arbitrage test data

import { faker } from '@faker-js/faker';
import type {
    SyntheticArbitrage,
    MarketLeg,
    SyntheticPosition,
    SyntheticRiskMetrics,
    ExecutionDetails,
    MarketPeriod,
    ExecutionStatus,
    Score
} from '../../../odds-core/src/types/synthetic-arbitrage';
import type {
    SportMarket,
    Market
} from '../../../odds-core/src/types/index';
import {
    createSyntheticArbitrage,
    createMarketLeg
} from '../../../odds-core/src/types/synthetic-arbitrage';

/**
 * Factory for generating synthetic arbitrage test data
 */
export class SyntheticArbitrageFactory {
    static create(overrides: Partial<SyntheticArbitrage> = {}): SyntheticArbitrage {
        const gameId = faker.string.uuid();
        const sport = faker.helpers.arrayElement(['basketball', 'football', 'baseball', 'hockey']);

        const primaryMarket = createMarketLeg(
            faker.string.uuid(),
            'first-quarter' as MarketPeriod,
            faker.helpers.arrayElement(['draftkings', 'fanduel', 'betmgm']),
            faker.number.int({ min: -10, max: 10 }),
            faker.number.int({ min: -500, max: 500 }),
            faker.number.int({ min: -50, max: 50 }),
            false
        );

        const secondaryMarket = createMarketLeg(
            faker.string.uuid(),
            'full-game' as MarketPeriod,
            faker.helpers.arrayElement(['draftkings', 'fanduel', 'betmgm']),
            faker.number.int({ min: -10, max: 10 }),
            faker.number.int({ min: -500, max: 500 }),
            faker.number.int({ min: -50, max: 50 }),
            true
        );

        const baseArbitrage = createSyntheticArbitrage(
            gameId,
            sport,
            primaryMarket,
            secondaryMarket
        );

        // Add realistic synthetic position data
        baseArbitrage.syntheticPosition = {
            expectedContribution: faker.number.float({ min: 0.2, max: 0.4, precision: 0.01 }),
            hedgeRatio: faker.number.float({ min: 0.1, max: 0.8, precision: 0.01 }),
            kellyFraction: faker.number.float({ min: 0.01, max: 0.15, precision: 0.001 }),
            expectedValue: faker.number.float({ min: 0.01, max: 0.08, precision: 0.001 }),
            confidence: faker.number.float({ min: 0.7, max: 0.95, precision: 0.01 }),
            correlation: faker.number.float({ min: 0.3, max: 0.8, precision: 0.01 }),
            covariance: faker.number.float({ min: 0.001, max: 0.05, precision: 0.001 }),
            variance: faker.number.float({ min: 0.01, max: 0.1, precision: 0.001 })
        };

        // Add realistic risk metrics
        baseArbitrage.riskMetrics = {
            totalExposure: faker.number.float({ min: 1000, max: 10000, precision: 100 }),
            maxDrawdown: faker.number.float({ min: -500, max: -50, precision: 10 }),
            var95: faker.number.float({ min: 0.01, max: 0.05, precision: 0.001 }),
            var99: faker.number.float({ min: 0.02, max: 0.08, precision: 0.001 }),
            sharpeRatio: faker.number.float({ min: 0.5, max: 2.5, precision: 0.1 }),
            profitFactor: faker.number.float({ min: 1.1, max: 2.0, precision: 0.1 }),
            beta: faker.number.float({ min: 0.5, max: 1.5, precision: 0.1 }),
            alpha: faker.number.float({ min: 0.01, max: 0.1, precision: 0.01 }),
            volatility: faker.number.float({ min: 0.1, max: 0.3, precision: 0.01 }),
            liquidityRisk: faker.number.float({ min: 0.01, max: 0.2, precision: 0.01 }),
            executionRisk: faker.number.float({ min: 0.01, max: 0.15, precision: 0.01 })
        };

        // Add execution details using standard time utilities
        const now = new Date(Date.now());
        baseArbitrage.execution = {
            status: faker.helpers.arrayElement<ExecutionStatus>(['pending', 'executing', 'completed']),
            entryTime: new Date(now.getTime() - faker.number.int({ min: 1000, max: 3600000 })), // Recent entry
            expiryTime: new Date(now.getTime() + faker.number.int({ min: 3600000, max: 86400000 })), // Future expiry
            targetProfit: faker.number.float({ min: 50, max: 500, precision: 10 }),
            stopLoss: faker.number.float({ min: -200, max: -50, precision: 10 }),
            trailingStop: faker.number.float({ min: 25, max: 100, precision: 5 })
        };

        return { ...baseArbitrage, ...overrides };
    }

    static createProfitable(overrides: Partial<SyntheticArbitrage> = {}): SyntheticArbitrage {
        return this.create({
            syntheticPosition: {
                expectedValue: faker.number.float({ min: 0.02, max: 0.08, precision: 0.001 }),
                confidence: faker.number.float({ min: 0.8, max: 0.95, precision: 0.01 }),
                kellyFraction: faker.number.float({ min: 0.05, max: 0.15, precision: 0.001 }),
                expectedContribution: faker.number.float({ min: 0.25, max: 0.4, precision: 0.01 }),
                hedgeRatio: faker.number.float({ min: 0.3, max: 0.7, precision: 0.01 }),
                correlation: faker.number.float({ min: 0.5, max: 0.8, precision: 0.01 }),
                covariance: faker.number.float({ min: 0.01, max: 0.04, precision: 0.001 }),
                variance: faker.number.float({ min: 0.02, max: 0.08, precision: 0.001 })
            },
            ...overrides
        });
    }

    static createBatch(count: number, overrides: Partial<SyntheticArbitrage> = {}): SyntheticArbitrage[] {
        return Array.from({ length: count }, () => this.create(overrides));
    }

    static createMarketLeg(overrides: Partial<MarketLeg> = {}): MarketLeg {
        const marketType = overrides.marketType || faker.helpers.arrayElement<MarketPeriod>([
            'first-quarter', 'second-quarter', 'third-quarter', 'fourth-quarter',
            'first-half', 'second-half', 'full-game'
        ]);

        const baseLeg = createMarketLeg(
            faker.string.uuid(),
            marketType,
            faker.helpers.arrayElement(['draftkings', 'fanduel', 'mgm', 'pointsbet']),
            faker.number.int({ min: -10, max: 10 }),
            faker.number.int({ min: -115, max: -105 }),
            faker.number.int({ min: -110, max: -105 }),
            faker.datatype.boolean()
        );

        return {
            ...baseLeg,
            ...overrides
        };
    }

    static createScore(overrides: Partial<Score> = {}): Score {
        return {
            home: faker.number.int({ min: 0, max: 150 }),
            away: faker.number.int({ min: 0, max: 150 }),
            period: faker.number.int({ min: 1, max: 4 }),
            timeRemaining: faker.number.int({ min: 0, max: 720 }),
            ...overrides
        };
    }
}
