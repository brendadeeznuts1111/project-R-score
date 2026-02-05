// packages/testing/src/factories/incremental-synthetic-factory.ts - Incremental factory for synthetic arbitrage testing

import { faker } from '../../../odds-core/src/types/index';
import {
    ExpectedReturn,
    HedgeRatio,
    Probability,
    Correlation,
    Covariance,
    SportMarket,
    Market,
    SyntheticArbitrageV1,
    SyntheticArbitrageV2,
    SyntheticArbitrageV3,
    RiskMetrics,
    MarketLeg,
    CorrelationMatrix,
    ExecutionPlan,
    MonitoringMetrics,
    PerformanceTracking,
    SportPeriod,
    ExecutionStatus
} from '../../../odds-core/src/types/index';
import {
    createSyntheticArbitrageV1,
    createSportMarket,
    createMarketLeg,
    createSyntheticArbitrageWithOdds,
    createProbability,
    createExpectedReturn,
    createHedgeRatio,
    createCorrelation,
    createCovariance,
    createOdds
} from '../../../odds-core/src/types/index';

/**
 * Incremental factory for V1 synthetic arbitrage (core functionality)
 */
export class SyntheticArbitrageV1Factory {
    static create(overrides: Partial<SyntheticArbitrageV1> = {}): SyntheticArbitrageV1 {
        const gameId = faker.string.uuid();
        const sport = faker.helpers.arrayElement(['basketball', 'football', 'baseball', 'hockey']);
        const event = `${faker.team.name()} vs ${faker.team.name()}`;

        const market1 = this.createSportMarket({
            gameId,
            sport,
            event,
            period: 'first-quarter',
            exchange: 'draftkings'
        });

        const market2 = this.createSportMarket({
            gameId,
            sport,
            event,
            period: 'full-game',
            exchange: 'fanduel',
            isLive: true
        });

        return createSyntheticArbitrageV1(
            faker.string.uuid(),
            market1,
            market2,
            faker.number.float({ min: 0.01, max: 0.08, precision: 0.001 }), // expectedValue
            faker.number.float({ min: 0.1, max: 0.8, precision: 0.01 }), // hedgeRatio
            faker.number.float({ min: 0.7, max: 0.95, precision: 0.01 }), // confidence
            faker.number.float({ min: 0.3, max: 0.8, precision: 0.01 }), // correlation
            faker.number.float({ min: 0.001, max: 0.05, precision: 0.001 }) // covariance
        );
    }

    static createProfitable(overrides: Partial<SyntheticArbitrageV1> = {}): SyntheticArbitrageV1 {
        return this.create({
            expectedValue: createExpectedReturn(faker.number.float({ min: 0.02, max: 0.08, precision: 0.001 })),
            confidence: createProbability(faker.number.float({ min: 0.8, max: 0.95, precision: 0.01 })),
            hedgeRatio: createHedgeRatio(faker.number.float({ min: 0.2, max: 0.6, precision: 0.01 })),
            correlation: createCorrelation(faker.number.float({ min: 0.4, max: 0.7, precision: 0.01 })),
            ...overrides
        });
    }

    static createHighRisk(overrides: Partial<SyntheticArbitrageV1> = {}): SyntheticArbitrageV1 {
        return this.create({
            expectedValue: createExpectedReturn(faker.number.float({ min: 0.05, max: 0.15, precision: 0.001 })),
            confidence: createProbability(faker.number.float({ min: 0.5, max: 0.7, precision: 0.01 })),
            correlation: createCorrelation(faker.number.float({ min: 0.1, max: 0.4, precision: 0.01 })),
            ...overrides
        });
    }

    static createSportMarket(overrides: Partial<SportMarket> = {}): SportMarket {
        return createSportMarket(
            overrides.sport || faker.helpers.arrayElement(['basketball', 'football', 'baseball', 'hockey']),
            overrides.gameId || faker.string.uuid(),
            overrides.rotationId || `ROT_${overrides.sport?.toUpperCase() || 'NBA'}_${faker.number.int({ min: 100, max: 999 })}`,
            overrides.event || `${faker.team.name()} vs ${faker.team.name()}`,
            overrides.period || faker.helpers.arrayElement<SportPeriod>([
                'first-quarter', 'second-quarter', 'third-quarter', 'fourth-quarter',
                'first-half', 'second-half', 'full-game'
            ]),
            overrides.exchange || faker.helpers.arrayElement(['draftkings', 'fanduel', 'mgm', 'pointsbet']),
            `${overrides.sport || 'basketball'}_${overrides.gameId || faker.string.uuid()}_${overrides.period || 'full-game'}`,
            overrides.isLive || false
        );
    }

    static createMarketLeg(overrides: Partial<MarketLeg> = {}): MarketLeg {
        const market = this.createSportMarket(overrides);

        return createMarketLeg(
            market,
            faker.number.int({ min: -10, max: 10 }),
            faker.number.int({ min: -115, max: -105 }),
            faker.number.int({ min: -200, max: -100 }),
            faker.number.int({ min: 1000, max: 50000 }),
            faker.datatype.boolean()
        );
    }

    static createBatch(count: number, overrides: Partial<SyntheticArbitrageV1> = {}): SyntheticArbitrageV1[] {
        return Array.from({ length: count }, () => this.create(overrides));
    }

    static createNBAExample(): SyntheticArbitrageV1 {
        const gameId = 'NBA_2024_01_15_LAL_BOS';

        const market1 = createSportMarket(
            'basketball',
            gameId,
            'ROT_NBA_815',
            'Los Angeles Lakers vs Boston Celtics',
            'first-quarter',
            'draftkings',
            'NBA_LAL_BOS_1Q',
            false
        );

        const market2 = createSportMarket(
            'basketball',
            gameId,
            'ROT_NBA_816',
            'Los Angeles Lakers vs Boston Celtics',
            'full-game',
            'fanduel',
            'NBA_LAL_BOS_FULL',
            true
        );

        return createSyntheticArbitrageV1(
            'synthetic_nba_example_001',
            market1,
            market2,
            0.035,
            0.3,
            0.82,
            0.65,
            0.018
        );
    }
}

/**
 * Factory for V2 synthetic arbitrage (with risk management)
 */
export class SyntheticArbitrageV2Factory {
    static create(overrides: Partial<SyntheticArbitrageV2> = {}): SyntheticArbitrageV2 {
        const v1Base = SyntheticArbitrageV1Factory.createProfitable();
        const marketLeg1 = SyntheticArbitrageV1Factory.createMarketLeg({
            ...v1Base.markets[0],
            line: faker.number.int({ min: -10, max: 10 }),
            juice: faker.number.int({ min: -115, max: -105 }),
            odds: createOdds(faker.number.int({ min: -200, max: -100 }))
        });

        const marketLeg2 = SyntheticArbitrageV1Factory.createMarketLeg({
            ...v1Base.markets[1],
            line: faker.number.int({ min: -10, max: 10 }),
            juice: faker.number.int({ min: -115, max: -105 }),
            odds: createOdds(faker.number.int({ min: -200, max: -100 }))
        });

        const baseArbitrage = createSyntheticArbitrageWithOdds(
            v1Base.id,
            marketLeg1,
            marketLeg2,
            v1Base.expectedValue,
            v1Base.hedgeRatio,
            v1Base.confidence,
            v1Base.correlation,
            v1Base.covariance,
            faker.number.float({ min: 0.01, max: 0.15, precision: 0.001 }), // kellyFraction
            faker.number.float({ min: 0.01, max: 0.1, precision: 0.001 }) // variance
        );

        const riskMetrics = this.createRiskMetrics();
        const positionSize = faker.number.float({ min: 1000, max: 10000, precision: 100 });
        const stopLoss = -faker.number.float({ min: 100, max: 500, precision: 50 });
        const targetProfit = faker.number.float({ min: 100, max: 1000, precision: 50 });
        const maxLeverage = faker.number.float({ min: 1, max: 3, precision: 0.5 });

        return {
            ...baseArbitrage,
            riskMetrics,
            positionSize,
            stopLoss,
            targetProfit,
            maxLeverage,
            ...overrides
        };
    }

    static createRiskMetrics(): RiskMetrics {
        return {
            totalExposure: faker.number.float({ min: 2000, max: 15000, precision: 100 }),
            maxDrawdown: -faker.number.float({ min: 100, max: 1000, precision: 50 }),
            var95: faker.number.float({ min: 0.01, max: 0.05, precision: 0.001 }),
            var99: faker.number.float({ min: 0.02, max: 0.08, precision: 0.001 }),
            sharpeRatio: faker.number.float({ min: 0.5, max: 2.5, precision: 0.1 }),
            volatility: faker.number.float({ min: 0.1, max: 0.3, precision: 0.01 }),
            beta: faker.number.float({ min: 0.5, max: 1.5, precision: 0.1 }),
            alpha: faker.number.float({ min: 0.01, max: 0.1, precision: 0.01 }),
            positionMetrics: {
                kellyFraction: createProbability(faker.number.float({ min: 0.01, max: 0.15, precision: 0.001 })),
                optimalPositionSize: faker.number.float({ min: 1000, max: 8000, precision: 100 }),
                maxPositionSize: faker.number.float({ min: 2000, max: 10000, precision: 100 }),
                riskAdjustedReturn: faker.number.float({ min: 0.1, max: 0.5, precision: 0.01 })
            },
            executionRisk: {
                liquidityRisk: createProbability(faker.number.float({ min: 0.01, max: 0.2, precision: 0.01 })),
                executionRisk: createProbability(faker.number.float({ min: 0.01, max: 0.15, precision: 0.01 })),
                slippageRisk: createProbability(faker.number.float({ min: 0.01, max: 0.1, precision: 0.01 })),
                timeDecayRisk: createProbability(faker.number.float({ min: 0.01, max: 0.2, precision: 0.01 }))
            },
            confidence: createProbability(faker.number.float({ min: 0.7, max: 0.95, precision: 0.01 }))
        };
    }

    static createConservative(overrides: Partial<SyntheticArbitrageV2> = {}): SyntheticArbitrageV2 {
        return this.create({
            expectedValue: createExpectedReturn(0.025), // 2.5% expected value
            confidence: createProbability(0.85), // 85% confidence
            riskMetrics: {
                ...this.createRiskMetrics(),
                var95: 0.03, // 3% VaR
                var99: 0.05, // 5% VaR
                sharpeRatio: 1.2,
                positionMetrics: {
                    kellyFraction: createProbability(0.05), // Conservative 5%
                    optimalPositionSize: 3000,
                    maxPositionSize: 5000,
                    riskAdjustedReturn: 0.15
                }
            },
            positionSize: 3000,
            stopLoss: -150,
            targetProfit: 200,
            maxLeverage: 2.0,
            ...overrides
        });
    }

    static createAggressive(overrides: Partial<SyntheticArbitrageV2> = {}): SyntheticArbitrageV2 {
        return this.create({
            expectedValue: createExpectedReturn(0.06), // 6% expected value
            confidence: createProbability(0.75), // 75% confidence
            riskMetrics: {
                ...this.createRiskMetrics(),
                var95: 0.07, // 7% VaR
                var99: 0.12, // 12% VaR
                sharpeRatio: 0.8,
                positionMetrics: {
                    kellyFraction: createProbability(0.12), // Aggressive 12%
                    optimalPositionSize: 8000,
                    maxPositionSize: 15000,
                    riskAdjustedReturn: 0.35
                }
            },
            positionSize: 8000,
            stopLoss: -400,
            targetProfit: 600,
            maxLeverage: 4.0,
            ...overrides
        });
    }

    static createNBAV2Example(): SyntheticArbitrageV2 {
        const v1Base = SyntheticArbitrageV1Factory.createNBAExample();
        const marketLeg1 = SyntheticArbitrageV1Factory.createMarketLeg({
            ...v1Base.markets[0],
            line: -2.5,
            juice: -110,
            odds: createOdds(-110)
        });

        const marketLeg2 = SyntheticArbitrageV1Factory.createMarketLeg({
            ...v1Base.markets[1],
            line: -8.5,
            juice: -105,
            odds: createOdds(-105)
        });

        const baseArbitrage = createSyntheticArbitrageWithOdds(
            v1Base.id,
            marketLeg1,
            marketLeg2,
            v1Base.expectedValue,
            v1Base.hedgeRatio,
            v1Base.confidence,
            v1Base.correlation,
            v1Base.covariance,
            createProbability(0.08), // 8% Kelly
            0.045 // variance
        );

        return {
            ...baseArbitrage,
            riskMetrics: {
                totalExposure: 5000,
                maxDrawdown: -250,
                var95: 0.028,
                var99: 0.042,
                sharpeRatio: 1.45,
                volatility: 0.18,
                beta: 0.92,
                alpha: 0.042,
                positionMetrics: {
                    kellyFraction: createProbability(0.08),
                    optimalPositionSize: 5000,
                    maxPositionSize: 7500,
                    riskAdjustedReturn: 0.22
                },
                executionRisk: {
                    liquidityRisk: createProbability(0.05),
                    executionRisk: createProbability(0.03),
                    slippageRisk: createProbability(0.02),
                    timeDecayRisk: createProbability(0.04)
                },
                confidence: createProbability(0.82)
            },
            positionSize: 5000,
            stopLoss: -200,
            targetProfit: 300,
            maxLeverage: 2.5
        };
    }
}

/**
 * Factory for V3 synthetic arbitrage (advanced features)
 */
export class SyntheticArbitrageV3Factory {
    static create(overrides: Partial<SyntheticArbitrageV3> = {}): SyntheticArbitrageV3 {
        const v2Base = SyntheticArbitrageV2Factory.create();

        // Add third market for V3
        const market3 = SyntheticArbitrageV1Factory.createMarketLeg({
            ...v2Base.markets[0],
            period: 'second-quarter',
            exchange: 'mgm',
            isLive: true
        });

        const multiMarketBase = {
            ...v2Base,
            markets: [v2Base.markets[0], v2Base.markets[1], market3],
            correlationMatrix: this.createCorrelationMatrix(3),
            optimalWeights: [0.4, 0.4, 0.2],
            efficientFrontier: this.createEfficientFrontier(),
            diversificationRatio: faker.number.float({ min: 0.3, max: 0.8, precision: 0.01 }),
            concentrationRisk: createProbability(faker.number.float({ min: 0.1, max: 0.4, precision: 0.01 }))
        };

        const executionPlan = this.createExecutionPlan(multiMarketBase.markets);
        const monitoring = this.createMonitoringMetrics();
        const performance = this.createPerformanceTracking();

        return {
            ...multiMarketBase,
            executionPlan,
            monitoring,
            performance,
            alerts: [],
            history: [{
                timestamp: new Date(),
                action: 'created',
                details: { arbitrageId: multiMarketBase.id },
                metrics: {}
            }],
            ...overrides
        };
    }

    static createCorrelationMatrix(size: number): CorrelationMatrix {
        const matrix: number[][] = [];

        for (let i = 0; i < size; i++) {
            const row: number[] = [];
            for (let j = 0; j < size; j++) {
                if (i === j) {
                    row.push(1.0);
                } else {
                    row.push(faker.number.float({ min: 0.2, max: 0.8, precision: 0.01 }));
                }
            }
            matrix.push(row);
        }

        // Make symmetric
        for (let i = 0; i < size; i++) {
            for (let j = i + 1; j < size; j++) {
                matrix[j][i] = matrix[i][j];
            }
        }

        return {
            matrix,
            symbols: Array.from({ length: size }, (_, i) => `SYMBOL_${i + 1}`),
            timestamp: new Date(),
            sampleSize: faker.number.int({ min: 100, max: 1000 }),
            timeFrame: '1h',
            confidence: createProbability(faker.number.float({ min: 0.8, max: 0.95, precision: 0.01 }))
        };
    }

    static createEfficientFrontier() {
        return Array.from({ length: 10 }, (_, i) => ({
            expectedReturn: createExpectedReturn(0.02 + i * 0.005),
            volatility: 0.1 + i * 0.02,
            sharpeRatio: 0.5 + i * 0.1,
            weights: [
                faker.number.float({ min: 0.2, max: 0.6, precision: 0.01 }),
                faker.number.float({ min: 0.2, max: 0.6, precision: 0.01 }),
                faker.number.float({ min: 0.1, max: 0.4, precision: 0.01 })
            ],
            portfolioId: faker.string.uuid()
        }));
    }

    static createExecutionPlan(markets: MarketLeg[]): ExecutionPlan {
        const orders = markets.map((market, index) => ({
            orderId: faker.string.uuid(),
            market,
            side: index % 2 === 0 ? 'buy' : 'sell' as const,
            size: faker.number.float({ min: 100, max: 1000, precision: 10 }),
            price: faker.number.float({ min: 100, max: 200, precision: 1 }),
            filledSize: 0,
            averagePrice: 0,
            status: 'pending' as const,
            timestamp: new Date(),
            fees: 0,
            slippage: 0
        }));

        return {
            id: faker.string.uuid(),
            status: 'pending' as ExecutionStatus,
            orders,
            totalSize: orders.reduce((sum, order) => sum + order.size, 0),
            totalFees: 0,
            expectedSlippage: faker.number.float({ min: 0.001, max: 0.01, precision: 0.001 }),
            executionTimeout: 30000,
            retryPolicy: {
                maxRetries: 3,
                retryDelay: 1000,
                backoffMultiplier: 2,
                retryConditions: ['partial-fill', 'price-movement', 'timeout']
            },
            contingencyPlans: [
                {
                    trigger: 'price-movement' as const,
                    action: 'adjust-price' as const,
                    threshold: 0.02,
                    parameters: { maxAdjustment: 0.05 }
                }
            ]
        };
    }

    static createMonitoringMetrics(): MonitoringMetrics {
        return {
            currentPnL: faker.number.float({ min: -100, max: 500, precision: 10 }),
            unrealizedPnL: faker.number.float({ min: -100, max: 500, precision: 10 }),
            realizedPnL: faker.number.float({ min: 0, max: 200, precision: 10 }),
            totalReturn: faker.number.float({ min: -0.05, max: 0.1, precision: 0.001 }),
            executionProgress: createProbability(faker.number.float({ min: 0, max: 1, precision: 0.01 })),
            timeElapsed: faker.number.int({ min: 0, max: 30000 }),
            timeRemaining: faker.number.int({ min: 0, max: 60000 }),
            marketConditions: {
                volatility: faker.helpers.arrayElement(['extreme', 'high', 'medium', 'low', 'very-low']),
                liquidity: faker.helpers.arrayElement(['high', 'medium', 'low', 'very-low']),
                spread: faker.number.float({ min: 0.001, max: 0.01, precision: 0.001 }),
                depth: faker.number.float({ min: 1000, max: 10000, precision: 100 }),
                momentum: faker.number.float({ min: -0.1, max: 0.1, precision: 0.01 }),
                sentiment: faker.number.float({ min: -0.5, max: 0.5, precision: 0.01 })
            }
        };
    }

    static createPerformanceTracking(): PerformanceTracking {
        const totalTrades = faker.number.int({ min: 10, max: 100 });
        const winningTrades = faker.number.int({ min: 4, max: totalTrades - 1 });

        return {
            totalTrades,
            winningTrades,
            losingTrades: totalTrades - winningTrades,
            winRate: createProbability(winningTrades / totalTrades),
            averageWin: faker.number.float({ min: 50, max: 300, precision: 10 }),
            averageLoss: faker.number.float({ min: -200, max: -50, precision: 10 }),
            profitFactor: faker.number.float({ min: 1.1, max: 2.0, precision: 0.1 }),
            maxDrawdown: -faker.number.float({ min: 100, max: 500, precision: 25 }),
            currentDrawdown: -faker.number.float({ min: 0, max: 200, precision: 25 }),
            totalReturn: faker.number.float({ min: 0.05, max: 0.25, precision: 0.01 }),
            annualizedReturn: faker.number.float({ min: 0.1, max: 0.5, precision: 0.01 }),
            sharpeRatio: faker.number.float({ min: 0.5, max: 2.0, precision: 0.1 }),
            sortinoRatio: faker.number.float({ min: 0.7, max: 2.5, precision: 0.1 })
        };
    }

    static createMultiMarketNBAExample(): SyntheticArbitrageV3 {
        const v2Base = SyntheticArbitrageV2Factory.createNBAV2Example();

        // Add third market
        const market3 = SyntheticArbitrageV1Factory.createMarketLeg({
            ...v2Base.markets[0],
            period: 'second-quarter',
            exchange: 'mgm',
            line: -1.5,
            juice: -108,
            odds: createOdds(-108),
            isLive: true
        });

        return {
            ...v2Base,
            markets: [v2Base.markets[0], v2Base.markets[1], market3],
            correlationMatrix: {
                matrix: [
                    [1.0, 0.65, 0.45],
                    [0.65, 1.0, 0.55],
                    [0.45, 0.55, 1.0]
                ],
                symbols: ['NBA_1Q', 'NBA_FULL', 'NBA_2Q'],
                timestamp: new Date(),
                sampleSize: 250,
                timeFrame: '1h',
                confidence: createProbability(0.88)
            },
            optimalWeights: [0.3, 0.5, 0.2],
            efficientFrontier: this.createEfficientFrontier(),
            diversificationRatio: 0.65,
            concentrationRisk: createProbability(0.25),
            executionPlan: this.createExecutionPlan([v2Base.markets[0], v2Base.markets[1], market3]),
            monitoring: this.createMonitoringMetrics(),
            performance: this.createPerformanceTracking(),
            alerts: [],
            history: []
        };
    }
}

// ===== BATCH CREATION UTILITIES =====

export class SyntheticArbitrageBatchFactory {
    static createV1Batch(count: number, profitable: boolean = false): SyntheticArbitrageV1[] {
        const factory = profitable ? SyntheticArbitrageV1Factory.createProfitable : SyntheticArbitrageV1Factory.create;
        return Array.from({ length: count }, () => factory());
    }

    static createV2Batch(count: number, riskProfile: 'conservative' | 'aggressive' | 'normal' = 'normal'): SyntheticArbitrageV2[] {
        const factory = riskProfile === 'conservative'
            ? SyntheticArbitrageV2Factory.createConservative
            : riskProfile === 'aggressive'
                ? SyntheticArbitrageV2Factory.createAggressive
                : SyntheticArbitrageV2Factory.create;

        return Array.from({ length: count }, () => factory());
    }

    static createV3Batch(count: number): SyntheticArbitrageV3[] {
        return Array.from({ length: count }, () => SyntheticArbitrageV3Factory.create());
    }

    static createMixedBatch(v1Count: number, v2Count: number, v3Count: number): {
        v1: SyntheticArbitrageV1[];
        v2: SyntheticArbitrageV2[];
        v3: SyntheticArbitrageV3[];
    } {
        return {
            v1: this.createV1Batch(v1Count),
            v2: this.createV2Batch(v2Count),
            v3: this.createV3Batch(v3Count)
        };
    }
}
